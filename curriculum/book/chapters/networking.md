# Networking for Engineers

> [!GOALS]
> - Explain how data moves between computers: packets, addresses, ports and the layers of the network stack.
> - Read and design **IP addressing**: IPv4, IPv6, **CIDR** blocks, subnets, private ranges and NAT.
> - Compare **TCP** and **UDP**, and understand connections, handshakes and why latency matters.
> - Follow an HTTP request from a browser to a server and back, including DNS, TLS, proxies and load balancers.
> - Understand **firewalls**, security groups and the difference between layer-4 and layer-7 load balancing.
> - Diagnose common network problems with the standard tools.

## Why this matters

Every system you build is a networked system. A browser talks to a CDN, which talks to a load balancer, which talks to your API, which talks to a database, a cache, a queue and three external services. When something goes wrong — "connection refused", "timeout", "could not resolve host", a page that is fast in one country and slow in another — the cause is often in the network, not the code.

Back-end engineers do not need to configure routers, but they do need a working mental model: what an IP address and a port are, why a database in a private subnet cannot be reached from the internet (and should not be), what a TCP handshake costs, why one service can reach another by name but not by IP, why opening port 5432 to `0.0.0.0/0` is a serious mistake. Cloud networking ({{ch:vpc}}), Docker networking ({{ch:docker}}), reverse proxies ({{ch:nginx-reverse-proxy}}), DNS ({{ch:dns}}) and TLS ({{ch:tls-ssl}}) all build on these ideas.

## The simple idea

Think of the postal system. Every building has an address (an **IP address**); inside, each flat has a number (a **port**), so a letter reaches the right person, not just the right building. Large messages are split into numbered pages (**packets**), each sent separately, possibly by different routes, and reassembled at the other end. Some deliveries need a signature and a guarantee that every page arrives in order (**TCP**); others are postcards — fast, with no guarantee (**UDP**). Sorting offices (**routers**) pass packets along towards their destination, and gatekeepers (**firewalls**) decide what may enter.

> [!ANALOGY]
> Networking is like the postal system: buildings have addresses (IP addresses), flats have numbers (ports), long messages are split into numbered pages (packets) sent separately and reassembled, and some deliveries are signed and guaranteed (TCP) while others are quick postcards (UDP).
>
> **Where the analogy breaks:** letters take days, so a few extra steps go unnoticed. Network packets take milliseconds, and protocols often need several round trips before any useful data arrives — a connection to a server on another continent may spend more time on handshakes than on the actual data. In networking, the number of round trips matters as much as the speed of each one.

## The proper definition and key words

A **computer network** is a set of connected devices exchanging data according to shared **protocols**. The internet is a network of networks using the **TCP/IP** protocol suite.

Key words:

- **Packet** — a small unit of data with headers (source, destination, sequence numbers) and a payload.
- **IP address** — a device's network address: IPv4 (`203.0.113.10`) or IPv6 (`2001:db8::10`).
- **Port** — a number (0–65535) identifying a service on a machine: 443 for HTTPS, 5432 for PostgreSQL.
- **Socket** — one endpoint of a connection: an IP address plus a port.
- **Protocol** — agreed rules for communication (IP, TCP, UDP, HTTP, TLS, DNS).
- **TCP** — reliable, ordered, connection-based transport.
- **UDP** — unreliable, connectionless, low-overhead transport.
- **Router** — a device forwarding packets between networks.
- **Subnet** — a range of IP addresses, written in **CIDR** notation (`10.0.1.0/24`).
- **NAT** — network address translation: sharing one public IP among many private addresses.
- **Latency** — the time for data to travel; **round-trip time (RTT)** — there and back. **Bandwidth** — how much data per second.
- **Firewall** — rules allowing or blocking traffic by address, port and protocol.

## Layers

### Level 1 — The network stack

Networking is organised in layers, each relying on the one below:

| Layer (TCP/IP model) | Job | Examples | Roughly in the OSI model |
|---|---|---|---|
| **Application** | What the programs say | HTTP, DNS, TLS, SSH, SMTP, PostgreSQL protocol | Layers 5–7 |
| **Transport** | Connections between programs (ports), reliability | TCP, UDP, QUIC | Layer 4 |
| **Internet** | Addressing and routing between networks | IP (v4, v6), ICMP (ping) | Layer 3 |
| **Link** | Moving frames on one physical network | Ethernet, Wi-Fi | Layers 1–2 |

When people say "layer 4" or "layer 7" (for load balancers, firewalls), they mean the OSI numbering: **layer 4** works with IPs and ports (TCP/UDP); **layer 7** understands the application protocol (HTTP paths, headers, cookies).

Each layer wraps the data from the layer above with its own header — an HTTP request inside TCP segments inside IP packets inside Ethernet frames — and the receiver unwraps them in reverse.

## IP addresses and subnets

### Level 2 — IPv4, IPv6 and CIDR

An **IPv4** address is 32 bits, written as four numbers from 0 to 255 (`10.0.1.57`). There are only about 4.3 billion, which is why **IPv6** (128 bits, written in hexadecimal: `2001:db8:85a3::8a2e:370:7334`) exists and is increasingly common.

**CIDR notation** describes a block of addresses: `10.0.1.0/24` means "the first 24 bits are the network; the remaining 8 bits number the hosts" — 256 addresses. Larger suffixes mean smaller blocks. The arithmetic is simple bit masking:

```ts
// CIDR blocks: how many addresses, which range, and does an address belong to it?
const toInt = (ip: string) => ip.split(".").reduce((n, octet) => (n << 8) + Number(octet), 0) >>> 0;
const toIp = (n: number) => [24, 16, 8, 0].map((s) => (n >>> s) & 255).join(".");

function cidr(block: string) {
  const [base, bitsText] = block.split("/");
  const bits = Number(bitsText);
  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
  const network = (toInt(base!) & mask) >>> 0;
  const size = 2 ** (32 - bits);
  return {
    netmask: toIp(mask), first: toIp(network), last: toIp(network + size - 1), addresses: size,
    contains: (ip: string) => ((toInt(ip) & mask) >>> 0) === network,
  };
}

for (const b of ["10.0.0.0/16", "10.0.1.0/24", "10.0.1.0/28", "0.0.0.0/0"]) {
  const c = cidr(b);
  console.log(`${b.padEnd(12)} netmask ${c.netmask.padEnd(15)} ${c.first} – ${c.last} (${c.addresses} addresses)`);
}
const privateSubnet = cidr("10.0.1.0/24");
console.log("10.0.1.57 in 10.0.1.0/24?", privateSubnet.contains("10.0.1.57"), "| 10.0.2.9?", privateSubnet.contains("10.0.2.9"));
```

**Output:**

```text
10.0.0.0/16  netmask 255.255.0.0     10.0.0.0 – 10.0.255.255 (65536 addresses)
10.0.1.0/24  netmask 255.255.255.0   10.0.1.0 – 10.0.1.255 (256 addresses)
10.0.1.0/28  netmask 255.255.255.240 10.0.1.0 – 10.0.1.15 (16 addresses)
0.0.0.0/0    netmask 0.0.0.0         0.0.0.0 – 255.255.255.255 (4294967296 addresses)
10.0.1.57 in 10.0.1.0/24? true | 10.0.2.9? false
```

- **`/16`** is 65,536 addresses — a typical size for a whole cloud network (a VPC). **`/24`** (256) is a typical subnet. **`/28`** (16) is a small subnet. **`/32`** is a single address.
- **`0.0.0.0/0`** means "every IPv4 address" — in a firewall rule, "the entire internet".
- An address belongs to a block when its network bits match — the check every router and firewall performs ({{ch:vpc}}).
- In cloud subnets, a few addresses in each block are reserved (network, broadcast and provider addresses), so a `/24` offers slightly fewer than 256 usable addresses.

### Level 2 — Private addresses and NAT

Some ranges are reserved for **private networks** and never routed on the public internet:

| Range | CIDR |
|---|---|
| 10.0.0.0 – 10.255.255.255 | `10.0.0.0/8` |
| 172.16.0.0 – 172.31.255.255 | `172.16.0.0/12` |
| 192.168.0.0 – 192.168.255.255 | `192.168.0.0/16` |

Plus special addresses: `127.0.0.1` (and `::1`) — **loopback**, "this machine"; `0.0.0.0` in a server's listen address — "all interfaces on this machine".

**NAT** lets many private machines share one public address: when a server in a private subnet calls an external API, a NAT gateway rewrites the source address to its own public IP, and maps replies back. Outbound connections work; nobody on the internet can start a connection inward. This is a key reason databases and internal services live in private subnets ({{ch:vpc}}).

A common mistake: a server listening on `127.0.0.1:3000` is reachable **only from the same machine**. Inside a container, an app must listen on `0.0.0.0` to be reachable through published ports ({{ch:docker}}).

## Transport: TCP and UDP

### Level 2 — TCP: reliable connections

**TCP** gives applications a reliable, ordered stream of bytes between two sockets. It achieves this with:

- **A three-way handshake** to open the connection: client sends SYN, server replies SYN-ACK, client sends ACK — one full round trip before any data.
- **Sequence numbers and acknowledgements**: lost packets are retransmitted, and data is delivered in order.
- **Flow and congestion control**: the sender slows down when the receiver or the network cannot keep up.
- **A graceful close** (FIN/ACK), or an abrupt reset (RST) — "connection reset by peer".

HTTP/1.1 and HTTP/2, database protocols, SSH and SMTP all run on TCP. Connection set-up costs a round trip (plus more for TLS), which is why connections are **reused**: HTTP keep-alive, connection pools for databases ({{ch:postgresql}}), long-lived WebSocket connections ({{ch:websockets}}).

### Level 2 — UDP: fast datagrams

**UDP** sends independent datagrams with no connection, no ordering and no retransmission. It is used where speed matters more than perfect delivery, or where the application handles reliability itself: DNS queries, video calls, online games, metrics (StatsD), and **QUIC** — the transport underneath **HTTP/3**, which builds reliable, encrypted streams on top of UDP to avoid some of TCP's delays.

### Level 2 — HTTP is just text over a connection

Higher layers are simpler than they look. An HTTP/1.1 request is text sent over a TCP connection; here a client writes one by hand over a plain socket:

```ts
import { createServer } from "node:http";
import { connect } from "node:net";
import type { AddressInfo } from "node:net";

// An ordinary HTTP server...
const server = createServer((req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify({ path: req.url, host: req.headers.host }));
});
await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
const { port } = server.address() as AddressInfo;

// ...and a client that speaks HTTP by hand over a plain TCP connection
const socket = connect(port, "127.0.0.1");
socket.write("GET /products/7 HTTP/1.1\r\nHost: shop.local\r\nConnection: close\r\n\r\n");   // the request is just text
let raw = "";
socket.on("data", (chunk) => (raw += chunk));
await new Promise((r) => socket.on("end", r));

const [head, body] = raw.split("\r\n\r\n");
const lines = head!.split("\r\n").filter((l) => !l.startsWith("Date:"));                    // drop the changing date
console.log(lines.join("\n"));
console.log();
console.log(body);
server.close();
```

**Output:**

```text
HTTP/1.1 200 OK
Content-Type: application/json
Connection: close
Content-Length: 42

{"path":"/products/7","host":"shop.local"}
```

- `connect(port, host)` opens a TCP connection (the handshake happens underneath); `write` sends bytes.
- The request is a request line, headers separated by `\r\n`, and a blank line. The `Host` header tells the server which site is wanted — that is how one IP address can serve many domains ({{ch:nginx-reverse-proxy}}).
- The response is a status line, headers, a blank line and the body. `Connection: close` asked the server to close the connection after responding, which ends the stream.
- With HTTPS, the same text travels inside a TLS-encrypted channel ({{ch:tls-ssl}}); HTTP/2 and HTTP/3 use binary framing and multiplexing, but the requests and responses mean the same thing ({{ch:rest-apis}}).

## The journey of a request

### Level 3 — From the browser to your code

When a customer opens `https://cornershop.example/products/7`:

1. **DNS**: the browser asks a resolver for the IP address of `cornershop.example` — possibly several lookups, cached at many levels ({{ch:dns}}).
2. **TCP handshake** with that IP on port 443 (one round trip) — or a QUIC handshake for HTTP/3.
3. **TLS handshake**: certificate checked, encryption keys agreed (one more round trip with TLS 1.3) ({{ch:tls-ssl}}).
4. **The request** reaches the nearest **CDN edge**, which may answer from its cache ({{ch:cloudfront}}).
5. On a miss, the CDN forwards to the **load balancer**, which picks a healthy application server ({{ch:elb}}).
6. A **reverse proxy** (Nginx, or the platform's) may terminate TLS, compress, and forward to the application on a local port ({{ch:nginx-reverse-proxy}}).
7. The **application** handles it, calling databases and caches over the private network.
8. The response travels back the same way.

Every arrow is a network hop with latency, and every handshake is a round trip. Physics sets limits: light in fibre covers about 200 km per millisecond, so London to Sydney is around 250 ms round trip at best — before any processing. That is why CDNs, connection reuse, HTTP/2 multiplexing, TLS 1.3 and fewer sequential requests matter so much ({{ch:frontend-performance}}).

Rough orders of magnitude worth remembering: memory access ~100 ns; a round trip inside one data centre ~0.5 ms; between cities on one continent ~10–50 ms; across oceans ~100–300 ms.

### Level 3 — Load balancers: layer 4 versus layer 7

- **Layer-4 load balancers** forward TCP or UDP connections by IP and port, without reading the content. Very fast, protocol-agnostic (databases, any TCP service). Example: AWS Network Load Balancer.
- **Layer-7 load balancers** understand HTTP: they route by host and path (`/api/*` to one service, `/` to another), terminate TLS, add headers such as `X-Forwarded-For`, and perform HTTP health checks. Example: AWS Application Load Balancer, Nginx, Envoy ({{ch:elb}}).

Behind a proxy or load balancer, your application sees the **proxy's** IP as the connection's source; the client's real IP arrives in `X-Forwarded-For`, which must be trusted only from your own proxies ({{ch:rate-limiting}}).

## Firewalls and security groups

### Level 3 — Allowing only what is needed

A **firewall** allows or denies traffic by source, destination, port and protocol. In the cloud, **security groups** act as firewalls around each server or service ({{ch:vpc}}):

```text
  security group: load-balancer      inbound: TCP 443 from 0.0.0.0/0 (the internet)
  security group: api-servers        inbound: TCP 3000 from security group "load-balancer" only
  security group: database           inbound: TCP 5432 from security group "api-servers" only
```

Each layer accepts traffic only from the layer in front of it: the internet can reach the load balancer, not the API servers directly; only the API servers can reach the database. This **defence in depth** means a misconfigured application or a leaked database password does not expose the database to the whole internet. Never open databases, Redis, admin panels or SSH to `0.0.0.0/0`.

## Diagnosing network problems

### Level 3 — The questions and the tools

| Question | Tools |
|---|---|
| Does the name resolve, and to what? | `dig name`, `nslookup`, `getent hosts name` |
| Is the host reachable at all? | `ping` (often blocked), `traceroute` / `mtr` (where packets stop) |
| Can I open a TCP connection to the port? | `nc -vz host port`, `curl -v telnet://host:port` |
| Is anything listening on this port here? | `ss -tlnp`, `lsof -i :port` |
| What does the HTTP service answer? | `curl -v`, `curl -I`, `curl --resolve` to test a specific IP |
| Is TLS working? | `openssl s_client -connect host:443 -servername host` |
| What is actually on the wire? | `tcpdump`, Wireshark |

Error messages are clues:

- **"Could not resolve host"** — DNS: wrong name, missing record, wrong resolver ({{ch:dns}}).
- **"Connection refused"** — the host was reached, but nothing listens on that port (service down, wrong port, listening only on `127.0.0.1`).
- **"Connection timed out"** — packets are dropped: a firewall or security group, wrong routing, or the host is down. Timeouts usually mean "blocked", refusals mean "reached, nobody home".
- **"Connection reset by peer"** — the other side abruptly closed: a crash, a proxy timeout, or a protocol mismatch.
- **TLS errors** — certificate name mismatch, expired certificate, missing intermediate certificate ({{ch:tls-ssl}}).

## From beginner to enterprise

**Level 1–2 — basics.** IP addresses and ports; localhost versus `0.0.0.0`; TCP versus UDP; reading CIDR notation; what DNS and HTTP do.

**Level 3 — application networking.** Private subnets and NAT; security groups allowing only needed traffic; layer-4 versus layer-7 load balancing; client IPs behind proxies; diagnosing refused, timed-out and DNS failures.

**Level 4 — production networking.** VPC design with public and private subnets across availability zones ({{ch:vpc}}); connection reuse and pooling; timeouts on every network call; TLS everywhere; latency budgets.

**Level 5 — senior practice.** Multi-region networking and global traffic management; service meshes for service-to-service TLS and traffic control ({{ch:microservices}}); capacity and bandwidth planning.

**Level 6 — enterprises.** Hybrid networks linking cloud and on-premises data centres; private connectivity to partners; zero-trust networking where every request is authenticated regardless of network location.

## Real-world use cases

### "The API cannot reach the database after a migration"

- **Diagnosis**: `getent hosts db.internal` (resolves to the new address?); `nc -vz db.internal 5432` (times out → blocked; refused → wrong port or service down); check the database's security group allows the API's security group; check the API's subnet routes.
- **Typical cause**: the new database's security group allows only the old API servers' group.

### Slow pages for overseas customers

- **Diagnosis**: requests from Asia to a server in Europe cost ~200 ms per round trip; the page makes several sequential API calls, each with its own round trip.
- **Fixes**: CDN for static assets and cacheable pages; fewer, batched API calls; HTTP/2 or HTTP/3; regional deployments for the API if needed ({{ch:caching-at-scale}}).

## Common mistakes

### Beginner: listening on 127.0.0.1 inside containers

**Consequence:** the service is unreachable from outside the container. **Fix:** listen on `0.0.0.0` inside, publish ports deliberately.

### Beginner: confusing "connection refused" and "timeout"

**Fix:** refused → nothing listening; timeout → blocked or unreachable.

### Intermediate: opening databases or admin ports to 0.0.0.0/0

**Fix:** private subnets; security groups referencing other groups.

### Intermediate: no timeouts on network calls

**Consequence:** stuck requests pile up when a dependency hangs. **Fix:** connect and read timeouts everywhere ({{ch:error-handling}}).

### Intermediate: new connection per request

**Fix:** keep-alive and connection pools.

### Production: trusting X-Forwarded-For from anyone

**Fix:** trust it only from your own proxies.

### Production: overlapping CIDR ranges between networks

**Consequence:** networks that can never be connected (peering, VPNs). **Fix:** plan address ranges centrally.

## Debugging and troubleshooting

- Work up the layers: **name resolution** (`dig`), **reachability** (`nc`, routes, security groups), **listening** (`ss` on the server), **application** (`curl -v`), **TLS** (`openssl s_client`).
- Test from the **same network position** as the failing component (inside the container, from the same subnet) — your laptop's view may differ.
- Use `curl --resolve cornershop.example:443:203.0.113.10 https://cornershop.example/` to test one specific server behind a load balancer.
- Intermittent failures often mean one bad instance behind a load balancer, DNS caching an old address, or exhausted connection pools.

## Security summary

- **Minimise exposure**: only load balancers and edge services in public subnets; everything else private.
- **Security groups** that allow only required ports from required sources; no `0.0.0.0/0` to data stores or SSH.
- **Encrypt in transit** — TLS for external and, increasingly, internal traffic ({{ch:tls-ssl}}).
- **Validate client IP headers** behind proxies; log real client addresses for security investigations.
- **Egress control**: restrict outbound traffic from sensitive servers to what they need, limiting data exfiltration.
- **DDoS protection** at the edge for public endpoints ({{ch:rate-limiting}}).

## How a senior engineer thinks about this

- **Count the round trips.** Latency, not bandwidth, usually limits user-facing performance.
- **Every network call can fail or hang.** Timeouts, retries with backoff, and connection reuse are standard.
- **Private by default.** Exposure is a deliberate, minimal decision.
- **Debug by layers.** DNS, routing, firewall, listener, application, TLS — each with its own tool.
- **Plan addresses early.** CIDR ranges chosen carelessly become permanent constraints.

## Exercises

### Exercise 1 — Plan the subnets

**Objective:** practise CIDR planning.
**What to do:** a VPC uses `10.20.0.0/16`. Plan public and private subnets in two availability zones, each with room for at least 1,000 addresses, plus space for growth. Give the CIDR blocks.

<details>
<summary>Show the solution</summary>

A `/22` holds 1,024 addresses (minus a few reserved by the cloud provider), so use `/22` blocks:

| Subnet | Zone | CIDR | Addresses |
|---|---|---|---|
| public-a | A | `10.20.0.0/22` | 10.20.0.0 – 10.20.3.255 |
| public-b | B | `10.20.4.0/22` | 10.20.4.0 – 10.20.7.255 |
| private-app-a | A | `10.20.8.0/22` | 10.20.8.0 – 10.20.11.255 |
| private-app-b | B | `10.20.12.0/22` | 10.20.12.0 – 10.20.15.255 |
| private-data-a | A | `10.20.16.0/22` | 10.20.16.0 – 10.20.19.255 |
| private-data-b | B | `10.20.20.0/22` | 10.20.20.0 – 10.20.23.255 |

That uses `10.20.0.0` to `10.20.23.255` — less than a tenth of the `/16` — leaving plenty of room for a third zone and future subnets. Blocks are aligned (each starts at a multiple of 4 in the third octet), which `/22` requires.

</details>

### Exercise 2 — Read the error

**Objective:** practise diagnosing from symptoms.
**What to do:** for each error, name the likely layer and first check: (1) `getaddrinfo ENOTFOUND db.internal`; (2) `connect ECONNREFUSED 10.20.8.15:5432`; (3) `connect ETIMEDOUT 10.20.16.7:5432`; (4) `read ECONNRESET` on long requests after exactly 60 seconds; (5) `certificate has expired`.

<details>
<summary>Show the solution</summary>

1. **DNS** — the name does not resolve: check the record exists and the resolver used (`dig db.internal`, `getent hosts`).
2. **Transport, reached host** — nothing listening on 5432 at that address: database down, wrong IP, or listening only on localhost (`ss -tlnp` on the server).
3. **Network/firewall** — packets dropped: security group or network rules, routing between subnets (`nc -vz`, check the database's inbound rules).
4. **Proxy/load balancer timeout** — an idle or request timeout of 60 seconds closes the connection: raise the timeout or make long operations asynchronous ({{ch:queues}}).
5. **TLS** — renew the certificate and automate renewal ({{ch:tls-ssl}}).

</details>

### Exercise 3 — Production scenario: the exposed database

**Objective:** practise network security reasoning.
**The scenario:** a security scan reports that the company's PostgreSQL database answers on a public IP, port 5432, from anywhere. It was set up that way "temporarily" so a developer could connect from home. What do you do now and afterwards?

<details>
<summary>Show the solution</summary>

**Now**
1. Remove the public access: restrict the security group to the application's security group only, and disable public accessibility on the database.
2. Check logs for connections from unknown IPs and for failed or successful logins; rotate database credentials as a precaution ({{ch:secrets-manager}}).
3. Verify the application still connects through private networking.

**Afterwards**
- Give developers a safe path: a bastion or session manager with port forwarding, a VPN, or a read-only replica with masked data ({{ch:systems-manager}}).
- Enforce rules with infrastructure as code and policy checks that reject `0.0.0.0/0` on database ports ({{ch:terraform}}).
- Continuous scanning for exposed services, and a blameless review of how the "temporary" change lasted ({{ch:observability-and-incidents}}).

</details>

## Summary

Networks move data as **packets** between **IP addresses**, with **ports** identifying services and **sockets** the endpoints of connections, organised in layers: link, internet (IP), transport (TCP, UDP, QUIC) and application (HTTP, DNS, TLS). "Layer 4" means IPs and ports; "layer 7" means the application protocol.

**IPv4** addresses are 32 bits, **IPv6** 128; **CIDR** notation (`10.0.1.0/24`) describes address blocks by how many leading bits are fixed, and membership is a bit-mask check. **Private ranges** (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`) are not routed on the internet; **NAT** lets private machines make outbound connections; `127.0.0.1` is loopback and `0.0.0.0` means all interfaces. **TCP** provides reliable, ordered connections at the cost of a handshake round trip; **UDP** is fast and connectionless; **HTTP** is text (or binary frames) carried over these connections, with the `Host` header selecting the site.

A request passes through DNS, TCP and TLS handshakes, CDNs, load balancers (layer 4 or layer 7), reverse proxies and the application — and round trips, bounded by physics, dominate latency, so connections are reused and requests reduced. **Firewalls** and **security groups** allow only necessary traffic, layer by layer. Diagnose problems by layer with `dig`, `nc`, `ss`, `curl` and `openssl`, and read the clues: unresolved names, refused connections, timeouts and resets each point somewhere different.

## Key terms

- **Computer network** — Connected devices exchanging data using shared protocols.
- **Protocol** — Agreed rules for communication between systems.
- **Packet** — A unit of data with headers and payload sent across a network.
- **IP address** — A numeric address identifying a device on a network.
- **IPv4 / IPv6** — The 32-bit and 128-bit versions of the Internet Protocol.
- **Port** — A number identifying a specific service or process on a host.
- **Socket** — One endpoint of a network connection: an IP address and port.
- **CIDR notation** — A way of writing address blocks as an address and a prefix length, such as `/24`.
- **Subnet** — A range of IP addresses forming part of a network.
- **Netmask** — The bit pattern separating the network and host parts of an address.
- **Private address range** — An IP range reserved for internal networks and not routed on the internet.
- **Loopback address** — An address (`127.0.0.1`, `::1`) referring to the local machine.
- **NAT** — Network address translation, letting many private hosts share public addresses.
- **TCP** — A reliable, ordered, connection-oriented transport protocol.
- **Three-way handshake** — The SYN, SYN-ACK, ACK exchange that opens a TCP connection.
- **UDP** — A connectionless transport protocol without delivery guarantees.
- **QUIC** — A UDP-based transport providing reliable, encrypted streams, used by HTTP/3.
- **Latency** — The time data takes to travel across a network.
- **Round-trip time (RTT)** — The time for a message to reach a destination and a reply to return.
- **Bandwidth** — The amount of data a connection can carry per second.
- **Router** — A device forwarding packets between networks.
- **Layer-4 load balancer** — A load balancer distributing TCP or UDP connections by address and port.
- **Layer-7 load balancer** — A load balancer that understands HTTP and routes by host, path and headers.
- **Firewall** — A system allowing or blocking traffic according to rules.
- **Security group** — A cloud firewall attached to resources, often referencing other groups.
- **X-Forwarded-For** — A header carrying the original client IP through proxies.
- **Connection refused** — An error meaning the host was reached but nothing listens on the port.
- **Connection timeout** — An error meaning no response arrived, often due to blocking or routing.

## What comes next

Every request in this chapter began by turning a name into an address. The next chapter, {{ch:dns}}, explains how that works: the hierarchy of the domain name system, resolvers and authoritative servers, record types (A, AAAA, CNAME, MX, TXT and more), caching and TTLs, and how DNS is used for deployments, email and failover.
