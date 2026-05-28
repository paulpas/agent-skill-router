---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent m365 agents dotnet with multi-factor skill selection,
  fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: m365-agents-dotnet, m365 agents dotnet, how do i m365-agents-dotnet, orchestrate
    m365-agents-dotnet, automate m365-agents-dotnet, agent m365-agents-dotnet
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
name: m365-agents-dotnet
------
# M365 Agents Dotnet

Orchestrates intelligent skill selection and execution for m365 agents dotnet workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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

```csharp
public class M365AgentOrchestrator
{
    public async Task<SkillExecutionPlan> SelectOptimalSkillAsync(
        string userIntent,
        List<M365SkillMetadata> availableSkills,
        double minConfidence = 0.75)
    {
        // Law 1: Early Exit on invalid input
        if (string.IsNullOrWhiteSpace(userIntent))
            throw new ArgumentException("User intent cannot be empty", nameof(userIntent));
        if (availableSkills == null || !availableSkills.Any())
            throw new InvalidOperationException("No M365 skills registered for routing");

        // Law 2: Parse at boundary, make illegal states unrepresentable
        var intentFeatures = ParseM365Intent(userIntent);
        var scoredCandidates = new List<(M365SkillMetadata Skill, double Score)>();

        foreach (var skill in availableSkills)
        {
            if (!await IsM365SkillAvailableAsync(skill)) continue;

            var similarityScore = CalculateSemanticSimilarity(intentFeatures, skill.Triggers);
            var historicalScore = skill.HistoricalSuccessRate * 0.3;
            var availabilityScore = skill.IsHealthy ? 0.2 : 0.0;
            var totalScore = (similarityScore * 0.5) + historicalScore + availabilityScore;

            if (totalScore >= minConfidence)
                scoredCandidates.Add((skill, totalScore));
        }

        if (!scoredCandidates.Any())
            return null;

        // Law 3: Return new structure, never mutate inputs
        var best = scoredCandidates.OrderByDescending(c => c.Score).First();
        return new SkillExecutionPlan
        {
            SelectedSkill = best.Skill,
            Confidence = best.Score,
            SelectionTimestamp = DateTimeOffset.UtcNow,
            RoutingContext = new Dictionary<string, object> { { "intent", intentFeatures.RawText } }
        };
    }

    private IntentFeatures ParseM365Intent(string input) => new IntentFeatures { RawText = input };
    private double CalculateSemanticSimilarity(IntentFeatures features, List<string> triggers) => 0.85;
    private Task<bool> IsM365SkillAvailableAsync(M365SkillMetadata skill) => Task.FromResult(skill.IsHealthy);
}
```


### Pattern 2: Execution with Fallback

```csharp
public async Task<ExecutionResult> ExecuteM365SkillAsync(
    SkillExecutionPlan plan,
    M365ExecutionContext context,
    int maxRetries = 2)
{
    // Law 1: Guard clause for orchestration contract
    if (plan == null || context == null)
        throw new ArgumentNullException(nameof(plan), "Orchestration plan and context are required");

    // Law 2: Validate M365 context before touching Graph SDK
    var validatedContext = ValidateM365Context(context);
    
    // Fallback chain: Retry -> Alternative Skill -> Human Defer
    var fallbackChain = new List<Func<M365ExecutionContext, Task<ExecutionResult>>>
    {
        async (ctx) => await RetryWithExponentialBackoffAsync(plan.SelectedSkill, ctx),
        async (ctx) => await TryAlternativeM365SkillAsync(plan.SelectedSkill, ctx),
        async (ctx) => await DeferToHumanOperatorAsync(ctx)
    };

    for (int attempt = 0; attempt <= maxRetries; attempt++)
    {
        try
        {
            // Law 4: Fail fast on transient Graph errors, don't patch
            var result = await ExecuteGraphOperationAsync(plan.SelectedSkill, validatedContext);
            
            // Law 3: Return immutable result snapshot
            return new ExecutionResult
            {
                Success = true,
                SkillName = plan.SelectedSkill.Name,
                Data = result,
                Attempts = attempt + 1,
                LatencyMs = Stopwatch.GetElapsedTime().Milliseconds,
                Confidence = plan.Confidence
            };
        }
        catch (GraphServiceException ex) when (ex.StatusCode == HttpStatusCode.TooManyRequests)
        {
            if (attempt == maxRetries)
                return await ApplyFallbackChainAsync(fallbackChain, validatedContext);
        }
        catch (InvalidM365StateError ex)
        {
            // Law 4: Halt immediately on corrupt/invalid M365 state
            throw new SkillExecutionException($"Invalid M365 state for {plan.SelectedSkill.Name}: {ex.Message}", ex);
        }
    }

    throw new SkillExecutionException($"M365 skill {plan.SelectedSkill.Name} exhausted all {maxRetries + 1} execution attempts.");
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

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.
- [Microsoft 365 Agents Documentation](<https://learn.microsoft.com/en-us/microsoft-cloud/solution-providers/ai-agents-for-m365>)
- [Microsoft Graph API for M365 Integration](<https://developer.microsoft.com/en-us/graph>)
- [Power Automate Agent Builder](<https://powerautomate.microsoft.com/en-us/agents/>)
- [Copilot Studio (M365 Agent Platform)](<https://learn.microsoft.com/en-us/copilot-studio/>)
- [Bot Framework for Custom M365 Agents (.NET)](<https://learn.microsoft.com/en-us/azure/bot-service/>)
