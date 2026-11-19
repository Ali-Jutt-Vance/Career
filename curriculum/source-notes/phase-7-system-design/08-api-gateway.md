# Phase 7 — Chapter 8: API Gateway

---

## Chapter Overview

An API gateway is the single entry point for all client requests to a microservices system. It handles cross-cutting concerns so individual services don't have to: authentication, rate limiting, routing, logging, transformation, and more.

**Topics:**
- API gateway responsibilities
- Authentication at the gateway
- Rate limiting strategies
- Request routing and load balancing
- Service discovery
- API aggregation and transformation
- Kong, AWS API Gateway, Nginx, Traefik

---

## Core Concepts

### What an API Gateway Does

```
Client sends request → API Gateway → downstream service

Gateway responsibilities:
  1. Authentication:    Verify JWT/API key before forwarding
  2. Authorization:     Check permissions/scopes
  3. Rate limiting:     Throttle by IP, API key, user
  4. Routing:           /api/v1/orders → order-service:3001
  5. Load balancing:    Round-robin, least connections
  6. SSL termination:   Accept HTTPS, forward HTTP internally
  7. Request logging:   Trace all requests with correlation ID
  8. Response caching:  Cache GET responses (reduce service load)
  9. Request transform: Rename headers, filter fields, merge responses
  10. Circuit breaking:  Stop forwarding to unhealthy service
  11. Retry logic:      Automatic retries on transient failures
  12. API versioning:   Route /v1/* and /v2/* to different versions
  13. CORS:             Handle cross-origin headers centrally

Benefits:
  Services focus on business logic, not infrastructure concerns.
  Single place to enforce security/logging policies.
  Services can change internally without clients knowing.
```

### Common Gateway Patterns

```
1. Backend for Frontend (BFF)
   One gateway per client type: mobile-gateway, web-gateway, partner-gateway.
   Each BFF tailors the API for its client's needs.
   Mobile BFF: reduce payloads, combine calls for bandwidth.
   Web BFF: richer data, more fields.

2. API Aggregation
   Client needs data from user-service, order-service, product-service.
   Gateway calls all three in parallel, merges response.
   Client gets one response, not three network round trips.

3. Strangler Fig
   Migrating from monolith to microservices.
   Gateway routes old endpoints to monolith.
   New endpoints (or migrated ones) route to new services.
   Gradually strangle the monolith.

4. Canary Routing
   Route 5% of traffic to new version, 95% to stable.
   Monitor error rate. If healthy: increase %.
   Rollback: switch back to 0% new.
```

---

## Code Examples

### Custom API Gateway with Express

```typescript
import express      from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import jwt           from "jsonwebtoken";
import { redis }    from "@/lib/redis";

const app = express();

// ─── Authentication Middleware ────────────────────────
function authenticate(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!);
    (req as any).user = payload;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

// ─── Rate Limiting Middleware ─────────────────────────
async function rateLimit(req: Request, res: Response, next: NextFunction) {
  const identifier = (req as any).user?.sub || req.ip;
  const key        = `rl:${identifier}`;
  const limit      = 100;
  const window     = 60;

  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, window);

  res.setHeader("X-RateLimit-Limit",     limit);
  res.setHeader("X-RateLimit-Remaining", Math.max(0, limit - count));

  if (count > limit) {
    return res.status(429).json({ error: "Rate limit exceeded" });
  }
  next();
}

// ─── Request Logging ──────────────────────────────────
app.use((req, _res, next) => {
  const correlationId = (req.headers["x-correlation-id"] as string) || crypto.randomUUID();
  req.headers["x-correlation-id"] = correlationId;
  console.log({ method: req.method, path: req.path, correlationId });
  next();
});

// ─── Routes → Service Proxies ─────────────────────────
// Public routes (no auth)
app.use("/api/v1/auth", createProxyMiddleware({
  target: "http://auth-service:3001",
  changeOrigin: true,
  pathRewrite: { "^/api/v1/auth": "" }
}));

// Protected routes (require auth + rate limiting)
app.use("/api/v1/orders", authenticate, rateLimit, createProxyMiddleware({
  target: "http://order-service:3002",
  changeOrigin: true,
  pathRewrite: { "^/api/v1/orders": "" }
}));

app.use("/api/v1/users", authenticate, rateLimit, createProxyMiddleware({
  target: "http://user-service:3003",
  changeOrigin: true,
  pathRewrite: { "^/api/v1/users": "" }
}));

// ─── API Aggregation ─────────────────────────────────
app.get("/api/v1/dashboard", authenticate, async (req, res) => {
  const userId = (req as any).user.sub;

  // Parallel fetch from multiple services
  const [user, orders, notifications] = await Promise.all([
    fetch(`http://user-service:3003/users/${userId}`).then(r => r.json()),
    fetch(`http://order-service:3002/orders?userId=${userId}`).then(r => r.json()),
    fetch(`http://notification-service:3004/notifications/${userId}`).then(r => r.json())
  ]);

  res.json({ user, orders: orders.slice(0, 5), notifications: notifications.slice(0, 3) });
});

app.listen(8080);
```

### Kong API Gateway (Declarative Config)

```yaml
# kong.yml — declarative configuration
_format_version: "3.0"

services:
  - name: order-service
    url:  http://order-service:3002
    routes:
      - name:  order-routes
        paths: ["/api/v1/orders"]
        methods: [GET, POST, PUT, DELETE]
    plugins:
      - name: jwt               # JWT verification
      - name: rate-limiting
        config:
          minute: 100
          policy: redis         # distributed rate limiting
      - name: correlation-id
        config:
          header_name: X-Correlation-Id
      - name: prometheus        # Prometheus metrics per service
      - name: request-transformer
        config:
          add:
            headers: ["X-Gateway: kong"]

  - name: auth-service
    url:  http://auth-service:3001
    routes:
      - name:  auth-routes
        paths: ["/api/v1/auth"]
        strip_path: false

consumers:
  - username: mobile-app
    jwt_secrets:
      - key:    mobile-app-key
        secret: "${MOBILE_APP_SECRET}"
```

### AWS API Gateway + Lambda Integration

```typescript
// Lambda handler for API Gateway proxy integration
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const { httpMethod, path, body, requestContext } = event;
  const userId = requestContext.authorizer?.claims?.sub;  // from Cognito JWT

  if (httpMethod === "GET" && path === "/orders") {
    const orders = await getOrders(userId);
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orders)
    };
  }

  return { statusCode: 404, body: "Not Found" };
};
```

---

## Interview Preparation

**Q1: What is the difference between an API gateway and a load balancer?**
A: Load balancer: distributes traffic across multiple instances of the SAME service. Works at L4 (TCP) or L7 (HTTP). No business logic. Purpose: scale and redundancy. AWS ALB, Nginx upstream. API gateway: routes traffic to DIFFERENT services based on the path, applies cross-cutting concerns (auth, rate limiting, logging). Works at L7. Has business-aware logic. Purpose: single entry point, centralized policy enforcement. They're complementary, not competing. Typical setup: Internet → API Gateway → load balancer → service instances. The gateway decides which service; the load balancer decides which instance.

**Q2: What are the tradeoffs of API aggregation at the gateway?**
A: API aggregation: gateway fetches data from multiple services and combines the response. Benefit: client makes one request instead of three, reducing client-side latency and network roundtrips. Complexity: gateway now has domain knowledge (knows how to merge user + order + product data). Gateway becomes a coupling point — if order service changes, gateway must change too. Latency: if any upstream service is slow, the aggregated response is slow (unless you use partial results). Failure handling: if one service fails, do you return partial data or fail the whole request? Alternative: use GraphQL federation or client-side aggregation. Rule of thumb: gateway aggregation is fine for stable, simple aggregations; for complex data fetching, use GraphQL.

---

## Practical Tasks

### Beginner (10 Tasks)
1. Build a simple Express proxy to route /orders to a service.
2. Add JWT authentication middleware at the gateway.
3. Add rate limiting (100 req/min per user).
4. Add correlation ID header to all forwarded requests.
5. Add CORS handling at the gateway.
6. Log all requests with method, path, status, duration.
7. Return 503 when a downstream service is unavailable.
8. Add response headers for security (HSTS, X-Frame-Options).
9. Implement HTTP → HTTPS redirect at the gateway.
10. Build a health check aggregation endpoint.

### Intermediate (10 Tasks)
1. Implement API aggregation for a dashboard endpoint.
2. Add circuit breaker for each downstream service.
3. Implement retry with exponential backoff for 5xx responses.
4. Add response caching for GET /products.
5. Implement distributed rate limiting with Redis.
6. Set up Kong with JWT plugin.
7. Implement canary routing (10% to new service version).
8. Add Prometheus metrics: request count, latency, error rate.
9. Implement request body validation at the gateway.
10. Set up AWS API Gateway with Lambda integration.

### Advanced (10 Tasks)
1. Implement BFF pattern: mobile and web gateways.
2. Build a streaming proxy for long-lived connections.
3. Implement GraphQL gateway that federates multiple services.
4. Design API versioning strategy (/v1/ → /v2/ migration).
5. Implement adaptive rate limiting (lower limit on degraded service).
6. Build gateway telemetry with distributed tracing.
7. Design gateway configuration as code with GitOps.
8. Implement blue-green deployment via gateway routing.
9. Build API key management system.
10. Implement service mesh alternative (Istio/Envoy) vs gateway comparison.

---

## Cheat Sheet

```
API Gateway responsibilities:
  Auth:         Verify JWT/API key before forwarding
  Rate limit:   Per user/IP/API key limits
  Routing:      /api/v1/orders → order-service:3002
  Logging:      Add correlation ID, log all requests
  SSL:          Terminate HTTPS, forward HTTP internally
  Aggregation:  Combine multiple service responses
  Caching:      Cache GET responses to reduce service load
  Circuit break: Stop routing to unhealthy services

Popular options:
  Kong:        Open source, plugins, declarative config, Redis-backed rate limiting
  AWS API GW:  Managed, Lambda/HTTP integration, Cognito auth, usage plans
  Nginx:       Lightweight, high-performance, custom Lua plugins
  Traefik:     Cloud-native, auto-discovers Docker/K8s services
  Envoy:       High-performance C++ proxy, used in service meshes (Istio)
  Express:     Custom gateway — full control, more code

Rate limit response headers:
  X-RateLimit-Limit:     100
  X-RateLimit-Remaining: 95
  X-RateLimit-Reset:     1735689600
  Retry-After:           60  (on 429)
```
