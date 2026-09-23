---
name: keyboard-navigation-focus-management
description: "Implements keyboard accessibility and focus management: focus APIs, roving tabindex, focus trapping in modals, focus restoration on close, visible focus indicators, keyboard event handlers for Enter/Space/Escape/Arrow keys, and skip links."
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
  triggers: keyboard navigation, focus management, roving tabindex, focus trap, visible focus, tabindex, Escape key, keyboard events
  related-skills: semantic-html-aria-accessibility-tree, react-accessibility-components-patterns
  archetypes:
    - tactical
    - implementation
  anti_triggers:
    - mouse-only design
    - brainstorming
    - styling-only
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
---

# Keyboard Navigation & Focus Management

Implements keyboard accessibility and focus management for interactive components: focus APIs (focus(), setFocusVisible), focus-visible pseudo-class, tabindex patterns (0/-1), roving tabindex for lists, focus trapping in modals, focus restoration on close, keyboard event handlers for Enter/Space/Escape/Arrow keys, and skip links. Load when implementing interactive components, fixing keyboard navigation issues, or managing focus in complex UIs.

## TL;DR Checklist

- [ ] Make all interactive elements reachable via Tab key
- [ ] Implement visible `:focus-visible` indicator (never `outline: none`)
- [ ] Use `tabindex="0"` to include in natural tab order
- [ ] Use `tabindex="-1"` for elements focusable by script only
- [ ] Implement roving tabindex for lists/grids (only one in tab order)
- [ ] Trap focus in modals (Tab at end jumps to first)
- [ ] Restore focus when modal closes
- [ ] Handle Escape key to close modals/dropdowns
- [ ] Implement skip links for keyboard users
- [ ] Test with Tab, Shift+Tab, Arrow keys, Enter, Space, Escape

---

## When to Use

Use this skill when:

- Building interactive components (menu, dialog, tabs, listbox, combobox)
- Fixing keyboard navigation issues in existing components
- Implementing focus management in modals or complex UIs
- Adding keyboard shortcut handlers
- Ensuring Tab key navigates through page logically
- Testing keyboard-only navigation

---

## When NOT to Use

Avoid this skill for:

- Basic HTML forms (native behavior sufficient)
- Styling focus indicators (that's CSS-focused)
- Framework-specific patterns (use React/Vue-specific skills)
- Screen reader testing (different skill)

---

## Keyboard Navigation Foundation

### Understanding Focus

**Focus** is the current interactive element that receives keyboard input. Only one element can have focus at a time.

**Focusable elements by default:**
- `<button>`, `<a href>`, `<input>`, `<textarea>`, `<select>`
- Elements with `tabindex="0"` or positive tabindex
- Elements with `tabindex="-1"` (focusable by script only)

**Not focusable by default:**
- `<div>`, `<span>`, `<p>`, `<h1>` (etc.)
- Disabled form elements

### Tab Order

Default tab order follows DOM order. Can be influenced by `tabindex`:

```html
<!-- DOM Order (natural tab order) -->
<button>1</button>      <!-- Tab 1st -->
<input>                  <!-- Tab 2nd -->
<button>                 <!-- Tab 3rd -->

<!-- With tabindex (avoid if possible!) -->
<button tabindex="2">    <!-- Tab 2nd -->
<input tabindex="1">     <!-- Tab 1st -->
<button tabindex="3">    <!-- Tab 3rd -->

<!-- ⚠️ AVOID tabindex > 0 — causes confusion and maintenance burden -->
```

---

## Implementation Patterns

### Pattern 1: Focus Visible Indicator

```css
/* ✅ GOOD: Visible focus indicator using :focus-visible */
button:focus-visible {
  outline: 3px solid #2563eb;
  outline-offset: 2px;
}

input:focus-visible {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

a:focus-visible {
  outline: 2px dashed #2563eb;
}

/* High contrast mode support */
@media (prefers-contrast: more) {
  button:focus-visible {
    outline-width: 4px;
  }
}

/* ❌ BAD: Removing focus indicator without replacement -->
button:focus {
  outline: none; /* Keyboard users can't see focus! */
}

/* Remove default outline if replacing with custom */
button {
  outline: none;
}

button:focus-visible {
  /* Custom indicator here */
  border: 2px solid #2563eb;
}
```

**Key pattern:** Use `:focus-visible` (shows for keyboard) not `:focus` (shows for all).

### Pattern 2: Making Elements Focusable

```html
<!-- Focusable by default (no tabindex needed) -->
<button>Click me</button>
<a href="/">Link</a>
<input type="text">

<!-- Make div focusable by script (tabindex="-1") -->
<div tabindex="-1" id="message">
  Dynamic message (can be focused programmatically)
</div>

<!-- Include in tab order (tabindex="0") -->
<div tabindex="0" role="button" @click="handleClick">
  Custom button (now in tab order)
</div>

<!-- ❌ AVOID: Positive tabindex (causes confusion) -->
<div tabindex="1">Too early</div>
<div tabindex="2">Too late</div>

<!-- ✅ BETTER: Fix DOM order instead -->
<div>Correct order</div>
<div>Without tabindex needed</div>
```

### Pattern 3: Roving Tabindex for Lists/Grids

Roving tabindex pattern: Only one item in tab order, Arrow keys move focus within list.

```typescript
// Roving tabindex hook
export function useRovingTabindex(items: string[]) {
  const [activeIndex, setActiveIndex] = useState(0);
  const itemRefs = useRef<HTMLElement[]>([]);

  useEffect(() => {
    itemRefs.current[activeIndex]?.focus();
  }, [activeIndex]);

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    switch (e.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        e.preventDefault();
        setActiveIndex((prev) => (prev + 1) % items.length);
        break;
      case 'ArrowUp':
      case 'ArrowLeft':
        e.preventDefault();
        setActiveIndex((prev) => (prev - 1 + items.length) % items.length);
        break;
      case 'Home':
        e.preventDefault();
        setActiveIndex(0);
        break;
      case 'End':
        e.preventDefault();
        setActiveIndex(items.length - 1);
        break;
    }
  };

  return {
    activeIndex,
    itemRefs,
    handleKeyDown,
  };
}

// Usage in list component
export function AccessibleList({ items }: { items: string[] }) {
  const { activeIndex, itemRefs, handleKeyDown } = useRovingTabindex(items);

  return (
    <ul role="listbox">
      {items.map((item, index) => (
        <li key={index}>
          <button
            ref={(el) => {
              if (el) itemRefs.current[index] = el;
            }}
            role="option"
            aria-selected={index === activeIndex}
            tabIndex={index === activeIndex ? 0 : -1}
            onKeyDown={(e) => handleKeyDown(e, index)}
          >
            {item}
          </button>
        </li>
      ))}
    </ul>
  );
}
```

**Key pattern:**
- Only active item has `tabindex="0"` (in tab order)
- Other items have `tabindex="-1"` (focusable by script)
- Arrow keys change which item is active
- Active item automatically focused

### Pattern 4: Focus Trap in Modal

```typescript
export function useFocusTrap(isActive: boolean = true) {
  const containerRef = useRef<HTMLDivElement>(null);
  const firstElementRef = useRef<HTMLElement | null>(null);
  const lastElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    // Get all focusable elements
    const focusableSelector = 
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const focusable = Array.from(
      containerRef.current.querySelectorAll(focusableSelector)
    ) as HTMLElement[];

    firstElementRef.current = focusable[0];
    lastElementRef.current = focusable[focusable.length - 1];

    // Focus first element on mount
    firstElementRef.current?.focus();

    // Handle Tab/Shift+Tab at boundaries
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        // Shift+Tab at first element → jump to last
        if (document.activeElement === firstElementRef.current) {
          e.preventDefault();
          lastElementRef.current?.focus();
        }
      } else {
        // Tab at last element → jump to first
        if (document.activeElement === lastElementRef.current) {
          e.preventDefault();
          firstElementRef.current?.focus();
        }
      }
    }

    containerRef.current.addEventListener('keydown', handleKeyDown);

    return () => {
      containerRef.current?.removeEventListener('keydown', handleKeyDown);
    };
  }, [isActive]);

  return containerRef;
}

// Usage in modal/dialog
export function Modal({ isOpen, onClose }) {
  const modalRef = useFocusTrap(isOpen);

  return (
    isOpen && (
      <div ref={modalRef} role="dialog" aria-modal="true">
        <h2>Dialog Title</h2>
        <p>Dialog content</p>
        <button onClick={onClose}>Close</button>
        <button>Action 1</button>
        <button>Action 2</button>
      </div>
    )
  );
}
```

### Pattern 5: Focus Restoration on Close

```typescript
export function useRestoreFocus() {
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const saveFocus = () => {
    previousFocusRef.current = document.activeElement as HTMLElement;
  };

  const restoreFocus = () => {
    setTimeout(() => {
      previousFocusRef.current?.focus();
    }, 0);
  };

  return { saveFocus, restoreFocus };
}

// Usage
export function Modal({ isOpen, onClose }) {
  const { saveFocus, restoreFocus } = useRestoreFocus();

  const handleOpen = () => {
    saveFocus();
    // Open modal
  };

  const handleClose = () => {
    // Close modal
    onClose();
    // Restore focus to trigger button
    restoreFocus();
  };

  return (
    <>
      <button onClick={handleOpen}>Open Modal</button>
      {isOpen && (
        <div role="dialog">
          <h2>Dialog</h2>
          <button onClick={handleClose}>Close</button>
        </div>
      )}
    </>
  );
}
```

### Pattern 6: Keyboard Event Handlers

```typescript
// Generic keyboard handler
export function useKeyboardNavigation(callbacks: {
  onEnter?: () => void;
  onEscape?: () => void;
  onSpace?: () => void;
  onArrowUp?: () => void;
  onArrowDown?: () => void;
  onArrowLeft?: () => void;
  onArrowRight?: () => void;
  onHome?: () => void;
  onEnd?: () => void;
}) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'Enter':
        callbacks.onEnter?.();
        break;
      case ' ':
        callbacks.onSpace?.();
        break;
      case 'Escape':
        callbacks.onEscape?.();
        break;
      case 'ArrowUp':
        callbacks.onArrowUp?.();
        break;
      case 'ArrowDown':
        callbacks.onArrowDown?.();
        break;
      case 'ArrowLeft':
        callbacks.onArrowLeft?.();
        break;
      case 'ArrowRight':
        callbacks.onArrowRight?.();
        break;
      case 'Home':
        callbacks.onHome?.();
        break;
      case 'End':
        callbacks.onEnd?.();
        break;
    }
  };

  return handleKeyDown;
}

// Usage in menu component
export function Menu() {
  const [activeIndex, setActiveIndex] = useState(0);

  const handleKeyDown = useKeyboardNavigation({
    onEnter: () => console.log('Select'),
    onEscape: () => console.log('Close'),
    onArrowDown: () => setActiveIndex((i) => i + 1),
    onArrowUp: () => setActiveIndex((i) => i - 1),
  });

  return (
    <ul onKeyDown={handleKeyDown} role="menu">
      <li role="menuitem">Option 1</li>
      <li role="menuitem">Option 2</li>
      <li role="menuitem">Option 3</li>
    </ul>
  );
}
```

### Pattern 7: Skip Links

```html
<!-- Skip link (appears on Tab, hidden visually) -->
<a href="#main" class="skip-link">Skip to main content</a>

<header>
  <nav>
    <!-- Navigation with many links -->
  </nav>
</header>

<main id="main">
  <!-- Main content -->
</main>

<style>
  .skip-link {
    position: absolute;
    top: -40px;
    left: 0;
    background: #000;
    color: #fff;
    padding: 8px;
    text-decoration: none;
    z-index: 100;
  }

  .skip-link:focus {
    top: 0;
  }
</style>
```

---

## Keyboard Event Reference

### Standard Keys for Web Components

| Key | Element | Action |
|-----|---------|--------|
| **Enter** | Button, Link | Activate |
| **Space** | Button, Checkbox | Toggle/Activate |
| **Escape** | Modal, Menu, Popup | Close |
| **Tab** | Any | Move focus to next |
| **Shift+Tab** | Any | Move focus to previous |
| **↑ ↓ ← →** | Menu, List, Tree, Tabs | Navigate |
| **Home** | Menu, List | Jump to first |
| **End** | Menu, List | Jump to last |

### Preventing Default Behavior

```typescript
function handleKeyDown(e: React.KeyboardEvent) {
  if (e.key === 'Enter') {
    e.preventDefault(); // Prevent form submission
    // Custom behavior here
  }
}
```

---

## Focus Management Checklist

**Implementation:**
- [ ] All interactive elements keyboard accessible
- [ ] Tab order logical (matches visual layout)
- [ ] Focus indicator visible (3:1 contrast minimum)
- [ ] No keyboard traps (Tab can always escape)
- [ ] Modals trap focus (Tab loops within modal)
- [ ] Focus restored when modal closes
- [ ] Arrow keys work in lists/menus (roving tabindex)
- [ ] Escape closes modals/dropdowns
- [ ] Skip link bypasses navigation

**Testing:**
- [ ] Tab through entire page
- [ ] Verify tab order matches visual order
- [ ] Test focus trap in modal (Tab doesn't escape)
- [ ] Verify focus restoration on close
- [ ] Test keyboard shortcuts (Enter, Space, Escape, Arrows)
- [ ] Test with keyboard only (no mouse)
- [ ] Test with screen reader (focus announcements)

---

## Constraints

### MUST DO

- Make all interactive elements keyboard accessible (Tab key)
- Implement visible `:focus-visible` indicator (never just `outline: none`)
- Use `tabindex="0"` for elements that need to be in tab order
- Use `tabindex="-1"` for elements focusable by script only
- Trap focus in modals (Tab wraps to first/last)
- Restore focus when closing modals
- Handle Escape key to close modals/dropdowns
- Test keyboard-only navigation thoroughly

### MUST NOT DO

- Remove focus indicators without replacement (breaks keyboard access)
- Use `tabindex > 0` (causes confusion; fix DOM order instead)
- Trap focus without providing escape (Escape key must work)
- Assume mouse users find all interactive elements
- Leave modals without focus management
- Skip testing keyboard navigation in QA
- Use `onBlur` to prevent focus management (breaks assistive tech)

---

## Common Keyboard Navigation Bugs

### Bug 1: No Visible Focus Indicator

```css
/* ❌ BAD: Focus invisible -->
button:focus { outline: none; }

/* ✅ FIX: Provide visible indicator -->
button:focus-visible { outline: 3px solid #2563eb; }
```

### Bug 2: Keyboard Trap (Can't Escape)

```typescript
// ❌ BAD: Tab traps in modal, Escape doesn't work
function Modal() {
  return <div role="dialog"><!-- content --></div>;
}

// ✅ FIX: Add focus trap + Escape handler
function Modal() {
  const ref = useFocusTrap(true);
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  };
  return <div ref={ref} role="dialog" onKeyDown={handleKeyDown}>...</div>;
}
```

### Bug 3: Focus Not Restored

```typescript
// ❌ BAD: Opening modal loses track of trigger button
<button onClick={() => setOpen(true)}>Open</button>

// ✅ FIX: Save and restore focus
const { saveFocus, restoreFocus } = useRestoreFocus();

const handleOpen = () => {
  saveFocus();
  setOpen(true);
};

const handleClose = () => {
  setOpen(false);
  restoreFocus();
};
```

---

## Testing Keyboard Navigation

### Manual Testing Steps

1. **Tab through entire page** — Verify order matches visual layout
2. **Use only keyboard** — Close trackpad, use only keyboard
3. **Test modals** — Tab in modal, Escape closes, focus restores
4. **Test menus** — Arrow keys navigate, Enter selects, Escape closes
5. **Test lists** — Home/End jump to edges, Arrow keys navigate
6. **Verify focus visible** — Can always see current focus

### Automated Testing

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

test('keyboard navigation works in menu', async () => {
  const user = userEvent.setup();
  render(
    <Menu items={['Option 1', 'Option 2', 'Option 3']} />
  );

  const trigger = screen.getByRole('button', { name: /open menu/i });

  // Open menu with keyboard
  trigger.focus();
  await user.keyboard('{Enter}');

  // Navigate with arrow keys
  await user.keyboard('{ArrowDown}');
  expect(screen.getByText('Option 2')).toHaveFocus();

  await user.keyboard('{ArrowUp}');
  expect(screen.getByText('Option 1')).toHaveFocus();

  // Close with Escape
  await user.keyboard('{Escape}');
  expect(trigger).toHaveFocus();
});
```

