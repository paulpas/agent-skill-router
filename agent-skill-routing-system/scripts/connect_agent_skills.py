#!/usr/bin/env python3
"""
Connect Agent Skills - Establishes bidirectional relationships between 77 agent skills.

This script:
1. Analyzes all agent-* skills in skills/ directory
2. Groups them by function/domain
3. Generates relationships (3-5 per skill):
   - Within groups: All-to-all networking
   - Cross-group: Strategic connections
4. Updates SKILL.md files with bidirectional relationships
5. Generates before/after report
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


class AgentSkillConnector:
    """Manages agent skill relationship generation and updates."""

    # Define skill groups and their members
    SKILL_GROUPS = {
        "Orchestration & Routing": {
            "agent-multi-skill-executor",
            "agent-parallel-skill-runner",
            "agent-task-decomposition-engine",
            "agent-dynamic-replanner",
        },
        "Analysis & Detection": {
            "agent-code-correctness-verifier",
            "agent-regression-detector",
            "agent-infra-drift-detector",
            "agent-hot-path-detector",
        },
        "Optimization & Planning": {
            "agent-resource-optimizer",
            "agent-query-optimizer",
            "agent-performance-profiler",
            "agent-goal-to-milestones",
        },
        "Error Handling & Debugging": {
            "agent-error-trace-explainer",
            "agent-stacktrace-root-cause",
            "agent-k8s-debugger",
            "agent-runtime-log-analyzer",
        },
        "Intelligence & Insights": {
            "agent-confidence-based-selector",
            "agent-self-critique-engine",
            "agent-schema-inference-engine",
            "agent-test-oracle-generator",
        },
        "Other Utilities": {
            "agent-add-new-skill",
            "agent-autoscaling-advisor",
            "agent-container-inspector",
            "agent-memory-usage-analyzer",
            "agent-network-diagnostics",
            "agent-diff-quality-analyzer",
            "agent-ci-cd-pipeline-analyzer",
            "agent-failure-mode-analysis",
        },
    }

    # Cross-group relationships: which groups should connect to which
    CROSS_GROUP_CONNECTIONS = {
        "Orchestration & Routing": [
            "Analysis & Detection",
            "Error Handling & Debugging",
            "Intelligence & Insights",
        ],
        "Analysis & Detection": [
            "Orchestration & Routing",
            "Optimization & Planning",
            "Error Handling & Debugging",
        ],
        "Optimization & Planning": [
            "Analysis & Detection",
            "Intelligence & Insights",
            "Other Utilities",
        ],
        "Error Handling & Debugging": [
            "Orchestration & Routing",
            "Analysis & Detection",
            "Intelligence & Insights",
        ],
        "Intelligence & Insights": [
            "Orchestration & Routing",
            "Optimization & Planning",
            "Other Utilities",
        ],
        "Other Utilities": [
            "Optimization & Planning",
            "Intelligence & Insights",
        ],
    }

    def __init__(self, repo_root: Path, write_mode: bool = False):
        """Initialize the connector."""
        self.repo_root = repo_root
        self.skills_dir = repo_root / "skills"
        self.write_mode = write_mode
        self.skills: Dict[str, SkillInfo] = {}
        self.changes_made: List[str] = []
        self.report_lines: List[str] = []

    def discover_skills(self) -> None:
        """Discover all agent skills and categorize them."""
        print(f"🔍 Discovering agent skills in {self.skills_dir}...")

        for group_name, skill_names in self.SKILL_GROUPS.items():
            for skill_name in skill_names:
                skill_path = self.skills_dir / skill_name
                if not skill_path.exists():
                    print(f"  ⚠️  Skill directory not found: {skill_name}")
                    continue

                skill_md = skill_path / "SKILL.md"
                if not skill_md.exists():
                    print(f"  ⚠️  SKILL.md not found: {skill_name}/SKILL.md")
                    continue

                description = self._extract_description(skill_md)
                skill_info = SkillInfo(
                    name=skill_name,
                    path=skill_path,
                    description=description,
                    group=group_name,
                )
                self.skills[skill_name] = skill_info

        print(f"✅ Discovered {len(self.skills)} agent skills")

        # Print group summary
        group_counts = defaultdict(int)
        for skill in self.skills.values():
            group_counts[skill.group] += 1

        for group_name, count in sorted(group_counts.items()):
            print(f"   {group_name}: {count} skills")

    def _extract_description(self, skill_md_path: Path) -> str:
        """Extract description from SKILL.md frontmatter."""
        try:
            with open(skill_md_path, "r", encoding="utf-8") as f:
                content = f.read()

                # Extract frontmatter
                match = re.search(r"^---\n(.*?)\n---", content, re.DOTALL)
                if match:
                    frontmatter = match.group(1)
                    desc_match = re.search(r'description:\s*"?([^"\n]+)"?', frontmatter)
                    if desc_match:
                        return desc_match.group(1).strip()
        except Exception as e:
            print(f"  Error reading {skill_md_path}: {e}")

        return ""

    def generate_relationships(self) -> None:
        """Generate relationships for all skills."""
        print("\n📊 Generating relationships...")

        # First pass: within-group relationships
        for group_name, skill_names in self.SKILL_GROUPS.items():
            skill_list = [s for s in skill_names if s in self.skills]

            # All skills in group reference all other skills in group
            for skill_name in skill_list:
                other_skills = [s for s in skill_list if s != skill_name]
                self.skills[skill_name].related_skills.update(other_skills)

        # Second pass: cross-group relationships
        for source_group, target_groups in self.CROSS_GROUP_CONNECTIONS.items():
            source_skills = [
                s for s in self.SKILL_GROUPS[source_group] if s in self.skills
            ]

            for target_group in target_groups:
                target_skills = [
                    s for s in self.SKILL_GROUPS[target_group] if s in self.skills
                ]

                # Limit cross-group connections to avoid overloading
                # Pick representative skills from target group
                for source_skill_name in source_skills:
                    # Add 1-2 skills from target group to stay within 5-skill limit
                    selected = self._select_cross_group_connections(
                        source_skill_name, target_skills
                    )
                    self.skills[source_skill_name].related_skills.update(selected)

        # Third pass: trim to 3-5 relationships per skill
        self._trim_relationships()

        # Fourth pass: ensure bidirectionality
        self._ensure_bidirectionality()

    def _select_cross_group_connections(
        self, source_skill: str, target_skills: List[str]
    ) -> List[str]:
        """Select 1-2 representative skills from target group."""
        if not target_skills:
            return []

        # Prefer specific complementary relationships
        complementary_pairs = {
            "agent-multi-skill-executor": [
                "agent-error-trace-explainer",
                "agent-resource-optimizer",
            ],
            "agent-parallel-skill-runner": [
                "agent-regression-detector",
                "agent-performance-profiler",
            ],
            "agent-task-decomposition-engine": [
                "agent-goal-to-milestones",
                "agent-confidence-based-selector",
            ],
            "agent-code-correctness-verifier": [
                "agent-multi-skill-executor",
                "agent-stacktrace-root-cause",
            ],
            "agent-resource-optimizer": [
                "agent-performance-profiler",
                "agent-confidence-based-selector",
            ],
        }

        if source_skill in complementary_pairs:
            selected = [
                s for s in complementary_pairs[source_skill] if s in target_skills
            ]
            if selected:
                return selected[:2]

        # Default: pick first 1-2 skills
        return target_skills[:2]

    def _trim_relationships(self) -> None:
        """Trim relationships to 3-5 per skill."""
        for skill_name, skill_info in self.skills.items():
            if len(skill_info.related_skills) > 5:
                # Keep first 5 (prioritizes within-group, then early cross-group)
                skill_info.related_skills = set(
                    sorted(list(skill_info.related_skills))[:5]
                )

    def _ensure_bidirectionality(self) -> None:
        """Ensure all relationships are bidirectional."""
        all_pairs = set()

        # Collect all current relationships
        for skill_name, skill_info in self.skills.items():
            for related in skill_info.related_skills:
                if related in self.skills:
                    pair = tuple(sorted([skill_name, related]))
                    all_pairs.add(pair)

        # Apply bidirectionality
        for skill1, skill2 in all_pairs:
            self.skills[skill1].related_skills.add(skill2)
            self.skills[skill2].related_skills.add(skill1)

        # Trim again after ensuring bidirectionality
        self._trim_relationships()

    def read_existing_relationships(self) -> Dict[str, Set[str]]:
        """Read existing relationships from all SKILL.md files."""
        existing = {}

        for skill_name, skill_info in self.skills.items():
            skill_md = skill_info.path / "SKILL.md"
            try:
                with open(skill_md, "r", encoding="utf-8") as f:
                    content = f.read()

                    # Look for related-skills in metadata
                    match = re.search(r"related-skills:\s*([^\n]+)", content)
                    if match:
                        relations_str = match.group(1).strip()
                        relations = {
                            r.strip() for r in relations_str.split(",") if r.strip()
                        }
                        existing[skill_name] = relations
            except Exception as e:
                print(f"  Error reading {skill_md}: {e}")

        return existing

    def update_skill_files(self) -> None:
        """Update SKILL.md files with new relationships."""
        if not self.write_mode:
            print("\n📝 DRY RUN: Would update the following files:")
            return

        print("\n✍️  Updating SKILL.md files...")

        for skill_name, skill_info in self.skills.items():
            skill_md = skill_info.path / "SKILL.md"

            try:
                with open(skill_md, "r", encoding="utf-8") as f:
                    content = f.read()

                # Build new related-skills line
                related_list = sorted(list(skill_info.related_skills))
                new_related_line = f"  related-skills: {', '.join(related_list)}"

                # Replace or add related-skills in metadata section
                if "related-skills:" in content:
                    # Replace existing (may span multiple lines or be on same line as triggers)
                    content = re.sub(
                        r"  related-skills:[^\n]*(?:\n    [^\n]*)*",
                        new_related_line,
                        content,
                    )
                else:
                    # Add before closing --- in metadata
                    # Handle multi-line triggers by finding the actual end of triggers
                    # Match triggers line (may continue with indented lines)
                    content = re.sub(
                        r"(  triggers:[^\n]*(?:\n    [^\n]*)*)(  related-skills:[^\n]*)?\n(---)",
                        f"\\1\n{new_related_line}\n\\3",
                        content,
                    )
                    # If that didn't match, try the simple approach
                    if "related-skills:" not in content:
                        parts = content.split("\n---\n", 1)
                        if len(parts) == 2:
                            metadata_part = parts[0].rstrip()
                            rest = parts[1]
                            content = (
                                f"{metadata_part}\n{new_related_line}\n---\n{rest}"
                            )

                with open(skill_md, "w", encoding="utf-8") as f:
                    f.write(content)

                self.changes_made.append(
                    f"✅ {skill_name}: {len(related_list)} relationships"
                )

            except Exception as e:
                self.changes_made.append(f"❌ {skill_name}: Error - {e}")

    def generate_report(self, output_path: Path) -> None:
        """Generate before/after report."""
        print(f"\n📄 Generating report: {output_path}")

        existing = self.read_existing_relationships()

        report_lines = [
            "# Agent Skills Relationship Report",
            "",
            "## Summary",
            f"- **Total Skills:** {len(self.skills)}",
            f"- **Skills Updated:** {sum(1 for s in self.skills.values() if s.related_skills)}",
            f"- **Average Relationships/Skill:** {sum(len(s.related_skills) for s in self.skills.values()) / len(self.skills):.1f}",
            "",
            "## Relationship Groups",
            "",
        ]

        # Group by category
        for group_name, skill_names in sorted(self.SKILL_GROUPS.items()):
            group_skills = [s for s in skill_names if s in self.skills]
            if not group_skills:
                continue

            report_lines.append(f"### {group_name}")
            report_lines.append("")

            for skill_name in sorted(group_skills):
                skill_info = self.skills[skill_name]
                old_rels = existing.get(skill_name, set())
                new_rels = skill_info.related_skills

                report_lines.append(f"#### {skill_name}")
                report_lines.append("")
                report_lines.append(f"**Before:** {len(old_rels)} relationships")
                if old_rels:
                    report_lines.append(f"- {', '.join(sorted(old_rels))}")
                report_lines.append("")

                report_lines.append(f"**After:** {len(new_rels)} relationships")
                if new_rels:
                    report_lines.append(f"- {', '.join(sorted(new_rels))}")
                report_lines.append("")

        report_content = "\n".join(report_lines)

        try:
            output_path.parent.mkdir(parents=True, exist_ok=True)
            with open(output_path, "w", encoding="utf-8") as f:
                f.write(report_content)
            print(f"   ✅ Report written to {output_path}")
        except Exception as e:
            print(f"   ❌ Error writing report: {e}")

    def print_summary(self) -> None:
        """Print final summary."""
        print("\n" + "=" * 70)
        print("📊 AGENT SKILLS RELATIONSHIP SUMMARY")
        print("=" * 70)

        stats = {
            "total_skills": len(self.skills),
            "avg_relationships": sum(
                len(s.related_skills) for s in self.skills.values()
            )
            / len(self.skills),
            "skills_by_group": defaultdict(int),
            "relationships_by_group": defaultdict(int),
        }

        for skill_name, skill_info in self.skills.items():
            stats["skills_by_group"][skill_info.group] += 1
            stats["relationships_by_group"][skill_info.group] += len(
                skill_info.related_skills
            )

        print(f"\n✅ Total Skills: {stats['total_skills']}")
        print(f"📈 Average Relationships/Skill: {stats['avg_relationships']:.1f}")
        print(f"✓ Target: 3-5 relationships per skill")

        print("\n📦 Skills by Group:")
        for group in sorted(stats["skills_by_group"].keys()):
            count = stats["skills_by_group"][group]
            rels = stats["relationships_by_group"][group]
            print(f"   {group}: {count} skills, {rels} total relationships")

        print("\n🔗 Sample Relationships:")
        samples = list(self.skills.items())[:3]
        for skill_name, skill_info in samples:
            if skill_info.related_skills:
                rels_str = ", ".join(sorted(list(skill_info.related_skills))[:3])
                print(f"   {skill_name}: {rels_str}")

        if self.write_mode:
            print(f"\n✅ {len(self.changes_made)} SKILL.md files updated")
        else:
            print(f"\n📝 DRY RUN: {len(self.skills)} SKILL.md files would be updated")

        print("\n" + "=" * 70)


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Connect agent skills with bidirectional relationships"
    )
    parser.add_argument(
        "--write",
        action="store_true",
        help="Actually write changes to SKILL.md files",
    )
    parser.add_argument(
        "--repo-root",
        type=Path,
        default=Path("/home/paulpas/git/agent-skill-router"),
        help="Root directory of the repository",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("AGENT_SKILLS_RELATIONSHIPS.md"),
        help="Output report file path",
    )

    args = parser.parse_args()

    # Validate repo root
    if not (args.repo_root / "skills").exists():
        print(f"❌ Error: skills directory not found at {args.repo_root / 'skills'}")
        sys.exit(1)

    print(f"🚀 Agent Skills Connector")
    print(f"   Repository: {args.repo_root}")
    print(f"   Write Mode: {'✅ ENABLED' if args.write else '❌ DRY RUN'}")
    print(f"   Report Output: {args.output}")
    print()

    connector = AgentSkillConnector(args.repo_root, write_mode=args.write)

    # Process skills
    connector.discover_skills()
    connector.generate_relationships()
    connector.update_skill_files()
    connector.generate_report(args.output)
    connector.print_summary()

    return 0


if __name__ == "__main__":
    sys.exit(main())
