# OAuth and "Log in with Google"

> [!GOALS]
> - Explain the problem OAuth 2.0 solves — **delegated access** without sharing passwords — and the roles involved.
> - Distinguish **OAuth** (authorisation: access to resources) from **OpenID Connect** (authentication: who the user is).
> - Follow the **authorisation-code flow with PKCE** step by step, and implement its security checks: `state`, PKCE, exact redirect URIs and ID-token validation.
> - Choose the right flow for each kind of client: web apps, single-page apps, mobile apps, machine-to-machine and devices without keyboards.
> - Understand scopes, consent, access and refresh tokens, and the discovery and JWKS documents providers publish.
> - Implement "Log in with Google" safely, including linking social identities to existing accounts.
> - Recognise the common OAuth mistakes and the deprecated flows to avoid.

## Why this matters

Before OAuth, if a photo-printing website wanted your photos from another service, it asked for your **username and password** for that service. You handed them over, and the printing site could now do **anything** with your account — read your private messages, delete everything, change your password — and you could not take back access without changing your password everywhere it was stored.

**OAuth 2.0** (published as RFC 6749 in 2012) solved this. Instead of passwords, the user approves a request on the service's own site ("Corner Shop Printing wants to read your photos"), and the requesting application receives a **token** with **limited** permissions that the user can revoke at any time. Today OAuth is how:

- you click **"Continue with Google"** (or Apple, Microsoft, Facebook) to sign in to a website without creating a new password;
- a delivery company's system accesses your shop's order API with only the permissions it needs;
- a mobile app talks to its own back end securely;
- companies give employees **single sign-on** to dozens of internal tools.

OAuth is also notoriously easy to get wrong. Its specifications are long, there are several flows, and small mistakes — a missing `state` check, a loosely matched redirect URL, accepting an unverified email — have led to real account-takeover vulnerabilities. This chapter explains the ideas and the one flow you will use most, with its security checks, so that you can integrate OAuth providers and libraries correctly.

## The simple idea

Think of a hotel **valet key**. When you give your car to a valet, you do not give your house keys, your office keys and the car's full key. You give a valet key that only starts the car and opens the driver's door — it cannot open the boot or the glovebox. You can take it back at any time.

OAuth gives applications valet keys. Instead of handing over your master password, you tell the service that holds your data, "Give this application a limited key that can only do these specific things." The application never sees your password, and you can revoke its key whenever you like.

**OpenID Connect**, built on top of OAuth, adds an **identity card**: as well as the valet key, the application receives a signed statement saying who you are — which is what "Log in with Google" actually needs.

> [!ANALOGY]
> OAuth is like a valet key: instead of your master key (password), an application receives a limited key for specific purposes, which you can revoke at any time. OpenID Connect adds a signed identity card stating who you are.
>
> **Where the analogy breaks:** a valet key is physical and hard to copy. An OAuth token is just a string; anyone who intercepts it can use it until it expires. And a valet stands in front of you when receiving the key, whereas in OAuth the key travels through browser redirects across the internet — which is exactly why the flow needs protections such as `state`, PKCE and exact redirect URLs.

## The proper definition and key words

**OAuth 2.0** is an authorisation framework that lets an application obtain **limited access** to a user's resources on another service, with the user's approval, by means of **access tokens** — without the application handling the user's password.

**OpenID Connect** (OIDC) is an identity layer on top of OAuth 2.0 that lets an application **authenticate** a user and obtain basic profile information, through a signed **ID token**.

The roles in OAuth:

- **Resource owner** — the user who owns the data (you).
- **Client** — the application that wants access (the shop, the printing site, the mobile app).
- **Authorisation server** — the service that authenticates the user, asks for consent, and issues tokens (for example, Google's account servers).
- **Resource server** — the API that holds the data and accepts access tokens (for example, Google Photos' API, or your own order API).

Other key words:

- **Scope** — a named permission requested by the client, such as `openid`, `email`, `photos.readonly`, `orders:write`.
- **Consent** — the user's approval of the requested scopes.
- **Authorisation code** — a short-lived, single-use code returned to the client through the browser, exchanged for tokens.
- **Redirect URI** (callback URL) — the client's URL to which the authorisation server sends the user back with the code.
- **PKCE** (Proof Key for Code Exchange, pronounced "pixie") — a mechanism that binds the authorisation code to the client that requested it.
- **Confidential client** — a client that can keep a secret (a server-side web app). **Public client** — one that cannot (a single-page app or mobile app, whose code users can inspect).
- **ID token** — a JWT issued by an OIDC provider, containing claims about the authenticated user ({{ch:jwt}}).

## OAuth versus OpenID Connect

The most common confusion about OAuth is using it for **login** without OpenID Connect.

- **OAuth answers "may this application access this resource?"** An access token says "the bearer may read photos". It is meant for the **resource server**, and the client is not supposed to interpret it — it may even be an opaque string.
- **OpenID Connect answers "who is the user who just logged in?"** The ID token says "this is user `110248...` at Google, email `sara@example.com` (verified), authenticated 30 seconds ago, for client `corner-shop`". It is meant for the **client**.

Before OIDC, some applications "logged users in" by using an access token to fetch a profile — which allowed attacks where a token issued to one application was replayed to another. OIDC's ID token, with its **audience** (`aud`) claim set to your client id and a `nonce`, closes that gap. **For login, use OpenID Connect.**

## How it works inside: the authorisation-code flow with PKCE

This is the flow to use for almost every interactive application today — server-side web apps, single-page apps and mobile apps. Current security guidance (the OAuth 2.0 Security Best Current Practice, RFC 9700, and the consolidating OAuth 2.1 draft) recommends it for all of them.

### Level 2 — The steps

```text
  user's browser             client (shop's server)            authorisation server (e.g. Google)
       │                            │                                    │
  1. clicks "Continue with Google"  │                                    │
       │──────────────────────────▶ │                                    │
       │                            │ creates: state, PKCE verifier,     │
       │                            │ nonce; stores them in the session  │
  2. ◀── redirect to authorisation URL with client_id, redirect_uri,    │
       │    scope, state, code_challenge, nonce                         │
       │────────────────────────────────────────────────────────────────▶│
       │                                          3. user logs in at Google
       │                                             and approves the scopes
  4. ◀── redirect to redirect_uri?code=...&state=... ───────────────────│
       │──────────────────────────▶ │                                    │
       │                            │ 5. checks state matches the session│
       │                            │ 6. POST /token: code, redirect_uri,│
       │                            │    code_verifier (+ client secret) │
       │                            │──────────────────────────────────▶ │
       │                            │ ◀── access token, ID token,        │
       │                            │     (refresh token)                │
       │                            │ 7. validates the ID token (signature,
       │                            │    iss, aud, exp, nonce)           │
       │                            │ 8. finds or creates the local user,│
       │                            │    starts a session                │
  9. ◀── logged in (session cookie) │                                    │
```

The key ideas:

- The user enters their password **only on the authorisation server's site** — the client never sees it.
- The **code** travels through the browser (front channel), where it could be seen by browser history, extensions or logs. So it is short-lived, single-use, and useless on its own: exchanging it for tokens requires the **PKCE verifier** (and, for confidential clients, the client secret), which travels over a direct server-to-server request (back channel).
- **Tokens** are delivered directly to the client in step 6, never through the browser's address bar.

### Level 3 — `state`: protecting against forged callbacks

In step 2 the client generates a random **`state`** value, stores it in the user's session, and includes it in the authorisation URL; in step 5 it checks that the `state` returned with the code matches. Without this, an attacker could make a victim's browser complete a login flow with **the attacker's** authorisation code — logging the victim into the **attacker's** account (login CSRF). The victim might then save their address or card details into an account the attacker controls.

### Level 3 — PKCE: binding the code to the client

PKCE (RFC 7636) protects the code from being stolen and used by someone else:

1. Before redirecting, the client creates a random **code verifier** (43–128 characters) and computes the **code challenge**: `BASE64URL(SHA256(verifier))`.
2. The **challenge** goes in the authorisation URL; the **verifier** stays secret with the client.
3. When exchanging the code, the client sends the **verifier**. The authorisation server hashes it and checks it matches the challenge it saw earlier.

An attacker who intercepts the code (for example, on a mobile device where another app registered the same custom URL scheme) cannot exchange it, because they do not have the verifier. PKCE was designed for public clients but is now recommended for **all** clients.

### Level 3 — Building the authorisation request

```ts
import { randomBytes, createHash } from "node:crypto";

function base64url(bytes: Buffer): string {
  return bytes.toString("base64url");
}

function createPkce(verifierBytes: Buffer) {
  const verifier = base64url(verifierBytes);                                  // 32 bytes → 43 characters
  const challenge = base64url(createHash("sha256").update(verifier).digest());
  return { verifier, challenge };
}

function buildAuthorizationUrl(opts: { state: string; nonce: string; challenge: string }): string {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({
    response_type: "code",
    client_id: "corner-shop.apps.googleusercontent.com",
    redirect_uri: "https://cornershop.example/auth/google/callback",
    scope: "openid email profile",
    state: opts.state,
    nonce: opts.nonce,
    code_challenge: opts.challenge,
    code_challenge_method: "S256",
  }).toString();
  return url.toString();
}

// Fixed bytes so the example output is reproducible; real code uses randomBytes(32)
const pkce = createPkce(Buffer.alloc(32, 7));
const state = base64url(Buffer.alloc(16, 1));
const nonce = base64url(Buffer.alloc(16, 2));

console.log(pkce.verifier.length, pkce.challenge.length);
console.log(buildAuthorizationUrl({ state, nonce, challenge: pkce.challenge }));

const realVerifier = createPkce(randomBytes(32)).verifier;
console.log(`a real verifier is ${realVerifier.length} unpredictable characters`);
```

**Output:**

```text
43 43
https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=corner-shop.apps.googleusercontent.com&redirect_uri=https%3A%2F%2Fcornershop.example%2Fauth%2Fgoogle%2Fcallback&scope=openid+email+profile&state=AQEBAQEBAQEBAQEBAQEBAQ&nonce=AgICAgICAgICAgICAgICAg&code_challenge=3Ev4DHdHPRMPoN6GukAY_pi7IUAF5qWJHRK6kURvnoE&code_challenge_method=S256
a real verifier is 43 unpredictable characters
```

Walk through it:

- **The verifier** is 32 random bytes encoded as base64url (43 characters); **the challenge** is the base64url-encoded SHA-256 hash of the verifier — also 43 characters. `code_challenge_method=S256` tells the server which transformation was used.
- **`response_type=code`** asks for an authorisation code.
- **`client_id`** identifies your application, registered in advance with the provider (along with its allowed redirect URIs).
- **`redirect_uri`** must exactly match a registered value. `URLSearchParams` encodes it correctly (`:` becomes `%3A`, `/` becomes `%2F`).
- **`scope=openid email profile`** — `openid` makes this an OpenID Connect request, returning an ID token; `email` and `profile` request those claims. Request only what you need: users trust applications that ask for less.
- **`state`** and **`nonce`** are random values the client stores in the user's session (for `state`, to check the callback; for `nonce`, to check the ID token).
- The example uses fixed bytes so its output is the same every time it runs; real code always uses `randomBytes`.

In a real application, you rarely build this by hand. Providers document their endpoints in a **discovery document** (below), and libraries — such as `openid-client` for Node, Auth.js or Better Auth in the Next.js world, or Passport strategies for Express — perform every step and check. Knowing what each parameter does is what lets you configure them correctly and debug them.

### Level 4 — The callback and token exchange

When the user returns to `/auth/google/callback?code=...&state=...`, the server:

```ts
// fragment
app.get("/auth/google/callback", async (req, res) => {
  const { code, state, error } = req.query as Record<string, string | undefined>;
  const pending = req.session.oauth;                         // { state, nonce, verifier }, stored before redirecting

  if (error) return res.redirect("/login?error=" + encodeURIComponent(error)); // e.g. user pressed "Cancel"
  if (!pending || !code || state !== pending.state) return res.status(400).send("Invalid login attempt");
  delete req.session.oauth;                                  // single use

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: "https://cornershop.example/auth/google/callback",
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,      // confidential client (server-side)
      code_verifier: pending.verifier,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!tokenResponse.ok) return res.status(502).send("Could not complete login");

  const tokens = (await tokenResponse.json()) as { id_token: string; access_token: string };
  const claims = await verifyIdToken(tokens.id_token, pending.nonce);  // see below
  const user = await findOrCreateUserFromGoogle(claims);
  await req.session.regenerate();                            // fresh session after login ({{ch:sessions}})
  req.session.userId = user.id;
  res.redirect("/account");
});
```

- The **`state` check** comes first; the pending values are deleted so they cannot be reused.
- The **user may decline**: the provider then returns an `error` (such as `access_denied`) instead of a code — handle it gracefully.
- The **token request** goes directly from your server to the provider over HTTPS, with the code, the **same** redirect URI, the client credentials and the PKCE verifier. The client secret lives only on the server ({{ch:secrets-manager}}).
- The response contains an **ID token** (and an access token, and possibly a refresh token if requested).
- After validating the ID token and finding the local user, a **fresh session** is created ({{ch:sessions}}). In most "Log in with Google" integrations, the provider's tokens are not needed afterwards; your own session takes over.

### Level 4 — Validating the ID token

The ID token is a JWT signed by the provider. Validate it exactly as {{ch:jwt}} describes:

```ts
// fragment
import { createRemoteJWKSet, jwtVerify } from "jose";

const googleKeys = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

async function verifyIdToken(idToken: string, expectedNonce: string) {
  const { payload } = await jwtVerify(idToken, googleKeys, {
    issuer: ["https://accounts.google.com", "accounts.google.com"],
    audience: process.env.GOOGLE_CLIENT_ID!,
  });
  if (payload.nonce !== expectedNonce) throw new Error("nonce mismatch");
  return payload as { sub: string; email?: string; email_verified?: boolean; name?: string };
}
```

- **Signature** checked against the provider's published keys (its JWKS).
- **`iss`** — the token came from Google.
- **`aud`** — the token was issued for **your** client id, not another application's.
- **`exp`** — still valid.
- **`nonce`** — matches the value you generated for **this** login, proving the token was issued in response to your request (not replayed from elsewhere).

### Level 4 — Identifying the user correctly

The ID token's **`sub`** claim is the provider's **stable, unique identifier** for the user. Store users' external identities as **(provider, sub)** pairs:

```text
  user_identities
  ┌──────────┬──────────┬──────────────────────┬──────────────┐
  │ user_id  │ provider │ provider_subject     │ email_at_link│
  ├──────────┼──────────┼──────────────────────┼──────────────┤
  │ usr_41   │ google   │ 110248495921238986420│ sara@...     │
  │ usr_41   │ apple    │ 001234.abcd...       │ (hidden)     │
  └──────────┴──────────┴──────────────────────┴──────────────┘
```

**Never identify users by email alone.** Emails can change, can be reused by a new person after an account is deleted, and — crucially — some providers allow unverified emails. If your code logs someone in as "whoever has the email `sara@example.com`" based on a provider's claim that was **not verified**, an attacker could create an account at that provider with Sara's address and take over her account at your shop.

**Account linking** — connecting a Google identity to an existing password account with the same email — should happen only when the provider asserts the email is **verified** (`email_verified: true`) **and**, ideally, after the user proves they own the existing account (by logging in with the password, or confirming through an email link). Automatic linking on unverified emails is a classic account-takeover hole.

## The other flows

### Level 3 — Choosing a flow

| Client | Flow | Notes |
|---|---|---|
| Server-side web app | Authorisation code + PKCE, with client secret | The standard case |
| Single-page app (browser JavaScript) | Authorisation code + PKCE (public client), ideally behind a backend-for-frontend | No client secret possible in browser code; prefer keeping tokens on a server ({{ch:frontend-authentication}}) |
| Mobile or desktop app | Authorisation code + PKCE (public client), using the system browser | Not embedded web views, which can capture passwords |
| Machine-to-machine (no user) | **Client credentials** | A service authenticates as itself to get a token |
| TV, console, command-line tool (no easy keyboard) | **Device authorisation grant** | Shows a code; the user approves on their phone |

### Level 3 — Client credentials

When **no user** is involved — a nightly job in the delivery company's system calling your shipments API — the client authenticates **as itself**:

```text
POST /oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials&client_id=courier-co&client_secret=...&scope=shipments:read shipments:write
```

The response is an access token for that client, with the requested (and allowed) scopes. The resource server checks the token's scopes and the client's identity on every call ({{ch:rest-apis}}). Stronger client authentication — signed JWT assertions or mutual TLS instead of shared secrets — is common for sensitive integrations.

### Level 3 — Device authorisation

A smart TV cannot easily show a login page. With the **device authorisation grant** (RFC 8628), the device displays a short code and a URL ("Go to example.com/activate and enter WDJB-MJHT"); the user approves on their phone or computer; meanwhile, the device polls the token endpoint until approval arrives.

### Level 3 — Flows to avoid

- **Implicit flow** — returned access tokens directly in the URL fragment of the redirect. Tokens leaked through browser history and referrers, and there was no PKCE-style binding. It is **deprecated**; single-page apps use the code flow with PKCE instead.
- **Resource owner password credentials** — the client collects the user's password and sends it to the token endpoint. This defeats the purpose of OAuth (the client sees the password) and prevents MFA and phishing protection at the provider. It is **deprecated** too.

You will still see both in old tutorials and legacy systems.

## Tokens, scopes and consent

### Level 3 — Scopes

Scopes express **what** the client may do: `orders:read`, `orders:write`, `profile`. When you build your own authorisation server or API:

- Design scopes around meaningful capabilities, not around every endpoint.
- The resource server must **check scopes** on every request — a token with `orders:read` must not be able to cancel orders.
- Scopes limit the **client**; they do not replace per-user authorisation. A token with `orders:read` for Sara still only reads **Sara's** orders.

### Level 3 — Refresh tokens and offline access

Access tokens are short-lived ({{ch:jwt}}). If your application needs to call the provider's API later without the user present (for example, syncing a calendar overnight), it requests a **refresh token** (often with a scope such as `offline_access`, or a provider-specific parameter). Refresh tokens are powerful long-lived credentials: store them encrypted on the server, rotate them when the provider does, and delete them when the user disconnects your application.

### Level 3 — Discovery

OpenID Connect providers publish a **discovery document** at a well-known URL:

```text
https://accounts.google.com/.well-known/openid-configuration
```

It lists the authorisation endpoint, token endpoint, JWKS URL, supported scopes, response types and signing algorithms. Libraries read it automatically, so you configure only the issuer URL, client id, client secret and redirect URI — and endpoints or keys can change without breaking you.

## Building your own authorisation server?

For "Log in with Google", you are a **client** — the provider runs the authorisation server. If you need to issue OAuth tokens **yourself** — for a partner API, or for your own mobile apps and services — do not write an authorisation server from scratch. Use:

- a **hosted identity provider** (Auth0, Okta, Amazon Cognito, Microsoft Entra ID, Google Identity Platform, and others), or
- a **mature open-source server** (for example, Keycloak, or certified OpenID Connect libraries for your language).

The specifications contain many security details — code replay, redirect validation, token binding, client authentication methods — that these products have already implemented and had reviewed.

## From beginner to enterprise

**Level 3 — first social login.** An OIDC library; authorisation code + PKCE; `state` and `nonce` checked; identities stored by `(provider, sub)`; a local session after login.

**Level 4 — real applications.** Several providers; safe account linking only with verified emails and user confirmation; minimal scopes; refresh tokens stored encrypted when needed; handling of declined consent and provider errors.

**Level 5 — professional practice.** Your own APIs secured with OAuth access tokens and scopes; partner access through client credentials; a backend-for-frontend for browser apps; key rotation through JWKS; monitoring of login failures by provider.

**Level 6 — enterprises.** Single sign-on for employees through an identity provider (OIDC or the older SAML standard); centralised access policies and automatic provisioning and deprovisioning of accounts (SCIM); fine-grained authorisation services; token exchange between organisations; high-assurance flows such as pushed authorisation requests (PAR) and sender-constrained tokens (DPoP or mutual TLS) in regulated industries like open banking.

## Real-world use cases

### Adding "Continue with Google" to a shop

- **Design**: OIDC authorisation code + PKCE with a library; scopes `openid email profile`; on callback, verify the ID token, look up `(google, sub)`; if new, create an account — or, if a password account with the same **verified** email exists, ask the user to log in to it once to confirm linking.
- **Benefits**: fewer passwords to manage; faster sign-up; Google's protections (MFA, suspicious-login detection) cover the login.
- **Considerations**: users who lose access to their Google account need another way in (add email login or a recovery method); provider outages affect login.

### A partner API for couriers

- **Design**: your authorisation server (hosted identity provider) issues client-credentials tokens with scopes `shipments:read` and `shipments:write`; your API verifies tokens (signature, issuer, audience, expiry, scopes) and checks that each courier only accesses its own shipments.
- **Benefits**: credentials per partner, revocable individually; no shared API keys in emails; audit trail per client.

## Common mistakes

### Beginner: using OAuth access tokens as proof of identity

**Fix:** use OpenID Connect ID tokens, validated, with `aud` and `nonce`.

### Beginner: no `state` check

**Consequence:** login CSRF. **Fix:** random `state` stored in the session and compared on callback.

### Beginner: identifying users by email

**Consequence:** account takeover via unverified or reused emails. **Fix:** `(provider, sub)`; link only with verified emails and user confirmation.

### Intermediate: skipping PKCE

**Fix:** PKCE (S256) for all clients.

### Intermediate: loose redirect URI matching

Allowing any URL starting with your domain, or wildcard subdomains. **Consequence:** an attacker redirects the code to a page they control. **Fix:** exact, pre-registered redirect URIs.

### Intermediate: client secrets in front-end code

**Fix:** public clients have no secret; use PKCE, or a backend-for-frontend.

### Production: requesting broad scopes "just in case"

**Consequence:** users refuse consent; larger damage if tokens leak. **Fix:** minimal scopes, requested incrementally when needed.

### Production: using deprecated flows

Implicit or password grants. **Fix:** authorisation code + PKCE; client credentials for machines.

## Debugging and troubleshooting

- **`redirect_uri_mismatch`**: the redirect URI in the request differs from the registered one — even a trailing slash, `http` versus `https`, or a different port counts. Register the exact value for each environment.
- **`invalid_grant` at token exchange**: the code expired (they last seconds to minutes), was already used, the PKCE verifier does not match the challenge, or the redirect URI differs from the one in the authorisation request.
- **"State mismatch" errors**: the session was lost between redirect and callback — often a session cookie with `SameSite=Strict` (the callback is a cross-site navigation from the provider, so `Lax` is needed), a different domain for the callback, or multiple tabs starting logins at once.
- **ID token validation fails**: wrong `aud` (client id), clock skew, stale cached keys after rotation, or the wrong issuer string.
- **Users get duplicate accounts**: identity matched by email instead of `sub`, or the same person using two providers without linking.

## Security summary

- Use the **authorisation-code flow with PKCE** for interactive clients; client credentials for machines; never the implicit or password flows.
- Check **`state`**; validate **ID tokens** (signature, `iss`, `aud`, `exp`, `nonce`).
- Register and match **redirect URIs exactly**.
- Keep **client secrets** on servers only; prefer stronger client authentication for sensitive integrations.
- Identify users by **(provider, `sub`)**; link accounts only with **verified** emails and confirmation.
- Request **minimal scopes**; check scopes at the resource server; combine with per-user authorisation.
- Store provider refresh tokens **encrypted**; delete them when users disconnect.
- Start a **fresh local session** after login ({{ch:sessions}}).

## How a senior engineer thinks about this

- **OAuth delegates access; OIDC proves identity.** They choose deliberately and never mix the two up.
- **Every redirect is an attack surface.** `state`, PKCE, `nonce` and exact redirect URIs each close a specific attack; none is optional.
- **Libraries and providers over hand-rolled protocols.** Their job is configuration, correct identity mapping and authorisation — not reimplementing the specifications.
- **Least privilege**: minimal scopes, short token lifetimes, revocable credentials per client.
- **Plan for the human side**: lost provider accounts, account linking, disconnecting applications, and clear consent screens.

## Exercises

### Exercise 1 — Name the roles and the flow

**Objective:** practise mapping situations onto OAuth.
**What to do:** for each situation, name the client, resource owner, authorisation server and resource server, and the flow: (1) a customer clicks "Continue with Apple" on your shop; (2) your nightly job calls a courier's API to fetch delivery statuses; (3) your mobile app logs users in to your own back end; (4) a smart-TV app for your video courses.

<details>
<summary>Show the solution</summary>

1. Client: your shop; resource owner: the customer; authorisation server: Apple; resource server: (for login, essentially none — you need the **ID token**). Flow: OIDC authorisation code + PKCE.
2. Client: your job; resource owner: none (machine-to-machine); authorisation server: the courier's token service; resource server: the courier's API. Flow: client credentials.
3. Client: your mobile app (public client); resource owner: the user; authorisation server: your identity provider; resource server: your API. Flow: authorisation code + PKCE via the system browser, with rotating refresh tokens stored in secure storage.
4. Client: the TV app; resource owner: the learner; authorisation server: your identity provider; resource server: your course API. Flow: device authorisation grant.

</details>

### Exercise 2 — Generate and check PKCE

**Objective:** practise the PKCE mechanism.
**What to build:** functions `createVerifier()` (random, base64url), `challengeFor(verifier)`, and `serverCheck(verifier, storedChallenge)` that simulates the authorisation server's check. Show that the right verifier passes and a different one fails.

<details>
<summary>Show the solution</summary>

```ts
import { randomBytes, createHash, timingSafeEqual } from "node:crypto";

const createVerifier = () => randomBytes(32).toString("base64url");
const challengeFor = (verifier: string) => createHash("sha256").update(verifier).digest("base64url");

function serverCheck(verifier: string, storedChallenge: string): boolean {
  const computed = Buffer.from(challengeFor(verifier));
  const stored = Buffer.from(storedChallenge);
  return computed.length === stored.length && timingSafeEqual(computed, stored);
}

const verifier = createVerifier();
const challenge = challengeFor(verifier);       // sent in the authorisation request
console.log("legitimate client:", serverCheck(verifier, challenge));
console.log("attacker with the code but not the verifier:", serverCheck(createVerifier(), challenge));
console.log("verifier and challenge lengths:", verifier.length, challenge.length);
```

**Output:**

```text
legitimate client: true
attacker with the code but not the verifier: false
verifier and challenge lengths: 43 43
```

**Walkthrough:** the challenge is a one-way hash, so seeing it in the authorisation URL does not reveal the verifier. Only the client that created the verifier can complete the exchange — which is why a stolen authorisation code is useless with PKCE.

</details>

### Exercise 3 — Find the vulnerabilities

**Objective:** practise reviewing an OAuth integration.
**The scenario:** a shop's Google login callback does this: it reads `code` from the URL (no `state`), exchanges it (no PKCE), **decodes** the ID token without verifying it, finds a local user `WHERE email = claims.email`, creates one if none exists, and sets `session.userId` without regenerating the session. Its registered redirect URI pattern is `https://*.cornershop.example/*`. List each vulnerability and its fix.

<details>
<summary>Show the solution</summary>

1. **No `state`** → login CSRF (victim logged into the attacker's account). Fix: random `state` in the session, checked on callback.
2. **No PKCE** → intercepted codes can be exchanged. Fix: S256 PKCE.
3. **ID token decoded, not verified** → anyone can forge identity claims. Fix: verify signature with the provider's JWKS, plus `iss`, `aud`, `exp` and `nonce`.
4. **Users matched by email** → account takeover if the email is unverified or reassigned. Fix: match on `(google, sub)`; link to existing accounts only when `email_verified` is true and the user confirms.
5. **No session regeneration** → session fixation. Fix: new session id after login.
6. **Wildcard redirect URI** → any subdomain (including a forgotten or compromised one) can receive codes. Fix: exact, registered redirect URIs.

</details>

### Exercise 4 — Production scenario: offering social login and a partner API

**Objective:** plan an OAuth rollout.
**The scenario:** your shop wants "Continue with Google" and "Continue with Apple" for customers, and a partner API for two courier companies. Describe the plan.

<details>
<summary>Show the solution</summary>

**Social login**
1. Use a maintained OIDC library or an identity provider that supports Google and Apple.
2. Authorisation code + PKCE, `state` and `nonce`, scopes `openid email profile` (Apple: `name email`, noting Apple may give a private relay email and sends the name only on first login — store it then).
3. Identities stored as `(provider, sub)`; account linking only with verified emails plus user confirmation; settings page to view and disconnect linked providers.
4. Fresh session after login; same session security as password logins ({{ch:sessions}}).
5. Fallback login method for users who lose access to their provider account.

**Partner API**
6. A hosted authorisation server (or the same identity provider) issuing client-credentials tokens per courier, with scopes `shipments:read` and `shipments:write`.
7. API verifies tokens (signature via JWKS, `iss`, `aud`, `exp`, scopes) and restricts each courier to its own shipments.
8. Short token lifetimes; credential rotation and instant revocation per partner; rate limits per client ({{ch:rate-limiting}}).
9. Documentation, a sandbox, and webhooks signed for status updates ({{ch:api-documentation}}).

**Operations**
10. Redirect URIs registered exactly per environment; client secrets in a secrets manager; monitoring of login errors by provider and token failures by partner; a runbook for provider outages.

</details>

## Summary

**OAuth 2.0** lets an application obtain **limited, revocable access** to a user's resources without handling the user's password. The **resource owner** approves requested **scopes** at the **authorisation server**, which issues tokens to the **client** for use at the **resource server**. **OpenID Connect** adds authentication through a signed **ID token**; for login, use OIDC rather than treating access tokens as identity.

The **authorisation-code flow with PKCE** is the standard for interactive clients: the client redirects with `client_id`, an exact `redirect_uri`, scopes, a random **`state`**, a **`nonce`** and a PKCE **code challenge**; the user authenticates and consents at the provider; the provider redirects back with a short-lived **code**; the client checks `state`, exchanges the code server-to-server with the **code verifier** (and client secret, if confidential), and **validates the ID token** — signature, issuer, audience, expiry and nonce. Identify users by **(provider, `sub`)**, link accounts only with verified emails and confirmation, and start a fresh local session.

Use **client credentials** for machine-to-machine access and the **device authorisation grant** for devices without keyboards; avoid the deprecated implicit and password flows. Request minimal scopes, enforce them at the resource server alongside per-user authorisation, store provider refresh tokens encrypted, rely on **discovery documents** and JWKS, and use mature libraries and identity providers rather than writing authorisation servers yourself.

## Key terms

- **OAuth 2.0** — An authorisation framework that lets applications obtain limited access to user resources through tokens instead of passwords.
- **OpenID Connect (OIDC)** — An identity layer on OAuth 2.0 that authenticates users and provides an ID token.
- **Delegated access** — Permission granted by a user to an application to act on their resources within limits.
- **Resource owner** — The user who owns the data an application wants to access.
- **Client (OAuth)** — The application requesting access on the user's behalf.
- **Authorisation server** — The service that authenticates users, obtains consent and issues tokens.
- **Resource server** — The API that holds protected resources and accepts access tokens.
- **Scope** — A named permission requested by a client and granted by the user.
- **Consent** — The user's approval of the scopes an application requests.
- **Authorisation code** — A short-lived, single-use code returned through the browser and exchanged for tokens.
- **Redirect URI** — The registered client URL to which the authorisation server returns the user.
- **PKCE** — Proof Key for Code Exchange: binding an authorisation code to the client by a secret verifier and its hashed challenge.
- **Code verifier / code challenge** — The secret random string kept by the client, and its SHA-256 hash sent in the authorisation request.
- **State parameter** — A random value that ties an authorisation response to the request that started it, preventing login CSRF.
- **Nonce (OIDC)** — A random value included in the request and the ID token to prevent token replay.
- **ID token** — A signed JWT from an OIDC provider containing claims about the authenticated user.
- **sub claim** — The provider's stable, unique identifier for a user.
- **Confidential client** — A client able to keep a secret, such as a server-side web application.
- **Public client** — A client unable to keep a secret, such as a single-page or mobile application.
- **Client credentials grant** — An OAuth flow in which a client obtains a token for itself, without a user.
- **Device authorisation grant** — An OAuth flow for devices with limited input, where the user approves on another device.
- **Implicit flow** — A deprecated OAuth flow that returned tokens directly in the redirect URL.
- **Discovery document** — A published JSON document describing an OIDC provider's endpoints, keys and capabilities.
- **Account linking** — Connecting an external identity to an existing local account.
- **Login CSRF** — An attack that logs a victim into an account controlled by the attacker.
- **Single sign-on (SSO)** — Logging in once with an identity provider to access many applications.

## What comes next

With users identified and authorised, applications start accepting more than form fields. The next chapter, {{ch:file-uploads}}, covers receiving files safely and efficiently: multipart requests, streaming large uploads, validating file types by content, storing files in object storage with presigned URLs, processing images in the background, and the security risks unique to user-supplied files.
