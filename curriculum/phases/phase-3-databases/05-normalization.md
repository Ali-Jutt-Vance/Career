# Phase 3 — Chapter 5: Database Normalization

---

## Chapter Overview

Normalization is the process of organizing a database to minimize redundancy and eliminate data anomalies. It's achieved through a series of "normal forms" (1NF, 2NF, 3NF, BCNF) that impose progressively stricter rules on table structure.

**Why normalize:**
- Eliminate insert/update/delete anomalies
- Ensure data consistency (one place to change data)
- Reduce storage waste from duplicate data

**When to denormalize:**
- Read-heavy reporting queries that require many JOINs
- Materialized views and data warehouses
- Known bottlenecks proven by profiling

---

## Beginner Theory

### Functional Dependency

```
Column A → Column B means: knowing A uniquely determines B
Example: student_id → student_name (if you know the ID, you know the name)
Example: order_id, product_id → quantity (both columns together determine quantity)

The left side is the "determinant"; the right side is "functionally dependent."
Normalization eliminates non-ideal functional dependencies.
```

### The Normal Forms

```
1NF — First Normal Form:
  ✓ Each column holds atomic (indivisible) values
  ✓ No repeating groups or arrays
  ✓ Each row is uniquely identifiable (has a key)
  
  VIOLATION: storing "Alice, Bob" in a single "members" column
  FIX: separate rows, one member per row

2NF — Second Normal Form:
  ✓ In 1NF
  ✓ No partial dependencies (non-key columns depend on WHOLE primary key)
  
  Only relevant when the primary key is composite.
  VIOLATION: in (order_id, product_id, product_name) — product_name depends 
    only on product_id, not the full composite key
  FIX: move product_name to products table

3NF — Third Normal Form:
  ✓ In 2NF
  ✓ No transitive dependencies (non-key columns don't depend on other non-key columns)
  
  VIOLATION: employees(emp_id, dept_id, dept_name) — dept_name depends on dept_id, 
    not on emp_id
  FIX: move dept_name to departments table

BCNF — Boyce-Codd Normal Form:
  Stricter version of 3NF. For every functional dependency A→B, A must be a superkey.
  Rarely needed in practice.

4NF, 5NF:
  Handle multi-valued dependencies. Very rarely applied in practice.
```

---

## Basic Examples

### Normalization Step by Step

```sql
-- UNNORMALIZED (0NF) — real-world messy data
-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ order_id │ customer_name │ customer_email │ products                     │
-- │ 1        │ Alice Smith   │ alice@ex.com   │ "Laptop:999, Mouse:25"       │
-- │ 2        │ Bob Jones     │ bob@ex.com     │ "Keyboard:75"                │
-- └──────────────────────────────────────────────────────────────────────────┘
-- Problems: products not atomic, can't query by product, can't count items

-- FIRST NORMAL FORM (1NF) — atomic values, no repeating groups
-- ┌──────────┬──────────────┬────────────────┬─────────────┬──────────┬───────┐
-- │ order_id │ customer_name│ customer_email │ product_name│ quantity │ price │
-- │ 1        │ Alice Smith  │ alice@ex.com   │ Laptop      │ 1        │ 999   │
-- │ 1        │ Alice Smith  │ alice@ex.com   │ Mouse       │ 1        │ 25    │
-- │ 2        │ Bob Jones    │ bob@ex.com     │ Keyboard    │ 1        │ 75    │
-- └──────────┴──────────────┴────────────────┴─────────────┴──────────┴───────┘
-- PK: (order_id, product_name)
-- Problem: customer_name and customer_email depend only on order_id (partial dependency)

-- SECOND NORMAL FORM (2NF) — remove partial dependencies
-- orders: (order_id PK, customer_name, customer_email)
-- order_items: (order_id FK, product_name, quantity, price)
-- ┌──────────┬──────────────┬────────────────┐
-- │ order_id │ customer_name│ customer_email │
-- │ 1        │ Alice Smith  │ alice@ex.com   │
-- │ 2        │ Bob Jones    │ bob@ex.com     │
-- └──────────┴──────────────┴────────────────┘
-- ┌──────────┬─────────────┬──────────┬───────┐
-- │ order_id │ product_name│ quantity │ price │
-- ...
-- Problem: customer_email depends on customer_name (transitive dependency)
--   customer_name → customer_email (Alice always has alice@ex.com)

-- THIRD NORMAL FORM (3NF) — remove transitive dependencies
-- customers: (customer_id PK, name, email)
-- orders:    (order_id PK, customer_id FK)
-- order_items: (order_id FK, product_id FK, quantity, price)
-- products:  (product_id PK, name, base_price, ...)

-- Final 3NF schema:
CREATE TABLE customers (
  id    UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name  VARCHAR(200) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE
);

CREATE TABLE orders (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID        NOT NULL REFERENCES customers(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE products (
  id    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  name  VARCHAR(255)  NOT NULL,
  price DECIMAL(10,2) NOT NULL
);

CREATE TABLE order_items (
  order_id   UUID          NOT NULL REFERENCES orders(id),
  product_id UUID          NOT NULL REFERENCES products(id),
  quantity   INTEGER       NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10,2) NOT NULL,  -- price snapshot at time of order
  PRIMARY KEY (order_id, product_id)
);
```

---

## Intermediate Concepts

### Detecting Normalization Violations

```sql
-- Check for update anomalies: customer name duplicated in orders table
-- If Alice changes her email, how many rows need updating?
SELECT customer_email, COUNT(DISTINCT customer_name) AS name_variations
FROM orders_denormalized
GROUP BY customer_email
HAVING COUNT(DISTINCT customer_name) > 1;  -- should return 0 if no anomalies

-- Check for delete anomalies
-- If we delete the last order for a customer, do we lose the customer's info?
-- (only if customer data lives in orders table — a 3NF violation)

-- Check for insert anomalies
-- Can we add a new product without creating an order?
-- (in properly normalized schema: yes — products table is independent)
```

### When to Denormalize

```sql
-- Justified denormalization example:
-- Running JOIN for every report query on a 10M-row fact table is slow
-- Solution: denormalize with a materialized view

CREATE MATERIALIZED VIEW daily_revenue_summary AS
SELECT
  DATE_TRUNC('day', o.created_at) AS day,
  c.region                         AS region,
  COUNT(o.id)                      AS order_count,
  SUM(o.total)                     AS revenue,
  AVG(o.total)                     AS avg_order_value
FROM orders o
JOIN customers c ON c.id = o.customer_id
WHERE o.status = 'delivered'
GROUP BY 1, 2;

CREATE UNIQUE INDEX ON daily_revenue_summary(day, region);

-- Refresh periodically (or on schedule)
REFRESH MATERIALIZED VIEW CONCURRENTLY daily_revenue_summary;

-- Reports now query the summary instead of joining millions of rows
SELECT * FROM daily_revenue_summary
WHERE day >= NOW() - INTERVAL '30 days'
ORDER BY day DESC;
```

---

## Interview Preparation

**Q1: What is the difference between 1NF, 2NF, and 3NF?**
A: 1NF requires atomic values in every column — no arrays, no comma-separated lists, no repeating column groups (phone1, phone2, phone3). Every row must be uniquely identifiable. 2NF requires being in 1NF plus no partial dependencies — every non-key column must depend on the WHOLE primary key, not just part of it. Only matters when the PK is composite. 3NF requires being in 2NF plus no transitive dependencies — non-key columns must depend only on the primary key, not on other non-key columns (zip → city is a transitive dependency that violates 3NF).

**Q2: What are data anomalies and how does normalization prevent them?**
A: Data anomalies are inconsistency problems in unnormalized tables: Insert anomaly — you can't add a new product without creating an order (product data is stored only in order_items). Update anomaly — if a customer changes their email, you must update it in every order row (massive, error-prone). Delete anomaly — deleting the last order for a customer deletes the customer's information too. Normalization prevents these by separating concerns: products go in a products table (insertable independently), customers in a customers table (updatable in one place), and orders just reference them via FK.

**Q3: When is denormalization justified?**
A: Denormalization is justified when: 1) A specific query is proven to be a performance bottleneck (profiled, not assumed). 2) The query requires joining large tables frequently (hot path). 3) The denormalized data changes infrequently (low risk of staleness). Denormalization strategies include: materialized views (database handles refresh), adding computed columns to avoid recalculation, snapshot copies for point-in-time accuracy (order line item prices), and read replicas for analytics workloads. Never denormalize preemptively — it complicates writes and creates consistency risks.

---

## Practical Tasks

### Beginner (10 Tasks)
1. Take an unnormalized spreadsheet and convert it to 1NF.
2. Identify a partial dependency violation and fix it (2NF).
3. Identify a transitive dependency and fix it (3NF).
4. Write a SQL query to detect duplicate data in a denormalized table.
5. Normalize a contacts table: name, phone1, phone2, phone3 → contacts + phones.
6. Normalize an orders table that stores customer name and email inline.
7. Identify what anomalies would occur in a given unnormalized schema.
8. Draw the ER diagram for a normalized schema.
9. Convert an enum-like column (status: 'active'/'inactive') — is this 3NF?
10. Design a normalized student enrollment system.

### Intermediate (10 Tasks)
1. Find and fix all normalization violations in a given complex schema.
2. Implement a materialized view for slow reporting queries.
3. Justify denormalization for a specific analytics use case.
4. Build an update trigger that maintains a denormalized summary column.
5. Profile a JOIN query vs. denormalized query — compare performance.
6. Normalize a legacy schema with 50+ columns in one "catch-all" table.
7. Build a BCNF violation example and fix it.
8. Design a schema where denormalization is explicitly justified.
9. Write a test to detect update anomalies in a schema.
10. Implement proper 3NF for a multi-currency price table.

### Advanced (10 Tasks)
1. Normalize a complex ERP schema to 3NF.
2. Design a slowly changing dimension (SCD Type 2) for historical data.
3. Build a hybrid normalized + denormalized schema for OLAP queries.
4. Implement incremental materialized view refresh.
5. Design a schema that handles 1:1, 1:N, and M:N all correctly.
6. Implement column store table for analytics (columnar storage).
7. Normalize a JSON-heavy MongoDB collection into PostgreSQL relations.
8. Compare query performance before and after normalization.
9. Design a schema for temporal data (tracks history of changes).
10. Implement a read model (CQRS) denormalized for fast reads.

---

## Self Assessment
1. What is the First Normal Form (1NF)?
2. What is a partial dependency?
3. What is a transitive dependency?
4. What is the Third Normal Form (3NF)?
5. What is an insert anomaly?
6. What is an update anomaly?
7. What is a delete anomaly?
8. What is a materialized view?
9. When is denormalization justified?
10. What does functional dependency mean?

---

## Cheat Sheet

```
Normal Forms Quick Reference:

1NF: Atomic values + unique rows (no arrays, no repeated columns)
2NF: 1NF + no partial dependency (each non-key col depends on FULL PK)
3NF: 2NF + no transitive dependency (non-key cols depend ONLY on PK)
BCNF: every determinant is a superkey

Anomalies:
  Insert: can't add data without adding something else
  Update: changing one value requires changing many rows
  Delete: deleting one record destroys unrelated data

Process:
  1. List all functional dependencies
  2. Find violations of target normal form
  3. Decompose into separate tables until violations are eliminated
  4. Add FKs to maintain referential integrity

Denormalization is OK when:
  ✓ Query is a proven bottleneck
  ✓ Data changes rarely
  ✓ Consistency maintained via triggers/events
  → Use materialized views instead of manual denorm when possible
```
