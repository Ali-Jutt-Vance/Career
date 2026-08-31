# Phase 3 — Chapter 14: TypeORM Deep Dive

---

## Chapter Overview

TypeORM is a mature, feature-rich ORM supporting both Active Record and Data Mapper patterns, with first-class TypeScript support. It's widely used in NestJS applications and enterprise backends.

---

## Core Concepts

### Entity Definition

```typescript
// npm install typeorm reflect-metadata pg

import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany,
  CreateDateColumn, UpdateDateColumn, DeleteDateColumn,
  Index, Check, BeforeInsert, BeforeUpdate
} from "typeorm";
import * as bcrypt from "bcrypt";

@Entity("users")
@Index(["role", "createdAt"])
export class User {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ unique: true, length: 255 })
  @Index()
  email: string;

  @Column({ length: 200 })
  name: string;

  @Column({ select: false })  // never returned in queries by default
  passwordHash: string;

  @Column({ type: "enum", enum: ["user", "admin", "moderator"], default: "user" })
  role: "user" | "admin" | "moderator";

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: "jsonb", nullable: true })
  metadata: Record<string, unknown>;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: Date;

  @DeleteDateColumn({ type: "timestamptz", nullable: true })
  deletedAt: Date;

  @OneToMany(() => Order, (order) => order.user)
  orders: Order[];

  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword() {
    if (this.passwordHash && !this.passwordHash.startsWith("$2b$")) {
      this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
    }
  }
}

@Entity("orders")
@Check(`"total" >= 0`)
export class Order {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid" })
  @Index()
  userId: string;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  total: number;

  @Column({
    type: "enum",
    enum: ["pending","processing","shipped","delivered","cancelled"],
    default: "pending"
  })
  status: string;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  @ManyToOne(() => User, (user) => user.orders, { onDelete: "CASCADE" })
  user: User;

  @OneToMany(() => OrderItem, (item) => item.order, { cascade: true })
  items: OrderItem[];
}
```

### DataSource Configuration

```typescript
// data-source.ts
import { DataSource } from "typeorm";

export const AppDataSource = new DataSource({
  type:           "postgres",
  host:           process.env.DB_HOST,
  port:           parseInt(process.env.DB_PORT || "5432"),
  username:       process.env.DB_USER,
  password:       process.env.DB_PASSWORD,
  database:       process.env.DB_NAME,
  entities:       [User, Order, OrderItem, Product],
  migrations:     ["src/migrations/*.ts"],
  synchronize:    false,  // NEVER true in production!
  logging:        process.env.NODE_ENV !== "production",
  ssl:            process.env.NODE_ENV === "production" ? { rejectUnauthorized: true } : false,

  // Connection pool
  extra: {
    max:                  20,
    idleTimeoutMillis:    30_000,
    connectionTimeoutMillis: 2_000
  }
});

await AppDataSource.initialize();
```

---

## Basic Examples

### Repository CRUD

```typescript
const userRepo = AppDataSource.getRepository(User);

// Create
const user = userRepo.create({
  email: "alice@example.com",
  name:  "Alice Smith",
  passwordHash: "plaintext"  // BeforeInsert will hash it
});
await userRepo.save(user);

// Find
const found = await userRepo.findOne({
  where:     { email: "alice@example.com" },
  relations: { orders: true }
});

// Find many with pagination
const [users, total] = await userRepo.findAndCount({
  where:  { isActive: true, role: "admin" },
  order:  { createdAt: "DESC" },
  skip:   (page - 1) * limit,
  take:   limit
});

// Update (partial update)
await userRepo.update({ id: userId }, { name: "Alice Johnson" });

// Soft delete (uses deletedAt column)
await userRepo.softDelete({ id: userId });

// Restore
await userRepo.restore({ id: userId });

// Hard delete
await userRepo.delete({ id: userId });

// Upsert
await userRepo.upsert(
  { email: "alice@example.com", name: "Alice" },
  ["email"]  // conflict column
);
```

### Query Builder

```typescript
const orderRepo = AppDataSource.getRepository(Order);

// Complex JOIN + aggregation
const topCustomers = await userRepo
  .createQueryBuilder("user")
  .select([
    "user.id",
    "user.name",
    "user.email"
  ])
  .addSelect("COUNT(order.id)", "orderCount")
  .addSelect("SUM(order.total)", "lifetimeValue")
  .innerJoin("user.orders", "order")
  .where("user.isActive = :isActive", { isActive: true })
  .andWhere("order.status = :status", { status: "delivered" })
  .groupBy("user.id")
  .having("SUM(order.total) > :min", { min: 1000 })
  .orderBy("SUM(order.total)", "DESC")
  .limit(10)
  .getRawMany<{ user_id: string; user_name: string; orderCount: string; lifetimeValue: string }>();

// Subquery
const ordersWithProducts = await orderRepo
  .createQueryBuilder("order")
  .where((qb) => {
    const subQuery = qb.subQuery()
      .select("oi.orderId")
      .from(OrderItem, "oi")
      .where("oi.productId = :productId")
      .getQuery();
    return `order.id IN ${subQuery}`;
  })
  .setParameter("productId", productId)
  .getMany();

// Raw SQL via query runner
const result = await AppDataSource.query(
  "SELECT * FROM users WHERE email ILIKE $1",
  [`%${search}%`]
);
```

---

## Intermediate Concepts

### Transactions

```typescript
// Simple transaction
await AppDataSource.transaction(async (manager) => {
  const orderRepo   = manager.getRepository(Order);
  const productRepo = manager.getRepository(Product);

  const order = await orderRepo.save({ userId, total });

  for (const item of cartItems) {
    const { affected } = await productRepo.update(
      { id: item.productId, stock: MoreThanOrEqual(item.quantity) },
      { stock: () => `stock - ${item.quantity}` }
    );
    if (!affected) throw new Error(`Product ${item.productId} out of stock`);

    await manager.save(OrderItem, {
      orderId:    order.id,
      productId:  item.productId,
      quantity:   item.quantity,
      unitPrice:  item.price
    });
  }

  return order;
});

// Transaction with isolation level
await AppDataSource.transaction("SERIALIZABLE", async (manager) => {
  // Runs within a SERIALIZABLE transaction
});
```

### Custom Repository

```typescript
// Custom repository with domain-specific methods
@Injectable()
export class UserRepository extends Repository<User> {
  constructor(
    @InjectDataSource() private dataSource: DataSource
  ) {
    super(User, dataSource.createEntityManager());
  }

  async findByEmailWithOrders(email: string): Promise<User | null> {
    return this.createQueryBuilder("user")
      .leftJoinAndSelect("user.orders", "order", "order.status != :s", { s: "cancelled" })
      .where("user.email = :email", { email })
      .andWhere("user.deletedAt IS NULL")
      .getOne();
  }

  async getTopCustomers(limit: number): Promise<User[]> {
    return this.createQueryBuilder("user")
      .innerJoin("user.orders", "order")
      .where("order.status = :status", { status: "delivered" })
      .groupBy("user.id")
      .orderBy("SUM(order.total)", "DESC")
      .limit(limit)
      .getMany();
  }

  async findActiveByRole(role: string): Promise<User[]> {
    return this.find({ where: { role: role as any, isActive: true, deletedAt: IsNull() } });
  }
}
```

### Migrations

```bash
# Generate migration from entity changes
npx typeorm migration:generate -d src/data-source.ts src/migrations/AddUserStatus

# Run pending migrations
npx typeorm migration:run -d src/data-source.ts

# Revert last migration
npx typeorm migration:revert -d src/data-source.ts

# Show migration status
npx typeorm migration:show -d src/data-source.ts
```

```typescript
// Manual migration file
import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserStatus1700000000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE user_status AS ENUM ('active', 'suspended', 'deleted');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS status user_status NOT NULL DEFAULT 'active'
    `);

    await queryRunner.query(
      "CREATE INDEX CONCURRENTLY idx_users_status ON users(status)"
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP INDEX CONCURRENTLY IF EXISTS idx_users_status");
    await queryRunner.query("ALTER TABLE users DROP COLUMN IF EXISTS status");
    await queryRunner.query("DROP TYPE IF EXISTS user_status");
  }
}
```

---

## Interview Preparation

**Q1: What is the difference between Active Record and Data Mapper in TypeORM?**
A: Active Record: entity classes extend `BaseEntity` and have static methods like `User.find()`, `User.save()`. The entity IS the repository — convenient but tightly couples domain model to persistence. Data Mapper: entities are plain classes; a separate `Repository<User>` handles all persistence operations. Domain logic in entities, persistence logic in repositories — better for complex domains (DDD) and testability (mock the repository, not the entity class).

**Q2: When would you use QueryBuilder instead of find options?**
A: `find()` with options is adequate for simple queries: filter by columns, join relations, sort, paginate. QueryBuilder is needed for: complex aggregations (SUM, COUNT with GROUP BY), dynamic column selection with aliases, subqueries, HAVING clauses, raw SQL expressions (`() => "stock - 1"`), and fine-grained control over generated SQL. QueryBuilder allows calling `.getSql()` to inspect generated SQL, which is useful for debugging performance.

**Q3: How do you handle soft deletes in TypeORM?**
A: Add `@DeleteDateColumn()` to your entity — TypeORM automatically sets it on `softDelete()` and excludes soft-deleted records from all `find()` queries automatically. To include deleted records, add `withDeleted: true` to find options or call `.withDeleted()` on a QueryBuilder. To restore, call `repository.restore({ id })`. Note: QueryBuilder doesn't automatically apply soft-delete filters — you must manually add `.andWhere("user.deletedAt IS NULL")`.

---

## Practical Tasks

### Beginner (10 Tasks)
1. Set up TypeORM DataSource with PostgreSQL.
2. Create `User`, `Order`, `Product` entities with proper decorators.
3. Use `save()` to create and update entities.
4. Use `findOne()` with relations.
5. Use `findAndCount()` for pagination.
6. Use `softDelete()` and verify deleted records are excluded.
7. Use `update()` for partial updates without loading the entity.
8. Run `migration:generate` and inspect the SQL.
9. Add a `@Check` constraint to an entity.
10. Use `@BeforeInsert` hook for password hashing.

### Intermediate (10 Tasks)
1. Write a QueryBuilder with JOIN, WHERE, GROUP BY, HAVING, ORDER BY.
2. Implement a custom repository with domain-specific methods.
3. Wrap a multi-entity write in `AppDataSource.transaction()`.
4. Use `upsert()` for idempotent writes.
5. Write a migration with CONCURRENTLY index creation.
6. Implement optimistic locking with `@VersionColumn`.
7. Use `withDeleted: true` to include soft-deleted records.
8. Add a subquery in WHERE clause via QueryBuilder.
9. Use `LEFT JOIN` in QueryBuilder to fetch optional relations.
10. Profile generated SQL with TypeORM query logging.

### Advanced (10 Tasks)
1. Implement a generic base repository with TypeScript generics.
2. Integrate TypeORM in NestJS with multiple modules.
3. Implement subscriber (`EntitySubscriberInterface`) for audit logging.
4. Use `QueryRunner` for fine-grained transaction control.
5. Implement row-level security via query scoping in a custom repository.
6. Build a multi-tenant repository that injects tenant filter.
7. Implement event sourcing with TypeORM entities as event store.
8. Profile TypeORM vs. raw SQL for a complex reporting query.
9. Implement schema-per-tenant with TypeORM and dynamic DataSource.
10. Write a migration for a zero-downtime column rename.

---

## Self Assessment
1. What is TypeORM and what pattern does it support?
2. What is `@Entity`, `@Column`, `@PrimaryGeneratedColumn`?
3. What is `@DeleteDateColumn`?
4. What is the difference between `save()` and `update()`?
5. When would you use QueryBuilder over `find()` options?
6. What does `synchronize: false` do?
7. What is a custom repository?
8. What is `@BeforeInsert`?
9. What is `@VersionColumn` used for?
10. What does `findAndCount()` return?

---

## Cheat Sheet

```typescript
// DataSource
const ds = new DataSource({ type: "postgres", entities: [...], migrations: [...], synchronize: false });
await ds.initialize();

// Repository
const repo = ds.getRepository(User);
const user = repo.create({ email, name });
await repo.save(user);
await repo.findOne({ where: { id }, relations: { orders: true } });
const [rows, total] = await repo.findAndCount({ where: {...}, skip, take, order: { createdAt: "DESC" } });
await repo.update({ id }, { name });
await repo.softDelete({ id });
await repo.restore({ id });
await repo.upsert({ email, name }, ["email"]);

// QueryBuilder
repo.createQueryBuilder("u")
  .leftJoinAndSelect("u.orders", "o")
  .where("u.isActive = :a", { a: true })
  .andWhere("o.status = :s", { s: "delivered" })
  .groupBy("u.id")
  .having("COUNT(o.id) > :n", { n: 5 })
  .orderBy("COUNT(o.id)", "DESC")
  .limit(10)
  .getMany();

// Transaction
await ds.transaction(async (mgr) => {
  await mgr.save(User, userData);
  await mgr.update(Product, { id }, { stock: () => "stock - 1" });
});

// TypeORM operators
import { IsNull, MoreThan, LessThan, Like, In, Between, Not } from "typeorm";
await repo.find({ where: { deletedAt: IsNull(), stock: MoreThan(0) } });
```
