---
name: elevenlabs-api
description: Integrates ElevenLabs API (text-to-speech, voice cloning, speech-to-text,
  sound effects, audio streaming) using the elevenlabs Python SDK for audio generation
  applications.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
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
------

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

