---




name: skill-ecosystem-design
description: Designs interconnected skill networks with dependency graphs, reciprocal
  relationships, layered capabilities, and cross-domain bridges to maximize discoverability
  and create coherent capability clusters for AI agent systems.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: agent
  triggers: skill ecosystem, skill network, skill dependencies, skill relationships, layered skills, cross-domain skills, how do i design skill networks, reciprocal skills layered skills
  archetypes:
  - orchestration
  - strategic
  anti_triggers:
  - brainstorming
  - vague ideation
  - single-agent monolith
  response_profile:
    verbosity: medium
    directive_strength: high
    abstraction_level: tactical
  role: orchestration
  scope: orchestration
  output-format: analysis
  content-types:
  - guidance
  - examples
  - diagrams
  - do-dont
  related-skills: agent-skill-trigger-engineering, coding-skill-lifecycle-management,
    agent-skill-router, agent-confidence-based-selector




---




# Skill Ecosystem Design

Designs interconnected skill networks where each skill reinforces and discovers others through reciprocal relationships, layered capabilities, and cross-domain bridges. This skill creates coherent capability clusters that guide agents from foundational concepts to specialized execution patterns, maximizing auto-loading discovery while preventing trigger overlap between related skills.

## TL;DR Checklist

- [ ] Every skill lists 2–4 reciprocal related-skills (no isolated skills)
- [ ] Skills are organized in layers: foundational → tactical → emergency/advanced
- [ ] Trigger terms follow two-tier strategy (technical + conversational) with no overlap between siblings
- [ ] Cross-domain bridges use adjacent tech bridge terms to connect skill families
- [ ] Dependency graph has no circular references; each skill is a stepping stone to the next
- [ ] Hierarchy: foundational → tactical → specialized — user journey flows naturally

---

## When to Use

Use this skill when:

- Designing a new set of skills that form a coherent capability cluster (e.g., a full risk management suite)
- Reviewing an existing skill portfolio for orphaned skills with no related-skills connections
- Building cross-domain bridges between unrelated skill families (e.g., connecting CNCF monitoring to application observability)
- Restructuring a large skill repository where trigger overlap causes false-positive activations
- Creating a tiered capability system where agents can progressively load skills along a user journey
- Onboarding new maintainers by providing a visual map of how all skills interconnect

## When NOT to Use

Avoid this skill for:

- Designing individual skill content (triggers, workflows, code examples) — use `agent-skill-trigger-engineering` instead
- Managing versioning or lifecycle of individual SKILL.md files — use `coding-skill-lifecycle-management` instead
- Configuring runtime routing thresholds or confidence scores — use `agent-confidence-based-selector` instead
- Creating a single standalone skill with no need for related skill discovery

---

## Core Workflow

1. **Map the Capability Domain** — Identify the problem space and enumerate all sub-capabilities that agents might need. Group them by abstraction level:
   - **Foundational:** Concepts everyone needs (e.g., "what is X?", core principles, basic setup)
   - **Tactical:** Day-to-day operational skills (e.g., specific patterns, common workflows, troubleshooting)
   - **Advanced/Emergency:** Edge cases and failure modes (e.g., crisis recovery, performance tuning, security hardening)
   
   ```
   Capability Map Template:
   ┌─────────────────────────────────────────────┐
   │ Domain: [name]                              │
   │                                             │
   │ Foundational                                │
   │   ├─ skill-A (core concept)                 │
   │   └─ skill-B (setup & configuration)        │
   │                                             │
   │ Tactical                                    │
   │   ├─ skill-C (common workflow)              │
   │   ├─ skill-D (optimization pattern)         │
   │   └─ skill-E (integration approach)         │
   │                                             │
   │ Advanced/Emergency                          │
   │   ├─ skill-F (troubleshooting methodology)  │
   │   └─ skill-G (crisis recovery procedure)    │
   └─────────────────────────────────────────────┘
   ```
   **Checkpoint:** Each capability must map to exactly one skill. If two capabilities overlap significantly, merge them into a single skill or define clear boundary conditions.

2. **Define Reciprocal Relationships** — For each skill, identify 2–4 related skills that form a natural progression:
   - **Layering relationships:** Skill B adds a capability on top of Skill A (e.g., stop-loss builds on position-sizing)
   - **Sequencing relationships:** Use Skill A before Skill B in the typical workflow (e.g., design before implementation)
   - **Complementary relationships:** Skills address different facets of the same problem (e.g., monitoring + alerting)
   
   ```python
   def build_reciprocal_relationships(
       skills: list[dict],
       domain: str
   ) -> dict[str, list[str]]:
       """Build a directed graph of related-skill relationships.
       
       Enforces the 5 Laws of Elegant Defense:
       - Law 1 (Early Exit): Skills with <2 connections get flagged
       - Law 2 (Parse at boundaries): Validate relationship types before adding edges
       - Law 3 (Atomic Predictability): Relationships are immutable once established
       - Law 4 (Fail Fast): Circular dependencies detected and rejected
       - Law 5 (Don't Hide Failures): Relationship gaps logged for human review
       """
       relationships: dict[str, list[str]] = {s["name"]: [] for s in skills}
       
       for i, skill_a in enumerate(skills):
           for skill_b in skills[i+1:]:
               if are_related(skill_a, skill_b, domain):
                   # Reciprocal: A lists B AND B lists A
                       relationships[skill_a["name"]].append(skill_b["name"])
                       relationships[skill_b["name"]].append(skill_a["name"])
       
       return relationships
   
   
   def are_related(skill_a: dict, skill_b: dict, domain: str) -> bool:
       """Determine if two skills form a meaningful relationship."""
       overlap_score = _calculate_trigger_overlap(skill_a, skill_b)
       
       # Must share at least one semantic concept
       if not _share_concept(skill_a, skill_b):
           return False
       
       # Avoid tangential relationships (only loosely adjacent)
       if overlap_score < 0.3:
           return False
   
       # Strong relationships only: layering, sequencing, or complementary
       return (
           is_layering_relationship(skill_a, skill_b)
           or is_sequencing_relationship(skill_a, skill_b)
           or is_complementary_relationship(skill_a, skill_b)
       )
   ```
   
   **Checkpoint:** Every skill must have at least 2 related skills. No skill should be isolated in the graph.

3. **Design Trigger Spaces to Prevent Overlap** — Each skill's triggers define its "trigger space." Related skills must not compete for the same trigger terms:
   ```yaml
   # ❌ BAD — overlapping trigger spaces cause confusion
   # Skill A (position-sizing):
   triggers: position sizing, how much to trade, risk management
   
   # Skill B (stop-loss):
   triggers: stop loss, risk management, position protection
   # Problem: "risk management" appears in BOTH — agent can't decide which skill to load
   
   # ✅ GOOD — differentiated trigger spaces
   # Skill A (position-sizing):
   triggers: position sizing, how much should i trade, capital allocation, 
             kelly criterion, portfolio weighting, risk budgeting
   
   # Skill B (stop-loss):
   triggers: stop loss, trailing stop, exit strategy, stop placement, 
             stop-loss, position protection, emergency stop
   ```
   
   **Checkpoint:** Run a trigger overlap analysis — if two skills share more than 30% of their trigger terms, differentiate them.

4. **Build the Dependency Graph** — Create a directed acyclic graph (DAG) showing how skills depend on each other. Skills at the bottom are foundational; skills higher up build on them:
   ```
   ┌─────────────────────────────────────────────────────────────┐
   │                    Skill Dependency DAG                        │
   │                                                               │
   │   [risk-kill-switches] ← Emergency layer                      │
   │         ↑                                                     │
   │   [risk-stop-loss]     ← Tactical stop management             │
   │         ↑               ↕                                     │
   │   [risk-position-sizing] ← Foundational sizing decision       │
   │         ↑                                                     │
   │   [risk-drawdown-control] ← Portfolio-level coordination      │
   └─────────────────────────────────────────────────────────────┘
   
   User journey: position-sizing → stop-loss → kill-switches
                    ↓               ↓              ↓
               "How much?"     "Where to exit?"  "When to stop all?"
   ```
   
   **Checkpoint:** Verify the graph is acyclic — no skill can depend on itself through a chain. Reference `code-philosophy` (Law 2: Parse at boundaries) when validating graph integrity.

5. **Implement Cross-Domain Bridges** — For skills that span multiple domains, use adjacent technology bridge terms in triggers to connect unrelated skill families:
   ```yaml
   # Monitoring skill bridges CNCF and application observability domains
   # CNCF trigger space: prometheus, promql, alerting rules
   # Application trigger space: performance monitoring, how do i track app health
   
   # Bridge terms connect both audiences:
   triggers: prometheus, application monitoring, 
             how do i monitor system health, metrics scraping,
             observability pipeline, grafana dashboard
   ```
   
   **Checkpoint:** Cross-domain bridge skills should have at least 2 triggers from each domain they bridge. Verify that neither domain's audience would be confused by the trigger set.

6. **Validate the Skill Network** — Run structural validation on the complete network:
   ```python
   def validate_skill_network(skills: list[dict]) -> dict:
       """Validate structural properties of a skill ecosystem."""
       graph = {s["name"]: s.get("related_skills", []) for s in skills}
       
       checks = {}
       
       # Check 1: No isolated nodes (each skill has >= 2 related)
       isolated = [name for name, deps in graph.items() if len(deps) < 2]
       checks["no_isolated_nodes"] = len(isolated) == 0
       if not checks["no_isolated_nodes"]:
           print(f"WARNING: Isolated skills (need related-skills): {isolated}")
       
       # Check 2: Reciprocity — if A lists B, B must list A
       reciprocity_violations = []
       for name, deps in graph.items():
           for dep in deps:
               if dep in graph and name not in graph[dep]:
                   reciprocity_violations.append(f"{name} → {dep} (not reciprocal)")
       checks["full_reciprocity"] = len(reciprocity_violations) == 0
       
       # Check 3: No circular dependencies
       def has_cycle(node, visited, path):
           if node in path:
               return True
           if node in visited:
               return False
           visited.add(node)
           path.add(node)
           for neighbor in graph.get(node, []):
               if has_cycle(neighbor, visited, path):
                   return True
           path.discard(node)
           return False
   
       checks["no_circular_deps"] = not any(
           has_cycle(name, set(), set()) for name in graph
       )
       
       # Check 4: Trigger overlap between siblings < 30%
       def trigger_overlap(name_a, name_b):
           triggers_a = set(skills[0]["triggers"]) if isinstance(skills[0], dict) else set()
           # This would use actual trigger data from the skills index
           return len(triggers_a & triggers_b) / max(len(triggers_a | triggers_b), 1)
       
       overlaps = [
           (n1, n2) for i, n1 in enumerate(graph) 
           for n2 in graph[n1] if trigger_overlap(n1, n2) > 0.3
       ]
       checks["no_trigger_overlap"] = len(overlaps) == 0
   
       # Check 5: Layering — at least foundational and tactical layers exist
       layer_counts = {"foundational": 0, "tactical": 0, "advanced": 0}
       for s in skills:
           layer = s.get("layer", "tactical")
           layer_counts[layer] = layer_counts.get(layer, 0) + 1
       
       checks["has_layering"] = (
           layer_counts.get("foundational", 0) >= 1 
           and layer_counts.get("tactical", 0) >= 2
       )
       
       return {**checks, "reciprocity_violations": reciprocity_violations}
   ```
   
   **Checkpoint:** All five checks must pass. Any violation must be fixed before publishing the skill set.

7. **Document the Ecosystem Map** — Create a human-readable map showing all skills, their relationships, and the intended user journey:
   ```markdown
   ### Risk Management Ecosystem
   
   **User Journey:** "I need to trade safely" → position-sizing → stop-loss → kill-switches
   
   | Skill | Layer | Related To | Bridge Domain |
   |---|---|---|---|
   | `risk-position-sizing` | Foundational | stop-loss, drawdown-control | — |
   | `risk-stop-loss` | Tactical | position-sizing, kill-switches | trading/risk |
   | `risk-kill-switches` | Emergency | stop-loss, drawdown-control | operations |
   | `risk-drawdown-control` | Foundational | position-sizing, kill-switches | portfolio |
   
   Trigger boundaries: Each skill's triggers cover distinct aspects of risk (sizing vs. placement vs. circuit breaking).
   ```

---

## Ecosystem Design Patterns

### Pattern 1: Layered Defense Architecture

Layer skills progressively from foundational to emergency response. This mirrors the defense-in-depth principle and creates natural progression paths for agents.

```
┌──────────────────────────────────────────────────────┐
│              Layered Defense Model                    │
│                                                       │
│  Layer 3: Emergency (kill-switches, circuit breakers) │
│         ↑   Prevents catastrophic loss                │
│  Layer 2: Tactical (stop-losses, trailing stops)      │
│         ↑   Manages per-position risk                 │
│  Layer 1: Foundational (position-sizing, budgets)     │
│         ↑   Determines how much to allocate           │
│                                                       │
│  User loads foundational → discovers tactical →       │
│  discovers emergency through reciprocal related-skills │
└──────────────────────────────────────────────────────┘
```

Each layer is independently loadable but gains value when used in sequence. The `related-skills` field creates the discovery chain: loading Layer 1 reveals Layer 2, which reveals Layer 3.

### Pattern 2: Hub-and-Spoke Discovery

A foundational skill serves as a hub that connects to multiple specialized spokes:

```
                    [fundamental-concept]
                          │
              ┌───────────┼───────────┐
              ↓           ↓           ↓
        [specialized-A] [specialized-B] [specialized-C]
              ↑           ↑           ↑
         (deep dive)  (deep dive)  (deep dive)
```

The hub skill covers the core concept broadly. Each spoke drills into a specific aspect. Agents load the hub first, then follow related-skills to the spokes based on their specific need.

### Pattern 3: Cross-Domain Bridge

Bridge skills use adjacent terminology to serve multiple domain audiences:

```
┌──────────────┐                    ┌──────────────┐
│ CNCF Domain  │                    │ App Domain   │
│              │   [bridge skill]   │              │
│ - prometheus ◄──────────────────► - observability│
│ - grafana    │    (dual-audit)   │ - tracing     │
│ - kubernetes │    triggers)       │ - metrics     │
└──────────────┘                    └──────────────┘

Bridge triggers include terms from BOTH domains:
triggers: prometheus, observability, how do i monitor systems,
         metrics dashboard, application health, grafana
```

---

## Trigger Space Differentiation

When designing related skills, their trigger spaces must be differentiated to prevent auto-loading confusion. Use this framework:

### Trigger Overlap Scoring

| Scenario | Overlap | Action |
|----------|---------|--------|
| < 2 shared terms | Acceptable — complementary skills | No action needed |
| 2–3 shared terms | Warning — review for differentiation | Add unique triggers to each skill |
| > 3 shared terms | Conflict — agent will be confused | Redesign trigger sets with domain-specific vocabulary |

### Differentiation Strategy

```yaml
# BEFORE: Overlapping risk management triggers (BAD)
# Skill A: triggers: risk, position sizing, how do i decide amount
# Skill B: triggers: risk, stop loss, how do i protect capital  
# Problem: "risk" is shared — both match any risk conversation

# AFTER: Differentiated by role in the risk workflow (GOOD)
# Skill A (sizing): 
#   triggers: position sizing, capital allocation, portfolio budgeting,
#             kelly criterion, how much should i trade, risk budgeting
#   # Focus: "how much" decisions

# Skill B (stops):
#   triggers: stop loss, trailing stop, exit strategy, stop placement,
#             stop-loss, position protection, emergency stop
#   # Focus: "where to exit" decisions
```

---

## Constraints

### MUST DO
- Every skill must list 2–4 related skills (no isolated nodes in the graph)
- Relationships must be reciprocal: if A lists B, B must list A
- Trigger spaces for sibling skills must share fewer than 30% of terms
- Organize skills in layers: foundational → tactical → emergency/advanced
- Reference `code-philosophy` (5 Laws of Elegant Defense) when building the dependency graph
- Validate the network passes all five structural checks before publishing

### MUST NOT DO
- List more than 4 related skills — dilutes focus and suggests poor boundary design
- Create circular dependencies in the skill dependency graph
- Use generic trigger terms (single words like "risk", "code", "data") that cause false positives across domains
- Design skills that exist solely as stepping stones without independent utility — each skill must be loadable and useful standalone
- Hide relationship gaps — if a skill has no natural related skills, note it explicitly rather than fabricating weak connections

---

## Output Template

When designing a skill ecosystem, produce:

1. **Capability Map** — Enumerated list of all capabilities grouped by layer (foundational/tactical/advanced)
2. **Reciprocal Relationship Matrix** — Table showing which skills reference each other and the relationship type (layering, sequencing, complementary)
3. **Trigger Space Analysis** — Overlap matrix showing shared triggers between related skills with percentage calculations
4. **Dependency DAG** — ASCII flow diagram of the skill dependency graph with no circular references
5. **Cross-Domain Bridges** — List of bridge skills and the domains they connect, with trigger breakdown by domain
6. **Network Validation Report** — Results from all five structural checks (no isolated nodes, full reciprocity, no cycles, no trigger overlap, has layering)

---

## Related Skills

| Skill | Purpose |
|---|---|
| `agent-skill-trigger-engineering` | Designs individual trigger sets — this skill organizes them into a coherent network |
| `coding-skill-lifecycle-management` | Manages versioning and retirement — this skill ensures relationships stay intact during changes |
| `agent-skill-router` | Routes tasks to skills at runtime — this skill designs the ecosystem that routing depends on |
| `agent-confidence-based-selector` | Selects skills by confidence scores — complementary to trigger-based network discovery |

## Live References

> Authoritative documentation links for this domain. The model follows markdown links at load time to resolve external references and inline content.

- [Graph Theory Fundamentals (Wikipedia)](https://en.wikipedia.org/wiki/Graph_theory) — Foundational concepts in graph theory applicable to skill dependency graphs
- [Dependency Injection Patterns (Martin Fowler)](https://martinfowler.com/articles/injection.html) — Fowler's analysis of dependency injection and component relationship patterns
- [Network Topology Design Patterns](https://www.sciencedirect.com/topics/computer-science/network-topology) — Research on designing interconnected systems with optimal discoverability and resilience
- [Component-Based Architecture (IBM)](https://developer.ibm.com/technologies/software/patterns/component-based-architecture/) — IBM's patterns for building component ecosystems with clear interfaces and relationships
- [Knowledge Graph Design Patterns](https://www.w3.org/standwich/graph-data-model/) — W3C knowledge graph standards applicable to skill relationship networks
