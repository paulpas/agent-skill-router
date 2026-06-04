---
name: elevenlabs-ai-tooling
description: Implements integrations with ElevenLabs API for Text-to-Speech, Voice Cloning, and Conversational AI capabilities within AI/LLM agendas.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: elevenlabs api, text-to-speech, voice cloning, conversational ai, how do i convert text to speech, voice ai integration
  scope: implementation
  role: implementation
  output-format: code
  related-skills: coding-ai-integration, coding-llm-usage
  archetypes:
    - generation
    - tactical
  anti_triggers:
    - brainstorming
    - vague ideation
    - single-agent monolith
  response_profile:
    verbosity: medium
    directive_strength: high
    abstraction_level: operational
---

# ElevenLabs API Integration for Voice AI
Integrates ElevenLabs API to enable advanced voice capabilities within projects. This skill allows developers to implement Text-to-Speech (TTS) and Voice Cloning features to enhance user interfaces and interactions via AI-powered speech.

---

## Constraints

### MUST DO
- Validate all inputs at function boundaries before processing — guard clauses should fail early with descriptive errors
- Implement proper error handling that distinguishes between recoverable and unrecoverable failures
- Add comprehensive logging with structured context (correlation IDs, operation names, timing) for debugging and monitoring
- Write unit tests covering normal operations, edge cases, and error conditions before integrating the component

### MUST NOT DO
- Do not silently swallow exceptions — always log or propagate errors with meaningful context
- Avoid unbounded resource allocation without limits (connection pools, memory buffers, thread counts)
- Never use hardcoded credentials, API keys, or secrets in source code
- Do not bypass input validation for perceived performance gains


## TL;DR Checklist
- [ ] Ensure API keys and credentials are securely managed and used only in the intended environment.
- [ ] Handle exceptions gracefully, providing fallback options in case of API errors.
- [ ] Document required rate limits for API calls to avoid service interruptions.
- [ ] Validate audio output for correct format and quality before use.

## Core Workflow
1. **Authentication Setup** — Securely manage and store API keys for the ElevenLabs API. **Checkpoint:** Confirm that API keys are not hard-coded; use environment variables or secure vaults.
2. **Text-to-Speech Request** — Formulate the request with proper parameters (text input, voice selection, and settings). **Checkpoint:** Validate the input text is not empty and the voice ID exists in the system.
3. **API Call Execution** — Call the ElevenLabs API to generate audio from text. **Checkpoint:** Check for successful response status; log the transaction for audit.
4. **Audio Playback or Processing** — Handle the received audio data, either for playback or further processing (streaming, saving). **Checkpoint:** Ensure audio is in the desired format and quality acceptable for the end use.
5. **Error Handling and Retry Logic** — Implement robust error handling with retries for intermittent failures. **Checkpoint:** Provide clear user feedback on failures and potential next steps.

## Implementation Patterns
### Pattern 1: Text-to-Speech Generation
```python
import requests

class ElevenLabsTTS:
    def __init__(self, api_key: str) -> None:
        self.api_key = api_key
        # Guard clause for empty key
        if not self.api_key:
            raise ValueError("API key cannot be empty!")

    def generate_speech(self, text: str, voice_id: str) -> bytes:
        if not text:
            raise ValueError("Input text cannot be empty")
        if not voice_id:
            raise ValueError("Voice ID must be provided")

        url = 'https://api.elevenlabs.io/speech/generate'
        data = {"text": text, "voice_id": voice_id}
        headers = {"Authorization": f"Bearer {self.api_key}"}
        response = requests.post(url, json=data, headers=headers)

        # Check for the valid response status
        if response.status_code != 200:
            raise RuntimeError(f"Request to ElevenLabs API failed with status code {response.status_code}")

        return response.content  # Returns audio bytes
```

### Pattern 2: Voice Cloning
```python
def clone_voice(original_audio: bytes) -> str:
    """Initiates voice cloning based on original audio input.
    Args:
        original_audio: byte stream of the source voice to clone.
    Returns:
        voice_id: ID of the newly created voice clone.
    Raises:
        RuntimeError: If cloning process fails.
    """
    # Placeholder for actual API call
    # Here we would upload original_audio for cloning, similar to the speech generation flow.
    pass  # TODO: Implement the API Call for Voice Cloning
```

### MUST DO
- Validate all input parameters at the boundary to ensure no invalid states are processed.
- Log all API interaction results for comprehensive metrics and error tracing.
- Reference proper error handling procedures for API exceptions.
- Document each audio output's expected format and specifications from the ElevenLabs API documentation.

### MUST NOT DO
- Manipulate or alter the API keys without permission; keep sensitive data secure.
- Skip validation on audio output; always confirm the type and format of generated audio.
- Overlook the management of API call limits; ensure to use the exponential backoff strategy if nearing limits.