# Phase 8 — Chapter 6: Model Context Protocol (MCP)

---

## Chapter Overview

The Model Context Protocol (MCP) is an open standard by Anthropic that enables AI systems to connect with external data sources and tools through a standardized interface. MCP replaces ad-hoc API integrations with a universal protocol.

**Topics:**
- What MCP is and why it exists
- MCP architecture (client, server, host)
- MCP primitives (resources, tools, prompts)
- Building an MCP server in Node.js
- Integrating MCP with Claude Desktop and Claude Code
- Security and authentication
- MCP vs. function calling

---

## Core Concepts

### What MCP Solves

```
Without MCP:
  Every AI application has to build custom integrations:
  - "How do I connect to GitHub?" → custom GitHub API client
  - "How do I search the DB?" → custom DB query layer
  - "How do I read files?" → custom file system code
  Each integration is built from scratch, incompatible with other AI apps.

With MCP:
  One MCP server for GitHub → works with Claude, any MCP client
  One MCP server for PostgreSQL → works everywhere
  Ecosystem of reusable MCP servers (like npm packages)

MCP = USB-C for AI context
  USB-C: one port, works with any device that supports the standard
  MCP: one protocol, any AI client can connect to any MCP server

Architecture:
  Host (e.g., Claude Desktop, Claude Code, your app)
    └── MCP Client (built into host)
         ├── MCP Server A (filesystem tools)
         ├── MCP Server B (PostgreSQL tools)
         └── MCP Server C (GitHub tools)
```

### MCP Primitives

```
Resources:
  Context data that AI can READ.
  Think: files, database records, documentation.
  URI scheme: postgres://database/users, github://repos/my-repo
  Can be static (file content) or dynamic (live DB query).
  Exposed as: list of URI-addressable content the model can read.

Tools:
  Functions the AI can CALL to take action.
  Think: function calling, but standardized.
  Returns a result. Can have side effects.
  Examples: create_file, run_query, send_email, search_web.

Prompts:
  Pre-built prompt templates with placeholders.
  User selects a prompt, fills in variables.
  Examples: "Summarize this document:", "Debug this error:"
  Think: slash commands in Claude Desktop.

Sampling:
  MCP server can ask the HOST to make LLM calls.
  Server-side LLM inference via the host's model.
  Use: multi-step server-side reasoning.
```

---

## Code Examples

### Building an MCP Server

```typescript
// npm install @modelcontextprotocol/sdk
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport }        from "@modelcontextprotocol/sdk/server/stdio.js";
import { z }                           from "zod";
import { Pool }                        from "pg";

const db  = new Pool({ connectionString: process.env.DATABASE_URL });
const mcp = new McpServer({
  name:    "postgres-mcp",
  version: "1.0.0"
});

// ─── Resources: expose DB data for reading ────────────
mcp.resource(
  "schema",
  new ResourceTemplate("postgres://schema/{tableName}", { list: undefined }),
  async (uri, { tableName }) => {
    const { rows } = await db.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = $1
      ORDER BY ordinal_position
    `, [tableName]);

    return {
      contents: [{
        uri:      uri.href,
        mimeType: "application/json",
        text:     JSON.stringify(rows, null, 2)
      }]
    };
  }
);

// List all tables as resources
mcp.resource("tables", "postgres://tables", async (uri) => {
  const { rows } = await db.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name
  `);

  return {
    contents: [{
      uri:      uri.href,
      mimeType: "application/json",
      text:     JSON.stringify(rows.map(r => r.table_name))
    }]
  };
});

// ─── Tools: functions the AI can call ─────────────────
mcp.tool(
  "query",
  "Execute a READ-ONLY SQL query against the database",
  {
    sql:    z.string().describe("The SELECT query to execute"),
    params: z.array(z.unknown()).optional().describe("Query parameters")
  },
  async ({ sql, params }) => {
    // Safety: only allow SELECT statements
    const normalized = sql.trim().toUpperCase();
    if (!normalized.startsWith("SELECT")) {
      return { content: [{ type: "text", text: "Error: Only SELECT queries are allowed" }], isError: true };
    }

    try {
      const { rows, rowCount } = await db.query(sql, params || []);
      return {
        content: [{
          type: "text",
          text: JSON.stringify({ rows, rowCount }, null, 2)
        }]
      };
    } catch (err) {
      return {
        content: [{ type: "text", text: `Query error: ${(err as Error).message}` }],
        isError: true
      };
    }
  }
);

mcp.tool(
  "explain_query",
  "Get the query execution plan for a SQL query",
  { sql: z.string() },
  async ({ sql }) => {
    const { rows } = await db.query(`EXPLAIN ANALYZE ${sql}`);
    return {
      content: [{
        type: "text",
        text: rows.map(r => r["QUERY PLAN"]).join("\n")
      }]
    };
  }
);

// ─── Prompts: reusable templates ──────────────────────
mcp.prompt(
  "analyze-table",
  "Analyze a database table for performance issues",
  { tableName: z.string() },
  ({ tableName }) => ({
    messages: [{
      role:    "user",
      content: {
        type: "text",
        text: `Please analyze the table "${tableName}" in our PostgreSQL database:
1. Check the schema and suggest missing indexes
2. Look for columns that could be optimized
3. Check if partitioning would be beneficial
4. Identify any common anti-patterns

Use the available database tools to investigate.`
      }
    }]
  })
);

// ─── Start server ──────────────────────────────────────
const transport = new StdioServerTransport();
await mcp.connect(transport);
console.error("PostgreSQL MCP Server running on stdio");
```

### Claude Desktop Configuration

```json
// ~/.claude.ai/claude_desktop_config.json (macOS)
// %APPDATA%\Claude\claude_desktop_config.json (Windows)
{
  "mcpServers": {
    "postgres-mcp": {
      "command":     "node",
      "args":        ["/path/to/postgres-mcp/dist/index.js"],
      "env": {
        "DATABASE_URL": "postgresql://localhost:5432/myapp"
      }
    },
    "filesystem": {
      "command": "npx",
      "args":    ["-y", "@modelcontextprotocol/server-filesystem", "/home/user/documents"]
    },
    "github": {
      "command": "npx",
      "args":    ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_xxxxxxxxxxxx"
      }
    }
  }
}
```

### Connecting MCP in Code (Claude SDK)

```typescript
import Anthropic from "@anthropic-ai/sdk";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { spawn } from "child_process";

// Launch MCP server as subprocess
const serverProcess = spawn("node", ["./mcp-server/dist/index.js"], {
  env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL }
});

const mcpClient = new Client({ name: "my-app", version: "1.0.0" });
const transport = new StdioClientTransport({
  command: "node",
  args:    ["./mcp-server/dist/index.js"]
});

await mcpClient.connect(transport);

// List available tools from MCP server
const { tools } = await mcpClient.listTools();
console.log("Available tools:", tools.map(t => t.name));

// Convert MCP tools to Anthropic tool format
const anthropicTools: Anthropic.Tool[] = tools.map(tool => ({
  name:         tool.name,
  description:  tool.description ?? "",
  input_schema: tool.inputSchema as Anthropic.Tool["input_schema"]
}));

// Use in Claude API call
const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const response = await claude.messages.create({
  model:      "claude-sonnet-4-6",
  max_tokens: 4096,
  tools:      anthropicTools,
  messages: [{
    role:    "user",
    content: "How many users signed up in the last 7 days? Show me the query."
  }]
});

// Handle tool calls — route to MCP server
for (const block of response.content) {
  if (block.type === "tool_use") {
    const result = await mcpClient.callTool({
      name:      block.name,
      arguments: block.input as Record<string, unknown>
    });
    console.log("Tool result:", result.content);
  }
}

await mcpClient.close();
```

---

## Interview Preparation

**Q1: What is MCP and how is it different from function calling?**
A: Function calling: built into LLM APIs. You define tools inline with each API call. Application-specific — tools are defined per app, not reusable. The tool implementation lives in your application code. MCP: a separate open protocol for defining servers that expose tools, resources, and prompts. MCP servers are standalone processes. Any MCP client (Claude Desktop, Claude Code, your app with the MCP SDK) can connect to any MCP server. The key difference: MCP enables a reusable ecosystem. One PostgreSQL MCP server can be used by any AI application without rebuilding the integration. Function calling is tightly coupled to one AI app; MCP is a shared protocol. Think of function calling as "bespoke" and MCP as "standardized." Both can work together — MCP tools are converted to function calling format when passed to the LLM API.

**Q2: When would you build an MCP server vs. just using tool calling directly?**
A: Build an MCP server when: 1) The integration will be used across multiple AI applications or by multiple teams (reusability). 2) You want to expose your system's data/capabilities to Claude Desktop or Claude Code for development workflows. 3) You're building a product/platform where others will use your integration. 4) The integration requires complex authentication or connection management that should be abstracted. Use tool calling directly when: 1) The tools are specific to one application. 2) You need very low latency (MCP adds subprocess overhead). 3) The tools are simple enough that standardization provides no benefit. 4) You're in early prototyping — add MCP later when the pattern is stable. Many production systems start with direct tool calling and extract to MCP servers as the integration stabilizes and proves its value.

---

## Practical Tasks

### Beginner (10 Tasks)
1. Install `@modelcontextprotocol/sdk`.
2. Create a minimal MCP server with one tool.
3. Register it in Claude Desktop config.
4. Test the tool from Claude Desktop chat.
5. Add a resource that exposes a text file.
6. Add a prompt template.
7. Use the MCP SDK to list all tools from your server.
8. Add input validation with Zod.
9. Return an error from a tool call.
10. Add logging to your MCP server.

### Intermediate (10 Tasks)
1. Build a PostgreSQL MCP server with query and schema tools.
2. Build a filesystem MCP server (read, write, list files).
3. Build a GitHub MCP server (list repos, read files, create issues).
4. Connect MCP tools to Claude via the SDK.
5. Implement tool authentication (API key validation).
6. Build a Slack MCP server (send message, list channels).
7. Add rate limiting to MCP tools.
8. Implement caching for expensive tool calls.
9. Build a web search MCP server.
10. Write integration tests for your MCP server.

### Advanced (10 Tasks)
1. Build a multi-resource MCP server (DB + files + APIs).
2. Implement MCP sampling (server-side LLM calls via host).
3. Build a secure MCP server with OAuth2 authentication.
4. Package and publish your MCP server to npm.
5. Build a company-internal MCP server for Jira + Confluence.
6. Implement streaming responses from MCP tools.
7. Build MCP server telemetry (request logs, latency tracking).
8. Create a Docker-based MCP server deployment.
9. Build an MCP server for a REST API (auto-generate from OpenAPI spec).
10. Integrate MCP with LangGraph for complex agent workflows.

---

## Cheat Sheet

```typescript
// MCP server setup
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({ name: "my-server", version: "1.0.0" });

// Tool
server.tool("tool-name", "description", { arg: z.string() }, async ({ arg }) => ({
  content: [{ type: "text", text: "result" }]
}));

// Resource
server.resource("res-name", "scheme://path", async (uri) => ({
  contents: [{ uri: uri.href, mimeType: "text/plain", text: "content" }]
}));

// Prompt
server.prompt("prompt-name", "description", { param: z.string() }, ({ param }) => ({
  messages: [{ role: "user", content: { type: "text", text: `Do something with ${param}` } }]
}));

// Start
await server.connect(new StdioServerTransport());

// MCP primitives:
//   Resources: read-only context (files, DB rows, docs)
//   Tools:     callable functions with side effects
//   Prompts:   reusable templates with parameters

// Config path:
//   macOS:   ~/.claude.ai/claude_desktop_config.json
//   Windows: %APPDATA%\Claude\claude_desktop_config.json
```
