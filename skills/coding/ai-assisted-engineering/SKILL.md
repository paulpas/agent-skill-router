---
name: ai-assisted-engineering
description: Implements AI pair programming workflows (spec-first prompting, code review, LLM test generation, prompt engineering) to integrate LLMs into development pipelines safely and productively.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: ai-assisted engineering, AI pair programming, LLM code generation, prompt engineering for code, automated code review with AI, AI test generation, how do i use AI in software development, code generation guardrails
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, examples, do-dont]
  related-skills: coding-code-quality-policies, coding-testing-strategy, coding-security-review
---

# AI-Assisted Software Engineering

Acting as a senior engineer who integrates AI pair programming tools into professional development workflows. This skill makes the model structure AI interactions like formal engineering processes — writing specifications before code, verifying outputs against contracts, and maintaining human review gates for all AI-generated changes. It treats every AI suggestion as a draft requiring validation, never as final output.

## TL;DR Checklist

- [ ] Write a structured prompt with context, specification, constraints, and expected output format before asking for code generation
- [ ] Verify every AI-generated function has typed signatures matching or exceeding the project's existing typing standards
- [ ] Review all AI-generated tests to confirm they test actual behavior, not just happy paths
- [ ] Run linters and type checkers on AI-generated code before accepting it into the codebase
- [ ] Confirm AI-generated security-sensitive code (auth, encryption, input parsing) receives manual review
- [ ] Compare AI output against existing patterns in the codebase for consistency
- [ ] Treat AI suggestions as drafts requiring validation — never accept without reading

---

## When to Use

Use this skill when:

- Generating boilerplate code (CRUD operations, API endpoints, model classes, serialization logic) that follows established project patterns
- Writing comprehensive unit test suites for functions with well-defined contracts and clear input/output specifications
- Reviewing complex pull requests where you need an AI second set of eyes for edge cases or missing error handling
- Exploring unfamiliar codebases by asking AI to explain architecture patterns, data flow, or module dependencies
- Converting between technologies (e.g., converting REST endpoints to GraphQL resolvers, migrating from one ORM to another)
- Refactoring legacy code by describing the desired target state and asking AI to propose concrete migration steps

---

## When NOT to Use

Avoid this skill for:

- Implementing security-critical logic (authentication, encryption, access control, input validation at trust boundaries) without line-by-line manual review — use `coding-security-review` instead
- Making architectural decisions that require deep understanding of team constraints, business context, or legacy system coupling
- Performance-critical inner loops where micro-optimizations based on actual profiling data are needed — AI cannot replace measured benchmarks

---

## Core Workflow

1. **Prepare the Prompt Context** — Read relevant source files, tests, and any related documentation that define the problem space. Identify the exact scope: which file is being modified, what existing functions interact with it, and what patterns are already established. Gather 2–3 examples of how similar functions are structured in the project (naming conventions, error handling style, import ordering). **Checkpoint:** The prompt must include at least: the file path being modified, the function signatures already defined in that file, and 2–3 concrete examples of how similar functions are structured in this project.

2. **Write a Spec-First Prompt** — Structure the prompt using the Specification-Pattern-Constrain template: (a) Specify the desired behavior with concrete input/output examples including edge cases, (b) Reference the implementation pattern from the codebase (point to specific files or functions), (c) Constrain output format by specifying required type signatures, docstring structure, and test coverage expectations. **Checkpoint:** If the spec does not include at least one example of expected input and output for the function being generated, rewrite it before sending to the AI.

3. **Generate and Critically Evaluate** — Review the AI output line-by-line against the spec. Verify type signatures match or exceed project standards (include `typing` imports where applicable), edge cases are handled (None values, empty collections, invalid types, zero-length inputs), error paths return appropriate exceptions with context, and the implementation mirrors the project's existing patterns. Apply the 5 Laws of Elegant Defense from `code-philosophy`: early exit on invalid input, parse don't validate at boundaries, fail fast with descriptive errors, ensure atomic predictability in pure functions, and maintain intentional naming throughout. **Checkpoint:** Every generated function must pass: type checker (e.g., `mypy`) locally before acceptance, and must have at least one test case for each non-trivial branch in the implementation.

4. **Augment with Tests** — Use AI to generate tests by providing the function signature, docstring, and 3–5 input/output examples covering happy path, edge cases (None, empty, zero-length), error conditions, and type mismatches. Review generated tests to confirm they would actually fail if a simple bug were introduced — verify each test asserts real behavior rather than just checking that no exception is raised. Replace any test that only covers happy path with additional failing-case tests. **Checkpoint:** For every generated test, run it in isolation and confirm it fails when you introduce a deliberate bug (e.g., return wrong value, skip a branch).

5. **Run Verification Pipeline** — Execute the full local verification chain in order: lint → type check → unit tests → security scan (for sensitive code involving auth, encryption, or input parsing). Only accept AI output when all stages pass cleanly. **Checkpoint:** If any stage fails, either fix the AI output and re-run or reject it entirely — never suppress warnings with `# noqa`, ignore type errors, or skip failing tests to make AI output pass validation.

---

## Implementation Patterns

### Pattern 1: Spec-First Prompt Builder

This dataclass-based builder structures prompts for AI code generation tools, ensuring every prompt contains the four essential components: context (what exists), specification (what is needed), constraints (what matters), and expected format (how output should look).

```python
from __future__ import annotations

import textwrap
from dataclasses import dataclass, field
from pathlib import Path


@dataclass(frozen=True)
class SpecFirstPrompt:
    """Structured prompt for spec-first AI code generation.
    
    Ensures every AI request includes context, specification, constraints,
    and expected output format — the four pillars of productive prompting.
    """
    file_path: str
    existing_signatures: list[str]
    examples: list[tuple[str, str]]
    constraints: list[str] = field(default_factory=list)
    pattern_references: list[str] = field(default_factory=list)

    def build(self) -> str:
        """Construct the full prompt string from structured components."""
        parts: list[str] = []
        
        # Section 1: Context — what exists in the file
        parts.append("## CONTEXT")
        parts.append(f"File being modified: `{self.file_path}`")
        parts.append("Existing function signatures:")
        for sig in self.existing_signatures:
            parts.append(f"  - {sig}")

        # Section 2: Specification — desired behavior with examples
        parts.append("\n## SPECIFICATION")
        parts.append("Generate a function that satisfies these examples:")
        for i, (inp, out) in enumerate(self.examples, 1):
            parts.append(f"  Example {i}: Input = {inp} → Output = {out}")

        # Section 3: Constraints — rules the output must follow
        if self.constraints:
            parts.append("\n## CONSTRAINTS")
            for constraint in self.constraints:
                parts.append(f"  - {constraint}")

        # Section 4: Pattern References — code to mirror
        if self.pattern_references:
            parts.append("\n## PATTERN REFERENCES")
            parts.append("Mirror the style from these files:")
            for ref in self.pattern_references:
                parts.append(f"  - {ref}")

        return "\n".join(parts)


def build_code_prompt(
    file_path: str,
    function_name: str,
    docstring: str,
    examples: list[tuple[str, str]],
    *,
    required_types: list[str] | None = None,
    constraints: list[str] | None = None,
) -> str:
    """Build a spec-first prompt for AI code generation.
    
    Args:
        file_path: Path to the file being modified
        function_name: Name of the function to generate
        docstring: Docstring describing what the function does
        examples: List of (input_string, expected_output_string) pairs
        required_types: List of type annotations the output must include
        constraints: List of coding constraints the output must follow
    
    Returns:
        Fully structured prompt string ready to send to an AI code assistant.
    """
    signatures = [f"def {function_name}(...)"]
    if required_types:
        constraints = (constraints or []) + [
            f"Must include these type annotations: {', '.join(required_types)}",
            "Must use Python 3.10+ type syntax (e.g., X | None instead of Optional[X])",
        ]

    prompt = SpecFirstPrompt(
        file_path=file_path,
        existing_signatures=signatures,
        examples=examples,
        constraints=constraints or [],
    )
    return prompt.build()


# Usage example:
# prompt = build_code_prompt(
#     file_path="src/auth/validators.py",
#     function_name="validate_email_domain",
#     docstring="Check if an email domain is in the allowed list.",
#     examples=[("user@example.com", True), ("@broken", False)],
#     required_types=["email: str", "allowed_domains: set[str]"],
#     constraints=[
#         "Return early on None or empty string input",
#         "Raise ValueError with the invalid domain in the message",
#     ],
# )
```

### Pattern 2: AI Code Review Checklist (BAD vs GOOD)

This pattern shows how to structure acceptance gates for AI-generated code. Every gate checks a specific quality attribute and produces actionable feedback. The BAD example demonstrates what happens when you skip verification; the GOOD example enforces structured review.

```python
from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any


@dataclass(frozen=True)
class ReviewGateResult:
    """Single gate check result from AI code review."""
    gate_name: str
    passed: bool
    issue: str | None = None

    @property
    def status(self) -> str:
        return "PASS" if self.passed else "FAIL"


def has_typed_signatures(source_code: str) -> bool:
    """Check that public functions have typed signatures with type hints."""
    # Look for def statements without type annotations on parameters or return
    func_pattern = re.compile(
        r"^\s*def\s+\w+\([^)]*\)(?!\s*->\s*\w+)",
        re.MULTILINE,
    )
    matches = func_pattern.findall(source_code)
    # A file with zero function definitions is trivially passing
    if not any(re.search(r"^\s*def\b", line) for line in source_code.splitlines()):
        return True
    return len(matches) == 0


def has_nullable_params(spec: dict[str, Any]) -> bool:
    """Check if the spec indicates parameters that accept None."""
    type_hints = spec.get("type_hints", {})
    for param_name, hint in type_hints.items():
        if "None" in str(hint) or "Optional" in str(hint) or " | None" in str(hint):
            return True
    return False


def review_ai_generated_function(
    original_spec: dict[str, Any],
    ai_output: str,
    existing_tests: list[str],
    file_path: Path,
) -> tuple[bool, list[ReviewGateResult]]:
    """Review AI-generated code against spec and apply verification gates.

    Implements the human review gate from the Core Workflow (Step 3).
    Each gate checks a specific quality attribute and produces actionable feedback.

    Args:
        original_spec: The specification that defined what should be generated,
                       including type_hints, required_behaviors, and edge_cases.
        ai_output: The raw Python source code generated by the AI tool.
        existing_tests: List of existing test function names in the file,
                        to check for new test coverage.
        file_path: Path to the file being reviewed, used for context logging.

    Returns:
        Tuple of (accepted, gate_results). accepted is True only when ALL gates pass.
        gate_results contains each gate's verdict with specific issue descriptions.
    """
    issues: list[ReviewGateResult] = []

    # Gate 1: Type signature compliance — every public function needs type hints
    if not has_typed_signatures(ai_output):
        issues.append(ReviewGateResult(
            gate_name="type-signatures",
            passed=False,
            issue="Missing type hints on one or more public functions. "
                  "Every function must have typed parameters and a return annotation.",
        ))
    else:
        issues.append(ReviewGateResult(gate_name="type-signatures", passed=True))

    # Gate 2: Spec coverage — every declared behavior must be present in output
    required_behavior = original_spec.get("required_behaviors", [])
    missing_requirements = []
    for req in required_behavior:
        if req not in ai_output:
            missing_requirements.append(req)
    
    if missing_requirements:
        issues.append(ReviewGateResult(
            gate_name="spec-coverage",
            passed=False,
            issue=f"AI output does not satisfy requirements: {'; '.join(missing_requirements)}",
        ))
    else:
        issues.append(ReviewGateResult(gate_name="spec-coverage", passed=True))

    # Gate 3: Edge case handling — check for None-aware code when params are nullable
    if has_nullable_params(original_spec):
        none_guard_pattern = re.compile(r"(is\s+None|if\s+\w+\s+is\s+not\s+None|"
                                         r"if\s+not\s+\w+|\braise\s+ValueError)")
        if not none_guard_pattern.search(ai_output):
            issues.append(ReviewGateResult(
                gate_name="edge-case-handling",
                passed=False,
                issue="Function accepts nullable parameters but contains no None guards "
                      "(e.g., 'if x is None: raise ValueError'). Add early-exit guards.",
            ))
        else:
            issues.append(ReviewGateResult(gate_name="edge-case-handling", passed=True))

    # Gate 4: Error path verification — no bare except clauses
    bare_except_count = ai_output.count("except:") + len(re.findall(r"except\s*:", ai_output))
    if bare_except_count > 0:
        issues.append(ReviewGateResult(
            gate_name="error-paths",
            passed=False,
            issue=f"Bare except clause found ({bare_except_count} occurrences). "
                  "Must catch specific exception types, never use bare except.",
        ))
    else:
        issues.append(ReviewGateResult(gate_name="error-paths", passed=True))

    # Gate 5: Import hygiene — no wildcard imports in generated code
    wildcard_import = re.search(r"from\s+\w+\s+import\s+\*", ai_output)
    if wildcard_import:
        issues.append(ReviewGateResult(
            gate_name="import-hygiene",
            passed=False,
            issue="Wildcard import found ('import *'). Use explicit imports for clarity.",
        ))
    else:
        issues.append(ReviewGateResult(gate_name="import-hygiene", passed=True))

    accepted = all(g.passed for g in issues)
    return accepted, issues


# ❌ BAD: Accepting AI output without any verification gate
def accept_ai_code(ai_output: str) -> None:
    """Writes raw AI output to file without review — dangerous pattern."""
    # No validation, no testing, no review gate. This is how bugs slip in.
    Path("src/utils.py").write_text(ai_output)
    print("Done!")  # ❌ Silent acceptance with no feedback


# ✅ GOOD: Structured acceptance with verification gates
def accept_with_gates(
    spec: dict[str, Any],
    ai_output: str,
    file_path: Path = Path("src/utils.py"),
) -> tuple[bool, list[str]]:
    """Accept AI-generated code only after passing all review gates.

    Returns (accepted, messages). If accepted is False, messages list contains
    the specific issues that must be fixed before the code can be committed.
    
    Enforces the principle from code-philosophy Law 4 (Fail Fast): invalid code
    is rejected immediately with descriptive feedback rather than silently accepted.
    """
    accepted, gate_results = review_ai_generated_function(
        original_spec=spec,
        ai_output=ai_output,
        existing_tests=[],
        file_path=file_path,
    )

    messages = [f"[{g.status}] {g.gate_name}" for g in gate_results]
    if not accepted and gate_results:
        failed_issues = [g.issue for g in gate_results if not g.passed and g.issue]
        messages.insert(0, "REJECTED — fix these issues:")
        messages.extend(f"  • {issue}" for issue in failed_issues)

    status = "ACCEPTED" if accepted else "REJECTED"
    messages.insert(0, f"Gate review result: {status}")
    
    return accepted, messages


# Usage example:
# spec = {
#     "required_behaviors": [
#         "Returns True for valid email domains",
#         "Raises ValueError for invalid domain",
#     ],
#     "type_hints": {"email": "str | None", "allowed_domains": "set[str]"},
# }
# accepted, messages = accept_with_gates(spec, ai_code_output)
# if accepted:
#     Path("src/validators.py").write_text(ai_code_output)
```

### Pattern 3: AI Test Generation Prompt Builder

This function generates structured prompts for test generation. It takes a function signature and examples, then produces a prompt that instructs the AI to generate comprehensive tests — not just happy paths but edge cases, error conditions, and type mismatches.

```python
from __future__ import annotations

import textwrap
from dataclasses import dataclass, field
from typing import Any


@dataclass(frozen=True)
class TestPrompt:
    """Structured prompt for AI-powered test generation."""
    function_name: str
    module_path: str
    signature: str
    docstring: str
    examples: list[dict[str, Any]]
    edge_cases: list[str] = field(default_factory=list)

    def build(self) -> str:
        """Construct a test generation prompt for the AI."""
        parts: list[str] = []
        
        parts.append(f"## FUNCTION TO TEST")
        parts.append(f"Module: `{self.module_path}`")
        parts.append(f"Signature: `{self.signature}`")
        parts.append(f"\nDocstring:\n{self.docstring}")

        parts.append("\n## KNOWN EXAMPLES")
        for i, ex in enumerate(self.examples, 1):
            args = ", ".join(f"{k}={v!r}" for k, v in ex.items())
            parts.append(f"  Example {i}: {self.function_name}({args}) → {ex.get('result')}")

        parts.append("\n## REQUIRED EDGE CASES TO TEST")
        default_edge_cases = [
            "None input where parameter accepts None",
            "Empty string, empty list, or zero-length collection",
            "Empty dict or None dict",
            "Single-element inputs at boundaries",
            "Invalid types that would cause type errors",
            "Network failures or timeout scenarios if applicable",
        ]
        all_cases = self.edge_cases if self.edge_cases else default_edge_cases
        for case in all_cases:
            parts.append(f"  - {case}")

        parts.append("\n## OUTPUT FORMAT REQUIREMENTS")
        parts.append("- Use pytest with assert statements (not try/except)")
        parts.append("- Each test must be a separate @pytest.mark.parametrize or standalone function")
        parts.append("- Every test must fail if a simple bug is introduced (e.g., wrong return value)")
        parts.append("- Include type mismatch tests using pytest.raises")
        parts.append("- Add docstrings to each test explaining what it verifies")

        return "\n".join(parts)


def build_test_generation_prompt(
    function_name: str,
    module_path: str,
    signature: str,
    docstring: str,
    happy_paths: list[tuple[dict[str, Any], Any]],
    *,
    edge_cases: list[str] | None = None,
) -> str:
    """Build a structured test generation prompt for AI code assistants.

    The prompt ensures the generated tests cover more than just happy paths —
    they must also verify edge cases, error conditions, and type mismatches.
    This prevents the common AI mistake of only generating passing-path tests.

    Args:
        function_name: Name of the function being tested.
        module_path: Dot-separated module path (e.g., "src.auth.validators").
        signature: Full function signature string for context.
        docstring: The function's docstring explaining its behavior.
        happy_paths: List of (input_kwargs, expected_result) tuples for normal cases.
        edge_cases: Optional list of custom edge case descriptions. Uses defaults if omitted.

    Returns:
        A structured prompt string ready to send to an AI test generation tool.
    """
    examples: list[dict[str, Any]] = []
    for kwargs, result in happy_paths:
        examples.append({**kwargs, "result": result})

    prompt = TestPrompt(
        function_name=function_name,
        module_path=module_path,
        signature=signature,
        docstring=docstring,
        examples=examples,
        edge_cases=edge_cases or [],
    )
    return prompt.build()


# Usage example:
# prompt = build_test_generation_prompt(
#     function_name="validate_email_domain",
#     module_path="src.auth.validators",
#     signature="def validate_email_domain(email: str | None, allowed_domains: set[str]) -> bool:",
#     docstring="Check if the domain of an email is in the allowed list.\n\n"
#               "Raises ValueError for invalid email formats.",
#     happy_paths=[
#         ({"email": "user@example.com", "allowed_domains": {"example.com"}}, True),
#         ({"email": "admin@test.org", "allowed_domains": {"test.org"}}, True),
#     ],
#     edge_cases=[
#         "None email input — should raise ValueError or return False",
#         "Empty string email",
#         "Email with no domain part (e.g., '@missing.com')",
#         "Domain in lower case vs mixed case",
#         "Empty allowed_domains set",
#     ],
# )
```

---

## Constraints

### MUST DO

- Always provide context to the AI: file paths, existing patterns, related functions, and the project's coding conventions — never ask for code in a vacuum. (Law 1 of Elegant Defense: structure data flow naturally)
- Write specifications before asking for implementation — describe input/output behavior with concrete examples using the Specification-Pattern-Constrain template from Pattern 1.
- Review every line of AI-generated code as if a human wrote it — AI makes confident mistakes too. Apply all five review gates from Pattern 2 before accepting output. (Law 4 of Elegant Defense: fail fast with descriptive errors)
- Run type checkers, linters, and tests on AI output before accepting changes into the codebase. Never skip verification because "the types look right."
- Use AI to generate test cases first, then implement — this ensures coverage is defined upfront and gives you something concrete to verify against. Apply Pattern 3 for structured test prompts.
- Mark AI-generated code with clear markers (`# Generated by AI - reviewed: YES/NO`) until manually verified. Remove the marker only after all gates pass.
- Include error handling for all expected failure modes: None values, empty inputs, invalid types, network failures. Apply Law 2 (Parse Don't Validate) at boundaries and Law 1 (Early Exit) with guard clauses.

### MUST NOT DO

- Accept AI-generated code that modifies authentication, encryption, or access control without line-by-line manual review — always use `coding-security-review` as a secondary gate for these modules.
- Use AI to generate tests that only verify happy paths — always require edge case and failure mode coverage using the test prompt builder in Pattern 3. A test that only passes on valid input is worthless.
- Paste entire source files into AI prompts — instead, share the specific function signatures, relevant imports, and 2–3 examples of similar functions needed for context. This follows Law 3 (Atomic Predictability): keep data flow bounded and traceable.
- Skip type checking on AI output because "the types look right" — run the checker regardless. Type errors are often silent failures that surface at runtime in production.
- Let AI decide which files to modify — you choose the scope before asking for any code. AI may propose changes to unrelated modules, introducing subtle regressions.
- Use AI-generated documentation without verifying it matches actual implementation behavior. Run `pytest --doctest-modules` or equivalent to verify docstring examples execute correctly.
- Trust AI's assertion that "this is correct" or "I have verified this" without independent verification. LLMs cannot run code and frequently hallucinate confidence about unverified claims.

---

## Output Template

When applying this skill, produce:

1. **Prompt Structure** — The spec-first prompt used, showing context (file paths, existing signatures), specification (desired behavior with examples), constraints (coding rules), and expected output format. Use the `SpecFirstPrompt` builder from Pattern 1.

2. **AI Output Review** — Line-by-line assessment of AI-generated code with pass/fail for each verification gate (type-signatures, spec-coverage, edge-case-handling, error-paths, import-hygiene). Report as: `[PASS] type-signatures`, `[FAIL] error-paths: bare except found at line 14`, etc. Include the `ReviewGateResult` output from Pattern 2.

3. **Test Coverage Analysis** — List of test cases generated by AI plus any manual additions needed for edge cases. For each test, indicate: what scenario it covers, whether it would fail with a simple bug injection, and if it tests only happy path (flag for augmentation).

4. **Verification Results** — Lint (e.g., `ruff check`), type check (e.g., `mypy src/`), and test execution results applied to AI output. Report pass/fail per stage with specific error messages when failures occur.

5. **Risk Assessment** — Classification of the AI-generated code by risk level:
   - **LOW**: Utility functions, data transformations, serialization logic with no external side effects
   - **MEDIUM**: Business logic, API handlers, data validation with internal-only impact
   - **HIGH**: Authentication, encryption, access control, input parsing at trust boundaries — requires line-by-line manual review and `coding-security-review`

---

## Related Skills

| Skill | Purpose |
|---|---|
| `coding-code-quality-policies` | Quality standards that apply to both human-written and AI-generated code; ensures AI output meets project quality bar |
| `coding-testing-strategy` | Testing patterns for verifying AI-generated code meets quality bar; extends Pattern 3 test generation with broader strategy guidance |
| `coding-security-review` | Security review process required before accepting AI output in security-sensitive areas (auth, encryption, input validation) |

---

## Live References

> Authoritative documentation and research for AI-assisted engineering practices. The model follows markdown links at load time to resolve external references.

- [GitHub Copilot Documentation](https://docs.github.com/en/copilot) — Official guidance on using GitHub Copilot for code generation and pair programming
- [Cursor IDE Documentation](https://www.cursor.com/docs) — AI-first editor documentation for workflow integration patterns
- [Claude Code CLI Reference](https://docs.anthropic.com/en/docs/claude-code/overview) — Anthropic's CLI tool for agentic coding workflows
- ["The AI Pair Programmer: A Survey" (2024)](https://arxiv.org/abs/2401.02763) — Academic survey of LLM-assisted development tools and effectiveness research
- [Prompt Engineering Guide](https://www.promptingguide.ai/) — Comprehensive guide to prompt design patterns for code generation tasks
- [Semgrep AI Security Scanning](https://semgrep.dev/docs/migration-guides/ai-code-generation/) — Security scanning best practices for AI-generated code

---

## Spec-First Prompting Framework

This section provides the conceptual foundation for effective AI-assisted engineering. Understanding *why* the workflow is structured the way it helps the model adapt prompts to different domains and tool contexts.

### The Three-Layer Prompt Architecture

Effective AI code generation relies on a layered prompt structure where each layer serves a distinct purpose:

```
┌─────────────────────────────────────────────────────┐
│                    LAYER 1: CONTEXT                  │
│  File path, existing signatures, import patterns     │
│  Related functions, project conventions              │
│                                                      │
│  Purpose: Grounds the AI in the actual codebase      │
│  Without this → AI generates style-inconsistent code │
└─────────────────────┬───────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────┐
│                   LAYER 2: SPECIFICATION              │
│  Input/output examples, edge cases, contracts        │
│  "Given X with input Y, output must be Z"            │
│                                                      │
│  Purpose: Defines correctness criteria the AI can    │
│  check against before producing output               │
└─────────────────────┬───────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────┐
│                   LAYER 3: CONSTRAINTS                │
│  Type signature requirements, error handling rules   │
│  Performance expectations, dependency limits          │
│                                                      │
│  Purpose: Prevents the AI from making assumptions    │
│  that violate project standards or safety requirements │
└─────────────────────────────────────────────────────┘
```

### Why Spec-First Beats Ad-Hoc Prompting

| Approach | Quality | Consistency | Debuggability |
|---|---|---|---|
| Ad-hoc prompt ("write a function that does X") | Low — AI guesses requirements | Low — varies by session, model version | Poor — no baseline for comparison |
| Spec-first (structured prompt) | High — all requirements explicit | High — same spec produces consistent output | Excellent — failures map to specific spec violations |

The key insight from `code-philosophy` Law 3 (Atomic Predictability): when the specification is explicit and structured, you can predict what correct output looks like. This transforms AI-assisted coding from guesswork into a verifiable engineering process.

### Specifying Edge Cases in Prompts

Most AI-generated code fails not on happy paths but on edge cases. Explicitly specifying edge cases in your prompt dramatically improves output quality:

```python
# ❌ BAD: Only specifies happy path in prompt
# "Write a function that parses user input and returns a dict of fields."
# → AI generates code that crashes on None, empty string, or missing keys

# ✅ GOOD: Specifies edge cases explicitly
prompt = build_code_prompt(
    file_path="src/input/parser.py",
    function_name="parse_user_fields",
    docstring="Parse raw input into validated field dict.",
    examples=[
        ({"raw": "name=alice&age=30&role=admin"}, {"name": "alice", "age": 30, "role": "admin"}),
        ({"raw": ""}, {}),                              # Edge: empty string
        ({"raw": None}, ValueError),                    # Edge: None input → error
        ({"raw": "bad_format"}, ValueError),            # Edge: malformed → error
    ],
    constraints=[
        "Return empty dict (not None) for empty or whitespace-only input",
        "Raise ValueError with the offending key name in the message",
        "Strip whitespace from all string values before returning",
    ],
)
```

---

## Managing AI-Generated Code Quality Over Time

As teams accumulate more AI-generated code, systematic quality management becomes essential. This section provides operational guidance for maintaining high standards at scale.

### The AI Code Quality Audit Checklist

Run this audit on any file containing AI-generated code before merging:

1. **Typing Check** — Run `mypy --strict` or equivalent. Every function must have explicit return type annotations and typed parameters where applicable.
2. **Import Audit** — Verify no wildcard imports were introduced. Confirm all imports are necessary (no dead imports from AI copying boilerplate).
3. **Test Coverage Gap Analysis** — Compare the spec's required behaviors against the actual test suite. Any untested requirement is a gap.
4. **Security Scan** — Run `semgrep` or equivalent on any file with I/O, network calls, authentication logic, or user input handling.
5. **Pattern Consistency** — Diff the AI output against 3–4 similar functions in the codebase. Check for: naming convention consistency, error handling style, docstring format, and import ordering.

### The Rejection-and-Iteration Loop

When AI output fails review gates, use this structured iteration pattern rather than regenerating blindly:

```python
def iterate_on_ai_output(
    original_prompt: str,
    ai_output: str,
    gate_results: list[ReviewGateResult],
) -> tuple[str, list[ReviewGateResult]]:
    """Iterate on AI output by feeding failure-specific feedback.
    
    Instead of regenerating the entire function, feed targeted feedback
    about which gates failed and what specific changes are needed.
    This is more efficient than starting from scratch and preserves
    any correctly generated portions of the code.
    
    Returns the refined output and updated gate results.
    """
    failed_gates = [g for g in gate_results if not g.passed]
    
    # Build targeted feedback prompt
    feedback_parts = [
        "The previous AI output was rejected for these specific reasons:",
        *(f"- [{g.gate_name}]: {g.issue}" for g in failed_gates),
        "",
        "Here is the current (rejected) code. Fix ONLY the issues listed above.",
        "Do not rewrite working sections — preserve them as-is.",
        ai_output,
    ]
    
    # In practice, send feedback_parts joined by "\n\n" to your AI tool
    # and re-run the review gates on the new output.
    
    return ai_output, gate_results  # Placeholder: actual implementation calls AI with feedback


# Key principle: each iteration narrows the gap between the spec and the output.
# Most well-specified prompts need only 1–2 iterations before passing all gates.
```

### When AI Output Is "Close But Not Right"

A common frustration is AI code that is 80% correct but fails on subtle points. Instead of regenerating, apply surgical fixes:

```python
# AI output might give you:
def process_data(raw: str) -> dict:  # ✅ Good signature
    """Process raw input data."""     # ✅ Good docstring
    return json.loads(raw)            # ❌ Fails on non-JSON input — no error handling

# Fix pattern: add the missing guard clause, keep everything else
def process_data(raw: str) -> dict:  # Unchanged
    """Process raw input data."""     # Unchanged
    if not raw or not isinstance(raw, str):  # ✅ New: early exit guard (Law 1)
        raise ValueError(f"Expected string input, got {type(raw).__name__}")
    try:
        return json.loads(raw)          # ✅ Preserved: working logic unchanged
    except json.JSONDecodeError as e:   # ✅ New: specific error handling
        raise ValueError(f"Invalid JSON in input: {e}") from e  # ✅ Law 4: fail fast with context
```

This approach saves time (you're not rewriting correct code) and reduces the chance of introducing new bugs during regeneration. The key is isolating exactly *what* failed the gates and targeting only that gap.