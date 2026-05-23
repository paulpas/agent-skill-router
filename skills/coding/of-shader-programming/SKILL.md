---
name: of-shader-programming
description: Implements GLSL shader programming in OpenFrameworks including vertex/fragment
  shaders, uniform management, VBO rendering, post-processing effects, and shader
  compilation debugging for GPU-accelerated graphics.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: of shader, glsl programming, vertex shader, fragment shader, ofShader,
    uniform management, post-processing, gpu rendering, vbo shader, openframeworks
    shaders
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
  related-skills: openframeworks, performance-optimization
------

# GLSL Shader Programming in OpenFrameworks

Implements GPU-accelerated graphics using GLSL shaders within OpenFrameworks. Covers vertex and fragment shader development, uniform management, VBO rendering, post-processing pipelines, and shader compilation debugging for real-time visual applications.

## TL;DR Checklist

- [ ] Load shaders with `ofShader::load()` specifying vertex `.vert` and fragment `.frag` paths
- [ ] Bind uniforms before draw() using `setUniform1f()`, `setUniformMatrix4f()`, `setUniformTexture()`
- [ ] Use VBOs (`ofVbo`) for batched geometry rendering — never per-vertex CPU-to-GPU uploads
- [ ] Check shader compilation errors after load() and log with `ofLogError()` if failed
- [ ] Set projection matrix with `glm::perspective()` or `glm::ortho()` before drawing with shaders

