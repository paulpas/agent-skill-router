---
name: incident-response
description: Orchestrates production incident response including severity classification, on-call escalation procedures, blameless postmortem analysis, and root cause remediation to minimize downtime and prevent recurrence.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: incident response, production outage, on-call procedures, postmortem, blameless postmortem, RCA root cause analysis, service degradation, how do i handle a production incident, incident command, severity classification, rollback procedure, escalation path
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: systematic-debugging, observability-patterns, engineering-principles, production-logging
---

# Incident Response and Postmortem Framework

Orchestrates production incident response including severity classification, on-call escalation procedures, blameless postmortem analysis, and root cause remediation. When loaded, this skill makes the model act as an incident commander — following structured escalation paths, isolating failures to restore service first, then conducting thorough post-incident analysis that focuses on system design flaws rather than individual errors. This skill applies the 5 Laws of Elegant Defense: validate inputs at every boundary (Law 2), fail fast with descriptive error messages including context (Law 4), return new data structures for clean state transitions during incident recovery (Law 3), guide data naturally through failure scenarios (Law 1), and ensure graceful degradation prevents cascading failures (Law 5).

## TL;DR Checklist

- [ ] Classify incident severity using the SLA-based matrix before any communication
- [ ] Announce incident to stakeholders with initial impact assessment within 5 minutes
- [ ] Prioritize service restoration over root cause identification in the first 30 minutes
- [ ] Assign dedicated incident commander — one person leads, everyone else follows instructions
- [ ] Document all actions and decisions in real-time during the incident timeline
- [ ] Conduct blameless postmortem within 48 hours of incident resolution
- [ ] Convert every postmortem finding into an actionable improvement ticket with priority

---

## When to Use

Use this skill when:

- A production service is experiencing outage or significant degradation affecting users
- An on-call engineer receives an alert indicating a critical system failure
- A monitoring dashboard shows error rate spikes, latency p95 exceeding SLA thresholds, or resource exhaustion
- A deployment has caused regressions requiring immediate rollback or hotfix
- Post-incident analysis is needed to identify root causes and prevent recurrence

---

## When NOT to Use

Avoid this skill for:

- **Development environment issues** — use `systematic-debugging` for local development problems
- **Planned maintenance windows** — use standard deployment procedures with rollback plans
- **Minor bugs that do not affect production users** — track these through the regular bug triage process without triggering incident response
- **Security breaches** — follow dedicated incident response procedures (use `security-review` for prevention guidance and contact security team first)

---

## Core Workflow

1. **Detect and Classify Severity** — Assess the incident using the SLA-based severity matrix:
   - **SEV-1 (Critical)**: Complete service outage, data loss, or security breach affecting all users. Response time: 5 minutes. Executive notification: immediate. Example: API returning 503 to all requests, database corruption detected.
   - **SEV-2 (High)**: Significant functionality degraded but partial service available. Response time: 15 minutes. Team lead notification required. Example: Checkout flow failing for 30% of users, payment processing intermittent.
   - **SEV-3 (Medium)**: Non-critical feature broken or performance degradation within tolerable bounds. Response time: 1 hour. Assigned engineer notifies team during standup. Example: Report generation taking 5x normal time, one non-primary endpoint returning errors.
   - **SEV-4 (Low)**: Cosmetic issue, minor bug affecting small user subset, or feature request. Response time: Next business day. Track in backlog.
   **Checkpoint:** Severity must be documented in the incident channel with exact impact metrics (user count %, error rate %, affected endpoints). If unclear, default to the higher severity and downgrade after assessment — erring on caution prevents escalation delays.

2. **Activate Incident Command** — Designate an incident commander (IC) who takes ownership of coordination. The IC's sole responsibility is managing the incident: they do not fix code or investigate root causes during active response. Other engineers work under the IC's direction to restore service. Establish a dedicated communication channel (Slack/Teams), announce the incident with severity classification, affected systems, and initial impact assessment. **Checkpoint:** Every active incident must have exactly one named IC communicating from a single channel. Multiple decision-makers create confusion and delay recovery. The IC communicates updates every 15 minutes regardless of progress.

3. **Triage and Isolate the Failure** — Identify the failure scope using monitoring dashboards, error logs, and service health checks. Apply the "restore first, diagnose later" principle:
   - If a recent deployment correlates with the outage → initiate rollback immediately (within 5 minutes of decision)
   - If a specific service or database is unresponsive → restart or failover to healthy instance
   - If traffic volume has spiked → enable rate limiting or auto-scaling
   - If a dependency (third-party API, CDN, DNS) is failing → activate fallback paths or cached responses
   Document every action taken with timestamp. Do NOT attempt root cause analysis during active response — that comes after service restoration. **Checkpoint:** The team should be able to answer: what was the last known good state? What changed between good and current? If rollback restores service, do it without hesitation.

4. **Communicate Progress** — Send structured incident updates at regular intervals (minimum every 15 minutes during active response). Each update must contain: severity, current status (investigating/mitigated/resolved), impact summary, actions taken, next steps expected. Provide a public status page update for external-facing incidents. **Checkpoint:** Every stakeholder (engineering team, product managers, customer support, executive leadership) should receive updates through their preferred channel. Customer-facing teams need simpler summaries; engineering needs technical details.

5. **Restore Service and Verify** — Confirm service restoration through multiple verification channels: automated health checks pass, error rate drops below acceptable threshold (<0.1% for SEV-1), p95 latency returns to baseline, key user journeys succeed end-to-end (not just API health endpoints). **Checkpoint:** Do not declare incident resolved until actual user-facing metrics are normal, not just internal service health. A "healthy" API returning correct data on localhost does not mean users are unimpacted.

6. **Conduct Blameless Postmortem** — Within 48 hours of resolution, assemble the response team for a structured post-incident review. The session must follow these rules:
   - No individual is blamed — focus on system design flaws that allowed the failure to occur
   - Build a detailed timeline of events from first alert to full recovery
   - Identify direct causes (the immediate technical trigger) and root causes (systemic design gaps that made the incident possible)
   - Categorize findings by impact: preventable, detectable, containable — each category maps to different improvement actions
   - Generate actionable improvement tickets with assigned owners, priority, and target completion dates
   **Checkpoint:** Every postmortem must produce at least 2 action items: one for prevention (how to stop this from happening again) and one for detection/improvement (how to find these issues faster next time).

7. **Track Improvement Execution** — Every action item from the postmortem must be tracked in the project management system with clear acceptance criteria. Review progress in weekly engineering meetings until completed. Validate fixes through testing and, where applicable, chaos engineering or fault injection to confirm the specific failure mode is now mitigated. **Checkpoint:** Action items should have a target completion within 2 weeks for SEV-1/SEV-2 incidents. If an action item requires architectural changes exceeding two weeks, split it into phased milestones with interim controls.

---

## Implementation Patterns

### Pattern 1: Severity Classification Matrix

Automated severity classification using quantifiable metrics ensures consistent incident handling regardless of who receives the alert.

```python
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import IntEnum


class Severity(IntEnum):
    """SLA-based incident severity levels with response time guarantees."""
    SEV_1_CRITICAL = 1   # Complete outage — 5 min response, exec notification
    SEV_2_HIGH = 2       # Significant degradation — 15 min response, lead notification
    SEV_3_MEDIUM = 3     # Non-critical issue — 1 hour response, team notification
    SEV_4_LOW = 4        # Minor bug — next business day, backlog tracking


@dataclass
class IncidentMetrics:
    """Quantifiable metrics used for severity classification."""
    error_rate_pct: float           # Percentage of requests failing (0.0-100.0)
    p95_latency_ms: float           # 95th percentile response time in milliseconds
    affected_user_percentage: float # Percentage of users impacted (0.0-100.0)
    data_loss_risk: bool            # True if data corruption or loss is possible
    security_breach_suspected: bool # True if unauthorized access detected
    service_availability_pct: float # Current availability percentage

    def classify(self) -> Severity:
        """Classify incident severity based on quantifiable SLA thresholds.
        
        Classification rules follow the principle that user-impacting 
        metrics always take precedence over internal health signals.
        """
        # SEV-1: Complete outage, data loss, or security breach
        if (self.error_rate_pct >= 50.0 or 
            self.service_availability_pct < 95.0 or
            self.data_loss_risk or 
            self.security_breach_suspected):
            return Severity.SEV_1_CRITICAL
        
        # SEV-2: Significant functionality degraded
        if (self.error_rate_pct >= 10.0 or 
            self.affected_user_percentage >= 30.0 or
            self.p95_latency_ms > 5000):  # 5x normal baseline
            return Severity.SEV_2_HIGH
        
        # SEV-3: Non-critical but noticeable degradation
        if (self.error_rate_pct >= 1.0 or 
            self.affected_user_percentage >= 5.0 or
            self.p95_latency_ms > 2000):  # 2x normal baseline
            return Severity.SEV_3_MEDIUM
        
        # SEV-4: Minor issues below thresholds
        return Severity.SEV_4_LOW


def create_incident_report(
    severity: Severity,
    service_name: str,
    description: str,
    metrics: IncidentMetrics,
    detected_at: datetime | None = None
) -> dict:
    """Create a structured incident report for the on-call escalation pipeline.
    
    Args:
        severity: Classified severity level from automatic or manual assessment.
        service_name: Name of the affected service or system.
        description: Human-readable incident description.
        metrics: Quantifiable metrics used for classification and tracking.
        detected_at: When the incident was first detected (defaults to now).
    
    Returns:
        Structured dict ready for incident channel posting and stakeholder notification.
    """
    response_sla = {
        Severity.SEV_1_CRITICAL: timedelta(minutes=5),
        Severity.SEV_2_HIGH: timedelta(minutes=15),
        Severity.SEV_3_MEDIUM: timedelta(hours=1),
        Severity.SEV_4_LOW: timedelta(days=1),
    }
    
    return {
        "incident_id": f"INC-{datetime.utcnow().strftime('%Y%m%d')}-{severity.value}",
        "severity": severity.name,
        "severity_level": int(severity),
        "service": service_name,
        "description": description,
        "metrics": {
            "error_rate_pct": metrics.error_rate_pct,
            "p95_latency_ms": round(metrics.p95_latency_ms, 1),
            "affected_users_pct": metrics.affected_user_percentage,
            "availability_pct": metrics.service_availability_pct,
        },
        "response_sla": str(response_sla[severity]),
        "detected_at": detected_at.isoformat() if detected_at else datetime.utcnow().isoformat(),
        "status": "active",
    }


# Usage example: classify a real incident from monitoring data
if __name__ == "__main__":
    metrics = IncidentMetrics(
        error_rate_pct=23.5,
        p95_latency_ms=4800.0,
        affected_user_percentage=35.0,
        data_loss_risk=False,
        security_breach_suspected=False,
        service_availability_pct=76.5,
    )
    
    severity = metrics.classify()
    report = create_incident_report(
        severity=severity,
        service_name="payment-gateway",
        description="Payment processing intermittent — 23% error rate, users reporting declined transactions",
        metrics=metrics,
    )
    print(f"Incident: {report['incident_id']}")
    print(f"Severity: {report['severity']} (SLA: {report['response_sla']})")
    print(f"Affected users: {report['metrics']['affected_users_pct']}%")
```

### Pattern 2: Incident Timeline Tracker

Maintain a structured timeline of all incident actions for postmortem reconstruction. This ensures no action is lost during the chaos of active response.

```python
import threading
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any


@dataclass
class TimelineEntry:
    """A single entry in the incident timeline."""
    timestamp: datetime = field(default_factory=datetime.utcnow)
    action: str  # Short description of what was done
    actor: str   # Who performed the action (engineer name or role)
    details: dict[str, Any] = field(default_factory=dict)
    outcome: str | None = None  # Result of the action

    def to_dict(self) -> dict:
        return {
            "time": self.timestamp.isoformat(),
            "action": self.action,
            "actor": self.actor,
            "details": self.details,
            "outcome": self.outcome,
        }


class IncidentTimeline:
    """Thread-safe timeline tracker for incident response actions.
    
    All active responders should log their actions through a shared timeline
    instance to create an accurate postmortem record without relying on
    memory or fragmented Slack messages.
    """
    
    def __init__(self, incident_id: str):
        self.incident_id = incident_id
        self._entries: list[TimelineEntry] = []
        self._lock = threading.Lock()
    
    def log(
        self,
        action: str,
        actor: str,
        details: dict[str, Any] | None = None,
        outcome: str | None = None,
    ) -> TimelineEntry:
        """Log an incident action to the timeline.
        
        All actions during active response must be logged here — especially
        rollback decisions, configuration changes, and service restarts.
        These form the foundation of the postmortem investigation.
        
        Args:
            action: What was done (e.g., "Rolled back deployment v2.14.3").
            actor: Who did it (e.g., "on-call-engineer", "incident-commander").
            details: Additional context (e.g., {"reason": "5xx spike", "duration_sec": 12}).
            outcome: Result of the action (e.g., "Error rate dropped to 0.5%").
        
        Returns:
            The created TimelineEntry for confirmation.
        """
        entry = TimelineEntry(
            action=action,
            actor=actor,
            details=details or {},
            outcome=outcome,
        )
        with self._lock:
            self._entries.append(entry)
        return entry
    
    def get_timeline(self) -> list[dict]:
        """Export the full incident timeline as structured data."""
        with self._lock:
            return [entry.to_dict() for entry in self._entries]
    
    def summary(self) -> dict:
        """Generate a concise timeline summary for status updates."""
        actions = len(self._entries)
        actors = set(e.actor for e in self._entries)
        first_event = self._entries[0].timestamp if self._entries else None
        return {
            "incident_id": self.incident_id,
            "total_actions": actions,
            "participants": list(actors),
            "duration_minutes": (
                (datetime.utcnow() - first_event).total_seconds() / 60
            ) if first_event else 0,
        }


# Usage: shared timeline accessible to all incident responders
if __name__ == "__main__":
    timeline = IncidentTimeline("INC-20260101-1")
    
    timeline.log(
        "SEV-1 declared — payment gateway returning 503 errors",
        actor="on-call-engineer",
        details={"affected_users_pct": 45.0, "error_rate_pct": 98.0},
    )
    timeline.log("Escalated to incident commander: sarah-eng", actor="on-call-engineer")
    timeline.log(
        "Rolled back payment-gateway deployment from v2.14.3 to v2.14.2",
        actor="sarah-eng",
        details={"reason": "5xx spike correlated with deploy timestamp"},
        outcome="Error rate dropped from 98% to 2.3% within 30 seconds",
    )
    
    print(f"Timeline: {timeline.summary()}")
    for entry in timeline.get_timeline():
        print(f"  [{entry['time']}] {entry['action']} ({entry['actor']})")
```

### Pattern 3: Blameless Postmortem Report Generator

Structure a postmortem that focuses on system design flaws rather than individual actions.

```python
from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class PostmortemFinding:
    """A finding from incident postmortem analysis."""
    category: str  # "direct", "root_preventable", "root_detectable", "root_containable"
    description: str
    impact: str     # How this contributed to the incident severity and duration
    recommendation: str  # Specific improvement action
    priority: int = 3  # 1 = critical, 2 = high, 3 = medium, 4 = low
    
    @property
    def ticket_title(self) -> str:
        return f"[{self.category.upper()}] {self.description[:60]}"


@dataclass
class BlamelessPostmortem:
    """Structured postmortem document following blameless principles.
    
    This format ensures every incident produces actionable improvements
    without assigning individual blame, focusing instead on systemic fixes.
    """
    incident_id: str
    service_name: str
    severity: int
    timeline: list[dict]  # From IncidentTimeline.get_timeline()
    direct_cause: str     # Immediate technical trigger
    root_causes: list[str] = field(default_factory=list)
    findings: list[PostmortemFinding] = field(default_factory=list)
    resolution_steps: list[str] = field(default_factory=list)
    
    def generate_improvement_tickets(self) -> list[dict]:
        """Convert postmortem findings into actionable improvement tickets.
        
        Each ticket must have a clear owner, priority, and deadline.
        Tickets are the primary deliverable of any postmortem process.
        
        Returns:
            List of ticket dicts ready for project management system import.
        """
        tickets = []
        for i, finding in enumerate(self.findings):
            tickets.append({
                "title": finding.ticket_title,
                "category": finding.category,
                "description": f"{finding.description}\n\nImpact: {finding.impact}\nRecommendation: {finding.recommendation}",
                "priority": finding.priority,
                "parent_incident": self.incident_id,
            })
        return tickets
    
    def generate_summary(self) -> str:
        """Generate a human-readable postmortem summary for stakeholders."""
        lines = [
            f"## Postmortem: {self.service_name} ({self.incident_id})",
            f"Severity: SEV-{self.severity}",
            f"Root Causes:\n" + "\n".join(f"  - {rc}" for rc in self.root_causes),
            "",
            "## Action Items",
        ]
        for finding in self.findings:
            lines.append(f"- **[{finding.priority}]** {finding.recommendation}")
        return "\n".join(lines)


# Usage example: structure findings from a payment gateway incident
if __name__ == "__main__":
    pm = BlamelessPostmortem(
        incident_id="INC-20260101-1",
        service_name="payment-gateway",
        severity=1,
        timeline=[],  # Would be populated from IncidentTimeline
        direct_cause="Connection pool exhaustion after database failover increased query latency by 40x",
        root_causes=[
            "Connection pool size was hardcoded to 20 — insufficient for failover burst traffic",
            "No circuit breaker between payment service and database — failures cascaded",
            "Health checks passed even while connections were queuing — monitoring gap",
        ],
        findings=[
            PostmortemFinding(
                category="preventable",
                description="Connection pool size hardcoded to 20, insufficient for failover burst",
                impact="Pool exhaustion caused all payment requests to queue until timeout (30s)",
                recommendation="Make connection pool size configurable and set min/max based on expected failover traffic patterns. Add pool usage metrics alerting at 80% capacity.",
                priority=1,
            ),
            PostmortemFinding(
                category="preventable",
                description="No circuit breaker between payment service and database",
                impact="Database slowdown cascaded to complete payment service outage",
                recommendation="Implement circuit breaker with configurable failure threshold (5 consecutive failures) and half-open retry after 30 seconds. See coding-microservice-resilience-patterns skill.",
                priority=1,
            ),
            PostmortemFinding(
                category="detectable",
                description="Health check endpoint returned healthy while connections were queuing",
                impact="Monitoring did not surface the degradation until error rate alerts fired 8 minutes later",
                recommendation="Update health check to verify connection availability by performing a real database query. Alert on queue depth > 10.",
                priority=2,
            ),
        ],
    )
    
    print(pm.generate_summary())
    for ticket in pm.generate_improvement_tickets():
        print(f"\nTicket: {ticket['title']} (Priority: {ticket['priority']})")
```

---

## Constraints

### MUST DO
- Classify severity using quantifiable metrics (error rate %, affected user %, latency p95) — never use subjective terms like "big problem" or "feels slow" for incident classification
- Restore service before investigating root cause during active response — the priority is always user impact reduction, not understanding why it broke
- Maintain a real-time incident timeline documenting every action taken with timestamps and outcomes — this forms the foundation of the postmortem investigation
- Follow the blameless principle in all postmortems: focus on system design flaws, not individual mistakes. The question is "what allowed this to happen" not "who caused this"
- Convert every postmortem finding into an actionable improvement ticket with priority and deadline — findings without follow-up tickets are wasted effort
- Designate a dedicated incident commander who does NOT fix code during active response — their sole job is coordination, communication, and decision-making
- Send status updates at minimum every 15 minutes during active incidents regardless of progress — silence creates anxiety and escalates stakeholder pressure

### MUST NOT DO
- Never assign individual blame during incident response or postmortem — this suppresses honest reporting and prevents learning from systemic issues
- Attempt root cause analysis during active service restoration — diagnosis without restoration priority extends user impact and should be done in the postmortem phase
- Declare an incident resolved based solely on internal health checks passing — always verify actual user-facing metrics are normal (error rate, latency, key transactions succeed)
- Skip the postmortem for SEV-1 or SEV-2 incidents under any timeline pressure — the cost of recurrence far exceeds the 48-hour investigation window
- Create improvement tickets without clear owners and deadlines — vague follow-up items like "look into monitoring" will never be completed and repeat the incident
- Let the original on-call engineer run their own postmortem alone — postmortems require collective review from all responders, stakeholders, and system designers

---

## Output Template

When conducting incident response or postmortem analysis, produce:

1. **Incident Classification** — Severity level with quantifiable justification (error rate %, affected users %, latency p95), exact impact scope
2. **Action Plan** — Step-by-step remediation prioritized by user impact reduction, not technical curiosity
3. **Timeline Reconstruction** — Chronological log of all actions taken, decisions made, and outcomes observed during response
4. **Blameless Postmortem Summary** — Root causes categorized as preventable/detectable/containable with specific system design flaws identified
5. **Improvement Tickets** — Action items derived from postmortem findings with priority levels (1-4), descriptions, and recommended owners

---

## Related Skills

| Skill | Purpose |
|---|---|
| `systematic-debugging` | Root cause investigation methodology for individual bugs; use this during postmortem phase to analyze specific failure points |
| `observability-patterns` | Metrics, logging, and tracing setup that enables faster incident detection; preventive skill used before incidents occur |
| `engineering-principles` | Foundational software engineering principles that prevent common failure modes when designing resilient systems |
| `production-logging` | Structured logging practices that provide the signal needed during incident investigation to reconstruct what happened |
