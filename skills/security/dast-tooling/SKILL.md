---
name: dast-tooling
description: Implements Dynamic Application Security Testing (DAST) methodologies to identify runtime vulnerabilities during the execution phase of applications.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: security
  triggers: dynamic application security testing, runtime analysis, web vulnerabilities, security testing, DAST
  role: implementation
  scope: implementation
  output-format: code
  archetypes: implementation, review
  anti_triggers: static analysis, code review
  response_profile:
    verbosity: medium
    directive_strength: high
    abstraction_level: operational
---

# DAST Tooling

DAST methodologies assess the security of web applications by identifying vulnerabilities during runtime. Unlike SAST, which verifies security in static code, DAST tools execute the application in a running environment, mimicking real-world attacks to uncover vulnerabilities associated with the application’s behavior.

Dynamic Application Security Testing (DAST) evaluates security when the application is running, providing insights into how security vulnerabilities can be exploited in a production-like scenario. This testing is crucial for identifying issues that static analysis may miss, particularly those that stem from user interactions and runtime conditions.

## When to Use

- For analyzing web applications and identifying runtime vulnerabilities.
- When implementing security testing in dynamic environments.
- To complement SAST to examine application behavior under various conditions.

## Core Workflow

1. **Deploy Application** — Ensure the application is live and accessible.
2. **Configure DAST Tool** — Set parameters for the dynamic analysis, including target URLs and testing depth.
3. **Run DAST Analysis** — Execute the tool to discover vulnerabilities including SQL injection, cross-site scripting, and more.
4. **Review Findings** — Analyze reported vulnerabilities and their severity to prioritize remediation steps.
5. **Remediate Issues** — Implement patches or remedies for each finding based on their severity and impact.
6. **Perform Retests** — Verify that vulnerabilities have been resolved by re-running tests to confirm fixes.

## Implementation Patterns

### Pattern 1: DAST Tool Execution

This code demonstrates how to execute a DAST analysis against a running application:

```python
import requests

def run_dast_tool(url: str) -> dict:
    """Run the DAST tool against the specified URL and return findings."""
    response = requests.get(url + '/vulnerable-endpoint')  # Replace with actual endpoints to test
    return analyze_response(response)  # Assume this function is defined elsewhere
```

### Pattern 2: Configuration Example

Here's how you might configure the DAST tool using environment variables or a YAML configuration:

```yaml
# DAST Tool Configuration
url: http://your-web-app.local
api_key: your-api-key
request_timeout: 30s
report_format: json
```

### Pattern 3: Comprehensive Testing

Integrating DAST with automated testing:

```python
import json
import requests

def detailed_dast_analysis(urls: List[str]) -> List[dict]:
    results = []
    for url in urls:
        result = run_dast_tool(url)
        results.append(result)
    return results  # A comprehensive report of findings
```

## Constraints

### MUST DO
- Validate that the application is in a test environment to avoid impacting production systems.
- Ensure thorough coverage of the application during testing by including a variety of user interactions and paths.

### MUST NOT DO
- Rely solely on DAST tools without integrating other security measures; this leads to incomplete security assessments.
- Run DAST analyses against unapproved or unsecured applications—always ensure security policies are adhered to during testing.