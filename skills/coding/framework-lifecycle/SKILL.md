---




name: framework-lifecycle
description: Orchestrates the end-to-end framework decision lifecycle from requirements
  gathering through selection and utilization, including phase-gate validation, re-evaluation
  triggers, and rollback planning for technology decisions.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: framework lifecycle, framework decision, technology lifecycle, framework
    evaluation, framework rollback, tech stack lifecycle, framework governance
  archetypes:
  - orchestration
  anti_triggers:
  - brainstorming
  - vague ideation
  - code golf
  - over-engineering
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
  related-skills: framework-selection, framework-requirements, framework-utilization,
    architecture-decision-records, technical-debt-management




---




# Framework Decision Lifecycle

When this skill is active, you act as a technology governance orchestrator that guides teams through the complete lifecycle of framework and technology decisions — from initial requirements elicitation through evaluation, selection, integration, and ongoing re-evaluation. You ensure every phase-gate decision is evidence-based, documented, and reversible before production commitment.

## TL;DR Checklist

- [ ] Elicit and categorize requirements using MoSCoW priority (Must, Should, Could, Won't)
- [ ] Build a weighted evaluation matrix where weights sum to exactly 1.0
- [ ] Research at least 2 viable candidates using GitHub metrics, ecosystem analysis, and community benchmarks
- [ ] Score all candidates against every criterion with evidence citations — never subjective ratings alone
- [ ] Run a formal gate decision: green (proceed), conditional (approve with specified conditions), or red (re-evaluate)
- [ ] Build a validation spike exercising critical paths before final commitment
- [ ] Establish a re-evaluation cadence with specific triggers tied to version events, security incidents, and team growth

---

## When to Use

Use this skill when:

- A team is selecting a new framework for a major component or greenfield project (e.g., choosing between React, Angular, Svelte for a web frontend)
- An existing framework decision needs formal re-evaluation due to deprecation events, security incidents, or significant performance regressions
- A technology committee or architecture review board requires structured evidence for a framework selection decision
- You need to plan a framework migration or rollback strategy before committing to an irreversible integration approach
- The team is growing beyond initial founding members and needs governance over technology choices to prevent drift
- Evaluating whether to adopt a newer framework vs. stick with a mature, stable one (e.g., Laravel 10 vs. Livewire 3)

## When NOT to Use

Avoid this skill for:

- Trivial component-level decisions where the cost of switching is negligible (use quick heuristic instead)
- Situations where leadership has already made a binding directive and no evidence gathering is needed
- Micro-framework or library picks that do not shape architectural boundaries (e.g., choosing between uuid libraries)
- Emergency hotfixes where speed overrides governance — apply the fix first, document retroactively

---

## Core Workflow

### 1. Elicit Requirements

Conduct structured requirements elicitation across four categories. Do not accept vague requests like "we need a modern framework." Drill down with specific questions.

**Functional Requirements** — What must the framework do?
- Routing model (REST, GraphQL, RPC, server-sent events)
- Template rendering or component composition approach
- Built-in ORM/data access layer requirements
- Authentication/authorization integration patterns
- Real-time capability (WebSockets, SSE, polling)

**Non-Functional Requirements** — Quality attributes the framework must support.
- Performance targets: response time < 200ms p95, throughput > 1000 req/s
- Bundle size budgets: initial load < 200KB gzipped
- Accessibility compliance: WCAG 2.1 AA minimum
- SEO requirements: SSR/SSG necessity

**Operational Requirements** — How the framework interacts with operational concerns.
- CI/CD pipeline compatibility (build times, test execution)
- Monitoring and observability integration hooks
- Logging standardization (structured JSON logging)
- Containerization support (multi-stage build optimization)

**Compliance Requirements** — Regulatory or organizational mandates.
- License compatibility (GPL vs MIT vs Apache 2.0)
- Data sovereignty requirements
- Audit trail capabilities
- SOC2/HIPAA compliance considerations

**Checkpoint:** Before proceeding, classify all gathered requirements by MoSCoW priority. At least 3 Must-have requirements must be identified. Requirements with only "Could" or "Won't" priority must be moved to a backlog and excluded from the evaluation matrix weights.

### 2. Define Evaluation Criteria

Translate each Must and Should requirement into measurable criteria with assigned weight scores. The total of all criterion weights must equal exactly 1.0.

**Criteria Design Process:**

```
For each MoSCoW "Must" requirement: weight = 0.10–0.20
For each MoSCoW "Should" requirement: weight = 0.03–0.08
For cross-cutting concerns (licensing, community): weight = 0.05–0.10 total
```

**Weight Validation Rule:** The sum of all weights must be exactly 1.0 (±0.001 tolerance). If not, normalize by dividing each weight by the total sum.

**Measurability Test:** For every criterion, ask: "Can I score a framework on this using evidence from documentation, benchmarks, or third-party assessments?" If the answer is no, the criterion must be reformulated with concrete measurement methods.

**Checkpoint:** Verify all weights sum to 1.0 and each criterion has an associated evidence source (GitHub stars, npm download trends, OWASP compliance report, Stack Overflow question volume).

### 3. Identify Candidate Frameworks

Research frameworks using a structured discovery process. Do not rely on personal preference or recency bias — use quantifiable signals.

**Research Methods:**

1. **GitHub Metrics Analysis** (for open-source frameworks)
   - Star count growth rate over 12 months (not absolute stars)
   - Issue resolution median time (from GitHub API `get_issues`)
   - Release cadence consistency (months between minor releases)
   - Contributor diversity: percentage of contributors with >1 commit in last year

2. **Ecosystem Analysis**
   - Available middleware/plugins count and maintenance status
   - First-party documentation quality score (completeness + examples)
   - Third-party library compatibility matrix
   - Tooling ecosystem (CLI tools, IDE extensions, debugging support)

3. **Benchmark Review**
   - Standardized performance benchmarks (e.g., Web Framework Benchmark for web frameworks)
   - Memory footprint under load (from published benchmarks or independent testing)
   - Build time comparison across comparable project sizes
   - Bundle size analysis using tools like `webpack-bundle-analyzer`

4. **Community Assessment**
   - Stack Overflow question volume and answer rate over 6 months
   - Number of production case studies available (not blog posts, but deployed systems)
   - Conference presence (number of talks per year at major conferences)
   - Commercial support availability and vendor stability

**Checkpoint:** At minimum 2 viable candidates must be identified. If fewer than 2 pass the screening criteria (Meets all "Must" requirements), expand research scope or re-evaluate Must requirements — do not proceed with a single untested candidate.

### 4. Execute Evaluation Matrix

Score each candidate against every weighted criterion using evidence-based scoring. Never score based on opinion alone.

**Scoring Scale:**
| Score | Meaning | Evidence Required |
|-------|---------|-------------------|
| 1 | Does not meet — fails to satisfy the criterion | Broken functionality, missing capability |
| 2 | Partially meets — significant gaps remain | Limited documentation, partial support |
| 3 | Meets — core requirement satisfied with minor gaps | Working implementation available |
| 4 | Exceeds — satisfies with notable advantages | Superior benchmarks, extra features |
| 5 | Exceptional — exceeds expectations significantly | Industry-leading performance, zero-gap compliance |

**Evidence-Based Scoring Rules:**
- Every score must cite at least one evidence source (URL, benchmark number, documentation reference)
- Scores below 3 on any "Must" criterion requirement trigger automatic disqualification of that candidate for that criterion
- Cross-validate scores: if two team members score independently, they must agree within ±1 point. Discrepancies require a joint review session.

**Weighted Score Calculation:** `final_score = sum(criterion_weight × score)` across all criteria. Rank candidates by final weighted score.

**Checkpoint:** All candidates must have complete evidence for every scored criterion. Partial scores without evidence are invalid. If any criterion is missing evidence, return to that candidate and fill the gap before proceeding.

### 5. Gate Decision Review

Conduct a formal gate review with all stakeholders present. Present the evaluation matrix, evidence citations, spike results (if available), and risk assessment. The decision must be one of three outcomes:

**Green Light:** Proceed to integration planning immediately.
- All "Must" criteria satisfied across top-ranked candidates
- No critical risks identified
- Spike validation passed all success criteria
- Next action: move to Step 6 (Integration Strategy) within 1 sprint

**Conditional Approval:** Proceed with specific conditions that must be met before production.
- Document each condition as a concrete acceptance criterion
- Example conditions: "Complete security audit of authentication middleware before v1 launch", "Resolve performance regression on list view (>500 items)", "Migrate from beta API to stable API before feature freeze"
- Set deadlines for each condition (specific dates, not "soon")
- Assign owners for each condition
- If conditions are not met by deadline, decision escalates to Red Light

**Red Light:** Do NOT proceed. Return to an earlier step.
- Re-evaluate requirements (Step 1) if critical criteria were misunderstood
- Expand candidate search (Step 3) if current candidates lack sufficient evidence
- Consider alternative architectures if no framework meets core requirements
- Document the decision and reasons in an Architecture Decision Record (ADR)

**Checkpoint:** The gate decision outcome must be documented with explicit reasoning, stakeholder signatures, and recorded dissenting opinions. No unrecorded verbal approvals are valid.

### 6. Plan Integration Strategy

Design the integration approach based on the selected framework's specific characteristics. This is not generic — tailor every aspect to the chosen framework.

**DI Topology Design:**
- Map all application services to their DI lifetimes (singleton, scoped, transient)
- Define the composition root location and module boundaries
- Identify circular dependency risks and plan resolution strategies (interface segregation, event-based decoupling)

**Configuration Strategy:**
- Environment-specific configuration files (dev, staging, production)
- Secrets management integration (Vault, AWS Secrets Manager, or equivalent)
- Configuration validation at startup (schema validation, required field checks)
- Hot-reload capability for non-sensitive configuration during development

**Extension Point Design:**
- Define plugin/interceptor/middleware boundaries based on framework patterns
- Document the expected contract for each extension point (interfaces, type signatures)
- Plan for third-party extension compatibility testing

**Testing Approach:**
- Unit test strategy: percentage of critical path coverage target (>80%)
- Integration test scope: which external dependencies are mocked vs. tested live
- E2E test selection criteria: user journeys that represent >90% of business value
- Performance test automation in CI pipeline

**Checkpoint:** Complete a coupling analysis — for each integration point, classify coupling as tight (direct class/func dependency), medium (interface-based dependency), or loose (event/message-based). Target at least 60% loose or medium coupling. Tight coupling must be justified with specific constraints (performance-critical path, framework-mandated pattern).

### 7. Build Validation Spike

Construct a minimal proof-of-concept that exercises the critical integration paths identified in the evaluation matrix. The spike must not be production-ready — it is designed to fail fast and reveal hidden costs.

**Minimum Spike Requirements:**
- Implement at least one end-to-end user journey (not just a single component)
- Exercise the framework's routing or request handling mechanism
- Demonstrate data persistence through the framework's recommended ORM/driver
- Show configuration loading from at least two different environment profiles
- Include error handling and graceful degradation for the primary failure mode

**Performance Thresholds to Test:**
- Initial render/load time under simulated 3G network conditions (Lighthouse or equivalent)
- API response time p95 under load of 100 concurrent requests
- Memory usage stability over a 30-minute sustained request period
- Build/compile time for the spike project vs. projected production impact

**Failure Modes to Validate:**
- Connection failure to database/backend service — does it degrade gracefully?
- Authentication token expiration — is refresh handled without user disruption?
- Invalid input data — does the framework validate and return appropriate errors?
- High load condition — identify the breaking point before it occurs in production

**Checkpoint:** Define explicit spike success criteria before starting. Example: "Spike passes if all four performance thresholds are met, error handling covers three failure modes with <50ms overhead, and the total spike build time is under 2 hours." If the spike fails to meet any critical threshold, escalate to Red Light decision or return to Step 3 with revised candidate list.

### 8. Establish Re-evaluation Cadence

Define when and how the framework choice will be re-evaluated over its operational lifetime. This step prevents technology debt accumulation through neglect.

**Re-evaluation Triggers (Concrete Events):**

1. **Version Deprecation Events:** Framework maintainer announces end-of-life, security-only updates, or major version migration away from LTS. Action: initiate formal re-evaluation within 30 days of announcement.

2. **Security Incidents:** CVE with CVSS ≥ 7.0 affects the framework or its core dependencies. Action: assess mitigation viability; if unfixable in current version, trigger emergency evaluation of alternative.

3. **Performance Regressions:** Measured application performance degrades by >15% compared to baseline (established at integration time), after ruling out infrastructure and data growth causes. Action: investigate whether framework upgrade resolves regression or signals need for migration.

4. **Team Growth Milestones:** Team size exceeds the number of documented "framework champions" (people with deep expertise). When team grows >3×, re-evaluate if onboarding complexity justifies alternative. Threshold: new hires must reach productive velocity within 2 sprints.

5. **Ecosystem Shifts:** A competing framework achieves a critical mass shift (e.g., overtaking current framework in GitHub star growth rate × 6 months, or major enterprise adoption). Action: assess whether the ecosystem shift impacts long-term talent availability and library support.

**Re-evaluation Documentation Requirements:**
- Record the re-evaluation schedule (quarterly for new frameworks, bi-annually for mature ones)
- Define who owns the re-evaluation decision (tech lead, architecture board, individual contributor?)
- Create a rollback readiness checklist that is reviewed at each re-evaluation cycle
- Store re-evaluation results in the same location as the original ADR

**Checkpoint:** Document the full re-evaluation plan with specific trigger conditions, responsible persons, and escalation paths. Verify the plan covers at least 3 of the 5 trigger types listed above.

---

## Implementation Patterns / Reference Guide

### Pattern 1: Phase-Gate Decision Matrix

A state machine that manages phase-gate decisions for the framework lifecycle, enforcing validation rules at each transition.

```python
from enum import Enum
from typing import Optional
from dataclasses import dataclass, field


class GateOutcome(Enum):
    """Formal gate decision outcomes."""
    GREEN = "green_light"
    CONDITIONAL = "conditional_approval"
    RED = "red_light"


class LifecycleState(Enum):
    """Phases in the framework decision lifecycle."""
    REQUIREMENTS_DEFINED = "requirements-defined"
    EVALUATION_COMPLETE = "evaluation-complete"
    GATE_DECISION = "gate-decision"
    SPIKE_VALIDATED = "spike-validated"
    PRODUCTION_INTEGRATED = "production-integrated"


@dataclass
class GateCondition:
    """A condition attached to conditional approval."""
    description: str
    acceptance_criteria: str
    deadline_iso: str
    owner: str


@dataclass
class PhaseGateMatrix:
    """Manages phase-gate decisions for the framework decision lifecycle.

    Enforces ordered state transitions, validates prerequisite data at each gate,
    and tracks conditional approval conditions that must be satisfied before
    proceeding to production integration.

    Usage:
        matrix = PhaseGateMatrix("frontend-ui-replacement")
        matrix.advance_to(LifecycleState.EVALUATION_COMPLETE,
                          weighted_scores={"security": 0.15, "performance": 0.20})
        result = matrix.evaluate_gate()
        if result.outcome is GateOutcome.GREEN:
            matrix.advance_to(LifecycleState.SPIKE_VALIDATED)
    """

    framework_id: str
    current_state: LifecycleState = LifecycleState.REQUIREMENTS_DEFINED
    evaluation_criteria: dict[str, float] = field(default_factory=dict)
    candidate_scores: dict[str, dict[str, float]] = field(default_factory=dict)
    gate_conditions: list[GateCondition] = field(default_factory=list)
    gate_history: list[dict] = field(default_factory=list)
    transition_log: list[dict] = field(default_factory=list)

    # Allowed state transitions: from -> set of allowed "to" states
    _ALLOWED_TRANSITIONS: dict[LifecycleState, set[LifecycleState]] = {
        LifecycleState.REQUIREMENTS_DEFINED: {LifecycleState.EVALUATION_COMPLETE},
        LifecycleState.EVALUATION_COMPLETE: {LifecycleState.GATE_DECISION},
        LifecycleState.GATE_DECISION: {
            LifecycleState.EVALUATION_COMPLETE,  # conditional or red -> retry
            LifecycleState.SPIKE_VALIDATED,       # green light
        },
        LifecycleState.SPIKE_VALIDATED: {LifecycleState.PRODUCTION_INTEGRATED},
    }

    def advance_to(self, target_state: LifecycleState,
                   weighted_scores: Optional[dict[str, float]] = None) -> dict:
        """Transition to a new lifecycle state with validation.

        Args:
            target_state: The state to transition into.
            weighted_scores: Evaluation criteria weights (must sum to 1.0).

        Returns:
            Transition result with success/failure status and reason.

        Raises:
            ValueError: If the transition is invalid or prerequisites are unmet.
        """
        allowed = self._ALLOWED_TRANSITIONS.get(self.current_state, set())

        if target_state not in allowed:
            raise ValueError(
                f"Cannot transition from {self.current_state.value} to "
                f"{target_state.value}. Allowed: {[s.value for s in allowed]}"
            )

        # Prerequisite validation per state
        if target_state is LifecycleState.EVALUATION_COMPLETE:
            if not weighted_scores or abs(sum(weighted_scores.values()) - 1.0) > 0.001:
                raise ValueError("Evaluation criteria weights must sum to exactly 1.0")
            self.evaluation_criteria = weighted_scores

        if target_state is LifecycleState.GATE_DECISION:
            if not self.evaluation_criteria:
                raise ValueError("Cannot evaluate gate without defined criteria")
            if not self.candidate_scores:
                raise ValueError("Cannot evaluate gate without candidate scores")

        previous_state = self.current_state
        self.current_state = target_state
        self.transition_log.append({
            "from": previous_state.value,
            "to": target_state.value,
            "timestamp": None,  # set by caller if needed
        })

        return {
            "success": True,
            "previous_state": previous_state.value,
            "current_state": target_state.value,
        }

    def evaluate_gate(self) -> dict:
        """Evaluate the current gate decision based on candidate scores.

        Returns a GateOutcome (GREEN, CONDITIONAL, or RED) with supporting details.

        GREEN: Top candidate has weighted score >= 70 and no Must-criterion failures.
        CONDITIONAL: Top candidate meets threshold but has noted risks.
        RED: No candidate passes threshold or critical criteria are unmet.
        """
        if not self.candidate_scores or not self.evaluation_criteria:
            return {"outcome": GateOutcome.RED.value, "reason": "Missing evaluation data"}

        # Calculate weighted scores for each candidate
        scored_candidates = {}
        for candidate, scores in self.candidate_scores.items():
            total = 0.0
            must_failures = []
            risks = []
            for criterion, weight in self.evaluation_criteria.items():
                score = scores.get(criterion, 1)
                weighted = weight * score
                total += weighted
                if weight >= 0.10 and score < 3:
                    must_failures.append(criterion)
                elif score <= 2:
                    risks.append(f"{criterion} scored {score}")

            scored_candidates[candidate] = {
                "weighted_score": total,
                "must_failures": must_failures,
                "risks": risks,
            }

        # Determine outcome based on top candidate
        best = max(scored_candidates.items(), key=lambda x: x[1]["weighted_score"])
        best_candidate, details = best

        if details["must_failures"] or details["weighted_score"] < 60:
            result = GateOutcome.RED
            reason = (f"{best_candidate}: weighted score {details['weighted_score']:.2f}, "
                      f"Must-failures: {', '.join(details['must_failures'])}")
        elif details["risks"]:
            result = GateOutcome.CONDITIONAL
            self.gate_conditions.append(GateCondition(
                description=f"Address risks for {best_candidate}",
                acceptance_criteria="Resolve all identified risk items",
                deadline_iso="",  # set by decision owner
                owner="",
            ))
            reason = (f"{best_candidate}: score {details['weighted_score']:.2f}, "
                      f"risks: {', '.join(details['risks'])}")
        else:
            result = GateOutcome.GREEN
            reason = f"{best_candidate} scored {details['weighted_score']:.2f} with no critical risks"

        self.gate_history.append({
            "outcome": result.value,
            "reason": reason,
            "top_candidate": best_candidate,
            "scores": {k: v["weighted_score"] for k, v in scored_candidates.items()},
        })

        return {
            "outcome": result.value,
            "reason": reason,
            "candidates": {k: v["weighted_score"] for k, v in scored_candidates.items()},
            "conditions_count": len(self.gate_conditions),
        }

    def register_candidate_scores(self, candidate_name: str,
                                  scores: dict[str, float]) -> None:
        """Register evidence-based scores for a candidate framework.

        Args:
            candidate_name: Identifier for the candidate framework.
            scores: Mapping of criterion names to scores (1-5 scale).
        """
        self.candidate_scores[candidate_name] = scores

    def mark_conditions_met(self, condition_index: int) -> bool:
        """Mark a gate condition as satisfied."""
        if 0 <= condition_index < len(self.gate_conditions):
            self.gate_conditions.pop(condition_index)
            return True
        return False
```

### Pattern 2: Re-evaluation Trigger Engine

Monitors and evaluates re-evaluation triggers against a framework instance over time. Each trigger type has specific evaluation logic with concrete thresholds.

```python
import asyncio
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional


class TriggerType(Enum):
    """Types of re-evaluation triggers."""
    SECURITY = "security"
    PERFORMANCE = "performance"
    ECOSYSTEM = "ecosystem"
    TEAM = "team"
    BUSINESS = "business"


@dataclass
class FrameworkInstance:
    """Represents a deployed framework instance with its operational state."""
    name: str
    version: str
    integrated_date: datetime
    baseline_performance_ms: float  # p95 response time at integration
    team_size: int
    ecosystem_github_stars_current: int
    ecosystem_github_stars_at_integration: int
    recent_cves: list[dict] = field(default_factory=list)  # [{"cve_id": "...", "cvss": 8.5, "date": "..."}]
    benchmark_history: list[float] = field(default_factory=list)  # [p95_ms, ...] over time


@dataclass
class TriggerResult:
    """Result of evaluating a single re-evaluation trigger."""
    trigger_type: TriggerType
    severity: str  # "critical", "high", "medium", "low", "none"
    recommendation: str  # "re_evaluate_immediately", "investigate", "monitor", "no_action"
    details: str
    triggered_at: datetime = field(default_factory=datetime.utcnow)


class ReevaluationTriggerEngine:
    """Evaluates re-evaluation triggers against a framework instance.

    Monitors for security incidents, performance regressions, ecosystem shifts,
    team growth, and business changes that warrant re-evaluating the framework choice.

    Evaluation logic uses concrete thresholds rather than subjective judgment.
    Each trigger type has domain-specific metrics and decision boundaries.
    """

    # Threshold constants — these should be tuned per organization
    THRESHOLDS = {
        "security_cvss_critical": 9.0,
        "security_cvss_high": 7.0,
        "performance_regression_pct": 15.0,
        "ecosystem_growth_acceleration_factor": 2.0,
        "team_growth_multiplier": 3.0,
        "benchmark_sample_size": 3,  # min samples for regression detection
    }

    def __init__(self, framework: FrameworkInstance) -> None:
        self.framework = framework
        self.trigger_results: list[TriggerResult] = []

    def evaluate_all(self) -> list[TriggerResult]:
        """Run all trigger evaluations and return results sorted by severity."""
        results = [
            self._evaluate_security(),
            self._evaluate_performance(),
            self._evaluate_ecosystem(),
            self._evaluate_team(),
            self._evaluate_business(),
        ]
        # Sort: critical > high > medium > low > none
        severity_order = {"critical": 0, "high": 1, "medium": 2, "low": 3, "none": 4}
        results.sort(key=lambda r: severity_order.get(r.severity, 5))
        self.trigger_results.extend(results)
        return results

    def _evaluate_security(self) -> TriggerResult:
        """Check for security-related CVEs that require immediate action.

        Logic: Any CVSS >= critical_threshold triggers re-evaluation.
               Any CVSS >= high_threshold requires investigation within 7 days.
        """
        critical_cves = [c for c in self.framework.recent_cves
                         if c["cvss"] >= self.THRESHOLDS["security_cvss_critical"]]
        high_cves = [c for c in self.framework.recent_cves
                     if self.THRESHOLDS["security_cvss_high"] <= c["cvss"] <
                        self.THRESHOLDS["security_cvss_critical"]]

        if critical_cves:
            return TriggerResult(
                trigger_type=TriggerType.SECURITY,
                severity="critical",
                recommendation="re_evaluate_immediately",
                details=(f"{len(critical_cves)} CVE(s) with CVSS >= 9.0 detected: "
                         f"{', '.join(c['cve_id'] for c in critical_cves)}. "
                         f"Mitigation may require framework migration or vendor patch."),
            )

        if high_cves:
            return TriggerResult(
                trigger_type=TriggerType.SECURITY,
                severity="high",
                recommendation="investigate",
                details=(f"{len(high_cves)} CVE(s) with CVSS >= 7.0 detected: "
                         f"{', '.join(c['cve_id'] for c in high_cves)}. "
                         f"Investigate mitigation viability within 7 days."),
            )

        return TriggerResult(
            trigger_type=TriggerType.SECURITY,
            severity="none",
            recommendation="no_action",
            details="No critical or high-severity CVEs detected.",
        )

    def _evaluate_performance(self) -> TriggerResult:
        """Detect performance regressions compared to integration baseline.

        Logic: If current p95 response time exceeds baseline by >= 15% AND
               we have at least `benchmark_sample_size` measurements, flag regression.
        """
        if (not self.framework.benchmark_history or
                len(self.framework.benchmark_history) < self.THRESHOLDS["benchmark_sample_size"]):
            return TriggerResult(
                trigger_type=TriggerType.PERFORMANCE,
                severity="none",
                recommendation="no_action",
                details=(f"Insufficient benchmark data: {len(self.framework.benchmark_history)} "
                         f"samples recorded (minimum {self.THRESHOLDS['benchmark_sample_size']} required)."),
            )

        current_p95 = self.framework.benchmark_history[-1]
        regression_pct = ((current_p95 - self.framework.baseline_performance_ms) /
                          self.framework.baseline_performance_ms) * 100

        if regression_pct >= self.THRESHOLDS["performance_regression_pct"]:
            return TriggerResult(
                trigger_type=TriggerType.PERFORMANCE,
                severity="high" if regression_pct >= 30 else "medium",
                recommendation="investigate",
                details=(f"Performance regression detected: current p95 is "
                         f"{current_p95:.0f}ms vs baseline {self.framework.baseline_performance_ms:.0f}ms "
                         f"({regression_pct:.1f}% degradation). Investigate whether a framework "
                         f"upgrade resolves this or if migration is warranted."),
            )

        return TriggerResult(
            trigger_type=TriggerType.PERFORMANCE,
            severity="none",
            recommendation="no_action",
            details=f"Performance within tolerance: {current_p95:.0f}ms vs baseline {self.framework.baseline_performance_ms:.0f}ms ({regression_pct:.1f}% change).",
        )

    def _evaluate_ecosystem(self) -> TriggerResult:
        """Assess ecosystem momentum shifts relative to integration time.

        Logic: If star growth rate has accelerated >= 2× compared to integration period,
               the ecosystem may be shifting away from this framework.
        """
        days_since_integration = (datetime.utcnow() - self.framework.integrated_date).days
        if days_since_integration < 30:
            return TriggerResult(
                trigger_type=TriggerType.ECOSYSTEM,
                severity="none",
                recommendation="no_action",
                details=f"Framework integrated only {days_since_integration} days ago. Waiting for cooldown period.",
            )

        growth_since_integration = (self.framework.ecosystem_github_stars_current -
                                    self.framework.ecosystem_github_stars_at_integration)

        if self.framework.ecosystem_github_stars_at_integration <= 0:
            return TriggerResult(
                trigger_type=TriggerType.ECOSYSTEM,
                severity="none",
                recommendation="no_action",
                details="Baseline star count is zero; ecosystem shift cannot be measured.",
            )

        growth_factor = growth_since_integration / self.framework.ecosystem_github_stars_at_integration
        # Normalize: growth_factor represents total growth since integration
        # We check if current momentum exceeds typical lifecycle pace

        if growth_factor >= self.THRESHOLDS["ecosystem_growth_acceleration_factor"]:
            return TriggerResult(
                trigger_type=TriggerType.ECOSYSTEM,
                severity="medium",
                recommendation="monitor",
                details=(f"Ecosystem growth factor is {growth_factor:.1f}x since integration "
                         f"({self.framework.ecosystem_github_stars_at_integration} → "
                         f"{self.framework.ecosystem_github_stars_current} stars). Monitor for "
                         f"sustained momentum that may indicate market shift."),
            )

        return TriggerResult(
            trigger_type=TriggerType.ECOSYSTEM,
            severity="none",
            recommendation="no_action",
            details=f"Ecosystem growth factor is {growth_factor:.2f}x (below {self.THRESHOLDS['ecosystem_growth_acceleration_factor']}x threshold).",
        )

    def _evaluate_team(self) -> TriggerResult:
        """Check if team growth exceeds framework champion coverage.

        Logic: When team size > 3× original champions, onboarding complexity
               may justify evaluating simpler or better-documented alternatives.
        """
        estimated_champions = max(1, len(self.framework.benchmark_history) // 50)  # rough estimate
        growth_multiplier = self.framework.team_size / estimated_champions

        if growth_multiplier >= self.THRESHOLDS["team_growth_multiplier"]:
            return TriggerResult(
                trigger_type=TriggerType.TEAM,
                severity="medium",
                recommendation="investigate",
                details=(f"Team has grown to {self.framework.team_size} members. "
                         f"Estimated champion coverage ratio is {growth_multiplier:.1f}x. "
                         f"Assess whether onboarding complexity and knowledge concentration "
                         f"justify evaluating alternatives with lower learning curves."),
            )

        return TriggerResult(
            trigger_type=TriggerType.TEAM,
            severity="none",
            recommendation="no_action",
            details=f"Team size ({self.framework.team_size}) is within champion coverage capacity.",
        )

    def _evaluate_business(self) -> TriggerResult:
        """Business-driven trigger: placeholder for business logic changes.

        This evaluates whether business requirements have shifted in ways that
        make the current framework choice suboptimal (e.g., shift from SPA to
        SSR, new regulatory requirements, target market changes).

        To activate this trigger, set `business_revenue_change_pct` on the framework instance.
        """
        return TriggerResult(
            trigger_type=TriggerType.BUSINESS,
            severity="none",
            recommendation="no_action",
            details="No business-change triggers configured. Add domain-specific logic as needed.",
        )

    def has_critical_trigger(self) -> bool:
        """Return True if any triggered result requires immediate action."""
        return any(r.severity in ("critical", "high") for r in self.trigger_results)

    def get_action_summary(self) -> str:
        """Get a human-readable summary of all trigger results."""
        active = [r for r in self.trigger_results if r.severity != "none"]
        if not active:
            return "No re-evaluation triggers active. Framework is stable."

        lines = [f"Re-evaluation triggers detected ({len(active)} active):"]
        for r in active:
            lines.append(f"  [{r.severity.upper()}] {r.trigger_type.value}: {r.recommendation} — {r.details}")
        return "\n".join(lines)
```

### Pattern 3: Framework Technical Debt Ledger

Tracks framework-related technical debt across the lifecycle, including coupling costs, migration complexity estimates, and version upgrade impact assessments.

```python
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Optional


class DebtCategory(Enum):
    """Categories of framework-related technical debt."""
    COUPLING = "coupling"
    MIGRATION_COMPLEXITY = "migration_complexity"
    VERSION_UPGRADE_IMPACT = "version_upgrade_impact"
    DEPENDENCY_DECAY = "dependency_decay"
    LEARNING_CURVE = "learning_curve"


class DebtSeverity(Enum):
    """Severity levels for framework technical debt."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class LedgerEntry:
    """A single entry in the framework technical debt ledger.

    Represents a specific source of technical debt related to the framework choice,
    with quantified cost estimates and an expected decay/interest rate.
    """
    id: str
    category: DebtCategory
    description: str
    severity: DebtSeverity
    estimated_effort_hours: float  # hours to resolve or mitigate
    annual_interest_hours: float   # hours of friction accumulated per year
    first_reported: datetime
    resolved: bool = False
    resolved_at: Optional[datetime] = None

    @property
    def total_accumulated_hours(self) -> float:
        """Calculate total debt including interest accrued to date."""
        age_years = (datetime.utcnow() - self.first_reported).days / 365.0
        return self.estimated_effort_hours + (self.annual_interest_hours * age_years)


class FrameworkTechnicalDebtLedger:
    """Tracks framework-related technical debt across the lifecycle.

    Maintains a ledger of all identified framework technical debt items,
    calculates accumulated interest over time, and provides analysis on
    migration complexity and upgrade impact.

    This ledger helps answer: "How much is our framework choice costing us per year?"
    and "What would migration cost if triggered by an emergency vs. planned move?"

    Usage:
        ledger = FrameworkTechnicalDebtLedger("react-18-frontend")
        ledger.add_entry(
            category=DebtCategory.COUPLING,
            description="Component tree tightly coupled to framework render lifecycle",
            severity=DebtSeverity.HIGH,
            effort_hours=120,
            annual_interest=40,
        )
        analysis = ledger.analyze_migration_readiness()
    """

    def __init__(self, framework_id: str) -> None:
        self.framework_id = framework_id
        self.entries: list[LedgerEntry] = []
        self._next_id = 0

    def add_entry(self, category: DebtCategory, description: str,
                  severity: DebtSeverity, effort_hours: float,
                  annual_interest_hours: float) -> LedgerEntry:
        """Record a new technical debt item in the ledger.

        Args:
            category: The type of framework-related debt being tracked.
            description: Human-readable explanation of the debt.
            severity: How urgent this debt is to address.
            effort_hours: Estimated hours to resolve the root cause.
            annual_interest_hours: Hours of friction accumulated per year from this debt.

        Returns:
            The created LedgerEntry with assigned ID.
        """
        self._next_id += 1
        entry = LedgerEntry(
            id=f"{self.framework_id}-DEBT-{self._next_id:03d}",
            category=category,
            description=description,
            severity=severity,
            estimated_effort_hours=effort_hours,
            annual_interest_hours=annual_interest_hours,
            first_reported=datetime.utcnow(),
        )
        self.entries.append(entry)
        return entry

    def resolve_entry(self, entry_id: str) -> bool:
        """Mark a ledger entry as resolved at the current time."""
        for entry in self.entries:
            if entry.id == entry_id and not entry.resolved:
                entry.resolved = True
                entry.resolved_at = datetime.utcnow()
                return True
        return False

    def analyze_migration_readiness(self) -> dict:
        """Assess overall migration readiness based on accumulated technical debt.

        Returns a readiness profile including total debt, severity distribution,
        and a migration cost estimate under two scenarios: emergency (no planning)
        vs. planned migration with full preparation.
        """
        unresolved = [e for e in self.entries if not e.resolved]
        resolved = [e for e in self.entries if e.resolved]

        total_debt_hours = sum(e.total_accumulated_hours for e in unresolved)
        annual_friction = sum(e.annual_interest_hours for e in unresolved)
        resolution_cost = sum(e.estimated_effort_hours for e in unresolved)

        # Emergency migration: 1.8× effort due to no planning, unknown edge cases
        emergency_migration_cost = resolution_cost * 1.8

        # Planned migration: base cost + documentation prep (0.3×) + testing (0.4×)
        planned_migration_cost = resolution_cost * 1.7

        severity_distribution = {}
        for e in unresolved:
            key = e.severity.value
            severity_distribution[key] = severity_distribution.get(key, 0) + e.total_accumulated_hours

        # Readiness score: 100 (all resolved) to 0 (everything critical and unresolved)
        if not self.entries:
            readiness_score = 100
        else:
            total_possible = len(self.entries)
            resolved_ratio = len(resolved) / total_possible
            critical_weight = severity_distribution.get("critical", 0) / max(total_debt_hours, 1)
            readiness_score = round((resolved_ratio * 60) + ((1 - critical_weight) * 40))

        return {
            "framework_id": self.framework_id,
            "total_entries": len(self.entries),
            "unresolved_count": len(unresolved),
            "resolved_count": len(resolved),
            "total_debt_hours": round(total_debt_hours, 1),
            "annual_friction_hours": round(annual_friction, 1),
            "resolution_cost_hours": round(resolution_cost, 1),
            "emergency_migration_estimate_hours": round(emergency_migration_cost, 1),
            "planned_migration_estimate_hours": round(planned_migration_cost, 1),
            "severity_distribution": severity_distribution,
            "readiness_score": readiness_score,  # 0-100, higher is better
        }

    def analyze_upgrade_impact(self, target_version: str) -> dict:
        """Assess the impact of upgrading to a new framework version.

        Evaluates which debt items would be resolved by the upgrade and
        which might be introduced. This helps compare upgrade cost vs. migration cost.

        Args:
            target_version: The framework version being considered for upgrade.

        Returns:
            Impact analysis with resolved/debt items, estimated effort,
            and a recommendation on whether to upgrade or plan migration.
        """
        # Simulate which debt would be reduced by the upgrade
        resolved_by_upgrade = []
        new_debt_introduced = []

        for entry in self.entries:
            if not entry.resolved:
                # Heuristic: version upgrade resolves dependency decay and some coupling
                if entry.category in (DebtCategory.DEPENDENCY_DECAY, DebtCategory.VERSION_UPGRADE_IMPACT):
                    resolved_by_upgrade.append(entry)
                elif entry.category == DebtCategory.COUPLING:
                    # Upgrades may break tightly-coupled code
                    new_debt_introduced.append(entry)

        upgrade_effort = len(new_debt_introduced) * 8.0  # estimate: 8 hours per affected area
        debt_resolved_hours = sum(e.total_accumulated_hours for e in resolved_by_upgrade)
        net_benefit = debt_resolved_hours - upgrade_effort

        if net_benefit > 50:
            recommendation = "upgrade"
        elif net_benefit < -30:
            recommendation = "plan_migration"
        else:
            recommendation = "defer"

        return {
            "target_version": target_version,
            "debt_items_resolved": [e.id for e in resolved_by_upgrade],
            "new_debt_risks": [e.id for e in new_debt_introduced],
            "upgrade_effort_hours": round(upgrade_effort, 1),
            "debt_reduced_hours": round(debt_resolved_hours, 1),
            "net_benefit_hours": round(net_benefit, 1),
            "recommendation": recommendation,
        }
```

---

## Constraints

### MUST DO

- Apply the **5 Laws of Elegant Defense** from the `code-philosophy` skill to framework decisions: design for early exit (fail fast when requirements aren't met), parse don't validate (gather evidence at boundaries before committing), ensure atomic predictability (each evaluation criterion should be independently measurable), fail fast on invalid states (reject candidates that don't meet Must-haves immediately), and prioritize intentional naming (document decisions with clear, unambiguous language).
- Document every phase-gate decision in an Architecture Decision Record (ADR) following the [Michael Nygard ADR template](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions), including context, decision, consequences, and status.
- Use evidence-based scoring for all evaluation criteria — cite at least one concrete data source per score (benchmark URL, documentation link, Stack Overflow metric). Never assign scores based solely on opinion or preference.
- Maintain a minimum of 2 candidates through the evaluation process. Do not shortlist to a single framework before completing the weighted matrix analysis.
- Build a validation spike that exercises at least one end-to-end user journey before proceeding to production integration. The spike must test failure modes, not just happy paths.
- Establish re-evaluation triggers with concrete thresholds before the framework enters production. Vague commitments like "we'll re-evaluate in a year" are insufficient — tie triggers to measurable events (CVE CVSS scores, p95 latency benchmarks, team growth multipliers).

### MUST NOT DO

- Do not let personal preference or recency bias influence candidate selection. If a framework was recently discussed at a conference or by a senior engineer, that is not sufficient evidence for inclusion or exclusion.
- Do not skip the gate decision step under any circumstances. Even for greenfield projects with small teams, a formal evaluation provides baseline metrics for future re-evaluation.
- Do not proceed to production integration without completing the validation spike and recording its results. A framework that looks good in benchmarks but fails in a spike exercise reveals hidden integration costs.
- Do not use unweighted criteria in the evaluation matrix. Every criterion must have an assigned weight, and weights must sum to exactly 1.0. Unweighted scoring creates false equivalence between critical and minor requirements.
- Do not treat the framework decision as irreversible. Always plan for rollback or migration by maintaining a technical debt ledger and estimating migration complexity during the selection phase.
- Do not assign re-evaluation ownership to "the team" without designating a specific responsible person. Vague ownership leads to neglected triggers and accumulated technology debt.

---

## Output Template

When this skill is active, your output must contain these sections:

1. **Requirements Summary** — Categorized requirements list with MoSCoW priorities (Must/Should/Could/Won't) for each of the four requirement categories: functional, non-functional, operational, compliance.

2. **Evaluation Matrix** — A table showing all evaluation criteria, their weights (summing to 1.0), and scores for each candidate framework with evidence citations. Include weighted score calculation and ranked results.

3. **Gate Decision Record** — The formal gate outcome (Green/Conditional/Red) with supporting rationale, stakeholder consensus summary, and any conditional approval items with deadlines and owners.

4. **Integration Plan Summary** — Key integration strategy decisions: DI topology approach, configuration strategy, extension point design, and testing plan with specific coverage targets.

5. **Spike Results** — Validation spike findings including what was tested, performance results against thresholds, failure modes discovered, and pass/fail status against success criteria.

6. **Re-evaluation Plan** — Defined re-evaluation cadence, specific trigger conditions with threshold values, responsible persons, rollback readiness checklist items, and documentation storage location reference.

---

## Related Skills

| Skill | Purpose |
|---|---|
| `framework-selection` | Provides the detailed candidate selection methodology used within Step 4 (Evaluation Matrix) of this lifecycle |
| `framework-requirements` | Supplies structured requirements elicitation templates and MoSCoW prioritization techniques for Step 1 |
| `framework-utilization` | Covers operational patterns for using the selected framework — monitoring, debugging, and day-to-day development practices after integration |
| `architecture-decision-records` | Provides the ADR format and governance process required by this skill's documentation constraints |
| `technical-debt-management` | Complements this skill's debt ledger pattern with broader organization-level technical debt tracking and retirement strategies |
