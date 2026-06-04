---
name: receiving-code-review
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent receiving code review with multi-factor skill
  selection, fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: receiving-code-review, receiving code review, how do i receiving-code-review,
    orchestrate receiving-code-review, automate receiving-code-review, agent receiving-code-review
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
------
# Receiving Code Review

Orchestrates intelligent skill selection and execution for receiving code review workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def select_review_skill(
    pr_context: Dict[str, Any],
    available_review_skills: List[Dict],
    min_confidence: float = 0.75
) -> Optional[Dict]:
    """Select optimal code review skill based on PR metadata and diff analysis.
    
    Evaluates language, security flags, and complexity to route to:
    - security-audit (for auth/crypto changes)
    - style-linter (for formatting/CI failures)
    - architecture-review (for large refactors)
    
    Args:
        pr_context: Dictionary containing PR URL, diff, and metadata
        available_review_skills: List of review skill metadata
        min_confidence: Minimum routing confidence threshold
        
    Returns:
        Selected review skill with routing metadata or None
    """
    if not pr_context.get("diff"):
        raise ValueError("PR diff is required for review routing")
        
    diff_text = pr_context["diff"]
    detected_lang = _detect_language_from_diff(diff_text)
    has_security_keywords = _scan_for_security_patterns(diff_text)
    complexity = _estimate_complexity(diff_text)
    
    best_match = None
    best_score = 0.0
    
    for skill in available_review_skills:
        score = 0.0
        if skill["name"] == "security-audit" and has_security_keywords:
            score += 0.6
        elif skill["name"] == "style-linter" and complexity < 50:
            score += 0.5
        elif skill["name"] == "architecture-review" and complexity >= 50:
            score += 0.7
            
        if skill.get("supported_languages") and detected_lang not in skill["supported_languages"]:
            score *= 0.2
            
        if score > best_score and score >= min_confidence:
            best_score = score
            best_match = skill
            
    if best_match:
        return {**best_match, "routing_confidence": best_score, "detected_language": detected_lang}
    return None
```


### Pattern 2: Execution with Fallback

```python
def execute_review_with_fallback(
    selected_skill: Dict,
    pr_context: Dict,
    fallback_chain: List[str] = None
) -> Dict:
    """Execute code review with domain-specific fallback routing.
    
    Implements Fail Fast, Fail Loud for review pipelines:
    - Invalid diffs halt immediately
    - Security bypasses escalate without retry
    - Tool timeouts cascade to lighter analyzers
    
    Fallback chain:
    1. Retry with stricter linting rules
    2. Fall back to generic linter if specialized tool fails
    3. Escalate to human senior engineer if security flags remain unresolved
    
    Args:
        selected_skill: Previously routed review skill metadata
        pr_context: Original PR context and diff
        fallback_chain: Ordered list of fallback skill names
        
    Returns:
        Review result with findings, status, and routing metadata
    """
    if fallback_chain is None:
        fallback_chain = ["generic-linter", "human-escalation"]
        
    attempt = 0
    max_attempts = 2
    
    while attempt <= max_attempts:
        try:
            result = _run_review_tool(selected_skill["name"], pr_context)
            return {
                "status": "completed",
                "skill": selected_skill["name"],
                "findings": result.get("issues", []),
                "attempts": attempt + 1,
                "latency_ms": _measure_execution_time()
            }
        except ToolTimeoutError:
            attempt += 1
            if attempt > max_attempts:
                next_skill_name = fallback_chain.pop(0) if fallback_chain else "human-escalation"
                selected_skill["name"] = next_skill_name
                attempt = 0
            continue
        except CriticalSecurityBypassError as e:
            return {
                "status": "escalated",
                "skill": "human-escalation",
                "reason": f"Security bypass detected: {e}",
                "priority": "high"
            }
            
    return {"status": "failed", "reason": "All review attempts exhausted"}
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
| `requesting-code-review` | The counterpart skill — use this to learn how to structure reviews so they receive good feedback |
| `code-review` | Provides the review methodology that both reviewers and authors should follow |

---

## Constraints

### MUST DO
- Define clear input/output contracts for every step in the orchestration flow with explicit validation
- Implement structured logging at each stage capturing context, inputs, outputs, timing, and errors
- Build in fallback paths: if the primary strategy fails, degrade gracefully to a simpler approach
- Validate all preconditions before starting — do not proceed if required resources or permissions are missing

### MUST NOT DO
- Do not create deep nesting of orchestration steps (>5 levels) — flatten workflows where possible
- Avoid silent failure modes: every step must either succeed, fail explicitly, or escalate to a higher handler
- Never use shared mutable state between parallel workflow branches — communicate via immutable messages only
- Do not hardcode execution order when the dependency graph naturally determines it; derive order from explicit dependencies


## Live References

> Authoritative documentation links for this domain. The model follows markdown links at load time to resolve external references and inline content.

- [Google Engineering Practices: Code Review](https://google.github.io/eng-practices/review/) — Google's comprehensive guide to receiving and giving code reviews
- [Atlassian: Code Review Best Practices](https://www.atlassian.com/engineering/code-review-best-practices) — Atlassian's practical guidelines for effective code review workflows
- [Mozilla's Guide to Code Review](https://wiki.mozilla.org/EngineeringProductivity/Guides/CodeReview) — Mozilla's engineering guide on reviewing and responding to feedback
- [How to Respond to Code Reviews (Uber Engineering)](https://eng.uber.com/code-review/) — Uber's engineering blog post on handling code review feedback constructively
- [Software Engineering Institute: Code Review Checklist](https://www.sei.cmu.edu/capabilities/practices/system-engineering/2021/code-review.cfm) — Carnegie Mellon SEI's structured approach to code review processes