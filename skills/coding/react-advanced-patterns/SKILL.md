---
name: react-advanced-patterns
description: Implements advanced React patterns including render props, higher-order components, custom hooks composition, portals, error boundaries, and ref forwarding for complex component architectures.
license: MIT
compatibility: opencode
archetypes:
  - tactical
  - generation
anti_triggers:
  - brainstorming
  - vague ideation
  - long-form architecture
response_profile:
  verbosity: low
  directive_strength: high
  abstraction_level: operational
metadata:
  version: "1.0.0"
  domain: coding
  triggers: react advanced, custom hooks, error boundary, react portal, hoc, forward ref, render props
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: react-composition-patterns, react-rerender-optimization, react-client-data-fetching
  author: https://github.com/vercel-labs
  source: https://github.com/vercel-labs/agent-skills
---

# Advanced React Patterns

Implements advanced React patterns for cross-cutting concerns: custom hooks for stateful logic reuse, higher-order components for configuration injection, render props for flexible rendering, portals for out-of-DOM rendering, error boundaries for graceful failure, and ref forwarding for imperative access.

## TL;DR Checklist

- [ ] Choose hooks over HOCs for stateful logic reuse
- [ ] Compose small hooks into larger ones following the single-responsibility principle
- [ ] Use createPortal for modals, tooltips, and dropdowns outside parent DOM hierarchy
- [ ] Implement error boundaries at route and feature boundaries
- [ ] Set displayName on all HOCs for debugging
- [ ] Use forwardRef when wrapping native DOM elements
- [ ] Test each pattern in isolation before composing

---

## When to Use

Use this skill when:

- Extracting reusable stateful logic shared across multiple components
- Building modals, tooltips, or dropdowns that need to escape overflow/scroll containers
- Adding error catch-all boundaries to feature sections or routes
- Wrapping third-party DOM elements that need ref access through component layers
- Implementing cross-cutting concerns (logging, analytics, authentication) across many components
- Creating flexible component APIs where the consumer controls rendering
- Exposing imperative methods (scrollTo, focus, reset) on a component via refs

---

## When NOT to Use

Avoid this skill for:

- Simple state management — useState and useEffect suffice
- One-off UI patterns that don't need reuse — premature abstraction
- Async data fetching without shared logic — use `react-client-data-fetching` instead
- Components that never expose refs or need portal rendering
- Situations where custom hooks already solve the problem — don't add HOC complexity

---

## Core Workflow

1. **Identify the Cross-Cutting Concern** — Is it state logic, configuration injection, flexible rendering, or DOM escape? Each maps to a different pattern.

2. **Select the Appropriate Pattern**:
   - Stateful logic → custom hooks
   - Configuration/behavior injection → HOC
   - Flexible render control → render props
   - Escape parent container → portals (createPortal)
   - Catch rendering errors → error boundaries
   - Expose imperative methods → forwardRef + useImperativeHandle

3. **Implement with TypeScript** — Use proper generic types for maximum reusability.

4. **Test in Isolation** — Verify each pattern works independently before composing multiple patterns together.

---

## Implementation Patterns

### Pattern 1: Custom Hooks Composition

```typescript
// ✅ GOOD: Small, composable hooks — each has one responsibility
function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStoredValue((prev) => {
        const valueToStore = value instanceof Function ? value(prev) : value;
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
        return valueToStore;
      });
    },
    [key]
  );

  return [storedValue, setValue] as const;
}

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => matchMedia(query).matches);

  useEffect(() => {
    const mql = matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [query]);

  return matches;
}

// Compose them for a complex behavior
function useResponsiveLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useLocalStorage(key, initialValue);
  const isMobile = useMediaQuery('(max-width: 768px)');

  const adjustedValue = useMemo(
    () => (isMobile ? truncateForMobile(value) : value),
    [value, isMobile]
  );

  return [adjustedValue, setValue] as const;
}
```

### Pattern 2: Error Boundary with Granular Fallback (BAD vs. GOOD)

```typescript
// ❌ BAD: Class component error boundary — works but verbose and lacks TypeScript generics
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) return <h1>Something went wrong</h1>;
    return this.props.children;
  }
}
```

```typescript
// ✅ GOOD: Error boundary with typed fallback component and granular control
interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; reset: () => void }>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    this.props.onError?.(error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render(): React.ReactNode {
    if (this.state.hasError && this.state.error) {
      const Fallback = this.props.fallback;
      if (Fallback) {
        return <Fallback error={this.state.error} reset={this.handleReset} />;
      }
      return <h1>Something went wrong.</h1>;
    }
    return this.props.children;
  }
}

// Usage: wrap routes or feature sections
<ErrorBoundary
  fallback={({ error, reset }) => (
    <div role="alert">
      <h2>Section failed to load</h2>
      <pre>{error.message}</pre>
      <button onClick={reset}>Retry</button>
    </div>
  )}
  onError={(err) => logErrorToService(err)}
>
  <UserProfile userId={id} />
</ErrorBoundary>
```

### Pattern 3: Portal for Modal Rendering

```typescript
// ✅ GOOD: Portal-based modal escapes parent overflow/stacking context
import { createPortal } from 'react-dom';

interface PortalProps {
  children: React.ReactNode;
  container?: Element | DocumentFragment;
}

function Portal({ children, container = document.body }: PortalProps) {
  return createPortal(children, container);
}

function Modal({ isOpen, onClose, children }: ModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>,
    document.body
  );
}
```

### Pattern 4: forwardRef + useImperativeHandle

```typescript
// ✅ GOOD: Expose imperative methods through forwarded ref
interface FancyInputHandle {
  focus: () => void;
  reset: () => void;
  select: () => void;
}

interface FancyInputProps {
  defaultValue?: string;
  onValueChange?: (value: string) => void;
}

const FancyInput = forwardRef<FancyInputHandle, FancyInputProps>(
  function FancyInput({ defaultValue, onValueChange }, ref) {
    const inputRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(
      ref,
      () => ({
        focus: () => inputRef.current?.focus(),
        reset: () => {
          if (inputRef.current) {
            inputRef.current.value = defaultValue ?? '';
            onValueChange?.(defaultValue ?? '');
          }
        },
        select: () => inputRef.current?.select(),
      }),
      [defaultValue, onValueChange]
    );

    return (
      <input
        ref={inputRef}
        defaultValue={defaultValue}
        onChange={(e) => onValueChange?.(e.target.value)}
      />
    );
  }
);

// Parent uses imperative handle
function Form() {
  const inputRef = useRef<FancyInputHandle>(null);

  return (
    <>
      <FancyInput ref={inputRef} defaultValue="hello" />
      <button onClick={() => inputRef.current?.reset()}>Reset</button>
    </>
  );
}
```

---

## Constraints

### MUST DO
- Use custom hooks over HOCs for stateful logic reuse
- Set `displayName` on every HOC for debugging (DevTools)
- Use `createPortal` for modals, dialogs, tooltips, and dropdowns
- Implement error boundaries at route, feature, or widget boundaries
- Use `forwardRef` when wrapping native DOM elements
- Expose imperative methods via `useImperativeHandle` when a component needs focus/reset/scroll
- Clean up portal DOM nodes and event listeners on unmount

### MUST NOT DO
- Over-abstract simple patterns — choose the simplest pattern that works
- Use render props or HOCs when custom hooks suffice
- Forget to reset error boundary state before retrying
- Nest portals unnecessarily — one level of portal is usually sufficient
- Ignore the ref type parameter on forwardRef — always type the handle interface
- Forget displayName on HOCs — debugging becomes impossible in React DevTools

---

## Related Skills

| Skill | Purpose |
|---|---|
| `react-composition-patterns` | Component composition patterns for building flexible UIs |
| `react-rerender-optimization` | Memoization strategies to avoid unnecessary re-renders |
| `react-client-data-fetching` | Data fetching patterns with Suspense and error boundaries |
| `react-async-waterfalls` | Avoiding request waterfalls in component hierarchies |

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [React.createPortal API](https://react.dev/reference/react-dom/createPortal)
- [React Error Boundaries](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)
- [React forwardRef API](https://react.dev/reference/react/forwardRef)
- [React useImperativeHandle](https://react.dev/reference/react/useImperativeHandle)
- [Reusing Logic with Custom Hooks](https://react.dev/learn/reusing-logic-with-custom-hooks)
- [Higher-Order Components (Legacy)](https://react.dev/legacy/higher-order-components)
- [Render Props Pattern (Legacy)](https://react.dev/legacy/render-props)
