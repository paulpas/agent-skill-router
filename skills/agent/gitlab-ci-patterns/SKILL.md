---
name: gitlab-ci-patterns
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent gitlab ci patterns with multi-factor skill selection,
  fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: gitlab-ci-patterns, gitlab ci patterns, how do i gitlab-ci-patterns, orchestrate
    gitlab-ci-patterns, automate gitlab-ci-patterns, agent gitlab-ci-patterns
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
# Gitlab Ci Patterns

Orchestrates intelligent skill selection and execution for gitlab ci patterns workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def analyze_gitlab_ci_patterns(config_path: str, pipeline_context: Dict) -> Dict:
    """Analyze a GitLab CI configuration and recommend optimal patterns.
    
    Evaluates job dependencies, runner requirements, caching strategies,
    and matrix builds to select the most efficient CI pattern.
    
    Args:
        config_path: Path to .gitlab-ci.yml or CI config string
        pipeline_context: Dict containing project_id, branch, and trigger_type
        
    Returns:
        Dict with recommended patterns, job graph, and optimization hints
    """
    import yaml
    from pathlib import Path
    
    # Parse CI config safely
    if Path(config_path).exists():
        with open(config_path, 'r') as f:
            ci_config = yaml.safe_load(f)
    else:
        ci_config = yaml.safe_load(config_path)
        
    if not ci_config or 'stages' not in ci_config:
        raise ValueError("Invalid GitLab CI config: missing 'stages' definition")
        
    stages = ci_config['stages']
    jobs = ci_config.get('default', {}).get('services', [])
    job_graph = {}
    patterns_applied = []
    
    # Analyze job dependencies and apply patterns
    for stage_idx, stage in enumerate(stages):
        stage_jobs = [j for j in ci_config.get('jobs', []) if j.get('stage') == stage]
        for job in stage_jobs:
            job_name = job['name']
            needs = job.get('needs', [])
            job_graph[job_name] = {
                'stage': stage,
                'dependencies': needs,
                'runner_type': job.get('tags', ['docker']),
                'cache_key': job.get('cache', {}).get('key', None)
            }
            
            # Pattern: Matrix Build Detection
            if 'variables' in job and 'matrix' in job['variables']:
                patterns_applied.append('matrix_build')
                
            # Pattern: Cache Optimization
            if job.get('cache'):
                patterns_applied.append('artifact_cache')
                
    # Fallback: If no patterns detected, suggest standard pipeline structure
    if not patterns_applied:
        patterns_applied.append('standard_pipeline')
        
    return {
        'job_graph': job_graph,
        'recommended_patterns': list(set(patterns_applied)),
        'pipeline_context': pipeline_context,
        'validation_status': 'valid'
    }
```


### Pattern 2: Execution with Fallback

```python
def execute_gitlab_pipeline(config: Dict, fallback_strategy: str = 'retry_with_cache') -> Dict:
    """Execute a GitLab CI pipeline with intelligent fallback handling.
    
    Runs the validated CI configuration against GitLab's API, monitors
    runner availability, and applies fallback strategies on failure.
    
    Args:
        config: Validated CI config dict from analyze_gitlab_ci_patterns
        fallback_strategy: Strategy to use on runner/pipeline failure
        
    Returns:
        Dict with pipeline_id, status, logs, and fallback metadata
    """
    import requests
    import time
    
    gitlab_url = config.get('gitlab_url', 'https://gitlab.com')
    project_id = config['pipeline_context']['project_id']
    token = config.get('api_token')
    
    if not token:
        raise ValueError("GitLab API token required for pipeline execution")
        
    headers = {'PRIVATE-TOKEN': token}
    payload = {
        'ref': config['pipeline_context'].get('branch', 'main'),
        'variables': [{'key': 'CI_PATTERN', 'value': config['recommended_patterns'][0]}]
    }
    
    max_attempts = 3
    for attempt in range(max_attempts):
        try:
            # Trigger pipeline
            resp = requests.post(f'{gitlab_url}/api/v4/projects/{project_id}/pipeline', 
                                 json=payload, headers=headers)
            resp.raise_for_status()
            pipeline_id = resp.json()['id']
            
            # Monitor pipeline status
            status = 'pending'
            while status in ('pending', 'running'):
                time.sleep(5)
                status_resp = requests.get(f'{gitlab_url}/api/v4/projects/{project_id}/pipelines/{pipeline_id}', 
                                           headers=headers)
                status = status_resp.json()['status']
                
            return {
                'pipeline_id': pipeline_id,
                'status': status,
                'patterns_applied': config['recommended_patterns'],
                'attempts': attempt + 1,
                'fallback_used': False
            }
            
        except requests.exceptions.ConnectionError:
            if attempt == max_attempts - 1:
                return _apply_gitlab_fallback(config, fallback_strategy)
            time.sleep(2 ** attempt)
            
    return {'status': 'failed', 'error': 'Max retries exceeded'}
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


## Related Skills

| Skill | Purpose |
|