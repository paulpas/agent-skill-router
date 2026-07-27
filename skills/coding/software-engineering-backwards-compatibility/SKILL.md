---




name: software-engineering-backwards-compatibility
description: Implements backward-compatible API and library evolution with semantic versioning, feature flags, deprecation windows, and rollback planning.
license: MIT
compatibility: opencode
metadata:
  version: "1.1.0"
  domain: coding
  triggers: backwards compatibility, API versioning, deprecation strategies, feature flags
  role: implementation
  scope: implementation
  output-format: code
  related-skills: software-engineering-deprecation-strategies
  archetypes: tactical, strategic
  anti_triggers: breaking changes, poor communication
  response_profile: medium




---





# Backwards Compatibility Strategies

Maintaining backwards compatibility ensures that existing clients and applications continue to function correctly even as updates and changes are made. This skill provides actionable strategies to implement and manage backwards compatibility effectively.

## When to Use

- When planning new features that could affect existing functionality.
- Prior to releasing upgraded versions of APIs or libraries.
- During code refactoring that might impact current consumers of the code.

## Core Workflow

1. **Identify Compatibility Requirements** — Analyze current functionalities and decide what must remain unchanged.
2. **Implement Versioning** — Use semantic versioning (SemVer) to communicate changes in compatibility.
3. **Apply Feature Flags** — Use feature flags to roll out or roll back changes without breaking existing functionalities.

## Implementation Patterns

### Pattern 1: Versioning Strategy

Semantic versioning provides a clear versioning scheme that communicates compatibility.

```python
# Versioning using Semantic Versioning
class SoftwareVersion:
    def __init__(self, major, minor, patch):
        self.major = major  # Major version - incompatible changes
        self.minor = minor  # Minor version - backward-compatible features
        self.patch = patch   # Patch version - backward-compatible bug fixes
    
    def __str__(self):
        return f"{self.major}.{self.minor}.{self.patch}"
# Example of changing versions
version_1_0_0 = SoftwareVersion(1, 0, 0)  # First release
version_1_1_0 = SoftwareVersion(1, 1, 0)  # Introduces new feature without breaking changes
version_2_0_0 = SoftwareVersion(2, 0, 0)  # Major changes breaking compatibility
```  

### Pattern 2: Using Feature Flags

Feature flags enable you to roll out changes gradually and avoid impacting all users at once.

```python
# Feature Flags Implementation
def perform_action(user, action):
    if is_feature_enabled('new_feature', user):
        return new_feature_action(user, action)
    else:
        return legacy_action(user, action)
    
def is_feature_enabled(feature, user):
    # Logic to determine if the feature is enabled for the specific user
    return feature in user.enabled_features
# Example usage
user_with_flag = {'enabled_features': ['new_feature']}
result = perform_action(user_with_flag, 'action_x')
```  

## Constraints

### MUST DO
- Always communicate changes clearly in the documentation for the users.
- Implement a rollback plan when introducing new features or changes for safety.

### MUST NOT DO
- Avoid making breaking changes without a major version update.
- Do not remove deprecated features abruptly; implement a transition period with clear warnings in advance.

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Semantic Versioning 2.0.0 Specification](https://semver.org/)
- [Wikipedia — API Backward Compatibility](https://en.wikipedia.org/wiki/API_backward_compatibility)
- [Google — API Design Guide: Versioning Best Practices](https://cloud.google.com/apis/design/versioning)
- [Microsoft — API Versioning Best Practices](https://learn.microsoft.com/en-us/azure/api-management/api-management-versioning)
- [OWASP — Backward Compatibility and Migration Security](https://owasp.org/www-project-web-security-testing-guide/)
