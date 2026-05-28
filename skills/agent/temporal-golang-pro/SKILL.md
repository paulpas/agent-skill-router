---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent temporal golang pro with multi-factor skill selection,
  fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: temporal-golang-pro, temporal golang pro, how do i temporal-golang-pro,
    orchestrate temporal-golang-pro, automate temporal-golang-pro, agent temporal-golang-pro
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
name: temporal-golang-pro
------
# Temporal Golang Pro

Orchestrates intelligent skill selection and execution for temporal golang pro workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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

```go
// EvaluateActivityCandidates selects the optimal Temporal activity based on
// multi-factor scoring: trigger match, historical success rate, and dependency health.
func EvaluateActivityCandidates(ctx context.Context, request string, candidates []ActivityMetadata) (*ActivityMetadata, error) {
	if request == "" {
		return nil, fmt.Errorf("request cannot be empty")
	}
	if len(candidates) == 0 {
		return nil, fmt.Errorf("no candidate activities available")
	}

	// Parse request features (Law 2: Make illegal states unrepresentable)
	features := ExtractRequestFeatures(request)
	var bestMatch *ActivityMetadata
	var highestScore float64

	for i := range candidates {
		c := &candidates[i]
		if !c.IsAvailable(ctx) {
			continue
		}

		score := CalculateMatchScore(features, c.Triggers) * c.HistoricalSuccessRate
		if score > highestScore && score >= 0.7 {
			highestScore = score
			bestMatch = c
		}
	}

	if bestMatch == nil {
		return nil, fmt.Errorf("no activity met minimum confidence threshold")
	}

	// Return new struct, never mutate input (Law 3: Atomic Predictability)
	return &ActivityMetadata{
		Name:              bestMatch.Name,
		Version:           bestMatch.Version,
		SelectedConfidence: highestScore,
		SelectionTime:     time.Now(),
	}, nil
}
```


### Pattern 2: Execution with Fallback

```go
// ExecuteWithFallback runs a Temporal activity with a structured retry and fallback chain.
// Implements Fail Fast, Fail Loud (Law 4) and Early Exit (Law 1).
func ExecuteWithFallback(ctx workflow.Context, activity ActivityMetadata, input ActivityInput) (*ActivityResult, error) {
	if !IsValidActivity(activity) {
		return nil, fmt.Errorf("invalid activity metadata: %s", activity.Name)
	}

	// Validate input at boundary (Law 2)
	validatedInput, err := ParseActivityInput(input)
	if err != nil {
		return nil, fmt.Errorf("failed to parse input for %s: %w", activity.Name, err)
	}

	retryPolicy := &temporal.RetryPolicy{
		InitialInterval:    time.Second,
		BackoffCoefficient: 2.0,
		MaximumInterval:    time.Minute,
		MaximumAttempts:    3,
	}

	var lastErr error
	for attempt := 0; attempt <= retryPolicy.MaximumAttempts; attempt++ {
		var result interface{}
		err := workflow.ExecuteActivity(ctx, temporal.ActivityOptions{
			RetryPolicy: retryPolicy,
			TaskQueue:   activity.TaskQueue,
		}, activity.Name, validatedInput).Get(ctx, &result)

		if err == nil {
			return &ActivityResult{
				Success:  true,
				Data:     result,
				Attempts: attempt + 1,
				Latency:  time.Since(ctx.Value(startTimeKey).(time.Time)),
			}, nil
		}

		lastErr = err
		if IsTransientError(err) {
			continue
		}
		// Permanent error - fail fast, do not retry
		break
	}

	// Fallback chain: try alternative activity or return structured error
	if activity.FallbackActivity != "" {
		var fallbackResult interface{}
		err := workflow.ExecuteActivity(ctx, temporal.ActivityOptions{
			RetryPolicy: retryPolicy,
			TaskQueue:   activity.TaskQueue,
		}, activity.FallbackActivity, validatedInput).Get(ctx, &fallbackResult)
		if err == nil {
			return &ActivityResult{Success: true, Data: fallbackResult, Fallback: true}, nil
		}
	}

	return nil, fmt.Errorf("activity %s failed after retries and fallback: %w", activity.Name, lastErr)
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
|---|---|
| `temporal-python-pro` | Python equivalent of the Temporal workflow patterns covered in this Go-focused skill |
| `workflow-patterns` | General workflow orchestration patterns that complement Temporal-specific implementations |

## Live References

> Authoritative documentation links for this domain. The model follows markdown links at load time to resolve external references and inline content.

- [Temporal.io Workflow Documentation](https://docs.temporal.io/workflows) — Official Temporal documentation on building reliable workflows with Go
- [Go Concurrency Patterns (Effective Go)](https://go.dev/doc/effective_go#goroutines) — Effective Go guide to goroutines, channels, and concurrency patterns used in Temporal workers
- [Temporal Go SDK Reference](https://pkg.go.dev/go.temporal.io/sdk) — Official Temporal Go SDK API reference documentation
- [Durable Execution Patterns (Temporal Blog)](https://temporal.io/blog) — Temporal's engineering blog on durable execution, saga patterns, and workflow orchestration
- [Go Testing Patterns for Workers](https://go.dev/doc/tutorial/add-a-workflow) — Official Go tutorial including testing patterns for Temporal workflow applications