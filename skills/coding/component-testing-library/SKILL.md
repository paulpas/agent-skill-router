---
name: component-testing-library
description: Tests React, Vue, and Svelte components using Testing Library query priorities,
  renderHook for hooks, Mock Service Worker API mocking, and async state patterns
  for reliable, user-facing component tests.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: component testing, react testing library, rtl, vue testing library, svelte
    testing library, renderhook, msw, mock service worker, api mocking, frontend testing,
    user event setup, test component, how do i test a react component, testing async
    ui, testing loading states, testing with hooks, vitest component test, form validation
    test
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
  related-skills: testing-unit-integration-e2e, design-systems, code-review
------

# Component Testing with Testing Library and MSW

Write reliable, maintainable component tests that verify user-facing behavior rather than implementation details. This skill makes the model use Testing Library query priorities (role → label → text → placeholder → test-id), render hooks directly for custom hook testing, Mock Service Worker for API mocking, and async patterns to handle loading/error/empty states in rendered components.

## TL;DR Checklist

- [ ] Query by user-facing attributes: `getByRole`, `getByText`, `getByLabelText` — never by CSS class or DOM structure
- [ ] Use `userEvent.setup()` for all user interactions (clicks, typing, form submissions)
- [ ] Handle async UI updates with `waitFor()`, `findBy*`, or `screen.findBy*` queries
- [ ] Test loading → success and loading → error flows using MSW handlers
- [ ] Render custom hooks directly with `renderHook()` — don't test them indirectly through components
- [ ] Verify accessibility warnings from Testing Library by checking console output

