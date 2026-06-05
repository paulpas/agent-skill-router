---




name: component-testing-library
description: Tests React, Vue, and Svelte components using Testing Library query priorities,
  renderHook for hooks, Mock Service Worker API mocking, and async state patterns
  for reliable, user-facing component tests.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: component testing, react testing library, rtl, vue testing library, svelte testing library, renderhook, msw, mock service worker testing library
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




---




# Component Testing with Testing Library and MSW

Write reliable, maintainable component tests that verify user-facing behavior rather than implementation details. This skill makes the model use Testing Library query priorities (role → label → text → placeholder → test-id), render hooks directly for custom hook testing, Mock Service Worker for API mocking, and async patterns to handle loading/error/empty states in rendered components.

## TL;DR Checklist

- [ ] Query by user-facing attributes: `getByRole`, `getByText`, `getByLabelText` — never by CSS class or DOM structure
- [ ] Use `userEvent.setup()` for all user interactions (clicks, typing, form submissions)
- [ ] Handle async UI updates with `waitFor()`, `findBy*`, or `screen.findBy*` queries
- [ ] Test loading → success and loading → error flows using MSW handlers
- [ ] Render custom hooks directly with `renderHook()` — don't test them indirectly through components
- [ ] Verify accessibility warnings from Testing Library by checking console output

---

## When to Use

Use this skill when:

- Writing unit-level component tests for React, Vue, or Svelte applications
- Testing how a component renders in different states (loading, error, empty, success)
- Mocking API responses for component integration testing with MSW
- Testing custom hooks (`useAuth`, `useForm`, `useFetch`) in isolation
- Building test suites with Vitest or Jest for frontend component libraries
- Auditing existing component tests for implementation-detail anti-patterns
- Setting up form validation, async data fetching, and user interaction tests

---

## When NOT to Use

Avoid this skill for:

- End-to-end browser testing across real URLs — use Playwright or Cypress instead
- Backend API unit testing — the `testing-unit-integration-e2e` skill covers general backend patterns
- Visual regression testing (screenshot diffs) — no existing visual regression skill covers this domain directly
- Accessibility scanning of full rendered pages — axe-core CI integration is a separate concern
- Performance benchmarking or load testing components

---

## Core Workflow

1. **Set Up Test Environment** — Configure the test runner (Vitest recommended for 2025+ projects) with Testing Library and MSW. Ensure proper cleanup after each test to prevent state leakage between test runs.

   **Checkpoint:** Verify `beforeEach` / `afterEach` hooks call `server.resetHandlers()` in MSW and that all rendered components are unmounted. Check for memory leak warnings in CI logs.

2. **Write User-Facing Assertions** — For each component test, identify what a real user would see and interact with. Select the appropriate Testing Library query method following priority order: role > accessible name > text content > placeholder > test-id.

   **Checkpoint:** Every `getBy*` or `queryBy*` call uses a semantic selector. No query targets CSS class names, element IDs used only for styling, or DOM structure (e.g., `container.querySelector('.inner-wrapper .title')`).

3. **Handle Async States** — Components that fetch data must be tested through their complete state lifecycle: loading → success/error → user interaction. Use `findBy*` queries (which auto-retry) or explicit `waitFor()` with custom assertions.

   **Checkpoint:** Confirm every async test uses proper `async/await` and doesn't race between rendering and assertion. Loading states should be explicitly verified before asserting final rendered content.

4. **Mock API Responses with MSW** — For components that depend on external APIs, define handlers in MSW that return predictable responses. Use the same handler pattern for success cases, error cases, and network failure simulation.

   **Checkpoint:** Verify MSW handlers cover: (a) successful response, (b) error response with status code, (c) loading state before any response arrives. Ensure `server.resetHandlers()` runs after each test to prevent cross-test contamination.

5. **Test Custom Hooks in Isolation** — For hooks like authentication, data fetching, or form management, use `renderHook()` to test hook behavior without rendering a component. Force state transitions with `act()` and verify resulting values.

   **Checkpoint:** Each hook test uses `act()` for async operations. Verify that the hook properly handles: initial state, successful operation, error recovery, and cleanup (unmount). Test edge cases like concurrent calls.

6. **Verify Accessibility Warnings** — Let Testing Library's built-in accessibility checks catch common violations. Check that console warnings from RTL are reviewed and fixed in test output.

   **Checkpoint:** No component renders with known WCAG 2.1 AA violations that Testing Library detects (missing labels, empty buttons, missing alt text). If a warning is intentional (e.g., decorative icon), add an `aria-hidden` attribute.

---

## Implementation Patterns

### Pattern 1: User-Facing Component Tests (React)

Testing Library's core philosophy: test what users see and do, not how the component is implemented. Queries follow a priority system — role queries are most user-friendly because screen readers also use roles.

```typescript
// ❌ BAD: Testing implementation details — queries by CSS class, tests internal state
import { render, screen } from '@testing-library/react';
import UserProfile from './UserProfile';

test('user profile loads', () => {
  // Implementation leak: querying by CSS class
  const avatar = document.querySelector('.avatar-image');
  expect(avatar).toBeInTheDocument();

  // Testing internal state instead of user-visible content
  const nameEl = document.querySelector('[class*="profile-name"]');
  expect(nameEl?.textContent).toBe('John Doe');

  // No loading state verification — race condition with network call
});

// ❌ BAD: Synchronous assertion on async component without handling pending state
test('displays user data', () => {
  render(<UserProfile userId={1} />);
  // Fails intermittently: network request may not resolve before assertion runs
  expect(screen.getByText('John Doe')).toBeInTheDocument();
  expect(screen.getByText('john@example.com')).toBeInTheDocument();
});

// ✅ GOOD: Testing by user-facing queries with proper async handling
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UserProfile from './UserProfile';

test('displays user name and email after loading', async () => {
  const user = userEvent.setup();

  render(<UserProfile userId={1} />);

  // Loading state — user sees a spinner or skeleton
  expect(screen.getByRole('progressbar')).toBeInTheDocument();
  expect(screen.getByText(/loading/i)).toBeInTheDocument();

  // Async: findBy* auto-retries with built-in waitFor (default 1000ms timeout)
  await screen.findByRole('heading', { name: /John Doe/i });
  expect(screen.getByText('john@example.com')).toBeInTheDocument();

  // User interaction — clicking edit button navigates or opens dialog
  await user.click(screen.getByRole('button', { name: /edit profile/i }));
  await screen.findByRole('dialog', { name: /edit profile/i });
});

// ✅ GOOD: Testing error state with MSW mock for API failure
import { render, screen, waitFor } from '@testing-library/react';
import UserProfile from './UserProfile';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

const server = setupServer(
  http.get('https://api.example.com/users/:id', () => {
    return HttpResponse.json(
      { error: 'User not found' },
      { status: 404, headers: { 'Content-Type': 'application/json' } }
    );
  })
);

beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
  server.close();
});

test('shows error message when user fetch fails', async () => {
  render(<UserProfile userId={999} />);

  // Verify loading state appears first
  expect(screen.getByRole('progressbar')).toBeInTheDocument();

  // Wait for error state to be displayed
  await waitFor(() => {
    expect(screen.getByRole('alert')).toHaveTextContent(/user not found/i);
  });

  // Verify retry option is available
  expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
});
```

### Pattern 2: MSW API Mocking for Complete State Flows

Mock Service Worker intercepts real fetch/XHR requests at the network layer. This means tests hit the actual DOM without needing to inject mock APIs through props or context — components behave as they would in production.

```typescript
// ✅ GOOD: Complete MSW setup covering all component states
import { http, HttpResponse, graphql } from 'msw';
import { setupServer } from 'msw/node';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

// Define handlers once — reuse across tests via server.resetHandlers()
const server = setupServer(
  // REST API — successful response
  http.get('https://api.example.com/users/:id', ({ params }) => {
    return HttpResponse.json({
      id: params.id,
      name: 'Jane Smith',
      email: 'jane@example.com',
      avatar: '/avatars/jane.png',
      role: 'admin' as const,
    }, { headers: { 'Content-Type': 'application/json' } });
  }),

  // REST API — error response
  http.get('https://api.example.com/users/:id', ({ params }) => {
    if (params.id === 'deleted') {
      return HttpResponse.json(
        { error: 'User has been deleted' },
        { status: 410, headers: { 'Content-Type': 'application/json' } }
      );
    }
    return HttpResponse.next(); // Continue to next handler if not matched
  }),

  // REST API — network failure simulation
  http.get('https://api.example.com/users/:id', () => {
    return new HttpResponse(null, { status: 503 });
  }),

  // GraphQL queries (if component uses GraphQL)
  graphql.query('GetUser', ({ variables }) => {
    if (variables.id === '1') {
      return HttpResponse.json({
        data: { user: { name: 'Bob Jones', email: 'bob@example.com' } },
      });
    }
    return HttpResponse.json(
      { errors: [{ message: 'User not found' }] },
      { status: 404 }
    );
  }),

  // GraphQL mutations — simulate network delay
  graphql.mutation('UpdateUser', async () => {
    await new Promise(resolve => setTimeout(resolve, 100)); // Simulate latency
    return HttpResponse.json({
      data: { updateUser: { name: 'Bob Updated', email: 'bob.new@example.com' } },
    });
  }),
);

beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers(); // Critical: prevents test A's handlers from affecting test B
  server.close();
});
test('renders user profile with loaded data', async () => {
  render(<UserProfile userId="1" />);

  // Verify loading state appears immediately
  expect(screen.getByRole('progressbar')).toBeInTheDocument();

  // Wait for data to resolve
  await screen.findByRole('heading', { name: /Jane Smith/i });
  expect(screen.getByText('jane@example.com')).toBeInTheDocument();
});

test('handles 410 Gone response gracefully', async () => {
  render(<UserProfile userId="deleted" />);

  await waitFor(() => {
    expect(screen.getByRole('alert')).toHaveTextContent(/deleted/i);
  });

  // Verify user can return to list
  expect(screen.getByRole('link', { name: /back to users/i })).toBeInTheDocument();
});
```

### Pattern 3: Custom Hook Testing with `renderHook`

Custom hooks encapsulate logic (state management, data fetching, form validation) that should be tested independently of any rendering framework. `renderHook` provides direct access to the hook's return value without DOM rendering overhead.

```typescript
// ✅ GOOD: Direct hook testing with renderHook — no component needed
import { renderHook, act } from '@testing-library/react';
import { useAuth } from './useAuth';

describe('useAuth', () => {
  test('starts in unauthenticated state', async () => {
    const { result } = renderHook(() => useAuth());

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(result.current.login).toBeInstanceOf(Function);
    expect(result.current.logout).toBeInstanceOf(Function);
  });

  test('logs in user and updates state', async () => {
    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.login({ id: '1', name: 'Alice' });
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user?.name).toBe('Alice');
    expect(result.current.user?.id).toBe('1');
  });

  test('handles login failure without mutating state', async () => {
    const { result } = renderHook(() => useAuth());

    await act(async () => {
      try {
        await result.current.login({ id: '999', name: 'Nobody' });
      } catch { /* Expected — mock returns error */ }
    });

    // State should be unchanged after failed login
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });

  test('logs out and clears session', async () => {
    const { result, unmount } = renderHook(() => useAuth());

    // Log in first
    await act(async () => {
      await result.current.login({ id: '1', name: 'Alice' });
    });
    expect(result.current.isAuthenticated).toBe(true);

    // Now log out
    await act(() => {
      result.current.logout();
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();

    unmount(); // Test cleanup side effects (e.g., token refresh abort)
  });
});

// ✅ GOOD: Form hook testing with realistic user interactions
import { renderHook, act } from '@testing-library/react';
import { useForm } from './useForm';

describe('useForm', () => {
  test('validates required fields on submit', async () => {
    const { result } = renderHook(() => useForm({
      schema: { email: 'required|email', password: 'required|min:8' },
    }));

    // Submit with empty values
    await act(async () => {
      try {
        await result.current.submit();
      } catch (errors) { /* Validation errors */ }
    });

    expect(result.current.errors).toHaveProperty('email');
    expect(result.current.errors).toHaveProperty('password');
  });

  test('updates field value and clears error', async () => {
    const { result, rerender } = renderHook(
      ({ schema }) => useForm({ schema }),
      { initialProps: { schema: { email: 'required|email' } } }
    );

    // Simulate user typing — setValue triggers re-render in real hook
    await act(async () => {
      result.current.setValue('email', 'invalid-email');
    });

    expect(result.current.errors.email).toBeTruthy();

    await act(async () => {
      result.current.setValue('email', 'valid@email.com');
    });

    expect(result.current.values.email).toBe('valid@email.com');
    expect(result.current.errors.email).toBeFalsy();
  });
});
```

### Pattern 4: Form Testing with `userEvent` and Validation

Forms are the most complex UI interaction pattern. Testing them requires simulating real user input, verifying validation feedback, and ensuring form submission behavior is correct.

```typescript
// ❌ BAD: Testing form by directly manipulating DOM values
import { render, screen } from '@testing-library/react';
import Loginform from './LoginForm';

test('login form validates email', () => {
  const { container } = render(<LoginForm />);

  // Directly setting input value bypasses React's state management
  const input = container.querySelector('input[type="email"]') as HTMLInputElement;
  input.value = 'invalid';
  input.dispatchEvent(new Event('change', { bubbles: true }));

  // No userEvent, no proper async handling for validation feedback
});

// ✅ GOOD: Testing form with userEvent setup and validation flows
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginForm from './LoginForm';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

const server = setupServer(
  http.post('https://api.example.com/auth/login', async ({ request }) => {
    const body = await request.json();
    if (body.email === 'test@example.com' && body.password === 'password123') {
      return HttpResponse.json({ token: 'mock-jwt-token', user: { id: '1', name: 'Test User' } });
    }
    return HttpResponse.json(
      { error: 'Invalid credentials' },
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  })
);

beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
  server.close();
});

test('login form shows validation errors for invalid input', async () => {
  const user = userEvent.setup();

  render(<LoginForm />);

  // Type into fields using userEvent (simulates real keyboard input)
  await user.type(screen.getByLabelText(/email/i), 'not-an-email');
  await user.type(screen.getByLabelText(/password/i, { selector: 'input' }), 'short');

  // Submit the form
  await user.click(screen.getByRole('button', { name: /sign in/i }));

  // Validation errors appear — Testing Library catches these as console warnings too
  await waitFor(() => {
    expect(screen.getByText(/invalid email/i)).toBeInTheDocument();
  });
});

test('login form submits successfully with valid credentials', async () => {
  const user = userEvent.setup();

  render(<LoginForm />);

  await user.type(screen.getByLabelText(/email/i), 'test@example.com');
  await user.type(screen.getByLabelText(/password/i, { selector: 'input' }), 'password123');
  await user.click(screen.getByRole('button', { name: /sign in/i }));

  // Wait for auth response and redirect
  await screen.findByText(/welcome back/i);

  // Verify token stored (implementation detail — acceptable to assert side effects)
  const savedToken = localStorage.getItem('auth_token');
  expect(savedToken).toBe('mock-jwt-token');
});

test('login form displays server error on invalid credentials', async () => {
  const user = userEvent.setup();

  render(<LoginForm />);

  await user.type(screen.getByLabelText(/email/i), 'wrong@example.com');
  await user.type(screen.getByLabelText(/password/i, { selector: 'input' }), 'wrongpass123');
  await user.click(screen.getByRole('button', { name: /sign in/i }));

  // Server returns 401 — error toast/banner appears
  await waitFor(() => {
    expect(screen.getByRole('alert')).toHaveTextContent(/invalid credentials/i);
  });
});
```

### Pattern 5: Async Component State Testing (Loading → Error → Success)

Components that fetch data have multiple render states. Tests must cover each state explicitly, not just the happy path. This pattern ensures no regressions in error handling or loading UX.

```typescript
// ✅ GOOD: Complete async state coverage for a data-fetching component
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ArticleList from './ArticleList';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

const articles = [
  { id: '1', title: 'Getting Started with Testing Library', published: true },
  { id: '2', title: 'Advanced Hook Patterns', published: false },
];

const server = setupServer(
  // Success: paginated article list
  http.get('https://api.example.com/articles', () => {
    return HttpResponse.json({ data: articles, total: 2, page: 1 });
  }),

  // Error: server returns 500
  http.get('https://api.example.com/articles/fail', () => {
    return new HttpResponse(null, { status: 500 });
  }),

  // Empty: no articles match query
  http.get('https://api.example.com/articles/empty', () => {
    return HttpResponse.json({ data: [], total: 0, page: 1 });
  }),
);

beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
  server.close();
});

test('article list shows loading state initially', async () => {
  render(<ArticleList endpoint="/articles" />);

  // Loading skeleton or spinner appears immediately (synchronously)
  expect(screen.getByRole('progressbar')).toBeInTheDocument();
  expect(screen.queryByRole('article')).not.toBeInTheDocument();
});

test('article list renders articles after data loads', async () => {
  render(<ArticleList endpoint="/articles" />);

  // Verify articles appear via findBy* (auto-retry, built-in waitFor)
  const article1 = await screen.findByText(/Getting Started with Testing Library/i);
  expect(article1).toBeInTheDocument();

  const article2 = await screen.findByRole('heading', { name: /Advanced Hook Patterns/i });
  expect(article2).toBeInTheDocument();

  // Verify only published articles shown (component filters unpublished)
  expect(screen.queryByText(/Advanced Hook Patterns/i)).not.toBeInTheDocument();
});

test('article list shows empty state when no results', async () => {
  render(<ArticleList endpoint="/articles/empty" />);

  await waitFor(() => {
    expect(screen.getByText(/no articles found/i)).toBeInTheDocument();
  });

  // Empty state should have a CTA to adjust filters
  const cta = screen.getByRole('button', { name: /browse all articles/i });
  expect(cta).toBeInTheDocument();
});

test('article list handles server error and offers retry', async () => {
  render(<ArticleList endpoint="/articles/fail" />);

  // Verify error state is displayed
  await waitFor(() => {
    expect(screen.getByRole('alert')).toHaveTextContent(/failed to load/i);
  });

  // Retry button exists and works
  const user = userEvent.setup();
  const retryBtn = screen.getByRole('button', { name: /retry/i });
  expect(retryBtn).toBeInTheDocument();

  await user.click(retryBtn);

  // After retry with no new MSW handler, falls through to success handler
  await screen.findByText(/Getting Started with Testing Library/i);
});
```

---

## Constraints

### MUST DO
- Always query by semantic role first (`getByRole`), then accessible name, then text content — never by CSS class names or DOM structure
- Use `userEvent.setup()` for all user interactions (clicks, typing, hover) — never `fireEvent` for user actions unless testing the event directly
- Handle every async state explicitly: loading → success/error transitions must have dedicated assertions
- Always call `server.resetHandlers()` in `afterEach` to prevent MSW handler leakage between tests
- Use `waitFor()` with custom callback assertions (not just `waitFor(() => {})`) — always assert something meaningful
- Test hooks directly with `renderHook()` and use `act()` for async state updates within hook testing
- Let Testing Library's built-in accessibility warnings surface in test output; fix violations instead of suppressing them

### MUST NOT DO
- Never query elements by CSS class names (`container.querySelector('.btn-primary')`) — this couples tests to implementation details
- Never assert internal component state (e.g., `expect(component.state('isLoading')).toBe(false)`) — only assert what users see
- Never use synchronous assertions on async components without proper waiting (`screen.findBy*` or `waitFor()`)
- Never share MSW handlers across tests without `server.resetHandlers()` — this causes false positives and flaky tests
- Never test framework internals (React's setState, Vue's reactivity system) — test the rendered output instead
- Never skip error state testing — if a component makes a network request, it must have a tested failure path

---

## Output Template

When implementing or reviewing component tests, produce:

1. **Test File Structure** — The test file layout with describe blocks organized by component feature (rendering, user interactions, error states)
2. **MSW Handler Block** — All API mock handlers needed to cover the component's state machine (success, error, empty, loading)
3. **Async Test Cases** — Individual test functions covering each render state transition with explicit `findBy*` or `waitFor()` assertions
4. **Hook Test Suite** — Isolated hook tests using `renderHook()` and `act()` for state mutations
5. **Test Quality Audit** — List of any remaining implementation-detail queries, missing async handling, or untested edge states

---

## Related Skills

| Skill | Purpose |
|---|---|
| `testing-unit-integration-e2e` | General test strategy and pyramid across all languages — this skill is the frontend-specific complement |
| `design-systems` | Shared component library — these skills test the components built with design system tokens |
| `code-review` | Review test quality in pull requests, including assertion clarity and flaky test prevention |

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Testing Library Documentation (React)](https://testing-library.com/docs/react-testing-library/intro/)
- [Mock Service Worker v3 Documentation](https://mswjs.io/docs/)
- [Vitest Component Testing Guide](https://vitest.dev/guide/browser/)
- [MDN: userEvent API Reference](https://testing-library.com/docs/user-event/intro/)
- [React Testing Library API Reference](https://testing-library.com/docs/react-testing-library/api/)
