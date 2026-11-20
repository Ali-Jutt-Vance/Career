# Application Security

> [!GOALS]
> - Think about security the way senior engineers do: as **risk** to manage, designed in from the start.
> - Run a lightweight **threat model** with STRIDE and trust boundaries.
> - Know the **OWASP Top 10** classes of web vulnerability, how they happen and how to prevent them.
> - Write secure code for injection, access control, secrets, passwords, file handling and outbound requests.
> - Secure the **supply chain**: dependencies, builds and containers.
> - Build a security practice in a team: reviews, automated scanning, incident handling and responsible disclosure.

## Why this matters

Security failures are among the most expensive mistakes a software company can make. A single SQL injection, a missing authorisation check or a leaked key can expose millions of customers' data, bring regulators and lawsuits, and destroy trust built over years. Attackers do not need to be clever: automated tools scan the whole internet for known weaknesses every day.

Earlier chapters added security piece by piece — validation ({{ch:validation}}), authentication ({{ch:authentication}}), sessions and tokens ({{ch:sessions}}, {{ch:jwt}}), rate limiting ({{ch:rate-limiting}}), TLS ({{ch:tls-ssl}}), IAM and secrets on AWS ({{ch:iam}}, {{ch:secrets-manager}}). This chapter brings them together at senior level: how to find the risks in a design before building it, the vulnerability classes that cause most breaches, and how a team makes security a habit rather than an audit at the end.

## The simple idea

Securing an application is like securing a house. You think about who might want to get in and what they want (threats), every door and window (entry points), what must be protected most (the safe), and you put locks where they matter. You do not rely on one lock — doors, an alarm, a safe inside — so one failure is not a disaster. And you check that the builders did not leave a ladder against the back wall.

> [!ANALOGY]
> Application security is like securing a house: know who might break in and why, protect every entrance, keep the valuables in a safe, and never rely on one lock.
>
> **Where the analogy breaks:** a burglar must come to your house, one at a time. Attackers on the internet can try every house in the world at once, automatically, all day — and a single unlocked window, found by a script, is enough. There is no "nobody would bother with us".

## The proper definition and key words

**Application security** is the practice of designing, building and operating software so that it preserves **confidentiality**, **integrity** and **availability** (the CIA triad) against threats, by preventing, detecting and responding to vulnerabilities.

Key words:

- **Threat** — something that can go wrong (an attacker stealing data); **vulnerability** — a weakness that allows it; **risk** — likelihood × impact.
- **Attack surface** — all the ways into a system: endpoints, inputs, dependencies, people.
- **Trust boundary** — a line where data moves between more and less trusted parts (internet → API, service → database).
- **Threat modelling** — systematically finding threats in a design; **STRIDE** is a common checklist.
- **OWASP Top 10** — a widely used list of the most critical web application security risks.
- **Defence in depth** — several independent layers of protection.
- **Least privilege** — every user, service and component has only the access it needs.
- **SAST / DAST / SCA** — static code analysis / dynamic testing of a running app / software composition analysis of dependencies.
- **CVE** — a public identifier for a known vulnerability.
- **Supply chain** — everything your software is built from: dependencies, tools, base images, pipelines.

## Thinking about risk

### Level 1 — Principles

- **Security is a design requirement**, like performance — cheaper to design in than to bolt on ({{ch:system-design-fundamentals}}).
- **Never trust input**: everything from clients, partners, files, headers, webhooks and even other services is validated at the boundary.
- **Least privilege**: database users, IAM roles, API tokens and people get only what they need.
- **Defence in depth**: validation **and** parameterised queries **and** least-privilege database users **and** monitoring.
- **Secure defaults**: closed by default, opened deliberately — private buckets, deny-by-default authorisation, secure cookie flags.
- **Fail securely**: errors deny access and reveal nothing useful (no stack traces to users) ({{ch:error-handling}}).
- **Keep it simple**: complexity hides vulnerabilities.

### Level 2 — Threat modelling with STRIDE

For a new feature or service, spend 30–60 minutes as a team: draw the data flow (actors, processes, stores, trust boundaries), then ask the **STRIDE** questions at each boundary:

| Threat | Question | Typical defences |
|---|---|---|
| **S**poofing | Can someone pretend to be another user or service? | Strong authentication, MFA, signed tokens, mTLS |
| **T**ampering | Can someone change data in transit or at rest? | TLS, integrity checks, signatures, authorisation on writes |
| **R**epudiation | Can someone deny doing something? | Audit logs that cannot be altered |
| **I**nformation disclosure | Can data leak? | Encryption, access control, minimal responses, no secrets in logs |
| **D**enial of service | Can someone exhaust resources? | Rate limits, quotas, timeouts, size limits |
| **E**levation of privilege | Can someone gain rights they should not have? | Authorisation checks everywhere, least privilege, sandboxing |

Record the threats, decide what to do (fix, mitigate, accept with a reason), and turn decisions into tickets and tests. Repeat when the design changes.

## The vulnerability classes

### Level 2 — The OWASP Top 10 in practice

The categories in the current OWASP Top 10 (2021 edition, with updates in progress) cover most real breaches:

1. **Broken access control** — users reaching data or actions they should not: changing `/orders/1001` to `/orders/1002` and seeing another customer's order (an **IDOR**), or calling admin endpoints without being admin. The most common serious flaw.
2. **Cryptographic failures** — sensitive data unencrypted, weak algorithms, home-made crypto, keys in code.
3. **Injection** — SQL, NoSQL, OS command and template injection when untrusted input becomes code.
4. **Insecure design** — missing controls in the design itself (no rate limit on password reset, no fraud checks).
5. **Security misconfiguration** — default passwords, open buckets, verbose errors, unnecessary features enabled.
6. **Vulnerable and outdated components** — dependencies with known CVEs.
7. **Identification and authentication failures** — weak passwords allowed, no MFA, session fixation, credential stuffing.
8. **Software and data integrity failures** — unsigned updates, untrusted CI plugins, insecure deserialisation.
9. **Security logging and monitoring failures** — attacks not noticed.
10. **Server-side request forgery (SSRF)** — the server tricked into fetching internal URLs.

### Level 3 — Seeing the bugs and the fixes

This example demonstrates four classic weaknesses and their fixes, using a real in-memory PostgreSQL database for the injection:

```ts
import { PGlite } from "@electric-sql/pglite";
import { resolve, sep } from "node:path";
import { scryptSync, randomBytes, timingSafeEqual } from "node:crypto";

// 1. SQL injection: string-built SQL versus a parameterised query, on a real (in-memory) PostgreSQL
const db = new PGlite();
await db.exec(`create table orders (id int, customer text, total_pence int);
  insert into orders values (1, 'sara', 1250), (2, 'ali', 899), (3, 'mina', 4300);`);
const attack = "sara' or '1'='1";
const unsafe = await db.query(`select id, customer from orders where customer = '${attack}'`);
const safe = await db.query("select id, customer from orders where customer = $1", [attack]);
console.log(`string-built SQL returned ${unsafe.rows.length} rows (everyone's orders); parameterised returned ${safe.rows.length}`);

// 2. Path traversal: a download endpoint must stay inside its directory
const base = resolve("/srv/invoices");
function safePath(userInput: string): string | null {
  const full = resolve(base, userInput);
  return full.startsWith(base + sep) ? full : null;
}
for (const input of ["2026-11/1001.pdf", "../../etc/passwd", "2026-11/../../secrets.env"]) {
  console.log(`${input.padEnd(26)} -> ${safePath(input) ? "allowed" : "REJECTED (outside the invoices folder)"}`);
}

// 3. SSRF: only fetch user-supplied URLs from an allow-list of hosts, over HTTPS
const allowedHosts = new Set(["images.cornershop-cdn.example"]);
function checkUrl(raw: string): string {
  let u: URL;
  try { u = new URL(raw); } catch { return "REJECTED (not a URL)"; }
  if (u.protocol !== "https:") return `REJECTED (${u.protocol} not allowed)`;
  if (!allowedHosts.has(u.hostname)) return `REJECTED (host ${u.hostname} not allowed)`;
  return "allowed";
}
for (const url of ["https://images.cornershop-cdn.example/p/42.jpg", "http://169.254.169.254/latest/meta-data/", "https://images.cornershop-cdn.example.evil.example/x", "file:///etc/passwd"]) {
  console.log(`${url.padEnd(56)} -> ${checkUrl(url)}`);
}

// 4. Passwords: a slow, salted hash, compared in constant time
function hashPassword(password: string, salt = randomBytes(16)) {
  return { salt, hash: scryptSync(password, salt, 32, { N: 2 ** 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }) };
}
const stored = hashPassword("correct horse battery staple");
const check = (attempt: string) => timingSafeEqual(hashPassword(attempt, stored.salt).hash, stored.hash);
console.log(`hash length ${stored.hash.length} bytes; right password: ${check("correct horse battery staple")}, wrong: ${check("123456")}`);
const again = hashPassword("correct horse battery staple");
console.log(`same password, new salt -> different hash: ${!again.hash.equals(stored.hash)}`);
```

**Output:**

```text
string-built SQL returned 3 rows (everyone's orders); parameterised returned 0
2026-11/1001.pdf           -> allowed
../../etc/passwd           -> REJECTED (outside the invoices folder)
2026-11/../../secrets.env  -> REJECTED (outside the invoices folder)
https://images.cornershop-cdn.example/p/42.jpg           -> allowed
http://169.254.169.254/latest/meta-data/                 -> REJECTED (http: not allowed)
https://images.cornershop-cdn.example.evil.example/x     -> REJECTED (host images.cornershop-cdn.example.evil.example not allowed)
file:///etc/passwd                                       -> REJECTED (file: not allowed)
hash length 32 bytes; right password: true, wrong: false
same password, new salt -> different hash: true
```

- **SQL injection**: the input `sara' or '1'='1` turned the string-built query into "every row", leaking all customers' orders. The **parameterised** query treated the same input as a plain value and found nothing. Use parameters (or a query builder or ORM that uses them) for every query — never string concatenation ({{ch:sql}}, {{ch:orms}}).
- **Path traversal**: `../` sequences can escape a folder. Resolve the full path and check that it stays inside the allowed directory — or better, never use user input as a path: store files under generated IDs ({{ch:file-uploads}}).
- **SSRF**: fetching any URL a user supplies lets attackers reach internal services and cloud metadata endpoints ({{ch:ec2}}). Allow only expected schemes and **exact** hosts — note how a look-alike host (`…cdn.example.evil.example`) was rejected because the comparison is exact, not "starts with". Also block private address ranges after DNS resolution and fetch through a restricted proxy.
- **Passwords**: store a **slow, salted hash** (scrypt here; Argon2id or bcrypt are also standard), compare with **constant-time** comparison, and never store or log the password. Each user gets a random salt, so equal passwords have different hashes ({{ch:authentication}}).

### Level 3 — Access control done right

- **Authorise every request on the server**, for every object: "is this user allowed to read **this** order?" — not just "is the user logged in?". Hiding a button in the UI is not access control.
- **Centralise the checks** (middleware, policies, guards in frameworks — {{ch:nestjs-advanced}}) so they are hard to forget, and **deny by default**.
- **Use unguessable IDs** (UUIDs) as a second layer, never as the only one.
- **Multi-tenant systems**: every query includes the tenant; row-level security in the database can be a safety net ({{ch:database-scaling}}).
- **Test it**: automated tests that user A cannot read user B's data, for every endpoint ({{ch:testing}}).

### Level 3 — Browser-side protections

- **XSS** (cross-site scripting): never insert untrusted data into HTML without escaping; frameworks like React escape by default — avoid `dangerouslySetInnerHTML`; add a **Content Security Policy** ({{ch:react-advanced}}).
- **CSRF**: with cookie sessions, use `SameSite` cookies and CSRF tokens for state-changing requests ({{ch:sessions}}).
- **Security headers**: HSTS, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `frame-ancestors` in CSP to prevent clickjacking ({{ch:nginx-reverse-proxy}}).
- **CORS**: allow only your own origins; never reflect arbitrary origins with credentials.

## Securing the supply chain and operations

### Level 4 — Dependencies, builds and containers

Most code in a modern application comes from dependencies. Protect the supply chain:

- **Lock files** and `npm ci` for reproducible installs; review new dependencies (maintenance, popularity, permissions they need).
- **Scan dependencies** (npm audit, Dependabot, Snyk, OSV) and update regularly — automated pull requests make it routine.
- **Beware typosquatting** and compromised packages: pin versions, consider install-script restrictions, use a private registry proxy.
- **Secure CI/CD**: least-privilege pipeline credentials, OIDC instead of stored keys, pinned third-party actions ({{ch:github-actions}}).
- **Containers**: minimal base images, non-root users, image scanning, signed images ({{ch:docker}}).
- **SBOMs** (software bills of materials) list what is inside each build, so you can answer "are we affected?" when a new CVE appears.

### Level 4 — Detection, response and disclosure

- **Log security events**: logins (success and failure), permission denials, password and MFA changes, admin actions — without secrets or unnecessary personal data ({{ch:logging}}).
- **Alert** on suspicious patterns: login failure spikes, access denied spikes, unusual data exports ({{ch:monitoring}}).
- **Incident response**: a plan for containing, investigating, fixing and communicating; practise it ({{ch:observability-and-incidents}}).
- **Responsible disclosure**: a security contact (`security.txt`), a process to receive reports from researchers, and perhaps a bug bounty.
- **Regular testing**: SAST in CI, DAST against staging, penetration tests for important releases.

### Level 4 — Data protection and privacy

- **Collect less**: data you do not store cannot leak.
- **Encrypt** sensitive data at rest (database, backups, files) and in transit; manage keys with KMS ({{ch:secrets-manager}}).
- **Classify data** (public, internal, confidential, personal, payment) and handle each class accordingly.
- **Privacy laws** (GDPR and similar) require lawful processing, deletion on request, breach notification and data protection by design — security and privacy go together.
- **Payment card data**: avoid touching it at all by using hosted payment pages or tokenisation, so PCI DSS scope stays small.

## From beginner to enterprise

**Level 1–2 — secure coding basics.** Input validation; parameterised queries; output escaping; password hashing; HTTPS; secrets out of code; dependency updates.

**Level 3 — secure features.** Threat modelling with STRIDE; object-level authorisation everywhere; CSRF, XSS and SSRF defences; security headers; tests for access control.

**Level 4 — secure operations.** Supply-chain security; SAST, DAST and SCA in pipelines; security logging and alerting; incident response; data classification and encryption.

**Level 5 — senior practice.** Leading threat models; reviewing designs and code for security; making secure patterns the default in shared libraries; balancing risk with delivery.

**Level 6 — enterprises.** Security programmes (secure SDLC), compliance frameworks (SOC 2, ISO 27001, PCI DSS), red teams, bug bounties and security champions in every team.

## Real-world use cases

### The order IDOR

- **What happened**: the mobile API returned any order by ID to any logged-in user. A researcher iterated IDs and downloaded thousands of customers' addresses, then reported it.
- **Fix**: an ownership check in a central policy for every order endpoint, tests for cross-user access, UUIDs as IDs, and alerting on unusual sequential access patterns. The company thanked the researcher and launched a disclosure programme.

### The compromised package

- **What happened**: a popular package's maintainer account was taken over and a malicious version published, stealing environment variables during installation.
- **Response**: teams with lock files and delayed updates were unaffected; others rotated every secret available in their CI environment. Afterwards: pinned versions, install-script restrictions in CI and a private registry proxy.

## Common mistakes

### Beginner: string-built SQL

**Fix:** parameterised queries everywhere.

### Beginner: authorisation only in the UI

**Fix:** server-side checks for every request and object.

### Beginner: storing passwords with fast hashes (or plain text)

**Fix:** Argon2id, bcrypt or scrypt with per-user salts.

### Intermediate: trusting internal services and headers

**Fix:** validate and authenticate across every trust boundary.

### Intermediate: verbose errors in production

**Consequence:** stack traces and queries revealed to attackers. **Fix:** generic messages to users, details in logs.

### Production: unpatched dependencies

**Fix:** automated updates and scanning.

### Production: no security logging

**Consequence:** breaches discovered months later, or never. **Fix:** log and alert on security events.

## Debugging and troubleshooting

- **A scanner reports a vulnerability**: confirm whether the vulnerable code path is reachable, assess impact, fix or mitigate, and record the decision.
- **Suspicious activity**: preserve logs, contain (rotate credentials, block sources), investigate scope, then fix the root cause.
- **CSP breaks the page**: use report-only mode first and adjust the policy from reports.
- **Access-control bugs**: write a failing test for the cross-user case before fixing.

## Security summary

- **Design**: threat model new features; least privilege; secure defaults; defence in depth.
- **Code**: validate input; parameterise queries; escape output; authorise every object; hash passwords; validate outbound URLs and file paths.
- **Supply chain**: lock, scan, update and review dependencies; secure pipelines and images.
- **Operations**: secrets managed and rotated; encryption; security logging, alerting and incident response.
- **People**: training, security champions, responsible disclosure.

## How a senior engineer thinks about this

- **Assume attackers are automated and patient.** Every weakness will be found.
- **Make the secure way the easy way.** Shared libraries, templates and defaults beat checklists.
- **Think in trust boundaries.** Where does data cross from less trusted to more trusted?
- **Risk, not fear.** Prioritise by likelihood and impact; accept some risks explicitly.
- **Security is everyone's job**, with specialists as partners, not gatekeepers.

## Exercises

### Exercise 1 — Threat model a feature

**Objective:** practise STRIDE.
**What to do:** a new feature lets customers upload a profile picture from their device or from a URL. List at least one threat per STRIDE category and a defence.

<details>
<summary>Show the solution</summary>

- **Spoofing**: uploading as another user → require authentication; derive the user from the session, not the request body.
- **Tampering**: replacing another user's picture → server-generated keys per user; authorisation on writes.
- **Repudiation**: denying an abusive upload → log uploads with user, time and source IP.
- **Information disclosure**: EXIF location data in photos → strip metadata; serve from a separate domain.
- **Denial of service**: huge files or many uploads → size limits, rate limits, asynchronous processing.
- **Elevation of privilege**: malicious files (SVG with scripts, image parser exploits) → allow only safe formats, re-encode images, scan files.
- **SSRF** for the URL option → allow-listed schemes, block private addresses, fetch through a restricted proxy with timeouts and size limits.

</details>

### Exercise 2 — Find the vulnerabilities

**Objective:** practise code review for security.
**The endpoint:** `GET /api/invoices/:id` reads `select * from invoices where id = ${req.params.id}`, returns the row as JSON including `card_number`, and on error returns `err.stack` to the client.

<details>
<summary>Show the solution</summary>

1. **SQL injection** — use a parameterised query.
2. **Broken access control** — no check that the invoice belongs to the user (IDOR); add an ownership check (`where id = $1 and customer_id = $2`).
3. **Data exposure** — card numbers should not be stored at all (use a payment provider's tokens); never return them.
4. **`select *`** returns all columns, including future sensitive ones — select only needed fields.
5. **Stack traces to clients** — generic error messages for users; details only in logs.

</details>

### Exercise 3 — Production scenario: the new CVE

**Objective:** practise vulnerability response.
**The scenario:** a critical remote-code-execution CVE is announced in a widely used library. Your organisation has 60 services. What do you do in the first hours?

<details>
<summary>Show the solution</summary>

1. **Find exposure**: search SBOMs and dependency graphs (or lock files) for the library and affected versions across all services and images.
2. **Prioritise**: internet-facing services and those handling sensitive data first; check whether the vulnerable feature is used.
3. **Mitigate quickly**: upgrade or patch; if not yet possible, apply workarounds (configuration changes, WAF rules blocking the exploit pattern).
4. **Deploy** through the normal pipeline with expedited reviews; rebuild container images.
5. **Detect**: search logs for exploitation attempts since the CVE's publication; watch alerts.
6. **Communicate** status to leadership and, if needed, customers.
7. **Afterwards**: improve inventory (SBOMs for everything) and update automation so the next response is faster.

</details>

## Summary

Application security protects **confidentiality, integrity and availability** by managing **risk**: likelihood times impact. Build it in with principles — never trust input, least privilege, defence in depth, secure defaults, failing securely and simplicity — and find risks early with lightweight **threat modelling**: draw data flows and trust boundaries and ask the **STRIDE** questions.

The **OWASP Top 10** covers most breaches; broken access control is the most common serious flaw. Prevent **injection** with parameterised queries, **path traversal** by never trusting paths, **SSRF** with exact allow-lists and network restrictions, password theft with slow salted hashes and constant-time comparison, and **IDOR** with server-side, object-level authorisation, denied by default and tested. Protect browsers with output escaping, CSP, `SameSite` cookies, CSRF tokens, security headers and strict CORS.

Secure the **supply chain** — lock files, scanning, updates, pinned CI steps, minimal signed images and SBOMs — and operations: security logging, alerting, incident response, responsible disclosure, encryption, data classification and privacy by design. Senior engineers make secure patterns the default and treat security as a shared responsibility.

## Key terms

- **Application security** — Protecting software against threats throughout its life.
- **CIA triad** — Confidentiality, integrity and availability.
- **Threat / vulnerability / risk** — What can go wrong / the weakness allowing it / likelihood times impact.
- **Attack surface** — All the ways an attacker can interact with a system.
- **Trust boundary** — Where data crosses between differently trusted parts of a system.
- **Threat modelling** — Systematically identifying threats in a design.
- **STRIDE** — Spoofing, tampering, repudiation, information disclosure, denial of service, elevation of privilege.
- **OWASP Top 10** — A list of the most critical web application security risks.
- **IDOR** — Insecure direct object reference: accessing objects by changing an identifier.
- **SQL injection** — Untrusted input altering an SQL query.
- **Path traversal** — Using `../` sequences to access files outside an allowed directory.
- **SSRF** — Server-side request forgery.
- **XSS** — Cross-site scripting: injecting scripts into pages viewed by others.
- **CSRF** — Cross-site request forgery: tricking a browser into sending authenticated requests.
- **Content Security Policy** — A header restricting which resources a page may load and run.
- **Salt** — Random data added to a password before hashing.
- **Defence in depth** — Several independent layers of security.
- **Least privilege** — Granting only the access needed.
- **SAST / DAST / SCA** — Static analysis, dynamic testing, dependency analysis.
- **CVE** — A public identifier for a known vulnerability.
- **SBOM** — A list of the components inside a software build.
- **Responsible disclosure** — A process for researchers to report vulnerabilities privately.

## What comes next

Secure systems must also be fast. The next chapter, {{ch:performance-engineering}}, covers performance engineering: measuring before optimising, profiling Node.js, load testing, latency budgets, and the common sources of slowness in databases, networks and code.
