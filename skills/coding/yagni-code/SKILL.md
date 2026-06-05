---




name: yagni-code
description: Enforces YAGNI at the code level to eliminate dead functions, premature abstractions, and unused configuration by writing only what is immediately required.
license: MIT
compatibility: opencode
archetypes:
  - tactical
anti_triggers:
  - brainstorming
  - vague ideation
  - long-form architecture
response_profile:
  verbosity: low
  directive_strength: high
  abstraction_level: operational
metadata:
  version: "1.0.0"
  domain: coding
  triggers: yagni, dead code, premature abstraction, over-engineering, write-only-needed-code, unnecessary complexity
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: coding-clean-code-refactoring, coding-test-driven-development




---





# YAGNI for Code Implementation

Senior engineer applying the You Aren't Gonna Need It (YAGNI) principle to keep codebases lean, readable, and maintainable by strictly writing only code that solves currently verified problems.

## TL;DR Checklist

- [ ] Reject every abstraction until it is proven necessary by 2+ concrete usages
- [ ] Delete dead imports, unused parameters, and commented-out fallback logic
- [ ] Verify each function/class serves at least one active call site or test
- [ ] Strip configuration keys that lack an active consumer in the current release
- [ ] Question every `TODO` comment — is it still needed or just forgotten?

---

## When to Use

- During feature implementation when tempted to build "flexible" interfaces for hypothetical future needs
- Before creating utility classes, factory patterns, or generic repositories
- When reviewing PRs that introduce unused functions, orphaned config keys, or excessive inheritance hierarchies
- While refactoring legacy code to remove accumulated dead paths

## When NOT to Use

- For security-critical fallbacks or error-handling guards (defensive coding is not premature abstraction)
- When platform constraints mandate specific architectural patterns (e.g., Kubernetes deployment manifests)
- During initial prototyping where rapid exploration justifies temporary duplication

---

## Core Workflow

1. **Identify the Immediate Requirement** — Write down the exact problem this code must solve today. If you cannot name the caller or use case, do not write it yet.
   **Checkpoint:** Can you point to a test case or active integration that exercises this code right now?

2. **Implement the Minimal Solution** — Code only what is explicitly requested. Avoid `if` branches for "maybe later", generic interfaces, or abstract base classes until you have two concrete consumers.
   **Checkpoint:** Does every public method have a documented purpose and a test? If not, remove it.

3. **Audit for Orphaned Artifacts** — Scan the PR for deleted references that left behind functions, config entries, or enum values. Delete them immediately rather than marking as `@deprecated`.
   **Checkpoint:** Run `grep` for the removed symbol across the codebase. If zero matches remain, delete it.

4. **Resist the "Just in Case" Trap** — When a future need is mentioned in comments or tickets, leave a concrete issue link instead of writing speculative code. Future you will thank present you.
   **Checkpoint:** Is the future requirement documented as a ticket? If yes, wait for it. If no, assume it won't happen.

---

## Implementation Patterns

### Pattern 1: Eliminating Premature Abstraction

```python
# ❌ BAD: Generic repository pattern before needing multiple data sources
class DataRepository(Protocol):
    def fetch(self, key: str) -> Any: ...
    def save(self, key: str, value: Any) -> None: ...

class CachedDataRepository(DataRepository):
    def __init__(self, backend: DataRepository, ttl: int = 300): ...

# ✅ GOOD: Direct function for current database-only need
def get_user_preferences(user_id: int) -> dict:
    """Fetch preferences directly from PostgreSQL."""
    return db.query("SELECT prefs FROM user_prefs WHERE id = %s", user_id).one()

def save_user_preferences(user_id: int, prefs: dict) -> None:
    """Save preferences to PostgreSQL."""
    db.execute("INSERT INTO user_prefs (id, prefs) VALUES (%s, %s) ON CONFLICT (id) DO UPDATE SET prefs = EXCLUDED.prefs",
               user_id, json.dumps(prefs))
```

### Pattern 2: Stripping Unused Configuration

```python
# ❌ BAD: Config dict with 15 keys, only 3 are active in production
APP_CONFIG = {
    "database_url": "postgresql://...",       # Active
    "cache_ttl": 300,                         # Active
    "feature_flag_alpha": False,              # Dead — never read
    "legacy_auth_provider": "oauth1",         # Dead — migrated to oauth2
    "experimental_ui_theme": "dark",          # Dead — rolled back
}

# ✅ GOOD: Only active configuration with validation at startup
from pydantic import BaseSettings

class ProductionConfig(BaseSettings):
    database_url: str
    cache_ttl: int = 300

    class Config:
        env_prefix = "APP_"

config = ProductionConfig()  # Fails fast if required keys missing or unused keys clutter namespace
```

### Pattern 3: Killing Zombie Functions (BAD vs. GOOD)

```typescript
// ❌ BAD: Multiple unused export functions left from abandoned A/B test
export async function fetchDashboardDataV1(userId: string): Promise<DashboardData> { /* ... */ }
export async function fetchDashboardDataV2(userId: string): Promise<DashboardData> { /* ... */ }
export function formatMetricsLegacy(metrics: Metric[]): string { /* ... */ }
// Only V2 and formatMetricsModern are used

// ✅ GOOD: Clean exports after dead code removal
export async function fetchDashboardData(userId: string): Promise<DashboardData> {
    return legacyFetcherV2(userId); // Aliased during migration, will be simplified later
}

export function formatMetrics(metrics: Metric[]): string {
    return metrics.map(m => `${m.label}: ${m.value}`).join(', ');
}
```

---

## Constraints

### MUST DO
- Write only one concrete implementation until a second consumer emerges
- Delete unused imports, functions, config keys, and enum values immediately upon discovery
- Replace speculative comments with tracked tickets or GitHub issues
- Run `grep -r` for removed symbols before committing to ensure no orphaned references remain

### MUST NOT DO
- Create interfaces, abstract classes, or factory patterns without at least two concrete implementations
- Leave "TODO: add support for X later" comments without a linked tracking issue
- Preserve dead code under version control as "reference" — delete it permanently
- Use `@deprecated` tags to justify keeping unused APIs alive indefinitely

---

## Output Template

When applying this skill, produce:

1. **Code Diff** — Show exactly what code is added/removed, with clear deletion of dead artifacts
2. **Justification Note** — One sentence explaining why speculative features were rejected in favor of minimal implementation
3. **Audit Checklist** — List of orphaned imports, configs, or functions verified as unused and deleted

---

## Related Skills

| Skill | Purpose |
|---|---|
| `coding-clean-code-refactoring` | Broader clean code techniques beyond YAGNI |
| `coding-test-driven-development` | TDD enforces writing only tested, needed code |

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Wikipedia — YAGNI (You Aren't Gonna Need It)](https://en.wikipedia.org/wiki/YAGNI)
- [Extreme Programming — YAGNI Core Practice](https://xp.colorado.edu/yagni.html)
- [Martin Fowler — You Aren't Gonna Need It](https://martinfowler.com/bliki/Yagni.html)
- [Robert Martin — Clean Code Principles on YAGNI](https://blog.cleancoder.com/)
- [Kent Beck — Test-Driven Development: YAGNI in the Red-Green-Refactor Cycle](https://en.wikipedia.org/wiki/Test-driven_development)
