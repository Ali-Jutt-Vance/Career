# Phase 7 — Chapter 6: Distributed Systems

---

## Chapter Overview

A distributed system is a collection of independent computers that appear as a single coherent system to users. They communicate over a network and must coordinate despite network failures, node crashes, and timing uncertainties.

**Topics:**
- Fallacies of distributed computing
- Consistency models (strong, eventual, linearizability)
- Consensus algorithms (Raft, Paxos)
- Distributed transactions (2PC, Saga)
- Clock synchronization and logical clocks
- Replication strategies (leader-follower, multi-leader, leaderless)
- Failure modes and detection

---

## Core Concepts

### The 8 Fallacies of Distributed Computing

```
These are assumptions developers make that are WRONG in distributed systems:

1. The network is reliable          → Packets are lost, connections drop
2. Latency is zero                  → Network adds 1–300ms depending on distance
3. Bandwidth is infinite            → Network is congested, throttled
4. The network is secure            → Packets can be intercepted, modified
5. Topology doesn't change          → IPs change, services move
6. There is one administrator       → Multiple teams own different systems
7. Transport cost is zero           → Serialization, encryption, egress costs
8. The network is homogeneous       → Different OS, hardware, protocol versions

Design Implication:
  Always assume: network calls fail. Handle timeouts, retries, circuit breakers.
  Always assume: clocks are not synchronized. Use logical clocks or vector clocks.
  Always assume: partial failures. Service A can fail while B keeps running.
```

### Consistency Models

```
Strong Consistency (Linearizability):
  After a write succeeds, any subsequent read sees that write.
  Behaves as if there's one copy of data.
  Slowest (requires coordination).
  Example: ZooKeeper, etcd, PostgreSQL with synchronous replication.
  Use: leader election, configuration, anything requiring "latest data."

Sequential Consistency:
  All operations appear in a global order consistent with each process's order.
  Weaker than linearizability (doesn't require real-time ordering).

Causal Consistency:
  Causally related operations appear in order to all processes.
  "Happened-before" relationship preserved.
  A → B means all nodes see A before B.
  Example: MongoDB causally consistent sessions.

Eventual Consistency:
  If no new updates, all replicas will eventually converge to same value.
  No guarantee on HOW LONG "eventually" takes.
  Highest availability, lowest latency.
  Example: DynamoDB (default), Cassandra, DNS.
  Use: shopping cart, social feed, profile views (can tolerate stale).

Read-your-own-writes:
  After you write, you see your own write.
  Others might not see it yet.
  Common practical requirement: user updates profile, immediately sees update.
```

### Replication

```
Leader-Follower (Primary-Replica):
  One leader handles writes. Followers replicate asynchronously (or sync).
  Reads from followers possible (eventual consistency).
  On leader failure: elect new leader (Raft/Paxos).
  Examples: PostgreSQL, MySQL, Redis, MongoDB replica set.
  Tradeoff: all writes through leader → write bottleneck.

Multi-Leader:
  Multiple nodes accept writes. Conflict resolution required.
  Use: multi-datacenter (each datacenter has a leader).
  Problem: write conflicts when same record updated in two datacenters.
  Conflict resolution: last-write-wins, application-level merge.
  Example: CouchDB, Google Docs (operational transformation).

Leaderless (Dynamo-style):
  Any node accepts reads and writes.
  Quorum-based: write to W nodes, read from R nodes, W + R > N (total nodes).
  Example: Amazon DynamoDB, Apache Cassandra.
  Quorum default: N=3, W=2, R=2 (read & write to majority)
  Tradeoff: no single point of failure, complex conflict resolution.
```

---

## Consensus and Raft

```
Consensus: getting a cluster of nodes to agree on a value.
Required for: leader election, distributed locks, config replication.

Raft Algorithm (simplified):
  Nodes: one Leader, rest Followers, or Candidate during election.
  
  Leader election:
    Followers wait for heartbeat from leader.
    Timeout (randomized 150-300ms) → becomes Candidate → votes for self.
    Sends RequestVote to others → if majority vote yes → becomes Leader.
    Leader sends heartbeats to prevent new elections.

  Log replication:
    Client sends command to Leader.
    Leader appends to log, sends AppendEntries to all Followers.
    When majority ACK → Leader commits → applies to state machine.
    Followers apply on next heartbeat.

  Safety:
    Split-brain prevention: leader must have majority of votes.
    Log matching: entries with same index and term are identical.
    Leader completeness: leader always has all committed entries.

Used in: etcd (Kubernetes), CockroachDB, TiKV, Consul.
```

---

## Code Examples

### Circuit Breaker Pattern

```typescript
enum CircuitState { CLOSED, OPEN, HALF_OPEN }

class CircuitBreaker {
  private state     = CircuitState.CLOSED;
  private failures  = 0;
  private lastFailAt = 0;

  constructor(
    private readonly threshold: number = 5,     // failures before opening
    private readonly timeout:   number = 30000  // ms before trying again
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() - this.lastFailAt > this.timeout) {
        this.state = CircuitState.HALF_OPEN;
      } else {
        throw new Error("Circuit OPEN — service unavailable");
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure();
      throw err;
    }
  }

  private onSuccess() {
    this.failures = 0;
    this.state    = CircuitState.CLOSED;
  }

  private onFailure() {
    this.failures++;
    this.lastFailAt = Date.now();
    if (this.failures >= this.threshold) {
      this.state = CircuitState.OPEN;
    }
  }

  getState() { return this.state; }
}

// Usage
const paymentCircuit = new CircuitBreaker(5, 30_000);

async function chargeCard(amount: number) {
  return paymentCircuit.execute(() => paymentGateway.charge(amount));
}
```

### Idempotency Key Pattern

```typescript
// Ensure that retried requests don't create duplicates
// Client generates idempotency key (UUID), sends with request

const IDEMPOTENCY_TTL = 3600;  // 1 hour

export async function createPaymentIdempotent(
  idempotencyKey: string,
  amount:          number,
  userId:          string
) {
  const cacheKey = `idempotency:payment:${idempotencyKey}`;

  // Check if we've seen this key before
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);  // return same result as before
  }

  // Process the payment
  const result = await processPayment({ amount, userId });

  // Store result for idempotency (atomic: won't be stored twice)
  await redis.setEx(cacheKey, IDEMPOTENCY_TTL, JSON.stringify(result));

  return result;
}

// Express middleware to handle idempotency
export function idempotencyMiddleware(req: Request, res: Response, next: NextFunction) {
  const key = req.headers["idempotency-key"] as string;
  if (!key) return next();

  req.idempotencyKey = key;
  next();
}
```

### Distributed Locking with Redis

```typescript
import Redlock from "redlock";

const redlock = new Redlock([redis], {
  driftFactor:          0.01,
  retryCount:           3,
  retryDelay:           200,   // ms
  retryJitter:          200,   // randomize to avoid thundering herd
  automaticExtensionThreshold: 500  // ms before expiry to extend
});

// Distributed lock: only ONE instance can run this at a time
export async function processPayment(orderId: string, amount: number) {
  const lockKey      = `payment:lock:${orderId}`;
  const lockDuration = 10000;  // 10 seconds max

  let lock;
  try {
    lock = await redlock.acquire([lockKey], lockDuration);

    // Critical section: only one instance can be here at a time
    await chargeCustomer(amount);
    await updateOrderStatus(orderId, "paid");

  } finally {
    await lock?.release();
  }
}
```

---

## Interview Preparation

**Q1: What is the difference between consistency models in distributed systems?**
A: Linearizability (strong consistency): most intuitive — after a write, any read anywhere sees it. Requires coordination. Use for locks, leader election, configs. Sequential consistency: weaker — all ops appear in some global order consistent with each process's order, but no real-time guarantee. Causal consistency: causally related ops are ordered. Unrelated ops can be in any order. Practical — used by MongoDB sessions. Eventual consistency: replicas eventually converge if no new updates. No time bound. Highest availability. Use for social feeds, DNS, shopping carts. Read-your-own-writes: a guarantee that after you write, YOU see it (others might not). Common for user-facing systems. The tradeoff is always: stronger consistency = lower availability, higher latency.

**Q2: What is the two-generals problem and why does it matter?**
A: The two-generals problem proves that it's impossible to achieve guaranteed agreement over an unreliable network in a finite number of messages. Even with infinite retries, you can never be 100% certain both sides committed. Practical implication: we can never have perfect distributed transactions. This is why: exactly-once delivery doesn't exist without application-level idempotency. Distributed transactions (2PC) can block indefinitely if a coordinator fails. Saga is preferred: compensating transactions rather than blocking. The only practical solution: design systems to be idempotent and to tolerate partial failures. When a payment request times out, the client doesn't know if the server processed it or not — the client must either retry idempotently or query the status.

**Q3: What is a split-brain scenario and how do you prevent it?**
A: Split-brain: a cluster becomes partitioned into two groups that each think the other is dead and both elect a new leader. Both halves accept writes, diverging the data. Very dangerous — can lead to data corruption, double charges. Prevention: Quorum-based decisions: require majority (N/2 + 1) vote for any write or leader election. With 3 nodes: need 2 to agree. If partitioned into {1} and {2}, the 2-node group can still proceed; the 1-node group cannot make progress. Examples: etcd/Raft requires majority to elect leader or commit. Redis Sentinel requires majority for failover. DynamoDB uses quorum reads/writes (W+R > N). Fencing tokens: when a new leader is elected, it gets a monotonically increasing token. Old leaders with smaller tokens are rejected by storage.

---

## Practical Tasks

### Beginner (10 Tasks)
1. List the 8 fallacies of distributed computing and explain each.
2. Implement a simple retry with exponential backoff.
3. Add a timeout to all HTTP calls in a service.
4. Implement a health check endpoint.
5. Use correlation ID to trace requests across services.
6. Simulate a network failure with a 50ms random delay.
7. Implement basic circuit breaker.
8. Add idempotency key handling to a payment endpoint.
9. Log all inter-service calls with latency and status.
10. Test service behavior when a dependency is down.

### Intermediate (10 Tasks)
1. Implement circuit breaker with state transitions (CLOSED/OPEN/HALF_OPEN).
2. Add distributed locking with Redis for critical sections.
3. Implement distributed rate limiting (Redis sorted sets).
4. Build a retry queue for failed inter-service calls.
5. Implement idempotency for payment endpoints.
6. Add structured logging with correlation IDs.
7. Implement health aggregation endpoint for all dependencies.
8. Test split-brain prevention with Redis Sentinel.
9. Add Prometheus metrics for circuit breaker state.
10. Simulate and test Byzantine fault tolerance.

### Advanced (10 Tasks)
1. Implement a Raft-based distributed consensus (educational).
2. Build a distributed lock manager.
3. Design a gossip protocol for service discovery.
4. Implement vector clocks for causality tracking.
5. Build a CRDT-based distributed counter.
6. Design a system that handles network partition gracefully.
7. Implement fencing tokens for leader leases.
8. Build a distributed queue with at-most-once and at-least-once delivery.
9. Implement a distributed snapshot algorithm.
10. Design a chaos engineering test suite for distributed failures.

---

## Cheat Sheet

```
Key distributed systems guarantees:
  CAP: choose 2 of Consistency, Availability, Partition tolerance
  PACELC: during partition (C vs A), else (L vs C) — latency vs consistency

Failure modes to handle:
  Crash failure:   node stops (easiest to handle)
  Omission:        node drops messages (no response)
  Timing:          response comes too late (timeout)
  Byzantine:       node sends incorrect/malicious data (hardest)

Circuit Breaker states:
  CLOSED:    requests pass through normally
  OPEN:      requests fail immediately (fast failure)
  HALF_OPEN: test if service recovered (allow one request)

Distributed lock rules:
  Always set TTL (prevents indefinite lock if holder crashes)
  Use randomized lock ID (prevent releasing another's lock)
  Extend lock TTL before expiry for long-running operations

Idempotency key pattern:
  Client generates UUID per logical operation
  Server stores result with key (Redis TTL = 1 hour)
  Retry: same key → same result (no duplicate processing)
```
