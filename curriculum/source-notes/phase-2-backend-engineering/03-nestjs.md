# Phase 2 — Chapter 3: NestJS

> **Target: 6,000 words · Core interview chapter · Weeks 23–29**
>
> This is the framework your next job title names. You arrive here having written your
> own dependency-injection container in Week 6 and your own decorators in Week 7, and
> having built a complete Express service with a real data layer. That order was
> deliberate. Nest is not magic; it is a well-made version of things you have already
> built by hand, and this chapter shows you the seam between the two.

---

## Chapter Overview

NestJS is a server framework that takes the structure Angular imposed on the browser and
applies it to the server: **modules** that declare what they own, a **container** that
constructs your objects for you, **controllers** that do nothing but translate HTTP, and
a **request pipeline** with named, ordered stages.

Underneath, it is still Express (or Fastify). A Nest application is an Express
application with a great deal of organisation on top. Everything you learned in Week 10 —
middleware order, the four-argument error handler, how a request becomes a response —
is still true. Nest gives those things names and guarantees.

**Why teams choose it.** Express gives you nothing and lets you invent a structure. Ten
Express codebases have ten structures, and a developer joining any of them spends a week
finding where things live. Nest gives you one structure. The cost is that you must learn
its vocabulary; the benefit is that every Nest project looks the same, testing is
straightforward, and TypeScript is assumed rather than bolted on.

**Why it matters for you specifically.** In the Pakistani market, "Node/NestJS" is the
phrase in the job descriptions at the tier you are targeting. And it happens to reward
exactly the fundamentals this book spent seven weeks on: if OOP, interfaces and
dependency inversion are solid, Nest is obvious. If they are not, Nest feels like
incantation and you will never debug it confidently.

**What you will be able to do by the end.** Explain what the Nest container does at
startup and why a circular dependency happens. Draw the request pipeline in order. Build
a feature module with controllers, services and repositories behind interfaces. Write a
guard using metadata you defined yourself. Test all of it without fighting mocks.

---

## Beginner Theory

### The one idea: you stop calling `new`

Here is the whole framework in two versions of the same code.

**Without a container**, every object constructs its own dependencies:

```ts
class OrdersService {
  private repo = new TypeOrmOrderRepository(dataSource);   // constructs its own
  private mailer = new SmtpMailer(config.smtp);            // and its own
}
```

This is what most Express code does, and it has three consequences. You cannot replace
`repo` in a test without mocking the module system. `OrdersService` now knows about
TypeORM and SMTP, so it depends on details rather than on behaviour. And if two services
each do `new SmtpMailer(...)`, you have two mailers where you probably wanted one.

**With a container**, the object declares what it needs and receives it:

```ts
@Injectable()
export class OrdersService {
  constructor(
    @Inject(ORDER_REPOSITORY) private readonly repo: OrderRepository,
    private readonly mailer: MailerService,
  ) {}
}
```

`OrdersService` now depends on an *interface* (`OrderRepository`) and asks for it by
token. Something else decides which implementation arrives. That something else is the
Nest container, and everything in this chapter is a consequence of that one inversion.

You built a crude version of this in Week 6. Open that file beside this chapter. Nest
does four things yours did not: it resolves the whole graph recursively, it manages
lifetime (one instance by default), it enforces visibility through modules, and it
detects circular dependencies and tells you where.

### What actually happens at startup

This is the part most people never learn, and it is the difference between debugging
Nest and guessing at it.

```ts
const app = await NestFactory.create(AppModule);
```

Step by step, what that line does:

1. **Reads `AppModule`'s metadata.** The `@Module({...})` decorator stored an object on
   the class — `imports`, `controllers`, `providers`, `exports` — using
   `reflect-metadata`, the exact mechanism you used in Week 7.
2. **Walks `imports` recursively**, building a graph of every module in the application.
   Each module gets its own container of providers.
3. **For every provider, reads its constructor parameter types.** This is the trick:
   because `emitDecoratorMetadata` is on, TypeScript emits a hidden
   `design:paramtypes` array on every decorated class listing its constructor parameter
   types. Nest reads that array to know what to inject. This is why `@Injectable()` is
   required even on a class with no options — without a decorator, TypeScript emits no
   metadata and Nest is blind.
4. **Topologically sorts and instantiates.** Dependencies first, then dependents. If A
   needs B and B needs A, there is no valid order, and Nest throws the circular
   dependency error rather than hanging.
5. **Runs lifecycle hooks** — `onModuleInit` on every provider that has one.
6. **Registers routes.** Each controller's decorators are read to build the routing
   table, which is then handed to Express underneath.

When you see `Nest can't resolve dependencies of the OrdersService (?, MailerService)`,
that `?` is position zero in that `design:paramtypes` array, and the message is telling
you the container reached step 3 and could not find a provider for that token. The fix
is always one of: the provider is not in this module, or it is not exported by the
module that owns it, or you forgot `@Inject()` on an interface token.

### Modules, and why they exist

```ts
@Module({
  imports:     [TypeOrmModule.forFeature([OrderEntity]), MailerModule],
  controllers: [OrdersController],
  providers:   [OrdersService, { provide: ORDER_REPOSITORY, useClass: TypeOrmOrderRepository }],
  exports:     [OrdersService],
})
export class OrdersModule {}
```

Each key means something precise:

- **`providers`** — things this module can inject. **Private by default.** A provider
  listed here is invisible to every other module.
- **`exports`** — the subset other modules may use after importing this one. This is the
  public API of your module.
- **`imports`** — other modules whose exports you want. Importing a module does *not*
  give you its private providers, only what it exports.
- **`controllers`** — classes whose routes should be registered.

The private-by-default rule is the whole value of modules. Without it, a large
application becomes one flat namespace where anything can reach anything, and a change
in one corner breaks a distant one. With it, `OrdersModule` exposes `OrdersService` and
nothing else, so its repository can be replaced without any other module noticing.

**A common confusion:** importing a module twice does not create two instances of its
providers. Providers are singletons per application by default, not per import.

---

## Basic Examples

### Step 1 — A module you built yourself

Generate the pieces, then read every generated file before you change it:

```bash
nest g module orders
nest g controller orders --no-spec
nest g service orders --no-spec
```

`src/orders/orders.controller.ts`:

```ts
@Controller('orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get()
  findAll(@Query() query: ListOrdersDto) {
    return this.orders.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.orders.findOne(id);
  }

  @Post()
  @HttpCode(201)
  create(@Body() dto: CreateOrderDto) {
    return this.orders.create(dto);
  }
}
```

What each piece does, and what it is doing underneath:

- `@Controller('orders')` — registers this class and prefixes every route with `/orders`.
- `constructor(private readonly orders: OrdersService)` — this is both a declaration of
  a dependency *and*, because of TypeScript's parameter properties, an assignment to
  `this.orders`. Two things in one line, which surprises people coming from plain JS.
- `@Get(':id')` — a route. Nest reads it at startup and registers `GET /orders/:id` with
  Express.
- `@Param('id', ParseUUIDPipe)` — extract the `id` route parameter and run it through a
  pipe first. If it is not a UUID, the pipe throws and the request never reaches your
  method. That is validation happening *before* your code, which is the whole point of
  pipes.
- **Returning a value is enough.** No `res.json()`. Nest serialises whatever you return
  and sends it with 200 (or 201 for POST). A returned promise is awaited. This is why a
  Nest controller reads like a function rather than like plumbing.

**The rule for controllers: they translate, they do not decide.** Parse the request,
call a service, return the result. The moment a controller contains an `if` about
business rules, that rule is in the wrong file — it is now untestable without HTTP and
invisible to anyone reading the service.

### Step 2 — A service that depends on an interface

```ts
// order.repository.ts — the contract
export const ORDER_REPOSITORY = Symbol('ORDER_REPOSITORY');

export interface OrderRepository {
  findById(id: string): Promise<Order | null>;
  save(order: Order): Promise<Order>;
  findByCustomer(customerId: string): Promise<Order[]>;
}
```

```ts
// orders.service.ts
@Injectable()
export class OrdersService {
  constructor(
    @Inject(ORDER_REPOSITORY) private readonly repo: OrderRepository,
    private readonly mailer: MailerService,
  ) {}

  async create(dto: CreateOrderDto): Promise<Order> {
    const existing = await this.repo.findByCustomer(dto.customerId);
    const outstanding = existing.reduce((sum, o) => sum + o.total, 0);

    if (outstanding + dto.total > CREDIT_LIMIT) {
      throw new CreditLimitExceeded(dto.customerId, outstanding);
    }

    const order = await this.repo.save(Order.create(dto));
    await this.mailer.orderConfirmation(order);
    return order;
  }
}
```

**Why the token is a `Symbol`.** A TypeScript interface does not exist at runtime — it is
erased during compilation. So Nest cannot inject "an `OrderRepository`"; there is nothing
to look up. You need a runtime value to use as a key, and that is the token. A `Symbol`
is better than a string because it cannot collide with another module's token by
accident.

**This is the payoff for Week 6.** `OrdersService` has no idea TypeORM exists. In Week 27
you will hand it an in-memory fake and the tests will need three lines of setup. Compare
that to the version that called `new TypeOrmOrderRepository(...)` itself, which cannot be
tested at all without mocking the module loader.

### Step 3 — Provider types, and when each is right

```ts
@Module({
  providers: [
    // 1. Class provider — the shorthand. "Give me an OrdersService."
    OrdersService,

    // 2. useClass — bind an implementation to a token
    { provide: ORDER_REPOSITORY, useClass: TypeOrmOrderRepository },

    // 3. useValue — a ready-made object; the usual choice in tests
    { provide: CLOCK, useValue: { now: () => new Date() } },

    // 4. useFactory — when construction needs a decision or async work
    {
      provide: PAYMENT_GATEWAY,
      useFactory: (config: ConfigService) =>
        config.get('NODE_ENV') === 'production'
          ? new StripeGateway(config.get('STRIPE_KEY'))
          : new FakeGateway(),
      inject: [ConfigService],
    },

    // 5. useExisting — an alias to an existing provider
    { provide: 'LEGACY_ORDERS', useExisting: OrdersService },
  ],
})
export class OrdersModule {}
```

`useFactory` is the one worth dwelling on. `inject: [ConfigService]` tells Nest what to
pass into the factory, in order — the factory's parameters are resolved from the
container just like a constructor's. A factory may return a promise, and Nest will await
it before anything that depends on it is constructed. That is how you open a database
connection at startup and have it ready before the first request.

### Step 4 — Bootstrap, and configuration that fails loudly

```ts
// main.ts
async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,               // strip properties with no decorator
    forbidNonWhitelisted: true,    // and reject the request instead of stripping silently
    transform: true,               // turn plain objects into DTO class instances
  }));

  app.useGlobalFilters(new AllExceptionsFilter());
  app.enableShutdownHooks();       // makes onModuleDestroy fire on SIGTERM

  await app.listen(process.env.PORT ?? 3000);
}
```

Two things here that pay off much later.

**`whitelist` with `forbidNonWhitelisted`.** Together they reject any request containing
a property your DTO did not declare. Without them, a client can send
`{ "total": 10, "isAdmin": true }` and — if anything downstream spreads that object into
an entity — you have a mass-assignment vulnerability. Week 27 has you write the test
that proves this is on.

**`enableShutdownHooks`.** Without it, `onModuleDestroy` never fires and SIGTERM kills
the process with requests in flight and connections open. You did this by hand in Week 13
for Express; this is the Nest equivalent and it matters again in Week 41 when ECS starts
replacing your tasks.

And configuration should refuse to boot when it is wrong:

```ts
ConfigModule.forRoot({
  isGlobal: true,
  validationSchema: Joi.object({
    NODE_ENV: Joi.string().valid('development', 'test', 'production').required(),
    DATABASE_URL: Joi.string().uri().required(),
    JWT_SECRET: Joi.string().min(32).required(),
  }),
}),
```

A process that starts with a missing secret and fails on the first request at 2am is
strictly worse than one that refuses to start at deploy time.

---

## Intermediate Concepts

### The request pipeline, in order

This is the single most asked NestJS interview question. Learn the order and what each
stage is *for*.

```
Incoming request
   │
   ├─ 1. Middleware          — Express-level. No DI context about the handler.
   ├─ 2. Guards              — "may this request proceed?"  → 403 if not
   ├─ 3. Interceptors (pre)  — wrap the call: start a timer, open a transaction
   ├─ 4. Pipes               — transform and validate the arguments → 400 if invalid
   ├─ 5. Handler             — your controller method
   ├─ 6. Interceptors (post) — map the response, stop the timer, commit
   └─ 7. Exception filters   — anything thrown anywhere above lands here
Response
```

Two consequences people get wrong:

**Guards run before pipes.** So a guard cannot rely on a validated, transformed body —
at that point the body is still raw. Authorisation decisions that depend on the body
content have to happen in the handler or in an interceptor, not in a guard.

**Interceptors wrap the handler on both sides.** That is what makes them the right place
for anything with a before-and-after: timing, logging, caching, transactions. A
middleware cannot do this because it has no reference to the handler's result.

### Pipes — transform and validate

```ts
export class CreateOrderDto {
  @IsUUID()
  customerId: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
```

With the global `ValidationPipe`, here is what happens when a request arrives:

1. Express parses the JSON body into a plain object.
2. `transform: true` makes `class-transformer` convert that plain object into a
   `CreateOrderDto` *instance*. This matters — decorators live on the class, so
   validation needs a real instance.
3. `class-validator` reads the decorators and checks each rule.
4. `whitelist: true` removes any property with no validation decorator;
   `forbidNonWhitelisted: true` throws instead.
5. On failure, a `BadRequestException` with the list of violations. **Your handler is
   never called.**

`@Type(() => OrderItemDto)` is easy to forget and produces a confusing bug: without it,
nested objects stay plain and `@ValidateNested` silently validates nothing. If nested
validation "isn't working", this is why.

**Derive your types from your schemas** so they cannot drift — Week 12's lesson applies
here too.

### Guards — authorisation with your own metadata

This is where Week 7's decorator work becomes concrete.

```ts
// roles.decorator.ts — define a custom metadata key
export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
```

```ts
// roles.guard.ts — read it back
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),   // method-level metadata
      context.getClass(),     // class-level metadata
    ]);

    if (!required) return true;                      // no @Roles → open

    const { user } = context.switchToHttp().getRequest();
    return required.some(role => user?.roles?.includes(role));
  }
}
```

```ts
@Roles(Role.Admin)
@UseGuards(JwtAuthGuard, RolesGuard)
@Delete(':id')
remove(@Param('id') id: string) { ... }
```

Reading it precisely:

- `SetMetadata` writes onto the method using `reflect-metadata` — the same API you used
  by hand in Week 7.
- `Reflector.getAllAndOverride` reads it, checking the handler first and falling back to
  the class, so a class-level `@Roles` sets a default that a method can override.
- `ExecutionContext` is a transport-agnostic wrapper. `switchToHttp()` gets the HTTP
  request; the same guard could handle a WebSocket or a microservice message by
  switching differently. That abstraction is why guards are reusable across the
  transports you meet in Weeks 28 and 29.
- **Guard order matters.** `JwtAuthGuard` must run before `RolesGuard`, because the
  second reads the `user` the first attached.
- Returning `false` produces 403. Throwing gives you control of the message.

### Interceptors — the before-and-after

```ts
@Injectable()
export class TimingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('Timing');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const started = Date.now();
    const req = context.switchToHttp().getRequest();

    return next.handle().pipe(
      tap(() => {
        this.logger.log(`${req.method} ${req.url} ${Date.now() - started}ms`);
      }),
    );
  }
}
```

`next.handle()` returns an RxJS `Observable` that emits when your handler resolves.
Code before the `return` runs before the handler; operators inside `.pipe()` run after.
You do not need deep RxJS — `tap` for side effects, `map` to reshape the response,
`catchError` to intervene on failure covers almost everything.

The natural uses: response envelopes, timing, caching, and — the important one —
**wrapping a request in a database transaction**, which is how Week 25 avoids passing a
transaction manager through every method signature.

### Exception filters — one error shape, everywhere

```ts
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exceptions');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    const { status, code, message } = this.classify(exception);

    if (status >= 500) {
      this.logger.error(`${req.method} ${req.url}`, (exception as Error)?.stack);
    }

    res.status(status).json({
      error: { code, message, requestId: req.id },   // never the stack
    });
  }

  private classify(e: unknown) {
    if (e instanceof CreditLimitExceeded) return { status: 409, code: 'CREDIT_LIMIT', message: e.message };
    if (e instanceof EntityNotFound)      return { status: 404, code: 'NOT_FOUND',    message: 'Not found' };
    if (e instanceof HttpException)       return { status: e.getStatus(), code: 'HTTP', message: e.message };
    return { status: 500, code: 'INTERNAL', message: 'Internal server error' };
  }
}
```

This is the boundary where your domain errors become HTTP — the same taxonomy you built
for Express in Week 12, expressed in Nest. **The service throws `CreditLimitExceeded`,
not `ConflictException`**, because the service should not know it is behind HTTP. Keeping
that separation is what lets the same service run behind a queue consumer or a
microservice transport unchanged.

Note what is *not* in the response: the stack, the SQL, the internal message. Week 27 has
you write the test that keeps that promise.

---

## Advanced Concepts

### Provider scope, and the trap

```ts
@Injectable({ scope: Scope.DEFAULT })   // singleton — one for the whole app
@Injectable({ scope: Scope.REQUEST })   // one per request
@Injectable({ scope: Scope.TRANSIENT }) // a fresh one per injection site
```

Default is singleton and that is almost always right.

**The trap: scope is contagious upward.** If a request-scoped provider is injected into
a singleton, that singleton must become request-scoped too — otherwise it would capture
one request's instance forever. Nest handles this by promoting the whole chain, which
means one request-scoped provider deep in your graph can quietly make your entire
application construct a new object graph on every request. That is a real and measurable
performance problem, and it is a good senior-level interview answer.

If you want per-request data without the cost, use `AsyncLocalStorage` (Week 12) instead
of request scope.

### Dynamic modules

When a module needs configuring by its consumer:

```ts
@Module({})
export class StorageModule {
  static forRoot(options: StorageOptions): DynamicModule {
    return {
      module: StorageModule,
      providers: [
        { provide: STORAGE_OPTIONS, useValue: options },
        { provide: STORAGE_CLIENT, useClass: options.driver === 's3' ? S3Client : LocalClient },
      ],
      exports: [STORAGE_CLIENT],
      global: options.global ?? false,
    };
  }
}
```

`forRoot` is the convention for "configure this once for the application"; `forFeature`
is "register this for one module" — which is exactly how `TypeOrmModule.forRoot` and
`TypeOrmModule.forFeature([Entity])` differ, and knowing that distinction is worth
saying out loud.

`forRootAsync` is the version that takes a factory, so configuration can depend on
`ConfigService`. Every serious Nest library offers both.

### Circular dependencies, and what they mean

```ts
// A needs B, B needs A
@Inject(forwardRef(() => OrdersService))
```

`forwardRef` works and you should treat it as a smell rather than a solution. A cycle
between two services usually means there is a third concept neither of them owns —
extract it. If `OrdersService` and `InvoicesService` each need the other, what they
probably share is a `BillingService` or a domain event.

The honest interview answer: "`forwardRef` resolves it mechanically, but a cycle usually
signals a missing abstraction, so I look for the extraction first."

### Lifecycle hooks

```ts
@Injectable()
export class QueueConsumer implements OnModuleInit, OnApplicationShutdown {
  async onModuleInit()          { await this.worker.start(); }
  async onApplicationShutdown() { await this.worker.close(); }
}
```

`onModuleInit` after the container is built, `onApplicationShutdown` on SIGTERM — but
only if you called `enableShutdownHooks()`. This is the seam where Week 31's workers and
Week 41's ECS task replacement meet: a worker that does not close cleanly loses in-flight
jobs on every deploy.

### A worked example: transactions without passing a manager around

This is the single most useful advanced pattern in a Nest codebase, and it is where the
interceptor stage earns its place in the pipeline.

The naive approach passes a transaction manager through every method signature:

```ts
async create(dto: CreateOrderDto, manager: EntityManager) {
  await this.repo.save(order, manager);
  await this.inventory.reserve(items, manager);   // and on, and on
}
```

Every method in the call chain now has a parameter it does not care about, and forgetting
to pass it silently runs that statement outside the transaction — a bug that only appears
under failure, which is the worst kind.

The fix uses `AsyncLocalStorage` (Week 12) to carry the manager invisibly:

```ts
// transaction.context.ts
const storage = new AsyncLocalStorage<EntityManager>();

export const TransactionContext = {
  run: <T>(manager: EntityManager, fn: () => Promise<T>) => storage.run(manager, fn),
  get: () => storage.getStore(),
};
```

```ts
// transaction.interceptor.ts
@Injectable()
export class TransactionInterceptor implements NestInterceptor {
  constructor(private readonly dataSource: DataSource) {}

  intercept(_ctx: ExecutionContext, next: CallHandler): Observable<any> {
    return from(this.dataSource.transaction(manager =>
      TransactionContext.run(manager, () => firstValueFrom(next.handle()))
    ));
  }
}
```

```ts
// the repository picks it up automatically
@Injectable()
export class TypeOrmOrderRepository implements OrderRepository {
  constructor(private readonly dataSource: DataSource) {}

  private get manager(): EntityManager {
    return TransactionContext.get() ?? this.dataSource.manager;
  }

  async save(order: Order) {
    return this.manager.getRepository(OrderEntity).save(toEntity(order));
  }
}
```

Now `@UseInterceptors(TransactionInterceptor)` on a controller method wraps the entire
request in one transaction, and every repository call inside it joins automatically. The
service signatures never change, and a method called outside a transaction still works
because of the `?? this.dataSource.manager` fallback.

**Why this needs an interceptor rather than middleware:** the transaction must commit
*after* the handler succeeds and roll back if it throws. Middleware has no reference to
the handler's outcome. Only an interceptor wraps both sides.

**What to watch for.** The transaction is open for the whole request, so any slow network
call inside the handler holds a database connection — which is precisely the "transaction
open across a network call" problem Week 19 asks you to hunt for. Use it on write
endpoints, not on everything.

### Documenting the API from the DTOs

Week 11 made the point that documentation drifts from implementation. Nest closes that
gap by generating Swagger from the same classes that validate:

```ts
export class CreateOrderDto {
  @ApiProperty({ format: 'uuid', description: 'Existing customer id' })
  @IsUUID()
  customerId: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional() @IsString() @MaxLength(500)
  note?: string;
}
```

```ts
const config = new DocumentBuilder()
  .setTitle('Orders API').setVersion('1.0').addBearerAuth().build();
SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, config));
```

Because the validation decorators and the documentation decorators sit on the same
property, a rule cannot change without the documentation changing with it. The CLI plugin
(`@nestjs/swagger` in `nest-cli.json`) infers most `@ApiProperty` entries from the
TypeScript types, so in practice you only annotate what needs a description.

### Where CQRS fits

Nest ships a CQRS module — commands, queries, events, sagas. It is genuinely useful in a
large domain and genuinely over-engineering in a CRUD service.

Know it exists, be able to say what it is for, and be able to say you would not reach for
it on a project this size. That judgement reads as more senior than adopting it.

---

## Industry Usage

What a real Nest codebase looks like:

```
src/
  main.ts
  app.module.ts
  common/            guards, interceptors, filters, decorators shared everywhere
  config/            ConfigModule setup and validation schema
  database/          DataSource, migrations, base repository
  orders/
    orders.module.ts
    orders.controller.ts
    orders.service.ts
    order.repository.ts        interface + token
    typeorm-order.repository.ts
    dto/
    entities/
  users/
```

**Feature-first, not layer-first.** One folder per business capability containing its own
controller, service, repository and DTOs — rather than global `controllers/`, `services/`
and `models/` folders. It means a change to orders touches one directory, and it is what
Nest's module system is designed around.

Also standard in teams that do this well: Swagger generated from the DTOs (so
documentation cannot drift from validation), a global exception filter and validation
pipe configured once in `main.ts`, repositories behind interfaces, and every module
exporting a deliberately small surface.

---

## Alternatives

| Framework | Where it wins | Where it loses |
|---|---|---|
| **Express** | Tiny, universal, total freedom, everyone knows it | No structure — ten codebases, ten conventions; DI and testing are yours to invent |
| **Fastify** | Notably faster, schema-based validation built in | Smaller ecosystem; Nest can run *on* Fastify, which is often the real answer |
| **NestJS** | Structure, DI, TypeScript-first, excellent testing story | Learning curve; heavier; magic if you skipped the fundamentals |
| **AdonisJS** | Batteries included, Laravel-like, great ergonomics | Much smaller job market |
| **tRPC** | End-to-end type safety without a schema layer | Assumes a TypeScript client; not for public APIs |

**The honest positioning, and a good interview answer:** Express for something small or
a service with one job. Nest when a team will work on it for years, because the structure
you would otherwise invent is already there and already agreed. Nest on Fastify when the
throughput genuinely matters — it is one line of configuration.

---

## Security

- **Global `ValidationPipe` with `whitelist` and `forbidNonWhitelisted`.** Without it,
  unexpected properties reach your code, and mass assignment becomes possible.
- **`@Exclude()` on sensitive entity fields** plus `ClassSerializerInterceptor`, so a
  password hash cannot be returned by accident. Better still, never return entities —
  return response DTOs, so a new database column can never leak by default.
- **Helmet and CORS**, configured explicitly. `app.enableCors()` with no arguments allows
  every origin.
- **Rate limit authentication routes** with `ThrottlerModule` at minimum; the Redis-backed
  distributed limiter from Week 32 is the real answer once you run two instances.
- **Guards run before pipes.** If an authorisation decision depends on the request body,
  a guard is the wrong place for it.
- **Never put secrets in a `useValue`** that ends up logged. Inject `ConfigService`.
- **Exception filters must not leak.** No stack traces, no SQL, no internal messages in
  a 500 response — and Week 27 tests that.

---

## Performance

- **Watch for accidental request scope.** One request-scoped provider can promote a large
  part of your graph. Audit it if latency is unexplained.
- **Consider the Fastify adapter** if throughput matters — a meaningful improvement for
  one line, with a small ecosystem cost.
- **Interceptors run on every request.** Keep them cheap; an expensive global interceptor
  is a tax on everything.
- **The N+1 problem does not care that you are in Nest.** Turn on TypeORM query logging
  and read what one endpoint actually emits — Weeks 18 and 20 are the tools.
- **`ClassSerializerInterceptor` is not free** on large payloads; measure before applying
  it globally.
- **Startup cost scales with the graph.** Large applications take seconds to boot, which
  matters for Lambda (Week 41) and not much elsewhere.

---

## Debugging

**`Nest can't resolve dependencies of the X (?, Y)`** — the commonest error. The `?` is
the parameter position that failed. Check, in order: is the provider in this module's
`providers`; if it belongs to another module, is it in that module's `exports` and is
that module in your `imports`; and if it is an interface, did you use `@Inject(TOKEN)`.

**`Cannot read properties of undefined`** on an injected dependency — almost always a
missing `@Injectable()`, so no metadata was emitted and nothing was injected.

**A circular dependency error** — read the cycle Nest prints. Look for the missing third
concept before reaching for `forwardRef`.

**Validation not firing** — the `ValidationPipe` is not global, or the DTO is typed as an
interface rather than a class (interfaces vanish at runtime), or `@Type()` is missing on
a nested object.

**A guard sees no `user`** — guard order, or the authentication guard is not applied at
all.

**Routes 404 that should exist** — controller not listed in `controllers`, or a route
ordering problem where `@Get(':id')` is declared before `@Get('search')` and swallows it.
Static segments must be declared before parameterised ones.

**Useful tools:** `NestFactory.create(AppModule, { logger: ['debug'] })` prints every
route and provider as it registers them; `app.get(SomeService)` in a script resolves a
provider outside a request for a quick experiment; and `--inspect` with a real debugger
beats `console.log`, as Week 3 established.

---

## Interview Preparation

**Q: What is NestJS and why use it over Express?**
A structured, TypeScript-first framework built on Express (or Fastify) that provides
modules, dependency injection and an ordered request pipeline. Express gives you total
freedom, which means every codebase invents its own structure. Nest gives one structure
a team can share, and makes testing straightforward because dependencies are injected.

**Q: Explain the request lifecycle.**
Middleware, guards, interceptors (before), pipes, the handler, interceptors (after),
exception filters. Guards run before pipes, so a guard cannot rely on a validated body.
Interceptors wrap the handler on both sides, which is why transactions and timing belong
there.

**Q: How does dependency injection work in Nest?**
`@Injectable()` plus `emitDecoratorMetadata` makes TypeScript emit `design:paramtypes` on
the class. At startup Nest reads it, resolves each parameter to a provider by token, sorts
the graph and constructs everything. Interfaces vanish at runtime, so interface
dependencies are injected by an explicit token with `@Inject()`.

**Q: What is the difference between a guard, an interceptor and middleware?**
Middleware is Express-level and knows nothing about the handler. A guard answers one
question — may this proceed — and returns a boolean. An interceptor wraps the handler and
can act before and after, so it can transform the response or manage a transaction.

**Q: What are provider scopes and why is the default a singleton?**
Default, request and transient. Singleton is the default because it is cheapest, and
because most services are stateless. Request scope is contagious upward — it promotes
everything that depends on it — so one request-scoped provider can make the whole graph
rebuild per request.

**Q: How do you handle a circular dependency?**
`forwardRef` resolves it mechanically, but a cycle usually means a missing abstraction, so
I look to extract the shared concept first.

**Q: How do you test a Nest service?**
`Test.createTestingModule` with the real service and its dependencies overridden — usually
by a fake rather than a mock, so tests assert on outcomes and survive refactoring. For
e2e, build from `AppModule` and apply the same global pipes and filters as `main.ts`,
because a testing module does not inherit them.

**Q: `forRoot` versus `forFeature`?**
`forRoot` configures a module once for the application — a connection, global options.
`forFeature` registers per-module pieces, such as the entities one feature owns.

---

## Practical Tasks

1. Build the Project 2 skeleton by hand with the CLI, then read every generated file and
   explain each line to yourself in `LOG.md`.
2. Open your Week 6 DI container beside Nest's docs and write down four things Nest does
   that yours did not.
3. Create two feature modules. Make one import the other, then deliberately forget the
   `exports` and read the resolution error carefully.
4. Put a repository behind an interface and a `Symbol` token. Swap the implementation with
   `useClass` and confirm the service needs no change.
5. Write a `useFactory` provider that returns a different implementation based on
   `NODE_ENV`, with `inject: [ConfigService]`.
6. Add a global `ValidationPipe` with `whitelist` and `forbidNonWhitelisted`. Send a
   request with an extra field and confirm it is rejected, not stripped.
7. Write a `@Roles` decorator and a `RolesGuard` using `Reflector`. Protect two routes
   with different roles. Then reverse the guard order and observe the failure.
8. Write a timing interceptor and a response-envelope interceptor. Prove the order they
   run in with logging.
9. Write a global exception filter mapping your domain errors to HTTP, and assert that a
   500 response contains no stack trace.
10. Add `enableShutdownHooks` and an `onApplicationShutdown` that logs. Send SIGTERM and
    confirm it fires.
11. Deliberately create a circular dependency, read the error, fix it by extracting a
    third service rather than with `forwardRef`.
12. Write `ARCHITECTURE.md` for Project 2: the module graph, what each module exports,
    and where each pipeline concern lives.

---

## Projects

### Mini project — rebuild one Express module in Nest

Take a single feature from Project 1 — one resource, full CRUD — and rebuild it as a Nest
module. Nothing else. One controller, one service, one repository behind an interface.

Then put the two implementations side by side and write a page comparing them: what got
longer, what got shorter, what became possible that was not before. The honest answer is
usually that the Nest version is more code for one feature and less code by the fifth,
and that testing went from awkward to trivial. That comparison is a better interview
answer than any amount of enthusiasm about the framework.

### Production project — Project 2

The full rebuild, across Weeks 23–29: feature modules with deliberate exports, the whole
request pipeline in use, a real data layer behind interfaces, authentication and
role-based authorisation, a test suite, GraphQL and WebSockets, and background work.

The bar is not "it runs". The bar is:

- **Every module exports the smallest surface it can**, and you can say why for each one.
- **Every controller is thin** — no business rule lives in one.
- **Every domain error becomes HTTP in exactly one place**, the filter.
- **Every dependency that touches the outside world is behind an interface**, so it can be
  replaced in a test without mocking the module system.
- **`ARCHITECTURE.md` exists** with the module graph drawn, and a stranger can read it and
  know where to add a feature.

### Capstone — make the magic disappear

The exercise that proves you actually understand this chapter rather than having used it.

Extend the thirty-line container you wrote in Week 6 until it can run a trivial Nest-like
application: read constructor metadata with `reflect-metadata`, resolve a dependency graph
recursively, detect a cycle and report where it is, and support a module boundary that
makes providers private unless exported.

You will not use this code. What you get is that every Nest error message afterwards reads
as a description of something you have implemented — and that is the difference between
debugging a framework and guessing at it.

---

## Self Assessment

- What exactly does `NestFactory.create` do, in six steps?
- Why is `@Injectable()` required on a class with no options?
- Why can you not inject a TypeScript interface, and what do you do instead?
- What does `exports` control, and what happens without it?
- In what order do guards, pipes and interceptors run — and what does that order prevent?
- Why can a guard not rely on a validated body?
- What does `whitelist: true` protect you from, and what must accompany it?
- Why is request scope contagious, and what is the cheaper alternative?
- Why does an e2e test need `useGlobalPipes` even though `AppModule` is imported?
- What does a circular dependency usually indicate?
- Where should a domain error be converted into an HTTP status, and why not in the service?

---

## Cheat Sheet

```ts
// Module
@Module({ imports: [], controllers: [], providers: [], exports: [] })

// Providers
OrdersService
{ provide: TOKEN, useClass: Impl }
{ provide: TOKEN, useValue: obj }
{ provide: TOKEN, useFactory: (c: ConfigService) => ..., inject: [ConfigService] }

// Controller
@Controller('orders')
@Get() @Post() @Patch() @Delete()
@Param('id', ParseUUIDPipe) @Query() @Body() @Headers() @Req()
@HttpCode(204) @Header('Cache-Control', 'no-store')

// Pipeline pieces
implements CanActivate       // guard      → canActivate(ctx): boolean
implements NestInterceptor   // interceptor→ intercept(ctx, next): Observable
implements PipeTransform     // pipe       → transform(value, meta)
implements ExceptionFilter   // filter     → catch(exception, host)

// Applying them
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(TimingInterceptor)
@UseFilters(HttpExceptionFilter)
app.useGlobalPipes(...) / useGlobalFilters(...) / useGlobalInterceptors(...)

// Custom metadata
export const Roles = (...r: Role[]) => SetMetadata('roles', r);
this.reflector.getAllAndOverride('roles', [ctx.getHandler(), ctx.getClass()]);

// Testing
const moduleRef = await Test.createTestingModule({ providers: [Svc, { provide: TOKEN, useValue: fake }] }).compile();
```

**Pipeline order:** middleware → guards → interceptors(pre) → pipes → handler →
interceptors(post) → filters.

**Rules:**
- Controllers translate; services decide; repositories persist.
- Interfaces need tokens. Use `Symbol`.
- Global `ValidationPipe` with `whitelist` *and* `forbidNonWhitelisted`.
- Services throw domain errors; filters turn them into HTTP.
- Default scope. Reach for `AsyncLocalStorage` before request scope.
- `forwardRef` is a smell — look for the missing abstraction.
- e2e tests must reapply the globals from `main.ts`.
