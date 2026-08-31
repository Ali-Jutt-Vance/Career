# Phase 3 — Chapter 11: Advanced Sharding Strategies

---

## Chapter Overview

Sharding is horizontal scaling of a database — distributing rows across multiple independent database servers. This chapter dives deeper: consistent hashing, resharding, cross-shard operations, global IDs, and real-world sharding architectures.

---

## Beginner Theory

### Consistent Hashing

```
Problem with simple hash sharding (hash(key) % N):
  When N changes (add a shard), almost all keys get a different shard!
  Must move (N-1)/N of all data — extremely expensive

Consistent hashing:
  Map both keys and shards onto a circle (hash ring, 0 to 2^32)
  Each key goes to the NEAREST shard clockwise
  Adding a shard: only move data from its immediate clockwise neighbor
  Only 1/N of data moves!

        0
     -------
    |       |
300 |   S1  | 100
    |       |
    |  S3   |
    |       |
200         
     -------
        S2

S1 handles: keys 0–100
S2 handles: keys 100–200
S3 handles: keys 200–300

Add S4 at position 150:
S2 shrinks: handles 100–150
S4 handles: 150–200 (only S2's data in 150-200 moves)
```

---

## Basic Examples

### Consistent Hashing Implementation

```javascript
// npm install consistent-hashring or implement manually

class ConsistentHashRing {
  #ring    = new Map();   // position → shard
  #sorted  = [];          // sorted positions
  #replicas;

  constructor(shards, replicas = 150) {
    this.#replicas = replicas;
    for (const shard of shards) this.addShard(shard);
  }

  #hash(key) {
    // FNV-1a 32-bit hash
    let hash = 2166136261;
    for (let i = 0; i < key.length; i++) {
      hash ^= key.charCodeAt(i);
      hash  = (hash * 16777619) >>> 0;
    }
    return hash;
  }

  addShard(shard) {
    for (let i = 0; i < this.#replicas; i++) {
      const pos = this.#hash(`${shard}:${i}`);
      this.#ring.set(pos, shard);
      this.#sorted.push(pos);
    }
    this.#sorted.sort((a, b) => a - b);
  }

  removeShard(shard) {
    for (let i = 0; i < this.#replicas; i++) {
      const pos = this.#hash(`${shard}:${i}`);
      this.#ring.delete(pos);
    }
    this.#sorted = this.#sorted.filter(p => this.#ring.has(p));
  }

  getShard(key) {
    if (this.#sorted.length === 0) throw new Error("No shards in ring");
    const hash = this.#hash(key);

    // Find first position >= hash (binary search)
    let lo = 0, hi = this.#sorted.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (this.#sorted[mid] < hash) lo = mid + 1;
      else hi = mid;
    }

    // Wrap around ring
    const pos = this.#sorted[lo % this.#sorted.length];
    return this.#ring.get(pos);
  }
}

const ring = new ConsistentHashRing(["shard-0", "shard-1", "shard-2", "shard-3"]);
const shard = ring.getShard(userId);  // "shard-2"

// Add shard — only ~25% of keys remapped
ring.addShard("shard-4");
```

### Global ID Generation (Snowflake)

```javascript
// Problem: auto-increment IDs per shard collide across shards
// Solution: globally unique IDs that encode timestamp + shard + sequence

class SnowflakeIDGenerator {
  #epoch       = 1700000000000n;   // custom epoch (ms)
  #machineId;
  #sequence    = 0n;
  #lastMs      = -1n;

  // Snowflake bit layout: 41 bits timestamp | 10 bits machine | 12 bits sequence
  // Total 63 bits (safe as JS BigInt or int64 in DB)
  #TIMESTAMP_BITS = 41n;
  #MACHINE_BITS   = 10n;
  #SEQUENCE_BITS  = 12n;
  #MAX_SEQUENCE   = (1n << this.#SEQUENCE_BITS) - 1n;

  constructor(machineId) {
    if (machineId >= 1024) throw new Error("Machine ID must be < 1024");
    this.#machineId = BigInt(machineId);
  }

  generate() {
    let ms = BigInt(Date.now()) - this.#epoch;

    if (ms === this.#lastMs) {
      this.#sequence = (this.#sequence + 1n) & this.#MAX_SEQUENCE;
      if (this.#sequence === 0n) {
        // Sequence exhausted — wait for next millisecond
        while (ms <= this.#lastMs) {
          ms = BigInt(Date.now()) - this.#epoch;
        }
      }
    } else {
      this.#sequence = 0n;
    }

    this.#lastMs = ms;

    return (
      (ms << (this.#MACHINE_BITS + this.#SEQUENCE_BITS)) |
      (this.#machineId << this.#SEQUENCE_BITS)           |
      this.#sequence
    ).toString();
  }
}

const idGen = new SnowflakeIDGenerator(machineId);
const id    = idGen.generate();  // "7312345678901234567"
// Sortable by time, unique across all machines, no coordination needed
```

---

## Intermediate Concepts

### Resharding

```javascript
// Moving data from one shard layout to another
// Must be zero-downtime in production

class Resharding {
  async reshard(oldRing, newRing, sourcePool, destPool) {
    // Phase 1: Dual-write (write to both old and new shards)
    this.dualWriteMode = true;

    // Phase 2: Copy data from old shards to new shards
    const batchSize = 1000;
    let lastId = null;

    while (true) {
      const rows = await this.fetchBatch(sourcePool, lastId, batchSize);
      if (rows.length === 0) break;

      for (const row of rows) {
        const newShard = newRing.getShard(row.id);
        const newPool  = destPool[newShard];
        await newPool.query(
          "INSERT INTO table_name VALUES ($1, $2, ...) ON CONFLICT DO NOTHING",
          [row.id, row.data, ...]
        );
      }

      lastId = rows[rows.length - 1].id;
      logger.info(`Resharded ${rows.length} rows, last ID: ${lastId}`);
    }

    // Phase 3: Switch reads to new shards (traffic migration)
    this.useNewShards = true;

    // Phase 4: Stop dual-write after verifying data consistency
    this.dualWriteMode = false;

    // Phase 5: Clean up old shards
  }
}
```

### Cross-Shard Operations

```javascript
// Scatter-gather for aggregate queries
class ShardedDatabase {
  async aggregateAcrossShards(sql, params) {
    // Fire query on all shards in parallel
    const results = await Promise.allSettled(
      this.shardPools.map(pool => pool.query(sql, params))
    );

    // Merge results (all shards)
    const rows = results
      .filter(r => r.status === "fulfilled")
      .flatMap(r => r.value.rows);

    return rows;
  }

  // Count across all shards
  async countTotal(table, where, params) {
    const counts = await this.aggregateAcrossShards(
      `SELECT COUNT(*) as c FROM ${table} WHERE ${where}`,
      params
    );
    return counts.reduce((sum, r) => sum + parseInt(r.c), 0);
  }
}

// For cross-shard JOINs: denormalize
// Instead of: orders JOIN products (products might be on different shard)
// Store product name + price in the order_items row (snapshot pattern)
```

---

## Advanced Concepts

### Two-Phase Commit (2PC) for Cross-Shard Transactions

```sql
-- 2PC: atomic commitment across multiple databases

-- Phase 1: PREPARE
-- On shard 1:
BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE id = 'account-A';
PREPARE TRANSACTION 'txn-transfer-001-shard1';

-- On shard 2:
BEGIN;
UPDATE accounts SET balance = balance + 100 WHERE id = 'account-B';
PREPARE TRANSACTION 'txn-transfer-001-shard2';

-- Phase 2: COMMIT (if both PREPAREs succeeded)
-- Coordinator commits on both shards:
COMMIT PREPARED 'txn-transfer-001-shard1';  -- shard 1
COMMIT PREPARED 'txn-transfer-001-shard2';  -- shard 2

-- If either PREPARE failed: ROLLBACK PREPARED on both
ROLLBACK PREPARED 'txn-transfer-001-shard1';
ROLLBACK PREPARED 'txn-transfer-001-shard2';

-- Note: 2PC is slow and the coordinator is a SPOF
-- Prefer: design schema to avoid cross-shard transactions
-- Alternative: Saga pattern (compensating transactions)
```

---

## Interview Preparation

**Q1: What is consistent hashing and why is it better than simple modulo hashing?**
A: Simple modulo sharding (`hash(key) % N`) requires remapping almost all data when N changes (adding a shard). With N=4 shards, adding a 5th shard means `hash(key) % 5` gives different results for ~80% of keys — requiring moving 80% of your data. Consistent hashing maps keys and shards on a hash ring. Adding a new shard only takes over data from its adjacent neighbor on the ring — about 1/N of total data moves. This makes it practical to add shards dynamically with minimal data movement.

**Q2: How do you handle transactions that span multiple shards?**
A: The proper answer is: design your schema to avoid cross-shard transactions. Use the same shard key to co-locate related data (user's orders should be on the same shard as the user). When cross-shard transactions are unavoidable, options are: Two-Phase Commit (2PC) — coordinator runs PREPARE on all shards then COMMIT — slow and has coordinator SPOF. Saga pattern — break the transaction into local transactions with compensating transactions on failure (eventual consistency). For many use cases, eventual consistency is acceptable.

**Q3: What is a global ID and why can't you use auto-increment across shards?**
A: Auto-increment IDs are local to each shard. Shard 1 and Shard 2 would both generate `id = 1`, causing conflicts if data is ever moved or merged. Solutions: UUID (universally unique, but large and not time-sortable), Snowflake IDs (Twitter's approach — encodes timestamp + machine ID + sequence in a 64-bit integer; globally unique, time-sortable, high throughput, no coordination needed), or UUID v7 (time-based ordering with random component — modern standard). Snowflake IDs are preferred for high-throughput sharded systems.

---

## Practical Tasks

### Beginner (10 Tasks)
1. Implement a simple hash shard router (`hash(userId) % 4`).
2. Implement a Snowflake ID generator.
3. Demonstrate consistent hashing by showing that adding a node moves fewer keys.
4. Test ID uniqueness across 4 "shards" using UUIDs.
5. Write a scatter-gather function that queries all shards.
6. Design a shard key selection strategy for an e-commerce app.
7. Identify which operations are safe with eventual consistency.
8. Explain what happens when you add a shard with simple modulo sharding.
9. Use a hash ring library to distribute 10,000 keys across 4 shards.
10. Count the key distribution per shard (should be roughly even).

### Intermediate (10 Tasks)
1. Implement consistent hashing ring from scratch.
2. Add/remove shards from the ring and count remapped keys.
3. Implement dual-write mode for zero-downtime resharding.
4. Build a cross-shard aggregate query with scatter-gather.
5. Implement the Saga pattern for a cross-shard order + inventory update.
6. Test cross-shard data consistency after a resharding operation.
7. Implement directory-based sharding (metadata table → shard mapping).
8. Build a global ID service that multiple services can call.
9. Handle shard failure with fallback and alerting.
10. Implement shard health monitoring and routing failover.

### Advanced (10 Tasks)
1. Implement fully zero-downtime resharding with dual-write and validation.
2. Build a multi-shard transaction coordinator using 2PC.
3. Implement Vitess-style shard management (schema-aware).
4. Build a read-through cache layer that spans shards.
5. Implement global secondary indexes across shards.
6. Design a cross-shard join using Bloom filter pre-filtering.
7. Build automated shard rebalancing based on shard load.
8. Implement shard routing at the database proxy layer (custom middleware).
9. Build a dashboard tracking key distribution across shards.
10. Compare CockroachDB, Citus, and Vitess for sharding — implement one.

---

## Self Assessment
1. What is sharding?
2. What is consistent hashing and why is it used?
3. What is a Snowflake ID?
4. What is resharding?
5. How do you handle cross-shard transactions?
6. What is the Saga pattern?
7. What is scatter-gather querying?
8. What is a shard key?
9. What is a hotspot and how do you prevent it?
10. What are the alternatives to building your own sharding?

---

## Cheat Sheet

```javascript
// Consistent hashing
const ring = new ConsistentHashRing(["shard-0", "shard-1", "shard-2"]);
const shard = ring.getShard(userId);

// Snowflake ID
const id = snowflakeGenerator.generate();  // sortable, globally unique

// Scatter-gather
const results = await Promise.all(shards.map(pool => pool.query(sql, params)));
const merged  = results.flatMap(r => r.rows);

// Dual write (resharding)
await newPool.query("INSERT ... ON CONFLICT DO NOTHING", [...]);

// 2PC
BEGIN; UPDATE ...; PREPARE TRANSACTION 'txn-id';
-- On success: COMMIT PREPARED 'txn-id';
-- On failure: ROLLBACK PREPARED 'txn-id';

// Design rule: put data that needs to be transactional on the same shard
// Use snapshot pattern to avoid cross-shard joins
```
