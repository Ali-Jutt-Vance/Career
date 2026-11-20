# The Technical Interview: Questions and How to Answer Them

> [!GOALS]
> - Answer technical questions with a repeatable structure: **direct answer, how it works, real use, trade-off**.
> - Know what interviewers expect from a mid-level back-end engineer, and the red flags they watch for.
> - Prepare model answers across JavaScript and TypeScript, Node.js, HTTP and APIs, databases, security, infrastructure and system design.
> - Solve coding problems out loud with a reliable method and the common patterns.
> - Prepare behavioural stories and a practice routine with mock interviews.

## Why this matters

Knowing something and explaining it under interview conditions are different skills. Many engineers who use closures, indexes and JWTs every day give vague, rambling or memorised answers when asked about them — and interviewers cannot give credit for understanding they cannot hear. Others recite definitions perfectly but fail the follow-up question, because they have never connected the definition to real work.

This chapter is a practical guide to technical questions: how to structure any answer, what good answers to the most common questions sound like, how to work through coding problems aloud, and how to practise. Each topic points back to the chapter of this book that explains it in depth. It builds on {{ch:how-hiring-works}} and is supported by the communication chapters in Part XV, especially {{ch:talking-about-code}} and {{ch:questions-you-cannot-answer}}.

## The simple idea

A good interview answer is like a good newspaper article: the headline first (the direct answer), then the explanation, then a real example, then the complication. A reader who stops after the headline still learned something; a reader who keeps going learns more. Interviewers interrupt and ask follow-ups — so your structure must work at any length.

> [!ANALOGY]
> A strong technical answer is like a news article: headline first, then the explanation, a real example and the complication — useful wherever the reader stops.
>
> **Where the analogy breaks:** a newspaper does not get questioned. An interviewer will pick one sentence of your answer and ask "why?" two or three times. Prepared structure gets you started; real understanding is what survives the follow-ups.

## The proper definition and key words

A **technical interview** evaluates a candidate's engineering knowledge and problem-solving through questions, coding exercises and design discussions, usually live and spoken.

Key words:

- **Conceptual question** — "What is a closure?", "What is an index?"
- **Follow-up / probing question** — a deeper question building on your answer.
- **Coding exercise** — writing code to solve a problem while observed.
- **Pattern** — a family of problems with a common approach (two pointers, sliding window, hash map counting).
- **Behavioural question** — "Tell me about a time…", answered with stories.
- **Mock interview** — practice with another person in realistic conditions.

## How to answer

### Level 1 — The four-part answer

1. **Direct answer** (about 10 seconds): "A closure is a function that keeps access to the variables of the scope where it was created."
2. **How it works** (30–60 seconds): the mechanism — scope chain, the function object holding a reference to its environment.
3. **Real use** (about 30 seconds): "We used closures to create a logger per request that adds the request ID to every line."
4. **Trade-off or gotcha** (about 20 seconds): "Closures in loops with `var` capture one shared variable; closures can also keep large objects in memory longer than expected."

This shows understanding, experience and judgement — and stops naturally at whatever depth the interviewer wants.

### Level 1 — What interviewers expect and the red flags

At mid-level, interviewers expect you to build features end to end, explain your framework underneath, design a schema, write tests, debug production problems, and reason about trade-offs. Red flags:

- **Buzzwords without depth**: "we use microservices" without knowing when a monolith is better.
- **No specifics**: "I improved performance" instead of "I reduced p95 latency from 800 ms to 120 ms by adding an index".
- **Blaming others**: always describe what **you** did.
- **Not clarifying**: silence followed by a wrong assumption in coding or design rounds.
- **Ignoring edge cases**: empty input, null, concurrency, network failure.
- **Bluffing**: inventing an answer instead of saying where your knowledge ends.

## Model answers

### Level 2 — JavaScript and TypeScript

Two classic puzzles — predict the output first:

```js
// Two classic interview puzzles. Predict the output before reading it.

// 1. Closures in loops: var is function-scoped (one shared i), let creates a new i per iteration
const withVar = [], withLet = [];
for (var i = 0; i < 3; i++) withVar.push(() => i);
for (let j = 0; j < 3; j++) withLet.push(() => j);
console.log("var:", withVar.map((f) => f()).join(","), " let:", withLet.map((f) => f()).join(","));

// 2. Event loop order: synchronous code, then microtasks (promises), then macrotasks (timers)
setTimeout(() => console.log("4. setTimeout callback (macrotask)"), 0);
Promise.resolve().then(() => console.log("3. promise callback (microtask)"));
queueMicrotask(() => console.log("3b. queueMicrotask (microtask, queued after the promise)"));
console.log("1. synchronous");
(async () => {
  console.log("2. async function runs synchronously until its first await");
  await null;
  console.log("3c. code after await (microtask)");
})();
```

**Output:**

```text
var: 3,3,3  let: 0,1,2
1. synchronous
2. async function runs synchronously until its first await
3. promise callback (microtask)
3b. queueMicrotask (microtask, queued after the promise)
3c. code after await (microtask)
4. setTimeout callback (macrotask)
```

- **Closures**: the three `var` functions share one `i`, which is 3 after the loop; `let` creates a new binding per iteration, so each function remembers its own value ({{ch:scope-and-closures}}).
- **Event loop**: all synchronous code runs first (including an async function up to its first `await`); then the **microtask** queue empties completely, in order (promise callbacks, `queueMicrotask`, code after `await`); only then does a **macrotask** such as a timer run ({{ch:the-event-loop}}).

Other common questions:

- **`==` versus `===`**: `===` compares without type conversion; `==` converts types first (`"0" == 0` is true). Use `===`.
- **`this`**: determined by how a function is called; arrow functions take `this` from where they are defined ({{ch:this-prototypes-classes}}).
- **Promises and async/await**: a promise represents a future value; `async/await` is syntax over promises; use `Promise.all` for independent work and handle rejections ({{ch:asynchronous-javascript}}).
- **TypeScript `interface` versus `type`**: both describe shapes; interfaces can be extended and merged, types can express unions and mapped types. **`unknown` versus `any`**: `unknown` must be narrowed before use, `any` disables checking ({{ch:typescript-basics}}, {{ch:typescript-advanced}}).

### Level 2 — Node.js

- **Why is Node.js good for I/O-heavy servers?** One thread runs JavaScript on an event loop; I/O happens asynchronously in the system and the thread pool, so one process handles many concurrent connections. **Gotcha**: CPU-heavy work blocks every request — use worker threads or a separate service ({{ch:nodejs}}).
- **Streams**: process data piece by piece (files, uploads, responses) with back-pressure instead of loading everything into memory.
- **Error handling in Express**: a central error middleware; validation errors as 400s, not 500s; never leak stack traces ({{ch:error-handling}}, {{ch:express}}).
- **Graceful shutdown**: on `SIGTERM`, stop accepting connections, finish in-flight requests, close pools, exit ({{ch:docker}}).

### Level 2 — HTTP and APIs

- **What happens when you type a URL?** DNS lookup → TCP connection → TLS handshake → HTTP request → server processing → response → the browser parses HTML and loads CSS, JavaScript and images ({{ch:how-the-web-works}}, {{ch:dns}}, {{ch:tls-ssl}}).
- **REST design**: resources as nouns, HTTP methods for actions, correct status codes, pagination, idempotency for `PUT` and `DELETE` and idempotency keys for `POST` payments ({{ch:rest-apis}}).
- **PUT versus PATCH**: replace versus partial update.
- **CORS**: the browser blocks reading cross-origin responses unless the server allows the origin; preflight `OPTIONS` requests check non-simple requests. It protects users, not servers.
- **Rate limiting**: token bucket or sliding window, per client, returning 429 with `Retry-After` ({{ch:rate-limiting}}).
- **API versioning**: additive changes are compatible; breaking changes need a new version and a migration period ({{ch:api-versioning}}).

### Level 3 — Databases

- **What is an index?** A data structure (usually a B-tree) that lets the database find rows without scanning the whole table; reads get faster, writes and storage cost more. Composite indexes follow column order; check with `EXPLAIN ANALYZE` ({{ch:indexes}}).
- **ACID**: atomicity (all or nothing), consistency (constraints hold), isolation (concurrent transactions do not interfere improperly), durability (committed data survives crashes) ({{ch:transactions}}).
- **Isolation problems**: lost updates, non-repeatable reads, phantoms, write skew; fixes with row locks, higher isolation levels or optimistic version checks.
- **N+1 queries**: one query per item instead of one batched query; found by counting queries, fixed with joins, eager loading or batching ({{ch:orms}}, {{ch:performance-engineering}}).
- **SQL versus NoSQL**: relational data, joins and transactions versus flexible documents and simple horizontal scaling for known access patterns; most applications start relational ({{ch:mongodb}}).
- **Normalisation**: remove duplication to prevent update anomalies; denormalise deliberately for read performance ({{ch:normalization}}).
- **Scaling a database**: query fixes, pooling, caching, bigger machines, read replicas, partitioning, sharding — in that order ({{ch:database-scaling}}).

### Level 3 — Security and authentication

- **Authentication versus authorisation**: who you are versus what you may do ({{ch:authentication}}).
- **Sessions versus JWT**: server-side sessions are easy to revoke; JWTs avoid a lookup but need short lifetimes, refresh tokens and a revocation strategy ({{ch:sessions}}, {{ch:jwt}}).
- **OAuth 2.0 authorisation code flow with PKCE**: redirect to the provider, user consents, the app receives a code, exchanges it (with the PKCE verifier) for tokens on the back end ({{ch:oauth}}).
- **Password storage**: slow, salted hashes (Argon2id, bcrypt, scrypt) and constant-time comparison.
- **SQL injection and XSS**: parameterised queries; escaping output and Content Security Policy ({{ch:application-security}}).

### Level 3 — Infrastructure and operations

- **Docker**: packages an application and its dependencies into an image; containers share the host kernel; the same image runs everywhere ({{ch:docker}}).
- **CI/CD**: lint, tests, build, scan, deploy to staging, smoke tests, production with health checks and rollback ({{ch:cicd}}).
- **Redis uses**: caching, sessions, rate limiting, queues, leaderboards, pub/sub ({{ch:redis}}).
- **Caching strategy**: cache-aside with TTLs, invalidation on write, stampede protection ({{ch:caching-at-scale}}).
- **Load balancing**: health checks, round robin or least connections, layer 4 versus layer 7 ({{ch:elb}}).
- **Monitoring**: golden signals, percentiles, SLOs, alerting on symptoms ({{ch:monitoring}}).

### Level 4 — System design

Use the method from {{ch:system-design-fundamentals}}: clarify requirements, estimate, define the API, draw the high-level design, deep-dive into one component, discuss bottlenecks and trade-offs. Common mid-level prompts: a URL shortener, a rate limiter, a notification service, a file upload service, a chat system ({{ch:designing-whatsapp}}), a news feed ({{ch:designing-twitter}}). Present it clearly ({{ch:presenting-a-design}}).

## Coding rounds

### Level 2 — The method, out loud

1. Restate the problem and confirm inputs and outputs.
2. Ask about constraints and edge cases.
3. Describe a brute-force approach and its complexity.
4. Improve it, explaining the idea before coding.
5. Write clean code, narrating as you go.
6. Test with a normal case and edge cases, out loud.
7. State the time and space complexity ({{ch:big-o}}).

### Level 3 — Patterns worth practising

| Pattern | Typical problems | Chapter |
|---|---|---|
| Hash map counting and lookup | Two sum, first unique character, anagrams | {{ch:arrays-strings-hash-maps}} |
| Two pointers | Pair sums in sorted arrays, removing duplicates | {{ch:coding-interview-patterns}} |
| Sliding window | Longest substring without repeats, maximum sum subarray of size k | {{ch:coding-interview-patterns}} |
| Stack | Valid parentheses, next greater element | {{ch:linked-lists-stacks-queues}} |
| BFS and DFS | Islands, shortest path in grids, tree traversals | {{ch:trees-heaps-graphs}} |
| Binary search | Search in sorted or rotated arrays, first true value | {{ch:recursion-sorting-searching}} |
| Heap | Top k elements, merge k sorted lists | {{ch:trees-heaps-graphs}} |
| Dynamic programming | Climbing stairs, coin change, longest common subsequence | {{ch:dynamic-programming-greedy}} |

Practise solving problems **without help and out loud**, with a timer — the conditions of the real round.

## Behavioural questions and practice

### Level 3 — Stories

Prepare five to eight **STAR** stories (situation, task, action, result) that can answer many questions: a hard bug, a disagreement, a failure, a project you led, a time you helped a colleague, a tight deadline, a decision you would make differently ({{ch:the-interview-conversation}}). Include specific results, and focus on your own actions.

### Level 4 — A practice routine

- **Explain topics aloud** using the four-part structure, recording yourself; listen for vague parts.
- **Write three-deep chains** for every item on your CV ({{ch:the-cv}}).
- **Solve problems unaided** and out loud, mixing patterns.
- **Do mock interviews** with other engineers — technical, design and behavioural — and ask for honest feedback.
- **Review every real interview** afterwards: questions asked, what went well, what to improve.

## From beginner to enterprise

**Level 1–2 — structured answers.** The four-part answer; avoiding red flags; JavaScript, Node.js and HTTP fundamentals; the out-loud coding method.

**Level 3 — depth.** Databases, security, infrastructure and caching answers that survive follow-ups; common coding patterns; STAR stories.

**Level 4 — complete readiness.** System design method; regular mock interviews; reviewing real interviews; preparing every CV item.

**Level 5 — senior interviews.** Leading design discussions, discussing trade-offs from experience, architecture and leadership stories.

**Level 6 — interviewing others.** Writing fair questions and rubrics, probing depth kindly, and giving useful feedback.

## Real-world use cases

### The answer that survived three follow-ups

- **Story**: asked "what is an index?", a candidate gave the direct answer, explained B-trees briefly, described the order history query they fixed with a composite index, and mentioned the write cost. The interviewer's follow-ups — column order, when an index is not used, covering indexes — all connected to that real example.

### The memorised definition

- **Story**: a candidate defined the CAP theorem perfectly but could not say which choice their own system made during a database failover. The interviewer moved on, unconvinced. Connecting definitions to systems you have used is what makes them believable.

## Common mistakes

### Beginner: rambling without a direct answer

**Fix:** answer first, then explain.

### Beginner: memorised definitions only

**Fix:** a real example and a trade-off for every topic.

### Beginner: silent coding

**Fix:** narrate the whole time.

### Intermediate: bluffing

**Fix:** state your limit and reason from what you know ({{ch:questions-you-cannot-answer}}).

### Intermediate: skipping edge cases and tests

**Fix:** test aloud with edge cases before saying you are done.

### Intermediate: practising alone only

**Fix:** mock interviews with real people.

## Debugging and troubleshooting

- **"You know the theory but lack depth"**: add real examples and trade-offs; build projects that create them ({{ch:projects-that-prove-skill}}).
- **"Took too long to reach a solution"**: practise the brute-force-first method and common patterns with a timer.
- **"Communication was unclear"**: record yourself explaining topics; use the four-part structure ({{ch:explaining-technical-work}}).
- **Freezing on unknown questions**: prepare recovery phrases and practise under pressure ({{ch:interview-under-pressure}}).

## Security summary

- **Do not share confidential details** of your employer's systems or clients when giving examples; describe them generally.
- **Take-home tasks**: never include your employer's code.
- **Be wary** of "interviews" that ask you to fix a company's real production problems for free.

## How a senior engineer thinks about this

- **Structure makes knowledge visible.** Direct answer, mechanism, use, trade-off.
- **Experience makes it believable.** Real examples from real systems.
- **Honesty earns trust.** Knowing your limits is part of seniority.
- **Practice in realistic conditions.** Out loud, timed, with people.

## Exercises

### Exercise 1 — Four-part answers

**Objective:** practise structure.
**What to do:** answer "What is a database transaction?" in the four-part format.

<details>
<summary>Show the solution</summary>

1. **Direct**: "A transaction groups several database operations so they all succeed or all fail together."
2. **How**: "PostgreSQL records changes in its write-ahead log and makes them visible at commit; on error or rollback none of the changes apply. Isolation levels decide what concurrent transactions see."
3. **Use**: "When placing an order, we insert the order, its lines and the stock reservation in one transaction, so we never have an order without reserved stock."
4. **Trade-off**: "Long transactions hold locks and block others, so we keep them short and never call external APIs inside one."

</details>

### Exercise 2 — Predict the output

**Objective:** practise event loop reasoning.
**What to do:** predict the order: `console.log("A"); setTimeout(() => console.log("B")); Promise.resolve().then(() => console.log("C")); console.log("D");`

<details>
<summary>Show the solution</summary>

**A, D, C, B.** Synchronous logs first (A, D); then the microtask queue runs the promise callback (C); then the timer's macrotask (B). The `setTimeout` delay of zero does not make it run before microtasks.

</details>

### Exercise 3 — Solve aloud

**Objective:** practise the coding method.
**What to do:** solve "return the first character in a string that appears only once" and write down what you would say at each step.

<details>
<summary>Show the solution</summary>

1. *Restate*: "Given a string, return the first character with exactly one occurrence, or null if none."
2. *Clarify*: "Can it be empty? Is it case-sensitive? Any character set?"
3. *Brute force*: "For each character, count it across the string — O(n²)."
4. *Better*: "One pass to count with a Map, a second pass to find the first count of one — O(n) time, O(k) space."
5. *Code*:

```ts
// fragment
function firstUnique(s: string): string | null {
  const counts = new Map<string, number>();
  for (const ch of s) counts.set(ch, (counts.get(ch) ?? 0) + 1);
  for (const ch of s) if (counts.get(ch) === 1) return ch;
  return null;
}
```

6. *Test*: "'leetcode' → 'l'; 'aabb' → null; '' → null."
7. *Complexity*: "Linear time, space proportional to the number of distinct characters."

</details>

## Summary

Technical interviews reward **visible, structured understanding**. Answer with a **direct answer**, **how it works**, a **real use** and a **trade-off or gotcha**, and avoid the red flags: buzzwords, vague claims, blame, unasked questions, ignored edge cases and bluffing. Prepare model answers across JavaScript and TypeScript (closures, `this`, the event loop, async code, types), Node.js (event loop, streams, errors, graceful shutdown), HTTP and APIs (the request journey, REST, CORS, rate limiting, versioning), databases (indexes, ACID, isolation, N+1, scaling), security (authentication, sessions and tokens, OAuth, passwords, injection), infrastructure (Docker, CI/CD, Redis, caching, load balancing, monitoring) and system design.

Solve coding problems with an out-loud method — restate, clarify, brute force, improve, code, test, complexity — and practise the common patterns unaided and timed. Prepare STAR stories, three-deep chains for your CV, and regular mock interviews, and review every real interview to improve.

## Key terms

- **Technical interview** — An assessment of engineering knowledge through questions, coding and design.
- **Four-part answer** — Direct answer, mechanism, real use and trade-off.
- **Follow-up question** — A deeper question building on a previous answer.
- **Coding pattern** — A reusable approach to a family of problems.
- **Microtask** — A queued callback, such as a promise reaction, run before the next macrotask.
- **Macrotask** — A queued task such as a timer callback.
- **Brute-force solution** — A simple, often inefficient, correct solution.
- **Time and space complexity** — How running time and memory grow with input size.
- **STAR story** — A behavioural answer structured as situation, task, action and result.
- **Mock interview** — A realistic practice interview with another person.

## What comes next

Passing the interviews leads to an offer — and a negotiation. The next chapter, {{ch:negotiating-offers}}, covers evaluating offers, total compensation, negotiating calmly and effectively, competing offers, and accepting or declining professionally.
