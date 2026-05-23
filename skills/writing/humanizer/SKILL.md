---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Detects and removes AI writing patterns to produce natural human writing
  through two-pass editing process
license: MIT
maturity: stable
metadata:
  domain: writing
  output-format: analysis
  related-skills: code-review, markdown-best-practices
  role: review
  scope: review
  triggers: humanize text, remove AI writing, edit for natural, avoid AI patterns,
    write like human, writing edit, text review, code documentation, comments, technical
    writing, readability, code clarity
  archetypes:
  - educational
  anti_triggers:
  - brainstorming
  - vague ideation
  response_profile:
    verbosity: medium
    directive_strength: medium
    abstraction_level: tactical
  version: 1.0.0
name: humanizer
------
# Humanizer: Remove AI Writing Patterns

Detects AI-generated writing patterns and transforms them into natural, human-style writing through a systematic two-pass editing process.

## When to Use

Use this skill when:

- Editing AI-generated content to appear more human-written
- Preparing technical documentation for human audience
- Reviewing automated content for natural writing style
- Editing marketing copy to avoid AI detection
- Refining chatbot or LLM responses for more conversational tone
- Preparing user-facing messages that should sound human-written
- Editing any text that exhibits AI writing patterns

## When NOT to Use

Avoid this skill for:

- Technical code comments that require precise terminology
- Legal or regulatory documents that need formal language
- Machine-readable output (JSON, YAML, configuration files)
- Code that intentionally uses AI patterns for clarity
- Technical specifications where formal tone is required
- Content that must maintain specific brand voice regardless of AI detection

