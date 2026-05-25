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

---

## When to Use

Use this skill when:

- Building a cross-platform mobile app from a single Go codebase
- Integrating Go libraries into an existing iOS or Android app via Go Mobile bindings
- Prototyping a mobile app quickly with Fyne's cross-platform widgets
- Needing platform-agnostic networking, crypto, or data processing in a mobile app
- Targeting both iOS and Android with shared business logic

---

## When NOT to Use

Avoid this skill for:

- Apps requiring deep platform-specific UI (use SwiftUI/Kotlin instead)
- Performance-critical real-time apps (game engines, AR/VR — Go GC pauses are unacceptable)
- Apps that need heavy native platform integration (CameraX, CoreML, ML Kit)
- Apps targeting API levels below 23 on Android or iOS 13 on iOS

---

## Core Workflow

1. **Choose the Approach** — Fyne for cross-platform apps with native widgets, or Go Mobile for native bindings.
   **Checkpoint:** Decision is based on UI requirements and platform integration depth.

2. **Set Up the Project Structure** — Organize shared logic, UI code, and platform-specific code.
   **Checkpoint:** Business logic is in a pure Go package that compiles on all platforms.

3. **Implement the UI** — Build interfaces using Fyne widgets or Go Mobile native bindings.
   **Checkpoint:** UI adapts to both portrait and landscape orientations.

4. **Handle Lifecycle Events** — Implement pause, resume, and destroy hooks for resource management.
   **Checkpoint:** Background work is cancelled on pause; resources are released on destroy.

5. **Build and Deploy** — Cross-compile for target platforms using `fyne package` or `gomobile bind`.
   **Checkpoint:** Binary sizes are under 50MB for initial download on both platforms.

---

## Implementation Patterns

### Pattern 1: Fyne Cross-Platform App (❌ BAD vs ✅ GOOD)

Fyne provides a single API for native-looking UI on desktop, iOS, and Android.

#### ❌ BAD — Platform-Specific UI Code

```go
// ❌ BAD: platform-specific UI code — cannot run on all platforms
func main() {
	// This only works on Windows/macOS/Linux
	app := desktop.NewApplication()

	// Android-specific code
	if runtime.GOOS == "android" {
		androidApp := android.NewActivity() // requires CGO, Android NDK
	}

	// iOS-specific code
	if runtime.GOOS == "ios" {
		iOSApp := iOS.NewViewController() // requires CGO, Xcode toolchain
	}

	// UI is built with platform-specific APIs — not portable
	window := app.NewWindow("My App")
	window.Resize(fyne.NewSize(800, 600))
	window.ShowAndRun()
}
```

**What's wrong:**
- Code branches on `runtime.GOOS` — not a single portable binary
- Requires different build toolchains for each platform
- UI code is not shared — each platform needs its own implementation
- Fyne's `desktop.NewApplication()` is not the correct entry point for mobile

#### ✅ GOOD — True Cross-Platform with Fyne

```go
// app is the cross-platform Fyne application singleton.
// It works on desktop, iOS, and Android from the same source code.
var app fyne.App

// main is the entry point for the Fyne mobile application.
// Build with: go build -o myapp .
// Package for iOS: fyne package -os ios -icon icon.png
// Package for Android: fyne package -os android -icon icon.png
func main() {
	app = fyne.NewApp()
	app.SetIcon(fyne.NewResource("icon.png", []byte{}))

	window := app.NewWindow("Go Mobile App")
	window.SetContent(buildUI())

	// Set minimum window size for mobile screens
	window.Resize(fyne.NewSize(360, 640))
	window.SetFixedSize(true) // prevent resize on mobile

	window.ShowAndRun()
}

// buildUI creates the application's user interface using Fyne widgets.
// All widgets render as native controls on each platform.
func buildUI() fyne.CanvasObject {
	// Layout: responsive grid that works on portrait and landscape
	content := fyne.NewContainerWithLayout(
		fyne.NewVBoxLayout(),
		fyne.NewLabel("Go Mobile App"),
		fyne.NewSeparator(),

		// Data entry
		fyne.NewLabel("Enter name:"),
		nameEntry := fyne.NewEntry(),
		nameEntry.SetPlaceHolder("Your name"),

		// Action buttons
		fyne.NewContainerWithLayout(
			fyne.NewHBoxLayout(),
			submitBtn := fyne.NewButton("Submit", func() {
				handleSubmit(nameEntry.Text)
			}),
			fyne.NewButton("Clear", func() {
				nameEntry.SetText("")
			}),
		),

		// Results display
		resultsLabel := fyne.NewLabel(""),
	)

	// Store references in app state for lifecycle management
	appState = &AppState{nameEntry: nameEntry, resultsLabel: resultsLabel}

	return content
}

// AppState holds mutable UI state for access across handlers and lifecycle.
type AppState struct {
	nameEntry    *fyne.Entry
	resultsLabel *fyne.Label
}

var appState *AppState

// handleSubmit processes user input on a background goroutine.
func handleSubmit(name string) {
	if name == "" {
		appState.resultsLabel.SetText("Error: name cannot be empty")
		return
	}

	// UI updates must happen on the main thread
	fyne.Do(func() {
		appState.resultsLabel.SetText("Processing...")
	})

	// Background work in goroutine
	go func() {
		// Simulate network request or computation
		result := processName(name)

		// Back to main thread for UI update
		fyne.Do(func() {
			if result == nil {
				appState.resultsLabel.SetText("Error: processing failed")
			} else {
				appState.resultsLabel.SetText(fmt.Sprintf("Hello, %s!", *result))
			}
		})
	}()
}

// processName processes a name and returns the result.
func processName(name string) *string {
	// Simulate work
	result := strings.ToUpper(strings.TrimSpace(name))
	return &result
}
```

**Why this works:**
- Single codebase runs on desktop, iOS, and Android without changes
- `fyne.Do()` ensures UI updates happen on the main thread
- Background work runs in goroutines, results posted back to main thread
- `SetFixedSize(true)` prevents layout issues on mobile
- `fyne package` handles all platform-specific build steps

---

### Pattern 2: Go Mobile Bindings (❌ BAD vs ✅ GOOD)

Go Mobile generates bindings for calling Go code from native iOS/Android apps.

#### ❌ BAD — Raw CGO Without Bindings

```go
// ❌ BAD: raw CGO without Go Mobile bindings — requires manual JNI/Objective-C code
package main

import "C" // requires CGO and C toolchain

//export GoFunction
func GoFunction() *C.char {
	// Manual memory management — easy to leak
	cstr := C.CString("Hello from Go")
	defer C.free(unsafe.Pointer(cstr))
	return cstr
}

// No automatic binding generation — must write JNI code manually
// for Android and Objective-C bridges for iOS
func main() {}
```

**What's wrong:**
- Raw CGO requires manual bridge code for each platform
- No automatic binding generation — must write JNI/Objective-C manually
- Memory management is error-prone with `C.CString`/`C.free`
- No type safety between Go and native code
- Build requires NDK for Android and Xcode toolchain for iOS separately

#### ✅ GOOD — Go Mobile Bindings

```go
// Package mobilelib provides functions callable from iOS and Android apps.
// Generated bindings with: gomobile bind -target=ios,android
package mobilelib

import (
	"context"
	"fmt"
	"time"
)

// Config holds configuration for the mobile library.
type Config struct {
	APIKey    string
	Timeout   time.Duration
	MaxRetries int
}

// Result represents a processed result from the library.
type Result struct {
	Data    string
	Success bool
	Error   string
}

// ProcessData processes input data and returns a Result.
// This function is available from iOS (Swift/Objective-C) and Android (Java/Kotlin).
func ProcessData(ctx context.Context, input string, cfg Config) (*Result, error) {
	if input == "" {
		return nil, fmt.Errorf("input cannot be empty")
	}
	if cfg.APIKey == "" {
		return nil, fmt.Errorf("API key is required")
	}
	if cfg.Timeout == 0 {
		cfg.Timeout = 30 * time.Second
	}
	if cfg.MaxRetries == 0 {
		cfg.MaxRetries = 3
	}

	// Validate context deadline
	if deadline, ok := ctx.Deadline(); !ok {
		ctx, cancel := context.WithTimeout(ctx, cfg.Timeout)
		defer cancel()
	}

	// Process with retries
	var lastErr error
	for i := 0; i <= cfg.MaxRetries; i++ {
		result, err := processWithAPI(ctx, input, cfg.APIKey)
		if err == nil {
			return &Result{
				Data:    result,
				Success: true,
			}, nil
		}
		lastErr = err

		// Exponential backoff between retries
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		case <-time.After(time.Duration(i+1) * 500 * time.Millisecond):
		}
	}

	return nil, fmt.Errorf("process data: all %d retries failed: %w", cfg.MaxRetries, lastErr)
}

// processWithAPI calls the external API with the given input and API key.
func processWithAPI(ctx context.Context, input, apiKey string) (string, error) {
	// Implementation would use http.Client with ctx for cancellation
	// For binding purposes, the function is self-contained
	_ = apiKey // API key used for authentication
	return fmt.Sprintf("processed: %s", input), nil
}

// IsAvailable checks if required system features are available.
// Called from native code to check device capabilities before using Go functions.
func IsAvailable() bool {
	// Check for required system features
	// In a real implementation, this might check GPS, camera, etc.
	return true
}
```

**Why this works:**
- `gomobile bind` generates native bindings automatically for iOS and Android
- Go types map to native types — `string` → `String`/`String`, `bool` → `Bool`/`boolean`
- Context propagation enables cancellation from native code
- Error handling uses Go's idiomatic `error` return, mapped to exceptions in native code
- No manual JNI or Objective-C bridge code needed

---

### Pattern 3: Lifecycle Management (❌ BAD vs ✅ GOOD)

Mobile apps have lifecycle events that must be handled to prevent resource leaks.

#### ❌ BAD — No Lifecycle Awareness

```go
// ❌ BAD: goroutines continue running after app is paused or destroyed
func startBackgroundSync() {
	go func() {
		for {
			// Infinite loop — never stops
			syncData()
			time.Sleep(5 * time.Minute)
		}
	}()
}
```

**What's wrong:**
- Goroutine runs forever — drains battery and memory
- No way to stop the goroutine when the app is paused
- Network requests continue in the background — wastes data and battery
- App can be killed by the OS for excessive resource usage

#### ✅ GOOD — Lifecycle-Aware Background Work

```go
// syncManager manages background synchronization with lifecycle awareness.
// It starts sync on resume and cancels on pause.
type syncManager struct {
	mu       sync.Mutex
	ctx      context.Context
	cancel   context.CancelFunc
	interval time.Duration
	active   bool
}

// newSyncManager creates a sync manager with the given interval.
func newSyncManager(interval time.Duration) *syncManager {
	return &syncManager{interval: interval}
}

// Start begins background synchronization. Safe to call multiple times.
func (m *syncManager) Start() {
	m.mu.Lock()
	defer m.mu.Unlock()

	if m.active {
		return // already running
	}

	m.ctx, m.cancel = context.WithCancel(context.Background())
	m.active = true

	go m.syncLoop()
}

// Stop cancels the sync loop and waits for it to finish.
func (m *syncManager) Stop() {
	m.mu.Lock()
	defer m.mu.Unlock()

	if !m.active {
		return
	}

	m.cancel()
	m.active = false
}

// syncLoop runs the synchronization loop, respecting the context deadline.
func (m *syncManager) syncLoop() {
	ticker := time.NewTicker(m.interval)
	defer ticker.Stop()

	for {
		select {
		case <-m.ctx.Done():
			return // cancelled — clean exit
		case <-ticker.C:
			m.doSync(m.ctx)
		}
	}
}

// doSync performs a single synchronization cycle.
func (m *syncManager) doSync(ctx context.Context) {
	// Use context-aware API calls
	if err := syncWithServer(ctx); err != nil {
		// Log but don't retry immediately — let the next tick handle it
		log.Printf("sync failed: %v", err)
	}
}

// OnAppResume is called when the app comes to the foreground.
func OnAppResume(manager *syncManager) {
	manager.Start()
}

// OnAppPause is called when the app goes to the background.
func OnAppPause(manager *syncManager) {
	manager.Stop()
}
```

**Why this works:**
- `context.WithCancel` provides clean cancellation of the sync loop
- `syncManager` is thread-safe with mutex protection
- `Start()` is idempotent — safe to call multiple times
- `Stop()` cancels context, allowing the goroutine to exit cleanly
- Fyne's `OnLifecycle` callback can wire these to actual lifecycle events

---

## Constraints

### MUST DO

- **MUST** ensure all UI updates happen on the main thread using `fyne.Do()` or equivalent
- **MUST** run background work in goroutines and post results back to the main thread
- **MUST** handle lifecycle events (pause, resume, destroy) for resource management
- **MUST** use `context.Context` for cancellable network requests in mobile apps
- **MUST** use `go build` with the target OS flag for cross-compilation (`-os ios`, `-os android`)

### MUST NOT DO

- **MUST NOT** update UI from background goroutines — this causes undefined behavior on iOS
- **MUST NOT** spawn unbounded goroutines — mobile devices have limited CPU and memory
- **MUST NOT** use `time.Sleep` for synchronization in mobile apps — it blocks the main thread
- **MUST NOT** ignore battery consumption — profile goroutine and network usage
- **MUST NOT** mix Fyne and Go Mobile in the same application — choose one approach

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `best-practices` | Go idioms, naming, and error handling conventions |
| `web-applications` | HTTP client patterns for mobile API communication |
| `modular-design` | Package structure for shared business logic across mobile and web |
