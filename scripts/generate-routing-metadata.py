#!/usr/bin/env python3
"""
Bulk-add archetypes, anti_triggers, response_profile to all SKILL.md files.

Adds routing metadata (archetypes, anti_triggers, response_profile) based on
domain + role + output-format heuristics. Skips skills that already have any
of the three fields to avoid overwriting manual work.

Usage:
    python3 scripts/generate-routing-metadata.py [--dry-run] [--domain <name>] [-v]

Options:
    --dry-run   Print changes without modifying files
    --domain    Only process a specific domain (e.g., "coding")
    -v, --verbose  Show detailed per-file output in dry-run mode
"""

import argparse
import os
import sys
from pathlib import Path

try:
    import yaml
except ImportError:
    print("Error: PyYAML is required. Install with: pip install pyyaml")
    sys.exit(1)

# ---------------------------------------------------------------------------
# Configuration — mapping tables
# ---------------------------------------------------------------------------

DOMAIN_ARCHETYPE_MAP = {
    ("coding", "implementation", "code"): ["tactical", "generation"],
    ("coding", "implementation", "manifests"): ["tactical"],
    ("coding", "reference", "code"): ["educational", "diagnostic"],
    ("coding", "reference", "analysis"): ["diagnostic", "educational"],
    ("coding", "orchestration", "*"): ["orchestration"],
    ("cncf", "reference", "manifests"): ["educational", "strategic"],
    ("cncf", "reference", "analysis"): ["educational", "diagnostic"],
    ("cncf", "implementation", "code"): ["tactical"],
    ("agent", "orchestration", "*"): ["orchestration", "strategic"],
    ("agent", "orchestration", "code"): ["tactical", "orchestration"],
    ("agent", "reference", "*"): ["educational"],
    ("agent", "implementation", "*"): ["tactical"],
    ("trading", "implementation", "code"): ["tactical"],
    ("trading", "reference", "analysis"): ["diagnostic", "strategic"],
    ("trading", "reference", "code"): ["educational", "tactical"],
    ("go", "implementation", "code"): ["tactical"],
    ("go", "reference", "code"): ["educational"],
    ("linux", "implementation", "code"): ["tactical"],
    ("linux", "reference", "*"): ["educational", "diagnostic"],
    ("programming", "reference", "code"): ["educational"],
    ("programming", "implementation", "code"): ["tactical"],
    ("writing", "reference", "*"): ["educational"],
}

DOMAIN_ANTITRIGGER_EXTRA = {
    "coding": ["code golf", "over-engineering"],
    "cncf": ["non-containerized architecture"],
    "agent": ["single-agent monolith"],
    "trading": ["no risk management"],
}

BASE_ANTITRIGGERS = ["brainstorming", "vague ideation"]

RESPONSE_PROFILE_MAP = {
    ("code", "implementation"): {
        "verbosity": "low",
        "directive_strength": "high",
        "abstraction_level": "operational",
    },
    ("manifests", "*"): {
        "verbosity": "low",
        "directive_strength": "medium",
        "abstraction_level": "tactical",
    },
    ("analysis", "orchestration"): {
        "verbosity": "medium",
        "directive_strength": "high",
        "abstraction_level": "tactical",
    },
    ("report", "*"): {
        "verbosity": "medium",
        "directive_strength": "low",
        "abstraction_level": "strategic",
    },
    ("manifests", "reference"): {
        "verbosity": "medium",
        "directive_strength": "low",
        "abstraction_level": "strategic",
    },
}

# Fallback defaults for unknown combinations
DEFAULT_ARCHETYPES = ["educational"]
DEFAULT_ANTITRIGGERS = list(BASE_ANTITRIGGERS)
DEFAULT_RESPONSE_PROFILE = {
    "verbosity": "medium",
    "directive_strength": "medium",
    "abstraction_level": "tactical",
}

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def infer_archetypes(domain, role, output_format):
    """Return a list of archetype strings for the given domain/role/output-format."""
    # Try exact match first
    key = (domain, role, output_format)
    if key in DOMAIN_ARCHETYPE_MAP:
        return list(DOMAIN_ARCHETYPE_MAP[key])

    # Try wildcard for output-format
    wf_key = (domain, role, "*")
    if wf_key in DOMAIN_ARCHETYPE_MAP:
        return list(DOMAIN_ARCHETYPE_MAP[wf_key])

    # Try wildcard for role
    rw_key = (domain, "*", output_format)
    if rw_key in DOMAIN_ARCHETYPE_MAP:
        return list(DOMAIN_ARCHETYPE_MAP[rw_key])

    print(f"  [WARN] No archetype mapping for domain={domain}, role={role}, output-format={output_format}")
    return list(DEFAULT_ARCHETYPES)


def infer_antitriggers(domain):
    """Return a combined list of anti-triggers."""
    result = list(BASE_ANTITRIGGERS)
    extra = DOMAIN_ANTITRIGGER_EXTRA.get(domain, [])
    result.extend(extra)
    return result


def infer_response_profile(output_format, role):
    """Return a response profile dict for the given output-format/role."""
    key = (output_format, role)
    if key in RESPONSE_PROFILE_MAP:
        return dict(RESPONSE_PROFILE_MAP[key])

    # Try wildcard for role
    wf_key = (output_format, "*")
    if wf_key in RESPONSE_PROFILE_MAP:
        return dict(RESPONSE_PROFILE_MAP[wf_key])

    print(f"  [WARN] No response_profile mapping for output-format={output_format}, role={role}")
    return dict(DEFAULT_RESPONSE_PROFILE)


def read_frontmatter(file_path):
    """Read a SKILL.md and return (full_content, frontmatter_dict, raw_yaml_string)."""
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    stripped = content.lstrip()
    if not stripped.startswith("---"):
        return None, None, None

    # Split on first and third --- to get frontmatter
    parts = content.split("---", 3)
    if len(parts) < 3:
        return None, None, None

    raw_yaml = parts[1].strip()
    try:
        fm = yaml.safe_load(raw_yaml)
    except yaml.YAMLError as e:
        return None, None, None

    # Ensure metadata dict exists
    if "metadata" not in fm or not isinstance(fm.get("metadata"), dict):
        fm.setdefault("metadata", {})

    return content, fm, raw_yaml


def rebuild_frontmatter(fm):
    """Reconstruct the YAML frontmatter string from a dict, preserving order."""
    # Dump the entire dict at once to get proper nested YAML structure
    return yaml.dump(
        fm,
        default_flow_style=False,
        sort_keys=False,
        allow_unicode=True,
    ).rstrip()


def has_routing_fields(fm):
    """Check if the frontmatter already has any of the three routing fields,
    either at top level or inside metadata."""
    for key in ("archetypes", "anti_triggers", "response_profile"):
        if key in fm:
            return True
        metadata = fm.get("metadata", {})
        if isinstance(metadata, dict) and key in metadata:
            return True
    return False


# ---------------------------------------------------------------------------
# Main logic
# ---------------------------------------------------------------------------


def process_file(file_path, dry_run=False, verbose=False):
    """Process a single SKILL.md file.

    Returns a dict with:
        - changed: bool — whether the file was modified (or would be in dry-run)
        - reason: str or None — why it was skipped or what changed
        - error: str or None — if processing failed
    """
    result = {"changed": False, "reason": None, "error": None}

    content, fm, raw_yaml = read_frontmatter(file_path)
    if fm is None:
        result["reason"] = "no frontmatter"
        return result

    # Skip if any routing fields already exist
    if has_routing_fields(fm):
        result["reason"] = "already has routing fields"
        return result

    metadata = fm.get("metadata", {})
    domain = metadata.get("domain", "unknown")
    role = metadata.get("role", None)
    output_format = metadata.get("output-format", None)

    # Fill in missing metadata defaults so we can infer
    if not role:
        result["reason"] = f"missing role (domain={domain})"
        return result
    if not output_format:
        result["reason"] = f"missing output-format (domain={domain}, role={role})"
        return result

    # Infer values
    archetypes = infer_archetypes(domain, role, output_format)
    antitriggers = infer_antitriggers(domain)
    response_profile = infer_response_profile(output_format, role)

    if dry_run and verbose:
        print(f"  [DRY-RUN] {file_path}")
        print(f"      archetypes:           {archetypes}")
        print(f"      anti_triggers:        {antitriggers}")
        print(f"      response_profile:     {response_profile}")

    # Build updated frontmatter — fields go inside metadata, after triggers
    # Also show the full new frontmatter in verbose dry-run mode
    metadata = fm["metadata"]
    new_metadata = {}
    for k, v in metadata.items():
        new_metadata[k] = v
        if k == "triggers":
            new_metadata["archetypes"] = archetypes
            new_metadata["anti_triggers"] = antitriggers
            new_metadata["response_profile"] = response_profile

    fm["metadata"] = new_metadata

    new_frontmatter_str = rebuild_frontmatter(fm)

    if dry_run:
        if verbose:
            print(f"  [DRY-RUN] Frontmatter would change:")
            print(new_frontmatter_str)
        result["changed"] = True
        return result

    # Reconstruct the full file content
    parts = content.split("---", 3)
    new_content = "---\n" + new_frontmatter_str + "\n---"
    if len(parts) >= 3:
        # There is body content after the second ---
        new_content += "---" + parts[2]

    # Write back
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(new_content)

    result["changed"] = True
    return result


def process_domain(domain_name, skills_dir, dry_run=False, verbose=False):
    """Process all SKILL.md files in a domain directory.

    Returns stats dict.
    """
    domain_path = os.path.join(skills_dir, domain_name)
    if not os.path.isdir(domain_path):
        return None

    stats = {
        "total": 0,
        "archetypes_set": 0,
        "antitriggers_set": 0,
        "response_profile_set": 0,
        "already_has_fields": 0,
        "skipped_no_frontmatter": 0,
        "skipped_missing_metadata": 0,
        "yaml_errors": 0,
    }

    for root, dirs, files in sorted(os.walk(domain_path)):
        for fn in sorted(files):
            if fn != "SKILL.md":
                continue

            skill_md = os.path.join(root, fn)
            stats["total"] += 1
            result = process_file(skill_md, dry_run=dry_run, verbose=verbose)

            if result["reason"] == "already has routing fields":
                stats["already_has_fields"] += 1
            elif result["reason"] in ("no frontmatter",):
                stats["skipped_no_frontmatter"] += 1
            elif isinstance(result.get("reason"), str) and result["reason"].startswith("missing"):
                stats["skipped_missing_metadata"] += 1
            elif result["error"]:
                stats["yaml_errors"] += 1
            elif result["changed"]:
                stats["archetypes_set"] += 1
                stats["antitriggers_set"] += 1
                stats["response_profile_set"] += 1

    return stats


def print_stats(domain_name, stats):
    """Print a formatted stats block for one domain."""
    if stats is None:
        return

    total = stats["total"]
    already = stats["already_has_fields"]

    print(f"=== {domain_name} ===")
    print(f"  archetypes set:            {stats['archetypes_set']:>3} / {total} skills")
    if already > 0:
        print(f"  anti_triggers set:         {stats['antitriggers_set']:>3} / {total} skills  (pre-existing fields: {already})")
    else:
        print(f"  anti_triggers set:         {stats['antitriggers_set']:>3} / {total} skills")
    print(f"  response_profile set:      {stats['response_profile_set']:>3} / {total} skills")
    if already > 0:
        print(f"  skipped (already has fields): {already}")
    if stats["skipped_no_frontmatter"] > 0:
        print(f"  skipped (no frontmatter):  {stats['skipped_no_frontmatter']}")
    if stats["skipped_missing_metadata"] > 0:
        print(f"  skipped (missing metadata): {stats['skipped_missing_metadata']}")
    if stats["yaml_errors"] > 0:
        print(f"  YAML errors:               {stats['yaml_errors']}")
    print()


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------


def main():
    parser = argparse.ArgumentParser(
        description="Bulk-add routing metadata (archetypes, anti_triggers, response_profile) to SKILL.md files."
    )
    parser.add_argument("--dry-run", action="store_true", help="Print changes without modifying files")
    parser.add_argument("--domain", type=str, default=None, help="Only process a specific domain")
    parser.add_argument("-v", "--verbose", action="store_true", help="Show detailed per-file output in dry-run mode")
    args = parser.parse_args()

    # Resolve paths
    script_dir = Path(__file__).parent.resolve()
    repo_root = script_dir.parent
    skills_dir = os.path.join(repo_root, "skills")

    if not os.path.isdir(skills_dir):
        print(f"Error: skills directory not found at {skills_dir}")
        sys.exit(1)

    # Determine which domains to process
    if args.domain:
        domains = [args.domain]
        if domains[0] not in os.listdir(skills_dir):
            print(f"Error: domain '{args.domain}' not found. Available: {', '.join(sorted(os.listdir(skills_dir)))}")
            sys.exit(1)
    else:
        domains = sorted(d for d in os.listdir(skills_dir) if os.path.isdir(os.path.join(skills_dir, d)))

    total_stats = {
        "total": 0,
        "archetypes_set": 0,
        "antitriggers_set": 0,
        "response_profile_set": 0,
        "already_has_fields": 0,
        "skipped_no_frontmatter": 0,
        "skipped_missing_metadata": 0,
        "yaml_errors": 0,
    }

    print(f"{'DRY-RUN: '}{'[DRY-RUN] ' if args.dry_run else ''}Processing {len(domains)} domain(s) in {skills_dir}")
    print()

    for domain in domains:
        stats = process_domain(domain, skills_dir, dry_run=args.dry_run, verbose=args.verbose)
        if stats is not None:
            print_stats(domain, stats)
            total_stats["total"] += stats["total"]
            total_stats["archetypes_set"] += stats["archetypes_set"]
            total_stats["antitriggers_set"] += stats["antitriggers_set"]
            total_stats["response_profile_set"] += stats["response_profile_set"]
            total_stats["already_has_fields"] += stats["already_has_fields"]
            total_stats["skipped_no_frontmatter"] += stats["skipped_no_frontmatter"]
            total_stats["skipped_missing_metadata"] += stats["skipped_missing_metadata"]
            total_stats["yaml_errors"] += stats["yaml_errors"]

    # Summary
    print("--- TOTALS ---")
    already = total_stats["already_has_fields"]
    total = total_stats["total"]
    print(f"  archetypes set:            {total_stats['archetypes_set']:>3} / {total}")
    if already > 0:
        print(f"  anti_triggers set:         {total_stats['antitriggers_set']:>3} / {total}  (pre-existing fields: {already})")
    else:
        print(f"  anti_triggers set:         {total_stats['antitriggers_set']:>3} / {total}")
    print(f"  response_profile set:      {total_stats['response_profile_set']:>3} / {total}")
    if already > 0:
        print(f"  skipped (already has fields): {already}")
    if total_stats["skipped_no_frontmatter"] > 0:
        print(f"  skipped (no frontmatter):  {total_stats['skipped_no_frontmatter']}")
    if total_stats["skipped_missing_metadata"] > 0:
        print(f"  skipped (missing metadata): {total_stats['skipped_missing_metadata']}")
    if total_stats["yaml_errors"] > 0:
        print(f"  YAML errors:               {total_stats['yaml_errors']}")

    if args.dry_run:
        print("\n[DRY-RUN] No files were modified.")


if __name__ == "__main__":
    main()
