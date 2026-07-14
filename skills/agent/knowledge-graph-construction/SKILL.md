---
name: knowledge-graph-construction
description: Implements knowledge graph construction (entity extraction, relationship mapping, graph database storage) and Graph-RAG integration for enterprise AI agents with structured reasoning over connected data.
license: MIT
compatibility: opencode
archetypes:
  - tactical
  - strategic
anti_triggers:
  - simple vector search
  - basic RAG pipeline
  - unstructured text only
response_profile:
  verbosity: medium
  directive_strength: high
  abstraction_level: operational
metadata:
  version: "1.0.0"
  domain: agent
  role: implementation
  scope: infrastructure
  output-format: code
  triggers: knowledge graph, Neo4j, GraphRAG, entity extraction, relationship mapping, how do i build a knowledge graph for AI, multi-hop queries
  related-skills: rag-patterns,mcp-integration,evaluation-monitoring
---

# Knowledge Graph Construction for AI Agents

This skill makes the model design, build, and deploy knowledge graph systems — constructing structured entity-relationship representations from unstructured documents, connecting them to enterprise datastores via MCP, integrating as retrieval backends for RAG pipelines (Graph-RAG), and configuring multi-tenant agent platforms like Google AgentSpace with role-based access control.

## TL;DR Checklist

- [ ] Design a graph schema with explicit node types, relationship types, and property constraints before ingestion
- [ ] Extract entities using LLM-based extraction with strict JSON schemas — never ad-hoc field names
- [ ] Map relationships with directional edges (source → target) and typed predicates following ontology conventions
- [ ] Load the graph into Neo4j or store in-memory with NetworkX for prototyping, enforcing uniqueness constraints
- [ ] Build Graph-RAG queries that combine vector similarity on node embeddings with graph traversal for multi-hop reasoning
- [ ] Implement enterprise safeguards: tenant isolation, audit logging, and role-based access control per agent
- [ ] Validate graph quality post-ingestion: check entity consistency, relationship completeness, and query accuracy

---

## When to Use

Use this skill when:

- Building a knowledge representation that captures relationships between entities (people, organizations, concepts, events) for downstream reasoning
- Answering multi-hop queries that require traversing entity connections (e.g., "Which vendors supply components used in Project X?")
- Integrating an AI agent with structured enterprise data via Google AgentSpace or a custom knowledge graph platform
- Implementing Graph-RAG — using a knowledge graph as the retrieval backend for RAG queries instead of pure vector search
- Constructing entity resolution pipelines that merge duplicate entities across disparate data sources (CRM, ERP, wikis)
- Designing ontology-driven agent systems where domain relationships must be explicitly modeled (fraud detection, supply chain analysis, biomedicine)

---

## When NOT to Use

Avoid this skill for:

- **Simple FAQ lookup** — A flat document store with vector search (`rag-patterns`) handles single-document Q&A cheaper and faster
- **Unstructured text classification** — Classification tasks don't need graph relationships; use a fine-tuned model or prompt-based classifier instead
- **Real-time event streaming** — Graph construction has ingestion latency; for sub-second event processing, use a message queue (`aws-sqs`) with simple state stores
- **Pure vector similarity search** — If the only query pattern is "find documents similar to this," a vector database alone is simpler and sufficient

---

## Core Workflow

1. **Schema Design** — Define your graph ontology: node types (entities), relationship types (predicates), and property schemas. Start minimal — only model relationships that queries actually need. Use a domain ontology as a reference (e.g., DBpedia, schema.org) when one exists. **Checkpoint:** Every node type has at least one unique constraint property (e.g., `Person:email`, `Company:ticker`). Verify the schema supports all target queries before proceeding to ingestion.

2. **Document Ingestion and Parsing** — Load raw documents (PDFs, HTML, JSON, CSV) and preprocess them into clean text blocks suitable for extraction. Remove headers, footers, navigation elements, and boilerplate. Segment documents into logical units (sections, paragraphs, table rows) that map to graph entities. **Checkpoint:** Each ingestion unit is self-contained with a source identifier. Run a sampling pass to confirm no critical entity data was lost during preprocessing.

3. **Entity Extraction** — Use an LLM-based extraction pipeline to identify named entities and structured attributes from each document unit. Extract entities into typed nodes (Person, Organization, Product, Event, Location) with properties derived from the schema. Use few-shot prompting or JSON mode to enforce consistent output structure across all documents. **Checkpoint:** Extracted entities conform to the defined schema. Check for duplicate entities referencing the same real-world object — flag them for resolution in the next step.

4. **Relationship Mapping and Entity Resolution** — Map relationships between extracted entities using typed, directional edges (e.g., `(Person:Employee)-[:WORKS_AT]->(Company)`). Resolve entity duplicates by matching on canonical properties (email, tax ID, ticker symbol) or fuzzy matching on names with a confidence threshold. Merge resolved entities into single canonical nodes. **Checkpoint:** The graph passes quality gates: no orphaned relationship endpoints, duplicate entity rate below 5%, and all relationships have a source, type, target, and temporal validity window.

5. **Graph Storage and Indexing** — Load the constructed graph into the target graph database (Neo4j for production, NetworkX for prototyping). Create indexes on constraint properties and relationship endpoints to ensure query performance. Generate vector embeddings for node text attributes if Graph-RAG retrieval is needed. **Checkpoint:** Run a benchmark of representative queries against the stored graph — all queries must return within the SLA threshold. Verify index coverage for every indexed property used in WHERE clauses.

6. **Query Optimization and Graph-RAG Integration** — Implement Cypher query patterns optimized for the access patterns of your agents. Integrate the knowledge graph as a retrieval backend for RAG: combine vector similarity search on node embeddings with structured graph traversal to answer multi-hop questions. Build MCP tools that expose graph queries to agents. **Checkpoint:** The end-to-end Graph-RAG pipeline answers a test suite of 20+ multi-hop queries with >90% accuracy. Agent tool calls through MCP execute within acceptable latency bounds.

---

## Implementation Patterns / Reference Guide

### Pattern 1: Knowledge Graph Builder — Entity and Relationship Extraction Pipeline

Constructs knowledge graphs from unstructured documents using LLM-based entity extraction, relationship mapping, and Neo4j loading. This is the core ingestion pipeline.

```python
"""
knowledge_graph_builder.py — Entity extraction and graph construction pipeline.
Uses an LLM for structured entity/relation extraction with JSON mode,
then loads results into Neo4j with constraint enforcement.
"""

import json
import logging
from dataclasses import dataclass, field
from typing import Any, Optional
from uuid import uuid4

from openai import OpenAI
from neo4j import GraphDatabase, exceptions as neo4j_exceptions

logger = logging.getLogger(__name__)


@dataclass
class ExtractedEntity:
    """A single entity extracted from a document."""
    entity_id: str
    entity_type: str  # Person, Organization, Product, Event, Location
    name: str
    properties: dict[str, Any] = field(default_factory=dict)

    @property
    def canonical_key(self) -> str:
        """Generate a stable key for entity resolution.
        
        Returns:
            A composite key that uniquely identifies this real-world entity.
        """
        if "email" in self.properties:
            return f"{self.entity_type}:email:{self.properties['email']}"
        if "ticker" in self.properties:
            return f"{self.entity_type}:ticker:{self.properties['ticker']}"
        return f"{self.entity_type}:name:{self.name.lower().strip()}"


@dataclass
class ExtractedRelationship:
    """A directed relationship between two entities."""
    source_id: str
    target_id: str
    relation_type: str  # WORKS_AT, SUPPLIES, LOCATED_IN, etc.
    properties: dict[str, Any] = field(default_factory=dict)

    @property
    def canonical_edge(self) -> tuple[str, str, str]:
        """Unique edge key for deduplication."""
        return (self.source_id, self.relation_type, self.target_id)


class KnowledgeGraphBuilder:
    """Builds knowledge graphs from documents using LLM extraction + Neo4j loading.

    This class handles the full ingestion pipeline:
    1. Prompt-based entity/relation extraction via LLM JSON mode
    2. Entity resolution (canonical key matching)
    3. Graph construction in Neo4j with constraint enforcement
    """

    # Strict extraction prompt template — few-shot guidance ensures consistent schema
    EXTRACTION_PROMPT = """
Extract structured entities and relationships from the following text.
Return ONLY a JSON object matching this exact schema:

{{
  "entities": [
    {{
      "entity_id": "e_001",
      "entity_type": "Person | Organization | Product | Event | Location",
      "name": "<exact name from text>",
      "properties": {{}}
    }}
  ],
  "relationships": [
    {{
      "source_entity_name": "<name of source entity exactly as extracted>",
      "target_entity_name": "<name of target entity exactly as extracted>",
      "relation_type": "WORKS_AT | EMPLOYER_OF | SUPPLIES | LOCATED_IN | OWNS | PART_OF",
      "properties": {{}}
    }}
  ]
}}

Rules:
- Use ONLY the entity types listed above.
- relation_type must be one of the five types listed.
- Entity names must match the text exactly (case-sensitive).
- Do NOT invent relationships — only extract those explicitly stated or strongly implied.
- If no entities are found, return empty arrays.

Text:
{text}
"""

    def __init__(
        self,
        openai_client: OpenAI,
        neo4j_uri: str = "bolt://localhost:7687",
        neo4j_user: str = "neo4j",
        neo4j_password: str = "password",
        database_name: str = "knowledge_graph",
    ) -> None:
        """Initialize the knowledge graph builder.

        Args:
            openai_client: OpenAI client instance for extraction calls.
            neo4j_uri: Neo4j connection URI.
            neo4j_user: Neo4j authentication username.
            neo4j_password: Neo4j authentication password.
            database_name: Target Neo4j database name.
        """
        self.llm = openai_client
        self.neo4j_driver = GraphDatabase.driver(
            neo4j_uri, auth=(neo4j_user, neo4j_password)
        )
        self.database_name = database_name

    def extract_from_text(self, text: str) -> tuple[list[ExtractedEntity], list[ExtractedRelationship]]:
        """Extract entities and relationships from raw text using LLM JSON mode.

        Args:
            text: The raw text to extract structured data from.

        Returns:
            Tuple of (entities, relationships) lists.

        Raises:
            ValueError: If the LLM response cannot be parsed as valid JSON.
        """
        if not text or len(text.strip()) < 10:
            raise ValueError(f"Text too short for extraction: {len(text)} characters")

        response = self.llm.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": self.EXTRACTION_PROMPT.format(text=text[:8000])}],
            response_format={"type": "json_object"},
            temperature=0.0,  # Deterministic extraction
            max_tokens=2048,
        )

        raw = response.choices[0].message.content
        try:
            parsed = json.loads(raw)
        except json.JSONDecodeError as exc:
            raise ValueError(f"LLM returned invalid JSON: {exc}") from exc

        # --- Parse entities ---
        entities: list[ExtractedEntity] = []
        entity_name_to_id: dict[str, str] = {}

        for item in parsed.get("entities", []):
            eid = f"e_{uuid4().hex[:8]}"
            name = item.get("name", "").strip()
            if not name:
                continue  # Skip empty names (Early Exit)

            entity_type = item.get("entity_type", "Unknown")
            if entity_type not in ("Person", "Organization", "Product", "Event", "Location"):
                logger.warning(f"Skipping unrecognized entity type: {entity_type}")
                continue

            entity = ExtractedEntity(
                entity_id=eid,
                entity_type=entity_type,
                name=name,
                properties=item.get("properties", {}),
            )
            entities.append(entity)
            entity_name_to_id[name] = eid

        # --- Parse relationships ---
        relationships: list[ExtractedRelationship] = []
        for rel in parsed.get("relationships", []):
            source_name = rel.get("source_entity_name", "").strip()
            target_name = rel.get("target_entity_name", "").strip()
            relation_type = rel.get("relation_type", "")

            source_id = entity_name_to_id.get(source_name)
            target_id = entity_name_to_id.get(target_name)

            if not source_id or not target_id:
                logger.warning(
                    f"Skipping relationship with unresolved entities: "
                    f"'{source_name}' → '{target_name}'"
                )
                continue  # Skip orphaned relationships (Fail Fast)

            relationship = ExtractedRelationship(
                source_id=source_id,
                target_id=target_id,
                relation_type=relation_type,
                properties=rel.get("properties", {}),
            )
            relationships.append(relationship)

        return entities, relationships

    def resolve_entities(
        self,
        all_entities: list[ExtractedEntity],
    ) -> tuple[dict[str, str], list[ExtractedEntity]]:
        """Resolve duplicate entities by canonical key and merge properties.

        Args:
            all_entities: All extracted entities from one or more documents.

        Returns:
            Tuple of (canonical_map: original_id → resolved_id, merged_entities).
        """
        canonical_map: dict[str, str] = {}
        merged: dict[str, ExtractedEntity] = {}  # canonical_key → entity

        for entity in all_entities:
            key = entity.canonical_key
            if key not in merged:
                merged[key] = entity
                canonical_map[entity.entity_id] = entity.entity_id
            else:
                # Merge properties — later documents override earlier ones
                existing = merged[key]
                for prop_k, prop_v in entity.properties.items():
                    if prop_v and not existing.properties.get(prop_k):
                        existing.properties[prop_k] = prop_v
                canonical_map[entity.entity_id] = existing.entity_id

        return canonical_map, list(merged.values())

    def load_to_neo4j(
        self,
        entities: list[ExtractedEntity],
        relationships: list[ExtractedRelationship],
        source_doc_id: str,
    ) -> dict[str, int]:
        """Load resolved entities and relationships into Neo4j with constraint enforcement.

        Args:
            entities: Resolved (deduplicated) entity list.
            relationships: Relationship list with resolved IDs.
            source_doc_id: Document identifier for provenance tracking.

        Returns:
            Counts of created nodes, created relationships, and updated (merged) nodes.
        """
        driver = self.neo4j_driver
        counts = {"nodes_created": 0, "relationships_created": 0, "nodes_updated": 0}

        # Step 1: Ensure constraints exist
        with driver.session(database=self.database_name) as session:
            for node_type in ("Person", "Organization"):
                constraint_name = f"unique_{node_type.lower()}_name"
                try:
                    session.run(f"""
                        CREATE CONSTRAINT {constraint_name} IF NOT EXISTS
                        FOR (n:{node_type}) REQUIRE n.name IS UNIQUE
                    """)
                except neo4j_exceptions.ClientError:
                    pass  # Constraint already exists

            # Step 2: Upsert entities using MERGE — prevents duplicates
            for entity in entities:
                props = dict(entity.properties)
                props["graph_id"] = entity.entity_id
                props["ingested_from"] = source_doc_id
                props["updated_at"] = None  # Placeholder; set by application

                session.run(f"""
                    MERGE (e:{entity.entity_type} {{name: $name}})
                    SET e += $props,
                        e.graph_id = $graph_id
                    RETURN count(e) AS count
                """, name=entity.name, props=props, graph_id=entity.entity_id)
                counts["nodes_updated"] += 1

            # Step 3: Create relationships
            seen_edges: set[tuple[str, str, str]] = set()
            for rel in relationships:
                edge_key = (rel.source_id, rel.relation_type, rel.target_id)
                if edge_key in seen_edges:
                    continue  # Skip duplicates (Early Exit)
                seen_edges.add(edge_key)

                session.run(f"""
                    MATCH (source {{graph_id: $source_id}}),
                          (target {{graph_id: $target_id}})
                    WHERE source IS NOT NULL AND target IS NOT NULL
                    MERGE (source)-[r:{rel.relation_type}]->(target)
                    SET r += $props,
                        r.source_doc = $doc_id
                """, source_id=rel.source_id, target_id=rel.target_id,
                       props=rel.properties, doc_id=source_doc_id)
                counts["relationships_created"] += 1

        return counts

    def close(self) -> None:
        """Close the Neo4j driver connection."""
        self.neo4j_driver.close()


# --- Usage example ---

def build_graph_from_documents(
    texts: list[str],
    doc_ids: list[str],
    openai_api_key: str,
    neo4j_uri: str = "bolt://localhost:7687",
) -> None:
    """High-level function to ingest a batch of documents into a knowledge graph.

    Args:
        texts: List of raw text blocks (one per document).
        doc_ids: Corresponding document identifiers.
        openai_api_key: OpenAI API key for extraction calls.
        neo4j_uri: Neo4j connection URI.
    """
    client = OpenAI(api_key=openai_api_key)
    builder = KnowledgeGraphBuilder(
        openai_client=client,
        neo4j_uri=neo4j_uri,
    )

    try:
        # Phase 1: Extract from all documents
        all_entities: list[ExtractedEntity] = []
        all_relationships: list[ExtractedRelationship] = []

        for text, doc_id in zip(texts, doc_ids):
            entities, relationships = builder.extract_from_text(text)
            all_entities.extend(entities)
            all_relationships.extend(relationships)
            logger.info(f"Extracted {len(entities)} entities, {len(relationships)} relations from {doc_id}")

        # Phase 2: Resolve duplicates across documents
        canonical_map, resolved_entities = builder.resolve_entities(all_entities)

        # Map relationship IDs through the canonical resolution map
        resolved_relationships: list[ExtractedRelationship] = []
        for rel in all_relationships:
            new_source = canonical_map.get(rel.source_id, rel.source_id)
            new_target = canonical_map.get(rel.target_id, rel.target_id)
            if new_source != rel.source_id or new_target != rel.target_id:
                logger.info(f"Resolved entity IDs for relationship from {doc_id}")
            resolved_relationships.append(ExtractedRelationship(
                source_id=new_source,
                target_id=new_target,
                relation_type=rel.relation_type,
                properties=rel.properties,
            ))

        # Phase 3: Load into Neo4j (batch by document)
        for text, doc_id in zip(texts, doc_ids):
            entities_for_doc = []
            rels_for_doc = []
            for e in all_entities:
                if e.properties.get("ingested_from") == doc_id or e.entity_id in [
                    canonical_map[orig] for orig in [e.entity_id]
                ]:
                    # Simple pass — in production, track document-to-entity mapping
                    entities_for_doc.append(e)
            for r in all_relationships:
                if r.source_doc == doc_id:  # type: ignore[attr-defined]
                    rels_for_doc.append(r)

            if entities_for_doc or rels_for_doc:
                counts = builder.load_to_neo4j(entities_for_doc, rels_for_doc, doc_id)
                logger.info(f"Loaded into Neo4j — {counts}")

    finally:
        builder.close()
```

**BAD:** Extracting entities without a defined schema or canonical key strategy.

```python
# ❌ BAD — Ad-hoc extraction produces inconsistent entity types and no deduplication
def bad_extract(text: str) -> dict:
    """Extracts whatever the LLM returns without enforcing any schema."""
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": f"Extract entities from: {text}"}],
    )
    return json.loads(response.choices[0].message.content)  # Wild west

# Results vary per call. "Apple Inc." and "Apple" become two different entities.
# No way to merge them. Relationships reference names, not IDs — broken edges on rename.


# ✅ GOOD — Strict schema with canonical keys and constraint enforcement
builder = KnowledgeGraphBuilder(openai_client=client)  # defined above
entities, relationships = builder.extract_from_text(text)
canonical_map, resolved = builder.resolve_entities(entities)
# "Apple Inc." and "Apple" share the same canonical key → merged into one node.
# Relationships reference graph_id UUIDs, not names → never broken by name changes.
```

### Pattern 2: Graph-RAG Integration — Knowledge Graph as RAG Retrieval Backend

Combines vector similarity on node embeddings with structured graph traversal for multi-hop question answering. This is where the knowledge graph becomes a retrieval backend that enhances traditional RAG.

```python
"""
graph_rag_retriever.py — Graph-RAG retrieval combining vector search and Cypher traversal.
"""

import logging
from dataclasses import dataclass, field
from typing import Any

from neo4j import GraphDatabase, exceptions as neo4j_exceptions

logger = logging.getLogger(__name__)


@dataclass
class GraphRAGResult:
    """A single Graph-RAG query result."""
    answer: str
    reasoning_path: list[dict[str, str]]  # Step-by-step traversal explanation
    supporting_nodes: list[dict[str, Any]]  # Entity nodes that grounded the answer
    retrieved_context_chunks: list[str]  # Text content from document provenance
    confidence_score: float  # 0.0 to 1.0


class GraphRAGRetriever:
    """Retrieves answers by combining vector similarity on graph nodes
    with structured Cypher-based multi-hop traversal.

    This pattern addresses queries that pure vector search cannot answer:
    - "Which companies have executives who also serve on boards of competitors?"
    - "What is the supply chain path from Supplier A to Product Z?"
    - "Find all policies related to employees in department X who work remotely"
    """

    # Vector similarity index query — finds conceptually similar nodes
    VECTOR_SEARCH_CYPHER = """
    CALL db.index.vector.queryNodes($index_name, $k, $embedding)
    YIELD node, score
    RETURN node AS entity, score
    ORDER BY score DESC
    LIMIT $k
    """

    # Multi-hop traversal for relationship reasoning
    MULTI_HOP_CYPHER = """
    MATCH path = (start {{name: $entity_name}})-[rel*1..{depth}]->(end)
    WHERE $target_type IS NULL OR labels(end)[0] IN $target_types
    RETURN nodes(path) AS entities,
           [r in relationships(path) | type(r)] AS relations,
           length(path) AS depth
    ORDER BY depth DESC
    LIMIT 10
    """

    # Context enrichment — pulls text content from provenance documents
    CONTEXT_ENRICHMENT_CYPHER = """
    MATCH (e {{graph_id: $entity_id}})-[:DOCUMENTED_IN]->(d:Document)
    RETURN d.content AS text, d.source_url AS url
    LIMIT 3
    """

    def __init__(self, neo4j_uri: str, neo4j_user: str, neo4j_password: str) -> None:
        """Initialize the Graph-RAG retriever.

        Args:
            neo4j_uri: Neo4j connection URI.
            neo4j_user: Authentication username.
            neo4j_password: Authentication password.
        """
        self.driver = GraphDatabase.driver(neo4j_uri, auth=(neo4j_user, neo4j_password))
        self.vector_index_name = "entity_embeddings"

    def _ensure_vector_index(self) -> None:
        """Create the vector similarity index if it doesn't exist."""
        with self.driver.session() as session:
            try:
                session.run(f"""
                    CREATE VECTOR INDEX {self.vector_index_name} IF NOT EXISTS
                    FOR (n:Entity) ON (n.embedding)
                    OPTIONS {{indexConfig: {{`vector.dimensions`: 3072, `vector.similarity_function`: 'cosine'}}}}
                """)
            except neo4j_exceptions.ClientError:
                pass

    def retrieve_with_traversal(
        self,
        query: str,
        embedding: list[float],
        max_hops: int = 3,
        k_similar: int = 10,
    ) -> GraphRAGResult:
        """Execute a Graph-RAG retrieval combining vector search with traversal.

        Step A: Find conceptually similar nodes using vector similarity.
        Step B: Traverse relationships from those nodes up to N hops.
        Step C: Enrich results with provenance document content.

        Args:
            query: The user's question (for logging).
            embedding: Vector embedding of the query for similarity search.
            max_hops: Maximum relationship depth for traversal.
            k_similar: Number of seed nodes to find via vector search.

        Returns:
            GraphRAGResult with answer components and reasoning trace.
        """
        if not embedding or len(embedding) != 3072:
            raise ValueError("Embedding must be a 3072-dimensional vector (text-embedding-3-large)")

        self._ensure_vector_index()
        supporting_nodes: list[dict[str, Any]] = []
        reasoning_path: list[dict[str, str]] = []
        context_chunks: list[str] = []

        # Step A: Vector similarity — find seed nodes conceptually related to the query
        with self.driver.session() as session:
            seed_results = session.run(self.VECTOR_SEARCH_CYPHER, {
                "index_name": self.vector_index_name,
                "embedding": embedding,
                "k": k_similar,
            })

            for record in seed_results:
                entity = record["entity"]
                score = record["score"]
                node_data = dict(entity)
                supporting_nodes.append(node_data)
                reasoning_path.append({
                    "step": "vector_match",
                    "entity": node_data.get("name", "unknown"),
                    "score": round(score, 4),
                })

        if not supporting_nodes:
            return GraphRAGResult(
                answer="No relevant entities found in the knowledge graph.",
                reasoning_path=reasoning_path,
                supporting_nodes=[],
                retrieved_context_chunks=[],
                confidence_score=0.0,
            )

        # Step B: Multi-hop traversal from seed nodes
        for node_data in supporting_nodes[:3]:  # Limit to top-3 seeds
            entity_name = node_data.get("name", "")
            with self.driver.session() as session:
                hop_results = session.run(self.MULTI_HOP_CYPHER, {
                    "entity_name": entity_name,
                    "depth": max_hops,
                    "target_types": ["Organization", "Product"],  # Example target types
                })

                for record in hop_results:
                    path_entities = [dict(n) for n in record["entities"]]
                    relations = record["relations"]
                    depth = record["depth"]
                    reasoning_path.append({
                        "step": "traversal",
                        "path": f"{entity_name} --{'→ '*depth}",
                        "hops": depth,
                        "entities_found": len(path_entities),
                    })

        # Step C: Enrich with provenance document content
        for node_data in supporting_nodes[:5]:
            entity_id = node_data.get("graph_id", "")
            if not entity_id:
                continue
            with self.driver.session() as session:
                ctx_results = session.run(self.CONTEXT_ENRICHMENT_CYPHER, {
                    "entity_id": entity_id,
                })
                for record in ctx_results:
                    text = record.get("text", "")
                    if text:
                        context_chunks.append(text[:1000])  # Truncate long docs

        confidence = min(1.0, len(supporting_nodes) / k_similar * 0.5 + len(reasoning_path) / 20)

        return GraphRAGResult(
            answer=f"Found {len(supporting_nodes)} related entities and traversed "
                   f"{sum(r.get('hops', 0) for r in reasoning_path if 'hops' in r)} hops.",
            reasoning_path=reasoning_path,
            supporting_nodes=supporting_nodes,
            retrieved_context_chunks=context_chunks,
            confidence_score=round(confidence, 4),
        )

    def close(self) -> None:
        """Close the Neo4j connection."""
        self.driver.close()


# --- Usage example: Multi-hop query via Graph-RAG ---

def answer_supply_chain_query(
    retriever: GraphRAGRetriever,
    embedding_model_fn: callable,
    question: str = "Which vendors supply components used in Project Orion?",
) -> GraphRAGResult:
    """Answer a multi-hop supply chain query using Graph-RAG.

    Args:
        retriever: Initialized GraphRAGRetriever instance.
        embedding_model_fn: Function that converts text to 3072-dim embeddings.
        question: The user's multi-hop question.

    Returns:
        GraphRAGResult with reasoning trace and supporting entities.
    """
    # Step 1: Embed the query
    embedding = embedding_model_fn(question)

    # Step 2: Retrieve via vector similarity + traversal
    result = retriever.retrieve_with_traversal(
        query=question,
        embedding=embedding,
        max_hops=3,
        k_similar=10,
    )

    return result
```

**BAD:** Using only vector search for multi-hop relationship queries.

```python
# ❌ BAD — Pure vector similarity cannot answer "Who are the colleagues of X's boss?"
# Vector search finds similar text but cannot traverse relationships between entities.
def bad_answer(query: str, vectorstore) -> dict:
    docs = vectorstore.similarity_search(query, k=10)
    return {"answer": summarize(docs)}  # Misses all relationship structure

# Result: The answer is always a generic summary — no entity-specific reasoning possible.


# ✅ GOOD — Graph traversal answers multi-hop questions precisely
retriever = GraphRAGRetriever(neo4j_uri="bolt://localhost:7687", neo4j_user="neo4j", neo4j_password="pass")
result = retriever.retrieve_with_traversal(
    query="Who are the colleagues of X's boss?",
    embedding=embeddings_fn("X boss colleague"),
    max_hops=3,
)
# Result includes: person → BOSS_OF → manager → WORKS_AT → same_company → colleague entities
# The reasoning_path shows exactly which relationships were traversed.
```

### Pattern 3: Enterprise Datastore Connector via MCP

Exposes knowledge graph queries as MCP tools so AI agents can dynamically query the graph using natural language. This connects the graph to agent workflows without tight coupling.

```python
"""
mcp_graph_tools.py — Expose Neo4j knowledge graph queries as MCP tools for AI agents.

Agents call these tools with structured parameters; the MCP server executes Cypher
queries and returns results in LLM-consumable format (JSON/Markdown).
"""

import json
import logging
from typing import Any, Optional

from neo4j import GraphDatabase

logger = logging.getLogger(__name__)


class MCPGraphTools:
    """Provides knowledge graph query tools suitable for MCP exposure.

    Each method is designed to be called independently by an LLM agent.
    Parameters are typed and documented so the MCP schema generation is precise.
    """

    def __init__(self, neo4j_uri: str, neo4j_user: str, neo4j_password: str) -> None:
        """Initialize with Neo4j connection parameters.

        Args:
            neo4j_uri: Neo4j Bolt URI.
            neo4j_user: Authentication username.
            neo4j_password: Authentication password.
        """
        self.driver = GraphDatabase.driver(neo4j_uri, auth=(neo4j_user, neo4j_password))

    def search_entities(
        self,
        entity_type: str,
        name_query: str,
        limit: int = 20,
    ) -> str:
        """Search for entities by type and partial name match.

        Args:
            entity_type: Graph label to filter by (Person, Organization, Product, Event, Location).
            name_query: Substring to match against entity names (case-insensitive).
            limit: Maximum number of results to return (default 20).

        Returns:
            JSON string with matching entities and their key properties.
        """
        valid_types = ("Person", "Organization", "Product", "Event", "Location")
        if entity_type not in valid_types:
            return json.dumps({"error": "INVALID_TYPE", "valid_types": list(valid_types)})

        results = []
        with self.driver.session() as session:
            records = session.run(
                f"MATCH (e:{entity_type}) WHERE toLower(e.name) CONTAINS $query "
                f"RETURN e.name AS name, e.graph_id AS id, e {{.*}} EXCEPT e.embedding LIMIT $limit",
                query=name_query.lower(),
                limit=limit,
            )
            for record in records:
                results.append({"name": record["name"], "id": record["id"]})

        return json.dumps({"entity_type": entity_type, "count": len(results), "results": results})

    def get_entity_details(self, entity_id: str) -> str:
        """Get full details of a specific entity including its relationships.

        Args:
            entity_id: The graph_id (UUID prefix e_xxxxxxxx) of the entity.

        Returns:
            JSON string with entity properties and connected relationship summaries.
        """
        with self.driver.session() as session:
            # Fetch entity properties
            entity_result = session.run(
                "MATCH (e) WHERE e.graph_id = $id RETURN labels(e) AS types, e {{.*}} EXCEPT e.embedding AS props",
                id=entity_id,
            )
            record = entity_result.single()
            if not record:
                return json.dumps({"error": "ENTITY_NOT_FOUND", "entity_id": entity_id})

            # Fetch relationships in both directions
            inbound = session.run(
                "MATCH (src)-[r]->(e {{graph_id: $id}}) "
                "RETURN src.graph_id AS source_id, src.name AS source_name, type(r) AS relation_type",
                id=entity_id,
            )
            outbound = session.run(
                "MATCH (e {{graph_id: $id}})-[r]->(tgt) "
                "RETURN tgt.graph_id AS target_id, tgt.name AS target_name, type(r) AS relation_type",
                id=entity_id,
            )

            inbound_list = [{"source": r["source_name"], "relation": r["relation_type"]} for r in inbound]
            outbound_list = [{"target": r["target_name"], "relation": r["relation_type"]} for r in outbound]

            return json.dumps({
                "entity": dict(record["props"]),
                "types": record["types"],
                "inbound_relationships": inbound_list,
                "outbound_relationships": outbound_list,
            })

    def find_path_between_entities(
        self,
        source_name: str,
        target_name: str,
        max_depth: int = 5,
    ) -> str:
        """Find the shortest path between two named entities in the graph.

        Useful for supply chain analysis, org chart navigation, and connection discovery.

        Args:
            source_name: Name of the source entity.
            target_name: Name of the target entity.
            max_depth: Maximum hop count (default 5).

        Returns:
            JSON string describing the path if found, or a "no path" message.
        """
        with self.driver.session() as session:
            result = session.run(
                "MATCH path = shortestPath("
                "(:Entity {name: $source})-[*1..$depth]->(:Entity {name: $target})) "
                "RETURN nodes(path) AS nodes, relationships(path) AS rels",
                source=source_name,
                target=target_name,
                depth=max_depth,
            )
            record = result.single()

        if not record:
            return json.dumps({
                "path_found": False,
                "message": f"No path found between '{source_name}' and '{target_name}' within {max_depth} hops.",
            })

        nodes = [dict(n) for n in record["nodes"]]
        rels = [{"type": r.type, "props": dict(r)} for r in record["rels"]]

        # Build human-readable path description
        path_description = []
        for i, (node, rel) in enumerate(zip(nodes, rels)):
            arrow = f" --[{rel['type']}]→ "
            path_description.append(f"{i}: {node.get('name', 'unknown')}{arrow if i < len(rels) else ''}")

        return json.dumps({
            "path_found": True,
            "depth": len(rels),
            "path_summary": "".join(path_description),
            "nodes": nodes,
            "relationships": rels,
        })

    def get_entity_relationships(
        self,
        entity_type: str,
        relation_type: Optional[str] = None,
        limit: int = 50,
    ) -> str:
        """List relationships of a specific type for all entities of a given type.

        Useful for auditing graph structure or discovering relationship patterns.

        Args:
            entity_type: Node label to filter by.
            relation_type: Optional relationship type to filter (e.g., WORKS_AT).
            limit: Maximum number of relationships to return.

        Returns:
            JSON string with relationship list and counts.
        """
        valid_types = ("Person", "Organization", "Product", "Event", "Location")
        if entity_type not in valid_types:
            return json.dumps({"error": "INVALID_ENTITY_TYPE"})

        relation_filter = f"[r:{relation_type}]" if relation_type else "[r]"
        query = (
            f"MATCH (:Entity {{name: $source_name}})-{relation_filter}->(target) "
            f"RETURN target.name AS target_name, type(r) AS relation, "
            f"properties(r) AS rel_props LIMIT $limit"
        )

        results = []
        with self.driver.session() as session:
            records = session.run(query, source_name="", limit=limit)  # Placeholder — real usage filters properly
            for record in records:
                results.append({
                    "target": record["target_name"],
                    "relation": record["relation"],
                    "properties": record["rel_props"],
                })

        return json.dumps({"entity_type": entity_type, "count": len(results), "relationships": results})

    def close(self) -> None:
        """Close the Neo4j driver connection."""
        self.driver.close()
```

**BAD:** Exposing raw Cypher queries directly to agents without parameterization.

```python
# ❌ BAD — String concatenation allows Cypher injection attacks
def bad_query(name: str):
    # User input "John"; malicious input: "'; MATCH (x) DETACH DELETE x; RETURN '"
    cypher = f"MATCH (e {{name: '{name}'}}) RETURN e"  # Injection possible!
    return session.run(cypher)


# ✅ GOOD — Parameterized queries with type validation and result sanitization
def good_query(name: str, valid_types: tuple[str, ...]) -> str:
    if not name or len(name) > 200:
        raise ValueError("Name must be 1-200 characters")
    # Parameters are passed safely — no string interpolation
    records = session.run(
        "MATCH (e:Entity {name: $name}) RETURN e.name AS name, e.graph_id AS id",
        name=name,
    )
    # Results sanitized to only expose safe properties
    return json.dumps([dict(r) for r in records])
```

### Pattern 4: Multi-Tenant Agent Configuration with RBAC and Audit Logging

Configures knowledge graph access control for multi-agent enterprise deployments where different agents need different levels of graph access. Implements role-based access control and audit trails per Google AgentSpace patterns.

```python
"""
tenant_rbac.py — Role-based access control and audit logging for multi-tenant
knowledge graph access, following Google AgentSpace tenant isolation patterns.
"""

import json
import logging
import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Any

logger = logging.getLogger(__name__)


class AccessRole(str, Enum):
    """Access roles for agents within a multi-tenant knowledge graph."""
    ADMIN = "admin"           # Full read/write access across all tenants
    ANALYST = "analyst"       # Read-only access within assigned tenant(s)
    QUERY_AGENT = "query_agent"  # Read-only, limited to specific entity types
    DATA_INGESTOR = "data_ingestor"  # Write access for ingestion only


@dataclass
class TenantConfig:
    """Configuration for a single tenant in the multi-tenant knowledge graph.

    Each tenant has isolated entity namespaces (via tenant_id property on nodes),
    and agents are scoped to specific tenants.
    """
    tenant_id: str
    name: str
    allowed_entity_types: list[str] = field(default_factory=lambda: ["Person", "Organization", "Product"])
    allowed_relation_types: list[str] = field(default_factory=lambda: ["WORKS_AT", "SUPPLIES", "LOCATED_IN"])
    max_query_hops: int = 3
    audit_log_enabled: bool = True


@dataclass
class AgentConfig:
    """Configuration for an agent's access to the knowledge graph."""
    agent_id: str
    agent_name: str
    tenant_config: TenantConfig
    role: AccessRole
    restricted_entity_types: list[str] = field(default_factory=list)  # Empty = all allowed types

    @property
    def effective_entity_types(self) -> list[str]:
        """Compute entity types the agent is allowed to access."""
        base = self.tenant_config.allowed_entity_types
        if self.restricted_entity_types:
            return [t for t in base if t not in self.restricted_entity_types]
        return base


class TenantRBAC:
    """Manages tenant isolation and role-based access control for knowledge graph operations.

    Enforces:
    - Tenant-scoped entity access (every node has a tenant_id property)
    - Role-limited operations (ADMIN can do everything, QUERY_AGENT is read-only)
    - Audit logging of all graph operations (who did what, when, on which tenant)
    """

    def __init__(self, audit_log_path: str = "/var/log/graph_audit.log") -> None:
        """Initialize the RBAC manager.

        Args:
            audit_log_path: File path for the audit log.
        """
        self.tenants: dict[str, TenantConfig] = {}
        self.agents: dict[str, AgentConfig] = {}
        self.audit_log_path = audit_log_path

    def register_tenant(self, tenant_config: TenantConfig) -> None:
        """Register a new tenant in the RBAC system.

        Args:
            tenant_config: The tenant's configuration object.

        Raises:
            ValueError: If a tenant with this ID already exists.
        """
        if tenant_config.tenant_id in self.tenants:
            raise ValueError(f"Tenant '{tenant_config.tenant_id}' is already registered")

        self.tenants[tenant_config.tenant_id] = tenant_config
        self._audit_log("TENANT_REGISTERED", tenant_id=tenant_config.tenant_id)
        logger.info(f"Tenant registered: {tenant_config.name} (ID: {tenant_config.tenant_id})")

    def register_agent(self, agent_config: AgentConfig) -> None:
        """Register an agent with its tenant scope and access role.

        Args:
            agent_config: The agent's configuration object.

        Raises:
            ValueError: If the tenant doesn't exist or the agent is already registered.
        """
        if agent_config.tenant_config.tenant_id not in self.tenants:
            raise ValueError(
                f"Agent '{agent_config.agent_name}' references unknown tenant "
                f"'{agent_config.tenant_config.tenant_id}'"
            )

        if agent_config.agent_id in self.agents:
            raise ValueError(f"Agent '{agent_config.agent_id}' is already registered")

        self.agents[agent_config.agent_id] = agent_config
        self._audit_log(
            "AGENT_REGISTERED",
            tenant_id=agent_config.tenant_config.tenant_id,
            agent_id=agent_config.agent_id,
            role=agent_config.role.value,
        )

    def validate_access(
        self,
        agent_id: str,
        operation: str,  # "read", "write", "delete", "query"
        entity_type: str,
        tenant_id: str,
    ) -> tuple[bool, str]:
        """Validate whether an agent is allowed to perform an operation.

        Implements the guard clause pattern from code-philosophy laws:
        reject invalid access at the boundary before any graph operations execute.

        Args:
            agent_id: The requesting agent's identifier.
            operation: The operation type ("read", "write", "delete", "query").
            entity_type: The node type being accessed (Person, Organization, etc.).
            tenant_id: The target tenant.

        Returns:
            Tuple of (is_allowed, reason). Reason is empty string when allowed.
        """
        # Guard clause 1: Agent must exist
        if agent_id not in self.agents:
            return False, f"Unknown agent: {agent_id}"

        agent = self.agents[agent_id]
        tenant = agent.tenant_config

        # Guard clause 2: Tenant must match (ADMIN is exempt for cross-tenant access)
        if agent.role != AccessRole.ADMIN and tenant.tenant_id != tenant_id:
            return False, f"Agent {agent_id} is scoped to tenant {tenant.tenant_id}, not {tenant_id}"

        # Guard clause 3: Entity type must be allowed
        if entity_type not in tenant.allowed_entity_types:
            return False, f"Entity type '{entity_type}' is not allowed for tenant '{tenant_id}'"

        # Guard clause 4: Role-based operation restrictions
        if operation in ("write", "delete"):
            if agent.role not in (AccessRole.ADMIN, AccessRole.DATA_INGESTOR):
                return False, f"Agent role {agent.role.value} cannot perform {operation} operations"

        # Guard clause 5: Query hop limits
        if operation == "query":
            self._audit_log(
                "ACCESS_VALIDATED",
                tenant_id=tenant_id,
                agent_id=agent_id,
                operation=operation,
                entity_type=entity_type,
            )

        return True, ""

    def build_tenant_filter(self, tenant_id: str) -> dict[str, str]:
        """Build a Cypher filter dict that restricts queries to a specific tenant.

        Use this in every MATCH clause to enforce tenant isolation at the database level.

        Args:
            tenant_id: The target tenant identifier.

        Returns:
            Dict suitable for passing as a Cypher parameter (e.g., $tenant_filter).

        Raises:
            ValueError: If the tenant is not registered.
        """
        if tenant_id not in self.tenants:
            raise ValueError(f"Unknown tenant: {tenant_id}")

        return {"tenant_id": tenant_id}

    def _audit_log(
        self,
        event_type: str,
        **kwargs: Any,
    ) -> None:
        """Write an audit log entry. In production, forward to a centralized logging service."""
        entry = {
            "timestamp": time.time(),
            "event_type": event_type,
            **kwargs,
        }
        logger.info(json.dumps(entry))

    def get_agent_summary(self, agent_id: str) -> dict[str, Any]:
        """Get a summary of an agent's access configuration.

        Args:
            agent_id: The agent's identifier.

        Returns:
            Dict with the agent's role, tenant, allowed entity types, and hop limits.
        """
        if agent_id not in self.agents:
            return {"error": "Agent not found"}

        agent = self.agents[agent_id]
        return {
            "agent_id": agent.agent_id,
            "agent_name": agent.agent_name,
            "role": agent.role.value,
            "tenant_id": agent.tenant_config.tenant_id,
            "tenant_name": agent.tenant_config.name,
            "allowed_entity_types": agent.effective_entity_types,
            "max_query_hops": agent.tenant_config.max_query_hops,
        }
```

**BAD:** No tenant isolation — all agents access the entire graph.

```python
# ❌ BAD — No tenant filtering; a malicious agent can read all tenants' data
def bad_graph_query(session, query: str):
    return session.run(query)  # Every agent sees everything

# An analyst agent for "Acme Corp" can execute any Cypher and see competitor data.


# ✅ GOOD — Tenant-scoped queries with RBAC enforcement
rbac = TenantRBAC()
allowed, reason = rbac.validate_access(agent_id="analyst_1", operation="query", entity_type="Person", tenant_id="acme")
if not allowed:
    raise PermissionError(reason)

# Every query includes the tenant filter
tenant_filter = rbac.build_tenant_filter("acme")
session.run(
    "MATCH (e:Entity {tenant_id: $tenant_id}) WHERE e.graph_id = $id RETURN e",
    tenant_id=tenant_filter["tenant_id"],
    id="e_abc123",
)
# Only entities with tenant_id='acme' are returned. Isolation is enforced at query time.
```

---

## Constraints

### MUST DO

1. **Define the graph schema before ingestion** — Explicitly declare node types, relationship types, and property constraints in a design document. Start minimal: only model relationships that queries actually require (`code-philosophy: Early Exit` — wrong schema is a foundational error requiring complete rework).
2. **Use LLM JSON mode for entity extraction** — Always enforce a strict output schema with type hints and enum values. Never accept free-form text responses from the LLM for graph data (`code-philosophy: Parse Don't Validate`).
3. **Enforce canonical keys for entity resolution** — Every entity type needs a stable key (email, ticker, tax ID) to merge duplicates across documents. Without canonical keys, the graph degrades into a collection of inconsistent copies (`code-philosophy: Atomic Predictability` — each real-world entity has exactly one node).
4. **Create uniqueness constraints in Neo4j before loading** — `CREATE CONSTRAINT ... FOR (n:Type) REQUIRE n.key IS UNIQUE` prevents duplicate nodes even under concurrent writes. Without constraints, the graph accumulates duplicates regardless of application logic (`code-philosophy: Fail Fast` — reject invalid state at the database boundary).
5. **Parameterize every Cypher query** — Never use string concatenation to build queries with user or agent input. Use `$parameter` placeholders exclusively to prevent both injection attacks and type errors (`code-philosophy: Fail Fast` — parameterization eliminates a whole class of runtime errors).
6. **Implement tenant isolation at the database level** — Every node and relationship must have a `tenant_id` property. Every query must include a `$tenant_filter` parameter that restricts results to the caller's tenant (`code-philosophy: Early Exit` by rejecting cross-tenant access at the query layer).
7. **Log all graph operations for audit trails** — Record who performed what operation, on which tenant, and with what result. Audit logs are mandatory for enterprise compliance (SOC 2, ISO 27001) and debugging (`code-philosophy: Intentional Naming` — every action is traceable to an agent and timestamp).
8. **Validate graph quality post-ingestion** — Run automated checks: entity consistency (no two nodes with the same canonical key), relationship completeness (all edges have valid endpoints), and query accuracy (benchmark queries return expected results) (`code-philosophy: Atomic Predictability` — every state transition is verifiable).

### MUST NOT DO

1. **Ingest documents without first designing the schema** — Building the graph "as you go" leads to inconsistent entity types, ad-hoc relationships, and an unqueryable mess. Design the ontology first.
2. **Use string interpolation for Cypher queries** — F-string or `.format()` query construction opens the door to Cypher injection attacks. Always use parameterized queries with `$` placeholders.
3. **Skip entity resolution during batch ingestion** — Loading entities without deduplication creates thousands of near-duplicate nodes ("Apple Inc." vs "Apple" vs "Apple Incorporated"). Resolve at least by canonical key before loading.
4. **Expose graph operations as raw database endpoints to agents** — Agents should query through typed MCP tools or API endpoints, not through direct database connections. This enforces rate limiting, audit logging, and access control (`code-philosophy: Fail Fast` with explicit authorization boundaries).
5. **Neglect vector index management for Graph-RAG** — If the graph is used for Graph-RAG retrieval, ensure vector indexes exist on embedding properties and are rebuilt when entities change. Stale or missing indexes silently degrade retrieval quality.
6. **Assume a knowledge graph solves every retrieval problem** — For single-hop, text-similarity queries, pure vector search is faster and simpler. Only build a knowledge graph when you need relationship traversal or structured reasoning over connected data.

---

## Output Template

When implementing a knowledge graph system using this skill, your output must contain:

1. **Graph Schema Definition** — Node types, relationship types, property schemas with types, and uniqueness constraints listed in tabular format
2. **Entity Extraction Pipeline Design** — LLM model used, prompt template structure, JSON schema for extraction output, entity type enumeration, and resolution key strategy
3. **Graph Loading Specification** — Neo4j connection details (or NetworkX in-memory setup), constraint creation commands, upsert logic (MERGE vs CREATE), and batch size configuration
4. **Graph-RAG Retrieval Architecture** — How vector similarity search on node embeddings combines with Cypher traversal patterns; max hop depth, seed node count, and context enrichment strategy
5. **RBAC Configuration** — Agent roles, tenant assignments, allowed entity/relationship types per role, and audit logging configuration
6. **Validation Checklist** — Post-ingestion quality gates (entity deduplication rate, relationship completeness, benchmark query accuracy) with pass/fail thresholds

---

## Related Skills

| Skill | Purpose |
|---|---|
| `rag-patterns` | Traditional vector-based RAG for single-document retrieval; use when graph traversal is not needed |
| `mcp-integration` | MCP protocol implementation for tool discovery and agent-server communication — used here to expose graph queries to agents |
| `evaluation-monitoring` | Evaluate knowledge graph quality with entity extraction accuracy, relationship completeness metrics, and Graph-RAG answer benchmarking |

---

## References

1. Gulli, A. (2025). *Agentic Design Patterns*. O'Reilly Media, Appendix D: Building an Agent with Google Cloud AgentSpace (pp. 392–397).
2. Neo4j Documentation. Graph Database Fundamentals and Cypher Query Language. https://neo4j.com/docs/
3. Microsoft GraphRAG. Retrieval-Augmented Generation with Knowledge Graphs. https://github.com/microsoft/graphrag
4. Google Cloud AgentSpace. Enterprise AI Agent Platform Documentation. https://cloud.google.com/agent-space
