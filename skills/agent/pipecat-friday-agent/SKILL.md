---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent pipecat friday agent with multi-factor skill selection,
  fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: pipecat-friday-agent, pipecat friday agent, how do i pipecat-friday-agent,
    orchestrate pipecat-friday-agent, automate pipecat-friday-agent, agent pipecat-friday-agent
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
name: pipecat-friday-agent
------
# Pipecat Friday Agent

Orchestrates intelligent skill selection and execution for pipecat friday agent workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def evaluate_pipecat_skill_candidates(
    request: PipecatRequest,
    available_tools: List[ToolMetadata],
    session_state: SessionContext
) -> Optional[ToolMetadata]:
    """Evaluate and score available Pipecat tools for the current request.
    
    Applies multi-factor scoring tailored to real-time voice/agent workflows:
    - Semantic match between request intent and tool capabilities
    - Real-time latency and throughput metrics
    - Historical success rate within the current session context
    - Dependency health (e.g., LLM provider, TTS engine, STT service)
    """
    if not request.intent or not available_tools:
        raise ValueError("Request intent and available tools are required")
    
    scored_candidates = []
    for tool in available_tools:
        # Calculate semantic relevance using request embeddings vs tool capabilities
        semantic_score = _compute_embedding_similarity(request.intent, tool.capabilities)
        
        # Factor in real-time system health and historical session performance
        health_score = tool.metrics.get("current_latency_ms", 9999) / 1000.0
        history_score = session_state.get_tool_history(tool.name, window="24h").success_rate
        
        # Weighted composite score
        composite = (0.5 * semantic_score) + (0.3 * min(1.0, 1.0 / max(health_score, 0.1))) + (0.2 * history_score)
        
        if composite >= 0.65:
            scored_candidates.append({
                "tool": tool,
                "score": composite,
                "latency_ms": tool.metrics.get("current_latency_ms"),
                "confidence": history_score
            })
    
    if not scored_candidates:
        return None
        
    scored_candidates.sort(key=lambda x: x["score"], reverse=True)
    return scored_candidates[0]["tool"]
```


### Pattern 2: Execution with Fallback

```python
def run_pipecat_agent_workflow(
    selected_tool: ToolMetadata,
    request: PipecatRequest,
    session_state: SessionContext,
    fallback_chain: List[ToolMetadata]
) -> AgentResponse:
    """Execute the selected Pipecat tool with domain-specific fallback handling.
    
    Implements resilient execution for real-time voice/agent interactions:
    1. Direct execution with timeout and circuit breaker
    2. Fallback to alternative tool if primary fails or degrades
    3. Graceful degradation to text-only if voice pipeline fails
    4. Human handoff for critical/unhandled intents
    """
    try:
        # Execute with strict timeout to maintain real-time UX
        response = selected_tool.execute(
            payload=request.payload,
            context=session_state,
            timeout_ms=3000
        )
        
        # Validate response integrity before returning
        if not response.is_valid():
            raise ToolValidationError(f"Invalid response from {selected_tool.name}")
            
        # Update session history for adaptive routing
        session_state.record_execution(selected_tool.name, success=True, latency=response.latency_ms)
        return AgentResponse(success=True, data=response, tool=selected_tool.name)
        
    except TimeoutError:
        session_state.record_execution(selected_tool.name, success=False, latency=3000)
        return _apply_pipecat_fallback(selected_tool, fallback_chain, request, session_state)
        
    except ToolValidationError as e:
        session_state.record_execution(selected_tool.name, success=False, latency=0)
        raise AgentExecutionError(f"Pipeline validation failed: {e}") from e
        
    except Exception as e:
        session_state.record_execution(selected_tool.name, success=False, latency=0)
        return _apply_pipecat_fallback(selected_tool, fallback_chain, request, session_state)
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
| `langgraph-implementation` | Provides LangGraph-specific implementation patterns that Pipecat integrates with |
| `real-time-audio-processing` | Covers audio pipeline design that complements Pipecat's streaming architecture |

## Live References

> Authoritative documentation links for this domain. The model follows markdown links at load time to resolve external references and inline content.

- [Pipecat Documentation](https://docs.pipecat.ai) — Official documentation for the Pipecat real-time audio/video framework
- [Pipecat GitHub Repository](https://github.com/pipecat-ai/pipecat) — Source code, examples, and contribution guidelines
- [WebRTC Real-Time Communication](https://webrtc.org/getting-started/overview) — Foundational protocol documentation for real-time streaming used by Pipecat
- [VAD (Voice Activity Detection) Algorithms](https://github.com/wiseman/py-webrtcvad) — Voice activity detection reference implementation commonly used in audio pipelines
- [STT/TTS Integration Patterns for Real-Time AI](https://platform.openai.com/docs/guides/speech-to-text) — Best practices for integrating speech recognition and synthesis in streaming applications