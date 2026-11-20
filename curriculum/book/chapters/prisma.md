# Prisma

> [!GOALS]
> - Set up Prisma in a TypeScript project: the schema file, the configuration file, the generated client and a driver adapter.
> - Model tables, relations, enums, indexes and database-specific types in the **Prisma schema language**.
> - Use the **migrations workflow** safely: `migrate dev` in development, `migrate deploy` in production, and reviewing generated SQL.
> - Query and write with the generated **Prisma Client**: filters, `select` and `include`, nested writes, pagination, aggregation.
> - Avoid N+1 queries, handle **transactions** and concurrency correctly, and work with `Decimal` money values.
> - Handle errors by code, use **raw SQL** safely, and extend the client with computed fields.
> - Run Prisma well in production: connections, serverless, logging, testing.

## Why this matters

Prisma is one of the most popular ORMs in the TypeScript world. Its central idea is a single **schema file** that describes your data model, from which Prisma generates a fully typed **client** and **migrations**. When you write `prisma.order.findMany({ include: { items: true } })`, TypeScript knows the exact shape of the result — including the items — and refuses to compile a misspelt field or a wrong type. Teams adopt it for that safety and for its approachable API; many job descriptions for Node.js back-end roles list it.

{{ch:orms}} explained what ORMs do and the traps they set. This chapter applies those lessons to Prisma specifically: how it is set up in its current major version (Prisma 7, which changed configuration and client generation significantly), how its queries translate to SQL, where it is excellent, and where you should reach for raw SQL instead. Every example ran against a real PostgreSQL database through Prisma 7.10, and the outputs shown are exactly what it printed.

## The simple idea

Imagine an architect's master blueprint for a building. From that one drawing, contractors produce the construction steps (migrations) and the building's directory and signage (the typed client). Change the blueprint — add a room — and both the construction plan and the directory are regenerated to match. Nobody edits the directory by hand.

The Prisma schema is that blueprint. You describe models and relations once; Prisma generates the SQL to change the database and a client whose methods and types match the schema exactly.

> [!ANALOGY]
> The Prisma schema is like an architect's master blueprint: from one drawing come the construction steps (migrations) and the building's directory (the typed client), always in agreement with each other.
>
> **Where the analogy breaks:** a blueprint describes what to build, not how people will move around inside. The schema says nothing about which queries your application will run — so it cannot stop you from walking the long way round (N+1 queries, loading every column). You still design the queries.

## The proper definition and key words

**Prisma ORM** is a TypeScript and Node.js ORM consisting of a schema language, a migration tool (Prisma Migrate) and a generated, type-safe query client (Prisma Client).

Key words:

- **Prisma schema** (`schema.prisma`) — the file defining the data source, the client generator and the **models**.
- **Model** — a definition mapped to a table; **fields** map to columns or relations.
- **Relation field** — a field that links models (`customer Customer`, `orders Order[]`) without being a column itself.
- **Attribute** — a modifier such as `@id`, `@unique`, `@default`, `@relation`, `@map`, or block-level `@@index`, `@@map`.
- **Prisma Client** — the generated query library (`prisma.customer.findMany(...)`).
- **Driver adapter** — the package connecting Prisma Client to a database driver (for example, `@prisma/adapter-pg` using `pg`).
- **`prisma.config.ts`** — the configuration file (schema location, migrations folder, database URL).
- **Prisma Migrate** — the tool that generates and applies SQL migrations from schema changes.
- **Nested write** — creating or connecting related records in one call.
- **Client extension** — a way to add methods, computed fields or behaviour to the client (`$extends`).

## Setting up

### Level 1 — Installation and files

```bash
npm install prisma --save-dev
npm install @prisma/client @prisma/adapter-pg pg dotenv
npx prisma init --datasource-provider postgresql
```

`prisma init` creates a schema file, a configuration file and a `.env` file:

```ts
// fragment
// prisma.config.ts
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: process.env["DATABASE_URL"] },
});
```

The database URL lives in the configuration (from the environment), not in the schema. `.env` holds `DATABASE_URL` for local development and must never be committed ({{ch:secrets-manager}}).

### Level 2 — The schema

Here is the shop's schema:

```prisma
generator client {
  provider            = "prisma-client"
  output              = "../generated/prisma"
  importFileExtension = "js"            // for projects compiled with tsc; omit when using a bundler or tsx
}

datasource db {
  provider = "postgresql"
}

model Customer {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  name      String
  createdAt DateTime @default(now()) @map("created_at")
  orders    Order[]

  @@map("customers")
}

model Product {
  id    Int         @id @default(autoincrement())
  sku   String      @unique
  name  String
  price Decimal     @db.Decimal(10, 2)
  stock Int         @default(0)
  items OrderItem[]

  @@map("products")
}

enum OrderStatus {
  PAID
  SHIPPED
  DELIVERED
  CANCELLED
}

model Order {
  id         Int         @id @default(autoincrement())
  customer   Customer    @relation(fields: [customerId], references: [id])
  customerId Int         @map("customer_id")
  status     OrderStatus @default(PAID)
  placedAt   DateTime    @map("placed_at")
  items      OrderItem[]

  @@index([customerId, placedAt(sort: Desc)])
  @@map("orders")
}

model OrderItem {
  order     Order   @relation(fields: [orderId], references: [id], onDelete: Cascade)
  orderId   Int     @map("order_id")
  product   Product @relation(fields: [productId], references: [id])
  productId Int     @map("product_id")
  quantity  Int
  unitPrice Decimal @map("unit_price") @db.Decimal(10, 2)

  @@id([orderId, productId])
  @@map("order_items")
}
```

Reading it:

- **`generator client`** uses the `prisma-client` generator, which writes the client into your project (`output` is required) as TypeScript source. Import it from that folder, not from `@prisma/client`.
- **Models** use PascalCase names and camelCase fields; **`@map` and `@@map`** give the database snake_case names, so SQL written by hand (and by colleagues using other tools) stays conventional.
- **Relations** have two sides. `Order.customer` with `@relation(fields: [customerId], references: [id])` owns the foreign key column `customerId`; `Customer.orders Order[]` is the other side and has no column.
- **`OrderItem`** is a junction table with its own data and a composite primary key `@@id([orderId, productId])` ({{ch:database-design}}).
- **`@db.Decimal(10, 2)`** stores exact money values; **`@@index`** declares an index matching the "customer's recent orders" query ({{ch:indexes}}).
- **`onDelete: Cascade`** deletes an order's items with the order; other relations default to `Restrict`.

### Level 3 — Migrations

```bash
npx prisma migrate dev --name init     # development: create a migration from schema changes and apply it
npx prisma generate                    # generate the client (run after every schema change)
npx prisma migrate deploy              # production/CI: apply pending migrations, never create new ones
```

`migrate dev` compared the empty database with the schema and wrote `prisma/migrations/<timestamp>_init/migration.sql`. Part of what it generated:

```sql
-- fragment
-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED');

-- CreateTable
CREATE TABLE "customers" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "orders_customer_id_placed_at_idx" ON "orders"("customer_id", "placed_at" DESC);

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id")
  REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

Read every generated migration, and notice two things in this one:

- **`DateTime` became `TIMESTAMP(3)` — without time zone.** For moments in time, PostgreSQL's `timestamptz` is the right type ({{ch:postgresql}}); write `DateTime @db.Timestamptz(3)` in the schema. Prisma Client always sends UTC, so plain timestamps work inside Prisma, but other tools reading the table see no zone information.
- **`autoincrement()` became `SERIAL`**, the older form of identity columns — fine in practice.

Migration rules:

- `migrate dev` is for development only. It may ask to **reset** (drop) the database when it detects drift.
- Production applies migrations with **`migrate deploy`**, usually as a deployment step before new code starts ({{ch:cicd}}).
- **Renames**: Prisma sees "field removed, field added" and generates `DROP COLUMN` + `ADD COLUMN`, losing data. Edit the migration SQL to `RENAME COLUMN` before applying (`migrate dev --create-only` creates the file without applying it), or keep the database name with `@map`.
- For changes Prisma cannot express (partial indexes, exclusion constraints, check constraints, triggers), add SQL to a migration by hand; Prisma keeps it.
- Live systems still need expand–contract and lock-aware migrations ({{ch:database-design}}).

## Using Prisma Client

### Level 2 — Creating the client

```ts
// fragment
// db.ts — one client for the whole application
import { PrismaClient } from "./generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";

export const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
```

Create **one** client per process and reuse it — it manages a connection pool. In Prisma 7, the client talks to the database through a **driver adapter** (here, the standard `pg` driver), which is also how it supports other runtimes and serverless databases.

### Level 2 — Reading data

```ts
import { PrismaClient } from "./generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
await prisma.$executeRaw`TRUNCATE order_items, orders, products, customers RESTART IDENTITY CASCADE`;

await prisma.product.createMany({
  data: [
    { sku: "TEA-GRN", name: "Green Tea", price: "4.20", stock: 40 },
    { sku: "TEA-BLK", name: "Breakfast Tea", price: "3.80", stock: 0 },
    { sku: "COF-BNS", name: "Coffee Beans", price: "9.50", stock: 12 },
    { sku: "SNK-OAT", name: "Oat Biscuits", price: "2.50", stock: 60 },
  ],
});

const teas = await prisma.product.findMany({
  where: { name: { contains: "tea", mode: "insensitive" }, stock: { gt: 0 } },
  select: { sku: true, name: true, price: true },
  orderBy: { price: "desc" },
});
console.log(teas.map((p) => `${p.sku} ${p.name} £${p.price.toFixed(2)}`));

const stats = await prisma.product.aggregate({ _count: true, _avg: { price: true }, _sum: { stock: true } });
console.log({ products: stats._count, avgPrice: stats._avg.price?.toFixed(2), units: stats._sum.stock });

// Cursor pagination: 2 per page, ordered by id
const page1 = await prisma.product.findMany({ take: 2, orderBy: { id: "asc" }, select: { id: true, sku: true } });
const page2 = await prisma.product.findMany({ take: 2, skip: 1, cursor: { id: page1.at(-1)!.id }, orderBy: { id: "asc" }, select: { id: true, sku: true } });
console.log("page 1:", page1, "page 2:", page2);
await prisma.$disconnect();
```

**Output:**

```text
[ 'TEA-GRN Green Tea £4.20' ]
{ products: 4, avgPrice: '5.00', units: 112 }
page 1: [ { id: 1, sku: 'TEA-GRN' }, { id: 2, sku: 'TEA-BLK' } ] page 2: [ { id: 3, sku: 'COF-BNS' }, { id: 4, sku: 'SNK-OAT' } ]
```

- **`where`** combines conditions: `contains` with `mode: "insensitive"` (an `ILIKE` in PostgreSQL), `gt` for "greater than". Breakfast Tea is excluded because its stock is 0.
- **`select`** limits the result to three fields, and the TypeScript type of `teas` contains exactly those fields. Always select what you need ({{ch:orms}}).
- **`Decimal`** values come back as `Decimal` objects (not JavaScript numbers, which cannot represent money exactly). Use their methods — `toFixed(2)`, `plus`, `times` — and format for display; `String(price)` would print `4.2`.
- **`aggregate`** computes count, average and sum in the database; `groupBy` does the same per group.
- **Cursor pagination** (`cursor` + `skip: 1` + `take`) continues after the last row of the previous page, like keyset pagination ({{ch:query-optimization}}); `skip`/`take` alone is offset pagination, slow on deep pages.
- `$executeRaw` truncates the tables at the start so the example can be rerun; `createMany` inserts many rows in one statement.

### Level 3 — Relations and the N+1 problem

Loading related data the wrong way multiplies queries. With query logging on, here are three ways to show ten customers with their orders:

```ts
import { PrismaClient } from "./generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  log: [{ emit: "event", level: "query" }],
});
let queries = 0;
prisma.$on("query", () => { queries++; });

await prisma.$executeRaw`TRUNCATE order_items, orders, products, customers RESTART IDENTITY CASCADE`;
for (let i = 1; i <= 10; i++) {
  await prisma.customer.create({
    data: {
      email: `customer${i}@example.com`, name: `Customer ${i}`,
      orders: { create: [{ placedAt: new Date("2026-10-01T00:00:00Z") }, { placedAt: new Date("2026-11-01T00:00:00Z") }] },
    },
  });
}

queries = 0;
const customers = await prisma.customer.findMany({ take: 10, orderBy: { id: "asc" } });
for (const c of customers) await prisma.order.count({ where: { customerId: c.id } });
console.log(`count per customer in a loop: ${queries} queries`);

queries = 0;
const withCounts = await prisma.customer.findMany({
  take: 10, orderBy: { id: "asc" },
  select: { name: true, _count: { select: { orders: true } } },
});
console.log(`_count in the same query:     ${queries} query`, withCounts[0]);

queries = 0;
const withOrders = await prisma.customer.findMany({ take: 10, orderBy: { id: "asc" }, include: { orders: true } });
console.log(`include orders:               ${queries} queries`, withOrders[0]!.orders.length, "orders for the first");
await prisma.$disconnect();
```

**Output:**

```text
count per customer in a loop: 11 queries
_count in the same query:     1 query { name: 'Customer 1', _count: { orders: 2 } }
include orders:               2 queries 2 orders for the first
```

- The **loop** makes one query per customer — the N+1 pattern ({{ch:query-optimization}}).
- **`_count`** asks for the count of a relation inside the main query: one query.
- **`include`** loads the relation, and Prisma does it with **two** queries: the customers, then all their orders at once (`WHERE customer_id IN (…)`), joined together in memory. That is batching, not N+1 — two queries however many customers. (Prisma can also load relations with database joins through the `relationLoadStrategy` option; measure both on your data.)
- The setup uses a **nested write**: each `customer.create` also creates two orders, inside one transaction.

Prefer `select` with nested `select` over broad `include` in hot paths — it loads only the fields each relation needs:

```ts
// fragment
const page = await prisma.order.findMany({
  where: { customerId },
  orderBy: { placedAt: "desc" },
  take: 20,
  select: {
    id: true, status: true, placedAt: true,
    items: { select: { quantity: true, unitPrice: true, product: { select: { name: true } } } },
  },
});
```

### Level 3 — Writing: nested writes, upserts, updates

```ts
// fragment
// Create an order, connect an existing customer, and create its items in one call (one transaction)
await prisma.order.create({
  data: {
    customer: { connect: { id: customerId } },
    placedAt: new Date(),
    items: { create: lines.map((l) => ({ productId: l.productId, quantity: l.quantity, unitPrice: l.unitPrice })) },
  },
});

// Insert or update by a unique field
await prisma.product.upsert({
  where: { sku: "SNK-ALM" },
  create: { sku: "SNK-ALM", name: "Almond Bar", price: "2.20", stock: 15 },
  update: { stock: 15 },
});

// Atomic number operations: computed in the database, safe under concurrency
await prisma.product.update({ where: { sku: "TEA-GRN" }, data: { stock: { decrement: 2 } } });
```

Never update counters by reading, modifying and writing the object (`stock: product.stock - 2`): that causes lost updates ({{ch:transactions}}). Use `increment`/`decrement` — and for conditional changes ("only if enough stock"), `updateMany` with the condition in `where`, as the next example shows.

**Mass assignment** warning: do not pass request bodies directly as `data`. Map validated input to explicit fields ({{ch:validation}}), or a client could set `status: "DELIVERED"` or another customer's id.

### Level 3 — Transactions, conditional updates and errors

Placing an order must create the order, reserve stock for each line and record the items — all or nothing:

```ts
import { PrismaClient, Prisma } from "./generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
await prisma.$executeRaw`TRUNCATE order_items, orders, products, customers RESTART IDENTITY CASCADE`;
const sara = await prisma.customer.create({ data: { email: "sara@example.com", name: "Sara Khan" } });
await prisma.product.createMany({ data: [
  { sku: "TEA-GRN", name: "Green Tea", price: "4.20", stock: 5 },
  { sku: "COF-BNS", name: "Coffee Beans", price: "9.50", stock: 1 },
] });

class OutOfStock extends Error {}

async function placeOrder(customerId: number, lines: { sku: string; quantity: number }[]) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.create({ data: { customerId, placedAt: new Date("2026-11-20T10:00:00Z") } });
    for (const line of [...lines].sort((a, b) => a.sku.localeCompare(b.sku))) {   // consistent lock order
      const reserved = await tx.product.updateMany({                              // atomic, conditional
        where: { sku: line.sku, stock: { gte: line.quantity } },
        data: { stock: { decrement: line.quantity } },
      });
      if (reserved.count === 0) throw new OutOfStock(`${line.sku}: not enough stock`);
      const product = await tx.product.findUniqueOrThrow({ where: { sku: line.sku } });
      await tx.orderItem.create({ data: { orderId: order.id, productId: product.id, quantity: line.quantity, unitPrice: product.price } });
    }
    return order.id;
  });
}

console.log("order", await placeOrder(sara.id, [{ sku: "TEA-GRN", quantity: 2 }, { sku: "COF-BNS", quantity: 1 }]));
try {
  await placeOrder(sara.id, [{ sku: "TEA-GRN", quantity: 1 }, { sku: "COF-BNS", quantity: 1 }]);
} catch (err) {
  console.log("second order failed:", (err as Error).message);
}
const stock = await prisma.product.findMany({ select: { sku: true, stock: true }, orderBy: { sku: "asc" } });
console.log("stock:", stock, "orders:", await prisma.order.count());

try {
  await prisma.customer.create({ data: { email: "sara@example.com", name: "Duplicate" } });
} catch (err) {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
    console.log("duplicate email rejected:", err.code, err.meta?.modelName);
  } else throw err;
}
await prisma.$disconnect();
```

**Output:**

```text
order 1
second order failed: COF-BNS: not enough stock
stock: [ { sku: 'COF-BNS', stock: 0 }, { sku: 'TEA-GRN', stock: 3 } ] orders: 1
duplicate email rejected: P2002 Customer
```

- **`prisma.$transaction(async (tx) => …)`** runs the callback in one database transaction. Everything must use **`tx`**, not `prisma` — a call on the global client would run outside the transaction.
- **`updateMany` with `stock: { gte: quantity }`** is a single atomic, conditional `UPDATE`. Its `count` tells whether the stock was reserved; zero means not enough, and throwing rolls everything back.
- The **second order** reserved green tea (stock went from 3 to 2 inside the transaction), then failed on coffee beans — and the rollback restored green tea to 3 and removed the half-created order: there is still only **one** order.
- Lines are processed in **sorted order**, so two concurrent multi-item orders lock products in the same order and cannot deadlock ({{ch:transactions}}).
- **Errors** carry stable codes: **`P2002`** is a unique-constraint violation; others include **`P2025`** (record not found for an update or delete) and **`P2003`** (foreign-key violation). Map them to HTTP responses in one place — a `409 Conflict` for P2002, for instance ({{ch:error-handling}}).
- Interactive transactions hold a connection for their whole duration and have a default timeout (5 seconds); keep them short and never call external services inside. For independent statements that should commit together, the array form `prisma.$transaction([op1, op2])` is simpler. An `isolationLevel` option selects, for example, `Serializable` — with retries ({{ch:transactions}}).

**Optimistic concurrency** uses the same conditional-update technique: add a `version Int @default(1)` field and update with `updateMany({ where: { id, version }, data: { …, version: { increment: 1 } } })`; a `count` of 0 means someone else saved first.

### Level 3 — Raw SQL and client extensions

For queries Prisma Client cannot express — window functions, complex reports, database-specific features — use raw SQL with **tagged templates**, which turn interpolated values into parameters. Client **extensions** add behaviour to the client, such as computed fields:

```ts
import { PrismaClient } from "./generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";

const base = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
await base.$executeRaw`TRUNCATE order_items, orders, products, customers RESTART IDENTITY CASCADE`;
await base.product.createMany({ data: [
  { sku: "TEA-GRN", name: "Green Tea", price: "4.20", stock: 40 },
  { sku: "SNK-OAT", name: "Oat Biscuits", price: "2.50", stock: 0 },
] });

// A client extension adds a computed field to every product result
const prisma = base.$extends({
  result: {
    product: {
      priceLabel: { needs: { price: true }, compute: (p) => `£${p.price.toFixed(2)}` },
      inStock: { needs: { stock: true }, compute: (p) => p.stock > 0 },
    },
  },
});
console.log(await prisma.product.findMany({ select: { sku: true, priceLabel: true, inStock: true }, orderBy: { sku: "asc" } }));

// Raw SQL with a tagged template: ${minStock} becomes a parameter, not part of the SQL text
const minStock = 10;
const rows = await prisma.$queryRaw<{ sku: string; value: string }[]>`
  SELECT sku, (price * stock)::text AS value FROM products WHERE stock >= ${minStock} ORDER BY sku`;
console.log(rows);
await base.$disconnect();
```

**Output:**

```text
[
  { sku: 'SNK-OAT', priceLabel: '£2.50', inStock: false },
  { sku: 'TEA-GRN', priceLabel: '£4.20', inStock: true }
]
[ { sku: 'TEA-GRN', value: '168.00' } ]
```

- The **`result` extension** defines `priceLabel` and `inStock`, computed from the fields they `need`; they can be selected like real fields and are fully typed. Extensions can also add model methods (`prisma.product.findBySku(…)`), wrap queries (for example, to apply soft-delete filters or audit logging — the replacement for the old `$use` middleware), and add client-level methods.
- **`$queryRaw`** with a tagged template is safe: `${minStock}` is sent as a parameter. The result type is whatever you declare, so declare it carefully (here `value` is cast to text to keep the exact decimal). Never use `$queryRawUnsafe` or `$executeRawUnsafe` with user input ({{ch:sql}}).
- For larger raw-SQL needs, Prisma's **TypedSQL** feature lets you keep queries in `.sql` files and generates typed functions from them.

## Prisma in production

### Level 4 — Connections, serverless and performance

- **One client per process.** In development with hot reload (Next.js, for example), store the client on `globalThis` so reloads do not create new pools ({{ch:nextjs}}).
- **Pool sizing**: the adapter's `pg` pool settings (`max`, timeouts) apply; with many instances or serverless functions, put a pooler (PgBouncer, RDS Proxy) or Prisma Postgres's built-in pooling in front of the database ({{ch:postgresql}}).
- **Watch the queries**: log queries (and their durations) in development, and trace them in production ({{ch:observability-and-incidents}}). Count queries per request to catch N+1 regressions.
- **Select narrowly** in hot paths and paginate with cursors.
- **Bulk work**: `createMany` for inserts; for very large imports or updates, raw SQL (`COPY`, `INSERT … SELECT`, batched `UPDATE`s) beats looping over the client.
- **Indexes** are declared with `@@index`/`@unique` in the schema; check the plans of important queries with `EXPLAIN` like any other SQL ({{ch:query-optimization}}).

### Level 4 — Testing

- **Unit tests**: put Prisma behind repositories or services, and test business logic against fakes ({{ch:nestjs-basics}}).
- **Integration tests**: run against a real PostgreSQL (a container in CI, {{ch:docker}}), apply migrations with `migrate deploy`, and isolate tests by truncating tables between tests or wrapping each test in a transaction that is rolled back.
- **Migration tests**: in CI, apply all migrations to an empty database and check that the generated client matches the schema (`prisma migrate diff` can detect drift between schema, migrations and a database).

## From beginner to enterprise

**Level 1–2 — first Prisma app.** Schema with models and relations; `migrate dev` and `generate`; basic `findMany`, `create`, `update`, `delete`; `select` and `include`.

**Level 3 — solid application code.** `@map` naming, `Decimal` money, `timestamptz` timestamps, indexes in the schema; nested writes; `_count`, `aggregate`, `groupBy`; cursor pagination; interactive transactions with atomic, conditional updates; error codes mapped to HTTP; safe raw SQL.

**Level 4 — production.** `migrate deploy` in pipelines; hand-edited migrations for renames and advanced constraints; one client per process with sized pools and poolers; query logging and tracing; client extensions for cross-cutting concerns; integration tests against real PostgreSQL.

**Level 5 — senior practice.** Choosing where Prisma fits and where raw SQL or a query builder is better; read replicas through extensions; performance budgets; expand–contract migrations on large tables.

**Level 6 — enterprises.** Shared schema conventions and generated clients across services; migration governance and review; multi-tenant patterns combining Prisma with row-level security ({{ch:postgresql}}).

## Real-world use cases

### An order history API

- **Query**: `findMany` on orders with `where: { customerId }`, `orderBy: { placedAt: "desc" }`, cursor pagination, and nested `select` for items and product names — two or three queries per page regardless of size, backed by the `@@index([customerId, placedAt(sort: Desc)])`.
- **Response**: mapped to a DTO with money formatted from `Decimal` and timestamps in ISO 8601.

### Renaming a column safely

- **Need**: `phone` should become `phoneNumber` in code.
- **Safe approach**: keep the column and add `@map("phone")` to the renamed field — no migration at all. If the database column must change too, create the migration with `--create-only`, replace the generated `DROP`/`ADD` with `ALTER TABLE … RENAME COLUMN`, review, then apply.

## Common mistakes

### Beginner: creating a new client per request

**Consequence:** connection exhaustion. **Fix:** one shared client.

### Beginner: forgetting `prisma generate`

**Consequence:** types and client out of date. **Fix:** run it after schema changes and in the build.

### Beginner: `include` everything, everywhere

**Fix:** `select` exactly what each use case needs.

### Intermediate: converting `Decimal` to `Number`

**Consequence:** rounding errors in money. **Fix:** `Decimal` arithmetic and formatting.

### Intermediate: read–modify–write counters

**Fix:** `increment`/`decrement`, conditional `updateMany`.

### Intermediate: using `prisma` instead of `tx` inside transactions

**Fix:** always the transaction client.

### Production: running `migrate dev` against production

**Consequence:** possible database resets. **Fix:** `migrate deploy` only.

### Production: applying generated renames without reading them

**Consequence:** dropped columns and lost data. **Fix:** review and edit migrations.

## Debugging and troubleshooting

- **"Cannot find module … generated/prisma"**: the client was not generated, or the import path or file extension does not match the generator's `output` and `importFileExtension` settings.
- **`P2002` on insert**: a unique constraint — check `err.meta` for the model and constraint; handle as a conflict.
- **`P2025` on update/delete**: no record matched — return `404` or treat as already deleted.
- **"Transaction already closed" / timeouts**: the interactive transaction exceeded its timeout — slow queries or external calls inside; shorten it or raise `timeout` deliberately.
- **Drift detected by `migrate dev`**: the database was changed outside migrations — create a migration capturing the change, or reset only a development database.
- **Unexpected numbers of queries**: enable query logging; look for loops and lazy patterns; use `select`, `_count` and batching.

## Security summary

- Prisma Client **parameterises** all queries; raw SQL must use **tagged templates** — never the `Unsafe` variants with user input.
- **Select** only needed fields so password hashes and other secrets are never loaded or returned by accident.
- Prevent **mass assignment**: build `data` from validated DTOs, not request bodies.
- Keep `DATABASE_URL` in secrets, use **least-privilege** database roles for the application, and a separate role for migrations ({{ch:postgresql}}).
- Review migrations for **destructive** statements before they reach production.

## How a senior engineer thinks about this

- **The schema is the contract.** Names, types (`Decimal`, `timestamptz`), indexes and relations are designed deliberately, with `@map` keeping the database conventional.
- **Every Prisma call is SQL.** They know how `include`, `select` and nested writes translate, and log queries to confirm.
- **Concurrency is designed, not assumed.** Atomic and conditional updates, short transactions, consistent ordering.
- **Migrations are code.** Generated SQL is reviewed, edited when needed, and applied with `migrate deploy`.
- **Use raw SQL without guilt.** Reports, bulk work and advanced features belong in typed raw SQL.

## Exercises

### Exercise 1 — Model a relation

**Objective:** practise the schema language.
**What to do:** add product reviews to the schema: a review belongs to a customer and a product, has a rating from 1 to 5, an optional body and a creation time; a customer may review each product only once; reviews are listed per product, newest first.

<details>
<summary>Show the solution</summary>

```prisma
model Review {
  id         Int      @id @default(autoincrement())
  customer   Customer @relation(fields: [customerId], references: [id])
  customerId Int      @map("customer_id")
  product    Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  productId  Int      @map("product_id")
  rating     Int      @db.SmallInt
  body       String?
  createdAt  DateTime @default(now()) @map("created_at") @db.Timestamptz(3)

  @@unique([customerId, productId])
  @@index([productId, createdAt(sort: Desc)])
  @@map("reviews")
}
```

Also add `reviews Review[]` to both `Customer` and `Product`. `@@unique([customerId, productId])` enforces one review per customer per product; the index matches "reviews for a product, newest first". Prisma's schema cannot express "rating between 1 and 5", so add `ALTER TABLE reviews ADD CONSTRAINT reviews_rating_range CHECK (rating BETWEEN 1 AND 5);` to the generated migration (create it with `--create-only`), and validate in the application too.

</details>

### Exercise 2 — Rewrite for fewer queries

**Objective:** practise efficient Prisma queries.
**What to do:** this code builds a "top customers" list: `const customers = await prisma.customer.findMany(); const result = []; for (const c of customers) { const orders = await prisma.order.findMany({ where: { customerId: c.id }, include: { items: true } }); const spent = orders.flatMap(o => o.items).reduce((s, i) => s + Number(i.unitPrice) * i.quantity, 0); result.push({ name: c.name, spent }); } result.sort((a, b) => b.spent - a.spent);`. List the problems and rewrite it.

<details>
<summary>Show the solution</summary>

**Problems:** loads every customer, then every order and item per customer (N+1, unbounded memory); converts money with `Number` (rounding errors); sorts in JavaScript instead of the database; no limit.

**Rewrite** — let PostgreSQL aggregate, sort and limit, returning exact decimals:

```ts
// fragment
const top = await prisma.$queryRaw<{ name: string; spent: string }[]>`
  SELECT c.name, sum(oi.quantity * oi.unit_price)::text AS spent
  FROM customers c
  JOIN orders o ON o.customer_id = c.id AND o.status <> 'CANCELLED'
  JOIN order_items oi ON oi.order_id = o.id
  GROUP BY c.id, c.name
  ORDER BY sum(oi.quantity * oi.unit_price) DESC
  LIMIT 10`;
```

One query, exact money, and only ten rows sent to the application. (Prisma's `groupBy` cannot aggregate across relations, so raw SQL is the right tool here.)

</details>

### Exercise 3 — Review a Prisma service

**Objective:** practise spotting Prisma-specific problems.
**The scenario:** a service creates `new PrismaClient()` inside each request handler; updates stock with `const p = await prisma.product.findUnique(...); await prisma.product.update({ data: { stock: p.stock - qty } })`; uses `prisma.$queryRawUnsafe` with a search string from the query parameters; runs `prisma migrate dev` in the production start script; and returns `prisma.customer.findMany()` from an API endpoint. List the problems and fixes.

<details>
<summary>Show the solution</summary>

1. **Client per request** → new pools per request, connection exhaustion. One shared client per process.
2. **Read–modify–write stock** → lost updates, overselling. `updateMany({ where: { id, stock: { gte: qty } }, data: { stock: { decrement: qty } } })` and check `count`.
3. **`$queryRawUnsafe` with user input** → SQL injection. Use the client's `contains` filter, or `$queryRaw` with a tagged template.
4. **`migrate dev` in production** → may create migrations or reset the database. `migrate deploy` in the deployment pipeline.
5. **Returning all customers with all fields** → leaks data (including any sensitive fields) and loads unbounded rows. `select` public fields, paginate, authorise, map to a DTO.

</details>

### Exercise 4 — Production scenario: the timestamp surprise

**Objective:** practise diagnosing schema-type issues.
**The scenario:** a reporting team queries the `orders` table directly with SQL and finds that orders placed at 23:30 in the UK in summer appear on the wrong day in their daily totals. The application, using Prisma, shows the correct dates. Explain why and how to fix it safely on a live table.

<details>
<summary>Show the solution</summary>

**Why:** `placedAt DateTime` was mapped to `timestamp(3)` **without** time zone. Prisma writes UTC values, so the column holds UTC wall-clock times with no zone marker. The application converts correctly because it knows they are UTC; the reporting tool treats them as local time (or the session's zone) and groups by the wrong day. An order at 23:30 BST is 22:30 UTC — stored as `22:30` with no zone — and boundaries computed in local time shift around midnight.

**Fix on a live table:**
1. Change the schema to `placedAt DateTime @map("placed_at") @db.Timestamptz(3)`.
2. Create the migration with `--create-only` and make sure it converts correctly: `ALTER TABLE orders ALTER COLUMN placed_at TYPE timestamptz(3) USING placed_at AT TIME ZONE 'UTC';` — interpreting existing values as UTC.
3. Note that the type change **rewrites the table** and takes a strong lock; on a large table, use expand–contract instead (add a new `timestamptz` column, backfill in batches, switch reads, drop the old column) ({{ch:database-design}}).
4. Tell the reporting team to compute day boundaries in the business time zone (`date_trunc('day', placed_at AT TIME ZONE 'Europe/London')`).
5. Adopt `@db.Timestamptz` as the default for all `DateTime` fields in the project's conventions.

</details>

## Summary

**Prisma** generates a typed client and SQL migrations from one **schema file**. In Prisma 7, a `prisma.config.ts` holds the database URL and paths, the `prisma-client` **generator** writes the client into your project, and the client connects through a **driver adapter** such as `@prisma/adapter-pg`. The schema defines **models** with fields and attributes (`@id`, `@unique`, `@default`, `@relation`, `@map`, `@@index`, `@@id`), enums, two-sided relations and database types like `@db.Decimal`; note that `DateTime` defaults to a timestamp without time zone — use `@db.Timestamptz`.

`migrate dev` generates and applies migrations in development; `migrate deploy` applies them in production; `generate` refreshes the client. Read every migration: renames become drops unless edited, and constraints Prisma cannot express are added by hand. Prisma Client offers typed `findMany`/`create`/`update`/`delete`, filters, **`select`** and **`include`**, nested writes, upserts, `aggregate`/`groupBy`, `_count` and cursor pagination. `include` batches relations rather than causing N+1, but loops still do. Money comes back as **`Decimal`**.

Correctness under concurrency comes from atomic **`increment`/`decrement`** and conditional **`updateMany`** checked by `count`, inside short **interactive transactions** that always use the transaction client. Errors carry codes (`P2002`, `P2025`, `P2003`) to map to HTTP responses. Raw SQL uses tagged templates (`$queryRaw`, TypedSQL) and never the `Unsafe` variants with user input; **client extensions** add computed fields, methods and query hooks. In production: one client per process, sized pools and poolers, query logging, narrow selects, raw SQL for bulk work, and integration tests against real PostgreSQL.

## Key terms

- **Prisma ORM** — A TypeScript ORM with a schema language, a migration tool and a generated client.
- **Prisma schema** — The file defining the data source, client generator, models and enums.
- **prisma.config.ts** — Prisma's configuration file for schema location, migrations and the database URL.
- **Generator (Prisma)** — The schema block that configures how and where the client is generated.
- **Model (Prisma)** — A schema definition mapped to a database table.
- **Field attribute** — A modifier on a field, such as `@id`, `@unique`, `@default` or `@map`.
- **Block attribute** — A modifier on a model, such as `@@index`, `@@unique`, `@@id` or `@@map`.
- **Relation field** — A field linking models that is not itself a database column.
- **Native type attribute** — A `@db.` attribute choosing a specific database type, such as `@db.Decimal(10, 2)`.
- **Prisma Client** — The generated, type-safe query client.
- **Driver adapter** — A package connecting Prisma Client to a specific database driver.
- **Prisma Migrate** — Prisma's tool for generating and applying SQL migrations.
- **migrate dev / migrate deploy** — Commands for creating and applying migrations in development, and applying them in production.
- **Schema drift** — A database whose structure differs from what migrations describe.
- **select / include** — Options choosing which fields and relations a query returns.
- **Nested write** — Creating, connecting or updating related records in a single operation.
- **Upsert** — Creating a record or updating it if it already exists.
- **Cursor pagination (Prisma)** — Paginating with `cursor`, `skip: 1` and `take` after the last seen record.
- **Decimal (Prisma)** — The exact decimal type used for `Decimal` fields, avoiding floating-point errors.
- **Interactive transaction** — A Prisma transaction that runs a callback with a transaction client.
- **Transaction client** — The `tx` object whose queries run inside the transaction.
- **Prisma error code** — A stable code such as `P2002` identifying a known database error.
- **$queryRaw** — Prisma's tagged-template method for safe raw SQL queries.
- **TypedSQL** — A Prisma feature generating typed functions from SQL files.
- **Client extension** — A mechanism (`$extends`) for adding computed fields, methods or query hooks to the client.

## What comes next

Prisma represents the schema-first approach. The next chapter, {{ch:typeorm}}, covers the main alternative in the NestJS world: TypeORM, where entities are decorated TypeScript classes, with repositories, the query builder, relations and their loading strategies, transactions, migrations and the pitfalls specific to its design.
