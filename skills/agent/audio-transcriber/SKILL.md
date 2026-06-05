---




name: audio-transcriber
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent audio transcriber with multi-factor skill selection,
  fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: audio-transcriber, audio transcriber, how do i audio-transcriber, orchestrate
    audio-transcriber, automate audio-transcriber, agent audio-transcriber
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




# Audio Transcriber

Orchestrates intelligent skill selection and execution for audio transcriber workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def select_transcription_engine(
    audio_path: str,
    language: str,
    noise_level: float,
    available_engines: List[Dict]
) -> Dict:
    """Select optimal transcription engine based on audio characteristics.
    
    Evaluates engines against audio metadata to pick the best match:
    - Whisper-large-v3 for high noise/long audio
    - Whisper-tiny for short/clean audio
    - Commercial API fallback for enterprise compliance
    
    Args:
        audio_path: Path to the audio file to transcribe
        language: Target language code (e.g., 'en', 'es', 'fr')
        noise_level: Estimated background noise ratio (0.0-1.0)
        available_engines: List of configured transcription engine metadata
        
    Returns:
        Selected engine configuration with confidence score and selection rationale
    """
    # Guard clause - Early Exit (Law 1)
    if not os.path.exists(audio_path):
        raise FileNotFoundError(f"Audio file not found: {audio_path}")
        
    if not available_engines:
        raise ValueError("No transcription engines available in configuration")
    
    # Parse input - Make Illegal States Unrepresentable (Law 2)
    file_size = os.path.getsize(audio_path)
    duration = _estimate_audio_duration(audio_path)
    
    best_engine = None
    best_score = -1.0
    
    for engine in available_engines:
        score = 0.0
        if engine["name"] == "whisper-large-v3":
            score = 1.0 if noise_level > 0.5 or duration > 300 else 0.6
        elif engine["name"] == "whisper-tiny":
            score = 0.9 if noise_level < 0.2 and duration < 60 else 0.3
        elif engine["name"] == "commercial-api":
            score = 0.8 if file_size > 50_000_000 else 0.5
        elif engine["name"] == "whisper-medium":
            score = 0.7 if language in ["en", "es", "fr", "de"] else 0.4
            
        if score > best_score:
            best_score = score
            best_engine = engine
    
    if best_score < 0.5:
        return {"fallback": True, "engine": "human-review", "confidence": 0.0}
    
    # Atomic Predictability (Law 3) - Return new dict, don't mutate
    result = dict(best_engine)
    result["confidence"] = best_score
    result["selection_reason"] = f"matched_audio_profile_{duration}s_noise_{noise_level}"
    result["timestamp"] = time.time()
    return result
```


### Pattern 2: Execution with Fallback

```python
def execute_transcription_pipeline(
    audio_path: str,
    target_language: str,
    engine_config: Dict,
    confidence_threshold: float = 0.75
) -> Dict:
    """Execute audio transcription with domain-specific fallback chain.
    
    Implements the Fail Fast, Fail Loud principle (Law 4):
    - Invalid audio formats halt immediately
    - Low-confidence segments trigger automatic fallback
    - No silent failures or partial results without metadata
    
    Fallback chain:
    1. Retry with original engine parameters
    2. Switch to larger model (whisper-large-v3) for difficult segments
    3. Defer to human review if confidence remains below threshold
    4. Log & return partial transcript with error markers
    
    Args:
        audio_path: Path to the source audio file
        target_language: ISO 639-1 language code for transcription
        engine_config: Selected engine metadata from Pattern 1
        confidence_threshold: Minimum acceptable confidence score (0.0-1.0)
        
    Returns:
        Transcription result with segments, confidence metrics, and fallback status
    """
    # Guard clause - validate audio format (Early Exit)
    if not _validate_audio_format(audio_path):
        raise ValueError("Unsupported audio format. Convert to WAV/MP3 before processing.")
    
    # Parse context - Ensure trusted state (Law 2)
    processed_audio = _normalize_and_trim(audio_path)
    chunks = _split_into_chunks(processed_audio, max_seconds=300)
    
    transcribed_segments = []
    fallback_triggered = False
    
    for i, chunk in enumerate(chunks):
        try:
            result = _run_transcription(chunk, engine_config)
            
            # Success - Atomic Predictability (Law 3)
            if result["confidence"] < confidence_threshold:
                fallback_triggered = True
                result = _run_transcription(chunk, {"name": "whisper-large-v3", "language": target_language})
                
            transcribed_segments.append({
                "chunk_index": i,
                "text": result["text"],
                "confidence": result["confidence"],
                "start_time": result["start_time"],
                "end_time": result["end_time"]
            })
            
        except InvalidStateError as e:
            # Fail Fast - Don't try to patch bad audio data (Law 4)
            raise TranscriptionError(f"Invalid audio state in chunk {i}: {str(e)}") from e
            
        except TransientError:
            # Transient error - try fallback or continue
            if i == len(chunks) - 1:
                return {"status": "human_review_required", "partial_transcript": transcribed_segments}
            continue
    
    # All retries exhausted - Fail Loud (Law 4)
    full_text = " ".join(seg["text"] for seg in transcribed_segments)
    return {
        "status": "success" if not fallback_triggered else "fallback_used",
        "transcript": full_text,
        "segments": transcribed_segments,
        "fallback_applied": fallback_triggered,
        "processing_time_ms": _get_elapsed_ms(),
        "average_confidence": sum(s["confidence"] for s in transcribed_segments) / len(transcribed_segments)
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

- [OpenAI Whisper Documentation](<https://github.com/openai/whisper>)
- [Speech Recognition Evaluation Metrics (Wikipedia)](<https://en.wikipedia.org/wiki/Word_error_rate>)
- [FFmpeg Documentation](<https://ffmpeg.org/ffmpeg-all.html>)
- [Audio Codec Formats Comparison](<https://en.wikipedia.org/wiki/Audio_compression>)
- [Mozilla DeepSpeech Speech Recognition](<https://github.com/mozilla/DeepSpeech>)

## Related Skills

| Skill | Purpose |
|