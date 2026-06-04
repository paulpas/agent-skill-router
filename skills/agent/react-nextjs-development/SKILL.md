---
name: react-nextjs-development
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent react nextjs development with multi-factor skill
  selection, fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: react-nextjs-development, react nextjs development, how do i react-nextjs-development,
    orchestrate react-nextjs-development, automate react-nextjs-development, agent
    react-nextjs-development
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
# React Nextjs Development

Orchestrates intelligent skill selection and execution for react nextjs development workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

interface NextProjectState {
  framework: 'app' | 'pages';
  hasTailwind: boolean;
  hasEslint: boolean;
  hasTypeScript: boolean;
  nodeVersion: string;
}

interface TaskSelection {
  command: string;
  args: string[];
  confidence: number;
  fallbackCommand?: string;
}

/**
 * Analyzes Next.js project structure and selects optimal development task.
 * Implements multi-factor scoring: framework type, dependency presence, user intent.
 */
export function selectNextTask(
  projectRoot: string,
  userIntent: string,
  availableTasks: string[]
): TaskSelection {
  // Guard clause - Early Exit (Law 1)
  if (!projectRoot || !existsSync(projectRoot)) {
    throw new Error(`Project root not found: ${projectRoot}`);
  }

  // Parse project state - Make Illegal States Unrepresentable (Law 2)
  const pkg = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf-8'));
  const hasAppRouter = existsSync(join(projectRoot, 'app'));
  const hasPagesRouter = existsSync(join(projectRoot, 'pages'));
  const framework = hasAppRouter ? 'app' : hasPagesRouter ? 'pages' : 'unknown';

  const score = (task: string): number => {
    let match = 0;
    if (task === 'dev' && userIntent.includes('run') && framework !== 'unknown') match += 0.8;
    if (task === 'build' && userIntent.includes('prod') && framework !== 'unknown') match += 0.9;
    if (task === 'lint' && userIntent.includes('check') && pkg.devDependencies?.eslint) match += 0.7;
    if (task === 'typecheck' && pkg.devDependencies?.typescript) match += 0.6;
    return match;
  };

  let bestTask = 'dev';
  let bestScore = 0;

  for (const task of availableTasks) {
    const s = score(task);
    if (s > bestScore) {
      bestScore = s;
      bestTask = task;
    }
  }

  // Atomic Predictability (Law 3) - Return new structure
  return {
    command: 'next',
    args: [bestTask],
    confidence: bestScore,
    fallbackCommand: bestTask === 'build' ? 'dev' : undefined
  };
}
```


### Pattern 2: Execution with Fallback

```typescript
import { execSync } from 'child_process';
import { join } from 'path';

interface ExecutionResult {
  success: boolean;
  output: string;
  attempts: number;
  latencyMs: number;
  fallbackUsed?: boolean;
}

/**
 * Executes Next.js task with resilient fallback chain.
 * Implements Fail Fast, Fail Loud (Law 4) for build/runtime errors.
 */
export function executeNextTask(
  taskConfig: TaskSelection,
  projectRoot: string,
  maxRetries: number = 2
): ExecutionResult {
  const startTime = Date.now();
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Parse context - Ensure trusted state (Law 2)
      const env = { ...process.env, NODE_ENV: taskConfig.command === 'build' ? 'production' : 'development' };
      
      // Execute domain-specific command
      const output = execSync(`cd "${projectRoot}" && npx next ${taskConfig.args.join(' ')}`, {
        env,
        stdio: 'pipe',
        timeout: 300000
      }).toString();

      return {
        success: true,
        output,
        attempts: attempt + 1,
        latencyMs: Date.now() - startTime
      };
    } catch (err: any) {
      lastError = err;
      // Fail Fast - Don't patch bad build state (Law 4)
      if (err.message?.includes('ENOENT') || err.message?.includes('EACCES')) {
        throw new Error(`Critical system error: ${err.message}`);
      }
      
      // Transient error - apply fallback chain
      if (attempt === maxRetries && taskConfig.fallbackCommand) {
        console.warn(`Fallback triggered: switching to ${taskConfig.fallbackCommand}`);
        return executeNextTask({
          ...taskConfig,
          command: taskConfig.fallbackCommand,
          args: [],
          confidence: taskConfig.confidence * 0.8
        }, projectRoot, 0);
      }
    }
  }

  // All retries exhausted - Fail Loud (Law 4)
  throw new Error(`Next.js task failed after ${maxRetries + 1} attempts: ${lastError?.message}`);
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
| `typescript-typing-system` | Provides TypeScript patterns for React components and Next.js API routes |
| `frontend-architecture-patterns` | Covers frontend architectural patterns that complement Next.js project structure |

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

- [Next.js Official Documentation](https://nextjs.org/docs) — Complete official docs covering App Router, Server Components, data fetching, and routing
- [React 19 Documentation](https://react.dev/reference/react) — Official React reference covering hooks, components, and concurrent features
- [TypeScript Handbook](https://www.typescriptlang.org/docs/) — Official TypeScript documentation for type-safe React and Next.js development
- [Vercel Deployment Guide](https://vercel.com/docs/deployments/overview) — Official deployment guide for Next.js applications on Vercel
- [React Server Components Architecture](https://react.dev/blog/2023/03/22/react-labs-what-we-have-been-working-on-march-2023#react-server-components) — React team's documentation on RSC design and implementation