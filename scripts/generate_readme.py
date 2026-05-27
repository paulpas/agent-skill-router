#!/usr/bin/env python3
"""
Auto-README Generator for agent-skill-router

Reads all skill directories from skills/, extracts metadata, and generates
a dynamic README section with:
- Skills by Domain (agent, cncf, coding, trading, programming)
- Skills by Role (implementation, reference, orchestration, review)
- Complete Skills Index (alphabetical table)
"""

import argparse
import os
import re
import sys
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Tuple, Optional

# Add current directory to path for utils module
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from utils import (
    Colors,
    get_skills_directory,
    parse_yaml_frontmatter,
    extract_h1_title,
    truncate_at_word_boundary,
)
from domain_discovery import get_domain_list

def format_description_for_readme(description: str) -> str:
    """Format description for README display with proper length and readability."""
    if len(description) <= 250:
        return description
    return description[:250].rstrip() + "..."


def format_triggers_for_readme(trigger_list: List[str], max_count: int = 15) -> str:
    """Format triggers for README display, showing up to max_count triggers."""
    display_triggers = trigger_list[:max_count]
    formatted = ", ".join(display_triggers)
    if len(trigger_list) > max_count:
        formatted += "..."
    return formatted


def parse_skill(skill_dir: Path) -> Optional[Dict]:
    """Parse a single skill directory and extract metadata."""
    skill_md = skill_dir / "SKILL.md"

    if not skill_md.exists():
        print(
            f"{Colors.YELLOW}⚠ Skipping {skill_dir.name}: no SKILL.md found{Colors.RESET}",
            file=sys.stderr,
        )
        return None

    try:
        content = skill_md.read_text(encoding="utf-8")
    except Exception as e:
        print(
            f"{Colors.YELLOW}⚠ Skipping {skill_dir.name}: failed to read file - {str(e)}{Colors.RESET}",
            file=sys.stderr,
        )
        return None

    # Parse YAML frontmatter using shared utility
    metadata_dict, markdown_content, error = parse_yaml_frontmatter(content)

    if error:
        print(
            f"{Colors.YELLOW}⚠ Skipping {skill_dir.name}: YAML parse error{Colors.RESET}",
            file=sys.stderr,
        )
        return None

    if metadata_dict is None:
        # Distinguish between no frontmatter and parse error
        print(
            f"{Colors.YELLOW}⚠ Skipping {skill_dir.name}: no YAML frontmatter or invalid YAML{Colors.RESET}",
            file=sys.stderr,
        )
        return None

    # Extract required fields
    name = metadata_dict.get("name")
    description = metadata_dict.get("description")

    if not name or not description:
        print(
            f"{Colors.YELLOW}⚠ Skipping {skill_dir.name}: missing name or description{Colors.RESET}",
            file=sys.stderr,
        )
        return None

    # Extract metadata nested fields
    metadata = metadata_dict.get("metadata", {})
    domain = metadata.get("domain", "unknown")
    role = metadata.get("role", "unknown")
    triggers_raw = metadata.get("triggers", "")

    # Extract triggers from frontmatter (supports both YAML array and comma-separated string)
    if isinstance(triggers_raw, list):
        triggers = ", ".join(str(t).strip() for t in triggers_raw if str(t).strip())
    elif isinstance(triggers_raw, str):
        triggers = triggers_raw
    else:
        triggers = ""

    # Extract archetypes from frontmatter (supports both YAML array and comma-separated string)
    archetypes_raw = metadata.get("archetypes", "")
    if isinstance(archetypes_raw, list):
        archetype_list = [str(a).strip() for a in archetypes_raw if str(a).strip()]
    elif isinstance(archetypes_raw, str) and archetypes_raw.strip():
        archetype_list = [a.strip() for a in archetypes_raw.split(",") if a.strip()]
    else:
        archetype_list = []

    # Extract anti_triggers from frontmatter (supports both YAML array and comma-separated string)
    anti_triggers_raw = metadata.get("anti_triggers", "")
    if isinstance(anti_triggers_raw, list):
        anti_trigger_list = [str(a).strip() for a in anti_triggers_raw if str(a).strip()]
    elif isinstance(anti_triggers_raw, str) and anti_triggers_raw.strip():
        anti_trigger_list = [a.strip() for a in anti_triggers_raw.split(",") if a.strip()]
    else:
        anti_trigger_list = []

    # Extract response_profile from frontmatter (nested object or flat keys)
    response_profile = {}
    profile = metadata.get("response_profile", {})
    if isinstance(profile, dict):
        # Nested object: {verbosity: low, directive_strength: high, abstraction_level: operational}
        for key in ["verbosity", "directive_strength", "abstraction_level"]:
            val = profile.get(key)
            if val:
                response_profile[key] = str(val).lower()
    elif isinstance(profile, str) and profile.strip():
        # Fallback: try comma-separated or pipe-separated values for each known key
        parts = [p.strip() for p in profile.split(",") if p.strip()]
        for part in parts:
            if ":" in part:
                k, v = part.split(":", 1)
                response_profile[k.strip().lower().replace("-", "_")] = v.strip().lower()

    # Extract version from frontmatter
    version = metadata.get("version", "1.0.0")

    # Extract H1 title from markdown content
    title = extract_h1_title(markdown_content)
    if not title:
        title = name  # fallback to name if no H1 found

    return {
        "name": name,
        "title": title,
        "description": description,
        "domain": domain,
        "role": role,
        "triggers": triggers,
        "trigger_list": [t.strip() for t in triggers.split(",") if t.strip()],
        "archetypes": archetype_list,
        "anti_triggers": anti_trigger_list,
        "response_profile": response_profile,
        "version": version,
    }


def read_all_skills(skills_root: Path) -> List[Dict]:
    """Read all skills from the skills/ directory, organized by domain subdirectories."""
    skills = []

    if not skills_root.exists():
        print(
            f"{Colors.RED}✗ Skills directory not found: {skills_root}{Colors.RESET}",
            file=sys.stderr,
        )
        return skills

    # Scan each domain directory
    for domain in sorted(get_domain_list()):
        domain_path = skills_root / domain
        if not domain_path.exists():
            continue

        skill_dirs = sorted([d for d in domain_path.iterdir() if d.is_dir()])
        for skill_dir in skill_dirs:
            skill_data = parse_skill(skill_dir)
            if skill_data:
                skills.append(skill_data)

    return skills


def generate_skills_by_domain(skills: List[Dict]) -> str:
    """Generate Skills by Domain section as tables."""
    # Group by domain
    by_domain = {}
    for skill in skills:
        domain = skill["domain"]
        if domain not in by_domain:
            by_domain[domain] = []
        by_domain[domain].append(skill)

    # Sort domains alphabetically
    lines = ["## Skills by Domain\n"]

    for domain in sorted(by_domain.keys()):
        domain_skills = sorted(by_domain[domain], key=lambda s: s["name"])
        skill_count = len(domain_skills)

        lines.append(f"\n### {domain.capitalize()} ({skill_count} skills)\n")
        lines.append("| Skill Name | Description | Triggers |")
        lines.append("|---|---|---|")

        for skill in domain_skills:
            skill_link = f"[{skill['name']}](skills/{domain}/{skill['name']}/SKILL.md)"

            # Format description for README (up to 150 characters)
            desc = format_description_for_readme(skill["description"])

            # Format triggers for README (up to 15 triggers)
            triggers = format_triggers_for_readme(skill["trigger_list"], max_count=15)

            # Format archetypes for README (show as inline annotation)
            archetypes_display = ""
            if skill.get("archetypes"):
                arch_text = ", ".join(skill["archetypes"])
                archetypes_display = f" [{arch_text}]"

            # Build triggers column - add archetype info if present
            triggers_with_arch = f"{triggers}{archetypes_display}"
            lines.append(f"| {skill_link} | {desc} | {triggers_with_arch} |")

        lines.append("")

    return "\n".join(lines)


def generate_skills_by_role(skills: List[Dict]) -> str:
    """Generate Skills by Role section as tables."""
    # Group by role
    by_role = {}
    for skill in skills:
        role = skill["role"]
        if role not in by_role:
            by_role[role] = []
        by_role[role].append(skill)

    # Define order of roles
    role_order = ["implementation", "reference", "orchestration", "review"]

    lines = ["## Skills by Role\n"]

    for role in role_order:
        if role not in by_role:
            continue

        role_skills = sorted(by_role[role], key=lambda s: s["name"])
        skill_count = len(role_skills)
        role_display = {
            "implementation": "Implementation (Build Features)",
            "reference": "Reference (Learn & Understand)",
            "orchestration": "Orchestration (Manage AI Agents)",
            "review": "Review (Audit & Validate)",
        }

        lines.append(
            f"\n### {role_display.get(role, role.capitalize())} ({skill_count} skills)\n"
        )
        lines.append("| Skill Name | Domain | Description |")
        lines.append("|---|---|---|")

        for skill in role_skills:
            skill_link = (
                f"[{skill['name']}](skills/{skill['domain']}/{skill['name']}/SKILL.md)"
            )
            domain = skill["domain"].capitalize()

            # Format description for README (up to 150 characters)
            desc = format_description_for_readme(skill["description"])

            lines.append(f"| {skill_link} | {domain} | {desc} |")

        lines.append("")

    return "\n".join(lines)


def generate_skills_index(skills: List[Dict]) -> str:
    """Generate Complete Skills Index table with improved formatting."""
    lines = ["## Complete Skills Index\n"]
    lines.append("| Skill Name | Domain | Description | Role |")
    lines.append("|---|---|---|---|")

    # Sort by name alphabetically
    for skill in sorted(skills, key=lambda s: s["name"]):
        # Format description for README (up to 150 characters)
        desc = format_description_for_readme(skill["description"])

        # Format domain with proper capitalization
        domain = skill["domain"].capitalize()

        # Format role
        role = skill["role"].capitalize()

        # Create skill link using domain/skillname structure
        skill_link = (
            f"[{skill['name']}](skills/{skill['domain']}/{skill['name']}/SKILL.md)"
        )

        lines.append(f"| {skill_link} | {domain} | {desc} | {role} |")

    lines.append("")
    return "\n".join(lines)


def generate_domains_table(skills: List[Dict]) -> str:
    """Generate the Domains count table from actual skill data."""
    # Group by domain
    by_domain: Dict[str, int] = {}
    for skill in skills:
        domain = skill["domain"]
        by_domain[domain] = by_domain.get(domain, 0) + 1

    # Domain focus descriptions
    domain_focus = {
        "agent": "AI orchestration, routing, task decomposition",
        "cncf": "Kubernetes, cloud-native, DevOps, service mesh",
        "coding": "Software patterns, security, testing, data science",
        "electrical-engineering": "Hardware design, embedded systems, circuit analysis",
        "go": "Go idioms, concurrency patterns, error handling",
        "linux": "System administration, kernel tuning, security, networking",
        "maker": "DIY projects, IoT, home automation, 3D printing",
        "programming": "Algorithms, frameworks, language references",
        "trading": "Execution, risk management, ML models",
        "writing": "Technical writing, style guidance",
    }

    # Domain display name overrides (for acronyms casing)
    domain_display = {
        "cncf": "CNCF",
    }

    lines = ["| Domain | Count | Focus |", "|--------|-------|-------|"]
    for domain in sorted(by_domain.keys()):
        count = by_domain[domain]
        focus = domain_focus.get(domain, "")
        display = domain_display.get(domain, domain.replace("-", " ").title())
        lines.append(f"| {display} | {count} | {focus} |")

    return "\n".join(lines) + "\n"


def generate_routing_field_summary(skills: List[Dict]) -> str:
    """Generate a summary of advanced routing field adoption across all skills."""
    with_archetypes = sum(1 for s in skills if s.get("archetypes"))
    with_anti_triggers = sum(1 for s in skills if s.get("anti_triggers"))
    with_profile = sum(1 for s in skills if s.get("response_profile"))

    lines = [
        "## Advanced Routing Field Coverage",
        "",
        "| Field | Skills Configured | Description |",
        "|-------|-------------------|-------------|",
        f"| Archetypes | {with_archetypes} | Query intent matching (tactical, strategic, diagnostic, etc.) |",
        f"| Anti-Triggers | {with_anti_triggers} | Ranking penalty for conflicting query terms |",
        f"| Response Profile | {with_profile} | Verbosity, directive strength, abstraction level |",
        "",
    ]
    return "\n".join(lines)


def generate_content(skills: List[Dict]) -> str:
    """Generate complete auto-generated content."""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S UTC")

    content = f"""<!-- AUTO-GENERATED SKILLS INDEX START -->

> **Last updated:** {timestamp}  
> **Total skills:** {len(skills)}  
> **Canonical catalog:** [`skills-index.json`](skills-index.json) ({len(skills)} entries, JSON) — machine-readable source of truth; the pre-commit hook and GitHub Actions keep this README in sync with it

{generate_routing_field_summary(skills)}
{generate_skills_by_domain(skills)}
{generate_skills_by_role(skills)}
{generate_skills_index(skills)}

<!-- AUTO-GENERATED SKILLS INDEX END -->"""

    return content


def update_readme(readme_path: Path, generated_content: str, skills: List[Dict]) -> bool:
    """Update README with generated content between markers and update static intro counts."""
    if not readme_path.exists():
        print(
            f"{Colors.RED}✗ README not found: {readme_path}{Colors.RESET}",
            file=sys.stderr,
        )
        return False

    content = readme_path.read_text(encoding="utf-8")

    # ── Replace auto-generated block ─────────────────────────────────────────────
    start_marker = "<!-- AUTO-GENERATED SKILLS INDEX START -->"
    end_marker = "<!-- AUTO-GENERATED SKILLS INDEX END -->"

    if start_marker not in content:
        print(
            f"{Colors.YELLOW}⚠ Start marker not found in README. Appending content...{Colors.RESET}",
            file=sys.stderr,
        )
        content = content.rstrip() + "\n\n" + generated_content
    else:
        pattern = f"{re.escape(start_marker)}.*?{re.escape(end_marker)}"
        content = re.sub(pattern, generated_content, content, flags=re.DOTALL)

    # ── Update static intro counts ────────────────────────────────────────────────
    total_skills = len(skills)
    unique_domains = len(set(skill["domain"] for skill in skills))

    # Update "With N skills across M domains" in the intro paragraph
    content = re.sub(
        r'With \d+ skills across \d+ domains',
        f'With {total_skills} skills across {unique_domains} domains',
        content,
    )

    # Update "🎯 **N Skills**" in the feature bullet
    content = re.sub(
        r'🎯 \*\*\d+ Skills\*\*',
        f'🎯 **{total_skills} Skills**',
        content,
    )

    # ── Update Domains table ──────────────────────────────────────────────────────
    domains_table = generate_domains_table(skills)
    # Match the full domains table block: header + separator + data rows
    content = re.sub(
        r'\| Domain \| Count \| Focus \|\n\|--------\|-------\|-------\|\n(?:\| .+ \| \d+ \| .* \|\n?)*',
        domains_table,
        content,
        count=1,
    )

    readme_path.write_text(content, encoding="utf-8")

    return True


def main():
    parser = argparse.ArgumentParser(
        description="Generate README sections from skill metadata"
    )
    parser.add_argument(
        "--output",
        help="Output file (default: updates README.md in place)",
        type=str,
        default=None,
    )
    parser.add_argument(
        "--repo-root",
        help="Repository root (default: current directory)",
        type=str,
        default=None,
    )

    args = parser.parse_args()

    # Determine repo root
    if args.repo_root:
        repo_root = Path(args.repo_root)
    else:
        # Assume script is in scripts/ directory
        repo_root = Path(__file__).parent.parent

    skills_root = repo_root / "skills"
    readme_path = repo_root / "README.md"

    print(f"{Colors.BLUE}📖 Reading skills from {skills_root}...{Colors.RESET}")
    skills = read_all_skills(skills_root)

    if not skills:
        print(f"{Colors.RED}✗ No valid skills found{Colors.RESET}", file=sys.stderr)
        return 1

    print(f"{Colors.GREEN}✓ Found {len(skills)} valid skills{Colors.RESET}")

    # Generate content
    print(f"{Colors.BLUE}🔨 Generating README content...{Colors.RESET}")
    generated_content = generate_content(skills)

    # Output or update
    if args.output:
        output_path = Path(args.output)
        output_path.write_text(generated_content, encoding="utf-8")
        print(f"{Colors.GREEN}✓ Wrote to {output_path}{Colors.RESET}")
    else:
        if update_readme(readme_path, generated_content, skills):
            print(f"{Colors.GREEN}✓ Updated {readme_path}{Colors.RESET}")
        else:
            return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())
