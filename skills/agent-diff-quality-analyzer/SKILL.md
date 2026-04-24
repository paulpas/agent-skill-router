---
name: agent-diff-quality-analyzer
description: Analyzes code quality changes in diffs by evaluating syntactic, semantic,
  and architectural impact of modifications.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: agent
  role: analysis
  scope: code quality
  output-format: analysis
  triggers: analyzes, code quality, diff quality analyzer, diff-quality-analyzer, diffs, linting, code standards
  related-skills: agent-add-new-skill, agent-autoscaling-advisor, agent-ci-cd-pipeline-analyzer, agent-confidence-based-selector, agent-container-inspector
---




# Diff Quality Analyzer (Agent Code Change Assessment)

> **Load this skill** when designing or modifying agent systems that analyze code quality changes in diffs, assessing the impact of modifications on code quality, maintainability, and correctness.

## TL;DR Checklist

When analyzing diff quality:

- [ ] Parse diff format into structured representation
- [ ] Identify change categories (add, remove, modify, refactor)
- [ ] Evaluate quality metrics per change
- [ ] Detect quality regressions and improvements
- [ ] Generate actionable quality suggestions
- [ ] Maintain quality baseline for comparison
- [ ] Support multi-file and cross-file diff analysis
- [ ] Follow the 5 Laws of Elegant Defense from code-philosophy

---

## When to Use

Use the Diff Quality Analyzer when:

- Reviewing pull requests for quality impact
- Analyzing agent-generated code changes
- Enforcing quality gates on code modifications
- Building automated code review systems
- Tracking quality trends over time
- Assessing refactoring impact
- Validating code generation quality

---

## When NOT to Use

Avoid using this skill for:

- Syntax validation (use code correctness verifier)
- Performance profiling (use profiler)
- Security vulnerability scanning (use security scanner)
- Documentation updates (use docs analyzer)
- Full codebase analysis (use static analyzer)

---

## Core Concepts

### Diff Quality Dimensions

Quality analysis operates across multiple dimensions:

```
Diff
├── Additions (Lines Added)
│   ├── Code Quality: Readability, complexity
│   └── Test Coverage: New tests added
├── Deletions (Lines Removed)
│   ├── Dead Code: Unused functions, variables
│   └── Test Coverage: Tests removed
├── Modifications (Lines Changed)
│   ├── Complexity Change: Added complexity
│   └── Breaking Changes: API changes
└── Context Changes (Surrounding code)
    ├── Architecture Impact: Cross-cutting concerns
    └── Dependency Changes: Module dependencies
```

### Quality Change Types

#### 1. Positive Changes (Improvements)

```python
{
    "type": "quality_improvement",
    "category": "readability",
    "impact": "positive",
    "metrics": {
        "complexity_reduction": 2.5,
        "test_coverage_increase": 0.15
    }
}
```

#### 2. Neutral Changes (Refactoring)

```python
{
    "type": "refactoring",
    "category": "code_reorganization",
    "impact": "neutral",
    "metrics": {
        "lines_changed": 150,
        "no_functional_change": True
    }
}
```

#### 3. Negative Changes (Regressions)

```python
{
    "type": "quality_regression",
    "category": "complexity",
    "impact": "negative",
    "severity": "high",
    "metrics": {
        "complexity_increase": 5.0,
        "test_coverage_decrease": 0.05
    }
}
```

### Quality Metrics Categories

#### Metric Types

1. **Complexity Metrics**: Cyclomatic complexity, cognitive load
2. **Coverage Metrics**: Test coverage, branch coverage
3. **Readability Metrics**: Cyclomatic complexity, variable naming
4. **Maintainability Metrics**: Duplication, coupling
5. **Architecture Metrics**: Dependency changes, module boundaries

---

## Implementation Patterns

### Pattern 1: Diff Parsing and Analysis Pipeline

Parse and analyze diffs systematically:

```python
from apex.agents.diff import DiffParser, DiffAnalyzer
from apex.agents.diff.models import DiffChunk, ChangeType


def analyze_diff(diff_text: str, language: str) -> DiffAnalysisResult:
    """Parse and analyze a diff for quality changes."""
    
    # Parse diff into structured format
    parser = DiffParser()
    diff = parser.parse(diff_text, language)
    
    # Analyze each file in the diff
    analyzer = DiffAnalyzer()
    results = []
    
    for file_change in diff.file_changes:
        result = analyzer.analyze_file_change(
            file_change,
            language
        )
        results.append(result)
    
    return DiffAnalysisResult(
        files=results,
        summary=calculate_summary(results)
    )
```

### Pattern 2: Complexity Change Detection

Detect complexity changes in code:

```python
def analyze_complexity_change(
    before: str,
    after: str,
    language: str
) -> ComplexityChange:
    """Analyze complexity changes between code versions."""
    
    # Calculate complexity metrics
    before_metrics = calculate_complexity(before, language)
    after_metrics = calculate_complexity(after, language)
    
    # Detect changes
    changes = []
    
    if after_metrics.cyclomatic > before_metrics.cyclomatic:
        changes.append(ComplexityChange(
            type="cyclomatic_increase",
            severity="high" if after_metrics.cyclomatic > 20 else "medium"
        ))
    
    if after_metrics.cognitive > before_metrics.cognitive:
        changes.append(ComplexityChange(
            type="cognitive_increase",
            severity="medium" if after_metrics.cognitive > 15 else "low"
        ))
    
    return ComplexityChange(
        before=before_metrics,
        after=after_metrics,
        changes=changes
    )
```

### Pattern 3: Test Coverage Impact Analysis

Analyze test coverage impact of changes:

```python
def analyze_test_impact(
    diff: Diff,
    coverage_data: CoverageData
) -> TestImpactAnalysis:
    """Analyze test coverage impact of diff."""
    
    # Get affected test files
    affected_tests = find_affected_tests(diff)
    
    # Calculate coverage changes
    coverage_changes = []
    for test_file in affected_tests:
        before_coverage = coverage_data.get_before_coverage(test_file)
        after_coverage = coverage_data.get_after_coverage(test_file)
        
        if after_coverage < before_coverage:
            coverage_changes.append(TestCoverageChange(
                file=test_file,
                before=before_coverage,
                after=after_coverage,
                delta=before_coverage - after_coverage,
                severity="high" if (before_coverage - after_coverage) > 0.1 else "medium"
            ))
    
    return TestImpactAnalysis(
        affected_tests=affected_tests,
        coverage_changes=coverage_changes,
        overall_impact="positive" if all(c.delta > 0 for c in coverage_changes) else "negative"
    )
```

### Pattern 4: Quality Regression Detection

Detect quality regressions in diffs:

```python
def detect_regressions(diff_analysis: DiffAnalysisResult) -> list[QualityRegression]:
    """Detect quality regressions from diff analysis."""
    
    regressions = []
    
    for file_result in diff_analysis.files:
        # Check complexity increases
        for change in file_result.complexity_changes:
            if change.severity == "high":
                regressions.append(QualityRegression(
                    type="complexity_increase",
                    file=file_result.file_path,
                    severity="high",
                    details=change
                ))
        
        # Check coverage decreases
        for coverage_change in file_result.test_coverage_changes:
            if coverage_change.severity in ["high", "medium"]:
                regressions.append(QualityRegression(
                    type="coverage_decrease",
                    file=file_result.file_path,
                    severity=coverage_change.severity,
                    details=coverage_change
                ))
        
        # Check for breaking changes
        for breaking_change in file_result.breaking_changes:
            regressions.append(QualityRegression(
                type="breaking_change",
                file=file_result.file_path,
                severity="high",
                details=breaking_change
            ))
    
    return regressions
```

### Pattern 5: Quality Trend Analysis

Track quality trends across multiple diffs:

```python
class QualityTrendAnalyzer:
    def __init__(self):
        self.history: list[DiffAnalysisResult] = []
        self.baselines: dict[str, float] = {}
    
    def add_diff(self, analysis: DiffAnalysisResult):
        """Add diff analysis to history."""
        self.history.append(analysis)
        self._update_baselines(analysis)
    
    def _update_baselines(self, analysis: DiffAnalysisResult):
        """Update quality baselines from analysis."""
        for file_result in analysis.files:
            key = file_result.file_path
            self.baselines[key] = file_result.quality_score
    
    def get_trend(self, file_path: str) -> str:
        """Get quality trend for a file."""
        file_analyses = [
            a for a in self.history
            for f in a.files if f.file_path == file_path
        ]
        
        if len(file_analyses) < 2:
            return "insufficient_data"
        
        scores = [f.quality_score for a in file_analyses for f in a.files if f.file_path == file_path]
        
        if scores[-1] > scores[0]:
            return "improving"
        elif scores[-1] < scores[0]:
            return "declining"
        return "stable"
```

---

## Common Patterns

### Pattern 1: Diff Quality Scoring

Calculate overall diff quality score:

```python
def calculate_diff_quality_score(
    changes: list[DiffChange],
    regressions: list[QualityRegression],
    improvements: list[QualityImprovement]
) -> float:
    """Calculate overall quality score for a diff."""
    
    # Base score
    score = 100.0
    
    # Deduct for regressions
    for regression in regressions:
        if regression.severity == "high":
            score -= 20
        elif regression.severity == "medium":
            score -= 10
        else:
            score -= 5
    
    # Add for improvements
    for improvement in improvements:
        if improvement.impact == "high":
            score += 10
        elif improvement.impact == "medium":
            score += 5
        else:
            score += 2
    
    # Penalty for large diffs
    total_changes = len(changes)
    if total_changes > 500:
        score -= min(30, (total_changes - 500) * 0.05)
    
    return max(0.0, min(100.0, score))
```

### Pattern 2: Quality Gate Configuration

Configure quality gates for diffs:

```python
quality_gates = {
    "required": {
        "min_quality_score": 70.0,
        "max_regressions": 0,
        "max_complexity_increase": 5.0
    },
    "recommended": {
        "min_test_coverage": 0.80,
        "max_coverage_decrease": 0.05
    },
    "warnings": {
        "info": True,
        "refactoring_only": False
    }
}
```

---

## Common Mistakes

### Mistake 1: Not Accounting for Context

**Wrong:**
```python
# ❌ Analyzing changes without considering surrounding context
def analyze_change(change: Change):
    # Only looks at changed lines
    complexity = calculate_complexity(change.text)
```

**Correct:**
```python
# ✅ Considers surrounding context for accurate analysis
def analyze_change(change: Change, context: Context):
    # Includes surrounding lines for accurate complexity calculation
    full_function = context.get_full_function(change)
    complexity = calculate_complexity(full_function)
```

### Mistake 2: Ignoring Refactoring Changes

**Wrong:**
```python
# ❌ Treating refactoring as neutral without verification
def is_refactoring(change: Change) -> bool:
    # ❌ Only checks line count, not actual changes
    return abs(len(change.additions) - len(change.deletions)) < 10
```

**Correct:**
```python
# ✅ Uses AST comparison for accurate refactoring detection
def is_refactoring(before: str, after: str) -> bool:
    before_ast = parse_ast(before)
    after_ast = parse_ast(after)
    
    # Compare semantic structure, not just syntax
    return compare_semantic(before_ast, after_ast)
```

### Mistake 3: Not Handling Multi-Language Diffs

**Wrong:**
```python
# ❌ Using JavaScript parser for Python code
def analyze_diff(diff: Diff):
    parser = JavaScriptParser()  # ❌ Wrong parser for all files
```

**Correct:**
```python
# ✅ Language-aware parsing
def analyze_diff(diff: Diff):
    for file_change in diff.file_changes:
        language = get_language(file_change.filename)
        parser = get_parser_for_language(language)  # ✅ Correct parser
```

### Mistake 4: Over-Prioritizing Small Changes

**Wrong:**
```python
# ❌ Flagging whitespace changes as quality issues
def analyze_complexity(change: Change):
    # ❌ Counts whitespace changes as complexity
    if change.text.strip().count(" ") > 50:
        report_complexity_increase()
```

**Correct:**
```python
# ✅ Ignores whitespace-only changes
def analyze_complexity(change: Change):
    # ✅ Only analyzes meaningful code changes
    meaningful_code = remove_whitespace(change.text)
    complexity = calculate_complexity(meaningful_code)
```

### Mistake 5: No Quality Score Baseline

**Wrong:**
```python
# ❌ No baseline for comparison
def analyze_diff(diff: Diff) -> Score:
    return calculate_score(diff)  # ❌ Absolute score without context
```

**Correct:**
```python
# ✅ Compares to baseline
def analyze_diff(diff: Diff, baseline: Score) -> ScoreAnalysis:
    current_score = calculate_score(diff)
    return ScoreAnalysis(
        current=current_score,
        baseline=baseline,
        delta=current_score - baseline
    )
```

---

## Adherence Checklist

### Code Review

- [ ] **Guard Clauses:** Validation at top of analysis functions
- [ ] **Parsed State:** Diff parsed into structured format
- [ ] **Purity:** Analysis functions are stateless
- [ ] **Fail Fast:** Invalid diff format throws clear errors
- [ ] **Readability:** Analysis logic reads as English

### Testing

- [ ] Unit tests for diff parsing
- [ ] Integration tests for multi-file analysis
- [ ] Edge case tests for malformed diffs
- [ ] Regression tests for quality gate checks
- [ ] Performance tests for large diffs

### Security

- [ ] Diff inputs sanitized before parsing
- [ ] Parser configurations validated
- [ ] Resource limits on analysis runs
- [ ] No arbitrary code execution
- [ ] Input length limits enforced

### Performance

- [ ] Diff parsing optimized for large files
- [ ] Parallel analysis for multiple files
- [ ] Caching for unchanged diffs
- [ ] Memory usage bounded for large diffs
- [ ] Timeout protection for slow analyses

---

## References

### Related Skills

| Skill | Purpose |
|-------|---------|
| `agent-code-correctness-verifier` | Verify code correctness |
| `agent-error-trace-explainer` | Explain error traces |
| `agent-stacktrace-root-cause` | Root cause analysis |
| `agent-test-oracle-generator` | Generate test oracles |
| `code-philosophy` | Core correctness principles |

### Core Dependencies

- **Diff Parser:** Parse diff formats (unified, git)
- **AST Comparer:** Compare code semantic structure
- **Complexity Calculator:** Calculate complexity metrics
- **Coverage Analyzer:** Analyze test coverage changes
- **Quality Scorer:** Calculate quality scores

### External Resources

- [Diff Algorithms](https://example.com/diff-algorithms) - Myers algorithm, diff parsing
- [Complexity Metrics](https://example.com/complexity-metrics) - Cyclomatic, cognitive complexity
- [Test Coverage Analysis](https://example.com/test-coverage) - Coverage metrics

---

## Implementation Tracking

### Agent Diff Quality Analyzer - Core Patterns

| Task | Status |
|------|--------|
| Diff parsing and representation | ✅ Complete |
| Complexity change detection | ✅ Complete |
| Test coverage impact analysis | ✅ Complete |
| Quality regression detection | ✅ Complete |
| Quality trend analysis | ✅ Complete |
| Quality scoring | ✅ Complete |
| Multi-language support | ✅ Complete |

---

## Version History

### 1.0.0 (Initial)
- Diff parsing and representation
- Complexity change detection
- Test coverage impact analysis
- Quality regression detection
- Quality trend analysis

### 1.1.0 (Planned)
- Multi-language support optimization
- Custom quality gate configuration
- Performance profiling
- Machine learning-based quality prediction

### 2.0.0 (Future)
- Architectural change detection
- Cross-file analysis optimization
- Predictive quality impact estimation
- Interactive quality improvement suggestions

---

## Implementation Prompt (Execution Layer)

When implementing the Diff Quality Analyzer, use this prompt for code generation:

```
Create a Diff Quality Analyzer implementation following these requirements:

1. Core Class: `DiffAnalyzer`
   - Parse diffs into structured representation
   - Analyze quality changes per file
   - Detect quality regressions and improvements
   - Calculate overall quality score

2. Key Methods:
   - `analyze(diff_text, language)`: Full diff analysis
   - `analyze_complexity(before, after)`: Complexity change analysis
   - `analyze_test_impact(diff, coverage)`: Test coverage impact
   - `detect_regressions(analysis)`: Quality regression detection
   - `calculate_score(analysis)`: Quality score calculation

3. Quality Dimensions:
   - Complexity: Cyclomatic, cognitive complexity
   - Coverage: Test coverage, branch coverage
   - Readability: Variable naming, code organization
   - Maintainability: Duplication, coupling
   - Architecture: Dependency changes

4. Output Structure:
   - `is_valid`: Whether diff passes quality gates
   - `quality_score`: 0.0 to 100.0
   - `regressions`: List of quality regressions
   - `improvements`: List of quality improvements
   - `changes`: Per-file quality analysis

5. Complexity Detection:
   - Cyclomatic complexity change
   - Cognitive complexity change
   - Function length change
   - Parameter count change

6. Test Coverage Analysis:
   - Coverage decrease detection
   - Test addition/removal detection
   - Affected test identification
   - Coverage trend analysis

7. Quality Gates:
   - Minimum quality score threshold
   - Maximum regressions allowed
   - Maximum complexity increase
   - Minimum test coverage

8. Multi-Language Support:
   - Python, JavaScript, Java, TypeScript
   - Custom language plugins
   - Language-specific complexity rules

Follow the 5 Laws of Elegant Defense:
- Guard clauses for validation
- Parse diff at boundary
- Pure analysis functions
- Fail fast on invalid diff
- Clear names for all components
```
