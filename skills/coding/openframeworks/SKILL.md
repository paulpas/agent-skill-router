---
name: openframeworks
description: Implements OpenFrameworks (C++ creative coding toolkit) application lifecycle,
  addon integration, drawing primitives, event handling, shader management, and data
  visualization patterns for cross-platform interactive applications.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: openframeworks, ofx addons, creative coding, c++ graphics, interactive
    art, ofApp setup update draw, particle systems, cross-platform canvas
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
  related-skills: of-shader-programming, performance-optimization
------

# OpenFrameworks Developer

Implements interactive creative applications using the OpenFrameworks C++ toolkit. Covers application lifecycle, addon management, rendering, event handling, and data visualization patterns for artists and developers building cross-platform projects on macOS, Linux, and Windows.

## TL;DR Checklist

- [ ] Extend `ofApp` base class with `setup()`/`update()`/`draw()` lifecycle methods
- [ ] Register event handlers (`keyPressed`, `mouseMoved`, `newFrame`) via `ofEvents` or method overrides
- [ ] Use `ofParameter` and `ofxGui`/`ofxImGui` for runtime-tunable configuration
- [ ] Profile rendering with `ofGetElapsedTimef()` and lock framerate with `ofSetVerticalSync(true)`
- [ ] Manage memory with value semantics — never raw `new`/`delete` on OF objects
- [ ] Load all assets with `ofToDataPath()` for cross-platform portability

