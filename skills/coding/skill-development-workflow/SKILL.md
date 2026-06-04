---
name: skill-development-workflow
description: Implements the complete skill creation lifecycle from research through
  validation, including Python-based quality gates, stub detection, and automated
  compliance checking against SKILL_FORMAT_SPEC.md requirements.
license: MIT
compatibility: opencode
metadata:
version: "1.0.0"
  domain: coding
  triggers: skill creation workflow, skill development, skill lifecycle, quality gate
    validation, skill validator, stub detection, skill compliance check, how do i
    create a skill, SKILL.md format, skill generation pipeline
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
  - do-dont
  - examples
  related-skills: coding-code-quality-policies, agent-skill-trigger-engineering
---
# Skill Development Workflow

Implements the complete skill creation lifecycle with automated quality gates to ensure every SKILL.md meets repository standards before commit. This skill provides Python-based validators that check file size, stub sentinels, code block counts, trigger diversity, and domain-specific structural requirements.

## TL;DR Checklist

- [ ] Run `validate_skill.sh` — must exit 0 (PASS)
- [ ] File is ≥ 3,000 bytes of content (excluding frontmatter)
- [ ] No stub sentinel: "IMPLEMENTING THIS SPECIFIC PATTERN OR FEATURE"
- [ ] At least 2 fenced code blocks for implementation skills
- [ ] Core Workflow uses domain-specific steps with checkpoints — no generic patterns
- [ ] `metadata.triggers` has 5–8 specific terms with both technical and conversational variants
- [ ] H1 title is human-readable, not the kebab-case name
- [ ] Description leads with an active verb and includes 1–2 domain-specific terms

---

## When to Use

Use this skill when:

- Creating a new SKILL.md file for any domain (agent, cncf, coding, go, linux, trading, programming, writing)
- Auditing an existing SKILL.md before committing to the repository
- Fixing validation failures reported by `scripts/validate_skill.sh`
- Migrating skills from another format into the OpenCode skill system
- Setting up CI/CD checks for automated skill quality gates in a pipeline

---

## When NOT to Use

Avoid this skill for:

- Reviewing source code logic or algorithm correctness — use `coding-code-review` instead
- Designing trigger keywords for auto-loading — use `agent-skill-trigger-engineering` instead
- Content editing of documentation outside the SKILL.md format — use domain-specific writing skills

---

## Core Workflow

1. **Research and Scope the Domain** — Study 3–5 existing skills in the target domain to understand conventions, code patterns, and structural norms. Check `skills/<domain>/` for similar topics to avoid duplication.
   **Checkpoint:** Verify no existing skill covers the same topic by comparing descriptions against `python3 scripts/generate_readme.py --list`.

2. **Draft Frontmatter** — Create YAML frontmatter with: exact kebab-case name matching the directory, active-verb description under 200 characters, domain-specific triggers (5–8 terms), and appropriate role/scope/output-format from the domain defaults table in SKILL_FORMAT_SPEC.md.
   **Checkpoint:** `name` field must exactly match the directory name. `metadata.domain` must match the parent directory.

3. **Write H1 Title and Role Paragraph** — Title must be human-readable (e.g., "Stop Loss Manager", not "risk-stop-loss"). The role paragraph (1–3 sentences) describes what the model does when this skill loads, written from the model's perspective.
   **Checkpoint:** No abstract descriptions like "This skill is for X." Use active voice: "Implements…", "Analyzes…", "Selects…".

4. **Implement Core Workflow with Domain-Specific Steps** — Number each step. Include a **Checkpoint** after steps requiring verification. Each step must contain specific actions, commands, file paths, or formulas — not generic instructions like "Identify the use case" or "Apply the pattern."
   **Checkpoint:** Read each step aloud. If it could apply to any domain without modification, rewrite it with domain-specific detail.

5. **Add Implementation Patterns or Reference Guide** — For implementation skills: include at least 2 real code blocks with typed signatures and docstrings. For reference skills: include complete working examples (YAML manifests, PromQL queries, shell scripts). Include at least one BAD vs. GOOD comparison pair.
   **Checkpoint:** Every code block must contain real, working code — no `pass` bodies, no `return {}`, no "your code here" placeholders.

6. **Write Constraints (MUST DO / MUST NOT DO)** — Each constraint must be a short imperative sentence that is actionable and specific. Avoid generic phrases like "follow best practices." Instead: "Base trailing stop distance on ATR, not a fixed price or percentage."
   **Checkpoint:** Remove any constraint that doesn't contain a concrete, testable rule.

7. **Add When NOT to Use** — List 2–4 situations where this skill creates overhead without benefit. Reference related skills by name (e.g., "use `coding-code-review` instead"). This prevents the model from inappropriately loading the skill.
   **Checkpoint:** Each exclusion must reference a specific alternative skill or clearly describe the anti-pattern.

8. **Validate and Iterate** — Run the full validation pipeline: static checks via `./scripts/validate_skill.sh`, then `python3 scripts/generate_readme.py` to ensure the README catalog updates correctly. Fix any failures before committing.
   **Checkpoint:** `validate_skill.sh` must exit 0 with no errors reported. The new skill must appear in the regenerated README.

---

## Python Quality Gate Validator

This validator implements all static checks from `scripts/validate_skill.sh` plus additional structural validations. Use it as a pre-commit hook or CI step.

```python
#!/usr/bin/env python3
"""Skill quality gate validator for SKILL.md files."""

import sys
import re
from pathlib import Path
from dataclasses import dataclass, field


@dataclass
class ValidationResult:
    file_path: str
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    
    @property
    def passed(self) -> bool:
        return len(self.errors) == 0
    
    def add_error(self, msg: str):
        self.errors.append(msg)
        print(f"  ❌ ERROR: {msg}")
    
    def add_warning(self, msg: str):
        self.warnings.append(msg)
        print(f"  ⚠️  WARNING: {msg}")


STUB_SENTINELS = [
    "IMPLEMENTING THIS SPECIFIC PATTERN OR FEATURE",
    "pass  # TODO: implement logic",
    "return {}  # placeholder",
    "your code here",
    "replace with actual implementation",
]

GENERIC_WORKFLOW_PATTERNS = [
    r"[Ii]dentify the [sS]pecific [uU]se [cC]ase",
    r"[Aa]pply the pattern or technique",
    r"[Vv]alidate and test the implementation",
    r"[Ii]terate based on results",
    r"follow best practices for",
]

MIN_FILE_SIZE = 3000
MIN_CODE_BLOCK_PAIRS = 2
MIN_TRIGGER_COUNT = 5
MAX_TRIGGER_COUNT = 8


def load_skill(path: str) -> tuple[str, str]:
    """Load and parse a SKILL.md file. Returns (frontmatter_yaml, markdown_body)."""
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Extract YAML frontmatter between --- delimiters
    if not content.startswith("---"):
        raise ValueError(f"{path}: Missing YAML frontmatter delimiter at start")
    
    parts = content.split("---", 2)
    if len(parts) < 3:
        raise ValueError(f"{path}: Frontmatter must be delimited by --- on both sides")
    
    return parts[1].strip(), parts[2].strip()


def check_stub_sentinels(result: ValidationResult, body: str):
    """Check for stub sentinel strings that indicate placeholder content."""
    text_lower = body.lower()
    for sentinel in STUB_SENTINELS:
        if sentinel.lower() in text_lower:
            result.add_error(f"Stub sentinel found: '{sentinel}'")


def check_file_size(result: ValidationResult, body: str):
    """Verify file meets minimum content size requirement."""
    body_bytes = len(body.encode("utf-8"))
    if body_bytes < MIN_FILE_SIZE:
        result.add_error(
            f"File too small: {body_bytes} bytes (minimum {MIN_FILE_SIZE}). "
            "Expand with real examples, detailed workflows, and domain-specific content."
        )


def check_code_blocks(result: ValidationResult, body: str, role: str):
    """For implementation skills, verify at least 2 fenced code blocks exist."""
    if role != "implementation":
        return
    
    fence_count = len(re.findall(r'^\s*```', body, re.MULTILINE))
    block_pairs = fence_count // 2
    
    if block_pairs < MIN_CODE_BLOCK_PAIRS:
        result.add_error(
            f"Implementation skill has {block_pairs} code blocks "
            f"(minimum {MIN_CODE_BLOCK_PAIRS}). Add real working code examples."
        )


def check_generic_workflow(result: ValidationResult, body: str):
    """Detect generic workflow patterns that indicate stub content."""
    found_patterns = []
    for pattern in GENERIC_WORKFLOW_PATTERNS:
        if re.search(pattern, body):
            found_patterns.append(pattern)
    
    if len(found_patterns) >= 2:
        result.add_error(
            f"Generic Core Workflow detected ({len(found_patterns)}/{len(GENERIC_WORKFLOW_PATTERNS)} "
            f"stub phrases found). Replace with domain-specific steps."
        )


def check_trigger_diversity(result: ValidationResult, triggers_str: str):
    """Validate trigger field meets quality standards."""
    if not triggers_str or len(triggers_str.strip()) == 0:
        result.add_error("metadata.triggers is empty or missing")
        return
    
    # Split by comma and clean up each trigger
    triggers = [t.strip() for t in triggers_str.split(",") if t.strip()]
    
    count = len(triggers)
    if count < MIN_TRIGGER_COUNT:
        result.add_error(
            f"Only {count} triggers found (minimum {MIN_TRIGGER_COUNT}). "
            "Add domain-specific keywords, abbreviations, and conversational variants."
        )
    elif count > MAX_TRIGGER_COUNT:
        result.add_warning(
            f"{count} triggers specified (maximum {MAX_TRIGGER_COUNT}). "
            "Consider consolidating to reduce false positives."
        )
    
    # Check for ultra-generic single-word triggers
    generic_singletons = {"code", "data", "risk", "pattern", "testing", "design", "security"}
    for trigger in triggers:
        words = trigger.split()
        if len(words) == 1 and words[0].lower() in generic_singletons:
            result.add_warning(
                f"Generic single-word trigger '{trigger}' may match irrelevant conversations. "
                "Be more specific (e.g., 'security audit' instead of 'security')."
            )


def check_structure(result: ValidationResult, body: str):
    """Verify required structural sections exist in the markdown body."""
    has_h1 = bool(re.search(r'^#\s+', body, re.MULTILINE))
    if not has_h1:
        result.add_error("Missing H1 title heading")
    
    has_when_to_use = bool(re.search(r'##\s+When to Use', body, re.IGNORECASE))
    if not has_when_to_use:
        result.add_error('Missing "When to Use" section')
    
    has_core_workflow = bool(re.search(r'##\s+Core Workflow', body, re.IGNORECASE))
    if not has_core_workflow:
        result.add_error('Missing "Core Workflow" section')
    
    # Check for numbered steps in workflow (indicates specific, non-generic workflow)
    workflow_section = re.search(
        r'##\s+Core Workflow\s+(.*?)(?:^##|\Z)', body, re.IGNORECASE | re.DOTALL
    )
    if workflow_section:
        step_count = len(re.findall(r'^\d+\.', workflow_section.group(1), re.MULTILINE))
        if step_count < 3:
            result.add_warning(
                f"Core Workflow has only {step_count} steps. "
                "Break complex workflows into numbered sub-steps for clarity."
            )


def validate_skill(file_path: str) -> ValidationResult:
    """Run all validation checks on a SKILL.md file."""
    result = ValidationResult(file_path=file_path)
    print(f"\n🔍 Validating: {file_path}")
    
    try:
        frontmatter, body = load_skill(file_path)
    except ValueError as e:
        result.add_error(str(e))
        return result
    
    # Parse frontmatter for metadata
    role_match = re.search(r'role:\s*(\w+)', frontmatter)
    domain_match = re.search(r'domain:\s*(\w+)', frontmatter)
    triggers_match = re.search(r'triggers:\s*(.+)', frontmatter)
    
    role = role_match.group(1) if role_match else ""
    domain = domain_match.group(1) if domain_match else ""
    triggers_str = triggers_match.group(1).strip() if triggers_match else ""
    
    print(f"  Domain: {domain} | Role: {role}")
    
    # Run all checks
    check_stub_sentinels(result, body)
    check_file_size(result, body)
    check_code_blocks(result, body, role)
    check_generic_workflow(result, body)
    check_trigger_diversity(result, triggers_str)
    check_structure(result, body)
    
    if result.passed and result.warnings:
        print(f"\n✅ PASS with warnings: {file_path}")
        for w in result.warnings:
            print(f"   • {w}")
    elif result.passed:
        print(f"\n✅ PASS: {file_path}")
    else:
        print(f"\n❌ FAIL: {file_path}")
    
    return result


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 skill_validator.py <path/to/SKILL.md>")
        sys.exit(1)
    
    results = []
    all_passed = True
    
    for path in sys.argv[1:]:
        result = validate_skill(path)
        results.append(result)
        if not result.passed:
            all_passed = False
    
    print(f"\n{'='*60}")
    total = len(results)
    passed = sum(1 for r in results if r.passed)
    print(f"Results: {passed}/{total} skills passed validation")
    
    sys.exit(0 if all_passed else 1)
```

## Bash-Based Validation Script Pattern

For CI/CD integration, wrap the Python validator with a bash script that also runs `validate_skill.sh`:

```bash
#!/usr/bin/env bash
# Pre-commit skill validation pipeline
set -euo pipefail

SKILL_FILE="${1:?Usage: pre-commit-validate <path/to/SKILL.md>}"

echo "=== Stage 1: Static checks (validate_skill.sh) ==="
if ./scripts/validate_skill.sh "$SKILL_FILE"; then
    echo "✅ Static checks passed"
else
    echo "❌ Static checks failed — fix issues before committing"
    exit 1
fi

echo ""
echo "=== Stage 2: Python quality gate validator ==="
python3 scripts/skill_validator.py "$SKILL_FILE" || exit 1

echo ""
echo "=== Stage 3: README catalog update check ==="
if ! command -v python3 &>/dev/null; then
    echo "⚠️  python3 not available — skipping README regeneration"
else
    # Run regenerate and verify the new skill appears
    OLD_COUNT=$(grep -c "^- \[`skills/" README.md || true)
    python3 scripts/generate_readme.py --quiet 2>/dev/null || true
    NEW_COUNT=$(grep -c "^- \[`skills/" README.md || true)
    
    if [ "$NEW_COUNT" -ge "$OLD_COUNT" ]; then
        echo "✅ README catalog updated successfully"
    else
        echo "❌ README may not have been updated correctly"
        exit 1
    fi
fi

echo ""
echo "✅ All validation stages passed for $SKILL_FILE"
```

## Domain-Specific Structural Requirements

After the core workflow, apply domain-specific structural additions based on the skill's `metadata.domain` value. Refer to SKILL_FORMAT_SPEC.md Section 4 for detailed requirements.

### Agent Skills (`agent/*`)
- **Must include:** ASCII orchestration flow diagram showing routing logic and fallback paths
- **Must reference:** `code-philosophy` (5 Laws of Elegant Defense) in constraints or workflow
- **Example flow structure:**
  ```
  User Task → Extract Features → Score All Skills ──→ No match → FallbackSkill
                      ↓ (threshold met)
              Select Best Skill → Execute → Record Result
  ```

### CNCF Skills (`cncf/*`)
- **Must include:** Purpose and Use Cases, Architecture Design Patterns, Integration Approaches, Common Pitfalls sections
- **Must include:** At least one complete working YAML manifest example (e.g., ServiceMonitor, Deployment)
- **Lead with:** Project metadata (category, stars, language, docs URL)

### Coding Skills (`coding/*`)
- **Must include:** At least one BAD vs. GOOD code example pair
- **Must reference:** A relevant standard (OWASP, SOLID, DRY, KISS, etc.)
- **Must include:** Constraints section with actionable MUST DO / MUST NOT DO rules

### Go Skills (`go/*`)
- **Must include:** Idiomatic Go code with error wrapping using `%w`, sentinel errors
- **Must include:** Goroutine lifecycle management guidelines (context propagation, cancellation)
- **Anti-patterns to call out:** Ignored errors, goroutine leaks, bare `panic` usage

### Linux Skills (`linux/*`)
- **Must include:** Shell scripts with `set -euo pipefail`, proper quoting, idempotent operations
- **Must address:** Security considerations (least privilege, file permissions)
- **Anti-patterns to call out:** Root-level services, hardcoded paths, unsafe glob patterns

### Trading Skills (`trading/*`)
- **Must include:** Python implementation with typed signatures and docstrings
- **Must reference:** APEX platform file path conventions (`risk_engine/`, `execution/`, etc.)
- **Must include:** Risk constraints — explicit statements of what must never be bypassed

### Programming Skills (`programming/*`)
- **Must include:** Algorithm pseudocode or reference implementation
- **Must include:** Complexity analysis (time and space) in a structured table
- **Format:** Show both the algorithm name and the problem category it solves

### Writing Skills (`writing/*`)
- **Must include:** At least one before/after text comparison showing improvement
- **Must include:** Style rules with reasoning, not just rules without justification
- **Include:** Tone and voice guidelines specific to the documentation context

## Constraints

### MUST DO
- Run `./scripts/validate_skill.sh` on every SKILL.md before committing
- Ensure file size is ≥ 3,000 bytes of content (excluding frontmatter)
- Include at least one BAD vs. GOOD code example pair for implementation skills
- Write triggers that include both technical terms AND conversational variants
- Use domain-specific steps with checkpoints — never generic "identify → apply → validate"
- Reference `code-philosophy` (5 Laws of Elegant Defense) in agent domain skills

### MUST NOT DO
- Include any stub sentinel: "IMPLEMENTING THIS SPECIFIC PATTERN OR FEATURE", "pass", "return {}"
- Write workflow steps that could apply to any domain without modification
- Use generic triggers like `code`, `data`, `risk`, `pattern` — be domain-specific
- Set stops at round numbers (for trading skills) or use magic numbers in code
- Ignore the zero-tolerance stub policy — a stub skill corrupts the router index

## Output Template

When creating or auditing a skill, produce:

1. **Domain and Role Selection** — Which domain the skill belongs to and why, with role/scope/output-format justification
2. **Directory and Name** — The kebab-case directory path and frontmatter name (must match)
3. **Frontmatter Draft** — Complete YAML frontmatter with all required and recommended fields
4. **Section Verification Checklist** — Every required section confirmed present or explicitly omitted with reasoning
5. **Validation Results** — Output from `validate_skill.sh` showing PASS/FAIL for each check
6. **Code Example Review** — At least one BAD vs. GOOD pair, with explanation of what makes the GOOD version correct

## Related Skills

| Skill | Purpose |
|---|---|
| `coding-code-quality-policies` | General code quality standards that apply when writing implementation code inside skills |
| `agent-skill-trigger-engineering` | Designing trigger keywords for optimal skill auto-loading and discovery |
| `agent-skill-creator` | Orchestrated approach to skill creation (uses this skill as a sub-step) |

## Live References

> Authoritative documentation links for this domain. The model follows markdown links at load time to resolve external references and inline content.

- [OpenCode Skill Documentation](https://opencode.ai/docs/skills) — Official OpenCode documentation on skill structure, configuration, and loading mechanisms
- [Semantic Versioning 2.0.0 (semver.org)](https://semver.org/) — The semantic versioning specification for managing skill versions and breaking changes
- [GitHub Actions for Skill CI/CD](https://docs.github.com/en/actions/use-cases-and-examples/building-and-testing/building-python-using-actions-and-matrix) — GitHub Actions patterns for automated skill validation in CI pipelines
- [MarkdownLint Rules Reference](https://github.com/markdownlint/markdownlint/blob/main/docs/RULES.md) — CommonMark lint rules applicable to SKILL.md quality enforcement in the development workflow
- [RFC Process for Skill Changes (agent-skill-router)](https://github.com/anthropics/agent-skill-router) — The repository's contribution guidelines and RFC process for skill ecosystem changes