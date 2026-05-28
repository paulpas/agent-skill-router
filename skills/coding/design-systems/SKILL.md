---
name: design-systems
description: Implements production design systems with design token architecture,
  component theming, accessibility standards, documentation patterns, and cross-platform
  consistency for scalable UI ecosystems.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: design system, design tokens, theming, accessibility, a11y, component
    library, UI kit, design language, style guide, token architecture, cross-platform
    consistency
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
  related-skills: component-architecture, api-design, engineering-principles
------
# Design Systems Architecture

Implements production-grade design systems that provide a unified visual language across web, mobile, and desktop platforms. This skill makes the model architect design token hierarchies, build accessible component libraries with theming support, and enforce cross-platform consistency through typed token adapters.

## TL;DR Checklist

- [ ] Organize tokens into primitive (atomic) → semantic (role-based) → alias (component-specific) layers
- [ ] Type all tokens with TypeScript interfaces — never ship untyped design values
- [ ] Map semantic tokens to CSS custom properties for runtime theme switching
- [ ] Verify all color pairs meet WCAG 2.2 AA contrast ratios (4.5:1 text, 3:1 large text)
- [ ] Include focus-visible styles and skip-nav patterns in every component
- [ ] Support prefers-reduced-motion and reduced-transparency for platform accessibility
- [ ] Use a single token source mapped to platform-specific adapters (web → CSS vars, RN → JS objects)
- [ ] Document components with prop tables, usage guidelines, and explicit do/don't examples

---

## When to Use

Use this skill when:

- Starting a new design system or redesigning an existing one from scratch
- Unifying visual consistency across multiple platforms (web + mobile + desktop)
- Implementing dark mode, brand theming, or user-selectable themes at runtime
- Building a component library consumed by multiple applications
- Auditing an existing UI for accessibility compliance and token architecture quality
- Establishing design token governance rules for a multi-team organization

---

## When NOT to Use

Avoid this skill for:

- Single-page apps with no theming or multi-platform needs — use simple CSS variables instead
- One-off landing pages where design system overhead outweighs benefits
- Backend API architecture — use `api-design` for server-side concerns
- Low-level component composition patterns (compound components, render props) — use `component-architecture`
- General software engineering principles (SOLID, DRY) — use `engineering-principles`

---

## Core Workflow

1. **Audit Existing Design** — Inventory current colors, typography, spacing, and motion values. Identify duplicates, inconsistencies, and hardcoded magic numbers.
   **Checkpoint:** Every visual value should be traceable to a single token source. If two files define the same color differently, that is a design debt item.

2. **Define Primitive Tokens** — Create the atomic layer: base colors (hex/rgb), spacing scale (px or rem multiples), font sizes and families, border radius values, z-index tiers, motion duration/duration-easing pairs.
   **Checkpoint:** Primitives must be platform-agnostic. Do not include `px` in token names; resolve units at the adapter layer.

3. **Define Semantic Tokens** — Build the role-based layer that maps primitives to UI concepts: `color.background.primary`, `color.text.heading`, `spacing.padding.container`, `radius.rounded.small`.
   **Checkpoint:** Each semantic token must resolve to exactly one primitive path. No direct hex values at this level — always reference another token.

4. **Define Alias Tokens** — Create component-specific tokens that alias semantically: `button.background.primary`, `card.border.radius`, `input.focus.ring.color`. These allow per-component overrides without breaking the hierarchy.
   **Checkpoint:** Alias tokens are the only place where a component can intentionally diverge from semantic defaults. Document why in the token metadata.

5. **Map Tokens to Runtime** — Generate platform-specific representations:
   - Web → CSS custom properties injected into `:root` and theme selectors
   - React Native → JS constant objects consumed by style props
   - Electron/Tauri → Same as web via IPC or embedded stylesheets
   **Checkpoint:** The token schema must be serializable to JSON. All platforms derive from the same source of truth.

6. **Build Accessible Component Wrappers** — Implement components that consume tokens through a theme provider, enforce focus-visible states, manage keyboard navigation, and expose screen-reader-friendly semantics.
   **Checkpoint:** Run automated contrast checks on all token-based color pairs before releasing a component.

7. **Document with Living Examples** — Create component stories showing prop variations, usage guidelines with do/don't code examples, and explicit accessibility notes per component.

---

## Implementation Patterns

### Pattern 1: Design Token Architecture (Primitive → Semantic → Alias Layers)

Tokens are organized in three layers. Each layer references the one below it. No layer contains hardcoded magic values.

```typescript
// src/design-system/tokens/primitives.ts
export interface PrimitiveTokens {
  color: {
    brand: Record<string, string>;       // primary, secondary, tertiary
    neutral: Record<string, string>;      // 0 (white) → 1000 (black)
    status: Record<'success' | 'warning' | 'error' | 'info', string>;
    semantic: {
      bg: Record<string, string>;         // surface, overlay, backdrop
      text: Record<string, string>;       // primary, secondary, inverse
      border: Record<string, string>;     // default, strong, subtle
    };
  };
  spacing: Record<string, number>;        // 4px base unit multipliers
  typography: {
    fontFamily: Record<string, string>;
    fontSize: Record<string, number>;     // px values — resolved by adapter
    fontWeight: Record<'light' | 'regular' | 'medium' | 'bold', number>;
    lineHeight: Record<string, number>;
  };
  radius: Record<string, number>;         // border-radius in px
  zIndices: Record<'dropdown' | 'sticky' | 'modal' | 'tooltip', number>;
  motion: {
    duration: Record<'instant' | 'fast' | 'normal' | 'slow', string>;
    easing: Record<'ease' | 'ease-in-out' | 'smooth', string>;
  };
}

// src/design-system/tokens/semantic.ts
export interface SemanticTokens extends Partial<PrimitiveTokens> {
  color: {
    background: {
      primary: string;                    // token path → primitives.color.neutral.0
      secondary: string;                  // token path → primitives.color.neutral.50
      elevated: string;                   // token path → primitives.color.neutral.10
    };
    text: {
      primary: string;                    // → primitives.color.semantic.text.primary
      secondary: string;                  // → primitives.color.semantic.text.secondary
      disabled: string;                   // → primitives.color.semantic.text.tertiary
      inverse: string;                    // → primitives.color.neutral.0
    };
    interactive: {
      primary: string;                    // → primitives.color.brand.primary
      hover: string;                      // derived from brand with alpha
      active: string;                       // derived from brand with darker shade
      focusRing: string;                  // → primitives.color.brand.primary (50% opacity)
    };
  };
  spacing: {
    xs: string;                           // → primitives.spacing.1 (4px)
    sm: string;                           // → primitives.spacing.2 (8px)
    md: string;                           // → primitives.spacing.4 (16px)
    lg: string;                           // → primitives.spacing.8 (32px)
    xl: string;                           // → primitives.spacing.12 (48px)
  };
  typography: {
    heading: {
      size: string;                       // → primitives.typography.fontSize.xl
      weight: string;                     // → primitives.typography.fontWeight.bold
      lineHeight: string;                 // → primitives.typography.lineHeight.tight
    };
    body: {
      size: string;                       // → primitives.typography.fontSize.md
      weight: string;                     // → primitives.typography.fontWeight.regular
      lineHeight: string;                 // → primitives.typography.lineHeight.relaxed
    };
  };
}

// src/design-system/tokens/aliases.ts — Component-level token aliases
export interface AliasTokens {
  button: {
    background: string;                   // → semantic.color.interactive.primary
    backgroundHover: string;
    backgroundDisabled: string;
    color: string;                        // → semantic.color.text.inverse
    paddingX: string;                     // → semantic.spacing.md
    paddingY: string;                     // → semantic.spacing.sm
    borderRadius: string;                 // → primitives.radius.rounded
  };
  card: {
    background: string;                   // → semantic.color.background.elevated
    borderColor: string;                  // → semantic.color.border.subtle
    borderRadius: string;                 // → primitives.radius.lg
    shadow: string;                       // defined as CSS box-shadow token
  };
  input: {
    background: string;                   // → semantic.color.background.primary
    borderColor: string;                  // → semantic.color.border.default
    focusBorderColor: string;             // → semantic.color.interactive.focusRing
    errorBorderColor: string;             // → semantic.color.status.error
    placeholderColor: string;             // → semantic.color.text.secondary
  };
}
```

### Pattern 2: CSS Custom Properties Theming System

Tokens are exposed as CSS custom properties. A theme class on a parent element overrides the property values, enabling runtime switching without JS re-renders of every component.

```css
/* src/design-system/styles/tokens.css */

/* Base theme (light) — defines all custom properties from tokens */
:root {
  /* Primitive tokens as CSS custom properties */
  --ds-color-brand-primary: #2563eb;
  --ds-color-brand-secondary: #7c3aed;
  --ds-color-neutral-0: #ffffff;
  --ds-color-neutral-100: #f8fafc;
  --ds-color-neutral-200: #e2e8f0;
  --ds-color-neutral-600: #475569;
  --ds-color-neutral-900: #0f172a;

  /* Spacing — in rem for fluid scaling */
  --ds-spacing-xs: 0.25rem;   /* 4px */
  --ds-spacing-sm: 0.5rem;    /* 8px */
  --ds-spacing-md: 1rem;      /* 16px */
  --ds-spacing-lg: 2rem;      /* 32px */

  /* Typography */
  --ds-font-family-sans: 'Inter', system-ui, -apple-system, sans-serif;
  --ds-font-size-xs: 0.75rem;
  --ds-font-size-sm: 0.875rem;
  --ds-font-size-base: 1rem;
  --ds-font-size-lg: 1.125rem;
  --ds-font-size-xl: 1.25rem;
  --ds-font-weight-regular: 400;
  --ds-font-weight-bold: 700;

  /* Semantic layer — references primitives by name */
  --ds-color-bg-primary: var(--ds-color-neutral-0);
  --ds-color-bg-elevated: var(--ds-color-neutral-100);
  --ds-color-text-primary: var(--ds-color-neutral-900);
  --ds-color-text-secondary: var(--ds-color-neutral-600);
  --ds-color-border-default: var(--ds-color-neutral-200);

  /* Alias tokens — component-level overrides */
  --ds-button-bg: var(--ds-color-brand-primary);
  --ds-button-bg-hover: color-mix(in srgb, var(--ds-color-brand-primary) 85%, black);
  --ds-button-color: var(--ds-color-neutral-0);
}

/* Dark theme — only override what changes */
[data-theme="dark"] {
  --ds-color-neutral-0: #0f172a;
  --ds-color-neutral-100: #1e293b;
  --ds-color-neutral-600: #94a3b8;
  --ds-color-neutral-900: #f8fafc;

  --ds-color-bg-primary: var(--ds-color-neutral-0);
  --ds-color-bg-elevated: var(--ds-color-neutral-100);
  --ds-color-text-primary: var(--ds-color-neutral-900);
  --ds-color-text-secondary: var(--ds-color-neutral-600);

  --ds-button-bg-hover: color-mix(in srgb, var(--ds-color-brand-primary) 85%, white);
}

/* High-contrast theme for accessibility — meets WCAG AAA */
[data-theme="high-contrast"] {
  --ds-color-text-primary: #000000;
  --ds-color-bg-primary: #ffffff;
  --ds-color-border-default: #000000;
  --ds-spacing-focus-ring: 3px;
}

/* Reduced motion — disables all non-essential animations */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

### Pattern 3: React Theme Provider with Typed Token Consumption

A React context provides the token map. Components consume tokens via a typed hook, ensuring type safety and tree-shakeability.

```typescript
// src/design-system/theme/ThemeContext.tsx
import { createContext, useContext, useCallback } from 'react';
import type { SemanticTokens, AliasTokens } from '../tokens/types';

export interface ThemeState {
  tokens: SemanticTokens;
  aliases: AliasTokens;
  direction: 'ltr' | 'rtl';
}

// The context carries the full token map — never raw hex values
const ThemeContext = createContext<ThemeState | null>(null);

interface ThemeProviderProps {
  children: React.ReactNode;
  tokens: SemanticTokens;
  aliases: AliasTokens;
  direction?: 'ltr' | 'rtl';
}

export function ThemeProvider({
  children,
  tokens,
  aliases,
  direction = 'ltr',
}: ThemeProviderProps): React.ReactElement {
  const state = useMemo(
    () => ({ tokens, aliases, direction }),
    [tokens, aliases, direction],
  );

  return (
    <ThemeContext.Provider value={state}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeState {
  const context = useContext(ThemeContext);

  if (context === null) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }

  return context;
}

// Typed accessors for alias tokens — prevents direct primitive consumption in components
export function useToken<K extends keyof AliasTokens>(
  category: K,
): Required<AliasTokens[K]> {
  const { aliases } = useTheme();
  return aliases[category] as Required<AliasTokens[K]>;
}

// Generic hook for semantic token access with CSS variable generation
export function useCSSVariable(tokenPath: string): string {
  const { tokens } = useTheme();
  // Resolve the token path to a CSS custom property name
  return `var(--ds-${tokenPath.replace(/\./g, '-')})`;
}
```

```tsx
// src/design-system/components/Button.tsx — Example component consuming tokens
import { useTheme, useToken } from '../theme/ThemeContext';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  className = '',
  ...props
}: ButtonProps): React.ReactElement {
  const { tokens } = useTheme();
  const buttonTokens = useToken('button');

  // Compute styles from tokens — never hardcode colors or spacing in component logic
  const paddingY = size === 'sm' ? tokens.spacing.sm : tokens.spacing.md;
  const paddingX = size === 'lg' ? tokens.spacing.lg : tokens.spacing.md;

  const baseStyles: React.CSSProperties = {
    fontFamily: tokens.typography.fontFamily.sans,
    fontWeight: tokens.typography.fontWeight.bold,
    fontSize: tokens.typography.fontSize.base,
    lineHeight: tokens.typography.lineHeight.normal,
    padding: `${paddingY} ${paddingX}`,
    borderRadius: buttonTokens.borderRadius,
    cursor: disabled ? 'not-allowed' : 'pointer',
    border: variant === 'ghost' ? 'none' : '1px solid transparent',
    transition: `background ${tokens.motion.duration.normal} ${tokens.motion.easing.smooth}`,

    // Focus management — visible focus ring for keyboard navigation
    ':focus-visible': {
      outline: '2px solid var(--ds-color-interactive-focusRing)',
      outlineOffset: '2px',
    },
  };

  const variantStyles: Record<ButtonProps['variant'], React.CSSProperties> = {
    primary: {
      background: buttonTokens.background,
      color: buttonTokens.color,
    },
    secondary: {
      background: tokens.color.background.secondary,
      color: tokens.color.text.primary,
      borderColor: tokens.color.border.default,
    },
    ghost: {
      background: 'transparent',
      color: tokens.color.text.primary,
    },
  };

  const disabledStyles: React.CSSProperties = disabled
    ? { opacity: 0.5, cursor: 'not-allowed' }
    : {};

  return (
    <button
      className={className}
      disabled={disabled}
      style={{ ...baseStyles, ...variantStyles[variant], ...disabledStyles }}
      {...props}
    >
      {children}
    </button>
  );
}
```

### Pattern 4: Accessibility Utility Functions

Accessibility is baked into the design system through utility functions that validate tokens and provide accessible component primitives.

```typescript
// src/design-system/a11y/contrast.ts — WCAG 2.2 AA contrast ratio checker

/**
 * Convert hex color to relative luminance per WCAG 2.2 specification.
 * Uses sRGB linearization before luminance calculation.
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const cleaned = hex.replace('#', '');

  if (cleaned.length === 3) {
    return {
      r: parseInt(cleaned[0] + cleaned[0], 16),
      g: parseInt(cleaned[1] + cleaned[1], 16),
      b: parseInt(cleaned[2] + cleaned[2], 16),
    };
  }

  if (cleaned.length !== 6) {
    throw new Error(`Invalid hex color: ${hex}`);
  }

  return {
    r: parseInt(cleaned.substring(0, 2), 16),
    g: parseInt(cleaned.substring(2, 4), 16),
    b: parseInt(cleaned.substring(4, 6), 16),
  };
}

/**
 * Calculate relative luminance per WCAG 2.2 formula.
 * Returns a value between 0 (black) and 1 (white).
 */
export function relativeLuminance({ r, g, b }: { r: number; g: number; b: number }): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const srgb = c / 255;
    return srgb <= 0.03928 ? srgb / 12.92 : Math.pow((srgb + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculate contrast ratio between two colors per WCAG 2.2.
 * Returns ratio as a number (e.g., 4.5 = meets AA for normal text).
 */
export function contrastRatio(color1: string, color2: string): number {
  const lum1 = relativeLuminance(hexToRgb(color1));
  const lum2 = relativeLuminance(hexToRgb(color2));
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Validate that a foreground/background color pair meets WCAG 2.2 AA.
 * Throws an error if the contrast ratio is insufficient.
 */
export function assertContrast(
  fg: string,
  bg: string,
  level: 'AA' | 'AAA' = 'AA',
  context?: string,
): void {
  const ratio = contrastRatio(fg, bg);
  const minRatio = level === 'AA' ? 4.5 : 7;

  if (ratio < minRatio) {
    const msg = `Contrast ratio ${ratio.toFixed(2)}:1 between "${fg}" and "${bg}" ` +
      `fails WCAG 2.2 ${level} (minimum ${minRatio}:1)`;
    throw new Error(context ? `${msg} (${context})` : msg);
  }
}

/**
 * Validate a complete theme's color pairs for accessibility compliance.
 */
export function validateThemeColors(semanticTokens: SemanticTokens): void {
  const checks: Array<{ fg: string; bg: string }> = [
    { fg: semanticTokens.color.text.primary,   bg: semanticTokens.color.background.primary },
    { fg: semanticTokens.color.text.secondary, bg: semanticTokens.color.background.primary },
    { fg: semanticTokens.color.interactive.primary, bg: semanticTokens.color.background.primary },
    { fg: semanticTokens.color.text.inverse,   bg: semanticTokens.color.interactive.primary },
  ];

  for (const { fg, bg } of checks) {
    assertContrast(fg, bg, 'AA', `color pair ${fg} / ${bg}`);
  }
}
```

```typescript
// src/design-system/a11y/focusTrap.ts — Focus management for modals and overlays

/**
 * Programmatically trap focus within a container element.
 * Used by modal, dialog, and drawer components to keep keyboard
 * navigation contained when the overlay is open.
 */
export class FocusTrap {
  private container: HTMLElement;
  private previousActiveElement: HTMLElement | null = null;
  private keydownHandler: (e: KeyboardEvent) => void;

  constructor(container: HTMLElement) {
    this.container = container;
    this.keydownHandler = this.handleKeydown.bind(this);
  }

  /** Activate the focus trap — call when overlay becomes visible */
  activate(): void {
    this.previousActiveElement = document.activeElement as HTMLElement;

    // Find the first focusable element to move focus into
    const focusable = this.getFocusableElements();
    if (focusable.length > 0) {
      focusable[0].focus();
    }

    document.addEventListener('keydown', this.keydownHandler);
  }

  /** Deactivate — call when overlay closes, restore previous focus */
  deactivate(): void {
    document.removeEventListener('keydown', this.keydownHandler);

    if (this.previousActiveElement instanceof HTMLElement) {
      this.previousActiveElement.focus();
    }
  }

  /** Tab key handler that cycles focus within the container */
  private handleKeydown(e: KeyboardEvent): void {
    if (e.key !== 'Tab') return;

    const focusable = this.getFocusableElements();
    if (focusable.length === 0) return;

    const firstElement = focusable[0];
    const lastElement = focusable[focusable.length - 1];

    if (e.shiftKey && document.activeElement === firstElement) {
      e.preventDefault();
      lastElement.focus();
    } else if (!e.shiftKey && document.activeElement === lastElement) {
      e.preventDefault();
      firstElement.focus();
    }
  }

  /** Query all focusable elements within the container */
  private getFocusableElements(): HTMLElement[] {
    const selectors = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(', ');

    return Array.from(this.container.querySelectorAll<HTMLElement>(selectors));
  }
}
```

### Pattern 5: Cross-Platform Token Adapter

The same token source maps to different runtime representations for each platform. This ensures one design language across all platforms.

```typescript
// src/design-system/adapters/web-token-adapter.ts — Web (CSS Custom Properties)

interface TokenMap {
  [cssVar: string]: string | number;
}

/**
 * Convert the token object into a flat CSS custom property map.
 * Dot paths become hyphenated CSS variables: "color.brand.primary" → "--ds-color-brand-primary"
 */
export function flattenToCSSVariables(
  tokens: Record<string, unknown>,
  prefix = '--ds',
): TokenMap {
  const result: TokenMap = {};

  function walk(obj: Record<string, unknown>, path: string[]): void {
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = [...path, key];

      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        walk(value as Record<string, unknown>, currentPath);
      } else {
        const cssVar = `${prefix}-${currentPath.join('-')}`;
        result[cssVar] = String(value);
      }
    }
  }

  walk(tokens, []);
  return result;
}

/**
 * Generate a CSS stylesheet string from the token map.
 * Supports injecting into multiple themes via data-theme attribute selectors.
 */
export function generateTokenStylesheet(
  tokens: TokenMap,
  themeName: string = 'light',
): string {
  const selector = themeName === 'light' ? ':root' : `[data-theme="${themeName}"]`;

  const declarations = Object.entries(tokens)
    .map(([key, value]) => `  ${key}: ${value};`)
    .join('\n');

  return `/* Generated design tokens — ${themeName} theme */
${selector} {
${declarations}
}`;
}
```

```typescript
// src/design-system/adapters/mobile-token-adapter.ts — React Native / JS platform

interface MobileTokenMap {
  [key: string]: string | number;
}

/**
 * Convert the token object into a JS object consumable by React Native style props.
 * Resolves CSS unit tokens (rem) to platform-specific values (dp for Android, pt for iOS).
 */
export function flattenToJSObject(
  tokens: Record<string, unknown>,
  pxMultiplier = 1, // Platform-specific conversion factor
): MobileTokenMap {
  const result: MobileTokenMap = {};

  function walk(obj: Record<string, unknown>, path: string[]): void {
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = [...path, key];
      const flatKey = currentPath.join('.');

      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        walk(value as Record<string, unknown>, currentPath);
      } else if (typeof value === 'number') {
        // Resolve spacing and sizing tokens to platform units
        result[flatKey] = value * pxMultiplier;
      } else {
        result[flatKey] = String(value);
      }
    }
  }

  walk(tokens, []);
  return result;
}

/**
 * Create a React Native theme object from tokens.
 * Returns an object ready to spread into style() calls.
 */
export function createNativeTheme(
  jsTokens: MobileTokenMap,
): {
  colors: Record<string, string>;
  spacing: Record<string, number>;
  typography: Record<string, string | number>;
} {
  const colors: Record<string, string> = {};
  const spacing: Record<string, number> = {};
  const typography: Record<string, string | number> = {};

  for (const [key, value] of Object.entries(jsTokens)) {
    if (key.startsWith('color.')) {
      colors[key.replace('color.', '')] = String(value);
    } else if (key.startsWith('spacing.')) {
      spacing[key.replace('spacing.', '')] = Number(value);
    } else if (key.startsWith('typography.')) {
      typography[key.replace('typography.', '')] = value;
    }
  }

  return { colors, spacing, typography };
}
```

---

## Constraints

### MUST DO
- Organize tokens in the three-layer hierarchy: primitive → semantic → alias. Never skip a layer.
- Type all tokens with TypeScript interfaces — untyped token values cause runtime inconsistencies.
- Map every semantic token to a CSS custom property for runtime theme switching without component re-renders.
- Validate contrast ratios for every color pair using `assertContrast` before releasing components.
- Include `:focus-visible` styles on all interactive elements — never rely on default browser outlines alone.
- Support `prefers-reduced-motion` by providing a CSS media query that disables non-essential transitions.
- Use a single token source of truth; generate platform-specific representations via adapters, never duplicate tokens per platform.
- Document every component with prop tables, usage examples, and explicit do/don't accessibility guidance.
- Use `data-theme` attributes on root elements for theme switching — do not rely on JavaScript-only state for visual appearance.

### MUST NOT DO
- Hardcode hex values inside components — they must always come from token consumption via the theme provider.
- Use CSS-in-JS solution-specific tokens (e.g., emotion/StyledComponents template literals) as the primary token delivery mechanism — CSS custom properties are the universal layer.
- Place hardcoded colors in `useTheme` return values — the hook returns token references, not resolved hex strings.
- Skip focus management on modals, dialogs, or drawers — always implement a `FocusTrap`.
- Use `outline: none` without providing an equivalent visible focus indicator.
- Define different token sets for each platform — all platforms derive from one source through adapters.
- Omit `prefers-reduced-motion` media query handling — it is not optional for accessibility compliance.
- Name tokens after visual appearance alone (e.g., `blueButtonBg`) — use functional names (`button.background.primary`).

---

## Output Template

When implementing or auditing a design system, produce:

1. **Token Hierarchy Map** — A structured listing of primitive → semantic → alias token paths with their resolved values and the platform representations generated.
2. **CSS Custom Property Sheet** — The complete `:root` and `[data-theme="dark"]` CSS variable declarations.
3. **Theme Provider Component** — Typed React context provider with hook accessors, including error handling for missing context.
4. **Accessibility Validation Report** — Contrast ratio results for all foreground/background pairs, focus management patterns used, and `prefers-reduced-motion` coverage.
5. **Platform Adapter Configurations** — Web CSS output, React Native JS object output, with platform-specific unit conversions documented.
6. **Component Story Examples** — At least one do/don't usage pair showing correct token consumption and accessibility attributes.

---

## Related Skills

| Skill                      | Purpose                                                        |
| -------------------------- | -------------------------------------------------------------- |
| `component-architecture`   | Compound components, headless UI patterns — how to structure the components your design system provides |
| `api-design`               | Backend API contract design — pairs with design system when building full-stack product interfaces |
| `engineering-principles`   | SOLID, DRY, separation of concerns — guides the architecture of the design system codebase itself |

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [USDS Design System (designsystem.digital.gov)](https://designsystem.digital.gov/)
- [Design Tokens — W3C Community Group](https://design-tokens.github.io/community-group/format/)
- [Storybook — Component Documentation Tool](https://storybook.js.org/)
- [Primer Design System (GitHub)](https://primer.style/design/)
- [Material Design — Components and Theming](https://m3.material.io/)
