---
name: semantic-html-aria-accessibility-tree
description: "Builds accessible HTML structures using semantic elements (button, nav, main, section, form, fieldset, label) and ARIA 1.2 with clear understanding of accessibility tree, implicit roles, first rule of ARIA, and landmark navigation."
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  role: reference
  scope: implementation
  output-format: code
  content-types:
    - reference
    - patterns
    - examples
  triggers: semantic HTML, ARIA 1.2, accessibility tree, implicit roles, HTML5, button, form, landmark
  related-skills: keyboard-navigation-focus-management, wcag-21-aa-fundamentals
  archetypes:
    - educational
    - enforcement
  anti_triggers:
    - component library code
    - styling concerns
    - design patterns
  response_profile:
    verbosity: medium
    directive_strength: high
    abstraction_level: tactical
---

# Semantic HTML & ARIA 1.2: Building the Accessibility Tree

Builds accessible HTML structures using semantic elements and ARIA 1.2, with clear mental model of the accessibility tree, implicit vs explicit roles, and when to use ARIA. Covers HTML5 semantic elements (button, nav, main, section, article, form, fieldset, label), ARIA roles/properties/states, accessibility tree visualization, "first rule of ARIA" (use native HTML), and accessibility tree inspection tools. Load when designing DOM structure, building accessible forms, creating landmark navigation, or understanding how content is exposed to assistive technology.

## TL;DR Checklist

- [ ] Use native HTML elements: `<button>`, `<a>`, `<nav>`, `<main>`, `<article>`, `<form>`, `<fieldset>`, `<label>`
- [ ] Understand implicit roles: `<button>` = role="button", `<nav>` = role="navigation"
- [ ] First rule of ARIA: Never use `role="button"` on `<div>` if `<button>` exists
- [ ] Structure landmarks: `<header>`, `<nav>`, `<main>`, `<aside>`, `<footer>`
- [ ] Associate labels: `<label htmlFor="input-id">` with `<input id="input-id">`
- [ ] Use `aria-label` only for missing text (icon buttons, decorative labels)
- [ ] Test accessibility tree with browser DevTools or axe Inspector
- [ ] Verify screen reader announces correct name, role, state

---

## When to Use

Use this skill when:

- Building new pages or components from HTML (wireframing accessibility)
- Converting divs to semantic elements (refactoring non-semantic markup)
- Adding ARIA attributes to enhance accessibility (when HTML alone insufficient)
- Understanding how content appears to screen readers (accessibility tree)
- Designing page structure with landmarks (nav, main, aside, footer)
- Building accessible forms with proper label associations
- Teaching developers why semantic HTML matters

---

## When NOT to Use

Avoid this skill for:

- React/Vue/Svelte component implementations (use framework-specific skills)
- Styling or CSS (use style-related skills)
- Testing accessibility violations (use automated-a11y-testing-axe-core)
- Keyboard behavior implementation (use keyboard-navigation-focus-management)

---

## HTML5 Semantic Elements Reference

### Document Structure Elements

| Element | Implicit Role | Usage | Screen Reader Announces |
|---------|---|---|---|
| `<header>` | `banner` | Page header (once per page) | "banner" |
| `<nav>` | `navigation` | Navigation section | "navigation" |
| `<main>` | `main` | Main content (once per page) | "main" |
| `<article>` | `article` | Self-contained content | "article" |
| `<section>` | `region` | Generic grouping (use `aria-label` for context) | "region" |
| `<aside>` | `complementary` | Sidebar, related content | "complementary" |
| `<footer>` | `contentinfo` | Page footer (once per page) | "contentinfo" |

### Text Content Elements

| Element | Usage | Semantic Meaning |
|---------|-------|---|
| `<h1>` - `<h6>` | Headings | Document outline hierarchy |
| `<p>` | Paragraphs | Natural text grouping |
| `<blockquote>` | Extended quotes | Attribution context |
| `<ul>`, `<ol>`, `<li>` | Lists | Enumerated/ordered information |
| `<dl>`, `<dt>`, `<dd>` | Definition lists | Terms and definitions |
| `<address>` | Contact information | Author/organization address |

### Interactive Elements

| Element | Implicit Role | Keyboard Support | Usage |
|---------|---|---|---|
| `<button>` | `button` | Enter, Space, Tab | Buttons, form submission |
| `<a href>` | `link` | Tab, Enter | Navigation links |
| `<input>`, `<textarea>`, `<select>` | varies | Tab, input-specific | Form controls |
| `<label>` | `label` | No, associates with input | Form field labels |
| `<fieldset>` | `group` | No, groups inputs | Form grouping |

### Media Elements

| Element | Usage | Accessibility Requirement |
|---------|-------|---|
| `<img>` | Images | alt text (required) |
| `<figure>` | Illustration/diagram | `<figcaption>` for context |
| `<video>` | Video content | captions, transcript, audio description |
| `<audio>` | Audio content | transcript, captions |

---

## Accessibility Tree Mental Model

The **accessibility tree** is a simplified representation of the DOM structure that assistive technologies (screen readers, voice control) use to understand page content.

### How the Accessibility Tree is Built

```
DOM Tree                          Accessibility Tree
─────────────                    ──────────────────

<header>                          "banner" (role)
  <nav>                           ├─ "navigation" (role)
    <ul>                          │  ├─ "Home" (button)
      <li><button>Home</button>   │  ├─ "Products" (link)
      <li><a>Products</a>         │  └─ "Contact" (link)
  </nav>                          │
</header>                         │
<main>                           ├─ "main" (role)
  <h1>Welcome</h1>               │  ├─ "Welcome" (heading level 1)
  <p>...</p>                     │  └─ "..." (paragraph)
  <button aria-label="Search">   │  └─ "Search" (button)
    <svg aria-hidden="true">     │     [decorative, not in tree]
      ...
    </svg>
  </button>
</main>
<footer>                         └─ "contentinfo" (role)
  ...                               └─ "..." (text content)
</footer>
```

**Screen reader reads:**
1. "Banner" (header role)
2. "Navigation" (nav role)
3. List: "Home" (button), "Products" (link), "Contact" (link)
4. "Main" (main role)
5. Heading level 1: "Welcome"
6. Paragraph: "..." (text content)
7. Button: "Search"
8. "Contentinfo" (footer role)

**Key insights:**
- Screen readers announce roles, names, and states from accessibility tree
- Decorative elements (`aria-hidden="true"`) are excluded
- Structure conveyed through semantic elements

### Names, Roles, States

Every item in the accessibility tree has up to three properties:

| Property | Example | How Determined |
|----------|---------|---|
| **Name** | "Search", "Submit", "Home" | Text content, aria-label, title, alt |
| **Role** | "button", "link", "heading" | HTML element or aria-role |
| **State** | "pressed", "expanded", "disabled" | aria-pressed, aria-expanded, disabled |

Screen readers announce: **"{State} {Name} {Role}"**

Examples:
- `<button disabled>Save</button>` → "Disabled Save button"
- `<a href="/home">Home</a>` → "Home, link"
- `<h1>Welcome</h1>` → "Welcome, heading level 1"

---

## The First Rule of ARIA

**Always use native HTML elements first. Only use ARIA when native HTML lacks the required semantics.**

### Why This Rule Exists

1. **Native elements have built-in behavior**: `<button>` responds to Enter/Space without code
2. **ARIA provides only semantics**: It tells screen readers about the element, not keyboard behavior
3. **Maintenance burden**: Custom ARIA components require more code and testing
4. **Better cross-browser support**: Native elements work everywhere

### Consequences of Violating the Rule

```html
<!-- ❌ BAD: ARIA button without keyboard support -->
<div role="button" tabindex="0" @click="handleClick">
  Click me
</div>
<!-- Missing: Enter/Space support, focus management, semantic meaning -->

<!-- ✅ GOOD: Native button -->
<button @click="handleClick">
  Click me
</button>
<!-- Includes: Enter/Space, focus management, inherent semantics -->
```

### When ARIA IS Necessary

Use ARIA only when:

1. **HTML element doesn't exist** for your use case
   - Example: Custom tabs with roving tabindex (HTML has no native tabs)
   
2. **Native element needs role enhancement**
   - Example: `<input type="checkbox">` → `<input type="checkbox" aria-switch>` (not recommended, but valid)

3. **Heading or labeling missing**
   - Example: `<div aria-label="Search Results">` for dynamically generated region

4. **State communication**
   - Example: `<button aria-pressed="true">Toggle</button>` for toggle buttons

---

## Semantic HTML Structure Examples

### Proper Page Structure

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Page Title (appears in browser tab, <title> not visible on page)</title>
</head>
<body>
  <!-- ✅ GOOD: Semantic structure with landmarks -->
  
  <!-- Page header (appears once) -->
  <header role="banner">
    <h1>Site Name</h1>
    <p>Site tagline</p>
  </header>

  <!-- Main navigation -->
  <nav aria-label="Main navigation">
    <ul>
      <li><a href="/">Home</a></li>
      <li><a href="/about">About</a></li>
      <li><a href="/contact">Contact</a></li>
    </ul>
  </nav>

  <!-- Main content (appears once) -->
  <main id="main-content">
    <h1>Page Heading</h1>
    
    <!-- Article content -->
    <article>
      <h2>Article Title</h2>
      <p>Article content...</p>
    </article>

    <!-- Additional articles in section -->
    <section aria-label="Related articles">
      <h2>Related</h2>
      <article>
        <h3>Related Article 1</h3>
      </article>
      <article>
        <h3>Related Article 2</h3>
      </article>
    </section>
  </main>

  <!-- Sidebar (supplementary content) -->
  <aside aria-label="Sidebar">
    <h2>Featured</h2>
    <p>Featured content...</p>
  </aside>

  <!-- Page footer (appears once) -->
  <footer>
    <p>&copy; 2024 Company Name</p>
  </footer>

  <!-- Skip to main content link (keyboard users benefit) -->
  <a href="#main-content" class="skip-link">Skip to main content</a>
</body>
</html>
```

### Accessible Form

```html
<!-- ✅ GOOD: Properly structured form -->
<form id="contact-form">
  <fieldset>
    <legend>Contact Information</legend>

    <!-- Properly labeled text input -->
    <div class="form-group">
      <label for="name">Name</label>
      <input id="name" type="text" name="name" required>
    </div>

    <!-- Email input with helper text -->
    <div class="form-group">
      <label for="email">Email Address</label>
      <input
        id="email"
        type="email"
        name="email"
        required
        aria-describedby="email-help"
      >
      <p id="email-help" class="help-text">
        We'll never share your email
      </p>
    </div>

    <!-- Password with validation -->
    <div class="form-group">
      <label for="password">Password</label>
      <input
        id="password"
        type="password"
        name="password"
        required
        aria-invalid="false"
        aria-describedby="password-requirements"
      >
      <ul id="password-requirements" class="requirements">
        <li>At least 8 characters</li>
        <li>One uppercase letter</li>
        <li>One number</li>
      </ul>
    </div>

    <!-- Checkbox -->
    <div class="form-group">
      <input
        id="terms"
        type="checkbox"
        name="terms"
        required
      >
      <label for="terms">
        I agree to the <a href="/terms">terms of service</a>
      </label>
    </div>

    <!-- Submit button -->
    <button type="submit">Create Account</button>
  </fieldset>
</form>

<!-- ❌ BAD: Inaccessible form -->
<form>
  <!-- Missing label -->
  <input type="text" placeholder="Name">
  
  <!-- Label not associated -->
  <label>Email</label>
  <input type="email">
  
  <!-- No fieldset/legend for grouping -->
  <input type="checkbox">
  I agree to terms
  
  <!-- Missing semantic button -->
  <div role="button" onclick="submitForm()">Submit</div>
</form>
```

### Accessible Navigation

```html
<!-- ✅ GOOD: Semantic navigation -->
<nav aria-label="Main navigation">
  <ul>
    <li><a href="/">Home</a></li>
    <li>
      <a href="/products">Products</a>
      <!-- Submenu -->
      <ul>
        <li><a href="/products/electronics">Electronics</a></li>
        <li><a href="/products/clothing">Clothing</a></li>
      </ul>
    </li>
    <li><a href="/about">About</a></li>
    <li><a href="/contact">Contact</a></li>
  </ul>
</nav>

<!-- ❌ BAD: Non-semantic navigation -->
<div class="navigation">
  <div class="nav-item"><a href="/">Home</a></div>
  <div class="nav-item"><a href="/products">Products</a></div>
  <div class="nav-item"><a href="/about">About</a></div>
</div>
```

---

## ARIA Roles, Properties, and States

### ARIA Roles (Define Purpose)

```html
<!-- Roles define what an element does -->

<!-- Navigation role (use <nav> instead) -->
<div role="navigation">Links here</div>

<!-- Tablist with roving tabindex -->
<div role="tablist">
  <button role="tab" aria-selected="true" tabindex="0">Tab 1</button>
  <button role="tab" aria-selected="false" tabindex="-1">Tab 2</button>
</div>

<!-- Alert role (for status messages) -->
<div role="alert">Error: Password too short</div>

<!-- Status role (for updates) -->
<div role="status" aria-live="polite">Loading...</div>
```

### ARIA Properties (Describe Characteristics)

```html
<!-- aria-label: Provide name when text unavailable -->
<button aria-label="Close dialog">×</button>

<!-- aria-labelledby: Connect to existing text -->
<h2 id="dialog-title">Delete Item</h2>
<div role="dialog" aria-labelledby="dialog-title">
  ...
</div>

<!-- aria-describedby: Provide description -->
<input
  type="password"
  aria-describedby="pwd-requirements"
>
<p id="pwd-requirements">8+ characters, 1 number, 1 uppercase</p>

<!-- aria-required: Indicate required field -->
<input type="email" aria-required="true">

<!-- aria-invalid: Indicate invalid state -->
<input type="email" aria-invalid="true">
```

### ARIA States (Describe Current Condition)

```html
<!-- aria-expanded: Indicate collapsed/expanded state -->
<button aria-expanded="false" aria-controls="menu">
  Menu
</button>
<ul id="menu" hidden>...</ul>

<!-- aria-selected: Indicate selected tab/option -->
<button role="tab" aria-selected="true">Tab 1</button>
<button role="tab" aria-selected="false">Tab 2</button>

<!-- aria-pressed: Indicate toggled button state -->
<button aria-pressed="false" @click="toggle()">
  Toggle
</button>

<!-- aria-disabled: Prevent interaction (supplementary to disabled) -->
<button aria-disabled="true">Disabled</button>
```

---

## Accessibility Tree Inspection

### Browser DevTools (Chrome/Firefox)

1. Open DevTools → Accessibility tab
2. Expand accessibility tree
3. Click element in tree to highlight in DOM
4. Inspect: name, role, state, parent relationships

### WAVE Browser Extension

1. Install WAVE for Chrome/Firefox
2. Open page, toggle wave overlay
3. Shows structure with landmarks highlighted
4. Color-codes accessibility issues

### Testing Approach

Verify accessibility tree matches:
- Document landmarks (header, nav, main, aside, footer)
- Heading hierarchy (H1 → H2 → H3, no skips)
- Form labels (properly associated inputs)
- Links and buttons (proper roles)
- Dynamic content announcements

---

## Constraints

### MUST DO

- Use semantic HTML elements for all content (button, nav, main, article, aside, footer)
- Associate labels with form inputs using `<label htmlFor="id">`
- Structure page with landmarks: header, nav, main, aside, footer
- Use heading hierarchy without skipping levels (H1 → H2 → H3)
- Provide descriptive text for images using `<img alt="description">`
- Use `aria-label` only when visible text unavailable (icon buttons, regions)
- Test accessibility tree with browser DevTools or WAVE
- Never use `role="button"` on `<div>` when `<button>` exists

### MUST NOT DO

- Use `<div>` and `<span>` for interactive elements (use button, a, input)
- Remove implicit roles with conflicting explicit roles (confusion)
- Use decorative elements in accessibility tree (mark with `aria-hidden="true"`)
- Skip heading levels (H1 → H3, skipping H2)
- Leave images without alt text or with placeholder alt text
- Use `aria-label` as substitute for proper HTML structure
- Assume ARIA fixes structural problems (it doesn't)
- Place form labels outside `<label>` elements without `aria-label`

---

## Accessibility Tree Checklist

For any page or component, verify:

- [ ] All interactive elements are native (button, a, input, select, textarea)
- [ ] All form inputs have `<label>` or `aria-label`
- [ ] Page has H1 and proper heading hierarchy (no skips)
- [ ] Landmarks present: header, nav, main, footer
- [ ] Images have descriptive alt text
- [ ] Color alone doesn't convey information
- [ ] Focus order logical (Tab through page in logical sequence)
- [ ] Accessibility tree includes all essential content
- [ ] Decorative elements marked `aria-hidden="true"`
- [ ] Links and buttons have descriptive text (not "Click here")

---

## Core Workflow: Converting Non-Semantic to Semantic

1. **Audit Current Structure** — Identify divs used for buttons, navigation, sections
2. **Map to Semantic Elements** — Replace with proper HTML elements
3. **Add Landmarks** — Wrap content in header, nav, main, aside, footer
4. **Associate Labels** — Add proper label elements and aria-label
5. **Add Heading Structure** — Create H1-H6 hierarchy matching content
6. **Test Accessibility Tree** — Verify structure with DevTools or WAVE
7. **Validate with Screen Reader** — Test with NVDA/JAWS/VoiceOver

