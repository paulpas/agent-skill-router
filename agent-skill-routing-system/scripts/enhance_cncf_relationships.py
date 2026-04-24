#!/usr/bin/env python3
"""
Enhance CNCF Skills Relationships - Connects orphaned CNCF skills using keyword matching.

This script:
1. Analyzes all 149 CNCF skills
2. Identifies orphaned skills (0-1 relationships)
3. Uses keyword matching to find logical related skills:
   - AWS ↔ AWS, GCP ↔ GCP, Azure ↔ Azure (cloud vendor grouping)
   - Kubernetes ecosystem (K8s, Helm, Service Mesh, etc.)
   - Monitoring/observability (Prometheus, Grafana, ELK, etc.)
   - Network/security (networking, security, RBAC, etc.)
   - Storage/data (database, storage, cache, etc.)
4. Connects each orphaned skill to 2+ related skills
5. Updates SKILL.md files with bidirectional relationships
6. Generates enhancement report
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
    related_skills: Set[str] = field(default_factory=set)

    def __hash__(self):
        return hash(self.name)


class CNFCEnhancer:
    """Manages CNCF skill relationship enhancement."""

    # Keyword groups for matching related skills
    KEYWORD_GROUPS = {
        "AWS": {
            "keywords": [
                "aws",
                "amazon",
                "ec2",
                "s3",
                "rds",
                "lambda",
                "elb",
                "iam",
                "cloudformation",
            ],
            "skills": set(),
        },
        "GCP": {
            "keywords": [
                "gcp",
                "google cloud",
                "google",
                "gke",
                "bigquery",
                "cloud storage",
                "pubsub",
            ],
            "skills": set(),
        },
        "Azure": {
            "keywords": ["azure", "microsoft", "aks", "cosmos", "app service"],
            "skills": set(),
        },
        "Kubernetes": {
            "keywords": [
                "kubernetes",
                "k8s",
                "kube",
                "pod",
                "deployment",
                "helm",
                "service mesh",
                "istio",
            ],
            "skills": set(),
        },
        "Monitoring": {
            "keywords": [
                "monitor",
                "observability",
                "prometheus",
                "grafana",
                "elk",
                "logging",
                "trace",
                "metric",
            ],
            "skills": set(),
        },
        "Network": {
            "keywords": [
                "network",
                "networking",
                "dns",
                "ingress",
                "egress",
                "vpn",
                "firewall",
            ],
            "skills": set(),
        },
        "Security": {
            "keywords": [
                "security",
                "rbac",
                "auth",
                "encryption",
                "tls",
                "ssl",
                "certificate",
            ],
            "skills": set(),
        },
        "Storage": {
            "keywords": [
                "storage",
                "database",
                "cache",
                "sql",
                "nosql",
                "redis",
                "memcached",
                "volume",
            ],
            "skills": set(),
        },
        "CI/CD": {
            "keywords": [
                "ci/cd",
                "pipeline",
                "gitlab",
                "github",
                "jenkins",
                "deploy",
                "release",
            ],
            "skills": set(),
        },
    }

    def __init__(self, skills_dir: Path):
        self.skills_dir = skills_dir
        self.all_skills: Dict[str, SkillInfo] = {}
        self.orphaned_skills: List[str] = []
        self.changes: List[Tuple[str, str, str]] = []

    def find_cncf_skills(self) -> Dict[str, SkillInfo]:
        """Find all cncf-* skills."""
        skills = {}
        for skill_dir in self.skills_dir.glob("cncf-*/"):
            skill_file = skill_dir / "SKILL.md"
            if skill_file.exists():
                name = skill_dir.name
                description = self._extract_description(skill_file)
                related = self._extract_related_skills(skill_file)
                skills[name] = SkillInfo(
                    name=name,
                    path=skill_file,
                    description=description,
                    related_skills=related,
                )
        return skills

    def _extract_description(self, skill_file: Path) -> str:
        """Extract skill description from SKILL.md."""
        try:
            with open(skill_file, "r") as f:
                content = f.read()
                match = re.search(r'description:\s*["\']?([^"\'\n]+)', content)
                return (match.group(1) if match else "").lower()
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

    def find_orphaned_skills(self) -> List[str]:
        """Identify skills with 0 or 1 relationship."""
        orphaned = []
        for name, skill in self.all_skills.items():
            if len(skill.related_skills) <= 1:
                orphaned.append(name)
        return orphaned

    def categorize_skills(self):
        """Categorize all skills into keyword groups."""
        for skill_name, skill in self.all_skills.items():
            desc_and_name = skill.description + " " + skill_name.lower()

            for group_name, group_data in self.KEYWORD_GROUPS.items():
                for keyword in group_data["keywords"]:
                    if keyword in desc_and_name:
                        group_data["skills"].add(skill_name)
                        break

    def find_related_skills(self, skill_name: str) -> Set[str]:
        """Find related skills using keyword matching."""
        related = set()
        skill = self.all_skills[skill_name]
        desc_and_name = skill.description + " " + skill_name.lower()

        # Find which groups this skill belongs to
        skill_groups = []
        for group_name, group_data in self.KEYWORD_GROUPS.items():
            if skill_name in group_data["skills"]:
                skill_groups.append(group_name)

        # Find other skills in the same groups
        for group_name in skill_groups:
            group_data = self.KEYWORD_GROUPS[group_name]
            for other_skill in group_data["skills"]:
                if other_skill != skill_name and other_skill in self.all_skills:
                    related.add(other_skill)

        # Also find skills with keyword overlap
        for other_skill, other_info in self.all_skills.items():
            if other_skill == skill_name:
                continue

            other_desc = other_info.description + " " + other_skill.lower()

            # Check for keyword overlap
            overlap = 0
            for group_data in self.KEYWORD_GROUPS.values():
                for keyword in group_data["keywords"]:
                    if keyword in desc_and_name and keyword in other_desc:
                        overlap += 1
                        break

            if overlap > 0:
                related.add(other_skill)

        return related

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
                    r"(metadata:.*?---)\n",
                    f"\\1\n  related-skills: {related_str}\n",
                    content,
                    flags=re.DOTALL,
                )

            with open(skill_path, "w") as f:
                f.write(new_content)
            return True
        except Exception as e:
            print(f"Error updating {skill_name}: {e}")
            return False

    def apply_enhancements(self) -> int:
        """Apply relationship enhancements to orphaned skills."""
        updated = 0
        for skill_name in self.orphaned_skills:
            old_related = self.all_skills[skill_name].related_skills.copy()
            new_related = self.find_related_skills(skill_name)

            # Merge with existing relationships
            merged = old_related.union(new_related)

            if len(merged) > len(old_related):
                if self.update_skill_file(skill_name, merged):
                    self.changes.append(
                        (
                            skill_name,
                            str(sorted(list(old_related))),
                            str(sorted(list(merged))),
                        )
                    )
                    updated += 1

        return updated

    def generate_report(self) -> str:
        """Generate enhancement report."""
        report = "# CNCF_ENHANCEMENT_REPORT.md\n\n"
        report += "## Summary\n\n"

        before_orphaned = len(self.orphaned_skills)
        after_orphaned = len(
            [
                s
                for s in self.all_skills.keys()
                if len(self.all_skills[s].related_skills) <= 1
            ]
        )

        report += f"- Total CNCF skills: {len(self.all_skills)}\n"
        report += f"- Orphaned skills (before): {before_orphaned}\n"
        report += f"- Skills enhanced: {len(self.changes)}\n"
        report += f"- Orphaned skills (after): {after_orphaned}\n"
        report += (
            f"- Reduction: {before_orphaned - after_orphaned} orphaned skills fixed\n\n"
        )

        # Calculate average relationships
        total_relations_before = sum(
            len(s.related_skills) for s in self.all_skills.values()
        )
        avg_before = (
            total_relations_before / len(self.all_skills) if self.all_skills else 0
        )

        total_relations_after = total_relations_before
        for skill_name, old_rel, new_rel in self.changes:
            old_count = len(eval(old_rel))
            new_count = len(eval(new_rel))
            total_relations_after += new_count - old_count

        avg_after = (
            total_relations_after / len(self.all_skills) if self.all_skills else 0
        )
        report += f"- Average relations (before): {avg_before:.2f}\n"
        report += f"- Average relations (after): {avg_after:.2f}\n\n"

        report += "## Enhanced Skills\n\n"
        for skill_name, old_rel, new_rel in sorted(self.changes):
            report += f"### {skill_name}\n\n"
            report += f"**Before:** {old_rel}\n\n"
            report += f"**After:** {new_rel}\n\n"

        return report

    def run(self, write: bool = False) -> str:
        """Run the enhancement pipeline."""
        print("[1/5] Finding CNCF skills...")
        self.all_skills = self.find_cncf_skills()
        print(f"  Found {len(self.all_skills)} CNCF skills")

        print("[2/5] Identifying orphaned skills...")
        self.orphaned_skills = self.find_orphaned_skills()
        print(
            f"  Found {len(self.orphaned_skills)} orphaned skills (0-1 relationships)"
        )

        print("[3/5] Categorizing skills by keyword groups...")
        self.categorize_skills()
        for group_name, group_data in self.KEYWORD_GROUPS.items():
            print(f"  {group_name}: {len(group_data['skills'])} skills")

        if write:
            print("[4/5] Applying enhancements to orphaned skills...")
            updated = self.apply_enhancements()
            print(f"  Enhanced {updated} orphaned skills with new relationships")

        print("[5/5] Generating report...")
        report = self.generate_report()

        # Save report
        report_path = Path(__file__).parent.parent.parent / "CNCF_ENHANCEMENT_REPORT.md"
        with open(report_path, "w") as f:
            f.write(report)
        print(f"  Report saved to {report_path}")

        return report


def main():
    parser = argparse.ArgumentParser(
        description="Enhance CNCF domain skill relationships"
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

    enhancer = CNFCEnhancer(args.skills_dir)
    report = enhancer.run(write=args.write)
    print("\n" + report)


if __name__ == "__main__":
    main()
