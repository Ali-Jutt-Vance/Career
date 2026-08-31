# Phase 7 — Chapter 11: Designing WhatsApp

---

## Chapter Overview

WhatsApp is a real-time messaging system serving 2 billion users. Designing it covers: persistent WebSocket connections, message delivery guarantees, end-to-end encryption, message ordering, presence, and offline message delivery.

**Topics:**
- Requirements for a messaging system
- WebSocket connection management at scale
- Message delivery guarantees (sent/delivered/read receipts)
- Message storage and retrieval
- Group messaging
- Presence system (online/offline)
- End-to-end encryption (conceptual)
- Notification for offline users

---

## Requirements Clarification

```
Functional:
  1. One-on-one messaging (text, images, video, files)
  2. Group messaging (up to 1,024 members)
  3. Message delivery status: sent ✓, delivered ✓✓, read ✓✓ (blue)
  4. Online/offline presence indicator
  5. Push notifications for offline users
  6. Message history stored and synced across devices

Non-Functional:
  Availability:    99.999% (messaging is critical)
  Latency:        Messages delivered in < 100ms (when online)
  Scale:          2B users, 100B messages/day
  Durability:     Messages stored for 30 days (or user deletes)
  Security:       End-to-end encrypted (E2EE)
  Ordering:       Messages in a conversation appear in send order
```

---

## Scale Estimation

```
Users: 2B total, 500M DAU

Messages:
  100B messages/day ÷ 86,400 = ~1.16M messages/second
  Peak: ~4M messages/second

WebSocket connections:
  500M DAU active in shifts:
  Peak concurrent: ~100M simultaneous connections
  Each connection needs a dedicated Chat Server

Storage:
  Message: 500 bytes average (text + metadata)
  100B messages × 500 bytes = 50 TB/day
  30-day retention: 1.5 PB
  Media: 20% of messages (images/video) → CDN + S3 (separate)

Servers:
  100M concurrent connections
  One server handles ~50,000 WebSocket connections
  → Need: 100M / 50,000 = 2,000 chat servers
```

---

## Architecture

```
System components:

  Client (phone)
      │  WebSocket
      ▼
  WebSocket / Chat Server (2,000+ servers)
      │  Stateful: maintains connection per user
      │
      ├── Route message to recipient's server
      │   via Service Discovery (Zookeeper or Redis)
      │
      ├── Message Service (persist messages)
      │   → Cassandra (message_store)
      │
      ├── Presence Service
      │   → Redis (user_id: lastSeen, server_id)
      │
      └── Notification Service (for offline users)
          → APNs (iOS), FCM (Android)

Message delivery flow:
  Alice sends to Bob:
  1. Alice's phone → WebSocket → Chat Server A
  2. Chat Server A persists message to Cassandra
  3. Lookup: what server is Bob connected to? → Redis → Server B
  4. Server A → Server B (internal HTTP/gRPC) → Server B → Bob's phone
  5. Bob's phone ACKs received → Server updates status to "delivered"
  6. Delivered status event sent back to Alice
  7. Bob opens conversation → read receipt sent → blue ticks
  8. If Bob offline: Server A → Notification Service → APNs/FCM
```

---

## Data Model

```
Message storage — Cassandra (optimized for conversation queries):

CREATE TABLE messages (
  conversation_id  UUID,
  message_id       TIMEUUID,   -- time-based UUID (sortable by time)
  sender_id        UUID,
  content          BLOB,       -- encrypted content
  content_type     TEXT,       -- text/image/video/document
  media_url        TEXT,
  status           TEXT,       -- sent/delivered/read
  created_at       TIMESTAMP,
  PRIMARY KEY (conversation_id, message_id)
) WITH CLUSTERING ORDER BY (message_id DESC)
  AND compaction = {'class': 'TimeWindowCompactionStrategy',
                    'compaction_window_size': '1',
                    'compaction_window_unit': 'DAYS'};

-- Query: get last 50 messages in a conversation
SELECT * FROM messages
WHERE conversation_id = ? LIMIT 50;

-- Conversations
CREATE TABLE conversations (
  conversation_id UUID PRIMARY KEY,
  type            TEXT,   -- direct / group
  participants    SET<UUID>,
  last_message_id TIMEUUID,
  created_at      TIMESTAMP
);

-- User's conversation list (for inbox)
CREATE TABLE user_conversations (
  user_id         UUID,
  last_message_at TIMESTAMP,
  conversation_id UUID,
  unread_count    INT,
  PRIMARY KEY (user_id, last_message_at, conversation_id)
) WITH CLUSTERING ORDER BY (last_message_at DESC);
```

---

## Message Delivery Guarantees

```
Three-tick receipt system:
  ✓   (grey) = sent (persisted on server)
  ✓✓  (grey) = delivered (recipient's device received it)
  ✓✓  (blue) = read (recipient opened the conversation)

Implementation:
  Sent: server persists to DB → ACK to sender
  Delivered: recipient's phone sends ACK → server updates status → notifies sender
  Read: recipient opens conversation → client sends read receipt → server → sender

Offline delivery:
  Bob is offline when message arrives.
  Server: persist message to DB, mark as "sent."
  Push notification via APNs/FCM (just a ping, not the content — for E2EE).
  Bob comes online: phone connects via WebSocket.
  Server sends pending messages. Bob's phone ACKs each. → "delivered."
  
Message ordering:
  Cassandra TIMEUUID: monotonically increasing, sortable.
  Each message in a conversation gets a unique TIMEUUID.
  Client displays in TIMEUUID order.
  For simultaneous messages (within same millisecond): TIMEUUID provides tiebreaker.
```

---

## Presence System

```
Presence states:
  Online:       connected via WebSocket, active < 5 min ago
  Recently seen: was online, now offline (shows "last seen 5 minutes ago")
  Offline:      hasn't been seen in > 24h

Implementation:
  On connect:   redis.set(`presence:${userId}`, { status: "online", serverId }, { ex: 30 })
  Heartbeat:    phone pings server every 20 seconds → server refreshes TTL
  On disconnect: TTL expires (30s) → Redis key gone → "recently seen"

Presence server pseudocode:
  // User connected
  await redis.set(`presence:${userId}`, JSON.stringify({
    status:    "online",
    serverId:  myServerId,
    lastSeen:  Date.now()
  }), { EX: 30 });

  // Heartbeat every 20s from client
  ws.on("message", async (data) => {
    if (data === "ping") {
      await redis.expire(`presence:${userId}`, 30);
      ws.send("pong");
    }
  });

  // Query presence
  async function getPresence(userId: string) {
    const data = await redis.get(`presence:${userId}`);
    if (!data) return { status: "offline" };
    return JSON.parse(data);
  }

Scale challenge: 
  If friend list = 500 users, querying presence for all 500 on open = 500 Redis calls.
  Solution: batch with MGET or use pub/sub to push presence changes.
```

---

## Group Messaging

```
Groups with up to 1,024 members.

Delivery challenge:
  A sends to group of 1,000. Need to deliver to 999 people.
  
  Option 1: Fan-out on write (Chat server → each member's server)
    Server A receives message.
    Looks up all 1,000 members' servers.
    Sends to each member's server via internal API.
    Each server delivers to their connected client.
    Cost: 1,000 internal requests per group message.
    Peak group of 1,024 × 4M messages/sec = too much.

  Option 2: Group message service + async delivery
    A sends to group.
    Persisted to Cassandra once (not 1,000 times).
    Kafka event: GroupMessageCreated { groupId, messageId }
    Fan-out worker (async): for each online member → push via their server.
    For offline: push notification via APNs/FCM.
    Members fetch messages by conversation_id on open.

WhatsApp actual: messages stored once in Cassandra per group.
Delivery is fan-out via messaging infrastructure (not naive fan-out-per-member).
Read receipts for groups: delivered when ALL members receive, read when ALL read.
```

---

## Interview Preparation

**Q1: How do you handle message delivery when a user is offline?**
A: When a message is sent to an offline user: 1) The chat server persists the message to Cassandra with status "sent." 2) The presence lookup shows the user is offline (no entry in Redis). 3) The notification service sends a push notification via APNs (iOS) or FCM (Android) — just a "you have a new message" ping (not the message content, for E2EE). 4) When the user comes back online, their phone connects via WebSocket to a chat server. 5) The server queries Cassandra for pending messages (since last seen timestamp). 6) Delivers each to the client. 7) Client ACKs each → server updates status to "delivered" → notifies sender. Message ordering: Cassandra TimeUUID ensures messages are returned in send order.

**Q2: How do you design the WebSocket infrastructure for 100M concurrent connections?**
A: 100M connections require ~2,000 chat servers (each handling 50K connections). Key design decisions: 1) Stateful servers — each user is connected to exactly one server. 2) Connection registry — Redis stores userId → serverId mapping. On connect, register. On disconnect, remove. 3) Server-to-server routing — when Alice sends to Bob: server A looks up Bob's server (Redis), forwards via internal gRPC call to server B, which sends to Bob's WebSocket. 4) Load balancing — WebSocket connections use a consistent hash (by userId) so reconnects from same user go to same region. 5) Scaling — if a server goes down, 50K users reconnect (thundering herd prevention: exponential backoff with jitter).

---

## Cheat Sheet

```
WhatsApp Scale:
  2B users, 500M DAU, 100B messages/day
  ~1.16M messages/second, 100M concurrent WebSocket connections

Message storage:
  Cassandra: PRIMARY KEY (conversation_id, message_id [TIMEUUID])
  TIMEUUID: time-sortable, unique, no clock sync needed
  30-day retention with TimeWindowCompactionStrategy

Delivery states:
  ✓ sent = persisted to server DB
  ✓✓ delivered = recipient's device ACKed
  ✓✓ (blue) read = recipient opened conversation

Connection routing:
  userId → serverId stored in Redis
  Server A sends to Server B via internal gRPC
  Offline: APNs/FCM push notification

Presence:
  Redis key: presence:{userId} = {status, serverId, lastSeen}
  TTL: 30 seconds, refreshed by heartbeat every 20s
  Key expired → "last seen {time}"

Group messages:
  Store once in Cassandra per group (not per member)
  Fan-out via async worker → push to each member's server
  Offline members: push notification
```
