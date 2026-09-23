---
name: wcag-form-accessibility-nodejs
description: Implements WCAG 2.2 AA form accessibility patterns for Node.js/JavaScript (server-side rendering, React/Next.js), including label-to-input association, error identification, focus management, dynamic updates with aria-live, and form state management with aria-invalid/aria-required.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  role: implementation
  scope: implementation
  output-format: code
  triggers: wcag form accessibility, form validation a11y, aria-invalid, aria-describedby, screen reader forms, keyboard form navigation, next.js server actions forms, how do i make accessible forms
  related-skills: []
  archetypes: tactical
  anti_triggers: brainstorming, vague ideation
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
---

# WCAG Form Accessibility for Node.js/JavaScript

Implements WCAG 2.2 AA compliant form rendering and validation patterns for server-side and client-side JavaScript. When loaded, this skill enables building forms that are fully operable via keyboard, properly announced to screen readers, and resilient to validation errors. Covers label-to-input association (1.3.1), error messaging (3.3.1), focus management (2.4.3), and dynamic content updates (4.1.3).

## TL;DR Checklist

- [ ] Every `<input>`, `<select>`, and `<textarea>` has an associated `<label>` with `for="input-id"` attribute matching the input's `id`
- [ ] Form submission errors are rendered in a container with `role="alert"` or `aria-live="assertive"` to announce immediately to screen readers
- [ ] Each input with validation errors has `aria-invalid="true"` and `aria-describedby="error-id"` linking to the error message element
- [ ] Focus is programmatically moved to the first invalid field on form submission failure using `element.focus()`
- [ ] Dynamic validation feedback uses `aria-live="polite"` for non-critical messages and `aria-live="assertive"` for errors
- [ ] All interactive form controls are reachable via Tab key in logical order (Tab/Shift+Tab)
- [ ] Form controls have visible focus indicators (minimum 2px solid ring with 3:1 contrast)
- [ ] Server-rendered HTML includes all accessible attributes before JavaScript loads; progressive enhancement is verified
- [ ] Tested with screen reader (VoiceOver, NVDA) to confirm labels, errors, and state are announced correctly

---

## When to Use

Use this skill when:

- Building server-side rendered forms (Express, Fastify, Next.js server components) that must be accessible without client-side JavaScript
- Creating React/Next.js form components with real-time validation feedback
- Implementing multi-step forms or forms with conditional fields that require dynamic ARIA updates
- Handling form submission errors and need to communicate failures to screen reader users
- Designing custom form controls (autocomplete, date picker, combobox) with keyboard support
- Validating WCAG 2.2 AA compliance for forms in security-sensitive contexts (auth, payments, PII collection)
- Migrating legacy forms to meet accessibility requirements or passing accessibility audits

---

## When NOT to Use

Avoid this skill for:

- Purely presentational non-interactive layouts (use layout patterns instead)
- Simple client-side form libraries already providing built-in a11y support (Formik, React Hook Form with auto-labeling)
- Rapid prototyping where accessibility is deferred to a later phase (accessibility must be built in from the start, not retrofitted)
- Forms where user research has determined your audience does not include keyboard or screen reader users (rare; assume inclusive by default)

---

## Core Workflow

1. **Establish Form Structure and Input Inventory** — List all form inputs, their validation rules, error messages, and conditional visibility. Create an accessibility checklist: Does each input have a unique `id` and associated `<label>`? Are error messages descriptive and linked via `aria-describedby`? **Checkpoint:** Run the form through `axe DevTools` or Lighthouse a11y audit; expect zero "critical" or "serious" violations.

2. **Implement Server-Side Rendering with Semantic HTML** — Use native `<form>`, `<input>`, `<label>`, and `<select>` elements. Generate stable, unique `id` attributes for each input (use a counter, UUID, or hash if dynamic). Render labels with `for="input-id"` matching the input's `id`. Include `aria-required="true"` on required fields and `aria-invalid="true"` on fields with errors. **Checkpoint:** Disable JavaScript and verify the form renders with all labels visible and inputs focusable via Tab.

3. **Render Error Messages with Proper ARIA Linkage** — Create an error container with `id="errors"` and `role="alert"` at the top of the form. For each field error, render a message in a `<div id="field-error-name">` below or next to the input. Link the input to its error with `aria-describedby="field-error-name"`. Use `aria-invalid="true"` on the input to signal validation failure. **Checkpoint:** Open the page in a screen reader (VoiceOver on macOS or NVDA on Windows); navigate to an invalid input and confirm the error message is announced.

4. **Implement Focus Management on Validation Failure** — On form submission, validate all fields server-side and re-render the page with error markup. Use JavaScript (if available) to programmatically focus the first invalid input: `document.querySelector('[aria-invalid="true"]')?.focus()`. For SPA forms (React, Vue), move focus after validation state updates. **Checkpoint:** Submit a form with errors and verify that focus jumps to the first invalid field; screen readers announce both the field label and the error.

5. **Add Dynamic Validation Feedback with aria-live** — For real-time validation (as the user types), wrap feedback messages in a `<div aria-live="polite" aria-atomic="true">` for non-critical messages (e.g., "Password strength: medium") or `aria-live="assertive"` for errors that require immediate attention (e.g., "Email already in use"). Update the div's text content to trigger announcement. **Checkpoint:** Type into a field with real-time validation and confirm the feedback is announced without interrupting typing.

6. **Test with Keyboard Navigation and Screen Readers** — Walk through the form using only Tab, Shift+Tab, Enter, and Arrow keys (no mouse). Verify Tab order follows the visual flow and focus indicators are always visible. Open the form in a screen reader and navigate through each field, confirming labels, required status, error messages, and form purpose are announced clearly. **Checkpoint:** Complete the entire form using only keyboard + screen reader; no mouse required.

---

## Implementation Patterns

### Pattern 1: Server-Rendered Form with WCAG-Compliant Label and Error Linking

Demonstrates a complete server-side form component with label association, error messages linked via `aria-describedby`, and `aria-invalid` state. This pattern works without JavaScript.

```javascript
/**
 * Pattern 1: Server-rendered form with WCAG-compliant labels and error linking.
 * 
 * This pattern shows how to render a form server-side that is fully accessible
 * to keyboard and screen reader users, even before JavaScript loads.
 * 
 * Key WCAG criteria addressed:
 * - 1.3.1 Info and Relationships: Label-to-input association via for/id
 * - 3.3.1 Error Identification: Error messages linked to inputs via aria-describedby
 * - 4.1.2 Name, Role, Value: aria-required and aria-invalid on form controls
 */

// Express server example
app.get('/register', (req, res) => {
  // In a real app, this comes from form submission with validation errors
  const errors = {};
  const formData = {};

  // Generate stable IDs for each form field (can use uuid or hash)
  const fieldIds = {
    email: 'field-email',
    password: 'field-password',
    confirmPassword: 'field-confirm-password',
    agreeToTerms: 'field-agree-to-terms',
  };

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Register Account</title>
      <style>
        body { font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 2rem auto; }
        .form-group { margin-bottom: 1.5rem; }
        label { display: block; margin-bottom: 0.5rem; font-weight: 500; }
        input, textarea, select { width: 100%; padding: 0.5rem; border: 1px solid #ccc; border-radius: 4px; }
        input:focus, textarea:focus, select:focus { outline: 2px solid #0066cc; outline-offset: 2px; }
        input[aria-invalid="true"] { border-color: #dc2626; }
        .error-message { color: #dc2626; font-size: 0.875rem; margin-top: 0.25rem; }
        [role="alert"] { background: #fee; padding: 1rem; border-radius: 4px; margin-bottom: 1rem; border-left: 4px solid #dc2626; }
      </style>
    </head>
    <body>
      <h1>Create Account</h1>
      
      <!-- Error summary (WCAG 3.3.1) -->
      ${Object.keys(errors).length > 0 ? `
        <div role="alert" aria-live="assertive">
          <strong>Please fix the following errors:</strong>
          <ul>
            ${Object.entries(errors)
              .map(([field, msg]) => `<li><a href="#${fieldIds[field]}">${msg}</a></li>`)
              .join('')}
          </ul>
        </div>
      ` : ''}

      <form method="POST" action="/register" novalidate>
        <!-- Email field -->
        <div class="form-group">
          <label for="${fieldIds.email}">Email Address <span aria-label="required">*</span></label>
          <input
            type="email"
            id="${fieldIds.email}"
            name="email"
            value="${formData.email || ''}"
            required
            aria-required="true"
            aria-invalid="${errors.email ? 'true' : 'false'}"
            ${errors.email ? `aria-describedby="error-${fieldIds.email}"` : ''}
            autocomplete="email"
          >
          ${errors.email ? `
            <div id="error-${fieldIds.email}" class="error-message" role="status">
              ${errors.email}
            </div>
          ` : ''}
        </div>

        <!-- Password field -->
        <div class="form-group">
          <label for="${fieldIds.password}">Password <span aria-label="required">*</span></label>
          <input
            type="password"
            id="${fieldIds.password}"
            name="password"
            required
            aria-required="true"
            aria-invalid="${errors.password ? 'true' : 'false'}"
            ${errors.password ? `aria-describedby="error-${fieldIds.password}"` : ''}
            autocomplete="new-password"
          >
          ${errors.password ? `
            <div id="error-${fieldIds.password}" class="error-message" role="status">
              ${errors.password}
            </div>
          ` : ''}
        </div>

        <!-- Confirm Password field -->
        <div class="form-group">
          <label for="${fieldIds.confirmPassword}">Confirm Password <span aria-label="required">*</span></label>
          <input
            type="password"
            id="${fieldIds.confirmPassword}"
            name="confirmPassword"
            required
            aria-required="true"
            aria-invalid="${errors.confirmPassword ? 'true' : 'false'}"
            ${errors.confirmPassword ? `aria-describedby="error-${fieldIds.confirmPassword}"` : ''}
            autocomplete="new-password"
          >
          ${errors.confirmPassword ? `
            <div id="error-${fieldIds.confirmPassword}" class="error-message" role="status">
              ${errors.confirmPassword}
            </div>
          ` : ''}
        </div>

        <!-- Checkbox field (terms of service) -->
        <div class="form-group">
          <input
            type="checkbox"
            id="${fieldIds.agreeToTerms}"
            name="agreeToTerms"
            required
            aria-required="true"
            aria-invalid="${errors.agreeToTerms ? 'true' : 'false'}"
            ${errors.agreeToTerms ? `aria-describedby="error-${fieldIds.agreeToTerms}"` : ''}
          >
          <label for="${fieldIds.agreeToTerms}" style="display: inline; margin-left: 0.5rem;">
            I agree to the <a href="/terms">Terms of Service</a>
          </label>
          ${errors.agreeToTerms ? `
            <div id="error-${fieldIds.agreeToTerms}" class="error-message">
              ${errors.agreeToTerms}
            </div>
          ` : ''}
        </div>

        <button type="submit">Create Account</button>
      </form>

      <script>
        // Progressive enhancement: Focus first invalid field if errors exist
        const firstInvalid = document.querySelector('[aria-invalid="true"]');
        if (firstInvalid) {
          firstInvalid.focus();
        }
      </script>
    </body>
    </html>
  `;

  res.send(html);
});

// ✅ GOOD: All labels have for="id", errors link via aria-describedby, required/invalid states explicit
// Screen reader announces: "Email Address, required, edit text, invalid" + error message when focused
// Tab key navigates through all fields in order; focus visible on each

// ❌ BAD: No labels, no error linking, no required/invalid state
// <input type="email" name="email" placeholder="Email">
// <div style="color: red;">Email is required</div>
// Screen reader cannot associate label with input; error message is disconnected
```

---

### Pattern 2: React/Next.js Client-Side Form with useId, useActionState, and aria-live

Demonstrates a modern React form using the `useId` hook for stable HTML IDs, `useActionState` (Next.js Server Actions) for server-side validation, and `aria-live` regions for dynamic error announcements.

```typescript
/**
 * Pattern 2: React/Next.js form with useId, useActionState, and aria-live.
 * 
 * Uses:
 * - useId() for stable HTML id generation (React 18+)
 * - useActionState() for Next.js Server Actions integration
 * - aria-live="assertive" for error region with role="alert"
 * - aria-describedby linking inputs to error messages
 * - aria-invalid for field validation state
 * 
 * WCAG criteria: 1.3.1, 3.3.1, 4.1.2, 4.1.3
 */

import { useId, useState } from 'react';
import { useActionState } from 'react';

// Server action (runs on server, handles validation)
async function validateAndCreateAccount(
  _prevState: unknown,
  formData: FormData
) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const confirmPassword = formData.get('confirmPassword') as string;
  const agreeToTerms = formData.get('agreeToTerms') === 'on';

  const errors: Record<string, string> = {};

  // Validation logic runs server-side
  if (!email.trim()) {
    errors.email = 'Email is required';
  } else if (!email.includes('@')) {
    errors.email = 'Enter a valid email address';
  }

  if (!password) {
    errors.password = 'Password is required';
  } else if (password.length < 12) {
    errors.password = 'Password must be at least 12 characters';
  }

  if (password !== confirmPassword) {
    errors.confirmPassword = 'Passwords do not match';
  }

  if (!agreeToTerms) {
    errors.agreeToTerms = 'You must agree to the Terms of Service';
  }

  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  // Account creation logic (omitted for brevity)
  return { success: true, message: 'Account created successfully' };
}

export function RegisterForm() {
  const [state, formAction, isPending] = useActionState(
    validateAndCreateAccount,
    { success: false, errors: {} }
  );

  const [focusFirstError, setFocusFirstError] = useState(false);

  // Generate stable IDs for each field (re-used across renders)
  const emailId = useId();
  const emailErrorId = useId();
  const passwordId = useId();
  const passwordErrorId = useId();
  const confirmPasswordId = useId();
  const confirmPasswordErrorId = useId();
  const agreeToTermsId = useId();
  const agreeToTermsErrorId = useId();
  const errorsRegionId = useId();

  const errors = state.errors || {};

  // Focus first invalid field on error (client-side for UX)
  React.useEffect(() => {
    if (!state.success && Object.keys(errors).length > 0) {
      const firstErrorField = document.querySelector(
        '[aria-invalid="true"]'
      ) as HTMLInputElement;
      if (firstErrorField) {
        firstErrorField.focus();
        setFocusFirstError(true);
      }
    }
  }, [errors, state.success]);

  return (
    <form action={formAction} className="register-form" noValidate>
      <h1>Create Account</h1>

      {/* Error summary region (WCAG 3.3.1) */}
      {Object.keys(errors).length > 0 && (
        <div
          id={errorsRegionId}
          role="alert"
          aria-live="assertive"
          aria-atomic="true"
          className="form-errors"
        >
          <strong>Please fix the following errors:</strong>
          <ul>
            {Object.entries(errors).map(([field, message]) => (
              <li key={field}>
                <a href={`#${getFieldId(field)}`}>{message}</a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Email field */}
      <div className="form-group">
        <label htmlFor={emailId}>
          Email Address{' '}
          <span aria-label="required" className="required-indicator">
            *
          </span>
        </label>
        <input
          type="email"
          id={emailId}
          name="email"
          required
          aria-required="true"
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? emailErrorId : undefined}
          autoComplete="email"
          className={errors.email ? 'field-error' : ''}
          disabled={isPending}
        />
        {errors.email && (
          <div id={emailErrorId} className="error-message" role="status">
            {errors.email}
          </div>
        )}
      </div>

      {/* Password field */}
      <div className="form-group">
        <label htmlFor={passwordId}>
          Password{' '}
          <span aria-label="required" className="required-indicator">
            *
          </span>
        </label>
        <input
          type="password"
          id={passwordId}
          name="password"
          required
          aria-required="true"
          aria-invalid={!!errors.password}
          aria-describedby={errors.password ? passwordErrorId : undefined}
          autoComplete="new-password"
          className={errors.password ? 'field-error' : ''}
          disabled={isPending}
        />
        {errors.password && (
          <div id={passwordErrorId} className="error-message" role="status">
            {errors.password}
          </div>
        )}
      </div>

      {/* Confirm Password field */}
      <div className="form-group">
        <label htmlFor={confirmPasswordId}>
          Confirm Password{' '}
          <span aria-label="required" className="required-indicator">
            *
          </span>
        </label>
        <input
          type="password"
          id={confirmPasswordId}
          name="confirmPassword"
          required
          aria-required="true"
          aria-invalid={!!errors.confirmPassword}
          aria-describedby={
            errors.confirmPassword ? confirmPasswordErrorId : undefined
          }
          autoComplete="new-password"
          className={errors.confirmPassword ? 'field-error' : ''}
          disabled={isPending}
        />
        {errors.confirmPassword && (
          <div
            id={confirmPasswordErrorId}
            className="error-message"
            role="status"
          >
            {errors.confirmPassword}
          </div>
        )}
      </div>

      {/* Terms of Service checkbox */}
      <div className="form-group">
        <input
          type="checkbox"
          id={agreeToTermsId}
          name="agreeToTerms"
          required
          aria-required="true"
          aria-invalid={!!errors.agreeToTerms}
          aria-describedby={
            errors.agreeToTerms ? agreeToTermsErrorId : undefined
          }
          disabled={isPending}
        />
        <label htmlFor={agreeToTermsId} className="checkbox-label">
          I agree to the{' '}
          <a href="/terms" target="_blank" rel="noopener noreferrer">
            Terms of Service
          </a>
        </label>
        {errors.agreeToTerms && (
          <div
            id={agreeToTermsErrorId}
            className="error-message"
            role="status"
          >
            {errors.agreeToTerms}
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={isPending}
        aria-busy={isPending}
      >
        {isPending ? 'Creating Account...' : 'Create Account'}
      </button>
    </form>
  );
}

// Helper function to map field names to their IDs (memoize in real apps)
function getFieldId(fieldName: string): string {
  const map: Record<string, string> = {
    email: 'emailId',
    password: 'passwordId',
    confirmPassword: 'confirmPasswordId',
    agreeToTerms: 'agreeToTermsId',
  };
  return map[fieldName] || '';
}

// ✅ GOOD: useId generates stable IDs across re-renders; aria-describedby links errors
// useActionState integrates server validation; aria-live="assertive" announces errors
// aria-invalid and aria-required signal state to screen readers
// Screen reader announces: "Email Address, required, edit text, invalid, Email is required" when focused

// ❌ BAD: Generating random IDs on every render
// const emailErrorId = Math.random().toString();
// aria-describedby will reference stale IDs; form becomes inaccessible on re-render
```

---

### Pattern 3: Real-Time Password Strength Validation with aria-live

Demonstrates dynamic validation feedback announced to screen readers without interrupting user input. Uses `aria-live="polite"` for non-critical updates and `aria-atomic="true"` to announce the full message.

```typescript
/**
 * Pattern 3: Real-time validation with aria-live and aria-atomic.
 * 
 * Shows how to provide dynamic feedback (password strength, character count)
 * that is announced to screen readers but does not interrupt typing.
 * 
 * Key ARIA attributes:
 * - aria-live="polite": Announce after user finishes typing
 * - aria-atomic="true": Announce the entire message, not just changes
 * - aria-describedby: Link input to the live region
 * - role="status": Marks this as a status message (implicit aria-live="polite")
 */

import { useId, useState } from 'react';

export function PasswordField() {
  const [password, setPassword] = useState('');
  const [strength, setStrength] = useState<'weak' | 'fair' | 'good' | 'strong' | null>(null);

  const passwordId = useId();
  const strengthId = useId();

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPassword(value);

    // Calculate strength (simple example)
    if (value.length < 8) {
      setStrength('weak');
    } else if (value.length < 12) {
      setStrength('fair');
    } else if (value.length < 16) {
      setStrength('good');
    } else {
      setStrength('strong');
    }
  };

  const strengthMessage = {
    weak: 'Password is too short. Use at least 12 characters.',
    fair: 'Password is fair. Add special characters for better security.',
    good: 'Password is good. Add uppercase and numbers for better security.',
    strong: 'Password is strong and meets all security requirements.',
  };

  return (
    <div className="form-group">
      <label htmlFor={passwordId}>
        Password{' '}
        <span aria-label="required" className="required-indicator">
          *
        </span>
      </label>

      <input
        type="password"
        id={passwordId}
        value={password}
        onChange={handlePasswordChange}
        required
        aria-required="true"
        aria-describedby={`${strengthId} password-requirements`}
        autoComplete="new-password"
        minLength={12}
      />

      {/* Strength feedback with aria-live (WCAG 4.1.3) */}
      <div
        id={strengthId}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className={`strength-feedback strength-${strength}`}
      >
        {password && strength ? (
          <>
            <strong>Strength: {strength}</strong> — {strengthMessage[strength]}
          </>
        ) : null}
      </div>

      {/* Static password requirements (always visible) */}
      <div id="password-requirements" className="requirements">
        <p>Password must include:</p>
        <ul>
          <li aria-live="polite">
            {password.length >= 12 ? '✓' : '○'} At least 12 characters
          </li>
          <li aria-live="polite">
            {/[A-Z]/.test(password) ? '✓' : '○'} Uppercase letter
          </li>
          <li aria-live="polite">
            {/[a-z]/.test(password) ? '✓' : '○'} Lowercase letter
          </li>
          <li aria-live="polite">
            {/[0-9]/.test(password) ? '✓' : '○'} Number
          </li>
          <li aria-live="polite">
            {/[!@#$%^&*]/.test(password) ? '✓' : '○'} Special character (!@#$%^&*)
          </li>
        </ul>
      </div>
    </div>
  );
}

// ✅ GOOD: aria-live="polite" announces strength after user finishes typing
// aria-atomic="true" reads the full message, not just "fair" or "good"
// Screen reader hears: "Password is fair. Add special characters for better security."
// Feedback does not interrupt user's continued typing

// ❌ BAD: No aria-live or status role
// <div className="strength-feedback">Strength: fair</div>
// Screen reader never announces the feedback; strength only visible to sighted users
```

---

### Pattern 4: Multi-Step Form with Dynamic Field Visibility and aria-hidden

Demonstrates conditional field visibility in multi-step forms, using `aria-hidden="true"` to hide inactive steps from screen readers and proper focus management between steps.

```typescript
/**
 * Pattern 4: Multi-step form with aria-hidden and focus management.
 * 
 * Shows how to:
 * - Hide inactive form steps from screen readers with aria-hidden="true"
 * - Properly announce step changes to screen reader users
 * - Manage focus when transitioning between steps
 * - Validate and persist data across steps
 * 
 * WCAG criteria: 1.3.1, 2.4.3, 4.1.2
 */

import { useId, useRef } from 'react';

interface FormStep {
  id: string;
  title: string;
  fields: Array<{ name: string; label: string; type: string }>;
}

export function MultiStepForm() {
  const [currentStep, setCurrentStep] = React.useState(0);
  const [data, setData] = React.useState<Record<string, string>>({});
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const stepHeadingRef = useRef<HTMLHeadingElement>(null);

  const steps: FormStep[] = [
    {
      id: 'personal',
      title: 'Personal Information',
      fields: [
        { name: 'firstName', label: 'First Name', type: 'text' },
        { name: 'lastName', label: 'Last Name', type: 'text' },
      ],
    },
    {
      id: 'contact',
      title: 'Contact Information',
      fields: [
        { name: 'email', label: 'Email Address', type: 'email' },
        { name: 'phone', label: 'Phone Number', type: 'tel' },
      ],
    },
    {
      id: 'address',
      title: 'Billing Address',
      fields: [
        { name: 'street', label: 'Street Address', type: 'text' },
        { name: 'city', label: 'City', type: 'text' },
      ],
    },
  ];

  const step = steps[currentStep];

  const handleNextStep = () => {
    // Validate current step
    const stepErrors: Record<string, string> = {};
    step.fields.forEach((field) => {
      if (!data[field.name]) {
        stepErrors[field.name] = `${field.label} is required`;
      }
    });

    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return;
    }

    setErrors({});

    // Move to next step
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);

      // Focus the step heading for screen reader announcement
      setTimeout(() => {
        stepHeadingRef.current?.focus();
      }, 0);
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);

      // Focus the step heading for screen reader announcement
      setTimeout(() => {
        stepHeadingRef.current?.focus();
      }, 0);
    }
  };

  return (
    <div className="multi-step-form">
      {/* Progress indicator (informational) */}
      <div aria-label="Form progress" role="progressbar" aria-valuenow={currentStep + 1} aria-valuemin={1} aria-valuemax={steps.length}>
        Step {currentStep + 1} of {steps.length}: {step.title}
      </div>

      <form noValidate>
        {steps.map((s, index) => (
          <fieldset
            key={s.id}
            aria-hidden={index !== currentStep}
            style={{ display: index === currentStep ? 'block' : 'none' }}
          >
            <h2 ref={index === currentStep ? stepHeadingRef : null} tabIndex={-1}>
              {s.title}
            </h2>

            {s.fields.map((field) => {
              const fieldId = useId();
              const errorId = useId();
              const fieldError = errors[field.name];

              return (
                <div key={field.name} className="form-group">
                  <label htmlFor={fieldId}>{field.label}</label>
                  <input
                    id={fieldId}
                    type={field.type}
                    name={field.name}
                    value={data[field.name] || ''}
                    onChange={(e) =>
                      setData({ ...data, [field.name]: e.target.value })
                    }
                    required
                    aria-required="true"
                    aria-invalid={!!fieldError}
                    aria-describedby={fieldError ? errorId : undefined}
                  />
                  {fieldError && (
                    <div id={errorId} className="error-message" role="alert">
                      {fieldError}
                    </div>
                  )}
                </div>
              );
            })}
          </fieldset>
        ))}

        {/* Step navigation */}
        <div className="form-actions" role="toolbar" aria-label="Form navigation">
          <button
            type="button"
            onClick={handlePreviousStep}
            disabled={currentStep === 0}
          >
            Previous
          </button>

          {currentStep === steps.length - 1 ? (
            <button type="submit">Submit</button>
          ) : (
            <button type="button" onClick={handleNextStep}>
              Next
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

// ✅ GOOD: aria-hidden="true" on inactive steps hides them from screen reader
// Focus moved to step heading (tabIndex=-1) when step changes
// Progress bar announces current step with aria-valuenow/aria-valuemax
// Screen reader hears: "Step 1 of 3: Personal Information, heading level 2"

// ❌ BAD: Inactive steps visible to screen reader
// <fieldset style={{ display: 'none' }}>
//   <input name="lastName" ... />  <!-- Screen reader still sees this -->
// </fieldset>
// Screen reader announces fields from all steps, causing confusion
```

---

## Constraints

### MUST DO

- Associate every `<input>`, `<select>`, and `<textarea>` with a `<label>` element using `for="input-id"` matching the input's `id` attribute, or use `aria-labelledby` if the label cannot be positioned adjacently
- Render form submission errors in a container with `role="alert"` or `aria-live="assertive"` at the top of the form to announce errors immediately to screen readers
- Link each form field error message to its input via `aria-describedby="error-id"` and set `aria-invalid="true"` on the input to signal validation failure
- Move focus to the first invalid field after form submission using `element.focus()` on the client side; do not rely on browser's default behavior
- Use semantic `<fieldset>` and `<legend>` elements to group related form fields (e.g., billing address fields); provide context via `aria-label` if `<legend>` is not sufficient
- Provide visible focus indicators on all form controls: minimum 2px solid outline with at least 3:1 contrast ratio against the background
- Test the form using keyboard navigation only (Tab, Shift+Tab, Enter, Arrow keys) to ensure all fields are reachable and focus order matches visual order
- Test with a screen reader (VoiceOver on macOS, NVDA on Windows) to verify labels, error messages, required status, and form purpose are announced correctly
- Use `aria-required="true"` on required fields and update the UI to reflect required status with a visual indicator (e.g., asterisk) paired with text

### MUST NOT DO

- Place placeholders as the only form field label; placeholder text disappears when the field is focused or has content, making it inaccessible to screen reader users
- Render error messages in a `<span>` or `<div>` without linking them to the input via `aria-describedby` or containing them in the input's `aria-label`
- Use JavaScript to trap focus inside a form without proper focus management; ensure users can Tab to all form controls and Escape does not unexpectedly close the form
- Create custom form controls (date picker, combobox, autocomplete) without implementing full keyboard navigation (Arrow keys to select, Enter to confirm, Escape to cancel)
- Use `display: none` or `visibility: hidden` on error messages; this hides them from screen readers. Instead, render the message and let CSS handle visibility if needed for layout reasons
- Assume that browser defaults handle accessibility; always explicitly set `id` attributes on inputs, use `<label for="id">`, and add ARIA attributes to convey state (required, invalid, readonly)
- Skip testing with actual screen readers; automated tools like axe DevTools cannot catch all accessibility issues (e.g., error message announcement timing, focus management)

---

## Output Template

When implementing this skill, your output must include:

1. **HTML/JSX Markup** — Complete form structure with semantic elements (`<form>`, `<fieldset>`, `<label>`), unique input `id` attributes, error containers with `role="alert"`, and all ARIA attributes (`aria-required`, `aria-invalid`, `aria-describedby`, `aria-live`)

2. **CSS Styling** — Focus indicator styles (minimum 2px outline with 3:1 contrast), error state styling (border color, text color), and live region visibility (ensure error messages are visible even if initially hidden)

3. **JavaScript/TypeScript** — Validation logic that runs server-side and client-side; focus management on form submission failure using `element.focus()`; dynamic content updates with `aria-live` regions

4. **Accessibility Audit Checklist** — Verify each WCAG success criterion is addressed:
   - [ ] 1.3.1 Info and Relationships: All inputs have associated labels
   - [ ] 3.3.1 Error Identification: Errors are identified and linked to fields
   - [ ] 2.4.3 Focus Order: Tab order follows visual order
   - [ ] 4.1.2 Name, Role, Value: All inputs have accessible names and states
   - [ ] 4.1.3 Status Messages: Errors and live feedback announced via aria-live

5. **Testing Instructions** — Step-by-step guide to verify:
   - Keyboard navigation: Tab through all fields; ensure focus is always visible
   - Screen reader testing: Use VoiceOver/NVDA to navigate form; confirm labels, errors, and required status are announced
   - Automated testing: Run axe DevTools or Lighthouse a11y audit; confirm zero critical violations

---

## Related Skills

(None currently identified.)

---

## WCAG References

- [1.3.1 Info and Relationships (A)](https://www.w3.org/WAI/WCAG22/Understanding/info-and-relationships): Labels must be programmatically associated with form controls via `<label for="id">` or `aria-labelledby`
- [3.3.1 Error Identification (A)](https://www.w3.org/WAI/WCAG22/Understanding/error-identification): Errors must be identified by color and an additional means (text, icon, or role); use `role="alert"` and link error messages via `aria-describedby`
- [2.4.3 Focus Order (A)](https://www.w3.org/WAI/WCAG22/Understanding/focus-order): Tab order must be logical and match the visual presentation; test with Tab/Shift+Tab
- [4.1.2 Name, Role, Value (A)](https://www.w3.org/WAI/WCAG22/Understanding/name-role-value): All form controls must have an accessible name, role, and value; use `aria-required`, `aria-invalid`, and `aria-describedby`
- [4.1.3 Status Messages (AA)](https://www.w3.org/WAI/WCAG22/Understanding/status-messages): Changes in content must be announced to screen readers; use `aria-live="polite"` for feedback and `aria-live="assertive"` for errors

---

## Test Coverage Checklist

```
Form Accessibility Verification Checklist:

□ Keyboard Navigation
  □ Tab key moves focus through all inputs in visual order
  □ Shift+Tab moves focus backwards
  □ Enter submits form when focus on submit button
  □ Arrow keys (if applicable) navigate radio/checkbox groups
  □ Focus indicators always visible (minimum 2px outline, 3:1 contrast)

□ Label Association (WCAG 1.3.1)
  □ Every input has a unique id attribute
  □ Every input has an associated <label> with matching for="id"
  □ Placeholder text is NOT the only label
  □ Checkbox/radio labels are clickable

□ Error Handling (WCAG 3.3.1)
  □ Errors appear at form top with role="alert" or aria-live="assertive"
  □ Each error message linked to input via aria-describedby
  □ aria-invalid="true" set on invalid inputs
  □ Error messages describe the problem and how to fix it
  □ Focus moves to first invalid field on submission failure

□ Form State (WCAG 4.1.2)
  □ aria-required="true" on required fields
  □ aria-invalid state reflects validation status
  □ Disabled fields properly announced
  □ Read-only fields properly announced

□ Dynamic Updates (WCAG 4.1.3)
  □ aria-live="polite" used for non-critical feedback
  □ aria-live="assertive" used for error/urgent messages
  □ aria-atomic="true" on live regions that need full message read
  □ Live region updates announced without losing focus

□ Screen Reader Testing
  □ All labels announced when fields are focused
  □ Error messages announced after field or form submission
  □ Required status announced for required fields
  □ Form purpose clear from page context

□ Automated Testing
  □ axe DevTools: 0 critical violations
  □ axe DevTools: 0 serious violations
  □ Lighthouse a11y audit: 90+ score
  □ No false positives on accessibility tests
```
