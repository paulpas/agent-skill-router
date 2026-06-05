---




name: ai-framework-comparison
description: Evaluates and compares AI agent frameworks (LangGraph, CrewAI, OpenAI Agents SDK, LlamaIndex, AutoGen) using weighted scoring matrices across architecture fit, ecosystem maturity, production readiness, cost, and latency dimensions.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: agent
  triggers: ai framework comparison, framework evaluation, LangGraph vs CrewAI, agent framework scoring, LLM framework selection, AI framework matrix, model routing framework
  archetypes: [tactical, strategic]
  anti_triggers: [vague ideation, brainstorming]
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, examples, do-dont]
  related-skills: protocol-first-agent-design, ai-framework-selection, observability-patterns




---





# AI Framework Comparison Engine

Evaluates and scores AI agent frameworks using weighted decision matrices to select the best fit for project requirements. Produces quantitative comparisons across architecture patterns, ecosystem maturity, production readiness, cost predictability, and latency profiles.

## TL;DR Checklist

- [ ] Define evaluation criteria with weighted scores matching project priorities
- [ ] Populate comparison matrix with real data for each candidate framework
- [ ] Calculate weighted scores and identify top-ranked frameworks
- [ ] Validate top choice against hard constraints (security, compliance, licensing)
- [ ] Document trade-offs and fallback options in decision record

---

## When to Use

Use this skill when:

- Selecting an AI agent framework for a new project with competing candidates
- Evaluating whether to migrate from one framework to another
- Building a business case for framework adoption that requires quantitative justification
- Comparing open-source frameworks against commercial platforms (e.g., LangGraph vs. Dify)

## When NOT to Use

Avoid this skill for:
- Technical deep-dives into a single framework's internals — use the specific framework skill instead
- Runtime decisions during agent execution — this is an architectural, pre-development concern
- Frameworks already selected by organizational policy where evaluation is already complete

---

## Core Workflow

1. **Define Evaluation Criteria** — Establish 5–8 weighted criteria based on project requirements. Assign each criterion a weight (0.0–1.0) such that all weights sum to 1.0. Common criteria: architecture fit, ecosystem maturity, production readiness, multi-model support, cost predictability, latency characteristics, vendor lock-in risk.

2. **Populate Scoring Matrix** — For each candidate framework, score against every criterion on a 1–5 scale (1 = poor fit, 5 = excellent fit). Ground scores in concrete evidence: star counts, release cadence, production case studies, benchmark data. Do not guess — research each metric for accuracy as of current date.

3. **Calculate Weighted Scores** — Multiply each criterion score by its weight and sum across all criteria to produce a total weighted score per framework. Rank frameworks by descending total score.

4. **Validate Against Hard Constraints** — Apply binary pass/fail filters for non-negotiable requirements: licensing compatibility (Apache 2.0 vs BSL), data residency compliance, language ecosystem alignment, mandatory integrations. Any framework failing a hard constraint is eliminated regardless of score.

5. **Document Decision Record** — Produce a structured comparison with scores, rankings, top choices, and explicit trade-offs. Include fallback frameworks in case the primary choice becomes unavailable.

## Implementation Patterns

### Pattern 1: Weighted Scoring Matrix Calculator

```python
from dataclasses import dataclass, field
from typing import Any


@dataclass
class Criterion:
    """A single evaluation criterion with weight and description."""
    name: str
    weight: float  # Must sum to 1.0 across all criteria
    description: str
    scale: tuple = (1, 5)

    def validate_weight(self) -> None:
        if not 0.0 < self.weight <= 1.0:
            raise ValueError(f"Criterion '{self.name}' weight must be in (0, 1], got {self.weight}")


@dataclass
class FrameworkScore:
    """Individual score for a framework on a criterion."""
    framework: str
    criterion: str
    raw_score: int  # 1-5 scale
    justification: str


@dataclass
class ComparisonResult:
    """Final comparison output with rankings and trade-offs."""
    criteria: list[Criterion]
    scores: dict[str, list[FrameworkScore]]
    rankings: list[tuple[str, float]]  # (framework_name, total_weighted_score)
    eliminated_frameworks: dict[str, list[str]]  # framework -> [failed_constraint_reasons]
    recommended_top_choice: str | None = None
    recommended_fallback: str | None = None


class FrameworkComparator:
    """Calculates weighted scores for AI agent framework comparisons."""

    def __init__(self, criteria: list[Criterion]):
        total_weight = sum(c.weight for c in criteria)
        if abs(total_weight - 1.0) > 1e-9:
            raise ValueError(f"All criterion weights must sum to 1.0, got {total_weight}")
        self.criteria = criteria

    def calculate_scores(self, scores: dict[str, list[FrameworkScore]]) -> ComparisonResult:
        """Calculate weighted totals and produce ranked comparison result."""
        framework_totals: dict[str, float] = {}

        for framework_name, framework_scores in scores.items():
            total = 0.0
            criterion_map = {s.criterion: s.raw_score * self._get_weight(s.criterion) for s in framework_scores}
            for criterion in self.criteria:
                raw = next((s.raw_score for s in framework_scores if s.criterion == criterion.name), 0)
                total += raw * criterion.weight
            framework_totals[framework_name] = total

        rankings = sorted(framework_totals.items(), key=lambda x: x[1], reverse=True)

        result = ComparisonResult(
            criteria=self.criteria,
            scores=scores,
            rankings=rankings,
            eliminated_frameworks={},
            recommended_top_choice=rankings[0][0] if rankings else None,
            recommended_fallback=rankings[1][0] if len(rankings) > 1 else None,
        )
        return result

    def _get_weight(self, criterion_name: str) -> float:
        for c in self.criteria:
            if c.name == criterion_name:
                return c.weight
        return 0.0


def build_standard_criteria(priority: str = "balanced") -> list[Criterion]:
    """Return pre-built criteria sets tuned to common project priorities.

    Args:
        priority: One of 'production', 'experimentation', 'enterprise'.
                  Determines criterion weighting emphasis.
    """
    if priority == "production":
        return [
            Criterion("architecture fit", 0.20, "Graph-based vs chain vs team orchestration pattern"),
            Criterion("ecosystem maturity", 0.15, "Plugin availability, community size, documentation quality"),
            Criterion("production readiness", 0.25, "Observability, evaluation, deployment tooling"),
            Criterion("multi-model support", 0.15, "Support across OpenAI, Anthropic, Google, open-weight models"),
            Criterion("cost predictability", 0.15, "Token optimization, caching strategies, model routing"),
            Criterion("latency characteristics", 0.10, "Streaming support, parallel tool calls, async execution"),
        ]
    elif priority == "enterprise":
        return [
            Criterion("architecture fit", 0.15, "Graph-based vs chain vs team orchestration pattern"),
            Criterion("ecosystem maturity", 0.10, "Plugin availability, community size, documentation quality"),
            Criterion("production readiness", 0.15, "Observability, evaluation, deployment tooling"),
            Criterion("multi-model support", 0.12, "Support across OpenAI, Anthropic, Google, open-weight models"),
            Criterion("cost predictability", 0.13, "Token optimization, caching strategies, model routing"),
            Criterion("latency characteristics", 0.10, "Streaming support, parallel tool calls, async execution"),
            Criterion("security compliance", 0.25, "PII handling, audit trails, RBAC, data governance"),
        ]
    else:  # balanced or experimentation
        return [
            Criterion("architecture fit", 0.25, "Graph-based vs chain vs team orchestration pattern"),
            Criterion("ecosystem maturity", 0.20, "Plugin availability, community size, documentation quality"),
            Criterion("production readiness", 0.20, "Observability, evaluation, deployment tooling"),
            Criterion("multi-model support", 0.15, "Support across OpenAI, Anthropic, Google, open-weight models"),
            Criterion("cost predictability", 0.10, "Token optimization, caching strategies, model routing"),
            Criterion("latency characteristics", 0.10, "Streaming support, parallel tool calls, async execution"),
        ]


# Example usage: comparator = FrameworkComparator(build_standard_criteria("production"))
```

### Pattern 2: Evidence-Based Scoring with Research Data (BAD vs. GOOD)

```python
# ❌ BAD — guessing scores without evidence leads to unreliable comparisons
def score_framework_guess(framework_name: str, criterion: str) -> int:
    # Subjective guess with no supporting data
    return 4  # Arbitrary number


# ✅ GOOD — scoring grounded in verifiable research metrics
def score_framework_with_evidence(
    framework_name: str,
    criterion: str,
    evidence_data: dict[str, Any],
) -> FrameworkScore:
    """Score a framework against a criterion using concrete, researched evidence.

    Args:
        framework_name: Name of the framework being evaluated.
        criterion: The evaluation criterion (e.g., "ecosystem maturity").
        evidence_data: Dict with keys like 'stars', 'release_monthly',
                      'case_studies', 'plugin_count' populated from research.

    Returns:
        FrameworkScore with raw score and justification string.
    """
    if criterion == "ecosystem maturity":
        stars = evidence_data.get("github_stars", 0)
        plugins = evidence_data.get("active_plugins", 0)
        releases_last_90d = evidence_data.get("releases_last_90_days", 0)

        # Score based on composite of verifiable metrics
        star_score = min(5, max(1, stars // 25_000))  # 50k+ stars → 5, 25k → 4, etc.
        plugin_score = min(5, max(1, plugins // 30))
        release_score = min(5, max(1, releases_last_90d // 3))

        raw = (star_score + plugin_score + release_score) / 3
        justification = (
            f"GitHub stars: {stars:,} (score: {star_score}/5), "
            f"Plugins: {plugins} (score: {plugin_score}/5), "
            f"Releases in 90d: {releases_last_90d} (score: {release_score}/5)"
        )
        return FrameworkScore(
            framework=framework_name, criterion=criterion,
            raw_score=round(raw), justification=justification,
        )

    elif criterion == "multi-model support":
        models = evidence_data.get("supported_models", [])
        has_openai = any("openai" in m.lower() for m in models)
        has_anthropic = any("anthropic" in m.lower() for m in models)
        has_google = any("google" in m.lower() or "gemini" in m.lower() for m in models)
        has_open_source = any(m in evidence_data.get("open_models", []) for m in ["llama", "mistral"])

        support_count = sum([has_openai, has_anthropic, has_google, has_open_source])
        raw = min(5, support_count + 1)  # max 4 supported → score 5
        justification = (
            f"Supported: OpenAI={has_openai}, Anthropic={has_anthropic}, "
            f"Google={has_google}, Open-Source={has_open_source} "
            f"({support_count}/4 major providers)"
        )
        return FrameworkScore(
            framework=framework_name, criterion=criterion,
            raw_score=round(raw), justification=justification,
        )

    raise ValueError(f"Unsupported criterion: {criterion}")


# Example data for research-populated scoring
SAMPLE_EVIDENCE = {
    "LangGraph": {"github_stars": 33000, "active_plugins": 120, "releases_last_90_days": 8},
    "CrewAI":   {"github_stars": 52000, "active_plugins": 45,  "releases_last_90_days": 6},
}

# score = score_framework_with_evidence("LangGraph", "ecosystem maturity", SAMPLE_EVIDENCE["LangGraph"])
```

### Pattern 3: Hard Constraint Validator

```python
def validate_hard_constraints(
    framework_name: str,
    constraints: list[dict[str, str]],
) -> tuple[bool, list[str]]:
    """Validate a framework against non-negotiable project constraints.

    Args:
        framework_name: Name of the framework to check.
        constraints: List of dicts with keys 'field', 'operator', 'expected_value'.
                     Examples: {'field': 'license', 'operator': 'eq', 'expected_value': 'Apache-2.0'}

    Returns:
        Tuple of (passed, list_of_failed_constraint_descriptions).
    """
    # Framework registry with constraint fields (populated from research)
    framework_registry = {
        "LangGraph": {"license": "MIT", "languages": ["Python", "TypeScript"], "data_residency": "any"},
        "CrewAI":    {"license": "MIT", "languages": ["Python"],               "data_residency": "any"},
        "OpenAI Agents SDK": {"license": "MIT", "languages": ["Python"],      "data_residency": "any"},
        "AutoGen":   {"license": "MIT", "languages": ["Python"],              "data_residency": "any"},
        "LlamaIndex":{"license": "MIT", "languages": ["Python", "TypeScript"], "data_residency": "any"},
        "Dify":      {"license": "SSPL-1.0", "languages": ["Python"],          "data_residency": "self-hosted"},
    }

    fw = framework_registry.get(framework_name)
    if not fw:
        return False, [f"Framework '{framework_name}' not found in registry"]

    failed: list[str] = []
    for constraint in constraints:
        field = constraint["field"]
        operator = constraint["operator"]
        expected = constraint["expected_value"]

        actual = fw.get(field)

        if operator == "eq" and actual != expected:
            failed.append(f"{framework_name}: {field}={actual} does not match required {expected}")
        elif operator == "in" and expected not in actual:
            failed.append(f"{framework_name}: {field} '{actual}' not in allowed {expected}")

    return len(failed) == 0, failed
```

---

## Constraints

### MUST DO
- Use weighted criteria that sum to exactly 1.0 — validate this programmatically
- Ground every score in concrete, researchable evidence (star counts, release cadence, case studies)
- Update evidence data with current dates before each evaluation run
- Apply hard constraints as binary filters BEFORE calculating weighted scores
- Document trade-offs explicitly — the second-ranked framework often has better fit for edge cases

### MUST NOT DO
- Score frameworks based on personal preference or anecdotal experience without evidence
- Include more than 8 criteria — this dilutes decision quality and creates false precision
- Treat weighted scores as deterministic truth — scores are decision aids, not guarantees
- Skip hard constraint validation because a framework has a high overall score

---

## Output Template

When using this skill, produce the following output:

1. **Evaluation Summary** — Criteria list with weights, priority context (production/experimentation/enterprise)
2. **Scoring Matrix** — Table showing each framework's raw scores per criterion and weighted totals
3. **Rankings** — Ordered list of frameworks by total score with recommended top choice and fallback
4. **Elimination Report** — Frameworks eliminated by hard constraints with specific reasons
5. **Decision Record** — Narrative summary of trade-offs, recommendation rationale, and next steps for validation

## Related Skills

| Skill | Purpose |
|---|---|
| `protocol-first-agent-design` | Once a framework is selected, apply protocol-first design patterns using MCP and A2A |
| `ai-framework-selection` | High-level framework selection guide for choosing between major AI frameworks |
| `observability-patterns` | After framework selection, implement tracing, cost tracking, and latency monitoring |

## Live References

> Authoritative documentation links for AI agent framework evaluation.

- [LangGraph Documentation](https://langchain-ai.github.io/langgraph/)
- [CrewAI Documentation](https://docs.crewai.com/)
- [OpenAI Agents SDK Documentation](https://platform.openai.com/docs/guides/agents-sdk)
- [LlamaIndex Framework Documentation](https://docs.llamaindex.ai/)
- [AutoGen (AG2) Documentation](https://docs.ag2.ai/)
- [MCP Specification](https://modelcontextprotocol.io/)
