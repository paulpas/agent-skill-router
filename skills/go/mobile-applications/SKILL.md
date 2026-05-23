---
name: mobile-applications
description: Develops cross-platform mobile applications with Go using Fyne and Go
  mobile for iOS and Android with platform-optimized UI patterns.
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
  triggers: go mobile, go ios, go android, fyne, gomobile, cross-platform mobile,
    go mobile app
  archetypes:
  - tactical
  anti_triggers:
  - brainstorming
  - vague ideation
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  related-skills: best-practices, web-applications, modular-design
  maturity: stable
  completeness: 95
  exampleCount: 3
------

# Go Mobile Applications

Senior mobile engineer building cross-platform applications in Go using Fyne and Go Mobile. This skill covers UI development, platform-specific features, battery-conscious design, and deployment to iOS and Android from a single Go codebase.

## TL;DR Checklist

- [ ] Use Fyne for cross-platform UI or Go Mobile for native bindings — never mix both in the same app
- [ ] Keep UI logic on the main thread; use goroutines for background work
- [ ] Handle lifecycle events (onPause, onResume, onDestroy) for resource management
- [ ] Optimize for touch interaction and mobile screen sizes
- [ ] Use Go Mobile's `bind` for exposing Go functions to native iOS/Android code
- [ ] Profile battery and memory — Go's GC is not designed for mobile real-time constraints

