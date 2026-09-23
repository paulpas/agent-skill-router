---
name: react-accessibility-components-patterns
description: "Implements accessible React components using Radix Primitives and React Aria with keyboard navigation, focus management, ARIA attributes, and tested patterns for dialog, menu, combobox, and form elements."
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
  triggers: React, Radix Primitives, react-aria, accessible components, keyboard navigation, focus trap, headless components, accessible patterns
  related-skills: keyboard-navigation-focus-management, semantic-html-aria-accessibility-tree
  archetypes:
    - tactical
    - implementation
  anti_triggers:
    - vue framework
    - svelte framework
    - angular framework
    - backend
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
---

# React Accessibility: Components with Radix & React Aria

Implements accessible React components using Radix Primitives (unstyled, accessible base components) and React Aria (hooks for keyboard behavior, ARIA, and focus management). Covers patterns for Dialog, Menu, Combobox, Select, Popover, Tabs, and Form elements with proper focus management, keyboard event handling, and ARIA attributes. Load when building new React components that require keyboard support and screen reader compatibility.

## TL;DR Checklist

- [ ] Use Radix Primitives or React Aria instead of building custom components
- [ ] Dialog: use `Dialog.Root`, `Dialog.Trigger`, `Dialog.Content` with `FocusTrap`
- [ ] Menu/Dropdown: implement roving tabindex, Arrow/Enter key handling
- [ ] Combobox: manage listbox visibility, selection, filter state
- [ ] Form fields: label → input association, `aria-invalid`, error `role="alert"`
- [ ] Focus: trap on modals, restore on close, visible `:focus-visible` indicator
- [ ] Keyboard: handle Escape, Enter, Space, Arrow keys (↑↓←→)
- [ ] Test with jest-axe + keyboard navigation + screen reader

---

## When to Use

Use this skill when:

- Building new interactive React components (dialog, menu, dropdown, form)
- Ensuring keyboard navigation works correctly (Tab, Arrow keys, Escape)
- Implementing focus management (trap, restore, initial focus)
- Adding ARIA attributes for screen reader announcements
- Using Radix Primitives or React Aria in components
- Testing components with jest-axe and keyboard testing

---

## When NOT to Use

Avoid this skill for:

- HTML form elements that don't need custom styling
- Static content (use semantic HTML directly)
- Non-React frameworks (Vue, Svelte, Angular use different patterns)
- Testing accessibility (use automated-a11y-testing-axe-core)
- Keyboard navigation theory (use keyboard-navigation-focus-management)

---

## Core Workflow

1. **Choose Component Type** — Identify what component you're building (dialog, menu, form field, etc.)
2. **Select Library** — Use Radix Primitives for unstyled base, React Aria for headless behavior
3. **Implement Structure** — Build component using provided hooks/primitives with proper nesting
4. **Add Keyboard Handlers** — Implement Enter, Escape, Arrow key behavior
5. **Manage Focus** — Trap focus in modals, restore on close, set initial focus
6. **Add ARIA** — Use `aria-label`, `aria-describedby`, `aria-expanded`, `role` attributes
7. **Style with Intent** — Use CSS-in-JS or utility classes, ensure `:focus-visible` is visible
8. **Test** — jest-axe for violations, keyboard testing for interaction, screen reader testing

---

## Implementation Patterns

### Pattern 1: Accessible Dialog with Radix

```tsx
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

interface AccessibleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
}

export function AccessibleDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
}: AccessibleDialogProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Set initial focus to close button
  useEffect(() => {
    if (open && closeButtonRef.current) {
      closeButtonRef.current.focus();
    }
  }, [open]);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Trigger asChild>
        <button className="px-4 py-2 bg-blue-600 text-white rounded">
          Open Dialog
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        {/* Backdrop */}
        <Dialog.Overlay className="fixed inset-0 bg-black/50" />

        {/* Dialog */}
        <Dialog.Content
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl max-w-md w-full p-6"
          aria-describedby={description ? 'dialog-description' : undefined}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <Dialog.Title className="text-xl font-bold">{title}</Dialog.Title>
            <Dialog.Close asChild>
              <button
                ref={closeButtonRef}
                className="p-2 hover:bg-gray-100 rounded"
                aria-label="Close dialog"
              >
                <X size={20} />
              </button>
            </Dialog.Close>
          </div>

          {/* Description */}
          {description && (
            <Dialog.Description id="dialog-description" className="text-gray-600 mb-4">
              {description}
            </Dialog.Description>
          )}

          {/* Content */}
          <div className="mb-6">{children}</div>

          {/* Footer with Actions */}
          <div className="flex gap-3 justify-end">
            <Dialog.Close asChild>
              <button className="px-4 py-2 border rounded hover:bg-gray-50">
                Cancel
              </button>
            </Dialog.Close>
            <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
              Confirm
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// Usage
export function DialogExample() {
  const [open, setOpen] = useState(false);

  return (
    <AccessibleDialog
      open={open}
      onOpenChange={setOpen}
      title="Delete Item"
      description="This action cannot be undone."
    >
      <p>Are you sure you want to delete this item?</p>
    </AccessibleDialog>
  );
}
```

**Key points:**
- Radix Dialog handles focus trapping automatically
- Close button gets initial focus (via ref)
- Dialog.Overlay creates modal backdrop
- aria-describedby links description
- Escape key closes automatically (Radix)

### Pattern 2: Accessible Menu with React Aria

```tsx
import { useMenuTrigger, useMenu, useMenuItem } from 'react-aria';
import { useMenuTriggerState, useTreeState } from 'react-stately';
import { useRef } from 'react';

interface MenuProps {
  label: string;
  items: { key: string; label: string; onAction?: () => void }[];
}

export function AccessibleMenu({ label, items }: MenuProps) {
  const state = useMenuTriggerState({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);

  const { menuTriggerProps, menuProps } = useMenuTrigger(
    { onOpenChange: state.setOpen },
    state,
    triggerRef
  );

  return (
    <div className="relative">
      {/* Menu Trigger */}
      <button
        ref={triggerRef}
        {...menuTriggerProps}
        className="px-4 py-2 bg-gray-100 border rounded flex items-center gap-2"
        aria-haspopup="true"
        aria-expanded={state.isOpen}
      >
        {label}
        <span aria-hidden="true">▼</span>
      </button>

      {/* Menu List */}
      {state.isOpen && (
        <ul
          ref={menuRef}
          {...menuProps}
          className="absolute top-full left-0 mt-2 bg-white border rounded shadow-lg min-w-max z-10"
          role="menu"
        >
          {items.map((item, index) => (
            <MenuItemComponent
              key={item.key}
              item={item}
              isActive={index === state.selectionManager?.selectedKey}
              onAction={() => {
                item.onAction?.();
                state.close();
              }}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

interface MenuItemProps {
  item: { key: string; label: string };
  isActive: boolean;
  onAction: () => void;
}

function MenuItemComponent({ item, isActive, onAction }: MenuItemProps) {
  const ref = useRef<HTMLLIElement>(null);
  const { menuItemProps } = useMenuItem(
    { key: item.key, onAction },
    null,
    ref
  );

  return (
    <li
      ref={ref}
      {...menuItemProps}
      className={`px-4 py-2 cursor-pointer hover:bg-gray-100 ${
        isActive ? 'bg-blue-50 font-semibold' : ''
      }`}
      role="menuitem"
    >
      {item.label}
    </li>
  );
}

// Usage
export function MenuExample() {
  return (
    <AccessibleMenu
      label="Options"
      items={[
        { key: 'edit', label: 'Edit', onAction: () => console.log('Edit') },
        { key: 'delete', label: 'Delete', onAction: () => console.log('Delete') },
        { key: 'share', label: 'Share', onAction: () => console.log('Share') },
      ]}
    />
  );
}
```

**Key points:**
- React Aria useMenuTrigger handles keyboard + focus
- Arrow keys navigate menu items
- Enter/Space selects item
- Escape closes menu
- Proper ARIA: aria-haspopup, aria-expanded, role="menu"

### Pattern 3: Accessible Form Field

```tsx
import { useId } from 'react';
import { FieldError, Label, Input } from 'react-aria-components';

interface AccessibleFormFieldProps {
  label: string;
  name: string;
  type?: 'text' | 'email' | 'password' | 'tel';
  required?: boolean;
  error?: string;
  description?: string;
  value: string;
  onChange: (value: string) => void;
}

export function AccessibleFormField({
  label,
  name,
  type = 'text',
  required = false,
  error,
  description,
  value,
  onChange,
}: AccessibleFormFieldProps) {
  const labelId = useId();
  const errorId = useId();
  const descriptionId = useId();

  return (
    <div className="mb-6">
      {/* Label */}
      <label
        id={labelId}
        htmlFor={name}
        className="block text-sm font-medium text-gray-900 mb-2"
      >
        {label}
        {required && (
          <span aria-label="required" className="text-red-600 ml-1">
            *
          </span>
        )}
      </label>

      {/* Description */}
      {description && (
        <p id={descriptionId} className="text-xs text-gray-600 mb-2">
          {description}
        </p>
      )}

      {/* Input */}
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        aria-required={required}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={[
          description ? descriptionId : null,
          error ? errorId : null,
        ]
          .filter(Boolean)
          .join(' ')}
        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
          error
            ? 'border-red-500 bg-red-50'
            : 'border-gray-300 bg-white'
        }`}
      />

      {/* Error Message */}
      {error && (
        <p
          id={errorId}
          className="text-sm text-red-600 mt-2"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
}

// Usage with validation
export function FormExample() {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');

  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (value && !value.includes('@')) {
      setEmailError('Please enter a valid email address');
    } else {
      setEmailError('');
    }
  };

  return (
    <form className="max-w-md">
      <AccessibleFormField
        label="Email Address"
        name="email"
        type="email"
        required
        value={email}
        onChange={handleEmailChange}
        error={emailError}
        description="We'll never share your email with anyone else."
      />

      <button
        type="submit"
        className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Subscribe
      </button>
    </form>
  );
}
```

**Key points:**
- Label properly associated with input (htmlFor)
- aria-describedby links description and error
- aria-invalid indicates invalid state
- Error message has role="alert" for screen readers
- Focus ring visible with :focus style

### Pattern 4: Accessible Combobox with Radix

```tsx
import * as RadixCombobox from '@radix-ui/react-select';
import { useState } from 'react';

interface ComboboxOption {
  value: string;
  label: string;
}

interface AccessibleComboboxProps {
  label: string;
  options: ComboboxOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function AccessibleCombobox({
  label,
  options,
  value,
  onChange,
  placeholder = 'Select an option',
}: AccessibleComboboxProps) {
  return (
    <fieldset className="mb-6">
      <legend className="text-sm font-medium text-gray-900 mb-2">
        {label}
      </legend>

      <RadixCombobox.Root value={value} onValueChange={onChange}>
        <RadixCombobox.Trigger
          className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label={label}
        >
          <RadixCombobox.Value placeholder={placeholder} />
          <RadixCombobox.Icon>▼</RadixCombobox.Icon>
        </RadixCombobox.Trigger>

        <RadixCombobox.Portal>
          <RadixCombobox.Content
            className="bg-white border border-gray-300 rounded-md shadow-lg"
            position="popper"
          >
            <RadixCombobox.Viewport className="max-h-64">
              {options.map((option) => (
                <RadixCombobox.Item
                  key={option.value}
                  value={option.value}
                  className="px-3 py-2 hover:bg-blue-50 cursor-pointer focus:outline-none focus:bg-blue-100"
                >
                  <RadixCombobox.ItemText>{option.label}</RadixCombobox.ItemText>
                  <RadixCombobox.ItemIndicator>✓</RadixCombobox.ItemIndicator>
                </RadixCombobox.Item>
              ))}
            </RadixCombobox.Viewport>
          </RadixCombobox.Content>
        </RadixCombobox.Portal>
      </RadixCombobox.Root>
    </fieldset>
  );
}

// Usage
export function ComboboxExample() {
  const [role, setRole] = useState('');

  return (
    <AccessibleCombobox
      label="Select your role"
      options={[
        { value: 'admin', label: 'Administrator' },
        { value: 'editor', label: 'Editor' },
        { value: 'viewer', label: 'Viewer' },
      ]}
      value={role}
      onChange={setRole}
      placeholder="Choose a role..."
    />
  );
}
```

---

## Focus Management Patterns

### Focus Trap (Modal, Dialog, Popover)

```typescript
import { useEffect, useRef } from 'react';

// Custom hook for focus trapping
export function useFocusTrap(isActive: boolean = true) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        // Shift+Tab: move backward
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab: move forward
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    }

    container.addEventListener('keydown', handleKeyDown);
    firstElement?.focus();

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, [isActive]);

  return containerRef;
}

// Usage in dialog
export function DialogWithFocusTrap() {
  const [open, setOpen] = useState(false);
  const dialogRef = useFocusTrap(open);

  return (
    <>
      <button onClick={() => setOpen(true)}>Open</button>
      {open && (
        <div ref={dialogRef} className="fixed bg-white p-6 rounded shadow-lg">
          <h2>Dialog Title</h2>
          <button onClick={() => setOpen(false)}>Close</button>
          <button>Action</button>
        </div>
      )}
    </>
  );
}
```

### Focus Restoration (Close Dialog)

```typescript
export function useRestoreFocus() {
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const saveFocus = () => {
    previousFocusRef.current = document.activeElement as HTMLElement;
  };

  const restoreFocus = () => {
    previousFocusRef.current?.focus();
  };

  return { saveFocus, restoreFocus };
}

// Usage
export function DialogWithFocusRestore() {
  const { saveFocus, restoreFocus } = useRestoreFocus();
  const [open, setOpen] = useState(false);

  const handleOpen = () => {
    saveFocus();
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    restoreFocus();
  };

  return (
    <>
      <button onClick={handleOpen}>Open Dialog</button>
      {open && (
        <div className="dialog" role="dialog">
          <h2>Dialog Title</h2>
          <button onClick={handleClose}>Close</button>
        </div>
      )}
    </>
  );
}
```

---

## Constraints

### MUST DO

- Use Radix Primitives or React Aria for complex components (dialog, menu, combobox)
- Implement focus trap in modals and restore focus on close
- Trap focus within interactive components using Tab/Shift+Tab
- Make all focus indicators visible (`:focus-visible` with 3:1 contrast minimum)
- Implement keyboard shortcuts (Escape to close, Arrow keys to navigate)
- Associate labels with inputs using htmlFor + id
- Use aria-invalid, aria-required, aria-describedby for form fields
- Test components with jest-axe, keyboard testing, and screen reader

### MUST NOT DO

- Build custom components that duplicate Radix/React Aria functionality
- Remove focus indicators (outline: none) without replacement
- Use disabled form fields without proper feedback
- Implement ARIA roles without keyboard support
- Skip error message announcements (use role="alert")
- Assume mouse-only interaction covers accessibility
- Build focus management without testing with keyboard

---

## Related Patterns

- **Skip Links**: For bypassing repetitive navigation (keyboard users benefit)
- **Roving Tabindex**: Managing focus in lists/grids (only one item in taborder)
- **Portals**: Rendering modals/dropdowns outside component hierarchy (Radix handles)
- **Ref Forwarding**: Exposing container refs for focus management

---

## Testing Checklist

- [ ] jest-axe runs without violations
- [ ] Keyboard navigation works (Tab, Shift+Tab, Arrow keys, Escape, Enter)
- [ ] Focus indicator visible on all interactive elements
- [ ] Screen reader announces component purpose and state
- [ ] Focus traps work (Tab in dialog doesn't escape)
- [ ] Focus restores on modal close
- [ ] Error messages announced with role="alert"

