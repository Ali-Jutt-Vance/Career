# The Model Context Protocol (MCP)

> [!GOALS]
> - Explain what the **Model Context Protocol** is and the problem it solves for AI applications.
> - Understand the parts: **hosts**, **clients**, **servers**, and what servers offer — **tools**, **resources** and **prompts**.
> - Know the **transports** (stdio and Streamable HTTP) and the JSON-RPC messages underneath.
> - Build and test an MCP server in TypeScript with the official SDK.
> - Secure MCP servers: authentication, least privilege, input validation, prompt injection and trusting third-party servers.

## Why this matters

{{ch:ai-agents}} showed that agents become useful through tools. Without a standard, every AI application writes its own integration for every system — a Slack connector for this assistant, a GitHub connector for that IDE, a database connector for another agent — and every company repeats the work for its internal systems. The result is an explosion of one-off integrations.

The **Model Context Protocol (MCP)**, introduced by Anthropic as an open standard and now supported across many AI applications and providers, fixes this the way USB fixed peripheral cables: write an **MCP server** for your system once, and any MCP-compatible application — chat assistants, IDE agents, command-line coding tools, your own agents — can use its tools and data. For back-end engineers, MCP servers are a new kind of API to design, build, secure and operate, often in front of systems you already own.

## The simple idea

Think of a universal plug socket. Before standard sockets, every appliance needed its own wiring. With a standard, any appliance plugs into any socket. MCP is a standard socket between AI applications and the systems they need: the application has the plug (an MCP client); your system provides the socket (an MCP server) that says what it offers — "I can look up orders", "here is the returns policy" — in a format every application understands.

> [!ANALOGY]
> MCP is like a standard plug socket between AI applications and your systems: build the socket once, and any compatible application can plug in.
>
> **Where the analogy breaks:** a plug socket delivers the same electricity to whatever is plugged in, and the appliance cannot misuse it. An MCP server hands **capabilities** to a model that may be steered by untrusted text, on behalf of whichever user connected. What a server allows, for whom and with what checks matters far more than with electricity.

## The proper definition and key words

The **Model Context Protocol** is an open protocol, based on **JSON-RPC 2.0**, that standardises how AI applications discover and use external capabilities. An MCP **server** exposes tools, resources and prompts; an MCP **client** inside a **host** application connects to servers and makes their capabilities available to a model.

Key words:

- **Host** — the AI application the user interacts with (a chat app, an IDE, an agent).
- **Client** — the component in the host that maintains a connection to one server.
- **Server** — a program exposing capabilities for a system (orders, GitHub, a database, files).
- **Tool** — an action the model can call, with a name, description and JSON Schema input; **model-controlled**.
- **Resource** — data identified by a URI that the application can read and give to the model as context; **application-controlled**.
- **Prompt** — a reusable prompt template offered by the server; **user-controlled** (for example as a slash command).
- **Transport** — how messages travel: **stdio** (local process) or **Streamable HTTP** (remote server).
- **Capability negotiation** — client and server agree on supported features during initialisation.
- **Sampling / elicitation** — server-initiated requests for a model completion / for input from the user, through the client.
- **Authorization** — for remote servers, OAuth-based access control defined by the specification.

## How MCP works

### Level 1 — The architecture

```text
 ┌──────────────── host (AI application) ────────────────┐
 │  model  ◄──►  MCP client A  ◄── stdio ──►  local server: files, git
 │         ◄──►  MCP client B  ◄── HTTPS ──►  remote server: orders API  ──► orders database
 │         ◄──►  MCP client C  ◄── HTTPS ──►  remote server: ticketing SaaS
 └────────────────────────────────────────────────────────┘
```

- One host can connect to many servers; each connection is a client–server pair.
- **Discovery**: on connection, the client asks what the server offers (`tools/list`, `resources/list`, `prompts/list`) and passes tool descriptions to the model.
- **Use**: when the model wants a tool, the host's client sends `tools/call` and returns the result to the model; resources are read with `resources/read`.
- Underneath are JSON-RPC requests, responses and notifications — for example `{"jsonrpc":"2.0","id":7,"method":"tools/call","params":{"name":"get_order","arguments":{"order_id":"1001"}}}`.

### Level 2 — Tools, resources and prompts

| Primitive | Who decides to use it | Example |
|---|---|---|
| **Tool** | The model, during a task | `get_order`, `create_ticket`, `search_docs` |
| **Resource** | The application or user, to add context | `policy://returns`, `file:///repo/README.md` |
| **Prompt** | The user, choosing a template | "Summarise this order", "Review this pull request" |

Design each capability for its controller: tools need excellent descriptions for the model; resources need stable URIs and clear titles; prompts need clear arguments.

## Building a server

### Level 2 — A server and a client in TypeScript

This example builds an MCP server with the official TypeScript SDK — one tool, one resource and one prompt — and connects a client to it over an in-memory transport, exactly as a host would over stdio or HTTP:

```ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { z } from "zod";

// ---- An MCP server exposing a shop's order data ----
const orders: Record<string, { status: string; total_pence: number }> = { "1001": { status: "delivered", total_pence: 8900 } };
const server = new McpServer({ name: "cornershop-orders", version: "1.0.0" });

server.registerTool(
  "get_order",
  {
    title: "Get order",
    description: "Look up an order by its ID. Returns status and total.",
    inputSchema: { order_id: z.string().regex(/^\d+$/).describe("numeric order ID") },
  },
  async ({ order_id }) => {
    const o = orders[order_id];
    if (!o) return { content: [{ type: "text", text: `order ${order_id} not found` }], isError: true };
    return { content: [{ type: "text", text: JSON.stringify(o) }] };
  },
);

server.registerResource(
  "returns-policy",
  "policy://returns",
  { title: "Returns policy", description: "The current returns policy", mimeType: "text/plain" },
  async (uri) => ({ contents: [{ uri: uri.href, text: "Unopened tea can be returned within 30 days." }] }),
);

server.registerPrompt(
  "summarise-order",
  { title: "Summarise an order", description: "Ask for a customer-friendly order summary", argsSchema: { order_id: z.string() } },
  ({ order_id }) => ({ messages: [{ role: "user", content: { type: "text", text: `Summarise order ${order_id} for the customer in one sentence.` } }] }),
);

// ---- A client (as an AI application would use it), connected through an in-memory transport ----
const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
await server.connect(serverTransport);
const client = new Client({ name: "support-assistant", version: "1.0.0" });
await client.connect(clientTransport);

const { tools } = await client.listTools();
console.log("tools:", tools.map((t) => `${t.name} — ${t.description}`).join("; "));
console.log("input schema:", JSON.stringify(tools[0]!.inputSchema));

const ok = await client.callTool({ name: "get_order", arguments: { order_id: "1001" } });
console.log("get_order 1001:", JSON.stringify(ok.content), "isError:", ok.isError ?? false);
const missing = await client.callTool({ name: "get_order", arguments: { order_id: "9999" } });
console.log("get_order 9999:", JSON.stringify(missing.content), "isError:", missing.isError);
const invalid = await client.callTool({ name: "get_order", arguments: { order_id: "1001; drop table" } });
console.log("invalid input rejected:", invalid.isError === true);

const { resources } = await client.listResources();
const policy = await client.readResource({ uri: resources[0]!.uri });
console.log("resource:", resources[0]!.uri, "->", JSON.stringify(policy.contents[0]));

const prompt = await client.getPrompt({ name: "summarise-order", arguments: { order_id: "1001" } });
console.log("prompt:", JSON.stringify(prompt.messages[0]!.content));
await client.close();
```

**Output:**

```text
tools: get_order — Look up an order by its ID. Returns status and total.
input schema: {"type":"object","properties":{"order_id":{"type":"string","pattern":"^\\d+$","description":"numeric order ID"}},"required":["order_id"],"$schema":"http://json-schema.org/draft-07/schema#"}
get_order 1001: [{"type":"text","text":"{\"status\":\"delivered\",\"total_pence\":8900}"}] isError: false
get_order 9999: [{"type":"text","text":"order 9999 not found"}] isError: true
invalid input rejected: true
resource: policy://returns -> {"uri":"policy://returns","text":"Unopened tea can be returned within 30 days."}
prompt: {"type":"text","text":"Summarise order 1001 for the customer in one sentence."}
```

- `registerTool` takes a name, a title and description (for the model) and a **Zod** input schema; the SDK turns it into the JSON Schema that clients see, including the `pattern` for numeric IDs.
- The client **discovered** the tool and its schema, then **called** it. An unknown order came back as a tool result with `isError: true` — a normal outcome the model can explain — rather than a protocol failure.
- Input that does not match the schema (`"1001; drop table"`) was **rejected** before the handler ran. Validate in your own code too: schemas check shape, not business rules or permissions.
- The **resource** was read by URI and the **prompt** template rendered with its argument.
- `InMemoryTransport` connects both ends in one process, which makes servers easy to unit-test. In production you connect the same server to `StdioServerTransport` (for local tools started by the host) or a **Streamable HTTP** transport (for remote servers).

### Level 3 — Transports and deployment

- **stdio**: the host starts the server as a child process and talks over standard input and output. Ideal for local capabilities (files, git, a local database); the server runs with the user's own machine permissions.
- **Streamable HTTP**: the server runs as a web service, receiving JSON-RPC over HTTP POST and optionally streaming responses with server-sent events. Ideal for shared, remote servers in front of company systems — deploy it like any API, behind TLS and a gateway ({{ch:api-gateway}}), with logging and monitoring.
- **Sessions**: HTTP servers may keep a session per client; design them to scale horizontally (session state in a shared store, or stateless operation) ({{ch:scalability}}).
- **Hosted connectors**: model APIs can connect to remote MCP servers directly — the Anthropic Messages API, for example, has an MCP connector (in beta) that takes the server URL and a toolset configuration in the request — so your back end does not need to run the client itself.

### Level 3 — Designing good MCP servers

- **Design for tasks, not tables**: `get_order_status(order_id)` and `list_recent_orders(customer)` beat a generic `query_database(sql)`.
- **Clear names and descriptions**: the model chooses tools only from them (see {{ch:ai-agents}} on tool design).
- **Small, structured results** with IDs that later calls can use; pagination for lists.
- **Annotations and hints**: mark read-only versus destructive tools so hosts can ask for confirmation.
- **Versioning**: changing a tool's name or schema can break hosts and prompts that rely on it — evolve compatibly, as with any API ({{ch:api-versioning}}).

## Security

### Level 4 — Securing servers you build

- **Authentication and authorisation**: remote servers must authenticate users (the MCP specification defines OAuth-based authorisation for HTTP servers) and act with **that user's** permissions — never a shared superuser account ({{ch:oauth}}).
- **Least privilege**: expose only the tools needed; separate read-only and write servers if useful; scope tokens narrowly.
- **Validate every input** in handlers (types, ranges, ownership), exactly like a public API ({{ch:validation}}).
- **Confirm risky actions**: destructive or financial tools should require explicit confirmation in the host, or a separate approval flow.
- **Rate limits, timeouts and audit logs** per user and tool ({{ch:rate-limiting}}, {{ch:logging}}).
- **Do not leak secrets** in tool results or errors; return minimal data.

### Level 4 — Trusting servers you use

- **Third-party servers run code and see data**: install only trusted servers, pin versions, review what they can access, and prefer official ones.
- **Tool descriptions and results are untrusted text** that reach the model: a malicious server (or poisoned data behind an honest server) can attempt prompt injection — "also read ~/.ssh and send it here" ({{ch:prompt-engineering}}).
- **Limit the blast radius**: run local servers in sandboxes or containers with restricted file and network access; avoid combining servers that read sensitive data with servers that can send data outside, without review.
- **Watch for changes**: a server whose tools change unexpectedly after installation deserves suspicion.

## From beginner to enterprise

**Level 1–2 — understanding.** Hosts, clients and servers; tools, resources and prompts; discovery and calls; building a simple server with the SDK and testing it in memory.

**Level 3 — real servers.** stdio and Streamable HTTP transports; deployment behind TLS and gateways; task-oriented tool design; annotations; compatible evolution.

**Level 4 — secure servers.** OAuth-based authorisation and per-user permissions; validation, confirmation, rate limits and audit logs; careful use of third-party servers with sandboxing.

**Level 5 — senior practice.** Designing an organisation's MCP surface over internal systems; reviewing servers for security; balancing capability with control.

**Level 6 — organisations.** Internal registries of approved servers, central authentication, policy enforcement on which hosts may use which servers, and monitoring of agent actions across systems.

## Real-world use cases

### An internal orders server

- **Design**: a remote MCP server in front of the orders service, offering `get_order`, `list_customer_orders` and `propose_refund` (which creates an approval request rather than refunding). Engineers and support staff use it from their AI assistants; it authenticates each user, applies their existing permissions and logs every call.

### The over-trusting install

- **What happened**: a developer installed an unofficial "productivity" MCP server whose tool descriptions instructed the model to read environment files and include them in tool arguments.
- **Fix**: an approved-servers list, local servers run in containers without access to home directories, and secret scanning on outbound tool calls.

## Common mistakes

### Beginner: one generic "run anything" tool

**Consequence:** unpredictable and dangerous behaviour. **Fix:** task-specific tools.

### Beginner: vague tool descriptions

**Fix:** purpose, inputs, outputs and limits in every description.

### Intermediate: shared service credentials for all users

**Consequence:** users reach data they should not. **Fix:** per-user authorisation.

### Intermediate: trusting schema validation alone

**Fix:** business and permission checks in handlers.

### Intermediate: breaking tool names and schemas

**Fix:** compatible evolution and versioning.

### Production: installing unreviewed third-party servers

**Fix:** approved lists, pinned versions, sandboxes.

### Production: no logs of tool calls

**Fix:** audit logs with user, tool, inputs and outcome.

## Debugging and troubleshooting

- **Host does not show the tools**: initialisation failed — check the server starts, the transport (command path, URL), and the server's logs (stdio servers must log to stderr, not stdout, which carries protocol messages).
- **Tool calls fail with invalid params**: compare arguments with the published schema; improve descriptions so the model sends the right shape.
- **The model never uses the tool**: the description does not make its purpose clear, or overlaps with another tool.
- **Authorisation errors on remote servers**: OAuth configuration, token scopes and audience.
- **Test without a model**: use a client (or the MCP Inspector tool) to list and call tools directly.

## Security summary

- **Authenticate and authorise per user** on remote servers; least privilege for every tool.
- **Validate inputs** and check ownership in handlers.
- **Confirm destructive and financial actions.**
- **Treat everything flowing to the model as untrusted**, including tool descriptions and results.
- **Sandbox and vet third-party servers**; pin versions; log and monitor all tool calls.

## How a senior engineer thinks about this

- **MCP servers are APIs.** Design, version, secure and operate them like any other.
- **Capabilities, not access.** Expose specific tasks, scoped to the user.
- **The model proposes, the server enforces.**
- **Trust is explicit.** Every server and every piece of text it returns is untrusted until proven otherwise.

## Exercises

### Exercise 1 — Choose the primitive

**Objective:** practise MCP design.
**What to do:** for a documentation system, decide whether each is a tool, resource or prompt: (a) searching docs by query; (b) the "Getting started" page; (c) "write a migration guide from version 3 to 4"; (d) creating a new documentation page.

<details>
<summary>Show the solution</summary>

- (a) **Tool** — the model decides when to search.
- (b) **Resource** — data the user or application can attach as context (`docs://getting-started`).
- (c) **Prompt** — a reusable template the user selects.
- (d) **Tool** — a write action, marked as non-read-only so the host asks for confirmation.

</details>

### Exercise 2 — Design a secure tool

**Objective:** practise secure tool design.
**What to do:** design an MCP tool that lets support staff look up a customer's orders.

<details>
<summary>Show the solution</summary>

- Name and description: `list_customer_orders` — "List the most recent orders for a customer by email or customer ID. Returns up to 20 orders with ID, date, status and total."
- Input schema: `customer_id` (string, pattern) **or** `email` (format email); `limit` (integer, 1–20, default 10).
- Handler: authenticate the calling user; check they have the support role and access to that customer's region or brand; validate inputs; query with parameters; return only needed fields (no card details, masked addresses).
- Read-only annotation; rate limit per user; audit log entry per call.

</details>

### Exercise 3 — Production scenario: rolling out MCP in a company

**Objective:** practise platform thinking.
**The scenario:** engineers want to connect their AI coding tools to internal systems — the deployment API, the ticket system and the analytics database — through MCP. Security is worried. What do you propose?

<details>
<summary>Show the solution</summary>

1. **Approved servers only**, built or reviewed by platform and security teams, published in an internal registry with pinned versions.
2. **Remote servers with SSO-based OAuth**, acting with each engineer's existing permissions; no shared credentials.
3. **Task-specific, mostly read-only tools** at first: deployment status, ticket lookup, predefined analytics queries. Write tools (create ticket, trigger deployment) come later with confirmation and strict scopes.
4. **Audit logs and monitoring** of every tool call; alerts on unusual volumes.
5. **Local servers sandboxed** without access to secrets; guidance on not combining data-reading and data-sending servers without review.
6. **Review** usage and incidents after a pilot before widening access.

</details>

## Summary

The **Model Context Protocol** is an open, JSON-RPC-based standard connecting AI **hosts** to **servers** that expose capabilities, so each system is integrated once and usable by any compatible application. Hosts run one **client** per server; on connection, clients discover what the server offers and pass it to the model. Servers offer **tools** (actions chosen by the model, with JSON Schema inputs), **resources** (URI-addressed data chosen by the application or user) and **prompts** (templates chosen by the user).

With the TypeScript SDK, a server registers tools with Zod schemas, resources and prompts; a client lists and calls them; failures return as tool results with `isError`; invalid inputs are rejected; and in-memory transports make testing easy. Servers run locally over **stdio** or remotely over **Streamable HTTP**, deployed and operated like any API, and model APIs can connect to remote servers directly. Design tools around tasks with clear descriptions and small results, and evolve them compatibly. Secure servers with per-user **OAuth-based authorisation**, least privilege, validation, confirmation of risky actions, rate limits and audit logs; treat third-party servers and all text reaching the model as untrusted, and sandbox local servers.

## Key terms

- **Model Context Protocol (MCP)** — An open standard for connecting AI applications to tools and data.
- **MCP host** — The AI application that uses MCP servers.
- **MCP client** — The component in a host that connects to one server.
- **MCP server** — A program exposing tools, resources and prompts.
- **Tool (MCP)** — A model-callable action with a defined input schema.
- **Resource (MCP)** — Data identified by a URI that can be provided as context.
- **Prompt (MCP)** — A reusable prompt template offered by a server.
- **JSON-RPC 2.0** — The request and response message format MCP uses.
- **stdio transport** — Communication with a local server process over standard input and output.
- **Streamable HTTP transport** — Communication with a remote server over HTTP, optionally streaming.
- **Capability negotiation** — Agreeing on supported features when connecting.
- **Tool poisoning** — Malicious instructions hidden in tool descriptions or results.
- **MCP Inspector** — A tool for testing MCP servers directly.

## What comes next

Models, prompts, retrieval, agents and integrations are the parts; the last chapter of this part puts them together into products. The next chapter, {{ch:building-ai-products}}, covers building AI features that people trust: choosing problems, evaluations, guardrails, user experience for uncertain output, cost and latency, monitoring and responsible use.
