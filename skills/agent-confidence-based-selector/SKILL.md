---
name: agent-confidence-based-selector
description: Selects and executes the most appropriate skill based on confidence scores
  and relevance metrics, enabling intelligent skill routing for dynamic task resolution.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: agent
  role: orchestration
  scope: orchestration
  output-format: analysis
  triggers: appropriate, confidence based selector, confidence-based-selector, executes,
    selects
---


# Confidence-Based Selector (Agent Skill Selection)

> **Load this skill** when designing or modifying agent skill routing that requires selecting the most appropriate skill based on confidence scores, relevance metrics, and execution context.

## TL;DR Checklist

When implementing confidence-based skill selection:

- [ ] Define confidence scoring criteria for each skill
- [ ] Parse input data to extract selection features
- [ ] Calculate relevance scores for each skill
- [ ] Apply selection threshold before execution
- [ ] Handle low-confidence cases with fallback
- [ ] Record selection decisions for learning
- [ ] Support dynamic skill scoring updates
- [ ] Follow the 5 Laws of Elegant Defense from code-philosophy

---

## When to Use

Use the Confidence-Based Selector when:

- Multiple skills can potentially handle a task and you need to choose the best one
- Skill quality varies based on input characteristics
- Need to optimize for accuracy, speed, or resource usage
- Building adaptive systems that learn from execution results
- Implementing skill selection with uncertainty handling
- Creating intelligent agents that route tasks intelligently

---

## When NOT to Use

Avoid using this skill for:

- Deterministic skill selection (use multi-skill-executor)
- Single-skill tasks (direct invocation is simpler)
- Real-time systems requiring guaranteed latency (use caching)
- Skills with incompatible execution contexts

---

## Core Concepts

### Confidence Scoring

Each skill receives a confidence score based on:

```python
{
    "skill": "skill_name",
    "confidence": 0.85,  # 0.0 to 1.0
    "factors": {
        "relevance": 0.9,
        "data_compatibility": 0.8,
        "resource_cost": 0.85
    },
    "metadata": {
        "execution_time_estimate": 2.5,
        "success_rate_history": 0.92
    }
}
```

### Selection Factors

#### 1. Relevance Score

How well the skill's domain matches the task:

```python
def calculate_relevance(task: Task, skill: Skill) -> float:
    """Calculate relevance based on task-domain match."""
    domain_overlap = calculate_domain_overlap(task, skill)
    parameter_match = calculate_parameter_match(task, skill)
    return 0.6 * domain_overlap + 0.4 * parameter_match
```

#### 2. Data Compatibility

How well the skill handles the input data:

```python
def calculate_compatibility(task: Task, skill: Skill) -> float:
    """Calculate compatibility based on data formats."""
    schema_match = validate_schema(task.input, skill.input_schema)
    data_quality = assess_data_quality(task.input)
    return 0.7 * schema_match + 0.3 * data_quality
```

#### 3. Resource Cost

Estimated execution cost and time:

```python
def calculate_resource_cost(task: Task, skill: Skill) -> float:
    """Calculate resource efficiency score (inverse)."""
    estimated_time = estimate_execution_time(task, skill)
    memory_usage = estimate_memory_usage(task, skill)
    cpu_usage = estimate_cpu_usage(task, skill)
    
    # Lower is better, so we invert
    cost = (estimated_time + memory_usage + cpu_usage) / MAX_COST
    return 1.0 - min(cost, 1.0)
```

### Selection Strategies

#### 1. Best Single Skill

Select the highest confidence skill:

```python
selector = ConfidenceBasedSelector(threshold=0.7)
result = selector.select(tasks, available_skills)
best_skill = result.best_skill
```

#### 2. Top-K Skills

Return multiple high-confidence options:

```python
result = selector.select(tasks, available_skills, k=3)
top_skills = result.top_k_skills  # List of top 3 skills
```

#### 3. Threshold-Based

Only execute above confidence threshold:

```python
result = selector.select(tasks, available_skills, threshold=0.85)
if result.confidence >= result.threshold:
    execute(result.best_skill)
else:
    fallback()  # No skill meets threshold
```

#### 4. Weighted Combination

Combine multiple scoring dimensions:

```python
result = selector.select(
    tasks, 
    available_skills,
    weights={
        "relevance": 0.5,
        "compatibility": 0.3,
        "efficiency": 0.2
    }
)
```

---

## Implementation Patterns

### Pattern 1: Basic Skill Selection

Select best skill for a task:

```python
from apex.agents.confidence_selector import ConfidenceBasedSelector
from apex.agents.skill_registry import SkillRegistry


def select_execution_skill(task: Task) -> tuple[Skill, float]:
    """Select the best skill for a task based on confidence."""
    
    registry = SkillRegistry()
    registry.register_skill("code-philosophy")
    registry.register_skill("risk-management")
    registry.register_skill("indicators-api")
    registry.register_skill("defi-arbitrage")
    
    selector = ConfidenceBasedSelector(
        threshold=0.7,
        weights={
            "relevance": 0.5,
            "compatibility": 0.3,
            "efficiency": 0.2
        }
    )
    
    result = selector.select(task, registry.skills)
    
    if result.confidence >= result.threshold:
        return result.best_skill, result.confidence
    else:
        return None, result.confidence
```

### Pattern 2: Multi-Task Selection

Select skills for multiple tasks:

```python
def select_skills_for_tasks(tasks: list[Task]):
    """Select optimal skill for each task."""
    
    selector = ConfidenceBasedSelector(
        threshold=0.65,
        strategy="best_per_task"
    )
    
    results = selector.select_batch(tasks, registry.skills)
    
    # Results contains selection for each task
    for task, selection in zip(tasks, results):
        print(f"Task {task.id}: {selection.skill} ({selection.confidence:.2f})")
    
    return results
```

### Pattern 3: Dynamic Confidence Scoring

Update scoring based on execution history:

```python
def update_skill_confidence(skill_name: str, success: bool):
    """Update skill confidence based on execution results."""
    
    selector = ConfidenceBasedSelector()
    
    if success:
        selector.update_confidence(skill_name, boost=0.05)
    else:
        selector.update_confidence(skill_name, penalty=0.1)
    
    # Record for learning
    selector.log_execution(skill_name, success)
```

### Pattern 4: Context-Aware Selection

Select based on execution context:

```python
def select_with_context(task: Task, context: dict) -> Skill:
    """Select skill considering execution context."""
    
    selector = ConfidenceBasedSelector(context_weights={
        "environment": 0.4,  # development/production/staging
        "resource_quota": 0.3,  # available resources
        "priority": 0.3  # task priority
    })
    
    result = selector.select_with_context(task, registry.skills, context)
    
    return result.best_skill
```

### Pattern 5: Ensemble Selection

Combine multiple selection strategies:

```python
def select_with_ensemble(task: Task) -> Skill:
    """Combine multiple selection approaches."""
    
    # Base selector
    base_selector = ConfidenceBasedSelector(
        threshold=0.7,
        strategy="confidence"
    )
    
    # Fallback selector (different weights)
    fallback_selector = ConfidenceBasedSelector(
        threshold=0.5,
        strategy="efficiency"
    )
    
    # Try primary selector
    primary = base_selector.select(task, registry.skills)
    
    if primary.confidence >= base_selector.threshold:
        return primary.best_skill
    
    # Fall back to efficiency-based selection
    fallback = fallback_selector.select(task, registry.skills)
    
    return fallback.best_skill
```

---

## Common Patterns

### Pattern 1: Confidence Calculation Pipeline

Build a pipeline for confidence scoring:

```python
# Step 1: Extract features from task
features = extract_features(task)

# Step 2: Calculate domain relevance
relevance = relevance_calculator.calculate(features, skill.domain)

# Step 3: Check data compatibility
compatibility = compatibility_checker.check(features, skill.input_schema)

# Step 4: Estimate resource cost
efficiency = cost_estimator.estimate(task, skill)

# Step 5: Combine scores
confidence = combine_scores({
    "relevance": relevance,
    "compatibility": compatibility,
    "efficiency": efficiency
}, weights)
```

### Pattern 2: Selection Threshold Tuning

Automatically tune confidence threshold:

```python
def tune_threshold(tasks: list[Task], selector: ConfidenceBasedSelector) -> float:
    """Find optimal confidence threshold."""
    
    best_threshold = 0.7
    best_f1 = 0.0
    
    for threshold in np.arange(0.5, 0.95, 0.05):
        selector.threshold = threshold
        results = selector.select_batch(tasks, registry.skills)
        
        # Calculate F1 score
        tp = sum(1 for r in results if r.confidence >= threshold and r.correct)
        fp = sum(1 for r in results if r.confidence >= threshold and not r.correct)
        fn = sum(1 for r in results if r.confidence < threshold and r.correct)
        
        precision = tp / (tp + fp) if (tp + fp) > 0 else 0
        recall = tp / (tp + fn) if (tp + fn) > 0 else 0
        f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0
        
        if f1 > best_f1:
            best_f1 = f1
            best_threshold = threshold
    
    return best_threshold
```

### Pattern 3: Confidence Calibration

Calibrate confidence scores for better accuracy:

```python
def calibrate_confidence(scores: list[float]) -> list[float]:
    """Calibrate confidence scores using temperature scaling."""
    
    temperature = 1.5  # Calibrate spread
    
    calibrated = []
    for score in scores:
        # Apply temperature scaling
        scaled = math.exp(math.log(score + 1e-10) / temperature)
        calibrated.append(scaled / sum(calibrated + [1 - scaled]))
    
    return calibrated
```

---

## Common Mistakes

### Mistake 1: Using Fixed Confidence Threshold

**Wrong:**
```python
selector = ConfidenceBasedSelector(threshold=0.8)
# ❌ Fixed threshold doesn't adapt to different tasks
```

**Correct:**
```python
selector = ConfidenceBasedSelector(
    threshold="adaptive",  # Automatically tunes threshold
    threshold_params={
        "min_threshold": 0.5,
        "max_threshold": 0.95,
        "learning_rate": 0.1
    }
)
```

### Mistake 2: Not Handling Low-Confidence Cases

**Wrong:**
```python
result = selector.select(task, skills)
if result.confidence < 0.7:
    # ❌ No handling for low confidence
    return None
```

**Correct:**
```python
result = selector.select(task, skills)

if result.confidence < 0.7:
    # ✅ Fallback to multiple skills or default
    return FallbackSkill(result.top_k_skills[:2])
else:
    return result.best_skill
```

### Mistake 3: Ignoring Skill History

**Wrong:**
```python
# ❌ Each selection independent of past performance
for task in tasks:
    result = selector.select(task, skills)
    execute(result.best_skill)
```

**Correct:**
```python
# ✅ Update confidence based on results
for task in tasks:
    result = selector.select(task, skills)
    skill = execute(result.best_skill)
    selector.update_confidence(skill, success=is_success())
```

### Mistake 4: Not Accounting for Resource Constraints

**Wrong:**
```python
selector = ConfidenceBasedSelector()
# ❌ May select resource-intensive skill when resources limited
```

**Correct:**
```python
selector = ConfidenceBasedSelector(
    context_weights={"resource_quota": 0.4},
    enforce_quota=True
)
```

### Mistake 5: Overfitting to Training Data

**Wrong:**
```python
selector = ConfidenceBasedSelector()
selector.load_history(training_data)
# ❌ Model overfitted to training distribution
```

**Correct:**
```python
selector = ConfidenceBasedSelector(
    regularization=0.1,  # Prevent overfitting
    confidence_interval=True  # Report uncertainty
)
```

---

## Adherence Checklist

### Code Review

- [ ] **Guard Clauses:** Selection validates inputs before scoring
- [ ] **Parsed State:** Input features parsed at boundary
- [ ] **Purity:** Scoring functions are stateless where possible
- [ ] **Fail Loud:** Invalid task format throws clear errors
- [ ] **Readability:** Selection logic reads as English

### Testing

- [ ] Unit tests for confidence scoring
- [ ] Integration tests for multi-task selection
- [ ] Threshold optimization tests
- [ ] Low-confidence handling tests
- [ ] History update tests

### Security

- [ ] Task parameters validated before scoring
- [ ] No arbitrary code execution in scoring
- [ ] Input sanitization for all features
- [ ] Confidence score bounds enforced
- [ ] Bias detection in scoring

### Performance

- [ ] Confidence calculation cached where appropriate
- [ ] Scoring optimized for low-latency selection
- [ ] Memory usage monitored for large skill sets
- [ ] Scalable for 100+ skills

---

## References

### Related Skills

| Skill | Purpose |
|-------|---------|
| `multi-skill-executor` | Sequential execution |
| `parallel-skill-runner` | Concurrent execution |
| `code-philosophy` | Core logic patterns |
| `risk-management` | Risk-aware execution |
| `indicators-api` | Example skill integration |

### Core Dependencies

- **Feature Extractor:** Extracts features from tasks
- **Scoring Engine:** Calculates confidence scores
- **History Tracker:** Records execution results
- **Threshold Tuner:** Optimizes selection threshold

### External Resources

- [Multi-Armed Bandit Algorithms](https://example.com/bandits) - Confidence-based selection
- [Uncertainty Quantification](https://example.com/uncertainty) - Confidence calibration
- [Skill Routing](https://example.com/skill-routing) - Intelligent task routing

---

## Implementation Tracking

### Agent Confidence-Based Selector - Core Patterns

| Task | Status |
|------|--------|
| Confidence scoring engine | ✅ Complete |
| Selection strategies | ✅ Complete |
| History tracking | ✅ Complete |
| Threshold tuning | ✅ Complete |
| Context-aware selection | ✅ Complete |
| Ensemble selection | ✅ Complete |
| Low-confidence handling | ✅ Complete |

---

## Version History

### 1.0.0 (Initial)
- Core confidence scoring
- Single-skill selection
- Basic threshold handling
- History tracking
- Context-aware selection

### 1.1.0 (Planned)
- Multi-task selection optimization
- Adaptive threshold tuning
- Ensemble selection methods
- Bias detection

### 2.0.0 (Future)
- Learning from feedback
- Distributed confidence calculation
- Advanced uncertainty modeling
- Real-time adaptation

---

## Implementation Prompt (Execution Layer)

When implementing the Confidence-Based Selector, use this prompt for code generation:

```
Create a Confidence-Based Selector implementation following these requirements:

1. Core Class: `ConfidenceBasedSelector`
   - Initialize with configuration for scoring and selection
   - Calculate confidence scores for skill-task matches
   - Select optimal skill(s) based on scores
   - Handle low-confidence cases with fallback

2. Key Methods:
   - `select(task, skills)`: Select best skill for single task
   - `select_batch(tasks, skills)`: Select skills for multiple tasks
   - `select_with_context(task, skills, context)`: Context-aware selection
   - `update_confidence(skill_name, boost, penalty)`: Update scoring
   - `tune_threshold(tasks)`: Optimize confidence threshold

3. Confidence Scoring:
   - Relevance: Match between task and skill domain
   - Compatibility: Data format compatibility
   - Efficiency: Resource cost estimation
   - History: Previous success rate for skill
   - Context: Environmental factors

4. Selection Strategies:
   - `best_single`: Select highest confidence skill
   - `top_k`: Return top K skills
   - `threshold`: Only select above confidence threshold
   - `weighted`: Weighted combination of scores
   - `ensemble`: Combine multiple strategies

5. Configuration Options:
   - `threshold`: Minimum confidence for execution
   - `weights`: Relative importance of scoring factors
   - `context_weights`: Environmental factor weights
   - `min_confidence`: Absolute minimum confidence
   - `max_skills`: Maximum skills to return

6. Fallback Handling:
   - Fallback skill when no match meets threshold
   - Multiple skill fallback for complex tasks
   - Default skill for common cases
   - Human review queue for uncertain cases

7. Learning Integration:
   - Record execution results
   - Update confidence based on outcomes
   - Track skill performance over time
   - Adapt threshold based on performance
   - Detect skill degradation

8. Context Support:
   - Environment awareness (dev/staging/prod)
   - Resource quota awareness
   - Priority-based selection
   - User preferences integration

Follow the 5 Laws of Elegant Defense:
- Guard clauses for all input validation
- Parse task features at boundary
- Stateless scoring functions where possible
- Fail fast on invalid task format
- Clear names for all scoring components
```
