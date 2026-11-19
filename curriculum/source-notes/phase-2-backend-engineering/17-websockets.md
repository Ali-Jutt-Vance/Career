# Phase 2 — Chapter 17: WebSockets & Real-Time Communication

---

## Chapter Overview

WebSockets provide a full-duplex, persistent connection between client and server — enabling real-time features: live chat, notifications, collaborative editing, live dashboards, multiplayer games. Unlike HTTP (request-response), WebSockets allow the server to push data to clients at any time.

**Use WebSockets when:**
- Data must be pushed from server → client (live notifications, price tickers)
- Low latency bidirectional communication (chat, games)
- High-frequency updates (dashboards, telemetry)

**Don't use WebSockets when:**
- Occasional updates work fine (polling or SSE is simpler)
- The payload is large and infrequent (regular HTTP)
- You need HTTP caching or CDN proxying

---

## Beginner Theory

### WebSocket Protocol

```
HTTP Upgrade Handshake:
  Client → GET /ws HTTP/1.1
           Upgrade: websocket
           Connection: Upgrade
           Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==

  Server → HTTP/1.1 101 Switching Protocols
           Upgrade: websocket
           Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=

After handshake: persistent TCP connection, frames sent both ways

WebSocket vs HTTP polling:
  Polling:     Client asks → Server answers (every N seconds, even if no data)
  Long poll:   Client asks → Server holds connection until data, then responds
  SSE:         Server pushes text/event-stream (one-way, HTTP-based)
  WebSocket:   Full duplex, binary or text, persistent
```

---

## Basic Examples

### `ws` Library (Low-Level)

```javascript
// npm install ws

const { WebSocketServer, WebSocket } = require("ws");
const http = require("http");

const server = http.createServer();
const wss    = new WebSocketServer({ server });

wss.on("connection", (ws, req) => {
  const clientIp = req.socket.remoteAddress;
  console.log(`Client connected: ${clientIp}`);

  // Receive message from client
  ws.on("message", (data, isBinary) => {
    const message = isBinary ? data : data.toString();
    console.log(`Received: ${message}`);

    // Echo back
    ws.send(`Echo: ${message}`);

    // Broadcast to all connected clients
    wss.clients.forEach((client) => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  });

  ws.on("close", (code, reason) => {
    console.log(`Client disconnected: ${code} ${reason}`);
  });

  ws.on("error", (err) => {
    console.error("WebSocket error:", err.message);
  });

  // Send welcome message
  ws.send(JSON.stringify({ type: "connected", message: "Welcome!" }));
});

// Heartbeat — detect dead connections
const interval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (!ws.isAlive) {
      ws.terminate();
      return;
    }
    ws.isAlive = false;
    ws.ping();
  });
}, 30_000);

wss.on("connection", (ws) => {
  ws.isAlive = true;
  ws.on("pong", () => { ws.isAlive = true; });
});

wss.on("close", () => clearInterval(interval));

server.listen(3000);
```

### Socket.io (Higher-Level)

```javascript
// npm install socket.io

const { createServer } = require("http");
const { Server }       = require("socket.io");
const express          = require("express");

const app    = express();
const server = createServer(app);
const io     = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL,
    methods: ["GET", "POST"]
  }
});

// ─── MIDDLEWARE ────────────────────────────────────────────────────────────────
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error("Unauthorized"));

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = payload.sub;
    next();
  } catch {
    next(new Error("Invalid token"));
  }
});

// ─── CONNECTION HANDLER ────────────────────────────────────────────────────────
io.on("connection", (socket) => {
  console.log(`User ${socket.userId} connected (socket: ${socket.id})`);

  // Join user to their personal room (for targeted messages)
  socket.join(`user:${socket.userId}`);

  // ── CHAT EVENTS ─────────────────────────────────────────────────────────────
  socket.on("join-room", (roomId) => {
    socket.join(roomId);
    socket.to(roomId).emit("user-joined", { userId: socket.userId });
  });

  socket.on("leave-room", (roomId) => {
    socket.leave(roomId);
    socket.to(roomId).emit("user-left", { userId: socket.userId });
  });

  socket.on("send-message", async ({ roomId, content }) => {
    const message = await messageService.create({
      roomId,
      userId:  socket.userId,
      content: sanitize(content)  // sanitize HTML/XSS
    });

    // Emit to all in room (including sender)
    io.to(roomId).emit("new-message", {
      id:        message.id,
      content:   message.content,
      userId:    socket.userId,
      createdAt: message.createdAt
    });
  });

  // ── TYPING INDICATOR ────────────────────────────────────────────────────────
  socket.on("typing-start", ({ roomId }) => {
    socket.to(roomId).emit("user-typing", { userId: socket.userId });
  });

  socket.on("typing-stop", ({ roomId }) => {
    socket.to(roomId).emit("user-stopped-typing", { userId: socket.userId });
  });

  // ── DISCONNECT ──────────────────────────────────────────────────────────────
  socket.on("disconnect", (reason) => {
    console.log(`User ${socket.userId} disconnected: ${reason}`);
    // Notify rooms the user was in (auto-handled by socket.io when leaving rooms)
  });
});

// ─── EMIT FROM ANYWHERE IN YOUR APP ──────────────────────────────────────────
// In your notification service:
function notifyUser(userId, event, data) {
  io.to(`user:${userId}`).emit(event, data);
}

// E.g., when an order ships:
notifyUser(order.userId, "order-shipped", { orderId: order.id });

server.listen(3001);
```

---

## Intermediate Concepts

### Namespaces and Rooms

```javascript
// Namespaces — logical separation of Socket.io connections
const chatNsp    = io.of("/chat");
const adminNsp   = io.of("/admin");
const supportNsp = io.of("/support");

chatNsp.use(authMiddleware);
chatNsp.on("connection", (socket) => {
  // Only chat logic here
});

adminNsp.use(requireAdmin);
adminNsp.on("connection", (socket) => {
  // Admin-only real-time features
});

// Rooms — dynamic groups within a namespace
io.on("connection", (socket) => {
  socket.join("room:123");          // join a room
  socket.leave("room:123");         // leave a room
  socket.rooms;                     // Set of rooms this socket is in

  // Emit to everyone in a room
  io.to("room:123").emit("event", data);

  // Emit to a room, except the sender
  socket.to("room:123").emit("event", data);

  // Emit to multiple rooms
  io.to("room:123").to("room:456").emit("event", data);
});
```

### Scaling with Redis Adapter

```javascript
// npm install @socket.io/redis-adapter ioredis

const { createAdapter } = require("@socket.io/redis-adapter");
const { createClient }  = require("redis");

const pubClient = createClient({ url: process.env.REDIS_URL });
const subClient = pubClient.duplicate();

await Promise.all([pubClient.connect(), subClient.connect()]);

io.adapter(createAdapter(pubClient, subClient));

// Now multiple Node.js servers share the same Socket.io state
// A message emitted on server A reaches clients on server B via Redis pub/sub
```

### Rate Limiting Socket Events

```javascript
const { RateLimiterRedis } = require("rate-limiter-flexible");

const rateLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix:   "socket_rl",
  points:      20,    // 20 events
  duration:    1      // per second per userId
});

io.on("connection", (socket) => {
  socket.on("send-message", async (data) => {
    try {
      await rateLimiter.consume(socket.userId);
      // process message
    } catch {
      socket.emit("rate-limit-exceeded", { retryAfter: 1 });
    }
  });
});
```

---

## Advanced Concepts

### Server-Sent Events (SSE) — Alternative for One-Way Push

```javascript
// SSE: HTTP-based, server → client only, auto-reconnects
// Simpler than WebSockets for notifications and live feeds

router.get("/events", (req, res) => {
  res.set({
    "Content-Type":  "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection":    "keep-alive",
    "X-Accel-Buffering": "no"  // Nginx: disable buffering
  });
  res.flushHeaders();

  // Register this client
  const clientId = crypto.randomUUID();
  sseClients.set(clientId, res);

  // Send heartbeat every 30s to prevent connection timeout
  const heartbeat = setInterval(() => {
    res.write(":\n\n");  // SSE comment (keeps connection alive)
  }, 30_000);

  req.on("close", () => {
    clearInterval(heartbeat);
    sseClients.delete(clientId);
  });
});

// Push to a specific user
function sendToUser(userId, event, data) {
  const res = userSseConnections.get(userId);
  if (res) {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }
}
```

---

## Interview Preparation

**Q1: What is the difference between WebSockets and HTTP polling? When would you choose each?**
A: Polling has the client repeatedly request new data at intervals (every 5 seconds) — inefficient if data rarely changes, causes server load. Long-polling holds the connection open until data is available, then reconnects — better than polling but adds complexity. WebSockets maintain a persistent connection with bidirectional messaging — most efficient for high-frequency or bidirectional data (chat, live dashboards). For simple one-way server-to-client notifications, SSE (Server-Sent Events) is simpler than WebSockets and uses plain HTTP.

**Q2: How do you scale WebSockets across multiple servers?**
A: The challenge is that a client connects to one server — a message emitted on server A doesn't reach clients on server B. The solution is a Redis adapter (Socket.io's `@socket.io/redis-adapter`): each server subscribes to Redis pub/sub channels, and emitted events are published to Redis and forwarded to all servers, which deliver to their connected clients. Alternatively, use a sticky session load balancer so each client always routes to the same server.

**Q3: How do you authenticate WebSocket connections?**
A: Send a JWT in the connection handshake (`socket.handshake.auth.token` in Socket.io). Verify the token in Socket.io middleware before allowing the connection. Don't use cookies for WebSocket auth unless you're certain about same-site behavior — the explicit token approach is more reliable and works cross-origin. Never trust data sent over the WebSocket without re-validating the user's identity and permissions on each sensitive event.

---

## Practical Tasks

### Beginner (10 Tasks)
1. Create a WebSocket echo server with the `ws` library.
2. Connect from a browser WebSocket client, send a message, receive the echo.
3. Broadcast messages from one client to all other connected clients.
4. Add a heartbeat (ping/pong) to detect dead connections.
5. Set up Socket.io with Express, connect a client.
6. Implement a "join room" event so clients can join named rooms.
7. Broadcast a message only to users in the same room.
8. Add a typing indicator (user is typing...) event.
9. Track online users and broadcast the count on connect/disconnect.
10. Log all socket events (connect, message, disconnect) to console.

### Intermediate (10 Tasks)
1. Add JWT authentication to Socket.io middleware.
2. Implement private messaging between two users (direct rooms).
3. Scale Socket.io with Redis adapter across two server instances.
4. Rate limit socket events (max 20 messages/second per user).
5. Build a live notification system that pushes alerts from server to client.
6. Implement SSE endpoint as a simpler alternative to WebSockets for notifications.
7. Add reconnection logic on the client with exponential backoff.
8. Persist chat messages to database and send history on join.
9. Handle multiple namespaces (/chat, /admin) with separate auth.
10. Implement read receipts for messages.

### Advanced (10 Tasks)
1. Build a real-time collaborative text editor (operational transforms or CRDT).
2. Implement WebSocket load testing (10,000 concurrent connections).
3. Build live dashboard with real-time metrics streaming via WebSocket.
4. Implement end-to-end encryption for chat messages.
5. Build a multiplayer game lobby with rooms and matchmaking.
6. Implement presence system (who's online in a channel).
7. Add distributed tracing through WebSocket events.
8. Handle WebSocket reconnection with message replay (don't lose messages during disconnect).
9. Build a live auction system with real-time bidding.
10. Implement backpressure: pause slow clients from overwhelming the server.

---

## Self Assessment
1. What is the WebSocket handshake?
2. What is the difference between WebSockets and SSE?
3. What are Socket.io rooms and namespaces?
4. How do you authenticate a WebSocket connection?
5. How do you scale WebSockets across multiple servers?
6. What is a heartbeat and why is it needed?
7. When would you use SSE instead of WebSockets?
8. What library is the lowest-level WebSocket library in Node.js?
9. How do you emit a message to all users except the sender?
10. What is the Redis adapter for Socket.io used for?

---

## Cheat Sheet

```javascript
// Socket.io server setup
const io = new Server(httpServer, { cors: { origin: CLIENT_URL } });

// Auth middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  // verify...
  socket.userId = payload.sub;
  next();
});

// Connection
io.on("connection", (socket) => {
  socket.join("room:123");             // join room
  socket.to("room:123").emit(ev, d);   // broadcast to room (not sender)
  io.to("room:123").emit(ev, d);       // broadcast including sender
  io.to(`user:${userId}`).emit(ev, d); // targeted notification
});

// Emit from anywhere
io.to("room:123").emit("event", data);

// Redis adapter (scaling)
io.adapter(createAdapter(pubClient, subClient));
```
