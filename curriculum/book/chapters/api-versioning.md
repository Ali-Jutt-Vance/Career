# API Versioning

> [!GOALS]
> - Explain why changing an API in use is risky, and who gets hurt when it breaks.
> - Tell **breaking** changes from **non-breaking** ones, including the subtle cases.
> - Evolve APIs **without** new versions wherever possible: additive changes, tolerant readers and expand–contract.
> - Compare versioning strategies — **URL path**, **headers**, **media types**, **date-based versions** — and choose one.
> - Implement versions cleanly: one domain model, a representation per version, and version transformations.
> - **Deprecate** and **sunset** old versions with standard headers, usage tracking and communication.
> - Apply the same thinking to GraphQL schemas, events and mobile apps.

## Why this matters

Once an API has clients, every change is a negotiation with people you may never meet. The shop's web front end is easy to update — you deploy it together with the back end. But the iOS and Android apps installed on customers' phones update only when the customer chooses; some phones will run a two-year-old version of the app. Partners such as delivery companies built integrations against your API last year and have no plan to touch them again. An analytics team's nightly script reads your order data.

Rename one field — `customerName` to `customer.name` — and every one of those clients may break at once: blank screens in old apps, failed deliveries, a broken report. Nobody gets warned, because nobody knew they depended on that exact field name.

**API versioning** and, more broadly, **API evolution** are the practices that let an API change while keeping its promises to existing clients. The best API teams make breaking changes rarely, deliberately and with long notice, and make most improvements in ways that break nobody. This chapter shows how.

## The simple idea

Think of an electrical socket. Its shape is a promise: any plug made for it will fit, for decades. The power company can upgrade the power stations, the cables and the meters, as long as the socket stays the same. When a country does change its socket standard, it does not swap every socket overnight; it installs new ones beside the old, sells adapters, and gives people years to change.

An API is a socket for software. The implementation behind it may change completely; the **contract** — URLs, fields, types, meanings, error formats — is the promise. Versioning is how you introduce a new socket beside the old one, with adapters and a long, announced transition.

> [!ANALOGY]
> An API contract is like an electrical socket: what's behind the wall can change freely, but the socket's shape is a promise every plug depends on. A new version is a new socket installed beside the old one, with adapters and a long transition period.
>
> **Where the analogy breaks:** a socket's promise is purely physical and obvious. An API's promise includes things nobody wrote down — the order of items in a list, how fast it responds, which error appears when, whether a field can be null. Clients come to depend on such accidental behaviour, so changes that look harmless can still break someone. That is why monitoring real usage matters as much as the written contract.

## The proper definition and key words

**API versioning** is the practice of identifying and maintaining distinct versions of an API contract so that clients can continue using the version they were built for while the API evolves.

Key words:

- **Contract** — everything clients rely on: endpoints, methods, fields, types, meanings, status codes, error formats, authentication and limits.
- **Breaking change** — a change that can make existing, correctly written clients fail.
- **Non-breaking (additive) change** — a change that existing clients can safely ignore.
- **Backward compatibility** — a new version of the server still works for old clients.
- **Tolerant reader** — a client that reads only what it needs and ignores unknown data.
- **Expand–contract** (parallel change) — adding the new form alongside the old, migrating clients, then removing the old form.
- **Deprecation** — announcing that something should no longer be used and will be removed.
- **Sunset** — the date after which a deprecated version or endpoint stops working.
- **Version pinning** — a client (or account) fixed to a specific API version.
- **Hyrum's law** — "with a sufficient number of users of an API, all observable behaviours of your system will be depended on by somebody."

## What breaks clients

### Level 1 — Breaking and non-breaking changes

| Usually **non-breaking** | **Breaking** |
|---|---|
| Adding a new endpoint | Removing or renaming an endpoint |
| Adding a new **optional** field to a response | Removing or renaming a response field |
| Adding a new **optional** request parameter or field | Making an optional request field **required** |
| Adding a new error code for a new situation | Changing a field's type (number → string) or format (date format) |
| Relaxing validation (accepting longer names) | Tightening validation (shorter maximum length) |
| Performance improvements | Changing the meaning of a field (price now includes tax) |
| | Changing status codes or the error response format |
| | Changing authentication, pagination style or default sort order |

The rule of thumb: **if a correctly written existing client could fail or behave wrongly without changing its code, the change is breaking.**

### Level 2 — The subtle cases

Some "additions" break clients that are not as tolerant as they should be:

- **New enum values.** Adding `RETURNED` to `status` is technically additive, but a mobile app with a `switch` that crashes on unknown values will fail. Document from the start that enums may grow, and that clients must handle unknown values.
- **New fields in strictly validated responses.** Clients whose JSON decoding rejects unknown fields break on any addition.
- **Nullability.** A field that was always present and now may be `null` or missing breaks clients that assumed it.
- **Ordering and defaults.** Changing the default sort order or page size changes results without changing any field.
- **Behaviour, timing and limits.** Lower rate limits, slower responses or stricter timeouts break integrations as surely as renamed fields (Hyrum's law).

A simple tool can classify differences between two versions of a response shape:

```ts
// Compare two versions of a response shape and classify every difference
type Field = { type: string; required: boolean; values?: string[] };   // values: for enums
type Shape = Record<string, Field>;

function diff(before: Shape, after: Shape): { breaking: string[]; safe: string[] } {
  const breaking: string[] = [], safe: string[] = [];
  for (const [name, old] of Object.entries(before)) {
    const now = after[name];
    if (!now) { breaking.push(`removed field "${name}"`); continue; }
    if (now.type !== old.type) breaking.push(`"${name}" changed type ${old.type} → ${now.type}`);
    if (old.required && !now.required) breaking.push(`"${name}" may now be missing (clients expect it)`);
    const added = (now.values ?? []).filter((v) => !(old.values ?? []).includes(v));
    if (added.length) breaking.push(`"${name}" has new enum values ${added.join(", ")} (strict clients may fail)`);
  }
  for (const name of Object.keys(after)) if (!before[name]) safe.push(`added field "${name}"`);
  return { breaking, safe };
}

const orderV1: Shape = {
  id: { type: "string", required: true },
  total: { type: "number", required: true },
  status: { type: "enum", required: true, values: ["PAID", "SHIPPED"] },
  customerName: { type: "string", required: true },
};
const orderNext: Shape = {
  id: { type: "string", required: true },
  total: { type: "string", required: true },                       // "59.90" to avoid float rounding
  status: { type: "enum", required: true, values: ["PAID", "SHIPPED", "RETURNED"] },
  customer: { type: "object", required: true },
  currency: { type: "string", required: true },
};

console.log(diff(orderV1, orderNext));
```

**Output:**

```text
{
  breaking: [
    '"total" changed type number → string',
    '"status" has new enum values RETURNED (strict clients may fail)',
    'removed field "customerName"'
  ],
  safe: [ 'added field "customer"', 'added field "currency"' ]
}
```

Real tools do this for complete OpenAPI or GraphQL schemas (for example, `oasdiff` for OpenAPI, and schema checks in GraphQL registries), and run in CI so a breaking change cannot be merged by accident ({{ch:api-documentation}}, {{ch:cicd}}).

## Evolving without new versions

### Level 2 — Prefer additive change

Most improvements can be made without a new version:

- Need a structured customer object? **Add** `customer` alongside `customerName`; keep both.
- Need money as a string? **Add** `totalAmount` (string) and `currency` beside `total`.
- Need a new behaviour? Add an **optional** parameter whose default keeps the old behaviour.

This costs some duplication in responses, but no client breaks, and there is no version to maintain. Many large APIs went years without a new major version by being disciplined about this.

### Level 3 — Expand, migrate, contract

When something really must change, do it in phases — the same pattern used for database migrations ({{ch:database-design}}):

1. **Expand** — add the new field or endpoint beside the old; the server supports both.
2. **Migrate** — update your own clients; announce the change; track who still uses the old form.
3. **Contract** — once usage of the old form reaches (near) zero, or after the announced deadline, remove it.

Each phase is deployed separately and is safe on its own. Removal is the only breaking step, and it happens when it hurts nobody — or after everybody had fair warning.

### Level 3 — Tolerant readers

Compatibility is a two-way street. Clients — including your own front ends and mobile apps — should be **tolerant readers**: read only the fields they need, ignore unknown fields, and handle unknown enum values gracefully:

```ts
// A tolerant reader: a client that keeps working when the API adds things
type OrderView = { id: string; total: string; status: "paid" | "shipped" | "other"; statusLabel: string };

function readOrder(raw: unknown): OrderView {
  if (typeof raw !== "object" || raw === null) throw new Error("order: expected an object");
  const o = raw as Record<string, unknown>;
  if (typeof o.id !== "string") throw new Error("order: id missing");          // only what we truly need
  const known: Record<string, "paid" | "shipped" | undefined> = { PAID: "paid", SHIPPED: "shipped" };
  const status = known[String(o.status)] ?? "other";                           // unknown values don't crash
  const amount = typeof o.total === "object" && o.total !== null ? (o.total as { amount?: unknown }).amount : o.total;
  return {
    id: o.id,
    total: amount === undefined ? "—" : String(amount),
    status,
    statusLabel: status === "other" ? String(o.status ?? "unknown") : status,
  };
}

const responses = [
  { id: "1042", total: 59.9, status: "SHIPPED" },
  { id: "1043", total: { amount: "12.50", currency: "GBP" }, status: "PAID", giftWrap: true, loyaltyPoints: 12 },
  { id: "1044", total: { amount: "8.00", currency: "GBP" }, status: "RETURNED" },
];
for (const r of responses) console.log(readOrder(r));
```

**Output:**

```text
{
  id: '1042',
  total: '59.9',
  status: 'shipped',
  statusLabel: 'shipped'
}
{ id: '1043', total: '12.50', status: 'paid', statusLabel: 'paid' }
{ id: '1044', total: '8.00', status: 'other', statusLabel: 'RETURNED' }
```

- New fields (`giftWrap`, `loyaltyPoints`) are simply ignored.
- The unknown status `RETURNED` becomes `"other"` with its raw label shown, instead of crashing the screen.
- The reader even copes with both the old numeric `total` and a newer object form — useful during an expand–contract transition.

Mobile apps especially should be built this way from their first release, because old versions live on for years. Many teams also add a **minimum supported app version** check, so the API can tell very old apps to update.

## Versioning strategies

### Level 2 — Where the version goes

| Strategy | Example | Strengths | Weaknesses |
|---|---|---|---|
| **URL path** | `GET /api/v2/orders/1042` | Visible in logs, browsers and docs; easy to route at proxies; simple for everyone | Versions the whole API at once; URLs change between versions |
| **Custom header** | `X-API-Version: 2` or `Api-Version: 2026-03-15` | Clean URLs; versions can be fine-grained | Invisible in a browser; easy to forget; caches must vary on the header |
| **Media type** (content negotiation) | `Accept: application/vnd.cornershop.v2+json` | Fits HTTP's design; can version per resource | Unfamiliar to many developers; tooling support varies |
| **Query parameter** | `GET /orders/1042?version=2` | Easy to try | Easy to drop; mixes versioning into resource identity |
| **Subdomain** | `https://v2.api.cornershop.example` | Complete separation, even of infrastructure | DNS, TLS and deployment overhead |

**URL path versioning with a major version (`/v1`, `/v2`) is the most common choice** and the safest default: everyone understands it, and routing is trivial. Header-based **date versions** (below) are a strong alternative for APIs that change often.

Whatever you choose, **version only for breaking changes**, and use major versions rarely. A `v7` in five years means clients have been forced through six painful migrations.

### Level 3 — Implementing path versions

The key design rule: **one domain model and one set of business logic; a separate representation per version.** Do not copy the whole application for `v2`. Here an Express application serves both versions from the same data, marks `v1` as deprecated, and returns `410 Gone` for a removed endpoint:

```ts
import express, { type Request, type Response, type NextFunction } from "express";
import type { AddressInfo } from "node:net";

type Order = { id: string; amountMinor: number; currency: string; status: string; customer: { id: string; name: string } };
const orders = new Map<string, Order>([["1042", { id: "1042", amountMinor: 5990, currency: "GBP", status: "SHIPPED", customer: { id: "c1", name: "Sara" } }]]);

// One domain model; one representation per version
const present = {
  v1: (o: Order) => ({ id: o.id, total: o.amountMinor / 100, status: o.status, customerName: o.customer.name }),
  v2: (o: Order) => ({ id: o.id, total: { amount: (o.amountMinor / 100).toFixed(2), currency: o.currency }, status: o.status, customer: o.customer }),
};

function deprecated(sunset: Date, successor: string) {
  return (_req: Request, res: Response, next: NextFunction) => {
    res.set("Deprecation", `@${Math.floor(Date.UTC(2026, 5, 1) / 1000)}`);   // RFC 9745: deprecated since 1 June 2026
    res.set("Sunset", sunset.toUTCString());                                // RFC 8594: stops working after this
    res.set("Link", `<${successor}>; rel="successor-version"`);
    next();
  };
}

const v1 = express.Router();
v1.use(deprecated(new Date(Date.UTC(2027, 0, 31, 23, 59, 59)), "/api/v2/orders"));
v1.get("/orders/:id", (req, res) => {
  const order = orders.get(req.params.id);
  return order ? res.json(present.v1(order)) : res.status(404).json({ error: "not found" });
});
v1.get("/orders/:id/invoice.xml", (_req, res) =>
  res.status(410).json({ error: "Removed. Use GET /api/v2/orders/{id}/invoice (PDF).", docs: "https://docs.cornershop.example/migrate-v2" }));

const v2 = express.Router();
v2.get("/orders/:id", (req, res) => {
  const order = orders.get(req.params.id);
  return order ? res.json(present.v2(order)) : res.status(404).json({ error: "not found" });
});

const app = express();
app.use("/api/v1", v1);
app.use("/api/v2", v2);
const server = app.listen(0);
await new Promise((r) => server.once("listening", r));
const base = `http://localhost:${(server.address() as AddressInfo).port}`;

for (const path of ["/api/v1/orders/1042", "/api/v2/orders/1042", "/api/v1/orders/1042/invoice.xml"]) {
  const res = await fetch(base + path);
  console.log(`GET ${path} → ${res.status}`);
  for (const h of ["deprecation", "sunset", "link"]) if (res.headers.get(h)) console.log(`  ${h}: ${res.headers.get(h)}`);
  console.log("  " + (await res.text()));
}
server.close();
```

**Output:**

```text
GET /api/v1/orders/1042 → 200
  deprecation: @1780272000
  sunset: Sun, 31 Jan 2027 23:59:59 GMT
  link: </api/v2/orders>; rel="successor-version"
  {"id":"1042","total":59.9,"status":"SHIPPED","customerName":"Sara"}
GET /api/v2/orders/1042 → 200
  {"id":"1042","total":{"amount":"59.90","currency":"GBP"},"status":"SHIPPED","customer":{"id":"c1","name":"Sara"}}
GET /api/v1/orders/1042/invoice.xml → 410
  deprecation: @1780272000
  sunset: Sun, 31 Jan 2027 23:59:59 GMT
  link: </api/v2/orders>; rel="successor-version"
  {"error":"Removed. Use GET /api/v2/orders/{id}/invoice (PDF).","docs":"https://docs.cornershop.example/migrate-v2"}
```

- Both versions read the **same** `Order`; only the `present.v1` and `present.v2` functions differ. Bug fixes and new business rules apply to both automatically.
- `v2` stores money as an integer number of pence internally and presents it as a string with a currency — the change that motivated `v2`, since floating-point money causes rounding errors.
- Every `v1` response carries the standard headers: **`Deprecation`** (RFC 9745; the value is the Unix time of when deprecation began), **`Sunset`** (RFC 8594; when it will stop working) and a **`Link`** to the successor. Client libraries and API gateways can detect these and warn developers.
- A removed endpoint returns **`410 Gone`** with a helpful message and documentation link, instead of a confusing `404`.

In NestJS, versioning is built in: `app.enableVersioning({ type: VersioningType.URI })` and `@Controller({ path: "orders", version: "2" })` or `@Version("2")` on individual methods; header and media-type versioning are also supported ({{ch:nestjs-advanced}}).

### Level 4 — Date-based versions and version transforms

Some large API providers use **date-based versions** sent in a header — Stripe (`Stripe-Version: 2024-06-20`) and GitHub's REST API (`X-GitHub-Api-Version: 2022-11-28`) are well-known examples. Each account or request is pinned to a version; new accounts get the latest. Internally, the code produces only the **latest** response shape, and a chain of small **version changes** converts it back, step by step, to whatever version the client is pinned to:

```ts
// Date-based versions: the code always produces the LATEST shape,
// then "version changes" are undone one by one, newest first, down to the client's version.
type Json = Record<string, unknown>;
type VersionChange = { version: string; description: string; downgrade: (body: Json) => Json };

const CHANGES: VersionChange[] = [                     // newest first
  {
    version: "2026-09-01",
    description: "customer is now an object instead of customer_id",
    downgrade: ({ customer, ...rest }) => ({ ...rest, customer_id: (customer as { id: string }).id }),
  },
  {
    version: "2026-03-15",
    description: "amount is now a string in major units instead of an integer in pence",
    downgrade: ({ amount, ...rest }) => ({ ...rest, amount: Math.round(Number(amount) * 100) }),
  },
];
const LATEST = "2026-09-01";

function render(latestBody: Json, clientVersion: string): Json {
  let body = latestBody;
  for (const change of CHANGES) {
    if (change.version > clientVersion) body = change.downgrade(body);   // ISO dates compare as strings
  }
  return body;
}

const latest: Json = { id: "ord_1042", amount: "59.90", currency: "gbp", customer: { id: "cus_7", name: "Sara" } };
for (const version of [LATEST, "2026-05-01", "2025-11-20"]) {
  console.log(version.padEnd(10), JSON.stringify(render(latest, version)));
}
```

**Output:**

```text
2026-09-01 {"id":"ord_1042","amount":"59.90","currency":"gbp","customer":{"id":"cus_7","name":"Sara"}}
2026-05-01 {"id":"ord_1042","amount":"59.90","currency":"gbp","customer_id":"cus_7"}
2025-11-20 {"id":"ord_1042","currency":"gbp","customer_id":"cus_7","amount":5990}
```

- A client pinned to `2026-05-01` gets the latest shape with only the newer change undone (`customer_id` instead of `customer`).
- A client pinned to `2025-11-20` gets both changes undone — including `amount` as an integer in pence.
- The business logic exists **once**. Each breaking change is a small, documented, testable transformation, and clients upgrade one change at a time on their own schedule, reading a changelog of exactly what changed.

The cost is discipline: every breaking change must come with its transformation (for requests as well as responses), and the chain must be tested. For APIs with many external clients and frequent change, it is a very effective model.

## Deprecation and sunset

### Level 3 — Retiring an old version responsibly

1. **Decide and document** what is deprecated, why, what replaces it, and the sunset date. For external APIs, give months — often six to twelve, longer for enterprise customers or mobile apps.
2. **Signal it in the API**: `Deprecation`, `Sunset` and `Link` headers; deprecation flags in OpenAPI (`deprecated: true`) and GraphQL (`@deprecated(reason: "...")`).
3. **Measure usage**: log the version (and endpoint) for every request with the client or API key; build a dashboard of who still calls deprecated versions ({{ch:monitoring}}).
4. **Communicate directly**: emails to the developers of remaining clients, notices in the developer portal and changelog, and migration guides with before-and-after examples.
5. **Brownouts** (optional): shortly before the sunset, briefly disable the old version for short, announced periods. Clients who missed every notice discover the problem while there is still time.
6. **Sunset**: return `410 Gone` with a link to the migration guide. Keep monitoring for stragglers and support requests.

Internal APIs deserve the same respect at a faster pace: your own mobile app versions in the wild are external clients in practice.

## Beyond REST endpoints

- **GraphQL** usually avoids numbered versions: fields are added freely, old ones marked `@deprecated`, field-level usage tracked, and fields removed once unused ({{ch:graphql}}).
- **Events and messages** are contracts too. Consumers of `order.placed` events may be other teams' services; evolve event schemas additively, version event types for breaking changes (`order.placed.v2`), and use a schema registry with compatibility checks for large systems ({{ch:event-driven-systems}}).
- **Webhooks** sent to partners need the same care, often tied to the partner's pinned API version.
- **SDKs** published for your API follow semantic versioning: breaking changes require a new major SDK version.
- **Infrastructure routing**: an API gateway or reverse proxy can route `/v1` and `/v2` to different deployments during a large rewrite ({{ch:api-gateway}}) — useful temporarily, but running two codebases for long is expensive.

## From beginner to enterprise

**Level 1–2 — first API changes.** Knowing breaking from non-breaking changes; adding instead of renaming; `/v1` in URLs from the start.

**Level 3 — safe evolution.** Expand–contract; tolerant readers in your own clients; one domain model with per-version presenters; deprecation headers; `410 Gone` for removed endpoints.

**Level 4 — production APIs.** Breaking-change detection on OpenAPI or GraphQL schemas in CI; version usage dashboards per client; documented deprecation policies with notice periods; minimum supported mobile app versions.

**Level 5 — professional practice.** Date-based versions with version-change transformations; per-account version pinning; brownouts before sunsets; migration guides and changelogs as part of every change.

**Level 6 — enterprises.** API governance programmes and style guides; contract testing between many teams (consumer-driven contracts); schema registries for events; contractual compatibility commitments to enterprise customers.

## Real-world use cases

### Moving money from floats to strings

- **Problem**: `total: 59.9` as a float causes rounding errors in partners' accounting systems.
- **Plan**: add `totalAmount: "59.90"` and `currency: "GBP"` next to `total` (non-breaking); update documentation and SDKs to use the new fields; mark `total` deprecated; contact the partners whose integrations still use it; then, in the next major version, remove `total`.

### Keeping old mobile apps working

- **Problem**: 8% of users run app versions more than a year old.
- **Plan**: tolerant readers in the app from now on; the API never removes fields the oldest supported app reads; the app sends its version in a header; the API returns a "please update" response for versions below the minimum, which is raised only after usage of those versions falls below an agreed threshold.

## Common mistakes

### Beginner: renaming fields "to be cleaner"

**Fix:** add the new name, deprecate the old, remove only after migration.

### Beginner: versioning for every change

**Consequence:** many versions to maintain, tired clients. **Fix:** version only for breaking changes; prefer additive changes.

### Beginner: no version at all in the first release

**Consequence:** no clean way to introduce a breaking change later. **Fix:** start with `/v1` (or a version header) from day one.

### Intermediate: copying the codebase for a new version

**Consequence:** bugs fixed in one version but not the other. **Fix:** one domain model; per-version presenters or transformations.

### Intermediate: assuming additive changes are always safe

**Fix:** document that clients must ignore unknown fields and handle unknown enum values; test your own clients against that.

### Intermediate: silent removal

**Consequence:** partners discover breakage in production. **Fix:** deprecation headers, usage tracking, direct communication, sunset dates, `410 Gone`.

### Production: no usage data

**Consequence:** nobody knows whether removing `v1` is safe. **Fix:** log version and client identity on every request.

## Debugging and troubleshooting

- **A client broke after a "non-breaking" release**: compare the schemas (a diff tool), check enum additions, nullability and default ordering; look for clients that reject unknown fields.
- **Responses differ between environments for the same version**: version routing or default version configured differently; header versioning without `Vary` causing a cache to serve the wrong version ({{ch:caching}}).
- **Cannot tell who still uses v1**: requests lack client identification — require API keys or client ids, and add the version to access logs.
- **A deprecated endpoint is still heavily used near its sunset**: check whether a single large client accounts for most calls and contact them; consider brownouts and a short extension rather than breaking a major partner.

## Security summary

- **Old versions are attack surface.** Security fixes must reach every supported version; sunset versions that cannot be kept secure.
- Apply the **same authentication, authorisation, validation and rate limits** to all versions — shared domain logic makes this automatic.
- Do not let old versions bypass newer protections (for example, an old endpoint without the new ownership check).
- Removing a version must also remove its routes, keys and documentation, not just hide them.

## How a senior engineer thinks about this

- **The contract is a promise to people you cannot see.** Changes are designed from the client's point of view.
- **The best version is the one you never have to create.** Additive change, expand–contract and tolerant readers handle most evolution.
- **When breaking is necessary, make it cheap**: one domain model, small transformations, clear changelogs and long notice.
- **Data beats guessing.** Usage per version, endpoint and client decides when something can be removed.
- **Every observable behaviour is part of the contract in practice** (Hyrum's law), so even internal refactors are checked against what clients actually see.

## Exercises

### Exercise 1 — Classify the changes

**Objective:** practise recognising breaking changes.
**What to do:** classify each change to the orders API as breaking or non-breaking, and for breaking ones suggest a non-breaking alternative: (1) add `estimatedDelivery` to order responses; (2) rename `qty` to `quantity` in line items; (3) make `phone` required when creating an order; (4) add `RETURNED` to the `status` enum; (5) change the default sort from oldest-first to newest-first; (6) accept product names up to 200 characters instead of 100; (7) change `createdAt` from `"2026-11-20 10:07"` to ISO 8601 `"2026-11-20T10:07:00Z"`.

<details>
<summary>Show the solution</summary>

1. **Non-breaking** — a new optional field.
2. **Breaking** — clients reading `qty` get nothing. Alternative: add `quantity`, keep `qty`, deprecate it, remove later.
3. **Breaking** — existing clients that do not send `phone` start failing. Alternative: keep it optional; ask for it in the UI; require it only in a new version or for new clients.
4. **Technically additive, practically risky** — strict clients may crash. Announce in advance; ensure your own clients handle unknown values; consider whether old clients should see `RETURNED` mapped to an existing status during a transition.
5. **Breaking** — same request, different results (pagination and "latest order" logic change). Alternative: add a `sort` parameter with the old default; change defaults only in a new version.
6. **Non-breaking for requests** — accepting more is safe — **but** responses may now contain longer names that break clients with fixed-width layouts or database columns. Announce it.
7. **Breaking** — parsers expecting the old format fail. Alternative: add `createdAtIso` (or use ISO 8601 from the very first version — always the best choice).

</details>

### Exercise 2 — Plan a migration with expand–contract

**Objective:** practise phased change.
**What to do:** the API returns `address` as a single string (`"12 High St, Leeds LS1 4AB"`). You need structured addresses (`line1`, `city`, `postcode`, `country`) for a new delivery partner. Plan the change with expand–contract, for both responses and requests (creating orders).

<details>
<summary>Show the solution</summary>

**Expand**
1. Store addresses in structured form internally; keep generating the single string from the parts.
2. **Responses**: add `shippingAddress: { line1, line2, city, postcode, country }` next to `address`.
3. **Requests**: accept **either** the old `address` string (parsed as best as possible, flagged for review if parsing is uncertain) **or** the new structured object; if both are sent, the structured one wins.

**Migrate**
4. Update your web and mobile clients to send and read the structured form; update SDKs and documentation; mark `address` as deprecated in OpenAPI.
5. Track which clients still send the string form or read responses without using the new field (where measurable — at least by API key and app version).
6. Contact remaining API clients with a migration guide and a sunset date.

**Contract**
7. After the sunset date (and when usage is near zero), stop accepting the string in requests (`400` with a clear message) and remove `address` from responses — in the next major version, or under the published deprecation policy.

</details>

### Exercise 3 — Choose a strategy

**Objective:** practise matching versioning strategies to situations.
**What to do:** recommend a versioning approach for: (a) an internal API used only by your own web app, deployed together; (b) a public API for thousands of small online shops, changing a few times a year; (c) a payments API used by large enterprises who integrate once and rarely touch their code; (d) events published to other teams' services.

<details>
<summary>Show the solution</summary>

- **(a)** Little or no formal versioning: deploy front end and back end together, use additive changes and expand–contract for anything else. (If a mobile app is added later, treat it as an external client.)
- **(b)** URL path major versions (`/v1`), additive changes within a version, deprecation headers and a 12-month sunset policy for removals, breaking-change checks in CI, clear changelog.
- **(c)** Date-based versions with per-account pinning and version-change transformations, so each enterprise stays on its version until it chooses to upgrade; long support windows; direct account management for migrations.
- **(d)** Additive schema evolution with a schema registry enforcing backward compatibility; new event types (`order.placed.v2`) for breaking changes, published in parallel with the old type until consumers migrate.

</details>

### Exercise 4 — Production scenario: the forgotten partner

**Objective:** practise handling deprecation in the real world.
**The scenario:** `v1` of your API has a sunset date in three weeks. Usage dashboards show that 97% of traffic has moved to `v2`, but the remaining 3% comes almost entirely from one large delivery partner whose integration is critical for deliveries. Emails to their technical contact have gone unanswered. What do you do?

<details>
<summary>Show the solution</summary>

1. **Confirm the data**: which endpoints they call, how often, and whether anything else depends on `v1`.
2. **Escalate the contact**: reach the partner through account managers or business contacts, not just the technical address (which may belong to someone who left).
3. **Assess the risk of switching off**: breaking deliveries for a critical partner probably costs more than running `v1` endpoints a little longer.
4. **Offer help**: a migration guide specific to the endpoints they use, a call with your engineers, test credentials for `v2`.
5. **Run a brownout** (agreed or announced): short periods where `v1` returns errors, to surface the problem on their side while recovery is easy.
6. **Decide on an exception**: possibly keep only the specific `v1` endpoints they use, for that partner's credentials only, with a new firm date in a written agreement — while sunsetting `v1` for everyone else as planned.
7. **Learn**: require up-to-date technical contacts in partner agreements; send deprecation notices earlier and more often; add the deprecation status to the partner's dashboard; track per-partner migration progress from the start.

</details>

## Summary

An API is a **contract** with clients you may not control — mobile apps in the wild, partners, other teams — so changes must not break them unexpectedly. **Breaking changes** include removing or renaming fields or endpoints, changing types, formats or meanings, making inputs required, tightening validation, and changing defaults, status codes or error formats; even additions such as **new enum values** or newly nullable fields can break strict clients, and per **Hyrum's law** every observable behaviour is depended on by someone.

Most evolution needs no new version: make **additive** changes, use **expand–contract** for real changes, and build clients as **tolerant readers** that ignore unknown fields and handle unknown values. When a breaking change is necessary, introduce a version — most commonly a **URL path** major version (`/v1`, `/v2`), or **date-based versions** in a header with per-client pinning. Keep **one domain model** with a representation per version, or produce the latest shape and apply **version-change transformations** back to older versions.

Retire versions responsibly: document and announce, send **`Deprecation`**, **`Sunset`** and **`Link`** headers, mark deprecations in schemas, **measure usage** per client, communicate directly, consider brownouts, and finally return **`410 Gone`** with migration guidance. Apply the same thinking to GraphQL fields, events, webhooks and SDKs, keep security fixes in every supported version, and check schemas for breaking changes automatically in CI.

## Key terms

- **API versioning** — Identifying and maintaining distinct versions of an API contract for different clients.
- **API contract** — Everything clients rely on: endpoints, fields, types, meanings, errors and behaviour.
- **Breaking change** — A change that can cause existing, correctly written clients to fail.
- **Non-breaking (additive) change** — A change existing clients can safely ignore.
- **Backward compatibility** — A newer server still supporting clients built for an older version.
- **Tolerant reader** — A client that reads only what it needs and ignores unknown data.
- **Expand–contract (parallel change)** — Adding a new form beside the old, migrating, then removing the old.
- **URL path versioning** — Putting the API version in the URL, such as `/v2/orders`.
- **Header versioning** — Sending the API version in a request header.
- **Media type versioning** — Selecting a version through the `Accept` header's media type.
- **Date-based versioning** — Naming API versions by release date and pinning clients to a date.
- **Version pinning** — Fixing a client or account to a specific API version.
- **Version change transformation** — A small function converting the latest representation to an older version's shape.
- **Deprecation** — Announcing that a feature or version should no longer be used and will be removed.
- **Deprecation header** — The HTTP header (RFC 9745) indicating that a resource is deprecated.
- **Sunset header** — The HTTP header (RFC 8594) giving the date a resource will stop working.
- **410 Gone** — The status code indicating a resource was intentionally removed.
- **Brownout** — Temporarily disabling a deprecated feature for short periods to alert remaining users.
- **Hyrum's law** — The observation that, with enough users, every observable behaviour of an API is depended on by someone.
- **Schema diff** — An automated comparison of two API schema versions to detect changes.
- **Minimum supported version** — The oldest client version an API still serves.
- **Semantic versioning** — The MAJOR.MINOR.PATCH convention signalling breaking changes, features and fixes.

## What comes next

Every one of these practices depends on clients knowing exactly what the contract is. The next chapter, {{ch:api-documentation}}, covers documenting APIs: OpenAPI specifications, generating documentation and SDKs from code or contracts, examples and guides that developers actually use, keeping documentation true with contract tests, and documenting errors, authentication, limits and changes.
