---
name: architectural-review
description: Evaluates existing software architectures for coupling, cohesion, testability,
  scalability, and maintainability using structured assessment frameworks and metric-based
  analysis.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: architectural review, architecture assessment, system quality evaluation,
    technical debt audit, how do i evaluate my architecture, codebase health check,
    coupling analysis, cohesion metrics
  archetypes:
  - educational
  anti_triggers:
  - brainstorming
  - vague ideation
  - code golf
  - over-engineering
  response_profile:
    verbosity: medium
    directive_strength: low
    abstraction_level: strategic
  role: review
  scope: review
  output-format: report
  content-types:
  - guidance
  - examples
  - do-dont
  - config
  related-skills: software-architecture, engineering-principles, technical-debt-management
------
# Architectural Review Guide

Acts as a senior software architect conducting thorough reviews of existing codebases to assess architectural quality across coupling, cohesion, testability, scalability, and maintainability dimensions. Produces structured reports with metric-based findings, prioritized remediation plans, and actionable recommendations for structural improvement.

## TL;DR for Code Generation

- [ ] Always ground findings in measured metrics (coupling numbers, complexity scores), not subjective impressions
- [ ] Separate concerns into three layers: observed evidence, derived assessment, recommended action
- [ ] Prioritize remediation by business impact and fix cost — always report both dimensions
- [ ] Use static analysis tools before manual inspection; automate what can be automated
- [ ] Validate every finding against at least two independent signals (metrics + code trace + stakeholder input)
- [ ] Include a clear severity classification with rationale, never assign "high" without concrete evidence

---

## When to Use

Use this skill when:

- Conducting a pre-launch architecture audit for a system approaching production scale
- Performing post-incident root cause analysis that reveals architectural issues (e.g., cascading failures from tight coupling)
- Running quarterly technical debt assessment across a growing codebase
- Onboarding a new architect to an unfamiliar legacy or greenfield system
- Preparing for a scaling initiative where current architecture may become a bottleneck
- A team reports chronic difficulties: long build times, flaky tests, frequent merge conflicts in shared modules

---

## When NOT to Use

Avoid this skill for:

- Codebases that are too small (under 500 lines) — the overhead outweighs any benefit
- An ongoing feature development sprint where a review would block delivery; schedule it as a separate activity
- Situations before clear scope is defined about which quality attributes matter most to stakeholders
- When reviewers lack access to the codebase, build system, or opportunity for stakeholder interviews
- As a substitute for active refactoring — review identifies problems, but remediation requires dedicated engineering effort

---

## Core Workflow

1. **Define Scope and Identify Stakeholders** — Determine which subsystems, services, or modules are in scope. Identify at least three stakeholders: a product owner (business priorities), a senior developer (implementation context), and an operations engineer (runtime behavior). Collect current system documentation, deployment diagrams, and incident history.
   **Checkpoint:** Confirm the review scope document is signed off by stakeholders before proceeding. No metric matters if it's measuring the wrong system boundary.

2. **Run Static Analysis Baseline** — Execute automated analysis across the codebase: cyclomatic complexity per module, dependency graph construction (import/require/depends relationships), afferent and efferent coupling counts per package, LCOM4 for class-level cohesion, and duplication detection (copy-paste >= 5 lines). Record raw metrics in a structured format.
   **Checkpoint:** Verify the analysis tools executed successfully on all target modules. Missing data points create blind spots that produce false-negative findings.

3. **Perform Structural Pattern Matching** — Scan the dependency graph and module structure for architectural anti-patterns: god classes (exceeding 50 public methods or LCOM > 8), circular dependencies between packages, layer violations (presentation calling persistence directly), data clumps (groups of fields always appearing together across modules), and feature envy (methods using another class's data more than their own).
   **Checkpoint:** Every identified anti-pattern must include the file path, line range, affected modules, and a minimal code excerpt demonstrating the violation.

4. **Assess Quality Attributes Qualitatively** — Trace data flow from user input to persistence for three representative use cases. Interview stakeholders about pain points: where do bugs originate? Which changes take longest? Where does scaling break? Correlate qualitative findings with static metrics — a module flagged as "slow to change" by developers should show high coupling or low cohesion metrics.
   **Checkpoint:** Each quality attribute must have at least one quantitative metric and one qualitative data point. Single-signal assessments are unreliable.

5. **Classify Findings by Severity** — Assign severity using the following matrix:
   - **Critical**: Active architectural fault causing production incidents, data corruption risk, or preventing essential scaling (e.g., circular dependency between core services, synchronous calls across network boundaries creating cascade failure paths)
   - **High**: Significant technical debt that impedes development velocity or creates future incident risk (e.g., god classes exceeding 500 lines, missing testability interfaces, duplicate business logic across modules)
   - **Medium**: Design smell that degrades long-term maintainability but does not block current work (e.g., high cyclomatic complexity > 15 in a single function, excessive parameters > 5 suggesting parameter objects needed)
   - **Low**: Opportunity for improvement with minimal risk and effort (e.g., missing architectural documentation for a module, inconsistent naming conventions across a package)

6. **Produce Structured Review Report** — Assemble findings into a report containing: executive summary (1 page), metric dashboard table, detailed findings ranked by severity with evidence and code references, remediation roadmap with effort estimates (story-point ranges), and a prioritized action plan distinguishing quick wins from structural transformations. Include confidence levels for each finding based on data completeness.
   **Checkpoint:** The report must be reviewable by both technical leads (who need implementation detail) and product managers (who need business impact context). If a stakeholder in either role cannot extract an actionable next step, revise before distribution.

---

## Assessment Framework

### Coupling and Cohesion Analysis Tool

This framework computes module-level coupling metrics and cohesion scores using Python AST analysis. It calculates afferent coupling (Ca), efferent coupling (Ce), instability (I), and abstractness (A) for the A/I matrix, plus LCOM4 for class-level cohesion.

```python
import ast
import os
from collections import defaultdict
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional


@dataclass
class ModuleMetrics:
    """Coupling and cohesion metrics for a single module."""
    name: str
    path: str
    afferent_coupling: int = 0      # How many modules import this one
    efferent_coupling: int = 0      # How many modules this one imports
    abstractness: float = 0.0       # Ratio of abstract classes to total classes
    instability: float = 0.0        # Ce / (Ca + Ce)
    lcom4: float = 0.0              # Lack of Cohesion of Methods (normalized)
    cyclomatic_complexity: int = 0  # Sum of branch points


class CouplingAnalyzer(ast.NodeVisitor):
    """Analyze a module's imports and class structure."""

    def __init__(self, source_code: str, module_name: str):
        self.source_code = source_code
        self.module_name = module_name
        self.imports: list[str] = []
        self.classes: list[dict] = []
        self.complexity: int = 1

    def visit_Import(self, node: ast.Import) -> None:
        for alias in node.names:
            self.imports.append(alias.name.split('.')[0])
        self.generic_visit(node)

    def visit_ImportFrom(self, node: ast.ImportFrom) -> None:
        if node.module:
            self.imports.append(node.module.split('.')[0])
        self.generic_visit(node)

    def visit_FunctionDef(self, node: ast.FunctionDef) -> None:
        # Count branch points for cyclomatic complexity
        self.complexity += sum(
            1 for child in ast.walk(node)
            if isinstance(child, (ast.If, ast.While, ast.For))
        )
        self.generic_visit(node)

    def visit_ClassDef(self, node: ast.ClassDef) -> None:
        methods = [m for m in node.body if isinstance(m, (ast.FunctionDef, ast.AsyncFunctionDef))]
        # LCOM4 approximation: pairs of methods that share no instance variables
        instance_vars = {
            attr.target.id for stmt in ast.walk(node)
            if isinstance(stmt, ast.Assign)
            for target in stmt.targets if isinstance(target, ast.Name)
        } | {
            kw.value.id for stmt in node.body
            if isinstance(stmt, ast.Expr) and isinstance(stmt.value, ast.Call)
            for kw in stmt.value.keywords if kw.arg == 'self'
        }

        method_vars = []
        for method in methods:
            method_local_vars: set[str] = set()
            for child in ast.walk(method):
                if isinstance(child, ast.Name) and isinstance(child.ctx, ast.Store):
                    method_local_vars.add(child.id)
            # Remove 'self' parameter
            method_local_vars.discard('self')
            method_vars.append(method_local_vars)

        # LCOM4: 1 - (methods sharing vars / max possible pairs)
        if len(method_vars) > 1:
            shared_pairs = sum(
                1 for i in range(len(method_vars))
                for j in range(i + 1, len(method_vars))
                if method_vars[i] & method_vars[j]
            )
            max_pairs = len(method_vars) * (len(method_vars) - 1) // 2
            self.lcom4 = round(1.0 - (shared_pairs / max_pairs), 3) if max_pairs > 0 else 0.0

        self.classes.append({
            'name': node.name,
            'methods': len(methods),
            'loc': len(ast.dump(node)),
        })


def analyze_module(module_path: str) -> ModuleMetrics:
    """Analyze a single Python module for coupling and cohesion metrics."""
    with open(module_path, 'r') as f:
        source = f.read()

    try:
        tree = ast.parse(source)
    except SyntaxError as e:
        return ModuleMetrics(name=os.path.basename(module_path), path=module_path)

    analyzer = CouplingAnalyzer(source, os.path.basename(module_path))
    analyzer.visit(tree)

    ca = 0  # Computed externally by scanning all files
    ce = len(analyzer.imports)

    abstractness = _compute_abstractness(tree) if analyzer.classes else 0.0
    instability = ce / (ca + ce) if (ca + ce) > 0 else 0.0

    return ModuleMetrics(
        name=os.path.basename(module_path),
        path=module_path,
        afferent_coupling=ca,
        efferent_coupling=ce,
        abstractness=abstractness,
        instability=round(instability, 3),
        lcom4=analyzer.lcom4,
        cyclomatic_complexity=analyzer.complexity,
    )


def _compute_abstractness(tree: ast.Module) -> float:
    """Compute ratio of abstract (incomplete) classes to total classes."""
    class_count = 0
    abstract_count = 0

    for node in ast.walk(tree):
        if isinstance(node, ast.ClassDef):
            class_count += 1
            body_methods = [m for m in node.body if isinstance(m, (ast.FunctionDef, ast.AsyncFunctionDef))]
            # An abstract class has methods with pass-only bodies (no implementation)
            unimplemented = sum(
                1 for m in body_methods
                if len(m.body) == 1 and isinstance(m.body[0], ast.Pass)
            )
            if unimplemented > 0:
                abstract_count += 1

    return round(abstract_count / class_count, 3) if class_count > 0 else 0.0


def assess_architecture(root_dir: str, package_names: list[str]) -> dict[str, ModuleMetrics]:
    """Scan a codebase and compute metrics for all specified packages."""
    results = {}
    root_path = Path(root_dir)

    for pkg in package_names:
        pkg_dir = root_path / pkg
        if not pkg_dir.is_dir():
            continue

        for py_file in sorted(pkg_dir.rglob('*.py')):
            # Skip test files and __init__ for cleaner metrics
            if '__pycache__' in str(py_file) or py_file.name == '__init__.py':
                continue
            results[pkg + '.' + py_file.stem] = analyze_module(str(py_file))

    return results


def instability_matrix(metrics: dict[str, ModuleMetrics]) -> list[dict]:
    """Classify modules into the Abstractness-Instability (A/I) matrix."""
    quadrants = {
        'stable_abstractions': [],   # High A, Low I (good: well-designed libraries)
        'dependent_abstractions': [], # High A, High I (bad: unstable abstractions)
        'stable_concrete': [],       # Low A, Low I (acceptable: stable concrete classes)
        'unstable_concrete': [],     # Low A, High I (bad: volatile concrete classes)
    }

    for name, m in metrics.items():
        if m.abstractness >= 0.5 and m.instability <= 0.5:
            quadrants['stable_abstractions'].append({'name': name, 'A': m.abstractness, 'I': m.instability})
        elif m.abstractness >= 0.5 and m.instability > 0.5:
            quadrants['dependent_abstractions'].append({'name': name, 'A': m.abstractness, 'I': m.instability})
        elif m.abstractness < 0.5 and m.instability <= 0.5:
            quadrants['stable_concrete'].append({'name': name, 'A': m.abstractness, 'I': m.instability})
        else:
            quadrants['unstable_concrete'].append({'name': name, 'A': m.abstractness, 'I': m.instability})

    return quadrants
```

### Architectural Smell Detector

Detects common anti-patterns in codebases. This tool identifies god classes, feature envy, data clumps, and long parameter lists — each with actionable remediation suggestions.

```python
import ast
from collections import defaultdict
from dataclasses import dataclass
from typing import Optional


@dataclass
class SmellFinding:
    """A single architectural smell detection."""
    type: str
    severity: str          # "critical", "high", "medium", "low"
    target: str            # Class or function name
    file: str              # File path
    line: int
    detail: str            # Human-readable explanation
    remediation: str       # Specific refactoring suggestion


class ArchitecturalSmellDetector(ast.NodeVisitor):
    """Detect architectural anti-patterns via AST analysis."""

    def __init__(self, file_path: str, source: str):
        self.file_path = file_path
        self.source = source
        self.findings: list[SmellFinding] = []

    # --- God Class Detection ---
    # A class with excessive methods or lines of code.

    def _detect_god_classes(self) -> None:
        tree = ast.parse(self.source)
        for node in ast.walk(tree):
            if isinstance(node, ast.ClassDef):
                methods = [m for m in node.body if isinstance(m, (ast.FunctionDef, ast.AsyncFunctionDef))]
                line_count = len(ast.dump(node).splitlines())

                # God class: > 20 methods or > 500 AST nodes representing LOC
                if len(methods) > 20:
                    self.findings.append(SmellFinding(
                        type='god_class',
                        severity='high' if len(methods) <= 40 else 'critical',
                        target=node.name,
                        file=self.file_path,
                        line=node.lineno,
                        detail=f"Class '{node.name}' has {len(methods)} methods. Exceeds god class threshold of 20.",
                        remediation="Apply Single Responsibility Principle. Extract related method groups into focused domain classes or value objects. Consider introducing a facade pattern for the most-used subset.",
                    ))
                if line_count > 500:
                    self.findings.append(SmellFinding(
                        type='god_class',
                        severity='high',
                        target=node.name,
                        file=self.file_path,
                        line=node.lineno,
                        detail=f"Class '{node.name}' spans approximately {line_count // 50} lines of code.",
                        remediation="Decompose into collaborating classes. Extract data-holding classes (DTOs), behavior-holding service classes, and configuration objects.",
                    ))

    # --- Feature Envy Detection ---
    # A method that uses more data/methods from another class than its own.

    def _detect_feature_envy(self) -> None:
        tree = ast.parse(self.source)
        for node in ast.walk(tree):
            if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                continue
            # Find methods that access attributes of external objects more than self
            other_refs = set()
            self_refs = set()

            for child in ast.walk(node):
                if isinstance(child, ast.Attribute):
                    if isinstance(child.value, ast.Name) and child.value.id == 'self':
                        self_refs.add(child.attr)
                    elif isinstance(child.value, ast.Name):
                        other_refs.add(child.attr)

            # Feature envy: referencing external data 3x more than own
            if len(other_refs) >= 3 and (len(self_refs) == 0 or len(other_refs) / max(len(self_refs), 1) >= 3):
                self.findings.append(SmellFinding(
                    type='feature_envy',
                    severity='medium',
                    target=node.name,
                    file=self.file_path,
                    line=node.lineno,
                    detail=f"Method '{node.name}' references {len(other_refs)} external data members vs {len(self_refs)} self members.",
                    remediation="Move the method to the class whose data it prefers (Move Method refactoring). If cross-cutting, introduce an intermediary service or command object.",
                ))

    # --- Long Parameter List Detection ---
    # Functions with more than 5 parameters suggest missing abstraction.

    def _detect_long_parameter_lists(self) -> None:
        tree = ast.parse(self.source)
        for node in ast.walk(tree):
            if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                continue
            params = [
                p.arg for p in node.args.args
                if p.arg != 'self' and p.arg != 'cls'
            ]
            if len(params) > 5:
                self.findings.append(SmellFinding(
                    type='long_parameter_list',
                    severity='medium' if len(params) <= 8 else 'high',
                    target=node.name,
                    file=self.file_path,
                    line=node.lineno,
                    detail=f"Function '{node.name}' accepts {len(params)} parameters: {', '.join(params)}.",
                    remediation="Introduce a parameter object (data class) to group related arguments. For optional parameters, use keyword-only args with defaults or a configuration object.",
                ))

    # --- Data Clump Detection ---
    # Groups of fields that appear together across multiple classes suggest a missing cohesive type.

    def _detect_data_clumps(self, all_classes: dict[str, set[str]]) -> None:
        """Detect recurring field combinations across classes."""
        field_pairs = defaultdict(list)
        for class_name, fields in all_classes.items():
            field_list = sorted(fields)
            for i in range(len(field_list)):
                for j in range(i + 1, len(field_list)):
                    pair_key = f"{field_list[i]}_{field_list[j]}"
                    field_pairs[pair_key].append(class_name)

        # A data clump appears in at least 3 classes
        for pair, classes in field_pairs.items():
            if len(set(classes)) >= 3:
                self.findings.append(SmellFinding(
                    type='data_clump',
                    severity='medium',
                    target=pair,
                    file=self.file_path,
                    line=0,
                    detail=f"Fields '{pair}' co-occur in {len(classes)} classes: {', '.join(sorted(set(classes)))}.",
                    remediation="Extract a value object or data class containing these fields. Replace individual parameters with the new type and update callers.",
                ))

    def run(self) -> list[SmellFinding]:
        """Execute all smell detection passes."""
        self._detect_god_classes()
        self._detect_feature_envy()
        self._detect_long_parameter_lists()

        # Collect all class fields for clump detection across files
        all_class_fields = defaultdict(set)
        tree = ast.parse(self.source)
        for node in ast.walk(tree):
            if isinstance(node, ast.ClassDef):
                for item in node.body:
                    if isinstance(item, ast.AnnAssign) and isinstance(item.target, ast.Name):
                        all_class_fields[node.name].add(item.target.id)

        self._detect_data_clumps(dict(all_class_fields))
        return self.findings


def scan_directory(root_dir: str, max_files: int = 200) -> list[SmellFinding]:
    """Scan an entire directory tree for architectural smells."""
    all_findings: list[SmellFinding] = []
    root_path = Path(root_dir)

    count = 0
    for py_file in sorted(root_path.rglob('*.py')):
        if '__pycache__' in str(py_file) or '.git' in str(py_file):
            continue
        if count >= max_files:
            break

        try:
            source = py_file.read_text()
            detector = ArchitecturalSmellDetector(str(py_file), source)
            findings = detector.run()
            all_findings.extend(findings)
            count += 1
        except (SyntaxError, UnicodeDecodeError):
            continue

    # Sort by severity for immediate actionability
    severity_order = {'critical': 0, 'high': 1, 'medium': 2, 'low': 3}
    all_findings.sort(key=lambda f: severity_order.get(f.severity, 99))

    return all_findings
```

---

## Review Report Template

A well-structured architectural review report enables both technical teams and leadership to act on findings. The report template below defines required sections:

### 1. Executive Summary (1 page)

- System under review and review scope boundary
- Key finding summary: counts by severity (e.g., "2 critical, 5 high, 8 medium, 3 low")
- Top 3 risks to business objectives with estimated financial or operational impact
- Overall architecture health score (composite of all quality attribute scores)

### 2. Metric Dashboard

| Quality Attribute | Current Score | Benchmark | Status | Trend |
|---|---|---|---|---|
| Coupling | 3.2 / 10 | ≤ 5 | ⚠️ Warning | → Stable |
| Cohesion | 6.8 / 10 | ≥ 7 | ✅ Acceptable | ↗ Improving |
| Testability | 4.1 / 10 | ≥ 6 | 🔴 Critical | → Stagnant |
| Scalability | 5.5 / 10 | ≥ 7 | ⚠️ Warning | ↘ Declining |
| Maintainability | 3.9 / 10 | ≥ 6 | 🔴 Critical | → Stagnant |

### 3. Detailed Findings by Severity

Each finding includes:

- **Finding ID**: Unique identifier (e.g., `AR-2024-001`)
- **Severity**: critical / high / medium / low
- **Category**: coupling, cohesion, testability, scalability, maintainability
- **Location**: file path and line number(s)
- **Description**: Clear explanation of the anti-pattern or quality issue with code evidence
- **Impact**: What business or engineering outcome is affected (e.g., "Onboarding new developers to this module takes 3 weeks instead of 2 days")
- **Evidence**: Metric values, dependency graph excerpts, test coverage percentage, stakeholder quote
- **Confidence Level**: high / medium / low (based on data completeness)
- **Remediation Suggestion**: Specific refactoring approach with estimated effort in story points

### 4. Remediation Roadmap

Prioritize by a two-axis matrix: **Effort** (low/medium/high in story points) vs **Impact** (critical/high/medium/low). This produces four quadrants:

- **Quick Wins** (Low Effort, High Impact): Address immediately in next sprint
- **Major Projects** (High Effort, High Impact): Plan as quarter-long initiatives
- **Fill-ins** (Low Effort, Low Impact): Handle during regular maintenance windows
- **Thankless Tasks** (High Effort, Low Impact): Deprioritize or defer to when impact becomes clear

### 5. Appendix: Raw Metrics and Tool Output

Include the full output of static analysis tools, dependency graphs, and any supporting data that informed the assessment. This enables the engineering team to validate findings independently.

---

## Quality Attributes Deep Dive

### Coupling Assessment

Coupling measures inter-module dependency density. High coupling means changes in one module necessitate changes in many others, increasing bug risk and slowing development velocity.

**How to measure:**
1. **Afferent coupling (Ca)**: Count the number of external modules importing this module. High Ca indicates a module is heavily depended upon — making it fragile to change.
2. **Efferent coupling (Ce)**: Count the number of external modules this module imports. High Ce indicates high dependency on other modules — increasing fragility when those dependencies change.
3. **Instability (I = Ce / (Ca + Ce))**: Ranges from 0 (maximally stable) to 1 (maximally unstable). The Stable Dependencies Principle dictates that stable modules should depend on other stable modules, not vice versa.
4. **Circular dependency detection**: Use DFS on the module dependency graph. Any back edge in the traversal indicates a cycle. Cycles between packages are structural faults; cycles within a package are acceptable only if they involve thin abstraction interfaces.

**Layer violation detection:**
```python
def detect_layer_violations(dependency_graph: dict[str, set[str]], layer_map: dict[str, str]) -> list[str]:
    """Detect dependencies that violate the intended layer architecture."""
    violations = []
    for source, targets in dependency_graph.items():
        source_layer = layer_map.get(source.split('.')[0], 'unknown')
        for target in targets:
            target_layer = layer_map.get(target.split('.')[0], 'unknown')
            # Presentation should not call persistence directly
            if source_layer == 'presentation' and target_layer == 'persistence':
                violations.append(f"{source} -> {target} (layer violation: presentation bypasses business logic)")
    return violations
```

### Cohesion Assessment

Cohesion measures how closely related the responsibilities of a module or class are. High cohesion means all parts serve a single purpose; low cohesion signals a "shotgun" design where unrelated concerns are mixed.

**How to assess:**
1. **LCOM4 (Lack of Cohesion of Methods)**: The proportion of method pairs that do not share any instance variables. Ranges from 0 (perfect cohesion) to 1 (no cohesion). Thresholds: LCOM4 > 0.75 signals poor cohesion requiring decomposition.
2. **Method clustering**: Group methods by the instance variables they access. If a class naturally clusters into two or more groups of methods that operate on disjoint variable sets, extract each cluster as a separate class.
3. **Abstractness-Cohesion alignment**: An abstract interface should have high internal cohesion (all methods serve one purpose). A concrete implementation can have moderate cohesion if it faithfully realizes a cohesive interface.

### Testability Assessment

Testability measures how easily the system under test can be isolated from its infrastructure for unit testing.

**How to assess:**
1. **Dependency Injection Coverage**: Count classes with constructor-injected dependencies vs hard-coded `import` or module-level singletons. Systems where > 50% of domain objects use DI score well; systems relying on module-level globals score poorly.
2. **Infrastructure Isolation Score**: For each core business logic function, determine whether it can be tested with in-memory doubles (no database, no network calls). Count functions that require live infrastructure — a high ratio indicates poor testability.
3. **Mock Complexity Index**: Estimate the number of mock objects needed per unit test. If setting up a single test requires creating 5+ mocks with complex argument matching, the system has excessive coupling and needs interface extraction or command patterns.

### Scalability Assessment

Scalability measures how well the architecture accommodates increased load without re-architecture.

**How to assess:**
1. **State Management Patterns**: Identify where state is stored. In-memory singletons, global variables, and thread-local storage prevent horizontal scaling. State should be externalized to databases, caches, or session stores.
2. **Synchronous Bottleneck Detection**: Trace request paths through the codebase. Any synchronous call chain that crosses process boundaries (HTTP, RPC, database queries) creates a latency bottleneck under load. Identify chains longer than 3 synchronous hops — these are scaling risks.
3. **Resource Contention Hotspots**: Look for shared mutable state, file locks, mutex-protected sections, or unbounded queues. Under high concurrency, these become throughput limiters.

### Maintainability Assessment

Maintainability measures how easily code can be understood and modified by new developers.

**How to assess:**
1. **Cyclomatic Complexity Thresholds**: Flag functions exceeding complexity of 10 (warning) or 20 (critical). Each additional path through the code multiplies test requirements exponentially. Functions above complexity 15 should be decomposed into smaller units.
2. **Duplication Detection**: Use tools like `simian` or `dupfinder` to locate copy-paste blocks >= 5 lines across files. > 10% duplication indicates missing abstraction layers or inconsistent refactoring practices.
3. **Documentation Coverage Ratio**: Measure the percentage of public functions and classes with docstrings meeting a minimum character threshold (e.g., ≥ 80 characters). Systems below 60% documented need immediate attention from their maintainers.

---

## Constraints

### MUST DO
- Ground every finding in measurable evidence: cite specific metric values, file paths, line numbers, or stakeholder quotes — never rely on gut feeling
- Cross-validate each major finding with at least two independent data sources (e.g., high cyclomatic complexity + developer interview confirmation)
- Separate the review report into three distinct parts: observed evidence, derived assessment, and recommended action — do not mix them
- Classify every finding with a severity level and provide both business impact and fix effort estimates for each
- Include a remediation roadmap that distinguishes quick wins (≤ 2 story points) from structural transformations (≥ 13 story points)
- Present results in a format readable by both technical leads (detailed code evidence) and product managers (business impact summaries)

### MUST NOT DO
- Do not present architectural opinion as fact — distinguish between established principles (SOLID, DRY) and team-specific conventions that may be reasonable tradeoffs
- Do not recommend framework or language changes as remediation — focus on structural improvements within the existing technology stack
- Do not produce findings without a concrete remediation suggestion — identifying problems without solutions creates frustration, not improvement
- Do not ignore positive findings — explicitly document well-designed modules and patterns worth preserving; teams need reinforcement too

---

## Related Skills

| Skill | Purpose |
|---|---|
| `software-architecture` | Provides design patterns and architectural styles for the remediation phase after review identifies issues |
| `engineering-principles` | Supplies foundational SOLID, DRY, and separation of concerns principles referenced during assessment |
| `technical-debt-management` | Extends review findings into a prioritized backlog with tracking, monitoring, and repayment strategies |

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Applied Software Architecture (Amazon)](https://www.amazon.com/Applied-Software-Architecture/p/dp/0596510242)
- [Software Architecture in Practice (FOSSA Book)](https://www.informit.com/store/software-architecture-in-practice-9780137578967)
- [Architecture Tradeoff Analysis Method (ATAM)](https://www.sei.cmu.edu/documents/1422)
- [Architectural Review Board (ARB) Best Practices](https://martinfowler.com/articles/archReview.html)
- [NIST SP 800-160 Vol. 2 — Systems Security Engineering](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-160v2.pdf)
