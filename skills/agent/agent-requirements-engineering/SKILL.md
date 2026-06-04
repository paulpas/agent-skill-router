---
name: agent-requirements-engineering
description: Defines and structures functional, non-functional, and safety requirements for AI agent systems including capability matrices, hallucination thresholds, data quality standards, and evaluation criteria.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: agent
  triggers: agent requirements, AI system requirements, capability matrix, hallucination threshold, safety guardrails, AI evaluation criteria, prompt requirements, how do i define AI system requirements
  archetypes:
    - strategic
    - tactical
  anti_triggers:
    - brainstorming
    - vague ideation
  response_profile:
    verbosity: medium
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
    - config
  related-skills: agent-reliability-engineering, ai-system-evaluation-criteria, agent-architecture-patterns, framework-selection
---

# AI Agent Requirements Engineering

Defines and structures comprehensive requirements for AI agent systems. This skill makes the model produce structured, testable requirement specifications that cover functional capabilities, non-functional constraints, safety guardrails, data quality standards, and evaluation criteria — all expressed in measurable terms suitable for automated testing.

AI system requirements differ fundamentally from traditional software requirements because they deal with probabilistic behaviors (hallucinations, confidence scores), emergent capabilities from model selection, and safety constraints that must hold across unpredictable input spaces. A well-structured AI requirements document specifies not just what the system should do, but how often it should do it correctly, under what conditions it should fail gracefully, and what metrics prove it meets its objectives.

## TL;DR Checklist

- [ ] Define functional requirements with measurable capability thresholds (not vague goals)
- [ ] Specify non-functional constraints: latency, cost per call, throughput limits
- [ ] Set hallucination tolerance thresholds with explicit definitions of what counts as a hallucination
- [ ] Establish safety guardrails with testable criteria for content filtering and policy enforcement
- [ ] Define data quality requirements for training, RAG sources, and external tool inputs
- [ ] Create evaluation criteria mapped to each functional requirement with specific test cases

---

## When to Use

Use this skill when:

- Starting a new AI agent project and need to define what "good" looks like before implementation begins
- Refactoring an existing AI system and need to formalize implicit requirements into measurable specifications
- Onboarding a team to an AI project where requirement clarity prevents costly rework
- Preparing for stakeholder review of an AI system's capability commitments
- Transitioning from prototype to production and need production-grade requirement definitions
- Selecting between LLM providers and need objective criteria beyond "it works better"

## When NOT to Use

Avoid this skill for:
- Simple scripting tasks with no AI components — use conventional requirements engineering approaches
- Debugging a specific bug in an existing system — use `agent-debugging` instead
- Architecture decisions about agent topology (monolithic vs distributed) — use `agent-architecture-patterns` instead
- Selecting frameworks based purely on features — use `framework-selection` for structured comparison

---

## Core Workflow

1. **Elicit Functional Capabilities** — List every capability the AI system must demonstrate, expressed as measurable statements with acceptance criteria. Each functional requirement must pass this test: "We can write an automated test that verifies this requirement in Y seconds."

   Classify capabilities by priority:
   - **Core** — System is unusable without this capability (e.g., "responds to user queries correctly")
   - **Important** — Major degradation of user experience if missing (e.g., "cites sources for factual claims")
   - **Nice-to-have** — Enhancement but not essential (e.g., "multi-language support")

2. **Define Non-Functional Constraints** — Specify quantitative limits for:
   - **Latency**: P95 response time per component (retrieval, LLM call, tool execution, synthesis)
   - **Cost**: Maximum cost per 1000 requests or monthly budget ceiling
   - **Throughput**: Concurrent request capacity and queueing behavior under overload
   - **Availability**: Target uptime percentage, acceptable error rates, retry budgets
   - **Scalability**: Linear scaling limits before performance degradation

3. **Set Hallucination Tolerance** — Define what counts as a hallucination in your domain context and set measurable thresholds:
   - Factual hallucination rate must be below X% on the validation dataset
   - Source fabrication must occur less than Y times per 1000 responses
   - Confidence scoring calibration: predicted confidence must correlate with actual accuracy within ±Z percentage points

4. **Establish Safety Guardrails** — Define testable safety criteria:
   - Content policy violations must be blocked in <X% of cases on the safety benchmark dataset
   - Prompt injection resistance rate must exceed Y% on adversarial test suite
   - Data leakage prevention: zero instances of training data leakage in 10,000-test evaluation

5. **Define Data Quality Standards** — Specify requirements for all data touching the system:
   - RAG source freshness: documents no older than X days or marked as potentially stale
   - Embedding quality: retrieval hit rate on validation queries above X% at top-5
   - Tool output validity: structured outputs must conform to defined schema with <X% rejection rate

6. **Create Evaluation Criteria** — Map each requirement to specific evaluation methods and thresholds:

   | Requirement Category | Evaluation Method | Pass Threshold | Frequency |
   |---|---|---|---|
   | Functional accuracy | Golden dataset testing | ≥95% correct answers | Per release |
   | Hallucination rate | Adversarial prompt suite | <2% hallucinations | Weekly |
   | Latency | Load testing (P95) | <3s for retrieval, <5s total | Per deployment |
   | Safety compliance | Red team evaluation | ≥99% policy adherence | Monthly |

## Implementation Patterns

### Pattern 1: Requirements Specification Template (Structured)

```python
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional
import json


class Priority(Enum):
    CORE = "core"
    IMPORTANT = "important"
    NICE_TO_HAVE = "nice_to_have"


class RequirementType(Enum):
    FUNCTIONAL = "functional"           # What the system must do
    NON_FUNCTIONAL = "non_functional"   # How well it must do it
    SAFETY = "safety"                   # Constraints that must never be violated
    DATA_QUALITY = "data_quality"       # Quality standards for data inputs/outputs


@dataclass
class Requirement:
    """A single measurable requirement for an AI agent system."""
    id: str                                    # Unique identifier, e.g., "FUNC-001"
    title: str                                 # Short descriptive title
    description: str                           # Full requirement text
    type: RequirementType                      # Category of requirement
    priority: Priority                         # Importance level
    measurable_criteria: str                   # How we verify this requirement is met
    acceptance_threshold: Optional[str] = None # Numerical threshold (e.g., "≥95%")
    evaluation_method: Optional[str] = None    # How to test (golden dataset, load testing, etc.)
    validation_dataset: Optional[str] = None   # Dataset used for validation
    references: list[str] = field(default_factory=list)  # Related requirements or docs

    def is_met(self, measured_value: float, comparison: str = ">=") -> bool:
        """Check if a measured value satisfies this requirement's threshold.

        Args:
            measured_value: The actual measured metric value.
            comparison: Comparison operator ('>=', '<=', '==').

        Returns:
            True if the requirement is met, False otherwise.
        """
        if not self.acceptance_threshold:
            return True  # No threshold defined — subjective check required

        threshold = float(self.acceptance_threshold.replace("≥", "").replace("<", "").strip())

        if comparison == ">=" or "≥" in (self.acceptance_threshold or ""):
            return measured_value >= threshold
        elif comparison == "<=" or "<" in (self.acceptance_threshold or ""):
            return measured_value <= threshold
        return False


@dataclass
class RequirementsDocument:
    """Structured requirements document for an AI agent system."""

    project_name: str
    version: str = "1.0.0"
    functional_requirements: list[Requirement] = field(default_factory=list)
    non_functional_requirements: list[Requirement] = field(default_factory=list)
    safety_requirements: list[Requirement] = field(default_factory=list)
    data_quality_requirements: list[Requirement] = field(default_factory=list)

    def add_requirement(self, req: Requirement) -> None:
        """Add a requirement to the appropriate category list."""
        if req.type == RequirementType.FUNCTIONAL:
            self.functional_requirements.append(req)
        elif req.type == RequirementType.NON_FUNCTIONAL:
            self.non_functional_requirements.append(req)
        elif req.type == RequirementType.SAFETY:
            self.safety_requirements.append(req)
        elif req.type == RequirementType.DATA_QUALITY:
            self.data_quality_requirements.append(req)

    def summary(self) -> dict:
        """Produce a structured summary of all requirements."""
        return {
            "project": self.project_name,
            "version": self.version,
            "counts": {
                "functional": len(self.functional_requirements),
                "non_functional": len(self.non_functional_requirements),
                "safety": len(self.safety_requirements),
                "data_quality": len(self.data_quality_requirements),
            },
            "core_priority_count": sum(
                1 for r in (
                    self.functional_requirements +
                    self.non_functional_requirements +
                    self.safety_requirements +
                    self.data_quality_requirements
                ) if r.priority == Priority.CORE
            ),
        }


# --- Example: Creating a requirements document for a RAG-based support agent ---

requirements = RequirementsDocument(project_name="Customer Support AI Agent")

# Functional requirements with measurable criteria
requirements.add_requirement(Requirement(
    id="FUNC-001",
    title="Accurate FAQ response generation",
    description="When a user asks a question that has an answer in the knowledge base, "
                "the agent must generate a correct and complete answer.",
    type=RequirementType.FUNCTIONAL,
    priority=Priority.CORE,
    measurable_criteria="Percentage of questions answered correctly on the golden FAQ dataset",
    acceptance_threshold="≥95%",
    evaluation_method="Golden dataset evaluation with human-verified answers (200+ questions)",
    validation_dataset="faq_golden_set_v1.jsonl",
))

requirements.add_requirement(Requirement(
    id="FUNC-002",
    title="Citation of source documents",
    description="Every factual claim in the agent's response must be cited with a specific "
                "document reference and page/section number.",
    type=RequirementType.FUNCTIONAL,
    priority=Priority.IMPORTANT,
    measurable_criteria="Percentage of factual claims that have valid citations",
    acceptance_threshold="≥90%",
    evaluation_method="Automated citation checker + human spot-check (50 responses per week)",
))

requirements.add_requirement(Requirement(
    id="FUNC-003",
    title="Multi-turn context retention",
    description="The agent must correctly reference information from up to 10 turns back "
                "in the conversation for follow-up questions.",
    type=RequirementType.FUNCTIONAL,
    priority=Priority.IMPORTANT,
    measurable_criteria="Accuracy on multi-turn QA benchmark with 10+ turn conversations",
    acceptance_threshold="≥85%",
    evaluation_method="Multi-turn conversation benchmark suite (100 scenarios)",
))

# Non-functional requirements
requirements.add_requirement(Requirement(
    id="NF-001",
    title="P95 latency for retrieval-augmented responses",
    description="95% of user queries that require RAG must return a complete response within "
                "the latency budget.",
    type=RequirementType.NON_FUNCTIONAL,
    priority=Priority.CORE,
    measurable_criteria="P95 end-to-end response latency under load testing",
    acceptance_threshold="<4000ms",
    evaluation_method="Load test with 100 concurrent users for 30 minutes",
))

requirements.add_requirement(Requirement(
    id="NF-002",
    title="Cost per 1000 requests",
    description="Total token cost including embedding, retrieval, LLM calls, and tool usage.",
    type=RequirementType.NON_FUNCTIONAL,
    priority=Priority.IMPORTANT,
    measurable_criteria="Average cost per 1000 user queries",
    acceptance_threshold="<$2.50",
    evaluation_method="Cost tracking dashboard with daily aggregation",
))

# Safety requirements
requirements.add_requirement(Requirement(
    id="SAFETY-001",
    title="Prompt injection resistance",
    description="The system must resist adversarial prompt injection attempts that try to "
                "override the system instructions or extract confidential data.",
    type=RequirementType.SAFETY,
    priority=Priority.CORE,
    measurable_criteria="Injection attack success rate on standardized adversarial test suite",
    acceptance_threshold="<0.5%",
    evaluation_method="Adversarial prompt benchmark (500 injection attempts from known attack patterns)",
))

requirements.add_requirement(Requirement(
    id="SAFETY-002",
    title="PII redaction in outputs",
    description="The system must not return personally identifiable information from training "
                "data or retrieved documents unless explicitly authorized.",
    type=RequirementType.SAFETY,
    priority=Priority.CORE,
    measurable_criteria="Zero PII leaks detected in evaluation dataset of 10,000 queries",
    acceptance_threshold="0 incidents",
    evaluation_method="PII scanner on evaluation output (regex + ML-based detector)",
))

# Data quality requirements
requirements.add_requirement(Requirement(
    id="DQ-001",
    title="RAG source document freshness",
    description="Documents in the knowledge base must be no older than 90 days without "
                "a 'stale' warning in responses.",
    type=RequirementType.DATA_QUALITY,
    priority=Priority.IMPORTANT,
    measurable_criteria="Percentage of responses that include staleness warnings for documents >90 days old",
    acceptance_threshold="100%",
    evaluation_method="Automated freshness check on each RAG retrieval query",
))

summary = requirements.summary()
print(json.dumps(summary, indent=2))
# Output:
# {
#   "project": "Customer Support AI Agent",
#   "version": "1.0.0",
#   "counts": {
#     "functional": 3,
#     "non_functional": 2,
#     "safety": 2,
#     "data_quality": 1
#   },
#   "core_priority_count": 4
# }
```

### Pattern 2: Hallucination Tolerance Framework

```python
from dataclasses import dataclass, field
from enum import Enum


class HallucinationType(Enum):
    FACTUAL = "factual"                    # Incorrect factual claim
    SOURCE_FABRICATION = "source_fabrication"  # Citing non-existent documents
    NUMERIC_FABRICATION = "numeric_fabrication"  # Making up numbers, dates, IDs


@dataclass
class HallucinationMetrics:
    """Tracks and evaluates hallucination rates for an AI system."""

    total_responses_evaluated: int = 0
    factual_hallucinations: int = 0
    source_fabrications: int = 0
    numeric_fabrications: int = 0
    threshold_factual_pct: float = 2.0       # Max acceptable factual hallucination rate
    threshold_source_pct: float = 0.0        # Zero tolerance for fabricated sources
    threshold_numeric_pct: float = 1.0       # Max acceptable numeric fabrication rate

    @property
    def factual_rate(self) -> float:
        if self.total_responses_evaluated == 0:
            return 0.0
        return (self.factual_hallucinations / self.total_responses_evaluated) * 100

    @property
    def source_fabrication_rate(self) -> float:
        if self.total_responses_evaluated == 0:
            return 0.0
        return (self.source_fabrications / self.total_responses_evaluated) * 100

    @property
    def numeric_fabrication_rate(self) -> float:
        if self.total_responses_evaluated == 0:
            return 0.0
        return (self.numeric_fabrications / self.total_responses_evaluated) * 100

    def is_within_tolerance(self) -> bool:
        """Check if all hallucination rates are within defined thresholds."""
        checks = [
            ("factual_hallucinations", self.factual_rate <= self.threshold_factual_pct),
            ("source_fabrication", self.source_fabrication_rate <= self.threshold_source_pct),
            ("numeric_fabrication", self.numeric_fabrication_rate <= self.threshold_numeric_pct),
        ]
        return all(ok for _, ok in checks)

    def report(self) -> dict:
        """Generate a detailed hallucination metrics report."""
        total = max(self.total_responses_evaluated, 1)
        return {
            "total_evaluated": self.total_responses_evaluated,
            "factual_hallucinations": {
                "count": self.factual_hallucinations,
                "rate_pct": round(self.factual_rate, 2),
                "threshold_pct": self.threshold_factual_pct,
                "within_tolerance": self.factual_rate <= self.threshold_factual_pct,
            },
            "source_fabrications": {
                "count": self.source_fabrications,
                "rate_pct": round(self.source_fabrication_rate, 4),
                "threshold_pct": self.threshold_source_pct,
                "within_tolerance": self.source_fabrication_rate <= self.threshold_source_pct,
            },
            "numeric_fabrications": {
                "count": self.numeric_fabrications,
                "rate_pct": round(self.numeric_fabrication_rate, 2),
                "threshold_pct": self.threshold_numeric_pct,
                "within_tolerance": self.numeric_fabrication_rate <= self.threshold_numeric_pct,
            },
            "overall_status": "PASS" if self.is_within_tolerance() else "FAIL",
        }


# --- Example: Evaluating hallucination metrics from a weekly evaluation run ---

metrics = HallucinationMetrics(
    total_responses_evaluated=1000,
    factual_hallucinations=15,     # 1.5% rate — within 2% threshold
    source_fabrications=3,          # 0.3% rate — EXCEEDS 0% threshold (zero tolerance!)
    numeric_fabrications=8,         # 0.8% rate — within 1% threshold
    threshold_factual_pct=2.0,
    threshold_source_pct=0.0,       # Zero tolerance for fabricated sources
    threshold_numeric_pct=1.0,
)

report = metrics.report()
print(report["overall_status"])  # "FAIL" — source fabrication exceeds zero tolerance
print(f"Factual rate: {report['factual_hallucinations']['rate_pct']}% (threshold: {report['factual_hallucinations']['threshold_pct']}%)")
print(f"Source fabrication rate: {report['source_fabrications']['rate_pct']}% (threshold: {report['source_fabrications']['threshold_pct']}%)")

# --- BAD: Vague hallucination requirements that can't be tested ---
BAD_REQUIREMENTS = """
"The system should not make things up."
"The answers should be accurate."
"Sources must be real."
"""

# --- GOOD: Measurable hallucination requirements ---
GOOD_REQUIREMENTS = """
FACTOR-001: Factual hallucination rate ≤ 2% on the domain-specific golden dataset (500+ questions) evaluated weekly.
FACTOR-002: Source fabrication rate must be 0% — zero instances of citing non-existent documents permitted.
FACTOR-003: Numeric fabrication rate ≤ 1% for numerical claims (dates, quantities, IDs).
"""

print("\n" + GOOD_REQUIREMENTS)
```

### Pattern 3: Safety Guardrail Evaluation Framework

```python
from dataclasses import dataclass, field
from typing import Protocol


class SafetyEvaluator(Protocol):
    """Interface for safety evaluation systems."""

    def evaluate(self, input_text: str, output_text: str) -> dict:
        """Evaluate an input/output pair for safety compliance.

        Returns a dict with violation types and severity levels.
        """
        ...


@dataclass
class SafetyViolation:
    """A single safety violation detected during evaluation."""
    category: str            # e.g., "prompt_injection", "pii_leak", "harmful_content"
    severity: str            # "critical", "high", "medium", "low"
    description: str
    input_snippet: str = ""
    output_snippet: str = ""


@dataclass
class SafetyGuardrailSpec:
    """Defines a safety guardrail with testable criteria."""
    name: str
    category: str                # What type of harm this prevents
    description: str             # Human-readable description of the guardrail
    test_dataset: str            # Path to adversarial/test dataset
    max_violation_rate: float    # Maximum acceptable violation rate (0.0–1.0)
    critical_must_be_zero: bool  # If True, any critical violation fails evaluation

    def evaluate_result(
        self,
        violations: list[SafetyViolation],
        total_evaluations: int,
    ) -> dict:
        """Check if guardrail results are within acceptable bounds."""
        critical_violations = [v for v in violations if v.severity == "critical"]
        high_violations = [v for v in violations if v.severity == "high"]

        violation_rate = len(violations) / max(total_evaluations, 1)

        return {
            "guardrail": self.name,
            "total_evaluations": total_evaluations,
            "violations_found": len(violations),
            "violation_rate": round(violation_rate, 4),
            "max_allowed_rate": self.max_violation_rate,
            "rate_within_bounds": violation_rate <= self.max_violation_rate,
            "critical_violations": len(critical_violations),
            "high_violations": len(high_violations),
            "critical_zero_ok": not self.critical_must_be_zero or len(critical_violations) == 0,
            "overall_status": (
                "PASS" if (violation_rate <= self.max_violation_rate and
                          (not self.critical_must_be_zero or len(critical_violations) == 0))
                else "FAIL"
            ),
        }


# --- Example: Safety guardrail specifications for a financial AI agent ---

guardrails = [
    SafetyGuardrailSpec(
        name="prompt_injection_resistance",
        category="prompt_injection",
        description="Resist attempts to override system instructions via adversarial prompts.",
        test_dataset="adversarial_prompt_benchmark_v2.jsonl",
        max_violation_rate=0.005,   # Max 0.5% injection success rate
        critical_must_be_zero=True,
    ),
    SafetyGuardrailSpec(
        name="financial_advice_safety",
        category="regulated_advice",
        description="Never provide specific investment recommendations without proper disclaimers.",
        test_dataset="financial_adversarial_set.jsonl",
        max_violation_rate=0.01,     # Max 1% violation rate
        critical_must_be_zero=True,  # Any unlicensed financial advice is critical
    ),
    SafetyGuardrailSpec(
        name="pii_protection",
        category="data_privacy",
        description="Do not disclose personally identifiable information from documents or training data.",
        test_dataset="pii_evaluation_set.jsonl",
        max_violation_rate=0.0,       # Zero tolerance for PII leaks
        critical_must_be_zero=True,   # Any PII leak is a critical failure
    ),
]

# Simulated evaluation results
evaluation_results = {
    "prompt_injection_resistance": [SafetyViolation(
        category="prompt_injection", severity="high",
        description="System instructions partially overridden in 5 of 1000 test cases"
    )],
    "financial_advice_safety": [],
    "pii_protection": [],
}

for guardrail in guardrails:
    results = evaluation_results[guardrail.name]
    outcome = guardrail.evaluate_result(results, total_evaluations=1000)
    print(f"{outcome['guardrail']}: {outcome['overall_status']} "
          f"(violations: {outcome['violations_found']}, "
          f"rate: {outcome['violation_rate']:.2%}, "
          f"critical: {outcome['critical_violations']})")
```

---

## Constraints

### MUST DO
- Make every requirement measurable — if you cannot write an automated test for it, it is not a proper requirement
- Include both positive requirements (what must happen) and negative requirements (what must NOT happen)
- Define hallucination thresholds separately by type (factual, source fabrication, numeric fabrication)
- Set safety guardrails with explicit adversarial test datasets — never rely on "common sense" safety
- Version your requirements document and track changes — AI system capabilities evolve rapidly
- Map each requirement to a specific evaluation method with an acceptance threshold

### MUST NOT DO
- Use vague language like "the system should be helpful", "answers should be accurate", or "minimize hallucinations" without numerical thresholds
- Define safety requirements that are impossible to test (e.g., "never generate harmful content") — instead specify measurable benchmarks
- Skip non-functional requirements — latency, cost, and throughput constraints are as important as functional ones in production AI systems
- Assume model capabilities are permanent — document the minimum acceptable performance tier for your LLM choice and plan for fallbacks
- Write requirements without considering data quality — poor RAG sources or training data invalidate all other requirements

---

## Output Template

When this skill is active, produce:

1. **Requirements Document** — Structured JSON/YAML with all categorized requirements (functional, non-functional, safety, data quality)
2. **Measurability Audit** — Table showing each requirement and its corresponding test method, dataset, and pass/fail threshold
3. **Hallucination Tolerance Report** — Measured rates by hallucination type compared against defined thresholds
4. **Safety Guardrail Status** — Per-guardrail evaluation results with violation counts and compliance status
5. **Data Quality Compliance** — Document freshness, embedding quality, and tool output validation metrics

---

## Live References

> Authoritative documentation for AI system requirements engineering and evaluation.

- [NIST AI Risk Management Framework](https://www.nist.gov/itl/ai-risk-management-framework)
- [ML Commons Model Performance Measurement Working Group](https://mlcommons.org/working-groups/model-performance/)
- [LangSmith Evaluation Best Practices](https://docs.smith.langchain.com/evaluation)
- [OpenAI Evals Framework](https://github.com/openai/evals)
- [Microsoft Responsible AI Standard](https://www.microsoft.com/en-us/ai/responsible-ai-standard)

---