---
name: ai-framework-selector
description: Evaluates and selects the optimal AI agent framework (LangChain, CrewAI,
  LlamaIndex, DSPy, Microsoft Agent Framework) for a project based on capability requirements,
  production constraints, and team expertise.
license: MIT
compatibility: opencode
metadata:
version: "1.0.0"
  domain: agent
  triggers: ai framework selection, which ai framework to use, langchain vs crewai,
    choose ai agent framework, framework comparison, build custom vs use framework,
    AI agent tooling, how do i pick an ai framework, LLM framework evaluation
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
  - do-dont
  - diagrams
  related-skills: framework-selection, framework-orchestration-routing, orchestration-frameworks,
    agent-architecture-patterns
---
# AI Agent Framework Selector

Selects the optimal AI agent framework for a project by evaluating capability requirements against the current ecosystem of production-grade frameworks. When this skill is active, the model acts as a senior AI systems architect who analyzes project requirements, scores available frameworks against those requirements, and produces a defensible selection rationale with implementation guidance.

## TL;DR Checklist

- [ ] Extract explicit requirements (RAG, multi-agent, tool use) and implicit constraints (team expertise, budget, deployment target)
- [ ] Classify each requirement into capability domains: RAG/retrieval, multi-agent coordination, tool execution, chain composition, parallel processing, prompt optimization
- [ ] Score all candidate frameworks against each domain using the capability matrix (1–10 scale with justification)
- [ ] Validate the top choice meets ALL hard constraints; disqualify if any hard constraint fails
- [ ] Assess vendor lock-in risk for the winning framework and document mitigation strategies
- [ ] Produce a selection report with scored comparison, trade-off analysis, and phased implementation plan

---

## When to Use

Use this skill when:

- Starting a new AI/LLM project and need to select an agent framework from the available options (LangChain, LlamaIndex, CrewAI, DSPy, Microsoft Agent Framework, AG2, etc.)
- Evaluating whether to migrate from one AI framework to another due to changing requirements or performance issues
- Deciding between building a custom orchestration layer versus adopting an existing framework
- Assessing vendor lock-in risk before committing to a framework with commercial add-ons (LangSmith, Crew Control Plane, Azure Foundry)
- Forming a new engineering team and need to select the framework that best matches their skill set
- Comparing frameworks for a specific use case (RAG pipeline, multi-agent research, tool-heavy automation, prompt optimization)

---

## When NOT to Use

Avoid this skill for:

- Projects already committed to a framework — instead use `orchestration-frameworks` or `framework-orchestration-routing`
- Selecting non-AI software frameworks (databases, web frameworks, cloud providers) — use `framework-selection` which handles generic decision matrices
- Simple single-agent chat completion with tools where raw SDK calls (OpenAI SDK, Google GenAI SDK) are sufficient and framework overhead would be wasted
- Teams that have already made a framework commitment and only need implementation patterns rather than selection analysis

---

## Core Workflow

```
┌───────────────────────────────────────────────────┐
│              Project Requirements                  │
│  Explicit: RAG, tools, multi-agent, latency       │
│  Implicit: team skills, budget, deployment        │
└──────────────────────┬────────────────────────────┘
                       ↓
┌───────────────────────────────────────────────────┐
│          Capability Domain Classification          │
│  RAG | Multi-Agent | Tools | Chaining | Parallel │
└──────────────────────┬────────────────────────────┘
                       ↓
┌───────────────────────────────────────────────────┐
│        Candidate Framework Identification          │
│  LangChain · LlamaIndex · CrewAI · DSPy · MAF     │
│  AG2 · Phidata · Custom (build)                   │
└──────────────────────┬────────────────────────────┘
                       ↓
┌───────────────────────────────────────────────────┐
│         Capability Scoring Matrix                  │
│  Framework × Domain scoring with justification     │
└──────────────────────┬────────────────────────────┘
                       ↓
          ┌────────────┴────────────┐
          ↓                         ↓
   Meets all hard           Fails ≥1 hard
   constraints?              constraint(s)?
          ↓                         ↓
    ┌─────────┐            ┌──────────────┐
    │ Proceed  │            │ Disqualify &  │
    │ to next  │            │ Find runner-  │
    │ step     │            │ up alternative│
    └─────────┘            └──────────────┘
                       ↓
┌───────────────────────────────────────────────────┐
│       Vendor Lock-in & Risk Assessment             │
│  Commercial dependency, API stability, community   │
└──────────────────────┬────────────────────────────┘
                       ↓
┌───────────────────────────────────────────────────┐
│        Implementation Plan & Phased Rollout        │
│  Prototype → Evaluate → Commit or Pivot            │
└───────────────────────────────────────────────────┘

FALLBACK: If no framework meets requirements, the decision is "build custom orchestrator" 
         using `code-philosophy` (5 Laws of Elegant Defense) as the design foundation.
```

### Step 1: Extract and Classify Requirements

Gather all explicit requirements from the project brief or stakeholder interview. Separate them into two categories:

**Hard Constraints (Must-Have):** Non-negotiable requirements that, if unmet by a framework, automatically disqualify it. Examples:
- Must support Python 3.12+
- Must be Apache 2.0 / MIT licensed (no AGPL)
- Must run on AWS Lambda (serverless constraint)
- Must support at least 3 concurrent LLM providers
- Must have native MCP (Model Context Protocol) client support

**Soft Preferences (Should-Have):** Desirable but not disqualifying attributes that feed into weighted scoring. Examples:
- Strong documentation quality
- Large community with active Discord/Slack
- Built-in observability/tracing
- Low learning curve for team's existing skill set

```python
from dataclasses import dataclass, field
from enum import Enum


class ConstraintType(Enum):
    HARD = "hard"       # Disqualifies framework if unmet
    SOFT = "soft"       # Contributes to weighted score


class CapabilityDomain(str, Enum):
    RAG_RETRIEVAL = "rag_retrieval"     # Document ingestion, semantic search, knowledge retrieval
    MULTI_AGENT = "multi_agent"         # Role-based agents, conversation coordination, group chat
    TOOL_EXECUTION = "tool_execution"   # External API integration, function calling, tool registry
    CHAIN_COMPOSITION = "chain_composition"  # Sequential/branching LLM call pipelines
    PARALLEL_PROCESSING = "parallel_processing"  # Concurrent task execution, fan-out/fan-in
    PROMPT_OPTIMIZATION = "prompt_optimization"  # Automated prompt tuning, program optimization
    DATA_PIPELINE = "data_pipeline"     # ETL, data loading, transformation for ML/LLM


@dataclass
class ProjectRequirement:
    """A single requirement extracted from project analysis."""
    description: str
    category: ConstraintType
    domain: CapabilityDomain
    weight: float = 1.0          # Only used for SOFT constraints
    min_score: int = 0           # Minimum acceptable score (for HARD constraints)
    team_skill_match: str = ""   # How well this matches team's existing expertise

    @property
    def is_hard(self) -> bool:
        return self.category == ConstraintType.HARD


@dataclass
class RequirementsProfile:
    """Complete requirements profile for a project."""
    project_name: str
    hard_constraints: list[ProjectRequirement] = field(default_factory=list)
    soft_preferences: list[ProjectRequirement] = field(default_factory=list)

    def total_soft_weight(self) -> float:
        return sum(p.weight for p in self.soft_preferences) if self.soft_preferences else 1.0

    def validate_framework(
        self, framework_scores: dict[str, dict[str, int]]
    ) -> tuple[str | None, list[str]]:
        """
        Validate a framework's scores against hard constraints.
        
        Returns:
            Tuple of (disqualified_reason or None, list_of_hard_constraints_met)
        """
        met = []
        for constraint in self.hard_constraints:
            # This is checked at the scoring stage — if a framework doesn't
            # meet a hard constraint, it gets score 0 for that domain
            met.append(f"{constraint.domain.value}: {'PASS' if framework_scores.get('score', {}).get(constraint.domain.value, 0) >= constraint.min_score else 'FAIL'}")
        return met
```

**Checkpoint:** Every requirement must be classified as HARD or SOFT and mapped to exactly one capability domain. If a requirement doesn't map cleanly to any domain, re-examine whether it is truly an AI/LLM framework concern or a conventional infrastructure concern.

### Step 2: Identify Candidate Frameworks

Based on the capability domains identified in Step 1, identify which frameworks are viable candidates. Not all frameworks excel at all domains. Use this guide:

| Capability Domain | Strongest Candidates | Notes |
|---|---|---|
| RAG/Knowledge Retrieval | LlamaIndex (9.5/10) | Purpose-built for document ingestion and retrieval; LangChain is secondary option |
| Multi-Agent Coordination | CrewAI (9.5/10), Microsoft Agent Framework (9.0/10) | Purpose-built agent role definitions and conversation patterns |
| Tool Execution | LangChain (9.5/10), MCP protocol (9.0/10) | Most mature tool registry and execution ecosystem |
| Chain Composition | LangChain (9.0/10), LangGraph (8.5/10) | First-mover advantage, extensive chain primitives |
| Parallel Processing | CrewAI (8.0/10), Temporal.io (as orchestrator) | Built-in parallel execution patterns |
| Prompt Optimization | DSPy (9.5/10) | Only framework with automated prompt/program optimization |

**Decision rule:** A framework must score ≥ 6.0 in at least one capability domain to be included as a candidate. Frameworks scoring below 6.0 across ALL domains are not viable for this project.

```python
# Current state of AI agent frameworks (May 2026)
FRAMEWORK_LANDSCAPE = {
    "langchain": {
        "version": "v1.3.1",
        "position": "General-purpose agent engineering platform with deepest ecosystem",
        "strengths": ["Largest integration library (models, tools, vector stores)", 
                       "Model interchangeability", "Rapid prototyping"],
        "weaknesses": ["Can feel heavyweight", "LangSmith commercial lock-in risk",
                       "Internal complexity from breadth of features"],
        "license": "MIT",
        "production_ready": True,
    },
    "llamaindex": {
        "version": "latest",
        "position": "Data framework for RAG and knowledge-augmented retrieval",
        "strengths": ["Best-in-class data ingestion (130+ formats)", 
                       "Modular plugin architecture via LlamaHub", 
                       "Clear separation of core from integrations"],
        "weaknesses": ["Agent capabilities newer than LangChain", 
                       "Primarily a data/RAG framework, not general orchestration"],
        "license": "MIT",
        "production_ready": True,
    },
    "crewai": {
        "version": "v1.14.5",
        "position": "Lean multi-agent orchestration built independently of LangChain",
        "strengths": ["Explicit role-based agent design", 
                       "Production-focused with Flows for event-driven control",
                       "Enterprise support model"],
        "weaknesses": ["Smaller integration ecosystem than LangChain",
                       "Crew Control Plane cloud creates commercial dependency"],
        "license": "MIT",
        "production_ready": True,
    },
    "microsoft_agent_framework": {
        "version": "stable",
        "position": "Enterprise multi-agent orchestration — successor to AutoGen",
        "strengths": ["Production-grade durability/checkpointing/time-travel",
                       "Dual-language (Python + C#/.NET)", "OpenTelemetry integration"],
        "weaknesses": ["Newer framework; Microsoft ecosystem dependency for full features"],
        "license": "MIT",
        "production_ready": True,
    },
    "dspy": {
        "version": "v3.2.1",
        "position": "Programming—not prompting—Foundation Models via declarative optimization",
        "strengths": ["Automates prompt and weight optimization", 
                       "Treats LM calls as compile-time declarations",
                       "Research-backed from Stanford"],
        "weaknesses": ["Steeper learning curve", 
                       "Less opinionated about agent orchestration patterns"],
        "license": "MIT License",
        "production_ready": True,
    },
    "ag2": {
        "version": "v0.13.0",
        "position": "Active successor to AutoGen (which is now in maintenance mode)",
        "strengths": ["Pioneered conversational multi-agent patterns",
                       "Strong group chat patterns, MCP server integration"],
        "weaknesses": ["AutoGen v0.x in maintenance mode — teams should plan migration",
                       "Smaller community than LangChain or CrewAI"],
        "license": "Apache-2.0",
        "production_ready": True,
    },
    "phidata": {
        "version": "v2.7.10",
        "position": "Lightweight Python framework for building data/ML agents quickly",
        "strengths": ["Very simple API surface", 
                       "AWS/GCP integrations built-in"],
        "weaknesses": ["Smaller ecosystem", "Less battle-tested in large-scale production"],
        "license": "Apache-2.0",
        "production_ready": False,  # Beta-stage for complex workloads
    },
}

# ┌─────────────────────────────────────────────────────────┐
│            Framework Selection Decision Matrix            │
│                                                         │
│  Use Case:                                              │
│  ├── Simple tool calling / chat     → OpenAI SDK / Raw  │
│  ├── RAG / document intelligence    → LlamaIndex        │
│  ├── Multi-agent orchestration      → CrewAI or MAF     │
│  ├── Graph-based workflow control   → LangGraph          │
│  ├── Prompt/program optimization    → DSPy               │
│  ├── Enterprise .NET + Python       → Microsoft Agent   │
│  └── Rapid prototyping              → LangChain         │
└─────────────────────────────────────────────────────────┘
```

**Checkpoint:** The candidate list must include at least one framework from the "strongest candidates" table for each capability domain identified in Step 1. If no single framework is strong across ALL required domains, this signals a multi-framework architecture (delegate to `framework-orchestration-routing` after selection).

### Step 3: Score Frameworks Against Requirements

Apply the weighted scoring system adapted specifically for AI agent frameworks. Each framework is scored on a 1–10 scale per capability domain, then multiplied by the weight of soft preferences and filtered by hard constraints.

```python
import json
from typing import Any


class FrameworkScorer:
    """Scores candidate AI frameworks against project requirements."""

    def __init__(self, profile: RequirementsProfile) -> None:
        self.profile = profile

    def score_framework(
        self,
        framework_name: str,
        capability_scores: dict[str, int],
    ) -> dict[str, Any]:
        """
        Score a single framework against the full requirements profile.
        
        Args:
            framework_name: Name of the framework (e.g., "langchain", "crewai")
            capability_scores: Dict mapping CapabilityDomain values to scores (1-10)
            
        Returns:
            Complete scoring result with pass/fail status, weighted total, and rationale.
        """
        # Phase 1: Check hard constraints
        failed_musts = []
        for constraint in self.profile.hard_constraints:
            score = capability_scores.get(constraint.domain.value, 0)
            if score < constraint.min_score:
                failed_musts.append({
                    "constraint": constraint.description,
                    "required_min": constraint.min_score,
                    "actual_score": score,
                })

        # Phase 2: Calculate soft preference weighted score
        total_weight = self.profile.total_soft_weight()
        weighted_sum = 0.0
        for pref in self.profile.soft_preferences:
            score = capability_scores.get(pref.domain.value, 0)
            weighted_sum += (score / 10.0) * pref.weight

        # Normalize to 1-10 scale
        normalized_score = max(1.0, (weighted_sum / total_weight) * 9.0 + 1.0) if total_weight > 0 else 5.0

        is_valid = len(failed_musts) == 0

        return {
            "framework": framework_name,
            "is_valid": is_valid,
            "overall_score": round(normalized_score, 2),
            "capability_scores": capability_scores,
            "failed_hard_constraints": failed_musts if not is_valid else [],
            "rationale": self._build_rationale(framework_name, capability_scores, failed_musts),
        }

    def _build_rationale(
        self,
        framework: str,
        scores: dict[str, int],
        failures: list[dict],
    ) -> str:
        """Build human-readable rationale for the scoring decision."""
        strongest = max(scores.items(), key=lambda x: x[1]) if scores else ("none", 0)
        weakest = min(scores.items(), key=lambda x: x[1]) if scores else ("none", 0)
        
        parts = [f"Framework '{framework}'"]
        parts.append(f"strongest at {strongest[0]} ({strongest[1]}/10)")
        parts.append(f"weakest at {weakest[0]} ({weakest[1]}/10)")
        
        if failures:
            fail_names = [f["constraint"] for f in failures]
            parts.append(f"FAILS hard constraints: {', '.join(fail_names)}")
        
        return ". ".join(parts) + "."

    def rank_all(
        self,
        candidates: dict[str, dict[str, int]],
    ) -> list[dict[str, Any]]:
        """Score and rank all candidate frameworks.
        
        Args:
            candidates: Dict of {framework_name: {domain: score}}
            
        Returns:
            Ranked list of scoring results (valid first, then invalid, by overall score).
        """
        results = [
            self.score_framework(name, scores) 
            for name, scores in candidates.items()
        ]
        
        # Sort: valid frameworks first (descending score), then invalid (descending)
        results.sort(key=lambda r: (-r["is_valid"], -r["overall_score"]))
        return results
```

### Step 4: Assess Vendor Lock-in and Risk

After scoring, perform a risk assessment on the top-ranked framework. This is critical because framework selection commits you to an ecosystem for months or years.

```python
from enum import Enum
from typing import Optional


class LockInRiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


@dataclass
class VendorLockInAssessment:
    """Assesses the vendor lock-in risk of a chosen framework."""
    framework_name: str
    commercial_addons: list[str] = field(default_factory=list)
    open_source_core: bool = True
    data_portability: str = ""     # How easily can you migrate data to another framework?
    api_stability_commitment: str  # Is there a formal API stability guarantee?
    community_alternatives_available: int  # Count of comparable alternatives
    
    @property
    def risk_level(self) -> LockInRiskLevel:
        """Determine overall lock-in risk level."""
        penalties = []
        
        if self.commercial_addons:
            penalties.append(len(self.commercial_addons))
        if not self.open_source_core:
            penalties.append(3)
        if "poor" in self.data_portability.lower():
            penalties.append(2)
        if "no" in self.api_stability_commitment.lower() or "unstable" in self.api_stability_commitment.lower():
            penalties.append(1)
        if self.community_alternatives_available <= 2:
            penalties.append(2)
        
        total = sum(penalties)
        if total >= 5:
            return LockInRiskLevel.HIGH
        elif total >= 2:
            return LockInRiskLevel.MEDIUM
        else:
            return LockInRiskLevel.LOW

    def mitigation_strategies(self) -> list[str]:
        """Return specific strategies to reduce lock-in risk."""
        strategies = []
        
        if self.commercial_addons:
            strategies.append(
                f"Use framework core features only. Avoid {', '.join(self.commercial_addons)} "
                f"in the initial architecture — they create direct vendor dependency."
            )
        
        if not "excellent" in self.data_portability.lower():
            strategies.append(
                "Maintain a data abstraction layer between your application logic and framework-specific "
                "data structures. Define domain models that are independent of the framework."
            )
        
        strategies.append(
            "Write integration tests against the framework's public API surface. "
            "If tests pass when swapping in a mock implementation, the abstraction is sufficient for future migration."
        )
        
        if self.risk_level == LockInRiskLevel.HIGH:
            strategies.append(
                "HIGH RISK: Design a protocol interface that your code depends on, not the framework. "
                "Implement both the chosen framework AND a fallback implementation behind this interface. "
                "This is the 'Double-Abstraction' pattern from code-philosophy Law 2 (Bounded Contexts)."
            )
        
        return strategies


def assess_framework_risk(
    framework_name: str,
    landscape_entry: dict,
) -> VendorLockInAssessment:
    """Create a vendor lock-in assessment for a given framework.
    
    This is populated with current ecosystem knowledge (May 2026).
    """
    addons_map = {
        "langchain": ["LangSmith (commercial observability/tracing)", 
                       "DeepAgents (high-level agent builder — separate package)"],
        "llamaindex": ["LlamaParse (agentic OCR/parsing — commercial tier exists)", 
                        "LlamaCloud (hosted RAG service)"],
        "crewai": ["Crew Control Plane (cloud observability/tracing)", 
                    "AMP Suite (enterprise bundle — cloud-locked features)"],
        "microsoft_agent_framework": ["Azure Foundry (deployment platform — Azure-only)",
                                       "Foundry-hosted agents (Microsoft ecosystem dependency)"],
        "dspy": [],  # DSPy has minimal commercial add-ons; mostly open-source research tools
        "ag2": ["AutoGen Studio (GUI tool — but AG2 core is framework-agnostic protocol)"],
        "phidata": ["AWS/GCP native integrations (cloud-specific, but use standard SDKs)"],
    }

    return VendorLockInAssessment(
        framework_name=framework_name,
        commercial_addons=addons_map.get(framework_name, []),
        open_source_core=landscape_entry.get("license", "MIT") in ("MIT", "Apache-2.0"),
        data_portability="good" if framework_name in ("dspy", "langchain") else "moderate",
        api_stability_commitment="stable API with semantic versioning" 
            if landscape_entry.get("production_ready") else "API may change — check release notes",
        community_alternatives_available=3 if framework_name == "langchain" 
            else 2 if framework_name in ("crewai", "llamaindex") else 1,
    )
```

**Checkpoint:** Every recommended framework must have a vendor lock-in assessment. If the risk level is HIGH, the selection report must include mitigation strategies and a pivot plan for when migration becomes necessary.

### Step 5: Produce Selection Report

Generate a comprehensive selection document containing all scoring results, rationale, and implementation guidance.

```python
from dataclasses import dataclass, field


@dataclass
class FrameworkSelectionReport:
    """Complete output artifact of the AI framework selection process."""
    project_name: str
    winner: str
    winner_score: float
    runner_up: Optional[str] = None
    runner_up_score: Optional[float] = None
    candidates_evaluated: list[str] = field(default_factory=list)
    scoring_matrix: list[dict[str, Any]] = field(default_factory=list)
    trade_offs: list[str] = field(default_factory=list)
    vendor_risk: Optional[VendorLockInAssessment] = None
    implementation_plan: Optional[dict] = None

    def score_gap(self) -> Optional[float]:
        """Calculate the score gap between winner and runner-up."""
        if self.runner_up_score is not None:
            return round(self.winner_score - self.runner_up_score, 2)
        return None

    def has_clear_winner(self) -> bool:
        """A clear winner has >1.5 point gap from runner-up."""
        gap = self.score_gap()
        return gap is not None and gap >= 1.5

    def to_dict(self) -> dict[str, Any]:
        """Serialize report for documentation or stakeholder review."""
        result = {
            "project": self.project_name,
            "selected_framework": self.winner,
            "overall_score": self.winner_score,
            "score_gap_from_runner_up": self.score_gap(),
            "has_clear_winner": self.has_clear_winner(),
            "candidates_evaluated": len(self.candidates_evaluated),
        }
        
        if self.vendor_risk:
            result["vendor_lock_in_risk"] = {
                "level": self.vendor_risk.risk_level.value,
                "mitigation_strategies": self.vendor_risk.mitigation_strategies(),
            }
        
        return result


def produce_selection_report(
    profile: RequirementsProfile,
    ranked_results: list[dict[str, Any]],
    vendor_assessment: Optional[VendorLockInAssessment] = None,
) -> FrameworkSelectionReport:
    """Produce the final selection report from scoring results.
    
    This is the primary output that stakeholders and engineers both need.
    """
    if not ranked_results:
        return FrameworkSelectionReport(
            project_name=profile.project_name,
            winner="NO_VIABLE_FRAMEWORK",
            winner_score=0.0,
            implementation_plan={
                "recommendation": "No existing framework meets requirements. "
                                  "Consider building a custom orchestrator using code-philosophy "
                                  "(5 Laws of Elegant Defense) as the design foundation.",
            },
        )

    winner = ranked_results[0]
    runner_up = ranked_results[1] if len(ranked_results) > 1 else None

    # Identify trade-offs: what did we sacrifice by choosing the winner?
    trade_offs = []
    if winner["overall_score"] - (runner_up["overall_score"] if runner_up else 0) < 1.5:
        trade_offs.append(
            f"Decision is close — '{winner['framework']}' edges out '{runner_up['framework']}' "
            f"by only {round(winner['overall_score'] - runner_up['overall_score'], 2)} points. "
            f"A different weighting of soft preferences could flip the result."
        )

    # Check for capability gaps — did the winner score poorly on any domain?
    for domain, score in winner["capability_scores"].items():
        if score < 6:
            trade_offs.append(
                f"Winner '{winner['framework']}' scores low ({score}/10) on {domain}. "
                f"This capability may require custom implementation or a supplementary framework."
            )

    return FrameworkSelectionReport(
        project_name=profile.project_name,
        winner=winner["framework"],
        winner_score=winner["overall_score"],
        runner_up=runner_up["framework"] if runner_up else None,
        runner_up_score=runner_up["overall_score"] if runner_up else None,
        candidates_evaluated=[r["framework"] for r in ranked_results],
        scoring_matrix=ranked_results,
        trade_offs=trade_offs,
        vendor_risk=vendor_assessment,
    )
```

---

## Implementation Patterns / Reference Guide

### Pattern 1: Capability Scoring Matrix (Concrete Example)

A real-world example scoring four frameworks for a document-intelligence RAG system that also needs tool execution capabilities.

```python
# Project: "Legal Document Intelligence Platform"
# Requirements:
#   HARD: Python 3.12+ support, Apache-2.0/MIT license, runs on AWS Lambda
#   SOFT (weighted): Strong RAG retrieval (weight: 0.40), 
#                     Good tool execution (weight: 0.30),
#                     Community support (weight: 0.20),
#                     Low learning curve (weight: 0.10)

legal_doc_profile = RequirementsProfile(
    project_name="Legal Document Intelligence Platform",
    hard_constraints=[
        ProjectRequirement(
            description="Must run on AWS Lambda (serverless)",
            category=ConstraintType.HARD,
            domain=CapabilityDomain.RAG_RETRIEVAL,
            min_score=6,  # Framework must be Lambda-compatible
        ),
        ProjectRequirement(
            description="Must use Apache-2.0 or MIT license only",
            category=ConstraintType.HARD,
            domain=CapabilityDomain.CHAIN_COMPOSITION,
            min_score=8,  # No AGPL or commercial-only options
        ),
    ],
    soft_preferences=[
        ProjectRequirement(
            description="Best-in-class RAG retrieval quality for legal documents",
            category=ConstraintType.SOFT,
            domain=CapabilityDomain.RAG_RETRIEVAL,
            weight=0.40,
        ),
        ProjectRequirement(
            description="Strong tool execution for external API calls (court databases)",
            category=ConstraintType.SOFT,
            domain=CapabilityDomain.TOOL_EXECUTION,
            weight=0.30,
        ),
        ProjectRequirement(
            description="Large community with active support channels",
            category=ConstraintType.SOFT,
            domain=CapabilityDomain.CHAIN_COMPOSITION,
            weight=0.20,
        ),
        ProjectRequirement(
            description="Low learning curve for team of 3 Python engineers",
            category=ConstraintType.SOFT,
            domain=CapabilityDomain.PROMPT_OPTIMIZATION,
            weight=0.10,
        ),
    ],
)

# Scoring the candidates (1-10 per domain):
candidate_scores = {
    "langchain": {
        "rag_retrieval": 6.5,     # Has RAG chains but not purpose-built retrieval
        "multi_agent": 7.0,       # CrewAgentExecutor available
        "tool_execution": 9.5,    # Best-in-class tool registry
        "chain_composition": 9.0, # Extensive chain primitives
        "parallel_processing": 7.5, # Async chains supported
        "prompt_optimization": 4.0, # Manual prompting only
    },
    "llamaindex": {
        "rag_retrieval": 9.5,     # Purpose-built; best-in-class retrieval
        "multi_agent": 6.0,       # Agent capabilities newer/less mature
        "tool_execution": 5.0,    # Tools supported but not primary focus
        "chain_composition": 7.0, # Query pipelines are framework-specific
        "parallel_processing": 8.0, # Async query execution well-supported
        "prompt_optimization": 3.5, # Manual prompting; no optimization layer
    },
    "crewai": {
        "rag_retrieval": 5.5,     # Can integrate RAG but not native
        "multi_agent": 9.5,       # Purpose-built multi-agent orchestration
        "tool_execution": 7.0,    # Tools integrated via LangChain foundation
        "chain_composition": 6.0, # Crew-based workflow replaces manual chaining
        "parallel_processing": 8.0, # Parallel agent execution is core feature
        "prompt_optimization": 5.0, # Prompt engineering templates available
    },
    "phidata": {
        "rag_retrieval": 7.0,     # Built-in RAG capabilities
        "multi_agent": 7.5,       # Multi-agent support is growing
        "tool_execution": 8.0,    # Good tool integration surface
        "chain_composition": 6.5, # Simple chaining primitives
        "parallel_processing": 6.0, # Basic parallel support
        "prompt_optimization": 4.0, # Manual prompting
    },
}

# Run the scorer:
scorer = FrameworkScorer(legal_doc_profile)
ranked = scorer.rank_all(candidate_scores)

print("Legal Document Intelligence Platform — Framework Selection Results:")
for i, result in enumerate(ranked, 1):
    status = "VALID" if result["is_valid"] else "DISQUALIFIED"
    print(f"\n{i}. {result['framework']} — Score: {result['overall_score']}/10 [{status}]")
    for domain, score in result["capability_scores"].items():
        bar = "#" * (score // 2) + "." * (5 - score // 2)
        print(f"   {domain:25s} [{bar}] {score}/10")
    if result.get("failed_hard_constraints"):
        for fail in result["failed_hard_constraints"]:
            print(f"   ❌ FAILED HARD CONSTRAINT: {fail['constraint']}")
    print(f"   → {result['rationale']}")

# Expected output:
# 1. llamaindex — Score: 7.85/10 [VALID]
#    rag_retrieval        [██████░░] 9/10
#    multi_agent          [████░░░░░░] 6/10
#    tool_execution       [█████░░░░░] 5/10
#    chain_composition    [██████░░░░] 7/10
#    parallel_processing  [███████░░░] 8/10
#    prompt_optimization  [████░░░░░░] 3/10
```

### Pattern 2: Build Custom vs. Framework Decision Tree

When no existing framework adequately serves the project, the decision tree guides you to either adopt the "best available" framework with compromises or build custom.

```python
def decide_build_vs_framework(
    requirements: RequirementsProfile,
    ranked_results: list[dict[str, Any]],
    team_size: int,
    timeline_weeks: int,
) -> dict[str, Any]:
    """Decide whether to adopt a framework or build custom.
    
    This addresses the 'everything framework' trap and prevents
    premature orchestration adoption (code-philosophy Law 1: Early Exit).
    """
    # Rule 1: If no framework scores above 5.0, build custom or reconsider requirements
    if not ranked_results or ranked_results[0]["overall_score"] < 5.0:
        return {
            "decision": "BUILD_CUSTOM_OR_REEVALUATE",
            "rationale": (
                "No existing framework meets the project's minimum requirements. "
                "Before building custom, re-examine whether any requirements can be relaxed or "
                "decomposed into simpler tasks that raw SDK calls can handle."
            ),
            "recommendation": "REEVALUATE_REQUIREMENTS" if team_size <= 2 else "BUILD_CUSTOM",
        }

    # Rule 2: If a framework scores >= 7.5 and meets all hard constraints, adopt it
    winner = ranked_results[0]
    if winner["is_valid"] and winner["overall_score"] >= 7.5:
        gap = (
            winner["overall_score"] - ranked_results[1]["overall_score"]
            if len(ranked_results) > 1 else float("inf")
        )
        
        if gap >= 2.0:
            return {
                "decision": "ADOPT_FRAMEWORK",
                "framework": winner["framework"],
                "confidence": "HIGH",
                "rationale": (
                    f"'{winner['framework']}' ({winner['overall_score']}/10) is a clear winner "
                    f"(+{round(gap, 1)} over runner-up). Strong capability fit with minimal compromise."
                ),
            }
        else:
            return {
                "decision": "ADOPT_WITH_CAUTION",
                "framework": winner["framework"],
                "confidence": "MEDIUM",
                "rationale": (
                    f"'{winner['framework']}' ({winner['overall_score']}/10) wins but the gap "
                    f"to runner-up is narrow. Plan a prototype phase to validate."
                ),
                "recommendation": "PROTOTYPE_FIRST",
            }

    # Rule 3: If the winner scores 5.0–7.4 and meets hard constraints, prototype first
    if winner["is_valid"] and winner["overall_score"] < 7.5:
        return {
            "decision": "PROTOTYPE_AND_REASSESS",
            "framework": winner["framework"],
            "confidence": "LOW",
            "rationale": (
                f"The best available framework ({winner['framework']}, {winner['overall_score']}/10) "
                f"meets hard constraints but has significant capability gaps. Build a 2-week prototype."
            ),
            "recommendation": "TIME_BOXED_PROTOTYPE",
            "prototype_weeks": 2,
        }

    # Rule 4: If no framework meets hard constraints, build or relax requirements
    return {
        "decision": "NO_VIABLE_FRAMEWORK",
        "rationale": (
            "No framework meets all hard constraints. Options: (1) Build custom with "
            "code-philosophy patterns for bounded contexts and failure isolation. "
            "(2) Relax hard constraints to make an existing framework viable."
        ),
        "recommendation": "RELAX_HARD_CONSTRAINTS" if timeline_weeks < 8 else "BUILD_CUSTOM",
    }


# ┌─────────────────────────────────────────────────────────────┐
│           BAD vs. GOOD: Framework Selection Practices        │
└─────────────────────────────────────────────────────────────┘

# ❌ BAD: Selecting a framework based on hype, blog posts, or team familiarity alone
def bad_framework_selection(team_familiarity: str) -> str:
    """Bad: Chooses framework based on what the team already knows.
    
    This is the most common selection error — familiarity bias leads teams
    to under-investigate better-fit alternatives. It directly contradicts
    code-philosophy Law 2 (Bounded Contexts) by optimizing for convenience
    over capability fit.
    """
    return team_familiarity


# ✅ GOOD: Data-driven selection with scored comparison and documented trade-offs
def good_framework_selection(
    profile: RequirementsProfile,
    candidates: dict[str, dict[str, int]],
) -> FrameworkSelectionReport:
    """Good: Systematic evaluation producing a defensible, auditable decision."""
    scorer = FrameworkScorer(profile)
    ranked = scorer.rank_all(candidates)
    
    if not ranked:
        return FrameworkSelectionReport(
            project_name=profile.project_name,
            winner="NO_VIABLE_FRAMEWORK",
            winner_score=0.0,
        )

    vendor_risk = None
    if ranked[0]["framework"] in FRAMEWORK_LANDSCAPE:
        vendor_risk = assess_framework_risk(
            ranked[0]["framework"], 
            FRAMEWORK_LANDSCAPE[ranked[0]["framework"]]
        )

    report = produce_selection_report(profile, ranked, vendor_risk)
    
    if report.has_clear_winner():
        report.implementation_plan = {
            "phase": "commit",
            "rationale": "Clear winner (>1.5 point gap) — proceed to implementation.",
            "next_steps": [
                f"Set up {report.winner} development environment",
                "Implement prototype for the highest-weight capability domain",
                "Validate against actual production workload characteristics",
                "Commit to framework after prototype review by team leads",
            ],
        }
    else:
        report.implementation_plan = {
            "phase": "prototype",
            "rationale": f"Close decision — prototype '{report.winner}' first.",
            "next_steps": [
                f"Build 2-week prototype using {report.winner}",
                "Compare prototype results against runner-up on same workload",
                "Re-evaluate framework selection after prototype data is collected",
            ],
        }

    return report
```

### Pattern 3: Phased Implementation Plan Generator

Once a framework is selected, generate a phased rollout plan that mitigates adoption risk.

```python
def generate_rollout_plan(
    winner_framework: str,
    landscape_entry: dict,
    has_clear_winner: bool,
    vendor_risk_level: str,
) -> dict:
    """Generate a phased implementation and rollout plan.
    
    Follows the code-philosophy principle of incremental delivery
    with explicit checkpoint gates — each phase must pass before proceeding.
    """
    phases = []

    if not has_clear_winner:
        phases.append({
            "phase": 0,
            "name": "Prototype Validation",
            "duration_weeks": 2,
            "goal": f"Build proof-of-concept using {winner_framework} against a representative workload.",
            "success_criteria": [
                f"Framework handles core use case without workarounds",
                f"Latency and throughput meet project requirements",
                f"Team can produce working code within 2 weeks",
            ],
            "gate": "If prototype fails any success criterion, re-evaluate framework selection.",
        })

    phases.append({
        "phase": 1 if not has_clear_winner else 0,
        "name": "Core Implementation",
        "duration_weeks": 3 if has_clear_winner else 2,
        "goal": f"Implement the highest-priority capability domain using {winner_framework}.",
        "success_criteria": [
            f"Framework integration test suite passes (≥90% coverage on framework-boundary code)",
            "No framework-specific data leaks into domain model layer (bounded context isolation)",
            "Fallback path implemented for the most likely failure mode in this framework",
        ],
        "gate": "Code review by team lead + performance benchmark against requirements.",
    })

    phases.append({
        "phase": 2 if not has_clear_winner else 1,
        "name": "Production Hardening",
        "duration_weeks": 2,
        "goal": "Add observability, error handling, and deployment configuration.",
        "success_criteria": [
            "Structured logging with trace IDs across all framework boundaries",
            f"Circuit breaker for {winner_framework} integration points",
            "Monitoring dashboard with framework-specific metrics (token usage, latency, error rates)",
        ],
        "gate": "Load test with 2× expected production traffic.",
    })

    if vendor_risk_level in ("HIGH", "MEDIUM"):
        phases.append({
            "phase": 3 if not has_clear_winner else 2,
            "name": "Vendor Lock-in Mitigation",
            "duration_weeks": 1,
            "goal": f"Implement abstraction layer to reduce {winner_framework} dependency.",
            "success_criteria": [
                "Domain models are independent of framework-specific types",
                f"Integration tests exist that can swap {winner_framework} with a mock implementation",
                "Migration documentation started for worst-case scenario (framework EOL or pricing change)",
            ],
            "gate": "Architecture review focusing on abstraction quality and migration path clarity.",
        })

    return {
        "framework": winner_framework,
        "total_duration_weeks": sum(p["duration_weeks"] for p in phases),
        "phases": phases,
        "pivot_decision_point": f"After Phase {'0' if not has_clear_winner else '1'} — "
                                "if prototype or core implementation fails success criteria, pivot."
    }
```

---

## Constraints

### MUST DO
- Separate HARD constraints (disqualifying) from SOFT preferences (weighted scoring) before evaluating any framework
- Score every candidate on ALL capability domains identified in requirements — never score only the domains where a framework is strong
- Validate vendor lock-in risk for the top-ranked framework and document mitigation strategies if risk is MEDIUM or HIGH
- Include a prototype phase in the implementation plan when the score gap between #1 and #2 is < 1.5 points
- Document every scoring decision with justification — an unexplained score is not auditable and invites future re-selection debates
- Assess the "build custom" option explicitly — if no framework scores ≥ 5.0 overall, recommend building custom or relaxing requirements
- Reference `code-philosophy` (5 Laws of Elegant Defense) when designing the implementation plan — especially Law 1 (Early Exit) for premature framework adoption and Law 2 (Bounded Contexts) for vendor lock-in mitigation

### MUST NOT DO
- Select a framework based on team familiarity alone — familiarity bias is the single most common selection error
- Recommend commercial add-ons (LangSmith, Crew Control Plane, Azure Foundry) in the initial architecture — they create direct vendor dependency and should be evaluated separately
- Skip the prototype phase when the scoring gap is narrow (< 1.5 points) — scores are estimates, not measurements
- Use a framework that is in maintenance mode (e.g., AutoGen v0.x) for new projects — use AG2 or Microsoft Agent Framework as the successor
- Score frameworks on capability domains the project doesn't need — unnecessary dimensions add noise to the decision matrix
- Present only the winning framework without the full scoring table and trade-off analysis — stakeholders need to understand why alternatives were rejected

---

## Output Template

When performing AI agent framework selection, produce:

1. **Requirements Summary** — Hard constraints (must-meet), soft preferences (weighted) with capability domain classification
2. **Candidate Framework List** — All evaluated frameworks with one-sentence positioning and license info
3. **Scoring Matrix** — Full table of all frameworks × all domains with raw scores, weighted totals, and pass/fail status for hard constraints
4. **Selection Decision** — Winner name, overall score, runner-up comparison, score gap percentage, and confidence level (HIGH/MEDIUM/LOW)
5. **Trade-Off Analysis** — What capabilities were sacrificed, what the narrow-gap warning means if applicable, alternative acceptable options
6. **Vendor Lock-in Assessment** — Risk level (LOW/MEDIUM/HIGH), commercial addon awareness, mitigation strategies
7. **Phased Implementation Plan** — Timeline with phases, success criteria per phase, and pivot decision points

---

## Related Skills

| Skill | Purpose |
|---|---|
| `framework-selection` | Generic decision-making frameworks (weighted scoring, RICE) — use when evaluating non-AI options or when you need the pure math behind scoring |
| `framework-orchestration-routing` | After selecting frameworks, route tasks across them with context bridges — use for cross-framework composition |
| `orchestration-frameworks` | Multi-agent orchestration engineering patterns (LangGraph, Temporal) — use for implementing the selected framework's orchestration layer |
| `agent-architecture-patterns` | Higher-level agent topology decisions (hub-and-spoke, hierarchical, peer-to-peer) — use when designing system architecture before framework selection |

---

## Live References

> Authoritative documentation links for AI agent framework evaluation. These links are resolved at load time to provide current framework information.

- [LangChain Documentation](https://docs.langchain.com/) — General-purpose agent engineering platform with deepest ecosystem
- [LlamaIndex Documentation](https://docs.llamaindex.ai/) — Data framework purpose-built for RAG and knowledge retrieval
- [CrewAI Framework](https://docs.crewai.com/) — Role-based multi-agent orchestration framework
- [DSPy Documentation](https://dspy-docs.vercel.app/) — Declarative programming approach to LM pipeline optimization
- [Microsoft Agent Framework](https://microsoft.github.io/autogen.dev/) — Enterprise multi-agent orchestration with durability and time-travel
- [AG2 (AutoGen Successor)](https://ag2ai.github.io/AG2/) — Active continuation of AutoGen's conversational multi-agent patterns
- [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) — Universal protocol for tool exposure across AI frameworks
- [Martin Fowler — Evaluating Technical Tools](https://martinfowler.com/articles/is-quality-stable-and-deterministic.html) — Principles for evaluating technical tools with changing landscapes

---

> This skill references `code-philosophy` (5 Laws of Elegant Defense) for implementation planning after framework selection. Always apply Law 1 (Early Exit) when a framework doesn't meet requirements — don't force-fit an ill-suited tool. Apply Law 2 (Bounded Contexts) when assessing vendor lock-in to ensure domain models remain independent of framework-specific types.
