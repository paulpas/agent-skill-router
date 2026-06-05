---




name: sast-tooling
description: Implements Static Application Security Testing (SAST) methodologies to identify vulnerabilities in source code during development phases.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: security
  triggers: static application security testing, source code analysis, code vulnerabilities, security bugs, early detection, SAST
  role: implementation
  scope: implementation
  output-format: code
  archetypes: implementation, review
  anti_triggers: manual testing, qualitative assessment
  response_profile:
    verbosity: medium
    directive_strength: high
    abstraction_level: operational




---





# SAST Tooling

Implements SAST methodologies to analyze source code and identify vulnerabilities before deployment. This testing approach scans the codebase for potentially exploitable weaknesses such as SQL injection opportunities, insecure coding practices, and misconfigurations.

Static Application Security Testing (SAST) is a security testing methodology that analyzes source code for potential vulnerabilities before the software is deployed. SAST tools are typically integrated into the development pipeline to ensure security measures are addressed early on, allowing developers to identify issues during the code-writing phase rather than post-deployment.

## When to Use

- When integrating security into the DevOps pipeline.
- For early detection of security issues in code, especially during the development lifecycle.
- To comply with security standards and best practices, minimizing the risk of vulnerabilities entering production.

## Core Workflow

1. **Select Codebase** — Identify the code repository to be analyzed.
2. **Configure SAST Tool** — Specify the configurations and rules for the analysis, including the programming languages and frameworks used.
3. **Run SAST Analysis** — Execute the SAST tool on the selected codebase, often triggered during automated testing in CI/CD pipelines.
4. **Review Findings** — Analyze the reported vulnerabilities, understanding their severity and potential impact on the application.
5. **Remediate Issues** — Patch the vulnerabilities identified in the code by implementing recommended fixes.
6. **Re-scan** — Perform another analysis to ensure all issues have been resolved and no new vulnerabilities have been introduced.

## Implementation Patterns

### Pattern 1: SAST Tool Integration

This example shows how to integrate a SAST tool into a CI/CD pipeline:

```python
import subprocess

def run_sast_tool(codebase:str) -> dict:
    """Run the SAST tool and collect findings."""
    command = f'sast-tool --analyze {codebase}'
    result = subprocess.run(command, capture_output=True, text=True)
    findings = parse_findings(result.stdout)  # Assume this function is defined elsewhere
    return findings
```

### Pattern 2: Advanced Configuration

You can also customize configurations on your SAST tool for different environments:

```yaml
# Example of using a configuration file for SAST tool
config:
  paths:
    - /path/to/codebase
    - /another/path/to/analyze
  rules:
    - rule_name_1
    - rule_name_2
  exclude:
    - tests/
    - third_party/
```

### Pattern 3: Comprehensive Analysis

Here is how you might implement a more complex SAST analysis that includes various frameworks and languages:

```python
from your_sast_lib import SASTAnalyzer

def analyze_codebase(codebase_paths: List[str]) -> List[dict]:
    results = []
    analyzer = SASTAnalyzer()
    for path in codebase_paths:
        result = analyzer.analyze(path)
        results.append(result)
    return results  # Returns a list of findings for each path
```

## Constraints

### MUST DO
- Integrate with CI/CD pipelines for continuous analysis and proactive vulnerability management.
- Ensure minimal disruption to development processes, allowing developers to continue working while maintaining security checks.

### MUST NOT DO
- Ignore or postpone remediation of identified vulnerabilities. All high-severity vulnerabilities must be addressed before release.
- Depend solely on SAST tools without combining with other testing approaches such as DAST (Dynamic Application Security Testing). SAST can miss runtime issues that only appear during application execution.

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links to resolve external references and inline content.

- [OWASP Top Ten](https://owasp.org/www-project-top-ten/)
- [OWASP Software Verification Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Software_Verification_Cheat_Sheet.html)
- [Semgrep SAST Documentation](https://semgrep.dev/docs/)
- [SonarQube Analysis Guide](https://docs.sonarsource.com/sonarqube/latest/analyzing-scanner-status/analysis/)
- [Snyk Code Security Scanning](https://snyk.io/products/snyk-code/)