---
name: m365-agents-ts
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent m365 agents ts with multi-factor skill selection,
  fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: m365-agents-ts, m365 agents ts, how do i m365-agents-ts, orchestrate m365-agents-ts,
    automate m365-agents-ts, agent m365-agents-ts
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
# M365 Agents Ts

Orchestrates intelligent skill selection and execution for m365 agents ts workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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

```typescript
import { GraphClient, AgentCapability, SkillMetadata } from '@microsoft/m365-agents-sdk';

export async function routeM365AgentSkill(
  userContext: { tenantId: string; userId: string; intent: string },
  availableAgents: AgentCapability[],
  minConfidence: number = 0.75
): Promise<SkillMetadata | null> {
  // Law 1: Early exit on invalid boundary input
  if (!userContext.intent?.trim()) {
    throw new Error("Intent extraction failed: empty user context");
  }

  const graphClient = new GraphClient(userContext.tenantId);
  const userPermissions = await graphClient.getPermissions(userContext.userId);
  
  let bestMatch: SkillMetadata | null = null;
  let highestScore = 0;

  for (const agent of availableAgents) {
    // Law 2: Parse & validate state before scoring
    const intentMatch = calculateSemanticRelevance(userContext.intent, agent.triggers);
    const permissionMatch = userPermissions.includes(agent.requiredPermission) ? 1.0 : 0.0;
    const healthScore = await graphClient.getAgentHealth(agent.id);
    
    // Multi-factor scoring: intent relevance, tenant permissions, service health
    const compositeScore = (intentMatch * 0.5) + (permissionMatch * 0.3) + (healthScore * 0.2);
    
    if (compositeScore > highestScore && compositeScore >= minConfidence) {
      highestScore = compositeScore;
      // Law 3: Return new object, never mutate original capability metadata
      bestMatch = { ...agent, confidence: compositeScore, selectedAt: new Date().toISOString() };
    }
  }

  if (!bestMatch) {
    return null;
  }

  return bestMatch;
}
```


### Pattern 2: Execution with Fallback

```typescript
import { GraphAPIError, RetryPolicy, FallbackChain, ExecutionResult } from '@microsoft/m365-agents-sdk';

export async function executeM365AgentTask(
  skill: SkillMetadata,
  taskPayload: Record<string, unknown>,
  fallbackChain: FallbackChain
): Promise<ExecutionResult> {
  // Law 2: Validate payload against M365 Graph schema before execution
  const validatedPayload = validateM365Payload(taskPayload, skill.schema);
  const maxRetries = 2;
  const attemptStart = Date.now();
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Law 4: Fail fast on invalid state, don't patch bad data
      const result = await skill.handler(validatedPayload);
      return {
        success: true,
        skillId: skill.id,
        data: result,
        attempts: attempt + 1,
        latencyMs: Date.now() - attemptStart,
        confidence: skill.confidence
      };
    } catch (error) {
      if (error instanceof GraphAPIError && error.status === 429) {
        // Transient rate limit - exponential backoff per M365 Graph guidelines
        await RetryPolicy.exponentialBackoff(attempt, 1000, 5000);
        continue;
      }
      if (error instanceof GraphAPIError && error.status === 403) {
        // Law 4: Hard failure on permission denial
        throw new Error(`Permission denied for ${skill.id}: ${error.message}`);
      }
      if (attempt === maxRetries) {
        // Fallback chain: try alternative M365 service or defer
        const fallbackResult = await fallbackChain.execute(skill.id, validatedPayload);
        if (fallbackResult.success) return fallbackResult;
      }
    }
  }
  
  // Law 4: Fail loud after exhaustion
  throw new Error(`M365 Agent ${skill.id} failed after ${maxRetries + 1} attempts and fallback exhaustion`);
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
- [Microsoft Graph TypeScript SDK](<https://github.com/microsoftgraph/msgraph-sdk-typescript>)
- [Power Platform JavaScript API Reference](<https://learn.microsoft.com/en-us/power-apps/developer/model-driven-apps/clientapi/reference/context>)
- [Node.js M365 Integration Guide](<https://learn.microsoft.com/en-us/graph/sdks/use-nodejs?tabs=JS>)
- [Teams App Development with Node.js](<https://learn.microsoft.com/en-us/microsoftteams/platform/apps-overview>)
- [M365 Copilot Plugin Development](<https://learn.microsoft.com/en-us/copilot-plugins/overview>)
