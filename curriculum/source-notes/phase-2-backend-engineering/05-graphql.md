# Phase 2 — Chapter 5: GraphQL

> *"GraphQL gives clients the power to ask for exactly what they need and nothing more."* — Facebook Engineering

---

## Chapter Overview

### Why GraphQL Exists

REST APIs have a fundamental mismatch with modern UIs:
- **Over-fetching**: GET /users returns 20 fields; the mobile app needs 3
- **Under-fetching**: A dashboard needs user + orders + activity — that's 3 requests
- **Rigid contracts**: Adding a field to REST means a new endpoint or version
- **Weak typing**: REST has no built-in schema or type system

Facebook (Meta) created GraphQL in 2012 to power their mobile app. The News Feed required data from 12+ services — GraphQL let the client ask for exactly what it needed in one round-trip. Released open-source in 2015.

**GraphQL advantages:**
- Single endpoint (`/graphql`)
- Client declares exactly what data it needs
- Strongly typed schema (self-documenting)
- Real-time with Subscriptions
- Introspection — tooling can query the schema itself
- Versionless — add fields without breaking old clients

**GraphQL disadvantages:**
- Complex caching (queries are unique, can't cache by URL)
- N+1 query problem (requires DataLoader)
- Overly permissive queries can cause performance issues
- File uploads non-trivial
- Steeper learning curve

**Who uses GraphQL:** GitHub, Shopify, Twitter, Netflix, Airbnb, PayPal, Atlassian.

---

## Beginner Theory

### Core Concepts

**Schema**: The contract. Defines all types, queries, mutations, and subscriptions. Written in SDL (Schema Definition Language).

**Query**: Read data (equivalent to GET).

**Mutation**: Write data (equivalent to POST/PUT/PATCH/DELETE).

**Subscription**: Real-time data over WebSocket.

**Resolver**: A function that fetches the data for a field.

**Type**: GraphQL's type system — scalars (Int, Float, String, Boolean, ID) and object types.

### Schema Definition Language

```graphql
# Scalar types: Int, Float, String, Boolean, ID

# Object type
type User {
  id: ID!           # ! = non-nullable (required)
  name: String!
  email: String!
  role: UserRole!
  posts: [Post!]!   # list of non-null Posts (list itself is non-null)
  profile: Profile  # nullable — may not exist
  createdAt: String!
}

# Enum
enum UserRole {
  USER
  ADMIN
  MODERATOR
}

# Input type (for mutations)
input CreateUserInput {
  name: String!
  email: String!
  password: String!
  role: UserRole = USER  # default value
}

input UpdateUserInput {
  name: String
  email: String
}

# Query type — entry points for reads
type Query {
  user(id: ID!): User
  users(page: Int, limit: Int, search: String): UserConnection!
  me: User
}

# Mutation type — entry points for writes
type Mutation {
  createUser(input: CreateUserInput!): User!
  updateUser(id: ID!, input: UpdateUserInput!): User!
  deleteUser(id: ID!): Boolean!
  login(email: String!, password: String!): AuthPayload!
}

# Subscription type — real-time
type Subscription {
  userCreated: User!
  orderStatusChanged(orderId: ID!): Order!
}

# Pagination using connections (Relay spec)
type UserConnection {
  edges: [UserEdge!]!
  pageInfo: PageInfo!
}
type UserEdge {
  node: User!
  cursor: String!
}
type PageInfo {
  hasNextPage: Boolean!
  hasPreviousPage: Boolean!
  startCursor: String
  endCursor: String
}

# Auth payload
type AuthPayload {
  token: String!
  refreshToken: String!
  user: User!
}
```

---

## Basic Examples

### Apollo Server Setup

```javascript
// npm install @apollo/server graphql

const { ApolloServer } = require("@apollo/server");
const { startStandaloneServer } = require("@apollo/server/standalone");

const typeDefs = `
  type User {
    id: ID!
    name: String!
    email: String!
  }

  type Query {
    users: [User!]!
    user(id: ID!): User
  }

  type Mutation {
    createUser(name: String!, email: String!): User!
  }
`;

const users = [
  { id: "1", name: "Alice", email: "alice@example.com" },
  { id: "2", name: "Bob",   email: "bob@example.com" }
];

const resolvers = {
  Query: {
    users: () => users,
    user: (_, { id }) => users.find(u => u.id === id)
  },
  Mutation: {
    createUser: (_, { name, email }) => {
      const user = { id: String(users.length + 1), name, email };
      users.push(user);
      return user;
    }
  }
};

const server = new ApolloServer({ typeDefs, resolvers });

const { url } = await startStandaloneServer(server, {
  listen: { port: 4000 },
  context: async ({ req }) => ({
    user: await verifyToken(req.headers.authorization)
  })
});

console.log(`GraphQL server at ${url}`);
```

### Writing Queries (Client Side)

```graphql
# Query — read users
query GetUsers {
  users(page: 1, limit: 10) {
    edges {
      node {
        id
        name
        email
        role
      }
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}

# Query with variable
query GetUser($id: ID!) {
  user(id: $id) {
    id
    name
    email
    posts {
      id
      title
      publishedAt
    }
  }
}
# Variables: { "id": "123" }

# Mutation
mutation CreateUser($input: CreateUserInput!) {
  createUser(input: $input) {
    id
    name
    email
  }
}
# Variables: { "input": { "name": "Carol", "email": "carol@x.com", "password": "pass123" } }

# Fragments — reusable field selections
fragment UserBasic on User {
  id
  name
  email
  role
}

query {
  me {
    ...UserBasic
    profile { bio avatarUrl }
  }
}

# Aliases — rename fields in response
query {
  activeUsers: users(filters: { isActive: true }) { edges { node { id name } } }
  adminUsers:  users(filters: { role: ADMIN })    { edges { node { id name } } }
}

# Inline fragments (polymorphism)
query {
  searchResults(query: "alice") {
    ... on User    { id name email }
    ... on Post    { id title author { name } }
    ... on Comment { id content author { name } }
  }
}
```

---

## Intermediate Concepts

### Resolvers in Depth

```javascript
// Root resolvers vs. field resolvers
const resolvers = {
  // Root Query resolvers
  Query: {
    // Parent = undefined for root; args = query arguments; context = shared context; info = AST
    user: async (parent, { id }, context, info) => {
      if (!context.user) throw new GraphQLError("Not authenticated", {
        extensions: { code: "UNAUTHENTICATED" }
      });
      return context.dataSources.userRepo.findById(id);
    },

    users: async (_, { page = 1, limit = 20, search }, { dataSources }) => {
      return dataSources.userRepo.findAll({ page, limit, search });
    }
  },

  // Field resolvers on User type
  User: {
    // Resolve the "posts" field on a User — called for each user in the response
    posts: async (user, args, { dataSources }) => {
      // This triggers N+1 without DataLoader!
      return dataSources.postRepo.findByUserId(user.id);
    },

    // Computed field
    displayName: (user) => `${user.name} <${user.email}>`,

    // Field with default
    role: (user) => user.role ?? "USER"
  },

  Mutation: {
    createUser: async (_, { input }, { dataSources, user }) => {
      if (!user || user.role !== "ADMIN") {
        throw new GraphQLError("Not authorized", {
          extensions: { code: "FORBIDDEN" }
        });
      }
      return dataSources.userRepo.create(input);
    },

    login: async (_, { email, password }, { dataSources }) => {
      const user = await dataSources.userRepo.findByEmail(email);
      if (!user || !await bcrypt.compare(password, user.passwordHash)) {
        throw new GraphQLError("Invalid credentials", {
          extensions: { code: "UNAUTHENTICATED" }
        });
      }
      return {
        token: generateAccessToken(user),
        refreshToken: generateRefreshToken(user),
        user
      };
    }
  }
};
```

### The N+1 Problem and DataLoader

```javascript
// THE PROBLEM:
// Query: { users { posts { title } } }
// Without DataLoader:
// 1 query for all users → 100 users
// 100 queries for posts (one per user) → N+1 problem!

// npm install dataloader
const DataLoader = require("dataloader");

// DataLoader batches individual .load(key) calls into a single batch function
function createPostLoader(db) {
  return new DataLoader(async (userIds) => {
    // Called ONCE with all userIds collected this tick
    const posts = await db.query(
      "SELECT * FROM posts WHERE user_id = ANY($1)",
      [userIds]
    );

    // Must return results in same order as input keys
    return userIds.map(userId =>
      posts.filter(p => p.userId === userId)
    );
  });
}

// In context (create per-request to avoid cache leaking between requests)
const context = async ({ req }) => {
  const db = getDatabase();
  return {
    db,
    loaders: {
      posts:    createPostLoader(db),
      profile:  createProfileLoader(db),
      comments: createCommentLoader(db)
    }
  };
};

// In resolver — now batched automatically
const resolvers = {
  User: {
    posts: (user, _, { loaders }) => loaders.posts.load(user.id)
    // Instead of 100 queries, DataLoader sends 1 batch query
  }
};
```

### Authentication and Authorization

```javascript
// Auth in context
const context = async ({ req }) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  let user = null;
  if (token) {
    try {
      user = jwt.verify(token, process.env.JWT_SECRET);
    } catch {}
  }
  return { user, dataSources };
};

// Auth in resolvers with directive approach (cleaner)
const typeDefs = `
  directive @auth(roles: [String]) on FIELD_DEFINITION

  type Query {
    users: [User!]!            @auth
    adminStats: Stats!         @auth(roles: ["ADMIN"])
  }
`;

// Custom directive implementation
const { defaultFieldResolver } = require("graphql");
const { mapSchema, getDirective, MapperKind } = require("@graphql-tools/utils");

function authDirectiveTransformer(schema) {
  return mapSchema(schema, {
    [MapperKind.FIELD]: (fieldConfig) => {
      const directive = getDirective(schema, fieldConfig, "auth")?.[0];
      if (!directive) return fieldConfig;

      const { resolve = defaultFieldResolver } = fieldConfig;
      return {
        ...fieldConfig,
        async resolve(source, args, context, info) {
          if (!context.user) throw new GraphQLError("Not authenticated", {
            extensions: { code: "UNAUTHENTICATED" }
          });
          if (directive.roles?.length && !directive.roles.includes(context.user.role)) {
            throw new GraphQLError("Not authorized", {
              extensions: { code: "FORBIDDEN" }
            });
          }
          return resolve(source, args, context, info);
        }
      };
    }
  });
}
```

### Subscriptions (Real-Time)

```javascript
// npm install @apollo/server @graphql-subscriptions ws graphql-ws

const { createServer } = require("http");
const { WebSocketServer } = require("ws");
const { useServer } = require("graphql-ws/lib/use/ws");
const { PubSub } = require("graphql-subscriptions");

const pubsub = new PubSub();

const typeDefs = `
  type Subscription {
    orderStatusChanged(orderId: ID!): OrderStatusEvent!
    newMessage(channelId: ID!): Message!
  }

  type OrderStatusEvent {
    orderId: ID!
    previousStatus: String!
    newStatus: String!
    updatedAt: String!
  }
`;

const resolvers = {
  Mutation: {
    updateOrderStatus: async (_, { id, status }, { dataSources }) => {
      const order = await dataSources.orderRepo.update(id, { status });

      // Publish event to subscribers
      await pubsub.publish(`ORDER_STATUS_${id}`, {
        orderStatusChanged: {
          orderId: id,
          previousStatus: order.previousStatus,
          newStatus: status,
          updatedAt: new Date().toISOString()
        }
      });

      return order;
    }
  },

  Subscription: {
    orderStatusChanged: {
      subscribe: (_, { orderId }) =>
        pubsub.asyncIterableIterator(`ORDER_STATUS_${orderId}`),
      resolve: (payload) => payload.orderStatusChanged
    }
  }
};

// WebSocket server setup
const httpServer = createServer(expressApp);
const wsServer = new WebSocketServer({ server: httpServer, path: "/graphql" });
useServer({ schema }, wsServer);
httpServer.listen(4000);
```

### Error Handling

```javascript
const { GraphQLError } = require("graphql");

// Throw GraphQLError with extensions for structured error responses
throw new GraphQLError("User not found", {
  extensions: {
    code: "USER_NOT_FOUND",        // machine-readable code
    statusCode: 404,
    userId: id
  }
});

// Common codes:
// UNAUTHENTICATED — needs auth
// FORBIDDEN       — authenticated but not allowed
// NOT_FOUND       — resource doesn't exist
// BAD_USER_INPUT  — validation failed
// INTERNAL_SERVER_ERROR — unexpected

// Global error formatting
const server = new ApolloServer({
  typeDefs,
  resolvers,
  formatError: (formattedError, error) => {
    // Log unexpected errors but don't expose internals
    if (!formattedError.extensions?.code) {
      console.error("Unexpected GraphQL error:", error);
      return {
        message: "Internal server error",
        extensions: { code: "INTERNAL_SERVER_ERROR" }
      };
    }
    return formattedError;
  }
});
```

---

## Advanced Concepts

### Schema Stitching and Federation

```javascript
// Apollo Federation: compose multiple GraphQL services into one supergraph
// Each service owns its own type definitions

// users-service: schema
const typeDefs = `
  extend schema @link(url: "https://specs.apollo.dev/federation/v2.3", import: ["@key"])

  type User @key(fields: "id") {
    id: ID!
    name: String!
    email: String!
  }

  type Query {
    user(id: ID!): User
    users: [User!]!
  }
`;

// orders-service: extends User from users-service
const typeDefs = `
  extend schema @link(url: "https://specs.apollo.dev/federation/v2.3", import: ["@key", "@external"])

  type User @key(fields: "id") {
    id: ID! @external    # owned by users-service
    orders: [Order!]!    # extended by orders-service
  }

  type Order {
    id: ID!
    total: Float!
    status: String!
  }
`;

// Router (Apollo Gateway) stitches them together
// Client sees a unified schema with User.orders
```

### Query Complexity and Depth Limiting

```javascript
// Prevent expensive/malicious queries
// npm install graphql-depth-limit graphql-query-complexity

const depthLimit = require("graphql-depth-limit");
const { createComplexityLimitRule } = require("graphql-query-complexity");

const server = new ApolloServer({
  typeDefs,
  resolvers,
  validationRules: [
    depthLimit(7),   // max 7 levels deep
    createComplexityLimitRule(1000, {
      onCost: (cost) => console.log("Query cost:", cost),
      formatErrorMessage: (cost) => `Query too complex (${cost} > 1000)`
    })
  ]
});

// Persisted queries: pre-register known queries (production security)
// Only allow whitelisted query hashes — prevents arbitrary query execution
```

---

## Industry Usage

- **GitHub API v4**: Full GraphQL; enables complex queries like "give me all PRs with reviews by @user across all my repos" in one request
- **Shopify Storefront API**: Powers millions of e-commerce storefronts
- **Twitter API v2**: Offers GraphQL-like field selection
- **Apollo**: Most popular GraphQL server + client stack

**REST vs. GraphQL decision:**
```
Use REST when:
  Simple CRUD
  Public API (wide adoption)
  Caching by URL is important
  Simple, well-defined clients

Use GraphQL when:
  Complex, interconnected data
  Multiple client types (mobile, web, TV)
  Rapid frontend iteration
  Data from multiple services
```

---

## Security

```javascript
// 1. Disable introspection in production
const server = new ApolloServer({
  introspection: process.env.NODE_ENV !== "production"
});

// 2. Depth limiting (prevent deeply nested queries)
validationRules: [depthLimit(7)]

// 3. Query complexity limiting
validationRules: [createComplexityLimitRule(1000)]

// 4. Rate limiting per operation
// Track query complexity and rate-limit by it

// 5. Field-level authorization (never skip)
User: {
  password: () => null,   // never expose password hash
  sensitiveField: (user, _, ctx) => {
    if (!ctx.user || ctx.user.id !== user.id) return null;
    return user.sensitiveField;
  }
}
```

---

## Performance

```javascript
// 1. DataLoader for N+1 (essential — always use)
// 2. Query analysis: log query cost before executing
// 3. Persisted queries: reduce network payload, enable CDN caching
// 4. Apollo Cache (Redis): cache resolver results

const { KeyvAdapter } = require("@apollo/utils.keyvadapter");
const Keyv = require("keyv");

const cache = new KeyvAdapter(new Keyv({ store: redisClient }));

const server = new ApolloServer({
  cache,    // Apollo uses this for response caching
  plugins: [
    ApolloServerPluginCacheControl({ defaultMaxAge: 0 })
  ]
});

// Cache specific fields
type Query {
  products: [Product!]! @cacheControl(maxAge: 300)
}
```

---

## Debugging

```bash
# Apollo Studio sandbox — interactive GraphiQL in browser
# Point it at http://localhost:4000/graphql

# Enable query tracing
const server = new ApolloServer({
  plugins: [ApolloServerPluginInlineTrace()]
});

# Common errors:
# "Cannot query field X on type Y" — field not in schema
# "Variable $id has coerced null value" — non-null arg is null
# "N+1 detected" — missing DataLoader
# Resolver returns undefined — missing return statement
```

---

## Interview Preparation

**Q1: What is GraphQL? How does it differ from REST?**
A: GraphQL is a query language and runtime for APIs. Unlike REST, which exposes multiple endpoints each returning fixed shapes, GraphQL exposes a single endpoint where clients declare exactly what data they need. REST over-fetches (returns unused fields) or under-fetches (requires multiple requests). GraphQL solves both. The tradeoff: REST is simpler, caches naturally by URL, and has a larger ecosystem. GraphQL works better when you have diverse clients with different data needs.

**Q2: What is the N+1 problem in GraphQL? How do you solve it?**
A: When resolving a list of N objects, each object's field resolver might execute a database query — resulting in 1 query for the list + N queries for each item's field = N+1 queries. DataLoader solves this by batching: it collects all `.load(key)` calls within one tick of the event loop and sends them as a single batch request. The result is 1 query for the list + 1 batch query for all related items.

**Q3: What is the difference between a Query, Mutation, and Subscription?**
A: Query reads data (idempotent, like GET). Mutation writes/modifies data (like POST/PUT/DELETE). Subscription establishes a long-lived WebSocket connection for real-time data — the server pushes updates to the client when data changes. A client subscribes to events; the server publishes via a pub/sub mechanism.

**Q4: What is Apollo Federation?**
A: Federation allows splitting a GraphQL schema across multiple independent services (subgraphs), each owning its domain. A Gateway/Router composes them into a unified supergraph. If the Orders service needs User data, it can extend the User type (defined in the Users service) with order-specific fields. Clients query the unified schema without knowing it's split across services.

**Q5: How does GraphQL handle errors?**
A: GraphQL can return partial results with errors. A response can have both `data` (partially resolved fields) and `errors` (list of errors for failed fields). This differs from REST where errors replace the response body. Each error has `message`, `locations`, `path`, and `extensions` (for machine-readable codes). Resolvers throw `GraphQLError` with extensions to signal specific error conditions.

---

## Practical Tasks

### Beginner (10 Tasks)
1. Set up Apollo Server and define a schema with 3 types and 5 queries.
2. Write resolvers for all defined queries that return mock data.
3. Use GraphiQL to test all your queries and mutations.
4. Add a mutation that creates a resource and returns it.
5. Implement field-level resolvers that compute derived fields.
6. Use query variables in GraphiQL to avoid hardcoded arguments.
7. Add an enum type and use it in a query filter.
8. Implement an input type for a mutation with 5 fields and defaults.
9. Add error handling with GraphQLError and meaningful error codes.
10. Connect a query resolver to a real PostgreSQL database.

### Intermediate (10 Tasks)
1. Implement DataLoader to solve the N+1 problem for a User → Posts relationship.
2. Add JWT authentication via context and protect a mutation with auth check.
3. Implement cursor-based pagination following the Relay spec (edges, pageInfo).
4. Add real-time subscriptions for "order status changed" events.
5. Implement a `@auth` custom directive that enforces authentication on fields.
6. Add depth limiting and query complexity analysis.
7. Disable introspection in production and enable persisted queries.
8. Add response caching with Redis for expensive read queries.
9. Write unit tests for resolvers using Jest.
10. Generate TypeScript types from your schema using `graphql-codegen`.

### Advanced (10 Tasks)
1. Build a federated supergraph with 2 subgraph services (users + orders).
2. Implement file upload via GraphQL using `graphql-upload`.
3. Build a GraphQL gateway that stitches two schemas into one.
4. Implement field-level rate limiting per resolver using Redis.
5. Add OpenTelemetry tracing to all resolver executions.
6. Build a CLI tool that validates GraphQL queries against a schema.
7. Implement DataLoader with a Redis L2 cache (DB miss → Redis → DB).
8. Build a real-time collaborative app (shared document editing) using subscriptions.
9. Migrate a REST API to GraphQL incrementally without breaking existing clients.
10. Build a GraphQL to REST proxy that wraps legacy REST endpoints.

---

## Mini Project

**Social Feed GraphQL API**:
- Types: User, Post, Comment, Like
- Queries: feed (cursor paginated), user, post, search
- Mutations: createPost, addComment, likePost, follow
- Subscriptions: newPost in feed, newComment on post
- Auth: JWT in context; protect mutations
- DataLoader for N+1 prevention
- TypeScript types from codegen

---

## Production Project

**GraphQL API for a Marketplace**:
- Federated: Products service, Orders service, Users service, Reviews service
- Apollo Router as the gateway
- Redis caching for product catalog queries
- Subscriptions for order status updates
- Full auth: JWT + @auth directive
- Persisted queries for production security
- Complexity + depth limiting
- OpenTelemetry distributed tracing

---

## Capstone Project

**Compare REST vs GraphQL**: Build the same API (blog: users, posts, comments, tags) twice — once with REST, once with GraphQL. Then benchmark and analyze:
- Network payload sizes for a complex dashboard view
- Number of round-trips required
- Developer experience for adding a new required field
- Caching strategies and complexity
- Write a technical decision document recommending when to use each

---

## Self Assessment
1. What problem does GraphQL solve that REST doesn't?
2. What is over-fetching? What is under-fetching?
3. What is the N+1 problem? How does DataLoader solve it?
4. What are the three root types in GraphQL?
5. What is an Input type? Why is it separate from Object types?
6. What is a Fragment in GraphQL?
7. What is a GraphQL Subscription? What transport does it use?
8. What is Apollo Federation? What is a subgraph?
9. What is introspection? When should you disable it?
10. What is a custom directive? Give an example use case.
11. What is query complexity limiting and why does it matter?
12. What are persisted queries?
13. What is the Relay cursor connection spec?
14. What does `@external` mean in Federation?
15. What is the difference between `formatError` and a resolver `try/catch`?

---

## Cheat Sheet

### Schema Basics
```graphql
type User {
  id: ID!          # non-null
  name: String!
  posts: [Post!]!  # non-null list of non-null Posts
  profile: Profile # nullable
}

input CreateUserInput {
  name: String!
  email: String!
}

type Query  { user(id: ID!): User  }
type Mutation { createUser(input: CreateUserInput!): User! }
type Subscription { userCreated: User! }
```

### Resolver Signature
```javascript
resolver: (parent, args, context, info) => value
// parent  = parent object
// args    = field arguments from query
// context = shared per-request context (user, db, loaders)
// info    = AST, field info
```

### DataLoader Pattern
```javascript
const loader = new DataLoader(async (ids) => {
  const rows = await db.query("SELECT * FROM table WHERE id = ANY($1)", [ids]);
  return ids.map(id => rows.find(r => r.id === id) ?? null);
});

// In resolver:
User: { posts: (user, _, ctx) => ctx.loaders.posts.load(user.id) }
```

### Error
```javascript
throw new GraphQLError("Message", {
  extensions: { code: "NOT_FOUND", statusCode: 404 }
});
```
