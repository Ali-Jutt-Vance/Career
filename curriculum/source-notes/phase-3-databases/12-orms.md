# Phase 3 — Chapter 12: ORMs

---

## Chapter Overview

ORM (Object-Relational Mapper) provides a high-level abstraction over database queries using models and method chains instead of raw SQL. ORMs increase development speed but can hide performance problems.

**Popular Node.js ORMs:**
- **Prisma** — modern, type-safe, schema-first, code generation
- **TypeORM** — decorator-based, TypeScript-first, active record or data mapper
- **Sequelize** — mature, JavaScript, comprehensive, complex
- **Drizzle** — new, lightweight, SQL-like, fully type-safe
- **Knex** — query builder (not full ORM), raw SQL with JS ergonomics

---

## Beginner Theory

### ORM Patterns

```
Active Record:
  Model instances are both the data AND the behavior
  User.find(1) returns a User instance with .save(), .delete(), .update() methods
  Example: Rails ActiveRecord, TypeORM ActiveRecord

Data Mapper:
  Entities are plain data; a separate Repository handles DB operations
  userRepository.findOne(1) returns a plain User object
  Example: TypeORM DataMapper, Prisma

Query Builder:
  Fluent API to build SQL queries programmatically
  More control than ORM, less than raw SQL
  Example: Knex.js, Drizzle ORM
```

---

## Basic Examples

### Prisma

```typescript
// schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id        String   @id @default(uuid())
  email     String   @unique
  name      String
  role      Role     @default(USER)
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  orders    Order[]
  profile   Profile?

  @@index([role, createdAt])
  @@map("users")
}

model Profile {
  id     String  @id @default(uuid())
  bio    String?
  avatar String?
  userId String  @unique
  user   User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("profiles")
}

model Order {
  id        String      @id @default(uuid())
  userId    String
  total     Decimal     @db.Decimal(10, 2)
  status    OrderStatus @default(PENDING)
  createdAt DateTime    @default(now())
  user      User        @relation(fields: [userId], references: [id])
  items     OrderItem[]

  @@index([userId, createdAt(sort: Desc)])
  @@map("orders")
}

enum Role        { USER ADMIN MODERATOR }
enum OrderStatus { PENDING PROCESSING SHIPPED DELIVERED CANCELLED }
```

```typescript
// npm install @prisma/client
// npx prisma generate
// npx prisma migrate dev --name init

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient({
  log: ["query", "warn", "error"]
});

// CREATE
const user = await prisma.user.create({
  data: {
    email:   "alice@example.com",
    name:    "Alice Smith",
    profile: {
      create: { bio: "Software Engineer" }
    }
  },
  include: { profile: true }
});

// READ
const found = await prisma.user.findUnique({
  where:   { email: "alice@example.com" },
  include: { orders: { take: 5, orderBy: { createdAt: "desc" } } }
});

// List with pagination
const users = await prisma.user.findMany({
  where:   { isActive: true, role: "USER" },
  select:  { id: true, name: true, email: true },
  orderBy: { createdAt: "desc" },
  skip:    (page - 1) * limit,
  take:    limit
});

// Count
const total = await prisma.user.count({ where: { isActive: true } });

// UPDATE
const updated = await prisma.user.update({
  where: { id: userId },
  data:  { name: "Alice Johnson" }
});

// UPSERT
const upserted = await prisma.user.upsert({
  where:  { email: "alice@example.com" },
  create: { email: "alice@example.com", name: "Alice" },
  update: { name: "Alice Johnson" }
});

// DELETE
await prisma.user.delete({ where: { id: userId } });

// TRANSACTION
const [order, _inventory] = await prisma.$transaction([
  prisma.order.create({ data: { userId, total } }),
  prisma.product.update({
    where: { id: productId },
    data:  { stock: { decrement: quantity } }
  })
]);

// INTERACTIVE TRANSACTION (with logic between queries)
const result = await prisma.$transaction(async (tx) => {
  const product = await tx.product.findUnique({ where: { id: productId } });
  if (product.stock < quantity) throw new Error("Out of stock");

  const order = await tx.order.create({ data: { userId, total } });
  await tx.product.update({
    where: { id: productId },
    data:  { stock: { decrement: quantity } }
  });
  return order;
});

// RAW SQL
const rows = await prisma.$queryRaw<User[]>`
  SELECT * FROM users WHERE email LIKE ${"%" + search + "%"}
`;

// Raw unsafe (for dynamic queries — be careful with SQL injection!)
const count = await prisma.$queryRawUnsafe(`SELECT COUNT(*) FROM ${table}`);
```

### TypeORM

```typescript
// npm install typeorm reflect-metadata pg

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
         UpdateDateColumn, ManyToOne, OneToMany } from "typeorm";

@Entity("users")
export class User {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ unique: true, length: 255 })
  email: string;

  @Column({ length: 200 })
  name: string;

  @Column({ default: "user" })
  role: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Order, (order) => order.user)
  orders: Order[];
}

// Repository pattern
import { AppDataSource } from "./data-source";

const userRepo = AppDataSource.getRepository(User);

// Find
const user = await userRepo.findOne({
  where: { email: "alice@example.com" },
  relations: { orders: true }
});

// Save
const newUser = userRepo.create({ email: "bob@example.com", name: "Bob" });
await userRepo.save(newUser);

// Query Builder (more complex queries)
const topUsers = await userRepo
  .createQueryBuilder("user")
  .leftJoinAndSelect("user.orders", "order")
  .where("user.isActive = :isActive", { isActive: true })
  .andWhere("order.status = :status", { status: "delivered" })
  .groupBy("user.id")
  .having("SUM(order.total) > :min", { min: 1000 })
  .orderBy("SUM(order.total)", "DESC")
  .limit(10)
  .getMany();
```

---

## Intermediate Concepts

### ORM Pitfalls

```typescript
// 1. N+1 Queries (most common ORM performance mistake)

// BAD: N+1
const users = await prisma.user.findMany();
for (const user of users) {
  const count = await prisma.order.count({ where: { userId: user.id } }); // N queries!
  console.log(`${user.name}: ${count} orders`);
}

// GOOD: single query with aggregation
const result = await prisma.$queryRaw<Array<{ name: string; count: bigint }>>`
  SELECT u.name, COUNT(o.id) as count
  FROM users u
  LEFT JOIN orders o ON o.user_id = u.id
  GROUP BY u.id, u.name
`;

// GOOD: eager loading with include (one JOIN query)
const users = await prisma.user.findMany({
  include: { _count: { select: { orders: true } } }
});

// 2. Over-fetching (selecting all columns)
// BAD
const users = await prisma.user.findMany();  // fetches ALL columns
// GOOD
const users = await prisma.user.findMany({ select: { id: true, name: true, email: true } });

// 3. Not using transactions for related writes
// BAD (inconsistent state if second fails)
await prisma.order.create({ data: orderData });
await prisma.product.update({ ... });  // if this fails, order exists without inventory update

// GOOD
await prisma.$transaction(async (tx) => {
  await tx.order.create({ data: orderData });
  await tx.product.update({ ... });
});
```

### Knex.js (Query Builder)

```javascript
// npm install knex pg
const knex = require("knex")({
  client: "pg",
  connection: process.env.DATABASE_URL,
  pool: { min: 2, max: 20 }
});

// Query building
const users = await knex("users")
  .select("id", "name", "email")
  .where("is_active", true)
  .where("role", "admin")
  .orderBy("created_at", "desc")
  .limit(20)
  .offset(0);

// JOIN
const result = await knex("users as u")
  .join("orders as o", "o.user_id", "u.id")
  .where("o.status", "delivered")
  .select("u.name", "o.id as order_id", "o.total")
  .orderBy("o.created_at", "desc");

// Insert returning
const [user] = await knex("users").insert({ email, name }).returning("*");

// Transaction
await knex.transaction(async (trx) => {
  await trx("accounts").where("id", from).decrement("balance", amount);
  await trx("accounts").where("id", to).increment("balance", amount);
});

// Raw
const [{ count }] = await knex.raw("SELECT COUNT(*) FROM users WHERE role = ?", ["admin"]);
```

---

## Advanced Concepts

### Prisma Middleware & Soft Delete

```typescript
// Prisma middleware for soft delete
prisma.$use(async (params, next) => {
  // Intercept delete operations
  if (params.action === "delete" && softDeleteModels.includes(params.model)) {
    params.action = "update";
    params.args.data = { deletedAt: new Date() };
  }

  // Filter out deleted records on find operations
  if (params.action === "findMany" || params.action === "findFirst") {
    if (!params.args.where) params.args.where = {};
    params.args.where.deletedAt = null;
  }

  return next(params);
});
```

---

## Interview Preparation

**Q1: What is the N+1 query problem in ORMs and how do you fix it?**
A: N+1 occurs when fetching N records and then issuing N additional queries for each record's related data. Example in Prisma: `prisma.user.findMany()` returns 50 users, then in a loop, `prisma.order.count({ where: { userId: user.id } })` runs 50 more queries. Total: 51 queries. Fixes: use `include` or `select` with `_count` to fetch relations in one query (Prisma issues a JOIN internally). For complex aggregations, use `$queryRaw` with a raw SQL JOIN + GROUP BY. In TypeORM, use `createQueryBuilder` with `leftJoinAndSelect`. Always check query logs in development to detect N+1.

**Q2: When would you use an ORM vs. raw SQL vs. a query builder?**
A: ORM (Prisma/TypeORM): best for CRUD operations on well-defined models, fast development, type safety, schema management with migrations. Raw SQL: best for complex queries that ORMs generate poorly — window functions, complex aggregations, performance-critical paths. Query builder (Knex/Drizzle): middle ground — structured query building with type safety, no magic, easy to inspect generated SQL, good for dynamic queries where columns or tables change at runtime. In production, use ORM for 80% of queries, raw SQL for the 20% that need it.

**Q3: What is the difference between Prisma and TypeORM?**
A: Prisma is schema-first (define `schema.prisma` file → generate client and migrations). Generated client is fully type-safe with exact return types based on your `select/include`. Migrations are generated from schema diffs. Very opinionated and developer-friendly. TypeORM is code-first (define entity classes with decorators → generate tables). More flexible, supports Active Record and Data Mapper patterns, long-running project with broader feature set. Prisma is currently the preferred choice for new TypeScript projects due to excellent type safety and developer experience.

---

## Practical Tasks

### Beginner (10 Tasks)
1. Set up Prisma with a PostgreSQL database.
2. Define a `User` model with email, name, role, timestamps.
3. Run `prisma migrate dev` to create the table.
4. Create, read, update, and delete a user with Prisma Client.
5. Use `include` to fetch a user with their orders.
6. Use `select` to fetch only specific fields.
7. Implement pagination with `skip` and `take`.
8. Use `upsert` for idempotent create/update.
9. Enable Prisma query logging in development.
10. Add an index to the Prisma schema and migrate.

### Intermediate (10 Tasks)
1. Identify an N+1 query in a loop and fix it with `include`.
2. Implement a Prisma interactive transaction for order + inventory.
3. Use `$queryRaw` for a complex aggregation.
4. Set up TypeORM with a PostgreSQL data source.
5. Use TypeORM `QueryBuilder` for a complex JOIN query.
6. Implement soft delete using Prisma middleware.
7. Add Prisma error handling (catch `PrismaClientKnownRequestError` for unique violation).
8. Implement cursor-based pagination with Prisma.
9. Add a `$count` query on a relation.
10. Build a repository pattern wrapper around Prisma for a specific model.

### Advanced (10 Tasks)
1. Implement Prisma middleware for automatic `updatedAt` or audit logging.
2. Build a unit of work pattern using Prisma transactions.
3. Implement optimistic locking in TypeORM with version columns.
4. Profile ORM-generated SQL vs. hand-written SQL (use EXPLAIN ANALYZE).
5. Implement generic repository with TypeScript generics and Prisma.
6. Add multi-tenant support with `prisma.$extends` custom methods.
7. Implement a read replica strategy with Prisma (different connection strings).
8. Build a bulk insert/upsert with conflict handling.
9. Implement full-text search using Prisma `$queryRaw`.
10. Migrate from raw `pg` to Prisma with zero downtime.

---

## Self Assessment
1. What is an ORM?
2. What is the Active Record pattern?
3. What is the Data Mapper pattern?
4. What is the N+1 query problem?
5. What is the difference between `include` and `select` in Prisma?
6. What is `prisma migrate dev` used for?
7. What is a query builder?
8. How does Prisma handle transactions?
9. What is `$queryRaw` used for in Prisma?
10. When should you bypass the ORM and use raw SQL?

---

## Cheat Sheet

### Prisma
```typescript
// Setup: schema.prisma → npx prisma generate && npx prisma migrate dev
const prisma = new PrismaClient();

// CRUD
await prisma.user.create({ data: { email, name } });
await prisma.user.findUnique({ where: { id }, include: { orders: true } });
await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true, name: true }, orderBy: { createdAt: "desc" }, skip: 0, take: 20 });
await prisma.user.update({ where: { id }, data: { name } });
await prisma.user.delete({ where: { id } });
await prisma.user.upsert({ where: { email }, create: {...}, update: {...} });

// Transaction
await prisma.$transaction([ prisma.a.update({...}), prisma.b.update({...}) ]);
await prisma.$transaction(async (tx) => { const x = await tx.a.create({...}); ... });

// Raw
await prisma.$queryRaw`SELECT * FROM users WHERE email = ${email}`;
```

### TypeORM
```typescript
const repo = AppDataSource.getRepository(User);
const user = await repo.findOne({ where: { email }, relations: { orders: true } });
await repo.save(repo.create({ email, name }));
await repo.createQueryBuilder("u").select(...).where(...).getMany();
```
