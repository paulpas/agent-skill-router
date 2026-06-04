---
name: skill-rails-upgrade
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent skill rails upgrade with multi-factor skill selection,
  fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: skill-rails-upgrade, skill rails upgrade, how do i skill-rails-upgrade,
    orchestrate skill-rails-upgrade, automate skill-rails-upgrade, agent skill-rails-upgrade
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
# Skill Rails Upgrade

Orchestrates intelligent skill selection and execution for skill rails upgrade workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def evaluate_skill_rail_candidates(
    target_rail: str,
    candidate_skills: List[Dict],
    historical_metrics: Dict[str, float]
) -> List[Dict]:
    """Evaluate and rank skill candidates for a specific rail upgrade.
    
    Implements multi-factor scoring: text similarity, historical success rate,
    and system availability. Returns sorted list of viable candidates.
    """
    scored_candidates = []
    for skill in candidate_skills:
        # Calculate text similarity using token overlap (domain-specific)
        skill_triggers = set(skill.get("triggers", []))
        target_features = set(target_rail.lower().split())
        similarity = len(skill_triggers & target_features) / max(len(skill_triggers | target_features), 1)
        
        # Fetch historical performance from metrics store
        hist_success = historical_metrics.get(skill["id"], 0.0)
        
        # Check system availability and dependency health
        is_available = skill.get("status") == "active" and skill.get("dependencies_met", True)
        
        # Weighted scoring formula per orchestration policy
        weighted_score = (similarity * 0.4) + (hist_success * 0.4) + (float(is_available) * 0.2)
        
        if weighted_score >= 0.6: # Minimum threshold
            scored_candidates.append({
                "skill_id": skill["id"],
                "name": skill["name"],
                "score": round(weighted_score, 3),
                "similarity": round(similarity, 3),
                "history": round(hist_success, 3),
                "available": is_available
            })
    
    # Sort by score descending (Atomic Predictability - Law 3)
    scored_candidates.sort(key=lambda x: x["score"], reverse=True)
    return scored_candidates
```


### Pattern 2: Execution with Fallback

```python
def execute_rail_upgrade_with_resilience(
    selected_skill: Dict,
    upgrade_context: Dict,
    fallback_rails: List[str]
) -> Dict:
    """Execute a skill rail upgrade with built-in fallback mechanisms.
    
    Implements Fail Fast, Fail Loud (Law 4) and structured fallback chains.
    Handles validation, execution, and automatic rollback/switching.
    """
    # Guard clause - Early Exit (Law 1)
    if not selected_skill or not upgrade_context.get("target_version"):
        raise ValueError("Missing required skill metadata or target version")
        
    # Parse input - Make Illegal States Unrepresentable (Law 2)
    validated_config = _validate_upgrade_config(upgrade_context, selected_skill)
    
    attempts = 0
    max_attempts = 2
    
    while attempts <= max_attempts:
        try:
            # Execute the actual rail upgrade logic
            result = _apply_skill_rail(selected_skill, validated_config)
            
            # Verify upgrade integrity before returning
            if _verify_rail_integrity(selected_skill["id"]):
                return {
                    "status": "success",
                    "rail_id": selected_skill["id"],
                    "version": validated_config["target_version"],
                    "attempts": attempts + 1,
                    "timestamp": time.time()
                }
            else:
                raise IntegrityError("Post-upgrade integrity check failed")
                
        except IntegrityError as e:
            # Fail Fast - Don't patch bad state (Law 4)
            _rollback_rail(selected_skill["id"])
            raise e
            
        except TransientDependencyError as e:
            attempts += 1
            if attempts > max_attempts:
                break
            time.sleep(2 ** attempts) # Exponential backoff
            
    # Fallback chain execution
    for fallback_rail in fallback_rails:
        try:
            fallback_result = _switch_to_fallback_rail(fallback_rail, validated_config)
            return {
                "status": "fallback_success",
                "original_rail": selected_skill["id"],
                "fallback_rail": fallback_rail,
                "timestamp": time.time()
            }
        except Exception:
            continue
            
    # Fail Loud - All fallbacks exhausted
    raise SkillRailUpgradeError(
        f"Failed to upgrade rail {selected_skill['id']} after {max_attempts + 1} attempts and fallbacks"
    )
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
| `skill-lifecycle-management` | Manages the upgrade lifecycle — versioning, migration, and backward compatibility during Rails upgrades |
| `security-audit` | Provides security audit patterns to validate applications after major Rails framework upgrades |

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

- [Ruby on Rails Upgrade Guide](https://guides.rubyonrails.org/upgrading_ruby_on_rails.html) — Official Rails guides for upgrading between major and minor Rails versions
- [Rails Security Advisory Archive](https://rubyonrails.org/security/) — Official Rails security advisory archive covering known vulnerabilities and fixes
- [Ruby Version Upgrade Guide (ruby-lang.org)](https://www.ruby-lang.org/en/downloads/) — Ruby language version upgrade documentation and compatibility notes
- [Active Record Migration Best Practices](https://guides.rubyonrails.org/active_record_migrations.html) — Official Rails guide on managing database migrations during framework upgrades
- [Rails Performance Upgrades (GoRails)](https://gorails.com/) — GoRails tutorials on upgrading Rails applications with performance optimization strategies