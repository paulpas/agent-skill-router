---
name: render-automation
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent render automation with multi-factor skill selection,
  fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: render-automation, render automation, how do i render-automation, orchestrate
    render-automation, automate render-automation, agent render-automation
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
# Render Automation

Orchestrates intelligent skill selection and execution for render automation workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def select_render_skill(
    render_request: Dict,
    available_nodes: List[Dict],
    min_confidence: float = 0.7
) -> Optional[Dict]:
    """Select optimal render node/skill based on request constraints and node state.
    
    Applies Law 1 (Early Exit) and Law 2 (Make illegal states unrepresentable).
    """
    if not render_request.get("format") or not render_request.get("resolution"):
        raise ValueError("Render request must specify format and resolution")
        
    if not available_nodes:
        raise ValueError("No render nodes available for selection")
        
    target_format = render_request["format"]
    target_res = render_request["resolution"]
    priority = render_request.get("priority", "normal")
    
    best_node = None
    best_score = 0.0
    
    for node in available_nodes:
        # Law 2: Validate node compatibility before scoring
        if node["status"] not in ("idle", "available"):
            continue
        if target_format not in node["supported_formats"]:
            continue
            
        # Multi-factor scoring: load, historical success, priority match
        load_penalty = node["current_load"] / 100.0
        success_bonus = node.get("historical_success_rate", 0.8)
        priority_weight = 1.2 if priority == "high" else 1.0
        
        score = (success_bonus * priority_weight) - load_penalty
        
        if score > best_score and score >= min_confidence:
            best_score = score
            best_node = node
            
    if best_node is None:
        return None
        
    # Law 3: Return new dict, never mutate input node state
    return {
        "node_id": best_node["id"],
        "selected_confidence": best_score,
        "estimated_duration_sec": _estimate_render_time(target_res, target_format),
        "timestamp": time.time()
    }
```


### Pattern 2: Execution with Fallback

```python
def execute_render_with_fallback(
    selected_node: Dict,
    render_context: Dict,
    max_retries: int = 2
) -> Dict:
    """Execute render job with domain-specific fallback chain.
    
    Implements Law 4 (Fail Fast, Fail Loud) and adaptive fallback routing.
    """
    node_id = selected_node["node_id"]
    job_id = render_context.get("job_id", f"render_{uuid4().hex[:8]}")
    
    if not _validate_render_context(render_context):
        raise RenderExecutionError(f"Invalid render context for job {job_id}")
        
    for attempt in range(max_retries + 1):
        try:
            # Law 1: Early exit on invalid node state
            if not _is_node_healthy(node_id):
                raise NodeUnhealthyError(f"Node {node_id} is unhealthy")
                
            result = _submit_render_job(node_id, render_context)
            
            # Law 3: Atomic result structure
            return {
                "job_id": job_id,
                "success": True,
                "node_executed": node_id,
                "output_path": result["output_path"],
                "attempts": attempt + 1,
                "latency_ms": _measure_latency()
            }
            
        except TransientNetworkError as e:
            if attempt == max_retries:
                return _apply_render_fallback_chain(selected_node, render_context)
        except InvalidStateError as e:
            # Law 4: Fail immediately on corrupt render data
            raise RenderExecutionError(f"Corrupt render state in {node_id}: {e}") from e
            
    raise RenderExecutionError(f"Render job {job_id} failed after {max_retries + 1} attempts")
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
| `ci-cd-pipelines` | Provides CI/CD pipeline patterns that complement deployment automation workflows |
| `infrastructure-as-code` | Covers infrastructure patterns for automating the environments where apps are deployed |

---

## Constraints

### MUST DO
- Implement idempotent automation triggers: running the same automation twice should not create duplicate resources or actions
- Validate all trigger conditions with explicit allowlists before executing automated actions
- Include rollback procedures in every automation workflow — every CREATE should have a corresponding DELETE capability
- Log all automation executions with input state, output state, duration, and any errors for monitoring and debugging

### MUST NOT DO
- Do not create circular automation loops where trigger A causes action B which triggers A again
- Avoid using automations that modify production data without explicit human approval gates
- Never embed API keys or credentials directly in automation workflows — use vaulted secrets with rotation
- Do not assume external service availability; implement retry logic with exponential backoff and dead-letter queues


## Live References

> Authoritative documentation links for this domain. The model follows markdown links at load time to resolve external references and inline content.

- [Vercel Documentation](https://vercel.com/docs) — Official Vercel platform docs covering deployment, preview branches, and edge functions
- [Render Documentation](https://render.com/docs) — Official Render platform documentation for web services, static sites, and automated deployments
- [CI/CD for Web Applications (GitHub Docs)](https://docs.github.com/en/actions/use-cases-and-examples/deploying/simple-deployment) — GitHub Actions patterns for automating web application deployment pipelines
- [Static Site Generation vs Server-Side Rendering](https://nextjs.org/docs/app/building-your-application/rendering/server-side-rendering) — Framework-specific documentation on rendering strategies and automation tradeoffs
- [Web Deployment Automation Best Practices (Atlassian)](https://www.atlassian.com/continuous-delivery/principles/web-deployment) — Atlassian's principles for automating web application deployment workflows