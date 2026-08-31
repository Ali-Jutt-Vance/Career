# Phase 5 — Chapter 5: Nginx

---

## Chapter Overview

Nginx is the world's most-used web server and reverse proxy. As a backend engineer, you configure Nginx to: proxy requests to your Node.js/Python/Java apps, serve static files, terminate SSL/TLS, rate limit, load balance, and add security headers.

**Core topics:**
- Nginx as reverse proxy
- SSL/TLS termination with Let's Encrypt
- Static file serving
- Load balancing
- Compression (gzip/brotli)
- Caching headers
- Security headers
- Rate limiting

---

## Beginner Theory

### Nginx Architecture

```
Client Request
      │
      ▼
  nginx master process
      │ (manages)
      ├─ worker process 1  ← handles N connections (event-driven, non-blocking)
      ├─ worker process 2
      └─ worker process N  (N = CPU cores by default)

Key config files:
  /etc/nginx/nginx.conf          ← main config
  /etc/nginx/conf.d/*.conf       ← site configs (included from nginx.conf)
  /etc/nginx/sites-available/    ← Ubuntu convention (symlink to sites-enabled)
  /etc/nginx/sites-enabled/

Directives live in contexts:
  main (top level) → events { } → http { } → server { } → location { }
```

---

## Basic Examples

### Reverse Proxy (Node.js App)

```nginx
# /etc/nginx/conf.d/myapp.conf

# Upstream: pool of backend servers
upstream myapp {
    # least_conn sends to server with fewest active connections
    least_conn;

    server 127.0.0.1:3000 weight=1;
    server 127.0.0.1:3001 weight=1;  # second app instance (optional)
    
    # Health monitoring (Nginx Plus / OpenResty)
    # keepalive 32;  # keep 32 idle connections to upstream
}

server {
    listen 80;
    listen [::]:80;
    server_name myapp.com www.myapp.com;

    # Redirect HTTP → HTTPS
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name myapp.com www.myapp.com;

    # SSL configuration (Let's Encrypt)
    ssl_certificate     /etc/letsencrypt/live/myapp.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/myapp.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Logging
    access_log /var/log/nginx/myapp.access.log combined;
    error_log  /var/log/nginx/myapp.error.log warn;

    # Security headers
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:;" always;

    # Hide Nginx version
    server_tokens off;

    # Client request size limit
    client_max_body_size 10M;

    # Timeout settings
    client_body_timeout   30s;
    client_header_timeout 30s;
    send_timeout          30s;

    # Reverse proxy to Node.js
    location / {
        proxy_pass         http://myapp;
        proxy_http_version 1.1;
        
        # Required for WebSocket support
        proxy_set_header Upgrade    $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Forward client info
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Proxy timeouts
        proxy_connect_timeout 10s;
        proxy_send_timeout    60s;
        proxy_read_timeout    60s;

        # Buffer settings
        proxy_buffering    on;
        proxy_buffer_size  4k;
        proxy_buffers      8 4k;
    }

    # Serve static files directly from Nginx (much faster than Node.js)
    location /static/ {
        alias /opt/myapp/dist/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
        gzip_static on;  # serve pre-compressed .gz files if available
    }

    # favicon
    location = /favicon.ico {
        alias /opt/myapp/public/favicon.ico;
        expires 30d;
        log_not_found off;
        access_log off;
    }

    # robots.txt
    location = /robots.txt {
        alias /opt/myapp/public/robots.txt;
        access_log off;
    }
}
```

---

## Intermediate Concepts

### Global Nginx Config

```nginx
# /etc/nginx/nginx.conf

user nginx;
worker_processes auto;                    # one per CPU core
worker_rlimit_nofile 65536;              # max open files per worker

error_log /var/log/nginx/error.log warn;
pid       /var/run/nginx.pid;

events {
    worker_connections 4096;              # max connections per worker
    use epoll;                            # Linux: most efficient I/O model
    multi_accept on;                      # accept multiple connections at once
}

http {
    include      /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Logging format
    log_format main '$remote_addr - $remote_user [$time_local] '
                    '"$request" $status $body_bytes_sent '
                    '"$http_referer" "$http_user_agent" '
                    'rt=$request_time uct=$upstream_connect_time '
                    'uht=$upstream_header_time urt=$upstream_response_time';

    # Performance
    sendfile        on;   # zero-copy file sending (for static files)
    tcp_nopush      on;   # batch send headers (with sendfile)
    tcp_nodelay     on;   # disable Nagle algorithm (for small packets)
    keepalive_timeout 65;
    types_hash_max_size 2048;
    server_tokens off;

    # Compression
    gzip              on;
    gzip_vary         on;
    gzip_proxied      any;
    gzip_comp_level   6;
    gzip_buffers      16 8k;
    gzip_http_version 1.1;
    gzip_min_length   256;
    gzip_types
        text/plain text/css text/xml
        application/json application/javascript application/xml+rss
        application/atom+xml image/svg+xml
        font/woff2 font/ttf;

    # Rate limiting zones
    limit_req_zone  $binary_remote_addr zone=api:10m  rate=10r/s;
    limit_req_zone  $binary_remote_addr zone=login:10m rate=5r/m;
    limit_conn_zone $binary_remote_addr zone=conn:10m;

    # Include site configs
    include /etc/nginx/conf.d/*.conf;
}
```

### Rate Limiting

```nginx
server {
    # ...

    # API rate limiting: 10 req/sec, burst up to 20
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        limit_req_status 429;
        add_header Retry-After 1 always;

        proxy_pass http://myapp;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Login endpoint: 5 req/min, no burst
    location = /api/auth/login {
        limit_req zone=login burst=3;
        limit_req_status 429;
        
        proxy_pass http://myapp;
    }

    # Connection limit: max 20 concurrent connections per IP
    location / {
        limit_conn conn 20;
        limit_conn_status 503;
        proxy_pass http://myapp;
    }
}
```

### SSL/TLS with Certbot (Let's Encrypt)

```bash
# Install Certbot
apt install certbot python3-certbot-nginx

# Obtain certificate (auto-configures nginx)
certbot --nginx -d myapp.com -d www.myapp.com

# Or manually obtain and configure
certbot certonly --nginx -d myapp.com

# Verify auto-renewal
certbot renew --dry-run

# Renewal cron (certbot installs this automatically)
# 0 0,12 * * * root python -c 'import random; import time; time.sleep(random.random() * 3600)' && certbot -q renew

# Test SSL configuration
curl -I https://myapp.com
# Check: ssllabs.com/ssltest
```

### Nginx Caching

```nginx
http {
    # Cache zone: 1GB, files cached for 60m after last access
    proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=mycache:10m max_size=1g
                     inactive=60m use_temp_path=off;

    server {
        location /api/products {
            proxy_cache       mycache;
            proxy_cache_key   "$scheme$request_method$host$request_uri";
            proxy_cache_valid 200 5m;    # cache 200 responses for 5 min
            proxy_cache_valid 404 1m;
            proxy_cache_bypass $http_cache_control;    # bypass if Cache-Control: no-cache
            add_header X-Cache-Status $upstream_cache_status;  # HIT/MISS/BYPASS
            
            proxy_pass http://myapp;
        }

        # Cache static assets with long TTL
        location ~* \.(js|css|png|jpg|gif|svg|woff2|ico)$ {
            expires 1y;
            add_header Cache-Control "public, max-age=31536000, immutable";
            access_log off;
        }
    }
}
```

---

## Interview Preparation

**Q1: Why use Nginx as a reverse proxy instead of exposing Node.js directly?**
A: Several reasons: SSL termination — Nginx handles TLS handshake efficiently using OpenSSL, so Node.js only deals with plain HTTP internally. Static file serving — Nginx serves static assets at line speed without involving Node.js (sendfile syscall). Load balancing — Nginx distributes requests across multiple Node.js instances. Rate limiting — Nginx blocks abusive clients before they reach your app. DDoS mitigation — Nginx buffers slow clients (slowloris attacks), so Node.js isn't held up waiting for slow request bodies. Security headers — centralized header management. Gzip compression — offloaded from Node.js. Together, this means your Node.js app only does application logic.

**Q2: What is the difference between `proxy_pass http://127.0.0.1:3000` and `proxy_pass http://myapp` (upstream)?**
A: `proxy_pass http://127.0.0.1:3000` connects to a single server. `upstream myapp { ... }` defines a named pool of servers with load balancing. With upstream, you can: add multiple servers with weights, use load balancing algorithms (round-robin default, least_conn, ip_hash), configure health checks (Nginx Plus), set keepalive connection pools, enable backup servers. Even for a single app instance, using an upstream block makes it easy to add a second instance later without changing the `location` block.

**Q3: How do you configure Nginx for WebSocket support?**
A: WebSockets require HTTP/1.1 and the `Upgrade` header. Two proxy headers are required: `proxy_set_header Upgrade $http_upgrade;` and `proxy_set_header Connection "upgrade";`. Without `Upgrade`, the connection defaults to HTTP 1.0 which doesn't support keep-alive or upgrades. Without `Connection: upgrade`, the server won't initiate the upgrade. Also ensure `proxy_http_version 1.1;` is set (Nginx defaults to 1.0 for proxying). These three settings together enable WebSocket proxying.

---

## Practical Tasks

### Beginner (10 Tasks)
1. Install Nginx and serve a static HTML page on port 80.
2. Configure Nginx as a reverse proxy to a Node.js app on port 3000.
3. Add `proxy_set_header X-Real-IP` and `X-Forwarded-For`.
4. Configure `client_max_body_size 10M` for file uploads.
5. Enable gzip compression for JSON and JS responses.
6. Serve static files from a directory with long cache headers.
7. Redirect HTTP to HTTPS.
8. View Nginx access and error logs.
9. Test the config with `nginx -t` before reloading.
10. Reload config without downtime with `nginx -s reload`.

### Intermediate (10 Tasks)
1. Configure SSL/TLS with Let's Encrypt via Certbot.
2. Add security headers (HSTS, X-Frame-Options, CSP).
3. Configure rate limiting for `/api/` and `/api/auth/login`.
4. Set up load balancing with `upstream` and two app instances.
5. Configure connection limits per IP.
6. Enable Nginx proxy caching for product listings API.
7. Configure WebSocket proxying (`Upgrade`, `Connection`).
8. Add custom log format with upstream response time.
9. Configure custom error pages (404, 500).
10. Block bad bots and scrapers by User-Agent.

### Advanced (10 Tasks)
1. Achieve A+ rating on SSL Labs for your domain.
2. Configure Nginx as a streaming proxy for large file downloads.
3. Implement geographic load balancing.
4. Configure OCSP stapling for faster SSL handshakes.
5. Implement Nginx with Let's Encrypt auto-renewal in Docker Compose.
6. Set up micro-caching (1-second cache) for high-traffic APIs.
7. Configure Nginx as a TCP/UDP proxy (stream module).
8. Implement auth via ngx_http_auth_request_module.
9. Use Lua scripting (OpenResty) for dynamic Nginx config.
10. Tune Nginx worker settings for 100k concurrent connections.

---

## Self Assessment
1. What is a reverse proxy?
2. What does `proxy_pass` do?
3. Why is `proxy_set_header X-Forwarded-For` important?
4. What does `sendfile on` do?
5. What is `limit_req_zone` used for?
6. What is the difference between `expires` and `Cache-Control`?
7. What headers are needed for WebSocket proxying?
8. What does `nginx -t` do?
9. What is an `upstream` block?
10. What does `ssl_session_cache` do?

---

## Cheat Sheet

```nginx
# Reverse proxy
server {
    listen 443 ssl http2;
    server_name myapp.com;
    ssl_certificate /etc/letsencrypt/live/myapp.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/myapp.com/privkey.pem;

    # Security
    server_tokens off;
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;

    # Rate limit
    limit_req zone=api burst=20 nodelay;

    location / {
        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade    $http_upgrade;
        proxy_set_header   Connection "upgrade";
        proxy_set_header   Host       $host;
        proxy_set_header   X-Real-IP  $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
    }

    location /static/ {
        alias /opt/app/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}

server { listen 80; return 301 https://$host$request_uri; }
```

```bash
nginx -t              # test config
nginx -s reload       # reload without downtime
nginx -s stop         # fast shutdown
systemctl reload nginx
certbot --nginx -d myapp.com
tail -f /var/log/nginx/error.log
```
