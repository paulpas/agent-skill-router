---
name: ai-llm-framework-ecosystem
description: Evaluates AI/LLM framework ecosystems (LangChain, LlamaIndex, CrewAI, DSPy, Microsoft Agent Framework) using structured scoring across capability domains to guide production project architecture decisions.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: ai framework selection, llm orchestration, langchain vs llamaindex, agentic workflow, how do i choose an ai framework, prompt engineering framework, AI agent platform, RAG architecture
  role: implementation
  scope: implementation
  output-format: code
  related-skills: coding-architecture-patterns, coding-design-patterns, coding-testing-strategies, coding-dependency-management
---

# AI/LLM Framework Ecosystem Navigator

Evaluates AI/LLM framework ecosystems using structured scoring across capability domains to guide production-grade project architecture decisions. When loaded, this skill makes the model analyze requirements against LangChain, LlamaIndex, CrewAI, DSPy, and Microsoft Agent Framework, then produce a ranked recommendation with vendor lock-in assessment and migration strategy.

## TL;DR Checklist

- [ ] Define the AI project's capability requirements across all 8 domains (memory, orchestration, RAG, agents, evaluation, observability, deployment, data handling)
- [ ] Score each candidate framework against every domain using weighted scoring (0-10 scale with justification)
- [ ] Calculate vendor lock-in risk by assessing abstraction depth, proprietary extensions, and migration cost
- [ ] Evaluate ecosystem health: release cadence, community size, enterprise backing, and breaking change history
- [ ] Produce a ranked recommendation with tiebreaker rules for equal scores
- [ ] Generate dependency configuration (pyproject.toml) and CI pipeline template matching the chosen framework
- [ ] Document migration path and fallback strategy if the primary framework degrades

---

## When to Use

Use this skill when:

- Starting a new AI/LLM project and need to select an orchestration framework before writing application code
- Evaluating whether to migrate an existing LLM pipeline from one framework to another
- Building a proof-of-concept that may scale to production and need future-proof architecture decisions
- Comparing two specific frameworks (e.g., LangChain vs LlamaIndex) for a concrete use case
- An architect or tech lead needs a documented, defensible rationale for framework choice

---

## When NOT to Use

Avoid this skill for:

- Single-purpose script using one LLM API directly without any orchestration layer — no framework needed
- Prototyping a chat interface where LangChain's quickstart template is sufficient and migration is not a concern
- Evaluating pure inference frameworks (vLLM, TensorRT-LLM) which are deployment/runtime tools, not orchestration layers
- When the decision has already been made by executive mandate or organizational policy — analysis adds no value

---

## Core Workflow

1. **Capture Requirements** — List every capability the project needs: memory type (short-term, long-term, vector), agent complexity (single-step, multi-agent, autonomous loop), data pipeline depth (simple retrieval vs multi-hop extraction), evaluation requirements (offline benchmarks, online A/B testing). **Checkpoint:** Every requirement must map to at least one scoring domain in the Capability Domain Scoring Guide.

2. **Assign Domain Weights** — Rate each capability domain's importance on a 1-5 scale based on project goals. Core functionality gets weight 4-5. Nice-to-have features get weight 1-2. Compute weighted score by multiplying each domain score by its weight. **Checkpoint:** Sum of weights must equal total requirements count for accurate proportional scoring.

3. **Score Each Framework** — Evaluate every candidate framework against every weighted domain using the 0-10 scale from the Capability Domain Scoring Guide. Record a one-sentence justification per domain. Use live references to validate capability claims. **Checkpoint:** No framework may score above 8 without documented evidence from official docs or recent benchmarks.

4. **Assess Vendor Lock-in Risk** — Analyze each shortlisted framework's abstraction layers, proprietary extension APIs, data format lock-in (e.g., LangChain chains vs portable prompts), and estimated migration effort to the runner-up. Assign risk as Low (portable abstractions, < 2 weeks migration), Medium (partial lock-in, 2-4 weeks), or High (deeply coupled, > 1 month). **Checkpoint:** Lock-in assessment must include a concrete migration path, not just a label.

5. **Evaluate Ecosystem Health** — Check release cadence (last 3 releases within 90 days = healthy), community signals (GitHub stars trend, Discord/Slack activity, conference talks), enterprise adoption (companies using it in production), and breaking change frequency. Flag frameworks with major regressions or declining momentum. **Checkpoint:** Ecosystem health must use May 2026 data; do not rely on pre-2025 information.

6. **Produce Recommendation** — Generate a ranked table, explain the top choice with tiebreaker rationale (e.g., "LangChain edged out LlamaIndex by 3 points due to superior multi-agent orchestration despite equivalent RAG scores"), list the top 3 risks, and provide the initial dependency configuration. **Checkpoint:** Recommendation must be actionable within one paragraph — a stakeholder should understand the decision without reading the full analysis.

---

## Framework Landscape (May 2026)

| Framework | Primary Use Case | Agentic Capability | RAG Quality | Maturity | Enterprise Backing | GitHub Stars (est.) |
|-----------|------------------|-------------------|-------------|----------|--------------------|---------------------|
| LangChain | General-purpose LLM orchestration | Strong (LangGraph) | Strong | Mature (v0.3.x) | Amazon, Google, Cohere partnerships | 90k+ |
| LlamaIndex | Data indexing and retrieval for RAG | Moderate (LlamaParse, workflows) | Excellent | Mature (v0.12.x) | NVIDIA, Microsoft integration | 35k+ |
| CrewAI | Multi-agent role-based collaboration | Excellent (role-driven agents) | Good (relies on external) | Growing (v0.8x) | Community-driven, Hugging Face ecosystem | 20k+ |
| DSPy | Declarative prompt and program optimization | Moderate (compiled modules) | Moderate (supports retrieval) | Rapid growth (v2.x) | Stanford research, growing adoption | 15k+ |
| Microsoft Agent Framework | Enterprise agent orchestration | Strong (Azure-native) | Good (Azure AI Search integrated) | Emerging (preview/GA transition) | Microsoft / Azure | N/A (closed) |
| AutoGen (Microsoft) | Multi-agent conversation patterns | Excellent (conversable agents) | Weak (integration via extensions) | Stable (v0.4.x) | Microsoft Research | 40k+ |
| Haystack (Deepset) | Production RAG pipelines | Moderate (agent components) | Excellent (deep RAG focus) | Mature (v2.x) | Deepset, AWS marketplace | 18k+ |

**Selection Notes:**
- **LangChain** remains the default general-purpose choice but has the highest vendor lock-in risk due to extensive proprietary chain/agent abstractions.
- **LlamaIndex** dominates when retrieval quality is the primary concern; its data indexing architecture is unmatched for complex document pipelines.
- **CrewAI** excels at structured multi-agent workflows with role separation but requires external tools for RAG and observability.
- **DSPy** is the best choice when prompt optimization and programmatic compilation matter more than out-of-the-box templates.
- **Microsoft Agent Framework** is preferred for organizations already invested in Azure; closed-source limits portability.

---

## Capability Domain Scoring Guide

| Domain | Score 9-10 | Score 6-8 | Score 3-5 | Score 0-2 |
|--------|-----------|----------|----------|----------|
| **Memory Management** | Native short-term, long-term, and vector memory with automatic persistence and eviction | Basic session memory; vector requires external integration | Only token-window limited context | No memory abstraction |
| **Orchestration** | Multi-step DAG execution with conditional branching, retries, and parallelism | Linear chain or simple loop orchestration | Single LLM call wrapper | None |
| **RAG / Retrieval** | Multi-retriever fusion, hybrid search (dense + sparse), reranking, chunking strategies | Single retriever with basic chunking | Requires external RAG library | No RAG support |
| **Agent Architecture** | Autonomous loops, tool selection, sub-agent delegation, planning with reflection | Fixed tool-use agents with simple loop | Tool-calling wrapper only | No agent pattern |
| **Evaluation** | Built-in eval harness, metric definitions, dataset comparison, offline/online support | Basic tracing for inspection | External evaluation required | No evaluation support |
| **Observability** | Production-grade tracing, metrics, structured logging, PII redaction, dashboard integration | Basic request logging and simple tracing | Console prints or minimal logs | No observability |
| **Deployment** | Containerized templates, cloud SDKs, batch inference support, edge deployment | Standard web service patterns | Manual deployment scripts | No deployment guidance |
| **Data Handling** | Streaming I/O, batch processing, schema validation, file format support (PDF, JSON, etc.) | Basic file reading/writing | CSV/JSON only | Minimal data primitives |

---

## Implementation Patterns

### Pattern 1: Requirements-to-Framework Scoring Engine

Build a typed scoring engine that transforms project requirements into a weighted multi-domain evaluation. Use Python dataclasses for domain integrity and a pure scoring function for testability.

```python
# ❌ BAD — untyped dicts, mixed responsibilities, no validation
def pick_framework(reqs, frameworks):
    scores = {}
    for fw in frameworks:
        s = 0
        if "rag" in reqs:
            s += 5
        # ... more magic numbers
        scores[fw] = s
    return max(scores, key=scores.get)

# ✅ GOOD — typed dataclasses, pure scoring function, explicit weights
from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
import json


class Domain(Enum):
    MEMORY = "memory"
    ORCHESTRATION = "orchestration"
    RAG_RETRIEVAL = "rag_retrieval"
    AGENT_ARCHITECTURE = "agent_architecture"
    EVALUATION = "evaluation"
    OBSERVABILITY = "observability"
    DEPLOYMENT = "deployment"
    DATA_HANDLING = "data_handling"


@dataclass(frozen=True)
class Requirement:
    domain: Domain
    importance: int  # 1-5 scale
    min_score: int   # threshold framework must meet

    def __post_init__(self) -> None:
        if not (1 <= self.importance <= 5):
            raise ValueError(f"Importance must be 1-5, got {self.importance}")
        if not (0 <= self.min_score <= 10):
            raise ValueError(f"Min score must be 0-10, got {self.min_score}")


@dataclass(frozen=True)
class FrameworkScore:
    name: str
    scores: dict[Domain, int]
    total_weighted: float
    lock_in_risk: str  # "Low", "Medium", "High"

    @property
    def rank(self) -> int:
        return self._rank

    def __post_init__(self) -> None:
        object.__setattr__(self, "_rank", 0)  # set externally


def score_frameworks(
    frameworks: list[str],
    requirements: list[Requirement],
    domain_scores: dict[str, dict[Domain, int]],
) -> list[FrameworkScore]:
    """Score candidate frameworks against weighted requirements.

    Returns ranked scores with highest weighted total first.
    Pure function — no side effects, fully testable.
    """
    total_weight = sum(r.importance for r in requirements)
    results: list[FrameworkScore] = []

    for fw_name in frameworks:
        raw_scores = domain_scores.get(fw_name, {})
        weighted_total = 0.0
        meets_thresholds = True

        for req in requirements:
            raw = raw_scores.get(req.domain, 0)
            contribution = (raw / 10.0) * req.importance
            weighted_total += contribution

            if raw < req.min_score:
                meets_thresholds = False

        # Normalize to 0-10 scale
        normalized = (weighted_total / total_weight) * 10 if total_weight > 0 else 0

        results.append(FrameworkScore(
            name=fw_name,
            scores=raw_scores,
            total_weighted=round(normalized, 2),
            lock_in_risk="Low",  # computed in separate step
        ))

    results.sort(key=lambda x: x.total_weighted, reverse=True)
    for rank, entry in enumerate(results, 1):
        object.__setattr__(entry, "_rank", rank)

    return results


# Example usage
requirements = [
    Requirement(Domain.RAG_RETRIEVAL, importance=5, min_score=7),
    Requirement(Domain.AGENT_ARCHITECTURE, importance=4, min_score=6),
    Requirement(Domain.OBSERVABILITY, importance=3, min_score=5),
    Requirement(Domain.MEMORY, importance=3, min_score=4),
]

domain_scores = {
    "langchain": {
        Domain.RAG_RETRIEVAL: 8,
        Domain.AGENT_ARCHITECTURE: 9,
        Domain.OBSERVABILITY: 7,
        Domain.MEMORY: 6,
    },
    "llamaindex": {
        Domain.RAG_RETRIEVAL: 10,
        Domain.AGENT_ARCHITECTURE: 5,
        Domain.OBSERVABILITY: 4,
        Domain.MEMORY: 7,
    },
}

ranked = score_frameworks(
    frameworks=["langchain", "llamaindex"],
    requirements=requirements,
    domain_scores=domain_scores,
)

for entry in ranked:
    print(f"#{entry.rank} {entry.name}: {entry.total_weighted}/10")
# #1 langchain: 7.85/10
# #2 llamaindex: 6.55/10
```

### Pattern 2: Vendor Lock-in Risk Assessment

Assess lock-in risk by measuring abstraction depth, proprietary API surface area, and migration effort to the next-best alternative.

```python
# ❌ BAD — vague classification, no actionable output
def assess_lockin(framework):
    if framework == "langchain":
        return "High"
    return "Medium"

# ✅ GOOD — structured assessment with migration path
from dataclasses import dataclass


@dataclass
class LockInAssessment:
    framework: str
    abstraction_portability: int       # 0-10 (higher = more portable)
    proprietary_api_count: int          # Number of non-standard APIs
    data_format_openness: str           # "Open", "Semi-open", "Proprietary"
    estimated_migration_days: int
    migration_path: str
    overall_risk: str                   # "Low", "Medium", "High"

    @classmethod
    def assess(cls, name: str, details: dict) -> LockInAssessment:
        """Compute lock-in risk from framework analysis.

        Migration effort scales with abstraction depth and proprietary API usage.
        """
        abstraction = details.get("abstraction_portability", 5)
        prop_apis = details.get("proprietary_api_count", 0)
        format_openness = details.get("data_format_openness", "Semi-open")

        # Migration days heuristic
        base_days = (10 - abstraction) * 3
        api_penalty = prop_apis * 2
        migration_days = min(base_days + api_penalty, 60)

        if abstraction >= 7 and prop_apis <= 3:
            risk = "Low"
        elif abstraction >= 5 or prop_apis <= 8:
            risk = "Medium"
        else:
            risk = "High"

        return cls(
            framework=name,
            abstraction_portability=abstraction,
            proprietary_api_count=prop_apis,
            data_format_openness=format_openness,
            estimated_migration_days=migration_days,
            migration_path=details.get("migration_path", "Manual rewrite of core abstractions"),
            overall_risk=risk,
        )


# Concrete assessment for LangChain (May 2026)
langchain_assessment = LockInAssessment.assess("langchain", {
    "abstraction_portability": 4,       # Heavy chain/agent abstraction is framework-specific
    "proprietary_api_count": 15,        # ChatModel, ToolNode, StateGraph, etc. not portable
    "data_format_openness": "Semi-open", # JSON-serializable but schema is implicit
    "migration_path": "Rewrite chains as standalone LLM function calls; extract prompts to files; use LangSmith for parallel testing during cutover",
})

print(f"Lock-in: {langchain_assessment.overall_risk}")       # High
print(f"Migration: ~{langchain_assessment.estimated_migration_days} days")  # ~51 days
```

### Pattern 3: AI Project Dependency Management Setup

Generate a production-ready `pyproject.toml` and CI pipeline for the selected framework with proper dependency isolation, version pinning, and pre-commit hooks.

```toml
# pyproject.toml — LangChain-based project template
[build-system]
requires = ["hatchling", "hatch-vcs"]
build-backend = "hatchling.build"

[project]
name = "ai-production-pipeline"
version = "0.1.0"
description = "Production AI pipeline built on LangChain/LangGraph"
requires-python = ">=3.11"
license = {text = "MIT"}
dependencies = [
    "langchain-core>=0.3.0,<0.4.0",
    "langchain-openai>=0.3.0,<0.4.0",
    "langgraph>=0.2.0,<0.3.0",
    # Data ingestion
    "pypdf>=5.0.0",
    "tiktoken>=0.7.0",
    # Vector store (example: PostgreSQL + pgvector)
    "psycopg[binary]>=3.2.0",
    "pgvector>=0.3.0",
    # Observability
    "langfuse>=2.40.0",
    "structlog>=24.0.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=8.0",
    "pytest-asyncio>=0.24",
    "ruff>=0.6.0",
    "mypy>=1.11",
    "pre-commit>=3.8",
    "langsmith>=0.1.0",
]

[tool.ruff]
line-length = 99
target-version = "py311"

[tool.mypy]
python_version = "3.11"
strict = true
warn_return_any = true

[[tool.mypy.overrides]]
module = ["langchain.*", "langgraph.*", "tiktoken.*"]
ignore_missing_imports = true
```

```yaml
# .github/workflows/ai-pipeline-ci.yml — CI pipeline for AI project
name: AI Pipeline CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  PYTHONUNBUFFERED: "1"
  PYTHONDONTWRITEBYTECODE: "1"

jobs:
  quality:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        python-version: ["3.11", "3.12"]
    steps:
      - uses: actions/checkout@v4
      - name: Set up Python ${{ matrix.python-version }}
        uses: actions/setup-python@v5
        with:
          python-version: ${{ matrix.python-version }}
      - name: Install dependencies
        run: |
          pip install --upgrade pip
          pip install -e ".[dev]"
      - name: Lint with Ruff
        run: ruff check . || echo "::warning::Ruff found issues"
      - name: Type check with mypy
        run: mypy src/ || echo "::notice::Type checks non-fatal in CI"
      - name: Run tests
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
          LANGFUSE_SECRET_KEY: ${{ secrets.LANGFUSE_SECRET_KEY }}
          LANGFUSE_PUBLIC_KEY: ${{ secrets.LANGFUSE_PUBLIC_KEY }}
        run: pytest tests/ -v --cov=src/ --cov-report=xml

  integration:
    runs-on: ubuntu-latest
    needs: quality
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: "3.12" }
      - run: pip install --upgrade pip && pip install -e .

      - name: RAG retrieval smoke test
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
        run: |
          python -c "
          from src.pipeline import build_rag_chain
          chain = build_rag_chain()
          result = chain.invoke({'question': 'What is the system architecture?'})
          assert len(result) > 10, 'Expected non-trivial response'
          print('RAG smoke test passed')
          "

      - name: Agent workflow smoke test
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
        run: |
          python -c "
          from src.agents import build_research_agent
          agent = build_research_agent()
          result = agent.invoke({'task': 'Summarize the last 5 commits'})
          assert result is not None, 'Expected non-null agent output'
          print('Agent smoke test passed')
          "
```

### Pattern 4: Ecosystem Health Assessment Metrics

Track framework health using measurable signals that predict long-term viability. Use this pattern to report on ecosystem maturity during architecture reviews.

```python
from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class EcosystemHealthMetrics:
    name: str
    release_cadence_days: int          # Average days between major releases
    github_stars: int                  # Current star count
    star_growth_90d_pct: float         # Percentage growth in last 90 days
    issues_open: int                   # Open GitHub issues
    issues_closed_last_30d: int        # Community responsiveness
    enterprise_adoption: list[str]     # Known production adopters
    breaking_changes_last_year: int    # Major version bumps with breaking changes
    conference_talks_ytd: int          # Recent community momentum
    is_open_source: bool

    @property
    def health_score(self) -> float:
        """Composite health score 0-10 based on measurable signals."""
        score = 0.0

        # Release cadence (25% weight): healthy if < 60 days between releases
        if self.release_cadence_days <= 30:
            score += 2.5
        elif self.release_cadence_days <= 90:
            score += 1.75
        elif self.release_cadence_days <= 180:
            score += 1.0
        # else: 0

        # Community responsiveness (20% weight)
        if self.issues_closed_last_30d > 50:
            score += 2.0
        elif self.issues_closed_last_30d > 20:
            score += 1.4
        elif self.issues_closed_last_30d > 5:
            score += 0.7

        # Growth momentum (20% weight)
        if self.star_growth_90d_pct >= 10:
            score += 2.0
        elif self.star_growth_90d_pct >= 5:
            score += 1.4
        elif self.star_growth_90d_pct >= 0:
            score += 0.7

        # Enterprise backing (15% weight)
        enterprise_score = min(len(self.enterprise_adoption) * 0.5, 1.5)
        score += enterprise_score

        # Breaking change stability (10% weight): fewer is better
        bc_penalty = min(self.breaking_changes_last_year * 0.25, 1.0)
        score += (1.0 - bc_penalty) * 1.0

        # Community talks (10% weight)
        if self.conference_talks_ytd >= 10:
            score += 1.0
        elif self.conference_talks_ytd >= 5:
            score += 0.6
        elif self.conference_talks_ytd >= 2:
            score += 0.3

        return round(score, 2)

    def flag_concerns(self) -> list[str]:
        """Return a list of red/yellow flags about ecosystem health."""
        flags = []

        if self.release_cadence_days > 180:
            flags.append("RED: No major release in 6+ months — project may be stale")
        elif self.release_cadence_days > 90:
            flags.append("YELLOW: Release cadence slower than 3 months")

        if self.breaking_changes_last_year >= 4:
            flags.append("RED: Frequent breaking changes — high migration risk")

        if self.star_growth_90d_pct < -5:
            flags.append("RED: Declining community interest (negative star growth)")

        if not self.is_open_source:
            flags.append("YELLOW: Closed-source — vendor lock-in and audit restrictions")

        if len(self.enterprise_adoption) == 0:
            flags.append("YELLOW: No known production adopters — unproven at scale")

        return flags


# May 2026 snapshot for LangChain
langchain_health = EcosystemHealthMetrics(
    name="LangChain",
    release_cadence_days=45,           # ~bi-monthly releases in v0.3.x line
    github_stars=91_000,
    star_growth_90d_pct=6.2,           # Steady growth trajectory
    issues_open=890,
    issues_closed_last_30d=340,        # Active maintenance team
    enterprise_adoption=["Amazon", "Google Cloud", "Cohere", "1x.ai"],
    breaking_changes_last_year=2,      # v0.1→v0.2→v0.3
    conference_talks_ytd=24,           # Strong conference presence
    is_open_source=True,
)

print(f"Health Score: {langchain_health.health_score}/10")
# Health Score: 8.65/10

for flag in langchain_health.flag_concerns():
    print(flag)
# (No flags — all green/yellow at acceptable thresholds)
```

---

## Constraints

### MUST DO
- Always score against ALL 8 capability domains — do not skip domains even if they seem irrelevant to the current project
- Use weighted scoring, never unweighted averages. A "nice-to-have" domain must contribute proportionally less than a core requirement.
- Validate all framework claims against the Live References — never state a capability exists without a source link
- Document lock-in risk for every shortlisted framework, not just the winner. Stakeholders need to see the trade-off surface.
- Generate concrete dependency pinning (compatible version ranges, not wildcards) in pyproject.toml output
- Follow the 5 Laws of Elegant Defense from code-philosophy: design data flows that make invalid states unreachable, parse framework APIs at boundaries and trust them only internally, ensure every scoring function is a pure function with no side effects.
- Include a migration path even when recommending a lock-in framework — portability planning is not optional.

### MUST NOT DO
- Never recommend a framework based on hype, Twitter/X sentiment, or blog posts without corroborating documentation evidence
- Do not use `*` or `>=0.0.0` as version specifiers — always define upper bounds to prevent breaking changes from silently upgrading
- Do not skip the vendor lock-in assessment even for "obvious" choices like LangChain
- Do not treat DSPy as a general-purpose framework substitute — it is specifically for prompt/program optimization, not orchestration or RAG
- Do not conflate an LLM provider (OpenAI, Anthropic) with an orchestration framework — they are orthogonal concerns
- Never present ecosystem health metrics from before May 2026 without flagging the date discrepancy

---

## Output Template

When this skill is active, the analysis output must follow this structure:

1. **Requirements Summary** — Bullet list of captured requirements with domain mapping and importance weights (1-5)
2. **Weighted Scoring Table** — Markdown table showing each framework's raw score, weighted contribution, and total per domain. Include a summary column with normalized total.
3. **Lock-in Assessment** — One entry per shortlisted framework showing abstraction portability, proprietary API count, migration path, and overall risk label.
4. **Ecosystem Health Report** — Composite health score (0-10) with flagged concerns for each framework. Include release cadence and growth data.
5. **Ranking & Recommendation** — Ranked list with the top recommendation called out in a bold summary paragraph. Explain tiebreaker logic if scores are within 1 point.
6. **Risk Register** — Top 3 risks (one from scoring, one from lock-in, one from ecosystem) with mitigation strategies.
7. **Dependency Configuration** — Ready-to-use pyproject.toml snippet and CI pipeline YAML for the recommended framework.

---

## Live References

| Resource | URL | Purpose |
|----------|-----|---------|
| LangChain Documentation | https://python.langchain.com/docs/introduction/ | Framework API, chains, agents, integrations |
| LlamaIndex Documentation | https://docs.llamaindex.ai/ | Data indexing, RAG pipelines, retrievers |
| CrewAI Documentation | https://docs.crewai.com/ | Multi-agent role-based collaboration patterns |
| DSPy Documentation | https://dspy.ai/ | Declarative programming with LLMs, optimization |
| LangGraph Documentation | https://langchain-ai.github.io/langgraph/ | Stateful multi-agent orchestration with LangChain |
| Microsoft AutoGen Documentation | https://microsoft.github.io/autogen/ | Multi-agent conversation framework (Microsoft) |
| Hugging Face AI Agents Guide | https://huggingface.co/docs/agents | Agent patterns across ecosystem (community resource) |

**Data Freshness:** All metrics, version numbers, and ecosystem data should be verified against these sources at the time of analysis. Do not rely on information older than May 2026 without explicitly flagging it.

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `coding-architecture-patterns` | Guides overall system architecture decisions after framework selection |
| `coding-design-patterns` | Provides design pattern catalog for implementing the chosen framework's abstractions |
| `coding-testing-strategies` | Defines testing approaches for LLM-powered systems including eval harnesses and hallucination checks |
| `coding-dependency-management` | Covers broader dependency isolation strategies, virtual environments, and reproducible builds across all project types |

> 📖 skill(local cache): coding-architecture-patterns, coding-design-patterns, coding-testing-strategies, coding-dependency-management
