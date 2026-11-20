# Replication

> [!GOALS]
> - Explain what database replication is and the two problems it solves: **availability** and **read scaling**.
> - Understand how a primary streams changes to **replicas**, and the difference between **asynchronous** and **synchronous** replication.
> - Use **read replicas** safely, handling **replication lag** with strategies such as read-your-writes.
> - Plan **failover**: detecting failure, promoting a replica, avoiding split brain, and what data can be lost.
> - Know the other forms: logical replication, multi-primary setups and replication across regions.
> - Remember that replication is **not a backup**.

## Why this matters

A single database server is a single point of failure. When it crashes, the disk dies, the data centre loses power, or it is simply restarted for an upgrade, every part of the application that needs data stops. It is also a ceiling: one machine can only serve so many queries, and a heavy report can slow down checkout for everyone.

**Replication** keeps copies of the database on several servers. If the main server fails, a copy takes over within seconds or minutes instead of hours of restoring from backups. Read-heavy traffic — product pages, reports, analytics — can be spread across copies. Every serious production database runs with replicas; managed services such as Amazon RDS and Aurora ({{ch:rds}}), Google Cloud SQL and Azure make them a checkbox.

Replicas also introduce a new kind of bug. A copy is always slightly behind the original, so a user who saves their profile and immediately reloads the page may see the old version — read from a replica that has not caught up. Failovers can lose the last few writes, or, configured badly, leave two servers both believing they are in charge. Understanding how replication works is what lets you use it without these surprises. The examples in this chapter use a real PostgreSQL primary with a streaming replica, so the lag you will see actually happened.

## The simple idea

Think of a head office that keeps the official ledger, and branch offices that keep copies. Every entry written at head office is sent to the branches, which copy it into their own ledgers. Customers can check balances at any branch — taking load off head office — and if head office burns down, a branch's ledger becomes the new official one.

But the post takes time. A branch's copy is always a little behind, so a customer who deposits money at head office and immediately asks a branch for their balance may be told the old amount. And if head office burns down while some entries are still in the post, those entries are lost unless head office waited for confirmation before accepting them.

> [!ANALOGY]
> Replication is like a head office keeping the official ledger and posting every entry to branch offices, which keep copies: branches can answer questions and take over if head office fails.
>
> **Where the analogy breaks:** branch ledgers in real life are clearly copies. In software, a replica answers queries just like the primary, with nothing in the result saying "this may be two seconds old". Applications must know which reads can tolerate stale data and send the others to the primary — the database will not warn you.

## The proper definition and key words

**Replication** is the continuous copying of data changes from one database server to one or more others, so that each holds an up-to-date (or nearly up-to-date) copy.

Key words:

- **Primary** (leader, master) — the server that accepts writes.
- **Replica** (standby, follower, secondary) — a server that receives and applies changes from the primary; usually read-only.
- **Streaming replication** — sending the primary's change log (the WAL in PostgreSQL, {{ch:postgresql}}) to replicas continuously.
- **Asynchronous replication** — the primary confirms a commit without waiting for replicas.
- **Synchronous replication** — the primary waits until at least one replica confirms it has received (or applied) the change before confirming the commit.
- **Replication lag** — how far a replica is behind the primary, in time or in bytes of log.
- **Read replica** — a replica used to serve read queries.
- **Failover** — promoting a replica to primary when the primary fails.
- **Split brain** — two servers both acting as primary, accepting conflicting writes.
- **RPO / RTO** — recovery point objective (how much data you can afford to lose) and recovery time objective (how long recovery may take).

## How replication works

### Level 2 — Streaming the change log

```text
                      writes                   WAL stream
  application ──────────────────▶ PRIMARY ───────────────────▶ REPLICA 1  (read-only, replays changes)
       │                            │   └────────────────────▶ REPLICA 2
       │       reads (some)         │
       └────────────────────────────┴──────▶ replicas serve read-only queries
```

In PostgreSQL, every change is first written to the **write-ahead log**. Replicas connect to the primary, receive WAL records as they are written, and **replay** them, so their data files change exactly as the primary's did. Replicas can answer read-only queries while replaying ("hot standby"). A new replica starts from a copy of the primary's data (`pg_basebackup`, or a snapshot in managed services) and then follows the stream.

The examples connect to both servers. Each part of the WAL has a position, the **LSN** (log sequence number); comparing the primary's current LSN with the replica's replayed LSN tells us whether the replica has caught up:

```ts
import pg from "pg";

const primary = new pg.Client(process.env.PRIMARY_URL ?? "postgresql://postgres@localhost:5432/postgres");
const replica = new pg.Client(process.env.REPLICA_URL ?? "postgresql://postgres@localhost:5433/postgres");
await primary.connect();
await replica.connect();

const one = async (c: pg.Client, sql: string, params: unknown[] = []) => (await c.query(sql, params)).rows[0];

console.log("primary in recovery:", (await one(primary, "SELECT pg_is_in_recovery() AS r")).r,
            "| replica in recovery:", (await one(replica, "SELECT pg_is_in_recovery() AS r")).r);
const rep = await one(primary, "SELECT state, sync_state FROM pg_stat_replication");
console.log("replication:", rep);

await primary.query("DROP TABLE IF EXISTS price_changes; CREATE TABLE price_changes (sku text, price numeric(8,2))");

// Wait until the replica has replayed everything the primary has written so far
async function waitForReplica() {
  const { lsn } = await one(primary, "SELECT pg_current_wal_lsn()::text AS lsn");
  for (;;) {
    const { caught_up } = await one(replica, "SELECT pg_last_wal_replay_lsn() >= $1::pg_lsn AS caught_up", [lsn]);
    if (caught_up) return;
    await new Promise((r) => setTimeout(r, 20));
  }
}

await waitForReplica();                                    // the new table has reached the replica
// Replicas are read-only
try {
  await replica.query("INSERT INTO price_changes VALUES ('TEA-GRN', 4.80)");
} catch (err) {
  console.log("write on replica:", (err as Error).message);
}

await primary.query("INSERT INTO price_changes VALUES ('TEA-GRN', 4.80)");
await waitForReplica();
console.log("replica after catching up:", (await replica.query("SELECT * FROM price_changes")).rows);

// Simulate lag: pause replay on the replica, then write on the primary
await replica.query("SELECT pg_wal_replay_pause()");
await primary.query("UPDATE price_changes SET price = 5.10 WHERE sku = 'TEA-GRN'");
const lag = await one(primary, "SELECT pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn) > 0 AS behind FROM pg_stat_replication");
console.log("primary says:", (await one(primary, "SELECT price FROM price_changes")).price,
            "| replica says:", (await one(replica, "SELECT price FROM price_changes")).price,
            "| replica behind:", lag.behind);

await replica.query("SELECT pg_wal_replay_resume()");
await waitForReplica();
console.log("after resuming, replica says:", (await one(replica, "SELECT price FROM price_changes")).price);

await primary.end();
await replica.end();
```

**Output:**

```text
primary in recovery: false | replica in recovery: true
replication: { state: 'streaming', sync_state: 'async' }
write on replica: cannot execute INSERT in a read-only transaction
replica after catching up: [ { sku: 'TEA-GRN', price: '4.80' } ]
primary says: 5.10 | replica says: 4.80 | replica behind: true
after resuming, replica says: 5.10
```

- **`pg_is_in_recovery()`** is true on a replica: it is continuously "recovering" by replaying the primary's log. **`pg_stat_replication`** on the primary shows each connected replica — here streaming, asynchronously.
- **Replicas reject writes.** Every write must go to the primary.
- The table and row created on the primary appeared on the replica once it had replayed up to the primary's LSN.
- **Lag made visible**: pausing replay on the replica (something you would do only in an experiment) and then updating the price shows the primary returning 5.10 while the replica still returns **4.80**. In production, lag is usually milliseconds, but it grows under heavy writes, long-running queries on the replica, network problems or an overloaded replica — and during that time, reads from the replica return old data.
- After replay resumed, the replica caught up.

### Level 3 — Asynchronous versus synchronous

| | Asynchronous (default) | Synchronous |
|---|---|---|
| Commit waits for replicas? | No | Yes, for at least one (configurable) |
| Write latency | Lowest | Higher: one round trip to a replica per commit |
| Data loss if the primary dies | The last moments of commits not yet received by any replica | None for acknowledged commits (with `synchronous_commit = on` or `remote_apply`) |
| If the synchronous replica is down | Unaffected | Commits **block** until another synchronous replica is available |

PostgreSQL's `synchronous_standby_names` (for example, `ANY 1 (replica_a, replica_b)`) and `synchronous_commit` (`on`, `remote_write`, `remote_apply`) let you tune this. A common pattern: one synchronous replica in the same region (so acknowledged writes survive a primary failure) plus asynchronous replicas elsewhere for reads and disaster recovery. Managed services package these choices — Amazon RDS Multi-AZ keeps a synchronous standby; Aurora replicates storage across availability zones.

## Using read replicas

### Level 3 — What to send where

Read replicas add read capacity and isolate heavy workloads:

- **Good for replicas**: product listings and pages, search, reports and dashboards, analytics exports, background jobs that only read, any read where a second or two of staleness is harmless.
- **Must use the primary**: all writes; reads that decide something about a write (checking stock before reserving, checking a balance); reads inside the same transaction as writes; reads immediately after a user's own write ("read-your-writes").

Applications route queries with two connection pools (or an ORM's read-replica support, a proxy such as Pgpool or ProxySQL, or managed reader endpoints). A replica's own queries also affect it: a very long report on a replica can delay replay (PostgreSQL may cancel the query, or, with `hot_standby_feedback`, hold back cleanup on the primary). Dedicated replicas for reporting keep analytics from slowing the replicas that serve users.

### Level 3 — Read-your-writes

The classic replica bug: a user changes their nickname, the page reloads, the read goes to a lagging replica, and the old nickname appears — the user thinks the save failed. Fixes:

- **Read from the primary for a short time after a user writes** (for example, 5 seconds, tracked in the session).
- **Track the WAL position of the user's last write** and read from a replica only once it has replayed that position:

```ts
import pg from "pg";

// Read-your-writes: remember the WAL position of each user's last write,
// and only read from the replica once it has replayed that far
const primary = new pg.Pool({ connectionString: process.env.PRIMARY_URL ?? "postgresql://postgres@localhost:5432/postgres" });
const replica = new pg.Pool({ connectionString: process.env.REPLICA_URL ?? "postgresql://postgres@localhost:5433/postgres" });
const lastWriteLsn = new Map<string, string>();               // in production: in the session or a cookie

async function write(userId: string, sql: string, params: unknown[]) {
  await primary.query(sql, params);
  const { rows } = await primary.query("SELECT pg_current_wal_lsn()::text AS lsn");
  lastWriteLsn.set(userId, rows[0].lsn);
}

async function read(userId: string, sql: string, params: unknown[] = []) {
  const needed = lastWriteLsn.get(userId);
  if (needed) {
    const { rows } = await replica.query("SELECT pg_last_wal_replay_lsn() >= $1::pg_lsn AS ok", [needed]);
    if (!rows[0].ok) return { from: "primary", rows: (await primary.query(sql, params)).rows };
  }
  return { from: "replica", rows: (await replica.query(sql, params)).rows };
}

await primary.query("DROP TABLE IF EXISTS profiles; CREATE TABLE profiles (user_id text PRIMARY KEY, nickname text)");
await primary.query("INSERT INTO profiles VALUES ('sara', 'Sara'), ('omar', 'Omar')");

await replica.query("SELECT pg_wal_replay_pause()");          // make the replica lag, so the effect is visible
await write("sara", "UPDATE profiles SET nickname = $1 WHERE user_id = 'sara'", ["Sara K."]);

const saraView = await read("sara", "SELECT nickname FROM profiles WHERE user_id = 'sara'");
const omarView = await read("omar", "SELECT nickname FROM profiles WHERE user_id = 'sara'");
console.log("Sara (just wrote) reads from", saraView.from, "→", saraView.rows[0].nickname);
console.log("Omar (no recent write) reads from", omarView.from, "→", omarView.rows[0].nickname, "(slightly stale is fine for him)");

await replica.query("SELECT pg_wal_replay_resume()");
await primary.end();
await replica.end();
```

**Output:**

```text
Sara (just wrote) reads from primary → Sara K.
Omar (no recent write) reads from replica → Sara (slightly stale is fine for him)
```

- After Sara's write, her session remembers the primary's LSN. Her next read checks whether the replica has replayed that far; it has not (replay is paused to make the lag visible), so her read goes to the **primary** and shows "Sara K.".
- Omar has made no recent write, so his read uses the replica — and sees the old nickname for a moment. For him, that is acceptable; for Sara, it would look like a bug.
- The same idea scales up: store the LSN in the user's session or a cookie, check one replica (or several), and fall back to the primary only when needed. Many frameworks and proxies offer similar "sticky to primary after write" behaviour.

Related guarantees users expect: **monotonic reads** (a user never sees data go backwards because consecutive reads hit replicas with different lag — pin a user to one replica) and **consistent prefix** (seeing an answer only after its question). These are the practical faces of the consistency models in {{ch:distributed-systems}}.

## Failover and high availability

### Level 4 — When the primary fails

A highly available setup must:

1. **Detect** that the primary is down — reliably, without mistaking a slow network for a failure.
2. **Choose** a replica to promote — preferably the one with the least lag (or a synchronous one, which has every acknowledged commit).
3. **Promote** it (`pg_promote()` in PostgreSQL), making it accept writes.
4. **Redirect** applications to the new primary — through DNS, a virtual IP, a proxy, or a managed endpoint that moves automatically.
5. **Fence** the old primary so that, if it comes back, it cannot accept writes.
6. **Rebuild** the old primary as a replica of the new one.

Tools such as **Patroni** (with etcd or Consul for consensus), **repmgr** and cloud-managed failover automate this. Managed services typically fail over in tens of seconds to a couple of minutes; applications must reconnect and retry, so connection pools need sensible timeouts and retry logic ({{ch:error-handling}}).

**What can be lost**: with asynchronous replication, commits the old primary acknowledged but had not yet sent are gone — your **RPO** is "the replication lag at the moment of failure". With synchronous replication to the promoted replica, acknowledged commits survive.

### Level 4 — Split brain

The most dangerous failure is **split brain**: the network between the primary and the rest of the system breaks, a replica is promoted, and the old primary — still running, still reachable by some application servers — keeps accepting writes. Now two databases diverge, and reconciling them may be impossible without data loss. Defences:

- **Consensus** on who the primary is (a majority vote through etcd, Consul or ZooKeeper — Patroni's approach) rather than each node deciding alone ({{ch:distributed-systems}}).
- **Fencing**: the old primary is forcibly stopped, or loses its right to accept writes, before (or as) the new one is promoted.
- **A single routing point** (a proxy or managed endpoint) that only ever points at one primary.

### Level 4 — RPO and RTO

High availability is designed from two business numbers:

- **RPO (recovery point objective)**: how much recent data may be lost — seconds (asynchronous replicas), zero (synchronous replication), minutes or hours (backups only).
- **RTO (recovery time objective)**: how long the service may be down — seconds to minutes (automatic failover), hours (restore from backup).

Lower numbers cost more: synchronous replicas, more servers, more regions, more operational complexity. A shop's product catalogue and a bank's ledger deserve different answers ({{ch:observability-and-incidents}}).

## Other kinds of replication

### Level 4 — Logical, multi-primary and cross-region

- **Logical replication** sends row-level changes for chosen tables (PostgreSQL publications and subscriptions), rather than the whole physical log. Uses: replicating a subset of tables, zero-downtime **major version upgrades** (replicate to a new-version server, then switch), feeding data to other systems, and **change data capture** (tools such as Debezium stream changes to Kafka for search indexes, caches and analytics, {{ch:event-driven-systems}}).
- **Multi-primary** (multi-master) replication lets several nodes accept writes. It brings **write conflicts** — two regions changing the same row — which must be resolved by rules such as "last write wins" (which silently discards data) or application logic. Some distributed SQL databases (CockroachDB, Spanner, YugabyteDB) avoid conflicts with consensus-based replication at the cost of write latency. For most applications, a single primary is far simpler.
- **Cross-region replicas** provide disaster recovery and lower read latency for distant users. Replication across continents is asynchronous in practice (light is slow), so cross-region failover usually accepts some data loss, and is often a deliberate, manual decision.

### Level 3 — Replication is not a backup

A replica faithfully copies **every** change — including `DELETE FROM orders` without a `WHERE`, a buggy migration, or ransomware encrypting data. Within milliseconds, the mistake exists everywhere. Recovering from such errors needs **backups with point-in-time recovery** ({{ch:postgresql}}), kept separately and tested by restoring. (A **delayed replica**, deliberately kept, say, an hour behind with `recovery_min_apply_delay`, can help catch mistakes quickly, but it is a supplement to backups, not a replacement.)

## From beginner to enterprise

**Level 1–2 — first replica.** Understanding primary and replica roles; a managed database with a standby or read replica enabled; knowing replicas are read-only and slightly behind.

**Level 3 — application-aware replication.** Separate read and write connection pools; routing only staleness-tolerant reads to replicas; read-your-writes handling; monitoring replication lag; backups kept independent of replication.

**Level 4 — high availability.** Automatic failover with consensus and fencing; a synchronous replica for zero-data-loss requirements; applications that reconnect and retry; RPO and RTO agreed with the business; failover drills.

**Level 5 — senior practice.** Dedicated replicas for analytics; logical replication for upgrades and selective copies; change data capture feeding other systems; capacity planning for replica lag under peak writes.

**Level 6 — enterprises.** Multi-region architectures with regional read replicas and disaster-recovery sites; distributed SQL where global writes are essential; tested regional failovers; compliance-driven data placement ({{ch:database-scaling}}).

## Real-world use cases

### Offloading a busy shop

- **Situation**: product pages and admin reports compete with checkout for database capacity.
- **Design**: two read replicas behind a reader endpoint for product and search pages; a third replica dedicated to reporting and exports; checkout, account and admin writes on the primary; read-your-writes for account pages; alerts when lag exceeds 5 seconds.

### Surviving a data-centre failure

- **Design**: primary in one availability zone, a synchronous standby in a second, asynchronous replica in a third; automatic failover through the managed service; application connection pools with short timeouts and retries; RPO zero for acknowledged writes, RTO under two minutes; quarterly failover drills.

## Common mistakes

### Beginner: treating replication as a backup

**Consequence:** mistakes replicate instantly; nothing to restore. **Fix:** independent, tested backups with point-in-time recovery.

### Beginner: writing to a replica (or a connection that might be one)

**Fix:** separate pools; writes only to the primary endpoint.

### Intermediate: sending every read to replicas

**Consequence:** stale reads after writes; decisions made on old data. **Fix:** route by use case; read-your-writes.

### Intermediate: ignoring replication lag

**Fix:** monitor lag in seconds and bytes; alert on thresholds; investigate causes (long queries, heavy writes, network).

### Intermediate: long-running reports on the replicas serving users

**Fix:** dedicated reporting replicas or a warehouse.

### Production: failover without fencing

**Consequence:** split brain and divergent data. **Fix:** consensus-based failover tools or managed services; one routing point.

### Production: never testing failover

**Consequence:** discovering broken reconnection logic during a real outage. **Fix:** regular drills.

### Production: synchronous replication with a single synchronous replica

**Consequence:** writes stop when that replica fails. **Fix:** `ANY 1 (…)` with several candidates, or accept asynchronous risk explicitly.

## Debugging and troubleshooting

- **Users report "my change disappeared, then came back"**: reads hitting lagging replicas — add read-your-writes routing or pin users to the primary briefly after writes.
- **Lag keeps growing**: the replica cannot keep up (heavy writes, underpowered replica, slow disk), or long queries are blocking replay — check `pg_stat_replication` on the primary (`replay_lag`) and conflicts on the replica.
- **Queries on replicas are cancelled with "canceling statement due to conflict with recovery"**: replay needed to remove rows the query was reading — move long queries to a dedicated replica, or tune `max_standby_streaming_delay` / `hot_standby_feedback` knowing their trade-offs.
- **Application errors for a minute during failover**: expected — make sure pools reconnect, idempotent operations retry, and DNS or endpoint caching is short.
- **Disk filling on the primary**: a replication slot held by a disconnected replica is retaining WAL — remove unused slots or reconnect the replica.

## Security summary

- **Encrypt replication traffic** (TLS) and restrict which hosts may connect for replication.
- Use **dedicated replication roles** with only replication privileges.
- Replicas contain **all the data**: apply the same access controls, encryption at rest and auditing as the primary.
- **Cross-region replicas** may move data across borders — check data-residency requirements.
- Remember that replication spreads malicious or accidental changes instantly; **backups** and **delayed replicas** are the recovery tools.

## How a senior engineer thinks about this

- **Every replica is slightly in the past.** They decide, per query, whether the past is acceptable.
- **Availability is a business decision.** RPO and RTO drive the choice of synchronous or asynchronous replication, number of replicas and regions.
- **Failover is a process, not a switch.** Detection, promotion, fencing, redirection and recovery are automated and rehearsed.
- **Split brain is worse than downtime.** Consensus and fencing come before speed.
- **Replicas complement backups.** Recovery from mistakes always needs point-in-time backups.

## Exercises

### Exercise 1 — Route the queries

**Objective:** practise deciding where reads go.
**What to do:** for each query, choose primary or replica: (1) the product listing for anonymous visitors; (2) the customer's order page immediately after checkout; (3) checking a voucher's remaining uses before redeeming it; (4) the monthly sales report; (5) the admin dashboard's "orders in the last hour" counter; (6) loading a user's password hash during login.

<details>
<summary>Show the solution</summary>

1. **Replica** — staleness of seconds is harmless.
2. **Primary** (or a replica that has replayed the checkout's LSN) — read-your-writes; the order must appear.
3. **Primary** — the decision feeds a write; better still, an atomic conditional update on the primary ({{ch:transactions}}).
4. **Replica** — ideally a dedicated reporting replica, so the long query does not affect users.
5. **Replica** — a slightly delayed counter is acceptable; label it "updated a few seconds ago" if needed.
6. **Primary** (usually) — after a password change, a lagging replica could accept the old password or reject the new one; at minimum, use read-your-writes for security-critical reads.

</details>

### Exercise 2 — Choose the replication mode

**Objective:** practise RPO/RTO reasoning.
**What to do:** a shop processes payments and orders; losing an acknowledged order is unacceptable, but a few seconds of extra write latency is not. Product browsing must stay fast worldwide. Propose a replication design and explain the trade-offs.

<details>
<summary>Show the solution</summary>

- **Primary** in the main region.
- **Synchronous standby** in another availability zone of the same region (`ANY 1` of two standbys if possible), with `synchronous_commit = on`: acknowledged orders survive a primary failure (**RPO 0**); the added latency is one round trip within the region (typically a millisecond or two).
- **Automatic failover** through a managed service or Patroni with fencing: **RTO** of one to two minutes; applications retry idempotently.
- **Asynchronous read replicas** in other regions for product browsing (or, often simpler, CDN caching of product pages, {{ch:caching}}); they may lag by seconds, which browsing tolerates.
- **Backups with point-in-time recovery**, stored in another region.
- **Trade-offs**: if both synchronous standbys are unavailable, writes block — monitored and alerted; cross-region disaster recovery from asynchronous replicas would lose the last seconds, accepted as a manual, rare decision.

</details>

### Exercise 3 — Review a replica set-up

**Objective:** practise spotting replication risks.
**The scenario:** a team added one replica and pointed the whole application's `DATABASE_URL` at a load balancer that spreads connections across the primary and the replica. Nightly analytics run on the same replica. Failover is "we'll promote the replica manually if needed". Backups were turned off "because we have a replica now". List the problems and fixes.

<details>
<summary>Show the solution</summary>

1. **One URL spreading connections across primary and replica** → writes sent to the replica fail; reads after writes may be stale. Separate write (primary) and read (replica) endpoints; route by query type.
2. **Analytics on the user-facing replica** → replay conflicts, cancelled queries, growing lag. A dedicated reporting replica or warehouse.
3. **Manual, unpractised failover** → long outages and risk of split brain if the old primary returns. Automated failover with fencing (managed service or Patroni), plus drills.
4. **Backups disabled** → no recovery from accidental deletes, bad migrations or corruption, which replicate instantly. Re-enable backups with point-in-time recovery; test restores.
5. Also: no lag monitoring or alerting; a single replica means no read capacity or redundancy during its maintenance.

</details>

### Exercise 4 — Production scenario: the failover that lost orders

**Objective:** practise post-incident analysis.
**The scenario:** the primary database crashed at 14:02. Automatic failover promoted a replica at 14:03. Afterwards, finance found 37 orders that customers had received confirmation emails for but which do not exist in the database. Explain what happened and what to change.

<details>
<summary>Show the solution</summary>

**What happened:** replication was **asynchronous**. Those 37 orders were committed and acknowledged on the old primary (so confirmation emails were sent), but their WAL had not yet reached the replica when the primary crashed. The promoted replica never received them — RPO was "a few seconds of commits", which nobody had agreed to.

**Immediate actions:**
1. Try to recover the old primary's data files or WAL (if the disk survived) and extract the missing transactions to reconcile.
2. Use other evidence — payment provider records, email logs, application logs — to reconstruct the orders, and contact affected customers.

**Changes:**
- Use **synchronous replication** to at least one standby in another zone for order and payment data (RPO 0 for acknowledged commits).
- Send confirmation emails from an **outbox** only after commit — still not protection against async loss, which is why the synchronous standby matters ({{ch:queues}}).
- Agree RPO and RTO explicitly with the business; monitor replication lag continuously.
- Rehearse failover and verify data afterwards; write a blameless post-incident review ({{ch:observability-and-incidents}}).

</details>

## Summary

**Replication** keeps copies of a database on several servers. A **primary** accepts writes and streams its change log (PostgreSQL's WAL) to **replicas**, which replay it and can serve read-only queries. Replicas improve **availability** (a replica can take over when the primary fails) and **read capacity** (reads spread across copies), but they are always slightly behind: **replication lag** means reads from replicas may return old data.

**Asynchronous** replication keeps writes fast but can lose the most recent commits on failover; **synchronous** replication waits for at least one replica, giving zero loss for acknowledged commits at the cost of latency and of blocking when no synchronous replica is available. Applications route only staleness-tolerant reads to replicas, keep writes and decision-making reads on the primary, and provide **read-your-writes** — for example, by tracking the WAL position of a user's last write and using the primary until a replica has replayed it.

**Failover** must detect failure, promote the best replica, redirect clients and **fence** the old primary to prevent **split brain**, guided by agreed **RPO** and **RTO** targets and rehearsed regularly. **Logical replication** copies selected tables and enables upgrades and change data capture; multi-primary setups bring write conflicts; cross-region replicas aid disaster recovery and are usually asynchronous. Above all, **replication is not a backup**: mistakes replicate instantly, so independent backups with point-in-time recovery remain essential.

## Key terms

- **Replication** — Continuously copying data changes from one database server to others.
- **Primary** — The server in a replication setup that accepts writes.
- **Replica** — A server that receives and applies changes from the primary, usually serving reads.
- **Hot standby** — A replica that answers read-only queries while replaying changes.
- **Streaming replication** — Continuously sending the primary's change log to replicas.
- **LSN (log sequence number)** — A position in PostgreSQL's write-ahead log.
- **Asynchronous replication** — Replication where the primary confirms commits without waiting for replicas.
- **Synchronous replication** — Replication where the primary waits for replica confirmation before confirming commits.
- **Replication lag** — How far a replica is behind the primary.
- **Read replica** — A replica used to serve read traffic.
- **Read-your-writes consistency** — The guarantee that users see their own recent writes.
- **Monotonic reads** — The guarantee that a user never sees data move backwards in time.
- **Failover** — Promoting a replica to primary after the primary fails.
- **Promotion** — Turning a replica into a primary that accepts writes.
- **Fencing** — Preventing a failed or isolated former primary from accepting writes.
- **Split brain** — Two servers both acting as primary and accepting conflicting writes.
- **RPO (recovery point objective)** — The maximum acceptable amount of data loss.
- **RTO (recovery time objective)** — The maximum acceptable time to restore service.
- **Patroni** — A tool that manages PostgreSQL high availability using a consensus store.
- **Logical replication** — Replicating row-level changes for selected tables.
- **Change data capture (CDC)** — Streaming a database's changes to other systems.
- **Multi-primary replication** — Replication where several nodes accept writes, requiring conflict resolution.
- **Delayed replica** — A replica intentionally kept behind the primary to allow recovery from mistakes.
- **Replication slot** — A PostgreSQL mechanism that keeps WAL until a replica has received it.

## What comes next

Replicas copy the whole database; they do not make any single table smaller. The next chapter, {{ch:partitioning}}, covers splitting very large tables into partitions inside one database — by range, list or hash — so that queries touch less data, old data can be dropped instantly, and maintenance stays manageable as tables grow to billions of rows.
