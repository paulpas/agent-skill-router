#!/usr/bin/env python3
"""
Enforce Bidirectionality - Ensures all skill relationships are reciprocal.

This script:
1. Scans all 337 SKILL.md files
2. For each skill A with related-skills:
   - For each skill B in A's related-skills:
     - Check if A is in B's related-skills
     - If not, add A to B's related-skills (respecting 4-skill limit)
3. Maintains 2-4 relationships per skill
4. Applies with --write flag
5. Generates bidirectionality report showing all fixes
"""

import os
import re
import sys
from pathlib import Path
from typing import Dict, List, Set, Tuple
from dataclasses import dataclass, field
from collections import defaultdict
import argparse


@dataclass
class SkillInfo:
    """Represents a skill with metadata."""

    name: str
    path: Path
    related_skills: Set[str] = field(default_factory=set)
    domain: str = ""


class BidirectionalityEnforcer:
    """Ensures all skill relationships are reciprocal."""

    def __init__(self, skills_dir: Path):
        self.skills_dir = skills_dir
        self.all_skills: Dict[str, SkillInfo] = {}
        self.one_way_fixes: List[Tuple[str, str]] = []
        self.skills_added: Dict[str, List[str]] = defaultdict(list)

    def find_all_skills(self) -> Dict[str, SkillInfo]:
        """Find all skills in the skills directory."""
        skills = {}
        for skill_dir in self.skills_dir.glob("*/"):
            if not skill_dir.is_dir():
                continue

            skill_file = skill_dir / "SKILL.md"
            if skill_file.exists():
                name = skill_dir.name
                domain = name.split("-")[0]
                related = self._extract_related_skills(skill_file)
                skills[name] = SkillInfo(
                    name=name,
                    path=skill_file,
                    related_skills=related,
                    domain=domain,
                )
        return skills

    def _extract_related_skills(self, skill_file: Path) -> Set[str]:
        """Extract existing related skills from SKILL.md."""
        try:
            with open(skill_file, "r") as f:
                content = f.read()
                match = re.search(r"related-skills:\s*([^\n]+)", content)
                if match:
                    skills_str = match.group(1).strip()
                    return {s.strip() for s in skills_str.split(",") if s.strip()}
        except Exception:
            pass
        return set()

    def update_skill_file(self, skill_name: str, new_related: Set[str]) -> bool:
        """Update a skill's related-skills field in its SKILL.md."""
        if skill_name not in self.all_skills:
            return False

        skill_path = self.all_skills[skill_name].path
        try:
            with open(skill_path, "r") as f:
                content = f.read()

            # Limit to 4 relationships max
            limited_related = sorted(list(new_related))[:4]
            related_str = ", ".join(limited_related)

            # Replace or add related-skills field
            pattern = r"(\s+)related-skills:\s*[^\n]*"
            if re.search(pattern, content):
                new_content = re.sub(
                    pattern, f"\\1related-skills: {related_str}", content
                )
            else:
                # Add before the closing ---
                if "metadata:" in content:
                    # Find the end of metadata block
                    new_content = re.sub(
                        r"(metadata:.*?---)",
                        lambda m: m.group(0).replace(
                            "---", f"  related-skills: {related_str}\n---"
                        ),
                        content,
                        flags=re.DOTALL,
                    )
                else:
                    new_content = content

            with open(skill_path, "w") as f:
                f.write(new_content)
            return True
        except Exception as e:
            print(f"Error updating {skill_name}: {e}")
            return False

    def enforce_bidirectionality(self) -> int:
        """Enforce bidirectional relationships."""
        fixes = 0

        # Create a copy of skills list to iterate
        skills_to_check = list(self.all_skills.keys())

        for skill_name in skills_to_check:
            skill = self.all_skills[skill_name]

            # For each related skill
            for related_skill in list(skill.related_skills):
                if related_skill not in self.all_skills:
                    continue

                related_obj = self.all_skills[related_skill]

                # Check if reciprocal relationship exists
                if skill_name not in related_obj.related_skills:
                    # Add the reciprocal relationship (respecting 4-skill limit)
                    if len(related_obj.related_skills) < 4:
                        related_obj.related_skills.add(skill_name)
                        self.skills_added[related_skill].append(skill_name)
                        fixes += 1
                    else:
                        # Skill already has 4 relationships - note but don't force
                        pass

        return fixes

    def apply_all_changes(self) -> int:
        """Apply all bidirectionality changes."""
        updated = 0
        for skill_name, skill in self.all_skills.items():
            if self.update_skill_file(skill_name, skill.related_skills):
                updated += 1
        return updated

    def validate_bidirectionality(self) -> Tuple[int, int]:
        """Validate that all relationships are now bidirectional."""
        violations = 0
        validated = 0

        for skill_name, skill in self.all_skills.items():
            for related_skill in skill.related_skills:
                if related_skill not in self.all_skills:
                    violations += 1
                elif skill_name not in self.all_skills[related_skill].related_skills:
                    violations += 1
                else:
                    validated += 1

        return validated, violations

    def generate_report(self) -> str:
        """Generate bidirectionality report."""
        report = "# BIDIRECTIONALITY_REPORT.md\n\n"
        report += "## Summary\n\n"
        report += f"- Total skills scanned: {len(self.all_skills)}\n"
        report += f"- One-way relationships fixed: {len(self.skills_added)}\n"

        total_added = sum(len(v) for v in self.skills_added.values())
        report += f"- Total reciprocal relationships added: {total_added}\n\n"

        # Validation
        validated, violations = self.validate_bidirectionality()
        report += f"## Bidirectionality Validation\n\n"
        report += f"- Bidirectional relationships verified: {validated}\n"
        report += f"- Bidirectionality violations: {violations}\n\n"

        if violations == 0:
            report += "✅ **All relationships are now bidirectional!**\n\n"
        else:
            report += f"⚠️ **{violations} violations remaining** (skipped due to 4-skill limit)\n\n"

        # List all fixed skills
        report += "## Fixed One-Way Relationships\n\n"
        for skill_name in sorted(self.skills_added.keys()):
            added_relations = self.skills_added[skill_name]
            report += f"### {skill_name}\n\n"
            report += f"**Added reciprocal relationships:** {', '.join(sorted(added_relations))}\n\n"

        return report

    def run(self, write: bool = False) -> str:
        """Run the bidirectionality enforcement pipeline."""
        print("[1/4] Finding all skills...")
        self.all_skills = self.find_all_skills()
        print(f"  Found {len(self.all_skills)} skills")

        print("[2/4] Enforcing bidirectionality...")
        fixes = self.enforce_bidirectionality()
        print(f"  Fixed {fixes} one-way relationships")

        if write:
            print("[3/4] Applying changes to SKILL.md files...")
            updated = self.apply_all_changes()
            print(f"  Updated {updated} skill files")

        print("[4/4] Validating bidirectionality...")
        validated, violations = self.validate_bidirectionality()
        print(f"  Validated {validated} bidirectional relationships")
        if violations > 0:
            print(f"  ⚠️  {violations} violations (limit of 4 relationships per skill)")

        # Generate report
        report = self.generate_report()

        # Save report
        report_path = Path(__file__).parent.parent.parent / "BIDIRECTIONALITY_REPORT.md"
        with open(report_path, "w") as f:
            f.write(report)
        print(f"  Report saved to {report_path}")

        return report


def main():
    parser = argparse.ArgumentParser(
        description="Enforce bidirectionality in skill relationships"
    )
    parser.add_argument(
        "--write", action="store_true", help="Apply changes to SKILL.md files"
    )
    parser.add_argument(
        "--skills-dir",
        type=Path,
        default=Path(__file__).parent.parent.parent / "skills",
        help="Path to skills directory",
    )

    args = parser.parse_args()

    enforcer = BidirectionalityEnforcer(args.skills_dir)
    report = enforcer.run(write=args.write)
    print("\n" + report)


if __name__ == "__main__":
    main()
