# Phase 3 — Chapter 4: Database Design

---

## Chapter Overview

Database design is the process of structuring a database to store data efficiently, maintain integrity, and support the queries the application needs. Good design prevents data anomalies, enables future scale, and keeps queries fast. Poor design leads to data corruption, slow queries, and expensive migrations.

**Core topics:**
- Entity-Relationship (ER) modeling
- Identifying entities, attributes, and relationships
- Cardinality: one-to-one, one-to-many, many-to-many
- Primary keys, foreign keys, surrogate vs. natural keys
- Naming conventions
- Designing for read vs. write patterns

---

## Beginner Theory

### Design Process

```
1. Requirements gathering
   - What data needs to be stored?
   - What queries will be run? (read patterns)
   - What writes/updates happen? (write patterns)
   - What are the business rules and constraints?

2. Conceptual design (ER diagram)
   - Identify ENTITIES (things)
   - Identify ATTRIBUTES (properties of things)
   - Identify RELATIONSHIPS (how things relate)
   - Define CARDINALITY (1:1, 1:N, M:N)

3. Logical design
   - Convert ER model to tables and columns
   - Apply normalization
   - Define data types and constraints

4. Physical design
   - Choose indexes
   - Partition large tables
   - Consider storage and caching
```

### Cardinality

```
One-to-One (1:1):
  Person ──── Passport
  Each person has at most one passport; each passport belongs to one person
  Implement: shared primary key, or FK with UNIQUE constraint

One-to-Many (1:N):
  User ────< Orders
  One user has many orders; each order belongs to one user
  Implement: FK on the "many" side (orders.user_id → users.id)

Many-to-Many (M:N):
  Students >────< Courses
  A student takes many courses; a course has many students
  Implement: junction table (enrollments)
    enrollments: student_id FK → students.id
                 course_id  FK → courses.id
                 PRIMARY KEY (student_id, course_id)
```

---

## Basic Examples

### E-Commerce Database Design

```sql
-- ENTITIES: users, products, categories, orders, order_items, addresses, reviews

-- Users
CREATE TABLE users (
  id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  email      VARCHAR(255) NOT NULL UNIQUE,
  name       VARCHAR(200) NOT NULL,
  password   VARCHAR(255) NOT NULL,       -- hashed
  role       VARCHAR(20)  NOT NULL DEFAULT 'customer',
  is_active  BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Addresses (1 user : many addresses)
CREATE TABLE addresses (
  id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_default BOOLEAN      NOT NULL DEFAULT FALSE,
  name       VARCHAR(100) NOT NULL,
  street     VARCHAR(255) NOT NULL,
  city       VARCHAR(100) NOT NULL,
  state      VARCHAR(100),
  zip        VARCHAR(20)  NOT NULL,
  country    CHAR(2)      NOT NULL DEFAULT 'US'
);

-- Ensure only one default address per user
CREATE UNIQUE INDEX idx_addresses_default ON addresses (user_id)
  WHERE is_default = TRUE;

-- Categories (self-referential tree)
CREATE TABLE categories (
  id        UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name      VARCHAR(100) NOT NULL,
  slug      VARCHAR(100) NOT NULL UNIQUE,
  parent_id UUID         REFERENCES categories(id) ON DELETE SET NULL,
  sort_order INTEGER      NOT NULL DEFAULT 0
);

-- Products
CREATE TABLE products (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID          REFERENCES categories(id) ON DELETE SET NULL,
  name        VARCHAR(255)  NOT NULL,
  slug        VARCHAR(255)  NOT NULL UNIQUE,
  description TEXT,
  price       DECIMAL(10,2) NOT NULL CHECK (price >= 0),
  stock       INTEGER       NOT NULL DEFAULT 0 CHECK (stock >= 0),
  images      TEXT[],       -- array of image URLs
  attributes  JSONB,        -- flexible per-category attributes
  is_active   BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Orders
CREATE TABLE orders (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID          NOT NULL REFERENCES users(id),
  shipping_address JSONB         NOT NULL,  -- snapshot of address at order time
  status           VARCHAR(20)   NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','processing','shipped','delivered','cancelled')),
  subtotal         DECIMAL(10,2) NOT NULL,
  shipping_cost    DECIMAL(10,2) NOT NULL DEFAULT 0,
  tax              DECIMAL(10,2) NOT NULL DEFAULT 0,
  total            DECIMAL(10,2) NOT NULL,
  notes            TEXT,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Order Items (M:N: orders ↔ products)
CREATE TABLE order_items (
  id         UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id   UUID          NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID          NOT NULL REFERENCES products(id),
  name       VARCHAR(255)  NOT NULL,  -- snapshot of product name at order time
  unit_price DECIMAL(10,2) NOT NULL,  -- snapshot of price at order time
  quantity   INTEGER       NOT NULL CHECK (quantity > 0),
  subtotal   DECIMAL(10,2) GENERATED ALWAYS AS (unit_price * quantity) STORED
);

-- Reviews (1 user : many reviews, 1 product : many reviews)
CREATE TABLE reviews (
  id         UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID    NOT NULL REFERENCES users(id),
  product_id UUID    NOT NULL REFERENCES products(id),
  rating     INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title      VARCHAR(255),
  body       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, product_id)  -- one review per user per product
);

-- Indexes
CREATE INDEX idx_products_category ON products(category_id) WHERE is_active = TRUE;
CREATE INDEX idx_products_price    ON products(price);
CREATE INDEX idx_orders_user       ON orders(user_id, created_at DESC);
CREATE INDEX idx_orders_status     ON orders(status, created_at DESC);
CREATE INDEX idx_reviews_product   ON reviews(product_id);
```

---

## Intermediate Concepts

### Common Design Patterns

```sql
-- 1. Snapshot Pattern
-- Store a snapshot of referenced data at the time of the record creation
-- Problem: if product price changes, historical orders should retain the original price
-- Solution: copy price and name into order_items (already done above)

-- 2. Soft Delete Pattern
-- Don't actually delete — mark as deleted
ALTER TABLE users ADD COLUMN deleted_at TIMESTAMPTZ;
-- Query active records:
SELECT * FROM users WHERE deleted_at IS NULL;
-- Partial index for performance:
CREATE INDEX idx_users_active ON users(id) WHERE deleted_at IS NULL;

-- 3. Audit Log Pattern
CREATE TABLE audit_log (
  id          BIGSERIAL   PRIMARY KEY,
  table_name  TEXT        NOT NULL,
  record_id   UUID        NOT NULL,
  action      TEXT        NOT NULL CHECK (action IN ('insert','update','delete')),
  old_data    JSONB,
  new_data    JSONB,
  changed_by  UUID        REFERENCES users(id),
  changed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_audit_table_record ON audit_log(table_name, record_id, changed_at DESC);

-- 4. Status History Pattern (avoid overwriting status)
CREATE TABLE order_status_history (
  id         BIGSERIAL   PRIMARY KEY,
  order_id   UUID        NOT NULL REFERENCES orders(id),
  status     VARCHAR(20) NOT NULL,
  changed_by UUID        REFERENCES users(id),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  note       TEXT
);

-- 5. Configuration / Settings Pattern
CREATE TABLE app_settings (
  key        VARCHAR(100) PRIMARY KEY,
  value      JSONB        NOT NULL,
  type       VARCHAR(20)  DEFAULT 'string',
  updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- 6. Polymorphic Association (with type discriminator)
CREATE TABLE comments (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  commentable_type VARCHAR(50) NOT NULL,  -- 'post' | 'product' | 'video'
  commentable_id   UUID        NOT NULL,
  user_id       UUID        NOT NULL REFERENCES users(id),
  body          TEXT        NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_comments_poly ON comments(commentable_type, commentable_id);
```

### Naming Conventions

```
Tables:        snake_case, plural (users, orders, order_items)
Columns:       snake_case, singular (user_id, order_status, created_at)
PKs:           id (always UUID or BIGSERIAL in modern systems)
FKs:           {table_singular}_id (user_id, product_id)
Timestamps:    created_at, updated_at, deleted_at
Boolean:       is_{adjective} or has_{noun} (is_active, has_discount)
Indexes:       idx_{table}_{columns} (idx_orders_user_id_status)
Constraints:   chk_{table}_{column} (chk_orders_total_positive)

Avoid:
  - Reserved words (user is reserved in some DBs — use users)
  - Abbreviations (addr → address, qty → quantity)
  - Mixed case (userId → user_id)
  - Hungarian notation (strName → name)
```

---

## Advanced Concepts

### Design for Query Patterns

```sql
-- Design decision: normalize vs. denormalize
-- NORMALIZE: no data duplication, integrity enforced, joins needed for reads
-- DENORMALIZE: duplicate data for read speed, integrity maintained in app code

-- Example: user's full name in posts table
-- Normalized: posts.user_id → users.name (JOIN needed for every query)
-- Denormalized: posts.author_name (no JOIN, but stale if user renames)

-- Rule: denormalize only when:
-- 1. The query is in the hot path
-- 2. The denormalized data changes rarely
-- 3. You've proven the JOIN is causing a performance problem

-- Design for writes: use normalized schema
-- Design for reads: consider materialized views or read replicas
```

---

## Interview Preparation

**Q1: What is the difference between a natural key and a surrogate key?**
A: A natural key is a meaningful business identifier — email address, SSN, product SKU. A surrogate key is a system-generated identifier with no business meaning — UUID, auto-increment integer. Surrogate keys are preferred as primary keys because: natural keys can change (users change emails), they may not be unique across time (reused product codes), they can expose business information (sequential IDs reveal count of records), and surrogate PKs never need to be updated when business data changes.

**Q2: Why should you store a snapshot of data (like price) in an order's line items rather than referencing the product table?**
A: If an order_item references `products.price`, and the product price changes tomorrow, the historical order will show the new price instead of the price paid at time of purchase. This is a data integrity violation — financial records must reflect what the customer was actually charged. The solution is to copy (snapshot) the price and product name into `order_items` at order creation time. The snapshot is immutable. This is a fundamental design pattern for any transactional system: copy values that must be preserved at a point in time.

**Q3: What is a junction table and when is it used?**
A: A junction table (also called a join table, bridge table, or association table) implements a many-to-many relationship. Example: students and courses — a student can enroll in many courses, a course can have many students. You can't represent this with a single FK. The junction table `enrollments` has `student_id FK` and `course_id FK`, with a composite primary key. Junction tables can have additional columns for relationship attributes (enrollment date, grade, status) — making them full entities in their own right.

---

## Practical Tasks

### Beginner (10 Tasks)
1. Design an ER diagram for a library system (books, members, loans).
2. Translate the ER diagram to SQL CREATE TABLE statements.
3. Identify the cardinality of: user-profile, user-orders, students-courses.
4. Add appropriate FK constraints with ON DELETE CASCADE where appropriate.
5. Create a junction table for a M:N relationship.
6. Apply the naming convention to an existing poorly-named schema.
7. Add a soft delete column to the users table.
8. Create a partial index for filtering active records.
9. Identify where CHECK constraints should be added.
10. Design an address table for a user (1:N relationship).

### Intermediate (10 Tasks)
1. Design a complete e-commerce schema (users, products, orders, reviews).
2. Implement the snapshot pattern for order line items.
3. Build an audit log with a trigger for the users table.
4. Design a schema for a hierarchical category tree.
5. Implement status history table for orders.
6. Design polymorphic comments (can comment on posts, products, videos).
7. Identify and fix an N+1 query problem in an ORM-based schema.
8. Design a multi-tenant schema (shared tables with tenant_id vs. separate schemas).
9. Build a settings/config table with typed JSON values.
10. Review an existing schema for normalization violations.

### Advanced (10 Tasks)
1. Design a schema for a social network (users, follows, posts, likes, comments, notifications).
2. Design a time-series schema for IoT sensor data.
3. Implement row-level security for a multi-tenant application.
4. Design a schema to support A/B testing at the user level.
5. Design a flexible product catalog supporting wildly different attribute sets per category.
6. Design a schema for a financial ledger (double-entry bookkeeping).
7. Build a geospatial schema for a ride-sharing app (drivers, trips, locations).
8. Design for eventual consistency: how would you design a social feed that scales to millions?
9. Design database migrations strategy for a live production system.
10. Review and critique a real open-source project's database schema.

---

## Self Assessment
1. What are the three types of cardinality?
2. What is a surrogate key?
3. What is a natural key?
4. Why do junction tables exist?
5. What is the snapshot pattern?
6. What is soft delete?
7. What is a self-referential table?
8. What is a polymorphic association?
9. What naming convention should foreign keys follow?
10. When should you denormalize data?

---

## Cheat Sheet

```
Cardinality:
  1:1  → shared PK or FK UNIQUE
  1:N  → FK on "many" side (orders.user_id)
  M:N  → junction table (user_id + role_id → user_roles)

Key Rules:
  PK:    Always use UUID or BIGSERIAL — never email or name
  FK:    name = {singular_table}_id (user_id, product_id)
  Snapshot: Copy price/name into order_items — don't reference live product data

Patterns:
  Soft delete:  deleted_at TIMESTAMPTZ (NULL = active)
  Audit log:    INSERT INTO audit_log (table, id, action, old, new, by, at)
  Status history: separate table with timestamps for each transition
  Snapshot:     copy price/name at transaction time

Naming:
  Tables:   snake_case, plural
  Columns:  snake_case, singular
  Booleans: is_active, has_discount
  Indexes:  idx_{table}_{columns}
```
