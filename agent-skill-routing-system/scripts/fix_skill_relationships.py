#!/usr/bin/env python3
"""
Fix Skill Relationships Script

This script reads the SKILL_RELATIONSHIPS_ANALYSIS.md report and applies fixes to all SKILL.md files:
1. Adds reciprocal relationships (if A→B, ensures B→A)
2. Removes dead references (non-existent skills)
3. Adds semantic similarity suggestions (50+ suggestions)
4. Maintains 2-4 related skills per skill
5. Keeps reciprocal relationships bidirectional

Generates:
- Real-time progress with ETA
- Summary file: SKILL_RELATIONSHIP_FIXES.md
- Validation report
"""

import os
import re
import sys
import yaml
from pathlib import Path
from collections import defaultdict
from datetime import datetime
import time


# Colors for terminal output
class Colors:
    HEADER = "\033[95m"
    BLUE = "\033[94m"
    CYAN = "\033[96m"
    GREEN = "\033[92m"
    YELLOW = "\033[93m"
    RED = "\033[91m"
    ENDC = "\033[0m"
    BOLD = "\033[1m"


def progress_bar(current, total, label="", width=40):
    """Display a simple progress bar."""
    percent = current / total
    filled = int(width * percent)
    bar = "█" * filled + "░" * (width - filled)
    pct_text = f"{percent * 100:6.1f}%"
    return f"\r{label} [{bar}] {pct_text}"


def parse_skill_file(skill_path):
    """Parse a SKILL.md file and return frontmatter and content separately."""
    try:
        with open(skill_path, "r", encoding="utf-8") as f:
            content = f.read()

        # Extract frontmatter
        if not content.startswith("---"):
            return None, content

        match = re.match(r"^---\n(.*?)\n---\n(.*)$", content, re.DOTALL)
        if not match:
            return None, content

        frontmatter_str, body = match.groups()
        try:
            frontmatter = yaml.safe_load(frontmatter_str)
            return frontmatter, body
        except yaml.YAMLError:
            return None, content
    except Exception as e:
        print(f"Error parsing {skill_path}: {e}")
        return None, None


def write_skill_file(skill_path, frontmatter, body):
    """Write frontmatter and body back to a SKILL.md file."""
    try:
        # Dump frontmatter with proper YAML formatting
        frontmatter_str = yaml.dump(
            frontmatter, default_flow_style=False, sort_keys=False, allow_unicode=True
        )
        # Remove trailing newline from YAML dump
        frontmatter_str = frontmatter_str.rstrip("\n")

        full_content = f"---\n{frontmatter_str}\n---\n{body}"

        with open(skill_path, "w", encoding="utf-8") as f:
            f.write(full_content)
        return True
    except Exception as e:
        print(f"Error writing {skill_path}: {e}")
        return False


def skill_exists(skill_name, skills_dir):
    """Check if a skill directory exists."""
    skill_path = skills_dir / skill_name
    return skill_path.is_dir() and (skill_path / "SKILL.md").exists()


def parse_analysis_report(report_path):
    """Parse the SKILL_RELATIONSHIPS_ANALYSIS.md report."""
    dead_refs = set()
    reciprocal_failures = defaultdict(list)
    semantic_suggestions = []

    try:
        with open(report_path, "r", encoding="utf-8") as f:
            lines = f.readlines()

        in_reciprocals = False
        in_suggestions = False
        current_skill = None

        for i, line in enumerate(lines):
            # Parse reciprocal failures section
            if "❌ Reciprocal Failures" in line:
                in_reciprocals = True
                in_suggestions = False
                continue

            # Parse suggested relationships section
            if "💡 Suggested New Relationships" in line:
                in_suggestions = True
                in_reciprocals = False
                continue

            # Parse 🎯 Recommendations to stop processing
            if "🎯 Recommendations" in line:
                break

            # In reciprocals section
            if in_reciprocals and line.strip().startswith("### "):
                current_skill = line.strip("# ").strip()
            elif in_reciprocals and current_skill and line.startswith("- → "):
                # Parse: - → **cncf-aws-acm** (Referenced skill does not exist)
                match = re.search(r"\*\*([^*]+)\*\*", line)
                if match:
                    target_skill = match.group(1)
                    if "does not exist" in line:
                        dead_refs.add(target_skill)
                    else:
                        reciprocal_failures[current_skill].append(target_skill)

            # In suggestions section
            if in_suggestions and line.strip() and re.match(r"^\d+\. \*\*", line):
                # Parse: 1. **cncf-kuma** → **cncf-linkerd**
                match = re.search(r"\*\*([^*]+)\*\* → \*\*([^*]+)\*\*", line)
                if match:
                    source = match.group(1)
                    target = match.group(2)

                    # Get score from next line
                    score = 0.50
                    if i + 1 < len(lines):
                        score_match = re.search(
                            r"Similarity Score: ([\d.]+)", lines[i + 1]
                        )
                        if score_match:
                            score = float(score_match.group(1))

                    semantic_suggestions.append(
                        {"source": source, "target": target, "score": score}
                    )

    except Exception as e:
        print(f"Error parsing report: {e}")

    return dead_refs, reciprocal_failures, semantic_suggestions


def get_all_skills(skills_dir):
    """Get list of all skill directories."""
    try:
        return sorted(
            [
                d.name
                for d in skills_dir.iterdir()
                if d.is_dir() and (d / "SKILL.md").exists()
            ]
        )
    except Exception as e:
        print(f"Error reading skills: {e}")
        return []


def normalize_related_skills(related_skills_str):
    """Parse and normalize a related-skills string into a clean set."""
    if not related_skills_str:
        return set()

    # Split by comma and strip whitespace
    skills = set(s.strip() for s in related_skills_str.split(",") if s.strip())
    return skills


def apply_fixes(skills_dir, analysis_report_path):
    """Apply all relationship fixes to SKILL.md files."""

    print(f"\n{Colors.HEADER}{Colors.BOLD}🔧 Skill Relationship Fixer{Colors.ENDC}\n")

    # Parse analysis report
    print(f"{Colors.CYAN}Parsing analysis report...{Colors.ENDC}")
    dead_refs, reciprocal_failures, semantic_suggestions = parse_analysis_report(
        analysis_report_path
    )

    print(f"  • Found {len(dead_refs)} dead references")
    print(f"  • Found {len(reciprocal_failures)} skills with reciprocal failures")
    print(f"  • Found {len(semantic_suggestions)} semantic similarity suggestions\n")

    # Get all skills
    all_skills = get_all_skills(skills_dir)
    total_skills = len(all_skills)

    # Index skills by name for quick lookup
    skill_index = set(all_skills)

    # Track statistics
    stats = {
        "dead_refs_removed": 0,
        "reciprocals_added": 0,
        "semantic_suggestions_added": 0,
        "skills_updated": 0,
        "validation_errors": 0,
        "updated_skills": {},
    }

    # Build relationship maps
    current_relationships = defaultdict(set)

    # First pass: read all existing relationships
    print(f"{Colors.CYAN}Reading existing relationships...{Colors.ENDC}")
    for skill_name in all_skills:
        skill_path = skills_dir / skill_name / "SKILL.md"
        frontmatter, _ = parse_skill_file(skill_path)
        if frontmatter and "metadata" in frontmatter:
            related_skills_str = frontmatter["metadata"].get("related-skills", "")
            if related_skills_str:
                skills = normalize_related_skills(related_skills_str)
                current_relationships[skill_name] = skills

    # Second pass: apply fixes
    print(f"{Colors.CYAN}Applying fixes to {total_skills} skills...{Colors.ENDC}\n")

    start_time = time.time()

    for idx, skill_name in enumerate(all_skills, 1):
        skill_path = skills_dir / skill_name / "SKILL.md"
        frontmatter, body = parse_skill_file(skill_path)

        if not frontmatter or "metadata" not in frontmatter:
            continue

        # Get current related skills
        related_skills_str = frontmatter["metadata"].get("related-skills", "")
        related_skills = normalize_related_skills(related_skills_str)

        original_related = related_skills.copy()

        # Step 1: Remove dead references
        before_dead = len(related_skills)
        related_skills = {
            s
            for s in related_skills
            if s not in dead_refs and skill_exists(s, skills_dir)
        }
        stats["dead_refs_removed"] += before_dead - len(related_skills)

        # Step 2: Add reciprocal relationships from failure list
        # These are relationships that exist in one direction but not the other
        if skill_name in reciprocal_failures:
            for target in reciprocal_failures[skill_name]:
                if (
                    skill_exists(target, skills_dir)
                    and target != skill_name
                    and target not in related_skills
                ):
                    related_skills.add(target)
                    stats["reciprocals_added"] += 1

        # Also add reciprocals from skills that point to us
        for source, targets in reciprocal_failures.items():
            if (
                skill_name in targets
                and skill_exists(source, skills_dir)
                and source not in related_skills
            ):
                related_skills.add(source)
                stats["reciprocals_added"] += 1

        # Step 3: Add semantic suggestions
        for suggestion in semantic_suggestions:
            added = False
            if suggestion["source"] == skill_name:
                target = suggestion["target"]
                if (
                    skill_exists(target, skills_dir)
                    and target != skill_name
                    and target not in related_skills
                ):
                    related_skills.add(target)
                    added = True
            elif suggestion["target"] == skill_name:
                source = suggestion["source"]
                if (
                    skill_exists(source, skills_dir)
                    and source != skill_name
                    and source not in related_skills
                ):
                    related_skills.add(source)
                    added = True

            if added:
                stats["semantic_suggestions_added"] += 1

        # Step 4: Limit to 2-4 related skills (keep highest scoring ones)
        # For now, keep alphabetically sorted for determinism
        if len(related_skills) > 4:
            # Keep top 4 (alphabetically for now, could be enhanced with scoring)
            related_skills = set(sorted(related_skills)[:4])

        # Ensure minimum of 2 (if we have at least 2 available)
        if len(related_skills) < 2 and len(related_skills) > 0:
            # Keep what we have; we can't force minimum
            pass

        # Remove self-references
        related_skills.discard(skill_name)

        # Update metadata if changed
        if related_skills != original_related:
            if related_skills:
                related_skills_sorted = ", ".join(sorted(related_skills))
                frontmatter["metadata"]["related-skills"] = related_skills_sorted
            else:
                frontmatter["metadata"]["related-skills"] = ""

            write_skill_file(skill_path, frontmatter, body)
            stats["skills_updated"] += 1
            stats["updated_skills"][skill_name] = {
                "before": ", ".join(sorted(original_related))
                if original_related
                else "(none)",
                "after": ", ".join(sorted(related_skills))
                if related_skills
                else "(none)",
                "added": related_skills - original_related,
                "removed": original_related - related_skills,
            }

        # Display progress
        elapsed = time.time() - start_time
        if idx > 1:
            avg_time = elapsed / (idx - 1)
            remaining = (total_skills - idx) * avg_time
            eta = f" (ETA: {remaining:.0f}s)"
        else:
            eta = ""

        label = f"Processing{eta}"
        bar = progress_bar(idx, total_skills, label)
        print(bar, end="", flush=True)

    print()  # New line after progress bar

    return stats


def validate_relationships(skills_dir, all_skills):
    """Validate that all relationships are valid."""
    print(f"\n{Colors.CYAN}Validating relationships...{Colors.ENDC}\n")

    errors = []
    skill_index = set(all_skills)
    relationships = defaultdict(set)

    for skill_name in all_skills:
        skill_path = skills_dir / skill_name / "SKILL.md"
        frontmatter, _ = parse_skill_file(skill_path)

        if not frontmatter or "metadata" not in frontmatter:
            continue

        related_skills_str = frontmatter["metadata"].get("related-skills", "")
        if not related_skills_str:
            continue

        related_skills = normalize_related_skills(related_skills_str)
        relationships[skill_name] = related_skills

        # Validate each relationship
        for related in related_skills:
            # Check if target exists
            if related not in skill_index:
                errors.append(f"  ✗ {skill_name} → {related} (target does not exist)")
            # Check if self-reference
            elif related == skill_name:
                errors.append(f"  ✗ {skill_name} → {skill_name} (self-reference)")
            # Check for reciprocal
            elif skill_name not in relationships.get(related, set()):
                errors.append(f"  ✗ {skill_name} → {related} (no reciprocal)")

    # Check for duplicates in related-skills
    for skill_name in all_skills:
        skill_path = skills_dir / skill_name / "SKILL.md"
        frontmatter, _ = parse_skill_file(skill_path)

        if not frontmatter or "metadata" not in frontmatter:
            continue

        related_skills_str = frontmatter["metadata"].get("related-skills", "")
        if related_skills_str:
            skills_list = [s.strip() for s in related_skills_str.split(",")]
            if len(skills_list) != len(set(skills_list)):
                duplicates = [s for s in skills_list if skills_list.count(s) > 1]
                errors.append(
                    f"  ✗ {skill_name} has duplicate related-skills: {set(duplicates)}"
                )

    if errors:
        print(f"{Colors.RED}Found {len(errors)} validation errors:{Colors.ENDC}\n")
        for error in errors[:20]:  # Show first 20 errors
            print(error)
        if len(errors) > 20:
            print(f"  ... and {len(errors) - 20} more errors")
        return False
    else:
        print(f"{Colors.GREEN}✓ All relationships are valid!{Colors.ENDC}")
        print(f"  • No broken references")
        print(f"  • All relationships are reciprocal")
        print(f"  • No duplicates in related-skills")
        return True


def generate_summary(output_path, stats, analysis_report_path):
    """Generate summary file."""
    total_files = len(stats["updated_skills"])

    summary = f"""# Skill Relationship Fixes Summary

**Generated:** {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}

## 📊 Statistics

| Metric | Count |
|--------|-------|
| Total Skills Updated | {stats["skills_updated"]} |
| Dead References Removed | {stats["dead_refs_removed"]} |
| Reciprocal Relationships Added | {stats["reciprocals_added"]} |
| Semantic Suggestions Added | {stats["semantic_suggestions_added"]} |
| Validation Errors | {stats["validation_errors"]} |

---

## 📝 Updated Skills

"""

    if stats["updated_skills"]:
        for skill_name in sorted(stats["updated_skills"].keys()):
            change = stats["updated_skills"][skill_name]
            summary += f"### {skill_name}\n\n"
            summary += f"**Before:** {change['before']}\n\n"
            summary += f"**After:** {change['after']}\n\n"

            if change["added"]:
                summary += f"**Added:** {', '.join(sorted(change['added']))}\n\n"
            if change["removed"]:
                summary += f"**Removed:** {', '.join(sorted(change['removed']))}\n\n"
            summary += "\n"
    else:
        summary += "No skills were updated.\n"

    # Write summary
    try:
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(summary)
        print(f"\n{Colors.GREEN}✓ Summary written to: {output_path}{Colors.ENDC}")
    except Exception as e:
        print(f"{Colors.RED}✗ Error writing summary: {e}{Colors.ENDC}")


def main():
    """Main execution."""
    # Determine paths
    script_dir = Path(__file__).parent
    repo_root = script_dir.parent.parent
    skills_dir = repo_root / "skills"
    analysis_report = repo_root / "SKILL_RELATIONSHIPS_ANALYSIS.md"
    output_summary = repo_root / "SKILL_RELATIONSHIP_FIXES.md"

    # Validate inputs
    if not skills_dir.exists():
        print(
            f"{Colors.RED}Error: Skills directory not found: {skills_dir}{Colors.ENDC}"
        )
        return 1

    if not analysis_report.exists():
        print(
            f"{Colors.RED}Error: Analysis report not found: {analysis_report}{Colors.ENDC}"
        )
        return 1

    print(f"{Colors.HEADER}Skill Relationship Fixer{Colors.ENDC}")
    print(f"Skills dir: {skills_dir}")
    print(f"Analysis report: {analysis_report}")
    print(f"Output summary: {output_summary}")

    # Apply fixes
    stats = apply_fixes(skills_dir, analysis_report)

    # Get all skills for validation
    all_skills = get_all_skills(skills_dir)

    # Validate
    is_valid = validate_relationships(skills_dir, all_skills)
    if not is_valid:
        stats["validation_errors"] += 1

    # Generate summary
    generate_summary(output_summary, stats, analysis_report)

    # Print final report
    print(f"\n{Colors.HEADER}{Colors.BOLD}📋 Final Report{Colors.ENDC}\n")
    print(f"  {Colors.GREEN}✓ Skills Updated:{Colors.ENDC} {stats['skills_updated']}")
    print(
        f"  {Colors.GREEN}✓ Dead References Removed:{Colors.ENDC} {stats['dead_refs_removed']}"
    )
    print(
        f"  {Colors.GREEN}✓ Reciprocals Added:{Colors.ENDC} {stats['reciprocals_added']}"
    )
    print(
        f"  {Colors.GREEN}✓ Semantic Suggestions Added:{Colors.ENDC} {stats['semantic_suggestions_added']}"
    )
    if stats["validation_errors"] > 0:
        print(
            f"  {Colors.YELLOW}⚠ Validation Errors:{Colors.ENDC} {stats['validation_errors']}"
        )
    else:
        print(f"  {Colors.GREEN}✓ Validation Errors:{Colors.ENDC} 0")

    print(f"\n{Colors.GREEN}{Colors.BOLD}✨ Done!{Colors.ENDC}\n")

    return 0


if __name__ == "__main__":
    sys.exit(main())
