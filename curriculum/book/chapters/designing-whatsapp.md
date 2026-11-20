# Case Study: Designing WhatsApp

> [!GOALS]
> - Design a real-time messaging system: requirements, estimates, components and deep dives.
> - Keep **persistent connections** for millions of devices and route messages between connection servers.
> - Deliver messages **reliably**: acknowledgements, idempotent sends, per-chat **ordering**, offline queues and receipts.
> - Design group messaging, media, presence and push notifications.
> - Understand how **end-to-end encryption** shapes the server's role.

## Why this matters

Messaging apps — WhatsApp, Signal, Telegram, Messenger, and chat inside games, banking apps and support tools — are a favourite system design topic because their requirements are strict and intuitive. Everybody knows what should happen: a message must never be lost, must never appear twice, must appear in order, must arrive within a second when the other person is online, and must wait safely when they are not. Doing that for billions of messages a day across unreliable mobile networks touches persistent connections ({{ch:websockets}}), distributed systems ({{ch:distributed-systems}}), messaging ({{ch:message-brokers}}) and storage at scale.

Compared with the feed in {{ch:designing-twitter}}, the problem shifts from "precompute for reads" to **reliable, low-latency delivery** between specific devices.

## The simple idea

Think of a post office that has a direct pneumatic tube to every customer's desk. When someone sends a letter, the post office stamps it with a number for that conversation, keeps a copy, and fires it down the recipient's tube. If the recipient's tube is closed (they are offline), the letter waits in a pigeonhole and is fired the moment the tube opens. The sender gets a tick when the post office has the letter, two ticks when it reaches the desk, and blue ticks when it is read.

> [!ANALOGY]
> A messaging system is like a post office with a tube to every desk: number each letter, keep a copy, send it immediately if the tube is open, otherwise hold it until it opens, and report back with ticks.
>
> **Where the analogy breaks:** tubes do not drop letters halfway and resend them. Mobile networks do: a phone can send a message, lose signal before the confirmation arrives, and send it again. The system must recognise the second copy as the same message — and with end-to-end encryption, the post office cannot even read the letters it is handling.

## Requirements

### Level 1 — What to build

**Functional:**
- One-to-one messages (text first; media as an extension).
- Group chats (up to, say, 1,000 members).
- Delivery to offline users when they reconnect.
- Receipts: sent, delivered, read.
- Presence ("online", "last seen") and typing indicators.
- Multiple devices per user.

**Non-functional:**
- **Low latency**: under a second end to end when both are online.
- **No message loss** once the sender sees "sent"; **no duplicates** shown; **order preserved** within a chat.
- **High availability**; mobile networks that drop connections constantly.
- **End-to-end encryption**: only the participants can read messages.
- Messages stored on the server only until delivered (WhatsApp's model) — or kept for history (other apps' model). Choose and state it.

### Level 1 — Estimates

Assume 1 billion daily active users sending 40 messages a day.

- **Messages**: 40 billion a day ≈ **460,000/s** average, perhaps 1.5 million/s at peaks.
- **Connections**: if 300 million devices are connected at once and one connection server holds 500,000 connections, that needs **600+ connection servers** (more with headroom and multiple zones).
- **Storage** for undelivered messages: if 10% wait an average of one hour, 40B × 0.1 × (1 h ÷ 24 h) ≈ 170 million messages queued at any time × ~1 KB ≈ **170 GB** — small, because delivered messages are deleted. Keeping full history instead would be about 40 TB a day.
- **Media** dominates bandwidth and goes through object storage and a CDN.

## High-level design

### Level 2 — Components

```text
 phone ═══ persistent connection (WebSocket / TCP + TLS) ═══ connection (gateway) servers
                                                                 │      ▲
                                    session registry: user/device → connection server (Redis)
                                                                 │      │
                                                          chat service (routing, ordering, receipts)
                                                                 │
                                            message store (per recipient inbox, partitioned by user)
                                                                 │
                                     push notification service (APNs / FCM) for offline devices
 media: phone ──pre-signed upload──► object storage (encrypted blobs) ──► CDN
```

- **Connection servers** hold long-lived connections, authenticate devices, and only move bytes; they are stateless apart from the open connections.
- The **session registry** records which connection server each online device is attached to, so the chat service knows where to send a message.
- The **chat service** assigns order, stores the message for each recipient device, routes it to the right connection server if online, and processes acknowledgements and receipts.
- The **message store** keeps messages until every recipient device acknowledges them (partitioned by recipient).
- **Push notifications** wake offline phones so they reconnect and fetch messages.

## Deep dives

### Level 3 — Reliable delivery

Every hop uses **acknowledgements**, and every message carries a **client-generated message ID**, so retries are recognised. This model of the chat service shows the delivery rules:

```ts
// A model of a chat server's delivery logic: per-chat sequence numbers, idempotent sends,
// offline queues and receipts ("sent", "delivered", "read").
type Msg = { chatId: string; seq: number; clientMsgId: string; from: string; text: string };
type Receipt = "sent" | "delivered" | "read";

class ChatServer {
  private seqByChat = new Map<string, number>();
  private seen = new Map<string, Msg>();                    // clientMsgId -> stored message (deduplication)
  private offline = new Map<string, Msg[]>();               // undelivered messages per recipient
  online = new Set<string>();
  receipts = new Map<string, Receipt>();
  inbox = new Map<string, string[]>();                      // what each device has displayed

  send(from: string, to: string, chatId: string, clientMsgId: string, text: string): string {
    const existing = this.seen.get(clientMsgId);
    if (existing) return `duplicate of seq ${existing.seq}, acknowledged again`;      // client retried after a lost ack
    const seq = (this.seqByChat.get(chatId) ?? 0) + 1;
    this.seqByChat.set(chatId, seq);
    const msg = { chatId, seq, clientMsgId, from, text };
    this.seen.set(clientMsgId, msg);                        // persisted before acknowledging
    this.receipts.set(clientMsgId, "sent");
    if (this.online.has(to)) this.deliver(to, msg);
    else this.offline.set(to, [...(this.offline.get(to) ?? []), msg]);
    return `stored as seq ${seq} (${this.receipts.get(clientMsgId)})`;
  }
  private deliver(to: string, m: Msg) {
    this.inbox.set(to, [...(this.inbox.get(to) ?? []), `#${m.seq} ${m.from}: ${m.text}`]);
    this.receipts.set(m.clientMsgId, "delivered");
  }
  connect(user: string) {
    this.online.add(user);
    const queued = (this.offline.get(user) ?? []).sort((a, b) => a.seq - b.seq);
    this.offline.delete(user);
    for (const m of queued) this.deliver(user, m);
    return queued.length;
  }
  read(clientMsgId: string) { this.receipts.set(clientMsgId, "read"); }
}

const s = new ChatServer();
s.online.add("sara");
console.log("1:", s.send("sara", "ali", "chat-sara-ali", "c-001", "Are you coming at 7?"));
console.log("2:", s.send("sara", "ali", "chat-sara-ali", "c-002", "I booked the table"));
console.log("2 again (retry):", s.send("sara", "ali", "chat-sara-ali", "c-002", "I booked the table"));
console.log("receipts while Ali is offline:", [...s.receipts].map(([id, r]) => `${id}=${r}`).join(" "));
console.log("Ali connects, queued messages delivered:", s.connect("ali"));
console.log("Ali's screen:", s.inbox.get("ali"));
s.read("c-001"); s.read("c-002");
console.log("receipts:", [...s.receipts].map(([id, r]) => `${id}=${r}`).join(" "));
console.log("3:", s.send("ali", "sara", "chat-sara-ali", "c-101", "Yes, see you there"));
console.log("Sara's screen:", s.inbox.get("sara"));
```

**Output:**

```text
1: stored as seq 1 (sent)
2: stored as seq 2 (sent)
2 again (retry): duplicate of seq 2, acknowledged again
receipts while Ali is offline: c-001=sent c-002=sent
Ali connects, queued messages delivered: 2
Ali's screen: [ '#1 sara: Are you coming at 7?', '#2 sara: I booked the table' ]
receipts: c-001=read c-002=read
3: stored as seq 3 (delivered)
Sara's screen: [ '#3 ali: Yes, see you there' ]
```

- **"Sent" means stored**: the server acknowledges only after the message is durably written. If the acknowledgement is lost, the client resends with the **same client message ID**, and the server recognises the duplicate instead of storing a second copy — **idempotent sends** ({{ch:distributed-systems}}).
- **Ordering**: the server assigns a **sequence number per chat**, so all participants display messages in the same order regardless of network timing. (Sending devices also order their own messages locally.)
- **Offline delivery**: Ali was offline, so messages waited in his queue; on reconnect, they were delivered in sequence order and the receipts moved to **delivered**.
- **Receipts** are messages themselves (delivered, read), flowing back to the sender's devices.
- On the recipient's side, the device acknowledges each message it has stored; until then the server keeps it, and re-sends after reconnects — the device deduplicates by message ID. Together this is **at-least-once delivery with deduplication**: effectively exactly-once display.

### Level 3 — Connections at scale

- **Persistent connections** (WebSocket or a custom protocol over TCP with TLS) avoid polling and give sub-second delivery. Phones send small **heartbeats** to keep mobile network middleboxes from closing idle connections, balanced against battery use.
- **Connection servers** are event-driven (one process holds hundreds of thousands of mostly idle connections); load balancers spread new connections; when a server fails, its clients reconnect elsewhere and the registry updates.
- **Routing**: the chat service looks up the recipient's devices in the registry and forwards the message to their connection servers (directly, or through a message bus partitioned by connection server).
- **Reconnect storms**: if a data centre fails, millions of clients reconnect at once — clients use **randomised backoff**, and servers rate-limit connection setup.
- **Multiple devices**: each device has its own connection, inbox and acknowledgements; a message is delivered to all the recipient's devices (and the sender's other devices).

### Level 3 — Group chats

- **Fan-out on write**: a message to a group of 200 is stored once and fanned out to 200 members' devices (and their offline queues). With small groups, this is cheap and keeps reads simple.
- **Ordering in groups**: one sequence per group, assigned by the service responsible for that group (partitioned by group ID), so every member sees the same order.
- **Membership changes** are events in the same sequence, so "Sara added Ali" appears in the right place and Ali does not receive earlier messages.
- **Very large groups** or broadcast channels (thousands to millions of members) shift towards fan-out on read, like celebrity feeds.

### Level 4 — End-to-end encryption

With **end-to-end encryption** (for example the Signal protocol), messages are encrypted on the sender's device with keys only the recipients' devices hold. The server routes **ciphertext**:

- The server stores and delivers encrypted blobs and metadata (who sends to whom, when, sizes) — it cannot read content, search it or moderate it.
- **Key distribution**: devices publish public keys (identity keys and pre-keys) to a key server; senders fetch them to start sessions, even when the recipient is offline. Users can verify each other's keys (safety numbers) to detect interception.
- **Groups and multiple devices** mean encrypting for each recipient device (or using group-key schemes), which affects fan-out cost.
- **Media** is encrypted on the device with a random key, uploaded as an encrypted blob; the key travels inside the encrypted message.
- **Backups** of chat history are an important weak point unless they are encrypted too.

### Level 4 — Presence, typing and notifications

- **Presence** ("online", "last seen") changes constantly. Publish it only to contacts who are currently viewing, batch and rate-limit updates, and accept that it is approximate.
- **Typing indicators** are ephemeral: never stored, dropped if delivery fails.
- **Push notifications** through Apple's and Google's services wake offline devices; with end-to-end encryption, the push says only "new message" or carries encrypted content the app decrypts.
- **Rate limits and spam controls** on sending, especially to non-contacts and large groups ({{ch:rate-limiting}}).

### Level 4 — Storage choices and failure handling

- **Message queues per device**, partitioned by user ID in a wide-column or key-value store with high write throughput; delete after acknowledgement (or keep history in a separate, encrypted store if the product requires it).
- **Session registry** in an in-memory store replicated across zones; it is rebuildable, since clients reconnect.
- **Failures**: a connection server crash loses only connections — clients reconnect and fetch undelivered messages from the store. The store and chat service must be replicated, because they hold the "sent but not delivered" promise.
- **Multi-region**: users connect to the nearest region; messages between regions travel over replicated queues; per-chat ordering is owned by one region at a time.

## From beginner to enterprise

**Level 1–2 — the basic design.** Requirements; persistent connections; connection servers, session registry, chat service, message store and push notifications.

**Level 3 — reliability.** Acknowledgements at each hop; idempotent sends with client message IDs; per-chat sequence numbers; offline queues; receipts; multi-device delivery; group fan-out.

**Level 4 — at scale and securely.** End-to-end encryption and key distribution; presence and typing at scale; reconnect storms; storage and replication of undelivered messages; multi-region routing.

**Level 5 — senior discussion.** Battery and data trade-offs on mobile; moderation and abuse in encrypted systems; history and backups; compliance and lawful-access debates.

**Level 6 — real platforms.** Custom protocols, global edge networks and specialised connection infrastructure — beyond an interview, but useful context.

## Interview walkthrough

### How to present it

1. Clarify scope: one-to-one and groups, receipts, offline delivery, encryption, history or not.
2. Estimate messages per second and concurrent connections.
3. Draw connection servers, session registry, chat service, message store and push.
4. Deep-dive into the **send path**: client ID, store, ack, route, deliver, device ack, receipt — and what happens if any step fails.
5. Cover groups, ordering, presence and encryption; finish with failure scenarios.

## Common mistakes

### Beginner: polling for new messages

**Consequence:** latency, battery drain and server load. **Fix:** persistent connections with push for offline devices.

### Beginner: acknowledging before storing

**Consequence:** lost messages when a server fails. **Fix:** store durably, then acknowledge.

### Intermediate: no client message IDs

**Consequence:** duplicates after network retries. **Fix:** idempotent sends.

### Intermediate: ordering by device timestamps

**Consequence:** messages in different orders on different devices. **Fix:** server-assigned per-chat sequence numbers.

### Intermediate: storing presence like messages

**Consequence:** enormous write load for ephemeral data. **Fix:** in-memory, rate-limited, best-effort presence.

### Production: synchronised reconnects

**Fix:** jittered backoff and connection rate limits.

## Debugging and troubleshooting

- **Messages stuck on one tick**: recipient offline and not woken — push notification failures, or the device not fetching its queue on reconnect.
- **Duplicates on screen**: missing deduplication by message ID on the device or server.
- **Out-of-order messages**: sequence numbers not used for display, or several services assigning sequences for one chat.
- **Spikes in connection setup**: a region or connection server failure; check backoff behaviour.
- **High latency for some users**: routing to a distant region, or a hot connection server.

## Security summary

- **End-to-end encryption** with verified keys; servers handle ciphertext only.
- **Device authentication** and per-device keys; revoking lost devices.
- **Metadata protection**: minimise logs of who talks to whom; restrict access internally.
- **Spam and abuse controls** that work without reading content: rate limits, reputation, user reports.
- **Encrypted media and backups.**

## How a senior engineer thinks about this

- **Define the delivery promise precisely.** "Sent" means durably stored; everything else follows from that.
- **Retries are normal.** Client IDs and deduplication make them harmless.
- **One owner per ordering.** A single sequence per chat, assigned in one place.
- **Separate durable from ephemeral.** Messages are durable; presence and typing are best effort.
- **Encryption changes the architecture.** The server becomes a router of opaque data.

## Exercises

### Exercise 1 — Trace a failure

**Objective:** practise reliability reasoning.
**What to do:** Sara sends a message, the server stores it, and the acknowledgement is lost because her phone goes through a tunnel. What does each component do, and what does Ali see?

<details>
<summary>Show the solution</summary>

- Sara's app still shows the message as "sending" and **retries** with the same client message ID when the connection returns.
- The server finds the ID, does **not** store it again, and re-sends the acknowledgement; Sara's app shows "sent".
- Ali received the message once (it was routed after the first store); even if a retry were routed again, his device deduplicates by message ID.
- Ali sees one message, in the right sequence position.

</details>

### Exercise 2 — Estimate connection servers

**Objective:** practise estimation.
**What to do:** 400 million devices are connected at peak. Each server handles 400,000 connections at 50% of its capacity target, and you run in 3 zones that must survive losing one. How many servers?

<details>
<summary>Show the solution</summary>

At the 50% target, each server should hold 400,000 connections (its maximum being about 800,000). 400M ÷ 400,000 = **1,000 servers** to carry peak load. To survive losing one of three zones, the remaining two must carry everything: deploy 1,000 ÷ 2 = 500 per zone, **1,500 servers** in total. (After a zone loss, clients reconnect to the other zones; servers there run closer to their maximum until capacity is added.)

</details>

### Exercise 3 — Design group ordering

**Objective:** practise ordering design.
**What to do:** in a 50-person group, two members send messages at almost the same moment from different countries. How do you make every member see the same order?

<details>
<summary>Show the solution</summary>

Route all messages of one group to the service instance (or partition) that **owns** that group — for example by hashing the group ID — which assigns the next sequence number to each message as it arrives. Members display messages by sequence number, not by device time. Whichever message the owner processes first gets the lower number; every member sees the same order. If the owner fails, another takes over the partition and continues from the last stored sequence (consensus or a lease protects against two owners).

</details>

## Summary

A WhatsApp-like system must deliver messages **quickly, exactly once in effect, in order and even to offline devices**, over unreliable mobile networks. At a billion daily users, that means hundreds of thousands of messages per second and hundreds of millions of open connections.

**Connection servers** hold persistent, authenticated connections with heartbeats; a **session registry** maps devices to servers; the **chat service** assigns **per-chat sequence numbers**, stores messages durably per recipient device, routes them to online devices and queues them for offline ones; **push notifications** wake phones. Reliability comes from acknowledgements at every hop, **client message IDs** for **idempotent sends**, deduplication on devices and **receipts** as messages. Groups use one sequence per group and fan out to members; very large broadcasts move towards pull. **End-to-end encryption** means the server routes ciphertext and distributes public keys, and media is encrypted on the device. Presence and typing are ephemeral and rate-limited; reconnect storms need jittered backoff; the message store and chat service are replicated because they hold the delivery promise.

## Key terms

- **Persistent connection** — A long-lived connection kept open for real-time messages.
- **Connection server** — A server that holds client connections and moves messages to and from them.
- **Session registry** — A mapping from users or devices to their connection servers.
- **Heartbeat** — A small periodic message that keeps a connection alive and detects failures.
- **Client message ID** — An identifier created by the sending device to make retries idempotent.
- **Per-chat sequence number** — A server-assigned number that orders messages within a conversation.
- **Offline queue** — Stored messages waiting for a device to reconnect.
- **Delivery receipt** — A notification that a message reached or was read on the recipient's device.
- **Push notification** — A platform message that wakes an offline app.
- **Presence** — Information about whether a user is online or when they were last seen.
- **End-to-end encryption** — Encryption where only the communicating devices hold the keys.
- **Pre-key** — A public key published in advance so others can start encrypted sessions with an offline device.
- **Reconnect storm** — A flood of clients reconnecting at once after a failure.

## What comes next

Messages are small; video is enormous. The last case study, {{ch:designing-youtube}}, designs a video platform: uploads, transcoding pipelines, adaptive streaming, storage tiers and CDNs, view counts and recommendations at global scale.
