---




name: css-nesting
description: Implements modern CSS native nesting patterns with & parent selector for organizing component styles, managing specificity, and writing maintainable scoped CSS without preprocessors.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: css nesting, ampersand selector, & parent selector, native css nesting, postcss-nesting, component styles, scoped css
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: css-architecture, bem-naming, css-variables, css-specificity
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





# CSS Native Nesting with & Parent Selector

Implements modern CSS native nesting patterns using the `&` parent selector to organize component styles, manage specificity, and write maintainable scoped CSS without relying on preprocessors like SCSS or Sass. When loaded, this skill makes the model produce correct native CSS nesting syntax — explicitly referencing `&` as the parent selector qualifier, limiting depth, controlling specificity with `:where()`, and correctly placing at-rules inside rule blocks for proper scoping.

## TL;DR Checklist

- [ ] Use `&` explicitly at the start of every nested compound selector — parent is NOT implicit in native CSS (unlike SCSS)
- [ ] Limit nesting depth to 2–3 levels maximum to control specificity and readability
- [ ] Prefer `:where()` for lower-specificity nested rules that should be easily overridable
- [ ] Place `@media` and `@supports` inside rule blocks, not at the top level of a nested block
- [ ] Verify browser compatibility with PostCSS `postcss-nesting` polyfill if targeting older browsers

---

## When to Use

Use this skill when:

- Organizing component styles where child selectors logically belong under their parent (buttons, cards, navbars, modals)
- Writing utility classes or design system tokens that follow BEM-like naming with `&__block` and `&--modifier` conventions
- Applying responsive overrides (`@media`) or feature checks (`@supports`) to specific components without repeating selectors at the stylesheet root
- Building scoped component styles in CSS modules, Lit web components, or shadow DOM contexts where style encapsulation matters
- Refactoring flat preprocessor-based stylesheets into native nesting for better performance and fewer build dependencies

## When NOT to Use

Avoid this skill for:

- Flat utility classes that don't share a parent relationship (e.g., `.mt-4`, `.text-center` — these should remain at the root level)
- When nesting would exceed 3 levels deep — extract intermediate class names instead of continuing to nest
- For global layout styles that span multiple unrelated components — use BEM, CSS modules, or scoped approaches instead

---

## Core Workflow

1. **Identify Component Style Groups** — Group selectors that share a logical parent. Each group starts with the component root selector and contains all its children, modifiers, and state variants.
   ```css
   /* ✅ Good: card styles grouped under a single .card root */
   .card {
     border-radius: 8px;
     box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
     overflow: hidden;
     background: var(--color-surface, #ffffff);
     transition: box-shadow 200ms ease;

     /* Child elements nested inside */
   }
   ```
   **Checkpoint:** Each nesting group should represent a single UI component or logical section — not an arbitrary collection of unrelated rules. If two selectors share no parent-child or modifier relationship, they belong in separate groups.

2. **Write Nested Selectors with Explicit `&`** — Reference the parent selector using `&` at the beginning of every compound selector. Unlike SCSS where the parent is implicit, native CSS requires `&` explicitly; omitting it creates a descendant selector instead of a nested rule.
   ```css
   .button {
     display: inline-flex;
     align-items: center;
     padding: 0.5rem 1rem;
     border-radius: 6px;
     font-weight: 500;
     cursor: pointer;
     transition: background-color 150ms ease, box-shadow 150ms ease;

     /* ✅ Correct — & references .button explicitly, compiles to .button.primary */
     &.primary {
       background: var(--color-primary, #3b82f6);
       color: white;
       border: none;

       &:hover {
         background: var(--color-primary-dark, #2563eb);
         box-shadow: 0 2px 12px rgba(0, 100, 255, 0.3);
       }

       &:focus-visible {
         outline: 2px solid var(--color-primary, #3b82f6);
         outline-offset: 2px;
       }
     }

     /* ✅ Correct — pseudo-element nesting with explicit parent */
     &::before {
       content: '';
       display: inline-block;
       margin-right: 8px;
     }

     /* ❌ WRONG intent in native CSS — this is a DESCENDANT selector, not nested compound */
     .icon { color: inherit; }        /* Compiles to .button .icon — may be OK but intent is unclear */

     /* ✅ CLEARER — explicit parent reference removes ambiguity */
     & > .icon { color: inherit; }   /* Explicitly compiles to .button > .icon */
   }
   ```
   **Checkpoint:** Every nested selector starting with `&` must produce the intended compound selector. Verify that `.button &--active` compiles to `.button--active`, NOT `.button .button--active`. The `&` replaces the parent entirely in the compiled output.

3. **Apply @media and @supports Nesting** — Place at-rules inside component rule blocks rather than extracting them to separate rulesets at the stylesheet root. This keeps responsive and feature-specific overrides colocated with their component definitions, improving maintainability.
   ```css
   .modal {
     position: fixed;
     inset: 0;
     display: none;           /* hidden by default */
     z-index: 1000;
     background: rgba(0, 0, 0, 0.5);

     &.is-open {
       display: flex;
       align-items: center;
       justify-content: center;
     }

     /* ✅ Nested @media — scoped to .modal context only */
     @media (max-width: 768px) {
       inset: auto;
       bottom: 0;
       left: 0;
       right: 0;
       height: 80vh;
       border-radius: 12px 12px 0 0;

       /* ✅ Nested rule inside @media — still scoped to .modal */
       &.is-open {
         display: flex;       /* compiles to .modal.is-open within the media query */
       }
     }

     /* ✅ Nested @supports for progressive enhancement */
     @supports (backdrop-filter: blur(10px)) {
       background: rgba(0, 0, 0, 0.4);
       backdrop-filter: blur(4px);
       -webkit-backdrop-filter: blur(4px);    /* Safari fallback */
     }

     /* ✅ Nested @container for container query support */
     @supports (container-type: inline-size) {
       container-type: inline-size;
       container-name: modal-container;

       @container modal-container (max-width: 400px) {
         padding: 1rem;
       }
     }
   }
   ```
   **Checkpoint:** At-rules nested inside rule blocks are scoped to that parent — `@media` rules inside `.modal {}` only apply to `.modal` and its descendants, not globally. The compiled output places the media query around the full selector compound.

4. **Control Specificity with :where()** — When using nesting inside media queries or for modifier overrides, wrap selectors in `:where()` to lower their specificity from 0-2-1 (or higher) down to 0-0-0, making them easier to override later without `!important`.
   ```css
   .nav {
     display: flex;
     gap: 1rem;
     list-style: none;
     margin: 0;
     padding: 0;

     /* ✅ High specificity (default) — base link styles */
     & a {
       color: inherit;
       text-decoration: none;
       padding: 0.5rem 0.75rem;
       border-radius: 4px;
       transition: background-color 150ms ease;

       &:hover {
         background: rgba(99, 102, 241, 0.08);
       }
     }

     /* ✅ Low specificity via :where() — easy to override later */
     &:where(.is-active) a {
       color: var(--color-primary, #3b82f6);
       font-weight: 600;
       background: rgba(99, 102, 241, 0.08);
     }

     /* ✅ :where() with multiple conditions — specificity stays minimal */
     &:where(:hover, :focus-within) {
       background: var(--color-surface-elevated, #f8fafc);
     }
   }

   /* Downstream override — easy because :where() gave low base specificity */
   .nav .custom-active a {
     color: var(--color-accent, #f59e0b);    /* This wins with 0-2-0 vs 0-0-0 */
   }
   ```

---

## Implementation Patterns

### Pattern 1: Component Styles with BEM-like Naming and CSS Variables

```css
/* ✅ Card component — BEM-like naming with native CSS nesting */
.card {
  border-radius: var(--radius-lg, 12px);
  background: var(--color-surface, #ffffff);
  box-shadow: var(--shadow-md, 0 4px 12px rgba(0, 0, 0, 0.08));
  overflow: hidden;
  transition: box-shadow 200ms ease, transform 200ms ease;

  &:hover {
    box-shadow: var(--shadow-lg, 0 8px 24px rgba(0, 0, 0, 0.12));
    transform: translateY(-2px);
  }

  /* BEM block elements — &__ prefix compiles to .card__header etc. */
  &__header {
    padding: var(--space-lg, 1.5rem);
    background: var(--color-surface-elevated, #f8f9fa);
    border-bottom: 1px solid var(--color-border, #e2e8f0);

    & h2 {
      margin: 0;
      font-size: var(--font-size-xl, 1.5rem);
      font-weight: 600;
      color: var(--color-text-primary, #1a1a2e);
    }

    & p {
      margin: 0.25rem 0 0;
      color: var(--color-text-secondary, #64748b);
      font-size: 0.875rem;
    }
  }

  &__body {
    padding: var(--space-lg, 1.5rem);
    line-height: var(--line-height-relaxed, 1.6);
    color: var(--color-text-secondary, #4a4a68);

    /* Nested paragraphs with spacing */
    & p + p {
      margin-top: 1rem;
    }

    & img {
      max-width: 100%;
      border-radius: var(--radius-md, 8px);
      margin: 1rem 0;
    }
  }

  &__footer {
    padding: var(--space-md, 1rem) var(--space-lg, 1.5rem);
    background: var(--color-surface-elevated, #f8f9fa);
    border-top: 1px solid var(--color-border, #e2e8f0);

    /* Nested actions row */
    & .actions {
      display: flex;
      gap: var(--space-sm, 0.5rem);
      justify-content: flex-end;

      & button {
        padding: 0.4rem 1rem;
        border-radius: 6px;
        font-size: 0.875rem;
        cursor: pointer;
        border: 1px solid var(--color-border, #e2e8f0);
        background: transparent;
        transition: all 150ms ease;

        &:hover {
          background: var(--color-surface-elevated, #f1f5f9);
          border-color: var(--color-primary, #3b82f6);
        }
      }
    }
  }

  /* Modifier variants — &-- prefix compiles to .card--compact etc. */
  &--compact {
    --card-padding: var(--space-sm, 0.75rem);

    &__header,
    &__body,
    &__footer {
      padding: var(--card-padding);
    }
  }

  &--elevated {
    box-shadow: var(--shadow-xl, 0 12px 32px rgba(0, 0, 0, 0.15));

    &:hover {
      transform: translateY(-4px);
    }
  }

  &--borderless {
    border: none;
    box-shadow: none;

    &__header {
      border-bottom: none;
    }

    &__footer {
      border-top: none;
    }
  }
}
```

### Pattern 2: Multi-Level Responsive Nesting (BAD vs GOOD)

```css
/* ❌ BAD — Deep nesting creates specificity nightmares and unreadable selectors */
.sidebar {
  display: flex;
  flex-direction: column;

  & .nav-item {
    padding: 8px 16px;

    &:hover,
    &[aria-expanded="true"] {
      background: #e0e7ff;

      /* 3 levels deep — specificity is now .sidebar .nav-item:hover */
      & .sub-menu {
        display: block;

        /* 4 levels deep — terrible specificity and maintainability */
        & li {
          list-style: none;

          & a {
            color: inherit;     /* .sidebar .nav-item:hover .sub-menu li a */
            text-decoration: none;
          }
        }
      }
    }
  }
}

/* ✅ GOOD — Limit to 2 levels, use descriptive class names for deeper structures */
.sidebar {
  display: flex;
  flex-direction: column;

  /* First level: direct children only */
  & .nav-item {
    padding: 8px 16px;
    cursor: pointer;
    border-radius: 6px;
    transition: background-color 150ms ease;

    &:hover,
    &[aria-expanded="true"] {
      background: #e0e7ff;
    }
  }

  /* Second level only — extracted for readability at same nesting depth */
  & .sub-menu {
    list-style: none;
    padding-left: 24px;
    margin-top: 4px;
    display: none;           /* hidden by default, shown via :has() on parent */

    &:has(> .nav-item[aria-expanded="true"]) {
      display: block;
    }

    & li a {
      color: inherit;
      text-decoration: none;
      padding: 6px 12px;
      display: block;
      border-radius: 4px;
      transition: background-color 150ms ease;

      &:hover {
        background: rgba(99, 102, 241, 0.08);
      }
    }
  }
}
```

### Pattern 3: Utility-Style Selectors with Selector Lists and :where()

```css
/* ✅ Good: selector list nesting for grouped heading styles */
.heading-group {
  /* Group all heading variants under one parent */
  & h1,
  & h2,
  & h3,
  & h4 {
    margin-top: 0;
    margin-bottom: var(--space-md, 1rem);
    font-weight: 600;
    line-height: 1.25;
    color: var(--color-text-primary, #1a1a2e);

    & .badge {
      font-size: 0.7em;
      vertical-align: middle;
      margin-left: 0.5rem;
      padding: 0.15em 0.5em;
      border-radius: var(--radius-sm, 4px);
      background: var(--color-primary-light, #dbeafe);
      color: var(--color-primary, #2563eb);
    }
  }

  /* Level-specific sizing overrides */
  & h1 {
    font-size: clamp(2rem, 4vw, 3rem);
    letter-spacing: -0.02em;
  }

  & h2 {
    font-size: clamp(1.5rem, 3vw, 2rem);
  }

  & h3 {
    font-size: clamp(1.25rem, 2vw, 1.5rem);
  }

  & h4 {
    font-size: var(--font-size-lg, 1.125rem);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  /* Responsive adjustments — nested @media scoped to heading-group */
  @media (max-width: 640px) {
    & h1,
    & h2 {
      margin-bottom: var(--space-sm, 0.75rem);
    }

    & h1 {
      font-size: clamp(1.75rem, 6vw, 2.5rem);
    }

    & h2 {
      font-size: clamp(1.25rem, 5vw, 1.75rem);
    }
  }
}
```

### Pattern 4: Component State and Pseudo-Element Nesting

```css
/* ✅ Checkbox with custom styling using nested pseudo-elements */
.checkbox {
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm, 0.5rem);
  cursor: pointer;
  font-size: 0.875rem;
  color: var(--color-text-primary, #1a1a2e);

  /* Hidden native input */
  & input[type="checkbox"] {
    position: absolute;
    opacity: 0;
    width: 0;
    height: 0;
  }

  /* Custom checkbox box */
  & .checkmark {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.25rem;
    height: 1.25rem;
    border: 2px solid var(--color-border, #cbd5e1);
    border-radius: var(--radius-sm, 4px);
    transition: all 150ms ease;

    /* Check icon via ::after */
    &::after {
      content: '';
      width: 6px;
      height: 12px;
      border: solid white;
      border-width: 0 2px 2px 0;
      transform: rotate(45deg) scale(0);
      transition: transform 150ms ease;
    }

    /* Checked state — & input is checked */
    &:has(> input[type="checkbox"]:checked) {
      background: var(--color-primary, #3b82f6);
      border-color: var(--color-primary, #3b82f6);

      &::after {
        transform: rotate(45deg) scale(1);
      }
    }

    /* Focus ring */
    &:has(> input[type="checkbox"]:focus-visible) {
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
    }

    /* Disabled state */
    &:has(> input[type="checkbox"]:disabled) {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }
}
```

---

## Constraints

### MUST DO
- Always use explicit `&` at the start of nested compound selectors — do NOT rely on implicit parent nesting (that is SCSS-only behavior)
- Limit nesting depth to 2–3 levels maximum — deeper nesting hurts readability, increases specificity, and creates maintenance burden for other developers
- Prefer `:where()` for modifier overrides that should be easily overridable by downstream consumers or utility classes
- Validate compiled output using browser DevTools Sources panel or PostCSS CLI to confirm selector compilation matches your intent
- Use CSS custom properties (`var(--name, fallback)`) within nested rules to enable theme customization

### MUST NOT DO
- Nest at-rules (`@media`, `@supports`) at the top level of a stylesheet expecting them to apply to the current block — native CSS nesting requires at-rules inside rule blocks for proper scoping
- Use empty nested rules (`& {}` or `.child {}` with no properties) — these are removed from output but confuse readers about authoring intent
- Rely on `:has()` in production without considering fallbacks — while widely supported in 2025/2026, some enterprise browsers still lack it
- Mix native CSS nesting syntax with SCSS preprocessors in the same file — they have different rules for `&` behavior, variable interpolation (`#{}` vs `var()`), and control directives

---

## Common Pitfalls

### Missing & Creates Descendant Selectors (Not Nesting)

```css
/* ❌ BAD — No & means this is a DESCENDANT selector, not nested compound */
.card {
  color: blue;

  /* This compiles to .card .title, NOT .card__title or .card-title */
  /* The author's intent was ambiguous — did they mean "child of card" or "BEM modifier"? */
  .title {
    font-weight: bold;
  }
}

/* ✅ GOOD — Explicit parent reference removes all ambiguity */
.card {
  color: blue;

  & > .title,
  & .title {       /* Explicitly compiles to .card .title (descendant) */
    font-weight: bold;
  }

  &__title {        /* Compiles to .card__title (BEM block-element pattern) */
    font-weight: bold;
  }

  &--featured .title {   /* Compiles to .card--featured .title */
    font-weight: 700;
  }
}
```

### Empty Rules and Over-Nesting Confusion

```css
/* ❌ BAD — Empty nested rules do nothing but confuse readers about intent */
.card {
  & {}              /* This rule is removed from output entirely — wasted tokens */

  &__inner {        /* 3 levels of nesting: .card__inner */
    & {}            /* Also removed — pointless empty nesting at every level */
  }
}

/* ✅ GOOD — Only nest when there are actual styles to apply */
.card {
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

  &__title {
    font-size: 1.25rem;
    margin-bottom: 0.5rem;
  }

  &__body {
    line-height: 1.6;
    color: var(--color-text-secondary, #4a4a68);
  }

  &--featured {
    border-left: 4px solid var(--color-primary, #3b82f6);
  }
}
```

### Differences from SCSS Parent Selector Behavior

| Feature | Native CSS `&` | SCSS/Sass `&` |
|---------|---------------|---------------|
| Parent reference required | **Always** use `&` at start of compound selector | Optional — parent is implicit if you just write the child selector |
| Variable interpolation | ❌ No `#{}` syntax — use `var(--name, fallback)` instead | ✅ Yes — `#{$variable}` interpolates into CSS output |
| `:has()` support | ✅ Full native support in modern browsers | ✅ Supported (it's a CSS feature, not SCSS-specific) |
| Control directives | ❌ No `@if`, `@each`, `@for` available | ✅ Yes — full programmatic control flow |
| `@at-root` escape | ❌ Not available — can't escape nesting at root | ✅ Yes — `& @at-root .outside {}` escapes to stylesheet root |
| `&` in middle of selector | Only valid at start of compound selector | Can appear anywhere: `.a & .b` compiles correctly |

---

## Output Template

When implementing CSS native nesting, produce:

1. **Component root selector** — The top-level class with shared base styles, including CSS variable definitions
2. **First-level nested selectors** — Direct children with explicit `&` prefix (BEM blocks, state variants, pseudo-elements)
3. **At-rule blocks** — `@media` and `@supports` scoped inside the component rule block at appropriate nesting levels
4. **Compiled output verification** — Show the expected compiled CSS selector for each nested rule in comments (e.g., `/* compiles to .card__header */`)
5. **Specificity analysis** — Note the cascade specificity of key selectors, especially those using `:where()` vs default nesting

---

## Live References

> Authoritative documentation for CSS native nesting and browser compatibility.

- [MDN — CSS Nesting](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_nested_media_queries)
- [W3C — CSS Nesting Module Level 1 (Draft)](https://drafts.csswg.org/css-nesting/)
- [Can I Use — CSS Nesting Browser Support (2025/2026)](https://caniuse.com/css-nesting)
- [PostCSS Nesting Plugin](https://github.com/csstools/postcss-plugins/tree/main/plugins/postcss-nesting)
- [CSS-Tricks — Native CSS Nesting: A Complete Guide](https://css-tricks.com/native-css-nesting-is-here-and-you-need-to-know-about-it/)
- [Google Web Dev — CSS Nesting: The Good Parts](https://web.dev/articles/css-nesting)
