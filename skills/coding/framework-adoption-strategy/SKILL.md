---
name: framework-adoption-strategy
description: Orchestrates structured framework adoption through phased rollout planning,
  migration strategies, acceptance criteria definition, rollback procedures, and success
  metrics to ensure teams transition smoothly from selection to production utilization.
license: MIT
compatibility: opencode
metadata:
version: "1.0.0"
  domain: coding
  triggers: framework adoption strategy, phased rollout, framework migration plan,
    how do i adopt a new framework in production, framework transition planning, rollback
    strategy, acceptance criteria, framework success metrics
  archetypes:
  - tactical
  - generation
  anti_triggers:
  - brainstorming
  - vague ideation
  - code golf
  - over-engineering
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  role: implementation
  scope: implementation
  output-format: code
  content-types:
  - code
  - guidance
  - examples
  - do-dont
  related-skills: framework-selection, framework-utilization, framework-requirements,
    version-migration
---
# Framework Adoption Strategy

Orchestrates structured framework adoption through phased rollout planning, migration strategies, acceptance criteria definition, rollback procedures, and success metrics. This skill ensures teams transition smoothly from the point of selecting a framework to successfully utilizing it in production — covering the critical gap where most adoptions fail.

## TL;DR Checklist

- [ ] Define explicit acceptance criteria for each phase (canary → limited rollout → full adoption) with measurable thresholds
- [ ] Build a phased migration plan: parallel run → strangler pattern → decommission old framework
- [ ] Create rollback procedures with specific trigger conditions and estimated recovery time per phase
- [ ] Assess team readiness using the utilization depth model before committing to each phase
- [ ] Establish success metrics: developer velocity, bug rates, performance indicators, and operational overhead
- [ ] Schedule review gates at each phase boundary — no automatic progression without explicit sign-off

---

## When to Use

Use this skill when:

- A framework has been selected but the team needs a concrete plan to adopt it in production
- Migrating from one framework to another (e.g., Express to FastAPI, React Class Components to Hooks)
- The organization is resistant to change and needs a low-risk adoption path with clear rollback options
- Multiple teams share a codebase and need coordinated migration timelines to avoid breaking integrations
- A framework upgrade (major version) requires careful planning to minimize disruption
- Post-adoption monitoring shows the team is struggling — you need a re-evaluation of the adoption plan

## When NOT to Use

Avoid this skill for:

- **Greenfield projects starting fresh** — use `framework-requirements` instead; there is no migration path to plan
- **Single-file changes or small patches** — the overhead of a structured adoption strategy outweighs benefits for minor framework tweaks
- **Emergency framework replacements due to security vulnerabilities** — use immediate mitigation strategies; phased adoption can wait until after stabilization

---

## Core Workflow

### Step 1: Define Adoption Readiness Criteria

Before any adoption begins, assess whether the organization is actually ready. Rushing adoption without readiness guarantees friction, resistance, and ultimately failure.

**Team Readiness Assessment:**

```python
from dataclasses import dataclass, field
from enum import Enum


class ReadinessLevel(Enum):
    NOT_READY = "not_ready"      # Needs more training; adoption should be delayed
    PARTIALLY_READY = "partial"  # Proceed with caution; allocate extra training time
    READY = "ready"              # Proceed with standard adoption timeline
    VERY_READY = "very_ready"    # Accelerate; team can handle aggressive timeline


@dataclass
class ReadinessAssessment:
    """Structured assessment of team readiness for framework adoption."""
    technical_skill_alignment: int       # 1-5: current skills match framework needs
    learning_capacity_available: int     # 1-5: % of sprint capacity available for training
    stakeholder_support: int             # 1-5: leadership buy-in and resource commitment
    legacy_framework_maintenance_load: int  # 1-5: how hard is it to keep old framework running
    migration_scope_complexity: int      # 1-5: estimated effort (reversed — 5 = easiest)

    @property
    def overall_score(self) -> float:
        return sum([
            self.technical_skill_alignment,
            self.learning_capacity_available,
            self.stakeholder_support,
            max(0, 6 - self.migration_scope_complexity),  # Invert complexity
        ]) / 4.0

    def level(self) -> ReadinessLevel:
        score = self.overall_score
        if score < 2.5:
            return ReadinessLevel.NOT_READY
        elif score < 3.5:
            return ReadinessLevel.PARTIALLY_READY
        elif score < 4.5:
            return ReadinessLevel.READY
        else:
            return ReadinessLevel.VERY_READY

    def recommendations(self) -> list[str]:
        recs = []
        if self.technical_skill_alignment <= 2:
            recs.append("Spend 2-4 weeks on pair-programming sessions with framework-experienced developers")
        if self.learning_capacity_available <= 2:
            recs.append("Negotiate dedicated training sprint before starting migration; adoption needs 15% of sprint capacity")
        if self.stakeholder_support <= 2:
            recs.append("Present business case with risk assessment to secure leadership commitment")
        if self.migration_scope_complexity >= 4:
            recs.append("Break migration into per-module waves rather than big-bang approach")
        if not recs:
            recs.append("Standard adoption timeline is appropriate; proceed with phased rollout")
        return recs


def assess_team_readiness(
    team_name: str,
    current_framework: str,
    target_framework: str,
) -> ReadinessAssessment:
    """Generate a readiness assessment for a specific adoption scenario.
    
    In practice, fill in the scores based on team interviews and code analysis.
    This example shows the structure; replace values with real data.
    """
    return ReadinessAssessment(
        technical_skill_alignment=3,    # e.g., 60% of team knows Python, but not FastAPI
        learning_capacity_available=3,  # e.g., ~15% sprint capacity available for training
        stakeholder_support=4,          # e.g., engineering leadership supports the migration
        migration_scope_complexity=3,   # e.g., moderate — multiple services need migration
    )
```

**Checkpoint:** If overall readiness score is below 2.5 (NOT_READY), do NOT proceed with adoption until remediation actions are completed. Document what must change before the next readiness assessment.

### Step 2: Design the Phased Rollout Plan

Structure the adoption into distinct phases, each with explicit entry/exit criteria. This prevents both "big bang" failures and endless evaluation paralysis.

**Standard Three-Phase Adoption Model:**

| Phase | Scope | Duration | Goal | Rollback Complexity |
|---|---|---|---|---|
| **Phase 1: Canary** | Single non-critical service or module | 2-4 weeks | Validate technical fit with real production data | Trivial — stop routing to new code |
| **Phase 2: Limited Rollout** | One business domain or team-owned feature set | 4-8 weeks | Validate developer experience and operational fit | Moderate — need migration script rollback |
| **Phase 3: Full Adoption** | Entire codebase / all services | 8-16 weeks | Complete decommission of legacy framework | High — full system reversion required |

```python
from dataclasses import dataclass, field
from datetime import date, timedelta


@dataclass
class AdoptionPhase:
    """One phase of a phased framework adoption plan."""
    name: str                          # e.g., "Canary", "Limited Rollout", "Full Adoption"
    scope_description: str             # What is included in this phase's scope
    target_start_date: date            # When this phase begins
    estimated_duration_weeks: int      # Expected timeline
    entry_criteria: list[str]          # Must all be true to begin this phase
    exit_criteria: list[str]           # Must all be met to proceed to next phase
    rollback_trigger_conditions: list[str]  # Specific conditions that trigger rollback
    estimated_rollback_time_hours: int  # How long a full rollback takes
    success_metrics: dict              # {metric_name: target_value} for this phase

    def summary(self) -> str:
        return (
            f"Phase: {self.name}\n"
            f"Scope: {self.scope_description}\n"
            f"Timeline: {self.estimated_duration_weeks} weeks "
            f"(starting {self.target_start_date.isoformat()})\n"
            f"Exit Criteria:\n" + "\n".join(f"  - {c}" for c in self.exit_criteria) + "\n"
            f"Rollback Triggers: {', '.join(self.rollback_trigger_conditions)}"
        )


@dataclass
class AdoptionPlan:
    """Complete phased adoption plan for a framework transition."""
    project_name: str
    current_framework: str
    target_framework: str
    phases: list[AdoptionPhase] = field(default_factory=list)
    overall_review_date: date | None = None

    def add_phase(self, phase: AdoptionPhase) -> "AdoptionPlan":
        self.phases.append(phase)
        return self

    def generate_timeline(self) -> str:
        """Generate a human-readable adoption timeline."""
        lines = [f"# Adoption Plan: {self.current_framework} → {self.target_framework}",
                  f"Project: {self.project_name}", ""]

        cumulative_weeks = 0
        for i, phase in enumerate(self.phases, 1):
            start_date = self.overall_review_date - timedelta(weeks=cumulative_weeks) if self.overall_review_date else None
            lines.append(f"## Phase {i}: {phase.name}")

            if start_date:
                end_date = start_date + timedelta(weeks=phase.estimated_duration_weeks)
                lines.append(f"**Timeline:** {start_date.isoformat()} → {end_date.isoformat()}")

            lines.append(f"**Scope:** {phase.scope_description}")
            lines.append("")
            lines.append("Entry Criteria:")
            for criterion in phase.entry_criteria:
                lines.append(f"- [ ] {criterion}")
            lines.append("")
            lines.append("Exit Criteria:")
            for criterion in phase.exit_criteria:
                lines.append(f"- [ ] {criterion}")
            lines.append("")
            lines.append(f"Rollback Triggers:")
            for trigger in phase.rollback_trigger_conditions:
                lines.append(f"  ⚠️ {trigger}")
            lines.append(f"Estimated Rollback Time: {phase.estimated_rollback_time_hours}h")

            cumulative_weeks += phase.estimated_duration_weeks
            lines.append("")

        return "\n".join(lines)


# --- Example adoption plan ---
if __name__ == "__main__":
    review_date = date(2026, 9, 1)  # Full adoption target

    plan = AdoptionPlan(
        project_name="Customer API Platform",
        current_framework="Flask",
        target_framework="FastAPI",
        overall_review_date=review_date,
    )

    canary_phase = AdoptionPhase(
        name="Canary — Notification Service",
        scope_description="Rewrite the notification service (single service, non-critical path) in FastAPI while keeping it parallel to the Flask version behind the API gateway",
        target_start_date=review_date - timedelta(weeks=20),  # ~5 months before full adoption
        estimated_duration_weeks=4,
        entry_criteria=[
            "Framework selection decision documented with ADR-2026-014",
            "Team completes Pass 1-2 of three-pass learning model for FastAPI",
            "Production deployment pipeline configured and tested",
            "Rollback procedure documented and validated",
        ],
        exit_criteria=[
            "Notification service handles 100% of production traffic in canary mode",
            "P95 latency matches or improves on Flask baseline (< 80ms)",
            "Zero critical bugs logged after 7 days of production operation",
            "Team reports positive developer experience (survey score ≥ 3/5)",
        ],
        rollback_trigger_conditions=[
            "P95 latency degrades >20% compared to Flask baseline for 48h sustained",
            "More than 3 P1/P2 incidents in first 7 days of production operation",
            "Memory usage exceeds container limits causing OOM kills",
        ],
        estimated_rollback_time_hours=4,
        success_metrics={
            "p95_latency_ms": "< 80",
            "error_rate_percent": "< 0.1",
            "developer_satisfaction_score": ">= 3/5",
        },
    )

    limited_phase = AdoptionPhase(
        name="Limited Rollout — Auth and User Management Domain",
        scope_description="Migrate authentication, user management, and profile services to FastAPI using strangler fig pattern; both Flask and FastAPI serve traffic behind API gateway with routing rules",
        target_start_date=review_date - timedelta(weeks=12),
        estimated_duration_weeks=6,
        entry_criteria=[
            "Canary phase exit criteria fully met",
            "Migration scripts validated against production-like database",
            "Team completes Pass 3 of three-pass learning model (constraint challenge)",
            "Monitoring dashboards configured for new framework metrics",
        ],
        exit_criteria=[
            "All services in the user domain running on FastAPI with zero Flask instances",
            "Migration scripts tested and verified (can migrate or roll back within SLA)",
            "Operational runbooks updated and reviewed by SRE team",
            "Developer velocity within 10% of pre-adoption baseline",
        ],
        rollback_trigger_conditions=[
            "Authentication failure rate exceeds 1% for any sustained 24h period",
            "Database migration corruption detected in more than one environment",
            "Security audit reveals new vulnerability class introduced by migration",
        ],
        estimated_rollback_time_hours=16,
        success_metrics={
            "p95_latency_ms": "< 70",
            "migration_script_success_rate_percent": ">= 99.9",
            "developer_velocity_ratio": ">= 0.9",
        },
    )

    plan.add_phase(canary_phase).add_phase(limited_phase)
    print(plan.generate_timeline())
```

**Checkpoint:** Every phase must have at least 3 exit criteria and at least 2 rollback trigger conditions. A phase without both is an unmanaged risk.

### Step 3: Build Migration Strategies Per Pattern

Different codebases need different migration approaches. The strangler fig pattern works for large monoliths; feature flags work for targeted migrations; dual-run patterns work when zero downtime is critical.

**Migration Strategy Selection Matrix:**

```python
def recommend_migration_strategy(
    architecture_type: str,       # "monolith", "microservices", "serverless", "hybrid"
    team_size: int,               # Number of engineers on the migration
    max_downtime_minutes: float,  # Maximum acceptable downtime for any single operation
    legacy_dependency_count: int, # Number of external systems that depend on current framework
) -> dict:
    """Recommend a migration strategy based on project characteristics.
    
    Returns strategy name, description, risk level, and recommended steps.
    """
    strategies = {
        "strangler_fig": {
            "best_for": "Monoliths with well-defined bounded contexts",
            "risk_level": "LOW",
            "downtime_required": 0,
            "steps": [
                "Identify a single bounded context with minimal external dependencies",
                "Build the new service/module alongside the existing one using API gateway routing",
                "Gradually move traffic from old to new via gateway rules (start at 5%, then 25%, 50%, 90%)",
                "Retire old code once all traffic has migrated",
            ],
        },
        "feature_flags": {
            "best_for": "Feature-rich applications with granular feature boundaries",
            "risk_level": "LOW-MODERATE",
            "downtime_required": 0,
            "steps": [
                "Deploy the new framework alongside the existing one in the same process",
                "Use feature flags to selectively route requests to new framework implementation",
                "Gradually enable flags for more users as confidence grows",
                "Remove feature flag code after full migration and verify no regression",
            ],
        },
        "dual_run": {
            "best_for": "High-availability systems where zero downtime is non-negotiable",
            "risk_level": "MODERATE",
            "downtime_required": 0,
            "steps": [
                "Run both frameworks in parallel processing identical requests",
                "Compare outputs continuously; flag discrepancies for investigation",
                "Once dual-run achieves >99.9% match rate, switch traffic to new framework",
                "Keep old framework as read-only fallback for 30 days after cutover",
            ],
        },
        "big_bang": {
            "best_for": "Small systems, internal tools, or when legacy has critical security issues",
            "risk_level": "HIGH",
            "downtime_required": 60,
            "steps": [
                "Freeze all changes to the existing framework",
                "Execute migration script in maintenance window",
                "Run full test suite against migrated code",
                "Deploy and monitor for 24h post-deployment",
            ],
        },
    }

    # Strategy recommendation logic
    if architecture_type == "monolith" and max_downtime_minutes == 0:
        return strategies["strangler_fig"]
    elif team_size <= 3 and max_downtime_minutes > 30:
        return strategies["big_bang"]
    elif legacy_dependency_count >= 5:
        return strategies["dual_run"]
    else:
        return strategies["feature_flags"]


# --- Example usage ---
if __name__ == "__main__":
    strategy = recommend_migration_strategy(
        architecture_type="monolith",
        team_size=8,
        max_downtime_minutes=0,  # Zero downtime required
        legacy_dependency_count=3,
    )

    print(f"Recommended: {strategy['best_for']}")
    print(f"Risk Level: {strategy['risk_level']}")
    print("Steps:")
    for step in strategy["steps"]:
        print(f"  - {step}")
```

**Checkpoint:** Select the migration strategy that matches your constraints. Do NOT use "big bang" if you have more than one external system depending on the current framework — the risk is unacceptable without explicit executive sign-off.

### Step 4: Define Acceptance Criteria and Success Metrics

Each phase must have quantifiable success criteria. Subjective assessments like "it feels better" are not acceptance criteria. Every metric must be measurable from your monitoring stack.

**Acceptance Criteria Framework:**

```python
from dataclasses import dataclass, field


@dataclass
class AcceptanceCriterion:
    """A single measurable acceptance criterion for a framework adoption phase."""
    name: str                       # e.g., "P95 latency improvement"
    category: str                   # "performance", "reliability", "developer_experience", "operational"
    measurement_method: str         # How to measure (e.g., "Datadog dashboard", "error tracking system")
    target_value: str               # e.g., "< 80ms", ">= 3/5", "zero critical CVEs"
    measurement_period: str         # e.g., "last 7 days of canary phase"
    failure_consequence: str        # What happens if this criterion is not met

    def to_checklist_item(self) -> str:
        return f"- [ ] {self.name}: Target [{self.target_value}] via {self.measurement_method}"


def build_acceptance_criteria(
    phase_name: str,
    framework_type: str = "web_backend",
) -> list[AcceptanceCriterion]:
    """Generate a standardized set of acceptance criteria for a given adoption phase."""

    base_criteria = [
        AcceptanceCriterion(
            name=f"{phase_name} — Performance baseline met",
            category="performance",
            measurement_method="APM tracing (Datadog/New Relic/Sentry)",
            target_value="< 80ms P95 for all endpoints",
            measurement_period="Last 7 days of canary phase with production traffic",
            failure_consequence="Rollback to legacy framework; investigate performance regression",
        ),
        AcceptanceCriterion(
            name=f"{phase_name} — Error rate within SLA",
            category="reliability",
            measurement_method="Error tracking (Sentry/LogRocket)",
            target_value="< 0.1% error rate for HTTP 5xx responses",
            measurement_period="Continuous during phase operation",
            failure_consequence="Immediate rollback if sustained >48 hours; investigate root cause",
        ),
        AcceptanceCriterion(
            name=f"{phase_name} — Developer experience positive",
            category="developer_experience",
            measurement_method="Team survey (5-point Likert scale)",
            target_value=">= 3.0 average across all respondents",
            measurement_period="End of phase survey administered to all participating developers",
            failure_consequence="Pause adoption; conduct retrospective to identify friction points",
        ),
        AcceptanceCriterion(
            name=f"{phase_name} — No new security vulnerabilities introduced",
            category="security",
            measurement_method="Automated dependency scanning (npm audit/pip-audit)",
            target_value="Zero critical or high CVEs in all framework dependencies",
            measurement_period="Scan run at phase start and end; any finding triggers review",
            failure_consequence="Block migration until vulnerability is resolved or risk accepted by security team",
        ),
    ]

    return base_criteria


# --- Example: Full acceptance criteria set ---
if __name__ == "__main__":
    criteria = build_acceptance_criteria("Canary — Notification Service")
    print(f"Acceptance Criteria ({len(criteria)} items):\n")
    for c in criteria:
        print(c.to_checklist_item())
        print(f"  → {c.failure_consequence}\n")
```

**Checkpoint:** Every phase must have acceptance criteria across at least three categories (performance, reliability, developer_experience). A phase that only measures performance is incomplete.

### Step 5: Create Rollback Procedures

Rollback procedures are not optional. Every adoption plan must include specific rollback triggers and documented recovery steps with estimated recovery times. A team that cannot roll back quickly will make riskier decisions in production.

**Rollback Procedure Template:**

```python
from dataclasses import dataclass


@dataclass
class RollbackProcedure:
    """Documented procedure for rolling back a framework adoption phase."""
    trigger_condition: str           # Specific condition that triggers rollback
    estimated_recovery_minutes: int  # How long the full rollback takes
    manual_steps: list[str]          # Step-by-step recovery actions
    automation_script_path: str | None = None  # Path to automated rollback script (if available)
    post_rollback_verification: list[str] = field(default_factory=list)

    def execute_summary(self) -> str:
        steps_text = "\n".join(f"  {i+1}. {step}" for i, step in enumerate(self.manual_steps))
        return (
            f"TRIGGER: {self.trigger_condition}\n"
            f"ESTIMATED RECOVERY: {self.estimated_recovery_minutes} minutes\n"
            f"AUTO-ROLLBACK SCRIPT: {'Yes' if self.automation_script_path else 'No — manual only'}\n\n"
            f"STEPS:\n{steps_text}\n\n"
            + ("VERIFICATION AFTER ROLLBACK:\n" + "\n".join(
                f"  ✓ {v}" for v in self.post_rollback_verification
            ) if self.post_rollback_verification else "")
        )


# --- Example: Canary phase rollback procedure ---
if __name__ == "__main__":
    canary_rollback = RollbackProcedure(
        trigger_condition="P95 latency degrades >20% compared to Flask baseline for 48h sustained",
        estimated_recovery_minutes=15,
        automation_script_path="./scripts/rollback-canary.sh",
        manual_steps=[
            "Stop all traffic routing to FastAPI canary service (update API gateway rules)",
            "Verify all requests are served by the existing Flask service",
            "Scale down FastAPI canary containers to zero replicas",
            "Run health check endpoint on Flask service to confirm full operation",
            "Archive canary deployment logs for post-mortem analysis",
        ],
        post_rollback_verification=[
            "API gateway shows 100% of traffic routed to Flask backend",
            "P95 latency returns to pre-canary baseline values",
            "Error rate drops below 0.1%",
            "All monitoring dashboards confirm stable operation",
        ],
    )

    print(canary_rollback.execute_summary())
```

**Checkpoint:** Every phase must have at least one automated rollback path where possible. Manual-only rollbacks above 60 minutes require executive sign-off and should be treated as a high-risk design decision.

### Step 6: Establish Post-Adoption Monitoring and Review Cadence

After adoption, track metrics to validate success and identify emerging issues. The review cadence should decrease over time but never stop completely — framework health is an ongoing concern.

**Monitoring Dashboard Requirements:**

```python
@dataclass
class AdoptionMetricsDashboard:
    """Defines the monitoring dashboard for tracking framework adoption health."""

    performance_metrics: list[dict] = field(default_factory=lambda: [
        {"name": "p95_latency", "description": "95th percentile response time per endpoint",
         "source": "APM tracing (Datadog)", "alert_threshold": "> 100ms sustained >15min"},
        {"name": "error_rate_5xx", "description": "Percentage of HTTP 500 responses",
         "source": "Error tracking (Sentry)", "alert_threshold": "> 0.5% sustained >5min"},
        {"name": "memory_usage_rss", "description": "Resident set size per process",
         "source": "Container metrics (Prometheus)", "alert_threshold": "> 512MB"},
    ])

    developer_metrics: list[dict] = field(default_factory=lambda: [
        {"name": "velocity_ratio", "description": "Story points completed / pre-adoption baseline",
         "source": "Jira/GitHub Projects", "alert_threshold": "< 0.8 for two consecutive sprints"},
        {"name": "framework_support_tickets", "description": "Number of framework-related help requests",
         "source": "Slack #framework-help channel", "alert_threshold": "> 5 per week trending upward"},
        {"name": "developer_survey_score", "description": "Quarterly framework satisfaction survey (1-5)",
         "source": "Team feedback form", "alert_threshold": "< 3.0 average"},
    ])

    operational_metrics: list[dict] = field(default_factory=lambda: [
        {"name": "deployment_frequency", "description": "Number of deployments per week",
         "source": "CI/CD pipeline logs", "alert_threshold": "> 30% decrease from baseline"},
        {"name": "mean_time_to_recovery", "description": "Average time to resolve framework-related incidents",
         "source": "Incident management (PagerDuty)", "alert_threshold": "> 2x pre-adoption MTTR"},
    ])

    def generate_dashboard_spec(self) -> str:
        """Generate a structured dashboard specification for implementation."""
        sections = ["# Framework Adoption Monitoring Dashboard\n"]
        section_descriptions = {
            "performance_metrics": "## Performance Health",
            "developer_metrics": "## Developer Experience",
            "operational_metrics": "## Operational Health",
        }

        for metric_key, section_title in section_descriptions.items():
            sections.append(section_title)
            sections.append("")
            sections.append("| Metric | Description | Source | Alert Threshold |")
            sections.append("|--------|-------------|--------|-----------------|")

            for m in getattr(self, metric_key, []):
                sections.append(
                    f"| {m['name']} | {m['description']} | {m['source']} | {m['alert_threshold']} |"
                )
            sections.append("")

        return "\n".join(sections)


# --- Example usage ---
if __name__ == "__main__":
    dashboard = AdoptionMetricsDashboard()
    print(dashboard.generate_dashboard_spec())
```

**Review Cadence Schedule:**

| Time After Adoption Start | Review Type | Participants | Focus Area |
|---|---|---|---|
| Week 2 (during canary) | Daily standup check | Engineering lead, on-call engineer | Immediate blockers and error spikes |
| Week 4 (canary end) | Phase gate review | Full team + stakeholders | Exit criteria assessment |
| Month 2 (limited rollout) | Bi-weekly retro | Development team | Developer experience friction points |
| Month 3 (full adoption) | Formal milestone review | Leadership + engineering managers | Strategic alignment and ROI validation |
| Month 6 | Success metrics audit | Engineering + product + ops | Long-term viability and optimization opportunities |
| Every quarter ongoing | Health check | Engineering lead | Framework version updates, security posture, performance trends |

---

## Implementation Patterns

### Pattern 1: Phased Rollout Automation Script

Automates the traffic splitting logic used in strangler fig migration patterns. Integrates with API gateway configurations (using Terraform or similar).

```python
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class CanaryConfig:
    """Traffic splitting configuration for a canary deployment."""
    service_name: str
    current_version_weight: int   # Percentage of traffic to old version (0-100)
    canary_version_weight: int    # Percentage of traffic to new version (0-100)

    def validate(self) -> bool:
        return self.current_version_weight + self.canary_version_weight == 100


@dataclass
class RolloutStep:
    """One step in a canary rollout progression."""
    name: str
    canary_weight: int            # Target canary traffic percentage
    minimum_stabilization_hours: int  # Minimum time at this weight before advancing
    required_metrics: dict        # Metric thresholds that must be met to continue


def generate_rollout_plan(
    service_name: str,
    initial_canary_weight: int = 5,
    max_canary_weight: int = 90,
    step_increment: int = 15,
) -> list[RolloutStep]:
    """Generate a structured rollout plan with traffic weights and stabilization requirements."""

    steps = []
    current = initial_canary_weight
    step_num = 1

    while current <= max_canary_weight:
        # Stabilization time increases as canary weight grows (more risk at higher weights)
        stability_hours = 24 if current <= 30 else 72 if current <= 60 else 120

        steps.append(RolloutStep(
            name=f"Canary {step_num} — {current}% traffic to new framework",
            canary_weight=current,
            minimum_stabilization_hours=stability_hours,
            required_metrics={
                "error_rate_5xx": "< 0.1%",
                "p95_latency_delta": "< 5% change from baseline",
                "memory_rss_change": "< 10% increase from baseline",
                "cpu_usage_delta": "< 5% change from baseline",
            },
        ))

        current = min(current + step_increment, max_canary_weight)
        step_num += 1

    return steps


# --- Example rollout plan ---
if __name__ == "__main__":
    plan = generate_rollout_plan(
        service_name="notification-service",
        initial_canary_weight=5,
        max_canary_weight=90,
        step_increment=15,
    )

    print(f"Canary Rollout Plan for {plan[0].name.split('—')[0].strip()}:\n")
    for step in plan:
        print(f"[{step.name}]")
        print(f"  Stabilization: {step.minimum_stabilization_hours}h minimum at this weight")
        print(f"  Required metrics:")
        for metric, threshold in step.required_metrics.items():
            print(f"    - {metric}: must be {threshold}")
        print()
```

### Pattern 2: Adoption Risk Calculator

Quantifies the risk of proceeding with each phase of adoption. Helps teams make data-driven decisions about whether to advance or pause.

```python
from enum import Enum


class RiskLevel(Enum):
    LOW = "low"
    MODERATE = "moderate"
    HIGH = "high"
    CRITICAL = "critical"


def calculate_adoption_risk(
    team_readiness_score: float,      # 1-5 from readiness assessment
    phase_number: int,                # 1 = canary, 2 = limited, 3 = full
    legacy_dependency_count: int,     # External systems depending on old framework
    has_automated_rollback: bool,     # Whether rollback is automated
    team_has_framework_experience: bool,  # Has any team member used this framework before?
) -> tuple[RiskLevel, list[str]]:
    """Calculate the adoption risk for a given phase and provide mitigation suggestions.

    Args:
        team_readiness_score: 1-5 score from readiness assessment
        phase_number: Which phase we're in (1=canary, 2=limited, 3=full)
        legacy_dependency_count: Number of external systems on old framework
        has_automated_rollback: Whether rollback can be automated
        team_has_framework_experience: Any team member used target framework before?

    Returns:
        Tuple of (risk_level, list_of_mitigations).
    """
    risk_score = 0.0
    mitigations = []

    # Factor 1: Team readiness (major contributor)
    if team_readiness_score < 2.5:
        risk_score += 3.0
        mitigations.append("Complete additional training before proceeding; adoption cannot succeed without team readiness")
    elif team_readiness_score < 3.5:
        risk_score += 1.5
        mitigations.append("Assign framework-experienced mentor to each developer pair-programming sessions for 2 weeks")

    # Factor 2: Phase escalation risk
    if phase_number == 3 and legacy_dependency_count > 3:
        risk_score += 2.0
        mitigations.append("Reduce scope of full adoption phase — migrate systems in smaller waves rather than all-at-once")

    # Factor 3: Rollback capability
    if not has_automated_rollback:
        risk_score += 1.5
        mitigations.append("Build automated rollback script before entering this phase; manual-only rollback is a single point of failure")

    # Factor 4: Prior experience
    if not team_has_framework_experience:
        risk_score += 1.0
        mitigations.append("Engage external consultant for framework expertise during initial phases or hire contractor with relevant experience")

    # Determine risk level
    if risk_score >= 6.0:
        return RiskLevel.CRITICAL, mitigations + ["PAUSE: Do not proceed until mitigations are implemented"]
    elif risk_score >= 4.0:
        return RiskLevel.HIGH, mitigations
    elif risk_score >= 2.0:
        return RiskLevel.MODERATE, mitigations
    else:
        return RiskLevel.LOW, ["No significant risks identified; proceed with standard monitoring"]


# --- Example usage ---
if __name__ == "__main__":
    # Team of 8, moderate readiness, entering full adoption phase (3),
    # 4 legacy dependencies, manual rollback only, no prior experience
    risk_level, mitigations = calculate_adoption_risk(
        team_readiness_score=3.0,
        phase_number=3,
        legacy_dependency_count=4,
        has_automated_rollback=False,
        team_has_framework_experience=False,
    )

    print(f"Adoption Risk Level: {risk_level.value.upper()}")
    print("\nRequired Mitigations:")
    for i, m in enumerate(mitigations, 1):
        print(f"  {i}. {m}")
```

### Pattern 3: Migration Readiness Checklist Generator

Produces a per-phase checklist that the team uses as a go/no-go gate before proceeding.

```python
def generate_phase_gate_checklist(
    phase_name: str,
    entry_criteria: list[str],
    exit_criteria: list[str],
    rollback_triggers: list[str],
) -> str:
    """Generate a structured checklist for a phase gate review."""

    lines = [
        f"# Phase Gate Checklist: {phase_name}",
        "",
        "## Entry Gate (must pass all before starting phase)",
        ""]

    for criterion in entry_criteria:
        lines.append(f"- [ ] ENTRY: {criterion}")

    lines.extend([
        "",
        "## Exit Gate (must pass all before advancing to next phase)",
        ""])

    for criterion in exit_criteria:
        lines.append(f"- [ ] EXIT: {criterion}")

    lines.extend([
        "",
        "## Rollback Triggers (automated alerts + manual review)",
        ""])

    for trigger in rollback_triggers:
        lines.append(f"- ⚠️ ROLLBACK IF: {trigger}")

    lines.extend([
        "",
        "## Phase Gate Review",
        f"**Phase:** {phase_name}",
        "**Date:** [TBD]",
        "**Reviewers:** [Engineering Lead, Tech Lead, DevOps Representative]",
        "",
        "**Decision:** ☐ Advance  ☐ Continue  ☐ Rollback  ☐ Pause",
        "**Notes:** _________________",
    ])

    return "\n".join(lines)


# --- Example usage ---
if __name__ == "__main__":
    checklist = generate_phase_gate_checklist(
        phase_name="Limited Rollout — Auth and User Management Domain",
        entry_criteria=[
            "Canary phase exit criteria fully met with zero rollback events",
            "Migration scripts validated against production-like database copy",
        ],
        exit_criteria=[
            "All user-domain services running on FastAPI with zero Flask instances",
            "Developer velocity within 10% of pre-adoption baseline",
        ],
        rollback_triggers=[
            "Authentication failure rate exceeds 1% for any sustained 24h period",
            "Security audit reveals new vulnerability class introduced by migration",
        ],
    )
    print(checklist)
```

---

## Constraints

### MUST DO
- Define explicit acceptance criteria with measurable thresholds for every phase — never use subjective language like "performs well" or "feels stable"
- Create rollback procedures before entering any phase, including estimated recovery times and specific trigger conditions
- Assess team readiness using structured scoring before each phase gate review; do NOT assume readiness carries over from the previous phase
- Maintain a minimum two-phase rollout (canary + limited rollout) before proceeding to full adoption — no exceptions for teams that want to skip phases
- Establish post-adoption monitoring dashboards within the first sprint of each phase — you cannot manage what you cannot measure
- Document every rollback trigger condition with automated alerting where possible; manual-only triggers are a single point of failure

### MUST NOT DO
- Do NOT proceed to the next phase without completing all exit criteria — automatic progression is not an option; explicit sign-off is required
- Do NOT skip team readiness assessment because "we're confident" — unmeasured confidence is the #1 predictor of adoption failure
- Do NOT use a "big bang" migration for any system with more than two external dependencies on the legacy framework without executive risk acceptance documented in writing
- Do NOT define success metrics that can only be measured retrospectively after adoption is complete — metrics must be trackable during each phase
- Do NOT allow a team to work with the new framework in production until they have completed at least Pass 1 and Pass 2 of the three-pass learning model
- Do NOT deploy a migration script to production without first validating it against a production-equivalent test database

---

## Output Template

When this skill is active, produce:

1. **Readiness Assessment** — Structured readiness scores for team technical alignment, learning capacity, stakeholder support, and migration complexity with specific recommendations
2. **Phased Rollout Plan** — Timeline with explicit entry/exit criteria per phase, rollback triggers, estimated recovery times, and traffic splitting strategy (if using strangler fig)
3. **Migration Strategy Recommendation** — Recommended migration pattern with justification based on architecture type, team size, downtime tolerance, and dependency graph complexity
4. **Acceptance Criteria Matrix** — Per-phase acceptance criteria across at least 3 categories (performance, reliability, developer_experience) with measurement methods and failure consequences
5. **Rollback Procedures** — Step-by-step rollback documentation for each phase with trigger conditions, recovery time estimates, and automation script paths
6. **Risk Assessment Report** — Quantified risk score per phase with specific mitigation actions required before proceeding
7. **Monitoring Dashboard Specification** — Required metrics, alert thresholds, data sources, and review cadence for ongoing adoption health tracking

---

## Related Skills

| Skill | Purpose |
|---|---|
| `framework-selection` | Select the right framework before planning adoption — use this skill to make an informed choice first |
| `framework-utilization` | After successful adoption, use this skill to optimize team fluency and maximize framework value |
| `framework-requirements` | Scaffolds the initial project setup — complements this skill's rollout planning with concrete starting point |
| `version-migration` | Handles in-place version upgrades of an existing framework — different from adopting a new framework entirely |

---

## Live References

> Authoritative documentation and resources for framework adoption strategy.

- [Strangler Fig Pattern — Martin Fowler](https://martinfowler.com/bliki/StranglerFigApplication.html) — The canonical pattern for incremental system replacement
- [Amazon's Two-Way Door Decision Framework](https://www.amazon.jobs/en/principles/amazon-leadership-principles) — Type 1 (irreversible) vs Type 2 (reversible) decisions and appropriate evaluation intensity
- ["Accelerate" (DORA Research, 2024 Update)](https://itrevolution.com/book/accelerate-2nd-edition/) — High-performing teams allocate 15% of sprint capacity to technology adoption
- [Team Topologies (3rd Edition, 2024) — Cognitive Load and Framework Selection](https://teamtopologies.com/) — Framework complexity should align with team cognitive boundaries
- [The Phased Rollout Playbook — ThoughtWorks Engineering Blog (2025)](https://www.thoughtworks.com/insights) — Practical migration case studies from 2024-2025
- [Netflix's Deployment Best Practices](https://netflixtechblog.com/tagged/deployment) — Zero-downtime deployment strategies and canary release patterns used at scale
- [GitHub's Monorepo Migration Case Study (2025)](https://github.blog/engineering/architecture-platform/github-simplified-the-monorepo/) — Large-scale framework migration lessons learned

---

## Example: Complete Adoption Workflow in Practice

### Project Context

A mid-size e-commerce platform built on Express.js (Node.js) with 12 microservices, needing to adopt Next.js 15 for their storefront while keeping Express for backend APIs. The team has 8 developers, none with production Next.js experience.

### Readiness Assessment

```
Team Technical Skill Alignment:    2/5  (60% know Node.js but zero know Next.js App Router)
Learning Capacity Available:        3/5  (~15% sprint capacity negotiable for training)
Stakeholder Support:                4/5  (VP Engineering fully supports the migration)
Migration Scope Complexity:         4/5  (high — 12 services, multiple integrations)

Overall Score: 2.75 / 5.0 → NOT_READY
```

**Recommendation:** PAUSE adoption for 3 weeks. Assign 2 developers to complete a Next.js intensive workshop. Re-assess readiness after training completion.

### Phased Rollout Plan

```
Phase 1 (Canary): Rewrite the product catalog display service in Next.js ISR, 
running alongside Express behind API Gateway at 5% → 90% traffic split over 4 weeks.

Phase 2 (Limited Rollout): Migrate all storefront rendering to Next.js App Router, 
including checkout flow, user accounts, and search. Strangler fig pattern with 
Express serving only backend APIs going forward. 8-week migration window.

Phase 3 (Full Adoption): Decommission Express from the frontend bundle entirely. 
Keep Express running for pure backend API services that never render HTML.
```

### Key Decision

The team initially wanted to migrate all 12 services at once (big bang). The adoption strategy assessment identified this as HIGH RISK due to external dependency count and lack of team experience. The plan was revised to the three-phase approach with mandatory readiness gate before Phase 1.

---