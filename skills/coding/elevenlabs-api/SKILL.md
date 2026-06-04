---




name: elevenlabs-api
description: Integrates ElevenLabs API (text-to-speech, voice cloning, speech-to-text,
  sound effects, audio streaming) using the elevenlabs Python SDK for audio generation
  applications.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: elevenlabs, eleven labs, tts, text to speech, voice cloning, elevenlabs
    api, how do i use elevenlabs, AI voice
  archetypes:
  - tactical
  - generation
  anti_triggers:
  - brainstorming
  - vague ideation
  - code golf
  - over-engineering
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  role: implementation
  scope: implementation
  output-format: code
  content-types:
  - code
  - guidance
  - examples
  - do-dont
  related-skills: coding-openai-api, coding-stabilityai-api




---




# ElevenLabs API Integration

Integrates ElevenLabs API using the `elevenlabs` Python SDK for text-to-speech, voice cloning, speech-to-text, sound effects generation, and audio streaming. When loaded, this skill makes the model implement ElevenLabs API calls with proper authentication, audio handling, and streaming for production voice AI applications.

## When to Use

Use this skill when:

- Generating realistic text-to-speech audio with ElevenLabs voices
- Cloning voices from audio samples for custom voice creation
- Streaming TTS audio in real-time for conversational AI applications
- Using ElevenLabs Speech-to-Text (Scribe) for transcription
- Generating sound effects from text prompts
- Building voice agents that speak and listen using ElevenLabs' conversational AI
- Applying voice settings (stability, similarity, style exaggeration) for fine-grained output control

---

## When NOT to Use

- For OpenAI TTS, use `coding-openai-api`
- For basic transcription only, consider Whisper directly via `coding-openai-api`
- For music generation, use Stability AI API instead
- For simple audio playback, use a browser Web Audio API or OS-native approach

---

## Core Workflow

1. **Initialize the Client** — Create an `ElevenLabs` client with the API key from the `ELEVENLABS_API_KEY` environment variable. The v1.0+ SDK provides a typed client with separate methods for each API. **Checkpoint:** Verify by calling `client.voices.get_all()` to list available voices.

2. **Select a Voice** — Use `client.voices.get_all()` to list available voices, or `client.voices.get("voice_id")` for a specific voice. Each voice has a `voice_id`, `name`, and category. Preview voices before committing to one. **Checkpoint:** Verify the voice exists and is accessible with your current plan.

3. **Generate TTS** — Use `client.text_to_speech.convert()` for TTS generation. Pass `voice_id`, `text`, `model_id` (e.g., `"eleven_multilingual_v2"`), and `voice_settings` (stability, similarity_boost). The output is binary audio data (MP3). **Checkpoint:** Verify the output is valid audio by checking `len(audio_data)` — it should be > 1000 bytes.

4. **Stream TTS in Real-Time** — Use `client.text_to_speech.convert_as_stream()` for streaming TTS. This returns audio chunks that can be played incrementally. Use this for conversational AI and low-latency applications. **Checkpoint:** Verify the stream produces chunks without long pauses (indicates latency issues).

5. **Clone a Voice** — Use `client.voices.add()` with audio files for voice cloning. Provide at least 1 audio sample (3+ recommended) for instant voice cloning, or provide more samples (10+) for professional cloning. **Checkpoint:** Test the cloned voice with a sample sentence to verify quality.

---

## Implementation Patterns

### Pattern 1: Basic TTS and Voice Settings

```python
from __future__ import annotations

from elevenlabs import ElevenLabs

# ❌ BAD — no voice settings, no error handling, assumes default voice
from elevenlabs import generate, play
audio = generate(text="Hello world", voice="Rachel")
play(audio)

# ✅ GOOD — typed client, explicit settings, error handling
client = ElevenLabs()  # reads ELEVENLABS_API_KEY from environment


def synthesize_speech(
    text: str,
    voice_id: str = "21m00Tcm4TlvDq8ikWAM",
    stability: float = 0.5,
    similarity_boost: float = 0.75,
) -> bytes:
    """Convert text to speech using ElevenLabs.

    Args:
        text: Text to synthesize (max 5000 characters).
        voice_id: ElevenLabs voice ID.
        stability: Voice stability (0.0-1.0). Lower = more expressive.
        similarity_boost: Voice similarity (0.0-1.0). Higher = more accurate.

    Returns:
        MP3 audio data as bytes.

    Raises:
        ValueError: If text exceeds 5000 characters.
        RuntimeError: On API failure.
    """
    if len(text) > 5000:
        raise ValueError(
            f"Text exceeds 5000 character limit: {len(text)} characters"
        )

    try:
        audio = client.text_to_speech.convert(
            voice_id=voice_id,
            text=text,
            model_id="eleven_multilingual_v2",
            voice_settings={
                "stability": stability,
                "similarity_boost": similarity_boost,
            },
        )
        return b"".join(audio)  # convert generator to bytes
    except Exception as e:
        raise RuntimeError(f"TTS generation failed: {e}") from e


def save_audio(audio_data: bytes, filepath: str) -> None:
    """Save audio bytes to an MP3 file.

    Args:
        audio_data: Audio data from synthesize_speech.
        filepath: Output file path (should end in .mp3).
    """
    with open(filepath, "wb") as f:
        f.write(audio_data)
```

### Pattern 2: Streaming TTS for Conversational AI

```python
from __future__ import annotations

import io
from elevenlabs import ElevenLabs

client = ElevenLabs()


def stream_tts(text: str, voice_id: str = "21m00Tcm4TlvDq8ikWAM") -> bytes:
    """Stream TTS audio in real-time and accumulate to bytes.

    For production use, play each chunk as it arrives for
    sub-500ms time-to-first-audio latency.

    Args:
        text: Text to synthesize.
        voice_id: ElevenLabs voice ID.

    Returns:
        Complete MP3 audio as bytes.
    """
    audio_stream = client.text_to_speech.convert_as_stream(
        voice_id=voice_id,
        text=text,
        model_id="eleven_multilingual_v2",
    )

    chunks: list[bytes] = []
    for chunk in audio_stream:
        chunks.append(chunk)
        # In a real app, feed each chunk to an audio player here

    audio_data = b"".join(chunks)
    print(f"Generated {len(audio_data)} bytes of audio")
    return audio_data


def list_voices() -> list[dict]:
    """List all available voices with their IDs and names.

    Returns:
        List of dicts with voice_id, name, and category.
    """
    response = client.voices.get_all()
    return [
        {
            "voice_id": v.voice_id,
            "name": v.name,
            "category": v.category,
        }
        for v in response.voices
    ]
```

### Pattern 3: Voice Cloning

```python
from __future__ import annotations

from elevenlabs import ElevenLabs
from elevenlabs.api.types import Voice

client = ElevenLabs()


def clone_voice(
    name: str,
    audio_files: list[bytes],
    description: str = "",
) -> Voice:
    """Clone a voice from audio samples.

    Args:
        name: Name for the cloned voice.
        audio_files: List of audio file bytes (MP3/WAV, 3+ recommended).
        description: Optional description of the voice.

    Returns:
        The created Voice object.

    Raises:
        ValueError: If fewer than 1 audio file provided.
    """
    if not audio_files:
        raise ValueError("At least one audio file is required for voice cloning.")

    voice = client.voices.add(
        name=name,
        files=audio_files,
        description=description or f"Cloned voice: {name}",
    )
    return voice


def test_cloned_voice(voice_id: str, test_text: str = "Hello, this is my cloned voice.") -> bytes:
    """Test a cloned voice by generating a sample.

    Args:
        voice_id: The cloned voice's ID.
        test_text: Text to speak with the cloned voice.

    Returns:
        MP3 audio as bytes.
    """
    audio = client.text_to_speech.convert(
        voice_id=voice_id,
        text=test_text,
        model_id="eleven_multilingual_v2",
    )
    return b"".join(audio)
```

### Pattern 4: Sound Effects Generation

```python
from __future__ import annotations

from elevenlabs import ElevenLabs

client = ElevenLabs()


def generate_sound_effect(
    prompt: str,
    duration_seconds: float = 5.0,
) -> bytes:
    """Generate a sound effect from a text prompt.

    Args:
        prompt: Description of the sound (e.g., 'rain falling on a roof').
        duration_seconds: Maximum duration in seconds.

    Returns:
        Generated audio as bytes (MP3).

    Raises:
        RuntimeError: If generation fails.
    """
    try:
        audio = client.text_to_sound_effects.convert(
            text=prompt,
            duration_seconds=duration_seconds,
        )
        return b"".join(audio)
    except Exception as e:
        raise RuntimeError(f"Sound effect generation failed: {e}") from e
```

---

## Constraints

### MUST DO
- Read API key from `ELEVENLABS_API_KEY` environment variable
- Use the `elevenlabs` SDK v1.0+ with the typed `ElevenLabs()` client
- Set explicit `voice_settings` (stability, similarity_boost) for consistent voice output
- Check text length against the 5000-character limit before API calls
- Use `eleven_multilingual_v2` for multilingual TTS (supports 29 languages)
- Close or save audio streams properly to avoid resource leaks

### MUST NOT DO
- Hardcode API keys in source files
- Use the deprecated `generate()` top-level function — use `client.text_to_speech.convert()` instead
- Assume all audio outputs are WAV format — they are MP3 by default
- Skip voice settings — defaults may produce inconsistent output
- Use instant voice cloning with only 1 audio sample for production — use 3+ samples

---

## Live References

| Resource | URL |
|----------|-----|
| ElevenLabs Python SDK (PyPI) | https://pypi.org/project/elevenlabs/ |
| ElevenLabs API Documentation | https://elevenlabs.io/docs |
| ElevenLabs API Reference | https://elevenlabs.io/docs/api-reference |
| ElevenLabs Voice Library | https://elevenlabs.io/voice-library |
| ElevenLabs Sound Effects | https://elevenlabs.io/text-to-sound-effects |
| ElevenLabs GitHub | https://github.com/elevenlabs/elevenlabs-python |

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `coding-openai-api` | OpenAI TTS (alternative, fewer voice options) |
| `coding-stabilityai-api` | Stability AI for music/audio generation |
