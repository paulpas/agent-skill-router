---
name: web-interface-guidelines
description: Applies comprehensive web interface design guidelines covering layout, typography, color, accessibility, responsive design, and UX patterns for consistent, user-friendly interfaces.
license: MIT
compatibility: opencode
archetypes:
  - educational
  - enforcement
anti_triggers:
  - brainstorming
  - vague ideation
  - backend architecture
response_profile:
  verbosity: medium
  directive_strength: medium
  abstraction_level: tactical
metadata:
  version: "1.0.0"
  domain: coding
  triggers: web design, ui guidelines, interface design, ux patterns, accessibility, responsive design, wcag
  role: reference
  scope: implementation
  output-format: guidance
  content-types:
    - guidance
    - examples
    - do-dont
  related-skills: css-architecture, design-systems, frontend-philosophy, react-view-transitions
  author: vercel
  source: https://github.com/vercel-labs/agent-skills
---

# Web Interface Design Guidelines

Applies comprehensive web interface design guidelines covering layout, typography, color accessibility, responsive design, UX patterns, and visual hierarchy. These rules ensure interfaces are usable, inclusive, and consistent across devices and interaction modes. This skill acts as a design reference — load it when reviewing or creating web interface code.

## TL;DR Checklist

- [ ] Check color contrast ratios meet WCAG AA minimum (4.5:1 for text, 3:1 for large text and UI components)
- [ ] Verify keyboard navigation — every interactive element must be reachable and operable via keyboard
- [ ] Test responsive layout at 320px, 768px, 1024px, and 1440px breakpoints
- [ ] Confirm no information is conveyed by color alone — add text labels or icons
- [ ] Review touch targets meet minimum 44x44px size on interactive elements
- [ ] Validate all form inputs have visible, programmatically-associated labels
- [ ] Check that loading, error, and empty states are implemented for all data-displaying components

---

## When to Use

Use this skill when:

- Designing or reviewing web application user interfaces for consistency and usability
- Implementing a new component or page and needing design pattern guidance
- Auditing an existing interface for accessibility compliance (WCAG)
- Setting up a design system or component library with shared UX patterns
- Writing CSS for responsive layouts, typography scales, or accessible color systems
- Reviewing pull requests that touch UI components, layout, or styling
- Onboarding new developers to interface design standards

---

## When NOT to Use

Avoid this skill for:

- UI motion/animation design — use `react-view-transitions` for transition-specific guidance
- Deep design system token architecture — use `design-systems` for token hierarchy
- Backend service interface design — this applies only to frontend user interfaces
- Print or native mobile design — these guidelines are specific to web interfaces
- Brand identity or visual language creation — this covers implementation, not brand definition

---

## Core Workflow

1. **Analyze User Needs and Task Flows** — Identify the primary tasks users will perform on the interface. Map user journeys to understand the sequence of screens and interactions. Define success criteria for each task (time to complete, error rate, satisfaction). **Checkpoint:** Write down the top 3 user goals for the interface before writing any code.

2. **Design Layout Structure with Consistent Spacing** — Establish a baseline grid (typically 4px or 8px increments) and use it consistently for margins, padding, and gaps. Define the page layout using CSS Grid or Flexbox with clear content regions. Maintain consistent whitespace between related and unrelated elements (tighter spacing within groups, looser between groups). **Checkpoint:** Verify that spacing values are multiples of the baseline grid and no arbitrary values are used.

3. **Apply Typography Scale with Accessible Sizes** — Define a typography scale with 4-6 sizes (e.g., 0.875rem, 1rem, 1.25rem, 1.5rem, 2rem, 3rem). Set body text to at least 16px (1rem) with a line-height of 1.5-1.6 for readability. Ensure heading line-height is tighter (1.2-1.3). Limit line length to 60-75 characters for optimal readability. **Checkpoint:** Test body text readability at 400% zoom — content should not overflow or clip.

4. **Select Color Palette Meeting WCAG AA Contrast** — Choose a primary, secondary, neutral, and semantic color (success, warning, error, info). Verify all text/background combinations against WCAG AA: 4.5:1 for normal text, 3:1 for large text (18px+ bold or 24px+ regular) and UI components. Use tools like the WebAIM Contrast Checker to validate. **Checkpoint:** The lowest contrast ratio in the palette must exceed 4.5:1 for body text, 3:1 for large text and UI borders.

5. **Ensure Keyboard Navigation and Screen Reader Support** — Verify every interactive element is reachable via Tab key in logical order. Use `:focus-visible` for focus indicators (not `:focus` or `outline: none` alone). Add `aria-label` or `aria-labelledby` to elements without visible text labels. Use semantic HTML (`<nav>`, `<main>`, `<button>`, `<a>`) instead of generic `<div>` with ARIA roles. **Checkpoint:** Tab through the entire interface — every interactive element must be reachable and activate with Enter or Space.

6. **Test Responsive Behavior Across Breakpoints** — Start with the smallest viewport (320px) and progressively enhance. Use CSS Grid with `auto-fit`/`minmax` for fluid layouts. Ensure touch targets are at least 44x44px (with 8px gap between adjacent targets). Test content reflow at 400% zoom — content should not require horizontal scrolling. **Checkpoint:** At 320px width, all functionality must be usable without horizontal scrolling or hidden controls.

---

## Implementation Patterns

### Pattern 1: Accessible Color Palette

```css
/* ✅ GOOD: Accessible color palette with WCAG AA-compliant pairings */

:root {
  /* Primary palette */
  --color-primary-50: #eff6ff;
  --color-primary-100: #dbeafe;
  --color-primary-500: #3b82f6;
  --color-primary-600: #2563eb;
  --color-primary-700: #1d4ed8;
  --color-primary-900: #1e3a5f;

  /* Neutral palette */
  --color-neutral-50: #f8fafc;
  --color-neutral-100: #f1f5f9;
  --color-neutral-300: #cbd5e1;
  --color-neutral-500: #64748b;
  --color-neutral-700: #334155;
  --color-neutral-900: #0f172a;

  /* Semantic palette */
  --color-success: #16a34a;
  --color-warning: #d97706;
  --color-error: #dc2626;
  --color-info: #2563eb;

  /* Text colors (all pass WCAG AA on white background) */
  --color-text-primary: #0f172a;     /* 15.3:1 on white */
  --color-text-secondary: #475569;    /* 7.0:1 on white */
  --color-text-tertiary: #64748b;     /* 4.8:1 on white */
  --color-text-inverse: #f8fafc;      /* 15.3:1 on #0f172a */

  /* Background colors */
  --color-bg-primary: #ffffff;
  --color-bg-secondary: #f8fafc;
  --color-bg-tertiary: #f1f5f9;
}

/* ❌ BAD: Insufficient contrast — text is hard to read */
.bad-text {
  color: #94a3b8;      /* 2.8:1 on white — fails WCAG AA */
  background: #ffffff;
}

.good-text {
  color: var(--color-text-secondary); /* 7.0:1 on white — passes WCAG AA */
  background: var(--color-bg-primary);
}
```

### Pattern 2: Responsive Grid Layout

```css
/* ✅ GOOD: Fluid responsive grid with consistent spacing */

.layout-grid {
  --grid-gap: 1.5rem;
  --content-max-width: 1200px;
  --side-padding: 1rem;

  display: grid;
  grid-template-columns:
    minmax(var(--side-padding), 1fr)
    minmax(0, var(--content-max-width))
    minmax(var(--side-padding), 1fr);
  gap: var(--grid-gap);
}

.layout-grid > * {
  grid-column: 2;
}

.layout-grid > .full-width {
  grid-column: 1 / -1;
}

/* Card grid: auto-fill responsive cards */
.card-grid {
  display: grid;
  grid-template-columns: repeat(
    auto-fill,
    minmax(min(280px, 100%), 1fr)
  );
  gap: 1.5rem;
}

/* Touch target sizing */
.interactive-element {
  min-height: 44px;
  min-width: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

/* Space between adjacent touch targets */
.toolbar {
  display: flex;
  gap: 0.5rem; /* 8px minimum gap between adjacent targets */
}
```

```html
<!-- ❌ BAD: No visible label on icon-only button -->
<button class="icon-button">
  <svg><!-- search icon --></svg>
</button>

<!-- ✅ GOOD: Accessible icon button with screen reader label -->
<button class="icon-button" aria-label="Search">
  <svg aria-hidden="true" focusable="false">
    <!-- search icon -->
  </svg>
</button>
```

### Pattern 3: Form Design with Validation

```tsx
import { useState, type ChangeEvent, type FormEvent } from "react";

interface FormFieldProps {
  label: string;
  name: string;
  type?: "text" | "email" | "password";
  required?: boolean;
  error?: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}

function FormField({
  label,
  name,
  type = "text",
  required = false,
  error,
  value,
  onChange,
}: FormFieldProps) {
  const errorId = `${name}-error`;
  const descriptionId = error ? errorId : undefined;

  return (
    <div className="form-field">
      <label htmlFor={name} className="form-field__label">
        {label}
        {required && <span aria-hidden="true" className="required-mark"> *</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={descriptionId}
        className={`form-field__input ${error ? "form-field__input--error" : ""}`}
      />
      {error && (
        <p id={errorId} className="form-field__error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

// Usage
function SignupForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!email.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }
    setError("");
    // Submit form...
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <FormField
        label="Email Address"
        name="email"
        type="email"
        required
        error={error}
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />
      <button type="submit">Sign Up</button>
    </form>
  );
}
```

---

## Constraints

### MUST DO
- Meet WCAG 2.1 AA minimum contrast: 4.5:1 for normal text, 3:1 for large text (18px+ bold or 24px+ regular) and UI component boundaries
- Provide visible focus indicators on all interactive elements using `:focus-visible` — never set `outline: none` without a replacement
- Support full keyboard-only navigation — every interactive element must be reachable and operable with Tab, Enter, Space, and Arrow keys
- Provide clear error messages for form validation that describe what went wrong and how to fix it
- Design mobile-first with progressive enhancement — test at 320px minimum viewport width
- Use semantic HTML elements (`<nav>`, `<main>`, `<article>`, `<button>`, `<a>`) over generic `<div>` and `<span>` with ARIA roles

### MUST NOT DO
- Convey information using color alone — always pair color indicators with text labels, icons, or patterns
- Disable zoom or pinch-to-zoom — respect user viewport preferences with `viewport` meta tag
- Use `aria-hidden="true"` on focusable elements — hidden elements must not be interactive
- Remove focus outlines without providing an alternative visible focus indicator
- Use placeholder text as a substitute for visible labels on form inputs
- Design dismissable toast notifications that disappear before a screen reader can announce them
- Use generic alt text like "image" or "photo" — describe the content and function of each image

---

## Related Skills

| Skill | Purpose |
|---|---|
| `css-architecture` | Organizing and structuring CSS for maintainable design systems |
| `design-systems` | Building and maintaining design system component libraries |
| `frontend-philosophy` | Visual design principles for distinctive, intentional UI |
| `react-view-transitions` | Implementing smooth page transitions with the View Transition API |

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [WCAG 2.1 Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [MDN: CSS Grid Layout](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Grid_Layout)
- [Inclusive Components](https://inclusive-components.design/)
- [A11y Project Checklist](https://www.a11yproject.com/checklist/)
- [Google Material Design Accessibility](https://material.io/design/usability/accessibility.html)
- [Smashing Magazine: Form Design Patterns](https://www.smashingmagazine.com/printed-books/form-design-patterns/)
