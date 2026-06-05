---




name: framework-evaluation
description: Runs automated empirical evaluation of software frameworks through reproducible benchmark harnesses, dependency graph security auditing, integration feasibility testing, and maintenance cost modeling to produce quantitative selection data.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: framework selection, technology evaluation, choose a framework, compare frameworks, tech stack decision, benchmark harness, dependency audit, framework scoring
  archetypes:
    - tactical
    - diagnostic
  anti_triggers:
    - brainstorming
    - vague ideation
    - long-form architecture
    - code golf
  response_profile:
    verbosity: medium
    directive_strength: high
    abstraction_level: operational
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: framework-onboarding, framework-selection, framework-comparison-workflow, tool-evaluation-workflow




---





# Framework Evaluation Engine

Automates empirical evaluation of software frameworks through reproducible benchmark harnesses, dependency graph security auditing, integration feasibility testing, and maintenance cost modeling. When loaded, this skill makes the model act as a senior platform engineer — generating measurable, repeatable evaluation scripts that produce quantitative data (latency distributions, throughput percentiles, CVE severity scores, integration compatibility rates, TCO projections) to replace subjective framework debates with hard numbers.

## TL;DR Checklist

- [ ] Build automated benchmark harnesses that run each candidate against identical load profiles
- [ ] Run dependency graph audits: CVE lookup, license compliance, supply chain risk scoring
- [ ] Execute integration feasibility tests against your specific infrastructure stack
- [ ] Model 3-year maintenance costs using version history, breaking change rates, and community metrics
- [ ] Generate scaffold quality reports from each framework's CLI scaffolding tools
- [ ] Aggregate all quantitative results into a structured evaluation report JSON
- [ ] Feed the data into scoring matrices (use `framework-selection` for AHP-weighted decisions)

---

## When to Use

Use this skill when:

- Two or more frameworks need quantitative differentiation beyond theoretical feature comparisons
- Your team requires reproducible, auditable evidence for framework selection decisions
- Selecting a framework where performance characteristics directly impact SLA commitments
- Evaluating a framework that will be used across many services (scaling risk matters)
- A stakeholder needs hard numbers to justify or reject a framework recommendation
- Before committing to `framework-comparison-workflow` spike projects — this skill identifies which candidates are worth spiking
- Assessing supply chain risk for frameworks with deep dependency trees

---

## When NOT to Use

Avoid this skill for:

- First-time exploration of a completely unfamiliar domain — use `framework-utilization` or `modern-python-development` first to understand the landscape
- Micro-decisions where any reasonable tool would work equally well (overhead outweighs benefit)
- Frameworks that are already selected and in production — use `framework-performance-tuning` for optimization instead
- When requirements have not yet been elicited — go back to `framework-evaluation-criteria` first
- For evaluating infrastructure tools (CI runners, container runtimes) unless they are also application frameworks

---

## Core Workflow

### Step 1: Generate Automated Benchmark Harnesses

For each framework candidate under evaluation, create an automated benchmark harness that exercises the three most critical capabilities for your use case. Each harness must produce statistically meaningful results with proper warm-up, iteration counts, and percentile reporting — not a single run's average. The harness should be runnable as `python bench.py` from the project root and output JSON results to stdout.

**Benchmark design rules:**
- Include a warm-up phase (e.g., 100 iterations) before measurement begins
- Run at least 1,000 measured iterations or 60 seconds of sustained load, whichever is longer
- Report P50, P95, and P99 latencies — not just averages
- Record memory usage at start, end, and peak during the benchmark run
- Document the exact environment: OS, CPU, RAM, Python version, package versions

**Checkpoint:** Each benchmark harness must pass `python bench.py --dry-run` without errors, producing valid JSON. If the dry-run fails, the harness is not ready for comparison.

```python
"""Automated benchmark harness generator for framework evaluation.

Produces reproducible benchmark scripts that measure latency percentiles,
throughput, and memory consumption across multiple load iterations.
"""

from __future__ import annotations

import json
import os
import statistics
import subprocess
import sys
import time
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Optional


@dataclass
class BenchmarkResult:
    """Results from a single benchmark run with statistical summaries."""

    framework_name: str
    test_name: str
    iterations: int
    warmup_iterations: int
    total_wall_seconds: float
    throughput_rps: float
    latency_percentiles: dict[str, float]  # "p50", "p95", "p99" in milliseconds
    mean_latency_ms: float
    std_dev_latency_ms: float
    memory_start_mb: float
    memory_end_mb: float
    memory_peak_mb: float = 0.0
    errors: int = 0
    error_rate_pct: float = 0.0
    environment: dict[str, str] = field(default_factory=dict)

    def to_dict(self) -> dict:
        """Serialize for JSON output."""
        return asdict(self)

    def summary_table(self) -> str:
        """Human-readable one-line summary."""
        return (
            f"{self.framework_name}/{self.test_name}: "
            f"{self.throughput_rps:.0f} rps | P50={self.latency_percentiles['p50']:.1f}ms "
            f"P95={self.latency_percentiles['p95']:.1f}ms P99={self.latency_percentiles['p99']:.1f}ms "
            f"mem delta={self.memory_end_mb - self.memory_start_mb:+.1f}MB"
        )


def collect_environment_info() -> dict[str, str]:
    """Capture the runtime environment for benchmark reproducibility."""
    return {
        "os": os.uname().sysname + " " + os.uname().release,
        "python_version": sys.version.split()[0],
        "platform": sys.platform,
        "cpu_count": str(os.cpu_count() or 0),
        "hostname": os.environ.get("HOSTNAME", "unknown"),
    }


def run_benchmark(
    *,
    framework_name: str,
    test_function: callable,
    iterations: int = 1000,
    warmup_iterations: int = 100,
    test_name: str = "default",
    timeout_per_iteration_seconds: float = 30.0,
) -> BenchmarkResult:
    """Execute a benchmark suite and return statistically summarized results.

    Args:
        framework_name: Identifier for the framework being benchmarked.
        test_function: Callable that performs one unit of work. Must raise on failure.
        iterations: Number of measured iterations (after warmup).
        warmup_iterations: Initial iterations not included in measurements.
        test_name: Label for this specific test within the harness.
        timeout_per_iteration_seconds: Max seconds per single iteration.

    Returns:
        BenchmarkResult with computed percentiles, throughput, and memory metrics.
    """
    env = collect_environment_info()
    latencies: list[float] = []
    errors = 0

    # Warmup phase — discard all measurements
    for _ in range(warmup_iterations):
        try:
            start = time.perf_counter()
            test_function()
            elapsed_ms = (time.perf_counter() - start) * 1000
        except Exception:
            pass

    # Measured phase
    memory_samples: list[float] = []
    total_start = time.perf_counter()

    for i in range(iterations):
        try:
            import psutil  # type: ignore  # optional dependency for memory tracking

            process = psutil.Process(os.getpid())
            mem_before = process.memory_info().rss / (1024 * 1024)
            memory_samples.append(mem_before)

            start = time.perf_counter()
            test_function()
            elapsed_ms = (time.perf_counter() - start) * 1000
            latencies.append(elapsed_ms)
        except Exception:
            errors += 1
        finally:
            if memory_samples:
                try:
                    import psutil  # type: ignore

                    mem_after = psutil.Process(os.getpid()).memory_info().rss / (1024 * 1024)
                    memory_samples.append(mem_after)
                except Exception:
                    pass

    total_wall = time.perf_counter() - total_start

    if not latencies:
        raise RuntimeError(
            f"Framework '{framework_name}' failed all {iterations} measured iterations. "
            "Check that the test function executes successfully."
        )

    sorted_latencies = sorted(latencies)
    n = len(sorted_latencies)

    def percentile(data: list[float], pct: float) -> float:
        """Compute percentile using nearest-rank method."""
        k = max(0, int(pct / 100.0 * len(data)) - 1)
        return data[min(k, len(data) - 1)]

    memory_start = min(memory_samples) if memory_samples else 0.0
    memory_end = max(memory_samples) if memory_samples else 0.0
    memory_peak = max(memory_samples) if memory_samples else 0.0

    return BenchmarkResult(
        framework_name=framework_name,
        test_name=test_name,
        iterations=n,
        warmup_iterations=warmup_iterations,
        total_wall_seconds=total_wall,
        throughput_rps=n / total_wall if total_wall > 0 else 0.0,
        latency_percentiles={
            "p50": round(percentile(sorted_latencies, 50), 2),
            "p95": round(percentile(sorted_latencies, 95), 2),
            "p99": round(percentile(sorted_latencies, 99), 2),
        },
        mean_latency_ms=round(statistics.mean(latencies), 2),
        std_dev_latency_ms=round(statistics.stdev(latencies), 2) if len(latencies) > 1 else 0.0,
        memory_start_mb=round(memory_start, 1),
        memory_end_mb=round(memory_end, 1),
        memory_peak_mb=round(memory_peak, 1),
        errors=errors,
        error_rate_pct=round(errors / n * 100, 2) if n > 0 else 0.0,
        environment=env,
    )


def generate_benchmark_script(
    framework_name: str,
    test_cases: list[dict[str, str | callable]],
    output_path: Optional[str] = None,
) -> Path:
    """Generate a standalone benchmark script file for a framework.

    Args:
        framework_name: Identifier for the framework being tested.
        test_cases: List of dicts with 'name' (str) and 'func' (callable) keys.
        output_path: Where to write the script. Defaults to ./bench_{framework_name}.py

    Returns:
        Path to the generated benchmark script.
    """
    output_path = output_path or f"bench_{framework_name}.py"
    path = Path(output_path)

    # Write a self-contained benchmark runner as a standalone script
    script_lines = [
        '#!/usr/bin/env python3',
        f'"""Benchmark harness for {framework_name} — generated by framework-evaluation skill."""',
        'import json, sys, time',
        'from benchmark_lib import run_benchmark, BenchmarkResult',
        '',
    ]

    # Import section for the framework being tested
    script_lines.extend([
        f'# Framework imports',
    ])
    for tc in test_cases:
        # Each test case's import will be embedded inline
        pass

    script_lines.append(
        '''if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Run benchmarks for """ + framework_name + '''")
    parser.add_argument("--dry-run", action="store_true", help="Validate without running full suite")
    args = parser.parse_args()

    results = []'''
    )

    for tc in test_cases:
        tc_name = tc["name"]
        script_lines.append(
            f"\n    # Test: {tc_name}"
        )
        script_lines.append(f"    try:")
        script_lines.append(f"        result = run_benchmark(")
        script_lines.append(f"            framework_name='{framework_name}',")
        script_lines.append(f"            test_function=lambda: your_{tc_name}_implementation(),")
        script_lines.append(f"            iterations=1000,")
        script_lines.append(f"            warmup_iterations=100,")
        script_lines.append(f"            test_name='{tc_name}',")
        script_lines.append(f"        )")
        script_lines.append(f"        results.append(result.to_dict())")
        script_lines.append(f"        print(result.summary_table(), file=sys.stderr)")

    script_lines.append(
        '''
    output = {
        "framework": "'"" + framework_name + '''",
        "tests": results,
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
    }
    json.dump(output, sys.stdout, indent=2)
'''
    )

    path.write_text("\n".join(script_lines) + "\n")
    return path


# Example: Build a benchmark suite for comparing web frameworks
def example_web_framework_benchmarks():
    """Demonstrate building a benchmark harness for HTTP framework comparison."""

    import importlib

    # Test case 1: Simple string endpoint
    def bench_simple_string(framework_module):
        """Return the test function for a simple text response endpoint."""
        app = framework_module.create_app()  # Must be implemented per-framework

        def test_fn():
            with app.test_client() as client:
                resp = client.get("/hello")
                assert resp.status_code == 200
                assert resp.data == b"Hello, World!"

        return test_fn

    # Test case 2: JSON serialization endpoint
    def bench_json_response(framework_module):
        """Return the test function for a JSON response endpoint."""
        app = framework_module.create_app()

        def test_fn():
            with app.test_client() as client:
                resp = client.get("/api/data")
                assert resp.status_code == 200
                data = resp.get_json()
                assert "items" in data and len(data["items"]) == 100

        return test_fn

    # Test case 3: Database query endpoint
    def bench_db_query(framework_module):
        """Return the test function for a database-backed endpoint."""
        app = framework_module.create_app()

        def test_fn():
            with app.test_client() as client:
                resp = client.get("/api/users/1")
                assert resp.status_code == 200
                data = resp.get_json()
                assert "username" in data

        return test_fn

    # The harness would be called per-framework like this:
    # from fastapi_impl import create_app, test_client_context
    # result = run_benchmark(
    #     framework_name="FastAPI",
    #     test_function=bench_simple_string(create_app),
    #     iterations=1000,
    #     warmup_iterations=100,
    #     test_name="simple_string",
    # )
    pass
```

### Step 2: Run Dependency Graph Security Audit

For each candidate framework, analyze its full dependency tree to identify security vulnerabilities, license compliance issues, and supply chain risks. This step produces a structured risk score based on CVE history, maintainer concentration, update frequency, and known supply chain incidents.

**Audit procedure:**
- Install the framework in an isolated environment (virtualenv or container)
- Export the full dependency tree (e.g., `pip freeze` for Python, `npm ls --all` for Node.js)
- Query each package against known vulnerability databases (CVE, GHSA, PyPI advisory database)
- Compute a composite security score based on severity-weighted CVE count
- Verify license compatibility: no GPL/LGPL conflicts with your distribution model

**Checkpoint:** Every candidate must pass the license compliance check. A single GPL dependency that conflicts with your project's license is an automatic disqualifier — no exceptions.

```python
"""Dependency graph security auditor for framework evaluation.

Analyzes dependency trees, queries CVE databases, computes composite
security scores, and flags license compliance issues.
"""

from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from typing import Optional


class LicenseType(str, Enum):
    """Common OSS license categories for compliance checking."""
    PERMISSIVE = "permissive"       # MIT, BSD-2, BSD-3, Apache 2.0
    WEAK_COPYLEFT = "weak_copyleft"  # LGPL, MPL-2.0, EPL-2.0
    STRONG_COPYLEFT = "strong_copyleft"  # GPL-2.0, GPL-3.0, AGPL-3.0
    COMMERCIAL = "commercial"        # Requires paid license for use
    UNKNOWN = "unknown"


class CveSeverity(str, Enum):
    """CVE severity levels from CVSS scoring."""
    CRITICAL = "critical"   # CVSS 9.0–10.0
    HIGH = "high"          # CVSS 7.0–8.9
    MEDIUM = "medium"      # CVSS 4.0–6.9
    LOW = "low"            # CVSS 0.1–3.9


@dataclass
class Dependency:
    """A single package in the dependency tree."""

    name: str
    version: str
    license_type: LicenseType = LicenseType.UNKNOWN
    direct: bool = False  # Direct dependency of the framework, or transitive
    latest_version: Optional[str] = None
    last_updated_days_ago: Optional[int] = None
    vulnerabilities: list[dict] = field(default_factory=list)


@dataclass
class DependencySecurityReport:
    """Complete security audit report for a framework's dependency graph."""

    framework_name: str
    audit_date: str
    total_dependencies: int
    direct_dependencies: int
    transitive_dependencies: int
    dependencies: list[Dependency] = field(default_factory=list)
    cve_summary: dict[str, int] = field(default_factory=lambda: {
        "critical": 0, "high": 0, "medium": 0, "low": 0,
    })
    license_issues: list[str] = field(default_factory=list)
    supply_chain_risks: list[str] = field(default_factory=list)
    security_score: float = 0.0  # 0 (worst) to 100 (best)

    def has_critical_cves(self) -> bool:
        """Check if any critical or high CVEs exist."""
        return self.cve_summary["critical"] > 0 or self.cve_summary["high"] > 0

    def is_license_compliant(self, allowed_licenses: set[str]) -> bool:
        """Check if all dependencies use only allowed licenses."""
        for dep in self.dependencies:
            if dep.license_type == LicenseType.UNKNOWN:
                return False  # Unknown license is a compliance risk
            if dep.license_type == LicenseType.COMMERCIAL:
                return False
            if dep.license_type == LicenseType.STRONG_COPYLEFT:
                if dep.license_type.value.lower() not in allowed_licenses:
                    self.license_issues.append(
                        f"{dep.name}@{dep.version}: {dep.license_type.value} license "
                        f"conflicts with project licensing model"
                    )
                    return False
        return len(self.license_issues) == 0

    def to_dict(self) -> dict:
        """Serialize for JSON report output."""
        return {
            "framework": self.framework_name,
            "audit_date": self.audit_date,
            "summary": {
                "total_deps": self.total_dependencies,
                "cve_counts": self.cve_summary,
                "security_score": round(self.security_score, 1),
                "license_issues_count": len(self.license_issues),
                "supply_chain_risks_count": len(self.supply_chain_risks),
            },
            "license_issues": self.license_issues,
            "supply_chain_risks": self.supply_chain_risks,
            "vulnerable_dependencies": [
                dep.name for dep in self.dependencies if dep.vulnerabilities
            ],
        }


def compute_security_score(report: DependencySecurityReport) -> float:
    """Compute a composite security score from 0–100.

    Scoring formula:
      - Start at 100
      - Subtract: critical CVEs × 15, high × 8, medium × 3, low × 1
      - Subtract: license issues × 10 (compliance is non-negotiable)
      - Subtract: supply chain risks × 5
      - Floor at 0

    A score below 40 indicates significant dependency risk requiring mitigation.
    """
    score = 100.0
    score -= report.cve_summary["critical"] * 15
    score -= report.cve_summary["high"] * 8
    score -= report.cve_summary["medium"] * 3
    score -= report.cve_summary["low"] * 1
    score -= len(report.license_issues) * 10
    score -= len(report.supply_chain_risks) * 5
    return max(0.0, min(100.0, round(score, 1)))


def audit_dependency_graph(
    framework_name: str,
    dependencies: list[dict],  # Raw dependency data from pip freeze / npm ls
    cve_lookup_table: dict[str, list[dict]] | None = None,
) -> DependencySecurityReport:
    """Run a full security audit on a framework's dependency graph.

    Args:
        framework_name: Identifier for the framework being audited.
        dependencies: List of dicts with 'name', 'version', 'license' keys
                      as exported from the package manager.
        cve_lookup_table: Optional pre-fetched CVE data keyed by package name.
                          Format: {"package_name": [{"cve_id", "severity", "fixed_version"}]}

    Returns:
        DependencySecurityReport with computed scores and issue lists.
    """
    license_map = {
        "MIT": LicenseType.PERMISSIVE,
        "BSD-2-Clause": LicenseType.PERMISSIVE,
        "BSD-3-Clause": LicenseType.PERMISSIVE,
        "Apache-2.0": LicenseType.PERMISSIVE,
        "ISC": LicenseType.PERMISSIVE,
        "LGPL-2.1": LicenseType.WEAK_COPYLEFT,
        "LGPL-3.0": LicenseType.WEAK_COPYLEFT,
        "MPL-2.0": LicenseType.WEAK_COPYLEFT,
        "GPL-2.0": LicenseType.STRONG_COPYLEFT,
        "GPL-3.0": LicenseType.STRONG_COPYLEFT,
        "AGPL-3.0": LicenseType.STRONG_COPYLEFT,
    }

    cve_lookup = cve_lookup_table or {}
    deps: list[Dependency] = []
    seen = set()
    direct_count = 0

    for raw in dependencies:
        name = raw["name"]
        version = raw.get("version", "unknown")
        license_raw = raw.get("license", "").strip()

        # Deduplicate — a package may appear in both direct and transitive lists
        key = f"{name}=={version}"
        if key in seen:
            continue
        seen.add(key)

        dep = Dependency(
            name=name,
            version=version,
            license_type=license_map.get(license_raw, LicenseType.UNKNOWN),
            direct=name not in [d for d in deps],  # First appearance = direct
        )

        if dep.direct:
            direct_count += 1

        # Look up known CVEs
        vulns = cve_lookup.get(name, [])
        dep.vulnerabilities = vulns

        for vuln in vulns:
            severity = CveSeverity(vuln.get("severity", "low").lower())
            report.cve_summary[severity.value] = (
                report.cve_summary.get(severity.value, 0) + 1
            )

        deps.append(dep)

    # Compute final score
    report = DependencySecurityReport(
        framework_name=framework_name,
        audit_date=datetime.now().isoformat(),
        total_dependencies=len(deps),
        direct_dependencies=direct_count,
        transitive_dependencies=len(deps) - direct_count,
        dependencies=deps,
        security_score=compute_security_score(report),
    )

    # Add supply chain risk indicators
    for dep in deps:
        if dep.license_type == LicenseType.UNKNOWN:
            report.supply_chain_risks.append(
                f"{dep.name}: Unknown license — cannot verify compliance"
            )
        if dep.version.startswith("0.") and dep.last_updated_days_ago and dep.last_updated_days_ago > 365:
            report.supply_chain_risks.append(
                f"{dep.name}@{dep.version}: Pre-1.0 version with no updates in {dep.last_updated_days_ago} days"
            )

    return report


# Example: Audit dependency graph for two web frameworks
def example_dependency_audit():
    """Demonstrate dependency auditing for FastAPI vs Flask."""

    # Simulated dependency data from pip freeze
    fastapi_deps = [
        {"name": "fastapi", "version": "0.109.2", "license": "MIT"},
        {"name": "uvicorn", "version": "0.27.1", "license": "BSD-3-Clause"},
        {"name": "pydantic", "version": "2.5.3", "license": "MIT"},
        {"name": "starlette", "version": "0.36.3", "license": "BSD-3-Clause"},
        {"name": "sniffio", "version": "1.3.1", "license": "BSD-3-Clause"},
        {"name": "typing_extensions", "version": "4.9.0", "license": "PSF"},
    ]

    flask_deps = [
        {"name": "flask", "version": "3.0.2", "license": "BSD-3-Clause"},
        {"name": "werkzeug", "version": "3.0.1", "license": "BSD-3-Clause"},
        {"name": "jinja2", "version": "3.1.3", "license": "BSD-3-Clause"},
        {"name": "click", "version": "8.1.7", "license": "BSD-3-Clause"},
        {"name": "itsdangerous", "version": "2.2.0", "license": "BSD-3-Clause"},
        {"name": "markupsafe", "version": "2.1.4", "license": "BSD-3-Clause"},
    ]

    # Simulated CVE lookup data (in production, fetch from PyPI advisory database)
    mock_cves = {}  # No known CVEs in this example

    fastapi_report = audit_dependency_graph("FastAPI", fastapi_deps, mock_cves)
    flask_report = audit_dependency_graph("Flask", flask_deps, mock_cves)

    print(f"FastAPI security score: {fastapi_report.security_score}/100")
    print(f"Flask security score: {flask_report.security_score}/100")
    print(json.dumps(fastapi_report.to_dict()["summary"], indent=2))
```

### Step 3: Execute Integration Feasibility Tests

Validate each candidate framework's compatibility with your specific infrastructure stack. Create automated tests that exercise real integration points — database connections, authentication flows, serialization formats, and CI/CD pipeline hooks. Each test must pass or fail with a deterministic result, not "it works on my machine."

**Integration test categories:**
- **Database connectivity**: Can the framework connect to your target database(s) using your preferred driver/library? Measure connection setup time and query latency.
- **Authentication flow**: Can the framework integrate with your auth provider (OAuth2, JWT, SAML)? Test token validation and session management.
- **Data format compatibility**: Does the framework natively handle your required data formats (JSON Schema versions, Protocol Buffers, Avro)?
- **Observability hooks**: Does the framework support OpenTelemetry integration, structured logging in JSON, and Prometheus metrics export?

**Checkpoint:** A framework must pass at least 80% of integration tests to be considered viable. Any failure in database connectivity or authentication is an automatic knockout — those are non-negotiable for production systems.

```python
"""Integration feasibility test harness for framework evaluation.

Tests a framework's compatibility with a specific infrastructure stack
by running automated checks against real connection targets.
"""

from __future__ import annotations

import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional


class TestStatus(str, Enum):
    PASS = "pass"
    FAIL = "fail"
    SKIP = "skip"  # Inapplicable to this framework (e.g., ORM-only framework tested for no-ORM compatibility)


@dataclass
class IntegrationTestCase:
    """A single integration test case with results."""

    name: str
    category: str       # "database", "auth", "serialization", "observability"
    status: TestStatus = TestStatus.SKIP
    execution_time_ms: float = 0.0
    error_message: Optional[str] = None
    details: dict = field(default_factory=dict)

    def to_dict(self) -> dict:
        result = {
            "name": self.name,
            "category": self.category,
            "status": self.status.value,
            "execution_time_ms": round(self.execution_time_ms, 1),
        }
        if self.error_message:
            result["error"] = self.error_message
        if self.details:
            result["details"] = self.details
        return result


@dataclass
class IntegrationTestReport:
    """Complete integration test results for a framework against an infrastructure stack."""

    framework_name: str
    target_stack_description: str
    total_tests: int
    passed: int = 0
    failed: int = 0
    skipped: int = 0
    tests: list[IntegrationTestCase] = field(default_factory=list)
    overall_compatibility_pct: float = 0.0

    def run_test(self, test_case: IntegrationTestCase, test_fn: callable) -> None:
        """Execute a single integration test and record results."""
        start = time.perf_counter()
        try:
            result = test_fn()
            elapsed_ms = (time.perf_counter() - start) * 1000

            if result is True or result is None:
                test_case.status = TestStatus.PASS
                test_case.execution_time_ms = elapsed_ms
                self.passed += 1
            else:
                # test_fn returns error message on failure
                test_case.status = TestStatus.FAIL
                test_case.execution_time_ms = elapsed_ms
                test_case.error_message = str(result) if result else "Test failed without message"
                self.failed += 1
        except Exception as e:
            elapsed_ms = (time.perf_counter() - start) * 1000
            test_case.status = TestStatus.FAIL
            test_case.execution_time_ms = elapsed_ms
            test_case.error_message = str(e)
            self.failed += 1

    @property
    def compatibility_percentage(self) -> float:
        """Percentage of tests that passed (excluding skipped)."""
        tested = self.passed + self.failed
        if tested == 0:
            return 0.0
        return round(self.passed / tested * 100, 1)

    def is_viable(self, min_compatibility_pct: float = 80.0) -> bool:
        """Check if framework meets minimum compatibility threshold."""
        return self.compatibility_percentage >= min_compatibility_pct

    def has_nonnegotiable_failure(self, categories: list[str] | None = None) -> bool:
        """Check for failures in non-negotiable integration categories.

        Default non-negotiable categories: database connectivity and authentication.
        """
        if categories is None:
            categories = ["database", "auth"]
        return any(
            t.status == TestStatus.FAIL and t.category in categories
            for t in self.tests
        )

    def to_dict(self) -> dict:
        return {
            "framework": self.framework_name,
            "target_stack": self.target_stack_description,
            "summary": {
                "total": self.total_tests,
                "passed": self.passed,
                "failed": self.failed,
                "skipped": self.skipped,
                "compatibility_pct": self.compatibility_percentage,
                "viable": self.is_viable(),
            },
            "tests": [t.to_dict() for t in self.tests],
        }


def build_integration_suite(
    framework_name: str,
    target_stack: dict[str, str],  # {"database": "postgresql", "auth_provider": "okta", ...}
) -> tuple[IntegrationTestReport, list[tuple[IntegrationTestCase, callable]]]:
    """Build a complete integration test suite for evaluating a framework.

    Args:
        framework_name: Identifier for the framework being tested.
        target_stack: Dict describing the infrastructure stack to test against.

    Returns:
        Tuple of (report object, list of (test_case, test_function) pairs).
        Run each pair through report.run_test() to populate results.
    """
    report = IntegrationTestReport(
        framework_name=framework_name,
        target_stack_description=f"Stack: {', '.join(f'{k}={v}' for k, v in target_stack.items())}",
        total_tests=0,
    )

    tests_to_run: list[tuple[IntegrationTestCase, callable]] = []

    # Test 1: Database connectivity (if framework supports databases)
    if target_stack.get("database"):
        test_case = IntegrationTestCase(
            name=f"connect_to_{target_stack['database']}",
            category="database",
        )
        tests_to_run.append((test_case, lambda: build_db_test_function(target_stack["database"])))
        report.total_tests += 1

    # Test 2: Authentication flow integration
    auth_provider = target_stack.get("auth_provider")
    if auth_provider:
        test_case = IntegrationTestCase(
            name=f"integrate_{auth_provider}_auth",
            category="auth",
        )
        tests_to_run.append((test_case, lambda: build_auth_test_function(auth_provider)))
        report.total_tests += 1

    # Test 3: JSON serialization compatibility
    test_case = IntegrationTestCase(
        name="json_serialization_compatibility",
        category="serialization",
    )
    tests_to_run.append((test_case, build_serialization_test_function()))
    report.total_tests += 1

    # Test 4: OpenTelemetry integration (if observability requested)
    if target_stack.get("observability") == "opentelemetry":
        test_case = IntegrationTestCase(
            name="opentelemetry_integration",
            category="observability",
        )
        tests_to_run.append((test_case, build_otel_test_function()))
        report.total_tests += 1

    return report, tests_to_run


def build_db_test_function(db_type: str) -> callable:
    """Return a test function that verifies database connectivity."""
    def test_fn():
        # This would connect to the actual database in production evaluation
        # For the framework evaluation skill, this demonstrates the pattern
        if db_type == "postgresql":
            import psycopg2  # type: ignore
            # In real evaluation: conn = psycopg2.connect(dsn=your_dsn)
            pass
        return None  # Success

    return test_fn


def build_auth_test_function(provider: str) -> callable:
    """Return a test function for auth integration."""
    def test_fn():
        if provider == "okta":
            # Would verify OAuth2 token validation with Okta's JWKS endpoint
            pass
        elif provider == "auth0":
            # Would verify JWT verification against Auth0 tenant
            pass
        return None

    return test_fn


def build_serialization_test_function() -> callable:
    """Return a test function for data format compatibility."""
    def test_fn():
        import json
        sample = {"id": 1, "name": "test", "tags": ["a", "b"]}
        serialized = json.dumps(sample)
        deserialized = json.loads(serialized)
        assert deserialized == sample
        return None

    return test_fn


def build_otel_test_function() -> callable:
    """Return a test function for OpenTelemetry integration."""
    def test_fn():
        try:
            from opentelemetry import trace  # type: ignore
            tracer = trace.get_tracer("framework-eval")
            with tracer.start_as_current_span("test-span"):
                pass
            return None
        except ImportError:
            raise RuntimeError(
                "OpenTelemetry SDK not installed. Install with: pip install opentelemetry-api opentelemetry-sdk"
            )

    return test_fn


# Example: Run integration suite evaluation
def example_integration_evaluation():
    """Demonstrate integration testing across FastAPI and Flask against a target stack."""

    target_stack = {
        "database": "postgresql",
        "auth_provider": "okta",
        "observability": "opentelemetry",
        "cache": "redis",
    }

    report, tests_to_run = build_integration_suite("FastAPI", target_stack)

    for test_case, test_fn in tests_to_run:
        report.run_test(test_case, test_fn)

    print(f"FastAPI integration compatibility: {report.compatibility_percentage}%")
    print(f"Viable for target stack: {report.is_viable()}")
    if report.has_nonnegotiable_failure():
        print("NON-NEGOTIABLE FAILURE: Database or auth integration failed.")
```

### Step 4: Model Long-Term Maintenance Costs

Project the 3-year total cost of ownership for each framework using observable metrics from version history, release patterns, and community activity. TCO is not just licensing — it includes developer ramp-up time, upgrade costs when breaking changes occur, security patching effort, and the opportunity cost of framework-related work versus business logic development.

**TCO model components:**
- **Ramp-up cost**: Weeks × (average developer salary / 40 hours) for team to reach productivity
- **Annual upgrade cost**: Number of breaking minor versions per year × estimated fix hours × hourly rate
- **Security patching**: Monthly CVE count × average hours to assess and apply patches
- **Community support burden**: Hours per month the team spends troubleshooting framework issues vs. business logic

**Checkpoint:** If any framework's projected 3-year TCO exceeds the next-best alternative by more than 40%, flag it prominently — the performance or feature advantages must justify that cost delta.

```python
"""Maintenance cost modeler for long-term framework TCO estimation.

Projects 3-year total cost of ownership based on observable version history,
release patterns, breaking change rates, and community activity metrics.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date


@dataclass
class VersionHistoryEntry:
    """A single release from a framework's version history."""

    version: str
    release_date: str  # ISO format YYYY-MM-DD
    is_breaking_change: bool = False
    has_security_patches: bool = False
    upgrade_hours_required: float = 0.0  # Estimated developer hours for migration


@dataclass
class TCOProjection:
    """3-year total cost of ownership projection for a framework."""

    framework_name: str
    evaluation_date: str
    hourly_rate: float  # Average fully-loaded developer hourly rate

    # Ramp-up
    ramp_up_weeks: float
    team_size: int

    # Annual recurring costs
    annual_upgrade_hours: float        # Hours per year for breaking change upgrades
    annual_security_patch_hours: float  # Hours per year for CVE patching and assessment
    annual_support_hours: float        # Hours per month troubleshooting framework issues (× 12)

    # Derived costs
    ramp_up_cost: float = 0.0
    annual_upgrade_cost: float = 0.0
    annual_security_cost: float = 0.0
    annual_support_cost: float = 0.0
    year_1_total: float = 0.0
    year_2_total: float = 0.0
    year_3_total: float = 0.0
    three_year_tco: float = 0.0

    # Version history data (for transparency)
    version_history_summary: dict = field(default_factory=dict)

    def compute(self) -> "TCOProjection":
        """Calculate all cost projections from input parameters."""
        hours_in_week = 40.0

        # Ramp-up: one-time cost in year 1
        self.ramp_up_cost = (
            self.ramp_up_weeks * hours_in_week * self.team_size * self.hourly_rate
        )

        # Annual costs
        self.annual_upgrade_cost = self.annual_upgrade_hours * self.hourly_rate
        self.annual_security_cost = self.annual_security_patch_hours * self.hourly_rate
        self.annual_support_cost = (
            self.annual_support_hours * 12 * self.hourly_rate
        )

        year_recurring = (
            self.annual_upgrade_cost + self.annual_security_cost + self.annual_support_cost
        )

        # Year 1 includes ramp-up; years 2–3 are recurring only
        self.year_1_total = self.ramp_up_cost + year_recurring
        self.year_2_total = year_recurring
        self.year_3_total = year_recurring
        self.three_year_tco = (
            self.year_1_total + self.year_2_total + self.year_3_total
        )

        return self

    @classmethod
    def from_version_history(
        cls,
        framework_name: str,
        hourly_rate: float,
        team_size: int,
        ramp_up_weeks: float,
        versions: list[VersionHistoryEntry],
        avg_security_patch_hours: float = 2.0,  # Hours per CVE to assess and patch
    ) -> TCOProjection:
        """Build a TCO projection from historical version data.

        Computes annualized upgrade costs and security patch burden from
        observed release patterns in the framework's Git history.

        Args:
            framework_name: Identifier for the framework.
            hourly_rate: Fully-loaded developer hourly rate (salary + overhead).
            team_size: Number of developers who will use this framework.
            ramp_up_weeks: Estimated weeks for a new team to reach full productivity.
            versions: Historical releases with breaking change and security metadata.
            avg_security_patch_hours: Average hours spent per CVE incident.

        Returns:
            TCOProjection with computed costs.
        """
        total_years = 3.0

        # Count events over the observed history window
        breaking_changes = [v for v in versions if v.is_breaking_change]
        security_patches = [v for v in versions if v.has_security_patches]

        if not versions:
            raise ValueError(
                "Version history is empty — cannot compute TCO without release data."
            )

        # Compute the time span covered by the version history
        dates = []
        for v in versions:
            try:
                dates.append(date.fromisoformat(v.release_date))
            except ValueError:
                continue

        if len(dates) >= 2:
            date_span_days = (max(dates) - min(dates)).days
            years_of_history = max(date_span_days / 365.0, 1.0)
        else:
            years_of_history = 1.0

        # Annualize rates from observed history
        annual_breaking_changes = len(breaking_changes) / years_of_history
        annual_security_incidents = len(security_patches) / years_of_history

        # Estimate upgrade hours per breaking change (average across versions)
        avg_upgrade_hours = sum(
            v.upgrade_hours_required for v in breaking_changes if v.upgrade_hours_required > 0
        ) / max(len(breaking_changes), 1)
        if avg_upgrade_hours == 0:
            # Heuristic: assume 8 hours per minor version, 24 hours per major
            avg_upgrade_hours = 16.0

        # Project annual costs for team of given size
        annual_upgrade_hours = annual_breaking_changes * avg_upgrade_hours * team_size
        annual_security_hours = annual_security_incidents * avg_security_patch_hours * team_size

        return cls(
            framework_name=framework_name,
            evaluation_date=date.today().isoformat(),
            hourly_rate=hourly_rate,
            ramp_up_weeks=ramp_up_weeks,
            team_size=team_size,
            annual_upgrade_hours=round(annual_upgrade_hours, 1),
            annual_security_patch_hours=round(annual_security_hours, 1),
            annual_support_hours=0.0,  # Estimated separately from community feedback
            version_history_summary={
                "versions_analyzed": len(versions),
                "years_of_history": round(years_of_history, 1),
                "total_breaking_changes": len(breaking_changes),
                "total_security_patches": len(security_patches),
                "annualized_breaking_changes": round(annual_breaking_changes, 2),
                "avg_upgrade_hours_per_change": round(avg_upgrade_hours, 1),
            },
        ).compute()

    def summary(self) -> str:
        """Generate a human-readable cost projection summary."""
        lines = [
            f"TCO Projection for {self.framework_name} (3 years)",
            "=" * 50,
            "",
            f"Ramp-up cost (year 1):      ${self.ramp_up_cost:>12,.0f}",
            f"Annual upgrade cost:         ${self.annual_upgrade_cost:>12,.0f}/yr",
            f"Annual security patching:    ${self.annual_security_cost:>12,.0f}/yr",
            f"Annual framework support:    ${self.annual_support_cost:>12,.0f}/yr",
            "",
            f"Year 1 total:                ${self.year_1_total:>12,.0f}",
            f"Year 2 total:                ${self.year_2_total:>12,.0f}",
            f"Year 3 total:                ${self.year_3_total:>12,.0f}",
            "",
            f"Three-year TCO:              ${self.three_year_tco:>12,.0f}",
            "",
            f"Effective monthly cost:      ${self.three_year_tco / 36:>12,.0f}/mo",
        ]
        return "\n".join(lines)


# Example: Compare TCO for FastAPI vs Flask vs Django
def example_tco_comparison():
    """Demonstrate 3-year TCO comparison across three frameworks."""

    hourly_rate = 85.0  # Fully-loaded rate
    team_size = 4       # Developers who will use the framework

    # Simulated version history for FastAPI (rapid release, fewer breaking changes in minor)
    fastapi_versions = [
        VersionHistoryEntry("0.65.0", "2021-03-01", is_breaking_change=False),
        VersionHistoryEntry("0.68.0", "2021-07-15", is_breaking_change=False),
        VersionHistoryEntry("0.95.0", "2022-08-01", is_breaking_change=True, upgrade_hours_required=4.0),
        VersionHistoryEntry("0.100.0", "2023-02-15", is_breaking_change=False, has_security_patches=True),
        VersionHistoryEntry("0.109.0", "2023-11-01", is_breaking_change=False, has_security_patches=True),
    ]

    # Simulated version history for Flask (stable releases, infrequent breaking changes)
    flask_versions = [
        VersionHistoryEntry("1.1.4", "2020-11-01", has_security_patches=True),
        VersionHistoryEntry("2.0.0", "2021-05-01", is_breaking_change=True, upgrade_hours_required=16.0),
        VersionHistoryEntry("2.3.0", "2023-05-01", is_breaking_change=False),
        VersionHistoryEntry("3.0.0", "2023-11-01", is_breaking_change=True, upgrade_hours_required=20.0, has_security_patches=True),
    ]

    # Simulated version history for Django (longer release cycles, significant breaking changes)
    django_versions = [
        VersionHistoryEntry("3.2.0", "2021-04-06", is_breaking_change=False, has_security_patches=True),
        VersionHistoryEntry("4.0.0", "2022-12-03", is_breaking_change=True, upgrade_hours_required=40.0),
        VersionHistoryEntry("4.2.0", "2023-04-03", is_breaking_change=False),
        VersionHistoryEntry("5.0.0", "2023-12-04", is_breaking_change=True, upgrade_hours_required=35.0),
    ]

    fastapi_tco = TCOProjection.from_version_history(
        framework_name="FastAPI",
        hourly_rate=hourly_rate,
        team_size=team_size,
        ramp_up_weeks=3.0,  # Smaller API surface to learn
        versions=fastapi_versions,
    )

    flask_tco = TCOProjection.from_version_history(
        framework_name="Flask",
        hourly_rate=hourly_rate,
        team_size=team_size,
        ramp_up_weeks=1.5,  # Minimal API, well-documented
        versions=flask_versions,
    )

    django_tco = TCOProjection.from_version_history(
        framework_name="Django",
        hourly_rate=hourly_rate,
        team_size=team_size,
        ramp_up_weeks=2.0,  # Convention-over-configuration reduces decisions
        versions=django_versions,
    )

    print(fastapi_tco.summary())
    print()
    print(flask_tco.summary())
    print()
    print(django_tco.summary())

    # Comparison summary
    tcvs = [fastapi_tco.three_year_tco, flask_tco.three_year_tco, django_tco.three_year_tco]
    best_idx = tcvs.index(min(tcvs))
    names = ["FastAPI", "Flask", "Django"]
    print(f"\nLowest 3-year TCO: {names[best_idx]} at ${tcvs[best_idx]:,.0f}")
```

### Step 5: Generate Scaffold Quality Report

Evaluate the baseline code quality produced by each framework's CLI scaffolding tools. A framework that generates clean, well-structured boilerplate lowers the team's initial development friction and reduces early-stage bugs. Analyze the generated code for test coverage, type annotation presence, proper separation of concerns, and adherence to common conventions.

**Scaffold analysis dimensions:**
- **Test inclusion**: Does the scaffold include basic test files? What framework do they use?
- **Type annotations**: Percentage of functions with type hints in generated code
- **Separation of concerns**: Are handlers/models/routes separated or monolithic?
- **Configuration management**: Environment variables vs. hardcoded values vs. config files
- **Error handling patterns**: Proper exception handling vs. bare returns

**Checkpoint:** If a framework's scaffold produces zero tests and zero type annotations, note this as a quality concern — it shifts more baseline work onto the team from day one.

### Step 6: Aggregate Results into Evaluation Report JSON

Combine all quantitative data into a single structured evaluation report. The report should be machine-readable (JSON) for integration with CI/CD gates and human-readable tables for stakeholder presentations. Feed this data directly into scoring matrices for final selection decisions.

**Report structure:**
- `frameworks[]` — Array of per-framework evaluation results
- Each framework contains: `benchmark_results`, `dependency_audit`, `integration_tests`, `tco_projection`, `scaffold_quality_score`
- `aggregate_comparison` — Summary table with key metrics side-by-side

**Checkpoint:** The report must be valid JSON parseable by downstream tools. If generating a presentation, produce the same data in a markdown table format as well.

---

## Implementation Patterns

### Pattern 1: Aggregated Evaluation Report Generator

Produces the final machine-readable evaluation report and human-readable comparison table from all analysis phases.

```python
"""Aggregated framework evaluation report generator.

Combines results from benchmarks, dependency audits, integration tests,
and TCO modeling into a structured report suitable for stakeholder review
and automated decision gates.
"""

from __future__ import annotations

import json
import sys
from dataclasses import asdict, dataclass, field
from typing import Optional


@dataclass
class FrameworkEvaluation:
    """Complete evaluation results for a single framework candidate."""

    name: str
    version_evaluated: str

    # Phase 1: Benchmarks
    benchmark_results: list[dict] = field(default_factory=list)
    best_throughput_rps: float = 0.0
    worst_p99_latency_ms: float = 0.0

    # Phase 2: Dependency security audit
    dependency_audit_summary: dict = field(default_factory=dict)
    security_score: float = 0.0
    license_compliant: bool = True

    # Phase 3: Integration tests
    integration_compatibility_pct: float = 0.0
    is_integration_viable: bool = True
    nonnegotiable_failures: list[str] = field(default_factory=list)

    # Phase 4: TCO modeling
    tco_3year: float = 0.0
    annual_recurring_cost: float = 0.0
    ramp_up_weeks: float = 0.0

    # Phase 5: Scaffold quality (1-10 scale)
    scaffold_quality_score: float = 0.0

    @property
    def is_viable(self) -> bool:
        """A framework is viable only if it passes integration AND license checks."""
        return (
            self.is_integration_viable
            and self.license_compliant
            and not self.nonnegotiable_failures
        )

    def to_dict(self) -> dict:
        result = {
            "name": self.name,
            "version": self.version_evaluated,
            "viable": self.is_viable,
            "benchmarks": {
                "best_throughput_rps": round(self.best_throughput_rps, 0),
                "worst_p99_latency_ms": round(self.worst_p99_latency_ms, 1),
            },
            "dependency_audit": {
                "security_score": round(self.security_score, 1),
                "license_compliant": self.license_compliant,
                **self.dependency_audit_summary,
            },
            "integration": {
                "compatibility_pct": round(self.integration_compatibility_pct, 1),
                "viable": self.is_integration_viable,
            },
            "tco_3year": round(self.tco_3year, 0),
            "scaffold_quality": round(self.scaffold_quality_score, 1),
        }
        if self.nonnegotiable_failures:
            result["nonnegotiable_failures"] = self.nonnegotiable_failures
        return result


@dataclass
class EvaluationReport:
    """Complete framework evaluation report with aggregate comparison."""

    title: str
    target_stack_description: str
    evaluation_date: str
    frameworks: list[FrameworkEvaluation] = field(default_factory=list)

    @property
    def viable_frameworks(self) -> list[FrameworkEvaluation]:
        return [f for f in self.frameworks if f.is_viable]

    @property
    def best_throughput_framework(self) -> Optional[FrameworkEvaluation]:
        candidates = [f for f in self.viable_frameworks if f.best_throughput_rps > 0]
        return max(candidates, key=lambda f: f.best_throughput_rps) if candidates else None

    @property
    def lowest_tco_framework(self) -> Optional[FrameworkEvaluation]:
        candidates = [f for f in self.viable_frameworks if f.tco_3year > 0]
        return min(candidates, key=lambda f: f.tco_3year) if candidates else None

    @property
    def best_security_framework(self) -> Optional[FrameworkEvaluation]:
        return max(
            self.viable_frameworks,
            key=lambda f: f.security_score,
        ) if self.viable_frameworks else None

    def generate_markdown_table(self) -> str:
        """Generate a human-readable comparison table."""
        lines = [
            "# Framework Evaluation Results",
            "",
            f"**Target Stack:** {self.target_stack_description}",
            f"**Date:** {self.evaluation_date}",
            "",
            "| Metric | " + " | ".join(f.name for f in self.frameworks) + " |",
            "|--------|" + "|".join("------" for _ in self.frameworks) + "|",
        ]

        metrics = [
            ("Viable", lambda f: "Yes" if f.is_viable else "No"),
            ("Throughput (rps)", lambda f: f"{f.best_throughput_rps:.0f}"),
            ("P99 Latency (ms)", lambda f: f"{f.worst_p99_latency_ms:.1f}"),
            ("Security Score", lambda f: f"{f.security_score:.1f}/100"),
            ("License Compliant", lambda f: "Yes" if f.license_compliant else "No"),
            ("Integration %", lambda f: f"{f.integration_compatibility_pct}%"),
            ("3-Year TCO", lambda f: f"${f.tco_3year:,.0f}"),
            ("Scaffold Quality", lambda f: f"{f.scaffold_quality_score:.1f}/10"),
        ]

        for label, extractor in metrics:
            row = f"| {label} | " + " | ".join(extractor(f) for f in self.frameworks) + " |"
            lines.append(row)

        lines.extend(["", "---"])

        if self.best_throughput_framework:
            lines.append(
                f"> **Highest throughput:** {self.best_throughput_framework.name} "
                f"({self.best_throughput_framework.best_throughput_rps:.0f} rps)"
            )
        if self.lowest_tco_framework:
            lines.append(
                f"> **Lowest 3-year TCO:** {self.lowest_tco_framework.name} "
                f"(${self.lowest_tco_framework.tco_3year:,.0f})"
            )

        return "\n".join(lines) + "\n"

    def to_json(self) -> str:
        """Serialize the full report to JSON."""
        data = {
            "title": self.title,
            "target_stack": self.target_stack_description,
            "evaluation_date": self.evaluation_date,
            "frameworks": [f.to_dict() for f in self.frameworks],
            "aggregate": {},
        }

        if self.best_throughput_framework:
            data["aggregate"]["best_throughput"] = self.best_throughput_framework.name
        if self.lowest_tco_framework:
            data["aggregate"]["lowest_tco"] = self.lowest_tco_framework.name
        if self.best_security_framework:
            data["aggregate"]["best_security"] = self.best_security_framework.name

        return json.dumps(data, indent=2)


# Example: Generate a complete evaluation report
def example_complete_report():
    """Demonstrate generating a full evaluation report from simulated data."""

    report = EvaluationReport(
        title="REST API Framework Evaluation — Q1 2026",
        target_stack_description="Python 3.12, PostgreSQL 16, Okta OAuth2, OpenTelemetry, Docker/Kubernetes",
        evaluation_date="2026-01-15",
    )

    # Simulated results for three frameworks
    report.frameworks = [
        FrameworkEvaluation(
            name="FastAPI",
            version_evaluated="0.109.2",
            best_throughput_rps=45200,
            worst_p99_latency_ms=12.3,
            security_score=92.0,
            license_compliant=True,
            integration_compatibility_pct=100.0,
            is_integration_viable=True,
            tco_3year=385000,
            annual_recurring_cost=62000,
            ramp_up_weeks=3.0,
            scaffold_quality_score=8.5,
        ),
        FrameworkEvaluation(
            name="Flask",
            version_evaluated="3.0.2",
            best_throughput_rps=12800,
            worst_p99_latency_ms=48.7,
            security_score=88.0,
            license_compliant=True,
            integration_compatibility_pct=100.0,
            is_integration_viable=True,
            tco_3year=295000,
            annual_recurring_cost=48000,
            ramp_up_weeks=1.5,
            scaffold_quality_score=6.0,
        ),
        FrameworkEvaluation(
            name="Django REST Framework",
            version_evaluated="4.2.3",
            best_throughput_rps=8900,
            worst_p99_latency_ms=125.0,
            security_score=78.0,
            license_compliant=True,
            integration_compatibility_pct=87.5,
            is_integration_viable=True,
            tco_3year=445000,
            annual_recurring_cost=82000,
            ramp_up_weeks=2.0,
            scaffold_quality_score=7.5,
        ),
    ]

    # Output JSON report
    print("=== JSON Report ===")
    print(report.to_json())
    print()

    # Output markdown table
    print("=== Comparison Table ===")
    print(report.generate_markdown_table())
```

---

## Constraints

### MUST DO
- Run benchmarks with proper statistical rigor — always report P50/P95/P99, never just averages; minimum 1,000 measured iterations or 60 seconds of load
- Audit every framework's full dependency tree, not just direct dependencies — transitive CVEs are production risks
- Verify license compliance for all dependencies including transitive ones — a single GPL conflict is a disqualifier regardless of performance advantages
- Run integration tests against your actual infrastructure, not generic examples — test against the real PostgreSQL instance, the real Okta tenant, the real Redis cluster
- Model 3-year TCO using historical version data when available; fall back to heuristic estimates only if no release history exists
- Document every assumption and estimate with a confidence level (high/medium/low) — stakeholders need to know what's measured vs. estimated
- Produce both machine-readable (JSON) and human-readable (markdown table) outputs

### MUST NOT DO
- Do not benchmark frameworks on different hardware, OS versions, or Python versions — environmental variance invalidates comparison
- Do not include framework startup time in throughput benchmarks unless your deployment model requires fast cold starts (serverless/edge functions)
- Do not skip the dependency audit because a framework is "popular" — popularity does not prevent supply chain attacks
- Do not assume integration tests will pass without verifying against production-like targets — `localhost` results are not representative
- Do not use TCO estimates without documenting the source data (version history, team size, hourly rate)
- Do not let performance advantages justify ignoring license or security failures

---

## Output Template

When this skill is active, produce:

1. **Benchmark Results** — JSON output from automated benchmark harnesses with P50/P95/P99 latencies, throughput (rps), memory delta, and environment details for each test case
2. **Dependency Security Audit** — Per-framework report showing total dependencies, CVE counts by severity, security score (0–100), license compliance status, and supply chain risk flags
3. **Integration Test Matrix** — Table of all integration tests with pass/fail/skip status per framework, highlighting any non-negotiable category failures (database, auth)
4. **TCO Comparison** — 3-year cost projection table showing ramp-up, annual upgrade costs, security patching costs, and total TCO per framework with source data documented
5. **Scaffold Quality Assessment** — Scores and findings for each framework's CLI scaffolding output across test inclusion, type annotations, separation of concerns, and configuration patterns
6. **Aggregated Report** — Complete evaluation report in JSON (for tool integration) and markdown table (for stakeholder review), with aggregate best-in-class identifications

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `framework-onboarding` | After selection, use this skill to onboard teams onto the chosen framework — training plans, project templates, conventions |
| `framework-selection` | Apply weighted scoring matrices and AHP decision-making to rank frameworks based on the quantitative data produced by this skill |
| `framework-comparison-workflow` | Run hands-on spike projects for deeper code-level comparison when quantitative data alone cannot differentiate candidates |
| `tool-evaluation-workflow` | Broader tool evaluation methodology covering CI/CD tools, testing frameworks, and infrastructure — not limited to application frameworks |

---

## Live References

> Authoritative documentation links for framework evaluation methodologies and tools. The model follows markdown links at load time to resolve external references and inline content.

- [How to Evaluate Software Frameworks (Jahia)](https://www.jahia.com/blog/how-to-evaluate-software-frameworks) — Comprehensive methodology covering requirements analysis, criteria definition, and scoring matrices for framework comparison
- [Framework Evaluation (Martin Fowler)](https://martinfowler.com/articles/frameworkEvaluation.html) — Spikes, proof-of-concepts, and evidence-based evaluation patterns for technology selection decisions
- [ThoughtWorks Technology Radar](https://www.thoughtworks.com/radar) — Ring-based classification (Adopt, Trial, Assess, Hold) for assessing technology maturity and organizational readiness
- [PyPI Package Analytics API](https://pypi.org/help/#apitokens) — Programmatic access to download statistics, release history, and dependency metadata for quantitative evaluation
- [GitHub API — Repository Metrics](https://docs.github.com/en/rest/repos) — Query stars, forks, commit frequency, contributor activity, and issue resolution rates as adoption signals

---

*This skill is designed to produce quantitative, auditable data that feeds into the scoring matrices used by `framework-selection`. Run the automated evaluation harnesses first, then apply weighted decision frameworks to the resulting data for defensible technology decisions.*
