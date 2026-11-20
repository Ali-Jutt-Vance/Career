# WebSockets and Real-Time Features

> [!GOALS]
> - Explain why plain request–response HTTP cannot push updates, and the four ways to get "real-time": **polling**, **long polling**, **Server-Sent Events** and **WebSockets**.
> - Choose the simplest technique that meets each feature's needs.
> - Understand the WebSocket handshake, messages, close codes and heartbeats.
> - Build real-time servers in Node.js with `ws` and Socket.IO: rooms, broadcasting, message formats.
> - **Authenticate and authorise** real-time connections, and protect them from abuse.
> - Make real-time features **reliable**: store first, then push; sequence numbers; catching up after reconnects.
> - Scale real-time servers across many machines with a pub/sub layer, and run them behind load balancers.

## Why this matters

Users expect applications to update by themselves. A support chat shows the agent's reply the moment it is sent. An order page changes from "packed" to "shipped" without a refresh. A shop owner's dashboard counts sales as they happen. Two people editing the same product description see each other's changes.

Plain HTTP is **request–response**: the client asks, the server answers, and the conversation ends. The server cannot speak first. Real-time features need a way for the server to **push** information to the client when something happens.

There are several ways to do that, from the very simple (ask again every few seconds) to persistent two-way connections (WebSockets). Each has costs: persistent connections must be authenticated, kept alive, re-established after network drops, and spread across many servers — and a message pushed while a phone is in a tunnel is simply lost unless you design for it. This chapter explains the options, how WebSockets work, and how to build real-time features that are secure and reliable.

## The simple idea

Imagine waiting for a parcel.

- **Polling**: you walk to the door every five minutes to check. Simple, but mostly wasted trips, and the parcel may wait up to five minutes.
- **Long polling**: you stand at the door and wait. When the parcel arrives, you take it inside — then go straight back to wait for the next one.
- **Server-Sent Events**: the courier has your number and texts you whenever there is news. Messages go one way: from the courier to you.
- **WebSocket**: an open phone line between you and the courier. Either side can speak at any time.

> [!ANALOGY]
> Real-time techniques are like waiting for a parcel: checking the door every few minutes (polling), waiting at the door (long polling), receiving text updates (Server-Sent Events), or keeping a phone line open where both sides can talk at any time (WebSockets).
>
> **Where the analogy breaks:** a phone line tells you clearly when it drops. Network connections often fail **silently** — a phone switching from Wi-Fi to mobile data leaves the old connection looking open on the server for minutes. And anything said while the line was dead is gone. Real-time systems therefore need heartbeats to detect dead connections and a way to catch up on what was missed.

## The proper definition and key words

**Real-time communication** on the web means delivering updates from server to client (and often client to server) with low delay, as events happen, instead of only in response to client requests.

Key words:

- **Polling** — the client repeatedly requests updates at a fixed interval.
- **Long polling** — the client makes a request that the server holds open until there is data (or a timeout), then the client immediately requests again.
- **Server-Sent Events (SSE)** — a standard where the server keeps an HTTP response open and writes events to it in the `text/event-stream` format; browsers read it with the `EventSource` API.
- **WebSocket** — a protocol (RFC 6455) providing a persistent, **full-duplex** (both directions at once) connection over a single TCP connection, started with an HTTP **upgrade** handshake.
- **Frame / message** — the units of data sent over a WebSocket, as text or binary.
- **Heartbeat (ping/pong)** — small periodic messages that detect dead connections and keep idle connections open through proxies.
- **Room / channel / topic** — a named group of connections that receive the same messages.
- **Fan-out** — delivering one message to many recipients.
- **Pub/sub** — publish/subscribe: publishers send messages to a topic, and every subscriber of that topic receives them; used to connect real-time servers.
- **Presence** — knowing which users are currently online or in a room.

## The four techniques

### Level 1 — Comparing them

| Technique | Direction | How | Best for | Costs |
|---|---|---|---|---|
| **Polling** | Client asks | `GET /orders/1042` every N seconds | Rare updates where a delay of N seconds is fine | Wasted requests; delay up to N seconds |
| **Long polling** | Server → client | Request held open until there is news | Environments where nothing else works; legacy | A new request after every message; tricky timeouts |
| **Server-Sent Events** | Server → client | One long HTTP response with events | Notifications, live status, feeds, dashboards, streaming AI responses | One direction only (client still sends normal HTTP requests); text only |
| **WebSocket** | Both ways | Persistent upgraded connection | Chat, collaboration, games, frequent two-way traffic | Stateful connections to manage and scale; custom protocol on top |

The most common mistake is reaching for WebSockets when something simpler would do. **Ask what the feature really needs:**

- An order status that changes a few times a day? Polling every 30 seconds while the page is open — or SSE — is plenty.
- Notifications and live counters, server to client only? **SSE**: plain HTTP, automatic reconnection built into browsers, works with normal authentication cookies.
- Two-way, frequent, low-latency messages (chat with typing indicators, multiplayer cursors, games)? **WebSocket**.

### Level 2 — Server-Sent Events

SSE is just an HTTP response that does not end. Each event is a few lines of text followed by a blank line; an `id:` line lets the browser resume after a disconnect by sending a `Last-Event-ID` header. This complete example runs a server and a client in one script:

```ts
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";

// Server: an order-status stream using Server-Sent Events
const server = createServer((req, res) => {
  if (req.url !== "/orders/1042/events") return void res.writeHead(404).end();
  res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" });
  const lastId = Number(req.headers["last-event-id"] ?? 0);
  const updates = ["paid", "packed", "shipped"];
  updates.forEach((status, i) => {
    const id = i + 1;
    if (id > lastId) res.write(`id: ${id}\nevent: status\ndata: ${JSON.stringify({ orderId: "1042", status })}\n\n`);
  });
  res.end();
});

await new Promise<void>((resolve) => server.listen(0, resolve));
const { port } = server.address() as AddressInfo;

// Client: read the stream and parse events (browsers do this for you with EventSource)
async function readEvents(lastEventId?: string) {
  const response = await fetch(`http://localhost:${port}/orders/1042/events`, {
    headers: lastEventId ? { "Last-Event-ID": lastEventId } : {},
  });
  console.log(response.status, response.headers.get("content-type"));
  const text = await response.text();
  for (const block of text.split("\n\n").filter(Boolean)) {
    const fields = Object.fromEntries(block.split("\n").map((line) => [line.slice(0, line.indexOf(":")), line.slice(line.indexOf(":") + 2)]));
    console.log(`  #${fields.id} ${fields.event}:`, JSON.parse(fields.data!).status);
  }
}

await readEvents();
console.log("reconnecting with Last-Event-ID: 2");
await readEvents("2");
server.close();
```

**Output:**

```text
200 text/event-stream
  #1 status: paid
  #2 status: packed
  #3 status: shipped
reconnecting with Last-Event-ID: 2
200 text/event-stream
  #3 status: shipped
```

- The server sets `Content-Type: text/event-stream` and writes events as `id`, `event` and `data` lines ending with a blank line.
- When the client reconnects with `Last-Event-ID: 2`, the server sends only what came after event 2. This is SSE's built-in **resume** mechanism.
- To keep the example short, the server sends three events and ends the response. A real stream stays open, writes events as they happen, and sends a comment line (`: keep-alive`) every 15–30 seconds so proxies do not close an idle connection.
- Listening on port `0` asks the operating system for any free port, so the example never clashes with something already running.

In the browser, `EventSource` does the parsing and reconnecting:

```ts
// fragment
const source = new EventSource("/orders/1042/events");           // sends cookies for same-origin URLs
source.addEventListener("status", (e) => {
  const { status } = JSON.parse((e as MessageEvent).data);
  renderStatus(status);
});
source.onerror = () => showBanner("Reconnecting…");               // the browser retries automatically
```

Over HTTP/1.1, browsers allow only about six connections per domain, which several open SSE tabs can use up; HTTP/2 and HTTP/3 remove this limit by sharing one connection. Reverse proxies must not **buffer** the response (for example, Nginx needs `proxy_buffering off` or the `X-Accel-Buffering: no` header, {{ch:nginx-reverse-proxy}}).

## How WebSockets work

### Level 2 — The handshake

A WebSocket starts life as an ordinary HTTP request asking to **upgrade** the connection:

```text
GET /chat HTTP/1.1
Host: cornershop.example
Upgrade: websocket
Connection: Upgrade
Origin: https://cornershop.example
Sec-WebSocket-Version: 13
Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==

HTTP/1.1 101 Switching Protocols
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=
```

After the `101 Switching Protocols` response, the same TCP connection carries WebSocket **frames** in both directions until either side closes it. The `Sec-WebSocket-Accept` value proves the server understood the WebSocket request (it is not a security feature). It is computed from the client's key and a fixed identifier from the specification:

```ts
import { createHash } from "node:crypto";

const WEBSOCKET_GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";   // fixed by RFC 6455

function acceptValue(secWebSocketKey: string): string {
  return createHash("sha1").update(secWebSocketKey + WEBSOCKET_GUID).digest("base64");
}

console.log(acceptValue("dGhlIHNhbXBsZSBub25jZQ=="));
```

**Output:**

```text
s3pPLMBiTxaQ9kYGzzhZRbK+xOo=
```

This is the example from the RFC itself, and it matches the response above. You will never write this yourself — libraries do it — but it shows there is no magic: a WebSocket is HTTP that turns into something else. Secure WebSockets use `wss://` (TLS), exactly as HTTPS does ({{ch:tls-ssl}}); always use `wss://` in production.

### Level 2 — Messages, closing and heartbeats

Once open, either side sends **messages** — text (usually JSON) or binary. WebSocket itself has no idea what the messages mean: you design a small protocol, typically `{ "type": "...", ... }` objects.

Connections end with a **close** frame carrying a code: `1000` (normal), `1001` (going away — a server restarting or a tab closing), `1008` (policy violation, such as failed authorisation), `1011` (server error). Your own application codes use the range `4000`–`4999`. A connection that simply vanishes without a close frame appears as `1006` (abnormal closure) on the client.

Because connections can die silently, servers send **pings** every 20–30 seconds and close connections that do not answer with a **pong**. Heartbeats also stop load balancers and proxies from closing idle connections (many close after 60 seconds of silence by default).

### Level 3 — A WebSocket server with `ws`

The `ws` package is the standard low-level WebSocket library for Node.js:

```ts
// fragment
import { createServer } from "node:http";
import { WebSocketServer, type WebSocket } from "ws";

const server = createServer(app);                         // your Express app keeps handling normal HTTP
const wss = new WebSocketServer({ noServer: true, maxPayload: 64 * 1024 });  // limit message size

server.on("upgrade", async (req, socket, head) => {
  if (req.headers.origin !== "https://cornershop.example") return socket.destroy();       // see "Security"
  const user = await authenticateUpgrade(req);            // session cookie or short-lived ticket
  if (!user) return socket.destroy();
  wss.handleUpgrade(req, socket, head, (ws) => wss.emit("connection", ws, user));
});

const alive = new WeakMap<WebSocket, boolean>();

wss.on("connection", (ws: WebSocket, user: { id: string }) => {
  alive.set(ws, true);
  ws.on("pong", () => alive.set(ws, true));
  ws.on("message", (raw) => handleMessage(ws, user, raw.toString()));   // parse + validate each message
  ws.on("close", (code) => removeFromRooms(ws, code));
  ws.send(JSON.stringify({ type: "hello", userId: user.id }));
});

setInterval(() => {                                       // heartbeat
  for (const ws of wss.clients) {
    if (!alive.get(ws)) { ws.terminate(); continue; }     // no pong since last ping: dead
    alive.set(ws, false);
    ws.ping();
  }
}, 30_000);

server.listen(3000);
```

- Handling the `upgrade` event yourself (`noServer: true`) lets you **authenticate before** accepting the connection and reject bad requests cheaply.
- `maxPayload` limits message size; the default is very large, so set a limit that fits your messages.
- Every incoming message is **untrusted input**: parse it safely and validate it with a schema ({{ch:validation}}), then check the user may perform the action.

### Level 3 — Socket.IO

**Socket.IO** is a popular library built **on top of** WebSockets. It adds a lot of convenience:

- named events (`socket.emit("message:new", data)`) and acknowledgements (replies to a specific message);
- **rooms** and broadcasting helpers;
- automatic reconnection on the client;
- fallback to HTTP long polling where WebSockets are blocked;
- adapters for running many servers (below);
- optional **connection state recovery**, which re-delivers messages missed during a short disconnection.

It is a protocol of its own: a Socket.IO server needs the Socket.IO client library, not a plain `WebSocket`.

```ts
// fragment
import { Server } from "socket.io";

const io = new Server(httpServer, { cors: { origin: "https://cornershop.example", credentials: true } });

io.use(async (socket, next) => {                          // runs once per connection, before "connection"
  const user = await authenticateHandshake(socket.handshake);   // cookie or socket.handshake.auth.token
  if (!user) return next(new Error("unauthorised"));
  socket.data.user = user;
  next();
});

io.on("connection", (socket) => {
  const user = socket.data.user;
  socket.join(`user:${user.id}`);                         // a personal room for direct notifications

  socket.on("conversation:join", async (conversationId: string, ack: (r: { ok: boolean }) => void) => {
    if (!(await conversations.isMember(conversationId, user.id))) return ack({ ok: false });   // authorise!
    socket.join(`conversation:${conversationId}`);
    ack({ ok: true });
  });

  socket.on("message:send", async (input: unknown) => {
    const { conversationId, text } = SendMessage.parse(input);         // validate
    if (!socket.rooms.has(`conversation:${conversationId}`)) return;   // only members may post
    const message = await messages.create({ conversationId, authorId: user.id, text });   // store first
    io.to(`conversation:${conversationId}`).emit("message:new", message);                 // then push
  });
});

// Anywhere in the application (for example, a queue worker when an order ships):
io.to("user:usr_41").emit("order:updated", { orderId: "1042", status: "shipped" });
```

`ws` gives you full control and minimal overhead; Socket.IO gives you features and conventions. Both are widely used. Managed services — Pusher, Ably, AWS API Gateway WebSocket APIs, AppSync — remove the need to run connection servers at all, at a price per message or connection.

## Making real-time features reliable

### Level 3 — Store first, then push; push is a hint

A pushed message can be lost: the user's connection was down for ten seconds, the server restarted, the phone was asleep. So:

1. **The database is the source of truth.** Save the chat message (or the order status) **first**, then push it.
2. **The push is a notification**, not the only copy. A client that missed it must be able to catch up.
3. **Give messages increasing sequence numbers** (or timestamps with ids) per conversation, so a reconnecting client can say, "I have everything up to #41; send me what came after."

```ts
// Rooms, sequence numbers and catching up after a disconnect
type Connection = { id: string; userId: string; send: (msg: string) => void };
type ChatMessage = { seq: number; room: string; from: string; text: string };

const rooms = new Map<string, Set<Connection>>();
const history = new Map<string, ChatMessage[]>();     // in production: the database
let nextSeq = 1;

function join(conn: Connection, room: string, lastSeenSeq = 0) {
  if (!rooms.has(room)) rooms.set(room, new Set());
  rooms.get(room)!.add(conn);
  for (const m of history.get(room) ?? []) {
    if (m.seq > lastSeenSeq) conn.send(`[catch-up] #${m.seq} ${m.from}: ${m.text}`);
  }
}

function leave(conn: Connection) {
  for (const members of rooms.values()) members.delete(conn);
}

function post(room: string, from: string, text: string) {
  const message = { seq: nextSeq++, room, from, text };          // 1. store first
  history.set(room, [...(history.get(room) ?? []), message]);
  for (const conn of rooms.get(room) ?? []) conn.send(`#${message.seq} ${from}: ${text}`);  // 2. then fan out
}

const client = (id: string, userId: string): Connection => ({ id, userId, send: (msg) => console.log(`  → ${id}: ${msg}`) });

const saraPhone = client("sara-phone", "sara");
const omarLaptop = client("omar-laptop", "omar");
join(saraPhone, "order-1042-support");
join(omarLaptop, "order-1042-support");

post("order-1042-support", "omar", "Hi Sara, I'm looking at your order now.");
leave(saraPhone);                                               // Sara's train enters a tunnel
post("order-1042-support", "omar", "It left the warehouse this morning.");
post("order-1042-support", "omar", "Tracking: CS-88213.");
console.log("Sara reconnects, last seen #1:");
join(client("sara-phone-2", "sara"), "order-1042-support", 1);
```

**Output:**

```text
  → sara-phone: #1 omar: Hi Sara, I'm looking at your order now.
  → omar-laptop: #1 omar: Hi Sara, I'm looking at your order now.
  → omar-laptop: #2 omar: It left the warehouse this morning.
  → omar-laptop: #3 omar: Tracking: CS-88213.
Sara reconnects, last seen #1:
  → sara-phone-2: [catch-up] #2 omar: It left the warehouse this morning.
  → sara-phone-2: [catch-up] #3 omar: Tracking: CS-88213.
```

- While Sara was disconnected, messages #2 and #3 were still **stored**; only the live push to her failed.
- On reconnecting, her client sends the last sequence number it saw, and the server sends exactly what she missed — nothing lost, nothing duplicated.
- The client should also **de-duplicate** by id (a message can arrive both live and in a catch-up during a reconnect) and display messages in sequence order.

The same pattern underlies SSE's `Last-Event-ID`, Socket.IO's connection state recovery, and the "sync since cursor" APIs of chat and collaboration products. For users who are fully offline, real-time is the wrong channel anyway: send a **push notification** or email instead ({{ch:email}}).

### Level 3 — Reconnecting clients

Clients must reconnect automatically — but not all at once. If a server restarts with 20,000 connected clients and every one reconnects immediately, the reconnect storm can overload the servers again. Use **exponential backoff with jitter** for reconnects, exactly as for job retries ({{ch:queues}}), and show the user a discreet "Reconnecting…" state. After reconnecting, fetch what was missed (above) and re-join rooms.

### Level 3 — Message design

- Use a small **typed protocol**: `{ "type": "message:new", "data": {...} }`, documented and validated on both sides ({{ch:api-documentation}}).
- **Version** it, so old clients (mobile apps!) keep working when you add message types ({{ch:api-versioning}}).
- Send **small deltas or ids**, not huge documents. For a heavy update, push "order 1042 changed" and let the client fetch the details over normal HTTP — which also reuses your existing authorisation and caching.
- Remember **backpressure**: a slow client cannot read as fast as you send. Check the socket's buffered amount and drop or merge non-essential updates (for example, send the latest price only) instead of buffering without limit.

## Scaling real-time servers

### Level 4 — The multi-server problem

With one server, broadcasting is easy: the server knows every connection. With several servers behind a load balancer, Sara may be connected to server A and Omar to server B. When Omar posts a message on B, server A must hear about it to deliver it to Sara.

```text
                     ┌──────────────┐        publish "conversation:77"
  Omar ── wss ──▶    │   server B   │ ──────────────┐
                     └──────────────┘               ▼
                                            ┌───────────────┐
                                            │ pub/sub layer │  (Redis, NATS, a managed service)
                                            └───────────────┘
                     ┌──────────────┐               │ deliver to subscribers
  Sara ── wss ──▶    │   server A   │ ◀─────────────┘
                     └──────────────┘
```

The standard solution is a **pub/sub layer**: every server publishes outgoing room messages to it and subscribes to the rooms its own clients are in. Socket.IO's **Redis adapter** (`@socket.io/redis-adapter`) does exactly this — `io.to(room).emit(...)` then reaches clients on every server. With `ws`, you publish and subscribe to Redis channels yourself ({{ch:redis}}). At very large scale, dedicated brokers or managed real-time services take over ({{ch:message-brokers}}).

Other operational points:

- **Load balancers** must support WebSocket upgrades and have idle timeouts longer than your heartbeat interval (AWS Application Load Balancers do; Nginx needs the `Upgrade` and `Connection` headers forwarded, {{ch:elb}}).
- **Sticky sessions** are needed when using Socket.IO's long-polling fallback (several HTTP requests must reach the same server); pure WebSocket connections stay on one server anyway.
- **Connection limits**: each open connection uses memory and a file descriptor. One Node.js process can hold tens of thousands of mostly idle connections, but plan capacity with load tests, and raise operating-system limits ({{ch:linux}}).
- **Deployments** drop every connection on the servers being replaced. Drain gracefully (close with `1001`, let clients reconnect elsewhere with jitter), and rely on catch-up so nothing is lost.
- **Presence** ("who is online") across servers needs shared state — for example, Redis keys with short expiry refreshed by heartbeats — and should tolerate brief inaccuracy.

## Security

### Level 3 — Authenticating connections

Every real-time connection must be authenticated, and every action on it authorised. Options:

- **Session cookie** — the browser sends cookies with the upgrade request for the same site, so your normal session works ({{ch:sessions}}). You **must** then check the `Origin` header: browsers do not apply CORS to WebSocket handshakes, so without an origin check, a malicious site could open a WebSocket to your server using the victim's cookies (**cross-site WebSocket hijacking**).
- **Short-lived ticket** — the client first calls an authenticated HTTP endpoint to get a one-time token valid for a minute, then connects with it. Useful when the WebSocket server is on another domain. Avoid putting long-lived tokens in URLs, which end up in logs.
- **Token in the first message or in Socket.IO's `auth` payload** — for native mobile clients and cross-domain setups ({{ch:jwt}}).

Then:

- **Authorise every action**, not just the connection: joining a room requires membership; posting requires permission. Being connected is not permission to see everything.
- **Re-check long-lived connections**: a connection can stay open for days. When a user logs out, is banned or loses access, close their connections (publish a "disconnect user X" message to all servers), and re-validate tokens that expire.

### Level 3 — Abuse protection

- **Limit message size** (`maxPayload`) and **rate-limit messages** per connection and per user ({{ch:rate-limiting}}).
- **Limit connections** per user and per IP address.
- **Validate and escape** message content: chat text displayed in other users' browsers must be rendered as text, not HTML ({{ch:react-basics}}).
- Do not expose internal errors in messages; log them server-side.

## From beginner to enterprise

**Level 1–2 — first live feature.** Polling where it is enough; SSE for one-way updates; a `ws` or Socket.IO echo server; JSON messages with a `type`.

**Level 3 — real features.** Authenticated connections with origin checks; authorisation per room and action; heartbeats; message validation and size limits; store-then-push with sequence numbers and catch-up; client reconnects with backoff and jitter.

**Level 4 — production systems.** Several servers with a Redis adapter or pub/sub; load balancer timeouts and upgrade support; graceful draining on deploys; presence in shared state; rate limits; metrics for connections, messages and reconnects.

**Level 5 — professional practice.** Protocol versioning for mobile clients; backpressure handling; load tests with tens of thousands of connections; managed real-time services where they are cheaper than operating your own; push notifications for offline users.

**Level 6 — enterprises.** Global real-time networks with edge servers in many regions; collaborative editing with CRDTs or operational transformation; millions of concurrent connections on dedicated gateway services; end-to-end encrypted messaging; strict data-residency rules for message routing.

## Real-world use cases

### Live order status

- **Design**: SSE endpoint `/orders/:id/events`, authenticated with the session cookie; a queue worker publishes "order 1042 changed" to Redis when the status changes; the SSE server forwards it to that customer's open streams; the event carries the new status and an id for resume.
- **Why SSE**: one-way updates, a few per day per order, normal HTTP authentication, automatic reconnects — no need for WebSockets.

### Customer support chat

- **Design**: Socket.IO with the Redis adapter; customers and agents join `conversation:{id}` rooms after authorisation checks; messages stored in PostgreSQL with per-conversation sequence numbers before being broadcast; typing indicators sent but never stored; reconnecting clients request messages after their last sequence number; offline customers receive an email.

### Live sales dashboard

- **Design**: updates batched once per second ("12 new orders, £431") rather than one message per sale, so busy periods do not flood browsers; WebSocket or SSE depending on whether the dashboard needs to send commands back.

## Common mistakes

### Beginner: WebSockets for everything

**Fix:** use polling or SSE when updates are rare or one-way.

### Beginner: unauthenticated connections or no origin check

**Consequence:** anyone (or any website, using the victim's cookies) can connect and listen. **Fix:** authenticate in the handshake; verify `Origin`; authorise every action.

### Beginner: trusting message contents

**Fix:** parse safely, validate with schemas, limit sizes, render user text as text.

### Intermediate: push without storage

**Consequence:** messages lost during disconnects. **Fix:** store first, then push; sequence numbers and catch-up.

### Intermediate: no heartbeats

**Consequence:** dead connections pile up; proxies cut idle connections. **Fix:** ping/pong every 20–30 seconds; terminate unresponsive sockets.

### Intermediate: one server's memory as the only state

**Consequence:** broadcasts miss users on other servers. **Fix:** a pub/sub layer (Redis adapter) and shared presence.

### Production: reconnect storms

**Fix:** exponential backoff with jitter on clients; graceful draining on servers.

### Production: never re-checking permissions

**Consequence:** users who logged out or lost access keep receiving data. **Fix:** close connections on logout or permission changes; expire tickets.

## Debugging and troubleshooting

- **Connection fails with `400` or never upgrades**: the proxy or load balancer is not forwarding `Upgrade` and `Connection` headers; the path is wrong; HTTP/2-only proxies without WebSocket support.
- **Connections drop every 60 seconds**: an idle timeout at a proxy or load balancer — add heartbeats more often than the timeout, or raise it.
- **SSE events arrive in bursts or only at the end**: a proxy or compression middleware is buffering — disable buffering for the stream route.
- **Messages reach some users but not others**: multiple servers without a pub/sub adapter, or users not joined to the room on reconnect.
- **Memory grows over time**: connections never removed from room maps; listeners not cleaned up on close; slow clients with ever-growing send buffers.
- **Browser shows close code 1006**: the connection dropped without a close frame — network change, proxy timeout, or a server crash; check server logs and heartbeat settings.

## Security summary

- Use **`wss://`** (TLS) only.
- **Authenticate** in the handshake (session cookie with `Origin` check, short-lived ticket, or token); never accept anonymous connections to private data.
- **Authorise** each room join and each action; re-check on long-lived connections and close them on logout or loss of access.
- **Validate** every message against a schema; **limit** message size, message rate and connections per user and IP.
- **Render** user content safely in clients.
- Keep tokens out of URLs; if unavoidable, make them single-use and short-lived.
- Log connection events and authorisation failures for monitoring ({{ch:logging}}).

## How a senior engineer thinks about this

- **Use the simplest channel that works.** Polling and SSE solve many "real-time" requests with less operational cost than WebSockets.
- **The database is the truth; the socket is a notification.** Store first, push second, and always allow catch-up.
- **Connections are long-lived state.** They must be authenticated, re-authorised, kept alive, drained on deploys and spread across servers.
- **Design for disconnection.** Mobile networks fail constantly; reconnects with jitter, sequence numbers and idempotent clients make that invisible.
- **Measure before scaling.** Connection counts, message rates and fan-out sizes decide the architecture — not guesses.

## Exercises

### Exercise 1 — Parse an event stream

**Objective:** practise the SSE format.
**What to build:** `parseEventStream(text)` returning the list of events (`id` if present, `event` defaulting to `"message"`, and `data`, with several `data:` lines joined by newlines) and the last event id seen. Ignore comment lines starting with `:`, and accept both `data: value` and `data:value`.

<details>
<summary>Show the solution</summary>

```ts
type SseEvent = { id?: string; event: string; data: string };

function parseEventStream(text: string): { events: SseEvent[]; lastEventId?: string } {
  const events: SseEvent[] = [];
  let lastEventId: string | undefined;
  for (const block of text.replace(/\r\n/g, "\n").split("\n\n")) {
    let event = "message";
    const data: string[] = [];
    let id: string | undefined;
    for (const line of block.split("\n")) {
      if (line === "" || line.startsWith(":")) continue;          // blank or comment (heartbeat)
      const colon = line.indexOf(":");
      const field = colon === -1 ? line : line.slice(0, colon);
      let value = colon === -1 ? "" : line.slice(colon + 1);
      if (value.startsWith(" ")) value = value.slice(1);           // one optional space after the colon
      if (field === "event") event = value;
      else if (field === "data") data.push(value);
      else if (field === "id") id = lastEventId = value;
    }
    if (data.length > 0) events.push({ ...(id !== undefined && { id }), event, data: data.join("\n") });
  }
  return { events, lastEventId };
}

const stream = [
  ": keep-alive",
  "",
  "id: 41",
  "event: price",
  'data: {"sku":"TEA-1","price":4.2}',
  "",
  "data: first line",
  "data: second line",
  "",
  "id: 42",
  "data:no space is fine too",
  "",
].join("\n");

console.log(parseEventStream(stream));
```

**Output:**

```text
{
  events: [
    { id: '41', event: 'price', data: '{"sku":"TEA-1","price":4.2}' },
    { event: 'message', data: 'first line\nsecond line' },
    { id: '42', event: 'message', data: 'no space is fine too' }
  ],
  lastEventId: '42'
}
```

**Walkthrough:** events are separated by blank lines; within an event, each line is `field: value`. The heartbeat comment produces no event. Multiple `data` lines form one multi-line value. The last `id` seen is what a reconnecting client sends as `Last-Event-ID`. (The full specification has a few more rules — for example, `retry:` sets the reconnection delay — which `EventSource` handles for you.)

</details>

### Exercise 2 — Choose the technique

**Objective:** practise matching features to techniques.
**What to do:** choose polling, SSE or WebSockets (or something else) for: (1) a "new version available — refresh" banner; (2) streaming an AI assistant's answer word by word; (3) a collaborative whiteboard with live cursors; (4) the status of a CSV import that takes about two minutes; (5) a notification bell for a social app; (6) a reminder to a user who closed the app a day ago.

<details>
<summary>Show the solution</summary>

1. **Polling** every few minutes (or on page focus) — rare and not urgent.
2. **SSE** (or a streamed HTTP response) — one-way, text, from a single request; this is how most AI APIs stream ({{ch:llm-fundamentals}}).
3. **WebSocket** — frequent two-way updates with low latency.
4. **Polling** every few seconds while the page is open, or **SSE** — one-way and short-lived; the import itself runs in a queue ({{ch:queues}}).
5. **SSE** (one-way notifications) — or WebSockets if the app already has a connection for chat; either way, store notifications and fetch unread ones on load.
6. **Push notification or email** — the user is not connected, so no real-time channel can reach them.

</details>

### Exercise 3 — Review a chat server

**Objective:** practise spotting real-time problems.
**The scenario:** a chat server with `ws` accepts any connection; the client sends `{ "type": "join", "room": "..." }` for any room id; messages are broadcast to the room from an in-memory map and never stored; there is no heartbeat; the app now runs on three servers behind a load balancer; message size is unlimited; the user's id comes from a `userId` field in each message. List the problems and fixes.

<details>
<summary>Show the solution</summary>

1. **No authentication** → anyone can connect. Authenticate in the upgrade (session cookie plus `Origin` check, or a short-lived ticket).
2. **User id from the message** → anyone can impersonate anyone. Take identity from the authenticated connection only.
3. **Join any room** → eavesdropping on private conversations. Check membership before joining.
4. **Messages never stored** → lost during disconnects, no history. Store first with sequence numbers; catch-up on reconnect.
5. **No heartbeat** → dead connections accumulate; proxies drop idle ones. Ping/pong with termination.
6. **Three servers with in-memory rooms** → users on different servers cannot talk. Redis pub/sub or a Socket.IO Redis adapter.
7. **Unlimited message size and rate** → memory exhaustion and spam. `maxPayload`, per-user rate limits, connection limits.
8. **Unvalidated content** → crashes on bad JSON, stored XSS in clients. Safe parsing, schema validation, text-only rendering.

</details>

### Exercise 4 — Production scenario: the reconnect storm

**Objective:** practise operating real-time systems.
**The scenario:** every deployment of your chat service causes a spike: CPU on all servers hits 100% for several minutes, some users see "Reconnecting…" for a long time, and a few report missing messages. Describe the causes and fixes.

<details>
<summary>Show the solution</summary>

**Causes**
- When servers restart, all their clients reconnect **immediately** and at once, each also re-authenticating and re-joining rooms — a thundering herd.
- Clients may all retry on fixed intervals, synchronising the waves.
- Messages sent during the gap were pushed to dead connections and never re-delivered.

**Fixes**
1. **Client reconnects with exponential backoff and full jitter** (first retry at a random time within a second or two, growing after that).
2. **Graceful draining**: on shutdown, servers stop accepting new connections, then close existing ones with `1001` **gradually** over a minute or two rather than all at once; rolling deployments replace a few servers at a time.
3. **Cheap reconnects**: short-lived tickets or cached session lookups so authentication is fast; room joins batched.
4. **Catch-up**: clients send their last sequence number per conversation on reconnect and receive what they missed; client-side de-duplication by id.
5. **Capacity**: enough headroom that the remaining servers can absorb the reconnecting clients during a rolling deploy; autoscaling on connection counts.
6. **Measure**: dashboards for connections, reconnect rate and catch-up volume per deploy; alerts if reconnect time exceeds a target.

</details>

## Summary

HTTP is request–response, so real-time features need another way for the server to speak first: **polling** (ask repeatedly), **long polling** (a held request), **Server-Sent Events** (a never-ending HTTP response carrying one-way events, with built-in reconnection and `Last-Event-ID` resume) or **WebSockets** (a persistent, full-duplex connection started with an HTTP `101 Switching Protocols` upgrade). Choose the simplest technique the feature really needs; many "real-time" features are well served by polling or SSE.

WebSocket connections carry text or binary messages in a protocol you design — typed, validated, versioned JSON — and end with close codes. **Heartbeats** detect silent disconnections and keep proxies from closing idle connections. In Node.js, `ws` offers low-level control and **Socket.IO** adds events, acknowledgements, rooms, reconnection, fallbacks and multi-server adapters.

Reliability comes from **storing first and pushing second**, numbering messages so reconnecting clients can **catch up**, de-duplicating on the client, and reconnecting with **backoff and jitter**. Several servers share messages through a **pub/sub layer** such as Redis, behind load balancers that support upgrades and long idle timeouts, with graceful draining on deploys and shared presence. Security means `wss://`, authentication in the handshake with **origin checks** (to stop cross-site WebSocket hijacking), authorisation for every room and action, re-checking long-lived connections, and limits on message size, rate and connection count.

## Key terms

- **Real-time communication** — Delivering updates as events happen, with low delay, rather than only on request.
- **Polling** — Requesting updates repeatedly at a fixed interval.
- **Long polling** — A request held open by the server until data is available, followed immediately by another request.
- **Server-Sent Events (SSE)** — A standard for streaming one-way events from server to client over an HTTP response.
- **EventSource** — The browser API that receives Server-Sent Events and reconnects automatically.
- **Last-Event-ID** — The header a reconnecting SSE client sends so the server can resume after the last received event.
- **WebSocket** — A protocol for persistent, full-duplex communication over one TCP connection.
- **Full duplex** — Communication in both directions at the same time.
- **Upgrade handshake** — The HTTP request and `101 Switching Protocols` response that turn a connection into a WebSocket.
- **wss://** — The URL scheme for WebSockets secured with TLS.
- **Close code** — A number sent when closing a WebSocket that explains why, such as `1000` for a normal closure.
- **Heartbeat (ping/pong)** — Periodic messages used to detect dead connections and keep idle ones open.
- **ws** — A widely used low-level WebSocket library for Node.js.
- **Socket.IO** — A real-time library built on WebSockets that adds events, rooms, reconnection and fallbacks.
- **Room** — A named group of connections that receive the same broadcasts.
- **Broadcast** — Sending one message to many connections at once.
- **Pub/sub** — A messaging pattern where publishers send to topics and all subscribers receive the messages.
- **Redis adapter** — A Socket.IO component that uses Redis pub/sub to share broadcasts between servers.
- **Presence** — Information about which users are currently online or in a room.
- **Sequence number** — An increasing number on messages that lets clients detect gaps and catch up.
- **Reconnect storm** — Many clients reconnecting at the same moment and overloading servers.
- **Cross-site WebSocket hijacking** — An attack where a malicious site opens a WebSocket to another site using the victim's cookies.
- **Backpressure** — Handling a receiver that cannot keep up, by slowing, merging or dropping messages.
- **Sticky session** — Load balancing that sends a client's requests to the same server.

## What comes next

Real-time channels push data; clients also need flexible ways to **ask** for it. The next chapter, {{ch:graphql}}, covers GraphQL: a query language where clients request exactly the fields they need, schemas and resolvers, mutations and subscriptions, the N+1 problem and DataLoader, securing and limiting queries, and when GraphQL is — and is not — a better choice than REST.
