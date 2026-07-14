---
name: react-js-performance
description: Optimizes JavaScript execution performance in React applications through efficient event handling, debouncing/throttling, Web Worker offloading, and DOM operation reduction.
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
  triggers: react performance, javascript optimization, debounce, throttle, web worker, event delegation, main thread
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: react-rerender-optimization, react-server-performance, react-bundle-size
  author: https://github.com/vercel-labs
  source: https://github.com/vercel-labs/agent-skills
---

# React JavaScript Performance Optimization

Optimizes JavaScript execution in React by profiling main thread activity, debouncing high-frequency events, offloading CPU-heavy work to Web Workers, and minimizing DOM operations. Keeps the UI responsive under the RAIL model (50ms task budget).

## TL;DR Checklist

- [ ] Profile with performance.now() and Chrome DevTools Performance tab before optimizing
- [ ] Debounce scroll/resize/input handlers with 250-400ms delay
- [ ] Throttle requestAnimationFrame-bound animations
- [ ] Offload parsing, crypto, and data transforms to Web Workers
- [ ] Use passive event listeners for scroll/touch/wheel events
- [ ] Batch DOM reads before writes using requestAnimationFrame
- [ ] Verify no main thread task exceeds 50ms

---

## When to Use

Use this skill when:

- Implementing scroll, resize, or touch event handlers with high fire rates
- Building components that parse large data sets on the main thread
- Identifying janky UI (dropped frames, delayed input response)
- Profiling and optimizing React render performance
- Adding animation-heavy interactions that compete with JS execution
- Debugging main thread tasks exceeding the 50ms RAIL budget

---

## When NOT to Use

Avoid this skill for:

- Network optimization (API call reduction, caching) — use `react-server-performance` instead
- Bundle size or code splitting concerns — use `react-bundle-size` instead
- React re-render optimization (useMemo, useCallback, React.memo) — use `react-rerender-optimization` instead
- CSS-level animations that don't involve JS — CSS handles these without JS intervention

---

## Core Workflow

1. **Profile JS Execution** — Open Chrome DevTools Performance tab or instrument with `performance.now()` to capture task durations.
   **Checkpoint:** Identify all long tasks (>50ms) and high-frequency event handlers.

2. **Identify Optimization Targets** — Look for:
   - Event handlers firing >30 times/second (scroll, resize, mousemove)
   - Synchronous CPU work >50ms (parsing, computation, DOM manipulation)
   - Forced synchronous layouts (DOM read after write within same frame)

3. **Apply Debouncing/Throttling** — Debounce input and resize handlers; throttle scroll and animation handlers.

4. **Offload to Web Workers** — Move parsing, crypto, data transforms, and any task >50ms to a dedicated Worker thread.

5. **Optimize Event Handling** — Use passive listeners and event delegation to reduce handler overhead.

6. **Verify** — Re-profile to confirm all main thread tasks stay under 50ms and frame rate is stable at 60fps.

---

## Implementation Patterns

### Pattern 1: Debouncing High-Frequency Events

```typescript
// ✅ GOOD: Debounced input handler with configurable delay
function useDebouncedCallback<T extends (...args: unknown[]) => void>(
  callback: T,
  delay: number = 300
): T {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return useCallback(
    ((...args: unknown[]) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => callback(...args), delay);
    }) as T,
    [callback, delay]
  );
}

// Usage in a search component
function SearchBox() {
  const [query, setQuery] = useState('');
  const debouncedSearch = useDebouncedCallback(
    (value: string) => performSearch(value),
    350
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    debouncedSearch(e.target.value);
  };

  return <input type="text" value={query} onChange={handleChange} />;
}
```

### Pattern 2: Throttling vs. Debouncing (BAD vs. GOOD)

```typescript
// ❌ BAD: No throttling — fires hundreds of times during scroll
function ScrollSpy() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
      // Expensive layout calculation on every frame
      updateActiveSection();
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return <div>{/* ... */}</div>;
}

// ✅ GOOD: Throttled scroll handler with RAF synchronization
function ScrollSpy() {
  const [scrollY, setScrollY] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (rafRef.current) return; // Skip if RAF already queued
      rafRef.current = requestAnimationFrame(() => {
        setScrollY(window.scrollY);
        updateActiveSection();
        rafRef.current = null;
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return <div>{/* ... */}</div>;
}
```

### Pattern 3: Web Worker Offloading

```typescript
// ✅ GOOD: Offload expensive computation to a Web Worker
function useWorker<TInput, TOutput>(
  workerFactory: () => Worker,
  input: TInput | null
): { result: TOutput | null; error: Error | null; isProcessing: boolean } {
  const [result, setResult] = useState<TOutput | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    workerRef.current = workerFactory();

    workerRef.current.onmessage = (e: MessageEvent<TOutput>) => {
      setResult(e.data);
      setIsProcessing(false);
    };

    workerRef.current.onerror = (e: ErrorEvent) => {
      setError(new Error(e.message));
      setIsProcessing(false);
    };

    return () => {
      workerRef.current?.terminate();
    };
  }, [workerFactory]);

  useEffect(() => {
    if (input === null) return;
    setIsProcessing(true);
    workerRef.current?.postMessage(input);
  }, [input]);

  return { result, error, isProcessing };
}

// worker.ts — runs off the main thread
self.onmessage = (e: MessageEvent<ArrayBuffer>) => {
  const parsed = parseComplexData(e.data); // CPU-heavy work
  self.postMessage(parsed);
};
```

### Pattern 4: Event Delegation (BAD vs. GOOD)

```typescript
// ❌ BAD: Attaching listener to every list item — O(n) handlers
function ItemList({ items }: { items: Item[] }) {
  return (
    <ul>
      {items.map((item) => (
        <li key={item.id} onClick={() => handleItemClick(item.id)}>
          {item.name}
        </li>
      ))}
    </ul>
  );
}

// ✅ GOOD: Single delegated listener on the parent — O(1) handler
function ItemList({ items }: { items: Item[] }) {
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLUListElement>) => {
      const li = (e.target as HTMLElement).closest('li');
      if (!li?.dataset?.id) return;
      handleItemClick(li.dataset.id);
    },
    []
  );

  return (
    <ul onClick={handleClick}>
      {items.map((item) => (
        <li key={item.id} data-id={item.id}>
          {item.name}
        </li>
      ))}
    </ul>
  );
}
```

---

## Constraints

### MUST DO
- Use `{ passive: true }` for scroll, touch, and wheel event listeners
- Debounce input handlers with 250-400ms delay
- Keep main thread tasks under 50ms (RAIL model)
- Use Web Workers for CPU-heavy operations (parsing, crypto, data transforms)
- Prefer CSS animations (transform, opacity) over JS-driven animation
- Use `will-change` sparingly on elements that actually animate
- Batch DOM reads before writes using requestAnimationFrame

### MUST NOT DO
- Block the main thread for more than 50ms at a time
- Use JavaScript for animations that CSS can handle (transforms, opacity)
- Attach individual event listeners to every list item — use event delegation
- Add `will-change` to too many elements (consumes GPU memory)
- Create new function or object references in event handler closures
- Read then write DOM properties in the same frame (forces synchronous layout)

---

## Related Skills

| Skill | Purpose |
|---|---|
| `react-rerender-optimization` | Reduce unnecessary re-renders with memo, useMemo, useCallback |
| `react-bundle-size` | Code splitting, tree shaking, and bundle analysis |
| `react-server-performance` | Server-side rendering and streaming optimization |
| `react-composition-patterns` | Component composition patterns for efficient rendering |

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [React Performance Optimization Guide](https://react.dev/learn/render-and-commit)
- [MDN: Event dispatch and passive listeners](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener#using_passive_listeners)
- [Web Workers API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API)
- [RAIL Model — Google Web Fundamentals](https://web.dev/articles/rail)
- [MDN: requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame)
- [Chrome DevTools Performance Reference](https://developer.chrome.com/docs/devtools/performance/reference)
- [CSS will-change Property (MDN)](https://developer.mozilla.org/en-US/docs/Web/CSS/will-change)
