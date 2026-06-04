---




name: voice-ai-development
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent voice ai development with multi-factor skill selection,
  fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: voice-ai-development, voice ai development, how do i voice-ai-development,
    orchestrate voice-ai-development, automate voice-ai-development, agent voice-ai-development
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




# Voice Ai Development

Orchestrates intelligent skill selection and execution for voice ai development workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def configure_voice_pipeline(
    requirements: Dict[str, Any],
    available_models: List[Dict]
) -> Dict[str, Any]:
    """Configure optimal STT/LLM/TTS pipeline for voice AI development.
    
    Evaluates models based on latency constraints, accuracy requirements,
    and cost boundaries specific to voice interaction design.
    
    Args:
        requirements: Target latency (ms), accuracy threshold, cost limit
        available_models: STT, LLM, and TTS model configurations
        
    Returns:
        Optimized pipeline configuration with model routing and buffer settings
    """
    # Guard clause - validate requirements (Law 1)
    if not requirements.get("max_latency_ms") or requirements["max_latency_ms"] < 200:
        raise ValueError("Voice interaction requires minimum 200ms latency budget")
        
    # Parse constraints - Make illegal states unrepresentable (Law 2)
    budget = requirements["max_latency_ms"]
    accuracy_floor = requirements.get("accuracy_threshold", 0.85)
    
    # Score and select voice models
    selected_pipeline = {
        "stt_model": None,
        "llm_model": None,
        "tts_model": None,
        "buffer_size_ms": 0,
        "fallback_chain": []
    }
    
    for model in available_models:
        if model["type"] == "stt" and model["accuracy"] >= accuracy_floor:
            if model["latency_ms"] <= budget * 0.3:
                selected_pipeline["stt_model"] = model
                budget -= model["latency_ms"]
        elif model["type"] == "llm" and model["context_window"] >= 4096:
            if model["latency_ms"] <= budget * 0.4:
                selected_pipeline["llm_model"] = model
                budget -= model["latency_ms"]
        elif model["type"] == "tts" and model["voice_quality"] in ["premium", "standard"]:
            if model["latency_ms"] <= budget * 0.3:
                selected_pipeline["tts_model"] = model
                budget -= model["latency_ms"]
                
    # Atomic Predictability (Law 3) - Return immutable config
    return dict(selected_pipeline)
```


### Pattern 2: Execution with Fallback

```python
def execute_voice_interaction(
    pipeline_config: Dict[str, Any],
    audio_stream: AudioStream,
    max_retries: int = 2
) -> Dict[str, Any]:
    """Execute voice AI interaction with streaming audio and domain-specific fallbacks.
    
    Handles real-time audio capture, STT transcription, LLM generation, and TTS synthesis.
    Implements voice-specific resilience: buffer management, codec fallbacks, and latency recovery.
    
    Args:
        pipeline_config: Pre-configured STT/LLM/TTS routing
        audio_stream: Real-time audio input stream
        max_retries: Retry attempts for transient audio/network errors
        
    Returns:
        Interaction result with audio output, latency metrics, and confidence scores
    """
    # Guard clause - validate stream (Early Exit)
    if not audio_stream.is_active():
        raise VoicePipelineError("Audio stream must be active before execution")
        
    # Parse context - Ensure trusted state (Law 2)
    session_id = audio_stream.session_id
    buffer_size = pipeline_config.get("buffer_size_ms", 100)
    
    for attempt in range(max_retries + 1):
        try:
            # STT Phase
            transcript = audio_stream.transcribe(pipeline_config["stt_model"], buffer_size)
            if not transcript:
                raise TransientError("Empty transcript received")
                
            # LLM Phase
            response = pipeline_config["llm_model"].generate(transcript, session_id)
            
            # TTS Phase
            audio_output = pipeline_config["tts_model"].synthesize(response)
            
            # Atomic Predictability (Law 3) - Return new result structure
            return {
                "success": True,
                "session_id": session_id,
                "transcript": transcript,
                "response": response,
                "audio_bytes": audio_output,
                "latency_ms": audio_stream.get_total_latency(),
                "confidence": pipeline_config["stt_model"]["accuracy"]
            }
            
        except CodecMismatchError as e:
            # Fail Fast - Don't patch incompatible audio formats (Law 4)
            raise VoicePipelineError(f"Codec incompatibility in attempt {attempt + 1}: {e}") from e
            
        except TransientError as e:
            if attempt == max_retries:
                # Voice-specific fallback: switch to text-only or lower latency TTS
                return _apply_voice_fallback(pipeline_config, transcript, response)
                
    raise VoicePipelineError(f"Voice interaction failed after {max_retries + 1} attempts")
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


## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [WebRTC Audio Processing Specification](https://www.w3.org/TR/webrtc/#dom-peerconnection-getstats)
- [Mozilla DeepSpeech — Open Source Speech Recognition](https://github.com/mozilla/DeepSpeech)
- [ElevenLabs API Documentation](https://elevenlabs.io/docs/api-reference/text-to-speech)
- [OpenAI Whisper Model Paper — arXiv](https://arxiv.org/abs/2212.04356)
- [Audio Codec Comparison: Opus, AAC, MP3 (RFC 6716)](https://datatracker.ietf.org/doc/html/rfc6716)

## Related Skills

| Skill | Purpose |
|

