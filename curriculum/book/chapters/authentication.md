# Authentication: Proving Who You Are

> [!GOALS]
> - Explain the server's role in authentication, and the three kinds of proof: something you know, have or are.
> - Store passwords safely with slow, salted **password hashing** (Argon2id, scrypt, bcrypt), and know why fast hashes and encryption are wrong for passwords.
> - Build sign-up, login, logout, email verification and password reset flows on the server, securely.
> - Defend against online attacks: brute force, credential stuffing, account enumeration and timing attacks.
> - Implement time-based one-time passwords (**TOTP**) for multi-factor authentication, and understand passkeys.
> - Generate, store and compare secrets and tokens correctly with cryptographically secure randomness and constant-time comparison.
> - Understand how authentication connects to sessions, tokens and OAuth, covered in the next chapters.

## Why this matters

Every account system is a target. Attackers collect billions of email-and-password pairs leaked from other websites and try them automatically against yours. They try common passwords against every account. When they break into a database, they try to recover the passwords inside it — because people reuse passwords, a password stolen from a small shop can open someone's email or bank account.

The consequences of weak authentication are severe and public: customer accounts taken over, orders placed with stolen payment details, personal data exposed, regulatory fines, and lost trust. Many famous data breaches made headlines precisely because passwords were stored badly — in plain text, or with fast hashes that attackers could reverse at enormous speed.

In {{ch:frontend-authentication}} you learned the browser's side: login forms, where credentials live, and protecting pages. This chapter is the **server's** side: how to store passwords, verify them, resist attacks, add a second factor, and handle the secrets and tokens that make sign-up, verification and password reset work. Sessions ({{ch:sessions}}), JSON Web Tokens ({{ch:jwt}}) and OAuth ({{ch:oauth}}) build on the foundations here.

> [!WARNING]
> Authentication is one of the areas where you should **not invent your own cryptography or protocols**. Use well-established algorithms and well-maintained libraries, follow current guidance (such as the OWASP Cheat Sheet Series and NIST's digital identity guidelines), and have security-sensitive code reviewed. This chapter teaches how the pieces work so you can use them correctly — not so you can write your own replacements.

## The simple idea

Think of entering a high-security office building. To get in, you prove who you are. You might **know** something (a PIN), **have** something (an access card), or **be** something (your fingerprint). Strong security asks for two of these: losing your card alone does not let a stranger in.

The building also never keeps a copy of your PIN written on a list in reception — if the list were stolen, every PIN would be exposed. Instead, it can only **check** whether the PIN you enter is right.

Server authentication works the same way: it verifies proofs of identity, prefers more than one kind of proof for important accounts, and stores passwords in a form that lets it **check** them but never **read** them back.

> [!ANALOGY]
> Authentication is like the entrance of a secure building: you prove identity with something you know, have or are, and the building can check your PIN without keeping a readable list of everyone's PINs.
>
> **Where the analogy breaks:** a building's guard sees each visitor. A web server sees only data arriving over a network — and an attacker can send millions of attempts per hour from thousands of computers, never tiring. Every protection must work automatically, at that scale, against an opponent who can try endlessly.

## The proper definition and key words

**Authentication** is the process of verifying that a user, device or system is who or what it claims to be. On a server, it means checking a submitted proof — a password, a code, a signed challenge — against what the server knows, and then establishing that the following requests come from the same, now-identified user ({{ch:sessions}}).

The key words:

- **Authentication factor** — a kind of proof: **knowledge** (password, PIN), **possession** (phone, security key), **inherence** (fingerprint, face).
- **Multi-factor authentication (MFA)** — requiring factors of at least two different kinds.
- **Hash function** — a function that turns any input into a fixed-size output (a digest), which cannot feasibly be reversed ({{ch:git}}).
- **Password hashing function** — a hash function designed to be **deliberately slow** and memory-hungry, so that guessing passwords is expensive: Argon2id, scrypt, bcrypt, PBKDF2.
- **Salt** — a random value stored with each password hash, making identical passwords produce different hashes.
- **Pepper** — an optional secret value, stored outside the database, mixed into password hashing.
- **Brute-force attack** — trying many passwords against one account.
- **Credential stuffing** — trying email-and-password pairs leaked from other sites.
- **Password spraying** — trying a few common passwords against many accounts.
- **Cryptographically secure random number generator (CSPRNG)** — a source of randomness suitable for secrets, which attackers cannot predict.
- **Constant-time comparison** — comparing secret values in a way whose duration does not depend on how many characters match.

## How it works inside: what the server stores

### Level 2 — Never store passwords

There are three ways to store something that lets you check passwords, and only one is acceptable:

```text
  Plain text:      sara@example.com | correct horse battery staple
                   → a database leak exposes every password immediately

  Encrypted:       sara@example.com | 8f3a…(AES ciphertext)
                   → whoever gets the key (often stored nearby) decrypts everything;
                     encryption is designed to be REVERSIBLE

  Password hash:   sara@example.com | $scrypt$N=16384,r=8,p=1$<salt>$<hash>
                   → cannot be reversed; the server can only CHECK a guess
                     by hashing it the same way and comparing
```

At login, the server hashes the submitted password with the **same salt and parameters** stored with the user's record, and compares the result with the stored hash. If they match, the password is correct. The server never needs — and never has — the original password.

### Level 2 — Why ordinary hashes are not enough

Fast hash functions such as SHA-256 are designed to be **fast** — modern hardware computes billions of them per second. That is excellent for checking file integrity, and terrible for passwords: an attacker with a stolen database can try billions of guesses per second, and most human-chosen passwords fall quickly.

Two defences fix this:

1. **Salt.** Without salt, identical passwords produce identical hashes, so an attacker cracks one and gets them all, and can use giant precomputed tables of hashes for common passwords ("rainbow tables"). A unique random salt per user means every hash must be attacked separately, and precomputed tables are useless.
2. **Slowness and memory.** Password hashing functions are tuned to take a noticeable time (for example, tens to hundreds of milliseconds) and, for modern ones, a significant amount of memory **per guess**. One login check is still quick for the server; billions of guesses become very expensive for an attacker. Memory-hardness specifically defeats attackers using specialised hardware (GPUs and custom chips) that is fast but has little memory per core.

| Algorithm | Notes |
|---|---|
| **Argon2id** | Winner of the Password Hashing Competition (2015); memory-hard; the first choice in current OWASP guidance |
| **scrypt** | Memory-hard; built into Node's `node:crypto` |
| **bcrypt** | Older, widely used, still acceptable with a sufficient cost; limits passwords to 72 bytes |
| **PBKDF2** | Not memory-hard; acceptable with very high iteration counts where required by standards |
| SHA-256, MD5 (alone) | **Never** for passwords |

### Level 3 — Hashing and verifying with scrypt

Node's built-in `crypto` module provides scrypt, so this example needs no extra packages. In production, many teams use the `argon2` package for Argon2id; the structure is the same.

```ts
import { scrypt, randomBytes, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt) as (password: string, salt: Buffer, keylen: number, options: object) => Promise<Buffer>;

const PARAMS = { N: 2 ** 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }; // cost, block size, parallelism
const KEY_LENGTH = 32;

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password.normalize("NFC"), salt, KEY_LENGTH, PARAMS);
  return `scrypt$${PARAMS.N}$${PARAMS.r}$${PARAMS.p}$${salt.toString("base64")}$${hash.toString("base64")}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algorithm, n, r, p, saltB64, hashB64] = stored.split("$");
  if (algorithm !== "scrypt" || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, "base64");
  const actual = await scryptAsync(password.normalize("NFC"), Buffer.from(saltB64, "base64"), expected.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
    maxmem: PARAMS.maxmem,
  });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

const storedA = await hashPassword("correct horse battery staple");
const storedB = await hashPassword("correct horse battery staple");

console.log(storedA.split("$").slice(0, 4).join("$"));          // algorithm and parameters
console.log("same password, different hashes:", storedA !== storedB);
console.log("right password:", await verifyPassword("correct horse battery staple", storedA));
console.log("wrong password:", await verifyPassword("correct horse battery stapler", storedA));
```

**Output:**

```text
scrypt$32768$8$1
same password, different hashes: true
right password: true
wrong password: false
```

Walk through it:

- **`randomBytes(16)`** produces a 16-byte salt from a cryptographically secure random generator. A new salt for every password.
- **scrypt** turns the password and salt into a 32-byte key. `N` is the cost (CPU and memory grow with it); `r` and `p` tune memory and parallelism. `maxmem` allows the memory scrypt needs at this cost. Choose parameters so one hash takes a noticeable fraction of a second on your servers, and raise them as hardware gets faster.
- **The stored string contains everything needed to verify**: the algorithm, the parameters, the salt and the hash, separated by `$`. Storing the parameters with each hash means you can **increase the cost later** without breaking existing users (see "rehashing" below).
- Hashing the same password twice gives **different** strings, because the salts differ.
- **`verifyPassword`** reads the salt and parameters back, recomputes the hash for the submitted password, and compares with **`timingSafeEqual`**, which takes the same time however many bytes match (explained below).
- **`normalize("NFC")`** makes visually identical passwords typed on different devices produce the same bytes ({{ch:validation}}).
- Hashing runs on libuv's thread pool through the asynchronous API, so it does not block the event loop ({{ch:nodejs}}). Never use the synchronous versions in a server.

### Level 4 — Rehashing and pepper

- **Rehash on login.** When a user logs in successfully, check whether their stored hash uses old parameters (or an older algorithm, such as plain bcrypt from a previous system). If so, hash the password — which you have, briefly, in memory — with the current settings, and update the record. Over time, all active users move to stronger hashing without anyone being asked to reset their password.
- **Pepper.** Some systems also mix in a secret **pepper** (or encrypt hashes with a key) that is stored outside the database — in a secrets manager or hardware security module ({{ch:secrets-manager}}). A database stolen without the pepper is then much harder to attack. It adds operational complexity (rotation, availability), so treat it as an extra layer, not a replacement for good hashing.

## The flows

### Level 3 — Sign-up

1. **Validate** the input with a schema ({{ch:validation}}): email format (normalised to lower case), password length (at least 8 characters, ideally allowing 64 or more; no arbitrary composition rules — current NIST guidance favours length and blocklists over "one symbol, one digit" rules).
2. **Check the password against breached-password lists.** Many services use the "Have I Been Pwned" Pwned Passwords API, which supports a **k-anonymity** method: you send only the first 5 characters of the password's SHA-1 hash, receive all hashes starting with those characters, and check locally — so the password itself never leaves your server.
3. **Hash** the password.
4. **Insert** the user, relying on a **unique constraint** on the normalised email ({{ch:validation}}); handle the conflict without revealing whether the email exists (below).
5. **Send a verification email** with a single-use token.

### Level 3 — Login

```text
  POST /login {email, password}
     │
     ├─ validate input format
     ├─ rate-limit check (per IP, per account)                 → 429
     ├─ find user by normalised email
     │     not found → still hash a dummy password (timing)    → 401 generic
     ├─ verify password hash                                   → 401 generic on failure
     ├─ account checks: verified? disabled? locked?
     ├─ MFA required? → issue a short-lived "MFA pending" state, ask for code
     ├─ rehash if parameters are outdated
     └─ create session / tokens ({{ch:sessions}}, {{ch:jwt}})   → 200
```

Key decisions:

- **One generic error** for unknown email and wrong password: "Email or password is incorrect" ({{ch:frontend-authentication}}).
- **Equal timing** for unknown users. If the server returns instantly for unknown emails but takes 100 ms to hash for known ones, an attacker can tell which emails have accounts by measuring response times. Running a password hash against a dummy value when the user does not exist removes the difference.
- **Create a fresh session** after login (never reuse a session id from before login — {{ch:sessions}}).
- **Record the event** — success or failure, with user id (if known), IP address and user agent — in a security audit log ({{ch:logging}}).

### Level 3 — Logout

End the session on the server (delete it, or revoke refresh tokens) and clear the cookie ({{ch:sessions}}). Offer "log out of all devices", which ends every session for the user.

### Level 3 — Email verification and password reset tokens

Both flows email the user a link containing a **secret token**. The rules for such tokens:

- **Unpredictable**: at least 128 bits of randomness from a CSPRNG (`randomBytes(32)`), encoded for URLs (`base64url`). Never use `Math.random()`, timestamps or sequential ids.
- **Stored as a hash**: store a SHA-256 hash of the token, not the token itself. If the database leaks, the attacker cannot use pending reset links. (A fast hash is fine here, because the token is long and random — unlike a human password, it cannot be guessed.)
- **Single-use and short-lived**: delete or mark used immediately; expire after, for example, 30 minutes for resets and a day or two for verification.
- **Bound to its purpose and user**: a verification token cannot be used as a reset token.

```ts
import { randomBytes, createHash, timingSafeEqual } from "node:crypto";

type StoredToken = { userId: string; purpose: "reset" | "verify"; tokenHash: Buffer; expiresAt: number; used: boolean };
const tokenTable: StoredToken[] = [];

const sha256 = (value: string) => createHash("sha256").update(value).digest();

function issueToken(userId: string, purpose: StoredToken["purpose"], ttlMs: number, now: number): string {
  const token = randomBytes(32).toString("base64url");     // 256 bits, URL-safe
  tokenTable.push({ userId, purpose, tokenHash: sha256(token), expiresAt: now + ttlMs, used: false });
  return token;                                             // goes in the email link; never stored in plain form
}

function consumeToken(token: string, purpose: StoredToken["purpose"], now: number): string | null {
  const hash = sha256(token);
  const record = tokenTable.find((t) => t.purpose === purpose && timingSafeEqual(t.tokenHash, hash));
  if (!record || record.used || record.expiresAt <= now) return null;
  record.used = true;
  return record.userId;
}

const now = Date.UTC(2026, 5, 15, 9, 0);
const token = issueToken("usr_41", "reset", 30 * 60_000, now);
console.log(`token length: ${token.length} characters`);
console.log("first use:", consumeToken(token, "reset", now + 5 * 60_000));
console.log("second use:", consumeToken(token, "reset", now + 6 * 60_000));
const late = issueToken("usr_41", "reset", 30 * 60_000, now);
console.log("after expiry:", consumeToken(late, "reset", now + 31 * 60_000));
console.log("wrong purpose:", consumeToken(issueToken("usr_41", "verify", 86_400_000, now), "reset", now));
```

**Output:**

```text
token length: 43 characters
first use: usr_41
second use: null
after expiry: null
wrong purpose: null
```

- 32 random bytes encode to 43 base64url characters — practically impossible to guess.
- Only the **hash** is stored; the token itself exists only in the email.
- The token works once, only before it expires, and only for its purpose.
- In a real database, you would look the record up **by** its hash (an indexed column), which is a fast equality lookup; the scan with `timingSafeEqual` here just keeps the example self-contained.

After a successful password reset: hash and store the new password, **invalidate all existing sessions and other reset tokens** for that user, and notify the user by email that their password changed ({{ch:frontend-authentication}}).

## Defending against online attacks

### Level 3 — Rate limiting and throttling

Attackers who cannot steal your database attack the login endpoint directly. Defences, usually combined:

- **Rate limits per IP address** and **per account** (for example, a handful of failures per account per 15 minutes, with growing delays). Per-account limits stop brute force on one account; per-IP limits slow down spraying and stuffing from one source ({{ch:rate-limiting}}).
- **Progressive delays** rather than permanent lockout. Locking an account after five failures lets an attacker lock out any user they choose (a denial-of-service against your customers). Temporary, increasing delays — and notifying the user — are usually better.
- **Bot detection** and **CAPTCHAs** shown only after suspicious activity, so normal users are not burdened.
- **Credential-stuffing signals**: many different accounts failing from the same IP ranges, or logins with passwords known to be breached. Commercial services and identity providers detect these patterns at scale.
- **MFA**, which makes stolen passwords far less useful.

### Level 4 — Timing attacks and constant-time comparison

Comparing two secrets with `===` (or `Buffer.equals`) usually stops at the **first differing byte**. A comparison that fails at byte 1 returns slightly faster than one that fails at byte 20. Over many measured attempts, an attacker can use these tiny differences to discover a secret one byte at a time — a **timing attack**.

For secrets that are compared directly — API keys, webhook signatures, password hashes, tokens — use a **constant-time** comparison such as Node's `crypto.timingSafeEqual`, which always examines every byte. It requires inputs of equal length, so compare fixed-length values (hashes or HMACs of the inputs) rather than raw strings of varying length.

### Level 4 — Account enumeration

Attackers want to know which emails have accounts — to target them with phishing, or to focus credential stuffing. Your system can reveal this through:

- different error messages on login ("no such user" versus "wrong password");
- sign-up responses ("email already registered");
- password-reset responses ("we sent you an email" versus "no account found");
- **response times** (hashing for real users, not for unknown ones).

The fixes: generic messages; the same response for "exists" and "does not exist" in reset and sign-up flows (send an email to the address in both cases — "someone tried to register with your address; if it was you, log in or reset your password"); dummy hashing for unknown users; and rate limits. Perfect resistance can conflict with usability — many products accept revealing account existence at sign-up — so make the trade-off deliberately.

## Multi-factor authentication

### Level 3 — TOTP: codes from an authenticator app

The most common second factor is a 6-digit code from an authenticator app (Google Authenticator, Microsoft Authenticator, Authy and others), defined by the **TOTP** standard (Time-based One-Time Password, RFC 6238). It works like this:

1. At enrolment, the server generates a random **shared secret** and shows it to the user as a QR code (containing an `otpauth://` URL). The app stores it.
2. Both the app and the server compute the same function of the **secret** and the **current time**, divided into 30-second steps.
3. At login, after the password, the user types the code shown in the app; the server computes the expected code and compares.

Because the code changes every 30 seconds and depends on a secret the attacker does not have, a stolen password alone is not enough. Here is the algorithm, checked against the test values published in the standard:

```ts
import { createHmac } from "node:crypto";

function hotp(secret: Buffer, counter: number, digits = 6): string {
  const message = Buffer.alloc(8);
  message.writeBigUInt64BE(BigInt(counter));                    // the counter as 8 bytes
  const hmac = createHmac("sha1", secret).update(message).digest();
  const offset = hmac[hmac.length - 1]! & 0x0f;                 // "dynamic truncation"
  const code =
    ((hmac[offset]! & 0x7f) << 24) | (hmac[offset + 1]! << 16) | (hmac[offset + 2]! << 8) | hmac[offset + 3]!;
  return String(code % 10 ** digits).padStart(digits, "0");
}

function totp(secret: Buffer, unixSeconds: number, digits = 6, stepSeconds = 30): string {
  return hotp(secret, Math.floor(unixSeconds / stepSeconds), digits);
}

// Test vectors from RFC 6238 (SHA-1, 8 digits)
const rfcSecret = Buffer.from("12345678901234567890");
for (const t of [59, 1111111109, 1234567890, 2000000000]) {
  console.log(t, totp(rfcSecret, t, 8));
}

// Verifying a user's code, accepting one step of clock drift either way
function verifyTotp(secret: Buffer, code: string, unixSeconds: number): boolean {
  return [-1, 0, 1].some((drift) => totp(secret, unixSeconds + drift * 30) === code);
}
const userSecret = Buffer.from("a-random-secret-from-enrolment!!");
const now = 1_781_000_000;
const codeOnPhone = totp(userSecret, now - 25);    // phone's clock is 25 seconds behind
console.log(verifyTotp(userSecret, codeOnPhone, now), verifyTotp(userSecret, "000000", now));
```

**Output:**

```text
59 94287082
1111111109 07081804
1234567890 89005924
2000000000 69279037
true false
```

Walk through it:

- **HOTP** (the counter-based algorithm TOTP builds on, RFC 4226) computes an **HMAC** — a keyed hash ({{ch:jwt}}) — of the counter with the shared secret, then extracts a number from it ("dynamic truncation": the last 4 bits choose where in the 20-byte HMAC to take 4 bytes from) and keeps the last `digits` decimal digits.
- **TOTP** uses the number of 30-second steps since 1970 as the counter, so the code changes every 30 seconds.
- The printed codes match the official test values in RFC 6238 — the right way to check cryptographic code you implement.
- **Verification accepts one step either side** to tolerate small clock differences between the phone and the server. In production you must also **prevent replay** (reject a code that was already used in the current window), **rate-limit** attempts (a 6-digit code has only a million possibilities), and compare in constant time.
- Real secrets are random bytes from `randomBytes(20)`, encoded in base32 for the QR code. In practice, use a well-tested library for TOTP; implementing it here shows that it is a small, understandable algorithm, not magic.

### Level 4 — Recovery codes and stronger factors

- **Recovery codes**: at enrolment, give the user a set of single-use backup codes (stored hashed, like reset tokens) for when they lose their phone. Without a recovery path, MFA locks out legitimate users — and support teams, pressured to help, become the weak point that social engineers attack.
- **SMS codes** are better than nothing but vulnerable to SIM-swap fraud and interception; prefer authenticator apps or security keys for important accounts.
- **Passkeys and security keys** (WebAuthn — {{ch:frontend-authentication}}) are the strongest common option: phishing-resistant public-key credentials. The server stores only the **public key** for each registered credential and verifies signed challenges; there is no shared secret to steal from the server at all.
- **Step-up authentication**: require MFA again for sensitive actions (changing the password or email, adding a payout bank account), even within a session.

## Secrets, randomness and comparisons

A short checklist that applies throughout authentication code:

- **Randomness**: use `crypto.randomBytes`, `crypto.randomUUID` or `crypto.getRandomValues` for anything secret — tokens, salts, session ids, codes. `Math.random()` is predictable and must never be used for security.
- **Lengths**: at least 128 bits of entropy for tokens and session identifiers (16 random bytes; 32 is common).
- **Comparisons**: constant-time (`timingSafeEqual`) on equal-length values for secrets.
- **Storage**: hash long random tokens with SHA-256 before storing; hash passwords with a password hashing function; encrypt data that must be recoverable (such as TOTP secrets) with keys kept in a secrets manager ({{ch:secrets-manager}}).
- **Transport**: HTTPS everywhere ({{ch:tls-ssl}}); never put secrets in URLs that might be logged, except single-use tokens in email links, which should be consumed and invalidated immediately.
- **Logging**: never log passwords, tokens, codes or hashes ({{ch:logging}}).

## Building versus buying

Everything in this chapter — hashing, flows, rate limiting, MFA, recovery — must be done correctly and maintained. Many teams therefore use:

- **Authentication libraries** within their application (for example, in the Node and Next.js ecosystem: Better Auth or Auth.js; Passport for Express-style apps), which provide hashing, sessions, OAuth providers and flows.
- **Identity providers** (Auth0, Amazon Cognito, Microsoft Entra ID, Firebase Authentication, Keycloak if self-hosted, and others), which take over storage of credentials, MFA, passkeys and attack detection, and integrate through OAuth and OpenID Connect ({{ch:oauth}}).

Choose based on control, cost, compliance and team expertise. Even with a provider, **authorisation** — what each user may do with your data — remains your responsibility ({{ch:frontend-authentication}}).

## From beginner to enterprise

**Level 3 — first login system.** A password hashing function with salt; generic login errors; secure random tokens; HTTPS; sessions handled by a library.

**Level 4 — real applications.** Email verification and password reset with hashed, single-use, expiring tokens; rate limiting per IP and account; dummy hashing against enumeration; rehashing on login; TOTP MFA with recovery codes; audit logging.

**Level 5 — professional practice.** Breached-password checks; passkeys; step-up authentication; secrets in a secrets manager; security review of every change to authentication; monitoring of login failure rates and alerts on spikes ({{ch:monitoring}}).

**Level 6 — large organisations.** Central identity providers with single sign-on for employees and customers ({{ch:oauth}}); risk-based authentication (new device, unusual location, impossible travel); fraud teams; compliance requirements (for example, strong customer authentication for payments in some regions); regular penetration tests.

## Real-world use cases

### Migrating a legacy password database

- **Situation**: an old system stores unsalted MD5 hashes.
- **Approach**: immediately **wrap** each old hash in a modern one — store `argon2id(md5_hash)` with a marker — so the database is protected right away without needing users' passwords. At each user's next login, verify through the wrapper, then replace with a direct `argon2id(password)` hash. After a period, force password resets for users who never logged in.
- **Why**: protects everyone at once instead of waiting months for logins.

### A credential-stuffing attack

- **Signals**: login failures rise tenfold; most attempts use valid email addresses with wrong passwords, from thousands of IP addresses, at a steady rate.
- **Response**: tighten rate limits; enable bot challenges for suspicious traffic; block known-breached passwords at login and require a reset; notify affected users; encourage or require MFA; monitor successful logins from new locations for takeovers.

## Common mistakes

### Beginner: storing passwords in plain text or with fast hashes

**Fix:** Argon2id, scrypt or bcrypt with salts and appropriate cost.

### Beginner: `Math.random()` for tokens or codes

**Fix:** `crypto.randomBytes`.

### Beginner: revealing which credential was wrong

**Fix:** one generic message; same timing.

### Intermediate: storing reset tokens in plain text

**Fix:** store a SHA-256 hash; single use; short expiry.

### Intermediate: permanent lockouts

**Consequence:** attackers lock users out deliberately. **Fix:** progressive delays, notifications, MFA.

### Intermediate: comparing secrets with `===`

**Fix:** `timingSafeEqual` on equal-length values.

### Production: synchronous hashing on the event loop

`scryptSync` or `bcrypt.hashSync` in a request handler blocks the whole server under load. **Fix:** asynchronous APIs ({{ch:nodejs}}).

### Production: no recovery path for MFA

**Consequence:** locked-out users and support teams vulnerable to social engineering. **Fix:** recovery codes and a verified recovery process.

### Enterprise: home-made cryptography

Custom "encryption" schemes, home-made token formats, hand-written password hashing. **Fix:** standard algorithms, maintained libraries, expert review.

## Debugging and troubleshooting

- **"Valid password rejected"**: different normalisation between sign-up and login (Unicode, trimming — trimming passwords is usually wrong), wrong parameters read from the stored hash, or a hash truncated by a too-short database column.
- **"Logins became slow"**: hashing cost raised too high for the available CPU, or synchronous hashing blocking the event loop; measure hash time on production hardware.
- **"TOTP codes always fail"**: server clock not synchronised (servers should use NTP time synchronisation), wrong secret encoding (base32 versus raw bytes), or wrong algorithm or digit settings.
- **"Reset links do not work"**: token URL-encoding damaged by email clients (use base64url), already used (email security scanners sometimes "click" links automatically — a reason to require a final button press on the reset page rather than acting on the link's GET request), or expired.
- **Spikes in failures**: check rate-limit metrics and source IPs for an attack before assuming a bug.

## How a senior engineer thinks about this

- **Assume the database will leak.** Passwords are hashed slowly with salts; tokens are stored hashed; secrets are encrypted with keys kept elsewhere.
- **Assume attackers can try endlessly.** Rate limits, delays, MFA and monitoring make each attempt expensive and visible.
- **Leak nothing.** Messages and timing do not reveal whether accounts exist.
- **Use the standards and the libraries.** They follow OWASP and NIST guidance, and prefer proven libraries or identity providers over custom code.
- **Plan for real people.** Password managers, passkeys, recovery codes and clear flows — security that users can live with is security that works.

## Exercises

### Exercise 1 — Spot the storage problems

**Objective:** practise evaluating credential storage.
**What to do:** for each scheme, say whether it is acceptable and why: (1) `sha256(password)`; (2) `sha256(salt + password)` with a per-user salt; (3) `bcrypt(password)` with cost 12; (4) AES-encrypted passwords with the key in an environment variable; (5) `argon2id(password)` with recommended parameters; (6) reset tokens stored as plain text with a 7-day expiry.

<details>
<summary>Show the solution</summary>

1. **Unacceptable** — fast and unsalted: identical passwords give identical hashes; billions of guesses per second.
2. **Unacceptable** — salt prevents precomputed tables, but SHA-256 is still far too fast; each hash can be attacked at enormous speed.
3. **Acceptable** — slow, salted (bcrypt includes the salt in its output); note the 72-byte input limit and raise the cost over time.
4. **Unacceptable** — encryption is reversible; whoever obtains the key (often stored on the same servers) recovers every password.
5. **Best current choice** — memory-hard, salted, tunable.
6. **Unacceptable** — plain-text tokens are usable by anyone who reads the database, and 7 days is far too long; store a hash, expire within about 30 minutes, single use.

</details>

### Exercise 2 — Fix the login handler

**Objective:** practise secure login logic.
**Starting point:**

```ts
// fragment
app.post("/login", async (req, res) => {
  const user = await db.users.findOne({ email: req.body.email });
  if (!user) return res.status(404).json({ error: "No account with that email" });
  if (sha256(req.body.password) !== user.passwordHash) {
    user.failedLogins++;
    if (user.failedLogins > 5) user.locked = true;
    await db.users.save(user);
    return res.status(401).json({ error: "Wrong password" });
  }
  req.session.userId = user.id;
  res.json({ ok: true });
});
```

**What to do:** list the problems and write an improved version (assume helpers exist for rate limiting, password hashing and sessions).

<details>
<summary>Show the solution</summary>

**Problems:** no input validation or email normalisation; account enumeration (404 vs 401 messages, and timing — no hashing for unknown users); fast unsalted SHA-256 hashes; non-constant-time comparison; permanent lockout that attackers can trigger; no rate limiting per IP; session not regenerated (session fixation — {{ch:sessions}}); no MFA step; no audit log; no rehashing.

```ts
// fragment
const LoginInput = z.object({ email: z.string().trim().toLowerCase().pipe(z.email()), password: z.string().min(1).max(1024) });
const DUMMY_HASH = await hashPassword("dummy-password-for-timing");

app.post("/login", loginRateLimit, async (req, res) => {
  const { email, password } = LoginInput.parse(req.body);
  const user = await users.findByEmail(email);

  const ok = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok || user.disabled) {
    await recordLoginFailure(email, req.ip);              // progressive delay per account and IP
    audit.warn({ email, ip: req.ip, outcome: "failure" }, "login");
    res.status(401).json({ code: "invalid_credentials", message: "Email or password is incorrect" });
    return;
  }

  if (needsRehash(user.passwordHash)) await users.updatePasswordHash(user.id, await hashPassword(password));
  await req.session.regenerate();                          // fresh session id after login
  if (user.mfaEnabled) {
    req.session.pendingMfaUserId = user.id;                // not logged in until the code is verified
    res.json({ mfaRequired: true });
    return;
  }
  req.session.userId = user.id;
  audit.info({ userId: user.id, ip: req.ip, outcome: "success" }, "login");
  res.json({ ok: true });
});
```

(`req.session.regenerate` is written here as a promise for brevity; the exact API depends on the session library.)

</details>

### Exercise 3 — Debug the reset flow

**Objective:** practise finding token-handling mistakes.
**The scenario:** a security review of password reset finds: tokens are `Date.now().toString(36)`; they are stored in plain text in the `users` table and never cleared; the reset page changes the password when the link is opened (GET); and resets do not end existing sessions. Explain the risk of each and the fix.

<details>
<summary>Show the solution</summary>

1. **Predictable tokens** — a timestamp encoded in base 36 can be guessed by trying values around the time a reset was requested, letting an attacker take over any account. **Fix:** `randomBytes(32).toString("base64url")`.
2. **Plain-text, permanent tokens** — anyone reading the database (a leak, a backup, an insider) can reset accounts; old tokens remain valid forever. **Fix:** store a SHA-256 hash in a separate table with purpose, expiry (about 30 minutes) and a used flag; delete on use.
3. **Changing state on GET** — link-preview bots and email security scanners open links automatically, consuming or acting on the token; GET requests should be safe ({{ch:rest-apis}}). **Fix:** the link opens a page with a form; the change happens on POST with the token in the body.
4. **Sessions survive the reset** — an attacker who already took over the account stays logged in after the real owner resets the password. **Fix:** invalidate all sessions and refresh tokens on reset, and notify the user by email.

</details>

### Exercise 4 — Production scenario: add MFA to an existing product

**Objective:** plan an MFA rollout.
**The scenario:** your shop's admin panel (staff accounts that can change prices and refund orders) and customer accounts currently use passwords only. Plan the introduction of MFA.

<details>
<summary>Show the solution</summary>

1. **Priorities**: mandatory MFA for **all staff** first (highest risk), optional for customers with encouragement (and perhaps required for actions like changing payout details).
2. **Factors**: TOTP authenticator apps and passkeys/security keys; SMS only as a fallback for customers, never for staff.
3. **Enrolment flow**: generate a random secret, show a QR code, require the user to enter a valid code to confirm, show **recovery codes** once (store them hashed, single use).
4. **Login flow**: after the password, a short-lived "MFA pending" state (not a full session); verify the TOTP with drift tolerance, replay protection and rate limiting; then create the session.
5. **Step-up**: require MFA again for refunds above a threshold, price changes in bulk, and account security changes.
6. **Recovery**: recovery codes; for staff, an identity-verified process run by an administrator with an audit trail; for customers, a careful support process resistant to social engineering.
7. **Storage**: TOTP secrets encrypted with a key from the secrets manager ({{ch:secrets-manager}}).
8. **Rollout**: announce in advance; grace period for staff to enrol; monitor enrolment and support tickets; then enforce.
9. **Monitoring**: MFA failures and recovery-code usage alerts; audit logs of all MFA changes ({{ch:logging}}).

</details>

## Summary

Server-side authentication verifies proofs of identity — something you **know**, **have** or **are** — and prefers more than one kind for important accounts. Passwords must never be stored readably: use a deliberately slow, memory-hard **password hashing function** (Argon2id first, scrypt or bcrypt acceptable) with a unique **salt** per user, parameters stored with each hash, rehashing on login when parameters change, and optionally a **pepper** kept outside the database. Fast hashes and encryption are wrong for passwords.

Build the flows carefully: validated, normalised sign-up with breached-password checks and email verification; login with **generic errors**, equal timing for unknown users, fresh sessions and audit logs; logout that ends server sessions; and verification and reset links using **CSPRNG** tokens of at least 128 bits, stored **hashed**, single-use, short-lived and bound to their purpose, with resets ending all sessions.

Defend the login endpoint against **brute force**, **credential stuffing** and **password spraying** with per-IP and per-account rate limits, progressive delays instead of permanent lockouts, bot detection and MFA; prevent **account enumeration** and **timing attacks** with consistent responses and `timingSafeEqual`. Add MFA with **TOTP** (an HMAC of a shared secret and the time), with drift tolerance, replay protection and recovery codes — or, better, phishing-resistant **passkeys**. Use standard algorithms and maintained libraries or identity providers rather than inventing your own.

## Key terms

- **Authentication** — Verifying that a user, device or system is who or what it claims to be.
- **Authentication factor** — A category of proof: something you know, something you have, or something you are.
- **Multi-factor authentication (MFA)** — Requiring proofs of at least two different kinds.
- **Password hashing function** — A deliberately slow, often memory-hard hash function used to store passwords, such as Argon2id, scrypt or bcrypt.
- **Argon2id** — A memory-hard password hashing algorithm recommended as a first choice by current guidance.
- **scrypt** — A memory-hard password hashing function available in Node's built-in crypto module.
- **bcrypt** — A widely used adaptive password hashing function with a configurable cost.
- **Salt** — A random value stored with each password hash so that identical passwords produce different hashes.
- **Pepper** — A secret value stored outside the database and combined with passwords during hashing.
- **Rainbow table** — A precomputed table of hashes for common passwords, defeated by salting.
- **Memory-hard function** — A function that requires a large amount of memory to compute, making specialised cracking hardware less effective.
- **Rehashing** — Replacing a password hash with one using stronger parameters when the user next logs in.
- **Brute-force attack** — Trying many passwords against an account until one works.
- **Credential stuffing** — Trying username and password pairs leaked from other sites.
- **Password spraying** — Trying a few common passwords against many accounts.
- **Account enumeration** — Discovering which accounts exist by observing differences in a system's responses.
- **Timing attack** — Learning secret information by measuring how long operations take.
- **Constant-time comparison** — Comparing values in a way whose duration does not depend on where they differ.
- **CSPRNG** — A cryptographically secure random number generator whose output cannot be predicted.
- **Entropy** — A measure of unpredictability; for tokens, roughly the number of random bits.
- **Reset token** — A single-use secret sent by email that allows a user to set a new password.
- **k-anonymity (password checking)** — Checking whether a password is breached by sending only a prefix of its hash, so the full password is never revealed.
- **HMAC** — A keyed hash used to prove that data was produced by someone holding a secret key.
- **HOTP** — A one-time password algorithm based on an HMAC of a shared secret and a counter.
- **TOTP** — A one-time password algorithm based on an HMAC of a shared secret and the current time.
- **Recovery code** — A single-use backup code that lets a user sign in if their second factor is lost.
- **Step-up authentication** — Requiring additional authentication before a sensitive action within an existing session.
- **Identity provider** — A service that manages user credentials and authentication for other applications.

## What comes next

After a user proves who they are, the server must **remember** it across the requests that follow, without asking for the password each time. The next chapter, {{ch:sessions}}, explains server-side sessions and cookies in depth: how session ids are created, stored and validated, cookie attributes, session fixation and hijacking, CSRF protection, expiry and rotation, and how sessions scale across many servers.
