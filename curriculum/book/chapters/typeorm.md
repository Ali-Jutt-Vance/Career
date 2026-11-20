# TypeORM

> [!GOALS]
> - Set up TypeORM with a `DataSource`, entities defined as decorated classes, and PostgreSQL.
> - Model columns, relations (`@ManyToOne`, `@OneToMany`, `@ManyToMany`), indexes and naming deliberately.
> - Use **repositories** and the **query builder**, and read the SQL they generate.
> - Load relations without N+1 queries, and understand eager and lazy relations.
> - Write safely: `save` versus `insert`/`update`, atomic increments, transactions with the entity manager, and real optimistic locking.
> - Manage the schema with **migrations** instead of `synchronize`, and use TypeORM in NestJS.

## Why this matters

**TypeORM** is a long-established ORM for TypeScript and the traditional default in NestJS projects: entities are TypeScript classes with decorators, injected repositories handle persistence, and a query builder covers what the repository API cannot. Many existing codebases — especially NestJS back ends — use it, so you are likely to meet it at work even if you choose a different tool for new projects.

TypeORM also has sharp edges. Some behaviours are surprising enough to cause real data bugs: a schema option that silently changes production tables, relation-loading modes that create N+1 queries, a `save` method that does more than it appears to, and an optimistic-locking feature that does not prevent lost updates on its own. This chapter shows TypeORM's model and API (version 1, released after years of 0.x versions), and demonstrates those edges with real runs so you know exactly how to avoid them. Every example ran against PostgreSQL through TypeORM 1.1, and the outputs are exactly what it printed.

## The simple idea

TypeORM turns your TypeScript classes into a description of your tables. A class marked `@Entity` is a table; properties marked `@Column` are columns; properties marked with relation decorators are foreign keys and joins. A **repository** for each entity is like a librarian for that shelf: "find these", "save this", "remove that". When the librarian cannot answer a complicated question, you write it yourself with the **query builder**, a structured way of composing SQL.

> [!ANALOGY]
> TypeORM is like labelling the furniture in your house with stickers that say which room and shelf it belongs to: the labels on your classes (decorators) tell TypeORM how to store and fetch each object, and a librarian per shelf (a repository) does the fetching and storing.
>
> **Where the analogy breaks:** a librarian who brings you a book does not quietly re-read the shelf before putting it back. TypeORM's `save` does: it loads the current row first and writes only the differences — which is convenient, costs an extra query, and has consequences for concurrency that the labels alone do not reveal.

## The proper definition and key words

**TypeORM** is an ORM for TypeScript and JavaScript that maps decorated classes (entities) to database tables, providing repositories, an entity manager, a query builder, relation handling and migrations, supporting both data mapper and active record styles.

Key words:

- **DataSource** — the configured connection to a database: driver, credentials, entities, migrations, options.
- **Entity** — a class decorated with `@Entity()` mapped to a table.
- **Column decorators** — `@Column`, `@PrimaryGeneratedColumn`, `@CreateDateColumn`, `@UpdateDateColumn`, `@DeleteDateColumn`, `@VersionColumn`.
- **Relation decorators** — `@ManyToOne`, `@OneToMany`, `@OneToOne`, `@ManyToMany`, with `@JoinColumn` / `@JoinTable` to control the database side.
- **Repository** — the per-entity API: `find`, `findOneBy`, `save`, `insert`, `update`, `delete`, `increment`, and more.
- **EntityManager** — an API working with any entity; inside a transaction, the manager bound to that transaction.
- **QueryBuilder** — a fluent API for building SQL with joins, conditions, grouping and subqueries.
- **Synchronize** — an option that alters the database schema to match the entities automatically at start-up.
- **Migration** — a class with `up` and `down` methods containing schema changes, generated or written by hand.

## Setting up

### Level 1 — Installation and the data source

```bash
npm install typeorm reflect-metadata pg
```

TypeORM relies on decorator metadata, so `tsconfig.json` needs `"experimentalDecorators": true` and `"emitDecoratorMetadata": true`, and `import "reflect-metadata"` must run before any entity is loaded. (Build tools that do not emit decorator metadata, such as esbuild-based runners, cannot infer column types — specify `type` on every `@Column`, or compile with `tsc`.)

```ts
// fragment
// data-source.ts
import "reflect-metadata";
import { DataSource } from "typeorm";

export const AppDataSource = new DataSource({
  type: "postgres",
  url: process.env.DATABASE_URL,
  entities: [Customer, Order, OrderItem, Product],
  migrations: ["dist/migrations/*.js"],
  synchronize: false,                      // schema changes only through migrations
  logging: ["error", "warn"],              // add "query" in development
  extra: { max: 10 },                      // passed to the pg pool
});

await AppDataSource.initialize();
```

## Entities and relations

### Level 2 — A first model, repositories and relation loading

The following example defines two entities, saves data, compares two ways of loading relations while counting queries, and shows the query builder's generated SQL:

```ts
import "reflect-metadata";
import { DataSource, Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn, Index, type Logger } from "typeorm";

@Entity("customers")
class Customer {
  @PrimaryGeneratedColumn() id!: number;
  @Column({ unique: true }) email!: string;
  @Column() name!: string;
  @OneToMany(() => Order, (order) => order.customer) orders!: Order[];
}

@Entity("orders")
@Index(["customer", "placedAt"])
class Order {
  @PrimaryGeneratedColumn() id!: number;
  @ManyToOne(() => Customer, (customer) => customer.orders, { nullable: false }) customer!: Customer;
  @Column({ type: "numeric", precision: 10, scale: 2 }) total!: string;
  @Column({ type: "timestamptz", name: "placed_at" }) placedAt!: Date;
  @CreateDateColumn({ type: "timestamptz", name: "created_at" }) createdAt!: Date;
}

let queries = 0;
const counter: Logger = {
  logQuery: () => { queries++; }, logQueryError: () => {}, logQuerySlow: () => {},
  logSchemaBuild: () => {}, logMigration: () => {}, log: () => {},
};

const db = new DataSource({
  type: "postgres",
  url: process.env.DATABASE_URL,
  entities: [Customer, Order],
  synchronize: true, dropSchema: true,      // for this example only: never in production
  logging: ["query"], logger: counter,
});
await db.initialize();

const customers = db.getRepository(Customer);
const orders = db.getRepository(Order);
for (let i = 1; i <= 5; i++) {
  const c = await customers.save({ email: `customer${i}@example.com`, name: `Customer ${i}` });
  await orders.save([
    { customer: c, total: "10.00", placedAt: new Date("2026-10-01T00:00:00Z") },
    { customer: c, total: "24.50", placedAt: new Date("2026-11-01T00:00:00Z") },
  ]);
}

queries = 0;
const list = await customers.find({ order: { id: "ASC" } });
for (const c of list) c.orders = await orders.find({ where: { customer: { id: c.id } } });
console.log(`loop:                ${queries} queries`);

queries = 0;
const withRelations = await customers.find({ relations: { orders: true }, order: { id: "ASC" } });
console.log(`relations option:    ${queries} query`, withRelations[0]!.orders.length, "orders for the first");

const qb = orders.createQueryBuilder("o")
  .innerJoin("o.customer", "c")
  .select(["o.id", "o.total"])
  .addSelect("c.name")
  .where("c.email = :email", { email: "customer1@example.com" })
  .andWhere("o.total >= :min", { min: 20 })
  .orderBy("o.placedAt", "DESC");
console.log(qb.getQueryAndParameters());
console.log(await qb.getRawMany());
await db.destroy();
```

**Output:**

```text
loop:                6 queries
relations option:    1 query 2 orders for the first
[
  'SELECT "o"."id" AS "o_id", "o"."total" AS "o_total", "c"."name" AS "c_name" FROM "orders" "o" INNER JOIN "customers" "c" ON "c"."id"="o"."customerId" WHERE "c"."email" = $1 AND "o"."total" >= $2 ORDER BY "o"."placed_at" DESC',
  [ 'customer1@example.com', 20 ]
]
[ { o_id: 2, o_total: '24.50', c_name: 'Customer 1' } ]
```

Walk through it:

- **Entities**: `@Entity("customers")` names the table; `@PrimaryGeneratedColumn()` creates an auto-increment key; `@Column({ unique: true })` adds a unique constraint; `@Column({ type: "timestamptz", name: "placed_at" })` chooses the PostgreSQL type and the column name. The `!` tells TypeScript that TypeORM fills these properties.
- **Relations**: `@ManyToOne` on `Order.customer` is the **owning side** — it creates the foreign-key column. `@OneToMany` on `Customer.orders` is the inverse side and has no column. Both refer to each other through the arrow functions.
- **The foreign-key column is named `customerId`** (camelCase) by default, as the generated SQL shows. For conventional snake_case names, add `@JoinColumn({ name: "customer_id" })`, or configure a naming strategy for the whole project (for example, the `typeorm-naming-strategies` package's snake-case strategy).
- **`numeric` comes back as a string** (`'24.50'`), avoiding floating-point errors; convert deliberately with a decimal library when doing arithmetic.
- **Relation loading**: the loop issues one query per customer (6 in total) — N+1. The **`relations: { orders: true }`** option loads customers and orders with a single joined query.
- **The query builder** produced ordinary SQL with **named parameters** (`:email`, `:min`) translated to `$1`, `$2` — values are never inserted into the SQL text. `getQueryAndParameters()` (or `getSql()`) shows exactly what will run.
- **`getRawMany()`** returns plain rows with aliased column names (`o_id`, `c_name`); **`getMany()`** returns entity instances — useful when selecting whole entities, but it leaves unselected properties `undefined` when you select only some columns, which is easy to misread.
- `synchronize: true, dropSchema: true` creates fresh tables for the example; the next sections explain why real projects never do this.

### Level 3 — More relation types

```ts
// fragment
@Entity("products")
export class Product {
  @PrimaryGeneratedColumn() id!: number;
  @Column({ unique: true }) sku!: string;
  @Column({ type: "numeric", precision: 10, scale: 2 }) price!: string;
  @Column({ type: "int", default: 0 }) stock!: number;

  @ManyToMany(() => Tag)                                  // many-to-many through a generated join table
  @JoinTable({ name: "product_tags", joinColumn: { name: "product_id" }, inverseJoinColumn: { name: "tag_id" } })
  tags!: Tag[];
}

@Entity("order_items")
export class OrderItem {                                  // a many-to-many WITH data: model the junction as an entity
  @PrimaryColumn({ name: "order_id" }) orderId!: number;
  @PrimaryColumn({ name: "product_id" }) productId!: number;
  @ManyToOne(() => Order, (o) => o.items, { onDelete: "CASCADE" }) @JoinColumn({ name: "order_id" }) order!: Order;
  @ManyToOne(() => Product) @JoinColumn({ name: "product_id" }) product!: Product;
  @Column({ type: "int" }) quantity!: number;
  @Column({ type: "numeric", precision: 10, scale: 2, name: "unit_price" }) unitPrice!: string;
}
```

`@ManyToMany` with `@JoinTable` suits a pure link (products and tags). As soon as the link carries data — quantity and price — model the junction as its own entity with two `@ManyToOne` relations ({{ch:database-design}}).

### Level 3 — Eager and lazy relations: convenient and dangerous

Two relation options change **when** related data loads:

- **`eager: true`** — the relation is loaded automatically by every `find` call. Convenient at first; later, every query loads data most callers never use, and eager relations chained across entities load large object graphs. Prefer explicit `relations` per query.
- **Lazy relations** (typing the property as `Promise<Customer>`) — accessing `await order.customer` runs a query at that moment. Inside a loop or a serialiser, this is the N+1 problem in its purest form ({{ch:query-optimization}}).

The safe default: no eager or lazy relations; each query states the relations it needs (`relations`, or `leftJoinAndSelect` in the query builder), and query logging in development reveals the rest.

## Reading and writing

### Level 2 — The repository API

```ts
// fragment
const repo = dataSource.getRepository(Order);

await repo.findOneBy({ id: 1042 });                                   // one row or null
await repo.findOneByOrFail({ id: 1042 });                             // throws EntityNotFoundError if missing
await repo.find({
  where: { customer: { id: customerId }, status: In(["PAID", "SHIPPED"]) },
  relations: { items: { product: true } },
  select: { id: true, status: true, placedAt: true },
  order: { placedAt: "DESC" },
  take: 20,
});
await repo.count({ where: { status: "PAID" } });
await repo.existsBy({ id: 1042 });
```

Operators such as `In`, `MoreThan`, `LessThanOrEqual`, `Like`, `ILike`, `IsNull`, `Not` and `Between` express conditions in `where`. Pagination uses `take` and `skip` (offset); for large lists, use keyset conditions instead ({{ch:query-optimization}}).

### Level 3 — `save` versus `insert` and `update`

`save(entity)` is TypeORM's "upsert-ish" convenience: if the entity has an id, TypeORM **loads the current row first**, compares, and updates only changed columns; otherwise it inserts. It also cascades to relations configured with `cascade`. That costs an extra query per entity and has a surprising consequence for concurrency, shown below. For explicit writes:

```ts
// fragment
await repo.insert({ customer: { id: customerId }, total: "59.90", placedAt: new Date() });   // INSERT only
await repo.update({ id: 1042 }, { status: "SHIPPED" });                                     // UPDATE ... WHERE id = 1042
await repo.increment({ id: productId }, "stock", 5);                                        // stock = stock + 5, atomically
await repo.decrement({ id: productId }, "stock", 2);
await repo.delete({ id: 1042 });
await repo.softDelete({ id: 1042 });              // sets the @DeleteDateColumn; normal finds then ignore the row
```

`update`, `increment` and `decrement` issue a single statement without loading anything — use them for changes that do not need the full entity, and always for counters.

### Level 3 — Transactions, atomic updates and optimistic locking

TypeORM's `@VersionColumn` increments a version on every `save`, which suggests optimistic locking ({{ch:transactions}}). This example tests what it actually protects:

```ts
import "reflect-metadata";
import { DataSource, Entity, PrimaryGeneratedColumn, Column, VersionColumn } from "typeorm";

@Entity("product_pages")
class ProductPage {
  @PrimaryGeneratedColumn() id!: number;
  @Column() description!: string;
  @Column({ type: "int" }) stock!: number;
  @VersionColumn() version!: number;
}

const db = new DataSource({ type: "postgres", url: process.env.DATABASE_URL, entities: [ProductPage], synchronize: true, dropSchema: true });
await db.initialize();
const pages = db.getRepository(ProductPage);
await pages.save({ description: "Green tea from Darjeeling.", stock: 10 });

// Two editors load the same row (version 1)
const priya = await pages.findOneByOrFail({ id: 1 });
const jamal = await pages.findOneByOrFail({ id: 1 });

priya.description = "Organic green tea from Darjeeling.";
await pages.save(priya);
jamal.description = "Green tea. Brew at 80°C.";
await pages.save(jamal);                                  // stale version, but no error
console.log("after both saves:", await pages.findOneByOrFail({ id: 1 }));

// A real optimistic check: update only if the version is still the one we loaded
async function saveIfUnchanged(editor: string, id: number, loadedVersion: number, description: string) {
  const result = await pages.createQueryBuilder()
    .update()
    .set({ description, version: () => "version + 1" })
    .where("id = :id AND version = :loadedVersion", { id, loadedVersion })
    .execute();
  console.log(editor, result.affected === 1 ? "saved" : "conflict: reload and reapply your change");
}
const loaded = await pages.findOneByOrFail({ id: 1 });          // both editors see the same version
await saveIfUnchanged("Priya:", 1, loaded.version, "Organic green tea from Darjeeling.");
await saveIfUnchanged("Jamal:", 1, loaded.version, "Green tea. Brew at 80°C.");
console.log("now:", await pages.findOneByOrFail({ id: 1 }));

// Atomic stock change, inside a transaction
await db.transaction(async (manager) => {
  const result = await manager.decrement(ProductPage, { id: 1 }, "stock", 3);
  console.log("rows decremented:", result.affected);
});
console.log("stock now:", (await pages.findOneByOrFail({ id: 1 })).stock);
await db.destroy();
```

**Output:**

```text
after both saves: ProductPage {
  id: 1,
  description: 'Green tea. Brew at 80°C.',
  stock: 10,
  version: 1
}
Priya: saved
Jamal: conflict: reload and reapply your change
now: ProductPage {
  id: 1,
  description: 'Organic green tea from Darjeeling.',
  stock: 10,
  version: 2
}
rows decremented: 1
stock now: 7
```

What happened, confirmed by TypeORM's query log:

- **Priya's `save`** loaded the row and ran `UPDATE … SET description = …, version = version + 1 WHERE id = 1` — version 2.
- **Jamal's `save`** loaded the row again (version 2), compared it with his object — which still said version 1 — treated that as a change he wanted, and ran `UPDATE … SET description = …, version = 1 WHERE id = 1`. **Priya's edit was overwritten, and the version went backwards to 1.** No error. `@VersionColumn` records versions; `save` does not check them.
- **The real fix** is a conditional update — `WHERE id = :id AND version = :loadedVersion` — and checking `affected`. Jamal's update matched nothing, so the application reports a conflict and Priya's text survives. (In an HTTP API, the loaded version travels to the client and back, often as an `ETag`, {{ch:rest-apis}}.) TypeORM can also verify a version **when loading** with `lock: { mode: "optimistic", version }`, but that check happens at read time, not at write time, so it does not close the race on its own.
- **`manager.decrement`** inside `dataSource.transaction(...)` runs one atomic `UPDATE … SET stock = stock - 3`. Inside a transaction callback, **every** operation must go through the provided `manager` (`manager.getRepository(X)`, `manager.save(...)`); using a repository from the global data source would run outside the transaction.

For pessimistic locking, the query builder supports `.setLock("pessimistic_write")` (`SELECT … FOR UPDATE`) inside a transaction; isolation levels can be passed to `dataSource.transaction("SERIALIZABLE", async (manager) => …)` — with retry logic ({{ch:transactions}}).

### Level 3 — The query builder for real queries

The query builder handles what `find` cannot express — aggregates, subqueries, complex joins:

```ts
// fragment
const topCustomers = await dataSource.getRepository(Order).createQueryBuilder("o")
  .innerJoin("o.customer", "c")
  .innerJoin("o.items", "i")
  .select("c.id", "id")
  .addSelect("c.name", "name")
  .addSelect("SUM(i.quantity * i.unit_price)", "spent")
  .where("o.status <> :cancelled", { cancelled: "CANCELLED" })
  .groupBy("c.id")
  .addGroupBy("c.name")
  .orderBy("spent", "DESC")
  .limit(10)
  .getRawMany<{ id: number; name: string; spent: string }>();
```

Always pass values as **parameters** (`:cancelled` with an object), never by string interpolation into `where("…" + value)`. For anything the builder makes awkward, `dataSource.query("SELECT … WHERE x = $1", [value])` runs parameterised raw SQL.

## Schema management

### Level 3 — Never `synchronize` in production

`synchronize: true` compares entities with the database at every start-up and alters tables to match — including **dropping columns** whose properties were renamed or removed. It is handy for prototypes and throwaway test databases; in any environment with real data, it is a data-loss incident waiting to happen. Use migrations:

```bash
npx typeorm migration:generate src/migrations/AddProductTags -d dist/data-source.js   # diff entities vs database
npx typeorm migration:run -d dist/data-source.js                                     # apply pending migrations
npx typeorm migration:revert -d dist/data-source.js                                  # undo the last one
```

A generated migration is a class with `up` and `down` methods containing SQL. As with every generator ({{ch:prisma}}), **read it**: renames appear as drop-and-add, and type changes may rewrite large tables. Edit migrations by hand when needed, and follow expand–contract on live systems ({{ch:database-design}}). Run migrations as a separate deployment step, not automatically at every application start in multiple instances at once.

## TypeORM in NestJS

### Level 3 — Modules and injected repositories

The `@nestjs/typeorm` package integrates TypeORM with Nest's dependency injection ({{ch:nestjs-basics}}):

```ts
// fragment
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: "postgres",
        url: config.getOrThrow("DATABASE_URL"),
        autoLoadEntities: true,
        synchronize: false,
      }),
    }),
    TypeOrmModule.forFeature([Order, OrderItem]),       // repositories available in this module
  ],
  providers: [OrdersService],
})
export class OrdersModule {}

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order) private readonly orders: Repository<Order>,
    private readonly dataSource: DataSource,
  ) {}

  findRecent(customerId: number) {
    return this.orders.find({
      where: { customer: { id: customerId } },
      relations: { items: { product: true } },
      order: { placedAt: "DESC" },
      take: 20,
    });
  }
}
```

`forRoot`/`forRootAsync` configures the connection once; `forFeature` registers entity repositories per module; `@InjectRepository` injects them. For testability, many teams wrap TypeORM repositories in their own repository interfaces, so services depend on an interface and tests use fakes ({{ch:nestjs-basics}}). Return response DTOs rather than entities, so new columns never leak ({{ch:nestjs-advanced}}).

## From beginner to enterprise

**Level 1–2 — first TypeORM app.** Entities with columns and a primary key; a `DataSource`; repository `find`, `save`, `delete`; one-to-many relations.

**Level 3 — solid application code.** Explicit column types and names (or a naming strategy); `numeric` as strings; relations loaded explicitly per query; no eager or lazy relations by default; `update`/`increment` for targeted writes; transactions with the provided manager; the query builder with parameters; migrations instead of `synchronize`.

**Level 4 — production.** Real optimistic locking with conditional updates; pessimistic locks where needed; query logging and N+1 detection; migrations reviewed and run as a deployment step; NestJS integration with repository interfaces and DTOs.

**Level 5 — senior practice.** Deciding where TypeORM's abstractions help and where raw SQL is clearer; performance budgets; avoiding entity-graph sprawl; planning migrations on large tables.

**Level 6 — enterprises.** Shared entity conventions and base classes across services; migration governance; gradual migration away from (or towards) TypeORM in large codebases using repository interfaces as the seam.

## Real-world use cases

### The admin page with hidden queries

- **Symptom**: an order list takes 3 seconds; the log shows hundreds of `SELECT … FROM customers WHERE id = $1`.
- **Cause**: `customer` was declared as a lazy relation, and the serialiser awaited it for each order.
- **Fix**: remove the lazy relation; load `relations: { customer: true }` for this page; select only the needed columns. One query, 50 ms.

### Concurrent edits to product pages

- **Problem**: staff report that edits to product descriptions sometimes vanish.
- **Cause**: `save` with a stale entity overwrote newer changes — `@VersionColumn` alone did not prevent it.
- **Fix**: updates use `WHERE id = :id AND version = :version` with an `affected` check; the edit form sends the loaded version; conflicts show a "this page was changed by someone else" message.

## Common mistakes

### Beginner: `synchronize: true` beyond local experiments

**Consequence:** dropped columns and lost data. **Fix:** migrations.

### Beginner: missing `reflect-metadata` or decorator settings

**Consequence:** "column type cannot be guessed" errors. **Fix:** compiler options, the import, or explicit column types.

### Beginner: eager and lazy relations everywhere

**Consequence:** oversized queries or N+1. **Fix:** explicit `relations` per query.

### Intermediate: converting `numeric` strings with `Number`

**Fix:** decimal arithmetic for money.

### Intermediate: read–modify–`save` for counters

**Fix:** `increment` / `decrement` or conditional updates.

### Intermediate: trusting `@VersionColumn` to prevent lost updates

**Fix:** conditional updates on the version, checking `affected`.

### Intermediate: using global repositories inside `transaction()`

**Fix:** use the provided `manager` for everything.

### Production: string-interpolated query builder conditions

**Consequence:** SQL injection. **Fix:** named parameters.

## Debugging and troubleshooting

- **"ColumnTypeUndefinedError"**: decorator metadata is not emitted — enable `emitDecoratorMetadata`, import `reflect-metadata` first, or give columns explicit types.
- **"No metadata for X was found"**: the entity is not listed in the data source's `entities` (or not registered with `forFeature`/`autoLoadEntities` in NestJS).
- **Relation property is `undefined`**: it was not loaded — add it to `relations` or join it in the query builder.
- **Unexpected extra `SELECT` before updates**: that is `save` loading the current row — use `update` for targeted changes.
- **Changes in a transaction were not rolled back**: an operation used a repository outside the transaction's manager.
- **Migration generation produces drops for renamed fields**: edit the migration to `RENAME COLUMN`, or keep the column name with `name:` in the decorator.

## Security summary

- Use **parameters** in the query builder (`:name` with values) and in `dataSource.query` (`$1`); never concatenate user input.
- **Select** only needed columns; mark sensitive columns with `select: false` so they are excluded unless explicitly requested (for example, password hashes).
- Avoid **mass assignment**: do not `save(request.body)`; map validated DTOs to entity fields ({{ch:validation}}).
- Keep `synchronize` off and review migrations — schema changes are security- and data-relevant.
- Use least-privilege database roles for the application, separate from the migration role ({{ch:postgresql}}).

## How a senior engineer thinks about this

- **Decorators describe tables; queries are still SQL.** They read the query log and `getSql()` output.
- **Explicit beats magic.** No eager or lazy relations, no `synchronize`, explicit column names and types.
- **Know what `save` does.** Targeted `update`/`increment` for writes that do not need a full entity; conditional updates for concurrency.
- **Transactions through the manager.** Every operation inside uses the transaction-bound manager.
- **Wrap the ORM.** Repository interfaces keep business logic testable and the ORM replaceable.

## Exercises

### Exercise 1 — Fix the naming

**Objective:** practise column and relation mapping.
**What to do:** rewrite the `Order` entity from this chapter so that the foreign-key column is `customer_id`, the total is a `numeric(10, 2)` named `total`, timestamps are `timestamptz` named `placed_at` and `created_at`, and the index covers `customer_id` then `placed_at` descending.

<details>
<summary>Show the solution</summary>

```ts
// fragment
@Entity("orders")
@Index("orders_customer_placed_idx", ["customer", "placedAt"])
export class Order {
  @PrimaryGeneratedColumn() id!: number;

  @ManyToOne(() => Customer, (c) => c.orders, { nullable: false })
  @JoinColumn({ name: "customer_id" })
  customer!: Customer;

  @Column({ type: "numeric", precision: 10, scale: 2 })
  total!: string;

  @Column({ type: "timestamptz", name: "placed_at" })
  placedAt!: Date;

  @CreateDateColumn({ type: "timestamptz", name: "created_at" })
  createdAt!: Date;
}
```

`@JoinColumn({ name: "customer_id" })` controls the foreign-key column name. TypeORM's `@Index` decorator does not express sort direction, so for `placed_at DESC` write the index in a migration by hand (`CREATE INDEX orders_customer_placed_idx ON orders (customer_id, placed_at DESC)`) — PostgreSQL can also scan an ascending index backwards, so for a single-column sort direction the plain index often suffices ({{ch:indexes}}). A project-wide snake-case naming strategy avoids repeating `name:` everywhere.

</details>

### Exercise 2 — Remove the N+1

**Objective:** practise relation loading.
**What to do:** this code renders an invoice list: `const orders = await orderRepo.find({ take: 50 }); for (const o of orders) { const items = await itemRepo.find({ where: { order: { id: o.id } }, relations: { product: true } }); render(o, items); }`. Count the queries and rewrite it.

<details>
<summary>Show the solution</summary>

**Count:** 1 + 50 = **51 queries** (each item query joins products, so not more — but still one per order).

**Rewrite:**

```ts
// fragment
const orders = await orderRepo.find({
  take: 50,
  order: { placedAt: "DESC" },
  relations: { items: { product: true } },
  select: { id: true, placedAt: true, items: { quantity: true, unitPrice: true, product: { name: true } } },
});
for (const o of orders) render(o, o.items);
```

Note a subtlety: combining `take` with a joined one-to-many relation means the database returns more rows than orders (one per item). TypeORM handles this by first selecting the 50 order ids, then loading them with their items — two queries. Check the log to confirm; for very large pages, loading items separately with `WHERE order_id IN (…)` gives the same two-query result explicitly.

</details>

### Exercise 3 — Review a TypeORM service

**Objective:** practise spotting TypeORM-specific problems.
**The scenario:** a service runs with `synchronize: true` in production; declares `@ManyToOne(() => Customer, { eager: true })` on orders and `@OneToMany(() => Order, …, { eager: true })` on customers; updates stock with `p.stock -= qty; await repo.save(p)`; inside `dataSource.transaction(async (manager) => …)` calls `this.orderRepo.save(order)`; and builds `where("o.status = '" + status + "'")`. List the problems and fixes.

<details>
<summary>Show the solution</summary>

1. **`synchronize: true` in production** → schema altered at start-up, possible column drops. Migrations only.
2. **Eager relations on both sides** → every order query loads its customer, and customer queries load all their orders: huge, unexpected queries. Remove `eager`; load relations explicitly.
3. **Read–modify–save stock** → lost updates under concurrency. `repo.decrement({ id, stock: MoreThanOrEqual(qty) }, "stock", qty)` and check `affected`, or a conditional query-builder update.
4. **Global repository inside the transaction** → that save runs outside the transaction. Use `manager.getRepository(Order).save(order)` or `manager.save(order)`.
5. **String-concatenated condition** → SQL injection. `where("o.status = :status", { status })`.

</details>

### Exercise 4 — Production scenario: vanishing edits

**Objective:** practise diagnosing ORM concurrency behaviour.
**The scenario:** support agents report that customer notes they saved "disappear" occasionally. The notes form loads the customer entity, the agent edits for a few minutes, and the server calls `customerRepo.save(customer)` with the submitted object. The entity has a `@VersionColumn`. Explain the cause and the fix.

<details>
<summary>Show the solution</summary>

**Cause:** two agents edited the same customer. The second `save` re-read the row, saw differences (including the stale `version`), and wrote **all** of the second agent's fields — overwriting the first agent's note and even resetting the version. `@VersionColumn` records changes but `save` never checks it.

**Fix:**
1. Send the loaded `version` to the client with the form (or as an `ETag`), and back on submit.
2. Update with a condition: `createQueryBuilder().update(Customer).set({ notes, version: () => "version + 1" }).where("id = :id AND version = :version", { id, version }).execute()`; if `affected === 0`, return `409 Conflict` with the latest data so the agent can merge.
3. Update only the fields the form changes (not the whole entity), reducing the chance of overwriting unrelated fields.
4. Consider storing notes as separate rows (a `customer_notes` table) — appending notes never conflicts at all ({{ch:database-design}}).

</details>

## Summary

**TypeORM** maps decorated TypeScript classes to tables. A **`DataSource`** configures the connection, entities and migrations; decorator metadata (`emitDecoratorMetadata` plus `reflect-metadata`) lets it infer column types. Entities use `@Column` options for types and names, `@PrimaryGeneratedColumn`, timestamp, soft-delete and version columns, and relations — `@ManyToOne` (the owning side with the foreign key, named with `@JoinColumn`), `@OneToMany`, `@OneToOne`, `@ManyToMany` with `@JoinTable` — with junction tables that carry data modelled as entities. Default foreign-key names are camelCase; use explicit names or a naming strategy, and remember that `numeric` values arrive as strings.

**Repositories** offer `find` with `where`, `relations`, `select`, `order` and operators, plus `insert`, `update`, `increment`, `delete` and `softDelete`; **`save`** loads the row first and writes differences. Load relations explicitly per query rather than with eager or lazy relations, which cause oversized queries and N+1 problems. The **query builder** composes complex SQL with named parameters; inspect it with `getQueryAndParameters()`, and use `getRawMany()` for aggregates.

Transactions run through `dataSource.transaction(async (manager) => …)`, with every operation using that manager; use atomic `increment`/`decrement` and conditional updates. **`@VersionColumn` does not prevent lost updates with `save`** — as the real run showed, a stale save overwrites and even resets the version — so implement optimistic locking with `WHERE version = :loaded` and check `affected`. Never use **`synchronize`** with real data; generate, review and run **migrations**. In NestJS, `TypeOrmModule.forRootAsync`, `forFeature` and `@InjectRepository` integrate repositories with dependency injection.

## Key terms

- **TypeORM** — An ORM mapping decorated TypeScript classes to tables, with repositories, a query builder and migrations.
- **DataSource** — TypeORM's configured database connection and entry point.
- **Entity (TypeORM)** — A class decorated with `@Entity()` representing a table.
- **reflect-metadata** — A library enabling runtime access to decorator metadata, required by TypeORM.
- **emitDecoratorMetadata** — A TypeScript compiler option that emits type metadata for decorated members.
- **@Column** — The decorator mapping a property to a column, with options for type, name and constraints.
- **@ManyToOne / @OneToMany** — Decorators for the two sides of a one-to-many relationship.
- **Owning side** — The side of a relation that holds the foreign-key column.
- **@JoinColumn** — A decorator controlling the foreign-key column of the owning side.
- **@ManyToMany / @JoinTable** — Decorators for a many-to-many relation and its generated join table.
- **Naming strategy** — A configuration that generates table and column names, such as snake case.
- **Repository (TypeORM)** — The per-entity API for finding, saving and deleting.
- **EntityManager** — TypeORM's API for working with any entity, bound to a transaction inside `transaction()`.
- **save** — A repository method that inserts or, after loading the current row, updates changed columns.
- **Eager relation** — A relation loaded automatically with every find.
- **Lazy relation** — A relation loaded on first access, returning a promise.
- **QueryBuilder** — TypeORM's fluent API for composing SQL queries.
- **Named parameter** — A placeholder such as `:email` in a TypeORM query, bound to a value safely.
- **getRawMany / getMany** — Query builder methods returning plain rows or entity instances.
- **@VersionColumn** — A column TypeORM increments on save, which `save` does not use to detect conflicts.
- **@DeleteDateColumn / softDelete** — Soft-delete support: a timestamp column set instead of deleting rows.
- **synchronize** — A TypeORM option that alters the schema to match entities automatically, unsafe with real data.
- **TypeORM migration** — A class with `up` and `down` methods applying and reverting schema changes.
- **@nestjs/typeorm** — The NestJS module integrating TypeORM with dependency injection.

## What comes next

Relational databases are not the only option. The next chapter, {{ch:mongodb}}, introduces a document database: storing data as flexible JSON-like documents, modelling with embedding versus referencing, querying and aggregation pipelines, indexes, transactions, and how to decide between MongoDB and PostgreSQL for a given problem.
