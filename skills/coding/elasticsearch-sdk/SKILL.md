---
name: elasticsearch-sdk
description: Integrates Elasticsearch using elasticsearch-py 8.x with patterns for
  indexing, search queries, aggregations, vector search, bulk operations, and index
  lifecycle management.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
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
------

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

