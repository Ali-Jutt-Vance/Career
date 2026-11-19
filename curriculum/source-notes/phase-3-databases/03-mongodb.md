# Phase 3 — Chapter 3: MongoDB

---

## Chapter Overview

MongoDB is the leading document database. It stores data as JSON-like BSON documents in collections (analogous to SQL tables), without a fixed schema. MongoDB excels at: flexible schema evolution, hierarchical/nested data, horizontal shaling out of the box, and very high write throughput.

**When to choose MongoDB over PostgreSQL:**
- Schema changes frequently (early product development)
- Data is naturally document-shaped (nested, variable fields)
- High write throughput and horizontal scale are priorities
- Geospatial queries are needed (built-in 2dsphere index)

**When NOT to use MongoDB:**
- Strong relational integrity required (foreign keys, JOINs)
- Complex multi-entity transactions
- Data warehouse / analytics workloads (use PostgreSQL or BigQuery)

---

## Beginner Theory

### Key Concepts

```
RDBMS         MongoDB         Meaning
────────────────────────────────────────
Database      Database        Database
Table         Collection      Group of documents
Row           Document        Single record (BSON)
Column        Field           Key in a document
Index         Index           B-tree or hash index
JOIN          $lookup         Aggregate pipeline join
Primary Key   _id             Auto-generated ObjectId or custom

BSON types (superset of JSON):
  ObjectId, Date, Binary, Int32, Int64, Decimal128, Regex
```

---

## Basic Examples

### Connection and CRUD

```javascript
// npm install mongoose

const mongoose = require("mongoose");

await mongoose.connect(process.env.MONGODB_URI, {
  dbName:   "myapp",
  maxPoolSize: 10
});

// Schema + Model
const userSchema = new mongoose.Schema({
  email: {
    type:     String,
    required: true,
    unique:   true,
    lowercase: true,
    trim:     true
  },
  name:    { type: String, required: true },
  role:    { type: String, enum: ["user", "admin"], default: "user" },
  profile: {
    bio:      String,
    avatar:   String,
    location: String
  },
  tags:    [String],
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true  // adds createdAt, updatedAt
});

// Indexes
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ tags: 1 });

const User = mongoose.model("User", userSchema);

// CREATE
const user = await User.create({
  email: "alice@example.com",
  name:  "Alice Smith",
  tags:  ["beta-user", "power-user"]
});

// READ
const found    = await User.findById(user._id);
const byEmail  = await User.findOne({ email: "alice@example.com" });
const admins   = await User.find({ role: "admin", isActive: true })
                           .select("name email")
                           .sort("-createdAt")
                           .limit(20)
                           .lean();  // plain JS objects, not Mongoose docs

// UPDATE
await User.findByIdAndUpdate(userId, {
  $set:  { name: "Alice Johnson" },
  $push: { tags: "vip" }
}, { new: true, runValidators: true });

// Atomic increment
await User.findByIdAndUpdate(userId, { $inc: { loginCount: 1 } });

// DELETE
await User.findByIdAndDelete(userId);

// Soft delete pattern
await User.findByIdAndUpdate(userId, {
  $set: { isActive: false, deletedAt: new Date() }
});
```

### Mongoose Schema Patterns

```javascript
// Embedded document (strong coupling, read together often)
const orderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  items: [{
    product: {
      id:    mongoose.Schema.Types.ObjectId,
      name:  String,
      price: Number
    },
    quantity: { type: Number, min: 1 },
    subtotal: Number
  }],
  shipping: {
    address: { street: String, city: String, zip: String },
    method:  String,
    cost:    Number
  },
  total:  { type: Number, required: true },
  status: { type: String, enum: ["pending","processing","shipped","delivered","cancelled"] }
}, { timestamps: true });

// Reference (weak coupling, loaded separately)
const postSchema = new mongoose.Schema({
  title:    { type: String, required: true },
  body:     String,
  author:   { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  tags:     [String],
  comments: [{ type: mongoose.Schema.Types.ObjectId, ref: "Comment" }]
}, { timestamps: true });

// Populate references
const post = await Post.findById(postId)
  .populate("author", "name email")
  .populate({ path: "comments", populate: { path: "author", select: "name" } });
```

---

## Intermediate Concepts

### Aggregation Pipeline

```javascript
// MongoDB's "SQL SELECT with GROUP BY, JOIN, and transforms"
// Each stage transforms the document stream

const pipeline = [
  // $match — filter (like WHERE)
  { $match: { status: "delivered", createdAt: { $gte: new Date("2025-01-01") } } },

  // $lookup — join with another collection
  { $lookup: {
    from:         "users",
    localField:   "userId",
    foreignField: "_id",
    as:           "user"
  }},
  { $unwind: "$user" },   // flatten array to single document

  // $group — aggregate (like GROUP BY)
  { $group: {
    _id:          "$userId",
    userName:     { $first: "$user.name" },
    orderCount:   { $sum: 1 },
    totalRevenue: { $sum: "$total" },
    avgOrder:     { $avg: "$total" }
  }},

  // $sort, $limit
  { $sort:  { totalRevenue: -1 } },
  { $limit: 10 },

  // $project — shape output (like SELECT fields)
  { $project: {
    _id:          0,
    userId:       "$_id",
    userName:     1,
    orderCount:   1,
    totalRevenue: { $round: ["$totalRevenue", 2] },
    avgOrder:     { $round: ["$avgOrder", 2] }
  }}
];

const topCustomers = await Order.aggregate(pipeline);

// Monthly revenue trend
const monthlyRevenue = await Order.aggregate([
  { $match: { status: { $ne: "cancelled" } } },
  { $group: {
    _id:     { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
    revenue: { $sum: "$total" },
    count:   { $sum: 1 }
  }},
  { $sort: { "_id": 1 } }
]);
```

### Transactions (MongoDB 4.0+)

```javascript
// Multi-document ACID transactions (requires replica set)
const session = await mongoose.startSession();
session.startTransaction();

try {
  const order = await Order.create([{
    userId: userId,
    items:  cartItems,
    total:  calculateTotal(cartItems)
  }], { session });

  await Product.bulkWrite(
    cartItems.map(item => ({
      updateOne: {
        filter: { _id: item.productId, stock: { $gte: item.quantity } },
        update: { $inc: { stock: -item.quantity } }
      }
    })),
    { session }
  );

  await session.commitTransaction();
  return order[0];
} catch (err) {
  await session.abortTransaction();
  throw err;
} finally {
  session.endSession();
}
```

### Indexing Strategies

```javascript
// Compound index — order matters (ESR rule: Equality, Sort, Range)
userSchema.index({ isActive: 1, role: 1, createdAt: -1 });
// Supports: find active admins sorted by creation date

// Text index for full-text search
productSchema.index({ name: "text", description: "text" }, {
  weights: { name: 10, description: 1 }
});
// Query: Product.find({ $text: { $search: "wireless headphones" } })
//              .sort({ score: { $meta: "textScore" } });

// 2dsphere index for geospatial
storeSchema.index({ location: "2dsphere" });
// Find stores within 5km
const nearby = await Store.find({
  location: {
    $near: {
      $geometry: { type: "Point", coordinates: [longitude, latitude] },
      $maxDistance: 5000  // meters
    }
  }
});

// TTL index — auto-delete documents after N seconds
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
// Document with expiresAt = new Date(Date.now() + 3600*1000) expires in 1hr

// Partial index — only index documents matching filter
userSchema.index(
  { email: 1 },
  { partialFilterExpression: { isActive: true }, unique: true }
);
```

---

## Advanced Concepts

### Change Streams (Real-Time)

```javascript
// Watch for database changes (requires replica set)
const changeStream = User.watch([
  { $match: { "operationType": { $in: ["insert", "update"] } } }
]);

changeStream.on("change", (change) => {
  console.log("Change detected:", change.operationType);
  if (change.operationType === "update") {
    const updatedFields = change.updateDescription.updatedFields;
    if (updatedFields.role) {
      // User role changed — invalidate permissions cache
      cacheService.del(`permissions:${change.documentKey._id}`);
    }
  }
});

// Use in Socket.io for real-time updates
changeStream.on("change", (change) => {
  io.to(`order:${change.documentKey._id}`).emit("order-updated", change);
});
```

---

## Interview Preparation

**Q1: When would you choose MongoDB over PostgreSQL?**
A: MongoDB is best when: data is naturally hierarchical/document-shaped (e.g., product catalog with varying attributes per category), schema evolves rapidly during early development, you need horizontal scaling with sharding (MongoDB's native horizontal scale), or you need flexible full-document updates. PostgreSQL is better for: strong relational integrity (foreign keys), complex multi-table JOINs, strict ACID transactions across multiple tables, analytics, and when data is naturally tabular. Many production systems use both: PostgreSQL for transactional data, MongoDB for flexible content/catalog data.

**Q2: What is the MongoDB aggregation pipeline?**
A: The aggregation pipeline is a sequence of stages that transform and process a stream of documents, analogous to Unix pipes. Each stage receives documents from the previous stage and outputs transformed documents. Common stages: `$match` (filter, like WHERE), `$group` (aggregate, like GROUP BY), `$lookup` (join, like SQL JOIN), `$unwind` (flatten arrays), `$project` (shape output, like SELECT), `$sort`, `$limit`, `$skip`. Pipelines are executed on the server and can use indexes (especially the first `$match` stage). Use `explain()` to see if indexes are being used.

**Q3: What are MongoDB transactions and when should you use them?**
A: MongoDB 4.0+ supports multi-document ACID transactions for replica sets (and sharded clusters in 4.2+). Use transactions when you must atomically modify multiple documents that must either all succeed or all fail (e.g., decrement inventory AND create an order — if inventory decrement succeeds but order creation fails, you need rollback). Transactions have higher overhead than single-document operations. Single-document operations in MongoDB are always atomic, so prefer designing your schema to minimize the need for multi-document transactions.

---

## Practical Tasks

### Beginner (10 Tasks)
1. Install MongoDB and connect with Mongoose.
2. Create a `User` schema with email, name, role, timestamps.
3. Insert 5 users and query them with `.find()`.
4. Use `.findOne()` with a query filter.
5. Update a user's name with `$set` operator.
6. Use `$push` to add a tag to a user's tags array.
7. Delete a user by `_id`.
8. Add a compound index for `{ isActive: 1, role: 1 }`.
9. Use `.lean()` for read-only queries (performance).
10. Use `.select("name email")` to return only specific fields.

### Intermediate (10 Tasks)
1. Build an aggregation pipeline to calculate total revenue by month.
2. Use `$lookup` to join orders with users.
3. Implement a multi-document transaction (inventory + order).
4. Create a text index and run a full-text search query.
5. Create a TTL index on a sessions collection.
6. Use `2dsphere` index for nearby store search.
7. Implement soft delete (`isActive: false` + `deletedAt`).
8. Use change streams to detect user role changes.
9. Implement pagination with cursor-based approach in MongoDB.
10. Use `bulkWrite` for batch updates.

### Advanced (10 Tasks)
1. Implement a multi-tenant system with database-per-tenant isolation.
2. Set up a replica set locally and test change streams.
3. Build a search feature with MongoDB Atlas Search (or `$text`).
4. Optimize a slow aggregation pipeline using `explain()`.
5. Implement a geospatial "find nearest" query.
6. Build a real-time notification feed using change streams + Socket.io.
7. Implement schema validation at the MongoDB level (`$jsonSchema`).
8. Design a sharding strategy for a high-traffic user collection.
9. Implement GDPR data deletion (cascade delete user + all related docs).
10. Build an audit log using change streams.

---

## Self Assessment
1. What is the MongoDB equivalent of a SQL table?
2. What is the difference between embedded documents and references?
3. What is the aggregation pipeline?
4. What is `$lookup`?
5. What is a TTL index?
6. When do MongoDB transactions require a replica set?
7. What is `lean()` in Mongoose and why use it?
8. What is `populate()` in Mongoose?
9. What is a change stream?
10. What is the ESR rule for compound indexes?

---

## Cheat Sheet

```javascript
// Connect
await mongoose.connect(MONGODB_URI, { dbName: "myapp" });

// Schema
const schema = new mongoose.Schema({ field: { type: String, required: true } }, { timestamps: true });
const Model  = mongoose.model("Name", schema);

// CRUD
await Model.create({ field: "value" });
await Model.findById(id).lean();
await Model.findOne({ field: "value" });
await Model.find({ role: "admin" }).select("name email").sort("-createdAt").limit(20).lean();
await Model.findByIdAndUpdate(id, { $set: { name: "x" } }, { new: true });
await Model.findByIdAndDelete(id);

// Update operators
$set, $unset, $inc, $push, $pull, $addToSet, $rename

// Aggregation
Model.aggregate([ { $match: {...} }, { $group: { _id: "$field", count: { $sum: 1 } } }, { $sort: { count: -1 } } ]);

// Transaction
const session = await mongoose.startSession();
session.startTransaction();
try { /* ... */; await session.commitTransaction(); }
catch { await session.abortTransaction(); throw err; }
finally { session.endSession(); }
```
