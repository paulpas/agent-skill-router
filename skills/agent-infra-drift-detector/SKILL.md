---
name: agent-infra-drift-detector
description: Detects and reports infrastructure drift between desired state and actual cloud infrastructure configuration.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: agent
  role: debugging
  scope: compliance
  output-format: report
  triggers: infra drift, infra-drift-detector, drift detection, infrastructure drift
---

# Infra Drift Detector (Configuration Compliance)

> **Load this skill** when designing or modifying infrastructure drift detection pipelines that compare desired state configurations against actual cloud infrastructure and report compliance violations.

## TL;DR Checklist

When detecting infrastructure drift:

- [ ] Define and version desired infrastructure state
- [ ] Fetch current state from cloud providers
- [ ] Compare desired vs actual state at all levels
- [ ] Identify drift categories (missing, extra, changed resources)
- [ ] Calculate drift severity based on impact
- [ ] Generate drift reports with remediation guidance
- [ ] Track drift over time for trend analysis
- [ ] Follow the 5 Laws of Elegant Defense from code-philosophy

---

## When to Use

Use Infra Drift Detector when:

- Validating infrastructure as code deployments
- Monitoring cloud infrastructure for unauthorized changes
- Ensuring compliance with infrastructure standards
- Detecting configuration drift in production environments
- Auditing infrastructure changes
- Pre-deployment validation

---

## When NOT to Use

Avoid using Infra Drift Detector for:

- Real-time infrastructure monitoring (use monitoring tools)
- Single-resource drift checks (use provider CLI)
- Environments without IaC defined
- Tasks where manual changes are expected
- Non-cloud infrastructure (use different tools)

---

## Core Concepts

### Drift Detection Pipeline

```
Infra Drift Detection Pipeline
├── State Sources
│   ├── Desired State (IaC files)
│   ├── Actual State (Cloud APIs)
│   └── Current State (State files)
├── Comparison Engine
│   ├── Resource Matching
│   ├── Attribute Comparison
│   └── Change Detection
├── Drift Classification
│   ├── Missing Resources
│   ├── Extra Resources
│   ├── Attribute Changes
│   └── Relationship Changes
├── Severity Assessment
│   ├── Critical: Security issues
│   ├── High: Availability issues
│   ├── Medium: Configuration issues
│   └── Low: Documentation issues
└── Report Generation
    ├── Drift Summary
    ├── Remediation Steps
    └── Impact Assessment
```

### Drift Categories

#### 1. Missing Resources
```
Desired: EC2 instance "web-server"
Actual: NOT FOUND
Category: Missing
Severity: HIGH (if production)
```

#### 2. Extra Resources
```
Desired: S3 bucket "logs-bucket"
Actual: S3 bucket "logs-bucket" + "old-bucket"
Category: Extra
Severity: MEDIUM (cost)
```

#### 3. Attribute Changes
```
Desired: Security group "web-sg" - SSH: 0.0.0.0/0
Actual: Security group "web-sg" - SSH: 10.0.0.0/8
Category: Modified
Severity: HIGH (security)
```

#### 4. Relationship Changes
```
Desired: Instance "web-server" attached to ASG "web-asg"
Actual: Instance "web-server" NOT attached to ASG
Category: Relationship
Severity: HIGH (availability)
```

### Severity Levels

```
Severity: Critical
- Security vulnerabilities
- Data loss risk
- Compliance violations

Severity: High
- Availability impact
- Performance degradation
- Cost overruns

Severity: Medium
- Configuration issues
- Documentation gaps
- Best practice violations

Severity: Low
- Minor deviations
- Style issues
- Documentation updates
```

---

## Implementation Patterns

### Pattern 1: State Extractor

Extract infrastructure state from multiple sources:

```python
from dataclasses import dataclass
from typing import List, Dict, Any
from abc import ABC, abstractmethod


@dataclass
class InfrastructureResource:
    resource_type: str
    resource_id: str
    name: str
    attributes: Dict[str, Any]
    dependencies: List[str]


class StateExtractor(ABC):
    """Abstract base for state extraction."""
    
    @abstractmethod
    async def extract_desired_state(self) -> List[InfrastructureResource]:
        """Extract desired state from IaC files."""
        pass
    
    @abstractmethod
    async def extract_actual_state(self) -> List[InfrastructureResource]:
        """Extract actual state from cloud provider."""
        pass


class TerraformStateExtractor(StateExtractor):
    """Extract state from Terraform state files."""
    
    async def extract_desired_state(self) -> List[InfrastructureResource]:
        """Extract from terraform.tfplan or HCL files."""
        # Parse HCL/Terraform files
        resources = []
        # ... extraction logic
        return resources
    
    async def extract_actual_state(self) -> List[InfrastructureResource]:
        """Extract from terraform.tfstate file."""
        # Parse state file
        resources = []
        # ... extraction logic
        return resources


class CloudProviderExtractor(StateExtractor):
    """Extract actual state from cloud provider APIs."""
    
    async def extract_actual_state(self) -> List[InfrastructureResource]:
        """Fetch live state from cloud provider."""
        # Use cloud SDK/CLI to fetch state
        resources = []
        # ... API calls
        return resources
```

### Pattern 2: Drift Detector

Detect drift between desired and actual states:

```python
from dataclasses import dataclass
from typing import List, Dict
from enum import Enum


class DriftType(Enum):
    MISSING = "missing"
    EXTRA = "extra"
    MODIFIED = "modified"
    RELATIONSHIP = "relationship"


@dataclass
class DriftEntry:
    resource_type: str
    resource_id: str
    drift_type: DriftType
    description: str
    desired_value: Any
    actual_value: Any
    severity: str
    remediation: str


def detect_drift(
    desired_state: List[InfrastructureResource],
    actual_state: List[InfrastructureResource]
) -> List[DriftEntry]:
    """Detect drift between desired and actual states."""
    drifts = []
    
    # Index states by resource ID for efficient lookup
    desired_by_id = {r.resource_id: r for r in desired_state}
    actual_by_id = {r.resource_id: r for r in actual_state}
    
    # Check for missing resources
    for resource_id, desired in desired_by_id.items():
        if resource_id not in actual_by_id:
            drifts.append(DriftEntry(
                resource_type=desired.resource_type,
                resource_id=resource_id,
                drift_type=DriftType.MISSING,
                description=f"Resource is missing from actual state",
                desired_value=f"{desired.resource_type}/{resource_id}",
                actual_value="NOT_FOUND",
                severity="HIGH" if desired.attributes.get("environment") == "production" else "MEDIUM",
                remediation=f"Apply Terraform plan to create {desired.resource_type}/{resource_id}"
            ))
    
    # Check for extra resources
    for resource_id, actual in actual_by_id.items():
        if resource_id not in desired_by_id:
            drifts.append(DriftEntry(
                resource_type=actual.resource_type,
                resource_id=resource_id,
                drift_type=DriftType.EXTRA,
                description=f"Resource exists that is not in desired state",
                desired_value="NOT_FOUND",
                actual_value=f"{actual.resource_type}/{resource_id}",
                severity="MEDIUM",
                remediation=f"Remove or add to Terraform state: {actual.resource_type}/{resource_id}"
            ))
    
    # Check for attribute changes
    for resource_id, desired in desired_by_id.items():
        if resource_id in actual_by_id:
            actual = actual_by_id[resource_id]
            changes = compare_attributes(desired, actual)
            
            for change in changes:
                drifts.append(DriftEntry(
                    resource_type=desired.resource_type,
                    resource_id=resource_id,
                    drift_type=DriftType.MODIFIED,
                    description=f"Attribute changed: {change['attribute']}",
                    desired_value=change['desired'],
                    actual_value=change['actual'],
                    severity=change['severity'],
                    remediation=change['remediation']
                ))
    
    # Check for relationship changes
    relationship_drifts = check_relationships(desired_state, actual_state)
    drifts.extend(relationship_drifts)
    
    return drifts


def compare_attributes(
    desired: InfrastructureResource,
    actual: InfrastructureResource
) -> List[dict]:
    """Compare attributes between desired and actual resources."""
    changes = []
    
    for key, desired_value in desired.attributes.items():
        if key not in actual.attributes:
            changes.append({
                "attribute": key,
                "desired": desired_value,
                "actual": "NOT_FOUND",
                "severity": "HIGH",
                "remediation": f"Reapply Terraform to restore {key}"
            })
        elif actual.attributes[key] != desired_value:
            changes.append({
                "attribute": key,
                "desired": desired_value,
                "actual": actual.attributes[key],
                "severity": "HIGH" if is_security_attribute(key) else "MEDIUM",
                "remediation": f"Reapply Terraform to restore {key}"
            })
    
    return changes


def is_security_attribute(attribute: str) -> bool:
    """Check if attribute is related to security."""
    security_attrs = {"security_group", "iam_role", "access_key", "secret_key", "ssl_cert"}
    return any(attr in attribute.lower() for attr in security_attrs)
```

### Pattern 3: Severity Calculator

Calculate drift severity based on context:

```python
def calculate_severity(
    drift: DriftEntry,
    environment: str = "production",
    compliance_rules: List[dict] = None
) -> str:
    """Calculate severity based on context and compliance rules."""
    base_severity = drift.severity
    
    # Adjust based on environment
    if environment == "production":
        if drift.drift_type in (DriftType.MISSING, DriftType.MODIFIED):
            if base_severity == "MEDIUM":
                base_severity = "HIGH"
            elif base_severity == "HIGH":
                base_severity = "CRITICAL"
    elif environment == "development":
        if base_severity == "HIGH":
            base_severity = "MEDIUM"
    
    # Apply compliance rules
    if compliance_rules:
        for rule in compliance_rules:
            if rule["matches"](drift):
                base_severity = max(base_severity, rule["severity"], key=severity_order)
    
    return base_severity


def severity_order(severity: str) -> int:
    """Order severities for comparison."""
    order = {"LOW": 0, "MEDIUM": 1, "HIGH": 2, "CRITICAL": 3}
    return order.get(severity, -1)
```

### Pattern 4: Remediation Generator

Generate remediation steps for each drift:

```python
def generate_remediation_steps(
    drift: DriftEntry,
    terraform_command: str = "terraform apply",
    dry_run: bool = True
) -> List[str]:
    """Generate remediation steps for a drift entry."""
    steps = []
    
    if drift.drift_type == DriftType.MISSING:
        steps.extend([
            f"1. Review drift: {drift.description}",
            f"2. Apply terraform plan: {terraform_command} -target={drift.resource_id}",
            f"3. Verify resource exists after apply",
            f"4. Run terraform plan to confirm no further drift"
        ])
    
    elif drift.drift_type == DriftType.EXTRA:
        steps.extend([
            f"1. Review extra resource: {drift.resource_id}",
            f"2. Determine if resource should be removed",
            f"3. If removing, run: terraform state rm {drift.resource_id}",
            f"4. If keeping, update Terraform configuration"
        ])
    
    elif drift.drift_type == DriftType.MODIFIED:
        steps.extend([
            f"1. Review attribute changes: {drift.attribute}",
            f"2. Determine if change was intentional",
            f"3. If not, revert: {terraform_command} -target={drift.resource_id}",
            f"4. If intentional, update Terraform configuration"
        ])
    
    elif drift.drift_type == DriftType.RELATIONSHIP:
        steps.extend([
            f"1. Review relationship changes for: {drift.resource_id}",
            f"2. Check if relationships are defined in Terraform",
            f"3. Reapply configuration to restore relationships",
            f"4. Verify relationships after apply"
        ])
    
    return steps
```

### Pattern 5: Drift Report Generator

Generate comprehensive drift reports:

```python
from dataclasses import dataclass
from typing import List, Dict


@dataclass
class DriftReport:
    total_drifts: int
    critical_count: int
    high_count: int
    medium_count: int
    low_count: int
    by_type: Dict[str, int]
    by_resource_type: Dict[str, int]
    remediation_steps: List[str]
    summary: str


def generate_drift_report(
    drifts: List[DriftEntry],
    environment: str = "production",
    compliance_rules: List[dict] = None
) -> DriftReport:
    """Generate comprehensive drift report."""
    if not drifts:
        return DriftReport(
            total_drifts=0,
            critical_count=0,
            high_count=0,
            medium_count=0,
            low_count=0,
            by_type={},
            by_resource_type={},
            remediation_steps=[],
            summary="No drift detected"
        )
    
    # Calculate severity counts
    severity_counts = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0}
    type_counts = {}
    resource_type_counts = {}
    all_remediations = []
    
    for drift in drifts:
        severity = calculate_severity(drift, environment, compliance_rules)
        severity_counts[severity] += 1
        
        type_key = drift.drift_type.value
        type_counts[type_key] = type_counts.get(type_key, 0) + 1
        
        resource_type = drift.resource_type
        resource_type_counts[resource_type] = resource_type_counts.get(resource_type, 0) + 1
        
        remediations = generate_remediation_steps(drift)
        all_remediations.extend(remediations)
    
    # Generate summary
    if severity_counts["CRITICAL"] > 0:
        summary = f"CRITICAL: {severity_counts['CRITICAL']} critical drift(s) detected requiring immediate attention"
    elif severity_counts["HIGH"] > 0:
        summary = f"HIGH: {severity_counts['HIGH']} high-severity drift(s) detected"
    elif severity_counts["MEDIUM"] > 0:
        summary = f"MEDIUM: {severity_counts['MEDIUM']} medium-severity drift(s) detected"
    elif severity_counts["LOW"] > 0:
        summary = f"LOW: {severity_counts['LOW']} low-severity drift(s) detected"
    else:
        summary = "No drifts with severity levels found"
    
    return DriftReport(
        total_drifts=len(drifts),
        critical_count=severity_counts["CRITICAL"],
        high_count=severity_counts["HIGH"],
        medium_count=severity_counts["MEDIUM"],
        low_count=severity_counts["LOW"],
        by_type=type_counts,
        by_resource_type=resource_type_counts,
        remediation_steps=all_remediations,
        summary=summary
    )
```

---

## Common Patterns

### Pattern 1: Scheduled Drift Checks

Set up automated drift detection:

```python
async def run_scheduled_drift_check(
    state_extractor: StateExtractor,
    environment: str,
    interval_hours: int
):
    """Run scheduled drift detection."""
    while True:
        desired_state = await state_extractor.extract_desired_state()
        actual_state = await state_extractor.extract_actual_state()
        
        drifts = detect_drift(desired_state, actual_state)
        report = generate_drift_report(drifts, environment)
        
        if report.total_drifts > 0:
            notify_drift_found(report)
        
        await asyncio.sleep(interval_hours * 3600)
```

### Pattern 2: Pre-Deployment Validation

Validate drift before deployment:

```python
async def validate_before_deployment(
    state_extractor: StateExtractor,
    environment: str
) -> bool:
    """Validate no drift exists before deployment."""
    desired = await state_extractor.extract_desired_state()
    actual = await state_extractor.extract_actual_state()
    
    drifts = detect_drift(desired, actual)
    report = generate_drift_report(drifts, environment)
    
    if report.critical_count > 0 or report.high_count > 0:
        print(f"Deployment blocked: {report.summary}")
        return False
    
    return True
```

### Pattern 3: Drift Trends

Track drift over time:

```python
def analyze_drift_trends(
    historical_reports: List[DriftReport]
) -> dict:
    """Analyze drift trends over time."""
    if not historical_reports:
        return {"trend": "unknown", "severity": "unknown"}
    
    # Calculate averages
    avg_critical = sum(r.critical_count for r in historical_reports) / len(historical_reports)
    avg_high = sum(r.high_count for r in historical_reports) / len(historical_reports)
    
    # Determine trend
    if len(historical_reports) >= 2:
        recent = historical_reports[-1]
        previous = historical_reports[-2]
        
        if recent.total_drifts > previous.total_drifts * 1.2:
            trend = "increasing"
        elif recent.total_drifts < previous.total_drifts * 0.8:
            trend = "decreasing"
        else:
            trend = "stable"
    else:
        trend = "insufficient_data"
    
    return {
        "trend": trend,
        "avg_critical": avg_critical,
        "avg_high": avg_high,
        "total_checks": len(historical_reports)
    }
```

---

## Common Mistakes

### Mistake 1: Not Versioning Desired State

**Wrong:**
```python
# ❌ Using latest desired state without versioning
desired_state = fetch_latest_state()
# No way to track what changed over time
```

**Correct:**
```python
# ✅ Version desired state
desired_state = fetch_versioned_state("v1.2.0")
historical_state = fetch_versioned_state("v1.1.0")
# Track changes over time
```

### Mistake 2: Not Handling Partial Failures

**Wrong:**
```python
# ❌ All-or-nothing approach
desired = fetch_desired_state()
actual = fetch_actual_state()
# If either fails, entire check fails
```

**Correct:**
```python
# ✅ Graceful partial failure handling
try:
    desired = await fetch_desired_state()
except StateFetchError:
    desired = []
    log_warning("Failed to fetch desired state")

try:
    actual = await fetch_actual_state()
except StateFetchError:
    actual = []
    log_warning("Failed to fetch actual state")

drifts = detect_drift(desired, actual)
# Continue with available data
```

### Mistake 3: Ignoring Environment Context

**Wrong:**
```python
# ❌ Same severity for all environments
drifts = detect_drift(desired, actual)
for drift in drifts:
    drift.severity = "HIGH"  # Same for dev and prod
```

**Correct:**
```python
# ✅ Environment-aware severity
for drift in drifts:
    severity = calculate_severity(drift, environment)
    drift.severity = severity
# Different severity for different environments
```

### Mistake 4: Not Providing Remediation Steps

**Wrong:**
```python
# ❌ Only reporting drift without solutions
drifts = detect_drift(desired, actual)
report_drifts(drifts)  # No remediation guidance
```

**Correct:**
```python
# ✅ Provide remediation steps
drifts = detect_drift(desired, actual)
report = generate_drift_report(drifts)
report.remediation_steps  # Actionable steps provided
```

### Mistake 5: Not Filtering by Compliance Rules

**Wrong:**
```python
# ❌ Treating all drifts equally
drifts = detect_drift(desired, actual)
# Ignoring compliance requirements
```

**Correct:**
```python
# ✅ Filter by compliance rules
drifts = detect_drift(desired, actual)
drifts = apply_compliance_rules(drifts, compliance_rules)
# Only report relevant drifts
```

---

## Adherence Checklist

### Code Review

- [ ] **Guard Clauses:** Input validation for state extraction
- [ ] **Parsed State:** Raw API responses parsed into typed structures
- [ ] **Purity:** Drift detection functions are pure
- [ ] **Fail Loud:** Invalid state formats throw descriptive errors
- [ ] **Readability:** Drift reports read like compliance checklist

### Testing

- [ ] Unit tests for state extraction
- [ ] Integration tests for drift detection
- [ ] Severity calculation tests
- [ ] Remediation generation tests
- [ ] Report generation tests

### Security

- [ ] Cloud credentials sanitized in logs
- [ ] No unauthorized API access
- [ ] Audit trail for all checks
- [ ] Compliance rule validation
- [ ] Drift data access controlled

### Performance

- [ ] Efficient state comparison
- [ ] Concurrent API calls for extraction
- [ ] Cached state data
- [ ] Incremental updates
- [ ] Memory-efficient streaming for large infrastructures

---

## References

### Related Skills

| Skill | Purpose |
|-------|---------|
| `resource-optimizer` | Optimize drift remediation |
| `ci-cd-pipeline-analyzer` | Validate CI/CD infrastructure |
| `infra-drift-detector` | Automated drift detection |
| `plan-review` | Plan validation |
| `risk-management` | Risk assessment |

### Core Dependencies

- **Extractor:** State extraction from sources
- **Comparator:** State comparison engine
- **Classifier:** Drift type classification
- **Severity Calculator:** Context-aware severity
- **Reporter:** Comprehensive report generation

### External Resources

- [Terraform State](https://developer.hashicorp.com/terraform/language/state)
- [AWS Config](https://aws.amazon.com/config/)
- [Azure Policy](https://azure.microsoft.com/en-us/services/azure-policy/)

---

## Implementation Tracking

### Agent Infra Drift Detector - Core Patterns

| Task | Status |
|------|--------|
| State extractor | ✅ Complete |
| Drift detector | ✅ Complete |
| Severity calculator | ✅ Complete |
| Remediation generator | ✅ Complete |
| Drift report generator | ✅ Complete |
| Scheduled checks | ✅ Complete |
| Pre-deployment validation | ✅ Complete |
| Drift trends | ✅ Complete |

---

## Version History

### 1.0.0 (Initial)
- State extraction
- Drift detection
- Severity calculation
- Remediation generation
- Report generation

### 1.1.0 (Planned)
- Multi-cloud support
- Compliance rule management
- Automated remediation
- Historical tracking

### 2.0.0 (Future)
- ML-based drift prediction
- Auto-remediation
- Cost impact analysis
- Cross-region drift

---

## Implementation Prompt (Execution Layer)

When implementing the Infra Drift Detector skill, use this prompt for code generation:

```
Create an Infra Drift Detector implementation following these requirements:

1. Core Classes:
   - InfrastructureResource: Resource with type, ID, attributes
   - DriftEntry: Individual drift finding
   - DriftReport: Complete drift report
   - StateExtractor: Abstract state extraction interface
   - TerraformStateExtractor: Terraform state extraction
   - CloudProviderExtractor: Cloud API extraction

2. Key Methods:
   - extract_desired_state(): Fetch desired state
   - extract_actual_state(): Fetch actual state
   - detect_drift(desired, actual): Find all drifts
   - compare_attributes(desired, actual): Find attribute changes
   - calculate_severity(drift, environment, rules): Context-aware severity
   - generate_remediation_steps(drift): Actionable steps
   - generate_drift_report(drifts, environment, rules): Comprehensive report
   - analyze_drift_trends(historical_reports): Trend analysis

3. Data Structures:
   - InfrastructureResource with type, ID, attributes, dependencies
   - DriftEntry with type, description, desired/actual values
   - DriftReport with counts, summaries, remediation steps
   - StateExtractor abstract base class
   - DriftType enum (MISSING, EXTRA, MODIFIED, RELATIONSHIP)

4. Drift Categories:
   - Missing: Resources in desired but not actual
   - Extra: Resources in actual but not desired
   - Modified: Attribute changes between states
   - Relationship: Relationship changes between resources

5. Configuration Options:
   - environment: "production", "staging", "development"
   - compliance_rules: List of compliance rule objects
   - severity_threshold: Minimum severity to report
   - resource_types: Filter by resource type
   - interval_hours: Schedule interval

6. Output Features:
   - Drift entries with severity
   - Remediation steps for each drift
   - Summary reports
   - Trend analysis
   - Compliance status

7. Error Handling:
   - State extraction failures
   - API rate limiting
   - Partial data handling
   - Graceful degradation
   - Comprehensive logging

Follow the 5 Laws of Elegant Defense:
- Guard clauses for input validation
- Parse raw API data into typed structures
- Pure drift detection functions
- Fail fast on invalid state
- Clear names for all components
```
