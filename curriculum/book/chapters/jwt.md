# JSON Web Tokens (JWT)

> [!GOALS]
> - Explain what a JSON Web Token is, the problem it solves, and how it differs from a server-side session.
> - Read a JWT: header, payload (claims) and signature, and the standard claims such as `sub`, `exp` and `aud`.
> - Understand how signing works with **HMAC** (shared secret) and **asymmetric** keys (RSA, ECDSA, EdDSA), and how public keys are distributed with **JWKS**.
> - Verify tokens correctly — algorithm, signature, expiry, issuer, audience — and avoid the classic JWT vulnerabilities.
> - Design **access and refresh tokens**, with rotation and revocation strategies.
> - Use a well-tested library (such as `jose`) in Node.js, and decide when JWTs are the right tool — and when sessions are better.

## Why this matters

In {{ch:sessions}} the server remembered logged-in users by storing session records and looking them up on every request. That works beautifully for one application with one shared session store. But consider these situations:

- A system of ten services — orders, payments, shipping, reviews — must each know who the user is. Should every service call the login service, or query a shared session database, on every request?
- A mobile app and partner integrations call your API; they are not browsers, and cookies are awkward for them.
- A third party — a delivery partner — needs limited access to your API on behalf of a shop owner, without ever seeing the owner's password ({{ch:oauth}}).

**JSON Web Tokens** address these by putting the information **inside the token**, protected by a cryptographic signature. Any service that knows how to check the signature can trust the token's contents without contacting anyone else. JWTs are everywhere: in OAuth and OpenID Connect (the "Log in with Google" standard), in cloud platforms, in API gateways, and in countless APIs.

They are also widely misused. Developers store long-lived JWTs in `localStorage`, skip verification steps, accept tokens signed with no algorithm at all, put secrets in the readable payload, or discover — after an employee is fired — that their tokens cannot be revoked. This chapter teaches JWTs from the inside, so you can use them where they help and avoid them where they hurt.

## The simple idea

Think of a concert wristband. At the entrance, staff check your ticket and identity, then put a wristband on you that says "Adult — Area B — valid today". Inside, security guards at each area do not phone the entrance to check you; they look at the wristband. The wristband is hard to forge: it has a special printed hologram that only the organisers can produce.

A JWT is that wristband. The login server checks your identity once and issues a token stating facts about you — "user 41, role customer, valid until 10:15" — sealed with a **signature** that only it can create. Other services just check the seal and read the facts.

> [!ANALOGY]
> A JWT is like a concert wristband: issued once at the entrance after checking your ticket, it states facts about you, and any guard can verify its hologram without calling the entrance.
>
> **Where the analogy breaks:** a wristband can be cut off when you are thrown out. A JWT cannot be "cut off" — once issued, it stays valid until it expires, wherever a copy exists, unless every service checks an extra revocation list. And unlike a wristband, anyone who **copies** the token's text can wear it; there is no physical body attached. These two facts shape almost every JWT design decision.

## The proper definition and key words

A **JSON Web Token** (JWT, often pronounced "jot") is a compact, URL-safe string that carries a set of **claims** (statements, as JSON) together with a digital **signature** (or message authentication code) that protects them from tampering. JWT is defined by the IETF standard RFC 7519, as part of a family of standards called JOSE (JSON Object Signing and Encryption).

The key words:

- **Claim** — a statement in the token, such as `"sub": "usr_41"` (the subject is user 41) or `"exp": 1781000900` (expires at that time).
- **Header** — JSON describing the token, most importantly the signing algorithm (`alg`) and the key id (`kid`).
- **Payload** — the JSON object of claims.
- **Signature** — the cryptographic proof, computed over the header and payload, that the token was issued by a holder of the signing key and has not been modified.
- **JWS** (JSON Web Signature) — the signed form; almost all JWTs you meet are JWS. **JWE** (JSON Web Encryption) is the encrypted form, whose payload is unreadable without a key.
- **HMAC** — a signature based on a **shared secret**; the same key signs and verifies (algorithm `HS256`).
- **Asymmetric signature** — a private key signs; a public key verifies (algorithms such as `RS256`, `ES256`, `EdDSA`).
- **JWKS** (JSON Web Key Set) — a published JSON document listing an issuer's **public** keys, so verifiers can fetch them.
- **Access token** — a short-lived token presented to APIs. **Refresh token** — a longer-lived credential used only to obtain new access tokens.
- **Bearer token** — a token that grants access to whoever presents ("bears") it, sent as `Authorization: Bearer <token>`.

## How it works inside

### Level 2 — Three parts

A JWT looks like this (line breaks added for reading):

```text
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9
.eyJzdWIiOiJ1c3JfNDEiLCJyb2xlIjoiY3VzdG9tZXIiLCJpYXQiOjE3ODEwMDAwMDAsImV4cCI6MTc4MTAwMDkwMH0
.7_nAXfIDuDVFtqioY7WQSCAdW1pqMxTjKmJCIyYU8rA
```

Three parts separated by dots:

```text
  base64url(header) . base64url(payload) . base64url(signature)

  header:    {"alg":"HS256","typ":"JWT"}
  payload:   {"sub":"usr_41","role":"customer","iat":1781000000,"exp":1781000900}
  signature: HMAC-SHA256( secret, "<header part>.<payload part>" )
```

- The header and payload are **JSON encoded with base64url** — a URL-safe text encoding, **not encryption**. Anyone who has the token can decode and read them. Never put secrets, passwords or sensitive personal data in a JWT payload.
- The **signature** is computed over the first two parts. Changing a single character of the header or payload makes the signature invalid.

### Level 3 — Building and verifying a JWT by hand

To see exactly what libraries do, here is HS256 signing and verification with nothing but Node's `crypto` module. (In real code, use a library — below.)

```ts
import { createHmac, timingSafeEqual } from "node:crypto";

const SECRET = "a-32-byte-or-longer-secret-for-hs256!";
const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
const decode = (part: string) => JSON.parse(Buffer.from(part, "base64url").toString("utf8"));

function signHs256(payload: object): string {
  const header = encode({ alg: "HS256", typ: "JWT" });
  const body = encode(payload);
  const signature = createHmac("sha256", SECRET).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${signature}`;
}

type Claims = { sub: string; role: string; iat: number; exp: number };

function verifyHs256(token: string, nowSeconds: number): Claims {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("malformed token");
  const [header, body, signature] = parts as [string, string, string];

  if (decode(header).alg !== "HS256") throw new Error("unexpected algorithm");   // never trust the token's choice blindly

  const expected = Buffer.from(createHmac("sha256", SECRET).update(`${header}.${body}`).digest("base64url"));
  const actual = Buffer.from(signature);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new Error("bad signature");

  const claims = decode(body) as Claims;
  if (typeof claims.exp !== "number" || claims.exp <= nowSeconds) throw new Error("token expired");
  return claims;
}

const token = signHs256({ sub: "usr_41", role: "customer", iat: 1781000000, exp: 1781000900 });
console.log(token.split(".").map((part) => part.length));
console.log(verifyHs256(token, 1781000100));

// An attacker edits the payload to become an admin
const [h, , s] = token.split(".");
const forged = `${h}.${encode({ sub: "usr_41", role: "admin", iat: 1781000000, exp: 1781000900 })}.${s}`;
for (const [label, candidate, now] of [["forged role", forged, 1781000100], ["expired", token, 1781001000]] as const) {
  try {
    verifyHs256(candidate, now);
  } catch (error) {
    console.log(`${label}: rejected (${(error as Error).message})`);
  }
}
```

**Output:**

```text
[ 36, 91, 43 ]
{ sub: 'usr_41', role: 'customer', iat: 1781000000, exp: 1781000900 }
forged role: rejected (bad signature)
expired: rejected (token expired)
```

Walk through it:

- **Signing** encodes the header and payload, joins them with a dot, and computes an HMAC-SHA256 with the secret ({{ch:authentication}}). The signature is base64url-encoded too. The three part lengths show the shape: a short header, a longer payload, a 43-character signature (32 bytes).
- **Verification** reverses the steps — and its **order matters**:
  1. Check the structure.
  2. Check the **algorithm** is the one **you** expect. Never let the token decide (see the vulnerabilities below).
  3. Recompute the signature and compare in **constant time**.
  4. Only then read and check the claims — here, expiry.
- The attacker could **read** the payload and change `role` to `admin`, but cannot produce a matching signature without the secret, so the forgery fails.
- An expired token fails even though its signature is valid.
- `exp` and `iat` are **NumericDate** values: seconds (not milliseconds) since 1 January 1970, UTC. Mixing seconds and milliseconds is a classic JWT bug.

### Level 3 — Registered claims

The standard defines a set of claim names (all optional, but widely used):

| Claim | Name | Meaning |
|---|---|---|
| `iss` | Issuer | Who issued the token, e.g. `https://auth.cornershop.example` |
| `sub` | Subject | Whom the token is about — usually a user id |
| `aud` | Audience | Who the token is **for** — which API may accept it, e.g. `orders-api` |
| `exp` | Expiration | After this time the token must be rejected |
| `nbf` | Not before | Before this time the token must be rejected |
| `iat` | Issued at | When it was issued |
| `jti` | JWT id | A unique id for this token (used for revocation lists or replay detection) |

You may add your own claims (`role`, `tenantId`, `scope`), but keep them few: every claim travels with **every request**, and claims are frozen until the token expires — if a user's role changes, existing tokens still carry the old role.

### Level 4 — Shared secrets versus key pairs

| | HMAC (`HS256`) | Asymmetric (`RS256`, `ES256`, `EdDSA`) |
|---|---|---|
| Keys | One shared secret | A private key (signs) and a public key (verifies) |
| Who can verify | Anyone with the secret — who can also **create** tokens | Anyone with the public key — who **cannot** create tokens |
| Typical use | One service issuing and verifying its own tokens | An identity provider issuing tokens verified by many services and third parties |
| Key distribution | The secret must be shared securely with every verifier | Public keys can be published openly (JWKS) |

With HMAC, every service that verifies tokens holds a key that can **mint** valid tokens. If any one of ten services is compromised, the attacker can forge tokens for all of them. With asymmetric keys, only the identity service holds the private key; the others hold public keys that are harmless if leaked. That is why OAuth and OpenID Connect providers sign with asymmetric keys ({{ch:oauth}}).

### Level 4 — JWKS and key rotation

Issuers publish their public keys at a well-known URL as a **JSON Web Key Set**:

```json
{
  "keys": [
    { "kty": "EC", "crv": "P-256", "kid": "2026-06", "use": "sig", "alg": "ES256", "x": "…", "y": "…" },
    { "kty": "EC", "crv": "P-256", "kid": "2026-03", "use": "sig", "alg": "ES256", "x": "…", "y": "…" }
  ]
}
```

Each token's header names the key that signed it with `kid` ("key id"). A verifier fetches the JWKS (and caches it), picks the key with the matching `kid`, and verifies. This makes **key rotation** routine: the issuer adds a new key to the set, starts signing new tokens with it, and removes the old key only after all tokens signed with it have expired. If a private key leaks, the issuer removes it from the set, and tokens signed with it stop verifying.

## Using a library: `jose`

Hand-written JWT code is easy to get subtly wrong. Use a well-maintained library. **`jose`** is a widely used, dependency-free library that works in Node.js, browsers and edge runtimes:

```ts
import { SignJWT, jwtVerify, generateKeyPair, exportJWK, createLocalJWKSet } from "jose";

// The identity service: holds the private key
const { publicKey, privateKey } = await generateKeyPair("ES256");
const ISSUER = "https://auth.cornershop.example";

async function issueAccessToken(userId: string, role: string, nowSeconds: number): Promise<string> {
  return new SignJWT({ role })
    .setProtectedHeader({ alg: "ES256", kid: "2026-06" })
    .setSubject(userId)
    .setIssuer(ISSUER)
    .setAudience("orders-api")
    .setIssuedAt(nowSeconds)
    .setExpirationTime(nowSeconds + 15 * 60)       // 15 minutes
    .sign(privateKey);
}

// The orders service: has only the public keys (normally fetched from the JWKS URL with createRemoteJWKSet)
const jwks = createLocalJWKSet({ keys: [{ ...(await exportJWK(publicKey)), kid: "2026-06", alg: "ES256" }] });

async function authenticate(token: string, nowSeconds: number) {
  const { payload } = await jwtVerify(token, jwks, {
    issuer: ISSUER,
    audience: "orders-api",
    algorithms: ["ES256"],
    currentDate: new Date(nowSeconds * 1000),
  });
  return { userId: payload.sub, role: payload.role };
}

const now = 1_781_000_000;
const token = await issueAccessToken("usr_41", "customer", now);
console.log(await authenticate(token, now + 60));

for (const [label, check] of [
  ["expired", () => authenticate(token, now + 16 * 60)],
  ["wrong audience", async () => jwtVerify(token, jwks, { issuer: ISSUER, audience: "payments-api", algorithms: ["ES256"], currentDate: new Date((now + 60) * 1000) })],
] as const) {
  try {
    await check();
  } catch (error) {
    console.log(`${label}: ${(error as Error & { code?: string }).code}`);
  }
}
```

**Output:**

```text
{ userId: 'usr_41', role: 'customer' }
expired: ERR_JWT_EXPIRED
wrong audience: ERR_JWT_CLAIM_VALIDATION_FAILED
```

Walk through it:

- `generateKeyPair("ES256")` creates an elliptic-curve key pair (ECDSA with the P-256 curve). In production, keys are generated once, stored in a secrets manager or key management service ({{ch:secrets-manager}}), and rotated on a schedule.
- `SignJWT` builds the token with the standard claims — subject, issuer, audience, issued-at, expiry — plus a custom `role` claim, and signs it with the **private** key.
- The verifying service uses only a **key set** of public keys. In production you would use `createRemoteJWKSet(new URL("https://auth.cornershop.example/.well-known/jwks.json"))`, which fetches and caches the issuer's keys.
- `jwtVerify` checks the signature, the allowed **algorithms**, the **issuer**, the **audience**, expiry and not-before. Every one of these checks matters (below). `currentDate` is set only to make the example deterministic; normally the real clock is used.
- A token issued for `orders-api` is rejected by a service that expects `payments-api` — preventing a token stolen from one API being used against another.

## Verifying correctly: the classic vulnerabilities

### Level 4 — The checklist

Every service that accepts JWTs must:

1. **Allow only the algorithms you use** (an explicit allow-list such as `["ES256"]`).
2. **Verify the signature** with the right key (by `kid`, from a trusted key set).
3. **Check `exp`** (and `nbf`), allowing at most a small clock skew (a few seconds to a minute).
4. **Check `iss`** — the token came from the issuer you trust.
5. **Check `aud`** — the token was issued for **this** service.
6. **Check token type** if several kinds exist — an ID token or a refresh token must not be accepted where an access token is expected.
7. **Then** authorise based on the claims — and remember authorisation still checks ownership of each resource ({{ch:rest-apis}}).

### Level 4 — Famous mistakes

- **The `none` algorithm.** The JWT standard includes an "unsecured" algorithm, `alg: "none"`, meaning "no signature". Some early libraries, given such a token, happily skipped verification. An attacker took any token, changed the claims, set `alg` to `none`, removed the signature — and was accepted. Modern libraries reject `none` by default, and an explicit algorithm allow-list prevents it.
- **Algorithm confusion.** A server expects `RS256` (verified with a public key) but its library chooses the verification method from the token's header. The attacker creates a token with `alg: "HS256"` and signs it using the server's **public key** as if it were an HMAC secret. A careless library then verifies the HMAC with that same public key — and succeeds. Again: never let the token choose the algorithm.
- **Decoding instead of verifying.** Using a function that only **decodes** the payload (`jwt.decode`) and trusting the result. Decoding proves nothing.
- **Weak HMAC secrets.** Short or guessable secrets (`"secret"`, `"changeme"`) can be brute-forced offline from a single captured token, because the attacker can test guesses against the signature without contacting your server. Use at least 32 random bytes.
- **Missing audience checks.** A token issued for a low-security internal tool accepted by the payments API.
- **Trusting `kid` or `jku` headers blindly.** Headers that point to where keys should be fetched from (`jku`, `x5u`) or that are used in file paths or database queries (`kid`) can be abused to make the server fetch an attacker's key or perform injection. Only use keys from your configured, trusted key sets.
- **Sensitive data in the payload.** JWTs are readable by anyone holding them — including browser extensions, logs and proxies.

## Access tokens and refresh tokens

### Level 4 — The revocation problem

A JWT is valid until `exp`. If a token is stolen, or a user logs out, or an employee is fired, the token keeps working until it expires — the server has no record to delete. This is the fundamental trade-off of self-contained tokens: **no lookup means no instant revocation**.

The standard answer is to keep access tokens **short-lived** and pair them with **refresh tokens**:

```text
   login ──▶ access token (JWT, 5–15 min)  +  refresh token (opaque random, days–weeks,
                                               stored server-side, HttpOnly cookie for browsers)

   API call ──▶ Authorization: Bearer <access token>        verified locally, no lookup

   access token expires ──▶ POST /token/refresh  (with refresh token)
                              server checks refresh token in its database:
                                 valid?   → new access token + NEW refresh token (rotation)
                                 revoked? → 401, log in again
```

- **Access tokens** are JWTs, verified cheaply by any service without a lookup. Their short lifetime limits the damage of theft or delayed revocation to minutes.
- **Refresh tokens** are usually **opaque random strings** stored (hashed) on the server — essentially a long-lived session ({{ch:sessions}}). Because they are checked against the database on every use, they **can** be revoked instantly: logging out, "log out everywhere", password changes and disabling accounts all delete refresh tokens, and the user's access ends within one access-token lifetime.
- **Rotation**: every time a refresh token is used, issue a new one and invalidate the old. If an **old** refresh token is ever presented again, someone has copied it — revoke the whole family of tokens for that login and require re-authentication (**reuse detection**). This is recommended by current OAuth security guidance.
- In browsers, keep the refresh token in an `HttpOnly`, `Secure`, `SameSite` cookie scoped to the refresh endpoint, and the access token in memory — or keep both server-side with a backend-for-frontend ({{ch:frontend-authentication}}).

### Level 5 — When you need faster revocation

If minutes are too long — for example, an administrator's access must end **now** — options include:

- **A deny-list** of revoked token ids (`jti`) or "tokens issued before time T are invalid for user X", checked on each request. This reintroduces a lookup (usually a fast cache — {{ch:redis}}), but only for a small list.
- **Very short access-token lifetimes** for privileged roles.
- **Token introspection**: services ask the authorisation server whether a token is still active (an OAuth standard endpoint) — accurate, but a network call per request (often cached briefly).

At some point, the "stateless" advantage disappears — which is why, for a single web application, plain sessions are often simpler.

## JWTs versus sessions

| | Server-side session ({{ch:sessions}}) | JWT access token |
|---|---|---|
| Where state lives | Server store | Inside the token |
| Per-request lookup | Yes | No (signature check) |
| Revocation | Immediate | At expiry (or via deny-list / refresh-token revocation) |
| Works across many services without shared storage | Needs shared store | Yes |
| Size | Tiny id | Hundreds of bytes or more |
| Common in | Web apps with their own back end | APIs, microservices, mobile apps, OAuth/OIDC, third-party access |

Neither is "modern" or "old": they solve different problems. A sensible default:

- **One web application, its own back end** → sessions in `HttpOnly` cookies.
- **Many services, mobile clients, third-party API access, identity providers** → short-lived JWT access tokens plus revocable refresh tokens (usually through OAuth/OIDC — {{ch:oauth}}).
- Often both: a browser session at the edge (a backend-for-frontend), which exchanges it for short-lived JWTs when calling internal services.

## From beginner to enterprise

**Level 3 — first token-based API.** A library such as `jose`; short-lived tokens; all verification checks; strong secrets; no sensitive data in claims.

**Level 4 — real applications.** Access and refresh tokens with rotation and reuse detection; refresh tokens stored hashed and revocable; audiences per API; asymmetric keys if more than one service verifies.

**Level 5 — professional practice.** Keys in a key management service; published JWKS with `kid`-based rotation; clock-skew tolerance; deny-lists for urgent revocation; token type checks; monitoring of verification failures.

**Level 6 — large systems.** An identity provider issuing tokens for many applications through OAuth and OpenID Connect ({{ch:oauth}}); API gateways verifying tokens at the edge ({{ch:api-gateway}}); service-to-service tokens with narrowly scoped audiences; token exchange between trust domains; proof-of-possession tokens (bound to a client key, so a copied token is useless without the key) for high-security systems.

## Real-world use cases

### A microservice platform

- **Situation**: a shop split into orders, payments and shipping services.
- **Design**: the authentication service issues 10-minute ES256 access tokens with `aud` per service and a `tenantId` claim; services verify locally using the cached JWKS; refresh tokens rotate and are revocable centrally.
- **Benefit**: no service calls the authentication service on each request; a compromised shipping service cannot mint tokens.

### A mobile app

- **Situation**: an Android app calls the API.
- **Design**: access token in memory; refresh token in Android's secure storage; refresh with rotation; on password change, all refresh tokens revoked so devices are logged out within minutes.

## Common mistakes

### Beginner: long-lived JWTs

Tokens valid for 30 days with no refresh mechanism. **Consequence:** a stolen token works for a month; logout is meaningless. **Fix:** short access tokens plus revocable refresh tokens.

### Beginner: treating the payload as secret

Emails, addresses or internal flags in the payload. **Fix:** only the minimum identifiers and claims; JWE if confidentiality is truly needed.

### Beginner: decoding without verifying

**Fix:** always use the library's verify function with explicit options.

### Intermediate: not pinning algorithms

**Consequence:** `none` and algorithm-confusion attacks. **Fix:** explicit allow-list.

### Intermediate: skipping `aud` and `iss`

**Fix:** always check both.

### Intermediate: weak or shared HMAC secrets

**Fix:** 32+ random bytes; asymmetric keys when several services verify.

### Production: tokens in `localStorage`

**Fix:** memory or `HttpOnly` cookies; backend-for-frontend ({{ch:frontend-authentication}}).

### Production: stale claims

A demoted admin keeps admin rights until the token expires. **Fix:** short lifetimes; critical permission checks against current data; revoke refresh tokens on role changes.

### Enterprise: no key rotation plan

**Fix:** `kid`-based rotation through JWKS, rehearsed.

## Debugging and troubleshooting

- **Decode a token to inspect it** — but never paste production tokens into public websites; decode locally (`Buffer.from(part, "base64url")`, or a local tool).
- **"Invalid signature"**: wrong key or secret; the token was modified (often by URL-encoding or whitespace); the verifier uses a different algorithm; a stale cached JWKS after key rotation (refetch on unknown `kid`).
- **"Token expired" right after issuing**: clock difference between servers (use time synchronisation and a small skew allowance), or seconds/milliseconds confusion in `exp`.
- **"Audience invalid"**: the token was requested for a different API; check the client's configuration.
- **Tokens suddenly huge**: too many claims (for example, every permission listed); headers have size limits at proxies and servers — keep claims small and look up detailed permissions server-side.

## Security summary

- Pin algorithms; verify signature, `exp`, `nbf`, `iss`, `aud` and token type with a maintained library.
- Use strong secrets (32+ random bytes) or, better, asymmetric keys with JWKS and rotation.
- Keep access tokens short-lived; make refresh tokens revocable, rotated and reuse-detecting.
- Store tokens safely: never long-lived tokens in `localStorage`; `HttpOnly` cookies or memory in browsers; secure platform storage on mobile.
- Never put secrets or sensitive data in payloads; never log tokens ({{ch:logging}}).
- Use HTTPS everywhere; bearer tokens are usable by anyone who obtains them.

## How a senior engineer thinks about this

- **A JWT is a signed statement, not a session.** They use it where self-contained verification across boundaries is valuable, and sessions where revocation and simplicity matter more.
- **Short-lived and narrowly scoped.** Minutes of lifetime, one audience, few claims.
- **Verification is a checklist, not a single function call.** Algorithms, keys, issuer, audience, expiry, type — all explicit.
- **Plan revocation and rotation before launch**, not after the first incident.
- **Delegate to standards.** OAuth 2.0 and OpenID Connect define how tokens are issued and refreshed; they rely on them and on mature identity providers ({{ch:oauth}}).

## Exercises

### Exercise 1 — Read a token

**Objective:** practise decoding and interpreting JWTs.
**What to do:** decode the payload of the token shown at the start of "How it works inside" (by hand reasoning or with a few lines of code), and answer: who is it for, when does it expire (in minutes after issue), which standard claims are missing, and is it safe to put the user's phone number in it?

<details>
<summary>Show the solution</summary>

```ts
const token =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c3JfNDEiLCJyb2xlIjoiY3VzdG9tZXIiLCJpYXQiOjE3ODEwMDAwMDAsImV4cCI6MTc4MTAwMDkwMH0.7_nAXfIDuDVFtqioY7WQSCAdW1pqMxTjKmJCIyYU8rA";
const [header, payload] = token.split(".").slice(0, 2).map((p) => JSON.parse(Buffer.from(p, "base64url").toString("utf8")));
console.log(header, payload, `valid for ${(payload.exp - payload.iat) / 60} minutes`);
```

**Output:**

```text
{ alg: 'HS256', typ: 'JWT' } { sub: 'usr_41', role: 'customer', iat: 1781000000, exp: 1781000900 } valid for 15 minutes
```

**Answers:** the subject is user `usr_41`, a customer; it expires 15 minutes after issue; it lacks `iss` (who issued it), `aud` (which API it is for) and `jti` — so any service that shares the secret would accept it, which is a weakness; and **no**, a phone number must not go in it: anyone holding the token can read the payload, as this exercise just demonstrated. Decoding needed no key at all.

</details>

### Exercise 2 — Find the verification bugs

**Objective:** practise reviewing JWT verification.
**Starting point:**

```ts
// fragment
app.use((req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  const payload = jwt.decode(token);
  if (payload && payload.exp > Date.now()) {
    req.user = payload;
    return next();
  }
  res.status(401).end();
});
```

**What to do:** list the bugs and write a correct version with `jose`.

<details>
<summary>Show the solution</summary>

**Bugs:**
1. `jwt.decode` does **not** verify the signature — anyone can forge a token.
2. `exp` is in **seconds**, `Date.now()` in **milliseconds**, so every token appears expired (or, compared the other way round, never expires).
3. No algorithm allow-list, issuer or audience checks.
4. The whole payload becomes `req.user`, trusting any claims an attacker adds.
5. No handling of a missing or malformed header.

```ts
// fragment
import { jwtVerify, createRemoteJWKSet } from "jose";

const JWKS = createRemoteJWKSet(new URL("https://auth.cornershop.example/.well-known/jwks.json"));

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const match = /^Bearer (.+)$/.exec(req.get("Authorization") ?? "");
  if (!match) {
    res.status(401).json({ code: "unauthenticated" });
    return;
  }
  try {
    const { payload } = await jwtVerify(match[1]!, JWKS, {
      issuer: "https://auth.cornershop.example",
      audience: "orders-api",
      algorithms: ["ES256"],
      clockTolerance: 30,
    });
    res.locals.user = { id: payload.sub, role: payload.role === "admin" ? "admin" : "customer" };
    next();
  } catch {
    res.status(401).json({ code: "invalid_token" });
  }
}
```

The library verifies the signature with keys from the trusted JWKS, restricts algorithms, checks issuer, audience and time claims (with 30 seconds of clock tolerance), and only selected, validated claims are used.

</details>

### Exercise 3 — Debug the logout that does not log out

**Objective:** practise reasoning about revocation.
**The scenario:** after a customer reports a stolen phone, support clicks "log out all devices", but the thief keeps using the app for the next 24 hours. The system issues 24-hour JWT access tokens and no refresh tokens. Explain and fix.

<details>
<summary>Show the solution</summary>

**Explanation:** "log out all devices" can only affect state the server controls. With self-contained 24-hour access tokens and no server-side record, there is nothing to delete; the stolen token remains valid until it expires.

**Fix:**
1. Shorten access tokens to minutes (for example, 10).
2. Introduce **refresh tokens** stored hashed on the server, rotated on use with reuse detection; "log out all devices" deletes them, so the thief loses access within one access-token lifetime.
3. For immediate effect in urgent cases, add a per-user "tokens issued before T are invalid" check (cached in Redis), set when the user's sessions are revoked.
4. Store tokens on the phone in secure storage, and require re-authentication for sensitive actions.

</details>

### Exercise 4 — Production scenario: design token handling for a platform

**Objective:** design an end-to-end token system.
**The scenario:** your company runs a web shop, a mobile app, three internal services, and a partner API for delivery companies. Propose how authentication tokens should be issued, verified, stored and revoked across these.

<details>
<summary>Show the solution</summary>

1. **One identity provider** (built in-house on a proven library, or a hosted service) issuing tokens through OAuth 2.0 / OpenID Connect ({{ch:oauth}}).
2. **Web shop**: a backend-for-frontend with an `HttpOnly` session cookie; the BFF holds tokens and calls internal services — no tokens in the browser.
3. **Mobile app**: authorisation-code flow with PKCE; 10-minute access tokens; rotating refresh tokens with reuse detection in secure device storage.
4. **Internal services**: verify ES256 access tokens locally with cached JWKS; each service checks its own `aud`; tokens carry minimal claims (`sub`, `tenantId`, `scope`); fine-grained authorisation looked up server-side.
5. **Service-to-service calls**: separate client-credentials tokens with narrow audiences, not user tokens forwarded everywhere.
6. **Partner API**: OAuth client credentials per delivery company with scopes (`shipments:read`, `shipments:write`); rate limits per client ({{ch:rate-limiting}}).
7. **Keys**: private keys in a key management service; rotation every few months via `kid`; emergency rotation runbook.
8. **Revocation**: refresh-token revocation on logout, password change, account disablement; deny-list for urgent cases; partner credentials revocable instantly.
9. **Monitoring**: verification failures by reason; refresh-token reuse events (possible theft); unusual token issuance rates.

</details>

## Summary

A **JSON Web Token** is a compact string of three base64url parts — **header**, **payload** of **claims**, and **signature** — that lets any holder of the right key verify, without a lookup, that a trusted issuer made statements such as "this is user 41, valid until 10:15". The payload is readable by anyone, so it must never contain secrets or sensitive data.

Tokens are signed with an **HMAC** shared secret (`HS256`) — simple, but every verifier can also forge tokens — or an **asymmetric** key pair (`RS256`, `ES256`, `EdDSA`), where only the issuer holds the private key and public keys are published in a **JWKS** with `kid`-based rotation. Verify with a maintained library such as `jose`, explicitly: allowed **algorithms**, signature, `exp`/`nbf` with small clock skew, **issuer**, **audience** and token type — avoiding the classic `none`, algorithm-confusion, decode-only, weak-secret and missing-audience mistakes.

Because self-contained tokens cannot be revoked before they expire, keep **access tokens** short-lived and pair them with **refresh tokens** that are opaque, stored hashed on the server, rotated on each use with **reuse detection**, and revoked on logout and password change; add deny-lists or introspection where faster revocation is needed. Prefer sessions for a single web application and its own back end; use JWTs for APIs, many services, mobile clients and OAuth/OIDC — often together.

## Key terms

- **JSON Web Token (JWT)** — A compact, signed string carrying JSON claims that can be verified without contacting the issuer.
- **Claim** — A statement inside a JWT, such as the subject or the expiry time.
- **JWT header** — The first part of a JWT, describing the token type and signing algorithm.
- **JWT payload** — The second part of a JWT, containing its claims.
- **JWT signature** — The third part of a JWT, proving it was issued by a key holder and not modified.
- **base64url** — A URL-safe text encoding of binary data used in JWTs; it is encoding, not encryption.
- **JWS** — JSON Web Signature: the signed form of a JWT.
- **JWE** — JSON Web Encryption: an encrypted form of a JWT whose payload is confidential.
- **HS256** — A JWT signing algorithm using HMAC with SHA-256 and a shared secret.
- **RS256 / ES256 / EdDSA** — JWT signing algorithms using asymmetric key pairs (RSA, elliptic-curve ECDSA, and Edwards-curve signatures).
- **JWKS (JSON Web Key Set)** — A published document listing an issuer's public keys for verifying tokens.
- **kid (key id)** — A JWT header value identifying which key signed the token.
- **Key rotation** — Regularly replacing signing keys while keeping old public keys available until their tokens expire.
- **iss / sub / aud / exp / nbf / iat / jti** — Registered JWT claims for issuer, subject, audience, expiry, not-before, issued-at and token id.
- **NumericDate** — A time expressed as seconds since 1 January 1970 UTC, used in JWT time claims.
- **Bearer token** — A token that grants access to whoever presents it.
- **Access token** — A short-lived token presented to APIs to access resources.
- **Refresh token** — A longer-lived, revocable credential used only to obtain new access tokens.
- **Refresh-token rotation** — Issuing a new refresh token at every use and invalidating the previous one.
- **Reuse detection** — Treating the reuse of an old refresh token as evidence of theft and revoking the token family.
- **Deny-list (tokens)** — A list of revoked token ids or cut-off times checked when verifying tokens.
- **Token introspection** — Asking an authorisation server whether a token is currently active.
- **Algorithm confusion attack** — Exploiting a verifier that lets the token choose its algorithm, for example verifying an HMAC with a public key.
- **"none" algorithm attack** — Submitting an unsigned token with `alg: none` to a verifier that wrongly accepts it.
- **jose** — A widely used JavaScript library for creating and verifying JWTs and related JOSE objects.

## What comes next

JWTs are the tokens; **OAuth 2.0** and **OpenID Connect** are the standards that decide how those tokens are obtained, by whom, and for what. The next chapter, {{ch:oauth}}, explains how "Log in with Google" works, how third-party applications get limited access to user data without passwords, and how to implement the authorisation-code flow with PKCE safely.
