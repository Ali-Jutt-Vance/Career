# Docker

> [!GOALS]
> - Explain what containers are, how they differ from virtual machines, and why they became the standard way to ship software.
> - Understand **images**, **layers**, **containers** and **registries**.
> - Write good **Dockerfiles**: small base images, layer caching, `.dockerignore`, non-root users, multi-stage builds.
> - Run, inspect, debug and stop containers; pass configuration through environment variables.
> - Persist data with **volumes** and connect containers with **networks**.
> - Apply container security and production practices: minimal images, pinned versions, scanning, signals and health checks.

## Why this matters

"It works on my machine" used to be the most common sentence in software. An application that ran perfectly on a developer's laptop failed on the server because of a different Node.js version, a missing system library, a different operating system or an environment variable nobody wrote down. Setting up a new developer's machine took days; deployments were fragile manual procedures.

**Containers** solve this by packaging an application **with everything it needs** — its runtime, libraries, system tools and configuration defaults — into an **image** that runs the same way on a laptop, in CI and in production. Docker made containers easy to build and run, and today they are the standard unit of deployment: Kubernetes ({{ch:eks}}), AWS ECS ({{ch:ecs}}), Google Cloud Run, Azure Container Apps, CI runners and local development environments ({{ch:docker-compose}}) all run container images.

As a back-end engineer, you will write Dockerfiles, build and debug images, run databases and services locally in containers, and troubleshoot containers in production. This chapter covers the concepts and the practices that make images small, fast to build, secure and reliable. Every command shown was run with Docker on a real machine, and the outputs are what it printed.

## The simple idea

Think of shipping containers. Before them, every cargo was loaded differently — sacks, barrels, crates — and every port needed different equipment. Standard containers changed everything: whatever is inside, the box has the same shape, so any ship, crane or lorry can carry it.

A software container is the same idea. Whatever is inside — a Node.js API, a Python worker, a PostgreSQL database — the container presents a standard shape: an image you can store, copy and start anywhere a container runtime exists.

> [!ANALOGY]
> A container is like a standard shipping container: whatever is packed inside, it has the same shape outside, so any ship, crane or lorry (laptop, CI server, cloud platform) can carry and run it.
>
> **Where the analogy breaks:** a shipping container is sealed and completely independent of the ship. Software containers **share the host machine's operating-system kernel** — they are isolated processes, not separate machines. That makes them light and fast to start, but it also means isolation is weaker than a virtual machine's, and a Linux container needs a Linux kernel (Docker Desktop runs a small Linux virtual machine for this on Windows and macOS).

## The proper definition and key words

A **container** is a process (or group of processes) running in isolation on a host, with its own view of the file system, network and process list, created from an **image** — a read-only, layered package of files and metadata.

Key words:

- **Image** — the packaged application: file system layers plus metadata (command, environment, ports).
- **Layer** — one set of file-system changes in an image, created by one Dockerfile instruction; layers are cached and shared.
- **Container** — a running (or stopped) instance of an image, with a thin writable layer on top.
- **Dockerfile** — the recipe that builds an image.
- **Registry** — a server storing images (Docker Hub, GitHub Container Registry, Amazon ECR).
- **Tag** — a name for an image version: `node:22-alpine`, `cornershop/api:1.4.2`.
- **Digest** — an image's content hash (`sha256:…`), an immutable identifier.
- **Volume** — storage managed by Docker that outlives containers.
- **Bind mount** — a host directory mounted into a container.
- **Port publishing** — mapping a host port to a container port (`-p 8080:3000`).
- **Namespaces and cgroups** — the Linux kernel features that isolate containers (what they can see) and limit their resources (CPU, memory).

## Containers and virtual machines

### Level 1 — What actually isolates a container

```text
   Virtual machines                         Containers
 ┌─────────┐ ┌─────────┐               ┌─────────┐ ┌─────────┐
 │ App A   │ │ App B   │               │ App A   │ │ App B   │
 │ libs    │ │ libs    │               │ libs    │ │ libs    │
 │ guest OS│ │ guest OS│               └────┬────┘ └────┬────┘
 └────┬────┘ └────┬────┘                    │ isolated processes
 ┌────┴───────────┴────┐               ┌────┴───────────┴────┐
 │     hypervisor       │               │  container runtime  │
 ├──────────────────────┤               ├─────────────────────┤
 │ host OS / hardware   │               │ host OS kernel       │
 └──────────────────────┘               └─────────────────────┘
```

A **virtual machine** emulates hardware and runs a whole guest operating system — strong isolation, but gigabytes of memory and seconds to minutes to start. A **container** is an ordinary process that the Linux kernel isolates with **namespaces** (its own process IDs, network interfaces, mount points, host name) and limits with **cgroups** (CPU, memory). It starts in milliseconds and uses only what the application needs. In the cloud, containers usually run **inside** virtual machines — combining both.

### Level 1 — First container

```bash
docker run --rm alpine:3.21 sh -c 'cat /etc/os-release | grep PRETTY_NAME; echo "running as $(whoami)"; ps | wc -l'
```

**Output:**

```text
PRETTY_NAME="Alpine Linux v3.21"
running as root
4
```

- `docker run` downloads the `alpine:3.21` image if needed, creates a container, runs the command and (with `--rm`) deletes the container afterwards.
- Inside, it is a tiny Alpine Linux system — whatever the host runs.
- The container runs as `root` by default — something to change in your own images, as the next sections show.
- It sees only its own processes: the `ps` listing has four lines (the header, the shell, `ps` and `wc`), not the hundreds of processes on the host. It also has its own host name, a random container ID.

## Building images

### Level 2 — A Dockerfile for a Node.js API

Create a tiny API:

```bash
mkdir -p shop-api && cd shop-api
cat > package.json <<'EOF'
{ "name": "shop-api", "version": "1.0.0", "type": "module", "scripts": { "start": "node server.js" } }
EOF
cat > server.js <<'EOF'
import { createServer } from "node:http";
const port = Number(process.env.PORT ?? 3000);
const server = createServer((req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify({ service: "shop-api", path: req.url, env: process.env.APP_ENV ?? "unset" }));
});
server.listen(port, "0.0.0.0", () => console.log(`listening on ${port}`));
process.on("SIGTERM", () => { console.log("SIGTERM received, closing"); server.close(() => process.exit(0)); });
EOF
cat > .dockerignore <<'EOF'
node_modules
.git
.env
*.log
EOF
cat > Dockerfile <<'EOF'
FROM node:22-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY server.js ./
ENV NODE_ENV=production PORT=3000
EXPOSE 3000
USER node
CMD ["node", "server.js"]
EOF
docker build -q -t shop-api:1.0.0 . > /dev/null && echo "built shop-api:1.0.0"
```

**Output:**

```text
built shop-api:1.0.0
```

Each instruction:

- **`FROM node:22-alpine`** — start from an official image with Node.js 22 on Alpine Linux. Pin a version (never just `latest`), so builds are reproducible.
- **`WORKDIR /app`** — the working directory inside the image.
- **`COPY package.json ./` then `RUN npm install`** — dependencies first, **before** the source code. Docker caches each layer; as long as `package.json` does not change, rebuilding after a code change reuses the cached `npm install` layer — seconds instead of minutes. (Real projects copy `package-lock.json` too and use `npm ci`.)
- **`COPY server.js ./`** — the application code, in a later layer that changes often.
- **`ENV`** sets default environment variables; **`EXPOSE`** documents the port.
- **`USER node`** — run as the unprivileged `node` user the image provides, not root ({{ch:linux}}).
- **`CMD ["node", "server.js"]`** — the command to run, in **exec form** (a JSON array), so Node.js is process 1 and receives signals directly. (A shell form such as `CMD node server.js` wraps it in a shell that may not forward `SIGTERM`.)
- **`.dockerignore`** keeps `node_modules`, `.git`, secrets in `.env` and logs out of the **build context** — smaller, faster, safer builds.

### Level 2 — Running and inspecting the container

```bash
docker rm -f shop-api >/dev/null 2>&1 || true
docker run -d --name shop-api -p 127.0.0.1:18080:3000 -e APP_ENV=staging shop-api:1.0.0 > /dev/null
sleep 1
curl -s http://127.0.0.1:18080/products
echo
docker ps --filter name=shop-api --format '{{.Names}}  {{.Image}}  {{.Ports}}'
docker exec shop-api whoami
docker logs shop-api
```

**Output:**

```text
{"service":"shop-api","path":"/products","env":"staging"}
shop-api  shop-api:1.0.0  127.0.0.1:18080->3000/tcp
node
listening on 3000
```

- **`-d`** runs in the background; **`--name`** gives a fixed name; **`-p 127.0.0.1:18080:3000`** publishes container port 3000 on the host's port 18080 (bound to localhost only); **`-e`** sets an environment variable — the twelve-factor way to configure the same image differently per environment ({{ch:nodejs}}).
- The application listens on `0.0.0.0` **inside** the container; listening on `127.0.0.1` would make it unreachable through the published port ({{ch:networking}}).
- **`docker exec`** runs another command inside the running container — here confirming it runs as `node`, not root. `docker exec -it shop-api sh` opens a shell for debugging.
- **`docker logs`** shows what the process wrote to stdout and stderr. Containers should log to stdout; the platform collects it ({{ch:logging}}).

Stopping sends `SIGTERM`, then `SIGKILL` after a grace period (10 seconds by default):

```bash
docker stop shop-api > /dev/null
docker logs shop-api
docker inspect shop-api --format 'exit code: {{.State.ExitCode}}'
docker rm shop-api > /dev/null
```

**Output:**

```text
listening on 3000
SIGTERM received, closing
exit code: 0
```

The server received `SIGTERM`, closed its listener and exited with code 0 — a **graceful shutdown**. Every deployment, scale-down and restart in an orchestrator does exactly this, so handling `SIGTERM` matters ({{ch:queues}}).

### Level 3 — Multi-stage builds

Compiled TypeScript needs the compiler and dev dependencies to **build**, but not to **run**. A **multi-stage** Dockerfile builds in one stage and copies only the results into a small final image:

```bash
mkdir -p ts-api/src && cd ts-api
cat > package.json <<'EOF'
{ "name": "ts-api", "type": "module", "scripts": { "build": "tsc" }, "devDependencies": { "typescript": "5.9.3", "@types/node": "22.10.2" } }
EOF
cat > tsconfig.json <<'EOF'
{ "compilerOptions": { "target": "ES2023", "module": "NodeNext", "outDir": "dist", "strict": true } }
EOF
cat > src/server.ts <<'EOF'
import { createServer } from "node:http";
createServer((_req, res) => res.end("ok")).listen(3000, "0.0.0.0");
EOF
cat > Dockerfile.single <<'EOF'
FROM node:22-alpine
WORKDIR /app
COPY . .
RUN npm install && npm run build
CMD ["node", "dist/server.js"]
EOF
cat > Dockerfile <<'EOF'
# --- build stage: has the compiler and dev dependencies ---
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json ./
RUN npm install
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# --- runtime stage: only what is needed to run ---
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/dist ./dist
USER node
CMD ["node", "dist/server.js"]
EOF
docker build -q -f Dockerfile.single -t ts-api:single . > /dev/null
docker build -q -t ts-api:multi . > /dev/null
for tag in single multi; do
  printf '%-7s typescript in image: ' "$tag"
  docker run --rm ts-api:$tag sh -c 'test -d node_modules/typescript && echo yes || echo no'
done
single=$(docker image inspect ts-api:single --format '{{.Size}}')
multi=$(docker image inspect ts-api:multi --format '{{.Size}}')
echo "multi-stage image is smaller by about $(( (single - multi) / 1000000 )) MB"
cd ..
```

**Output:**

```text
single  typescript in image: yes
multi   typescript in image: no
multi-stage image is smaller by about 14 MB
```

- The **build stage** installs everything and compiles TypeScript; the **runtime stage** starts fresh and copies only `dist/` (`COPY --from=build`).
- The final image contains no compiler, no dev dependencies and no source — smaller to store and pull, faster to start, and with less software that could contain vulnerabilities. (A real service would also install production dependencies in the runtime stage with `npm ci --omit=dev`.)
- Multi-stage builds work for every compiled language: Go and Rust programs can end up in images containing almost nothing but the binary (`FROM scratch` or "distroless" bases).

### Level 3 — Layers and caching

Each instruction creates a layer, and Docker reuses a cached layer when the instruction and its inputs have not changed. Once one layer changes, **every layer after it is rebuilt**. Hence the ordering rule: things that change **rarely** (base image, system packages, dependency manifests) come **first**; things that change **often** (source code) come **last**. A Dockerfile that copies all source code before `npm install` reinstalls every dependency on every code change.

Other image-size tips: choose small bases (`-alpine`, `-slim`, distroless); combine related `RUN` commands and clean package caches in the same layer (`apt-get install … && rm -rf /var/lib/apt/lists/*`); never copy secrets into layers — even deleted in a later layer, they remain in the earlier one and in the image history.

## Storage and networking

### Level 2 — Volumes: data that outlives containers

A container's writable layer disappears with the container. Databases and uploads need **volumes**:

```bash
docker volume rm -f shop-data >/dev/null 2>&1 || true
docker volume create shop-data > /dev/null
docker run --rm -v shop-data:/data alpine:3.21 sh -c 'echo "order 1042" > /data/orders.txt'
docker run --rm -v shop-data:/data alpine:3.21 cat /data/orders.txt
docker volume rm shop-data > /dev/null && echo "volume removed"
```

**Output:**

```text
order 1042
volume removed
```

The first container wrote a file into the volume and was deleted; a second container mounted the same volume and read it. Volumes are how local databases keep data between restarts (`-v pgdata:/var/lib/postgresql/data`). **Bind mounts** (`-v "$PWD/src:/app/src"`) map host directories into containers — handy in development for live code reloading. In production orchestrators, persistent storage comes from the platform (cloud disks, managed databases), and most application containers are **stateless** ({{ch:scalability}}).

### Level 2 — Networks: containers finding each other

Containers on the same user-defined **network** reach each other **by name**, through Docker's built-in DNS:

```bash
docker network rm shopnet >/dev/null 2>&1 || true
docker rm -f api >/dev/null 2>&1 || true
docker network create shopnet > /dev/null
docker run -d --name api --network shopnet -e APP_ENV=internal shop-api:1.0.0 > /dev/null
sleep 1
docker run --rm --network shopnet alpine:3.21 wget -qO- http://api:3000/health
echo
docker rm -f api > /dev/null; docker network rm shopnet > /dev/null && echo "cleaned up"
```

**Output:**

```text
{"service":"shop-api","path":"/health","env":"internal"}
cleaned up
```

The second container called `http://api:3000` — the name of the first container — without knowing its IP address and without publishing any port to the host. This is how an API reaches its database (`postgres://db:5432`) in local set-ups, and it is what Docker Compose sets up automatically ({{ch:docker-compose}}). Published ports (`-p`) are only for reaching containers **from the host or outside**.

## Production practices

### Level 3 — Images you can trust

- **Pin versions**: `node:22.11-alpine` or a digest (`node@sha256:…`), and update deliberately (automated update pull requests help).
- **Small, minimal bases**: fewer packages, fewer vulnerabilities, faster pulls.
- **Run as non-root** (`USER`), with a read-only file system where possible.
- **Scan images** for known vulnerabilities in CI (Docker Scout, Trivy, Grype, registry scanning) ({{ch:cicd}}).
- **No secrets in images**: inject configuration and secrets at runtime (environment variables from a secrets manager, mounted files) ({{ch:secrets-manager}}). Use BuildKit secret mounts for build-time credentials.
- **Tag images immutably** — with the git commit SHA or a version — rather than reusing `latest`, so every deployment is traceable and rollbacks are exact.
- **Sign and verify** images in sensitive environments (supply-chain security).

### Level 3 — Running well

- **One main process per container**, logging to stdout/stderr.
- **Handle `SIGTERM`** for graceful shutdown; use exec-form `CMD`/`ENTRYPOINT`, or a tiny init (`--init`, `tini`) to forward signals and reap child processes.
- **Health checks**: a `HEALTHCHECK` instruction, or (more commonly) the orchestrator's liveness and readiness probes calling `/health` ({{ch:monitoring}}).
- **Resource limits** (`--memory`, `--cpus`, or orchestrator settings), so one container cannot starve others; Node.js reads cgroup memory limits for its heap in recent versions.
- **Immutable containers**: never patch a running container; build a new image and replace it.

## From beginner to enterprise

**Level 1–2 — first containers.** Running images; writing a simple Dockerfile; ports, environment variables, logs, `exec`; volumes for local databases.

**Level 3 — good images.** Layer ordering for caching; `.dockerignore`; multi-stage builds; non-root users; graceful shutdown; user-defined networks; pinned base images.

**Level 4 — production images.** Minimal or distroless bases; vulnerability scanning and update automation; immutable tags; secrets at runtime; health checks and resource limits; images built in CI and pushed to a private registry.

**Level 5 — senior practice.** Build performance (remote caches, BuildKit); multi-architecture images (amd64 and arm64); supply-chain security (SBOMs, signatures, provenance); standard base images for a team.

**Level 6 — enterprises.** Platform teams providing hardened golden images, admission policies that block unscanned or unsigned images, and organisation-wide registries and retention policies.

## Real-world use cases

### Onboarding a developer in minutes

- **Before**: a page of instructions to install PostgreSQL, Redis and the right Node.js version.
- **After**: `docker compose up` starts the database, cache and API in containers with the correct versions; the API's image is the same one CI tests and production runs ({{ch:docker-compose}}).

### Shipping the API

- **Pipeline**: CI builds the multi-stage image, runs tests inside it, scans it, tags it with the commit SHA, pushes it to the registry, and the deployment platform replaces running containers with the new image, waiting for health checks ({{ch:github-actions}}).

## Common mistakes

### Beginner: `latest` tags and unpinned bases

**Consequence:** builds change without code changes. **Fix:** pinned versions or digests.

### Beginner: copying everything before installing dependencies

**Consequence:** slow builds. **Fix:** manifests first, source last.

### Beginner: no `.dockerignore`

**Consequence:** huge contexts, secrets and `node_modules` copied into images. **Fix:** a `.dockerignore`.

### Intermediate: running as root

**Fix:** `USER` with an unprivileged user.

### Intermediate: secrets baked into images

**Consequence:** anyone with the image has them. **Fix:** runtime injection; secret mounts during builds.

### Intermediate: shell-form `CMD` without signal handling

**Consequence:** containers killed after the grace period, interrupted requests. **Fix:** exec form and `SIGTERM` handling.

### Production: storing data in the container's writable layer

**Consequence:** lost on replacement. **Fix:** volumes or external storage.

### Production: never rebuilding images

**Consequence:** months-old vulnerabilities. **Fix:** regular rebuilds and automated base updates.

## Debugging and troubleshooting

- **Container exits immediately**: `docker logs <name>` shows the error; `docker run -it --entrypoint sh image` lets you look around.
- **Cannot reach the app from the host**: the app listens on `127.0.0.1` inside the container, the port is not published, or the wrong port was mapped.
- **"Permission denied" writing files**: the container runs as a non-root user — give that user ownership of the directories it writes (`COPY --chown=node:node`).
- **Builds are slow**: check layer order and the build context size (`.dockerignore`); use BuildKit caching.
- **Different behaviour on Apple Silicon or ARM servers**: architecture mismatch — build multi-arch images or specify `--platform`.
- **Disk full on the host**: old images, containers and build cache — `docker system df`, `docker system prune`.

## Security summary

- Containers **share the host kernel**: keep hosts patched; run as non-root; drop capabilities; avoid `--privileged`.
- **Minimal, pinned, scanned** images; rebuild regularly.
- **No secrets in images or layers**; inject at runtime.
- **Publish only needed ports**, bound to the right interfaces; use networks for internal traffic.
- **Trust your registries**: pull from official or verified images, use private registries, sign and verify where required.
- Treat the Docker socket (`/var/run/docker.sock`) as root access — never mount it into untrusted containers.

## How a senior engineer thinks about this

- **The image is the artifact.** Built once, tested, scanned, tagged immutably and promoted unchanged through environments.
- **Small and boring.** Minimal bases, few layers of change, no surprises.
- **Configuration at runtime.** The same image runs everywhere; environments differ only by configuration.
- **Containers are cattle.** Stateless, replaceable, gracefully stopped; data lives elsewhere.
- **Security by default.** Non-root, least privilege, scanned and regularly rebuilt.

## Exercises

### Exercise 1 — Improve the Dockerfile

**Objective:** practise Dockerfile best practices.
**The Dockerfile:** `FROM node:latest` / `COPY . /app` / `WORKDIR /app` / `RUN npm install` / `ENV DATABASE_PASSWORD=supersecret` / `CMD npm start`. List the problems and write an improved version.

<details>
<summary>Show the solution</summary>

**Problems**
1. `node:latest` — unpinned and large.
2. Copies everything before `npm install` — no dependency caching; copies `node_modules`, `.git` and `.env` without a `.dockerignore`.
3. Installs dev dependencies into the production image.
4. A **secret in the image** (`ENV DATABASE_PASSWORD`) — visible to anyone with the image.
5. Runs as root.
6. Shell-form `CMD npm start` — `npm` and the shell may not forward `SIGTERM` to Node.

**Improved**

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY src ./src
ENV NODE_ENV=production
USER node
CMD ["node", "src/server.js"]
```

Plus a `.dockerignore` (`node_modules`, `.git`, `.env`, logs), and `DATABASE_PASSWORD` supplied at runtime from a secrets manager.

</details>

### Exercise 2 — Explain the networking

**Objective:** practise container networking.
**What to do:** an API container and a PostgreSQL container are started with `docker run` without any `--network`. The API's `DATABASE_URL` is `postgres://db:5432/shop`, and it fails with "getaddrinfo ENOTFOUND db". Explain and fix.

<details>
<summary>Show the solution</summary>

Containers started without a network join Docker's default **bridge** network, which does **not** provide name resolution between containers. And unless the database container was named `db`, there is no such name anyway.

**Fix:** create a user-defined network, start both containers on it, and name the database `db`:

```bash
# fragment
docker network create shopnet
docker run -d --name db --network shopnet -e POSTGRES_PASSWORD=dev -v pgdata:/var/lib/postgresql/data postgres:18
docker run -d --name api --network shopnet -e DATABASE_URL=postgres://postgres:dev@db:5432/postgres -p 8080:3000 shop-api:1.0.0
```

Or use Docker Compose, which creates a network and service names automatically ({{ch:docker-compose}}). Note that `localhost` inside the API container means the API container itself, not the database.

</details>

### Exercise 3 — Production scenario: the slow, failing deploys

**Objective:** practise diagnosing container issues.
**The scenario:** every deployment takes 15 minutes because image builds reinstall all dependencies; during each deployment, some customers see errors; and the security team reports 140 known vulnerabilities in the production image. What do you change?

<details>
<summary>Show the solution</summary>

1. **Build time**: reorder the Dockerfile (manifests, `npm ci`, then source); add a `.dockerignore`; enable BuildKit layer caching in CI (registry or cache backends).
2. **Errors during deploys**: the app probably ignores `SIGTERM` (shell-form `CMD`, no handler) and is killed mid-request; or traffic is sent to new containers before they are ready. Use exec-form `CMD`, handle `SIGTERM` (stop accepting connections, finish in-flight requests), set a readiness check so new containers receive traffic only when ready, and allow enough grace time.
3. **Vulnerabilities**: switch to a multi-stage build with a slim or distroless runtime image containing no build tools; pin and update the base image regularly (automated pull requests); scan in CI and fail on high-severity issues; rebuild images weekly even without code changes.

</details>

## Summary

A **container** is an isolated process sharing the host's kernel — isolated by **namespaces**, limited by **cgroups** — created from an **image**: read-only **layers** plus metadata, stored in **registries** and identified by **tags** and immutable **digests**. Containers start fast and run identically on laptops, CI and production, which made them the standard unit of deployment.

A **Dockerfile** builds an image: pin the base (`FROM node:22-alpine`), set `WORKDIR`, copy dependency manifests and install **before** copying source (so the dependency layer is cached), set `ENV` defaults, switch to a non-root `USER`, and use an exec-form `CMD` so the process receives signals. A `.dockerignore` keeps unwanted and secret files out. **Multi-stage builds** compile in one stage and copy only the results into a minimal runtime image. `docker run` with `-d`, `--name`, `-p`, `-e` starts containers; `docker logs`, `exec`, `inspect` and `stop` operate them; handling `SIGTERM` gives graceful shutdowns.

**Volumes** persist data beyond containers; **bind mounts** share host directories in development; **user-defined networks** let containers reach each other by name. In production: pinned, minimal, scanned, regularly rebuilt images with immutable tags; secrets injected at runtime; one process per container logging to stdout; health checks and resource limits; and stateless, replaceable containers.

## Key terms

- **Container** — An isolated process running from an image, sharing the host's kernel.
- **Virtual machine** — An emulated computer running its own operating system on a hypervisor.
- **Namespaces** — Kernel features giving containers their own view of processes, network and file system.
- **cgroups** — Kernel features limiting the resources a group of processes can use.
- **Image** — A read-only, layered package from which containers are created.
- **Layer** — A set of file-system changes in an image, created by one build instruction.
- **Dockerfile** — The text recipe Docker uses to build an image.
- **Build context** — The files sent to Docker when building an image.
- **.dockerignore** — A file listing paths excluded from the build context.
- **Base image** — The image a Dockerfile starts from with `FROM`.
- **Tag** — A human-readable name for an image version.
- **Digest** — An image's immutable content hash.
- **Registry** — A service storing and distributing images.
- **Layer cache** — Reuse of unchanged layers to speed up builds.
- **Multi-stage build** — A Dockerfile with several stages, copying only needed results into the final image.
- **Exec form** — Writing `CMD` or `ENTRYPOINT` as a JSON array so the process runs without a wrapping shell.
- **Port publishing** — Mapping a host port to a container port.
- **Volume** — Docker-managed storage that persists independently of containers.
- **Bind mount** — Mounting a host directory into a container.
- **User-defined network** — A Docker network providing name-based discovery between containers.
- **Graceful shutdown** — Finishing in-flight work and exiting cleanly after receiving `SIGTERM`.
- **Distroless image** — A minimal image containing only an application and its runtime dependencies.
- **Image scanning** — Checking images for known vulnerabilities.

## What comes next

Real applications need several containers together — an API, a database, a cache, a worker. The next chapter, {{ch:docker-compose}}, describes multi-container applications in one file: services, networks and volumes, environment configuration, dependencies and health checks, development workflows with live reload, and how Compose relates to production orchestrators.
