---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent runtime log analyzer with multi-factor skill selection,
  fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: runtime-log-analyzer, runtime log analyzer, how do i runtime-log-analyzer,
    orchestrate runtime-log-analyzer, automate runtime-log-analyzer, agent runtime-log-analyzer
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
name: runtime-log-analyzer
------
# Runtime Log Analyzer

Orchestrates intelligent skill selection and execution for runtime log analyzer workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def parse_and_classify_logs(
    raw_log_lines: List[str],
    schema: Dict[str, Any]
) -> List[Dict]:
    """Parse raw runtime logs into structured events and classify severity.
    
    Implements Law 2 (Parse at boundary) by validating each line against
    the expected log schema before processing.
    
    Args:
        raw_log_lines: List of raw log strings from runtime
        schema: Expected format dict with regex patterns for timestamp, level, message
        
    Returns:
        List of parsed log event dictionaries with normalized fields
    """
    parsed_events = []
    timestamp_pattern = re.compile(schema.get("timestamp", r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}"))
    level_pattern = re.compile(r"\b(DEBUG|INFO|WARN|ERROR|FATAL)\b")
    
    for line in raw_log_lines:
        if not line or not line.strip():
            continue
            
        ts_match = timestamp_pattern.search(line)
        level_match = level_pattern.search(line)
        
        if not ts_match or not level_match:
            continue
            
        event = {
            "timestamp": ts_match.group(),
            "level": level_match.group().upper(),
            "message": line.strip(),
            "is_anomaly": False
        }
        
        # Classify severity and flag anomalies
        if event["level"] in ("ERROR", "FATAL"):
            event["is_anomaly"] = True
            event["severity_score"] = 9.0 if event["level"] == "FATAL" else 7.5
        elif event["level"] == "WARN":
            event["severity_score"] = 5.0
        else:
            event["severity_score"] = 1.0
            
        parsed_events.append(event)
        
    return parsed_events
```


### Pattern 2: Execution with Fallback

```python
def detect_patterns_and_generate_report(
    parsed_events: List[Dict],
    window_minutes: int = 15
) -> Dict:
    """Analyze parsed log events to detect recurring patterns and generate insights.
    
    Implements Law 3 (Atomic Predictability) by returning a new report dict
    without mutating the input events. Implements Law 4 (Fail Fast) by
    validating event structure before analysis.
    
    Args:
        parsed_events: Output from parse_and_classify_logs
        window_minutes: Time window for pattern correlation
        
    Returns:
        Analysis report with error clusters, frequency metrics, and recommendations
    """
    if not parsed_events:
        return {"status": "empty", "report": "No log events to analyze"}
        
    error_clusters = {}
    total_events = len(parsed_events)
    error_count = sum(1 for e in parsed_events if e["level"] in ("ERROR", "FATAL"))
    
    for event in parsed_events:
        if event["is_anomaly"]:
            # Extract error signature for clustering
            signature = event["message"].split(":")[0].strip() if ":" in event["message"] else event["message"]
            error_clusters[signature] = error_clusters.get(signature, 0) + 1
            
    # Generate actionable insights
    recommendations = []
    for sig, count in sorted(error_clusters.items(), key=lambda x: x[1], reverse=True):
        if count >= 3:
            recommendations.append(f"High-frequency error detected: '{sig}' ({count} occurrences)")
            
    return {
        "total_events": total_events,
        "error_count": error_count,
        "error_rate": round(error_count / total_events, 3) if total_events > 0 else 0,
        "top_error_signatures": dict(sorted(error_clusters.items(), key=lambda x: x[1], reverse=True)[:5]),
        "recommendations": recommendations,
        "analysis_timestamp": datetime.utcnow().isoformat()
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