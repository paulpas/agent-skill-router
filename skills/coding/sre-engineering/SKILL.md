---




name: sre-engineering
description: Implements SRE practices including SLI/SLO frameworks, error budget policies, incident management, capacity planning, and chaos engineering for production reliability.
license: MIT
compatibility: opencode
archetypes:
  - tactical
  - strategic
  - diagnostic
anti_triggers:
  - brainstorming
  - vague ideation
  - long-form architecture
response_profile:
  verbosity: medium
  directive_strength: high
  abstraction_level: operational
metadata:
  version: "1.0.0"
  domain: coding
  triggers: sre, site reliability, SLO monitoring, error budget, incident management, capacity planning, chaos engineering, blameless postmortem
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, config, do-dont, examples]
  related-skills: coding-observability-engineering, coding-production-readiness, cncf-kubernetes, agent-incident-response




---





# SRE Engineering Practice

Implements Site Reliability Engineering practices to make production systems reliable, observable, and resilient. The model acts as a senior SRE who designs error budgets, manages incidents, plans capacity, and runs chaos campaigns — applying Google's SRE methodology combined with modern platform engineering patterns.

## TL;DR Checklist

- [ ] Define SLIs (user journeys) before setting any SLOs
- [ ] Calculate multi-window burn rate (fast 1h + slow 6h) for error budget consumption
- [ ] Assign per-service error budgets with team-level allocation targets
- [ ] Classify incidents by severity (SEV0–SEV3) with defined escalation paths
- [ ] Run blameless postmortems with root cause, timeline, and action items
- [ ] Set capacity headroom to 40% above peak before triggering autoscaling
- [ ] Design chaos campaigns with bounded blast radius and automatic rollback

---

## When to Use

Use this skill when:

- Designing an SRE program or reliability framework for a new service
- Defining SLIs/SLOs/SLAs for user-facing features and API endpoints
- Implementing error budget policies with burn rate alerting in Prometheus or Datadog
- Managing a production incident — triaging severity, coordinating response, writing postmortems
- Planning capacity for an upcoming launch, seasonal spike, or growth trajectory
- Designing chaos engineering experiments to validate failure hypotheses
- Reviewing production readiness of a service before green-lighting launch

---

## When NOT to Use

Avoid this skill for:

- Writing application business logic — use coding domain skills instead
- Infrastructure provisioning (Terraform, Pulumi) — use infrastructure-as-code skills
- Deep CI/CD pipeline debugging — use deployment/supply chain skills
- Simple monitoring dashboards without SLO context — that is operational observability, not SRE

---

## Core Workflow

1. **Define User Journeys and SLIs** — Identify the critical user journeys your service supports. For each journey, define a Service Level Indicator (SLI) as a measurable ratio: good events / total events.
   **Checkpoint:** Every SLI must map to an actual user-facing operation (e.g., "successful HTTP request from page load to rendered HTML"). Internal metrics alone are insufficient.

2. **Set SLOs with Target Windows** — For each SLI, set a Service Level Objective (SLO) as a target ratio over a rolling window (typically 28 days). The SLO must be stricter than the business SLA by at least 10% margin.
   **Checkpoint:** Verify SLO windows are aligned to user behavior cycles (e.g., weekly, not arbitrary). A 28-day window captures weekday/weekend variance.

3. **Calculate Error Budget and Burn Rate** — Compute error budget = 1 − SLO target. Implement multi-window burn rate alerting: fast window (1h) detects sudden outages; slow window (6h) detects creeping degradation.
   **Checkpoint:** Alert rules must fire when both windows show simultaneous budget consumption above threshold — this prevents false positives from transient spikes.

4. **Implement Error Budget Policy** — Define what happens when the budget is consumed: P0 pages, feature freezes, reliability-only sprints. Document escalation paths per severity level.
   **Checkpoint:** Policy must include automatic actions (page) and manual gates (freeze) with clear ownership.

5. **Capacity Planning** — Model current utilization, project growth, and define headroom targets. Configure auto-scaling policies using HPA/VPA or custom metrics. Set forecasts using moving averages and seasonal decomposition.
   **Checkpoint:** Capacity plan must cover three scenarios: baseline, +50% traffic spike, and +100% (black swan).

6. **Chaos Engineering Validation** — Design fault injection campaigns that test your SLO hypotheses. Run game days with defined blast radius limits and automatic rollback triggers.
   **Checkpoint:** Every chaos experiment must have an explicit stop condition tied to SLO budget consumption, not just a timer.

---

## Implementation Patterns / Reference Guide

### Pattern 1: Multi-Window Burn Rate Alerting

The gold-standard alerting strategy for SLO error budgets uses two burn rate windows simultaneously. The fast window (1h) catches sudden outages; the slow window (6h) catches gradual degradation. A page fires when both exceed thresholds concurrently.

```python
"""Multi-window burn rate calculator for SLO error budget alerting.

Implements Google's SRE recommended multi-window approach:
- Fast window (1 hour): detects sudden, catastrophic failures
- Slow window (6 hours): detects creeping, persistent degradation

Reference: Google SRE Workbook, Chapter 8 — "Alerting on SLOs"
"""

from dataclasses import dataclass
from enum import IntEnum
from typing import Optional


class BurnRateSeverity(IntEnum):
    FAST_CRITICAL = 14.4   # Exhaust budget in ~2 hours
    FAST_WARNING = 10.0    # Exhaust budget in ~3 hours
    SLOW_CRITICAL = 6.0    # Exhaust budget in ~5 hours
    SLOW_WARNING = 3.0     # Exhaust budget in ~10 hours


@dataclass(frozen=True)
class BurnRateResult:
    fast_rate: float
    slow_rate: float
    budget_remaining_pct: float
    severity: Optional[BurnRateSeverity] = None
    action_required: bool = False

    @property
    def is_page_worthy(self) -> bool:
        """Page-worthy when both windows are elevated simultaneously."""
        if self.severity is None:
            return False
        # Page only when fast and slow windows cross thresholds together
        return (self.fast_rate >= BurnRateSeverity.FAST_CRITICAL.value and
                self.slow_rate >= BurnRateSeverity.SLOW_CRITICAL.value)


def calculate_burn_rate(
    slo_target: float,
    current_error_rate: float,
    window_hours: int,
    total_events: int,
    bad_events: int,
) -> float:
    """Calculate error budget burn rate for a given observation window.

    Burn rate = (current error rate / allowed error rate) as measured
    over the specified window. A burn rate of 14.4 means you will
    consume your entire monthly error budget in approximately 2 hours.

    Args:
        slo_target: The SLO target ratio (e.g., 0.999 for 99.9% availability)
        current_error_rate: Measured error rate over the window (0.0 to 1.0)
        window_hours: Size of the observation window in hours
        total_events: Total number of events measured in the window
        bad_events: Number of bad events measured in the window

    Returns:
        Burn rate multiplier. 1.0 = on-track, >14.4 = critical.

    Raises:
        ValueError: If slo_target is not between 0 and 1, or if total_events is zero.
    """
    if not (0 < slo_target < 1):
        raise ValueError(f"slo_target must be between 0 and 1, got {slo_target}")
    if total_events == 0:
        raise ValueError("Cannot calculate burn rate with zero total events")

    allowed_error_rate = 1.0 - slo_target
    actual_error_rate = bad_events / total_events

    # Normalize to hourly rate for consistent comparison across window sizes
    hourly_bad = bad_events / max(window_hours, 1)
    hourly_total = total_events / max(window_hours, 1)
    hourly_error_rate = hourly_bad / max(hourly_total, 1)

    burn_rate = hourly_error_rate / allowed_error_rate if allowed_error_rate > 0 else float('inf')
    return round(burn_rate, 2)


def evaluate_multi_window_burn(
    slo_target: float,
    fast_errors: int,
    fast_total: int,
    slow_errors: int,
    slow_total: int,
    budget_remaining_pct: float,
) -> BurnRateResult:
    """Evaluate burn rate across both fast (1h) and slow (6h) windows.

    Implements the simultaneous window approach — alerts fire only when
    both fast AND slow windows show elevated burn rates. This prevents
    pages from transient spikes that heal within the observation window.

    Args:
        slo_target: Target SLO ratio (e.g., 0.995)
        fast_errors: Error count in the last 1 hour
        fast_total: Total event count in the last 1 hour
        slow_errors: Error count in the last 6 hours
        slow_total: Total event count in the last 6 hours
        budget_remaining_pct: Current error budget remaining as a percentage (0-100)

    Returns:
        BurnRateResult with computed rates, severity, and action flags.
    """
    fast_rate = calculate_burn_rate(slo_target, None, 1, fast_total, fast_errors)
    slow_rate = calculate_burn_rate(slo_target, None, 6, slow_total, slow_errors)

    # Determine highest severity across both windows
    severity = None
    if fast_rate >= BurnRateSeverity.FAST_CRITICAL.value and \
       slow_rate >= BurnRateSeverity.SLOW_CRITICAL.value:
        severity = BurnRateSeverity.FAST_CRITICAL
    elif fast_rate >= BurnRateSeverity.FAST_WARNING.value:
        severity = BurnRateSeverity.FAST_WARNING
    elif slow_rate >= BurnRateSeverity.SLOW_CRITICAL.value:
        severity = BurnRateSeverity.SLOW_CRITICAL
    elif slow_rate >= BurnRateSeverity.SLOW_WARNING.value:
        severity = BurnRateSeverity.SLOW_WARNING

    return BurnRateResult(
        fast_rate=fast_rate,
        slow_rate=slow_rate,
        budget_remaining_pct=budget_remaining_pct,
        severity=severity,
        action_required=(severity is not None) or (budget_remaining_pct < 20),
    )


# ❌ BAD: Single-window alert — fires on every spike, creates alert fatigue
def bad_single_window_alert(slo_target: float, error_rate: float) -> bool:
    """Naive single-window approach that pages for every transient spike."""
    allowed = 1.0 - slo_target
    return error_rate > allowed * 3  # Triggers on 3x error rate — no temporal context


# ✅ GOOD: Multi-window with simultaneous threshold enforcement
def good_multi_window_alert(
    slo_target: float,
    fast_errors: int,
    fast_total: int,
    slow_errors: int,
    slow_total: int,
) -> bool:
    """Simultaneous multi-window approach — only pages when both windows agree."""
    result = evaluate_multi_window_burn(
        slo_target=slo_target,
        fast_errors=fast_errors,
        fast_total=fast_total,
        slow_errors=slow_errors,
        slow_total=slow_total,
        budget_remaining_pct=50.0,  # Would come from external state store
    )
    return result.is_page_worthy
```

### Pattern 2: Prometheus SLO Alerting Rules (YAML)

Real-world Prometheus alerting rules implementing the multi-window burn rate pattern above.

```yaml
# prometheus/alert_rules/slo-alerts.yml
# Multi-window burn rate alerts following Google SRE methodology.
# Deploy to Prometheus via configmap mount or Thanos Ruler sync.

groups:
  - name: slo-burn-rate
    interval: 30s

    # Fast window (1h) critical — both fast AND slow must be elevated
    - alert: SLOBurnRateFastCritical
      expr: |
        (
          rate(http_requests_total{status=~"5..",job="api-gateway"}[5m])
          /
          sum(rate(http_requests_total{job="api-gateway"}[5m]))
        )
        > 14.4 * (1 - 0.999)
      for: 2m
      labels:
        window: "fast"
        severity: critical
      annotations:
        summary: "{{ $labels.job }} fast burn rate critical"
        description: |
          Fast burn rate is {{ $value | humanize }}x — error budget on track to exhaust in ~2h.
          SLO target: 99.9% ({{ $labels.slo_name }})
          Requires immediate investigation.

    # Slow window (6h) critical — persistent degradation detected
    - alert: SLOBurnRateSlowCritical
      expr: |
        (
          rate(http_requests_total{status=~"5..",job="api-gateway"}[30m])
          /
          sum(rate(http_requests_total{job="api-gateway"}[30m]))
        )
        > 6.0 * (1 - 0.999)
      for: 15m
      labels:
        window: "slow"
        severity: critical
      annotations:
        summary: "{{ $labels.job }} slow burn rate critical"
        description: |
          Slow burn rate is {{ $value | humanize }}x — persistent degradation over 6h window.
          This indicates a systematic issue, not a transient spike.

    # Simultaneous alert — pages the on-call SRE team
    - alert: SLOErrorBudgetRapidExhaustion
      expr: |
        (
          rate(http_requests_total{status=~"5..",job="api-gateway"}[5m])
          /
          sum(rate(http_requests_total{job="api-gateway"}[5m]))
        ) > 14.4 * (1 - 0.999)
        and on(job)
        (
          rate(http_requests_total{status=~"5..",job="api-gateway"}[30m])
          /
          sum(rate(http_requests_total{job="api-gateway"}[30m]))
        ) > 6.0 * (1 - 0.999)
      labels:
        severity: page
        window: "simultaneous"
      annotations:
        summary: "[PAGE] SLO error budget rapid exhaustion on {{ $labels.job }}"
        description: |
          Both fast and slow burn rate windows are elevated simultaneously.
          Error budget will be consumed within the next few hours.
          Action: Page on-call SRE, begin incident response.
```

### Pattern 3: Capacity Planning with Auto-Scaling Configuration

Production-ready Kubernetes HPA configuration with custom metrics-based scaling and headroom targets.

```yaml
# k8s/hpa-production.yml
# Production HorizontalPodAutoscaler with multiple scaling dimensions.
# Follows the 40% headroom rule: scale before utilization hits 60%.

---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-gateway-hpa
  namespace: production
  annotations:
    sre.engineering/headroom-target: "40"
    sre.engineering/target-utilization-cpu: "60"
    sre.engineering/target-utilization-memory: "70"
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-gateway
  minReplicas: 5
  maxReplicas: 50
  metrics:
    # CPU-based scaling (primary trigger)
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 60   # Scale at 60% — maintains 40% headroom

    # Memory-based scaling (secondary, prevents OOM under load)
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 70

    # Custom metrics (business-driven scaling)
    - type: Pods
      pods:
        metric:
          name: http_requests_per_second
        target:
          type: AverageValue
          averageValue: "500"     # Scale when per-pod RPM exceeds 500

    # Queue-based scaling (for async workloads)
    - type: External
      external:
        metric:
          name: queue_depth_total
        target:
          type: AverageValue
          averageValue: "100"     # Scale when per-pod queue depth exceeds 100

  behavior:
    # Scale-up: aggressive but controlled — 2 pods per 60s window
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
        - type: Pods
          value: 2
          periodSeconds: 60
        - type: Percent
          value: 25
          periodSeconds: 60
      selectPolicy: Max

    # Scale-down: conservative — prevents flapping and thrashing
    scaleDown:
      stabilizationWindowSeconds: 300   # 5-minute cooldown
      policies:
        - type: Pods
          value: 1
          periodSeconds: 120
        - type: Percent
          value: 10
          periodSeconds: 120
      selectPolicy: Min
---
# VerticalPodAutoscaler for right-sizing resource requests automatically
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: api-gateway-vpa
  namespace: production
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-gateway
  updatePolicy:
    updateMode: "Auto"   # Auto-recommends and applies resource changes during rolling updates
  resourcePolicy:
    containerPolicies:
      - containerName: api-gateway
        minAllowed:
          cpu: "100m"
          memory: "128Mi"
        maxAllowed:
          cpu: "4"
          memory: "8Gi"
        controlledResources: ["cpu", "memory"]
```

### Pattern 4: Incident Severity Classification and Postmortem Template

Production incident management with severity definitions, escalation paths, and a blameless postmortem template.

```python
"""Incident severity classification and blameless postmortem framework.

Implements Google/Microsoft-style incident response with clear severity
definitions, escalation matrices, and structured postmortem reporting.

Reference: Google SRE Incident Response, PagerDuty Incident Management
"""

import enum
import datetime
from dataclasses import dataclass, field
from typing import Optional


class Severity(enum.IntEnum):
    SEV0 = 0   # Critical — full outage, data loss, security breach
    SEV1 = 1   # High — major feature broken, significant user impact
    SEV2 = 2   # Medium — partial degradation, workarounds available
    SEV3 = 3   # Low — minor issue, no user impact or limited scope


@dataclass
class SeveritySLA:
    """Response time SLAs per severity level. These are industry-standard targets."""
    detection_target_seconds: int
    acknowledgment_target_seconds: int
    resolution_target_seconds: int

SEVERITY_SLAS: dict[Severity, SeveritySLA] = {
    Severity.SEV0: SeveritySLA(30, 5 * 60, 4 * 3600),   # Detect in 30s, ack in 5m, resolve in 4h
    Severity.SEV1: SeveritySLA(5 * 60, 15 * 60, 8 * 3600),  # Detect in 5m, ack in 15m, resolve in 8h
    Severity.SEV2: SeveritySLA(15 * 60, 30 * 60, 24 * 3600),  # Detect in 15m, ack in 30m, resolve in 24h
    Severity.SEV3: SeveritySLA(1 * 86400, 8 * 3600, 5 * 86400),  # Detect in 1d, ack in 8h, resolve in 5d
}


@dataclass
class IncidentEvent:
    """An individual event recorded during incident response."""
    timestamp: datetime.datetime
    action: str
    actor: str
    details: str


@dataclass
class BlamelessPostmortem:
    """Structured blameless postmortem following SRE best practices.

    The blameless principle: we fix systems, not people. Every incident
    reveals a systemic gap — the question is how to close it, not who
    caused it.

    Reference: "Blameless PostMortems and a Just Culture" — Nicole Forsgren
    """
    incident_id: str
    severity: Severity
    started_at: datetime.datetime
    resolved_at: datetime.datetime
    impacted_users_estimate: int
    description: str
    root_cause_categories: list[str] = field(default_factory=list)
    timeline: list[IncidentEvent] = field(default_factory=list)
    what_went_wrong: list[str] = field(default_factory=list)
    what_went_right: list[str] = field(default_factory=list)
    action_items: list[dict] = field(default_factory=list)

    @property
    def duration_minutes(self) -> int:
        delta = self.resolved_at - self.started_at
        return int(delta.total_seconds() / 60)

    def add_action_item(
        self,
        description: str,
        owner: str,
        deadline: datetime.datetime,
        category: str,
        linked_to_root_cause: bool = False,
    ) -> None:
        """Add a concrete action item to the postmortem.

        Every root cause must have at least one associated action item.
        Action items should be specific, owned, and time-bound.
        """
        self.action_items.append({
            "description": description,
            "owner": owner,
            "deadline": deadline.isoformat(),
            "category": category,
            "linked_to_root_cause": linked_to_root_cause,
            "status": "open",
        })

    def validate_completeness(self) -> list[str]:
        """Validate the postmortem has all required sections."""
        gaps = []
        if not self.description.strip():
            gaps.append("Missing incident description")
        if not self.timeline:
            gaps.append("Missing incident timeline")
        if not self.what_went_wrong:
            gaps.append("Missing 'what went wrong' analysis")
        if not self.action_items:
            gaps.append("Missing action items — every root cause needs remediation")
        return gaps


# ❌ BAD: Postmortem that focuses on who caused the problem
def bad_postmortem_approach():
    """This approach blames individuals and misses systemic fixes."""
    # "John forgot to update the config during deploy. We need to retrain John."
    # This does nothing to prevent the next person from making the same mistake.


# ✅ GOOD: Blameless postmortem that focuses on system fixes
def good_blameless_analysis():
    """Root cause analysis that asks 'what system allowed this?' not 'who did this?'"""
    # "The config was updated during deploy but the validation check skipped."
    # Action items: Add pre-deploy config diff check, require dual-approval for prod changes."
    pass


# Severity classification by symptoms
def classify_severity(
    impact_scope: str,       # "all users", "subset of users", "internal"
    data_risk: bool,         # Is there a risk of data loss or corruption?
    security_breach: bool,   # Has a security boundary been crossed?
    has_workaround: bool,    # Can users accomplish their goal differently?
) -> Severity:
    """Classify incident severity based on observable symptoms.

    Args:
        impact_scope: Description of who is affected
        data_risk: Whether data loss or corruption is possible
        security_breach: Whether a security boundary has been crossed
        has_workaround: Whether users can work around the issue

    Returns:
        Severity classification following the SLA matrix.
    """
    if security_breach or data_risk or impact_scope == "all_users" and not has_workaround:
        return Severity.SEV0
    elif impact_scope in ("all_users", "majority") or not has_workaround:
        return Severity.SEV1
    elif not has_workaround:
        return Severity.SEV2
    else:
        return Severity.SEV3
```

### Pattern 5: Chaos Engineering Campaign Design

Fault injection campaigns with bounded blast radius and automatic rollback.

```python
"""Chaos engineering campaign engine for production reliability validation.

Implements chaos experiments with blast radius limits, automatic rollback
conditions, and SLO-aware stop triggers. Every experiment must be reversible
and bounded in impact.

Reference: Netflix Chaos Monkey, Google Gremlin, AWS Fault Injection Simulator
"""

import enum
import time
from dataclasses import dataclass, field
from typing import Callable, Optional


class ExperimentState(enum.Enum):
    DESIGNED = "designed"
    APPROVED = "approved"
    RUNNING = "running"
    STOPPED = "stopped"
    ROLLED_BACK = "rolled_back"


@dataclass
class BlastRadius:
    """Maximum acceptable impact for a chaos experiment.

    Blast radius is the hard boundary — experiments MUST stop if these
    thresholds are exceeded, regardless of other conditions.
    """
    max_pod_failure_pct: float = 20.0     # Max % of pods that can fail simultaneously
    max_error_rate_increase: float = 0.5   # Max % increase in error rate allowed
    max_latency_p99_ms: int = 500          # Max p99 latency increase (ms)
    max_user_impact_count: int = 10        # Max affected users simultaneously

    def validate(self, current_state: dict) -> bool:
        """Check if experiment is still within blast radius limits.

        Returns False if any limit has been breached — caller must stop immediately.
        """
        checks = [
            (current_state.get("pod_failure_pct", 0), self.max_pod_failure_pct, "pods"),
            (current_state.get("error_rate_increase_pct", 0), self.max_error_rate_increase * 100, "error rate %"),
            (current_state.get("latency_p99_ms", 0), self.max_latency_p99_ms, "latency p99 ms"),
        ]
        for current, limit, name in checks:
            if current > limit:
                return False
        # User impact check uses <= not > (we allow up to the max)
        if current_state.get("user_impact_count", 0) > self.max_user_impact_count:
            return False
        return True


@dataclass
class ChaosExperiment:
    """A single chaos engineering experiment with bounded blast radius."""
    name: str
    description: str
    target_service: str
    fault_type: str           # e.g., "pod_kill", "network_latency", "cpu_saturation"
    blast_radius: BlastRadius
    duration_seconds: int
    observation_window_seconds: int = 600
    slo_thresholds: dict[str, float] = field(default_factory=dict)
    rollback_trigger: Optional[Callable] = None
    state: ExperimentState = ExperimentState.DESIGNED

    # Stop conditions evaluated during experiment run
    stop_conditions: list[dict] = field(default_factory=list)

    def approve(self, approver: str) -> None:
        """Mark experiment as approved for execution.

        Requires explicit approval from an SRE lead before running in production.
        """
        self.state = ExperimentState.APPROVED

    def run_with_safety_checks(
        self,
        fault_injection_fn: Callable,
        health_check_fn: Callable,
        rollback_fn: Callable,
    ) -> dict:
        """Execute chaos experiment with continuous safety monitoring.

        The experiment runs in a loop: inject fault → observe → check limits → repeat.
        Stops immediately if any blast radius or SLO condition is violated.

        Args:
            fault_injection_fn: Function that applies the fault to the target service
            health_check_fn: Function that returns current system state dict
            rollback_fn: Function that reverses the fault injection

        Returns:
            Experiment results dict with duration, observations, and final state.
        """
        self.state = ExperimentState.RUNNING
        start_time = time.time()
        observations = []

        try:
            while (time.time() - start_time) < self.duration_seconds:
                # Apply fault
                fault_injection_fn(self.target_service)

                # Observe for the configured window
                state = health_check_fn()
                observations.append({
                    "timestamp": time.time(),
                    "state": state,
                    "within_blast_radius": self.blast_radius.validate(state),
                })

                # Check blast radius — MUST stop immediately if breached
                if not self.blast_radius.validate(state):
                    rollback_fn(self.target_service)
                    self.state = ExperimentState.ROLLED_BACK
                    return {
                        "state": "rolled_back",
                        "reason": "blast radius exceeded",
                        "observations_count": len(observations),
                        "duration_seconds": time.time() - start_time,
                    }

                # Check SLO thresholds — warn but continue if within limits
                for metric, threshold in self.slo_thresholds.items():
                    if state.get(metric, 0) > threshold:
                        return {
                            "state": "stopped",
                            "reason": f"SLO threshold exceeded for {metric}",
                            "observations_count": len(observations),
                            "duration_seconds": time.time() - start_time,
                        }

                # Brief pause before next injection cycle
                time.sleep(min(30, self.observation_window_seconds // 4))

            # Experiment completed without issues
            self.state = ExperimentState.STOPPED
            return {
                "state": "completed",
                "reason": "experiment finished within all bounds",
                "observations_count": len(observations),
                "duration_seconds": time.time() - start_time,
            }

        except Exception as e:
            rollback_fn(self.target_service)
            self.state = ExperimentState.ROLLED_BACK
            return {
                "state": "rolled_back",
                "reason": f"unexpected error: {e}",
                "observations_count": len(observations),
                "duration_seconds": time.time() - start_time,
            }


# Example: Pod kill experiment with blast radius limits
def design_pod_kill_campaign() -> ChaosExperiment:
    """Design a pod termination chaos experiment for the API gateway service.

    This experiment verifies that the service can tolerate individual pod failures
    without violating its 99.9% availability SLO.
    """
    return ChaosExperiment(
        name="api-gateway-pod-termination",
        description="Terminate random API gateway pods to verify auto-healing and traffic redistribution",
        target_service="api-gateway",
        fault_type="pod_kill",
        blast_radius=BlastRadius(
            max_pod_failure_pct=15.0,
            max_error_rate_increase=2.0,
            max_latency_p99_ms=300,
            max_user_impact_count=50,
        ),
        duration_seconds=1800,    # 30 minutes
        slo_thresholds={
            "error_rate_pct": 0.5,   # Must stay below 0.5% error rate
            "latency_p99_ms": 200,   # p99 latency must not exceed 200ms
        },
    )
```

---

## Constraints

### MUST DO

- Define SLIs as user-facing ratios (good events / total events) — never use internal metrics alone as SLIs
- Calculate error budget as `1 - SLO_target` and track it continuously in a centralized dashboard
- Use multi-window burn rate alerting (fast + slow windows) — single-window alerts create fatigue
- Set autoscaling targets at 60% CPU utilization to maintain 40% headroom before triggering scale-up
- Run chaos experiments with explicit blast radius limits and automatic rollback on SLO breach
- Write blameless postmortems within 5 business days of incident resolution
- Include action items linked directly to root cause categories — every gap needs a fix
- Classify incidents using the severity SLA matrix consistently across all teams
- Document escalation paths with named roles, not just team names (e.g., "SRE on-call" not "the team")
- Validate all SLO targets against actual user perception of reliability

### MUST NOT DO

- Set SLOs without first defining the corresponding SLIs — an SLO without an SLI is a guess
- Allow error budget consumption above 100% without triggering automatic feature freezes
- Scale down below minimum replicas needed for active-active redundancy (at least 2 availability zones)
- Run chaos experiments in production without explicit approval and defined rollback triggers
- Blame individuals in postmortems — focus on system gaps, not human errors
- Use a single alerting window for SLO burn rate detection — transient spikes will cause false pages
- Configure HPA scale-down windows shorter than 5 minutes — causes flapping and thrashing
- Set maxReplicas without considering cost impact — always define budget ceilings
- Treat SLA commitments as internal targets — external SLAs are legal contracts with customers

---

## Output Template

When implementing or reviewing SRE practices, produce the following structured output:

1. **SLI/SLO Definition** — For each user journey: the SLI ratio formula, the SLO target percentage, the measurement window, and the tool used for measurement (Prometheus, Datadog, etc.)

2. **Error Budget Analysis** — Current budget consumed (%) , burn rate (fast + slow windows), projected time to exhaustion at current rate, and recommended action (page / warn / monitor)

3. **Incident Report** (if applicable) — Severity classification with SLA targets, timeline of key events, root cause categories, what went wrong/right, and concrete action items with owners and deadlines

4. **Capacity Plan** — Current utilization (%), projected growth rate, headroom margin, autoscaling configuration highlights, and bottleneck identification for the 3 scenarios (baseline, +50%, +100%)

5. **Chaos Experiment Report** — Experiment name, fault type deployed, blast radius limits set, actual impact observed, whether SLOs held, and lessons learned

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `coding-observability-engineering` | Metrics collection, tracing, and dashboard design that feed into SLO monitoring |
| `coding-production-readiness` | Pre-launch checklists and validation gates before a service goes live |
| `cncf-kubernetes` | Platform-level reliability patterns for container orchestration infrastructure |
| `agent-incident-response` | Automated incident coordination, runbook execution, and on-call escalation workflows |

---

## Live References

> Authoritative documentation links for SRE engineering practices. The model follows markdown links at load time to resolve external references and inline content.

- [Google SRE Workbook — Service Level Objectives](https://sre.google/workbook/table-of-contents/)
- [Google SRE Workbook — Alerting on SLOs](https://sre.google/workbook/alerting-on-slos/)
- [Google SRE Workbook — Error Budgets](https://sre.google/workbook/setting-up-an-error-budget/)
- [Google SRE Workbook — Production Readiness Reviews](https://sre.google/workbook/prerelease-readiness-reviews/)
- [AWS Well-Architected Framework — Reliability Pillar](https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/welcome.html)
- [Kubernetes HPA Configuration Guide](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/)
- [PagerDuty Incident Response Playbook](https://support.pagerduty.com/docs/incident-response-overview)
