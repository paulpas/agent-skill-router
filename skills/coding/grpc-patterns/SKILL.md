---
name: grpc-patterns
description: Implements gRPC service patterns (unary, streaming, bidirectional), Protocol
  Buffers design, interceptor middleware, typed error handling, and client/server
  code generation for Go and Python microservices.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: gRPC, protocol buffers, protobuf, RPC, streaming RPC, unary call, interceptor
    middleware, grpc service, stub generation, proto file design, bidirectional stream,
    client streaming, server streaming
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
  related-skills: grpc, rest-api-patterns, fastapi-patterns
------

# gRPC Service Patterns

Implements production-ready gRPC services and clients using Protocol Buffers, covering unary and streaming RPCs, interceptor middleware, typed error handling with status codes, and cross-language code generation for Go and Python.

## TL;DR Checklist

- [ ] Define .proto service contract first — write methods, messages, and enum types before any implementation
- [ ] Use versioned package names (`package myapp.v1`) and never reuse field numbers across versions
- [ ] Map all error paths to specific gRPC status codes (InvalidArgument, NotFound, AlreadyExists, etc.)
- [ ] Set context deadlines on every client call — no calls without timeouts
- [ ] Implement interceptor chains for cross-cutting concerns (auth, logging, metrics)
- [ ] Handle stream lifecycle explicitly — always check for EOF and cancel contexts

