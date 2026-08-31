# Phase 8 — Chapter 5: AI Agents

---

## Chapter Overview

AI agents are LLM-powered systems that can take actions in the world: call tools, query databases, browse the web, write code, and orchestrate multi-step workflows. They go beyond question-answering to autonomous problem-solving.

**Topics:**
- What makes an AI agent (LLM + tools + memory + planning)
- Tool use / function calling
- Agent loop (plan → act → observe → repeat)
- ReAct (Reason + Act) pattern
- Multi-agent systems
- Agent memory (short-term, long-term, episodic)
- Agent safety and guardrails

---

## Core Concepts

### What Makes an Agent

```
Agent = LLM + Tools + Memory + Objective

LLM:     The "brain" — reasons, plans, decides what to do next
Tools:   Functions the agent can call (API, DB, calculator, browser)
Memory:  State across steps (conversation, summaries, KB)
Objective: The goal to achieve (given by user)

Simple LLM call vs. Agent:
  LLM: user → model → response (one shot)
  Agent: user → model → tool call → result → model → tool call → result → model → final response
  
  The agent DECIDES to use tools and INTERPRETS their results.

Agent capabilities enabled by tools:
  Search the web          → get current information
  Run code                → execute and test
  Query database          → get real data
  Call APIs               → interact with external systems
  Read/write files        → work with documents
  Send emails/Slack       → take real-world actions
```

### The Agent Loop (ReAct Pattern)

```
ReAct = Reason + Act

Loop until task complete or max iterations:
  1. REASON: given goal + history + tool results, what should I do next?
  2. DECIDE: call a tool, or give final answer?
  3. If tool: ACT — call the tool
  4. OBSERVE: get tool result, add to context
  5. Repeat

Example: "What's the weather in NYC and should I bring an umbrella?"

  Iteration 1:
    THOUGHT: I need current weather for NYC. I'll use the weather API.
    ACTION: get_weather(city="New York City")
    OBSERVATION: {"temp": 15°C, "condition": "rain", "precip_probability": 80%}

  Iteration 2:
    THOUGHT: It's raining with 80% probability. User should bring an umbrella.
    ANSWER: "It's currently 15°C and raining in NYC with 80% precipitation probability.
             Yes, bring an umbrella!"

Tool call format (Anthropic):
  Model returns: { type: "tool_use", name: "get_weather", input: {"city": "NYC"} }
  Application:   calls the function, gets result
  Feeds back:    { type: "tool_result", tool_use_id: ..., content: result }
  Model:         continues reasoning with new context
```

---

## Code Examples

### Tool Use with Anthropic

```typescript
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── Define tools ─────────────────────────────────────
const tools: Anthropic.Tool[] = [
  {
    name:        "search_knowledge_base",
    description: "Search the internal knowledge base for information",
    input_schema: {
      type:       "object",
      properties: {
        query:   { type: "string", description: "Search query" },
        topK:    { type: "number", description: "Max results to return (default 3)" }
      },
      required: ["query"]
    }
  },
  {
    name:        "get_order_details",
    description: "Look up order details by order ID",
    input_schema: {
      type:       "object",
      properties: {
        orderId: { type: "string", description: "The order ID to look up" }
      },
      required: ["orderId"]
    }
  },
  {
    name:        "create_refund",
    description: "Create a refund for an order",
    input_schema: {
      type:       "object",
      properties: {
        orderId: { type: "string" },
        reason:  { type: "string", description: "Refund reason" },
        amount:  { type: "number", description: "Amount to refund in USD" }
      },
      required: ["orderId", "reason", "amount"]
    }
  }
];

// ─── Tool executor ────────────────────────────────────
async function executeTool(name: string, input: Record<string, any>): Promise<string> {
  switch (name) {
    case "search_knowledge_base":
      const results = await semanticSearch(input.query, input.topK ?? 3);
      return JSON.stringify(results.map(r => ({ title: r.metadata.title, excerpt: r.content.slice(0, 300) })));

    case "get_order_details":
      const order = await db.query(
        "SELECT * FROM orders WHERE id = $1", [input.orderId]
      );
      if (!order.rows[0]) return JSON.stringify({ error: "Order not found" });
      return JSON.stringify(order.rows[0]);

    case "create_refund":
      const refund = await stripe.refunds.create({
        payment_intent: (await getPaymentIntentForOrder(input.orderId)).id,
        amount:         Math.round(input.amount * 100),
        reason:         "requested_by_customer"
      });
      await db.query(
        "INSERT INTO refunds (order_id, amount, reason, stripe_id) VALUES ($1, $2, $3, $4)",
        [input.orderId, input.amount, input.reason, refund.id]
      );
      return JSON.stringify({ success: true, refundId: refund.id });

    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}

// ─── Agent loop ───────────────────────────────────────
interface AgentOptions {
  systemPrompt: string;
  maxIterations?: number;
}

async function runAgent(
  userMessage: string,
  { systemPrompt, maxIterations = 10 }: AgentOptions
): Promise<string> {
  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: userMessage }
  ];

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    const response = await client.messages.create({
      model:      "claude-sonnet-4-6",
      max_tokens: 4096,
      system:     systemPrompt,
      tools,
      messages
    });

    // Add assistant's response to message history
    messages.push({ role: "assistant", content: response.content });

    // If model stopped naturally → final answer
    if (response.stop_reason === "end_turn") {
      const textContent = response.content.find(b => b.type === "text");
      return textContent?.type === "text" ? textContent.text : "No response";
    }

    // If model wants to use tools
    if (response.stop_reason === "tool_use") {
      const toolResults: Anthropic.MessageParam = {
        role:    "user",
        content: []
      };

      // Execute all requested tool calls
      for (const block of response.content) {
        if (block.type === "tool_use") {
          console.log(`→ Calling ${block.name} with`, block.input);
          const result = await executeTool(block.name, block.input as Record<string, any>);
          console.log(`← Got result:`, result.slice(0, 100));

          (toolResults.content as Anthropic.ToolResultBlockParam[]).push({
            type:        "tool_result",
            tool_use_id: block.id,
            content:     result
          });
        }
      }

      messages.push(toolResults);
    }
  }

  return "Max iterations reached without final answer";
}

// ─── Usage ────────────────────────────────────────────
const answer = await runAgent(
  "My order #ORD-12345 arrived damaged. Can you check its status and process a full refund?",
  {
    systemPrompt: `You are a helpful customer support agent with access to order and refund tools.
    Always verify the order exists before creating a refund. Be professional and empathetic.`
  }
);
console.log(answer);
```

### Multi-Agent System

```typescript
// Orchestrator → routes to specialized sub-agents

type AgentRole = "researcher" | "writer" | "reviewer";

class MultiAgentOrchestrator {
  private agents: Record<AgentRole, { system: string; tools: Anthropic.Tool[] }> = {
    researcher: {
      system: "You are a research specialist. Search for accurate information to answer questions.",
      tools: [searchWebTool, searchKnowledgeBaseTool]
    },
    writer: {
      system: "You are a professional writer. Craft clear, engaging content based on provided research.",
      tools: []
    },
    reviewer: {
      system: "You are a fact-checker. Review content for accuracy and flag any unsupported claims.",
      tools: [searchKnowledgeBaseTool]
    }
  };

  async run(task: string) {
    console.log("Orchestrator: Starting research phase");
    const research = await runAgent(task, {
      systemPrompt: this.agents.researcher.system,
      maxIterations: 5
    });

    console.log("Orchestrator: Starting writing phase");
    const draft = await runAgent(
      `Based on this research, write a well-structured response:\n\n${research}\n\nOriginal task: ${task}`,
      { systemPrompt: this.agents.writer.system, maxIterations: 3 }
    );

    console.log("Orchestrator: Starting review phase");
    const reviewed = await runAgent(
      `Review this draft for accuracy:\n\n${draft}\n\nFix any issues and return the final version.`,
      { systemPrompt: this.agents.reviewer.system, maxIterations: 3 }
    );

    return reviewed;
  }
}
```

### Agent Memory Types

An agent that can only see the current conversation forgets everything the moment the session ends — fine for a one-off Q&A, but not for an assistant that should remember a user's preferences across weeks, or recall what it tried five steps ago in a long task. Different memory types solve different parts of this problem.

```
Short-term memory (working memory):
  Scope: the current conversation/task only.
  Implementation: just the message list passed to each API call.
  Example: the agent remembers that 3 turns ago the user said their
  order ID is #1234 — because it's still sitting in the messages array.
  Limit: bounded by the context window; long agent loops eventually
  need to summarize or trim old messages to stay under the token limit.

Long-term memory (persistent, cross-session):
  Scope: facts that should persist across separate conversations.
  Implementation: a database (or vector DB for semantic recall) storing
  user preferences, past decisions, or summaries of prior sessions —
  loaded back in at the start of a new conversation.
  Example: "This user always wants responses in bullet points" —
  learned once, retrieved and injected into the system prompt every
  future session.

Episodic memory (specific past events):
  Scope: a record of specific past interactions/episodes, retrievable
  by relevance — not just "the last conversation" but "the time this
  came up before."
  Implementation: store each completed task/conversation as a document
  with an embedding; before starting a new task, semantically search
  past episodes for similar situations.
  Example: a coding agent recalls "last time I hit this exact error
  message, the fix was X" from a prior, unrelated session.
```

```typescript
// A minimal long-term memory store: persist facts learned about a user,
// inject them into every future conversation's system prompt
async function loadUserMemory(userId: string): Promise<string> {
  const facts = await db.query(
    "SELECT fact FROM user_memory WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20",
    [userId]
  );
  if (facts.rows.length === 0) return "";
  return `Known facts about this user:\n${facts.rows.map(f => `- ${f.fact}`).join("\n")}`;
}

async function saveUserMemory(userId: string, fact: string) {
  await db.query(
    "INSERT INTO user_memory (user_id, fact, created_at) VALUES ($1, $2, NOW())",
    [userId, fact]
  );
}

// Usage: prepend persisted memory to the system prompt for every new session
const memoryContext = await loadUserMemory(userId);
const systemPrompt = `${baseSystemPrompt}\n\n${memoryContext}`;
```

The practical rule: start with short-term memory only (it's free — just don't truncate the message list). Add long-term memory once users return across sessions and expect the agent to "remember" them. Add episodic memory only for agents handling many distinct, revisitable tasks (coding agents, research agents) where past specific episodes are genuinely useful to retrieve.

---

## Agent Safety

```
Risks:
  Infinite loops: agent keeps calling tools without progress
  Runaway actions: agent takes destructive actions (delete all files, send 1000 emails)
  Cost: uncapped agents can run indefinitely, burning tokens
  Prompt injection: user or tool result tries to redirect agent's goal

Guardrails:
  Max iterations: hard cap (10-20)
  Max tokens: hard cap on total tokens consumed
  Tool whitelisting: agent can only use approved tools
  Confirmation: for destructive actions (delete, send, pay), require confirmation
  Human-in-the-loop: pause agent at key decision points
  Output validation: validate tool inputs before calling

Pattern: allow agent to plan, require human approval before acting
  Phase 1: planning (no real tool calls, just plan)
  Human approves plan
  Phase 2: execution (agent executes approved plan)
```

---

## Interview Preparation

**Q1: How does function calling/tool use work in LLM APIs?**
A: Tool use allows LLMs to signal that they want to call an external function. Flow: 1) Developer defines tools as JSON schemas (name, description, input schema). 2) Include tools in the API request alongside the conversation. 3) If the model decides it needs a tool, instead of generating text, it returns a structured tool_use block: {name: "get_weather", input: {city: "NYC"}}. 4) Developer code detects this, calls the actual function, gets the result. 5) Result is fed back to the model as tool_result. 6) Model continues its reasoning with this new information. 7) Repeat until model generates a final text response. The model doesn't actually call any function — it generates a structured JSON object, and the developer's code does the actual function call.

**Q2: What is the difference between a simple LLM call and an agent?**
A: A simple LLM call: user input → one model inference → output. Stateless. Single step. An agent: user input → model decides action → tool call → result → model decides next action → tool call → ... → final answer. Key differences: agents have a loop (multiple inference calls per task), agents can take real-world actions (call APIs, write files), agents have planning capabilities (decide sequence of steps), agents can adapt based on intermediate results. The agent loop continues until the model decides it has enough information to answer. This enables: researching then answering, multi-step workflows, error recovery (tool fails → try different approach), and complex task automation.

---

## Cheat Sheet

```
Agent = LLM + Tools + Memory + Loop

ReAct loop:
  THINK: reason about current state
  ACT: call a tool
  OBSERVE: get result
  Repeat until ANSWER

Tool definition (Anthropic):
  { name, description, input_schema: { type: "object", properties: {...}, required: [...] } }

Stop reasons:
  "end_turn"  → model done, extract text response
  "tool_use"  → model wants to call a tool, execute it

Safety checklist:
  ✓ Max iterations (default: 10)
  ✓ Max tokens cap
  ✓ Tool whitelist
  ✓ Confirmation for destructive actions
  ✓ Human-in-the-loop for high-stakes decisions
  ✓ Rate limiting on tool calls

Multi-agent patterns:
  Orchestrator → sub-agents (researcher, writer, reviewer)
  Parallel: multiple agents work on subtasks simultaneously
  Sequential: each agent's output feeds next agent
```
