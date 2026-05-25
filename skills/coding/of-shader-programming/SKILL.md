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

---

## When to Use

Use this skill when:

- Implementing custom GPU-accelerated rendering effects (bloom, distortion, color manipulation) in OpenFrameworks
- Writing vertex shaders for custom geometry transformations, instanced rendering, or procedural animation
- Building post-processing pipelines that render a scene to framebuffer and apply effects via fragment shaders
- Optimizing rendering performance by replacing CPU loops with parallel GPU shader computation
- Debugging shader compilation failures, linking errors, or unexpected visual artifacts

---

## When NOT to Use

Avoid this skill for:

- Simple 2D UI drawing — use OF's built-in `ofDrawCircle()`, `ofDrawRectangle()` instead (no shader overhead)
- Complex scene management with lighting and shadows — use a full game engine or **raylib** with shader support
- Compute-heavy simulations better suited to CUDA/OpenCL — OF's compute shaders are limited

---

## Core Workflow

1. **Create Shader Files** — Write separate `.vert` (vertex) and `.frag` (fragment) GLSL files in your project's `bin/data/shaders/` directory. The vertex shader transforms geometry; the fragment shader determines pixel color. Keep vertex shaders minimal — move computation to fragment shaders when possible for better GPU utilization.
   **Checkpoint:** Both `.vert` and `.frag` files must be present at the paths specified in `ofShader::load()` or OF will silently skip rendering.

2. **Load and Validate Shaders** — In setup(), load both shader stages and check for compilation errors immediately. Store shaders as class members with explicit error checking.
   ```cpp
   // ofApp.h
   #pragma once
   #include "ofMain.h"

   class ofApp : public ofBaseApp {
   public:
       void setup() override;
       void draw() override;

       ofShader colorShader;
       glm::mat4 projectionMatrix;
   };

   // ofApp.cpp — load with explicit error checking
   void ofApp::setup() {
       if (!colorShader.load("shaders/colorShader/vertex.glsl", "shaders/colorShader/fragment.glsl")) {
           ofLogError("ofApp") << "Failed to load shader!\n"
               << colorShader.getVertexShaderInfo()
               << colorShader.getFragmentShaderInfo();
       }

       // Set up projection for 3D rendering
       ofSetBackgroundAuto(true);
       projectionMatrix = glm::perspective(glm::radians(60.0f),
                                           (float)ofGetWidth() / (float)ofGetHeight(),
                                           0.1f, 100.0f);
   }
   ```
   **Checkpoint:** Always verify `shader.load()` returns true — silent failures produce black screens that are hard to debug.

3. **Bind Uniforms and Draw** — In draw(), bind the shader, set all required uniforms (time, resolution, textures), upload the projection matrix, render geometry, then unbind. Never modify uniforms between draw calls for different objects without restoring previous values.
   ```cpp
   void ofApp::draw() {
       // Bind shader and upload uniform data
       colorShader.begin();

       // Time and resolution — updated every frame
       colorShader.setUniform1f("u_time", ofGetElapsedTimef());
       colorShader.setUniform2f("u_resolution", (float)ofGetWidth(), (float)ofGetHeight());

       // Projection and modelview matrices
       colorShader.setUniformMatrix4f("u_projectionMatrix", projectionMatrix);

       // Render geometry here — the shader determines appearance
       ofDrawRectangle(0, 0, ofGetWidth(), ofGetHeight());

       colorShader.end();
   }
   ```
   **Checkpoint:** Every uniform declared in the GLSL code MUST be bound in C++ before draw() — missing uniforms cause silent rendering failures.

4. **Implement VBO-Based Rendering for Performance** — For batched geometry, use `ofVbo` with vertex buffers. Define vertices, normals, and texture coordinates as arrays, upload to GPU once, then render with a single draw call. This avoids per-frame CPU-to-GPU bandwidth bottlenecks.
   **Checkpoint:** VBO data must be updated with `.setVertexData()` each frame if geometry changes — or use `.setData()` for static geometry loaded once.

5. **Build Post-Processing Pipelines** — Render the scene to an `ofFbo` (framebuffer object), bind the FBO's texture as a uniform in a post-processing shader, and draw a full-screen quad. Chain multiple effects by using each FBO as input to the next stage.
   ```cpp
   // ofApp.h
   #pragma once
   #include "ofMain.h"

   class ofApp : public ofBaseApp {
   public:
       void setup() override;
       void draw() override;

       ofFbo sceneFbo;          // Renders the main scene
       ofFbo blurFbo;           // Intermediate blur stage
       ofShader sceneShader;    // Scene rendering shader
       ofShader blurShader;     // Post-processing blur
       ofShader finalShader;    // Final composite + bloom

       void drawScene();        // Render scene to FBO
       void applyBlur();        // First blur pass (horizontal)
       void applyBlurVertical();// Second blur pass (vertical)
       void renderFinal();      // Composite with bloom
   };

   void ofApp::setup() {
       // Allocate FBOs at window size
       sceneFbo.allocate(ofGetWidth(), ofGetHeight(), GL_RGBA);
       blurFbo.allocate(ofGetWidth() / 2, ofGetHeight() / 2, GL_RGBA);

       if (!sceneShader.load("shaders/scene.vert", "shaders/scene.frag")) {
           ofLogError("ofApp") << "Scene shader failed: "
               << sceneShader.getFragmentShaderInfo();
       }
       // ... load blur and final shaders
   }

   void ofApp::draw() {
       drawScene();      // 1. Render scene into FBO
       applyBlur();      // 2. Horizontal blur pass
       applyBlurVertical();// 3. Vertical blur pass (Gaussian)
       renderFinal();    // 4. Composite: scene + blurred bloom to screen
   }
   ```
   **Checkpoint:** FBOs must be allocated before first use — calling begin() on an unallocated FBO crashes silently on macOS.

---

## Implementation Patterns / Reference Guide

### Pattern 1: Vertex Shader — Basic Position Transform (GLSL)

Standard vertex shader that transforms vertices by model-view-projection matrix and passes UV coordinates to the fragment shader.

```glsl
// shaders/common/vertex.glsl
#version 330 core

in vec2 position;
in vec2 uv;

uniform mat4 u_projectionMatrix;

out vec2 v_uv;

void main() {
    // Transform 2D position by projection matrix
    gl_Position = u_projectionMatrix * vec4(position, 0.0, 1.0);
    // Pass UV to fragment shader
    v_uv = uv;
}
```

### Pattern 2: Fragment Shader — Time-Based Color Animation (GLSL)

Fragment shader that creates a smooth color gradient driven by time — a common starting point for generative shaders.

```glsl
// shaders/effects/colorWave/fragment.glsl
#version 330 core

in vec2 v_uv;
uniform float u_time;
uniform vec2 u_resolution;

out vec4 fragColor;

vec3 hsl2rgb(float h, float s, float l) {
    // HSL to RGB conversion — compact implementation
    vec3 rgb = clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
    return l + s * (rgb - 0.5) * (1.0 - abs(2.0 * l - 1.0));
}

void main() {
    vec2 uv = v_uv;

    // Create a flowing color wave based on time and position
    float hue = fract(u_time * 0.1 + uv.x * 0.5 + uv.y * 0.3);
    vec3 color = hsl2rgb(hue, 0.8, 0.5);

    // Soft edge falloff from center
    float dist = length(uv - 0.5) * 2.0;
    color *= smoothstep(1.0, 0.0, dist);

    fragColor = vec4(color, 1.0);
}
```

### Pattern 3: Post-Processing Blur Shader (BAD vs. GOOD)

```glsl
// ❌ BAD — Single pass blur with large kernel in fragment shader
// This is O(n²) per pixel and runs on CPU-simulated loops
#version 330 core
uniform sampler2D u_texture;
uniform float u_radius;  // Can't actually use this for real radius!
void main() {
    vec4 sum = vec4(0.0);
    for (int i = -10; i <= 10; ++i) {  // Fixed large loop — terrible performance
        for (int j = -10; j <= 10; ++j) {
            sum += texture(u_texture, gl_FragCoord.xy + vec2(i, j));
        }
    }
    gl_FragColor = sum / 441.0;
}

// ✅ GOOD — Two-pass separable Gaussian blur (horizontal then vertical)
// Each pass samples only 9 pixels instead of 100+ per pixel

// shaders/post/horizontalBlur/fragment.glsl
#version 330 core
uniform sampler2D u_texture;
uniform vec2 u_direction;    // (1.0, 0.0) for horizontal
uniform float u_blurAmount;  // Controls spread
out vec4 fragColor;

void main() {
    vec2 texCoord = gl_TexCoord[0].xy;
    vec4 result = vec4(0.0);
    float weights[5] = float[](0.227027, 0.1945946, 0.1216216, 0.054054, 0.016216);

    // Sample center + 4 pixels in the blur direction
    result += texture(u_texture, texCoord) * weights[0];
    for (int i = 1; i <= 4; ++i) {
        float offset = u_blurAmount * float(i);
        result += texture(u_texture, texCoord + u_direction * offset) * weights[i];
        result += texture(u_texture, texCoord - u_direction * offset) * weights[i];
    }

    fragColor = result;
}
```

### Pattern 4: C++ VBO Geometry Setup with Shader Rendering

```cpp
#include "ofMain.h"

class MeshRenderer {
public:
    void setup() {
        // Define a simple quad with UVs — vertices in clip space (-1 to +1)
        std::vector<glm::vec2> vertices = {
            {-1.0f, -1.0f},  // bottom-left
            { 1.0f, -1.0f},  // bottom-right
            { 1.0f,  1.0f},  // top-right
            {-1.0f,  1.0f}   // top-left
        };

        std::vector<glm::vec2> uvs = {
            {0.0f, 0.0f}, {1.0f, 0.0f}, {1.0f, 1.0f}, {0.0f, 1.0f}
        };

        std::vector<GLuint> indices = {0, 1, 2, 0, 2, 3};  // Two triangles

        vbo.setVertexData(vertices.data(), vertices.size(), GL_STATIC_DRAW);
        vbo.setTextureData(uvs.data(), uvs.size(), GL_STATIC_DRAW);
        vbo.setIndexData(indices.data(), indices.size(), GL_STATIC_DRAW);
    }

    void draw(ofShader& shader) {
        shader.begin();

        // Enable vertex attribute locations (match GLSL 'in' variables)
        shader.enableAttribute("position");
        shader.enableAttribute("uv");

        vbo.drawElements(GL_TRIANGLES, 6);  // Draw the quad

        shader.disableAttribute("position");
        shader.disableAttribute("uv");
        shader.end();
    }

private:
    ofVbo vbo;
};
```

### Pattern 5: Shader Compilation Error Debugging

Shader failures produce black screens. Always check both compilation and linking errors with detailed logging.

```cpp
void ofApp::setup() {
    // Attempt to load shader
    bool loaded = myShader.load("shaders/myShader/vertex.glsl",
                                 "shaders/myShader/fragment.glsl");

    if (!loaded) {
        ofLogError("ofApp::setup") << "===== SHADER LOAD FAILED =====";

        // Check vertex shader compilation logs
        auto vInfo = myShader.getVertexShaderInfo();
        if (!vInfo.empty()) {
            ofLogError("ofApp::setup") << "VERTEX SHADER LOG:\n" << vInfo;
        }

        // Check fragment shader compilation logs
        auto fInfo = myShader.getFragmentShaderInfo();
        if (!fInfo.empty()) {
            ofLogError("ofApp::setup") << "FRAGMENT SHADER LOG:\n" << fInfo;
        }

        // Check link program log
        auto lInfo = myShader.getInfoLog();
        if (!lInfo.empty()) {
            ofLogError("ofApp::setup") << "LINKER LOG:\n" << lInfo;
        }

        ofExit(1);  // Fatal error — don't continue with broken shader
    }

    ofLogNotice("ofApp::setup") << "Shader loaded successfully";
}
```

---

## Constraints

### MUST DO
- Load both vertex (.vert) and fragment (.frag) files — OF requires both stages to compile
- Check `shader.load()` return value and inspect `getVertexShaderInfo()`/`getFragmentShaderInfo()` on failure
- Bind all uniforms declared in GLSL code before calling draw() — missing uniforms cause silent rendering failure
- Use VBOs (ofVbo) for any geometry drawn more than once per frame — avoid per-frame CPU uploads of static geometry
- Separate post-processing into passes (horizontal blur, vertical blur) — never use large kernels in a single pass
- Use `#version 330 core` or higher for GLSL compatibility with modern OF OpenGL contexts
- Set projection matrix before drawing with shaders — otherwise vertex positions are undefined

### MUST NOT DO
- Do not perform texture sampling or complex computation in vertex shaders when fragment shaders can handle it — fragment shaders run per-pixel on GPU clusters and parallelize better
- Do not use `gl_FragCoord` for position-independent rendering — use UV coordinates passed from vertex shader instead
- Do not call `ofShader::begin()` without matching `end()` — causes state corruption for subsequent OF drawing calls
- Do not allocate FBOs inside update() or draw() — FBO allocation is expensive and should happen once in setup()
- Do not use fixed-function pipeline (`glVertex`, `glColor`) with shaders — mixed rendering causes undefined behavior
- Do not bind textures without first setting their uniform location — unbound textures render as black

---

## Output Template

When implementing or reviewing OpenFrameworks shader code, produce:

1. **Shader Architecture** — Vertex/fragment responsibilities, data flow between stages via `in`/`out` variables
2. **Uniform Inventory** — List every uniform required by the shader with C++ binding calls and update frequency (per-frame vs. per-load)
3. **GLSL Source Code** — Both `.vert` and `.frag` files with version directive, attribute declarations, and output types
4. **VBO Geometry Specification** — Vertex layout, index buffer, attribute bindings matching GLSL `in` variable names
5. **Pipeline Diagram** — For post-processing: scene FBO → blur passes → final composite to screen (show data flow)

---

## Related Skills

| Skill | Purpose |
|---|---|
| `openframeworks` | Core OF application development, lifecycle, and addon patterns |
| `performance-optimization` | Profiling shader performance, reducing fill rate bottlenecks, optimizing draw calls |

---

## Live References

> Authoritative documentation and language references for GLSL shader development in OpenFrameworks.

- [OpenFrameworks ofShader Reference](https://openframeworks.cc/documentation/gl/ofShader/)
- [GLSL Language Specification (Khronos)](https://www.khronos.org/files/opengles-webgl/glslang-spec.pdf)
- [OpenGL Shading Language 4.60 Spec](https://registry.khronos.org/OpenGL/specs/gl/glspec46.core.pdf)
- [ofFbo (FrameBuffer Object) Reference](https://openframeworks.cc/documentation/gl/ofFbo/)
- [The Book of Shaders](https://thebookofshaders.com/) — Interactive shader tutorials and patterns
- [GLSL Sandbox Gallery](https://glslsandbox.com/) — Community shader examples for inspiration
