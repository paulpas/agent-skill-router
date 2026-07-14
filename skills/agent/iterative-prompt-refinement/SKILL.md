---
name: iterative-prompt-refinement
description: Implements systematic prompt evolution through baseline generation, structured evaluation against rubrics, targeted revision, and regression validation to continuously improve prompt quality.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: agent
  role: implementation
  scope: implementation
  output-format: code
  triggers: prompt refinement, prompt iteration, prompt versioning, A/B testing prompts, prompt evaluation, prompt quality, how do i improve my prompts
  archetypes: [tactical, diagnostic]
  anti_triggers:
    - brainstorming
    - vague ideation
    - prompt design only, writing prompts
  response_profile:
    verbosity: medium
    directive_strength: high
    abstraction_level: operational
  related-skills: prompt-chaining, evaluation-monitoring, structured-output-enforcement
---

# Iterative Prompt Refinement Pattern

Implements systematic prompt evolution through a continuous improvement loop: baseline generation → structured evaluation against rubrics → targeted revision → regression validation. This skill makes the model design and implement automated prompt testing pipelines that measure prompt quality improvements with statistical rigor and prevent regressions during iterative development.

## TL;DR Checklist

- [ ] Establish a baseline prompt with known output quality
- [ ] Define evaluation rubric with weighted scoring dimensions
- [ ] Implement automated test suite with input-output pairs
- [ ] Create revision pipeline that generates improved variants
- [ ] Run regression tests before committing any prompt change
- [ ] Track version history with diff-based comparison
- [ ] Use statistical significance testing for A/B comparisons

---

## When to Use

Use this skill when:

- Prompt quality is degrading over time and you need a systematic improvement process
- Building production prompts where reliability matters more than speed of iteration
- Multiple team members are modifying prompts and you need regression prevention
- You need to demonstrate measurable prompt improvements for stakeholders
- Debugging why a specific prompt variant produces consistently worse outputs

## When NOT to Use

Avoid this skill for:

- One-off exploratory prompts that will be discarded after testing
- Ultra-simple prompts with well-known-good behavior (no improvement needed)
- Situations where you can directly edit and manually test in a chat UI
- Early prototype stages where speed of iteration outweighs correctness

---

## Core Workflow

1. **Baseline Establishment** — Define the current prompt version, collect representative test inputs, and run baseline evaluations to establish quality metrics (accuracy, completeness, format compliance). **Checkpoint:** Baseline must include at least 20 diverse test cases covering edge cases, not just happy paths.
2. **Rubric Design** — Create a weighted evaluation rubric with dimensions relevant to the task (e.g., correctness: 40%, completeness: 25%, tone: 15%, format: 20%). Each dimension needs clear scoring criteria (1-5 scale) and concrete examples of what constitutes each score. **Checkpoint:** Rubric must be objective enough that two independent evaluators agree within ±1 point on most cases.
3. **Automated Evaluation Pipeline** — Build a test runner that applies each prompt variant to all test inputs, evaluates outputs against the rubric, and produces aggregate scores with per-case breakdowns. **Checkpoint:** Pipeline must run end-to-end in under 2 minutes for the full test suite.
4. **Targeted Revision** — Analyze failure cases from the evaluation, identify the specific aspect of the prompt causing each failure (ambiguity, missing constraint, wrong example), and produce targeted revisions rather than wholesale rewrites. **Checkpoint:** Each revision must have a clear hypothesis: "Changing X will improve dimension Y by reducing error Z."
5. **A/B Testing** — Run both baseline and revised prompts against the full test suite in parallel, compute aggregate scores per variant, and apply statistical significance testing (e.g., paired t-test on per-case scores) before declaring a winner. **Checkpoint:** Must show p < 0.05 or equivalent confidence threshold before committing the change.
6. **Regression Prevention** — Before merging any prompt improvement, verify that previously-passing test cases still pass and that no new dimension's score has decreased significantly (>1 point drop). **Checkpoint:** All regression checks must pass; if a regression is found, revert the change or fix both issues.

---

## Implementation Patterns

### Pattern 1: Prompt Versioning with Rubric-Based Scoring

```python
from dataclasses import dataclass, field
from typing import Callable
import json
from pathlib import Path

@dataclass
class TestCase:
    """A single test case for prompt evaluation."""
    input_text: str
    expected_output: str | None = None  # Optional ground truth
    expected_fields: dict | None = None  # If structured output, required fields
    
@dataclass
class RubricDimension:
    """A single scoring dimension in the evaluation rubric."""
    name: str
    weight: float  # Must sum to 1.0 across all dimensions
    max_score: int = 5
    description: str = ""

@dataclass
class PromptVersion:
    """A versioned prompt with its performance metrics."""
    version_id: str
    prompt_template: str
    test_cases: list[TestCase]
    rubric: list[RubricDimension]
    scores: dict[str, float] = field(default_factory=dict)
    case_scores: list[dict] = field(default_factory=list)

class PromptRefinementEngine:
    """Manages prompt versions, evaluation, and A/B comparison."""
    
    def __init__(self, llm_client: Any, rubric: list[RubricDimension]) -> None:
        self._llm = llm_client
        self._rubric = rubric
        self._versions: dict[str, PromptVersion] = {}
    
    def add_version(
        self,
        version_id: str,
        prompt_template: str,
        test_cases: list[TestCase]
    ) -> None:
        """Register a new prompt version for evaluation."""
        total_weight = sum(d.weight for d in self._rubric)
        assert abs(total_weight - 1.0) < 0.01, f"Rubric weights must sum to 1.0, got {total_weight}"
        
        self._versions[version_id] = PromptVersion(
            version_id=version_id,
            prompt_template=prompt_template,
            test_cases=test_cases,
            rubric=self._rubric
        )
    
    def evaluate_version(self, version_id: str) -> dict[str, float]:
        """Run full evaluation of a prompt version against the rubric."""
        if version_id not in self._versions:
            raise ValueError(f"Unknown version: {version_id}")
        
        version = self._versions[version_id]
        case_scores = []
        
        for i, tc in enumerate(version.test_cases):
            response = self._llm.generate(version.prompt_template.format(input_text=tc.input_text))
            output = response.choices[0].message.content
            
            # Score each rubric dimension
            dimension_scores: dict[str, float] = {}
            for dim in version.rubric:
                score = self._score_dimension(dim.name, tc, output)
                dimension_scores[dim.name] = score
            
            case_score = sum(
                dim.weight * dimension_scores[dim.name] / dim.max_score
                for dim in version.rubric
            )
            
            case_scores.append({
                "case_index": i,
                "input": tc.input_text[:100],
                "total_score": round(case_score, 3),
                "dimension_scores": {k: round(v / dim.max_score, 3) 
                                    for k, v in dimension_scores.items()},
            })
        
        # Aggregate scores
        aggregate = {}
        for dim in version.rubric:
            avg = sum(cs["dimension_scores"].get(dim.name, 0) for cs in case_scores) / len(case_scores)
            aggregate[dim.name] = round(avg * dim.weight * dim.max_score, 3)
        
        total = sum(aggregate.values())
        version.scores = aggregate
        version.case_scores = case_scores
        return {"total": round(total, 3), **aggregate}
    
    def _score_dimension(self, dimension_name: str, tc: TestCase, output: str) -> float:
        """Score a single rubric dimension for one test case. Uses LLM-as-judge."""
        prompt = f"""Evaluate the following output on the '{dimension_name}' dimension (1-5 scale).

Criteria for this dimension: {self._get_dimension_criteria(dimension_name)}

Input: {tc.input_text[:500]}
Expected: {tc.expected_output or 'N/A'}
Actual Output: {output}

Score only a number 1-5. Return nothing else.
"""
        response = self._llm.generate(prompt)
        try:
            score = int(response.choices[0].message.content.strip())
            return max(1, min(5, score))
        except ValueError:
            return 3  # Default neutral score on parse failure
    
    def _get_dimension_criteria(self, dimension_name: str) -> str:
        """Return the scoring criteria for a given rubric dimension."""
        criteria = {
            "correctness": "1=Completely wrong or irrelevant, 3=Partially correct with errors, 5=Factually accurate and on-topic",
            "completeness": "1=Major aspects missing, 3=Most aspects covered, 5=All relevant aspects included without omission",
            "tone": "1=Inappropriate tone for context, 3=Adequate but inconsistent, 5=Perfectly matched tone throughout",
            "format": "1=No structure or formatting, 3=Roughly follows format with errors, 5=Flawlessly follows required format",
        }
        return criteria.get(dimension_name, "Score based on overall quality (1-5)")
    
    def compare_versions(self, v1_id: str, v2_id: str) -> dict:
        """Compare two prompt versions with statistical significance testing."""
        if v1_id not in self._versions or v2_id not in self._versions:
            raise ValueError("Both versions must exist")
        
        v1 = self._versions[v1_id]
        v2 = self._versions[v2_id]
        
        assert len(v1.test_cases) == len(v2.test_cases), "Test suites must match"
        
        # Paired comparison per test case
        differences = []
        for i in range(len(v1.test_cases)):
            s1 = v1.case_scores[i]["total_score"] if v1.case_scores else 0
            s2 = v2.case_scores[i]["total_score"] if v2.case_scores else 0
            differences.append(s2 - s1)
        
        mean_diff = sum(differences) / len(differences) if differences else 0
        
        # Simple significance check (paired t-test approximation)
        if len(differences) > 1:
            variance = sum((d - mean_diff)**2 for d in differences) / (len(differences) - 1)
            std_error = (variance / len(differences)) ** 0.5
            t_statistic = mean_diff / std_error if std_error > 0 else 0
            # Approximate: |t| > 2.0 suggests significance at ~95% for n>20
            is_significant = abs(t_statistic) > 2.0
        else:
            t_statistic = mean_diff
            is_significant = False
        
        return {
            "version_1": v1_id,
            "version_2": v2_id,
            "mean_improvement": round(mean_diff, 4),
            "t_statistic": round(t_statistic, 4),
            "is_significant": is_significant,
            "n_test_cases": len(differences),
        }
```

### Pattern 2: Prompt Diff and Rollback System

```python
import difflib
from datetime import datetime

@dataclass
class PromptDiff:
    """Represents changes between two prompt versions."""
    version_from: str
    version_to: str
    additions: list[str]
    deletions: list[str]
    timestamp: str
    
class PromptRollbackManager:
    """Manages prompt version history and rollback capabilities."""
    
    def __init__(self) -> None:
        self._history: list[PromptDiff] = []
        self._snapshots: dict[str, str] = {}  # version_id -> prompt_template
    
    def record_change(
        self,
        from_version: str,
        to_version: str,
        template: str
    ) -> PromptDiff:
        """Record a change between prompt versions with diff analysis."""
        if from_version not in self._snapshots:
            raise ValueError(f"Cannot diff from unknown version: {from_version}")
        
        old_template = self._snapshots[from_version]
        
        # Compute line-level diff
        old_lines = old_template.splitlines()
        new_lines = template.splitlines()
        
        differ = difflib.unified_diff(old_lines, new_lines)
        additions = []
        deletions = []
        for line in differ:
            if line.startswith("+") and not line.startswith("+++"):
                additions.append(line[2:])
            elif line.startswith("-") and not line.startswith("---"):
                deletions.append(line[2:])
        
        diff = PromptDiff(
            version_from=from_version,
            version_to=to_version,
            additions=additions,
            deletions=deletions,
            timestamp=datetime.now().isoformat(),
        )
        
        self._history.append(diff)
        self._snapshots[to_version] = template
        
        return diff
    
    def rollback_to(self, target_version: str) -> str | None:
        """Rollback to a specific prompt version by ID."""
        if target_version not in self._snapshots:
            return None
        return self._snapshots[target_version]
```

### Pattern 3: Automated Regression Test Suite

```python
from typing import Protocol

class PromptEvaluator(Protocol):
    """Protocol for evaluating a prompt output."""
    def evaluate(self, input_text: str, expected: str, actual: str) -> dict[str, float]: ...

class PromptRegressionTester:
    """Runs regression tests across multiple prompt versions."""
    
    def __init__(self, evaluator: PromptEvaluator) -> None:
        self._evaluator = evaluator
        self._regression_threshold = 0.1  # Max allowed score drop
    
    def run_regression(
        self,
        test_cases: list[dict[str, str]],
        baseline_results: dict[str, float],
        new_results: dict[str, float],
    ) -> dict:
        """Compare new results against baseline to detect regressions."""
        regressed = []
        improved = []
        
        for case_id in baseline_results:
            old_score = baseline_results[case_id]
            new_score = new_results.get(case_id, 0)
            delta = new_score - old_score
            
            if delta < -self._regression_threshold:
                regressed.append({
                    "case_id": case_id,
                    "old_score": round(old_score, 3),
                    "new_score": round(new_score, 3),
                    "delta": round(delta, 3),
                })
            elif delta > self._regression_threshold:
                improved.append({
                    "case_id": case_id,
                    "old_score": round(old_score, 3),
                    "new_score": round(new_score, 3),
                    "delta": round(delta, 3),
                })
        
        return {
            "total_cases": len(baseline_results),
            "regressed": len(regressed),
            "improved": len(improved),
            "unchanged": len(baseline_results) - len(regressed) - len(improved),
            "regressed_cases": regressed,
            "improved_cases": improved,
        }

# BAD — No regression testing
new_prompt = "You are an expert assistant. Answer questions accurately."
response = llm.generate(new_prompt.format(question="What is 2+2?"))
# What if it broke the tone? No one knows without systematic comparison.

# GOOD — Regression-tested change
test_suite = [
    {"id": "math_01", "input": "What is 2+2?", "expected": "4"},
    {"id": "tone_01", "input": "Tell me a joke", "expected": "..."},
]
baseline = engine.evaluate_version("v3")
engine.add_version("v4", improved_template, test_suite)
new_results = engine.evaluate_version("v4")
regression_report = tester.run_regression(test_suite, baseline, new_results)
assert regression_report["regressed"] == 0, "Regression detected!"
```

### Pattern 4: Prompt Improvement Hypothesis Tracker

```python
from dataclasses import dataclass, field
from enum import Enum

class HypothesisStatus(Enum):
    PENDING = "pending"
    TESTING = "testing"
    VALIDATED = "validated"
    REJECTED = "rejected"

@dataclass
class ImprovementHypothesis:
    """Tracks a hypothesis about how to improve a prompt."""
    id: str
    description: str  # e.g., "Adding examples improves correctness by ~15%"
    target_dimension: str
    predicted_improvement: float  # Expected improvement in score (0-1)
    status: HypothesisStatus = HypothesisStatus.PENDING
    actual_improvement: float | None = None
    
class HypothesisManager:
    """Manages prompt improvement hypotheses and tracks validation."""
    
    def __init__(self, engine: PromptRefinementEngine) -> None:
        self._engine = engine
        self._hypotheses: dict[str, ImprovementHypothesis] = {}
    
    def add_hypothesis(self, hypothesis: ImprovementHypothesis) -> str:
        """Register a new improvement hypothesis."""
        self._hypotheses[hypothesis.id] = hypothesis
        return hypothesis.id
    
    def validate_hypothesis(
        self,
        hypothesis_id: str,
        baseline_version: str,
        test_version: str
    ) -> ImprovementHypothesis:
        """Run A/B test and update hypothesis with actual results."""
        if hypothesis_id not in self._hypotheses:
            raise ValueError(f"Unknown hypothesis: {hypothesis_id}")
        
        comp = self._engine.compare_versions(baseline_version, test_version)
        actual = comp["mean_improvement"]
        
        h = self._hypotheses[hypothesis_id]
        h.actual_improvement = actual
        h.status = (
            HypothesisStatus.VALIDATED 
            if comp["is_significant"] and actual > 0
            else HypothesisStatus.REJECTED
        )
        
        return h
    
    def get_active_hypotheses(self) -> list[ImprovementHypothesis]:
        """Return hypotheses that still need validation."""
        return [h for h in self._hypotheses.values() 
                if h.status == HypothesisStatus.PENDING]
```

## Constraints

### MUST DO
1. Always evaluate prompts against a fixed test suite — never compare results from different inputs
2. Use weighted rubrics where weights sum to 1.0, with dimensions relevant to the actual task requirements
3. Run all evaluations using the same LLM model and temperature settings to ensure fair comparison
4. Include edge cases (ambiguous input, adversarial examples, out-of-domain text) in test suites — not just happy paths
5. Require statistical significance before declaring an improvement (p < 0.05 or |t| > 2.0 for paired comparisons)
6. Maintain version history with diffs — every prompt change must be auditable and roll-backable
7. Reference `code-philosophy` (5 Laws of Elegant Defense): parse don't validate at rubric boundary, fail fast on regression detection
8. Track improvement hypotheses explicitly — each prompt change should have a stated hypothesis about what it improves

### MUST NOT DO
1. Compare prompts across different LLM models or temperature settings — confounds the measurement
2. Use a test suite with fewer than 10 cases — statistical tests need adequate sample sizes
3. Accept improvements that regress on any single rubric dimension by more than 1 point
4. Change multiple prompt elements at once — isolate variables so you know what caused the change
5. Skip regression testing before deploying a new prompt version to production
6. Rely on subjective "this feels better" assessments — always measure with the rubric

---

## Output Template

When this skill is active, deliver:

1. **Evaluation rubric** — Weighted scoring dimensions with clear criteria and examples
2. **Test suite** — ≥ 20 diverse input cases with expected outputs or field requirements
3. **Baseline evaluation results** — Scores for the current prompt version per-dimension
4. **Revision hypothesis** — What specific change you're making and why, with predicted improvement
5. **A/B comparison results** — Statistical significance analysis comparing baseline vs revised
6. **Regression report** — Per-case breakdown showing any dimensions that got worse

---

## Related Skills

| Skill | Purpose |
|---|---|
| `prompt-chaining` | Each step in a chain can be individually refined with this pattern |
| `evaluation-monitoring` | Production monitoring complements development-time refinement |
| `structured-output-enforcement` | Ensures prompt outputs are valid before evaluation |

> 📖 skill(local cache): prompt-chaining, evaluation-monitoring, structured-output-enforcement