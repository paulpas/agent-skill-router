---




name: css-architecture
description: Architects scalable CSS systems using cascade layers (@layer), native
  nesting, :has() selector, container queries, Tailwind v4 @theme directives, and
  BEM naming for maintainable, production-ready frontend styling.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: css architecture, css modules, bem naming, tailwind css v4, container queries, :has selector, css nesting, @layer cascade queries
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
  - config
  - examples
  - do-dont
  related-skills: design-systems, component-architecture, frontend-philosophy




---




# CSS Architecture for Modern Frontend Systems

Architect scalable, maintainable CSS systems using native CSS features and established architectural patterns. This skill makes the model organize cascade layers with `@layer`, leverage browser-native selectors (`:has()`, nesting, container queries), structure BEM naming conventions, integrate Tailwind v4's CSS-first approach, and write scoped styles that avoid specificity wars and maintenance debt.

## TL;DR Checklist

- [ ] Define `@layer` order (reset → base → components → utilities) for explicit cascade control
- [ ] Replace preprocessor nesting with native CSS `&` nesting (97%+ browser support)
- [ ] Use container queries over viewport media queries for component-level responsiveness
- [ ] Apply BEM naming: `.block__element--modifier` with scope to prevent class leakage
- [ ] Configure Tailwind v4 with `@theme` in CSS instead of `tailwind.config.js`
- [ ] Use `:has()` selector for parent-state styling without JavaScript
- [ ] Document layer overrides — every `!important` must be justified and tracked

---

## When to Use

Use this skill when:

- Architecting the stylesheet structure for a new application or redesigning an existing one's CSS organization
- Resolving specificity conflicts between third-party libraries and your own styles (use `@layer`)
- Building component-level responsive layouts that adapt to their container, not just the viewport (container queries)
- Integrating Tailwind CSS v4 with design system tokens via `@theme` directive
- Implementing parent-state styling based on child element states without JavaScript (`:has()`)
- Setting up native CSS nesting for scoped component styles without SASS/LESS
- Configuring a BEM naming strategy for teams that need explicit class scoping
- Managing cascade complexity in large codebases with many developers

---

## When NOT to Use

Avoid this skill for:

- One-off styling patches on small projects (< 500 lines of CSS total) — `@layer` overhead outweighs benefits
- Backend/API development where no CSS output is produced
- Design system token architecture (primitive → semantic → alias hierarchy) — use `design-systems` skill instead
- Component composition patterns (compound components, headless UI) — use `component-architecture` instead
- Performance optimization of CSS delivery (critical CSS extraction, purge unused rules) — a build concern handled separately

---

## Core Workflow

1. **Define Cascade Layers** — Establish explicit override order using `@layer`. Every stylesheet must declare its layer membership to prevent specificity wars.

   **Checkpoint:** Verify layer declaration matches this precedence: `reset → base → components → utilities`. Third-party libraries should be explicitly placed, not defaulting to the un-layered cascade.

2. **Structure Stylesheets by Concern** — Organize files following ITCSS-inspired principles adapted for modern CSS:

   | Layer       | Purpose                                  | Example Files                    |
   |-------------|------------------------------------------|----------------------------------|
   | `@layer reset`  | Browser normalization, universal resets     | `_reset.css`, `_normalize.css`   |
   | `@layer base`   | HTML element defaults, typography tokens    | `_typography.css`, `_elements.css` |
   | `@layer components` | UI components with BEM naming          | `_buttons.css`, `_cards.css`     |
   | `@layer utilities` | Single-purpose helper classes           | `_spacing.css`, `_visibility.css`  |

   **Checkpoint:** Confirm no component uses `!important`. If a `!important` is necessary, it must be documented with the reason and targeted to a specific selector.

3. **Implement Component Styles** — For each component, use native CSS nesting combined with BEM naming. Replace preprocessor nesting syntax with native `&`.

   **Checkpoint:** Verify all nested selectors compile correctly in target browsers (Safari 16.4+, Chrome 117+). Test that `&:hover`, `&__element`, and `--modifier` variants resolve properly.

4. **Apply Container Queries for Responsiveness** — Replace viewport-based media queries with container queries where components need independent responsiveness.

   **Checkpoint:** Confirm every container query has a corresponding `container-type` declaration on the parent element. Verify fallback styles exist for browsers without container query support.

5. **Configure Tailwind v4 Integration** — Use CSS-first theme configuration via `@theme` directive. Define design tokens, colors, and animations directly in CSS.

   **Checkpoint:** Ensure no `tailwind.config.js` file exists. All theme customization flows through `@theme` blocks. Verify utility classes reference correct token names.

6. **Audit Specificity** — Run a specificity audit to identify selectors above the threshold. Document any necessary overrides with `@layer` placement adjustments.

   **Checkpoint:** No selector should exceed a specificity of (0, 2, 3) in production stylesheets. Any higher specificity requires justification and documentation.

---

## Implementation Patterns

### Pattern 1: Cascade Layers (`@layer`) for Specificity Management

The `@layer` rule creates explicit cascade layers that override the default document order specificity rules. This eliminates specificity wars between your styles, third-party libraries, and utility frameworks.

```css
/* ✅ GOOD — Explicit layer declaration with clear precedence */
@layer reset, base, components, utilities;

@layer reset {
  *, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  html {
    line-height: 1.5;
    -webkit-text-size-adjust: 100%;
    tab-size: 4;
  }

  body {
    min-height: 100vh;
    text-rendering: optimizeSpeed;
  }
}

@layer base {
  :root {
    --color-brand-primary: #2563eb;
    --color-brand-secondary: #7c3aed;
    --font-family-sans: 'Inter', system-ui, -apple-system, sans-serif;
    --font-family-mono: 'JetBrains Mono', monospace;
  }

  h1 { font-size: clamp(2rem, 5vw, 3.5rem); line-height: 1.1; }
  h2 { font-size: clamp(1.5rem, 4vw, 2.5rem); line-height: 1.2; }
  p { font-size: var(--font-size-base, 1rem); line-height: 1.6; }

  a {
    color: var(--color-brand-primary);
    text-decoration: underline;
    text-underline-offset: 0.2em;

    &:hover { text-decoration-thickness: 0.15em; }
  }
}

@layer components {
  .btn {
    display: inline-flex;
    align-items: center;
    gap: 0.5em;
    padding: 0.625em 1.25em;
    border: none;
    border-radius: var(--radius-md, 0.375rem);
    font-size: var(--font-size-sm, 0.875rem);
    font-weight: 600;
    cursor: pointer;
    transition: background-color 150ms ease, transform 100ms ease;

    &:hover { transform: translateY(-1px); }
    &:active { transform: translateY(0); }
    &:focus-visible { outline: 2px solid var(--color-brand-primary); outline-offset: 2px; }

    &--primary {
      background-color: var(--color-brand-primary);
      color: white;

      &:hover { background-color: #1d4ed8; }
    }

    &--secondary {
      background-color: transparent;
      color: var(--color-brand-primary);
      border: 2px solid var(--color-brand-primary);

      &:hover { background-color: color-mix(in srgb, var(--color-brand-primary) 10%, transparent); }
    }

    &--full { width: 100%; justify-content: center; }
  }
}

@layer utilities {
  .sr-only {
    position: absolute;
    width: 1px; height: 1px;
    padding: 0; margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border-width: 0;
  }

  .truncate {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

/* Override third-party library without !important — same layer, later wins */
@layer components {
  /* Third-party modal has .modal { margin: 20px; } — we override by placing ours in the same layer below */
  .modal { margin: 16px; border-radius: var(--radius-lg, 0.5rem); }
}
```

### Pattern 2: Native CSS Nesting and `:has()` Selector

Replace SASS/LESS nesting with native CSS nesting (97%+ browser support as of 2025). Use the `:has()` selector for parent-state styling without JavaScript event listeners.

```css
/* ✅ GOOD — Native nesting + :has() for parent state management */
.card {
  --card-padding: 1.5rem;
  --card-border-color: var(--color-border-subtle, #e2e8f0);

  display: grid;
  gap: var(--card-padding);
  padding: var(--card-padding);
  border: 1px solid var(--card-border-color);
  border-radius: var(--radius-lg, 0.75rem);
  background: var(--color-bg-elevated, white);

  /* Native nesting replaces .card__element pattern */
  & .card__header {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding-bottom: calc(var(--card-padding) * 0.5);
    border-bottom: 1px solid var(--card-border-color);

    & img {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      object-fit: cover;
    }
  }

  /* :has() for parent-state styling */
  &:has(.card__badge--danger) {
    --card-border-color: #ef4444;
    border-left: 3px solid #ef4444;
  }

  /* :has() with child state — no JavaScript needed */
  &:has(input[type="checkbox"]:checked) .card__check-icon {
    opacity: 1;
    transform: scale(1);
  }

  /* Nested modifier */
  &--compact {
    --card-padding: 0.75rem;
  }
}

/* :has() for form validation styling — parent responds to child state */
.form-group {
  position: relative;
  margin-bottom: 1.25rem;

  &:has(.input:focus) {
    --field-border-color: var(--color-brand-primary);
  }

  &:has(input:invalid:not(:placeholder-shown)) .form-message--error {
    display: block;
  }

  /* Nested elements via native nesting */
  & label {
    display: block;
    margin-bottom: 0.375rem;
    font-weight: 500;
    color: var(--color-text-primary, #1e293b);
  }

  & input, & textarea, & select {
    width: 100%;
    padding: 0.625rem 0.875rem;
    border: 1px solid var(--field-border-color, #cbd5e1);
    border-radius: var(--radius-md, 0.375rem);
    font-size: 1rem;
    transition: border-color 150ms ease, box-shadow 150ms ease;

    &:focus {
      border-color: var(--color-brand-primary);
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-brand-primary) 20%, transparent);
      outline: none;
    }
  }
}
```

### Pattern 3: Container Queries for Component-Level Responsiveness

Container queries let components respond to their container's size rather than the viewport. This is essential for component libraries and dashboard layouts where components appear in varying widths.

```css
/* ✅ GOOD — Container queries with explicit container-type declaration */

/* Parent declares itself as a query container */
.card-grid {
  display: grid;
  gap: 1.5rem;
  /* Must set container type for children to use @container */
  container-type: inline-size;
  container-name: card-grid;
}

/* Component responds to its container, not the viewport */
@container card-grid (min-width: 400px) {
  .card-grid {
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  }
}

@container card-grid (min-width: 768px) {
  .card-grid {
    grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  }
}

/* Individual component with its own container */
.product-card {
  container-type: inline-size;
  container-name: product-card;

  display: flex;
  flex-direction: column;
  gap: 0.75rem;

  /* Vertical layout in narrow containers */
  @container product-card (max-width: 280px) {
    .product-card__image {
      order: 1;
      height: 140px;
    }

    .product-card__details {
      order: 2;
    }
  }

  /* Horizontal layout in wider containers */
  @container product-card (min-width: 281px) {
    flex-direction: row;
    align-items: center;

    .product-card__image {
      width: 120px;
      height: 120px;
      flex-shrink: 0;
    }
  }
}

/* ❌ BAD — Using viewport media queries for component responsiveness */
/* This breaks when the same component appears in a sidebar vs. main content */
.product-card {
  /* Fragile — depends on screen size, not context */
}

@media (min-width: 768px) {
  .product-card { flex-direction: row; }
}

@media (min-width: 1024px) {
  .product-card { grid-template-columns: repeat(3, 1fr); }
}
```

### Pattern 4: Tailwind CSS v4 with `@theme` Directive

Tailwind v4 replaces the JavaScript-based `tailwind.config.js` with a CSS-first configuration using the `@theme` directive. This enables hot-reload of theme changes and keeps design tokens visible in CSS files.

```css
/* ✅ GOOD — Tailwind v4 CSS-first theme configuration */

/* src/styles/tailwind.css */
@import "tailwindcss";

/* Define your theme directly in CSS — no tailwind.config.js needed */
@theme {
  /* Brand colors */
  --color-brand-50: #eff6ff;
  --color-brand-100: #dbeafe;
  --color-brand-200: #bfdbfe;
  --color-brand-300: #93c5fd;
  --color-brand-400: #60a5fa;
  --color-brand-500: #3b82f6;
  --color-brand-600: #2563eb;
  --color-brand-700: #1d4ed8;
  --color-brand-800: #1e40af;
  --color-brand-900: #1e3a8a;

  /* Typography scale */
  --font-family-sans: 'Inter', system-ui, -apple-system, sans-serif;
  --font-family-mono: 'JetBrains Mono', monospace;
  --font-size-xs: 0.75rem;
  --font-size-sm: 0.875rem;
  --font-size-base: 1rem;
  --font-size-lg: 1.125rem;
  --font-size-xl: 1.25rem;
  --font-size-2xl: 1.5rem;
  --font-size-3xl: 2rem;

  /* Spacing scale */
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;
  --spacing-2xl: 3rem;

  /* Border radius */
  --radius-sm: 0.25rem;
  --radius-md: 0.375rem;
  --radius-lg: 0.5rem;
  --radius-xl: 0.75rem;
  --radius-2xl: 1rem;
  --radius-full: 9999px;

  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
  --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1);

  /* Animations */
  --animate-fade-in: fade-in 0.3s ease-out forwards;
  --animate-slide-up: slide-up 0.3s ease-out forwards;
  --animate-scale-in: scale-in 0.2s ease-out forwards;
}

/* Define keyframes directly in the stylesheet */
@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slide-up {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes scale-in {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

/* Import design system tokens and component styles */
@import "./reset.css" layer(reset);
@import "./base.css" layer(base);
@import "./components/buttons.css" layer(components);
@import "./components/cards.css" layer(components);
@import "./utilities.css" layer(utilities);
```

Usage in JSX/HTML:

```tsx
// ✅ GOOD — Tailwind v4 utilities reference CSS theme tokens directly
export function Button({ variant = 'primary', children }) {
  const classes = [
    'inline-flex items-center gap-2 px-4 py-2.5 rounded-md font-semibold text-sm',
    'transition-transform duration-100 hover:-translate-y-0.5 active:translate-y-0',
    variant === 'primary'
      ? 'bg-brand-600 text-white hover:bg-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600 focus-visible:outline-offset-2'
      : 'bg-transparent border-2 border-brand-600 text-brand-600 hover:bg-brand-600/10',
  ].join(' ');

  return <button className={classes}>{children}</button>;
}
```

### Pattern 5: BEM Naming Convention for Scoped Components

BEM (Block__Element--Modifier) provides explicit class scoping that prevents unintended style leakage. Use it when you need predictable, isolated component styles without CSS Modules or Shadow DOM.

```css
/* ✅ GOOD — BEM naming with consistent convention */

/* BLOCK: Standalone component/abstract concept */
.nav { }

/* ELEMENTS: Parts of the block — no standalone meaning */
.nav__list { list-style: none; display: flex; gap: 1rem; }
.nav__item { position: relative; }
.nav__link {
  display: block;
  padding: 0.5rem 1rem;
  color: var(--color-text-primary);
  text-decoration: none;
  border-radius: var(--radius-md);
  transition: background-color 150ms ease;
}

/* MODIFIER: State or variation of the block/element */
.nav__link--active {
  background-color: color-mix(in srgb, var(--color-brand-600) 15%, transparent);
  color: var(--color-brand-600);
  font-weight: 600;
}

.nav__link--disabled {
  opacity: 0.4;
  pointer-events: none;
  cursor: not-allowed;
}

/* Nested BEM in compound components */
.dropdown {
  position: relative;
}

.dropdown__toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border: 1px solid var(--border-color-default, #d1d5db);
  border-radius: var(--radius-md);
  cursor: pointer;
}

.dropdown__menu {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  min-width: 200px;
  padding: 0.5rem 0;
  background: white;
  border: 1px solid var(--border-color-default);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  opacity: 0;
  visibility: hidden;
  transition: opacity 150ms ease, visibility 150ms ease;
}

/* Use :has() instead of JS for dropdown open state */
.dropdown:has(.dropdown__toggle:hover) .dropdown__menu,
.dropdown:focus-within .dropdown__menu {
  opacity: 1;
  visibility: visible;
}

/* ❌ BAD — BEM with too deep nesting creates specificity problems */
.nav.nav-main.nav-container.nav-item--primary.nav-item__link--active {
  /* This is a nightmare to maintain and overrides are impossible without !important */
}
```

---

## Constraints

### MUST DO
- Always declare `@layer` order at the top of your primary stylesheet before any other rules
- Use native CSS nesting (`&`) instead of preprocessor nesting wherever possible (Safari 16.4+ / Chrome 117+ support)
- Set `container-type: inline-size` on every parent element that will host container-query-driven children
- Write component styles with BEM naming when using flat CSS; use CSS Modules or Shadow DOM for frameworks that support them natively
- Use `color-mix()` for hover/active states instead of pre-calculated color variants
- Document every use of `!important` with a comment explaining why no alternative layer override works
- Test `:has()` selector fallbacks for browsers lacking support (iOS Safari < 17.4) using progressive enhancement

### MUST NOT DO
- Never rely on selector depth or specificity to force styles — use `@layer` instead of adding more parent selectors
- Never use `!important` as a first resort — it breaks the cascade layer model and creates maintenance debt
- Never nest BEM selectors deeper than 2 levels (`.block__element--modifier.child__sub`) — this indicates component leakage
- Never mix container queries with viewport media queries for the same responsive breakpoint — pick one strategy per component
- Never use `tailwind.config.js` in a Tailwind v4 project — all theme configuration must live in CSS `@theme` blocks
- Never apply `:has()` selector to non-container parents in performance-critical paths (scroll listeners, high-frequency DOM updates)

---

## Output Template

When implementing or reviewing CSS architecture, produce:

1. **Layer Structure** — List of `@layer` declarations with the precedence order and which files belong to each layer
2. **Component Style Sheet** — The component's CSS with BEM naming, native nesting applied, and any container query breakpoints
3. **Tailwind Theme Block** — The `@theme` configuration showing all custom tokens derived from the design system
4. **Specificity Audit Report** — List of selectors exceeding the (0, 2, 3) threshold with suggested layer adjustments
5. **Browser Support Matrix** — Feature support status for native nesting, `:has()`, container queries across target browsers

---

## Related Skills

| Skill | Purpose |
|---|---|
| `design-systems` | Token architecture (primitive → semantic → alias), theming, cross-platform adapters that feed CSS custom properties |
| `component-architecture` | Component composition patterns (compound components, headless UI) that need clean CSS styling |
| `frontend-philosophy` | Visual & UI design philosophy principles that guide when to use utility-first vs. component-based CSS |

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [MDN: CSS Cascade Layers (@layer)](https://developer.mozilla.org/en-US/docs/Web/CSS/@layer)
- [MDN: CSS Nesting](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_nesting)
- [MDN: :has() Selector](https://developer.mozilla.org/en-US/docs/Web/CSS/:has)
- [MDN: Container Queries](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_container_queries)
- [Tailwind CSS v4 Documentation (CSS-first configuration)](https://tailwindcss.com/docs/v4-beta)
- [W3C: ITCSS — Scalable and Maintainable Architecture for Stylesheets](https://www.creativebloq.com/web-design/manage-css-itcss-21620058)
- [CSS BEM Documentation](https://getbem.com/introduction/)