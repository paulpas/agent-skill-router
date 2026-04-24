#!/usr/bin/env python3
"""
Trading Skills Relationship Generator

Analyzes all 83 trading skills and intelligently generates bidirectional relationships
based on functional groups and cross-group patterns.

Usage:
    python3 connect_trading_skills.py              # Dry run (show changes)
    python3 connect_trading_skills.py --write      # Apply changes to all SKILL.md files
"""

import os
import re
import sys
import yaml
from pathlib import Path
from typing import Dict, List, Set, Tuple, Optional
from dataclasses import dataclass, field
from datetime import datetime
import json


@dataclass
class SkillMetadata:
    """Represents a trading skill's metadata and content."""

    name: str
    path: Path
    description: str
    related_skills: List[str] = field(default_factory=list)
    group: Optional[str] = None
    content: str = ""

    def skill_id(self) -> str:
        """Get the skill identifier from name."""
        return self.name.replace("trading-", "")


class TradingSkillClassifier:
    """Classifies trading skills into functional groups."""

    def __init__(self):
        """Initialize skill groups and classification keywords."""
        self.groups = {
            "Risk Management": {
                "keywords": [
                    "stop-loss",
                    "stop loss",
                    "kill-switch",
                    "drawdown",
                    "position-sizing",
                    "position sizing",
                    "profit-taking",
                    "margin",
                    "value-at-risk",
                    "var",
                    "tail-risk",
                    "correlation-risk",
                    "liquidity-risk",
                    "stress-testing",
                ],
                "skills": [],
            },
            "Execution Algorithms": {
                "keywords": [
                    "twap",
                    "vwap",
                    "iceberg",
                    "execution",
                    "order-flow",
                    "slippage",
                    "market-impact",
                    "order-book-impact",
                    "rate-limiting",
                    "order-book",
                    "fill-simulation",
                    "commission",
                ],
                "skills": [],
            },
            "Indicators & Technical": {
                "keywords": [
                    "indicator",
                    "moving-average",
                    "rsi",
                    "macd",
                    "bollinger",
                    "stochastic",
                    "atr",
                    "adx",
                    "cci",
                    "ichimoku",
                    "kama",
                    "kdj",
                    "klinger",
                    "mesa",
                    "momentum",
                    "obv",
                    "parabolic",
                    "pivot",
                    "roc",
                    "tsi",
                    "vortex",
                    "williams",
                    "zlma",
                    "technical",
                    "momentum-indicators",
                    "volume-profile",
                    "price-action",
                    "support-resistance",
                    "trend-analysis",
                    "volatility",
                    "intermarket",
                    "regime-detection",
                    "cycle-analysis",
                    "false-signal",
                    "confluence",
                    "statistical-arbitrage",
                ],
                "skills": [],
            },
            "Strategy Patterns": {
                "keywords": [
                    "mean-reversion",
                    "momentum-trading",
                    "trend-following",
                    "arbitrage",
                    "pair-trading",
                    "volatility-arbitrage",
                    "strategy",
                    "edge",
                    "plan",
                    "psychology",
                ],
                "skills": [],
            },
            "Portfolio Management": {
                "keywords": [
                    "rebalancing",
                    "allocation",
                    "diversification",
                    "correlation",
                    "multi-asset",
                    "portfolio",
                    "ensemble",
                ],
                "skills": [],
            },
            "Market Microstructure": {
                "keywords": [
                    "order-flow",
                    "order flow",
                    "spread",
                    "liquidity",
                    "microstructure",
                    "market-structure",
                    "market structure",
                    "websocket",
                ],
                "skills": [],
            },
            "Backtesting & Analysis": {
                "keywords": [
                    "backtest",
                    "walk-forward",
                    "parameter",
                    "optimization",
                    "sharpe",
                    "drawdown-analysis",
                    "position-exits",
                    "lookahead",
                    "performance",
                    "attribution",
                ],
                "skills": [],
            },
            "Data & Infrastructure": {
                "keywords": [
                    "data",
                    "feature-store",
                    "lake",
                    "stream",
                    "database",
                    "enrichment",
                    "validation",
                    "candle",
                    "backfill",
                    "alternative",
                    "cache",
                    "sync",
                    "websocket",
                    "health",
                    "failover",
                    "ccxt",
                ],
                "skills": [],
            },
            "AI & ML": {
                "keywords": [
                    "ai",
                    "ml",
                    "anomaly",
                    "forecasting",
                    "prediction",
                    "sentiment",
                    "news",
                    "embedding",
                    "synthetic",
                    "reinforcement",
                    "ensemble",
                    "hyperparameter",
                    "feature-engineering",
                    "model",
                    "monitoring",
                    "llm",
                    "explainable",
                ],
                "skills": [],
            },
            "Fundamentals & Education": {
                "keywords": [
                    "fundamentals",
                    "basics",
                    "regimes",
                    "market-regimes",
                    "exchange",
                    "paper",
                    "realistic",
                    "simulation",
                ],
                "skills": [],
            },
            "Signal Generation": {
                "keywords": ["signal", "conviction", "regime", "classification"],
                "skills": [],
            },
        }

    def classify_skill(self, skill_name: str, description: str) -> str:
        """Classify a skill into a group based on keywords."""
        text = (skill_name + " " + description).lower()

        # Score each group based on keyword matches
        scores = {}
        for group_name, group_info in self.groups.items():
            score = 0
            for keyword in group_info["keywords"]:
                if keyword in text:
                    score += 1
            scores[group_name] = score

        # Return the group with highest score
        best_group = max(scores, key=scores.get)
        if scores[best_group] > 0:
            return best_group

        # Fallback: Try to find any group
        return "Signal Generation"  # Default fallback


class TradingSkillRelationshipGenerator:
    """Generates intelligent relationships between trading skills."""

    def __init__(self):
        """Initialize relationship rules."""
        self.within_group_ratio = 0.6  # 60% of relationships within group
        self.cross_group_ratio = 0.4  # 40% of relationships cross-group
        self.min_relationships = 2
        self.max_relationships = 4

    def generate_relationships(
        self,
        skill_name: str,
        group: str,
        all_skills: Dict[str, SkillMetadata],
        group_assignments: Dict[str, str],
    ) -> List[str]:
        """
        Generate relationships for a skill.

        Strategy:
        1. Find 2-3 skills in same group (if group has enough skills)
        2. Add 1-2 cross-group relationships to complementary groups
        3. Ensure bidirectional consistency
        """
        skill_id = skill_name.replace("trading-", "")
        relationships = []

        # 1. Within-group relationships
        same_group_skills = [
            name
            for name, assigned_group in group_assignments.items()
            if assigned_group == group and name != skill_name
        ]

        within_count = max(1, int(self.max_relationships * self.within_group_ratio))
        for related_skill in same_group_skills[:within_count]:
            relationships.append(related_skill)

        # 2. Cross-group relationships
        cross_relationships = self._get_cross_group_relationships(
            group, skill_name, all_skills, group_assignments
        )
        cross_count = max(
            0,
            min(len(cross_relationships), self.max_relationships - len(relationships)),
        )
        relationships.extend(cross_relationships[:cross_count])

        # Ensure we meet minimum
        if len(relationships) < self.min_relationships:
            all_other = [
                name
                for name in all_skills.keys()
                if name != skill_name and name not in relationships
            ]
            relationships.extend(
                all_other[: self.min_relationships - len(relationships)]
            )

        # Cap at max
        return list(dict.fromkeys(relationships[: self.max_relationships]))

    def _get_cross_group_relationships(
        self,
        source_group: str,
        skill_name: str,
        all_skills: Dict[str, SkillMetadata],
        group_assignments: Dict[str, str],
    ) -> List[str]:
        """Get cross-group relationship targets based on functional flow."""
        # Define cross-group flow: which groups are typically used together
        flow_map = {
            "Risk Management": [
                "Execution Algorithms",
                "Portfolio Management",
                "Backtesting & Analysis",
            ],
            "Execution Algorithms": [
                "Indicators & Technical",
                "Market Microstructure",
                "Risk Management",
            ],
            "Indicators & Technical": [
                "Strategy Patterns",
                "Execution Algorithms",
                "Signal Generation",
            ],
            "Strategy Patterns": [
                "Portfolio Management",
                "Indicators & Technical",
                "Backtesting & Analysis",
            ],
            "Portfolio Management": [
                "Risk Management",
                "Strategy Patterns",
                "Backtesting & Analysis",
            ],
            "Market Microstructure": ["Execution Algorithms", "Data & Infrastructure"],
            "Backtesting & Analysis": [
                "Strategy Patterns",
                "Risk Management",
                "Portfolio Management",
            ],
            "Data & Infrastructure": ["Market Microstructure", "AI & ML"],
            "AI & ML": [
                "Indicators & Technical",
                "Signal Generation",
                "Data & Infrastructure",
            ],
            "Fundamentals & Education": ["Strategy Patterns", "Risk Management"],
            "Signal Generation": ["Indicators & Technical", "AI & ML"],
        }

        targets = []
        target_groups = flow_map.get(source_group, [])

        for target_group in target_groups:
            group_skills = [
                name
                for name, assigned_group in group_assignments.items()
                if assigned_group == target_group and name != skill_name
            ]
            targets.extend(group_skills)

        return targets


class SkillFileManager:
    """Manages reading and writing skill SKILL.md files."""

    @staticmethod
    def read_skill(path: Path) -> Tuple[Dict, str, str]:
        """
        Read a SKILL.md file and extract frontmatter, content, and raw content.

        Returns: (frontmatter_dict, raw_frontmatter, content)
        """
        with open(path / "SKILL.md", "r") as f:
            content = f.read()

        # Parse frontmatter
        if not content.startswith("---"):
            raise ValueError(f"Invalid SKILL.md format in {path}")

        parts = content.split("---", 2)
        if len(parts) < 3:
            raise ValueError(f"Invalid SKILL.md frontmatter in {path}")

        raw_fm = parts[1].strip()
        body = parts[2].strip()

        try:
            frontmatter = yaml.safe_load(raw_fm)
        except yaml.YAMLError as e:
            raise ValueError(f"YAML parse error in {path}: {e}")

        return frontmatter, raw_fm, body

    @staticmethod
    def write_skill(
        path: Path, frontmatter: Dict, body: str, dry_run: bool = False
    ) -> bool:
        """Write updated skill to SKILL.md."""
        # Reconstruct YAML frontmatter
        fm_str = yaml.dump(frontmatter, default_flow_style=False, sort_keys=False)

        # Reconstruct full content
        full_content = f"---\n{fm_str}---\n\n{body}"

        if not dry_run:
            with open(path / "SKILL.md", "w") as f:
                f.write(full_content)

        return True


class TradingSkillAnalyzer:
    """Main analyzer orchestrating the entire process."""

    def __init__(self, skills_dir: Path):
        """Initialize analyzer."""
        self.skills_dir = skills_dir
        self.classifier = TradingSkillClassifier()
        self.relation_gen = TradingSkillRelationshipGenerator()
        self.file_mgr = SkillFileManager()

        self.skills: Dict[str, SkillMetadata] = {}
        self.group_assignments: Dict[str, str] = {}
        self.relationship_changes: Dict[str, Tuple[List[str], List[str]]] = {}
        self.report: List[str] = []

    def load_skills(self):
        """Load all trading skills from disk."""
        print("📚 Loading trading skills...")
        trading_dirs = sorted(self.skills_dir.glob("trading-*"), key=lambda p: p.name)

        for skill_dir in trading_dirs:
            try:
                fm, _, body = self.file_mgr.read_skill(skill_dir)

                skill = SkillMetadata(
                    name=fm.get("name"),
                    path=skill_dir,
                    description=fm.get("description", ""),
                    related_skills=fm.get("metadata", {})
                    .get("related-skills", "")
                    .split(", ")
                    if isinstance(fm.get("metadata", {}).get("related-skills", ""), str)
                    else [],
                    content=body,
                )
                # Clean up empty strings
                skill.related_skills = [
                    s.strip() for s in skill.related_skills if s.strip()
                ]

                self.skills[skill.name] = skill
            except Exception as e:
                print(f"  ⚠️  Error loading {skill_dir.name}: {e}")
                continue

        print(f"  ✅ Loaded {len(self.skills)} trading skills")

    def classify_skills(self):
        """Classify all skills into functional groups."""
        print("\n🏷️  Classifying skills into functional groups...")

        for skill_name, skill in self.skills.items():
            group = self.classifier.classify_skill(skill_name, skill.description)
            skill.group = group
            self.group_assignments[skill_name] = group

        # Print distribution
        distribution = {}
        for group in self.group_assignments.values():
            distribution[group] = distribution.get(group, 0) + 1

        for group, count in sorted(distribution.items(), key=lambda x: -x[1]):
            print(f"  {group}: {count} skills")

    def generate_relationships(self):
        """Generate new relationships for all skills."""
        print("\n🔗 Generating intelligent relationships...")

        for skill_name, skill in self.skills.items():
            old_rels = skill.related_skills.copy()

            new_rels = self.relation_gen.generate_relationships(
                skill_name, skill.group, self.skills, self.group_assignments
            )

            self.relationship_changes[skill_name] = (old_rels, new_rels)
            skill.related_skills = new_rels

    def ensure_bidirectional_relationships(self):
        """
        Ensure all relationships are bidirectional.

        If A->B, then B should also have A.
        """
        print("\n↔️  Ensuring bidirectional relationships...")

        iterations = 0
        max_iterations = 5
        changes_made = True

        while changes_made and iterations < max_iterations:
            changes_made = False
            iterations += 1

            for skill_name, skill in self.skills.items():
                for related_skill in skill.related_skills[:]:
                    if related_skill not in self.skills:
                        # Remove invalid references
                        skill.related_skills.remove(related_skill)
                        changes_made = True
                        continue

                    related = self.skills[related_skill]
                    if skill_name not in related.related_skills:
                        # Add reverse relationship if there's capacity
                        if len(related.related_skills) < 4:
                            related.related_skills.append(skill_name)
                            self.relationship_changes[related_skill] = (
                                [r for r in related.related_skills if r != skill_name],
                                related.related_skills.copy(),
                            )
                            changes_made = True

        print(f"  ✅ Bidirectional validation complete ({iterations} iterations)")

    def deduplicate_relationships(self):
        """Remove duplicate relationships while preserving order."""
        print("\n🧹 Deduplicating relationships...")

        for skill_name, skill in self.skills.items():
            skill.related_skills = list(dict.fromkeys(skill.related_skills))

    def validate_relationships(self) -> bool:
        """Validate that all relationships meet quality standards."""
        print("\n✓ Validating relationships...")

        valid = True
        for skill_name, skill in self.skills.items():
            # Check count
            if len(skill.related_skills) < 2:
                print(
                    f"  ⚠️  {skill_name}: Only {len(skill.related_skills)} relationships (min: 2)"
                )
                valid = False

            if len(skill.related_skills) > 4:
                print(
                    f"  ⚠️  {skill_name}: {len(skill.related_skills)} relationships (max: 4)"
                )
                valid = False

            # Check validity
            for rel in skill.related_skills:
                if rel not in self.skills:
                    print(f"  ❌ {skill_name}: Invalid reference to {rel}")
                    valid = False

        return valid

    def apply_changes(self, dry_run: bool = False):
        """Apply all changes to SKILL.md files."""
        if dry_run:
            print("\n📋 DRY RUN MODE - showing changes without writing")
        else:
            print("\n✍️  Applying changes to SKILL.md files...")

        for skill_name, skill in self.skills.items():
            try:
                fm, _, _ = self.file_mgr.read_skill(skill.path)

                # Update related-skills in metadata
                if "metadata" not in fm:
                    fm["metadata"] = {}

                if skill.related_skills:
                    fm["metadata"]["related-skills"] = ", ".join(skill.related_skills)
                else:
                    fm["metadata"].pop("related-skills", None)

                self.file_mgr.write_skill(
                    skill.path, fm, skill.content, dry_run=dry_run
                )

            except Exception as e:
                print(f"  ❌ Error updating {skill_name}: {e}")

    def generate_report(self, output_file: Path):
        """Generate before/after report."""
        print(f"\n📄 Generating report: {output_file}")

        lines = [
            "# Trading Skills Relationship Report",
            f"\nGenerated: {datetime.now().isoformat()}",
            f"\nTotal Skills: {len(self.skills)}",
            "\n---\n",
        ]

        # Summary by group
        distribution = {}
        for group in self.group_assignments.values():
            distribution[group] = distribution.get(group, 0) + 1

        lines.append("## Distribution by Functional Group\n")
        for group, count in sorted(distribution.items(), key=lambda x: -x[1]):
            lines.append(f"- **{group}**: {count} skills")

        lines.append("\n---\n")
        lines.append("## Relationship Changes (Before → After)\n")

        # Group changes by functional group
        for group in sorted(set(self.group_assignments.values())):
            group_skills = [
                name
                for name, assigned_group in self.group_assignments.items()
                if assigned_group == group
            ]

            if not group_skills:
                continue

            lines.append(f"\n### {group} ({len(group_skills)} skills)\n")

            for skill_name in sorted(group_skills):
                if skill_name in self.relationship_changes:
                    old_rels, new_rels = self.relationship_changes[skill_name]
                    skill_id = skill_name.replace("trading-", "")

                    lines.append(f"#### {skill_id}")
                    lines.append(f"- **Before**: {old_rels if old_rels else '(none)'}")
                    lines.append(f"- **After**: {new_rels if new_rels else '(none)'}")
                    lines.append(f"- **Count**: {len(old_rels)} → {len(new_rels)}")
                    lines.append("")

        # Statistics
        lines.append("\n---\n")
        lines.append("## Statistics\n")

        before_counts = [len(rels[0]) for rels in self.relationship_changes.values()]
        after_counts = [len(rels[1]) for rels in self.relationship_changes.values()]

        lines.append(f"- **Total Relationships Before**: {sum(before_counts)}")
        lines.append(f"- **Total Relationships After**: {sum(after_counts)}")
        lines.append(
            f"- **Relationship Increase**: {sum(after_counts) - sum(before_counts)}"
        )
        lines.append(
            f"- **Average Relationships Per Skill**:"
            f" {sum(before_counts) / len(before_counts):.2f} → {sum(after_counts) / len(after_counts):.2f}"
        )

        # Write report
        with open(output_file, "w") as f:
            f.write("\n".join(lines))

        print(f"  ✅ Report written to {output_file}")

    def run(self, dry_run: bool = False):
        """Run the entire analysis and relationship generation."""
        print("=" * 70)
        print("TRADING SKILLS RELATIONSHIP GENERATOR")
        print("=" * 70)

        self.load_skills()
        self.classify_skills()
        self.generate_relationships()
        self.deduplicate_relationships()
        self.ensure_bidirectional_relationships()
        self.validate_relationships()

        # Show summary
        print("\n" + "=" * 70)
        print("RELATIONSHIP SUMMARY")
        print("=" * 70)

        for skill_name in sorted(self.skills.keys())[:5]:
            skill = self.skills[skill_name]
            print(f"\n{skill_name} ({skill.group})")
            print(f"  Relations: {', '.join(skill.related_skills)}")

        print("\n... (showing first 5 of {}) ...\n".format(len(self.skills)))

        if not dry_run:
            self.apply_changes(dry_run=False)
        else:
            print("\n📋 DRY RUN COMPLETE - no files were written")

        # Generate report
        report_path = self.skills_dir.parent / "TRADING_SKILLS_RELATIONSHIPS.md"
        self.generate_report(report_path)

        print("\n" + "=" * 70)
        print("✅ COMPLETE")
        print("=" * 70)

        return True


def main():
    """Main entry point."""
    dry_run = "--write" not in sys.argv

    skills_dir = Path("/home/paulpas/git/agent-skill-router/skills")

    if not skills_dir.exists():
        print(f"❌ Skills directory not found: {skills_dir}")
        sys.exit(1)

    analyzer = TradingSkillAnalyzer(skills_dir)
    analyzer.run(dry_run=dry_run)


if __name__ == "__main__":
    main()
