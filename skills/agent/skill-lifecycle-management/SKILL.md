---
name: skill-lifecycle-management
description: Manages the full lifecycle of OpenCode AI skills including versioning
  strategies, deprecation workflows, backward compatibility checks, and retirement
  procedures for the agent-skill-router system.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: agent
  triggers: skill lifecycle, versioning strategy, skill deprecation, backward compatibility,
    skill retirement, migration guide, how do i sunset a skill
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
  - config
  - diagrams
  related-skills: skill-engineering, skill-router-system, skill-audit
------
# Skill Lifecycle Manager

Orchestrates the complete lifecycle of OpenCode AI skills from initial creation through versioning, deprecation, backward compatibility validation, and retirement — ensuring every skill evolves without breaking existing auto-routing pipelines.

## TL;DR Checklist

- [ ] Parse SKILL.md frontmatter and extract current version before any change
- [ ] Classify the change type (MAJOR / MINOR / PATCH) using semantic versioning rules
- [ ] Update `metadata.version` in frontmatter to match the classified bump
- [ ] Run backward compatibility check against all skills listing this one in `related-skills`
- [ ] If deprecating, write a migration guide and update related-skills cross-references
- [ ] Regenerate README catalog with `python3 scripts/generate_readme.py`

---

## When to Use

Use this skill when:

- You need to bump the version of an existing skill after making changes
- Planning to remove trigger terms, workflow steps, or frontmatter fields from a skill
- A skill has fallen out of use and needs deprecation or retirement procedures
- You are introducing a breaking change and need to communicate it to dependent skills
- Writing a migration guide for users affected by a skill's structural changes

---

## When NOT to Use

Avoid this skill for:

- Initial creation of a brand-new skill (use `skill-engineering` instead)
- Auditing the quality of existing skills (use `skill-audit` instead)
- Routing tasks to skills or managing the routing index itself (use `skill-router-system` instead)
- Simple typo fixes that do not change behavior — just commit with a PATCH version bump

---

## Core Workflow

```
┌──────────────┐    ┌───────────────┐    ┌───────────────┐
│   Idea       │    │   Design      │    │   Create      │
│   & Scope    │───▶│   Spec +     │───▶│   SKILL.md    │
│              │    │   Schema      │    │               │
└──────────────┘    └───────────────┘    └───────┬───────┘
                                                   │
┌──────────────┐    ┌───────────────┐    ┌─────────▼─────────┐
│   Retire     │◀───│  Deprecate    │◀───│   Deploy &        │
│   (archive)  │    │  (mark +      │    │   Validate        │
│              │    │   migrate)     │    │                   │
└──────────────┘    └───────────────┘    └─────────┬─────────┘
                                                   │
                                    ┌──────────────▼─────────┐
                                    │   Monitor &            │
                                    │   Version Bump         │
                                    └────────────────────────┘
```

1. **Classify the Change** — Determine whether the change to a skill is MAJOR, MINOR, or PATCH based on the semantic versioning rules below. Read the current `metadata.version` field, then decide the next version number.
   **Checkpoint:** Record the old version (e.g., `1.2.3`) and the new version (e.g., `1.3.0` for MINOR) in a changelog comment block at the top of SKILL.md.

2. **Bump the Version** — Edit the frontmatter `metadata.version` field to match the classified bump. Also increment the corresponding section count in the file (add/remove patterns, workflow steps).
   **Checkpoint:** Run `./scripts/validate_skill.sh <path>` to verify frontmatter is still valid YAML after the edit.

3. **Run Backward Compatibility Check** — Execute a cross-reference scan: find every other skill whose `related-skills` field lists this skill by name. Verify those skills' trigger sets will not break if this skill's triggers change.
   **Checkpoint:** No dependent skill should list a removed trigger term. If one does, either preserve the trigger or update the dependent skill first.

4. **Update Cross-References** — For every skill that lists this skill as related, verify the path is still correct (directory exists, frontmatter name matches). Remove any entries pointing to archived skills.
   **Checkpoint:** `grep -r "name: <this-skill>" skills/*/SKILL.md` should return only active skills with correct paths.

5. **Regenerate Documentation** — Run `python3 scripts/generate_readme.py` so the README skill catalog reflects any renamed, deprecated, or newly versioned entries.
   **Checkpoint:** Verify your skill appears in the README under its domain section with the updated description and version note.

6. **Commit With Version Tag** — Create a commit that includes only the version bump and any dependency updates: `git add skills/<domain>/<topic>/SKILL.md scripts/generate_readme.py`. Do not include unrelated changes in a version-only commit.
   **Checkpoint:** `git diff --cached` should show no unexpected files beyond the skill itself and the generated README.

---

## Implementation Patterns

### Versioning Strategy — Semantic Versioning Rules

Apply semantic versioning (MAJOR.MINOR.PATCH) to every skill. The rules are strict: a MAJOR bump means breaking changes, MINOR means additive changes, PATCH means non-functional edits.

```python
from enum import Enum


class VersionBumpType(Enum):
    MAJOR = "major"
    MINOR = "minor"
    PATCH = "patch"


def classify_version_bump(
    old_version: str,
    change_type: str
) -> tuple[str, str]:
    """Classify a version bump and compute the next version string.

    Args:
        old_version: Current semantic version (e.g., "1.2.3").
        change_type: One of 'major', 'minor', or 'patch'.

    Returns:
        Tuple of (bump_classification, new_version_string).

    Raises:
        ValueError: If old_version is not a valid semver string
                    or change_type is not one of the allowed values.
    """
    parts = old_version.split(".")
    if len(parts) != 3:
        raise ValueError(
            f"Expected semver format MAJOR.MINOR.PATCH, got: {old_version}"
        )

    try:
        major, minor, patch = [int(p) for p in parts]
    except ValueError:
        raise ValueError(f"Version parts must be integers: {old_version}")

    if change_type == "major":
        new_version = f"{major + 1}.0.0"
    elif change_type == "minor":
        new_version = f"{major}.{minor + 1}.0"
    elif change_type == "patch":
        new_version = f"{major}.{minor}.{patch + 1}"
    else:
        raise ValueError(
            f"Invalid change_type '{change_type}'. Use 'major', 'minor', or 'patch'."
        )

    return (change_type, new_version)


# Examples of classification:
# classify_version_bump("1.2.3", "patch") → ("patch", "1.2.4")
# classify_version_bump("1.2.3", "minor") → ("minor", "1.3.0")
# classify_version_bump("1.2.3", "major") → ("major", "2.0.0")
```

**Rules for classification:**

| Bump Type | What Changes | Example Scenario |
|-----------|-------------|-----------------|
| MAJOR | Trigger set changed, core workflow steps removed or reordered, frontmatter schema changed | Removing `stop loss` as a trigger after migrating to a new skill |
| MINOR | New patterns added, expanded examples, additional trigger terms, new sub-sections | Adding an ATR-based stop pattern to the existing stop-loss skill |
| PATCH | Typo fixes in prose, minor wording clarifications, code comment updates | Fixing a misspelled variable name in a docstring |

---

### Deprecation Workflow

When a skill should no longer be actively developed but must remain available for existing auto-routing:

```python
import os
import re
from dataclasses import dataclass


@dataclass
class DeprecationRecord:
    """Records the metadata of a deprecation event."""
    skill_name: str
    deprecated_by: str
    reason: str
    replacement_skill: str | None
    effective_date: str  # ISO 8601: "2026-05-19"
    sunset_date: str | None  # Optional future date for full retirement


def mark_deprecated(skill_path: str, record: DeprecationRecord) -> list[str]:
    """Mark a skill as deprecated by updating SKILL.md in place.

    Returns a list of file paths that were modified (includes cross-refs).

    Args:
        skill_path: Absolute path to the SKILL.md to deprecate.
        record: DeprecationRecord with full context.
    """
    with open(skill_path, "r") as f:
        content = f.read()

    lines = content.splitlines(True)

    # Insert DEPRECATED banner after H1 title
    modified = []
    for i, line in enumerate(lines):
        if line.startswith("# ") and not line.startswith("##"):
            modified.append(line)  # Keep the H1
            modified.append(f"\n<!-- ⚠️ DEPRECATED: {record.reason} -->\n")
            modified.append(
                f"<!-- Replaced by: `{record.replacement_skill}` -->\n"
            )
            modified.append("<!-- Deprecated: " + record.effective_date + " -->\n")
            continue
        modified.append(line)

    new_content = "".join(modified)

    # Verify the deprecation banner was inserted
    if "⚠️ DEPRECATED" not in new_content:
        raise RuntimeError("Failed to insert deprecation banner into SKILL.md")

    with open(skill_path, "w") as f:
        f.write(new_content)

    modified_files = [skill_path]

    # Update any related-skills entries that point here
    for skill_file in _find_related_skills(skill_path):
        updated = _update_related_reference(skill_file, record.replacement_skill)
        if updated:
            modified_files.append(skill_file)

    return modified_files


def write_migration_guide(
    deprecated_skill: str,
    replacement_skill: str,
    output_dir: str
) -> str:
    """Write a migration guide for users affected by the deprecation.

    Returns the path to the generated migration guide file.
    """
    guide_path = os.path.join(output_dir, f"migration-{deprecated_skill}.md")

    with open(guide_path, "w") as f:
        f.write(f"# Migration Guide: {deprecated_skill} → {replacement_skill}\n\n")
        f.write("## Why This Change Happened\n\n")
        f.write("This skill was deprecated because its functionality has been\n")
        f.write("consolidated into a newer, more comprehensive skill.\n\n")
        f.write("## What Changes for You\n\n")
        f.write(f"1. Replace any `{deprecated_skill}` trigger references with\n")
        f.write(f"   `{replacement_skill}` triggers.\n")
        f.write(f"2. Update your `related-skills` field to point to\n")
        f.write(f"   `{replacement_skill}` instead of `{deprecated_skill}`.\n")
        f.write(f"3. Review the [SKILL.md for {replacement_skill}]({replacement_skill}/SKILL.md)\n")
        f.write(f"   for updated workflow steps.\n\n")
        f.write("## Timeline\n\n")
        f.write("- **Today:** Skill marked deprecated, auto-routing still active\n")
        f.write("- **30 days:** Auto-routing gradually shifts to replacement skill\n")
        f.write("- **90 days:** Deprecated skill removed from skills-index.json\n")

    return guide_path


def _find_related_skills(current_skill_path: str) -> list[str]:
    """Find all SKILL.md files that reference the given skill in related-skills."""
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(current_skill_path)))
    results = []

    for domain_dir in os.listdir(base_dir):
        domain_path = os.path.join(base_dir, domain_dir)
        if not os.path.isdir(domain_path):
            continue
        for skill_dir in os.listdir(domain_path):
            skill_file = os.path.join(domain_path, skill_dir, "SKILL.md")
            if not os.path.isfile(skill_file):
                continue
            with open(skill_file, "r") as f:
                content = f.read()
            # Check for the skill name in related-skills field
            if f"{current_skill_path.split('/')[-2]}" in content:
                results.append(skill_file)

    return results


def _update_related_reference(
    skill_file: str, replacement_skill: str | None
) -> bool:
    """Update a cross-reference to point to the replacement skill."""
    with open(skill_file, "r") as f:
        content = f.read()

    # Simple replacement of related-skills entries
    old_name = skill_file.split("/")[-2]
    new_content = content.replace(old_name, replacement_skill or old_name)

    if old_name != (replacement_skill or ""):
        with open(skill_file, "w") as f:
            f.write(new_content)
        return True

    return False
```

---

### Backward Compatibility Checker

Before publishing a version change, verify that no dependent skills break. This function scans the entire skills directory for cross-reference integrity.

```python
import yaml


def check_backward_compatibility(skill_path: str, base_dir: str) -> dict:
    """Check backward compatibility before publishing a skill change.

    Args:
        skill_path: Path to the SKILL.md being modified.
        base_dir: Root directory of the skills/ folder.

    Returns:
        Compatibility report with issues and recommendations.
    {
        "compatible": True,
        "issues": [],
        "recommendations": []
    }
    """
    report = {"compatible": True, "issues": [], "recommendations": []}

    with open(skill_path, "r") as f:
        data = yaml.safe_load(f)

    old_triggers = set(
        t.strip()
        for t in data.get("metadata", {}).get("triggers", "").split(",")
    )
    skill_name = data["name"]

    # Scan all other skills for references to this one
    for root, dirs, files in os.walk(base_dir):
        if "SKILL.md" not in files:
            continue
        other_path = os.path.join(root, "SKILL.md")
        if other_path == skill_path:
            continue

        with open(other_path, "r") as f:
            other_data = yaml.safe_load(f)

        related = [
            s.strip()
            for s in (other_data.get("metadata", {}).get("related-skills") or "").split(",")
        ]

        if skill_name not in related:
            continue

        # This skill lists us as related — verify no trigger overlap issues
        other_triggers = set(
            t.strip()
            for t in (other_data.get("metadata", {}).get("triggers") or "").split(",")
        )

        # If we removed a trigger that the other skill uses
        removed_triggers = old_triggers - new_triggers  # type: ignore[name-defined]
        if removed_triggers & other_triggers:
            report["compatible"] = False
            report["issues"].append(
                f"Trigger(s) {removed_triggers} were removed but "
                f"'{other_data['name']}' still uses them."
            )
            report["recommendations"].append(
                f"Add back '{', '.join(removed_triggers)}' as a trigger or "
                f"update '{other_data['name']}' to use the replacement skill."
            )

    return report


# Usage example:
# report = check_backward_compatibility("skills/trading/risk-stop-loss/SKILL.md", "skills/")
# if not report["compatible"]:
#     for issue in report["issues"]:
#         print(f"ISSUE: {issue}")
#     for rec in report["recommendations"]:
#         print(f"FIX: {rec}")
```

---

### Retirement and Sunset Procedure

When a skill reaches end-of-life, follow this archive procedure:

```yaml
# Step 1: Move to .archive/ directory structure
# skills/ -> .archive/skills/<domain>/<topic>/
# Preserve the original SKILL.md with DEPRECATED banner intact

# Step 2: Update skills-index.json
# - Remove the skill from the active index
# - Add an "archived" entry under a new "archived_skills" array
#   {
#     "name": "old-skill-name",
#     "domain": "agent",
#     "archived_date": "2026-05-19",
#     "replaced_by": "new-skill-name",
#     "reason": "functionality superseded by new skill"
#   }

# Step 3: Update README.md catalog
# - Remove from the active skill count per domain
# - Add a small "Archived Skills" section at the bottom with links to .archive/

# Step 4: Verify dependent skills no longer reference the archived one
```

**When to retire a skill:**
- **Low usage** — The router access log shows fewer than 10 matches per month for 6 consecutive months
- **Superseded** — A newer skill covers the same domain with better content and triggers
- **Domain moved** — The topic no longer belongs in its current domain (e.g., a trading risk pattern that evolved into a general coding pattern)

**Sunset timeline:**
- **Day 0:** Mark deprecated, publish migration guide
- **Day +30:** Stop indexing as auto-loadable, keep manual access via `/skill`
- **Day +90:** Archive to `.archive/`, remove from skills-index.json active list
- **Day +365:** Purge archived copy (or keep indefinitely if requested)

---

### BAD vs GOOD Examples Across Lifecycle Stages

#### Versioning — BAD vs GOOD

```python
# ❌ BAD: Bumping version without classifying the change type
version = "1.2.3"
new_version = version + ".1"  # Random string concatenation, no semantics

# ✅ GOOD: Using the classification function with explicit rationale
old_ver = "1.2.3"
bump_type, new_ver = classify_version_bump(old_ver, "minor")
assert new_ver == "1.3.0", f"Expected 1.3.0, got {new_ver}"
# Rationale: Added a new ATR-based pattern — additive, non-breaking → MINOR
```

#### Deprecation — BAD vs GOOD

```markdown
<!-- ❌ BAD: No banner, no migration path, just delete the file -->
rm skills/agent/old-skill/SKILL.md

<!-- ✅ GOOD: Mark deprecated with banner and migration guide -->
# Old Skill Name
<!-- ⚠️ DEPRECATED: Functionality merged into skill-engineering -->
<!-- Replaced by: `skill-engineering` -->
<!-- Deprecated: 2026-05-19 -->
```

#### Cross-Reference Integrity — BAD vs GOOD

```yaml
# ❌ BAD: Related-skills references a directory that does not exist
related-skills: skill-engineering, phantom-nonexistent-skill, coding-code-review

# ✅ GOOD: All referenced skills exist and reciprocate
related-skills: skill-engineering, skill-router-system, skill-audit
```

---

## Constraints

### MUST DO
- Classify every version bump as MAJOR, MINOR, or PATCH before editing frontmatter — never guess
- Write a migration guide whenever deprecating a skill whose triggers overlap with other active skills
- Run backward compatibility checks against the full skills/ tree before publishing any MAJOR change
- Update `skills-index.json` and regenerate README.md after every version change
- Maintain the archive for at least 90 days after sunset date to allow dependent tools to adjust

### MUST NOT DO
- Delete a deprecated skill without first archiving it — users may still load it manually via `/skill <name>`
- Change trigger terms without running the backward compatibility checker first
- Bump only the PATCH version when removing workflow steps or patterns (that is at minimum a MINOR change)
- Leave orphaned entries in other skills' `related-skills` fields after retirement
- Use semantic versioning for the skill directory name — only bump it inside frontmatter

---

## Output Template

When applying this skill to manage a skill's lifecycle, produce:

1. **Version Classification Report** — Old version, change type (MAJOR/MINOR/PATCH), new version, and rationale referencing specific sections changed
2. **Backward Compatibility Results** — List of dependent skills checked, any trigger overlap issues found, and recommended actions
3. **Migration Guide** (if deprecating) — File path to the generated guide, affected skills list, timeline summary
4. **Cross-Reference Summary** — How many skills reference this one, which ones need updating, confirmation that all `related-skills` paths resolve
5. **Archive Manifest** (if retiring) — Source path, archive destination, sunset date, replacement skill name

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `skill-engineering` | Creating new skills from scratch — use before managing a new skill's lifecycle |
| `skill-router-system` | Understanding how the router index works — necessary context for deprecation and retirement steps |
| `skill-audit` | Assessing whether a skill has earned its place before deciding to deprecate or retire it |
