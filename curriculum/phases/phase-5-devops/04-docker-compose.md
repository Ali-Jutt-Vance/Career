# Phase 5 — Chapter 4: Docker Compose

---

## Chapter Overview

Docker Compose orchestrates multiple containers as a single application stack. It's the standard tool for local development environments and simple production deployments, replacing the need to run multiple `docker run` commands manually.

**Topics:**
- `compose.yml` syntax
- Services, networks, volumes
- Environment variables and secrets
- Health checks and dependencies
- Profiles for dev/prod
- Override files

---

## Basic Examples

### Full Application Stack

```yaml
# compose.yml (or docker-compose.yml)
# docker compose up -d        ← start all services in background
# docker compose down -v      ← stop and remove volumes
# docker compose logs -f app  ← follow app logs

name: myapp

services:
  # ─── Application ────────────────────────────────────────
  app:
    build:
      context: .
      dockerfile: Dockerfile
      target: production
      cache_from:
        - myapp:latest
    image: myapp:latest
    container_name: myapp-app
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
    env_file:
      - .env.production
    depends_on:
      postgres:
        condition: service_healthy  # wait until postgres passes health check
      redis:
        condition: service_healthy
    networks:
      - backend
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: "1"
    healthcheck:
      test:  ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout:  5s
      retries:  3
      start_period: 15s

  # ─── PostgreSQL ──────────────────────────────────────────
  postgres:
    image: postgres:16-alpine
    container_name: myapp-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB:       myapp
      POSTGRES_USER:     myapp_user
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}  # from .env
    volumes:
      - postgres-data:/var/lib/postgresql/data
      - ./db/init:/docker-entrypoint-initdb.d:ro  # init SQL scripts
    networks:
      - backend
    healthcheck:
      test:     ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-myapp_user} -d ${POSTGRES_DB:-myapp}"]
      interval: 10s
      timeout:  5s
      retries:  5

  # ─── Redis ───────────────────────────────────────────────
  redis:
    image: redis:7-alpine
    container_name: myapp-redis
    restart: unless-stopped
    command: >
      redis-server
        --requirepass ${REDIS_PASSWORD}
        --maxmemory 256mb
        --maxmemory-policy allkeys-lru
        --save 60 1
        --appendonly yes
    volumes:
      - redis-data:/data
    networks:
      - backend
    healthcheck:
      test:     ["CMD", "redis-cli", "--no-auth-warning", "-a", "${REDIS_PASSWORD}", "ping"]
      interval: 10s
      timeout:  3s
      retries:  3

  # ─── Nginx (reverse proxy) ───────────────────────────────
  nginx:
    image: nginx:1.27-alpine
    container_name: myapp-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/conf.d:/etc/nginx/conf.d:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
      - nginx-logs:/var/log/nginx
    depends_on:
      app:
        condition: service_healthy
    networks:
      - frontend
      - backend

  # ─── Worker (background job processor) ──────────────────
  worker:
    build:
      context: .
      target:  production
    image: myapp:latest
    container_name: myapp-worker
    restart: unless-stopped
    command: ["node", "dist/worker.js"]
    environment:
      NODE_ENV: production
    env_file:
      - .env.production
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - backend
    deploy:
      resources:
        limits:
          memory: 256M

# ─── Networks ────────────────────────────────────────────
networks:
  frontend:  # nginx faces internet
  backend:   # internal services only

# ─── Volumes ─────────────────────────────────────────────
volumes:
  postgres-data:
  redis-data:
  nginx-logs:
```

---

## Intermediate Concepts

### Override Files for Dev vs. Prod

```yaml
# compose.override.yml (development — auto-loaded with compose.yml)
# docker compose up  ← loads compose.yml + compose.override.yml

services:
  app:
    build:
      target: development  # use dev stage of Dockerfile
    command: ["npm", "run", "dev"]  # override CMD for hot reload
    volumes:
      - .:/app                      # bind mount source for live reload
      - /app/node_modules           # don't override node_modules with host
    ports:
      - "9229:9229"                 # Node.js debugger port
    environment:
      NODE_ENV: development
      LOG_LEVEL: debug

  postgres:
    ports:
      - "5432:5432"                 # expose to host for DB tools (Postico, etc.)

  redis:
    ports:
      - "6379:6379"                 # expose to host for Redis Insight

  mailhog:                          # email testing (dev only)
    image: mailhog/mailhog
    ports:
      - "1025:1025"  # SMTP
      - "8025:8025"  # Web UI

# Use specific override:
# docker compose -f compose.yml -f compose.prod.yml up -d
```

```yaml
# compose.prod.yml — production-specific overrides
services:
  app:
    image: ${IMAGE_TAG}  # use pre-built image from registry, not local build
    deploy:
      replicas: 2
    logging:
      driver:  "json-file"
      options:
        max-size: "100m"
        max-file: "5"
```

### Profiles

```yaml
# compose.yml with profiles
services:
  app:
    build: .
    profiles: [""]  # always-on (no profile)

  postgres:
    image: postgres:16-alpine
    profiles: [""]  # always-on

  # Only started when "tools" profile is active
  adminer:
    image: adminer
    ports: ["8080:8080"]
    profiles: ["tools"]

  pgbackup:
    image: prodrigestivill/postgres-backup-local
    profiles: ["backup"]

# docker compose --profile tools up       ← start app + postgres + adminer
# docker compose --profile backup run pgbackup  ← run one-off backup
```

### Docker Compose CLI

```bash
# Start / stop
docker compose up -d                 # start all, detached
docker compose up -d app             # start specific service
docker compose down                  # stop and remove containers
docker compose down -v               # also remove volumes
docker compose down --remove-orphans # remove containers for removed services

# Scaling
docker compose up -d --scale worker=3  # run 3 worker replicas

# Restart
docker compose restart app

# Logs
docker compose logs                  # all services
docker compose logs app -f           # follow app logs
docker compose logs -f -n 50         # last 50 lines, all services

# Exec / run
docker compose exec app bash         # exec in running container
docker compose run --rm app npm run migrate  # one-off command

# Build
docker compose build                 # build all images
docker compose build app --no-cache  # rebuild without cache
docker compose pull                  # pull latest images from registry

# Status
docker compose ps                    # running services
docker compose ps -a                 # all (including stopped)
docker compose top                   # processes per service

# Config
docker compose config                # resolved config (with env vars substituted)
docker compose config --quiet        # validate without output
```

---

## Interview Preparation

**Q1: What is the difference between `depends_on` with `condition: service_healthy` and just `depends_on`?**
A: Basic `depends_on: [postgres]` only waits for the postgres container to start (be running) — not for postgres to actually be ready to accept connections. Starting a postgres container doesn't mean the database server is initialized and listening. Using `condition: service_healthy` makes Docker Compose wait until the postgres container's health check passes — meaning `pg_isready` returns success. Without this, your app may crash on startup because it tries to connect to postgres before postgres is ready. Always use `service_healthy` for databases and cache services.

**Q2: What is the purpose of using named volumes vs. bind mounts?**
A: Named volumes (`postgres-data:/var/lib/postgresql/data`) are managed by Docker — Docker creates and manages the storage location, handles permissions correctly, and the volume persists across `docker compose down` (but not `docker compose down -v`). They work well on all platforms including Windows/macOS. Bind mounts (`./src:/app/src`) map a specific host path into the container — useful for development (live code reload), but have permissions issues across platforms and can expose host filesystem. Use named volumes for databases and persistent data. Use bind mounts for development hot-reload.

**Q3: How do you handle secrets in Docker Compose without putting them in `compose.yml`?**
A: Multiple approaches, from least to most secure. `.env` file: create `.env` in the same directory as `compose.yml`, Compose auto-loads it. Add `.env` to `.gitignore`. Variables are accessed as `${VAR_NAME}` in `compose.yml`. This is fine for local dev. `env_file`: reference a secrets file per service — `env_file: [.env.production]`. More controlled than `.env`. Docker secrets (`secrets:` key in compose.yml): proper secrets management, stored encrypted, mounted as files in `/run/secrets/`. Best for Swarm production. External secret managers (AWS Secrets Manager, Vault): fetch secrets at container startup via entrypoint script. For local development, `.env` is standard; for production, use Docker secrets or a secrets manager.

---

## Practical Tasks

### Beginner (10 Tasks)
1. Write a `compose.yml` for a Node.js app + PostgreSQL.
2. Start the stack with `docker compose up -d`.
3. View logs of the app service.
4. Use `docker compose exec` to run a migration inside the app container.
5. Stop all services and remove containers with `docker compose down`.
6. Add an environment variable from `.env` file.
7. Add a volume for PostgreSQL data persistence.
8. Add Redis to the stack.
9. Add a `depends_on` with `service_healthy` for the database.
10. Write a HEALTHCHECK for the app service.

### Intermediate (10 Tasks)
1. Create `compose.override.yml` for development (live code reload, debug port).
2. Create `compose.prod.yml` for production (pre-built image, no bind mounts).
3. Add Nginx as a reverse proxy in front of the app.
4. Use profiles to run `adminer` only in development.
5. Scale the worker service to 3 replicas.
6. Add pgAdmin to the dev profile.
7. Implement resource limits (memory, CPUs) per service.
8. Add MailHog for local email testing.
9. Use `docker compose config` to validate the merged config.
10. Implement log rotation with `max-size` and `max-file`.

### Advanced (10 Tasks)
1. Build a complete dev environment: app, db, cache, email, queue UI, monitoring.
2. Implement zero-downtime update with blue-green using Compose.
3. Set up Traefik as reverse proxy with automatic SSL.
4. Implement Docker Compose for a microservices app (5+ services).
5. Use `docker compose run` for CI test execution.
6. Implement custom networks: DMZ + backend isolation.
7. Build a monitoring stack: app + Prometheus + Grafana in Compose.
8. Add Vault for secrets management in Compose.
9. Implement health-check-based orchestration with startup order.
10. Set up Compose in production with Watchtower for auto-updates.

---

## Self Assessment
1. What does `docker compose up -d` do?
2. What is the difference between `volumes` at service level and top-level `volumes`?
3. What is an override file?
4. What is `depends_on` with `condition: service_healthy`?
5. What does `env_file` do?
6. What is the difference between `docker compose run` and `docker compose exec`?
7. What does `docker compose down -v` do differently?
8. What are profiles used for?
9. How do you pass environment variables without exposing them in compose.yml?
10. What is `--scale` used for?

---

## Cheat Sheet

```yaml
# compose.yml skeleton
name: myapp

services:
  app:
    build: .
    ports: ["3000:3000"]
    environment:
      NODE_ENV: production
    env_file: [.env]
    depends_on:
      postgres: { condition: service_healthy }
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s; timeout: 5s; retries: 3

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: myapp
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASS}
    volumes: [postgres-data:/var/lib/postgresql/data]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"]
      interval: 10s; retries: 5

volumes:
  postgres-data:

networks:
  default:
```

```bash
docker compose up -d                          # start all
docker compose up -d --scale worker=3        # with scaling
docker compose down -v                       # stop + remove volumes
docker compose logs app -f                   # follow logs
docker compose exec app bash                 # shell in container
docker compose run --rm app npm run migrate  # one-off command
docker compose build --no-cache              # rebuild images
docker compose pull                          # pull latest images
docker compose -f compose.yml -f compose.prod.yml up -d  # with override
docker compose --profile tools up            # with profile
```
