---




name: design-systems-atomic
description: Implements Atomic Design methodology with design tokens, component-driven development in Storybook, accessibility-first patterns, and modern CSS architecture for production design systems.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: atomic design, design tokens, component-driven development, storybook workflow, css custom properties, wcag accessibility, responsive design system
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples, config]
  related-skills: css-nesting, css-architecture, component-testing-library, code-review, frontend-philosophy
  archetypes:
    - tactical
    - generation
  anti_triggers:
    - brainstorming
    - vague ideation
    - code golf
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational




---





# Atomic Design Systems & Component Architecture

Implements production-ready design systems using Brad Frost's Atomic Design methodology, W3C-aligned design tokens, Storybook-driven component development, WCAG-compliant accessibility patterns, and modern native CSS features. When loaded, this skill makes the model architect component hierarchies from atoms through pages, export typed design tokens to CSS custom properties, write isolated component stories, and enforce accessibility constraints in every UI element produced.

## TL;DR Checklist

- [ ] Organize components by Atomic Design levels: atoms → molecules → organisms → templates → pages
- [ ] Define all visual properties as design tokens (CSS custom properties) with semantic names, not magic values
- [ ] Implement light/dark mode via CSS `@media (prefers-color-scheme)` and data attribute toggling
- [ ] Write Storybook stories for every component variant, state, and interactive control
- [ ] Ensure WCAG 2.2 AA compliance: 4.5:1 contrast ratio, ARIA roles, keyboard navigation, focus management
- [ ] Use `@layer` for cascade control, `@container` for component responsiveness, `:has()` for state styling
- [ ] Apply container queries over viewport media queries for truly reusable components

---

## When to Use

Use this skill when:

- Building a design system from scratch or migrating an ad-hoc CSS codebase to a structured component architecture
- Establishing design tokens (colors, spacing, typography, radii) that power multiple components and themes
- Setting up Storybook or similar component-driven development workflow for isolated component testing
- Implementing complex UI components (modals, dropdowns, data tables, forms) that require ARIA patterns and keyboard navigation
- Enforcing WCAG accessibility compliance across all UI components in a design system
- Migrating from SCSS/preprocessor-based styling to modern native CSS with cascade layers and container queries

---

## When NOT to Use

Avoid this skill for:

- Simple landing pages or marketing sites with no reusable component library — overhead outweighs benefit
- One-off HTML emails where CSS features like `@layer` or container queries are not supported
- Native mobile apps (React Native, Flutter) — adapt the methodology but use platform-specific patterns
- When a mature design system already exists and you only need to add a single button variant — start with atomic structure

---

## Core Workflow

1. **Define Design Tokens** — Establish the foundational token layer: colors, spacing scale, typography scale, border radii, shadows, z-index layers, and breakpoints. Export as JSON, then generate CSS custom properties for both light and dark themes. **Checkpoint:** Every visual value used in a component must trace back to a design token — no magic values allowed in component CSS.

2. **Implement Atoms** — Build the smallest UI building blocks: buttons (with variants), inputs, labels, checkboxes, radio groups, icons, and color/typography tokens. Each atom should be self-contained with its own Storybook story. **Checkpoint:** Verify each atom works in isolation without knowledge of parent components; test focus states and keyboard interaction independently.

3. **Compose Molecules** — Combine atoms into simple functional units: search form (input + button), input group (label + input + helper text), form field with validation (input + error message + icon). Molecules introduce composition logic but remain composable within organisms. **Checkpoint:** Each molecule must work both in isolation and as a building block; verify all internal atoms preserve their accessible states.

4. **Build Organisms** — Assemble molecules and atoms into complex components: header (logo + nav + search form), data table (column headers + rows + pagination), card group (cards with images, text, actions). Organisms have layout responsibility and may introduce conditional rendering logic. **Checkpoint:** Verify organism-level keyboard navigation works; confirm ARIA landmarks (`role="navigation"`, `role="main"`) are present where needed.

5. **Create Templates & Pages** — Define page-level layouts with placeholder content (templates), then populate with real data (pages). Templates define the structural skeleton; pages demonstrate realistic content scenarios in Storybook. **Checkpoint:** Verify templates maintain correct visual hierarchy and spacing at all breakpoint ranges; ensure no template has hardcoded data values.

6. **Document & Test** — Write comprehensive Storybook stories for every variant, state (loading, error, empty, disabled), and interaction pattern. Run visual regression tests with Chromatic or Playwright. Audit accessibility with axe-core integration. **Checkpoint:** Every component story should have at least one a11y scan; critical user flows (forms, modals) must pass automated WCAG checks before merging.

---

## Design Tokens

### Token Architecture and Naming Conventions

Design tokens follow the W3C Component Text Attributes specification for semantic naming. Tokens are organized into hierarchical namespaces that map directly to CSS custom properties.

```json
{
  "color": {
    "background": {
      "default": { "$value": "#ffffff", "$type": "color" },
      "elevated": { "$value": "#f8fafc", "$type": "color" },
      "inverted": { "$value": "#0f172a", "$type": "color" }
    },
    "text": {
      "primary": { "$value": "#0f172a", "$type": "color" },
      "secondary": { "$value": "#64748b", "$type": "color" },
      "disabled": { "$value": "#94a3b8", "$type": "color" },
      "inverse": { "$value": "#f8fafc", "$type": "color" }
    },
    "border": {
      "default": { "$value": "#e2e8f0", "$type": "color" },
      "strong": { "$value": "#cbd5e1", "$type": "color" },
      "focus": { "$value": "#3b82f6", "$type": "color" }
    },
    "status": {
      "success": { "$value": "#10b981", "$type": "color" },
      "warning": { "$value": "#f59e0b", "$type": "color" },
      "error": { "$value": "#ef4444", "$type": "color" },
      "info": { "$value": "#3b82f6", "$type": "color" }
    },
    "brand": {
      "primary": { "$value": "#6366f1", "$type": "color" },
      "secondary": { "$value": "#8b5cf6", "$type": "color" },
      "accent": { "$value": "#06b6d4", "$type": "color" }
    }
  },
  "spacing": {
    "xs": { "$value": "0.25rem" },
    "sm": { "$value": "0.5rem" },
    "md": { "$value": "1rem" },
    "lg": { "$value": "1.5rem" },
    "xl": { "$value": "2rem" },
    "2xl": { "$value": "3rem" },
    "4xl": { "$value": "6rem" }
  },
  "typography": {
    "fontFamily": {
      "sans": { "$value": "Inter, system-ui, -apple-system, sans-serif" },
      "mono": { "$value": "JetBrains Mono, Fira Code, monospace" }
    },
    "fontSize": {
      "xs": { "$value": "0.75rem" },
      "sm": { "$value": "0.875rem" },
      "base": { "$value": "1rem" },
      "lg": { "$value": "1.125rem" },
      "xl": { "$value": "1.25rem" },
      "2xl": { "$value": "1.5rem" },
      "3xl": { "$value": "1.875rem" },
      "4xl": { "$value": "2.25rem" }
    },
    "fontWeight": {
      "normal": { "$value": "400" },
      "medium": { "$value": "500" },
      "semibold": { "$value": "600" },
      "bold": { "$value": "700" }
    },
    "lineHeight": {
      "tight": { "$value": "1.25" },
      "normal": { "$value": "1.5" },
      "relaxed": { "$value": "1.75" }
    }
  },
  "radius": {
    "none": { "$value": "0" },
    "sm": { "$value": "0.25rem" },
    "md": { "$value": "0.375rem" },
    "lg": { "$value": "0.5rem" },
    "xl": { "$value": "0.75rem" },
    "full": { "$value": "9999px" }
  },
  "shadow": {
    "sm": { "$value": "0 1px 2px rgba(0, 0, 0, 0.05)" },
    "md": { "$value": "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)" },
    "lg": { "$value": "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)" },
    "xl": { "$value": "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)" }
  },
  "breakpoint": {
    "sm": { "$value": "640px" },
    "md": { "$value": "768px" },
    "lg": { "$value": "1024px" },
    "xl": { "$value": "1280px" },
    "2xl": { "$value": "1536px" }
  }
}
```

### CSS Custom Properties Implementation with Light/Dark Mode

Export tokens to CSS custom properties using a theme root approach. This enables runtime theme switching and respects the user's system preference.

```css
/* ✅ GOOD: Theme layer with CSS custom properties — all tokens accessible via var() */
@layer base {
  :root {
    /* Color tokens — semantic naming, not functional */
    --color-background-default: #ffffff;
    --color-background-elevated: #f8fafc;
    --color-text-primary: #0f172a;
    --color-text-secondary: #64748b;
    --color-text-disabled: #94a3b8;
    --color-border-default: #e2e8f0;
    --color-border-focus: #3b82f6;
    --color-brand-primary: #6366f1;
    --color-status-success: #10b981;
    --color-status-warning: #f59e0b;
    --color-status-error: #ef4444;

    /* Spacing scale */
    --space-xs: 0.25rem;
    --space-sm: 0.5rem;
    --space-md: 1rem;
    --space-lg: 1.5rem;
    --space-xl: 2rem;
    --space-2xl: 3rem;

    /* Typography */
    --font-sans: Inter, system-ui, -apple-system, sans-serif;
    --font-mono: JetBrains Mono, Fira Code, monospace;
    --text-xs: 0.75rem;
    --text-sm: 0.875rem;
    --text-base: 1rem;
    --text-lg: 1.125rem;
    --text-xl: 1.25rem;
    --text-2xl: 1.5rem;
    --leading-normal: 1.5;

    /* Radius, Shadow, Z-index */
    --radius-md: 0.375rem;
    --radius-lg: 0.5rem;
    --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    --z-dropdown: 100;
    --z-modal: 200;
    --z-tooltip: 300;

    /* Breakpoints for container queries in components */
    --breakpoint-sm: 640px;
    --breakpoint-md: 768px;
    --breakpoint-lg: 1024px;
  }

  /* Dark mode — toggled via data-theme attribute on <html> */
  [data-theme="dark"] {
    --color-background-default: #0f172a;
    --color-background-elevated: #1e293b;
    --color-text-primary: #f1f5f9;
    --color-text-secondary: #94a3b8;
    --color-text-disabled: #64748b;
    --color-border-default: #334155;
    --color-brand-primary: #818cf8;
    --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.4);
  }

  /* Respect system preference as default */
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) {
      --color-background-default: #0f172a;
      --color-background-elevated: #1e293b;
      --color-text-primary: #f1f5f9;
      --color-text-secondary: #94a3b8;
      --color-border-default: #334155;
    }
  }
}
```

### JavaScript Theme Switching with Style Dictionary Integration

Use `@tokens/studio/sd-transforms` to transform JSON tokens into CSS, TypeScript types, and design token schema output. This keeps your token source of truth in one place.

```typescript
// ✅ GOOD: Token generation pipeline using Style Dictionary
import StyleDictionary from "style-dictionary";
import { color, spacing, typography } from "@tokens/studio/sd-transforms";

interface DesignToken {
  name: string;
  value: string | number;
  type?: string;
}

const tokenConfig = {
  source: ["tokens/**/*.json"],
  platforms: {
    css: {
      transformGroup: "css",
      buildPath: "dist/css/",
      files: [
        {
          destination: "variables.css",
          format: "css/variables",
          // Generates :root {} with all tokens as CSS custom properties
          // Optionally generates [data-theme="dark"] for dark mode variants
        },
      ],
    },
    typescript: {
      transformGroup: "js",
      buildPath: "dist/types/",
      files: [
        {
          destination: "tokens.ts",
          format: "typescript/es6-declarations",
          // Generates: export const colorBackgroundDefault = "#ffffff";
        },
      ],
    },
  },
};

// ✅ GOOD: Runtime theme switcher with type safety
function setTheme(theme: "light" | "dark"): void {
  const html = document.documentElement;
  const current = html.getAttribute("data-theme");

  // Skip if already on requested theme
  if (current === theme) return;

  html.setAttribute("data-theme", theme);
  localStorage.setItem("preferred-theme", theme);

  // Dispatch for any component that needs to react to theme changes
  window.dispatchEvent(
    new CustomEvent("themechange", { detail: { theme } })
  );
}

function getPreferredTheme(): "light" | "dark" {
  const stored = localStorage.getItem("preferred-theme");
  if (stored) return stored as "light" | "dark";

  // Fallback to system preference
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

// ✅ GOOD: WCAG contrast ratio checker for token pairs
function checkContrast(
  foreground: string,
  background: string
): { ratio: number; passesAA: boolean; passesAAA: boolean } {
  const luminance = (hex: string) => {
    const rgb = hexToRgb(hex);
    if (!rgb) return 0;
    const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((c) => {
      const srgb = c / 255;
      return srgb <= 0.03928 ? srgb / 12.92 : Math.pow((srgb + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };

  const fg = luminance(foreground);
  const bg = luminance(background);
  const lighter = Math.max(fg, bg);
  const darker = Math.min(fg, bg);
  const ratio = (lighter + 0.05) / (darker + 0.05);

  return {
    ratio: parseFloat(ratio.toFixed(2)),
    passesAA: ratio >= 4.5,
    passesAAA: ratio >= 7.0,
  };
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const match = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (!match) return null;
  return {
    r: parseInt(match[1], 16),
    g: parseInt(match[2], 16),
    b: parseInt(match[3], 16),
  };
}

// Validate all token pairs before deployment
function validateTokenContrasts(tokens: Record<string, DesignToken>): void {
  const textColors = Object.entries(tokens).filter(
    ([key]) => key.includes("text") || key.includes("brand")
  );
  const bgColors = Object.entries(tokens).filter(
    ([key]) => key.includes("background")
  );

  const violations: string[] = [];
  for (const [textName, textColor] of textColors) {
    for (const [bgName, bgColor] of bgColors) {
      // Skip same-name pairs (e.g., --color-text-primary on --color-background-default)
      if (textName === bgName) continue;

      const result = checkContrast(textColor.value as string, bgColor.value as string);
      if (!result.passesAA) {
        violations.push(
          `${textName} (${textColor.value}) on ${bgName} (${bgColor.value}): ` +
            `ratio ${result.ratio}:1 — fails WCAG AA (requires 4.5:1)`
        );
      }
    }
  }

  if (violations.length > 0) {
    console.error("Token contrast validation failed:\n" + violations.join("\n"));
    throw new Error(
      `${violations.length} token pair(s) fail WCAG AA contrast requirements`
    );
  }
}
```

---

## Atomic Design Implementation Patterns

### Atoms: Buttons, Inputs, and Labels

Atoms are the indivisible building blocks. They cannot be decomposed further without losing their meaning.

```html
<!-- ✅ GOOD: Button atom with semantic HTML, CSS custom properties for theming -->
<button
  class="btn btn--primary"
  type="button"
  aria-label="Save changes"
>
  <span class="btn__label">Save</span>
</button>

<!-- ❌ BAD: Inline styles override design tokens, creating inconsistency -->
<button
  class="btn"
  type="button"
  style="background: #3b82f6; color: white; padding: 0.5rem 1rem; border-radius: 4px;"
>
  Save
</button>
```

```css
/* ✅ GOOD: Button atom — fully token-driven, no magic values */
@layer base {
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-sm);
    padding: var(--space-sm) var(--space-md);
    border: 1px solid transparent;
    border-radius: var(--radius-md);
    font-family: var(--font-sans);
    font-size: var(--text-sm);
    font-weight: var(--font-weight-medium, 500);
    line-height: var(--leading-normal);
    cursor: pointer;
    transition: background-color 150ms ease, box-shadow 150ms ease, border-color 150ms ease;
    -webkit-appearance: none;
    user-select: none;

    /* Default (secondary) variant — neutral colors */
    background: var(--color-background-default);
    color: var(--color-text-primary);
    border-color: var(--color-border-default);

    &:hover {
      background: var(--color-background-elevated);
    }

    &:focus-visible {
      outline: none;
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.4);
      border-color: var(--color-border-focus);
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      pointer-events: none;
    }
  }

  /* Primary variant — brand color */
  .btn--primary {
    background: var(--color-brand-primary);
    color: white;
    border-color: transparent;

    &:hover {
      opacity: 0.9;
    }

    &:focus-visible {
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.4);
    }
  }

  /* Danger variant — status color */
  .btn--danger {
    background: var(--color-status-error);
    color: white;
    border-color: transparent;

    &:hover {
      filter: brightness(0.9);
    }
  }

  /* Size variants */
  .btn--sm { padding: 0.25rem var(--space-sm); font-size: var(--text-xs); }
  .btn--lg { padding: var(--space-md) var(--space-xl); font-size: var(--text-base); }

  /* Full-width variant */
  .btn--full { width: 100%; }
}
```

### Input Atom with Validation States

```html
<!-- ✅ GOOD: Input atom with validation states, helper text, and proper ARIA -->
<div class="form-field">
  <label for="email" class="form-field__label">Email address</label>
  <input
    id="email"
    type="email"
    class="form-field__input form-field__input--error"
    placeholder="you@example.com"
    aria-describedby="email-error"
    aria-invalid="true"
    required
    autocomplete="email"
  />
  <span id="email-error" class="form-field__message form-field__message--error" role="alert">
    Please enter a valid email address
  </span>
</div>

<!-- ✅ GOOD: Success state input -->
<div class="form-field">
  <label for="username" class="form-field__label">Username</label>
  <input
    id="username"
    type="text"
    class="form-field__input form-field__input--success"
    placeholder="johndoe"
    aria-describedby="username-success"
    aria-invalid="false"
  />
  <span id="username-success" class="form-field__message form-field__message--success">
    Username is available
  </span>
</div>
```

```css
/* ✅ GOOD: Input atom with token-driven validation states */
@layer base {
  .form-field {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  .form-field__label {
    font-size: var(--text-sm);
    font-weight: var(--font-weight-medium, 500);
    color: var(--color-text-primary);
  }

  .form-field__input {
    padding: var(--space-sm) var(--space-md);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-md);
    font-family: var(--font-sans);
    font-size: var(--text-base);
    color: var(--color-text-primary);
    background: var(--color-background-default);
    transition: border-color 150ms ease, box-shadow 150ms ease;

    &:focus {
      outline: none;
      border-color: var(--color-brand-primary);
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
    }

    /* Disabled state — token-driven */
    &:disabled {
      background: var(--color-background-elevated);
      color: var(--color-text-disabled);
      cursor: not-allowed;
    }

    /* Placeholder styling */
    &::placeholder {
      color: var(--color-text-disabled);
    }
  }

  /* Error state — uses status token, not hardcoded red */
  .form-field__input--error,
  .form-field__input[aria-invalid="true"] {
    border-color: var(--color-status-error);

    &:focus {
      box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.15);
      border-color: var(--color-status-error);
    }
  }

  /* Success state */
  .form-field__input--success {
    border-color: var(--color-status-success);

    &:focus {
      box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15);
    }
  }

  .form-field__message {
    font-size: var(--text-xs);
    line-height: var(--leading-normal);
  }

  .form-field__message--error {
    color: var(--color-status-error);
  }

  .form-field__message--success {
    color: var(--color-status-success);
  }

  /* Reduced motion — respects user preference */
  @media (prefers-reduced-motion: reduce) {
    .form-field__input {
      transition: none;
    }
  }
}
```

### Molecules: Search Form and Input Group

Molecules combine atoms into functional units with composition logic.

```html
<!-- ✅ GOOD: Search form molecule — combines input + button + label -->
<form class="search-form" role="search" aria-label="Search content">
  <label for="global-search" class="sr-only">Search</label>
  <div class="search-form__input-group">
    <svg class="search-form__icon" aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="11" cy="11" r="8"></circle>
      <path d="m21 21-4.35-4.35"></path>
    </svg>
    <input
      id="global-search"
      type="search"
      class="search-form__input"
      placeholder="Search..."
      aria-label="Search content"
      autocomplete="off"
    />
  </div>
  <button type="submit" class="btn btn--primary search-form__submit">
    Go
  </button>
</form>

<!-- ✅ GOOD: Input group molecule — label + input + helper text -->
<div class="input-group">
  <label for="password" class="input-group__label">Password</label>
  <div class="input-group__field">
    <input
      id="password"
      type="password"
      class="input-group__input"
      aria-describedby="password-help"
      autocomplete="new-password"
      minlength="8"
    />
    <button
      type="button"
      class="input-group__toggle"
      aria-label="Show password"
      data-visibility-toggle="password"
    >
      👁
    </button>
  </div>
  <span id="password-help" class="input-group__help">
    Must be at least 8 characters
  </span>
</div>
```

```css
/* ✅ GOOD: Search form molecule — combines atoms into a functional unit */
@layer base {
  .search-form {
    display: flex;
    gap: var(--space-sm);
    align-items: center;
  }

  .search-form__input-group {
    position: relative;
    display: flex;
    align-items: center;
    flex: 1 1 auto;
  }

  .search-form__icon {
    position: absolute;
    left: var(--space-sm);
    width: 16px;
    height: 16px;
    color: var(--color-text-secondary);
    pointer-events: none;
  }

  .search-form__input {
    padding-left: calc(var(--space-sm) + 16px + var(--space-sm));
    width: 100%;
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-lg);
    padding: var(--space-sm) var(--space-md);
    font-size: var(--text-sm);
    background: var(--color-background-default);

    &:focus {
      outline: none;
      border-color: var(--color-brand-primary);
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
    }
  }
}

/* ✅ GOOD: Input group molecule with password visibility toggle */
.input-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);

  &__label {
    font-size: var(--text-sm);
    font-weight: 500;
    color: var(--color-text-primary);
  }

  &__field {
    position: relative;
    display: flex;
    align-items: center;
  }

  &__input {
    flex: 1;
    padding: var(--space-sm) var(--space-md);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-md);
    font-size: var(--text-base);

    &:focus {
      outline: none;
      border-color: var(--color-brand-primary);
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
    }
  }

  &__toggle {
    position: absolute;
    right: var(--space-sm);
    background: none;
    border: none;
    cursor: pointer;
    padding: var(--space-xs);
    color: var(--color-text-secondary);
    font-size: var(--text-base);

    &:focus-visible {
      outline: 2px solid var(--color-brand-primary);
      outline-offset: 2px;
      border-radius: var(--radius-sm);
    }
  }

  &__help {
    font-size: var(--text-xs);
    color: var(--color-text-secondary);
  }
}
```

### Organisms: Header with Navigation and Search

```html
<!-- ✅ GOOD: Header organism — complex layout combining molecules -->
<header class="header" role="banner">
  <div class="header__inner">
    <!-- Brand atom -->
    <a href="/" class="header__brand" aria-label="Home">
      <svg class="header__logo" aria-hidden="true" width="32" height="32" viewBox="0 0 32 32">
        <rect width="32" height="32" rx="8" fill="var(--color-brand-primary)"/>
      </svg>
      <span class="header__name">Acme</span>
    </a>

    <!-- Navigation molecule -->
    <nav class="header__nav" role="navigation" aria-label="Main navigation">
      <ul class="nav-list">
        <li><a href="/products" class="nav-link nav-link--active">Products</a></li>
        <li><a href="/docs" class="nav-link">Docs</a></li>
        <li><a href="/pricing" class="nav-link">Pricing</a></li>
        <li><a href="/blog" class="nav-link">Blog</a></li>
      </ul>
    </nav>

    <!-- Search form molecule -->
    <form class="header__search" role="search">
      <input type="search" placeholder="Search..." aria-label="Search" />
    </form>

    <!-- CTA atom + user menu trigger -->
    <div class="header__actions">
      <button class="btn btn--primary btn--sm" type="button">Sign Up</button>
      <button class="header__menu-toggle" aria-label="Open menu" aria-expanded="false" aria-controls="mobile-nav">
        ☰
      </button>
    </div>
  </div>
</header>

<!-- Mobile navigation overlay -->
<div class="mobile-nav" id="mobile-nav" role="dialog" aria-modal="true" aria-label="Mobile menu" hidden>
  <nav aria-label="Mobile navigation">
    <ul class="nav-list nav-list--vertical">
      <li><a href="/products" class="nav-link">Products</a></li>
      <li><a href="/docs" class="nav-link">Docs</a></li>
      <li><a href="/pricing" class="nav-link">Pricing</a></li>
    </ul>
  </nav>
</div>
```

```css
/* ✅ GOOD: Header organism — uses @layer for cascade control, container queries */
@layer components {
  .header {
    position: sticky;
    top: 0;
    z-index: var(--z-dropdown);
    background: var(--color-background-default);
    border-bottom: 1px solid var(--color-border-default);
    container-type: inline-size;
    container-name: header-container;

    &__inner {
      display: flex;
      align-items: center;
      gap: var(--space-md);
      max-width: 1280px;
      margin: 0 auto;
      padding: var(--space-sm) var(--space-lg);
    }

    &__brand {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
      text-decoration: none;
      color: var(--color-text-primary);
      font-weight: 700;
      font-size: var(--text-lg);
      flex-shrink: 0;
    }

    &__logo { width: 32px; height: 32px; }
    &__name { display: none; } /* Hide text on small containers */

    &__nav { flex: 1; }

    &__search input {
      padding: var(--space-xs) var(--space-sm);
      border: 1px solid var(--color-border-default);
      border-radius: var(--radius-lg);
      font-size: var(--text-sm);
      background: var(--color-background-elevated);

      &:focus {
        outline: none;
        border-color: var(--color-brand-primary);
      }
    }

    &__actions {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
      flex-shrink: 0;
    }

    &__menu-toggle {
      display: none; /* Hidden on desktop — shown via container query */
      background: none;
      border: none;
      font-size: var(--text-xl);
      cursor: pointer;
      padding: var(--space-xs);
      color: var(--color-text-primary);
    }

    @media (prefers-reduced-motion: reduce) {
      position: static;
    }
  }

  /* Container query for responsive header — component-level, not viewport-level */
  @container header-container (max-width: 768px) {
    .header__name { display: inline; }

    .header__nav { display: none; }

    .header__menu-toggle { display: block; }

    .header__actions .btn--primary {
      display: none; /* Hide CTA on mobile, show in nav */
    }
  }
}

.nav-list {
  display: flex;
  gap: var(--space-md);
  list-style: none;
  margin: 0;
  padding: 0;

  &--vertical {
    flex-direction: column;
    gap: var(--space-sm);
  }
}

.nav-link {
  text-decoration: none;
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
  font-weight: 500;
  padding: var(--space-xs) var(--space-sm);
  border-radius: var(--radius-sm);
  transition: color 150ms ease, background-color 150ms ease;

  &--active {
    color: var(--color-brand-primary);
    background: rgba(99, 102, 241, 0.08);
  }

  &:hover {
    color: var(--color-text-primary);
    background: var(--color-background-elevated);
  }

  &:focus-visible {
    outline: none;
    box-shadow: inset 0 0 0 2px var(--color-brand-primary);
  }
}
```

### Mobile Navigation with Focus Trapping

```typescript
// ✅ GOOD: Mobile menu toggle with focus trapping and escape key handling
class MobileNavigation {
  private toggleButton: HTMLButtonElement | null = null;
  private dialog: HTMLDivElement | null = null;
  private firstFocusable: HTMLElement | null = null;
  private lastFocusable: HTMLElement | null = null;
  private previousFocus: HTMLElement | null = null;

  constructor(toggleSelector: string, dialogSelector: string) {
    this.toggleButton = document.querySelector(toggleSelector);
    this.dialog = document.querySelector(dialogSelector);

    if (!this.toggleButton || !this.dialog) return;

    this.cacheFocusables();
    this.bindEvents();
  }

  private cacheFocusables(): void {
    const focusableSelectors = [
      'a[href]', 'button:not([disabled])', 'input:not([disabled])',
      'textarea:not([disabled])', '[tabindex]:not([tabindex="-1"])'
    ].join(', ');
    const elements = this.dialog!.querySelectorAll(focusableSelectors) as NodeListOf<HTMLElement>;
    if (elements.length > 0) {
      this.firstFocusable = elements[0];
      this.lastFocusable = elements[elements.length - 1];
    }
  }

  private bindEvents(): void {
    this.toggleButton!.addEventListener("click", () => this.open());
    document.addEventListener("keydown", (e) => this.handleKeydown(e));
  }

  open(): void {
    this.previousFocus = document.activeElement;
    this.dialog!.hidden = false;
    this.dialog!.setAttribute("aria-modal", "true");
    this.toggleButton!.setAttribute("aria-expanded", "true");
    document.body.style.overflow = "hidden";

    // Trap focus inside dialog
    requestAnimationFrame(() => {
      this.firstFocusable?.focus();
    });
  }

  close(): void {
    this.dialog!.hidden = true;
    this.toggleButton!.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
    this.previousFocus?.focus();
  }

  private handleKeydown(e: KeyboardEvent): void {
    if (!this.dialog || this.dialog.hidden) return;

    // Escape closes the dialog
    if (e.key === "Escape") {
      e.preventDefault();
      this.close();
      return;
    }

    // Tab trapping for focus management
    if (e.key !== "Tab" || !this.firstFocusable || !this.lastFocusable) return;

    if (e.shiftKey) {
      // Shift+Tab: wrap to last element
      if (document.activeElement === this.firstFocusable) {
        e.preventDefault();
        this.lastFocusable.focus();
      }
    } else {
      // Tab: wrap to first element
      if (document.activeElement === this.lastFocusable) {
        e.preventDefault();
        this.firstFocusable.focus();
      }
    }
  }
}

// Initialize: new MobileNavigation(".header__menu-toggle", "#mobile-nav");
```

### Template & Page: Dashboard Layout

```html
<!-- ✅ GOOD: Template — structural skeleton with placeholder content -->
<main class="dashboard-template" role="main">
  <div class="dashboard-layout">
    <!-- Sidebar organism -->
    <aside class="sidebar" role="complementary" aria-label="Dashboard navigation">
      <nav>
        <ul class="nav-list nav-list--vertical">
          <li><a href="#overview" class="nav-link nav-link--active">Overview</a></li>
          <li><a href="#analytics" class="nav-link">Analytics</a></li>
          <li><a href="#reports" class="nav-link">Reports</a></li>
          <li><a href="#settings" class="nav-link">Settings</a></li>
        </ul>
      </nav>
    </aside>

    <!-- Main content area -->
    <section class="dashboard-content">
      <!-- Stat cards molecule group -->
      <div class="stat-grid">
        <article class="stat-card">
          <h2 class="stat-card__title">Total Revenue</h2>
          <p class="stat-card__value">$48,250</p>
          <p class="stat-card__change stat-card__change--positive">+12.5% from last month</p>
        </article>
        <article class="stat-card">
          <h2 class="stat-card__title">Active Users</h2>
          <p class="stat-card__value">2,847</p>
          <p class="stat-card__change stat-card__change--positive">+8.3% from last month</p>
        </article>
        <article class="stat-card">
          <h2 class="stat-card__title">Conversion Rate</h2>
          <p class="stat-card__value">3.24%</p>
          <p class="stat-card__change stat-card__change--negative">-0.5% from last month</p>
        </article>
      </div>

      <!-- Data table organism -->
      <table class="data-table" aria-label="Recent transactions">
        <caption class="sr-only">Recent transactions with status and amounts</caption>
        <thead>
          <tr>
            <th scope="col">Transaction</th>
            <th scope="col">Amount</th>
            <th scope="col">Status</th>
            <th scope="col">Date</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><span class="table-cell">Invoice #1024</span></td>
            <td><span class="table-cell">$1,250.00</span></td>
            <td><span class="status-badge status-badge--completed">Completed</span></td>
            <td><time datetime="2025-04-15">Apr 15, 2025</time></td>
          </tr>
        </tbody>
      </table>
    </section>
  </div>
</main>
```

```css
/* ✅ GOOD: Dashboard template — container queries for layout shifts */
.dashboard-layout {
  display: grid;
  grid-template-columns: 260px 1fr;
  gap: var(--space-xl);
  max-width: 1440px;
  margin: 0 auto;
  padding: var(--space-xl) var(--space-2xl);
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: var(--space-lg);
  margin-bottom: var(--space-xl);
}

.stat-card {
  padding: var(--space-lg);
  background: var(--color-background-default);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-lg);

  &__title {
    margin: 0;
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
    font-weight: 500;
  }

  &__value {
    margin: var(--space-xs) 0;
    font-size: var(--text-2xl);
    font-weight: 700;
    color: var(--color-text-primary);
  }

  &__change {
    margin: 0;
    font-size: var(--text-xs);
    font-weight: 500;

    &--positive { color: var(--color-status-success); }
    &--negative { color: var(--color-status-error); }
  }
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--text-sm);

  th {
    text-align: left;
    padding: var(--space-sm) var(--space-md);
    border-bottom: 2px solid var(--color-border-default);
    color: var(--color-text-secondary);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-size: var(--text-xs);
  }

  td {
    padding: var(--space-sm) var(--space-md);
    border-bottom: 1px solid var(--color-border-default);
  }

  tbody tr:hover {
    background: var(--color-background-elevated);
  }
}

.status-badge {
  display: inline-block;
  padding: 0.15rem 0.6rem;
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: 600;

  &--completed { background: rgba(16, 185, 129, 0.1); color: var(--color-status-success); }
  &--pending { background: rgba(245, 158, 11, 0.1); color: var(--color-status-warning); }
  &--failed { background: rgba(239, 68, 68, 0.1); color: var(--color-status-error); }
}

/* Container query for sidebar collapse — component responds to its own width */
@container (max-width: 900px) {
  .dashboard-layout {
    grid-template-columns: 1fr;
  }

  .sidebar {
    position: fixed;
    top: 64px;
    left: 0;
    bottom: 0;
    width: 280px;
    background: var(--color-background-default);
    border-right: 1px solid var(--color-border-default);
    z-index: var(--z-dropdown);
    padding: var(--space-lg);
    transform: translateX(-100%);
    transition: transform 200ms ease;

    &.is-open {
      transform: translateX(0);
    }
  }
}
```

---

## Accessibility-First Implementation Patterns

### WCAG 2.2 AA Compliance Requirements

Every component must meet these baseline accessibility requirements before consideration for merge.

```html
<!-- ✅ GOOD: Modal with full ARIA pattern — focus trap, role="dialog", aria-modal -->
<div
  id="confirm-delete"
  class="modal"
  role="dialog"
  aria-modal="true"
  aria-labelledby="confirm-delete-title"
  aria-describedby="confirm-delete-desc"
  hidden
>
  <div class="modal__overlay" data-close></div>
  <div class="modal__content" role="document">
    <div class="modal__header">
      <h2 id="confirm-delete-title" class="modal__title">Delete Project</h2>
      <button
        type="button"
        class="modal__close"
        aria-label="Close dialog"
        data-close
      >
        ✕
      </button>
    </div>
    <div class="modal__body">
      <p id="confirm-delete-desc">
        Are you sure you want to delete "Q2 Marketing Campaign"?
        This action cannot be undone.
      </p>
    </div>
    <div class="modal__footer">
      <button type="button" class="btn" data-close>Cancel</button>
      <button type="button" class="btn btn--danger" id="confirm-delete-btn">
        Delete Project
      </button>
    </div>
  </div>
</div>
```

```css
/* ✅ GOOD: Modal with reduced motion, focus styles, and proper contrast */
@layer components {
  .modal {
    position: fixed;
    inset: 0;
    z-index: var(--z-modal);
    display: flex;
    align-items: center;
    justify-content: center;

    &__overlay {
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
    }

    &__content {
      position: relative;
      background: var(--color-background-default);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-xl);
      max-width: 480px;
      width: calc(100% - 2rem);
      max-height: 90vh;
      overflow-y: auto;

      /* Reduced motion: no entrance animation */
      @media (prefers-reduced-motion: reduce) {
        animation: none;
      }
    }

    &__title {
      margin: 0;
      font-size: var(--text-xl);
      color: var(--color-text-primary);
    }

    &__close {
      position: absolute;
      top: var(--space-md);
      right: var(--space-md);
      background: none;
      border: none;
      font-size: var(--text-xl);
      cursor: pointer;
      color: var(--color-text-secondary);
      padding: var(--space-xs);
      border-radius: var(--radius-sm);

      &:hover {
        background: var(--color-background-elevated);
        color: var(--color-text-primary);
      }

      /* WCAG 2.2: Focus visible must be at least 2px and have 3px outline offset */
      &:focus-visible {
        outline: 2px solid var(--color-brand-primary);
        outline-offset: 3px;
      }
    }
  }
}

/* ✅ GOOD: Screen reader only utility — visually hidden but accessible */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

/* ✅ GOOD: Skip link for keyboard navigation */
.skip-link {
  position: absolute;
  top: -100%;
  left: var(--space-md);
  padding: var(--space-sm) var(--space-md);
  background: var(--color-brand-primary);
  color: white;
  font-weight: 600;
  z-index: var(--z-tooltip);
  text-decoration: none;
  border-radius: var(--radius-md);

  &:focus {
    top: var(--space-md);
  }
}
```

### Color Contrast Enforcement in Design Tokens

```typescript
// ✅ GOOD: Automated contrast validation for all token combinations
interface TokenColorPair {
  foreground: string;
  background: string;
  wcagLevel: "AA" | "AAA";
  minRatio: number;
}

const CONTRAST_RULES: TokenColorPair[] = [
  // Normal text requires 4.5:1 for AA
  { foreground: "--color-text-primary", background: "--color-background-default", wcagLevel: "AA", minRatio: 4.5 },
  { foreground: "--color-text-secondary", background: "--color-background-default", wcagLevel: "AA", minRatio: 4.5 },
  { foreground: "--color-text-disabled", background: "--color-background-default", wcagLevel: "AA", minRatio: 3.0 },
  // Large text (18px+ bold or 24px+) requires 3:1 for AA
  { foreground: "--color-text-primary", background: "--color-background-default", wcagLevel: "AAA-large", minRatio: 3.0 },
];

function hexToRelativeLuminance(hex: string): number {
  const rgb = normalizeHex(hex);
  if (!rgb) throw new Error(`Invalid hex color: ${hex}`);

  const [r, g, b] = [rgb.r / 255, rgb.g / 255, rgb.b / 255].map((c) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function calculateContrastRatio(fgLum: number, bgLum: number): number {
  const lighter = Math.max(fgLum, bgLum);
  const darker = Math.min(fgLum, bgLum);
  return parseFloat(((lighter + 0.05) / (darker + 0.05)).toFixed(2));
}

function validateTokenContrasts(): void {
  const root = getComputedStyle(document.documentElement);

  for (const rule of CONTRAST_RULES) {
    const fgValue = root.getPropertyValue(rule.foreground).trim();
    const bgValue = root.getPropertyValue(rule.background).trim();

    if (!fgValue || !bgValue) {
      console.warn(`Missing token: ${rule.foreground} or ${rule.background}`);
      continue;
    }

    const fgLum = hexToRelativeLuminance(fgValue);
    const bgLum = hexToRelativeLuminance(bgValue);
    const ratio = calculateContrastRatio(fgLum, bgLum);

    if (ratio < rule.minRatio) {
      console.error(
        `❌ WCAG ${rule.wcagLevel} FAIL: ${rule.foreground} (${fgValue}) on ` +
        `${rule.background} (${bgValue}) = ${ratio}:1 (requires ${rule.minRatio}:1)`
      );
    } else {
      console.log(
        `✅ WCAG ${rule.wcagLevel} PASS: ${rule.foreground} on ${rule.background} = ${ratio}:1`
      );
    }
  }
}

function normalizeHex(hex: string): { r: number; g: number; b: number } | null {
  const match = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (!match) return null;
  return {
    r: parseInt(match[1], 16),
    g: parseInt(match[2], 16),
    b: parseInt(match[3], 16),
  };
}

// Run validation on theme change or page load
document.addEventListener("DOMContentLoaded", validateTokenContrasts);
window.addEventListener("themechange", () => setTimeout(validateTokenContrasts, 50));
```

### Keyboard Navigation for Complex Components

```typescript
// ✅ GOOD: Accessible dropdown with arrow key navigation and roving tabindex
class AccessibleDropdown {
  private button: HTMLButtonElement;
  private menu: HTMLElement;
  private items: HTMLElement[] = [];

  constructor(buttonSelector: string, menuSelector: string) {
    this.button = document.querySelector(buttonSelector)!;
    this.menu = document.querySelector(menuSelector)!;
    this.items = Array.from(this.menu.querySelectorAll('[role="option"]'));

    this.bindEvents();
  }

  private bindEvents(): void {
    this.button.addEventListener("click", () => this.toggle());
    this.button.addEventListener("keydown", (e) => this.handleButtonKeydown(e));
    this.menu.addEventListener("keydown", (e) => this.handleMenuKeydown(e));
    document.addEventListener("click", (e) => this.handleOutsideClick(e));

    // Update aria-activedescendant on hover/focus
    this.items.forEach((item, index) => {
      item.setAttribute("tabindex", "-1");
      item.addEventListener("mouseenter", () => this.setActiveDescendant(item));
      item.addEventListener("focus", () => this.setActiveDescendant(item));
    });
  }

  private toggle(): void {
    const isOpen = this.button.getAttribute("aria-expanded") === "true";
    this.button.setAttribute("aria-expanded", String(!isOpen));
    this.menu.hidden = isOpen;

    if (!isOpen) {
      // Set initial active item
      if (this.items.length > 0) {
        this.setActiveDescendant(this.items[0]);
        this.items[0].focus();
      }
    }
  }

  private setActiveDescendant(item: HTMLElement): void {
    this.button.setAttribute("aria-activedescendant", item.id);
  }

  private handleButtonKeydown(e: KeyboardEvent): void {
    const isExpanded = this.button.getAttribute("aria-expanded") === "true";

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        if (!isExpanded) {
          this.toggle();
        } else {
          this.items[0]?.focus();
        }
        break;
      case "Escape":
        if (isExpanded) {
          this.button.blur();
          this.toggle();
        }
        break;
    }
  }

  private handleMenuKeydown(e: KeyboardEvent): void {
    const currentIndex = this.items.indexOf(document.activeElement as HTMLElement);

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        if (currentIndex < this.items.length - 1) {
          this.items[currentIndex + 1].focus();
        } else {
          this.items[0]?.focus(); // Wrap to first
        }
        break;
      case "ArrowUp":
        e.preventDefault();
        if (currentIndex > 0) {
          this.items[currentIndex - 1].focus();
        } else {
          this.items[this.items.length - 1]?.focus(); // Wrap to last
        }
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        (document.activeElement as HTMLElement)?.click();
        this.button.focus();
        break;
      case "Escape":
        this.button.blur();
        this.toggle();
        break;
    }
  }

  private handleOutsideClick(e: MouseEvent): void {
    if (!this.menu.contains(e.target as Node) && !this.button.contains(e.target as Node)) {
      const isExpanded = this.button.getAttribute("aria-expanded") === "true";
      if (isExpanded) {
        this.button.blur();
        this.toggle();
      }
    }
  }
}

// Usage: new AccessibleDropdown(".dropdown__trigger", ".dropdown__menu");
```

---

## Modern CSS Architecture for Design Systems

### Cascade Layers (@layer) Organization

Use `@layer` to create an explicit cascade order that prevents specificity wars in large design systems.

```css
/* ✅ GOOD: Explicit cascade layer ordering — lowest priority first */
@layer reset, base, components, utilities;

/* Reset layer — browser normalize only, no design tokens */
@layer reset {
  *, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
  }

  html {
    line-height: 1.5;
    -webkit-text-size-adjust: 100%;
  }

  body {
    min-height: 100vh;
    font-family: var(--font-sans);
    color: var(--color-text-primary);
    background: var(--color-background-default);
  }

  img, picture, video, canvas, svg {
    display: block;
    max-width: 100%;
  }

  input, button, textarea, select {
    font: inherit;
  }

  a:not([class]) {
    color: inherit;
    text-decoration: underline;
  }
}

/* Base layer — component base styles using tokens */
@layer base {
  .btn { /* ... button atom styles ... */ }
  .form-field { /* ... input atom styles ... */ }
  .modal { /* ... modal molecule styles ... */ }
}

/* Components layer — complex compositions and organism styles */
@layer components {
  .header { /* ... header organism styles ... */ }
  .sidebar { /* ... sidebar organism styles ... */ }
  .data-table { /* ... data table organism styles ... */ }
}

/* Utilities layer — helper classes that override everything via final cascade position */
@layer utilities {
  .sr-only { /* ... screen reader only utility ... */ }
  .visually-hidden { /* ... visually hidden but accessible ... */ }
}
```

### Container Queries for Component Responsiveness

```css
/* ✅ GOOD: Card component using container queries instead of viewport media queries */
@layer components {
  .card-grid {
    container-type: inline-size;
    container-name: card-grid;
    display: grid;
    gap: var(--space-lg);
  }

  .card {
    background: var(--color-background-default);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-lg);
    overflow: hidden;
    transition: box-shadow 200ms ease;

    &__image {
      width: 100%;
      aspect-ratio: 16 / 9;
      object-fit: cover;
    }

    &__body {
      padding: var(--space-lg);
    }

    &__title {
      margin: 0 0 var(--space-sm);
      font-size: var(--text-lg);
    }

    /* Container query — component adapts to its container width */
    @container card-grid (min-width: 600px) {
      & {
        display: grid;
        grid-template-columns: 200px 1fr;
        gap: var(--space-md);
      }

      &__image {
        height: 100%;
        aspect-ratio: auto;
      }

      &__body {
        padding: var(--space-md) var(--space-lg);
      }
    }

    @container card-grid (min-width: 900px) {
      &__title {
        font-size: var(--text-xl);
      }

      &__body {
        padding: var(--space-xl) var(--space-2xl);
      }
    }
  }
}

/* ❌ BAD — Viewport media queries tie component layout to page context */
.card {
  @media (min-width: 600px) {
    display: grid;
    grid-template-columns: 200px 1fr; /* Breaks when card is in a narrow sidebar */
  }
}
```

### The `:has()` Selector for State-Driven Styling

```css
/* ✅ GOOD: Form field that shows validation state based on its children's state */
@layer base {
  .form-field {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);

    /* Show error styling when input has :invalid AND user interacted with it */
    &:has(> input:invalid:not(:placeholder-shown)) {
      > input {
        border-color: var(--color-status-error);

        &:focus {
          box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.15);
        }
      }

      > .form-field__message--error {
        display: block;
      }
    }

    /* Show success styling when input is valid and not empty */
    &:has(> input:valid:not(:placeholder-shown):not(:focus)) {
      > input {
        border-color: var(--color-status-success);
      }
    }
  }

  .form-field__message--error,
  .form-field__message--success {
    display: none;
    font-size: var(--text-xs);
  }
}

/* ❌ BAD — Requires JavaScript to add state class manually */
.form-field.invalid > input {
  border-color: red; /* Hardcoded color, no token usage */
}

// JavaScript hack to manage state:
// if (!input.validity.valid) formField.classList.add('invalid');
```

### CSS Native Nesting in Design System Components

```css
/* ✅ GOOD: Data table organism using native CSS nesting with @layer control */
@layer components {
  .data-table {
    width: 100%;
    border-collapse: collapse;
    font-size: var(--text-sm);

    /* Direct child selectors — no extra class needed */
    & thead th {
      padding: var(--space-sm) var(--space-md);
      border-bottom: 2px solid var(--color-border-default);
      color: var(--color-text-secondary);
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      font-size: var(--text-xs);
      text-align: left;
    }

    & tbody tr {
      border-bottom: 1px solid var(--color-border-default);
      transition: background-color 150ms ease;

      /* Nested hover — scoped to table rows only */
      &:hover {
        background: var(--color-background-elevated);
      }

      /* Nested td with specific cell styling */
      & td {
        padding: var(--space-sm) var(--space-md);
        color: var(--color-text-primary);

        /* Action cells — right-aligned */
        &:last-child {
          text-align: right;

          & button {
            padding: 0.25rem var(--space-sm);
          }
        }
      }
    }

    /* Nested pagination controls */
    & .pagination {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--space-md) 0;
      font-size: var(--text-xs);
      color: var(--color-text-secondary);

      & button {
        padding: 0.25rem var(--space-sm);
        border: 1px solid var(--color-border-default);
        border-radius: var(--radius-sm);
        background: var(--color-background-default);
        cursor: pointer;

        &:hover {
          background: var(--color-background-elevated);
        }

        &:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
      }
    }

    /* Nested empty state */
    & .empty-state {
      text-align: center;
      padding: var(--space-2xl) 0;
      color: var(--color-text-secondary);

      & p {
        margin: 0;
      }
    }
  }
}
```

---

## Storybook Component-Driven Development Workflow

### Project Structure Convention

Organize components in a Storybook-friendly directory structure following Atomic Design levels.

```
src/
  design-system/
    tokens/                  ← Design token source files
      colors.json
      spacing.json
      typography.json
    atoms/                   ← Indivisible building blocks
      button/
        Button.stories.tsx
        Button.tsx
        Button.css
        index.ts
      input/
        Input.stories.tsx
        Input.tsx
        Input.css
        index.ts
      icon/
        Icon.stories.tsx
        Icon.tsx
        Icon.css
        index.ts
    molecules/               ← Combinations of atoms
      search-form/
        SearchForm.stories.tsx
        SearchForm.tsx
        SearchForm.css
        index.ts
      form-field/
        FormField.stories.tsx
        FormField.tsx
        FormField.css
        index.ts
    organisms/               ← Complex component assemblies
      header/
        Header.stories.tsx
        Header.tsx
        Header.css
        index.ts
      data-table/
        DataTable.stories.tsx
        DataTable.tsx
        DataTable.css
        index.ts
    templates/               ← Page-level layouts
      dashboard/
        DashboardTemplate.stories.tsx
        DashboardTemplate.tsx
        DashboardTemplate.css
        index.ts
  stories/                   ← Global Storybook config
    global.css               ← Import design system CSS
    Preview.tsx              ← Storybook preview with decorators
```

### Storybook Stories for Every Variant

```tsx
// ✅ GOOD: Button component with comprehensive story variants
import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import { Button } from "./Button";

const meta = {
  title: "Design System/Atoms/Button",
  component: Button,
  parameters: {
    layout: "centered",
    // Visual regression test configurations per variant
    chromatic: {
      modes: {
        light: { theme: "light" },
        dark: { theme: "dark" },
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: { type: "select" },
      options: ["primary", "secondary", "danger"],
    },
    size: {
      control: { type: "select" },
      options: ["sm", "md", "lg"],
    },
    disabled: { control: { type: "boolean" } },
  },
  args: { onClick: fn() },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

// Primary button — all sizes
export const Primary: Story = {
  args: { variant: "primary", children: "Primary Button" },
};

export const PrimarySmall: Story = {
  args: { variant: "primary", size: "sm", children: "Small" },
};

export const PrimaryLarge: Story = {
  args: { variant: "primary", size: "lg", children: "Large Button" },
};

// Secondary button — with icon
export const SecondaryWithIcon: Story = {
  args: {
    variant: "secondary",
    children: "Download Report",
    icon: <DownloadIcon />,
  },
};

// Danger variant — delete action
export const Danger: Story = {
  args: {
    variant: "danger",
    children: "Delete Item",
    onClick: fn(),
  },
};

// Disabled states
export const Disabled: Story = {
  args: {
    variant: "secondary",
    disabled: true,
    children: "Disabled Button",
  },
};

// Full width (common form pattern)
export const FullWidth: Story = {
  args: {
    variant: "primary",
    fullWidth: true,
    children: "Sign Up Free",
  },
};

// Loading state
export const Loading: Story = {
  args: {
    variant: "primary",
    loading: true,
    disabled: true,
    children: "Saving...",
  },
};

// ✅ GOOD: Accessibility tests integrated into Storybook
import { expect, userEvent, within, waitFor } from "@storybook/test";

export const AccessibilityTest: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    
    // Check for button role and label
    await expect(
      canvas.getByRole("button", { name: /primary button/i })
    ).toBeInTheDocument();

    // Verify focus-visible styling is present
    const button = canvas.getByRole("button");
    button.focus();
    await waitFor(() => {
      const styles = getComputedStyle(button);
      expect(styles.boxShadow).toBeTruthy(); // Focus ring present
    });
  },
};
```

### Testing Component Isolation and Visual Regression

```tsx
// ✅ GOOD: Integration test for form field molecule with validation state
import { render, screen, fireEvent } from "@testing-library/react";
import { userEvent as user } from "@testing-library/user-event";
import { FormField } from "./FormField";
import { axe, toHaveNoViolations } from "jest-axe";

expect.extend(toHaveNoViolations);

describe("FormField Component", () => {
  it("renders label and input with correct association", () => {
    render(
      <FormField label="Email" htmlFor="email" type="email">
        <input id="email" />
      </FormField>
    );

    expect(screen.getByLabelText("Email")).toBeInTheDocument();
  });

  it("displays error message when aria-invalid is true", async () => {
    render(
      <FormField label="Email" htmlFor="email">
        <input id="email" aria-invalid="true" aria-describedby="email-error" />
      </FormField>
    );

    expect(screen.getByText("Please enter a valid email address")).toBeInTheDocument();
  });

  it("passes axe accessibility audit", async () => {
    const { container } = render(
      <FormField label="Email" htmlFor="email">
        <input id="email" />
      </FormField>
    );

    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });

  it("toggles password visibility on button click", async () => {
    render(
      <div className="input-group">
        <label htmlFor="password">Password</label>
        <input id="password" type="password" />
        <button type="button" aria-label="Show password">👁</button>
      </div>
    );

    const input = screen.getByLabelText("Password");
    const toggleButton = screen.getByRole("button", { name: /show password/i });

    expect(input).toHaveAttribute("type", "password");

    await user.click(toggleButton);
    expect(input).toHaveAttribute("type", "text");

    await user.click(toggleButton);
    expect(input).toHaveAttribute("type", "password");
  });
});
```

---

## Constraints

### MUST DO
- Define every visual value as a design token — never use hardcoded magic numbers or hex colors in component CSS
- Organize components strictly by Atomic Design hierarchy: atoms → molecules → organisms; skip no level
- Use `@layer` with explicit ordering (`reset`, `base`, `components`, `utilities`) to prevent specificity wars
- Apply container queries (`@container`) over viewport media queries for truly reusable, context-independent components
- Ensure every interactive component is keyboard navigable and has visible focus indicators (minimum 2px outline)
- Maintain a minimum 4.5:1 contrast ratio for all normal text per WCAG 2.2 AA; use automated contrast checking in CI
- Write Storybook stories covering every variant, state (loading, error, empty, disabled), and interaction pattern
- Implement focus trapping for modal dialogs with Escape key to close and return focus to trigger element
- Respect `prefers-reduced-motion` by disabling non-essential animations and transitions
- Use native CSS nesting (`&` parent selector) instead of preprocessors — it is widely supported in 2025/2026

### MUST NOT DO
- Never use hardcoded color hex values (e.g., `#ef4444`) directly in component styles — always reference a design token via `var()`
- Do not nest more than 3 levels deep with native CSS — extract intermediate selectors instead
- Do not use `!important` to fix specificity issues — restructure the cascade layers or component class names
- Never skip ARIA attributes on interactive elements — every button must have an accessible name, every input needs a label or `aria-label`
- Do not rely solely on color to convey state (e.g., error vs. success) — add icons, text indicators, and/or border styling as well
- Do not implement responsive layout with viewport `@media` queries for component-level changes — use container queries instead
- Never omit focus-visible styles on interactive elements — keyboard users depend on these
- Do not disable or bypass accessibility audits — integrate axe-core into Storybook and CI pipeline

---

## Live References

> Authoritative documentation for atomic design, design tokens, WCAG accessibility, and modern CSS architecture.

- [Brad Frost — Atomic Design (Book & Website)](http://bradfrost.com/blog/post/atomic-web-design/)
- [W3C — Design Tokens Community Group](https://www.w3.org/community/design-tokens/)
- [WCAG 2.2 — Complete Guidelines](https://www.w3.org/TR/WCAG22/)
- [MDN — CSS Container Queries](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_container_queries)
- [MDN — :has() Selector (Relational Pseudo-class)](https://developer.mozilla.org/en-US/docs/Web/CSS/:has)
- [Storybook — Official Documentation](https://storybook.js.org/docs)
- [Style Dictionary by Adobe — Token Transformation](https://sdk.styletokens.com/)

---

## Related Skills

| Skill | Purpose |
|---|---|
| `css-nesting` | Native CSS nesting patterns for component styles within design system components |
| `css-architecture` | Cascade layers, BEM naming, and Tailwind integration to support design system structure |
| `component-testing-library` | Write automated tests for every atomic design level in Storybook with Testing Library |
| `code-review` | Review design system PRs for token compliance, accessibility, and component hierarchy |
| `frontend-philosophy` | UI design philosophy — typography, color, motion, composition, and atmosphere principles |
