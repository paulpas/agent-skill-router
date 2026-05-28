---
name: license-compliance-and-open-source-policy
description: Implements strategies and guidelines for managing software licensing compliance and formulating open-source policies in software engineering practices.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  archetypes:
  - tactical
  - implementation
  anti_triggers:
  - vague ideation
  - boilerplate
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  domain: coding
  triggers: license compliance, open-source policy, software licensing, compliance management, how do i manage open-source, policy formation, licensing guidelines
  role: implementation
  scope: implementation
  output-format: code
  related-skills: coding-code-quality-policies, coding-open-source-contributions
---

# License Compliance and Open-Source Policy
Implements strategies and guidelines for managing software licensing compliance and formulating open-source policies in software engineering practices.

## TL;DR Checklist
- [ ] Ensure all third-party dependencies are compliant with their respective licenses
- [ ] Conduct regular audits of code repositories for license risks
- [ ] Document all open-source software usage and contributions
- [ ] Set explicit guidelines for contribution and usage of open-source libraries

## When to Use
- When integrating third-party libraries into your project
- During the preparation of security audits for software compliance
- At the onset of open-source contributions to ensure adherence to licensing

## Core Workflow
1. **Identify Third-Party Dependencies** — List all libraries and frameworks used in the project. **Checkpoint:** Verify the completeness of the list against the codebase.
2. **Evaluate License Compliance** — Check each dependency's license against organizational policies. **Checkpoint:** Ensure compliance with a formalized checkbox list.
3. **Maintain Documentation** — Create and maintain documentation detailing usage of open-source libraries and compliance status. **Checkpoint:** Documentation should be easily accessible and updated regularly.

## Implementation Patterns
### Identify and Analyze Dependencies
```python
import os
import json

def list_dependencies(file_path: str) -> dict:
    """Extracts dependencies and their licenses from a package file."""
    dependencies = {}
    with open(file_path, 'r') as f:
        data = json.load(f)
    for dep, details in data['dependencies'].items():
        dependencies[dep] = details['license']
    return dependencies
```

### Conduct Compliance Checks
```python
from typing import List, Dict


def evaluate_compliance(dependencies: Dict[str, str], organization_licenses: List[str]) -> List[str]:
    """Assesses license compliance for a list of dependencies."""
    non_compliant = []
    for dep, license_type in dependencies.items():
        if license_type not in organization_licenses:
            non_compliant.append(dep)
    return non_compliant
```

## Constraints
### MUST DO
- Conduct regular audits of all third-party dependencies to identify license risks.
- Maintain clear and detailed documentation of all open-source contributions including License compliance.

### MUST NOT DO
- Use third-party libraries without verifying their licenses against organizational policies.
- Allow contributions to open-source projects without having explicit policies in place to govern them.

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Open Source Initiative — OSI Approved Licenses](https://opensource.org/licenses/alphabetical)
- [ChooseALicense.com — License Selection Guide](https://choosealicense.com/)
- [SPDX License List — Machine-Readable License Identifiers](https://spdx.org/licenses/)
- [SFO — Software Freedom Conservancy Licensing Guidelines](https://sfconservancy.org/)
- [Apache Foundation — License Compliance for Projects](https://www.apache.org/legal/resolved.html)
