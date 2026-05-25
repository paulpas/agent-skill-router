---
name: skill-lifecycle-management
description: Manages the complete lifecycle of SKILL.md files including versioning
  strategies, deprecation workflows, retirement criteria, migration plans, and automated
  drift detection to keep skills current across the repository.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: skill lifecycle, skill versioning, skill deprecation, skill retirement,
    how do i manage skills, skill migration, deprecated skills, skill health monitoring,
    skill drift detection, maturity tracking
  archetypes:
  - tactical
  - generation
  anti_triggers:
  - brainstorming
  - vague ideation
  - code golf
  - over-engineering
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  role: implementation
  scope: implementation
  output-format: code
  content-types:
  - code
  - guidance
  - examples
  - do-dont
  related-skills: coding-skill-development-workflow, agent-skill-trigger-engineering,
    coding-code-quality-policies
------
# Skill Lifecycle Management

Manages the complete lifecycle of SKILL.md files from initial creation through versioning, deprecation, retirement, and migration. This skill provides structured processes for maintaining skill health, detecting content drift over time, and ensuring backward compatibility when skills evolve across versions.

## TL;DR Checklist

- [ ] Assign semantic version (MAJOR.MINOR.PATCH) on every change
- [ ] Document breaking changes in a CHANGELOG entry per skill
- [ ] Run `validate_skill.sh` before marking any skill stable or beta
- [ ] Deprecation requires minimum 2 minor releases of warning before retirement
- [ ] Migration plan must include backward-compatible fallback for deprecated triggers
- [ ] Retired skills are moved to `.archive/` not deleted — preserves git history

---

## When to Use

Use this skill when:

- A SKILL.md file needs a new version release with meaningful changes
- An existing skill is causing false-positive trigger activations and needs deprecation
- Skill content has drifted from the platform it was written for (API changed, library updated)
- Multiple skills cover overlapping functionality and need consolidation or retirement
- Implementing automated health checks across the entire skill repository
- Planning a major version bump that includes breaking changes to metadata format

## When NOT to Use

Avoid this skill for:

- Creating a brand-new SKILL.md from scratch — use `coding-skill-development-workflow` instead
- Designing trigger keywords — use `agent-skill-trigger-engineering` instead
- One-off content edits to a single skill that don't affect version boundaries
- Reviewing source code logic — this skill manages metadata and lifecycle, not domain content

---

## Core Workflow

1. **Assess Change Scope** — Classify the change as MAJOR, MINOR, or PATCH based on impact:
   - MAJOR: Breaking changes to frontmatter schema, removed triggers that existing conversations depend on, changed `metadata.domain` or `metadata.role`, altered output template structure
   - MINOR: New implementation patterns added, new trigger terms (non-breaking), updated code examples for newer library versions, expanded workflow steps
   - PATCH: Typos in prose, corrected typos in code comments, fixed broken links, formatting adjustments
   **Checkpoint:** If MAJOR, a migration plan must be written before incrementing version.

2. **Run Pre-Change Validation** — Execute the full validation pipeline to establish a baseline:
   ```bash
   ./scripts/validate_skill.sh skills/<domain>/<skill-name>/SKILL.md
   python3 scripts/generate_readme.py --quiet
   wc -c skills/<domain>/<skill-name>/SKILL.md  # must be >= 3000
   grep -c '```' skills/<domain>/<skill-name>/SKILL.md  # implementation skills need >= 4 fence lines
   ```
   **Checkpoint:** All checks must pass before making changes. If validation already fails, fix issues first under the current version.

3. **Implement Changes with Version Bump** — Update the `metadata.version` field in frontmatter according to the semantic versioning rules below. Update the `maturity` field if crossing maturity boundaries (stable → draft or beta → stable). Write a CHANGELOG entry describing what changed and why.
   ```python
   # Semantic version bump logic
   def determine_version_bump(changes: list[str]) -> tuple[str, str]:
       """Classify changes and return (bump_type, new_version)."""
       has_breaking = any("breaking" in c.lower() for c in changes)
       has_new_feature = any(
           "new " in c.lower() or "added" in c.lower() for c in changes
       )
       
       if has_breaking:
           return "MAJOR", "2.0.0"  # bump from 1.x.x
       elif has_new_feature:
           return "MINOR", "1.1.0"
       else:
           return "PATCH", "1.0.1"
   ```
   **Checkpoint:** Version must follow semantic versioning — never skip a tier (MAJOR→MINOR is valid, MAJOR→PATCH is not).

4. **Update Triggers for Backward Compatibility** — If adding new trigger terms, include both old and new variants to avoid breaking auto-loading for existing conversation patterns:
   ```yaml
   # Before v1.2.0
   triggers: stop loss, ATR stop, trailing stop
   
   # After v1.2.0 (added conversational variant — backward compatible)
   triggers: stop loss, ATR stop, trailing stop, how do i limit losses, stop-loss
   ```
   **Checkpoint:** Never remove a trigger term without first verifying no active conversation patterns depend on it. Log which conversations would be affected.

5. **Run Post-Change Validation** — Re-run the full validation pipeline after changes:
   ```bash
   ./scripts/validate_skill.sh skills/<domain>/<skill-name>/SKILL.md
   python3 scripts/generate_readme.py
   grep "name: <skill-name>" README.md  # verify skill appears in catalog
   ```
   **Checkpoint:** New version must pass all checks and appear correctly in the regenerated README.

6. **Document Migration Path (MAJOR only)** — For breaking changes, create a migration guide that maps old behavior to new behavior:
   - Which triggers were removed and what replaces them
   - Frontmatter field renames with old→new mappings
   - Output template structural changes with before/after examples
   - Timeline: deprecation warning for 2 releases, then enforce new format

---

## Versioning Strategies

### Semantic Versioning for Skills

Skills follow semver (MAJOR.MINOR.PATCH):

| Bump Type | When to Use | Example Change |
|-----------|-------------|----------------|
| **MAJOR (1→2)** | Breaking metadata changes, removed triggers that affect auto-loading, changed domain or role, altered output template schema | Renamed `metadata.triggers` to `metadata.auto-load-triggers` |
| **MINOR (1.0→1.1)** | New implementation patterns, new trigger terms added, expanded workflow steps, new code examples | Added ATR-based stop loss pattern |
| **PATCH (1.0.0→1.0.1)** | Typos, link fixes, comment corrections, formatting only | Fixed broken link in Implementation Patterns section |

### Maturity Tiers

| Tier | Meaning | Requirements |
|------|---------|--------------|
| `draft` | Work in progress — not yet validated against SKILL_FORMAT_SPEC.md | Must pass validation before release |
| `beta` | Validated but may have edge cases — ready for community feedback | Must pass `validate_skill.sh`, at least 10 real-world test activations |
| `stable` | Proven reliable — no known issues, widely used in production | Must pass validation, LLM quality check, and have 50+ successful activations with zero stub-related complaints |

### Deprecation Timeline

```
v1.0 (current stable) ──► v1.1 (deprecation notice) ──► v1.2 (deprecated) ──► v2.0 (retired, moved to .archive/)
       │                          │                           │                        │
    Active use            Warning in changelog        Last release with           Removed from index
                        + backward-compatible          old triggers               (but preserved
                         fallback triggers                                    in git history)
```

1. **Deprecation Notice** — Add a `## Deprecated` section at the top of the SKILL.md body, after the role paragraph. Include: what is being deprecated, why, the replacement skill or pattern, and the version when it will be removed.
   ```markdown
   <!-- This goes in the markdown body, after the H1 title and role paragraph -->
   
   > **Deprecated since v1.2.0** — Use `coding-new-skill` instead. This skill is scheduled for retirement in v2.0.0.
   ```

2. **Backward-Compatible Fallback** — In the deprecation version, keep old triggers active but add a warning log:
   ```python
   def check_deprecated_triggers(activated_skill: str) -> None:
       """Log warnings for deprecated skill activations."""
       DEPRECATED = {
           "risk-stop-loss": "Use risk-stop-loss-v2",
           "old-pattern": "Migrate to new-pattern module"
       }
       if activated_skill in DEPRECATED:
           replacement = DEPRECATED[activated_skill]
           print(f"[DEPRECATION WARNING] '{activated_skill}' is deprecated — {replacement}")
   ```

3. **Retirement** — Move the SKILL.md to `.archive/<domain>/<original-name>/SKILL.md` rather than deleting it. This preserves git history and allows rollbacks. Update `skills-index.json` to remove the skill from the active index.

---

## Drift Detection

Skill content drifts when the external systems, libraries, or APIs they reference change. Implement periodic drift detection:

### Automated Drift Scan Pattern

```python
#!/usr/bin/env python3
"""Detect SKILL.md files that may need updates due to external changes."""

import re
import json
from pathlib import Path
from dataclasses import dataclass


@dataclass
class DriftAlert:
    skill_path: str
    drift_type: str  # "library_update", "api_change", "trigger_deprecated"
    severity: str    # "info", "warning", "critical"
    message: str


def scan_for_drift(archive_dir: str = "skills") -> list[DriftAlert]:
    """Scan all SKILL.md files for potential drift indicators."""
    alerts: list[DriftAlert] = []
    skills_dir = Path(archive_dir)
    
    # Known patterns that indicate external dependencies
    EXTERNAL_INDICATORS = {
        r"pip install ([\w-]+)==(\d+\.\d+\.\d+)": "hardcoded_version",
        r"go get [^ ]+@v(\d+\.\d+\.\d+)": "go_module_version",
        r"npm install ([\w@/-]+)@\^?(\d+\.\d+\.\d+)": "npm_package_version",
        r"curl.*api\.([a-z-]+)\.com/v(\d+)/": "external_api_endpoint",
    }
    
    for skill_file in skills_dir.rglob("SKILL.md"):
        content = skill_file.read_text()
        
        # Check for hardcoded dependency versions in code examples
        for pattern, indicator_type in EXTERNAL_INDICATORS.items():
            matches = re.findall(pattern, content)
            if matches:
                alerts.append(DriftAlert(
                    skill_path=str(skill_file),
                    drift_type=indicator_type,
                    severity="warning",
                    message=f"Found {len(matches)} external dependency reference(s) — verify versions are current"
                ))
        
        # Check trigger coverage against known deprecated terms
        triggers_match = re.search(r'triggers:\s*(.+)', content)
        if triggers_match:
            triggers = [t.strip() for t in triggers_match.group(1).split(",")]
            if any(len(t) <= 3 and t.isalpha() for t in triggers):
                alerts.append(DriftAlert(
                    skill_path=str(skill_file),
                    drift_type="trigger_quality",
                    severity="info",
                    message="Contains short single-word trigger terms — review against two-tier strategy"
                ))
    
    return alerts


def generate_drift_report(alerts: list[DriftAlert]) -> str:
    """Generate a human-readable drift report."""
    critical = [a for a in alerts if a.severity == "critical"]
    warnings = [a for a in alerts if a.severity == "warning"]
    infos = [a for a in alerts if a.severity == "info"]
    
    lines = ["=== Skill Drift Detection Report ===", f"Total alerts: {len(alerts)}"]
    if critical:
        lines.append(f"\n🔴 CRITICAL ({len(critical)}):")
        for a in critical:
            lines.append(f"  - [{a.skill_path}] {a.message}")
    if warnings:
        lines.append(f"\n🟡 WARNINGS ({len(warnings)}):")
        for a in warnings:
            lines.append(f"  - [{a.skill_path}] {a.message}")
    if infos:
        lines.append(f"\n🔵 INFO ({len(infos)}):")
        for a in infos:
            lines.append(f"  - [{a.skill_path}] {a.message}")
    
    return "\n".join(lines)


if __name__ == "__main__":
    alerts = scan_for_drift()
    print(generate_drift_report(alerts))
    
    # Exit non-zero if any critical alerts found
    has_critical = any(a.severity == "critical" for a in alerts)
    exit(1 if has_critical else 0)
```

### Manual Drift Audit Schedule

| Frequency | Action | Owner |
|-----------|--------|-------|
| Weekly | Run automated drift scan (above script) | CI pipeline |
| Monthly | Review all `beta` maturity skills — update examples, verify links | Maintainer rotation |
| Quarterly | Audit `stable` skills against SKILL_FORMAT_SPEC.md — ensure no format drift | Lead maintainer |
| Annually | Full repository audit — archive skills unused for 6+ months | Release manager |

---

## Retirement and Archive Process

When a skill reaches the end of its lifecycle, follow this process:

1. **Create CHANGELOG Entry** — Document what is being retired, why, and what users should use instead.
   ```markdown
   ## [v2.0.0] - 2026-05-01 — RETIREMENT
   
   ### Removed
   - `old-skill-name`: Retired because the underlying API changed significantly and no viable migration path exists.
   
   ### Replacement
   - Use `new-skill-name` which provides equivalent functionality with updated patterns for the current platform version.
   ```

2. **Archive, Don't Delete** — Move the skill to preserve history:
   ```bash
   mkdir -p .archive/coding/old-skill-name
   mv skills/coding/old-skill-name/SKILL.md .archive/coding/old-skill-name/SKILL.md
   git rm -r skills/coding/old-skill-name/
   ```

3. **Update Index** — Regenerate the skills index to remove the retired skill from auto-loading:
   ```bash
   python3 scripts/generate_readme.py
   curl -X POST http://localhost:3000/reload  # if skill-router is running
   ```

4. **Announce Migration Path** — In any skill that previously referenced the retired skill in `related-skills`, update those references to point to the replacement.

---

## Constraints

### MUST DO
- Use semantic versioning (MAJOR.MINOR.PATCH) for all `metadata.version` changes
- Run `validate_skill.sh` before marking any skill as stable or beta
- Keep deprecated skills in `.archive/` with full git history — never delete
- Document breaking changes with migration guides in MAJOR version releases
- Include both old and new trigger variants during deprecation periods for backward compatibility

### MUST NOT DO
- Bump the PATCH version when making breaking metadata changes
- Remove trigger terms without first verifying no active conversation patterns depend on them
- Delete retired skill files — always move to archive instead of removing from git history
- Mark a skill as `stable` without running LLM quality validation via `validate_skill.sh --llm`
- Skip the deprecation notice period — minimum 2 minor releases between notice and retirement

---

## Output Template

When managing a skill's lifecycle, produce:

1. **Version Assessment** — MAJOR/MINOR/PATCH classification with justification for each change type
2. **Validation Results** — Full output from `validate_skill.sh` confirming the skill passes all checks post-change
3. **Migration Plan** (for MAJOR releases) — Before/after comparison of changed fields, affected trigger mappings, and timeline
4. **Drift Report** — Output from drift detection scan with severity-prioritized alerts
5. **Archive Record** (for retired skills) — Summary of what was retired, why, and which skills reference it in `related-skills`

---

## Related Skills

| Skill | Purpose |
|---|---|
| `coding-skill-development-workflow` | Creates new SKILL.md files with validation — this skill manages them after creation |
| `agent-skill-trigger-engineering` | Designs trigger keywords — this skill handles what happens when triggers fire over time |
| `coding-code-quality-policies` | General code quality standards that apply when updating implementation code inside skills |
