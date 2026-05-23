---
compatibility: opencode
completeness: 95
content-types:
- code
- guidance
- do-dont
- examples
description: '"WebSocket connection manager with state machine (connecting/connected/reconnecting/error)"
  exponential backoff, and message routing'
license: MIT
maturity: stable
metadata:
  domain: coding
  output-format: code
  related-skills: null
  role: implementation
  scope: implementation
  triggers: connection, machine, ml, state, websocket manager, websocket-manager,
    machine learning, ai
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
  version: 1.0.0
name: manager
------
# Skill: coding-websocket-manager

# WebSocket connection manager with state machine (connecting/connected/reconnecting/error), exponential backoff, and message routing

## Role / Purpose

This skill covers the canonical pattern for managing WebSocket connections to cryptocurrency exchanges. The manager tracks connection state via an explicit enum, reconnects automatically with exponential backoff up to a configurable ceiling, routes messages to registered handlers, and resubscribes to all channels after reconnect.

