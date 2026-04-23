#!/usr/bin/env python3
"""
reformat_skills.py — Enrich SKILL.md frontmatter with missing fields.

Deterministic rules applied per domain prefix:
  agent-*       → domain=agent,       role=orchestration,  scope=orchestration, output-format=analysis
  cncf-*        → domain=cncf,        role=reference,      scope=infrastructure, output-format=manifests
  coding-*      → domain=coding,      role=implementation, scope=implementation, output-format=code
  trading-*     → domain=trading,     role=implementation, scope=implementation, output-format=code
  programming-* → domain=programming, role=reference,      scope=implementation, output-format=code

Only ADDS missing fields — never overwrites existing values.
Idempotent: running twice produces identical output.
"""

import os
import re
import sys

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

SKILLS_ROOT = os.path.dirname(os.path.abspath(__file__))

DOMAIN_PREFIXES = {
    "agent-": "agent",
    "cncf-": "cncf",
    "coding-": "coding",
    "trading-": "trading",
    "programming-": "programming",
}

DOMAIN_DEFAULTS = {
    "agent": {
        "role": "orchestration",
        "scope": "orchestration",
        "output-format": "analysis",
    },
    "cncf": {
        "role": "reference",
        "scope": "infrastructure",
        "output-format": "manifests",
    },
    "coding": {
        "role": "implementation",
        "scope": "implementation",
        "output-format": "code",
    },
    "trading": {
        "role": "implementation",
        "scope": "implementation",
        "output-format": "code",
    },
    "programming": {
        "role": "reference",
        "scope": "implementation",
        "output-format": "code",
    },
}

STOP_WORDS = {
    "a",
    "an",
    "the",
    "for",
    "to",
    "and",
    "or",
    "with",
    "in",
    "of",
    "on",
    "at",
    "by",
    "from",
    "that",
    "this",
    "which",
    "is",
    "are",
    "be",
    "as",
    "it",
    "its",
    "using",
    "based",
    "provides",
    "enables",
    "allows",
    "into",
    "across",
    "during",
    "between",
    "through",
}

# Top-level field ordering
TOP_LEVEL_ORDER = ["name", "description", "license", "compatibility"]

# Metadata sub-field ordering (known fields first, extras appended)
META_KNOWN_ORDER = ["version", "domain", "role", "scope", "output-format", "triggers"]


# ---------------------------------------------------------------------------
# Frontmatter parsing
# ---------------------------------------------------------------------------


def extract_frontmatter_and_body(content: str):
    """
    Split content into (frontmatter_str, body_str).
    Returns (None, content) if no valid frontmatter found.
    frontmatter_str excludes the --- delimiters.
    body_str includes everything after the closing ---.
    """
    if not content.startswith("---"):
        return None, content

    # Find the second ---
    rest = content[3:]  # skip opening ---
    # The rest might start with \n
    if rest.startswith("\n"):
        rest = rest[1:]

    end_idx = rest.find("\n---")
    if end_idx == -1:
        return None, content

    frontmatter_str = rest[:end_idx]
    body_str = rest[end_idx + 4 :]  # skip \n---
    # body_str may start with \n — preserve that exactly
    return frontmatter_str, body_str


def parse_frontmatter(frontmatter_str: str):
    """
    Parse simple YAML frontmatter (line-by-line, no full YAML parser).

    Returns:
        top_level: dict of top-level key→value (str)
        metadata:  dict of metadata sub-key→value (str), or {} if no metadata block
        extra_top: list of (key, value) for top-level fields not in TOP_LEVEL_ORDER
                   (preserves order and unknown fields)
        extra_meta: list of (key, value) for metadata fields not in META_KNOWN_ORDER
    """
    top_level = {}
    metadata = {}
    extra_top = []  # (key, value) pairs not in known top-level set
    extra_meta = []  # (key, value) pairs not in known meta set

    lines = frontmatter_str.split("\n")
    in_metadata = False
    i = 0
    while i < len(lines):
        line = lines[i]

        # Blank line
        if not line.strip():
            i += 1
            continue

        # Check if we're entering the metadata: block
        if line.rstrip() == "metadata:":
            in_metadata = True
            i += 1
            continue

        # If in metadata block, look for indented key: value pairs
        if in_metadata:
            # Un-indented line means we left the metadata block
            if line and not line.startswith(" ") and not line.startswith("\t"):
                in_metadata = False
                # Fall through to handle as top-level
            else:
                # Parse indented key: value
                stripped = line.strip()
                if ":" in stripped:
                    key, _, val = stripped.partition(":")
                    key = key.strip()
                    val = val.strip()
                    metadata[key] = val
                    if key not in META_KNOWN_ORDER:
                        extra_meta.append((key, val))
                i += 1
                continue

        # Top-level key: value
        if ":" in line and not line.startswith(" "):
            key, _, val = line.partition(":")
            key = key.strip()
            val = val.strip()
            top_level[key] = val
            if key not in TOP_LEVEL_ORDER:
                extra_top.append((key, val))

        i += 1

    return top_level, metadata, extra_top, extra_meta


# ---------------------------------------------------------------------------
# Trigger generation
# ---------------------------------------------------------------------------


def generate_triggers(folder_name: str, domain_prefix: str, description: str) -> str:
    """
    Generate a comma-separated triggers string from the folder name and description.

    Algorithm:
      1. Strip domain prefix from folder_name → remainder
      2. Split remainder by '-' → words
      3. Create phrase (space-joined) and hyphenated form
      4. Extract meaningful words from description (>4 chars, not stop words)
         — exclude words already in the phrase tokens
      5. Take up to 3 description keywords
      6. Return all joined by ", "
    """
    # Strip domain prefix
    if folder_name.startswith(domain_prefix):
        remainder = folder_name[len(domain_prefix) :]
    else:
        remainder = folder_name

    parts = remainder.split("-")
    phrase = " ".join(parts)  # "risk stop loss"
    hyphenated = remainder  # "risk-stop-loss" (already hyphenated)

    # Build set of tokens already covered
    covered = set(p.lower() for p in parts)

    # Extract meaningful words from description
    # Tokenise on non-alphanumeric boundaries, lowercase
    desc_tokens = re.findall(r"[a-zA-Z][a-zA-Z0-9\-]*", description)
    keywords = []
    for tok in desc_tokens:
        tok_lower = tok.lower()
        if (
            len(tok_lower) > 4
            and tok_lower not in STOP_WORDS
            and tok_lower not in covered
        ):
            keywords.append(tok_lower)
            covered.add(tok_lower)
        if len(keywords) >= 3:
            break

    parts_out = []
    if phrase:
        parts_out.append(phrase)
    # Only add hyphenated form if it differs from phrase (i.e. multi-word)
    if hyphenated != phrase and "-" in hyphenated:
        parts_out.append(hyphenated)
    parts_out.extend(keywords)

    return ", ".join(parts_out)


# ---------------------------------------------------------------------------
# Frontmatter serialisation
# ---------------------------------------------------------------------------


def quote_if_needed(value: str) -> str:
    """Return value, quoted with double-quotes if it contains special chars."""
    # Already quoted
    if value.startswith('"') and value.endswith('"'):
        return value
    if value.startswith("'") and value.endswith("'"):
        return value
    # Needs quoting? Only quote version-like strings to match spec
    return value


def serialise_frontmatter(
    top_level: dict,
    metadata: dict,
    extra_top: list,
    extra_meta: list,
) -> str:
    """
    Produce canonical frontmatter string (without --- delimiters).

    Field ordering:
      1. name
      2. description
      3. license
      4. compatibility
      5. (any extra top-level fields, excluding 'metadata')
      6. metadata block (version, domain, role, scope, output-format, triggers, extras)
    """
    lines = []

    # Known top-level fields in order
    for key in TOP_LEVEL_ORDER:
        if key in top_level:
            lines.append(f"{key}: {top_level[key]}")

    # Extra top-level fields (preserve existing unknown fields)
    # Avoid duplicating metadata key itself
    written_keys = set(TOP_LEVEL_ORDER) | {"metadata"}
    for key, val in extra_top:
        if key not in written_keys:
            lines.append(f"{key}: {val}")
            written_keys.add(key)

    # metadata block
    if metadata:
        lines.append("metadata:")
        for key in META_KNOWN_ORDER:
            if key in metadata:
                val = metadata[key]
                # version should be quoted
                if key == "version":
                    if not (val.startswith('"') or val.startswith("'")):
                        val = f'"{val}"'
                lines.append(f"  {key}: {val}")
        # extra meta fields not in known order
        written_meta_keys = set(META_KNOWN_ORDER)
        for key, val in extra_meta:
            if key not in written_meta_keys:
                lines.append(f"  {key}: {val}")
                written_meta_keys.add(key)

    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Core enrichment logic
# ---------------------------------------------------------------------------


def detect_domain(folder_name: str):
    """Return (domain, prefix) or (None, None) if unrecognised."""
    for prefix, domain in DOMAIN_PREFIXES.items():
        if folder_name.startswith(prefix):
            return domain, prefix
    return None, None


def enrich_skill(skill_path: str, folder_name: str) -> dict:
    """
    Read, enrich, and write a single SKILL.md.

    Returns a dict with keys indicating what was added (for summary stats).
    """
    changes = {
        "added_license": False,
        "added_compatibility": False,
        "added_meta_version": False,
        "added_meta_domain": False,
        "added_meta_role": False,
        "added_meta_scope": False,
        "added_meta_output_format": False,
        "added_meta_triggers": False,
        "skipped": False,
        "error": None,
        "already_complete": False,
    }

    # --- Read ---
    try:
        with open(skill_path, "r", encoding="utf-8") as f:
            content = f.read()
    except OSError as exc:
        changes["error"] = str(exc)
        return changes

    # --- Parse ---
    frontmatter_str, body = extract_frontmatter_and_body(content)
    if frontmatter_str is None:
        changes["error"] = "No valid frontmatter found"
        changes["skipped"] = True
        return changes

    top_level, metadata, extra_top, extra_meta = parse_frontmatter(frontmatter_str)

    domain, prefix = detect_domain(folder_name)
    if domain is None:
        # No recognised domain — skip enrichment but don't error
        changes["skipped"] = True
        return changes

    domain_defaults = DOMAIN_DEFAULTS[domain]

    # Track whether anything actually changes
    any_change = False

    # --- Top-level fields ---
    if "license" not in top_level:
        top_level["license"] = "MIT"
        changes["added_license"] = True
        any_change = True

    if "compatibility" not in top_level:
        top_level["compatibility"] = "opencode"
        changes["added_compatibility"] = True
        any_change = True

    # --- Metadata sub-fields ---
    if "version" not in metadata:
        metadata["version"] = "1.0.0"
        changes["added_meta_version"] = True
        any_change = True

    if "domain" not in metadata:
        metadata["domain"] = domain
        changes["added_meta_domain"] = True
        any_change = True

    if "role" not in metadata:
        metadata["role"] = domain_defaults["role"]
        changes["added_meta_role"] = True
        any_change = True

    if "scope" not in metadata:
        metadata["scope"] = domain_defaults["scope"]
        changes["added_meta_scope"] = True
        any_change = True

    if "output-format" not in metadata:
        metadata["output-format"] = domain_defaults["output-format"]
        changes["added_meta_output_format"] = True
        any_change = True

    if "triggers" not in metadata:
        description = top_level.get("description", "")
        metadata["triggers"] = generate_triggers(folder_name, prefix, description)
        changes["added_meta_triggers"] = True
        any_change = True

    if not any_change:
        changes["already_complete"] = True
        return changes

    # --- Serialise and write ---
    new_frontmatter = serialise_frontmatter(top_level, metadata, extra_top, extra_meta)
    new_content = f"---\n{new_frontmatter}\n---{body}"

    try:
        with open(skill_path, "w", encoding="utf-8") as f:
            f.write(new_content)
    except OSError as exc:
        changes["error"] = str(exc)

    return changes


# ---------------------------------------------------------------------------
# Directory walker
# ---------------------------------------------------------------------------

SKIP_DIRS = {"__pycache__", ".git"}


def find_skill_dirs(root: str):
    """Yield (folder_name, skill_path) for every SKILL.md under root."""
    for entry in sorted(os.listdir(root)):
        # Skip hidden dirs and known non-skill dirs
        if entry.startswith(".") or entry in SKIP_DIRS:
            continue
        dir_path = os.path.join(root, entry)
        if not os.path.isdir(dir_path):
            continue
        skill_path = os.path.join(dir_path, "SKILL.md")
        if os.path.isfile(skill_path):
            yield entry, skill_path


# ---------------------------------------------------------------------------
# Summary accumulator
# ---------------------------------------------------------------------------


class Summary:
    def __init__(self):
        self.total = 0
        self.already_complete = 0
        self.errors = 0
        self.skipped = 0
        self.added_license = 0
        self.added_compatibility = 0
        self.added_meta_version = 0
        self.added_meta_domain = 0
        self.added_meta_role = 0
        self.added_meta_scope = 0
        self.added_meta_output_format = 0
        self.added_meta_triggers = 0

    def record(self, changes: dict):
        self.total += 1
        if changes.get("error"):
            self.errors += 1
            return
        if changes.get("skipped"):
            self.skipped += 1
            return
        if changes.get("already_complete"):
            self.already_complete += 1
            return
        if changes.get("added_license"):
            self.added_license += 1
        if changes.get("added_compatibility"):
            self.added_compatibility += 1
        if changes.get("added_meta_version"):
            self.added_meta_version += 1
        if changes.get("added_meta_domain"):
            self.added_meta_domain += 1
        if changes.get("added_meta_role"):
            self.added_meta_role += 1
        if changes.get("added_meta_scope"):
            self.added_meta_scope += 1
        if changes.get("added_meta_output_format"):
            self.added_meta_output_format += 1
        if changes.get("added_meta_triggers"):
            self.added_meta_triggers += 1

    def print_summary(self, error_details: list):
        print(f"\nProcessed {self.total} skills")
        if self.added_license:
            print(f"  Added license:              {self.added_license} skills")
        if self.added_compatibility:
            print(f"  Added compatibility:        {self.added_compatibility} skills")
        if self.added_meta_version:
            print(f"  Added metadata.version:    {self.added_meta_version} skills")
        if self.added_meta_domain:
            print(f"  Added metadata.domain:     {self.added_meta_domain} skills")
        if self.added_meta_role:
            print(f"  Added metadata.role:       {self.added_meta_role} skills")
        if self.added_meta_scope:
            print(f"  Added metadata.scope:      {self.added_meta_scope} skills")
        if self.added_meta_output_format:
            print(
                f"  Added metadata.output-format: {self.added_meta_output_format} skills"
            )
        if self.added_meta_triggers:
            print(f"  Added metadata.triggers:   {self.added_meta_triggers} skills")
        print(f"Already complete: {self.already_complete} skills")
        if self.skipped:
            print(f"Skipped (no domain match):  {self.skipped} skills")
        print(f"Errors: {self.errors}")
        if error_details:
            print("\nError details:")
            for folder, msg in error_details:
                print(f"  {folder}: {msg}")


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------


def main():
    summary = Summary()
    error_details = []

    for folder_name, skill_path in find_skill_dirs(SKILLS_ROOT):
        changes = enrich_skill(skill_path, folder_name)
        summary.record(changes)
        if changes.get("error"):
            error_details.append((folder_name, changes["error"]))
            print(f"  WARNING: {folder_name} — {changes['error']}", file=sys.stderr)

    summary.print_summary(error_details)


if __name__ == "__main__":
    main()
