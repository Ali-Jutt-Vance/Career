# Phase 2 — Chapter 10: Validation

> *"Be liberal in what you accept, and conservative in what you send."* — Postel's Law. Modern security inverts this: be strict in what you accept at the boundary.

---

## Chapter Overview

### Why Validation Matters

Input validation is the first line of defense against:
- **SQL injection**: unsanitized input modifies database queries
- **XSS**: unvalidated HTML in input injected into pages
- **Business logic errors**: orders with negative quantities, ages below zero
- **Server crashes**: unexpected data types causing type errors
- **Data corruption**: storing invalid states in your database

The boundary where user input enters your system is the most dangerous line in your codebase. Everything beyond that boundary must be validated.

**Validation vs. Sanitization vs. Normalization:**
- **Validation**: check if input meets requirements (reject if not)
- **Sanitization**: transform input to make it safe (strip HTML tags)
- **Normalization**: standardize format (lowercase email, trim whitespace)

---

## Beginner Theory

### What to Validate

```
Presence:          required fields are present and not empty
Type:              correct data type (number, string, boolean, date)
Format:            email format, URL format, phone format, UUID
Range:             number in range (1–100), string length (min 2, max 255)
Enumeration:       value is one of allowed values
Business rules:    end date after start date, total = sum of items
Cross-field:       password == confirmPassword
Uniqueness:        email not already registered (requires DB check)
```

### Validation Libraries (Node.js)

```
Zod (recommended — TypeScript-first):
  Infers TypeScript types from schemas
  Great error messages
  Composable, transforms included
  Best for new TypeScript projects

Joi (mature, feature-rich):
  Powerful, well-documented
  Large ecosystem
  Independent of TypeScript
  Best for JavaScript projects or when you need advanced features

class-validator (NestJS ecosystem):
  Decorator-based
  Works with class instances
  Perfect for NestJS DTOs

express-validator:
  Middleware-based for Express
  Chain-based API
  Good for simple validation in Express without a schema library

Yup:
  Similar to Zod, popular with Formik (React forms)
  Runtime validation
```

---

## Basic Examples

### Zod (Recommended)

```javascript
// npm install zod
const { z } = require("zod");

// ─── BASIC SCHEMAS ────────────────────────────────────────────────────────────
const nameSchema = z.string().min(2, "Name must be at least 2 characters").max(100);
const emailSchema = z.string().email("Invalid email format").toLowerCase();
const passwordSchema = z.string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Must contain at least one uppercase letter")
  .regex(/[0-9]/, "Must contain at least one number")
  .regex(/[^a-zA-Z0-9]/, "Must contain at least one special character");

// ─── OBJECT SCHEMAS ───────────────────────────────────────────────────────────
const createUserSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
  role: z.enum(["user", "admin", "moderator"]).default("user"),
  age: z.number().int().min(13).max(120).optional(),
  website: z.string().url().optional().nullable(),
  tags: z.array(z.string().min(1)).max(10).default([])
});

// ─── USING THE SCHEMA ─────────────────────────────────────────────────────────
// Method 1: parse() throws on validation failure
try {
  const user = createUserSchema.parse(req.body);
  // user is typed and validated
} catch (err) {
  if (err instanceof z.ZodError) {
    const errors = err.issues.map(issue => ({
      field:   issue.path.join("."),
      message: issue.message
    }));
    res.status(400).json({ error: "Validation failed", details: errors });
  }
}

// Method 2: safeParse() returns result object (preferred — no exceptions)
const result = createUserSchema.safeParse(req.body);

if (!result.success) {
  const errors = result.error.issues.map(issue => ({
    field:   issue.path.join("."),
    message: issue.message
  }));
  return res.status(400).json({ error: "Validation failed", details: errors });
}

const userData = result.data;  // validated and typed
```

### Express Validation Middleware with Zod

```javascript
// middleware/validate.js
const { z } = require("zod");

function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse({
      body:   req.body,
      query:  req.query,
      params: req.params
    });

    if (!result.success) {
      const errors = result.error.issues.map(issue => ({
        field:   issue.path.slice(1).join("."),   // skip "body"/"query"/"params" prefix
        message: issue.message,
        code:    issue.code
      }));

      return res.status(400).json({
        error: "Validation failed",
        details: errors
      });
    }

    // Attach validated data (coerced and stripped of unknown fields)
    req.validated = result.data;
    next();
  };
}

module.exports = validate;

// ─── SCHEMAS ──────────────────────────────────────────────────────────────────
// schemas/user.schema.js
const { z } = require("zod");

const createUserSchema = z.object({
  body: z.object({
    name:     z.string().min(2).max(100).trim(),
    email:    z.string().email().toLowerCase().trim(),
    password: z.string().min(8),
    role:     z.enum(["user", "admin"]).default("user")
  })
});

const updateUserSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid user ID format")
  }),
  body: z.object({
    name:    z.string().min(2).max(100).trim().optional(),
    email:   z.string().email().toLowerCase().trim().optional(),
    website: z.string().url().optional()
  }).refine(
    data => Object.keys(data).length > 0,
    { message: "At least one field must be provided" }
  )
});

const getUsersSchema = z.object({
  query: z.object({
    page:   z.coerce.number().int().positive().default(1),
    limit:  z.coerce.number().int().positive().max(100).default(20),
    search: z.string().max(100).optional(),
    role:   z.enum(["user", "admin"]).optional(),
    sort:   z.enum(["name", "email", "createdAt"]).default("createdAt"),
    order:  z.enum(["asc", "desc"]).default("desc")
  })
});

// ─── ROUTES ───────────────────────────────────────────────────────────────────
const validate = require("../middleware/validate");
const { createUserSchema, updateUserSchema, getUsersSchema } = require("../schemas/user.schema");

router.get("/",        validate(getUsersSchema),   asyncHandler(getUsers));
router.post("/",       validate(createUserSchema),  asyncHandler(createUser));
router.patch("/:id",   validate(updateUserSchema),  asyncHandler(updateUser));
```

---

## Intermediate Concepts

### Advanced Zod Patterns

```javascript
const { z } = require("zod");

// ─── TRANSFORMS ──────────────────────────────────────────────────────────────
// Transform data during validation
const schema = z.object({
  email:    z.string().email().toLowerCase().trim(),
  name:     z.string().trim(),
  birthday: z.string().transform(str => new Date(str)),
  tags:     z.string().transform(str => str.split(",").map(t => t.trim()))
});

// ─── REFINEMENTS (custom validation) ─────────────────────────────────────────
// Simple refinement
const passwordConfirmSchema = z.object({
  password:        z.string().min(8),
  confirmPassword: z.string()
}).refine(
  data => data.password === data.confirmPassword,
  { message: "Passwords don't match", path: ["confirmPassword"] }
);

// Multiple refinements
const eventSchema = z.object({
  startDate: z.string().datetime(),
  endDate:   z.string().datetime(),
  maxSeats:  z.number().positive(),
  minSeats:  z.number().positive()
}).refine(
  data => new Date(data.endDate) > new Date(data.startDate),
  { message: "End date must be after start date", path: ["endDate"] }
).refine(
  data => data.maxSeats >= data.minSeats,
  { message: "Max seats must be >= min seats", path: ["maxSeats"] }
);

// ─── DISCRIMINATED UNIONS ─────────────────────────────────────────────────────
const notificationSchema = z.discriminatedUnion("type", [
  z.object({
    type:  z.literal("email"),
    to:    z.string().email(),
    subject: z.string()
  }),
  z.object({
    type:  z.literal("sms"),
    phone: z.string().regex(/^\+[1-9]\d{1,14}$/)
  }),
  z.object({
    type:  z.literal("push"),
    deviceToken: z.string().min(1)
  })
]);

// ─── RECURSIVE SCHEMAS ───────────────────────────────────────────────────────
// For nested structures (comments with replies, org trees)
type Comment = {
  id: string;
  content: string;
  replies: Comment[];
};

const commentSchema: z.ZodType<Comment> = z.lazy(() =>
  z.object({
    id:      z.string().uuid(),
    content: z.string().min(1).max(2000),
    replies: z.array(commentSchema)
  })
);

// ─── PARTIAL AND PICK/OMIT ───────────────────────────────────────────────────
const createSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  role: z.enum(["user", "admin"])
});

const updateSchema = createSchema.partial();         // all fields optional
const publicSchema = createSchema.omit({ role: true }); // remove role
const loginSchema  = createSchema.pick({ email: true, password: true }); // only these

// ─── PREPROCESS (transform before validation) ─────────────────────────────────
const numberFromString = z.preprocess(
  (val) => (typeof val === "string" ? Number(val) : val),
  z.number().positive()
);
```

### Joi (Alternative)

```javascript
const Joi = require("joi");

const createUserSchema = Joi.object({
  name:     Joi.string().min(2).max(100).trim().required(),
  email:    Joi.string().email().lowercase().trim().required(),
  password: Joi.string().min(8)
    .pattern(/[A-Z]/, "uppercase")
    .pattern(/[0-9]/, "number")
    .required(),
  role:     Joi.string().valid("user", "admin").default("user"),
  age:      Joi.number().integer().min(13).max(120),
  website:  Joi.string().uri().allow(null, "")
});

// Validate
const { error, value } = createUserSchema.validate(req.body, {
  abortEarly: false,       // collect ALL errors, not just first
  stripUnknown: true       // remove unknown fields
});

if (error) {
  const errors = error.details.map(d => ({
    field: d.path.join("."),
    message: d.message
  }));
  return res.status(400).json({ error: "Validation failed", details: errors });
}
```

### Database-Level Validation

```javascript
// TypeORM Entity with validation
import { Entity, Column, Check, Index } from "typeorm";
import { IsEmail, MinLength, IsEnum } from "class-validator";

@Entity("users")
@Check(`"age" >= 13 AND "age" <= 120`)        // DB-level constraint
@Index(["email"], { unique: true })           // DB-level unique
export class User {
  @Column()
  @MinLength(2)
  name: string;

  @Column({ unique: true })
  @IsEmail()
  email: string;

  @Column()
  @MinLength(8)
  password: string;

  @Column({ type: "enum", enum: UserRole })
  @IsEnum(UserRole)
  role: UserRole;

  @Column({ nullable: true })
  age?: number;
}

// Multiple validation layers:
// 1. Schema validation (Zod/Joi) — at the HTTP boundary
// 2. Class-validator — at the DTO/Entity layer  
// 3. Database constraints — last line of defense
```

### File Upload Validation

```javascript
const multer = require("multer");
const path   = require("path");
const crypto = require("crypto");

// Allowed MIME types
const ALLOWED_TYPES = new Set([
  "image/jpeg", "image/png", "image/webp", "image/gif"
]);

const MAX_SIZE = 5 * 1024 * 1024;  // 5MB

const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    // Randomize filename to prevent path traversal
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${crypto.randomUUID()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE },
  fileFilter: (req, file, cb) => {
    // Check MIME type
    if (!ALLOWED_TYPES.has(file.mimetype)) {
      return cb(new Error(`File type ${file.mimetype} not allowed`));
    }
    cb(null, true);
  }
});

// WARNING: MIME type in the request is user-controlled — can be spoofed!
// Always validate the actual file content (magic bytes) server-side
const { fileTypeFromBuffer } = require("file-type");

app.post("/upload", upload.single("avatar"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "File required" });

  // Verify actual file content matches claimed type
  const buffer   = require("fs").readFileSync(req.file.path);
  const detected = await fileTypeFromBuffer(buffer);

  if (!detected || !ALLOWED_TYPES.has(detected.mime)) {
    require("fs").unlinkSync(req.file.path);  // delete invalid file
    return res.status(400).json({ error: "Invalid file content" });
  }

  res.json({ filename: req.file.filename });
});
```

---

## Advanced Concepts

### Runtime vs. Compile-Time Validation

```typescript
// TypeScript catches type errors at COMPILE TIME but not at runtime
// User input arrives as unknown at runtime — TypeScript can't help there

function processUser(user: { name: string; age: number }) {
  console.log(user.name.toUpperCase());
}

// TypeScript: no error because type matches
// Runtime: if user.name is actually undefined (from API), crash!

// ZOD bridges the gap: validates at runtime AND infers TypeScript types
import { z } from "zod";

const userSchema = z.object({
  name: z.string(),
  age:  z.number()
});

type User = z.infer<typeof userSchema>;  // TypeScript type

function processUser(input: unknown): User {
  return userSchema.parse(input);  // validates at runtime + types at compile time
}
```

### Validation Error Format

```javascript
// Consistent error response format
{
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": [
    {
      "field": "email",
      "message": "Invalid email format",
      "code": "invalid_string",
      "received": "not-an-email"
    },
    {
      "field": "password",
      "message": "Password must be at least 8 characters",
      "code": "too_small",
      "minimum": 8
    },
    {
      "field": "confirmPassword",
      "message": "Passwords don't match",
      "code": "custom"
    }
  ]
}

// Implementation helper
function formatZodError(zodError) {
  return zodError.issues.map(issue => ({
    field:   issue.path.join("."),
    message: issue.message,
    code:    issue.code,
    ...(issue.minimum !== undefined && { minimum: issue.minimum }),
    ...(issue.maximum !== undefined && { maximum: issue.maximum })
  }));
}
```

---

## Security

```javascript
// 1. Validate at the boundary — never trust external input
// 2. Whitelist allowed fields (strip unknown properties)
z.object({ name: z.string(), email: z.string().email() })
  // Unknown fields are STRIPPED by default in Zod
  // Prevents mass assignment (e.g., { role: "admin" } from a user input)

// 3. Validate Content-Type header
app.use((req, res, next) => {
  if (["POST", "PUT", "PATCH"].includes(req.method)) {
    const ct = req.headers["content-type"] ?? "";
    if (!ct.includes("application/json")) {
      return res.status(415).json({ error: "Content-Type must be application/json" });
    }
  }
  next();
});

// 4. Validate file uploads: MIME type + magic bytes + virus scan
// 5. Sanitize HTML if you must allow it (use DOMPurify or sanitize-html)
const sanitizeHtml = require("sanitize-html");
const clean = sanitizeHtml(userInput, {
  allowedTags: ["b", "i", "em", "strong", "a"],
  allowedAttributes: { "a": ["href"] }
});

// 6. Don't trust client-side validation — always validate server-side
// Client-side validation is UX only; server validation is security
```

---

## Interview Preparation

**Q1: What is the difference between validation and sanitization?**
A: Validation checks if input meets requirements — it accepts or rejects input without modifying it. "Is this a valid email?" If not, reject with an error. Sanitization transforms input to make it safe or normalize it — strip HTML tags, trim whitespace, lowercase an email. Both are needed: validate structure and type, sanitize to normalize format. The key insight: don't sanitize what you should reject. If a field shouldn't contain HTML, don't strip it — reject the request.

**Q2: Why validate server-side even when you have client-side validation?**
A: Client-side validation is a UX improvement — it gives users instant feedback without a round-trip. But it provides zero security guarantees. Attackers can bypass client-side validation by sending requests directly (curl, Postman, custom scripts). Server-side validation is the only security boundary. Always validate on the server; client-side is optional extra UX.

**Q3: What is mass assignment and how do you prevent it?**
A: Mass assignment is when user input is applied directly to a model or database record without filtering which fields are allowed. An attacker could include `{ "role": "admin" }` in a profile update request and elevate their privileges. Prevention: use schema validation to whitelist only allowed fields (Zod's default: unknown properties are stripped). Never spread req.body directly into a database update.

**Q4: What is the difference between `z.parse()` and `z.safeParse()`?**
A: `parse()` throws a `ZodError` on validation failure. Use with try/catch. `safeParse()` returns a result object: `{ success: true, data: ... }` or `{ success: false, error: ZodError }`. `safeParse()` is preferred because it doesn't require try/catch, makes validation explicit in the control flow, and avoids exception overhead. Use `parse()` when validation failure is truly exceptional.

**Q5: How does TypeScript benefit from Zod schemas?**
A: Zod schemas can infer TypeScript types with `z.infer<typeof schema>`. This means you define your data shape once as a Zod schema and get both runtime validation and compile-time TypeScript types for free. Without Zod, you'd maintain a separate TypeScript interface (for types) and a separate schema (for validation) — two places to keep in sync.

---

## Practical Tasks

### Beginner (10 Tasks)
1. Create Zod schemas for: createUser, updateUser, getUsersQuery with all expected fields.
2. Write a `validate()` middleware that uses `safeParse` and returns 400 on failure.
3. Validate an email, URL, UUID, phone number, and date using Zod.
4. Use `z.coerce.number()` to automatically convert query string numbers.
5. Implement `.refine()` to validate that a password matches confirmPassword.
6. Validate a nested object (address with street, city, country, zip).
7. Validate an array with `.array().min(1).max(10)` and nested object items.
8. Use `.transform()` to lowercase all emails and trim all strings at schema level.
9. Strip unknown fields and verify that unknown fields don't appear in validated data.
10. Test validation errors by sending invalid input — verify the error format.

### Intermediate (10 Tasks)
1. Build a discriminated union schema for multiple notification types.
2. Implement recursive schema for a comment tree (comments with nested replies).
3. Add file upload validation: MIME type check + file-type magic bytes check.
4. Validate incoming webhook payloads using HMAC signature + Zod schema.
5. Build a centralized validation error formatter with consistent format.
6. Implement cross-field validation: end date must be after start date.
7. Add async validation in a middleware (e.g., check email uniqueness in DB).
8. Implement conditional validation (field required only if another field is set).
9. Build a schema registry that maps route + method to a Zod schema.
10. Write unit tests for all validation schemas using vitest or Jest.

### Advanced (10 Tasks)
1. Generate OpenAPI schema from Zod schemas using `zod-to-json-schema`.
2. Build a validation error i18n system with translated error messages.
3. Implement rate limiting tied to validation failures (10 invalid requests → 429).
4. Build a GraphQL schema validator that validates query variables against Zod schemas.
5. Implement partial validation for PUT (all required) vs PATCH (all optional).
6. Create a Zod schema code generator from a database schema (TypeORM entities → Zod).
7. Build a validation middleware factory that reads schemas from a YAML file.
8. Implement streaming JSON validation for large request bodies.
9. Add telemetry: track which fields fail most often, which schemas are slowest.
10. Build a fuzzing test that generates invalid inputs to find missing validations.

---

## Mini Project

**Validation Middleware Library**: Build a reusable validation package:
- `validate(schema)` middleware for Express
- Support for body, query, params validation in one schema
- Consistent error format with field paths
- Async validation support (uniqueness checks)
- TypeScript types exported
- npm package with README and examples

---

## Self Assessment
1. What is the difference between validation, sanitization, and normalization?
2. Why can't you rely only on client-side validation?
3. What is mass assignment? How does Zod prevent it?
4. What is `z.safeParse()` vs `z.parse()`? When use each?
5. What does `z.infer<typeof schema>` do?
6. How do you validate query parameters that arrive as strings but should be numbers?
7. What is a refinement in Zod? Give an example.
8. What is a discriminated union schema?
9. How do you validate file uploads securely?
10. What HTTP status code should a validation failure return?
11. What is the `abortEarly` option in Joi?
12. How do you implement cross-field validation?
13. Why should you validate the Content-Type header?
14. What is the difference between DB-level and application-level validation? Why need both?
15. What is `z.preprocess()` used for?

---

## Cheat Sheet

### Zod Common Patterns
```javascript
z.string().min(2).max(100).trim()
z.string().email().toLowerCase()
z.string().url()
z.string().uuid()
z.string().regex(/pattern/)
z.number().int().positive().min(1).max(100)
z.coerce.number()           // string → number (query params)
z.boolean()
z.enum(["a", "b", "c"])
z.array(z.string()).min(1).max(10)
z.object({ field: z.string() })
z.optional()                // field can be undefined
z.nullable()                // field can be null
z.default("value")          // default if undefined
z.transform(val => ...)     // transform after validation
.refine(fn, "message")      // custom validation
.superRefine((data, ctx) => { ctx.addIssue(...) })
```

### Middleware Pattern
```javascript
function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse({ body: req.body, query: req.query, params: req.params });
    if (!result.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: result.error.issues.map(i => ({ field: i.path.slice(1).join("."), message: i.message }))
      });
    }
    req.validated = result.data;
    next();
  };
}
```
