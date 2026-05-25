---
name: contrarian-cloud-deployment-review
description: Generates structured contrarian critiques and adversarial review prompts
  for cloud deployment architectures to enable rigorous agentic council vetting.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: agent
  triggers: cloud architecture review, adversarial design, contrarian critique, deployment
    vetting, agentic council, cloud security review, infrastructure review
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
  related-skills: cloud-architecture-patterns, security-architecture-review, cost-optimization-review
  maturity: stable
  completeness: 95
  exampleCount: 3
------
# Contrarian Cloud Deployment Review

Acts as an adversarial reviewer within an agentic council, systematically generating contrarian critiques and structured challenge prompts for cloud deployment architectures. This skill forces the council to stress-test designs against failure modes, security vulnerabilities, cost inefficiencies, and operational blind spots before approval.

## TL;DR Checklist

- [ ] Parse architecture diagram and deployment manifests
- [ ] Identify single points of failure and unhandled edge cases
- [ ] Generate adversarial questions for each architectural layer
- [ ] Cross-reference with security and cost best practices
- [ ] Format output as structured council critique
- [ ] Route unresolved critical findings to escalation path

---

## When to Use

Use this skill when:

- Reviewing infrastructure-as-code (Terraform, Pulumi, CDK) before production deployment
- Preparing architecture for security or compliance audits
- Stress-testing multi-region or hybrid cloud designs
- Facilitating agentic council debates where confirmation bias is likely

---

## When NOT to Use

Avoid this skill for:

- Initial brainstorming or ideation phases (use `cloud-architecture-patterns` instead)
- Routine operational troubleshooting or incident response
- When the design is already approved and locked for deployment

---

## Core Workflow

1. **Ingest Architecture** — Parse provided diagrams, IaC files, or deployment specs. **Checkpoint:** Verify all components (compute, storage, networking, IAM) are mapped and dependencies are explicit.
2. **Identify Failure Modes** — Apply fault tree analysis to each component. Look for SPOFs, missing redundancy, and unhandled error states. **Checkpoint:** Every critical path must have a documented fallback or degradation strategy.
3. **Generate Contrarian Prompts** — Formulate adversarial questions targeting security, cost, latency, and operational complexity. **Checkpoint:** Questions must be specific, not generic ("What is the RTO if Region A fails?" not "Is it highly available?").
4. **Cross-Validate Against Standards** — Check against 12-Factor App, Well-Architected Framework, and least-privilege IAM principles. Reference `code-philosophy` (5 Laws of Elegant Defense) when evaluating failure handling and defensive design patterns.
5. **Synthesize Council Brief** — Compile findings into structured critique with severity ratings and mitigation suggestions.
6. **Route Findings** — Direct critical/high findings to security/cost specialists. Route low/medium to general council.

```
Architecture Input
        ↓
Parse & Map Components ──→ Missing/Invalid ──→ Request Clarification
        ↓ (Valid)
Fault Tree Analysis ──→ SPOF Detected ──→ Flag Critical Risk
        ↓ (No SPOF)
Generate Contrarian Prompts
        ↓
Cross-Validate Standards
        ↓
Synthesize Critique ──→ Critical Finding ──→ Route to Security/Cost Council
        ↓ (No Critical)
Route to General Council
        ↓
Output Structured Review
```

---

## Implementation Patterns

### Pattern 1: Contrarian Review Engine

Complete Python implementation for parsing architecture components, detecting failure modes, and generating structured adversarial critiques.

```python
from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List, Optional

class Severity(Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

@dataclass
class ArchitectureComponent:
    name: str
    type: str
    redundancy: bool
    region: str
    dependencies: List[str] = field(default_factory=list)

@dataclass
class ContrarianCritique:
    component: str
    finding: str
    severity: Severity
    adversarial_prompt: str
    mitigation_suggestion: str

class CloudDeploymentContrarianReviewer:
    """Generates structured contrarian critiques for cloud deployment architectures.
    
    Implements adversarial review patterns to stress-test designs against
    failure modes, security gaps, and operational blind spots.
    """
    
    def __init__(self, architecture: Dict[str, ArchitectureComponent]):
        self.components = architecture
        self.critiques: List[ContrarianCritique] = []
        
    def analyze_spofs(self) -> List[ContrarianCritique]:
        """Identify single points of failure and generate adversarial prompts."""
        spof_critiques = []
        for name, comp in self.components.items():
            if not comp.redundancy and comp.type in ("compute", "storage", "network"):
                spof_critiques.append(ContrarianCritique(
                    component=name,
                    finding=f"Single point of failure detected: {name} lacks redundancy in {comp.region}",
                    severity=Severity.CRITICAL,
                    adversarial_prompt=f"What is the exact failover sequence and RTO/RPO if {name} becomes completely unavailable in {comp.region}?",
                    mitigation_suggestion="Implement multi-AZ or multi-region deployment with automated health checks and traffic routing."
                ))
        return spof_critiques

    def analyze_dependency_chains(self) -> List[ContrarianCritique]:
        """Detect circular dependencies and unhandled cascade failures."""
        dep_critiques = []
        for name, comp in self.components.items():
            if not comp.dependencies:
                continue
            for dep in comp.dependencies:
                if dep in self.components:
                    dep_comp = self.components[dep]
                    if name in dep_comp.dependencies:
                        dep_critiques.append(ContrarianCritique(
                            component=name,
                            finding=f"Circular dependency detected between {name} and {dep}",
                            severity=Severity.HIGH,
                            adversarial_prompt=f"How does the system handle deadlock or timeout scenarios when {name} and {dep} both require synchronous availability?",
                            mitigation_suggestion="Decouple synchronous calls with async messaging queues or implement circuit breaker patterns."
                        ))
        return dep_critiques

    def analyze_security_gaps(self) -> List[ContrarianCritique]:
        """Check for missing least-privilege IAM and network segmentation."""
        security_critiques = []
        for name, comp in self.components.items():
            if comp.type == "iam" and "admin" in name.lower():
                security_critiques.append(ContrarianCritique(
                    component=name,
                    finding=f"Overly permissive IAM role detected: {name}",
                    severity=Severity.HIGH,
                    adversarial_prompt=f"What specific permissions does {name} grant, and how do you enforce least-privilege access for downstream services?",
                    mitigation_suggestion="Apply scoped IAM policies with explicit deny statements and regular access reviews."
                ))
        return security_critiques

    def generate_full_review(self) -> List[ContrarianCritique]:
        """Execute complete contrarian review pipeline."""
        self.critiques = []
        self.critiques.extend(self.analyze_spofs())
        self.critiques.extend(self.analyze_dependency_chains())
        self.critiques.extend(self.analyze_security_gaps())
        
        severity_order = {Severity.CRITICAL: 0, Severity.HIGH: 1, Severity.MEDIUM: 2, Severity.LOW: 3}
        self.critiques.sort(key=lambda c: severity_order[c.severity])
        
        return self.critiques
```

---

## Constraints

### MUST DO
- Always generate specific, component-targeted adversarial questions
- Rate findings by severity (Critical/High/Medium/Low)
- Reference `code-philosophy` (5 Laws of Elegant Defense) when evaluating failure handling and defensive design patterns
- Provide actionable mitigation suggestions alongside each critique
- Maintain neutral, objective tone; avoid subjective opinions
- Explicitly document fallback routing for every critical finding

### MUST NOT DO
- Generate generic or vague questions ("Is it secure?", "Is it scalable?")
- Ignore network boundaries, IAM policies, or data persistence layers
- Approve designs without explicitly documenting failure modes
- Use placeholder text or incomplete analysis
- Bypass critical findings to avoid "conflict" in council debates
- Route findings without clear escalation paths

---

## Output Template

When this skill is active, produce the following structure:

1. **Executive Summary** — Overall architecture resilience score, critical finding count, and council recommendation (Proceed/Revise/Reject)
2. **Component Analysis** — Structured critique per component with severity, adversarial prompt, and mitigation
3. **Failure Mode Matrix** — Table mapping components to potential failure scenarios and fallback strategies
4. **Council Routing** — Clear directive on which findings require specialist review vs. general discussion
5. **Next Steps** — Actionable items for design iteration before council vote

---

## Related Skills

| Skill                          | Purpose                                                  |
| ------------------------------ | -------------------------------------------------------- |
| `cloud-architecture-patterns`  | Initial design ideation and reference patterns           |
| `security-architecture-review` | Deep-dive security and compliance validation             |
| `cost-optimization-review`     | Financial efficiency and resource right-sizing analysis  |
