---
name: skill-architecture-design
description: Designs atomic AI agent skill architecture using granularity heuristics, monolith detection algorithms, and network topology patterns to produce modular, independently-testable skill sets that maximize router matching precision.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: agent
  triggers: skill architecture, atomic design, monolith detection, granularity heuristics, skill topology, skill network, modular skills, skill boundaries, skill decomposition, skill splitting, skill graph, related-skills, skill lifecycle, skill registry
  archetypes:
    - strategic
    - tactical
  anti_triggers:
    - brainstorming
    - vague ideation
    - single-agent monolith
  response_profile:
    verbosity: medium
    directive_strength: high
    abstraction_level: tactical
  role: orchestration
  scope: orchestration
  output-format: analysis
  content-types:
    - guidance
    - examples
    - do-dont
    - diagrams
  related-skills: skill-testing-methodology, trigger-engineering, skill-observability
---

# Skill Architecture Design

Architects atomic, independently-useful AI agent skills using granularity heuristics, monolith detection algorithms, and network topology patterns. When loaded, this skill makes the model act as a skill architect — analyzing existing skill collections for structural problems (monoliths, overlapping triggers, isolated islands), then designing new skill sets that follow atomic design principles with reciprocal relationship graphs and clear boundary definitions.

## TL;DR Checklist

- [ ] Verify each candidate skill covers exactly ONE coherent topic before writing content
- [ ] Run monolith detection: description lists 5+ distinct patterns? Core Content has 5+ independent sections?
- [ ] Enforce atomicity: every new skill must be independently useful when loaded alone
- [ ] Design reciprocal related-skills graph — if A lists B, B MUST list A
- [ ] Validate trigger coverage: each skill has 3–8 terms spanning technical AND conversational tiers
- [ ] Check granularity limits: implementation skills under 40KB, reference/orchestration under 25KB

---

## When to Use

Use this skill when:

- Designing a new domain of skills from scratch and needing an architecture plan before writing any SKILL.md files
- Auditing an existing skill collection for monoliths, overlapping triggers, or isolated skill islands
- Planning the split of a broad-scope skill into atomic sub-skills without breaking existing deployments
- Evaluating whether a proposed new skill description is too broad (5+ patterns) and needs splitting before implementation
- Building a skill network topology that maximizes cross-link discoverability while minimizing trigger overlap

---

## When NOT to Use

Avoid this skill for:

- Writing individual SKILL.md content — use `trigger-engineering` or `coding-code-review` instead; architecture design precedes writing, not replaces it
- Testing existing skills for trigger accuracy — use `skill-testing-methodology` for quantitative validation
- Runtime debugging of agent behavior that is unrelated to skill structure — use `agent-runtime-log-analyzer` for behavioral diagnostics
- One-off reviews where the structural overhead of full architecture analysis exceeds the value of incremental improvements

---

## Core Workflow

1. **Inventory Existing Skills** — Scan the target domain directory and extract all SKILL.md metadata: name, description, triggers, role, scope, output-format, related-skills. Build a structured index (JSON or Python dict) for algorithmic analysis.
   **Checkpoint:** Confirm every skill directory contains a parseable SKILL.md with valid YAML frontmatter. Flag any missing or unparseable files for remediation.

2. **Run Monolith Detection Algorithm** — Apply the three-monolith-heuristic test to every skill in scope: (a) count distinct patterns listed in the description using comma/parenthesis splitting; (b) count independent "Pattern N:" sections in Core Content; (c) check if file exceeds 15KB AND has broad description. Classify each as MONOLITH (needs split), CANDIDATE (monitor), or ATOMIC (healthy).
   **Checkpoint:** Every skill classified with a severity level (HIGH, LOW, MONOLITH) and specific reason. Skills scoring HIGH or MONOLITH must have a proposed decomposition plan.

3. **Detect Trigger Overlap** — For each pair of related skills, compare trigger sets to identify overlap percentage. Flag pairs where more than 30% of triggers are shared (indicating boundary confusion). Also check for near-duplicate descriptions that could confuse the router's semantic matcher.
   **Checkpoint:** No related-skill pair shares more than 30% of triggers. If overlap exceeds threshold, recommend which skill should absorb or shed specific triggers.

4. **Analyze Skill Network Topology** — Build a directed graph from related-skills relationships. Identify: (a) isolated islands — skills with fewer than 2 incoming/outgoing links; (b) hub-and-spoke patterns where one skill has more than 5 outgoing edges (likely a monolith); (c) missing reciprocal links where A lists B but B does not list A.
   **Checkpoint:** Every skill has at least 2 reciprocal connections. No single skill has more than 4 related-skills entries. All islands are merged or deprecated.

5. **Design Decomposition Plan (if monoliths found)** — For each detected monolith, propose a split using one of four strategies: Topic Decomposition (split by sub-topic), Category Split (split by category family), Depth Layering (separate implementation from reference), Domain Narrowing (split by primary context). Define new atomic skills with their own descriptions, trigger sets, and reciprocal relationships.
   **Checkpoint:** Each proposed sub-skill has a description listing at most 3 related aspects. Each has its own 5–8 trigger set derived from the sub-skill's specific domain terms (not inherited from parent). All siblings list each other in related-skills.

6. **Validate Architecture Against Granularity Rules** — Run the final architecture audit: confirm no skill description exceeds the "Implements X, Y, Z" threshold of 5+ patterns, verify all atomic skills are independently useful when loaded alone, check that trigger sets follow the two-tier strategy (technical + conversational), and ensure file size stays within domain-appropriate limits.
   **Checkpoint:** All quality gates pass. If any gate fails, revise the decomposition plan before committing.

---

## Architecture Patterns

### Pattern 1: Monolith Detection Algorithm

This function implements the three-heuristic monolith detection system defined in `SKILL_FORMAT_SPEC.md` section 5. It classifies skills as ATOMIC (healthy), CANDIDATE (monitor), or MONOLITH (needs split) based on description breadth, section count, and file size.

```python
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Any


class MonolithSeverity(Enum):
    """Classification severity for detected monoliths."""
    ATOMIC = "atomic"         # Healthy — no action needed
    CANDIDATE = "candidate"   # Monitor — minor concerns but OK for now
    MONOLITH = "monolith"     # Plan split in next cycle
    CRITICAL_MONOLITH = "critical_monolith"  # Split immediately


@dataclass
class MonolithReport:
    """Detailed report of monolith analysis for a single skill."""
    skill_name: str
    file_path: Path
    severity: MonolithSeverity
    reasons: list[str] = field(default_factory=list)
    proposed_actions: list[str] = field(default_factory=list)

    @property
    def needs_action(self) -> bool:
        """Return True if this skill requires intervention."""
        return self.severity in (MonolithSeverity.MONOLITH, MonolithSeverity.CRITICAL_MONOLITH)

    def summary(self) -> str:
        """Human-readable one-line summary for reporting."""
        status = "ACTION REQUIRED" if self.needs_action else "OK"
        return f"[{status}] {self.skill_name}: {', '.join(self.reasons)}"


def detect_monoliths(skill_dir_path: Path) -> MonolithReport:
    """Detect monolith problems in a skill using three heuristics.

    Heuristic 1 (Description breadth): Counts distinct patterns listed
    in the YAML frontmatter description. Splits on commas, parentheses,
    and 'and' conjunctions to identify independent concepts.

    Heuristic 2 (Section count): Counts independent "Pattern N:" or similarly
    headed sections in the Core Content. Each represents a standalone topic.

    Heuristic 3 (Size + breadth combo): Flags skills that combine broad
    scope (5+ patterns) with large file size (>15KB), indicating duplicated
    material across multiple topics.

    Args:
        skill_dir_path: Path to the skill's directory (contains SKILL.md).

    Returns:
        MonolithReport with severity classification and actionable findings.

    Raises:
        FileNotFoundError: If SKILL.md does not exist in the given path.
    """
    if not skill_dir_path.exists():
        raise FileNotFoundError(f"Skill directory not found: {skill_dir_path}")

    skill_md = skill_dir_path / "SKILL.md"
    content = skill_md.read_text(encoding="utf-8")

    # Parse frontmatter to extract description and metadata
    fm_match = _extract_frontmatter(content)
    if not fm_match:
        return MonolithReport(
            skill_name=skill_dir_path.name,
            file_path=skill_md,
            severity=MonolithSeverity.CRITICAL_MONOLITH,
            reasons=["Unparseable YAML frontmatter — cannot analyze"],
            proposed_actions=["Fix YAML frontmatter before architecture review"],
        )

    description = fm_match.get("description", "")

    # Heuristic 1: Count distinct patterns in description
    pattern_count = _count_description_patterns(description)

    # Heuristic 2: Count independent pattern sections in body
    body_content = content[content.find("---", content.find("---") + 3) + 3:]
    section_count = _count_independent_sections(body_content)

    # Heuristic 3: File size combined with breadth
    file_size_bytes = len(content.encode("utf-8"))

    reasons: list[str] = []
    proposed_actions: list[str] = []

    if pattern_count >= 5:
        reasons.append(f"description lists {pattern_count} distinct patterns")
        proposed_actions.append(
            f"Split description into <=3 aspects or split into multiple skills. "
            f"Current patterns: {_extract_pattern_names(description)}"
        )

    if section_count >= 5:
        reasons.append(f"Core Content has {section_count} independent pattern sections")
        proposed_actions.append(
            f"Evaluate which sections could become standalone skills. "
            f"Each new skill needs its own trigger set and related-skills."
        )

    if pattern_count >= 5 and file_size_bytes > 15_000:
        reasons.append("broad scope combined with large file size (over 15KB)")
        proposed_actions.append(
            "HIGH PRIORITY: Split this monolith. Create atomic sub-skills first, "
            "then update the parent's related-skills to point to children."
        )

    # Determine severity
    if not reasons:
        severity = MonolithSeverity.ATOMIC
    elif (pattern_count >= 3 and section_count >= 4) or file_size_bytes > 15_000:
        severity = MonolithSeverity.MONOLITH
    elif pattern_count >= 10:
        severity = MonolithSeverity.CRITICAL_MONOLITH
    else:
        severity = MonolithSeverity.CANDIDATE

    return MonolithReport(
        skill_name=skill_dir_path.name,
        file_path=skill_md,
        severity=severity,
        reasons=reasons,
        proposed_actions=proposed_actions,
    )


def _extract_frontmatter(content: str) -> dict[str, Any] | None:
    """Parse YAML frontmatter from SKILL.md content."""
    if not content.startswith("---\\n"):
        return None

    end_marker = content.find("---\\n", 4)
    if end_marker == -1:
        return None

    yaml_block = content[4:end_marker].strip()
    try:
        import yaml
        return yaml.safe_load(yaml_block) or {}
    except Exception:
        return None


def _count_description_patterns(description: str) -> int:
    """Count distinct patterns/concepts in a skill description.

    Splits on commas, parentheses content, and 'and' conjunctions to
    identify independent topics. Filters out generic filler words.
    """
    import re

    # Extract items from parentheses first (e.g., "(x, y, z)")
    paren_items = re.findall(r"\\(([^)]+)\\)", description)
    parts = list(paren_items)

    # Split remaining text on commas and 'and'
    cleaned = description
    for parens in paren_items:
        cleaned = cleaned.replace(f"({parens})", "")
    for delimiter in [",", "\\band\\b"]:
        parts.extend(re.split(delimiter, cleaned))

    # Filter: keep only parts with meaningful content (2+ characters)
    meaningful = [p.strip() for p in parts if len(p.strip()) >= 2]
    return max(len(meaningful), 1)


def _count_independent_sections(body_content: str) -> int:
    """Count independent pattern sections in Core Content.

    Matches patterns like '### Pattern N:', '## Topic Name' where the
    section has its own implementation code block following it.
    """
    import re

    # Count "Pattern N:" style headings
    pattern_headings = re.findall(r"###\\s+Pattern\\s+\\d+[.:]", body_content)

    # Count top-level implementation sections that have code blocks
    section_code_pairs = len(re.findall(
        r"##\\s+[^#\\n]+?\\n.*?```", body_content, re.DOTALL
    ))

    # Return the more relevant count (pattern headings are the primary indicator)
    return max(len(pattern_headings), 1)


def _extract_pattern_names(description: str) -> list[str]:
    """Extract individual pattern names from a description for reporting."""
    import re
    paren_items = re.findall(r"\\(([^)]+)\\)", description)
    if paren_items:
        items = []
        for item in paren_items[0].split(","):
            cleaned = item.strip().strip(")").strip()
            if len(cleaned) >= 2:
                items.append(cleaned)
        return items[:8]  # Cap at 8 for readability
    return [description[:100]]


# --- Batch analysis utility ---

def analyze_domain_directory(domain_path: Path) -> list[MonolithReport]:
    """Run monolith detection across all skills in a domain directory.

    Args:
        domain_path: Path to a domain directory (e.g., skills/trading/).

    Returns:
        List of MonolithReports sorted by severity (CRITICAL first).
    """
    if not domain_path.exists():
        return []

    reports = []
    for skill_dir in sorted(domain_path.iterdir()):
        if not skill_dir.is_dir():
            continue
        report = detect_monoliths(skill_dir)
        reports.append(report)

    # Sort by severity: CRITICAL_MONOLITH > MONOLITH > CANDIDATE > ATOMIC
    severity_order = {
        MonolithSeverity.CRITICAL_MONOLITH: 0,
        MonolithSeverity.MONOLITH: 1,
        MonolithSeverity.CANDIDATE: 2,
        MonolithSeverity.ATOMIC: 3,
    }
    reports.sort(key=lambda r: severity_order.get(r.severity, 99))
    return reports


# --- Example usage ---
# domain = Path("skills/trading/")
# reports = analyze_domain_directory(domain)
# for report in reports:
#     print(report.summary())
#     if report.needs_action:
#         for action in report.proposed_actions:
#             print(f"  -> {action}")
```

### Pattern 2: Network Topology Analyzer

Builds and analyzes the related-skills graph to detect structural problems like isolated islands, hub-and-spoke imbalances, and missing reciprocal links.

```python
from dataclasses import dataclass, field
from collections import defaultdict


@dataclass
class NetworkTopologyReport:
    """Analysis of a skill network's structural health."""
    total_skills: int = 0
    isolated_islands: list[str] = field(default_factory=list)
    hub_imbalances: list[tuple[str, int]] = field(default_factory=list)
    missing_reciprocals: list[tuple[str, str]] = field(default_factory=list)

    @property
    def health_score(self) -> float:
        """Calculate overall network health from 0.0 (broken) to 1.0 (healthy)."""
        score = 1.0

        # Reciprocity penalty: count missing reciprocals
        if self.missing_reciprocals:
            reciprocity_ratio = max(0, 1.0 - (len(self.missing_reciprocals) * 0.15))
            score *= reciprocity_ratio

        # Isolation penalty
        isolation_penalty = min(len(self.isolated_islands) * 0.15, 0.45)
        score -= isolation_penalty

        # Hub imbalance penalty
        hub_penalty = min(len(self.hub_imbalances) * 0.1, 0.3)
        score -= hub_penalty

        return round(max(0.0, min(score, 1.0)), 2)


def analyze_skill_network(skill_index: list[dict]) -> NetworkTopologyReport:
    """Analyze the related-skills graph structure for systemic problems.

    A skill index is a list of dicts with 'name' and 'related_skills' keys
    (where related_skills is a comma-separated string or list).

    Detects three classes of problems:
      1. Isolated islands: skills with fewer than 2 incoming/outgoing links
      2. Hub imbalances: single skill with more than 4 outgoing connections
         (suggests the skill is acting as a catalog/monolith)
      3. Missing reciprocals: when A lists B but B does not list A

    Args:
        skill_index: List of skill metadata dicts with 'name' and 'related_skills'.

    Returns:
        NetworkTopologyReport with structural health assessment.
    """
    # Build adjacency map: name -> set of related skill names
    graph: dict[str, set[str]] = defaultdict(set)
    all_names: set[str] = set()

    for entry in skill_index:
        name = entry.get("name", "")
        if not name:
            continue
        all_names.add(name)
        related_raw = entry.get("related_skills", [])
        if isinstance(related_raw, str):
            related = {r.strip() for r in related_raw.split(",") if r.strip()}
        else:
            related = set(related_raw)

        graph[name] |= related
        all_names |= related

    # Detect missing reciprocals
    missing_reciprocals: list[tuple[str, str]] = []
    for skill_name, related_set in graph.items():
        for target in related_set:
            if target not in graph or skill_name not in graph.get(target, set()):
                missing_reciprocals.append((skill_name, target))

    # Detect hub imbalances (skills with more than 4 outgoing edges)
    hub_imbalances: list[tuple[str, int]] = []
    for skill_name, related_set in graph.items():
        if len(related_set) > 4:
            hub_imbalances.append((skill_name, len(related_set)))

    # Detect isolated islands (skills with fewer than 2 connections total)
    connection_count: dict[str, int] = defaultdict(int)
    for skill_name in graph:
        out_degree = len(graph.get(skill_name, set()))
        in_degree = sum(1 for src, targets in graph.items() if skill_name in targets)
        connection_count[skill_name] = out_degree + in_degree

    isolated_islands = [
        name for name, count in connection_count.items() if count < 2 and name in all_names
    ]

    return NetworkTopologyReport(
        total_skills=len(all_names),
        isolated_islands=sorted(isolated_islands),
        hub_imbalances=sorted(hub_imbalances, key=lambda x: -x[1]),
        missing_reciprocals=missing_reciprocals,
    )


def build_skill_index_from_files(skills_root: Path) -> list[dict]:
    """Build a skill index by scanning SKILL.md files on disk.

    Reads each SKILL.md's frontmatter and extracts name + related-skills
    for graph analysis. Handles both YAML array and comma-separated formats.

    Args:
        skills_root: Path to the root skills/ directory.

    Returns:
        List of dicts with 'name' and 'related_skills' fields.
    """
    import yaml

    index: list[dict] = []
    for domain_dir in sorted(skills_root.iterdir()):
        if not domain_dir.is_dir():
            continue
        for skill_dir in sorted(domain_dir.iterdir()):
            skill_md = skill_dir / "SKILL.md"
            if not skill_md.exists():
                continue

            content = skill_md.read_text(encoding="utf-8")
            fm_match = _extract_frontmatter(content)
            if not fm_match:
                continue

            name = fm_match.get("name", skill_dir.name)
            metadata = fm_match.get("metadata", {}) or {}
            related_skills = metadata.get("related-skills", "")

            index.append({
                "name": name,
                "domain": domain_dir.name,
                "file_path": str(skill_md),
                "related_skills": related_skills,
            })

    return index


# --- Example usage ---
# index = build_skill_index_from_files(Path("skills/"))
# report = analyze_skill_network(index)
# print(f"Network health: {report.health_score}")
# if report.missing_reciprocals:
#     print("Missing reciprocal links:")
#     for a, b in report.missing_reciprocals[:5]:
#         print(f"  {a} -> {b} (but {b} does not list {a})")
```

---

## BAD vs GOOD Example: Skill Scope Management

```python
# ❌ BAD — Monolithic description listing 7 distinct patterns
description: "Implements stop loss, trailing stop, ATR-based stops, risk position sizing, kill switches, drawdown control, and portfolio rebalancing for trading systems."
# This single skill covers 7 topics across risk management — it is a monolith.

# ✅ GOOD — Atomic skill with focused scope (one pattern family)
description: "Implements stop-loss strategies (fixed percentage, ATR-based, trailing, support/resistance) to limit position losses in algorithmic trading systems."
# This covers one coherent concept: where to exit positions. Other risks belong elsewhere.


# ❌ BAD — Description with 5+ patterns AND large file size
description: "Designs complete CI/CD pipelines including build orchestration, test automation, security scanning, container registry management, deployment strategies, monitoring integration, and rollback procedures."
# 7 patterns in description + likely over 30KB = CRITICAL monolith

# ✅ GOOD — Split into atomic skills with reciprocal related-skills
# Skill A: "Implements CI build pipeline orchestration with artifact management and cache optimization"
# Skill B: "Implements automated test execution strategies with parallelization and result reporting"
# Skill C: "Implements container image security scanning with CVE detection and compliance gate policies"
```

---

## Constraints

### MUST DO
- Design each skill to cover exactly ONE coherent topic that stands alone when loaded independently
- Enforce the "Implements X, Y, Z" heuristic: if a description lists 5+ distinct patterns, split before writing content
- Build reciprocal related-skills relationships — if A lists B, B must list A (enforced by zero-tolerance policy)
- Classify every existing skill using the three-heuristic monolith detection system before proposing any changes
- Ensure no single skill has more than 4 related-skills entries; excess connections signal a need for sub-skills
- Design trigger sets independently for each proposed sub-skill — do not inherit parent triggers

### MUST NOT DO
- Create skills that require loading another skill to make sense — fragments are not valid sub-skills
- Keep monolithic skills intact as "catalogs" without creating atomic child skills first — the zero-tolerance policy applies
- List unrelated topics in a single skill's description even if they are all tangentially about the same domain
- Create hub-and-spoke patterns where one skill has 5+ related-skill entries (this is itself a monolith pattern)
- Design network topology that creates isolated islands — every skill must have at least 2 reciprocal connections

---

## Output Template

When applying this skill, produce outputs following this structure:

1. **Monolith Detection Report** — Per-skill classification with severity level, specific reasons, and proposed actions for each flagged skill
2. **Trigger Overlap Matrix** — Pairwise overlap percentages between related-skill pairs, highlighting pairs exceeding the 30% threshold
3. **Network Topology Analysis** — Graph health score (0–1), list of isolated islands, hub imbalances, and missing reciprocal links
4. **Decomposition Plan** — For each monolith: proposed atomic sub-skills with new descriptions, trigger sets, reciprocal relationships, and split strategy category
5. **Implementation Order Recommendation** — Prioritized list of actions (create children first → update parent related-skills → deprecate or convert parent to catalog)

---

## Related Skills

| Skill | Purpose |
|---|---|
| `trigger-engineering` | Designs trigger sets for new skills; architecture design defines the structure, trigger engineering populates the metadata |
| `skill-testing-methodology` | Validates structural decisions through quantitative testing after implementation |
| `skill-observability` | Monitors deployed skill usage patterns to inform future architecture improvements |

---

## Appendix: Split Strategy Decision Matrix

When decomposing a monolith, use this decision matrix to select the appropriate split strategy:

| Monolith Characteristics | Recommended Strategy | Example |
|---|---|---|
| Covers N distinct sub-topics with independent implementations | **Topic Decomposition** | Circuit breakers + retries + bulkheads → 3 separate skills |
| Patterns from multiple conceptual families | **Category Split** | GoF creational + structural + behavioral → 3 skill categories |
| Combines implementation details with architectural principles | **Depth Layering** | Security engineering (threat modeling) + OWASP prevention + pipeline integration |
| Applies same pattern across multiple contexts/markets | **Domain Narrowing** | Kill switches: account-level + strategy-level + market-level + infrastructure-level |

**Decision rule:** If the monolith's sections are functionally independent (each can stand alone with its own tests), use Topic Decomposition. If they share a common abstraction layer, use Category Split.

## Live References

> Authoritative documentation links for this domain. The model follows markdown links at load time to resolve external references and inline content.

- [Atomic Design by Brad Frost](https://atomicdesign.bradfrost.com/chapter-2/) — Foundational methodology for designing granular, composable design systems
- [Modular Architecture Patterns (Martin Fowler)](https://martinfowler.com/articles/modular.html) — Fowler's analysis of modularity patterns and their tradeoffs in software architecture
- [Microkernel Architecture Pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/microkernel) — Microsoft Azure Architecture Center documentation on microkernel design for extensible systems
- [Component-Based Software Engineering](https://dl.acm.org/doi/book/10.5555/317464) — ACM reference on component granularity and interface design principles
- [Domain-Driven Design: Bounded Contexts (Eric Evans)](https://martinfowler.com/bliki/DomainDrivenDesign.html) — DDD patterns for defining clear boundaries between modular skill domains
