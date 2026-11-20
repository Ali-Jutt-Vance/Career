# Designing a Database

> [!GOALS]
> - Turn requirements into a data model: **entities**, **attributes** and **relationships** with the right **cardinality**.
> - Translate the model into tables, choosing **keys** (surrogate or natural, integer or UUID) and **constraints** deliberately.
> - Represent one-to-one, one-to-many, many-to-many and hierarchical relationships correctly.
> - Apply proven patterns: **snapshots** of changing data, status history, audit logs, soft deletes, money and time.
> - Avoid the classic design traps: polymorphic foreign keys, "entity–attribute–value" tables, everything-in-JSON.
> - Evolve a live schema safely with **migrations** and the expand–contract approach.

## Why this matters

Code is easy to change; data is not. A badly designed function can be rewritten in an afternoon. A badly designed table holds millions of rows that every part of the system reads and writes, and changing it means migrating that data while the application keeps running. Database design decisions made in the first week of a project often live for ten years.

The consequences of poor design show up everywhere: orders that change their total when a product's price changes, customers who appear twice with slightly different emails, reports that cannot be produced because the needed history was overwritten, deletions that orphan half the data, and queries that need six joins and a regular expression to answer a simple question. Good design prevents these problems before a single line of application code is written — the database makes invalid states impossible, keeps the history the business needs, and makes the common questions easy to ask.

This chapter is about thinking before creating tables: modelling the domain, choosing keys and relationships, encoding business rules as constraints, using patterns that have proven themselves in thousands of systems, and changing schemas safely later. The examples are real PostgreSQL ({{ch:postgresql}}), run in one session from start to finish.

## The simple idea

Designing a database is like designing a filing system for a business before the papers start arriving. You decide what kinds of folders exist (customers, orders, products), what each folder must contain, how folders refer to each other ("see customer folder 42"), which rules must never be broken (every order belongs to a real customer), and what must be kept for the record even when things change (the price the customer actually paid).

A good filing system makes everyday questions quick to answer and makes mistakes hard to make. A bad one works fine for the first hundred papers and becomes chaos at the hundred-thousandth.

> [!ANALOGY]
> Database design is like planning a business's filing system before the papers arrive: decide the types of folders, what each must contain, how they refer to each other, which rules can never be broken, and what must be kept even after things change.
>
> **Where the analogy breaks:** a paper filing system can be reorganised over a weekend while the office is closed. A database usually can never close: it must be reorganised **while** it is being used by thousands of requests per second, which is why schema changes are planned as careful, reversible steps rather than one big reorganisation.

## The proper definition and key words

**Database design** is the process of deciding how data will be structured — which tables, columns, keys, relationships and constraints exist — so that it stores the required information correctly, supports the needed queries efficiently, and can evolve over time.

Key words:

- **Entity** — a thing the business cares about that has its own identity: a customer, an order, a product.
- **Attribute** — a property of an entity: a customer's email, an order's status.
- **Relationship** — how entities connect: a customer **places** orders.
- **Cardinality** — how many of one entity relate to another: one-to-one, one-to-many, many-to-many.
- **Entity–relationship (ER) diagram** — a diagram of entities, attributes and relationships.
- **Surrogate key** — an artificial identifier with no business meaning (an identity integer or UUID).
- **Natural key** — an identifier with business meaning (an ISO country code, a SKU).
- **Junction table** (join table, associative entity) — a table that represents a many-to-many relationship.
- **Snapshot** — a copy of data taken at a moment so it does not change when the original does.
- **Soft delete** — marking a row as deleted instead of removing it.
- **Migration** — a versioned script that changes the schema (and sometimes data) from one version to the next.

## From requirements to a model

### Level 1 — Start with the questions and the rules

Before drawing tables, collect three kinds of information:

1. **What must be stored?** Customers with emails and addresses; products with prices and stock; orders with items, delivery addresses and payment status.
2. **What questions will be asked?** "Show a customer's orders, newest first." "What did we sell last month by category?" "Which orders are paid but not shipped?" Queries shape tables and indexes ({{ch:indexes}}).
3. **What rules must always hold?** "An email belongs to one customer." "An order has at least one item." "Stock cannot be negative." "A customer has at most one default address." Rules become constraints.

Talk to the people who know the domain. Words matter: if the business says "basket" before checkout and "order" after, those may be two different entities.

### Level 2 — Entities, relationships and cardinality

The core of the shop, as an ER diagram (crow's-foot notation: `|` means one, `<` means many, `o` means optional):

```text
  customers ||───o< addresses          one customer, zero or more addresses
  customers ||───o< orders             one customer, zero or more orders
  orders    ||───|< order_items        one order, one or more items
  products  ||───o< order_items        one product, in zero or more order items
  categories||───o< products           one category, zero or more products
  categories|o───o< categories         a category may have a parent category
  orders    ||───o< order_status_history
```

How each cardinality becomes tables:

| Cardinality | Example | Implementation |
|---|---|---|
| **One-to-many** | customer → orders | Foreign key on the "many" side: `orders.customer_id` |
| **Many-to-many** | orders ↔ products | Junction table `order_items (order_id, product_id, …)` |
| **One-to-one** | customer → loyalty account | Foreign key with `UNIQUE` (or the same primary key in both tables) |
| **Hierarchy** | category → parent category | Self-referencing foreign key `parent_id` |

A junction table often becomes a real entity with its own attributes: `order_items` has quantity and price; a `memberships` table joining users to teams has a role and a joining date.

One-to-one relationships deserve a question: why not one table? Good reasons include optional data that most rows lack, data with different access rules (sensitive fields in a separately protected table), or data owned by a different module.

## Keys

### Level 2 — Surrogate or natural keys

A **natural key** has business meaning: an email, a SKU, a tax number. A **surrogate key** is generated and meaningless: `id = 7`. Prefer **surrogate primary keys** for most entities, because natural values change (customers change emails; products are re-coded), are sometimes reused, and may be personal data you would rather not copy into every referencing table. Keep the natural identifier as a column with a **`UNIQUE`** constraint.

Natural keys are fine where values are truly stable and standard: ISO country codes (`GB`), currency codes (`GBP`), and junction tables whose key is the pair of foreign keys.

### Level 3 — Integer or UUID

| | Identity integer (`bigint`) | UUID |
|---|---|---|
| Size | 8 bytes | 16 bytes |
| Generated | By the database, in order | Anywhere (app, client, database) |
| In URLs | Reveals counts and allows guessing (`/orders/1043`) | Unguessable |
| Index performance | Excellent (always appends) | Random UUIDs (v4) scatter inserts; time-ordered UUIDs (v7) behave much better |
| Merging data from several databases | Collisions | No collisions |

A common, balanced approach: `bigint` identity primary keys internally, and a separate public identifier (a UUID, or a prefixed random string such as `ord_8Fq2…`) for URLs and APIs. Alternatively, UUID v7 primary keys throughout. Whatever you choose, use `bigint` rather than `integer` for tables that may grow large — running out of 2.1 billion ids in a busy table is a real, painful incident.

## Building the shop schema

### Level 2 — Constraints that express business rules

```sql
CREATE TABLE customers (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email       text NOT NULL,
  name        text NOT NULL CHECK (length(trim(name)) > 0),
  deleted_at  timestamptz
);
-- Emails are unique among customers who have not been deleted, regardless of letter case
CREATE UNIQUE INDEX customers_email_active ON customers (lower(email)) WHERE deleted_at IS NULL;

CREATE TABLE addresses (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  customer_id  bigint NOT NULL REFERENCES customers (id),
  line1        text NOT NULL,
  city         text NOT NULL,
  postcode     text NOT NULL,
  country      char(2) NOT NULL DEFAULT 'GB',
  is_default   boolean NOT NULL DEFAULT false
);
-- At most one default address per customer
CREATE UNIQUE INDEX addresses_one_default ON addresses (customer_id) WHERE is_default;

INSERT INTO customers (email, name) VALUES ('sara@example.com', 'Sara Khan'), ('omar@example.com', 'Omar Ali');
INSERT INTO addresses (customer_id, line1, city, postcode, is_default) VALUES
  (1, '12 High St', 'Leeds', 'LS1 4AB', true),
  (1, '3 Mill Lane', 'York', 'YO1 7HH', false);
```

**Result:**

```text
INSERT 0 2
```

Two business rules are now enforced by **partial unique indexes** — unique indexes that apply only to rows matching a condition:

```sql
INSERT INTO addresses (customer_id, line1, city, postcode, is_default) VALUES (1, '9 Park Rd', 'Leeds', 'LS6 2QQ', true);
```

**Result:**

```text
ERROR:  duplicate key value violates unique constraint "addresses_one_default"
```

```sql
INSERT INTO customers (email, name) VALUES ('Sara@Example.com', 'Sara Duplicate');
```

**Result:**

```text
ERROR:  duplicate key value violates unique constraint "customers_email_active"
```

- A customer cannot have two default addresses.
- Emails are unique **case-insensitively** (`lower(email)`), so `Sara@Example.com` is recognised as Sara's address — and only among non-deleted customers, so a deleted customer's email can be reused later.

Every rule enforced here is a rule that no bug, script or future developer can break. Application validation ({{ch:validation}}) gives friendly messages; database constraints give guarantees.

### Level 3 — Snapshots: what was true at the time

Product prices and names change. An order must keep what the customer actually bought and paid, so the order items store a **snapshot**:

```sql
CREATE TABLE products (
  id     bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  sku    text NOT NULL UNIQUE,
  name   text NOT NULL,
  price  numeric(10, 2) NOT NULL CHECK (price >= 0)
);

CREATE TABLE orders (
  id               bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  customer_id      bigint NOT NULL REFERENCES customers (id),
  delivery_address jsonb NOT NULL,                 -- snapshot of the address used
  status           text NOT NULL DEFAULT 'paid',
  placed_at        timestamptz NOT NULL
);

CREATE TABLE order_items (
  order_id    bigint NOT NULL REFERENCES orders (id),
  product_id  bigint NOT NULL REFERENCES products (id),
  name        text NOT NULL,                        -- snapshot
  unit_price  numeric(10, 2) NOT NULL,              -- snapshot
  quantity    integer NOT NULL CHECK (quantity > 0),
  line_total  numeric(12, 2) GENERATED ALWAYS AS (unit_price * quantity) STORED,
  PRIMARY KEY (order_id, product_id)
);

INSERT INTO products (sku, name, price) VALUES ('TEA-GRN', 'Green Tea', 4.20), ('SNK-OAT', 'Oat Biscuits', 2.50);

INSERT INTO orders (customer_id, delivery_address, placed_at)
SELECT 1, jsonb_build_object('line1', line1, 'city', city, 'postcode', postcode), '2026-10-01 10:00+00'
FROM addresses WHERE customer_id = 1 AND is_default;

INSERT INTO order_items (order_id, product_id, name, unit_price, quantity)
SELECT 1, id, name, price, q.quantity
FROM products JOIN (VALUES ('TEA-GRN', 2), ('SNK-OAT', 1)) AS q (sku, quantity) USING (sku);

-- Later: the price goes up, the product is renamed, and Sara moves house
UPDATE products SET price = 4.80, name = 'Organic Green Tea' WHERE sku = 'TEA-GRN';
UPDATE addresses SET line1 = '1 New Road', postcode = 'LS2 9JT' WHERE customer_id = 1 AND is_default;

SELECT oi.name AS ordered_as, oi.unit_price AS paid, p.name AS now_called, p.price AS price_now, o.delivery_address ->> 'line1' AS delivered_to
FROM order_items oi
JOIN products p ON p.id = oi.product_id
JOIN orders o ON o.id = oi.order_id
ORDER BY oi.product_id;
```

**Result:**

```text
  ordered_as  | paid |    now_called     | price_now | delivered_to
--------------+------+-------------------+-----------+--------------
 Green Tea    | 4.20 | Organic Green Tea |      4.80 | 12 High St
 Oat Biscuits | 2.50 | Oat Biscuits      |      2.50 | 12 High St
(2 rows)
```

The order still shows "Green Tea" at £4.20 delivered to 12 High St, although the product and the address changed afterwards. Copying data is usually something to avoid ({{ch:normalization}}), but here the copy is a **different fact**: not "what the product costs" but "what this customer was charged on this day". Invoices, contracts, prices, tax rates and addresses on shipped orders all need snapshots. Note also `line_total` as a **generated column**, computed by the database so it can never disagree with price and quantity.

### Level 3 — History: do not overwrite what you will need later

`orders.status` tells you the current state; it cannot tell you **when** the order shipped, or who cancelled it. If anyone will ask such questions, record changes as rows:

```sql
CREATE TABLE order_status_history (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id    bigint NOT NULL REFERENCES orders (id),
  status      text NOT NULL,
  changed_by  text NOT NULL,
  changed_at  timestamptz NOT NULL
);

INSERT INTO order_status_history (order_id, status, changed_by, changed_at) VALUES
  (1, 'paid',      'system',     '2026-10-01 10:00+00'),
  (1, 'shipped',   'warehouse',  '2026-10-02 15:30+00'),
  (1, 'delivered', 'courier',    '2026-10-04 11:05+00');

SELECT status,
       changed_at,
       changed_at - lag(changed_at) OVER (ORDER BY changed_at) AS time_in_previous_status
FROM order_status_history
WHERE order_id = 1
ORDER BY changed_at;
```

**Result:**

```text
  status   |       changed_at       | time_in_previous_status
-----------+------------------------+-------------------------
 paid      | 2026-10-01 10:00:00+00 |
 shipped   | 2026-10-02 15:30:00+00 | 1 day 05:30:00
 delivered | 2026-10-04 11:05:00+00 | 1 day 19:35:00
(3 rows)
```

Now "how long do orders wait before shipping?" is a simple query. A few related patterns:

- **Audit logs** record who changed what, with old and new values — required for sensitive data in many industries. They can be written by the application, or by database **triggers** (below).
- **Effective dating**: rows with `valid_from` / `valid_to` (or a range column with an exclusion constraint, {{ch:postgresql}}) to keep, for example, the history of prices or employee salaries.
- **Event sourcing** — storing every change as an event and deriving current state from them — is the extreme version, powerful for some domains and complex for most ({{ch:event-driven-systems}}).

A simple audit trigger shows the idea:

```sql
CREATE TABLE audit_log (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  table_name  text NOT NULL,
  row_id      bigint NOT NULL,
  action      text NOT NULL,
  old_values  jsonb,
  new_values  jsonb
);

CREATE FUNCTION audit_products() RETURNS trigger AS $$
BEGIN
  INSERT INTO audit_log (table_name, row_id, action, old_values, new_values)
  VALUES ('products', coalesce(NEW.id, OLD.id), TG_OP,
          CASE WHEN TG_OP <> 'INSERT' THEN to_jsonb(OLD) END,
          CASE WHEN TG_OP <> 'DELETE' THEN to_jsonb(NEW) END);
  RETURN coalesce(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER products_audit AFTER INSERT OR UPDATE OR DELETE ON products
FOR EACH ROW EXECUTE FUNCTION audit_products();

UPDATE products SET price = 2.75 WHERE sku = 'SNK-OAT';

SELECT action, old_values ->> 'price' AS old_price, new_values ->> 'price' AS new_price FROM audit_log;
```

**Result:**

```text
 action | old_price | new_price
--------+-----------+-----------
 UPDATE | 2.50      | 2.75
(1 row)
```

Triggers guarantee the log is written for every change, including manual fixes and scripts, but they are "invisible" logic: document them, and keep them simple. Production audit logs also record who made the change (an application user id passed through a session setting) and when.

### Level 3 — Deleting things

Deletion is a design question, not just a `DELETE` statement:

- **Hard delete with `ON DELETE CASCADE`** — for data that has no meaning without its parent (order items without the order, a user's session tokens).
- **Refuse deletion (`RESTRICT`, the default)** — when children must be dealt with first: products that appear in orders must not vanish.
- **`ON DELETE SET NULL`** — when the child can exist without the parent (a product whose category was removed).
- **Soft delete** (`deleted_at timestamptz`) — the row stays but is hidden. Useful for "undo", for keeping references valid, and for audits. Costs: every query must exclude deleted rows (views or RLS help), unique constraints need to become partial (as with emails above), and deleted data still exists — which conflicts with privacy rights.
- **Anonymisation** — for customers who ask to be forgotten (GDPR and similar laws), replace personal fields with placeholders while keeping orders for accounting.

```sql
UPDATE customers
SET email = 'deleted-' || id || '@invalid', name = 'Deleted customer', deleted_at = '2026-11-20 09:00+00'
WHERE id = 2;

INSERT INTO customers (email, name) VALUES ('omar@example.com', 'Omar Ali (new account)');
SELECT id, email, name, deleted_at IS NOT NULL AS deleted FROM customers ORDER BY id;
```

**Result:**

```text
 id |       email       |          name          | deleted
----+-------------------+------------------------+---------
  1 | sara@example.com  | Sara Khan              | f
  2 | deleted-2@invalid | Deleted customer       | t
  4 | omar@example.com  | Omar Ali (new account) | f
(3 rows)
```

Omar's old account is anonymised and marked deleted, its orders (if any) still reference it, and the email address is free to be used by a new account. Notice the new account received id 4, not 3: the failed duplicate-email insert earlier had already used id 3. Identity values are never handed out twice, even when an insert fails, so gaps are normal — never rely on ids being consecutive.

### Level 3 — Money, time and other details

- **Money**: `numeric(12, 2)` or integer minor units (pence), always with a **currency** column when more than one currency is possible. Never floating point ({{ch:sql}}).
- **Time**: `timestamptz` for moments; `date` for calendar dates (a birthday has no time zone); store the user's **time zone name** separately when local times matter ({{ch:cron-jobs}}).
- **Statuses**: text with a `CHECK` list, an enum, or a lookup table — and decide which **transitions** are allowed (a delivered order cannot become paid again), enforced in the application or with a trigger.
- **Names and addresses**: real-world names and addresses vary enormously; avoid over-structuring (first/last name does not fit everyone) and allow international formats.
- **Standard columns**: `created_at` and `updated_at` on most tables make debugging and syncing much easier.
- **Naming**: lower-case `snake_case`; plural table names (`orders`) or singular — pick one; foreign keys named `<entity>_id`; booleans as `is_…`/`has_…`; no abbreviations.

## Design traps

### Level 3 — Polymorphic foreign keys

Suppose customers can leave reviews on both products and orders. A tempting design is one `reviews` table with `target_type` ('product' or 'order') and `target_id`. The database cannot enforce a foreign key on `target_id`, because it points to different tables — so reviews can point to rows that do not exist. Better options:

- **Separate tables** (`product_reviews`, `order_reviews`) — simplest and fully constrained.
- **Exclusive arcs**: one nullable foreign key per target and a check that exactly one is set:

```sql
CREATE TABLE reviews (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  product_id  bigint REFERENCES products (id),
  order_id    bigint REFERENCES orders (id),
  rating      smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  CHECK (num_nonnulls(product_id, order_id) = 1)
);
INSERT INTO reviews (product_id, rating) VALUES (1, 5);
INSERT INTO reviews (product_id, order_id, rating) VALUES (1, 1, 4);
```

**Result:**

```text
ERROR:  new row for relation "reviews" violates check constraint "reviews_check"
```

Each review points to exactly one real thing, with full foreign-key protection.

### Level 3 — Entity–attribute–value and "JSON for everything"

Products in different categories have different attributes (tea has a caffeine level; clothes have sizes). Two tempting designs cause trouble:

- **Entity–attribute–value (EAV)**: a table of `(entity_id, attribute_name, value_text)` rows. Infinitely flexible — and every query becomes a pile of self-joins, every value is text, and no constraint can say "caffeine must be one of low, medium, high".
- **One JSONB column holding everything**: easy to start, but core data loses types, constraints and foreign keys.

A sound middle path: real columns for everything shared and important (name, price, category, stock), and a JSONB `attributes` column for category-specific details, validated by the application (and, if needed, by `CHECK` constraints on specific keys). Promote an attribute to a real column once it is filtered, joined or constrained regularly.

### Level 3 — Designing for queries, without premature denormalisation

Start **normalised** — each fact stored once ({{ch:normalization}}) — because it keeps data consistent. Then design for the important queries: indexes on foreign keys and common filters, composite indexes matching sort orders ({{ch:indexes}}). Only **denormalise** (store derived or duplicated data, such as an `orders_count` on customers) when a measured performance problem requires it, and then keep the copy correct automatically — in the same transaction, with a trigger, or with a materialised view refreshed on schedule.

## Changing the schema safely

### Level 3 — Migrations

Schema changes are made with **migrations**: numbered or timestamped scripts, kept in version control, applied in order by a tool (Prisma Migrate, TypeORM migrations, Flyway, Liquibase, Atlas, golang-migrate, {{ch:prisma}}, {{ch:typeorm}}), with a table recording which ones have run. Every environment — developer laptops, CI, staging, production — reaches the same schema by running the same migrations. Never change a production schema by hand.

### Level 4 — Expand and contract on a live system

On a busy system, the application and the database change at different moments: during a rolling deployment, old and new versions of the code run at the same time ({{ch:cicd}}). Every schema change must work with **both**. Renaming `customers.name` to `full_name` in one step breaks the old code instantly. Instead, use **expand and contract** — the same idea as for APIs ({{ch:api-versioning}}):

```sql
-- fragment
-- 1. Expand: add the new column (nullable, no default rewrite) — old code ignores it
ALTER TABLE customers ADD COLUMN full_name text;

-- 2. Deploy code that writes BOTH columns and reads full_name with a fallback to name

-- 3. Backfill existing rows in small batches (avoids long locks and huge transactions)
UPDATE customers SET full_name = name WHERE full_name IS NULL AND id BETWEEN 1 AND 10000;

-- 4. Enforce: once every row has a value, make it required
--    (adding a CHECK ... NOT VALID and then VALIDATE CONSTRAINT avoids a long exclusive lock)
ALTER TABLE customers ADD CONSTRAINT full_name_present CHECK (full_name IS NOT NULL) NOT VALID;
ALTER TABLE customers VALIDATE CONSTRAINT full_name_present;

-- 5. Deploy code that uses only full_name

-- 6. Contract: drop the old column
ALTER TABLE customers DROP COLUMN name;
```

Other operational rules for large tables:

- **Know which operations lock the table** and for how long. Creating indexes should use `CREATE INDEX CONCURRENTLY`; changing a column's type usually rewrites the whole table.
- **Set `lock_timeout`** in migrations, so a migration waiting for a lock fails quickly instead of queueing every other query behind it.
- **Backfill in batches**, outside the migration transaction if necessary.
- **Keep migrations reversible** where possible, and test them against a copy of production-sized data.

## From beginner to enterprise

**Level 1–2 — first schemas.** Entities and relationships from requirements; surrogate primary keys; foreign keys; `NOT NULL`, `UNIQUE` and `CHECK` constraints; junction tables for many-to-many.

**Level 3 — sound application schemas.** Partial unique indexes for real business rules; snapshots of prices, names and addresses; status history and audit logs; deliberate deletion behaviour; correct types for money and time; migrations in version control.

**Level 4 — production schemas.** Expand–contract migrations compatible with rolling deployments; batched backfills; lock-aware changes; indexes designed for the main queries; careful use of JSONB for variable attributes.

**Level 5 — senior practice.** Domain modelling with the business; schema reviews before implementation; denormalisation only when measured; data retention and privacy designed in (anonymisation, deletion schedules); modelling for multi-tenancy ({{ch:postgresql}}).

**Level 6 — enterprises.** Data owned by many services, each with its own schema ({{ch:microservices}}); events and change-data capture keeping copies in sync; data contracts between producing teams and analytics; governance of personal and regulated data.

## Real-world use cases

### Prices that change, invoices that must not

- **Design**: products have a current price; a `product_prices` table keeps price history with validity ranges; order items snapshot the name, price and tax rate; invoices are generated from order data and stored, never recomputed.
- **Result**: a customer's invoice from last year is identical when reprinted today.

### A double-entry ledger for store credit

- **Design**: instead of a mutable `balance` column, every movement of store credit is a pair of ledger entries (debit one account, credit another) in one transaction; balances are sums of entries (cached in a summary table if needed). Entries are never updated or deleted; corrections are new entries.
- **Result**: every balance can be explained line by line, and money cannot appear or vanish (see Exercise 3).

## Common mistakes

### Beginner: no foreign keys or constraints

**Consequence:** orphaned rows, duplicates and impossible values. **Fix:** declare every relationship and rule the database can enforce.

### Beginner: using email or name as the primary key

**Fix:** surrogate key plus a unique constraint on the natural value.

### Beginner: referencing live data for historical records

**Consequence:** old orders change when products change. **Fix:** snapshots.

### Intermediate: overwriting state that the business later asks about

**Fix:** history tables or audit logs for statuses and important changes.

### Intermediate: polymorphic `type` + `id` columns

**Fix:** separate tables or exclusive arcs with real foreign keys.

### Intermediate: EAV tables or one big JSON column

**Fix:** columns for core attributes; JSONB only for genuinely variable details.

### Production: renaming or dropping columns in one step

**Consequence:** running code breaks during deployment. **Fix:** expand, migrate, contract.

### Production: migrations that lock big tables

**Fix:** concurrent index creation, `NOT VALID` constraints, batched backfills, `lock_timeout`.

## Debugging and troubleshooting

- **Duplicate customers despite a unique constraint**: emails differing only in case or spaces — normalise before storing and use a unique index on `lower(email)`.
- **A deploy failed with "column does not exist"**: the code was deployed before (or after) the migration it depended on — make each change compatible with both code versions.
- **A migration hangs**: it is waiting for a lock held by a long transaction, while every new query waits behind it — use `lock_timeout` and retry, and find the blocking session ({{ch:postgresql}}).
- **Reports disagree with invoices**: reports join to current product data instead of order snapshots.
- **Deleting a record fails with a foreign-key error**: decide the intended behaviour (cascade, restrict, set null, soft delete) rather than removing the constraint.

## Security summary

- **Constraints are a security control**: they prevent invalid or malicious data from being stored, whatever path it takes.
- Separate **sensitive data** (identity documents, payment references) into tables with stricter access, or avoid storing it at all.
- Design **retention and deletion** for personal data from the start: anonymisation, deletion schedules, and where copies (snapshots, audit logs, backups) live.
- Keep **audit trails** for sensitive changes, protected from modification.
- Do not expose sequential internal ids where enumeration matters; use unguessable public identifiers.
- Apply **least privilege** to migration and application roles ({{ch:postgresql}}).

## How a senior engineer thinks about this

- **Data outlives code.** Schema decisions get the most care, because they are the hardest to change.
- **Make invalid states impossible.** Every business rule that can be a constraint becomes one.
- **Model facts, including historical ones.** "What was true at the time" is often a different fact from "what is true now", and needs its own storage.
- **Design for the questions.** The important queries, reports and audits shape tables and indexes from the start.
- **Change in small, compatible steps.** Expand, migrate, contract — never a big-bang rename on a live system.

## Exercises

These continue in the same session as the chapter's examples.

### Exercise 1 — Many-to-many with attributes

**Objective:** practise junction tables.
**What to build:** staff members can work in several shops, and each shop has several staff members. For each assignment, store the role (`manager` or `assistant`) and the start date. A shop may have at most one manager. Create the tables, insert sample data, and show that a second manager for a shop is rejected.

<details>
<summary>Show the solution</summary>

```sql
CREATE TABLE shops (id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, name text NOT NULL UNIQUE);
CREATE TABLE staff (id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, name text NOT NULL);
CREATE TABLE shop_staff (
  shop_id     bigint NOT NULL REFERENCES shops (id),
  staff_id    bigint NOT NULL REFERENCES staff (id),
  role        text   NOT NULL CHECK (role IN ('manager', 'assistant')),
  started_on  date   NOT NULL,
  PRIMARY KEY (shop_id, staff_id)
);
CREATE UNIQUE INDEX shop_staff_one_manager ON shop_staff (shop_id) WHERE role = 'manager';

INSERT INTO shops (name) VALUES ('Leeds'), ('York');
INSERT INTO staff (name) VALUES ('Priya'), ('Jamal'), ('Chen');
INSERT INTO shop_staff VALUES (1, 1, 'manager', '2025-03-01'), (1, 2, 'assistant', '2025-06-15'), (2, 2, 'assistant', '2026-01-10');
```

**Result:**

```text
INSERT 0 3
```

```sql
INSERT INTO shop_staff VALUES (1, 3, 'manager', '2026-11-01');
```

**Result:**

```text
ERROR:  duplicate key value violates unique constraint "shop_staff_one_manager"
```

**Walkthrough:** the junction table's primary key `(shop_id, staff_id)` prevents assigning the same person to the same shop twice; Jamal works in two shops; the partial unique index allows any number of assistants but only one manager per shop.

</details>

### Exercise 2 — Model a hierarchy and query it

**Objective:** practise self-referencing tables.
**What to do:** create a `categories` table with a parent reference, insert Drinks → Tea → Green Tea and Snacks, and write a query listing every category with its full path.

<details>
<summary>Show the solution</summary>

```sql
CREATE TABLE categories (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name       text NOT NULL,
  parent_id  bigint REFERENCES categories (id),
  UNIQUE (parent_id, name)
);
INSERT INTO categories (name, parent_id) VALUES ('Drinks', NULL), ('Tea', 1), ('Green Tea', 2), ('Snacks', NULL);

WITH RECURSIVE tree AS (
  SELECT id, name::text AS path FROM categories WHERE parent_id IS NULL
  UNION ALL
  SELECT c.id, tree.path || ' > ' || c.name FROM categories c JOIN tree ON c.parent_id = tree.id
)
SELECT path FROM tree ORDER BY path;
```

**Result:**

```text
           path
--------------------------
 Drinks
 Drinks > Tea
 Drinks > Tea > Green Tea
 Snacks
(4 rows)
```

**Walkthrough:** each category points to its parent; the recursive CTE starts from the roots and appends children level by level ({{ch:sql}}). `UNIQUE (parent_id, name)` stops duplicate names under the same parent (note that it does not stop two root categories with the same name, because `NULL`s are not equal to each other — PostgreSQL's `NULLS NOT DISTINCT` option on the unique constraint covers that case).

</details>

### Exercise 3 — A ledger instead of a balance column

**Objective:** practise modelling money movements.
**What to build:** a store-credit ledger where each transfer consists of entries that sum to zero. Record: the shop gives Sara £10 of credit; Sara spends £4 of it. Then compute each account's balance from the entries.

<details>
<summary>Show the solution</summary>

```sql
CREATE TABLE ledger_entries (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  transfer_id  bigint NOT NULL,
  account      text   NOT NULL,
  amount       numeric(12, 2) NOT NULL CHECK (amount <> 0),   -- positive = credit, negative = debit
  description  text   NOT NULL
);
INSERT INTO ledger_entries (transfer_id, account, amount, description) VALUES
  (1, 'shop:promotions', -10.00, 'Goodwill credit for late delivery'),
  (1, 'customer:1',       10.00, 'Goodwill credit for late delivery'),
  (2, 'customer:1',       -4.00, 'Credit used on order 2'),
  (2, 'shop:sales',        4.00, 'Credit used on order 2');

SELECT account, sum(amount) AS balance FROM ledger_entries GROUP BY account ORDER BY account;
```

**Result:**

```text
     account     | balance
-----------------+---------
 customer:1      |    6.00
 shop:promotions |  -10.00
 shop:sales      |    4.00
(3 rows)
```

```sql
SELECT transfer_id, sum(amount) AS must_be_zero FROM ledger_entries GROUP BY transfer_id ORDER BY transfer_id;
```

**Result:**

```text
 transfer_id | must_be_zero
-------------+--------------
           1 |         0.00
           2 |         0.00
(2 rows)
```

**Walkthrough:** money is never created or destroyed — each transfer's entries sum to zero, and Sara's £6 balance is explained by two entries. Entries are only ever inserted; mistakes are corrected with new reversing entries. In production, a deferred constraint trigger or the application (inside one transaction, {{ch:transactions}}) enforces the zero-sum rule, and a balances table can cache sums for speed.

</details>

### Exercise 4 — Production scenario: splitting a name column on a live system

**Objective:** practise safe migrations.
**The scenario:** the `customers` table (40 million rows, constant traffic) has a single `name` column. The business now needs `given_name` and `family_name` for formal letters, but many customers have names that do not split cleanly. Plan the change.

<details>
<summary>Show the solution</summary>

1. **Question the requirement first**: not every name has a given/family structure. Keep a `full_name` (display name) as the primary field and add **optional** `given_name` and `family_name` (or a "formal name" field) used where available.
2. **Expand**: `ALTER TABLE customers ADD COLUMN given_name text, ADD COLUMN family_name text;` — nullable, no default, so it is a quick metadata change. Set `lock_timeout` for the migration.
3. **Code**: deploy forms that collect the new fields for new and editing customers; letters use them when present and fall back to `full_name`.
4. **Backfill cautiously**: a batched background job proposes splits only for simple cases (two words, no particles), marks them as "inferred", and never overwrites values customers entered themselves. Batches of a few thousand rows, with pauses, to avoid replication lag and lock contention.
5. **Do not contract**: `name`/`full_name` remains — the new fields are an addition, not a replacement.
6. **Verify**: compare counts of filled fields; sample letters; monitor database load during the backfill.

</details>

## Summary

Database design turns requirements — what to store, which questions to answer, which rules must always hold — into **entities**, **attributes** and **relationships** with the right **cardinality**: foreign keys on the "many" side for one-to-many, **junction tables** (often with their own attributes) for many-to-many, unique foreign keys for one-to-one, and self-references for hierarchies. Prefer **surrogate primary keys**, keeping natural identifiers unique; choose `bigint` identities, UUIDs (preferably time-ordered) or both, with unguessable public ids where enumeration matters.

Encode business rules as **constraints**, including **partial unique indexes** such as "one default address per customer" and case-insensitive unique emails among active customers. Use proven patterns: **snapshots** of names, prices and addresses for historical records; **status history**, **audit logs** (application- or trigger-based) and effective dating for "what was true when"; deliberate **deletion** choices among cascade, restrict, set null, **soft delete** and **anonymisation**; correct types for money and time; consistent naming. Avoid **polymorphic foreign keys** (use separate tables or exclusive arcs), **EAV** tables and "everything in JSON" — use columns for core data and JSONB for variable details. Start normalised and denormalise only when measured.

Change schemas with versioned **migrations**, and on live systems follow **expand and contract**: add, dual-write, backfill in batches, enforce with low-lock techniques, switch, and only then remove — keeping every step compatible with the code running at that moment.

## Key terms

- **Database design** — Deciding the tables, columns, keys, relationships and constraints that structure data.
- **Data model** — A structured description of the entities, attributes and relationships in a domain.
- **Entity** — A thing with its own identity that the system stores information about.
- **Attribute** — A property of an entity.
- **Relationship** — A connection between entities.
- **Cardinality** — The number of instances of one entity that can relate to another: one-to-one, one-to-many or many-to-many.
- **ER diagram** — A diagram showing entities, attributes and relationships.
- **Crow's-foot notation** — An ER diagram notation using symbols for one, many and optional.
- **Surrogate key** — A generated identifier with no business meaning.
- **Natural key** — An identifier taken from business data, such as a SKU or country code.
- **Junction table** — A table representing a many-to-many relationship between two tables.
- **Self-referencing foreign key** — A foreign key pointing to the same table, used for hierarchies.
- **Partial unique index** — A unique index that applies only to rows matching a condition.
- **Snapshot (data)** — A copy of values taken at a moment, preserved when the source changes.
- **Generated column** — A column computed automatically from other columns.
- **Status history** — Rows recording each change of an entity's status with time and actor.
- **Audit log** — A record of who changed what, when, with old and new values.
- **Trigger** — A database function run automatically on inserts, updates or deletes.
- **Effective dating** — Storing validity periods so past and future values can be queried.
- **Soft delete** — Marking a row as deleted instead of removing it.
- **Anonymisation** — Replacing personal data with non-identifying values while keeping the record.
- **Cascade delete** — Automatically deleting child rows when their parent is deleted.
- **Polymorphic association** — A single reference column pointing to rows in different tables, which foreign keys cannot enforce.
- **Exclusive arc** — Several nullable foreign keys with a check that exactly one is set.
- **Entity–attribute–value (EAV)** — A generic design storing attributes as rows of name and value, usually best avoided.
- **Denormalisation** — Deliberately duplicating or precomputing data for read performance.
- **Migration** — A versioned script that changes a database schema or its data.
- **Expand–contract migration** — Changing a schema in compatible steps: add, migrate, then remove.
- **Backfill** — Filling a new column or table with values derived from existing data.
- **Double-entry ledger** — Recording each money movement as balanced debit and credit entries.

## What comes next

Several decisions in this chapter rested on a principle — store each fact once — that has a formal name and a precise set of rules. The next chapter, {{ch:normalization}}, explains normalisation: functional dependencies, the normal forms from first to Boyce–Codd, the update anomalies they prevent, and when deliberately breaking them is the right engineering choice.
