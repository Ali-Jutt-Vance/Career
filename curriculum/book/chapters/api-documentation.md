# API Documentation

> [!GOALS]
> - Explain why documentation is part of an API, not an extra, and who reads it.
> - Read and write an **OpenAPI** description: paths, operations, parameters, schemas, responses, security and examples.
> - Choose between **design-first** and **code-first**, and keep one source of truth for validation, types and documentation.
> - Keep documentation **true** with linting, contract tests and breaking-change checks in CI.
> - Generate **interactive reference pages**, **typed clients** and SDKs from the description.
> - Write the parts that tools cannot generate: getting-started guides, authentication, errors, pagination, limits, webhooks and changelogs.

## Why this matters

An API without good documentation is a locked door with the key hidden somewhere in the source code. A partner developer trying to integrate with the Corner Shop's order API needs answers fast: How do I authenticate? What does an order look like? Which fields are required when creating one? What does error `409` mean here? Is `status` always one of these three values? How many requests may I make? If the answers are missing, outdated or wrong, they guess — and wrong guesses become support tickets, broken integrations and partners who give up.

Documentation is also how teams inside one company work together. The mobile team reads the back-end team's API description; the back-end team reads the payment provider's. **Machine-readable** descriptions do even more: they generate interactive reference pages, typed client code, mock servers, tests and change checks. The API description becomes the **contract** at the centre of everything in {{ch:api-versioning}}.

The biggest danger is **drift**: documentation that once was right and silently stopped being right. Wrong documentation is worse than none, because people trust it. This chapter is about writing documentation people can use, and about the tooling that keeps it true.

## The simple idea

Think of the instruction manual for a piece of flat-pack furniture. A good manual has a parts list (what exactly is in the box), step-by-step pictures (how to build the common thing), warnings (do not overtighten this screw), and a support number. And crucially, it matches the **actual** parts in the box — a manual for last year's model is worse than useless.

API documentation is the manual for your API. The **reference** is the parts list: every endpoint, field and error. **Guides** are the step-by-step pictures for common tasks. **Error and limit documentation** are the warnings. And the most important property is that it matches the API that is really running.

> [!ANALOGY]
> API documentation is like a furniture assembly manual: a complete parts list (the reference), step-by-step instructions for common tasks (guides), warnings (errors and limits) — and it must match the parts actually in the box.
>
> **Where the analogy breaks:** a paper manual is printed once with the product. An API changes every week, so its documentation cannot be written once and left alone. It has to be generated from, or automatically checked against, the running code — otherwise it starts drifting the day after it is published.

## The proper definition and key words

**API documentation** is the set of materials that tell developers how to use an API correctly: a precise reference of operations and data, plus guides, examples, and explanations of authentication, errors, limits and changes.

Key words:

- **OpenAPI Specification** — the standard, machine-readable format (YAML or JSON) for describing HTTP APIs. Formerly called Swagger; version 3.1 aligns its schemas with JSON Schema, and newer 3.x releases continue to add features.
- **Swagger** — today, the name of a family of tools around OpenAPI (Swagger UI, Swagger Editor).
- **Operation** — one method on one path, such as `GET /orders/{id}`, with its parameters and responses.
- **Schema** — a description of a data structure (types, required fields, formats, enums), written in JSON Schema.
- **Component** — a reusable definition (schema, parameter, response, security scheme) referenced with `$ref`.
- **Design-first** — writing the API description before the code. **Code-first** — generating it from the code.
- **Contract test** — an automated test checking that the real API behaves as its description says.
- **Linting** — automatically checking a description against style and quality rules (for example, with Spectral).
- **SDK** (software development kit) — a client library for calling an API from a particular language.
- **Problem Details** — a standard JSON format for HTTP error responses (RFC 9457).
- **AsyncAPI** — a specification, similar to OpenAPI, for event-driven APIs and message channels.

## OpenAPI

### Level 1 — The shape of a description

```yaml
openapi: 3.1.0
info:
  title: Corner Shop API
  version: 2.4.0
  description: Orders, products and customers for Corner Shop partners.
servers:
  - url: https://api.cornershop.example/v2
security:
  - bearerAuth: []                      # every operation needs a token unless it says otherwise
paths:
  /orders/{orderId}:
    get:
      operationId: getOrder
      summary: Get an order
      tags: [Orders]
      parameters:
        - name: orderId
          in: path
          required: true
          schema: { type: string, example: ord_1042 }
      responses:
        "200":
          description: The order.
          content:
            application/json:
              schema: { $ref: "#/components/schemas/Order" }
              example: { id: ord_1042, status: SHIPPED, total: { amount: "59.90", currency: GBP } }
        "404":
          $ref: "#/components/responses/NotFound"
components:
  securitySchemes:
    bearerAuth: { type: http, scheme: bearer }
  schemas:
    Order:
      type: object
      required: [id, status, total]
      properties:
        id: { type: string }
        status:
          type: string
          enum: [PAID, SHIPPED, DELIVERED]
          description: New values may be added in future; treat unknown values as "other".
        total: { $ref: "#/components/schemas/Money" }
    Money:
      type: object
      required: [amount, currency]
      properties:
        amount: { type: string, pattern: '^\d+\.\d{2}$', description: Decimal amount in major units. }
        currency: { type: string, minLength: 3, maxLength: 3, description: ISO 4217 currency code. }
  responses:
    NotFound:
      description: No resource with that id is visible to you.
      content:
        application/problem+json:
          schema: { $ref: "#/components/schemas/Problem" }
```

The main parts:

- **`info`** and **`servers`** — what the API is and where it runs.
- **`paths`** — each path with its **operations** (`get`, `post`…). Each operation has a stable **`operationId`** (used as a function name in generated clients), a **`summary`**, **parameters** (`path`, `query`, `header`, `cookie`), an optional **`requestBody`**, and **`responses`** by status code.
- **`components`** — reusable **schemas**, **responses**, **parameters** and **security schemes**, referenced with **`$ref`**. Define `Order`, `Money` and `Problem` once and refer to them everywhere.
- **`security`** — how clients authenticate (bearer tokens, API keys, OAuth 2.0 flows, {{ch:oauth}}).
- **Descriptions and examples** — the human part. The note on `status` ("new values may be added") is exactly the kind of promise clients need ({{ch:api-versioning}}).

### Level 2 — What the description powers

A single OpenAPI document can produce:

- **Interactive reference pages** — Swagger UI, Redoc, Scalar and others render every operation with schemas and examples, often with a "try it" console.
- **Typed clients** — tools such as `openapi-typescript`, Orval or OpenAPI Generator create TypeScript types or full clients, so front ends get compile errors when the API changes ({{ch:typescript-advanced}}).
- **Server validation** — middleware that validates requests (and, in tests, responses) against the description.
- **Mock servers** — fake APIs built from examples, so front-end work can start before the back end exists.
- **Tests and checks** — contract tests, linting and breaking-change detection.
- **Collections** for tools like Postman or Bruno, and imports into API gateways ({{ch:api-gateway}}).

## Keeping one source of truth

### Level 2 — Design-first or code-first

| Approach | How | Strengths | Risks |
|---|---|---|---|
| **Design-first** | Write the OpenAPI document, review it, then implement (often generating server stubs or validation from it) | API designed around clients; reviewable before code exists; parallel front-end work with mocks | Code can drift from the document unless validated against it |
| **Code-first** | Generate the document from code: NestJS decorators ({{ch:nestjs-advanced}}), schema libraries, frameworks with built-in OpenAPI | Document always reflects the code; little duplication | API shape decided by whoever writes the code; can leak implementation details |

Both work if the document and the code **cannot disagree silently**. The worst option — sadly common — is a hand-written YAML file nobody connects to the code: it is out of date within weeks.

### Level 3 — Generating schemas from the validation code

In a code-first TypeScript API, the same schema can validate requests at runtime **and** produce the documentation. Zod (version 4) converts schemas to JSON Schema directly ({{ch:validation}}):

```ts
import { z } from "zod";

// One definition of each shape: used for validation at runtime AND for the documentation
const Money = z.object({
  amount: z.string().regex(/^\d+\.\d{2}$/).meta({ description: "Decimal amount in major units", example: "59.90" }),
  currency: z.string().length(3).meta({ example: "GBP" }),
});
const Order = z.object({
  id: z.string().meta({ example: "ord_1042" }),
  status: z.enum(["PAID", "SHIPPED", "DELIVERED"]).meta({ description: "New values may be added; handle unknown values." }),
  total: Money,
});
const Problem = z.object({
  type: z.string(), title: z.string(), status: z.int(), detail: z.string().optional(),
});

const schemas = Object.fromEntries(
  Object.entries({ Money, Order, Problem }).map(([name, s]) => [name, z.toJSONSchema(s, { target: "openapi-3.0" })]),
);

const openapi = {
  openapi: "3.0.3",
  info: { title: "Corner Shop API", version: "2.4.0" },
  paths: {
    "/orders/{id}": {
      get: {
        operationId: "getOrder",
        summary: "Get an order",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "The order", content: { "application/json": { schema: { $ref: "#/components/schemas/Order" } } } },
          "404": { description: "No such order", content: { "application/problem+json": { schema: { $ref: "#/components/schemas/Problem" } } } },
        },
      },
    },
  },
  components: { schemas },
};

console.log(JSON.stringify(openapi.components.schemas.Order, null, 2));
```

**Output:**

```text
{
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "example": "ord_1042"
    },
    "status": {
      "type": "string",
      "enum": [
        "PAID",
        "SHIPPED",
        "DELIVERED"
      ],
      "description": "New values may be added; handle unknown values."
    },
    "total": {
      "type": "object",
      "properties": {
        "amount": {
          "type": "string",
          "pattern": "^\\d+\\.\\d{2}$",
          "description": "Decimal amount in major units",
          "example": "59.90"
        },
        "currency": {
          "type": "string",
          "minLength": 3,
          "maxLength": 3,
          "example": "GBP"
        }
      },
      "required": [
        "amount",
        "currency"
      ],
      "additionalProperties": false
    }
  },
  "required": [
    "id",
    "status",
    "total"
  ],
  "additionalProperties": false
}
```

- Every rule written for validation — the regular expression, the length, the enum, which fields are required — appears in the documentation automatically. Change the schema and both change together.
- `.meta()` adds the human parts: descriptions and examples.
- Notice `"additionalProperties": false`: Zod's default object schema rejects unknown keys. That is right for **requests** (no unexpected fields), but in **response** schemas it tells generated clients to reject any new field — the opposite of the tolerant reader advice in {{ch:api-versioning}}. For response schemas, use a loose object (`z.looseObject`) or remove that flag when generating the document.
- Libraries build complete OpenAPI documents this way (for example, helpers for Zod, `@nestjs/swagger` from NestJS DTOs, and frameworks with built-in OpenAPI generation); the example assembles a tiny document by hand to show the principle.

### Level 3 — Contract tests: checking the API against its documentation

Even with generation, code paths can bypass the schemas — a handler that builds its response by hand, a refactor that renames a field. A **contract test** calls the real API and checks every response against the documented schema:

```ts
import express from "express";
import { z } from "zod";
import type { AddressInfo } from "node:net";

// The documented contract (in a real project: generated from, or checked against, openapi.yaml)
const Order = z.object({
  id: z.string(),
  status: z.enum(["PAID", "SHIPPED", "DELIVERED"]),
  total: z.object({ amount: z.string().regex(/^\d+\.\d{2}$/), currency: z.string().length(3) }),
});

// The implementation — someone "simplified" one endpoint and forgot the docs
const app = express();
app.get("/orders/1042", (_req, res) => res.json({ id: "1042", status: "SHIPPED", total: { amount: "59.90", currency: "GBP" } }));
app.get("/orders/1043", (_req, res) => res.json({ id: "1043", status: "PACKED", total: 12.5 }));
const server = app.listen(0);
await new Promise((r) => server.once("listening", r));
const base = `http://localhost:${(server.address() as AddressInfo).port}`;

// The contract test: call the real API, check every response against the documented schema
let failures = 0;
for (const path of ["/orders/1042", "/orders/1043"]) {
  const result = Order.safeParse(await (await fetch(base + path)).json());
  if (result.success) {
    console.log(`PASS ${path}`);
  } else {
    failures++;
    console.log(`FAIL ${path}`);
    for (const issue of result.error.issues) console.log(`  ${issue.path.join(".") || "(root)"}: ${issue.message}`);
  }
}
console.log(failures ? `${failures} endpoint(s) do not match the documentation` : "documentation matches");
server.close();
```

**Output:**

```text
PASS /orders/1042
FAIL /orders/1043
  status: Invalid option: expected one of "PAID"|"SHIPPED"|"DELIVERED"
  total: Invalid input: expected object, received number
1 endpoint(s) do not match the documentation
```

The test catches two kinds of drift in one endpoint: an undocumented status value (`PACKED`) and a changed type for `total`. Run such tests in CI against every documented endpoint — or use OpenAPI validation middleware that validates responses during the test suite — so the build fails when code and documentation disagree ({{ch:testing}}). Large organisations add **consumer-driven contract tests** (for example, with Pact), where each client team records the exact interactions it relies on and the provider verifies them on every change.

### Level 3 — Linting and change checks

Two more automated checks complete the picture:

- **Linting** enforces quality and consistency rules: every operation has an `operationId` and summary, errors are documented, names follow conventions, examples exist. **Spectral** is the most widely used OpenAPI linter, with built-in rules and custom rule sets for a company style guide. Here is the idea in miniature:

```ts
// A miniature documentation linter, in the spirit of Spectral rules
type Operation = {
  operationId?: string; summary?: string; description?: string; security?: unknown[];
  responses: Record<string, { description?: string; content?: Record<string, { example?: unknown; schema?: unknown }> }>;
};
type Spec = { paths: Record<string, Record<string, Operation>>; security?: unknown[] };

const rules: { id: string; check: (op: Operation, spec: Spec) => boolean }[] = [
  { id: "operation-id", check: (op) => !!op.operationId },
  { id: "operation-summary", check: (op) => !!op.summary },
  { id: "has-error-response", check: (op) => Object.keys(op.responses).some((code) => /^[45]/.test(code)) },
  { id: "has-auth-documented", check: (op, spec) => op.security !== undefined || spec.security !== undefined },
  {
    id: "success-has-example",
    check: (op) => Object.entries(op.responses).filter(([c]) => c.startsWith("2"))
      .every(([, r]) => Object.values(r.content ?? {}).every((m) => m.example !== undefined)),
  },
];

function lint(spec: Spec): string[] {
  const problems: string[] = [];
  for (const [path, methods] of Object.entries(spec.paths)) {
    for (const [method, op] of Object.entries(methods)) {
      for (const rule of rules) if (!rule.check(op, spec)) problems.push(`${method.toUpperCase()} ${path}: ${rule.id}`);
    }
  }
  return problems;
}

const spec: Spec = {
  security: [{ bearerAuth: [] }],
  paths: {
    "/orders/{id}": {
      get: {
        operationId: "getOrder", summary: "Get an order",
        responses: {
          "200": { description: "The order", content: { "application/json": { example: { id: "ord_1042", status: "SHIPPED" } } } },
          "404": { description: "No such order" },
        },
      },
    },
    "/orders": {
      post: { responses: { "201": { description: "Created", content: { "application/json": {} } } } },
    },
  },
};

const problems = lint(spec);
problems.forEach((p) => console.log("✗", p));
console.log(`${problems.length} problem(s)`);
```

**Output:**

```text
✗ POST /orders: operation-id
✗ POST /orders: operation-summary
✗ POST /orders: has-error-response
✗ POST /orders: success-has-example
4 problem(s)
```

- **Breaking-change detection** compares the new description with the published one and fails the build for breaking changes unless they are deliberate and versioned ({{ch:api-versioning}}).

Together — generation, contract tests, linting and change checks, all in CI ({{ch:cicd}}) — they make "the documentation is wrong" a build failure instead of a support ticket.

## What tools cannot write for you

### Level 2 — The documentation people actually read

A complete reference is necessary but not sufficient. Developers arrive with a goal ("charge a customer", "list today's orders"), not a desire to read every endpoint. Good API documentation has several kinds of content — a useful framework (Diátaxis) names four:

- **Tutorials / getting started** — from zero to a first successful call in minutes: create a key, make one request, see the result.
- **How-to guides** — task-focused recipes: "create an order with several items", "handle a refund", "sync products every night".
- **Reference** — every operation, field and error, generated from the description.
- **Explanation** — concepts: the order lifecycle, how money is represented, why idempotency keys exist.

### Level 3 — Topics every API must document

- **Authentication** — how to get credentials, how to send them, scopes, token lifetimes, and test versus live keys ({{ch:authentication}}).
- **Errors** — the error format (ideally **Problem Details**, RFC 9457, with `type`, `title`, `status`, `detail`), a list of error codes with causes and fixes, and which errors are worth retrying ({{ch:error-handling}}).
- **Pagination, filtering and sorting** — the style (cursor or offset), limits and defaults ({{ch:rest-apis}}).
- **Rate limits** — the limits, the headers that report them, and what to do on `429` ({{ch:rate-limiting}}).
- **Idempotency** — which operations accept idempotency keys and how retries behave.
- **Webhooks and events** — event types, payloads, signature verification, retries and ordering. OpenAPI 3.1 can describe webhooks; **AsyncAPI** describes message channels and events ({{ch:event-driven-systems}}).
- **Versioning and changes** — the versioning policy, the deprecation policy and a **changelog** with dates and migration notes ({{ch:api-versioning}}).
- **Environments** — sandbox and production URLs, test data and test card numbers.
- **Data semantics** — units (pence or pounds?), time zones (always UTC?), formats (ISO 8601), and which fields may be null.

### Level 3 — Examples that work

Examples are the most-read part of any documentation. Make them:

- **Realistic** — believable ids, names and amounts; not `"string"` and `0`.
- **Complete** — a full request including headers, and the full response.
- **Copy-pasteable** — `curl` plus examples in the languages your users use; secrets as environment variables, never real keys.
- **Tested** — generated from the description or executed in CI, so they cannot rot. (This book does the same with its code examples.)

Exercise 1 builds a generator for `curl` examples.

## Docs as a product

### Level 4 — Docs as code

Treat documentation like code: stored in the repository next to the API, written in Markdown and OpenAPI, reviewed in pull requests, built and published automatically. A pull request that changes the API must update its documentation in the same pull request — and the CI checks above enforce it ({{ch:code-review-and-documentation}}).

### Level 4 — Developer portals and experience

Public APIs often publish a **developer portal**: guides, reference, API keys, usage dashboards, status page, changelog and support. Measure it like a product: time to first successful call, most-visited pages, search queries with no results, and support tickets that documentation should have answered. Some providers also publish an `llms.txt` file or Markdown versions of their documentation so AI coding assistants can read them reliably — documentation is increasingly read by tools as well as people ({{ch:building-ai-products}}).

### Level 4 — Internal APIs deserve documentation too

The audience for internal API documentation is your colleagues — and you, six months from now. At minimum: an OpenAPI description generated from code, a README explaining what the service does, who owns it, how to run it, and its key decisions ({{ch:software-architecture}}). Many companies keep a service catalogue linking every service to its documentation and owners.

## From beginner to enterprise

**Level 1–2 — first documentation.** An OpenAPI description with every endpoint, schemas in `components`, a rendered reference page, and a short README with authentication and one example.

**Level 3 — trustworthy documentation.** One source of truth (schemas generating docs, or docs generating validation); contract tests in CI; linting; documented errors, pagination and limits; realistic, tested examples.

**Level 4 — production APIs.** Breaking-change checks; generated typed clients for your own front ends; mock servers for parallel work; getting-started and how-to guides; changelog and deprecation notices; webhooks documented.

**Level 5 — professional practice.** Developer portal with keys and usage; SDKs in several languages generated and released automatically; documentation metrics and feedback loops; company-wide API style guide enforced by lint rules.

**Level 6 — enterprises.** API governance across hundreds of services; central API catalogues and registries; consumer-driven contract testing between teams; AsyncAPI for event platforms; documentation reviewed as part of API design reviews.

## Real-world use cases

### Partner integration in a day

- **Goal**: a new delivery partner integrates without a call with your engineers.
- **Design**: a getting-started guide (sandbox key, first request, webhooks set-up); an OpenAPI reference with examples for every operation; error catalogue; a Postman/Bruno collection generated from the description; a sandbox with test data; a changelog the partner can subscribe to.
- **Measure**: time from sign-up to first successful sandbox call; support tickets per new partner.

### Front end and back end in parallel

- **Design**: design-first — the teams agree on the OpenAPI description for a new checkout flow in review; the front end generates TypeScript types and runs against a mock server; the back end implements against the same description with validation middleware; contract tests confirm both sides before release.

## Common mistakes

### Beginner: a hand-written spec disconnected from the code

**Fix:** generate from code, or validate code against the spec, with contract tests in CI.

### Beginner: no examples, or useless ones

**Fix:** realistic, complete, tested examples for every operation.

### Beginner: undocumented errors

**Fix:** document every error response, a standard error format and an error-code catalogue.

### Intermediate: reference only, no guides

**Consequence:** developers know every field but not how to complete a task. **Fix:** getting-started and how-to guides.

### Intermediate: response schemas that forbid extra fields

**Consequence:** generated clients reject new fields. **Fix:** loose response schemas; strict request schemas.

### Intermediate: missing semantics

Units, time zones, nullability, enum growth. **Fix:** describe them in schema descriptions and concept pages.

### Production: no changelog

**Consequence:** clients cannot tell what changed or when. **Fix:** a dated changelog with migration notes, linked from deprecation headers.

### Production: real secrets in examples

**Fix:** placeholders and environment variables; scan documentation for secrets like code.

## Debugging and troubleshooting

- **Generated client types do not match real responses**: the description drifted — add contract tests; check whether a handler bypasses the schema.
- **Swagger UI "try it" fails with CORS errors**: the docs page is served from a different origin than the API — allow the docs origin or serve docs from the API's domain ({{ch:browser-and-dom}}).
- **`$ref` resolution errors**: wrong paths in references, or circular references unsupported by a tool — validate the document with a linter.
- **Docs page shows an old version**: cached build or a CDN serving stale content; publish with versioned URLs and cache invalidation.
- **A breaking-change check flags a change you think is safe**: read the rule — often it is a new enum value or a field becoming optional, which really can break strict clients.

## Security summary

- **Never publish secrets** — real keys, internal hostnames or customer data — in examples or descriptions.
- **Do not document internal-only endpoints in public documentation**; keep separate public and internal descriptions if needed.
- Remember that **public documentation helps attackers too** — this is fine (security must not rely on obscurity), but it means every documented endpoint must be properly protected.
- **Document security behaviour** clearly: authentication, scopes, rate limits and webhook signature verification, so integrators implement them correctly.
- Protect "try it" consoles: use sandbox environments, never production credentials in browser consoles.

## How a senior engineer thinks about this

- **Documentation is part of the API.** An undocumented behaviour is either a bug or a future breaking change.
- **One source of truth, many outputs.** Schemas feed validation, types, documentation, clients and tests — so they cannot disagree.
- **Wrong documentation should break the build.** Contract tests, linting and change checks run on every pull request.
- **Write for the reader's goal.** Getting started in minutes, tasks explained, errors actionable.
- **Measure it.** Time to first call and avoidable support tickets show whether the documentation works.

## Exercises

### Exercise 1 — Generate copy-paste examples

**Objective:** practise producing documentation from structured descriptions.
**What to build:** a function `curlExample(baseUrl, operation)` that produces a `curl` command from an operation description with method, path template, parameters (path, query, header) with example values, an optional JSON request example, and optional bearer authentication. Use an environment variable placeholder for the token.

<details>
<summary>Show the solution</summary>

```ts
type Param = { name: string; in: "path" | "query" | "header"; example: string };
type Operation = { method: string; path: string; parameters: Param[]; requestExample?: unknown; auth?: "bearer" };

function curlExample(baseUrl: string, op: Operation): string {
  let path = op.path;
  const query = new URLSearchParams();
  const headers: string[] = [];
  for (const p of op.parameters) {
    if (p.in === "path") path = path.replace(`{${p.name}}`, encodeURIComponent(p.example));
    else if (p.in === "query") query.set(p.name, p.example);
    else headers.push(`${p.name}: ${p.example}`);
  }
  if (op.auth === "bearer") headers.unshift("Authorization: Bearer $CORNERSHOP_API_KEY");   // never a real key in docs
  if (op.requestExample !== undefined) headers.push("Content-Type: application/json");

  const url = baseUrl + path + (query.size ? `?${query}` : "");
  const lines = [`curl -X ${op.method.toUpperCase()} "${url}"`];
  for (const h of headers) lines.push(`  -H "${h}"`);
  if (op.requestExample !== undefined) lines.push(`  -d '${JSON.stringify(op.requestExample)}'`);
  return lines.join(" \\\n");
}

console.log(curlExample("https://api.cornershop.example/v2", {
  method: "get", path: "/customers/{customerId}/orders", auth: "bearer",
  parameters: [
    { name: "customerId", in: "path", example: "cus_7" },
    { name: "status", in: "query", example: "SHIPPED" },
    { name: "limit", in: "query", example: "20" },
  ],
}));
console.log();
console.log(curlExample("https://api.cornershop.example/v2", {
  method: "post", path: "/orders", auth: "bearer",
  parameters: [{ name: "Idempotency-Key", in: "header", example: "6f1c2a9e-order-retry-safe" }],
  requestExample: { customerId: "cus_7", items: [{ sku: "TEA-1", quantity: 2 }] },
}));
```

**Output:**

```text
curl -X GET "https://api.cornershop.example/v2/customers/cus_7/orders?status=SHIPPED&limit=20" \
  -H "Authorization: Bearer $CORNERSHOP_API_KEY"

curl -X POST "https://api.cornershop.example/v2/orders" \
  -H "Authorization: Bearer $CORNERSHOP_API_KEY" \
  -H "Idempotency-Key: 6f1c2a9e-order-retry-safe" \
  -H "Content-Type: application/json" \
  -d '{"customerId":"cus_7","items":[{"sku":"TEA-1","quantity":2}]}'
```

**Walkthrough:** path parameters are substituted (and URL-encoded), query parameters built with `URLSearchParams`, and headers collected; the token is a shell variable, so the example is safe to publish and works once the reader sets their own key. Because the examples come from the same description as the reference, they cannot drift from it. Production documentation tools generate the same for several languages.

</details>

### Exercise 2 — Document the errors

**Objective:** practise documenting failure.
**What to do:** for `POST /orders`, list the error responses a partner needs documented, with status code, error `type` (code), meaning, and what the client should do.

<details>
<summary>Show the solution</summary>

| Status | `type` (code) | Meaning | Client action |
|---|---|---|---|
| 400 | `validation-error` | Request body failed validation; `errors` lists fields and messages | Fix the request; do not retry unchanged |
| 401 | `unauthenticated` | Missing or invalid API key/token | Check credentials; refresh token |
| 403 | `forbidden` | Key lacks the `orders:write` scope or the account is suspended | Request the scope; contact support |
| 404 | `product-not-found` | A `sku` in the items does not exist | Remove or correct the item |
| 409 | `insufficient-stock` | Not enough stock for an item; `detail` names it | Reduce quantity or retry later |
| 409 | `idempotency-key-reused` | Same idempotency key used with a different body | Use a new key for a different request |
| 422 | `delivery-unavailable` | The address is outside delivery areas | Show the customer; choose another address |
| 429 | `rate-limited` | Too many requests; `Retry-After` gives seconds | Wait and retry with backoff |
| 500/503 | `internal-error` / `unavailable` | Server problem | Retry with backoff, using the **same** idempotency key |

All errors use Problem Details (`application/problem+json`) with `type`, `title`, `status`, `detail` and a `requestId` to quote to support.

</details>

### Exercise 3 — Review the documentation

**Objective:** practise evaluating API documentation.
**The scenario:** a team's documentation consists of an OpenAPI file last edited eight months ago, rendered with Swagger UI. Examples use `"string"` and `0`. There is no information about authentication beyond "use your API key". No error responses are documented except `200`. Money fields are numbers with no unit. The code has since added three endpoints. List the problems and a plan to fix them.

<details>
<summary>Show the solution</summary>

**Problems**
1. **Stale, hand-maintained spec** → the three new endpoints are missing, others may be wrong.
2. **Useless examples** → developers cannot see real data shapes.
3. **Vague authentication** → where is the key sent? Header name? Scopes? Test keys?
4. **Only `200` documented** → clients cannot handle errors properly.
5. **Money without units** → pence or pounds? Rounding errors and costly mistakes.
6. **Reference only** → no getting-started or task guides; no changelog.

**Plan**
1. Generate the description from code (or add response validation) so it cannot drift; contract tests in CI.
2. Add a linter with rules: operation ids, summaries, error responses, examples.
3. Document authentication (security scheme, header, scopes, test keys) and errors (Problem Details, error catalogue).
4. Change money to documented string amounts with currency in a new version, or at minimum document units now.
5. Write a getting-started guide and the top three how-to guides; start a dated changelog.
6. Add breaking-change checks against the published description.

</details>

### Exercise 4 — Production scenario: docs and reality disagree

**Objective:** practise handling documentation drift.
**The scenario:** a partner reports that, following your documentation, their integration rejects responses: the docs say `deliveryDate` is always present, but sometimes it is missing. Investigation shows that orders for digital products never had a delivery date, and nobody documented it. What do you do now and later?

<details>
<summary>Show the solution</summary>

**Now**
1. Confirm which responses lack the field and why (digital products).
2. Decide the correct contract: the honest description is "optional (absent for digital products)". Changing the API to always send it (for example, `null`) may be possible but is itself a change.
3. Fix the documentation immediately — mark the field optional or nullable with a clear description — and add a changelog entry explaining the correction.
4. Tell the affected partner (and others, through the changelog or notices) what changed and how to handle it.

**Later**
5. Add contract tests that include digital-product orders, so test data covers real variety.
6. Generate documentation from the schemas used to build responses, so optional fields are documented as optional automatically.
7. Review other fields for similar undocumented conditions (data audits comparing real responses with schemas, for example, by validating a sample of production responses in a non-blocking way and alerting on mismatches).

</details>

## Summary

API documentation is part of the API: it tells developers how to authenticate, what every operation and field means, what errors occur and how to handle them, and what limits and changes to expect. **OpenAPI** describes HTTP APIs in a machine-readable form — `info`, `servers`, `paths` with operations, parameters, request bodies and responses, reusable `components` with `$ref`, security schemes, descriptions and examples — and powers reference pages, typed clients, mocks, validation and tests.

Documentation must have **one source of truth**. **Design-first** writes the description first and validates code against it; **code-first** generates it from code, such as DTOs or Zod schemas that also validate requests. Either way, **contract tests** check real responses against the documented schemas, **linting** enforces quality rules, and **breaking-change checks** compare descriptions — all in CI, so drift fails the build. Response schemas should allow unknown fields, while request schemas stay strict.

Tools cannot write everything: developers also need **getting-started tutorials**, **how-to guides**, **explanations** of concepts, and clear documentation of authentication, errors (preferably **Problem Details**), pagination, rate limits, idempotency, webhooks (OpenAPI or **AsyncAPI**), data semantics and a dated **changelog**. Examples should be realistic, complete, copy-pasteable and tested. Treat documentation as code and as a product — reviewed with each change, published automatically, and measured by how quickly developers succeed.

## Key terms

- **API documentation** — Materials that explain how to use an API correctly: reference, guides, examples and policies.
- **OpenAPI Specification** — The standard machine-readable format for describing HTTP APIs.
- **Swagger** — The original name of OpenAPI, now a family of tools such as Swagger UI.
- **Operation (OpenAPI)** — One HTTP method on one path, with its parameters, request body and responses.
- **operationId** — A unique, stable name for an operation, used by tools and generated clients.
- **Schema (JSON Schema)** — A description of a data structure's types, required fields, formats and constraints.
- **Component** — A reusable OpenAPI definition referenced elsewhere with `$ref`.
- **$ref** — A reference to a definition elsewhere in a description.
- **Security scheme** — An OpenAPI description of how clients authenticate.
- **Design-first** — Writing and reviewing an API description before implementing it.
- **Code-first** — Generating the API description from the implementation.
- **Single source of truth** — One definition from which validation, types and documentation are all derived.
- **Documentation drift** — Documentation gradually becoming inconsistent with the real API.
- **Contract test** — An automated test checking that an API's real behaviour matches its documented contract.
- **Consumer-driven contract** — A contract defined by a client's recorded expectations and verified by the provider.
- **API linting** — Automatically checking an API description against quality and style rules.
- **Spectral** — A widely used linter for OpenAPI and AsyncAPI descriptions.
- **Mock server** — A fake API generated from a description, returning example responses.
- **SDK** — A client library that makes calling an API easier in a specific language.
- **Problem Details** — The standard JSON format for HTTP API errors defined in RFC 9457.
- **AsyncAPI** — A specification for describing event-driven and message-based APIs.
- **Changelog** — A dated record of changes to an API, with migration notes.
- **Docs as code** — Managing documentation in version control with reviews and automated publishing.
- **Developer portal** — A website providing an API's documentation, credentials, usage data and support.
- **Diátaxis** — A documentation framework dividing content into tutorials, how-to guides, reference and explanation.

## What comes next

Documentation tells clients how much they may call your API; the server must also enforce it. The next chapter, {{ch:rate-limiting}}, covers rate limiting: why APIs need limits, the main algorithms (fixed window, sliding window, token bucket), limiting across many servers with Redis, choosing keys and limits, communicating limits with headers and `429` responses, and protecting login and other sensitive endpoints from abuse.
