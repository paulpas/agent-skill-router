---
name: agent-maturity-levels
description: Provides a four-level maturity model (Core Reasoning → Connected Solver → Strategic Problem-Solver → Collaborative Multi-Agent) for assessing and planning agent architecture investments based on capability requirements.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: agent
  role: reference
  scope: orchestration
  output-format: analysis
  triggers: agent maturity model, level 0 to level 3 agents, agent architecture assessment, capability progression, context engineering, multi-agent complexity, how do i assess my agent level
  archetypes: [strategic, diagnostic]
  anti_triggers:
    - implementation only
    - framework selection decisions
    - debugging specific code issues
  response_profile:
    verbosity: medium
    directive_strength: medium
    abstraction_level: tactical
  related-skills: agent-architecture-patterns,multi-agent-collaboration,memory-management
---

# Agent Maturity Levels — Capability Progression Model

Provides a four-level maturity model for agentic systems that maps capability progression from simple reasoning engines through collaborative multi-agent organizations. This skill makes the model assess an agent's current architecture level against the spectrum (Level 0–3) and recommend specific architectural investments (tools → context engineering → multi-agent) based on capability gaps.

## TL;DR Checklist

- [ ] Assess current agent against four maturity levels (L0–L3)
- [ ] Identify capability gaps between current level and target level
- [ ] Recommend specific architectural investments for each upgrade step
- [ ] Document trade-offs at each level (what you gain vs what you lose)
- [ ] Create a phased roadmap from current state to desired capability

---

## When to Use

Use this skill when:

- Starting an agent project and need to determine the right starting architecture
- Evaluating whether to invest in multi-agent systems vs improving a single agent
- Explaining agent capabilities to stakeholders who don't understand technical depth
- Planning phased development with clear capability milestones
- Comparing your agent's architecture against industry benchmarks

## When NOT to Use

Avoid this skill for:

- Debugging specific code issues within an existing agent
- Selecting frameworks (LangChain vs LangGraph vs ADK) — that is a different decision
- Tasks where the answer is simple enough for Level 0 (no tools needed)

---

## Core Workflow

1. **Current State Assessment** — Evaluate the agent against all four maturity levels by checking: tool integration, memory usage, context engineering practices, and multi-agent coordination. Assign the highest level at which ALL capabilities are present. **Checkpoint:** The assessment must verify that each Level N capability is actually implemented — check code and architecture diagrams, not just documentation.

2. **Target State Definition** — Define what capability level is needed for the use case. A simple FAQ bot may never need to go beyond Level 1; a complex research system may require Level 3. Consider: What external data sources are needed? Does the agent need memory of past interactions? Does it need proactive behavior? **Checkpoint:** Target level must be justified with specific use-case requirements, not aspirational goals.

3. **Gap Analysis** — Identify which capabilities are missing between current and target levels. Map each gap to a specific architectural investment: Level 0→1 needs tool integration; Level 1→2 needs context engineering infrastructure; Level 2→3 needs multi-agent orchestration platform. **Checkpoint:** Each gap must include estimated effort (weeks of development) and expected capability improvement (% increase in task success rate).

4. **Investment Roadmap** — Create a phased plan that upgrades the agent through each level sequentially. Skip levels only if justified by specific requirements that make intermediate capabilities unnecessary. Document prerequisites for each upgrade step. **Checkpoint:** Each phase must have measurable completion criteria (not "has tools" but "successfully calls 3+ external APIs with error handling").

5. **Trade-off Documentation** — For each level transition, document what you gain and what you lose. Going from L1→L2 adds context engineering overhead; going from L2→L3 adds coordination complexity and latency. **Checkpoint:** Document the expected latency increase per upgrade step (Level 0: ~50 ms, Level 1: ~200 ms, Level 2: ~500 ms, Level 3: ~2000 ms+).

---

## Implementation Patterns

### Pattern 1: Maturity Level Assessment Function

```python
from dataclasses import dataclass, field
from enum import Enum
from typing import Any


class MaturityLevel(str, Enum):
    """Four maturity tiers for agentic system architectures."""

    LEVEL_0 = "level_0"       # Core Reasoning Engine
    LEVEL_1 = "level_1"       # Connected Problem-Solver
    LEVEL_2 = "level_2"       # Strategic Problem-Solver
    LEVEL_3 = "level_3"       # Collaborative Multi-Agent Systems


@dataclass
class CapabilityCheck:
    """Whether a specific capability is present in the agent."""

    capability_name: str
    level: MaturityLevel  # Which maturity tier this capability belongs to
    present: bool
    implementation_details: str = ""  # How it is implemented (if present)


@dataclass
class MaturityAssessment:
    """Complete assessment of an agent's current maturity level."""

    current_level: MaturityLevel
    capability_checks: list[CapabilityCheck] = field(default_factory=list)
    recommendations: list[str] = field(default_factory=list)
    estimated_upgrade_effort_weeks: int = 0

    @property
    def description(self) -> str:
        """Human-readable description of the current maturity level."""
        descriptions = {
            MaturityLevel.LEVEL_0: "Core Reasoning Engine — LLM operates without tools, memory, or environment interaction",
            MaturityLevel.LEVEL_1: "Connected Problem-Solver — LLM integrated with external tools (search, RAG, APIs) for multi-step actions",
            MaturityLevel.LEVEL_2: "Strategic Problem-Solver — Context engineering, proactive operation, self-improvement via feedback loops",
            MaturityLevel.LEVEL_3: "Collaborative Multi-Agent Systems — Specialized agents with coordinator architecture and division of labor",
        }
        return descriptions[self.current_level]


def assess_agent_maturity(agent_config: dict[str, Any]) -> MaturityAssessment:
    """Assess an agent's current maturity level by checking capabilities at each tier.

    An agent reaches Level N only if ALL capabilities required for that level
    (and every lower level) are actually present in the implementation.

    Args:
        agent_config: Configuration dict describing the agent's architecture.
            Keys include 'tools', 'memory_store', 'context_pipeline',
            'trigger_events', 'feedback_mechanism', 'coordinator_agent',
            and 'specialist_agents'.

    Returns:
        MaturityAssessment with current level, per-capability checks,
        and upgrade recommendations.
    """
    checks: list[CapabilityCheck] = [
        CapabilityCheck(
            "external_tool_integration",
            MaturityLevel.LEVEL_1,
            bool(agent_config.get("tools")),
            agent_config.get("tool_descriptions", ""),
        ),
        CapabilityCheck(
            "memory_persistence",
            MaturityLevel.LEVEL_1,
            bool(agent_config.get("memory_store")),
            "Uses BaseStore or SessionService for persistent state",
        ),
        CapabilityCheck(
            "context_engineering",
            MaturityLevel.LEVEL_2,
            bool(agent_config.get("context_pipeline")),
            "Strategically selects and packages information per step",
        ),
        CapabilityCheck(
            "proactive_operation",
            MaturityLevel.LEVEL_2,
            bool(agent_config.get("trigger_events")),
            "Agent acts without explicit user request on trigger events",
        ),
        CapabilityCheck(
            "self_improvement_loop",
            MaturityLevel.LEVEL_2,
            bool(agent_config.get("feedback_mechanism")),
            "Agent refines its own context engineering via feedback",
        ),
        CapabilityCheck(
            "multi_agent_coordination",
            MaturityLevel.LEVEL_3,
            bool(agent_config.get("coordinator_agent")),
            "Multiple specialized agents coordinated by manager agent",
        ),
        CapabilityCheck(
            "division_of_labor",
            MaturityLevel.LEVEL_3,
            bool(agent_config.get("specialist_agents")),
            "Each agent has exactly one documented responsibility",
        ),
    ]

    # Find highest level where ALL capabilities are present
    current_level = MaturityLevel.LEVEL_0
    for level in MaturityLevel:
        if level == MaturityLevel.LEVEL_0:
            continue  # Level 0 is the default (LLM alone)

        level_capabilities = [c for c in checks if c.level == level]
        all_present = all(c.present for c in level_capabilities)

        if all_present and len(level_capabilities) > 0:
            current_level = level

    # Generate recommendations based on gaps
    recommendations: list[str] = []
    missing_capabilities = [c for c in checks if not c.present]
    all_levels = list(MaturityLevel)
    for cap in missing_capabilities:
        idx = all_levels.index(cap.level)
        next_level = all_levels[max(1, idx)]
        recommendations.append(f"Upgrade to {next_level.value}: implement {cap.capability_name}")

    return MaturityAssessment(
        current_level=current_level,
        capability_checks=checks,
        recommendations=recommendations,
    )


# Example usage:
# assessment = assess_agent_maturity({
#     "tools": ["web_search", "file_reader"],   # Level 1 tools present
#     "memory_store": None,                      # No persistent memory
#     "context_pipeline": None,                  # No context engineering
#     "coordinator_agent": None,                 # No multi-agent coordination
# })
# assessment.current_level == MaturityLevel.LEVEL_0 (LEVEL_1 requires BOTH tools AND memory)

# assessment_with_memory = assess_agent_maturity({
#     "tools": ["web_search", "file_reader"],
#     "memory_store": True,
#     "context_pipeline": None,
#     "coordinator_agent": None,
# })
# assessment.current_level == MaturityLevel.LEVEL_1 (tools + memory present)
```

### Pattern 2: Upgrade Investment Estimator

```python
from dataclasses import dataclass


@dataclass
class UpgradeInvestment:
    """Estimated effort and capability gain for upgrading to a higher maturity level."""

    from_level: MaturityLevel
    to_level: MaturityLevel
    required_capabilities: list[str]  # What needs to be built
    estimated_weeks: int  # Development time estimate
    expected_success_rate_improvement: float  # % improvement on complex tasks
    latency_increase_ms: int  # Additional response latency
    complexity_increase: str  # Low / Medium / High / Very High


def estimate_upgrade_path(target_level: MaturityLevel) -> list[UpgradeInvestment]:
    """Estimate investment for upgrading from Level 0 to the target level.

    Returns a sequential list of upgrade steps. Each step documents the
    capabilities needed, effort estimate, expected improvement, and trade-offs.
    """
    upgrades: dict[tuple[MaturityLevel, MaturityLevel], UpgradeInvestment] = {
        (MaturityLevel.LEVEL_0, MaturityLevel.LEVEL_1): UpgradeInvestment(
            from_level=MaturityLevel.LEVEL_0,
            to_level=MaturityLevel.LEVEL_1,
            required_capabilities=["tool integration", "memory persistence"],
            estimated_weeks=4,
            expected_success_rate_improvement=25.0,
            latency_increase_ms=150,
            complexity_increase="Medium",
        ),
        (MaturityLevel.LEVEL_1, MaturityLevel.LEVEL_2): UpgradeInvestment(
            from_level=MaturityLevel.LEVEL_1,
            to_level=MaturityLevel.LEVEL_2,
            required_capabilities=[
                "context engineering pipeline",
                "proactive operation triggers",
                "self-improvement feedback loop",
            ],
            estimated_weeks=8,
            expected_success_rate_improvement=30.0,
            latency_increase_ms=300,
            complexity_increase="High",
        ),
        (MaturityLevel.LEVEL_2, MaturityLevel.LEVEL_3): UpgradeInvestment(
            from_level=MaturityLevel.LEVEL_2,
            to_level=MaturityLevel.LEVEL_3,
            required_capabilities=[
                "coordinator agent architecture",
                "specialist agent definitions",
                "inter-agent communication protocol",
            ],
            estimated_weeks=12,
            expected_success_rate_improvement=35.0,
            latency_increase_ms=1500,
            complexity_increase="Very High",
        ),
    }

    path: list[UpgradeInvestment] = []
    current = MaturityLevel.LEVEL_0
    for level in MaturityLevel:
        if level == target_level:
            break
        upgrade_key = (current, level)
        if upgrade_key in upgrades:
            path.append(upgrades[upgrade_key])
        current = level

    return path


# Example: Upgrading from L0 to L3
# for step in estimate_upgrade_path(MaturityLevel.LEVEL_3):
#     print(f"{step.from_level.value} → {step.to_level.value}: "
#           f"Need {', '.join(step.required_capabilities)} — "
#           f"Est. {step.estimated_weeks} weeks, +{step.latency_increase_ms}ms latency")
```

### Pattern 3: Maturity Level Comparison Table Generator

```python
def generate_maturity_comparison() -> str:
    """Generate a comparison table of all four maturity levels.

    Returns a Markdown table with capabilities mapped across all levels,
    plus a trade-off summary to guide architecture investment decisions.
    """
    return (
        "| Capability | L0 Core Reasoning | L1 Connected Solver | L2 Strategic Solver | L3 Multi-Agent |\n"
        "|------------|-------------------|--------------------|--------------------|----------------|\n"
        "| External Tools | ❌ | ✅ (search, RAG, APIs) | ✅ (extended toolset) | ✅ (distributed tools) |\n"
        "| Memory | ❌ | ✅ (persistent state) | ✅ (context engineering) | ✅ (shared knowledge graph) |\n"
        "| Proactive Behavior | ❌ | ❌ | ✅ (trigger-based) | ✅ (coordinator-driven) |\n"
        "| Self-Improvement | ❌ | ❌ | ✅ (feedback loop) | ✅ (cross-agent learning) |\n"
        "| Typical Latency | ~50 ms | ~200 ms | ~500 ms | ~2000 ms+ |\n"
        "| Best For | Simple QA, explanations | Task automation with tools | Complex multi-step workflows | Enterprise-scale operations |\n"
        "\n"
        "**Trade-off Summary:**\n"
        "- L0→L1: Biggest capability gain for lowest complexity cost (~4 weeks)\n"
        "- L1→L2: Significant capability jump but requires context engineering discipline\n"
        "- L2→L3: Most complex upgrade — only invest when single-agent approaches consistently fail\n"
    )


# This function generates a reference table comparing all four maturity levels.
# Call it to provide stakeholders with a clear visual comparison of architecture options.
```

---

## Constraints

### MUST DO
1. Assess agents against ALL capabilities at each level before assigning a maturity level — do not skip any checks.
2. Require tools AND memory for Level 1 designation — both must be present, not just one.
3. Document estimated effort (weeks) and expected improvement for each upgrade step in the investment roadmap.
4. Include latency increase estimates per upgrade step — going from L0→L3 can multiply response time by 40x.
5. Only recommend skipping a level if there is a specific requirement that makes the intermediate capability unnecessary.
6. Compare target capabilities against actual implementation (code/architecture), not just documentation claims.
7. Reference `code-philosophy` (5 Laws of Elegant Defense): early exit when current level meets requirements, fail fast on missing critical capabilities for higher levels.
8. Document what you lose at each upgrade step (increased complexity, latency, maintenance overhead) — upgrades are not free.

### MUST NOT DO
1. Assign Level 3 simply because the agent uses multiple tools — Level 3 requires multi-agent coordination architecture.
2. Skip any maturity level when estimating upgrade path — go through each level sequentially unless justified otherwise.
3. Recommend upgrading to L3 without documenting the significant complexity and latency trade-offs.
4. Base assessments on subjective claims ("our agent is smart") — require concrete evidence of capability implementation.
5. Assume higher levels are always better — a Level 0 agent for simple QA is more appropriate than a Level 3 system for the same task.
6. Use vague effort estimates ("a few weeks") — provide specific week ranges based on implementation complexity.

---

## Output Template

When this skill is active, deliver:

1. **Maturity assessment** — Current level with capability check results (present/missing per capability)
2. **Target state definition** — Required level for the use case with justification
3. **Gap analysis** — Missing capabilities mapped to specific architectural investments
4. **Upgrade roadmap** — Phased plan from current → target with effort estimates and success rate projections
5. **Trade-off documentation** — Latency, complexity, maintenance overhead per upgrade step
6. **Maturity comparison table** — Full L0–L3 capability matrix for reference

---

## Related Skills

| Skill | Purpose |
|---|---|
| `agent-architecture-patterns` | Architecture patterns are implementation details; this skill provides the decision framework for which patterns to choose |
| `multi-agent-collaboration` | Covers Level 3 implementation; this skill helps decide WHEN to invest in Level 3 architecture |
| `memory-management` | Memory is required for L1; this skill assesses whether you have reached L1 and what comes next |

> 📖 skill(local cache): agent-architecture-patterns, multi-agent-collaboration, memory-management
