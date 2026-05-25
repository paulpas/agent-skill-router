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

---

## When to Use

Use this skill when:

- Building interactive visual applications, generative art, or data visualization with OpenFrameworks
- Integrating OF addons (ofxImGui, ofxOpenCv, ofxAudioUnit) into an existing project
- Designing the application lifecycle and event handling architecture for a creative coding project
- Porting an OpenFrameworks app between macOS, Linux, and Windows
- Implementing real-time graphics rendering with optimized draw loops

---

## When NOT to Use

Avoid this skill for:

- Game development with complex physics — use **Godot** or **Unity** instead (OF has no built-in physics engine)
- Web-based projects — use **p5.js** or the OpenFrameworks JS port via Emscripten instead of native C++
- Heavy machine learning pipelines — OF's ML is lightweight; for training, use **PyTorch/TensorFlow** and export to OF only for inference/rendering

---

## Core Workflow

1. **Scaffold Project Structure** — Create a new OF project using `of_create_project` or copy from the examples template. The main entry point is always `src/ofApp.cpp` with `src/ofApp.h`. Define member variables (`ofImage`, `ofTrueTypeFont`, `ofParameter`) as class members in `ofApp.h`.
   **Checkpoint:** Verify `CMakeLists.txt` lists all source files and linked addons before building.

2. **Implement Application Lifecycle** — Override the three core methods in `ofApp.cpp`: `setup()` for initialization, `update()` for frame-by-frame logic (physics, AI, data streaming), `draw()` for rendering only. Keep `draw()` lightweight — offload expensive computation to `update()`.
   **Checkpoint:** `setup()` must complete before any `draw()` call — all objects initialized there.

3. **Handle Events and Input** — Register both method overrides (`keyPressed`, `mousePressed`, `mouseMoved`, `windowResized`) and/or use the event system for decoupled communication: `ofEvents().newFrame.addListener(this, &ofApp::onNewFrame);`. For UI controls, integrate ofxGui or ofxImGui and bind to ofParameters.
   **Checkpoint:** Mouse coordinates are (0,0) at top-left — verify coordinate space before hit-testing.

4. **Rendering Pipeline** — Use OF's built-in drawing primitives (`ofDrawCircle`, `ofDrawRectangle`, `ofDrawLine`) for simple geometry. For custom shaders, use `ofShader` with uniform management via `shader.setUniform1f()`. For sprite-based rendering, use `ofTexture` and `ofImage` loaded from disk or generated procedurally. Enable vsync and set desired frame rate with `ofSetVerticalSync(true)` and `ofSetFrameRate(60)`.
   **Checkpoint:** Always call `ofClear()` at the start of `draw()` — otherwise frames accumulate and create visual artifacts.

5. **Manage Addons and Dependencies** — Add third-party addons by placing them in `libs/` directory or using `git submodule add` for addon repos. Update CMakeLists.txt with `target_link_libraries(${CMAKE_PROJECT_NAME} PRIVATE ${ADDON_NAME})`. For custom addon development, use `of_create_addon` from the OF tools.
   **Checkpoint:** Addons must declare their dependencies — circular addon dependencies cause build failures.

---

## Implementation Patterns / Reference Guide

### Pattern 1: Parameter-Driven Configuration (ofParameters + ofxGui)

Use `ofParameter` for runtime-tunable values with automatic GUI binding. This eliminates hard-coded constants and enables real-time experimentation by artists and designers.

```cpp
// ofApp.h
#pragma once
#include "ofMain.h"
#include "ofxGui.h"

class ofApp : public ofBaseApp {
public:
    void setup() override;
    void update() override;
    void draw() override;

    // Parameters exposed to GUI — name, default, min, max
    ofParameter<float> particleSpeed{"speed", 2.0f, 0.1f, 10.0f};
    ofParameter<int> particleCount{"count", 500, 10, 5000};
    ofParameter<bool> enableGravity{"gravity", true};

    // UI panel — must be declared after parameters for proper binding order
    ofxPanel gui;

private:
    void bindParameters();
};

// ofApp.cpp
void ofApp::setup() {
    ofSetVerticalSync(true);
    ofSetFrameRate(60);

    bindParameters();
}

void ofApp::bindParameters() {
    gui.setup("Controls", particleSpeed, particleCount, enableGravity);
    gui.setPosition(10, 10);
}

void ofApp::update() {
    // Parameters are auto-updated by the GUI — just read them via .get()
    float speed = particleSpeed.get();
    int count = particleCount.get();

    for (int i = 0; i < count; ++i) {
        // ... update logic using speed
    }
}
```

### Pattern 2: Efficient Particle System (BAD vs. GOOD)

```cpp
// ❌ BAD — Raw pointers, no encapsulation, draw calls inside data structs
struct Particle {
    float x, y;
    void update() { x += 1.0f; }
    void draw() { ofDrawCircle(x, y, 3); }  // Never draw from a data struct!
};

std::vector<Particle*> particles;  // Memory leak waiting to happen

// ✅ GOOD — Value types, pure data separation, renderer lives in draw()
struct Particle {
    glm::vec2 position{0.0f, 0.0f};
    glm::vec2 velocity{0.0f, 0.0f};
    float life = 1.0f;
    float maxLife = 1.0f;

    void update(float dt, bool gravity) {
        position += velocity * dt;
        if (gravity) velocity.y -= 9.8f * dt;
        life -= dt;
    }

    bool isAlive() const { return life > 0.0f; }
};

class ParticleSystem {
public:
    void update(float dt, float speed, bool gravity) {
        for (auto& p : particles) {
            p.update(dt * speed, gravity);
        }
        // Remove dead particles using erase-remove idiom
        particles.erase(
            std::remove_if(particles.begin(), particles.end(),
                [](const Particle& p){ return !p.isAlive(); }),
            particles.end());
    }

    void draw() const {
        ofSetColor(255);
        for (const auto& p : particles) {
            float alpha = static_cast<int>(255.0f * (p.life / p.maxLife));
            ofSetColor(255, alpha);
            ofDrawCircle(p.position.x, p.position.y, 4.0f);
        }
    }

    void emit(int count, glm::vec2 origin, float spread) {
        for (int i = 0; i < count; ++i) {
            Particle p;
            p.position = origin + glm::vec2(ofRandom(-spread, spread), ofRandom(-spread, spread));
            p.velocity = glm::vec2(ofRandom(-3.0f, 3.0f), ofRandom(-5.0f, -1.0f));
            p.maxLife = ofRandom(1.0f, 4.0f);
            p.life = p.maxLife;
            particles.push_back(std::move(p));
        }
    }

private:
    std::vector<Particle> particles;  // Value semantics — no heap fragmentation
};
```

### Pattern 3: Event-Driven Communication (Decoupled Systems)

Use OF's event system instead of direct method calls between loosely coupled components. This enables plug-and-play architectures where producers and consumers are unaware of each other.

```cpp
// DataProducer.h — publishes events without knowing who listens
#pragma once
#include "ofMain.h"

class DataProducer {
public:
    void process() {
        float result = compute();
        // Notify all listeners — zero coupling to consumer types
        ofNotifyEvent(dataUpdated, result);
    }

    ofEvent<float> dataUpdated;  // Declares the event type

private:
    float compute();
};

// ofApp.cpp — listens without requiring direct reference to producer
void ofApp::setup() {
    DataProducer producer;

    // Lambda listener — captures local state, no separate method needed
    producer.dataUpdated.addListener([&](float value){
        std::cout << "Received: " << value << std::endl;
    });

    // Bind to a member function — with explicit lifetime awareness
    producer.dataUpdated.addListener(this, &ofApp::handleData);
}
```

### Pattern 4: Cross-Platform File I/O (Portable Paths)

Always use `ofToDataPath()` for loading files — it resolves correctly on macOS (`/Contents/Resources/`), Linux, and Windows. Hard-coded absolute paths will break your app on other platforms.

```cpp
void ofApp::setup() {
    // ✅ CORRECT — cross-platform path resolution
    std::string imgPath = ofToDataPath("images/background.png");
    if (!background.load(imgPath)) {
        ofLogError("ofApp") << "Failed to load: " << imgPath;
    }

    // ✅ Correct — relative paths for project config files
    std::string configPath = ofToDataPath("config/settings.xml");

    // ❌ WRONG — absolute or platform-specific paths break cross-platform builds
    // background.load("/home/user/project/images/bg.png");  // Linux only!
    // background.load("C:\\Users\\user\\project\\images\\bg.png");  // Windows only!
}
```

### Pattern 5: Shader Management with Uniforms

Use `ofShader` for GPU-accelerated rendering. Always check shader compilation before using it, and set uniforms each frame since they are not persisted between frames.

```cpp
// ofApp.h
#pragma once
#include "ofMain.h"

class ofApp : public ofBaseApp {
public:
    void setup() override;
    void draw() override;

private:
    ofShader glowShader;  // GPU shader program
};

// ofApp.cpp
void ofApp::setup() {
    if (!glowShader.load("shaders/glow.vert", "shaders/glow.frag")) {
        ofLogError("ofApp") << "Failed to load shader";
    }
}

void ofApp::draw() {
    ofClear(0, 0, 0);

    glowShader.begin();
    // Set uniforms every frame — they do NOT persist between frames
    float time = ofGetElapsedTimef();
    glowShader.setUniform1f("u_time", time);
    glowShader.setUniform2f("u_resolution", ofGetWidth(), ofGetHeight());
    glowShader.setUniform3f("u_mouse", ofGetMouseX(), ofGetMouseY(), 0.0f);

    // Draw geometry — shaders apply to everything drawn between begin()/end()
    ofDrawCircle(ofGetWidth() / 2, ofGetHeight() / 2, 100.0f);

    glowShader.end();
}
```

---

## Constraints

### MUST DO
- Keep `draw()` focused on rendering only — move computation to `update()`
- Use `ofSetVerticalSync(true)` and `ofSetFrameRate(60)` for consistent timing
- Load assets with `ofToDataPath()` for cross-platform compatibility
- Use `ofParameter` and `ofxGui` (or `ofxImGui`) for runtime-tunable parameters
- Initialize all member objects in `setup()` before the first `draw()` call
- Use `std::vector` with value semantics instead of `std::vector<Particle*>` for data structs
- Handle `windowResized()` to update viewport dimensions and projection matrices
- Call `ofClear()` at the start of every `draw()` cycle

### MUST NOT DO
- Do heavy computation (file I/O, network calls, ML inference) inside `draw()` — blocks rendering pipeline
- Call `ofLogError()` or throw exceptions from `draw()` — crashes the entire application on macOS/Linux
- Use raw `new`/`delete` for OF objects — always use stack allocation or smart pointers (`std::shared_ptr`, `std::unique_ptr`)
- Load files in `update()` or `draw()` — always preload in `setup()` with error checking
- Modify `ofWindowSettings` after window creation — must be set before `ofCreateWindow()`
- Mix `glm` and `ofVec3f`/`ofVec2f` interchangeably without explicit casting — causes subtle type bugs

---

## Output Template

When implementing or reviewing an OpenFrameworks application, produce:

1. **Project Structure** — `ofApp.h`/`ofApp.cpp` layout, addon list, CMakeLists.txt dependencies
2. **Lifecycle Plan** — What runs in `setup()` vs `update()` vs `draw()` with justification
3. **Event Architecture** — Event types, listeners, and data flow between components
4. **Rendering Strategy** — Draw primitives used, shader integration, optimization notes
5. **Cross-Platform Considerations** — Path handling, window settings, platform-specific code guards

---

## Related Skills

| Skill | Purpose |
|---|---|
| `of-shader-programming` | Deep dive into GLSL shader development within OpenFrameworks |
| `performance-optimization` | Profiling and optimizing rendering pipelines for 60fps targets |

---

## Live References

> Authoritative documentation links for OpenFrameworks development.

- [OpenFrameworks Documentation](https://openframeworks.cc/documentation/)
- [ofApp Base Class Reference](https://openframeworks.cc/documentation/apps/ofBaseApp/)
- [OF Addons Registry](https://openframeworks.cc/addons/)
- [GLM Math Library (used by OF)](https://github.com/g-truc/glm)
- [OpenFrameworks GitHub Repository](https://github.com/openframeworks/openFrameworks)
