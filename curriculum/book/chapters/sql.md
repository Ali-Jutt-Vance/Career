# SQL: Asking a Database Questions

> [!GOALS]
> - Explain the relational model: tables, rows, columns, keys and relationships.
> - Create tables with sensible **data types** and **constraints** that protect your data.
> - Insert, query, update and delete rows with `INSERT`, `SELECT`, `UPDATE` and `DELETE`.
> - Filter, sort and limit results, and handle **`NULL`** correctly.
> - Summarise data with **aggregates**, `GROUP BY` and `HAVING`.
> - Combine tables with **joins**, and break problems down with **subqueries** and **CTEs**.
> - Use **window functions** for rankings, running totals and "top N per group".
> - Run SQL safely from application code with **parameterised queries**.

## Why this matters

Almost every application you will work on stores its important data in a relational database: customers, orders, payments, products, messages. The language for working with that data is **SQL** (Structured Query Language), and it has been the standard for over forty years. Frameworks and libraries come and go; SQL stays.

Back-end engineers use SQL every day, even when an ORM writes most queries for them ({{ch:orms}}): to understand what the ORM does, to write the reports and complex queries it cannot express, to investigate a production problem ("how many orders are stuck in `processing`?"), to fix data, and to design tables that keep data correct. Product managers, analysts and support staff use it too. Interviewers almost always test it.

SQL is also unusual: you describe **what** result you want, not **how** to compute it, and the database works out the fastest way. Learning to think in sets of rows instead of loops is the key step — and once it clicks, questions that would take pages of application code become a few lines.

This chapter uses **PostgreSQL**, the database most new projects choose; nearly everything here works the same in MySQL, SQL Server, SQLite and others. Every example runs on a small database for the Corner Shop, built step by step, and every result shown is the real output.

## The simple idea

Picture a set of well-organised spreadsheets: one sheet lists customers, another lists products, another lists orders. Each sheet has fixed columns, every row describes one thing, and each row has a unique number. An order row does not repeat the customer's name and address — it just says "customer number 3", and you look the customer up on the other sheet.

A relational database is exactly that, with two big differences. First, it **enforces rules**: a price cannot be negative, an order cannot point to a customer who does not exist, two customers cannot share an email address. Second, you do not scroll and filter by hand: you **ask questions** in SQL — "which customers in Leeds spent more than £50 last month?" — and the database answers with a new table.

> [!ANALOGY]
> A relational database is like a set of strict, linked spreadsheets: each sheet (table) has fixed columns, each row has a unique id, and rows refer to rows on other sheets by id. SQL is how you ask questions across all the sheets at once.
>
> **Where the analogy breaks:** a spreadsheet keeps rows in the order you typed them and shows them that way. A database table has **no guaranteed order** — rows come back in whatever order is convenient unless you ask for one with `ORDER BY`. And unlike a spreadsheet, a database is shared by many users and programs at the same time, with rules that keep the data consistent even when thousands of changes happen at once.

## The proper definition and key words

**SQL** is a declarative language for defining, querying and changing data in relational databases, where data is stored in tables related to each other through keys.

Key words:

- **Table** (relation) — a named collection of rows with the same columns.
- **Row** (record) — one item in a table: one customer, one order.
- **Column** (field, attribute) — a named value every row has, with a data type.
- **Primary key** — the column (or columns) that uniquely identifies each row.
- **Foreign key** — a column that refers to a primary key in another table, linking rows together.
- **Constraint** — a rule the database enforces: `NOT NULL`, `UNIQUE`, `CHECK`, primary and foreign keys.
- **Query** — a `SELECT` statement asking for data; its answer is itself a table (a **result set**).
- **`NULL`** — the marker for "no value" or "unknown".
- **Join** — combining rows from two tables based on a related column.
- **Aggregate** — a function that summarises many rows into one value: `COUNT`, `SUM`, `AVG`, `MIN`, `MAX`.
- **DDL** (data definition language) — statements that define structure: `CREATE`, `ALTER`, `DROP`. **DML** (data manipulation language) — statements that work with data: `SELECT`, `INSERT`, `UPDATE`, `DELETE`.

## Building the shop's database

### Level 1 — Creating tables

You can follow along in `psql` (PostgreSQL's command-line client), a graphical tool such as DBeaver or pgAdmin, or an online PostgreSQL playground. First, the customers:

```sql
CREATE TABLE customers (
  id         integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name       text        NOT NULL,
  email      text        NOT NULL UNIQUE,
  city       text,
  joined_at  timestamptz NOT NULL DEFAULT now()
);
```

**Result:**

```text
CREATE TABLE
```

Reading it line by line:

- **`id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY`** — a whole number the database generates (1, 2, 3…) for every new row, and the table's **primary key**: unique and never null.
- **`name text NOT NULL`** — text of any length; `NOT NULL` means every customer must have a name.
- **`email text NOT NULL UNIQUE`** — required, and no two customers may share one.
- **`city text`** — optional: it may be `NULL`.
- **`joined_at timestamptz NOT NULL DEFAULT now()`** — a timestamp with time zone; if no value is given, the current time is used.

Now products, with a category table for grouping them:

```sql
CREATE TABLE categories (
  id         integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name       text NOT NULL UNIQUE,
  parent_id  integer REFERENCES categories (id)
);

CREATE TABLE products (
  id           integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  sku          text          NOT NULL UNIQUE,
  name         text          NOT NULL,
  category_id  integer       NOT NULL REFERENCES categories (id),
  price        numeric(8, 2) NOT NULL CHECK (price >= 0),
  stock        integer       NOT NULL DEFAULT 0 CHECK (stock >= 0)
);
```

**Result:**

```text
CREATE TABLE
```

- **`REFERENCES categories (id)`** makes `category_id` a **foreign key**: the database refuses a product whose category does not exist.
- **`parent_id`** refers to the same table, so categories can be nested ("Tea" inside "Drinks").
- **`numeric(8, 2)`** stores exact decimal numbers with two decimal places — the right type for money. Never use floating-point types (`real`, `double precision`) for money: they cannot represent values like 0.10 exactly.
- **`CHECK (price >= 0)`** is a rule every row must satisfy.

Finally, orders and the items in each order:

```sql
CREATE TABLE orders (
  id           integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  customer_id  integer     NOT NULL REFERENCES customers (id),
  status       text        NOT NULL DEFAULT 'paid'
               CHECK (status IN ('paid', 'shipped', 'delivered', 'cancelled')),
  placed_at    timestamptz NOT NULL
);

CREATE TABLE order_items (
  order_id    integer       NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  product_id  integer       NOT NULL REFERENCES products (id),
  quantity    integer       NOT NULL CHECK (quantity > 0),
  unit_price  numeric(8, 2) NOT NULL,
  PRIMARY KEY (order_id, product_id)
);
```

**Result:**

```text
CREATE TABLE
```

- An order **belongs to** one customer; a customer can have many orders — a **one-to-many** relationship through `customer_id`.
- An order contains many products and a product appears in many orders — a **many-to-many** relationship, represented by the `order_items` table in between, whose primary key is the **pair** `(order_id, product_id)`.
- **`unit_price`** is copied into each order item, because the product's price may change later but the order must remember what the customer paid.
- **`ON DELETE CASCADE`** deletes an order's items automatically if the order is deleted.

```text
  customers 1 ──── * orders 1 ──── * order_items * ──── 1 products * ──── 1 categories
                                                                          (parent_id → categories)
```

### Level 1 — Adding data

```sql
INSERT INTO categories (name, parent_id) VALUES
  ('Drinks', NULL), ('Tea', 1), ('Coffee', 1), ('Snacks', NULL);

INSERT INTO products (sku, name, category_id, price, stock) VALUES
  ('TEA-GRN', 'Green Tea',        2, 4.20, 40),
  ('TEA-BLK', 'Breakfast Tea',    2, 3.80, 25),
  ('COF-BNS', 'Coffee Beans',     3, 9.50, 12),
  ('SNK-OAT', 'Oat Biscuits',     4, 2.50, 60),
  ('SNK-HNY', 'Honey Flapjack',   4, 1.90,  0),
  ('DRK-CHC', 'Hot Chocolate',    1, 5.00,  8);

INSERT INTO customers (name, email, city, joined_at) VALUES
  ('Sara Khan',   'sara@example.com',  'Leeds',      '2026-01-10 09:00+00'),
  ('Omar Ali',    'omar@example.com',  'Manchester', '2026-02-03 14:30+00'),
  ('Li Wei',      'li@example.com',    'Leeds',      '2026-03-15 11:00+00'),
  ('Ana Silva',   'ana@example.com',   NULL,         '2026-05-20 16:45+00'),
  ('Tom Brown',   'tom@example.com',   'York',       '2026-06-01 08:15+00');

INSERT INTO orders (customer_id, status, placed_at) VALUES
  (1, 'delivered', '2026-09-02 10:00+00'),
  (1, 'shipped',   '2026-10-14 18:20+00'),
  (2, 'delivered', '2026-09-20 12:00+00'),
  (3, 'paid',      '2026-10-30 09:45+00'),
  (1, 'cancelled', '2026-11-01 13:10+00'),
  (5, 'delivered', '2026-10-05 17:00+00');

INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES
  (1, 1, 2, 4.20), (1, 4, 1, 2.50),
  (2, 3, 1, 9.50),
  (3, 2, 3, 3.80), (3, 6, 1, 5.00),
  (4, 1, 1, 4.20), (4, 3, 2, 9.50),
  (5, 4, 4, 2.50),
  (6, 6, 2, 5.00);
```

**Result:**

```text
INSERT 0 9
```

`INSERT INTO table (columns) VALUES (...), (...)` adds rows; the database reports how many (`INSERT 0 9` — the `0` is a historical detail you can ignore). Columns not listed get their default or `NULL`. The identity columns were filled in automatically: the categories got ids 1–4, so "Tea" (id 2) has `parent_id` 1, "Drinks".

The constraints are already working. Try to break them:

```sql
INSERT INTO customers (name, email) VALUES ('Sara Again', 'sara@example.com');
```

**Result:**

```text
ERROR:  duplicate key value violates unique constraint "customers_email_key"
```

```sql
INSERT INTO orders (customer_id, placed_at) VALUES (99, '2026-11-20 10:00+00');
```

**Result:**

```text
ERROR:  insert or update on table "orders" violates foreign key constraint "orders_customer_id_fkey"
```

The database refused a duplicate email and an order for a customer who does not exist. No application bug, script or careless manual edit can put that kind of bad data in — which is why constraints belong in the database, not only in application code ({{ch:validation}}).

`INSERT ... RETURNING` gives back the new row, including generated values — very useful in applications:

```sql
INSERT INTO customers (name, email, city, joined_at)
VALUES ('Mia Jones', 'mia@example.com', 'Leeds', '2026-11-18 12:00+00')
RETURNING id, name;
```

**Result:**

```text
 id |   name
----+-----------
  7 | Mia Jones
(1 row)
```

## Asking questions with `SELECT`

### Level 1 — Choosing columns and rows

```sql
SELECT name, city
FROM customers
WHERE city = 'Leeds'
ORDER BY name;
```

**Result:**

```text
   name    | city
-----------+-------
 Li Wei    | Leeds
 Mia Jones | Leeds
 Sara Khan | Leeds
(3 rows)
```

A query has clauses that read almost like English: **`SELECT`** which columns, **`FROM`** which table, **`WHERE`** which rows, **`ORDER BY`** in what order. `SELECT *` returns every column — handy for exploring, but in application code name the columns you need, so adding a column later does not change your results.

Common conditions in `WHERE`:

```sql
SELECT sku, name, price, stock
FROM products
WHERE price BETWEEN 2 AND 5        -- inclusive range
  AND stock > 0
  AND name ILIKE '%tea%'           -- case-insensitive pattern; % matches any characters
ORDER BY price DESC;
```

**Result:**

```text
   sku   |     name      | price | stock
---------+---------------+-------+-------
 TEA-GRN | Green Tea     |  4.20 |    40
 TEA-BLK | Breakfast Tea |  3.80 |    25
(2 rows)
```

Other useful operators: `<>` (not equal), `IN ('a', 'b')`, `NOT IN`, `LIKE` (case-sensitive patterns, `_` matches one character), and `AND`, `OR`, `NOT` with parentheses to group conditions. Comments start with `--`.

**`LIMIT`** returns only the first rows — always together with `ORDER BY`, or "the first rows" are arbitrary:

```sql
SELECT name, price FROM products ORDER BY price DESC LIMIT 3;
```

**Result:**

```text
     name      | price
---------------+-------
 Coffee Beans  |  9.50
 Hot Chocolate |  5.00
 Green Tea     |  4.20
(3 rows)
```

### Level 2 — `NULL`: the value that is not a value

`NULL` means "unknown" or "missing". It does not behave like an ordinary value:

```sql
SELECT name, city FROM customers WHERE city = NULL;
```

**Result:**

```text
 name | city
------+------
(0 rows)
```

No rows — even though Ana has no city. Any comparison with `NULL` (`=`, `<>`, `<`…) gives `NULL` ("unknown"), not true, and `WHERE` keeps only rows where the condition is true. Use **`IS NULL`** and **`IS NOT NULL`**:

```sql
SELECT name, COALESCE(city, '(not given)') AS city
FROM customers
WHERE city IS NULL OR city <> 'Leeds'
ORDER BY name;
```

**Result:**

```text
   name    |    city
-----------+-------------
 Ana Silva | (not given)
 Omar Ali  | Manchester
 Tom Brown | York
(3 rows)
```

- **`COALESCE(a, b)`** returns the first non-null argument — a common way to show a default.
- **`AS city`** gives the result column a name (an **alias**).
- Notice that `city <> 'Leeds'` alone would **not** include Ana: for her the comparison is unknown. Forgetting `NULL` in conditions is one of the most common SQL bugs.

### Level 2 — Calculated columns and `CASE`

```sql
SELECT name,
       price,
       stock,
       price * stock AS stock_value,
       CASE
         WHEN stock = 0  THEN 'out of stock'
         WHEN stock < 10 THEN 'low'
         ELSE 'ok'
       END AS stock_level
FROM products
ORDER BY stock_value DESC;
```

**Result:**

```text
      name      | price | stock | stock_value | stock_level
----------------+-------+-------+-------------+--------------
 Green Tea      |  4.20 |    40 |      168.00 | ok
 Oat Biscuits   |  2.50 |    60 |      150.00 | ok
 Coffee Beans   |  9.50 |    12 |      114.00 | ok
 Breakfast Tea  |  3.80 |    25 |       95.00 | ok
 Hot Chocolate  |  5.00 |     8 |       40.00 | low
 Honey Flapjack |  1.90 |     0 |        0.00 | out of stock
(6 rows)
```

Expressions can use arithmetic, functions (`round`, `lower`, `length`, `now()`, `date_trunc`…) and **`CASE`**, SQL's if/else. The alias `stock_value` can be used in `ORDER BY`.

## Summarising data

### Level 2 — Aggregates

```sql
SELECT count(*)            AS products,
       count(*) FILTER (WHERE stock = 0) AS out_of_stock,
       sum(stock)          AS units,
       round(avg(price), 2) AS avg_price,
       min(price)          AS cheapest,
       max(price)          AS dearest
FROM products;
```

**Result:**

```text
 products | out_of_stock | units | avg_price | cheapest | dearest
----------+--------------+-------+-----------+----------+---------
        6 |            1 |   145 |      4.48 |     1.90 |    9.50
(1 row)
```

Aggregate functions turn many rows into one value. `count(*)` counts rows; `count(column)` counts non-null values; `FILTER (WHERE ...)` restricts one aggregate to some rows. Aggregates ignore `NULL`s.

### Level 2 — `GROUP BY` and `HAVING`

`GROUP BY` splits rows into groups and computes aggregates per group:

```sql
SELECT status, count(*) AS orders
FROM orders
GROUP BY status
ORDER BY orders DESC, status;
```

**Result:**

```text
  status   | orders
-----------+--------
 delivered |      3
 cancelled |      1
 paid      |      1
 shipped   |      1
(4 rows)
```

Every column in the `SELECT` list must either be in `GROUP BY` or inside an aggregate — "status" is the group; "how many" is the aggregate.

**`HAVING`** filters **groups**, after aggregation, while **`WHERE`** filters **rows**, before it:

```sql
SELECT customer_id, count(*) AS orders
FROM orders
WHERE status <> 'cancelled'      -- rows: ignore cancelled orders
GROUP BY customer_id
HAVING count(*) >= 2             -- groups: only customers with 2+ orders
ORDER BY customer_id;
```

**Result:**

```text
 customer_id | orders
-------------+--------
           1 |      2
(1 row)
```

### Level 3 — The order a query is evaluated in

A query is written `SELECT … FROM … WHERE … GROUP BY … HAVING … ORDER BY … LIMIT`, but logically it is evaluated in this order:

```text
FROM / JOIN  →  WHERE  →  GROUP BY  →  HAVING  →  SELECT  →  ORDER BY  →  LIMIT
```

This explains many puzzles: you cannot use an aggregate in `WHERE` (groups do not exist yet), you cannot use a `SELECT` alias in `WHERE` (it has not been computed yet), but you can use it in `ORDER BY`.

## Combining tables with joins

### Level 2 — Inner joins

The order rows only contain `customer_id`. To show customer names next to orders, **join** the tables on the related column:

```sql
SELECT o.id AS order_id, c.name AS customer, o.status, o.placed_at::date AS placed
FROM orders AS o
JOIN customers AS c ON c.id = o.customer_id
ORDER BY o.id;
```

**Result:**

```text
 order_id | customer  |  status   |   placed
----------+-----------+-----------+------------
        1 | Sara Khan | delivered | 2026-09-02
        2 | Sara Khan | shipped   | 2026-10-14
        3 | Omar Ali  | delivered | 2026-09-20
        4 | Li Wei    | paid      | 2026-10-30
        5 | Sara Khan | cancelled | 2026-11-01
        6 | Tom Brown | delivered | 2026-10-05
(6 rows)
```

- `JOIN customers AS c ON c.id = o.customer_id` pairs each order with the customer whose id matches.
- `o` and `c` are **table aliases**, keeping column references short and unambiguous (both tables have an `id`).
- `::date` **casts** the timestamp to a date for display.
- A plain `JOIN` is an **inner join**: only rows with a match on both sides appear.

Joins chain. Here is the money each order is worth, from four tables:

```sql
SELECT o.id AS order_id,
       c.name AS customer,
       sum(oi.quantity * oi.unit_price) AS total,
       string_agg(p.name, ', ' ORDER BY p.name) AS products
FROM orders o
JOIN customers   c  ON c.id = o.customer_id
JOIN order_items oi ON oi.order_id = o.id
JOIN products    p  ON p.id = oi.product_id
WHERE o.status <> 'cancelled'
GROUP BY o.id, c.name
ORDER BY total DESC;
```

**Result:**

```text
 order_id | customer  | total |           products
----------+-----------+-------+------------------------------
        4 | Li Wei    | 23.20 | Coffee Beans, Green Tea
        3 | Omar Ali  | 16.40 | Breakfast Tea, Hot Chocolate
        1 | Sara Khan | 10.90 | Green Tea, Oat Biscuits
        6 | Tom Brown | 10.00 | Hot Chocolate
        2 | Sara Khan |  9.50 | Coffee Beans
(5 rows)
```

`string_agg` is an aggregate that joins text values into one string.

### Level 2 — Left joins: keeping rows without matches

Which customers have never ordered? An inner join cannot tell you, because customers without orders have no match and disappear. A **`LEFT JOIN`** keeps every row from the left table, filling the right side with `NULL` when there is no match:

```sql
SELECT c.name, count(o.id) AS orders
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id
GROUP BY c.id, c.name
ORDER BY orders DESC, c.name;
```

**Result:**

```text
   name    | orders
-----------+--------
 Sara Khan |      3
 Li Wei    |      1
 Omar Ali  |      1
 Tom Brown |      1
 Ana Silva |      0
 Mia Jones |      0
(6 rows)
```

`count(o.id)` counts only non-null order ids, so customers without orders show 0 (`count(*)` would wrongly show 1, counting the row of `NULL`s). To list **only** the customers without orders, keep the rows where the right side is missing:

```sql
SELECT c.name
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id
WHERE o.id IS NULL
ORDER BY c.name;
```

**Result:**

```text
   name
-----------
 Ana Silva
 Mia Jones
(2 rows)
```

Other join types exist: `RIGHT JOIN` (the mirror image, rarely used), `FULL JOIN` (keep unmatched rows from both sides) and `CROSS JOIN` (every combination). A table can also be joined to **itself** — for example, categories with their parent category:

```sql
SELECT child.name AS category, parent.name AS parent
FROM categories child
LEFT JOIN categories parent ON parent.id = child.parent_id
ORDER BY child.id;
```

**Result:**

```text
 category | parent
----------+--------
 Drinks   |
 Tea      | Drinks
 Coffee   | Drinks
 Snacks   |
(4 rows)
```

### Level 3 — Join pitfalls

- **Missing join conditions** multiply rows: joining 1,000 orders to 1,000 customers without `ON` produces a million rows.
- **Joining two one-to-many relationships at once** multiplies rows too. If you join orders to both their items and their shipments, an order with 3 items and 2 shipments appears 6 times, and sums are inflated. Aggregate each relationship separately (in subqueries or CTEs), then join.
- **Filtering the right side of a `LEFT JOIN` in `WHERE`** turns it back into an inner join (rows with `NULL` fail the condition). Put such conditions in the `ON` clause instead.

## Breaking problems down

### Level 3 — Subqueries

A **subquery** is a query inside another query. It can produce a single value, a list, or a whole table:

```sql
-- Products priced above the average price
SELECT name, price
FROM products
WHERE price > (SELECT avg(price) FROM products)
ORDER BY price DESC;
```

**Result:**

```text
     name      | price
---------------+-------
 Coffee Beans  |  9.50
 Hot Chocolate |  5.00
(2 rows)
```

```sql
-- Customers who have bought coffee beans
SELECT name
FROM customers c
WHERE EXISTS (
  SELECT 1
  FROM orders o
  JOIN order_items oi ON oi.order_id = o.id
  JOIN products p ON p.id = oi.product_id
  WHERE o.customer_id = c.id AND p.sku = 'COF-BNS'
)
ORDER BY name;
```

**Result:**

```text
   name
-----------
 Li Wei
 Sara Khan
(2 rows)
```

`EXISTS` is true when the inner query returns at least one row. This inner query refers to `c.id` from the outer query — a **correlated subquery**, conceptually evaluated for each customer. `EXISTS` handles `NULL`s more predictably than `NOT IN`, which returns nothing at all if the list contains a `NULL` — prefer `NOT EXISTS` for "has no…" questions.

### Level 3 — CTEs: naming the steps

A **common table expression** (`WITH`) gives a subquery a name, so a complex query reads as a series of steps:

```sql
WITH order_totals AS (
  SELECT o.id, o.customer_id, sum(oi.quantity * oi.unit_price) AS total
  FROM orders o
  JOIN order_items oi ON oi.order_id = o.id
  WHERE o.status <> 'cancelled'
  GROUP BY o.id, o.customer_id
),
customer_totals AS (
  SELECT customer_id, count(*) AS orders, sum(total) AS spent
  FROM order_totals
  GROUP BY customer_id
)
SELECT c.name, ct.orders, ct.spent
FROM customer_totals ct
JOIN customers c ON c.id = ct.customer_id
ORDER BY ct.spent DESC;
```

**Result:**

```text
   name    | orders | spent
-----------+--------+-------
 Li Wei    |      1 | 23.20
 Sara Khan |      2 | 20.40
 Omar Ali  |      1 | 16.40
 Tom Brown |      1 | 10.00
(4 rows)
```

Step one computes each order's total; step two sums per customer; the final query adds names. This is also the cure for the "two one-to-many joins" problem above: aggregate in separate steps, then join.

A **recursive CTE** walks hierarchies such as the category tree:

```sql
WITH RECURSIVE tree AS (
  SELECT id, name, name AS path, 0 AS depth
  FROM categories
  WHERE parent_id IS NULL
  UNION ALL
  SELECT c.id, c.name, tree.path || ' > ' || c.name, tree.depth + 1
  FROM categories c
  JOIN tree ON c.parent_id = tree.id
)
SELECT path, depth FROM tree ORDER BY path;
```

**Result:**

```text
      path       | depth
-----------------+-------
 Drinks          |     0
 Drinks > Coffee |     1
 Drinks > Tea    |     1
 Snacks          |     0
(4 rows)
```

The first part selects the top-level categories; the second part repeatedly adds their children until there are no more. `||` joins text.

## Window functions

### Level 4 — Calculating across rows without collapsing them

`GROUP BY` collapses each group into one row. A **window function** computes across a set of related rows but keeps every row. The `OVER (...)` clause defines the "window": `PARTITION BY` splits rows into groups, and `ORDER BY` orders them within each group.

```sql
SELECT c.name,
       o.id AS order_id,
       o.placed_at::date AS placed,
       row_number() OVER (PARTITION BY o.customer_id ORDER BY o.placed_at) AS nth_order,
       count(*)     OVER (PARTITION BY o.customer_id) AS customer_orders
FROM orders o
JOIN customers c ON c.id = o.customer_id
ORDER BY c.name, placed;
```

**Result:**

```text
   name    | order_id |   placed   | nth_order | customer_orders
-----------+----------+------------+-----------+-----------------
 Li Wei    |        4 | 2026-10-30 |         1 |               1
 Omar Ali  |        3 | 2026-09-20 |         1 |               1
 Sara Khan |        1 | 2026-09-02 |         1 |               3
 Sara Khan |        2 | 2026-10-14 |         2 |               3
 Sara Khan |        5 | 2026-11-01 |         3 |               3
 Tom Brown |        6 | 2026-10-05 |         1 |               1
(6 rows)
```

Each order keeps its row, and gains its position in the customer's history and the customer's total number of orders. Classic uses:

```sql
-- Each customer's most recent order ("top 1 per group")
SELECT customer, order_id, placed
FROM (
  SELECT c.name AS customer, o.id AS order_id, o.placed_at::date AS placed,
         row_number() OVER (PARTITION BY o.customer_id ORDER BY o.placed_at DESC) AS rn
  FROM orders o
  JOIN customers c ON c.id = o.customer_id
) latest
WHERE rn = 1
ORDER BY customer;
```

**Result:**

```text
 customer  | order_id |   placed
-----------+----------+------------
 Li Wei    |        4 | 2026-10-30
 Omar Ali  |        3 | 2026-09-20
 Sara Khan |        5 | 2026-11-01
 Tom Brown |        6 | 2026-10-05
(4 rows)
```

```sql
-- Running revenue over time, and each day's share
WITH daily AS (
  SELECT o.placed_at::date AS day, sum(oi.quantity * oi.unit_price) AS revenue
  FROM orders o
  JOIN order_items oi ON oi.order_id = o.id
  WHERE o.status <> 'cancelled'
  GROUP BY 1
)
SELECT day,
       revenue,
       sum(revenue) OVER (ORDER BY day) AS running_total,
       round(100 * revenue / sum(revenue) OVER (), 1) AS pct_of_all
FROM daily
ORDER BY day;
```

**Result:**

```text
    day     | revenue | running_total | pct_of_all
------------+---------+---------------+------------
 2026-09-02 |   10.90 |         10.90 |       15.6
 2026-09-20 |   16.40 |         27.30 |       23.4
 2026-10-05 |   10.00 |         37.30 |       14.3
 2026-10-14 |    9.50 |         46.80 |       13.6
 2026-10-30 |   23.20 |         70.00 |       33.1
(5 rows)
```

`sum(...) OVER (ORDER BY day)` adds up all rows up to the current one — a running total. `sum(...) OVER ()` with an empty window is the total over all rows. Other window functions include `rank()` and `dense_rank()` (ties share a position), `lag()` and `lead()` (the previous or next row's value — for example, "days since the previous order"), and moving averages.

## Changing data

### Level 2 — `UPDATE` and `DELETE`

```sql
UPDATE products
SET price = price * 1.10
WHERE category_id = 2
RETURNING sku, name, price;
```

**Result:**

```text
   sku   |     name      | price
---------+---------------+-------
 TEA-GRN | Green Tea     |  4.62
 TEA-BLK | Breakfast Tea |  4.18
(2 rows)
```

```sql
DELETE FROM customers
WHERE email = 'mia@example.com'
RETURNING id, name;
```

**Result:**

```text
 id |   name
----+-----------
  7 | Mia Jones
(1 row)
```

The golden rule: **an `UPDATE` or `DELETE` without `WHERE` changes every row in the table.** Before running one by hand, run the same `WHERE` as a `SELECT` to see which rows will change, and do it inside a transaction you can roll back ({{ch:transactions}}).

Foreign keys protect related data here too:

```sql
DELETE FROM customers WHERE id = 1;
```

**Result:**

```text
ERROR:  update or delete on table "customers" violates foreign key constraint "orders_customer_id_fkey" on table "orders"
```

Sara has orders, so she cannot simply be deleted. The design decides what should happen instead: refuse (the default, as here), cascade the delete (`ON DELETE CASCADE`, as for order items), or set the reference to `NULL`. For customers, many systems never delete the row at all, and instead anonymise personal data while keeping orders for accounting ({{ch:database-design}}).

### Level 3 — Upserts

"Insert this row, or update it if it already exists" is common — syncing stock from a supplier, for example. PostgreSQL's `INSERT ... ON CONFLICT` does it in one atomic statement:

```sql
INSERT INTO products (sku, name, category_id, price, stock) VALUES
  ('SNK-HNY', 'Honey Flapjack', 4, 1.90, 30),        -- exists: update stock
  ('SNK-ALM', 'Almond Bar',     4, 2.20, 15)         -- new: insert
ON CONFLICT (sku) DO UPDATE
SET stock = EXCLUDED.stock
RETURNING sku, name, stock;
```

**Result:**

```text
   sku   |      name      | stock
---------+----------------+-------
 SNK-HNY | Honey Flapjack |    30
 SNK-ALM | Almond Bar     |    15
(2 rows)
```

`EXCLUDED` refers to the row that was proposed for insertion. The conflict target (`sku`) must have a unique constraint. Upserts make imports and retried jobs **idempotent**: running the same import twice gives the same result ({{ch:queues}}).

## SQL from application code

### Level 3 — Parameterised queries and SQL injection

Applications send SQL to the database through a driver (such as `pg` for Node.js) or an ORM. The single most important rule: **never build SQL by concatenating user input into the query text.** Send the values separately as **parameters**:

```ts
import { PGlite } from "@electric-sql/pglite";

const db = await PGlite.create();                       // PostgreSQL in-process, for this example
await db.exec(`
  CREATE TABLE customers (id int PRIMARY KEY, name text, email text);
  INSERT INTO customers VALUES (1, 'Sara Khan', 'sara@example.com'), (2, 'Omar Ali', 'omar@example.com');
`);

async function findByEmailUnsafe(email: string) {
  const sql = `SELECT id, name FROM customers WHERE email = '${email}'`;   // DON'T: input becomes SQL
  return (await db.query(sql)).rows;
}

async function findByEmail(email: string) {
  return (await db.query("SELECT id, name FROM customers WHERE email = $1", [email])).rows;  // value sent separately
}

const attack = "nobody@example.com' OR '1'='1";
console.log("unsafe, normal input:", await findByEmailUnsafe("omar@example.com"));
console.log("unsafe, attack input:", await findByEmailUnsafe(attack));
console.log("safe,   attack input:", await findByEmail(attack));
```

**Output:**

```text
unsafe, normal input: [ { id: 2, name: 'Omar Ali' } ]
unsafe, attack input: [ { id: 1, name: 'Sara Khan' }, { id: 2, name: 'Omar Ali' } ]
safe,   attack input: []
```

- The unsafe version pastes the input into the SQL text. The attacker's input closes the quote and adds `OR '1'='1'`, which is always true — and the query returns **every** customer. With other inputs an attacker could read any table or change data. This is **SQL injection**, for decades one of the most damaging web vulnerabilities ({{ch:application-security}}).
- The safe version uses a placeholder (`$1`) and passes the value separately. The database treats it purely as data: no customer has that strange email, so the result is empty.
- This example uses PGlite (PostgreSQL compiled to WebAssembly) so it runs anywhere without a server; with the `pg` driver the call is the same: `pool.query("... WHERE email = $1", [email])`.
- Parameters work for **values**. Table or column names cannot be parameters; if they must vary, choose them from a fixed allow-list in code.

ORMs and query builders parameterise for you — but most also offer "raw SQL" escape hatches where the same mistake is possible ({{ch:orms}}).

## From beginner to enterprise

**Level 1–2 — first queries.** Creating tables with types and constraints; `INSERT`, `SELECT` with `WHERE`, `ORDER BY`, `LIMIT`; `NULL` handling; aggregates with `GROUP BY` and `HAVING`; inner and left joins.

**Level 3 — everyday back-end SQL.** Multi-table joins without row explosions; subqueries, `EXISTS` and CTEs; upserts; `RETURNING`; parameterised queries in code; careful `UPDATE` and `DELETE` with transactions.

**Level 4 — professional SQL.** Window functions for rankings, running totals and top-N-per-group; recursive CTEs; reading query plans and adding indexes ({{ch:query-optimization}}, {{ch:indexes}}); reports and data fixes written and reviewed like code.

**Level 5 — senior practice.** Designing schemas and constraints that make invalid data impossible ({{ch:database-design}}); safe migrations on large tables; analytics queries on replicas or warehouses; SQL reviewed for performance and correctness before it reaches production.

**Level 6 — enterprises.** Data platforms where SQL is the shared language across engineering, analytics and finance; data warehouses and lakehouses queried with SQL at huge scale; data governance controlling who may query what.

## Real-world use cases

### The support question

- **Situation**: "A customer says they were charged but their order shows nothing."
- **SQL**: find the customer by email, list their orders with statuses and totals (a join and aggregate), and check the payment table for charges without a matching order (a left join with `IS NULL`). Five minutes of SQL instead of an afternoon of clicking through admin screens.

### The monthly business report

- **SQL**: revenue per month and category with `date_trunc('month', placed_at)` and `GROUP BY`; month-over-month change with `lag()`; top products per category with `row_number()`; run on a read replica so it does not slow the shop ({{ch:replication}}).

## Common mistakes

### Beginner: comparing with `= NULL`

**Fix:** `IS NULL` / `IS NOT NULL`; remember `<>` excludes `NULL` rows.

### Beginner: `UPDATE` or `DELETE` without `WHERE`

**Fix:** run the `WHERE` as a `SELECT` first; use transactions; require reviews for production data changes.

### Beginner: relying on row order without `ORDER BY`

**Fix:** always `ORDER BY` when order matters, especially with `LIMIT`.

### Beginner: floating-point types for money

**Fix:** `numeric` (or integer minor units such as pence).

### Intermediate: `count(*)` with a `LEFT JOIN`

**Consequence:** customers without orders counted as 1. **Fix:** `count(right_table.id)`.

### Intermediate: inflated sums from joining two one-to-many relationships

**Fix:** aggregate each relationship separately, then join.

### Intermediate: `NOT IN` with a list that may contain `NULL`

**Consequence:** no rows at all. **Fix:** `NOT EXISTS`.

### Production: string-concatenated SQL

**Consequence:** SQL injection. **Fix:** parameterised queries, always.

## Debugging and troubleshooting

- **"column must appear in the GROUP BY clause or be used in an aggregate function"**: a selected column is neither grouped nor aggregated — add it to `GROUP BY` or wrap it in an aggregate.
- **"column … does not exist"** for an alias in `WHERE`: aliases are computed after `WHERE` — repeat the expression, or use a subquery or CTE.
- **Far more rows than expected**: a missing or wrong join condition, or two one-to-many joins multiplying rows — check row counts step by step.
- **Fewer rows than expected**: an inner join dropping unmatched rows (use `LEFT JOIN`), or `NULL`s failing a condition.
- **Totals slightly off**: floating-point money, or rows duplicated by joins.
- **Building a complex query**: write it in steps (CTEs), checking each step's result before adding the next.

## Security summary

- **Parameterise every value** sent from application code; never concatenate user input into SQL.
- Choose dynamic table, column or sort names only from **allow-lists**.
- Give applications database users with **least privilege** — no table drops or schema changes from the web app ({{ch:postgresql}}).
- Put **constraints** in the database so bugs and attacks cannot store invalid data.
- Treat manual production queries carefully: read-only access by default, transactions for changes, reviews for data fixes, and an audit trail.
- Do not expose raw SQL error messages to users; log them ({{ch:error-handling}}).

## How a senior engineer thinks about this

- **Think in sets, not loops.** One query that processes all rows beats a loop of queries in code.
- **The database is the last line of defence for data quality.** Types and constraints make invalid states impossible, whatever the application does.
- **Know what your ORM sends.** They read the SQL their code produces and drop to SQL when it is the clearer tool.
- **Write SQL for the next reader.** CTEs with clear names, consistent formatting, comments for non-obvious logic.
- **`NULL`, joins and grouping are where bugs hide.** They check row counts and edge cases (no orders, no city, cancelled orders) before trusting a result.

## Exercises

Run these against the shop database built in this chapter (after the changes above: tea prices increased by 10%, Mia deleted, the Almond Bar added).

### Exercise 1 — Products that have never been ordered

**Objective:** practise left joins.
**What to write:** list the SKU and name of every product that appears in no order.

<details>
<summary>Show the solution</summary>

```sql
SELECT p.sku, p.name
FROM products p
LEFT JOIN order_items oi ON oi.product_id = p.id
WHERE oi.product_id IS NULL
ORDER BY p.sku;
```

**Result:**

```text
   sku   |      name
---------+----------------
 SNK-ALM | Almond Bar
 SNK-HNY | Honey Flapjack
(2 rows)
```

**Walkthrough:** the left join keeps every product; products without any order item get `NULL` on the right side, and `WHERE oi.product_id IS NULL` keeps exactly those. `NOT EXISTS (SELECT 1 FROM order_items WHERE product_id = p.id)` is an equally good answer.

</details>

### Exercise 2 — Revenue per category

**Objective:** practise multi-table joins with grouping.
**What to write:** for every top-level and sub-category that has sales, show the category name, the number of units sold and the revenue (quantity × unit price), excluding cancelled orders, highest revenue first.

<details>
<summary>Show the solution</summary>

```sql
SELECT cat.name AS category,
       sum(oi.quantity) AS units,
       sum(oi.quantity * oi.unit_price) AS revenue
FROM order_items oi
JOIN orders o     ON o.id = oi.order_id
JOIN products p   ON p.id = oi.product_id
JOIN categories cat ON cat.id = p.category_id
WHERE o.status <> 'cancelled'
GROUP BY cat.name
ORDER BY revenue DESC;
```

**Result:**

```text
 category | units | revenue
----------+-------+---------
 Coffee   |     3 |   28.50
 Tea      |     6 |   24.00
 Drinks   |     3 |   15.00
 Snacks   |     1 |    2.50
(4 rows)
```

**Walkthrough:** each order item is joined to its order (to filter out cancellations), its product, and the product's category; grouping by category sums units and revenue. Revenue uses the stored `unit_price`, not the current product price — so the recent tea price increase does not change past sales. (Rolling sub-categories up into "Drinks" would need the recursive CTE from this chapter.)

</details>

### Exercise 3 — Days between each customer's orders

**Objective:** practise window functions.
**What to write:** for every non-cancelled order, show the customer's name, the order date, and the number of days since that customer's previous non-cancelled order (empty for their first).

<details>
<summary>Show the solution</summary>

```sql
SELECT c.name,
       o.placed_at::date AS placed,
       o.placed_at::date - lag(o.placed_at::date) OVER (PARTITION BY o.customer_id ORDER BY o.placed_at) AS days_since_previous
FROM orders o
JOIN customers c ON c.id = o.customer_id
WHERE o.status <> 'cancelled'
ORDER BY c.name, placed;
```

**Result:**

```text
   name    |   placed   | days_since_previous
-----------+------------+---------------------
 Li Wei    | 2026-10-30 |
 Omar Ali  | 2026-09-20 |
 Sara Khan | 2026-09-02 |
 Sara Khan | 2026-10-14 |                  42
 Tom Brown | 2026-10-05 |
(5 rows)
```

**Walkthrough:** `lag(...)` returns the previous row's value within the same customer's partition, ordered by date; subtracting two dates in PostgreSQL gives a number of days. Each customer's first order has no previous row, so the result is `NULL`, shown as empty.

</details>

### Exercise 4 — Production scenario: the suspicious report

**Objective:** practise debugging SQL results.
**The scenario:** a colleague's report of "revenue per customer" shows Sara Khan with far more revenue than her orders add up to. Their query joins `customers`, `orders`, `order_items` and a `payments` table (one row per payment attempt; some orders had two attempts) and sums `order_items.quantity * unit_price`. What is wrong, and how do you fix it?

<details>
<summary>Show the solution</summary>

**What is wrong:** `orders` has two one-to-many relationships in the same join — items and payments. An order with 2 items and 2 payment attempts produces 2 × 2 = 4 rows, so every item is counted twice. Sums are multiplied by the number of payment rows.

**How to confirm:** count rows per order with and without the payments join; the inflation factor matches the number of payment attempts.

**Fix:** aggregate each relationship separately, then join the results:

```sql
-- fragment
WITH item_totals AS (
  SELECT order_id, sum(quantity * unit_price) AS items_total
  FROM order_items GROUP BY order_id
),
payment_totals AS (
  SELECT order_id, sum(amount) FILTER (WHERE status = 'succeeded') AS paid
  FROM payments GROUP BY order_id
)
SELECT c.name, sum(it.items_total) AS revenue, sum(pt.paid) AS paid
FROM customers c
JOIN orders o ON o.customer_id = c.id
JOIN item_totals it ON it.order_id = o.id
LEFT JOIN payment_totals pt ON pt.order_id = o.id
WHERE o.status <> 'cancelled'
GROUP BY c.name;
```

Each CTE has at most one row per order, so the final join cannot multiply rows. Add a test or a sanity check comparing the report's total with a simple `sum` over `order_items`.

</details>

## Summary

A relational database stores data in **tables** of **rows** and typed **columns**; a **primary key** identifies each row and **foreign keys** link rows across tables, representing one-to-many and (through a joining table) many-to-many relationships. `CREATE TABLE` defines columns with data types — `integer`, `text`, `numeric` for money, `timestamptz` for times — and **constraints** (`NOT NULL`, `UNIQUE`, `CHECK`, keys) that the database enforces against every change.

`INSERT`, `UPDATE` and `DELETE` change data — always with a careful `WHERE`, and with `RETURNING` to get results back; `INSERT ... ON CONFLICT` performs atomic upserts. `SELECT` asks questions: `WHERE` filters rows, `ORDER BY` sorts (rows have no order otherwise), `LIMIT` takes the first rows. `NULL` means unknown: comparisons with it are unknown, so use `IS NULL` and `COALESCE`. **Aggregates** summarise rows, `GROUP BY` computes them per group, and `HAVING` filters groups; queries are evaluated `FROM`, `WHERE`, `GROUP BY`, `HAVING`, `SELECT`, `ORDER BY`, `LIMIT`.

**Joins** combine tables: inner joins keep matching rows, left joins keep all rows from the left table (useful for "has none" questions). Avoid row explosions from missing conditions or multiple one-to-many joins by aggregating in steps. **Subqueries**, `EXISTS` and **CTEs** break problems into named steps; recursive CTEs walk hierarchies. **Window functions** compute rankings, running totals and per-group positions without collapsing rows. From application code, always send values as **parameters** to prevent SQL injection.

## Key terms

- **SQL** — The declarative language for defining, querying and changing data in relational databases.
- **Relational database** — A database storing data in tables related through keys.
- **Table** — A named set of rows sharing the same columns.
- **Row** — One record in a table.
- **Column** — A named, typed value present in every row of a table.
- **Primary key** — The column or columns uniquely identifying each row.
- **Foreign key** — A column referring to another table's primary key, enforced by the database.
- **Constraint** — A rule the database enforces on data, such as `NOT NULL`, `UNIQUE` or `CHECK`.
- **Identity column** — A column whose values the database generates automatically, typically increasing integers.
- **numeric** — An exact decimal data type suitable for money.
- **timestamptz** — PostgreSQL's timestamp with time zone type, storing an exact moment.
- **NULL** — A marker for a missing or unknown value.
- **Result set** — The table of rows returned by a query.
- **WHERE clause** — The part of a query that filters rows.
- **ORDER BY** — The clause that sorts a query's results.
- **Aggregate function** — A function such as `COUNT` or `SUM` that summarises many rows into one value.
- **GROUP BY** — The clause that groups rows so aggregates are computed per group.
- **HAVING** — The clause that filters groups after aggregation.
- **Join** — Combining rows from two tables based on a related column.
- **Inner join** — A join returning only rows that match on both sides.
- **Left join** — A join returning all rows from the left table, with `NULL`s where the right side has no match.
- **Self-join** — Joining a table to itself, for example to relate rows to parent rows.
- **Subquery** — A query nested inside another query.
- **Correlated subquery** — A subquery referring to columns of the outer query.
- **EXISTS** — A condition that is true when a subquery returns at least one row.
- **Common table expression (CTE)** — A named subquery defined with `WITH`.
- **Recursive CTE** — A CTE that refers to itself to walk hierarchical data.
- **Window function** — A function computing values across related rows without collapsing them, using `OVER`.
- **Upsert** — Inserting a row or updating it if it already exists, in one operation.
- **RETURNING** — A PostgreSQL clause returning rows affected by `INSERT`, `UPDATE` or `DELETE`.
- **Parameterised query** — A query whose values are sent separately from its text, preventing injection.
- **SQL injection** — An attack where input is interpreted as SQL because it was concatenated into a query.
- **DDL / DML** — Statements that define structure, and statements that query or change data.

## What comes next

SQL is the language; PostgreSQL is the database you will most often speak it to. The next chapter, {{ch:postgresql}}, looks at PostgreSQL itself: installing and connecting, roles and permissions, its rich data types (JSONB, arrays, enums, ranges), full-text search, extensions, how it stores data and keeps it safe, connection pooling, configuration and backups.
