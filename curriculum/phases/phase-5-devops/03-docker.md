# Phase 5 — Chapter 3: Docker

---

## Chapter Overview

Docker containerizes applications — packaging code, runtime, libraries, and config into a portable, reproducible unit. Every backend and cloud engineer must be proficient with Docker for local development, CI/CD, and production deployment.

**Core topics:**
- Images vs. containers
- Dockerfile best practices
- Multi-stage builds
- Docker networking
- Volumes and data persistence
- Docker CLI commands
- Image optimization and security

---

## Beginner Theory

### Mental Model

```
Image:     Read-only template — like a class
Container: Running instance of an image — like an object
Layer:     Each Dockerfile instruction adds a read-only layer (union filesystem)
Registry:  Repository of images (Docker Hub, AWS ECR, GitHub Container Registry)

How it works:
  Docker Engine → containerd → runc → Linux namespaces + cgroups
  Namespaces:  isolate PID, network, filesystem, user, IPC
  cgroups:     limit CPU, memory, I/O
  Result:      process thinks it's in its own OS (like a lightweight VM)
```

---

## Basic Examples

### Dockerfile

```dockerfile
# ============================================================
# Production-ready Node.js Dockerfile
# ============================================================

# Stage 1: Build
FROM node:22-alpine AS builder

# Install only what's needed for building
WORKDIR /build

# Copy lockfile first — Docker layer caching
# If only source code changed, npm ci won't re-run (deps didn't change)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# Stage 2: Production runtime (smaller, no dev tools)
FROM node:22-alpine AS production

# Security: create non-root user
RUN addgroup -S app && adduser -S -G app app

WORKDIR /app

# Install only production deps
COPY package.json package-lock.json ./
RUN npm ci --production && npm cache clean --force

# Copy compiled output from builder
COPY --from=builder /build/dist ./dist

# Copy other needed files
COPY --chown=app:app . .

# Security: drop to non-root user
USER app

# Document the port (doesn't actually expose it)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', r => process.exit(r.statusCode === 200 ? 0 : 1))"

# Use array form (avoids shell signal handling issues)
CMD ["node", "dist/server.js"]
```

### .dockerignore

```
# .dockerignore — prevents copying unnecessary files into image
node_modules/
.git/
.env*
*.test.ts
*.spec.ts
coverage/
dist/
.next/
*.log
.DS_Store
Dockerfile*
docker-compose*.yml
README.md
```

### Docker CLI

```bash
# Build image
docker build -t myapp:1.0.0 .
docker build -t myapp:latest -f Dockerfile.prod .
docker build --no-cache -t myapp:latest .  # force rebuild all layers
docker build --platform linux/amd64 -t myapp:latest .  # cross-platform

# Run container
docker run myapp:latest
docker run -d myapp:latest                          # detached (background)
docker run -d -p 3000:3000 myapp:latest             # port mapping host:container
docker run -d -p 3000:3000 --name myapp myapp:latest  # named container
docker run -d \
  -p 3000:3000 \
  --name myapp \
  -e NODE_ENV=production \
  -e DATABASE_URL=postgresql://... \
  --env-file .env.production \
  -v /opt/myapp/logs:/app/logs \
  --restart unless-stopped \
  --memory 512m \
  --cpus 1 \
  myapp:latest

# Container management
docker ps                    # running containers
docker ps -a                 # all containers (including stopped)
docker stop myapp            # graceful stop (SIGTERM → SIGKILL after 10s)
docker kill myapp            # SIGKILL immediately
docker rm myapp              # remove stopped container
docker rm -f myapp           # force remove running container

# Logs
docker logs myapp            # all logs
docker logs myapp -f         # follow live
docker logs myapp -n 100     # last 100 lines
docker logs myapp --since 1h # last hour

# Execute command in running container
docker exec -it myapp bash   # interactive shell
docker exec myapp node -e "require('./dist/health').check()"

# Image management
docker images                # list images
docker rmi myapp:old         # remove image
docker image prune           # remove unused images
docker system prune -af      # remove everything unused (careful!)

# Registry
docker tag myapp:latest 123456789.dkr.ecr.us-east-1.amazonaws.com/myapp:latest
docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/myapp:latest
docker pull 123456789.dkr.ecr.us-east-1.amazonaws.com/myapp:latest

# Inspect
docker inspect myapp        # detailed container info (JSON)
docker stats                # live resource usage (CPU/memory)
docker top myapp            # processes inside container
```

---

## Intermediate Concepts

### Multi-Stage Build Deep Dive

```dockerfile
# Python FastAPI example
FROM python:3.12-slim AS base

# System deps only needed for building
FROM base AS builder
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc g++ libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python deps into /venv
RUN python -m venv /venv
ENV PATH="/venv/bin:$PATH"
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Production image — no build tools, no gcc
FROM base AS production
COPY --from=builder /venv /venv
ENV PATH="/venv/bin:$PATH"

RUN groupadd -r app && useradd -r -g app app
WORKDIR /app
COPY --chown=app:app . .
USER app

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]

# Result: builder image ~800MB, production image ~150MB
```

### Networking

```bash
# Docker networking
# Default: bridge network — containers share bridge, isolated from host

# Create custom network
docker network create myapp-network
docker network create --driver bridge --subnet 172.20.0.0/16 myapp-network

# Connect containers on same network (can use container name as hostname)
docker run -d --network myapp-network --name postgres postgres:16
docker run -d --network myapp-network --name myapp -e DB_HOST=postgres myapp:latest
# myapp can reach postgres via "postgres" hostname

# List networks
docker network ls
docker network inspect myapp-network
```

### Volumes

```bash
# Named volume (Docker manages location — preferred)
docker volume create myapp-data
docker run -v myapp-data:/app/data myapp:latest

# Bind mount (host path — for dev, not production)
docker run -v $(pwd)/src:/app/src myapp:latest  # live code reload in dev

# Read-only bind mount
docker run -v $(pwd)/config:/app/config:ro myapp:latest

# tmpfs (in-memory, not persisted)
docker run --tmpfs /tmp myapp:latest

# List volumes
docker volume ls
docker volume inspect myapp-data

# Backup volume
docker run --rm -v myapp-data:/data -v $(pwd):/backup alpine \
  tar czf /backup/data-backup.tar.gz -C /data .
```

---

## Advanced Concepts

### BuildKit and Cache

```dockerfile
# Enable BuildKit (default in Docker 23+)
# DOCKER_BUILDKIT=1 docker build .

# Mount cache for package managers (don't invalidate on source change)
FROM node:22-alpine

RUN --mount=type=cache,target=/root/.npm \
    npm ci  # uses cached npm registry cache

RUN --mount=type=cache,target=/root/.cache/pip \
    pip install -r requirements.txt

# Pass secrets at build time without baking into image
RUN --mount=type=secret,id=github_token \
    GITHUB_TOKEN=$(cat /run/secrets/github_token) npm install

# Build with secret
# docker build --secret id=github_token,src=~/.github_token .

# ARG — build-time variables
ARG NODE_ENV=production
ARG APP_VERSION=unknown
ENV NODE_ENV=$NODE_ENV
LABEL version="$APP_VERSION"
```

---

## Security

```dockerfile
# 1. Use specific version tags (never "latest" in production)
FROM node:22.4.0-alpine3.20 AS production  # not :latest or :22

# 2. Run as non-root user
RUN adduser -D -u 1001 app
USER 1001

# 3. Read-only root filesystem
docker run --read-only myapp:latest

# 4. Drop capabilities
docker run --cap-drop ALL --cap-add NET_BIND_SERVICE myapp:latest

# 5. No privilege escalation
docker run --security-opt no-new-privileges myapp:latest

# 6. Scan for vulnerabilities
docker scout quickview myapp:latest
trivy image myapp:latest

# 7. Never copy .env files into image
# Use --env-file flag at runtime or secrets management

# 8. Minimize attack surface
FROM scratch  # empty base for Go static binaries
FROM distroless/nodejs  # no shell, no package manager
```

---

## Interview Preparation

**Q1: What is the difference between a Docker image and a container?**
A: An image is a read-only, layered template built from a Dockerfile. It contains the filesystem, code, runtime, libraries, and configuration. Images are stored in registries and are immutable. A container is a running instance of an image — it's a process (or group of processes) with an isolated namespace, its own network interface, filesystem (image layers + writable layer on top), and cgroup resource limits. Multiple containers can run from the same image. When a container stops, the writable layer is discarded (unless volumes are used). Analogy: image = class, container = instance.

**Q2: How does Docker layer caching work and how do you optimize it?**
A: Each Dockerfile instruction creates a layer. Layers are cached — if a layer's inputs haven't changed, Docker reuses the cached layer instead of re-running the instruction. Key insight: layers are invalidated in order — if layer N changes, all layers after N are invalidated. Optimization: put frequently-changing instructions last. Pattern: `COPY package*.json ./` + `RUN npm ci` BEFORE `COPY . .` — this way, changing source code doesn't invalidate the expensive npm install layer (only rebuilds if package.json changes). Use `.dockerignore` to exclude files that would invalidate the `COPY . .` layer unnecessarily.

**Q3: What is a multi-stage build and when should you use it?**
A: Multi-stage builds use multiple `FROM` instructions in one Dockerfile, each creating a separate image. You can selectively `COPY --from=stagename` files between stages. Use case: build your app in a full image with all compilers/tools, then copy only the compiled output into a minimal runtime image. Result: the final production image has no build tools, reducing attack surface and image size dramatically. Example: Node.js TypeScript — build stage compiles TS to JS, production stage only has the compiled JS and production node_modules. Final image is 150MB instead of 800MB.

---

## Practical Tasks

### Beginner (10 Tasks)
1. Write a Dockerfile for a Node.js Express app.
2. Build and tag the image.
3. Run the container with port mapping.
4. Pass environment variables with `--env-file`.
5. View container logs with `docker logs -f`.
6. Execute bash in a running container.
7. Use a volume to persist data between container restarts.
8. Push an image to Docker Hub.
9. Write a `.dockerignore` file.
10. Stop, remove a container, and remove its image.

### Intermediate (10 Tasks)
1. Write a multi-stage Dockerfile — builder + production stages.
2. Optimize Dockerfile layer caching order.
3. Add a HEALTHCHECK instruction.
4. Create a custom Docker network and connect two containers.
5. Use Docker BuildKit cache mount for npm.
6. Run a container as non-root user.
7. Implement read-only root filesystem for security.
8. Build a cross-platform image with `--platform linux/amd64`.
9. Scan the image with Trivy for vulnerabilities.
10. Set memory and CPU limits with `--memory` and `--cpus`.

### Advanced (10 Tasks)
1. Build a minimal distroless image for a Go binary.
2. Implement Docker build with secrets (no secrets in layers).
3. Set up Docker Registry (self-hosted) with ECR lifecycle policies.
4. Build and push a multi-arch image (amd64 + arm64) with buildx.
5. Implement Docker layer caching in GitHub Actions CI.
6. Write a Docker image scan gate in CI (fail if critical CVEs).
7. Implement blue-green deployment with Docker (swap containers).
8. Debug a container with `docker exec` + memory/CPU issues.
9. Implement init process with `tini` for correct signal handling.
10. Achieve < 50MB production image for a Node.js app.

---

## Self Assessment
1. What is the difference between `CMD` and `ENTRYPOINT`?
2. What is a layer in Docker?
3. What does `COPY --from=builder` do?
4. What is `.dockerignore` used for?
5. What is the difference between `-v` bind mount and named volume?
6. What is `docker system prune` dangerous for?
7. What does `--restart unless-stopped` do?
8. Why run as non-root in containers?
9. What is `EXPOSE` used for?
10. What is Docker BuildKit?

---

## Cheat Sheet

```dockerfile
FROM node:22-alpine AS builder
WORKDIR /build
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine AS production
RUN adduser -D -u 1001 app
WORKDIR /app
COPY package*.json ./
RUN npm ci --production && npm cache clean --force
COPY --from=builder /build/dist ./dist
USER 1001
EXPOSE 3000
HEALTHCHECK --interval=30s CMD curl -f http://localhost:3000/health || exit 1
CMD ["node", "dist/server.js"]
```

```bash
docker build -t app:1.0.0 .
docker run -d -p 3000:3000 --name app --env-file .env --restart unless-stopped app:1.0.0
docker logs app -f
docker exec -it app sh
docker stats app
docker ps; docker stop app; docker rm app; docker rmi app:1.0.0
docker volume create data; docker run -v data:/app/data app:1.0.0
docker network create net; docker run --network net --name db postgres:16
docker image prune -af; docker system prune -af
```
