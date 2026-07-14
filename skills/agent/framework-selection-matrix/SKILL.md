---
name: framework-selection-matrix
description: Provides a decision matrix for selecting between agentic frameworks (LangChain, LangGraph, Google ADK, CrewAI) based on capability requirements, ecosystem fit, and production readiness.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: agent
  role: implementation
  scope: orchestration
  output-format: analysis
  triggers: framework selection, LangChain vs LangGraph, Google ADK, CrewAI, agent framework comparison, how do i choose an agent framework, LCEL pipeline
  archetypes: [strategic]
  anti_triggers:
    - implementation details only
    - writing code without architecture context
    - debugging specific framework errors
  response_profile:
    verbosity: medium
    directive_strength: medium
    abstraction_level: tactical
  related-skills: prompt-chaining,multi-agent-collaboration,routing-patterns
---

# Framework Selection Matrix Pattern

Provides a structured decision matrix for selecting between agentic frameworks based on capability requirements, ecosystem fit, performance characteristics, and production readiness. This skill makes the model analyze project requirements against framework capabilities (linear chains, cyclic state machines, team-based orchestration, multi-agent factories) and produce a justified framework selection with migration considerations.

## TL;DR Checklist

- [ ] Enumerate all functional requirements (chaining, memory, tool use, multi-agent, etc.)
- [ ] Score each framework against requirements using the capability matrix
- [ ] Evaluate non-functional requirements: ecosystem, performance, debugging, community
- [ ] Assess production readiness for each candidate framework
- [ ] Justify selection with trade-offs and alternatives considered
- [ ] Document migration path if changing from an existing framework

---

## When to Use

Use this skill when:

- Starting a new agent project and need to select the right foundation framework
- Evaluating whether to migrate between frameworks (e.g., LangChain → LangGraph)
- Building multi-agent systems and need to choose between CrewAI, Google ADK, or custom orchestration
- An existing framework is insufficient for new requirements and alternatives must be evaluated
- Onboarding team members who need to understand why a particular framework was chosen

## When NOT to Use

Avoid this skill for:

- Simple single-step prompt chains (LangChain LCEL alone may suffice — no matrix needed)
- Already committed to a framework with no migration path consideration
- Internal tooling where the team already has deep expertise in one framework
- Prototyping where speed of iteration is more important than architectural fit

---

## Core Workflow

1. **Requirements Enumeration** — List all functional requirements (prompt chaining, memory management, tool use, multi-agent orchestration, RAG, evaluation) and non-functional requirements (ecosystem integration, performance, debugging support, community size, production maturity). **Checkpoint:** Each requirement must be classified as "must-have" or "nice-to-have" with a priority score.
2. **Capability Matrix Scoring** — Score each candidate framework (1-5) against every must-have requirement using the capability matrix. Include quantitative data where available (e.g., GitHub stars, PyPI downloads, production case studies). **Checkpoint:** All scores must be justified with evidence, not opinions — link to documentation or benchmarks.
3. **Non-Functional Assessment** — Evaluate each framework on ecosystem fit (Google Cloud vs open source), performance characteristics (latency overhead, memory usage), debugging tools (LangSmith, tracing support), and community health (issue response time, release cadence). **Checkpoint:** Ecosystem misalignment is a harder constraint than capability gaps — Google ADK requires Google Cloud, CrewAI requires Python 3.10+.
4. **Production Readiness Evaluation** — Assess each framework for production use: stability (version history, breaking change frequency), monitoring support (tracing, metrics, evaluation integration), deployment patterns (containerization, orchestration compatibility), and failure modes (known bugs, workarounds). **Checkpoint:** A framework with a 1.x version is production-ready; pre-1.0 versions require risk mitigation planning.
5. **Trade-off Analysis** — Document the key trade-offs of each option. For example: "LangGraph provides cyclic state management but adds ~15ms per node transition vs LangChain's linear chains." Include cost of team learning curve and migration complexity if switching. **Checkpoint:** Every trade-off must include both the benefit and the concrete cost.
6. **Decision Document** — Produce a selection document with scoring results, justification for the winner, alternatives considered, and a migration plan if applicable. **Checkpoint:** The decision must be reviewable by a third party who can follow the logic without prior context.

---

## Implementation Patterns

### Pattern 1: Framework Capability Scoring System

```python
from dataclasses import dataclass, field
from enum import Enum
from typing import Any


class Framework(str, Enum):
    """Supported agentic frameworks for evaluation."""

    LANGCHAIN = "langchain"
    LANGGRAPH = "langgraph"
    GOOGLE_ADK = "google_adk"
    CREWAI = "crewai"
    CUSTOM = "custom_orchestration"


@dataclass
class Requirement:
    """A project requirement for framework evaluation."""

    name: str
    priority: str  # "must-have", "nice-to-have"
    weight: float  # 0.0-1.0, must sum to 1.0 across requirements
    description: str = ""


@dataclass
class FrameworkScore:
    """Complete scoring record for a framework."""

    name: Framework
    scores: dict[str, float] = field(default_factory=dict)  # requirement_name -> score (1-5)

    @property
    def weighted_total(self) -> float:
        """Calculate weighted average score across all requirements.

        Returns the sum of (score * weight) for each scored requirement,
        divided by the total weight of those requirements.

        Returns:
            Weighted average score, rounded to 2 decimal places.
            Returns 0.0 if no scores have been recorded.
        """
        if not self.scores:
            return 0.0

        total_weight = sum(
            req.weight for req in _requirements if req.name in self.scores
        )
        if total_weight == 0:
            return 0.0

        weighted_sum = sum(
            self.scores[req.name] * req.weight
            for req in _requirements
            if req.name in self.scores
        )
        return round(weighted_sum / total_weight, 2)


# Global requirements list — populated before scoring begins.
_requirements: list[Requirement] = []

EVIDENCE_SOURCES: dict[Framework, list[str]] = {
    Framework.LANGCHAIN: [
        "GitHub: 90k+ stars",
        "PyPI: 15M+ monthly downloads",
        "Official LangSmith for tracing and evaluation",
        "Supports linear LCEL pipelines natively",
    ],
    Framework.LANGGRAPH: [
        "Built on LangChain but adds cyclic graph execution",
        "StateGraph with TypedDict state management",
        "Checkpoint and persistence via BaseStore",
        "~30ms overhead per node transition vs direct calls",
    ],
    Framework.GOOGLE_ADK: [
        "Requires Google Cloud project setup",
        "Integration with Vertex AI for RAG corpus",
        "Pre-built tools: Google Search, Code Interpreter, VSearchAgent",
        "Best for teams already in Google ecosystem",
    ],
    Framework.CREWAI: [
        "Role-based crew orchestration (no built-in graph)",
        "Built on LangChain — inherits LCEL but adds team charter patterns",
        "Task distribution and handoff via Task class",
        "No native state management between tasks",
    ],
}


def evaluate_frameworks(
    requirements: list[Requirement],
    scores: dict[Framework, dict[str, float]],
) -> list[FrameworkScore]:
    """Score and rank frameworks against project requirements.

    Populates the global _requirements list for use by FrameworkScore.weighted_total
    and iterates over all provided framework score maps to produce a ranked result.

    Args:
        requirements: Ordered list of requirements with names, priorities, and weights.
        scores: Mapping from each candidate Framework to its per-requirement scores.

    Returns:
        Ranked list of FrameworkScore objects, highest weighted total first.
    """
    global _requirements
    _requirements = requirements

    results: list[FrameworkScore] = []

    for fw_name, score_map in scores.items():
        fs = FrameworkScore(name=fw_name, scores=score_map)
        results.append(fs)

    # Sort by weighted total descending — best framework first.
    results.sort(key=lambda x: x.weighted_total, reverse=True)
    return results
```

### Pattern 2: Framework Decision Workflow Engine

```python
from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class TradeOff:
    """A documented trade-off between two framework options."""

    dimension: str  # e.g., "execution model", "ecosystem lock-in"
    option_a: str  # Framework name
    option_b: str  # Framework name
    benefit_of_a: str
    cost_of_a: str
    evidence: str = ""


@dataclass
class SelectionDecision:
    """Final framework selection decision with full justification."""

    winner: Framework
    scores: list[FrameworkScore]
    trade_offs: list[TradeOff] = field(default_factory=list)
    migration_plan: str | None = None
    date: str = ""

    def __post_init__(self) -> None:
        """Auto-populate the decision date if not explicitly set."""
        if not self.date:
            self.date = datetime.now().isoformat()


class FrameworkDecisionEngine:
    """Drives the framework selection process end-to-end.

    Accepts a prioritized requirement list, evaluates candidate frameworks,
    analyzes trade-offs between the top two, and produces a documented
    SelectionDecision with migration guidance.
    """

    def __init__(self, requirements: list[Requirement]) -> None:
        """Initialize with the project's ranked requirements.

        Args:
            requirements: Ordered list of functional and non-functional requirements.
        """
        self._requirements = requirements

    def evaluate(
        self,
        scores_map: dict[Framework, dict[str, float]],
    ) -> SelectionDecision:
        """Run the full evaluation and produce a selection decision.

        Args:
            scores_map: Per-framework score maps keyed by requirement name (1-5 scale).

        Returns:
            A fully documented SelectionDecision with ranking, trade-offs, and migration plan.

        Raises:
            ValueError: If fewer than 2 frameworks are provided for comparison.
        """
        ranked = evaluate_frameworks(self._requirements, scores_map)

        # Analyze trade-offs between top 2 frameworks.
        if len(ranked) >= 2:
            top1 = ranked[0]
            top2 = ranked[1]

            trade_offs = self._analyze_trade_offs(top1, top2)

            return SelectionDecision(
                winner=top1.name,
                scores=ranked,
                trade_offs=trade_offs,
                migration_plan=self._draft_migration_plan(ranked[0].name),
            )

        raise ValueError("Need at least 2 frameworks to compare")

    def _analyze_trade_offs(
        self,
        best: FrameworkScore,
        runner_up: FrameworkScore,
    ) -> list[TradeOff]:
        """Analyze trade-offs between the top two ranked frameworks.

        Iterates over must-have requirements and documents those where the
        score gap is >= 2.0 on a 5-point scale.

        Args:
            best: Highest-ranked framework score record.
            runner_up: Second-highest-ranked framework score record.

        Returns:
            List of TradeOff records documenting significant score gaps.
        """
        trade_offs: list[TradeOff] = []

        for req in self._requirements:
            if req.priority != "must-have":
                continue

            best_score = best.scores.get(req.name, 0)
            runner_score = runner_up.scores.get(req.name, 0)

            gap = best_score - runner_score
            if gap >= 2.0:  # Significant gap — document as a trade-off.
                best_framework = str(best.name).replace("_", " ").title()
                runner_framework = str(runner_up.name).replace("_", " ").title()

                trade_offs.append(
                    TradeOff(
                        dimension=req.name,
                        option_a=str(best.name),
                        option_b=str(runner_up.name),
                        benefit_of_a=(
                            f"{best_framework} scores {best_score}/5 on "
                            f"{req.description[:60]}"
                        ),
                        cost_of_a=(
                            f"Runner-up ({runner_framework}) scores {runner_score}/5 "
                            f"but may have simpler deployment"
                        ),
                    )
                )

        return trade_offs

    def _draft_migration_plan(
        self,
        target_framework: Framework,
    ) -> str | None:
        """Draft a migration plan for switching to the target framework.

        Args:
            target_framework: The selected winning framework.

        Returns:
            A one-paragraph migration guide, or None if no guidance exists.
        """
        migrations: dict[Framework, str] = {
            Framework.LANGGRAPH: (
                "Migrate LangChain linear chains to LangGraph StateGraph. "
                "Replace direct function calls with node definitions. "
                "Add state schema for inter-node data passing."
            ),
            Framework.GOOGLE_ADK: (
                "Migrate to Google ADK by wrapping existing logic in LlmAgent instances. "
                "Use built-in tools for search/code execution instead of custom integrations."
            ),
            Framework.CREWAI: (
                "Convert sequential chains into CrewAI crews with role-based agents. "
                "Replace direct orchestration with Task class and crew.execute()."
            ),
        }
        return migrations.get(target_framework)
```

### Pattern 3: Quick Decision Flowchart (No Matrix Needed)

For simple projects, use this decision flow instead of the full matrix:

```python
from enum import Enum


class Framework(str, Enum):
    """Supported agentic frameworks."""

    LANGCHAIN = "langchain"
    LANGGRAPH = "langgraph"
    GOOGLE_ADK = "google_adk"
    CREWAI = "crewai"


def quick_decision(
    needs_multi_agent: bool,
    needs_state_management: bool,
    is_google_cloud_project: bool,
    team_python_experience: str,  # "high", "medium", "low"
) -> Framework:
    """Fast framework selection for straightforward projects.

    Applies a decision tree based on four key project attributes.
    Use this when the project has fewer than five requirements
    and the team needs a quick recommendation without building
    a full scoring matrix.

    Args:
        needs_multi_agent: True if the system requires multiple cooperating agents.
        needs_state_management: True if loops, conditionals, or persistence are needed.
        is_google_cloud_project: True if the project is hosted on GCP / Vertex AI.
        team_python_experience: Team's self-assessed Python proficiency level.

    Returns:
        The recommended Framework enum value.
    """
    # Google ecosystem lock-in — strongest signal when both present.
    if is_google_cloud_project and team_python_experience in ("high", "medium"):
        return Framework.GOOGLE_ADK

    # Multi-agent requirement.
    if needs_multi_agent:
        if team_python_experience == "high":
            return Framework.LANGGRAPH  # More control, steeper learning curve.
        return Framework.CREWAI  # Simpler crew abstraction for less experienced teams.

    # State management requirement (loops, conditionals).
    if needs_state_management:
        return Framework.LANGGRAPH

    # Simple linear pipeline — no graph or team needed.
    return Framework.LANGCHAIN


# --- Usage examples ---
if __name__ == "__main__":
    result_1 = quick_decision(
        needs_multi_agent=False,
        needs_state_management=True,
        is_google_cloud_project=False,
        team_python_experience="high",
    )
    # → LANGGRAPH (cyclic graph needed for state management)

    result_2 = quick_decision(
        needs_multi_agent=True,
        needs_state_management=False,
        is_google_cloud_project=True,
        team_python_experience="medium",
    )
    # → GOOGLE_ADK (cloud ecosystem + multi-agent requirement)
```

### Pattern 4: Capability Gap Analysis

```python
from dataclasses import dataclass


class Framework(str):
    """Framework identifier for gap analysis."""

    LANGCHAIN = "langchain"
    LANGGRAPH = "langgraph"
    GOOGLE_ADK = "google_adk"
    CREWAI = "crewai"
    CUSTOM = "custom_orchestration"


@dataclass
class CapabilityGap:
    """A single identified capability gap for a framework."""

    requirement: str
    description: str
    severity: str  # "blocking", "warning", "acceptable-risk"


def analyze_capability_gaps(
    current_framework: Framework,
    new_requirements: list[str],
) -> dict[Framework, list[CapabilityGap]]:
    """Identify which requirements the current framework cannot meet.

    Walks through each new requirement and checks it against a curated set
    of known capability gaps per framework. Returns only gaps that are
    actually relevant to the specified framework.

    Known framework limitations:
        LANGCHAIN: No native state management or cyclic execution.
        LANGGRAPH: No built-in role-based team orchestration (CrewAI pattern).
        GOOGLE_ADK: Cannot run outside Google Cloud without significant modification.
        CREWAI: No cyclic execution loops or persistent checkpointing.

    Args:
        current_framework: The framework currently in use.
        new_requirements: List of requirement strings to check against capabilities.

    Returns:
        A dict keyed by Framework, mapping each framework to its list of gaps
        that would be relevant if the project used it.
    """
    # Known blocking limitations per framework (capability → description).
    known_gaps: dict[Framework, dict[str, str]] = {
        Framework.LANGCHAIN: {
            "state management": "No native state or checkpoint persistence between runs",
            "memory": "No built-in multi-turn memory store",
            "cyclic execution": "Only linear (DAG) pipelines — no loops or conditionals",
            "human-in-the-loop": "No native approval gates or interrupt checkpoints",
        },
        Framework.LANGGRAPH: {
            "role-based teams": "No built-in role-based crew abstraction (see CrewAI)",
            "multi-agent discovery": "Agents must be manually wired in graph edges",
        },
        Framework.GOOGLE_ADK: {
            "self-hosted without GCP": "Requires Google Cloud project — cannot run standalone",
            "on-premises deployment": "Tightly coupled to Vertex AI infrastructure",
        },
        Framework.CREWAI: {
            "cyclic execution loops": "Tasks execute sequentially or in parallel, not cyclically",
            "persistent checkpointing": "No built-in state persistence between task runs",
        },
    }

    # Build the full gap list for every framework.
    all_gaps: dict[Framework, list[CapabilityGap]] = {}
    for fw, limitations in known_gaps.items():
        gaps_for_fw: list[CapabilityGap] = []
        for req in new_requirements:
            req_lower = req.lower()
            for capability_term, description in limitations.items():
                if capability_term in req_lower:
                    severity = "blocking" if capability_term in (
                        "state management", "memory", "persistent checkpointing",
                        "self-hosted without GCP", "on-premises deployment",
                    ) else "warning"
                    gaps_for_fw.append(
                        CapabilityGap(
                            requirement=req,
                            description=description,
                            severity=severity,
                        )
                    )
        all_gaps[fw] = gaps_for_fw

    return all_gaps


# --- Usage example ---
if __name__ == "__main__":
    gaps = analyze_capability_gaps(
        current_framework=Framework.LANGCHAIN,
        new_requirements=[
            "persistent state between runs",
            "human-in-the-loop approval gates",
        ],
    )
    # → {LANGCHAIN: [CapabilityGap(...), CapabilityGap(...)], ...}
```

## Constraints

### MUST DO

1. Score each framework against requirements with evidence from documentation, benchmarks, or production case studies — never use opinions alone.
2. Classify requirements as must-have vs nice-to-have and weight accordingly in the final scoring.
3. Document at least 3 trade-offs between top-ranked frameworks before making a selection.
4. Consider ecosystem lock-in (Google ADK → GCP, CrewAI → LangChain) as a hard constraint when applicable.
5. Include a migration plan if evaluating alternatives to an existing framework — switching costs matter.
6. Use the quick decision flowchart for projects with fewer than 5 requirements before escalating to the full matrix.
7. Reference `code-philosophy` (5 Laws of Elegant Defense): early exit on ecosystem misalignment, fail fast when team lacks required expertise level.
8. Produce a reviewable decision document — a third party should be able to follow the logic without prior context.

### MUST NOT DO

1. Select a framework based solely on popularity or hype — always justify with requirement coverage.
2. Ignore non-functional requirements (debugging, monitoring, deployment) — they matter more than features in production.
3. Compare frameworks across different versions (e.g., LangChain 0.1 vs LangGraph 0.4) — compare within the same maturity level.
4. Skip ecosystem assessment when the project has specific infrastructure dependencies (GCP, AWS, on-prem).
5. Choose a framework without evaluating the team's existing expertise and training time required.
6. Treat this analysis as one-time — re-evaluate quarterly if the project scope or team changes significantly.

---

## Output Template

When this skill is active, deliver:

1. **Requirements list** — All functional and non-functional requirements with priority classification.
2. **Capability scoring table** — Frameworks scored (1-5) per requirement with weighted totals.
3. **Evidence summary** — Sources for each score (documentation links, benchmarks, case studies).
4. **Trade-off analysis** — Key trade-offs between top 2 options with quantified costs.
5. **Selection recommendation** — Winner with justification and migration plan if applicable.
6. **Quick decision alternative** — For simple projects, the flowchart-based result as a cross-reference.

---

## Related Skills

| Skill | Purpose |
|---|---|
| `prompt-chaining` | Prompt chaining implementation depends on framework choice (LCEL vs StateGraph) |
| `multi-agent-collaboration` | Multi-agent orchestration patterns vary significantly by framework |
| `routing-patterns` | Routing mechanisms differ between LangChain RunnableBranch and LangGraph conditional edges |

> 📖 skill(local cache): prompt-chaining, multi-agent-collaboration, routing-patterns
