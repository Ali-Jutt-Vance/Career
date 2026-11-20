# Case Study: Designing Twitter

> [!GOALS]
> - Apply the system design method to a social network with a home timeline: requirements, estimates, design, deep dives.
> - Generate unique, time-ordered IDs at scale.
> - Compare **fan-out on write**, **fan-out on read** and the **hybrid** approach, and solve the **celebrity problem**.
> - Design storage for posts, the social graph, timelines and media, with caching and partitioning.
> - Add search, notifications and counters, and discuss failure handling and trade-offs.

## Why this matters

"Design Twitter" (now X), or a similar feed — Instagram, LinkedIn, a news feed — is one of the most common system design interview questions, and for good reason: it contains most of the hard problems of large systems in one product. It is extremely read-heavy, has a few users with tens of millions of followers, needs low latency for a personalised view, and generates huge volumes of small writes, media and counters.

This chapter works through the design step by step, using the method from {{ch:system-design-fundamentals}} and the building blocks of this part: caching ({{ch:caching-at-scale}}), database scaling ({{ch:database-scaling}}), message brokers ({{ch:message-brokers}}) and event-driven processing ({{ch:event-driven-systems}}). The goal is not to reproduce any company's real architecture, but to reason the way experienced engineers do.

## The simple idea

Think of a newspaper made specially for each reader. Each morning, your paper must contain the latest stories from exactly the writers you follow, newest first. There are two ways to make it: every time a writer finishes a story, put a copy into the mailbox of every subscriber (work when writing), or wait until a reader asks and then collect the latest stories from each of their writers (work when reading). For most writers, the first is best; for a writer with forty million subscribers, filling forty million mailboxes for every story is impossible.

> [!ANALOGY]
> A home timeline is like a personalised newspaper: either copy each new story into every subscriber's mailbox, or collect the stories when the reader asks — and celebrities break the first approach.
>
> **Where the analogy breaks:** newspaper readers accept that the paper is printed once a day. Timeline readers expect a post to appear within seconds, while millions of others post at the same time — and a story that is deleted or edited must disappear from every copy.

## Requirements

### Level 1 — What to build

**Functional (core):**
- Post short messages (text up to 280 characters, optional images or video).
- Follow and unfollow users.
- See a **home timeline**: recent posts from followed accounts, newest first.
- See a **user timeline**: one user's posts.

**Extended (mention, then choose):** likes and reposts with counts, replies, search, notifications, trends.

**Non-functional:**
- Very **read-heavy**: timelines are read far more often than posts are written.
- Home timeline load in **under 200 ms** at p95.
- New posts appear in followers' timelines within **a few seconds** — **eventual consistency** is acceptable.
- **Highly available**; posts are **durable** once acknowledged.
- Some accounts have **tens of millions of followers**.

### Level 1 — Estimates

Assumptions (round numbers): 200 million daily active users; each posts 2 messages a day on average and loads the home timeline 20 times; an average user follows 200 accounts; a post's text and metadata take about 1 KB.

- **Writes**: 200M × 2 = 400M posts a day ≈ **4,600/s** average, perhaps 15,000/s at peaks.
- **Timeline reads**: 200M × 20 = 4 billion a day ≈ **46,000/s** average, 150,000/s at peaks.
- **Post storage**: 400M × 1 KB = **400 GB a day**, about 150 TB a year before replication — media is much larger and goes to object storage and a CDN.
- **Fan-out**: if each post went to 200 followers on average, that is 400M × 200 = **80 billion timeline inserts a day** (nearly a million per second) — a key number for the deep dive.

## High-level design

### Level 2 — Components

```text
 clients ──► CDN (media) 
    │
    └──► API gateway ──► post service ────► posts store (partitioned by post ID)
                │             │
                │             └─ PostCreated event ──► fan-out workers ──► timeline cache (per user, in Redis)
                │                                    ├─► search indexer ──► search index
                │                                    └─► notification service
                ├──► timeline service ──► timeline cache + celebrity posts ──► hydrate from post cache
                ├──► graph service ──► follow graph store (followers / following lists)
                └──► media service ──► pre-signed upload to object storage ──► transcoding workers ──► CDN
```

- **Post service** writes posts durably and publishes `PostCreated` events.
- **Fan-out workers** consume events and insert post IDs into followers' **timeline caches**.
- **Timeline service** reads a user's precomputed list of post IDs, merges in posts from celebrities, and **hydrates** IDs into full posts from a post cache.
- **Graph service** stores who follows whom.
- **Media** goes directly from clients to object storage with pre-signed URLs and is served through the CDN ({{ch:s3}}, {{ch:cloudfront}}).

## Deep dives

### Level 3 — Unique, time-ordered IDs

Posts need IDs that are unique across thousands of servers **without** a central counter, and preferably **sortable by time**, so "newest first" is a simple sort. The **Snowflake** scheme packs a timestamp, a machine ID and a per-millisecond sequence into 64 bits:

```ts
// 1. Snowflake-style IDs: 41 bits of milliseconds, 10 bits of machine ID, 12 bits of sequence.
//    IDs are unique without coordination and sort by time.
const EPOCH = Date.UTC(2020, 0, 1);
function snowflake(ms: number, machine: number, sequence: number): bigint {
  return (BigInt(ms - EPOCH) << 22n) | (BigInt(machine) << 12n) | BigInt(sequence);
}
const t = Date.UTC(2026, 10, 21, 9, 30, 0);
const ids = [snowflake(t, 7, 0), snowflake(t, 7, 1), snowflake(t, 12, 0), snowflake(t + 1, 3, 0)];
for (const id of ids) {
  const ms = Number(id >> 22n) + EPOCH, machine = Number((id >> 12n) & 0x3ffn), seq = Number(id & 0xfffn);
  console.log(`${id}  time ${new Date(ms).toISOString()}  machine ${machine}  sequence ${seq}`);
}

// 2. Fan-out on write versus on read, measured as work per post and per timeline load
type User = { name: string; followers: number };
const authors: User[] = [
  { name: "ordinary user", followers: 200 },
  { name: "popular chef", followers: 50_000 },
  { name: "celebrity", followers: 40_000_000 },
];
const celebrityThreshold = 1_000_000;
console.log("author            followers    fan-out on write: timeline inserts per post");
for (const a of authors) console.log(`${a.name.padEnd(16)} ${a.followers.toLocaleString("en-GB").padStart(11)}    ${a.followers.toLocaleString("en-GB")}`);

// A reader follows 300 accounts, 3 of them celebrities.
const following = 300, celebritiesFollowed = 3;
console.log(`timeline read, fan-out on read: query ${following} accounts' recent posts and merge`);
console.log(`timeline read, fan-out on write: 1 precomputed timeline lookup`);
console.log(`hybrid (celebrities over ${celebrityThreshold.toLocaleString("en-GB")} followers are pulled): 1 timeline lookup + ${celebritiesFollowed} celebrity queries, merged`);

// Merging the precomputed timeline with celebrity posts by ID (IDs sort by time)
const precomputed = [{ id: 105n, by: "friend" }, { id: 101n, by: "chef" }];
const pulled = [{ id: 107n, by: "celebrity A" }, { id: 103n, by: "celebrity B" }];
const merged = [...precomputed, ...pulled].sort((a, b) => (b.id > a.id ? 1 : b.id < a.id ? -1 : 0));
console.log("merged timeline (newest first):", merged.map((p) => `${p.id}:${p.by}`).join(", "));
```

**Output:**

```text
911911315046428672  time 2026-11-21T09:30:00.000Z  machine 7  sequence 0
911911315046428673  time 2026-11-21T09:30:00.000Z  machine 7  sequence 1
911911315046449152  time 2026-11-21T09:30:00.000Z  machine 12  sequence 0
911911315050606592  time 2026-11-21T09:30:00.001Z  machine 3  sequence 0
author            followers    fan-out on write: timeline inserts per post
ordinary user            200    200
popular chef          50,000    50,000
celebrity         40,000,000    40,000,000
timeline read, fan-out on read: query 300 accounts' recent posts and merge
timeline read, fan-out on write: 1 precomputed timeline lookup
hybrid (celebrities over 1,000,000 followers are pulled): 1 timeline lookup + 3 celebrity queries, merged
merged timeline (newest first): 107:celebrity A, 105:friend, 103:celebrity B, 101:chef
```

- The first four lines are IDs: two from machine 7 in the same millisecond differ by sequence; machine 12 in the same millisecond gets a different ID; the next millisecond's ID is larger. Each machine can create 4,096 IDs per millisecond with no coordination, and sorting by ID sorts by time.
- Caveats: machines need unique IDs (assigned at start-up), and a clock that moves backwards must be handled (wait, or refuse to generate). Alternatives: UUIDv7 (also time-ordered, 128 bits), or database sequences per partition.

### Level 3 — Fan-out: write, read or hybrid

The rest of the output compares the strategies:

- **Fan-out on write (push)**: when someone posts, insert the post ID into every follower's timeline. Reads are a **single lookup** — ideal for a read-heavy system. But the cost per post equals the follower count: 200 inserts for an ordinary user, 50,000 for a popular chef, and **40 million** for a celebrity. A celebrity's post would take minutes to deliver and swamp the workers — the **celebrity problem**.
- **Fan-out on read (pull)**: store only each author's posts; when a user opens their timeline, fetch recent posts from all 300 accounts they follow and merge. Writes are cheap, but every timeline read touches hundreds of partitions — far too slow at 150,000 reads per second.
- **Hybrid**: push for normal accounts; **pull** for accounts above a threshold (say 1 million followers). A timeline read is one precomputed lookup plus a few celebrity queries, merged by ID — the final output line shows a merged timeline in time order. This is the standard answer.

Further refinements:
- **Only fan out to active users**; for users who have not logged in for weeks, build the timeline on demand when they return.
- **Cap timeline length** (for example the latest 800 post IDs) in the cache; older history is fetched from storage when scrolled.
- **Timelines store IDs**, not full posts: edits and deletions update one post record, and hydration hides deleted posts.

### Level 3 — Storage

| Data | Access pattern | Store |
|---|---|---|
| Posts | Write once, read by ID, very high volume | Partitioned key-value or wide-column store (Cassandra-style, DynamoDB) or sharded SQL, keyed by post ID; replicated |
| User timeline (own posts) | Posts by author, newest first | Partitioned by author ID, clustered by post ID descending |
| Home timelines | Read by user, frequently | Redis lists or sorted sets per user (in memory, rebuildable) |
| Follow graph | Followers of X; who X follows | Two partitioned tables (followers by user, following by user) |
| Users | Profiles, settings, authentication | Relational database, replicated |
| Media | Large files | Object storage + CDN |
| Counters | Likes, reposts, views | Sharded counters in Redis, aggregated asynchronously |

- **Partition keys**: post ID for posts, user ID for timelines and graph — each common query hits one partition.
- **Home timelines are a cache**: if lost, they can be rebuilt from the graph and user timelines. That makes in-memory storage acceptable.
- **Hot keys**: a celebrity's user timeline and profile are read constantly — cache them in several replicas and in process ({{ch:caching-at-scale}}).

### Level 4 — Counters, search and notifications

- **Likes and counts**: a viral post receives thousands of likes per second; incrementing one database row would be a hot spot. Use **sharded counters** (several counter keys per post, summed on read) or buffer increments and write them in batches; counts can be slightly behind.
- **Search**: an indexer consumes `PostCreated` events into a search engine partitioned by time and term; recent posts are searched most ({{ch:event-driven-systems}}).
- **Notifications**: separate service consuming events (mentions, replies, likes), with per-user rate limiting and batching ("Sara and 12 others liked your post").
- **Trends**: stream processing over recent posts with time windows.

### Level 4 — Failures and trade-offs

- **Fan-out lag**: if workers fall behind, posts appear late — monitor consumer lag; prioritise active users; degrade by switching more authors to pull.
- **Cache loss**: rebuild timelines on demand from user timelines (fan-out on read as a fallback) with request coalescing.
- **Consistency**: a user who just posted should see their own post immediately — insert it into their own timeline synchronously (read-your-writes) even though followers get it asynchronously.
- **Deletes**: a deleted post must vanish quickly — mark it deleted in the post store and filter during hydration rather than removing it from millions of timelines.
- **Multi-region**: users served from the nearest region; posts replicated asynchronously between regions; accept that a follower in another region may see a post a little later.

## From beginner to enterprise

**Level 1–2 — the basic design.** Requirements and estimates; post, graph and timeline services; media in object storage with a CDN.

**Level 3 — the core trade-off.** Unique time-ordered IDs; fan-out on write, on read and hybrid; partitioned stores by access pattern; timelines as rebuildable caches.

**Level 4 — at scale.** Celebrity handling, active-user fan-out, sharded counters, search and notifications from events, failure modes and multi-region replication.

**Level 5 — senior discussion.** Cost of fan-out storage versus read latency, ranking instead of pure time order, moderation pipelines, and capacity planning for events.

**Level 6 — real platforms.** Ranking models, abuse and spam systems, global infrastructure and data residency — beyond an interview, but worth mentioning as next steps.

## Interview walkthrough

### How to present it

1. **Clarify** (2–3 minutes): core features, scale, latency and consistency expectations.
2. **Estimate** (2–3 minutes): writes, reads, storage and the fan-out number.
3. **High-level design** (10 minutes): the components and data flow for posting and reading.
4. **Deep dives** (15–20 minutes): IDs, fan-out and the celebrity problem, storage and partitioning, caching.
5. **Wrap up**: bottlenecks, failure handling, what you would build next.

Say the trade-offs out loud — "fan-out on write makes reads cheap but celebrities expensive, so…" — that reasoning is what interviewers look for ({{ch:technical-interview-guide}}, {{ch:presenting-a-design}}).

## Common mistakes

### Beginner: one SQL query joining follows and posts for every timeline

**Consequence:** impossible at scale. **Fix:** precomputed timelines (hybrid fan-out).

### Beginner: storing full posts in every timeline

**Consequence:** huge storage and impossible edits. **Fix:** IDs in timelines, hydrate from a post cache.

### Intermediate: ignoring celebrities

**Fix:** hybrid fan-out with a pull path for very large accounts.

### Intermediate: central ID generator

**Consequence:** a bottleneck and single point of failure. **Fix:** Snowflake-style or UUIDv7 IDs.

### Intermediate: single-row counters for likes

**Fix:** sharded or batched counters.

### Production: no plan for fan-out lag or cache loss

**Fix:** monitoring, rebuild paths and degradation strategies.

## Debugging and troubleshooting

- **Posts appear late for some users**: fan-out consumer lag; check partitions for hot authors.
- **Timeline slow for some users**: they follow many celebrities (many pull queries), or their timeline cache was evicted.
- **Counts jump or lag**: asynchronous aggregation — expected within limits; check the aggregation job.
- **Deleted posts still visible**: hydration not filtering deleted posts, or a cache serving old post data.

## Security summary

- **Authentication and per-user rate limits** on posting, following and liking, to resist spam and bots ({{ch:rate-limiting}}).
- **Privacy**: protected accounts must not leak into others' timelines, search or notifications — enforce visibility during hydration.
- **Media scanning** for malware and abuse before serving.
- **Abuse systems** consuming the same events: spam detection, moderation queues.

## How a senior engineer thinks about this

- **Start from the numbers.** The fan-out estimate decides the architecture.
- **Optimise the dominant path.** Reads dominate, so precompute — but handle the outliers.
- **Store what you can rebuild in fast, cheap places.** Timelines are caches, posts are the truth.
- **Eventual consistency where users accept it**, read-your-writes where they notice.

## Exercises

### Exercise 1 — Estimate the fan-out storage

**Objective:** practise estimation.
**What to do:** with 200 million active users, timelines capped at 800 post IDs of 8 bytes each, how much memory do home timelines need (before replication and overhead)?

<details>
<summary>Show the solution</summary>

200M × 800 × 8 bytes = 1.28 × 10¹² bytes ≈ **1.3 TB**, plus data-structure overhead (Redis sorted sets roughly double or triple it) and replication — so several terabytes of memory across a cluster. Fanning out only to users active in the last month and keeping fewer IDs for inactive ones reduces it considerably.

</details>

### Exercise 2 — Choose the threshold

**Objective:** practise hybrid design.
**What to do:** how would you choose the follower threshold above which accounts are pulled instead of pushed? What happens to an account that crosses it?

<details>
<summary>Show the solution</summary>

Choose it from capacity: the fan-out system's throughput (inserts per second) and the acceptable delivery delay. If workers handle 2 million inserts per second and posts should arrive within 5 seconds, a single post can fan out to at most about 10 million followers while other work continues — in practice choose a much lower threshold (such as 100,000–1,000,000) to leave headroom. When an account crosses it, stop pushing its new posts and mark it as "pulled"; existing timeline entries remain; readers' timeline service now queries that account's recent posts. Use hysteresis (a lower threshold to switch back) to avoid flapping.

</details>

### Exercise 3 — Design the like counter

**Objective:** practise hot-key design.
**What to do:** a post receives 50,000 likes per second for an hour. Design how likes are recorded and how the count is shown.

<details>
<summary>Show the solution</summary>

- **Record** each like as an idempotent event (user ID + post ID) into a log, so duplicates and unlikes are handled and the "did I like this?" state is stored per user (partitioned by user).
- **Count** with sharded counters (for example 64 Redis keys for the post, each like incrementing a random one) or with stream processing that aggregates per second and adds to a stored total.
- **Display** the sum of shards, cached for a second or two; exact counts can lag slightly.
- **Persist** totals periodically to the database.

</details>

## Summary

A Twitter-like system is a very **read-heavy**, latency-sensitive feed with extreme differences in follower counts. Start with requirements (posting, following, home and user timelines; eventual consistency for timelines; low latency; high availability) and estimates — thousands of posts per second, tens of thousands of timeline reads per second, hundreds of gigabytes of new data per day, and tens of billions of timeline inserts if every post were pushed.

The design uses a post service publishing events, **fan-out workers** filling per-user **timeline caches** with post IDs, a timeline service that **hydrates** IDs from a post cache, a graph service and media through object storage and a CDN. **Snowflake-style IDs** give unique, time-sortable IDs without coordination. **Fan-out on write** makes reads cheap but celebrities expensive; **fan-out on read** makes writes cheap but reads slow; the **hybrid** pushes normal accounts and pulls celebrities. Store each kind of data by its access pattern and partition key, treat timelines as rebuildable caches, use sharded counters for hot counts, feed search and notifications from events, and plan for fan-out lag, cache loss, deletes and read-your-writes for authors.

## Key terms

- **Home timeline** — The feed of recent posts from accounts a user follows.
- **User timeline** — The posts of a single user.
- **Fan-out on write** — Copying each new post into followers' timelines when it is created.
- **Fan-out on read** — Assembling a timeline from followed accounts when it is requested.
- **Hybrid fan-out** — Pushing posts from normal accounts and pulling posts from very large ones.
- **Celebrity problem** — The cost of fanning out posts from accounts with huge follower counts.
- **Hydration** — Turning a list of IDs into full objects by looking them up.
- **Snowflake ID** — A 64-bit ID combining a timestamp, machine ID and sequence.
- **Social graph** — The data describing who follows whom.
- **Sharded counter** — A counter split across several keys to avoid a hot spot.
- **Active-user fan-out** — Precomputing timelines only for recently active users.

## What comes next

Feeds tolerate seconds of delay; chat does not. The next chapter, {{ch:designing-whatsapp}}, designs a messaging system: persistent connections, message delivery and ordering, offline delivery, receipts, group chats, end-to-end encryption and presence at the scale of billions of messages a day.
