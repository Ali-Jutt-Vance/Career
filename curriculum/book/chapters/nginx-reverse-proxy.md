# Nginx and Reverse Proxies

> [!GOALS]
> - Explain what a **reverse proxy** is and why almost every web application has one in front of it.
> - Read and write NGINX configuration: **server blocks**, **locations**, `root`, `try_files` and `proxy_pass`.
> - Load-balance across application instances with **upstreams**, and pass the right **headers**.
> - Terminate **TLS**, set caching and security headers, compress responses and **rate-limit** requests.
> - Configure timeouts and understand **502**, **504** and other proxy errors.
> - Decide when to use NGINX and when a managed load balancer or CDN does the job.

## Why this matters

Node.js applications should not face the internet directly. Something in front should terminate HTTPS, serve static files efficiently, spread requests across several application processes, limit abusive clients, compress responses, add security headers and protect the application from slow or malformed requests. That something is a **reverse proxy**.

**NGINX** is the most widely used web server and reverse proxy in the world. It handles enormous numbers of connections with little memory, is configured with readable text files, and appears everywhere: on single servers in front of an API, inside containers serving front-end builds, as the **ingress controller** of many Kubernetes clusters ({{ch:eks}}), and as a building block of commercial products. Even where AWS load balancers and CloudFront do the outer work ({{ch:elb}}, {{ch:cloudfront}}), you will find NGINX somewhere in the stack — and the concepts are the same in every proxy (Caddy, HAProxy, Envoy, Traefik).

Every configuration in this chapter was tested with NGINX 1.27 in Docker, and the outputs are what it returned.

## The simple idea

Think of a hotel receptionist. Guests never walk straight to the kitchen, the laundry or the manager's office; they talk to reception. The receptionist answers simple questions directly (where the lifts are — static files), passes other requests to the right department (the API), sends guests to whichever porter is free (load balancing), and refuses entry to troublemakers (rate limiting).

> [!ANALOGY]
> A reverse proxy is like a hotel receptionist: guests talk only to reception, which answers simple questions itself and passes everything else to the right department.
>
> **Where the analogy breaks:** a receptionist remembers who each guest is. A proxy passes requests on, and unless it is told to add headers such as `X-Forwarded-For`, the application sees every request as coming from the proxy itself — losing the real client's address, protocol and host name.

## The proper definition and key words

A **reverse proxy** is a server that accepts client requests and forwards them to one or more backend servers, returning their responses as if it had produced them. (A **forward proxy** does the opposite: it acts for clients when they reach out to the internet.) **NGINX** is an event-driven web server and reverse proxy configured through **directives** arranged in **contexts**.

Key words:

- **Directive / context** — a configuration statement (`listen 80;`) and the block it lives in (`http`, `server`, `location`, `upstream`).
- **Server block** — a virtual host: a set of directives for certain ports and host names.
- **Location block** — rules for request paths matching a prefix or a regular expression.
- **`root` / `try_files`** — where static files come from, and which paths to try in order.
- **`proxy_pass`** — forward the request to a backend.
- **Upstream** — a named group of backend servers for load balancing.
- **`X-Forwarded-For` / `X-Forwarded-Proto` / `Host`** — headers that pass the client's address, original scheme and host name to the backend.
- **TLS termination** — decrypting HTTPS at the proxy.
- **`limit_req`** — request rate limiting.
- **Worker process** — one of NGINX's processes handling connections, normally one per CPU core.

## Configuration basics

### Level 1 — A first configuration

NGINX's main file (`/etc/nginx/nginx.conf`) sets global options and includes site files such as `/etc/nginx/conf.d/*.conf`. This chapter's site file serves a static site, proxies `/api/` to two application instances, and rate-limits the login route. Here it is, with a Compose file that runs NGINX and two copies of a tiny API ({{ch:docker-compose}}):

```bash
mkdir -p proxy-demo/site && cd proxy-demo
cat > echo.js <<'EOF'
// a tiny API that reports which instance answered and what the proxy told it
import { createServer } from "node:http";
createServer((req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify({
    instance: process.env.INSTANCE,
    path: req.url,
    host: req.headers.host,
    forwardedFor: req.headers["x-forwarded-for"] ? "set" : "missing",
    forwardedProto: req.headers["x-forwarded-proto"],
  }));
}).listen(3000);
EOF
echo '<h1>Corner Shop</h1>' > site/index.html
echo 'body { font-family: sans-serif; }' > site/app.css
cat > nginx.conf <<'EOF'
limit_req_zone $binary_remote_addr zone=login:10m rate=1r/s;

upstream shop_api {
    server api-1:3000;
    server api-2:3000;
    keepalive 16;
}

server {
    listen 80;
    server_name shop.local;

    root /usr/share/nginx/html;

    location / {
        try_files $uri $uri/ =404;
    }

    location ~* \.(css|js|png|jpg|svg|woff2)$ {
        add_header Cache-Control "public, max-age=2592000, immutable";
    }

    location /api/ {
        proxy_pass http://shop_api/;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 2s;
        proxy_read_timeout 30s;
    }

    location = /api/login {
        limit_req zone=login burst=2 nodelay;
        limit_req_status 429;
        proxy_pass http://shop_api/login;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
EOF
cat > compose.yaml <<'EOF'
name: proxydemo
services:
  proxy:
    image: nginx:1.27-alpine
    ports: ["127.0.0.1:18090:80"]
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
      - ./site:/usr/share/nginx/html:ro
    depends_on: [api-1, api-2]
  api-1:
    image: node:22-alpine
    command: ["node", "/app/echo.mjs"]
    environment: { INSTANCE: api-1 }
    volumes: ["./echo.js:/app/echo.mjs:ro"]
  api-2:
    image: node:22-alpine
    command: ["node", "/app/echo.mjs"]
    environment: { INSTANCE: api-2 }
    volumes: ["./echo.js:/app/echo.mjs:ro"]
EOF
docker compose up -d --wait > /dev/null 2>&1
sleep 1
docker compose exec -T proxy nginx -t 2>&1 | tail -1
curl -s http://127.0.0.1:18090/
curl -sI http://127.0.0.1:18090/app.css | grep -i -E '^(HTTP|cache-control)'
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:18090/missing.html
```

**Output:**

```text
nginx: configuration file /etc/nginx/nginx.conf test is successful
<h1>Corner Shop</h1>
HTTP/1.1 200 OK
Cache-Control: public, max-age=2592000, immutable
404
```

Reading the server block:

- **`listen 80; server_name shop.local;`** — this block answers on port 80 for that host name. With several server blocks, NGINX picks one by the request's `Host` header (the first block is the default for unknown names).
- **`root`** — static files come from `/usr/share/nginx/html`; `/` returned `index.html`.
- **`try_files $uri $uri/ =404;`** — try the exact file, then a directory, otherwise return 404 — as `missing.html` did. For a single-page application, the last item is `/index.html` instead, so client-side routes load the app ({{ch:react-basics}}).
- **The regular-expression location** `~* \.(css|js|…)$` matches static assets case-insensitively and adds a long-lived `Cache-Control` header — safe when file names include content hashes ({{ch:frontend-performance}}).
- **`nginx -t`** tests the configuration before it is used. Always run it before `nginx -s reload` (or `systemctl reload nginx`), which applies new configuration without dropping connections.

### Level 2 — How locations are chosen

NGINX picks **one** location per request:

1. An exact match `location = /api/login` wins immediately.
2. Otherwise the **longest matching prefix** is remembered (`location /api/` beats `location /`).
3. Then **regular-expression locations** (`~` case-sensitive, `~*` case-insensitive) are checked in the order written; the first match wins — unless the remembered prefix used `^~`, which skips regular expressions.
4. If no regular expression matches, the remembered prefix is used.

Most surprises come from rule 3: a regular-expression location for `\.js$` will also capture `/api/report.js`. Keep regular-expression locations few and specific.

## Proxying to applications

### Level 2 — `proxy_pass`, upstreams and headers

```bash
# four requests over one connection (one NGINX worker), so round robin is visible
curl -s -H 'Host: shop.local' -w '
' http://127.0.0.1:18090/api/products/42 http://127.0.0.1:18090/api/products/42   http://127.0.0.1:18090/api/products/42 http://127.0.0.1:18090/api/products/42
```

**Output:**

```text
{"instance":"api-1","path":"/products/42","host":"shop.local","forwardedFor":"set","forwardedProto":"http"}
{"instance":"api-2","path":"/products/42","host":"shop.local","forwardedFor":"set","forwardedProto":"http"}
{"instance":"api-1","path":"/products/42","host":"shop.local","forwardedFor":"set","forwardedProto":"http"}
{"instance":"api-2","path":"/products/42","host":"shop.local","forwardedFor":"set","forwardedProto":"http"}
```

- **`upstream shop_api`** lists two servers; requests alternate between them (**round robin**, the default). Alternatives: `least_conn` (fewest active connections) and `hash $key consistent` (the same key always goes to the same server).
- **The trailing slash matters**: `location /api/` with `proxy_pass http://shop_api/;` replaces `/api/` with `/`, so the application received `/products/42`. Without the slash in `proxy_pass`, it would receive `/api/products/42`. Getting this wrong is one of the most common NGINX mistakes.
- **Headers**: `Host` passes the original host name; **`X-Forwarded-For`** appends the client's address; **`X-Forwarded-Proto`** tells the app whether the client used HTTPS (here `http`). The application must be told to trust these headers **only from the proxy** (`app.set("trust proxy", 1)` in Express), or clients could fake their address ({{ch:express}}).
- **`keepalive 16`** with `proxy_http_version 1.1` and an empty `Connection` header reuses connections to the backends instead of opening one per request.
- These four requests shared **one** client connection. Each NGINX **worker process** keeps its own round-robin position, so separate connections that land on different workers may all start with the first server — a reason why small tests can look "unbalanced" while real traffic is spread evenly.

### Level 3 — Timeouts, failures and error codes

```bash
codes=""; for i in 1 2 3 4 5 6; do codes+="$(curl -s -o /dev/null -w '%{http_code}' -X POST http://127.0.0.1:18090/api/login) "; done
echo "login attempts: ${codes% }"
docker compose stop api-1 api-2 > /dev/null 2>&1
curl -s -o /dev/null -w 'with both API instances stopped: %{http_code}\n' http://127.0.0.1:18090/api/products
docker compose down > /dev/null 2>&1
```

**Output:**

```text
login attempts: 200 200 200 429 429 429
with both API instances stopped: 504
```

- **Rate limiting**: `limit_req_zone` tracks clients by IP address (`$binary_remote_addr`) at **1 request per second**; `burst=2 nodelay` allows a short burst of two extra requests. Six rapid login attempts: three accepted, then **429 Too Many Requests**. This protects login and password-reset routes from guessing attacks before they reach the application ({{ch:rate-limiting}}). Behind another proxy or load balancer, configure the `realip` module so the limit uses the real client address, not the load balancer's.
- **Backends down**: with both instances stopped, connections to their addresses could not be made, and NGINX answered **504 Gateway Timeout** after `proxy_connect_timeout` (2 s). A backend that actively refuses connections or closes them mid-response produces **502 Bad Gateway** instead.
- Timeouts to set deliberately: `proxy_connect_timeout` (short — seconds), `proxy_read_timeout` (the longest a normal response may take), `client_body_timeout` and `client_max_body_size` (upload limits, default 1 MB — {{ch:file-uploads}}).
- `proxy_next_upstream` retries **idempotent** requests on another server when one fails; NGINX does not retry non-idempotent requests such as POST by default, which is correct.

| Code from NGINX | Usually means |
|---|---|
| 502 Bad Gateway | Backend refused the connection, crashed or sent an invalid response |
| 503 Service Unavailable | No backend available (or a configured maintenance or limit response) |
| 504 Gateway Timeout | Backend did not connect or respond within the timeout |
| 413 Content Too Large | Request body larger than `client_max_body_size` |
| 429 Too Many Requests | `limit_req` rejected the request (when `limit_req_status 429` is set; the default is 503) |

## TLS, headers and performance

### Level 3 — HTTPS

```nginx
server {
    listen 80;
    server_name shop.example;
    return 301 https://$host$request_uri;          # every HTTP request goes to HTTPS
}

server {
    listen 443 ssl;
    http2 on;
    server_name shop.example;

    ssl_certificate     /etc/letsencrypt/live/shop.example/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/shop.example/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;

    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    location / {
        proxy_pass http://shop_api;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

- Certificates usually come from **Let's Encrypt**, renewed automatically by certbot or acme clients — monitor expiry anyway ({{ch:tls-ssl}}).
- `ssl_protocols TLSv1.2 TLSv1.3` disables old, insecure versions; HTTP/2 improves page loads.
- **Security headers** with `always` are added even to error responses ({{ch:application-security}}). Note that `add_header` in a `location` **replaces** all `add_header` directives inherited from the server block — a classic surprise; repeat them or use an include file.
- The private key file must be readable only by root and NGINX.

### Level 3 — Compression, buffering and caching

- **`gzip on; gzip_types text/css application/javascript application/json image/svg+xml;`** compresses text responses (Brotli with a module). Do not compress already-compressed formats such as JPEG.
- **Buffering**: by default NGINX reads the backend's response quickly into buffers and sends it to slow clients itself, freeing the application. Turn buffering off (`proxy_buffering off`) for streaming responses such as server-sent events.
- **WebSockets** need `proxy_http_version 1.1` and the `Upgrade` and `Connection` headers passed through, and a long `proxy_read_timeout` ({{ch:websockets}}).
- **`proxy_cache`** can cache backend responses on disk — useful for public, cacheable API responses, with the same cache-key care as any CDN ({{ch:caching}}).

## Operating NGINX

### Level 4 — Logs and monitoring

- **Access logs** record every request; define a structured format with the fields you need — `$request_time` (total time) and `$upstream_response_time` (backend time) show whether slowness is in NGINX, the network or the application:

```nginx
log_format json escape=json '{"time":"$time_iso8601","ip":"$remote_addr","method":"$request_method",'
  '"uri":"$request_uri","status":$status,"bytes":$body_bytes_sent,'
  '"request_time":$request_time,"upstream_time":"$upstream_response_time","upstream":"$upstream_addr"}';
access_log /var/log/nginx/access.log json;
```

- **Error logs** explain 502s and 504s ("connect() failed (111: Connection refused) while connecting to upstream").
- In containers, log to stdout and stderr (the official image links its log files there).
- Export metrics with the stub status module and an exporter for Prometheus ({{ch:prometheus}}).

### Level 4 — NGINX or managed services?

| Need | On AWS, often | NGINX is a good fit when |
|---|---|---|
| TLS and load balancing for an API | ALB ({{ch:elb}}) | Single servers, other clouds, on-premises, inside Kubernetes |
| Static files and edge caching | S3 + CloudFront | Serving a front-end build from a container |
| Rate limiting and WAF | AWS WAF | Simple per-route limits close to the app |
| Routing many services in a cluster | — | Ingress controllers, API gateways built on NGINX |

Many systems use both: an ALB in front for TLS and health-checked load balancing, and NGINX inside a container serving a single-page application, or as a Kubernetes ingress.

## From beginner to enterprise

**Level 1–2 — first configurations.** Server blocks and locations; serving static files with `try_files`; `proxy_pass` with the right trailing slash; `Host` and `X-Forwarded-*` headers; `nginx -t` before reloads.

**Level 3 — production proxies.** HTTPS with automated certificates and redirects; security headers; upstreams with keep-alive; timeouts and upload limits; gzip; rate limiting on sensitive routes; WebSocket proxying.

**Level 4 — operations.** Structured access logs with upstream timings; metrics; real client IPs behind load balancers; configuration in version control with automated tests; zero-downtime reloads.

**Level 5 — senior practice.** Choosing between NGINX, managed load balancers, CDNs and service meshes; capacity tuning (workers, connections, buffers); diagnosing tail latency from proxy logs.

**Level 6 — enterprises.** Ingress platforms for many teams, central TLS and header policies, API gateways and WAF integration across fleets.

## Real-world use cases

### A single-server deployment

- **Set-up**: NGINX on a small VM terminates HTTPS with Let's Encrypt, serves the React build from disk with long cache headers for hashed assets, proxies `/api/` to two Node.js processes managed by systemd ({{ch:linux}}), rate-limits `/api/login`, and writes JSON access logs.

### The mysterious 502s

- **What happened**: after a deployment, some requests returned 502 for about ten seconds.
- **Cause**: the old Node.js processes stopped before the new ones were listening; NGINX had nowhere to send requests.
- **Fix**: start new processes first and switch the upstream (or rely on `proxy_next_upstream` for idempotent requests), and handle `SIGTERM` gracefully in the application.

## Common mistakes

### Beginner: wrong trailing slash in `proxy_pass`

**Consequence:** the application receives `/api/api/…` or loses part of the path. **Fix:** understand the replacement rule and test paths.

### Beginner: missing `X-Forwarded-*` headers

**Consequence:** the application logs the proxy's IP and builds `http://` links on HTTPS sites. **Fix:** set the headers; trust them only from the proxy.

### Beginner: reloading without `nginx -t`

**Consequence:** a syntax error takes the site down. **Fix:** test first, always.

### Intermediate: `add_header` in a location dropping server-level headers

**Fix:** repeat headers or use includes; check responses with `curl -I`.

### Intermediate: default upload limit

**Consequence:** 413 errors for normal uploads. **Fix:** set `client_max_body_size` per location.

### Intermediate: rate limiting the load balancer's IP

**Consequence:** all users share one limit. **Fix:** `realip` configuration with trusted proxy ranges.

### Production: application listening publicly as well

**Consequence:** clients bypass the proxy's protections. **Fix:** bind the app to localhost or a private network only.

## Debugging and troubleshooting

- **Config errors**: `nginx -t` names the file and line.
- **502**: the error log says why — connection refused (app down or wrong port), upstream prematurely closed connection (app crash), or invalid headers.
- **504**: the app is slow or unreachable; compare `$upstream_response_time` with `proxy_read_timeout`.
- **Wrong location used**: add a temporary `add_header X-Debug-Location "api" always;` per location, or check `$uri` in logs.
- **Static file 403/404**: check `root` versus `alias`, file permissions for the NGINX user, and `try_files`.
- **Redirect loops with HTTPS**: an app that redirects to HTTPS because it does not see `X-Forwarded-Proto`.

## Security summary

- **TLS** with modern protocols, automatic renewal, HTTP redirected to HTTPS, HSTS.
- **Security headers** on every response; hide version numbers with `server_tokens off`.
- **Rate limits** on login, password reset and other sensitive routes; body size limits.
- **Trusted proxy headers only**; applications not reachable around the proxy.
- **Key files** readable only by root and NGINX; configuration reviewed in version control.
- **Keep NGINX updated** — it faces the internet.

## How a senior engineer thinks about this

- **The edge does the generic work.** TLS, compression, static files, limits and headers belong in front of the app.
- **Headers carry the truth.** Host, client address and scheme must survive the proxy — and be trusted only from it.
- **Timeouts are a chain.** Client, proxy, application and database timeouts must fit together.
- **Read the error codes.** 502, 504 and 413 point to different causes.
- **Use managed services where they fit**, and NGINX where control or portability matters.

## Exercises

### Exercise 1 — Serve a single-page app and an API

**Objective:** practise server and location blocks.
**What to do:** write a server block that serves a React build from `/var/www/shop`, returns `index.html` for unknown paths (client-side routes), caches `/assets/` for a year, and proxies `/api/` to `127.0.0.1:3000` without the `/api` prefix.

<details>
<summary>Show the solution</summary>

```nginx
server {
    listen 80;
    server_name shop.example;
    root /var/www/shop;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /assets/ {
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    location /api/ {
        proxy_pass http://127.0.0.1:3000/;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

`index.html` itself should get a short cache time (or `no-cache`) so new deployments are picked up.

</details>

### Exercise 2 — Explain the errors

**Objective:** practise proxy debugging.
**What to do:** explain each and the first thing to check: (a) uploads larger than 1 MB fail with 413; (b) every request returns 502 after a server restart; (c) report downloads fail with 504 after exactly 60 seconds.

<details>
<summary>Show the solution</summary>

- (a) `client_max_body_size` defaults to 1 MB — raise it for the upload location (and check any load balancer limits).
- (b) The application is not running or not listening where `proxy_pass` points (port, address, or it binds to a different interface). Check the error log and the app's service status.
- (c) `proxy_read_timeout` defaults to 60 s — the report is slower than that. Make reports asynchronous (generate in the background, then download), or raise the timeout for that location if appropriate.

</details>

### Exercise 3 — Production scenario: the login attack

**Objective:** practise edge protection.
**The scenario:** your NGINX logs show thousands of POST requests per minute to `/api/login` from many IP addresses, and the API's CPU is at 100%. The servers sit behind an AWS load balancer. What do you do?

<details>
<summary>Show the solution</summary>

1. **Real client IPs**: configure `set_real_ip_from` with the load balancer's address range and `real_ip_header X-Forwarded-For`, so limits apply per client rather than per load balancer.
2. **Rate limit** `/api/login` per IP with `limit_req` (and a 429 response); add a second, wider limit per route.
3. **Push protection outwards**: AWS WAF rate-based rules and bot control on the load balancer or CloudFront, so traffic never reaches NGINX ({{ch:cloudfront}}).
4. **Application defences**: per-account lockouts or delays, CAPTCHA after failures, breached-password checks, and alerts on login failure rates ({{ch:authentication}}).
5. **Monitor** 429 counts and login success rates to tune limits without blocking real users.

</details>

## Summary

A **reverse proxy** receives client requests and forwards them to backends; **NGINX** is the most common one, configured with **directives** in **contexts**. **Server blocks** match ports and host names; **location blocks** match paths (exact, longest prefix, then regular expressions in order); `root` and `try_files` serve static files, with single-page applications falling back to `index.html`. Test with `nginx -t` before reloading.

**`proxy_pass`** forwards to an application or an **upstream** group (round robin by default, `least_conn`, `hash`), and its trailing slash decides whether the location prefix is stripped. Set `Host`, `X-Forwarded-For` and `X-Forwarded-Proto`, trust them only from the proxy, and reuse backend connections with keep-alive. **`limit_req`** rate-limits sensitive routes (429), and timeouts, body size limits and retries of idempotent requests need deliberate settings. A refused or broken backend gives **502**, none available **503**, a slow or unreachable one **504**.

At the edge, terminate **TLS** with automatically renewed certificates, redirect HTTP to HTTPS, add security headers (remembering that a location's `add_header` replaces inherited ones), compress text, and pass WebSockets through. Log structured requests with upstream timings, export metrics, and choose between NGINX and managed load balancers or CDNs by where control and portability matter.

## Key terms

- **Reverse proxy** — A server that forwards client requests to backend servers.
- **Forward proxy** — A server that makes outbound requests on behalf of clients.
- **NGINX** — A widely used, event-driven web server and reverse proxy.
- **Directive** — A single NGINX configuration statement.
- **Context** — An NGINX configuration block such as `http`, `server` or `location`.
- **Server block** — Configuration for a set of ports and host names.
- **Location block** — Configuration for matching request paths.
- **`try_files`** — A directive that checks files in order and falls back to a final option.
- **`proxy_pass`** — A directive that forwards requests to a backend.
- **Upstream** — A named group of backend servers.
- **Round robin** — Sending requests to servers in turn.
- **X-Forwarded-For** — A header carrying the chain of client IP addresses.
- **X-Forwarded-Proto** — A header carrying the scheme the client used.
- **TLS termination** — Decrypting HTTPS at the proxy.
- **`limit_req`** — NGINX's request rate-limiting directive.
- **Worker process** — An NGINX process that handles connections.
- **Keep-alive** — Reusing connections for several requests.
- **Proxy buffering** — Reading a backend's response into buffers before sending it to the client.
- **Ingress controller** — A reverse proxy that routes external traffic into a Kubernetes cluster.

## What comes next

With servers, containers and proxies in place, changes should reach them automatically, tested and safely. The next chapter, {{ch:cicd}}, covers continuous integration and delivery: pipelines, quality gates, building once and promoting artifacts, deployment strategies, feature flags and rollbacks.
