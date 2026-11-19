# Phase 2 — Chapter 7: JWT (JSON Web Tokens)

> *"JWTs are a compact, URL-safe way to represent claims securely between two parties."* — RFC 7519

---

## Chapter Overview

### Why JWT Exists

Traditional session-based auth stores session data server-side (in memory or a database). This has problems at scale:
- Sticky sessions required with load balancers
- Session store becomes a bottleneck and single point of failure
- Horizontal scaling is complex

JWT solves this by encoding the user's identity and claims into a self-contained, cryptographically signed token. The server doesn't need to look anything up — it just verifies the signature and reads the payload.

JWT is now the dominant approach for:
- REST API authentication
- Microservice-to-microservice auth
- Mobile app auth
- Single Page Applications

**But JWT has tradeoffs** — you'll learn those here too.

---

## Beginner Theory

### JWT Structure

A JWT is a base64url-encoded string with three parts separated by dots:

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjMiLCJuYW1lIjoiQWxpY2UiLCJpYXQiOjE3MDY3NDU2MDAsImV4cCI6MTcwNjc0NjUwMH0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c

Header.Payload.Signature
```

**Header** (algorithm + type):
```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```

**Payload** (claims):
```json
{
  "sub": "user-123",        ← subject (user ID)
  "iat": 1706745600,        ← issued at (Unix timestamp)
  "exp": 1706745900,        ← expiration (15 minutes later)
  "role": "admin",          ← custom claim
  "email": "alice@x.com"   ← custom claim
}
```

**Signature** (prevents tampering):
```
HMACSHA256(
  base64url(header) + "." + base64url(payload),
  SECRET_KEY
)
```

**Critical: the payload is only base64-encoded, NOT encrypted. Anyone can decode it (try jwt.io). Never put sensitive data in a JWT payload.**

### Standard Claims (RFC 7519)

```
iss — Issuer: who created the token ("myapp.com")
sub — Subject: who the token refers to (user ID)
aud — Audience: intended recipient ("myapp-api")
exp — Expiration Time: Unix timestamp when token expires
nbf — Not Before: token invalid before this timestamp
iat — Issued At: when the token was created
jti — JWT ID: unique ID (prevents replay attacks)
```

### Signing Algorithms

```
HS256 (HMAC-SHA256) — Symmetric
  Same key signs and verifies
  Simple, fast
  Key must be kept secret
  Use when: one service signs AND verifies (monolith, simple microservices)

RS256 (RSA-SHA256) — Asymmetric
  Private key signs, public key verifies
  Private key never leaves the auth server
  Public key distributed to all services
  Use when: auth server signs, multiple services verify

ES256 (ECDSA-SHA256) — Asymmetric
  Like RS256 but with Elliptic Curve (smaller keys, faster)
  Use when: performance matters, modern deployments

EdDSA (Ed25519) — Asymmetric
  Newest, fastest, most secure asymmetric option
  Use for new projects
```

---

## Basic Examples

### Creating and Verifying JWTs

```javascript
const jwt = require("jsonwebtoken");

// ─── SIGN (create token) ──────────────────────────────────────────────────────
const ACCESS_SECRET  = process.env.JWT_ACCESS_SECRET;   // min 32 chars, random
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;  // different from access

function createAccessToken(user) {
  return jwt.sign(
    {
      sub:   user.id,          // subject — always use user ID (not email)
      role:  user.role,
      email: user.email        // only if you need it in every request
      // DON'T include: passwords, credit cards, PII, secrets
    },
    ACCESS_SECRET,
    {
      expiresIn: "15m",
      issuer: "myapp.com",    // iss claim
      audience: "myapp-api"   // aud claim
    }
  );
}

function createRefreshToken(userId) {
  return jwt.sign(
    { sub: userId, jti: crypto.randomUUID() },  // jti = unique per token
    REFRESH_SECRET,
    { expiresIn: "7d" }
  );
}

// ─── VERIFY (authenticate) ────────────────────────────────────────────────────
function verifyAccessToken(token) {
  return jwt.verify(token, ACCESS_SECRET, {
    issuer: "myapp.com",
    audience: "myapp-api"
  });
  // Throws: JsonWebTokenError, TokenExpiredError, NotBeforeError
}

// ─── DECODE (without verification — for debugging only!) ──────────────────────
function decodeToken(token) {
  return jwt.decode(token);   // DO NOT use this for authentication!
}

// ─── MIDDLEWARE ────────────────────────────────────────────────────────────────
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided" });
  }

  const token = authHeader.slice(7);  // Remove "Bearer "

  try {
    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token expired", code: "TOKEN_EXPIRED" });
    }
    return res.status(401).json({ error: "Invalid token" });
  }
}
```

---

## Intermediate Concepts

### Access Token + Refresh Token Architecture

```
                    ┌─────────────────────────────────────────┐
                    │           WHY TWO TOKENS?               │
                    │                                         │
  Access Token      │  Short-lived (15m)                      │
  (lives in memory) │  Used on every API request              │
                    │  Stateless — no DB lookup on verify     │
                    │  If stolen: expires quickly             │
                    │                                         │
  Refresh Token     │  Long-lived (7d–30d)                    │
  (HTTP-only cookie)│  Only used to get new access tokens     │
                    │  Stored in DB — can be revoked          │
                    │  If stolen: detected via rotation       │
                    └─────────────────────────────────────────┘

Flow:
1. Login → server issues access + refresh tokens
2. Client uses access token for API requests
3. Access token expires → client calls /auth/refresh with refresh token
4. Server verifies refresh token, issues new access + refresh tokens
5. Old refresh token is revoked (rotation)
6. Client stores new tokens, continues
```

### Revocation Problem (and Solutions)

**The core problem with JWT:** Once issued, a JWT is valid until expiry. You can't "cancel" it because verification is stateless.

```javascript
// PROBLEM: User logs out, but their access token is still valid for 15 minutes

// SOLUTION 1: Short expiry (15m max) — limit blast radius
// Acceptable for most use cases

// SOLUTION 2: Blocklist (denylist) — store revoked JTIs
// Add jti claim to every token
const token = jwt.sign({ sub: userId, jti: crypto.randomUUID() }, SECRET, { expiresIn: "15m" });

// When logging out / revoking:
await redis.setex(`revoked:${payload.jti}`, 15 * 60, "1");  // expire same time as token

// In verify middleware:
const isRevoked = await redis.get(`revoked:${payload.jti}`);
if (isRevoked) return res.status(401).json({ error: "Token has been revoked" });

// SOLUTION 3: Access token version (user-level revocation)
// Add tokenVersion to user record
const token = jwt.sign({ sub: user.id, version: user.tokenVersion }, SECRET);

// In middleware:
const user = await db.users.findById(payload.sub);
if (user.tokenVersion !== payload.version) {
  return res.status(401).json({ error: "Token invalidated" });
}
// Increment tokenVersion to invalidate all existing tokens for a user

// Trade-off: requires DB lookup on every request (partially defeats stateless advantage)
```

### RS256 (Asymmetric) Setup

```bash
# Generate RSA key pair
openssl genrsa -out private.pem 2048
openssl rsa -in private.pem -pubout -out public.pem
```

```javascript
const fs = require("fs");

const privateKey = fs.readFileSync("private.pem");
const publicKey  = fs.readFileSync("public.pem");

// Auth service: sign with private key
const token = jwt.sign({ sub: user.id }, privateKey, {
  algorithm: "RS256",
  expiresIn: "15m"
});

// Any service: verify with public key (public key can be shared freely)
const payload = jwt.verify(token, publicKey, { algorithms: ["RS256"] });

// JWK (JSON Web Key) — standard way to distribute public keys
// Auth server exposes: GET /.well-known/jwks.json
// Other services fetch and cache the public keys
// Enables key rotation without redeploying all services
```

### Refresh Token Implementation

```javascript
class TokenService {
  async issueTokenPair(user) {
    const jti = crypto.randomUUID();
    const accessToken = jwt.sign(
      { sub: user.id, role: user.role, jti },
      process.env.ACCESS_SECRET,
      { expiresIn: "15m" }
    );
    const refreshToken = jwt.sign(
      { sub: user.id, jti: crypto.randomUUID() },
      process.env.REFRESH_SECRET,
      { expiresIn: "7d" }
    );

    // Store refresh token hash in DB
    const tokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");
    await db.refreshTokens.create({
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      userAgent: this.req?.headers["user-agent"],
      ip: this.req?.ip
    });

    return { accessToken, refreshToken };
  }

  async rotateRefreshToken(incomingRefreshToken) {
    const tokenHash = crypto.createHash("sha256").update(incomingRefreshToken).digest("hex");

    // Validate JWT signature + expiry
    let payload;
    try {
      payload = jwt.verify(incomingRefreshToken, process.env.REFRESH_SECRET);
    } catch {
      throw new UnauthorizedError("Invalid refresh token");
    }

    // Check it exists in DB
    const storedToken = await db.refreshTokens.findByHash(tokenHash);
    if (!storedToken) {
      // Token was already used (reuse detected) or revoked
      // Security: revoke ALL tokens for this user
      await db.refreshTokens.revokeAll(payload.sub);
      throw new UnauthorizedError("Refresh token already used or revoked");
    }

    // Revoke the used token
    await db.refreshTokens.revoke(tokenHash);

    // Issue new pair
    const user = await db.users.findById(payload.sub);
    return this.issueTokenPair(user);
  }

  async revokeAllUserTokens(userId) {
    await db.refreshTokens.revokeAll(userId);
  }
}
```

---

## Advanced Concepts

### JWT with JWKS (JSON Web Key Sets)

```javascript
// Auth service exposes JWKS endpoint for public key distribution
const jose = require("jose");

// Generate a key pair once and store securely
const { privateKey, publicKey } = await jose.generateKeyPair("RS256", { modulusLength: 2048 });
const privateKeyPem = await jose.exportPKCS8(privateKey);
const publicKeyJwk  = await jose.exportJWK(publicKey);

// JWKS endpoint — consumed by other services
app.get("/.well-known/jwks.json", (req, res) => {
  res.json({
    keys: [
      {
        ...publicKeyJwk,
        kid: "key-1",       // key ID for rotation
        use: "sig",          // use: signature
        alg: "RS256"
      }
    ]
  });
});

// Consuming service: verify JWT using JWKS
const { createRemoteJWKSet, jwtVerify } = require("jose");

const jwks = createRemoteJWKSet(
  new URL("https://auth.myapp.com/.well-known/jwks.json"),
  { cacheMaxAge: 10 * 60 * 1000 }  // cache for 10 minutes
);

const { payload } = await jwtVerify(token, jwks, {
  issuer: "auth.myapp.com",
  audience: "myapp-api"
});
```

### Token Introspection (RFC 7662)

```javascript
// For opaque tokens or when you need real-time validity checking
// The resource server asks the auth server: "is this token still valid?"

// Auth server endpoint
app.post("/token/introspect", async (req, res) => {
  const { token } = req.body;

  try {
    const payload = jwt.verify(token, process.env.ACCESS_SECRET);
    const isRevoked = await redis.get(`revoked:${payload.jti}`);

    if (isRevoked) {
      return res.json({ active: false });
    }

    res.json({
      active: true,
      sub: payload.sub,
      exp: payload.exp,
      iat: payload.iat,
      scope: payload.scope
    });
  } catch {
    res.json({ active: false });
  }
});
```

---

## Industry Usage

- **Auth0, Okta, Cognito**: Issue JWTs (RS256) for identity management
- **Firebase Auth**: Issues JWTs signed with Google's private keys; apps verify using JWKS
- **Microservices**: Service A signs JWT with its private key; Service B verifies with public key (JWKS)
- **API Gateways**: Verify JWT at the gateway, forward user info to services via headers

---

## Security

```javascript
// CRITICAL SECURITY RULES:

// 1. Never put sensitive data in payload
// ✗ jwt.sign({ password, ssn, creditCard }, ...)
// ✓ jwt.sign({ sub: userId, role }, ...)

// 2. Use strong secrets
// ✗ jwt.sign({ sub: "1" }, "secret")         // too weak
// ✓ jwt.sign({ sub: "1" }, crypto.randomBytes(64).toString("hex"))

// 3. Always verify — never just decode
// ✗ const payload = jwt.decode(token)         // no verification!
// ✓ const payload = jwt.verify(token, secret)

// 4. Validate algorithm in verify
jwt.verify(token, publicKey, { algorithms: ["RS256"] });
// Without this, "alg: none" attack works: attacker sends unsigned token
// Also prevents RS256 → HS256 confusion attack (using public key as HMAC secret)

// 5. Short expiry
// ✗ expiresIn: "30d"   // too long
// ✓ expiresIn: "15m"   // access token
// ✓ expiresIn: "7d"    // refresh token

// 6. Store refresh tokens server-side (for revocation)
// Don't issue opaque tokens you can't revoke — always store a reference

// 7. Validate iss, aud claims
jwt.verify(token, secret, {
  issuer: "myapp.com",
  audience: "myapp-api"
});
```

---

## Interview Preparation

**Q1: What is a JWT? What are its three parts?**
A: A JWT (JSON Web Token) is a compact, URL-safe, base64url-encoded token for securely transmitting claims. Three parts: Header (algorithm + type), Payload (claims — user data, expiry), Signature (HMAC or RSA signature that verifies authenticity). The payload is encoded, not encrypted — it can be decoded by anyone. The signature ensures it hasn't been tampered with.

**Q2: What is the difference between HS256 and RS256?**
A: HS256 (HMAC-SHA256) is symmetric — one secret key is used to both sign and verify. Simple but the secret must be shared between all verifying services. RS256 is asymmetric — a private key signs, a public key verifies. The private key never leaves the auth server. Public keys are distributed (via JWKS). Use RS256 for microservices where multiple services need to verify tokens.

**Q3: What is the JWT revocation problem? How do you solve it?**
A: JWTs are stateless — once issued, they're valid until expiry. You can't invalidate them without server-side state. Solutions: (1) short expiry (15m) limits blast radius — most practical approach; (2) JWT blocklist (denylist) — store revoked JTIs in Redis, check on every request; (3) token versioning — store tokenVersion on user, include in JWT, check on every request (requires DB lookup, partially defeats statelessness).

**Q4: What is the `alg: none` attack?**
A: Early JWT libraries accepted `"alg": "none"` in the header, meaning no signature required. An attacker could remove the signature, set the algorithm to none, and the server would accept any claims. Fix: always specify accepted algorithms in `jwt.verify()`: `{ algorithms: ["HS256"] }`. Modern libraries often disable none by default, but always be explicit.

**Q5: Where should JWTs be stored on the client?**
A: Access tokens (short-lived) in memory (JavaScript variable or React state) — never persists across page refreshes, can't be stolen by XSS if never hits DOM. Refresh tokens in HTTP-only, Secure, SameSite=Strict cookies — inaccessible to JavaScript (XSS-proof) and protected from CSRF. Never store sensitive tokens in localStorage — it's fully readable by any JavaScript on the page.

---

## Practical Tasks

### Beginner (10 Tasks)
1. Sign a JWT with HS256 and print the three parts (decode and inspect each).
2. Create an access token with sub, role, and exp claims and verify it.
3. Handle TokenExpiredError and JsonWebTokenError differently in middleware.
4. Use jwt.io to decode a JWT you created and verify the payload is base64.
5. Add iss and aud claims and validate them in jwt.verify.
6. Create a middleware that extracts the user from the JWT and attaches to req.user.
7. Demonstrate that jwt.decode() does NOT verify the signature.
8. Create a refresh endpoint that issues a new access token given a valid refresh token.
9. Test the middleware with an expired token, tampered token, and missing token.
10. Add a jti (JWT ID) claim using crypto.randomUUID() and log it with every request.

### Intermediate (10 Tasks)
1. Generate an RSA key pair and implement RS256 signing and verification.
2. Build a JWKS endpoint and a consuming service that fetches and caches public keys.
3. Implement JWT token blocklist using Redis (store revoked JTIs).
4. Implement token versioning for user-level revocation.
5. Build complete token rotation with reuse detection.
6. Add `nbf` (not before) claim for scheduled access (e.g., tokens valid after 5 minutes).
7. Build a token introspection endpoint (RFC 7662).
8. Implement JWT for microservice-to-microservice authentication.
9. Test all JWT security vulnerabilities: alg:none, RS256/HS256 confusion, expired, tampered.
10. Add audience validation for multi-API environment (different audience per service).

### Advanced (10 Tasks)
1. Implement key rotation: generate new key pair, serve both in JWKS, rotate over 24 hours.
2. Build a JWT-based distributed session management system.
3. Implement DPoP (Demonstration of Proof of Possession) bound tokens.
4. Build a service mesh where all services authenticate via JWT with JWKS.
5. Implement fine-grained scopes in JWT (e.g., `orders:read`, `orders:write`, `admin`).
6. Add JWT compression for large payloads (JWE — JSON Web Encryption).
7. Build a CLI tool that decodes and validates JWTs from the command line.
8. Implement PKCE flow with JWT for single-page applications.
9. Add OpenTelemetry trace ID to JWT claims for distributed tracing.
10. Audit a JWT implementation for security vulnerabilities (write a security report).

---

## Mini Project

**Stateless Auth API**: Build a complete auth system using JWT:
- Login/register with access (15m) + refresh (7d) tokens
- RS256 signing with JWKS endpoint
- Token rotation with reuse detection
- JTI-based blocklist in Redis
- Middleware that validates tokens, algorithms, iss, aud
- Revoke all tokens on password change
- Full test suite for all token flows

---

## Self Assessment
1. What are the three parts of a JWT?
2. Is the JWT payload encrypted or just encoded? What does this mean for security?
3. What claims are defined by RFC 7519?
4. What is the difference between HS256 and RS256?
5. What is the `alg: none` attack? How is it prevented?
6. What is the JWT revocation problem?
7. What are three approaches to JWT revocation?
8. What is a JWKS endpoint?
9. What is token rotation? What attack does it detect?
10. Where should access tokens and refresh tokens be stored on the client?
11. What does `jwt.verify()` check vs. `jwt.decode()`?
12. What is the `jti` claim used for?
13. Why should you always specify the `algorithms` option in `jwt.verify()`?
14. What should never be in a JWT payload?
15. What is a good expiry for access tokens? For refresh tokens?

---

## Cheat Sheet

### JWT Anatomy
```
Header:  { alg: "HS256", typ: "JWT" }
Payload: { sub, iat, exp, role, ... }
Sig:     HMAC(base64(header)+"."+base64(payload), secret)
```

### Sign
```javascript
jwt.sign(payload, secret, { expiresIn: "15m", issuer: "myapp" })
```

### Verify (always verify, never decode)
```javascript
try {
  const payload = jwt.verify(token, secret, {
    algorithms: ["HS256"],
    issuer: "myapp",
    audience: "api"
  });
} catch (err) {
  if (err.name === "TokenExpiredError") // 401, suggest refresh
  if (err.name === "JsonWebTokenError") // 401, invalid
}
```

### Algorithm Choice
```
HS256 — symmetric, single service
RS256 — asymmetric, multiple services, distribute public key via JWKS
EdDSA — fastest asymmetric, new projects
```

### Token Storage
```
Access token  → memory (JavaScript variable)
Refresh token → HTTP-only cookie (not localStorage!)
```
