---




name: framework-comparison-workflow
description: Runs structured, code-level comparison workflows between competing frameworks through spike projects, side-by-side implementations, developer experience measurement, and ecosystem analysis to produce evidence-based selection recommendations.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: framework comparison, spike project, framework benchmark, developer experience evaluation, framework POC, proof of concept framework, framework ecosystem analysis, tech stack comparison
  archetypes:
    - tactical
    - diagnostic
  anti_triggers:
    - brainstorming
    - vague ideation
    - code golf
    - over-engineering
  response_profile:
    verbosity: medium
    directive_strength: high
    abstraction_level: operational
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, examples, do-dont]
  related-skills: framework-selection, framework-evaluation-criteria, framework-requirements, framework-adoption-strategy




---





# Framework Comparison Workflow

Run structured, code-level comparison workflows between competing frameworks through spike projects, side-by-side implementations, developer experience measurement, and ecosystem analysis. When loaded, this skill makes the model design comparison spikes that exercise real use cases across all candidates, produce measurable evidence (developer effort, code clarity, performance characteristics), evaluate ecosystem health and upgrade paths, and synthesize findings into actionable recommendations — replacing subjective framework debates with empirical data.

## TL;DR Checklist

- [ ] Design spike scope: identical feature spec applied to each candidate framework
- [ ] Implement side-by-side spikes within defined timeboxes (2–4 hours per framework)
- [ ] Measure developer experience metrics: lines of code, boilerplate ratio, type safety coverage, error handling completeness
- [ ] Run performance benchmarks: startup time, request throughput, memory footprint under load
- [ ] Audit ecosystem: library maturity, last commit date, issue resolution rate, security advisories
- [ ] Evaluate upgrade path: breaking change frequency, migration documentation quality, deprecation policy
- [ ] Document findings with code samples from each framework showing real trade-offs

---

## When to Use

Use this skill when:

- Two or more frameworks are viable candidates and a scoring matrix alone cannot differentiate them
- The team needs empirical evidence (code-level comparison) rather than theoretical evaluation criteria
- Selecting a framework for a project where developer experience significantly impacts delivery velocity
- Evaluating whether a trendy new framework offers real advantages over the incumbent for specific use cases
- A stakeholder is advocating for a framework based on popularity or conference talks without hands-on validation
- The frameworks under comparison serve different paradigms (e.g., synchronous vs. async, OOP vs. functional) and require code-level proof

---

## When NOT to Use

Avoid this skill for:

- First-time framework exploration where `framework-utilization` is needed to understand basics first
- Comparing frameworks that differ so radically they serve different problem spaces entirely (e.g., comparing a frontend UI library with a database ORM)
- When only one candidate exists — spike projects need at least 2 options for comparison
- For infrastructure/tool decisions (CI runners, package managers, container runtimes) — use `framework-evaluation-criteria` instead
- When requirements are already fully defined and a single framework clearly meets all non-functional requirements

---

## Core Workflow

### Step 1: Define Spike Scope with Feature Spec

Create an identical feature specification that each candidate framework must implement. The spec should exercise the three most critical capabilities of the chosen framework type. For a web framework, this means: request routing + data validation + database interaction. Document the spec with exact input/output requirements, error handling expectations, and edge cases.

**Checkpoint:** Every candidate must face identical inputs and produce equivalent outputs — otherwise the comparison is invalid. Write a shared test harness that runs against each implementation and asserts the same contract. If one framework requires additional configuration to pass a test, document the deviation rather than adjusting the spec.

### Step 2: Timebox Spike Implementation

Allocate fixed time per framework (typically 2–4 hours). Set a hard stop regardless of completion state — partial implementations still provide valuable data about boilerplate, developer friction, and architectural fit. Use the same development environment setup across all candidates to control for environmental variables. Record the exact environment details: language version, package manager, OS, hardware specs.

**Checkpoint:** Record start/end times for each spike and note any blocker incidents separately from implementation complexity. A framework that blocks you on configuration is still "easier" in practice than one with more code but zero friction — measure real developer experience, not theoretical elegance.

### Step 3: Implement Side-by-Side Spikes

Write actual code for each framework implementing the feature spec. Focus on typical developer workflows, not edge-case mastery. For each implementation, capture: total lines of production code, boilerplate vs. business logic ratio, number of configuration files needed, type safety coverage percentage, and error handling patterns used. Place all spike implementations in a shared directory structure for easy comparison.

**Checkpoint:** Each spike must be independently runnable with `make serve` or equivalent — non-running spikes provide no actionable data. If you cannot get it running within the timebox, that itself is a metric worth recording (setup friction score).

### Step 4: Measure Developer Experience Metrics

After implementation, score each framework on developer experience dimensions using this rubric:

| Metric | Scoring (1–5) | How to Measure |
|--------|---------------|----------------|
| Setup friction | Time to first successful `make serve` | Wall-clock from clone to running server |
| Convention clarity | How obvious are correct file locations and naming conventions? | Count of "where do I put X" search queries during spike |
| Error message quality | Do framework errors point to the root cause? | Simulate 3 common mistakes; rate error messages |
| Hot reload reliability | Does dev server recover correctly from syntax errors? | Intentionally break code; measure recovery time |
| Type safety coverage | Percentage of public interfaces with type annotations | Count annotated vs. total function signatures |

**Checkpoint:** Use the DX measurement script (Pattern 2) to automate data collection across all candidates. Never rely on subjective recollection — the developer who built Spike A may remember it as "easy" because they were fresh, while Spike B felt harder because it was done second and tired. Automate the metrics.

### Step 5: Run Performance Benchmarks

Execute standardized benchmarks against each framework. Measure startup time (first request after cold start), throughput at p95 latency under 100 concurrent requests, and memory footprint at steady state. Use the same load testing tool and methodology for all candidates. For web frameworks, benchmark both a simple "hello world" endpoint and the full feature spec endpoint with database access.

**Checkpoint:** Run each benchmark 3 times and report median — single runs are unreliable due to background processes, garbage collection pauses, and CPU frequency scaling. Use `--warmup` rounds before recording data. Document the exact command-line flags used for reproducibility.

### Step 6: Audit Ecosystem Health

For each framework candidate, audit its ecosystem using objective metrics from public sources:

- **Package/library count** on official registry (npm, PyPI, crates.io)
- **Maintenance activity**: last commit date, PR response time, issue resolution rate over 90 days
- **Security posture**: open CVEs, average patch deployment time from advisory to fix
- **Community size**: Stack Overflow question volume trend (6-month), GitHub stars growth trend, conference presence
- **Upgrade history**: frequency of major versions, breaking change count per major release, quality of migration guides

**Checkpoint:** A framework whose last commit was more than 90 days ago without a stated reason requires explicit stakeholder acknowledgment before commitment. Check the repository's issue tracker: are maintainers actively responding to bug reports, or is the community abandoned?

### Step 7: Evaluate Upgrade Path and Vendor Risk

Assess long-term viability by analyzing the framework's governance model and upgrade trajectory. Check if the project has a documented deprecation policy, how many active core contributors maintain it, whether funding/backing is stable, and what the breaking change history looks like across major versions. For enterprise contexts, check compliance certifications and commercial support availability.

**Checkpoint:** A framework with fewer than 3 active maintainers (commits in last 90 days) or no clear governance model requires explicit risk acceptance documented in the decision record before committing to it. Evaluate whether the project has a stable LTS version and how quickly security patches propagate from CVE publication to package availability.

### Step 8: Synthesize Findings into Decision Recommendation

Compile all spike data, DX scores, benchmark results, and ecosystem audits into a structured comparison report. Include actual code samples from each framework showing implementation trade-offs — not just scores but the code that earned those scores. Present findings as a decision recommendation with supporting evidence, explicitly noting what each candidate sacrifices.

**Checkpoint:** The recommendation must include at least one "why not" analysis explaining why the runner-up(s) were rejected despite having strengths. Every score should be traceable to a specific observation or measurement from the spike work.

---

## Implementation Patterns

### Pattern 1: Spike Project Template Structure

This pattern establishes a reproducible directory structure and shared test harness for running framework comparison spikes. The key principle is that each framework gets an isolated implementation while sharing identical tests, benchmarks, and measurement tooling.

```
spikes/
├── spec.yaml                     # Shared feature specification (identical for all)
├── tests/
│   ├── conftest.py               # Shared pytest fixtures and test runner
│   ├── test_routes.py            # Route verification tests
│   ├── test_validation.py        # Input validation tests
│   └── test_database.py          # Database interaction tests
├── benchmarks/
│   ├── benchmark_runner.py       # Shared load testing harness
│   └── reports/                  # Benchmark output per framework
├── dx_metrics/
│   ├── measure.sh                # Script to collect DX metrics
│   └── results.json              # Aggregated DX scores
├── fastapi-spike/
│   ├── app/
│   │   ├── main.py
│   │   ├── routes.py
│   │   ├── models.py
│   │   └── db.py
│   ├── requirements.txt
│   ├── Dockerfile
│   └── Makefile
├── flask-spike/
│   ├── app/
│   │   ├── main.py
│   │   ├── routes.py
│   │   ├── models.py
│   │   └── db.py
│   ├── requirements.txt
│   ├── Dockerfile
│   └── Makefile
└── README.md                     # Spike instructions and environment notes
```

The shared `Makefile` pattern provides a uniform interface:

```makefile
# Each spike directory contains this pattern — identical across all frameworks
.PHONY: serve test bench clean

serve:
	pip install -r requirements.txt
	python -m app.main --port 8080

test:
	cd ../tests && pytest --target=http://localhost:8080 --framework=$(FRAMEWORK) .

bench:
	python ../benchmarks/benchmark_runner.py --endpoint http://localhost:8080/api/items

clean:
	rm -rf .venv __pycache__ app/__pycache__
```

### Pattern 2: Developer Experience Measurement Script

This Python script automates DX metric collection across framework implementations. It measures code structure, type safety coverage, boilerplate ratios, and error handling completeness — producing structured JSON output for each candidate.

```python
#!/usr/bin/env python3
"""Automated Developer Experience metrics collector for framework comparison spikes.

Analyzes source code to measure boilerplate ratio, type safety coverage,
error handling completeness, and configuration overhead across framework candidates.

Usage:
    python dx_measure.py --spike-dir ./fastapi-spike --framework fastapi
    python dx_measure.py --spike-dir ./flask-spike --framework flask --output results.json
"""

import json
import re
import subprocess
import sys
from dataclasses import asdict, dataclass, field
from pathlib import Path


@dataclass
class DXMetrics:
    """Structured DX metrics for a single framework spike."""
    framework: str
    spike_dir: str
    total_lines: int = 0
    boilerplate_lines: int = 0
    business_logic_lines: int = 0
    boilerplate_ratio: float = 0.0
    type_coverage_pct: float = 0.0
    error_handling_score: int = 0  # 1-5 scale
    config_files_count: int = 0
    setup_time_seconds: float = 0.0
    total_functions_with_types: int = 0
    total_functions_without_types: int = 0
    hot_reload_recovery_seconds: float = 0.0

    @property
    def developer_friction_score(self) -> float:
        """Composite friction score: higher = more friction (worse DX).

        Combines boilerplate ratio, config overhead, and missing type coverage.
        Scale: 0.0 (excellent) to 1.0 (poor).
        """
        boilerplate_penalty = self.boilerplate_ratio * 0.4
        config_penalty = min(self.config_files_count / 20, 0.3)
        type_penalty = ((100 - self.type_coverage_pct) / 100) * 0.3
        return round(min(boilerplate_penalty + config_penalty + type_penalty, 1.0), 3)


def count_lines(directory: Path) -> dict[str, int]:
    """Count lines of code by category for all Python files in directory."""
    total = 0
    boilerplate = 0
    business_logic = 0

    python_files = list(directory.rglob("*.py"))

    for py_file in sorted(python_files):
        content = py_file.read_text(encoding="utf-8")
        lines = content.splitlines()

        for line in lines:
            stripped = line.strip()
            if not stripped or stripped.startswith("#"):
                continue

            total += 1

            # Heuristic: boilerplate = imports, decorators, empty classes,
            # framework config objects, __init__.py pass statements
            is_boilerplate_pattern = (
                stripped.startswith("from ") or
                stripped.startswith("import ") or
                stripped.startswith("@") or
                stripped.startswith("class ") and "Error" in stripped or
                stripped.startswith("Config") or
                stripped == "pass" or
                "app = Flask" in stripped or
                "app = FastAPI" in stripped or
                stripped.startswith("uvicorn.run") or
                stripped.startswith("gunicorn") or
                "def __init__" in stripped and len(lines) < 3
            )

            if is_boilerplate_pattern:
                boilerplate += 1
            else:
                business_logic += 1

    return {
        "total": total,
        "boilerplate": boilerplate,
        "business_logic": business_logic,
    }


def measure_type_coverage(directory: Path) -> tuple[int, int]:
    """Measure percentage of function/method signatures with type annotations.

    Returns (count_with_types, count_without_types) for public interfaces only.
    Ignores private methods (prefixed with _) and __init__ constructors.
    """
    python_files = list(directory.rglob("*.py"))
    annotated = 0
    unannotated = 0

    function_pattern = re.compile(
        r"^def\s+(\w+)\s*\((.*?)\)(?:\s*->\s*(.+))?$",
        re.MULTILINE | re.VERBOSE,
    )

    for py_file in sorted(python_files):
        content = py_file.read_text(encoding="utf-8")
        matches = function_pattern.findall(content)

        for name, params, return_annotation in matches:
            # Skip private methods and dunder methods
            if name.startswith("_"):
                continue

            has_type = bool(return_annotation.strip()) or ":" in params

            if has_type:
                annotated += 1
            else:
                unannotated += 1

    return annotated, unannotated


def measure_error_handling(directory: Path) -> int:
    """Score error handling completeness on a 1-5 scale.

    Checks for try/except blocks, explicit error classes, logging of errors,
    and graceful degradation patterns.
    """
    python_files = list(directory.rglob("*.py"))
    content = "".join(f.read_text(encoding="utf-8") for f in python_files)

    score = 1
    if "try:" in content:
        score += 1
    if "except" in content:
        score += 1
    if "logging\." in content or "logger\." in content:
        score += 1
    if re.search(r"class\s+\w*(Error|Exception)\w*\s*\(", content):
        score += 2  # Custom error classes add significant points

    return min(score, 5)


def count_config_files(directory: Path) -> int:
    """Count configuration files that affect framework behavior."""
    config_patterns = {
        "requirements.txt", "pyproject.toml", "setup.cfg",
        "Dockerfile", "docker-compose.yml", ".env.example",
        "Makefile", "alembic.ini", "mypy.ini", "tox.ini",
    }
    return sum(1 for f in directory.iterdir() if f.name in config_patterns)


def run_spikes(spike_base_dir: str, frameworks: list[str]) -> dict[str, DXMetrics]:
    """Run DX measurements across all framework spikes and return structured results."""
    base = Path(spike_base_dir)
    results: dict[str, DXMetrics] = {}

    for fw in sorted(frameworks):
        spike_dir = base / f"{fw}-spike"
        if not spike_dir.is_dir():
            print(f"Warning: {spike_dir} not found, skipping", file=sys.stderr)
            continue

        line_counts = count_lines(spike_dir)
        annotated, unannotated = measure_type_coverage(spike_dir)
        error_score = measure_error_handling(spike_dir)
        config_count = count_config_files(spike_dir)

        total = line_counts["total"] or 1
        br = round(line_counts["boilerplate"] / total * 100, 1)
        tc = round(annotated / (annotated + unannotated) * 100, 1) if (annotated + unannotated) > 0 else 0.0

        metrics = DXMetrics(
            framework=fw,
            spike_dir=str(spike_dir),
            total_lines=total,
            boilerplate_lines=line_counts["boilerplate"],
            business_logic_lines=line_counts["business_logic"],
            boilerplate_ratio=br / 100,
            type_coverage_pct=tc,
            error_handling_score=error_score,
            config_files_count=config_count,
        )

        results[fw] = metrics
        print(f"  {fw:20s} | lines={metrics.total_lines:>4d} | "
              f"boilerplate={br:>5.1f}% | type_coverage={tc:>5.1f}% | "
              f"errors={error_score}/5 | friction={metrics.developer_friction_score:.3f}")

    return results


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Measure DX metrics across framework spikes")
    parser.add_argument("--spike-dir", required=True, help="Base directory containing *-spike subdirs")
    parser.add_argument("--frameworks", nargs="+", default=None, help="Framework names to measure (auto-detect if omitted)")
    parser.add_argument("--output", default=None, help="Output results JSON file path")
    args = parser.parse_args()

    print(f"Collecting DX metrics from {args.spike_dir}...\n")

    frameworks = args.frameworks
    if not frameworks:
        base = Path(args.spike_dir)
        frameworks = sorted([d.name.replace("-spike", "") for d in base.iterdir()
                             if d.is_dir() and d.name.endswith("-spike")])

    results = run_spikes(args.spike_dir, frameworks)

    if args.output:
        output_data = {name: asdict(m) for name, m in sorted(results.items())}
        Path(args.output).write_text(json.dumps(output_data, indent=2) + "\n")
        print(f"\nResults written to {args.output}")

    # Print comparison summary
    if len(results) >= 2:
        print("\n" + "=" * 70)
        print("Developer Experience Comparison Summary")
        print("=" * 70)
        metrics_list = list(results.values())
        best_friction = min(metrics_list, key=lambda m: m.developer_friction_score)
        most_concise = min(metrics_list, key=lambda m: m.total_lines)
        best_types = max(metrics_list, key=lambda m: m.type_coverage_pct)

        print(f"  Lowest friction:     {best_friction.framework} ({best_friction.developer_friction_score:.3f})")
        print(f"  Most concise:        {most_concise.framework} ({most_concise.total_lines} LOC)")
        print(f"  Best type coverage:  {best_types.framework} ({best_types.type_coverage_pct:.1f}%)")
```

### Pattern 3: Ecosystem Health Dashboard Generator

This script queries public APIs (GitHub, PyPI/npm/crates.io) to produce structured ecosystem health metrics for each framework candidate. It converts raw API data into the dimensions required by Step 6 and Step 7 of the core workflow.

```python
#!/usr/bin/env python3
"""Ecosystem health dashboard generator for framework comparison spikes.

Queries GitHub API and package registries to measure maintenance activity,
community health, security posture, and upgrade trajectory of framework candidates.

Usage:
    python ecosystem_audit.py --github-token $GITHUB_TOKEN \
        --packages fastapi flask starlette \
        --languages python \
        --output ecosystem_report.json
"""

import json
import sys
from dataclasses import asdict, dataclass, field
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional


@dataclass
class PackageRegistryInfo:
    """Information from a package registry about a framework."""
    name: str
    total_downloads_monthly: Optional[int] = None
    total_releases: int = 0
    latest_version: Optional[str] = None
    latest_release_date: Optional[str] = None
    license_type: Optional[str] = None

    @property
    def download_trend(self) -> str:
        """Qualitative trend description based on monthly downloads."""
        if self.total_downloads_monthly is None:
            return "unknown"
        if self.total_downloads_monthly > 10_000_000:
            return "rapidly growing"
        elif self.total_downloads_monthly > 1_000_000:
            return "strong growth"
        elif self.total_downloads_monthly > 100_000:
            return "steady usage"
        elif self.total_downloads_monthly > 10_000:
            return "niche adoption"
        else:
            return "declining or new"


@dataclass
class GitHubActivity:
    """GitHub repository activity metrics."""
    full_name: str
    stars: int = 0
    forks: int = 0
    open_issues: int = 0
    last_commit_date: Optional[str] = None
    last_pr_response_hours: float = 24.0
    issue_resolution_rate_90d: float = 0.75
    primary_language: str = ""
    license_spdx: str = ""

    @property
    def maintenance_health(self) -> str:
        """Overall maintenance health classification."""
        if self.last_commit_date is None:
            return "inactive"
        last_commit_dt = datetime.fromisoformat(self.last_commit_date.replace("Z", "+00:00"))
        days_since = (datetime.now(timezone.utc) - last_commit_dt).days
        if days_since > 90:
            return "at-risk"
        elif days_since > 30:
            return "moderate"
        else:
            return "active"

    @property
    def bus_factor_estimate(self) -> str:
        """Estimate contributor concentration risk."""
        if self.forks == 0:
            return "unknown"
        contributors_ratio = self.stars / max(self.forks, 1)
        if contributors_ratio > 50:
            return "distributed (low risk)"
        elif contributors_ratio > 20:
            return "moderate concentration"
        else:
            return "concentrated (high bus factor risk)"


@dataclass
class UpgradeHistory:
    """Framework upgrade trajectory analysis."""
    major_versions_released: int = 0
    time_between_majors_months: Optional[int] = None
    breaking_changes_last_major: int = 0
    migration_guide_exists: bool = False
    deprecation_policy_documented: bool = False

    @property
    def upgrade_risk(self) -> str:
        """Assess the risk of upgrading to next major version."""
        if not self.deprecation_policy_documented:
            return "HIGH — no deprecation policy"
        if self.breaking_changes_last_major > 15:
            return "MODERATE — significant breaking changes expected"
        elif self.migration_guide_exists and self.time_between_majors_months and self.time_between_majors_months > 12:
            return "LOW — stable with good migration docs"
        else:
            return "MODERATE — check changelog carefully"


@dataclass
class EcosystemHealthReport:
    """Complete ecosystem health assessment for a framework."""
    framework_name: str
    package_info: PackageRegistryInfo
    github: GitHubActivity
    upgrade_history: UpgradeHistory
    security_advisories_open: int = 0
    conference_talks_last_year: int = 0

    @property
    def overall_health_score(self) -> float:
        """Composite health score: 0.0 (poor) to 1.0 (excellent)."""
        score = 0.0
        weight = 0.0

        # Maintenance activity (30%)
        if self.github.maintenance_health == "active":
            score += 0.3
        elif self.github.maintenance_health == "moderate":
            score += 0.15
        else:
            score -= 0.05  # at-risk or inactive

        weight += 0.3

        # Community health (25%)
        if self.github.stars > 10_000:
            score += 0.25
        elif self.github.stars > 1_000:
            score += 0.15
        elif self.github.stars > 100:
            score += 0.08

        weight += 0.25

        # Package adoption (20%)
        if self.package_info.download_trend in ("rapidly growing", "strong growth"):
            score += 0.20
        elif self.package_info.download_trend == "steady usage":
            score += 0.12

        weight += 0.20

        # Upgrade safety (15%)
        if self.upgrade_history.deprecation_policy_documented:
            score += 0.10
        if self.upgrade_history.migration_guide_exists:
            score += 0.05

        weight += 0.15

        # Security posture (10%)
        if self.security_advisories_open == 0:
            score += 0.10
        elif self.security_advisories_open <= 2:
            score += 0.05

        weight += 0.10

        return round(score / max(weight, 0.01), 3) if weight > 0 else 0.0

    def summary(self) -> str:
        """Generate human-readable ecosystem health summary."""
        lines = [
            f"Ecosystem Health: {self.framework_name} — Score: {self.overall_health_score:.2f}/1.0",
            f"  GitHub: {self.github.full_name} | ⭐ {self.github.stars:,} stars | "
            f"Health: {self.github.maintenance_health} | Bus factor: {self.github.bus_factor_estimate}",
            f"  Package: {self.package_info.latest_version or 'unknown'} — {self.package_info.download_trend}",
            f"  Upgrade risk: {self.upgrade_history.upgrade_risk}",
            f"  Open security advisories: {self.security_advisories_open}",
        ]
        return "\n".join(lines)


def fetch_github_activity(repo_owner: str, repo_name: str, token: Optional[str] = None) -> GitHubActivity:
    """Fetch GitHub repository activity metrics from the GitHub API.

    Args:
        repo_owner: Repository owner (e.g., 'tiangolo' for FastAPI).
        repo_name: Repository name (e.g., 'fastapi').
        token: Optional GitHub personal access token for higher rate limits.

    Returns:
        GitHubActivity with measured metrics.
    """
    import urllib.request

    base_url = f"https://api.github.com/repos/{repo_owner}/{repo_name}"
    headers = {"Accept": "application/vnd.github.v3+json"}
    if token:
        headers["Authorization"] = f"token {token}"

    def _request(url: str) -> dict:
        req = urllib.request.Request(url, headers=headers)
        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except Exception as e:
            print(f"Warning: GitHub API error for {url}: {e}", file=sys.stderr)
            return {}

    repo_info = _request(base_url)

    # Fetch recent commits to determine last activity
    commits = _request(f"{base_url}/commits?per_page=5")
    last_commit_date = None
    if commits and isinstance(commits, list) and len(commits) > 0:
        last_commit_date = commits[0].get("commit", {}).get("committer", {}).get("date")

    return GitHubActivity(
        full_name=f"{repo_owner}/{repo_name}",
        stars=repo_info.get("stargazers_count", 0),
        forks=repo_info.get("forks_count", 0),
        open_issues=repo_info.get("open_issues_count", 0),
        last_commit_date=last_commit_date,
        issue_resolution_rate_90d=0.8,  # Placeholder — refine with issue API queries
        primary_language=repo_info.get("language", ""),
        license_spdx=repo_info.get("license", {}).get("spdx_id", "unknown") if repo_info.get("license") else "unknown",
    )


def analyze_upgrade_history(github_activity: GitHubActivity, releases_endpoint: str) -> UpgradeHistory:
    """Analyze a framework's upgrade trajectory from release history.

    Args:
        github_activity: Already-fetched GitHub activity for context.
        releases_endpoint: API URL to fetch releases (e.g., PyPI JSON API).

    Returns:
        UpgradeHistory with upgrade risk assessment.
    """
    import urllib.request

    def _get_releases() -> list[dict]:
        headers = {"Accept": "application/json"}
        req = urllib.request.Request(releases_endpoint, headers=headers)
        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                if "releases" in data:
                    return list(data["releases"].values())
                return []
        except Exception:
            return []

    releases = _get_releases()
    major_versions: set[str] = set()
    migration_guides = 0

    for rel_info in releases[-10:]:  # Last 10 releases
        version = rel_info.get("version", "") if isinstance(rel_info, dict) else str(rel_info.get("vname", ""))
        major = version.split(".")[0] if "." in version else "0"
        major_versions.add(major)

    return UpgradeHistory(
        major_versions_released=len(major_versions),
        migration_guide_exists=False,  # Verify by checking README/CHANGES for migration sections
        deprecation_policy_documented=False,  # Check docs for deprecation section
    )


def generate_ecosystem_dashboard(
    frameworks: list[dict[str, str]],
    github_token: Optional[str] = None,
) -> dict[str, EcosystemHealthReport]:
    """Generate ecosystem health reports for multiple framework candidates.

    Args:
        frameworks: List of dicts with keys 'name', 'owner', 'repo'.
        github_token: Optional GitHub PAT for higher rate limits.

    Returns:
        Dictionary mapping framework names to their EcosystemHealthReport.
    """
    reports: dict[str, EcosystemHealthReport] = {}

    for fw in frameworks:
        name = fw["name"]
        owner = fw.get("owner", name)
        repo = fw.get("repo", name)

        print(f"  Analyzing {name} ({owner}/{repo})...")

        github = fetch_github_activity(owner, repo, github_token)
        package_info = PackageRegistryInfo(
            name=name,
            license_type=github.license_spdx if github.license_spdx != "unknown" else None,
        )

        report = EcosystemHealthReport(
            framework_name=name,
            package_info=package_info,
            github=github,
            upgrade_history=analyze_upgrade_history(github, ""),
        )

        reports[name] = report
        print(f"    Score: {report.overall_health_score:.2f}/1.0 — {report.summary()}")

    return reports


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Generate ecosystem health dashboard for frameworks")
    parser.add_argument("--packages", nargs="+", required=True, help="Framework package names")
    parser.add_argument("--github-token", default=None, help="GitHub personal access token")
    parser.add_argument("--output", default=None, help="Output JSON file path")
    args = parser.parse_args()

    framework_specs = [
        {"name": name, "owner": name, "repo": name} for name in args.packages
    ]

    print(f"Generating ecosystem dashboard for {', '.join(args.packages)}...\n")
    reports = generate_ecosystem_dashboard(framework_specs, args.github_token)

    if args.output:
        output_data = {}
        for name, report in sorted(reports.items()):
            output_data[name] = asdict(report)
        Path(args.output).write_text(json.dumps(output_data, indent=2, default=str) + "\n")
        print(f"\nDashboard written to {args.output}")

    # Final comparison table
    print("\n" + "=" * 80)
    print("Ecosystem Health Comparison")
    print("=" * 80)
    print(f"{'Framework':<20} {'Health Score':>12} {'Stars':>10} {'Last Commit':>14} {'Bus Factor':>26}")
    print("-" * 80)
    for name, report in sorted(reports.items()):
        g = report.github
        commit_str = (g.last_commit_date[:10] if g.last_commit_date else "unknown")
        print(f"{name:<20} {report.overall_health_score:>11.2f}/1  {g.stars:>10,} "
              f"{commit_str:>14} {g.bus_factor_estimate:>26}")
```

### Pattern 4: Side-by-Side Feature Comparison (BAD vs. GOOD)

This pattern demonstrates how the same feature — a REST endpoint with input validation and database interaction — is implemented across different frameworks, making trade-offs explicit. Here we compare FastAPI (async, type-first) against Flask (sync, flexible).

**Feature:** A `POST /items` endpoint that accepts JSON, validates fields, stores in a database, and returns the created item with appropriate error handling.

```python
# ❌ BAD: Flask implementation missing validation, error handling, and type safety
# This is what teams often ship as their "spike" — functional but production-risky.

from flask import Flask, jsonify, request

app = Flask(__name__)

items_db = {}  # In-memory store — no type safety, no migration path

@app.route("/items", methods=["POST"])
def create_item():
    data = request.get_json()  # No schema validation — accepts anything
    item_id = len(items_db) + 1
    items_db[item_id] = data  # Storing raw dict — no field sanitization
    return jsonify({"id": item_id, "data": data})

# Problems:
# - No input validation: user can send {"name": null, "extra_field": true} and it's stored
# - No type annotations: IDE gives no help, runtime errors are cryptic
# - In-memory dict: crashes on restart, not thread-safe under load
# - No error responses: missing fields cause NoneType AttributeError 500s
# - Global mutable state: makes testing nearly impossible without complex mocking
```

```python
# ✅ GOOD: FastAPI implementation with Pydantic validation, type safety, and structured errors
from contextlib import asynccontextmanager
from typing import Annotated

from fastapi import FastAPI, HTTPException, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, field_validator

# --- Domain models (explicit contracts) ---

class ItemCreate(BaseModel):
    """Schema for creating an item. Enforced by Pydantic at the request boundary."""
    name: Annotated[str, Field(min_length=1, max_length=200, description="Item display name")]
    price: Annotated[float, Field(gt=0, description="Positive price in dollars")]
    category: Annotated[str, Field(description="Product category for filtering")]

    @field_validator("category")
    @classmethod
    def normalize_category(cls, v: str) -> str:
        return v.strip().title()


class ItemResponse(BaseModel):
    """Schema for the API response."""
    id: int
    name: str
    price: float
    category: str


# --- Application layer ---

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage database connection lifecycle — opens on startup, closes on shutdown."""
    app.state.db = await init_database()  # type: ignore[assignment]
    yield
    await close_database(app.state.db)  # type: ignore[arg-type]


app = FastAPI(
    title="Item Service",
    version="1.0.0",
    lifespan=lifespan,
)

# --- Routes (business logic only — no validation, no error wrapping boilerplate) ---

@app.post("/items", response_model=ItemResponse, status_code=status.HTTP_201_CREATED)
async def create_item(item: ItemCreate) -> ItemResponse:
    """Create a new item with validated input.

    FastAPI automatically:
      1. Parses JSON from request body
      2. Validates against ItemCreate schema (returns 422 on failure)
      3. Injects the validated ItemCreate instance into this function
      4. Serializes the return value against ItemResponse model
    """
    db = app.state.db

    # Business logic: check for duplicate names within category
    existing = await db.fetch_one(
        "SELECT id FROM items WHERE name = $1 AND category = $2",
        item.name, item.category,
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Item '{item.name}' already exists in category '{item.category}'",
        )

    row = await db.fetch_one(
        "INSERT INTO items (name, price, category) VALUES ($1, $2, $3) RETURNING id",
        item.name, item.price, item.category,
    )

    return ItemResponse(id=row["id"], **item.model_dump())
```

**Trade-off analysis:**

| Dimension | Flask (BAD example) | FastAPI (GOOD example) |
|---|---|---|
| Lines of business logic | 4 | 12 |
| Boilerplate (models, schemas) | 0 | ~30 lines |
| Input validation at runtime | None (accepts anything) | Automatic via Pydantic — returns `422 Unprocessable Entity` |
| Type safety | Zero annotations | Full contract: request → model → DB → response |
| Error handling for missing fields | Silent 500 error | Explicit `422` with field-level error details |
| Testability | Requires mocking global `items_db` | Dependency injection via `app.state.db`, pure functions easy to unit-test |
| API documentation | None (manual OpenAPI if added) | Automatic OpenAPI/Swagger from type annotations |

The FastAPI spike requires more upfront code for models and schemas, but that boilerplate is **productive**: every line reduces the chance of runtime bugs, invalid data entering the database, or silent failures in production. The Flask version appears simpler but trades elegance for risk — the missing validation and type safety will surface as bugs in integration tests or worse, in production.

---

## Constraints

### MUST DO
- Implement identical feature specs across all candidates — never change requirements between frameworks to make one look better
- Timebox each spike and record actual developer effort metrics (wall-clock time, number of configuration steps, blocker incidents)
- Run performance benchmarks at least 3 times per candidate and report medians, not averages or single runs
- Include at least one code sample from each framework in the final comparison report — scores without code are opinions
- Document ecosystem health with objective metrics: last commit date, PR response time, CVE count, maintainer count
- Evaluate upgrade path for every candidate using deprecation policy and breaking change history
- Run spikes in a controlled environment: same OS, same hardware, same language runtime version
- Place all spike implementations in a shared directory structure so side-by-side comparison is trivial

### MUST NOT DO
- Compare frameworks using only documentation reading or theoretical analysis — spikes must produce runnable, tested code
- Allow spike duration to vary significantly between candidates (more than 20% time difference) — this invalidates effort comparisons
- Favor the framework your team currently knows best when scoring developer experience objectively — measure friction, not familiarity
- Skip ecosystem audit for any candidate — a beautiful spike doesn't prove long-term maintainability
- Present comparison results as final verdicts without stakeholder review and contextual considerations
- Benchmark with warm caches or pre-loaded dependencies — always measure cold-start behavior too
- Use different test suites per framework — if tests don't share the same assertions, the comparison is meaningless

---

## Related Skills

| Skill | Purpose |
|---|---|
| `framework-selection` | Final scoring and ranking after comparison workflow produces evidence |
| `framework-evaluation-criteria` | Defining evaluation criteria before starting comparison work |
| `framework-requirements` | Eliciting requirements that inform spike feature specs |
| `framework-adoption-strategy` | Planning migration after comparison identifies the winning framework |

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Gartner — Top Strategic Technology Trends](https://www.gartner.com/en/information-technology/insights/software-development-frameworks) — Annual research on framework ecosystem maturity, adoption curves, and vendor capability assessments
- [Stack Overflow Developer Survey — Framework Popularity](https://survey.stackoverflow.co/) — Community-driven metrics on framework usage, satisfaction, and trending tools across developer demographics
- [TIOBE Index — Programming Language Rankings](https://www.tiobe.com/tiobe-index/) — Historical popularity trends for languages and their associated frameworks over decades
- [GitHub Archive — Open Source Contribution Data](https://www.gharchive.org/) — Historical repository activity data for measuring framework ecosystem health through contributor growth
- [OpenSSF Scorecard — Security of OSS Projects](https://github.com/ossf/scorecard) — Automated security posture assessment for frameworks and their dependency chains
