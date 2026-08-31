# Phase 7 — Chapter 2: Scalability

---

## Chapter Overview

Scalability is the ability of a system to handle increasing load by adding resources. A scalable system grows gracefully without requiring a complete redesign. This chapter covers the core patterns and techniques for scaling every layer of a web application.

**Topics:**
- Vertical vs. horizontal scaling
- Stateless application design
- Load balancing strategies
- Database scaling (read replicas, sharding, partitioning)
- Caching layers
- Async processing for scale
- Microservices vs. monolith for scale

---

## Core Concepts

### Scalability Patterns

```
1. Clone / Horizontal Scaling
   Multiple identical app servers behind a load balancer.
   Requirement: STATELESS (no session in memory — use Redis).
   Auto Scaling Group + ALB on AWS.
   Limitations: database becomes the bottleneck.

2. Database Read Replicas
   Primary handles writes. N replicas handle reads.
   Read:Write = 10:1 → add read replicas.
   Application routes reads to replica endpoint.
   PostgreSQL: up to 5 replicas (RDS) or 15 (Aurora).
   Limitation: replication lag, eventual consistency.

3. Database Sharding
   Split data across multiple databases by shard key.
   User ID % N → shard 0..N-1.
   Each shard is its own database.
   Limitation: cross-shard queries are complex/impossible.
   Alternatives: DynamoDB (shards automatically by partition key).

4. Caching
   Add Redis/Memcached layer between app and database.
   Read-through, write-through, cache-aside patterns.
   90% cache hit rate = 10x effective read throughput.
   Limitation: cache invalidation is hard.

5. Async Processing (Queues)
   Decouple heavy operations from the request path.
   POST /order → queue → worker processes → user notified.
   Enables: scale workers independently, retry, DLQ.
   Redis BullMQ / SQS / RabbitMQ / Kafka.

6. Content Delivery Network
   Cache static assets at edge (CloudFront, Cloudflare).
   Reduces load on origin servers.
   Enables global performance.

7. Microservices
   Split by domain: each service scales independently.
   Order service needs 50 instances, auth service needs 5.
   Complexity: network calls, distributed tracing, consistency.
   Only beneficial after ~10+ engineers or clear scale bottleneck.
```

---

## Scaling Levels

```
Level 1 — Single Server (< 10 req/s)
  One server running: web, app, DB, cache
  Use for: MVP, proof of concept
  Bottleneck: everything on one machine

Level 2 — Separate Database (< 100 req/s)
  App servers + separate DB server
  Scale app servers horizontally (stateless)
  Add load balancer

Level 3 — Add Cache (< 10,000 req/s)
  Redis cache layer between app and DB
  CDN for static assets
  Database still single node

Level 4 — Add Read Replicas (< 100,000 req/s)
  Primary DB for writes + N replicas for reads
  Application-level read/write splitting
  CDN + edge caching

Level 5 — Shard Database (> 100,000 req/s)
  Multiple database shards
  Or: migrate to NoSQL (DynamoDB, Cassandra)
  Service decomposition begins

Level 6 — Global / Multi-Region (millions req/s)
  Multiple regions with data replication
  Global load balancing (Route 53 latency routing)
  Data residency compliance

Design for the NEXT 5-10x growth, not 1000x.
Premature optimization is expensive. Start simple and scale as needed.
```

---

## Code Examples

### Stateless Application (Node.js)

```typescript
// BAD: stateful (session in memory — breaks with multiple instances)
const sessions = new Map<string, { userId: string }>();
app.post("/login", (req, res) => {
  const token = uuid();
  sessions.set(token, { userId: req.body.userId });  // ONLY IN THIS PROCESS
  res.json({ token });
});
app.get("/me", (req, res) => {
  const session = sessions.get(req.headers.token);  // FAILS on other instances!
  res.json(session);
});

// GOOD: stateless (session in Redis — shared across all instances)
import { createClient } from "redis";
const redis = createClient({ url: process.env.REDIS_URL });
await redis.connect();

app.post("/login", async (req, res) => {
  const token = uuid();
  await redis.setEx(`session:${token}`, 86400, JSON.stringify({ userId: req.body.userId }));
  res.json({ token });
});

app.get("/me", async (req, res) => {
  const session = await redis.get(`session:${req.headers.token}`);
  res.json(JSON.parse(session!));
});
// Now any instance can handle any request — horizontal scaling works!
```

### Read/Write Splitting

```typescript
// Route reads to replica, writes to primary
import { Pool } from "pg";

const primary = new Pool({ connectionString: process.env.PRIMARY_DB_URL });
const replica  = new Pool({ connectionString: process.env.REPLICA_DB_URL  });

// Write operations → primary
export async function createOrder(order: Order) {
  return primary.query("INSERT INTO orders ...", [order]);
}

// Read operations → replica (can tolerate slight lag)
export async function getOrderHistory(userId: string) {
  return replica.query("SELECT * FROM orders WHERE user_id = $1", [userId]);
}

// OR: use a Prisma read replica extension
import { PrismaClient } from "@prisma/client";
import { readReplicas } from "@prisma/extension-read-replicas";

const prisma = new PrismaClient().$extends(
  readReplicas({
    url: process.env.REPLICA_DB_URL!
  })
);

// Automatically routes reads to replica
const orders = await prisma.$replica().order.findMany({ where: { userId } });
// Writes still go to primary
const newOrder = await prisma.order.create({ data: orderData });
```

---

## Interview Preparation

**Q1: How would you scale a web application from 100 to 10 million users?**
A: Stage 1 (100 → 1K users): separate app server from DB. Add a basic load balancer for two app instances. Stage 2 (1K → 100K): add Redis caching. Add CDN (CloudFront) for static assets. Optimize DB queries with indexes. Add read replicas for read-heavy queries. Stage 3 (100K → 1M): Auto Scaling for app tier. Database connection pooling (PgBouncer/RDS Proxy). Queue heavy operations (SQS + Lambda workers). Stage 4 (1M → 10M): database sharding or migration to DynamoDB/Cassandra. Multi-region deployment. Service decomposition (separate critical services). At each stage, measure first — optimize the actual bottleneck, not the imagined one.

**Q2: What makes an application stateless and why does it matter for scaling?**
A: Stateless means the server holds no client-specific data between requests — every request contains all information needed to process it (auth token, session data via cookies/headers). State that exists is stored externally (Redis for sessions, DB for data). Why it matters: with stateless servers, any instance can handle any request. Load balancer can use round-robin. You can add/remove instances freely (Auto Scaling works perfectly). With stateful servers: sticky sessions (same user always goes to same server), can't freely remove instances (would lose sessions), complex failover. State to externalize: sessions (Redis), shopping cart (Redis/DynamoDB), auth tokens (JWT or Redis), rate limiting counters (Redis).

---

## Practical Tasks

### Beginner (10 Tasks)
1. Draw a scalability diagram from 1 server → 4 servers.
2. Identify stateful vs. stateless operations in a web app.
3. Move session storage from in-memory to Redis.
4. Set up read/write splitting for a PostgreSQL connection.
5. Add a Redis cache layer to a Node.js app.
6. Build a horizontal scaling test: start 3 instances, verify all handle requests.
7. Measure response time before/after adding Redis cache.
8. Implement cache-aside pattern for a database query.
9. Set up a simple health check endpoint.
10. Calculate the read/write ratio for a sample application.

### Intermediate (10 Tasks)
1. Design sharding strategy for a user database (100M users).
2. Implement consistent hashing for cache key distribution.
3. Build async job processing with SQS + Lambda.
4. Profile a Node.js app to find CPU/memory bottlenecks.
5. Implement connection pooling with PgBouncer or RDS Proxy.
6. Add auto-scaling to ECS service based on CPU.
7. Implement distributed rate limiting with Redis.
8. Measure cache hit rate and optimize for > 90%.
9. Design a multi-tier caching strategy (CDN + Redis + in-memory).
10. Implement circuit breaker to prevent cascade failures.

### Advanced (10 Tasks)
1. Design and implement database sharding for 10M+ records.
2. Build a global multi-region active-active deployment.
3. Implement consistent hashing ring for distributed caching.
4. Design a system that scales from 0 to 1M requests/day with no changes.
5. Build automatic failover testing (chaos engineering).
6. Implement database connection pooling at scale.
7. Design a hot partition mitigation strategy for DynamoDB.
8. Build observability for a scaled multi-instance deployment.
9. Implement blue-green deployment for a scaled ASG.
10. Conduct a load test at 10x expected peak traffic.

---

## Cheat Sheet

```
Scalability patterns by layer:
  Web/App tier:   Horizontal scaling (stateless) + Load Balancer + Auto Scaling
  Cache tier:     Redis/Memcached + Consistent hashing + Eviction policies
  DB reads:       Read replicas + Connection pooling + Query optimization
  DB writes:      Sharding by key + Write-ahead logging + Event sourcing
  Async work:     Message queues (SQS/Kafka) + Worker pools + DLQ
  Static content: CDN (CloudFront) + Cache headers + compression
  Global:         Multi-region + GeoDNS + Data replication

Numbers to know for scaling:
  Nginx (single server):   50,000 concurrent connections
  PostgreSQL (bare metal): 5,000–10,000 QPS for simple queries
  Redis:                   100,000+ ops/sec per node
  S3:                      5,500 GET/s + 3,500 PUT/s per prefix (unlimited prefixes)
  DynamoDB:                unlimited (provisioned throughput or on-demand)
  Kafka:                   millions of messages/sec per cluster
```
