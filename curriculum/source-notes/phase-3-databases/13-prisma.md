# Phase 3 — Chapter 13: Prisma Deep Dive

---

## Chapter Overview

Prisma is the de facto standard ORM for modern TypeScript/Node.js applications. This chapter covers advanced Prisma patterns: schema design, migrations, extensions, middleware, multi-database, and real-world production patterns.

---

## Advanced Schema Design

```prisma
// schema.prisma — production-grade example

generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["fullTextSearch", "multiSchema"]
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")  // For connection poolers like PgBouncer
}

// ─── ENUMS ────────────────────────────────────────────────────────────────────
enum UserRole  { USER ADMIN MODERATOR SUPPORT }
enum UserStatus { ACTIVE SUSPENDED DELETED }
enum OrderStatus { PENDING PROCESSING SHIPPED DELIVERED CANCELLED REFUNDED }

// ─── BASE FIELDS (via extension) ─────────────────────────────────────────────
// Prisma doesn't have model inheritance, use shared mixins via composition

model User {
  id        String     @id @default(uuid()) @db.Uuid
  email     String     @unique @db.VarChar(255)
  name      String     @db.VarChar(200)
  role      UserRole   @default(USER)
  status    UserStatus @default(ACTIVE)
  deletedAt DateTime?  // soft delete
  createdAt DateTime   @default(now()) @db.Timestamptz
  updatedAt DateTime   @updatedAt @db.Timestamptz

  // Relations
  profile  Profile?
  orders   Order[]
  sessions Session[]
  auditLogs AuditLog[]

  // Compound indexes
  @@index([status, role, createdAt(sort: Desc)])
  @@index([email], map: "idx_users_email")
  @@map("users")
}

model Profile {
  id        String   @id @default(uuid()) @db.Uuid
  userId    String   @unique @db.Uuid
  bio       String?  @db.Text
  avatar    String?
  website   String?
  location  String?
  updatedAt DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("profiles")
}

model Order {
  id        String      @id @default(uuid()) @db.Uuid
  userId    String      @db.Uuid
  status    OrderStatus @default(PENDING)
  subtotal  Decimal     @db.Decimal(10, 2)
  tax       Decimal     @default(0) @db.Decimal(10, 2)
  total     Decimal     @db.Decimal(10, 2)
  metadata  Json?       // JSONB for flexible attributes
  createdAt DateTime    @default(now()) @db.Timestamptz
  updatedAt DateTime    @updatedAt @db.Timestamptz

  user  User        @relation(fields: [userId], references: [id])
  items OrderItem[]

  @@index([userId, createdAt(sort: Desc)])
  @@index([status, createdAt(sort: Desc)])
  @@map("orders")
}

model AuditLog {
  id         BigInt   @id @default(autoincrement())
  tableName  String   @db.VarChar(100)
  recordId   String   @db.Uuid
  action     String   @db.VarChar(20)
  oldData    Json?
  newData    Json?
  changedBy  String?  @db.Uuid
  changedAt  DateTime @default(now()) @db.Timestamptz

  user User? @relation(fields: [changedBy], references: [id])

  @@index([tableName, recordId, changedAt(sort: Desc)])
  @@map("audit_log")
}
```

---

## Migrations Best Practices

```bash
# Development workflow
npx prisma migrate dev --name add_user_status     # creates migration + applies it
npx prisma migrate dev --name add_idx_orders_user # schema + migration

# Production
npx prisma migrate deploy  # applies pending migrations (no schema changes)

# View migration status
npx prisma migrate status

# Create migration without applying (to review SQL first)
npx prisma migrate dev --create-only --name custom_migration

# After editing the generated SQL:
npx prisma migrate dev

# Resolve a failed migration
npx prisma migrate resolve --applied "20250115_failed_migration"
npx prisma migrate resolve --rolled-back "20250115_failed_migration"

# Reset database (dev only — DESTROYS ALL DATA)
npx prisma migrate reset
```

```sql
-- Example: safe production migration for adding a column with default
-- DO NOT use a single ALTER TABLE that locks the entire table on large tables
-- Prisma generates safe migrations, but review them:

-- Generated migration:
ALTER TABLE "users" ADD COLUMN "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE';
-- This is safe in PostgreSQL 11+ (ADD COLUMN with constant default is instant)

-- Dangerous pattern (Prisma won't do this, but to know what to avoid):
ALTER TABLE "users" ADD COLUMN "status" "UserStatus" NOT NULL;
-- Will fail: existing rows have no value for the required column
-- Always add default or make nullable first, backfill, then add constraint
```

---

## Advanced Patterns

### Prisma Extensions

```typescript
// Prisma Extensions — add custom methods to Prisma Client
// Best for: soft delete, tenant isolation, audit logging

const prismaWithSoftDelete = prisma.$extends({
  model: {
    user: {
      async softDelete(id: string) {
        return prisma.user.update({
          where: { id },
          data:  { deletedAt: new Date(), status: "DELETED" }
        });
      },

      async findActive(where?: Prisma.UserWhereInput) {
        return prisma.user.findMany({
          where: { ...where, deletedAt: null }
        });
      }
    }
  }
});

// Usage
await prismaWithSoftDelete.user.softDelete(userId);
const activeUsers = await prismaWithSoftDelete.user.findActive({ role: "ADMIN" });
```

### Row-Level Security Integration

```typescript
// Multi-tenant: inject tenant context into every query
function createTenantPrisma(tenantId: string) {
  return prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          // Inject tenantId filter on all read operations
          if (["findMany", "findFirst", "count", "aggregate"].includes(operation)) {
            args.where = { ...args.where, tenantId };
          }
          // Inject tenantId on create
          if (operation === "create") {
            args.data = { ...args.data, tenantId };
          }
          return query(args);
        }
      }
    }
  });
}

// Usage in request handler
const tenantPrisma = createTenantPrisma(req.tenant.id);
const orders = await tenantPrisma.order.findMany();
// Automatically filters by tenantId
```

### Prisma with PgBouncer (Connection Pooling)

```prisma
// With PgBouncer, transactions must be used for prepared statements
// Add ?pgbouncer=true to connection string
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")          // PgBouncer URL
  directUrl = env("DIRECT_DATABASE_URL")   // Direct URL for migrations
}
```

### Optimistic Concurrency Control

```typescript
// Add version field to schema
model Product {
  id      String @id @default(uuid())
  name    String
  stock   Int
  version Int    @default(1)
}

// Optimistic update — only succeeds if version matches
async function decrementStock(productId: string, quantity: number, version: number) {
  try {
    const updated = await prisma.product.update({
      where: {
        id:      productId,
        version: version    // optimistic lock check
      },
      data: {
        stock:   { decrement: quantity },
        version: { increment: 1 }
      }
    });
    return updated;
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      throw new Error("Concurrent modification — please retry");
    }
    throw e;
  }
}
```

---

## Interview Preparation

**Q1: How do Prisma migrations work?**
A: You define your schema in `schema.prisma`. When you run `prisma migrate dev`, Prisma diffs your schema against the last migration, generates SQL for the changes, applies it to the dev database, and saves the migration file in `prisma/migrations/`. In production, you run `prisma migrate deploy` which applies pending migration files without touching the schema. The `_prisma_migrations` table tracks which migrations have been applied. Prisma generates safe SQL (e.g., nullable column before constraint), but you should always review generated SQL for large tables.

**Q2: What are Prisma Extensions?**
A: Prisma Extensions (available from Prisma v5) let you add custom methods to Prisma Client or intercept all operations. Model extensions add helper methods (`softDelete()`, `findActive()`). Query extensions intercept queries to inject filters (tenant isolation, soft-delete filtering) or log queries. Result extensions transform returned data. They're the modern replacement for Prisma middleware (`$use`), which is being deprecated.

**Q3: Why is `directUrl` needed alongside `url` in Prisma?**
A: When using a connection pooler like PgBouncer, the `url` points to the pooler. However, migrations need a direct database connection — connection poolers don't support all PostgreSQL statements (e.g., `CREATE TABLE`, `ALTER TABLE` must not be statement-mode pooled). `directUrl` provides a direct PostgreSQL connection URL used only for migrations and introspection. The application uses the pooled `url` for all queries.

---

## Practical Tasks

### Beginner (10 Tasks)
1. Define a complete e-commerce schema in `schema.prisma`.
2. Run `prisma migrate dev` and inspect the generated SQL.
3. Seed the database with `prisma db seed`.
4. Use Prisma Studio (`npx prisma studio`) to view data.
5. Add a new field to a model and create a migration.
6. Handle a `PrismaClientKnownRequestError` for unique constraint violation.
7. Use `prisma.user.count()` for pagination metadata.
8. Use `prisma.user.aggregate()` for min/max/avg queries.
9. Use `prisma.$queryRaw` for a query Prisma can't express.
10. Enable Prisma query logging.

### Intermediate (10 Tasks)
1. Implement soft delete using Prisma Extensions.
2. Implement multi-tenant isolation with Extensions.
3. Build a pagination helper (cursor-based) for Prisma.
4. Implement optimistic locking with a version column.
5. Set up PgBouncer and configure `directUrl` in Prisma.
6. Use `prisma.user.findMany({ include: { _count: { select: { orders: true } } } })`.
7. Write a complex `$queryRaw` query with parameters.
8. Implement an audit log using Prisma Extensions.
9. Use `createMany` for bulk inserts.
10. Implement transaction isolation level override.

### Advanced (10 Tasks)
1. Build a generic repository with Prisma Client typings.
2. Implement Row-Level Security with Prisma + PostgreSQL SET.
3. Set up Prisma in a multi-schema PostgreSQL database.
4. Implement type-safe cursor pagination with generic types.
5. Build a Prisma plugin for automatic `createdBy`/`updatedBy`.
6. Implement a multi-tenant SaaS where each tenant has isolated data.
7. Profile Prisma-generated SQL and optimize slow queries.
8. Implement full-text search using Prisma `$queryRaw`.
9. Build migrations for a zero-downtime column rename.
10. Implement Prisma with Edge functions (miniEdge runtime).

---

## Self Assessment
1. What file does Prisma use to define the schema?
2. What command creates a migration?
3. What command applies migrations in production?
4. What is `directUrl` used for?
5. What is a Prisma Extension?
6. How do you implement soft delete with Prisma?
7. How do you catch a unique constraint violation in Prisma?
8. What is `prisma.$transaction` vs. `prisma.$transaction(async tx => ...)`?
9. What does `@updatedAt` do in a Prisma schema?
10. What does `@@map("table_name")` do?

---

## Cheat Sheet

```prisma
// schema.prisma essentials
model User {
  id        String   @id @default(uuid()) @db.Uuid
  email     String   @unique
  role      Role     @default(USER)
  deletedAt DateTime?
  createdAt DateTime @default(now()) @db.Timestamptz
  updatedAt DateTime @updatedAt @db.Timestamptz
  orders    Order[]
  @@index([role, createdAt(sort: Desc)])
  @@map("users")
}
enum Role { USER ADMIN }
```

```typescript
// Prisma client patterns
await prisma.user.create({ data: {...} });
await prisma.user.findUnique({ where: { id }, include: { orders: true } });
await prisma.user.findMany({ where: { deletedAt: null }, select: { id, name }, skip, take, orderBy: { createdAt: "desc" } });
await prisma.user.update({ where: { id }, data: { name } });
await prisma.user.upsert({ where: { email }, create: {...}, update: {...} });
await prisma.user.delete({ where: { id } });
await prisma.user.count({ where: {...} });
await prisma.user.aggregate({ _avg: { orderTotal: true }, where: {...} });
await prisma.$transaction([ prisma.a.update({...}), prisma.b.update({...}) ]);
await prisma.$transaction(async (tx) => { ... });
await prisma.$queryRaw`SELECT * FROM users WHERE email = ${email}`;

// Error handling
import { Prisma } from "@prisma/client";
if (e instanceof Prisma.PrismaClientKnownRequestError) {
  if (e.code === "P2025") { /* record not found */ }
  if (e.code === "P2002") { /* unique constraint */ }
}
```
