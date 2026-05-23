# Agent Skill Router Improvement Implementation Prompt

You are improving an existing AI Agent Skill Router system.

The current router already supports:

- vector embeddings
- cosine similarity retrieval
- skill metadata
- reranking
- selective loading
- compression

The current problem is:

The router finds semantically relevant skills, but often fails to prioritize the MOST operationally useful, succinct, directive, and contextually appropriate skill.

Your goal is to evolve the router from:

> “semantic similarity retrieval”

into:

> “high-leverage intent-aware skill selection.”

You must implement the following architectural improvements.

---

# HIGH-LEVEL OBJECTIVES

The new router should:

1. Prefer concise tactical skills when appropriate
2. Reduce generic/meta skill dominance
3. Distinguish between execution styles
4. Penalize semantically broad skills
5. Support intent-aware routing
6. Improve retrieval diversity
7. Support adaptive learning from usage
8. Improve ranking quality over pure cosine similarity

---

# IMPLEMENTATION REQUIREMENTS

---

## 1. ADD ROUTING ARCHETYPES

Add a new classification system called `archetypes`.

Each skill can belong to one or more archetypes.

Required archetypes:

- tactical
- strategic
- diagnostic
- orchestration
- educational
- enforcement
- generation

Add archetype metadata to skills.

Example:

```yaml
archetypes:
  - tactical
  - diagnostic

Implement query archetype inference.

Examples:

"fix this ingress timeout"
→ tactical + diagnostic

"design a scalable event bus"
→ strategic

"teach me how kubernetes networking works"
→ educational

During ranking:

boost archetype matches

penalize archetype mismatches



---

2. ADD NEGATIVE ROUTING SIGNALS

Add anti-trigger support.

Example:

anti_triggers:
  - brainstorming
  - vague ideation
  - long-form architecture

If query intent conflicts with anti-triggers:

apply a ranking penalty


Goal:

Prevent large generic skills from dominating retrieval.


---

3. IMPLEMENT SPECIFICITY SCORING

Implement a specificity scoring system.

Problem

Generic/meta skills currently dominate vector space.

Create heuristics that estimate specificity.

Possible approaches:

unique technical term density

noun entropy

domain-specific vocabulary ratio

embedding neighborhood density


Compute:

specificity_score = unique_technical_terms / total_terms

Use specificity as a multiplicative ranking boost.

Goal:

Highly specialized skills should outrank generic orchestration skills unless orchestration is explicitly requested.


---

4. IMPLEMENT HYBRID RETRIEVAL

Replace pure vector search with hybrid retrieval.

New scoring model:

final_score = (
    vector_similarity * 0.50 +
    bm25_score * 0.20 +
    trigger_match * 0.15 +
    archetype_match * 0.10 +
    historical_success * 0.05
)

Requirements:

add BM25 indexing

preserve vector search

combine scores with normalization


The system must support:

semantic retrieval

exact technical phrase retrieval

acronym matching

short query matching



---

5. ADD MULTI-VECTOR EMBEDDINGS

Instead of one embedding per skill, support multiple embeddings.

Required embedding categories:

capability_embedding

execution_embedding

tooling_embedding

verbosity_embedding

orchestration_embedding


Examples:

Capability

“What problem does this solve?”

Execution

“How does this skill behave?”

Tooling

“What technologies/tools are involved?”

Verbosity

“Short tactical vs deep strategic”

Orchestration

“Standalone vs delegating”

Update retrieval to score these independently.

Example:

final_score = (
    capability_score * 0.45 +
    execution_score * 0.25 +
    tooling_score * 0.20 +
    verbosity_score * 0.10
)


---

6. ADD SKILL BODY EMBEDDINGS

Current routing relies too heavily on summaries and metadata.

Add:

summary embeddings

chunked body embeddings


Implementation:

chunk skill body

embed chunks

retrieve chunks separately

use chunk relevance during reranking


Goal:

Differentiate theoretical skills from operationally actionable skills.


---

7. IMPLEMENT MMR DIVERSIFICATION

Implement Maximal Marginal Relevance (MMR).

Goal:

Reduce near-duplicate skill retrieval.

Requirements:

retrieve larger candidate set

apply MMR before reranking

optimize for:

relevance

diversity

reduced redundancy




---

8. ADD CONCISENESS + DIRECTIVENESS SCORING

The router must prefer:

actionable

concise

procedural

command-oriented skills


Add metadata or inference:

response_profile:
  verbosity: low
  directive_strength: high
  abstraction_level: operational

Compute metrics such as:

actionable_steps / token_count

command density

imperative verb density


Boost:

checklists

commands

procedural outputs


Penalize:

philosophical discussion

generic agent orchestration rhetoric

excessive abstraction



---

9. IMPLEMENT QUERY INTENT DECOMPOSITION

Complex queries should be decomposed into weighted sub-intents.

Example:

"review this Rust Kubernetes operator for security and performance"

Should decompose into:

rust: 0.25
kubernetes: 0.25
security: 0.30
performance: 0.20

Use weighted retrieval aggregation.

Goal:

Avoid one broad skill overwhelming all other dimensions.


---

10. ADD HISTORICAL REINFORCEMENT SIGNALS

Implement lightweight adaptive learning.

Track:

selected skill

user acceptance

follow-up corrections

reroutes

retries

abandonment


Compute:

success_rate(query_cluster, skill)

Use this during ranking.

Goal:

The router should improve over time based on actual usefulness.


---

11. ARCHITECTURAL REQUIREMENTS

Requirements:

modular design

pluggable ranking stages

observable scoring pipeline

debug visibility for every score contribution

configurable weights

backward compatibility with existing skills



---

12. DEBUGGING + OBSERVABILITY

Add detailed tracing.

For every routed query, expose:

{
  "query": "...",
  "candidates": [...],
  "vector_score": 0.82,
  "bm25_score": 0.64,
  "archetype_score": 0.91,
  "specificity_score": 0.73,
  "mmr_penalty": -0.12,
  "final_score": 0.88
}

Must support:

ranking introspection

score explainability

debugging retrieval failures



---

13. IMPLEMENTATION PRIORITY

PHASE 1

archetypes

specificity scoring

anti-triggers

hybrid retrieval


PHASE 2

body embeddings

MMR

query decomposition


PHASE 3

multi-vector embeddings

reinforcement learning signals

advanced scoring optimization



---

14. EXPECTED OUTCOME

The upgraded router should:

return fewer generic/meta skills

prioritize highly actionable skills

better distinguish tactical vs strategic intent

reduce retrieval redundancy

improve directive answer quality

adapt over time based on effectiveness

provide transparent ranking diagnostics



---

15. OUTPUT REQUIREMENTS

You must:

modify the existing architecture rather than rewriting from scratch

preserve compatibility where reasonable

implement incrementally

create tests for each subsystem

add benchmark tooling

include migration scripts if schema changes are required

document all scoring algorithms

provide performance analysis for scaling implications


Focus heavily on:

ranking quality

operational usefulness

retrieval precision

explainability

maintainability
