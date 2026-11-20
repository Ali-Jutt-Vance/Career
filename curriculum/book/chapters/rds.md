# RDS: Managed Databases

> [!GOALS]
> - Explain what a managed database service does for you and what remains your job.
> - Choose between **RDS** engines, **Aurora**, and running a database yourself.
> - Understand **Multi-AZ** failover, **read replicas**, backups and **point-in-time recovery**.
> - Configure networking, encryption, credentials and **parameter groups** safely.
> - Write applications that survive failovers: connection pools, timeouts, retries and **RDS Proxy**.
> - Plan upgrades, scaling and maintenance without surprises.

## Why this matters

The database is usually the most important part of a system: lose the application servers and you redeploy them in minutes; lose the database and you lose the business. Running PostgreSQL or MySQL well yourself means installing it, patching it, configuring replication and failover, taking and testing backups, monitoring disks and replacing failed hardware — at 3 a.m. if needed.

**Amazon RDS (Relational Database Service)** does most of that for you. You choose an engine, a size and a few settings; AWS provisions it, patches it, backs it up, replaces failed hardware and fails over to a standby in another availability zone automatically. Most companies on AWS run their relational databases on RDS or its cloud-native sibling **Aurora**.

You still make the decisions that matter: sizing, network exposure, encryption, backup retention, upgrade timing, connection management — and your application must cope with failovers. This chapter builds on the PostgreSQL knowledge from {{ch:postgresql}} and {{ch:replication}}.

## The simple idea

Running your own database is like owning a car: you choose it, but you also service it, replace tyres and deal with breakdowns. RDS is like a car lease with full maintenance: the leasing company services it, replaces what breaks and gives you a replacement car if yours fails — you still choose where to drive, who gets the keys and how carefully you drive.

> [!ANALOGY]
> RDS is like a fully maintained car lease: the company handles servicing and breakdowns, while you decide where you drive and who gets the keys.
>
> **Where the analogy breaks:** when a leased car breaks down, you notice and wait for the replacement. When RDS fails over to the standby, it happens in a minute or two automatically — but every open connection is cut. If your application is not written to reconnect and retry, users see errors even though the database recovered perfectly.

## The proper definition and key words

**Amazon RDS** is a managed service for relational databases — PostgreSQL, MySQL, MariaDB, Oracle, SQL Server and Db2 — running on instances that AWS operates. **Amazon Aurora** is an AWS-built, PostgreSQL- and MySQL-compatible engine with a distributed storage layer shared by all its instances.

Key words:

- **DB instance** — a database server managed by RDS, with an instance class (`db.r7g.large`) and storage.
- **Endpoint** — the DNS name applications connect to; it follows the current primary.
- **Multi-AZ** — a synchronous standby in another zone, promoted automatically on failure.
- **Read replica** — an asynchronous copy that serves read queries.
- **Automated backups** — daily snapshots plus transaction logs, enabling **point-in-time recovery (PITR)**.
- **Snapshot** — a manual or automated backup of the whole instance.
- **Parameter group** — the database configuration settings.
- **Subnet group** — the private subnets RDS may place instances in.
- **RDS Proxy** — a managed connection pooler in front of RDS and Aurora.
- **Maintenance window** — the weekly period for patching.
- **Aurora cluster** — a writer instance and up to fifteen reader instances sharing one storage volume.

## What RDS gives you

### Level 1 — Managed versus self-run

| Task | Self-run on EC2 | RDS |
|---|---|---|
| Install and patch the engine and OS | You | AWS (in your maintenance window) |
| Backups and point-in-time recovery | You build it | Built in; you choose retention |
| Replication and failover | You build and test it | Multi-AZ option |
| Replace failed hardware | You | AWS |
| Monitoring | You build it | CloudWatch metrics, Performance Insights, Enhanced Monitoring |
| Superuser and OS access | Full | No OS access; limited superuser |
| Extensions and versions | Anything | Supported list only |

RDS is the right default for almost every application. Self-running makes sense mainly for unsupported extensions or versions, special tuning, or very large scale where the team has deep database expertise.

### Level 1 — RDS or Aurora?

- **RDS for PostgreSQL**: standard PostgreSQL on an instance with EBS storage. Simple, predictable, widely compatible.
- **Aurora PostgreSQL**: storage is replicated six ways across three zones automatically and grows by itself; failover usually takes under 30 seconds; up to fifteen low-lag readers; features like global databases across regions, cloning and serverless capacity. Usually more expensive for small or steady workloads, and I/O costs need watching.

Start with RDS unless you need Aurora's failover speed, read scaling or storage features. Both speak the normal PostgreSQL protocol, so applications do not change.

## High availability and recovery

### Level 2 — Multi-AZ: surviving failures

```text
          app instances (zones a and b)
                    │  shop-db.xxxx.eu-west-2.rds.amazonaws.com
                    ▼
     ┌──────────────────────────┐   synchronous    ┌──────────────────────────┐
     │ primary (eu-west-2a)     │ ───────────────► │ standby (eu-west-2b)     │
     └──────────────────────────┘    replication   └──────────────────────────┘
        on failure: the standby is promoted and the DNS name points to it (about 1–2 minutes)
```

- Every write is committed on both the primary and the standby before it is confirmed, so a failover loses **no committed data**.
- The standby (in classic Multi-AZ) serves no traffic — it exists only to take over. "Multi-AZ DB cluster" deployments have two readable standbys and faster failover.
- Failover also happens during some maintenance (patching, instance class changes): the standby is updated first, then roles switch, keeping downtime short.
- Production databases should always be Multi-AZ ({{ch:aws-overview}}).

### Level 2 — Surviving the failover in your application

A failover cuts every connection and moves the endpoint's DNS record. Applications must: use the **endpoint name** (never an IP address), respect DNS TTLs (do not cache resolved addresses for ever), detect broken connections, and **retry** safe operations. Here a real PostgreSQL server cuts the application's connections in the middle of a query, as a failover would:

```ts
import pg from "pg";

// During a Multi-AZ failover, RDS moves the DNS name to the standby; existing connections are cut.
// Here a real PostgreSQL server cuts the connections the same way (pg_terminate_backend),
// and the application's pool recovers because queries are retried on connection errors.
const pool = new pg.Pool({
  connectionString: "postgres://postgres@localhost:55432/postgres",
  max: 5,                          // per instance: 20 app instances x 5 = 100 database connections
  connectionTimeoutMillis: 2_000,  // fail fast instead of hanging when the database is unreachable
  idleTimeoutMillis: 10_000,
});
pool.on("error", (err) => console.log("pool: idle connection lost:", (err as NodeJS.ErrnoException).code ?? err.message));

const RETRYABLE = new Set(["57P01", "ECONNRESET", "ECONNREFUSED", "08006", "08003"]);  // admin shutdown, network, connection failure

async function queryWithRetry<T extends pg.QueryResultRow>(sql: string, params: unknown[] = [], attempts = 4): Promise<pg.QueryResult<T>> {
  for (let i = 1; ; i++) {
    try {
      return await pool.query<T>(sql, params);
    } catch (err) {
      const code = (err as { code?: string }).code ?? "";
      if (!RETRYABLE.has(code) || i === attempts) throw err;
      const delay = 100 * 2 ** (i - 1);                    // 100, 200, 400 ms
      console.log(`attempt ${i} failed (${code}), retrying in ${delay} ms`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

// a report query is running when the "failover" happens
const report = queryWithRetry<{ total: string }>("select pg_sleep(0.5), 'ok' as total");
await new Promise((r) => setTimeout(r, 150));

// simulate the failover: a separate admin connection terminates the application's sessions
const admin = new pg.Client({ connectionString: "postgres://postgres@localhost:55432/postgres", application_name: "admin" });
await admin.connect();
const killed = await admin.query("select count(*)::int as n from (select pg_terminate_backend(pid) from pg_stat_activity where datname = 'postgres' and pid <> pg_backend_pid() and backend_type = 'client backend') t");
console.log("connections cut by the 'failover':", killed.rows[0].n);
await admin.end();

const result = await report;
console.log("report query result:", result.rows[0]!.total);
await pool.end();
```

**Output:**

```text
attempt 1 failed (57P01), retrying in 100 ms
connections cut by the 'failover': 1
report query result: ok
```

- The running query failed with `57P01` (the server terminated the connection). The retry obtained a **new connection** from the pool and the query succeeded. Users saw a slightly slower request instead of an error.
- Retries use **exponential backoff** and a limit — during a real failover, the first attempts may fail for a minute while DNS switches.
- **Retry only what is safe to repeat.** A read is safe. A write might have committed just before the connection dropped; retrying a payment insert blindly could create a duplicate. Make writes idempotent (unique keys, idempotency keys) or let the request fail and the caller decide ({{ch:transactions}}).
- **`connectionTimeoutMillis`** makes requests fail fast instead of hanging while the database is unreachable; also set statement timeouts for runaway queries.

### Level 3 — Read replicas

Read replicas receive changes **asynchronously** and serve read-only queries — reports, search pages, analytics — taking load off the primary ({{ch:replication}}).

- **Replication lag**: a replica may be milliseconds or seconds behind. Reading your own write from a replica straight after writing may show old data. Send "read after write" queries to the primary.
- Replicas can live in **other regions** for disaster recovery and local reads, and can be **promoted** to standalone primaries.
- They are not a replacement for Multi-AZ: promotion is manual (in RDS), and lag means some data may be lost.

### Level 3 — Backups and point-in-time recovery

- **Automated backups** take a daily snapshot and keep transaction logs, so you can restore to **any second** within the retention period (up to 35 days). Set retention deliberately — seven days is a common minimum for production.
- A restore always creates a **new instance**; you then switch the application to it (or copy data back). Practise it: an untested backup is only a hope.
- **Manual snapshots** remain until deleted — for before risky changes, long-term retention, or copying to another region or account (**AWS Backup** centralises this with cross-account vaults, protecting backups even if the production account is compromised).
- **Deletion protection** and a **final snapshot** on deletion prevent the classic disaster of deleting the production database by mistake ({{ch:terraform}}).

## Configuration and security

### Level 3 — Network, encryption and credentials

- **Private subnets only**: a **subnet group** of private subnets in several zones, `PubliclyAccessible: false`, and a security group allowing port 5432 only from the application's security group ({{ch:vpc}}, {{ch:ec2}}).
- **Encryption at rest** with KMS must be chosen at creation (an unencrypted instance can only be encrypted by restoring an encrypted copy of a snapshot). Make it the default.
- **Encryption in transit**: require TLS (`rds.force_ssl = 1` in the parameter group for PostgreSQL) and verify the server certificate with the RDS certificate bundle ({{ch:tls-ssl}}).
- **Credentials**: let RDS manage the master password in **Secrets Manager** with automatic rotation, give each application its own database user with only the privileges it needs, and never use the master user in applications ({{ch:secrets-manager}}).
- **IAM database authentication** can replace passwords with short-lived tokens generated from the application's role.

### Level 3 — Parameter groups and sizing

- **Parameter groups** hold engine settings: `max_connections`, `work_mem`, `log_min_duration_statement` (log slow queries), `statement_timeout`, `idle_in_transaction_session_timeout`. Use a custom group per environment — the default group cannot be edited — and keep it in infrastructure code.
- **Instance class**: memory-optimised (`db.r7g`) is typical for production — PostgreSQL performs best when the working set fits in memory. Burstable (`db.t4g`) is fine for development.
- **Storage**: gp3 with enough IOPS and throughput; turn on **storage autoscaling** so a full disk does not stop the database.
- **Monitoring**: CPU, freeable memory, free storage, read/write latency, connections, replica lag; **Performance Insights** shows which queries use the database's time ({{ch:query-optimization}}, {{ch:cloudwatch}}).

### Level 4 — Connections and RDS Proxy

Each PostgreSQL connection is a server process using memory, so databases support hundreds of connections, not tens of thousands. Many application instances, each with a pool, add up quickly: 40 tasks × 10 connections = 400. Serverless functions are worse — each concurrent invocation may open its own connection ({{ch:lambda}}).

- Size pools deliberately: total connections across all instances must stay below the database's limit, with room for administration and migrations.
- **RDS Proxy** sits between applications and the database, pooling and sharing connections, holding client connections during failovers (making them faster for clients) and supporting IAM authentication. It is particularly useful with Lambda and with many small application instances.
- PgBouncer is the self-managed alternative.

### Level 4 — Upgrades and maintenance

- **Minor versions** (bug and security fixes) can be applied automatically in the maintenance window.
- **Major versions** (PostgreSQL 16 → 17) can change behaviour and extensions: test on a restored snapshot first, then upgrade with a short outage, or use **blue/green deployments**, where RDS creates an upgraded copy kept in sync with logical replication and switches over in about a minute.
- Instance class changes and many parameter changes cause a restart or failover — schedule them.
- Schema migrations remain your job, with expand-and-contract steps ({{ch:database-design}}).

## From beginner to enterprise

**Level 1–2 — first databases.** Creating an RDS PostgreSQL instance in private subnets; security groups; automated backups; connecting with a pool; Multi-AZ for production.

**Level 3 — production configuration.** Encryption, TLS required, managed secrets and per-application users; custom parameter groups; read replicas with lag awareness; tested point-in-time restores; deletion protection.

**Level 4 — resilient applications.** Failover-tolerant connection handling with timeouts and safe retries; connection budgets and RDS Proxy; Performance Insights; blue/green upgrades.

**Level 5 — senior practice.** Choosing RDS versus Aurora versus other data stores; capacity planning; cross-region disaster recovery with defined recovery objectives; cost optimisation with right-sizing and reserved instances.

**Level 6 — enterprises.** Centralised backup vaults across accounts, fleet-wide upgrade programmes, database platform teams offering standard modules and guardrails.

## Real-world use cases

### The Saturday failover

- **What happened**: the primary's underlying host failed. RDS promoted the standby in about 70 seconds. The API, which retried read queries and used idempotency keys for order creation, showed a short rise in latency and no failed orders; an older reporting service that cached the IP address failed until it was restarted.

### The accidental delete

- **What happened**: a developer ran a migration against production instead of staging and dropped a table. The team restored the database to one minute before the mistake as a new instance, copied the table back and moved on. Afterwards: separate accounts for production, read-only defaults for humans and migrations only through the pipeline.

## Common mistakes

### Beginner: publicly accessible databases

**Consequence:** constant attacks on the database port. **Fix:** private subnets and security-group-only access.

### Beginner: single-AZ production

**Consequence:** a zone failure means an outage and possible data loss. **Fix:** Multi-AZ.

### Beginner: master user in the application

**Consequence:** one compromised service can do anything. **Fix:** per-application users with minimal privileges.

### Intermediate: no retry or timeout handling

**Consequence:** errors or hangs during every failover. **Fix:** timeouts, pools that discard broken connections, safe retries.

### Intermediate: too many connections

**Consequence:** "too many connections" errors and memory pressure. **Fix:** connection budgets, RDS Proxy.

### Intermediate: reading your own writes from replicas

**Consequence:** users see stale data. **Fix:** primary for read-after-write paths.

### Production: untested backups

**Consequence:** discovering in a crisis that restore takes hours or fails. **Fix:** scheduled restore tests.

### Production: unencrypted instances

**Fix:** encryption on by default at creation.

## Debugging and troubleshooting

- **Cannot connect**: security group source, subnet routing, the endpoint name, TLS settings, and the database user's password or IAM token.
- **High CPU**: Performance Insights' top SQL; missing indexes and inefficient queries ({{ch:indexes}}).
- **Free storage falling**: table bloat, long-running transactions preventing vacuum, logs; enable storage autoscaling and investigate ({{ch:postgresql}}).
- **"Too many connections"**: count connections per application; reduce pool sizes; add RDS Proxy.
- **Replica lag**: heavy write bursts, long queries on the replica, undersized replicas.
- **Slow after failover**: the new primary's cache is cold for a while; Aurora's cluster cache management can help.

## Security summary

- **Private subnets**, no public access, security groups referencing application groups.
- **Encryption at rest** (KMS) and **TLS required** in transit.
- **Managed, rotated secrets**; per-application users with least privilege; IAM authentication where suitable.
- **Deletion protection**, final snapshots, backups copied to a separate account.
- **Audit**: database logs (slow queries, connections), CloudTrail for RDS API calls.
- **Patch** through maintenance windows and planned major upgrades.

## How a senior engineer thinks about this

- **Managed by default.** Spend engineering time on the product, not on running databases.
- **Design for failover.** The database will move; the application must cope.
- **Backups are only real when restores are tested.**
- **Connections are a budget.** Plan them across every service and function.
- **Data is the business.** Encryption, access control and protection from deletion are not optional.

## Exercises

### Exercise 1 — Configure a production database

**Objective:** practise RDS settings.
**What to do:** list the key settings for a production PostgreSQL database for an online shop.

<details>
<summary>Show the solution</summary>

- Engine: RDS for PostgreSQL, current supported major version; memory-optimised class sized from load tests.
- **Multi-AZ** enabled.
- **Private subnet group** across at least two zones; `PubliclyAccessible: false`; security group allowing 5432 only from the API and worker groups.
- **Encryption at rest** with a KMS key; `rds.force_ssl = 1`.
- **Master password managed in Secrets Manager**; separate application users.
- **Backups**: retention of 14 days or more; copies to a backup account; **deletion protection**; final snapshot on delete.
- **Custom parameter group**: slow query logging, statement and idle-in-transaction timeouts.
- **Monitoring**: Performance Insights, CloudWatch alarms on storage, CPU, connections, latency and replica lag.
- Storage autoscaling; maintenance window at low traffic; all of it in infrastructure code.

</details>

### Exercise 2 — Which operations can be retried?

**Objective:** practise safe retries.
**What to do:** after a connection error, which of these can be retried automatically? (a) `SELECT` product details; (b) `INSERT` an order with a client-supplied idempotency key under a unique constraint; (c) `UPDATE accounts SET balance = balance - 50 WHERE id = 7`; (d) `UPDATE orders SET status = 'shipped' WHERE id = 42`.

<details>
<summary>Show the solution</summary>

- (a) **Yes** — reads are safe.
- (b) **Yes** — if the first attempt committed, the retry hits the unique constraint and the application returns the existing order.
- (c) **No** — if the first attempt committed, a retry subtracts 50 again. Make it idempotent (record the transfer with a unique ID in the same transaction and check it) or fail the request.
- (d) **Yes** — setting the same value twice has the same result (idempotent), though any side effects triggered by the change must also be idempotent.

</details>

### Exercise 3 — Production scenario: "too many connections" after scaling

**Objective:** practise connection management.
**The scenario:** during a sale, auto scaling grows the API from 10 to 60 tasks. Each has a pool of 20 connections. The database's `max_connections` is about 800. Requests start failing with "too many connections" and the database's memory drops sharply. What happened and what do you do?

<details>
<summary>Show the solution</summary>

**What happened:** 60 × 20 = 1,200 potential connections — more than the database allows, and each connection uses memory.

**Immediate:** reduce pool size per task (for example to 8) and redeploy; cap auto scaling's maximum.

**Lasting fixes:**
- A **connection budget** per service: total pools across the maximum number of tasks stay well below `max_connections`.
- **RDS Proxy** (or PgBouncer) to multiplex many client connections over fewer database connections.
- Faster queries and short transactions so each connection is busy for less time ({{ch:query-optimization}}).
- Alarms on database connections and freeable memory; load tests that include scaling to the maximum.

</details>

## Summary

**RDS** runs relational databases for you — provisioning, patching, backups, hardware replacement and failover — while you control sizing, networking, encryption, credentials, configuration and how your application connects. **Aurora** is AWS's compatible engine with shared, six-way replicated storage, fast failover and many readers; RDS is the simpler default.

**Multi-AZ** keeps a synchronous standby in another zone and fails over automatically in a minute or two without losing committed data — but connections are cut, so applications use the endpoint name, timeouts, pools that discard broken connections and **retries with backoff for safe operations**, with idempotency for writes. **Read replicas** scale reads asynchronously, with lag. **Automated backups** allow point-in-time recovery within the retention period; restores create new instances and must be practised; deletion protection, final snapshots and cross-account backup copies prevent disasters.

Place databases in **private subnets** with security groups referencing applications, encrypt at rest and require TLS, use managed rotated secrets and per-application users, configure **parameter groups** in code, monitor with CloudWatch and Performance Insights, budget connections across services and use **RDS Proxy** where many clients connect. Plan major upgrades with tests or blue/green deployments.

## Key terms

- **RDS** — Amazon Relational Database Service, managed relational databases.
- **Aurora** — AWS's PostgreSQL- and MySQL-compatible engine with distributed shared storage.
- **DB instance** — A database server managed by RDS.
- **Endpoint** — The DNS name applications use to connect to a database.
- **Multi-AZ** — A deployment with a synchronous standby in another availability zone.
- **Failover** — Promoting the standby when the primary fails.
- **Read replica** — An asynchronously updated copy for read queries.
- **Replication lag** — How far a replica is behind the primary.
- **Automated backups** — Daily snapshots plus transaction logs kept for a retention period.
- **Point-in-time recovery** — Restoring a database to any moment within the backup retention period.
- **Snapshot** — A full backup of a database instance.
- **Parameter group** — A set of database engine configuration settings.
- **Subnet group** — The subnets in which RDS may place database instances.
- **RDS Proxy** — A managed connection pooler for RDS and Aurora.
- **Connection pool** — A set of reusable database connections in an application.
- **Exponential backoff** — Waiting increasingly long between retries.
- **Idempotent operation** — An operation that has the same effect if performed more than once.
- **Blue/green deployment (RDS)** — Creating an updated, synchronised copy of a database and switching to it.
- **Performance Insights** — An RDS tool showing database load by query and wait type.
- **Deletion protection** — A setting that prevents a database from being deleted.

## What comes next

Databases, servers and containers all live inside a network. The next chapter, {{ch:vpc}}, explains VPCs: address ranges, public and private subnets across zones, route tables, internet and NAT gateways, security groups and network ACLs, VPC endpoints, and how to design a network for a production application.
