"""Quick validation script for the new SKILL.md."""

import argparse
from pathlib import Path

DEFAULT_SKILL_PATH = str(Path(__file__).parent / "skills" / "coding" / "domain-architecture-project-structure" / "SKILL.md")

parser = argparse.ArgumentParser(description="Validate a new SKILL.md against quality checks.")
parser.add_argument(
    "skill_file",
    nargs="?",
    default=DEFAULT_SKILL_PATH,
    help="Path to the SKILL.md file to validate (default: skills/coding/domain-architecture-project-structure/SKILL.md)",
)
args = parser.parse_args()

skill_path = Path(args.skill_file)
content = skill_path.read_text()

# Check file size (excluding frontmatter)
yaml_end = content.index("---", 3)  # Find closing ---
code_content = content[yaml_end+4:]
byte_count = len(code_content.encode("utf-8"))
print(f"✅ File size: {byte_count} bytes (minimum 3000)")
assert byte_count >= 3000, f"FAIL: Only {byte_count} bytes"

# Check no stub sentinels
if "Implementing this specific pattern or feature" in content:
    print("❌ FAIL: Contains stub sentinel")
else:
    print("✅ No stub sentinels found")

# Count code blocks
code_blocks = content.count("```python")
print(f"✅ Code blocks: {code_blocks} (minimum 2)")
assert code_blocks >= 2, f"FAIL: Only {code_blocks} code blocks"

# Check required sections
required_sections = [
    "# Domain Architecture and Project Structure",
    "## TL;DR Checklist",
    "## When to Use",
    "## When NOT to Use",
    "## Core Workflow",
    "## Implementation Patterns",
    "## Constraints",
    "### MUST DO",
    "### MUST NOT DO",
    "## Output Template",
    "## Related Skills",
    "## Further Reading",
]

for section in required_sections:
    if section in content:
        print(f"✅ Found: {section}")
    else:
        print(f"❌ MISSING: {section}")
        raise AssertionError(f"Missing section: {section}")

# Check BAD vs GOOD comparisons
bad_count = content.count("# ❌")
good_count = content.count("# ✅")
print(f"✅ BAD examples: {bad_count}, GOOD examples: {good_count}")
assert bad_count >= 2, f"FAIL: Only {bad_count} BAD examples (need ≥2)"

# Check frontmatter fields
frontmatter = content[:yaml_end]
required_fm = [
    "name: domain-architecture-project-structure",
    "description:",
    "license: MIT",
    "compatibility: opencode",
    'version: "1.0.0"',
    "domain: coding",
    "triggers:",
    "role: implementation",
    "scope: implementation",
    "output-format: code",
    "related-skills:",
]

for field in required_fm:
    if field in frontmatter:
        print(f"✅ Frontmatter field: {field}")
    else:
        print(f"❌ MISSING frontmatter: {field}")
        raise AssertionError(f"Missing frontmatter: {field}")

# Check triggers have sufficient terms (3-8)
triggers_line = [l for l in frontmatter.split("\n") if "triggers:" in l][0]
trigger_terms = [t.strip() for t in triggers_line.replace("triggers:", "").split(",")]
print(f"✅ Trigger terms: {len(trigger_terms)} (range 3-8)")
assert 3 <= len(trigger_terms) <= 8, f"FAIL: {len(trigger_terms)} trigger terms"

print("\n✅ ALL CHECKS PASSED")
