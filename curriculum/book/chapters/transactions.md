# Transactions: All or Nothing

> [!GOALS]
> - Explain what a transaction is and the four **ACID** guarantees: atomicity, consistency, isolation and durability.
> - Use `BEGIN`, `COMMIT`, `ROLLBACK` and **savepoints**, from SQL and from application code.
> - Recognise the concurrency bugs that appear when many users change data at once: **lost updates**, **write skew**, non-repeatable reads and phantoms.
> - Understand PostgreSQL's **isolation levels** and what each one prevents.
> - Choose between **atomic updates**, **pessimistic locking** (`SELECT … FOR UPDATE`), **optimistic locking** (version numbers) and **serializable** transactions with retries.
> - Understand **deadlocks** and how to avoid them, and keep transactions short and safe in production.

## Why this matters

A customer checks out. The application must create the order, add its items, reduce stock for each product, and record the payment. If the server crashes after reducing stock but before saving the order, stock vanishes. If the payment record fails to save, the order exists but nobody knows it was paid. Doing these steps "one at a time and hoping" eventually produces exactly these half-finished states, because servers crash, networks drop and constraints fail.

Now add concurrency. Two customers buy the last bag of coffee at the same moment. Both see "1 in stock"; both orders succeed; stock becomes −1 — or, worse, silently stays at 0 with two orders to fulfil. Two support agents edit the same product at once, and one agent's changes disappear without a trace. These bugs never appear in development, where one person clicks one button at a time; they appear in production, under load, and are miserable to reproduce.

**Transactions** are the database's answer to both problems: a group of changes that happens **completely or not at all**, isolated from other transactions running at the same time. Using them correctly — and knowing exactly what they do and do not protect against — is fundamental to building any system that handles money, stock, bookings or anything else people care about.

This chapter's SQL examples run in PostgreSQL; the concurrency examples open several real connections to a PostgreSQL server at once, so every race condition shown actually happened.

## The simple idea

Think of moving house with a removal company that promises: "Either everything arrives at the new house, or nothing leaves the old one." No half-empty houses, no boxes lost on the road. That is **atomicity**.

Now imagine two removal companies working in the same building at the same time, each carrying boxes up and down the same stairs. They need rules so they do not take each other's boxes or block the stairs for ever. That is **isolation** — and the rules (who waits for whom, who checks what before moving) are where the interesting problems are.

> [!ANALOGY]
> A transaction is like a removal company's guarantee: either all your boxes arrive at the new house, or none leave the old one. Isolation is the set of rules that stops two removal teams working in the same building from mixing up each other's boxes.
>
> **Where the analogy breaks:** real removal teams can see each other and talk. Database transactions cannot — each one works with a snapshot of the data or waits on invisible locks, and the database must decide automatically who waits, who proceeds and who must start again. Some conflicts are only detected at the very end, when one transaction is told: "your work is cancelled, please retry".

## The proper definition and key words

A **transaction** is a sequence of database operations executed as a single unit of work: either all its changes are made permanent (**commit**) or none are (**rollback**), and its interaction with concurrent transactions is governed by an **isolation level**.

Key words:

- **ACID** — the four guarantees of transactions:
  - **Atomicity** — all or nothing.
  - **Consistency** — a transaction takes the database from one valid state to another; constraints hold at commit.
  - **Isolation** — concurrent transactions do not interfere beyond what the isolation level allows.
  - **Durability** — once committed, changes survive crashes ({{ch:postgresql}} explains the write-ahead log behind this).
- **Commit** — make a transaction's changes permanent and visible to others.
- **Rollback** — undo all of a transaction's changes.
- **Savepoint** — a marker inside a transaction you can roll back to without abandoning the whole transaction.
- **Isolation level** — how strongly a transaction is shielded from others: read committed, repeatable read, serializable.
- **Lock** — a mechanism that makes other transactions wait before changing (or sometimes reading) the same data.
- **Race condition** — a bug whose outcome depends on the timing of concurrent operations.
- **Deadlock** — two or more transactions each waiting for a lock the other holds, so none can proceed.
- **Optimistic concurrency control** — proceed without locks, and detect conflicts when saving.
- **Pessimistic concurrency control** — lock data before changing it, so conflicts cannot happen.

## Atomicity: all or nothing

### Level 1 — `BEGIN`, `COMMIT`, `ROLLBACK`

```sql
CREATE TABLE accounts (
  id       integer PRIMARY KEY,
  owner    text NOT NULL,
  balance  numeric(10, 2) NOT NULL CHECK (balance >= 0)
);
INSERT INTO accounts VALUES (1, 'Sara (store credit)', 50.00), (2, 'Shop', 0.00);
```

**Result:**

```text
INSERT 0 2
```

A transfer is two updates that must happen together:

```sql
BEGIN;
UPDATE accounts SET balance = balance - 20 WHERE id = 1;
UPDATE accounts SET balance = balance + 20 WHERE id = 2;
COMMIT;
SELECT * FROM accounts ORDER BY id;
```

**Result:**

```text
 id |        owner        | balance
----+---------------------+---------
  1 | Sara (store credit) |   30.00
  2 | Shop                |   20.00
(2 rows)
```

Between `BEGIN` and `COMMIT`, other sessions do not see the changes; at `COMMIT`, both become visible at once. Now a transfer that fails half-way:

```sql
BEGIN;
UPDATE accounts SET balance = balance + 100 WHERE id = 2;     -- succeeds
UPDATE accounts SET balance = balance - 100 WHERE id = 1;     -- violates CHECK (balance >= 0)
```

**Result:**

```text
ERROR:  new row for relation "accounts" violates check constraint "accounts_balance_check"
```

```sql
ROLLBACK;
SELECT * FROM accounts ORDER BY id;
```

**Result:**

```text
 id |        owner        | balance
----+---------------------+---------
  1 | Sara (store credit) |   30.00
  2 | Shop                |   20.00
(2 rows)
```

The first update succeeded inside the transaction, but the second failed, and the rollback undid **both**: the shop did not receive £100 that never left Sara's account. In PostgreSQL, once any statement fails, the whole transaction is marked as failed — further statements are refused until you `ROLLBACK` — which prevents accidentally committing half of it.

Outside an explicit `BEGIN`, every statement runs in its own transaction (**autocommit**): a single `UPDATE` is always all-or-nothing, even if it changes a million rows.

### Level 2 — Savepoints: partial rollback

Sometimes one step may fail and the rest should continue — for example, importing orders where a bad row should be skipped, not abort the whole batch. A **savepoint** marks a point to roll back to:

```sql
BEGIN;
UPDATE accounts SET balance = balance + 5 WHERE id = 1;
SAVEPOINT before_bonus;
UPDATE accounts SET balance = balance - 1000 WHERE id = 2;     -- fails the CHECK
```

**Result:**

```text
ERROR:  new row for relation "accounts" violates check constraint "accounts_balance_check"
```

```sql
ROLLBACK TO SAVEPOINT before_bonus;
COMMIT;
SELECT * FROM accounts ORDER BY id;
```

**Result:**

```text
 id |        owner        | balance
----+---------------------+---------
  1 | Sara (store credit) |   35.00
  2 | Shop                |   20.00
(2 rows)
```

The failed update was undone, the earlier one kept, and the transaction committed. ORMs often use savepoints to implement "nested transactions".

### Level 3 — Transactions from application code

A transaction belongs to **one connection**: every statement in it must go through the same connection. With the `pg` driver, borrow a client from the pool, run `BEGIN` … `COMMIT`, roll back on any error, and always release the client:

```ts
// fragment
export async function withTransaction<T>(pool: Pool, work: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

const orderId = await withTransaction(pool, async (tx) => {
  const { rows: [order] } = await tx.query("INSERT INTO orders (customer_id) VALUES ($1) RETURNING id", [customerId]);
  for (const item of items) {
    const res = await tx.query(
      "UPDATE products SET stock = stock - $1 WHERE id = $2 AND stock >= $1",
      [item.quantity, item.productId],
    );
    if (res.rowCount === 0) throw new OutOfStock(item.productId);          // rolls back the whole order
    await tx.query("INSERT INTO order_items (order_id, product_id, quantity) VALUES ($1, $2, $3)",
      [order.id, item.productId, item.quantity]);
  }
  return order.id;
});
```

The most common bug here is using `pool.query()` inside the "transaction": each call may use a **different** connection, so the statements are not in the transaction at all. ORMs provide their own transaction helpers (`prisma.$transaction`, `dataSource.transaction`) that handle this ({{ch:prisma}}, {{ch:typeorm}}).

**Keep transactions short.** A transaction holds locks and keeps old row versions alive until it ends ({{ch:postgresql}}). Never wait for a user, call a slow external API or send email inside a transaction. If a payment provider must be called, record the intent in the transaction, call the provider outside it, and record the result in another short transaction — or use the outbox pattern ({{ch:queues}}).

## Concurrency: when transactions meet

### Level 2 — The lost update

The most common concurrency bug is **read–modify–write** in application code: read a value, compute a new one, write it back. Two customers buy green tea at the same moment, each with their own connection:

```ts
import pg from "pg";

const url = process.env.DATABASE_URL ?? "postgresql://postgres@localhost:5432/postgres";
const setup = new pg.Client(url);
await setup.connect();
await setup.query(`DROP TABLE IF EXISTS products; CREATE TABLE products (sku text PRIMARY KEY, stock int NOT NULL CHECK (stock >= 0));`);

async function run(label: string, sell: (c: pg.Client) => Promise<void>) {
  await setup.query(`TRUNCATE products; INSERT INTO products VALUES ('TEA-GRN', 10)`);
  const a = new pg.Client(url), b = new pg.Client(url);
  await Promise.all([a.connect(), b.connect()]);
  await Promise.all([sell(a), sell(b)]);                      // two customers buy one each, at the same moment
  const { rows } = await setup.query(`SELECT stock FROM products WHERE sku = 'TEA-GRN'`);
  console.log(`${label.padEnd(34)} stock after 2 sales: ${rows[0].stock}`);
  await Promise.all([a.end(), b.end()]);
}

// 1. Read, compute in the application, write back: the classic lost update
await run("read-modify-write (no locking)", async (c) => {
  await c.query("BEGIN");
  const { rows } = await c.query(`SELECT stock FROM products WHERE sku = 'TEA-GRN'`);
  await new Promise((r) => setTimeout(r, 300));               // both customers have now read 10
  await c.query(`UPDATE products SET stock = $1 WHERE sku = 'TEA-GRN'`, [rows[0].stock - 1]);
  await c.query("COMMIT");
});

// 2. Let the database do the arithmetic atomically
await run("atomic UPDATE stock = stock - 1", async (c) => {
  await c.query(`UPDATE products SET stock = stock - 1 WHERE sku = 'TEA-GRN' AND stock >= 1`);
});

// 3. Lock the row while reading it (pessimistic locking)
await run("SELECT ... FOR UPDATE", async (c) => {
  await c.query("BEGIN");
  const { rows } = await c.query(`SELECT stock FROM products WHERE sku = 'TEA-GRN' FOR UPDATE`);
  await new Promise((r) => setTimeout(r, 300));
  await c.query(`UPDATE products SET stock = $1 WHERE sku = 'TEA-GRN'`, [rows[0].stock - 1]);
  await c.query("COMMIT");
});

await setup.end();
```

**Output:**

```text
read-modify-write (no locking)     stock after 2 sales: 9
atomic UPDATE stock = stock - 1    stock after 2 sales: 8
SELECT ... FOR UPDATE              stock after 2 sales: 8
```

- **Read–modify–write**: both transactions read 10, both computed 9, both wrote 9. Two items were sold; stock went down by one. Being inside a transaction did **not** prevent it — at the default isolation level, each statement sees the latest committed data, and nothing stops the second write from overwriting the first. This is the **lost update**.
- **Atomic update**: `stock = stock - 1` is computed by the database at the moment of the update. When two updates hit the same row, the second **waits** for the first to finish and then applies its change to the new value. `AND stock >= 1` ensures stock never goes below zero; the application checks how many rows were updated to know whether the sale succeeded. Whenever the change can be expressed in one statement, this is the simplest and best fix.
- **`SELECT … FOR UPDATE`**: reading the row with `FOR UPDATE` **locks** it. The second transaction's `SELECT … FOR UPDATE` waits until the first commits, then reads 9. The pause is there only to make the race certain to happen in the first version; the same race happens in real systems whenever two requests overlap.
- The examples connect to a PostgreSQL server given by `DATABASE_URL` (a local server, or one started with Docker, {{ch:docker}}).

### Level 3 — Optimistic locking with versions

Locking does not fit long "think time": a support agent opens a product page, edits for ten minutes and saves. Holding a lock (and a transaction) for ten minutes is unacceptable. **Optimistic locking** adds a version number to each row and makes saving conditional on the version not having changed:

```ts
import pg from "pg";

// Optimistic concurrency: no locks while the user edits; detect conflicts when saving
const url = process.env.DATABASE_URL ?? "postgresql://postgres@localhost:5432/postgres";
const db = new pg.Client(url);
await db.connect();
await db.query(`
  DROP TABLE IF EXISTS product_pages;
  CREATE TABLE product_pages (id int PRIMARY KEY, description text NOT NULL, version int NOT NULL DEFAULT 1);
  INSERT INTO product_pages VALUES (7, 'Green tea from Darjeeling.', 1);
`);

async function save(editor: string, id: number, expectedVersion: number, description: string) {
  const result = await db.query(
    `UPDATE product_pages SET description = $1, version = version + 1
     WHERE id = $2 AND version = $3
     RETURNING version`,
    [description, id, expectedVersion],
  );
  if (result.rowCount === 0) console.log(`${editor}: conflict — someone saved first; reload and reapply your change`);
  else console.log(`${editor}: saved, now version ${result.rows[0].version}`);
}

// Both editors open the page and see version 1
const { rows: [page] } = await db.query(`SELECT description, version FROM product_pages WHERE id = 7`);
console.log(`both editors loaded version ${page.version}: "${page.description}"`);

await save("Priya", 7, page.version, "Organic green tea from Darjeeling.");
await save("Jamal", 7, page.version, "Green tea from Darjeeling. Brew at 80°C.");
console.log((await db.query(`SELECT description, version FROM product_pages WHERE id = 7`)).rows[0]);
await db.end();
```

**Output:**

```text
both editors loaded version 1: "Green tea from Darjeeling."
Priya: saved, now version 2
Jamal: conflict — someone saved first; reload and reapply your change
{ description: 'Organic green tea from Darjeeling.', version: 2 }
```

Priya's save matched version 1 and bumped it to 2. Jamal's save still said "version 1", so it updated **no rows** — the application detects the conflict and tells Jamal, instead of silently erasing Priya's change. Over HTTP, the same idea uses `ETag` and `If-Match` headers, with `412 Precondition Failed` for conflicts ({{ch:rest-apis}}). Most ORMs support version columns directly.

**Optimistic or pessimistic?** Optimistic locking suits low-conflict data and long edits (no locks held, conflicts handled by the user or a retry). Pessimistic locking suits short, high-conflict operations where retrying is expensive (reserving the last seats, allocating sequential numbers).

### Level 4 — Write skew: when each transaction is right and both together are wrong

Not every race involves two writes to the same row. The shop has a rule: **at least one delivery driver must stay on duty**. Two drivers, Priya and Jamal, both ask to go off duty at the same moment. Each transaction checks the rule ("two drivers on duty — fine") and updates **its own** row:

```ts
import pg from "pg";

// Write skew: each transaction checks a rule, then writes, and together they break it.
// Rule: at least one delivery driver must stay on duty.
const url = process.env.DATABASE_URL ?? "postgresql://postgres@localhost:5432/postgres";
const setup = new pg.Client(url);
await setup.connect();

async function tryBothGoOffDuty(isolation: "READ COMMITTED" | "SERIALIZABLE") {
  await setup.query(`
    DROP TABLE IF EXISTS drivers;
    CREATE TABLE drivers (name text PRIMARY KEY, on_duty boolean NOT NULL);
    INSERT INTO drivers VALUES ('Priya', true), ('Jamal', true);
  `);
  let checked = 0, release!: () => void;
  const bothChecked = new Promise<void>((r) => (release = r));
  const goOffDuty = async (name: string, writeDelay: number) => {
    const c = new pg.Client(url);
    await c.connect();
    try {
      await c.query(`BEGIN ISOLATION LEVEL ${isolation}`);
      const { rows } = await c.query(`SELECT count(*)::int AS n FROM drivers WHERE on_duty`);
      if (++checked === 2) release();
      await bothChecked;                                     // both have now seen 2 drivers on duty
      await new Promise((r) => setTimeout(r, writeDelay));   // Priya writes first, Jamal a moment later
      if (rows[0].n < 2) { await c.query("ROLLBACK"); return `${name}: refused, would leave nobody on duty`; }
      await c.query(`UPDATE drivers SET on_duty = false WHERE name = $1`, [name]);
      await c.query("COMMIT");
      return `${name}: went off duty`;
    } catch (err) {
      await c.query("ROLLBACK");
      return `${name}: ${(err as pg.DatabaseError).code} ${(err as Error).message}`;
    } finally {
      await c.end();
    }
  };
  const results = await Promise.all([goOffDuty("Priya", 0), goOffDuty("Jamal", 100)]);
  const { rows } = await setup.query(`SELECT count(*)::int AS n FROM drivers WHERE on_duty`);
  console.log(`${isolation}:`);
  for (const r of results.sort()) console.log(`  ${r}`);
  console.log(`  drivers on duty afterwards: ${rows[0].n}`);
}

await tryBothGoOffDuty("READ COMMITTED");
await tryBothGoOffDuty("SERIALIZABLE");
await setup.end();
```

**Output:**

```text
READ COMMITTED:
  Jamal: went off duty
  Priya: went off duty
  drivers on duty afterwards: 0
SERIALIZABLE:
  Jamal: 40001 could not serialize access due to read/write dependencies among transactions
  Priya: went off duty
  drivers on duty afterwards: 1
```

- At **read committed** (PostgreSQL's default), both checks saw two drivers, both updates touched different rows (so neither waited), and both committed: **nobody is on duty**. This is **write skew**. Row locks cannot help — no row was written twice.
- At **serializable**, PostgreSQL tracks what each transaction **read** and wrote. It detected that the two transactions could not have produced this result if they had run one after the other, and failed Jamal's with error **`40001` (serialization failure)**. Priya went off duty; Jamal must retry — and his retry will see one driver on duty and be refused.
- The same pattern causes double bookings ("is the slot free?" then insert), overspending ("is there enough budget?" then spend), and duplicate usernames checked in code. Fixes: **constraints** where the rule can be expressed (unique indexes, exclusion constraints, {{ch:postgresql}}), **locking** the rows (or a parent row) the decision depends on, or **serializable** isolation with retries.

### Level 3 — Isolation levels

The SQL standard defines isolation levels by the anomalies they allow. PostgreSQL implements three (asking for `READ UNCOMMITTED` gives read committed):

| Anomaly | Read committed (default) | Repeatable read | Serializable |
|---|---|---|---|
| **Dirty read** — seeing another transaction's uncommitted changes | Prevented | Prevented | Prevented |
| **Non-repeatable read** — reading the same row twice and getting different values | Possible | Prevented | Prevented |
| **Phantom read** — re-running a query and getting new rows | Possible | Prevented in PostgreSQL | Prevented |
| **Lost update** (concurrent read–modify–write) | Possible | Detected: second writer fails with `40001` | Detected |
| **Write skew** | Possible | Possible | Detected: one transaction fails with `40001` |

- **Read committed**: each **statement** sees data committed before it began. Simple and fast; concurrent writes to the same row wait for each other. Correctness relies on atomic statements, constraints and explicit locks.
- **Repeatable read**: the whole **transaction** sees one snapshot taken at its first query — ideal for reports that run several queries and need them to agree. If it tries to update a row another transaction changed after its snapshot, it fails with a serialization error instead of overwriting.
- **Serializable**: the result is guaranteed to be the same as running the transactions one at a time in some order. PostgreSQL achieves this by detecting dangerous patterns and aborting one transaction — so **every serializable transaction needs retry logic**.

Set the level per transaction: `BEGIN ISOLATION LEVEL SERIALIZABLE;` (or the ORM's option).

### Level 4 — Retrying serialization failures

Serialization failures (`40001`) and deadlocks (`40P01`) are **normal events** under concurrency, not bugs: the database is protecting correctness. The right response is to retry the **whole transaction** from the beginning, a few times, with a short randomised backoff ({{ch:queues}}):

```ts
// fragment
async function withSerializableRetry<T>(work: (tx: PoolClient) => Promise<T>, attempts = 5): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN ISOLATION LEVEL SERIALIZABLE");
      const result = await work(client);
      await client.query("COMMIT");
      return result;
    } catch (err) {
      await client.query("ROLLBACK");
      const code = (err as { code?: string }).code;
      if ((code === "40001" || code === "40P01") && attempt < attempts) {
        await new Promise((r) => setTimeout(r, Math.random() * 50 * attempt));   // jittered backoff
        continue;
      }
      throw err;
    } finally {
      client.release();
    }
  }
}
```

The transaction's code must have **no side effects outside the database** (no emails sent, no external API calls), because it may run several times.

## Locks and deadlocks

### Level 3 — What locks PostgreSQL takes

- **Row locks**: `UPDATE`, `DELETE` and `SELECT … FOR UPDATE` lock the rows they touch until the transaction ends; other writers of those rows wait. Plain `SELECT`s never wait for row locks — thanks to MVCC, readers see the last committed version ({{ch:postgresql}}).
- Variants: `FOR NO KEY UPDATE` (weaker, used by ordinary updates), `FOR SHARE` (others may read-lock but not change), `NOWAIT` (fail immediately instead of waiting) and **`SKIP LOCKED`** (ignore locked rows — perfect for work queues, where each worker takes the next unlocked job):

```sql
-- fragment
-- Each worker grabs a different pending job; no two workers get the same one
BEGIN;
SELECT id, payload FROM jobs
WHERE status = 'pending'
ORDER BY created_at
LIMIT 1
FOR UPDATE SKIP LOCKED;
-- ... process, then:
UPDATE jobs SET status = 'done' WHERE id = $1;
COMMIT;
```

- **Table locks**: schema changes such as `ALTER TABLE` take strong locks that block other access — which is why migrations need care ({{ch:database-design}}).
- **Advisory locks**: application-defined locks on arbitrary numbers (`pg_advisory_xact_lock(42)`), useful for "only one instance runs this job" ({{ch:cron-jobs}}).

### Level 4 — Deadlocks

Two transfers run at once: A moves money from account 1 to account 2, B from 2 to 1. A locks account 1, B locks account 2; then A waits for account 2 (held by B) and B waits for account 1 (held by A). Neither can ever proceed:

```ts
import pg from "pg";

// Deadlock: two transfers lock the same two accounts in opposite orders
const url = process.env.DATABASE_URL ?? "postgresql://postgres@localhost:5432/postgres";
const setup = new pg.Client(url);
await setup.connect();
await setup.query(`
  DROP TABLE IF EXISTS accounts;
  CREATE TABLE accounts (id int PRIMARY KEY, balance numeric(10,2) NOT NULL);
  INSERT INTO accounts VALUES (1, 100), (2, 100);
`);

const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function transfer(label: string, from: number, to: number, startDelay: number, orderedLocks: boolean) {
  const c = new pg.Client(url);
  await c.connect();
  await pause(startDelay);
  try {
    await c.query("BEGIN");
    const [first, second] = orderedLocks ? [Math.min(from, to), Math.max(from, to)] : [from, to];
    await c.query(`UPDATE accounts SET balance = balance + (CASE WHEN id = $2 THEN -10 ELSE 10 END) WHERE id = $1`, [first, from]);
    await pause(200);                                        // the other transfer locks its first account meanwhile
    await c.query(`UPDATE accounts SET balance = balance + (CASE WHEN id = $2 THEN -10 ELSE 10 END) WHERE id = $1`, [second, from]);
    await c.query("COMMIT");
    return `${label}: committed`;
  } catch (err) {
    await c.query("ROLLBACK");
    return `${label}: ${(err as pg.DatabaseError).code} ${(err as Error).message}`;
  } finally {
    await c.end();
  }
}

for (const ordered of [false, true]) {
  await setup.query(`UPDATE accounts SET balance = 100`);
  const results = await Promise.all([transfer("A (1 → 2)", 1, 2, 0, ordered), transfer("B (2 → 1)", 2, 1, 50, ordered)]);
  const { rows } = await setup.query(`SELECT id, balance FROM accounts ORDER BY id`);
  console.log(ordered ? "locking accounts in id order:" : "locking accounts in transfer order:");
  for (const r of results) console.log(`  ${r}`);
  console.log(`  balances: ${rows.map((r) => `${r.id}=${r.balance}`).join(", ")}`);
}
await setup.end();
```

**Output:**

```text
locking accounts in transfer order:
  A (1 → 2): 40P01 deadlock detected
  B (2 → 1): committed
  balances: 1=110.00, 2=90.00
locking accounts in id order:
  A (1 → 2): committed
  B (2 → 1): committed
  balances: 1=100.00, 2=100.00
```

- PostgreSQL detects the cycle (after waiting `deadlock_timeout`, one second by default) and aborts one transaction with **`40P01` (deadlock detected)**, letting the other finish. A's transfer was cancelled and rolled back; B's went through (account 2 sent 10 to account 1).
- The fix is to **acquire locks in a consistent order**: here, always lock the lower account id first. Both transfers then queue for the same first lock, and no cycle is possible — both commit, and the two opposite transfers cancel out.
- Other ways to reduce deadlocks: keep transactions short, touch fewer rows, and update rows in a consistent order (for example, sort product ids before reserving stock for a multi-item order). Treat the remaining rare deadlocks like serialization failures: retry.

## Patterns for correctness

### Level 4 — Choosing the right tool

| Situation | Best tool |
|---|---|
| Change expressible as one statement (counters, stock, balances) | **Atomic `UPDATE … SET x = x - 1 WHERE … AND x >= 1`**, check rows affected |
| Rule about uniqueness or non-overlap | **Constraints**: unique index, exclusion constraint |
| Multi-step change to a few rows, short duration | **`SELECT … FOR UPDATE`** (in consistent order) inside a transaction |
| User edits over minutes; conflicts rare | **Optimistic locking** with a version column (or `ETag` / `If-Match`) |
| Decision depends on a set of rows (write skew) | Lock a parent row, or **serializable** isolation with retries |
| Work queue with many workers | **`FOR UPDATE SKIP LOCKED`** |
| Report needing a consistent view across several queries | **Repeatable read** (read-only) |
| One instance of a job at a time | **Advisory lock** or unique run records ({{ch:cron-jobs}}) |
| Change spans the database and an external system | Not a database transaction: **outbox**, idempotency keys, sagas ({{ch:queues}}, {{ch:microservices}}) |

The last row matters: a transaction covers **one database**. Charging a card and saving the order are two systems; no `BEGIN` makes them atomic. Distributed transactions (two-phase commit) exist but are rarely used in web systems; instead, design with idempotent steps, records of intent, and compensating actions ({{ch:distributed-systems}}).

## From beginner to enterprise

**Level 1–2 — first transactions.** Grouping related changes with `BEGIN`/`COMMIT`; rollback on error; understanding autocommit; savepoints.

**Level 3 — correct application code.** Transactions on a single connection with helpers that always release; atomic updates instead of read–modify–write; optimistic locking for edits; `SELECT … FOR UPDATE` for short critical sections; keeping transactions short with no external calls inside.

**Level 4 — concurrency-aware design.** Recognising write skew; choosing isolation levels; serializable transactions with retry logic; consistent lock ordering; `SKIP LOCKED` queues; constraints as concurrency control.

**Level 5 — production practice.** Monitoring lock waits, deadlocks and serialization failure rates; timeouts (`lock_timeout`, `statement_timeout`, `idle_in_transaction_session_timeout`); load tests that exercise concurrency; outbox and idempotency patterns across systems.

**Level 6 — enterprises.** Distributed systems with sagas and compensations; globally consistent databases (for example, Spanner-style systems) where needed; formal reasoning or model checking for critical concurrent workflows.

## Real-world use cases

### Checkout without overselling

- **Design**: one transaction creates the order and, for each item in **sorted product order**, runs `UPDATE products SET stock = stock - $q WHERE id = $id AND stock >= $q`; if any update affects zero rows, roll back and report which product is out of stock. Payment is authorised **before** the transaction (with an idempotency key) and captured after commit; failures trigger a refund job.
- **Why it works**: atomic updates and the stock condition make overselling impossible; consistent ordering prevents deadlocks between multi-item orders; no external calls hold the transaction open.

### Booking the last delivery slot

- **Design**: slots are rows with a `capacity`; booking runs `UPDATE delivery_slots SET booked = booked + 1 WHERE id = $1 AND booked < capacity`, inserting the booking only when a row was updated. Alternatively, an exclusion constraint on vans and time ranges ({{ch:postgresql}}).
- **Why it works**: the check and the change are one atomic statement; no window between "is it free?" and "take it".

## Common mistakes

### Beginner: no transaction around related changes

**Consequence:** half-finished orders after errors and crashes. **Fix:** one transaction per business operation.

### Beginner: statements of one "transaction" on different connections

`pool.query()` calls inside a supposed transaction. **Fix:** a single client (or the ORM's transaction helper).

### Beginner: read–modify–write in application code

**Consequence:** lost updates. **Fix:** atomic updates, row locks or version checks.

### Intermediate: assuming the default isolation level prevents all races

**Fix:** know what read committed allows; use constraints, locks or serializable for write skew.

### Intermediate: external calls inside transactions

**Consequence:** long-held locks and connections; inconsistent state when the call succeeds but the commit fails. **Fix:** outbox, idempotency keys, separate short transactions.

### Intermediate: serializable without retries

**Consequence:** users see random errors under load. **Fix:** retry whole transactions on `40001` and `40P01`.

### Production: locking rows in inconsistent orders

**Consequence:** deadlocks under load. **Fix:** sort keys before locking.

### Production: forgotten open transactions

**Consequence:** locks held, vacuum blocked, connections exhausted. **Fix:** release in `finally`; `idle_in_transaction_session_timeout`; monitoring.

## Debugging and troubleshooting

- **"current transaction is aborted, commands ignored until end of transaction block"**: an earlier statement failed — roll back (or roll back to a savepoint) and find the first error.
- **Requests hang under load**: waiting on row locks — look at `pg_stat_activity` (`wait_event_type = 'Lock'`) and `pg_blocking_pids(pid)`; usually a long or idle-in-transaction session holds them.
- **Occasional `40P01 deadlock detected`**: inconsistent lock ordering — the PostgreSQL log shows both statements involved; sort keys or restructure, and retry the rest.
- **Rising `40001` errors after switching to serializable**: expected under contention; ensure retries, keep transactions small, and add indexes so PostgreSQL tracks fewer rows (serializable checks are coarser on sequential scans).
- **Stock or balances drift slightly over time**: a read–modify–write path somewhere — search the code for patterns that read a value and write back a computed one.

## Security summary

- **Atomicity protects financial integrity**: money and stock movements must never be half-applied.
- **Race conditions are security bugs**: double-spending vouchers, redeeming a gift card twice, or exceeding limits by sending parallel requests are real attacks against check-then-act code. Use atomic statements, constraints or locks for anything with value.
- **Idempotency keys** prevent replayed or retried requests from performing an action twice ({{ch:rest-apis}}).
- **Timeouts** stop a malicious or buggy client from holding locks and exhausting connections.
- **Audit important transitions** (refunds, balance changes) within the same transaction as the change ({{ch:database-design}}).

## How a senior engineer thinks about this

- **Every business operation is a transaction boundary.** They decide what must happen together — and keep everything else, especially external calls, outside.
- **Concurrency is the default, not the exception.** They ask "what if two requests do this at the same time?" for every write path.
- **Let the database enforce correctness.** Atomic statements and constraints first; locks and isolation levels where those cannot express the rule.
- **Failures under concurrency are normal.** Serialization failures and deadlocks are retried; users see success or a clear conflict message.
- **One database, one transaction.** Across systems, they design with idempotency, outboxes and compensations instead of pretending a transaction spans them.

## Exercises

### Exercise 1 — A transfer that cannot overdraw

**Objective:** practise atomic transactions in SQL.
**What to write:** using the `accounts` table from this chapter, write a transaction that moves £15 from Sara (account 1) to the shop (account 2) **only if** Sara has enough balance, without a separate read: use the number of rows updated to decide. Show the final balances.

<details>
<summary>Show the solution</summary>

```sql
BEGIN;
UPDATE accounts SET balance = balance - 15 WHERE id = 1 AND balance >= 15;
UPDATE accounts SET balance = balance + 15 WHERE id = 2;
COMMIT;
SELECT * FROM accounts ORDER BY id;
```

**Result:**

```text
 id |        owner        | balance
----+---------------------+---------
  1 | Sara (store credit) |   20.00
  2 | Shop                |   35.00
(2 rows)
```

**Walkthrough:** in SQL alone, the second update would run even if the first matched no rows, so real code checks the first statement's row count (the driver reports it) and rolls back if it is zero — exactly as the checkout example earlier in this chapter does with `rowCount === 0`. The condition `balance >= 15` is evaluated at the moment of the update, on the latest committed value, so concurrent transfers cannot overdraw the account. (The `CHECK (balance >= 0)` constraint is a second line of defence: even buggy code cannot store a negative balance.)

</details>

### Exercise 2 — Name the anomaly

**Objective:** practise recognising concurrency problems.
**What to do:** name the problem and a fix for each: (1) two agents change a customer's phone number at once; one change disappears; (2) a report sums the previous day's orders twice, and the second sum differs from the first within the same request; (3) two people register the username "sara" at the same moment and both succeed; (4) two warehouse workers both pick the same pending order from the queue; (5) two managers each approve a refund because "the daily refund total is under £500", and together they exceed it.

<details>
<summary>Show the solution</summary>

1. **Lost update** — optimistic locking with a version column (show a conflict message), or atomic updates of only the changed field.
2. **Non-repeatable read / inconsistent snapshot** — run the report's queries in one **repeatable read** transaction, or in one query.
3. **Race in check-then-insert** — a **unique constraint** (case-insensitive unique index); handle the duplicate-key error with a friendly message.
4. **Missing row locking in a queue** — `SELECT … FOR UPDATE SKIP LOCKED` (or an atomic `UPDATE … SET status = 'picking' WHERE id = (…) AND status = 'pending' RETURNING …`).
5. **Write skew** — serializable transactions with retries, or lock a shared row (for example, the day's refund budget row with `FOR UPDATE`) before checking and inserting.

</details>

### Exercise 3 — Fix the reservation code

**Objective:** practise correcting concurrent code.
**The scenario:** reserving stock for a multi-item order does this, for each item in the order the customer added them: `const p = await pool.query("SELECT stock FROM products WHERE id = $1")`; if `p.stock >= qty`, `await pool.query("UPDATE products SET stock = $1 WHERE id = $2", [p.stock - qty, id])`; finally it inserts the order. List the problems and write the corrected approach.

<details>
<summary>Show the solution</summary>

**Problems**
1. **No transaction** — a failure part-way leaves stock reduced without an order.
2. **`pool.query` for each statement** — even with `BEGIN`, the statements would use different connections.
3. **Read–modify–write** — concurrent orders overwrite each other's stock changes (lost updates, overselling).
4. **Items in customer order** — two multi-item orders can lock products in opposite orders and deadlock.

**Corrected approach**
- One transaction on one client (`withTransaction`).
- Sort items by product id.
- For each item: `UPDATE products SET stock = stock - $1 WHERE id = $2 AND stock >= $1`; if `rowCount === 0`, throw `OutOfStock` (rolls everything back).
- Insert the order and items in the same transaction; commit.
- Retry the whole transaction on `40P01` (rare, now that ordering is consistent).

</details>

### Exercise 4 — Production scenario: double-redeemed vouchers

**Objective:** practise diagnosing a race in production.
**The scenario:** finance reports that some single-use voucher codes were redeemed twice — always within the same second, usually by customers clicking "Pay" twice or using scripts. The code checks `SELECT redeemed_at FROM vouchers WHERE code = $1`, and if it is null, applies the discount and later runs `UPDATE vouchers SET redeemed_at = now() WHERE code = $1`. Explain the cause and fix it.

<details>
<summary>Show the solution</summary>

**Cause:** check-then-act with a window between the check and the update. Two requests both read `redeemed_at IS NULL`, both apply the discount, both update. Read committed does nothing to stop this.

**Fix:** make redemption a single atomic, conditional statement inside the checkout transaction, and use its result as the decision:

```sql
-- fragment
UPDATE vouchers
SET redeemed_at = now(), redeemed_by_order = $2
WHERE code = $1 AND redeemed_at IS NULL
RETURNING discount;
```

If no row is returned, the voucher was already used (or does not exist), and checkout fails with a clear message. Because the condition and the change happen together, only one of two simultaneous requests can succeed — the other's `UPDATE` waits for the first, then finds `redeemed_at` set and matches no rows. Additionally: an idempotency key on the checkout request (so a double click does not create two orders), a unique constraint on `redeemed_by_order` if a voucher can belong to only one order, and an alert on redemption anomalies. Finally, audit past double redemptions.

</details>

## Summary

A **transaction** groups operations into one unit that is **atomic** (all or nothing), **consistent** (constraints hold at commit), **isolated** (concurrent transactions interfere only as the isolation level allows) and **durable** (committed changes survive crashes). Use `BEGIN`, `COMMIT` and `ROLLBACK`, with **savepoints** for partial rollback; outside `BEGIN`, each statement is its own transaction. In code, run a transaction on **one connection**, roll back on error, always release, and keep it **short** — no user waits or external calls inside.

Concurrency creates bugs that transactions alone do not prevent at PostgreSQL's default **read committed** level: **lost updates** from read–modify–write in application code, and **write skew**, where each transaction checks a rule and together they break it. Fixes, in order of preference: **atomic updates** (`SET stock = stock - 1 WHERE stock >= 1`, checking rows affected) and **constraints**; **pessimistic locking** with `SELECT … FOR UPDATE` (and `SKIP LOCKED` for queues); **optimistic locking** with version columns for long edits; and **serializable** isolation, which detects dangerous interleavings and fails one transaction with `40001`. **Repeatable read** gives a consistent snapshot for multi-query reads.

**Deadlocks** occur when transactions lock rows in opposite orders; PostgreSQL aborts one with `40P01`. Lock in a consistent order, keep transactions small, and **retry** whole transactions — free of external side effects — on serialization failures and deadlocks. A transaction covers one database only; across systems, use idempotency keys, outboxes and compensating actions.

## Key terms

- **Transaction** — A group of database operations executed as one all-or-nothing unit.
- **ACID** — Atomicity, consistency, isolation and durability: the guarantees of transactions.
- **Atomicity** — The guarantee that all of a transaction's changes happen, or none do.
- **Consistency (ACID)** — The guarantee that a transaction leaves the database satisfying all constraints.
- **Isolation** — The degree to which concurrent transactions are shielded from each other.
- **Durability** — The guarantee that committed changes survive crashes.
- **Commit** — Making a transaction's changes permanent and visible.
- **Rollback** — Undoing all changes made by a transaction.
- **Autocommit** — Running each statement as its own transaction when no explicit transaction is open.
- **Savepoint** — A point inside a transaction that can be rolled back to without ending the transaction.
- **Isolation level** — The setting that defines which concurrency anomalies a transaction may experience.
- **Read committed** — An isolation level where each statement sees data committed before it began; PostgreSQL's default.
- **Repeatable read** — An isolation level where a transaction sees one consistent snapshot throughout.
- **Serializable** — An isolation level guaranteeing results equivalent to running transactions one at a time.
- **Dirty read** — Reading another transaction's uncommitted changes.
- **Non-repeatable read** — Getting different values when reading the same row twice in one transaction.
- **Phantom read** — Getting new rows when re-running the same query in one transaction.
- **Lost update** — One transaction's write overwriting another's because both read the same old value.
- **Write skew** — Two transactions each making a valid decision from shared data, together violating a rule.
- **Race condition** — A bug whose outcome depends on the timing of concurrent operations.
- **Row lock** — A lock on specific rows that makes other writers wait.
- **SELECT … FOR UPDATE** — A query that locks the rows it reads until the transaction ends.
- **SKIP LOCKED** — An option that makes a locking query skip rows locked by others.
- **Advisory lock** — An application-defined lock identified by a number.
- **Pessimistic locking** — Locking data before changing it so conflicts cannot occur.
- **Optimistic locking** — Detecting conflicts at write time, typically with a version column.
- **Deadlock** — Transactions waiting for each other's locks in a cycle, so none can proceed.
- **Serialization failure** — An error (`40001`) aborting a transaction to preserve serializable or repeatable-read guarantees.
- **Lock ordering** — Acquiring locks in a consistent order to prevent deadlocks.
- **Two-phase commit** — A protocol for atomic commits across several systems, rarely used in web applications.

## What comes next

Transactions keep data correct; the next step is keeping queries fast as data and traffic grow. The next chapter, {{ch:query-optimization}}, goes deeper into how PostgreSQL plans and executes queries: reading `EXPLAIN ANALYZE` in detail, join algorithms, statistics and estimates, rewriting slow queries, pagination at scale, the N+1 problem from the database's side, and a systematic process for finding and fixing slow queries in production.
