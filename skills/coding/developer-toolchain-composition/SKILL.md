---




name: developer-toolchain-composition
description: Composes integrated developer toolchains by evaluating tool interoperability,
  dependency management, workflow automation, and friction reduction across the development
  lifecycle from code to production.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: developer toolchain, dev toolchain, how do i set up dev tools, tool interoperability, build system, ci cd pipeline, development workflow, tool integration build system
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
  - config
  - examples
  - do-dont
  related-skills: coding-software-delivery-pipelines, coding-framework-requirements-validation,
    coding-tool-evaluation-workflow, coding-observability-patterns




---




# Developer Toolchain Composition

Composes integrated developer toolchains by evaluating tool interoperability, managing dependencies between tools, automating workflows, and reducing friction across the development lifecycle from code editing through production deployment. This skill makes the model design coherent tool ecosystems where each tool serves a specific purpose without overlap, communicates via standard interfaces, and collectively accelerates developer productivity while maintaining quality gates.

## TL;DR Checklist

- [ ] Map every step in the developer workflow (edit → build → test → lint → commit → deploy) to specific tools
- [ ] Verify each tool integrates via standard interfaces (CLI, hooks, APIs) rather than proprietary connectors
- [ ] Eliminate duplicate functionality between tools — each tool must have a single, clear responsibility
- [ ] Configure pre-commit and CI hooks that catch the most common errors before they reach the team
- [ ] Document the complete toolchain with version requirements, setup instructions, and troubleshooting guide
- [ ] Measure developer onboarding time for new engineers — target under 2 hours to first commit

---

## When to Use

Use this skill when:

- Designing a new project's development toolchain from scratch
- Evaluating whether to adopt or replace a tool in an existing toolchain
- Reducing friction in the developer experience by automating repetitive tasks
- Resolving tool conflicts (e.g., formatter X vs. formatter Y, linter A vs. linter B)
- Setting up CI/CD pipelines that integrate seamlessly with local development tools
- Migrating a team from one toolchain to another with minimal disruption

---

## When NOT to Use

Avoid this skill for:

- Designing application architecture — use `coding-system-design-fundamentals` instead
- Setting up cloud infrastructure — use `coding-cloud-ecosystem-strategy` or `coding-cloud-native-architecture` instead
- Writing application business logic — focus on the tools that enable the work, not the work itself
- Security policy configuration — use `coding-security-review` for security-specific tooling

---

## Core Workflow

### Step 1: Map the Developer Workflow to Tool Requirements

Break down the developer workflow into discrete stages and identify the specific capability each stage requires. This prevents the common mistake of choosing tools without clearly defining what problem they solve.

```python
from dataclasses import dataclass, field
from enum import StrEnum


class WorkflowStage(StrEnum):
    EDIT = "edit"                  # IDE / editor configuration
    BUILD = "build"                # Compiling, bundling, transpiling
    TEST_UNIT = "test_unit"        # Unit test execution
    TEST_INTEGRATION = "test_integration"  # Integration test execution
    LINT = "lint"                  # Static analysis and style checking
    FORMAT = "format"              # Code formatting / beautification
    SECURITY_SCAN = "security_scan"           # SAST, dependency scanning
    DOCS_GENERATE = "docs_generate"          # Documentation generation
    TYPE_CHECK = "type_check"      # Static type analysis
    DEPLOY_LOCAL = "deploy_local"  # Local development server / container


@dataclass(frozen=True)
class ToolRequirement:
    """A single tool requirement for a specific workflow stage."""

    id: str
    stage: WorkflowStage
    description: str
    priority: int  # 1-5, 5 is critical
    must_support: list[str] = field(default_factory=list)  # File types, languages
    expected_runtime_ms: float | None = None  # Max acceptable execution time


@dataclass(frozen=True)
class ToolCandidate:
    """A tool evaluated against workflow requirements."""

    name: str
    stage: WorkflowStage
    description: str
    cli_command: str  # How to invoke the tool from terminal
    config_file: str | None  # Configuration file path (e.g., ".eslintrc", "pyproject.toml")
    integration_points: list[str] = field(default_factory=list)  # Hooks, IDE plugins, CI steps
    version: str = ""
    license_type: str = ""

    @property
    def is_interactive(self) -> bool:
        """Whether the tool can run in watch/interactive mode."""
        return any("watch" in p.lower() or "live" in p.lower() for p in self.integration_points)

    @property
    def has_ci_integration(self) -> bool:
        """Whether the tool provides native CI integration (exit codes, reports)."""
        return any(
            ci in "ci pipeline github actions gitlab jenkins azure devops bitbucket circle".lower()
            for ci in self.integration_points
        )
```

**Checkpoint:** Every workflow stage must have at least one ToolRequirement. Stages without requirements are dead steps that slow developers down and should be removed or merged.

### Step 2: Evaluate Tool Interoperability

Tools form a toolchain — their value multiplies when they communicate through standard interfaces. This step assesses how well tools work together by examining their integration surfaces.

**Interoperability scoring dimensions:**

| Dimension | Weight | Assessment Criteria |
|-----------|--------|-------------------|
| CLI interface quality | 25% | Consistent exit codes, parsable output, configurability without GUI |
| Hook ecosystem | 20% | Pre-commit, post-checkout, IDE integration points available |
| Configuration portability | 15% | Config can be shared via repo (no local-only settings) |
| Output format standardization | 15% | JSON or machine-parseable output for CI parsing |
| Dependency isolation | 10% | Tool doesn't require global installs that conflict with projects |
| Version lock-in risk | 15% | Breaking changes in minor versions are rare and well-documented |

```python
from collections import defaultdict


class InteroperabilityEvaluator:
    """Evaluates how well a set of tools integrate as a cohesive toolchain."""

    def __init__(self, candidates: list[ToolCandidate]):
        self.candidates = {c.name: c for c in candidates}
        self.stage_groups: dict[WorkflowStage, list[ToolCandidate]] = defaultdict(list)
        for candidate in candidates:
            self.stage_groups[candidate.stage].append(candidate)

    def evaluate_toolchain(self) -> dict:
        """Evaluate the entire toolchain for interoperability quality.

        Returns a comprehensive evaluation report with scores and recommendations.
        """
        results = {
            "total_tools": len(self.candidates),
            "stages_covered": list(self.stage_groups.keys()),
            "stage_tool_counts": {s: len(tools) for s, tools in self.stage_groups.items()},
            "conflicts": [],
            "recommendations": [],
            "overall_score": 0.0,
        }

        # Check for duplicate functionality within stages
        results["conflicts"] = self._detect_duplicate_functionality()

        # Score each tool's interoperability
        tool_scores = {}
        for name, candidate in self.candidates.items():
            tool_scores[name] = self._score_tool(candidate)
        results["tool_interoperability_scores"] = tool_scores

        # Calculate overall score
        if tool_scores:
            scores = list(tool_scores.values())
            results["overall_score"] = round(sum(scores) / len(scores), 1)

            if results["overall_score"] >= 80:
                results["verdict"] = "EXCELLENT — Tools integrate well with minimal friction"
            elif results["overall_score"] >= 60:
                results["verdict"] = "GOOD — Minor integration improvements recommended"
            elif results["overall_score"] >= 40:
                results["verdict"] = "FAIR — Several interoperability gaps need addressing"
            else:
                results["verdict"] = "POOR — Tools fight each other; redesign recommended"

        return results

    def _detect_duplicate_functionality(self) -> list[dict]:
        """Find stages where multiple tools provide overlapping capabilities."""
        conflicts = []
        for stage, tools in self.stage_groups.items():
            if len(tools) > 1:
                # Multiple tools for same stage — potential conflict
                tool_names = [t.name for t in tools]
                conflicts.append({
                    "stage": stage,
                    "duplicate_tools": tool_names,
                    "severity": "WARNING" if stage not in ("LINT", "FORMAT") else "CRITICAL",
                    "description": (
                        f"Multiple tools ({', '.join(tool_names)}) registered for {stage.value} stage. "
                        "This creates conflicting behavior and unpredictable results."
                    ),
                })
        return conflicts

    def _score_tool(self, candidate: ToolCandidate) -> float:
        """Score a single tool's interoperability (0-100)."""
        score = 0

        # CLI quality (25 pts): Has documented CLI with consistent flags
        if candidate.cli_command and not candidate.cli_command.startswith("python "):
            score += 10
        elif candidate.cli_command:
            score += 5
        else:
            score -= 5  # No CLI — tool is hard to automate

        # Hook ecosystem (20 pts)
        if len(candidate.integration_points) >= 3:
            score += 20
        elif len(candidate.integration_points) >= 1:
            score += 12
        else:
            score += 5

        # Configuration portability (15 pts)
        if candidate.config_file:
            score += 15
        else:
            score -= 3  # Config may not be shareable

        # Output standardization (15 pts)
        if any(fmt in ["json", "xml", "sarif", "junit"] for fmt in candidate.integration_points):
            score += 15
        elif candidate.has_ci_integration:
            score += 8
        else:
            score += 3

        # Version lock-in risk (15 pts) — based on release frequency and breaking change rate
        if candidate.version and not candidate.version.startswith("0."):
            score += 15  # Mature version (stable API)
        elif candidate.version and candidate.version.startswith("0."):
            score += 8  # Pre-1.0 — potential breaking changes
        else:
            score += 5  # Unknown version — assume moderate risk

        return max(0, min(100, score))


def recommend_toolchain_configuration(
    evaluator: InteroperabilityEvaluator,
) -> list[str]:
    """Generate specific toolchain configuration recommendations from evaluation results."""
    recommendations = []
    results = evaluator.evaluate_toolchain()

    # Add conflict-resolution recommendations
    for conflict in results["conflicts"]:
        if conflict["severity"] == "CRITICAL":
            recommendations.append(
                f"CRITICAL: Remove one of {', '.join(conflict['duplicate_tools'])} "
                f"for the {conflict['stage']} stage — they conflict with each other."
            )

    # Add interoperability recommendations based on low-scoring tools
    for name, score in results.get("tool_interoperability_scores", {}).items():
        if score < 50:
            recommendations.append(
                f"Tool '{name}' has low interoperability ({score}/100). "
                "Consider replacing with a tool that provides CLI interface and CI integration."
            )

    return recommendations
```

**Checkpoint:** No stage should have more than one formatting or linting tool — these are the most common sources of conflict in developer workflows. Each tool must have a unique, non-overlapping responsibility.

### Step 3: Design Configuration Management Strategy

Every tool needs configuration. A coherent configuration strategy ensures settings are reproducible, shareable, and version-controlled without exposing secrets.

```python
def generate_configuration_template(
    tools: list[dict],
    project_type: str = "generic",
) -> dict[str, str]:
    """Generate shared configuration files for a set of tools.

    Args:
        tools: List of dicts with 'name', 'config_file', and optional 'default_config' keys
        project_type: Project type that affects configuration defaults ("web", "api", "library")

    Returns:
        Dict mapping filename to file content string for each tool's config.
    """
    configs = {}

    # .gitignore — Standard patterns for most modern projects
    gitignore_patterns = [
        "# Dependencies",
        "node_modules/",
        ".venv/",
        "venv/",
        "__pycache__/",
        "*.pyc",
        "*.pyo",
        "",
        "# Build outputs",
        "dist/",
        "build/",
        ".next/",
        ".nuxt/",
        "",
        "# IDE and editor",
        ".idea/",
        ".vscode/settings.json",
        "*.sublime-*",
        "",
        "# Environment variables (secrets must NEVER be committed)",
        ".env.local",
        ".env.production",
        "*.keystore",
        "",
        "# OS files",
        ".DS_Store",
        "Thumbs.db",
    ]
    configs[".gitignore"] = "\n".join(gitignore_patterns) + "\n"

    # Pre-commit configuration — central hook manager for all linting/formatting tools
    precommit_config = [
        "# .pre-commit-config.yaml — Managed by toolchain composition skill",
        "repos:",
        "  - repo: https://github.com/pre-commit/pre-commit-hooks",
        "    rev: v5.0.0",
        "    hooks:",
        "      - id: trailing-whitespace",
        "      - id: end-of-file-fixer",
        "      - id: check-yaml",
        "      - id: check-added-large-files",
        "      - id: check-merge-conflict",
        "      - id: detect-private-key",
        "",
    ]

    # Add tool-specific hooks based on the tools list
    for tool in tools:
        name = tool.get("name", "").lower()
        if "eslint" in name or "lint" in name:
            precommit_config.append(
                f'  - repo: local  # {tool["name"]} hook'
            )
            precommit_config.append(
                f'    hooks:'
            )
            config_file = tool.get("config_file", "")
            precommit_config.append(
                f'      - id: {name}-lint'
            )
            precommit_config.append(
                f'        name: {tool["name"]} lint check'
            )
            precommit_config.append(
                f'        entry: {tool.get("cli_command", name)} --config {config_file}'
            )
            precommit_config.append(
                f'        language: system'
            )
            precommit_config.append(
                f'        types: [file, python, javascript, typescript]'
            )

    configs[".pre-commit-config.yaml"] = "\n".join(precommit_config) + "\n"

    # Justfile or Makefile — Central task runner for common operations
    justfile_template = [
        "# Justfile — Developer task automation (https://github.com/casey/just)",
        "# Usage: just <task>",
        "",
        "SET default-env := 'development'",
        "",
        '### Development',
        f"dev:\n    @echo \"Starting development server in {{default-env}} mode\"",
        "    # Run local development server or container",
        "",
        '### Build',
        "build:\n    @echo \"Building project...\"",
        "    # Compile, bundle, and transpile source code",
        "",
        '### Test',
        "test:\n    @echo \"Running all tests...\"",
        "    # Execute unit + integration test suites",
        "",
        "test-unit:\n    @echo \"Running unit tests only...\"",
    ]

    configs["justfile"] = "\n".join(justfile_template) + "\n"

    return configs


def generate_pre_commit_hooks(
    linting_tools: list[ToolCandidate],
    formatting_tools: list[ToolCandidate],
    security_tools: list[ToolCandidate],
) -> str:
    """Generate a complete .pre-commit-config.yaml from tool candidates.

    This creates the central hook configuration that runs before every commit,
    catching issues early and preventing them from reaching the repository.
    """
    lines = [
        "# .pre-commit-config.yaml",
        "# Auto-generated by developer-toolchain-composition skill",
        "",
        "default_stages: [commit]",
        "fail_fast: true",  # Stop at first failure to provide immediate feedback
        "minimum_pre_commit_version: '3.0.0'",
        "",
    ]

    # Standard hooks (file-level fixes)
    lines.extend([
        "# Standard pre-commit hooks — file integrity and formatting basics",
        "- repo: https://github.com/pre-commit/pre-commit-hooks",
        "  rev: v5.0.0",
        "  hooks:",
        "    - id: trailing-whitespace",
        "      stages: [commit, push]",
        "    - id: end-of-file-fixer",
        "      exclude: \\.png$|\\.jpg$|\\.gif$|\\.ico$|\\.pdf$",
        "    - id: check-yaml",
        "      args: ['--allow-multiple-documents']",
        "    - id: check-json",
        "    - id: check-merge-conflict",
        "    - id: detect-private-key",
        "    - id: no-commit-to-branch",
        "      args: ['--branch', 'main', '--branch', 'master']",
    ])

    # Linting hooks
    if linting_tools:
        lines.extend([
            "",
            "# Linting hooks — static analysis before code enters the repository",
        ])
        for tool in linting_tools:
            config = tool.config_file or ""
            entry_cmd = f"{tool.cli_command} {config}".strip() if config else tool.cli_command
            lines.extend([
                f"- repo: local  # {tool.name}",
                "  hooks:",
                f"    - id: {tool.name}-lint",
                f"      name: {tool.name} static analysis",
                f"      entry: {entry_cmd}",
                f"      language: system",
            ])
            lines.append(f"      files: \\.(py|js|ts|tsx|go|rs|java)$")

    # Formatting hooks (must run AFTER linting to avoid conflicts)
    if formatting_tools:
        lines.extend([
            "",
            "# Formatting hooks — code style enforcement",
        ])
        for tool in formatting_tools:
            config = tool.config_file or ""
            entry_cmd = f"{tool.cli_command} --check {config}".strip() if config else f"{tool.cli_command} --check"
            lines.extend([
                f"- repo: local  # {tool.name}",
                "  hooks:",
                f"    - id: {tool.name}-format",
                f"      name: {tool.name} style check (use --fix to auto-format)",
                f"      entry: {entry_cmd}",
                f"      language: system",
                f"      args: [--diff]",
            ])

    # Security scanning hooks
    if security_tools:
        lines.extend([
            "",
            "# Security scanning hooks — catch vulnerabilities before merge",
        ])
        for tool in security_tools:
            lines.extend([
                f"- repo: local  # {tool.name}",
                "  hooks:",
                f"    - id: {tool.name}-scan",
                f"      name: {tool.name} security check",
                f"      entry: {tool.cli_command}",
                f"      language: system",
                "      verbose: true",
            ])

    return "\n".join(lines) + "\n"
```

**Checkpoint:** Configuration files must be version-controlled and shareable. Any tool that requires GUI-based setup or local-only configuration creates a friction point — flag these for replacement with CLI-configurable alternatives.

### Step 4: Design CI/CD Pipeline Integration

Local developer tools should mirror CI/CD pipeline configurations to ensure "it works on my machine" means "it works in production." This step maps local tool invocations to CI pipeline steps.

```python
def generate_ci_pipeline_config(
    provider: str,  # "github", "gitlab", "azure", "circleci"
    tools: list[ToolCandidate],
    stages: list[str] | None = None,
) -> str:
    """Generate a CI pipeline configuration file for the specified provider.

    Mirrors local developer tool configurations in CI to ensure consistency.

    Args:
        provider: CI/CD platform ("github", "gitlab", "azure", "circleci")
        tools: Developer tools to include in the pipeline
        stages: Optional override of default pipeline stages

    Returns:
        Pipeline configuration file content as a string.
    """
    if stages is None:
        stages = ["build", "test", "lint", "security-scan", "deploy-staging"]

    if provider == "github":
        lines = [
            "# GitHub Actions pipeline — generated by developer-toolchain-composition skill",
            'name: CI/CD Pipeline',
            "",
            "on:",
            "  push:",
            "    branches: [main, master, develop]",
            "  pull_request:",
            "    branches: [main, master]",
            "",
            "jobs:",
        ]

        for stage in stages:
            lines.extend([
                f"  {stage}:",
                f"    runs-on: ubuntu-latest",
                "    steps:",
                '      - name: Checkout repository',
                '        uses: actions/checkout@v4',
            ])

            # Map tools to CI steps for this stage
            stage_tools = [t for t in tools if t.stage.value == stage or
                          (stage == "test" and "test" in t.stage.value)]
            if stage_tools:
                for tool in stage_tools:
                    lines.extend([
                        f'      - name: Run {tool.name}',
                        f'        run: {tool.cli_command}' +
                        (f" --config {tool.config_file}" if tool.config_file else ""),
                    ])

            lines.append("")

        return "\n".join(lines) + "\n"

    elif provider == "gitlab":
        lines = [
            "# GitLab CI — generated by developer-toolchain-composition skill",
            'stages:',
        ]
        for stage in stages:
            lines.append(f"  - {stage}")

        lines.extend(["", "# Jobs"])
        for tool in tools:
            lines.extend([
                f"{tool.name.replace(' ', '_').lower()}:_",
                f"  stage: {tool.stage.value if tool.stage.value in stages else 'build'}",
                f'  script:',
                f"    - {tool.cli_command}",
            ])
            if tool.config_file:
                lines.append(f"      - echo \"Config file: {tool.config_file}\"")

        return "\n".join(lines) + "\n"

    else:
        return f"# TODO: Generate pipeline config for {provider}"


def verify_ci_local_consistency(
    local_config: str,  # Content of pre-commit config or justfile
    ci_config: str,     # Content of CI pipeline config
) -> dict:
    """Verify that CI pipeline steps match local developer tool configurations.

    Inconsistencies between local and CI toolchains cause the classic
    "works on my machine" problem. This function detects such mismatches.
    """
    inconsistencies = []

    # Extract tool references from each configuration
    local_tools = set()
    ci_tools = set()

    for line in local_config.splitlines():
        if line.strip().startswith("- repo:") or "id:" in line or ": lint" in line:
            local_tools.add(line.strip())
    for line in ci_config.splitlines():
        if "run:" in line and any(tool in line.lower() for tool in ["lint", "test", "build"]):
            ci_tools.add(line.strip())

    # Check for tools present in local but missing from CI (or vice versa)
    local_only = local_tools - ci_tools
    ci_only = ci_tools - local_tools

    if local_only:
        inconsistencies.append({
            "type": "LOCAL_ONLY",
            "tools": list(local_only),
            "risk": "These checks run locally but NOT in CI — bad code can reach the repository",
        })
    if ci_only:
        inconsistencies.append({
            "type": "CI_ONLY",
            "tools": list(ci_only),
            "risk": "These checks run in CI but NOT locally — developers get delayed feedback",
        })

    return {
        "consistent": len(inconsistencies) == 0,
        "total_inconsistencies": len(inconsistencies),
        "inconsistencies": inconsistencies,
        "recommendation": (
            "Local and CI toolchains should be identical. "
            "Use the same tools with the same versions in both environments."
        ),
    }
```

**Checkpoint:** Every local development command must have a corresponding CI/CD pipeline step with the same tool version and configuration. The `.github/actions/` or equivalent directory should mirror the pre-commit hook definitions.

### Step 5: Measure Toolchain Friction

Quantify the developer experience by measuring onboarding time, task execution speed, and error rates across the toolchain.

```python
from dataclasses import dataclass
from datetime import datetime


@dataclass(frozen=True)
class ToolchainMetric:
    """A single measurement of toolchain performance."""

    metric_name: str
    value: float  # Numeric value (units vary by metric)
    unit: str  # "minutes", "seconds", "count", "percentage"
    target: float | None = None  # Target value for comparison
    timestamp: datetime = datetime.utcnow()


@dataclass(frozen=True)
class ToolchainHealthReport:
    """Aggregated health report for the entire developer toolchain."""

    onboarding_hours: float | None  # Hours to first commit for new developer
    build_time_minutes: float | None  # Clean build time
    test_suite_time_minutes: float | None  # Full test suite execution time
    lint_time_seconds: float | None  # Linter execution time
    pre_commit_fail_rate_pct: float = 0.0  # % of commits blocked by hooks
    ci_queue_wait_minutes: float | None  # Average wait time in CI queue
    total_tools: int  # Number of tools in the toolchain

    @property
    def friction_score(self) -> float:
        """Overall toolchain friction score (lower is better, target < 50)."""
        score = 0

        # Onboarding time (target: < 2 hours = 120 minutes → 0 points)
        if self.onboarding_hours and self.onboarding_hours > 2:
            score += min(40, int((self.onboarding_hours - 2) * 10))

        # Build + test time (target: < 10 minutes total → 0 points)
        total_exec_time = 0
        if self.build_time_minutes:
            total_exec_time += self.build_time_minutes
        if self.test_suite_time_minutes:
            total_exec_time += self.test_suite_time_minutes
        if total_exec_time > 10:
            score += min(30, int((total_exec_time - 10) * 2))

        # Pre-commit fail rate (target: < 5% → 0 points)
        if self.pre_commit_fail_rate_pct > 5:
            score += int(self.pre_commit_fail_rate_pct - 5)

        # Tool count complexity (target: < 15 tools → 0 points)
        if self.total_tools > 15:
            score += min(20, (self.total_tools - 15) * 2)

        return score

    @property
    def health_status(self) -> str:
        score = self.friction_score
        if score <= 20:
            return "EXCELLENT — Minimal friction, developers are productive"
        if score <= 50:
            return "GOOD — Minor areas for improvement"
        if score <= 80:
            return "NEEDS_WORK — Significant friction detected"
        return "CRITICAL — Toolchain is blocking developer productivity"


def measure_toolchain_metrics(
    tool_names: list[str],
    onboarding_data: dict | None = None,
) -> ToolchainHealthReport:
    """Generate a toolchain health report from collected metrics.

    In production, these values would come from actual measurement:
    - Onboarding time: Track first commit timestamps for new team members
    - Build/test times: Extract from CI/CD pipeline execution data
    - Pre-commit fail rate: Count rejected commits / total commit attempts
    """
    return ToolchainHealthReport(
        onboarding_hours=onboarding_data.get("hours_to_first_commit") if onboarding_data else None,
        build_time_minutes=onboarding_data.get("build_time_minutes") if onboarding_data else None,
        test_suite_time_minutes=onboarding_data.get("test_suite_time_minutes") if onboarding_data else None,
        lint_time_seconds=None,
        pre_commit_fail_rate_pct=onboarding_data.get("pre_commit_rejection_rate", 0) if onboarding_data else 0.0,
        ci_queue_wait_minutes=None,
        total_tools=len(tool_names),
    )
```

**Checkpoint:** The toolchain friction score should be reported quarterly to engineering leadership. A rising friction score is an early warning signal that the toolchain is accumulating technical debt in its own infrastructure.

---

## Implementation Patterns

### Pattern 1: Tool Evaluation Scorecard

A structured scoring system for evaluating and comparing tools before adoption.

```python
from dataclasses import dataclass, field


@dataclass(frozen=True)
class ToolEvaluationScorecard:
    """Structured scorecard for evaluating a tool against project requirements."""

    tool_name: str
    category: str  # "linting", "formatting", "testing", "build", etc.

    # Scores (each 0-10)
    developer_experience: int = 0
    ci_integration_quality: int = 0
    configuration_portability: int = 0
    performance_speed: int = 0
    community_support: int = 0
    license_suitability: int = 0
    maintenance_activity: int = 0

    @property
    def weighted_score(self) -> float:
        """Calculate weighted evaluation score (0-100)."""
        weights = {
            "developer_experience": 0.20,
            "ci_integration_quality": 0.20,
            "configuration_portability": 0.15,
            "performance_speed": 0.15,
            "community_support": 0.10,
            "license_suitability": 0.10,
            "maintenance_activity": 0.10,
        }

        total = sum(
            getattr(self, attr) * weight
            for attr, weight in weights.items()
        )
        return round(total * 10, 1)  # Convert from 0-10 to 0-100

    @property
    def recommendation(self) -> str:
        score = self.weighted_score
        if score >= 75:
            return "RECOMMENDED — Strong tool with good ecosystem fit"
        if score >= 50:
            return "CONSIDER — Viable option but has notable tradeoffs"
        return "NOT_RECOMMENDED — Evaluate alternatives before adopting"


def compare_tools(
    candidates: list[dict],
) -> list[ToolEvaluationScorecard]:
    """Compare multiple tool candidates and return ranked scorecards.

    Args:
        candidates: List of dicts with 'name', 'category', and scoring fields

    Returns:
        ToolEvaluationScorecard objects sorted by weighted_score (descending).
    """
    scorecards = []
    for c in candidates:
        scorecards.append(ToolEvaluationScorecard(
            tool_name=c["name"],
            category=c.get("category", "general"),
            developer_experience=c.get("developer_experience", 5),
            ci_integration_quality=c.get("ci_integration_quality", 5),
            configuration_portability=c.get("configuration_portability", 5),
            performance_speed=c.get("performance_speed", 5),
            community_support=c.get("community_support", 5),
            license_suitability=c.get("license_suitability", 7),
            maintenance_activity=c.get("maintenance_activity", 6),
        ))

    scorecards.sort(key=lambda s: s.weighted_score, reverse=True)
    return scorecards
```

### Pattern 2: Toolchain Documentation Generator

Automated documentation of the complete toolchain for onboarding and reference.

```python
def generate_toolchain_documentation(
    tools: list[ToolCandidate],
    metrics: ToolchainHealthReport,
) -> str:
    """Generate comprehensive developer toolchain documentation."""
    lines = [
        "# Developer Toolchain Documentation",
        "",
        f"**Last updated:** {datetime.utcnow().strftime('%Y-%m-%d')}",
        f"**Total tools:** {metrics.total_tools}",
        f"**Friction score:** {metrics.friction_score}/100 ({metrics.health_status})",
        "",
        "---",
        "",
    ]

    # Group tools by workflow stage
    stages: dict[WorkflowStage, list[ToolCandidate]] = {}
    for tool in tools:
        if tool.stage not in stages:
            stages[tool.stage] = []
        stages[tool.stage].append(tool)

    lines.append("## Workflow Stages\n")

    for stage in WorkflowStage:
        stage_tools = stages.get(stage, [])
        lines.append(f"### {stage.value.replace('_', ' ').title()}")
        if not stage_tools:
            lines.append("*No tools configured for this stage.*\n")
            continue

        for tool in stage_tools:
            lines.append(f"- **{tool.name}** — `{tool.cli_command}`")
            if tool.config_file:
                lines.append(f"  - Config: `{tool.config_file}`")
            lines.append("")

    # Friction metrics summary
    lines.extend([
        "---",
        "## Toolchain Health Metrics\n",
    ])
    if metrics.onboarding_hours:
        lines.append(f"- **Onboarding time:** {metrics.onboarding_hours:.1f} hours (target: < 2)")
    if metrics.build_time_minutes:
        lines.append(f"- **Build time:** {metrics.build_time_minutes:.1f} minutes")
    if metrics.test_suite_time_minutes:
        lines.append(f"- **Test suite:** {metrics.test_suite_time_minutes:.1f} minutes")
    lines.append(f"- **Pre-commit fail rate:** {metrics.pre_commit_fail_rate_pct}%")

    return "\n".join(lines) + "\n"
```

---

## Constraints

### MUST DO
- Every tool in the toolchain must have a single, clearly defined responsibility — if two tools overlap, remove one or merge their functions
- Local development tools must match CI/CD pipeline tools and versions exactly to ensure "works locally == works in CI"
- All tool configurations must be version-controlled in the repository root (or subdirectory) — no GUI-only configuration for any tool that other developers use
- Pre-commit hooks should catch the most common errors (formatting, trailing whitespace, secrets) within seconds of execution
- Document the complete toolchain with setup instructions, version requirements, and troubleshooting guide — target 2-hour onboarding for new engineers
- Include a `justfile` or `Makefile` with at least: `dev`, `build`, `test`, and `lint` targets as single-command shortcuts

### MUST NOT DO
- Do not configure more than one linting tool and more than one formatting tool — conflicts between them create unpredictable results and developer frustration
- Do not install tools globally that should be project-scoped (use npx, pipx, or local virtual environments instead of `npm install -g` or `pip install --global`)
- Do not skip pre-commit hooks in favor of CI-only checks — developers deserve immediate feedback before pushing code
- Do not use proprietary tools that require paid licenses without a self-hosted alternative — open-source tools reduce long-term costs and dependency risk
- Do not add tools to the toolchain without measuring their impact on build time and developer productivity — every tool has a maintenance cost

---

## Output Template

When applying this skill, produce:

1. **Workflow-to-Tool Mapping** — Table mapping each development stage (edit, build, test, lint, etc.) to specific tools with CLI commands and configuration files
2. **Interoperability Assessment** — Scorecard evaluating how well tools integrate (CLI quality, hook ecosystem, config portability) with conflict detection for duplicate functionality
3. **Configuration File Templates** — Generated `.gitignore`, `.pre-commit-config.yaml`, `justfile`/`Makefile`, and IDE configuration files ready to use
4. **CI/CD Pipeline Configuration** — Provider-specific pipeline YAML (GitHub Actions, GitLab CI, etc.) with steps that mirror local tool invocations
5. **Consistency Verification Report** — Analysis confirming local and CI toolchains match, with flagged inconsistencies
6. **Toolchain Documentation** — Complete onboarding documentation including setup steps, tool versions, workflow stages, and health metrics

---

## Related Skills

| Skill | Purpose |
|---|---|
| `coding-software-delivery-pipelines` | Implements CI/CD pipeline infrastructure — this skill ensures the tools used in those pipelines are well-integrated |
| `coding-framework-requirements-validation` | Validates framework-specific conventions — complements this toolchain skill by checking that tool configurations match framework requirements |
| `coding-tool-evaluation-workflow` | Evaluates individual developer tools — this skill focuses on composing multiple tools into a coherent system |
| `coding-observability-patterns` | Sets up monitoring and alerting for production systems — complements this skill's focus on development-time observability |

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references.

- [Pre-commit Documentation](https://pre-commit.com/)
- [Just Task Runner (GitHub)](https://github.com/casey/just)
- [GitHub Actions Marketplace](https://github.com/marketplace?type=actions)
- [GitLab CI/CD Configuration Reference](https://docs.gitlab.com/ee/ci/yaml/)
- [Developer Experience (DORA) Metrics Guide](https://cloud.google.com/blog/products/application-development/dora-metrics-four-keys)
- [Backstage.io Developer Portal](https://backstage.io/)
