---
name: websocket-protocol
description: Implements WebSocket protocol-level patterns including frame parsing,
  subprotocol negotiation, permessage-deflate compression, text/binary framing, and
  backpressure management for real-time applications.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: websocket protocol, frame handling, subprotocol negotiation, permessage-deflate,
    binary framing, text messages, backpressure, wss://, ws upgrade, opcode, mask
    bit, close frame
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
  related-skills: websocket-manager, websocket-security
------

# WebSocket Protocol Implementation Guide

Implements the WebSocket protocol (RFC 6455) at the frame level — parsing frames, negotiating subprotocols, applying compression extensions, managing backpressure, and correctly framing text and binary messages. This skill covers the mechanics beneath the library abstractions so you can build robust real-time communication layers that understand the protocol they speak.

## TL;DR Checklist

- [ ] Parse WebSocket frames according to RFC 6455 — FIN, opcode, mask, payload length
- [ ] Negotiate subprotocols via Sec-WebSocket-Protocol header in HTTP upgrade handshake
- [ ] Implement permessage-deflate for frame compression with configurable window size
- [ ] Distinguish text (opcode 0x1) and binary (opcode 0x2) frames; handle continuation (0x0)
- [ ] Enforce backpressure: pause reads when write buffer exceeds threshold
- [ ] Handle close handshake: send Close frame with status code before TCP FIN

