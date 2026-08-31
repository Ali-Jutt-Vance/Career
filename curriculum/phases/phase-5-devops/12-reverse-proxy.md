# Phase 5 — Chapter 12: Reverse Proxy

---

## Chapter Overview

A reverse proxy sits in front of application servers, forwarding client requests to the appropriate backend. Unlike a forward proxy (which proxies client traffic outbound), a reverse proxy is server-side infrastructure that enables: load balancing, SSL termination, caching, routing, authentication, and observability.

**Tools covered:**
- Nginx (covered in depth in Chapter 5, extended here)
- Traefik (modern, Docker-native, auto-discovery)
- HAProxy (high-performance TCP/HTTP load balancer)
- AWS Application Load Balancer (managed)
- Patterns: request routing, header manipulation, A/B testing

---

## Beginner Theory

### Forward Proxy vs. Reverse Proxy

```
Forward Proxy (client-side):
  Client → [Forward Proxy] → Internet
  - Client configures proxy
  - Hides client identity from servers
  - Common: corporate web filters, VPNs

Reverse Proxy (server-side):
  Internet → [Reverse Proxy] → App Servers
  - Transparent to client (client doesn't know proxy exists)
  - Hides server topology from clients
  - Common: Nginx, ALB, Cloudflare, Traefik

Reverse Proxy responsibilities:
  - SSL termination (handle TLS, backend gets plain HTTP)
  - Load balancing (distribute to multiple backends)
  - Caching (serve cached responses for repeated requests)
  - Rate limiting (block abusive clients)
  - Request routing (route /api/* to api-service, /admin/* to admin-service)
  - Authentication (verify token before forwarding)
  - Compression (gzip response from backend)
  - Header manipulation (add/remove/rewrite headers)
  - Observability (centralized access logs, metrics)
```

---

## Basic Examples

### Nginx — Path-Based Routing to Multiple Services

```nginx
# Route different paths to different microservices
upstream api_service   { server 127.0.0.1:3001; }
upstream web_service   { server 127.0.0.1:3000; }
upstream admin_service { server 127.0.0.1:3002; }

server {
    listen 443 ssl http2;
    server_name myapp.com;

    ssl_certificate     /etc/letsencrypt/live/myapp.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/myapp.com/privkey.pem;

    # API service: /api/* → Node.js API
    location /api/ {
        proxy_pass http://api_service/;   # trailing slash strips /api prefix
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Rate limit API
        limit_req zone=api burst=50 nodelay;
    }

    # Admin: /admin/* with basic auth or IP whitelist
    location /admin/ {
        # Allow only office IPs
        allow  203.0.113.0/24;
        deny   all;

        proxy_pass http://admin_service/;
        proxy_set_header Host $host;
    }

    # WebSocket: /ws/* → WebSocket server
    location /ws/ {
        proxy_pass         http://api_service/ws/;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade    $http_upgrade;
        proxy_set_header   Connection "upgrade";
        proxy_read_timeout 3600s;  # keep WS connections alive
    }

    # Static assets: serve from filesystem directly
    location /static/ {
        alias /opt/myapp/public/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Default: web application
    location / {
        proxy_pass http://web_service;
        proxy_set_header Host $host;
    }
}
```

---

## Intermediate Concepts

### Traefik (Docker-native Auto-Discovery)

```yaml
# docker-compose.yml with Traefik
services:
  traefik:
    image: traefik:v3.1
    command:
      - "--api.dashboard=true"
      - "--providers.docker=true"               # auto-discover Docker services
      - "--providers.docker.exposedbydefault=false"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
      - "--certificatesresolvers.letsencrypt.acme.email=admin@myapp.com"
      - "--certificatesresolvers.letsencrypt.acme.storage=/acme.json"
      - "--certificatesresolvers.letsencrypt.acme.tlschallenge=true"
    ports:
      - "80:80"
      - "443:443"
      - "8080:8080"    # dashboard
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - traefik-acme:/acme.json
    networks: [web]
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.traefik.rule=Host(`traefik.myapp.com`)"
      - "traefik.http.routers.traefik.tls=true"
      - "traefik.http.routers.traefik.tls.certresolver=letsencrypt"
      - "traefik.http.routers.traefik.service=api@internal"
      # Middleware: basic auth for dashboard
      - "traefik.http.middlewares.auth.basicauth.users=admin:$$apr1$$..."
      - "traefik.http.routers.traefik.middlewares=auth"

  api:
    image: myapp-api:latest
    networks: [web]
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.api.rule=Host(`myapp.com`) && PathPrefix(`/api`)"
      - "traefik.http.routers.api.tls=true"
      - "traefik.http.routers.api.tls.certresolver=letsencrypt"
      - "traefik.http.services.api.loadbalancer.server.port=3000"
      # Strip /api prefix before forwarding
      - "traefik.http.middlewares.api-strip.stripprefix.prefixes=/api"
      - "traefik.http.routers.api.middlewares=api-strip"

  web:
    image: myapp-web:latest
    networks: [web]
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.web.rule=Host(`myapp.com`)"
      - "traefik.http.routers.web.tls=true"
      - "traefik.http.routers.web.tls.certresolver=letsencrypt"
      - "traefik.http.services.web.loadbalancer.server.port=3000"

volumes:
  traefik-acme:

networks:
  web:
    external: true
```

### HAProxy (High-Performance TCP/HTTP)

```
# /etc/haproxy/haproxy.cfg

global
    maxconn 50000
    log /dev/log local0
    user  haproxy
    group haproxy
    daemon

defaults
    mode    http
    log     global
    option  httplog
    option  dontlognull
    option  forwardfor
    option  http-server-close
    retries 3
    timeout connect  5s
    timeout client  30s
    timeout server  30s

frontend http-in
    bind *:80
    redirect scheme https code 301

frontend https-in
    bind *:443 ssl crt /etc/ssl/myapp.pem alpn h2,http/1.1
    
    # ACLs for routing
    acl is_api   path_beg /api/
    acl is_admin path_beg /admin/
    acl is_ws    hdr(Upgrade) -i websocket

    use_backend api_backend   if is_api
    use_backend admin_backend if is_admin
    use_backend ws_backend    if is_ws
    default_backend web_backend

backend api_backend
    balance leastconn
    option  httpchk GET /api/health
    http-check expect status 200
    server api1 127.0.0.1:3001 check inter 10s fall 3 rise 2
    server api2 127.0.0.1:3002 check inter 10s fall 3 rise 2

backend web_backend
    balance roundrobin
    server web1 127.0.0.1:3000 check

backend ws_backend
    balance source      # stick by IP for WebSocket
    server ws1 127.0.0.1:3001 check

backend admin_backend
    acl allowed_ip src 203.0.113.0/24
    http-request deny if !allowed_ip
    server admin1 127.0.0.1:3002 check
```

### Header Manipulation

```nginx
# Add correlation ID for distributed tracing
map $http_x_request_id $request_id_header {
    default $http_x_request_id;
    ""      $request_id;        # generate if not provided
}

location /api/ {
    proxy_set_header X-Request-ID   $request_id_header;
    proxy_set_header X-Real-IP      $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

    # Remove sensitive headers from client
    proxy_set_header Authorization "";  # clear if using token in cookie
    
    # Hide backend server info from clients
    proxy_hide_header X-Powered-By;
    proxy_hide_header Server;
    
    # Add response header with cache status
    add_header X-Cache-Status $upstream_cache_status always;

    proxy_pass http://api_service;
}
```

---

## Interview Preparation

**Q1: What is the difference between a reverse proxy and a load balancer?**
A: These functions overlap significantly — most reverse proxies include load balancing. The distinction: a load balancer's primary purpose is distributing traffic across multiple backend instances (layer 4 or 7). A reverse proxy's scope is broader: SSL termination, caching, routing, authentication, compression, header manipulation, and load balancing as one of many features. In practice: Nginx, Traefik, and HAProxy are reverse proxies that do load balancing. AWS ALB and NLB are dedicated load balancers with some reverse proxy features. When architects say "reverse proxy," they usually mean the full feature set. "Load balancer" usually emphasizes the traffic distribution function.

**Q2: What is the difference between Layer 4 and Layer 7 load balancing?**
A: Layer 4 (transport layer — TCP/UDP): routes based on IP address and port. Fast, low overhead — can't read HTTP headers or body. AWS NLB, HAProxy in TCP mode. Best for: non-HTTP protocols (PostgreSQL, Redis), ultra-low latency, maximum throughput. Layer 7 (application layer — HTTP): can read and route based on HTTP method, URL path, headers, cookies. Enables path-based routing, sticky sessions, request rewriting, A/B testing. AWS ALB, Nginx, Traefik. Slightly higher latency due to HTTP parsing. Best for: web applications, microservices routing, WebSocket, gRPC. Use NLB for raw TCP performance; ALB/Nginx for intelligent HTTP routing.

**Q3: How does a reverse proxy enable zero-downtime deployments?**
A: The reverse proxy maintains the upstream server pool. During deployment: add new servers to the upstream pool before removing old ones (rolling update). The proxy health-checks backends — when a new instance passes health check, it receives traffic; when you stop an old instance, the proxy routes around it. For blue-green: change the upstream block to point to the green server pool atomically (`nginx -s reload` applies new config without dropping connections). Nginx gracefully drains in-flight requests to old workers. For canary: use upstream weights (`server api2 127.0.0.1:3002 weight=5`) to send 5% of traffic to the new version while keeping 95% on the old.

---

## Practical Tasks

### Beginner (10 Tasks)
1. Configure Nginx to proxy `/api/` to a Node.js backend.
2. Strip the `/api` prefix before forwarding using Nginx.
3. Add `X-Real-IP` and `X-Forwarded-For` headers.
4. Configure Nginx to serve static files from a directory.
5. Set up WebSocket proxying with `Upgrade` header.
6. Add rate limiting to the `/api/` path.
7. Set up basic authentication for `/admin/`.
8. Configure access logs with upstream response time.
9. Set up separate upstreams for API and web services.
10. Test routing to different services with `curl`.

### Intermediate (10 Tasks)
1. Set up Traefik with Docker Compose and auto-discover services.
2. Configure Traefik to issue Let's Encrypt certificates automatically.
3. Implement path stripping middleware in Traefik.
4. Add IP whitelist middleware in Traefik for admin routes.
5. Set up HAProxy with health check-based failover.
6. Implement sticky sessions (session affinity) for a stateful service.
7. Add a request ID header for distributed tracing.
8. Configure A/B testing with weighted upstream in Nginx.
9. Set up Nginx microcaching for API responses.
10. Implement request buffering limits to prevent slow client attacks.

### Advanced (10 Tasks)
1. Build a multi-service reverse proxy with Traefik and 5+ services.
2. Implement dynamic upstream configuration (Nginx+ or OpenResty).
3. Add authentication middleware (JWT verification) at the proxy level.
4. Configure gRPC load balancing with Nginx.
5. Implement response transformation (rewrite JSON responses at proxy).
6. Set up Cloudflare as external reverse proxy with origin protection.
7. Implement automatic failover between primary and DR with health checks.
8. Configure Circuit Breaker at the proxy level with Nginx+.
9. Implement zero-downtime Nginx config reload in Docker Compose.
10. Build a complete service mesh with Envoy sidecar proxies.

---

## Self Assessment
1. What is a reverse proxy?
2. What is the difference between a forward proxy and reverse proxy?
3. What is path-based routing?
4. What is the difference between layer 4 and layer 7 load balancing?
5. What is sticky session?
6. What is Traefik's auto-discovery?
7. What is `proxy_hide_header` used for?
8. What is `proxy_set_header X-Forwarded-For` for?
9. What is HAProxy?
10. How does a reverse proxy enable zero-downtime deployments?

---

## Cheat Sheet

```nginx
# Nginx reverse proxy
upstream api { least_conn; server 127.0.0.1:3001; server 127.0.0.1:3002; }

server {
    listen 443 ssl http2;
    # location /api/ { proxy_pass http://api/; ... }  # path-based routing
    # location /ws/  { proxy_http_version 1.1; proxy_set_header Upgrade $http_upgrade; ... }

    location /api/ {
        proxy_pass         http://api/;          # trailing / strips /api prefix
        proxy_http_version 1.1;
        proxy_set_header   Upgrade    $http_upgrade;
        proxy_set_header   Connection "upgrade";
        proxy_set_header   Host       $host;
        proxy_set_header   X-Real-IP  $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_hide_header  X-Powered-By;
    }
}
```

```yaml
# Traefik service label pattern
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.myservice.rule=Host(`myapp.com`) && PathPrefix(`/api`)"
  - "traefik.http.routers.myservice.tls.certresolver=letsencrypt"
  - "traefik.http.middlewares.strip.stripprefix.prefixes=/api"
  - "traefik.http.routers.myservice.middlewares=strip"
  - "traefik.http.services.myservice.loadbalancer.server.port=3000"
```
