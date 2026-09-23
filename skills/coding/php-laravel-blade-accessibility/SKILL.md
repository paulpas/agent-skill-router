---
name: php-laravel-blade-accessibility
description: Builds accessible server-rendered PHP/Laravel applications using Blade templates with accessible form patterns, Livewire integration, aria attributes, error announcements with alerts, and tools lens-for-laravel and laravel-blade-ally.
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
  triggers: PHP, Laravel, Blade, Livewire, accessible forms, aria attributes, lens-for-laravel, laravel-blade-ally
  related-skills: semantic-html-aria-accessibility-tree, automated-a11y-testing-axe-core
  archetypes:
    - tactical
    - implementation
  anti_triggers:
    - React framework
    - Vue framework
    - client-side rendering only
    - backend database
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
---

# Laravel Blade Accessibility: Forms & Livewire

Builds accessible server-rendered PHP/Laravel applications using Blade templates with proper form patterns, ARIA attributes (aria-invalid, aria-describedby), form validation with error announcements (role="alert"), and Livewire reactive patterns. Integrates lens-for-laravel and laravel-blade-ally tools for accessibility audits. Load when building Laravel forms, implementing Livewire components with ARIA, or ensuring server-rendered HTML accessibility.

## TL;DR Checklist

- [ ] Use Blade form components with proper label associations
- [ ] Add `aria-invalid` and `aria-describedby` to form inputs
- [ ] Display validation errors with `role="alert"` for screen reader announcements
- [ ] Use Livewire `wire:loading` with `aria-live="polite"` for loading states
- [ ] Associate labels: `<label for="field-id">`
- [ ] Group related fields with `<fieldset>` and `<legend>`
- [ ] Use `lens-for-laravel` for accessibility analysis
- [ ] Run `php artisan ally:analyze` (laravel-blade-ally) in CI/CD
- [ ] Test forms with jest-axe for blade templates

---

## When to Use

Use this skill when:

- Building accessible forms in Laravel Blade
- Implementing Livewire reactive components with form validation
- Ensuring server-rendered HTML meets WCAG 2.1 AA
- Adding ARIA attributes to form fields
- Setting up accessibility testing for Laravel projects
- Building validation feedback with screen reader support

---

## When NOT to Use

Avoid this skill for:

- React/Vue client-side rendering (use framework-specific skills)
- Database design or backend logic (use data skills)
- Laravel routing or controller logic beyond accessibility
- CSS/styling concerns (use CSS skills)
- Blade templating syntax (use Laravel docs)

---

## Core Workflow

1. **Create Form Component** — Build reusable Blade form components with labels
2. **Add ARIA Attributes** — Use aria-invalid, aria-describedby on inputs
3. **Implement Validation** — Show errors with role="alert" for announcements
4. **Integrate Livewire** — Add wire:loading, wire:target, aria-live
5. **Add Descriptions** — Link help text with aria-describedby
6. **Test with Tools** — Use lens-for-laravel and laravel-blade-ally
7. **Verify with axe** — Run automated testing on Blade output
8. **Screen Reader Test** — Manual test with VoiceOver/NVDA

---

## Implementation Patterns

### Pattern 1: Accessible Form Field Component

```blade
{{-- resources/views/components/form/field.blade.php --}}
@props([
    'name' => '',
    'label' => '',
    'type' => 'text',
    'required' => false,
    'error' => null,
    'description' => null,
    'value' => '',
    'placeholder' => '',
])

@php
    $errorId = $name . '-error';
    $descriptionId = $name . '-description';
    $hasError = $error !== null;
    $describedBy = [];
    
    if ($description) {
        $describedBy[] = $descriptionId;
    }
    if ($hasError) {
        $describedBy[] = $errorId;
    }
    
    $ariaDescribedBy = count($describedBy) > 0 ? implode(' ', $describedBy) : null;
@endphp

<div class="form-field {{ $hasError ? 'form-field--error' : '' }}">
    {{-- Label --}}
    <label for="{{ $name }}" class="form-field__label">
        {{ $label }}
        @if ($required)
            <span aria-label="required" class="required-mark"> *</span>
        @endif
    </label>

    {{-- Input --}}
    <input
        id="{{ $name }}"
        name="{{ $name }}"
        type="{{ $type }}"
        value="{{ old($name, $value) }}"
        placeholder="{{ $placeholder }}"
        @required($required)
        aria-required="{{ $required ? 'true' : 'false' }}"
        aria-invalid="{{ $hasError ? 'true' : 'false' }}"
        @if ($ariaDescribedBy) aria-describedby="{{ $ariaDescribedBy }}" @endif
        class="form-field__input
            {{ $hasError ? 'form-field__input--error' : '' }}"
    />

    {{-- Description --}}
    @if ($description)
        <p id="{{ $descriptionId }}" class="form-field__description">
            {{ $description }}
        </p>
    @endif

    {{-- Error Message --}}
    @if ($hasError)
        <p id="{{ $errorId }}" class="form-field__error" role="alert">
            {{ $error }}
        </p>
    @endif
</div>
```

**Usage:**
```blade
<form method="POST" action="/contact">
    @csrf

    <x-form.field
        name="email"
        label="Email Address"
        type="email"
        required
        :error="$errors->first('email')"
        description="We'll never share your email with anyone else."
    />

    <x-form.field
        name="message"
        label="Message"
        type="textarea"
        required
        :error="$errors->first('message')"
    />

    <button type="submit">Send</button>
</form>
```

### Pattern 2: Form with Validation

```blade
{{-- resources/views/contact.blade.php --}}
<form method="POST" action="/contact" novalidate>
    @csrf

    {{-- Email Field --}}
    <div class="form-group">
        <label for="email" class="form-label">
            Email Address <span aria-label="required">*</span>
        </label>
        <input
            id="email"
            name="email"
            type="email"
            value="{{ old('email') }}"
            required
            aria-required="true"
            aria-invalid="{{ $errors->has('email') ? 'true' : 'false' }}"
            aria-describedby="{{ $errors->has('email') ? 'email-error' : null }}"
            class="form-input
                {{ $errors->has('email') ? 'form-input--error' : '' }}"
        />
        @if ($errors->has('email'))
            <p id="email-error" class="form-error" role="alert">
                {{ $errors->first('email') }}
            </p>
        @endif
    </div>

    {{-- Message Field --}}
    <div class="form-group">
        <label for="message" class="form-label">
            Message <span aria-label="required">*</span>
        </label>
        <textarea
            id="message"
            name="message"
            required
            aria-required="true"
            aria-invalid="{{ $errors->has('message') ? 'true' : 'false' }}"
            aria-describedby="{{ $errors->has('message') ? 'message-error message-hint' : 'message-hint' }}"
            class="form-textarea
                {{ $errors->has('message') ? 'form-textarea--error' : '' }}"
        >{{ old('message') }}</textarea>
        <p id="message-hint" class="form-hint">
            Maximum 1000 characters
        </p>
        @if ($errors->has('message'))
            <p id="message-error" class="form-error" role="alert">
                {{ $errors->first('message') }}
            </p>
        @endif
    </div>

    {{-- Checkbox Field --}}
    <div class="form-group">
        <input
            id="terms"
            name="terms"
            type="checkbox"
            required
            aria-required="true"
            aria-invalid="{{ $errors->has('terms') ? 'true' : 'false' }}"
            aria-describedby="{{ $errors->has('terms') ? 'terms-error' : null }}"
        />
        <label for="terms" class="form-label">
            I agree to the <a href="/terms" target="_blank">terms of service</a>
        </label>
        @if ($errors->has('terms'))
            <p id="terms-error" class="form-error" role="alert">
                {{ $errors->first('terms') }}
            </p>
        @endif
    </div>

    <button type="submit" class="btn btn-primary">
        Submit
    </button>
</form>
```

### Pattern 3: Livewire Form Component with ARIA

```php
// app/Livewire/ContactForm.php
namespace App\Livewire;

use Livewire\Component;

class ContactForm extends Component
{
    public string $email = '';
    public string $message = '';

    protected array $rules = [
        'email' => 'required|email',
        'message' => 'required|min:10|max:1000',
    ];

    protected array $messages = [
        'email.required' => 'Please enter your email address.',
        'email.email' => 'Please enter a valid email address.',
        'message.required' => 'Please enter a message.',
        'message.min' => 'Message must be at least 10 characters.',
        'message.max' => 'Message must not exceed 1000 characters.',
    ];

    public function submit()
    {
        $this->validate();
        // Send email or save to database
        session()->flash('success', 'Your message has been sent!');
        $this->reset();
    }

    public function render()
    {
        return view('livewire.contact-form');
    }
}
```

```blade
{{-- resources/views/livewire/contact-form.blade.php --}}
<form wire:submit="submit" novalidate>
    {{-- Status Message --}}
    @if (session('success'))
        <div class="alert alert-success" role="alert" aria-live="assertive">
            {{ session('success') }}
        </div>
    @endif

    {{-- Email Field --}}
    <div class="form-group">
        <label for="email" class="form-label">
            Email Address <span aria-label="required">*</span>
        </label>
        <input
            id="email"
            wire:model="email"
            type="email"
            required
            aria-required="true"
            aria-invalid="{{ $errors->has('email') ? 'true' : 'false' }}"
            aria-describedby="{{ $errors->has('email') ? 'email-error' : null }}"
            class="form-input {{ $errors->has('email') ? 'form-input--error' : '' }}"
        />
        @error('email')
            <p id="email-error" class="form-error" role="alert">
                {{ $message }}
            </p>
        @enderror
    </div>

    {{-- Message Field --}}
    <div class="form-group">
        <label for="message" class="form-label">
            Message <span aria-label="required">*</span>
        </label>
        <textarea
            id="message"
            wire:model="message"
            required
            aria-required="true"
            aria-invalid="{{ $errors->has('message') ? 'true' : 'false' }}"
            aria-describedby="{{ $errors->has('message') ? 'message-error message-hint' : 'message-hint' }}"
            class="form-textarea {{ $errors->has('message') ? 'form-textarea--error' : '' }}"
        ></textarea>
        <p id="message-hint" class="form-hint">
            Maximum 1000 characters
        </p>
        @error('message')
            <p id="message-error" class="form-error" role="alert">
                {{ $message }}
            </p>
        @enderror
    </div>

    {{-- Submit with Loading State --}}
    <button
        type="submit"
        class="btn btn-primary"
        wire:loading.attr="disabled"
        aria-busy="false"
        wire:loading="true"
        aria-busy="true"
    >
        <span wire:loading.remove>Send Message</span>
        <span wire:loading aria-live="polite">Sending...</span>
    </button>
</form>
```

### Pattern 4: Select/Dropdown Component

```blade
{{-- resources/views/components/form/select.blade.php --}}
@props([
    'name' => '',
    'label' => '',
    'options' => [],
    'selected' => null,
    'required' => false,
    'error' => null,
    'description' => null,
])

@php
    $errorId = $name . '-error';
    $descriptionId = $name . '-description';
    $hasError = $error !== null;
    $describedBy = [];
    
    if ($description) {
        $describedBy[] = $descriptionId;
    }
    if ($hasError) {
        $describedBy[] = $errorId;
    }
    
    $ariaDescribedBy = count($describedBy) > 0 ? implode(' ', $describedBy) : null;
@endphp

<div class="form-field {{ $hasError ? 'form-field--error' : '' }}">
    <label for="{{ $name }}" class="form-label">
        {{ $label }}
        @if ($required)
            <span aria-label="required">*</span>
        @endif
    </label>

    <select
        id="{{ $name }}"
        name="{{ $name }}"
        @required($required)
        aria-required="{{ $required ? 'true' : 'false' }}"
        aria-invalid="{{ $hasError ? 'true' : 'false' }}"
        @if ($ariaDescribedBy) aria-describedby="{{ $ariaDescribedBy }}" @endif
        class="form-select {{ $hasError ? 'form-select--error' : '' }}"
    >
        <option value="">Select {{ strtolower($label) }}...</option>
        @foreach ($options as $value => $label)
            <option value="{{ $value }}" @selected(old($name) == $value || $selected == $value)>
                {{ $label }}
            </option>
        @endforeach
    </select>

    @if ($description)
        <p id="{{ $descriptionId }}" class="form-hint">
            {{ $description }}
        </p>
    @endif

    @if ($hasError)
        <p id="{{ $errorId }}" class="form-error" role="alert">
            {{ $error }}
        </p>
    @endif
</div>
```

---

## Accessibility Tools for Laravel

### lens-for-laravel

Provides IDE/editor integration for accessibility issues in Blade templates.

**Installation:**
```bash
composer require --dev jsnover/lens-for-laravel
```

**Configuration:**
```php
// config/lens.php
return [
    'enabled' => true,
    'rules' => [
        'missing-alt-text' => true,
        'missing-label' => true,
        'invalid-aria' => true,
        'color-contrast' => false, // Requires CSS parsing
    ],
];
```

### laravel-blade-ally

CLI tool for accessibility analysis of Blade templates.

**Installation:**
```bash
composer require --dev symplify/blade-ally
```

**Usage:**
```bash
# Analyze all Blade templates
php artisan ally:analyze

# Output accessibility violations
# Example:
# resources/views/contact.blade.php:12
#   Missing <label> for input id="email"
#   Error: Input must have associated label
```

**In CI/CD (GitHub Actions):**
```yaml
- name: Check Blade Accessibility
  run: php artisan ally:analyze
  continue-on-error: false # Fail pipeline if violations found
```

---

## Testing Blade Forms with axe

```typescript
// tests/accessibility/ContactFormTest.php
namespace Tests\Accessibility;

use PHPUnit\Framework\TestCase;
use Tests\TestCase as LaravelTestCase;

class ContactFormTest extends LaravelTestCase
{
    public function test_contact_form_has_no_accessibility_violations()
    {
        $response = $this->get('/contact');

        // Parse HTML and test with axe-core-php or jest-axe
        $html = $response->getContent();

        // Alternatively, test with browser testing
        $this->browse(function (Browser $browser) {
            $browser->visit('/contact')
                ->screenshot('contact-form')
                // Add accessibility checks if using browser testing library
                ->press('Send Message')
                ->waitFor('.form-error')
                ->assertSee('Please enter your email address.');
        });
    }

    public function test_form_displays_validation_errors_accessibly()
    {
        $response = $this->post('/contact', [
            'email' => 'invalid',
            'message' => '',
        ]);

        $response->assertSessionHasErrors(['email', 'message']);
        
        // Verify error messages rendered with role="alert"
        $html = $response->getContent();
        $this->assertStringContainsString('role="alert"', $html);
        $this->assertStringContainsString('aria-invalid="true"', $html);
    }
}
```

---

## Form Field Component Best Practices

### Fieldset for Grouped Fields

```blade
<fieldset>
    <legend>Contact Information</legend>

    <x-form.field
        name="first_name"
        label="First Name"
        required
    />

    <x-form.field
        name="last_name"
        label="Last Name"
        required
    />
</fieldset>

<fieldset>
    <legend>Preferences</legend>

    <div class="form-group">
        <input
            id="newsletter"
            name="newsletter"
            type="checkbox"
            value="1"
        />
        <label for="newsletter">
            Subscribe to our newsletter
        </label>
    </div>

    <div class="form-group">
        <input
            id="notifications"
            name="notifications"
            type="checkbox"
            value="1"
        />
        <label for="notifications">
            Enable email notifications
        </label>
    </div>
</fieldset>
```

### Radio Button Group

```blade
<fieldset>
    <legend>Shipping Method</legend>

    <div class="form-group">
        <input
            id="standard"
            name="shipping"
            type="radio"
            value="standard"
            required
            aria-required="true"
        />
        <label for="standard">
            Standard (5-7 business days)
        </label>
    </div>

    <div class="form-group">
        <input
            id="express"
            name="shipping"
            type="radio"
            value="express"
            required
            aria-required="true"
        />
        <label for="express">
            Express (2-3 business days)
        </label>
    </div>

    <div class="form-group">
        <input
            id="overnight"
            name="shipping"
            type="radio"
            value="overnight"
            required
            aria-required="true"
        />
        <label for="overnight">
            Overnight (next business day)
        </label>
    </div>
</fieldset>
```

---

## Livewire Accessibility Patterns

### Livewire with aria-live for Dynamic Updates

```blade
<div wire:ignore.self class="search-results" aria-live="polite" aria-label="Search results">
    @if ($query)
        <div class="results-count">
            Found {{ $results->count() }} results
        </div>
        @forelse ($results as $result)
            <div class="result-item">
                <a href="{{ $result->url }}">{{ $result->title }}</a>
                <p>{{ $result->description }}</p>
            </div>
        @empty
            <p role="status">No results found for "{{ $query }}"</p>
        @endforelse
    @endif
</div>

<script>
    // Announce updates to screen readers
    document.addEventListener('livewire:updated', () => {
        const results = document.querySelector('[aria-live]');
        if (results) {
            // aria-live="polite" announces changes
        }
    });
</script>
```

### Livewire Form Submission Feedback

```blade
<form wire:submit="submit">
    @if ($errors->any())
        <div class="alert alert-error" role="alert" aria-live="assertive">
            <p class="font-bold">Please correct the following errors:</p>
            <ul>
                @foreach ($errors->all() as $error)
                    <li>{{ $error }}</li>
                @endforeach
            </ul>
        </div>
    @endif

    <x-form.field
        name="email"
        label="Email"
        wire:model="email"
        :error="$errors->first('email')"
    />

    <button type="submit" wire:loading.attr="disabled">
        Submit
    </button>

    <div wire:loading aria-live="polite" aria-busy="true">
        Processing your request...
    </div>
</form>
```

---

## Constraints

### MUST DO

- Associate all labels with inputs using `for` and `id` attributes
- Add `aria-invalid` and `aria-describedby` to form inputs
- Display validation errors with `role="alert"`
- Group related fields with `<fieldset>` and `<legend>`
- Use `aria-required` on required fields
- Test Blade templates with lens-for-laravel
- Run `php artisan ally:analyze` in CI/CD
- Include aria-live updates in Livewire components
- Test forms with jest-axe or accessible browser testing

### MUST NOT DO

- Leave inputs without labels
- Use placeholder text as label (violates WCAG)
- Display validation errors without role="alert"
- Remove focus indicators from form fields
- Create unlabeled fieldsets (use legend)
- Implement custom form elements without ARIA
- Skip accessibility testing in CI/CD
- Ignore laravel-blade-ally violations

---

## Testing Checklist

**Form Structure:**
- [ ] All inputs have labels (not placeholder-only)
- [ ] Required fields marked with aria-required
- [ ] Error messages have role="alert"
- [ ] Grouped fields use fieldset/legend
- [ ] Help text linked with aria-describedby

**Livewire:**
- [ ] Validation errors announce immediately
- [ ] Loading states have aria-busy
- [ ] Dynamic content updates have aria-live
- [ ] Focus managed correctly on update
- [ ] Keyboard navigation works post-update

**Testing:**
- [ ] laravel-blade-ally passes
- [ ] jest-axe tests pass
- [ ] Form submits correctly
- [ ] Error messages display and announce
- [ ] Screen reader announces all fields/errors

