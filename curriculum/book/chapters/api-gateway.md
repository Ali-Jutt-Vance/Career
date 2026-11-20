# API Gateways

> [!GOALS]
> - Explain what an API gateway is and which **cross-cutting concerns** it takes off services.
> - Distinguish gateways from **load balancers**, **reverse proxies** and **service meshes**.
> - Apply gateway patterns: **routing**, **authentication**, **rate limiting**, request transformation, aggregation and the **backend for frontend**.
> - Use AWS API Gateway (HTTP and REST APIs) and know the alternatives.
> - Avoid turning the gateway into a bottleneck, a single point of failure or a hidden monolith.

## Why this matters

When a system grows from one API to many services, clients face a mess: different addresses for each service, different authentication schemes, internal paths that change, and mobile apps making ten calls to render one screen. Every service also ends up reimplementing the same things — checking tokens, rate limiting, logging, CORS, request IDs.

An **API gateway** gives clients **one front door**. It routes each request to the right service and handles the cross-cutting concerns once, consistently, at the edge. Gateways are part of almost every microservices architecture ({{ch:microservices}}), every public API product (API keys, quotas, developer portals), and serverless designs on AWS, where API Gateway sits in front of Lambda functions ({{ch:lambda}}).

## The simple idea

Think of the reception desk of a large office building. Visitors do not wander the corridors looking for the right department; they go to reception, show their badge or ID, sign in, and are directed to the right floor. Reception also refuses people without appointments, limits how many visitors one company can send at once, and keeps a visitor log. The departments inside can then focus on their work.

> [!ANALOGY]
> An API gateway is like a building's reception desk: one entrance, identity checks, sign-in and directions to the right department, so departments can focus on their work.
>
> **Where the analogy breaks:** if a reception desk is slow, visitors queue for a few minutes. If the gateway is slow or down, **every** request to **every** service fails. And if departments start asking reception to do their work — calculate discounts, decide business rules — the desk becomes the most complicated and fragile part of the building.

## The proper definition and key words

An **API gateway** is a server that sits between clients and backend services, providing a single entry point that **routes** requests and applies **cross-cutting policies** such as authentication, authorisation, rate limiting, transformation, caching and observability.

Key words:

- **Edge** — the boundary between external clients and internal services.
- **Route** — a mapping from a public path and method to a backend.
- **Cross-cutting concern** — something every service needs that is unrelated to its business logic.
- **API key / usage plan / quota** — client identification / limits and billing tiers per client.
- **Authoriser** — gateway logic that validates tokens (JWT, OAuth) before forwarding ({{ch:oauth}}).
- **Request transformation** — rewriting paths, headers or bodies between public and internal forms.
- **Aggregation (composition)** — one gateway call that combines several backend calls.
- **Backend for frontend (BFF)** — a gateway or service tailored to one kind of client.
- **Service mesh** — infrastructure (sidecars or proxies) handling service-to-service traffic inside the system.

## What gateways do

### Level 1 — The front door

```text
 mobile app ─┐                        ┌──► catalogue service   (/products/…)
 web app ────┼──► API gateway ────────┼──► orders service      (/orders/…)
 partners ───┘   - TLS                └──► accounts service    (/accounts/…)
                 - authentication (API keys, JWT)
                 - rate limits and quotas per client
                 - routing and path rewriting, versioning (/v1, /v2)
                 - request IDs, logging, metrics, tracing
                 - CORS, request size limits, caching
```

Clients see one host (`api.cornershop.example`) and a stable public API; services stay private and can be split, merged or moved without clients noticing.

### Level 2 — A gateway in miniature

This small gateway does the core jobs — API-key authentication, per-client rate limits, routing by prefix with path rewriting, and request IDs — in front of two services that know nothing about any of it:

```ts
import { createServer, request, type IncomingMessage, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";

const listen = async (handler: (req: IncomingMessage, res: ServerResponse) => void) => {
  const s = createServer(handler);
  await new Promise<void>((r) => s.listen(0, "127.0.0.1", r));
  return { server: s, port: (s.address() as AddressInfo).port };
};

// Two backend services that know nothing about API keys, limits or public paths
const catalogue = await listen((req, res) => res.end(JSON.stringify({ service: "catalogue", path: req.url, requestId: req.headers["x-request-id"], client: req.headers["x-client-id"] })));
const orders = await listen((req, res) => res.end(JSON.stringify({ service: "orders", path: req.url, requestId: req.headers["x-request-id"], client: req.headers["x-client-id"] })));

// The gateway: authenticate, rate-limit per client, route by path prefix, add a request ID
const apiKeys = new Map([["key-mobile-app", { client: "mobile-app", perMinute: 3 }], ["key-partner-x", { client: "partner-x", perMinute: 100 }]]);
const routes: [string, number][] = [["/v1/products", catalogue.port], ["/v1/orders", orders.port]];
const used = new Map<string, number>();                  // requests this minute per client (fixed window, simplified)
let nextId = 1;

const gateway = await listen((req, res) => {
  const key = apiKeys.get(String(req.headers["x-api-key"] ?? ""));
  if (!key) { res.statusCode = 401; return res.end(JSON.stringify({ error: "missing or invalid API key" })); }
  const count = (used.get(key.client) ?? 0) + 1;
  used.set(key.client, count);
  if (count > key.perMinute) { res.statusCode = 429; res.setHeader("Retry-After", "60"); return res.end(JSON.stringify({ error: "rate limit exceeded" })); }
  const route = routes.find(([prefix]) => req.url!.startsWith(prefix));
  if (!route) { res.statusCode = 404; return res.end(JSON.stringify({ error: "no such route" })); }
  const upstreamPath = req.url!.replace(/^\/v1/, "");    // public /v1/products/42 -> internal /products/42
  const requestId = `req-${String(nextId++).padStart(4, "0")}`;
  const up = request({ host: "127.0.0.1", port: route[1], path: upstreamPath, method: req.method,
    headers: { "x-request-id": requestId, "x-client-id": key.client } }, (r) => { res.statusCode = r.statusCode ?? 502; r.pipe(res); });
  up.on("error", () => { res.statusCode = 502; res.end(); });
  up.end();
});

const call = (path: string, apiKey?: string) => new Promise<string>((resolve) => {
  const r = request({ host: "127.0.0.1", port: gateway.port, path, headers: apiKey ? { "x-api-key": apiKey } : {} }, (res) => {
    let body = ""; res.on("data", (c) => (body += c)); res.on("end", () => resolve(`${res.statusCode} ${body}`));
  });
  r.end();
});

console.log(await call("/v1/products/42"));
console.log(await call("/v1/products/42", "key-mobile-app"));
console.log(await call("/v1/orders/1001", "key-mobile-app"));
console.log(await call("/v1/payments", "key-mobile-app"));
console.log(await call("/v1/products", "key-mobile-app"));
console.log(await call("/v1/products", "key-partner-x"));
for (const s of [gateway, catalogue, orders]) s.server.close();
```

**Output:**

```text
401 {"error":"missing or invalid API key"}
200 {"service":"catalogue","path":"/products/42","requestId":"req-0001","client":"mobile-app"}
200 {"service":"orders","path":"/orders/1001","requestId":"req-0002","client":"mobile-app"}
404 {"error":"no such route"}
429 {"error":"rate limit exceeded"}
200 {"service":"catalogue","path":"/products","requestId":"req-0003","client":"partner-x"}
```

- The request **without a key** never reached a service: **401** at the edge.
- The public path `/v1/products/42` became the internal `/products/42`: the **public API version** lives at the gateway, and services keep simple internal paths ({{ch:api-versioning}}).
- The gateway added **`x-request-id`** and **`x-client-id`** headers; services log them, so one request can be traced across services, and they know which client called without handling keys themselves ({{ch:logging}}).
- The mobile app's limit is three requests per minute: its fourth request (counting the 404) got **429** with `Retry-After`. The partner with a higher plan was unaffected — **per-client** limits stop one client from consuming everyone's capacity ({{ch:rate-limiting}}).
- Rate limiting ran before routing, so even bad requests count — protection against clients probing for paths.
- Real gateways use distributed counters (Redis) or token buckets across many gateway instances, plus timeouts, retries and circuit breakers towards backends ({{ch:distributed-systems}}).

### Level 3 — Authentication at the edge

- The gateway validates **JWT access tokens** (signature, expiry, audience, issuer) or API keys and **rejects bad requests early**; services receive verified identity claims in headers or the forwarded token ({{ch:jwt}}).
- Coarse **authorisation** (this client may call `/orders` at all; this scope allows writes) fits the gateway; **fine-grained** decisions (may this user see order 1001?) stay in the service that owns the data.
- Services must still **not trust** requests that bypass the gateway: keep them in private networks, accept traffic only from the gateway, or verify tokens themselves too (defence in depth).

## Patterns

### Level 3 — Aggregation and the backend for frontend

- **Aggregation**: a mobile home screen needs the user's profile, recommended products and recent orders. One gateway endpoint calls the three services **in parallel** and returns one response — fewer round trips over slow mobile networks. Use timeouts and partial results (show the page without recommendations if that service is slow).
- **Backend for frontend (BFF)**: different clients need different shapes — the web app wants rich data, the mobile app small payloads, partners a stable versioned API. A **separate BFF per client type**, owned by the team building that client, keeps each simple instead of one gateway full of special cases. GraphQL gateways are a popular way to let each client ask for exactly the fields it needs ({{ch:graphql}}).

### Level 3 — Gateway, load balancer or service mesh?

| | Load balancer | API gateway | Service mesh |
|---|---|---|---|
| Position | In front of copies of one service | At the edge, in front of many services | Between services, inside the system |
| Main job | Spread traffic, health checks, TLS | Routing by API, auth, quotas, transformation, API products | Service-to-service security (mTLS), retries, timeouts, traffic shifting, telemetry |
| Knows about | Connections and HTTP basics | API paths, clients, keys, plans | Service identities and calls |
| Examples | ALB, NLB, NGINX ({{ch:elb}}) | AWS API Gateway, Kong, Apigee, Tyk, Envoy Gateway | Istio, Linkerd, App Mesh successors, Consul |

They are often combined: CloudFront → API gateway → load balancers → services, with a mesh inside.

## AWS API Gateway

### Level 4 — HTTP APIs, REST APIs and WebSocket APIs

- **HTTP APIs**: lower cost and latency; routes to Lambda, HTTP backends and private services through VPC links; JWT authorisers; CORS. The default for most new APIs.
- **REST APIs**: more features — API keys with **usage plans** and quotas, request validation, transformations, caching, AWS WAF integration, private APIs, edge-optimised endpoints. Choose them for public API products and advanced needs.
- **WebSocket APIs**: persistent connections with routes for messages, backed by Lambda or HTTP ({{ch:websockets}}).
- **Limits to know**: integration timeouts (around 30 seconds by default), payload size limits (about 10 MB), and account-level throttling — long or large work belongs in asynchronous designs (upload to S3, process from a queue).
- **Lambda authorisers** run custom code for authentication when JWT authorisers are not enough; cache their results to save time and money.
- Define APIs in code (OpenAPI with SAM, CDK or Terraform) ({{ch:api-documentation}}, {{ch:cloudformation}}).

### Level 4 — Keeping the gateway healthy

- **It is on every request path**: make it highly available (managed services are multi-AZ), scale it, and keep its own latency low.
- **Keep business logic out**: transformations and aggregation are fine; pricing rules, inventory decisions and complex workflows belong in services. A gateway full of logic becomes a "distributed monolith" that every team must change.
- **Ownership**: a platform team usually owns the gateway platform; service teams own their routes and policies through configuration in their repositories.
- **Observability**: per-route latency, error rates and throttling counts; access logs with request IDs ({{ch:cloudwatch}}).
- **Change safely**: gateway configuration changes can break every client — review them, test them, and deploy them gradually.

## From beginner to enterprise

**Level 1–2 — first gateway.** One entry point; routing by path; TLS; request IDs and logging; CORS; hiding internal services.

**Level 3 — edge policies.** JWT and API-key authentication; per-client rate limits and quotas; versioned public paths; aggregation with timeouts; BFFs per client type.

**Level 4 — production gateway.** Managed gateways with WAF; usage plans for partners; per-route monitoring; gateway configuration as code owned by service teams; no business logic at the edge.

**Level 5 — senior practice.** Designing the edge architecture (CDN, gateway, mesh); API product strategy; balancing central control with team autonomy.

**Level 6 — enterprises.** API management platforms with developer portals, monetisation, governance of hundreds of APIs, and federated gateways across business units.

## Real-world use cases

### A public partner API

- **Design**: AWS API Gateway REST API with API keys and three usage plans (free, standard, premium) with quotas; WAF rules; request validation from the OpenAPI schema; a developer portal with documentation generated from the same schema.

### The mobile BFF

- **Design**: the mobile team owns a small BFF service that aggregates profile, offers and orders into one compact response per screen, with 300 ms timeouts on each dependency and cached fallbacks. App start-up time fell by more than a second on slow networks.

## Common mistakes

### Beginner: services reachable around the gateway

**Consequence:** authentication and limits bypassed. **Fix:** private services; accept traffic only from the gateway.

### Beginner: one global rate limit

**Consequence:** one client exhausts capacity for all. **Fix:** per-client limits and quotas.

### Intermediate: business logic in the gateway

**Consequence:** a fragile, shared bottleneck. **Fix:** keep the gateway to cross-cutting concerns.

### Intermediate: aggregation without timeouts

**Consequence:** the slowest service decides every response. **Fix:** parallel calls, timeouts and partial results.

### Intermediate: one gateway endpoint shape for every client

**Fix:** BFFs or GraphQL for different clients.

### Production: unreviewed gateway changes

**Consequence:** global outages. **Fix:** configuration as code, tests and gradual rollout.

### Production: synchronous long operations through the gateway

**Consequence:** timeouts. **Fix:** asynchronous patterns with status endpoints.

## Debugging and troubleshooting

- **401/403 at the gateway**: token expired, wrong audience or issuer, missing scopes, or an API key without a plan.
- **429**: the client's quota or the account's throttling limits; check usage plans and limits.
- **502/504 from the gateway**: the backend failed or exceeded the integration timeout; check backend logs with the request ID.
- **CORS errors**: preflight `OPTIONS` routes and allowed origins and headers at the gateway.
- **Path not found**: route matching and path rewriting (stage names and prefixes in AWS).

## Security summary

- **Authenticate at the edge**, authorise finely in services, and keep services private.
- **Per-client rate limits and quotas**; WAF for common attacks.
- **Validate requests** (size, schema) before they reach services.
- **Never log secrets** such as API keys or tokens in gateway logs.
- **Rotate API keys** and support revoking them quickly.

## How a senior engineer thinks about this

- **One front door, many rooms.** The gateway gives clients stability and services freedom.
- **Cross-cutting at the edge, business logic in services.**
- **The gateway is critical infrastructure.** Highly available, observable and changed carefully.
- **Different clients, different needs.** BFFs beat one-size-fits-all endpoints.

## Exercises

### Exercise 1 — Where does it belong?

**Objective:** practise placing responsibilities.
**What to do:** for each, gateway or service? (a) validating the JWT's signature; (b) checking that the user owns order 1001; (c) per-partner monthly quotas; (d) calculating a discount; (e) adding a request ID; (f) rewriting `/v2/products` to `/products`.

<details>
<summary>Show the solution</summary>

- (a) **Gateway** (and optionally the service again for defence in depth).
- (b) **Service** — it owns the data and the rule.
- (c) **Gateway** — usage plans and quotas.
- (d) **Service** — business logic.
- (e) **Gateway** — generated at the edge and passed on.
- (f) **Gateway** — public versioning and path mapping.

</details>

### Exercise 2 — Design a BFF endpoint

**Objective:** practise aggregation.
**What to do:** design a `GET /mobile/home` endpoint that returns the user's name, three recommended products and the latest order. The recommendations service is sometimes slow.

<details>
<summary>Show the solution</summary>

- Authenticate the user at the gateway or BFF; pass the user ID to services.
- Call accounts, recommendations and orders **in parallel**, each with a timeout (for example 200–300 ms).
- If recommendations time out, return the response without them (or with cached popular products) and a flag the app can use.
- Return a compact JSON shape designed for the screen; cache the user-independent parts briefly.
- Propagate the request ID and record per-dependency latency.

</details>

### Exercise 3 — Production scenario: the gateway outage

**Objective:** practise operating gateways.
**The scenario:** a configuration change to the gateway's routing rules broke the `/orders` routes for all clients for 25 minutes. The change was made directly in the console. What do you change?

<details>
<summary>Show the solution</summary>

1. **Configuration as code**: routes and policies defined in OpenAPI or IaC in version control, reviewed in pull requests.
2. **Automated tests**: contract tests calling each route after deployment to a staging stage ({{ch:testing}}).
3. **Gradual rollout**: deploy to a canary stage or a small share of traffic first; automatic rollback on error-rate alarms ({{ch:cicd}}).
4. **Restrict console changes** in production with IAM.
5. **Alarms** on per-route 4xx/5xx rates so a broken route is noticed in minutes.
6. Hold a blameless review to improve the process ({{ch:observability-and-incidents}}).

</details>

## Summary

An **API gateway** is the single front door between clients and services. It **routes** requests by path and method, rewrites public paths (including versions) to internal ones, and applies **cross-cutting concerns** once: TLS, **authentication** with API keys and JWTs, coarse authorisation, **per-client rate limits** and quotas, request IDs, logging, metrics, CORS, validation and caching. Services stay private, simpler and free to change.

Patterns include **aggregation** (parallel backend calls with timeouts and partial results) and the **backend for frontend**, giving each client type an endpoint shape of its own. Gateways sit at the edge in front of many services; **load balancers** spread traffic across copies of one service; **service meshes** handle service-to-service traffic inside. **AWS API Gateway** offers cheaper, faster HTTP APIs, feature-rich REST APIs with usage plans and WebSocket APIs, with timeouts and payload limits that push long work into asynchronous designs. Keep the gateway highly available, observable, defined as code and free of business logic.

## Key terms

- **API gateway** — A single entry point that routes requests and applies policies for many backend services.
- **Edge** — The boundary between external clients and internal services.
- **Cross-cutting concern** — A need shared by many services, such as authentication or logging.
- **Route** — A mapping from a public path and method to a backend.
- **Path rewriting** — Changing a request's path between public and internal forms.
- **API key** — An identifier that clients send to identify themselves.
- **Usage plan** — A set of rate limits and quotas for API clients.
- **Quota** — The total number of requests a client may make in a period.
- **Authoriser** — Gateway logic that validates credentials before forwarding.
- **Aggregation** — Combining several backend calls into one response.
- **Backend for frontend (BFF)** — A backend tailored to one type of client.
- **Service mesh** — Infrastructure that manages service-to-service communication.
- **Request ID** — A unique identifier attached to a request for tracing.
- **Integration timeout** — The maximum time a gateway waits for a backend.

## What comes next

Gateways matter most when a system is made of many services. The next chapter, {{ch:microservices}}, looks at microservice architecture: service boundaries, data ownership, communication styles, the costs of distribution, and how to decide between a modular monolith and microservices.
