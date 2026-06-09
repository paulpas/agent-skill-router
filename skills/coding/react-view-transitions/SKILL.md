---
name: react-view-transitions
description: Implements smooth page transitions and element animations using the View Transition API in React applications with CSS animation recipes and progressive enhancement.
license: MIT
compatibility: opencode
archetypes:
  - tactical
  - educational
anti_triggers:
  - brainstorming
  - vague ideation
  - legacy browser support
response_profile:
  verbosity: medium
  directive_strength: high
  abstraction_level: tactical
metadata:
  version: "1.0.0"
  domain: coding
  triggers: view transition, view transition api, react navigation, page transition, route transition, css animation, spa transition
  role: implementation
  scope: implementation
  output-format: code
  content-types:
    - code
    - guidance
    - do-dont
    - examples
  related-skills: css-architecture, frontend-philosophy, design-systems
  author: vercel
  source: https://github.com/vercel-labs/agent-skills
---

# React View Transitions

Implements smooth, performant page transitions and element morphing animations in React applications using the View Transition API. Covers same-document transitions for SPAs, cross-document transitions for MPA navigations, CSS animation customization with pseudo-elements, and progressive enhancement for browsers that do not yet support the API.

## TL;DR Checklist

- [ ] Wrap route changes in `document.startViewTransition()` to capture before/after states
- [ ] Assign unique `view-transition-name` to each animated element — never reuse names
- [ ] Customize transitions using `::view-transition-old()` and `::view-transition-new()` pseudo-elements
- [ ] Animate only `transform` and `opacity` for GPU-accelerated, jank-free animations
- [ ] Check `@supports (view-transition-name: foo)` before using the API — provide fallback navigation
- [ ] Respect `prefers-reduced-motion` by disabling or simplifying transitions
- [ ] Clean up `view-transition-name` assignments when components unmount to prevent stale references

---

## When to Use

Use this skill when:

- Implementing smooth page-to-page transitions in a React single-page application
- Adding element morphing animations (e.g., a list item expanding into a detail view)
- Creating shared-element transitions between routes (e.g., hero image scales from card to detail)
- Building gesture-driven navigation with animated transitions between views
- Enhancing perceived performance by replacing instant route changes with fluid animations
- Adding exit and entry animations for elements entering or leaving the DOM

---

## When NOT to Use

Avoid this skill for:

- Applications that must support browsers without View Transition API (e.g., older Safari or Firefox ESR) — provide a seamless fallback
- Simple fade or slide transitions that can be implemented with CSS animations alone
- Complex 3D transitions or multi-step choreographed animations — keep it simple with transform/opacity
- Situations where animation length hurts perceived performance — keep transitions under 300ms
- Server-rendered multi-page applications using full page reloads — cross-document transitions have separate considerations

---

## Core Workflow

1. **Wrap Navigation in startViewTransition** — Intercept route changes (using React Router, Next.js, or a custom router) and wrap the state update in `document.startViewTransition()`. This captures a screenshot of the current state (old) and transitions to the new state. **Checkpoint:** Verify the callback passed to `startViewTransition` updates the DOM synchronously — React 18+ concurrent mode requires wrapping state updates in `flushSync`.

2. **Assign view-transition-name** — Add a unique CSS `view-transition-name` to each element that should animate during the transition. Elements with the same `view-transition-name` in both old and new states are paired for morphing. **Checkpoint:** Ensure every `view-transition-name` value is unique across the entire page — duplicates cause the browser to ignore the transition.

3. **Customize Animations** — Override the default cross-fade animation using `::view-transition-old()` and `::view-transition-new()` pseudo-elements. Customize `animation-name`, `animation-duration`, and `animation-timing-function` to create slide, scale, or morph effects. **Checkpoint:** Test that both the old-state exit animation and new-state entry animation play correctly.

4. **Handle Cross-Document Transitions** — For MPA navigations or full page loads, add the `@view-transition` CSS rule to opt-in specific page navigations. Cross-document transitions work across different HTML documents without JavaScript. **Checkpoint:** Verify the transition plays on navigation by clicking a link to another page on the same origin.

5. **Add Progressive Enhancement** — Wrap View Transition API usage in a `@supports (view-transition-name: foo)` CSS query and a runtime check with `document.startViewTransition` in JavaScript. Provide a fallback that performs the navigation without animation for unsupported browsers. **Checkpoint:** Test navigation in a browser without View Transition support (e.g., Firefox) — the app must still function correctly.

---

## Implementation Patterns

### Pattern 1: React Router View Transition Wrapper

```tsx
import { useCallback, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { useNavigate, type NavigateOptions } from "react-router-dom";

/**
 * Hook that wraps navigation calls with View Transition API support.
 * Falls back to regular navigation when the API is unavailable.
 */
function useViewTransitionNavigate() {
  const navigate = useNavigate();

  const transitionNavigate = useCallback(
    (to: string, options?: NavigateOptions) => {
      // Check for View Transition API support
      if (!document.startViewTransition) {
        navigate(to, options);
        return;
      }

      // Wrap the navigation in a view transition
      const transition = document.startViewTransition(() => {
        flushSync(() => {
          navigate(to, options);
        });
      });

      // Track the transition for potential cancellation
      return transition.finished.catch((error) => {
        if (error.name !== "AbortError") {
          console.error("View transition failed:", error);
        }
      });
    },
    [navigate]
  );

  return transitionNavigate;
}

// Usage in a navigation component
function PageLink({ to, children }: { to: string; children: ReactNode }) {
  const navigateWithTransition = useViewTransitionNavigate();

  return (
    <a
      href={to}
      onClick={(event) => {
        event.preventDefault();
        navigateWithTransition(to);
      }}
    >
      {children}
    </a>
  );
}
```

### Pattern 2: Shared Element Morphing (BAD vs. GOOD)

```css
/* ❌ BAD: Using view-transition-name on too many elements or with non-unique names */
.card-thumbnail {
  view-transition-name: thumbnail; /* Not unique — will clash on lists */
}

/* ❌ BAD: Animating expensive properties */
::view-transition-old(root) {
  animation: 300ms ease-out both fade-and-slide-3d;
}

@keyframes fade-and-slide-3d {
  to {
    transform: rotateY(90deg) translateX(100px); /* 3D transforms are expensive */
    opacity: 0;
  }
}
```

```css
/* ✅ GOOD: Unique view-transition-name per element pair */
.card-article-42 .card-thumbnail {
  view-transition-name: article-42-thumbnail; /* Unique per card/article */
}

.card-article-99 .card-thumbnail {
  view-transition-name: article-99-thumbnail;
}

/* ✅ GOOD: Animating only transform and opacity for performance */
::view-transition-old(article-thumbnail) {
  animation: 200ms ease-out both shrink-out;
  animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}

::view-transition-new(article-thumbnail) {
  animation: 200ms ease-in both grow-in;
  animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes shrink-out {
  from { transform: scale(1); opacity: 1; }
  to { transform: scale(0.8); opacity: 0; }
}

@keyframes grow-in {
  from { transform: scale(0.8); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
```

### Pattern 3: Page Transition with Slide Animation

```tsx
// components/ViewTransitionLayout.tsx
import { Outlet, useLocation } from "react-router-dom";
import { useEffect, useRef } from "react";

/**
 * Layout component that assigns unique transition names per route
 * to enable slide-in/out page transitions.
 */
export function ViewTransitionLayout() {
  const location = useLocation();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Assign a unique transition name based on the current route
    const container = containerRef.current;
    if (!container) return;

    const routeName = location.pathname.replace(/\//g, "-") || "home";
    container.style.viewTransitionName = `page-${routeName}`;

    // Clean up on unmount to prevent stale view-transition-name references
    return () => {
      container.style.viewTransitionName = "";
    };
  }, [location.pathname]);

  return (
    <div ref={containerRef} className="page-container">
      <Outlet />
    </div>
  );
}
```

```css
/* styles/view-transitions.css */

/* Enable cross-document view transitions for MPA navigations */
@view-transition {
  navigation: auto;
}

/* Customize the root (page-level) transition with a slide effect */
::view-transition-old(root) {
  animation: 250ms ease-out both slide-out-left;
}

::view-transition-new(root) {
  animation: 250ms ease-in both slide-in-right;
}

@keyframes slide-out-left {
  from { transform: translateX(0); opacity: 1; }
  to { transform: translateX(-30px); opacity: 0; }
}

@keyframes slide-in-right {
  from { transform: translateX(30px); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}

/* Progressive enhancement for unsupported browsers */
@supports not (view-transition-name: root) {
  /* No animation — browser navigates instantly */
  ::view-transition-old(root),
  ::view-transition-new(root) {
    animation: none;
  }
}

/* Respect reduced motion preferences */
@media (prefers-reduced-motion: reduce) {
  ::view-transition-old(root),
  ::view-transition-new(root) {
    animation-duration: 0.01ms !important;
  }
}
```

---

## Constraints

### MUST DO
- Animate only `transform` and `opacity` for GPU-accelerated, main-thread-friendly animations
- Check `@supports (view-transition-name: <value>)` in CSS before relying on View Transition API features
- Assign unique `view-transition-name` values per element instance — never reuse names across different elements
- Respect `prefers-reduced-motion` by setting animation duration to `0.01ms` when the user prefers reduced motion
- Clean up `view-transition-name` style properties when React components unmount to prevent memory leaks
- Keep transition durations under 300ms for page transitions — longer animations hurt perceived performance

### MUST NOT DO
- Animate `width`, `height`, `top`, `left`, `margin`, or `padding` in view transitions — these trigger layout thrashing
- Use the same `view-transition-name` for multiple elements on the same page — the browser ignores the name
- Skip progressive enhancement — always provide a fallback for browsers without View Transition API support
- Apply view transitions to every navigation indiscriminately — use them selectively for meaningful transitions
- Ignore the `transition.finished` promise rejection — handle `AbortError` gracefully
- Rely on View Transition API for critical visual state changes that must be visible in all browsers

---

## Related Skills

| Skill | Purpose |
|---|---|
| `css-architecture` | CSS organization patterns that complement view transition styling |
| `frontend-philosophy` | UI design principles for intentional, purposeful animation in interfaces |
| `design-systems` | Design system patterns for consistent transition behavior across components |

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [MDN: View Transition API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API)
- [W3C CSS View Transitions Module](https://www.w3.org/TR/css-view-transitions-1/)
- [Chrome Developers: Smooth Transitions with View Transition API](https://developer.chrome.com/docs/web-platform/view-transitions)
- [CSS-Tricks: View Transitions API Guide](https://css-tricks.com/almanac/properties/v/view-transition-name/)
- [Web.dev: View Transitions API Quickstart](https://web.dev/articles/view-transitions)
- [React: flushSync API](https://react.dev/reference/react-dom/flushSync)
- [Vercel: View Transitions with Next.js](https://vercel.com/blog/how-view-transitions-work-on-the-web)
