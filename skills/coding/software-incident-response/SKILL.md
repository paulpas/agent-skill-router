---
name: software-incident-response
description: Handles production incidents with systematic root-cause analysis, incident response procedures, communication protocols, and post-incident learning to minimize downtime and prevent recurrence.
license: MIT
compatibility: opencode
archetypes:
  - tactical
  - diagnostic
anti_triggers:
  - brainstorming
  - vague ideation
  - prevention planning
  - monitoring setup
response_profile:
  verbosity: low
  directive_strength: high
  abstraction_level: operational
metadata:
  version: "1.0.0"
  domain: coding
  triggers: incident response, root cause analysis, production troubleshooting, post-mortem, how do i respond to incidents, production failures, incident management
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: production-readiness, observability-patterns, observability-engineering, systematic-debugging
  maturity: stable
  completeness: 95
  exampleCount: 4
---

# Software Incident Response

Handles active production incidents with systematic triage, root-cause analysis, incident response procedures, communication protocols, and structured post-incident learning to minimize downtime and prevent recurrence. When loaded, the model acts as an on-call engineer triaging and managing production outages.

## TL;DR Checklist

- [ ] Start incident timeline immediately (before diagnosing) — record every action, output, and decision with precise timestamps
- [ ] Classify severity: SEV-1 (total outage, customers impacted) → escalate; SEV-2 (degraded, subset impacted) → investigate; SEV-3 (minor, single feature) → document; SEV-4 (no customer impact) → trace only
- [ ] Isolate root cause by working backwards from the failure: What changed? When did it change? Which layer was affected first?
- [ ] Implement targeted fix only — never apply broad, untested changes during active incident; test fix locally in production-like environment first
- [ ] Declare "all clear" only after: (1) symptoms fully resolved, (2) mitigation validated under load, (3) monitoring confirms recovery
- [ ] Capture postmortem within 24 hours: timeline, root cause, contributing factors, action items — focus on systems, not blame
- [ ] Track action items as backlog tickets; link to incident for context

---

## When to Use

Use this skill when:

- A production system becomes unavailable or degraded (API timeouts, database failures, service crashes)
- A critical bug is discovered in production affecting user experience or data correctness
- You are on-call and need to triage an incoming alert or user report
- You need to systematically investigate why a service is misbehaving (high latency, error rate spikes, data inconsistency)
- You are leading a postmortem review after an incident has been resolved
- You need to establish incident communication, severity classification, or escalation procedures

---

## When NOT to Use

Avoid this skill for:

- **Incident prevention/design** — use `production-readiness` for designing resilient systems
- **Monitoring/observability setup** — use `observability-engineering` for setting up dashboards, alerts, and logging infrastructure
- **Performance optimization in non-critical contexts** — this skill is for emergencies, not routine tuning
- **Debugging pre-production code** — use `systematic-debugging` for local development troubleshooting
- **Architecture design or refactoring** — save architectural decisions for post-incident planning, not during outages
- **Writing runbooks or playbooks** — that is prevention; this skill handles active incidents

---

## Core Workflow

1. **Declare Incident and Classify Severity** — The moment you suspect a production incident, open an incident channel (Slack, PagerDuty, war room call) and classify it:
   - **SEV-1**: Total or near-total outage, all/most users impacted, revenue impacting
   - **SEV-2**: Significant degradation, subset of users impacted, service partially functional
   - **SEV-3**: Minor issue affecting single feature or small user group, workaround available
   - **SEV-4**: No customer-facing impact, internal system only, no urgency
   
   **Checkpoint:** Severity classification determines escalation path. SEV-1 requires immediate escalation to engineering leadership and on-call manager. SEV-2 requires engineering team + product. SEV-3/4 can be handled by single engineer. Confirm severity with product/customer before proceeding.

2. **Start Incident Timeline (Immediately, in Parallel)** — Create a structured log of all actions, system changes, and findings. Do not wait for diagnosis — timeline starts the moment incident is declared. Record:
   - Incident declared at [timestamp]
   - Initial symptom reported by [who]: [what exactly failed]
   - Which services/users affected
   - Any recent deployments, configuration changes, or infrastructure changes in the last 24 hours
   - All investigative actions with timestamps and results
   
   **Checkpoint:** Every major diagnostic action (log grep, metric query, service restart) must be recorded with timestamp. At end of incident, timeline should read like a narrative of "what happened and what we did about it."

3. **Gather System State and Identify Failure Layer** — Collect evidence from all relevant layers simultaneously (do not investigate sequentially):
   - **Application Layer**: Check service logs, error rates, exception stack traces, request traces (if available)
   - **Database Layer**: Check connection pool status, slow query logs, replication lag, disk space, lock contention
   - **Infrastructure Layer**: Check CPU/memory/disk metrics, network errors, container restarts, kernel logs (if Kubernetes)
   - **External Dependencies**: Check third-party service status pages, API response codes, rate limit hits
   - **Recent Changes**: Diff last known-good deployment vs. current; check git logs, Terraform state changes, config changes
   
   **Checkpoint:** After 5-10 minutes of data collection, you should be able to answer: "What layer failed first?" (network, database, application, external service, or human error). If you cannot isolate the layer, expand the search or escalate.

4. **Perform Root Cause Analysis Using Backtracking** — Do not guess or make broad changes. Instead:
   - Start with the observable failure (e.g., "API returns 500 errors")
   - Ask: What caused this? (e.g., "Database connection pool exhausted")
   - Ask: What caused that? (e.g., "Service spawned excessive connections")
   - Ask: What caused that? (e.g., "Connection cleanup loop was disabled in last deploy")
   - Continue until you reach the root cause (a specific code change, config mistake, or infrastructure limit)
   
   Evidence of root cause: You can explain the failure chain end-to-end and can point to a specific change, log line, or metric that proves it. Use logs, metrics, and code diffs as evidence — never rely on intuition alone. If you suspect a cause but have no evidence, that is not the root cause yet; keep investigating.
   
   **Checkpoint:** Root cause analysis is complete when: (1) you can explain the failure chain, (2) you have specific evidence (log lines, code diffs, metric graphs), and (3) applying a targeted fix would resolve the issue.

5. **Implement Targeted Mitigation and Fix** — Once root cause is identified, decide: mitigation (quick workaround to restore service) or permanent fix (address root cause):
   - **Mitigation** (faster, restores service immediately): Roll back last deploy, kill problematic connections, bypass feature flag, scale up horizontally, drain traffic from failing datacenter
   - **Permanent Fix** (thorough, prevents recurrence): Deploy patched code, update config, add database index, increase limits, fix data corruption
   
   Execute only ONE targeted change at a time. Do not apply multiple fixes in parallel — if one fails, you will not know which caused the problem. Test fix in a staging environment that matches production (same data volume, traffic patterns, dependencies) before rolling to production. If staging is not available, apply fix to a canary/subset of traffic first. **Record fix deployment timestamp and initial results immediately.**
   
   **Checkpoint:** After deployment, monitor error rates, latency, and throughput for 2–5 minutes (depending on incident severity and traffic volume). If metrics do not improve, roll back immediately and return to Root Cause Analysis step.

6. **Validate Recovery and Declare All Clear** — Once metrics show recovery:
   - Confirm user-facing behavior is restored (run manual smoke tests if needed)
   - Validate no secondary failures (check error logs, alert history for cascading issues)
   - Ensure no new problems introduced (run quick integration tests or health check scripts)
   - Monitor for 15–30 minutes before declaring incident fully resolved
   - Only then: "All clear" announcement to stakeholders
   
   **Checkpoint:** Do not declare all clear until: (1) error rates normalized, (2) latency returned to baseline, (3) no user complaints in the last 10 minutes of monitoring, (4) you have verified the fix with evidence (not just "looks good").

7. **Capture Postmortem Timeline and Action Items (Within 24 Hours)** — While incident is fresh:
   - Write chronological timeline (use timestamps from your incident log)
   - State root cause clearly and concisely
   - Identify contributing factors (gaps in observability, lack of safeguards, no test coverage for edge case, poor runbook)
   - Create action items: What will prevent this from happening again? (Add monitoring, add test, add circuit breaker, add validation)
   - Assign owners and deadlines to action items
   - Schedule follow-up review in 1 week to track progress
   
   **Checkpoint:** Postmortem is blameless — focus on system failures and process gaps, not individuals. Example: "The code lacked validation for edge case X" not "Engineer Y deployed without testing." This builds psychological safety and ensures people report issues early.

---

## Implementation Patterns

### Pattern 1: Incident Timeline Logger (Python)

```python
import json
from datetime import datetime
from typing import Optional, Dict, Any
from enum import Enum
import logging

logger = logging.getLogger(__name__)


class SeverityLevel(Enum):
    """Incident severity classification."""
    SEV_1 = "sev-1"      # Total outage, customer impacting, revenue loss
    SEV_2 = "sev-2"      # Significant degradation, subset of users affected
    SEV_3 = "sev-3"      # Minor issue, single feature or small user group
    SEV_4 = "sev-4"      # No customer impact, internal systems only


class IncidentTimeline:
    """Structured incident timeline logger.
    
    Records all incident events with precise timestamps, severity classification,
    and supporting context. Output is JSON for machine parsing and human readability.
    """
    
    def __init__(self, incident_id: str, service: str, severity: SeverityLevel):
        """Initialize incident timeline.
        
        Args:
            incident_id: Unique identifier (e.g., INC-2024-001 or UUID)
            service: Primary affected service name
            severity: Initial severity classification
        """
        self.incident_id = incident_id
        self.service = service
        self.severity = severity
        self.declared_at = datetime.utcnow()
        self.events: list[Dict[str, Any]] = []
        
        # Record incident declaration
        self.add_event(
            "incident_declared",
            f"Incident declared for {service}",
            severity=severity.value
        )
    
    def add_event(
        self,
        event_type: str,
        description: str,
        **context
    ) -> None:
        """Record a timestamped incident event.
        
        Args:
            event_type: Type of event (investigation_started, finding, fix_deployed, etc.)
            description: Human-readable description of what happened
            **context: Additional context as key-value pairs (e.g., error_rate=95.5, duration_minutes=15)
        """
        event = {
            "timestamp": datetime.utcnow().isoformat(),
            "type": event_type,
            "description": description,
            **context
        }
        self.events.append(event)
        logger.info(f"[{self.incident_id}] {event_type}: {description}")
    
    def add_finding(self, finding: str, evidence: Optional[str] = None) -> None:
        """Record a diagnostic finding or observation.
        
        Args:
            finding: What was discovered (e.g., "Database connection pool exhausted")
            evidence: Supporting evidence (log line, metric value, or command output)
        """
        context = {}
        if evidence:
            context["evidence"] = evidence
        self.add_event("finding", finding, **context)
    
    def add_mitigation(self, action: str, duration_seconds: Optional[int] = None) -> None:
        """Record a mitigation or fix deployment.
        
        Args:
            action: Description of mitigation applied (e.g., "Rolled back deploy abc1234")
            duration_seconds: How long the fix took to execute/propagate
        """
        context = {}
        if duration_seconds is not None:
            context["duration_seconds"] = duration_seconds
        self.add_event("mitigation", action, **context)
    
    def add_validation(self, check: str, result: bool, details: Optional[str] = None) -> None:
        """Record a recovery validation check.
        
        Args:
            check: What was validated (e.g., "Error rate returned to baseline")
            result: True if validation passed, False if it failed
            details: Additional context about the result
        """
        context = {"passed": result}
        if details:
            context["details"] = details
        self.add_event("validation", check, **context)
    
    def export_json(self) -> str:
        """Export timeline as JSON for incident database/archive."""
        return json.dumps({
            "incident_id": self.incident_id,
            "service": self.service,
            "severity": self.severity.value,
            "declared_at": self.declared_at.isoformat(),
            "duration_minutes": (datetime.utcnow() - self.declared_at).total_seconds() / 60,
            "event_count": len(self.events),
            "events": self.events
        }, indent=2)
    
    def export_markdown(self) -> str:
        """Export timeline as Markdown for incident report/postmortem."""
        lines = [
            f"# Incident Report: {self.incident_id}",
            f"**Service:** {self.service}",
            f"**Severity:** {self.severity.value.upper()}",
            f"**Declared:** {self.declared_at.isoformat()}",
            f"**Duration:** {(datetime.utcnow() - self.declared_at).total_seconds() / 60:.1f} minutes",
            "",
            "## Timeline",
            ""
        ]
        
        for event in self.events:
            timestamp = event["timestamp"]
            event_type = event["type"]
            description = event["description"]
            lines.append(f"- **{timestamp}** [{event_type}] {description}")
            
            # Include evidence or details if present
            for key in ["evidence", "details", "severity"]:
                if key in event:
                    lines.append(f"  - {key}: {event[key]}")
        
        return "\n".join(lines)
```

### Pattern 2: Root Cause Analysis Investigation (Bash + Python)

```bash
#!/bin/bash
# Incident investigation script: systematically gather evidence from all layers

set -euo pipefail

INCIDENT_ID="${1:-INC-$(date +%s)}"
SERVICE="${2:-unknown}"
OUTPUT_DIR="/tmp/incident-${INCIDENT_ID}"

mkdir -p "$OUTPUT_DIR"

echo "[${INCIDENT_ID}] Starting incident investigation for service: ${SERVICE}"
echo "[${INCIDENT_ID}] Output directory: ${OUTPUT_DIR}"

# Layer 1: Application Layer
echo "[${INCIDENT_ID}] Gathering application logs..."
kubectl logs -n production "deployment/${SERVICE}" --tail=200 --timestamps=true \
    > "$OUTPUT_DIR/app_logs.txt" 2>&1 || echo "kubectl logs failed - check service name"

# Layer 2: Metrics - Error Rate
echo "[${INCIDENT_ID}] Checking error rates (requires Prometheus access)..."
cat > "$OUTPUT_DIR/error_rate_query.promql" << 'EOF'
# Query error rate over last 30 minutes
rate(http_request_errors_total[5m]) / rate(http_requests_total[5m])
EOF

# Layer 3: Recent Deployments
echo "[${INCIDENT_ID}] Checking recent deployments..."
kubectl rollout history "deployment/${SERVICE}" -n production \
    > "$OUTPUT_DIR/deployment_history.txt" 2>&1 || true

# Layer 4: Database Connection Pool
echo "[${INCIDENT_ID}] Checking database connections..."
psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c \
    "SELECT datname, count(*) FROM pg_stat_activity GROUP BY datname;" \
    > "$OUTPUT_DIR/db_connections.txt" 2>&1 || echo "Database query failed"

# Layer 5: Recent Code Changes
echo "[${INCIDENT_ID}] Checking recent Git commits..."
git log --oneline -20 "${SERVICE}/" > "$OUTPUT_DIR/recent_commits.txt" 2>&1 || true

# Layer 6: Diff Last Known-Good vs. Current
echo "[${INCIDENT_ID}] Generating code diff from last stable tag..."
LAST_STABLE=$(git describe --tags --abbrev=0)
git diff "$LAST_STABLE..HEAD" "${SERVICE}/" > "$OUTPUT_DIR/code_changes.diff" 2>&1 || true

echo ""
echo "[${INCIDENT_ID}] Investigation complete. Summary:"
echo "  - Application logs: $OUTPUT_DIR/app_logs.txt"
echo "  - Deployment history: $OUTPUT_DIR/deployment_history.txt"
echo "  - Database connections: $OUTPUT_DIR/db_connections.txt"
echo "  - Recent commits: $OUTPUT_DIR/recent_commits.txt"
echo "  - Code diff: $OUTPUT_DIR/code_changes.diff"
echo ""
echo "[${INCIDENT_ID}] Next: Analyze logs for exceptions, check metrics for spike timing,"
echo "                and correlate code changes with failure start time."
```

### Pattern 3: Severity Classification and Escalation (Python)

```python
from enum import Enum
from typing import Callable, Optional, List
from dataclasses import dataclass
from datetime import datetime


class SeverityLevel(Enum):
    """Standard incident severity levels."""
    SEV_1 = 1  # Total outage, revenue impact
    SEV_2 = 2  # Significant degradation
    SEV_3 = 3  # Minor issue
    SEV_4 = 4  # No customer impact


@dataclass
class EscalationPath:
    """Who to notify for each severity level."""
    severity: SeverityLevel
    immediate_notify: List[str]  # People/channels to notify immediately
    escalation_delay_minutes: int  # How long before escalating further
    sla_response_minutes: int
    sla_resolution_hours: int


# Escalation matrix
ESCALATION_PATHS = {
    SeverityLevel.SEV_1: EscalationPath(
        severity=SeverityLevel.SEV_1,
        immediate_notify=["on-call-engineer", "engineering-lead", "vp-engineering", "product-lead"],
        escalation_delay_minutes=5,
        sla_response_minutes=5,
        sla_resolution_hours=1
    ),
    SeverityLevel.SEV_2: EscalationPath(
        severity=SeverityLevel.SEV_2,
        immediate_notify=["on-call-engineer", "service-owner"],
        escalation_delay_minutes=15,
        sla_response_minutes=15,
        sla_resolution_hours=4
    ),
    SeverityLevel.SEV_3: EscalationPath(
        severity=SeverityLevel.SEV_3,
        immediate_notify=["service-owner"],
        escalation_delay_minutes=60,
        sla_response_minutes=60,
        sla_resolution_hours=24
    ),
    SeverityLevel.SEV_4: EscalationPath(
        severity=SeverityLevel.SEV_4,
        immediate_notify=[],
        escalation_delay_minutes=480,  # 8 hours
        sla_response_minutes=480,
        sla_resolution_hours=168  # 1 week
    ),
}


def classify_incident(
    user_impact: bool,
    error_rate: float,
    affected_users_percentage: float,
    revenue_impact: bool = False
) -> SeverityLevel:
    """Classify incident severity based on objective criteria.
    
    Args:
        user_impact: True if any users are affected
        error_rate: Percentage of requests failing (0-100)
        affected_users_percentage: Percentage of total users affected (0-100)
        revenue_impact: True if payment processing is affected
    
    Returns:
        SeverityLevel classification
    """
    # SEV-1: Total or near-total outage with revenue impact
    if revenue_impact and error_rate > 90:
        return SeverityLevel.SEV_1
    
    # SEV-1: All or most users affected
    if affected_users_percentage > 75 and error_rate > 50:
        return SeverityLevel.SEV_1
    
    # SEV-2: Significant degradation affecting subset of users
    if user_impact and error_rate > 25 and affected_users_percentage > 10:
        return SeverityLevel.SEV_2
    
    # SEV-3: Minor issue affecting small user group
    if user_impact and error_rate > 5:
        return SeverityLevel.SEV_3
    
    # SEV-4: No customer impact
    return SeverityLevel.SEV_4


def escalate_incident(severity: SeverityLevel, incident_id: str) -> None:
    """Execute escalation protocol for given severity.
    
    Args:
        severity: Severity level of the incident
        incident_id: Unique incident identifier
    """
    path = ESCALATION_PATHS[severity]
    print(f"[{incident_id}] Escalating to: {', '.join(path.immediate_notify)}")
    print(f"[{incident_id}] SLA Response: {path.sla_response_minutes} minutes")
    print(f"[{incident_id}] SLA Resolution: {path.sla_resolution_hours} hours")
    
    # In production, this would send Slack messages, PagerDuty alerts, etc.
    for contact in path.immediate_notify:
        print(f"  → Notifying {contact} (immediate)")
```

### Pattern 4: Postmortem Template and Action Items

```python
from datetime import datetime, timedelta
from typing import List, Optional
from dataclasses import dataclass, field


@dataclass
class ActionItem:
    """Post-incident action item to prevent recurrence."""
    id: str
    description: str
    category: str  # "observability", "testing", "safeguards", "documentation"
    owner: str
    due_date: str
    priority: str  # "high", "medium", "low"
    status: str = "open"  # "open", "in_progress", "completed"
    completed_date: Optional[str] = None


@dataclass
class IncidentPostmortem:
    """Structured postmortem for incident analysis and learning."""
    incident_id: str
    service: str
    severity: str
    start_time: str
    end_time: str
    duration_minutes: int
    root_cause: str  # Clear, concise explanation of what failed
    timeline: str  # Chronological narrative of events
    contributing_factors: List[str] = field(default_factory=list)
    action_items: List[ActionItem] = field(default_factory=list)
    
    def add_action_item(
        self,
        description: str,
        category: str,
        owner: str,
        priority: str = "medium"
    ) -> ActionItem:
        """Add an action item to prevent recurrence.
        
        Args:
            description: What needs to be done
            category: Type of action (observability, testing, safeguards, documentation)
            owner: Person responsible for completing it
            priority: high/medium/low
        """
        item_id = f"{self.incident_id}-action-{len(self.action_items) + 1}"
        due_date = (datetime.now() + timedelta(days=7)).isoformat()  # 1 week default
        
        item = ActionItem(
            id=item_id,
            description=description,
            category=category,
            owner=owner,
            due_date=due_date,
            priority=priority
        )
        self.action_items.append(item)
        return item
    
    def export_markdown(self) -> str:
        """Export postmortem as Markdown for Confluence/wiki."""
        lines = [
            f"# Postmortem: {self.incident_id}",
            f"**Service:** {self.service}",
            f"**Severity:** {self.severity}",
            f"**Duration:** {self.duration_minutes} minutes ({self.start_time} - {self.end_time})",
            "",
            "## Executive Summary",
            f"{self.root_cause}",
            "",
            "## Timeline",
            self.timeline,
            "",
            "## Root Cause",
            f"{self.root_cause}",
            "",
            "## Contributing Factors",
        ]
        
        for factor in self.contributing_factors:
            lines.append(f"- {factor}")
        
        lines.extend(["", "## Action Items"])
        
        for item in self.action_items:
            lines.append(
                f"- [{item.status}] **{item.description}** (@{item.owner}, due {item.due_date}, {item.priority})"
            )
        
        return "\n".join(lines)


# Example usage
def create_postmortem_example():
    """Example postmortem from a real incident."""
    pm = IncidentPostmortem(
        incident_id="INC-2024-042",
        service="payment-processor",
        severity="sev-2",
        start_time="2024-05-15T14:32:00Z",
        end_time="2024-05-15T15:18:00Z",
        duration_minutes=46,
        root_cause="Connection pool exhaustion in database driver. Recent code change increased default max_connections from 20 to 200, but application spawned connections without cleanup, causing rapid pool depletion within 5 minutes of deployment."
    )
    
    pm.contributing_factors = [
        "No automated test for high-concurrency scenarios",
        "Missing metrics for connection pool usage",
        "No gradual rollout strategy (deployed to 100% immediately)",
        "No circuit breaker to drop requests when pool was exhausted"
    ]
    
    pm.add_action_item(
        "Add connection pool monitoring to dashboard",
        "observability",
        "alice@company.com",
        "high"
    )
    
    pm.add_action_item(
        "Add integration test for high-concurrency connection behavior",
        "testing",
        "bob@company.com",
        "high"
    )
    
    pm.add_action_item(
        "Implement connection pool circuit breaker",
        "safeguards",
        "charlie@company.com",
        "medium"
    )
    
    pm.add_action_item(
        "Document connection pool sizing for team",
        "documentation",
        "diana@company.com",
        "low"
    )
    
    return pm
```

---

## MUST DO

- **Start incident timeline immediately** — Before diagnosing, begin recording actions with timestamps. Timeline is your single source of truth.
- **Classify severity correctly** — Use objective criteria (customer impact, error rate, affected users). SEV-1 gets immediate escalation; SEV-4 does not.
- **Work backwards from failure** — Find root cause by asking "What changed?" and "When did it change?" Use logs and diffs as evidence.
- **Deploy one targeted fix at a time** — Apply one mitigation, monitor results, only then apply another. Multiple simultaneous changes obscure which one worked.
- **Validate recovery before declaring all clear** — Check metrics, run smoke tests, monitor for 15+ minutes after fix deployment.
- **Write blameless postmortems within 24 hours** — Focus on systems and process gaps, not individuals. Capture action items with owners and deadlines.
- **Record every diagnostic action with timestamp** — "Checked logs" is useless; "15:42 UTC: Searched logs for 'connection timeout' and found 300+ errors starting at 15:35 UTC" is actionable.
- **Involve the right people** — For SEV-1, notify engineering lead and product immediately. For SEV-3/4, one engineer can investigate.

---

## MUST NOT DO

- **Do not diagnose before recording timeline** — If you spend 30 minutes investigating before writing anything down, you will lose critical context.
- **Do not apply broad, untested changes during active incidents** — Never refactor code, update dependencies, or make architectural changes in the middle of an outage. Apply targeted fixes only.
- **Do not declare "all clear" until metrics confirm recovery** — Gut feeling is not evidence. Wait for dashboards to show normal error rates, latency, and throughput.
- **Do not skip root cause analysis** — Rolling back or restarting a service restores service but does not prevent recurrence. Always dig to root cause.
- **Do not blame individuals in postmortems** — Write "process lacked validation X" not "engineer Y made a mistake." Blame erodes psychological safety and hides future problems.
- **Do not ignore contributing factors** — If test coverage was low, mention it. If observability was poor, mention it. Fix the system, not just the code.
- **Do not investigate sequentially** — Gather data from all layers simultaneously (application, database, infrastructure, external). Sequential investigation wastes time.
- **Do not deploy to production during incident investigation** — If you are still diagnosing, any deploy is guesswork. Wait until you have confidence in your fix.
- **Do not lose context between shifts** — If incident spans multiple on-call handoffs, ensure timeline is written and accessible. New engineer should understand what happened without asking questions.

---

## Constraints for Code Generation

When implementing incident response tooling:

1. **Logging must include microsecond-precision timestamps** — Use ISO 8601 format (`datetime.utcnow().isoformat()`)
2. **Severity classification must be deterministic** — Use objective criteria (error rate %, users affected %), not hunches
3. **Timeline output must be both JSON and Markdown** — JSON for machine parsing into incident database, Markdown for human readability in postmortems
4. **Root cause analysis tools must support three investigation patterns**: Layer-based (which layer failed?), timeline-based (when did failure start?), and code-based (what changed?)
5. **Escalation paths must be explicit and configurable** — Different organizations have different on-call structures
6. **Postmortem action items must have owners, deadlines, and categories** — Unowned action items are forgotten action items

---

## Output Template

When responding to incident-response requests, provide:

1. **Incident Classification** — Severity level with justification based on user impact, error rate, affected percentage
2. **Investigation Checklist** — Ordered steps to gather evidence from all layers (application, database, infrastructure, external)
3. **Root Cause Finding** — Explanation of what failed and chain of causation (why it failed, what triggered the failure, what safeguards were missing)
4. **Targeted Mitigation** — Specific action to restore service (not "optimize code" but "roll back deploy X" or "restart service on pod Y")
5. **Recovery Validation Steps** — Specific checks to confirm fix worked (metric thresholds, smoke tests, duration of monitoring)
6. **Postmortem Action Items** — 3–5 items to prevent recurrence, with owners and deadlines

---

## Related Skills

| Skill | Purpose |
|---|---|
| `production-readiness` | Designing systems to be resilient to failure and avoid incidents in the first place |
| `observability-engineering` | Setting up monitoring, logging, metrics, and alerting infrastructure to detect incidents early |
| `observability-patterns` | Query patterns and alert design for specific use cases (database, cache, API) |
| `systematic-debugging` | Local development debugging techniques (not for production incidents) |

---

