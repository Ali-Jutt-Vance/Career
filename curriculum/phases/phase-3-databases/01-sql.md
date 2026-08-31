# Phase 3 — Chapter 1: SQL Fundamentals

---

## Chapter Overview

SQL (Structured Query Language) is the universal language for relational databases. Every backend engineer must know SQL deeply — it's the most important skill for working with data at any scale.

**Covered in this chapter:**
- SQL data types, constraints, DDL (CREATE, ALTER, DROP)
- DML: SELECT, INSERT, UPDATE, DELETE
- Joins (INNER, LEFT, RIGHT, FULL, CROSS, SELF)
- Aggregations, GROUP BY, HAVING
- Subqueries, CTEs (WITH), window functions
- Transactions, isolation levels
- SQL best practices and anti-patterns

---

## Beginner Theory

### Relational Model Basics

```
A relational database organizes data into TABLES (relations).
Each table has:
  - Columns (fields) with defined types
  - Rows (tuples/records) of data
  - A primary key (unique identifier per row)
  - Optional foreign keys (links to other tables)

Tables relate to each other through:
  - One-to-One  (user → profile)
  - One-to-Many (user → orders)
  - Many-to-Many (students ↔ courses, via join table)
```

### SQL Data Types (Standard)

```sql
-- Numeric
INTEGER          -- whole numbers
BIGINT           -- large whole numbers
DECIMAL(p, s)    -- exact decimal (money: DECIMAL(10,2))
FLOAT / DOUBLE   -- approximate decimal (avoid for money!)

-- String
VARCHAR(n)       -- variable length, max n chars
TEXT             -- unlimited length string
CHAR(n)          -- fixed length

-- Date/Time
DATE             -- 2025-01-15
TIME             -- 14:30:00
TIMESTAMP        -- 2025-01-15 14:30:00
TIMESTAMPTZ      -- with timezone (PostgreSQL)

-- Boolean
BOOLEAN          -- TRUE / FALSE

-- Binary
BYTEA / BLOB     -- binary data
UUID             -- 550e8400-e29b-41d4-a716-446655440000
```

---

## Basic Examples

### DDL — Creating Tables

```sql
-- Users table
CREATE TABLE users (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email      VARCHAR(255) NOT NULL UNIQUE,
  name       VARCHAR(100) NOT NULL,
  role       VARCHAR(20)  NOT NULL DEFAULT 'user'
                          CHECK (role IN ('user', 'admin', 'moderator')),
  is_active  BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Orders table (one-to-many with users)
CREATE TABLE orders (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  total       DECIMAL(10,2) NOT NULL CHECK (total >= 0),
  status      VARCHAR(20)   NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending','processing','shipped','delivered','cancelled')),
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Products
CREATE TABLE products (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(255)  NOT NULL,
  price       DECIMAL(10,2) NOT NULL CHECK (price >= 0),
  stock       INTEGER       NOT NULL DEFAULT 0 CHECK (stock >= 0),
  category_id UUID          REFERENCES categories(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Order items (many-to-many: orders ↔ products)
CREATE TABLE order_items (
  id         UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id   UUID          NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID          NOT NULL REFERENCES products(id),
  quantity   INTEGER       NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10,2) NOT NULL,
  UNIQUE (order_id, product_id)
);

-- Index frequently queried columns
CREATE INDEX idx_orders_user_id  ON orders(user_id);
CREATE INDEX idx_orders_status   ON orders(status);
CREATE INDEX idx_orders_created  ON orders(created_at DESC);
```

### DML — Querying Data

```sql
-- SELECT with WHERE, ORDER BY, LIMIT
SELECT id, name, email, role
FROM   users
WHERE  is_active = TRUE
  AND  role = 'admin'
ORDER  BY created_at DESC
LIMIT  20 OFFSET 0;

-- INSERT
INSERT INTO users (email, name, role)
VALUES ('alice@example.com', 'Alice Smith', 'user')
RETURNING id, created_at;

-- INSERT multiple rows
INSERT INTO order_items (order_id, product_id, quantity, unit_price)
VALUES
  ('order-uuid', 'product-1-uuid', 2, 29.99),
  ('order-uuid', 'product-2-uuid', 1, 49.99);

-- UPDATE
UPDATE users
SET    name = 'Alice Johnson', updated_at = NOW()
WHERE  id = 'user-uuid-here'
RETURNING *;

-- UPDATE with JOIN (PostgreSQL)
UPDATE orders o
SET    status = 'cancelled'
FROM   users u
WHERE  o.user_id = u.id
  AND  u.email = 'test@example.com'
  AND  o.status = 'pending';

-- DELETE with condition
DELETE FROM orders
WHERE  status = 'cancelled'
  AND  created_at < NOW() - INTERVAL '90 days';

-- Upsert (INSERT or UPDATE on conflict)
INSERT INTO user_preferences (user_id, theme, language)
VALUES ($1, $2, $3)
ON CONFLICT (user_id)
DO UPDATE SET
  theme    = EXCLUDED.theme,
  language = EXCLUDED.language,
  updated_at = NOW();
```

### JOINs

```sql
-- INNER JOIN — only matching rows from both tables
SELECT u.name, o.id as order_id, o.total, o.status
FROM   users u
INNER  JOIN orders o ON o.user_id = u.id
WHERE  o.status = 'delivered'
ORDER  BY o.created_at DESC;

-- LEFT JOIN — all users, even those with no orders
SELECT u.name, COUNT(o.id) AS order_count, COALESCE(SUM(o.total), 0) AS total_spent
FROM   users u
LEFT   JOIN orders o ON o.user_id = u.id
GROUP  BY u.id, u.name
ORDER  BY total_spent DESC;

-- Multi-table join
SELECT u.name, p.name AS product, oi.quantity, oi.unit_price
FROM   users u
JOIN   orders o      ON o.user_id   = u.id
JOIN   order_items oi ON oi.order_id = o.id
JOIN   products p    ON p.id        = oi.product_id
WHERE  u.id = 'user-uuid-here'
ORDER  BY o.created_at DESC;

-- SELF JOIN — manager/employee hierarchy
SELECT e.name AS employee, m.name AS manager
FROM   employees e
LEFT   JOIN employees m ON e.manager_id = m.id;
```

---

## Intermediate Concepts

### Aggregations

```sql
-- COUNT, SUM, AVG, MIN, MAX
SELECT
  COUNT(*)                                 AS total_orders,
  COUNT(CASE WHEN status = 'delivered' THEN 1 END) AS delivered,
  SUM(total)                               AS revenue,
  AVG(total)                               AS avg_order_value,
  MIN(total)                               AS smallest_order,
  MAX(total)                               AS largest_order
FROM orders
WHERE created_at >= DATE_TRUNC('month', NOW());

-- GROUP BY with HAVING
SELECT
  user_id,
  COUNT(*)          AS order_count,
  SUM(total)        AS lifetime_value
FROM orders
WHERE status != 'cancelled'
GROUP BY user_id
HAVING SUM(total) > 1000
ORDER BY lifetime_value DESC
LIMIT 10;

-- GROUP BY with date truncation
SELECT
  DATE_TRUNC('day', created_at) AS day,
  COUNT(*)                      AS orders,
  SUM(total)                    AS revenue
FROM orders
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY 1
ORDER BY 1;
```

### CTEs and Subqueries

```sql
-- CTE (Common Table Expression) — named temporary result
WITH monthly_revenue AS (
  SELECT
    DATE_TRUNC('month', created_at) AS month,
    SUM(total)                      AS revenue
  FROM orders
  WHERE status = 'delivered'
  GROUP BY 1
),
month_over_month AS (
  SELECT
    month,
    revenue,
    LAG(revenue) OVER (ORDER BY month) AS prev_revenue
  FROM monthly_revenue
)
SELECT
  month,
  revenue,
  prev_revenue,
  ROUND((revenue - prev_revenue) / NULLIF(prev_revenue, 0) * 100, 2) AS growth_pct
FROM month_over_month
ORDER BY month;

-- Recursive CTE — category tree
WITH RECURSIVE category_tree AS (
  -- Base case: root categories
  SELECT id, name, parent_id, 0 AS depth, name::TEXT AS path
  FROM categories
  WHERE parent_id IS NULL

  UNION ALL

  -- Recursive case
  SELECT c.id, c.name, c.parent_id, ct.depth + 1, ct.path || ' > ' || c.name
  FROM categories c
  JOIN category_tree ct ON c.parent_id = ct.id
)
SELECT * FROM category_tree ORDER BY path;
```

### Window Functions

```sql
-- RANK and DENSE_RANK
SELECT
  name,
  department,
  salary,
  RANK()        OVER (PARTITION BY department ORDER BY salary DESC) AS rank,
  DENSE_RANK()  OVER (PARTITION BY department ORDER BY salary DESC) AS dense_rank,
  ROW_NUMBER()  OVER (PARTITION BY department ORDER BY salary DESC) AS row_num
FROM employees;

-- Running totals
SELECT
  created_at,
  total,
  SUM(total) OVER (ORDER BY created_at ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS running_total
FROM orders
WHERE status = 'delivered';

-- Lead / Lag — compare with adjacent rows
SELECT
  user_id,
  created_at,
  total,
  LAG(total)  OVER (PARTITION BY user_id ORDER BY created_at) AS prev_order,
  LEAD(total) OVER (PARTITION BY user_id ORDER BY created_at) AS next_order
FROM orders;

-- NTILE — divide into buckets
SELECT
  user_id,
  SUM(total) AS lifetime_value,
  NTILE(4) OVER (ORDER BY SUM(total) DESC) AS quartile  -- 1=top 25%
FROM orders
GROUP BY user_id;
```

---

## Advanced Concepts

### Transactions

```sql
-- ACID transaction
BEGIN;

UPDATE accounts SET balance = balance - 500.00 WHERE id = 'account-A';
UPDATE accounts SET balance = balance + 500.00 WHERE id = 'account-B';

-- Check constraints satisfied
SELECT balance FROM accounts WHERE id = 'account-A';

COMMIT;  -- or ROLLBACK if error

-- Savepoints within transactions
BEGIN;
INSERT INTO orders VALUES (...);
SAVEPOINT order_created;

INSERT INTO order_items VALUES (...);
-- If this fails:
ROLLBACK TO order_created;  -- keeps the order, rolls back items
-- Or:
COMMIT;
```

---

## Interview Preparation

**Q1: What is the difference between INNER JOIN, LEFT JOIN, and FULL OUTER JOIN?**
A: INNER JOIN returns only rows that have matching records in BOTH tables — non-matching rows are excluded from results. LEFT JOIN returns all rows from the left table, plus matched rows from the right — non-matching right-table rows appear as NULL. RIGHT JOIN is the mirror. FULL OUTER JOIN returns all rows from both tables — non-matches appear as NULL on either side. CROSS JOIN returns every combination (Cartesian product). Use LEFT JOIN when you want all records from the "owning" table regardless of whether related records exist (e.g., all users even if they have no orders).

**Q2: What is a window function and how does it differ from GROUP BY?**
A: GROUP BY collapses rows into one row per group — you lose individual row data. Window functions compute aggregates OVER a window of rows WITHOUT collapsing them — each row retains its identity but gains a computed column like `SUM(total) OVER (PARTITION BY user_id ORDER BY date)`. Common window functions: ROW_NUMBER(), RANK(), DENSE_RANK(), LAG(), LEAD(), NTILE(), SUM OVER, AVG OVER. The PARTITION BY clause defines how rows are grouped; ORDER BY within OVER defines the ordering within each partition.

**Q3: What is the difference between HAVING and WHERE?**
A: WHERE filters rows BEFORE aggregation. HAVING filters groups AFTER aggregation. You can't use aggregate functions (SUM, COUNT, AVG) in a WHERE clause — use HAVING instead. Example: `WHERE total > 100` filters individual rows; `HAVING SUM(total) > 1000` filters groups of rows after GROUP BY.

---

## Practical Tasks

### Beginner (10 Tasks)
1. Create a `users` table with UUID PK, email unique, timestamps.
2. Insert 10 sample users and query them all.
3. Write a SELECT with WHERE, ORDER BY, and LIMIT.
4. INNER JOIN users with orders to get each user's orders.
5. LEFT JOIN users with orders to find users who have never ordered.
6. Use GROUP BY to count orders per user.
7. Use HAVING to find users with more than 3 orders.
8. Write an UPDATE with a WHERE clause and RETURNING *.
9. Use COALESCE to replace NULL with a default value.
10. Use DISTINCT to remove duplicate rows from a result set.

### Intermediate (10 Tasks)
1. Write a multi-table JOIN (users → orders → order_items → products).
2. Write a CTE to calculate month-over-month revenue growth.
3. Use window functions to rank users by lifetime order value.
4. Write a recursive CTE for a category tree.
5. Use UPSERT (INSERT ON CONFLICT) for idempotent inserts.
6. Write a subquery in WHERE (users who ordered a specific product).
7. Use DATE_TRUNC to group orders by week.
8. Write a transaction for a bank transfer (debit + credit atomically).
9. Use NULLIF to prevent division by zero in percentage calculation.
10. Use CASE WHEN to categorize orders into buckets.

### Advanced (10 Tasks)
1. Write a query to find the 2nd highest salary without using LIMIT.
2. Use LAG/LEAD to detect consecutive day streaks.
3. Write a pivot query (rows to columns) using conditional aggregation.
4. Implement a queue: SELECT FOR UPDATE SKIP LOCKED for a job queue.
5. Use EXPLAIN ANALYZE to identify a slow query and rewrite it.
6. Write a full-text search query using tsvector and tsquery.
7. Use JSONB operators to query embedded JSON data.
8. Write a materialized view for expensive aggregations.
9. Implement optimistic locking using version columns.
10. Use LATERAL JOIN to apply a function to each row.

---

## Self Assessment
1. What are the four SQL statement categories (DDL, DML, DCL, TCL)?
2. What is the difference between WHERE and HAVING?
3. What is a LEFT JOIN?
4. What is a CTE?
5. What is a window function?
6. What does ON DELETE CASCADE mean?
7. What is the difference between UNIQUE and PRIMARY KEY?
8. What does GROUP BY do?
9. What is a transaction and why is it needed?
10. What is the RETURNING clause in PostgreSQL?

---

## Cheat Sheet

```sql
-- Create table
CREATE TABLE t (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL);

-- CRUD
INSERT INTO t (name) VALUES ('x') RETURNING *;
SELECT * FROM t WHERE name = 'x' ORDER BY name LIMIT 10;
UPDATE t SET name = 'y' WHERE id = $1 RETURNING *;
DELETE FROM t WHERE id = $1;

-- Joins
SELECT a.*, b.col FROM a JOIN b ON b.a_id = a.id;            -- INNER
SELECT a.*, b.col FROM a LEFT JOIN b ON b.a_id = a.id;       -- LEFT
SELECT a.*, b.col FROM a FULL OUTER JOIN b ON b.a_id = a.id; -- FULL

-- Aggregation
SELECT col, COUNT(*), SUM(val), AVG(val) FROM t GROUP BY col HAVING COUNT(*) > 1;

-- CTE
WITH cte AS (SELECT ...) SELECT * FROM cte;

-- Window
SELECT *, ROW_NUMBER() OVER (PARTITION BY col ORDER BY val DESC) FROM t;

-- Upsert
INSERT INTO t (id, col) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET col = EXCLUDED.col;

-- Transaction
BEGIN; UPDATE ...; UPDATE ...; COMMIT;
```
