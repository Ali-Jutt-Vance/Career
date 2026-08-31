# Phase 3 — Chapter 9: Database Replication

---

## Chapter Overview

Replication copies data from one database server (primary) to one or more replicas (secondaries). It provides: high availability (failover if primary dies), read scaling (distribute reads across replicas), and disaster recovery (replica in a different data center).

**Types:**
- **Streaming replication** — replicas receive WAL stream in near-real-time
- **Logical replication** — replicate specific tables, with transformations
- **Statement-based** (MySQL) — replicate SQL statements (fragile)
- **Row-based** (MySQL) — replicate actual row changes (reliable)

---

## Beginner Theory

### Replication Concepts

```
Primary (Leader):
  Handles all writes
  Streams WAL (Write-Ahead Log) to replicas
  
Replica (Follower / Secondary / Standby):
  Receives and applies WAL from primary
  Serves read queries
  Can be promoted to primary on failover

Replication Lag:
  Time between a write on primary and it appearing on replica
  Typically milliseconds to seconds
  Problem: reading from replica immediately after writing may see stale data

Synchronous vs. Asynchronous:
  Async (default):
    Primary commits without waiting for replica to confirm
    Zero write latency impact, but replica may be slightly behind
    Risk: if primary dies, recent commits may be lost
  
  Sync:
    Primary waits for at least one replica to confirm write
    Write latency increases (primary + network + replica + ack)
    Guarantee: committed data is on at least two nodes

Recovery Point Objective (RPO):
  Maximum acceptable data loss (async: seconds; sync: zero)

Recovery Time Objective (RTO):
  Maximum acceptable downtime for failover
```

---

## Basic Examples

### PostgreSQL Streaming Replication Setup

```bash
# On PRIMARY:
# postgresql.conf
wal_level = replica           # minimum for replication
max_wal_senders = 5           # max number of replicas
wal_keep_size = 1GB           # keep WAL files for replicas that lag

# pg_hba.conf — allow replica to connect
# host  replication  replicator  10.0.0.2/32  md5

# Create replication user
psql -U postgres
CREATE ROLE replicator REPLICATION LOGIN PASSWORD 'strongpass';

# On REPLICA:
pg_basebackup -h primary-host -D /var/lib/postgresql/data -U replicator -W -P --wal-method=stream

# postgresql.conf on replica
primary_conninfo = 'host=primary-host port=5432 user=replicator password=strongpass'
hot_standby = on              # allow reads on replica

# Create standby.signal file
touch /var/lib/postgresql/data/standby.signal

# Start PostgreSQL — it will automatically follow the primary
```

### Node.js Read/Write Split

```javascript
const { Pool } = require("pg");

// Primary pool (writes)
const primaryPool = new Pool({
  host:     process.env.DB_PRIMARY_HOST,
  port:     5432,
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max:      20
});

// Replica pools (reads)
const replicaPools = process.env.DB_REPLICA_HOSTS.split(",").map(host =>
  new Pool({ host, port: 5432, database: process.env.DB_NAME, user: process.env.DB_USER, password: process.env.DB_PASSWORD, max: 10 })
);

let replicaIndex = 0;
function getReplicaPool() {
  // Round-robin across replicas
  const pool = replicaPools[replicaIndex % replicaPools.length];
  replicaIndex++;
  return pool;
}

// Database client that routes queries appropriately
const db = {
  // Writes always go to primary
  async query(text, values) {
    return primaryPool.query(text, values);
  },

  // Reads can go to replica (use for non-critical reads)
  async readQuery(text, values) {
    try {
      return await getReplicaPool().query(text, values);
    } catch (err) {
      // Replica down — fall back to primary
      logger.warn("Replica query failed, falling back to primary", { err: err.message });
      return primaryPool.query(text, values);
    }
  }
};

// Usage
const user = await db.query("UPDATE users SET name=$1 WHERE id=$2 RETURNING *", [name, id]);
const users = await db.readQuery("SELECT id, name FROM users WHERE role=$1", ["admin"]);
```

---

## Intermediate Concepts

### Replication Lag Monitoring

```sql
-- On PRIMARY: check replication status
SELECT
  application_name,
  client_addr,
  state,
  sent_lsn,
  write_lsn,
  flush_lsn,
  replay_lsn,
  (sent_lsn - replay_lsn) AS lag_bytes,
  write_lag,
  flush_lag,
  replay_lag
FROM pg_stat_replication;

-- On REPLICA: check lag
SELECT
  now() - pg_last_xact_replay_timestamp() AS replication_lag,
  pg_is_in_recovery() AS is_replica;
```

### Logical Replication

```sql
-- Logical replication: replicate specific tables, with transformations
-- Use cases: cross-version upgrades, replicating to different databases, ETL

-- On source database:
-- postgresql.conf: wal_level = logical

-- Create publication
CREATE PUBLICATION my_pub FOR TABLE users, orders, products;
-- Or publish all tables: CREATE PUBLICATION my_pub FOR ALL TABLES;

-- On target database:
CREATE SUBSCRIPTION my_sub
CONNECTION 'host=source-host dbname=myapp user=replicator password=pass'
PUBLICATION my_pub;

-- Monitor logical replication
SELECT * FROM pg_stat_subscription;
SELECT * FROM pg_replication_slots;  -- check slot lag (WAL accumulates if subscriber falls behind)
```

---

## Advanced Concepts

### Failover with Patroni

```yaml
# Patroni manages PostgreSQL high availability automatically
# Uses etcd/Consul/ZooKeeper for distributed consensus

# patroni.yml
scope:      postgres-cluster
namespace:  /db/
name:       node1

etcd:
  host: etcd1:2379,etcd2:2379,etcd3:2379

bootstrap:
  dcs:
    ttl:               30
    loop_wait:         10
    retry_timeout:     10
    maximum_lag_on_failover: 1048576  # 1MB — don't promote if too far behind

postgresql:
  listen:         0.0.0.0:5432
  connect_address: node1-ip:5432
  data_dir:       /var/lib/postgresql/data
  parameters:
    wal_level:      replica
    max_wal_senders: 5
    hot_standby:    on

# Patroni automatically:
# 1. Monitors primary health
# 2. Promotes a replica if primary fails
# 3. Reconfigures other replicas to follow new primary
# 4. Prevents split-brain via distributed lock in etcd
```

---

## Interview Preparation

**Q1: What is the difference between synchronous and asynchronous replication?**
A: Asynchronous replication (default): the primary commits immediately and streams WAL to replicas without waiting for confirmation. Zero write latency impact, but if the primary fails before replicas receive the latest WAL, some data may be lost (RPO > 0). Synchronous replication: the primary waits for at least one replica to confirm receipt before returning success to the client. RPO = 0 (no data loss), but write latency increases by network round-trip time. Synchronous is used for critical data (financial transactions, audit records). Async is used for most applications where seconds of data loss are acceptable.

**Q2: What is replication lag and how do you handle it in your application?**
A: Replication lag is the delay between a write on the primary and that write becoming visible on a replica. In async replication, it's usually milliseconds, but can be seconds under heavy write load or network issues. Applications must handle lag: don't read-after-write from a replica (read your own writes must go to primary or use session sticky). For critical data (show user their own profile after update), use primary for that read. For analytics/reporting (show leaderboard, product counts), replica lag is acceptable. Monitor lag with `pg_stat_replication.replay_lag` and alert if it exceeds your threshold.

**Q3: What is a failover and how do you make it automatic?**
A: A failover is the process of promoting a replica to primary when the primary fails. Manual failover: a human runs `pg_promote()` on the chosen replica and updates connection strings. Automatic failover requires a high-availability tool like Patroni (PostgreSQL), ProxySQL/MHA (MySQL), or a managed service (AWS RDS Multi-AZ). Patroni uses etcd for distributed consensus — it detects primary failure through health checks and promotes the replica with the least lag, preventing split-brain (two nodes both believing they're primary). Applications connect via a load balancer (HAProxy) that Patroni updates to point to the current primary.

---

## Practical Tasks

### Beginner (10 Tasks)
1. Set up PostgreSQL streaming replication (primary + one replica) locally.
2. Verify the replica is receiving WAL (`pg_stat_replication`).
3. Write a read to the replica and verify it returns data.
4. Measure replication lag under load.
5. Query `pg_last_xact_replay_timestamp()` on the replica.
6. Test failover: stop the primary, verify the replica can be promoted.
7. Query `pg_stat_replication` to see lag bytes.
8. Implement basic read/write split in Node.js.
9. Add replica fallback to primary when replica is unavailable.
10. Monitor replication lag with a simple alerting script.

### Intermediate (10 Tasks)
1. Implement round-robin read distribution across multiple replicas.
2. Set up logical replication for selective table replication.
3. Handle read-after-write consistency (write to primary, read from primary for immediate reads).
4. Implement replication lag monitoring with alerting.
5. Test replication under high write load.
6. Set up a delayed replica (e.g., 1-hour delay) for disaster recovery.
7. Implement connection pooling with PgBouncer in front of replicas.
8. Configure synchronous replication for one replica.
9. Monitor logical replication slot lag.
10. Test replica promotion using `pg_promote()`.

### Advanced (10 Tasks)
1. Set up Patroni with etcd for automatic failover.
2. Implement HAProxy configuration for automatic primary routing.
3. Implement zero-downtime failover test.
4. Build a replication monitoring dashboard.
5. Implement PITR (Point-in-Time Recovery) using WAL archiving.
6. Set up multi-region replication (primary in US-East, replica in EU-West).
7. Implement connection routing that respects replication lag threshold.
8. Test split-brain prevention in a Patroni cluster.
9. Implement cross-version logical replication for a major PostgreSQL upgrade.
10. Build automated failover runbooks with health check thresholds.

---

## Self Assessment
1. What is the difference between a primary and a replica?
2. What is streaming replication?
3. What is replication lag?
4. What is the difference between sync and async replication?
5. What is RPO?
6. What is RTO?
7. What is a failover?
8. What is logical replication?
9. What does `hot_standby = on` do?
10. What is Patroni?

---

## Cheat Sheet

```sql
-- Primary: check replication
SELECT application_name, state, replay_lag FROM pg_stat_replication;

-- Replica: check lag
SELECT now() - pg_last_xact_replay_timestamp() AS lag;
SELECT pg_is_in_recovery();

-- Promote replica manually
SELECT pg_promote();

-- Logical replication
-- Source:
CREATE PUBLICATION pub FOR TABLE users, orders;
-- Target:
CREATE SUBSCRIPTION sub CONNECTION 'host=src dbname=db user=u password=p' PUBLICATION pub;
SELECT * FROM pg_stat_subscription;
```

```javascript
// Read/write split
const primary = new Pool({ host: "primary-host" });
const replica  = new Pool({ host: "replica-host" });
const db = {
  query:     (sql, vals) => primary.query(sql, vals),
  readQuery: async (sql, vals) => { try { return await replica.query(sql, vals); } catch { return primary.query(sql, vals); } }
};
```
