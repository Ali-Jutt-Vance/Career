# AI Agents

> [!GOALS]
> - Explain what an AI agent is: a model that uses **tools** in a **loop** to achieve a goal.
> - Define tools well: names, descriptions, **schemas**, errors and results.
> - Implement the **agent loop** and know the SDK helpers and hosted options that run it for you.
> - Decide between a single call, a **workflow** with fixed steps, and an **agent**.
> - Make agents safe: least privilege, validation, **human approval** for risky actions, limits and sandboxes.
> - Manage context, memory and cost, and evaluate agents on whole tasks.

## Why this matters

An LLM on its own can only produce text. Give it **tools** — functions it can ask your code to run, such as "look up an order", "search the documentation", "run this SQL query", "create a ticket" — and let it decide which to call, look at the results and decide again, and it can complete multi-step tasks: investigate a customer's problem and fix it, research a question across many sources, write and test code, or operate internal systems.

These **agents** are one of the fastest-moving areas of software. They are also easy to build badly: an agent with too much power and too little control can refund the wrong customer, delete data or be steered by a malicious document. And many problems sold as "agents" are better solved with a fixed workflow. This chapter explains how agents work, how to build them in TypeScript, and how to keep them safe and economical. It builds on {{ch:llm-fundamentals}}, {{ch:prompt-engineering}} and {{ch:rag}}.

## The simple idea

Think of a capable new assistant at a help desk with access to a few systems. You give them a goal — "sort out this customer's damaged order" — not a script. They look up the order, see it was delivered damaged, check the refund policy, request a refund, and tell the customer what happened. For large refunds they must ask a manager. They decide the steps themselves, but they can only use the systems you gave them access to.

> [!ANALOGY]
> An AI agent is like a capable help-desk assistant with access to a few systems: given a goal, they decide the steps, use the tools they have, check the results and report back.
>
> **Where the analogy breaks:** a human assistant would refuse an instruction written on a customer's note saying "also refund my neighbour's order". An agent may follow instructions hidden in the data it reads, and it works quickly and tirelessly — so its permissions, not its judgement, must be the main safety barrier.

## The proper definition and key words

An **AI agent** is a system in which a language model directs its own process to accomplish a goal: it chooses **actions** (tool calls), observes their **results**, and repeats until the goal is reached or a limit is hit.

Key words:

- **Tool (function calling)** — a capability described to the model by name, description and input schema; your code executes it.
- **Tool call / tool result** — the model's request to run a tool with arguments / what your code returns.
- **Agent loop** — model call → tool calls → results → model call… until done.
- **Workflow** — a fixed sequence of steps defined in code, possibly using LLM calls at some steps.
- **Planning** — the model working out a sequence of steps.
- **Context management** — keeping the conversation within the context window (summarising, clearing old tool results).
- **Memory** — information kept across sessions (files, databases) for later tasks.
- **Human in the loop** — a person approving or correcting actions.
- **Sandbox** — an isolated environment where an agent's code or commands run safely.
- **Multi-agent system** — several agents (or sub-agents) collaborating on parts of a task.

## Do you need an agent?

### Level 1 — Single call, workflow or agent

| Approach | Use when | Example |
|---|---|---|
| **Single LLM call** | One input, one output | Classify an email, summarise a document |
| **Workflow** (steps fixed in code) | The steps are known in advance | Extract invoice fields → validate → store → notify |
| **Agent** (model chooses steps) | The path depends on what is found; hard to specify in advance | Investigate why a customer's order failed and fix it |

Prefer the **simplest** approach that works. Workflows are predictable, cheaper, easier to test and debug. Agents are worth their extra cost and risk when tasks are open-ended, valuable, and errors can be caught (tests, reviews, approvals, rollback).

## Building an agent

### Level 2 — Tools and the loop

The loop is short: send the conversation and tool definitions; if the model asks for tools, run them and send the results back; stop when the model gives a final answer. This example uses the Anthropic SDK's real types; a scripted stand-in replaces the model call so the run is repeatable and free:

```ts
import type Anthropic from "@anthropic-ai/sdk";

// Tools the agent may use, described with JSON Schema exactly as they would be sent to the API
const tools: Anthropic.Tool[] = [
  { name: "get_order", description: "Look up an order by ID. Returns status, items and total.",
    input_schema: { type: "object", properties: { order_id: { type: "string" } }, required: ["order_id"], additionalProperties: false } },
  { name: "issue_refund", description: "Refund an order. Requires human approval above 50 GBP.",
    input_schema: { type: "object", properties: { order_id: { type: "string" }, amount_pence: { type: "integer" } }, required: ["order_id", "amount_pence"], additionalProperties: false } },
];

// Our side: the real implementations, with validation and an approval gate for risky actions
const orders: Record<string, { status: string; total_pence: number; damaged: boolean }> = { "1001": { status: "delivered", total_pence: 8_900, damaged: true } };
const approvals: string[] = [];
function runTool(name: string, input: Record<string, unknown>): { content: string; is_error?: boolean } {
  if (name === "get_order") {
    const o = orders[String(input.order_id)];
    return o ? { content: JSON.stringify(o) } : { content: "order not found", is_error: true };
  }
  if (name === "issue_refund") {
    const o = orders[String(input.order_id)], amount = Number(input.amount_pence);
    if (!o || !Number.isInteger(amount) || amount <= 0 || amount > o.total_pence) return { content: "invalid refund", is_error: true };
    if (amount > 5_000) { approvals.push(`refund ${amount} for ${input.order_id}`); return { content: "queued for human approval" }; }
    return { content: "refunded" };
  }
  return { content: `unknown tool ${name}`, is_error: true };
}

// A scripted stand-in for the model, so the loop runs without an API call. With the real API, this is
// `await client.messages.create({ model: "claude-opus-5-5", max_tokens: 16000, tools, messages })`.
type Turn = Pick<Anthropic.Message, "content" | "stop_reason">;
const script: Turn[] = [
  { stop_reason: "tool_use", content: [{ type: "tool_use", id: "tu_1", name: "get_order", input: { order_id: "1001" } } as Anthropic.ContentBlock] },
  { stop_reason: "tool_use", content: [{ type: "tool_use", id: "tu_2", name: "issue_refund", input: { order_id: "1001", amount_pence: 8_900 } } as Anthropic.ContentBlock] },
  { stop_reason: "end_turn", content: [{ type: "text", text: "I've requested a full refund of £89.00; a colleague will approve it shortly.", citations: null } as Anthropic.ContentBlock] },
];
let call = 0;
async function createMessage(_messages: Anthropic.MessageParam[]): Promise<Turn> { return script[call++]!; }

// The agent loop: call the model, run requested tools, send results back, stop when it is done
const messages: Anthropic.MessageParam[] = [{ role: "user", content: "Order 1001 arrived damaged. Please refund me." }];
const MAX_STEPS = 8;
for (let step = 1; step <= MAX_STEPS; step++) {
  const response = await createMessage(messages);
  messages.push({ role: "assistant", content: response.content });
  if (response.stop_reason !== "tool_use") {
    for (const b of response.content) if (b.type === "text") console.log(`final answer: ${b.text}`);
    break;
  }
  const results: Anthropic.ToolResultBlockParam[] = [];
  for (const block of response.content) {
    if (block.type !== "tool_use") continue;
    const result = runTool(block.name, block.input as Record<string, unknown>);
    console.log(`step ${step}: ${block.name}(${JSON.stringify(block.input)}) -> ${result.content}`);
    results.push({ type: "tool_result", tool_use_id: block.id, ...result });
  }
  messages.push({ role: "user", content: results });                // all results of a step in ONE user message
}
console.log(`messages in conversation: ${messages.length}; pending approvals: ${approvals.join(", ")}`);
```

**Output:**

```text
step 1: get_order({"order_id":"1001"}) -> {"status":"delivered","total_pence":8900,"damaged":true}
step 2: issue_refund({"order_id":"1001","amount_pence":8900}) -> queued for human approval
final answer: I've requested a full refund of £89.00; a colleague will approve it shortly.
messages in conversation: 6; pending approvals: refund 8900 for 1001
```

- **Tools** are described with a name, a clear description (when to use it, what it returns) and a JSON Schema for inputs; `additionalProperties: false` and required fields make arguments predictable (with `strict: true`, the API guarantees schema-valid input).
- The model looked up the order first, then asked for a refund — the agent chose the steps. Your code **executed** them, after **validating** the arguments (the amount must be positive and not exceed the order total).
- The refund was above the approval threshold, so the tool **queued it for a human** instead of executing it, and told the model so — which the model reported honestly. Risky actions are gated in **code**, not left to the model's judgement.
- **Errors are results too**: return `is_error: true` with a useful message ("order not found") so the model can recover or explain, instead of throwing and stopping the loop.
- All tool results from one step go back in **one** user message; a **step limit** (`MAX_STEPS`) stops runaway loops.
- With the real API, check every `stop_reason`: `tool_use` (run tools), `end_turn` (done), `max_tokens` (truncated), `refusal`, and `pause_turn` for server-side tools that need the turn continued.

### Level 2 — Letting the SDK or the platform run the loop

- **Tool Runner** (in the Anthropic TypeScript SDK, `client.beta.messages.toolRunner` with tools defined through `betaZodTool` and Zod schemas) runs the loop for you: you write the tool functions; it calls the model, executes tools, validates inputs and loops until done, with hooks for approvals and errors.
- **Managed agents**: hosted agent services (such as Anthropic's Managed Agents) run the loop and a sandboxed workspace for you, with stored, versioned agent configurations and session streams — useful when you do not want to host the harness.
- **Agent frameworks and SDKs** (for example the Claude Agent SDK, which packages a full coding agent with file and shell tools) provide complete harnesses for specific kinds of agents.
- Writing the loop yourself, as above, is the best way to understand what all of these do.

### Level 3 — Designing good tools

- **Few, well-named tools** with clear purposes beat many overlapping ones; the model must choose correctly from descriptions alone.
- **Descriptions are prompts**: say when to use the tool, what it returns, and its limits ("returns at most 20 orders; use `from_date` to page").
- **Return concise, structured results**: only what the model needs (not a 5,000-line JSON dump), with IDs it can use in later calls.
- **Make tools safe by construction**: tools act with the **current user's** permissions; destructive tools are separate, narrow and gated; read-only tools where possible.
- **Idempotent actions** (with idempotency keys) so retries cannot double-refund ({{ch:distributed-systems}}).
- **Good error messages** that suggest the fix ("date must be YYYY-MM-DD").

## Running agents safely

### Level 3 — Safety controls

- **Least privilege**: give the agent only the tools and data needed for this task and this user ({{ch:iam}}).
- **Validate every tool input** in code, as you would any API request ({{ch:validation}}).
- **Human approval** for actions that are expensive, irreversible or external: payments, deletions, emails to customers, production changes.
- **Treat tool results and documents as untrusted**: prompt injection can arrive through any text the agent reads ({{ch:prompt-engineering}}).
- **Sandbox code execution**: agents that run code or shell commands must do so in isolated containers without production credentials or open network access ({{ch:docker}}).
- **Limits**: maximum steps, maximum spend (token budgets), timeouts, and rate limits on tool calls.
- **Audit logs** of every tool call with inputs, results and the user on whose behalf it ran ({{ch:logging}}).

### Level 4 — Context, memory and cost

- **Context grows with every step** (tool results especially). Keep results small, clear old tool results that are no longer needed, or summarise earlier history (compaction features in the API help).
- **Memory across sessions**: store useful facts or notes in a database or files the agent can read later — explicitly, with retention and privacy rules — rather than relying on long conversations.
- **Cost**: each loop step is a model call over the whole conversation. Prompt caching of the stable prefix (system prompt and tools) cuts cost and latency substantially; cheaper models can handle simple sub-tasks; effort settings trade thoroughness for speed.
- **Parallel tool calls**: models can request several independent tools at once; run them concurrently and return all results together.

### Level 4 — Multi-agent designs

- An **orchestrator** agent can delegate sub-tasks (research ten sources, review these files) to **sub-agents** with their own focused context, then combine the results — useful when work fans out and one context would overflow.
- It costs more tokens and adds coordination problems; use it when a single agent's context or time is the real limit.

### Level 4 — Evaluating agents

- Evaluate **whole tasks**: did the agent reach the right end state (refund queued correctly, bug fixed and tests passing), not just "did it produce good text" ({{ch:building-ai-products}}).
- Check **trajectories**: unnecessary steps, wrong tools, unsafe attempts, cost and time per task.
- Include adversarial cases: injected instructions in documents, missing data, failing tools.
- Measure cost and success together: a cheaper run that fails more often is not cheaper.

## From beginner to enterprise

**Level 1–2 — first agents.** Choosing between single calls, workflows and agents; defining tools with schemas; writing the loop; handling stop reasons and tool errors.

**Level 3 — safe agents.** Validation, least privilege, approval gates, idempotent actions, sandboxed execution, step and budget limits, audit logs; SDK tool runners.

**Level 4 — production agents.** Context management and memory; prompt caching and model choice for cost; parallel tools; sub-agents; task-level evaluations and adversarial tests.

**Level 5 — senior practice.** Deciding where autonomy is worth it; designing tool surfaces and permission models; monitoring agent behaviour and cost in production.

**Level 6 — organisations.** Agent platforms with central tool registries, policy enforcement, approval workflows and governance of what agents may do.

## Real-world use cases

### The support agent

- **Design**: tools to look up orders, shipments and policies (read-only), and to propose refunds and replacements (write, with approval above a threshold); the agent acts with the logged-in customer's permissions only; every action is logged; a human reviews proposals over the limit. Resolution time for routine cases dropped sharply, with no unapproved large refunds.

### The over-powered agent

- **What happened**: an internal agent with a general "run SQL" tool against the production database was asked to "clean up test accounts" and deleted real customer accounts matching a loose pattern.
- **Fix**: no general SQL tool; narrow, read-only tools by default; destructive operations as specific tools requiring approval and limited to a staging environment; backups restored.

## Common mistakes

### Beginner: an agent where a workflow would do

**Consequence:** unpredictable, costly behaviour. **Fix:** fixed steps in code when the path is known.

### Beginner: vague tool descriptions

**Fix:** state purpose, inputs, outputs and limits.

### Beginner: throwing on tool errors

**Fix:** return errors as tool results so the model can recover.

### Intermediate: no step or budget limits

**Consequence:** runaway loops and bills. **Fix:** maximum steps, budgets and timeouts.

### Intermediate: trusting the model with permissions

**Fix:** least privilege, validation and approval gates in code.

### Intermediate: dumping huge tool results into context

**Consequence:** slow, expensive, confused agents. **Fix:** concise, structured results.

### Production: agents executing code outside sandboxes

**Fix:** isolated containers without production secrets.

## Debugging and troubleshooting

- **Wrong tool chosen**: tool descriptions overlap or are unclear; reduce and sharpen the set.
- **Bad arguments**: tighten schemas (`strict: true`, enums, required fields) and validate; return helpful error messages.
- **Loops without progress**: missing information or a tool that keeps failing — log trajectories, add a step limit, improve error messages.
- **Agent stops too early or too late**: clarify the goal and what "done" means in the system prompt.
- **Costs too high**: inspect tokens per step; cache prefixes; trim tool results; use a smaller model or lower effort for simple steps.

## Security summary

- **Permissions are the real boundary**: least privilege per task and user.
- **Approve risky actions** in code with human confirmation.
- **Assume prompt injection** through every document, web page and tool result.
- **Sandbox execution**; never give agents production secrets directly.
- **Log and monitor** every action; alert on unusual patterns ({{ch:application-security}}).

## How a senior engineer thinks about this

- **Autonomy must be earned.** Start with workflows; add agency where it clearly pays.
- **Tools are the product.** Their design decides what the agent can do well and safely.
- **Code enforces, the model proposes.** Validation, permissions and approvals live outside the model.
- **Measure tasks, not text.** Success, safety, time and cost per completed task.

## Exercises

### Exercise 1 — Workflow or agent?

**Objective:** practise choosing the approach.
**What to do:** choose for (a) generating a weekly sales summary from a fixed set of queries; (b) answering "why did this customer's payment fail?" across logs, payment provider data and order history; (c) translating product descriptions into five languages.

<details>
<summary>Show the solution</summary>

- (a) **Workflow**: the queries are known; one LLM call writes the summary.
- (b) **Agent**: the investigation path depends on what is found; read-only tools for logs, payments and orders.
- (c) **Workflow** (or batch single calls): the same step for each description and language.

</details>

### Exercise 2 — Design the tools

**Objective:** practise tool design.
**What to do:** design tools for an agent that helps engineers investigate production errors.

<details>
<summary>Show the solution</summary>

- `search_logs(service, query, from, to, limit≤100)` — read-only, returns concise matching lines with trace IDs.
- `get_trace(trace_id)` — read-only span summary ({{ch:observability-and-incidents}}).
- `get_recent_deployments(service, since)` — read-only.
- `get_metric(service, metric, from, to)` — read-only, returns a small summary series.
- `create_incident_note(incident_id, text)` — write, low risk.
- **No** tools for rollbacks or configuration changes initially; if added later, they propose actions that a human approves.
- All tools use the engineer's own permissions and are logged.

</details>

### Exercise 3 — Production scenario: the expensive agent

**Objective:** practise agent cost control.
**The scenario:** a research agent costs ten times the budget. Logs show 40–60 steps per task, each tool result is a full web page (20,000 tokens), and the system prompt and tool definitions (6,000 tokens) are sent fresh on every call. What do you change?

<details>
<summary>Show the solution</summary>

1. **Trim tool results**: return extracted relevant passages or summaries, not whole pages.
2. **Prompt caching**: mark the stable system prompt and tool definitions as cacheable so each step reads them cheaply.
3. **Context management**: clear old tool results once used, or compact history.
4. **Step limits and budgets** per task; instruct the agent to stop when enough evidence is gathered.
5. **Sub-agents with smaller models** for reading and extracting, the main model for synthesis.
6. **Evaluate** success rate and cost per task before and after each change.

</details>

## Summary

An **AI agent** is a language model that pursues a goal by calling **tools** in a **loop**: the model requests tool calls, your code validates and runs them, results go back, and the loop continues until the model gives a final answer or a limit is reached. Tools are defined by clear names, descriptions and **JSON Schemas**; errors return as tool results; all results of a step go back together; stop reasons are checked every time. SDK tool runners, hosted agent platforms and agent frameworks can run the loop for you.

Use the simplest approach: a **single call** for one-shot tasks, a **workflow** when the steps are known, an **agent** when the path depends on what is found and the value justifies the cost. Keep agents safe with least privilege, input validation, **human approval** for risky actions, idempotent tools, sandboxed execution, step and budget limits and audit logs — the model proposes, code enforces. Manage context by keeping results small and clearing or compacting history, cut cost with prompt caching and right-sized models, use sub-agents when work fans out, and **evaluate whole tasks**, including adversarial cases.

## Key terms

- **AI agent** — A model-directed system that uses tools in a loop to reach a goal.
- **Tool** — A capability the model can request, executed by your code.
- **Function calling** — The model producing structured requests to call tools.
- **Tool schema** — The JSON Schema describing a tool's inputs.
- **Tool result** — The output your code returns for a tool call.
- **Agent loop** — Repeated model calls and tool executions until completion.
- **Workflow** — A fixed sequence of steps defined in code.
- **Human in the loop** — Human approval or review within an automated process.
- **Approval gate** — A check that requires human confirmation before an action.
- **Sandbox** — An isolated environment for running untrusted code or commands.
- **Context management** — Keeping a conversation within the context window.
- **Compaction** — Summarising earlier conversation to save context.
- **Agent memory** — Information persisted for use in later tasks.
- **Sub-agent** — An agent delegated a sub-task by another agent.
- **Trajectory** — The sequence of steps an agent took.

## What comes next

Every agent needs tools, and every company has systems that agents could use. The next chapter, {{ch:mcp}}, covers the Model Context Protocol, an open standard for connecting models and agents to tools and data: servers, clients, tools, resources and prompts, transports, and how to build and secure an MCP server in TypeScript.
