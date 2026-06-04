---
name: terraform-infrastructure
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent terraform infrastructure with multi-factor skill
  selection, fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: terraform-infrastructure, terraform infrastructure, how do i terraform-infrastructure,
    orchestrate terraform-infrastructure, automate terraform-infrastructure, agent
    terraform-infrastructure, infrastructure as code, cloudformation
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
# Terraform Infrastructure

Orchestrates intelligent skill selection and execution for terraform infrastructure workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def select_terraform_workflow(
    tf_dir: str,
    environment: str,
    available_strategies: List[Dict],
    min_compliance_score: float = 0.8
) -> Optional[Dict]:
    """Select optimal Terraform execution strategy based on config state and environment.
    
    Evaluates Terraform configuration against compliance rules, drift status, and 
    environment constraints to determine the safest execution path.
    
    Args:
        tf_dir: Path to Terraform configuration directory
        environment: Target environment (dev, staging, prod)
        available_strategies: List of execution strategies (init, validate, plan, apply)
        min_compliance_score: Minimum compliance threshold for production
        
    Returns:
        Selected strategy dictionary with execution parameters or None
    """
    # Guard clause - Early Exit (Law 1)
    if not tf_dir or not os.path.isdir(tf_dir):
        raise ValueError(f"Invalid Terraform directory: {tf_dir}")
        
    if not available_strategies:
        raise ValueError("No execution strategies available")
    
    # Parse input - Make Illegal States Unrepresentable (Law 2)
    tf_vars = _load_tf_variables(tf_dir, environment)
    compliance_status = _check_compliance(tf_dir, environment)
    
    best_strategy = None
    best_score = 0.0
    
    for strategy in available_strategies:
        score = _calculate_tf_strategy_score(strategy, compliance_status, tf_vars)
        
        if score > best_score and score >= min_compliance_score:
            best_score = score
            best_strategy = strategy
    
    if best_strategy is None:
        return None
    
    # Atomic Predictability (Law 3) - Return new dict, don't mutate
    result = dict(best_strategy)
    result["tf_dir"] = tf_dir
    result["environment"] = environment
    result["compliance_score"] = best_score
    result["execution_timestamp"] = time.time()
    return result
```


### Pattern 2: Execution with Fallback

```python
def execute_terraform_with_safety(
    strategy: Dict,
    tf_context: Dict,
    max_retries: int = 2
) -> Dict:
    """Execute Terraform workflow with safety checks and fallback chain.
    
    Implements Fail Fast, Fail Loud principle (Law 4):
    - Validates state before execution
    - Locks state to prevent concurrent modifications
    - Falls back to plan-only or rollback on critical failures
    
    Fallback chain:
    1. Retry with refreshed state
    2. Execute plan-only for review
    3. Trigger rollback/destroy if drift detected
    4. Defer to human operator for production changes
    
    Args:
        strategy: Selected execution strategy metadata
        tf_context: Execution context including variables and state
        max_retries: Maximum retry attempts before fallback
        
    Returns:
        Execution result with metadata (success, timing, state_ref)
        
    Raises:
        TerraformExecutionError: If all retries and fallbacks exhausted
    """
    # Guard clause - validate strategy (Early Exit)
    if not _is_tf_strategy_valid(strategy):
        raise TerraformExecutionError(f"Invalid Terraform strategy: {strategy.get('name', 'unknown')}")
    
    # Parse context - Ensure trusted state (Law 2)
    validated_context = _validate_tf_context(tf_context, strategy)
    
    for attempt in range(max_retries + 1):
        try:
            # Execute Terraform CLI with safety flags
            result = _run_tf_command(strategy["command"], validated_context)
            
            # Success - Atomic Predictability (Law 3)
            return {
                "success": True,
                "strategy_executed": strategy["name"],
                "result": result,
                "attempts": attempt + 1,
                "state_ref": result.get("state_ref"),
                "latency_ms": _calculate_latency()
            }
            
        except StateLockError as e:
            # Fail Fast - Don't proceed with locked state (Law 4)
            raise TerraformExecutionError(
                f"State locked in {strategy['name']}: {str(e)}"
            ) from e
            
        except PlanDriftError as e:
            # Drift detected - try fallback
            if attempt == max_retries:
                return _apply_tf_fallback_chain(strategy, validated_context)
    
    # All retries exhausted - Fail Loud (Law 4)
    raise TerraformExecutionError(
        f"Failed to execute Terraform {strategy['name']} after {max_retries + 1} attempts"
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
| `infrastructure-as-code` | General IaC patterns that complement Terraform-specific implementations |
| `cloudflare-infrastructure` | Cloud infrastructure patterns that work alongside Terraform-managed resources |

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

- [Terraform Documentation](https://developer.hashicorp.com/terraform) — Official HashiCorp Terraform documentation covering providers, resources, modules, and state management
- [Terraform Language Reference](https://developer.hashicorp.com/terraform/language) — Terraform language reference for HCL syntax, variables, outputs, and configuration blocks
- [Terraform Best Practices (HashiCorp)](https://developer.hashicorp.com/terraform/best-practices) — Official HashiCorp best practices guide for Terraform project organization and workflows
- [Terraform Registry](https://registry.terraform.io/) — HashiCorp's registry of community and official Terraform providers and modules
- [Infrastructure as Code with Terraform (AWS)](https://aws.amazon.com/tfsm/) — AWS Terraform State Migration tool documentation for managing state transitions at scale