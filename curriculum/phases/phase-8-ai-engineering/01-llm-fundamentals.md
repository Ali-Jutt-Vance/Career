# Phase 8 — Chapter 1: LLM Fundamentals

---

## Chapter Overview

Large Language Models (LLMs) are foundation models trained on vast text corpora that can generate, understand, and reason about text. They power ChatGPT, Claude, Gemini, and virtually all modern AI applications. Understanding their internals is essential for building reliable AI systems.

**Topics:**
- What LLMs are (transformer architecture, high level)
- Tokens, context windows, and token budgets
- Temperature, top-p, and sampling parameters
- Training vs. inference
- Fine-tuning vs. prompting
- Model families and their trade-offs
- Key limitations (hallucination, context limits, cutoff dates)

---

## Core Concepts

### The Transformer Architecture (High Level)

```
LLM = large neural network trained to predict the next token.
Trained on: books, web pages, code, papers (trillions of tokens).

Key components:
  Tokenizer:    Text → tokens (subword pieces: "running" → ["run", "##ning"])
  Embedding:    Each token → vector (location in semantic space)
  Attention:    Each token "attends to" all other tokens in context
                → learns relationships between words
  Transformer:  Stack of N attention layers → outputs probability distribution
                over next token
  Sampling:     Pick next token from distribution (temperature controls randomness)
  Repeat:       Generate one token at a time until stop condition

"Predicts next token" → but with enough scale:
  Learns grammar, facts, reasoning, coding, mathematics.
  Emergent capabilities appear at large scale (grokking).

Parameters:
  GPT-3:       175B parameters
  GPT-4:       ~1.7T (rumored MoE)
  Claude Sonnet: undisclosed
  Llama 3.3:   70B
  More parameters ≠ always better (training quality matters more)
```

### Tokens

```
Token: the unit LLMs process. NOT individual characters.

Rough rules:
  1 token ≈ 4 characters (English)
  1 token ≈ ¾ word
  100 tokens ≈ 75 words ≈ 1 short paragraph

Examples:
  "Hello, world!"    → ["Hello", ",", " world", "!"] = 4 tokens
  "const x = 42;"   → ["const", " x", " =", " 42", ";"] = 5 tokens
  "ChatGPT"          → ["Chat", "GPT"] = 2 tokens

Context window: maximum tokens in ONE conversation (input + output).
  GPT-3.5:    16K tokens (~12K words)
  GPT-4o:     128K tokens
  Claude 3.7: 200K tokens
  Gemini 1.5: 1M+ tokens

Token count matters:
  Cost: priced per 1M input/output tokens
  Latency: more tokens → slower response
  Memory: model holds entire context in GPU memory

Token counting:
  npm install tiktoken
  import { encoding_for_model } from "tiktoken";
  const enc = encoding_for_model("gpt-4o");
  const count = enc.encode("Hello world").length;
```

### Sampling Parameters

```
Temperature (0.0 – 2.0):
  Controls randomness of output.
  0.0:   deterministic (always picks highest probability token)
         → use for: code generation, data extraction, structured output
  0.5:   slightly creative
  1.0:   balanced (GPT-4 default)
  1.5+:  very creative, unpredictable, often incoherent
  Rule:  lower = more accurate, higher = more creative

Top-P (0.0 – 1.0) [nucleus sampling]:
  Consider only tokens whose cumulative probability ≥ P.
  0.1: very focused (top 10% of probability mass)
  0.9: wide range (most tokens eligible)
  Usually: use Temperature OR Top-P, not both at max.
  OpenAI recommends: keep top_p = 1, adjust temperature.

Max tokens:
  Hard cap on response length.
  Set low for: yes/no answers, labels.
  Set high for: code, essays, analysis.

Stop sequences:
  ["###", "\n\n"] — stop generating at these strings.
  Useful: in structured prompts to stop at delimiter.
```

---

## Model Families

```
OpenAI:
  GPT-4o:         multimodal (text+vision), 128K context, fast
  o1 / o3:        "thinking" models, chain-of-thought reasoning, math/coding
  GPT-4o-mini:    cheap, fast, good for simple tasks

Anthropic:
  Claude Opus 4:   most capable, slower, expensive
  Claude Sonnet 4: best price/performance balance (this model)
  Claude Haiku 4:  fastest, cheapest (simple tasks)
  Strength:        long context (200K), instruction following, safety

Google:
  Gemini 2.0 Flash: fast, 1M context, multimodal, cheap
  Gemini 1.5 Pro:   strong on long documents, video

Meta (Open Source):
  Llama 3.3 70B:    best open-source model, run locally
  Llama 3.2 Vision: vision capabilities
  Can run on: Ollama, vLLM, AWS Bedrock

Mistral (Open Source):
  Mistral 7B:      fast, runs on consumer hardware
  Mixtral 8x7B:    MoE, ~46B total params but routes to 2 at a time

Selection guide:
  Need cheapest:               Haiku 4, GPT-4o-mini, Gemini Flash
  Need best reasoning:         o3, Opus 4
  Need long context (PDF):     Claude (200K), Gemini (1M)
  Need open/on-prem:           Llama 3.3 70B
  Need multimodal:             GPT-4o, Gemini, Claude (all support vision now)
  Need code:                   all top models, Claude specializes
```

---

## Key Limitations

```
1. Hallucination
   LLMs generate plausible-sounding but incorrect information.
   Cause: next-token prediction with no grounding in truth.
   Examples: wrong dates, invented citations, fake APIs.
   Mitigations:
     - RAG: give model actual facts in context
     - Grounding: ask model to cite sources
     - Self-consistency: run multiple times, compare
     - Temperature=0: more deterministic, less creative hallucination
     - Structured output: constrained JSON format limits hallucination

2. Context Window Limit
   Can't process more than the context window.
   Large PDFs (1,000 pages) exceed even 200K context.
   Mitigations:
     - Chunking + RAG (retrieve only relevant chunks)
     - Hierarchical summarization
     - Map-reduce: process chunks individually, combine

3. Knowledge Cutoff
   Model trained up to a date (GPT-4o: April 2024).
   Doesn't know recent events.
   Mitigations:
     - RAG with current data
     - Tool use: web search, databases
     - Tell the model the current date in system prompt

4. No Persistent Memory
   Each conversation starts fresh (no memory across sessions).
   Mitigations:
     - Store conversation summary in DB
     - Inject summary at start of new session
     - Vector DB for semantic memory retrieval

5. Token Cost
   Long contexts = expensive.
   100K tokens × 100 requests/day × $3/1M input = $30/day per user
   Mitigations:
     - Cache responses (Redis)
     - Use smaller/cheaper model for simple tasks
     - Compress context: summarize history, filter irrelevant turns
```

---

## Code Examples

### Basic API Call (Anthropic)

```typescript
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Simple completion
const message = await client.messages.create({
  model:      "claude-sonnet-4-6",
  max_tokens: 1024,
  system:     "You are a senior software engineer. Be concise and precise.",
  messages: [
    { role: "user", content: "Explain what a closure is in JavaScript in 3 sentences." }
  ]
});

console.log(message.content[0].type === "text" ? message.content[0].text : "");
console.log(`Tokens used: ${message.usage.input_tokens} in, ${message.usage.output_tokens} out`);

// With temperature
const creative = await client.messages.create({
  model:      "claude-sonnet-4-6",
  max_tokens: 2048,
  temperature: 0.7,
  messages: [{
    role:    "user",
    content: "Write a blog post intro about TypeScript."
  }]
});

// Structured output via JSON extraction
const structured = await client.messages.create({
  model:      "claude-sonnet-4-6",
  max_tokens: 512,
  temperature: 0,
  system: "Always respond with valid JSON only. No explanation.",
  messages: [{
    role:    "user",
    content: `Extract the following from this text as JSON:
    { "name": string, "age": number, "email": string }
    Text: "Hi, I'm John Doe, 28 years old. Contact me at john@example.com"`
  }]
});

const data = JSON.parse(
  structured.content[0].type === "text" ? structured.content[0].text : "{}"
);

// Count tokens before sending
import Anthropic from "@anthropic-ai/sdk";
const tokenResponse = await client.messages.countTokens({
  model:    "claude-sonnet-4-6",
  messages: [{ role: "user", content: "Hello world" }]
});
console.log(`Token count: ${tokenResponse.input_tokens}`);
```

---

## Interview Preparation

**Q1: What is a hallucination in LLMs and how do you prevent it in production?**
A: Hallucination: the model generates confident, fluent text that is factually incorrect. Examples: citing a paper that doesn't exist, using an API method that isn't real, stating a wrong date as fact. Root cause: the model optimizes for plausibility (next token prediction), not truth. Prevention strategies: 1) RAG (Retrieval-Augmented Generation): inject verified facts from a database into the prompt. Model can only cite what you gave it. 2) Temperature = 0 for factual tasks — deterministic reduces creative fabrication. 3) Structured output: constrain responses to JSON schema — hard to hallucinate field names when they're specified. 4) Citation requirement: "only make claims you can cite from the provided documents." 5) Self-consistency: run 3 times, take majority vote. 6) Human-in-the-loop: for high-stakes outputs, require human review.

**Q2: What is the difference between fine-tuning and prompting?**
A: Prompting: guide the model's behavior through instructions, examples (few-shot), and system prompts — without changing model weights. Fast, cheap, reversible. Works for most use cases (style, format, persona). Fine-tuning: further train the model on your specific data, updating weights. Creates a specialized model. Use when: the task is too specific for prompting (e.g., proprietary domain terminology), you need consistent format/style the model doesn't get from prompting, latency — shorter prompts post fine-tune, cost — shorter system prompt at scale. Fine-tuning is expensive, requires labeled data, and creates a frozen snapshot (needs re-training to update). Rule: always try prompting first. Fine-tune only if prompting consistently fails.

---

## Cheat Sheet

```
Model selection:
  Cheap/fast:        Haiku 4, GPT-4o-mini, Gemini Flash
  Best reasoning:    o3, Claude Opus 4
  Long context:      Claude (200K), Gemini (1M)
  Open source:       Llama 3.3 70B (via Ollama)
  Code:              Claude Sonnet, GPT-4o

Parameters:
  temperature=0:    deterministic (code, data extraction)
  temperature=0.7:  balanced creative
  temperature=1.5+: very creative (poetry, brainstorming)
  max_tokens:       cap response length
  stop: ["###"]     stop at delimiter

Token math:
  1 token ≈ 4 chars ≈ 0.75 words
  1K tokens ≈ 750 words ≈ 3 paragraphs
  Cost: charged per 1M tokens (input + output separately)

Limitations checklist:
  Hallucination → use RAG + temperature=0
  Cutoff date → inject current date + RAG
  No memory → summarize + store in DB
  Token cost → cache + smaller model for simple tasks
  Context limit → chunk + retrieve relevant parts only
```
