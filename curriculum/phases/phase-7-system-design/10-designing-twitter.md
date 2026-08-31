# Phase 7 — Chapter 10: Designing Twitter/X

---

## Chapter Overview

Designing Twitter is one of the most common system design interview questions. It covers: news feed generation, high write throughput, social graph, real-time updates, and global scale. Twitter has 300M+ MAU and processes ~500M tweets/day.

**Topics:**
- Requirements gathering for Twitter
- Scale estimation (QPS, storage)
- Data model (users, tweets, follows, likes)
- News feed generation strategies (push vs. pull)
- Timeline service (fan-out on write vs. fan-out on read)
- Search and trending topics
- Real-time delivery (WebSockets, Server-Sent Events)

---

## Requirements Clarification

```
Functional Requirements (MVP scope):
  1. Users can post tweets (≤ 280 characters)
  2. Users can follow other users
  3. Users see a home timeline (tweets from followed users)
  4. Users can like tweets
  5. Search tweets by keyword

Non-Functional Requirements:
  Availability:   99.99% (Twitter is mission-critical)
  Latency:        Feed loads in < 200ms (p99)
  Eventual consistency: OK if tweet appears in feed within 5 seconds
  Read-heavy:     Read:write ratio ≈ 100:1
  Scale:          500M tweets/day write, 50B timeline reads/day
```

---

## Scale Estimation

```
Users:
  300M MAU, 100M DAU
  20% post tweets → 20M users/day write tweets
  Average 2.5 tweets/user/day

Write QPS:
  500M tweets/day ÷ 86,400 sec = ~6,000 tweets/second
  Peak: 3x = 18,000 tweets/second (events, breaking news)

Read QPS:
  100M DAU × 50 timeline reads/day ÷ 86,400 = ~58,000 reads/second
  Peak: 600,000 reads/second

Storage:
  Tweet: ~400 bytes (text + metadata + IDs)
  500M tweets × 400 bytes/day = 200 GB/day
  × 5 years = 365 TB for text storage only
  Media: 10% of tweets have images (~1 MB each) = 50 TB/day (CDN)

Bandwidth:
  Text: 58,000 reads × 400 bytes = 23 MB/s read bandwidth
  Media: 10% with images → served from CDN (off-origin)
```

---

## Data Model

```sql
-- Users
CREATE TABLE users (
  id           UUID PRIMARY KEY,
  username     TEXT UNIQUE NOT NULL,
  display_name TEXT,
  bio          TEXT,
  follower_count  INT DEFAULT 0,
  following_count INT DEFAULT 0,
  tweet_count     INT DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Tweets
CREATE TABLE tweets (
  id          UUID PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES users(id),
  content     TEXT NOT NULL CHECK (LENGTH(content) <= 280),
  media_urls  TEXT[],
  like_count  INT DEFAULT 0,
  reply_count INT DEFAULT 0,
  retweet_count INT DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Follow Graph (social graph)
CREATE TABLE follows (
  follower_id UUID NOT NULL REFERENCES users(id),
  followee_id UUID NOT NULL REFERENCES users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (follower_id, followee_id)
);
CREATE INDEX ON follows (followee_id);  -- "who follows me?"

-- Likes
CREATE TABLE likes (
  user_id    UUID NOT NULL,
  tweet_id   UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, tweet_id)
);
```

---

## Core Design: News Feed Generation

```
Challenge: When user A posts a tweet, 10 million followers need to see it.
Two strategies: Fan-out on write (push) vs. Fan-out on read (pull).

─── Strategy 1: Fan-out on Read (Pull) ───
  When user opens Twitter, fetch recent tweets from all followed users.
  
  SELECT t.* FROM tweets t
  JOIN follows f ON t.user_id = f.followee_id
  WHERE f.follower_id = $userId
  ORDER BY t.created_at DESC
  LIMIT 20;
  
  Problem: 1,000 followings × JOIN = slow query.
  O(N) where N = number of followings.
  For heavy users (1000 followings): very slow.
  Very read-heavy at scale (58,000 QPS → lots of DB joins).

─── Strategy 2: Fan-out on Write (Push) ───
  When tweet is posted, write tweet ID into the feed cache of each follower.
  Feed = Redis sorted set (score = timestamp), value = tweet ID.
  
  When user reads feed: ZREVRANGE user:{id}:feed 0 19
  
  Pro: Read is O(1). Timeline reads are instant.
  Con: Write is O(followers). Celebrity with 10M followers
       → 10M Redis writes per tweet!

─── Twitter's Actual Approach: Hybrid ───
  Fan-out on write for regular users (< 1M followers).
  Fan-out on read for celebrities (> 1M followers) — don't pre-populate.
  
  On timeline request:
    1. Read pre-built feed from Redis (fan-out on write users)
    2. Fetch recent tweets from celebrities you follow (at-read join)
    3. Merge + sort the two sets
    4. Cache merged result for 30 seconds
```

---

## System Architecture

```
Architecture:

  Mobile/Web
      │
      ▼
  CDN (CloudFront) ──── Media: S3 + CDN
      │
      ▼
  API Gateway + Auth
      │
      ├── POST /tweets ──────────────────────────────────────────────────┐
      │                                                                   │
      │         Tweet Writer Service                                      │
      │           1. Validate                                             │
      │           2. Write to tweets DB (PostgreSQL/Cassandra)            │
      │           3. Publish TweetCreated event                           │
      │                                                                   │
      │         Fan-out Service (async, Kafka consumer)                   │
      │           1. Receive TweetCreated event                           │
      │           2. Fetch follower list from Social Graph Service         │
      │           3. For each follower (< 1M): push tweet ID to Redis feed│
      │                                                                   │
      └── GET /timeline ──────────────────────────────────────────────────┘
                │
          Timeline Service
            1. Read user's feed sorted set from Redis
               ZREVRANGE user:{id}:feed 0 99 (last 100 tweet IDs)
            2. MGET tweet:{id} for each ID (Redis cache)
            3. Cache miss: fetch from tweet DB
            4. Merge with celebrity tweets (at-read, small list)
            5. Return paginated result

  Data Stores:
    Tweet DB:        Cassandra (write-optimized, partition by tweet_id)
    Social Graph:    Redis (followees list) + DB (source of truth)
    Timeline Cache:  Redis sorted sets (per-user feed)
    Search:          Elasticsearch (tweet content)
    Media:           S3 + CloudFront CDN
    Analytics:       Kafka → Spark → Data Warehouse
```

---

## Real-Time Updates

```
Options for live updates:
  
  Polling: client polls every 30 seconds
    Simple. Very wasteful (most polls return nothing new).
  
  Long Polling: client keeps connection open until data available
    Server holds request, responds when new data arrives.
    Simpler than WebSockets. Good for low-frequency updates.
  
  Server-Sent Events (SSE): server pushes events to client
    Unidirectional (server → client). Built on HTTP.
    No library needed. Auto-reconnect.
    Good for: news feed updates, notifications.
  
  WebSockets: bidirectional, persistent connection
    Both sides can send at any time.
    Good for: DMs, live commenting, collaborative editing.
    Higher overhead than SSE.

Twitter's approach:
  SSE for timeline updates (server pushes new tweets)
  WebSockets for DMs (bidirectional)
  
  // Node.js SSE endpoint
  app.get("/api/v1/timeline/stream", authenticate, (req, res) => {
    res.setHeader("Content-Type",  "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection",    "keep-alive");
  
    const userId = req.user.sub;
    const listener = (tweet) => {
      res.write(`data: ${JSON.stringify(tweet)}\n\n`);
    };
  
    // Subscribe to Redis pub/sub channel for this user
    subscriber.subscribe(`feed:${userId}`, listener);
  
    req.on("close", () => {
      subscriber.unsubscribe(`feed:${userId}`, listener);
    });
  });
```

---

## Interview Preparation

**Q1: How would you design the Twitter feed for a celebrity with 50 million followers?**
A: The problem with fan-out-on-write for celebrities: posting one tweet requires writing to 50M Redis sorted sets — extremely slow and expensive. Twitter's approach (hybrid model): Regular users (< 1M followers): fan-out on write. When they tweet, their tweet ID is pushed to each follower's feed cache. Very fast reads. Celebrities (> 1M followers): fan-out on read. Their tweets are NOT pre-pushed to followers. Instead, when a user opens their timeline: 1) Read pre-built feed (from fan-out-on-write users). 2) Fetch recent tweets from the small set of celebrities they follow (at-read). 3) Merge and sort by timestamp. The merge at read time is fast because users typically follow only 1-5 celebrities. This keeps both write and read latency reasonable.

**Q2: How would you handle trending topics?**
A: Trending topics requires counting tweet frequency for each hashtag in a sliding time window (last hour/day). Naive approach: COUNT(tweets) GROUP BY hashtag WHERE created_at > now()-1h — too slow at scale. Better approach: Stream processing with Kafka + Apache Spark Streaming or Flink. Count hashtag occurrences in 1-minute windows. Aggregate across windows (last 15 minutes, last hour). Normalize by account age (avoid bot manipulation). Store top-K in Redis sorted set, expire after 5 minutes. Location-based trending: separate sorted sets per country/city. Anti-abuse: detect coordinated hashtag spamming (velocity check, account age filter).

---

## Cheat Sheet

```
Twitter Scale:
  300M MAU, 100M DAU, 500M tweets/day
  Write QPS: 6,000/s  |  Read QPS: 58,000/s avg (peak 600,000/s)
  Storage: 200 GB/day text, 50 TB/day media (CDN)

Feed Design:
  Fan-out write:  Push tweet to each follower's Redis sorted set on post
  Fan-out read:   Query at read time (slow for users with many followings)
  Hybrid:         Write for regular, read for celebrities (Twitter actual)

Key components:
  Tweet write → Kafka → Fan-out worker → Redis sorted set per user
  Timeline read → Redis ZREVRANGE → hydrate tweets → merge celebrity
  Real-time → SSE/WebSocket → Redis pub/sub

Storage choices:
  Tweets:         Cassandra (write-heavy, time-series, no joins needed)
  Social graph:   Dedicated graph service + cache (adjacency lists in Redis)
  Timeline cache: Redis sorted sets (tweet IDs as members, timestamp as score)
  Media:          S3 + CloudFront CDN
  Search:         Elasticsearch with tweet content index
```
