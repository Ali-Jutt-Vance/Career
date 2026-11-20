# NestJS II: Guards, Pipes, Interceptors and Production Apps

> [!GOALS]
> - Follow a request through Nest's **pipeline** in order: middleware, guards, interceptors, pipes, the handler and exception filters — and know what each stage is for.
> - Validate input with **DTO classes** and the global `ValidationPipe`, including nested objects and protection against mass assignment.
> - Implement **authentication and role-based authorisation** with guards, custom metadata and the `Reflector`.
> - Produce **consistent errors** by throwing domain errors and translating them to HTTP in one exception filter.
> - Use **interceptors** for cross-cutting work: response shaping, timing, caching and transactions.
> - Write custom decorators such as `@CurrentUser()`.
> - Prepare a Nest application for production: security headers, CORS, rate limiting, serialisation, documentation, health checks, logging and shutdown.

## Why this matters

{{ch:nestjs-basics}} built the structure: modules, controllers, services and dependency injection. A real API needs much more around each request. Is the caller logged in? Are they allowed to do this? Is the body valid, and does it contain fields that should not be there? How is a "this order has already shipped" error turned into a clear `409` response, while a database crash becomes a generic `500` that leaks nothing? How is every request timed and logged?

In Express you would solve each of these with middleware, in whatever order your team chose ({{ch:express}}). Nest gives these concerns **named stages** in a fixed order — guards, pipes, interceptors and filters — each designed for one kind of job. Knowing the stages and their order is one of the most common NestJS interview topics, and more importantly, it tells you where each piece of code belongs. Putting code in the wrong stage leads to subtle bugs: an authorisation check that reads unvalidated data, or an error format that differs between endpoints.

This chapter walks through the pipeline with runnable examples and then assembles the settings a Nest application needs in production.

## The simple idea

Think of an airport. A passenger goes through stages in a fixed order: the entrance (anyone may enter the building), **passport control** (are you allowed to travel?), **baggage screening** (is what you carry acceptable, and is it packed correctly?), the flight itself, and on arrival, the same staff who saw you depart may record your arrival time. If something goes wrong anywhere, a single **customer service desk** handles it, with one standard procedure.

Nest's pipeline is that airport. **Middleware** is the entrance, **guards** are passport control, **pipes** are baggage screening, the **handler** is the flight, **interceptors** are the staff who see you before and after, and **exception filters** are the customer service desk.

> [!ANALOGY]
> Nest's request pipeline is like an airport: the entrance (middleware), passport control (guards: may you proceed?), baggage screening (pipes: is your input valid?), the flight (the handler), staff who see you before and after (interceptors), and one service desk for every problem (exception filters).
>
> **Where the analogy breaks:** in an airport, passport control can look in your bags. In Nest, guards run **before** pipes, so when a guard runs, the request body has not yet been validated or transformed. A guard can check who you are and your role, but a decision that depends on the body's contents belongs later, in the service.

## The proper definition and key words

The **NestJS request pipeline** is the ordered sequence of components that process an incoming request around the controller method (the **route handler**), each with a specific responsibility and interface.

Key words:

- **Middleware** — functions that run first, at the HTTP library level, with access to the raw request and response (like Express middleware).
- **Guard** — a class implementing `CanActivate`, deciding whether a request may proceed (authentication and authorisation).
- **Interceptor** — a class implementing `NestInterceptor`, wrapping the handler so it can run code before and after it and transform the result.
- **Pipe** — a class implementing `PipeTransform`, transforming and validating handler arguments.
- **Exception filter** — a class implementing `ExceptionFilter`, turning thrown errors into responses.
- **DTO** (data transfer object) — a class describing the shape of input or output data, often decorated with validation rules.
- **`ExecutionContext`** — an object describing the current request and handler, usable for HTTP, WebSockets or microservice messages.
- **Metadata** — extra information attached to classes or methods with decorators (such as required roles), read back with the **`Reflector`**.
- **Binding scope** — where a pipeline component applies: one method, one controller, or globally.

## The pipeline

### Level 2 — The order

```text
  incoming request
     │
     ├─ 1. Middleware            Express-level; knows nothing about which handler will run
     ├─ 2. Guards                "may this request proceed?"          → 401 / 403
     ├─ 3. Interceptors (before) start a timer, open a transaction, check a cache
     ├─ 4. Pipes                 transform and validate arguments     → 400
     ├─ 5. Route handler         your controller method
     ├─ 6. Interceptors (after)  shape the response, stop the timer, commit
     └─ 7. Exception filters     anything thrown above becomes a response
  response
```

This example registers one of each and records the order in which they run, for a successful request and a failing one:

```ts
import "reflect-metadata";
import {
  Catch, Controller, Get, Injectable, Module, Param, UseFilters, UseGuards, UseInterceptors,
  type ArgumentsHost, type CallHandler, type CanActivate, type ExceptionFilter, type ExecutionContext,
  type NestInterceptor, type PipeTransform,
} from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { tap } from "rxjs";
import type { AddressInfo } from "node:net";
import type { Request, Response, NextFunction } from "express";

const log: string[] = [];

@Injectable() class LogGuard implements CanActivate {
  canActivate() { log.push("2 guard"); return true; }
}
@Injectable() class LogInterceptor implements NestInterceptor {
  intercept(_ctx: ExecutionContext, next: CallHandler) {
    log.push("3 interceptor (before)");
    return next.handle().pipe(tap(() => log.push("6 interceptor (after)")));
  }
}
@Injectable() class LogPipe implements PipeTransform {
  transform(value: string) { log.push("4 pipe"); return value.toUpperCase(); }
}
@Catch() class LogFilter implements ExceptionFilter {
  catch(err: Error, host: ArgumentsHost) {
    log.push("7 exception filter");
    host.switchToHttp().getResponse<Response>().status(500).json({ error: err.message });
  }
}

@Controller("demo")
@UseGuards(LogGuard)
@UseInterceptors(LogInterceptor)
@UseFilters(LogFilter)
class DemoController {
  @Get(":word")
  handle(@Param("word", LogPipe) word: string) {
    log.push("5 handler");
    if (word === "FAIL") throw new Error("something broke");
    return { word };
  }
}

@Module({ controllers: [DemoController] })
class AppModule {}

const app = await NestFactory.create(AppModule, { logger: false });
app.use((_req: Request, _res: Response, next: NextFunction) => { log.push("1 middleware"); next(); });
await app.listen(0);
const base = `http://localhost:${(app.getHttpServer().address() as AddressInfo).port}`;

for (const word of ["hello", "fail"]) {
  log.length = 0;
  const res = await fetch(`${base}/demo/${word}`);
  console.log(`GET /demo/${word} → ${res.status} ${await res.text()}`);
  console.log("  " + log.join(" → "));
}
await app.close();
```

**Output:**

```text
GET /demo/hello → 200 {"word":"HELLO"}
  1 middleware → 2 guard → 3 interceptor (before) → 4 pipe → 5 handler → 6 interceptor (after)
GET /demo/fail → 500 {"error":"something broke"}
  1 middleware → 2 guard → 3 interceptor (before) → 4 pipe → 5 handler → 7 exception filter
```

- The pipe **transformed** the parameter (`hello` became `HELLO`) before the handler saw it.
- On success, the interceptor's "after" part runs as the response goes out.
- When the handler throws, the "after" part does not run; the **exception filter** produces the response.
- Two consequences to remember: **guards run before pipes**, so guards see raw, unvalidated input; and **interceptors wrap the handler on both sides**, which middleware cannot do because it never sees the handler's result.

### Level 2 — Where components apply

Each component can be bound at three levels:

```ts
// fragment
@Get(":id") @UseGuards(OwnerGuard) findOne() {}           // one handler
@Controller("orders") @UseInterceptors(TimingInterceptor)  // every route in a controller
app.useGlobalPipes(new ValidationPipe({ ... }));           // the whole application (main.ts)
```

Global components created with `new` in `main.ts` are **outside** dependency injection, so they cannot receive injected services. To make a global guard, interceptor, pipe or filter that **does** use DI, register it as a provider with a special token:

```ts
// fragment
import { APP_GUARD, APP_INTERCEPTOR, APP_FILTER } from "@nestjs/core";

@Module({
  providers: [
    { provide: APP_GUARD, useClass: AuthGuard },              // runs for every route; can inject services
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
```

## Pipes and validation

### Level 2 — Built-in pipes

Nest includes pipes for common conversions: `ParseIntPipe`, `ParseUUIDPipe`, `ParseBoolPipe`, `ParseEnumPipe`, `DefaultValuePipe` and others:

```ts
// fragment
@Get(":id")
findOne(@Param("id", ParseUUIDPipe) id: string) {}       // 400 if not a UUID; handler never runs

@Get()
list(@Query("page", new DefaultValuePipe(1), ParseIntPipe) page: number) {}
```

### Level 3 — DTOs and the ValidationPipe

For request bodies, describe the expected shape as a **DTO class** with validation decorators from `class-validator`, and turn on the global `ValidationPipe`:

```ts
import "reflect-metadata";
import { Body, Controller, Module, Post, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { Type } from "class-transformer";
import { ArrayMinSize, IsInt, IsOptional, IsString, IsUUID, MaxLength, Min, ValidateNested } from "class-validator";
import type { AddressInfo } from "node:net";

class OrderItemDto {
  @IsString() sku!: string;
  @IsInt() @Min(1) quantity!: number;
}

class CreateOrderDto {
  @IsUUID() customerId!: string;

  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)            // without this, nested objects are not validated
  @ArrayMinSize(1)
  items!: OrderItemDto[];

  @IsOptional() @IsString() @MaxLength(200)
  note?: string;
}

@Controller("orders")
class OrdersController {
  @Post()
  create(@Body() dto: CreateOrderDto) {
    return { dtoClass: dto.constructor.name, items: dto.items.length };
  }
}

@Module({ controllers: [OrdersController] })
class AppModule {}

const app = await NestFactory.create(AppModule, { logger: false });
app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
await app.listen(0);
const base = `http://localhost:${(app.getHttpServer().address() as AddressInfo).port}`;

const customerId = "9b2f6c1e-3a4d-4f5b-8c7d-1e2f3a4b5c6d";
const bodies = {
  valid: { customerId, items: [{ sku: "TEA-1", quantity: 2 }] },
  invalid: { customerId: "c1", items: [{ sku: "TEA-1", quantity: 0 }] },
  extraField: { customerId, items: [{ sku: "TEA-1", quantity: 1 }], isPaid: true },
};
for (const [name, body] of Object.entries(bodies)) {
  const res = await fetch(`${base}/orders`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const json = await res.json();
  console.log(`${name}: ${res.status}`, res.ok ? json : json.message);
}
await app.close();
```

**Output:**

```text
valid: 201 { dtoClass: 'CreateOrderDto', items: 1 }
invalid: 400 [
  'customerId must be a UUID',
  'items.0.quantity must not be less than 1'
]
extraField: 400 [ 'property isPaid should not exist' ]
```

What the `ValidationPipe` did for each request:

1. **`transform: true`** turned the plain JSON object into a real `CreateOrderDto` instance (the handler sees `dto.constructor.name === "CreateOrderDto"`). Decorators live on the class, so validation needs a real instance.
2. **`class-validator`** checked every rule — including the **nested** items, thanks to `@ValidateNested` together with `@Type(() => OrderItemDto)`. Forgetting `@Type` is a classic bug: nested objects stay plain and silently pass.
3. **`whitelist: true`** strips properties without decorators, and **`forbidNonWhitelisted: true`** rejects the request instead. That is what stopped `isPaid: true` — the defence against **mass assignment**, where a client sets fields such as `isPaid`, `role` or `price` that should never come from input.
4. On failure, the handler never runs; the client receives `400` with a list of messages.

DTOs must be **classes**, not interfaces or type aliases — those disappear at runtime, leaving nothing to validate. Some teams prefer schema libraries such as Zod with a custom pipe (`new ZodValidationPipe(schema)`), which works equally well ({{ch:validation}}). Whichever you choose, define each rule once and derive types and documentation from it.

## Guards: authentication and authorisation

### Level 3 — An authentication guard and a roles guard

A guard returns `true` to let the request continue, returns `false` (Nest responds `403 Forbidden`), or throws an exception of its choice (for example, `UnauthorizedException` for `401`). Custom **metadata** says which roles each route needs:

```ts
import "reflect-metadata";
import {
  Controller, Delete, Get, Injectable, Module, Param, SetMetadata, UnauthorizedException, UseGuards,
  type CanActivate, type ExecutionContext,
} from "@nestjs/common";
import { NestFactory, Reflector } from "@nestjs/core";
import type { AddressInfo } from "node:net";
import type { Request } from "express";

type User = { id: string; roles: string[] };
type AuthedRequest = Request & { user?: User };

// Stand-in for real token verification ({{ch:jwt}}): a table of known tokens
const USERS: Record<string, User> = {
  "token-sara": { id: "sara", roles: ["customer"] },
  "token-omar": { id: "omar", roles: ["staff", "admin"] },
};

@Injectable()
class AuthGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    const token = req.headers.authorization?.replace(/^Bearer /, "");
    const user = token ? USERS[token] : undefined;
    if (!user) throw new UnauthorizedException();              // 401: who are you?
    req.user = user;
    return true;
  }
}

export const ROLES_KEY = "roles";
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

@Injectable()
class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}
  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[] | undefined>(ROLES_KEY, [ctx.getHandler(), ctx.getClass()]);
    if (!required) return true;                                 // no @Roles: any logged-in user
    const { user } = ctx.switchToHttp().getRequest<AuthedRequest>();
    return required.some((role) => user?.roles.includes(role)); // false → 403: not allowed
  }
}

@Controller("products")
@UseGuards(AuthGuard, RolesGuard)                               // order matters: authenticate, then authorise
class ProductsController {
  @Get(":id")
  findOne(@Param("id") id: string) { return { id, name: "Green Tea" }; }

  @Delete(":id")
  @Roles("admin")
  remove(@Param("id") id: string) { return { deleted: id }; }
}

@Module({ controllers: [ProductsController] })
class AppModule {}

const app = await NestFactory.create(AppModule, { logger: false });
await app.listen(0);
const base = `http://localhost:${(app.getHttpServer().address() as AddressInfo).port}`;

for (const [method, token] of [["GET", undefined], ["GET", "token-sara"], ["DELETE", "token-sara"], ["DELETE", "token-omar"]] as const) {
  const res = await fetch(`${base}/products/p7`, { method, headers: token ? { Authorization: `Bearer ${token}` } : {} });
  console.log(`${method.padEnd(6)} as ${token ?? "nobody"}`.padEnd(26), "→", res.status, await res.text());
}
await app.close();
```

**Output:**

```text
GET    as nobody           → 401 {"message":"Unauthorized","statusCode":401}
GET    as token-sara       → 200 {"id":"p7","name":"Green Tea"}
DELETE as token-sara       → 403 {"message":"Forbidden resource","error":"Forbidden","statusCode":403}
DELETE as token-omar       → 200 {"deleted":"p7"}
```

- **`AuthGuard`** answers "who are you?": no valid token means `401`. It attaches the user to the request for later stages.
- **`@Roles("admin")`** stores metadata on the method with `SetMetadata`. **`RolesGuard`** reads it with `Reflector.getAllAndOverride`, which checks the method first and then the class — so a class-level `@Roles` can set a default that methods override.
- A customer can read products but not delete them (`403`); an admin can.
- **Order matters**: `RolesGuard` reads the user that `AuthGuard` attached, so `AuthGuard` must come first.
- In a real application, `AuthGuard` verifies a JWT or a session ({{ch:jwt}}, {{ch:sessions}}) — often with Passport strategies through `@nestjs/passport` — and is registered globally with `APP_GUARD`, with a `@Public()` metadata decorator to mark the few open routes. Secure by default, open by exception.

Role checks are **coarse-grained**. "Can this customer cancel **this** order?" depends on data (does the order belong to them? has it shipped?), so it belongs in the service or a policy object, where the order is loaded ({{ch:authentication}}). Remember too that guards see the body **before** validation; do not make guard decisions based on body contents.

## Exception filters: one error format everywhere

### Level 3 — Domain errors in, HTTP out

Services should throw **domain errors** that describe what went wrong in business terms (`OrderAlreadyShipped`), not HTTP exceptions — so the same service works behind HTTP, a queue worker or a script. A single global **exception filter** translates them, and makes sure unexpected errors never leak details ({{ch:error-handling}}). An **interceptor** wraps successful responses in a consistent envelope:

```ts
import "reflect-metadata";
import {
  Catch, Controller, Get, HttpException, Injectable, Module, Param,
  type ArgumentsHost, type CallHandler, type ExceptionFilter, type ExecutionContext, type NestInterceptor,
} from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { map } from "rxjs";
import type { AddressInfo } from "node:net";
import type { Request, Response } from "express";

// ── Domain errors: no HTTP in sight ───────────────────────────────────
class DomainError extends Error {}
class OrderNotFound extends DomainError { constructor(id: string) { super(`Order ${id} not found`); } }
class OrderAlreadyShipped extends DomainError { constructor(id: string) { super(`Order ${id} has already shipped`); } }

@Injectable()
class OrdersService {
  cancel(id: string) {
    if (id === "1042") throw new OrderAlreadyShipped(id);
    if (id === "boom") throw new Error("connection to db-primary:5432 refused");   // an unexpected bug
    if (id !== "1043") throw new OrderNotFound(id);
    return { id, status: "CANCELLED" };
  }
}

// ── One place where errors become HTTP ────────────────────────────────
@Catch()
class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const http = host.switchToHttp();
    const req = http.getRequest<Request>();
    const { status, code, message } = classify(exception);
    if (status >= 500) console.log(`  [log] ${req.method} ${req.url}: ${(exception as Error).message}`);  // details only in logs
    http.getResponse<Response>().status(status).json({ error: { code, message, requestId: req.headers["x-request-id"] ?? null } });
  }
}

function classify(e: unknown): { status: number; code: string; message: string } {
  if (e instanceof OrderNotFound) return { status: 404, code: "ORDER_NOT_FOUND", message: e.message };
  if (e instanceof OrderAlreadyShipped) return { status: 409, code: "ORDER_ALREADY_SHIPPED", message: e.message };
  if (e instanceof HttpException) return { status: e.getStatus(), code: "HTTP_ERROR", message: e.message };
  return { status: 500, code: "INTERNAL", message: "Something went wrong" };
}

// ── A consistent envelope for successful responses ────────────────────
@Injectable()
class EnvelopeInterceptor implements NestInterceptor {
  intercept(_ctx: ExecutionContext, next: CallHandler) {
    return next.handle().pipe(map((data) => ({ data })));
  }
}

@Controller("orders")
class OrdersController {
  constructor(private readonly orders: OrdersService) {}
  @Get(":id/cancel")
  cancel(@Param("id") id: string) { return this.orders.cancel(id); }
}

@Module({ controllers: [OrdersController], providers: [OrdersService] })
class AppModule {}

const app = await NestFactory.create(AppModule, { logger: false });
app.useGlobalFilters(new AllExceptionsFilter());
app.useGlobalInterceptors(new EnvelopeInterceptor());
await app.listen(0);
const base = `http://localhost:${(app.getHttpServer().address() as AddressInfo).port}`;

for (const id of ["1043", "1042", "9999", "boom"]) {
  const res = await fetch(`${base}/orders/${id}/cancel`, { headers: { "X-Request-Id": `req-${id}` } });
  console.log(`cancel ${id} → ${res.status} ${await res.text()}`);
}
await app.close();
```

**Output:**

```text
cancel 1043 → 200 {"data":{"id":"1043","status":"CANCELLED"}}
cancel 1042 → 409 {"error":{"code":"ORDER_ALREADY_SHIPPED","message":"Order 1042 has already shipped","requestId":"req-1042"}}
cancel 9999 → 404 {"error":{"code":"ORDER_NOT_FOUND","message":"Order 9999 not found","requestId":"req-9999"}}
  [log] GET /orders/boom/cancel: connection to db-primary:5432 refused
cancel boom → 500 {"error":{"code":"INTERNAL","message":"Something went wrong","requestId":"req-boom"}}
```

- Every error response has the **same shape**, with a stable machine-readable `code` and the request id for support.
- Domain errors map to meaningful statuses (`404`, `409`); Nest's own `HttpException`s (from built-in pipes and guards) keep their status.
- The unexpected error's details — a database host name — appear **only in the log**; the client sees a generic message. Leaking internal details helps attackers and confuses users.
- The **interceptor** wrapped the successful result in `{ "data": ... }` without any controller knowing. Whether to use an envelope at all is a team convention; what matters is consistency ({{ch:rest-apis}}).
- The example uses `GET` to keep the requests short; a real cancel endpoint would be a `POST` ({{ch:rest-apis}}).

## Interceptors

### Level 3 — What interceptors are for

An interceptor's `intercept(context, next)` runs code, then calls `next.handle()`, which returns an RxJS **Observable** of the handler's result. You need only a few operators: `map` to transform the result, `tap` for side effects such as logging, `catchError` to react to errors, and `timeout` to limit duration.

Typical uses:

- **Response shaping** — envelopes, as above, or converting entities to response DTOs.
- **Timing and logging** — measure each request's duration with the route name ({{ch:logging}}).
- **Caching** — return a cached result without calling the handler (`@nestjs/cache-manager` provides a `CacheInterceptor`).
- **Timeouts** — `next.handle().pipe(timeout(5000))`.
- **Transactions** — open a database transaction before the handler and commit or roll back after it.

### Level 4 — Transactions without passing a manager everywhere

Passing a transaction object through every method signature is tedious and error-prone: forget it once and a query silently runs outside the transaction. An interceptor plus `AsyncLocalStorage` carries it implicitly:

```ts
// fragment
import { AsyncLocalStorage } from "node:async_hooks";

const txStorage = new AsyncLocalStorage<TransactionClient>();
export const currentTx = () => txStorage.getStore();

@Injectable()
export class TransactionInterceptor implements NestInterceptor {
  constructor(private readonly db: Database) {}
  intercept(_ctx: ExecutionContext, next: CallHandler) {
    return from(this.db.transaction((tx) => txStorage.run(tx, () => lastValueFrom(next.handle()))));
  }
}

// Repositories use the current transaction if there is one
@Injectable()
export class PostgresOrderRepository implements OrderRepository {
  constructor(private readonly db: Database) {}
  private get client() { return currentTx() ?? this.db; }
  save(order: Order) { return this.client.insert("orders", order); }
}
```

Apply it with `@UseInterceptors(TransactionInterceptor)` on write endpoints. The handler and every repository call inside it share one transaction, committed only if the handler succeeds ({{ch:transactions}}). Watch the cost: the transaction stays open for the whole request, so slow network calls inside such handlers hold database connections — keep external calls outside, or use the outbox pattern ({{ch:queues}}).

## Custom decorators

### Level 3 — Parameter and composed decorators

`createParamDecorator` builds decorators like `@Body()` for your own needs. The most common is `@CurrentUser()` (built in Exercise 1). `applyDecorators` combines several decorators into one, keeping controllers tidy:

```ts
// fragment
export function AdminOnly() {
  return applyDecorators(Roles("admin"), ApiBearerAuth(), ApiForbiddenResponse({ description: "Admins only" }));
}

@Delete(":id") @AdminOnly()
remove(@Param("id", ParseUUIDPipe) id: string) {}
```

## Production readiness

### Level 4 — Security settings

```ts
// fragment
// main.ts
import helmet from "helmet";

const app = await NestFactory.create(AppModule, { bufferLogs: true });
app.use(helmet());                                                  // security headers
app.enableCors({ origin: ["https://cornershop.example"], credentials: true });  // never "allow everything" with credentials
app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
app.enableShutdownHooks();
app.setGlobalPrefix("api");
await app.listen(process.env.PORT ?? 3000);
```

- **Helmet** sets protective headers ({{ch:application-security}}).
- **CORS** must list allowed origins explicitly; `app.enableCors()` with no options allows every origin ({{ch:browser-and-dom}}).
- **Rate limiting** with `@nestjs/throttler`, at least on authentication routes — backed by Redis when running several instances ({{ch:rate-limiting}}):

```ts
// fragment
@Module({
  imports: [ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }])],          // 100 requests per minute by default
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}

@Post("login") @Throttle({ default: { limit: 5, ttl: 60_000 } })             // stricter for login
login(@Body() dto: LoginDto) {}
```

### Level 4 — Never return entities directly

Returning database entities from controllers risks leaking fields added later — a password hash, an internal note, a cost price. Return **response DTOs** built explicitly, so new columns are private by default. (Nest's `ClassSerializerInterceptor` with `@Exclude()` decorators is an alternative, but explicit response types are easier to review.)

### Level 4 — Documentation from the code

`@nestjs/swagger` generates an OpenAPI document from controllers and DTOs, so documentation and validation come from the same classes ({{ch:api-documentation}}):

```ts
// fragment
const config = new DocumentBuilder().setTitle("Corner Shop API").setVersion("1.0").addBearerAuth().build();
SwaggerModule.setup("docs", app, SwaggerModule.createDocument(app, config));
```

The Swagger CLI plugin infers most property documentation from TypeScript types; add `@ApiProperty({ description })` where a field needs explanation.

### Level 4 — Observability and health

- **Structured logging**: replace Nest's default logger with a JSON logger such as Pino (`nestjs-pino`), with request ids attached to every line ({{ch:logging}}).
- **Health checks**: `@nestjs/terminus` provides `/health` endpoints checking the database, Redis and disk, for load balancers and orchestrators ({{ch:monitoring}}).
- **Metrics and tracing**: OpenTelemetry instrumentation for HTTP and database calls ({{ch:observability-and-incidents}}).

### Level 4 — Beyond HTTP

The same modules, providers, guards, pipes and filters work for other transports, because they use `ExecutionContext` rather than raw HTTP objects:

- **GraphQL** with `@nestjs/graphql` — resolvers as classes, code-first or schema-first ({{ch:graphql}}).
- **WebSockets** with `@nestjs/websockets` gateways ({{ch:websockets}}).
- **Microservices** with `@nestjs/microservices` — message handlers over Redis, NATS, RabbitMQ, Kafka or gRPC ({{ch:microservices}}).
- **Queues** with `@nestjs/bullmq` ({{ch:queues}}).
- **Fastify** instead of Express, with `NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter())`, for higher throughput.

Nest also offers a CQRS module (commands, queries, events). It helps in large, complex domains and is over-engineering for ordinary CRUD services; know it exists, and choose it only when the domain demands it.

## From beginner to enterprise

**Level 1–2 — first protected API.** Built-in pipes; a global `ValidationPipe` with DTO classes; an authentication guard; Nest's built-in HTTP exceptions.

**Level 3 — well-behaved APIs.** `whitelist` and `forbidNonWhitelisted`; nested validation; roles metadata with the `Reflector`; domain errors and one global exception filter; interceptors for logging and response shaping; `@CurrentUser()`.

**Level 4 — production applications.** Global guards through `APP_GUARD` with `@Public()` exceptions; resource-level authorisation in services; Helmet, explicit CORS and rate limiting; response DTOs; Swagger from DTOs; structured logs, health checks and tracing; transactional interceptors used carefully.

**Level 5 — professional practice.** Shared pipeline components in an internal library; contract tests for error formats; end-to-end tests applying the same global settings as `main.ts`; performance budgets for global interceptors.

**Level 6 — enterprises.** Policy-based authorisation (attribute-based rules, external policy engines); multi-tenant guards; the same domain modules served over HTTP, GraphQL and message transports; platform teams providing standard Nest modules for authentication, auditing and observability.

## Real-world use cases

### Secure by default

- **Design**: a global `AuthGuard` and `RolesGuard` registered with `APP_GUARD`; a `@Public()` decorator for the handful of open routes (health check, login, product catalogue); a test that lists every route and fails if a new route is neither public nor protected by roles.
- **Benefit**: forgetting to protect a new endpoint becomes impossible rather than likely.

### Consistent errors across forty endpoints

- **Design**: services throw domain errors from a shared hierarchy; one `AllExceptionsFilter` maps them to statuses and codes; error responses documented once in OpenAPI; front-end code switches on `error.code`.
- **Benefit**: clients handle errors uniformly; no endpoint leaks stack traces.

## Common mistakes

### Beginner: validation not running

DTOs written as interfaces, no global `ValidationPipe`, or missing `@Type()` for nested objects. **Fix:** classes, global pipe, `@Type` with `@ValidateNested`.

### Beginner: no `whitelist` / `forbidNonWhitelisted`

**Consequence:** mass assignment. **Fix:** enable both.

### Beginner: guards in the wrong order

**Consequence:** the roles guard sees no user. **Fix:** authenticate first, then authorise.

### Intermediate: HTTP exceptions thrown from services

**Consequence:** services tied to HTTP. **Fix:** domain errors, translated in the filter.

### Intermediate: authorisation decisions on unvalidated bodies in guards

**Fix:** guards check identity and roles; data-dependent rules go in services or policies.

### Intermediate: global components that need DI created with `new`

**Fix:** register with `APP_GUARD`, `APP_INTERCEPTOR`, `APP_FILTER` or `APP_PIPE`.

### Production: returning entities

**Consequence:** sensitive fields leak when columns are added. **Fix:** response DTOs.

### Production: `enableCors()` with no options

**Fix:** explicit origins.

## Debugging and troubleshooting

- **Body is a plain object, not a DTO instance**: `transform: true` missing on the `ValidationPipe`.
- **Extra fields pass through**: `whitelist` off, or properties lacking any decorator are being stripped silently instead of rejected — add `forbidNonWhitelisted`.
- **Guard cannot find `request.user`**: the authentication guard did not run first, or is not applied to this route.
- **A filter does not catch some errors**: its `@Catch(Type)` is too narrow, or it is bound to a different controller; errors thrown in middleware are not handled by exception filters.
- **An interceptor's "after" code never runs**: the handler threw (errors skip `map`/`tap`), or the handler wrote to the response object directly with `@Res()`, which bypasses Nest's response handling.
- **E2E tests pass but production fails validation (or the reverse)**: the testing module did not apply the same global pipes and filters as `main.ts` — share a `configureApp(app)` function between them.

## Security summary

- Global **`ValidationPipe`** with `whitelist`, `forbidNonWhitelisted` and `transform`; DTO classes for every input.
- **Authentication guard globally**, public routes marked explicitly; **roles** with metadata and the `Reflector`; resource-level checks in services.
- **One exception filter** that never leaks internal details; request ids for support.
- **Helmet**, explicit **CORS**, **rate limiting** (stricter on login and password reset).
- **Response DTOs** instead of entities.
- Keep guards' decisions to identity and roles; remember they run before validation.
- Apply the same global configuration in tests and production.

## How a senior engineer thinks about this

- **Every concern has a stage.** Identity in guards, input in pipes, cross-cutting behaviour in interceptors, error translation in filters, business rules in services.
- **Secure by default.** Global guards, validation and filters, with explicit exceptions — never "remember to add the decorator".
- **One error format, one place.** Domain errors flow out; HTTP shape is decided once.
- **The pipeline is hot code.** Global interceptors and guards run on every request; they are kept cheap and measured.
- **Same rules everywhere.** Configuration shared between `main.ts` and tests, and transport-agnostic components reused across HTTP, GraphQL and messages.

## Exercises

### Exercise 1 — A `@CurrentUser()` decorator

**Objective:** practise custom parameter decorators.
**What to build:** a `@CurrentUser()` decorator that returns the authenticated user attached to the request by a guard, or one field of it with `@CurrentUser("name")`. Throw a clear error if it is used on a route without authentication.

<details>
<summary>Show the solution</summary>

```ts
import "reflect-metadata";
import { Controller, Get, Injectable, Module, UseGuards, createParamDecorator, type CanActivate, type ExecutionContext } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { AddressInfo } from "node:net";
import type { Request } from "express";

type User = { id: string; name: string };
type AuthedRequest = Request & { user?: User };

@Injectable()
class FakeAuthGuard implements CanActivate {                 // stands in for real authentication
  canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    req.user = { id: "c1", name: "Sara" };
    return true;
  }
}

export const CurrentUser = createParamDecorator((field: keyof User | undefined, ctx: ExecutionContext) => {
  const user = ctx.switchToHttp().getRequest<AuthedRequest>().user;
  if (!user) throw new Error("CurrentUser used on a route without authentication");
  return field ? user[field] : user;
});

@Controller("me")
@UseGuards(FakeAuthGuard)
class MeController {
  @Get()
  profile(@CurrentUser() user: User) { return user; }

  @Get("greeting")
  greeting(@CurrentUser("name") name: string) { return { message: `Hello, ${name}` }; }
}

@Module({ controllers: [MeController] })
class AppModule {}

const app = await NestFactory.create(AppModule, { logger: false });
await app.listen(0);
const base = `http://localhost:${(app.getHttpServer().address() as AddressInfo).port}`;
for (const path of ["/me", "/me/greeting"]) {
  const res = await fetch(base + path);
  console.log(path, "→", res.status, await res.text());
}
await app.close();
```

**Output:**

```text
/me → 200 {"id":"c1","name":"Sara"}
/me/greeting → 200 {"message":"Hello, Sara"}
```

**Walkthrough:** the decorator's factory receives the optional argument (`"name"`) and the `ExecutionContext`; it reads the user that the guard attached. Controllers no longer touch the raw request object, which keeps them clean and makes them work unchanged if authentication moves from sessions to tokens. The thrown error (a bug, not a client mistake) becomes a `500` and shows up in logs immediately during development.

</details>

### Exercise 2 — Place the code

**Objective:** practise choosing the right pipeline stage.
**What to do:** for each requirement, choose middleware, guard, interceptor, pipe, filter or service: (1) reject requests without a valid API key; (2) convert `?page=2` from a string to a number; (3) log every request's duration with its route name; (4) "a customer may only view their own orders"; (5) turn `InsufficientStock` errors into `409` responses; (6) add a request id header to every response, including those for unknown routes; (7) cache the product list for 60 seconds; (8) only staff may access `/admin/*` routes.

<details>
<summary>Show the solution</summary>

1. **Guard** — authentication decides whether the request may proceed.
2. **Pipe** — `ParseIntPipe` (with `DefaultValuePipe`).
3. **Interceptor** — it sees both the start and the end of the handler, and the route via `ExecutionContext`.
4. **Service** (or a policy it calls) — it depends on the order's data, which is loaded there.
5. **Exception filter** — the single place where domain errors become HTTP.
6. **Middleware** — it runs for every request, including those that match no route (guards and interceptors only run for matched handlers).
7. **Interceptor** — a cache interceptor can return the cached result without calling the handler.
8. **Guard** with roles metadata, applied to the admin controllers (or globally with a check on the metadata).

</details>

### Exercise 3 — Review a Nest application

**Objective:** practise spotting pipeline and security problems.
**The scenario:** `main.ts` calls only `app.enableCors()` and `app.listen(3000)`. DTOs are TypeScript interfaces. The `OrdersController` checks `if (req.user.role !== "admin")` inside each handler. Services throw `new HttpException("Error", 500)` with the raw database message. Controllers return TypeORM entities including `passwordHash` on the customer relation. A global logging interceptor writes the full request body to the logs.

<details>
<summary>Show the solution</summary>

1. **CORS open to every origin** → any site can call the API from browsers. Explicit origins.
2. **No global `ValidationPipe`** and **DTOs as interfaces** → no validation at all; mass assignment possible. DTO classes plus a global pipe with `whitelist`, `forbidNonWhitelisted`, `transform`.
3. **Role checks inside handlers** → repeated, easy to forget. Roles metadata and a `RolesGuard`; authentication guard globally.
4. **HTTP exceptions with raw database messages from services** → services tied to HTTP and internal details leaked. Domain errors and a global filter that hides unexpected errors.
5. **Entities returned directly, including `passwordHash`** → serious data leak. Response DTOs.
6. **Logging full request bodies** → passwords, card details and personal data in logs ({{ch:logging}}). Log metadata (route, status, duration, ids) and redact sensitive fields.
7. Also missing: Helmet, rate limiting on login, shutdown hooks, health checks.

</details>

### Exercise 4 — Production scenario: inconsistent behaviour between tests and production

**Objective:** practise diagnosing configuration drift.
**The scenario:** the end-to-end test suite passes, but in production clients report that sending unknown fields is accepted silently in some cases, error responses look different from those in the tests, and one admin endpoint was reachable without logging in. Describe the likely causes and how you would prevent this class of problem.

<details>
<summary>Show the solution</summary>

**Likely causes**
- The tests create the application from `AppModule` but apply pipes and filters themselves, with **different options** from `main.ts` (or production `main.ts` changed without the tests following). Validation options differ (`forbidNonWhitelisted` set in tests only), and the production filter differs.
- The admin endpoint relied on a guard applied with `useGlobalGuards(new AuthGuard())` in the test setup, while production `main.ts` forgot it — or the endpoint was marked `@Public()` by mistake.

**Prevention**
1. Move all global configuration into one function, `configureApp(app)`, used by both `main.ts` and the test setup.
2. Register guards, filters and pipes as providers (`APP_GUARD`, `APP_FILTER`, `APP_PIPE`) in `AppModule`, so they are part of the module graph and present wherever the module is used.
3. Add a test that inspects every route's metadata and fails for any route that is neither `@Public()` nor protected — and review `@Public()` additions in code review.
4. Contract tests for the error format and for rejecting unknown fields, run against a production-like build.
5. Smoke tests after each deployment that call a protected endpoint without credentials and expect `401`.

</details>

## Summary

Nest processes each request through a fixed **pipeline**: **middleware** (raw HTTP, every request), **guards** (may the request proceed — authentication and roles), **interceptors** before the handler, **pipes** (transform and validate arguments), the **route handler**, interceptors after it, and **exception filters** for anything thrown. Guards run before pipes, so they see unvalidated input; interceptors wrap both sides of the handler, which is why timing, response shaping, caching and transactions belong there. Components bind to a method, a controller or the whole application — globally through `APP_GUARD`-style providers when they need dependency injection.

Input is validated with **DTO classes** and the global **`ValidationPipe`** with `whitelist`, `forbidNonWhitelisted` and `transform`, using `@ValidateNested` with `@Type` for nested objects — which also blocks **mass assignment**. **Guards** authenticate and check **roles** stored as metadata and read with the **`Reflector`**; resource-level permissions belong in services. Services throw **domain errors** and a single **exception filter** turns them into one consistent error format, hiding internal details. **Custom decorators** such as `@CurrentUser()` keep controllers clean.

Production Nest applications add Helmet, explicit CORS, rate limiting, response DTOs instead of entities, OpenAPI documentation generated from DTOs, structured logging, health checks, tracing and shutdown hooks — and share the same global configuration between `main.ts` and tests. The same building blocks extend to GraphQL, WebSockets, microservice transports and queues.

## Key terms

- **Request pipeline (Nest)** — The ordered stages that process a request around its handler: middleware, guards, interceptors, pipes, handler, filters.
- **Route handler** — The controller method that handles a matched route.
- **Middleware (Nest)** — Code that runs first at the HTTP library level for every request.
- **Guard** — A component deciding whether a request may proceed, used for authentication and authorisation.
- **Pipe** — A component that transforms and validates handler arguments.
- **Interceptor** — A component that wraps the handler to run logic before and after it and transform results.
- **Exception filter** — A component that turns thrown exceptions into responses.
- **ValidationPipe** — Nest's built-in pipe that validates DTO instances using class-validator.
- **DTO (data transfer object)** — A class describing the shape of input or output data.
- **class-validator** — A library of decorators for declaring validation rules on class properties.
- **class-transformer** — A library that converts plain objects into class instances and back.
- **Whitelisting (validation)** — Removing or rejecting properties not declared in the DTO.
- **Mass assignment** — A vulnerability where clients set fields they should not control by adding them to input.
- **ExecutionContext** — An object describing the current request and handler across transports.
- **SetMetadata** — A Nest function that attaches custom metadata to a handler or class.
- **Reflector** — A Nest helper that reads metadata from handlers and classes.
- **APP_GUARD / APP_FILTER / APP_INTERCEPTOR / APP_PIPE** — Tokens for registering global pipeline components as providers with dependency injection.
- **Domain error** — An error describing a business rule violation, independent of HTTP.
- **Response envelope** — A standard wrapper around response data, such as `{ "data": ... }`.
- **Observable** — An RxJS stream of values; interceptors use one to access the handler's result.
- **createParamDecorator** — A Nest function for building custom parameter decorators.
- **applyDecorators** — A Nest function that combines several decorators into one.
- **Helmet** — Middleware that sets security-related HTTP headers.
- **Throttler** — Nest's rate-limiting module.
- **Response DTO** — An explicit output type that controls exactly which fields an API returns.

## What comes next

As APIs gain clients — web, mobile apps that update slowly, partners — changing them without breaking anyone becomes a real problem. The next chapter, {{ch:api-versioning}}, covers how to evolve APIs safely: which changes break clients, versioning in URLs, headers and media types, deprecation and sunset policies, and how large API providers manage change over years.
