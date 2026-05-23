---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent planning with files with multi-factor skill selection,
  fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: planning-with-files, planning with files, how do i planning-with-files,
    orchestrate planning-with-files, automate planning-with-files, agent planning-with-files
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
name: planning-with-files
------
# Planning With Files

Orchestrates intelligent skill selection and execution for planning with files workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def generate_file_execution_plan(
    target_path: str,
    available_processors: List[Dict],
    dependency_graph: Dict[str, List[str]]
) -> Dict[str, List[Dict]]:
    """Generate an optimized execution plan for processing files based on type and dependencies.
    
    Analyzes file structure, matches files to available processors using content-type detection,
    and orders execution according to the dependency graph to prevent race conditions.
    
    Args:
        target_path: Root directory or file path to plan for
        available_processors: List of processor metadata (name, supported_extensions, priority)
        dependency_graph: Mapping of file types to their required upstream processors
        
    Returns:
        Dictionary mapping file paths to ordered lists of processor steps
    """
    import os
    from pathlib import Path
    
    if not os.path.exists(target_path):
        raise FileNotFoundError(f"Target path does not exist: {target_path}")
        
    plan = {}
    files = [f for f in Path(target_path).rglob("*") if f.is_file()]
    
    for file_path in files:
        ext = file_path.suffix.lower()
        matching_processors = [
            p for p in available_processors if ext in p.get("supported_extensions", [])
        ]
        
        if not matching_processors:
            continue
            
        # Score processors based on priority and dependency alignment
        scored = []
        for proc in matching_processors:
            deps = dependency_graph.get(ext, [])
            dep_match = sum(1 for d in deps if any(d in p.get("supported_extensions", []) for p in matching_processors))
            score = proc.get("priority", 0) + dep_match
            scored.append((score, proc))
            
        scored.sort(reverse=True)
        plan[str(file_path)] = [proc["name"] for _, proc in scored]
        
    return plan
```


### Pattern 2: Execution with Fallback

```python
def execute_file_pipeline_with_fallback(
    file_path: str,
    processor_steps: List[Dict],
    output_dir: str,
    max_retries: int = 2
) -> Dict:
    """Execute a sequence of file processing steps with resilience and fallback routing.
    
    Implements chunked reading for large files, handles I/O errors gracefully,
    and falls back to alternative processors or manual review queues on failure.
    
    Args:
        file_path: Path to the file being processed
        processor_steps: Ordered list of processor configurations to apply
        output_dir: Directory to write processed results
        max_retries: Maximum retry attempts per processor step
        
    Returns:
        Execution summary with success status, bytes processed, and fallback triggers
    """
    import os
    from datetime import datetime
    
    os.makedirs(output_dir, exist_ok=True)
    result = {
        "file": file_path,
        "status": "pending",
        "steps_completed": 0,
        "fallbacks_used": [],
        "timestamp": datetime.now().isoformat()
    }
    
    current_data = None
    for step_idx, step in enumerate(processor_steps):
        processor_name = step["name"]
        chunk_size = step.get("chunk_size", 8192)
        
        for attempt in range(max_retries + 1):
            try:
                if current_data is None:
                    with open(file_path, "rb") as f:
                        current_data = f.read()
                        
                processed = step["handler"](current_data, chunk_size)
                current_data = processed
                result["steps_completed"] += 1
                break
                
            except IOError as e:
                if attempt == max_retries:
                    result["fallbacks_used"].append(f"{processor_name}:io_error_retry_exhausted")
                    # Fallback: switch to streaming processor or queue for review
                    if step.get("fallback_handler"):
                        current_data = step["fallback_handler"](file_path)
                        result["steps_completed"] += 1
                        break
                    else:
                        result["status"] = "failed"
                        raise
            except ValueError as e:
                # Data corruption or invalid format - fail fast
                result["status"] = "invalid_format"
                raise ValueError(f"Step {processor_name} failed validation: {e}") from e
                
    if result["status"] != "failed":
        with open(os.path.join(output_dir, os.path.basename(file_path)), "wb") as f:
            f.write(current_data)
        result["status"] = "completed"
        
    return result
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