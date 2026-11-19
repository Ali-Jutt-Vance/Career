# Phase 8 — Chapter 3: Embeddings and Vector Databases

---

## Chapter Overview

Embeddings are numerical vector representations of text, images, or code that capture semantic meaning. Vector databases store and search these embeddings efficiently. Together, they power semantic search, RAG (Retrieval-Augmented Generation), and recommendation systems.

**Topics:**
- What embeddings are and how they work
- Embedding models (text-embedding-3, voyage-3, all-MiniLM)
- Similarity search (cosine similarity, dot product)
- Vector databases (Pinecone, Weaviate, pgvector, Qdrant, Chroma)
- Indexing strategies (HNSW, IVF)
- Chunking strategies for documents
- Building semantic search

---

## Core Concepts

### Embeddings

```
Embedding: a dense vector (list of floats) representing meaning.
  "The cat sat on the mat" → [0.12, -0.85, 0.33, 0.71, ...]
  (typically 1,536 dims for OpenAI, 1,024 for Voyage, 384 for MiniLM)

Key property: semantically similar text → close in vector space.
  "dog" and "puppy" → close vectors
  "dog" and "airplane" → far vectors
  "The president signed the bill" and "The law was approved" → close

This enables:
  Semantic search: find documents about "dogs" even if query says "canines"
  Clustering: group similar documents
  Recommendation: find similar items
  Anomaly detection: unusual items are far from cluster centers
  RAG: retrieve relevant chunks for a user's question
```

### Similarity Metrics

```
Cosine similarity: angle between two vectors (most common)
  cos(θ) = (A · B) / (|A| × |B|)
  Range: -1 (opposite) to 1 (identical)
  Use when: embeddings not unit-normalized

Dot product (inner product):
  A · B = sum(a_i × b_i)
  Faster than cosine. Equivalent to cosine if vectors are normalized.
  Most embedding models return normalized vectors → use dot product.

Euclidean distance (L2):
  sqrt(sum((a_i - b_i)²))
  Use when: exact spatial distance matters (less common for text)

Practical guide:
  OpenAI embeddings: use cosine or dot product (models are normalized)
  Sentence transformers: cosine similarity
  For vector DB queries: check which metric the index was built with
```

---

## Embedding Models

```
OpenAI text-embedding-3-small:
  Dimensions: 1,536 (or truncated to 256/512/1024)
  Great for: English, general purpose
  Cost: $0.02/1M tokens (very cheap)
  Latency: 100-200ms per batch

OpenAI text-embedding-3-large:
  Dimensions: 3,072
  Better for complex tasks, multilingual
  Cost: $0.13/1M tokens

Voyage AI (voyage-3):
  Dimensions: 1,024
  Best general performance (often beats OpenAI in benchmarks)
  Recommended by Anthropic for use with Claude
  $0.06/1M tokens

sentence-transformers (local, free):
  all-MiniLM-L6-v2:     384 dims, very fast, decent quality
  all-mpnet-base-v2:    768 dims, high quality
  No API cost. Run locally with Python/HuggingFace.
  npm: @xenova/transformers (runs in Node.js/browser via ONNX)

Cohere embed-v3:
  1,024 dims, multilingual, good for retrieval
  Input type parameter: search_document vs search_query (important!)
```

---

## Vector Databases

```
pgvector (PostgreSQL extension):
  + Free, already in your Postgres DB, no new infrastructure
  + SQL queries, ACID, join with other tables
  - Slower than purpose-built (but fast enough for <10M vectors)
  Use: existing PostgreSQL setup, want simplicity

Pinecone (managed cloud):
  + No infrastructure management, fully managed
  + Scales to billions of vectors
  + Filtered metadata search
  - Cost: $70+/month for production
  Use: production, need scale, don't want to manage infra

Qdrant (open source + cloud):
  + Free self-host, very fast, HNSW indexing
  + Payload filtering, named vectors, large dataset support
  + Docker-based local dev
  Use: self-hosted, privacy-first, cost-sensitive

Weaviate (open source + cloud):
  + Hybrid search (vector + keyword BM25)
  + GraphQL API, multi-modal
  Use: need hybrid search, multi-modal embeddings

Chroma (open source):
  + Easiest to use for prototyping
  + In-memory or persistent (SQLite-backed)
  + Python and JS clients
  Use: local development, RAG prototyping
```

---

## Code Examples

### Generating Embeddings

```typescript
import OpenAI   from "openai";
import VoyageAI from "@anthropic-ai/voyageai";

const openai  = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const voyage  = new VoyageAI({ apiKey: process.env.VOYAGE_API_KEY });

// ─── Generate embeddings ──────────────────────────────
export async function embedWithOpenAI(text: string | string[]): Promise<number[][]> {
  const input = Array.isArray(text) ? text : [text];
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input,
    dimensions: 1536
  });
  return response.data.map(d => d.embedding);
}

export async function embedWithVoyage(
  texts: string[],
  inputType: "query" | "document" = "document"
): Promise<number[][]> {
  const response = await voyage.embed({
    model:     "voyage-3",
    input:     texts,
    inputType  // IMPORTANT: use "query" for search queries, "document" for indexed chunks
  });
  return response.data!.map(d => d.embedding!);
}

// ─── Cosine similarity ────────────────────────────────
function cosineSimilarity(a: number[], b: number[]): number {
  const dot     = a.reduce((sum, ai, i) => sum + ai * b[i], 0);
  const magA    = Math.sqrt(a.reduce((sum, ai) => sum + ai * ai, 0));
  const magB    = Math.sqrt(b.reduce((sum, bi) => sum + bi * bi, 0));
  return dot / (magA * magB);
}
```

### pgvector Semantic Search

```typescript
import { Pool } from "pg";

const db = new Pool({ connectionString: process.env.DATABASE_URL });

// Setup pgvector
await db.query("CREATE EXTENSION IF NOT EXISTS vector");
await db.query(`
  CREATE TABLE IF NOT EXISTS documents (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content     TEXT NOT NULL,
    metadata    JSONB DEFAULT '{}',
    embedding   vector(1536),
    created_at  TIMESTAMPTZ DEFAULT NOW()
  )
`);
// HNSW index: fast approximate nearest neighbor search
await db.query(`
  CREATE INDEX IF NOT EXISTS documents_embedding_idx
  ON documents USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64)
`);

// Insert documents with embeddings
export async function indexDocument(content: string, metadata: object) {
  const [embedding] = await embedWithOpenAI(content);
  
  await db.query(
    "INSERT INTO documents (content, metadata, embedding) VALUES ($1, $2, $3)",
    [content, JSON.stringify(metadata), `[${embedding.join(",")}]`]
  );
}

// Semantic search
export async function semanticSearch(query: string, limit = 5) {
  const [queryEmbedding] = await embedWithOpenAI(query);
  
  const { rows } = await db.query(`
    SELECT
      id,
      content,
      metadata,
      1 - (embedding <=> $1) AS similarity
    FROM documents
    ORDER BY embedding <=> $1   -- cosine distance (smaller = more similar)
    LIMIT $2
  `, [`[${queryEmbedding.join(",")}]`, limit]);

  return rows;
}

// Hybrid search: vector + keyword
export async function hybridSearch(query: string, limit = 5) {
  const [queryEmbedding] = await embedWithOpenAI(query);

  const { rows } = await db.query(`
    WITH semantic AS (
      SELECT id, content, metadata,
             1 - (embedding <=> $1) AS vector_score
      FROM documents
      ORDER BY embedding <=> $1
      LIMIT 20
    ),
    keyword AS (
      SELECT id, ts_rank(to_tsvector('english', content),
                         plainto_tsquery('english', $2)) AS text_score
      FROM documents
      WHERE to_tsvector('english', content) @@ plainto_tsquery('english', $2)
    )
    SELECT s.id, s.content, s.metadata,
           (0.7 * s.vector_score + 0.3 * COALESCE(k.text_score, 0)) AS combined_score
    FROM semantic s
    LEFT JOIN keyword k ON s.id = k.id
    ORDER BY combined_score DESC
    LIMIT $3
  `, [`[${queryEmbedding.join(",")}]`, query, limit]);

  return rows;
}
```

### Chunking Strategies

```typescript
// ─── Fixed-size chunking (simple) ────────────────────
function fixedSizeChunks(text: string, chunkSize = 500, overlap = 50): string[] {
  const words  = text.split(/\s+/);
  const chunks: string[] = [];

  for (let i = 0; i < words.length; i += chunkSize - overlap) {
    chunks.push(words.slice(i, i + chunkSize).join(" "));
  }
  return chunks;
}

// ─── Recursive text splitting (LangChain-style) ──────
function recursiveSplit(text: string, maxChars = 1000, overlap = 100): string[] {
  const separators = ["\n\n", "\n", ". ", " "];

  for (const sep of separators) {
    const parts = text.split(sep);
    if (parts.every(p => p.length <= maxChars)) {
      return mergeChunks(parts, sep, maxChars, overlap);
    }
  }
  // Fallback: hard split by character
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += maxChars - overlap) {
    chunks.push(text.slice(i, i + maxChars));
  }
  return chunks;
}

function mergeChunks(parts: string[], sep: string, maxChars: number, overlap: number) {
  const chunks: string[] = [];
  let current = "";

  for (const part of parts) {
    if ((current + sep + part).length > maxChars && current) {
      chunks.push(current);
      current = current.slice(-overlap) + sep + part;
    } else {
      current = current ? current + sep + part : part;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

// ─── Semantic chunking (split at topic boundaries) ───
async function semanticChunking(sentences: string[], threshold = 0.4): Promise<string[]> {
  const embeddings = await embedWithOpenAI(sentences);
  const chunks: string[] = [];
  let current = [sentences[0]];

  for (let i = 1; i < sentences.length; i++) {
    const similarity = cosineSimilarity(embeddings[i - 1], embeddings[i]);
    if (similarity < threshold) {
      // Topic shift: start new chunk
      chunks.push(current.join(" "));
      current = [sentences[i]];
    } else {
      current.push(sentences[i]);
    }
  }
  if (current.length > 0) chunks.push(current.join(" "));
  return chunks;
}
```

---

## Interview Preparation

**Q1: How do you choose chunk size for embedding a document?**
A: Chunk size is one of the most impactful RAG parameters. Too small: chunks lack context, retrieved chunks may be sentences without surrounding meaning. Too large: less precision (relevant sentence buried in large chunk), more tokens per retrieved chunk (higher LLM cost). Common strategies: fixed size with overlap (500-1000 words, 10-20% overlap) — simple, works for most prose. Paragraph/section splitting — split at natural boundaries (double newlines, section headers) — better for structured docs. Sentence splitting — fine-grained retrieval, good for dense technical docs. Semantic chunking — split at topic boundaries using embedding similarity — most sophisticated, better results. Rule of thumb for RAG: target chunks of 200-500 tokens for the context of typical Q&A. Test different sizes empirically — measure retrieval precision.

**Q2: What is the difference between semantic search and keyword search?**
A: Keyword search (BM25/TF-IDF): matches documents containing the exact query words or their stems. Fast, deterministic, excellent for known terminology. Fails when: user asks "large dog breeds" and document says "big canine species" — no word overlap. Semantic search (vector similarity): converts query and documents to embedding vectors, finds closest vectors. Finds relevant results even without keyword overlap — "large dog" matches "big canine." Fails when: very specific proper nouns or codes not in training data (OUR-PRODUCT-ID-X1234 → embedding has no idea). Best practice: hybrid search (combine both). Score = 0.7 × vector_score + 0.3 × keyword_score. pgvector supports both in one SQL query. Weaviate has built-in hybrid. This captures both "semantic" and "exact match" value.

---

## Cheat Sheet

```
Embedding models by use case:
  Production quality:  voyage-3 (1024d), text-embedding-3-large (3072d)
  Low cost/fast:       text-embedding-3-small (1536d)
  Free/local:          all-MiniLM-L6-v2 (384d) via @xenova/transformers

Vector DBs by use case:
  Already use Postgres: pgvector (add extension)
  Need managed cloud:   Pinecone, Qdrant Cloud
  Prototyping:          Chroma (in-memory or SQLite)
  Self-hosted:          Qdrant, Weaviate
  Hybrid search built-in: Weaviate, Qdrant

pgvector operators:
  <=>  cosine distance (use for cosine similarity index)
  <->  L2 (Euclidean) distance
  <#>  inner product (negative dot product)
  1 - (v1 <=> v2)  → cosine SIMILARITY (0-1, higher = similar)

Chunking guide:
  Dense prose (books):   500-1000 tokens, 100 overlap
  Technical docs:        200-500 tokens, paragraph-aware
  Code:                  function/class level splits
  Q&A docs:              one Q&A pair per chunk

Index types:
  HNSW: approximate NN, fast queries, high memory
  IVF:  inverted file, lower memory, slightly slower
  Flat: exact search, slowest for large sets, most accurate
```
