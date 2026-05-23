---
name: deployment-patterns
description: Deploys Go applications with build optimization, multi-stage Docker builds,
  binary sizing, and deployment strategies for cloud and on-prem.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: go
  role: implementation
  scope: implementation
  output-format: code
  content-types:
  - code
  - guidance
  - do-dont
  - examples
  triggers: go deployment, go docker build, multi stage build, go binary optimization,
    go cross compilation, go build tags
  archetypes:
  - tactical
  anti_triggers:
  - brainstorming
  - vague ideation
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  related-skills: cloud-development, best-practices, modular-design
  maturity: stable
  completeness: 95
  exampleCount: 3
------

# Go Deployment Patterns

Senior DevOps engineer deploying optimized Go applications with multi-stage Docker builds, binary sizing, cross-compilation, and deployment strategies. This skill covers building minimal binaries, container optimization, and production deployment patterns.

## TL;DR Checklist

- [ ] Use multi-stage Docker builds — never include source code or build tools in the final image
- [ ] Enable Go build optimizations: `-ldflags "-s -w"`, `CGO_ENABLED=0`, `GOOS=linux`
- [ ] Use a minimal base image (`distroless`, `scratch`, or `alpine`) for the final stage
- [ ] Cross-compile for target platforms — never build on the deployment machine
- [ ] Run the binary as a non-root user in the container
- [ ] Use build tags to conditionally include platform-specific code

