#!/usr/bin/env python3
"""
Analyze skill relationships and generate a comprehensive report.

This script:
1. Scans all SKILL.md files in the skills/ directory
2. Extracts metadata: name, related-skills, domain, description
3. Shows real-time progress with percentage indicators
4. Generates SKILL_RELATIONSHIPS_ANALYSIS.md with:
   - Skills by domain with relationship counts
   - Suggested new relationships
   - Reciprocal failures (A→B but B↛A)
   - Orphaned skills (0-1 related-skills)
   - Domain-by-domain statistics
   - Recommendations for optimal relationship counts
"""

import os
import sys
import yaml
import time
from pathlib import Path
from collections import defaultdict
from typing import Dict, List, Set, Tuple, Optional
from dataclasses import dataclass, field


@dataclass
class SkillInfo:
    """Container for skill metadata."""

    name: str
    domain: str
    description: str
    related_skills: List[str] = field(default_factory=list)

    def to_dict(self):
        return {
            "name": self.name,
            "domain": self.domain,
            "description": self.description,
            "related_skills": self.related_skills,
            "related_count": len(self.related_skills),
        }


class ProgressBar:
    """Simple progress bar for terminal output."""

    def __init__(self, total: int, width: int = 40):
        self.total = total
        self.width = width
        self.current = 0
        self.start_time = time.time()

    def update(self, current: int, suffix: str = ""):
        """Update progress bar."""
        self.current = current
        percent = current / self.total if self.total > 0 else 0
        filled = int(self.width * percent)
        bar = "█" * filled + "░" * (self.width - filled)
        elapsed = time.time() - self.start_time

        # Calculate ETA
        if self.current > 0:
            rate = self.current / elapsed
            remaining = (self.total - self.current) / rate if rate > 0 else 0
            eta = f" ETA: {remaining:.0f}s" if remaining > 0 else " DONE"
        else:
            eta = ""

        print(
            f"\r[{bar}] {percent * 100:3.0f}% ({current}/{self.total}){eta} {suffix}",
            end="",
        )
        sys.stdout.flush()


class SkillAnalyzer:
    """Analyzes skill relationships and generates insights."""

    def __init__(self, skills_dir: str):
        self.skills_dir = Path(skills_dir)
        self.skills: Dict[str, SkillInfo] = {}
        self.skills_by_domain: Dict[str, List[str]] = defaultdict(list)

    def scan_skills(self) -> None:
        """Scan all SKILL.md files and extract metadata."""
        skill_dirs = sorted([d for d in self.skills_dir.iterdir() if d.is_dir()])
        total = len(skill_dirs)

        print("Analyzing skill metadata...")
        progress = ProgressBar(total, width=50)

        for idx, skill_dir in enumerate(skill_dirs):
            skill_file = skill_dir / "SKILL.md"
            if not skill_file.exists():
                progress.update(idx + 1, f"(skipping {skill_dir.name} - no SKILL.md)")
                continue

            try:
                skill_info = self._extract_metadata(skill_file, skill_dir.name)
                self.skills[skill_info.name] = skill_info
                self.skills_by_domain[skill_info.domain].append(skill_info.name)
                progress.update(idx + 1, f"({skill_info.domain}: {skill_info.name})")
            except Exception as e:
                progress.update(idx + 1, f"(ERROR in {skill_dir.name})")

        print(f"\n✓ Scanned {total} skill directories\n")

    def _extract_metadata(self, skill_file: Path, dir_name: str) -> SkillInfo:
        """Extract metadata from a single SKILL.md file."""
        with open(skill_file, "r", encoding="utf-8") as f:
            content = f.read()

        # Extract frontmatter
        if not content.startswith("---"):
            raise ValueError(f"No frontmatter in {skill_file}")

        # Find the closing ---
        end_marker = content.find("---", 3)
        if end_marker == -1:
            raise ValueError(f"Incomplete frontmatter in {skill_file}")

        frontmatter_str = content[3:end_marker].strip()

        try:
            metadata = yaml.safe_load(frontmatter_str)
        except yaml.YAMLError as e:
            raise ValueError(f"Invalid YAML in {skill_file}: {e}")

        if not metadata:
            raise ValueError(f"Empty frontmatter in {skill_file}")

        # Extract fields
        name = metadata.get("name", dir_name)
        description = metadata.get("description", "(no description)")

        # Extract metadata sub-section
        meta_section = metadata.get("metadata", {})
        domain = meta_section.get("domain", "unknown")

        # Parse related-skills
        related_skills_str = meta_section.get("related-skills", "")
        related_skills = [s.strip() for s in related_skills_str.split(",") if s.strip()]

        return SkillInfo(
            name=name,
            domain=domain,
            description=description,
            related_skills=related_skills,
        )

    def analyze_relationships(self) -> Dict:
        """Analyze skill relationships and find issues."""
        print("Analyzing relationships...")
        progress = ProgressBar(100, width=50)

        results = {
            "orphaned_skills": [],
            "reciprocal_failures": [],
            "suggested_relationships": [],
            "domain_stats": {},
            "relationship_coverage": {},
        }

        # Find orphaned skills (0-1 related skills)
        progress.update(20, "Finding orphaned skills...")
        orphaned = []
        for name, skill in self.skills.items():
            if len(skill.related_skills) <= 1:
                orphaned.append((name, skill))
        results["orphaned_skills"] = sorted(orphaned, key=lambda x: x[0])

        # Find reciprocal failures
        progress.update(40, "Checking reciprocals...")
        reciprocal_failures = []
        for name, skill in self.skills.items():
            for related in skill.related_skills:
                if related not in self.skills:
                    # Referenced skill doesn't exist
                    reciprocal_failures.append(
                        {
                            "source": name,
                            "target": related,
                            "reason": "Referenced skill does not exist",
                        }
                    )
                elif name not in self.skills[related].related_skills:
                    # Reciprocal missing
                    reciprocal_failures.append(
                        {
                            "source": name,
                            "target": related,
                            "reason": "No reciprocal relationship",
                        }
                    )
        results["reciprocal_failures"] = reciprocal_failures

        # Find suggested relationships
        progress.update(60, "Suggesting new relationships...")
        suggested = self._suggest_relationships()
        results["suggested_relationships"] = suggested

        # Compute domain statistics
        progress.update(80, "Computing statistics...")
        for domain, skill_names in self.skills_by_domain.items():
            skills = [self.skills[name] for name in skill_names]
            avg_relations = (
                sum(len(s.related_skills) for s in skills) / len(skills)
                if skills
                else 0
            )
            results["domain_stats"][domain] = {
                "count": len(skills),
                "avg_relations": avg_relations,
                "orphaned_count": sum(1 for s in skills if len(s.related_skills) <= 1),
                "skills": skill_names,
            }

        # Calculate coverage
        progress.update(100, "Complete!")
        total_skills = len(self.skills)
        orphaned_count = len(results["orphaned_skills"])
        results["relationship_coverage"] = {
            "total_skills": total_skills,
            "orphaned_count": orphaned_count,
            "orphaned_percent": (orphaned_count / total_skills * 100)
            if total_skills > 0
            else 0,
            "reciprocal_failures": len(results["reciprocal_failures"]),
            "avg_relations_per_skill": sum(
                len(s.related_skills) for s in self.skills.values()
            )
            / total_skills
            if total_skills > 0
            else 0,
        }

        print()  # newline after progress bar
        return results

    def _suggest_relationships(self) -> List[Dict]:
        """Suggest new relationships based on domain and naming similarity."""
        suggestions = []
        domain_groups = defaultdict(list)

        # Group skills by domain
        for name, skill in self.skills.items():
            domain_groups[skill.domain].append(name)

        # For each skill, find related skills in the same domain that aren't linked
        for name, skill in self.skills.items():
            existing = set(skill.related_skills)
            domain_skills = domain_groups[skill.domain]

            for candidate in domain_skills:
                if candidate != name and candidate not in existing:
                    candidate_skill = self.skills[candidate]

                    # Check for semantic similarity (shared words in name/description)
                    similarity = self._calculate_similarity(skill, candidate_skill)

                    if similarity > 0.3:  # Threshold for suggestion
                        # Avoid duplicates by only suggesting from A->B where A < B
                        if name < candidate:
                            suggestions.append(
                                {
                                    "source": name,
                                    "target": candidate,
                                    "similarity": similarity,
                                    "rationale": f"Same domain ({skill.domain}) with semantic similarity",
                                }
                            )

        # Sort by similarity and return top 50
        suggestions.sort(key=lambda x: x["similarity"], reverse=True)
        return suggestions[:50]

    def _calculate_similarity(self, skill1: SkillInfo, skill2: SkillInfo) -> float:
        """Calculate semantic similarity between two skills (0-1)."""
        # Extract key terms from names and descriptions
        terms1 = set((skill1.name + " " + skill1.description).lower().split())
        terms2 = set((skill2.name + " " + skill2.description).lower().split())

        # Intersection / Union
        intersection = len(terms1 & terms2)
        union = len(terms1 | terms2)

        return intersection / union if union > 0 else 0

    def generate_report(self, analysis: Dict, output_file: str) -> None:
        """Generate markdown report."""
        print(f"Generating report: {output_file}...")

        with open(output_file, "w", encoding="utf-8") as f:
            # Header
            f.write("# Skill Relationship Analysis Report\n\n")
            f.write(f"**Generated:** {time.strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write(f"**Total Skills Analyzed:** {len(self.skills)}\n\n")

            # Statistics
            f.write("## 📊 Quick Statistics\n\n")
            coverage = analysis["relationship_coverage"]
            f.write(f"- **Total Skills:** {coverage['total_skills']}\n")
            f.write(
                f"- **Orphaned Skills** (0-1 relationships): {coverage['orphaned_count']} ({coverage['orphaned_percent']:.1f}%)\n"
            )
            f.write(f"- **Reciprocal Failures:** {coverage['reciprocal_failures']}\n")
            f.write(
                f"- **Average Relations per Skill:** {coverage['avg_relations_per_skill']:.2f}\n\n"
            )

            # Domain Summary
            f.write("## 🏢 Skills by Domain\n\n")
            f.write("| Domain | Count | Avg Relations | Orphaned | Target |\n")
            f.write("|--------|-------|---------------|----------|--------|\n")

            for domain in sorted(analysis["domain_stats"].keys()):
                stats = analysis["domain_stats"][domain]
                target = max(
                    2, int(stats["avg_relations"] * 1.2)
                )  # Recommend 20% increase
                f.write(
                    f"| {domain} | {stats['count']} | {stats['avg_relations']:.2f} | {stats['orphaned_count']} | {target}+ |\n"
                )

            f.write("\n")

            # Reciprocal Failures
            if analysis["reciprocal_failures"]:
                f.write("## ❌ Reciprocal Failures\n\n")
                f.write(
                    f"Found **{len(analysis['reciprocal_failures'])}** relationships that are not reciprocated.\n\n"
                )

                # Group by source
                failures_by_source = defaultdict(list)
                for failure in analysis["reciprocal_failures"]:
                    failures_by_source[failure["source"]].append(failure)

                for source in sorted(failures_by_source.keys())[:20]:  # Show first 20
                    failures = failures_by_source[source]
                    f.write(f"### {source}\n\n")
                    for failure in failures[:5]:  # Show first 5 per source
                        f.write(f"- → **{failure['target']}** ({failure['reason']})\n")
                    if len(failures) > 5:
                        f.write(f"- ... and {len(failures) - 5} more\n")
                    f.write("\n")

            # Orphaned Skills
            if analysis["orphaned_skills"]:
                f.write("## 🏜️ Orphaned Skills\n\n")
                f.write(
                    f"Found **{len(analysis['orphaned_skills'])}** skills with 0-1 relationships.\n\n"
                )

                for name, skill in analysis["orphaned_skills"][:30]:  # Show first 30
                    related_str = (
                        ", ".join(skill.related_skills)
                        if skill.related_skills
                        else "(none)"
                    )
                    f.write(f"- **{name}** ({skill.domain}): {related_str}\n")

                if len(analysis["orphaned_skills"]) > 30:
                    f.write(f"\n... and {len(analysis['orphaned_skills']) - 30} more\n")
                f.write("\n")

            # Suggested Relationships
            if analysis["suggested_relationships"]:
                f.write("## 💡 Suggested New Relationships\n\n")
                f.write(
                    f"Based on domain and semantic similarity analysis, here are **{min(50, len(analysis['suggested_relationships']))}** suggested relationships:\n\n"
                )

                for idx, suggestion in enumerate(
                    analysis["suggested_relationships"][:50], 1
                ):
                    f.write(
                        f"{idx}. **{suggestion['source']}** → **{suggestion['target']}**\n"
                    )
                    f.write(f"   - Similarity Score: {suggestion['similarity']:.2f}\n")
                    f.write(f"   - Rationale: {suggestion['rationale']}\n\n")

            # Recommendations
            f.write("## 🎯 Recommendations\n\n")
            f.write(
                "1. **Reduce Orphaned Skills:** Target at least 2-3 relationships per skill for discovery\n"
            )
            f.write(
                "2. **Fix Reciprocals:** All relationships should be bidirectional for consistency\n"
            )
            f.write("3. **Domain-Specific Goals:**\n")

            for domain in sorted(analysis["domain_stats"].keys()):
                stats = analysis["domain_stats"][domain]
                target = max(2, int(stats["avg_relations"] * 1.2))
                f.write(
                    f"   - **{domain}:** Increase from {stats['avg_relations']:.1f} to {target}+ relations/skill\n"
                )

            f.write("\n---\n")
            f.write(
                "*This report was auto-generated by `analyze_skill_relationships.py`*\n"
            )

        print(f"✓ Report written to {output_file}\n")


def find_skills_dir() -> Path:
    """Find the skills directory relative to script location."""
    # This script is in agent-skill-routing-system/scripts/
    # Skills are at ../../skills/ (up to agent-skill-router root, then skills/)
    script_dir = Path(__file__).parent

    # Try multiple paths to find skills
    candidates = [
        script_dir.parent.parent.parent / "skills",  # ../../.. (from scripts)
        script_dir.parent.parent / "skills",  # ../.. (one level up)
        Path.cwd() / "skills",  # current working directory
    ]

    for candidate in candidates:
        if candidate.exists():
            return candidate

    print(f"❌ Skills directory not found")
    print(f"   Tried: {candidates}")
    print(f"   Current script location: {script_dir}")
    print(f"   Current working directory: {Path.cwd()}")
    sys.exit(1)


def main():
    """Main entry point."""
    skills_dir = find_skills_dir()

    print("=" * 60)
    print("   Skill Relationship Analysis")
    print("=" * 60)
    print(f"Scanning: {skills_dir}\n")

    # Create analyzer
    analyzer = SkillAnalyzer(str(skills_dir))

    # Scan skills
    analyzer.scan_skills()

    # Analyze relationships
    analysis = analyzer.analyze_relationships()

    # Generate report
    output_file = Path(skills_dir).parent / "SKILL_RELATIONSHIPS_ANALYSIS.md"
    analyzer.generate_report(analysis, str(output_file))

    # Summary
    print("\n" + "=" * 60)
    print("   Analysis Complete")
    print("=" * 60)
    coverage = analysis["relationship_coverage"]
    print(f"\n📈 Summary:")
    print(f"  Total Skills:           {coverage['total_skills']}")
    print(
        f"  Orphaned:               {coverage['orphaned_count']} ({coverage['orphaned_percent']:.1f}%)"
    )
    print(f"  Reciprocal Issues:      {coverage['reciprocal_failures']}")
    print(f"  Avg Relations/Skill:    {coverage['avg_relations_per_skill']:.2f}")
    print(f"\n📊 Domain Breakdown:")

    for domain in sorted(analysis["domain_stats"].keys()):
        stats = analysis["domain_stats"][domain]
        print(
            f"  {domain:20} {stats['count']:3} skills, {stats['avg_relations']:.2f} avg relations"
        )

    print(f"\n📄 Report: {output_file}\n")


if __name__ == "__main__":
    main()
