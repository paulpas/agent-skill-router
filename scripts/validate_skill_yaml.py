#!/usr/bin/env python3
"""Structural validator for SKILL.md frontmatter and YAML compliance.

Uses PyYAML's safe_load to validate frontmatter structure, then enforces
formatting constraints that require raw-text inspection (version quoting,
delimiter consistency, name-on-line-2 ordering).

Usage:
    python3 validate_skill_yaml.py <path/to/SKILL.md>

Exit codes:
    0 = PASS (all checks passed)
    1 = FAIL (one or more checks failed)

Each check prints a single structured line:
    ✓ Check name: passed
    ✗ Check name: reason for failure

A final summary line reports overall result.
"""

from __future__ import annotations

import sys
import re
from pathlib import Path


def extract_frontmatter(content: str) -> tuple[str, str] | None:
    """Extract frontmatter text and body from SKILL.md content.

    Returns (frontmatter_text, body_text) or None if delimiters are missing.
    """
    # maxsplit=2 so parts[2] captures the ENTIRE body after closing ---.
    # Skills often contain --- in the markdown body (horizontal rules, etc.),
    # and split without maxsplit would truncate the body at the first inner ---.
    parts = content.split('---', 2)
    if len(parts) < 3:
        return None
    fm_text = parts[1]
    body = parts[2]
    return fm_text, body


def check_yaml_parses(fm_text: str, content: str) -> tuple[bool, str | None]:
    """Check #1: Frontmatter parses as valid YAML.

    Tries raw text first; if that fails, normalises literal \\n sequences
    to real newlines (fixing a common generator bug) and retries.
    Returns parsed data dict on success or failure info.
    """
    import yaml

    # Attempt 1: raw frontmatter
    try:
        data = yaml.safe_load(fm_text)
        return True, data
    except yaml.YAMLError:
        pass

    # Attempt 2: normalise literal \n (two chars) to real newlines
    fixed_fm = fm_text.replace('\\n', '\n')
    try:
        data = yaml.safe_load(fixed_fm)
        return True, data
    except yaml.YAMLError as e:
        # Extract a concise error message
        first_line = str(e).split('\n')[0] if str(e) else "unknown parse error"
        return False, f"{first_line}"

    return False, "YAML safe_load returned None — empty frontmatter"


def check_version_quoted(fm_stripped: str) -> bool:
    """Check #3: version value must be quoted with double or single quotes.

    Raw frontmatter text is inspected (not parsed YAML, because safe_load
    would accept unquoted version strings as-is).
    """
    for line in fm_stripped.split('\n'):
        stripped = line.strip()
        if stripped.startswith('version:'):
            has_double_quote = stripped.startswith('version: "') or stripped.startswith("version: '")
            return has_double_quote
    # No version field found at all — that's a YAML parse / metadata issue, not this check
    return True


def check_delimiter_consistency(content: str) -> bool:
    """Check #4: Verify every '---' line in the file is exactly three dashes.

    Scans all lines for standalone --- occurrences and fails if any line
    has 4+ dashes (e.g., '------') which violates the format spec.
    """
    for line in content.split('\n'):
        stripped = line.strip()
        if re.match(r'^-{3,}\s*$', stripped):
            if len(stripped) != 3:
                return False  # Found a delimiter with more than 3 dashes
    return True


def check_name_on_line_2(fm_text: str) -> bool:
    """Check #5: name: must be the first non-empty field after opening ---.

    The frontmatter text starts right after the opening '---'. The first
    non-blank line must begin with 'name:'.
    """
    for line in fm_text.split('\n')[1:]:  # skip the opening --- line
        stripped = line.strip()
        if not stripped:
            continue  # blank lines are OK before name
        return stripped.startswith('name:')
    return True


def check_required_metadata(data: dict) -> list[str] | None:
    """Check #6: metadata must contain all required fields.

    Returns list of missing fields, or None if all present.
    """
    meta = data.get('metadata')
    if not isinstance(meta, dict):
        return ['triggers', 'domain', 'role', 'scope', 'output-format']

    required = ['triggers', 'domain', 'role', 'scope', 'output-format']
    missing = [f for f in required if f not in meta]
    return missing if missing else None


def check_trigger_count(data: dict) -> tuple[bool, int | None]:
    """Check #7: triggers must have 3-8 comma-separated terms.

    Returns (passed, actual_count). Count is None if no triggers field.
    """
    meta = data.get('metadata') or {}
    triggers = meta.get('triggers', '')
    if not isinstance(triggers, str) or not triggers.strip():
        return True, 0

    terms = [t.strip() for t in triggers.split(',') if t.strip()]
    count = len(terms)
    passed = 3 <= count <= 8
    return passed, count


def check_constraints_section(data: dict, body: str) -> bool:
    """Check #8: implementation and review roles require ## Constraints.

    The body text (markdown after closing ---) must contain a '## Constraints'
    heading when the role is 'implementation' or 'review'.
    """
    meta = data.get('metadata') or {}
    role = meta.get('role', '')
    if role in ('implementation', 'review'):
        return '## Constraints' in body
    # Not applicable for other roles (reference, orchestration)
    return True


def validate_skill(skill_path: str) -> int:
    """Validate a SKILL.md file. Returns 0 on pass, 1 on failure."""
    path = Path(skill_path)

    if not path.is_file():
        print(f"✗ File existence: file not found", file=sys.stderr)
        print("RESULT: FAIL (0 of 8 checks passed)")
        return 1

    content = path.read_text(encoding='utf-8')

    # Extract frontmatter
    fm_result = extract_frontmatter(content)
    if fm_result is None:
        print("✗ YAML parses: missing opening/closing --- delimiters", file=sys.stderr)
        print("RESULT: FAIL (0 of 8 checks passed)")
        return 1

    fm_text, body = fm_result
    fm_stripped = fm_text.strip()

    # ── Check 1: YAML parses ───────────────────────────────────────────────
    yaml_ok, parsed_data_or_err = check_yaml_parses(fm_text, content)
    if not yaml_ok:
        print(f"✗ YAML parses: {parsed_data_or_err}", file=sys.stderr)
        print("RESULT: FAIL (0 of 8 checks passed)")
        return 1

    parsed_data = parsed_data_or_err

    # ── Check 2: name matches directory ────────────────────────────────────
    dirname = path.parent.name
    name_in_fm = parsed_data.get('name', '') if isinstance(parsed_data, dict) else ''
    if name_in_fm != dirname:
        print(f"✗ Name matches directory: expected '{dirname}', got '{name_in_fm}'", file=sys.stderr)
        return 1

    # ── Check 3: version is quoted ─────────────────────────────────────────
    if not check_version_quoted(fm_stripped):
        for line in fm_stripped.split('\n'):
            stripped = line.strip()
            if stripped.startswith('version:'):
                print(f"✗ Version is quoted: '{stripped}' — must be version: \"1.0.0\" or version: '1.0.0'", file=sys.stderr)
                return 1

    # ── Check 4: delimiter consistency ─────────────────────────────────────
    if not check_delimiter_consistency(content):
        print("✗ Delimiter consistency: closing delimiter is not exactly '---' (three dashes)", file=sys.stderr)
        return 1

    # ── Check 5: name on line 2 ────────────────────────────────────────────
    if not check_name_on_line_2(fm_text):
        print("✗ Name on line 2: first content line after opening --- must start with 'name:'", file=sys.stderr)
        return 1

    # ── Check 6: required metadata fields ──────────────────────────────────
    missing_meta = check_required_metadata(parsed_data)
    if missing_meta is not None and len(missing_meta) > 0:
        print(f"✗ Required metadata fields: missing {', '.join(missing_meta)}", file=sys.stderr)
        return 1

    # ── Check 7: trigger count ─────────────────────────────────────────────
    trigger_ok, trigger_count = check_trigger_count(parsed_data)
    if not trigger_ok:
        print(f"✗ Trigger count: {trigger_count} terms (must be 3–8)", file=sys.stderr)
        return 1

    # ── Check 8: Constraints section for implementation/review roles ───────
    if not check_constraints_section(parsed_data, body):
        print("✗ Constraints section: required for role=implementation or role=review", file=sys.stderr)
        return 1

    # All checks passed
    print("✓ YAML parses")
    print("✓ Name matches directory")
    print("✓ Version is quoted")
    print("✓ Delimiter consistency")
    print("✓ Name on line 2")
    print("✓ Required metadata fields")
    print("✓ Trigger count")
    print("✓ Constraints section")
    print("RESULT: PASS (all 8 checks passed)")
    return 0


if __name__ == '__main__':
    if len(sys.argv) != 2:
        print(f"Usage: {sys.argv[0]} <path/to/SKILL.md>", file=sys.stderr)
        sys.exit(1)

    sys.exit(validate_skill(sys.argv[1]))
