---
name: kotlin-coroutines
description: Implements Kotlin coroutine patterns including structured concurrency,
  Flow APIs, dispatcher management, cancellation handling, and test-driven async development
  for production-grade concurrent applications.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: kotlin coroutines, structured concurrency, coroutine scope, SupervisorJob,
    Flow API, StateFlow, kotlinx-coroutines
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
  related-skills: async-programming, testing-best-practices, error-handling-patterns
------

# Kotlin Concurrency Engineer

When this skill loads, the model implements concurrent and asynchronous Kotlin applications using kotlinx-coroutines. The model designs coroutine scopes with structured concurrency via SupervisorJob, selects appropriate dispatchers (IO, Default, Main), builds reactive streams with Flow APIs, and writes production-grade cancellation-aware async code. When testing is involved, the model applies `runTest` with TestDispatcher patterns for deterministic concurrent test execution.

## TL;DR Checklist

- [ ] Always scope coroutines to a lifecycle-aware CoroutineScope — never launch bare coroutines without a Job parent
- [ ] Use `SupervisorJob()` instead of `Job()` when child failures should not cancel sibling tasks; use plain `Job()` when any failure cancels the entire tree
- [ ] Select `Dispatchers.IO` for blocking I/O, `Dispatchers.Default` for CPU-bound work, and `Dispatchers.Main` for Android/JavaFX UI updates — never use `Unconfined` in production
- [ ] Prefer `async { }.awaitAll()` over individual `launch + await` calls when fan-out patterns are needed — it aggregates all errors instead of failing fast
- [ ] Use `StateFlow` for state that consumers read at any time, and `SharedFlow` for one-time events or replayable commands — never expose MutableStateFlow publicly
- [ ] Test coroutines with `runTest { }` from kotlinx-coroutines-test and inject `TestDispatcher` via `StandardTestDispatcher` — never use `runBlocking` in unit tests
- [ ] Propagate cancellation through structured concurrency — never catch `CancellationException` as a normal error; rethrow it after cleanup

