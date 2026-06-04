---
name: production-readiness
description: Evaluates service readiness against Google SRE PRR framework covering
  reliability, observability, scalability, security, data management, deployment engineering,
  cost governance, and documentation for safe production deployment.
license: MIT
compatibility: opencode
metadata:
version: "1.0.0"
  domain: coding
  triggers: production readiness, SRE review, deployment criteria, observability setup,
    canary deployment, on-call coverage, SLO SLI, error budget, golden signals, how
    do i know my service is production ready, operational excellence, hypercare period
  archetypes:
  - diagnostic
  - educational
  anti_triggers:
  - brainstorming
  - vague ideation
  - code golf
  - over-engineering
  response_profile:
    verbosity: medium
    directive_strength: medium
    abstraction_level: tactical
  role: reference
  scope: infrastructure
  output-format: analysis
  content-types:
  - guidance
  - examples
  - do-dont
  - config
  related-skills: observability-patterns, technical-debt-management, architecture-decision-records
---
# Production Readiness Review

Evaluates and validates that services meet operational criteria before deploying to production. Applies the Google SRE PRR framework across eight categories — reliability, observability, scalability, security, data management, deployment engineering, cost governance, and documentation — ensuring teams ship with confidence rather than hope. This skill guides systematic pre-launch validation so that production deployments are deliberate, traceable, and reversible.

## TL;DR Checklist

- [ ] Service has at least 3 defined SLIs with corresponding SLO targets and an error budget policy
- [ ] Golden Signals dashboards (rate, latency p95/p99, error rate, saturation) are live and accessible
- [ ] Distributed tracing via OpenTelemetry is enabled with context propagation across all service boundaries
- [ ] Structured JSON logging with enforced levels and PII filtering is in place
- [ ] Circuit breakers and retry-with-jitter are implemented for all 7+ external dependencies
- [ ] Canary deployment path exists with automated rollback criteria defined
- [ ] Runbooks cover the top 5 failure modes with trigger conditions, diagnosis steps, and remediation
- [ ] Security scan shows zero critical CVEs; TLS 1.2+ enforced end-to-end; RBAC model documented
- [ ] Auto-scaling policies tested under load; connection pools sized for peak traffic
- [ ] Database backups verified with successful restore drill in the last 30 days

---

## When to Use

Use this skill when:

- Preparing a new service or major version for its first production deployment
- Conducting a Production Readiness Review (PRR) gate before releasing to users
- Validating that an existing production service still meets operational criteria after significant changes
- Onboarding a team to SRE practices and establishing readiness standards
- Evaluating whether a service should exit hypercare period into full ownership
- Performing quarterly operational audits of critical-path services

---

## When NOT to Use

Avoid this skill for:

- Internal development tools or non-user-facing infrastructure without SLA requirements (use lightweight checklist instead)
- One-off scripts, prototypes, or throwaway code that will never reach production
- Debugging an active production incident — use `incident-response` patterns instead
- General architectural design discussions before the readiness stage — focus on ADRs (`architecture-decision-records`) first

---

## Core Workflow

The Production Readiness Review follows the Google SRE PRR model, structured as a time-boxed evaluation with a clear decision gate.

1. **Pre-Review Preparation** — Service owner completes and distributes a readiness checklist at least 48 hours before the review: SLI/SLO definitions, architecture diagram with data flow, test results (unit, integration, load), security scan results, incident history for related systems, and draft runbooks covering the top 5 failure modes. **Checkpoint:** All materials must be distributed before scheduling; if any category is missing, request an extension or reduce scope.

2. **Architecture Walkthrough** (15 minutes) — Owner presents the system data flow, dependency graph, deployment topology, and failure boundaries. Focus on external dependencies, data persistence layer, and cross-service communication patterns. **Checkpoint:** Verify the diagram matches current deployed state; flag any undocumented services or APIs in the path.

3. **Reliability Assessment** (15 minutes) — Validate SLI/SLO definitions against actual user-facing behavior (not just internal metrics). Confirm error budget policy is defined, tracked, and that budget exhaustion triggers a defined response (e.g., feature freeze, dedicated stability sprint). Review resilience patterns: circuit breakers, retry policies with exponential backoff and jitter, bulkhead isolation for independent subsystems, and graceful degradation paths. **Checkpoint:** Every external dependency must have at least one resilience pattern applied; no dependency may operate without timeout configuration.

4. **Observability Check** (10 minutes) — Demonstrate live dashboards covering the Golden Signals. Verify distributed tracing spans cross service boundaries. Confirm that structured logs contain correlation IDs, are emitted in JSON format, and that PII is filtered at ingestion. Review alert routing: each active alert has an associated runbook page linked from the monitoring tool. **Checkpoint:** At least 80% of active alerts must have a runbook; no alert fires without a defined triage path.

5. **Security Review** (10 minutes) — Present vulnerability scan results (container images and dependency trees). Validate authentication model (mTLS between services, API key management, OAuth2/OIDC for external clients). Verify RBAC matrix is documented and enforced. Confirm encryption at rest (AES-256) and in transit (TLS 1.2+ minimum, TLS 1.3 preferred). Check that OWASP Top 10 mitigations are implemented. **Checkpoint:** Zero critical or high CVEs unpatched; no secrets stored in environment variables or source code.

6. **Operational Readiness** (10 minutes) — Walk through the deployment pipeline: immutable artifacts, canary strategy, automated rollback triggers, and feature flag configuration. Confirm on-call rotation is assigned, coverage has been tested with at least one scheduled drill, and escalation procedures are documented. Verify DORA metrics are tracked for the service. **Checkpoint:** On-call contact must be confirmed; rollback procedure must be testable without production data exposure.

7. **Decision Gate** — Review panel renders a verdict: Approve, Approve with Conditions, or Not Approved. If conditions are attached, set a remediation deadline (typically 14 days). Schedule a follow-up review for conditional approvals before they expire. **Checkpoint:** Document the decision, all findings, and action items in a shared record; notify stakeholders within one business day.

---

## Reference Guide — Production Readiness Categories

### Category 1: Reliability & Availability

A production service must demonstrate predictable behavior under normal load and graceful degradation under stress.

**Criteria:**
- Define at least 3 Service Level Indicators (SLIs) that map directly to user experience — e.g., HTTP success rate, p99 latency for the primary API endpoint, database query timeout rate.
- Set SLO targets aligned with business impact: Tier-1 services require ≥ 99.95% availability; Tier-2 requires ≥ 99.9%.
- Implement an error budget policy: calculate remaining budget monthly, define consumption thresholds (warning at 50%, critical at 25%), and establish response procedures when exhausted.
- Apply circuit breakers to all external dependencies with configured failure thresholds, reset timeouts, and fallback behaviors.
- Configure retry policies using exponential backoff with jitter to prevent thundering herd problems on transient failures.
- Implement bulkhead isolation: independent connection pools and thread pools per downstream dependency so one failing service cannot cascade.
- Define graceful degradation paths for each major feature — what functionality remains when a secondary dependency is unavailable.
- Execute chaos engineering tests targeting the top 3 failure modes in the last quarter; document results and remediation actions.

**Common pitfall:** Defining SLIs on infrastructure metrics (CPU, memory) instead of user-facing signals (request success, latency). Infrastructure health does not equal user satisfaction.

### Code Example: SLO/SLI Definition Pattern

```python
from dataclasses import dataclass, field
from datetime import datetime, timedelta

@dataclass
class ServiceLevelObjective:
    """Defines a Service Level Objective for production readiness.
    
    SLIs measure user-facing signals; SLOs set the target bar.
    Error budget drives release velocity decisions.
    """
    name: str
    indicator: str  # e.g., "http_requests_total{status!~'5..'}"
    target: float   # e.g., 0.9995 for 99.95% availability
    window: timedelta = field(default=timedelta(days=30))
    
    def error_budget(self) -> float:
        return 1.0 - self.target
    
    def errors_allowed_in_window(self, total_requests: int) -> int:
        """Maximum number of errors allowed in the evaluation window."""
        max_errors = total_requests * (1.0 - self.target)
        return int(max_errors)

# Example: API availability SLO for a Tier-1 service
api_slo = ServiceLevelObjective(
    name="API Availability",
    indicator="http_request_success_rate",
    target=0.9995,  # 99.95% — ~4.3 minutes of downtime per month
)

# Example: Latency SLO for a Tier-2 service
latency_slo = ServiceLevelObjective(
    name="Checkout Latency",
    indicator="http_request_duration_seconds{quantile='0.99', handler='/checkout'}",
    target=0.99,    # 99% of requests under p99 latency target
)
```

### Category 2: Observability

Google's Three Pillars model provides the foundation: Metrics, Logging, and Tracing must all be operational before launch.

**Metrics — Golden Signals:**
- Rate: requests per second with status code histograms (2xx, 4xx, 5xx breakdown)
- Latency: p50, p95, p99 percentiles computed over rolling 5-minute windows
- Error rate: percentage of requests failing at the service boundary vs. downstream
- Saturation: connection pool utilization, thread pool usage, memory pressure relative to limits

**Logging:**
- All log output must be structured JSON with mandatory fields: `timestamp`, `level`, `service`, `trace_id`, `span_id`, `message`
- Enforce log levels application-wide: `DEBUG` for development only (never in production), `INFO` for operational events, `WARN` for recoverable anomalies, `ERROR` for failures requiring attention
- Implement PII filtering at the logging layer — redact fields matching known patterns (email, SSN, credit card numbers) before data reaches log storage
- Configure log retention policies aligned with compliance requirements (typically 90 days hot, 1 year warm archive)

**Tracing:**
- Deploy OpenTelemetry SDK in all services with automatic span generation for HTTP/gRPC/database calls
- Propagate trace context using W3C Trace Context headers across all service boundaries (no custom header formats)
- Configure sampling strategy: head-based sampling for high-volume services (e.g., 10% default), tail-based sampling for error traces (always sample 5xx responses and spans exceeding latency thresholds)
- Verify that trace dashboards show end-to-end request flows across all deployed microservices

### Category 3: Scalability & Performance

Production services must handle expected peak load with defined performance margins.

**Criteria:**
- Conduct load profiling: establish baseline, performance (2x expected traffic), and stress (5x expected traffic) benchmarks. Document p99 latency, throughput, and resource utilization at each level.
- Validate auto-scaling policies through actual testing: configure scale-up thresholds (e.g., CPU > 70% for 3 consecutive minutes) and verify scale-down doesn't cause request loss during cooldown periods.
- Size connection pools explicitly per downstream service — use the formula: `pool_size = (core_count * 2) + effective_spindle_count` for database connections, with maximum limits based on RDS/managed instance capacity.
- Implement rate limiting at the API boundary using a token bucket or sliding window algorithm; return proper HTTP 429 responses with retry-after headers.
- Design cache invalidation strategy with TTL bounds, stale-while-revalidate patterns, and cache stampede protection (lock-based refresh for high-traffic keys).
- Define performance budgets: p99 latency ≤ 300ms for API endpoints, database query time ≤ 50ms for primary reads. Flag any regression above budget as a P1 defect.

**Common pitfall:** Configuring auto-scaling thresholds without testing cooldown behavior. Services often scale up correctly but suffer request spikes during scale-down transitions that weren't anticipated.

### Code Example: Exponential Backoff with Jitter (Production-Ready Retry)

```python
import random
import time
from typing import Callable, Type, TypeVar

T = TypeVar("T")

def retry_with_backoff(
    func: Callable[..., T],
    max_retries: int = 3,
    base_delay: float = 1.0,
    max_delay: float = 60.0,
    jitter: bool = True,
    retryable_exceptions: tuple[Type[Exception], ...] = (ConnectionError, TimeoutError),
) -> T:
    """Retry with exponential backoff and random jitter to prevent thundering herd.

    Without jitter, multiple concurrent retries will synchronize and amplify
    the load on the recovering service — known as the "thundering herd" problem.
    Adding random variance desynchronizes retry attempts.

    Args:
        func: The callable to retry
        max_retries: Maximum number of retry attempts (default 3)
        base_delay: Initial delay in seconds (default 1.0)
        max_delay: Cap on delay to prevent excessive waits (default 60s)
        jitter: Whether to add random variance to delays
        retryable_exceptions: Tuple of exception types eligible for retry

    Returns:
        The result of the successful function call

    Raises:
        The last exception if all retries are exhausted
    """
    last_error = None
    for attempt in range(max_retries):
        try:
            return func()
        except retryable_exceptions as e:
            last_error = e
            delay = min(base_delay * (2 ** attempt), max_delay)
            if jitter:
                delay *= random.uniform(0.5, 1.5)
            time.sleep(delay)
    raise last_error
```

### Category 4: Security & Compliance

Security gates are non-negotiable prerequisites for production deployment.

**Criteria:**
- Enforce zero-trust network policies: no service-to-service communication is allowed by default; all traffic must be explicitly permitted via namespace-level or mesh-level policies.
- Implement mTLS between all services within the cluster; external API clients authenticate via OAuth2/OIDC with short-lived tokens (access token TTL ≤ 15 minutes).
- Document the RBAC model: enumerate all roles, their permissions matrix, and approval workflow for role changes. Apply principle of least privilege — no service account should have admin-level access.
- Encrypt data at rest using AES-256 encryption with keys managed through a dedicated KMS; rotate keys annually at minimum.
- Enforce TLS 1.2 as absolute minimum across all endpoints; prefer TLS 1.3 for new integrations. Disable deprecated cipher suites (RC4, DES, 3DES, CBC-mode ciphers).
- Run container image scanning in the CI/CD pipeline using Trivy or Grype; block deployment on critical/high severity findings.
- Scan dependencies with Snyk, Dependabot, or equivalent; track known CVEs with SLA-based remediation (critical: 24 hours, high: 7 days).
- Implement OWASP Top 10 mitigations: input validation on all entry points, parameterized queries for database access, CSRF tokens for state-changing operations, Content-Security-Policy headers.

### Category 5: Data Management & Persistence

Data integrity and availability are critical for production systems handling user data or transactional records.

**Criteria:**
- Verify database backups with actual restore drills — not just confirming backup jobs run, but that restored data matches source within acceptable tolerances (typically < 1 minute of lag for point-in-time recovery).
- Ensure migration scripts are idempotent and backward-compatible: running a script against an already-migrated database must succeed without side effects. Use versioned migrations with explicit forward and rollback paths.
- Configure read replicas for write-heavy services; verify that read traffic is correctly routed and replication lag stays below 100ms under normal load.
- Define data retention policies aligned with legal requirements: specify retention period, archive method, and secure destruction process per data class (PII, financial, operational).
- Implement dead letter queues for async processing pipelines; configure alerting when DLQ depth exceeds threshold (e.g., > 100 messages) to prevent silent data loss.

### Category 6: Deployment & Release Engineering

Production deployments must be repeatable, reversible, and observable.

**Criteria:**
- Use immutable artifacts: Docker images tagged with semver + git SHA; no "latest" tags in production. Sign images using Cosign or Notary for supply chain verification.
- Implement canary deployments: route 5% of traffic to new version for 15 minutes, evaluate error rate and latency metrics against baseline, then progressively increase to 25%, 50%, and 100%.
- Define automated rollback criteria: if error rate increases > 1% or p99 latency increases > 20% during canary phase, trigger automatic rollback within 60 seconds.
- Use feature flags for all non-trivial changes; ensure every flag has an owner, expiry date, and cleanup procedure. No permanent feature flags — they become technical debt.
- Track DORA metrics per service: deployment frequency, lead time for changes, change failure rate, and mean time to recovery (MTTR). Establish baselines at first production release.

### Category 7: Cost & Resource Management

Production services must demonstrate cost awareness and resource efficiency.

**Criteria:**
- Implement cost attribution: tag all resources with service name, team, and environment so costs appear in billing dashboards per service.
- Configure budget alerts at 50%, 80%, and 100% of monthly spend per service; alert the on-call engineer and team lead.
- Run idle resource detection weekly: flag services running > 90% underutilized for 7 consecutive days, or compute instances with zero traffic in 48 hours.
- Review reserved instance commitments quarterly — match reservation terms to actual predictable baseline load rather than peak capacity.

### Category 8: Documentation & Runbooks

Operations knowledge must survive team transitions and incident pressure.

**Criteria:**
- Maintain an architecture diagram showing all service boundaries, data flows, dependency relationships, and external integrations. Update within 48 hours of any architectural change.
- Publish a service catalog entry containing: service name, purpose, owner, team contact, SLI/SLO targets, deployment target (cluster/namespace), and health check endpoint.
- Provide an onboarding guide new engineers need to contribute meaningfully: repository layout, local development setup, testing commands, deployment process for staging, key dependencies to understand.
- Write runbooks for each active alert covering the top 5 failure modes. Each runbook must include: trigger condition (what alert fired), impact assessment (who is affected), diagnosis steps (commands or queries to investigate), remediation actions (how to fix), and escalation path if initial fix fails.

**Runbook template:**
```markdown
## Runbook: [Alert Name]

**Trigger:** Alert fires when [metric] exceeds [threshold] for [duration].
**Impact:** [Describe user-facing impact — e.g., "Users see 502 errors on checkout"]
**Diagnosis:**
1. Check [service] error logs: `kubectl logs -l app=[service] --tail=200 | grep ERROR`
2. Verify downstream dependency health: curl http://[dependency]/health
3. Review recent deployments: `git log --oneline HEAD~5..HEAD`
**Remediation:**
1. [Step-by-step fix procedure]
2. [Verification command]
**Escalation:** If unresolved after 15 minutes, page on-call secondary and notify service owner.
```

---

## Dev-to-Production Gap Analysis

The most common failures occur when development practices don't translate to production realities. Use this analysis to identify gaps before they cause incidents.

### Environment Parity Gaps

| Gap | Development Behavior | Production Reality | Mitigation |
|-----|---------------------|-------------------|------------|
| Data volume | Small seed dataset (100 rows) | Millions of records, query performance degrades | Load test with production-scale data subset; benchmark query plans |
| Network topology | Single node, localhost connections | Multi-AZ, service mesh, mTLS termination | Test failover across availability zones; validate TLS handshakes |
| Configuration | Hardcoded values or simple env vars | Secrets management, dynamic config, feature flags | Use parameterized configs with validation at startup |
| Resource limits | No constraints on local machine | CPU/memory quotas, OOM kills, throttling | Set resource requests/limits matching production; test under constrained resources |
| External dependencies | Mocked or stubbed responses | Rate-limited APIs, partial outages, version drift | Integrate with staging environments that mirror real dependency behavior |
| Traffic patterns | Uniform request rate during testing | Bursty traffic, daily/weekly cycles, seasonal spikes | Simulate burst patterns; implement backpressure and queue depth limits |

### Process Gaps

| Gap | Risk | Mitigation |
|-----|------|------------|
| No canary analysis | Full blast releases cause undetected regressions | Enforce 5% → 25% → 50% → 100% progression with metric gates |
| Undocumented runbooks | Extended MTTR during incidents; knowledge siloed | Mandatory runbook review as part of alert creation process |
| Alert fatigue | Critical alerts ignored among noise | Weekly alert triage; remove or suppress non-actionable alerts |
| No postmortem process | Repeat failures from same root causes | Blameless postmortems within 48 hours; track action items to completion |

### Technical Gaps

| Gap | Risk | Mitigation |
|-----|------|------------|
| Missing distributed tracing | Cannot diagnose cross-service failures | Deploy OpenTelemetry auto-instrumentation before production release |
| Connection pool mismanagement | Connection exhaustion under load | Benchmark pool sizing; implement idle connection eviction |
| Retry storms | Cascading failures when multiple services retry simultaneously | Enforce jitter in all retry logic; implement circuit breakers as secondary defense |
| Cache warmup differences | Cold cache causes latency spikes on restart | Implement cache warming strategy for critical data paths |
| Time-dependent bugs | Issues only manifest at day/month boundaries, leap years | Test boundary conditions explicitly; include timezone-aware tests |

### Security Gaps

| Gap | Risk | Mitigation |
|-----|------|------------|
| Network isolation missing | Lateral movement if a service is compromised | Enforce network policies at namespace level; validate with penetration testing |
| Credential management | Secrets in env vars or code repositories | Adopt secret rotation via Vault or equivalent; audit all credential locations |
| TLS termination gaps | Insecure communication between mesh nodes | Mandate mTLS in the service mesh configuration |
| Audit logging absent | Cannot detect or investigate security incidents | Enable audit trails for all authentication, authorization, and data access events |

---

### Code Example: Production Readiness Scorecard (YAML)

Use this YAML template to formalize review findings and track remediation conditions.

```yaml
service: "payment-processing-api"
review_date: "2026-05-21"
owner: "payments-team@example.com"
tier: 1
categories:
  reliability:
    status: PASS
    findings:
      - SLI defined: p99 latency < 300ms, availability > 99.95%
      - Error budget tracked: 0.42% remaining of 0.5% monthly budget
      - Circuit breakers for all 7 external dependencies configured
    risks:
      - External fraud detection API has no fallback — mitigation in progress
  observability:
    status: PASS_WITH_CONDITIONS
    findings:
      - Golden Signals dashboards live and accessible via Grafana
      - Distributed tracing enabled via OpenTelemetry across all services
      - Runbooks linked for 8 of 12 active alerts
    risks:
      - 4 runbooks missing — owner to complete within 7 days
  security:
    status: PASS
    findings:
      - Zero critical/high CVEs in container images or dependencies
      - mTLS enforced between all services via service mesh
      - TLS 1.3 configured for external-facing endpoints
  deployment:
    status: PASS
    findings:
      - Canary deployment pipeline automated with rollback criteria
      - Immutable artifacts: Docker images tagged with semver + git SHA
      - Feature flags implemented for 3 active canary features
decision: NOT_APPROVED
conditions:
  - Complete runbooks for top 4 alerts within 7 days (by 2026-05-28)
  - Deliver fraud detection API fallback implementation within 14 days
```

---

## Decision Gate Criteria

The review panel renders one of three decisions. Each has specific criteria:

### Approved ✅
All eight readiness categories pass with zero findings. SLI/SLO targets are validated against real traffic patterns. Error budget tracking is operational. Runbooks for all active alerts are tested. Security scan shows zero critical/high CVEs. On-call coverage is confirmed and tested.

### Approved with Conditions ⚠️
Minor gaps exist that can be remediated within 14 days without blocking the deployment. Typical conditions: missing runbooks for low-priority alerts, documentation updates pending, or a single non-critical CVE awaiting patch. The service may deploy immediately but must submit evidence of condition resolution before the deadline. A follow-up review is automatically scheduled.

### Not Approved ❌
Critical gaps prevent safe production deployment. Blocking conditions include: no SLIs defined (no way to measure success), no on-call coverage assigned, unpatched critical CVEs, missing runbooks for core failure modes, or failed security audit findings that cannot be mitigated. The service must address all blockers and re-enter the PRR process before any production deployment attempt.

---

## Constraints

### MUST DO
- Always define SLIs before SLOs — indicators measure user experience; targets set the bar
- Calculate error budget remaining at least weekly and publish to team channels
- Implement exponential backoff with jitter on every retry path — never use fixed-delay retries
- Run a restore drill for database backups at least quarterly, not just confirm backup jobs exist
- Enforce zero-trust network policies from day one; adding isolation after breach is far harder
- Require runbooks for every alert that pages an on-call engineer
- Use immutable artifacts with semver + git SHA tags; never deploy "latest" to production
- Document the RBAC matrix explicitly and enforce least privilege per service account
- Track DORA metrics from the first production deployment to establish baselines
- Include at least one chaos engineering test targeting your highest-risk failure mode

### MUST NOT DO
- Define SLO targets based on infrastructure health alone (CPU, memory) without mapping to user-facing signals
- Disable circuit breakers or reduce retry limits "to fix performance" — these are safety mechanisms
- Store secrets in environment variables or source code; use a dedicated secrets manager
- Deploy without an automated rollback path; manual rollbacks during incidents increase MTTR
- Leave alerts running that have no associated runbook or on-call owner
- Skip canary analysis even for small changes; any unmeasured deployment is a gamble
- Allow feature flags to become permanent — every flag must have an expiry and cleanup plan
- Use the same monitoring dashboard for development and production traffic patterns

---

## Output Template

When applying this skill during a Production Readiness Review, produce:

1. **Service Summary** — Service name, version, owner, deployment target, and classification (Tier-1 / Tier-2 / Tier-3)
2. **Category-by-Category Assessment** — For each of the 8 categories, report status (PASS, PASS_WITH_CONDITIONS, FAIL), list findings with specific metric values or evidence, note any risks with severity ratings
3. **Dev-to-Production Gap Analysis** — Document any gaps identified between development and production environments for this service, categorized by type (environment, process, technical, security)
4. **Decision** — Clear verdict (Approved / Approved with Conditions / Not Approved) with numbered conditions if applicable
5. **Remediation Plan** — For conditional approvals: specific action items, owners, deadlines (max 14 days), and evidence required to close each condition
6. **Follow-up Schedule** — Date for conditional review completion, next quarterly audit date

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `observability-patterns` | Deep-dive into the Three Pillars: metrics instrumentation, structured logging patterns, distributed tracing setup |
| `technical-debt-management` | Track and prioritize remediation of conditions identified during PRR that cannot be addressed immediately |
| `architecture-decision-records` | Document architectural choices that influence production readiness (e.g., technology selection, deployment model) |

---

## Live References

> Authoritative documentation for Production Readiness Review practices and SRE standards.

- [Google SRE Workbook — Production Readiness Review](https://sre.google/workbook/prr/)
- [Google SRE Books — Service Level Objectives](https://sre.google/sre-book/service-level-objectives/)
- [Google SRE Books — Monitoring Distributed Systems](https://sre.google/sre-book/monitoring-distributed-systems/)
- [PagerDuty Incident Response Framework](https://www.pagerduty.com/resources/playbooks/incident-response-guide/)
- [OpenTelemetry Documentation](https://opentelemetry.io/docs/)
- [Kubernetes Production Best Practices](https://cloud.google.com/architecture/best-practices-for-operating-kubernetes)
- [NIST Cybersecurity Framework — Supply Chain Security](https://www.nist.gov/cyberframework)
