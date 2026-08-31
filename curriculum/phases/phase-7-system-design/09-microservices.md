# Phase 7 — Chapter 9: Microservices

---

## Chapter Overview

Microservices is an architectural style that structures an application as a collection of small, independently deployable services. Each service is focused on a specific business capability, owns its own data, and communicates via well-defined APIs.

**Topics:**
- Microservices vs. monolith
- Service boundaries (Domain-Driven Design)
- Inter-service communication (sync vs. async)
- Service discovery
- Data ownership and eventual consistency
- Service mesh (Istio, Linkerd)
- When NOT to use microservices

---

## Core Concepts

### Monolith vs. Microservices

```
Monolith — All modules in one deployable unit
  ┌──────────────────────────────────────┐
  │  Auth │ Orders │ Products │ Users    │
  │              ONE PROCESS             │
  └──────────────────────────────────────┘
  
  Benefits:
    Simple to develop, test, deploy
    In-process calls (no network latency)
    Easier to debug (one log, one process)
    ACID transactions across modules
    No distributed systems complexity
  
  Problems:
    All teams deploy together (coordination overhead)
    Scale entire app even if only one module needs it
    Technology stack locked in
    Large codebase → hard to navigate
    One failure can cascade to all modules

Microservices — Each capability its own service
  ┌──────────┐  ┌──────────┐  ┌──────────┐
  │  Auth    │  │  Orders  │  │ Products │
  │ Service  │  │ Service  │  │ Service  │
  └──────────┘  └──────────┘  └──────────┘
  
  Benefits:
    Independent deployment (teams ship without coordination)
    Scale only what needs scaling
    Technology flexibility per service
    Fault isolation (payment service down ≠ catalog down)
    Small, focused codebase per service
  
  Problems:
    Network calls (latency, failures)
    No ACID across services (eventual consistency)
    Distributed tracing complexity
    More infrastructure (N deployments, N databases)
    Harder to test end-to-end
    Overkill for small teams (<10 engineers)

Rule of thumb:
  Start with a well-structured monolith (modular monolith).
  Extract services when you hit a clear pain point:
    - Different scaling requirements
    - Different technology needs
    - Different release cadences
    - Team size > 15-20 engineers
```

### Service Boundaries (Domain-Driven Design)

```
Bounded Context: a boundary within which a domain model applies.
Each Bounded Context = one microservice (roughly).

E-commerce example:
  Catalog Context:    Product, Category, Search
  Order Context:      Order, OrderItem, OrderStatus
  Payment Context:    Payment, Transaction, Refund
  Shipping Context:   Shipment, TrackingNumber, Carrier
  Identity Context:   User, Session, Auth

Rules:
  Each service owns its own database (no shared DB!)
  Services never call each other's database directly
  Cross-context queries: API calls or event-based
  Duplication is acceptable (User table in both Order and Payment)
  — Each context owns a subset of attributes it needs
```

---

## Code Examples

### Service Communication Patterns

```typescript
// ─── Synchronous (HTTP/gRPC) ──────────────────────
// Order service calls user service to get user details
// Use for: queries where response is needed immediately

// services/order.service.ts
async function createOrder(userId: string, items: CartItem[]) {
  // Synchronous call: need user immediately for validation
  const user = await userServiceClient.getUser(userId);
  if (!user.emailVerified) {
    throw new Error("Email not verified");
  }

  const order = await db.order.create({
    data: { userId, amount: calculateTotal(items), status: "pending" }
  });

  // Async event: don't need to wait for payment to start
  await kafka.send({
    topic:    "order.events",
    messages: [{ value: JSON.stringify({ type: "order.created", orderId: order.id, userId, amount: order.amount }) }]
  });

  return order;
}

// User service client with resilience
class UserServiceClient {
  private circuit = new CircuitBreaker(5, 30_000);

  async getUser(userId: string) {
    return this.circuit.execute(async () => {
      const response = await fetch(`http://user-service/users/${userId}`, {
        headers: { "X-Correlation-Id": getCurrentCorrelationId() },
        signal:   AbortSignal.timeout(3000)   // 3 second timeout
      });
      if (!response.ok) throw new Error(`User service error: ${response.status}`);
      return response.json();
    });
  }
}

// ─── Asynchronous (Events) ───────────────────────
// Payment service subscribes to order.created
// Processes payment without blocking the order creation

// payment.consumer.ts
consumer.run({
  eachMessage: async ({ message }) => {
    const event = JSON.parse(message.value!.toString());

    if (event.type === "order.created") {
      try {
        const charge = await stripe.paymentIntents.create({
          amount:   Math.round(event.amount * 100),
          currency: "usd",
          metadata: { orderId: event.orderId }
        });

        await kafka.send({
          topic:    "payment.events",
          messages: [{ value: JSON.stringify({ type: "payment.succeeded", orderId: event.orderId, chargeId: charge.id }) }]
        });
      } catch (err) {
        await kafka.send({
          topic:    "payment.events",
          messages: [{ value: JSON.stringify({ type: "payment.failed", orderId: event.orderId, reason: (err as Error).message }) }]
        });
      }
    }
  }
});
```

### Service Mesh with Envoy Sidecar

```yaml
# Istio VirtualService: traffic management
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: order-service
spec:
  hosts:
    - order-service
  http:
    - match:
        - headers:
            x-canary:
              exact: "true"
      route:
        - destination:
            host:   order-service
            subset: v2   # canary
    - route:
        - destination:
            host:   order-service
            subset: v1   # stable
          weight: 95
        - destination:
            host:   order-service
            subset: v2   # canary 5%
          weight: 5

---
# Circuit breaking via Istio
apiVersion: networking.istio.io/v1alpha3
kind: DestinationRule
metadata:
  name: order-service
spec:
  host: order-service
  trafficPolicy:
    outlierDetection:
      consecutive5xxErrors:  5
      interval:              30s
      baseEjectionTime:      30s
      maxEjectionPercent:    50
    connectionPool:
      http:
        http1MaxPendingRequests: 100
        http2MaxRequests:        200
```

---

## Interview Preparation

**Q1: What are the main challenges of microservices and how do you address them?**
A: 1) Distributed transactions: no ACID across services. Solution: Saga pattern (compensating transactions), design for eventual consistency. 2) Network reliability: sync calls can fail. Solution: circuit breakers, retries, timeouts, async communication for non-critical paths. 3) Distributed tracing: request spans multiple services, hard to follow. Solution: correlation IDs in all headers, OpenTelemetry, Jaeger/Zipkin. 4) Data consistency: each service owns its DB, reads may be stale. Solution: accept eventual consistency, use events to synchronize, read own writes. 5) Testing complexity: hard to test end-to-end across services. Solution: contract testing (Pact), integration tests against real services in staging. 6) Operational overhead: N services = N deployments, configs, monitoring. Solution: platform team, Kubernetes, service mesh, GitOps.

**Q2: How do you decide what should be a separate microservice?**
A: The key question: does this capability have an independent lifecycle? Signs that warrant extraction: different scaling requirements (payment service needs 10x more during Black Friday vs. other services), different technology requirements (ML model needs Python, rest is Node.js), different release cadence (catalog updates rarely, order processing updates weekly), team boundary (Conway's Law: system architecture mirrors the communication structure of the team that builds it), clear bounded context with its own data and no tight coupling. Signs you should NOT extract: still early/small team (< 5 engineers), no clear domain boundary, functionality is tightly coupled to another service, no proven need to scale independently.

---

## Practical Tasks

### Beginner (10 Tasks)
1. Draw the domain model of an e-commerce system.
2. Identify bounded contexts (catalog, order, payment, shipping).
3. Define the API contract between order and payment service.
4. Implement an order service with an async event publish.
5. Implement a payment service that listens to order events.
6. Add timeout (3 seconds) to all inter-service HTTP calls.
7. Add correlation ID header to all forwarded calls.
8. Build a health check that checks downstream dependencies.
9. Test order service in isolation (mock payment service).
10. Deploy two services with Docker Compose.

### Intermediate (10 Tasks)
1. Implement circuit breaker in inter-service communication.
2. Add distributed tracing with OpenTelemetry.
3. Implement a Saga for the order→payment→inventory flow.
4. Design the data model for each service (own DB).
5. Implement contract testing between order and payment service.
6. Build a canary deployment for one service.
7. Implement retry with exponential backoff on service calls.
8. Add structured logging with shared correlation ID across services.
9. Build aggregation endpoint in API gateway.
10. Monitor each service independently with Prometheus.

### Advanced (10 Tasks)
1. Implement full saga orchestration with state machine.
2. Design and implement service discovery.
3. Set up Istio service mesh with traffic management.
4. Implement blue-green deployment across all services.
5. Build end-to-end integration test suite.
6. Design database per service for 5 services.
7. Implement event-driven data synchronization.
8. Build a developer platform for self-service service creation.
9. Implement zero-trust security between services.
10. Conduct failure injection testing (chaos engineering).

---

## Cheat Sheet

```
Microservices decision matrix:
  Use when:      Large team, clear bounded contexts, need independent scaling
  Don't use:     Small team (<10), unclear boundaries, high operational cost

Communication:
  Sync (HTTP/gRPC):  immediate response needed, queries
  Async (events):    decoupled, fire-and-forget, higher throughput

Data rules:
  Each service = its own database
  Never share a database between services
  Accept data duplication across services
  Use events to synchronize state changes

Resilience patterns:
  Circuit breaker:    stop calling failing services
  Retry:              exponential backoff + jitter
  Timeout:            all calls have a timeout (default: 3s)
  Bulkhead:           limit concurrent calls to each service
  Fallback:           return cached/default response on failure

Observability must-haves:
  Correlation ID:     trace one request across all services
  Structured logs:    JSON with service, trace ID, duration
  Metrics:            request count, latency p99, error rate per service
  Distributed traces: Jaeger, Zipkin, AWS X-Ray
```
