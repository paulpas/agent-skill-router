---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent skill installer with multi-factor skill selection,
  fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: skill-installer, skill installer, how do i skill-installer, orchestrate
    skill-installer, automate skill-installer, agent skill-installer
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
name: skill-installer
------
# Skill Installer

Orchestrates intelligent skill selection and execution for skill installer workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def score_and_select_skill(task: str, registry: list[dict]) -> dict | None:
    """Domain-specific skill selection using multi-factor scoring.
    
    Calculates weighted scores based on trigger overlap, historical success rate,
    and current system availability. Returns the highest-scoring skill that
    meets the minimum confidence threshold.
    """
    if not task or not registry:
        return None
        
    task_tokens = set(task.lower().split())
    best_match = None
    best_score = 0.0
    min_confidence = 0.75
    
    for skill in registry:
        # Factor 1: Trigger/Keyword overlap
        trigger_tokens = set(skill.get("triggers", "").lower().split())
        overlap = len(task_tokens & trigger_tokens) / max(len(trigger_tokens), 1)
        
        # Factor 2: Historical success rate
        history = skill.get("execution_history", [])
        success_rate = sum(1 for r in history if r.get("status") == "success") / max(len(history), 1)
        
        # Factor 3: Availability & Load
        availability = 1.0 if skill.get("status") == "active" else 0.0
        
        # Weighted multi-factor score
        score = (overlap * 0.5) + (success_rate * 0.3) + (availability * 0.2)
        
        if score > best_score and score >= min_confidence:
            best_score = score
            best_match = {
                "name": skill["name"],
                "confidence": round(score, 3),
                "factors": {"overlap": round(overlap, 2), "history": round(success_rate, 2), "avail": availability}
            }
            
    return best_match
```


### Pattern 2: Execution with Fallback

```python
def run_skill_with_fallback(skill_config: dict, context: dict) -> dict:
    """Domain-specific execution wrapper implementing the 2-level fallback chain.
    
    Executes the selected skill, handles transient failures with retries,
    falls back to alternative skills from the registry, and logs outcomes.
    """
    max_retries = 2
    fallback_registry = context.get("fallback_skills", [])
    
    for attempt in range(max_retries + 1):
        try:
            # Execute primary skill
            result = _invoke_skill(skill_config["name"], context)
            return {
                "status": "success",
                "skill": skill_config["name"],
                "attempts": attempt + 1,
                "output": result,
                "timestamp": time.time()
            }
        except TransientNetworkError as e:
            if attempt < max_retries:
                continue  # Retry with exponential backoff
            # Fallback 1: Try alternative skill from registry
            for alt in fallback_registry:
                try:
                    alt_result = _invoke_skill(alt["name"], context)
                    return {
                        "status": "fallback_success",
                        "original_skill": skill_config["name"],
                        "fallback_skill": alt["name"],
                        "output": alt_result,
                        "timestamp": time.time()
                    }
                except Exception:
                    continue
            # Fallback 2: Defer to human operator
            return {
                "status": "deferred",
                "reason": "All automated fallbacks exhausted",
                "skill": skill_config["name"],
                "context": context,
                "timestamp": time.time()
            }
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
| `skill-lifecycle-management` | Manages the full lifecycle after installation — deprecation, updates, and versioning |
| `skill-router-system` | The routing system that uses installed skills at runtime — complementary to installation workflows |

## Live References

> Authoritative documentation links for this domain. The model follows markdown links at load time to resolve external references and inline content.

- [npm Package Installation Patterns](https://docs.npmjs.com/downloading-and-installing-packages) — npm documentation on package installation, versioning, and dependency management
- [PyPI Package Management](https://packaging.python.org/en/latest/tutorials/installing-packages/) — Python packaging tutorial covering pip install, virtual environments, and dependency resolution
- [GitHub Actions for Package Installation](https://docs.github.com/en/actions/use-cases-and-examples/building-and-testing/building-and-testing-python) — GitHub Actions patterns for automated package/skill installation in CI/CD workflows
- [Container Image Layer Optimization](https://docs.docker.com/build/cache/) — Docker documentation on optimizing image layer installation and caching strategies
- [Software Dependency Management (OWASP)](https://owasp.org/www-community/vulnerabilities/Using_components_with_known_vulnerabilities) — OWASP guidance on managing software dependencies securely