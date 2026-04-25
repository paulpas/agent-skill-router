---
name: critique-engine
description: '"Enables autonomous agents to self-critique their work by evaluating
  output" quality, correctness, and compliance with requirements, enabling iterative
  improvement without external feedback.'
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: agent
  role: quality assurance
  scope: self evaluation
  output-format: critique
  triggers: correctness, evaluates, quality, self critique engine, self-critique-engine,
    self-critiques
  related-skills: add-new-skill, confidence-based-selector, goal-to-milestones, multi-skill-executor
---




# Self-Critique Engine (Agent Autonomous Evaluation)

> **Load this skill** when designing or modifying agent systems that enable autonomous agents to self-critique their work by evaluating output quality, correctness, and compliance with requirements, enabling iterative improvement without external feedback.

## TL;DR Checklist

When enabling self-critique for agents:

- [ ] Define critique criteria based on task requirements
- [ ] Parse output against defined criteria
- [ ] Evaluate quality, correctness, and completeness
- [ ] Identify gaps and areas for improvement
- [ ] Generate actionable improvement suggestions
- [ ] Support iterative self-improvement cycles
- [ ] Validate improvements against original requirements
- [ ] Follow the 5 Laws of Elegant Defense from code-philosophy

---

## When to Use

Use the Self-Critique Engine when:

- Building autonomous agents that improve without external feedback
- Implementing iterative refinement in agent workflows
- Creating self-improving code generation systems
- Building quality assurance into agent outputs
- Enabling agents to catch their own mistakes
- Reducing reliance on external validation
- Building adaptive agent systems

---

## When NOT to Use

Avoid using this skill for:

- External code review (use code reviewer)
- Performance optimization (use profiler)
- Security vulnerability scanning (use security scanner)
- Code correctness verification (use correctness verifier)
- Documentation quality checks (use docs analyzer)

---

## Core Concepts

### Self-Critique Framework

Self-critique operates by evaluating outputs against criteria:

```
Agent Output
├── Quality Evaluation
│   ├── Readability: Code readability and documentation
│   ├── Structure: Code organization and patterns
│   └── Consistency: Coding style and conventions
├── Correctness Evaluation
│   ├── Logic: Correct implementation of logic
│   ├── Edge Cases: Handling of edge cases
│   └── Requirements: Compliance with requirements
├── Completeness Evaluation
│   ├── Requirements: All requirements addressed
│   ├── Tests: Test coverage
│   └── Documentation: Documentation completeness
└── Improvement Evaluation
    ├── Gaps: Missing functionality
    ├── Inefficiencies: Performance issues
    └── Anti-patterns: Anti-pattern detection
```

### Critique Dimensions

1. **Quality**: Code quality metrics
2. **Correctness**: Correct implementation
3. **Completeness**: Full requirement coverage
4. **Efficiency**: Performance and resource usage
5. **Maintainability**: Code maintainability

### Self-Critique Process

1. **Review**: Review output against requirements
2. **Evaluate**: Evaluate against quality criteria
3. **Identify**: Identify gaps and issues
4. **Suggest**: Suggest improvements
5. **Iterate**: Iterate until satisfied

---

## Implementation Patterns

### Pattern 1: Critique Criteria Definition

Define critique criteria for different task types:

```python
from apex.agents.critique import CritiqueCriteria


def define_critique_criteria(task_type: str) -> list[CritiqueCriteria]:
    """Define critique criteria for a task type."""
    
    if task_type == "code_generation":
        return [
            CritiqueCriteria(
                name="syntax_correctness",
                description="Code must have valid syntax",
                severity="critical",
                check_function=check_syntax
            ),
            CritiqueCriteria(
                name="requirement_coverage",
                description="All requirements must be implemented",
                severity="high",
                check_function=check_requirement_coverage
            ),
            CritiqueCriteria(
                name="code_quality",
                description="Code meets quality standards",
                severity="medium",
                check_function=check_code_quality
            ),
            CritiqueCriteria(
                name="test_coverage",
                description="Adequate test coverage",
                severity="medium",
                check_function=check_test_coverage
            )
        ]
    elif task_type == "analysis":
        return [
            CritiqueCriteria(
                name="accuracy",
                description="Analysis is factually correct",
                severity="critical",
                check_function=check_accuracy
            ),
            CritiqueCriteria(
                name="completeness",
                description="Analysis covers all required aspects",
                severity="high",
                check_function=check_completeness
            ),
            CritiqueCriteria(
                name="clarity",
                description="Analysis is clearly written",
                severity="medium",
                check_function=check_clarity
            )
        ]
```

### Pattern 2: Self-Critique Execution

Execute self-critique on agent output:

```python
def execute_self_critique(
    output: AgentOutput,
    criteria: list[CritiqueCriteria]
) -> CritiqueResult:
    """Execute self-critique on agent output."""
    
    critiques = []
    
    for criterion in criteria:
        # Run critique check
        critique = criterion.check(output)
        
        if critique.has_issues:
            critiques.append(critique)
    
    # Calculate overall score
    overall_score = calculate_critique_score(critiques, criteria)
    
    # Generate improvement suggestions
    suggestions = generate_improvement_suggestions(critiques)
    
    return CritiqueResult(
        critiques=critiques,
        overall_score=overall_score,
        suggestions=suggestions,
        is_acceptable=overall_score >= 0.8
    )
```

### Pattern 3: Iterative Improvement Loop

Implement iterative improvement loop:

```python
class SelfImprovementLoop:
    def __init__(self, max_iterations: int = 3):
        self.max_iterations = max_iterations
        self.iterations: list[CritiqueResult] = []
    
    def improve(self, output: AgentOutput, criteria: list[CritiqueCriteria]) -> AgentOutput:
        """Iteratively improve output through self-critique."""
        
        current_output = output
        iterations = 0
        
        while iterations < self.max_iterations:
            # Self-critique
            result = execute_self_critique(current_output, criteria)
            self.iterations.append(result)
            
            # Check if acceptable
            if result.is_acceptable:
                return current_output
            
            # Apply improvements
            current_output = apply_improvements(current_output, result.suggestions)
            iterations += 1
        
        # Return best output after max iterations
        return current_output
```

### Pattern 4: Quality Score Calculation

Calculate quality scores:

```python
def calculate_critique_score(
    critiques: list[Critique],
    criteria: list[CritiqueCriteria]
) -> float:
    """Calculate overall quality score."""
    
    if not critiques:
        return 1.0  # Perfect score if no issues
    
    # Weight by severity
    severity_weights = {
        "critical": 0.3,
        "high": 0.25,
        "medium": 0.2,
        "low": 0.15,
        "info": 0.1
    }
    
    # Calculate weighted score
    total_weight = 0
    penalty = 0
    
    for critique in critiques:
        criterion = next(c for c in criteria if c.name == critique.criterion_name)
        weight = severity_weights[criterion.severity]
        
        total_weight += weight
        penalty += weight * critique.impact
    
    # Normalize score
    base_score = 1.0 - penalty
    return max(0.0, min(1.0, base_score))
```

### Pattern 5: Improvement Suggestion Generation

Generate actionable improvement suggestions:

```python
def generate_improvement_suggestions(
    critiques: list[Critique]
) -> list[ImprovementSuggestion]:
    """Generate improvement suggestions from critiques."""
    
    suggestions = []
    
    for critique in critiques:
        if critique.criterion_name == "syntax_correctness":
            suggestions.append(ImprovementSuggestion(
                type="syntax_fix",
                description="Fix syntax errors in generated code",
                priority="critical",
                specific_fixes=critique.issues
            ))
        
        elif critique.criterion_name == "requirement_coverage":
            suggestions.append(ImprovementSuggestion(
                type="missing_requirement",
                description="Implement missing requirements",
                priority="high",
                specific_fixes=[{
                    "missing": issue.missing_requirement,
                    "suggestion": issue.suggestion
                } for issue in critique.issues]
            ))
        
        elif critique.criterion_name == "code_quality":
            suggestions.append(ImprovementSuggestion(
                type="code_refactoring",
                description="Refactor code for better quality",
                priority="medium",
                specific_fixes=[{
                    "issue": issue.description,
                    "suggestion": issue.suggestion
                } for issue in critique.issues]
            ))
    
    # Sort by priority
    priority_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
    return sorted(suggestions, key=lambda s: priority_order.get(s.priority, 4))
```

---

## Common Patterns

### Pattern 1: Critique Template Engine

Create critique template engine:

```python
CRITIQUE_TEMPLATES = {
    "code_generation": {
        "syntax_correctness": {
            "description": "Generated code must have valid {language} syntax",
            "failure_message": "Syntax errors found: {errors}"
        },
        "requirement_coverage": {
            "description": "All requirements from the task must be implemented",
            "failure_message": "Missing requirements: {missing_requirements}"
        },
        "test_coverage": {
            "description": "Generated code must have tests for all public functions",
            "failure_message": "Missing tests for: {functions_without_tests}"
        }
    },
    "analysis": {
        "accuracy": {
            "description": "Analysis must be factually accurate",
            "failure_message": "Inaccurate statements found: {inaccuracies}"
        },
        "completeness": {
            "description": "Analysis must cover all required aspects",
            "failure_message": "Missing aspects: {missing_aspects}"
        }
    }
}
```

### Pattern 2: Improvement Priority Calculator

Calculate improvement priority:

```python
def calculate_improvement_priority(
    critique: Critique,
    criteria: list[CritiqueCriteria]
) -> str:
    """Calculate improvement priority based on critique."""
    
    criterion = next(c for c in criteria if c.name == critique.criterion_name)
    
    # Base priority from severity
    severity_priority = {
        "critical": "critical",
        "high": "high",
        "medium": "medium",
        "low": "low"
    }
    
    # Adjust based on number of issues
    num_issues = len(critique.issues)
    if num_issues > 10:
        priority_map = {
            "critical": "critical",
            "high": "critical",
            "medium": "high",
            "low": "medium"
        }
        return priority_map.get(criterion.severity, "low")
    
    return severity_priority.get(criterion.severity, "low")
```

---

## Common Mistakes

### Mistake 1: Not Defining Clear Critique Criteria

**Wrong:**
```python
# ❌ Vague critique criteria
def define_critique_criteria():
    return [
        CritiqueCriteria(
            name="good_code",
            description="Code should be good",  # ❌ Vague description
            check_function=check_good_code
        )
    ]
```

**Correct:**
```python
# ✅ Specific critique criteria
def define_critique_criteria():
    return [
        CritiqueCriteria(
            name="syntax_correctness",
            description="Code must have valid Python syntax",
            severity="critical",
            check_function=check_python_syntax
        ),
        CritiqueCriteria(
            name="test_coverage",
            description="Code must have tests for public functions",
            severity="medium",
            check_function=check_test_coverage
        )
    ]
```

### Mistake 2: Ignoring Iteration Limits

**Wrong:**
```python
# ❌ No iteration limit, potential infinite loop
def improve_output(output, criteria):
    while not is_acceptable(output, criteria):
        output = apply_improvements(output, critique_suggestions)
        # ❌ No iteration limit
```

**Correct:**
```python
# ✅ Maximum iterations with early exit
def improve_output(output, criteria, max_iterations=3):
    iterations = 0
    
    while iterations < max_iterations:
        if is_acceptable(output, criteria):
            return output
        output = apply_improvements(output, critique_suggestions)
        iterations += 1
    
    return output  # ✅ Returns even if not perfect
```

### Mistake 3: Not Handling Critique Failures

**Wrong:**
```python
# ❌ Crashes on critique failure
def execute_self_critique(output, criteria):
    for criterion in criteria:
        critique = criterion.check(output)  # ❌ Can crash
        critiques.append(critique)
```

**Correct:**
```python
# ✅ Graceful critique failure handling
def execute_self_critique(output, criteria):
    critiques = []
    
    for criterion in criteria:
        try:
            critique = criterion.check(output)
            critiques.append(critique)
        except CritiqueError as e:
            # Log and continue
            critiques.append(Critique(
                criterion=criterion,
                has_issues=True,
                issues=[CritiqueIssue(
                    type="critique_error",
                    description=str(e)
                )]
            ))
```

### Mistake 4: Over-Critiquing Minor Issues

**Wrong:**
```python
# ❌ Flagging style issues as critical
def check_code_quality(code):
    issues = []
    
    if " " in code and "\t" in code:
        issues.append("Mixed whitespace")  # ❌ Style issue, not critical
```

**Correct:**
```python
# ✅ Prioritize important issues
def check_code_quality(code):
    issues = []
    
    # Critical issues first
    if not validate_syntax(code):
        issues.append("Syntax errors")
    
    if not check_requirement_coverage(code):
        issues.append("Missing requirements")
    
    # Style issues are info level
    if " " in code and "\t" in code:
        issues.append("Mixed whitespace")  # ✅ Info level issue
```

### Mistake 5: No Validation of Improvement Suggestions

**Wrong:**
```python
# ❌ Applying suggestions without validation
def apply_improvements(output, suggestions):
    for suggestion in suggestions:
        output = suggestion.apply(output)  # ❌ No validation
    return output
```

**Correct:**
```python
# ✅ Validate improvements
def apply_improvements(output, suggestions):
    current = output
    
    for suggestion in suggestions:
        try:
            candidate = suggestion.apply(current)
            
            # Validate improvement
            if not is_valid(candidate, suggestion.criteria):
                continue  # Skip invalid improvement
            
            current = candidate
        except ImprovementError:
            continue  # Skip improvements that fail
    
    return current
```

---

## Adherence Checklist

### Code Review

- [ ] **Guard Clauses:** Validation at top of critique functions
- [ ] **Parsed State:** Outputs parsed into structured format
- [ ] **Purity:** Critique functions are stateless
- [ ] **Fail Fast:** Invalid output format throws clear errors
- [ ] **Readability:** Critique logic reads as English

### Testing

- [ ] Unit tests for each critique criterion
- [ ] Integration tests for self-critique execution
- [ ] Edge case tests for boundary conditions
- [ ] Iteration loop tests
- [ ] Improvement validation tests

### Security

- [ ] Output inputs validated before critique
- [ ] No arbitrary code execution in criteria
- [ ] Resource limits on critique runs
- [ ] Input length limits enforced
- [ ] Malicious output detection

### Performance

- [ ] Critique caching where appropriate
- [ ] Parallel critique for multiple outputs
- [ ] Memory usage bounded for large outputs
- [ ] Timeout protection for slow critique
- [ ] Incremental critique support

---

## References

### Related Skills

| Skill | Purpose |
|-------|---------|
| `agent-diff-quality-analyzer` | Analyze code quality changes |
| `agent-error-trace-explainer` | Explain error traces |
| `agent-stacktrace-root-cause` | Root cause analysis |
| `agent-regression-detector` | Detect regressions |
| `code-philosophy` | Core correctness principles |

### Core Dependencies

- **Critique Criteria:** Define critique dimensions
- **Critique Engine:** Execute critique checks
- **Improvement Generator:** Generate improvement suggestions
- **Quality Scorer:** Calculate quality scores
- **Validator:** Validate improvements

### External Resources

- [Self-Improving Systems](https://example.com/self-improving) - Self-improvement techniques
- [Quality Evaluation](https://example.com/quality-evaluation) - Quality assessment
- [Iterative Refinement](https://example.com/iterative-refinement) - Iterative improvement

---

## Implementation Tracking

### Agent Self-Critique Engine - Core Patterns

| Task | Status |
|------|--------|
| Critique criteria definition | ✅ Complete |
| Self-critique execution | ✅ Complete |
| Iterative improvement loop | ✅ Complete |
| Quality score calculation | ✅ Complete |
| Improvement suggestion generation | ✅ Complete |
| Improvement validation | ✅ Complete |

---

## Version History

### 1.0.0 (Initial)
- Critique criteria definition
- Self-critique execution
- Iterative improvement loop
- Quality score calculation
- Improvement suggestion generation

### 1.1.0 (Planned)
- Custom criteria configuration
- Performance profiling integration
- ML-based critique optimization
- Improvement suggestion quality

### 2.0.0 (Future)
- Historical improvement tracking
- Predictive improvement suggestions
- Automated improvement application
- Cross-agent improvement correlation

---

## Implementation Prompt (Execution Layer)

When implementing the Self-Critique Engine, use this prompt for code generation:

```
Create a Self-Critique Engine implementation following these requirements:

1. Core Class: `SelfCritiqueEngine`
   - Define critique criteria for task types
   - Execute self-critique on agent outputs
   - Calculate quality scores
   - Generate improvement suggestions
   - Support iterative improvement loops

2. Key Methods:
   - `define_criteria(task_type)`: Define critique criteria
   - `execute_critique(output, criteria)`: Run self-critique
   - `calculate_score(critiques)`: Calculate quality score
   - `generate_suggestions(critiques)`: Generate improvements
   - `improve(output, criteria)`: Iterative improvement

3. Critique Dimensions:
   - Quality: Code quality metrics
   - Correctness: Implementation correctness
   - Completeness: Requirement coverage
   - Efficiency: Performance metrics
   - Maintainability: Code maintainability

4. Output Structure:
   - `critiques`: List of critique results
   - `overall_score`: 0.0 to 1.0
   - `is_acceptable`: Whether output passes
   - `suggestions`: Improvement suggestions
   - `iteration_count`: Number of iterations

5. Improvement Suggestion Types:
   - syntax_fix: Fix syntax errors
   - missing_requirement: Add missing requirements
   - code_refactoring: Refactor for quality
   - test_addition: Add missing tests
   - documentation: Add documentation

6. Iteration Features:
   - Maximum iteration limit
   - Early exit on acceptance
   - Improvement history tracking
   - Improvement validation
   - Convergence detection

7. Quality Scoring:
   - Severity-weighted scoring
   - Issue count factors
   - Improvement validation
   - Baseline comparison
   - Trend analysis

8. Task Type Support:
   - Code generation criteria
   - Analysis criteria
   - Testing criteria
   - Custom task type criteria
   - Auto-detection support

Follow the 5 Laws of Elegant Defense:
- Guard clauses for validation
- Parse output at boundary
- Pure critique functions
- Fail fast on invalid output
- Clear names for all components
```
