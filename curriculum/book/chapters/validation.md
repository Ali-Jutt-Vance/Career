# Validation: Never Trust Input

> [!GOALS]
> - Explain why every piece of data entering a system must be checked, and what goes wrong when it is not.
> - Identify **trust boundaries** — the places where data must be validated — including some that teams forget.
> - Distinguish validation, normalisation, sanitisation and output encoding, and know which problem each solves.
> - Use schemas to **parse** untrusted data into trusted, typed values: types, formats, ranges, lengths, enumerations, unions and cross-field rules.
> - Validate request bodies, query strings, route parameters, headers, files, configuration and responses from other services.
> - Avoid the subtle traps: coercion surprises, Unicode, numbers, dates, regular expressions that hang, oversized input and prototype pollution.
> - Combine application validation with database constraints as the last line of defence, and report validation errors helpfully.

## Why this matters

A server receives data from the outside world all day: request bodies, query strings, uploaded files, webhooks from payment providers, responses from other services, messages from queues. **Every one of these can be wrong** — through honest mistakes, buggy clients, or deliberate attacks.

Consider what unvalidated input has done to real systems in ordinary ways:

- An order arrives with `quantity: -3`. The server multiplies by the price, the total becomes negative, and the customer is **credited** instead of charged.
- A "price" field sent from the browser is accepted as is, so a customer buys a television for Rs 1.
- A search box passes text straight into a database query, and an attacker reads every customer's data (SQL injection — {{ch:sql}}, {{ch:application-security}}).
- A JSON body nested 100,000 levels deep, or a 2 GB request, takes the server down.
- A user registers with an email address containing invisible characters, and can never log in again because the login form normalises them differently.
- A partner's API changes a field from a number to a string, and the shop silently records every delivery fee as `NaN`.

In {{ch:forms}} you validated input in the browser to **help users**. This chapter is about validation on the **server**, where it protects **correctness and security**. The browser's checks can be bypassed by anyone with a terminal; the server's checks cannot. The rule is simple and absolute: **never trust input**.

## The simple idea

Think about a bank receiving cheques. Before any money moves, a clerk checks each cheque: Is it filled in completely? Is the date valid and not in the future? Do the amount in words and the amount in figures match? Is the signature there? Is the account real? A cheque that fails any check is returned with a clear reason — and it never reaches the vault.

Validation is that clerk, standing at every door where data enters your system. Data that passes is converted into a trusted, well-defined form; data that fails is rejected with a clear explanation, and **never reaches the business logic or the database**.

> [!ANALOGY]
> Validation is like a bank clerk checking every cheque at the counter — completeness, dates, matching amounts, signatures — before anything reaches the vault.
>
> **Where the analogy breaks:** a clerk sees each cheque once, at one counter. Data in software enters through many doors — APIs, files, queues, other services, configuration — and some doors are easy to forget. And a clerk cannot see that a perfectly valid cheque is part of a fraud pattern; some rules (stock levels, uniqueness, account balances) can only be checked against the current state of the system, often at the moment of writing to the database.

## The proper definition and key words

**Input validation** is checking that data entering a system meets the rules it must follow — type, format, size, range and business constraints — and rejecting it if it does not.

The key words:

- **Trust boundary** — a point where data passes from a less trusted area (the internet, another service, a file) into a more trusted one (your business logic, your database). Validation belongs at every trust boundary.
- **Syntactic validation** — checking the **form** of data: is this a number? Is this a valid email format? Is this string at most 200 characters?
- **Semantic validation** — checking the **meaning** in context: is the delivery date in the future? Does this product exist? Is the quantity within stock?
- **Schema** — a declarative description of the expected shape and rules of data ({{ch:forms}}).
- **Parsing** — converting untrusted input into a trusted, typed value, failing if that is not possible.
- **Normalisation** (canonicalisation) — converting equivalent inputs into one standard form: trimming spaces, lower-casing emails, Unicode normalisation.
- **Sanitisation** — removing or altering dangerous parts of input (for example, stripping HTML tags).
- **Output encoding** (escaping) — converting data so it is treated as **data**, not code, when placed into another context: HTML, SQL, a shell command, a URL ({{ch:html}}).
- **Allow-list** — a definition of what **is** permitted; everything else is rejected. **Deny-list** — a definition of what is forbidden; everything else is allowed.

## How it works inside: parse, don't validate

### Level 2 — Two ways to think about validation

A common, weak style checks data and then carries on using the original, untyped value:

```ts
// fragment
function createOrder(body: any) {
  if (typeof body.quantity !== "number") throw new Error("bad quantity");
  // ... 200 lines later, someone uses body.quantity as if it were checked again,
  // or body.price, which was never checked at all
}
```

The checks and the use are separated; nothing guarantees that the code later in the function, or in another function, only uses checked data. A stronger style, often summarised as **"parse, don't validate"** (a phrase from an essay by Alexis King), turns untrusted input into a **new, typed value** at the boundary — and the rest of the program can only work with that value:

```text
   untrusted input ──▶ [ parse with schema ] ──▶ trusted, typed value ──▶ business logic
   (unknown shape)          │                    (TypeScript knows its exact type)
                            └──▶ failure: structured error, nothing else happens
```

After parsing, a `quantity` **is** a positive integer, a `deliveryDate` **is** a valid future date, and the compiler knows it. Code deeper in the system never re-checks, and cannot accidentally use an unchecked field — because unchecked fields were **removed** during parsing.

### Level 2 — Where the trust boundaries are

```text
                     ┌──────────────────────── your service ────────────────────────┐
   browser / app ───▶│ HTTP request: body, query, params, headers, cookies, files   │
   other services ──▶│ responses from APIs you call                                 │
   webhooks ────────▶│ payment / courier notifications                              │
   message queues ──▶│ messages from other services                                 │
   files, imports ──▶│ CSV uploads, nightly data feeds                              │
   environment ─────▶│ configuration and secrets                                    │
   database ────────▶│ (data written by other systems or older versions)            │
                     └──────────────────────────────────────────────────────────────┘
```

The obvious boundary is the HTTP request. The ones teams forget are just as dangerous:

- **Responses from third-party APIs.** If a payment provider's response changes shape, or a compromised service returns malicious data, your system should notice ({{ch:rest-apis}} — OWASP calls this "unsafe consumption of APIs").
- **Webhooks**, which anyone on the internet can send to your URL unless you verify their signature.
- **Messages from queues**, which may have been written by an older version of a service ({{ch:queues}}).
- **Configuration**, which a typo in an environment variable can break ({{ch:nodejs}}).
- **Data read back from storage** written by another system or a previous schema version.

## Validation, sanitisation and encoding are different jobs

Beginners often expect validation to solve every input problem. It does not. Each defence has its own job:

| Problem | The right defence | Not a substitute |
|---|---|---|
| Wrong type, missing field, out-of-range value | **Validation** (reject) | — |
| Equivalent inputs written differently (spaces, case, Unicode forms) | **Normalisation** (convert) | — |
| SQL injection | **Parameterised queries** ({{ch:sql}}) | Validation alone ("block quotes") |
| Cross-site scripting | **Output encoding** for the HTML context ({{ch:html}}); sanitising rich HTML with a proper library | Validation alone ("block `<script>`") |
| Command injection | **Argument arrays** instead of shell strings ({{ch:nodejs}}) | Escaping by hand |
| Path traversal | **Resolving and containing paths**, or generated file names ({{ch:nodejs}}) | Blocking `../` with a string check |

Why is validation not enough against injection? Because perfectly valid data can be dangerous in a particular **context**. The name `O'Brien` is a valid surname — and a quote character that breaks a hand-built SQL string. A product review that mentions `<script>` is a valid review about web development. The fix is not to reject legitimate data but to make sure that, wherever data is used, it is treated as **data**, never as code. Validation reduces the attack surface; encoding and parameterisation close the hole.

## Schemas in practice

### Level 3 — A request body

Using Zod ({{ch:forms}}), an order request:

```ts
import { z } from "zod";

const OrderLine = z.object({
  productId: z.string().regex(/^prd_[A-Za-z0-9]{8,24}$/, "Invalid product id"),
  quantity: z.number().int().min(1).max(20),
});

const CreateOrder = z.object({
  lines: z.array(OrderLine).min(1, "The order is empty").max(50, "Too many lines"),
  deliveryCity: z.enum(["lahore", "karachi", "islamabad"]),
  note: z.string().trim().max(500).optional(),
  couponCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{4,16}$/)
    .optional(),
});

type CreateOrderInput = z.infer<typeof CreateOrder>;

const raw: unknown = {
  lines: [{ productId: "prd_Chaunsa5kg", quantity: 2 }],
  deliveryCity: "lahore",
  couponCode: "  eid10 ",
  pricePaisa: 1,          // the client tries to set its own price
  isPaid: true,           // ...and mark the order as paid
};

const order: CreateOrderInput = CreateOrder.parse(raw);
console.log(order);
```

**Output:**

```text
{
  lines: [ { productId: 'prd_Chaunsa5kg', quantity: 2 } ],
  deliveryCity: 'lahore',
  couponCode: 'EID10'
}
```

Walk through the decisions:

- **Every field has bounds.** Quantities are whole numbers between 1 and 20; there are between 1 and 50 lines; the note is at most 500 characters. Upper limits matter as much as lower ones: they protect against absurd values and oversized payloads.
- **Formats are allow-listed.** Product ids must match the shape your system generates; cities must be one of the supported values; coupon codes are letters and digits only. Describing what **is** allowed is far safer than trying to list everything that is not.
- **Normalisation happens inside the schema.** The coupon code is trimmed and upper-cased before its format is checked, so `"  eid10 "` becomes `"EID10"`.
- **Unknown fields are removed.** `pricePaisa` and `isPaid` are not in the schema, so Zod strips them from the result. The client cannot set its own price or payment status — the **mass assignment** attack from {{ch:express}}. The price will be looked up from the database by the server, never taken from the request.
- **The input is typed `unknown`** — the honest type for untrusted data — and only the parsed result has a useful type.

### Level 3 — Strict or stripping?

By default, Zod object schemas **strip** unknown keys silently. Sometimes you want to **reject** them instead — for example, in a public API, where a client sending `quantiy` (misspelled) should be told, rather than having the field silently ignored:

```ts
import { z } from "zod";

const UpdateProfile = z.strictObject({
  name: z.string().trim().min(2).max(100),
  bio: z.string().max(1000).optional(),
});

const result = UpdateProfile.safeParse({ name: "Sara Ahmed", role: "admin" });
console.log(result.success, result.success ? "" : result.error.issues[0]!.message);
```

**Output:**

```text
false Unrecognized key: "role"
```

Both are valid choices; what matters is that **unknown fields never flow through** to the database. Stripping is forgiving for clients; strictness surfaces client bugs and suspicious requests. Many teams use strict schemas for public APIs and log rejected keys.

### Level 4 — Variants: discriminated unions

Some inputs have different shapes depending on one field — a payment by card needs a card token; cash on delivery needs a phone number:

```ts
import { z } from "zod";

const Payment = z.discriminatedUnion("method", [
  z.object({ method: z.literal("card"), cardToken: z.string().min(10) }),
  z.object({ method: z.literal("cod"), phone: z.string().regex(/^(\+92|0)3\d{9}$/) }),
  z.object({ method: z.literal("wallet"), walletId: z.string().min(5) }),
]);

for (const input of [
  { method: "cod", phone: "03001234567" },
  { method: "card", phone: "03001234567" },
  { method: "bank" },
]) {
  const r = Payment.safeParse(input);
  console.log(r.success ? `ok: ${r.data.method}` : r.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`).join("; "));
}
```

**Output:**

```text
ok: cod
cardToken: Invalid input: expected string, received undefined
method: Invalid discriminator value. Expected 'card' | 'cod' | 'wallet'
```

- The `method` field (the **discriminator**) selects which schema applies ({{ch:typescript-advanced}}).
- A card payment without a card token fails with a precise error on `cardToken`; an unknown method fails on the discriminator.
- After parsing, TypeScript narrows the type by `method`, so code handling card payments can use `cardToken` safely.

### Level 4 — Cross-field and contextual rules

Rules involving several fields go in refinements, attached to the relevant field ({{ch:forms}}):

```ts
// fragment
const DeliverySlot = z
  .object({ from: z.iso.datetime(), to: z.iso.datetime() })
  .refine((s) => new Date(s.to) > new Date(s.from), { message: "End must be after start", path: ["to"] })
  .refine((s) => new Date(s.to).getTime() - new Date(s.from).getTime() <= 4 * 3600_000, {
    message: "A delivery window can be at most 4 hours",
    path: ["to"],
  });
```

Rules that depend on the **current state of the system** — "this product exists", "this coupon is still valid", "there is enough stock", "this email is not already registered" — are semantic checks that belong in the **service layer**, close to the database, because the answer can change between the check and the write. They are covered below.

## Validating every part of a request

### Level 3 — Body, query, params and headers

The body is not the only input. Query strings, route parameters and headers are just as untrusted — and they are **always strings** (or arrays of strings), so they need conversion:

```ts
import express, { type Request, type Response, type NextFunction } from "express";
import { z, type ZodType } from "zod";

type Part = "body" | "query" | "params";

function validate<T>(part: Part, schema: ZodType<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[part]);
    if (!result.success) {
      res.status(400).json({ code: "validation_failed", part, errors: z.flattenError(result.error).fieldErrors });
      return;
    }
    res.locals[part] = result.data;   // the typed, validated value
    next();
  };
}

const ListOrdersQuery = z.object({
  status: z.enum(["placed", "shipped", "delivered", "cancelled"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().max(200).optional(),
});

const OrderParams = z.object({ id: z.string().regex(/^ord_[A-Za-z0-9]{8,24}$/) });

const app = express();
app.get("/orders", validate("query", ListOrdersQuery), (_req, res) => {
  res.json({ query: res.locals.query });
});
app.get("/orders/:id", validate("params", OrderParams), (_req, res) => {
  res.json({ id: res.locals.params.id });
});

const server = app.listen(0, async () => {
  const base = `http://localhost:${(server.address() as { port: number }).port}`;
  for (const path of ["/orders?status=shipped", "/orders?limit=5000&status=lost", "/orders/1043", "/orders/ord_8xKp2mNq"]) {
    const r = await fetch(base + path);
    console.log(r.status, JSON.stringify(await r.json()));
  }
  server.close();
});
```

**Output:**

```text
200 {"query":{"status":"shipped","limit":20}}
400 {"code":"validation_failed","part":"query","errors":{"status":["Invalid option: expected one of \"placed\"|\"shipped\"|\"delivered\"|\"cancelled\""],"limit":["Too big: expected number to be <=100"]}}
400 {"code":"validation_failed","part":"params","errors":{"id":["Invalid string: must match pattern /^ord_[A-Za-z0-9]{8,24}$/"]}}
200 {"id":"ord_8xKp2mNq"}
```

Walk through it:

- One reusable middleware validates any part of the request with any schema, and stores the **parsed** value in `res.locals` for the handler.
- `z.coerce.number()` converts the query string's `"5000"` into a number before checking it; `.default(20)` supplies the page size when absent — the clamp from {{ch:rest-apis}}, enforced by the schema.
- An invalid status and an oversized limit are both reported, by field, in one response.
- Route parameters are validated too: `1043` does not look like an order id, so it is rejected **before** any database query runs. Rejecting malformed ids early saves work and keeps garbage out of logs and queries.
- Zod's default messages are written for developers ("Too big: expected number to be <=100"); if the messages are shown to end users, supply custom ones.

### Level 4 — Headers, cookies and the rest

- **Headers** such as `X-Request-Id`, `Idempotency-Key` or custom client versions are attacker-controlled: validate format and length before using them, especially before logging them ({{ch:express}}).
- **`Content-Type`**: accept only the media types each endpoint supports (415 otherwise).
- **Cookies** are client-controlled; session cookies must be verified by the server, never trusted for their contents ({{ch:sessions}}).
- **Request size**: limit body sizes globally and per route ({{ch:express}}). A schema's `max()` cannot help if the server already spent its memory reading a 1 GB body.

## The subtle traps

### Level 4 — Coercion surprises

Coercion converts values before checking them, and conversion has edge cases. JavaScript's `Number("")` is `0` ({{ch:types-of-data}}), so an **empty** field passes a coerced number check:

```ts
import { z } from "zod";

const coerced = z.coerce.number().int().min(0);
console.log(coerced.safeParse("").success, coerced.parse(""));

const careful = z
  .string()
  .trim()
  .regex(/^\d+$/, "Enter a whole number")
  .transform((s) => Number(s))
  .pipe(z.number().int().min(0).max(1_000_000));
console.log(careful.safeParse("").success, careful.safeParse("12").success, careful.safeParse("1e3").success);
```

**Output:**

```text
true 0
false true false
```

- `z.coerce.number()` turned the empty string into `0` and accepted it — so an empty "quantity" or "discount" field silently becomes zero.
- The careful version first insists the string contains only digits, then converts and range-checks. Empty strings and scientific notation (`"1e3"`, which `Number` would happily turn into 1000) are rejected.
- Decide explicitly what empty means for each field: "not provided" (optional), or an error.

### Level 4 — Numbers

- `NaN` and `Infinity` are numbers in JavaScript; Zod's `z.number()` rejects them, but hand-written `typeof x === "number"` checks do not.
- **Integers beyond `Number.MAX_SAFE_INTEGER`** (about 9 × 10¹⁵) lose precision when parsed from JSON. Large ids (such as those from some external systems) should travel as **strings**.
- **Money** must never be validated or stored as floating-point; use integer minor units ({{ch:object-oriented-programming}}).
- Always apply **upper bounds**: quantities, page sizes, amounts, durations.

### Level 4 — Strings and Unicode

Text looks simple and is not:

```ts
const composed: string = "café";            // é as one character (U+00E9)
const decomposed: string = "café";   // e followed by a combining accent (U+0301)

console.log(composed === decomposed, composed.length, decomposed.length);
console.log(composed === decomposed.normalize("NFC"));
console.log([..."👍🏽"].length, "👍🏽".length);
```

**Output:**

```text
false 4 5
true
2 4
```

- The same visible word "café" can be stored as **different code-point sequences**. Without normalisation, two users can register visually identical usernames, or a search fails to find a match. Normalise text that is compared or used as a key — usernames, emails, slugs — to a standard form (NFC is the usual choice) before validating and storing it.
- `.length` counts UTF-16 code units, not visible characters: a thumbs-up emoji with a skin tone counts as **4**. Length limits should be generous enough not to cut legitimate text, and should be checked consistently with how the database measures length.
- Trim surrounding whitespace for most single-line fields; consider rejecting control characters and invisible characters (such as zero-width spaces) in names and identifiers.
- Lower-case email addresses for comparison (the part before `@` is technically case-sensitive by the standard, but almost no provider treats it that way, and treating it as case-insensitive prevents duplicate accounts).

### Level 4 — Emails, phones, URLs and dates

- **Emails**: validate a reasonable **format**, then verify ownership by **sending a confirmation link**. No regular expression proves an address exists, and overly strict patterns reject real addresses (plus signs, new top-level domains).
- **Phone numbers**: normalise (remove spaces, dashes, convert local to international format), then validate; for international products, use a well-maintained phone-number library.
- **URLs**: parse with `new URL()` ({{ch:browser-and-dom}}), then allow-list schemes (`https:`) and, if your server will fetch the URL, the hosts — otherwise attackers can make your server call internal addresses (server-side request forgery — {{ch:application-security}}).
- **Dates and times**: accept a single unambiguous format (ISO 8601 with a time-zone offset or `Z`), convert to UTC for storage, and validate ranges ("not in the past", "within 30 days"). Strings like `06/07/2026` mean different dates in different countries.

### Level 4 — Regular expressions that hang

Some regular expressions take **exponential time** on certain inputs, because the matching engine tries enormous numbers of ways to match before failing. A pattern such as `^(a+)+$` — "one or more groups of one or more a's" — checked against `"aaaaaaaaaaaaaaaaaaaaaaaaaaaaa!"` can run for seconds or minutes. Since Node runs JavaScript on one thread ({{ch:nodejs}}), a single request with crafted input can freeze the whole server. This is called **ReDoS** (regular-expression denial of service).

Defences:

- **Limit input length before** applying regular expressions (a 100-character limit makes even inefficient patterns finish quickly).
- Avoid **nested quantifiers** (`(a+)+`, `(.*)*`) and overlapping alternatives (`(a|a)+`).
- Prefer simple, anchored patterns; use well-tested libraries for complex formats (emails, URLs).
- Lint tools can flag dangerous patterns.

### Level 4 — Prototype pollution

JavaScript objects inherit from `Object.prototype` ({{ch:this-prototypes-classes}}). If code copies user-supplied keys into objects without care — a naive "deep merge" of request JSON into a settings object — a key named `__proto__` can modify the prototype of **every** object in the program:

```ts
function naiveMerge(target: Record<string, unknown>, source: Record<string, unknown>): void {
  for (const key of Object.keys(source)) {
    const value = source[key];
    if (value && typeof value === "object") {
      const existing = (target[key] ?? {}) as Record<string, unknown>;
      naiveMerge(existing, value as Record<string, unknown>);
      target[key] = existing;
    } else {
      target[key] = value;
    }
  }
}

const payload = JSON.parse('{"theme":"dark","__proto__":{"isAdmin":true}}');
const settings: Record<string, unknown> = {};
naiveMerge(settings, payload);

const someUnrelatedUser: { isAdmin?: boolean } = {};
console.log(someUnrelatedUser.isAdmin);
delete (Object.prototype as Record<string, unknown>).isAdmin; // undo the damage for this demo
```

**Output:**

```text
true
```

- `JSON.parse` creates an ordinary property named `"__proto__"` on the payload.
- When the naive merge does `target["__proto__"]`, it reaches the **real prototype** shared by all objects, and copies `isAdmin: true` onto it.
- Now **every** object appears to have `isAdmin: true` — including a brand-new, unrelated one. In a real application, a check such as `if (user.isAdmin)` on an object without its own `isAdmin` property would pass.

Defences: validate input against a schema (which drops unknown keys such as `__proto__`); never merge untrusted objects with hand-written or outdated deep-merge utilities; use `Map` or `Object.create(null)` for dictionaries keyed by user input; keep dependencies updated (several popular libraries have had prototype-pollution vulnerabilities).

## Files and other non-JSON input

Uploaded files need their own checks ({{ch:file-uploads}}):

- **Size**: enforce limits while streaming, not after receiving the whole file.
- **Type**: do not trust the file name's extension or the client's declared `Content-Type`. Check the file's **actual content** — the first bytes of most formats (their "magic numbers") identify them: PDFs start with `%PDF`, PNG images with the bytes `89 50 4E 47`.
- **Content**: images can be re-encoded to strip anything unexpected; archives must be checked for "zip bombs" (tiny files that expand to enormous sizes); documents may need virus scanning.
- **Names**: never use client file names as storage paths ({{ch:nodejs}}).

**CSV and spreadsheet imports**: validate every row with a schema, collect errors with row numbers, and decide whether to reject the whole file or import valid rows. Beware of **formula injection** when exporting data to spreadsheets: a cell beginning with `=`, `+`, `-` or `@` may be executed as a formula by spreadsheet programs; prefix such values when generating exports.

## Validating data from other systems

### Level 4 — Responses from APIs you call

Treat responses from external services as untrusted input too:

```ts
// fragment
const CourierQuote = z.object({
  quoteId: z.string(),
  feePaisa: z.number().int().nonnegative(),
  estimatedDays: z.number().int().min(0).max(30),
});

async function getCourierQuote(city: string): Promise<z.infer<typeof CourierQuote>> {
  const response = await fetch(`https://api.courier.example/quotes?city=${encodeURIComponent(city)}`, {
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error(`Courier API responded ${response.status}`);
  const result = CourierQuote.safeParse(await response.json());
  if (!result.success) {
    // The provider changed their API or returned garbage: fail loudly, do not guess
    throw new Error(`Unexpected courier response: ${JSON.stringify(z.flattenError(result.error).fieldErrors)}`);
  }
  return result.data;
}
```

If the courier changes `feePaisa` to a string, or returns `null`, the error appears **immediately**, at the boundary, with a clear message — instead of `NaN` fees spreading into orders and invoices. This belongs in the **adapter** for that provider ({{ch:design-patterns}}).

### Level 4 — Webhooks and messages

- **Webhooks**: verify the provider's **signature** (usually an HMAC of the raw body with a shared secret — {{ch:authentication}}) before parsing, then validate the payload, then check that the event refers to objects you know. Reject old timestamps to prevent replays.
- **Queue messages**: include a **schema version** in each message; validate on consumption; send messages that fail validation to a "dead-letter" queue for inspection rather than crashing the consumer repeatedly ({{ch:queues}}).

### Level 4 — Validating your own responses

Validating **outgoing** responses against a schema catches a different bug: accidentally returning fields that should stay private (password hashes, internal notes) or breaking the contract with clients. Many teams serialise responses through an explicit response schema or mapping function ({{ch:rest-apis}}), and run contract tests against the OpenAPI specification ({{ch:api-documentation}}).

## The database: the last line of defence

Application validation can be bypassed by bugs, by scripts that write to the database directly, by other services, or by race conditions. **Database constraints** enforce rules no matter how the data arrives ({{ch:database-design}}):

```sql
CREATE TABLE order_lines (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id    BIGINT NOT NULL REFERENCES orders(id),
  product_id  BIGINT NOT NULL REFERENCES products(id),
  quantity    INTEGER NOT NULL CHECK (quantity BETWEEN 1 AND 20),
  unit_price  INTEGER NOT NULL CHECK (unit_price >= 0)
);

CREATE UNIQUE INDEX users_email_unique ON users (lower(email));
```

- `NOT NULL`, **foreign keys** (`REFERENCES`), **`CHECK` constraints** and **unique indexes** reject invalid data at the moment of writing.
- **Uniqueness and availability can only be guaranteed here.** "Is this email already registered?" checked in application code can pass for two simultaneous requests, both of which then insert. The unique index guarantees only one succeeds; the application catches the database error and returns a friendly 409 ({{ch:transactions}}).
- Stock checks are similar: "is there enough stock?" must be enforced in the same transaction as the decrement, or by a constraint, not by a separate read.

The layers complement each other:

```text
  browser validation   → helps users (bypassable)
  API schema           → rejects malformed and out-of-range input; strips unknown fields
  service rules        → business rules that need context (coupon valid, product active)
  database constraints → guarantees that hold under concurrency and for every writer
```

## Reporting validation errors

Validation errors are a conversation with the client. Make them useful:

- **Status**: 400 (or 422 — pick one for the whole API — {{ch:rest-apis}}).
- **Structure**: a stable machine code (`validation_failed`) plus **field-level errors** with a path (`lines[0].quantity`) and a message, in your standard error format.
- **All errors at once**, not one per request, so clients can fix everything in one go.
- **Helpful, safe messages**: say what is expected ("Quantity must be between 1 and 20"), never echo raw input back into HTML (an XSS risk if a client renders it), and do not reveal internal details.
- **Do not reveal existence where it matters**: "Email already registered" on a public sign-up endpoint enables account enumeration ({{ch:frontend-authentication}}).
- **Log** validation failures at a low level, with counts per endpoint. A sudden spike often means a broken client release — or an attack.

## From beginner to enterprise

**Level 3 — first APIs.** A schema for every request body; limits on sizes and numbers; unknown fields stripped; clear 400 responses.

**Level 4 — applications.** Validation middleware for body, query and params; normalisation of emails, phones and text; discriminated unions; validated configuration; database constraints for uniqueness and ranges.

**Level 5 — professional practice.** Shared schemas between client and server ({{ch:forms}}); validated responses from external APIs and webhooks; strict schemas on public APIs; contract tests; ReDoS and prototype-pollution checks in code review and linting.

**Level 6 — large systems.** Schema registries for messages between services, with versioning and compatibility checks ({{ch:event-driven-systems}}); schemas generated from a single source (OpenAPI, Protocol Buffers) across languages; data-quality monitoring on imports and pipelines; input validation as part of security reviews and penetration tests.

## Real-world use cases

### Checkout

- **Body schema**: lines (ids, quantities 1–20), delivery details (normalised phone, city enum), optional coupon (normalised, format-checked); unknown fields stripped.
- **Service rules**: products exist and are active; prices **looked up** from the database; coupon valid for this customer and date; delivery available to the address.
- **Database**: stock decremented in a transaction with a `CHECK (stock >= 0)`; unique idempotency key ({{ch:rest-apis}}).

### A nightly supplier price feed

- **Problem**: a supplier's CSV occasionally contains prices in rupees instead of paisa, negative values, or unknown product codes.
- **Design**: stream the file; validate each row with a schema (code format, price range relative to the current price — a 90% drop is flagged, not applied); collect errors with row numbers; apply only valid rows; email the supplier and the team a report; never let one bad row stop the whole import silently.

## Common mistakes

### Beginner: validating only in the browser

**Fix:** the server validates everything; browser checks are for usability.

### Beginner: no upper limits

Accepting any string length, any quantity, any page size. **Fix:** bounds on everything.

### Beginner: trusting client-sent prices, roles and statuses

**Fix:** look up authoritative values on the server; strip unknown fields.

### Intermediate: deny-lists

"Reject inputs containing `<script>` or `DROP TABLE`". Attackers find a hundred variations. **Fix:** allow-lists for formats; encoding and parameterisation for safety.

### Intermediate: validation without normalisation

Duplicate accounts with differently cased or differently normalised emails. **Fix:** trim, lower-case, Unicode-normalise before validating and storing.

### Intermediate: coercion surprises

Empty strings becoming 0. **Fix:** explicit parsing rules for each field.

### Production: trusting third-party responses and webhooks

**Fix:** verify signatures; validate payloads; fail loudly on unexpected shapes.

### Production: race conditions in uniqueness checks

**Fix:** unique constraints in the database; handle the constraint error.

### Enterprise: dangerous regular expressions and merges

**Fix:** length limits, safe patterns, schema-based parsing, no naive deep merges.

## Debugging and troubleshooting

- **Valid-looking input rejected**: log the full validation error (field path and message) in development; check for coercion, trimming, Unicode or format differences (a non-breaking space looks like a space).
- **Invalid data in the database**: find the write path that bypasses validation — a script, an admin tool, another service — and add a database constraint so it cannot happen again.
- **Clients receive confusing errors**: make sure messages say what is expected and use field paths; test errors as part of API contract tests.
- **Server freezes on certain input**: suspect a regular expression (ReDoS) or a huge/deep payload; profile the request ({{ch:nodejs}}).
- **"Works locally, fails in production" for dates**: time-zone assumptions; always parse with explicit offsets and store UTC.

## How a senior engineer thinks about this

- **Every boundary is a border crossing.** HTTP, files, queues, webhooks, third-party APIs and configuration all get a schema.
- **Parse once, trust after.** Untrusted `unknown` becomes a typed value at the edge; the core never sees raw input.
- **Allow-list, bound everything, normalise first.**
- **Validation is not encoding.** Injection is prevented by parameterisation and context-aware output encoding; validation narrows the attack surface.
- **The database has the final word** on uniqueness, references and invariants under concurrency.
- **Errors are part of the API.** Precise, consistent and safe validation errors make clients better.

## Exercises

### Exercise 1 — Write the schema

**Objective:** practise bounded, allow-listed schemas.
**What to build:** a Zod schema for a product review submission: `productId` (format `prd_` followed by 8–24 letters or digits), `rating` (integer 1–5), `title` (trimmed, 3–80 characters), `body` (trimmed, 10–2,000 characters), `wouldRecommend` (boolean). Unknown fields must be rejected. Show one valid and one invalid parse.

<details>
<summary>Show the solution</summary>

```ts
import { z } from "zod";

const ReviewInput = z.strictObject({
  productId: z.string().regex(/^prd_[A-Za-z0-9]{8,24}$/, "Invalid product id"),
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().min(3).max(80),
  body: z.string().trim().min(10).max(2000),
  wouldRecommend: z.boolean(),
});

const ok = ReviewInput.safeParse({
  productId: "prd_Chaunsa5kg",
  rating: 5,
  title: "  Sweet and fresh ",
  body: "Arrived the same day, perfectly ripe.",
  wouldRecommend: true,
});
console.log(ok.success && ok.data.title);

const bad = ReviewInput.safeParse({ productId: "123", rating: 6, title: "ok", body: "short", wouldRecommend: "yes", verified: true });
if (!bad.success) console.log(bad.error.issues.map((i) => i.path.join(".") || "(root)"));
```

**Output:**

```text
Sweet and fresh
[ 'productId', 'rating', 'title', 'body', 'wouldRecommend', '(root)' ]
```

**Walkthrough:** every field has both lower and upper bounds; the title is trimmed before its length is checked; `strictObject` rejects the unknown `verified` field (reported at the root, because it is a problem with the object, not a field). The review text is **not** "sanitised" here — it is stored as typed and **escaped when displayed** ({{ch:html}}), so legitimate text such as "I <3 these mangoes" survives intact.

</details>

### Exercise 2 — Find the validation holes

**Objective:** practise reviewing validation.
**Starting point:**

```ts
// fragment
app.post("/transfer", async (req, res) => {
  const { fromAccount, toAccount, amount } = req.body;
  if (!amount) return res.status(400).json({ error: "amount required" });
  if (amount.toString().includes("-")) return res.status(400).json({ error: "no negatives" });
  await db.query(`UPDATE accounts SET balance = balance - ${amount} WHERE id = '${fromAccount}'`);
  await db.query(`UPDATE accounts SET balance = balance + ${amount} WHERE id = '${toAccount}'`);
  res.json({ ok: true });
});
```

**What to do:** list every problem and outline a correct version.

<details>
<summary>Show the solution</summary>

**Problems:**
1. No schema: `amount` could be a string, an array, an object, `NaN`, a float with fractions of paisa, or astronomically large.
2. Negative check by searching for `-` is a deny-list (`"1e2"`, `" 5"`, `"0x10"` all behave unexpectedly); zero passes the "required" check only by accident.
3. **SQL injection**: values interpolated into SQL strings.
4. **No authorisation**: nothing checks that the caller owns `fromAccount` ({{ch:rest-apis}} — BOLA).
5. **No balance check**: the account can go negative.
6. **No transaction**: if the second update fails, money disappears ({{ch:transactions}}).
7. No idempotency key: a retry transfers twice.
8. `fromAccount === toAccount` not prevented.

**Outline:**

```ts
// fragment
const Transfer = z.strictObject({
  toAccount: z.string().regex(/^acc_[A-Za-z0-9]{10,24}$/),
  amountPaisa: z.number().int().min(100).max(50_000_000),
});

app.post("/transfers", requireAuth, idempotent, validate("body", Transfer), async (_req, res) => {
  const { toAccount, amountPaisa } = res.locals.body;
  const from = res.locals.user.accountId;                     // from the session, not the body
  if (from === toAccount) throw new AppError(400, "Cannot transfer to the same account");
  await db.transaction(async (tx) => {
    const debited = await tx.query(
      "UPDATE accounts SET balance = balance - $1 WHERE id = $2 AND balance >= $1",
      [amountPaisa, from],
    );
    if (debited.rowCount !== 1) throw new AppError(409, "Insufficient funds");
    const credited = await tx.query("UPDATE accounts SET balance = balance + $1 WHERE id = $2", [amountPaisa, toAccount]);
    if (credited.rowCount !== 1) throw new AppError(404, "Destination account not found");
  });
  res.status(201).json({ status: "completed" });
});
```

Validation, authorisation from the session, parameterised queries, a balance condition inside the update, a transaction, and idempotency each close a different hole.

</details>

### Exercise 3 — Debug the duplicate accounts

**Objective:** practise normalisation and constraints.
**The scenario:** the support team finds customers with two or three accounts: `Sara@Example.com`, `sara@example.com` and ` sara@example.com` (with a leading space). The sign-up code checks `SELECT 1 FROM users WHERE email = $1` before inserting. Explain all the causes and fix them.

<details>
<summary>Show the solution</summary>

**Causes:**
1. **No normalisation**: case and surrounding spaces differ, so the existence check does not match.
2. **Race condition**: even with identical emails, two simultaneous sign-ups (a double click) can both pass the check before either inserts.
3. **No database constraint** to stop either.

**Fixes:**
- Normalise in the schema: `z.string().trim().toLowerCase().pipe(z.email())` (and Unicode-normalise with NFC).
- Add a unique index on the normalised value: `CREATE UNIQUE INDEX users_email_unique ON users (lower(email));` (or store an already-normalised column).
- Insert directly and handle the unique-violation error as a friendly response — with care about enumeration, for example "If this address is new, check your inbox to confirm".
- Clean up existing duplicates with a migration that merges accounts (carefully — orders and addresses must be re-linked), then apply the index.

</details>

### Exercise 4 — Production scenario: harden a webhook

**Objective:** apply boundary validation to a third-party integration.
**The scenario:** your payment provider calls `POST /webhooks/payments` with events such as `payment.succeeded`. Currently, the handler parses the JSON and marks the referenced order as paid. Describe a hardened design.

<details>
<summary>Show the solution</summary>

1. **Raw body and signature first**: read the raw body (not the JSON-parsed one) and verify the provider's HMAC signature with the shared secret using a constant-time comparison; reject with 400 if invalid. Without this, anyone can mark orders as paid.
2. **Replay protection**: reject events whose signed timestamp is too old (for example, more than 5 minutes), and record processed event ids so each is handled once (idempotent processing).
3. **Schema validation**: a discriminated union on the event `type`; for `payment.succeeded`, require the payment id, order reference, amount and currency in the expected formats.
4. **Semantic checks**: the order exists; it is awaiting payment; the **amount and currency match** the order's total (otherwise flag for review — someone may have paid a smaller amount); optionally fetch the payment from the provider's API to confirm its status.
5. **Respond quickly** (200) after storing the event, and process it asynchronously in a job, so the provider does not time out and retry ({{ch:queues}}).
6. **Logging and alerting**: log signature failures and unexpected event shapes; alert on spikes.
7. **Unknown event types**: acknowledge and ignore (or store) them, so new provider features do not break your endpoint.

</details>

## Summary

Never trust input: every piece of data crossing a **trust boundary** — HTTP requests (body, query, params, headers, cookies, files), webhooks, queue messages, third-party API responses, configuration — must be checked. Browser validation helps users; **server validation** protects correctness and security.

Prefer **parsing** to scattered checks: turn `unknown` input into a trusted, typed value with a **schema**, at the boundary, and work only with the result. Make schemas **allow-lists** with bounds on every field, normalise inside them (trim, case, Unicode), strip or reject unknown fields to prevent mass assignment, and use discriminated unions and refinements for variants and cross-field rules. Remember that validation is not the same as **output encoding** or **parameterised queries**, which are what actually prevent XSS and injection.

Watch for the traps: coercion turning empty strings into zero, `NaN` and unsafe integers, floating-point money, Unicode forms and lengths, ambiguous dates, unverified emails, regular expressions vulnerable to **ReDoS**, and **prototype pollution** from naive merges. Validate files by content, imports row by row, external responses and webhooks (after verifying signatures) and queue messages with versions. Rely on **database constraints** — not-null, foreign keys, checks and unique indexes — as the last line of defence, especially for uniqueness under concurrency. Report errors consistently, completely and safely.

## Key terms

- **Input validation** — Checking that incoming data meets the rules it must satisfy and rejecting it otherwise.
- **Trust boundary** — A point where data moves from a less trusted source into a more trusted part of a system.
- **Syntactic validation** — Checking the form of data, such as its type, format and length.
- **Semantic validation** — Checking whether data makes sense in context, such as whether a date is in the future or a product exists.
- **Parse, don't validate** — The practice of converting untrusted input into a trusted, typed value at the boundary rather than checking it and continuing to use the raw value.
- **Normalisation** — Converting equivalent representations of data into one standard form.
- **Unicode normalisation** — Converting text to a standard sequence of code points, such as NFC, so that visually identical strings compare equal.
- **Sanitisation** — Removing or modifying potentially dangerous parts of input.
- **Output encoding** — Converting data so that it is treated as data, not code, in the context where it is used.
- **Allow-list** — A definition of exactly what is permitted, rejecting everything else.
- **Deny-list** — A definition of what is forbidden, allowing everything else; generally weaker than an allow-list.
- **Coercion** — Automatically converting a value from one type to another before validation.
- **Strict schema** — A schema that rejects objects containing keys it does not define.
- **Discriminated union** — A set of alternative shapes selected by the value of one shared field.
- **ReDoS** — A denial-of-service attack exploiting regular expressions that take extremely long on crafted input.
- **Prototype pollution** — An attack that modifies `Object.prototype` through user-controlled keys such as `__proto__`, affecting all objects.
- **Magic number (file)** — The first bytes of a file that identify its format.
- **Formula injection** — An attack in which spreadsheet programs execute data beginning with characters such as `=` as formulas.
- **Webhook signature** — A cryptographic value proving that a webhook request came from the expected sender and was not altered.
- **Database constraint** — A rule enforced by the database, such as not-null, a foreign key, a check or a unique index.
- **Unique constraint** — A database rule preventing two rows from having the same value in specified columns.

## What comes next

Validation decides what to reject; the next question is how a server **fails well**. The next chapter, {{ch:error-handling}}, covers the different kinds of errors a back end meets — invalid input, missing resources, conflicts, failing dependencies, bugs — and how to classify, propagate, report and recover from them: consistent error responses, retries with backoff, timeouts, circuit breakers, and errors that make production problems quick to diagnose.
