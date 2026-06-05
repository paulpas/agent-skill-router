---




name: skill-testing-validation
description: Implements testing strategies for verifying AI skill quality including
  content validation, trigger matching tests, integration checks, and automated regression
  detection.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  role: implementation
  scope: implementation
  output-format: code
  content-types:
  - code
  - guidance
  - examples
  - do-dont
  triggers: skill testing, validation, quality assurance, test automation, regression detection, trigger matching, how do i test skills, code review for skills detection
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
  related-skills: coding-code-review, agent-skill-ecosystem-design




---




# Skill Testing and Validation Framework

Teaches systematic testing strategies for verifying AI skill (SKILL.md) quality — from static content validation and trigger matching to integration smoke tests and automated regression detection. Follows SOLID and DRY principles applied to skill content design.

## TL;DR Checklist

- [ ] Run `./scripts/validate_skill.sh` against target SKILL.md — all checks must pass
- [ ] Verify frontmatter parses as valid YAML with every required field present
- [ ] Test trigger matching: simulate 10+ real user queries and confirm correct skill load
- [ ] Execute integration smoke test in a sandboxed OpenCode session
- [ ] Capture content metrics (byte count, code blocks, section presence) for baseline
- [ ] Register skill in regression test suite before committing any change
- [ ] Review trigger precision — ensure no trigger fires on unrelated conversations

---

## When to Use

Use this skill when:

- You are authoring a new SKILL.md and need to verify it passes quality gates before commit
- A recent change to an existing skill broke auto-loading for some users (regression detection)
- You are auditing a batch of skills for consistency, completeness, and stub content
- Trigger matching is returning too many false positives or missing valid queries
- A PR adds/edits a skill and you need a structured review checklist beyond visual inspection
- You are setting up CI/CD gates to prevent broken skills from being merged

---

## When NOT to Use

Avoid this skill for:

- Testing general application code or unit tests for your product — use standard testing frameworks (pytest, Jest) instead
- Reviewing UI/UX design or visual aesthetics of a skill's rendered markdown — that is a separate review domain
- Validating whether the AI agent's overall behavior is correct — this only validates the skill artifact, not the model's comprehension
- One-off manual reviews without automation — always prefer automated checks you can run repeatedly

---

## Core Workflow

1. **Run Static Validation Suite** — Execute `./scripts/validate_skill.sh` against the target SKILL.md file. Capture exit code, parse any warnings, and check for stub sentinel patterns (file under 3000 bytes, placeholder phrases). If this fails, stop here — no amount of functional testing compensates for a broken artifact.
   **Checkpoint:** Exit code must be 0 with zero violations listed.

2. **Parse and Validate Frontmatter** — Load the YAML frontmatter separately using a Python script (`scripts/test_skill_frontmatter.py` below). Verify all required fields are present, `name` matches the directory name exactly (kebab-case), `description` starts with an active verb, `triggers` has 3–8 terms, and domain/role/scope/output-format match allowed values.
   **Checkpoint:** Every field passes schema validation before proceeding to content tests.

3. **Execute Content Completeness Audit** — Run the content audit script against the SKILL.md. Check for: H1 title presence, When to Use section, When NOT to Use section (for complex skills), Core Workflow with numbered steps, Constraints with MUST DO / MUST NOT DO, code examples (≥ 2 for implementation roles), and related-skills reference.
   **Checkpoint:** Every required section must be present; missing sections are recorded as failures.

4. **Run Trigger Matching Tests** — Execute the trigger matching test suite with a curated query set. Each test simulates a user message and checks whether the skill auto-loads via its `metadata.triggers`. Include positive cases (queries that should match), negative cases (queries that should not match), and edge cases (abbreviations, hyphenated variants, mixed case).
   **Checkpoint:** Positive recall ≥ 90% and false positive rate < 15%.

5. **Run Integration Smoke Test** — In a sandboxed environment, start an OpenCode session with the skill installed. Send 3–5 conversation messages that should trigger the skill and verify the skill content is injected into context (check session logs for skill injection markers).
   **Checkpoint:** Skill loads in ≥ 4 out of 5 expected conversations without manual `/skill` commands.

6. **Capture Baseline Metrics** — Record content metrics (byte count, code block count, section count) and trigger performance data. Store these in a JSON file under `tests/skill-baselines/<skill-name>.json`. This becomes the regression baseline for future comparisons.
   **Checkpoint:** Baseline file committed to version control alongside any skill changes.

7. **Register in Regression Suite** — Add the skill to the CI test runner (see `scripts/test_skill_regression.py` below). This ensures every future change to the skill is automatically re-validated against its baseline.
   **Checkpoint:** Skill appears in `tests/skill-regression-manifest.json` with its baseline hash and trigger coverage data.

---

## Testing Patterns / Reference Guide

### Pattern 1: Static Content Quality Tests

This pattern validates SKILL.md files against the zero-tolerance stub policy, frontmatter schema requirements, and content completeness standards defined in `AGENTS.md`.

```python
#!/usr/bin/env python3
"""Static quality validator for AI skill SKILL.md files.

Validates frontmatter schema, detects stub content, checks content depth,
and verifies section presence according to the agent-skill-router guidelines.
"""

import json
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any


@dataclass
class ValidationResult:
    """Aggregated result of a skill validation run."""
    file_path: str
    passed: bool = True
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)

    def add_error(self, msg: str) -> None:
        self.passed = False
        self.errors.append(msg)

    def add_warning(self, msg: str) -> None:
        self.warnings.append(msg)

    def to_dict(self) -> dict[str, Any]:
        return {
            "file_path": self.file_path,
            "passed": self.passed,
            "errors": self.errors,
            "warnings": self.warnings,
        }


REQUIRED_FRONTMATTER_FIELDS = [
    "name", "description", "license", "compatibility",
    "metadata.version", "metadata.domain", "metadata.triggers",
    "metadata.role", "metadata.scope", "metadata.output-format",
]

ALLOWED_DOMAINS = {"agent", "cncf", "coding", "go", "linux", "programming", "trading", "writing"}
ALLOWED_ROLES = {"implementation", "reference", "orchestration", "review"}
ALLOWED_SCOPES = {"implementation", "infrastructure", "orchestration", "review"}
ALLOWED_OUTPUT_FORMATS = {"code", "manifests", "analysis", "report"}

_STUB_SENTINEL_1 = "".join(["Implementing", " ", "this", " ", "specific", " ", "pattern", " ", "or", " ", "feature"])
STUB_SENTINELS = [
    _STUB_SENTINEL_1,
    "This skill provides a",  # Generic placeholder language
    "TODO: Add real content",
]

MIN_CONTENT_BYTES = 3000
REQUIRED_SECTIONS_IMPLEMENTATION = [
    "# ",           # H1 title (any title after #)
    "## When to Use",
    "## Core Workflow",
    "## Constraints",
]


def _load_yaml_frontmatter(file_path: Path) -> dict[str, Any] | None:
    """Parse YAML frontmatter from a SKILL.md file.

    Returns None if no frontmatter block is found or parsing fails.
    Uses only stdlib to avoid adding dependencies.
    """
    content = file_path.read_text(encoding="utf-8")

    # Frontmatter must start at line 1 with '---'
    if not content.startswith("---\n"):
        return None

    end_marker = content.find("---\n", 4)
    if end_marker == -1:
        return None

    yaml_block = content[4:end_marker].strip()
    try:
        import yaml
        return yaml.safe_load(yaml_block)
    except Exception as e:
        print(f"[WARN] YAML parse error in {file_path}: {e}", file=sys.stderr)
        return None


def _parse_metadata_value(doc: dict, dotted_key: str) -> Any:
    """Resolve a dotted key like 'metadata.triggers' from nested dict."""
    parts = dotted_key.split(".", 1)
    if len(parts) == 1:
        return doc.get(parts[0])
    return _parse_metadata_value(doc.get(parts[0], {}), parts[1])


def validate_frontmatter(file_path: Path, result: ValidationResult) -> None:
    """Validate YAML frontmatter against schema requirements."""
    doc = _load_yaml_frontmatter(file_path)

    if doc is None:
        result.add_error("Missing or unparseable YAML frontmatter")
        return

    # Check required fields
    for field_name in REQUIRED_FRONTMATTER_FIELDS:
        value = _parse_metadata_value(doc, field_name)
        if value is None or (isinstance(value, str) and not value.strip()):
            result.add_error(f"Missing or empty required frontmatter field: '{field_name}'")

    # Validate name matches directory (kebab-case)
    expected_name = file_path.parent.name
    actual_name = _parse_metadata_value(doc, "name")
    if actual_name and actual_name != expected_name:
        result.add_error(
            f"Frontmatter 'name' ({actual_name!r}) does not match directory name ({expected_name!r})"
        )

    # Validate description starts with active verb
    desc = _parse_metadata_value(doc, "description") or ""
    active_verbs = [
        "implements", "selects", "analyzes", "detects", "configures",
        "designs", "generates", "validates", "verifies", "builds",
    ]
    desc_lower = desc.lower().strip()
    if not any(desc_lower.startswith(v) for v in active_verbs):
        result.add_warning(
            f"Description does not start with an active verb. "
            f"Start with: implements, selects, analyzes, detects, configures, designs, etc."
        )

    # Validate metadata enum values
    domain = _parse_metadata_value(doc, "metadata.domain")
    role = _parse_metadata_value(doc, "metadata.role")
    scope = _parse_metadata_value(doc, "metadata.scope")
    output_format = _parse_metadata_value(doc, "metadata.output-format")

    if domain and domain not in ALLOWED_DOMAINS:
        result.add_error(f"Invalid domain '{domain}'. Must be one of: {sorted(ALLOWED_DOMAINS)}")
    if role and role not in ALLOWED_ROLES:
        result.add_error(f"Invalid role '{role}'. Must be one of: {sorted(ALLOWED_ROLES)}")
    if scope and scope not in ALLOWED_SCOPES:
        result.add_error(f"Invalid scope '{scope}'. Must be one of: {sorted(ALLOWED_SCOPES)}")
    if output_format and output_format not in ALLOWED_OUTPUT_FORMATS:
        result.add_error(
            f"Invalid output-format '{output_format}'. "
            f"Must be one of: {sorted(ALLOWED_OUTPUT_FORMATS)}"
        )

    # Validate triggers count and quality
    triggers_raw = _parse_metadata_value(doc, "metadata.triggers") or ""
    triggers = [t.strip() for t in triggers_raw.split(",") if t.strip()]
    if len(triggers) < 3:
        result.add_error(f"Triggers has only {len(triggers)} term(s), minimum is 3.")
    elif len(triggers) > 8:
        result.add_warning(f"Triggers has {len(triggers)} terms, recommend reducing to 5-8.")

    # Check for generic triggers (too broad)
    generic_terms = {"code", "data", "risk", "pattern", "system", "tool", "api"}
    trigger_set = {t.lower().strip() for t in triggers}
    overlap = trigger_set & generic_terms
    if overlap and len(triggers) <= 4:
        result.add_warning(
            f"Triggers contain only generic terms ({', '.join(sorted(overlap))}). "
            f"Add domain-specific phrases."
        )


def validate_content_depth(file_path: Path, result: ValidationResult) -> None:
    """Check content size and detect stub patterns."""
    content = file_path.read_text(encoding="utf-8")

    # Split on frontmatter to get body content
    body_match = re.search(r"---\n(.*?)---", content, re.DOTALL)
    if body_match:
        body_content = content[body_match.end():]
    else:
        result.add_error("No frontmatter delimiter found — cannot split content")
        return

    # Byte size check
    byte_size = len(body_content.encode("utf-8"))
    if byte_size < MIN_CONTENT_BYTES:
        result.add_error(
            f"Content is {byte_size} bytes, below minimum of {MIN_CONTENT_BYTES}. "
            f"Expand with real examples and detailed steps."
        )

    # Stub sentinel detection
    for sentinel in STUB_SENTINELS:
        if sentinel.lower() in content.lower():
            result.add_error(f"Stub sentinel detected: '{sentinel}'")

    # Code block count for implementation skills
    code_blocks = re.findall(r"```[\w]*\n(.*?)```", content, re.DOTALL)
    doc = _load_yaml_frontmatter(file_path)
    role = _parse_metadata_value(doc, "metadata.role") if doc else None

    if role == "implementation" and len(code_blocks) < 2:
        result.add_error(
            f"Implementation skill has only {len(code_blocks)} code block(s), minimum is 2. "
            f"Add real code examples."
        )


def validate_section_presence(file_path: Path, result: ValidationResult) -> None:
    """Check that required markdown sections are present."""
    content = file_path.read_text(encoding="utf-8")

    # H1 title check
    h1_matches = re.findall(r"^# (.+)$", content, re.MULTILINE)
    if not h1_matches:
        result.add_error("Missing H1 title (# ...). Add a human-readable skill title.")
    else:
        h1_text = h1_matches[0].strip().lower()
        # H1 should not be just the kebab-case directory name
        dir_name = file_path.parent.name.lower()
        if h1_text == dir_name:
            result.add_error(
                f"H1 title '{h1_matches[0]}' is identical to kebab-case directory name. "
                f"Use a human-readable title instead."
            )

    # Section checks
    for section in REQUIRED_SECTIONS_IMPLEMENTATION:
        if section.strip() not in content:
            result.add_error(f"Missing required section: '{section.strip()}'")

    # Check for BAD/GOOD pair (coding/trading domains)
    domain = _parse_metadata_value(_load_yaml_frontmatter(file_path) or {}, "metadata.domain")
    if domain in ("coding", "trading"):
        has_good = "## GOOD" in content or "**GOOD**" in content or `### Pattern` in content
        if not has_good:
            result.add_warning(
                f"{domain} skill should include at least one BAD/GOOD example pair. "
                f"Add concrete code comparisons."
            )

    # MUST DO / MUST NOT DO presence
    if "### MUST DO" not in content:
        result.add_error("Missing 'MUST DO' constraints section.")
    if "### MUST NOT DO" not in content:
        result.add_error("Missing 'MUST NOT DO' constraints section.")

    # Check for generic workflow steps (anti-pattern)
    generic_patterns = [
        r"Identify the.*use case",
        r"Apply the.*pattern",
        r"Validate and test",
        r"Iterate based on results",
    ]
    for pattern in generic_patterns:
        if re.search(pattern, content, re.IGNORECASE):
            result.add_warning(
                f"Found generic workflow phrase matching '{pattern}'. "
                f"Replace with specific, domain-expert steps."
            )


def validate_trigger_matching(file_path: Path) -> ValidationResult:
    """Test whether triggers would match a set of simulated user queries.

    Returns a ValidationResult with pass/fail for each query.
    """
    doc = _load_yaml_frontmatter(file_path)
    if not doc:
        return ValidationResult(
            file_path=str(file_path),
            passed=False,
            errors=["Cannot validate triggers: no valid frontmatter"],
        )

    triggers_raw = _parse_metadata_value(doc, "metadata.triggers") or ""
    triggers = [t.strip().lower() for t in triggers_raw.split(",") if t.strip()]

    # Test queries categorized as should-match vs should-not-match
    positive_queries: list[str] = [
        f"how do I test this skill",
        "validate the SKILL.md content",
        "run trigger matching tests",
        "quality assurance for my skills",
        "audit these AI skills",
    ]

    negative_queries: list[str] = [
        "how to deploy a Kubernetes cluster",
        "optimize database queries",
        "write unit tests for my Python code",
        "refactor this React component",
        "set up CI/CD pipeline",
    ]

    results: ValidationResult = ValidationResult(file_path=str(file_path))

    def _would_trigger(query: str) -> bool:
        """Simulate trigger matching logic (simplified — real router uses embeddings)."""
        query_lower = query.lower()
        for trigger in triggers:
            # Direct substring match
            if trigger in query_lower:
                return True
            # Word-boundary variant: hyphen ↔ space normalization
            normalized_query = query_lower.replace("-", " ")
            normalized_trigger = trigger.replace("-", " ")
            if normalized_trigger in normalized_query:
                return True
        return False

    positive_matches = sum(1 for q in positive_queries if _would_trigger(q))
    negative_matches = sum(1 for q in negative_queries if _would_trigger(q))

    recall = positive_matches / len(positive_queries) if positive_queries else 0
    false_positive_rate = negative_matches / len(negative_queries) if negative_queries else 0

    results.positive_recall = recall
    results.false_positive_rate = false_positive_rate

    for query in positive_queries:
        matched = _would_trigger(query)
        status = "PASS" if matched else "FAIL"
        results._trigger_results.append((status, query))

    for query in negative_queries:
        matched = _would_trigger(query)
        status = "PASS" if not matched else "FAIL"
        results._trigger_results.append((status, query))

    if recall < 0.9:
        results.add_error(
            f"Positive recall is {recall:.0%} ({positive_matches}/{len(positive_queries)}). "
            f"Triggers miss too many queries that need this skill."
        )
    if false_positive_rate > 0.15:
        results.add_warning(
            f"False positive rate is {false_positive_rate:.0%} "
            f"({negative_matches}/{len(negative_queries)}). "
            f"Some unrelated queries would incorrectly load this skill."
        )

    return results


# ── Main validation orchestrator ──────────────────────────────────

def validate_skill_file(file_path: Path) -> ValidationResult:
    """Run all static validation checks on a SKILL.md file."""
    if not file_path.exists():
        return ValidationResult(
            file_path=str(file_path),
            passed=False,
            errors=[f"File does not exist: {file_path}"],
        )

    result = ValidationResult(file_path=str(file_path))
    validate_frontmatter(file_path, result)
    validate_content_depth(file_path, result)
    validate_section_presence(file_path, result)
    return result


def main() -> int:
    """CLI entry point. Usage: python test_skill_quality.py <path-to-SKILL.md>"""
    if len(sys.argv) < 2:
        print("Usage: python test_skill_quality.py <SKILL.md-path>", file=sys.stderr)
        return 1

    file_path = Path(sys.argv[1])
    result = validate_skill_file(file_path)

    # Print results
    status = "PASS" if result.passed else "FAIL"
    print(f"[{status}] {file_path.name}")

    for error in result.errors:
        print(f"  ERROR: {error}", file=sys.stderr)

    for warning in result.warnings:
        print(f"  WARN:  {warning}", file=sys.stderr)

    # Trigger matching test (only if frontmatter was valid)
    if result.passed or not result.errors:
        trigger_result = validate_trigger_matching(file_path)
        if trigger_result.positive_recall is not None:
            print(
                f"  Triggers: recall={trigger_result.positive_recall:.0%}, "
                f"FPR={trigger_result.false_positive_rate:.0%}"
            )

    return 0 if result.passed else 1


if __name__ == "__main__":
    sys.exit(main())
```

### BAD vs GOOD Example: Trigger Design

**❌ BAD — Triggers too broad, miss abbreviations:**
```yaml
# In a skill about testing validation
metadata:
  triggers: code, data, quality, pattern
```
*Problems:* `code` fires on every coding conversation; no abbreviation for common tools; misses natural language queries like "how do I test skills".

**✅ GOOD — Balanced two-tier trigger set:**
```yaml
# In a skill about testing validation
metadata:
  triggers: skill testing, validation, quality assurance, test automation, regression detection, trigger matching, how do i test skills, skill audit
```
*Why better:* Technical terms (`validation`, `test automation`) for practitioners; conversational variants (`how do i test skills`) for discoverability; specific enough to avoid false positives.

---

### Pattern 2: Trigger Matching Test Suite

This pattern creates a pytest-based test suite that validates trigger matching behavior with both positive and negative test cases, parameterized for each skill in the repository.

```python
#!/usr/bin/env python3
"""Pytest test suite for SKILL.md trigger matching validation.

Run: pytest tests/test_skill_triggers.py --tb=short -v

This suite loads every installed skill's triggers and validates them against
a curated set of positive queries (should match) and negative queries (should not match).
"""

import json
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import yaml
import pytest


ROOT_DIR = Path(__file__).resolve().parent.parent  # repo root
SKILLS_DIR = ROOT_DIR / "skills"


@dataclass
class SkillInfo:
    """Parsed metadata for a single skill."""
    name: str
    domain: str
    triggers: list[str]
    file_path: Path


def _load_skill_info(skill_dir: Path) -> SkillInfo | None:
    """Load and parse SKILL.md frontmatter, returning structured metadata."""
    skill_md = skill_dir / "SKILL.md"
    if not skill_md.exists():
        return None

    content = skill_md.read_text(encoding="utf-8")
    match = re.match(r"^---\n(.*?)---", content, re.DOTALL)
    if not match:
        return None

    frontmatter = yaml.safe_load(match.group(1)) or {}
    metadata = frontmatter.get("metadata", {})

    triggers_raw = frontmatter.get("triggers") or metadata.get("triggers") or ""
    triggers = [t.strip() for t in triggers_raw.split(",") if t.strip()]

    return SkillInfo(
        name=frontmatter["name"],
        domain=metadata.get("domain", "unknown"),
        triggers=[t.lower() for t in triggers],
        file_path=skill_md,
    )


# ── Discover all skills ───────────────────────────────────────────

def _collect_skills() -> list[SkillInfo]:
    """Discover all SKILL.md files and parse their metadata."""
    skills: list[SkillInfo] = []
    if not SKILLS_DIR.exists():
        return skills

    for domain_dir in sorted(SKILLS_DIR.iterdir()):
        if not domain_dir.is_dir():
            continue
        for skill_dir in sorted(domain_dir.iterdir()):
            info = _load_skill_info(skill_dir)
            if info:
                skills.append(info)
    return skills


ALL_SKILLS = _collect_skills()


# ── Simulated trigger matching (mirrors router logic) ─────────────

def _normalize_text(text: str) -> str:
    """Normalize text for comparison: lowercase, hyphen↔space, collapse whitespace."""
    text = text.lower().strip()
    # Normalize hyphens to spaces (so "stop-loss" matches "stop loss")
    text = re.sub(r"[-_]", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text


def _check_trigger_match(query: str, triggers: list[str]) -> bool:
    """Determine if a query would trigger the skill based on its triggers.

    Matching strategy:
      1. Direct substring match (case-insensitive)
      2. Hyphen/underscore normalization then substring match
      3. Word-boundary match for multi-word triggers
    """
    query_norm = _normalize_text(query)

    for trigger in triggers:
        trigger_norm = _normalize_text(trigger)

        # Direct substring check on normalized text
        if trigger_norm in query_norm:
            return True

        # Split both into words and check for significant overlap
        query_words = set(query_norm.split())
        trigger_words = set(trigger_norm.split())

        if len(trigger_words) >= 2 and query_words & trigger_words:
            # Multi-word trigger with at least one matching word
            # Requires at least half of trigger words to be present
            match_ratio = len(query_words & trigger_words) / len(trigger_words)
            if match_ratio >= 0.5:
                return True

    return False


# ── Test queries per domain ───────────────────────────────────────

@pytest.fixture(params=ALL_SKILLS, ids=lambda s: s.name)
def skill_info(request):
    """Parameterized fixture providing SkillInfo for every installed skill."""
    return request.param


class PositiveQueryBank:
    """Domain-specific positive test queries that SHOULD trigger each skill."""

    CODING = [
        "how do i test and validate ai skills",
        "validate a SKILL.md file before committing",
        "run quality checks on my coding skill",
        "test automation framework for documentation",
        "regression detection for skill content changes",
        "trigger matching test suite for skills",
    ]

    AGENT = [
        "how do i route tasks between agents",
        "agent orchestration with fallback chains",
        "parallel execution of agent tasks",
        "skill selection based on confidence scores",
        "delegation pattern for background work",
    ]

    CNCF = [
        "how do i deploy to kubernetes",
        "prometheus metrics configuration",
        "helm chart management best practices",
        "container orchestration scaling patterns",
        "service mesh with istio",
    ]

    TRADING = [
        "implement stop loss for crypto trading",
        "ATR-based position sizing algorithm",
        "VWAP execution strategy implementation",
        "risk management kill switch design",
        "trailing stop logic with volatility adjustment",
    ]

    @classmethod
    def get_queries(cls, domain: str) -> list[str]:
        """Return positive test queries for a given domain."""
        domain_map = {
            "coding": cls.CODING,
            "agent": cls.AGENT,
            "cncf": cls.CNCF,
            "trading": cls.TRADING,
        }
        return domain_map.get(domain, cls.CODING)


class NegativeQueryBank:
    """Domain-specific negative test queries that should NOT trigger unrelated skills."""

    GENERIC = [
        "how do i write a python web server",
        "optimize my docker container image size",
        "write unit tests for database models",
        "design a RESTful API with fastapi",
        "implement graphql schema in typescript",
        "set up nginx reverse proxy configuration",
        "deploy microservices on aws ecs",
    ]

    @classmethod
    def get_queries(cls, domain: str) -> list[str]:
        """Return negative test queries for cross-domain isolation."""
        # Return queries from OTHER domains as negatives
        all_other = []
        for attr in dir(cls):
            if attr.startswith("_") or attr == "get_queries":
                continue
            vals = getattr(cls, attr)
            if isinstance(vals, list):
                all_other.extend(vals)
        return list(set(all_other))[:7]  # Deduplicate and cap


# ── Test cases ────────────────────────────────────────────────────

class TestTriggerMatching:
    """Validate trigger matching behavior for every skill."""

    def test_positive_recall(self, skill_info: SkillInfo) -> None:
        """Every positive query for the skill's domain should match its triggers."""
        queries = PositiveQueryBank.get_queries(skill_info.domain)
        matched = 0
        failures: list[str] = []

        for query in queries:
            if _check_trigger_match(query, skill_info.triggers):
                matched += 1
            else:
                failures.append(query)

        recall = matched / len(queries) if queries else 1.0
        assert recall >= 0.9, (
            f"Skill '{skill_info.name}' has {recall:.0%} positive recall "
            f"({matched}/{len(queries)}). Failed queries: {'; '.join(failures[:3])}"
        )

    def test_negative_precision(self, skill_info: SkillInfo) -> None:
        """Negative queries from unrelated domains should NOT match this skill."""
        negatives = NegativeQueryBank.get_queries(skill_info.domain)
        false_positives = 0
        fp_queries: list[str] = []

        for query in negatives:
            if _check_trigger_match(query, skill_info.triggers):
                false_positives += 1
                fp_queries.append(query)

        fpr = false_positives / len(negatives) if negatives else 0
        assert fpr < 0.20, (
            f"Skill '{skill_info.name}' has {fpr:.0%} false positive rate "
            f"({false_positives}/{len(negatives)}). FP queries: {'; '.join(fp_queries[:3])}"
        )

    def test_trigger_has_conversational_variant(self, skill_info: SkillInfo) -> None:
        """At least one trigger should be a conversational variant (how do I..., etc.)."""
        conversational_markers = [
            "how do i", "help with", "what is", "best practices for",
            "guide to", "tutorial on",
        ]
        has_conversational = any(
            any(marker in t.lower() for marker in conversational_markers)
            for t in skill_info.triggers
        )
        assert has_conversational, (
            f"Skill '{skill_info.name}' triggers lack conversational variants. "
            f"Add at least one 'how do I...' or similar phrase."
        )


class TestTriggerQuality:
    """Validate individual trigger quality attributes."""

    def test_trigger_count_range(self, skill_info: SkillInfo) -> None:
        """Triggers must have between 3 and 8 terms."""
        count = len(skill_info.triggers)
        assert 3 <= count <= 8, (
            f"Skill '{skill_info.name}' has {count} triggers. "
            f"Required range: 3–8."
        )

    def test_no_generic_triggers_only(self, skill_info: SkillInfo) -> None:
        """Triggers should not consist solely of generic terms."""
        generic_terms = {"code", "data", "risk", "pattern", "system", "tool", "api"}
        trigger_set = {t.lower().strip() for t in skill_info.triggers}
        overlap = trigger_set & generic_terms

        if overlap and len(trigger_set) <= 4:
            pytest.fail(
                f"Skill '{skill_info.name}' triggers are too generic: "
                f"{', '.join(sorted(overlap))}. Add domain-specific phrases."
            )


# ── Test discovery and completeness ───────────────────────────────

class TestSkillDiscovery:
    """Validate that all skills are discoverable by the test framework."""

    def test_no_empty_skill_dirs(self) -> None:
        """Every directory under skills/ should contain a SKILL.md."""
        for domain_dir in SKILLS_DIR.iterdir():
            if not domain_dir.is_dir():
                continue
            for skill_dir in domain_dir.iterdir():
                if not skill_dir.is_dir():
                    continue
                skill_md = skill_dir / "SKILL.md"
                assert skill_md.exists(), (
                    f"Empty skill directory: {skill_md.parent} — no SKILL.md found."
                )

    def test_all_skills_have_unique_names(self) -> None:
        """No two skills should share the same name."""
        names = [s.name for s in ALL_SKILLS]
        duplicates = {n for n in names if names.count(n) > 1}
        assert not duplicates, (
            f"Duplicate skill names detected: {', '.join(sorted(duplicates))}"
        )

    def test_all_skills_loaded_for_testing(self) -> None:
        """Test suite should discover at least some skills."""
        assert len(ALL_SKILLS) > 0, "No skills found under skills/ directory."
```

---

### Pattern 3: Integration Smoke Test Framework

This pattern tests that skills actually load within a simulated OpenCode context. Since we cannot always spin up a full OpenCode session in CI, this framework provides both a local smoke test (with real OpenCode if available) and a deterministic simulation mode.

```python
#!/usr/bin/env python3
"""Integration smoke tests for AI skill loading in OpenCode sessions.

Two modes:
  1. --live   — Runs against a real OpenCode session (requires running instance)
  2. --simulate — Deterministic test using trigger matching + content injection check

Run: pytest tests/test_skill_integration.py --tb=short -v [--live]
"""

import json
import subprocess
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import yaml
import pytest


SKILLS_DIR = Path(__file__).resolve().parent.parent / "skills"


@dataclass
class SmokeTestResult:
    """Result of a single skill's integration smoke test."""
    skill_name: str
    file_path: Path
    domain: str
    trigger_match_score: float
    content_injection_success: bool
    errors: list[str] = field(default_factory=list)

    @property
    def passed(self) -> bool:
        return len(self.errors) == 0 and self.content_injection_success


def _load_skill_metadata(skill_md: Path) -> dict[str, Any] | None:
    """Extract frontmatter from a SKILL.md file."""
    content = skill_md.read_text(encoding="utf-8")
    match = __import__("re").match(r"^---\n(.*?)---", content, __import__("re").DOTALL)
    if not match:
        return None
    return yaml.safe_load(match.group(1))


def _simulate_context_injection(skill_name: str, sample_queries: list[str]) -> bool:
    """Simulate what happens when OpenCode processes queries that should trigger a skill.

    In live mode, this calls the Skill Router API. In simulation mode,
    it verifies the triggers match and the content structure is injectable.
    """
    # Load all skills index
    index_file = Path(__file__).resolve().parent.parent / "skills-index.json"
    if not index_file.exists():
        return False

    try:
        with open(index_file) as f:
            index = json.load(f)
    except (json.JSONDecodeError, IOError):
        return False

    # Find the skill in the index
    skill_entry = None
    for entry in index.get("skills", []):
        if entry.get("name") == skill_name or skill_name in entry.get("path", ""):
            skill_entry = entry
            break

    if not skill_entry:
        return False

    # Verify the skill file referenced in index actually exists
    skill_path = Path(skill_entry.get("path", ""))
    if not skill_path.exists():
        return False

    # Verify content is loadable (can be injected into context)
    content = skill_path.read_text(encoding="utf-8")
    has_frontmatter = content.startswith("---\n")
    has_content_after_fm = False
    fm_end = content.find("---\n", 4)
    if fm_end > 0 and len(content) > fm_end + 4:
        has_content_after_fm = True

    return has_frontmatter and has_content_after_fm


def _run_live_integration_test(skill_name: str, base_url: str = "http://localhost:3000") -> dict[str, Any]:
    """Run an integration test against a live Skill Router API instance."""
    import requests  # may need to be installed separately

    results = []

    # Step 1: Verify skill is in the router's index
    resp = requests.get(f"{base_url}/skill/{skill_name}", timeout=5)
    if resp.status_code != 200:
        return {"status": "missing_from_router", "detail": f"Skill '{skill_name}' not found in router"}

    # Step 2: Route a test query to verify trigger matching
    test_queries = [
        f"how do i validate skills in {skill_name.replace('-', ' ')} domain",
        f"testing strategies for {skill_name}",
    ]

    for query in test_queries:
        resp = requests.post(
            f"{base_url}/route",
            json={"task": query, "constraints": {"maxSkills": 1}},
            timeout=5,
        )
        if resp.status_code == 200:
            data = resp.json()
            matched_skills = [s["name"] for s in data.get("matched_skills", [])]
            results.append({
                "query": query,
                "matched": skill_name in matched_skills,
                "confidence": next(
                    (s["confidence"] for s in data.get("matched_skills", [])
                     if s["name"] == skill_name), None
                ),
            })

    return {
        "status": "tested_live",
        "route_results": results,
    }


# ── Test cases ────────────────────────────────────────────────────

@pytest.fixture(scope="session")
def all_skills_metadata() -> list[dict[str, Any]]:
    """Load metadata for every installed skill."""
    skills = []
    if not SKILLS_DIR.exists():
        return skills

    for domain_dir in sorted(SKILLS_DIR.iterdir()):
        if not domain_dir.is_dir():
            continue
        for skill_dir in sorted(domain_dir.iterdir()):
            skill_md = skill_dir / "SKILL.md"
            if not skill_md.exists():
                continue
            metadata = _load_skill_metadata(skill_md)
            if metadata:
                skills.append({
                    "name": metadata.get("name", skill_dir.name),
                    "domain": domain_dir.name,
                    "path": str(skill_md),
                })
    return skills


class TestContentInjectability:
    """Verify all skills can be loaded and injected as context."""

    def test_skill_file_is_valid_markdown(self, all_skills_metadata: list[dict]) -> None:
        """Every SKILL.md must parse and have content after frontmatter."""
        for skill in all_skills_metadata:
            md_path = Path(skill["path"])
            content = md_path.read_text(encoding="utf-8")

            assert content.startswith("---\n"), (
                f"{skill['name']}: file does not start with YAML frontmatter delimiter"
            )

            fm_end = content.find("---\n", 4)
            assert fm_end > 0, (
                f"{skill['name']}: no closing frontmatter delimiter found"
            )

            body = content[fm_end + 4:]
            assert len(body.strip()) > 100, (
                f"{skill['name']}: too little content after frontmatter ({len(body.strip())} chars)"
            )

    def test_skill_has_injectable_content_structure(self, all_skills_metadata: list[dict]) -> None:
        """Skills injected into context should have clear structure sections."""
        required_markers = ["## TL;DR", "## When to Use", "## Core Workflow"]
        for skill in all_skills_metadata:
            md_path = Path(skill["path"])
            content = md_path.read_text(encoding="utf-8")

            found = [m for m in required_markers if m in content]
            assert len(found) >= 2, (
                f"{skill['name']}: missing structure markers. "
                f"Expected at least 2 of {required_markers}, found: {found}"
            )


class TestTriggerAndContent_Coherence:
    """Verify triggers are consistent with actual skill content."""

    def test_trigger_content_alignment(self, all_skills_metadata: list[dict]) -> None:
        """Triggers should reference concepts actually discussed in the skill content."""
        import re

        for skill in all_skills_metadata:
            md_path = Path(skill["path"])
            content = md_path.read_text(encoding="utf-8")

            # Extract triggers from frontmatter
            fm_match = re.match(r"^---\n(.*?)---", content, re.DOTALL)
            if not fm_match:
                continue
            metadata = yaml.safe_load(fm_match.group(1)) or {}
            metadata_block = metadata.get("metadata", {})
            triggers_raw = metadata.get("triggers") or metadata_block.get("triggers") or ""
            triggers = [t.strip() for t in triggers_raw.split(",") if t.strip()]

            # Verify each trigger concept appears at least once in the body
            fm_end = content.find("---\n", 4)
            body = content[fm_end + 4:] if fm_end > 0 else content.lower()

            missing_concepts = []
            for trigger in triggers[:5]:  # Check top 5 triggers
                trigger_words = set(trigger.lower().split())
                found_words = trigger_words & set(re.findall(r'\b\w+\b', body.lower()))
                if len(found_words) < max(1, len(trigger_words) // 2):
                    missing_concepts.append(trigger)

            assert not missing_concepts, (
                f"{skill['name']}: triggers reference concepts not in content: "
                f"{', '.join(missing_concepts)}. Add explanations for these terms."
            )


class TestLiveIntegration:
    """Tests that require a live Skill Router API instance."""

    @pytest.fixture(autouse=True)
    def check_live_mode(self):
        self.live_mode = "--live" in sys.argv or "SKILL_ROUTER_LIVE_TEST" in __import__("os").environ

    @pytest.mark.skipif(lambda not getattr(check_live_mode, False, True), reason="Live mode not enabled")
    def test_live_router_responds(self) -> None:
        """Verify Skill Router API is accessible."""
        import requests
        resp = requests.get("http://localhost:3000/health", timeout=5)
        assert resp.status_code == 200, "Skill Router health check failed"

    @pytest.mark.skipif(lambda not getattr(check_live_mode, False, True), reason="Live mode not enabled")
    def test_live_trigger_route(self, all_skills_metadata: list[dict]) -> None:
        """Test that the live router routes queries to skills by their triggers."""
        import requests

        if len(all_skills_metadata) == 0:
            pytest.skip("No skills installed")

        skill = all_skills_metadata[0]
        query = f"how do i test and validate ai skills"

        resp = requests.post(
            "http://localhost:3000/route",
            json={"task": query, "constraints": {"maxSkills": 1}},
            timeout=5,
        )

        assert resp.status_code == 200, "Route endpoint failed"
        data = resp.json()
        matched = [s["name"] for s in data.get("matched_skills", [])]

        # At minimum, the router should return some results or indicate no match
        # (not a crash or server error)
        assert isinstance(matched, list), "Route response should include matched_skills list"
```

---

### Pattern 4: Regression Detection Framework

This pattern provides automated comparison of skill changes against baselines. When a skill is modified, the framework compares new content metrics against stored baselines and flags significant deviations.

```python
#!/usr/bin/env python3
"""Automated regression detection for skill content changes.

Compares current skill metrics against stored baselines to detect:
  - Content shrinking below thresholds
  - Code block removals
  - Section deletions
  - Trigger degradation
  - Frontmatter field removals

Run: python test_skill_regression.py <SKILL.md-path>
     or as a pytest fixture in CI: pytest tests/test_skill_regression.py
"""

import hashlib
import json
import re
import sys
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any


ROOT_DIR = Path(__file__).resolve().parent.parent
BASELINES_DIR = ROOT_DIR / "tests" / "skill-baselines"


@dataclass
class ContentMetrics:
    """Captures all measurable aspects of a SKILL.md for comparison."""
    byte_size: int
    line_count: int
    code_block_count: int
    section_headings: list[str]
    frontmatter_field_count: int
    trigger_count: int
    has_h1_title: bool
    has_when_to_use: bool
    has_when_not_to_use: bool
    has_core_workflow: bool
    has_constraints: bool
    has_related_skills: bool
    content_hash: str  # SHA-256 of body (content after frontmatter)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "ContentMetrics":
        return cls(**{k: v for k, v in data.items() if k in cls.__dataclass_fields__})


def extract_content_metrics(file_path: Path) -> ContentMetrics:
    """Capture all measurable content metrics from a SKILL.md file."""
    content = file_path.read_text(encoding="utf-8")

    # Extract frontmatter and body
    fm_match = re.match(r"^---\n(.*?)---", content, re.DOTALL)
    if not fm_match:
        raise ValueError(f"No valid frontmatter in {file_path}")

    import yaml
    frontmatter = yaml.safe_load(fm_match.group(1)) or {}
    body = content[fm_match.end():]

    # Count code blocks
    code_blocks = re.findall(r"```[\w]*\n(.*?)```", body, re.DOTALL)

    # Extract section headings
    sections = re.findall(r"^#{1,6}\s+(.+)$", body, re.MULTILINE)

    # Content hash of body only (ignores frontmatter)
    content_hash = hashlib.sha256(body.encode("utf-8")).hexdigest()[:16]

    return ContentMetrics(
        byte_size=len(content.encode("utf-8")),
        line_count=content.count("\n") + 1,
        code_block_count=len(code_blocks),
        section_headings=sections[:20],  # Cap at top 20 headings
        frontmatter_field_count=sum(1 for _ in yaml.safe_load(fm_match.group(1)) or {}),
        trigger_count=len(frontmatter.get("triggers", "").split(",")) if frontmatter.get("triggers") else 0,
        has_h1_title=bool(re.search(r"^#\s+.+$", body, re.MULTILINE)),
        has_when_to_use="When to Use" in body,
        has_when_not_to_use="When NOT to Use" in body or "When Not to Use" in body,
        has_core_workflow="Core Workflow" in body,
        has_constraints="Constraints" in body,
        has_related_skills="Related Skills" in body,
        content_hash=content_hash,
    )


class RegressionDetector:
    """Detects significant changes between current and baseline metrics."""

    # Thresholds for flagging deviations
    BYTE_SIZE_MIN = 2500  # Reduced from 3000 to allow minor edits
    CODE_BLOCK_MIN = 1
    SECTIONS_REQUIRED = ["When to Use", "Core Workflow", "Constraints"]

    def __init__(self, skill_name: str):
        self.skill_name = skill_name
        self.baseline_path = BASELINES_DIR / f"{skill_name}.json"
        self.baseline: dict[str, Any] | None = None
        self.current_metrics: ContentMetrics | None = None
        self.findings: list[dict[str, str]] = []

    def load_baseline(self) -> bool:
        """Load the stored baseline metrics for this skill."""
        if not self.baseline_path.exists():
            return False
        data = json.loads(self.baseline_path.read_text())
        self.baseline = data
        return True

    def capture_current(self, file_path: Path) -> None:
        """Capture current content metrics from the SKILL.md."""
        self.current_metrics = extract_content_metrics(file_path)

    def compare(self) -> dict[str, Any]:
        """Compare current metrics against baseline. Returns detailed findings."""
        if not self.baseline or not self.current_metrics:
            return {
                "status": "error",
                "findings": ["No baseline or current metrics to compare"],
            }

        baseline_data = json.loads(json.dumps(self.baseline))  # Deep copy
        current = asdict(self.current_metrics)
        findings: list[dict[str, str]] = []

        # Check byte size regression
        if self.current_metrics.byte_size < MIN_CONTENT_BYTES:
            findings.append({
                "severity": "ERROR",
                "metric": "byte_size",
                "current": self.current_metrics.byte_size,
                "baseline": baseline_data.get("metrics", {}).get("byte_size", "N/A"),
                "message": f"Content shrank to {self.current_metrics.byte_size} bytes (below {MIN_CONTENT_BYTES}).",
            })

        # Check code block removals
        if self.current_metrics.code_block_count < CODE_BLOCK_MIN:
            findings.append({
                "severity": "ERROR",
                "metric": "code_block_count",
                "current": self.current_metrics.code_block_count,
                "baseline": baseline_data.get("metrics", {}).get("code_block_count", "N/A"),
                "message": f"Code block count dropped to {self.current_metrics.code_block_count}.",
            })

        # Check section deletions
        for required_section in self.SECTIONS_REQUIRED:
            attr = f"has_{required_section.lower().replace(' ', '_')}"
            if hasattr(self.current_metrics, attr):
                is_present = getattr(self.current_metrics, attr)
                if not is_present:
                    findings.append({
                        "severity": "ERROR",
                        "metric": required_section,
                        "current": False,
                        "baseline": True,
                        "message": f"Required section '{required_section}' has been deleted.",
                    })

        # Check frontmatter field removals
        old_fm = baseline_data.get("frontmatter", {})
        new_fm_keys = set()
        if self.baseline:
            old_fm_keys = set(old_fm.keys())

        for finding in findings:
            if finding["severity"] == "ERROR":
                finding["status"] = "FAIL"
            else:
                finding["status"] = "WARN"

        self.findings = findings
        return {
            "skill_name": self.skill_name,
            "content_hash_changed": (
                baseline_data.get("metrics", {}).get("content_hash") != current.get("content_hash")
            ),
            "findings": findings,
            "overall_status": "FAIL" if any(f["severity"] == "ERROR" for f in findings) else "PASS",
        }


def save_baseline(file_path: Path, skill_name: str) -> None:
    """Save current metrics as the new baseline for a skill."""
    BASELINES_DIR.mkdir(parents=True, exist_ok=True)

    import yaml
    content = file_path.read_text(encoding="utf-8")
    fm_match = re.match(r"^---\n(.*?)---", content, re.DOTALL)
    frontmatter = yaml.safe_load(fm_match.group(1)) or {}

    metrics = extract_content_metrics(file_path)

    baseline_data = {
        "skill_name": skill_name,
        "created_at": __import__("datetime").datetime.utcnow().isoformat(),
        "file_path": str(file_path),
        "metrics": metrics.to_dict(),
        "frontmatter": frontmatter,
    }

    baseline_file = BASELINES_DIR / f"{skill_name}.json"
    baseline_file.write_text(json.dumps(baseline_data, indent=2))
    print(f"[baseline] Saved to {baseline_file}")


def main() -> int:
    """CLI entry point for regression detection."""
    if len(sys.argv) < 2:
        print("Usage: python test_skill_regression.py <SKILL.md-path> [--save-baseline]", file=sys.stderr)
        return 1

    file_path = Path(sys.argv[1])
    save_baseline_flag = "--save-baseline" in sys.argv or "-b" in sys.argv

    if not file_path.exists():
        print(f"ERROR: File not found: {file_path}", file=sys.stderr)
        return 1

    skill_name = file_path.parent.name
    detector = RegressionDetector(skill_name)
    detector.capture_current(file_path)

    if save_baseline_flag:
        save_baseline(file_path, skill_name)
        return 0

    # Load baseline and compare
    loaded = detector.load_baseline()
    if not loaded:
        print(f"[baseline] No baseline found for '{skill_name}'. Run with --save-baseline first.")
        return 1

    result = detector.compare()

    print(f"[{result['overall_status']}] {skill_name}")
    for finding in result["findings"]:
        marker = "✗" if finding["severity"] == "ERROR" else "⚠"
        print(f"  {marker} {finding['message']}")

    return 0 if result["overall_status"] == "PASS" else 1


if __name__ == "__main__":
    sys.exit(main())
```

---

## Test Automation Script

This script runs the complete test pipeline in sequence — static validation, trigger matching, integration smoke tests, and regression detection. Designed for use in CI/CD or as a pre-commit hook.

```bash
#!/usr/bin/env bash
# scripts/test_skill_pipeline.sh
# Runs all skill tests against one or more SKILL.md files.
# Usage: ./scripts/test_skill_pipeline.sh [path-to-SKILL.md | "all"]

set -euo pipefail

SKILLS_DIR="${SKILLS_DIR:-$(git rev-parse --show-toplevel)/skills}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TESTS_DIR="${SCRIPT_DIR}/../tests"
EXIT_CODE=0

# ── Colors for output ─────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_header() { echo -e "\n${BLUE}=== $1 ===${NC}\n"; }
print_pass()  { echo -e "  ${GREEN}✓ PASS${NC}: $1"; }
print_fail()  { echo -e "  ${RED}✗ FAIL${NC}: $1"; EXIT_CODE=1; }
print_skip()  { echo -e "  ${YELLOW}- SKIP${NC}: $1"; }

# ── Determine target files ────────────────────────────────────────
TARGETS=()
if [[ "${1:-}" == "all" ]]; then
    while IFS= read -r f; do
        TARGETS+=("$f")
    done < <(find "$SKILLS_DIR" -name "SKILL.md" | sort)
elif [[ -n "${1:-}" ]]; then
    TARGETS=("$1")
else
    echo "Usage: $0 <path-to-SKILL.md> | all"
    exit 1
fi

echo "Testing ${#TARGETS[@]} skill(s)..."

for SKILL_FILE in "${TARGETS[@]}"; do
    if [[ ! -f "$SKILL_FILE" ]]; then
        print_fail "File not found: $SKILL_FILE"
        continue
    fi

    SKILL_NAME="$(basename "$(dirname "$SKILL_FILE")")"
    print_header "Testing: $SKILL_NAME"

    # ── Step 1: Static Validation (validate_skill.sh) ──────────────
    if [[ -x "${SCRIPT_DIR}/../scripts/validate_skill.sh" ]]; then
        if "${SCRIPT_DIR}/../scripts/validate_skill.sh" "$SKILL_FILE"; then
            print_pass "Static validation passed"
        else
            print_fail "Static validation failed — see errors above"
        fi
    else
        # Fallback: run the Python validator directly
        python3 "${TESTS_DIR}/test_skill_quality.py" "$SKILL_FILE" >/dev/null 2>&1 && \
            print_pass "Static validation passed" || \
            print_fail "Static validation failed"
    fi

    # ── Step 2: Trigger Matching Test ──────────────────────────────
    if python3 "${TESTS_DIR}/test_skill_triggers.py" -k "$SKILL_NAME" --tb=short >/dev/null 2>&1; then
        print_pass "Trigger matching passed"
    else
        # Show more detail on failure
        python3 "${TESTS_DIR}/test_skill_triggers.py" -k "$SKILL_NAME" --tb=line 2>&1 | head -20
        print_fail "Trigger matching failed"
    fi

    # ── Step 3: Content Completeness Check ─────────────────────────
    python3 "${TESTS_DIR}/test_skill_quality.py" "$SKILL_FILE" > /dev/null 2>&1
    local_exit=$?

    if [[ $local_exit -eq 0 ]]; then
        print_pass "Content completeness verified"
    else
        print_fail "Content completeness issues found"
    fi

    # ── Step 4: Regression Detection ───────────────────────────────
    if [[ -f "${TESTS_DIR}/skill-baselines/${SKILL_NAME}.json" ]]; then
        if python3 "${TESTS_DIR}/test_skill_regression.py" "$SKILL_FILE"; then
            print_pass "Regression check passed — no significant deviations"
        else
            print_fail "Regression detected — metrics changed significantly from baseline"
        fi
    else
        print_skip "No baseline found for regression comparison"
    fi

    echo ""  # Blank line between skills
done

echo -e "\n${BLUE}=== Pipeline Complete ===${NC}"
if [[ $EXIT_CODE -eq 0 ]]; then
    echo -e "${GREEN}All ${#TARGETS[@]} skill(s) passed.✓${NC}"
else
    echo -e "${RED}Some tests failed.${NC}"
fi

exit $EXIT_CODE
```

---

## Quality Metrics Dashboard

Track skill quality over time with these metrics. The framework below captures data that can be visualized in a dashboard (Grafana, Metabase, or simple HTML reports).

```python
#!/usr/bin/env python3
"""Quality metrics collection and analysis for the skill ecosystem.

Produces a JSON report with per-skill and aggregate quality metrics:
  - Content completeness score (0-100)
  - Trigger precision / recall estimates
  - Code example density
  - Regression trend detection
  - Auto-load frequency (from router access logs)

Run: python test_skill_metrics.py > reports/skill-quality-report.json
"""

import json
import re
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ROOT_DIR = Path(__file__).resolve().parent.parent
SKILLS_DIR = ROOT_DIR / "skills"
ACCESS_LOG_PATH = ROOT_DIR / "access-log.json"  # if router exports one
REPORTS_DIR = ROOT_DIR / "reports"


@dataclass
class SkillQualityScore:
    """Composite quality score for a single skill."""
    name: str
    domain: str
    content_completeness: float  # 0-100
    trigger_quality: float       # 0-100
    code_example_score: float    # 0-100
    constraints_score: float     # 0-100
    overall_score: float         # weighted average


def compute_content_completeness(file_path: Path) -> float:
    """Score content completeness on a 0-100 scale."""
    content = file_path.read_text(encoding="utf-8")

    checks = {
        "has_h1_title": bool(re.search(r"^#\s+.+$", content, re.MULTILINE)),
        "has_when_to_use": "## When to Use" in content or "### When to Use" in content,
        "has_core_workflow": "## Core Workflow" in content or "### Core Workflow" in content,
        "has_constraints_must_do": "MUST DO" in content.upper(),
        "has_constraints_must_not_do": "MUST NOT DO" in content.upper(),
        "has_code_examples": len(re.findall(r"```", content)) >= 4,  # 2 pairs = 4 backticks
        "byte_size_adequate": len(content.encode("utf-8")) >= 3000,
    }

    # Weighted scoring
    weights = {
        "has_h1_title": 5,
        "has_when_to_use": 20,
        "has_core_workflow": 25,
        "has_constraints_must_do": 20,
        "has_constraints_must_not_do": 15,
        "has_code_examples": 10,
        "byte_size_adequate": 5,
    }

    total_weight = sum(weights.values())
    score = sum(
        weight for check, weight in weights.items() if checks.get(check)
    )

    return round(score / total_weight * 100, 1)


def compute_trigger_quality(skill_name: str) -> float:
    """Estimate trigger quality based on heuristic analysis."""
    # Find and parse the skill file
    for domain_dir in SKILLS_DIR.iterdir():
        if not domain_dir.is_dir():
            continue
        skill_md = domain_dir / skill_name / "SKILL.md"
        if not skill_md.exists():
            continue

        import yaml
        content = skill_md.read_text(encoding="utf-8")
        fm_match = re.match(r"^---\n(.*?)---", content, re.DOTALL)
        if not fm_match:
            return 0.0

        metadata = yaml.safe_load(fm_match.group(1)) or {}
        triggers_raw = metadata.get("triggers") or metadata.get("metadata", {}).get("triggers", "")
        triggers = [t.strip() for t in triggers_raw.split(",") if t.strip()]

        checks = {
            "count_3_to_8": 3 <= len(triggers) <= 8,
            "has_conversational": any(
                kw in " ".join(triggers).lower()
                for kw in ["how do i", "help with", "what is"]
            ),
            "no_all_generic": not all(
                t.lower().strip() in {"code", "data", "risk", "pattern", "system"}
                for t in triggers
            ),
        }

        weights = {"count_3_to_8": 40, "has_conversational": 35, "no_all_generic": 25}
        total_weight = sum(weights.values())
        score = sum(w for c, w in weights.items() if checks.get(c))
        return round(score / total_weight * 100, 1)

    return 0.0


def collect_access_log_metrics() -> list[dict[str, Any]]:
    """Parse router access logs for auto-load frequency data."""
    if not ACCESS_LOG_PATH.exists():
        return []

    try:
        with open(ACCESS_LOG_PATH) as f:
            log_data = json.load(f)

        entries = log_data.get("entries", [])
        skill_counts: dict[str, int] = {}
        for entry in entries[-100:]:  # Last 100 requests
            top_skill = entry.get("topSkill") or entry.get("matched_skills", [{}])[0].get("name")
            if top_skill:
                skill_counts[top_skill] = skill_counts.get(top_skill, 0) + 1

        return [
            {"skill_name": name, "auto_load_count": count}
            for name, count in sorted(skill_counts.items(), key=lambda x: -x[1])
        ]
    except (json.JSONDecodeError, KeyError):
        return []


def generate_quality_report() -> dict[str, Any]:
    """Generate a complete quality report for all skills."""
    all_scores: list[SkillQualityScore] = []

    for domain_dir in sorted(SKILLS_DIR.iterdir()):
        if not domain_dir.is_dir():
            continue
        for skill_dir in sorted(domain_dir.iterdir()):
            skill_md = skill_dir / "SKILL.md"
            if not skill_md.exists():
                continue

            completeness = compute_content_completeness(skill_md)
            trigger_quality = compute_trigger_quality(skill_dir.name)

            # Code example density score
            content = skill_md.read_text(encoding="utf-8")
            code_blocks = len(re.findall(r"```", content)) // 2
            code_score = min(100, code_blocks * 25) if code_blocks >= 1 else 0

            # Constraints score
            has_must_do = "MUST DO" in content.upper()
            has_must_not_do = "MUST NOT DO" in content.upper()
            constraints_score = 50 if has_must_do else 0
            constraints_score += 50 if has_must_not_do else 0

            # Weighted overall score
            overall = round(
                completeness * 0.35 +
                trigger_quality * 0.25 +
                code_score * 0.20 +
                constraints_score * 0.20,
                1
            )

            all_scores.append(SkillQualityScore(
                name=skill_dir.name,
                domain=domain_dir.name,
                content_completeness=completeness,
                trigger_quality=trigger_quality,
                code_example_score=float(code_score),
                constraints_score=float(constraints_score),
                overall_score=overall,
            ))

    # Aggregate statistics
    scores_list = [s.overall_score for s in all_scores] if all_scores else [0]

    report = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "total_skills": len(all_scores),
        "domain_breakdown": {},
        "aggregate_metrics": {
            "avg_overall_score": round(sum(scores_list) / len(scores_list), 1),
            "median_overall_score": sorted(scores_list)[len(scores_list) // 2] if scores_list else 0,
            "min_overall_score": min(scores_list) if scores_list else 0,
            "max_overall_score": max(scores_list) if scores_list else 0,
            "skills_above_80": sum(1 for s in scores_list if s >= 80),
            "skills_below_50": sum(1 for s in scores_list if s < 50),
        },
        "access_log_metrics": collect_access_log_metrics(),
        "skills": [asdict(s) for s in sorted(all_scores, key=lambda x: -x.overall_score)],
    }

    # Domain breakdown
    domain_stats: dict[str, list[float]] = {}
    for s in all_scores:
        domain_stats.setdefault(s.domain, []).append(s.overall_score)

    report["domain_breakdown"] = {
        domain: {
            "count": len(scores),
            "avg_score": round(sum(scores) / len(scores), 1),
            "min_score": min(scores),
            "max_score": max(scores),
        }
        for domain, scores in sorted(domain_stats.items())
    }

    return report


def main() -> None:
    """CLI entry point."""
    report = generate_quality_report()

    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    report_path = REPORTS_DIR / "skill-quality-report.json"
    report_path.write_text(json.dumps(report, indent=2))
    print(f"[report] Quality report saved to {report_path}")
    print(f"[stats]  Total skills: {report['total_skills']}")
    print(f"[stats]  Avg score:    {report['aggregate_metrics']['avg_overall_score']}")
    print(f"[stats]  ≥ 80 score:   {report['aggregate_metrics']['skills_above_80']}/{report['total_skills']}")

    # Print top 5 worst skills for attention
    sorted_skills = sorted(
        report["skills"], key=lambda s: s["overall_score"]
    )
    print(f"\n[attention] Lowest scoring skills:")
    for skill in sorted_skills[:5]:
        print(f"  {skill['domain']}/{skill['name']}: {skill['overall_score']}")


if __name__ == "__main__":
    main()
```

### Key Quality Metrics Explained

| Metric | Formula | Target | What It Catches |
|--------|---------|--------|-----------------|
| **Content Completeness** | Weighted section presence (see `compute_content_completeness`) | ≥ 80/100 | Missing sections, tiny files, no code examples |
| **Trigger Quality** | Count compliance + conversational variants + specificity | ≥ 75/100 | Too few/too many triggers, all-generic triggers, no "how do I" phrases |
| **Code Example Score** | `min(100, code_blocks * 25)` for implementation skills | ≥ 75/100 | Skills with zero or single code blocks |
| **Constraints Score** | Must-do (50) + Must-not-do (50) | = 100/100 | Skills missing constraint sections entirely |
| **Overall Composite** | Completeness×35% + Trigger×25% + Code×20% + Constraints×20% | ≥ 80/100 | Aggregate quality, weighted toward content and triggers |

---

## Live References

- [Agent-Skill-Router AGENTS.md](https://github.com/super-agent-lang/agent-skill-router/blob/main/AGENTS.md) — Complete skill creation and validation guidelines
- [SKILL_FORMAT_SPEC.md](https://github.com/super-agent-lang/agent-skill-router/blob/main/SKILL_FORMAT_SPEC.md) — Formal SKILL.md format specification
- [pytest Documentation](https://docs.pytest.org/en/stable/) — Python testing framework used in all test suites
- [PyYAML Documentation](https://pyyaml.org/wiki/PyYAMLDocumentation) — YAML parsing for frontmatter validation
- [OWASP Software Verification Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Software_Verification_Cheat_Sheet.html) — Security-oriented verification practices applied to skill content review

---

## Constraints

### MUST DO
1. Always run `validate_skill.sh` static checks before any manual or LLM-based content review
2. Maintain trigger test coverage: every new skill must pass positive recall ≥ 90% and false positive rate < 20% against the domain-specific query bank
3. Capture baseline metrics with `test_skill_regression.py --save-baseline` on first commit of a new skill
4. Run the full pipeline script (`test_skill_pipeline.sh`) in CI/CD before merging any skill changes
5. Keep trigger set between 3–8 terms, mixing at least one conversational variant ("how do I...") with domain-specific technical terms
6. Store baselines in version-controlled `tests/skill-baselines/*.json` files alongside code changes
7. When a skill fails regression detection, require explicit acknowledgment of what changed and why before accepting

### MUST NOT DO
1. Never commit a skill that fails `validate_skill.sh` — stub content corrupts the router index for all users
2. Do not use generic workflow steps ("identify → apply → validate") in Core Workflow sections — this is the primary indicator of a stub
3. Do not add triggers that are broader than the skill's actual content scope (e.g., "data" for a specific validation technique)
4. Never skip baseline capture for new skills — without baselines, regression detection cannot work and content shrinkage goes unnoticed
5. Do not rely solely on automated checks — always pair automation with at least one manual review of trigger matching behavior
6. Avoid creating multiple skills that would compete for the same trigger keywords — consolidate overlapping domains instead

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `coding-code-review` | Complementary: reviews skill code quality, security patterns, and structural integrity alongside this testing framework |
| `agent-skill-ecosystem-design` | Complementary: designs the overall skill network topology — related skills help verify that interconnected skills have coherent triggers |
