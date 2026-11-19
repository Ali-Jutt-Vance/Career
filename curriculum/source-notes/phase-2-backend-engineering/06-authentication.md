# Phase 2 — Chapter 6: Authentication

> *"Authentication is about proving who you are. Authorization is about what you're allowed to do."*

---

## Chapter Overview

### Why Authentication Matters

Authentication is the gatekeeper of every application. A failure here doesn't just leak one record — it exposes your entire user base. The OWASP Top 10 consistently lists "Broken Authentication" as a critical vulnerability.

Every modern application needs:
- User registration with secure credential storage
- Login with credential verification
- Session/token management
- Multi-factor authentication
- Account recovery mechanisms

Authentication is not just about checking passwords — it's a security system covering the entire lifecycle of user identity.

---

## Beginner Theory

### Password Security

**Never store plaintext passwords.** If your database is compromised, attackers get all passwords immediately. Passwords must be hashed with a **slow, salted, work-factor-adjustable** hashing algorithm.

```
UNSAFE (fast hash — crackable by GPU in seconds):
  MD5, SHA-1, SHA-256, SHA-512

SAFE (designed for passwords — slow by design):
  bcrypt (most widely supported)
  Argon2id (winner of Password Hashing Competition 2015 — recommended)
  scrypt (memory-hard)
```

**bcrypt explained:**
- Auto-generates a random salt (prevents rainbow table attacks)
- Work factor (cost) controls speed: cost=12 → ~0.3 seconds (adjustable as hardware improves)
- Each increase of 1 doubles the time
- The hash includes the salt and cost factor — one string contains everything needed to verify

```javascript
const bcrypt = require("bcrypt");

// Hashing (registration)
const SALT_ROUNDS = 12;
const hash = await bcrypt.hash(plaintext, SALT_ROUNDS);
// Example output: $2b$12$LQv3c1yqBWVHxkd0LHAkCO...

// Verifying (login)
const isMatch = await bcrypt.compare(plaintext, hash);
// Constant-time comparison — prevents timing attacks

// Why 12 rounds?
// 10 rounds = ~100ms (minimum acceptable)
// 12 rounds = ~300ms (good balance)
// 14 rounds = ~1200ms (for high-security systems)
```

### Registration and Login Flow

```
REGISTRATION:
Client → Server: { name, email, password }
Server:
  1. Validate input (email format, password strength)
  2. Check email uniqueness
  3. Hash password with bcrypt (cost=12)
  4. Store: { name, email, passwordHash, createdAt }
  5. Return: { user } (NO password hash in response)
  (Optional) 6. Send verification email

LOGIN:
Client → Server: { email, password }
Server:
  1. Find user by email
  2. If not found: bcrypt.compare(password, FAKE_HASH)  ← prevent timing attack!
  3. If found: bcrypt.compare(password, user.passwordHash)
  4. If mismatch: return 401 (same error for wrong email and wrong password)
  5. If match: create session/token
  6. Return: { token, user }

IMPORTANT: Never reveal whether the email exists — say "Invalid email or password"
```

---

## Basic Examples

### Complete Authentication with JWT

```javascript
const express   = require("express");
const bcrypt    = require("bcrypt");
const jwt       = require("jsonwebtoken");
const crypto    = require("crypto");
const router    = express.Router();

const SALT_ROUNDS  = 12;
const ACCESS_TTL   = "15m";
const REFRESH_TTL  = "7d";

// Fake hash to prevent timing attack when email not found
const FAKE_HASH = "$2b$12$LQv3c1yqBWVHxkd0LHAkCOXMRJklbTFdRmLQv3c1yqBWVHxkd0LHA";

// ─── REGISTRATION ──────────────────────────────────────────────────────────────
router.post("/register", async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    // Validate
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email, and password are required" });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }

    // Check uniqueness
    const existing = await db.users.findByEmail(email);
    if (existing) {
      return res.status(409).json({ error: "Email already registered" });
    }

    // Hash and store
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await db.users.create({ name, email: email.toLowerCase(), passwordHash });

    // Issue tokens
    const tokens = issueTokens(user);
    await db.refreshTokens.save(user.id, tokens.refreshToken);

    res.status(201).json({
      user: sanitizeUser(user),
      ...tokens
    });
  } catch (err) {
    next(err);
  }
});

// ─── LOGIN ────────────────────────────────────────────────────────────────────
router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await db.users.findByEmail(email.toLowerCase());

    // Always run bcrypt.compare to prevent timing attacks
    const hash = user?.passwordHash ?? FAKE_HASH;
    const isMatch = await bcrypt.compare(password, hash);

    if (!user || !isMatch) {
      // Same message regardless of which was wrong
      return res.status(401).json({ error: "Invalid email or password" });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: "Account is disabled" });
    }

    if (!user.emailVerified) {
      return res.status(403).json({ error: "Please verify your email before logging in" });
    }

    // Update last login
    await db.users.update(user.id, { lastLoginAt: new Date() });

    const tokens = issueTokens(user);
    await db.refreshTokens.save(user.id, tokens.refreshToken);

    res.json({ user: sanitizeUser(user), ...tokens });
  } catch (err) {
    next(err);
  }
});

// ─── TOKEN REFRESH ────────────────────────────────────────────────────────────
router.post("/refresh", async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(401).json({ error: "Refresh token required" });

    // Verify the refresh token
    let payload;
    try {
      payload = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    } catch {
      return res.status(401).json({ error: "Invalid or expired refresh token" });
    }

    // Check it exists in DB (detect token reuse / revocation)
    const stored = await db.refreshTokens.findByToken(refreshToken);
    if (!stored || stored.userId !== payload.sub) {
      // Possible token theft — revoke all refresh tokens for this user
      await db.refreshTokens.revokeAll(payload.sub);
      return res.status(401).json({ error: "Refresh token invalid or revoked" });
    }

    const user = await db.users.findById(payload.sub);
    if (!user || !user.isActive) {
      return res.status(401).json({ error: "User not found or disabled" });
    }

    // Rotate refresh token (security: one-time use)
    await db.refreshTokens.revoke(refreshToken);
    const tokens = issueTokens(user);
    await db.refreshTokens.save(user.id, tokens.refreshToken);

    res.json(tokens);
  } catch (err) {
    next(err);
  }
});

// ─── LOGOUT ───────────────────────────────────────────────────────────────────
router.post("/logout", authenticate, async (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) await db.refreshTokens.revoke(refreshToken);
  res.status(204).end();
});

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function issueTokens(user) {
  const accessToken = jwt.sign(
    { sub: user.id, role: user.role, email: user.email },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: ACCESS_TTL }
  );
  const refreshToken = jwt.sign(
    { sub: user.id },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: REFRESH_TTL }
  );
  return { accessToken, refreshToken };
}

function sanitizeUser(user) {
  const { passwordHash, ...safe } = user;
  return safe;
}
```

---

## Intermediate Concepts

### Email Verification

```javascript
// After registration, send a verification email
router.post("/register", async (req, res) => {
  // ... create user ...

  // Generate secure token
  const verificationToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(verificationToken).digest("hex");

  // Store hashed token with expiry
  await db.emailVerifications.create({
    userId: user.id,
    tokenHash,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)  // 24 hours
  });

  // Send email with raw token (not the hash)
  const verifyUrl = `${process.env.CLIENT_URL}/verify-email?token=${verificationToken}`;
  await emailService.sendVerificationEmail(user.email, verifyUrl);

  res.status(201).json({ message: "Registration successful. Please check your email." });
});

// Verify endpoint
router.get("/verify-email", async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).json({ error: "Token required" });

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const record = await db.emailVerifications.findByHash(tokenHash);

  if (!record || record.expiresAt < new Date()) {
    return res.status(400).json({ error: "Invalid or expired verification token" });
  }

  await db.users.update(record.userId, { emailVerified: true });
  await db.emailVerifications.delete(record.id);

  res.json({ message: "Email verified successfully" });
});
```

### Password Reset

```javascript
// Request reset
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;

  // Always return success — don't reveal if email exists
  const user = await db.users.findByEmail(email);
  if (user) {
    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    await db.passwordResets.upsert({
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000)  // 1 hour
    });

    const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${token}`;
    await emailService.sendPasswordReset(user.email, resetUrl);
  }

  // Same response whether email exists or not
  res.json({ message: "If this email is registered, you will receive a reset link" });
});

// Reset password
router.post("/reset-password", async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword || newPassword.length < 8) {
    return res.status(400).json({ error: "Valid token and new password required" });
  }

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const record = await db.passwordResets.findByHash(tokenHash);

  if (!record || record.expiresAt < new Date()) {
    return res.status(400).json({ error: "Invalid or expired reset token" });
  }

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await db.users.update(record.userId, { passwordHash });
  await db.passwordResets.delete(record.id);
  await db.refreshTokens.revokeAll(record.userId);  // invalidate all sessions

  res.json({ message: "Password reset successfully. Please login again." });
});
```

### Multi-Factor Authentication (TOTP)

```javascript
// npm install speakeasy qrcode
const speakeasy = require("speakeasy");
const QRCode    = require("qrcode");

// Setup MFA
router.post("/mfa/setup", authenticate, async (req, res) => {
  const secret = speakeasy.generateSecret({
    name: `MyApp (${req.user.email})`,
    issuer: "MyApp"
  });

  // Store secret (before user confirms — not yet active)
  await db.users.update(req.user.id, { mfaSecret: secret.base32, mfaEnabled: false });

  // Generate QR code for authenticator app
  const qrCode = await QRCode.toDataURL(secret.otpauth_url);

  res.json({ secret: secret.base32, qrCode });
});

// Verify and activate MFA
router.post("/mfa/verify", authenticate, async (req, res) => {
  const { code } = req.body;
  const user = await db.users.findById(req.user.id);

  const isValid = speakeasy.totp.verify({
    secret: user.mfaSecret,
    encoding: "base32",
    token: code,
    window: 1   // allow 30 seconds clock drift
  });

  if (!isValid) return res.status(400).json({ error: "Invalid code" });

  // Generate backup codes
  const backupCodes = Array.from({ length: 8 }, () =>
    crypto.randomBytes(4).toString("hex")
  );
  const backupHashes = backupCodes.map(c =>
    crypto.createHash("sha256").update(c).digest("hex")
  );

  await db.users.update(user.id, {
    mfaEnabled: true,
    mfaBackupCodes: backupHashes
  });

  res.json({ message: "MFA enabled", backupCodes });
});

// Login with MFA
router.post("/login/mfa", async (req, res) => {
  const { mfaToken, code } = req.body;

  // mfaToken was issued after password check (step 1)
  let payload;
  try {
    payload = jwt.verify(mfaToken, process.env.MFA_TOKEN_SECRET);
  } catch {
    return res.status(401).json({ error: "Invalid MFA token" });
  }

  const user = await db.users.findById(payload.sub);

  // Try TOTP code
  let isValid = speakeasy.totp.verify({
    secret: user.mfaSecret,
    encoding: "base32",
    token: code,
    window: 1
  });

  // Try backup codes
  if (!isValid && user.mfaBackupCodes?.length) {
    const codeHash = crypto.createHash("sha256").update(code).digest("hex");
    const index = user.mfaBackupCodes.indexOf(codeHash);
    if (index !== -1) {
      isValid = true;
      // Remove used backup code
      const remaining = [...user.mfaBackupCodes];
      remaining.splice(index, 1);
      await db.users.update(user.id, { mfaBackupCodes: remaining });
    }
  }

  if (!isValid) return res.status(401).json({ error: "Invalid MFA code" });

  const tokens = issueTokens(user);
  res.json({ user: sanitizeUser(user), ...tokens });
});
```

### Brute Force Protection

```javascript
// Track failed login attempts per email/IP
const rateLimit = require("express-rate-limit");
const RedisStore = require("rate-limit-redis").default;

// IP-based limit
const ipLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 20,                    // max 20 attempts per IP
  store: new RedisStore({ sendCommand: (...args) => redis.call(...args) }),
  keyGenerator: (req) => `login:ip:${req.ip}`,
  handler: (req, res) => res.status(429).json({
    error: "Too many login attempts. Please try again in 15 minutes."
  })
});

// Email-based limit (persists across IPs)
async function checkAccountLockout(email) {
  const key = `login:attempts:${email.toLowerCase()}`;
  const attempts = await redis.get(key);

  if (parseInt(attempts) >= 5) {
    throw new Error("Account temporarily locked due to too many failed attempts");
  }
}

async function recordFailedLogin(email) {
  const key = `login:attempts:${email.toLowerCase()}`;
  await redis.multi()
    .incr(key)
    .expire(key, 15 * 60)  // expire in 15 minutes
    .exec();
}

async function clearFailedLogins(email) {
  await redis.del(`login:attempts:${email.toLowerCase()}`);
}
```

---

## Advanced Concepts

### Passwordless Authentication (Magic Links)

```javascript
router.post("/auth/magic-link", async (req, res) => {
  const { email } = req.body;
  const user = await db.users.findOrCreate({ email });

  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  await redis.setex(`magic:${tokenHash}`, 600, user.id);  // 10 minutes

  const link = `${process.env.CLIENT_URL}/auth/verify?token=${token}`;
  await emailService.sendMagicLink(email, link);

  res.json({ message: "Magic link sent to your email" });
});

router.get("/auth/verify", async (req, res) => {
  const { token } = req.query;
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  const userId = await redis.getdel(`magic:${tokenHash}`);
  if (!userId) return res.status(400).json({ error: "Invalid or expired link" });

  const user = await db.users.findById(userId);
  const tokens = issueTokens(user);

  res.json({ user: sanitizeUser(user), ...tokens });
});
```

### Social Login (OAuth2 with Passport.js)

```javascript
// npm install passport passport-google-oauth20
const passport = require("passport");
const { Strategy: GoogleStrategy } = require("passport-google-oauth20");

passport.use(new GoogleStrategy({
  clientID:     process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL:  `${process.env.API_URL}/auth/google/callback`
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const email = profile.emails[0].value;

    // Find or create user
    let user = await db.users.findByEmail(email);
    if (!user) {
      user = await db.users.create({
        name:          profile.displayName,
        email,
        emailVerified: true,    // Google verified it
        googleId:      profile.id,
        avatarUrl:     profile.photos[0]?.value
      });
    } else if (!user.googleId) {
      await db.users.update(user.id, { googleId: profile.id });
    }

    return done(null, user);
  } catch (err) {
    return done(err);
  }
}));

router.get("/auth/google",          passport.authenticate("google", { scope: ["profile", "email"] }));
router.get("/auth/google/callback", passport.authenticate("google", { session: false }), (req, res) => {
  const tokens = issueTokens(req.user);
  // Redirect to frontend with tokens in query params or set HTTP-only cookies
  res.redirect(`${process.env.CLIENT_URL}/auth/callback?token=${tokens.accessToken}`);
});
```

---

## Industry Usage

- **Small apps**: JWT access + refresh tokens (stateless, scalable)
- **Enterprise**: SAML 2.0, LDAP, Active Directory integration
- **Consumer apps**: OAuth2 social login (Google, Apple, Facebook)
- **High-security**: Passwordless (WebAuthn/FIDO2), hardware keys (YubiKey)
- **SaaS**: SSO with SAML/OIDC
- **Fintech/Healthcare**: MFA required by regulation, biometric fallback

---

## Security

```javascript
// CRITICAL SECURITY CHECKLIST:

// 1. Passwords
// ✓ bcrypt/argon2id with cost >= 12
// ✓ Never log or return password hashes
// ✓ Constant-time comparison (bcrypt.compare)
// ✗ Never MD5, SHA-1, SHA-256 for passwords

// 2. Tokens
// ✓ Short-lived access tokens (15m)
// ✓ Refresh token rotation (one-time use)
// ✓ Store refresh tokens in DB (for revocation)
// ✓ HTTP-only, Secure cookies for refresh tokens (not localStorage)
// ✗ Never put sensitive data in JWT payload

// 3. Account security
// ✓ Lock after N failed attempts
// ✓ Rate limit login endpoints
// ✓ Email verification
// ✓ Password reset tokens expire in 1 hour
// ✓ Revoke all tokens on password change
// ✓ Log all auth events (login, failed attempt, password reset)

// 4. Sensitive data
// ✓ Same error for wrong email vs. wrong password
// ✓ HTTPS only — never HTTP for auth endpoints
// ✓ Secrets in environment variables, not code

// 5. Session fixation
// ✓ Regenerate session ID after login
// ✓ Clear session on logout

// Store refresh token in HTTP-only cookie (XSS-proof)
res.cookie("refreshToken", tokens.refreshToken, {
  httpOnly: true,      // not accessible via JavaScript
  secure:   true,      // HTTPS only
  sameSite: "strict",  // CSRF protection
  maxAge:   7 * 24 * 60 * 60 * 1000  // 7 days
});
```

---

## Interview Preparation

**Q1: Why can't we use MD5 or SHA-256 to hash passwords?**
A: MD5 and SHA-256 are designed to be fast — they can compute billions of hashes per second on modern GPUs. An attacker with a breached database can attempt every word in a dictionary (rainbow table or brute force) against all hashes simultaneously. bcrypt/Argon2 are designed to be slow (hundreds of milliseconds per hash) and memory-hard, making brute-force attacks computationally impractical.

**Q2: What is the difference between authentication and authorization?**
A: Authentication verifies identity — "who are you?" (login with email/password, OAuth, biometric). Authorization verifies permissions — "are you allowed to do this?" (checking user role, resource ownership, RBAC rules). Authentication always comes first. A user can be authenticated (we know who they are) but not authorized (they don't have permission for this specific resource).

**Q3: What is a timing attack? How do you prevent it?**
A: A timing attack exploits the fact that string comparison short-circuits on the first mismatch — comparing a wrong password is faster than comparing a correct one. An attacker can measure response times to infer information (e.g., whether an email exists). Prevention: always run bcrypt.compare even when the email doesn't exist (using a fake hash). Use constant-time comparison functions.

**Q4: What is refresh token rotation? Why do it?**
A: Refresh token rotation means each time a refresh token is used, it's revoked and replaced with a new one. This limits the damage if a refresh token is stolen — it becomes invalid the next time the legitimate user uses it. The server detects token reuse (a stolen token was used after rotation) and can revoke all tokens for the account. Without rotation, a stolen long-lived refresh token is valid until expiry.

**Q5: Why should refresh tokens be stored in HTTP-only cookies instead of localStorage?**
A: localStorage is accessible via JavaScript — an XSS attack that injects JavaScript into your page can steal all localStorage data, including tokens. HTTP-only cookies cannot be read by JavaScript — only sent automatically by the browser. Combined with `Secure` (HTTPS only) and `SameSite=Strict` (CSRF protection), they're far more secure than localStorage for sensitive tokens.

---

## Practical Tasks

### Beginner (10 Tasks)
1. Build registration with bcrypt hashing (cost=12) and validate password strength.
2. Build login with constant-time password comparison and JWT issuance.
3. Create a JWT authentication middleware that verifies tokens and attaches user to req.
4. Implement logout that revokes the refresh token from the database.
5. Add rate limiting to login endpoint (10 per 15 min per IP).
6. Return consistent error messages that don't reveal email existence.
7. Hash the email verification token before storing in the database.
8. Implement email verification flow with expiring tokens.
9. Implement password reset flow with 1-hour expiry.
10. Test all auth endpoints with Postman, including edge cases.

### Intermediate (10 Tasks)
1. Implement refresh token rotation with reuse detection.
2. Store refresh tokens in HTTP-only cookies and handle CSRF.
3. Add account lockout after 5 failed attempts (15 min lockout).
4. Implement TOTP-based two-factor authentication with QR code setup.
5. Add Google OAuth2 social login using Passport.js.
6. Implement magic link (passwordless) authentication.
7. Log all auth events (login, failed, password change, logout) to an audit table.
8. Add concurrent session limiting (max 3 active sessions per user).
9. Implement "remember me" functionality with extended session.
10. Write unit tests for all auth service functions.

### Advanced (10 Tasks)
1. Implement WebAuthn (FIDO2) passwordless authentication.
2. Build SAML 2.0 SSO integration with an identity provider.
3. Implement OAuth2 authorization server (not just client).
4. Add anomaly detection: flag login from new country/device.
5. Implement step-up authentication (require re-auth for sensitive actions).
6. Build a session management dashboard (view/revoke active sessions).
7. Implement argon2id password hashing with migration from bcrypt.
8. Add push notification-based MFA (approve login on phone).
9. Build a compromised password check using HaveIBeenPwned API.
10. Implement audit logging with tamper detection (hash chain).

---

## Mini Project

**Auth Service**: A standalone authentication microservice:
- Register, login, logout, refresh token rotation
- Email verification
- Password reset
- TOTP MFA
- Rate limiting
- Account lockout
- Audit logging
- REST API + JWT
- Full test suite

---

## Self Assessment
1. Why is bcrypt preferred over SHA-256 for password hashing?
2. What is a rainbow table attack? How does salting prevent it?
3. What is a timing attack? How is it prevented in login?
4. What is the difference between access tokens and refresh tokens?
5. Why should refresh tokens be stored server-side (in a database)?
6. What is refresh token rotation? What attack does it prevent?
7. Why store tokens in HTTP-only cookies instead of localStorage?
8. What is email enumeration? How do you prevent it?
9. What is TOTP? How does it work?
10. What is a magic link and what security properties does it need?
11. What is account lockout? What are the tradeoffs?
12. What should you revoke when a user changes their password?
13. Why hash password reset tokens before storing them in the database?
14. What is the minimum bcrypt cost factor for production use?
15. What information should NEVER appear in a JWT payload?

---

## Cheat Sheet

### Password Hashing
```javascript
const hash  = await bcrypt.hash(password, 12);
const valid = await bcrypt.compare(password, hash);
```

### Token Issuance
```javascript
const accessToken = jwt.sign(
  { sub: user.id, role: user.role },
  process.env.ACCESS_SECRET,
  { expiresIn: "15m" }
);
const refreshToken = jwt.sign(
  { sub: user.id },
  process.env.REFRESH_SECRET,
  { expiresIn: "7d" }
);
```

### Secure Token Generation
```javascript
const token = crypto.randomBytes(32).toString("hex");
const hash  = crypto.createHash("sha256").update(token).digest("hex");
// Store hash in DB, send raw token to user
```

### Auth Flow
```
Register: validate → check unique → hash pw → save → verify email
Login:    find user → bcrypt.compare (always) → issue tokens
Refresh:  verify token → check DB → rotate → issue new tokens
Logout:   revoke refresh token from DB
```

### HTTP-only Cookie
```javascript
res.cookie("refreshToken", token, {
  httpOnly: true,
  secure: true,
  sameSite: "strict",
  maxAge: 7 * 24 * 60 * 60 * 1000
});
```
