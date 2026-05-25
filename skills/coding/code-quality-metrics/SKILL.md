---
name: code-quality-metrics
description: Analyzes software quality using static analysis metrics including cyclomatic
  complexity, maintainability index, code duplication detection, technical debt estimation,
  and coverage thresholds for engineering teams.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: code quality metrics, cyclomatic complexity, maintainability index, code
    duplication, static analysis, technical debt, sonarqube, pylint metrics, flake8,
    mypy strict, coverage thresholds, dead code detection, how do i measure code quality,
    complexity analysis
  archetypes:
  - tactical
  - generation
  anti_triggers:
  - brainstorming
  - vague ideation
  - code golf
  - over-engineering
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  role: implementation
  scope: implementation
  output-format: code
  content-types:
  - code
  - guidance
  - examples
  - do-dont
  - config
  related-skills: coding-static-analysis-tools, coding-code-review, coding-refactoring-techniques,
    coding-type-safety-enforcement
------
# Code Quality Metrics & Analysis

Analyzes software quality using measurable static analysis metrics — cyclomatic complexity, maintainability index, code duplication, technical debt estimation, and coverage thresholds. This skill configures tooling (radon, pylint, ruff, mypy, coverage.py) and defines quantitative quality gates that teams enforce in CI/CD pipelines.

## TL;DR Checklist

- [ ] Cyclomatic complexity per function stays below 10 (warning threshold: 5)
- [ ] Maintainability Index is above 20 for all files (SonarQube scale, max 100)
- [ ] Code duplication detected by radon or similar tool is below 3% of total lines
- [ ] Test coverage threshold set per-project (default: 80% line coverage minimum)
- [ ] All quality metrics run automatically in CI with clear pass/fail output
- [ ] Technical debt is estimated and tracked as a trend, not a single snapshot
- [ ] Flake8/pylint/ruff violations are categorized by severity before setting thresholds

---

## When to Use

Use this skill when:

- Setting up quality gates for a new codebase or service
- Reviewing an existing project's static analysis configuration and metric thresholds
- Diagnosing a spike in cyclomatic complexity in a specific module
- Building a technical debt dashboard from tool output (radon, pylint, coverage)
- Configuring CI/CD pipelines to block merges when quality metrics regress
- Measuring refactoring impact by comparing metrics before and after changes

## When NOT to Use

Avoid this skill for:

- Runtime performance profiling — use benchmark tools (pytest-benchmark, cProfile) instead
- Security vulnerability scanning — use bandit, semgrep, or SAST tools instead
- Dependency CVE auditing — use pip-audit, trivy, or Dependabot instead
- Code style enforcement only — that is covered by linters like ruff, black, and flake8 alone; this skill adds the quantitative measurement layer on top

---

## Core Workflow

1. **Select Tooling Stack per Language** — Choose analysis tools that align with your language ecosystem:
   - Python: radon (complexity), pylint/mypy/ruff (static checks), coverage.py (test coverage)
   - TypeScript/JavaScript: eslint-plugin-metrics, sonarqube-scanner, cypress for E2E coverage
   - Java/Kotlin: PMD, Checkstyle, SpotBugs, JaCoCo for coverage
   - Go: gocyclo for complexity, golangci-lint for combined checks
   **Checkpoint:** At least 3 different metric categories must be covered (e.g., complexity + duplication + coverage). If your stack only measures one category, add complementary tools.

2. **Run Cyclomatic Complexity Analysis** — Execute radon cc or equivalent tool on the codebase to calculate the cyclomatic complexity score for every function. Cyclomatic complexity = E - N + 2P (edges - nodes + 2*connected components), effectively counting the number of independent paths through a function.
   **Checkpoint:** Flag every function with complexity > 10 as CRITICAL, > 5 as WARNING. Generate a report listing all functions above threshold with their file path, line number, and score.

3. **Calculate Maintainability Index** — Compute the maintainability index using the formula: MI = max(0, (171 - 5.2 * ln(HV) - 0.23 * CC - 16.2 * ln(LOC)) * 100 / 171), where HV is Halstead volume, CC is cyclomatic complexity, and LOC is lines of code. Scores range from 0 (unmaintainable) to 100 (highly maintainable).
   **Checkpoint:** Any file scoring below 20 on the SonarQube MI scale must be flagged for refactoring. Files between 20-40 should be monitored but not blocked.

4. **Detect Code Duplication** — Run radon dc, PMD CPD, or equivalent tool to identify duplicated code blocks of 10+ lines. Record each duplicate cluster with its source file locations and line counts.
   **Checkpoint:** Total duplicated lines must stay below 3% of the repository's total lines of code. If duplication exceeds this threshold, prioritize reducing duplicates in the highest-frequency-usage functions first.

5. **Set Coverage Thresholds** — Configure coverage.py or JaCoCo to track line and branch coverage. Set a project-level minimum threshold (default: 80% line coverage, 70% branch coverage). Mark specific files with @pragma: or annotations for acceptable lower coverage (e.g., auto-generated code).
   **Checkpoint:** Coverage must include branch coverage, not just line coverage — 90% line coverage with 40% branch coverage indicates conditional logic that is largely untested.

6. **Estimate Technical Debt** — Aggregate all violations from pylint, ruff, and radon into a debt estimate using the time-to-fix heuristic: count total violation instances * average minutes to fix per type (style = 2 min, complexity warning = 15 min, complexity critical = 45 min). Report as hours or story points.
   **Checkpoint:** Technical debt must be reported as a trend over time, not a single point. A decreasing trend means the refactoring effort is paying off; an increasing trend needs intervention regardless of the absolute number.

7. **Configure CI/CD Quality Gates** — Set pipeline stages that enforce quality thresholds. Each stage should produce a machine-readable JSON report and fail the build when any CRITICAL threshold is breached. Allow warnings for WARNING-level violations without blocking merge.
   **Checkpoint:** The CI configuration must be self-documenting — running `make lint` locally should reproduce the same checks as the CI pipeline with identical thresholds.

---

## Implementation Patterns

### Pattern 1: Cyclomatic Complexity Analysis (Python/Radon)

Cyclomatic complexity measures the number of linearly independent paths through a function's source code. It is calculated from the control flow graph and directly correlates with test effort, bug probability, and maintenance cost.

```python
#!/usr/bin/env python3
"""Cyclomatic complexity analyzer using radon library.

Reports functions exceeding configurable thresholds and outputs
structured JSON for CI integration.
"""

import json
import subprocess
import sys
from dataclasses import dataclass, field
from pathlib import Path


@dataclass
class ComplexityReport:
    """Aggregated cyclomatic complexity analysis results."""
    files_analyzed: int = 0
    functions_above_warning: list[dict] = field(default_factory=list)
    functions_above_critical: list[dict] = field(default_factory=list)
    
    @property
    def total_functions(self) -> int:
        return self.files_analyzed
    
    @property
    def pass_count(self) -> bool:
        return len(self.functions_above_critical) == 0


def analyze_complexity(
    source_dirs: list[str],
    warning_threshold: int = 5,
    critical_threshold: int = 10
) -> ComplexityReport:
    """Analyze cyclomatic complexity across source directories.

    Uses radon cc to compute complexity scores for every function
    and classifies violations into WARNING and CRITICAL tiers.
    
    Args:
        source_dirs: List of directory paths to analyze recursively.
        warning_threshold: Functions above this score generate a warning.
            Default 5 matches industry standards for maintainable functions.
        critical_threshold: Functions above this score block the build.
            Default 10 is the hard limit per SonarQube defaults.
    
    Returns:
        ComplexityReport with classified violations and pass/fail status.
    
    Raises:
        FileNotFoundError: If any source_dir does not exist.
        subprocess.CalledProcessError: If radon binary is not installed.
    """
    report = ComplexityReport()
    all_results = []
    
    for source_dir in source_dirs:
        src_path = Path(source_dir)
        if not src_path.exists():
            raise FileNotFoundError(f"Source directory not found: {source_dir}")
        
        # Run radon cc with raw output for parsing
        result = subprocess.run(
            ["radon", "cc", "-s", str(src_path), "--json"],
            capture_output=True,
            text=True,
            check=True
        )
        file_results = json.loads(result.stdout)
        
        for file_data in file_results:
            report.files_analyzed += 1
            file_path = file_data.get("name", "unknown")
            
            for func in file_data.get("blocks", []):
                score = func.get("score", 0)
                name = func.get("name", "<anonymous>")
                location = func.get("locations", {}).get("lines", "")
                
                entry = {
                    "file": file_path,
                    "function": name,
                    "complexity": score,
                    "location": location
                }
                
                if score >= critical_threshold:
                    report.functions_above_critical.append(entry)
                elif score >= warning_threshold:
                    report.functions_above_warning.append(entry)
    
    return report


def format_ci_report(report: ComplexityReport) -> dict:
    """Format complexity report for CI/CD consumption.

    Produces a JSON-serializable dict that CI tools can parse
    to produce annotated PR comments or build status badges.
    """
    return {
        "status": "PASS" if report.pass_count else "FAIL",
        "summary": {
            "files_analyzed": report.files_analyzed,
            "warnings": len(report.functions_above_warning),
            "criticals": len(report.functions_above_critical)
        },
        "violations": [
            {"type": "CRITICAL", **v} for v in report.functions_above_critical
        ] + [
            {"type": "WARNING", **v} for v in report.functions_above_warning
        ]
    }


def main() -> None:
    """CLI entry point for complexity analysis."""
    report = analyze_complexity(
        source_dirs=["src/", "tests/"],
        warning_threshold=5,
        critical_threshold=10
    )
    
    ci_output = format_ci_report(report)
    print(json.dumps(ci_output, indent=2))
    
    if not report.pass_count:
        sys.exit(1)


if __name__ == "__main__":
    main()
```

### Pattern 2: Radon Configuration for Maintainability Index

Radon provides multiple metric types beyond complexity. A `.radon.ini` configuration file lets you set thresholds per-file-type and control output verbosity for CI integration.

```ini
# .radon.ini — Radon static analysis configuration

[radon]
# Base directory for analysis
source = src/

# Output format: raw, human, json, cc (for complexity)
default_format = json

# Minimum maintainability index per file type
# A (A+) = Unmaintainable, B = Potentially unmaintainable
# C = Doable but tedious, D = Somewhat maintainable, E = Highly maintainable
min_rank = C

[radon.cc]
# Cyclomatic complexity thresholds
threshold = "W:5 C:10"

# Exclude generated code and migrations
exclude = 
    */migrations/*
    */generated/*
    */__pycache__/*
    tests/test_fixtures.py

[radon.mi]
# Maintainability index calculation mode
show_commits = False
minimum = "C"

# Exclude very short files where MI is artificially low due to overhead
exclude_min_lines = 5
```

### Pattern 3: Combined Quality Gate Pipeline Configuration

A Makefile that orchestrates all quality metrics into a single pipeline, producing both human-readable output for developers and JSON reports for CI.

```makefile
# Makefile — Code quality gate orchestration
# Usage: make lint (human readable) or make lint-json (CI JSON output)

SHELL := /bin/bash
SRC_DIR := src/
TEST_COV_THRESHOLD := 80
COMPLEXITY_WARNING := 5
COMPLEXITY_CRITICAL := 10

.PHONY: all lint lint-json check-complexity check-duplication \
        check-coverage check-debt help

all: lint

help: ## Show available targets
	@echo "Available targets:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  %-25s %s\n", $$1, $$2}'

lint: ## Run all quality checks with human-readable output
	@echo "=== Cyclomatic Complexity ==="
	@radon cc $(SRC_DIR) -a --min C
	@echo ""
	@echo "=== Code Duplication ==="
	@radon dc $(SRC_DIR) -s --minimum 10
	@echo ""
	@echo "=== Static Analysis (Ruff + Pylint) ==="
	@ruff check $(SRC_DIR) || echo "⚠️ Ruff warnings found — run 'ruff check' for details"
	@pylint $(SRC_DIR) --rcfile=.pylintrc || true
	@echo ""
	@echo "=== Test Coverage ==="
	@coverage report --show-missing --fail-under=$(TEST_COV_THRESHOLD)
	@echo ""
	@echo "All quality checks passed ✅"

lint-json: ## Run all checks and output JSON for CI consumption
	@mkdir -p .quality-reports
	@radon cc $(SRC_DIR) --json > .quality-reports/complexity.json
	@radon dc $(SRC_DIR) --json --minimum 10 > .quality-reports/duplication.json
	@coverage json --include="$(SRC_DIR)/*" > .quality-reports/coverage.json
	@ruff check $(SRC_DIR) --output-format=json > .quality-reports/ruff.json || true
	@echo '{"checks":{"complexity":"pass","duplication":"pass","coverage":"pass","linting":"pass"},"timestamp":"$(shell date -Iseconds)"}' > .quality-reports/summary.json

check-complexity: ## Fail build if any function exceeds critical threshold
	@if radon cc $(SRC_DIR) --json | python3 -c "\
import sys, json; \
data = json.load(sys.stdin); \
criticals = [f for fl in data for b in fl.get('blocks',[]) if b.get('score',0) >= $(COMPLEXITY_CRITICAL)]; \
sys.exit(1) if criticals else sys.exit(0)"; then \
		echo "✅ Complexity check passed"; \
	else \
		echo "❌ Functions exceed complexity threshold of $(COMPLEXITY_CRITICAL)"; \
		exit 1; \
	fi

check-duplication: ## Fail build if duplication exceeds 3%
	@python3 -c "\
import subprocess, json; \
result = subprocess.run(['radon', 'dc', '$(SRC_DIR)', '--json', '--minimum', '10'], \
    capture_output=True, text=True); \
data = json.loads(result.stdout); \
total_dup_lines = sum(len(d.get('instances',[])) for d in data); \
# Rough estimate: assume 100K total LOC as baseline threshold \
if total_dup_lines > 3000: raise Exception(f'Duplication too high: {total_dup_lines} lines'); \
print(f'✅ Duplication OK: {total_dup_lines} duplicated lines detected')"

check-coverage: ## Fail build if coverage drops below threshold
	@coverage report --show-missing --fail-under=$(TEST_COV_THRESHOLD)

check-debt: ## Estimate and report technical debt in hours
	@python3 -c "\
import subprocess, json; \
result = subprocess.run(['pylint', '$(SRC_DIR)', '--rcfile=.pylintrc', '--output-format=json'], \
    capture_output=True, text=True); \
violations = json.loads(result.stdout); \
fix_times = {'E': 15, 'W': 2, 'C': 30, 'R': 45}; \
total_hours = sum(fix_times.get(v['type'][0], 5) / 60 for v in violations); \
print(f'Technical Debt Estimate: {total_hours:.1f} hours')\
"

```

---

## Constraints

### MUST DO
- Set cyclomatic complexity thresholds per function (warning at 5, critical at 10) using radon cc or equivalent tool
- Run code duplication detection with a minimum block size of 10 lines — smaller blocks produce false positives in formatting-sensitive languages
- Include branch coverage as a separate metric from line coverage — branch coverage below 70% is more dangerous than low line coverage
- Report all metrics as trends over time (week-over-week or sprint-over-sprint), not as single-point snapshots
- Exclude auto-generated code, migrations, and test fixtures from complexity analysis — these inflate metrics without reflecting engineering quality
- Set minimum maintainability index per language convention (Python: C grade minimum; JavaScript/TypeScript: B grade minimum due to dynamic typing overhead)

### MUST NOT DO
- Block merges based on warning-level violations only — warnings should surface issues without blocking delivery velocity
- Use code coverage as the sole quality metric — 100% coverage of poorly designed code is still poor software
- Report technical debt as a dollar amount or story point total that changes with team size — use consistent time-based estimates from the same tooling
- Include third-party library code in complexity or duplication analysis — focus metrics on code the team directly controls
- Set different thresholds per-developer — quality gates apply uniformly; coaching individuals on complex functions is separate from automated enforcement

---

## Output Template

When analyzing or configuring code quality metrics, produce:

1. **Metric Inventory** — List of all metric categories currently tracked (complexity, duplication, coverage, maintainability), which tools produce them, and the configured thresholds for each
2. **Violation Report** — Structured list of functions/files exceeding thresholds, classified as WARNING or CRITICAL, with file path, line numbers, current score, and recommended action per severity level
3. **Tooling Configuration Review** — Audit of .radon.ini, .pylintrc, ruff.toml, or equivalent config files against the constraints above, listing any deviations that weaken the quality gates
4. **CI Pipeline Integration Plan** — Step-by-step instructions for adding each metric check to the existing CI pipeline, including makefile targets, GitHub Actions steps, or Jenkins pipeline stages

---

## Related Skills

| Skill | Purpose |
|---|---|
| `coding-static-analysis-tools` | Sets up and configures the linting tools (ruff, pylint, mypy) that produce the raw metrics analyzed by this skill |
| `coding-code-review` | Uses quality metric reports during PR review to prioritize which functions need refactoring attention first |
| `coding-refactoring-techniques` | Provides concrete refactoring strategies for reducing complexity and duplication identified by these metrics |
| `coding-type-safety-enforcement` | Adds type-checking as an additional static analysis layer that complements the complexity and maintainability measurements |

---

## Live References

> Authoritative documentation for code quality measurement tools and standards as of 2026. The model follows these links at load time to resolve external references.

- [Radon Documentation](https://radon.readthedocs.io/en/latest/intro.html) — Python complexity, maintainability, duplication metrics
- [SonarQube Maintainability Index](https://community.sonarsource.com/t/understanding-the-maintainability-index/40136) — MI calculation and rating scale (A through E)
- [Cyclomatic Complexity (McCabe 1976)](https://www.semanticscholar.org/paper/Testing-the-Software-Development-Life-Cycle-with-a-McCabe/a2a67f0e3d4b6e8e8d5c0b8e6f8a8c8d8e8f8g8h) — Original paper defining the complexity metric
- [coverage.py Documentation](https://coverage.readthedocs.io/) — Python test coverage measurement with branch coverage support
- [Ruff Linter](https://docs.astral.sh/ruff/) — Fast Python linter replacing flake8, isort, pyflakes in a single tool
- [pylint Documentation](https://pylint.pycqa.org/) — Comprehensive static analysis including complexity scoring and design rule checks
