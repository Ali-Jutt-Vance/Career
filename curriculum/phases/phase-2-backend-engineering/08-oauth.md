# Phase 2 — Chapter 8: OAuth 2.0 & OpenID Connect

> *"OAuth 2.0 is an authorization framework that enables a third-party application to obtain limited access to an HTTP service."* — RFC 6749

---

## Chapter Overview

### Why OAuth Exists

Before OAuth, third-party integrations required users to share their username and password with the third party. If you wanted to import your Gmail contacts into another app, you gave them your Google password. This was dangerous:
- The third party has full access to your account
- You can't revoke access without changing your password
- You can't grant limited access

OAuth 2.0 (2012) solves this with **delegated authorization**: the user grants a third-party application limited, specific permissions — without revealing their password. The classic example: "Log in with Google."

**OAuth 2.0** = authorization (what can this app do?)
**OpenID Connect (OIDC)** = OAuth 2.0 extension for authentication (who is this user?)

### Real-World Examples
- "Sign in with Google" / "Sign in with GitHub" — OIDC
- GitHub App accessing your repos — OAuth2
- Slack integration posting to your channel — OAuth2
- Spotify app posting to your Twitter — OAuth2
- Google Drive API for a backup app — OAuth2

---

## Beginner Theory

### Core Roles

```
Resource Owner:    The user (owns their data)
Resource Server:   The API holding the user's data (GitHub API, Google Drive)
Client:            Your application requesting access
Authorization Server: Issues access tokens (Google's servers, GitHub's servers)
```

### OAuth 2.0 Grant Types

```
Authorization Code       — Most secure, for web apps and mobile
  ↓ with PKCE            — Enhanced security (required for SPAs and mobile)

Client Credentials       — Machine-to-machine (no user involved)

Device Code              — Smart TVs, CLI tools (no browser)

Refresh Token            — Get new access token without re-authenticating

(Deprecated: Implicit, Resource Owner Password Credentials)
```

### Authorization Code Flow (with PKCE)

```
1. User clicks "Login with GitHub"
2. Your app generates:
   - code_verifier: random 43-128 char string
   - code_challenge: BASE64URL(SHA256(code_verifier))
3. Redirect user to GitHub:
   https://github.com/login/oauth/authorize
     ?client_id=CLIENT_ID
     &redirect_uri=https://myapp.com/callback
     &scope=read:user,user:email
     &state=RANDOM_STATE    ← CSRF protection
     &code_challenge=CHALLENGE
     &code_challenge_method=S256

4. User authenticates at GitHub and grants permission
5. GitHub redirects to: https://myapp.com/callback?code=AUTH_CODE&state=STATE

6. Your app verifies state matches, then exchanges code for tokens:
   POST https://github.com/login/oauth/access_token
   { code: AUTH_CODE, client_id, client_secret, redirect_uri, code_verifier }

7. GitHub returns: { access_token, refresh_token, expires_in }

8. Your app uses access_token to call GitHub API on behalf of the user
```

---

## Basic Examples

### OAuth2 Client (Authorization Code + PKCE)

```javascript
const crypto   = require("crypto");
const express  = require("express");
const axios    = require("axios");
const router   = express.Router();

// In-memory state store (use Redis in production)
const stateStore = new Map();

// ─── STEP 1: Start OAuth flow ─────────────────────────────────────────────────
router.get("/auth/github", (req, res) => {
  // Generate PKCE values
  const codeVerifier  = crypto.randomBytes(32).toString("base64url");
  const codeChallenge = crypto.createHash("sha256")
    .update(codeVerifier)
    .digest("base64url");

  // Generate state for CSRF protection
  const state = crypto.randomBytes(16).toString("hex");

  // Store code_verifier and state temporarily (expires in 10 minutes)
  stateStore.set(state, { codeVerifier, createdAt: Date.now() });
  setTimeout(() => stateStore.delete(state), 10 * 60 * 1000);

  const params = new URLSearchParams({
    client_id:             process.env.GITHUB_CLIENT_ID,
    redirect_uri:          `${process.env.APP_URL}/auth/github/callback`,
    scope:                 "read:user user:email",
    state,
    code_challenge:        codeChallenge,
    code_challenge_method: "S256"
  });

  res.redirect(`https://github.com/login/oauth/authorize?${params}`);
});

// ─── STEP 2: Handle callback ──────────────────────────────────────────────────
router.get("/auth/github/callback", async (req, res) => {
  const { code, state, error } = req.query;

  if (error) {
    return res.redirect(`${process.env.CLIENT_URL}/login?error=${error}`);
  }

  // Verify state (CSRF protection)
  const stored = stateStore.get(state);
  if (!stored) {
    return res.status(400).json({ error: "Invalid or expired state parameter" });
  }
  stateStore.delete(state);

  // Check state age (belt and suspenders)
  if (Date.now() - stored.createdAt > 10 * 60 * 1000) {
    return res.status(400).json({ error: "State expired" });
  }

  try {
    // Exchange code for tokens
    const tokenResponse = await axios.post(
      "https://github.com/login/oauth/access_token",
      {
        client_id:     process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri:  `${process.env.APP_URL}/auth/github/callback`,
        code_verifier: stored.codeVerifier
      },
      { headers: { Accept: "application/json" } }
    );

    const { access_token } = tokenResponse.data;
    if (!access_token) throw new Error("No access token in response");

    // Fetch user info from GitHub
    const [userResponse, emailResponse] = await Promise.all([
      axios.get("https://api.github.com/user", {
        headers: { Authorization: `Bearer ${access_token}` }
      }),
      axios.get("https://api.github.com/user/emails", {
        headers: { Authorization: `Bearer ${access_token}` }
      })
    ]);

    const githubUser = userResponse.data;
    const primaryEmail = emailResponse.data.find(e => e.primary && e.verified)?.email;

    if (!primaryEmail) {
      return res.status(400).json({ error: "No verified email on GitHub account" });
    }

    // Find or create user in your database
    let user = await db.users.findByEmail(primaryEmail);
    if (!user) {
      user = await db.users.create({
        name:          githubUser.name || githubUser.login,
        email:         primaryEmail,
        emailVerified: true,
        githubId:      String(githubUser.id),
        avatarUrl:     githubUser.avatar_url
      });
    } else if (!user.githubId) {
      await db.users.update(user.id, { githubId: String(githubUser.id) });
    }

    // Issue your app's tokens
    const tokens = await tokenService.issueTokenPair(user);

    // Set refresh token as HTTP-only cookie
    res.cookie("refreshToken", tokens.refreshToken, {
      httpOnly: true, secure: true, sameSite: "lax", maxAge: 7 * 24 * 60 * 60 * 1000
    });

    // Redirect to frontend with access token
    res.redirect(`${process.env.CLIENT_URL}/auth/callback?token=${tokens.accessToken}`);

  } catch (err) {
    console.error("GitHub OAuth error:", err.message);
    res.redirect(`${process.env.CLIENT_URL}/login?error=oauth_failed`);
  }
});
```

### Client Credentials Flow (Machine-to-Machine)

```javascript
// Used for service-to-service communication (no user involved)
// Service A authenticates to Service B

// Service A: get a token from auth server
async function getServiceToken() {
  const response = await axios.post("https://auth.myapp.com/oauth/token", {
    grant_type:    "client_credentials",
    client_id:     process.env.SERVICE_CLIENT_ID,
    client_secret: process.env.SERVICE_CLIENT_SECRET,
    scope:         "orders:read orders:write"
  });

  return response.data.access_token;
}

// Cache the token until near expiry
class ServiceTokenCache {
  #token = null;
  #expiresAt = 0;

  async getToken() {
    if (!this.#token || Date.now() >= this.#expiresAt - 60_000) {
      const response = await axios.post("https://auth.myapp.com/oauth/token", {
        grant_type: "client_credentials",
        client_id:  process.env.SERVICE_CLIENT_ID,
        client_secret: process.env.SERVICE_CLIENT_SECRET,
        scope: "orders:read"
      });
      this.#token = response.data.access_token;
      this.#expiresAt = Date.now() + response.data.expires_in * 1000;
    }
    return this.#token;
  }
}

const tokenCache = new ServiceTokenCache();

// Use in API calls
async function getOrderFromOrdersService(orderId) {
  const token = await tokenCache.getToken();
  const response = await axios.get(
    `https://orders-service/api/orders/${orderId}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return response.data;
}
```

---

## Intermediate Concepts

### OpenID Connect (OIDC)

OIDC adds an **ID Token** on top of OAuth2. The ID token is a JWT containing the user's identity information.

```
OAuth 2.0:  "What can this app do?"       → access_token
OIDC:       "Who is this user?" +
            "What can this app do?"        → access_token + id_token
```

```javascript
// OIDC discovery (standard): GET https://accounts.google.com/.well-known/openid-configuration
// Returns: authorization_endpoint, token_endpoint, userinfo_endpoint, jwks_uri, scopes_supported

// OIDC scope "openid" triggers ID token issuance
// Additional scopes: profile, email, phone, address

// ID Token payload (from Google):
{
  "iss": "https://accounts.google.com",
  "sub": "110169484474386276334",   ← Google user ID (stable, use as your user identifier)
  "aud": "your-client-id.apps.googleusercontent.com",
  "exp": 1706749200,
  "iat": 1706745600,
  "email": "alice@gmail.com",
  "email_verified": true,
  "name": "Alice Smith",
  "picture": "https://lh3.googleusercontent.com/...",
  "given_name": "Alice",
  "family_name": "Smith",
  "locale": "en"
}

// ALWAYS verify:
// 1. iss matches expected issuer
// 2. aud matches your client_id
// 3. exp is in the future
// 4. Signature (using JWKS from Google)
```

### Building Your Own OAuth2 Authorization Server

```javascript
// npm install node-oauth2-server or @node-oauth/oauth2-server
// This is complex — usually use Auth0, Keycloak, or AWS Cognito instead

// Core endpoints needed:
// GET  /oauth/authorize  — show consent screen
// POST /oauth/authorize  — process consent
// POST /oauth/token      — issue tokens (all grant types)
// POST /oauth/revoke     — revoke a token
// GET  /.well-known/openid-configuration  — OIDC discovery
// GET  /.well-known/jwks.json             — public keys

// Minimal token endpoint:
app.post("/oauth/token", async (req, res) => {
  const { grant_type, client_id, client_secret } = req.body;

  // Verify client credentials
  const client = await db.oauthClients.findById(client_id);
  if (!client || !crypto.timingSafeEqual(
    Buffer.from(client.secret),
    Buffer.from(client_secret)
  )) {
    return res.status(401).json({ error: "invalid_client" });
  }

  if (grant_type === "client_credentials") {
    const scopes = req.body.scope?.split(" ") ?? [];
    const allowed = scopes.filter(s => client.allowedScopes.includes(s));

    const accessToken = jwt.sign(
      { sub: client_id, scope: allowed.join(" "), type: "client" },
      process.env.JWT_SECRET,
      { expiresIn: 3600 }
    );

    return res.json({
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: 3600,
      scope: allowed.join(" ")
    });
  }

  if (grant_type === "authorization_code") {
    const { code, redirect_uri, code_verifier } = req.body;

    const authCode = await db.authCodes.findByCode(code);
    if (!authCode || authCode.clientId !== client_id) {
      return res.status(400).json({ error: "invalid_grant" });
    }

    // Verify PKCE
    const expectedChallenge = crypto.createHash("sha256")
      .update(code_verifier)
      .digest("base64url");

    if (expectedChallenge !== authCode.codeChallenge) {
      return res.status(400).json({ error: "invalid_grant" });
    }

    await db.authCodes.delete(authCode.id);

    const user = await db.users.findById(authCode.userId);
    const tokens = await tokenService.issueTokenPair(user);

    return res.json({
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      token_type: "Bearer",
      expires_in: 900
    });
  }

  res.status(400).json({ error: "unsupported_grant_type" });
});
```

### Scopes

```javascript
// Scopes define what access is requested
// GitHub examples: "repo", "user:email", "read:org"
// Google examples: "email", "profile", "https://www.googleapis.com/auth/drive.readonly"

// Your API's scopes
const SCOPES = {
  "orders:read":   "Read your orders",
  "orders:write":  "Create and update orders",
  "profile:read":  "Read your profile",
  "profile:write": "Update your profile",
  "admin":         "Full admin access"
};

// Scope enforcement middleware
function requireScope(...scopes) {
  return (req, res, next) => {
    const tokenScopes = req.user?.scope?.split(" ") ?? [];
    const hasAll = scopes.every(s => tokenScopes.includes(s));
    if (!hasAll) {
      return res.status(403).json({
        error: "insufficient_scope",
        required: scopes.join(" ")
      });
    }
    next();
  };
}

// Usage
app.get("/api/orders", authenticate, requireScope("orders:read"), handler);
app.post("/api/orders", authenticate, requireScope("orders:write"), handler);
```

### Token Storage and Security (Client Side)

```javascript
// Auth Code Flow security checklist for SPAs:
// ✓ Use PKCE (prevents auth code interception attacks)
// ✓ Verify `state` parameter on callback (CSRF prevention)
// ✓ Store access token in memory (not localStorage)
// ✓ Store refresh token in HTTP-only cookie
// ✓ Use short access token lifetime (15 minutes)
// ✓ Validate ID token claims (iss, aud, exp, nonce)
// ✗ Never use Implicit grant (deprecated)
// ✗ Never store tokens in localStorage
```

---

## Advanced Concepts

### Token Exchange (RFC 8693)

```javascript
// Service-to-service token exchange
// Service A acts on behalf of user — creates a token for Service B

const response = await axios.post("https://auth.myapp.com/oauth/token", {
  grant_type:         "urn:ietf:params:oauth:grant-type:token-exchange",
  subject_token:      userAccessToken,
  subject_token_type: "urn:ietf:params:oauth:token-type:access_token",
  audience:           "orders-service",
  scope:              "orders:read"
});

// orders-service receives a token with:
// - original user's identity (act claim)
// - limited scope for orders-service only
```

### Dynamic Client Registration (RFC 7591)

```javascript
// Clients register themselves programmatically
app.post("/oauth/register", async (req, res) => {
  const { client_name, redirect_uris, grant_types, scope } = req.body;

  const clientId     = crypto.randomUUID();
  const clientSecret = crypto.randomBytes(32).toString("hex");

  await db.oauthClients.create({
    clientId,
    clientSecret: await bcrypt.hash(clientSecret, 12),
    name: client_name,
    redirectUris: redirect_uris,
    grantTypes: grant_types,
    scope
  });

  res.status(201).json({
    client_id:     clientId,
    client_secret: clientSecret,   // return once, then destroy
    client_name,
    redirect_uris,
    grant_types
  });
});
```

---

## Industry Usage

- **Auth0, Okta, Cognito**: Hosted OAuth2/OIDC authorization servers
- **Keycloak**: Open-source enterprise auth server (self-hosted)
- **Google, GitHub, Apple**: Identity providers for social login
- **Stripe Connect**: OAuth2 for connecting merchants to the platform
- **Slack/Atlassian Apps**: OAuth2 for third-party app integrations

---

## Security

```
SECURITY REQUIREMENTS:
✓ Use PKCE for all auth code flows (required, not optional)
✓ Validate state parameter to prevent CSRF
✓ Validate redirect_uri against whitelist (prevent open redirects)
✓ Use short auth code expiry (10 minutes)
✓ Auth codes are single-use
✓ Verify ID token signature, iss, aud, exp, nonce
✓ Use HTTPS everywhere
✓ Rate limit /oauth/token endpoint

COMMON ATTACKS:
- Auth code interception → prevented by PKCE
- CSRF → prevented by state parameter
- Open redirect → validate redirect_uri against whitelist
- Token leakage → HTTPS, short expiry, HTTP-only cookies
- Clickjacking → X-Frame-Options on consent page
```

---

## Interview Preparation

**Q1: What is the difference between OAuth 2.0 and OpenID Connect?**
A: OAuth 2.0 is an authorization framework — it lets a user grant a third-party app permission to access their resources without sharing credentials. It answers "what can this app do?" OIDC (OpenID Connect) is built on top of OAuth 2.0 and adds authentication — it answers "who is this user?" OIDC adds an ID Token (JWT containing user identity claims) and a standard UserInfo endpoint. When you "Login with Google," you're using OIDC.

**Q2: What is PKCE and why is it required?**
A: PKCE (Proof Key for Code Exchange) prevents authorization code interception attacks. In the traditional auth code flow, if an attacker intercepts the authorization code (via a malicious app or redirect), they can exchange it for tokens. PKCE prevents this: the client generates a random `code_verifier`, hashes it to create a `code_challenge`, sends the challenge at the start, and proves possession of the verifier when exchanging the code. An intercepted code is useless without the original verifier.

**Q3: What is the `state` parameter and why is it important?**
A: The `state` parameter is a random string generated by your app, included in the authorization request, and returned by the auth server in the callback. Your app verifies the returned state matches what it sent. This prevents CSRF attacks — without state validation, an attacker could trick your callback into processing a code they obtained, potentially logging the victim into the attacker's account.

**Q4: When would you use Client Credentials grant type?**
A: Client Credentials is for machine-to-machine communication where no user is involved. Service A authenticates directly to the authorization server using its own client_id and client_secret, gets an access token, and uses it to call Service B. No user delegation, no redirect flow. Common in microservices for background jobs, scheduled tasks, or service APIs not acting on behalf of a user.

**Q5: What is the difference between access tokens and ID tokens in OIDC?**
A: The access token is an authorization artifact — it grants access to protected resources (the API). It may be opaque (a random string) or a JWT. The API uses it to determine what the client is allowed to do. The ID token is an authentication artifact — it's always a JWT and contains claims about the authenticated user (their identity). It's for the client application's consumption to know who the user is. Never send ID tokens to resource servers as access tokens.

---

## Practical Tasks

### Beginner (10 Tasks)
1. Build GitHub OAuth2 login (auth code flow) — exchange code for token, get user info.
2. Implement the `state` parameter for CSRF protection.
3. Add PKCE to your OAuth2 flow.
4. Build Google OAuth2 login and verify the ID token signature.
5. Extract user info from the ID token and create a local user account.
6. Implement token refresh using the OAuth2 refresh token.
7. Implement OAuth2 logout (revoke token + clear session).
8. Link multiple OAuth providers (GitHub + Google) to one user account.
9. Add error handling for all OAuth error responses (`error`, `error_description`).
10. Build a "Connect your GitHub account" flow for an existing logged-in user.

### Intermediate (10 Tasks)
1. Implement a Client Credentials flow for service-to-service auth.
2. Build an OAuth2 scope-enforcement middleware.
3. Cache service tokens to avoid requesting a new one on every API call.
4. Build an OIDC discovery endpoint (`.well-known/openid-configuration`).
5. Implement token introspection endpoint for opaque tokens.
6. Build OAuth2 consent screen (show user what permissions are requested).
7. Implement dynamic client registration (RFC 7591).
8. Add token revocation endpoint (RFC 7009).
9. Implement the Device Authorization Grant for a CLI tool.
10. Write integration tests for the full OAuth2 flow.

### Advanced (10 Tasks)
1. Build a minimal OAuth2 authorization server supporting auth code + client credentials.
2. Implement PKCE validation on the server side in your auth server.
3. Add Token Exchange (RFC 8693) for service impersonation.
4. Integrate with a third-party IdP using federation (SAML → OIDC bridge).
5. Implement fine-grained resource-based scopes with policy enforcement.
6. Add FAPI (Financial-grade API) security profile compliance.
7. Build a multi-tenant OAuth2 server with isolated client registries.
8. Implement Pushed Authorization Requests (PAR) for enhanced security.
9. Add DPoP (Demonstration of Proof of Possession) token binding.
10. Build a security audit tool that tests an OAuth2 server for common vulnerabilities.

---

## Mini Project

**Social Login Hub**: A web app that supports logging in with GitHub, Google, and Apple:
- Authorization code flow with PKCE for all three
- State parameter CSRF protection
- ID token verification
- Account linking (same email from multiple providers → same account)
- Secure token storage (HTTP-only cookies)
- Profile page showing connected providers
- Disconnect provider (while keeping at least one login method)

---

## Self Assessment
1. What is the difference between OAuth 2.0 and OIDC?
2. What are the four OAuth2 grant types? When do you use each?
3. What is PKCE? What attack does it prevent?
4. What is the `state` parameter? What attack does it prevent?
5. What happens during the authorization code exchange?
6. What is an ID token? How does it differ from an access token?
7. What claims should you verify in an ID token?
8. What is a JWKS endpoint? How do you use it to verify tokens?
9. What is Client Credentials grant type used for?
10. What scopes trigger OIDC behavior?
11. Why should auth codes be single-use?
12. Why should redirect_uris be whitelisted?
13. What is token introspection?
14. What is token revocation?
15. What is the `sub` claim and why should you use it as the user identifier (not email)?

---

## Cheat Sheet

### Auth Code + PKCE Flow
```
1. Generate code_verifier (random), code_challenge = B64(SHA256(verifier))
2. Redirect to /authorize?code_challenge=...&state=RANDOM
3. Receive callback with ?code=AUTH_CODE&state=STATE
4. Verify state matches
5. POST /token with code + code_verifier
6. Receive access_token + id_token (+ refresh_token)
7. Verify id_token: signature, iss, aud, exp
```

### Grant Types
```
Authorization Code + PKCE — web apps, mobile, SPA (most cases)
Client Credentials         — service-to-service, no user
Device Code                — TV, CLI, browserless devices
Refresh Token              — renew access without re-auth
```

### Required Security
```
✓ PKCE (code_challenge + code_verifier)
✓ state parameter (CSRF)
✓ HTTPS only
✓ redirect_uri whitelist
✓ Short code expiry (10m), single use
✓ Verify id_token: iss, aud, exp, nonce
```
