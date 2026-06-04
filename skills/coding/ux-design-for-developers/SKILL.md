---




name: ux-design-for-developers
description: Implements UX design patterns and accessibility standards for backend engineers building user-facing features, covering user flows, responsive layouts, WCAG compliance, and usability heuristics.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: ux design, user experience, accessibility, WCAG, user flows, responsive layout, usability testing, how do i design a good ui
  archetypes:
    - tactical
    - educational
  anti_triggers:
    - deep UI art direction
    - brand identity design
    - graphic design
  response_profile:
    verbosity: medium
    directive_strength: high
    abstraction_level: operational
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: design-systems, css-architecture, component-architecture




---





# UX Design Patterns for Developers

Implements accessible, usable UI patterns and interfaces when no dedicated designer is available. When loaded, this skill makes the model act as a senior frontend engineer applying user-centered design principles — creating navigable layouts, enforcing WCAG accessibility compliance, designing responsive grids, and building forms with proper validation. This skill bridges the gap between backend logic and front-end presentation for engineers who must ship functional UIs without a design team.

## TL;DR Checklist

- [ ] Verify all text meets WCAG AA contrast ratios (4.5:1 minimum for body text, 3:1 for large text ≥18pt or bold ≥14pt)
- [ ] Confirm full keyboard navigation: Tab/Shift+Tab follows visual order, Escape dismisses overlays, focus is visible on every interactive element
- [ ] Ensure all images and icons have descriptive `alt` attributes or `aria-hidden="true"` when decorative
- [ ] Validate responsive breakpoints cover 320px (mobile), 768px (tablet), 1024px (laptop), 1440px (desktop) viewports
- [ ] Test all forms with screen reader preview (VoiceOver on macOS, NVDA on Windows) — labels must be announced before inputs
- [ ] Confirm interactive touch targets are minimum 44×44 CSS pixels as specified in WCAG 2.5.5

---

## When to Use

Use this skill when:

- A backend or full-stack engineer needs to build an admin panel, internal tool, or user-facing feature without a dedicated designer
- Adding accessibility (a11y) attributes to existing markup that uses bare `<div>` elements and lacks ARIA roles
- Refactoring a responsive layout that breaks on mobile viewports below 768px
- Designing form validation flows that provide clear, accessible error announcements for screen reader users
- Implementing modal dialogs, dropdown menus, or navigation patterns that require keyboard interaction support
- Reviewing UI code from another engineer to catch accessibility anti-patterns (missing labels, poor contrast, broken focus trapping)

---

## When NOT to Use

Avoid using this skill for:

- **Brand-heavy consumer marketing pages** — these require art direction and brand identity work; use `design-systems` for foundational component libraries instead
- **Graphic design tasks** — logo creation, icon illustration, or visual asset production are outside UX engineering scope
- **Pure CSS styling decisions** — if the task is only about choosing color palettes or typography without accessibility implications, apply `css-architecture` directly
- **Complex information architecture for enterprise systems** — use component-level patterns here; save architectural navigation design for broader system design

---

## Core Workflow

1. **Define User Roles and Primary Task Flows** — Identify the primary user persona and map their top 3 tasks on a simple flowchart. Document entry points, decision nodes, and expected outcomes. Use ASCII diagrams or Mermaid `flowchart LR` syntax to capture the journey. **Checkpoint:** Every user-facing screen must trace back to at least one documented task flow. If you cannot articulate what the user is trying to accomplish in one sentence, the UI needs re-scoping.

2. **Establish Layout Grid and Breakpoint Strategy** — Choose a mobile-first approach with breakpoints at 320px (smallest phones), 768px (landscape tablets), 1024px (laptops), and 1440px (desktops). Define the container max-width, gutter width (typically 16–24px), and column count per breakpoint. **Checkpoint:** Verify that at each breakpoint, the layout uses the minimum number of columns needed — never force a single-item list into a multi-column grid just to use space.

3. **Implement Semantic HTML Structure** — Replace generic `<div>` containers with semantic elements: `<main>` for primary content, `<nav>` for navigation blocks, `<header>`/`<footer>` for page regions, `<article>` for self-contained content, and `<section>` with descriptive `aria-label` for grouped content. Every interactive element must have a programmatic name via accessible label. **Checkpoint:** Run the devtools accessibility tree review — every node with an action (clickable, focusable, or toggleable) must have a non-empty accessible name.

4. **Ensure Color Contrast Compliance** — Calculate the contrast ratio between text color and its background using the WCAG relative luminance formula. For normal text (<18pt), the minimum ratio is 4.5:1 (AA level). For large text (≥18pt or bold ≥14pt), the minimum is 3:1. Use a tool like the Chrome DevTools color picker, WebAIM Contrast Checker, or `@axe-core/cli` for automated testing. **Checkpoint:** Every text element in the UI must pass WCAG AA contrast — this is non-negotiable for accessible software.

5. **Add Keyboard Navigation Patterns** — Ensure all interactive elements are reachable via Tab key in logical visual order (left-to-right, top-to-bottom). Implement focus-visible styles that are at least 2px wider than the default outline. Handle Escape key to dismiss modals and dropdown menus. Trap focus inside modal dialogs using a focus trap library or custom implementation. **Checkpoint:** Test the entire feature using only Tab, Shift+Tab, Enter, Space, and Arrow keys — no mouse cursor allowed.

6. **Test with Real Interaction Tools** — Validate accessibility using automated tools (axe DevTools, Lighthouse a11y audit), manual keyboard-only navigation, and screen reader testing. Check touch target sizes on mobile viewports (minimum 44×44px per WCAG 2.5.5). Verify that all dynamic content changes are announced via ARIA live regions. **Checkpoint:** Run `npx @axe-core/cli` on the deployed page and fix every error with severity "critical" or "serious."

---

## Implementation Patterns

### Pattern 1: Accessible Form Validation with ARIA Live Regions

Provide real-time validation feedback to all users, including screen reader users. Use `aria-live="polite"` for general messages and `aria-live="assertive"` for error states that require immediate attention.

```python
"""
Pattern 1: Accessible form validation with ARIA live regions.
Demonstrates real-time input validation with proper ARIA announcements
for screen reader users and visible feedback for sighted users.
"""

from typing import Optional
from dataclasses import dataclass


@dataclass(frozen=True)
class ValidationResult:
    """Immutable result of a single field validation."""
    is_valid: bool
    message: str
    severity: str  # "polite" or "assertive"


def validate_required(value: str, field_name: str) -> ValidationResult:
    """Validate that a required field is not empty after trimming whitespace.

    Args:
        value: The raw input string from the form field.
        field_name: Human-readable label for the field (used in error messages).

    Returns:
        ValidationResult with is_valid=False and an error message if empty,
        or is_valid=True with an empty message if the field has content.
    """
    if not value.strip():
        return ValidationResult(
            is_valid=False,
            message=f"{field_name} is required",
            severity="assertive",
        )
    return ValidationResult(is_valid=True, message="", severity="polite")


def validate_email(value: str) -> ValidationResult:
    """Validate that the input matches a basic email format.

    Uses a permissive regex for UX — strict validation happens server-side.

    Args:
        value: The raw email string from the form field.

    Returns:
        ValidationResult indicating whether the format looks plausible.
    """
    if not value.strip():
        return ValidationResult(
            is_valid=True,  # Required validation handles empty case separately
            message="",
            severity="polite",
        )
    import re
    email_pattern = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
    if not re.match(email_pattern, value.strip()):
        return ValidationResult(
            is_valid=False,
            message="Enter a valid email address (e.g., user@example.com)",
            severity="assertive",
        )
    return ValidationResult(is_valid=True, message="", severity="polite")


# ❌ BAD: Error messages hidden from screen readers — aria-hidden blocks them
# <div class="error" style="color: red;">Email is required</div>
# Screen reader users never hear this error because the div has no ARIA role

# ✅ GOOD: Errors announced via live region with proper severity
# <div id="email-error" role="status" aria-live="assertive">Email is required</div>
# <input aria-describedby="email-error" aria-invalid="true" ...>
# Screen readers announce the error immediately when it appears
```

### Pattern 2: Responsive Card Grid with CSS Grid and Breakpoint System

Build a fluid card grid that adapts from single-column mobile to multi-column desktop using CSS Grid with `minmax()` for natural column sizing. This eliminates media-query spaghetti by letting the grid itself determine column count.

```css
/*
 * Pattern 2: Responsive card grid using CSS Grid with minmax().
 * Breakpoints: 320px (mobile), 768px (tablet), 1024px (laptop), 1440px (desktop)
 */

.card-grid {
  display: grid;
  gap: 1.5rem; /* 24px — consistent spacing scale */
  padding: 1rem;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
}

/* Mobile-first base styles */
.card {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  min-height: 200px; /* Ensures uniform card height */
  background: #ffffff;
}

.card__title {
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0 0 0.75rem 0;
  color: #1a1a1a;
}

.card__description {
  font-size: 0.9375rem;
  line-height: 1.5;
  color: #4a4a4a;
  margin: 0;
  flex-grow: 1;
}

.card__actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #f0f0f0;
}

/* Tablet breakpoint: enforce minimum 2 columns */
@media (min-width: 768px) {
  .card-grid {
    gap: 1.5rem;
    padding: 1.5rem;
  }
  .card__title { font-size: 1.25rem; }
}

/* Desktop breakpoint: tighten grid for wider screens */
@media (min-width: 1440px) {
  .card-grid {
    max-width: 1440px;
    margin: 0 auto;
    padding: 2rem;
    gap: 2rem;
  }
}
```

```html
<!-- ✅ GOOD: Semantic card markup with proper heading hierarchy -->
<article class="card" role="article">
  <h3 class="card__title">Project Dashboard</h3>
  <p class="card__description">
    View real-time metrics and alerts for all active deployments.
  </p>
  <div class="card__actions">
    <a href="/dashboard" class="btn btn--primary">
      Open Dashboard
    </a>
  </div>
</article>

<!-- ❌ BAD: Non-semantic div-based card with missing heading -->
<div class="card">
  <div class="card-title">Project Dashboard</div>
  <div class="card-desc">View real-time metrics...</div>
  <div><a href="/dashboard">Open Dashboard</a></div>
</div>
<!-- Problems: no document outline, no article semantics, heading hierarchy broken -->
```

### Pattern 3: Keyboard Navigation for Modal Dialogs with Focus Trapping

Implement a modal dialog that traps keyboard focus within the dialog overlay, handles Escape to dismiss, and restores focus to the trigger element on close. This follows WAI-ARIA Authoring Practices for modal dialogs.

```python
"""
Pattern 3: Modal dialog keyboard navigation with focus trapping.
Implements WAI-ARIA modal dialog pattern with programmatic focus management.
"""

from typing import Optional, Callable


class ModalDialog:
    """Manages a modal dialog's lifecycle, focus state, and keyboard interaction."""

    def __init__(
        self,
        trigger_element_id: str,
        dialog_element_id: str,
        on_close_callback: Optional[Callable] = None,
    ) -> None:
        """Initialize the modal controller.

        Args:
            trigger_element_id: DOM ID of the button or link that opens the modal.
            dialog_element_id: DOM ID of the <dialog> or overlay element.
            on_close_callback: Optional callback invoked when the modal closes.
        """
        self.trigger_element_id = trigger_element_id
        self.dialog_element_id = dialog_element_id
        self.on_close_callback = on_close_callback
        self._previous_focus_target: Optional[str] = None
        self._focusable_selector = (
            'a[href], button:not([disabled]), input:not([disabled]), '
            'select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )

    def open(self) -> None:
        """Open the modal and trap focus inside it."""
        # Save the element that had focus before opening
        self._previous_focus_target = self._get_active_element_id()

        # Show the dialog — use inert on background content per WAI-ARIA
        dialog = self._find_element(self.dialog_element_id)
        if dialog:
            dialog.showModal()
            self._set_inert(True)

        # Focus the first focusable element inside the dialog
        first_focusable = self._get_first_focusable(dialog)
        if first_focusable:
            first_focusable.focus()

    def close(self) -> None:
        """Close the modal and restore focus to the triggering element."""
        dialog = self._find_element(self.dialog_element_id)
        if dialog:
            dialog.close()
            self._set_inert(False)

        # Restore focus to the element that triggered the modal
        trigger = self._find_element(self.trigger_element_id)
        if trigger:
            trigger.focus()

        if self.on_close_callback:
            self.on_close_callback()

    def _handle_keydown(self, event: dict) -> bool:
        """Handle keyboard events inside the dialog.

        Args:
            event: Keyboard event dict with 'key' and 'target' fields.

        Returns:
            True if the event was handled (preventDefault called), False otherwise.
        """
        key = event.get("key", "")

        # Escape closes the modal
        if key in ("Escape", "Esc"):
            self.close()
            return True

        # Tab/Shift+Tab traps focus within the dialog
        if key == "Tab":
            self._trap_focus(event)
            return True

        return False

    def _trap_focus(self, event: dict) -> None:
        """Trap Tab focus within the dialog boundaries."""
        dialog = self._find_element(self.dialog_element_id)
        if not dialog:
            return

        focusable_elements = dialog.querySelectorAll(self._focusable_selector)
        if focusable_elements.length == 0:
            return

        first_element = focusable_elements[0]
        last_element = focusable_elements[-1]
        active = document.activeElement

        # Shift+Tab on first element: wrap to last
        if event.get("shiftKey") and active == first_element:
            last_element.focus()
            event["preventDefault"]()
        # Tab on last element: wrap to first
        elif not event.get("shiftKey") and active == last_element:
            first_element.focus()
            event["preventDefault"]()

    def _set_inert(self, inert: bool) -> None:
        """Set the inert attribute on all content outside the modal."""
        main = document.querySelector("main")
        if main:
            main.inert = inert

    def _get_first_focusable(self, container):
        elements = container.querySelectorAll(self._focusable_selector)
        return elements[0] if elements.length > 0 else None

    def _get_active_element_id(self) -> Optional[str]:
        active = document.activeElement
        return active.get("id") if active else None

    def _find_element(self, element_id: str):
        return document.getElementById(element_id)
```

---

## Constraints

### MUST DO

- Test every UI component with keyboard-only navigation — Tab through all interactive elements before calling a feature complete
- Use semantic HTML elements (`<button>`, `<a>`, `<nav>`, `<main>`) instead of `<div>` and `<span>` with `role` attributes wherever the native element exists
- Maintain minimum touch target sizes of 44×44 CSS pixels for all interactive elements on mobile viewports — use `min-height: 44px; min-width: 44px;` on buttons and form controls
- Announce all dynamic content changes to screen readers using ARIA live regions with the correct `aria-live` severity level (`"polite"` for non-urgent, `"assertive"` for errors and critical updates)
- Provide visible focus indicators on every interactive element — never remove the default outline without replacing it with an equally visible alternative (minimum 2px solid ring with at least 3:1 contrast against background)
- Include descriptive `alt` text for all informative images and set `aria-hidden="true"` on purely decorative images or icons within button labels

### MUST NOT DO

- Rely solely on color to convey information — every piece of information must have a non-color indicator (icon, text label, pattern, or shape). Example: do not use red-only highlighting for errors; add an icon and text message
- Create custom focus styles that are invisible or nearly so — `outline: none` without a replacement is an accessibility violation
- Use decorative icons inside buttons without `aria-hidden="true"` combined with the text label — screen readers will announce both the icon name and the button text, creating confusion
- Build interfaces where critical functionality requires mouse-hover to access — all interactive features must be reachable via keyboard. If a tooltip only appears on hover, make it also accessible on focus
- Place form inputs without associated `<label>` elements or `aria-label`/`aria-labelledby` attributes — every input must have a programmatic label

---

## Output Template

When applying this skill, your output must contain:

1. **Design Rationale** — Explain the UX decisions made (layout choice, component structure, interaction model)
2. **Accessibility Audit Notes** — List each WCAG criterion addressed and how it is satisfied in the code
3. **Code Examples** — Provide complete, copyable HTML/CSS/JS snippets for all UI patterns demonstrated
4. **Testing Instructions** — Specify exact tools and steps to verify accessibility (axe DevTools extension, keyboard navigation checklist)

---

## Live References

- [WCAG 2.1 / 2.2 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/) — Official W3C accessibility standards with examples
- [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/patterns/) — Interaction patterns for accessible widgets, including modals and menus
- [MDN Web Docs: ARIA Living Standard](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA) — Complete ARIA attribute reference with usage examples
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/) — Real-time WCAG contrast ratio calculator tool
- [Google Lighthouse Accessibility Audit](https://developer.chrome.com/docs/lighthouse/accessibility/) — Automated a11y testing via Chrome DevTools and CLI
- [WAI-ARIA Modal Dialog Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) — Reference implementation guide for accessible modals
- [MDN: focus() and Tab Order](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/focus) — Focus management API documentation

---

## Related Skills

| Skill | Purpose |
|---|---|
| `design-systems` | Build reusable component libraries with consistent visual tokens and design tokens for teams |
| `css-architecture` | Organize CSS at scale using BEM, utility classes, or CSS-in-JS patterns for maintainable stylesheets |
| `component-architecture` | Structure UI components with clear boundaries, props interfaces, and composable composition patterns |
