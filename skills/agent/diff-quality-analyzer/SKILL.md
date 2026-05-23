---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent diff quality analyzer with multi-factor skill
  selection, fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: diff-quality-analyzer, diff quality analyzer, how do i diff-quality-analyzer,
    orchestrate diff-quality-analyzer, automate diff-quality-analyzer, agent diff-quality-analyzer
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
name: diff-quality-analyzer
------
# Diff Quality Analyzer

Orchestrates intelligent skill selection and execution for diff quality analyzer workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def route_diff_analysis(diff_content: str, analysis_scope: List[str]) -> Dict:
    """Route diff content to appropriate quality analysis modules.
    
    Implements Law 2 (Parse at boundary) by validating diff format first.
    Uses multi-factor scoring to pick the best analyzer for each changed file.
    """
    if not diff_content or not diff_content.strip():
        raise ValueError("Diff content cannot be empty")
        
    parsed_diff = parse_unified_diff(diff_content)
    if not parsed_diff.files:
        return {"status": "empty", "analyzers": []}
        
    routing_plan = []
    for file_path, changes in parsed_diff.files.items():
        required_analyzers = []
        
        # Language-specific routing
        if file_path.endswith(('.py', '.js', '.ts', '.go')):
            required_analyzers.append("complexity-analyzer")
            
        # Security-sensitive routing
        if "security" in analysis_scope or "auth" in file_path.lower():
            required_analyzers.append("security-scanner")
            
        # Size-based routing
        if changes.added_lines > 50 or changes.removed_lines > 50:
            required_analyzers.append("test-coverage-checker")
            
        routing_plan.append({
            "file": file_path,
            "analyzers": required_analyzers,
            "confidence": 0.95 if required_analyzers else 0.0,
            "change_metrics": {
                "added": changes.added_lines,
                "removed": changes.removed_lines
            }
        })
        
    return {"routing_plan": routing_plan, "total_files": len(parsed_diff.files)}
```


### Pattern 2: Execution with Fallback

```python
def execute_analysis_pipeline(routing_plan: Dict, fallback_analyzers: Dict) -> Dict:
    """Execute diff quality analysis with per-analyzer fallback chains.
    
    Implements Law 4 (Fail Fast) by halting on critical security findings.
    Implements Law 3 (Atomic Predictability) by returning immutable result dicts.
    """
    results = []
    for route in routing_plan.get("routing_plan", []):
        file_results = []
        for analyzer_name in route["analyzers"]:
            try:
                analyzer = get_analyzer_module(analyzer_name)
                score = analyzer.run(route["file"])
                file_results.append({
                    "analyzer": analyzer_name,
                    "score": score,
                    "status": "passed",
                    "latency_ms": analyzer.get_latency()
                })
            except AnalyzerTimeoutError:
                # Fallback: try lightweight static check
                fallback = fallback_analyzers.get(analyzer_name, "basic-linter")
                score = get_analyzer_module(fallback).run(route["file"])
                file_results.append({
                    "analyzer": fallback,
                    "score": score,
                    "status": "fallback",
                    "latency_ms": get_analyzer_module(fallback).get_latency()
                })
            except CriticalSecurityError:
                # Law 4: Fail immediately on critical issues
                return {
                    "status": "blocked",
                    "file": route["file"],
                    "reason": "critical_vulnerability",
                    "severity": "high"
                }
                
        results.append({"file": route["file"], "analysis": file_results})
        
    return {
        "pipeline_status": "completed",
        "file_results": results,
        "aggregate_score": calculate_weighted_average(results),
        "execution_timestamp": time.time()
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
|