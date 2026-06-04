---
name: conductor-revert
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent conductor revert with multi-factor skill selection,
  fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: conductor-revert, conductor revert, how do i conductor-revert, orchestrate
    conductor-revert, automate conductor-revert, agent conductor-revert
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
version: "1.0.0"
---
# Conductor Revert

Orchestrates intelligent skill selection and execution for conductor revert workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
class ConductorRevertOrchestrator:
    def __init__(self, revert_strategies: List[Dict], audit_logger: Logger):
        self.strategies = revert_strategies
        self.logger = audit_logger
        self.confidence_cache = {}

    def route_revert_request(self, request: Dict) -> Dict:
        # Law 1: Early exit on invalid revert request
        if not request.get("target_component") or not request.get("revert_version"):
            raise ValueError("Revert request missing target_component or revert_version")

        # Law 2: Parse & validate revert scope
        scope = self._parse_revert_scope(request)
        scored_strategies = self._score_revert_strategies(scope)

        # Law 3: Atomic selection - return new dict, never mutate inputs
        selected = max(scored_strategies, key=lambda s: s["match_score"])
        if selected["match_score"] < 0.7:
            return self._trigger_fallback_chain(scope, selected)

        selected["execution_plan"] = self._build_revert_plan(selected)
        self.logger.info(f"Selected revert strategy: {selected['name']} (score: {selected['match_score']})")
        return selected

    def _score_revert_strategies(self, scope: Dict) -> List[Dict]:
        scores = []
        for strategy in self.strategies:
            # Multi-factor scoring: compatibility, historical success, system load
            compat = self._calculate_component_compatibility(scope["target_component"], strategy)
            history = self.confidence_cache.get(strategy["name"], 0.8)
            load_penalty = 0.1 if strategy.get("system_load", 0) > 0.8 else 0.0
            match_score = (compat * 0.5) + (history * 0.3) + ((1.0 - load_penalty) * 0.2)
            scores.append({**strategy, "match_score": round(match_score, 3)})
        return scores

    def _trigger_fallback_chain(self, scope: Dict, failed_strategy: Dict) -> Dict:
        # Fallback 1: Retry with degraded mode
        degraded = {**failed_strategy, "mode": "degraded", "fallback_level": 1}
        self.logger.warning(f"Primary revert failed, applying fallback 1: {degraded['name']}")
        return degraded
```


### Pattern 2: Execution with Fallback

```python
    def execute_revert_with_resilience(self, selected_strategy: Dict, revert_context: Dict) -> Dict:
        # Law 4: Fail fast on invalid revert state
        if not self._validate_revert_state(revert_context):
            raise RevertStateError("Cannot revert: target component is in inconsistent state")

        max_attempts = selected_strategy.get("max_retries", 2)
        for attempt in range(max_attempts + 1):
            try:
                # Execute domain-specific revert logic
                revert_result = self._apply_revert_strategy(selected_strategy, revert_context)
                
                # Verify revert integrity (Law 3: Atomic Predictability)
                if self._verify_revert_integrity(revert_context, revert_result):
                    self._update_confidence(selected_strategy["name"], success=True)
                    return {
                        "status": "reverted",
                        "strategy": selected_strategy["name"],
                        "attempts": attempt + 1,
                        "timestamp": time.time()
                    }
                    
            except TransientDependencyError as e:
                if attempt == max_attempts:
                    return self._escalate_to_manual_intervention(selected_strategy, revert_context)
                continue
                
            except IrreversibleStateError as e:
                # Law 4: Fail loud, no silent patches
                self.logger.error(f"Irreversible state during revert: {e}")
                return self._trigger_fallback_chain(revert_context, selected_strategy)

        # All retries exhausted
        return self._trigger_fallback_chain(revert_context, selected_strategy)

    def _verify_revert_integrity(self, context: Dict, result: Dict) -> bool:
        # Domain-specific verification: check component version, config hash, and dependency health
        expected_version = context["revert_version"]
        actual_version = result.get("component_version")
        config_hash_valid = result.get("config_hash") == context["target_config_hash"]
        deps_healthy = all(dep["status"] == "healthy" for dep in result.get("dependencies", []))
        return actual_version == expected_version and config_hash_valid and deps_healthy
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



---

---

## Constraints

### MUST DO
- Parse user request into structured task specifications before dispatching to downstream agents
- Implement a state machine for each conductor phase with explicit entry/exit conditions and transition logs
- Validate revert outputs against expected schema before proceeding to the next orchestration step
- Log every orchestration decision including rationale, selected strategy, and confidence scores for auditability
- Maintain a task queue with priority ordering — critical path items execute first during resource contention

### MUST NOT DO
- Do not allow a single failed agent task to silently terminate the entire workflow — implement per-step fallbacks
- Avoid circular delegation patterns where Agent A delegates to B which delegates back to A without termination condition
- Never bypass the validation step for revert results even if timing is critical — correctness supersedes speed
- Do not use shared mutable state between parallel agent executions — use message-passing or immutable data transfer
- Avoid hardcoding agent selection rules; parameterize them and load from configuration for runtime flexibility


## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Git Revert vs Reset Guide (Atlassian)](<https://www.atlassian.com/git/tutorials/resetting-checking-out-and-reverting>)
- [Rollback Patterns for Microservices](<https://microservices.io/patterns/rollback.html>)
- [Blue-Green Deployment Strategy](<https://martinfowler.com/bliki/BlueGreenDeployment.html>)
- [Database Migration Rollback Strategies](<https://www.redhat.com/en/topics/devopses/blog/how-to-roll-back-database-migrations>)
- [Change Management Best Practices (ITIL)](<https://axelos.com/certifications/itil-service-management>)

## Related Skills

| Skill | Purpose |
|