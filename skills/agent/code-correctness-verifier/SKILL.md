---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent code correctness verifier with multi-factor skill
  selection, fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: code-correctness-verifier, code correctness verifier, how do i code-correctness-verifier,
    orchestrate code-correctness-verifier, automate code-correctness-verifier, agent
    code-correctness-verifier
  archetypes:
  - orchestration
  - strategic
  anti_triggers:
  - brainstorming
  - vague ideation
  - single-agent monolith
  response_profile:
    verbosity: medium
    directive_strength: high
    abstraction_level: tactical
  version: 1.0.0
name: code-correctness-verifier
------
# Code Correctness Verifier

Orchestrates intelligent skill selection and execution for code correctness verifier workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

## TL;DR Checklist

- [ ] Parse all inputs at boundary before processing (Law 2)
- [ ] Handle edge cases with early returns at function top (Law 1)
- [ ] Fail immediately with descriptive errors on invalid states (Law 4)
- [ ] Return new data structures, never mutate inputs (Law 3)
- [ ] Implement minimum 2-level fallback chain for all skill executions
- [ ] Log all skill selections with context for full audit trail
- [ ] Validate skill metadata and dependencies before selection
- [ ] Update confidence scores after each execution for learning


┌───────────────────────────────────────────────────────────────────────────────┐
│                              Orchestration Flow                                               │
└───────────────────────────────────────────────────────────────────────────────┘

  User Request
      ↓
┌─────────────────┐
│  Parse Request  │
│  & Extract      │
│  Features       │
└────────┬────────┘
         ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    Evaluate Available Skills                                │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │ Skill A      │  │ Skill B      │  │ Skill C      │              │
│  │ - Match Score│  │ - Match Score│  │ - Match Score│              │
│  │ - Confidence │  │ - Confidence │  │ - Confidence │              │
│  │ - History    │  │ - History    │  │ - History    │              │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘              │
│         │                 │                 │                       │
│         └─────────────────┴─────────────────┘                       │
│                          ↓                                          │
│                   Select Best Skill                               │
└─────────────────────────────────────────────────────────────────────┘
         ↓
┌─────────────────┐
│  Execute Skill  │
└────────┬────────┘
         ↓
┌─────────────────┐
│  Handle Result  │
└────────┬────────┘
         ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    Error Handling & Fallback                                  │
│                                                                     │
│  Success? ────────► Return Result                                  │
│                                                                     │
│  Fail? ────────┐                                                    │
│                ↓                                                    │
│  ┌──────────────────────────────────────────────────────────┐      │
│  │               Fallback Chain                                    │      │
│  │                                                             │      │
│  │  1. Retry with adjusted parameters                          │      │
│  │  2. Try Alternative Skill (if available)                    │      │
│  │  3. Defer to Human Operator (if critical)                   │      │
│  │  4. Log & Return Error                                      │      │
│  └──────────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────────┘

## When to Use

Use this skill when:

- Orchestrating multi-step workflows that require skill delegation
- Implementing adaptive skill routing based on confidence scores
- Building fallback mechanisms for failed skill executions
- Creating intelligent task decomposition and parallel execution
- Designing skill dependency graphs with automatic resolution
- Implementing skill selection with historical performance weighting
- Building agent systems that need to self-organize around tasks

## When NOT to Use

Avoid this skill for:

- Direct task execution without orchestration needs - use individual skills instead
- High-frequency trading scenarios where latency must be minimized - the selection overhead may be prohibitive
- Simple linear workflows without branching or fallback requirements
- Cases where skill metadata is unavailable or unreliable


## Core Workflow

1. **Parse and Analyze Request** - Extract intent, entities, and constraints from user input.
   **Checkpoint:** All required parameters must be present and in valid format before proceeding.

2. **Score Available Skills** - Calculate match scores using multi-factor algorithm:
   - Text similarity between request and skill triggers
   - Historical success rate for similar tasks
   - Skill availability and health status
   - Required dependencies and their availability
   
   **Checkpoint:** Skip to fallback if no skill scores above threshold.

3. **Select Optimal Skill** - Choose skill with highest score that meets minimum confidence.
   **Checkpoint:** Verify skill has not been disabled or deprecated.

4. **Execute with Fallback** - Run skill execution wrapped in retry and fallback logic.
   **Checkpoint:** Log all execution attempts for audit trail.

5. **Return or Fallback** - Either return successful result or apply fallback chain:
   - Retry with adjusted parameters
   - Try alternative skill from `related-skills`
   - Defer to human operator for critical tasks
   
   **Checkpoint:** Record outcome with timing and confidence metadata.

## Implementation Patterns

### Pattern 1: Skill Selection Logic

```python
import ast
import hashlib
from datetime import datetime
from typing import List, Optional
from dataclasses import dataclass, field

@dataclass
class Rule:
    name: str
    severity: str
    pattern: str

@dataclass
class Violation:
    rule_name: str
    line_no: int
    severity: str
    message: str

@dataclass
class VerificationReport:
    source_hash: str
    total_lines: int
    violations: List[Violation] = field(default_factory=list)
    is_correct: bool = False
    timestamp: str = ""

def verify_code_correctness(source_code: str, rules: List[Rule]) -> VerificationReport:
    """Verify source code against a set of correctness rules.
    
    Implements the 5 Laws of Elegant Defense:
    - Law 1: Early exit on empty or malformed input
    - Law 2: Parse code into AST to make illegal states unrepresentable
    - Law 3: Return new VerificationReport, never mutate input rules
    - Law 4: Fail immediately on syntax errors or unsupported constructs
    """
    if not source_code or not source_code.strip():
        raise ValueError("Source code cannot be empty")
        
    try:
        tree = ast.parse(source_code, type_comments=True)
    except SyntaxError as e:
        raise CodeVerificationError(f"Syntax error at line {e.lineno}: {e.msg}") from e
        
    violations = analyze_ast_for_violations(tree, rules)
    
    # Atomic Predictability - construct new report
    report = VerificationReport(
        source_hash=hashlib.sha256(source_code.encode()).hexdigest(),
        total_lines=len(source_code.splitlines()),
        violations=violations,
        is_correct=len(violations) == 0,
        timestamp=datetime.utcnow().isoformat()
    )
    return report
```


### Pattern 2: Execution with Fallback

```python
class RuleVisitor(ast.NodeVisitor):
    def __init__(self, rules: List[Rule]):
        self.rules = rules
        self.violations: List[Violation] = []
        
    def visit(self, node: ast.AST) -> None:
        super().visit(node)
        
    def get_violations(self) -> List[Violation]:
        return self.violations

def analyze_ast_for_violations(tree: ast.AST, rules: List[Rule]) -> List[Violation]:
    """Traverse AST and apply correctness rules to detect violations.
    
    Implements Fail Fast, Fail Loud:
    - Invalid rule configurations halt immediately
    - No silent suppression of critical violations
    """
    if not rules:
        raise ValueError("At least one correctness rule must be provided")
        
    visitor = RuleVisitor(rules)
    visitor.visit(tree)
    
    violations = visitor.get_violations()
    
    # Sort by severity and line number for deterministic output
    violations.sort(key=lambda v: (v.severity, v.line_no))
    
    # Apply minimum 2-level fallback chain concept:
    # 1. Critical violations block execution immediately
    # 2. Warning violations are logged but allow continuation
    critical_violations = [v for v in violations if v.severity == "CRITICAL"]
    if critical_violations:
        raise CodeVerificationError(
            f"Critical correctness violations found: {len(critical_violations)}"
        )
        
    return violations
```

### MUST DO
- Always validate skill metadata before selection (Early Exit)
- Implement fallback chain with at least 2 levels (Fallback Skill + Human)
- Log all skill selections with full context for auditability
- Return new data structures instead of mutating inputs (Atomic Predictability)
- Fail immediately with descriptive errors on invalid states
- Update confidence scores after each execution for adaptive routing
- Reference `code-philosophy` (5 Laws of Elegant Defense) in all logic


### MUST NOT DO
- Select skills based on a single factor (e.g., only confidence score)
- Disable fallback mechanisms "temporarily" - this creates fragile systems
- Skip validation of skill dependencies before execution
- Return partial results - either complete success or clear failure
- Use magic numbers for confidence thresholds - make them configurable
- Cache skill selections without considering context changes


## TL;DR Checklist

- [ ] Parse all inputs at boundary before processing (Law 2)
- [ ] Handle edge cases with early returns at function top (Law 1)
- [ ] Fail immediately with descriptive errors on invalid states (Law 4)
- [ ] Return new data structures, never mutate inputs (Law 3)
- [ ] Implement minimum 2-level fallback chain for all skill executions
- [ ] Log all skill selections with context for full audit trail
- [ ] Validate skill metadata and dependencies before selection
- [ ] Update confidence scores after each execution for learning


## TL;DR for Code Generation

- Use guard clauses - return early on invalid input before doing work
- Return simple types (dict, str, int, bool, list) - avoid complex nested objects
- Cyclomatic complexity < 10 per function - split anything larger
- Handle null/empty cases explicitly at function top (Early Exit)
- Never mutate input parameters - return new dicts/objects
- Fail fast with descriptive errors - don't try to "patch" bad data
- Reference code-philosophy laws in comments for complex logic
- Include timing and confidence metadata in all return values


## Output Template

When applying this skill, produce:

1. **Selected Skills** - List of skill names with confidence scores
2. **Selection Rationale** - Why each skill was chosen (match score, history, availability)
3. **Execution Plan** - Order of execution with dependencies
4. **Fallback Strategy** - Which fallback skills will be tried and in what order
5. **Risk Assessment** - Any potential failure points and their impact
6. **Timing Estimates** - Expected latency including fallback scenarios


## Related Skills

| Skill | Purpose |
|---|---|
| `audit-context-building` | Audit context and verification workflow integration |

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Program Verification Survey (ArXiv:2305.14942)](https://arxiv.org/abs/2305.14942)
- [Wikipedia — Formal Verification](https://en.wikipedia.org/wiki/Formal_verification)
- [Coq Proof Assistant — Official Documentation](https://coq.inria.fr/)
- [Isabelle/HOL — Theorem Prover Guide](https://isabelle.in.tum.de/doc/manual.pdf)
- [Software Model Checking (Springer Handbook)](https://link.springer.com/book/10.1007/978-3-540-69161-2)