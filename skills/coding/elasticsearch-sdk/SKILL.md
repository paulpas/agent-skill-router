---




name: elasticsearch-sdk
description: Integrates Elasticsearch using elasticsearch-py 8.x with patterns for
  indexing, search queries, aggregations, vector search, bulk operations, and index
  lifecycle management.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: elasticsearch, elasticsearch-py, opensearch, full-text search, elastic
    aggregations, how do i search data from python, elk stack, vector search
  archetypes:
  - tactical
  - generation
  anti_triggers:
  - brainstorming
  - vague ideation
  - code golf
  - over-engineering
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  role: implementation
  scope: implementation
  output-format: code
  content-types:
  - code
  - guidance
  - do-dont
  - examples
  related-skills: coding-mongodb-driver, coding-postgresql-sdk, coding-rag-architecture




---




# Elasticsearch Python SDK Integration

Integrates Elasticsearch using `elasticsearch-py` 8.x (also compatible with OpenSearch) with patterns for index management, search queries (term, match, bool), aggregations, bulk indexing, vector/kNN search, index lifecycle management (ILM), and async operations.

## TL;DR Checklist

- [ ] Use `Elasticsearch()` client with `basic_auth` or `api_key` for authentication
- [ ] Use `helpers.bulk()` for high-throughput indexing — never index documents one-by-one
- [ ] Use `bool` query with `must`/`filter`/`should` clauses for complex search
- [ ] Use `aggs` for bucket and metric aggregations, not client-side grouping
- [ ] Use `knn` query for vector similarity search (Elasticsearch 8.x+)
- [ ] Use `index.create()` with explicit mappings — never rely on dynamic mapping for production
- [ ] Use `point_in_time` (PIT) + `search_after` for deep pagination instead of `from`/`size`

---

## When to Use

Use this skill when:

- Building full-text search functionality for applications
- Implementing log aggregation and analysis with Elasticsearch
- Performing real-time analytics with bucket and metric aggregations
- Implementing vector/kNN search for semantic or similarity-based retrieval
- Building RAG (Retrieval-Augmented Generation) pipelines with Elasticsearch as a vector store
- Managing time-series indices with ILM policies and rollover
- Migrating from or integrating with OpenSearch (API-compatible)

---

## When NOT to Use

- For transaction-heavy OLTP workloads (use PostgreSQL or MongoDB)
- When you need a primary data store with strong consistency guarantees
- For simple key-value lookups (use Redis or DynamoDB)
- For complex joins across multiple entities (use a relational database)
- When your data fits in memory and doesn't need search capabilities (keep it simple)

---

## Core Workflow

### 1. Connect to Elasticsearch

```python
from elasticsearch import Elasticsearch, helpers
from elasticsearch.exceptions import (
    ConnectionError as ESConnectionError,
    NotFoundError,
    AuthorizationException,
)

# Elastic Cloud or self-managed cluster
es = Elasticsearch(
    "https://localhost:9200",
    basic_auth=("elastic", os.environ["ES_PASSWORD"]),
    ca_certs="/path/to/ca.crt",
    request_timeout=30,
    max_retries=3,
    retry_on_timeout=True,
)

# Verify connectivity
if not es.ping():
    raise RuntimeError("Cannot connect to Elasticsearch")
```

**Checkpoint:** Always verify with `es.ping()` or `es.info()` at startup. Catch `AuthorizationException` immediately on auth failures — don't proceed with invalid credentials.

### 2. Create Index with Explicit Mappings

```python
def create_articles_index(es: Elasticsearch, index_name: str) -> dict:
    """Create an index with explicit mappings and settings."""
    mappings = {
        "properties": {
            "title": {
                "type": "text",
                "fields": {"keyword": {"type": "keyword"}},
                "analyzer": "english",
            },
            "content": {"type": "text", "analyzer": "english"},
            "author": {"type": "keyword"},
            "published_at": {"type": "date"},
            "tags": {"type": "keyword"},
            "view_count": {"type": "integer"},
            "embedding": {
                "type": "dense_vector",
                "dims": 768,
                "index": True,
                "similarity": "cosine",
            },
        }
    }
    settings = {
        "number_of_shards": 3,
        "number_of_replicas": 1,
        "refresh_interval": "30s",
    }
    if not es.indices.exists(index=index_name):
        return es.indices.create(index=index_name, mappings=mappings, settings=settings)
    return {"acknowledged": True, "existing": True}
```

**Checkpoint:** Always define explicit mappings before indexing production data. Use `keyword` type for exact-match fields and `text` with analyzers for full-text search. Add `dense_vector` fields for vector search.

### 3. Index Documents with Bulk API

```python
def bulk_index_articles(es: Elasticsearch, index_name: str, articles: list[dict]) -> dict:
    """Bulk index articles with error handling."""
    def generate_actions():
        for article in articles:
            yield {
                "_index": index_name,
                "_id": article.get("id"),
                "_source": {
                    "title": article["title"],
                    "content": article["content"],
                    "author": article["author"],
                    "published_at": article["published_at"],
                    "tags": article.get("tags", []),
                    "view_count": article.get("view_count", 0),
                    "embedding": article.get("embedding"),
                },
            }

    success, errors = helpers.bulk(
        es,
        generate_actions(),
        chunk_size=500,
        request_timeout=60,
        raise_on_error=False,
    )
    return {"indexed": success, "errors": len(errors)}
```

**Checkpoint:** Use `raise_on_error=False` and inspect errors for failures. Use `chunk_size` to balance throughput and memory. Always check `errors` count after bulk operations.

### 4. Search with Bool Query

```python
def search_articles(
    es: Elasticsearch,
    index_name: str,
    query_text: str,
    author: str | None = None,
    tags: list[str] | None = None,
    min_date: str | None = None,
    from_: int = 0,
    size: int = 20,
) -> dict:
    """Full-text search with optional filters."""
    must_clauses = [{"match": {"content": query_text}}]
    filter_clauses = []

    if author:
        filter_clauses.append({"term": {"author": author}})
    if tags:
        filter_clauses.append({"terms": {"tags": tags}})
    if min_date:
        filter_clauses.append({"range": {"published_at": {"gte": min_date}}})

    body = {
        "query": {
            "bool": {
                "must": must_clauses,
                "filter": filter_clauses,
            }
        },
        "sort": [{"_score": "desc"}, {"published_at": "desc"}],
        "from_": from_,
        "size": size,
        "aggs": {
            "by_author": {"terms": {"field": "author", "size": 10}},
            "date_histogram": {"date_histogram": {"field": "published_at", "calendar_interval": "month"}},
        },
    }
    return es.search(index=index_name, body=body)
```

**Checkpoint:** Use `filter` context for structured data (dates, keywords) — filter clauses are cached and don't affect scoring. Use `must` for full-text relevance scoring.

---

## Implementation Patterns

### Pattern 1: Vector/kNN Search

```python
def vector_search(
    es: Elasticsearch,
    index_name: str,
    query_vector: list[float],
    k: int = 10,
    num_candidates: int = 100,
) -> list[dict]:
    """Perform kNN vector search for semantic similarity."""
    body = {
        "knn": {
            "field": "embedding",
            "query_vector": query_vector,
            "k": k,
            "num_candidates": num_candidates,
        },
        "_source": {"excludes": ["embedding"]},
    }
    response = es.search(index=index_name, body=body)
    return [hit["_source"] for hit in response["hits"]["hits"]]
```

### Pattern 2: Point-in-Time Deep Pagination

```python
def scroll_all_results(es: Elasticsearch, index_name: str, query: dict, page_size: int = 1000):
    """Paginate through all matching results using PIT + search_after."""
    pit = es.open_point_in_time(index=index_name, keep_alive="5m")
    sort = [{"published_at": "desc"}, {"_shard_doc": "desc"}]
    last_sort = None

    try:
        while True:
            body = {
                "size": page_size,
                "query": query,
                "sort": sort,
                "pit": {"id": pit["id"], "keep_alive": "5m"},
            }
            if last_sort:
                body["search_after"] = last_sort

            response = es.search(body=body)
            hits = response["hits"]["hits"]
            if not hits:
                break

            for hit in hits:
                yield hit["_source"]

            last_sort = hits[-1]["sort"]
    finally:
        es.close_point_in_time(id=pit["id"])
```

### BAD vs GOOD: Indexing Pattern

```python
# ❌ BAD — Indexing one document at a time (slow)
def index_articles_bad(es, index, articles):
    for article in articles:
        es.index(index=index, document=article)

# ✅ GOOD — Bulk indexing (10-50x faster)
def index_articles_good(es, index, articles):
    success, errors = helpers.bulk(es, (
        {"_index": index, "_source": a} for a in articles
    ), raise_on_error=False)
    if errors:
        log.error(f"Bulk indexing failed for {len(errors)} documents")
```

### BAD vs GOOD: Query Construction

```python
# ❌ BAD — Inefficient wildcard query
def search_bad(es, index, term):
    return es.search(index=index, query={"wildcard": {"title": f"*{term}*"}})

# ✅ GOOD — Analyzed match query with proper field
def search_good(es, index, term):
    return es.search(index=index, query={"match": {"title": {"query": term, "fuzziness": "AUTO"}}})
```

---

## Constraints

### MUST DO
- Define explicit index mappings before indexing — never rely solely on dynamic mapping
- Use `helpers.bulk()` for all batch indexing operations
- Use bool queries with `filter` for structured data and `must` for full-text relevance
- Set `number_of_shards` based on your data volume and node count (20-40GB per shard)
- Use `ilm` (Index Lifecycle Management) for time-series indices
- Set `refresh_interval` to `-1` during bulk indexing, reset after

### MUST NOT DO
- Never use `scroll` for deep pagination in user-facing queries — use `search_after` or PIT
- Avoid `wildcard` and `regexp` queries on `text` fields — they skip the analysis index
- Do not index documents one-by-one in loops — always use bulk helpers
- Never use `match_all` queries without `size` limits — can crash the cluster
- Avoid large `terms` queries with thousands of values — use `terms_set` or filters instead

---

## Output Template

When writing Elasticsearch integration code, structure your output as:

1. **Client Initialization** — Elasticsearch client with authentication and connection settings
2. **Index Setup** — Create index with explicit mappings (fields, analyzers, vector config)
3. **Bulk Indexing** — helpers.bulk() with chunked document generation
4. **Search Query** — Bool query with must/filter/should clauses, aggregations, sorting
5. **Result Processing** — Extract hits, parse aggregations, handle pagination

---

## Related Skills

| Skill | Purpose |
|---|---|
| `coding-mongodb-driver` | Document database patterns — alternative to Elasticsearch for non-search workloads |
| `coding-rag-architecture` | RAG pipeline patterns using Elasticsearch as vector store |
| `coding-postgresql-sdk` | PostgreSQL full-text search as an alternative |

---

## Live References

- [elasticsearch-py Documentation](https://elasticsearch-py.readthedocs.io/en/v8.x/) — Official Python client 8.x docs
- [Elasticsearch Query DSL](https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl.html) — Complete query DSL reference
- [Elasticsearch Aggregations Guide](https://www.elastic.co/guide/en/elasticsearch/reference/current/search-aggregations.html) — Bucket and metric aggregations
- [Elasticsearch Vector Search](https://www.elastic.co/guide/en/elasticsearch/reference/current/knn-search.html) — kNN and vector similarity search
- [Elasticsearch Bulk API](https://www.elastic.co/guide/en/elasticsearch/reference/current/docs-bulk.html) — Bulk indexing and update API
- [Elasticsearch ILM](https://www.elastic.co/guide/en/elasticsearch/reference/current/index-lifecycle-management.html) — Index lifecycle management policies
- [OpenSearch Python Client](https://opensearch.org/docs/latest/clients/python/) — OpenSearch Python client (API-compatible)
