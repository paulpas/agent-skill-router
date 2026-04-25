---
name: correctness-verifier
description: '"Verifies code correctness by analyzing syntax, semantics, and type
  consistency" across all code artifacts in the codebase.'
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: agent
  role: verification
  scope: code质量
  output-format: analysis
  triggers: code correctness verifier, code-correctness-verifier, semantics, syntax,
    types, verifies
  related-skills: dynamic-replanner, error-trace-explainer, goal-to-milestones, hot-path-detector
---




# Code Correctness Verifier (Agent Code Quality Assurance)

> **Load this skill** when designing or modifying agent systems that verify code correctness through syntax validation, semantic analysis, type checking, and correctness guarantees for all code artifacts.

## TL;DR Checklist

When verifying code correctness:

- [ ] Parse code into AST or typed structure at boundary
- [ ] Validate syntax correctness before semantic analysis
- [ ] Verify type consistency across all code artifacts
- [ ] Check for undefined references and symbol resolution
- [ ] Validate logic correctness with property-based checks
- [ ] Detect common correctness antipatterns
- [ ] Report violations with actionable fix suggestions
- [ ] Follow the 5 Laws of Elegant Defense from code-philosophy

---

## When to Use

Use the Code Correctness Verifier when:

- Validating code before execution or deployment
- Analyzing code changes for potential bugs
- Checking correctness of generated code from agents
- Implementing code review automation
- Building IDE extensions or linting tools
- Creating quality gates for CI/CD pipelines
- Validating refactoring correctness

---

## When NOT to Use

Avoid using this skill for:

- Stylistic or formatting checks (use linter)
- Performance profiling (use profiler)
- Security vulnerability scanning (use security scanner)
- Documentation quality checks (use docs checker)
- Runtime behavior verification (use test runner)

---

## Core Concepts

### Code Correctness Layers

Correctness verification operates across multiple layers:

```
Code Artifact
├── Syntax Layer     : Parsing, grammar validation
├── Semantic Layer   : Meaning, symbol resolution
├── Type Layer       : Type consistency, compatibility
├── Logic Layer      : Control flow, data flow
└── Property Layer   : Formal properties, invariants
```

### Verification Modes

#### 1. Syntactic Verification

Check if code follows language grammar:

```python
{
    "mode": "syntax",
    "parser": "tree_sitter|esprima|clang",
    "errors": [
        {"type": "unexpected_token", "line": 42, "column": 15}
    ]
}
```

#### 2. Semantic Verification

Check if code makes logical sense:

```python
{
    "mode": "semantic",
    "symbol_table": {...},
    "issues": [
        {"type": "undefined_reference", "name": "undefined_var"}
    ]
}
```

#### 3. Type Verification

Check type consistency:

```python
{
    "mode": "type_check",
    "inferred_types": {...},
    "errors": [
        {"type": "type_mismatch", "expected": "string", "got": "int"}
    ]
}
```

#### 4. Property Verification

Check formal correctness properties:

```python
{
    "mode": "property",
    "properties": ["no_null_ref", "exhaustive_patterns"],
    "violations": []
}
```

---

## Implementation Patterns

### Pattern 1: Multi-Layer Verification Pipeline

Build a layered verification pipeline:

```python
from apex.agents.verification import CodeVerifier
from apex.agents.verification.layers import SyntaxLayer, SemanticLayer, TypeLayer


def verify_code_pipeline(code: str, language: str) -> VerificationResult:
    """Run multi-layer code verification."""
    
    verifier = CodeVerifier()
    
    # Add verification layers
    verifier.add_layer(SyntaxLayer())
    verifier.add_layer(SemanticLayer())
    verifier.add_layer(TypeLayer())
    
    # Run verification
    result = verifier.verify(code, language)
    
    if not result.is_valid:
        return result
    
    # Code passed all verification layers
    return result
```

### Pattern 2: Incremental Verification

Verify only changed code efficiently:

```python
def incremental_verification(
    original_code: str,
    modified_code: str,
    diff: list[DiffChange]
) -> VerificationResult:
    """Verify only the changed parts of code."""
    
    verifier = CodeVerifier()
    
    # Extract changed ranges
    changed_ranges = extract_changed_ranges(diff)
    
    # Run verification on changed sections only
    partial_result = verifier.verify_partial(
        modified_code,
        changed_ranges
    )
    
    # Full verification only if partial passes
    if partial_result.is_valid:
        return verifier.verify(modified_code)
    
    return partial_result
```

### Pattern 3: Property-Based Verification

Verify properties using formal methods:

```python
from apex.agents.verification.properties import (
    Property,
    NoNullReferences,
    ExhaustivePatternMatch,
    NoDeadCode
)


def verify_properties(code: str, properties: list[Property]) -> VerificationResult:
    """Verify code against formal properties."""
    
    results = []
    for property in properties:
        result = property.check(code)
        results.append({
            "property": property.name,
            "passed": result.passed,
            "violations": result.violations
        })
    
    return VerificationResult(
        all_passed=all(r["passed"] for r in results),
        details=results
    )
```

### Pattern 4: Correctness Scoring

Generate a correctness score:

```python
def calculate_correctness_score(
    syntax_errors: int,
    semantic_issues: int,
    type_errors: int,
    property_violations: int
) -> float:
    """Calculate overall correctness score."""
    
    # Weight different error types
    weights = {
        "syntax": 1.0,
        "semantic": 0.8,
        "type": 0.6,
        "property": 0.5
    }
    
    total_penalty = (
        syntax_errors * weights["syntax"] +
        semantic_issues * weights["semantic"] +
        type_errors * weights["type"] +
        property_violations * weights["property"]
    )
    
    max_penalty = 10  # Maximum expected errors
    score = max(0.0, 1.0 - (total_penalty / max_penalty))
    
    return round(score, 3)
```

### Pattern 5: Fix Suggestions

Generate automated fixes for issues:

```python
def generate_fixes(verification_result: VerificationResult) -> list[FixSuggestion]:
    """Generate fix suggestions for verification issues."""
    
    fixes = []
    
    for error in verification_result.errors:
        if error.type == "undefined_reference":
            fixes.append(FixSuggestion(
                type="add_declaration",
                location=error.location,
                replacement=f"let {error.symbol};"
            ))
        
        elif error.type == "type_mismatch":
            fixes.append(FixSuggestion(
                type="add_cast",
                location=error.location,
                replacement=f"({error.expected}){error.value}"
            ))
    
    return fixes
```

---

## Common Patterns

### Pattern 1: Verification Rule Engine

Define verification rules as declarative configuration:

```python
verification_rules = {
    "javascript": [
        {
            "name": "no_implicit_any",
            "enabled": True,
            "severity": "error",
            "pattern": r"function\s+\w+\s*\([^)]*\)\s*{"
        },
        {
            "name": "no_undeclared_vars",
            "enabled": True,
            "severity": "error"
        }
    ],
    "python": [
        {
            "name": "type_annotations_required",
            "enabled": True,
            "severity": "warning"
        }
    ]
}
```

### Pattern 2: Verification State Machine

Track verification state across multiple runs:

```python
class VerificationState:
    def __init__(self):
        self.history: list[VerificationResult] = []
        self.trends: dict[str, list[float]] = {}
    
    def record(self, result: VerificationResult):
        self.history.append(result)
        self._update_trends(result)
    
    def _update_trends(self, result: VerificationResult):
        for error_type, count in result.error_counts.items():
            self.trends[error_type].append(count)
    
    def get_trend(self, error_type: str) -> str:
        if len(self.trends[error_type]) < 2:
            return "unknown"
        
        recent = self.trends[error_type][-2:]
        if recent[1] < recent[0]:
            return "improving"
        elif recent[1] > recent[0]:
            return "declining"
        return "stable"
```

---

## Common Mistakes

### Mistake 1: Over-Reporting Minor Issues

**Wrong:**
```python
# ❌ Reporting style issues as correctness errors
def verify_code(code: str) -> VerificationResult:
    errors = []
    if not code.startswith("#!/usr/bin/env python"):
        errors.append(VerificationError(
            type="missing_shebang",
            severity="error"  # ❌ Shebang not required for correctness
        ))
```

**Correct:**
```python
def verify_code(code: str) -> VerificationResult:
    errors = []
    # ✅ Only report actual correctness issues
    if syntax_error := check_syntax(code):
        errors.append(syntax_error)
    
    if type_error := check_types(code):
        errors.append(type_error)
```

### Mistake 2: Not Handling Partial Code

**Wrong:**
```python
# ❌ Crashes on incomplete code (e.g., during typing)
def verify_syntax(code: str) -> SyntaxResult:
    parser.parse(code)  # Crashes if code is incomplete
```

**Correct:**
```python
def verify_syntax(code: str) -> SyntaxResult:
    try:
        return parser.parse(code)
    except ParseError as e:
        if e.incomplete_input:
            # ✅ Handle gracefully for partial code
            return SyntaxResult(valid=False, errors=[e], is_partial=True)
        raise e
```

### Mistake 3: Ignoring Language Version Compatibility

**Wrong:**
```python
# ❌ Using Python 3.11 features on Python 3.8 code
def verify_python38(code: str):
    parser = PythonParser(version="3.11")  # ❌ Wrong version
```

**Correct:**
```python
def verify_python(code: str, version: str) -> VerificationResult:
    parser = PythonParser(version=version)  # ✅ Matches target version
    return parser.parse(code)
```

### Mistake 4: Not Distinguishing Syntax vs Semantic Errors

**Wrong:**
```python
# ❌ Reporting undefined variable as syntax error
errors.append(VerificationError(
    type="syntax_error",  # ❌ Should be semantic
    message="undefined_var not defined"
))
```

**Correct:**
```python
# ✅ Correct error type
errors.append(VerificationError(
    type="semantic_error",
    subtype="undefined_reference",
    message=f"Variable '{undefined_var}' is not defined"
))
```

### Mistake 5: No Error Prioritization

**Wrong:**
```python
# ❌ No prioritization of errors
for error in all_errors:
    print(error)  # Prints in arbitrary order
```

**Correct:**
```python
# ✅ Prioritize by severity
sorted_errors = sorted(
    all_errors,
    key=lambda e: SEVERITY_ORDER[e.severity]
)

for error in sorted_errors:
    print(f"[{error.severity}] {error.message}")
```

---

## Adherence Checklist

### Code Review

- [ ] **Guard Clauses:** Validation at top of verification functions
- [ ] **Parsed State:** Code parsed before verification logic
- [ ] **Purity:** Verification functions are stateless
- [ ] **Fail Fast:** Invalid code halts with clear errors
- [ ] **Readability:** Verification rules read as English

### Testing

- [ ] Unit tests for each verification layer
- [ ] Integration tests for full code verification
- [ ] Edge case tests for malformed code
- [ ] Performance tests for large codebases
- [ ] Regression tests for false positive detection

### Security

- [ ] Code inputs sanitized before parsing
- [ ] Parser configurations validated
- [ ] Resource limits on verification runs
- [ ] No arbitrary code execution in verification
- [ ] Input length limits enforced

### Performance

- [ ] Verification cached for unchanged code
- [ ] Incremental verification for partial changes
- [ ] Parallel verification for multiple files
- [ ] Memory usage bounded for large files
- [ ] Timeout protection for slow verifiers

---

## References

### Related Skills

| Skill | Purpose |
|-------|---------|
| `agent-diff-quality-analyzer` | Analyze code quality changes |
| `agent-error-trace-explainer` | Explain error traces |
| `agent-stacktrace-root-cause` | Root cause analysis of failures |
| `agent-test-oracle-generator` | Generate test oracles from code |
| `code-philosophy` | Core correctness principles |

### Core Dependencies

- **Parser:** AST/AST generation
- **Type Checker:** Type inference and checking
- **Symbol Table:** Variable and function resolution
- **Rule Engine:** Verification rule execution
- **Reporter:** Error reporting and formatting

### External Resources

- [AST Handbook](https://example.com/ast-handbook) - Abstract Syntax Trees
- [Type System Principles](https://example.com/type-systems) - Type theory
- [Compiler Design](https://example.com/compiler-book) - Compilation phases
- [Formal Verification](https://example.com/formal-methods) - Property checking

---

## Implementation Tracking

### Agent Code Correctness Verifier - Core Patterns

| Task | Status |
|------|--------|
| Syntax verification layer | ✅ Complete |
| Semantic verification layer | ✅ Complete |
| Type verification layer | ✅ Complete |
| Property verification layer | ✅ Complete |
| Fix suggestion generation | ✅ Complete |
| Incremental verification | ✅ Complete |
| Correctness scoring | ✅ Complete |

---

## Version History

### 1.0.0 (Initial)
- Multi-layer verification pipeline
- Syntax and semantic verification
- Type checking integration
- Property-based verification
- Fix suggestion generation

### 1.1.0 (Planned)
- Incremental verification optimization
- Language version compatibility
- Performance profiling
- Custom rule definitions

### 2.0.0 (Future)
- Formal method integration
- Machine learning-based bug prediction
- Cross-language verification
- Interactive fix suggestions

---

## Implementation Prompt (Execution Layer)

When implementing the Code Correctness Verifier, use this prompt for code generation:

```
Create a Code Correctness Verifier implementation following these requirements:

1. Core Class: `CodeVerifier`
   - Implement multi-layer verification pipeline
   - Parse code into AST at boundary
   - Run syntax, semantic, type, and property verification
   - Generate fix suggestions for issues

2. Verification Layers:
   - `SyntaxLayer`: Grammar validation using parser
   - `SemanticLayer`: Symbol resolution and meaning
   - `TypeLayer`: Type consistency checking
   - `PropertyLayer`: Formal property validation

3. Key Methods:
   - `verify(code, language)`: Full verification pipeline
   - `verify_partial(code, ranges)`: Incremental verification
   - `generate_fixes(result)`: Fix suggestions
   - `calculate_score(result)`: Correctness score

4. Error Types:
   - `syntax_error`: Parsing errors
   - `semantic_error`: Undefined references, unreachable code
   - `type_error`: Type mismatches, incompatible assignments
   - `property_error`: Property violations

5. Configuration Options:
   - `layers`: Enabled verification layers
   - `severity_threshold`: Minimum severity to report
   - `language_version`: Target language version
   - `max_errors`: Maximum errors to report

6. Output Structure:
   - `is_valid`: Whether code passes all checks
   - `errors`: List of verification errors
   - `fixes`: Suggested fixes
   - `score`: Correctness score (0.0 to 1.0)

7. Performance Features:
   - AST caching for unchanged code
   - Incremental verification support
   - Parallel file verification
   - Resource limits enforcement

8. Language Support:
   - Python (pylint, mypy, AST)
   - JavaScript (ESLint, TypeScript)
   - Java (JLS, Checker Framework)
   - Custom language plugins

Follow the 5 Laws of Elegant Defense:
- Guard clauses for validation
- Parse code at boundary
- Pure verification functions
- Fail fast on invalid code
- Clear names for all components
```
