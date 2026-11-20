# NestJS I: Structure, Modules and Dependency Injection

> [!GOALS]
> - Explain what NestJS is, how it relates to Express, and why teams choose it.
> - Understand **dependency injection**: what a container does, and why "you stop calling `new`" changes how code is written and tested.
> - Build a feature with a **module**, a **controller**, a **service** and a **repository behind an interface**.
> - Use the different **provider** types (`useClass`, `useValue`, `useFactory`, `useExisting`) and injection tokens.
> - Read Nest's most common error — "can't resolve dependencies" — and fix it confidently.
> - Configure an application safely, use lifecycle hooks, and understand provider **scopes** and **dynamic modules**.
> - Test services with Nest's testing module and fakes.

## Why this matters

In {{ch:express}} you built servers with Express, which gives you routing and middleware and nothing else. That freedom is pleasant for small projects. For large ones, every team invents its own structure: where business logic lives, how database access is organised, how objects get their dependencies, how tests replace real services. Ten Express codebases have ten structures, and a developer joining any of them spends days finding where things are.

**NestJS** gives one structure. It is a TypeScript framework for Node.js — running on top of Express (or Fastify) — that organises an application into **modules**, separates HTTP handling (**controllers**) from business logic (**services** and other **providers**), and builds and connects all those objects for you through **dependency injection**. It also provides a named, ordered **request pipeline** (guards, pipes, interceptors, filters), which is the subject of {{ch:nestjs-advanced}}.

NestJS is one of the most requested Node.js frameworks in job descriptions, especially for companies building larger back ends. More importantly, it rewards exactly the fundamentals from earlier in this book — classes, interfaces and the dependency inversion principle ({{ch:object-oriented-programming}}, {{ch:solid-principles}}). If those are solid, Nest feels obvious. If they are not, it feels like magic, and magic is hard to debug. This chapter shows what Nest does underneath, so that it never feels like magic.

## The simple idea

Imagine assembling furniture. In one approach, every piece makes its own parts: the table builds its own legs, the legs cut their own screws. In another, there is a workshop: each piece just says what it needs ("I need four legs and eight screws"), and the workshop makes the parts once, then hands them over.

NestJS is the workshop. Your classes declare what they need in their constructors. Nest's **container** reads those declarations when the application starts, creates every object in the right order, gives each one its dependencies, and keeps them for reuse. Modules are the workshop's departments: each owns certain parts and decides which ones other departments may use.

> [!ANALOGY]
> NestJS is like a furniture workshop: instead of every piece making its own parts, each piece lists what it needs, and the workshop builds the parts once and hands them over. Modules are departments that own their parts and choose which to share.
>
> **Where the analogy breaks:** a workshop understands requests in plain language. Nest understands only **tokens** — a class, or a unique value you create — and TypeScript **interfaces** do not exist at runtime at all. So when a class needs "an `OrderRepository`" interface, you must tell Nest exactly which token stands for it. Most beginner confusion in Nest comes from this gap.

## The proper definition and key words

**NestJS** is a framework for building server-side Node.js applications in TypeScript, providing an architecture of modules, controllers and providers connected by a dependency-injection container, on top of an HTTP library such as Express or Fastify.

Key words:

- **Dependency injection (DI)** — giving an object the things it depends on from outside (usually through its constructor), instead of the object creating them itself.
- **Inversion of control (IoC) container** — the part of a framework that creates objects and injects their dependencies.
- **Provider** — anything Nest can create and inject: services, repositories, factories, values. Marked with `@Injectable()` when it is a class.
- **Injection token** — the key a provider is registered and looked up under: a class, a string, or (best) a `Symbol`.
- **Module** — a class decorated with `@Module()` that groups related controllers and providers and declares what it **imports** and **exports**.
- **Controller** — a class whose methods handle HTTP routes, decorated with `@Controller()`, `@Get()`, `@Post()` and so on.
- **Service** — a provider containing business logic.
- **Repository** — a provider responsible for storing and loading data.
- **Decorator** — a function applied with `@` to a class, method, property or parameter, attaching behaviour or metadata ({{ch:typescript-advanced}}).
- **Scope** — how long a provider instance lives: one for the whole application (default), one per request, or one per injection.
- **Dynamic module** — a module configured by its user, through static methods such as `forRoot()`.

## Dependency injection

### Level 1 — You stop calling `new`

Without dependency injection, each class constructs what it needs:

```ts
// fragment
class OrdersService {
  private repo = new PostgresOrderRepository(databasePool);   // builds its own repository
  private mailer = new SmtpMailer(config.smtp);              // and its own mailer
}
```

Three problems follow:

- **Testing** requires replacing `PostgresOrderRepository` somehow — usually by mocking modules, which is fragile.
- `OrdersService` **knows about details** (Postgres, SMTP) instead of depending on behaviour ("something that can save orders").
- Two services each calling `new SmtpMailer(...)` create **two mailers**, each with its own connection pool.

With dependency injection, the class declares what it needs and receives it:

```ts
// fragment
@Injectable()
export class OrdersService {
  constructor(
    @Inject(ORDER_REPOSITORY) private readonly repo: OrderRepository,   // an interface
    private readonly mailer: MailerService,
  ) {}
}
```

`OrdersService` depends on an **interface**, and something else decides which implementation it gets — Postgres in production, an in-memory fake in tests. That "something else" is the container.

### Level 2 — What a container does

A container is less mysterious than it sounds. Here is a tiny one, to see what Nest automates:

```ts
// A tiny dependency-injection container, to see what Nest automates
type Token<T> = { name: string; _type?: T };
type Provider<T> = { deps: Token<any>[]; create: (...deps: any[]) => T };

class Container {
  private providers = new Map<Token<any>, Provider<any>>();
  private instances = new Map<Token<any>, unknown>();

  register<T>(token: Token<T>, provider: Provider<T>) { this.providers.set(token, provider); }

  get<T>(token: Token<T>, path: string[] = []): T {
    if (this.instances.has(token)) return this.instances.get(token) as T;   // singletons
    if (path.includes(token.name)) throw new Error(`circular dependency: ${[...path, token.name].join(" → ")}`);
    const provider = this.providers.get(token);
    if (!provider) throw new Error(`no provider for ${token.name} (needed by ${path.at(-1) ?? "root"})`);
    const deps = provider.deps.map((d) => this.get(d, [...path, token.name]));  // build dependencies first
    const instance = provider.create(...deps);
    this.instances.set(token, instance);
    return instance;
  }
}

interface OrderRepository { findAll(): string[] }
class OrdersService {
  constructor(private readonly repo: OrderRepository) {}
  list() { return this.repo.findAll().map((id) => `order ${id}`); }
}

const ORDER_REPOSITORY: Token<OrderRepository> = { name: "ORDER_REPOSITORY" };
const ORDERS_SERVICE: Token<OrdersService> = { name: "OrdersService" };

const app = new Container();
app.register(ORDER_REPOSITORY, { deps: [], create: () => ({ findAll: () => ["1042", "1043"] }) });
app.register(ORDERS_SERVICE, { deps: [ORDER_REPOSITORY], create: (repo) => new OrdersService(repo) });

console.log(app.get(ORDERS_SERVICE).list());
console.log("same instance:", app.get(ORDERS_SERVICE) === app.get(ORDERS_SERVICE));

const A: Token<unknown> = { name: "A" }, B: Token<unknown> = { name: "B" };
const broken = new Container();
broken.register(A, { deps: [B], create: () => ({}) });
broken.register(B, { deps: [A], create: () => ({}) });
try { broken.get(A); } catch (err) { console.log((err as Error).message); }
try { new Container().get(ORDERS_SERVICE); } catch (err) { console.log((err as Error).message); }
```

**Output:**

```text
[ 'order 1042', 'order 1043' ]
same instance: true
circular dependency: A → B → A
no provider for OrdersService (needed by root)
```

The container does four things, and Nest does the same four at a larger scale:

1. **Looks up providers by token.** Here a token is an object; in Nest it is a class, string or `Symbol`.
2. **Builds dependencies first, recursively**, then the object that needs them.
3. **Keeps one instance** (a singleton) and returns it every time.
4. **Detects problems**: a missing provider, or a **circular dependency** (A needs B, B needs A), which has no valid build order.

The difference is that our container needs every dependency listed by hand (`deps: [ORDER_REPOSITORY]`). Nest **reads constructor parameter types automatically**, as the next section explains.

### Level 3 — How Nest knows what to inject

When TypeScript's `emitDecoratorMetadata` option is on (it is in every Nest project), the compiler stores the **types of a decorated class's constructor parameters** as hidden metadata (`design:paramtypes`). At start-up, Nest reads that list to know what to inject. Two consequences explain most Nest puzzles:

- **`@Injectable()` is required** even on a class with no options. Without a decorator, TypeScript emits no metadata, and Nest cannot see the constructor's parameters.
- **Interfaces cannot be injected by type.** Interfaces are erased during compilation; the metadata records `Object`, which identifies nothing. So an interface dependency needs an explicit **token**: `@Inject(ORDER_REPOSITORY)`. A `Symbol` makes the best token, because it cannot collide with another module's token by accident.

What `NestFactory.create(AppModule)` does at start-up, in order:

1. Reads `AppModule`'s `@Module()` metadata and walks its `imports` recursively, building a graph of all modules.
2. Collects each module's providers and controllers.
3. Reads every provider's constructor parameter types (or explicit tokens).
4. Creates instances in dependency order — or throws if a dependency is missing or circular.
5. Calls lifecycle hooks such as `onModuleInit`.
6. Reads controllers' route decorators and registers the routes with Express (or Fastify).

## Building a feature

### Level 2 — Project structure

Create a project with the Nest command-line tool, then generate pieces:

```bash
npm i -g @nestjs/cli
nest new cornershop-api
cd cornershop-api
nest g module orders
nest g controller orders
nest g service orders
```

Real Nest codebases are organised **by feature**, not by layer:

```text
src/
  main.ts                    bootstrap: create the app, global settings, listen
  app.module.ts              the root module: imports feature modules
  config/                    configuration loading and validation
  common/                    shared guards, interceptors, filters, decorators
  orders/
    orders.module.ts
    orders.controller.ts     HTTP ↔ service
    orders.service.ts        business rules
    order.repository.ts      interface + token
    postgres-order.repository.ts
    dto/                     request and response shapes
  customers/
    ...
```

A change to orders touches one folder. Each module exposes a small, deliberate surface to the rest of the application.

### Level 2 — Controller, service, repository, module

Here is a complete feature — a repository behind an interface, a service, a controller and modules — started as a real Nest application and called over HTTP:

```ts
import "reflect-metadata";
import { Body, Controller, Get, Inject, Injectable, Module, NotFoundException, Param, Post } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { AddressInfo } from "node:net";

// ── The contract and one implementation ───────────────────────────────
type Order = { id: string; customerId: string; total: number };

export const ORDER_REPOSITORY = Symbol("ORDER_REPOSITORY");
export interface OrderRepository {
  findById(id: string): Promise<Order | null>;
  save(order: Order): Promise<Order>;
}

@Injectable()
class InMemoryOrderRepository implements OrderRepository {
  private orders = new Map<string, Order>([["1042", { id: "1042", customerId: "c1", total: 59.9 }]]);
  async findById(id: string) { return this.orders.get(id) ?? null; }
  async save(order: Order) { this.orders.set(order.id, order); return order; }
}

// ── The service decides; it only knows the interface ──────────────────
@Injectable()
class OrdersService {
  private nextId = 1043;
  constructor(@Inject(ORDER_REPOSITORY) private readonly repo: OrderRepository) {}

  async findOne(id: string): Promise<Order> {
    const order = await this.repo.findById(id);
    if (!order) throw new NotFoundException(`Order ${id} not found`);
    return order;
  }

  async create(input: { customerId: string; total: number }): Promise<Order> {
    return this.repo.save({ id: String(this.nextId++), ...input });
  }
}

// ── The controller translates HTTP to service calls ───────────────────
@Controller("orders")
class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.orders.findOne(id);
  }

  @Post()
  create(@Body() body: { customerId: string; total: number }) {
    return this.orders.create(body);
  }
}

// ── The module wires it together ──────────────────────────────────────
@Module({
  controllers: [OrdersController],
  providers: [OrdersService, { provide: ORDER_REPOSITORY, useClass: InMemoryOrderRepository }],
})
class OrdersModule {}

@Module({ imports: [OrdersModule] })
class AppModule {}

const app = await NestFactory.create(AppModule, { logger: false });
await app.listen(0);
const base = `http://localhost:${(app.getHttpServer().address() as AddressInfo).port}`;

for (const [method, path, body] of [
  ["GET", "/orders/1042"],
  ["POST", "/orders", { customerId: "c2", total: 12.5 }],
  ["GET", "/orders/1043"],
  ["GET", "/orders/9999"],
] as const) {
  const res = await fetch(base + path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  console.log(method, path, "→", res.status, await res.text());
}
await app.close();
```

**Output:**

```text
GET /orders/1042 → 200 {"id":"1042","customerId":"c1","total":59.9}
POST /orders → 201 {"id":"1043","customerId":"c2","total":12.5}
GET /orders/1043 → 200 {"id":"1043","customerId":"c2","total":12.5}
GET /orders/9999 → 404 {"message":"Order 9999 not found","error":"Not Found","statusCode":404}
```

Walk through it:

- **`@Controller("orders")`** prefixes the class's routes with `/orders`. **`@Get(":id")`** and **`@Post()`** register routes; **`@Param("id")`** and **`@Body()`** extract values from the request.
- **Returning a value is enough.** No `res.json()`: Nest serialises the returned object (or the resolved value of a returned promise) as JSON, with `200` for GET and `201` for POST by default.
- **`constructor(private readonly orders: OrdersService)`** both declares the dependency and stores it as `this.orders` (a TypeScript **parameter property**). Nest sees the `OrdersService` type and injects the instance.
- **`@Inject(ORDER_REPOSITORY)`** is needed because `OrderRepository` is an interface; the module binds that token to `InMemoryOrderRepository` with **`useClass`**. Swapping to a Postgres repository later changes one line in the module and nothing in the service.
- **`NotFoundException`** is one of Nest's built-in HTTP exceptions; Nest turns it into a `404` with a standard body. In {{ch:nestjs-advanced}} you will keep HTTP concerns out of services entirely by throwing domain errors and translating them in one place.
- The example keeps everything in one file and starts the server on a random port (`listen(0)`) so it can run anywhere; a real project splits these classes into the files shown earlier, with `main.ts` calling `app.listen(3000)`. The body is typed inline for brevity; {{ch:nestjs-advanced}} adds validated DTO classes.

**The rule for controllers: they translate, they do not decide.** Read the request, call a service, return the result. A business rule in a controller cannot be reused by a queue worker or tested without HTTP.

### Level 2 — Modules: imports, exports and privacy

```ts
// fragment
@Module({
  imports:     [DatabaseModule, MailerModule],     // modules whose EXPORTS this module may use
  controllers: [OrdersController],                 // routes to register
  providers:   [OrdersService, { provide: ORDER_REPOSITORY, useClass: PostgresOrderRepository }],
  exports:     [OrdersService],                    // what other modules may inject after importing this one
})
export class OrdersModule {}
```

- **Providers are private by default.** Another module cannot inject `PostgresOrderRepository` — only what `OrdersModule` **exports** (`OrdersService`).
- **Importing a module** gives access to its exports only.
- **Importing the same module in several places does not create several instances**; providers are shared singletons across the application.

This privacy is what keeps large applications manageable: `OrdersModule` could replace its repository completely without any other module noticing.

### Level 2 — The error you will see most

Forget an `exports` entry, and Nest refuses to start:

```ts
import "reflect-metadata";
import { Injectable, Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";

@Injectable()
class MailerService { send(to: string) { return `mail to ${to}`; } }

@Module({ providers: [MailerService] })        // ← forgot: exports: [MailerService]
class MailerModule {}

@Injectable()
class OrdersService { constructor(private readonly mailer: MailerService) {} }

@Module({ imports: [MailerModule], providers: [OrdersService] })
class OrdersModule {}

try {
  await NestFactory.create(OrdersModule, { logger: false, abortOnError: false });
} catch (err) {
  console.log((err as Error).message.split("\n")[0]);
}
```

**Output:**

```text
Nest can't resolve dependencies of the OrdersService (?). Please make sure that the argument MailerService at index [0] is available in the OrdersModule module.
```

Read it precisely: the `?` marks the constructor parameter that failed — position `[0]`, `MailerService`. The fix is always one of these:

1. The provider is not listed in any module's `providers`.
2. It belongs to another module that does not **export** it (this case), or that module is not **imported**.
3. It is an interface or other non-class type and needs `@Inject(TOKEN)`.
4. The class lacks `@Injectable()`, so no metadata was emitted.

(`abortOnError: false` makes Nest throw the error instead of exiting the process, so the example can print it.)

### Level 3 — Provider types

```ts
// fragment
@Module({
  providers: [
    OrdersService,                                                  // 1. a class — shorthand for { provide: OrdersService, useClass: OrdersService }

    { provide: ORDER_REPOSITORY, useClass: PostgresOrderRepository }, // 2. bind an implementation to a token

    { provide: CLOCK, useValue: { now: () => new Date() } },        // 3. a ready-made value (common in tests)

    {                                                               // 4. a factory: decisions or async set-up
      provide: PAYMENT_GATEWAY,
      useFactory: (config: ConfigService) =>
        config.get("PAYMENTS_MODE") === "live"
          ? new StripeGateway(config.getOrThrow("STRIPE_KEY"))
          : new FakePaymentGateway(),
      inject: [ConfigService],
    },

    { provide: "LegacyOrders", useExisting: OrdersService },        // 5. an alias for an existing provider
  ],
})
export class OrdersModule {}
```

- **`useClass`** — the usual way to bind an interface token to an implementation.
- **`useValue`** — a constant or a fake object; perfect for configuration objects and tests.
- **`useFactory`** — runs a function, with its own dependencies listed in `inject`, to build the provider. It may be `async`: Nest waits for it before creating anything that depends on it — which is how database connections are opened at start-up.
- **`useExisting`** — another token for the same instance.

Injecting a **clock** (`CLOCK`) instead of calling `new Date()` directly is a small example of why DI matters: tests can freeze time.

## Configuration and lifecycle

### Level 3 — Bootstrap

```ts
// fragment
// main.ts
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();              // run onModuleDestroy / onApplicationShutdown on SIGTERM
  app.setGlobalPrefix("api");             // routes become /api/orders/...
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
```

Global validation, exception filters, security headers and CORS are configured here too; {{ch:nestjs-advanced}} covers them.

### Level 3 — Configuration that fails loudly

`@nestjs/config` loads environment variables and makes them injectable through `ConfigService`. Validate them **at start-up**, so a missing secret stops the deployment instead of failing on the first request hours later ({{ch:nodejs}}):

```ts
// fragment
import { ConfigModule } from "@nestjs/config";
import { z } from "zod";

const Env = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]),
  DATABASE_URL: z.url(),
  JWT_SECRET: z.string().min(32),
  PORT: z.coerce.number().default(3000),
});

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, validate: (raw) => Env.parse(raw) })],
})
export class AppModule {}
```

Inject `ConfigService` where configuration is needed, and never hard-code secrets ({{ch:secrets-manager}}).

### Level 3 — Lifecycle hooks

Providers can run code at start-up and shutdown:

```ts
// fragment
@Injectable()
export class EmailWorker implements OnModuleInit, OnApplicationShutdown {
  private worker?: Worker;
  async onModuleInit() { this.worker = startEmailWorker(); }          // after the container is built
  async onApplicationShutdown(signal?: string) { await this.worker?.close(); }   // on SIGTERM, if shutdown hooks are enabled
}
```

Shutdown hooks run only when `app.enableShutdownHooks()` was called. Without them, a deployment kills the process with requests and jobs in flight ({{ch:queues}}).

## Scopes, dynamic modules and cycles

### Level 4 — Provider scope, and the trap

```ts
// fragment
@Injectable()                                  // DEFAULT: one instance for the whole application
@Injectable({ scope: Scope.REQUEST })          // a new instance for each request
@Injectable({ scope: Scope.TRANSIENT })        // a new instance for each class that injects it
```

The default singleton is right almost always: services should be **stateless**, holding no per-request data in fields.

**Request scope is contagious.** If a request-scoped provider is injected into a singleton, the singleton must also become request-scoped — otherwise it would keep the first request's instance for ever. Nest promotes the whole chain automatically, so one request-scoped provider deep in the graph can make a large part of the application be rebuilt on **every request**, a real performance cost. For per-request data such as a correlation id or the current user, prefer passing values explicitly or using **`AsyncLocalStorage`** ({{ch:logging}}).

### Level 4 — Dynamic modules: `forRoot` and `forFeature`

Reusable modules often need configuration from the application using them. They provide static methods that return a **dynamic module**:

```ts
// fragment
@Module({})
export class StorageModule {
  static forRoot(options: { driver: "s3" | "local"; bucket?: string }): DynamicModule {
    return {
      module: StorageModule,
      global: true,
      providers: [
        { provide: STORAGE_OPTIONS, useValue: options },
        { provide: STORAGE, useClass: options.driver === "s3" ? S3Storage : LocalStorage },
      ],
      exports: [STORAGE],
    };
  }
}

// app.module.ts
@Module({ imports: [StorageModule.forRoot({ driver: "s3", bucket: "cornershop-uploads" })] })
export class AppModule {}
```

The conventions: **`forRoot()`** configures something once for the whole application (a database connection, global options); **`forFeature()`** registers parts for one feature module (for example, the database entities that module uses); **`forRootAsync()`** takes a factory so the configuration can come from `ConfigService`. The official Nest packages for databases, queues, caching and configuration all follow this pattern.

### Level 4 — Circular dependencies

If `OrdersService` needs `InvoicesService` and `InvoicesService` needs `OrdersService`, there is no valid creation order. Nest reports the cycle; `forwardRef(() => OrdersService)` resolves it mechanically. Treat `forwardRef` as a warning sign, though: a cycle between two services usually means a **third concept** neither owns — perhaps a `BillingService`, or a domain event that one publishes and the other handles ({{ch:event-driven-systems}}). Extract that first.

## Testing

### Level 3 — Unit tests with the testing module and fakes

Because services receive their dependencies, tests can give them **fakes** — small, real implementations of the interface — instead of mocking modules:

```ts
import "reflect-metadata";
import { Inject, Injectable } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { randomUUID } from "node:crypto";

type Order = { id: string; customerId: string; total: number };
const ORDER_REPOSITORY = Symbol("ORDER_REPOSITORY");
interface OrderRepository { findByCustomer(customerId: string): Promise<Order[]>; save(order: Order): Promise<Order> }

class CreditLimitExceeded extends Error {
  constructor(readonly customerId: string, readonly outstanding: number) {
    super(`Customer ${customerId} would exceed the credit limit (outstanding ${outstanding})`);
  }
}

@Injectable()
class OrdersService {
  static readonly CREDIT_LIMIT = 100;
  constructor(@Inject(ORDER_REPOSITORY) private readonly repo: OrderRepository) {}

  async create(customerId: string, total: number): Promise<Order> {
    const outstanding = (await this.repo.findByCustomer(customerId)).reduce((sum, o) => sum + o.total, 0);
    if (outstanding + total > OrdersService.CREDIT_LIMIT) throw new CreditLimitExceeded(customerId, outstanding);
    return this.repo.save({ id: randomUUID(), customerId, total });
  }
}

// A fake: a real, tiny implementation of the interface — not a mock
class FakeOrderRepository implements OrderRepository {
  orders: Order[] = [];
  async findByCustomer(customerId: string) { return this.orders.filter((o) => o.customerId === customerId); }
  async save(order: Order) { this.orders.push(order); return order; }
}

async function setup() {
  const fake = new FakeOrderRepository();
  const moduleRef = await Test.createTestingModule({
    providers: [OrdersService, { provide: ORDER_REPOSITORY, useValue: fake }],
  }).compile();
  return { service: moduleRef.get(OrdersService), fake };
}

{
  const { service, fake } = await setup();
  await service.create("c1", 60);
  console.log("test 1 — order saved:", fake.orders.length === 1 ? "PASS" : "FAIL");
}
{
  const { service, fake } = await setup();
  fake.orders.push({ id: "old", customerId: "c1", total: 80 });
  try {
    await service.create("c1", 30);
    console.log("test 2 — over the limit is rejected: FAIL");
  } catch (err) {
    console.log("test 2 — over the limit is rejected:", err instanceof CreditLimitExceeded ? "PASS" : "FAIL");
    console.log("  ", (err as Error).message);
  }
}
```

**Output:**

```text
test 1 — order saved: PASS
test 2 — over the limit is rejected: PASS
   Customer c1 would exceed the credit limit (outstanding 80)
```

- `Test.createTestingModule` builds a small container with exactly the providers the test needs; `useValue: fake` replaces the real repository.
- The tests check **outcomes** (an order was saved; the right error was thrown), not which methods were called — so they survive refactoring ({{ch:testing}}).
- The service throws a **domain error** (`CreditLimitExceeded`), not an HTTP exception, so it can be used behind HTTP, a queue worker or a command-line script alike.
- In a real project these would be Jest or Vitest test cases (`it("rejects orders over the credit limit", ...)`); the plain `console.log` keeps the example runnable on its own.

For **end-to-end tests**, build the whole `AppModule` with `Test.createTestingModule({ imports: [AppModule] })`, override external services (payments, email) with `overrideProvider(...)`, create the app, and apply the same global settings as `main.ts` — a testing module does not run `main.ts`, so global pipes and filters must be added again. Then send HTTP requests with a library such as Supertest.

## Nest compared with the alternatives

| Framework | Strengths | Trade-offs |
|---|---|---|
| **Express** | Tiny, universal, total freedom | No structure; DI, validation and testing patterns are yours to invent |
| **Fastify** | Fast, schema-based validation built in | Smaller ecosystem; Nest can run on Fastify |
| **NestJS** | Structure, DI, TypeScript first, strong testing story, many official integrations | Learning curve; more code for tiny services; feels magical without the fundamentals |
| **Hono / lightweight frameworks** | Very small, run on many runtimes (Node, edge, Bun) | Little built-in structure |
| **AdonisJS** | "Batteries included", Laravel-like | Smaller community and job market |

A reasonable position: Express or a lightweight framework for small services with one job; Nest when a team will build and maintain a larger back end for years, because the structure is already agreed. Nest on the Fastify adapter when throughput matters.

## From beginner to enterprise

**Level 1–2 — first Nest app.** CLI-generated project; one feature module with controller and service; routes returning values; built-in HTTP exceptions.

**Level 3 — well-structured apps.** Feature folders; repositories behind interfaces with `Symbol` tokens; provider types; validated configuration; lifecycle hooks with shutdown enabled; unit tests with fakes.

**Level 4 — production applications.** Dynamic modules for shared infrastructure; deliberate module exports; singletons by default and `AsyncLocalStorage` for request context; cycles removed by extracting concepts; end-to-end tests with overridden external services.

**Level 5 — professional practice.** A documented module graph (`ARCHITECTURE.md`); conventions enforced by linting and code review; shared internal libraries as Nest modules; monorepos with several Nest applications sharing code.

**Level 6 — enterprises.** Many teams building services on a common Nest platform: shared modules for authentication, logging, tracing and configuration; generators producing standard modules; microservice transports (queues, gRPC) using the same providers as HTTP ({{ch:microservices}}).

## Real-world use cases

### Replacing the payment provider

- **Situation**: the shop switches payment providers.
- **With DI**: a `PAYMENT_GATEWAY` token and a `PaymentGateway` interface; a new `NewProviderGateway` class; one line changed in the payments module's providers (or a factory choosing by configuration during the migration). `CheckoutService` and its tests do not change.

### Shared infrastructure for many services

- **Situation**: five Nest services need the same logging, configuration validation and health checks.
- **Design**: an internal package exporting `PlatformModule.forRoot({ serviceName })`, providing a configured logger, a validated `ConfigService`, health endpoints and shutdown handling; each service imports it once.

## Common mistakes

### Beginner: business logic in controllers

**Fix:** controllers translate HTTP; services decide.

### Beginner: missing `@Injectable()` or `@Inject(TOKEN)`

**Consequence:** "can't resolve dependencies" or `undefined` dependencies. **Fix:** decorate every provider class; use tokens for interfaces.

### Beginner: forgetting `exports`

**Fix:** export what other modules need; import the module that exports it.

### Intermediate: calling `new` on services anyway

**Consequence:** two instances, hidden dependencies, untestable code. **Fix:** let the container build providers.

### Intermediate: state in singleton services

**Consequence:** one user's data leaks into another's request. **Fix:** stateless services; per-request data passed explicitly or through `AsyncLocalStorage`.

### Intermediate: request scope for convenience

**Consequence:** large parts of the graph rebuilt per request. **Fix:** default scope.

### Production: no shutdown hooks

**Consequence:** connections and jobs cut off on every deploy. **Fix:** `enableShutdownHooks()` and cleanup in `onApplicationShutdown`.

### Production: `forwardRef` everywhere

**Fix:** extract the shared concept; use events between modules.

## Debugging and troubleshooting

- **`Nest can't resolve dependencies of X (?, Y)`**: the `?` is the failing parameter — check `providers`, `exports`, `imports`, `@Inject` tokens and `@Injectable()`.
- **An injected dependency is `undefined`**: missing `@Injectable()`, or a type-only import (`import type`) of a class that Nest needs at runtime.
- **"A circular dependency between modules"**: read the printed chain; look for the missing abstraction before `forwardRef`.
- **A route returns 404**: the controller is not listed in a module's `controllers`, the module is not imported, or a parameterised route (`@Get(":id")`) is declared before a static one (`@Get("search")`) and catches it.
- **Configuration is `undefined`**: `ConfigModule` not imported (or not global), or the variable missing — validate at start-up.
- **Seeing everything Nest registers**: start with the default logger enabled; it prints every module, route and provider as it initialises.

## Security summary

- Keep **secrets in configuration**, validated at start-up and injected through `ConfigService`; never in source code or `useValue` constants that get logged.
- **Export as little as possible** from modules; smaller surfaces mean fewer ways to misuse internal providers.
- Keep services **stateless** to avoid leaking data between users.
- Use **fakes in tests** for external services so test runs never charge cards or send real email.
- The request pipeline security features — validation, guards, exception filters, security headers — are covered in {{ch:nestjs-advanced}}.

## How a senior engineer thinks about this

- **Nest is dependency inversion with a container.** Understanding the container — tokens, metadata, scopes — turns every error message into a clear instruction.
- **Modules are boundaries.** Each exports the smallest surface it can, and they can explain why.
- **Controllers translate, services decide, repositories persist.** Business rules live where they can be reused and tested without HTTP.
- **Everything touching the outside world sits behind an interface**, so it can be replaced in tests and swapped in production.
- **Framework features are tools, not goals.** Request scope, `forwardRef` and CQRS modules are used when justified, not by default.

## Exercises

### Exercise 1 — Extend the container

**Objective:** understand what Nest's container does.
**What to do:** extend the tiny container from this chapter with a `transient` option: providers registered with `{ transient: true }` produce a new instance on every `get`. Then explain why a transient provider injected into a singleton still effectively has only one instance.

<details>
<summary>Show the solution</summary>

```ts
type Token<T> = { name: string; _type?: T };
type Provider<T> = { deps: Token<any>[]; create: (...deps: any[]) => T; transient?: boolean };

class Container {
  private providers = new Map<Token<any>, Provider<any>>();
  private instances = new Map<Token<any>, unknown>();
  register<T>(token: Token<T>, provider: Provider<T>) { this.providers.set(token, provider); }

  get<T>(token: Token<T>, path: string[] = []): T {
    const provider = this.providers.get(token);
    if (!provider) throw new Error(`no provider for ${token.name}`);
    if (!provider.transient && this.instances.has(token)) return this.instances.get(token) as T;
    if (path.includes(token.name)) throw new Error(`circular dependency: ${[...path, token.name].join(" → ")}`);
    const instance = provider.create(...provider.deps.map((d) => this.get(d, [...path, token.name])));
    if (!provider.transient) this.instances.set(token, instance);
    return instance;
  }
}

let created = 0;
const ID: Token<{ n: number }> = { name: "Id" };
const HOLDER: Token<{ id: { n: number } }> = { name: "Holder" };

const c = new Container();
c.register(ID, { deps: [], create: () => ({ n: ++created }), transient: true });
c.register(HOLDER, { deps: [ID], create: (id) => ({ id }) });

console.log("direct gets:", c.get(ID).n, c.get(ID).n);
console.log("through the singleton:", c.get(HOLDER).id.n, c.get(HOLDER).id.n);
```

**Output:**

```text
direct gets: 1 2
through the singleton: 3 3
```

**Walkthrough:** asking for the transient provider directly creates a new instance each time (1, then 2). The singleton `HOLDER` is created once, receiving one transient instance (3), and keeps it — so everyone using `HOLDER` sees the same one. This is the same reason request scope must spread upward in Nest: a long-lived object captures whatever it was given when it was built.

</details>

### Exercise 2 — Design the modules

**Objective:** practise module boundaries.
**What to do:** the shop's back end has these capabilities: customers (accounts and profiles), catalogue (products and prices), orders (placing and viewing orders), payments (charging cards through a provider), notifications (email and SMS). Sketch the modules, what each exports, and what each imports. Where could a cycle appear, and how would you avoid it?

<details>
<summary>Show the solution</summary>

| Module | Exports | Imports |
|---|---|---|
| `ConfigModule` (global) | `ConfigService` | — |
| `DatabaseModule` (global, `forRoot`) | database connection / client | `ConfigModule` |
| `CustomersModule` | `CustomersService` (find customer, check status) | `DatabaseModule` |
| `CatalogueModule` | `CatalogueService` (get product, current price) | `DatabaseModule` |
| `PaymentsModule` | `PaymentsService` (charge, refund) | `ConfigModule` |
| `NotificationsModule` | `NotificationsService` (queue email/SMS) | queue module |
| `OrdersModule` | `OrdersService` (for admin or reporting modules) | `CustomersModule`, `CatalogueModule`, `PaymentsModule`, `NotificationsModule` |

**Possible cycle:** `PaymentsModule` wants to mark orders as paid after a webhook, so it imports `OrdersModule`, while `OrdersModule` imports `PaymentsModule` to charge. **Avoid it** with an event: `PaymentsService` publishes `payment.succeeded` (through an event emitter or the outbox and a queue, {{ch:queues}}), and `OrdersModule` listens and updates the order. Payments no longer needs to know about orders at all.

</details>

### Exercise 3 — Find the problems

**Objective:** practise reviewing Nest code.
**The scenario:** `OrdersController` contains the discount calculation and calls `new PricingService()` inside its methods. `OrdersService` stores the current user in a field `this.currentUser` set at the start of each request. `MailerService` has no `@Injectable()`. `OrdersModule` injects `PaymentsService` but `PaymentsModule` has no `exports`. To fix a resulting error, someone made every provider `Scope.REQUEST`. List the problems and fixes.

<details>
<summary>Show the solution</summary>

1. **Discount logic in the controller** → not reusable or testable without HTTP. Move it to a service.
2. **`new PricingService()`** → bypasses DI; a new instance each call; impossible to replace in tests. Inject it.
3. **`this.currentUser` in a singleton** → concurrent requests overwrite each other's user — a data leak between customers. Pass the user as a method argument (or use `AsyncLocalStorage`).
4. **`MailerService` without `@Injectable()`** → Nest cannot read its constructor's dependencies. Add the decorator.
5. **`PaymentsModule` without `exports`** → `PaymentsService` is private. Export it, and import `PaymentsModule` in `OrdersModule`.
6. **Everything `Scope.REQUEST`** → the whole graph is rebuilt per request, slowing every request, and it does not fix the real problems. Return to default scope after fixing points 3–5.

</details>

### Exercise 4 — Production scenario: the slow start-up and the mysterious slowdown

**Objective:** practise diagnosing Nest-specific issues.
**The scenario:** after a refactor, (a) the API takes 20 seconds to start, and (b) response times rose by 30% across all endpoints, although the endpoints' code did not change. The refactor added a `RequestContextService` with `Scope.REQUEST` injected into the logger, and a `useFactory` provider that warms a cache by loading every product at start-up. Explain the likely causes and fixes.

<details>
<summary>Show the solution</summary>

**(a) Slow start-up** — the async `useFactory` loads every product before the application can start; Nest waits for async factories before constructing dependents and before listening. Fixes: load lazily on first use, warm the cache in the background after start-up (in `onApplicationBootstrap` without awaiting, with errors handled), or load only the most popular products. Also check health-check timeouts so slow starts do not cause restart loops.

**(b) 30% slower everywhere** — the logger is injected almost everywhere; making it depend on a request-scoped provider promotes the logger **and everything that injects it** to request scope, so Nest builds a large object graph on every request. Fix: keep the logger a singleton and read request data (correlation id, user id) from `AsyncLocalStorage`, set by a middleware at the start of each request ({{ch:logging}}). Measure before and after with load tests.

</details>

## Summary

**NestJS** structures Node.js back ends — on Express or Fastify — into **modules** containing **controllers** (HTTP translation) and **providers** (services, repositories, factories), connected by a **dependency-injection container**. Classes declare their dependencies in constructors; the container builds each provider once, in dependency order, and injects it. Nest learns constructor parameter types from metadata emitted for decorated classes, which is why `@Injectable()` is required and why **interfaces need explicit tokens** (`@Inject(SYMBOL)`).

Modules keep providers **private** unless **exported**, and importing a module gives access only to its exports; the common "can't resolve dependencies" error points to a missing provider, export, import, token or decorator. Providers can be classes, **`useClass`** bindings, **`useValue`** constants, **`useFactory`** functions (possibly async, with `inject`) or **`useExisting`** aliases. Applications validate configuration at start-up, enable shutdown hooks and use lifecycle hooks for set-up and cleanup.

Providers are **singletons** by default; request scope is contagious and costly, so per-request data belongs in explicit parameters or `AsyncLocalStorage`. Reusable modules are configured with **`forRoot`**, **`forFeature`** and **`forRootAsync`**. Circular dependencies usually reveal a missing concept or a place for events. Because dependencies are injected, services are tested with the **testing module** and **fakes**, and end-to-end tests rebuild the app with overridden external services and the same global settings as `main.ts`.

## Key terms

- **NestJS** — A TypeScript framework for Node.js servers organised into modules, controllers and providers with dependency injection.
- **Dependency injection (DI)** — Supplying an object's dependencies from outside instead of having it create them.
- **Inversion of control (IoC) container** — The framework component that creates objects and injects their dependencies.
- **Provider** — Anything Nest can create and inject, such as a service, repository, factory or value.
- **@Injectable()** — The decorator marking a class as a provider and enabling Nest to read its constructor parameters.
- **Injection token** — The key under which a provider is registered and requested: a class, string or symbol.
- **@Inject()** — A parameter decorator specifying the token to inject, needed for interfaces and non-class values.
- **Module (Nest)** — A class grouping related controllers and providers, declaring imports and exports.
- **Exports** — The providers a module makes available to modules that import it.
- **Controller (Nest)** — A class whose decorated methods handle HTTP routes.
- **Service** — A provider containing business logic.
- **Repository (pattern)** — A component responsible for storing and loading domain objects.
- **useClass / useValue / useFactory / useExisting** — Ways to define a provider: a class, a constant value, a factory function or an alias.
- **Parameter property** — A TypeScript constructor parameter with a modifier (`private readonly x`) that also declares and assigns a class property.
- **design:paramtypes** — The metadata TypeScript emits listing a decorated class's constructor parameter types.
- **Lifecycle hook** — A method Nest calls at a stage of the application's life, such as `onModuleInit`.
- **Shutdown hooks** — Handling of termination signals so providers can clean up before the process exits.
- **Provider scope** — How long a provider instance lives: singleton, per request or per injection.
- **Dynamic module** — A module returned by a static method such as `forRoot()`, configured by its user.
- **forRoot / forFeature** — Conventions for configuring a module once for the application, or for one feature module.
- **Circular dependency** — Two or more providers or modules that depend on each other directly or indirectly.
- **forwardRef** — A Nest helper that resolves circular references between providers or modules.
- **Testing module** — A small Nest container built in tests with chosen providers and overrides.
- **Fake** — A simple working implementation of an interface used in tests instead of the real one.

## What comes next

With structure and dependency injection in place, the next chapter, {{ch:nestjs-advanced}}, follows a request through Nest's pipeline — middleware, guards, interceptors, pipes and exception filters — and builds production features on top: validation with DTOs, authentication and role-based authorisation, consistent error responses, response shaping, transactions, documentation, and the settings a Nest application needs before it goes live.
