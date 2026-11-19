# Phase 2 — Chapter 21: API Versioning

---

## Chapter Overview

API versioning allows you to evolve your API while maintaining backward compatibility for existing clients. Without versioning, every breaking change forces all clients to update simultaneously — a coordination nightmare in production.

**When you need versioning:**
- Changing a response shape (removing/renaming fields)
- Changing URL structure
- Changing authentication mechanisms
- Changing request payload format

**When you DON'T need versioning:**
- Adding new fields to a response (backward compatible)
- Adding new optional request parameters
- Adding new endpoints

---

## Beginner Theory

### Versioning Strategies

```
1. URL Path versioning:
   GET /api/v1/users
   GET /api/v2/users
   
   Pros:  Visible, easy to test in browser, simple to route
   Cons:  "Unclean" URLs (REST purists), cache varies by version

2. Query Parameter versioning:
   GET /api/users?version=1
   GET /api/users?version=2
   
   Pros:  Same URL structure
   Cons:  Easy to forget parameter, harder to cache separately

3. Header versioning:
   GET /api/users
   Accept-Version: v1
   
   OR:
   Accept: application/vnd.myapi.v2+json
   
   Pros:  Clean URLs, REST-aligned
   Cons:  Not visible in browser, harder to test without tooling

4. Subdomain versioning:
   GET https://v1.api.myapp.com/users
   GET https://v2.api.myapp.com/users
   
   Pros:  Complete separation
   Cons:  Complex DNS/infrastructure

Industry default: URL path versioning (/v1/, /v2/) — most common, most practical.
```

---

## Basic Examples

### URL Path Versioning (Express)

```javascript
// routes/v1/users.router.js
const v1Router = require("express").Router();

v1Router.get("/users/:id", async (req, res) => {
  const user = await userService.findById(req.params.id);
  // v1 response format
  res.json({
    id:    user.id,
    name:  user.name,
    email: user.email
  });
});

// routes/v2/users.router.js
const v2Router = require("express").Router();

v2Router.get("/users/:id", async (req, res) => {
  const user = await userService.findById(req.params.id);
  // v2 response format (restructured)
  res.json({
    id:       user.id,
    profile: {
      firstName: user.firstName,
      lastName:  user.lastName,
      email:     user.email,
      avatar:    user.avatarUrl
    },
    createdAt: user.createdAt
  });
});

// app.js
const v1 = require("./routes/v1");
const v2 = require("./routes/v2");

app.use("/api/v1", v1);
app.use("/api/v2", v2);
```

### Header Versioning

```javascript
// Accept-Version header approach
function versionMiddleware(req, res, next) {
  const version = req.headers["accept-version"] || "v1";
  req.apiVersion = version;
  next();
}

app.use(versionMiddleware);

router.get("/users/:id", async (req, res) => {
  const user = await userService.findById(req.params.id);

  if (req.apiVersion === "v2") {
    return res.json({
      id:       user.id,
      profile:  { firstName: user.firstName, lastName: user.lastName },
      createdAt: user.createdAt
    });
  }

  // Default v1 response
  res.json({ id: user.id, name: user.name, email: user.email });
});
```

---

## Intermediate Concepts

### NestJS API Versioning

```typescript
// main.ts
import { VersioningType } from "@nestjs/common";

app.enableVersioning({
  type:           VersioningType.URI,    // /v1/users
  defaultVersion: "1"
});

// users.controller.v1.ts
@Controller({ path: "users", version: "1" })
export class UsersControllerV1 {
  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.usersService.findOneV1(id);
  }
}

// users.controller.v2.ts
@Controller({ path: "users", version: "2" })
export class UsersControllerV2 {
  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.usersService.findOneV2(id);
  }
}
```

### Deprecation Strategy

```javascript
// Add deprecation headers to old versions
function deprecationMiddleware(version, sunsetDate, details) {
  return (req, res, next) => {
    res.set("Deprecation", "true");
    res.set("Sunset", sunsetDate);  // RFC 8594
    res.set("Link", `</api/${version}/changelog>; rel="deprecation"`);
    res.set("X-API-Warn", details);
    next();
  };
}

// Apply to v1 routes
app.use("/api/v1",
  deprecationMiddleware("v1", "2025-12-31", "v1 is deprecated. Migrate to /api/v2 by Dec 31, 2025."),
  v1Router
);

// Track usage of deprecated versions
app.use("/api/v1", (req, res, next) => {
  metrics.increment("api.v1.requests", { endpoint: req.path });
  next();
});
```

### Versioned Response Transformers

```javascript
// Transform same underlying data into different response shapes
// Centralizes version logic, avoids duplicating business logic

const responseTransformers = {
  "v1": (user) => ({
    id:    user.id,
    name:  `${user.firstName} ${user.lastName}`,
    email: user.email
  }),
  "v2": (user) => ({
    id:       user.id,
    profile: { firstName: user.firstName, lastName: user.lastName, email: user.email },
    roles:    user.roles.map(r => r.name),
    createdAt: user.createdAt
  })
};

function transformUser(user, version = "v1") {
  const transformer = responseTransformers[version] || responseTransformers["v1"];
  return transformer(user);
}

router.get("/users/:id", async (req, res) => {
  const user    = await userService.findById(req.params.id);
  const version = req.apiVersion || "v1";
  res.json(transformUser(user, version));
});
```

---

## Advanced Concepts

### Semantic Versioning for APIs

```
MAJOR.MINOR.PATCH for APIs:

MAJOR (v1 → v2):
  Breaking changes: removed fields, renamed fields, changed types,
  different auth mechanism, different pagination

MINOR (v1.1 → v1.2):
  Non-breaking additions: new optional fields, new endpoints,
  new optional parameters

PATCH:
  Bug fixes, documentation changes (typically no new version needed)

Rule: only version your API when you make BREAKING CHANGES.
      Adding new optional fields is NEVER a breaking change.
```

### API Gateway Versioning

```javascript
// When using API Gateway (Kong, AWS API Gateway, Nginx):
// Route /api/v1/* to old service, /api/v2/* to new service
// This enables gradual migration at the infrastructure level

// nginx.conf
// location /api/v1/ {
//   proxy_pass http://api-v1-service:3000/;
// }
// location /api/v2/ {
//   proxy_pass http://api-v2-service:3001/;
// }

// This lets you run v1 and v2 as separate deployments,
// maintain v1 indefinitely while v2 is developed separately
```

---

## Interview Preparation

**Q1: What are the different approaches to API versioning? Which do you prefer?**
A: Four main approaches: URL path (/v1/users), header (Accept-Version: v2), query parameter (?version=2), and subdomain (v2.api.example.com). URL path is the industry standard and my preference: it's immediately visible in logs and browser URL bars, easy to route in reverse proxies, simple to document and test, and clear to API consumers. Header versioning is more REST-pure but hurts discoverability. Query parameter versioning is error-prone (clients forget to include it).

**Q2: What constitutes a breaking change that requires a new API version?**
A: Breaking changes: removing or renaming existing fields, changing field types (string → number), changing URL structure, changing authentication mechanism, changing pagination behavior, changing error response format. Non-breaking changes (no new version needed): adding new optional fields to responses, adding new optional request parameters, adding new endpoints. Rule of thumb: if an existing client would break without code changes, it's breaking. If existing clients continue working with no changes, it's non-breaking.

**Q3: How do you sunset an old API version?**
A: Sunset process: 1) Announce deprecation date well in advance (3-6 months for external APIs). 2) Add `Deprecation: true` and `Sunset: <date>` headers to v1 responses. 3) Monitor usage of deprecated versions — track which clients/API keys still use v1. 4) Reach out to high-volume v1 users directly with migration guides. 5) On sunset date, return 410 Gone instead of 429 Too Many Requests. Maintain redirect or clear error messages pointing to v2 documentation.

---

## Practical Tasks

### Beginner (10 Tasks)
1. Create `/api/v1/users` and `/api/v2/users` with different response formats.
2. Mount v1 and v2 routers in Express using `app.use("/api/v1", v1Router)`.
3. Add deprecation headers to the v1 router (`Deprecation: true`, `Sunset: date`).
4. Implement header versioning with `Accept-Version` middleware.
5. Build a versioned user response transformer function.
6. Document the differences between v1 and v2 in a CHANGELOG.md file.
7. Log every request to a deprecated API version for usage tracking.
8. Test both versions with Postman and verify response differences.
9. Return 410 Gone for a removed endpoint with a migration message.
10. Add version to all error responses (so clients know which version failed).

### Intermediate (10 Tasks)
1. Implement NestJS versioning with `@Controller({ version: "1" })`.
2. Build a response transformer registry for multiple versions.
3. Implement header versioning with content negotiation (`Accept: vnd.api+json;version=2`).
4. Track API version usage with per-version metrics.
5. Build migration guide document for v1 → v2 transition.
6. Implement version negotiation: if v3 not found, fall back to v2.
7. Build automated test suite that runs against all active API versions.
8. Implement version-specific request validation (v2 accepts more fields).
9. Build API changelog endpoint: GET /api/changelog.
10. Implement sunset countdown: return days-until-sunset in deprecation header.

### Advanced (10 Tasks)
1. Implement API Gateway routing: v1 → old service, v2 → new service.
2. Build canary deployment: route 10% of v2 traffic to new implementation.
3. Implement consumer-driven contract testing across versions.
4. Build version-aware SDK that auto-selects the correct version.
5. Implement API version analytics dashboard.
6. Build automated breaking change detection using API diff tools.
7. Implement per-client version pinning (client X always gets v1 even if default changes).
8. Build GraphQL API as a replacement for REST versioning (schema evolution).
9. Implement backward compatibility layer: v2 accepts v1 request formats.
10. Build full API lifecycle management: draft → active → deprecated → sunset.

---

## Self Assessment
1. What are the four main approaches to API versioning?
2. Which versioning strategy is most commonly used in industry?
3. What is a breaking change?
4. What is a non-breaking change?
5. What is the Sunset header?
6. What HTTP status code is returned for a removed endpoint?
7. How do you track usage of deprecated API versions?
8. What is a response transformer?
9. How does NestJS implement URL versioning?
10. When should you NOT version your API?

---

## Cheat Sheet

```javascript
// URL path versioning
app.use("/api/v1", v1Router);
app.use("/api/v2", v2Router);

// Deprecation headers
res.set("Deprecation", "true");
res.set("Sunset",      "Sat, 31 Dec 2025 00:00:00 GMT");
res.set("Link",        '</api/v2/users>; rel="successor-version"');

// Response transformer
const transforms = {
  v1: (u) => ({ id: u.id, name: u.name }),
  v2: (u) => ({ id: u.id, profile: { firstName: u.firstName, lastName: u.lastName } })
};
const response = (transforms[req.apiVersion] ?? transforms.v1)(user);

// 410 Gone for removed endpoint
router.get("/api/v1/legacy", (req, res) =>
  res.status(410).json({ error: "Endpoint removed. Use /api/v2/new-endpoint." })
);
```
