# Normalization

> [!GOALS]
> - Explain the problem normalisation solves: **redundancy** and the **insert, update and delete anomalies** it causes.
> - Understand **functional dependencies** — the idea behind every normal form — and check them against real data.
> - Apply **first, second and third normal form** and **Boyce–Codd normal form** step by step, and recognise the higher forms.
> - Decompose a messy table into normalised tables **without losing information**, using SQL.
> - Decide when **denormalisation** is the right choice, and keep denormalised data correct with materialised views, triggers or snapshots.

## Why this matters

Many databases start life as a spreadsheet, or as one wide table that grew a column at a time: order number, customer name, customer email, customer phone, products, prices, delivery address… It works at first. Then a customer changes their email and it is updated in some rows but not others. A product is renamed and old and new names coexist. The last order of a customer is deleted, and with it the only record of that customer. Reports disagree with each other, and nobody knows which copy of the data is true.

**Normalisation** is the discipline that prevents this. Its core idea is simple — **store each fact exactly once** — and the normal forms are a precise way to check whether a design follows it. You met the result in {{ch:database-design}}; this chapter explains the reasoning, so that you can recognise problems in any schema, fix legacy tables safely, and make informed decisions about the cases where duplicating data on purpose is the better engineering choice.

Interviewers like normalisation questions, but the real value is practical: most data-quality bugs in production systems trace back to the same fact being stored in more than one place.

## The simple idea

Imagine a school where each teacher's phone number is written on every class register they teach. When a teacher changes their number, someone must find and correct every register — and inevitably misses one. Now students on that register call a number that no longer works. If instead the number is written once, in a staff directory, and each register just says which teacher teaches the class, a change is made in one place and everyone sees it.

Normalisation is moving facts into their "staff directory": each fact lives in the table about the thing it describes, and other tables refer to it.

> [!ANALOGY]
> Normalisation is like keeping each teacher's phone number in one staff directory instead of copying it onto every class register: when the number changes, it is changed once, and every register points to the directory.
>
> **Where the analogy breaks:** sometimes the copy on the register is exactly what you want — for example, a signed attendance sheet must keep the teacher who **actually** taught that day, even if staff change later. In databases too, some copies record a different fact ("what was true at that moment") and must not be "normalised away".

## The proper definition and key words

**Normalisation** is the process of structuring relational tables so that each fact is stored once, by removing redundancies that arise from dependencies between columns, as defined by a series of **normal forms**.

Key words:

- **Redundancy** — the same fact stored in more than one place.
- **Anomaly** — a problem caused by redundancy:
  - **update anomaly** — changing a fact requires changing many rows, and missing one leaves the data inconsistent;
  - **insert anomaly** — a fact cannot be recorded without some unrelated fact (a product cannot exist until someone orders it);
  - **delete anomaly** — deleting one fact destroys another (deleting the last order deletes the customer).
- **Functional dependency** (A → B) — knowing A determines B: `customer_id → customer_email`.
- **Determinant** — the left side of a functional dependency.
- **Candidate key** — a minimal set of columns that uniquely identifies a row; a table can have several. A **superkey** is any set of columns containing a candidate key.
- **Prime attribute** — a column that is part of some candidate key.
- **Decomposition** — splitting a table into several tables.
- **Lossless decomposition** — a split whose tables can be joined back to exactly the original data.
- **Denormalisation** — deliberately storing redundant or precomputed data, usually for read performance.

## The problem, in real data

### Level 1 — A table that grew like a spreadsheet

Here is how a small shop might first record its orders — one row per order, everything in it:

```sql
CREATE TABLE order_sheet (
  order_no        integer PRIMARY KEY,
  order_date      date    NOT NULL,
  customer_email  text    NOT NULL,
  customer_name   text    NOT NULL,
  customer_city   text,
  products        text    NOT NULL      -- "name x quantity @ price", separated by semicolons
);

INSERT INTO order_sheet VALUES
  (1001, '2026-09-02', 'sara@example.com', 'Sara Khan', 'Leeds',      'Green Tea x2 @4.20; Oat Biscuits x1 @2.50'),
  (1002, '2026-09-20', 'omar@example.com', 'Omar Ali',  'Manchester', 'Breakfast Tea x3 @3.80'),
  (1003, '2026-10-14', 'sara@example.com', 'Sara Khan', 'Leeds',      'Coffee Beans x1 @9.50'),
  (1004, '2026-10-30', 'li@example.com',   'Li Wei',    'Leeds',      'Green Tea x1 @4.20; Coffee Beans x2 @9.50');
```

**Result:**

```text
INSERT 0 4
```

Simple questions are already hard. "How many Green Tea did we sell?" requires parsing text. "Which orders contain Tea?" with `LIKE '%Tea%'` also matches "Green Tea", "Breakfast Tea" and any future "Tea Towel". There is no way to stop someone typing "Gren Tea x2 @4.20" or a negative quantity.

### Level 1 — The anomalies

Sara changes her email. A support agent updates the order they are looking at:

```sql
UPDATE order_sheet SET customer_email = 'sara.khan@example.com' WHERE order_no = 1003;

SELECT customer_name, count(DISTINCT customer_email) AS emails_on_record
FROM order_sheet
GROUP BY customer_name
ORDER BY customer_name;
```

**Result:**

```text
 customer_name | emails_on_record
---------------+------------------
 Li Wei        |                1
 Omar Ali      |                1
 Sara Khan     |                2
(3 rows)
```

That is an **update anomaly**: Sara now has two emails, and the system cannot tell which is right. Likewise:

- **Delete anomaly**: delete order 1002 (for example, a test order) and Omar disappears completely — his name and city were stored only there.
- **Insert anomaly**: a new customer who registers but has not ordered yet cannot be stored at all, because every row must be an order. Neither can a new product nobody has bought.

Each anomaly comes from the same root: facts about customers and products are stored inside rows about orders.

## Functional dependencies

### Level 2 — What determines what

A **functional dependency** A → B says: rows with the same A always have the same B. In the shop:

- `order_no → order_date, customer_email` (an order has one date and one customer)
- `customer_email → customer_name, customer_city` (assuming email identifies a customer)
- `product_name → current price` (but the price **paid** depends on the order too)

Functional dependencies are facts about the **business**, not just the current data: two customers might happen to share a city today, but `city → customer` is not a rule. Still, data can reveal violations. This query checks whether, in the original data, each email determined one name — a quick way to test assumptions in a legacy table:

```sql
SELECT customer_email, count(DISTINCT customer_name) AS names
FROM order_sheet
GROUP BY customer_email
HAVING count(DISTINCT customer_name) > 1;
```

**Result:**

```text
 customer_email | names
----------------+-------
(0 rows)
```

No email has two names, so `customer_email → customer_name` holds in this data. (The reverse is also worth checking: `customer_name → customer_email` fails right now, because of the anomaly we just created.)

The normal forms are rules about which dependencies a table may contain.

## The normal forms

### Level 2 — First normal form (1NF): one value per cell

A table is in **1NF** when every column holds a single, atomic value, there are no repeating groups (`phone1`, `phone2`, `phone3`), and rows are identified by a key. The `products` column — a list inside a cell — breaks 1NF.

Fixing it means one row per order line. SQL can do this migration directly:

```sql
CREATE TABLE order_lines_1nf AS
SELECT s.order_no, s.order_date, s.customer_email, s.customer_name, s.customer_city,
       trim(split_part(line, ' x', 1))                          AS product_name,
       split_part(split_part(line, ' x', 2), ' @', 1)::integer  AS quantity,
       split_part(line, '@', 2)::numeric(8, 2)                  AS unit_price
FROM order_sheet s,
     regexp_split_to_table(s.products, ';\s*') AS line;

SELECT order_no, customer_name, product_name, quantity, unit_price
FROM order_lines_1nf ORDER BY order_no, product_name;
```

**Result:**

```text
 order_no | customer_name | product_name  | quantity | unit_price
----------+---------------+---------------+----------+------------
     1001 | Sara Khan     | Green Tea     |        2 |       4.20
     1001 | Sara Khan     | Oat Biscuits  |        1 |       2.50
     1002 | Omar Ali      | Breakfast Tea |        3 |       3.80
     1003 | Sara Khan     | Coffee Beans  |        1 |       9.50
     1004 | Li Wei        | Coffee Beans  |        2 |       9.50
     1004 | Li Wei        | Green Tea     |        1 |       4.20
(6 rows)
```

Now each cell holds one value, and "how many Green Tea did we sell?" is `sum(quantity) WHERE product_name = 'Green Tea'`. But look at the redundancy: Sara's name and city appear on three rows, and order 1001's date and customer appear twice. The key of this table is now the **pair** `(order_no, product_name)`.

PostgreSQL's arrays and JSONB technically allow lists in cells ({{ch:postgresql}}). Using them for small, simple, self-contained values is fine; using them for things with their own identity and attributes (products in an order) recreates the problems of the original sheet.

### Level 2 — Second normal form (2NF): depend on the whole key

A table is in **2NF** when it is in 1NF and no non-key column depends on only **part** of a composite key. In `order_lines_1nf`, with key `(order_no, product_name)`:

- `quantity` and `unit_price` depend on the whole key (this product in this order) — fine.
- `order_date`, `customer_email`, `customer_name`, `customer_city` depend only on `order_no` — a **partial dependency**.

The fix is to move order-level columns into an `orders` table:

```sql
CREATE TABLE orders_2nf AS
SELECT DISTINCT order_no, order_date, customer_email, customer_name, customer_city
FROM order_lines_1nf;

CREATE TABLE order_items_2nf AS
SELECT order_no, product_name, quantity, unit_price FROM order_lines_1nf;

SELECT * FROM orders_2nf ORDER BY order_no;
```

**Result:**

```text
 order_no | order_date |    customer_email     | customer_name | customer_city
----------+------------+-----------------------+---------------+---------------
     1001 | 2026-09-02 | sara@example.com      | Sara Khan     | Leeds
     1002 | 2026-09-20 | omar@example.com      | Omar Ali      | Manchester
     1003 | 2026-10-14 | sara.khan@example.com | Sara Khan     | Leeds
     1004 | 2026-10-30 | li@example.com        | Li Wei        | Leeds
(4 rows)
```

Each order's date and customer are stored once. (2NF only matters for composite keys: a table with a single-column key is automatically in 2NF if it is in 1NF.)

### Level 2 — Third normal form (3NF): depend on nothing but the key

A table is in **3NF** when it is in 2NF and no non-key column depends on another non-key column — no **transitive dependency**. In `orders_2nf`, `order_no → customer_email → customer_name, customer_city`: the name and city depend on the order only **through** the customer. That is why Sara's details are still repeated on every one of her orders.

The fix is a `customers` table, with orders referring to it — and the same for products. Here is the final, normalised schema, built from the data we already have:

```sql
CREATE TABLE customers (
  id     integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email  text NOT NULL UNIQUE,
  name   text NOT NULL,
  city   text
);
CREATE TABLE products (
  id     integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name   text NOT NULL UNIQUE
);
CREATE TABLE orders (
  order_no     integer PRIMARY KEY,
  order_date   date    NOT NULL,
  customer_id  integer NOT NULL REFERENCES customers (id)
);
CREATE TABLE order_items (
  order_no    integer NOT NULL REFERENCES orders (order_no),
  product_id  integer NOT NULL REFERENCES products (id),
  quantity    integer NOT NULL CHECK (quantity > 0),
  unit_price  numeric(8, 2) NOT NULL,
  PRIMARY KEY (order_no, product_id)
);

-- Migrate. Resolve the email conflict we created: keep the newest email for each customer name.
INSERT INTO customers (email, name, city)
SELECT DISTINCT ON (customer_name) customer_email, customer_name, customer_city
FROM orders_2nf
ORDER BY customer_name, order_date DESC;

INSERT INTO products (name) SELECT DISTINCT product_name FROM order_items_2nf ORDER BY 1;

INSERT INTO orders (order_no, order_date, customer_id)
SELECT o.order_no, o.order_date, c.id
FROM orders_2nf o JOIN customers c ON c.name = o.customer_name;

INSERT INTO order_items (order_no, product_id, quantity, unit_price)
SELECT i.order_no, p.id, i.quantity, i.unit_price
FROM order_items_2nf i JOIN products p ON p.name = i.product_name;

SELECT * FROM customers ORDER BY id;
```

**Result:**

```text
 id |         email         |   name    |    city
----+-----------------------+-----------+------------
  1 | li@example.com        | Li Wei    | Leeds
  2 | omar@example.com      | Omar Ali  | Manchester
  3 | sara.khan@example.com | Sara Khan | Leeds
(3 rows)
```

Notice the migration had to **decide** something: which of Sara's two emails is correct. Normalising real data always surfaces such conflicts, and they need a rule (here, the most recent order wins) — or a person — to resolve them. That is the update anomaly's cost, paid at last.

Now every anomaly is gone:

- Sara's email is stored once; changing it is one `UPDATE` on one row.
- A customer can exist without orders; a product can exist without sales.
- Deleting an order removes only the order.

### Level 3 — Lossless: nothing was lost

A good decomposition is **lossless**: joining the tables gives back exactly the original information. Rebuild the original spreadsheet view:

```sql
SELECT o.order_no, o.order_date, c.name AS customer, c.city,
       string_agg(p.name || ' x' || i.quantity || ' @' || i.unit_price, '; ' ORDER BY p.name) AS products
FROM orders o
JOIN customers c   ON c.id = o.customer_id
JOIN order_items i ON i.order_no = o.order_no
JOIN products p    ON p.id = i.product_id
GROUP BY o.order_no, o.order_date, c.name, c.city
ORDER BY o.order_no;
```

**Result:**

```text
 order_no | order_date | customer  |    city    |                 products
----------+------------+-----------+------------+-------------------------------------------
     1001 | 2026-09-02 | Sara Khan | Leeds      | Green Tea x2 @4.20; Oat Biscuits x1 @2.50
     1002 | 2026-09-20 | Omar Ali  | Manchester | Breakfast Tea x3 @3.80
     1003 | 2026-10-14 | Sara Khan | Leeds      | Coffee Beans x1 @9.50
     1004 | 2026-10-30 | Li Wei    | Leeds      | Coffee Beans x2 @9.50; Green Tea x1 @4.20
(4 rows)
```

Every order, customer and line is still there (with products listed alphabetically), and now each fact lives in one place. Decompositions are lossless when the tables are joined on keys — here, the foreign keys. Splitting tables on columns that are not keys can create "spurious" rows when joined back: a classic mistake in hand-made migrations.

A handy phrase summarises 1NF to 3NF: every non-key column must depend on **the key** (1NF), **the whole key** (2NF), and **nothing but the key** (3NF).

### Level 4 — Boyce–Codd normal form (BCNF)

3NF still allows a subtle case: a dependency whose determinant is not a candidate key, where the dependent column is itself part of a key. **BCNF** removes it with a stricter rule: **for every non-trivial dependency A → B, A must be a superkey.**

Example: the shop runs tasting classes. Each class is about one topic (tea, coffee) on one date; each tutor teaches exactly one topic; a topic can have several tutors.

```sql
CREATE TABLE class_bookings (
  customer  text NOT NULL,
  topic     text NOT NULL,
  tutor     text NOT NULL,
  PRIMARY KEY (customer, topic)          -- a customer books each topic once
);
INSERT INTO class_bookings VALUES
  ('Sara', 'tea',    'Priya'),
  ('Omar', 'tea',    'Priya'),
  ('Li',   'tea',    'Jamal'),
  ('Sara', 'coffee', 'Chen');

-- tutor → topic should hold. Does the table enforce it?
INSERT INTO class_bookings VALUES ('Ana', 'coffee', 'Priya');      -- Priya teaches tea!
SELECT tutor, string_agg(DISTINCT topic, ', ') AS topics FROM class_bookings GROUP BY tutor ORDER BY tutor;
```

**Result:**

```text
 tutor |   topics
-------+-------------
 Chen  | coffee
 Jamal | tea
 Priya | coffee, tea
(3 rows)
```

The table accepted Priya teaching coffee, breaking the business rule `tutor → topic`. Here `tutor` is a determinant but not a key, so the table is not in BCNF (it is in 3NF, because `topic` is part of a candidate key). The fix decomposes it so the rule lives in its own table:

```sql
CREATE TABLE tutors (tutor text PRIMARY KEY, topic text NOT NULL);
CREATE TABLE class_bookings_bcnf (
  customer  text NOT NULL,
  tutor     text NOT NULL REFERENCES tutors (tutor),
  PRIMARY KEY (customer, tutor)
);
INSERT INTO tutors VALUES ('Priya', 'tea'), ('Jamal', 'tea'), ('Chen', 'coffee');
INSERT INTO class_bookings_bcnf VALUES ('Sara', 'Priya'), ('Omar', 'Priya'), ('Li', 'Jamal'), ('Sara', 'Chen');

SELECT b.customer, t.topic, b.tutor FROM class_bookings_bcnf b JOIN tutors t USING (tutor) ORDER BY b.customer, t.topic;
```

**Result:**

```text
 customer | topic  | tutor
----------+--------+-------
 Li       | tea    | Jamal
 Omar     | tea    | Priya
 Sara     | coffee | Chen
 Sara     | tea    | Priya
(4 rows)
```

Each tutor's topic is stored once and cannot contradict itself. The trade-off: "a customer books each topic only once" was easy to enforce before (the old primary key) and now needs extra work (a trigger, or including `topic` in the booking table with a composite foreign key to `tutors (tutor, topic)`). BCNF decompositions sometimes make one constraint harder to enforce — which is why 3NF is often the practical target.

### Level 4 — Fourth and fifth normal forms, briefly

**4NF** deals with **independent multi-valued facts** in one table. If staff members have several skills and speak several languages, one table `(staff, skill, language)` must store every combination — three skills and two languages make six rows, and adding a language means adding three rows. Separate tables `staff_skills` and `staff_languages` fix it. **5NF** handles rarer cases where a table can only be decomposed into three or more pieces losslessly. In practice, designing one table per real-world relationship avoids both.

## Denormalisation: breaking the rules on purpose

### Level 3 — When copies are correct

Some apparent redundancy is not redundancy at all:

- **Snapshots** record a different fact — the price **paid**, the address **delivered to** — and must not change when the source changes ({{ch:database-design}}). The `unit_price` in `order_items` is a snapshot, which is why it stayed there rather than moving to `products`.
- **Values that look derived but are not**: an invoice total that was legally issued must not be recomputed, even if tax rules change.
- **Things that merely look alike**: two customers in Leeds share a city name, but there is no reason to create a `cities` table and force every address through it — a postcode determines a city only loosely, and international addresses break the assumption. Normalising "postcode → city" usually causes more problems than it solves.

### Level 4 — When duplication is a performance decision

Joins are fast with the right indexes, so "joins are slow" alone is not a reason to denormalise. Real reasons include expensive aggregations read far more often than data changes, very hot read paths, and analytics over huge volumes. Options, from safest to riskiest:

**1. Materialised views** — precomputed query results the database stores and refreshes:

```sql
CREATE MATERIALIZED VIEW customer_stats AS
SELECT c.id, c.name, count(o.order_no) AS orders, coalesce(sum(i.quantity * i.unit_price), 0) AS spent
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id
LEFT JOIN order_items i ON i.order_no = o.order_no
GROUP BY c.id, c.name;

CREATE UNIQUE INDEX ON customer_stats (id);    -- needed for REFRESH ... CONCURRENTLY

INSERT INTO orders VALUES (1005, '2026-11-02', 2);
INSERT INTO order_items VALUES (1005, 1, 1, 3.80);

SELECT name, orders, spent FROM customer_stats ORDER BY id;     -- still the old numbers
```

**Result:**

```text
   name    | orders | spent
-----------+--------+-------
 Li Wei    |      2 | 23.20
 Omar Ali  |      1 | 11.40
 Sara Khan |      3 | 20.40
(3 rows)
```

```sql
REFRESH MATERIALIZED VIEW CONCURRENTLY customer_stats;
SELECT name, orders, spent FROM customer_stats ORDER BY id;
```

**Result:**

```text
   name    | orders | spent
-----------+--------+-------
 Li Wei    |      2 | 23.20
 Omar Ali  |      2 | 15.20
 Sara Khan |      3 | 20.40
(3 rows)
```

The view is fast to read but only as fresh as its last refresh — fine for dashboards refreshed every few minutes by a scheduled job ({{ch:cron-jobs}}), wrong for data users expect to see change immediately. `CONCURRENTLY` lets reads continue during the refresh. (The view's `orders` column counts order item rows rather than orders — Sara's first order has two items. A real report would count `DISTINCT o.order_no`; this is exactly the join-multiplication trap from {{ch:sql}}, and a reminder to check aggregates in views carefully.)

**2. Summary columns maintained in the same transaction** — for example, `products.units_sold` updated by the code that inserts order items, inside one transaction ({{ch:transactions}}), or by a trigger.

**3. Separate read models** — a search index, a cache or a reporting database fed by events or change-data capture ({{ch:caching}}, {{ch:event-driven-systems}}). Powerful at scale, but the copy is always slightly behind, and the system must tolerate that.

**4. Analytics schemas** — data warehouses deliberately use denormalised "star schemas" (wide fact tables joined to dimension tables) because they are read-mostly and optimised for aggregation.

Whatever the method, denormalised data must have **one source of truth** and an **automatic** way of staying in step with it. Hand-maintained copies in application code are where the anomalies come back.

## From beginner to enterprise

**Level 1–2 — first designs.** One value per column; no lists in cells; separate tables for separate things; recognising update, insert and delete anomalies.

**Level 3 — normalised schemas.** Applying 2NF and 3NF deliberately; checking functional dependencies in data; lossless decompositions with keys; telling snapshots and true redundancy apart.

**Level 4 — practical judgement.** BCNF where it pays and 3NF where constraints matter more; avoiding over-normalisation (cities, postcodes); materialised views and transactional summary columns for performance.

**Level 5 — senior practice.** Migrating legacy denormalised tables with conflict resolution; designing read models and caches with clear sources of truth; reviewing schemas for hidden redundancy.

**Level 6 — enterprises.** Normalised operational databases feeding denormalised analytical stores; master data management keeping customer and product records consistent across many systems; data quality monitoring.

## Real-world use cases

### Cleaning up a legacy "orders" spreadsheet import

- **Situation**: a shop imports years of orders from a spreadsheet with customers, products and lines all in one sheet.
- **Approach**: load into a staging table; check functional dependencies with `GROUP BY … HAVING count(DISTINCT …) > 1` to find conflicts; decide resolution rules with the business (newest email wins, manual review for name conflicts); decompose into normalised tables with `INSERT … SELECT DISTINCT`; verify by rebuilding the original view and comparing counts and totals.

### Fast product pages without denormalising the catalogue

- **Situation**: product pages show average rating and review count, computed from millions of reviews.
- **Approach**: keep reviews normalised; maintain `rating_count` and `rating_sum` on products in the same transaction that inserts or deletes a review (or refresh a materialised view every minute if slight staleness is acceptable); show `rating_sum / rating_count`.

## Common mistakes

### Beginner: lists in a column

Comma-separated ids or names. **Fix:** a separate table with one row per item.

### Beginner: repeating column groups

`phone1`, `phone2`, `phone3`. **Fix:** a `phones` table.

### Beginner: copying customer details into every order

**Fix:** customers table plus foreign key — unless it is a deliberate snapshot (such as the delivery address).

### Intermediate: "normalising" snapshots

Removing `unit_price` from order items because "the price is in products". **Consequence:** historical orders change. **Fix:** keep snapshots of facts that must not change.

### Intermediate: over-normalising

A `cities` table, a `first_names` table, a lookup table for every string. **Fix:** normalise real entities and real dependencies, not coincidental repetition.

### Intermediate: decomposing without keys

**Consequence:** spurious rows when tables are joined back. **Fix:** decompose so that tables join on keys.

### Production: hand-maintained denormalised copies

**Consequence:** silent drift. **Fix:** one source of truth with automatic updates (transactions, triggers, materialised views, events).

### Production: migrating without resolving conflicts

**Fix:** detect conflicting values first, agree rules, log every decision.

## Debugging and troubleshooting

- **The same customer appears with different details**: an update anomaly — find duplicated facts with `GROUP BY key HAVING count(DISTINCT value) > 1`, then remove the redundancy.
- **A report counts too much after a "simple" join**: a one-to-many join multiplied rows — check for denormalised tables with repeated rows, or aggregate before joining.
- **A migration produced more rows than expected**: a decomposition joined on non-key columns, or `DISTINCT` was missing when extracting entities.
- **A unique constraint fails during migration**: the source data contained conflicting duplicates — the constraint just found the anomalies; resolve them rather than dropping the constraint.
- **Dashboard numbers lag reality**: a materialised view or read model is behind — check its refresh schedule and lag.

## Security summary

- Normalised designs keep **personal data in one place**, making access control, encryption, anonymisation and deletion requests far easier ({{ch:database-design}}).
- **Denormalised copies, caches and read models** multiply where personal data lives; each copy needs the same protection and must honour deletions.
- **Constraints on normalised tables** stop inconsistent or malicious data that redundant designs cannot even express rules for.
- Materialised views and summary tables need **the same permissions model** as their sources — do not expose aggregated personal data through a less protected view.

## How a senior engineer thinks about this

- **One fact, one place.** When they see the same value in two tables, they ask whether it is the same fact or a snapshot of a different one.
- **Dependencies come from the business.** They check assumptions such as "email identifies a customer" with real data and with the people who know the domain.
- **Normalise first, denormalise with evidence.** Duplication is a performance tool used after measurement, with an automatic way to keep it correct.
- **Don't over-normalise.** Repeated strings are not always redundant facts; tables should model real entities.
- **Migrations surface truth.** Normalising real data forces decisions about conflicts — they make those decisions explicit and recorded.

## Exercises

These continue in the same session as the chapter's examples.

### Exercise 1 — Repeating groups

**Objective:** practise first normal form.
**What to do:** a legacy table stores `contacts (id, name, phone1, phone2, phone3)`. Create it with sample data, then create a normalised `contact_phones` table and migrate the non-null numbers into it, recording which slot each came from.

<details>
<summary>Show the solution</summary>

```sql
CREATE TABLE contacts (id integer PRIMARY KEY, name text NOT NULL, phone1 text, phone2 text, phone3 text);
INSERT INTO contacts VALUES
  (1, 'Supplier: Leaf & Co', '0113 496 0000', '07700 900123', NULL),
  (2, 'Courier: FastVan',    '0161 496 0555', NULL,           NULL);

CREATE TABLE contact_phones (
  contact_id  integer NOT NULL REFERENCES contacts (id),
  position    smallint NOT NULL,
  phone       text NOT NULL,
  PRIMARY KEY (contact_id, position)
);

INSERT INTO contact_phones (contact_id, position, phone)
SELECT id, p.position, p.phone
FROM contacts,
     LATERAL (VALUES (1, phone1), (2, phone2), (3, phone3)) AS p (position, phone)
WHERE p.phone IS NOT NULL;

SELECT c.name, cp.position, cp.phone
FROM contact_phones cp JOIN contacts c ON c.id = cp.contact_id
ORDER BY c.name, cp.position;
```

**Result:**

```text
        name         | position |     phone
---------------------+----------+---------------
 Courier: FastVan    |        1 | 0161 496 0555
 Supplier: Leaf & Co |        1 | 0113 496 0000
 Supplier: Leaf & Co |        2 | 07700 900123
(3 rows)
```

**Walkthrough:** `LATERAL (VALUES …)` turns the three columns of each row into three rows, and the `WHERE` drops empty slots. Contacts can now have any number of phones, and queries such as "find the contact with this number" need one condition instead of three. After the application switches over, the old columns can be dropped (expand–contract, {{ch:database-design}}). In a real design you would probably replace `position` with a `kind` column (`office`, `mobile`).

</details>

### Exercise 2 — Find the dependencies

**Objective:** practise reasoning about functional dependencies and normal forms.
**What to do:** a table `deliveries (delivery_id, order_no, van_id, driver_name, driver_phone, van_registration, delivered_at)` has one row per delivery; each van has one registration; each delivery has one driver; drivers are not tied to vans. List the functional dependencies, say which normal form the table violates, and propose a decomposition.

<details>
<summary>Show the solution</summary>

**Dependencies**
- `delivery_id → order_no, van_id, driver_name, delivered_at`
- `van_id → van_registration`
- `driver_name → driver_phone` (better: introduce `driver_id`, since names are not unique)

**Normal form:** the key is the single column `delivery_id`, so the table is in 2NF. It violates **3NF** because of transitive dependencies: `delivery_id → van_id → van_registration` and `delivery_id → driver → driver_phone`. Symptoms: a driver's phone repeated on every delivery (update anomaly); a new van cannot be recorded before its first delivery (insert anomaly).

**Decomposition**
- `vans (id PK, registration UNIQUE)`
- `drivers (id PK, name, phone)`
- `deliveries (id PK, order_no FK, van_id FK, driver_id FK, delivered_at)`

</details>

### Exercise 3 — Detect the anomaly before migrating

**Objective:** practise checking dependencies with SQL.
**What to write:** using `order_sheet` (which still contains the email we changed for order 1003), find every customer name associated with more than one email, listing the emails.

<details>
<summary>Show the solution</summary>

```sql
SELECT customer_name, string_agg(DISTINCT customer_email, ', ') AS emails
FROM order_sheet
GROUP BY customer_name
HAVING count(DISTINCT customer_email) > 1;
```

**Result:**

```text
 customer_name |                 emails
---------------+-----------------------------------------
 Sara Khan     | sara.khan@example.com, sara@example.com
(1 row)
```

**Walkthrough:** grouping by the supposed determinant and counting distinct values of the dependent column finds every violation. Run checks like this for every dependency you intend to enforce **before** adding unique constraints in a migration; each result row is a decision to make (merge, keep newest, ask the customer).

</details>

### Exercise 4 — Production scenario: the denormalisation request

**Objective:** practise judging denormalisation.
**The scenario:** the product listing page shows each product's name, price, category name, average rating and number of reviews. A developer proposes adding `category_name`, `avg_rating` and `review_count` columns to `products`, updated "whenever we remember". The page currently takes 900 ms. What do you recommend?

<details>
<summary>Show the solution</summary>

1. **Measure first**: look at the query plan ({{ch:query-optimization}}). Joining `categories` by primary key is cheap; the cost is almost certainly aggregating reviews per product on every request.
2. **Do not copy `category_name`**: it is a true redundancy (renaming a category would need many updates) and the join is not the bottleneck.
3. **Precompute review statistics with a single source of truth**: either maintain `review_count` and `rating_sum` on `products` in the **same transaction** as each review insert, update or delete (or with a trigger), or use a materialised view refreshed every minute if slight staleness is acceptable.
4. **Index** the reviews table on `product_id` so recomputation is fast when needed ({{ch:indexes}}).
5. **Cache** the listing page for a short time if traffic is high ({{ch:caching}}).
6. **Never "whenever we remember"**: any denormalised value must be updated automatically, with a periodic job that recomputes and compares to detect drift.

</details>

## Summary

Redundancy — storing the same fact in several places — causes **update anomalies** (inconsistent copies), **insert anomalies** (facts that cannot be recorded independently) and **delete anomalies** (facts lost along with others). **Normalisation** removes it by placing each fact in the table about the thing it describes, guided by **functional dependencies** (A → B: A determines B), which come from business rules and can be checked against data with `GROUP BY … HAVING count(DISTINCT …) > 1`.

**1NF** requires atomic values and no repeating groups; **2NF** requires non-key columns to depend on the **whole** key (it matters for composite keys); **3NF** forbids **transitive** dependencies, so non-key columns depend on **nothing but the key**; **BCNF** requires every determinant to be a superkey, occasionally at the cost of making another constraint harder to enforce; **4NF** and **5NF** handle independent multi-valued facts and rare join dependencies. Decompositions should be **lossless** — joined on keys to reproduce the original — and migrating real data forces explicit decisions about the conflicts that anomalies created.

Not every copy is redundancy: **snapshots** record different facts and must stay; coincidental repetition (city names) need not become tables. **Denormalisation** is a deliberate, measured performance choice — **materialised views**, summary columns updated in the same transaction or by triggers, read models and analytics schemas — always with one source of truth and an automatic way of staying in step.

## Key terms

- **Normalisation** — Structuring tables so each fact is stored once, following the normal forms.
- **Redundancy** — The same fact stored in more than one place.
- **Update anomaly** — Inconsistency caused by changing only some copies of a repeated fact.
- **Insert anomaly** — Being unable to store a fact without storing an unrelated one.
- **Delete anomaly** — Losing a fact because a row containing another fact was deleted.
- **Functional dependency** — A relationship where the value of one set of columns determines another.
- **Determinant** — The column or columns on the left side of a functional dependency.
- **Candidate key** — A minimal set of columns that uniquely identifies each row.
- **Superkey** — Any set of columns that uniquely identifies each row.
- **Prime attribute** — A column that belongs to some candidate key.
- **First normal form (1NF)** — Every column holds atomic values, with no repeating groups.
- **Repeating group** — Several columns or a list holding multiple values of the same kind.
- **Second normal form (2NF)** — 1NF with no non-key column depending on only part of a composite key.
- **Partial dependency** — A dependency of a non-key column on part of a composite key.
- **Third normal form (3NF)** — 2NF with no non-key column depending on another non-key column.
- **Transitive dependency** — A dependency of a column on the key only through another column.
- **Boyce–Codd normal form (BCNF)** — Every non-trivial functional dependency has a superkey as its determinant.
- **Fourth normal form (4NF)** — No table stores independent multi-valued facts together.
- **Multi-valued dependency** — A column determining a set of values independently of other columns.
- **Decomposition** — Splitting a table into smaller tables.
- **Lossless decomposition** — A decomposition whose tables can be joined to reproduce the original data exactly.
- **Spurious rows** — Incorrect rows produced by joining decomposed tables on non-key columns.
- **Denormalisation** — Deliberately storing redundant or precomputed data for performance.
- **Materialised view** — A stored query result that is refreshed on demand.
- **Read model** — A separate, query-optimised copy of data kept in step with the source of truth.
- **Star schema** — A denormalised analytics design with fact tables joined to dimension tables.

## What comes next

A normalised schema keeps data correct, and its many small tables are joined by keys — which is fast only when the database can find rows quickly. The next chapter, {{ch:indexes}}, explains how: B-tree indexes and how they work, composite and covering indexes, partial and expression indexes, specialised index types, how the planner decides whether to use an index, and the costs indexes add to every write.
