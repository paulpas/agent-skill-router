---
name: asyncio-patterns
description: Implements Python asyncio patterns (TaskGroup, semaphores, queues, context
  management) with typed coroutines, proper error handling, and structured concurrency
  for production-grade async applications in Python 3.12+.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: asyncio, async await, coroutine, event loop, TaskGroup, async context
    manager, aiohttp, structured concurrency, python async, asyncio.timeout, gather
    as_completed
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
  related-skills: async-programming, automated-testing
------

# Python AsyncIO Patterns

Implements production-grade asyncio patterns for Python applications — structured concurrency with TaskGroup, bounded concurrency via semaphores and queues, typed coroutines with proper error propagation, and async resource management using context managers. This skill covers the full lifecycle from event loop setup to graceful shutdown in Python 3.12+.

## TL;DR Checklist

- [ ] Use `asyncio.TaskGroup` (Python 3.11+) for structured concurrency — never fire-and-forget with bare `create_task()`
- [ ] Set explicit timeouts on all external I/O calls using `asyncio.timeout()` or `asyncio.wait_for()`
- [ ] Wrap blocking operations in `loop.run_in_executor()` or use async-compatible libraries exclusively
- [ ] Aggregate errors across concurrent tasks — never suppress exceptions with bare `except Exception: pass`
- [ ] Use `async for` / `async with` patterns properly; ensure all resource cleanup happens in async context managers
- [ ] Profile event loop health with `loop.set_debug(True)` in development and check for long-running callbacks

