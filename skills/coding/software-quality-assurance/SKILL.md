---




name: software-quality-assurance
description: Orchestrates comprehensive software quality assurance including static analysis, fuzzing, load testing, security scanning, dependency auditing, and compliance validation to ensure production-ready software meets all quality thresholds.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: software quality assurance, SQA, static analysis, code fuzzing, load testing, security scanning, dependency audit, how do i ensure software quality
  archetypes:
    - tactical
    - diagnostic
    - enforcement
  anti_triggers:
    - brainstorming
    - vague ideation
    - long-form architecture
  response_profile:
    verbosity: medium
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
  related-skills: software-testing-strategy, code-quality-policies, dependency-supply-chain-security, observability-patterns, production-readiness, software-engineering-principles




---





# Software Quality Assurance

This skill makes the model act as a quality engineering lead who designs and implements multi-layered quality gates across the development lifecycle. From static code analysis through production monitoring, every release is evaluated against defined quality thresholds before reaching end users. This covers the full quality spectrum — not just unit tests, but the complete assurance pipeline that catches defects early, prevents regressions, and guarantees production readiness.

## TL;DR Checklist

- [ ] Static analysis passes with zero critical and zero high-severity violations
- [ ] Fuzzing tests run against all public APIs and input-parsing functions
- [ ] Performance benchmarks meet defined SLA targets (p95 < threshold)
- [ ] Dependency scan reports zero critical and zero high vulnerabilities
- [ ] License compliance check passes for all direct and transitive dependencies
- [ ] Secret scanning finds no hardcoded credentials, tokens, or API keys
- [ ] Quality trend dashboard shows stable or improving pass rates over 30 days

---

## When to Use

Use this skill when:

- Conducting a pre-release quality audit before pushing to staging or production
- Implementing new quality gates in a CI/CD pipeline that don't currently exist
- Investigating a production regression where the root cause may be a quality gap (e.g., missing fuzz coverage, untested edge cases)
- Setting up SLO-based quality monitoring tied to measurable thresholds (error rates, latency budgets, security score)
- Running a quarterly code health assessment across multiple services or repositories

---

## When NOT to Use

Avoid this skill for:

- Designing unit test strategies — use `software-testing-strategy` instead (focuses on individual function and class testing)
- Deep vulnerability analysis of discovered CVEs — use `security-review` for exploit chain analysis and remediation prioritization
- Fixing runtime performance bottlenecks — use `performance-optimization` for profiling, algorithmic improvements, and resource tuning

---

## Core Workflow

### 1. Define Quality Thresholds per Layer

Map each quality gate to measurable, enforceable thresholds. Every layer needs concrete pass/fail criteria with severity levels and remediation timeframes. A threshold without enforcement is noise.

```python
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional


class Severity(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class RemediationSLA(str, Enum):
    BLOCKING = "block merge immediately"
    SAME_SPRINT = "fix within 1 sprint (2 weeks)"
    NEXT_RELEAS E = "fix within next major release"
    BACKLOG = "add to backlog for future triage"


@dataclass(frozen=True)
class StaticAnalysisThresholds:
    max_critical_violations: int = 0
    max_high_violations: int = 0
    max_medium_violations: int = 10
    min_complexity_score: float = 70.0  # radon CC score baseline
    max_function_cyclomatic: int = 10
    max_module_cyclomatic: int = 50
    max_lines_per_function: int = 50
    max_lines_per_file: int = 300


@dataclass(frozen=True)
class FuzzingThresholds:
    min_propositional_runs: int = 10_000
    min_edge_coverage_pct: float = 85.0
    max_fuzzer_crashes: int = 0
    must_test_functions: list[str] = field(default_factory=list)


@dataclass(frozen=True)
class PerformanceThresholds:
    max_p95_response_ms: int = 200
    max_p99_response_ms: int = 500
    min_requests_per_second: int = 100
    max_error_rate_pct: float = 0.1
    max_cpu_utilization_pct: float = 75.0
    max_memory_mb: int = 512


@dataclass(frozen=True)
class SecurityThresholds:
    max_critical_vulns: int = 0
    max_high_vulns: int = 0
    max_medium_vulns: int = 5
    secret_patterns: list[str] = field(default_factory=lambda: [
        "AKIA[0-9A-Z]{16}",           # AWS keys
        "sk-[a-zA-Z0-9]{48}",         # API keys
        "-----BEGIN (RSA |EC )?PRIVATE KEY-----",
        "password\s*=\s*['\"][^'\"]+['\"]",
        "api_key\s*:\s*['\"][^'\"]+['\"]",
    ])


@dataclass(frozen=True)
class QualityGateConfig:
    static_analysis: StaticAnalysisThresholds = field(default_factory=StaticAnalysisThresholds)
    fuzzing: FuzzingThresholds = field(default_factory=FuzzingThresholds)
    performance: PerformanceThresholds = field(default_factory=PerformanceThresholds)
    security: SecurityThresholds = field(default_factory=SecurityThresholds)

    @classmethod
    def validate_thresholds(cls, config: "QualityGateConfig") -> list[str]:
        """Validate that thresholds are set to reasonable minimums."""
        warnings: list[str] = []
        if config.static_analysis.min_complexity_score < 50.0:
            warnings.append(
                "Complexity threshold below 50 is too permissive — "
                "enforces nearly no code quality"
            )
        if config.performance.max_p95_response_ms > 1000:
            warnings.append(
                "P95 latency threshold above 1000ms may indicate poor SLA discipline"
            )
        if config.security.max_critical_vulns > 0:
            warnings.append("Critical vulnerability allowance is non-zero — "
                            "production security requires zero critical vulns")
        return warnings
```

**BAD:** Setting thresholds to zero or None with the assumption that "we will handle failures manually."

```python
# ❌ BAD — no real thresholds, manual override expected
class QualityConfig:
    static_analysis_violations_allowed = 999
    performance_target = None  # "we'll see"
    security_critical_allowed = 0  # only critical? what about high?
```

**GOOD:** Every layer has explicit, measurable thresholds with validation that catches permissive configs.

---

### 2. Implement Static Analysis Pipeline

Static analysis is the first line of defense. Run it on every pull request, combine multiple tools, and enforce pass/fail based on configured thresholds. This pipeline covers linting (ruff), type checking (mypy), complexity measurement (radon), and duplication detection.

```python
import subprocess
import json
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Optional


@dataclass
class AnalysisIssue:
    file: str
    line: int
    severity: str  # "critical", "high", "medium", "low"
    rule: str
    message: str


def run_static_analysis(
    source_dir: str,
    thresholds: StaticAnalysisThresholds,
) -> dict[str, list[AnalysisIssue]]:
    """Orchestrate multi-tool static analysis and return structured results."""
    issues: dict[str, list[AnalysisIssue]] = {}

    # --- Linting with ruff ---
    lint_issues = _run_ruff(source_dir, thresholds)
    if lint_issues:
        issues["linting"] = lint_issues
        if len([i for i in lint_issues if i.severity in ("critical", "high")]) > thresholds.max_critical_violations + thresholds.max_high_violations:
            print(f"[FAIL] Linting exceeded violation budget: {len(lint_issues)} issues found")
            return _mark_gate_failed(issues, "linting")

    # --- Type checking with mypy ---
    type_issues = _run_mypy(source_dir, thresholds)
    if type_issues:
        issues["type_checking"] = type_issues

    # --- Complexity analysis with radon ---
    complexity_issues = _run_radon(source_dir, thresholds)
    if complexity_issues:
        issues["complexity"] = complexity_issues

    # --- Duplication detection with similarity (detect-secrets / flake8-bugbear fallback) ---
    dup_issues = _run_duplication_check(source_dir)
    if dup_issues:
        issues["duplication"] = dup_issues

    return _compile_gate_result("static_analysis", issues)


def _run_ruff(source_dir: str, thresholds: StaticAnalysisThresholds) -> list[AnalysisIssue]:
    """Run ruff linter and parse output into structured issues."""
    result = subprocess.run(
        ["ruff", "check", "--output-format=json", source_dir],
        capture_output=True, text=True, timeout=120,
    )

    if not result.stdout.strip():
        return []

    violations = json.loads(result.stdout)
    issues: list[AnalysisIssue] = []
    for v in violations:
        severity = "critical" if v.get("level") == "error" else "high" if v.get("rule") in ("F841",) else "medium"
        issues.append(AnalysisIssue(
            file=v["filename"],
            line=v["location"]["row"],
            severity=severity,
            rule=v["code"],
            message=v["message"],
        ))
    return issues


def _run_mypy(source_dir: str, thresholds: StaticAnalysisThresholds) -> list[AnalysisIssue]:
    """Run mypy type checker and parse errors."""
    result = subprocess.run(
        ["mypy", "--show-error-codes", "--no-error-summary", source_dir],
        capture_output=True, text=True, timeout=180,
    )

    issues: list[AnalysisIssue] = []
    for line in (result.stderr or result.stdout).splitlines():
        if ":" not in line:
            continue
        parts = line.split(":", 3)
        if len(parts) >= 4:
            issues.append(AnalysisIssue(
                file=parts[0],
                line=int(parts[1]),
                severity="high",
                rule=parts[2].strip(),
                message=parts[3].strip(),
            ))
    return issues


def _run_radon(source_dir: str, thresholds: StaticAnalysisThresholds) -> list[AnalysisIssue]:
    """Run radon for cyclomatic complexity analysis."""
    result = subprocess.run(
        ["radon", "cc", source_dir, "--json"],
        capture_output=True, text=True, timeout=120,
    )

    if not result.stdout.strip():
        return []

    modules = json.loads(result.stdout)
    issues: list[AnalysisIssue] = []
    for module_data in modules:
        for func_name, cc_score in module_data.get("complexity", {}).items():
            if isinstance(cc_score, dict):
                cc_score = cc_score.get("score", 0)
            if cc_score > thresholds.max_function_cyclomatic:
                issues.append(AnalysisIssue(
                    file=module_data["name"],
                    line=0,
                    severity="high" if cc_score > 20 else "medium",
                    rule=f"CC={cc_score}",
                    message=f"Function '{func_name}' has cyclomatic complexity {cc_score} "
                            f"(threshold: {thresholds.max_function_cyclomatic})",
                ))
    return issues


def _run_duplication_check(source_dir: str) -> list[AnalysisIssue]:
    """Check for code duplication using radon dup."""
    result = subprocess.run(
        ["radon", "dup", source_dir],
        capture_output=True, text=True, timeout=120,
    )
    # Radon dup output is human-readable; parse lines matching the pattern
    issues: list[AnalysisIssue] = []
    for line in (result.stdout or "").splitlines():
        if "---" in line and len(line.strip()) > 40:
            parts = line.split("---")
            if len(parts) >= 2:
                issues.append(AnalysisIssue(
                    file=parts[1].strip(),
                    line=0,
                    severity="low",
                    rule="DRY",
                    message="Potential code duplication detected",
                ))
    return issues


def _mark_gate_failed(
    issues: dict[str, list[AnalysisIssue]], gate_name: str
) -> dict:
    """Return a structured gate result for a failed check."""
    return {
        "gate": gate_name,
        "passed": False,
        "issues_count": sum(len(v) for v in issues.values()),
        "critical_issues": sum(
            1 for vi in issues.values() for v in vi if v.severity == "critical"
        ),
        "details": issues,
    }


def _compile_gate_result(gate_name: str, issues: dict) -> dict:
    total = sum(len(v) for v in issues.values())
    return {
        "gate": gate_name,
        "passed": total == 0,
        "issues_count": total,
        "details": issues if total > 0 else {},
    }
```

---

### 3. Design Fuzz Testing Strategy

Fuzz testing catches bugs that unit tests miss — edge cases in parsing, unexpected input formats, and boundary value errors. Use property-based testing (hypothesis) for structured inputs and seed-driven fuzzing for binary protocols or serialized data. Every function that parses external input MUST have fuzz coverage.

```python
from hypothesis import given, settings, Phase, Verbosity, assume
from hypothesis.strategies import text, binary, integers, floats, builds, one_of
import hashlib


def parse_user_input(raw: str) -> dict:
    """Parse user-submitted data with strict type and format validation.

    This is the kind of function that crashes on unexpected input in production.
    Fuzz testing finds those crashes before deployment.
    """
    if not isinstance(raw, str):
        raise TypeError(f"Expected str, got {type(raw).__name__}")

    # Simulate a real-world parsing function with multiple failure modes
    raw = raw.strip()
    if len(raw) == 0:
        return {"data": None}

    # Attempt to parse JSON
    try:
        import json
        parsed = json.loads(raw)
        return {"parsed": parsed, "type": "json"}
    except (json.JSONDecodeError, ValueError):
        # JSON invalid; fall through to CSV parsing below

    # Fallback: attempt CSV-like splitting
    parts = raw.split(",")
    result = {}
    for part in parts:
        if "=" in part:
            key, _, value = part.partition("=")
            result[key.strip()] = value.strip()

    return {"parsed": result, "type": "keyvalue"}


@given(
    raw=text(max_size=10_000),
    seed_bytes=binary(min_size=0, max_size=1024),
)
@settings(
    max_examples=5000,
    phases=[Phase.generate],
    verbosity=Verbosity.verbose,
    deadline=None,  # fuzzing needs adaptive timeouts
)
def test_parse_user_input_is_idempotent_on_valid(raw: str, seed_bytes: bytes):
    """Property: parsing the same input always produces the same output."""
    first = parse_user_input(raw)
    second = parse_user_input(raw)
    assert first == second, f"Non-idempotent: {raw[:50]}"


@given(text(max_size=1_000_000))
@settings(max_examples=1000, deadline=None)
def test_parse_large_unicode_inputs(s: str):
    """Property: large and malformed Unicode inputs don't crash the parser."""
    assume(len(s) > 100)
    result = parse_user_input(s)
    assert isinstance(result, dict), "Parser should always return a dict"
    assert "type" in result, "Result must always include type field"


@given(one_of(text(), binary()))
@settings(max_examples=2000, phases=[Phase.generate], deadline=None)
def test_parse_handles_non_string_input(value):
    """Property: non-string inputs raise TypeError consistently."""
    if isinstance(value, str):
        return  # valid path already covered above

    try:
        parse_user_input(value)
        assert False, f"Should have raised TypeError for {type(value).__name__}"
    except TypeError:
        pass  # expected behavior


@given(
    text(max_size=500),
    integers(min_value=-1_000_000, max_value=1_000_000),
)
def test_parse_boundary_values(body: str, n: int):
    """Property: numeric boundary values in string form don't cause overflow."""
    mixed = f"{body},value={n}"
    result = parse_user_input(mixed)
    assert isinstance(result, dict)

    # Special case: Python handles big ints fine, but JSON does not
    json_payload = f'{{"number": {n}}}'
    if n == 1_000_000_000_000_000_000_000_000:
        # This exceeds JSON number precision — should handle gracefully
        try:
            result = parse_user_input(json_payload)
            assert isinstance(result, dict)
        except (json.JSONDecodeError, ValueError):
            pass  # acceptable to reject unparseable JSON
```

**BAD:** Only testing happy-path inputs with unit tests and skipping fuzz coverage entirely.

```python
# ❌ BAD — only happy path, no fuzzing
def test_parse_happy_path():
    result = parse_user_input("key=value")
    assert result == {"parsed": {"key": "value"}, "type": "keyvalue"}
```

**GOOD:** Property-based tests cover edge cases the developer never imagined.

---

### 4. Execute Performance Load Tests

Load testing validates that systems meet performance SLAs under realistic traffic patterns. Define scenarios that mirror production, execute them with a proper load testing framework, and evaluate results against threshold targets.

```python
import time
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class LoadTestResult:
    """Structured result from a load test execution."""
    total_requests: int = 0
    successful_requests: int = 0
    failed_requests: int = 0
    error_rate_pct: float = 0.0
    avg_response_ms: float = 0.0
    p50_response_ms: float = 0.0
    p95_response_ms: float = 0.0
    p99_response_ms: float = 0.0
    requests_per_second: float = 0.0
    failed_scenarios: list[str] = field(default_factory=list)

    def evaluate_against_sla(self, sla: PerformanceThresholds) -> dict[str, bool]:
        """Check each SLA metric and return pass/fail per check."""
        checks = {
            "p95_response_time": self.p95_response_ms <= sla.max_p95_response_ms,
            "p99_response_time": self.p99_response_ms <= sla.max_p99_response_ms,
            "throughput": self.requests_per_second >= sla.min_requests_per_second,
            "error_rate": self.error_rate_pct <= sla.max_error_rate_pct,
        }
        return checks

    @property
    def passed(self) -> bool:
        return self.failed_requests == 0 and len(self.failed_scenarios) == 0


def run_load_test_scenario(
    target_url: str,
    users: int = 50,
    spawn_rate: float = 5.0,
    duration_seconds: int = 60,
) -> dict:
    """Execute a load test using locust's Python API (headless mode)."""
    import subprocess

    cmd = [
        "locust",
        "--headless",
        "-u", str(users),
        "-r", str(spawn_rate),
        "--run-time", f"{duration_seconds}s",
        "--host", target_url,
        "--csv=/tmp/loadtest_results",
        "--logfile=/tmp/loadtest.log",
    ]

    result = subprocess.run(
        cmd, capture_output=True, text=True, timeout=duration_seconds + 120,
    )

    # Parse the summary CSV that locust generates
    results = parse_locust_results()
    return results


def parse_locust_results() -> dict:
    """Parse locust's generated CSV into structured result."""
    import csv

    p95_values = []
    total_requests = 0
    failures = 0

    try:
        with open("/tmp/loadtest_results_stats.csv", newline="") as f:
            reader = csv.DictReader(f)
            for row in reader:
                name = row.get("name", "overall")
                num_requests = int(row.get("num_requests", 0))
                num_failures = int(row.get("num_failures", 0))
                avg_response = float(row.get("avg_response_time", 0))
                median = float(row.get("median_response_time", 0))
                p95 = float(row.get("50_percentile", row.get("avg_response_time", 0)))

                total_requests += num_requests
                failures += num_failures
                if name != "total" and name:
                    p95_values.append(p95)

    except FileNotFoundError:
        return {"error": "Locust results file not found — run test first"}

    error_rate = (failures / total_requests * 100) if total_requests > 0 else 0.0

    return {
        "total_requests": total_requests,
        "failed_requests": failures,
        "error_rate_pct": round(error_rate, 2),
        "avg_response_ms": round(p95_values[0] if p95_values else 0, 1),
        "p95_response_ms": round(max(p95_values) if p95_values else 0, 1),
    }


def evaluate_performance(
    results: dict,
    sla: PerformanceThresholds,
) -> LoadTestResult:
    """Evaluate load test results against SLA thresholds."""
    failed_scenarios = []

    checks = {
        "p95": results.get("p95_response_ms", 0) <= sla.max_p95_response_ms,
        "error_rate": results.get("error_rate_pct", 0) <= sla.max_error_rate_pct,
    }

    for name, passed in checks.items():
        if not passed:
            failed_scenarios.append(f"SLA violated on {name}")

    return LoadTestResult(
        total_requests=results["total_requests"],
        failed_requests=results["failed_requests"],
        error_rate_pct=results["error_rate_pct"],
        p95_response_ms=results.get("p95_response_ms", 0),
        failed_scenarios=failed_scenarios,
    )
```

---

### 5. Run Security Scanning & Dependency Audit

Security scanning catches known vulnerabilities, exposed secrets, and license compliance issues before they become production incidents. This step combines dependency vulnerability scanning, secret detection, and license analysis.

```python
import subprocess
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional


@dataclass
class SecurityFinding:
    category: str  # "vulnerability", "secret", "license"
    severity: str
    file_or_package: str
    description: str
    remediation: str
    cve_id: Optional[str] = None


def security_audit(
    project_root: str,
    thresholds: SecurityThresholds,
) -> dict[str, list[SecurityFinding]]:
    """Run comprehensive security audit across dependencies, secrets, and licenses."""
    findings: dict[str, list[SecurityFinding]] = {}

    # 1. Dependency vulnerability scanning
    dep_findings = _scan_dependencies(project_root, thresholds)
    if dep_findings:
        findings["dependencies"] = dep_findings

    # 2. Secret scanning for hardcoded credentials
    secret_findings = _scan_for_secrets(project_root, thresholds)
    if secret_findings:
        findings["secrets"] = secret_findings

    # 3. License compliance check
    license_findings = _check_license_compliance(project_root)
    if license_findings:
        findings["licenses"] = license_findings

    return _compile_security_result(findings, thresholds)


def _scan_dependencies(project_root: str, thresholds: SecurityThresholds) -> list[SecurityFinding]:
    """Scan project dependencies for known vulnerabilities using safety."""
    result = subprocess.run(
        ["safety", "check", "--json", "--project-root", project_root],
        capture_output=True, text=True, timeout=180,
    )

    findings: list[SecurityFinding] = []
    if not result.stdout.strip():
        return findings

    try:
        vulnerabilities = json.loads(result.stdout)
    except (json.JSONDecodeError, TypeError):
        # Fallback to text parsing
        for line in (result.stdout or "").splitlines():
            if "vulnerable" in line.lower() and not line.startswith("#"):
                findings.append(SecurityFinding(
                    category="vulnerability",
                    severity="high",
                    file_or_package=line.strip(),
                    description="Potential vulnerability found in dependency",
                    remediation="Update to patched version or use alternative",
                ))
        return findings

    for vuln in vulnerabilities:
        sev = "critical" if vuln.get("vulnerability_severity") == "CRITICAL" else "high"
        findings.append(SecurityFinding(
            category="vulnerability",
            severity=sev,
            file_or_package=vuln.get("dependency_name", "unknown"),
            description=vuln.get("vulnerability", {}).get("description", "No description"),
            remediation=vuln.get("advisory_link", "Review advisory and update dependency"),
            cve_id=vuln.get("vulnerability_id"),
        ))

    return findings


def _scan_for_secrets(project_root: str, thresholds: SecurityThresholds) -> list[SecurityFinding]:
    """Scan source code for hardcoded secrets using regex patterns."""
    findings: list[SecurityFinding] = []
    root_path = Path(project_root)

    # Skip common non-source directories
    excluded_dirs = {".git", "__pycache__", "node_modules", ".venv", "venv", ".tox"}

    for filepath in root_path.rglob("*"):
        if filepath.suffix in {".py", ".js", ".ts", ".yml", ".yaml", ".json", ".env", ".toml", ".cfg"}:
            try:
                content = filepath.read_text(errors="ignore")
            except (OSError, PermissionError):
                continue

            # Check if file is in an excluded directory
            rel_parts = set(filepath.relative_to(root_path).parts)
            if rel_parts & excluded_dirs:
                continue

            for pattern in thresholds.secret_patterns:
                matches = list(re.finditer(pattern, content))
                for match in matches:
                    line_num = content[:match.start()].count("\n") + 1
                    findings.append(SecurityFinding(
                        category="secret",
                        severity="critical",
                        file_or_package=str(filepath),
                        description=f"Potential secret detected at line {line_num}",
                        remediation="Move to environment variable or secrets manager (e.g., Vault, AWS Secrets Manager)",
                    ))

    # Attempt gitleaks integration if available
    try:
        result = subprocess.run(
            ["gitleaks", "detect", "--source", project_root, "--report-format", "json"],
            capture_output=True, text=True, timeout=300,
        )
        if result.returncode == 0 and result.stdout.strip():
            gitleaks_results = json.loads(result.stdout)
            for finding in gitleaks_results:
                findings.append(SecurityFinding(
                    category="secret",
                    severity="critical",
                    file_or_package=finding.get("File", "unknown"),
                    description=f"Leaked secret: {finding.get('Description', 'Unknown pattern')}",
                    remediation="Rotate the credential immediately and remove from source code",
                ))
    except (subprocess.FileNotFoundError, json.JSONDecodeError):
        pass  # gitleaks not installed or failed to parse — regex scan still applies

    return findings


def _check_license_compliance(project_root: str) -> list[SecurityFinding]:
    """Check open-source license compliance of direct and transitive dependencies."""
    findings: list[SecurityFinding] = []

    result = subprocess.run(
        ["pip-licenses", "--format=json"],
        capture_output=True, text=True, timeout=60,
    )

    if not result.stdout.strip():
        return findings

    try:
        licenses = json.loads(result.stdout)
    except (json.JSONDecodeError, TypeError):
        return findings

    # SPDX identifiers for commonly unacceptable licenses
    unacceptable_licenses = {"AGPL-3.0", "SSPL-1.0", "BSL-1.1"}

    for pkg in licenses:
        license_name = pkg.get("License", "UNKNOWN")
        if license_name in unacceptable_licenses:
            findings.append(SecurityFinding(
                category="license",
                severity="high",
                file_or_package=f"{pkg.get('Name', 'unknown')}=={pkg.get('Version', '?')}",
                description=f"License '{license_name}' may have copyleft or commercial restrictions",
                remediation=f"Review {license_name} terms, consider replacing with permissively licensed alternative",
            ))

    return findings


def _compile_security_result(
    findings: dict[str, list[SecurityFinding]],
    thresholds: SecurityThresholds,
) -> dict:
    """Compile security audit into a structured pass/fail result."""
    critical_count = sum(1 for f in findings.values() for ff in f if ff.severity == "critical")
    high_count = sum(1 for f in findings.values() for ff in f if ff.severity == "high")

    passed = (
        critical_count <= thresholds.max_critical_vulns
        and high_count <= thresholds.max_high_vulns
    )

    return {
        "audit_passed": passed,
        "critical_findings": critical_count,
        "high_findings": high_count,
        "total_findings": sum(len(f) for f in findings.values()),
        "categories": {k: len(v) for k, v in findings.items()},
        "details": {k: [f.__dict__ for f in v] for k, v in findings.items()},
    }
```

---

### 6. Generate Quality Dashboard & Gate Report

Aggregate results from all quality gate layers into a single authoritative report. This dashboard shows pass/fail status per layer, an overall quality score, trend data, and actionable remediation guidance — not just "failed."

```python
import json
from dataclasses import dataclass, field, asdict
from datetime import datetime, timedelta
from enum import Enum
from typing import Optional


class GateStatus(str, Enum):
    PASSED = "passed"
    FAILED = "failed"
    WARNING = "warning"
    SKIPPED = "skipped"


@dataclass
class QualityGateLayerResult:
    layer_name: str
    status: GateStatus
    score: float  # 0-100
    issues_count: int
    critical_issues: int
    severity_breakdown: dict[str, int] = field(default_factory=dict)
    remediation_steps: list[str] = field(default_factory=list)
    trend_direction: str = "stable"  # "improving", "stable", "degrading"


class QualityReportGenerator:
    """Aggregates all quality gate results into a structured report."""

    def __init__(self):
        self.layer_results: list[QualityGateLayerResult] = []
        self.historical_scores: dict[str, list[tuple[datetime, float]]] = {}

    def add_layer_result(self, result: QualityGateLayerResult):
        self.layer_results.append(result)
        # Track trend data
        if result.layer_name not in self.historical_scores:
            self.historical_scores[result.layer_name] = []
        self.historical_scores[result.layer_name].append(
            (datetime.now(), result.score)
        )

    def calculate_overall_score(self) -> float:
        """Calculate weighted overall quality score (0-100)."""
        weights = {
            "static_analysis": 0.25,
            "fuzzing": 0.20,
            "performance": 0.20,
            "security": 0.30,
        }

        total_weighted = 0.0
        total_weight = 0.0

        for layer in self.layer_results:
            weight = weights.get(layer.layer_name, 0.15)
            total_weighted += layer.score * weight
            total_weight += weight

        return round(total_weighted / total_weight, 1) if total_weight > 0 else 0.0

    def identify_top_concerns(self) -> list[dict]:
        """Return the top 5 most urgent quality concerns."""
        concerns = []
        for layer in self.layer_results:
            if layer.status == GateStatus.FAILED and layer.critical_issues > 0:
                concerns.append({
                    "layer": layer.layer_name,
                    "severity": "critical",
                    "issues": layer.critical_issues,
                    "description": f"Critical issues in {layer.layer_name} require immediate attention",
                    "remediation": layer.remediation_steps[0] if layer.remediation_steps else "Review gate documentation for fix guidance",
                })

        for layer in self.layer_results:
            if layer.status == GateStatus.FAILED and layer.critical_issues == 0:
                concerns.append({
                    "layer": layer.layer_name,
                    "severity": layer.severity_breakdown.get("high", 0) > 0 and "high" or "medium",
                    "issues": layer.issues_count,
                    "description": f"{layer.layer_name} gate failed with {layer.issues_count} issues",
                    "remediation": layer.remediation_steps[0] if layer.remediation_steps else "Review test output for details",
                })

        concerns.sort(key=lambda c: (0 if c["severity"] == "critical" else 1, -c["issues"]))
        return concerns[:5]

    def generate_report(self, format: str = "json") -> str:
        """Generate the complete quality report."""
        overall_score = self.calculate_overall_score()
        top_concerns = self.identify_top_concerns()

        all_passed = all(
            l.status in (GateStatus.PASSED, GateStatus.WARNING)
            for l in self.layer_results
        )

        report = {
            "report_metadata": {
                "generated_at": datetime.now().isoformat(),
                "overall_score": overall_score,
                "quality_status": "PASS" if all_passed and overall_score >= 70 else "FAIL",
                "layers_evaluated": len(self.layer_results),
            },
            "layer_results": [asdict(lr) for lr in self.layer_results],
            "overall_score": overall_score,
            "top_concerns": top_concerns,
            "remediation_summary": self._generate_remediation_summary(top_concerns),
        }

        if format == "json":
            return json.dumps(report, indent=2, default=str)
        elif format == "markdown":
            return self._format_as_markdown(report)

    def _generate_remediation_summary(self, concerns: list[dict]) -> list[str]:
        """Generate prioritized remediation guidance."""
        if not concerns:
            return ["All quality gates passed. No action required."]

        steps = []
        for i, concern in enumerate(concerns, 1):
            severity_label = "🔴 CRITICAL" if concern["severity"] == "critical" else "🟡 WARNING"
            steps.append(
                f"{i}. [{severity_label}] {concern['layer']}: {concern['remediation']} "
                f"({concern['issues']} issues)"
            )
        return steps

    def _format_as_markdown(self, report: dict) -> str:
        """Format the report as human-readable markdown."""
        lines = [
            "# Quality Assurance Report",
            "",
            f"**Generated:** {report['report_metadata']['generated_at']}",
            f"**Overall Score:** {report['overall_score']}/100",
            f"**Status:** {'✅ PASS' if report['quality_status'] == 'PASS' else '❌ FAIL'}",
            "",
            "---",
            "",
            "## Layer Results",
        ]

        for layer in report["layer_results"]:
            icon = "✅" if layer["status"] == "passed" else "❌" if layer["status"] == "failed" else "⚠️"
            lines.append(f"- {icon} **{layer['layer_name']}**: Score {layer['score']}/100 "
                         f"({layer['issues_count']} issues, {layer['critical_issues']} critical)")

        if report.get("top_concerns"):
            lines.extend(["", "---", "", "## Top Concerns"])
            for concern in report["top_concerns"]:
                lines.append(f"- **{concern['layer']}** ({concern['severity']}): {concern['description']}")
                lines.append(f"  - Remediation: {concern['remediation']}")

        if report.get("remediation_summary"):
            lines.extend(["", "---", "", "## Prioritized Remediation"])
            lines.extend(report["remediation_summary"])

        return "\n".join(lines)
```

**BAD:** A quality gate that just says "failed" without telling the developer what to fix.

```python
# ❌ BAD — unhelpful failure reporting
if static_analysis_failed():
    raise Exception("Quality check failed")  # No details, no remediation path
```

**GOOD:** A report that shows exactly which gate failed, how many issues, and what to do about each one.

---

## Implementation Patterns

### Pattern 1: Quality Gate Configuration Schema

Use Pydantic models for configuration validation at load time. This catches misconfigured thresholds before the pipeline runs, rather than silently passing weak gates.

```python
from pydantic import BaseModel, Field, field_validator


class StaticAnalysisConfig(BaseModel):
    max_critical_violations: int = Field(default=0, ge=0)
    max_high_violations: int = Field(default=0, ge=0)
    min_complexity_score: float = Field(default=70.0, ge=50.0, le=100.0)
    max_function_cyclomatic: int = Field(default=10, ge=3, le=25)

    @field_validator("min_complexity_score")
    @classmethod
    def reject_permissive_complexity(cls, v: float) -> float:
        if v < 60.0:
            raise ValueError(
                "Complexity threshold below 60 is too permissive — "
                "enforces nearly no code quality discipline"
            )
        return v


class SecurityConfig(BaseModel):
    max_critical_vulns: int = Field(default=0, ge=0, le=0)
    max_high_vulns: int = Field(default=0, ge=0)

    @field_validator("max_critical_vulns")
    @classmethod
    def enforce_zero_critical(cls, v: int) -> int:
        if v != 0:
            raise ValueError(
                "Critical vulnerability allowance must be exactly zero — "
                "no production software should ship with known critical CVEs"
            )
        return v


class QualityGateSchema(BaseModel):
    static_analysis: StaticAnalysisConfig = Field(default_factory=StaticAnalysisConfig)
    security: SecurityConfig = Field(default_factory=SecurityConfig)

    class Config:
        extra = "forbid"  # reject unknown fields to catch typos early
```

### Pattern 2: Multi-Layer Test Execution Engine

A unified engine that orchestrates all quality gate layers, supports fail-fast behavior, and produces consistent reporting regardless of which tools are installed.

```python
class QualityGateEngine:
    """Runs all quality gate layers in order with fail-fast support."""

    LAYER_ORDER = [
        "static_analysis",
        "dependency_scan",
        "fuzzing",
        "security_audit",
        "performance_test",
    ]

    def __init__(self, config: QualityGateConfig):
        self.config = config
        self.results: dict[str, dict] = {}
        self.fail_fast = True

    def execute_all(self) -> dict:
        """Run all quality gate layers and return unified results."""
        for layer in self.LAYER_ORDER:
            runner = getattr(self, f"_run_{layer}", None)
            if runner is None:
                continue

            try:
                result = runner()
                self.results[layer] = result
            except Exception as e:
                self.results[layer] = {
                    "status": "error",
                    "error": str(e),
                    "score": 0,
                }

            # Fail-fast: stop on any critical failure
            if self.fail_fast and not result.get("passed", False):
                critical_count = result.get("critical_issues", 0)
                if critical_count > 0:
                    break

        return self._produce_final_report()

    def _run_static_analysis(self) -> dict:
        try:
            analysis_result = run_static_analysis(
                source_dir=".",
                thresholds=self.config.static_analysis,
            )
            return {**analysis_result, "layer": "static_analysis"}
        except FileNotFoundError as e:
            return {"status": "skipped", "reason": f"Tool not found: {e}", "score": 0}

    def _run_dependency_scan(self) -> dict:
        try:
            return security_audit(".", self.config.security)
        except FileNotFoundError:
            return {"status": "skipped", "reason": "safety tool not installed", "score": 0}

    def _run_fuzzing(self) -> dict:
        # Fuzzing is typically invoked via pytest-hypothesis; check test results
        import subprocess
        result = subprocess.run(
            ["python", "-m", "pytest", "-v", "--hypothesis-max-examples=500"],
            capture_output=True, text=True, timeout=300,
        )
        passed = result.returncode == 0
        return {
            "passed": passed,
            "status": "passed" if passed else "failed",
            "score": 100.0 if passed else 25.0,
            "critical_issues": 0 if passed else 1,
            "layer": "fuzzing",
        }

    def _run_security_audit(self) -> dict:
        return security_audit(".", self.config.security)

    def _run_performance_test(self) -> dict:
        try:
            raw = run_load_test_scenario("http://localhost:8080", users=25, duration_seconds=30)
            result = evaluate_performance(raw, self.config.performance)
            return {
                "passed": result.passed,
                "status": "passed" if result.passed else "failed",
                "score": max(0, 100 - (result.error_rate_pct * 50)),
                "layer": "performance",
            }
        except Exception as e:
            return {"status": "skipped", "reason": str(e), "score": 0}

    def _produce_final_report(self) -> dict:
        report = QualityReportGenerator()

        for layer, result in self.results.items():
            status = GateStatus.PASSED if result.get("passed", False) else GateStatus.FAILED
            score = result.get("score", 0.0 if status == GateStatus.PASSED else 20.0)

            report.add_layer_result(QualityGateLayerResult(
                layer_name=layer,
                status=status,
                score=score,
                issues_count=result.get("issues_count", 0),
                critical_issues=result.get("critical_issues", 0),
                severity_breakdown=result.get("severity_breakdown", {}),
            ))

        return json.loads(report.generate_report(format="json"))


# Usage:
# engine = QualityGateEngine(config=QualityGateConfig())
# report = engine.execute_all()
```

### Pattern 3: Fuzz Testing for API Endpoints

Property-based testing specifically designed for REST API contracts. This generates valid and invalid inputs, validates schema compliance, and checks business logic correctness across edge cases.

```python
from hypothesis import given, settings, Verbosity
from hypothesis.strategies import lists, just, none, one_of, from_regex


def validate_api_response(data: dict) -> bool:
    """Validate that an API response conforms to the expected schema."""
    required_fields = {"status", "data", "timestamp"}
    if not isinstance(data, dict):
        return False
    if not required_fields.issubset(data.keys()):
        return False
    if data.get("status") not in ("success", "error", "warning"):
        return False
    return True


@given(
    one_of(
        just({}),
        none(),
        lists(from_regex(r"[a-zA-Z0-9]+"), max_size=10000),
        lists(just(""), min_size=1, max_size=1),  # empty strings only
    ),
)
@settings(max_examples=3000, verbosity=Verbosity.verbose, deadline=None)
def test_api_contract_with_invalid_inputs(payload):
    """Property: the API layer must handle all inputs gracefully — no uncaught exceptions."""
    try:
        # Simulate API request processing with arbitrary input
        if payload is None:
            response = {"status": "error", "data": None, "timestamp": "now"}
        elif isinstance(payload, dict):
            response = {"status": "success", "data": payload, "timestamp": "now"}
        elif isinstance(payload, list):
            response = {
                "status": "warning" if len(payload) > 100 else "success",
                "data": payload[:50],  # truncate large payloads
                "timestamp": "now",
            }
        else:
            response = {"status": "error", "data": str(payload)[:200], "timestamp": "now"}

        assert validate_api_response(response), f"Schema violation for input type {type(payload).__name__}"
    except Exception as e:
        # Any unhandled exception is a contract violation — the API should never crash
        raise AssertionError(f"API contract violated: unhandled exception for {type(payload).__name__}: {e}")
```

---

## Constraints

### MUST DO

- Run at minimum: linting + type checking + dependency scanning on every pull request
- Block merges when critical or high-severity vulnerabilities are found
- Maintain a quality trend dashboard showing gate pass rates over the last 30 days
- Include remediation guidance in every failing report — don't just say "failed"
- Re-run full quality suite before any production deployment

### MUST NOT DO

- Disable any quality gate without documented approval and expiration date
- Set coverage thresholds below 70% for critical modules or 60% overall
- Ignore license compliance of transitive dependencies
- Use "it works on my machine" as justification for bypassing quality gates
- Skip fuzz testing on any function that parses external input (APIs, files, network)

---

## Related Skills

| Skill | Purpose |
|---|---|
| `software-testing-strategy` | Design unit and integration test strategies — complements SQA by covering the test design layer below quality gates |
| `code-quality-policies` | Define and enforce team-wide code quality policies, naming conventions, and style guides |
| `dependency-supply-chain-security` | Deep dive into dependency supply chain security: SBOM generation, provenance verification, and vendor risk assessment |
| `observability-patterns` | Set up monitoring and alerting that feeds back into quality gate SLOs for production-level quality assurance |
| `production-readiness` | Final pre-deployment checklist that includes quality gate results as part of the go/no-go decision |
