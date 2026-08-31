# Phase 2 — Chapter 3: NestJS

> *"NestJS is a progressive Node.js framework for building efficient, reliable, and scalable server-side applications."*

---

## Chapter Overview

### Why NestJS Exists

Express is minimal and flexible — but that flexibility becomes a liability on large teams. Without conventions, every developer structures projects differently, dependencies sprawl, and testing becomes hard.

NestJS (created by Kamil Myśliwiec, 2017) solves this by bringing enterprise patterns from Angular (and Java Spring) to Node.js:
- **Modules**: organize code by feature
- **Dependency Injection**: decouple components, enable testability
- **Decorators**: declarative, readable code
- **Built-in support** for TypeScript, validation, serialization, guards, interceptors

NestJS uses Express (or Fastify) under the hood — you still get Express's power, but with opinionated structure and dependency injection on top.

**NestJS is the go-to framework for:**
- Enterprise Node.js applications
- Large teams needing strict conventions
- Microservices and monorepos (Nx)
- Applications requiring testability

**Companies using NestJS:** Autodesk, Roche, Adidas, and thousands of enterprises.

---

## Beginner Theory

### Core Building Blocks

```
┌────────────────────────────────────────────────────┐
│                    Module                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐ │
│  │Controller│  │ Service  │  │    Repository    │ │
│  │ (routes) │  │(business)│  │    (data)        │ │
│  └──────────┘  └──────────┘  └──────────────────┘ │
└────────────────────────────────────────────────────┘
```

**Module**: Groups related controllers, services, and providers. The unit of organization.

**Controller**: Handles HTTP requests. Parses input, calls service, returns response. Never contains business logic.

**Service**: Contains business logic. Injected into controllers. Injected with repositories.

**Provider**: Any class that can be injected (services, repositories, factories, helpers).

**Guard**: Runs before a route handler — decides if access is allowed (auth/authorization).

**Interceptor**: Wraps a request/response — for logging, caching, transformation.

**Pipe**: Validates and transforms incoming data.

**Filter**: Catches exceptions and formats error responses.

---

## Basic Examples

### Installation and Project Setup

```bash
# Install NestJS CLI globally
npm install -g @nestjs/cli

# Create new project
nest new my-api
cd my-api
npm run start:dev

# Generate components
nest generate module users
nest generate controller users
nest generate service users

# Or in short:
nest g module users
nest g controller users
nest g service users
nest g resource orders   # generates full CRUD: module, controller, service, DTOs
```

### Project Structure

```
src/
├── app.module.ts          ← root module
├── main.ts                ← bootstrap
├── users/
│   ├── users.module.ts
│   ├── users.controller.ts
│   ├── users.service.ts
│   ├── users.repository.ts
│   ├── dto/
│   │   ├── create-user.dto.ts
│   │   └── update-user.dto.ts
│   └── entities/
│       └── user.entity.ts
├── auth/
│   ├── auth.module.ts
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── guards/
│   │   ├── jwt.guard.ts
│   │   └── roles.guard.ts
│   └── strategies/
│       └── jwt.strategy.ts
└── common/
    ├── filters/
    │   └── http-exception.filter.ts
    ├── interceptors/
    │   └── logging.interceptor.ts
    └── pipes/
        └── validation.pipe.ts
```

### Main Application Bootstrap

```typescript
// main.ts
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global prefix
  app.setGlobalPrefix("api/v1");

  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,          // strip unknown properties
    forbidNonWhitelisted: true, // throw error on unknown properties
    transform: true,          // auto-transform types (string → number)
    transformOptions: { enableImplicitConversion: true }
  }));

  // CORS
  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(",") ?? "*",
    credentials: true
  });

  // Swagger
  const config = new DocumentBuilder()
    .setTitle("My API")
    .setVersion("1.0")
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("docs", app, document);

  // Graceful shutdown
  app.enableShutdownHooks();

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`Application running on: http://localhost:${port}/api/v1`);
}

bootstrap();
```

### Module

```typescript
// users/users.module.ts
import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";
import { User } from "./entities/user.entity";

@Module({
  imports: [TypeOrmModule.forFeature([User])],  // inject User repository
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],   // make UsersService available to other modules
})
export class UsersModule {}
```

### Controller

```typescript
// users/users.controller.ts
import {
  Controller, Get, Post, Body, Patch, Param, Delete,
  Query, UseGuards, ParseUUIDPipe, HttpCode, HttpStatus
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { UsersService } from "./users.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { JwtAuthGuard } from "../auth/guards/jwt.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { RolesGuard } from "../auth/guards/roles.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";

@ApiTags("users")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles("admin")
  @ApiOperation({ summary: "Create a new user (admin only)" })
  async create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Get()
  async findAll(
    @Query("page") page = 1,
    @Query("limit") limit = 20,
    @Query("search") search?: string
  ) {
    return this.usersService.findAll({ page: +page, limit: +limit, search });
  }

  @Get("me")
  getProfile(@CurrentUser() user: Express.User) {
    return this.usersService.findById(user.id);
  }

  @Get(":id")
  async findOne(@Param("id", ParseUUIDPipe) id: string) {
    return this.usersService.findById(id);
  }

  @Patch(":id")
  async update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto
  ) {
    return this.usersService.update(id, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(RolesGuard)
  @Roles("admin")
  async remove(@Param("id", ParseUUIDPipe) id: string) {
    await this.usersService.delete(id);
  }
}
```

### Service

```typescript
// users/users.service.ts
import { Injectable, NotFoundException, ConflictException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, ILike } from "typeorm";
import * as bcrypt from "bcrypt";
import { User } from "./entities/user.entity";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>
  ) {}

  async create(dto: CreateUserDto): Promise<User> {
    const existing = await this.userRepository.findOne({
      where: { email: dto.email }
    });
    if (existing) throw new ConflictException("Email already registered");

    const hash = await bcrypt.hash(dto.password, 12);
    const user = this.userRepository.create({ ...dto, password: hash });
    return this.userRepository.save(user);
  }

  async findAll({ page, limit, search }: {
    page: number; limit: number; search?: string
  }) {
    const [users, total] = await this.userRepository.findAndCount({
      where: search ? { name: ILike(`%${search}%`) } : {},
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: "DESC" }
    });

    return {
      data: users,
      meta: { total, page, limit, pages: Math.ceil(total / limit) }
    };
  }

  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.findById(id);
    if (dto.password) {
      dto.password = await bcrypt.hash(dto.password, 12);
    }
    Object.assign(user, dto);
    return this.userRepository.save(user);
  }

  async delete(id: string): Promise<void> {
    const user = await this.findById(id);
    await this.userRepository.remove(user);
  }
}
```

### DTOs with Class-Validator

```typescript
// dto/create-user.dto.ts
import { IsEmail, IsString, MinLength, IsEnum, IsOptional } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export enum UserRole {
  USER  = "user",
  ADMIN = "admin",
}

export class CreateUserDto {
  @ApiProperty({ example: "Alice Smith" })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ example: "alice@example.com" })
  @IsEmail()
  email: string;

  @ApiProperty({ example: "SecurePass123!", minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({ enum: UserRole, default: UserRole.USER })
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole = UserRole.USER;
}

// dto/update-user.dto.ts
import { PartialType } from "@nestjs/swagger";

// PartialType makes all CreateUserDto fields optional, preserves decorators
export class UpdateUserDto extends PartialType(CreateUserDto) {}
```

---

## Intermediate Concepts

### Dependency Injection

NestJS has a built-in IoC (Inversion of Control) container. Classes decorated with `@Injectable()` are managed by the container.

```typescript
// Three ways to provide services

// 1. Class provider (most common)
@Module({
  providers: [UsersService]
})

// 2. Custom value provider
@Module({
  providers: [
    {
      provide: "CONFIG",
      useValue: { maxRetries: 3, timeout: 5000 }
    }
  ]
})
// Inject with:
constructor(@Inject("CONFIG") private config: AppConfig) {}

// 3. Factory provider (async dependencies)
@Module({
  providers: [
    {
      provide: "DATABASE",
      useFactory: async (configService: ConfigService) => {
        return createConnection({ url: configService.get("DB_URL") });
      },
      inject: [ConfigService]
    }
  ]
})

// 4. Existing provider (alias)
@Module({
  providers: [
    { provide: "OldEmailService", useExisting: EmailService }
  ]
})
```

### Guards (Authentication & Authorization)

```typescript
// auth/guards/jwt.guard.ts
import { Injectable, ExecutionContext } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }
}

// auth/guards/roles.guard.ts
import { Injectable, CanActivate, ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ROLES_KEY } from "../decorators/roles.decorator";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY, [context.getHandler(), context.getClass()]
    );
    if (!requiredRoles) return true;

    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.some(role => user.roles?.includes(role));
  }
}

// auth/decorators/roles.decorator.ts
import { SetMetadata } from "@nestjs/common";
export const ROLES_KEY = "roles";
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

// auth/decorators/current-user.decorator.ts
import { createParamDecorator, ExecutionContext } from "@nestjs/common";
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) =>
    ctx.switchToHttp().getRequest().user
);
```

### Interceptors

```typescript
// common/interceptors/logging.interceptor.ts
import {
  Injectable, NestInterceptor, ExecutionContext, CallHandler
} from "@nestjs/common";
import { Observable } from "rxjs";
import { tap, map } from "rxjs/operators";

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const now = Date.now();

    return next.handle().pipe(
      tap(() => {
        const ms = Date.now() - now;
        console.log(`${req.method} ${req.url} ${ms}ms`);
      })
    );
  }
}

// common/interceptors/transform.interceptor.ts
// Wraps all responses in { data, statusCode, timestamp }
@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map(data => ({
        data,
        statusCode: context.switchToHttp().getResponse().statusCode,
        timestamp: new Date().toISOString()
      }))
    );
  }
}

// Register globally in main.ts:
app.useGlobalInterceptors(new TransformInterceptor());
```

### Exception Filters

```typescript
// common/filters/http-exception.filter.ts
import {
  ExceptionFilter, Catch, ArgumentsHost,
  HttpException, HttpStatus
} from "@nestjs/common";
import { Request, Response } from "express";

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx    = host.switchToHttp();
    const res    = ctx.getResponse<Response>();
    const req    = ctx.getRequest<Request>();

    let status  = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = "Internal server error";
    let details: any = null;

    if (exception instanceof HttpException) {
      status  = exception.getStatus();
      const response = exception.getResponse();
      if (typeof response === "object") {
        message = (response as any).message || message;
        details = (response as any).details || null;
      } else {
        message = response as string;
      }
    } else if (exception instanceof Error) {
      // Unknown error — log it
      console.error("Unexpected error:", exception);
    }

    res.status(status).json({
      error: {
        statusCode: status,
        message,
        ...(details && { details }),
        timestamp: new Date().toISOString(),
        path: req.url
      }
    });
  }
}
```

### Configuration Module

```typescript
// npm install @nestjs/config

// app.module.ts
import { ConfigModule, ConfigService } from "@nestjs/config";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,                    // no need to import in sub-modules
      envFilePath: [".env.local", ".env"],
      validationSchema: Joi.object({     // validate env vars at startup
        NODE_ENV: Joi.string().valid("development", "production", "test").default("development"),
        PORT: Joi.number().default(3000),
        DATABASE_URL: Joi.string().required(),
        JWT_SECRET: Joi.string().min(32).required(),
      })
    }),
    ...
  ]
})

// Using ConfigService
@Injectable()
export class AuthService {
  constructor(private configService: ConfigService) {}

  signToken(payload: object) {
    return this.jwtService.sign(payload, {
      secret: this.configService.get<string>("JWT_SECRET"),
      expiresIn: this.configService.get<string>("JWT_EXPIRES_IN", "15m")
    });
  }
}
```

---

## Advanced Concepts

### Microservices with NestJS

```typescript
// npm install @nestjs/microservices

// orders.service.ts (microservice)
import { NestFactory } from "@nestjs/core";
import { Transport, MicroserviceOptions } from "@nestjs/microservices";

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.RMQ,
      options: {
        urls: [process.env.RABBITMQ_URL],
        queue: "orders_queue",
        queueOptions: { durable: true }
      }
    }
  );
  await app.listen();
}

// orders.controller.ts (microservice)
import { MessagePattern, EventPattern, Payload } from "@nestjs/microservices";

@Controller()
export class OrdersController {
  @MessagePattern("get_order")          // RPC: request-response
  async getOrder(@Payload() id: string) {
    return this.ordersService.findById(id);
  }

  @EventPattern("order_placed")         // Event: fire-and-forget
  async handleOrderPlaced(@Payload() order: any) {
    await this.inventoryService.reserveItems(order.items);
  }
}
```

### NestJS with TypeORM

```typescript
// npm install @nestjs/typeorm typeorm pg

// app.module.ts
TypeOrmModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    type: "postgres",
    url: config.get("DATABASE_URL"),
    entities: [__dirname + "/**/*.entity{.ts,.js}"],
    migrations: [__dirname + "/migrations/**/*{.ts,.js}"],
    synchronize: config.get("NODE_ENV") !== "production",  // NEVER in prod
    logging: config.get("NODE_ENV") === "development",
    ssl: config.get("NODE_ENV") === "production"
      ? { rejectUnauthorized: false }
      : false
  })
})

// user.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";

@Entity("users")
export class User {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column({ unique: true, length: 255 })
  email: string;

  @Column({ select: false })  // never included in queries by default
  password: string;

  @Column({ type: "enum", enum: UserRole, default: UserRole.USER })
  role: UserRole;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

### Testing in NestJS

```typescript
// users/users.service.spec.ts
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ConflictException, NotFoundException } from "@nestjs/common";
import { UsersService } from "./users.service";
import { User } from "./entities/user.entity";

describe("UsersService", () => {
  let service: UsersService;
  let repository: jest.Mocked<Repository<User>>;

  beforeEach(async () => {
    const mockRepository = {
      findOne: jest.fn(),
      findAndCount: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn()
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: mockRepository }
      ]
    }).compile();

    service = module.get<UsersService>(UsersService);
    repository = module.get(getRepositoryToken(User));
  });

  describe("create", () => {
    it("throws ConflictException if email exists", async () => {
      repository.findOne.mockResolvedValueOnce({ id: "1" } as User);

      await expect(service.create({ name: "A", email: "a@a.com", password: "pass" }))
        .rejects.toThrow(ConflictException);
    });

    it("creates user with hashed password", async () => {
      repository.findOne.mockResolvedValueOnce(null);
      repository.create.mockReturnValue({ id: "new" } as User);
      repository.save.mockResolvedValueOnce({ id: "new", email: "a@a.com" } as User);

      const user = await service.create({ name: "Alice", email: "a@a.com", password: "pass123" });

      expect(user.email).toBe("a@a.com");
      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({ email: "a@a.com" })
      );
    });
  });

  describe("findById", () => {
    it("throws NotFoundException if not found", async () => {
      repository.findOne.mockResolvedValueOnce(null);
      await expect(service.findById("nonexistent")).rejects.toThrow(NotFoundException);
    });
  });
});
```

---

## Industry Usage

NestJS is the dominant enterprise Node.js framework:
- **Monorepo support** via Nx workspace integration
- **Microservices**: native support for RabbitMQ, Kafka, Redis, NATS, gRPC
- **GraphQL**: `@nestjs/graphql` with code-first or schema-first
- **WebSockets**: `@nestjs/websockets`
- **Queues**: `@nestjs/bull` for background job processing
- **CLI**: project generation, code generation (resources, guards, interceptors)

Companies: Adidas, Autodesk, Roche, Tripadvisor, major fintech firms

---

## Security

```typescript
// Rate limiting per route
import { Throttle, ThrottlerModule } from "@nestjs/throttler";

@Module({
  imports: [ThrottlerModule.forRoot([{ ttl: 60000, limit: 10 }])]
})

@UseGuards(ThrottlerGuard)
@Throttle({ default: { ttl: 60000, limit: 5 } })
@Post("login")
async login(...) {}

// Helmet
import * as helmet from "helmet";
app.use(helmet());

// CSRF protection
import * as csurf from "csurf";
app.use(csurf());
```

---

## Performance

```typescript
// Use Fastify instead of Express (2x faster)
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";

const app = await NestFactory.create<NestFastifyApplication>(
  AppModule,
  new FastifyAdapter({ logger: true })
);
await app.listen(3000, "0.0.0.0");

// Cache decorator
import { CacheInterceptor, CacheModule, CacheTTL } from "@nestjs/cache-manager";

@UseInterceptors(CacheInterceptor)
@CacheTTL(300)   // cache for 5 minutes
@Get("/products")
async getProducts() { ... }
```

---

## Debugging

```bash
# Debug mode
npm run start:debug         # attaches inspector

# Launch with nest CLI
nest start --debug --watch

# VS Code launch config
{
  "type": "node",
  "request": "attach",
  "name": "Attach NestJS",
  "port": 9229,
  "restart": true
}

# Common errors:
# "Nest can't resolve dependencies" — missing import in module
#   Check: is the provider in providers[]? Is the module imported?

# "Cannot read property of undefined" — DI not resolving
#   Check: @Injectable() decorator present?

# Circular dependency
# Use forwardRef(() => ModuleName)
@Module({
  imports: [forwardRef(() => AuthModule)]
})
```

---

## Interview Preparation

**Q1: What is dependency injection in NestJS?**
A: Dependency injection is a pattern where a class declares its dependencies as constructor parameters, and the IoC container creates and provides them. NestJS's container scans all providers decorated with `@Injectable()`, builds a dependency graph, and resolves them automatically. This decouples construction from usage, making testing easy (mock dependencies), and avoids singleton anti-patterns.

**Q2: What are the differences between a Guard, Interceptor, Pipe, and Filter?**
A: All four are middleware-like concepts but with different purposes. **Guards** run first and decide if a request proceeds (auth/authorization — return boolean). **Interceptors** wrap the execution — run code before AND after the handler (logging, caching, response transformation). **Pipes** transform or validate incoming data before it reaches the handler. **Filters** catch exceptions and format error responses (the equivalent of Express error middleware).

**Q3: What is the execution order in NestJS?**
A:
```
Request → Guards → Interceptors (before) → Pipes → Controller Handler
       → Interceptors (after) → Response
                    ↓ (if exception)
              Exception Filters
```

**Q4: How does the Module system work? What does `exports` do?**
A: A Module encapsulates providers. By default, providers are private — only accessible within the module. `exports` makes a provider available to modules that import this module. `imports` allows using providers exported by another module. `global: true` makes a module's exports available everywhere without importing.

**Q5: What is a Pipe and how do you use `ValidationPipe`?**
A: Pipes validate and transform incoming data. `ValidationPipe` uses class-validator decorators to validate DTOs. With `whitelist: true`, it strips properties not in the DTO. With `transform: true`, it coerces primitive types (string → number). Applied globally via `app.useGlobalPipes()` or per-route via `@UsePipes()`.

---

## Practical Tasks

### Beginner (10 Tasks)
1. Create a NestJS project and generate a full CRUD resource using `nest g resource`.
2. Add `ValidationPipe` globally and create a DTO with 5 validated fields.
3. Use `ConfigModule` to load environment variables and validate their presence at startup.
4. Add `helmet()` and configure CORS with an allowlist.
5. Create a custom exception filter that returns errors in a consistent format.
6. Use `ParseUUIDPipe` and `ParseIntPipe` on route parameters.
7. Create a `@CurrentUser()` custom decorator that extracts the user from the JWT.
8. Use `@Roles()` decorator with a guard to restrict an endpoint to admins.
9. Add Swagger with `@nestjs/swagger` and document all endpoints.
10. Write unit tests for a service using `Test.createTestingModule`.

### Intermediate (10 Tasks)
1. Implement JWT authentication with access + refresh tokens.
2. Add TypeORM integration with PostgreSQL and create an entity with relations.
3. Implement a caching interceptor that caches GET responses in Redis for 5 minutes.
4. Create a custom interceptor that transforms all responses to `{ data, timestamp }`.
5. Set up throttle rate limiting on auth endpoints (5 req/15min).
6. Add file upload with `@nestjs/platform-express` and `multer`.
7. Write E2E tests using `supertest` with an in-memory database.
8. Implement soft delete on an entity (add `deletedAt` column, filter from queries).
9. Create a health check module using `@nestjs/terminus`.
10. Set up request logging with Pino and structured JSON output.

### Advanced (10 Tasks)
1. Build a NestJS microservice with RabbitMQ transport.
2. Implement CQRS pattern using `@nestjs/cqrs` (commands and queries).
3. Set up a monorepo with Nx workspace containing API + shared libraries.
4. Implement GraphQL with `@nestjs/graphql` using code-first approach.
5. Build a background job queue with `@nestjs/bull` and Redis.
6. Implement event sourcing with NestJS and EventStoreDB.
7. Add distributed caching with Redis cluster via `@nestjs/cache-manager`.
8. Implement multi-tenancy using a request-scoped service that reads tenant from JWT.
9. Create a custom NestJS transport for a message broker (e.g., NATS or Kafka).
10. Implement real-time WebSockets with `@nestjs/websockets` and Socket.io.

---

## Mini Project

**Blog API with NestJS**: Build a complete blog API:
- Users: register, login, profile
- Posts: CRUD, categories, tags, pagination
- Comments: nested comments on posts
- Auth: JWT with refresh tokens, roles (user/admin)
- Validation: all DTOs with class-validator
- Documentation: Swagger
- Tests: unit + E2E

---

## Production Project

**Multi-Service E-Commerce Backend**:
- Users service (NestJS + PostgreSQL)
- Products service (NestJS + MongoDB)
- Orders service (NestJS + PostgreSQL)
- Event bus: RabbitMQ (order placed → update inventory)
- API Gateway: single NestJS app proxying to services
- Shared: auth, logging, error handling as Nx libraries

---

## Capstone Project

**Real-Time Chat API**: Build a production-grade chat API:
- WebSocket gateway (Socket.io) for real-time messaging
- REST endpoints for history, rooms, users
- JWT auth on WebSocket connections
- Redis pub/sub for horizontal scaling (multiple instances)
- Message persistence (PostgreSQL)
- Microservices: notification service sends push notifications on message
- Full test suite with Jest and E2E tests

---

## Self Assessment
1. What are the 5 core NestJS building blocks?
2. What is the execution order of Guards, Interceptors, Pipes, and Filters?
3. What does `@Injectable()` do?
4. What is the difference between `providers`, `imports`, and `exports` in a module?
5. How does `ValidationPipe` work with class-validator DTOs?
6. What is a Guard? What interface does it implement?
7. What is an Interceptor? What interface does it implement?
8. What is the difference between `forRoot()` and `forRootAsync()`?
9. How do you make a provider available to all modules without importing?
10. What is `PartialType` from `@nestjs/swagger`?
11. How do you write unit tests for a NestJS service?
12. What is `ConfigModule.forRoot({ isGlobal: true })`?
13. What is the difference between `@Controller()` and a Provider?
14. How do you use Fastify instead of Express in NestJS?
15. What is the CQRS pattern and how does `@nestjs/cqrs` implement it?

---

## Cheat Sheet

### Generate Commands
```bash
nest g module <name>
nest g controller <name>
nest g service <name>
nest g resource <name>     # full CRUD boilerplate
nest g guard <name>
nest g interceptor <name>
nest g pipe <name>
nest g filter <name>
nest g decorator <name>
nest g middleware <name>
```

### Key Decorators
```typescript
// Module-level
@Module({ imports, controllers, providers, exports })

// Controller
@Controller("path")
@UseGuards(GuardClass)
@UseInterceptors(InterceptorClass)
@UsePipes(PipeClass)

// Route
@Get(":id") @Post() @Patch(":id") @Delete(":id")
@HttpCode(HttpStatus.NO_CONTENT)
@Header("key", "value")

// Parameter
@Param("id") @Param("id", ParseUUIDPipe)
@Body() @Body("field")
@Query("page")
@Req() @Res({ passthrough: true })

// Service
@Injectable()
@InjectRepository(Entity)
@Inject("TOKEN")

// DTO
@IsString() @IsEmail() @IsEnum() @MinLength() @IsOptional()
@ApiProperty() @ApiPropertyOptional()
```

### Execution Order
```
Middleware → Guards → Interceptors → Pipes → Handler → Interceptors → Filter (errors)
```
