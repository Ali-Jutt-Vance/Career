# Phase 2 — Chapter 22: API Documentation

---

## Chapter Overview

API documentation is not optional — it's a product. Whether internal (consumed by your own team) or external (consumed by third-party developers), documentation determines how quickly others can integrate with your API.

**Modern API documentation:**
- OpenAPI 3.0 (formerly Swagger) — machine-readable API specification
- Swagger UI / ReDoc — interactive documentation UIs
- Postman Collections — shareable API request collections
- JSDoc annotations — code-adjacent documentation
- SDK generation — auto-generate client libraries from spec

---

## Beginner Theory

### OpenAPI 3.0 Overview

```yaml
# openapi.yaml — the spec format

openapi: "3.0.3"

info:
  title:       "MyApp API"
  version:     "2.0.0"
  description: "RESTful API for MyApp"
  contact:
    email: "api@myapp.com"
  license:
    name: "MIT"

servers:
  - url: "https://api.myapp.com/v2"
    description: "Production"
  - url: "http://localhost:3000/api/v2"
    description: "Development"

security:
  - bearerAuth: []

components:
  securitySchemes:
    bearerAuth:
      type:   http
      scheme: bearer
      bearerFormat: JWT

  schemas:
    User:
      type: object
      required: [id, email, name]
      properties:
        id:        { type: string,   format: uuid }
        email:     { type: string,   format: email }
        name:      { type: string,   example: "Alice Smith" }
        role:      { type: string,   enum: [user, admin] }
        createdAt: { type: string,   format: date-time }

    Error:
      type: object
      required: [error]
      properties:
        error:   { type: string }
        details: { type: object }

paths:
  /users:
    get:
      summary:     "List users"
      operationId: "listUsers"
      tags:        [Users]
      parameters:
        - name:   page
          in:     query
          schema: { type: integer, default: 1 }
        - name:   limit
          in:     query
          schema: { type: integer, default: 20, maximum: 100 }
      responses:
        "200":
          description: "Paginated user list"
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:  { type: array, items: { $ref: "#/components/schemas/User" } }
                  total: { type: integer }
                  page:  { type: integer }
        "401":
          description: "Unauthorized"
          content:
            application/json:
              schema: { $ref: "#/components/schemas/Error" }

  /users/{id}:
    get:
      summary:     "Get user by ID"
      operationId: "getUserById"
      tags:        [Users]
      parameters:
        - name:     id
          in:       path
          required: true
          schema:   { type: string, format: uuid }
      responses:
        "200":
          description: "User found"
          content:
            application/json:
              schema: { $ref: "#/components/schemas/User" }
        "404":
          description: "User not found"
```

---

## Basic Examples

### swagger-jsdoc — Inline JSDoc

```javascript
// npm install swagger-jsdoc swagger-ui-express

const swaggerJSDoc   = require("swagger-jsdoc");
const swaggerUI      = require("swagger-ui-express");

const swaggerOptions = {
  definition: {
    openapi: "3.0.3",
    info: {
      title:   "MyApp API",
      version: "2.0.0"
    },
    servers: [{ url: process.env.API_URL || "http://localhost:3000" }],
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" }
      }
    },
    security: [{ bearerAuth: [] }]
  },
  apis: ["./routes/**/*.js", "./models/**/*.js"]  // glob to JSDoc comments
};

const swaggerSpec = swaggerJSDoc(swaggerOptions);

app.use("/api-docs", swaggerUI.serve, swaggerUI.setup(swaggerSpec, {
  customSiteTitle: "MyApp API Docs",
  swaggerOptions: {
    persistAuthorization: true,  // remember JWT across page refreshes
    displayRequestDuration: true
  }
}));

// Also expose raw JSON spec for tooling
app.get("/api-docs.json", (req, res) => res.json(swaggerSpec));
```

### Route JSDoc Annotations

```javascript
/**
 * @swagger
 * /api/users:
 *   post:
 *     summary: Create a new user
 *     tags: [Users]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - name
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: alice@example.com
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 example: SecureP@ss1
 *               name:
 *                 type: string
 *                 example: Alice Smith
 *     responses:
 *       201:
 *         description: User created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Email already exists
 */
router.post("/users", createUserValidator, createUser);

/**
 * @swagger
 * /api/users/{id}:
 *   patch:
 *     summary: Update a user
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:  { type: string }
 *               email: { type: string, format: email }
 *     responses:
 *       200:
 *         description: User updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       404:
 *         description: User not found
 */
router.patch("/users/:id", authenticate, authorize("user", "admin"), updateUser);
```

### Schema Component Definitions

```javascript
/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - id
 *         - email
 *         - name
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           readOnly: true
 *           example: 550e8400-e29b-41d4-a716-446655440000
 *         email:
 *           type: string
 *           format: email
 *           example: alice@example.com
 *         name:
 *           type: string
 *           example: Alice Smith
 *         role:
 *           type: string
 *           enum: [user, admin]
 *           example: user
 *         createdAt:
 *           type: string
 *           format: date-time
 *           readOnly: true
 *
 *     PaginatedUsers:
 *       type: object
 *       properties:
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/User'
 *         total:
 *           type: integer
 *           example: 120
 *         page:
 *           type: integer
 *           example: 1
 *         limit:
 *           type: integer
 *           example: 20
 *         totalPages:
 *           type: integer
 *           example: 6
 *
 *     Error:
 *       type: object
 *       required:
 *         - error
 *       properties:
 *         error:
 *           type: string
 *           example: "Validation failed"
 *         details:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               field:   { type: string }
 *               message: { type: string }
 */
```

---

## Intermediate Concepts

### ReDoc (Better UI Alternative)

```javascript
// npm install redoc-express

const redoc = require("redoc-express");

app.get("/redoc", redoc({
  title:   "MyApp API",
  specUrl: "/api-docs.json"
}));

// ReDoc advantages over Swagger UI:
// - Better typography and readability
// - Three-panel layout (navigation, content, examples)
// - Better for public API documentation
// - Mobile-friendly
```

### TypeScript Integration with tsoa

```typescript
// npm install tsoa express
// tsoa generates OpenAPI spec FROM TypeScript controllers — no JSDoc needed

// tsoa.json
{
  "entryFile": "src/app.ts",
  "specVersion": 3,
  "outputDirectory": "build",
  "routesDir": "src",
  "controllerPathGlobs": ["src/controllers/**/*.ts"]
}

// controllers/users.controller.ts
import { Controller, Get, Post, Route, Tags, Security, Body, Path } from "tsoa";

@Route("users")
@Tags("Users")
@Security("bearerAuth")
export class UsersController extends Controller {
  @Get("{id}")
  public async getUser(@Path() id: string): Promise<UserResponse> {
    return await usersService.findById(id);
  }

  @Post()
  public async createUser(@Body() body: CreateUserDto): Promise<UserResponse> {
    this.setStatus(201);
    return await usersService.create(body);
  }
}

// Run: tsoa spec-and-routes
// Generates: build/swagger.json + src/routes.ts
```

### Postman Collection

```javascript
// Export spec to Postman format
const { default: converter } = require("openapi-to-postmanv2");

const inputSpec = require("./openapi.json");
converter.convert({ type: "json", data: inputSpec }, {}, (err, result) => {
  const collection = result.output[0].data;
  fs.writeFileSync("postman-collection.json", JSON.stringify(collection, null, 2));
});
```

---

## Advanced Concepts

### SDK Generation with OpenAPI Generator

```bash
# Generate TypeScript client SDK from OpenAPI spec
npx @openapitools/openapi-generator-cli generate \
  -i openapi.yaml \
  -g typescript-axios \
  -o sdk/typescript

# Generate Python client
npx @openapitools/openapi-generator-cli generate \
  -i openapi.yaml \
  -g python \
  -o sdk/python

# Publish SDK to npm
# cd sdk/typescript && npm publish
```

### API Documentation Testing

```javascript
// Validate your API responses MATCH the OpenAPI spec
// npm install express-openapi-validator

const { OpenApiValidator } = require("express-openapi-validator");

app.use(new OpenApiValidator({
  apiSpec:           "./openapi.yaml",
  validateRequests:  true,   // validate incoming requests
  validateResponses: true    // validate outgoing responses (use in dev/test)
}).middleware());

// In tests: use spectral to lint the OpenAPI spec
// npx spectral lint openapi.yaml --ruleset=@stoplight/spectral-rulesets
```

---

## Interview Preparation

**Q1: What is the difference between Swagger and OpenAPI?**
A: OpenAPI is the specification (a standard for describing REST APIs in YAML or JSON). Swagger is the original brand name that was donated to the Linux Foundation and renamed to OpenAPI Specification starting at version 3.0. Now "Swagger" typically refers to the tooling ecosystem: Swagger UI (the interactive browser documentation), Swagger Editor (online YAML editor), and swagger-jsdoc (generates OpenAPI from JSDoc comments). OpenAPI 3.0 added better support for webhooks, links between operations, and more expressive schemas compared to OpenAPI 2.0 (still called Swagger 2.0).

**Q2: How do you keep API documentation synchronized with the actual implementation?**
A: Three approaches: 1) Code-first with annotations — JSDoc swagger comments are written next to the route handlers, reducing the chance of drift. 2) Code-first with reflection — tsoa or NestJS Swagger generate the spec automatically from TypeScript types/decorators, guaranteeing the spec matches the code. 3) Contract testing — use `express-openapi-validator` to validate actual requests and responses against the spec at test time, causing tests to fail if they diverge. The worst approach is maintaining a separate YAML file by hand — it drifts immediately.

**Q3: What is an OpenAPI schema component and why use `$ref`?**
A: Components are reusable schema definitions stored under `#/components/schemas`. `$ref: "#/components/schemas/User"` references a component from multiple places without duplicating the schema. This ensures consistency (if User schema changes, all references are updated automatically), enables SDK generators to create proper types, and reduces the spec file size. Always extract frequently-used schemas (User, Error, Pagination) as components rather than inlining them in each route.

---

## Practical Tasks

### Beginner (10 Tasks)
1. Install swagger-jsdoc and swagger-ui-express, mount at `/api-docs`.
2. Write JSDoc `@swagger` annotations for a GET /users endpoint.
3. Write JSDoc `@swagger` annotation for POST /users with requestBody.
4. Define `User` and `Error` as reusable components/schemas.
5. Add auth header security scheme (bearerAuth) to all endpoints.
6. Add example values to all schema properties.
7. Expose raw JSON spec at `/api-docs.json`.
8. Test the interactive UI — execute a real API call from Swagger UI.
9. Set up ReDoc at `/redoc` as an alternative documentation UI.
10. Tag endpoints by resource (Users, Auth, Products).

### Intermediate (10 Tasks)
1. Implement tsoa (TypeScript-first spec generation from decorators).
2. Set up NestJS Swagger module with auto-generated spec.
3. Add OpenAPI request/response validation middleware.
4. Export OpenAPI spec to Postman Collection format.
5. Add pagination parameters (page, limit, sort) as reusable components.
6. Document all error responses (400, 401, 403, 404, 429, 500).
7. Add server URLs for dev, staging, and production environments.
8. Add `deprecated: true` to endpoints that are being removed.
9. Run Spectral linter on your OpenAPI spec and fix all warnings.
10. Generate TypeScript SDK from OpenAPI spec using openapi-generator.

### Advanced (10 Tasks)
1. Publish SDK to npm with proper TypeScript types.
2. Set up automated spec validation in CI (fail PR if spec is invalid).
3. Implement versioned API docs: /api-docs/v1 and /api-docs/v2.
4. Build a public developer portal with guides + API reference.
5. Add webhooks documentation to OpenAPI spec.
6. Implement API changelog page (latest changes per version).
7. Set up contract testing: API responses must match OpenAPI schema.
8. Add response examples with realistic fake data.
9. Implement search across API documentation.
10. Build client SDK for Python using openapi-generator, publish to PyPI.

---

## Self Assessment
1. What is OpenAPI?
2. What is the difference between swagger-jsdoc and tsoa?
3. What is a `$ref` in OpenAPI?
4. What is the `components/schemas` section used for?
5. What are the three ways to document APIs (in terms of code/spec relationship)?
6. What is Swagger UI vs. ReDoc?
7. What is `express-openapi-validator` used for?
8. How do you add JWT auth to Swagger UI so you can test protected routes?
9. What is an OpenAPI `security scheme`?
10. What is the difference between OpenAPI 2.0 and OpenAPI 3.0?

---

## Cheat Sheet

```javascript
// Setup
const spec = swaggerJSDoc({ definition: { openapi: "3.0.3", info: {...} }, apis: ["./routes/**/*.js"] });
app.use("/api-docs", swaggerUI.serve, swaggerUI.setup(spec));
app.get("/api-docs.json", (req, res) => res.json(spec));

// JSDoc annotation structure
/**
 * @swagger
 * /api/resource:
 *   get:
 *     summary: Short description
 *     tags: [ResourceName]
 *     parameters:
 *       - in: path | query | header
 *         name: paramName
 *         required: true | false
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/SomeSchema' }
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/SomeSchema' }
 *       404:
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
```
