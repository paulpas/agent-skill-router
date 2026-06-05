---




name: filesystem-context
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent filesystem context with multi-factor skill selection,
  fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: filesystem-context, filesystem context, how do i filesystem-context, orchestrate
    filesystem-context, automate filesystem-context, agent filesystem-context
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




# Filesystem Context

Orchestrates intelligent skill selection and execution for filesystem context workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def build_filesystem_context(
    target_paths: List[str],
    config: Dict[str, Any],
    min_relevance: float = 0.6
) -> Optional[ContextGraph]:
    """Construct an intelligent filesystem context graph from target paths.
    
    Applies multi-factor scoring to determine which files/directories 
    contribute meaningfully to the current task context. Filters out 
    noise (temp files, large binaries, inaccessible paths) and builds 
    a directed graph of relevant file relationships.
    
    Args:
        target_paths: List of absolute or relative paths to analyze
        config: Scoring configuration (max_depth, file_types, size_limits)
        min_relevance: Minimum relevance score to include in context
        
    Returns:
        ContextGraph with scored nodes and edges, or None if empty
    """
    if not target_paths:
        raise ValueError("Target paths list cannot be empty")
        
    context_nodes = []
    visited = set()
    
    for path in target_paths:
        if not os.path.exists(path):
            continue
            
        stat = os.stat(path)
        relevance = _calculate_path_relevance(path, stat, config)
        
        if relevance >= min_relevance and path not in visited:
            visited.add(path)
            node = {
                "path": path,
                "type": "dir" if os.path.isdir(path) else "file",
                "size": stat.st_size,
                "modified": stat.st_mtime,
                "relevance_score": relevance,
                "permissions": oct(stat.st_mode)[-3:]
            }
            context_nodes.append(node)
            
            # Recursively scan directories if configured
            if os.path.isdir(path) and config.get("recursive", False):
                context_nodes.extend(_scan_directory(path, config, visited))
                
    if not context_nodes:
        return None
        
    # Build relationship edges based on imports/includes
    edges = _infer_file_relationships(context_nodes)
    return ContextGraph(nodes=context_nodes, edges=edges)
```


### Pattern 2: Execution with Fallback

```python
def execute_context_workflow(
    context_graph: ContextGraph,
    operation: str,
    fallback_handler: Optional[Callable] = None
) -> Dict[str, Any]:
    """Execute a filesystem context operation with I/O-aware fallback chains.
    
    Handles common filesystem failures (permission denied, disk full, 
    stale symlinks) by applying domain-specific recovery strategies:
    1. Retry with elevated permissions (if authorized)
    2. Skip inaccessible nodes and continue processing
    3. Fallback to cached context if available
    4. Log detailed I/O errors for human review
    
    Args:
        context_graph: Pre-built context graph to process
        operation: Target operation (index, scan, validate, sync)
        fallback_handler: Optional callback for critical failures
        
    Returns:
        Execution result with success status, processed nodes, and error log
    """
    if not context_graph or not operation:
        raise ValueError("Context graph and operation must be provided")
        
    results = {"processed": [], "skipped": [], "errors": [], "success": False}
    max_retries = 2
    
    for node in context_graph.nodes:
        attempt = 0
        while attempt <= max_retries:
            try:
                if operation == "index":
                    metadata = _index_file_metadata(node["path"])
                elif operation == "validate":
                    metadata = _validate_file_integrity(node["path"])
                else:
                    raise ValueError(f"Unsupported operation: {operation}")
                    
                results["processed"].append({
                    "path": node["path"],
                    "status": "success",
                    "metadata": metadata
                })
                break
                
            except PermissionError:
                attempt += 1
                if attempt > max_retries:
                    results["skipped"].append(node["path"])
                    results["errors"].append(f"Permission denied: {node['path']}")
                time.sleep(0.1 * attempt)
                
            except FileNotFoundError:
                results["skipped"].append(node["path"])
                results["errors"].append(f"Stale path: {node['path']}")
                break
                
            except OSError as e:
                attempt += 1
                if attempt > max_retries:
                    results["errors"].append(f"OS error on {node['path']}: {e}")
                    if fallback_handler:
                        fallback_handler(node, e)
                time.sleep(0.1 * attempt)
                
    results["success"] = len(results["processed"]) > 0
    return results
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
|

---

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

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.
- [POSIX Filesystem API Reference](<https://man7.org/linux/man-pages/man7/inotify.7.html>)
- [Python os Module Documentation](<https://docs.python.org/3/library/os.html>)
- [inotify Linux Kernel File Monitoring](<https://en.wikipedia.org/wiki/Inotify>)
- [fswatch Cross-Platform File Monitor](<https://github.com/emcrisostomo/fswatch>)
- [Tree-sitter Codebase Parsing](<https://tree-sitter.github.io/tree-sitter/>)
