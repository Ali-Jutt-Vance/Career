# Phase 8 — Chapter 4: Retrieval-Augmented Generation (RAG)

---

## Chapter Overview

RAG (Retrieval-Augmented Generation) is the technique of augmenting an LLM's knowledge by retrieving relevant documents from a knowledge base and providing them as context. It solves two key LLM limitations: knowledge cutoff dates and hallucination.

**Topics:**
- Basic RAG pipeline (index → retrieve → augment → generate)
- Document ingestion and preprocessing
- Retrieval strategies (semantic, keyword, hybrid)
- Context assembly and prompting
- RAG evaluation metrics (faithfulness, relevance, groundedness)
- Advanced RAG (reranking, HyDE, multi-query)
- Production considerations

---

## Core Concepts

### The RAG Pipeline

```
RAG = Index + Retrieve + Augment + Generate

──── INDEXING (offline, done once) ────
  1. Load documents (PDFs, HTML, databases, APIs)
  2. Preprocess: extract text, clean, normalize
  3. Chunk: split into semantically meaningful pieces
  4. Embed: convert each chunk → vector
  5. Store: save vectors + metadata in vector DB
  6. Repeat when documents update

──── RETRIEVAL + GENERATION (online, per query) ────
  1. User asks question
  2. Embed the question → query vector
  3. Search vector DB for top-K similar chunks
  4. (Optional) Rerank retrieved chunks
  5. Assemble context: combine retrieved chunks
  6. Augmented prompt = system + retrieved context + user question
  7. LLM generates answer grounded in context
  8. Return answer (optionally with citations)

Why RAG beats fine-tuning for knowledge:
  Fine-tuning: knowledge baked in, can't update without retraining.
  RAG: update the vector DB, knowledge updated immediately.
  RAG is also cheaper and faster to iterate on.
```

---

## Code Examples

### Complete RAG Pipeline

```typescript
import Anthropic  from "@anthropic-ai/sdk";
import { Pool }   from "pg";
import VoyageAI   from "@anthropic-ai/voyageai";
import { parse }  from "pdf-parse";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const voyage = new VoyageAI({ apiKey: process.env.VOYAGE_API_KEY });
const db     = new Pool({ connectionString: process.env.DATABASE_URL });

// ─── 1. Ingestion ─────────────────────────────────────
async function ingestDocument(source: {
  content:  string;
  title:    string;
  url?:     string;
  docType:  string;
}) {
  const chunks = splitIntoChunks(source.content, 400, 50);

  const embeddings = await voyage.embed({
    model:     "voyage-3",
    input:     chunks,
    inputType: "document"
  });

  const rows = chunks.map((chunk, i) => ({
    content:   chunk,
    embedding: embeddings.data![i].embedding!,
    metadata:  { title: source.title, url: source.url, docType: source.docType, chunkIndex: i }
  }));

  await db.query(
    "INSERT INTO rag_chunks (content, embedding, metadata) SELECT * FROM unnest($1::text[], $2::vector[], $3::jsonb[])",
    [
      rows.map(r => r.content),
      rows.map(r => `[${r.embedding.join(",")}]`),
      rows.map(r => JSON.stringify(r.metadata))
    ]
  );
}

// Text chunking with overlap
function splitIntoChunks(text: string, words: number, overlap: number): string[] {
  const wordList = text.split(/\s+/);
  const chunks: string[] = [];
  for (let i = 0; i < wordList.length; i += words - overlap) {
    chunks.push(wordList.slice(i, i + words).join(" "));
  }
  return chunks.filter(c => c.trim().length > 20);
}

// ─── 2. Retrieval ─────────────────────────────────────
interface RetrievedChunk {
  id:         string;
  content:    string;
  metadata:   Record<string, any>;
  similarity: number;
}

async function retrieve(query: string, topK = 5): Promise<RetrievedChunk[]> {
  const embedResponse = await voyage.embed({
    model:     "voyage-3",
    input:     [query],
    inputType: "query"  // IMPORTANT: use "query" type for search queries
  });
  const queryEmbedding = embedResponse.data![0].embedding!;

  const { rows } = await db.query<RetrievedChunk>(`
    SELECT
      id,
      content,
      metadata,
      1 - (embedding <=> $1) AS similarity
    FROM rag_chunks
    WHERE 1 - (embedding <=> $1) > 0.7   -- minimum similarity threshold
    ORDER BY embedding <=> $1
    LIMIT $2
  `, [`[${queryEmbedding.join(",")}]`, topK]);

  return rows;
}

// ─── 3. Reranking (optional but recommended) ──────────
async function rerank(query: string, chunks: RetrievedChunk[]): Promise<RetrievedChunk[]> {
  // Voyage AI reranking: more accurate than embedding similarity alone
  const rerankResponse = await voyage.rerank({
    model:   "rerank-2",
    query,
    documents: chunks.map(c => c.content),
    topK:    3
  });

  return rerankResponse.data!.map(r => ({
    ...chunks[r.index],
    similarity: r.relevanceScore
  }));
}

// ─── 4. Generate ──────────────────────────────────────
interface RAGResponse {
  answer:   string;
  sources:  Array<{ title: string; url?: string; excerpt: string }>;
  usage:    { inputTokens: number; outputTokens: number };
}

async function ragQuery(userQuestion: string): Promise<RAGResponse> {
  // Retrieve + rerank
  let chunks = await retrieve(userQuestion, 10);
  chunks     = await rerank(userQuestion, chunks);

  if (chunks.length === 0) {
    return {
      answer:  "I don't have information about that in my knowledge base.",
      sources: [],
      usage:   { inputTokens: 0, outputTokens: 0 }
    };
  }

  // Build context string
  const context = chunks.map((chunk, i) =>
    `[Document ${i + 1}: ${chunk.metadata.title}]\n${chunk.content}`
  ).join("\n\n---\n\n");

  // Generate with grounded prompt
  const response = await client.messages.create({
    model:      "claude-sonnet-4-6",
    max_tokens: 1024,
    temperature: 0,
    system: `You are a helpful assistant that answers questions based ONLY on the provided context documents.

Rules:
- Only use information from the provided context documents
- If the answer is not in the context, say: "I don't have enough information to answer that."
- Never make up information not in the context
- When citing information, mention which document it came from
- Be concise and accurate`,
    messages: [{
      role:    "user",
      content: `Context documents:\n\n${context}\n\n---\n\nQuestion: ${userQuestion}`
    }]
  });

  const answer = (response.content[0] as Anthropic.TextBlock).text;

  return {
    answer,
    sources: chunks.map(c => ({
      title:   c.metadata.title,
      url:     c.metadata.url,
      excerpt: c.content.slice(0, 150) + "..."
    })),
    usage: {
      inputTokens:  response.usage.input_tokens,
      outputTokens: response.usage.output_tokens
    }
  };
}

// ─── Advanced: Multi-Query RAG ────────────────────────
// Generate multiple query variations to improve recall
async function multiQueryRetrieve(originalQuery: string): Promise<RetrievedChunk[]> {
  const queryExpansion = await client.messages.create({
    model:      "claude-haiku-4-5-20251001",
    max_tokens: 256,
    temperature: 0,
    system: "Generate 3 alternative phrasings of the user's question to improve search recall. Output JSON: { 'queries': [q1, q2, q3] }",
    messages: [{ role: "user", content: originalQuery }]
  });

  const { queries } = JSON.parse(
    (queryExpansion.content[0] as Anthropic.TextBlock).text
  );

  // Retrieve for all queries in parallel
  const allResults = await Promise.all(
    [originalQuery, ...queries].map(q => retrieve(q, 5))
  );

  // Deduplicate by ID
  const seen = new Set<string>();
  const deduped: RetrievedChunk[] = [];
  for (const results of allResults) {
    for (const chunk of results) {
      if (!seen.has(chunk.id)) {
        seen.add(chunk.id);
        deduped.push(chunk);
      }
    }
  }

  return deduped;
}

// ─── Advanced: HyDE (Hypothetical Document Embeddings) ─
// Generate a hypothetical answer, embed it, use that for retrieval
async function hydeRetrieve(query: string): Promise<RetrievedChunk[]> {
  const hypotheticalDoc = await client.messages.create({
    model:      "claude-haiku-4-5-20251001",
    max_tokens: 300,
    temperature: 0.3,
    system: "Write a concise hypothetical passage that would answer the user's question. Use factual, authoritative language.",
    messages: [{ role: "user", content: query }]
  });

  const hypothesis = (hypotheticalDoc.content[0] as Anthropic.TextBlock).text;

  // Use the hypothetical document for retrieval (often more precise)
  return retrieve(hypothesis, 5);
}
```

---

## RAG Evaluation

```
Metrics for evaluating RAG quality (use frameworks: RAGAS, TruLens):

1. Faithfulness:
   Does the answer contain only information from the retrieved context?
   High faithfulness = low hallucination.
   Test: ask model to rate if each claim is supported by context.

2. Answer Relevance:
   Does the answer actually address the question?
   Test: generate questions from the answer, check similarity to original question.

3. Context Recall:
   Did retrieval bring back the right chunks?
   Test: with golden dataset — do retrieved chunks contain the answer?

4. Context Precision:
   Of the retrieved chunks, what fraction were actually relevant?
   Low precision → LLM gets noisy, off-topic context.

Common failure modes:
  Retrieval misses: the right chunk is in the DB but not retrieved.
    Fix: more chunks (top-20 before reranking), better embeddings, lower threshold.
  
  Wrong chunks retrieved: semantic match is misleading.
    Fix: hybrid search (add keyword), reranking, better chunking.
  
  Context too long: LLM ignores middle of context ("Lost in the Middle" problem).
    Fix: put most relevant chunks first and last, rerank + filter top 3.
  
  Hallucination despite context: LLM doesn't stick to context.
    Fix: stronger system prompt, temperature=0, explicit "only use context" instruction.
```

---

## Interview Preparation

**Q1: When should you use RAG vs. fine-tuning?**
A: RAG: better when knowledge needs to be updated frequently, when you need to retrieve from large external knowledge bases, when you need citations/sourcing, when you want to keep proprietary data separate from the model. Cheaper and faster to update — just re-index documents. Fine-tuning: better when you need the model to learn a specific style, tone, or output format. When you have a very specific domain with specialized terminology the base model doesn't know. When latency is critical and you want shorter prompts (fine-tuned model needs less instruction). General rule: try RAG first. RAG solves the knowledge problem. Fine-tune if RAG fails and the issue is style/format, not knowledge.

**Q2: What is the "Lost in the Middle" problem in RAG?**
A: Research (Liu et al., 2023) shows that LLMs perform best when relevant information is at the very beginning or very end of the context window. When relevant chunks are placed in the middle of a long context, models often miss them. Impact on RAG: if you retrieve 20 chunks and stuff them all in, the most relevant one might be in the middle and the model may ignore it. Solutions: rerank and select only top 3-5 most relevant chunks; place the most relevant chunk first (or last); use a smaller context window to force fewer chunks; use models with better long-context handling (Claude is particularly good at this with its attention mechanism).

---

## Practical Tasks

### Beginner (10 Tasks)
1. Set up pgvector with a documents table.
2. Embed 10 sample text chunks.
3. Build a simple semantic search function.
4. Add minimum similarity threshold (> 0.7).
5. Build a RAG query function with system prompt.
6. Test with a simple Q&A document.
7. Add metadata filtering (document type).
8. Return sources alongside the answer.
9. Count tokens used per query.
10. Test with a question not in the knowledge base.

### Intermediate (10 Tasks)
1. Build a PDF ingestion pipeline.
2. Implement recursive text splitting with overlap.
3. Add hybrid search (vector + BM25 keyword).
4. Implement Voyage AI reranking.
5. Build multi-query expansion for better recall.
6. Add streaming response for long answers.
7. Implement answer caching (same question → cached answer).
8. Build a citation extractor from the model's output.
9. Measure retrieval quality with precision@K.
10. Add chunk-level metadata (page number, section title).

### Advanced (10 Tasks)
1. Implement HyDE for improved retrieval precision.
2. Build a RAG evaluation pipeline with RAGAS.
3. Implement GraphRAG (knowledge graph + vector search).
4. Build an ingestion pipeline for 100K documents.
5. Implement incremental re-indexing (only update changed docs).
6. Build a conversational RAG (multi-turn with memory).
7. Implement adaptive retrieval (adjust topK based on query type).
8. Build a RAG system with structured output (tables, code).
9. Implement parent-child chunking (fine-grained retrieval, full section return).
10. Build a RAG-powered AI assistant deployed on AWS.

---

## Cheat Sheet

```
RAG pipeline:
  Offline: Load → Chunk → Embed → Store in vector DB
  Online: Embed query → Retrieve top-K → Rerank → LLM → Answer + Sources

Chunking defaults:
  200-400 tokens per chunk, 50-100 token overlap
  Split at paragraph/sentence boundaries

Retrieval defaults:
  Retrieve top 10, rerank → keep top 3-5
  Minimum similarity threshold: 0.7

Prompt pattern:
  System: "Answer ONLY from the provided context. If not in context, say so."
  User: "Context:\n{chunks}\n\nQuestion: {query}"

Temperature:
  RAG tasks: temperature=0 (minimize hallucination)

Advanced techniques:
  Multi-query: generate 3 query variants, union results
  HyDE:        generate hypothetical answer, use it as query
  Reranking:   Voyage rerank-2 or Cohere Rerank
  Parent-doc:  retrieve small chunks, return full parent section
  RAG fusion:  multiple retrieval passes, reciprocal rank fusion

Evaluation:
  Faithfulness:   answer claims supported by context?
  Relevance:      answer addresses the question?
  Context recall: right chunks retrieved?
```
