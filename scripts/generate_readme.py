#!/usr/bin/env python3
"""
Auto-README Generator for agent-skill-router

Reads all skill directories from skills/, extracts metadata, and generates
a dynamic README section with:
- Skills by Domain (agent, cncf, coding, trading, programming)
- Skills by Role (implementation, reference, orchestration, review)
- Complete Skills Index (alphabetical table)
"""

import os
import re
import sys
import argparse
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Tuple, Optional
import yaml


def truncate_at_word_boundary(text: str, max_length: int = 60) -> str:
    """Truncate text at word boundary with ellipsis if needed."""
    if len(text) <= max_length:
        return text

    # Find the last space before max_length
    truncated = text[:max_length]
    last_space = truncated.rfind(" ")

    if last_space > 0:
        # Truncate at the last word boundary
        return text[:last_space] + "..."
    else:
        # No space found, truncate hard and add ellipsis
        return text[: max_length - 3] + "..."


# Color codes for terminal output
class Colors:
    RED = "\033[91m"
    GREEN = "\033[92m"
    YELLOW = "\033[93m"
    BLUE = "\033[94m"
    RESET = "\033[0m"


def extract_h1_title(content: str) -> Optional[str]:
    """Extract H1 title from markdown content."""
    for line in content.split("\n"):
        if line.startswith("# "):
            return line[2:].strip()
    return None


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
        with open(skill_md, "r", encoding="utf-8") as f:
            content = f.read()

        # Split YAML frontmatter from markdown content
        if not content.startswith("---"):
            print(
                f"{Colors.YELLOW}⚠ Skipping {skill_dir.name}: no YAML frontmatter{Colors.RESET}",
                file=sys.stderr,
            )
            return None

        # Find the closing --- marker
        parts = content.split("---", 2)
        if len(parts) < 3:
            print(
                f"{Colors.YELLOW}⚠ Skipping {skill_dir.name}: malformed YAML frontmatter{Colors.RESET}",
                file=sys.stderr,
            )
            return None

        yaml_content = parts[1]
        markdown_content = parts[2]

        # Parse YAML
        try:
            metadata_dict = yaml.safe_load(yaml_content)
        except yaml.YAMLError as e:
            print(
                f"{Colors.YELLOW}⚠ Skipping {skill_dir.name}: invalid YAML - {str(e)}{Colors.RESET}",
                file=sys.stderr,
            )
            return None

        if not metadata_dict:
            print(
                f"{Colors.YELLOW}⚠ Skipping {skill_dir.name}: empty YAML{Colors.RESET}",
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
        triggers = metadata.get("triggers", "")

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
        }

    except Exception as e:
        print(
            f"{Colors.RED}✗ Error parsing {skill_dir.name}: {str(e)}{Colors.RESET}",
            file=sys.stderr,
        )
        return None

    try:
        with open(skill_md, "r", encoding="utf-8") as f:
            post = frontmatter.load(f)

        # Extract required fields
        name = post.metadata.get("name")
        description = post.metadata.get("description")

        if not name or not description:
            print(
                f"{Colors.YELLOW}⚠ Skipping {skill_dir.name}: missing name or description{Colors.RESET}",
                file=sys.stderr,
            )
            return None

        # Extract metadata nested fields
        metadata = post.metadata.get("metadata", {})
        domain = metadata.get("domain", "unknown")
        role = metadata.get("role", "unknown")
        triggers = metadata.get("triggers", "")

        # Extract H1 title from markdown content
        title = extract_h1_title(post.content)
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
        }

    except Exception as e:
        print(
            f"{Colors.RED}✗ Error parsing {skill_dir.name}: {str(e)}{Colors.RESET}",
            file=sys.stderr,
        )
        return None


def read_all_skills(skills_root: Path) -> List[Dict]:
    """Read all skills from the skills/ directory."""
    skills = []

    if not skills_root.exists():
        print(
            f"{Colors.RED}✗ Skills directory not found: {skills_root}{Colors.RESET}",
            file=sys.stderr,
        )
        return skills

    skill_dirs = sorted([d for d in skills_root.iterdir() if d.is_dir()])

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
            skill_link = f"[{skill['name']}](../../skills/{skill['name']}/SKILL.md)"

            # Truncate description at word boundary
            desc = truncate_at_word_boundary(skill["description"], max_length=60)

            # Show top 2-3 triggers
            triggers = ", ".join(skill["trigger_list"][:2])
            if len(skill["trigger_list"]) > 2:
                triggers += "..."

            lines.append(f"| {skill_link} | {desc} | {triggers} |")

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
            skill_link = f"[{skill['name']}](../../skills/{skill['name']}/SKILL.md)"
            domain = skill["domain"].capitalize()

            # Truncate description at word boundary
            desc = truncate_at_word_boundary(skill["description"], max_length=60)

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
        # Use word-boundary truncation for description (60 chars)
        desc = truncate_at_word_boundary(skill["description"], max_length=60)

        # Format domain with proper capitalization
        domain = skill["domain"].capitalize()

        # Format role
        role = skill["role"].capitalize()

        # Create skill link
        skill_link = f"[{skill['name']}](../../skills/{skill['name']}/SKILL.md)"

        lines.append(f"| {skill_link} | {domain} | {desc} | {role} |")

    lines.append("")
    return "\n".join(lines)


def generate_content(skills: List[Dict]) -> str:
    """Generate complete auto-generated content."""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S UTC")

    content = f"""<!-- AUTO-GENERATED SKILLS INDEX START -->

> **Last updated:** {timestamp}  
> **Total skills:** {len(skills)}

{generate_skills_by_domain(skills)}
{generate_skills_by_role(skills)}
{generate_skills_index(skills)}

<!-- AUTO-GENERATED SKILLS INDEX END -->"""

    return content


def update_readme(readme_path: Path, generated_content: str) -> bool:
    """Update README with generated content between markers."""
    if not readme_path.exists():
        print(
            f"{Colors.RED}✗ README not found: {readme_path}{Colors.RESET}",
            file=sys.stderr,
        )
        return False

    with open(readme_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Check for markers
    start_marker = "<!-- AUTO-GENERATED SKILLS INDEX START -->"
    end_marker = "<!-- AUTO-GENERATED SKILLS INDEX END -->"

    if start_marker not in content:
        print(
            f"{Colors.YELLOW}⚠ Start marker not found in README. Appending content...{Colors.RESET}",
            file=sys.stderr,
        )
        content = content.rstrip() + "\n\n" + generated_content
    else:
        # Replace content between markers
        pattern = f"{re.escape(start_marker)}.*?{re.escape(end_marker)}"
        content = re.sub(pattern, generated_content, content, flags=re.DOTALL)

    with open(readme_path, "w", encoding="utf-8") as f:
        f.write(content)

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
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(generated_content)
        print(f"{Colors.GREEN}✓ Wrote to {output_path}{Colors.RESET}")
    else:
        if update_readme(readme_path, generated_content):
            print(f"{Colors.GREEN}✓ Updated {readme_path}{Colors.RESET}")
        else:
            return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())
