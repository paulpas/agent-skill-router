#!/usr/bin/env python3
"""Generate comprehensive post-removal statistics report for skills directory."""

import os
from pathlib import Path
from collections import defaultdict
from datetime import datetime


def analyze_skills_directory(skills_path: str) -> dict:
    """Analyze all skills and generate statistics."""

    skills_dir = Path(skills_path)
    stats = {
        "total_skills": 0,
        "stub_files": [],
        "domain_counts": defaultdict(int),
        "size_distribution": defaultdict(int),
        "stub_sentinel_files": [],
        "size_ranges": [
            (0, 1000, "0-1000"),
            (1000, 1500, "1000-1500"),
            (1500, 2000, "1500-2000"),
            (2000, 5000, "2000-5000"),
            (5000, 10000, "5000-10000"),
            (10000, float("inf"), "10000+"),
        ],
        "domains": ["agent", "cncf", "coding", "programming", "trading"],
    }

    # Scan all skill directories
    for domain in stats["domains"]:
        domain_path = skills_dir / domain
        if not domain_path.exists():
            continue

        for skill_dir in domain_path.iterdir():
            if not skill_dir.is_dir():
                continue

            skill_md = skill_dir / "SKILL.md"
            if not skill_md.exists():
                continue

            stats["total_skills"] += 1

            # Get file size
            file_size = skill_md.stat().st_size

            # Count code blocks
            try:
                content = skill_md.read_text()
                code_blocks = content.count("```")
            except Exception:
                code_blocks = 0

            # Check for stub sentinel
            if "Implementing this specific pattern or feature" in content:
                stats["stub_sentinel_files"].append(
                    {
                        "domain": domain,
                        "skill": skill_dir.name,
                        "path": str(skill_md),
                        "size": file_size,
                    }
                )

            # Check for stub (size < 2000 and code blocks < 2)
            if file_size < 2000 and code_blocks < 2:
                stats["stub_files"].append(
                    {
                        "domain": domain,
                        "skill": skill_dir.name,
                        "path": str(skill_md),
                        "size": file_size,
                        "code_blocks": code_blocks,
                    }
                )

            # Domain count
            stats["domain_counts"][domain] += 1

            # Size distribution
            for min_size, max_size, label in stats["size_ranges"]:
                if min_size <= file_size < max_size:
                    stats["size_distribution"][label] += 1
                    break

    return stats


def generate_report(stats: dict, output_path: str) -> None:
    """Generate markdown report."""

    report_lines = []

    # Header
    report_lines.append("# Skills Directory Post-Removal Statistics Report")
    report_lines.append("")
    report_lines.append(
        f"**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
    )
    report_lines.append(
        f"**Analysis Path:** /home/paulpas/git/agent-skill-router/skills/"
    )
    report_lines.append("")

    # Summary Statistics
    report_lines.append("## Summary Statistics")
    report_lines.append("")
    total = stats["total_skills"]
    stub_count = len(stats["stub_files"])
    stub_percentage = (stub_count / total * 100) if total > 0 else 0
    sentinel_count = len(stats["stub_sentinel_files"])

    report_lines.append(f"| Metric | Value |")
    report_lines.append(f"|--------|-------|")
    report_lines.append(f"| Total Skills | {total} |")
    report_lines.append(f"| Stub Files | {stub_count} |")
    report_lines.append(f"| Stub Percentage | {stub_percentage:.2f}% |")
    report_lines.append(f"| Stub Sentinel Issues | {sentinel_count} |")
    report_lines.append("")

    # Domain Breakdown
    report_lines.append("## Breakdown by Domain")
    report_lines.append("")
    report_lines.append("| Domain | Count |")
    report_lines.append("|--------|-------|")
    for domain in stats["domains"]:
        count = stats["domain_counts"].get(domain, 0)
        report_lines.append(f"| {domain} | {count} |")
    report_lines.append("")

    # Size Distribution
    report_lines.append("## Size Distribution")
    report_lines.append("")
    report_lines.append("| Range | Count |")
    report_lines.append("|-------|-------|")
    for min_size, max_size, label in stats["size_ranges"]:
        count = stats["size_distribution"].get(label, 0)
        percentage = (count / total * 100) if total > 0 else 0
        bar = "█" * min(count, 50)
        report_lines.append(f"| {label} | {count} ({percentage:.1f}%) | {bar}")
    report_lines.append("")

    # Stub Files Detail
    if stats["stub_files"]:
        report_lines.append("## Stub Files (Size < 2000 bytes, Code Blocks < 2)")
        report_lines.append("")
        report_lines.append("| Domain | Skill | Size (bytes) | Code Blocks |")
        report_lines.append("|--------|-------|--------------|-------------|")
        for stub in sorted(stats["stub_files"], key=lambda x: x["size"]):
            report_lines.append(
                f"| {stub['domain']} | {stub['skill']} | {stub['size']} | {stub['code_blocks']} |"
            )
        report_lines.append("")

    # Stub Sentinel Issues
    if stats["stub_sentinel_files"]:
        report_lines.append("## Files with Stub Sentinel")
        report_lines.append("")
        report_lines.append(
            '**WARNING:** These files contain "Implementing this specific pattern or feature" - likely stubs'
        )
        report_lines.append("")
        report_lines.append("| Domain | Skill | Size (bytes) |")
        report_lines.append("|--------|-------|--------------|")
        for sentinel in sorted(stats["stub_sentinel_files"], key=lambda x: x["size"]):
            report_lines.append(
                f"| {sentinel['domain']} | {sentinel['skill']} | {sentinel['size']} |"
            )
        report_lines.append("")

    # Quality Assessment
    report_lines.append("## Quality Assessment")
    report_lines.append("")

    if stub_percentage == 0 and sentinel_count == 0:
        report_lines.append(
            "✅ **EXCELLENT:** No stub files or sentinel issues detected!"
        )
    else:
        report_lines.append("⚠️ **REVIEW REQUIRED:**")
        if stub_count > 0:
            report_lines.append(
                f"- {stub_count} stub files detected ({stub_percentage:.2f}%)"
            )
        if sentinel_count > 0:
            report_lines.append(f"- {sentinel_count} files with stub sentinel text")

    report_lines.append("")

    # Footer
    report_lines.append("---")
    report_lines.append("*Report generated by skills statistics analyzer*")

    # Write report
    Path(output_path).write_text("\n".join(report_lines))


def main():
    skills_path = "/home/paulpas/git/agent-skill-router/skills/"
    output_path = "/home/paulpas/git/agent-skill-router/STUB_REMOVAL_REPORT_20260427.md"

    print("Analyzing skills directory...")
    stats = analyze_skills_directory(skills_path)

    print("Generating report...")
    generate_report(stats, output_path)

    # Print summary to console
    total = stats["total_skills"]
    stub_count = len(stats["stub_files"])
    stub_percentage = (stub_count / total * 100) if total > 0 else 0
    sentinel_count = len(stats["stub_sentinel_files"])

    print(f"\n📊 Analysis Complete!")
    print(f"   Total Skills: {total}")
    print(f"   Stub Files: {stub_count} ({stub_percentage:.2f}%)")
    print(f"   Stub Sentinel Issues: {sentinel_count}")
    print(f"\n📄 Report saved to: {output_path}")


if __name__ == "__main__":
    main()
