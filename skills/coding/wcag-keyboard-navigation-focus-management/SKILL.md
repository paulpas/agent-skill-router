---
name: wcag-keyboard-navigation-focus-management
description: Implements WCAG 2.2 AA keyboard navigation (2.1.1) and focus management (2.4.3, 2.4.7, 2.4.11, 2.1.2) patterns including logical tab order, skip links, focus visible, focus traps, and roving tabIndex for accessible web interfaces.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  role: implementation
  scope: implementation
  output-format: code
  triggers: keyboard navigation, focus management, tab order, roving tabindex, focus trap, focus visible, skip link, arrow keys
  related-skills: []
  archetypes: tactical, diagnostic
  anti_triggers: brainstorming, vague ideation
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
---

# WCAG 2.2 AA Keyboard Navigation & Focus Management

Implements keyboard accessibility patterns for WCAG 2.2 AA compliance, enabling full interface navigation via Tab, Shift+Tab, arrow keys, and Escape. Makes keyboard-only users first-class citizens by controlling focus flow, preventing traps, and ensuring all interactive elements are discoverable and visually identifiable.

## When to Use

Use this skill when:

- Building modal dialogs or overlays that must trap focus (prevent Escape-outside navigation while modal is open)
- Designing composite widgets (tabs, menus, listboxes, comboboxes, command palettes) that need arrow key navigation
- Implementing navigation menus or breadcrumbs with explicit tab order control
- Creating skip links to allow keyboard users to bypass repetitive navigation
- Building design systems or component libraries that must support WCAG 2.2 AA certification
- Auditing existing interfaces for keyboard trap violations (WCAG 2.1.2)
- Ensuring focus indicators meet minimum contrast requirements (WCAG 2.4.7)
- Preventing sticky headers/cookie banners from obscuring focused elements (WCAG 2.4.11 AA / 2.4.12 AAA)

## When NOT to Use

Avoid this skill for:

- Simple hyperlinks that don't require custom keyboard handling (native `<a>` tags are keyboard-accessible by default)
- Forms that only use native `<input>`, `<select>`, `<textarea>` elements without custom styling (browser handles tab order automatically)
- Static content without interactive elements (no keyboard interaction needed)
- Touch-only mobile apps that have no keyboard input method (though some assistive tech does use keyboard on mobile)
- Temporary UI states with no focus management implications (e.g., tooltip hover on mouse-over-only)

---

## Core Workflow

1. **Audit Current Tab Order** — Use browser dev tools (`Tab` key + Chrome DevTools Element Inspector) to trace logical focus flow. **Checkpoint:** Does focus move left-to-right, top-to-bottom? Do hidden elements trap focus?

2. **Implement Skip Links** — Add first keyboard stop as a hidden-until-focused link to "#main" content. **Checkpoint:** Pressing `Tab` reveals skip link; clicking goes to main content, not navigation.

3. **Apply Semantic HTML** — Use native elements (`<button>`, `<a>`, `<form>`, `<fieldset>`) before custom divs. Set `tabindex="0"` only for custom interactive elements; never `tabindex="1"` or higher (breaks logical order). **Checkpoint:** Tab order matches visual layout.

4. **Add Focus Visible Styling** — Apply `:focus-visible` with minimum 3px outline, 3:1 contrast ratio. Test with Windows High Contrast Mode. **Checkpoint:** Focus indicator visible at 3:1 contrast; outline doesn't disappear on focus.

5. **Implement Roving TabIndex (Composite Widgets)** — For tabs/menus/listboxes: only one child has `tabindex="0"`, others have `tabindex="-1"`. Arrow keys move focus between children, Tab exits widget. **Checkpoint:** Tab once enters widget at first item; arrow keys navigate; Tab again exits.

6. **Trap Focus in Modals** — Store initial focus, focus first focusable element in modal, trap Tab/Shift+Tab within modal, restore focus on close. **Checkpoint:** Tab cycles within modal only; Escape closes and restores focus.

7. **Prevent Focus Obscured** — Test: tab through page, verify sticky headers don't cover the focused element (test tab backwards through all elements too). **Checkpoint:** 2.4.11 AA compliance: focused element visible with ≥0px visible space; 2.4.12 AAA: ≥6px visible space.

8. **Test with Keyboard Only** — Disable mouse, navigate entire interface with Tab, Shift+Tab, arrow keys, Enter, Escape. **Checkpoint:** Every interactive element reachable; no focus lost; no infinite loops.

---

## Implementation Patterns

### Pattern 1: Skip Link (WCAG 2.4.1 Level A)

**Purpose:** Allow keyboard users to bypass repetitive navigation and jump to main content on first Tab press.

**When:** Always include skip links for any page with navigation menus.

```typescript
// HTML structure
<body>
  {/* Skip link - invisible until focused */}
  <a href="#main-content" className="skip-link">
    Skip to main content
  </a>

  <header>
    <nav>{/* Navigation menu */}</nav>
  </header>

  {/* Target for skip link */}
  <main id="main-content" tabIndex={-1}>
    {/* Page content */}
  </main>
</body>

// CSS for skip link - visible on focus, positioned off-screen by default
.skip-link {
  position: absolute;
  left: -9999px;
  top: 0;
  z-index: 999;
  padding: 12px 16px;
  background-color: #000;
  color: #fff;
  text-decoration: none;
  border-radius: 4px;
  font-weight: 600;
}

.skip-link:focus {
  left: 50%;
  transform: translateX(-50%);
  outline: 3px solid #4A90E2;
  outline-offset: 2px;
}
```

**Key Points:**
- Skip link is first focusable element on page (before logo, nav buttons)
- Target element (`#main-content`) must have `tabIndex={-1}` so it's programmatically focusable
- CSS positions off-screen by default; `:focus` reveals it
- Essential for keyboard-only and screen reader users

---

### Pattern 2: Focus Visible Styling (WCAG 2.4.7 Level AA)

**Purpose:** Provide clear visual focus indicator meeting minimum contrast and visibility requirements.

**Requirements:** ≥3px outline, 3:1 contrast ratio minimum (AA), ≥6px (AAA).

```typescript
// Global focus styles - apply to ALL interactive elements
const focusVisibleStyles = `
  /* Native elements */
  button:focus-visible,
  a:focus-visible,
  input:focus-visible,
  select:focus-visible,
  textarea:focus-visible,
  [role="button"]:focus-visible,
  [role="link"]:focus-visible,
  [role="tab"]:focus-visible,
  [role="menuitem"]:focus-visible,
  [role="option"]:focus-visible {
    outline: 3px solid #4A90E2;  /* 4.5:1 contrast on white bg */
    outline-offset: 2px;
  }

  /* Dark mode adjustment */
  @media (prefers-color-scheme: dark) {
    button:focus-visible,
    a:focus-visible,
    input:focus-visible,
    select:focus-visible,
    textarea:focus-visible,
    [role="button"]:focus-visible,
    [role="link"]:focus-visible,
    [role="tab"]:focus-visible,
    [role="menuitem"]:focus-visible,
    [role="option"]:focus-visible {
      outline-color: #7BB3FF;  /* Light blue for dark backgrounds */
    }
  }

  /* Ensure outline visible on form inputs */
  input:focus-visible,
  textarea:focus-visible,
  select:focus-visible {
    outline: 3px solid #4A90E2;
    outline-offset: 2px;
    /* Remove default browser outline if set */
    box-shadow: none;
  }

  /* Windows High Contrast Mode support */
  @media (prefers-contrast: more) {
    button:focus-visible,
    a:focus-visible,
    input:focus-visible {
      outline: 4px solid;
      outline-offset: 3px;
    }
  }
`;

// React hook: ensure component has focus-visible styling
export const useFocusVisible = (ref: React.RefObject<HTMLElement>) => {
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    
    // Verify :focus-visible styles are applied
    const styles = window.getComputedStyle(element, ':focus-visible');
    const outlineWidth = styles.outlineWidth;
    
    if (!outlineWidth || outlineWidth === '0px') {
      console.warn(
        `Focus visible outline not detected on ${element.tagName}. ` +
        'Ensure CSS includes :focus-visible rules.'
      );
    }
  }, [ref]);
};
```

**Contrast Verification:**
- Test in browser DevTools: Apply `:focus` state, measure outline color vs. background
- Minimum: 3:1 ratio (AA) — typically `#4A90E2` blue on white background
- Enhanced (AAA): 4.5:1 ratio — darker blue or use system focus colors
- Windows High Contrast Mode: Automatically inverts colors; test with `(prefers-contrast: more)` media query

---

### Pattern 3: Modal Focus Trap (WCAG 2.1.2 No Keyboard Trap)

**Purpose:** Trap focus inside modal dialog, preventing keyboard user from navigating outside. Release trap on close and restore initial focus.

**Key Requirement:** Modal must trap focus *intentionally* and provide clear escape mechanism (Escape key or explicit Close button).

```typescript
// React hook: manage focus trap in modal
export const useFocusTrap = (
  modalRef: React.RefObject<HTMLDivElement>,
  onClose: () => void,
  isOpen: boolean
) => {
  const [initialFocus, setInitialFocus] = React.useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen || !modalRef.current) return;

    // 1. Store element that had focus before modal opened
    setInitialFocus(document.activeElement as HTMLElement);

    // 2. Get all focusable elements inside modal
    const getFocusableElements = (): HTMLElement[] => {
      const focusableSelectors = [
        'a[href]',
        'button:not([disabled])',
        'input:not([disabled])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        '[tabindex]:not([tabindex="-1"])',
      ].join(',');

      return Array.from(
        modalRef.current?.querySelectorAll(focusableSelectors) ?? []
      ) as HTMLElement[];
    };

    const focusableElements = getFocusableElements();
    if (focusableElements.length === 0) {
      console.warn('Modal has no focusable elements; trap may not work as expected.');
      return;
    }

    // 3. Focus first focusable element on modal open
    const firstElement = focusableElements[0];
    firstElement.focus();

    // 4. Handle Tab/Shift+Tab to cycle focus within modal
    const handleKeyDown = (event: KeyboardEvent) => {
      const isTabKey = event.key === 'Tab';
      const isEscapeKey = event.key === 'Escape';

      if (isEscapeKey) {
        // Allow Escape to close modal
        onClose();
        return;
      }

      if (!isTabKey) return;

      const lastElement = focusableElements[focusableElements.length - 1];
      const isShiftTab = event.shiftKey;

      // Trap Tab at end: move to first element
      if (document.activeElement === lastElement && !isShiftTab) {
        event.preventDefault();
        firstElement.focus();
        return;
      }

      // Trap Shift+Tab at start: move to last element
      if (document.activeElement === firstElement && isShiftTab) {
        event.preventDefault();
        lastElement.focus();
        return;
      }
    };

    // 5. Trap focus: prevent Tab from leaving modal
    const modal = modalRef.current;
    modal.addEventListener('keydown', handleKeyDown);

    return () => {
      // 6. Cleanup: remove trap and restore initial focus
      modal.removeEventListener('keydown', handleKeyDown);
      
      // Restore focus to element that was focused before modal opened
      if (initialFocus && document.body.contains(initialFocus)) {
        initialFocus.focus();
      }
    };
  }, [isOpen, modalRef, onClose]);
};

// Example usage
export const Modal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}> = ({ isOpen, onClose, title, children }) => {
  const modalRef = React.useRef<HTMLDivElement>(null);
  useFocusTrap(modalRef, onClose, isOpen);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop: prevent interaction outside modal */}
      <div
        role="presentation"
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 999,
        }}
      />

      {/* Modal dialog */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: '#fff',
          padding: '24px',
          borderRadius: '8px',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
          zIndex: 1000,
          maxWidth: '500px',
          width: '90%',
          maxHeight: '80vh',
          overflowY: 'auto',
        }}
      >
        <h2 id="modal-title">{title}</h2>
        {children}

        {/* Close button - always focusable, allows Escape alternative */}
        <button
          onClick={onClose}
          style={{
            marginTop: '16px',
            padding: '8px 16px',
            backgroundColor: '#f0f0f0',
            border: '1px solid #ccc',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Close (or press Escape)
        </button>
      </div>
    </>
  );
};
```

**Critical Details:**
- Store initial focus *before* modal opens; restore on close
- Focus first element when modal opens (explicit focus, not default browser behavior)
- Trap Tab/Shift+Tab at modal boundaries
- Allow Escape key as primary close mechanism (users expect this)
- Modal must be in DOM but visually hidden when `isOpen={false}` (simplifies cleanup)
- Dialog must have `role="dialog"` and `aria-modal="true"`

---

### Pattern 4: Roving TabIndex for Composite Widgets (WCAG 2.1.1)

**Purpose:** Manage focus for composite widgets (tabs, menu, listbox, command palette) where only one child is in tab order (`tabindex="0"`). Arrow keys move focus between children without leaving widget.

**Example: Accessible Tab Component**

```typescript
export const TabsAccessible: React.FC<{
  tabs: Array<{ id: string; label: string; content: React.ReactNode }>;
}> = ({ tabs }) => {
  const [activeTabId, setActiveTabId] = React.useState(tabs[0].id);
  const tabListRef = React.useRef<HTMLDivElement>(null);
  const tabRefs = React.useRef<Record<string, HTMLButtonElement>>({});

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    const tabIds = tabs.map((t) => t.id);
    const currentIndex = tabIds.indexOf(activeTabId);

    let nextIndex: number | null = null;

    switch (event.key) {
      // Arrow Left: move to previous tab (circular)
      case 'ArrowLeft': {
        event.preventDefault();
        nextIndex = (currentIndex - 1 + tabIds.length) % tabIds.length;
        break;
      }
      // Arrow Right: move to next tab (circular)
      case 'ArrowRight': {
        event.preventDefault();
        nextIndex = (currentIndex + 1) % tabIds.length;
        break;
      }
      // Home: jump to first tab
      case 'Home': {
        event.preventDefault();
        nextIndex = 0;
        break;
      }
      // End: jump to last tab
      case 'End': {
        event.preventDefault();
        nextIndex = tabIds.length - 1;
        break;
      }
      default:
        return;
    }

    if (nextIndex !== null) {
      const nextTabId = tabIds[nextIndex];
      setActiveTabId(nextTabId);
      // Focus the new tab button
      setTimeout(() => tabRefs.current[nextTabId]?.focus());
    }
  };

  return (
    <div>
      {/* Tab list: role="tablist" */}
      <div
        ref={tabListRef}
        role="tablist"
        style={{
          display: 'flex',
          borderBottom: '2px solid #e0e0e0',
          marginBottom: '16px',
        }}
      >
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            ref={(el) => {
              if (el) tabRefs.current[tab.id] = el;
            }}
            role="tab"
            aria-selected={activeTabId === tab.id}
            aria-controls={`panel-${tab.id}`}
            // Roving tabindex: only active tab is in tab order
            tabIndex={activeTabId === tab.id ? 0 : -1}
            onClick={() => setActiveTabId(tab.id)}
            onKeyDown={handleKeyDown}
            style={{
              padding: '12px 16px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              borderBottom: activeTabId === tab.id ? '3px solid #4A90E2' : 'none',
              color: activeTabId === tab.id ? '#000' : '#666',
              fontWeight: activeTabId === tab.id ? 'bold' : 'normal',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab panels */}
      {tabs.map((tab) => (
        <div
          key={`panel-${tab.id}`}
          role="tabpanel"
          id={`panel-${tab.id}`}
          aria-labelledby={tab.id}
          hidden={activeTabId !== tab.id}
          style={{ padding: '16px' }}
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
};

// Usage example
export const TabsExample = () => (
  <TabsAccessible
    tabs={[
      { id: 'tab-1', label: 'Overview', content: <p>Overview content</p> },
      { id: 'tab-2', label: 'Details', content: <p>Details content</p> },
      { id: 'tab-3', label: 'Settings', content: <p>Settings content</p> },
    ]}
  />
);
```

**Roving TabIndex Rules:**
- Only one child has `tabindex="0"` (in tab order)
- All other children have `tabindex="-1"` (focusable programmatically, but not by Tab key)
- Arrow/Home/End keys move focus *within* the widget
- Tab key moves focus *out of* the widget (to next widget or end of page)
- Parent wrapper has `role="tablist"` (or `role="menu"`, `role="listbox"` depending on widget type)
- Each child has appropriate role: `role="tab"`, `role="menuitem"`, `role="option"`, etc.
- Update `aria-selected` when focus moves to reflect selected state

---

### Pattern 5: Focus Not Obscured - Prevent Sticky Headers (WCAG 2.4.11 AA / 2.4.12 AAA)

**Purpose:** Ensure focused elements are not covered by sticky headers, cookie banners, or other fixed overlays.

**Testing:** Tab *backward* through all elements to verify no sticky elements cover focused items.

```typescript
// Strategy 1: Adjust scroll position when element is focused
export const useFocusNotObscured = () => {
  const handleFocus = (event: FocusEvent) => {
    const focusedElement = event.target as HTMLElement;
    if (!focusedElement) return;

    // Get bounding rect of focused element
    const rect = focusedElement.getBoundingClientRect();

    // Check if element is obscured by viewport-fixed elements (headers, footers)
    const stickyHeaderHeight = 60; // Height of sticky header
    
    // If focused element is in the sticky header zone, scroll it down
    if (rect.top < stickyHeaderHeight) {
      focusedElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Add extra padding to account for header
      window.scrollBy({ top: -stickyHeaderHeight, behavior: 'smooth' });
    }

    // Similar check for bottom sticky elements
    const stickyFooterHeight = 50;
    if (rect.bottom > window.innerHeight - stickyFooterHeight) {
      focusedElement.scrollIntoView({ behavior: 'smooth', block: 'end' });
      window.scrollBy({ top: stickyFooterHeight, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    document.addEventListener('focus', handleFocus, true);
    return () => {
      document.removeEventListener('focus', handleFocus, true);
    };
  }, []);
};

// Strategy 2: CSS - ensure sticky header has lower z-index than focused content
const stickyHeaderStyles = `
  header.sticky {
    position: sticky;
    top: 0;
    z-index: 100;  /* Below focused content */
    background: white;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  /* Focused elements should be above sticky header */
  *:focus-visible {
    z-index: 101;
    outline: 3px solid #4A90E2;
    outline-offset: 2px;
  }

  /* Cookie banner: similar treatment */
  .cookie-banner {
    position: fixed;
    bottom: 0;
    z-index: 100;
    width: 100%;
    padding: 16px;
    background: #333;
    color: white;
  }

  /* Ensure close button is visible */
  .cookie-banner button:focus-visible {
    z-index: 101;
    outline: 3px solid #FFD700;  /* High contrast on dark background */
  }
`;

// React component ensuring focus is visible
export const ScrollWithoutObscuring: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  useFocusNotObscured();

  return <div>{children}</div>;
};
```

**Testing for 2.4.11 AA Compliance:**
1. Tab forward through all elements — verify no sticky header covers focused element
2. Tab *backward* through all elements — test that tabbing backward also doesn't get obscured
3. Minimum visible space: ≥0px (any part of focus indicator visible counts as compliance)

**Testing for 2.4.12 AAA Compliance:**
- Same as above, but with minimum ≥6px of the focused element visible (not just outline)
- More stringent: requires substantial portion of element to be visible

---

## Constraints

### MUST DO

- Always use semantic HTML elements (`<button>`, `<a>`, `<form>`) before custom divs — they provide keyboard accessibility for free
- Apply `:focus-visible` styling to *all* interactive elements (buttons, links, inputs, custom components)
- Ensure focus indicator has ≥3:1 contrast ratio (AA) / ≥4.5:1 (AAA) against background
- Use roving `tabindex` pattern for composite widgets (tabs, menus, listboxes) — only one child in tab order
- Trap focus inside modals and provide clear Escape key exit; restore initial focus on close
- Test with keyboard only: Tab, Shift+Tab, arrow keys, Enter, Escape — no mouse allowed
- Include skip link as first focusable element on pages with navigation
- Tab order must match visual left-to-right, top-to-bottom layout — never use `tabindex="1"` or higher (breaks logical order)
- Verify focused elements are not obscured by sticky headers or overlays (scroll focus into view if needed)
- Test focus visible in Windows High Contrast Mode and dark mode (use `prefers-color-scheme: dark` media queries)

### MUST NOT DO

- Use `tabindex="1"` or any positive tabindex value (breaks natural tab order and confuses keyboard users)
- Hide focus indicators (`outline: none` without replacement) — this creates keyboard traps
- Apply focus styles to non-interactive elements (divs, spans with click handlers) — use semantic elements or `role="button"` + proper ARIA
- Forget to set `aria-modal="true"` and `role="dialog"` on modal elements
- Allow Tab key to move focus outside modal before close — implement focus trap or test will fail WCAG 2.1.2
- Use `visibility: hidden` or `display: none` on focusable elements without removing them from tab order — browser ignores them anyway
- Rely on mouse-only interactions (hover states without focus states) — keyboard users see nothing
- Forget to handle Escape key in modals and dropdowns — users expect this
- Use `pointer-events: none` on focused elements — it doesn't prevent keyboard focus, creates inconsistency
- Obscure focused element with sticky headers/banners without scrolling it into clear view

---

## Output Template

When implementing keyboard navigation and focus management, your output must include:

1. **HTML Structure** — Semantic markup with appropriate `role` attributes, `aria-*` properties, and `tabindex` values
2. **CSS Focus Styles** — `:focus-visible` rules with ≥3px outline, proper contrast ratio, and dark mode support
3. **JavaScript/TypeScript** — Focus trap hooks, roving tabindex handlers, arrow key navigation, Escape key listeners
4. **Testing Checklist** — Keyboard-only navigation steps (Tab, Shift+Tab, arrow keys, Escape)
5. **WCAG Criteria Reference** — Explicitly note which criteria are satisfied (2.1.1 Keyboard, 2.1.2 No Keyboard Trap, 2.4.3 Focus Order, 2.4.7 Focus Visible, 2.4.11 Focus Not Obscured AA, 2.4.12 Focus Not Obscured AAA)
6. **Edge Cases** — Document how implementation handles:
   - Modal with no focusable elements
   - Composite widget with dynamically added/removed children
   - Focus restoration after modal close
   - Sticky headers and focus obscuration
   - Windows High Contrast Mode

**Example Output Structure:**
```
# Keyboard Navigation Implementation for [Component]

## WCAG Compliance
- ✅ 2.1.1 Keyboard: All functionality via keyboard
- ✅ 2.1.2 No Keyboard Trap: Focus can escape with Escape key
- ✅ 2.4.3 Focus Order: Tab order follows visual layout
- ✅ 2.4.7 Focus Visible: 3px outline, 4.5:1 contrast
- ✅ 2.4.11 Focus Not Obscured (AA): 0px minimum visible
- ✅ 2.4.12 Focus Not Obscured (AAA): 6px minimum visible

## Code
[HTML + CSS + TypeScript]

## Testing
1. Tab through component — verify focus moves left-to-right
2. Shift+Tab backward — verify same elements are reachable
3. Arrow keys (if composite widget) — verify navigation
4. Escape (if modal) — verify close and focus restoration
5. Windows High Contrast Mode — verify outline visible
```

---

## TL;DR for Code Generation

When generating keyboard navigation code, ensure:

- [ ] Semantic HTML used (`<button>`, `<a>`, not `<div role="button">` unless necessary)
- [ ] `:focus-visible` styles applied with ≥3px outline and 3:1 contrast minimum
- [ ] Roving `tabindex` implemented for composite widgets (tabs, menus): only active child has `tabindex="0"`
- [ ] Arrow key handlers for: Left/Right (horizontal navigation), Up/Down (vertical), Home (first), End (last)
- [ ] Focus trap in modals: store initial focus, trap Tab/Shift+Tab, restore on close
- [ ] Skip links: first focusable element, links to `#main-content` or similar
- [ ] Escape key handling in modals/dropdowns/command palettes
- [ ] Focus not obscured: scroll focused element into view if covered by sticky header
- [ ] ARIA roles/attributes: `aria-selected`, `aria-expanded`, `aria-modal`, `aria-labelledby`
- [ ] Test keyboard-only: Tab, Shift+Tab, arrow keys, Enter, Escape — no mouse
- [ ] Windows High Contrast Mode: verify outline visible with `(prefers-contrast: more)` media query
- [ ] Dark mode: verify focus outline visible against dark backgrounds (`prefers-color-scheme: dark`)

---

## Related Resources

- [WCAG 2.2 Level AA Success Criteria](https://www.w3.org/WAI/WCAG22/quickref/)
- [ARIA Authoring Practices Guide (APG)](https://www.w3.org/WAI/ARIA/apg/) — Patterns for tabs, menus, modals
- [MDN: Keyboard Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility/Keyboard-navigable_custom_components)
- [Chrome DevTools Accessibility Inspector](https://developer.chrome.com/docs/devtools/accessibility/reference/)
- [WebAIM: Keyboard Accessibility](https://webaim.org/articles/keyboard/)

---

## Common Pitfalls & Solutions

| Problem | Cause | Solution |
|---------|-------|----------|
| Tab order jumps around (not left-to-right) | Positive `tabindex` values used | Remove all `tabindex` except 0 and -1; rely on DOM order |
| Focus disappears on click | `:focus` styles removed without `:focus-visible` replacement | Use `:focus-visible` instead of `:focus`; always provide outline |
| Modal user can Tab outside | Focus trap not implemented | Use `useFocusTrap` hook; trap Tab at first/last focusable element |
| Arrow keys don't work in tabs/menu | Roving tabindex pattern not implemented | Set inactive children to `tabindex="-1"`; add `onKeyDown` handler for arrow keys |
| Sticky header covers focused element | No scroll handling on focus | Add `scrollIntoView()` or adjust `window.scrollBy()` when element focused |
| Focus invisible in High Contrast Mode | Outline color not matching system colors | Use `(prefers-contrast: more)` media query; test in Windows settings |
| Keyboard user can't see current focus | Focus indicator too subtle | Ensure ≥3px outline, ≥3:1 contrast; use bright colors (e.g., `#4A90E2` blue) |

