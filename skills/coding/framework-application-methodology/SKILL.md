---




name: framework-application-methodology
description: Systematically learns, evaluates, and applies new software frameworks using proven methodology — source code analysis, prototype validation, pattern mapping, and iterative adoption for maximum engineering impact.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: framework application, how do i learn a new framework, framework evaluation, framework adoption, source code analysis, framework comparison, prototype validation, how do i adopt a new library
  archetypes:
    - tactical
    - educational
  anti_triggers:
    - brainstorming
    - vague ideation
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, examples, do-dont]
  related-skills: coding-framework-design-patterns, coding-knowledge-transfer-methods




---





# Framework Application Methodology

Makes the model systematically learn, evaluate, and apply new software frameworks to production systems. When loaded, this skill enforces a disciplined seven-step workflow that moves from source code scanning through prototype validation to hardened integration — preventing half-understood framework adoption from leaking into codebases.

## TL;DR Checklist

- [ ] Scan the framework's repository: identify entry points, public API surface, and dependency graph
- [ ] Map dependencies to your project stack — flag incompatibilities before writing any prototype
- [ ] Scaffold a disposable prototype that exercises the framework's core workflows end-to-end
- [ ] Identify 3–5 patterns the framework enforces and compare them against your existing patterns
- [ ] Draft an integration plan with migration boundaries, fallback paths, and rollback criteria
- [ ] Validate the prototype against real-world data — not synthetic test fixtures
- [ ] Harden the production wrapper with type safety, error handling, and observability hooks

---

## When to Use

Use this skill when:

- Evaluating a new framework (e.g., FastAPI vs Flask, Pydantic v2 vs v1, React 19 vs Next.js 15) before committing to adoption
- Migrating from one framework version to a major next release with breaking API changes
- Integrating a third-party SDK that requires understanding its internal behavior and extension points
- Onboarding a team onto a newly selected framework — structured learning beats documentation dumping
- Deciding whether to wrap an opaque framework behind your own abstraction layer to preserve swapability

---

## When NOT to Use

Avoid this skill for:

- **Trivial library adoption** — Adding `pydantic` as a dependency without architectural impact needs `pip install`, not a seven-step methodology
- **One-off scripts or throwaway PoCs** where long-term maintainability is irrelevant
- **When the framework is already adopted and understood** — this skill is for learning/evaluation, not daily usage

---

## Core Workflow

### 1. Source Code Scanning — Extract the Public API Surface

Clone or fetch the framework repository and build a dependency tree from its entry points. Walk the import graph to identify exported symbols, public classes, and documented hooks. Ignore internal modules (those prefixed with `_` or in `internal/` directories).

```python
from pathlib import Path
import ast
import sys
from dataclasses import dataclass, field


@dataclass(frozen=True)
class FrameworkComponent:
    """Represents a discovered framework component."""
    name: str
    module_path: str
    kind: str  # "class", "function", "decorator", "context_manager"
    doc_summary: str = ""
    is_public: bool = True


def scan_framework_source(repo_root: Path, depth: int = 3) -> dict[str, list[FrameworkComponent]]:
    """Scan a framework's source tree and extract its public API surface.

    Walks up to *depth* directories from *repo_root*, parses each .py file,
    and returns a mapping of module path → discovered components.

    Args:
        repo_root: Root directory of the cloned framework repository.
        depth: Maximum subdirectory depth to traverse.

    Returns:
        Mapping of dotted module paths to their public components.
    """
    results: dict[str, list[FrameworkComponent]] = {}

    if not repo_root.is_dir():
        raise ValueError(f"Not a directory: {repo_root}")

    visited_depths: dict[Path, int] = {}

    def _walk(current: Path, current_depth: int) -> None:
        if current_depth > depth:
            return
        if not current.is_dir():
            return
        # Skip common non-source directories
        skip_dirs = {"tests", "test", "docs", "examples", ".git", "__pycache__", "node_modules"}
        for item in sorted(current.iterdir()):
            if item.name.startswith("_") and item.is_dir():
                continue
            if item.name in skip_dirs:
                continue

            if item.is_file() and item.suffix == ".py" and not item.name.startswith("_"):
                _parse_file(item, current, visited_depths, current_depth, results)
            elif item.is_dir():
                visited_depths[item] = current_depth + 1
                _walk(item, current_depth + 1)

    def _parse_file(file_path: Path, parent_dir: Path, depths: dict[Path, int],
                    file_depth: int, results: dict[str, list[FrameworkComponent]]) -> None:
        try:
            source = file_path.read_text(encoding="utf-8")
            tree = ast.parse(source, filename=str(file_path))
        except (SyntaxError, UnicodeDecodeError):
            return

        dotted_module = str(file_path.relative_to(parent_dir.parent).with_suffix("")).replace("/", ".")

        components: list[FrameworkComponent] = []
        for node in ast.walk(tree):
            if isinstance(node, ast.ClassDef) and not node.name.startswith("_"):
                doc = ast.get_docstring(node) or ""
                components.append(FrameworkComponent(
                    name=node.name, module_path=dotted_module, kind="class",
                    doc_summary=doc[:120]
                ))
            elif isinstance(node, ast.FunctionDef) and not node.name.startswith("_"):
                # Only top-level functions
                if isinstance(node.parent, ast.Module):  # type: ignore[attr-defined]
                    doc = ast.get_docstring(node) or ""
                    components.append(FrameworkComponent(
                        name=node.name, module_path=dotted_module, kind="function",
                        doc_summary=doc[:120]
                    ))

        if components:
            results[dotted_module] = components

    _walk(repo_root, 0)
    return results
```

**Checkpoint:** You have a dictionary of all public modules and their exported symbols. If the framework has more than 200 public API items, reduce scope by focusing only on the core subsystem you intend to use.

---

### 2. Dependency Mapping — Check Stack Compatibility

Extract the framework's declared dependencies from `setup.py`, `pyproject.toml`, or `requirements.txt`. Cross-reference each dependency version against your project's constraint file. Flag any conflict where a required minimum version exceeds your current pinned version.

```python
import tomllib
from pathlib import Path
from dataclasses import dataclass


@dataclass(frozen=True)
class DependencyConflict:
    """Represents a resolved or potential dependency conflict."""
    package: str
    framework_requires: str
    project_has: str
    severity: str  # "blocker", "warning", "info"


def analyze_dependencies(
    framework_toml: Path,
    project_toml: Path | None = None,
) -> dict[str, list[DependencyConflict]]:
    """Compare framework dependencies against the consuming project.

    Args:
        framework_toml: Path to the framework's pyproject.toml or setup.cfg.
        project_toml: Optional path to the consuming project's config.

    Returns:
        Mapping of dependency name → list of conflict records.
    """
    with open(framework_toml, "rb") as fh:
        fw_data = tomllib.load(fh)

    fw_deps: dict[str, str] = {}
    for dep_list_key in ("project.dependencies", "tool.poetry.dependencies"):
        parts = dep_list_key.split(".")
        obj = fw_data
        for part in parts:
            obj = obj.get(part, {})
        if isinstance(obj, list):
            for dep_str in obj:
                pkg, _, ver = dep_str.partition(" ")
                fw_deps[pkg.lower()] = ver.strip()
        elif isinstance(obj, dict):
            for pkg, spec in obj.items():
                fw_deps[pkg.lower()] = str(spec) if spec else "*"

    project_deps: dict[str, str] = {}
    if project_toml and project_toml.exists():
        with open(project_toml, "rb") as fh:
            proj_data = tomllib.load(fh)
        for dep_list_key in ("project.dependencies", "tool.poetry.dependencies"):
            parts = dep_list_key.split(".")
            obj = proj_data
            for part in parts:
                obj = obj.get(part, {})
            if isinstance(obj, dict):
                for pkg, spec in obj.items():
                    project_deps[pkg.lower()] = str(spec) if spec else "*"

    conflicts: dict[str, list[DependencyConflict]] = {}
    for pkg, fw_ver in sorted(fw_deps.items()):
        if pkg in project_deps:
            proj_ver = project_deps[pkg]
            if fw_ver != "*" and proj_ver != "*":
                # Simple string comparison — real projects would use packaging.version
                if fw_ver != proj_ver:
                    severity = "warning" if fw_ver.startswith(">=") else "blocker"
                    conflicts.setdefault(pkg, []).append(DependencyConflict(
                        package=pkg, framework_requires=fw_ver,
                        project_has=proj_ver, severity=severity
                    ))

    return conflicts
```

**Checkpoint:** All blocker-severity conflicts are resolved before proceeding. Document warnings for review but do not block the prototype phase on them.

---

### 3. Prototype Scaffolding — Build a Disposable Test Harness

Create an isolated repository or subdirectory for your prototype. It must exercise the framework's primary workflow with realistic data shapes, not toy examples. Include explicit version pins so the prototype is reproducible.

```python
from pathlib import Path
from textwrap import dedent


def scaffold_prototype(target_dir: Path, framework_name: str, core_features: list[str]) -> None:
    """Create a disposable prototype harness for evaluating a framework.

    Args:
        target_dir: Directory to create the prototype in (created if missing).
        framework_name: Canonical name of the framework being evaluated.
        core_features: List of feature names that must be exercised end-to-end.
    """
    target_dir.mkdir(parents=True, exist_ok=True)

    # pyproject.toml with pinned versions
    pyproject_content = dedent(f"""\
        [project]
        name = "framework-eval-{framework_name}"
        version = "0.1.0"
        requires-python = ">=3.12"
        dependencies = []

        [tool.pytest.ini_options]
        testpaths = ["tests"]
        """)
    (target_dir / "pyproject.toml").write_text(pyproject_content, encoding="utf-8")

    # Main evaluation script
    main_path = target_dir / "evaluate.py"
    features_section = "\n".join(f'    "{f}",' for f in core_features)
    main_content = dedent(f"""\
        \"\"\"Discrete evaluation harness for {framework_name}.

        Each feature in CORE_FEATURES is tested independently.
        Failures are recorded but do not abort the full run.
        \"\"\"
        from dataclasses import dataclass, field
        from datetime import datetime


        @dataclass
        class FeatureResult:
            name: str
            passed: bool
            duration_ms: float
            error: str | None = None


        CORE_FEATURES = [
    {features_section}
        ]


        async def run_all_evaluations() -> list[FeatureResult]:
            \"\"\"Execute all feature evaluations and return results.\"\"\"
            results: list[FeatureResult] = []

            for feature in CORE_FEATURES:
                start = datetime.now()
                try:
                    # Import the framework-specific test module
                    importlib.import_module(f"tests.test_{feature}")
                    passed = True
                    error = None
                except ImportError as exc:
                    passed = False
                    error = str(exc)
                except Exception as exc:
                    passed = False
                    error = f"Runtime error: {exc}"

                duration = (datetime.now() - start).total_seconds() * 1000
                results.append(FeatureResult(
                    name=feature, passed=passed,
                    duration_ms=duration, error=error
                ))

            return results


        if __name__ == "__main__":
            import asyncio
            results = asyncio.run(run_all_evaluations())
            for r in results:
                status = "PASS" if r.passed else f"FAIL ({r.error})"
                print(f"[{status}] {r.name} ({r.duration_ms:.0f}ms)")
    """)
    main_path.write_text(main_content, encoding="utf-8")

    # Test directory skeleton
    tests_dir = target_dir / "tests"
    tests_dir.mkdir(exist_ok=True)
    (tests_dir / "__init__.py").write_text("", encoding="utf-8")

    for feature in core_features:
        test_file = tests_dir / f"test_{feature}.py"
        test_content = dedent(f"""\
            \"\"\"Evaluation test for the {feature} capability.\"\"\"


            async def test_{feature.replace('-','_')}_core():
                \"\"\"Verify the core behavior of {feature}.\"\"\"
                # Replace with actual framework interaction
                assert True, "{feature} evaluation placeholder — implement real assertions"
        """)
        test_file.write_text(test_content, encoding="utf-8")

    print(f"Prototype scaffolded at {target_dir}")
```

**Checkpoint:** The prototype directory contains a runnable `evaluate.py` script with pinned versions. Running it should produce output even if tests are placeholders — the scaffolding itself must be syntactically valid.

---

### 4. Pattern Identification — Map Framework Enforced Patterns to Your Codebase

Read the framework's documentation and examples to identify its *enforced* patterns — conventions it makes hard to avoid, not optional style choices. Document each pattern as a pair: what the framework requires, how your current code handles it, and whether migration is feasible without rewrite.

| Pattern Category | Framework Requirement | Your Current Approach | Migration Cost |
|-----------------|----------------------|-----------------------|----------------|
| Lifecycle hooks | Must define init/destroy functions | Class-based initialization | Low (adapter wrapper) |
| Data validation | Decorator-based schema declarations | Manual `if/else` checks | Medium (parallel run) |
| Error handling | Exception hierarchy with retry middleware | Custom try/except chains | High (distributed changes) |

**Checkpoint:** You have a documented comparison for every major pattern the framework enforces. If migration cost is "high" for more than two patterns, consider wrapping the framework behind your own abstraction instead of inlining it.

---

### 5. Integration Planning — Define Boundaries and Fallbacks

Before writing production code, produce an integration plan document that specifies:
- **Migration boundary**: Which module or layer absorbs the framework first
- **Fallback path**: How to revert if the framework proves unsuitable after two weeks of production use
- **Rollback criteria**: Concrete metrics (error rate increase > 0.5%, p95 latency increase > 100ms) that trigger rollback

```python
from dataclasses import dataclass, field
from enum import Enum


class MigrationStrategy(Enum):
    STRANGLE_LEGACY = "strangle"       # Gradually replace old code alongside new
    BIG_BANG = "big_bang"              # Swap entire module at once
    ADAPTER_WRAP = "adapter_wrap"      # Wrap framework behind internal API
    PARALLEL_RUN = "parallel_run"      # Run both systems, compare outputs


@dataclass(frozen=True)
class RollbackCriterion:
    """A metric threshold that triggers automatic rollback."""
    metric_name: str
    direction: str  # "above" or "below"
    threshold: float
    evaluation_window_minutes: int = 30


@dataclass
class IntegrationPlan:
    """Structured plan for introducing a framework into production.

    Attributes:
        migration_boundary: Module path that absorbs the framework first.
        strategy: Migration approach to use.
        fallback_path: Instructions and code references for reverting changes.
        rollback_criteria: List of metrics that trigger automatic rollback.
        estimated_effort_hours: Human-readable effort estimate.
    """
    migration_boundary: str
        strategy: MigrationStrategy = MigrationStrategy.STRANGLE_LEGACY
        fallback_path: str = ""
        rollback_criteria: list[RollbackCriterion] = field(default_factory=list)
        estimated_effort_hours: float = 0.0

    def validate(self) -> list[str]:
        """Return a list of validation issues (empty if plan is sound)."""
        issues: list[str] = []

        if not self.migration_boundary or "." not in self.migration_boundary:
            issues.append("migration_boundary must be a dotted module path")

        if not self.fallback_path:
            issues.append("fallback_path must describe the revert procedure")

        if not self.rollback_criteria:
            issues.append("rollback_criteria must include at least one metric threshold")

        if self.estimated_effort_hours < 4.0:
            issues.append("estimated_effort_hours below 4h — likely underestimated for framework adoption")

        return issues


    def as_markdown(self) -> str:
        """Render the plan as a markdown summary for team review."""
        lines = [
            f"## Framework Integration Plan",
            f"",
            f"**Boundary:** `{self.migration_boundary}`",
            f"**Strategy:** {self.strategy.value}",
            f"**Effort Estimate:** {self.estimated_effort_hours}h",
            f"",
            f"### Rollback Triggers",
        ]
        for rc in self.rollback_criteria:
            lines.append(
                f"- {rc.metric_name}: roll back if {rc.direction} {rc.threshold}"
                f" (evaluated over {rc.evaluation_window_minutes}min window)"
            )
        return "\n".join(lines)
```

**Checkpoint:** The plan validates without issues. All rollback criteria have concrete numeric thresholds — no "if things look bad" language allowed.

---

### 6. Iterative Validation — Test Against Real Data, Not Synthetics

Replace placeholder fixtures with anonymized production data samples. Run the prototype against at least 100 real records and measure: correctness of output, memory footprint during processing, and execution time distribution (p50, p95, p99). Compare these baselines against your existing system's numbers.

```python
import asyncio
import statistics
from dataclasses import dataclass, field
from pathlib import Path


@dataclass(frozen=True)
class BenchmarkResult:
    """Results from a single validation run."""
    record_count: int
    success_rate: float  # 0.0–1.0
    p50_ms: float
    p95_ms: float
    p99_ms: float
    memory_peak_mb: float


async def benchmark_against_real_data(
    framework_callable,
    data_path: Path,
    batch_size: int = 50,
) -> BenchmarkResult:
    """Run the framework function against real production data samples.

    Args:
        framework_callable: Async callable accepting a list of records.
        data_path: Path to a JSONL or CSV file with anonymized production records.
        batch_size: Number of records to process per call iteration.

    Returns:
        Aggregated benchmark metrics across all batches.
    """
    if not data_path.exists():
        raise FileNotFoundError(f"Data file not found: {data_path}")

    # Simple JSONL reader — adapt format as needed
    raw_records = []
    with open(data_path, "r", encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if line:
                import json
                raw_records.append(json.loads(line))

    if not raw_records:
        raise ValueError(f"No records found in {data_path}")

    latencies_ms: list[float] = []
    success_count = 0
    total_processed = 0

    for i in range(0, len(raw_records), batch_size):
        batch = raw_records[i:i + batch_size]
        try:
            import time
            start = time.monotonic()
            await framework_callable(batch)
            elapsed_ms = (time.monotonic() - start) * 1000
            latencies_ms.append(elapsed_ms)
            success_count += 1
            total_processed += len(batch)
        except Exception as exc:
            print(f"Batch {i // batch_size} failed: {exc}")

    if not latencies_ms:
        raise RuntimeError("All batches failed — no benchmark data collected")

    sorted_latencies = sorted(latencies_ms)
    n = len(sorted_latencies)

    return BenchmarkResult(
        record_count=total_processed,
        success_rate=success_count / max(total_processed, 1),
        p50_ms=sorted_latencies[int(n * 0.50)],
        p95_ms=sorted_latencies[min(int(n * 0.95), n - 1)],
        p99_ms=sorted_latencies[min(int(n * 0.99), n - 1)],
        memory_peak_mb=0.0,  # Use tracemalloc for actual measurement
    )
```

**Checkpoint:** All real-data benchmarks pass with a success rate ≥ 0.95. Latency percentiles are documented and compared to the existing system's numbers. If p95 degrades > 2×, pause integration and investigate before proceeding.

---

### 7. Production Hardening — Add Type Safety, Error Handling, and Observability

Wrap the framework interaction behind your own typed interface. Every public method on your wrapper must have type hints and docstrings. Add structured error handling that converts framework-specific exceptions into your domain's exception hierarchy. Inject observability hooks (metrics counters, trace spans) so you can monitor framework behavior in production.

```python
from __future__ import annotations

import logging
import time
from contextlib import contextmanager
from dataclasses import dataclass
from typing import Any, Protocol, TypeVar


logger = logging.getLogger(__name__)

T = TypeVar("T")


class FrameworkMetricEmitter(Protocol):
    """Interface for emitting framework-specific metrics."""

    def count(self, name: str, value: float = 1.0, tags: dict[str, str] | None = None) -> None: ...
    def timer(self, name: str, value_ms: float, tags: dict[str, str] | None = None) -> None: ...


@dataclass(frozen=True)
class FrameworkError(Exception):
    """Domain-level error wrapping an underlying framework exception."""

    operation: str
    original_error: Exception
    context: dict[str, Any] = field(default_factory=dict)

    def __str__(self) -> str:
        return (
            f"FrameworkError(op={self.operation!r}, ctx={self.context}) — "
            f"caused by {type(self.original_error).__name__}: {self.original_error}"
        )


class FrameworkAdapter:
    """Production-hardened adapter wrapping a third-party framework.

    Provides typed methods, structured error translation, and metric emission.

    Attributes:
        framework: The underlying framework instance or callable.
        metrics: Optional metric emitter for production observability.
    """

    def __init__(self, framework: Any, metrics: FrameworkMetricEmitter | None = None) -> None:
        self._framework = framework
        self._metrics = metrics

    @contextmanager
    def _timed_operation(self, operation_name: str) -> Any:
        """Context manager that emits timing metrics for a framework operation."""
        start = time.monotonic()
        try:
            yield
        finally:
            elapsed_ms = (time.monotonic() - start) * 1000
            if self._metrics:
                self._metrics.timer(f"framework.{operation_name}.duration_ms", elapsed_ms)

    def process(self, input_data: dict[str, Any]) -> dict[str, Any]:
        """Execute the framework's core processing pipeline.

        Converts framework exceptions into FrameworkError with full context
        and emits timing/count metrics via the injected emitter.

        Args:
            input_data: The structured input payload to process.

        Returns:
            Processed output dictionary matching the framework's response schema.

        Raises:
            FrameworkError: If the framework call fails at any point.
        """
        operation = "process"
        context = {"input_keys": list(input_data.keys()), "input_size_bytes": len(str(input_data))}

        try:
            with self._timed_operation(operation):
                if self._metrics:
                    self._metrics.count(f"framework.{operation}.calls")
                result = self._framework.process(input_data)  # type: ignore[attr-defined]
                return result
        except Exception as exc:
            logger.exception("Framework call failed for operation=%s", operation, extra=context)
            raise FrameworkError(
                operation=operation, original_error=exc, context=context
            ) from exc

    def validate(self, schema: dict[str, Any]) -> bool:
        """Validate input data against a schema before framework submission.

        Args:
            schema: A dictionary describing expected key types and constraints.

        Returns:
            True if all keys match their declared types; False otherwise.
        """
        for key, expected_type in schema.items():
            if key not in self._framework.config.get("required_keys", []):  # type: ignore[attr-defined]
                continue
            value = schema.get(key)
            if not isinstance(value, expected_type):
                logger.warning(
                    "Schema mismatch for %s: expected %s, got %s",
                    key, expected_type.__name__, type(value).__name__
                )
                return False
        return True
```

**Checkpoint:** Every public method on your adapter has type hints, a docstring, and error handling. The `FrameworkError` exception carries full operation context for production debugging. Metrics are wired in (even if the emitter is a no-op during development).

---

## Implementation Patterns

### Pattern 1: Framework Comparison Matrix Generator

When evaluating multiple frameworks side by side, use this generator to produce an automated comparison matrix from structured evaluation criteria.

```python
from dataclasses import dataclass, field
from enum import Enum


class CriterionCategory(Enum):
    PERFORMANCE = "performance"
    ERGONOMICS = "ergonomics"
    ECOSYSTEM = "ecosystem"
    LEARNING_CURVE = "learning_curve"


@dataclass(frozen=True)
class Criterion:
    name: str
    category: CriterionCategory
    weight: float  # 0.1–1.0, sum of weights per category must equal 1.0
    ideal_value: float  # Higher is better (normalized to 0-1 scale)


@dataclass
class FrameworkScore:
    """Aggregated score for a single framework candidate."""
    name: str
    category_scores: dict[str, float] = field(default_factory=dict)
    weighted_total: float = 0.0
    details: list[tuple[str, CriterionCategory, float]] = field(default_factory=list)

    def add_score(self, criterion: Criterion, raw_score: float) -> None:
        """Record a raw score (0-10) and compute normalized contribution."""
        normalized = raw_score / 10.0
        self.details.append((criterion.name, criterion.category, normalized))
        category_key = criterion.category.value
        if category_key not in self.category_scores:
            self.category_scores[category_key] = 0.0
        self.category_scores[category_key] += normalized * criterion.weight

    def finalize(self) -> None:
        """Normalize category scores and compute the weighted total."""
        for cat_key in self.category_scores:
            self.category_scores[cat_key] = round(min(self.category_scores[cat_key], 1.0), 4)
        self.weighted_total = round(sum(self.category_scores.values()), 4)


def score_frameworks(
    candidates: list[str],
    criteria: list[Criterion],
    scores_map: dict[str, dict[str, float]],
) -> list[FrameworkScore]:
    """Score multiple frameworks against the same criterion set.

    Args:
        candidates: Framework names to evaluate.
        criteria: Ordered list of evaluation criteria with weights.
        scores_map: Mapping of framework name → {criterion_name: raw_score_0_10}.

    Returns:
        Ranked list of FrameworkScore objects (highest total first).
    """
    results: list[FrameworkScore] = []

    for candidate in candidates:
        score_obj = FrameworkScore(name=candidate)
        framework_scores = scores_map.get(candidate, {})

        for criterion in criteria:
            raw = framework_scores.get(criterion.name, 0.0)
            score_obj.add_score(criterion, raw)

        score_obj.finalize()
        results.append(score_obj)

    return sorted(results, key=lambda s: s.weighted_total, reverse=True)


# --- Usage Example ---
if __name__ == "__main__":
    criteria = [
        Criterion("Startup Time", CriterionCategory.PERFORMANCE, 0.3, 1.0),
        Criterion("Memory Overhead", CriterionCategory.PERFORMANCE, 0.2, 1.0),
        Criterion("API Clarity", CriterionCategory.ERGONOMICS, 0.4, 1.0),
        Criterion("Plugin Ecosystem", CriterionCategory.ECOSYSTEM, 0.3, 1.0),
        Criterion("Documentation Quality", CriterionCategory.LEARNING_CURVE, 0.5, 1.0),
    ]

    scores = {
        "FastAPI": {"Startup Time": 8, "Memory Overhead": 7, "API Clarity": 9,
                     "Plugin Ecosystem": 6, "Documentation Quality": 8},
        "Flask":   {"Startup Time": 7, "Memory Overhead": 9, "API Clarity": 7,
                     "Plugin Ecosystem": 9, "Documentation Quality": 8},
    }

    ranked = score_frameworks(["FastAPI", "Flask"], criteria, scores)
    for r in ranked:
        print(f"{r.name}: {r.weighted_total:.4f}")
        for cat, val in sorted(r.category_scores.items()):
            print(f"  {cat}: {val:.4f}")
```

**Checkpoint:** The comparison matrix produces a single numeric ranking with per-category breakdowns. If two frameworks score within 0.05 of each other, the tiebreaker is team preference — documented explicitly in your decision log.

---

## Constraints

### MUST DO
- Always start with source code scanning — never rely solely on documentation
- Pin framework versions in every prototype and integration attempt
- Run real-data validation before committing to any framework adoption decision
- Wrap opaque frameworks behind a typed adapter interface before exposing them to business logic
- Document rollback criteria with concrete numeric thresholds before going to production

### MUST NOT DO
- Never adopt a framework without identifying at least three migration boundary options
- Skip real-data benchmarking in favor of synthetic "hello world" tests
- Inline framework exceptions into your domain exception hierarchy without context enrichment
- Proceed to production integration if any dependency conflict is marked "blocker"
- Use the framework's default error handling in production — always add structured logging

---

## Output Template

When this skill is active, model output must contain:

1. **Framework Summary** — Name, version scanned, and top-level API surface count
2. **Dependency Analysis** — List of conflicts with severity classification
3. **Pattern Comparison Table** — Enforced patterns vs existing approaches with migration cost
4. **Integration Plan** — Migration boundary, strategy, rollback criteria in structured format
5. **Benchmark Results** — Real-data metrics (p50/p95/p99 latency, success rate) compared to baseline
6. **Recommendation** — Go/No-Go verdict with justification tied to the data above

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `extensible-framework-design` | Design your own extensible frameworks instead of adopting third-party ones |
| `coding-knowledge-transfer-methods` | Structured learning workflows for team-wide framework mastery after adoption |
| `coding-code-review` | Review framework integration code against quality and security standards |

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Agile Manifesto](https://agilemanifesto.org/)
- [Martin Fowler — Practical Agile](https://martinfowler.com/articles/practical%20agile.html)
- [Scrum Guide — Official Framework Reference](https://scrumguides.org/docs/scrumguide/v2020/2020-Scrum-Guide-US-Latin1v1.pdf)
- [SAFe Framework — Scaled Agile Inc.](https://scaledagile.com/framework/)
- [The Pragmatic Programmer (20th Anniversary Edition)](https://pragprog.com/titles/tpp20/the-pragmatic-programmer-20th-anniversary-edition/)
