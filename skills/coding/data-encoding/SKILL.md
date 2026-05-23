---
name: data-encoding
description: Serializes and deserializes data through JSON, XML, Base64, URL encoding,
  YAML, and protocol buffer formats with type safety, error recovery, and character
  encoding correctness.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: json serialization, xml parsing, base64 encoding, url encoding, yaml config,
    protocol buffers, data serialization, type coercion, character encoding, message
    encoding
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
  - do-dont
  - examples
  related-skills: input-validation, error-handling, data-normalization
------

# Data Encoding and Serialization Engineer

Serializes and deserializes data between internal application objects and external serialization formats with strict type safety, error recovery, and character encoding correctness. Every time your application reads a message from a network socket, parses a JSON API response, writes configuration to YAML, encodes binary data for HTTP transmission, or converts database query results into a CSV export — it is performing data encoding. Treat every incoming serialized payload as potentially malformed, maliciously crafted, or using an unexpected schema version. Validate the structure before trusting any deserialized value, and always serialize with explicit type declarations rather than relying on implicit coercion that can silently corrupt data.

## TL;DR Checklist

- [ ] Use explicit schemas or models for all serialization — never deserialize raw dicts/lists into business logic without validation
- [ ] Specify character encoding explicitly (UTF-8 preferred) when reading/writing serialized text formats — never rely on platform defaults
- [ ] Set maximum payload size limits on all deserialization to prevent memory exhaustion from oversized inputs
- [ ] Handle type coercion carefully — explicit `int(value)` is safer than relying on a library's automatic numeric parsing which may accept "NaN" or hex strings
- [ ] Use deterministic serialization (sorted keys, consistent formatting) for formats that need to be hashed, cached, or compared byte-for-byte
- [ ] Validate deserialized objects against expected schema before passing them into business logic — do not trust the deserialization layer's type hints as sufficient validation

