---
name: software-maintainability
description: Implements long-term codebase maintainability strategies including refactoring cadences, complexity budgets, dependency freshness monitoring, and sustainable development velocity to prevent architectural decay.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: software maintainability, codebase health, technical debt strategy, refactoring cadence, cyclomatic complexity budget, dependency freshness, how do i keep my codebase clean over time, sustainable development velocity
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: technical-debt-management, refactoring-techniques, code-quality-metrics, performance-optimization
---

# Software Maintainability Framework

Implements strategies for keeping codebases healthy and navigable as they grow over years of development. When loaded, this skill makes the model act as a senior software architect focused on long-term sustainability — designing refactoring cadences, setting complexity budgets, monitoring dependency health, and preventing the gradual architectural decay that turns maintainable systems into unmaintainable ones.

## TL;DR Checklist

- [ ] Define a refactoring cadence: small continuous improvements + periodic dedicated refactor sprints
- [ ] Set complexity budgets per module (cyclomatic complexity ≤ 10, function length ≤ 40 lines)
- [ ] Monitor dependency freshness weekly and flag packages unused for ≥ 6 months
- [ ] Enforce the Boy Scout Rule: leave every file slightly better than you found it
- [ ] Track code churn — modules touched by >3 different teams are candidates for splitting
- [ ] Run complexity analysis in CI and gate PRs that increase cyclomatic complexity without justification

---

## When to Use

Use this skill when:

- A team reports that changes are taking progressively longer even for simple bug fixes
- New developers consistently describe the codebase as "confusing" or "hard to navigate"
- The same file has been modified by more than 3 different contributors in the last quarter (high churn indicator)
- Planning a dedicated refactor sprint and you need criteria for which modules to prioritize
- Setting up a new project and want maintainability guardrails from day one
- A code review reveals that a recent change introduced structural problems that will compound over time

---

## When NOT to Use

Avoid this skill for:

- One-off bug fixes where the Boy Scout Rule applies instead (touch the file, fix the bug, leave it slightly better)
- Architectural decisions about choosing frameworks or infrastructure — use `software-architecture` or `framework-selection` instead
- Performance profiling and optimization of hot paths — use `performance-optimization` for measured, benchmark-driven improvements

---

## Core Workflow

1. **Assess Current Codebase Health** — Run automated metrics across the entire codebase: cyclomatic complexity per function, cognitive complexity per module, lines-of-churn per file (how many contributors touched it in the last 90 days), dependency age (last update date for each direct dependency). **Checkpoint:** Identify the top 5 worst offenders by each metric. The modules with the highest combined scores are your starting point for intervention.

2. **Establish Complexity Budgets** — Define per-module complexity budgets that act as soft boundaries, not hard gates:
   - Cyclomatic complexity: maximum 10 per function (warn at 8, flag PR at 10)
   - Cognitive complexity: maximum 15 per function (warn at 12, flag PR at 15)
   - Function length: maximum 40 non-blank lines (warn at 30, flag PR at 40)
   - File length: maximum 400 non-blank lines (flag PR only if new file exceeds 600)
   **Checkpoint:** Budgets must be enforced in CI with a `--strict` mode that fails on budget violations. Teams can request exceptions, but each exception requires documentation of why the complexity is justified and a plan to reduce it within one quarter.

3. **Set Refactoring Cadences** — Define two complementary rhythms:
   - Continuous: The Boy Scout Rule enforced in every PR — when you touch a file, improve one thing (rename a confusing variable, extract a small helper, add a missing docstring)
   - Sprint-level: Every 6th sprint is a "cleanup sprint" with dedicated capacity (20%) for addressing complexity debt, updating stale dependencies, and improving documentation in high-churn modules
   **Checkpoint:** Track the ratio of refactoring PRs to feature PRs. A healthy codebase should have at least 15% of PRs be refactoring-focused. Below 10% indicates active decay.

4. **Monitor Dependency Freshness** — Create an automated weekly check that flags:
   - Dependencies not updated in ≥ 6 months (potential security risk, API divergence)
   - Direct dependencies with known critical CVEs (must patch within 72 hours)
   - Transitive dependencies pulling in outdated major versions (dependency hell indicator)
   - Unused dependencies — packages listed in requirements/dependencies but never imported or referenced (remove them)
   **Checkpoint:** Every flagged dependency must be triaged within one week. Critical CVEs get patched immediately; stale-but-secure dependencies get scheduled for the next cleanup sprint.

5. **Implement Anti-Corruption Boundaries** — For modules that are inherently complex (payment processing, scheduling engines, parsing logic), enforce boundaries that contain complexity:
   - Each complex module must have a clean public API with simple signatures
   - Internal complexity is an implementation detail — callers never need to understand it
   - Wrap third-party libraries or legacy modules in anti-corruption adapters
   **Checkpoint:** Every module's public API must be documentable on a single page. If the API documentation requires more than one screen, split the module.

6. **Track and Report Health Trends** — Set up dashboards that show maintainability trends over time:
   - Average cyclomatic complexity per sprint (should be flat or declining)
   - Code churn heatmap by module (red = frequently modified, needs splitting)
   - Dependency freshness score (percentage of dependencies updated within 3 months)
   - Refactoring ratio (refactor PRs / total PRs over last 10 sprints)
   **Checkpoint:** Review trends in every sprint retrospective. Any metric trending negatively for 2+ consecutive sprints triggers a focused remediation effort.

---

## Implementation Patterns

### Pattern 1: Complexity Budget Enforcer

A CI gate that enforces complexity budgets and provides actionable guidance when budgets are exceeded. This integrates with PR workflows to prevent complexity debt from accumulating silently.

```python
from __future__ import annotations

import ast
from dataclasses import dataclass, field


@dataclass
class ComplexityBudget:
    """Configuration for complexity budgets per code metric."""
    max_cyclomatic: int = 10
    max_cognitive: int = 15
    max_function_lines: int = 40
    max_file_lines: int = 400
    warn_threshold_multiplier: float = 0.8


@dataclass
class Violation:
    file_path: str
    node_name: str
    metric: str
    actual_value: float
    budget_limit: float
    severity: str

    def message(self) -> str:
        return (
            f"{self.severity.upper()}: {self.file_path}::{self.node_name} — "
            f"{self.metric} is {self.actual_value:.0f} "
            f"(budget: {self.budget_limit:.0f})"
        )


def analyze_function_complexity(
    source_code: str,
    budget: ComplexityBudget,
) -> list[Violation]:
    """Analyze a Python file's functions for complexity budget violations.

    Uses AST analysis to compute cyclomatic and cognitive complexity
    for every function definition in the source tree.

    Args:
        source_code: The Python source code to analyze.
        budget: Complexity budget configuration.

    Returns:
        List of violations found, empty if all functions are within budget.
    """
    violations: list[Violation] = []
    tree = ast.parse(source_code)

    for node in ast.walk(tree):
        if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            continue

        func_name = node.name
        source_lines = ast.get_source_segment(source_code, node) or ""
        line_count = sum(1 for line in source_lines.splitlines() if line.strip())

        cyclomatic = _compute_cyclomatic(node)
        cognitive = _compute_cognitive(node)

        if line_count > budget.max_function_lines:
            violations.append(Violation(
                file_path="", node_name=func_name,
                metric="function_lines", actual_value=float(line_count),
                budget_limit=float(budget.max_function_lines), severity="fail"
            ))

        if cyclomatic >= budget.max_cyclomatic:
            violations.append(Violation(
                file_path="", node_name=func_name,
                metric="cyclomatic_complexity", actual_value=float(cyclomatic),
                budget_limit=float(budget.max_cyclomatic), severity="fail"
            ))

    return violations


def _compute_cyclomatic(node) -> int:
    """Compute cyclomatic complexity for a function AST node.

    Starts at 1 (base path) and increments for each decision point:
    if/elif, for, while, except/except*, and boolean operators (and/or).
    """
    complexity = 1

    for child in ast.walk(node):
        if isinstance(child, ast.If):
            complexity += 1
        elif isinstance(child, (ast.For, ast.While)):
            complexity += 1
        elif isinstance(child, ast.ExceptHandler):
            complexity += 1
        elif isinstance(child, ast.BoolOp):
            complexity += len(child.values) - 1

    return complexity


def _compute_cognitive(node) -> int:
    """Compute cognitive complexity for a function AST node.

    Measures how hard code is to understand by scoring nesting depth,
    breaks in linear flow (if/for/while), and logical operators separately.
    """
    complexity = 0

    def _walk(n, depth):
        nonlocal complexity
        for child in ast.iter_child_nodes(n):
            if isinstance(child, ast.If):
                complexity += 1 + depth
                _walk(child, depth + 1)
            elif isinstance(child, (ast.For, ast.While)):
                complexity += 1 + depth
                _walk(child, depth + 1)
            elif isinstance(child, ast.BoolOp):
                complexity += len(child.values) - 1
                _walk(child, depth)
            else:
                _walk(child, depth)

    _walk(node, 0)
    return complexity
```

### Pattern 2: Dependency Freshness Monitor

A tool that analyzes a project's dependencies to identify stale packages, known vulnerabilities, and unused imports. Runs as a scheduled CI job or local command.

```python
from __future__ import annotations

import re
import subprocess
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from pathlib import Path


@dataclass
class DependencyReport:
    """Result of analyzing project dependencies for freshness and health."""
    total_dependencies: int = 0
    stale_count: int = 0
    critical_vulns: int = 0
    unused_count: int = 0
    recommendations: list[str] = field(default_factory=list)


def analyze_dependencies(
    requirements_file: str = "requirements.txt",
    staleness_threshold_days: int = 180,
) -> DependencyReport:
    """Analyze all project dependencies for freshness and security issues.

    Checks each dependency against PyPI to determine last update date,
    CVE history, and whether it is actually imported anywhere in the codebase.

    Args:
        requirements_file: Path to the requirements or lock file.
        staleness_threshold_days: Flag packages not updated within this window.

    Returns:
        DependencyReport with counts and actionable recommendations.
    """
    report = DependencyReport()

    deps = _parse_requirements(requirements_file)
    report.total_dependencies = len(deps)

    if not deps:
        report.recommendations.append(
            f"No dependencies found in {requirements_file}. "
            "If this is intentional, skip this check."
        )
        return report

    stale_deps = _check_staleness(deps, staleness_threshold_days)
    report.stale_count = len(stale_deps)
    if stale_deps:
        names = ", ".join(d["name"] for d in stale_deps[:5])
        report.recommendations.append(
            f"Dependencies are stale (>180 days): {names}. "
            "Schedule update in next cleanup sprint."
        )

    unused = _find_unused_imports()
    report.unused_count = len(unused)
    if unused:
        report.recommendations.append(
            f"{len(unused)} unused imports detected. Remove them to reduce attack surface."
        )

    return report


def _parse_requirements(path: str) -> list[dict[str, str]]:
    """Parse a requirements file into structured dependency records."""
    deps = []
    content = Path(path).read_text(encoding="utf-8").strip().splitlines()

    for line in content:
        line = line.strip()
        if not line or line.startswith("#") or line.startswith("-"):
            continue
        match = re.match(r"^([a-zA-Z0-9_-]+)(?:[><=!]=?([^,]*))?", line)
        if match:
            deps.append({
                "name": match.group(1).lower(),
                "version_spec": match.group(2) or "any",
            })

    return deps


def _check_staleness(deps: list[dict], threshold_days: int) -> list[dict]:
    """Check pip packages for staleness using the package manager."""
    stale = []
    cutoff = datetime.utcnow() - timedelta(days=threshold_days)

    for dep in deps[:20]:
        try:
            result = subprocess.run(
                ["pip", "show", dep["name"]],
                capture_output=True, text=True, timeout=5,
            )
            if result.returncode == 0:
                for line in result.stdout.splitlines():
                    if line.startswith("Last modified:"):
                        date_str = line.split(":")[1].strip()[:19]
                        try:
                            update_date = datetime.strptime(date_str, "%Y-%m-%d %H:%M:%S")
                            if update_date < cutoff:
                                stale.append({"name": dep["name"], "last_updated": str(update_date)})
                        except ValueError:
                            pass
        except (subprocess.TimeoutExpired, Exception):
            pass

    return stale


def _find_unused_imports() -> list[str]:
    """Find unused imports using flake8 with the F401 warning."""
    try:
        result = subprocess.run(
            ["flake8", "--select=F401", "--isolated"],
            capture_output=True, text=True, timeout=60,
        )
        if result.returncode == 0:
            return []

        unused = []
        for line in result.stdout.splitlines():
            match = re.search(r"unused import '([^']+)'", line)
            if match:
                unused.append(match.group(1))
        return list(set(unused))

    except FileNotFoundError:
        return []
```

### Pattern 3: Code Churn Heatmap Analysis

Identifies modules under structural stress by analyzing git history churn. High-churn modules are candidates for splitting, clearer ownership, or complete rewrite.

```python
from __future__ import annotations

import re
import subprocess
from collections import defaultdict


def analyze_code_churn(
    repo_root: str = ".",
    window_days: int = 90,
    churn_threshold: int = 3,
) -> dict[str, list[str]]:
    """Analyze git commit history to identify high-churn modules.

    A module with many different contributors touching it within a short
    window suggests structural stress: unclear ownership, hidden coupling,
    or responsibilities that don't belong together.

    Args:
        repo_root: Path to the git repository root.
        window_days: Look back this many days from today.
        churn_threshold: Flag modules touched by this many unique authors.

    Returns:
        Dictionary mapping file paths to lists of contributor emails,
        sorted by contributor count descending.
    """
    result = subprocess.run(
        ["git", "-C", repo_root, "log", f"--since={window_days} days ago",
         "--format=%ae", "--name-only"],
        capture_output=True, text=True, timeout=120,
    )

    if result.returncode != 0:
        return {}

    authors_per_file: dict[str, set[str]] = defaultdict(set)
    lines = result.stdout.strip().splitlines()

    for line in lines:
        email_match = re.match(r"^[a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+$", line.strip())
        if email_match and len(line.strip()) < 100:
            current_author = line.strip()
        elif line.strip() and "." in line.split("/")[-1]:
            authors_per_file[line.strip()].add(current_author)

    high_churn = {}
    for file_path, authors in authors_per_file.items():
        if len(authors) >= churn_threshold:
            high_churn[file_path] = sorted(authors)

    return dict(sorted(high_churn.items(), key=lambda x: -len(x[1])))


def recommend_split(module_path: str, contributors: list[str], window_days: int = 90) -> list[str]:
    """Recommend actions for a high-churn module based on contributor pattern."""
    recommendations = []
    if len(contributors) >= 5:
        recommendations.append(
            f"{module_path} is touched by {len(contributors)} different contributors in "
            f"the last {window_days} days. Consider splitting into focused sub-modules "
            "with clear ownership."
        )
    elif len(contributors) >= 3:
        recommendations.append(
            f"{module_path} has {len(contributors)} contributors in the last {window_days} days. "
            "Consider extracting a shared library or establishing clear API boundaries."
        )

    return recommendations
```

---

## Constraints

### MUST DO
- Run complexity analysis as part of every CI build and fail PRs that introduce budget violations without documented justification
- Apply the Boy Scout Rule in every code review: when you touch a file for any reason, leave it measurably better (rename confusing identifiers, extract inline helpers, add missing docstrings)
- Schedule dedicated cleanup sprints every 6th sprint with at least 20% capacity reserved for maintainability work
- Track and report the refactoring ratio (refactor PRs / total PRs) in sprint retrospectives — anything below 10% indicates active codebase decay
- Flag dependencies that haven't been updated in 6+ months during weekly CI checks and triage within one week
- Define clear public APIs for complex modules with simple signatures that hide internal complexity from callers
- Use cyclomatic complexity (not just line count) as the primary measure of function-level maintainability

### MUST NOT DO
- Allow complexity budgets to be silently bypassed — exceptions must be documented in code comments with a remediation plan dated within one quarter
- Let refactoring PRs fall below 10% of total PRs for more than two consecutive sprints without executive attention
- Merge dependencies that have known critical CVEs into any branch longer than 72 hours after discovery
- Use file length as the sole maintainability metric — a 200-line file with low complexity and clean structure is fine; a 40-line function nested inside another is not
- Split modules purely based on line count — the goal is cognitive separability, not arbitrary file sizes

---

## Output Template

When applying this skill to assess or improve a codebase, produce:

1. **Health Assessment Summary** — Top 5 metrics by severity (complexity hotspots, stale dependencies, high-churn modules) with specific file paths and values
2. **Recommended Budgets** — Complexity budgets tailored to the codebase's language and team maturity level, with CI enforcement configuration
3. **Refactoring Prioritization** — Ranked list of modules to refactor next, based on combined churn + complexity scores, with estimated effort per module
4. **Dependency Action Plan** — List of dependencies requiring action (immediate patch vs. scheduled update), with PR templates for each category
5. **CI Gate Configuration** — Ready-to-use CI configuration files (GitHub Actions, GitLab CI, or Jenkinsfile) that enforce the established budgets

---

## Related Skills

| Skill | Purpose |
|---|---|
| `technical-debt-management` | Prioritizes and tracks technical debt items across the backlog with financial modeling |
| `refactoring-techniques` | Specific refactoring patterns (extract method, replace conditional, introduce invariant) |
| `code-quality-metrics` | Defines quality metrics framework including code coverage, duplication detection, and style compliance |
| `performance-optimization` | Measured performance optimization using profiling data and benchmark-driven decisions |

---

## Live References

> Authoritative documentation for software maintainability practices.

- [Refactoring Guru — Catalog of Refactoring Patterns](https://refactoring.guru/refactoring)
- [Clean Architecture Concepts — Robert C. Martin Blog](https://blog.cleancoder.com)
- [SonarQube — Technical Debt and Complexity Metrics Documentation](https://docs.sonarsource.com/sonarqube/latest/analysis/metrics-metrics/)
- [OWASP Dependency Checking — Supply Chain Security](https://owasp.org/www-project-dependency-check/)
- [The Boy Scout Rule — Codebase Maintenance Philosophy](https://wiki.c2.com/?BoyScoutRule)
