---
name: framework-sourcing-strategy
description: Discovers and pre-screens software frameworks using ecosystem health analysis, changelog-driven requirement extraction, compatibility matrix evaluation, and AI-assisted signal scoring to shortlist candidates before formal selection.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: framework discovery, ecosystem health, framework sourcing, compatibility matrix, changelog analysis, framework shortlist, dependency risk assessment, OSS maturity signals
  archetypes:
    - tactical
    - strategic
  anti_triggers:
    - brainstorming
    - vague ideation
    - over-engineering
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, examples, do-dont]
  related-skills: framework-requirements, framework-adoption-strategy, cve-dependency-management, software-maintainability
---

# Framework Sourcing Strategy

Discovers and pre-screens software frameworks using ecosystem health analysis, changelog-driven requirement extraction, compatibility matrix evaluation, and AI-assisted signal scoring. When loaded, this skill makes the model act as a senior platform engineer who systematically evaluates candidate frameworks before any formal selection decision — ensuring only viable, well-supported options advance to proof-of-concept.

## TL;DR Checklist

- [ ] Run ecosystem health scan: GitHub stats (stars, forks, issues), commit frequency, release cadence, contributor diversity
- [ ] Parse changelog for the last 12 months — flag breaking changes, deprecation notices, and security advisories
- [ ] Build a compatibility matrix mapping framework constraints against project requirements (language version, runtime, deployment target)
- [ ] Score AI-assisted signals: documentation quality, community activity, vendor lock-in risk, license compatibility
- [ ] Produce a ranked shortlist with evidence-backed scores — no gut-feel rankings
- [ ] Document exclusion rationale for every framework that failed the pre-screen

---

## When to Use

Use this skill when:

- Starting a greenfield project where multiple frameworks are on the table (e.g., choosing between FastAPI, Flask, Django REST, or NestJS)
- Evaluating whether an existing dependency has become a maintenance risk based on ecosystem signals
- Conducting a technology refresh cycle where you must compare 3+ framework candidates against shared criteria
- Onboarding to a new language ecosystem and need a structured way to surface the dominant frameworks
- A stakeholder proposes adopting a framework without evidence of its production viability

---

## When NOT to Use

Avoid this skill for:

- Deep evaluation of a single already-selected framework — use `framework-application-methodology` instead
- Post-selection adoption planning with migration phases — use `framework-adoption-strategy` instead
- Runtime performance profiling of an integrated framework — use `framework-performance-tuning` instead
- Security vulnerability scanning of installed dependencies — use `cve-dependency-management` instead

---

## Core Workflow

### 1. Ecosystem Health Scan

Fetch quantitative health metrics from the framework's public repository and distribution channels. Calculate a composite health score from five weighted signals: commit velocity, contributor diversity, issue resolution rate, release cadence consistency, and dependency graph size.

```python
from dataclasses import dataclass, field
from datetime import datetime, timedelta


@dataclass(frozen=True)
class EcosystemMetric:
    """A single quantitative metric from a framework's ecosystem."""
    name: str
    value: float
    weight: float  # 0.0–1.0, weights across all metrics must sum to 1.0
    unit: str = ""

    @property
    def weighted_score(self) -> float:
        return self.value * self.weight


@dataclass(frozen=True)
class EcosystemHealthScore:
    """Composite health score for a framework's ecosystem."""
    framework_name: str
    metrics: list[EcosystemMetric] = field(default_factory=list)
    composite_score: float = 0.0
    assessment_date: datetime = field(default_factory=datetime.now)

    def add_metric(self, name: str, value: float, weight: float, unit: str = "") -> None:
        """Add a weighted metric and recompute the composite score."""
        self.metrics.append(EcosystemMetric(name=name, value=value, weight=weight, unit=unit))
        self.composite_score = sum(m.weighted_score for m in self.metrics)

    def grade(self) -> str:
        """Return a letter grade based on composite score."""
        if self.composite_score >= 0.85:
            return "A"
        elif self.composite_score >= 0.70:
            return "B"
        elif self.composite_score >= 0.50:
            return "C"
        elif self.composite_score >= 0.30:
            return "D"
        return "F"


def compute_ecosystem_health(
    repo_stars: int,
    fork_count: int,
    commits_last_90d: int,
    active_contributors_last_90d: int,
    issues_open: int,
    issues_closed_last_180d: int,
    release_count_last_year: int,
    total_dependencies: int,
) -> EcosystemHealthScore:
    """Compute an ecosystem health score from GitHub and PyPI/npm signals.

    Args:
        repo_stars: Total repository star count.
        fork_count: Total fork count.
        commits_last_90d: Commits in the last 90 days.
        active_contributors_last_90d: Unique authors with commits in 90-day window.
        issues_open: Currently open, unresolved issues.
        issues_closed_last_180d: Closed issues in the last 180 days (activity proxy).
        release_count_last_year: Published releases in the last 365 days.
        total_dependencies: Total transitive dependency count.

    Returns:
        EcosystemHealthScore with composite score and component breakdown.
    """
    health = EcosystemHealthScore(framework_name="unknown")

    # Normalize each signal to a 0.0–1.0 scale
    star_score = min(repo_stars / 50000, 1.0)          # 50k stars → max
    fork_score = min(fork_count / (repo_stars * 0.3 + 1), 1.0) if repo_stars > 0 else 0
    commit_velocity = min(commits_last_90d / 120, 1.0)  # 120 commits/90d → active
    contributor_diversity = min(active_contributors_last_90d / 30, 1.0)  # 30 contributors → healthy
    issue_resolution = issues_closed_last_180d / max(issues_open + 1, 1)
    release_cadence = min(release_count_last_year / 12, 1.0)  # monthly releases → stable
    dep_risk = 1.0 - min(total_dependencies / 500, 0.8)  # fewer deps = lower risk

    health.add_metric("github_stars", star_score, 0.10, "stars")
    health.add_metric("fork_ratio", fork_score, 0.10, "forks/stars")
    health.add_metric("commit_velocity", commit_velocity, 0.25, "commits/90d")
    health.add_metric("contributor_diversity", contributor_diversity, 0.15, "contributors")
    health.add_metric("issue_resolution_ratio", min(issue_resolution, 1.0), 0.15, "closed/open")
    health.add_metric("release_cadence", release_cadence, 0.10, "releases/year")
    health.add_metric("dependency_risk", dep_risk, 0.15, "deps (inverted)")

    return health


# Usage example:
# health = compute_ecosystem_health(
#     repo_stars=32000, fork_count=4200, commits_last_90d=87,
#     active_contributors_last_90d=28, issues_open=156,
#     issues_closed_last_180d=430, release_count_last_year=14,
#     total_dependencies=42
# )
# print(f"{health.framework_name}: {health.grade()} ({health.composite_score:.2f})")
```

**Checkpoint:** Composite score must be above 0.50 (grade C or better) for the framework to advance. Below C, document specific health deficits before considering exclusion.

### 2. Changelog-Driven Requirement Extraction

Parse the framework's changelog (or release notes) from the last 12 months to extract: breaking changes, deprecation warnings, new capability additions, and security fixes. Map each item to a requirement category (functional, non-functional, operational). This reveals whether the framework evolves in alignment with your project's trajectory or introduces destabilizing churn.

```python
import re
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional


class ChangelogCategory(Enum):
    BREAKING = "breaking"
    DEPRECATION = "deprecation"
    FEATURE = "feature"
    FIX = "fix"
    SECURITY = "security"
    DOCS = "docs"
    PERF = "performance"


@dataclass(frozen=True)
class ChangelogSignal:
    """A single parsed signal from framework release notes."""
    version: str
    category: ChangelogCategory
    description: str
    line_number: int = 0
    severity: str = "info"  # info, warning, critical

    @property
    def is_critical(self) -> bool:
        return self.category in (ChangelogCategory.BREAKING, ChangelogCategory.SECURITY)


def parse_changelog_signals(
    changelog_text: str,
    version_pattern: str = r"^###?\s+v?(\d+\.\d+(?:\.\d+)?)",
) -> list[ChangelogSignal]:
    """Parse a CHANGELOG.md or release notes text into structured signals.

    Extracts version-tagged entries and categorizes them by semantic meaning.
    Recognizes conventional commit-style prefixes in entry descriptions.

    Args:
        changelog_text: Raw changelog content (markdown or plain text).
        version_pattern: Regex to match version headers (### v1.2.3 or ## 1.2.0).

    Returns:
        Ordered list of ChangelogSignal entries from newest to oldest.
    """
    signals: list[ChangelogSignal] = []

    # Split into version blocks
    version_blocks: list[tuple[str, str]] = []
    current_version: Optional[str] = None
    current_lines: list[str] = []

    for line_num, line in enumerate(changelog_text.splitlines(), 1):
        vm = re.match(version_pattern, line.strip())
        if vm:
            if current_version and current_lines:
                version_blocks.append((current_version, "\n".join(current_lines)))
            current_version = vm.group(1)
            current_lines = []
        elif current_version is not None:
            current_lines.append(line)

    if current_version and current_lines:
        version_blocks.append((current_version, "\n".join(current_lines)))

    # Categorize each line within each version block
    breaking_indicators = re.compile(
        r"(breaking|BREAKING|BREAK CHANGE|[Ff]orcing|[Mm]ajor|[Dd]eprecat)",
        re.IGNORECASE,
    )
    security_indicators = re.compile(
        r"(CVE-?\d{4}-\d{4,}|security|vulnerability|advisory|exploit|injection|\brce\b)",
        re.IGNORECASE,
    )
    feature_indicators = re.compile(
        r"(feat|feature|new|add|support|enable|introduc)",
        re.IGNORECASE,
    )
    fix_indicators = re.compile(
        r"(fix|patch|resolve|repair|correct|bypass|workaround)",
        re.IGNORECASE,
    )

    for version, block_text in version_blocks:
        for entry_line_num, line in enumerate(block_text.splitlines(), 1):
            stripped = line.strip().lstrip("-* ")
            if not stripped or stripped.startswith("#"):
                continue

            # Classify the entry
            if breaking_indicators.search(stripped):
                category = ChangelogCategory.BREAKING
                severity = "critical"
            elif security_indicators.search(stripped):
                category = ChangelogCategory.SECURITY
                severity = "warning"
            elif feature_indicators.search(stripped):
                category = ChangelogCategory.FEATURE
                severity = "info"
            elif fix_indicators.search(stripped):
                category = ChangelogCategory.FIX
                severity = "info"
            else:
                category = ChangelogCategory.FEATURE
                severity = "info"

            signals.append(ChangelogSignal(
                version=version,
                category=category,
                description=stripped[:200],
                line_number=entry_line_num,
                severity=severity,
            ))

    return signals


def summarize_changelog_health(signals: list[ChangelogSignal]) -> dict[str, int]:
    """Produce a summary of changelog health from parsed signals.

    Returns counts per category and flags high-risk patterns:
    - More than 5 breaking changes in 12 months suggests API instability
    - Any unpatched security signal requires manual review
    """
    summary: dict[str, int] = {cat.value: 0 for cat in ChangelogCategory}

    for sig in signals:
        if sig.category in summary:
            summary[sig.category] += 1

    return summary


# Usage example:
# with open("CHANGELOG.md", "r") as f:
#     signals = parse_changelog_signals(f.read())
#     summary = summarize_changelog_health(signals)
#     if summary["breaking"] > 5:
#         print("WARNING: High breaking-change rate — API may be unstable")
#     if summary["security"] > 0:
#         print("REVIEW: Security fixes detected — verify CVE remediation status")
```

**Checkpoint:** If the changelog shows more than 5 breaking changes or any unresolved security advisories in the last 12 months, flag the framework as "volatile" and require manual review before advancing.

### 3. Compatibility Matrix Construction

Build a typed compatibility matrix that maps each candidate framework against your project's hard constraints (language version, runtime, deployment target, licensing). Use a scoring system where failing any must-have constraint is an immediate disqualification.

```python
from dataclasses import dataclass, field
from enum import Enum


class ConstraintType(Enum):
    MUST_HAVE = "must_have"       # Binary: pass/fail — fails framework
    SHOULD_HAVE = "should_have"  # Weighted: contributes to compatibility score
    NICE_TO_HAVE = "nice_to_have"  # Bonus: improves score but doesn't disqualify


@dataclass(frozen=True)
class Constraint:
    """A single project requirement against which frameworks are scored."""
    name: str
    constraint_type: ConstraintType
    expected_value: str
    weight: float = 1.0

    def evaluate(self, framework_value: str) -> tuple[bool, float]:
        """Evaluate a framework's compliance with this constraint.

        Returns:
            (passed, score_contribution). For MUST_HAVE constraints, score is 0.0 or 1.0.
        """
        if self.constraint_type == ConstraintType.MUST_HAVE:
            passed = framework_value.strip().lower() == self.expected_value.strip().lower()
            return (passed, 1.0 if passed else 0.0)
        elif self.constraint_type == ConstraintType.SHOULD_HAVE:
            # Partial match earns proportional score
            passed = framework_value.strip().lower() == self.expected_value.strip().lower()
            return (passed, 0.5 if passed else 0.2)
        else:  # NICE_TO_HAVE
            passed = framework_value.strip().lower() == self.expected_value.strip().lower()
            return (passed, 0.3 if passed else 0.05)


@dataclass(frozen=True)
class CompatibilityRecord:
    """Compatibility evaluation for one framework against project constraints."""
    framework_name: str
    constraints: list[Constraint] = field(default_factory=list)
    constraint_values: dict[str, str] = field(default_factory=dict)
    must_pass_all: bool = True

    def evaluate(self) -> tuple[bool, float]:
        """Evaluate this framework against all constraints.

        Returns:
            (compatible, score). Score is 0.0–1.0 weighted average of passed constraints.
        """
        if not self.constraints:
            return (True, 1.0)

        total_weight = 0.0
        weighted_score = 0.0
        failed_musts: list[str] = []

        for constraint in self.constraints:
            value = self.constraint_values.get(constraint.name, "unknown")
            passed, score = constraint.evaluate(value)
            weighted_score += score * constraint.weight
            total_weight += constraint.weight

            if not passed and constraint.constraint_type == ConstraintType.MUST_HAVE:
                failed_musts.append(constraint.name)

        final_score = weighted_score / total_weight if total_weight > 0 else 0.0
        compatible = len(failed_musts) == 0 or not self.must_pass_all

        return (compatible, round(final_score, 3)), failed_musts


def build_compatibility_matrix(
    frameworks: list[str],
    constraints: list[Constraint],
    framework_values: dict[str, dict[str, str]],
) -> list[CompatibilityRecord]:
    """Build a full compatibility matrix for multiple frameworks.

    Args:
        frameworks: Names of candidate frameworks to evaluate.
        constraints: List of project constraints with types and expected values.
        framework_values: Mapping of framework_name → {constraint_name → actual_value}.

    Returns:
        CompatibilityRecord for each framework, ordered by compatibility score descending.
    """
    records: list[CompatibilityRecord] = []

    for fw in frameworks:
        record = CompatibilityRecord(
            framework_name=fw,
            constraints=list(constraints),
            constraint_values=framework_values.get(fw, {}),
        )
        compatible, score = record.evaluate()
        if isinstance(score, tuple):
            record.compatible = score[0]
            record.score = score[1]
        else:
            record.compatible, record.score = score
        records.append(record)

    return sorted(records, key=lambda r: r["score"], reverse=True)


# Usage example:
# constraints = [
#     Constraint("python_version", ConstraintType.MUST_HAVE, ">=3.11"),
#     Constraint("deployment_model", ConstraintType.SHOULD_HAVE, "serverless"),
#     Constraint("orm_built_in", ConstraintType.NICE_TO_HAVE, "true"),
# ]
# framework_values = {
#     "fastapi": {"python_version": ">=3.7", "deployment_model": "serverless", "orm_built_in": "false"},
#     "django":   {"python_version": ">=3.8", "deployment_model": "monolith", "orm_built_in": "true"},
# }
# matrix = build_compatibility_matrix(["fastapi", "django"], constraints, framework_values)
```

**Checkpoint:** Any framework that fails a `MUST_HAVE` constraint with `must_pass_all=True` is immediately disqualified. Document which must-haves were violated for traceability.

### 4. AI-Assisted Signal Scoring

Evaluate qualitative signals that cannot be measured from public metrics alone: documentation quality, community responsiveness, vendor lock-in risk, and organizational fit. Use a structured scoring rubric with observable evidence criteria rather than subjective impressions.

```python
@dataclass(frozen=True)
class AISignalScore:
    """Qualitative signal score for a framework candidate."""
    signal_name: str
    score: float  # 0.0–1.0
    evidence: list[str]  # Observable evidence supporting the score
    weight: float = 1.0

    @property
    def weighted_score(self) -> float:
        return self.score * self.weight


def score_documentation_quality(framework_name: str, repo_url: str) -> AISignalScore:
    """Evaluate documentation quality based on observable indicators.

    Evidence criteria (2024–2026 best practices):
    - Has a dedicated docs site (not just README) — +0.3
    - Versioned docs matching release cadence — +0.2
    - Interactive examples or REPL links — +0.2
    - API reference auto-generated from type annotations — +0.15
    - Contributing guide with code of conduct — +0.15

    Returns score 0.0–1.0 with evidence list.
    """
    score = 0.0
    evidence: list[str] = []

    # Check for dedicated documentation site (e.g., /docs path, mkdocs.yml, docusaurus config)
    has_docs_site = False  # Would check repo contents in practice
    if has_docs_site:
        score += 0.3
        evidence.append("Dedicated documentation site found")

    # Check for versioned documentation
    has_versioned_docs = False
    if has_versioned_docs:
        score += 0.2
        evidence.append("Documentation is versioned to match releases")

    # Check for interactive examples
    has_interactive = False
    if has_interactive:
        score += 0.2
        evidence.append("Interactive examples or REPL links available")

    # Check for typed API reference
    has_typed_ref = False
    if has_typed_ref:
        score += 0.15
        evidence.append("API reference auto-generated from type signatures")

    # Check contributing guide and CoC
    has_guide = False
    if has_guide:
        score += 0.15
        evidence.append("Contributing guide and code of conduct present")

    return AISignalScore(
        signal_name="documentation_quality",
        score=min(score, 1.0),
        evidence=evidence,
        weight=0.25,
    )


def score_vendor_lock_in(framework_name: str, framework_type: str) -> AISignalScore:
    """Evaluate vendor lock-in risk for the framework.

    Low lock-in indicators:
    - Framework is a protocol or standard (e.g., HTTP, gRPC, SQL)
    - Multiple competing implementations exist
    - No proprietary cloud-only features required for full functionality

    High lock-in indicators:
    - Tied to single vendor's cloud platform
    - Proprietary SDK required for core features
    - Data model cannot be exported in standard formats
    """
    low_lockin_types = {"http", "sql", "graphql", "grpc", "websocket", "rest"}
    high_lockin_types = {"proprietary_cloud_sdk", "single_vendor_orm", "closed_ecosystem"}

    if framework_type.lower() in low_lockin_types:
        return AISignalScore(
            signal_name="vendor_lock_in_risk",
            score=0.9,  # Low risk → high score
            evidence=[f"Framework type '{framework_type}' is a protocol/standard with multiple implementations"],
            weight=0.15,
        )
    elif framework_type.lower() in high_lockin_types:
        return AISignalScore(
            signal_name="vendor_lock_in_risk",
            score=0.2,
            evidence=[f"Framework type '{framework_type}' indicates high vendor dependency"],
            weight=0.15,
        )
    else:
        return AISignalScore(
            signal_name="vendor_lock_in_risk",
            score=0.6,
            evidence=["Lock-in risk assessment requires manual review for framework type"],
            weight=0.15,
        )


def compute_ai_signal_score(signals: list[AISignalScore]) -> dict[str, float]:
    """Aggregate AI-assisted signal scores into a summary.

    Returns per-signal weighted scores and overall qualitative score.
    """
    total_weight = sum(s.weight for s in signals)
    if total_weight == 0:
        return {"overall": 0.0}

    result: dict[str, float] = {}
    total_weighted = 0.0

    for signal in signals:
        ws = signal.weighted_score
        result[signal.signal_name] = round(ws, 3)
        total_weighted += ws

    result["overall_qualitative"] = round(total_weighted / total_weight, 3)
    return result
```

**Checkpoint:** Qualitative score below 0.40 (on 0–1 scale) indicates documentation or community concerns that require explicit stakeholder acknowledgment before advancement.

### 5. Shortlist Compilation and Exclusion Documentation

Produce a ranked shortlist combining ecosystem health, compatibility, and qualitative scores. For every framework considered but excluded, document the specific disqualification reason with evidence references. This creates an audit trail for future re-evaluation if ecosystem conditions change.

```python
from dataclasses import dataclass, field
from datetime import date


@dataclass(frozen=True)
class FrameworkCandidate:
    """A framework candidate with full evaluation results."""
    name: str
    ecosystem_score: float          # 0.0–1.0 (from EcosystemHealthScore.composite_score)
    compatibility_score: float      # 0.0–1.0 (from CompatibilityRecord.score)
    qualitative_score: float        # 0.0–1.0 (from AI signal aggregation)
    changelog_volatile: bool        # True if >5 breaking changes or unresolved CVEs
    exclusion_reason: str | None = None

    @property
    def weighted_total(self) -> float:
        """Composite score with ecosystem as primary discriminator."""
        return round(
            self.ecosystem_score * 0.40
            + self.compatibility_score * 0.35
            + self.qualitative_score * 0.25,
            3,
        )

    @property
    def grade(self) -> str:
        score = self.weighted_total
        if score >= 0.80:
            return "A"
        elif score >= 0.65:
            return "B"
        elif score >= 0.45:
            return "C"
        elif score >= 0.25:
            return "D"
        return "F"


def compile_shortlist(
    candidates: list[FrameworkCandidate],
    min_passing_score: float = 0.60,
) -> tuple[list[FrameworkCandidate], list[FrameworkCandidate]]:
    """Compile the final shortlist and exclusion report.

    Args:
        candidates: All evaluated framework candidates.
        min_passing_score: Minimum weighted score to qualify for POC phase.

    Returns:
        (shortlisted, excluded) — both lists sorted by score descending.
    """
    shortlisted: list[FrameworkCandidate] = []
    excluded: list[FrameworkCandidate] = []

    for candidate in candidates:
        if candidate.exclusion_reason or candidate.ecosystem_score < 0.50:
            candidate.exclusion_reason = candidate.exclusion_reason or "Ecosystem health below minimum threshold"
            excluded.append(candidate)
        elif candidate.changelog_volatile:
            excluded.append(candidate)
        elif candidate.weighted_total < min_passing_score:
            candidate.exclusion_reason = (
                f"Composite score {candidate.weighted_total:.3f} "
                f"below minimum {min_passing_score}"
            )
            excluded.append(candidate)
        else:
            shortlisted.append(candidate)

    shortlisted.sort(key=lambda c: c.weighted_total, reverse=True)
    excluded.sort(key=lambda c: (c.exclusion_reason or "", c.name))

    return shortlisted, excluded


def format_shortlist_report(
    shortlisted: list[FrameworkCandidate],
    excluded: list[FrameworkCandidate],
    evaluation_date: date | None = None,
) -> str:
    """Format the evaluation report as structured text for review gates."""
    lines: list[str] = []
    eval_date = evaluation_date or date.today()

    lines.append(f"Framework Sourcing Evaluation — {eval_date}")
    lines.append("=" * 60)

    lines.append("\n📊 SHORTLISTED (advancing to proof-of-concept):")
    for i, c in enumerate(shortlisted, 1):
        lines.append(
            f"  {i}. {c.name:<30s} Grade: {c.grade} | "
            f"Ecosystem: {c.ecosystem_score:.2f} | "
            f"Compatible: {c.compatibility_score:.2f} | "
            f"Qualitative: {c.qualitative_score:.2f} | "
            f"Total: {c.weighted_total:.3f}"
        )

    lines.append("\n🚫 EXCLUDED:")
    for i, c in enumerate(excluded, 1):
        lines.append(f"  {i}. {c.name:<30s} — {c.exclusion_reason}")

    return "\n".join(lines)
```

**Checkpoint:** The final report must include both shortlisted and excluded lists. No framework should be excluded without a documented reason — this is the audit trail that prevents sunk-cost bias in future re-evaluations.

---

## Implementation Patterns / Reference Guide

### Pattern 1: Automated Health Metric Fetcher

Fetch ecosystem metrics from public APIs (GitHub, PyPI, npm) and normalize them into a unified health score. This pattern automates Step 1 of the core workflow.

```python
import http.client
import json
from pathlib import Path


def fetch_github_metrics(owner: str, repo: str) -> dict:
    """Fetch live metrics from GitHub API for a repository."""
    conn = http.client.HTTPSConnection("api.github.com")
    headers = {"Accept": "application/vnd.github.v3+json"}
    conn.request("GET", f"/repos/{owner}/{repo}", headers=headers)
    response = conn.getresponse()

    if response.status != 200:
        raise RuntimeError(f"GitHub API returned {response.status}: {response.reason}")

    data = json.loads(response.read().decode("utf-8"))
    conn.close()

    return {
        "stars": data.get("stargazers_count", 0),
        "forks": data.get("forks_count", 0),
        "open_issues": data.get("open_issues_count", 0),
        "subscribers": data.get("subscribers_count", 0),
        "size": data.get("size", 0),
        "language": data.get("language", ""),
        "license": (data.get("license") or {}).get("spdx_id", "unknown"),
    }


def fetch_pypi_health(package_name: str) -> dict:
    """Fetch PyPI health metrics for a Python package."""
    conn = http.client.HTTPSConnection("pypi.python.org")
    conn.request("GET", f"/pypi/{package_name}/json")
    response = conn.getresponse()

    if response.status != 200:
        return {"error": f"PyPI returned {response.status}"}

    data = json.loads(response.read().decode("utf-8"))
    info = data.get("info", {})
    classes = info.get("classifiers", [])

    # Parse classifiers for Python version support
    python_versions: list[str] = []
    for classifier in classes:
        if classifier.startswith("Programming Language :: Python :: "):
            ver = classifier.split(":: ")[-1].strip()
            if ver.isdigit():
                python_versions.append(ver)

    return {
        "version": info.get("version", ""),
        "python_versions": sorted(python_versions),
        "license": info.get("license", "unknown"),
        "requires_python": info.get("requires_python", ">=3.7"),
        "download_counts_last_90d": (
            data.get("urls", [{}])[0].get("downloads", {}).get("last_day", 0) * 90
        ),
    }


def fetch_npm_health(package_name: str) -> dict:
    """Fetch npm registry health metrics for a Node.js package."""
    conn = http.client.HTTPSConnection("registry.npmjs.org")
    conn.request("GET", f"/{package_name}")
    response = conn.getresponse()

    if response.status != 200:
        return {"error": f"npm returned {response.status}"}

    data = json.loads(response.read().decode("utf-8"))
    latest = data.get("dist-tags", {}).get("latest", "")
    versions = data.get("versions", {})
    version_data = versions.get(latest, {})

    return {
        "version": latest,
        "total_versions": len(versions),
        "dependencies_count": len((version_data.get("dependencies") or {}).keys()),
        "dev_dependencies_count": len((version_data.get("devDependencies") or {}).keys()),
        "license": version_data.get("license", "unknown"),
        "keywords": version_data.get("keywords", []),
    }


# Usage: fetch metrics from the appropriate registry based on language ecosystem
# github = fetch_github_metrics("tiangolo", "fastapi")
# pypi = fetch_pypi_health("fastapi")
# health = compute_ecosystem_health(**github, **pypi)
```

### Pattern 2: BAD vs GOOD — Changelog Parsing

```python
# ❌ BAD: Regex-only parsing that misses edge cases and produces no structured data
def bad_changelog_parser(text: str) -> list[str]:
    """Returns raw lines — no categorization, no version tracking."""
    return [line for line in text.splitlines() if line.strip()]


# ✅ GOOD: Structured parser with version blocks, category classification, and severity
def good_changelog_parser(
    text: str,
    include_breaking_only: bool = False,
) -> list[ChangelogSignal]:
    """Parses changelog into structured signals with version context.

    Filters out non-critical entries when `include_breaking_only` is True,
    useful for quick risk assessment without noise.

    Args:
        text: Raw changelog markdown content.
        include_breaking_only: If True, only return BREAKING and SECURITY signals.

    Returns:
        Filtered list of ChangelogSignal entries ordered newest-first.
    """
    signals = parse_changelog_signals(text)

    if not include_breaking_only:
        return signals

    critical_signals = [s for s in signals if s.is_critical]
    if not critical_signals:
        print(f"  ✅ No breaking changes or security advisories found")
    else:
        print(f"  ⚠️  Found {len(critical_signals)} critical signals:")
        for sig in critical_signals[:10]:  # Show first 10
            severity = "🔴" if sig.severity == "critical" else "🟡"
            print(f"    {severity} v{sig.version}: {sig.description[:80]}")

    return critical_signals
```

### Pattern 3: Compatibility Matrix with Must-Have Enforcement

```python
# ❌ BAD: Soft constraints that allow must-have failures through scoring manipulation
def bad_matrix_evaluation(constraints, framework_values):
    """Score-based only — a framework can pass despite failing hard requirements."""
    total = 0.0
    for constraint_name, expected in constraints.items():
        actual = framework_values.get(constraint_name, "")
        if actual == expected:
            total += 1.0
    return round(total / max(len(constraints), 1), 3)


# ✅ GOOD: Hard must-have gates with weighted scoring for should-haves
def good_matrix_evaluation(
    constraints: list[Constraint],
    framework_values: dict[str, str],
    must_pass_all: bool = True,
) -> tuple[bool, float, list[str]]:
    """Evaluate framework against constraints with hard gating.

    MUST_HAVE constraints are binary pass/fail — any failure disqualifies the
    framework entirely when must_pass_all=True. SHOULD_HAVE constraints
    contribute proportionally to the compatibility score.

    Args:
        constraints: Typed constraint definitions from project requirements.
        framework_values: Actual values for each constraint on this framework.
        must_pass_all: If True, failing any MUST_HAVE is an immediate rejection.

    Returns:
        (compatible, score, failed_musts). Score is 0.0–1.0 weighted average.
    """
    record = CompatibilityRecord(
        framework_name="evaluated",
        constraints=constraints,
        constraint_values=framework_values,
        must_pass_all=must_pass_all,
    )
    result, failed_musts = record.evaluate()

    if failed_musts:
        print(f"  🚫 Disqualified — failed MUST_HAVE constraints:")
        for name in failed_musts:
            print(f"     • {name}")

    compatible, score = result
    return (compatible, float(score), failed_musts)


# Usage:
# must_have_constraints = [
#     Constraint("python_version", ConstraintType.MUST_HAVE, ">=3.11"),
#     Constraint("license_type", ConstraintType.MUST_HAVE, "MIT or Apache-2.0"),
#     Constraint("deployment_model", ConstraintType.SHOULD_HAVE, "serverless"),
# ]
# values = {"python_version": ">=3.8", "license_type": "MIT", "deployment_model": "serverless"}
# compatible, score, failures = good_matrix_evaluation(must_have_constraints, values)
```

---

## Constraints

### MUST DO
- Compute composite ecosystem health scores from at least 5 quantitative signals — never rely on star count alone
- Parse changelogs for the last 12 months minimum and flag frameworks with >5 breaking changes as volatile
- Build a typed compatibility matrix where MUST_HAVE constraints cause immediate disqualification
- Score vendor lock-in risk explicitly — frameworks tied to single vendors require stakeholder acknowledgment
- Document exclusion rationale for every candidate that fails the pre-screen — this is the audit trail
- Normalize all quantitative signals to 0.0–1.0 scales before weighting
- Include AI-assisted qualitative signals (documentation, community, lock-in) weighted at 25% maximum of total score
- Generate a shortlist report with both passed and excluded frameworks for review gate sign-off

### MUST NOT DO
- Exclude a framework based on star count alone — stars correlate poorly with maintenance quality
- Use subjective opinions ("looks popular") instead of measurable signals (contributor diversity, commit velocity)
- Skip changelog analysis — a framework with frequent breaking changes will destabilize your codebase
- Allow soft constraints to mask must-have failures — language version mismatches are hard blockers
- Base shortlist decisions on qualitative scores alone without quantitative ecosystem backing
- Use magic numbers in scoring formulas — all weights must be explicit, documented float values
- Shortlist more than 5 frameworks — beyond that, you've failed to discriminate during pre-screening

---

## Related Skills

| Skill | Purpose |
|---|---|
| `framework-requirements` | Defines the requirements and evaluation criteria that this skill uses as input for compatibility scoring |
| `framework-adoption-strategy` | Takes the shortlist from this skill and plans phased migration from selected framework to production |
| `cve-dependency-management` | Scans installed dependencies for vulnerabilities — complements this skill's changelog security analysis |
| `software-maintainability` | Evaluates long-term maintainability of integrated frameworks — post-adoption concern |

---

## Live References

> Authoritative documentation links for framework ecosystem analysis. The model follows markdown links at load time to resolve external references and inline content.

- [GitHub API Reference](https://docs.github.com/en/rest)
- [PyPI JSON API](https://warehouse.pypa.io/api-reference/)
- [npm Registry API](https://docs.npmjs.com/cli/v10/configuring-npm/package-json)
- [GitHub Dependabot — Automated Dependency Updates](https://docs.github.com/en/code-security/dependabot) — Automated dependency version updates and security patching for multi-language ecosystems
- [OWASP Software Component Verification Standard](https://owasp.org/www-project-software-component-verification-standard/) — Framework for verifying the security posture of software dependencies before adoptionse
