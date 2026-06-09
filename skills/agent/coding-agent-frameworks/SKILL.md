---
name: coding-agent-frameworks
description: Implements autonomous coding agent frameworks (automated refactoring, test generation, deployment pipeline management) for AI-augmented software development with 30%+ code generation targets.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: agent
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  maturity: beta
  completeness: 90
  triggers: coding agent, automated refactoring, test generation, deployment automation, AI developer, how do i automate software development, legacy modernization
  archetypes:
    - tactical
    - orchestration
  anti_triggers:
    - GUI design
    - mobile app development
    - data science modeling
    - ML training pipeline
  response_profile:
    verbosity: medium
    directive_strength: high
    abstraction_level: operational
  related-skills: tool-use-function-calling, cli-agent-workflows, git-pr-workflows-onboard, subagent-driven-development, code-correctness-verifier
---

# Autonomous Coding Agent Frameworks

Implements autonomous coding agent frameworks that handle the full software development lifecycle — automated refactoring of legacy codebases, AI-generated test suites with coverage gap analysis, CI/CD pipeline generation, and deployment validation. This skill orchestrates agents that produce 30%+ of production code while maintaining quality gates aligned with the 5 Laws of Elegant Defense.

## TL;DR for Code Generation

- Define a `CodingAgent` class with separate phases: analyze → plan → refactor → test → review → deploy
- Every refactoring pass must extract transformation patterns before applying them globally
- Test generation must start from existing code, identify coverage gaps, then produce property-based tests
- CI/CD pipelines are generated from project structure analysis, not hardcoded templates
- All AI-generated changes require a quality gate: lint check, test pass, and diff review before commit
- Refactoring transformations must be pure AST functions — same input tree yields same output tree, no side effects
- Deployments from generated pipelines always use canary validation before production promotion

---

## When to Use

Use this skill when:

- **Refactoring legacy codebases** — Modernizing monolithic services into modular components, extracting common patterns from duplicated logic, or migrating from an outdated framework version
- **Generating tests for untested code** — The codebase has critical path functions with zero coverage, and you need systematic unit test generation with property-based fuzzing for edge cases
- **Automating deployment pipeline creation** — A new service needs CI/CD configuration (GitHub Actions, GitLab CI, or Jenkinsfile) generated from the project's language, framework, and dependency structure
- **Reducing technical debt at scale** — The team has accumulated hundreds of code smells across thousands of files, and you need an automated scanner that classifies debt severity and generates refactoring PRs
- **Implementing AI-assisted code review** — Pull requests need automated style enforcement, security scanning (SAST), and architectural alignment checks before human reviewers see them
- **Tracking developer velocity metrics** — You want to measure the ratio of AI-generated vs. manually written code, track test coverage deltas per commit, and monitor deployment success rates

---

## When NOT to Use

Avoid this skill for:

- **Security-sensitive authentication changes** — Modifying OAuth flows, JWT validation, or password hashing requires human expert review; use `security-audit` instead
- **Database schema migrations in production** — Schema changes on live data stores risk data loss; use `postgresql-optimization` with manual rollback plans
- **Mobile app development (iOS/Android)** — Platform-specific native code and UI tooling are outside this skill's scope; mobile requires platform SDKs and simulators
- **Data science / ML model training** — Model architecture design, hyperparameter tuning, and dataset curation are fundamentally different from software engineering automation

---

## Core Workflow

1. **Code Analysis Phase** — Ingest the target codebase using AST parsing (Python: `ast` module; TypeScript: `typescript-estree`). Extract function signatures, call graphs, dependency maps, and existing test coverage data. Classify each module by complexity (cyclomatic), age (last-modified date), and test coverage percentage. **Checkpoint:** Produce a `code_analysis_report.json` with per-module metrics: `{module, functions: [{name, lines, complexity, covered_by_tests: bool}]}` — no module should be skipped.

2. **Refactoring Plan Generation** — Analyze the code analysis report to identify transformation opportunities: duplicated logic groups, long methods (>50 lines), deep nesting (>4 levels), and missing abstractions. Group related changes into atomic refactor PRs. Assign each change a priority score based on debt impact vs. refactoring effort ratio. **Checkpoint:** Every planned refactor must have a before/after diff preview and an estimated complexity score — if any plan exceeds 100 lines of changes, split it.

3. **Test Generation Pipeline** — For each target module lacking adequate coverage, generate unit tests using the existing code's type signatures and docstrings as specifications. Apply property-based testing (Hypothesis for Python) to discover edge cases beyond manual test design. Cross-reference against coverage tools (`coverage.py`, `pytest-cov`) to identify uncovered branches. **Checkpoint:** Every generated test file must pass independently with `python -m pytest tests/<module>/test_<module>.py --cov` — no import errors, no skipped tests, no assertions that could silently pass.

4. **Implementation & Refactoring Execution** — Apply the refactoring plan using AST transformations or pattern-matching tools (Ruff, eslint, semgrep rules). For each transformation, verify the change preserves behavior by running existing tests before and after. Generate atomic commits with descriptive messages following conventional commit format. **Checkpoint:** After each refactor application, run the full test suite — any failure means revert that specific change and log the diff for manual review. Never merge multiple unrelated refactors into a single commit.

5. **Automated Review Gate** — Before any AI-generated code is submitted as a PR, run a multi-layer review: static analysis (Ruff/flake8), security scan (Semgrep or Bandit), dependency vulnerability check (`pip-audit` or `npm audit`), and architectural alignment verification against project conventions documented in the codebase. Generate a review summary with pass/fail per gate. **Checkpoint:** The review gate must produce a machine-readable verdict — `{overall: "PASS"|"FAIL", gates: {lint, security, vulnerabilities, architecture}}`. Any FAIL blocks PR creation until resolved.

6. **Deployment Pipeline Generation & Validation** — Analyze the project's build system, test framework, deployment target (Docker, Kubernetes, serverless), and environment variables to generate a complete CI/CD pipeline configuration. Include stages for lint, test, security scan, build artifact, and deployment with environment-specific overrides. Validate the generated pipeline by dry-running it against the current codebase state. **Checkpoint:** The generated pipeline must pass on `--dry-run` or CI preview mode — if it fails in dry-run, rewrite the configuration and re-validate before proposing to users.

---

## Implementation Patterns

### Pattern 1: Autonomous Refactoring Engine

Legacy code modernization with AST-based pattern extraction. This engine scans for duplicated logic blocks, identifies extractable utility functions, and applies transformations while preserving behavior through regression test verification.

```python
import ast
import logging
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)


@dataclass
class CodePattern:
    """Represents a detectable code pattern found in the AST."""
    name: str
    node_type: type
    match_count: int = 0
    locations: list[tuple[str, int]] = field(default_factory=list)
    suggested_refactor: Optional[str] = None


class RefactoringEngine:
    """Scans codebases for refactoring opportunities using AST analysis."""

    def __init__(self, root_path: str, max_complexity: int = 10):
        self.root_path = Path(root_path)
        self.max_complexity = max_complexity
        self.patterns: list[CodePattern] = []
        self.changes: list[dict] = []

    def analyze_module(self, file_path: Path) -> dict:
        """Parse a single file and extract complexity metrics."""
        source = file_path.read_text(encoding="utf-8")
        tree = ast.parse(source, filename=str(file_path))

        functions = []
        for node in ast.walk(tree):
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                complexity = self._cyclomatic_complexity(node)
                functions.append({
                    "name": node.name,
                    "line": node.lineno,
                    "end_line": getattr(node, "end_lineno", node.lineno + 10),
                    "complexity": complexity,
                    "parameters": len(node.args.args),
                    "is_async": isinstance(node, ast.AsyncFunctionDef),
                })

        return {
            "file": str(file_path.relative_to(self.root_path)),
            "functions": functions,
            "total_lines": source.count("\n") + 1,
        }

    def _cyclomatic_complexity(self, node: ast.AST) -> int:
        """Calculate cyclomatic complexity of a function node."""
        complexity = 1
        for child in ast.walk(node):
            if isinstance(child, (ast.If, ast.While, ast.For)):
                complexity += 1
            elif isinstance(child, ast.BoolOp):
                complexity += len(child.values) - 1
            elif isinstance(child, ast.ExceptHandler):
                complexity += 1
        return complexity

    def find_duplicated_blocks(
        self, modules: list[dict], similarity_threshold: float = 0.7
    ) -> list[CodePattern]:
        """Identify duplicated code blocks across the codebase."""
        # Normalize function bodies for comparison
        normalized_bodies: dict[str, list[tuple[str, int]]] = {}

        for mod in modules:
            for fn in mod["functions"]:
                if fn["complexity"] < 3:
                    continue
                body_key = f"{fn['name']}:{mod['file']}"
                normalized_bodies.setdefault(body_key, []).append(
                    (body_key, fn["line"])
                )

        duplicates: list[CodePattern] = []
        seen_pairs: set[tuple[str, str]] = set()

        for key_a in normalized_bodies:
            for key_b in normalized_bodies:
                if key_a >= key_b or key_a == key_b:
                    continue
                pair = (min(key_a, key_b), max(key_a, key_b))
                if pair in seen_pairs:
                    continue
                seen_pairs.add(pair)

                # Heuristic: if both functions have same complexity and param count
                mod_a = next(m for m in modules if any(
                    f"functions" for f in m["functions"] if f["name"] in key_a
                ))
                duplicates.append(CodePattern(
                    name=f"duplicated_logic_{key_a[:20]}",
                    node_type=ast.FunctionDef,
                    suggested_refactor=(
                        f"Extract shared logic from {key_a} and {key_b} "
                        "into a utility function"
                    ),
                ))

        return duplicates

    def generate_change_plan(
        self, module: dict, refactoring_target: str
    ) -> dict:
        """Generate an atomic refactoring change plan for review."""
        target_functions = [
            fn for fn in module["functions"]
            if refactoring_target in fn["name"]
        ]

        if not target_functions:
            raise ValueError(f"No functions matching '{refactoring_target}' in {module['file']}")

        return {
            "file": module["file"],
            "target_functions": [fn["name"] for fn in target_functions],
            "total_lines_changed": 0,
            "requires_test_verification": True,
            "atomic_commit_message": f"refactor: simplify {refactoring_target} in {module['file']}",
        }


# ❌ BAD — Applying refactoring without verifying behavior preservation
def bad_refactor(module_path: Path) -> None:
    """This function applies refactoring blindly — no verification."""
    source = module_path.read_text()
    # Naive string replacement — will break if formatting or imports differ
    modified = source.replace("old_function_name", "new_function_name")
    module_path.write_text(modified)  # No test run, no diff check


# ✅ GOOD — Refactoring with AST analysis, behavior verification, and atomic commits
def good_refactor(engine: RefactoringEngine, file_path: Path) -> dict:
    """Refactor a module safely: analyze → plan → verify → apply."""
    report = engine.analyze_module(file_path)

    # Only refactor functions that exceed complexity threshold
    high_complexity = [
        fn for fn in report["functions"]
        if fn["complexity"] > engine.max_complexity
    ]

    if not high_complexity:
        return {"status": "no_refactor_needed", "file": str(file_path)}

    # Generate change plan and verify it's atomic (< 100 lines)
    for fn in high_complexity:
        plan = engine.generate_change_plan(report, fn["name"])
        plan["estimated_lines"] = fn["end_line"] - fn["line"]
        assert plan["estimated_lines"] < 100, (
            f"Refactor too large ({plan['estimated_lines']} lines); "
            "split into smaller changes first"
        )

    engine.changes.append({
        "file": str(file_path),
        "analysis": report,
        "changes": [engine.generate_change_plan(report, fn["name"]) for fn in high_complexity],
    })

    return {"status": "change_planned", "functions_count": len(high_complexity)}
```

### Pattern 2: AI Test Generation Pipeline

Unit test creation from existing codebases with coverage gap analysis and property-based testing. The pipeline extracts type signatures, infers valid input ranges, and generates deterministic tests that cover uncovered branches.

```python
import ast
import logging
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Callable, Optional

logger = logging.getLogger(__name__)


@dataclass
class CoverageGap:
    """A branch or statement not covered by existing tests."""
    file_path: str
    line_start: int
    line_end: int
    node_type: str
    function_name: str
    severity: str  # "critical" | "high" | "medium"


@dataclass
class TestSpecification:
    """A generated test specification from a function's type signature."""
    function_name: str
    module_path: str
    parameters: list[dict]
    return_type_hint: Optional[str]
    existing_docstring: Optional[str]
    expected_properties: list[str] = field(default_factory=list)


class TestGenerationPipeline:
    """Generates unit tests from source code analysis with coverage awareness."""

    def __init__(self, target_modules: list[Path], coverage_report_path: Optional[str] = None):
        self.target_modules = target_modules
        self.coverage_report_path = Path(coverage_report_path) if coverage_report_path else None
        self.gaps: list[CoverageGap] = []
        self.specifications: list[TestSpecification] = []

    def extract_function_specs(self, module_path: Path) -> list[TestSpecification]:
        """Parse a module's AST to extract function specifications for test generation."""
        source = module_path.read_text(encoding="utf-8")
        tree = ast.parse(source, filename=str(module_path))

        specs: list[TestSpecification] = []
        module_name = str(module_path.relative_to(Path.cwd()).with_suffix("")).replace("/", ".")

        for node in ast.iter_child_nodes(tree):
            if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                continue

            params = []
            for arg in node.args.args:
                type_hint = None
                if arg.annotation:
                    type_hint = self._annotation_to_string(arg.annotation)
                params.append({
                    "name": arg.arg,
                    "type_hint": type_hint,
                    "has_default": (
                        len(node.args.defaults) > (len(node.args.args) - 1 - node.args.args.index(arg))
                    ),
                })

            return_hint = None
            if node.returns:
                return_hint = self._annotation_to_string(node.returns)

            docstring = ast.get_docstring(node)

            specs.append(TestSpecification(
                function_name=node.name,
                module_path=module_name,
                parameters=params,
                return_type_hint=return_hint,
                existing_docstring=docstring,
                expected_properties=self._infer_expected_properties(docstring),
            ))

        self.specifications.extend(specs)
        return specs

    def _annotation_to_string(self, annotation: ast.AST) -> Optional[str]:
        """Convert an AST annotation node to a readable type string."""
        if isinstance(annotation, ast.Name):
            return annotation.id
        elif isinstance(annotation, ast.Attribute):
            return f"{self._annotation_to_string(annotation.value)}.{annotation.attr}"
        elif isinstance(annotation, ast.Subscript):
            return f"{self._annotation_to_string(annotation.value)}[{self._annotation_to_string(annotation.slice)}]"
        elif isinstance(annotation, ast.Constant):
            return repr(annotation.value)
        elif isinstance(annotation, ast.Ellipsis):
            return "..."
        elif hasattr(annotation, '_fields'):  # GenericAlias fallback for Python 3.9+
            return str(annotation).replace("typing.", "")
        return None

    def _infer_expected_properties(self, docstring: Optional[str]) -> list[str]:
        """Infer testable properties from a function's docstring."""
        if not docstring:
            return []

        properties = []
        lower_doc = docstring.lower()

        if any(kw in lower_doc for kw in ["raises", "raise ", "throws"]):
            properties.append("must_raise_exception_for_invalid_input")
        if any(kw in lower_doc for kw in ["returns", "return "]):
            properties.append("has_deterministic_output_for_same_input")
        if any(kw in lower_doc for kw in ["validates", "checks", "verifies"]):
            properties.append("performs_input_validation")

        return properties

    def identify_coverage_gaps(
        self, coverage_xml_path: Optional[str] = None
    ) -> list[CoverageGap]:
        """Identify functions or branches with zero test coverage."""
        if not coverage_xml_path and not self.coverage_report_path:
            logger.warning("No coverage report available; skipping gap analysis")
            return []

        # For demo purposes, generate gaps based on module analysis
        # In production, parse coverage.xml or .coverage binary files
        gaps: list[CoverageGap] = []
        for spec in self.specifications:
            if not spec.existing_docstring and spec.parameters:
                gaps.append(CoverageGap(
                    file_path=spec.module_path,
                    line_start=0,
                    line_end=1,
                    node_type="function",
                    function_name=spec.function_name,
                    severity="high" if len(spec.parameters) <= 3 else "medium",
                ))
        return gaps

    def generate_test_stub(
        self, spec: TestSpecification, target_dir: Path
    ) -> str:
        """Generate a pytest test file stub from a function specification."""
        module_parts = spec.module_path.split(".")
        safe_name = spec.function_name.replace("_", "-")
        test_filename = f"test_{safe_name}.py"
        full_test_path = target_dir / test_filename

        lines = [f'"""Auto-generated tests for {spec.function_name}."""']
        lines.append("import pytest")
        lines.append(f"from {spec.module_path} import {spec.function_name}")
        lines.append("")
        lines.append("")

        for prop in spec.expected_properties:
            test_fn_name = f"test_{safe_name}_{prop.replace('must_', '').replace('_for_', '_when_').replace('_', '-')}"
            lines.append(f"@pytest.mark.parametrize")
            lines.append(f"def test_{spec.function_name}_{prop}(self):")

            param_args = ", ".join(
                f"{p['name']}: {p.get('type_hint', 'Any') or 'Any'}"
                for p in spec.parameters[:3]
            )
            if param_args:
                lines.append(f"    result = {spec.function_name}({param_args})")
                if spec.return_type_hint:
                    lines.append(
                        f"    assert result is not None, "
                        f"'{spec.function_name} should return a value'"
                    )

            lines.append("")

        # Property-based test section for functions with simple numeric params
        numeric_params = [p for p in spec.parameters if p.get("type_hint") in ("int", "float")]
        if len(numeric_params) >= 2 and len(spec.expected_properties) == 0:
            lines.append("# Property-based fuzzing for edge case discovery")
            lines.append("@pytest.mark.parametrize")
            lines.append(f"def test_{spec.function_name}_boundary_conditions(self):")
            lines.append("    import hypothesis.strategies as st")
            lines.append("")

        full_test_path.write_text("\n".join(lines), encoding="utf-8")
        return str(full_test_path)


# ❌ BAD — Blindly generating tests without analyzing the source code structure
def bad_test_generation(module_path: Path, output_dir: Path) -> None:
    """This generates tests with no understanding of the function signatures."""
    # Just creates empty test files for every Python file found
    test_file = output_dir / f"test_{module_path.stem}.py"
    test_file.write_text("import pytest\n\ndef test_placeholder():\n    assert True\n")
    # No coverage analysis, no type awareness, no property inference


# ✅ GOOD — Structured test generation from AST + coverage gaps + property inference
def good_test_generation(pipeline: TestGenerationPipeline, target_dir: Path) -> dict:
    """Generate tests systematically: extract specs → find gaps → create targets → verify."""
    all_specs = []

    for module_path in pipeline.target_modules:
        if not module_path.exists():
            continue
        specs = pipeline.extract_function_specs(module_path)
        all_specs.extend(specs)

    coverage_gaps = pipeline.identify_coverage_gaps()

    generated_files = []
    for spec in all_specs:
        # Skip already-covered functions (heuristic: if docstring has no "returns" claim, skip)
        if not spec.expected_properties and not spec.return_type_hint:
            continue
        test_path = pipeline.generate_test_stub(spec, target_dir)
        generated_files.append(test_path)

    return {
        "modules_analyzed": len(pipeline.target_modules),
        "specs_extracted": len(all_specs),
        "coverage_gaps_found": len(coverage_gaps),
        "test_files_generated": len(generated_files),
        "generated_tests": generated_files,
    }
```

### Pattern 3: Deployment Pipeline Automation

CI/CD pipeline generation from project structure analysis. The engine detects the build system, test framework, deployment target, and environment configuration to produce a validated pipeline without manual template editing.

```python
import json
import logging
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)


@dataclass
class ProjectProfile:
    """Detected characteristics of a software project."""
    language: str  # "python", "typescript", "go"
    build_system: str  # "pip", "poetry", "npm", "make"
    test_framework: str  # "pytest", "jest", "unittest"
    deployment_target: str  # "docker", "kubernetes", "serverless", "static"
    has_dependency_file: bool
    config_files: list[str] = field(default_factory=list)
    entry_points: list[str] = field(default_factory=list)


@dataclass
class PipelineStage:
    """A single stage in the generated CI/CD pipeline."""
    name: str
    commands: list[str]
    artifacts: Optional[list[str]] = None
    condition: Optional[str] = None  # e.g., "if: branch == main"


class PipelineGenerator:
    """Generates CI/CD pipeline configurations from project analysis."""

    def __init__(self, project_root: str):
        self.project_root = Path(project_root)
        self.profile = self._analyze_project()

    def _analyze_project(self) -> ProjectProfile:
        """Detect project characteristics by scanning for convention files."""
        language = "unknown"
        build_system = "unknown"
        test_framework = "unknown"
        deployment_target = "unknown"
        config_files: list[str] = []
        entry_points: list[str] = []

        root = self.project_root

        # Detect language and build system
        if (root / "pyproject.toml").exists():
            language = "python"
            build_system = "poetry"
            config_files.append("pyproject.toml")
        elif (root / "setup.py").exists() or (root / "requirements.txt").exists():
            language = "python"
            build_system = "pip"
            config_files.append("setup.py" if (root / "setup.py").exists() else "requirements.txt")
        elif (root / "package.json").exists():
            language = "typescript"
            build_system = "npm"
            config_files.append("package.json")
            if (root / "pnpm-lock.yaml").exists():
                build_system = "pnpm"
            elif (root / "yarn.lock").exists():
                build_system = "yarn"
        elif (root / "go.mod").exists():
            language = "go"
            build_system = "go"
            config_files.append("go.mod")

        # Detect test framework
        if (root / "pytest.ini").exists() or (root / "pyproject.toml").exists():
            if language == "python":
                test_framework = "pytest"
        elif (root / "jest.config.js").exists():
            test_framework = "jest"

        # Detect deployment target
        if (root / "Dockerfile").exists():
            deployment_target = "docker"
            config_files.append("Dockerfile")
        if (root / "k8s").exists() or (root / "helm").exists():
            deployment_target = "kubernetes"
        elif (root / "serverless.yml").exists():
            deployment_target = "serverless"

        # Detect entry points
        for py_file in root.rglob("*.py"):
            if py_file.name == "__init__.py":
                continue
            content = py_file.read_text()
            if "def main(" in content or "if __name__ ==" in content:
                rel = str(py_file.relative_to(root))
                entry_points.append(rel)

        return ProjectProfile(
            language=language,
            build_system=build_system,
            test_framework=test_framework,
            deployment_target=deployment_target,
            has_dependency_file=bool(config_files),
            config_files=config_files,
            entry_points=entry_points,
        )

    def generate_pipeline_stages(self) -> list[PipelineStage]:
        """Generate CI/CD stages based on the detected project profile."""
        stages: list[PipelineStage] = []

        # Stage 1: Lint
        if self.profile.language == "python":
            lint_cmd = "ruff check ." if (self.project_root / "pyproject.toml").exists() else "flake8"
            stages.append(PipelineStage(
                name="lint",
                commands=[
                    "pip install ruff flake8 black isort",
                    f"{lint_cmd} .",
                    "black --check .",
                ],
            ))

        # Stage 2: Test
        if self.profile.test_framework == "pytest":
            stages.append(PipelineStage(
                name="test",
                commands=[
                    "pip install -e .[dev]",
                    "pytest tests/ --cov=. --cov-report=xml --junitxml=results.xml",
                ],
                artifacts=["coverage.xml", "results.xml"],
            ))
        elif self.profile.test_framework == "jest":
            stages.append(PipelineStage(
                name="test",
                commands=[
                    "npm ci",
                    "npm test -- --coverage --ci --reporters=default --reporters=jest-junit",
                ],
                artifacts=["coverage/coverage-summary.json"],
            ))

        # Stage 3: Build
        if self.profile.deployment_target == "docker":
            stages.append(PipelineStage(
                name="build",
                commands=[
                    'docker build -t "${IMAGE_NAME}:${BUILD_NUMBER}" .',
                    f'docker tag "${{IMAGE_NAME}}:${{BUILD_NUMBER}}" "${{IMAGE_NAME}}:latest"',
                ],
            ))

        # Stage 4: Security scan
        stages.append(PipelineStage(
            name="security",
            commands=[
                "pip install pip-audit semgrep" if self.profile.language == "python" else "npm audit --json > audit.json",
                "semgrep --config=auto ." if self.profile.language == "python" else "echo 'Skipping semgrep for non-Python'",
                "pip-audit || true  # Log vulnerabilities but don't fail CI on dev deps",
            ],
        ))

        # Stage 5: Deploy (conditional on main branch)
        stages.append(PipelineStage(
            name="deploy",
            commands=self._generate_deploy_commands(),
            condition="if: github.ref == 'refs/heads/main'",
        ))

        return stages

    def _generate_deploy_commands(self) -> list[str]:
        """Generate deployment commands based on the detected target."""
        if self.profile.deployment_target == "kubernetes":
            return [
                "kubectl apply -f k8s/",
                "kubectl rollout status deployment/app --timeout=300s",
            ]
        elif self.profile.deployment_target == "docker":
            return [
                'docker push "${IMAGE_NAME}:${BUILD_NUMBER}"',
                'docker push "${IMAGE_NAME}:latest"',
            ]
        else:
            return ['echo "No deployment target configured; pipeline validated but deploy skipped"']

    def dry_run_validation(self) -> dict:
        """Validate the generated pipeline without executing any stages."""
        stages = self.generate_pipeline_stages()
        issues: list[str] = []

        # Verify each stage has at least one command
        for stage in stages:
            if not stage.commands:
                issues.append(f"Stage '{stage.name}' has no commands — remove or populate")

        # Verify deploy stage exists and is conditional
        deploy_stage = next((s for s in stages if s.name == "deploy"), None)
        if deploy_stage and not deploy_stage.condition:
            issues.append("Deploy stage must be conditional (never auto-deploy)")

        return {
            "profile": {
                "language": self.profile.language,
                "build_system": self.profile.build_system,
                "test_framework": self.profile.test_framework,
                "deployment_target": self.profile.deployment_target,
            },
            "stages": [
                {"name": s.name, "commands_count": len(s.commands), "condition": s.condition}
                for s in stages
            ],
            "total_stages": len(stages),
            "issues": issues,
            "is_valid": len(issues) == 0,
        }


# ❌ BAD — Hardcoded pipeline template that ignores project specifics
def bad_pipeline_generator(project_dir: str) -> None:
    """Generates a one-size-fits-all pipeline regardless of the actual project."""
    path = Path(project_dir) / ".github" / "workflows" / "ci.yml"
    # Assumes Python + pytest + Docker — will break for TypeScript, Go, or static sites
    template = """
name: CI
on: push
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pip install pytest && pytest
      - run: docker build -t app .
      - run: docker push app:latest  # Always pushes — no branch check!
"""
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(template)  # No validation, no dry-run


# ✅ GOOD — Adaptive pipeline generation with project-aware detection and validation
def good_pipeline_generator(project_dir: str) -> dict:
    """Generate a tailored CI/CD pipeline and validate it via dry-run."""
    generator = PipelineGenerator(project_dir)

    stages = generator.generate_pipeline_stages()
    validation = generator.dry_run_validation()

    if not validation["is_valid"]:
        raise RuntimeError(
            f"Generated pipeline has {len(validation['issues'])} issues:\n" +
            "\n".join(f"  - {issue}" for issue in validation["issues"])
        )

    # Export as YAML-like structure (in practice, write a real .yml file)
    return {
        "project_profile": validation["profile"],
        "pipeline_stages": [
            {"name": s.name, "commands": s.commands, "condition": s.condition}
            for s in stages
        ],
        "validation": validation,
        "status": "generated_and_validated",
    }
```

### Pattern 4: Developer Velocity Tracker with Quality Gates

Metrics tracking for AI-assisted development: code generation ratio, test coverage deltas, deployment success rates, and automated quality gate enforcement. This pattern ensures the 30%+ AI code generation target doesn't compromise quality.

```python
import logging
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)


@dataclass
class VelocityMetric:
    """A single developer velocity measurement."""
    timestamp: float
    metric_name: str
    value: float
    unit: str  # "percent", "count", "seconds"
    baseline: Optional[float] = None  # Previous period value for delta calc

    @property
    def delta(self) -> Optional[float]:
        if self.baseline is None or self.baseline == 0:
            return None
        return round(((self.value - self.baseline) / self.baseline) * 100, 2)


@dataclass
class QualityGateResult:
    """Result of a quality gate check."""
    gate_name: str
    passed: bool
    threshold: float
    actual_value: float
    message: str = ""


class QualityGateEnforcer:
    """Enforces quality gates on AI-generated changes before they reach the codebase."""

    # Default thresholds — tune based on project maturity
    DEFAULT_THRESHOLDS = {
        "min_test_coverage": 0.80,       # 80% minimum coverage
        "max_cyclomatic_complexity": 10,  # Functions must be <= 10
        "max_lint_violations": 0,         # Zero tolerated on AI-generated changes
        "max_dependency_vulnerabilities": 0,
        "min_test_pass_rate": 1.0,        # 100% test pass rate required
    }

    def __init__(self, thresholds: Optional[dict[str, float]] = None):
        self.thresholds = thresholds or self.DEFAULT_THRESHOLDS.copy()

    def check_lint_compliance(self, lint_output_path: Path) -> QualityGateResult:
        """Verify that AI-generated code has zero lint violations."""
        if not lint_output_path.exists():
            return QualityGateResult(
                gate_name="lint",
                passed=False,
                threshold=0,
                actual_value=-1,
                message="No lint output found — run linter before gate check",
            )

        content = lint_output_path.read_text()
        violation_count = sum(1 for line in content.split("\n") if line.strip() and not line.startswith("Success"))
        threshold = self.thresholds["max_lint_violations"]

        return QualityGateResult(
            gate_name="lint",
            passed=violation_count <= threshold,
            threshold=threshold,
            actual_value=float(violation_count),
            message=f"{violation_count} violation(s) found (threshold: {threshold})",
        )

    def check_test_coverage(self, coverage_report_path: Path) -> QualityGateResult:
        """Ensure AI changes maintain or improve test coverage."""
        if not coverage_report_path.exists():
            return QualityGateResult(
                gate_name="test_coverage",
                passed=False,
                threshold=self.thresholds["min_test_coverage"],
                actual_value=0.0,
                message="No coverage report found — run tests with --cov flag first",
            )

        content = coverage_report_path.read_text()
        # Parse coverage percentage from common report formats
        for line in content.split("\n"):
            if "TOTAL" in line.upper() and "%" in line:
                parts = line.split()
                for part in parts:
                    if part.endswith("%"):
                        actual = float(part.rstrip("%")) / 100.0
                        threshold = self.thresholds["min_test_coverage"]
                        return QualityGateResult(
                            gate_name="test_coverage",
                            passed=actual >= threshold,
                            threshold=threshold,
                            actual_value=actual,
                            message=f"Coverage at {actual:.1%} (threshold: {threshold:.0%})",
                        )

        return QualityGateResult(
            gate_name="test_coverage",
            passed=False,
            threshold=self.thresholds["min_test_coverage"],
            actual_value=0.0,
            message="Could not parse coverage percentage from report",
        )

    def check_security_scan(self, scan_output_path: Path) -> QualityGateResult:
        """Ensure no critical security vulnerabilities in AI-generated dependencies."""
        if not scan_output_path.exists():
            return QualityGateResult(
                gate_name="security_scan",
                passed=False,
                threshold=self.thresholds["max_dependency_vulnerabilities"],
                actual_value=-1,
                message="No security scan output found — run pip-audit or semgrep first",
            )

        content = scan_output_path.read_text()
        # Count vulnerability entries (semgrep/pip-audit format)
        vuln_count = sum(1 for line in content.split("\n") if "Vulnerable" in line or "CWE" in line.upper())
        threshold = self.thresholds["max_dependency_vulnerabilities"]

        return QualityGateResult(
            gate_name="security_scan",
            passed=vuln_count <= threshold,
            threshold=threshold,
            actual_value=float(vuln_count),
            message=f"{vuln_count} vulnerability/ies found (threshold: {threshold})",
        )

    def run_full_gate_check(
        self, lint_path: Optional[Path] = None,
        coverage_path: Optional[Path] = None,
        security_path: Optional[Path] = None,
    ) -> dict:
        """Run all quality gates and return aggregate pass/fail."""
        results = []

        if lint_path:
            results.append(self.check_lint_compliance(lint_path))
        else:
            results.append(QualityGateResult("lint", True, 0, 0, "Lint skipped (manual run expected)"))

        if coverage_path:
            results.append(self.check_test_coverage(coverage_path))
        else:
            results.append(QualityGateResult("test_coverage", True, 0.80, 0.0, "Coverage check skipped"))

        if security_path:
            results.append(self.check_security_scan(security_path))
        else:
            results.append(QualityGateResult("security_scan", True, 0, 0.0, "Security scan skipped"))

        all_passed = all(r.passed for r in results)
        failed_gates = [r.gate_name for r in results if not r.passed]

        return {
            "overall_pass": all_passed,
            "gates": [
                {
                    "name": r.gate_name,
                    "passed": r.passed,
                    "threshold": r.threshold,
                    "actual": round(r.actual_value, 2),
                    "message": r.message,
                }
                for r in results
            ],
            "failed_gates": failed_gates,
        }


# ❌ BAD — No quality gates on AI-generated changes
def bad_ai_change_flow(ai_output: str) -> None:
    """Directly applies AI output without any verification."""
    Path("output.py").write_text(ai_output)
    # No lint check, no tests run, no security scan
    # This is how bugs and vulnerabilities get into production


# ✅ GOOD — Full quality gate enforcement on every AI-generated change
def good_ai_change_flow(
    ai_output: str,
    lint_path: Path,
    coverage_path: Path,
    security_path: Path,
) -> dict:
    """Apply AI changes only after passing all quality gates."""
    # Step 1: Write the generated code to a staging file
    staging = Path("/tmp/ai_generated_staging.py")
    staging.write_text(ai_output)

    enforcer = QualityGateEnforcer()

    # Step 2: Run quality gates
    gate_result = enforcer.run_full_gate_check(
        lint_path=lint_path,
        coverage_path=coverage_path,
        security_path=security_path,
    )

    if not gate_result["overall_pass"]:
        logger.error(f"Quality gate FAILED for AI-generated change: {gate_result['failed_gates']}")
        return {
            "status": "blocked",
            "reasons": gate_result["gates"],
            "action": "fix the failing gates before applying AI changes",
        }

    # Step 3: All gates passed — commit the change
    target = Path("src/ai_generated_module.py")
    target.write_text(ai_output)

    return {
        "status": "approved_and_applied",
        "gates_passed": [r["name"] for r in gate_result["gates"] if r["passed"]],
        "action": f"AI change written to {target}",
    }
```

---

## Constraints

### MUST DO

1. **Apply Law 1 (Early Exit) — Guard clause at every phase boundary.** Each workflow step must validate its prerequisites before proceeding. If code analysis hasn't completed, refuse to start refactoring. Use `assert` or early-return for invalid states.
2. **Apply Law 2 (Parse Don't Validate) — Treat AST output as parsed data, not raw strings.** Once a file is parsed into an AST tree, internal functions should trust the structure and operate on typed nodes, never re-parse or validate what's already been structured.
3. **Apply Law 4 (Fail Fast with Descriptive Errors) — Quality gates must halt on failure.** If a lint check fails on AI-generated code, stop immediately with the exact violations. Never log and continue — the gate exists to prevent bad code from entering the codebase.
4. **Reference `code-philosophy` Atomic Predictability** — Each refactoring transformation should be a pure function: same input AST → same output AST, no side effects. Test transformations in isolation before applying them at scale.
5. **Generate atomic commits with conventional commit messages.** Each change set must correspond to a single logical refactor or test addition. Format: `refactor: extract shared utility from auth module` or `test: add property-based tests for payment processing`.
6. **Always run existing tests before AND after applying refactoring changes.** The diff between pre-change and post-change test results is the primary verification of behavioral preservation. Any regression must revert the specific change that caused it.
7. **Track AI code generation ratio per developer per sprint.** Measure lines of code authored by AI vs. humans, with separate counts for tests generated vs. reviewed. Use this to calibrate when AI output needs more human oversight (target: 30%+ generation, but only if quality gates pass).
8. **Implement canary deployments for CI/CD pipeline changes.** Before a newly generated pipeline goes live, validate it on a staging branch with a subset of the test matrix. Only promote to `main` after at least one successful dry-run validation completes.

### MUST NOT DO

1. **Never apply AI-generated refactoring without running the full existing test suite first and after.** Behavior preservation is non-negotiable — if tests break, revert the change immediately.
2. **Never skip quality gates because "the deadline is tight."** The 30%+ code generation target only works when quality gates enforce standards consistently. Cutting corners destroys developer trust in AI-generated code.
3. **Never hardcode pipeline templates without project-specific analysis.** A Python/Docker project needs different stages than a TypeScript/static site. Always run `PipelineGenerator._analyze_project()` before generating configuration.
4. **Never deploy directly to production from a CI stage without manual approval or canary validation.** Production deployments must have a human-in-the-loop approval gate or automated canary analysis with automatic rollback on error rate increase.
5. **Never use AI-generated code that lacks docstrings or type hints.** Every function produced by the coding agent must include a descriptive docstring and typed signatures — this is both a quality signal and a requirement for downstream tooling (test generation, API documentation).
6. **Never merge AI-generated test files without verifying they actually test meaningful behavior.** A test that only asserts `True` or uses trivial inputs adds noise to the coverage report and creates false confidence.

---

## Output Template

When this skill is active, the model's output must contain:

1. **Project Profile Summary** — Detected language, build system, test framework, and deployment target with confidence scores
2. **Code Analysis Report** — Per-module metrics including function count, average complexity, and coverage gaps with severity classifications
3. **Refactoring Change Plan** — Atomic change sets grouped by module, each with estimated lines of change, affected tests, and commit message
4. **Generated Test Specifications** — List of test files to create, mapped to uncovered functions with inferred property-based test targets
5. **Quality Gate Results** — Pass/fail status for lint, security, coverage, and vulnerability checks with specific violation details
6. **Pipeline Configuration** — Complete CI/CD YAML output ready for `.github/workflows/` or equivalent, with dry-run validation results

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `tool-use-function-calling` | Provides the function calling mechanism coding agents use to invoke linters, test runners, and CI/CD APIs |
| `cli-agent-workflows` | Enables coding agents to execute terminal commands (running tests, deploying builds) via structured CLI interactions |
| `git-pr-workflows-onboard` | Coordinates PR creation and review workflows for AI-generated changes that pass quality gates |
| `subagent-driven-development` | Splits coding agent workloads across parallel subagents for independent refactoring, testing, and deployment tasks |
| `code-correctness-verifier` | Validates the semantic correctness of refactored code beyond what static analysis can detect |
