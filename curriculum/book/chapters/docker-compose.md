# Docker Compose

> [!GOALS]
> - Explain what Docker Compose is for: running a multi-container application from one file.
> - Write a `compose.yaml` with **services**, **networks**, **volumes**, **environment** and **health checks**.
> - Start services in the right order with `depends_on` and health conditions — and understand why a health check can lie.
> - Use Compose for daily development: live reload, override files, profiles, running one-off commands.
> - Understand the limits of Compose and how it relates to production platforms.

## Why this matters

A real application is never one container. The shop API needs PostgreSQL, perhaps Redis for caching and sessions, a worker for queues, maybe a mail catcher for testing emails. Starting each with a long `docker run` command — the right image, network, volume, environment variables and ports, in the right order — is slow and error-prone, and every developer does it slightly differently ({{ch:docker}}).

**Docker Compose** describes the whole application in one YAML file kept in the repository. `docker compose up` starts everything, connected and configured; `docker compose down` removes it. A new developer clones the repository and has a working environment in minutes. CI pipelines use the same file to start databases for integration tests ({{ch:github-actions}}). Compose is one of the most used tools in back-end development — almost every project you join will have a `compose.yaml`.

Every command in this chapter was run with Docker Compose, and the outputs are what it printed.

## The simple idea

Think of a recipe for a dinner party instead of separate instructions for each dish. The recipe lists every dish, what each needs, which must be ready first (the sauce before the pasta), and which share ingredients. Anyone can follow it and get the same dinner.

`compose.yaml` is that recipe for an application: each service, its image and settings, what it depends on, and what storage and networks the services share.

> [!ANALOGY]
> A Compose file is like a recipe for a whole dinner: every dish, what each one needs, and the order in which they must be ready.
>
> **Where the analogy breaks:** a cook can see whether the sauce is ready. Compose only knows what a **health check** tells it — and as this chapter shows, a badly written health check can report "ready" while the database is still setting itself up. Compose also runs everything on **one machine**: it is a recipe for one kitchen, not a restaurant chain.

## The proper definition and key words

**Docker Compose** is a tool for defining and running multi-container applications. A **Compose file** (`compose.yaml`) declares **services** (containers and how to run them), **networks** and **volumes**; the `docker compose` command creates, starts, stops and removes them together as a **project**.

Key words:

- **Service** — one component of the application, run as one or more containers from an image.
- **Project** — the set of resources from one Compose file, named after its directory or the `name:` field.
- **`build` / `image`** — build the service's image from a Dockerfile, or use an existing image.
- **Default network** — Compose creates one network per project; services reach each other by **service name**.
- **Named volume** — persistent storage managed by Docker, surviving `down` (but not `down -v`).
- **Bind mount** — a host directory mounted into a container, used for source code in development.
- **`depends_on`** — start order, optionally waiting for a dependency to be healthy.
- **Health check** — a command run regularly inside a container to decide whether it is healthy.
- **Variable interpolation** — `${VAR}` in the file, filled from the environment or a `.env` file.
- **Override file / profile** — extra configuration merged in, and optional groups of services.

## A complete application

### Level 1 — The Compose file

Here is a complete small application: an API built from its own Dockerfile and a PostgreSQL database with an initialisation script, a persistent volume and a health check. The last commands start everything and call the API:

```bash
mkdir -p cornershop/api cornershop/db && cd cornershop
cat > api/package.json <<'EOF'
{ "name": "shop-api", "type": "module", "dependencies": { "pg": "8.16.3" } }
EOF
cat > api/server.js <<'EOF'
import { createServer } from "node:http";
import pg from "pg";
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const server = createServer(async (req, res) => {
  res.setHeader("Content-Type", "application/json");
  if (req.url === "/health") return res.end(JSON.stringify({ ok: true }));
  try {
    const { rows } = await pool.query("select count(*)::int as orders from orders");
    res.end(JSON.stringify({ orders: rows[0].orders, db: new URL(process.env.DATABASE_URL).host }));
  } catch (err) {
    res.statusCode = 500; res.end(JSON.stringify({ error: err.message }));
  }
});
server.listen(3000, "0.0.0.0", () => console.log("api listening on 3000"));
process.on("SIGTERM", () => server.close(() => pool.end().then(() => process.exit(0))));
EOF
cat > api/Dockerfile <<'EOF'
FROM node:22-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund
COPY server.js ./
USER node
CMD ["node", "server.js"]
EOF
cat > db/init.sql <<'EOF'
create table orders (id serial primary key, total_pence int not null);
insert into orders (total_pence) values (1250), (899), (4300);
EOF
cat > .env <<'EOF'
POSTGRES_PASSWORD=dev-only-password
API_PORT=18081
EOF
cat > compose.yaml <<'EOF'
name: cornershop

services:
  api:
    build: ./api
    ports:
      - "127.0.0.1:${API_PORT}:3000"
    environment:
      DATABASE_URL: postgres://shop:${POSTGRES_PASSWORD}@db:5432/shop
    depends_on:
      db:
        condition: service_healthy
    restart: unless-stopped

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: shop
      POSTGRES_DB: shop
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./db/init.sql:/docker-entrypoint-initdb.d/init.sql:ro
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -h 127.0.0.1 -U shop -d shop"]
      interval: 2s
      timeout: 3s
      retries: 15

volumes:
  pgdata:
EOF
docker compose up -d --build --wait > /dev/null 2>&1
docker compose ps --format '{{.Service}}: {{.State}} {{.Health}}'
curl -s http://127.0.0.1:18081/orders
```

**Output:**

```text
api: running 
db: running healthy
{"orders":3,"db":"db:5432"}
```

Reading the file:

- **`name: cornershop`** names the project; container, network and volume names are prefixed with it.
- **`api`** is **built** from `./api`. Its port 3000 is **published** on the host's `127.0.0.1:18081` (only on localhost — the right default on a laptop). It connects to the database at the host name **`db`** — the service's name, resolved by Compose's network ({{ch:networking}}).
- **`db`** uses the official `postgres:16-alpine` image. The image's environment variables create the user and database on first start; files in `/docker-entrypoint-initdb.d/` run once, when the data directory is empty, creating and filling the `orders` table.
- **`pgdata`** is a **named volume** holding the database files, so data survives container restarts and re-creation.
- **`${POSTGRES_PASSWORD}`** and **`${API_PORT}`** come from the **`.env` file** next to the Compose file. Keep real secrets out of Git: commit an `.env.example` and ignore `.env` ({{ch:secrets-manager}}).
- **`depends_on` with `condition: service_healthy`** makes Compose wait until the database's health check passes before starting the API; `--wait` makes `up` itself wait until services are running and healthy.
- `docker compose ps` shows the state and health of each service. The API has no health check of its own, so its health column is empty.

### Level 2 — When the health check lies

The first version of this file used `pg_isready -U shop -d shop` as the health check. The API then answered:

```text
{"error":"the database system is starting up"}
```

On the first start, the PostgreSQL image starts a **temporary server**, listening only on a local Unix socket, to run the initialisation scripts — and only then starts the real server on TCP port 5432. `pg_isready` without `-h` checks the **Unix socket**, so it reported "ready" during initialisation. Compose believed it and started the API too early. Checking over TCP with `pg_isready -h 127.0.0.1` reports "ready" only when the real server accepts network connections — the way the API connects.

Two lessons apply far beyond Compose:

- A health check must test **what the client actually depends on** ({{ch:monitoring}}).
- Even with correct health checks, **applications should retry connections** at start-up, because dependencies restart and move in every real environment ({{ch:rds}}).

### Level 2 — Inspecting and operating the project

```bash
docker compose config --services
docker compose config | grep DATABASE_URL
docker compose exec -T db psql -U shop -d shop -tAc "select count(*) from orders"
docker compose logs api --no-log-prefix
```

**Output:**

```text
db
api
      DATABASE_URL: postgres://shop:dev-only-password@db:5432/shop
3
api listening on 3000
```

- **`docker compose config`** prints the final configuration after interpolation and merging — the first thing to check when a value is not what you expect. (It prints secrets from `.env` in plain text, so do not paste it into tickets.) `--services` lists the services in dependency order.
- **`docker compose exec SERVICE command`** runs a command inside a running service: here, a query with `psql`. `-T` disables the pseudo-terminal, as needed in scripts. Interactively, `docker compose exec db psql -U shop shop` opens a database shell.
- **`docker compose logs SERVICE`** shows a service's output; `-f` follows it live; without a service name, logs from all services are interleaved with prefixes.
- Other everyday commands: `docker compose up -d` (start in the background), `stop` and `start`, `restart api`, `run --rm api npm test` (a one-off container), `pull`, `build`, and `down`.

### Level 2 — Volumes: what `down` keeps and what `down -v` deletes

```bash
docker compose exec -T db psql -U shop -d shop -qc "insert into orders (total_pence) values (1999)"
docker compose down > /dev/null 2>&1
docker compose up -d --wait > /dev/null 2>&1
echo "after down + up:   $(curl -s http://127.0.0.1:18081/orders)"
docker compose down -v > /dev/null 2>&1
docker compose up -d --wait > /dev/null 2>&1
echo "after down -v + up: $(curl -s http://127.0.0.1:18081/orders)"
docker compose down -v > /dev/null 2>&1
docker compose ps -a --format '{{.Service}}' | wc -l
```

**Output:**

```text
after down + up:   {"orders":4,"db":"db:5432"}
after down -v + up: {"orders":3,"db":"db:5432"}
0
```

- **`docker compose down`** removes containers and the network, but **keeps named volumes**: after starting again, the fourth order is still there.
- **`docker compose down -v`** also deletes the volumes. The next start found an empty data directory, so the initialisation script ran again — back to three orders. Use it to reset a development database; never run it where the data matters.
- The final `down -v` removed everything: no containers remain in the project.

## Compose for development

### Level 2 — Live reload with bind mounts

In development you want code changes to apply immediately, without rebuilding the image:

```yaml
# compose.override.yaml — merged automatically with compose.yaml by `docker compose up`
services:
  api:
    build:
      context: ./api
      target: dev                     # a Dockerfile stage with dev dependencies
    command: ["npx", "tsx", "watch", "src/server.ts"]
    volumes:
      - ./api/src:/app/src            # bind mount: edits on the host appear in the container
    environment:
      NODE_ENV: development
      LOG_LEVEL: debug
```

- A **bind mount** maps the host's source directory into the container; a watcher restarts the server when files change.
- Do not bind-mount `node_modules` from the host: native modules compiled for Windows or macOS fail on Linux. Install them in the image (or use a named volume for them).
- **Compose Watch** (`develop.watch` with `sync` and `rebuild` actions, started with `docker compose watch`) is an alternative that syncs files without bind mounts and rebuilds when dependency files change.

### Level 3 — Override files, profiles and multiple environments

- **`compose.override.yaml`** is merged automatically, which makes it the natural place for development-only settings. Other combinations are explicit: `docker compose -f compose.yaml -f compose.ci.yaml up`.
- **Profiles** mark optional services that start only when asked:

```yaml
services:
  mailpit:
    image: axllent/mailpit:v1.27
    profiles: ["mail"]               # started only with: docker compose --profile mail up
    ports: ["127.0.0.1:8025:8025"]

  worker:
    build: ./api
    command: ["node", "worker.js"]
    profiles: ["worker"]
    depends_on:
      db: { condition: service_healthy }
```

- **Anchors and extensions** (`x-common-env: &common-env` … `<<: *common-env`) remove repetition between similar services.
- **`env_file:`** loads many variables from a file into a service; `environment:` sets individual ones. Interpolation (`${VAR}`) happens when Compose reads the file; `environment` values are passed into the container.

### Level 3 — Compose in CI

Integration tests need real dependencies ({{ch:testing}}):

```bash
# fragment
docker compose -f compose.yaml -f compose.ci.yaml up -d --wait db redis
npm run db:migrate
npm run test:integration
docker compose down -v
```

`--wait` blocks until the health checks pass, so tests never start against a half-ready database. Always clean up with `down -v` so each run starts fresh. In GitHub Actions, **service containers** do the same job without a Compose file ({{ch:github-actions}}).

## Production and Compose

### Level 4 — Where Compose fits

Compose runs containers on **one host**. It does not move containers to another machine when the host fails, spread load across machines, or perform rolling deployments across a cluster. Production systems therefore use orchestrators — ECS, Kubernetes, Cloud Run, Nomad ({{ch:ecs}}, {{ch:eks}}) — while Compose is used for:

- **local development** and demos;
- **CI** dependencies and end-to-end test environments;
- **small, single-server deployments** where an outage during a host failure is acceptable (internal tools, side projects), with `restart: unless-stopped`, resource limits and backups of the volumes.

The ideas carry over directly: services, images, environment configuration, health checks, volumes and service discovery by name all exist in every orchestrator, under different names. Some tools convert Compose files into orchestrator definitions, but production configuration usually deserves its own, deliberately designed files.

### Level 4 — Good habits for Compose files

- **Pin image versions** (`postgres:16-alpine`, not `postgres:latest`) — and match the versions used in production.
- **Bind published ports to `127.0.0.1`** on laptops, so databases are not exposed to the local network.
- **Health checks** on every dependency, testing what clients really use.
- **No real secrets in the file**; `.env` in `.gitignore`, with an `.env.example` committed.
- **Resource limits** (`deploy.resources.limits`) when services compete for memory.
- **One command to start**, documented in the README, plus seed data so the application is usable immediately.

## From beginner to enterprise

**Level 1–2 — first Compose files.** Services, images and builds; published ports; environment variables and `.env`; named volumes; service names as host names; `up`, `down`, `ps`, `logs`, `exec`.

**Level 3 — development workflows.** Health checks and `depends_on` conditions; bind mounts and watch for live reload; override files and profiles; seed scripts; Compose in CI with `--wait`.

**Level 4 — reliable environments.** Pinned images matching production; health checks that test the real interface; resource limits; secrets kept out of files; single-host deployments with restarts and backups where appropriate.

**Level 5 — senior practice.** Designing a developer experience where one command gives a realistic environment; keeping local, CI and production configuration consistent; knowing when to move from Compose to an orchestrator.

**Level 6 — enterprises.** Shared base Compose files and dev containers for many teams; local environments that mirror production platforms; ephemeral preview environments.

## Real-world use cases

### Onboarding in ten minutes

- **Practice**: `git clone`, `cp .env.example .env`, `docker compose up`. The API, PostgreSQL, Redis and Mailpit start with seed data and live reload; the README lists the URLs. New developers make their first change on day one.

### Integration tests in CI

- **Practice**: the pipeline starts PostgreSQL and Redis from the same Compose file developers use, waits for health checks, runs migrations and tests, then removes everything with `down -v`.

## Common mistakes

### Beginner: `localhost` to reach another service

**Consequence:** "connection refused" — inside a container, `localhost` is that container. **Fix:** use the service name (`db:5432`).

### Beginner: publishing database ports on all interfaces

**Consequence:** databases reachable from the café's Wi-Fi. **Fix:** `127.0.0.1:` bindings, or no published port at all.

### Beginner: `down -v` without thinking

**Consequence:** the local database is gone. **Fix:** plain `down` to stop; `-v` only to reset deliberately.

### Intermediate: `depends_on` without health conditions

**Consequence:** the API starts before the database accepts connections. **Fix:** `condition: service_healthy` plus retries in the application.

### Intermediate: health checks that test the wrong thing

**Consequence:** "healthy" services that clients cannot use. **Fix:** test the interface clients use (TCP, HTTP endpoint).

### Intermediate: secrets in `compose.yaml`

**Fix:** `.env` outside Git, secrets files, or a secrets manager.

### Production: Compose as a cluster orchestrator

**Consequence:** no failover across machines. **Fix:** an orchestrator for production workloads that need high availability.

## Debugging and troubleshooting

- **A service exits immediately**: `docker compose logs SERVICE`; `docker compose ps -a` shows the exit code.
- **Wrong configuration values**: `docker compose config` shows the merged, interpolated file.
- **"Connection refused" between services**: the service name and the container port (not the published host port), the service's health, and whether it listens on `0.0.0.0`.
- **Initialisation script did not run**: it runs only when the data volume is empty — reset with `down -v` in development.
- **Port already allocated**: another process or project uses the host port; change the published port.
- **Changes not visible**: rebuild with `up --build`, or check that the bind mount path is right.

## Security summary

- **No secrets in Compose files or images**; `.env` ignored by Git; commit only examples.
- **Bind published ports to localhost** in development; publish only what must be reached.
- **Pinned, trusted images**; the same security practices as {{ch:docker}} (non-root users, minimal images).
- **Never mount the Docker socket** into containers unless absolutely necessary — it grants root on the host.
- **Treat `docker compose config` output as secret** when `.env` holds credentials.

## How a senior engineer thinks about this

- **One command to a working system.** The Compose file is part of the product's developer experience.
- **Same images, same versions.** Local, CI and production should differ in configuration, not in software.
- **Readiness is a contract.** Health checks must test what clients use, and clients must still retry.
- **Compose is for one machine.** Use it where that is enough, and an orchestrator where it is not.

## Exercises

### Exercise 1 — Add Redis

**Objective:** practise adding a service.
**What to do:** add a Redis service to the Compose file with a health check, make the API wait for it, and give the API a `REDIS_URL`.

<details>
<summary>Show the solution</summary>

```yaml
services:
  redis:
    image: redis:7-alpine
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 2s
      timeout: 3s
      retries: 15

  api:
    environment:
      DATABASE_URL: postgres://shop:${POSTGRES_PASSWORD}@db:5432/shop
      REDIS_URL: redis://redis:6379
    depends_on:
      db: { condition: service_healthy }
      redis: { condition: service_healthy }
```

Compose merges these keys with the existing `api` definition only when they are in an override file; in the main file, add them to the existing service block. No port needs publishing — the API reaches Redis by service name on the project network.

</details>

### Exercise 2 — Find the problems

**Objective:** practise reviewing Compose files.
**The file:** the database uses `postgres:latest`, publishes `5432:5432`, has `POSTGRES_PASSWORD: Sup3rSecret!` written in the file, has no volume and no health check; the API has `DATABASE_URL: postgres://postgres:Sup3rSecret!@localhost:5432/postgres` and `depends_on: [db]`.

<details>
<summary>Show the solution</summary>

1. **`latest`** — unpinned; pin the version used in production.
2. **`5432:5432`** — published on all interfaces; bind to `127.0.0.1` or remove.
3. **Password in the file** — move to `.env` (ignored by Git) and interpolate.
4. **No volume** — data is lost when the container is re-created; add a named volume.
5. **No health check** and plain `depends_on` — the API may start before the database is ready; add a TCP-based health check and `condition: service_healthy`.
6. **`localhost` in `DATABASE_URL`** — inside the API container, that is the API itself; use `db`.
7. Use a dedicated database user and database rather than the `postgres` superuser.

</details>

### Exercise 3 — Production scenario: "it works on my machine" again

**Objective:** practise consistent environments.
**The scenario:** developers run PostgreSQL 13 in Compose, CI uses PostgreSQL 15 service containers, and production runs PostgreSQL 16 on RDS. A query using a newer SQL feature passes locally, fails in CI, and a migration that ran fine in CI fails in production. What do you change?

<details>
<summary>Show the solution</summary>

1. **One version everywhere**: pin the image to the production major version (`postgres:16-alpine`) in Compose, and use the same Compose file (or the same image tag) for CI dependencies.
2. **Same extensions and settings** where they matter (time zone, collation, extensions), configured in the Compose file or init scripts.
3. **Run migrations in CI against the production version**, ideally also against a copy of production's schema.
4. **Upgrade together**: when production upgrades, the version bump goes into Compose and CI in the same change.

</details>

## Summary

**Docker Compose** defines a multi-container application in one `compose.yaml`: **services** (built from Dockerfiles or using images), **published ports**, **environment** variables with `${VAR}` **interpolation** from `.env`, **named volumes** for persistent data, and a default **network** on which services find each other by **service name**. `docker compose up` creates and starts the **project**; `ps`, `logs`, `exec`, `config` and `run` operate it; `down` removes containers and networks but keeps volumes, while `down -v` deletes the data too.

**`depends_on` with `condition: service_healthy`** and `up --wait` order start-up by **health checks** — which must test what clients actually use: PostgreSQL's temporary initialisation server answers on the Unix socket, so a socket-based check reported "ready" too early, while a TCP check did not. Applications should still retry connections.

For development, **bind mounts** or **Compose Watch** give live reload, **override files** and **profiles** add development tools and optional services, and the same file starts dependencies in **CI**. Compose runs on **one host**, so production systems that need failover use orchestrators; keep images pinned and consistent with production, bind ports to localhost, and keep secrets out of Compose files.

## Key terms

- **Docker Compose** — A tool for defining and running multi-container applications from a YAML file.
- **Compose file** — The `compose.yaml` file describing services, networks and volumes.
- **Service** — A component of a Compose application, run as containers from one image.
- **Project** — All the resources created from one Compose file.
- **Service name resolution** — Reaching another service by its name on the project network.
- **Named volume** — Docker-managed persistent storage that survives container re-creation.
- **Bind mount** — Mounting a host directory into a container.
- **Published port** — A host port mapped to a container port.
- **Environment variable interpolation** — Replacing `${VAR}` in the Compose file with values from the environment or `.env`.
- **`.env` file** — A file of variables Compose reads for interpolation.
- **`depends_on`** — A setting that controls start order, optionally waiting for health.
- **Health check** — A command that reports whether a container is ready and working.
- **Initialisation script** — A script the database image runs once on an empty data directory.
- **Override file** — An extra Compose file merged with the main one.
- **Profile** — A named group of optional services.
- **Compose Watch** — A Compose feature that syncs files and rebuilds services during development.
- **Orchestrator** — A system that runs and manages containers across many machines.

## What comes next

When several services run behind one address, something must receive requests from the internet, terminate TLS and pass each request to the right service. The next chapter, {{ch:nginx-reverse-proxy}}, introduces NGINX as a web server and reverse proxy: server blocks, proxying, load balancing, TLS, headers, caching, rate limiting and serving static files.
