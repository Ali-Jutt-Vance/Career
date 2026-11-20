# GraphQL

> [!GOALS]
> - Explain what GraphQL is, the problems it solves (over-fetching, under-fetching, many round trips) and the problems it creates.
> - Read and write a GraphQL **schema**: object types, scalars, enums, input types, nullability and lists.
> - Write **queries**, **mutations** and **subscriptions** with variables, fragments and aliases.
> - Implement **resolvers**, and understand how a query is validated and executed field by field.
> - Solve the **N+1 problem** with DataLoader.
> - Handle errors, authentication and authorisation correctly in GraphQL.
> - Protect a GraphQL API from expensive queries: depth and cost limits, pagination limits and **trusted documents**.
> - Decide when GraphQL is a better choice than REST — and when it is not.

## Why this matters

Imagine the Corner Shop's mobile app. The order-history screen needs each order's id, date, total and the first product image. The order-details screen needs much more: every line item, the delivery address, tracking events and the customer's loyalty points. A REST API usually offers fixed responses: `GET /orders` returns twenty fields per order when the list screen needs four (**over-fetching**), while the details screen must call `/orders/1042`, then `/orders/1042/items`, then `/products/…` for each item, then `/customers/c1/loyalty` (**under-fetching** and many round trips — painful on a slow mobile network).

**GraphQL**, created at Facebook in 2012 and released publicly in 2015, takes a different approach. The server publishes a **typed schema** describing all the data and operations available. The client sends a **query** describing exactly the fields it wants, possibly across related objects, and receives exactly that shape in one response. GitHub, Shopify and many other companies offer GraphQL APIs, and many companies use it internally between their front ends and back ends.

GraphQL is not a free upgrade, though. It moves complexity to the server: a single endpoint can receive arbitrarily complex queries, naive resolvers make hundreds of database queries for one request, HTTP caching becomes harder, and authorisation must be enforced on every field. This chapter teaches how GraphQL works and how to run it safely, so that you can use it where it fits and recognise where REST ({{ch:rest-apis}}) is simpler.

## The simple idea

A REST API is like a restaurant with **set menus**: menu A comes with soup, fish and dessert, whether or not you want the soup. To get the fish from menu A and the dessert from menu C, you order both menus.

GraphQL is like ordering **à la carte from a detailed menu**: the menu (the schema) lists every dish and how dishes go together, and you write down exactly what you want — "the fish, with the side salad, and the dessert" — in one order. The kitchen (the server) works out how to prepare it.

> [!ANALOGY]
> REST is like set menus: each endpoint returns a fixed combination. GraphQL is like ordering à la carte from a detailed menu: the client lists exactly the dishes it wants, and gets them together in one order.
>
> **Where the analogy breaks:** a real kitchen refuses an order for 400 desserts. A GraphQL server, unless you add limits, will try to cook whatever is ordered — including a deeply nested query that asks for every order of every customer of every product. The flexibility that helps clients also lets anyone write very expensive requests, so a GraphQL server needs explicit limits on what it will prepare.

## The proper definition and key words

**GraphQL** is a query language for APIs and a runtime for executing those queries against a **type system** you define. Clients send documents describing the data they need; the server validates them against the schema and executes them by calling a **resolver** for each requested field.

Key words:

- **Schema** — the complete description of the types and operations an API offers, written in the **Schema Definition Language (SDL)**.
- **Object type** — a type with named fields, such as `Order { id, total, status }`.
- **Scalar** — a leaf value: `Int`, `Float`, `String`, `Boolean`, `ID`, or a custom scalar such as `DateTime`.
- **Non-null (`!`)** — a field or argument that can never be null.
- **Query** — an operation that reads data.
- **Mutation** — an operation that changes data.
- **Subscription** — an operation that receives a stream of events over a long-lived connection.
- **Resolver** — the function that produces the value of one field.
- **Selection set** — the fields requested inside `{ ... }`.
- **Variables** — values sent separately from the query text, such as `{ "id": "1042" }`.
- **Fragment** — a reusable named set of fields.
- **Introspection** — querying the schema itself, which powers tools such as GraphiQL and code generators.
- **DataLoader** — a utility that batches and caches data loading within one request, solving the N+1 problem.

## How it works

### Level 1 — A schema

```graphql
"A shop customer"
type Customer {
  id: ID!
  name: String!
  email: String!
  orders(first: Int = 10, after: String): OrderConnection!
}

type Order {
  id: ID!
  placedAt: DateTime!
  status: OrderStatus!
  total: Money!
  items: [OrderItem!]!
  customer: Customer!
}

enum OrderStatus { PAID SHIPPED DELIVERED CANCELLED }

type Query {
  me: Customer
  order(id: ID!): Order
}

input CancelOrderInput {
  orderId: ID!
  reason: String
}

type Mutation {
  cancelOrder(input: CancelOrderInput!): CancelOrderPayload!
}
```

Read it as a contract:

- `Customer` and `Order` are **object types**; their fields can be scalars, enums or other object types — so clients can follow relationships (`order.customer.orders`).
- `!` means **non-null**. `[OrderItem!]!` is a non-null list of non-null items: the list is always there (maybe empty) and contains no nulls.
- `me: Customer` (no `!`) may be null — for example, when nobody is logged in. `order(id: ID!)` returns null if the order does not exist or is not visible.
- **Arguments** can be on any field (`orders(first: 10)`), with defaults.
- **Input types** describe structured arguments for mutations; they are separate from output types.
- `Query`, `Mutation` (and `Subscription`) are the **root types**: the entry points.
- `DateTime` and `Money` are **custom scalars** you define, with their own validation and serialisation.
- Strings in quotes before a type or field are **descriptions**, shown in documentation tools.

### Level 1 — Operations

A client sends a **document** containing an operation. Queries mirror the shape of the result:

```graphql
query OrderDetails($id: ID!) {
  order(id: $id) {
    id
    status
    total { amount currency }
    items { quantity product { name imageUrl(size: SMALL) } }
    customer { name }
  }
}
```

With variables `{ "id": "1042" }`, the response is JSON with exactly that shape:

```json
{
  "data": {
    "order": {
      "id": "1042",
      "status": "SHIPPED",
      "total": { "amount": "59.90", "currency": "GBP" },
      "items": [{ "quantity": 2, "product": { "name": "Green Tea", "imageUrl": "https://cdn.cornershop.example/t/1.webp" } }],
      "customer": { "name": "Sara" }
    }
  }
}
```

Other features clients use:

- **Variables** (`$id`) keep query text constant, which enables caching and prevents injection by string building.
- **Fragments** reuse field sets: `fragment OrderSummary on Order { id status total { amount } }`, used as `...OrderSummary`. Component-based clients let each UI component declare the fragment it needs.
- **Aliases** rename fields, allowing the same field twice with different arguments: `small: imageUrl(size: SMALL)`, `large: imageUrl(size: LARGE)`.
- **Mutations** look like queries but change data, and select fields from the result: `mutation { cancelOrder(input: { orderId: "1042" }) { order { id status } } }`.

Over HTTP, GraphQL usually uses a single endpoint: `POST /graphql` with a JSON body `{ "query": "...", "variables": {...}, "operationName": "..." }`.

### Level 2 — Resolvers and execution

The server answers a query in three steps:

1. **Parse** the document into a syntax tree.
2. **Validate** it against the schema: do these fields exist? Are argument types right? Unknown fields are rejected **before anything runs**.
3. **Execute**: starting at the root, call the **resolver** for each requested field. A resolver receives the parent object, the field's arguments, a per-request **context** (the logged-in user, data loaders) and information about the query. If a field returns an object, its selected sub-fields are resolved in turn.

This runnable example uses `graphql`, the reference implementation that most JavaScript GraphQL servers are built on:

```ts
import { buildSchema, graphql, defaultFieldResolver, GraphQLError, type GraphQLFieldResolver } from "graphql";

const schema = buildSchema(`
  type Customer { id: ID!  name: String!  email: String!  orders: [Order!]! }
  type Order    { id: ID!  total: Float!  status: OrderStatus!  customer: Customer! }
  enum OrderStatus { PAID SHIPPED DELIVERED }
  type Query    { customer(id: ID!): Customer  order(id: ID!): Order }
`);

const customers = [{ id: "c1", name: "Sara", email: "sara@example.com" }];
const orders = [
  { id: "1042", customerId: "c1", total: 59.9, status: "SHIPPED" },
  { id: "1043", customerId: "c1", total: 12.5, status: "PAID" },
];

type Ctx = { userId: string | null };
const resolvers: Record<string, Record<string, GraphQLFieldResolver<any, Ctx>>> = {
  Query: {
    customer: (_root, { id }, ctx) => {
      if (ctx.userId !== id) throw new GraphQLError("Not allowed", { extensions: { code: "FORBIDDEN" } });
      return customers.find((c) => c.id === id) ?? null;
    },
    order: (_root, { id }) => orders.find((o) => o.id === id) ?? null,
  },
  Customer: { orders: (customer) => orders.filter((o) => o.customerId === customer.id) },
  Order: { customer: (order) => customers.find((c) => c.id === order.customerId) },
};

// Use our resolver map, falling back to "read the property with the field's name"
const fieldResolver: GraphQLFieldResolver<any, Ctx> = (source, args, ctx, info) =>
  (resolvers[info.parentType.name]?.[info.fieldName] ?? defaultFieldResolver)(source, args, ctx, info);

async function run(source: string, userId: string | null = "c1", variableValues?: Record<string, unknown>) {
  const result = await graphql({ schema, source, fieldResolver, contextValue: { userId }, variableValues });
  console.log(JSON.stringify(result));
}

await run(`{ customer(id: "c1") { name orders { id status } } }`);
await run(`query Order($id: ID!) { order(id: $id) { total customer { name } } }`, "c1", { id: "1042" });
await run(`{ customer(id: "c1") { name password } }`);
await run(`{ customer(id: "c1") { name } }`, "someone-else");
```

**Output:**

```text
{"data":{"customer":{"name":"Sara","orders":[{"id":"1042","status":"SHIPPED"},{"id":"1043","status":"PAID"}]}}}
{"data":{"order":{"total":59.9,"customer":{"name":"Sara"}}}}
{"errors":[{"message":"Cannot query field \"password\" on type \"Customer\".","locations":[{"line":1,"column":29}]}]}
{"errors":[{"message":"Not allowed","locations":[{"line":1,"column":3}],"path":["customer"],"extensions":{"code":"FORBIDDEN"}}],"data":{"customer":null}}
```

- **The first query** asks for a customer's name and their orders' ids and statuses — and gets exactly that, nothing more. `Customer.orders` has its own resolver; `name`, `id` and `status` use the **default resolver**, which simply reads the property of the same name from the parent object.
- **The second** uses a variable and follows the relationship from order to customer in the same request.
- **The third** asks for a field that does not exist. Validation rejects the whole query before any resolver runs — there is no `data` at all.
- **The fourth** shows an error during execution: the resolver throws, the field becomes `null`, and the error appears in `errors` with its `path` and a machine-readable `code` in `extensions`. GraphQL can return **partial data plus errors** in the same response.

Real servers — **Apollo Server**, **GraphQL Yoga**, Mercurius, or NestJS's GraphQL module ({{ch:nestjs-advanced}}) — handle the HTTP layer and accept a resolver map like the one above directly:

```ts
// fragment
import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";

const server = new ApolloServer({ typeDefs, resolvers });
const { url } = await startStandaloneServer(server, {
  context: async ({ req }) => ({
    user: await authenticate(req.headers.authorization),   // per-request context ({{ch:jwt}})
    loaders: createLoaders(),                              // fresh DataLoaders for each request
  }),
});
```

There are two schema styles. **Schema-first** writes SDL and then resolvers (as above). **Code-first** builds the schema from code — TypeScript classes with decorators, or builder libraries such as Pothos — so types and resolvers cannot drift apart. Either way, **GraphQL Code Generator** can generate TypeScript types for resolvers and for client queries from the schema.

### Level 3 — Nullability and errors

When a resolver fails, GraphQL sets that field to `null` and records an error. If the field is **non-null** (`!`), the null "bubbles up" to the nearest nullable parent — possibly wiping out a large part of the response. So:

- Make fields **nullable** where partial failure is acceptable (a recommendations widget can fail without losing the order), and non-null where null would be meaningless (`id: ID!`).
- Use error **codes** in `extensions` (`UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `BAD_USER_INPUT`) so clients can react programmatically.
- Never expose internal error messages or stack traces; log them and return a generic message ({{ch:error-handling}}).

For **expected** business failures in mutations ("this order has already shipped"), many teams return them as data instead of errors, so the schema documents them:

```graphql
type CancelOrderPayload {
  order: Order
  userErrors: [UserError!]!
}
type UserError { field: [String!], code: String!, message: String! }
```

Note also that GraphQL servers traditionally answer `200 OK` even when the body contains errors; monitoring must look at the `errors` array, not just HTTP status codes.

### Level 3 — The N+1 problem and DataLoader

Resolvers run field by field. For a list of six orders, the `Order.customer` resolver runs six times — and if each call queries the database, one request becomes one query for the orders plus one per order: **N+1 queries**. With nested lists, it multiplies.

**DataLoader** fixes this. Resolvers call `loader.load(id)` instead of querying directly; DataLoader collects all the ids requested during the same tick of the event loop ({{ch:nodejs}}) and calls a **batch function** once with all of them:

```ts
import { buildSchema, graphql, defaultFieldResolver, type GraphQLFieldResolver } from "graphql";
import DataLoader from "dataloader";

const schema = buildSchema(`
  type Customer { id: ID!  name: String! }
  type Order    { id: ID!  customer: Customer! }
  type Query    { recentOrders: [Order!]! }
`);

// A fake database that counts the queries it receives
const customerRows = new Map([["c1", "Sara"], ["c2", "Omar"], ["c3", "Li"]]);
const orderRows = Array.from({ length: 6 }, (_, i) => ({ id: `${1040 + i}`, customerId: `c${(i % 3) + 1}` }));
let queries: string[] = [];
const db = {
  async orders() { queries.push("SELECT * FROM orders LIMIT 6"); return orderRows; },
  async customer(id: string) { queries.push(`SELECT * FROM customers WHERE id = '${id}'`); return { id, name: customerRows.get(id)! }; },
  async customers(ids: readonly string[]) {
    queries.push(`SELECT * FROM customers WHERE id IN (${ids.map((id) => `'${id}'`).join(", ")})`);
    return ids.map((id) => ({ id, name: customerRows.get(id)! }));
  },
};

type Ctx = { customerLoader: DataLoader<string, { id: string; name: string }> | null };
const resolvers: Record<string, Record<string, GraphQLFieldResolver<any, Ctx>>> = {
  Query: { recentOrders: () => db.orders() },
  Order: {
    customer: (order, _args, ctx) =>
      ctx.customerLoader ? ctx.customerLoader.load(order.customerId) : db.customer(order.customerId),
  },
};
const fieldResolver: GraphQLFieldResolver<any, Ctx> = (s, a, c, i) =>
  (resolvers[i.parentType.name]?.[i.fieldName] ?? defaultFieldResolver)(s, a, c, i);

const source = `{ recentOrders { id customer { name } } }`;

queries = [];
await graphql({ schema, source, fieldResolver, contextValue: { customerLoader: null } });
console.log(`without DataLoader: ${queries.length} queries`);
queries.forEach((q) => console.log("  " + q));

queries = [];
const customerLoader = new DataLoader((ids: readonly string[]) => db.customers(ids));  // a new loader per request
await graphql({ schema, source, fieldResolver, contextValue: { customerLoader } });
console.log(`with DataLoader: ${queries.length} queries`);
queries.forEach((q) => console.log("  " + q));
```

**Output:**

```text
without DataLoader: 7 queries
  SELECT * FROM orders LIMIT 6
  SELECT * FROM customers WHERE id = 'c1'
  SELECT * FROM customers WHERE id = 'c2'
  SELECT * FROM customers WHERE id = 'c3'
  SELECT * FROM customers WHERE id = 'c1'
  SELECT * FROM customers WHERE id = 'c2'
  SELECT * FROM customers WHERE id = 'c3'
with DataLoader: 2 queries
  SELECT * FROM orders LIMIT 6
  SELECT * FROM customers WHERE id IN ('c1', 'c2', 'c3')
```

- Without DataLoader: seven queries, including the same customer fetched twice. With 100 orders it would be 101.
- With DataLoader: two queries. It **batched** the six `load` calls into one, and **de-duplicated** the repeated ids.
- The batch function must return results **in the same order as the keys**, with one result per key (use `null` or an `Error` for missing ones). Exercise 1 builds a loader for one-to-many relationships.
- Create loaders **per request**: their cache is meant to live only for one request, and sharing one across users could leak data between them.

The example uses string-built SQL only to display the queries; real code passes ids as parameters ({{ch:sql}}).

### Level 3 — Pagination

Lists must be paginated, both for performance and for protection. GraphQL APIs commonly use **cursor-based pagination** in the "connection" style popularised by Relay:

```graphql
type OrderConnection {
  edges: [OrderEdge!]!
  pageInfo: PageInfo!
}
type OrderEdge { node: Order!, cursor: String! }
type PageInfo { hasNextPage: Boolean!, endCursor: String }
```

Clients ask for `orders(first: 20, after: "cursor")` and continue with `pageInfo.endCursor`. Always enforce a **maximum** for `first` (for example, 100) on the server ({{ch:query-optimization}}).

### Level 3 — Subscriptions

Subscriptions deliver events to clients over a long-lived connection, usually WebSockets with the `graphql-ws` protocol, or Server-Sent Events ({{ch:websockets}}):

```graphql
subscription OrderUpdates($id: ID!) {
  orderStatusChanged(orderId: $id) { id status }
}
```

On the server, a subscription resolver returns an async stream of events, typically fed by a pub/sub system (Redis in multi-server setups). Everything from the real-time chapter applies: authenticate the connection, authorise each subscription, and treat events as notifications that clients can re-query.

## Security and performance

### Level 3 — Authentication and authorisation

- **Authenticate once per request** and put the user in the context.
- **Authorise in the business layer, not only at the top.** Because clients can reach objects through many paths — `order(id)`, `me.orders`, `product.reviews.author.orders` — a check on the `order` root field alone is not enough. Put permission checks where the data is loaded or in the domain services every path uses ("can this user see this order?").
- **Field-level rules**: some fields are visible only to some users (a customer's email to staff, cost prices to admins). Return `null` with a `FORBIDDEN` error, or leave sensitive fields out of the public schema entirely.
- **Never expose internal fields** such as password hashes; the schema should be designed for clients, not generated blindly from database tables.

### Level 3 — Limiting expensive queries

A single GraphQL request can ask for a huge amount of work, deliberately or by accident:

```graphql
{ products(first: 100) { reviews(first: 100) { author { orders(first: 100) { items { product { reviews(first: 100) { ... } } } } } } } }
```

Defences, usually combined:

- **Maximum page sizes** on every list field.
- **Depth limits** — reject queries nested more than, say, 6–10 levels.
- **Cost (complexity) analysis** — estimate the work before executing and reject queries above a budget. A simple model multiplies by the maximum size of each list:

```ts
import { parse, Kind, type SelectionSetNode } from "graphql";

// Depth and a simple cost: list fields multiply the cost of everything below them
function analyse(query: string, listFields: Record<string, number>): { depth: number; cost: number } {
  function walk(set: SelectionSetNode | undefined, depth: number): { depth: number; cost: number } {
    if (!set) return { depth, cost: 0 };
    let maxDepth = depth, cost = 0;
    for (const sel of set.selections) {
      if (sel.kind !== Kind.FIELD) continue;
      const child = walk(sel.selectionSet, depth + 1);
      const size = listFields[sel.name.value] ?? 1;           // expected list size, 1 for single objects
      cost += size * (1 + child.cost);
      maxDepth = Math.max(maxDepth, child.depth);
    }
    return { depth: maxDepth, cost };
  }
  const op = parse(query).definitions[0]!;
  return walk(op.kind === Kind.OPERATION_DEFINITION ? op.selectionSet : undefined, 0);
}

const LIST_SIZES = { orders: 20, items: 10, reviews: 50 };   // e.g. the maximum "first:" allowed for each list

const queries = {
  normal: `{ customer(id: "c1") { name orders { id total } } }`,
  nested: `{ customer(id: "c1") { orders { items { product { reviews { author { name } } } } } } }`,
};
for (const [name, q] of Object.entries(queries)) {
  const { depth, cost } = analyse(q, LIST_SIZES);
  console.log(`${name}: depth ${depth}, cost ${cost} → ${depth > 6 || cost > 1000 ? "rejected" : "allowed"}`);
}
```

**Output:**

```text
normal: depth 3, cost 62 → allowed
nested: depth 7, cost 30421 → rejected
```

The normal query costs about 62 units (one customer, up to 20 orders with two fields each). The nested one looks short but could touch tens of thousands of objects (20 orders × 10 items × 50 reviews…) and is rejected before running. The example ignores fragments and arguments for brevity; production libraries (such as `graphql-query-complexity`) handle them, and let you set costs per field.

Other protections:

- **Trusted documents (persisted queries)**: for your own clients, register the exact queries your apps use at build time and accept only their ids (hashes) in production. Arbitrary queries are then impossible from the public internet — the strongest protection for first-party APIs. Public APIs for third parties cannot do this and rely on cost limits and rate limits.
- **Rate limiting by cost**, not by request count — one GraphQL request may be worth a thousand REST calls ({{ch:rate-limiting}}). GitHub's public GraphQL API, for example, limits clients by a points budget.
- **Limit aliases and batching**: aliases let one request repeat a field hundreds of times — for example, trying hundreds of passwords or discount codes in a single "request". Limit operations per request and apply per-attempt rate limits to sensitive mutations.
- **Introspection**: useful in development; many teams disable it on public production endpoints for first-party APIs. It is not real security on its own — the schema can often be inferred — so combine it with the measures above.
- **Timeouts** for the whole operation.

### Level 4 — Caching

REST responses are cached by URL at browsers and CDNs ({{ch:caching}}). GraphQL typically uses `POST` to one URL, so that HTTP caching does not apply by default. Approaches:

- **Client-side normalised caches** (Apollo Client, Relay, urql with Graphcache) store objects by type and id, so data fetched by one query updates every screen showing it.
- **GET requests for trusted documents** (`/graphql?id=hash&variables=...`) make public queries cacheable by CDNs.
- **Server-side caching** in resolvers and data loaders, with Redis for shared data ({{ch:redis}}).
- **Cache hints** per field or type (maximum age, public or private) that the server combines into a response-level policy.

### Level 4 — Many services behind one graph

In larger organisations, different teams own different data: products, orders, reviews, users. **Federation** (Apollo Federation, and similar approaches in other tools) lets each team run its own GraphQL service (a **subgraph**) defining its part of the schema, while a **router** composes them into one **supergraph** for clients. An `Order` type owned by the orders team can be extended with a `reviews` field by the reviews team. This is powerful at scale and adds operational complexity — schema composition checks, routing performance and distributed tracing ({{ch:microservices}}, {{ch:api-gateway}}).

## GraphQL or REST?

| Choose GraphQL when | Choose REST when |
|---|---|
| Many clients (web, iOS, Android, partners) need different shapes of related data | Resources map cleanly to simple CRUD operations |
| Screens combine data from many sources and round trips are expensive (mobile) | HTTP caching by URL matters (public content, CDNs) |
| Front-end teams iterate quickly and want to avoid back-end changes for each new field | The API is public and must be simple for any client, including `curl` |
| You can invest in tooling: codegen, query cost limits, trusted documents, observability | File uploads, streaming downloads and webhooks dominate |
| A typed, self-documenting contract across teams is valuable | The team is small and the extra machinery is not justified |

Many systems use both: GraphQL as a **back end for front ends** serving the company's own apps, and REST for public, partner and webhook APIs. Typed REST with OpenAPI and code generation ({{ch:api-documentation}}) and RPC frameworks such as tRPC (for TypeScript-only stacks) or gRPC (between services) are also strong alternatives. Choose by the needs of the clients and the team, not by fashion.

## From beginner to enterprise

**Level 1–2 — first API.** A small schema with object types, enums and inputs; queries and mutations with variables; resolvers backed by a database; GraphiQL or Apollo Sandbox for exploring.

**Level 3 — real APIs.** DataLoader for every relationship; cursor pagination with maximum page sizes; authentication in context; authorisation in the domain layer; error codes; nullable fields chosen deliberately; code generation for types.

**Level 4 — production systems.** Depth and cost limits; trusted documents for first-party clients; cost-based rate limiting; timeouts; per-field tracing and metrics; client-side normalised caching; subscriptions over WebSockets with pub/sub.

**Level 5 — professional practice.** Schema design reviews and deprecation policies (`@deprecated(reason: "...")`, then removal after usage reaches zero); schema change checks in CI against real client operations; usage analytics per field.

**Level 6 — enterprises.** Federated supergraphs owned by many teams with a central platform team; schema registries; governance for naming and nullability; global routers; contracts between the graph and dozens of clients.

## Real-world use cases

### The shop's mobile app

- **Design**: a GraphQL back end for front ends; each screen's query is defined next to its components with fragments; queries are registered as trusted documents at build time; DataLoader in every resolver; responses cached in the client's normalised cache.
- **Result**: one round trip per screen, payloads containing only what the screen shows, and new fields added without new endpoints.

### A partner catalogue API

- **Design**: a public GraphQL API for marketplaces to read products and stock; strict page-size limits; cost analysis with a points budget per partner per hour; introspection enabled for partners' tooling; webhooks (REST) for stock change notifications.

## Common mistakes

### Beginner: exposing the database as the schema

**Consequence:** internal fields leak; the API is hard to change. **Fix:** design the schema around client needs and domain concepts.

### Beginner: no DataLoader

**Consequence:** hundreds of queries per request. **Fix:** batch every relationship with per-request loaders.

### Beginner: authorisation only on root fields

**Consequence:** data reachable through nested paths without checks. **Fix:** checks in the domain or data-access layer used by every path.

### Intermediate: unbounded lists and queries

**Fix:** maximum page sizes, depth and cost limits, timeouts, trusted documents.

### Intermediate: everything non-null

**Consequence:** one failing field erases the whole response. **Fix:** nullable where partial failure is acceptable.

### Intermediate: monitoring HTTP status codes only

**Consequence:** errors hidden inside `200 OK` responses. **Fix:** metrics and logs on the `errors` array, per operation name.

### Production: breaking changes to the schema

**Fix:** add fields freely; deprecate before removing; check changes against registered client operations ({{ch:api-versioning}}).

### Production: rate limiting by request count

**Fix:** limit by computed query cost.

## Debugging and troubleshooting

- **`Cannot query field "x" on type "Y"`**: the field is not in the schema (typo, or the client uses an old or new schema version) — regenerate client types.
- **`Variable "$id" of required type "ID!" was not provided`**: the variables object is missing or misnamed.
- **A field is unexpectedly `null` with an error**: a resolver threw, or returned `undefined`; check the `path` in the error and server logs.
- **A whole object is `null`**: a non-null child failed and the null bubbled up — find the first error in the list.
- **Slow queries**: enable resolver tracing to see which fields take time; look for missing DataLoaders (N+1) and missing database indexes ({{ch:indexes}}).
- **DataLoader returns wrong items**: the batch function did not return results in key order, or returned fewer results than keys.

## Security summary

- Authenticate per request; **authorise in the domain layer** so every path to an object is checked; apply field-level rules for sensitive fields.
- Design the schema deliberately; never expose secrets or internal fields.
- Enforce **maximum page sizes**, **depth limits**, **cost limits** and **timeouts**.
- Use **trusted documents** for first-party clients; rate-limit by **cost** for public APIs.
- Limit **aliases and batched operations**; rate-limit sensitive mutations per attempt.
- Validate inputs with custom scalars and business validation ({{ch:validation}}).
- Hide internal error details; log them with the operation name and a correlation id.
- Treat introspection as a convenience to restrict, not as a security boundary.

## How a senior engineer thinks about this

- **GraphQL moves complexity from clients to the server.** That trade is worth it when many clients need flexible, related data — and they budget for the server-side machinery.
- **The schema is a product.** Names, nullability and deprecations are designed and reviewed, because clients depend on them for years.
- **Every query is untrusted, potentially expensive input.** Limits, cost analysis and trusted documents are part of the design, not an afterthought.
- **Batching is not optional.** DataLoader (or an equivalent) is part of every relationship.
- **Use the right tool per boundary.** GraphQL for flexible first-party data needs, REST for public and webhook APIs, RPC between services.

## Exercises

### Exercise 1 — A one-to-many DataLoader

**Objective:** practise writing batch functions correctly.
**What to build:** a DataLoader that loads **lists of orders** per customer id. The batch function receives several customer ids, runs one query (simulated), and must return one array per id — in the same order as the ids, with an empty array for customers without orders — even though the database returns rows in any order. Show that three `load` calls cause one database call, and that loading the same id again uses the cache.

<details>
<summary>Show the solution</summary>

```ts
import DataLoader from "dataloader";

type Order = { id: string; customerId: string; total: number };
const orderTable: Order[] = [
  { id: "1042", customerId: "c1", total: 59.9 },
  { id: "1043", customerId: "c1", total: 12.5 },
  { id: "1044", customerId: "c3", total: 8 },
];

let calls = 0;
async function ordersForCustomers(customerIds: readonly string[]): Promise<Order[]> {
  calls++;                                                   // one SQL query: WHERE customer_id = ANY($1)
  return orderTable.filter((o) => customerIds.includes(o.customerId)).reverse();  // rows come back in any order
}

function createOrdersByCustomerLoader() {
  return new DataLoader<string, Order[]>(async (customerIds) => {
    const rows = await ordersForCustomers(customerIds);
    const byCustomer = new Map<string, Order[]>(customerIds.map((id) => [id, []]));
    for (const row of rows) byCustomer.get(row.customerId)!.push(row);
    for (const list of byCustomer.values()) list.sort((a, b) => a.id.localeCompare(b.id));
    return customerIds.map((id) => byCustomer.get(id)!);    // same length and order as the keys
  });
}

const loader = createOrdersByCustomerLoader();
const [c1, c2, c3] = await Promise.all(["c1", "c2", "c3"].map((id) => loader.load(id)));
console.log("c1:", c1!.map((o) => o.id), "c2:", c2!.map((o) => o.id), "c3:", c3!.map((o) => o.id));
console.log("database calls:", calls);
await loader.load("c1");
console.log("after loading c1 again:", calls, "(cached for this request)");
```

**Output:**

```text
c1: [ '1042', '1043' ] c2: [] c3: [ '1044' ]
database calls: 1
after loading c1 again: 1 (cached for this request)
```

**Walkthrough:** the map is pre-filled with an empty list for **every** requested id, so customers without orders (`c2`) still get a result and the output stays aligned with the keys. Grouping by `customerId` makes the database's row order irrelevant. One query serves all three loads; the repeated load is answered from the loader's per-request cache. In a real API, pagination makes this harder (each customer's "first 10 orders" needs window functions or per-key queries), which is why list fields with arguments deserve careful design.

</details>

### Exercise 2 — Design a schema

**Objective:** practise schema design.
**What to do:** design the GraphQL schema (types, queries and mutations, with nullability) for product reviews in the shop: customers can read a product's reviews (paginated, newest first, with average rating), write one review per product they bought, and edit or delete their own review. Staff can hide reviews.

<details>
<summary>Show the solution</summary>

```graphql
type Product {
  id: ID!
  name: String!
  reviewSummary: ReviewSummary!
  reviews(first: Int = 10, after: String, order: ReviewOrder = NEWEST): ReviewConnection!
  viewerReview: Review              # the logged-in customer's own review, if any
}

type ReviewSummary { averageRating: Float, count: Int! }   # average is null when there are no reviews

type Review {
  id: ID!
  rating: Int!                      # 1–5, validated in the resolver/service
  title: String
  body: String!
  author: PublicProfile!            # display name only, never email
  createdAt: DateTime!
  editedAt: DateTime
  hidden: Boolean!                  # visible to staff only; others never see hidden reviews
}

type PublicProfile { displayName: String! }

enum ReviewOrder { NEWEST HIGHEST_RATED LOWEST_RATED }

type ReviewConnection { edges: [ReviewEdge!]!, pageInfo: PageInfo! }
type ReviewEdge { node: Review!, cursor: String! }

input WriteReviewInput { productId: ID!, rating: Int!, title: String, body: String! }
input EditReviewInput { reviewId: ID!, rating: Int, title: String, body: String }

type ReviewPayload { review: Review, userErrors: [UserError!]! }
type DeletePayload { deletedId: ID, userErrors: [UserError!]! }
type UserError { field: [String!], code: String!, message: String! }

type Mutation {
  writeReview(input: WriteReviewInput!): ReviewPayload!       # NOT_PURCHASED, ALREADY_REVIEWED
  editReview(input: EditReviewInput!): ReviewPayload!         # only the author
  deleteReview(reviewId: ID!): DeletePayload!                 # only the author
  setReviewHidden(reviewId: ID!, hidden: Boolean!): ReviewPayload!  # staff only
}
```

**Design notes:** the author is a `PublicProfile`, so emails cannot leak through reviews; `reviews` has a maximum `first` enforced on the server; expected failures ("not purchased", "already reviewed") are typed `userErrors`, not exceptions; permissions are enforced in the review service; `viewerReview` lets the UI show "edit your review" without scanning lists.

</details>

### Exercise 3 — Review a GraphQL server

**Objective:** practise spotting GraphQL-specific risks.
**The scenario:** a team generated their schema directly from database tables, including `User.passwordHash` and `User.resetToken`. Resolvers query the database directly per field. Only `Query.order` checks that the order belongs to the user. List fields accept any `first` value. Introspection is on, there are no depth or cost limits, rate limiting allows 100 requests per minute per IP, and `login(email, password)` is a mutation. List the problems and fixes.

<details>
<summary>Show the solution</summary>

1. **Schema generated from tables** → secrets exposed (`passwordHash`, `resetToken`). Design the schema deliberately; remove internal fields.
2. **No DataLoader** → N+1 queries; easy to overload the database. Batch with per-request loaders.
3. **Authorisation only on `Query.order`** → orders reachable via `me.orders`, `product.reviews.author.orders` and so on without checks. Move checks into the domain/data layer used by every path.
4. **Unbounded `first`** → one request can load millions of rows. Enforce maximum page sizes.
5. **No depth or cost limits** → deeply nested queries can take the server down. Add depth limits, cost analysis and timeouts; trusted documents for first-party clients.
6. **Rate limiting per request** → one request can contain hundreds of aliased `login` mutations (password guessing). Limit by cost, limit aliases and operations per request, and rate-limit login attempts per account and IP.
7. **Introspection on** → makes exploring all of the above easy; restrict it in production for first-party APIs (after fixing the real problems).

</details>

### Exercise 4 — Production scenario: the slow dashboard

**Objective:** practise diagnosing GraphQL performance.
**The scenario:** after the admin dashboard moved to GraphQL, its main page takes eight seconds to load and the database CPU spikes whenever someone opens it. Describe how you investigate and fix it.

<details>
<summary>Show the solution</summary>

1. **Find the operation**: logs and metrics grouped by operation name; capture the exact query and variables of the dashboard.
2. **Trace resolvers**: enable per-field tracing (Apollo traces, OpenTelemetry spans per resolver) to see which fields take time and how many times each runs.
3. **Count database queries per request**: hundreds of similar queries indicate N+1 — add DataLoaders for those relationships.
4. **Check list sizes**: the dashboard may request large lists (`first: 1000`) or nested lists; reduce page sizes, paginate, or add aggregate fields (`ordersSummary { count, revenue }`) computed in one SQL query instead of summing thousands of objects on the server.
5. **Check SQL**: examine slow queries with `EXPLAIN`; add indexes for the batch queries' `WHERE ... IN` / `ANY` conditions ({{ch:query-optimization}}).
6. **Cache** expensive, slowly changing parts (daily totals) in Redis with sensible expiry.
7. **Split the page**: load below-the-fold widgets in separate queries (or with `@defer` where supported), so the important part appears fast.
8. **Prevent regressions**: cost limits on the operation, query-count assertions in integration tests, and an alert on resolver latency per operation.

</details>

## Summary

**GraphQL** lets clients request exactly the data they need, across related objects, in one request, from a strongly **typed schema** written in SDL: object types, scalars, enums, input types, lists and **non-null** markers, with `Query`, `Mutation` and `Subscription` as entry points. Clients send operations with **variables**, **fragments** and **aliases**, usually as `POST /graphql`.

The server **parses**, **validates** (rejecting unknown fields before anything runs) and **executes** queries by calling a **resolver** per field, with a per-request **context** for the user and data loaders. Errors make fields null — bubbling up through non-null fields — and are reported with paths and codes alongside partial data; expected business failures are often returned as typed `userErrors`. The **N+1 problem** from field-by-field resolution is solved by **DataLoader**, which batches and de-duplicates loads within a request, with loaders created per request. Lists use cursor **pagination** with maximum sizes; **subscriptions** stream events over WebSockets or SSE.

Because any client can send any query, security needs **authorisation in the domain layer** (every path to an object), field-level rules, a deliberately designed schema, **depth and cost limits**, timeouts, **trusted documents** for first-party clients, cost-based rate limits and limits on aliases. HTTP caching is harder, so clients use normalised caches, and servers cache in resolvers. At scale, **federation** composes many teams' subgraphs into one supergraph. GraphQL is the right choice for flexible first-party data needs across many clients; REST remains simpler for public APIs, caching-heavy content, files and webhooks — and many systems use both.

## Key terms

- **GraphQL** — A query language and runtime for APIs in which clients request exactly the fields they need from a typed schema.
- **Schema** — The description of all types and operations a GraphQL API supports.
- **Schema Definition Language (SDL)** — The syntax for writing GraphQL schemas.
- **Object type** — A GraphQL type with named fields.
- **Scalar** — A leaf type such as `Int`, `String`, `Boolean`, `ID` or a custom scalar.
- **Custom scalar** — A scalar defined by the API with its own validation and serialisation, such as `DateTime`.
- **Enum** — A type whose value is one of a fixed set of names.
- **Input type** — A structured type used for arguments, typically in mutations.
- **Non-null** — A type marker (`!`) guaranteeing a value is never null.
- **Query (GraphQL)** — An operation that reads data.
- **Mutation** — An operation that changes data.
- **Subscription** — An operation that receives a stream of events.
- **Resolver** — A function that returns the value of one field.
- **Context** — Per-request data shared with all resolvers, such as the current user and data loaders.
- **Selection set** — The fields requested within braces in a query.
- **Variables** — Values for an operation sent separately from its text.
- **Fragment** — A reusable named set of fields.
- **Alias** — A client-chosen name for a field in the response.
- **Introspection** — Querying a GraphQL schema for its own types and fields.
- **Over-fetching** — Receiving more data than the client needs.
- **Under-fetching** — Needing several requests to gather the data for one view.
- **N+1 problem** — Running one query for a list plus one query per item for related data.
- **DataLoader** — A utility that batches and caches loads of the same kind within a request.
- **Connection (pagination)** — A cursor-based pagination structure with edges, nodes and page information.
- **Query cost analysis** — Estimating the work a query will cause and rejecting queries above a limit.
- **Trusted documents (persisted queries)** — Pre-registered operations identified by hash, the only ones a server accepts.
- **Federation** — Composing several GraphQL services (subgraphs) into one supergraph behind a router.
- **Subgraph** — One service's part of a federated GraphQL schema.

## What comes next

GraphQL servers, like REST APIs, benefit from a clear structure as they grow. The next chapter, {{ch:nestjs-basics}}, introduces NestJS: a TypeScript framework for Node.js built around modules, controllers, providers and dependency injection, with pipes, guards and interceptors — a structured way to build the kind of back ends this part of the book has been describing.
