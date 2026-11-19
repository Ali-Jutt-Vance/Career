# Phase 8 — Chapter 7: Building AI SaaS Products

---

## Chapter Overview

This chapter covers the complete architecture for production AI SaaS applications: multi-tenant systems, cost management, rate limiting by tier, streaming, evaluation pipelines, and real-world deployment patterns.

**Topics:**
- Multi-tenant AI application architecture
- Token cost tracking and billing
- Streaming responses (SSE)
- Conversation memory management
- Evaluation and quality monitoring
- Model routing (cost vs. quality)
- AI SaaS business patterns

---

## Architecture Patterns

### Multi-Tenant AI SaaS

```
Challenges unique to AI SaaS:
  Cost per request: LLM calls are expensive ($0.003 per API call → 1M requests = $3,000)
  Latency: LLM calls are slow (1-5 seconds)
  Rate limits: LLM providers throttle by API key
  Non-determinism: same prompt → different responses
  Context management: conversation state per user

Core architecture:
  User → API Gateway (auth + rate limit) → AI Service → LLM API
                                         ↕
                                    Conversation Store (DB)
                                    Token Usage Store (DB)
                                    Cache (Redis)
                                    Queue (async tasks)

Tiers:
  Free:       gpt-4o-mini / claude-haiku (cheap), 20 messages/day, no streaming
  Pro:        claude-sonnet (balanced), 500 messages/day, streaming
  Enterprise: claude-opus (powerful), unlimited, dedicated throughput, fine-tuned models
```

---

## Code Examples

### Complete AI SaaS Service

```typescript
import Anthropic       from "@anthropic-ai/sdk";
import { prisma }      from "@/lib/prisma";
import { redis }       from "@/lib/redis";
import { randomUUID }  from "crypto";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── Tier configuration ───────────────────────────────
const TIER_CONFIG = {
  free:       { model: "claude-haiku-4-5-20251001", dailyLimit: 20,  maxTokens: 500,  streaming: false },
  pro:        { model: "claude-sonnet-4-6",          dailyLimit: 500, maxTokens: 4096, streaming: true  },
  enterprise: { model: "claude-opus-4-8",            dailyLimit: null, maxTokens: 8192, streaming: true }
} as const;

// ─── Rate limiting per tier ───────────────────────────
async function checkUsageLimit(userId: string, tier: keyof typeof TIER_CONFIG) {
  const config = TIER_CONFIG[tier];
  if (!config.dailyLimit) return;  // enterprise: unlimited

  const today   = new Date().toISOString().split("T")[0];
  const key     = `usage:${userId}:${today}`;
  const count   = await redis.incr(key);
  if (count === 1) await redis.expire(key, 86400);  // expire after 24h

  if (count > config.dailyLimit) {
    throw Object.assign(new Error("Daily limit exceeded"), { status: 429 });
  }
}

// ─── Conversation management ──────────────────────────
async function getConversationHistory(conversationId: string) {
  const messages = await prisma.message.findMany({
    where:   { conversationId },
    orderBy: { createdAt: "asc" },
    take:    20  // keep last 20 messages (token budget)
  });

  return messages.map(m => ({
    role:    m.role as "user" | "assistant",
    content: m.content
  }));
}

// ─── Token tracking ───────────────────────────────────
async function trackUsage(
  userId:       string,
  conversationId: string,
  inputTokens:  number,
  outputTokens: number,
  model:        string
) {
  const inputCostPer1M  = model.includes("haiku")  ? 0.80  : model.includes("sonnet") ? 3.00  : 15.00;
  const outputCostPer1M = model.includes("haiku")  ? 4.00  : model.includes("sonnet") ? 15.00 : 75.00;

  const cost = (inputTokens / 1_000_000) * inputCostPer1M +
               (outputTokens / 1_000_000) * outputCostPer1M;

  await prisma.tokenUsage.create({
    data: {
      userId,
      conversationId,
      inputTokens,
      outputTokens,
      model,
      costUsd: cost
    }
  });
}

// ─── Non-streaming chat ───────────────────────────────
export async function chat(
  userId:         string,
  conversationId: string,
  userMessage:    string,
  tier:           keyof typeof TIER_CONFIG = "free"
) {
  const config = TIER_CONFIG[tier];

  // Rate limit
  await checkUsageLimit(userId, tier);

  // Load history
  const history = await getConversationHistory(conversationId);

  // Save user message
  await prisma.message.create({
    data: { conversationId, role: "user", content: userMessage }
  });

  // LLM call
  const response = await client.messages.create({
    model:      config.model,
    max_tokens: config.maxTokens,
    system:     "You are a helpful AI assistant.",
    messages:   [...history, { role: "user", content: userMessage }]
  });

  const assistantText = (response.content[0] as Anthropic.TextBlock).text;

  // Save assistant message
  await prisma.message.create({
    data: { conversationId, role: "assistant", content: assistantText }
  });

  // Track token usage
  await trackUsage(
    userId, conversationId,
    response.usage.input_tokens, response.usage.output_tokens,
    config.model
  );

  return {
    message:       assistantText,
    inputTokens:   response.usage.input_tokens,
    outputTokens:  response.usage.output_tokens
  };
}

// ─── Streaming chat (for Pro/Enterprise) ─────────────
export async function chatStream(
  userId:         string,
  conversationId: string,
  userMessage:    string,
  onChunk:        (text: string) => void,
  tier:           "pro" | "enterprise" = "pro"
) {
  const config = TIER_CONFIG[tier];
  await checkUsageLimit(userId, tier);
  const history = await getConversationHistory(conversationId);

  await prisma.message.create({
    data: { conversationId, role: "user", content: userMessage }
  });

  let fullText = "";
  let inputTokens = 0, outputTokens = 0;

  const stream = await client.messages.stream({
    model:      config.model,
    max_tokens: config.maxTokens,
    system:     "You are a helpful AI assistant.",
    messages:   [...history, { role: "user", content: userMessage }]
  });

  for await (const chunk of stream) {
    if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
      const text = chunk.delta.text;
      fullText += text;
      onChunk(text);  // send chunk to client via SSE
    }
    if (chunk.type === "message_delta" && chunk.usage) {
      outputTokens = chunk.usage.output_tokens;
    }
    if (chunk.type === "message_start" && chunk.message.usage) {
      inputTokens = chunk.message.usage.input_tokens;
    }
  }

  await prisma.message.create({
    data: { conversationId, role: "assistant", content: fullText }
  });
  await trackUsage(userId, conversationId, inputTokens, outputTokens, config.model);

  return { message: fullText, inputTokens, outputTokens };
}

// ─── SSE endpoint (Express) ──────────────────────────
import { Request, Response } from "express";

export async function streamEndpoint(req: Request, res: Response) {
  const { userId, tier } = req.user!;
  const { conversationId, message } = req.body;

  res.setHeader("Content-Type",  "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection",    "keep-alive");
  res.flushHeaders();

  try {
    await chatStream(userId, conversationId, message,
      (chunk) => {
        res.write(`data: ${JSON.stringify({ type: "chunk", text: chunk })}\n\n`);
      },
      tier as "pro" | "enterprise"
    );

    res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
    res.end();
  } catch (err) {
    const error = err as Error & { status?: number };
    res.write(`data: ${JSON.stringify({ type: "error", message: error.message })}\n\n`);
    res.end();
  }
}

// ─── Model routing (cost optimization) ───────────────
const TASK_MODELS = {
  simple_qa:       "claude-haiku-4-5-20251001",   // fast, cheap
  code_generation: "claude-sonnet-4-6",            // balanced
  complex_analysis:"claude-opus-4-8",              // powerful, expensive
  summarization:   "claude-haiku-4-5-20251001",    // cheap enough
  customer_support:"claude-sonnet-4-6"             // good enough
} as const;

async function routeToModel(message: string): Promise<keyof typeof TASK_MODELS> {
  // Use cheap model to classify task type
  const classification = await client.messages.create({
    model:      "claude-haiku-4-5-20251001",
    max_tokens: 20,
    temperature: 0,
    system: "Classify the user's request into one of: simple_qa, code_generation, complex_analysis, summarization, customer_support. Reply with ONLY the category.",
    messages: [{ role: "user", content: message }]
  });

  const task = (classification.content[0] as Anthropic.TextBlock).text.trim() as keyof typeof TASK_MODELS;
  return TASK_MODELS[task] ? task : "simple_qa";
}
```

---

## Evaluation and Monitoring

```typescript
// Evaluate response quality (automated)
async function evaluateResponse(
  question: string,
  answer:   string,
  context?: string
) {
  const evalResult = await client.messages.create({
    model:      "claude-haiku-4-5-20251001",
    max_tokens: 256,
    temperature: 0,
    system: `You are an AI quality evaluator. Score responses on:
    - Relevance (0-5): Does the answer address the question?
    - Accuracy (0-5): Is the information correct?
    - Completeness (0-5): Is the answer complete?
    - Tone (0-5): Is the tone appropriate?
    Respond with ONLY valid JSON: { "relevance": N, "accuracy": N, "completeness": N, "tone": N, "overall": N }`,
    messages: [{
      role:    "user",
      content: `Question: ${question}\nAnswer: ${answer}${context ? `\nContext: ${context}` : ""}`
    }]
  });

  return JSON.parse((evalResult.content[0] as Anthropic.TextBlock).text);
}

// Log AI quality metrics
async function logQualityMetrics(userId: string, sessionId: string, scores: Record<string, number>) {
  await prisma.aiQualityLog.create({
    data: { userId, sessionId, scores, createdAt: new Date() }
  });

  // Alert if quality drops
  if (scores.overall < 3) {
    await alertOpsTeam(`Low AI quality score: ${JSON.stringify(scores)} for user ${userId}`);
  }
}
```

---

## Interview Preparation

**Q1: How do you manage token costs in a multi-tenant AI SaaS?**
A: Key strategies: 1) Model routing: classify user intent with a cheap model (Haiku, $0.80/1M tokens), route complex tasks to expensive model (Opus, $15/1M). Most requests are simple → 80% cost reduction. 2) Prompt caching: cache large static system prompts (Anthropic ephemeral caching → 90% cost reduction on system prompt tokens). 3) Context management: limit conversation history to last 10-20 messages. Summarize old messages instead of sending full history. 4) Tier-based limits: free users get limited messages per day, pro users more, enterprise unlimited — but all routed through cost-optimized models. 5) Response caching: cache identical queries in Redis. 6) Output length limits: set max_tokens per tier. 7) Track cost per user: build billing/metering dashboard, alert on anomalies.

**Q2: How do you handle streaming responses in a Node.js API?**
A: Streaming uses Server-Sent Events (SSE) for unidirectional server-to-client streaming: 1) Set response headers: Content-Type: text/event-stream, Cache-Control: no-cache, Connection: keep-alive. 2) Use Anthropic's stream API: `client.messages.stream(...)` returns an async iterator. 3) For each chunk, write `data: {json}\n\n` to the response. 4) Send a final `data: {"type": "done"}\n\n` to signal completion. Client-side: use `EventSource` API (browser) or custom fetch with ReadableStream. Handle errors: if the stream fails mid-way, send an error event. Persistence: save the complete response to the database after streaming completes (not during).

---

## Cheat Sheet

```
AI SaaS cost optimization:
  Model routing:      classify task → use cheapest model that works
  Prompt caching:     cache static system prompts (90% off on cache hit)
  Context limits:     max 20 messages history, summarize older
  Response caching:   Redis TTL for identical questions
  Tier limits:        free 20/day, pro 500/day, enterprise unlimited

SSE streaming pattern:
  res.setHeader("Content-Type", "text/event-stream")
  res.setHeader("Cache-Control", "no-cache")
  for await (const chunk of stream) {
    res.write(`data: ${JSON.stringify({text: chunk})}\n\n`)
  }
  res.write(`data: ${JSON.stringify({done: true})}\n\n`)
  res.end()

Model pricing (approx, check latest):
  Haiku 4:    $0.80/1M in, $4/1M out    → classification, simple QA
  Sonnet 4.6: $3/1M in,  $15/1M out    → most use cases
  Opus 4:     $15/1M in, $75/1M out    → complex reasoning only

Business metrics to track:
  Cost per message/user/month
  Token usage by model tier
  Response quality scores
  Cache hit rate
  P95 latency per model
  Error rate (4xx, 5xx, model errors)
```
