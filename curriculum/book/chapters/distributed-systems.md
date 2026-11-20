# Distributed Systems

> [!GOALS]
> - Explain what makes distributed systems hard: **partial failure**, unreliable networks, and no shared clock.
> - Use **timeouts**, **retries with backoff and jitter**, **idempotency**, **circuit breakers** and **bulkheads** correctly.
> - Understand replication, **quorums**, consistency models and the **CAP**/PACELC trade-offs in practice.
> - Order events without trusting wall clocks: **logical clocks** and why time is tricky.
> - Know what **consensus** (Raft, Paxos) provides, where you meet it, and why distributed locks need **fencing**.
> - Recognise the fallacies of distributed computing in real designs.

## Why this matters

Every system in this part of the book is distributed: an API calling a database over the network, services exchanging messages, caches and replicas in several zones. The moment two computers cooperate over a network, a new class of problems appears that does not exist inside one program. A request can fail **after** doing its work. A server can be alive but unreachable. Two machines can disagree about the time, or about who is the leader. A retry meant to help can multiply load until everything falls over.

These problems cause many of the hardest production incidents — duplicate charges, lost updates, cascading outages, split-brain databases. Understanding them is what separates engineers who build systems that work in demos from those whose systems work at 3 a.m. under real traffic. This chapter collects the essential ideas; {{ch:system-design-fundamentals}} introduced CAP, and {{ch:replication}} replication.

## The simple idea

Imagine coordinating a project with colleagues only by post. You send a letter and wait. If no answer arrives, you do not know whether the letter was lost, the colleague is ill, or their reply is lost on the way back — or whether they did the work. Clocks in different offices show slightly different times, so "who wrote first?" is not obvious. And if you send the same request twice to be safe, the work might be done twice.

> [!ANALOGY]
> A distributed system is like a team that can only communicate by post: letters can be delayed or lost, nobody knows for sure whether silence means "busy", "ill" or "lost", and clocks in different offices disagree.
>
> **Where the analogy breaks:** postal delays take days, so people plan for them. Networks usually answer in milliseconds, which tempts engineers to forget that sometimes they do not. Distributed systems fail rarely enough to be ignored in testing, and often enough to cause incidents in production.

## The proper definition and key words

A **distributed system** is a set of independent computers that communicate over a network and coordinate to appear as one system to its users. Its parts can fail independently (**partial failure**), messages can be delayed, lost, duplicated or reordered, and there is no global clock.

Key words:

- **Partial failure** — some components fail while others continue.
- **Timeout** — giving up waiting after a set time; the outcome of the operation is then **unknown**.
- **Retry / backoff / jitter** — trying again / waiting longer each time / adding randomness to waits.
- **Idempotency** — repeating an operation has the same effect as doing it once.
- **Circuit breaker** — stops calling a failing dependency for a while.
- **Bulkhead** — isolates resources (pools, threads) per dependency so one cannot exhaust all.
- **Replication / quorum** — keeping copies on several nodes / requiring a minimum number of nodes to agree.
- **Consistency model** — what a reader may observe: linearizable, sequential, causal, read-your-writes, eventual.
- **Network partition** — nodes that cannot reach each other.
- **Logical clock** — a counter that orders events by cause, not wall time (Lamport clocks, vector clocks).
- **Consensus** — nodes agreeing on a value or leader despite failures (Raft, Paxos).
- **Split brain** — two nodes both believing they are the leader.
- **Fencing token** — an increasing number that lets a resource reject requests from an outdated leader or lock holder.

## Failure handling

### Level 1 — Timeouts: the unknown outcome

When a call times out, **you do not know what happened**: the request may never have arrived, may have been processed and the reply lost, or may still be running. This single fact explains most distributed-systems patterns.

- **Always set timeouts** on network calls; libraries' defaults are often infinite or minutes long. A missing timeout turns a slow dependency into exhausted connection pools everywhere (Little's Law, {{ch:scalability}}).
- **Budget** timeouts down the call chain: if the user's request has 2 seconds, the API cannot give its dependency 5.
- After a timeout, **check** (query whether the payment exists) or **retry an idempotent operation** — never blindly repeat a non-idempotent one.

### Level 2 — Retries, backoff, jitter and idempotency

- **Retry only transient failures** (timeouts, 503, connection resets), not permanent ones (400, 404, validation errors).
- **Exponential backoff with jitter**: wait roughly 100 ms, 200 ms, 400 ms… with random variation, so thousands of clients do not retry in synchronised waves. **Limit** attempts and keep the total within the caller's timeout.
- **Retry at one layer**: if the browser, the API and the service client all retry three times, one failing call becomes 27 calls.
- **Make operations idempotent** so retries are safe: an **idempotency key** sent by the client (`Idempotency-Key: 7f3c…`) stored with the result, so a repeated request returns the stored result instead of acting again; unique constraints; "set" operations instead of "add" ({{ch:rest-apis}}).

### Level 3 — Circuit breakers and bulkheads

When a dependency is down, every call still waits for its timeout, holding resources and adding load to a struggling service. A **circuit breaker** fails fast instead — the last line of this chapter's example shows its states:

```ts
// 1. Quorums: N replicas, a write waits for W acknowledgements, a read asks R replicas.
//    If R + W > N, every read overlaps the latest write on at least one replica.
type Replica = { name: string; version: number; value: string; reachable: boolean };
const make = (): Replica[] => ["r1", "r2", "r3"].map((name) => ({ name, version: 1, value: "price=450", reachable: true }));

function write(rs: Replica[], value: string, version: number, w: number): string {
  const up = rs.filter((r) => r.reachable);
  if (up.length < w) return `write rejected: only ${up.length} of ${w} replicas reachable`;
  for (const r of up.slice(0, w)) { r.version = version; r.value = value; }       // the rest catch up later
  return `write acknowledged by ${w}`;
}
function read(rs: Replica[], r: number): string {
  const answers = rs.filter((x) => x.reachable).slice(-r);                          // ask r reachable replicas
  if (answers.length < r) return "read failed: not enough replicas";
  const newest = answers.reduce((a, b) => (b.version > a.version ? b : a));
  return `${newest.value} (asked ${answers.map((a) => a.name).join(",")})`;
}
for (const [w, r] of [[1, 1], [2, 2]] as const) {
  const rs = make();
  console.log(`N=3 W=${w} R=${r}: ${write(rs, "price=399", 2, w)}; read -> ${read(rs, r)}`);
}
const partitioned = make(); partitioned[0]!.reachable = false; partitioned[1]!.reachable = false;
console.log(`two replicas unreachable, W=2: ${write(partitioned, "price=399", 2, 2)}  (consistency chosen over availability)`);

// 2. Lamport clocks: order events across machines without trusting wall clocks
class Node {
  clock = 0;
  constructor(public name: string) {}
  local(what: string) { this.clock++; return `${this.name}@${this.clock} ${what}`; }
  send() { this.clock++; return this.clock; }
  receive(ts: number, what: string) { this.clock = Math.max(this.clock, ts) + 1; return `${this.name}@${this.clock} ${what}`; }
}
const a = new Node("A"), b = new Node("B");
const log = [a.local("order placed"), b.local("stock checked")];
const ts = a.send(); log.push(b.receive(ts, "payment message received from A"));
log.push(b.local("stock reserved"));
console.log(log.join(" | "));

// 3. A circuit breaker: stop calling a failing dependency, then test it again after a pause
type St = "closed" | "open" | "half-open";
let state: St = "closed", failures = 0, openedAt = 0;
function call(now: number, dependencyUp: boolean): string {
  if (state === "open" && now - openedAt >= 30) state = "half-open";
  if (state === "open") return "fail fast (open)";
  if (!dependencyUp) {
    failures++;
    if (state === "half-open" || failures >= 3) { state = "open"; openedAt = now; return "error -> breaker OPEN"; }
    return `error ${failures}/3`;
  }
  state = "closed"; failures = 0;
  return "ok";
}
const timeline: [number, boolean][] = [[0, true], [1, false], [2, false], [3, false], [4, false], [10, true], [35, true], [36, true]];
console.log(timeline.map(([t, up]) => `t=${t}: ${call(t, up)}`).join("; "));
```

**Output:**

```text
N=3 W=1 R=1: write acknowledged by 1; read -> price=450 (asked r3)
N=3 W=2 R=2: write acknowledged by 2; read -> price=399 (asked r2,r3)
two replicas unreachable, W=2: write rejected: only 1 of 2 replicas reachable  (consistency chosen over availability)
A@1 order placed | B@1 stock checked | B@3 payment message received from A | B@4 stock reserved
t=0: ok; t=1: error 1/3; t=2: error 2/3; t=3: error -> breaker OPEN; t=4: fail fast (open); t=10: fail fast (open); t=35: ok; t=36: ok
```

The first three lines are about quorums and the fourth about logical clocks, both discussed below. The circuit breaker:

- After three consecutive errors, the breaker **opened**: calls at t=4 and t=10 failed immediately without touching the dependency, giving it room to recover and freeing the caller's resources.
- After 30 seconds it went **half-open** and let one trial call through; it succeeded, so the breaker **closed** again. Had it failed, the breaker would have opened for another period.
- While open, return a **fallback** where possible (cached data, a default, "recommendations unavailable") — graceful degradation.
- **Bulkheads** give each dependency its own connection pool or concurrency limit, so a slow recommendations service cannot use up the connections the checkout needs. Libraries (opossum for Node.js, resilience4j, service meshes such as Envoy) provide these patterns.

## Replication and consistency

### Level 3 — Quorums

With data on **N** replicas, a write can wait for **W** acknowledgements and a read can ask **R** replicas. The first three lines of the output show the trade-off:

- With **W=1, R=1**, the write was acknowledged by one replica, and the read happened to ask a different one — it returned the **old** price. Fast, highly available, but reads can be stale.
- With **W=2, R=2** (so **R + W > N**), every read set overlaps every write set on at least one replica; taking the newest version returned the **new** price.
- When two of three replicas were unreachable, the W=2 write was **rejected**: the system chose **consistency over availability** during the partition — CAP in one line. A system configured with W=1 would have accepted it and risked divergence.
- Real systems (Cassandra, DynamoDB internally, Riak) add repair mechanisms — read repair, hinted handoff, anti-entropy — to bring lagging replicas up to date.

### Level 3 — Consistency models

From strongest to weakest:

- **Linearizable**: every operation appears to happen at one instant between its start and end; everyone sees the same latest value. What a single-primary database gives for its own data; needed for locks, leader election and unique constraints.
- **Sequential / causal**: operations appear in an order consistent with each client's order / with cause and effect (a reply never appears before the message it answers).
- **Read-your-writes / monotonic reads**: a user sees their own writes and never sees data go backwards ({{ch:database-scaling}}).
- **Eventual**: replicas converge if writes stop; reads may be stale meanwhile. Fine for feeds, counters, caches and search indexes.

Choose per operation, and state the choice in the design. Stronger models cost latency and availability (PACELC).

## Time and order

### Level 4 — Clocks lie; order by causality

Wall clocks on different machines drift and are corrected in jumps by NTP; a timestamp from machine A and one from machine B cannot be compared reliably to order events milliseconds apart. Two consequences:

- **Do not resolve conflicts by "latest timestamp wins"** across machines without understanding the risk of silently losing writes.
- **Logical clocks** order events by causality instead. A **Lamport clock** increments on each local event and, on receiving a message, jumps past the sender's value. In the fourth output line, B's "payment message received from A" got timestamp 3, after A's send (2) — so any event caused by the message is ordered after it, whatever the wall clocks say. **Vector clocks** go further and detect events that are truly concurrent.
- Use **database-generated sequence numbers or versions** within one system, and **monotonic clocks** (not wall clocks) for measuring durations and timeouts.
- Specialised systems (Google Spanner's TrueTime, AWS's time sync with bounded error) make wall time usable by knowing its uncertainty.

## Agreement

### Level 4 — Consensus, leaders and locks

Some problems need nodes to **agree**: which node is the database primary, who holds a lock, what the next entry in a replicated log is. **Consensus algorithms** — **Raft** and **Paxos** — solve this safely as long as a **majority** of nodes can communicate. You rarely implement them, but you use them constantly: etcd (Kubernetes' brain, {{ch:eks}}), ZooKeeper, Consul, Kafka's KRaft, CockroachDB and many managed databases' failover.

- A cluster of 3 survives 1 failure; 5 survive 2. An even number adds no tolerance.
- **Split brain**: after a partition, an old leader may not know it has been replaced. Systems prevent harm with **fencing tokens**: each new leader or lock holder gets a higher number, and storage rejects writes carrying an older number.
- **Distributed locks** (for example with Redis) are only safe with expiry **and** fencing: a lock holder can pause (garbage collection, a slow VM) past the lock's expiry and wake up believing it still holds it. For correctness-critical work, prefer database constraints, conditional writes or a consensus-backed store ({{ch:redis}}).

### Level 4 — The fallacies of distributed computing

The classic list of false assumptions, each a source of real incidents:

1. The network is reliable.
2. Latency is zero.
3. Bandwidth is infinite.
4. The network is secure.
5. Topology does not change.
6. There is one administrator.
7. Transport cost is zero.
8. The network is homogeneous.

Review designs against them: what happens when this call fails, is slow, is repeated, or arrives out of order?

## From beginner to enterprise

**Level 1–2 — the basics.** Timeouts on every call; the unknown outcome after a timeout; retries only for transient errors, with backoff, jitter and limits; idempotency keys.

**Level 3 — resilience patterns.** Circuit breakers with fallbacks; bulkheads; quorums and R + W > N; choosing consistency models per operation.

**Level 4 — correctness.** Logical clocks and versioning instead of wall-clock ordering; consensus-backed coordination; fencing tokens; careful use of distributed locks.

**Level 5 — senior practice.** Reviewing designs for partial failure; chaos experiments and game days; designing idempotent, order-tolerant workflows across services.

**Level 6 — enterprises.** Multi-region consistency strategies, platform-level resilience (service meshes), and organisation-wide standards for timeouts, retries and failure testing.

## Real-world use cases

### The double charge

- **What happened**: the payment API timed out; the client retried; both requests were processed, charging the customer twice.
- **Fix**: an idempotency key per checkout attempt, stored with the payment result; the retry returned the first result. Timeouts now lead to a status check, not a blind retry.

### The retry storm

- **What happened**: a database slowed briefly. Every service retried three times immediately at three layers; load multiplied, and the database could not recover for 20 minutes.
- **Fix**: retries in one layer only, exponential backoff with jitter, retry budgets, and circuit breakers in front of the database clients.

## Common mistakes

### Beginner: no timeouts

**Consequence:** cascading failures. **Fix:** explicit timeouts on every network call.

### Beginner: blind retries of non-idempotent operations

**Consequence:** duplicates. **Fix:** idempotency keys or status checks.

### Intermediate: retries without backoff, jitter or limits

**Consequence:** retry storms. **Fix:** exponential backoff, jitter, attempt and budget limits.

### Intermediate: retries at every layer

**Fix:** retry at one well-chosen layer.

### Intermediate: ordering by wall-clock timestamps across machines

**Fix:** versions, sequence numbers or logical clocks.

### Production: distributed locks without fencing

**Consequence:** two workers doing exclusive work at once. **Fix:** fencing tokens or database constraints.

### Production: assuming the network is reliable in tests

**Fix:** fault injection and chaos experiments.

## Debugging and troubleshooting

- **Duplicates**: find retries in logs (same request or idempotency key twice); check consumer redeliveries.
- **Lost updates**: concurrent writers with last-write-wins; add version checks (optimistic locking, {{ch:transactions}}).
- **Cascading slowness**: missing timeouts or bulkheads; in-flight request counts rising everywhere.
- **Split brain**: two primaries accepting writes after a partition; check fencing and failover configuration.
- **"It works locally"**: local tests have no latency, loss or partitions; reproduce with fault injection (toxiproxy, chaos tools).

## Security summary

- **The network is not secure**: TLS between services, authenticated service identities (mTLS or signed tokens) ({{ch:tls-ssl}}).
- **Idempotency keys** must be scoped per client so one client cannot replay another's.
- **Retries and fan-out amplify attacks**: rate limits and quotas at the edge ({{ch:rate-limiting}}).
- **Consensus clusters** (etcd, ZooKeeper) hold critical state: restrict access tightly.

## How a senior engineer thinks about this

- **Every call can fail, be slow, or succeed without telling you.**
- **Idempotency makes failure safe.** Design operations so repeating them is harmless.
- **Fail fast, degrade gracefully.** Timeouts, breakers, bulkheads and fallbacks.
- **Order by causality, not clocks.**
- **Use proven coordination.** Consensus-backed stores and database constraints over home-made locks.

## Exercises

### Exercise 1 — What happened?

**Objective:** practise reasoning about timeouts.
**What to do:** your service called "create shipment" and got a timeout. List the possible states of the shipment and what your service should do next.

<details>
<summary>Show the solution</summary>

Possible states: the request never arrived (no shipment); it arrived and is still being processed; it was processed and the response was lost (shipment exists).

Next: if the API supports **idempotency keys**, retry with the **same** key — the shipping service returns the existing shipment or creates it once. Otherwise, **query** for a shipment for this order before retrying. Never create a second shipment blindly.

</details>

### Exercise 2 — Configure quorums

**Objective:** practise quorum trade-offs.
**What to do:** with N = 5 replicas, choose W and R for (a) strongly consistent reads, (b) very fast writes where stale reads are acceptable, (c) surviving two unreachable replicas for both reads and writes while staying consistent.

<details>
<summary>Show the solution</summary>

- (a) Any W + R > 5, for example **W=3, R=3**.
- (b) **W=1, R=1** — fast and available, reads may be stale.
- (c) **W=3, R=3**: with two replicas down, three remain, enough for both quorums, and 3 + 3 > 5 keeps reads overlapping writes.

</details>

### Exercise 3 — Production scenario: the overlapping jobs

**Objective:** practise distributed coordination.
**The scenario:** a nightly billing job runs on two instances for availability. It takes a Redis lock with a 60-second expiry. Last night, a long garbage-collection pause made instance A stop for 90 seconds; B took the lock and started billing; A woke up and continued. Some customers were billed twice. How do you fix it?

<details>
<summary>Show the solution</summary>

The lock expired while A was paused; A did not know and kept working — the classic unsafe distributed lock.

**Fixes:**
- **Make billing idempotent** per customer and period: a unique constraint on (customer, billing period) so a second charge attempt fails safely.
- **Fencing tokens**: each lock acquisition gets an increasing number; the billing table (or payment call) rejects writes with an older token.
- Or use a **database-based lease** (a row with a version checked on every write), or a scheduler that guarantees a single run.
- Process in small batches that each re-check ownership.

</details>

## Summary

Distributed systems fail **partially**: messages are delayed, lost, duplicated or reordered, nodes are unreachable without being dead, and clocks disagree. After a **timeout**, the outcome is unknown — so every network call needs a timeout within a budget, **retries** only for transient errors with **exponential backoff, jitter** and limits at one layer, and operations made **idempotent** with keys, constraints and "set" semantics. **Circuit breakers** fail fast and recover through half-open trials; **bulkheads** isolate resources; fallbacks degrade gracefully.

Replicated data trades consistency for latency and availability: **quorums** with **R + W > N** make reads see the latest write, and under partition a system must refuse operations (consistency) or accept divergence (availability). Choose **consistency models** — linearizable, causal, read-your-writes, eventual — per operation. Order events with versions, sequence numbers and **logical clocks**, not wall clocks across machines. Agreement on leaders, locks and logs comes from **consensus** (Raft, Paxos) in tools like etcd and ZooKeeper; protect against **split brain** and unsafe locks with **fencing tokens**. Review designs against the **fallacies of distributed computing**.

## Key terms

- **Distributed system** — Independent computers coordinating over a network to act as one system.
- **Partial failure** — Some components failing while others continue.
- **Timeout** — Abandoning a wait after a set time, leaving the outcome unknown.
- **Exponential backoff** — Increasing the delay between retries.
- **Jitter** — Randomness added to retry delays.
- **Idempotency key** — A client-supplied identifier that makes repeated requests safe.
- **Circuit breaker** — A mechanism that stops calls to a failing dependency for a time.
- **Half-open state** — A circuit breaker state that allows trial calls.
- **Bulkhead** — Isolating resources per dependency.
- **Quorum** — The minimum number of replicas that must take part in an operation.
- **Linearizability** — The strongest consistency model, behaving like a single copy.
- **Causal consistency** — Preserving cause-and-effect order between operations.
- **Network partition** — A break in communication between parts of a system.
- **Lamport clock** — A logical counter that orders events by causality.
- **Vector clock** — Logical clocks that also detect concurrent events.
- **Consensus** — Agreement among nodes on a value despite failures.
- **Raft / Paxos** — Widely used consensus algorithms.
- **Split brain** — Two nodes simultaneously acting as leader.
- **Fencing token** — An increasing number used to reject stale leaders or lock holders.
- **Fallacies of distributed computing** — Common false assumptions about networks.

## What comes next

Many services and clients need one front door that handles authentication, routing, rate limits and protocol translation. The next chapter, {{ch:api-gateway}}, covers API gateways: what they do, how they differ from load balancers and service meshes, patterns such as the backend for frontend, and AWS API Gateway in practice.
