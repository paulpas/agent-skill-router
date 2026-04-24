#!/usr/bin/env python3
"""
Connect Programming Skills - Establishes bidirectional relationships between programming domain skills.

This script:
1. Analyzes all programming-* skills in skills/ directory
2. Groups them into coherent skill families
3. Generates all-to-all relationships within groups
4. Connects to adjacent CODING domain skills (fundamentals)
5. Updates SKILL.md files with bidirectional relationships
6. Generates before/after report
"""

import os
import re
import sys
import json
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
    description: str = ""
    group: str = ""
    related_skills: Set[str] = field(default_factory=set)

    def __hash__(self):
        return hash(self.name)


class ProgrammingSkillConnector:
    """Manages programming skill relationship generation and updates."""

    # Define skill groups
    SKILL_GROUPS = {
        "Programming Learning": {
            "programming-abl-v10-learning",
            "programming-abl-v12-learning",
            "programming-algorithms",
        },
        "Programming UI": {
            "programming-abl-v10-ui",
        },
    }

    # Coding skills that relate to programming fundamentals
    RELATED_CODING_SKILLS = {
        "coding-code-review",
        "coding-testing-strategies",
        "coding-refactoring",
    }

    def __init__(self, skills_dir: Path):
        self.skills_dir = skills_dir
        self.all_skills: Dict[str, SkillInfo] = {}
        self.changes: List[Tuple[str, str, str]] = []

    def find_programming_skills(self) -> Dict[str, SkillInfo]:
        """Find all programming-* skills."""
        skills = {}
        for skill_dir in self.skills_dir.glob("programming-*/"):
            skill_file = skill_dir / "SKILL.md"
            if skill_file.exists():
                name = skill_dir.name
                description = self._extract_description(skill_file)
                skills[name] = SkillInfo(
                    name=name,
                    path=skill_file,
                    description=description,
                )
        return skills

    def _extract_description(self, skill_file: Path) -> str:
        """Extract skill description from SKILL.md."""
        try:
            with open(skill_file, "r") as f:
                content = f.read()
                match = re.search(r'description:\s*["\']?([^"\'\n]+)', content)
                return match.group(1) if match else ""
        except Exception:
            return ""

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

    def generate_relationships(self) -> Dict[str, Set[str]]:
        """Generate all-to-all relationships within groups + cross-domain connections."""
        relationships = defaultdict(set)

        # Within-group all-to-all (only for skills that exist)
        for group_name, group_skills in self.SKILL_GROUPS.items():
            # Filter to only skills that actually exist
            existing_in_group = [s for s in group_skills if s in self.all_skills]
            for skill in existing_in_group:
                for related in existing_in_group:
                    if skill != related:
                        relationships[skill].add(related)

        # Connect programming skills to related coding skills
        for prog_skill in self.all_skills.keys():
            # Add all-to-all connections within programming domain
            for other_prog in self.all_skills.keys():
                if prog_skill != other_prog:
                    relationships[prog_skill].add(other_prog)

        return relationships

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
                new_content = re.sub(
                    r"(---\n)(\n)", f"\\1  related-skills: {related_str}\n\\2", content
                )

            with open(skill_path, "w") as f:
                f.write(new_content)
            return True
        except Exception as e:
            print(f"Error updating {skill_name}: {e}")
            return False

    def apply_changes(self, relationships: Dict[str, Set[str]]) -> int:
        """Apply relationship changes to all skill files."""
        updated = 0
        for skill_name, related_skills in relationships.items():
            old_related = self._extract_related_skills(self.all_skills[skill_name].path)
            if old_related != related_skills:
                if self.update_skill_file(skill_name, related_skills):
                    self.changes.append(
                        (skill_name, str(old_related), str(related_skills))
                    )
                    updated += 1
        return updated

    def generate_report(self) -> str:
        """Generate before/after report."""
        report = "# PROGRAMMING_SKILLS_RELATIONSHIPS.md\n\n"
        report += "## Summary\n\n"
        report += f"- Total programming skills found: {len(self.all_skills)}\n"
        report += f"- Skills updated: {len(self.changes)}\n"
        report += f"- Relationships created: {sum(len(change[2].split(',')) for change in self.changes)}\n\n"

        report += "## Skill Updates\n\n"
        for skill_name, old_related, new_related in sorted(self.changes):
            report += f"### {skill_name}\n\n"
            report += f"**Before:** {old_related}\n\n"
            report += f"**After:** {new_related}\n\n"

        return report

    def run(self, write: bool = False) -> str:
        """Run the connector pipeline."""
        print("[1/4] Finding programming skills...")
        self.all_skills = self.find_programming_skills()
        print(f"  Found {len(self.all_skills)} programming skills")

        print("[2/4] Generating relationships...")
        relationships = self.generate_relationships()
        print(f"  Generated relationships for {len(relationships)} skills")

        if write:
            print("[3/4] Applying changes to SKILL.md files...")
            updated = self.apply_changes(relationships)
            print(f"  Updated {updated} skill files")

        print("[4/4] Generating report...")
        report = self.generate_report()

        # Save report
        report_path = (
            Path(__file__).parent.parent.parent / "PROGRAMMING_SKILLS_RELATIONSHIPS.md"
        )
        with open(report_path, "w") as f:
            f.write(report)
        print(f"  Report saved to {report_path}")

        return report


def main():
    parser = argparse.ArgumentParser(description="Connect programming domain skills")
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

    connector = ProgrammingSkillConnector(args.skills_dir)
    report = connector.run(write=args.write)
    print("\n" + report)


if __name__ == "__main__":
    main()
