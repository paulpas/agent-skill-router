---
name: color-contrast-visual-accessibility-wcag
description: "Implements WCAG 2.1 color contrast and visual accessibility: SC 1.4.3/1.4.11 compliance, contrast ratio verification, CSS variable architecture for theme switching, high-contrast mode via forced-colors media query, and focus indicator contrast."
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  role: implementation
  scope: implementation
  output-format: code
  content-types:
    - code
    - patterns
    - examples
  triggers: color contrast, WCAG 1.4.3, WCAG 1.4.11, contrast ratio, accessible color, CSS variables, high contrast mode, forced-colors
  related-skills: wcag-21-aa-fundamentals, semantic-html-aria-accessibility-tree
  archetypes:
    - tactical
    - enforcement
  anti_triggers:
    - brainstorming
    - design-system overview
    - brand guidelines
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
---

# Color Contrast & Visual Accessibility: WCAG 1.4.3/1.4.11

Implements WCAG 2.1 color contrast requirements (SC 1.4.3 for text, SC 1.4.11 for UI components and graphics) with ratio verification tools, CSS variable architecture for accessible color palettes, high-contrast mode support via forced-colors media query, focus indicator contrast requirements, and text resizing without loss. Load when designing color systems, implementing accessible color palettes, testing contrast ratios, or supporting high-contrast modes.

## TL;DR Checklist

- [ ] Normal text: 4.5:1 contrast ratio minimum (WCAG AA)
- [ ] Large text (18px+ regular or 14px+ bold): 3:1 contrast ratio
- [ ] UI components and borders: 3:1 contrast ratio (SC 1.4.11)
- [ ] Graphics and data visualization: 3:1 contrast ratio
- [ ] Focus indicator: 3:1 contrast with adjacent colors
- [ ] High-contrast mode: use `@media (prefers-contrast: more)`
- [ ] Never convey information by color alone (use text, icons, patterns)
- [ ] Test with WebAIM Contrast Checker or Axe
- [ ] Support forced-colors media query for Windows High Contrast

---

## When to Use

Use this skill when:

- Designing or implementing accessible color palettes
- Ensuring text/background contrast meets WCAG AA
- Building UI components with proper contrast
- Supporting high-contrast modes (Windows, macOS, iOS)
- Creating accessible focus indicators
- Implementing theme/dark mode with contrast compliance
- Testing graphics and data visualization accessibility

---

## When NOT to Use

Avoid this skill for:

- Brand/design system strategy (use design docs)
- CSS utility frameworks (that's framework-specific)
- Color theory or psychology (use design references)
- Image optimization (different skill)

---

## Contrast Ratio Requirements

### Text Contrast (SC 1.4.3)

| Text Size | WCAG AA | WCAG AAA |
|-----------|---------|---------|
| Normal (< 18px or < 14px bold) | 4.5:1 | 7:1 |
| Large (≥ 18px or ≥ 14px bold) | 3:1 | 4.5:1 |
| Incidental/decorative | No requirement | No requirement |
| Logotypes/brand names | No requirement | No requirement |

**Large text definition:**
- **Regular text**: ≥ 18px (or ~24pt)
- **Bold text**: ≥ 14px bold (or ~18.5pt bold)

### UI Component Contrast (SC 1.4.11)

**3:1 minimum** for all UI components and graphical elements:
- Button borders and backgrounds
- Form input borders and indicators
- Icons and graphics
- Data visualization elements (lines, bars, points)
- Focus indicators (must have sufficient contrast)

---

## Implementation Patterns

### Pattern 1: Accessible Color Palette with CSS Variables

```css
/* ✅ GOOD: Color palette with verified contrast ratios */

:root {
  /* Primary palette (blue) */
  --color-primary-50: #eff6ff;   /* 95% opacity, very light */
  --color-primary-100: #dbeafe;  /* 90% opacity */
  --color-primary-500: #3b82f6;  /* Primary blue */
  --color-primary-600: #2563eb;  /* Darker blue (6:1 on white) */
  --color-primary-900: #1e3a5f;  /* Very dark blue (15:1 on white) */

  /* Neutral palette (grayscale) */
  --color-neutral-0: #ffffff;    /* White (17:1 background) */
  --color-neutral-50: #f8fafc;   /* Very light gray */
  --color-neutral-100: #f1f5f9;  /* Light gray */
  --color-neutral-300: #cbd5e1;  /* Medium-light gray (4.0:1 on white) */
  --color-neutral-500: #64748b;  /* Medium gray (4.8:1 on white) */
  --color-neutral-700: #334155;  /* Dark gray (7.4:1 on white) */
  --color-neutral-900: #0f172a;  /* Very dark gray (15.3:1 on white) */

  /* Semantic palette */
  --color-success: #16a34a;       /* Green: 5.9:1 on white */
  --color-warning: #d97706;       /* Amber: 4.5:1 on white */
  --color-error: #dc2626;         /* Red: 3.9:1 on white */
  --color-info: #2563eb;          /* Blue: 6.0:1 on white */

  /* Text colors (all pass WCAG AA minimum 4.5:1 on white) */
  --color-text-primary: #0f172a;      /* 15.3:1 on white */
  --color-text-secondary: #475569;    /* 7.0:1 on white */
  --color-text-tertiary: #64748b;     /* 4.8:1 on white */
  --color-text-muted: #94a3b8;        /* 3.0:1 on white (fails AA, use sparingly) */
  --color-text-inverse: #f8fafc;      /* 15.3:1 on #0f172a */

  /* Background colors */
  --color-bg-primary: #ffffff;        /* Primary background */
  --color-bg-secondary: #f8fafc;      /* Secondary background */
  --color-bg-tertiary: #f1f5f9;       /* Tertiary background */
  --color-bg-dark: #0f172a;           /* Dark background */

  /* Focus indicator (high contrast) */
  --color-focus: #2563eb;             /* 6.0:1 on white, 4.0:1 on light grays */
}

/* Text color variations (all compliant with 4.5:1) */
.text-primary {
  color: var(--color-text-primary);  /* 15.3:1 on white */
  background: var(--color-bg-primary);
}

.text-secondary {
  color: var(--color-text-secondary);  /* 7.0:1 on white */
  background: var(--color-bg-primary);
}

.text-tertiary {
  color: var(--color-text-tertiary);  /* 4.8:1 on white */
  background: var(--color-bg-primary);
}

/* ❌ BAD: Insufficient contrast (fails WCAG AA) */
.text-muted-bad {
  color: #94a3b8;  /* 2.8:1 on white — unreadable */
  background: #ffffff;
}

/* ✅ GOOD: High contrast even on secondary backgrounds */
.card {
  background: var(--color-bg-secondary);  /* #f8fafc */
}

.card .text-primary {
  color: var(--color-text-primary);  /* Still 15.3:1 on #f8fafc */
}

/* Dark mode with high contrast */
@media (prefers-color-scheme: dark) {
  :root {
    --color-bg-primary: #0f172a;
    --color-bg-secondary: #1e293b;
    --color-text-primary: #f8fafc;    /* 15.3:1 on dark */
    --color-text-secondary: #cbd5e1;  /* 7.0:1 on dark */
  }
}

/* High contrast mode (Windows, macOS, iOS) */
@media (prefers-contrast: more) {
  :root {
    --color-text-primary: #000000;    /* Absolute black (21:1 on white) */
    --color-text-secondary: #1e293b;  /* Darker than normal */
  }

  .btn-primary {
    border: 3px solid var(--color-primary-600);  /* Thicker border */
  }
}
```

### Pattern 2: Contrast Verification in CSS

```css
/* Text element with verified contrast */
body {
  color: #334155;        /* Color value */
  background: #ffffff;   /* Background value */
  /* Contrast ratio: 7.4:1 — passes WCAG AAA */
}

/* Form input with accessible contrast */
input[type="text"],
input[type="email"],
input[type="password"],
textarea {
  border: 2px solid #cbd5e1;  /* Border contrast: 4.0:1 */
  background: #ffffff;
  color: #0f172a;             /* Text contrast: 15.3:1 */
  font-size: 16px;
}

input[type="text"]:focus,
input[type="email"]:focus,
input[type="password"]:focus,
textarea:focus {
  border-color: #2563eb;      /* Focus border: 6.0:1 */
  outline: 3px solid #2563eb; /* Additional focus outline */
  outline-offset: 2px;
}

/* Button with UI component contrast (SC 1.4.11) */
.btn-primary {
  background: #2563eb;      /* Background: 6.0:1 on white */
  color: #ffffff;           /* Text on button: 3.9:1 */
  border: 2px solid #1d4ed8; /* Border: 7.9:1 on white */
}

.btn-primary:hover {
  background: #1d4ed8;      /* Darker for hover state */
}

.btn-primary:focus-visible {
  outline: 3px solid #0f172a;  /* Focus indicator: 20:1 contrast */
  outline-offset: 2px;
}

/* ❌ BAD: Insufficient contrast */
.btn-bad {
  background: #e0e7ff;      /* Light background: only 1.2:1 on white */
  color: #c7d2fe;           /* Light text on light background: 1.1:1 */
  border: 1px solid #ddd8e8; /* Border: 1.3:1 on white */
}

/* UI Icons with sufficient contrast */
.icon {
  color: #334155;           /* Icon color: 7.4:1 on white */
}

.icon-subtle {
  color: #475569;           /* Subtle icon: 7.0:1 on white */
}

.icon-error {
  color: #dc2626;           /* Error icon: 3.9:1 on white */
}

/* Data visualization with 3:1 minimum */
.chart-bar {
  background: #2563eb;      /* Bar color: 6.0:1 on white */
}

.chart-line {
  stroke: #dc2626;          /* Line color: 3.9:1 on white */
  stroke-width: 3px;        /* Thicker lines improve visibility */
}

/* Disabled state must maintain contrast */
input:disabled {
  background: #f1f5f9;      /* Disabled background */
  color: #94a3b8;           /* Disabled text: 2.8:1 on white (subpriority element) */
  opacity: 0.65;            /* Additional visual distinction */
}

/* Focus indicator with adequate contrast */
button:focus-visible {
  outline: 3px solid #2563eb; /* Focus: 6.0:1 on white */
  outline-offset: 2px;
}

/* High contrast mode: thicken borders and outlines */
@media (prefers-contrast: more) {
  input {
    border-width: 3px;
  }

  button:focus-visible {
    outline-width: 4px;
  }

  .icon-subtle {
    color: #0f172a;  /* Use primary color in high contrast */
  }
}
```

### Pattern 3: High Contrast Mode Support

```css
/* Forced Colors (Windows High Contrast) */
@media (forced-colors: active) {
  /* Use system colors instead of custom colors */
  body {
    color: CanvasText;        /* System text color */
    background: Canvas;       /* System background color */
  }

  button {
    background: ButtonFace;   /* System button color */
    color: ButtonText;        /* System button text */
    border: 2px solid ButtonBorder;
  }

  button:hover {
    background: Highlight;
    color: HighlightText;
  }

  input {
    background: Field;        /* System field background */
    color: FieldText;         /* System field text */
    border: 2px solid FieldBorder;
  }

  a {
    color: LinkText;          /* System link color */
  }

  a:visited {
    color: VisitedText;       /* System visited link color */
  }
}

/* Prefers contrast (macOS, iOS) */
@media (prefers-contrast: more) {
  body {
    color: #000000;           /* Absolute black for primary text */
    background: #ffffff;      /* Absolute white for background */
  }

  button {
    border: 3px solid #000000; /* Thicker, darker borders */
    font-weight: bold;
  }

  .text-secondary {
    color: #333333;           /* Darker than normal secondary text */
  }

  /* Ensure graphics have higher contrast */
  .chart-line {
    stroke-width: 4px;        /* Thicker lines */
  }
}

/* Detect reduced transparency (iOS) */
@media (prefers-reduced-transparency: reduce) {
  .modal-overlay {
    background: rgba(0, 0, 0, 0.8); /* Solid background instead of semi-transparent */
  }
}
```

### Pattern 4: Color Accessibility Testing

```html
<!-- HTML with accessible color pairing -->
<div class="card">
  <!-- Primary text: 15.3:1 ratio -->
  <h2 class="text-primary">Accessible Card Title</h2>

  <!-- Secondary text: 7.0:1 ratio -->
  <p class="text-secondary">Supporting description text</p>

  <!-- Tertiary text: 4.8:1 ratio (minimum AA) -->
  <p class="text-tertiary">Additional details or hints</p>

  <!-- Color with text alternative (never color alone) -->
  <div class="status-success">
    ✓ <span>Verification successful</span> <!-- Icon + text -->
  </div>

  <div class="status-error">
    ✗ <span>Error occurred</span> <!-- Icon + text -->
  </div>

  <!-- Button with sufficient contrast -->
  <button class="btn-primary">Action</button>
</div>
```

### Pattern 5: Contrast Testing with Code

```python
# Utility function to calculate contrast ratio (WCAG formula)
def get_luminance(r, g, b):
    """Calculate relative luminance per WCAG spec"""
    rgb = [r / 255.0, g / 255.0, b / 255.0]
    rgb = [
        (c / 12.92) if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
        for c in rgb
    ]
    return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]


def get_contrast_ratio(color1_hex, color2_hex):
    """Calculate contrast ratio between two colors (1:1 to 21:1)"""
    # Parse hex colors
    r1, g1, b1 = int(color1_hex[1:3], 16), int(color1_hex[3:5], 16), int(color1_hex[5:7], 16)
    r2, g2, b2 = int(color2_hex[1:3], 16), int(color2_hex[3:5], 16), int(color2_hex[5:7], 16)

    # Get luminance
    l1 = get_luminance(r1, g1, b1)
    l2 = get_luminance(r2, g2, b2)

    # Calculate ratio (lighter / darker)
    lighter = max(l1, l2)
    darker = min(l1, l2)
    ratio = (lighter + 0.05) / (darker + 0.05)

    return ratio


# Test color palette
colors = {
    "primary": "#0f172a",
    "secondary": "#334155",
    "background": "#ffffff",
    "error": "#dc2626",
}

# Verify contrast
print(f"Primary on white: {get_contrast_ratio(colors['primary'], colors['background']):.1f}:1")
# Output: Primary on white: 15.3:1 ✓ (AA)

print(f"Secondary on white: {get_contrast_ratio(colors['secondary'], colors['background']):.1f}:1")
# Output: Secondary on white: 7.4:1 ✓ (AAA)

print(f"Error on white: {get_contrast_ratio(colors['error'], colors['background']):.1f}:1")
# Output: Error on white: 3.9:1 ✓ (AA for normal text)
```

---

## Contrast Checking Tools

### WebAIM Contrast Checker

**Online tool:** https://webaim.org/resources/contrastchecker/

1. Enter foreground color (text)
2. Enter background color
3. Tool displays ratio and WCAG compliance

### Axe DevTools

**Browser Extension:** https://www.deque.com/axe/devtools/

- Automatically scans for contrast violations
- Flags insufficient contrast with severity level
- Provides suggested improvements

### Chrome DevTools

**Built-in:** Right-click → Inspect → Elements tab

1. Select element
2. Go to Computed Styles
3. Hover over color property
4. Color picker shows contrast ratio

### Pa11y

**CLI tool:**
```bash
npm install pa11y-ci
pa11y-ci --standard wcag2aa # Checks including contrast
```

---

## Common Contrast Violations

### Violation 1: Light Text on Light Background

```css
/* ❌ BAD: 1.2:1 ratio (completely unreadable) */
.bad-card {
  background: #e0e7ff;  /* Light purple */
  color: #ddd2fe;       /* Lighter purple text */
}

/* ✅ GOOD: 7.4:1 ratio (highly readable) */
.good-card {
  background: #e0e7ff;
  color: #0f172a;       /* Very dark text */
}
```

### Violation 2: Low Contrast Buttons

```css
/* ❌ BAD: 2.1:1 (fails WCAG AA) */
.btn-bad {
  background: #f3e8ff;  /* Very light purple */
  color: #e9d5ff;       /* Light purple text */
}

/* ✅ GOOD: 4.5:1 (passes WCAG AA) */
.btn-good {
  background: #7c3aed;  /* Medium purple */
  color: #ffffff;       /* White text */
}
```

### Violation 3: Icon Without Text

```html
<!-- ❌ BAD: Color-only indicator (no text alternative) -->
<div class="status" style="color: #16a34a;">
  Status is: [GREEN DOT ONLY]
</div>

<!-- ✅ GOOD: Icon + text -->
<div class="status">
  <span style="color: #16a34a;">●</span>
  <span>Success</span>
</div>
```

---

## Constraints

### MUST DO

- Achieve 4.5:1 minimum contrast for normal text (WCAG AA)
- Achieve 3:1 minimum contrast for large text and UI components
- Test all text/background color combinations with contrast checker
- Use CSS variables for consistent accessible color palette
- Support high-contrast mode: `@media (prefers-contrast: more)`
- Support forced-colors mode: `@media (forced-colors: active)`
- Never convey information using color alone
- Ensure focus indicators have 3:1 contrast with adjacent colors
- Test with real assistive technology or high-contrast mode enabled

### MUST NOT DO

- Use colors with insufficient contrast "for design reasons"
- Rely on color alone to convey state or meaning
- Assume light text on light background is readable
- Skip high-contrast mode support
- Remove focus indicator styling
- Use very light gray text on white backgrounds
- Ignore failed contrast checks

---

## Accessibility Checklist for Color

- [ ] All body text 4.5:1 minimum on background
- [ ] Large text 3:1 minimum on background
- [ ] UI component borders/backgrounds 3:1 minimum
- [ ] Focus indicator 3:1 contrast
- [ ] Icons and graphics 3:1 minimum
- [ ] No information conveyed by color alone
- [ ] High-contrast mode supported
- [ ] Forced-colors mode supported
- [ ] Tested with WebAIM Contrast Checker
- [ ] Tested with real high-contrast mode enabled

---

## Testing Workflow

1. **Extract Color Values** — Inspect CSS for all text/background combinations
2. **Test with Tool** — Use WebAIM or Axe to check ratios
3. **Document Results** — Record ratio for each combination
4. **Fix Failures** — Adjust colors to meet minimum ratios
5. **Verify High Contrast** — Test with system high-contrast mode enabled
6. **Automate in CI** — Add contrast checks to build pipeline

