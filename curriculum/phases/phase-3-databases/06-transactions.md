# Phase 3 — Chapter 6: Transactions & ACID

---

## Chapter Overview

A database transaction is a unit of work that is treated atomically — all operations succeed or none do. ACID guarantees ensure data remains consistent even under concurrent access and system failures.

**ACID:**
- **A**tomicity — all or nothing
- **C**onsistency — data moves from one valid state to another
- **I**solation — concurrent transactions don't interfere
- **D**urability — committed transactions survive crashes

---

## Beginner Theory

### ACID Explained

```
Atomicity:
  Example: bank transfer — debit A AND credit B must both happen
  Guarantee: if credit fails, debit is rolled back
  Implementation: transaction log (WAL) + ROLLBACK

Consistency:
  The database must satisfy all constraints at end of transaction
  Example: FK constraints, CHECK constraints, UNIQUE constraints
  Implementation: constraint checking before COMMIT

Isolation:
  Concurrent transactions appear to run sequentially
  Example: two users booking the last seat shouldn't both succeed
  Implementation: locks, MVCC

Durability:
  Once committed, data survives power failure
  Implementation: Write-Ahead Log (WAL) flushed to disk before COMMIT returns

Without ACID (eventual consistency):
  Acceptable for: social media likes, view counters, non-critical data
  Not acceptable for: financial transactions, inventory, medical records
```

### Transaction Isolation Levels

```
READ UNCOMMITTED:
  Can read data modified by other transactions not yet committed (dirty reads)
  Rarely used. Not supported in PostgreSQL (treated as READ COMMITTED)

READ COMMITTED (PostgreSQL default):
  Only reads committed data
  Problem: non-repeatable reads — same query returns different data within one txn
           because other transactions committed between your reads

REPEATABLE READ:
  Same query always returns same data within one transaction
  Problem: phantom reads — a new row matching your WHERE clause appears
           (inserted by another committed transaction)

SERIALIZABLE (strongest):
  Transactions appear to run one at a time, in serial order
  Prevents: dirty reads, non-repeatable reads, phantom reads, serialization anomalies
  Cost: highest locking overhead, potential for serialization errors (retry needed)

PostgreSQL isolation level summary:
  READ COMMITTED  → default, adequate for most applications
  REPEATABLE READ → use for multi-read transactions needing consistency
  SERIALIZABLE    → use for financial, inventory, any "count then update" pattern
```

---

## Basic Examples

### Basic Transactions

```javascript
// Using pg (Node.js)
const { Pool } = require("pg");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Transfer money between accounts
async function transfer(fromId, toId, amount) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Check balance
    const { rows: [from] } = await client.query(
      "SELECT balance FROM accounts WHERE id = $1 FOR UPDATE",
      [fromId]
    );
    if (!from || from.balance < amount) throw new Error("Insufficient funds");

    // Debit
    await client.query(
      "UPDATE accounts SET balance = balance - $1 WHERE id = $2",
      [amount, fromId]
    );

    // Credit
    await client.query(
      "UPDATE accounts SET balance = balance + $1 WHERE id = $2",
      [amount, toId]
    );

    // Audit log
    await client.query(
      "INSERT INTO transfers (from_id, to_id, amount) VALUES ($1, $2, $3)",
      [fromId, toId, amount]
    );

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
```

### Reusable Transaction Helper

```javascript
async function withTransaction(pool, fn, isolationLevel = "READ COMMITTED") {
  const client = await pool.connect();
  try {
    await client.query(`BEGIN ISOLATION LEVEL ${isolationLevel}`);
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

// Usage
const order = await withTransaction(pool, async (client) => {
  const { rows: [order] } = await client.query(
    "INSERT INTO orders (user_id, total) VALUES ($1, $2) RETURNING *",
    [userId, total]
  );

  for (const item of items) {
    const { rowCount } = await client.query(
      `UPDATE products
       SET stock = stock - $1
       WHERE id = $2 AND stock >= $1`,
      [item.quantity, item.productId]
    );
    if (!rowCount) throw new Error(`Product ${item.productId} out of stock`);

    await client.query(
      "INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES ($1,$2,$3,$4)",
      [order.id, item.productId, item.quantity, item.price]
    );
  }

  return order;
});
```

---

## Intermediate Concepts

### Optimistic vs. Pessimistic Locking

```sql
-- PESSIMISTIC LOCKING (FOR UPDATE)
-- Lock the row immediately, preventing other transactions from reading it
-- Use when: high contention, can't afford a race condition

BEGIN;
SELECT * FROM inventory WHERE product_id = $1 FOR UPDATE;  -- lock row
-- Other transactions trying to read/update this row will WAIT
UPDATE inventory SET quantity = quantity - 1 WHERE product_id = $1;
COMMIT;

-- FOR UPDATE SKIP LOCKED — job queue pattern
-- Select and lock the first available job, skip any already locked
BEGIN;
SELECT * FROM jobs
WHERE status = 'pending'
ORDER BY created_at
LIMIT 1
FOR UPDATE SKIP LOCKED;
-- Process the job
UPDATE jobs SET status = 'processing' WHERE id = $1;
COMMIT;

-- OPTIMISTIC LOCKING (version column)
-- Don't lock the row; instead check a version counter when updating
-- Use when: low contention, reads far outnumber writes

CREATE TABLE products (
  id      UUID    PRIMARY KEY,
  stock   INTEGER NOT NULL,
  version INTEGER NOT NULL DEFAULT 1
);

-- Read
SELECT id, stock, version FROM products WHERE id = $1;  -- got version = 5

-- Update — only if version hasn't changed
UPDATE products
SET stock = $1, version = version + 1
WHERE id = $2 AND version = $3;  -- $3 = 5

-- If 0 rows affected → concurrent modification occurred → retry
```

### Savepoints

```sql
BEGIN;

INSERT INTO orders (...) RETURNING id;  -- order_id = 'abc'

SAVEPOINT order_created;  -- mark point

INSERT INTO order_items (...);  -- this might fail

-- If item insert fails:
ROLLBACK TO order_created;  -- undo items, keep order
-- OR
ROLLBACK;                    -- undo everything

COMMIT;
```

### Serialization Anomaly

```javascript
// The Lost Update problem without SERIALIZABLE
// Two users both add 1 to a counter:
// T1: read count (5) → T2: read count (5) → T1: write 6 → T2: write 6
// Result: 6 instead of 7!

// Fix: use SERIALIZABLE isolation
await withTransaction(pool, async (client) => {
  const { rows: [{ count }] } = await client.query(
    "SELECT count FROM post_views WHERE post_id = $1",
    [postId]
  );
  await client.query(
    "UPDATE post_views SET count = $1 WHERE post_id = $2",
    [count + 1, postId]
  );
}, "SERIALIZABLE");

// Or simpler: use atomic UPDATE (no read needed)
await pool.query(
  "UPDATE post_views SET count = count + 1 WHERE post_id = $1",
  [postId]
);
// Single UPDATE is always atomic — no race condition!
```

---

## Advanced Concepts

### Deadlocks

```sql
-- Deadlock: T1 holds lock on A, wants B; T2 holds B, wants A
-- Database detects the cycle and kills one transaction (throws error)
-- Client must RETRY

-- Prevention: always acquire locks in the same order
-- ✓ Always lock lower ID first:
BEGIN;
SELECT * FROM accounts WHERE id = LEAST($1, $2) FOR UPDATE;
SELECT * FROM accounts WHERE id = GREATEST($1, $2) FOR UPDATE;
-- Now T1 and T2 always acquire locks in the same order → no deadlock
```

---

## Interview Preparation

**Q1: Explain ACID properties with a real-world example.**
A: Using a bank transfer: Atomicity — debit Alice and credit Bob must both succeed, or neither happens. If the system crashes after debiting Alice but before crediting Bob, the rollback ensures Alice gets her money back. Consistency — constraints are satisfied: no account can go below zero (CHECK constraint), and the total money in the system remains constant. Isolation — if Alice and Bob both transfer to Charlie simultaneously, each transfer sees a consistent view of Charlie's balance; they don't interfere. Durability — once the transfer is committed and the user sees "Transfer successful," it survives a power outage or server restart.

**Q2: What is the difference between optimistic and pessimistic locking?**
A: Pessimistic locking (`SELECT FOR UPDATE`) locks the row immediately and holds the lock until the transaction commits — other readers/writers must wait. Best for high-contention scenarios where conflicts are likely. Optimistic locking uses a version column: read the row and version, perform work, then update with a WHERE clause checking the version is unchanged. If 0 rows affected, another transaction modified the data — retry. Best for low-contention scenarios where reads far outnumber writes, since it doesn't hold database locks (scales better).

**Q3: What causes a deadlock and how do you prevent it?**
A: A deadlock occurs when two transactions each hold a lock the other needs: T1 holds row A and wants row B; T2 holds row B and wants row A — neither can proceed. Databases detect the cycle and forcibly roll back one transaction (the "victim"). Prevention: always acquire locks in a consistent order (e.g., sort IDs and lock smallest first). Also minimize transaction size and duration — shorter transactions hold locks for less time, reducing deadlock probability.

---

## Practical Tasks

### Beginner (10 Tasks)
1. Write a transaction that transfers money between two accounts atomically.
2. Test a transaction by throwing an error and verifying the rollback.
3. Set the isolation level to SERIALIZABLE and verify it with a test.
4. Use `FOR UPDATE` to lock a row in a transaction.
5. Implement a `withTransaction()` helper function.
6. Demonstrate the lost update problem without a transaction.
7. Fix the lost update with an atomic UPDATE (no read needed).
8. Use SAVEPOINT to partially roll back within a transaction.
9. Read the `pg_locks` view to see active locks.
10. Handle a serialization error with retry logic.

### Intermediate (10 Tasks)
1. Implement optimistic locking with a `version` column.
2. Implement `SELECT FOR UPDATE SKIP LOCKED` for a job queue.
3. Detect a deadlock condition and implement consistent lock ordering.
4. Test REPEATABLE READ: show that a repeated SELECT returns the same data.
5. Implement inventory reservation with pessimistic locking.
6. Build a retry wrapper for serialization errors (40001 error code).
7. Implement multi-step transactions with savepoints.
8. Measure performance impact of SERIALIZABLE vs READ COMMITTED.
9. Implement double-entry ledger with transactions.
10. Use `pg_stat_activity` to detect long-running transactions.

### Advanced (10 Tasks)
1. Build a distributed transaction coordinator (2-phase commit concept).
2. Implement an optimistic locking decorator pattern for TypeScript.
3. Test all 4 isolation levels with concurrent transactions.
4. Implement the outbox pattern for transactional messaging.
5. Build a saga pattern for distributed transactions.
6. Measure and analyze lock contention in a high-concurrency scenario.
7. Implement CRDT-style conflict resolution for concurrent writes.
8. Build a transaction monitor that alerts on locks held > 5 seconds.
9. Implement event sourcing where events are the single source of truth.
10. Design a multi-database transaction with compensating transactions.

---

## Self Assessment
1. What does ACID stand for?
2. What is atomicity?
3. What is isolation?
4. What is a dirty read?
5. What is a phantom read?
6. What is the PostgreSQL default isolation level?
7. What is `SELECT FOR UPDATE`?
8. What is optimistic locking?
9. What causes a deadlock?
10. What is a savepoint?

---

## Cheat Sheet

```sql
-- Transaction
BEGIN [ISOLATION LEVEL READ COMMITTED | REPEATABLE READ | SERIALIZABLE];
SAVEPOINT name;
ROLLBACK TO name;
COMMIT;

-- Pessimistic lock
SELECT * FROM t WHERE id = $1 FOR UPDATE;
SELECT * FROM t WHERE status = 'pending' LIMIT 1 FOR UPDATE SKIP LOCKED;

-- Optimistic lock
UPDATE t SET col = $1, version = version + 1 WHERE id = $2 AND version = $3;
-- Check rowCount === 0 → concurrent modification → retry

-- Atomic increment (avoid read-modify-write race)
UPDATE t SET count = count + 1 WHERE id = $1;

-- Isolation comparison
-- READ COMMITTED:  default, prevents dirty reads
-- REPEATABLE READ: prevents non-repeatable reads
-- SERIALIZABLE:    prevents all anomalies, highest cost

-- PostgreSQL error codes
-- 40001: serialization failure (retry)
-- 40P01: deadlock detected (retry)
```
