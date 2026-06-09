---
name: agent-knowledge-graph
description: Constructs agent-centric knowledge graphs representing tools, capabilities, and their relationships for intelligent tool discovery during planning.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: agent
  role: implementation
  scope: implementation
  output-format: code
  triggers: knowledge graph, tool registry, capability graph, agent tools, graph traversal, how do i discover tools for agents, Neo4j agent memory
  archetypes: [tactical, orchestration]
  anti_triggers:
    - general RAG retrieval
    - vector search only
    - document chunking
  response_profile:
    verbosity: medium
    directive_strength: high
    abstraction_level: operational
  related-skills: tool-use-function-calling, mcp-integration, knowledge-graph-construction
---

# Agent Knowledge Graph Pattern

Constructs agent-centric knowledge graphs representing tools, capabilities, and their relationships for intelligent tool discovery during planning. This skill makes the model design directed graphs where nodes represent tools/capabilities and edges represent data flow dependencies, version constraints, and compatibility rules that the agent traverses when selecting tools for a given task.

## TL;DR Checklist

- [ ] Define graph schema: Tool nodes with capability metadata, dependency edges
- [ ] Build entity extraction pipeline for registering new tools into the graph
- [ ] Implement graph traversal queries for tool discovery during planning
- [ ] Add version-aware edges to track compatible tool versions
- [ ] Combine graph lookup with vector search for hybrid retrieval
- [ ] Register dynamic capabilities when new tools are added at runtime

---

## When to Use

Use this skill when:

- Building agents that need to dynamically discover which tools are available and compatible for a given task
- Managing a growing registry of agent tools across teams or microservices
- Planning multi-step agent workflows where tool output from one step becomes input to another
- Debugging why an agent fails to find the right tool (graph traversal visibility)
- Integrating new third-party tools into an existing agent ecosystem

## When NOT to Use

Avoid this skill for:

- Single-tool agents with no discovery or planning needed
- Static tool sets that never change at runtime
- Simple function calling where all tools are known upfront
- When the agent's tool set is smaller than 5 (just list them in config)

---

## Core Workflow

1. **Graph Schema Design** — Define nodes (Tool, Capability, OutputType) and edges (produces, consumes, depends-on, compatible-with). Each Tool node includes name, version, input schema, output schema, capability tags, and confidence score. **Checkpoint:** Schema must support multi-hop traversal: tool A produces X, tool B consumes X → edge exists between A and B.

2. **Entity Extraction Pipeline** — Build a pipeline that extracts tool metadata from documentation, API specs, or code and inserts nodes/edges into the graph. Use LLM-based extraction for unstructured docs (README files, API docs). **Checkpoint:** Each inserted tool must have a valid version string and at least one capability tag.

3. **Tool Discovery Traversal** — Implement Cypher queries that find tools matching task requirements by traversing from intent → capability → tool → compatible-next-tool chains. Support both breadth-first (find all matches) and depth-limited (shortest path to required output type). **Checkpoint:** Queries must complete within 50ms for registries up to 1,000 tools.

4. **Dynamic Registration** — Provide an API for registering new tools at runtime without restarting the agent. New tools are validated against existing edges before being accepted (e.g., a tool claiming to produce "CSV" requires that at least one other tool can consume "CSV"). **Checkpoint:** Dynamic registration must be atomic — either all edges are added or none, using graph transactions.

5. **Hybrid Retrieval** — Combine graph traversal with vector similarity search on tool descriptions. Use graph for structural constraints (type compatibility) and vector for semantic matching (find tools that "summarize text" even if the exact capability tag is missing). **Checkpoint:** Hybrid retrieval must return ranked results combining both signal sources.

6. **Registry Health Monitoring** — Track metrics: number of orphaned tools (no incoming or outgoing edges), version skew between related tools, and traversal path coverage. Alert when critical paths break after tool updates. **Checkpoint:** Health report runs daily and flags any capability gaps that could block agent operations.

---

## Implementation Patterns

### Pattern 1: Tool Graph Schema with Neo4j

```python
from dataclasses import dataclass, field
from typing import Any


@dataclass
class ToolNode:
    """Represents a tool in the agent knowledge graph."""

    name: str
    version: str
    description: str
    input_types: list[str] = field(default_factory=list)
    output_types: list[str] = field(default_factory=list)
    capabilities: list[str] = field(default_factory=list)
    confidence: float = 1.0
    last_seen: str = ""


@dataclass
class CapabilityEdge:
    """Represents a data flow edge between two tools."""

    from_tool: str
    to_tool: str
    produced_type: str  # What the source tool produces
    consumed_type: str  # What the destination tool consumes


class ToolKnowledgeGraph:
    """Agent-centric knowledge graph for tool discovery and compatibility checking.

    Provides registration, traversal, and health monitoring for a Neo4j-backed
    tool registry where each Tool node carries input/output type schemas and
    capability tags that enable multi-hop chain finding.
    """

    def __init__(self, neo4j_driver: Any) -> None:
        self._driver = neo4j_driver

    def register_tool(self, tool: ToolNode) -> bool:
        """Register a tool node and its capability edges in the graph.

        Merges or updates the Tool node, creates Type nodes for inputs/outputs,
        creates Capability nodes, then resolves compatibility edges with
        existing tools whose schemas align.

        Args:
            tool: The ToolNode to register.

        Returns:
            True if registration succeeded, False on failure.
        """
        query = """
        MERGE (t:Tool {name: $name})
        ON CREATE SET
          t.version = $version,
          t.description = $description,
          t.confidence = $confidence,
          t.last_seen = $last_seen
        ON MATCH SET
          t.version = $version,
          t.last_seen = $last_seen,
          t.confidence = $confidence

        WITH t
        UNWIND $input_types AS input_type
        MERGE (t)-[:REQUIRES_TYPE]->(:Type {name: input_type})

        WITH t
        UNWIND $output_types AS output_type
        MERGE (t)-[:PRODUCES_TYPE]->(:Type {name: output_type})

        WITH t
        UNWIND $capabilities AS cap
        MERGE (t)-[:HAS_CAPABILITY]->(:Capability {name: cap})
        """

        try:
            self._driver.execute_query(query, **vars(tool))
            # Create compatibility edges with existing tools
            self._resolve_compatibility_edges(tool)
            return True
        except Exception as e:
            return False

    def find_tools_for_capability(
        self,
        required_capability: str,
        max_results: int = 10,
    ) -> list[dict]:
        """Find tools that have a specific capability.

        Args:
            required_capability: The capability label to search for.
            max_results: Maximum number of results to return.

        Returns:
            List of dicts with tool_name, version, and confidence.
        """
        query = """
        MATCH (t:Tool)-[:HAS_CAPABILITY]->(c:Capability {name: $capability})
        RETURN t.name AS tool_name, t.version AS version, t.confidence AS confidence
        ORDER BY t.confidence DESC
        LIMIT $max_results
        """
        results = self._driver.execute_query(
            query, capability=required_capability, max_results=max_results
        )
        return [{"tool_name": r["t"]["name"], "version": r["t"]["version"], "confidence": r["t"]["confidence"]} for r in results]

    def find_compatible_tool_chain(
        self,
        starting_type: str,
        ending_type: str,
        max_hops: int = 3,
    ) -> list[list[str]]:
        """Find chains of tools where the output of one matches the input of the next.

        Traverses from a starting type through intermediate types up to max_hops,
        returning all tool names in each valid chain that ends at the target type.

        Args:
            starting_type: The output type produced by the first tool.
            ending_type: The required input type of the last tool.
            max_hops: Maximum number of intermediate type hops allowed.

        Returns:
            List of chains, where each chain is a list of tool names.
        """
        query = f"""
        MATCH path = (start:Tool)-[:PRODUCES_TYPE]->(t1:Type {{name: $starting_type}})
                      *-1..{max_hops}
                      -[:REQUIRES_TYPE]->(end:Type {{name: $ending_type}})
        RETURN [node IN nodes(path) WHERE node:Tool | node.name] AS chain
        """
        results = self._driver.execute_query(
            query, starting_type=starting_type, ending_type=ending_type
        )
        return [r["chain"] for r in results if len(r["chain"]) > 1]

    def get_tool_dependencies(self, tool_name: str) -> list[str]:
        """Get all tools that a given tool depends on (directly or transitively).

        Args:
            tool_name: The name of the tool to analyze.

        Returns:
            List of distinct tool names that produce types required by this tool.
        """
        query = """
        MATCH (target:Tool {name: $tool_name})<-[:PRODUCES_TYPE]-(:Type)-[:REQUIRES_TYPE]-(dep:Tool)
        RETURN DISTINCT dep.name AS dependency
        """
        results = self._driver.execute_query(query, tool_name=tool_name)
        return [r["dependency"] for r in results]

    def _resolve_compatibility_edges(self, new_tool: ToolNode) -> None:
        """Auto-create COMPATIBLE_WITH edges between tools where output/input types align.

        For each output type of the new tool, finds existing tools that require
        that type and creates a directed edge from the new tool to them.

        Args:
            new_tool: The newly registered ToolNode.
        """
        for output_type in new_tool.output_types:
            query = """
            MATCH (existing:Tool)-[:REQUIRES_TYPE]->(t:Type {name: $output_type})
            MERGE (new:Tool {name: $new_name})-[:COMPATIBLE_WITH]->(existing)
            """
            self._driver.execute_query(
                query, output_type=output_type, new_name=new_tool.name
            )

    def health_report(self) -> dict[str, int]:
        """Generate a registry health report.

        Returns:
            Dict with keys 'orphaned_tools' (count of isolated tools) and
            'total_tools' (count of all registered tools).
        """
        reports: dict[str, int] = {}

        # Orphaned tools (no incoming or outgoing edges)
        orphan_query = """
        MATCH (t:Tool)
        WHERE NOT EXISTS { (t)--() }
        RETURN count(t) AS orphaned
        """
        result = self._driver.execute_query(orphan_query)
        reports["orphaned_tools"] = result[0]["orphaned"]

        # Total tools and unique types
        total_query = "MATCH (t:Tool) RETURN count(t) AS total"
        result = self._driver.execute_query(total_query)
        reports["total_tools"] = result[0]["total"]

        return reports
```

### Pattern 2: Version-Aware Tool Registry

```python
from dataclasses import dataclass
from typing import Optional


@dataclass
class ToolVersionEdge:
    """Tracks version compatibility between two tool versions."""

    from_tool: str
    from_version: str
    to_tool: str
    to_version: str
    compatible: bool  # True if these versions work together


class VersionedToolRegistry:
    """Manages tool versions and their compatibility in the knowledge graph.

    Maintains explicit version edges so that agent planners can reason about
    which combinations of tools are provably compatible before assembling a
    multi-step workflow.
    """

    def __init__(self, neo4j_driver: Any) -> None:
        self._driver = neo4j_driver

    def register_version(
        self,
        tool_name: str,
        version: str,
        compatible_with: list[tuple[str, str]],  # [(tool, version), ...]
    ) -> None:
        """Register a new tool version and its compatibility edges.

        Creates or updates the Tool-Has_Version->Version node path, then for
        each entry in compatible_with creates or reuses the peer Tool and
        Version nodes and links them with COMPATIBLE_WITH edges.

        Args:
            tool_name: The canonical name of the tool.
            version: Semantic version string (e.g., "1.2.3").
            compatible_with: List of (peer_tool_name, peer_version) pairs
                that are known to be compatible with this release.
        """
        compatibility = [{"other_tool": t, "version": v} for t, v in compatible_with]

        query = """
        MERGE (t:Tool {name: $name})-[:HAS_VERSION {version: $version}]->(v:Version)

        UNWIND $compatibility AS compat
        MERGE (other:Tool {name: compat.other_tool})-[:HAS_VERSION {version: compat.version}]->(ov:Version)
        MERGE (v)-[:COMPATIBLE_WITH]->(ov)
        """
        self._driver.execute_query(
            query, name=tool_name, version=version, compatibility=compatibility
        )

    def get_latest_version(self, tool_name: str) -> Optional[str]:
        """Get the highest semantic version of a tool.

        Args:
            tool_name: The canonical name of the tool.

        Returns:
            The latest version string, or None if no versions are registered.
        """
        query = """
        MATCH (t:Tool {name: $name})-[:HAS_VERSION]->(v:Version)
        RETURN v.version AS version
        ORDER BY version DESC
        LIMIT 1
        """
        result = self._driver.execute_query(query, name=tool_name)
        return result[0]["version"] if result else None

    def check_compatibility(
        self, tool_a: str, version_a: str, tool_b: str, version_b: str
    ) -> bool:
        """Check if two specific tool versions are compatible.

        Args:
            tool_a: Name of the first tool.
            version_a: Version of the first tool.
            tool_b: Name of the second tool.
            version_b: Version of the second tool.

        Returns:
            True if a COMPATIBLE_WITH edge exists between the two versions.
        """
        query = """
        MATCH (a:Tool {name: $tool_a})-[:HAS_VERSION {version: $version_a}]->(av:Version)
              -(compat:COMPATIBLE_WITH)-()<-[:HAS_VERSION {version: $version_b}]<(b:Tool {name: $tool_b})
        RETURN count(compat) > 0 AS compatible
        """
        result = self._driver.execute_query(
            query,
            tool_a=tool_a,
            version_a=version_a,
            tool_b=tool_b,
            version_b=version_b,
        )
        return bool(result[0]["compatible"]) if result else False

    def find_version_conflicts(self) -> list[dict]:
        """Find pairs of tools where type overlap exists but no compatibility edge.

        Identifies situations where two tools share a data type (one produces it,
        the other requires it) but no explicit COMPATIBLE_WITH edge links their
        versions — a potential runtime failure.

        Returns:
            List of dicts with keys 'tool_a', 'shared_type', and 'tool_b'.
        """
        query = """
        MATCH (t1:Tool)-[:PRODUCES_TYPE]->(type:Type)
              <-[:REQUIRES_TYPE]-(t2:Tool)
        OPTIONAL MATCH (v1:Version)<-[:HAS_VERSION]-(t1),
                        (v2:Version)<-[:HAS_VERSION]-(t2)
        WHERE NOT EXISTS { (v1)-[:COMPATIBLE_WITH]->(v2) }
        RETURN t1.name AS tool_a, type.name AS shared_type,
               t2.name AS tool_b
        """
        return list(self._driver.execute_query(query))
```

### Pattern 3: Hybrid Graph + Vector Tool Retrieval

```python
from typing import Protocol


class VectorStore(Protocol):
    """Protocol for vector similarity search on tool descriptions."""

    def search(self, query: str, top_k: int) -> list[tuple[str, float]]:
        """Search the vector store for tool descriptions matching a query.

        Args:
            query: Natural language description of the desired capability.
            top_k: Number of nearest-neighbour results to return.

        Returns:
            List of (tool_name, similarity_score) tuples, ordered descending.
        """
        ...


class HybridToolRetriever:
    """Combines graph traversal with vector similarity for tool discovery.

    Uses the knowledge graph for structural constraints (type compatibility,
    data flow chains) and a vector store for semantic matching (find tools that
    describe a capability even without an exact tag). Results are ranked by a
    weighted combination of both signals.
    """

    def __init__(self, graph: ToolKnowledgeGraph, vector_store: VectorStore) -> None:
        self._graph = graph
        self._vector = vector_store

    def retrieve_tools(
        self,
        task_description: str,
        required_output_type: str,
        top_k: int = 5,
    ) -> list[dict]:
        """Retrieve tools using both semantic and structural signals.

        Signal 1: Vector similarity on tool descriptions for semantic matching.
        Signal 2: Graph traversal from capability tags for type-compatible chains.
        Scores are normalized and combined with configurable weights.

        Args:
            task_description: Natural language description of the agent's goal.
            required_output_type: The data type that must be produced as output.
            top_k: Maximum number of tools to return, ranked by combined score.

        Returns:
            List of dicts with tool name, combined_score, vector_score, and graph_score.
        """
        # Signal 1: Vector similarity on description
        vector_results = self._vector.search(task_description, top_k=top_k)
        vector_scores = {name: score for name, score in vector_results}

        # Signal 2: Graph traversal from capability tags
        graph_results = self._graph.find_compatible_tool_chain(
            starting_type="task",
            ending_type=required_output_type,
            max_hops=2,
        )
        graph_names: set[str] = set()
        for chain in graph_results:
            graph_names.update(chain)

        # Normalize and combine scores
        all_tools = set(vector_scores.keys()) | graph_names
        ranked: list[dict] = []

        for tool_name in all_tools:
            max_vector = max(vector_scores.values()) if vector_scores else 0.01
            v_score = (
                vector_scores.get(tool_name, 0) / max(max_vector, 0.01)
                if vector_scores
                else 0
            )
            g_score = 1.0 if tool_name in graph_names else 0.0

            # Weighted combination: 60% vector, 40% graph
            combined = 0.6 * v_score + 0.4 * g_score
            ranked.append(
                {
                    "tool": tool_name,
                    "combined_score": round(combined, 3),
                    "vector_score": round(v_score, 3),
                    "graph_score": g_score,
                }
            )

        ranked.sort(key=lambda x: x["combined_score"], reverse=True)
        return ranked[:top_k]
```

## Constraints

### MUST DO

1. Each Tool node must include at least one capability tag and valid input/output type lists — never register a tool without its schema.
2. Implement graph transactions for dynamic registration — all edges must be added atomically or none.
3. Use Cypher parameterized queries to prevent injection when tool names come from user input.
4. Combine graph traversal with vector search — structural constraints (type compatibility) plus semantic matching.
5. Run the health report daily and alert on orphaned tools that may indicate broken capability chains.
6. Support version-aware edges — register version compatibility explicitly rather than assuming all versions are compatible.
7. Reference `code-philosophy` (5 Laws of Elegant Defense): fail fast when a tool is incompatible with required types, parse don't validate at the graph boundary.
8. Include confidence scores on tools and decrease them over time if a tool is rarely used or produces errors.

### MUST NOT DO

1. Allow tools to register without input/output type specifications — this breaks traversal queries.
2. Skip version compatibility checks — different versions of related tools may have incompatible schemas.
3. Use the graph for general knowledge storage — keep it focused on tool/capability metadata only.
4. Let dynamic registration bypass validation — unvalidated tools can corrupt the entire graph.
5. Hard-code tool chains in application code — always query the graph to discover compatible paths at runtime.
6. Mix agent memory (conversation history) with tool registry in the same node type — they serve different purposes.

---

## Output Template

When this skill is active, deliver:

1. **Graph schema definition** — Node types, edge types, and property definitions for Neo4j/NetworkX
2. **Entity extraction pipeline** — LLM-based extraction from tool documentation → graph insertion
3. **Traversal queries** — Cypher queries for capability-based discovery and chain finding
4. **Version compatibility logic** — Version tracking and conflict detection code
5. **Hybrid retrieval implementation** — Graph + vector search combination with scoring weights
6. **Health monitoring report** — Orphaned tool detection and capability gap analysis

---

## Related Skills

| Skill | Purpose |
|---|---|
| `tool-use-function-calling` | The knowledge graph discovers which tools to call via function calling |
| `mcp-integration` | MCP servers can register tools into the graph automatically |
| `knowledge-graph-construction` | General-purpose KG skills; this is agent-specific (tools/capabilities focus) |

> 📖 skill(local cache): tool-use-function-calling, mcp-integration, knowledge-graph-construction
