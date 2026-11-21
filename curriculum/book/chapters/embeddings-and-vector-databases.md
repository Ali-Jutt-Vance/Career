# Embeddings and Vector Databases

> [!GOALS]
> - Explain what an **embedding** is and why vectors let software compare **meaning** instead of keywords.
> - Measure similarity with **cosine similarity** and related distances.
> - Store and search vectors: brute force, **approximate nearest neighbour** indexes (IVF, HNSW), and vector databases such as **pgvector**.
> - Design an embedding pipeline: chunking, metadata, re-embedding and costs.
> - Combine vector search with keyword search (**hybrid search**) and filters, and evaluate retrieval quality.

## Why this matters

Classic search matches words. A customer who types "my box came crushed, can I get my money back?" will not find a help article titled "Damaged parcels can be returned for a full refund" by keyword matching — no important words are shared. Yet a person sees immediately that they mean the same thing.

**Embeddings** give software that ability. An embedding model turns text (or images, or code) into a list of numbers — a **vector** — positioned so that texts with similar meaning are close together. With vectors you can search by meaning, find duplicates, cluster feedback, recommend similar products and, most importantly for LLM applications, find the documents an LLM needs to answer a question: the "retrieval" in **retrieval-augmented generation** ({{ch:rag}}).

This chapter explains embeddings, similarity, vector indexes and vector databases, and how to build and evaluate a search pipeline. It builds on {{ch:llm-fundamentals}} and on database indexing from {{ch:indexes}}.

## The simple idea

Imagine a huge map where every sentence ever written has a location. Sentences about deliveries sit in one neighbourhood, refunds in another, green tea in a third. Sentences about damaged parcels live between "delivery" and "refunds". To find texts that mean something similar to your question, you place your question on the map and look at its neighbours.

> [!ANALOGY]
> Embeddings are like a map of meaning: every text gets a location, similar meanings are neighbours, and searching means looking at the neighbours of your question.
>
> **Where the analogy breaks:** a real map has two dimensions you can draw. Embedding spaces have hundreds or thousands of dimensions that nobody can picture or label, and the "map" depends on the model that drew it — vectors from different models cannot be compared, and changing models means redrawing every location.

## The proper definition and key words

An **embedding** is a dense vector of numbers produced by a model so that the geometric relationship between vectors reflects the semantic relationship between their inputs. A **vector database** (or vector index) stores embeddings and efficiently finds the nearest vectors to a query vector.

Key words:

- **Vector / dimension** — the list of numbers / its length (for example 1,024).
- **Embedding model** — a model that produces embeddings; different from the generating LLM.
- **Cosine similarity** — the cosine of the angle between two vectors (1 = same direction, 0 = unrelated).
- **Distance metric** — cosine distance, dot product or Euclidean (L2) distance.
- **Nearest neighbour search (k-NN)** — finding the k most similar vectors.
- **Approximate nearest neighbour (ANN)** — fast search that may miss some true neighbours.
- **HNSW / IVF** — common ANN index structures: navigable graphs / inverted lists around centroids.
- **Recall@k** — the share of true top-k neighbours an approximate search finds.
- **Chunking** — splitting documents into pieces small enough to embed and retrieve.
- **Hybrid search** — combining vector similarity with keyword (lexical) search.
- **Re-ranking** — reordering retrieved candidates with a more precise model.

## Embeddings and similarity

### Level 1 — Vectors that capture meaning

An embedding model reads text and outputs a vector. You call it through an embedding provider's API (Anthropic's documentation, for example, points to Voyage AI for embeddings; OpenAI, Cohere, Google and open-source models such as those in Sentence Transformers are other options). Two rules follow:

- **Use the same model** for documents and queries — vectors from different models live in different spaces.
- **Store the model name and version** with every vector, so you know when to re-embed.

### Level 2 — Cosine similarity and approximate search

To keep numbers readable, this example uses hand-made four-dimensional "embeddings" whose dimensions stand for concepts (delivery, money back, tea product, account). Real models produce hundreds or thousands of unlabelled dimensions, but the geometry works the same way. The second part builds a small approximate index over 20,000 clustered vectors:

```ts
// Toy 4-dimensional "embeddings" so the numbers are readable. Each dimension stands for a concept:
// [delivery, money back, tea product, account]. Real embedding models output hundreds to thousands
// of dimensions that nobody labels, but similar meanings still end up close together.
const docs: [string, number[]][] = [
  ["Orders arrive in 2-4 working days; tracking is emailed.", [0.9, 0.0, 0.1, 0.0]],
  ["Refunds are paid to the original card within 5 days.", [0.1, 0.9, 0.0, 0.1]],
  ["Our sencha is a steamed Japanese green tea.", [0.0, 0.0, 1.0, 0.0]],
  ["Reset your password from the login page.", [0.0, 0.0, 0.0, 1.0]],
  ["Damaged parcels can be returned for a full refund.", [0.5, 0.8, 0.1, 0.0]],
];
const cosine = (a: number[], b: number[]) => {
  const dot = a.reduce((s, x, i) => s + x * b[i]!, 0);
  const norm = (v: number[]) => Math.sqrt(v.reduce((s, x) => s + x * x, 0));
  return dot / (norm(a) * norm(b));
};

// "My box came crushed, can I get my money back?" — no shared keywords with "Damaged parcels … refund"
const query = [0.6, 0.7, 0.05, 0.0];
console.log("cosine similarity to the query, computed in TypeScript:");
for (const [text, v] of docs) console.log(`  ${cosine(query, v).toFixed(3)}  ${text}`);

// Approximate search: with millions of vectors, comparing against every one is too slow.
// An IVF-style index groups vectors around centroids and searches only the nearest groups.
let seed = 21;
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
const dim = 8, n = 20_000;
const unit = (v: number[]) => { const l = Math.sqrt(v.reduce((s, x) => s + x * x, 0)); return v.map((x) => x / l); };
const centres = Array.from({ length: 16 }, () => unit(Array.from({ length: dim }, () => rnd() - 0.5)));
const vecs = Array.from({ length: n }, () => {
  const c = centres[Math.floor(rnd() * centres.length)]!;
  return unit(c.map((x) => x + (rnd() - 0.5) * 0.6));                     // clustered data, like real embeddings
});
const lists = centres.map(() => [] as number[]);
vecs.forEach((v, i) => {
  let best = 0;
  centres.forEach((c, k) => { if (cosine(v, c) > cosine(v, centres[best]!)) best = k; });
  lists[best]!.push(i);
});
const queries = Array.from({ length: 50 }, () => unit(Array.from({ length: dim }, () => rnd() - 0.5)));
const topK = (q: number[], ids: number[], k: number) => ids.map((i) => [i, cosine(q, vecs[i]!)] as const).sort((a, b) => b[1] - a[1]).slice(0, k).map(([i]) => i);
const all = vecs.map((_, i) => i);
for (const probes of [1, 2, 4, 16]) {
  let found = 0, compared = 0;
  for (const q of queries) {
    const exact = new Set(topK(q, all, 10));
    const nearest = centres.map((c, k) => [k, cosine(q, c)] as const).sort((a, b) => b[1] - a[1]).slice(0, probes).map(([k]) => k);
    const candidates = nearest.flatMap((k) => lists[k]!);
    compared += candidates.length;
    found += topK(q, candidates, 10).filter((i) => exact.has(i)).length;
  }
  console.log(`probe ${String(probes).padStart(2)} of 16 lists: compared ${(compared / queries.length).toFixed(0).padStart(5)} vectors per query, recall@10 ${((found / (queries.length * 10)) * 100).toFixed(0)}%`);
}
```

**Output:**

```text
cosine similarity to the query, computed in TypeScript:
  0.652  Orders arrive in 2-4 working days; tracking is emailed.
  0.820  Refunds are paid to the original card within 5 days.
  0.054  Our sencha is a steamed Japanese green tea.
  0.000  Reset your password from the login page.
  0.988  Damaged parcels can be returned for a full refund.
probe  1 of 16 lists: compared  1240 vectors per query, recall@10 81%
probe  2 of 16 lists: compared  2475 vectors per query, recall@10 92%
probe  4 of 16 lists: compared  4978 vectors per query, recall@10 100%
probe 16 of 16 lists: compared 20000 vectors per query, recall@10 100%
```

- The query about a crushed box and money back is **closest to "Damaged parcels can be returned for a full refund"** (0.988), although they share almost no words — then refunds, then delivery; tea and passwords are unrelated. That is semantic search.
- **Cosine similarity** compares directions, ignoring vector length. Many embedding models return normalised vectors, for which the dot product gives the same ranking more cheaply.
- **Approximate search**: comparing a query with every vector (brute force) is exact but slow at millions of vectors. The IVF-style index grouped vectors around 16 centroids; searching only the nearest lists compared far fewer vectors. Probing one list found 81% of the true top 10; four lists found all of them while comparing a quarter of the data. This **speed versus recall** trade-off is tuned in every vector index.
- **HNSW** (hierarchical navigable small-world graphs), the most popular index, walks a graph of neighbours instead; it typically gives high recall with very fast queries, at the cost of memory and slower inserts.

## Vector databases

### Level 3 — Where to store vectors

| Option | Good for |
|---|---|
| **pgvector** (PostgreSQL extension; available on RDS and Aurora) | Most applications: vectors next to relational data, transactions, filters in SQL, one database to run ({{ch:postgresql}}) |
| Managed vector databases (Pinecone, Weaviate, Qdrant, Milvus, Turbopuffer…) | Very large collections, specialised features, high query rates |
| Search engines with vector support (OpenSearch, Elasticsearch) | Hybrid keyword + vector search at scale |
| In-memory libraries (FAISS, hnswlib) | Embedded use, experiments, batch jobs |

With pgvector, vectors are a column type, searchable with distance operators and indexed with HNSW or IVFFlat:

```sql
-- fragment
create extension if not exists vector;

create table help_chunks (
  id          bigserial primary key,
  article_id  bigint not null references help_articles(id),
  body        text not null,
  locale      text not null,
  embedding   vector(1024) not null,     -- dimension must match the embedding model
  model       text not null              -- which model produced the vector
);

create index on help_chunks using hnsw (embedding vector_cosine_ops);

-- nearest 5 chunks to a query vector, filtered by locale
select id, body, embedding <=> $1 as cosine_distance
from help_chunks
where locale = 'en-GB'
order by embedding <=> $1
limit 5;
```

`<=>` is cosine distance (1 − similarity); `<->` is Euclidean distance and `<#>` the negative inner product. Filters combine with similarity in one query — but very selective filters can starve an approximate index of candidates, so check recall with filters applied.

## Building the pipeline

### Level 3 — Chunking and metadata

- **Chunk** documents into pieces that each answer something on their own: a few hundred tokens is a common starting point, split on headings and paragraphs rather than fixed character counts, with a small **overlap** so sentences are not cut from their context.
- **Keep metadata** with each chunk: source document, title, section, URL, language, access permissions, last updated, embedding model. Metadata powers filters, citations and access control.
- **Add context to chunks**: prefixing the document title and section heading to each chunk before embedding ("Returns policy › Damaged items: …") improves retrieval, because a bare paragraph often lacks the words that say what it is about.
- **Index asynchronously**: when a document changes, re-chunk and re-embed it in a background job ({{ch:queues}}); delete vectors for removed documents.

### Level 3 — Hybrid search and re-ranking

- **Vector search** finds meaning but can miss exact terms — product codes, names, error messages ("ERR_4021").
- **Keyword search** (BM25, PostgreSQL full-text search) finds exact terms but misses paraphrases.
- **Hybrid search** runs both and merges the results (for example with reciprocal rank fusion), usually beating either alone.
- **Re-ranking**: retrieve a generous candidate set (say 50) cheaply, then reorder it with a re-ranking model that reads each candidate together with the query, and keep the best 5–10.

### Level 4 — Evaluating retrieval

You cannot improve what you do not measure:

- Build a set of **real questions** with the documents or chunks that should be found.
- Measure **recall@k** (are the right chunks in the top k?) and **MRR** or nDCG (how high are they?).
- Compare chunk sizes, models, hybrid weights and re-ranking on that set before choosing.
- Monitor in production: searches with no good results, user feedback, and the answers that depended on retrieval ({{ch:rag}}).

### Level 4 — Costs and operations

- **Embedding cost** is per token, paid once per chunk (and again when re-embedding) plus once per query — usually small compared with generation.
- **Storage and memory**: 1 million vectors × 1,024 dimensions × 4 bytes ≈ 4 GB before index overhead; HNSW indexes need memory to be fast. Smaller dimensions or quantised vectors (8-bit or binary) cut cost with some quality loss.
- **Changing models** means re-embedding everything: plan it as a migration with a new column or index, backfill, comparison, and switch ({{ch:database-scaling}}).
- **Latency**: embed the query (tens of milliseconds) plus the index search (milliseconds) — cache embeddings of frequent queries.

## From beginner to enterprise

**Level 1–2 — the idea.** Embeddings as meaning vectors; cosine similarity; the same model for documents and queries; brute-force search for small collections.

**Level 3 — real search.** pgvector or a vector database; HNSW and IVF indexes and their recall trade-offs; chunking with context and metadata; filters; hybrid search and re-ranking.

**Level 4 — production retrieval.** Retrieval evaluation sets and metrics; background indexing; access control in metadata; cost, memory and model-migration planning.

**Level 5 — senior practice.** Choosing storage and index types by scale and team; designing evaluation-driven improvements; balancing retrieval quality, latency and cost.

**Level 6 — organisations.** Shared retrieval platforms over many knowledge sources, with permissions, freshness guarantees and governance.

## Real-world use cases

### Help centre search

- **Design**: help articles chunked by section with titles prefixed, embedded into pgvector next to the article table; hybrid search with PostgreSQL full-text search; filters for locale and product. Searches with no results fell sharply, and support tickets for questions already answered in articles dropped.

### Duplicate bug reports

- **Design**: new bug reports are embedded and compared with open reports; similar ones above a threshold are suggested to the reporter and linked for triage.

## Common mistakes

### Beginner: mixing embedding models

**Consequence:** meaningless similarities. **Fix:** one model per index, recorded with every vector.

### Beginner: embedding whole long documents

**Consequence:** vague vectors and poor retrieval. **Fix:** chunk sensibly with context.

### Intermediate: vector search only

**Consequence:** missed exact terms and codes. **Fix:** hybrid search.

### Intermediate: no metadata or permissions on chunks

**Consequence:** users retrieve documents they should not see. **Fix:** permission metadata enforced in every query.

### Intermediate: choosing settings without evaluation

**Fix:** a retrieval test set with recall@k.

### Production: forgetting re-indexing

**Consequence:** stale or deleted content returned. **Fix:** background re-embedding on change and deletion.

### Production: underestimating memory

**Fix:** estimate vector and index sizes; consider quantisation.

## Debugging and troubleshooting

- **Relevant documents not found**: check chunking (is the answer split across chunks?), missing context in chunks, the query's wording, and whether keyword search would find it (use hybrid).
- **Irrelevant results ranked high**: short, generic chunks match everything; add context, filter, re-rank.
- **Results changed after a deployment**: a different embedding model or normalisation for queries than for documents.
- **Slow queries**: no ANN index, very selective filters forcing large scans, or too high search parameters; check the query plan.
- **Recall drops with filters**: increase candidate limits or use filtered-search features of the index.

## Security summary

- **Access control**: store permissions as metadata and filter by the user's rights in every search, so retrieval never surfaces documents the user cannot read.
- **Embeddings can leak information**: treat vectors of sensitive text as sensitive data.
- **Deletion**: removing a document must remove its vectors (privacy requests).
- **Untrusted documents**: retrieved text may contain prompt injection when passed to an LLM ({{ch:prompt-engineering}}).

## How a senior engineer thinks about this

- **Retrieval quality decides answer quality.** Measure it directly.
- **Start with pgvector.** One database is simpler until scale demands more.
- **Hybrid beats pure.** Meaning and exact terms both matter.
- **Chunks need context and metadata.** They are documents too.
- **Vectors depend on a model.** Plan for re-embedding from day one.

## Exercises

### Exercise 1 — Compute similarity

**Objective:** practise the maths.
**What to do:** compute the cosine similarity of `[1, 0, 1]` and `[1, 1, 0]`, and of `[2, 0, 2]` and `[1, 0, 1]`. What does the second result show?

<details>
<summary>Show the solution</summary>

- First: dot product 1; lengths √2 and √2; similarity 1 ÷ 2 = **0.5**.
- Second: dot product 4; lengths √8 and √2; similarity 4 ÷ √16 = **1.0**.

Cosine similarity ignores length: vectors pointing in the same direction are identical in meaning, however long they are.

</details>

### Exercise 2 — Design the chunks

**Objective:** practise chunking.
**What to do:** you index a 40-page product manual with headings, tables and a troubleshooting section of error codes. How do you chunk and what metadata do you store?

<details>
<summary>Show the solution</summary>

- Split by headings and sections; keep each chunk to a few hundred tokens; split long sections by paragraph with small overlaps.
- Keep tables together with their heading (or convert them to text rows with column names).
- Make each **error code** entry its own chunk, and make sure the code appears in the chunk text so keyword search finds it.
- Prefix each chunk with "Manual title › Section › Subsection".
- Metadata: document ID, version, section path, page numbers, product model, language, last updated, access level and embedding model.
- Use hybrid search, so exact error codes are found reliably.

</details>

### Exercise 3 — Production scenario: changing the embedding model

**Objective:** practise migrations.
**The scenario:** a new embedding model scores much better on your retrieval evaluation. You have 30 million chunks embedded with the old model in pgvector. How do you switch without downtime or quality loss?

<details>
<summary>Show the solution</summary>

1. Add a **new vector column** (or table) with the new model's dimension and an HNSW index built after backfilling.
2. **Embed new and changed chunks with both models** from now on.
3. **Backfill** existing chunks in batches in the background, throttled to respect API rate limits and database load; track progress.
4. **Verify** on the evaluation set and with shadow queries comparing results from both columns.
5. **Switch queries** gradually behind a feature flag, embedding queries with the new model.
6. Remove the old column and index after a safe period. Estimate the embedding cost and time before starting.

</details>

## Summary

An **embedding** turns text into a vector positioned so that similar meanings are close together, which lets software search by meaning rather than keywords. Similarity is usually measured with **cosine similarity** (direction, not length); documents and queries must use the **same embedding model**, recorded with every vector.

Exact (brute-force) search compares the query with every vector; **approximate nearest neighbour** indexes such as **IVF** (search only the nearest groups) and **HNSW** (walk a graph of neighbours) trade a little **recall** for large speed-ups. Vectors live in **pgvector** next to relational data, in managed vector databases, in search engines with vector support or in-memory libraries.

A good pipeline **chunks** documents along their structure with context prefixes and rich **metadata** (source, permissions, model), indexes them in the background, combines vector and keyword results in **hybrid search**, **re-ranks** candidates, and is tuned with a retrieval **evaluation set** (recall@k, MRR). Plan for storage and memory, query latency, permission filtering and the re-embedding migration that every model change requires.

## Key terms

- **Embedding** — A vector representing the meaning of an input.
- **Vector** — An ordered list of numbers.
- **Dimension** — The number of values in a vector.
- **Embedding model** — A model that converts inputs into embeddings.
- **Cosine similarity** — The cosine of the angle between two vectors.
- **Dot product** — The sum of the products of corresponding vector values.
- **Euclidean distance** — The straight-line distance between two vectors.
- **Nearest neighbour search** — Finding the vectors most similar to a query.
- **Approximate nearest neighbour (ANN)** — Fast neighbour search that may miss some results.
- **IVF index** — An index grouping vectors into lists around centroids.
- **HNSW** — A graph-based approximate nearest neighbour index.
- **Recall@k** — The share of true top-k results found by a search.
- **Vector database** — A database designed to store and search vectors.
- **pgvector** — A PostgreSQL extension for vector storage and search.
- **Chunking** — Splitting documents into retrievable pieces.
- **Hybrid search** — Combining vector and keyword search.
- **Reciprocal rank fusion** — A method for merging ranked result lists.
- **Re-ranking** — Reordering retrieved candidates with a more precise model.
- **Quantisation** — Storing vectors with fewer bits to save space.

## What comes next

Retrieval finds the right information; generation turns it into an answer. The next chapter, {{ch:rag}}, combines the two in retrieval-augmented generation: the retrieve-then-generate pipeline, prompts with sources and citations, handling missing answers, and evaluating RAG systems end to end.
