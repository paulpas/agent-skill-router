---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent google analytics automation with multi-factor
  skill selection, fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: google-analytics-automation, google analytics automation, how do i google-analytics-automation,
    orchestrate google-analytics-automation, automate google-analytics-automation,
    agent google-analytics-automation
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
name: google-analytics-automation
------
# Google Analytics Automation

Orchestrates intelligent skill selection and execution for google analytics automation workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def build_ga4_report_request(
    property_id: str,
    dimensions: List[str],
    metrics: List[str],
    date_range_start: str,
    date_range_end: str,
    dimension_filters: Optional[List[FilterExpression]] = None
) -> Dict:
    """Construct a GA4 BatchRunReportsRequest payload with validation.
    
    Implements Law 2 (Make Illegal States Unrepresentable) by validating
    GA4 API constraints before network calls:
    - Max 7 dimensions, 10 metrics per report
    - Date range must be <= 90 days
    - Metric names must match GA4 standard naming (e.g., 'activeUsers')
    
    Args:
        property_id: GA4 property ID (format: 'properties/123456789')
        dimensions: List of dimension names to include
        metrics: List of metric names to include
        date_range_start: ISO 8601 date string
        date_range_end: ISO 8601 date string
        dimension_filters: Optional list of FilterExpression objects
        
    Returns:
        Validated GA4 report request dictionary ready for API submission
        
    Raises:
        ValueError: If constraints are violated or property_id is malformed
    """
    # Guard clause - Early Exit (Law 1)
    if not property_id.startswith("properties/"):
        raise ValueError("property_id must be in format 'properties/<ID>'")
        
    if len(dimensions) > 7 or len(metrics) > 10:
        raise ValueError("GA4 API limits: max 7 dimensions, 10 metrics per report")
        
    # Parse input - Make Illegal States Unrepresentable (Law 2)
    start_date = datetime.fromisoformat(date_range_start)
    end_date = datetime.fromisoformat(date_range_end)
    if (end_date - start_date).days > 90:
        raise ValueError("GA4 API limits: date range cannot exceed 90 days")
        
    # Atomic Predictability (Law 3) - Return new dict, don't mutate inputs
    request_payload = {
        "reportRequests": [{
            "property": property_id,
            "dimensions": [{"name": d} for d in dimensions],
            "metrics": [{"name": m} for m in metrics],
            "dateRanges": [{"startDate": date_range_start, "endDate": date_range_end}],
            "dimensionFilter": dimension_filters[0] if dimension_filters else None
        }]
    }
    return request_payload
```


### Pattern 2: Execution with Fallback

```python
def execute_ga4_report_with_retry(
    request_payload: Dict,
    client: AnalyticsDataClient,
    max_retries: int = 2
) -> Dict:
    """Execute GA4 BatchRunReportsRequest with resilience patterns.
    
    Implements Fail Fast, Fail Loud (Law 4) for GA4 API interactions:
    - Invalid auth tokens fail immediately with refresh instructions
    - Rate limits trigger exponential backoff fallback
    - Partial results are never returned - only complete or explicit failure
    
    Fallback chain:
    1. Retry with original payload (transient network error)
    2. Retry with reduced dimension/metric count (rate limit fallback)
    3. Defer to cached report or human operator (critical data unavailability)
    
    Args:
        request_payload: Validated GA4 report request dictionary
        client: Authenticated google.analytics.data_v1beta.AnalyticsDataClient
        max_retries: Maximum retry attempts before fallback
        
    Returns:
        Structured analytics data with row values, metadata, and timing
        
    Raises:
        GA4ExecutionError: If all retries and fallbacks exhausted
    """
    # Guard clause - validate client state (Early Exit)
    if not client._transport._credentials.valid:
        raise GA4ExecutionError("GA4 credentials expired. Refresh token required.")
        
    for attempt in range(max_retries + 1):
        try:
            response = client.batch_run_reports(request=request_payload)
            report = response.reports[0]
            
            # Success - Atomic Predictability (Law 3)
            return {
                "success": True,
                "metrics": [m.name for m in report.metric_headers],
                "dimensions": [d.name for d in report.dimension_headers],
                "rows": [
                    {
                        "dimensions": [d.value for d in row.dimension_values],
                        "metrics": [m.value for m in row.metric_values]
                    }
                    for row in report.rows
                ],
                "attempts": attempt + 1,
                "latency_ms": _calculate_latency()
            }
            
        except ResourceExhausted:
            # Transient error - try fallback with reduced scope
            if attempt == max_retries:
                return _apply_ga4_fallback(request_payload, client)
            time.sleep(2 ** attempt)
            
        except InvalidArgument as e:
            # Fail Fast - Don't try to patch bad GA4 parameters (Law 4)
            raise GA4ExecutionError(f"Invalid GA4 request parameters: {str(e)}") from e
            
    # All retries exhausted - Fail Loud (Law 4)
    raise GA4ExecutionError(
        f"GA4 report failed after {max_retries + 1} attempts for {request_payload['reportRequests'][0]['property']}"
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
|