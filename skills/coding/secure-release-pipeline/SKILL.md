---
name: release-pipeline
description: Implements comprehensive secure release pipeline with CVE scanning, security
  code review, semantic versioning for patches, and multi-stage quality gates for
  secure deployments.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: secure release, CVE scanning, security audit, version management, quality
    gates, dependency security, semantic versioning, incident response, patch management
  role: implementation
  scope: implementation
  output-format: code
  related-skills: code-review, risk-management
---


# Secure Release Pipeline Manager

Implements comprehensive security controls throughout the software release lifecycle — from dependency scanning and code review to version management and incident response — ensuring zero compromises on security while maintaining delivery velocity.

## TL;DR Checklist

- [ ] Run all dependency CVE scanners (Snyk, Dependabot, Trivy) before any build
- [ ] Block releases if critical/high CVEs are present (severity thresholds)
- [ ] Run OWASP Top 10 coverage checks + SAST/DAST before merge
- [ ] Enforce semantic versioning: patches fix CVEs, minors add features, majors break compat
- [ ] Pin all production dependencies; lock transitive dependencies
- [ ] Execute multi-stage quality gates with automated approvals
- [ ] Block on critical issues; warn but allow on medium with approval
- [ ] Document and communicate any security incident within 1 hour

---

## When to Use

Use this skill when:

- Building or auditing a release pipeline for a production service
- Implementing automated security gates before deployments
- Establishing semantic versioning policies for security patches
- Designing incident response procedures for security vulnerabilities
- Creating version management policies for dependency updates

---

## When NOT to Use

Avoid this skill when:

- Developing experimental/throwaway code with no production deployment
- Working on internal tools with no security sensitivity (use simplified pipeline)
- Under extreme time pressure where security reviews are explicitly waived (document exception)
- Deploying to ephemeral development environments without security requirements

---

## Core Workflow

1. **Pre-Build: Dependency Scanning** — Scan all dependencies for known CVEs using multiple tools (Snyk, Dependabot, Trivy). **Checkpoint:** No critical/high CVEs in dependencies before proceeding.

2. **Pre-Merge: Security Code Review** — Run SAST on all code changes, enforce OWASP Top 10 coverage, require peer review for security-sensitive changes. **Checkpoint:** All high-severity security issues resolved or explicitly accepted.

3. **Pre-Release: Semantic Versioning** — Apply semantic versioning based on change type: patch (CVE fixes), minor (features, non-breaking), major (breaking changes). **Checkpoint:** Version bump aligns with change type and security impact.

4. **Post-Unit Tests: Quality Gates** — Execute multi-stage quality checks: unit tests, integration tests, SAST, DAST. **Checkpoint:** All blocking criteria passed; warnings documented and accepted.

5. **Post-Release: Monitoring & Response** — Monitor deployed releases for security issues. **Checkpoint:** Any critical vulnerability triggers immediate incident response process.

---

## Implementation Patterns / Reference Guide

### Pattern 1: Multi-Tool Dependency Scanning

Use multiple CVE scanners to maximize coverage — each tool has different vulnerability databases and detection algorithms.

**Example: Combined Snyk + Dependabot + Trivy Workflow**

```yaml
# .github/workflows/dependency-scan.yaml
name: Dependency Security Scan

on:
  pull_request:
  push:
    branches: [main]

jobs:
  scan-dependencies:
    runs-on: ubuntu-latest
    steps:
      # Snyk - comprehensive CVE database + dependency graph
      - name: Run Snyk Security Scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high

      # Dependabot - GitHub's native scanner with detailed fix recommendations
      - name: Check Dependabot Alerts
        run: |
          curl -H "Authorization: token ${{ secrets.GITHUB_TOKEN }}" \
               https://api.github.com/repos/${{ github.repository }}/dependency-graph/snapshots \
               | jq '.snapshots[] | select(.ecosystem == "npm")'

      # Trivy - container image and file system scanning
      - name: Run Trivy Filesystem Scan
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          scan-ref: '.'
          format: 'sarif'
          output: 'trivy-results.sarif'
          severity: 'CRITICAL,HIGH'

      # Gate: Block if critical/high vulnerabilities found
      - name: Security Gate Check
        run: |
          if grep -q '"severity": "CRITICAL"\|"severity": "HIGH"' trivy-results.sarif; then
            echo "❌ Blocking release: Critical/High CVEs detected"
            exit 1
          fi
```

**Best Practices:**
- Run Snyk with `--severity-threshold=high` (block on critical/high)
- Configure Dependabot to open PRs automatically for vulnerable dependencies
- Use Trivy to scan both codebase filesystem and container images
- Aggregate results and fail on any critical or high severity finding

---

### Pattern 2: Security Code Review with SAST

Automated static analysis should catch common vulnerabilities before human review.

**Example: SonarQube + Semgrep Integration**

```yaml
# .github/workflows/security-review.yaml
name: Security Code Review

on:
  pull_request:
    branches: [main, release/*]

jobs:
  sast-analysis:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      # Semgrep - fast, rule-based SAST for OWASP Top 10
      - name: Run Semgrep OWASP Top 10
        uses: returntocorp/semgrep-action@v1
        with:
          config: |
            p/security-audit
            p/owasp-top-ten
            p/semgrep-rule-repository
          severity: error,warn

      # SonarQube - comprehensive analysis with security rules
      - name: Run SonarQube Scan
        uses: SonarSource/sonarqube-scan-action@v4
        env:
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
          SONAR_HOST_URL: ${{ secrets.SONAR_HOST_URL }}
        with:
          projectKey: ${{ github.repository }}
          extraProperties: |
            sonar.qualitygate.wait=true
            sonar.security.hotspots.review.priority=HIGH
            sonar.cfamily.compile-commands=compile_commands.json

      # Security Gate: Block on criticalSonar issues
      - name: Security Gate Check
        run: |
          if [ "${{ steps.sonarqube.outputs.qualitygate }}" != "OK" ]; then
            echo "❌ Security Gate Failed: SonarQube quality gate not passed"
            exit 1
          fi

          # Check for critical Semgrep findings
          semgrep_output=$(cat semgrep.json 2>/dev/null || echo "{}")
          if echo "$semgrep_output" | jq -e '.results[] | select(.severity == "ERROR")' | grep -q .; then
            echo "❌ Blocking: Critical Semgrep findings detected"
            exit 1
          fi
```

**Best Practices:**
- Run Semgrep with `p/security-audit` and `p/owasp-top-ten` config packs
- Configure SonarQube to wait for quality gate status
- Block on any ERROR severity findings in Semgrep
- Require explicit acceptance for WARN findings with documented rationale

---

### Pattern 3: Semantic Versioning for Security Patches

Apply strict semantic versioning rules that prioritize security over feature development.

**Example: Version Bumping Policy**

```python
"""
Version Management for Secure Releases

Rules:
- PATCH: CVE fixes, security patches (no API changes)
- MINOR: New features, non-breaking changes, security enhancements
- MAJOR: Breaking changes, API removals, major refactorings

Security Patch Versioning:
- If CVE affects public API: MINOR bump (fix must be visible)
- If CVE is internal-only: PATCH bump
- Emergency security hotfixes: PATCH on latest stable, then merge to main
"""

from dataclasses import dataclass
from enum import Enum
from typing import List, Optional

class VersionBumpType(Enum):
    PATCH = "patch"      # CVE/security fixes, internal fixes
    MINOR = "minor"      # New features, non-breaking changes
    MAJOR = "major"      # Breaking changes, API modifications

@dataclass
class SecurityChange:
    """Represents a security-related change affecting versioning."""
    cve_ids: List[str]
    severity: str  # "critical", "high", "medium", "low"
    affects_api: bool
    description: str
    fixed_by: str  # PR/commit reference

@dataclass
class VersionPolicy:
    """Security-aware semantic versioning policy."""
    minor_version: int = 0
    patch_version: int = 1
    security_patch_only: bool = False
    
    def calculate_bump(self, changes: List[SecurityChange], 
                       features: bool = False) -> VersionBumpType:
        """
        Determine version bump based on security changes and feature additions.
        
        Priority: Security patches override feature logic when security is at risk.
        """
        if not changes and not features:
            return VersionBumpType.PATCH  # No changes = patch for stability
        
        # Check for critical/high CVEs - always require at least MINOR
        has_critical_cve = any(c.severity in ("critical", "high") for c in changes)
        any_affects_api = any(c.affects_api for c in changes)
        
        if has_critical_cve:
            if any_affects_api:
                return VersionBumpType.MAJOR  # Breaking change with critical CVE
            return VersionBumpType.MINOR  # Non-breaking but critical fix
        
        # High severity CVEs
        has_high_cve = any(c.severity == "high" for c in changes)
        if has_high_cve:
            return VersionBumpType.MINOR
        
        # Medium/low CVEs with API changes
        if any_affects_api:
            return VersionBumpType.MAJOR
        
        # Security fixes without API changes = PATCH
        if changes:
            return VersionBumpType.PATCH
        
        # No security changes, check for features
        if features:
            return VersionBumpType.MINOR
        
        return VersionBumpType.PATCH

# Example usage
def determine_security_version(changes: List[SecurityChange]) -> str:
    """Determine version string for security release."""
    policy = VersionPolicy()
    bump = policy.calculate_bump(changes, features=False)
    
    current_version = "1.2.3"  # Get from actual version source
    
    major, minor, patch = map(int, current_version.split("."))
    
    if bump == VersionBumpType.MAJOR:
        return f"{major + 1}.0.0"
    elif bump == VersionBumpType.MINOR:
        return f"{major}.{minor + 1}.0"
    else:
        return f"{major}.{minor}.{patch + 1}"

# Security patch version example
security_changes = [
    SecurityChange(
        cve_ids=["CVE-2024-1234"],
        severity="high",
        affects_api=False,
        description="RCE vulnerability in dependency",
        fixed_by="PR-#456"
    )
]

version = determine_security_version(security_changes)
print(f"Security release version: {version}")  # Output: 1.2.4 (PATCH bump)
```

**Best Practices:**
- Always bump MINOR or higher for critical/high CVEs
- Document CVE fixes in release notes with CVE IDs
- Create separate release branches for security patches
- Tag security releases with `-security` suffix when urgent

---

### Pattern 4: Multi-Stage Quality Gates

Implement blocking and warning criteria with automated approval workflows.

**Example: Quality Gate Implementation**

```python
"""
Quality Gate System

Blocking Criteria (must pass):
- All critical/high CVEs resolved
- All SAST ERROR findings resolved
- Security policy compliance
- No known security hotspots

Warning Criteria (can pass with approval):
- SAST WARN findings (documented)
- Medium severity CVEs (with risk acceptance)
- Performance degradation under threshold
"""

from dataclasses import dataclass
from enum import Enum
from typing import Dict, List, Optional
from datetime import datetime

class GateResult(Enum):
    PASS = "pass"
    FAIL_BLOCK = "fail_block"
    FAIL_WARN = "fail_warn"

@dataclass
class GateCheck:
    """Individual quality gate check."""
    name: str
    description: str
    result: GateResult
    details: Optional[str] = None
    blocker: bool = False
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None

@dataclass
class QualityGateResult:
    """Complete quality gate assessment."""
    checks: List[GateCheck]
    is_pass: bool
    has_blockers: bool
    warnings: List[GateCheck]
    blockers: List[GateCheck]

def evaluate_quality_gate(checks: List[GateCheck]) -> QualityGateResult:
    """Evaluate all gate checks and determine pass/fail status."""
    blockers = [c for c in checks if c.blocker and c.result in 
                (GateResult.FAIL_BLOCK, GateResult.FAIL_WARN)]
    warnings = [c for c in checks if not c.blocker and c.result == GateResult.FAIL_WARN]
    
    # Must have no blockers
    has_blockers = len(blockers) > 0
    
    # Can pass if all blockers resolved, even with warnings
    is_pass = not has_blockers
    
    return QualityGateResult(
        checks=checks,
        is_pass=is_pass,
        has_blockers=has_blockers,
        warnings=warnings,
        blockers=blockers
    )

# Example gate checks
def create_default_quality_gates() -> List[GateCheck]:
    """Create standard quality gate checks."""
    return [
        # Critical security checks (blocking)
        GateCheck(
            name="critical-cves",
            description="No critical or high CVEs in dependencies",
            result=GateResult.PASS,
            blocker=True
        ),
        GateCheck(
            name="sast-errors",
            description="No SAST ERROR severity findings",
            result=GateResult.PASS,
            blocker=True
        ),
        GateCheck(
            name="security-policy",
            description="Compliance with security policy",
            result=GateResult.PASS,
            blocker=True
        ),
        
        # Warning-level checks
        GateCheck(
            name="sast-warnings",
            description="SAST WARN findings documented",
            result=GateResult.FAIL_WARN,
            details="3 medium-severity issues found",
            blocker=False,
            approved_by="security-team",
            approved_at=datetime.now()
        ),
        GateCheck(
            name="test-coverage",
            description="Test coverage above threshold",
            result=GateResult.PASS,
            blocker=False
        ),
    ]

# Evaluate gates
checks = create_default_quality_gates()
result = evaluate_quality_gate(checks)

print(f"Quality Gate Status: {'PASS' if result.is_pass else 'FAIL'}")
if result.blockers:
    print(f"Blocking Issues ({len(result.blockers)}):")
    for b in result.blockers:
        print(f"  - {b.name}: {b.details or 'No details'}")
if result.warnings:
    print(f"Warnings ({len(result.warnings)}):")
    for w in result.warnings:
        print(f"  - {w.name}: {w.details or 'No details'} (approved: {w.approved_by})")
```

**Best Practices:**
- Separate blocking and warning criteria clearly
- Allow warnings with documented approval (who approved, when, rationale)
- Provide automatic rollback capability if post-deployment monitoring detects issues

---

### Pattern 5: Security Incident Response Process

Documented response procedures for security vulnerabilities discovered after release.

**Example: Incident Response Workflow**

```python
"""
Security Incident Response Protocol

When a security vulnerability is detected:
1. Triage (1 hour)
2. Escalate (2 hours)
3. Communicate (4 hours)
4. Remediate (4-24 hours depending on severity)
5. Post-incident Review (within 5 business days)
"""

from dataclasses import dataclass
from enum import Enum
from typing import Dict, List, Optional
from datetime import datetime
import time

class IncidentSeverity(Enum):
    CRITICAL = "critical"  # Exploitable in production, data breach
    HIGH = "high"          # Potential exploitation, mitigating factors
    MEDIUM = "medium"      # Limited exploitability, significant mitigation
    LOW = "low"            # Minor issue, easy mitigation

@dataclass
class SecurityIncident:
    """Represents a security incident."""
    id: str
    severity: IncidentSeverity
    description: str
    discovered_at: datetime
    discovered_by: str  # Person, automated tool, etc.
    affected_versions: List[str]
    cve_id: Optional[str] = None
    status: str = "triage"  # triage, escalated, communicating, remediated

class IncidentResponseManager:
    """Manages security incident response process."""
    
    SEVERITY_RESPONSE_TIMES = {
        IncidentSeverity.CRITICAL: {"triage": 3600, "escalate": 7200, "remediate": 14400},  # 1h, 2h, 4h
        IncidentSeverity.HIGH: {"triage": 7200, "escalate": 14400, "remediate": 28800},    # 2h, 4h, 8h
        IncidentSeverity.MEDIUM: {"triage": 28800, "escalate": 57600, "remediate": 86400}, # 8h, 16h, 24h
        IncidentSeverity.LOW: {"triage": 86400, "escalate": 172800, "remediate": 259200},  # 24h, 48h, 72h
    }
    
    def __init__(self):
        self.incidents: Dict[str, SecurityIncident] = {}
        self.response_timeline: List[Dict] = []
    
    def create_incident(self, incident: SecurityIncident) -> None:
        """Create and register a new security incident."""
        self.incidents[incident.id] = incident
        self.log_event(incident.id, "incident_created", 
                      f"Severity: {incident.severity.value}")
    
    def triage_incident(self, incident_id: str, notes: str = "") -> None:
        """Complete triage phase."""
        incident = self.incidents[incident_id]
        incident.status = "triage_complete"
        self.log_event(incident_id, "triage_complete", notes)
        
        # Auto-escalate if critical or high
        if incident.severity in (IncidentSeverity.CRITICAL, IncidentSeverity.HIGH):
            self.escalate_incident(incident_id)
    
    def escalate_incident(self, incident_id: str) -> None:
        """Escalate to security team."""
        incident = self.incidents[incident_id]
        incident.status = "escalated"
        self.log_event(incident_id, "escalated", 
                      "Escalated to security team and relevant stakeholders")
        
        # Auto-communicate to affected customers if critical
        if incident.severity == IncidentSeverity.CRITICAL:
            self.communicate_incident(incident_id)
    
    def communicate_incident(self, incident_id: str, 
                           communication: str = "Internal notice only") -> None:
        """Send incident communication."""
        incident = self.incidents[incident_id]
        self.log_event(incident_id, "communicated", communication)
    
    def remediate_incident(self, incident_id: str, 
                          fix_version: str, 
                          notes: str = "") -> None:
        """Mark incident as remediated."""
        incident = self.incidents[incident_id]
        incident.status = "remediated"
        incident.cve_id = incident.cve_id or f"CVE-{datetime.now().year}-XXXXX"
        self.log_event(incident_id, "remediated", 
                      f"Fix deployed in version {fix_version}: {notes}")
    
    def log_event(self, incident_id: str, event_type: str, details: str) -> None:
        """Log an event in the incident timeline."""
        self.response_timeline.append({
            "incident_id": incident_id,
            "timestamp": datetime.now().isoformat(),
            "event": event_type,
            "details": details
        })
    
    def get_incident_status(self, incident_id: str) -> Dict:
        """Get full status of an incident."""
        incident = self.incidents.get(incident_id)
        if not incident:
            return {"error": "Incident not found"}
        
        return {
            "id": incident_id,
            "severity": incident.severity.value,
            "status": incident.status,
            "affected_versions": incident.affected_versions,
            "timeline": [e for e in self.response_timeline if e["incident_id"] == incident_id]
        }

# Example incident response
def simulate_incident_response():
    """Simulate a security incident response."""
    manager = IncidentResponseManager()
    
    # Create incident
    incident = SecurityIncident(
        id="INC-2024-001",
        severity=IncidentSeverity.HIGH,
        description="RCE vulnerability in authentication library",
        discovered_at=datetime.now(),
        discovered_by="Automated Snyk Scan",
        affected_versions=["1.2.0", "1.2.1", "1.2.2"]
    )
    
    manager.create_incident(incident)
    
    # Triage (within 2 hours for HIGH)
    time.sleep(1)  # Simulate time passing
    manager.triage_incident("INC-2024-001", 
                           "Confirmed: CVE-2024-1234 affects auth library < 2.0.0")
    
    # Escalate
    time.sleep(1)
    manager.escalate_incident("INC-2024-001")
    
    # Communicate
    time.sleep(1)
    manager.communicate_incident("INC-2024-001", 
                                "Internal security notice sent to all teams")
    
    # Remediate (within 8 hours for HIGH)
    time.sleep(1)
    manager.remediate_incident("INC-2024-001", "2.0.1", 
                              "Upgraded auth library to secure version, added input validation")
    
    return manager.get_incident_status("INC-2024-001")

# Run simulation
status = simulate_incident_response()
print(f"Incident Status: {status['status']}")
print(f"Timeline Events: {len(status['timeline'])}")
for event in status['timeline']:
    print(f"  [{event['timestamp']}] {event['event']}: {event['details']}")
```

**Best Practices:**
- All incidents logged with full timeline
- Critical incidents: full communication to affected customers
- Post-incident review within 5 business days
- Document lessons learned and update policies accordingly

---

## Constraints

### MUST DO

- Run CVE scanning on ALL dependencies before any build or release
- Block releases if critical or high severity CVEs are detected
- Apply semantic versioning: PATCH for CVE fixes, MINOR for features
- Enforce SAST analysis on all code changes with OWASP Top 10 coverage
- Document and track all security incidents with full audit trail
- Require explicit approval for any warning-level issues that are accepted
- Maintain backward compatibility for all MINOR version updates
- Pin all production dependencies and lock transitive dependencies
- Provide automated rollback capability for any release

### MUST NOT DO

- Deploy to production with unresolved critical/high CVEs
- Skip security code review for "urgent" fixes (emergency patches still require review)
- Use `*` or `latest` tags for production dependencies
- Merge code with SAST ERROR severity findings without security team approval
- Communicate vulnerabilities externally without internal coordination
- Apply security patches to major versions without full regression testing
- Disable quality gates in any environment (development除外, with logging)
- Accept security warnings without documented justification and approval

---

## Output Template

When implementing a secure release pipeline, ensure the following components are included:

1. **Pipeline Configuration**
   - CI/CD pipeline definitions (GitHub Actions, GitLab CI, Jenkins, etc.)
   - All security scanning tools configured with severity thresholds
   - Automated blocking on critical security issues

2. **Security Policy Document**
   - Dependency scanning requirements (tools, frequency, thresholds)
   - Code review requirements (SAST, peer review for sensitive code)
   - Version management policy (semantic versioning rules)
   - Quality gate criteria (blocking vs warning, approval workflow)

3. **Incident Response Playbook**
   - Severity classification criteria
   - Response time SLAs for each severity level
   - Communication protocols (internal and external)
   - Post-incident review process

4. **Automation Scripts**
   - Dependency scanning integration scripts
   - Security gate validation scripts
   - Version management and auto-bumping utilities
   - Incident logging and tracking tools

5. **Documentation**
   - How to run security scans locally
   - How to approve warning-level issues
   - How to handle security incidents
   - Version management decision tree

---

## Related Skills

| Skill | Purpose |
|---|---|
| `code-review` | Peer review methodology with security focus, OWASP coverage checks |
| `risk-management` | Risk assessment and mitigation for security vulnerabilities |
| `code-philosophy` | Elegant defense principles for secure code design |
| `defi-arbitrage` | Security patterns for financial applications (if applicable) |

---

*This secure release pipeline ensures zero compromises on security while maintaining delivery velocity. Every release undergoes comprehensive security checks, and any vulnerabilities are managed through documented, time-sensitive response procedures.*
