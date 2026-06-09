---
name: autonomous-coding-lifecycle
description: Manages the complete autonomous coding lifecycle from code generation through self-review, test validation, failure repair, and deployment with state-machine orchestration.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: agent
  role: implementation
  scope: implementation
  output-format: code
  triggers: autonomous coding, code generation testing fix, coding lifecycle, AI refactoring, how do i automate the full coding workflow, test-driven code generation
  archetypes: [tactical, orchestration]
  anti_triggers:
    - framework selection decisions
    - prompt engineering
    - single-task coding assistance
  response_profile:
    verbosity: medium
    directive_strength: high
    abstraction_level: operational
  related-skills: coding-agent-frameworks, cli-agent-workflows, tool-use-function-calling
---

# Autonomous Coding Lifecycle Pattern

Manages the complete autonomous coding lifecycle: code generation → self-review → test generation → test execution → failure repair → refactoring → deployment validation. This skill makes the model implement state-machine-orchestrated coding workflows with error handling at each phase, ensuring AI-generated code meets quality standards before reaching human review or production merge.

## TL;DR Checklist

- [ ] Define a state machine for each lifecycle phase (generate → review → test → fix → deploy)
- [ ] Implement automated test generation from code changes
- [ ] Build failure classification and retry logic per failure type
- [ ] Add diff-based scope validation before executing any change
- [ ] Enforce quality gates (lint, security scan, coverage threshold) before merge
- [ ] Track AI development velocity metrics for continuous improvement

---

## When to Use

Use this skill when:

- Building autonomous coding agents that can generate, test, and fix code without human intervention
- Implementing AI-assisted refactoring at scale where manual review of every change is impractical
- Setting up automated test generation pipelines for legacy codebases with low coverage
- Creating self-healing deployment pipelines that detect and repair broken builds automatically

## When NOT to Use

Avoid this skill for:

- Single-file changes that a human can review quickly
- Projects without CI/CD infrastructure (testing automation requires an execution environment)
- Teams where AI-generated code is not accepted for production merges yet
- Early prototype development where speed and iteration matter more than correctness

---

## Core Workflow

1. **State Machine Definition** — Define the lifecycle phases as states: `GENERATE → SELF_REVIEW → TEST_GENERATION → TEST_EXECUTION → FAILURE_CLASSIFICATION → FIX_REPAIR → REFACTORING → QUALITY_GATES → MERGE_VALIDATION`. Each state has entry conditions, actions, and exit conditions (success → next state, failure → repair or escalation). **Checkpoint:** Every state transition must be logged with the diff and test results that triggered it.
2. **Code Generation Phase** — Generate code using the task specification as input. Output must include the full file content, a summary of changes, and the reasoning behind key design decisions. **Checkpoint:** Generated code must pass basic syntax validation before proceeding to self-review.
3. **Self-Review Phase** — Run an automated review of the generated code: check for obvious bugs, missing error handling, security issues (SQL injection, hardcoded secrets), and adherence to project style conventions. Flag any issues for automatic repair or human escalation. **Checkpoint:** Self-review must catch all OWASP Top 10 vulnerabilities applicable to the generated code.
4. **Test Generation & Execution** — Generate tests that cover the new functionality, edge cases, and failure modes based on the code's type signature and docstrings. Execute tests and classify results: pass (proceed), fail-repairable (retry with fix), fail-unrepairable (escalate to human). **Checkpoint:** Test generation must achieve ≥ 80% line coverage on new code before proceeding to quality gates.
5. **Failure Repair Loop** — When tests fail, classify the failure type (assertion error, timeout, missing import, logic error) and attempt targeted repairs. Limit repair attempts to 3 per test; beyond that, escalate with a detailed failure report. **Checkpoint:** Each repair must include the specific fix applied and why it addresses the failure.
6. **Quality Gates & Merge Validation** — Before merging, enforce all quality gates: linting passes, security scan clean, coverage threshold met, performance benchmark within acceptable range. Produce a merge-ready diff with a human-readable summary of all changes made autonomously. **Checkpoint:** All quality gate scores must meet or exceed project-defined thresholds; no manual overrides without documentation.

---

## Implementation Patterns

### Pattern 1: Coding Lifecycle State Machine

```python
from dataclasses import dataclass, field
from enum import Enum
from typing import Any

class LifecycleState(str, Enum):
    """Enum of all phases in the autonomous coding lifecycle."""
    GENERATE = "generate"
    SELF_REVIEW = "self_review"
    TEST_GENERATION = "test_generation"
    TEST_EXECUTION = "test_execution"
    FAILURE_CLASSIFICATION = "failure_classification"
    FIX_REPAIR = "fix_repair"
    REFACTORING = "refactoring"
    QUALITY_GATES = "quality_gates"
    MERGE_VALIDATION = "merge_validation"

class TaskStatus(str, Enum):
    """Possible outcomes of a lifecycle phase."""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    REQUIRES_REPAIR = "requires_repair"
    PASSED = "passed"
    ESCALATED = "escalated"
    FAILED = "failed"

@dataclass
class ChangeDiff:
    """A diff of code changes with metadata for auditability."""
    file_path: str
    old_content: str | None
    new_content: str
    summary: str
    reasoning: list[str] = field(default_factory=list)

@dataclass
class LifecycleRecord:
    """Records the state and result of each lifecycle phase."""
    phase: LifecycleState
    status: TaskStatus
    changes_applied: list[ChangeDiff] = field(default_factory=list)
    test_results: dict[str, Any] = field(default_factory=dict)
    quality_scores: dict[str, float] = field(default_factory=dict)
    repair_count: int = 0
    escalation_reason: str | None = None
    
    @property
    def is_complete(self) -> bool:
        """Check if this phase has reached a terminal state."""
        return self.status in (TaskStatus.PASSED, TaskStatus.ESCALATED, TaskStatus.FAILED)

class CodingLifecycleOrchestrator:
    """Manages the state machine for autonomous code generation and validation.

    Orchestrates the full coding lifecycle from specification to merge-ready diff,
    with automated test generation, failure classification, and quality gate enforcement.
    """
    
    MAX_REPAIRS_PER_TEST = 3
    
    def __init__(self, llm_client: Any, test_runner: Any, quality_checker: Any) -> None:
        self._llm = llm_client
        self._test_runner = test_runner
        self._quality_checker = quality_checker
    
    def execute_lifecycle(
        self,
        task_specification: str,
        target_file: str | None = None
    ) -> LifecycleRecord:
        """Execute the full autonomous coding lifecycle.

        Args:
            task_specification: Human-readable description of what code to generate.
            target_file: Optional file path to write generated code into.

        Returns:
            LifecycleRecord with phase results and any escalation details.
        """
        record = LifecycleRecord(phase=LifecycleState.GENERATE, status=TaskStatus.PENDING)
        
        # Phase 1: Generate
        generated_code = self._generate_code(task_specification, target_file)
        if not self._validate_syntax(generated_code):
            record.status = TaskStatus.FAILED
            record.escalation_reason = "Generated code failed syntax validation"
            return record
        
        # Phase 2: Self-Review
        review_issues = self._self_review(generated_code)
        if review_issues.severity == "critical":
            record.status = TaskStatus.ESCALATED
            record.escalation_reason = f"Critical issues in self-review: {review_issues.summary}"
            return record
        
        # Phase 3-5: Test Generation, Execution, Repair Loop
        test_results = self._generate_and_run_tests(generated_code)
        
        if test_results["failed"]:
            record.status = TaskStatus.REQUIRES_REPAIR
            record.repair_count = self._repair_loop(generated_code, test_results)
            if record.repair_count >= self.MAX_REPAIRS_PER_TEST:
                record.status = TaskStatus.ESCALATED
                record.escalation_reason = f"Exceeded max repairs ({self.MAX_REPAIRS_PER_TEST})"
        
        # Phase 6: Quality Gates
        quality_scores = self._quality_checker.run_all_checks(generated_code)
        record.quality_scores = quality_scores
        
        all_passed = all(
            score >= threshold 
            for threshold, score in quality_scores.items() 
            if isinstance(threshold, (int, float))
        )
        
        record.status = TaskStatus.PASSED if all_passed else TaskStatus.ESCALATED
        return record
    
    def _generate_code(self, spec: str, target_file: str | None) -> dict[str, str]:
        """Generate code from a task specification using the LLM client.

        Args:
            spec: The task specification describing what to generate.
            target_file: Optional file path for the generated output.

        Returns:
            Dictionary with 'content' key containing the generated source code.
        """
        prompt = f"""Generate code to satisfy this specification:

{spec}

Output ONLY valid Python code. No markdown fences, no explanations.
{'Write to file: ' + target_file if target_file else ''}
"""
        response = self._llm.generate(prompt)
        return {"content": response.choices[0].message.content}
    
    def _validate_syntax(self, code: str) -> bool:
        """Validate Python syntax without executing the code.

        Uses Python's ast module to parse the source and detect syntax errors.
        Early exit on failure — never let syntactically invalid code proceed.

        Args:
            code: The source code string to validate.

        Returns:
            True if syntax is valid, False otherwise.
        """
        import ast
        try:
            ast.parse(code)
            return True
        except SyntaxError:
            return False
    
    def _generate_and_run_tests(self, code: str) -> dict[str, Any]:
        """Generate tests from code type signatures and execute them against the code.

        Args:
            code: The source code to generate tests for.

        Returns:
            Dictionary with test results including pass/fail counts and failure details.
        """
        # Generate test file from type signature analysis
        test_code = self._llm.generate(f"""Generate comprehensive unit tests for this code.

{code}

Include: normal cases, edge cases (empty input, None, invalid types), 
error handling paths, and boundary conditions.
""")
        
        return self._test_runner.execute(test_code)
    
    def _repair_loop(self, code: str, test_results: dict) -> int:
        """Attempt to fix failing tests with iterative targeted repairs.

        Classifies each failure, attempts a fix via LLM regeneration, and re-runs tests.
        Limits repairs to MAX_REPAIRS_PER_TEST per test to prevent infinite loops.

        Args:
            code: The current source code being tested.
            test_results: Dictionary of failing test details from the test runner.

        Returns:
            Number of repair attempts made before passing or exceeding limit.
        """
        repair_count = 0
        
        for failure in test_results["failed"]:
            if repair_count >= self.MAX_REPAIRS_PER_TEST:
                break
            
            repair_prompt = f"""The following test failed. Analyze the failure and propose a targeted fix.

Test name: {failure["name"]}
Expected: {failure["expected"]}
Actual: {failure["actual"]}
Error: {failure["error"]}

Current code:
{code}

Provide ONLY the fixed code — no explanations.
"""
            repaired = self._llm.generate(repair_prompt)
            
            # Re-run tests on repaired code
            new_results = self._test_runner.execute(repaired["content"])
            
            if not new_results.get("failed", []):
                code = repaired["content"]
            repair_count += 1
        
        return repair_count
    
    def _self_review(self, code: str) -> Any:
        """Automated code review for bugs, security vulnerabilities, and style issues.

        Checks against OWASP Top 10 patterns, hardcoded secrets, missing error handling,
        and naming convention consistency. Returns structured review results with severity.

        Args:
            code: The source code to review.

        Returns:
            Review result object with severity level, issue count, and summary.
        """
        response = self._llm.generate(f"""Review this code for issues. Report critical, major, and minor issues.

{code}

Check for:
- SQL injection / command injection vulnerabilities
- Hardcoded secrets or API keys
- Missing error handling on public interfaces
- Inconsistent naming conventions
- Logic errors (off-by-one, null pointer dereference)

Output as JSON with severity level and description.
""")
        return self._parse_review_response(response)
```

### Pattern 2: Failure Classification System

```python
from dataclasses import dataclass
import re

@dataclass
class FailureClassification:
    """Classifies a test failure to determine repairability and escalation path."""
    category: str  # "syntax", "assertion", "import_error", "timeout", "logic"
    is_repairable: bool
    suggested_fix: str | None = None
    severity: str = "major"  # "critical", "major", "minor"

FAILURE_PATTERNS: dict[str, tuple[re.Pattern, bool]] = {
    "syntax_error": (re.compile(r"SyntaxError|IndentationError|TabError"), True),
    "import_error": (re.compile(r"ModuleNotFoundError|ImportError"), True),
    "assertion_error": (re.compile(r"AssertionError"), False),
    "timeout": (re.compile(r"Timeout|timed out"), False),
    "type_error": (re.compile(r"TypeError.*'NoneType'"), True),
    "value_error": (re.compile(r"ValueError"), False),
    "key_error": (re.compile(r"KeyError"), True),
}

class FailureClassifier:
    """Classifies test failures into repairable vs escalation categories.

    Uses regex pattern matching against error messages to determine whether
    an LLM-based repair attempt is likely to succeed or if the failure requires
    human intervention.
    """
    
    @classmethod
    def classify(cls, error_message: str) -> FailureClassification:
        """Classify a test failure by matching error patterns.

        Args:
            error_message: The raw error message string from the test runner.

        Returns:
            FailureClassification with category, repairability, and suggested fix.
        """
        for category, (pattern, is_repairable) in FAILURE_PATTERNS.items():
            if pattern.search(error_message):
                suggested = cls._generate_suggestion(category, error_message)
                return FailureClassification(
                    category=category,
                    is_repairable=is_repairable,
                    suggested_fix=suggested,
                    severity="critical" if "syntax_error" in category else "major",
                )
        
        # Default: assume unrepairable by regeneration alone
        return FailureClassification(
            category="unknown",
            is_repairable=False,
            suggested_fix="Manual review required — failure pattern unrecognized",
        )
    
    @classmethod
    def _generate_suggestion(cls, category: str, error_msg: str) -> str | None:
        """Generate a human-readable fix suggestion for common failure categories.

        Args:
            category: The failure category from FAILURE_PATTERNS keys.
            error_msg: The full error message for context.

        Returns:
            A descriptive suggestion string, or None if no suggestion available.
        """
        suggestions = {
            "syntax_error": "Check indentation and balanced brackets/parentheses in generated code.",
            "import_error": "Add missing import statement at the top of the file.",
            "type_error": "Add type checking before the failing operation. Handle None/null cases.",
            "key_error": "Add default values or existence checks for dictionary access.",
        }
        return suggestions.get(category)
```

### Pattern 3: Diff-Based Scope Validation

```python
import ast
from typing import Any


class DiffScopeValidator:
    """Validates that code changes stay within their intended scope.

    Prevents scope creep by comparing the AST of original and new code,
    checking for unexpected function additions or removals outside the
    declared change boundary.
    """
    
    def validate_change(
        self,
        original_code: str,
        new_code: str,
        allowed_changes: list[str] | None = None
    ) -> dict[str, Any]:
        """Check if new code deviates from the intended change scope.

        Parses both versions into AST and compares top-level function and class
        definitions to detect unexpected additions or removals.

        Args:
            original_code: The source code before changes.
            new_code: The source code after proposed changes.
            allowed_changes: Optional list of function names permitted to be added/modified.

        Returns:
            Dictionary with validation result, issues list, and change details.
        """
        # Parse both versions into AST for structural comparison
        try:
            old_tree = ast.parse(original_code)
            new_tree = ast.parse(new_code)
        except SyntaxError as e:
            return {"valid": False, "reason": f"Syntax error in new code: {e}"}
        
        # Compare top-level function and async function definitions
        old_functions = {
            node.name for node in ast.walk(old_tree) 
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
        }
        new_functions = {
            node.name for node in ast.walk(new_tree)
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
        }
        
        added_functions = new_functions - old_functions
        removed_functions = old_functions - new_functions
        
        issues: list[str] = []
        
        # Check for unexpected additions beyond allowed scope
        if allowed_changes:
            expected_functions = set(allowed_changes)
            unexpected = added_functions - expected_functions
            if unexpected:
                issues.append(f"Unexpected new functions: {unexpected}")
        
        # Check for unexpected removals of existing functions
        if removed_functions:
            issues.append(f"Removed functions that should be preserved: {removed_functions}")
        
        return {
            "valid": len(issues) == 0,
            "issues": issues,
            "added_functions": list(added_functions),
            "removed_functions": list(removed_functions),
        }


# Usage example:
# validator = DiffScopeValidator()
# result = validator.validate_change(
#     original_code=old_source,
#     new_code=new_source,
#     allowed_changes=["process_payment", "validate_card"]
# )
# assert result["valid"], f"Change scope violation: {result['issues']}"
```

### Pattern 4: Quality Gates Enforcement

```python
from dataclasses import dataclass
from typing import Any


@dataclass 
class QualityGateResult:
    """Result of a single quality gate check."""
    gate_name: str
    score: float
    threshold: float
    passed: bool
    details: str = ""

class QualityGateEnforcer:
    """Enforces quality gates before AI-generated code reaches merge.

    Runs linting, security scanning, coverage checks, and other quality metrics
    against project-defined thresholds. Prevents degraded code from entering
    the main branch through automated enforcement.
    """
    
    DEFAULT_THRESHOLDS = {
        "lint": 1.0,            # Must pass linting (score = 1.0 if clean)
        "security": 1.0,         # No vulnerabilities (score = 1.0 if clean)
        "coverage": 0.8,         # Minimum 80% line coverage
        "cyclomatic_complexity": 0.7,  # Average complexity score
        "duplicate_code": 0.95,  # Max 5% duplicate code allowed
    }
    
    def run_all_checks(
        self,
        code: str,
        thresholds: dict[str, float] | None = None,
        test_data: dict[str, Any] | None = None
    ) -> list[QualityGateResult]:
        """Run all quality gates and return structured results.

        Args:
            code: The source code to check.
            thresholds: Optional override for default threshold values per gate.
            test_data: Optional coverage data from the test runner.

        Returns:
            List of QualityGateResult objects with pass/fail status per gate.
        """
        thresholds = thresholds or dict(self.DEFAULT_THRESHOLDS)
        results: list[QualityGateResult] = []
        
        # Lint check — integrate flake8/Black in production
        lint_score = 1.0
        results.append(QualityGateResult(
            gate_name="lint",
            score=lint_score,
            threshold=thresholds["lint"],
            passed=lint_score >= thresholds["lint"],
        ))
        
        # Security scan — integrate Bandit in production
        security_score = 1.0
        results.append(QualityGateResult(
            gate_name="security",
            score=security_score,
            threshold=thresholds["security"],
            passed=security_score >= thresholds["security"],
        ))
        
        # Coverage — populated from test runner data in production
        coverage_score = 0.0
        if test_data and "coverage" in test_data:
            coverage_score = test_data["coverage"]
        
        results.append(QualityGateResult(
            gate_name="coverage",
            score=coverage_score,
            threshold=thresholds["coverage"],
            passed=coverage_score >= thresholds["coverage"],
            details=f"Coverage: {coverage_score:.0%}" if coverage_score > 0 else "No test data available",
        ))
        
        return results
    
    def get_gate_summary(self, results: list[QualityGateResult]) -> str:
        """Generate a human-readable summary of quality gate results.

        Args:
            results: List of QualityGateResult objects from run_all_checks.

        Returns:
            Formatted multi-line string with pass/fail status per gate.
        """
        passed = sum(1 for r in results if r.passed)
        total = len(results)
        
        lines = [f"Quality Gates: {passed}/{total} passed"]
        for r in results:
            status = "✅" if r.passed else "❌"
            detail = f" — {r.details}" if r.details else ""
            lines.append(f"  {status} {r.gate_name}: {r.score:.1%} (threshold: {r.threshold:.1%}){detail}")
        
        return "\n".join(lines)


# ❌ BAD — No quality gates before merge. Merges broken code with security vulnerabilities.
# ai_code = generate_code("Add payment processing")
# # Directly merge without testing or linting.

# ✅ GOOD — Quality gates enforced before allowing merge.
# results = QualityGateEnforcer().run_all_checks(ai_code)
# assert all(r.passed for r in results), QualityGateEnforcer().get_gate_summary(results)
```

## Constraints

### MUST DO
1. Define the full state machine with explicit entry/exit conditions for each phase — no implicit transitions
2. Implement syntax validation before any downstream phase — never let syntactically invalid code proceed
3. Generate tests that cover edge cases and error paths, not just happy-path scenarios
4. Limit repair attempts to 3 per test — beyond that, escalate with detailed failure reports instead of blind retrying
5. Enforce quality gates (lint, security, coverage) before merge — no manual overrides without documented justification
6. Track AI development velocity metrics: lines generated, tests passed, repairs needed, time per phase
7. Reference `code-philosophy` (5 Laws of Elegant Defense): fail fast on syntax errors, early exit when repair count is exceeded, parse don't validate at the quality gate boundary
8. Log every state transition with the diff and test results that triggered it for full auditability

### MUST NOT DO
1. Merge AI-generated code directly to production without quality gates — always run linting, security scanning, and coverage checks first
2. Retry repairs infinitely on the same failure type — 3 attempts then escalate
3. Skip test generation for new functions or classes — every generated change needs tests
4. Allow the agent to modify files outside its declared scope — use diff-based validation to prevent scope creep
5. Bypass security scanning because "the code is simple" — OWASP Top 10 applies to all code regardless of size
6. Generate tests that only verify the new code works, without testing backward compatibility with existing functions

---

## Output Template

When this skill is active, deliver:

1. **State machine definition** — Full phase diagram with entry/exit conditions and transition rules
2. **Code generation template** — Prompt for generating code from specifications with syntax validation
3. **Self-review checklist** — Automated checks for bugs, security, style issues
4. **Test generation and repair logic** — Test creation, execution, failure classification, retry loop
5. **Quality gates configuration** — Lint, security, coverage thresholds per project
6. **Merge summary template** — Human-readable report of all autonomous changes for final review

---

## Related Skills

| Skill | Purpose |
|---|---|
| `coding-agent-frameworks` | Compares frameworks; this implements the operational coding lifecycle workflow |
| `cli-agent-workflows` | CLI interaction can execute the autonomous coding pipeline via terminal commands |
| `tool-use-function-calling` | The lifecycle uses tools (lint, test runner, linter) for each quality gate |

> 📖 skill(local cache): coding-agent-frameworks, cli-agent-workflows, tool-use-function-calling
