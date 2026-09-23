---
name: automated-a11y-testing-axe-core
description: "Implements automated accessibility testing across the testing pyramid using axe-core engine with jest-axe, @axe-core/playwright, pa11y-ci for unit/E2E/CI integration and WCAG violation detection."
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
    - examples
    - patterns
  triggers: axe-core, jest-axe, automated testing, accessibility testing, WCAG violations, CI/CD, pa11y-ci, @axe-core/playwright
  related-skills: wcag-21-aa-fundamentals, keyboard-navigation-focus-management
  archetypes:
    - tactical
    - enforcement
  anti_triggers:
    - brainstorming
    - manual testing only
    - vague accessibility
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
---

# Automated A11y Testing: axe-core Engine

Implements automated accessibility testing using the axe-core engine across the entire testing pyramid: unit tests (jest-axe), end-to-end tests (@axe-core/playwright), and CI/CD integration (pa11y-ci). This skill covers configuration, rule tags, assertions, baselines for regression detection, and common violation patterns. Load when setting up accessibility testing, adding A11y checks to test suites, or integrating continuous accessibility validation.

## TL;DR Checklist

- [ ] Install axe-core dependencies: `npm install -D axe-core jest-axe @axe-core/playwright pa11y-ci`
- [ ] Add jest-axe matcher in Jest setup: `expect.extend(toHaveNoViolations)`
- [ ] Create unit test for each component: scan and assert `toHaveNoViolations()`
- [ ] Configure Playwright E2E with AxeBuilder: specify WCAG rules (wcag2a, wcag21aa, wcag22aa)
- [ ] Set up pa11y-ci for multi-URL scanning with GitHub Actions
- [ ] Establish baseline for violations in main branch
- [ ] Configure CI to fail on new accessibility violations
- [ ] Document false positives and tag for exclusion

---

## When to Use

Use this skill when:

- Adding accessibility testing to a new project's test suite
- Setting up CI/CD pipeline with accessibility gates
- Implementing testing pyramid accessibility coverage (unit → E2E → integration)
- Establishing regression detection for accessibility violations
- Scanning multiple URLs or pages systematically
- Documenting and excluding false positive violations
- Reporting accessibility metrics in dashboards

---

## When NOT to Use

Avoid this skill for:

- Manual accessibility testing (keyboard nav, screen reader testing — those require human testing)
- Designing accessibility fixes (use WCAG fundamentals, keyboard-navigation, semantic-HTML skills)
- Advanced semantic testing beyond automated rules (axe catches ~30% of issues)
- Testing PDF/document accessibility (different tools required)
- Testing third-party embedded widgets (accessibility varies by widget)

---

## Core Workflow

1. **Install Dependencies** — Add axe-core, jest-axe, @axe-core/playwright, pa11y-ci to dev dependencies. Verify versions support your Jest/Playwright versions.

2. **Configure Rule Set** — Choose rule set (wcag2a, wcag21aa, wcag22aa) based on compliance target. Tag configuration determines which violations are caught. AA is standard baseline.

3. **Unit Test Components** — Create jest-axe tests for each component. Arrange component state, scan with axe, assert no violations. Test multiple states (hover, disabled, error, loading).

4. **E2E Page Tests** — Add Playwright tests with AxeBuilder. Test full pages, not just components. Specify which rules to check (wcag21aa standard).

5. **Establish Baseline** — Run full test suite, capture violations that are expected/acceptable. Create baseline snapshot or JSON report.

6. **Configure CI Gate** — Set up GitHub Actions (or CI tool) to run pa11y-ci on all URLs. Compare against baseline. Fail pipeline on new violations.

7. **Document Exclusions** — For false positives, tag with `data-testid` or CSS selector for exclusion. Document why exclusion exists. Review exclusions in sprint planning.

8. **Monitor and Report** — Track A11y test results over time. Report violations metrics (active violations, fixed in last sprint, remediation backlog). Use dashboard to track progress.

---

## Testing Pyramid for Accessibility

```
        ▲
        │  Integration Tests (multi-page flows)
        │  pa11y-ci scanning all URLs
        │
        │  E2E Tests (AxeBuilder on full pages)
        │  @axe-core/playwright scanning user interactions
        │
        │  Unit Tests (jest-axe on components)
        │  Each component scanned in isolation
        │
        └────────────────────────────────────
```

**Goal**: Catch accessibility violations as early as possible in development.

---

## Implementation Patterns

### Pattern 1: Jest Unit Test with jest-axe

```typescript
import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';

// Register jest-axe matchers
expect.extend(toHaveNoViolations);

describe('AccessibleButton Component', () => {
  // Test 1: Component renders without a11y violations
  it('should not have accessibility violations in default state', async () => {
    const { container } = render(
      <button aria-label="Add item">
        <svg aria-hidden="true">+</svg>
      </button>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  // Test 2: Disabled state
  it('should not have violations when disabled', async () => {
    const { container } = render(
      <button disabled aria-label="Add item">
        <svg aria-hidden="true">+</svg>
      </button>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  // Test 3: With error state
  it('should not have violations with error state', async () => {
    const { container } = render(
      <button aria-label="Add item" aria-invalid="true">
        <svg aria-hidden="true">!</svg>
      </button>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  // Test 4: Specific rule check (focus-visible)
  it('should have visible focus indicator', async () => {
    const { container } = render(
      <button aria-label="Add item">+</button>
    );

    const results = await axe(container, {
      rules: {
        'focus-visible': { enabled: true },
      },
    });

    expect(results).toHaveNoViolations();
  });
});

// Form field with label
describe('AccessibleFormField Component', () => {
  it('should have proper label association', async () => {
    const { container } = render(
      <div>
        <label htmlFor="email-input">Email Address</label>
        <input
          id="email-input"
          type="email"
          aria-required="true"
          placeholder="you@example.com"
        />
      </div>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have accessible error messages', async () => {
    const errorId = 'email-error';
    const { container } = render(
      <div>
        <label htmlFor="email-input">Email Address</label>
        <input
          id="email-input"
          type="email"
          aria-invalid="true"
          aria-describedby={errorId}
        />
        <p id={errorId} role="alert">
          Please enter a valid email
        </p>
      </div>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
```

**Key patterns:**
- Use `await axe(container)` to scan the component
- Multiple tests for different states (default, disabled, error, loading)
- Use `rules` option to enable/disable specific checks
- Always include jest-axe extend in setup file for project-wide use

### Pattern 2: Playwright E2E with AxeBuilder

```typescript
import { test, expect } from '@playwright/test';
import { injectAxe, checkA11y } from 'axe-playwright';

test.describe('HomePage Accessibility', () => {
  // Full page scan
  test('should not have a11y violations on homepage', async ({ page }) => {
    await page.goto('http://localhost:3000');

    // Inject axe-core into page
    await injectAxe(page);

    // Check a11y violations (default: wcag2aa standard)
    await checkA11y(page, null, {
      rules: {
        'color-contrast': { enabled: true },
        'heading-order': { enabled: true },
      },
    });
  });

  // Scan specific region (exclude certain elements)
  test('should scan main content area only', async ({ page }) => {
    await page.goto('http://localhost:3000/dashboard');
    await injectAxe(page);

    // Scan only main, exclude sidebar
    await checkA11y(page, 'main', {
      exclude: ['aside', '[data-testid="cookie-banner"]'],
    });
  });

  // Interactive scan (test after user actions)
  test('should have no violations after opening dialog', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await injectAxe(page);

    // User opens dialog
    await page.click('button[aria-label="Open settings"]');
    await page.waitForSelector('[role="dialog"]');

    // Scan updated DOM
    await checkA11y(page, '[role="dialog"]', {
      rules: {
        'focus-visible': { enabled: true },
        'button-name': { enabled: true },
      },
    });
  });

  // Scan multiple states
  test('should check form validation states', async ({ page }) => {
    await page.goto('http://localhost:3000/form');
    await injectAxe(page);

    // Scan initial state
    await checkA11y(page, 'form');

    // Fill invalid email, trigger validation
    await page.fill('input[type="email"]', 'invalid');
    await page.click('button[type="submit"]');
    await page.waitForSelector('[role="alert"]');

    // Scan error state
    await checkA11y(page, 'form', {
      rules: {
        'color-contrast': { enabled: true }, // Ensure error color passes contrast
      },
    });
  });
});

// Using AxeBuilder (alternative API)
test('alternative AxeBuilder API', async ({ page }) => {
  await page.goto('http://localhost:3000');

  const results = await new AxeBuilder({ page })
    .withTags(['wcag21aa', 'wcag22aa'])
    .exclude('[data-testid="third-party-widget"]')
    .analyze();

  expect(results.violations).toEqual([]);
});
```

**Key patterns:**
- Use `injectAxe(page)` then `checkA11y(page)` or use AxeBuilder
- Test after user interactions (clicks, form fills, dialogs)
- Exclude third-party widgets or known false positives
- Specify rules based on compliance target (wcag21aa, wcag22aa)
- Test multiple pages and user flows

### Pattern 3: pa11y-ci for CI/CD Integration

```json
// .pa11yci.json — Configuration for multi-URL scanning
{
  "runners": ["axe"],
  "standard": "WCAG2AA",
  "timeout": 10000,
  "wait": 500,
  "chromeLaunchConfig": {
    "args": ["--disable-gpu", "--no-sandbox"]
  },
  "urls": [
    "http://localhost:3000/",
    "http://localhost:3000/about",
    "http://localhost:3000/contact",
    "http://localhost:3000/products",
    "http://localhost:3000/checkout",
    "http://localhost:3000/account"
  ],
  "headless": true,
  "includeNotices": false,
  "includeWarnings": false,
  "suppressStderr": false,
  "strict": true,
  "bail": true,
  "reporters": ["json", "csv"],
  "outputDir": "./a11y-reports"
}
```

```bash
# Run pa11y-ci locally
pa11y-ci --config .pa11yci.json

# Run against live staging URL
pa11y-ci --config .pa11yci.json --base-url https://staging.example.com

# Generate baseline (first run, commit as reference)
pa11y-ci --config .pa11yci.json --save-baseline

# Compare against baseline (fail if new violations)
pa11y-ci --config .pa11yci.json --check-baseline
```

**GitHub Actions Workflow:**

```yaml
name: Accessibility Tests

on:
  pull_request:
  push:
    branches: [main]

jobs:
  a11y:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Build application
        run: npm run build

      - name: Start dev server
        run: npm run dev &
        env:
          CI: true

      - name: Wait for server
        run: npx wait-on http://localhost:3000

      - name: Run jest-axe tests
        run: npm run test:a11y

      - name: Run pa11y-ci
        run: npx pa11y-ci --config .pa11yci.json --check-baseline

      - name: Upload a11y report
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: a11y-reports
          path: a11y-reports/

      - name: Comment PR with results
        if: always()
        uses: actions/github-script@v6
        with:
          script: |
            const fs = require('fs');
            const report = JSON.parse(fs.readFileSync('a11y-reports/results.json'));
            const violations = report.results.reduce((sum, r) => sum + r.violations.length, 0);
            
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `🔍 Accessibility Test Results\n\nViolations: ${violations}\n\n[View detailed report](https://github.com/${{ github.repository }}/actions/runs/${{ github.run_id }})`
            });
```

### Pattern 4: Baseline Management and Exclusions

```typescript
// jest.setup.js - Configure jest-axe with default rules
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

// Define globally excluded rules and elements
beforeEach(() => {
  // Mock axe rules to exclude known false positives
  axe.configure({
    checks: [
      {
        id: 'color-contrast',
        enabled: true,
        options: {
          // Exclude decorative elements
          ignoreElements: ['.decorative-icon', '[aria-hidden="true"]'],
        },
      },
    ],
  });
});

// Test file with specific exclusions
describe('ThirdPartyWidget', () => {
  it('should not have violations (excluding inaccessible widget)', async () => {
    const { container } = render(
      <div>
        <MyAccessibleComponent />
        <ExternalWidget id="external-not-accessible" />
      </div>
    );

    // Exclude third-party widget from scan
    const results = await axe(container, {
      exclude: ['#external-not-accessible'],
    });

    expect(results).toHaveNoViolations();
  });
});

// Baseline snapshot approach
describe('HeaderComponent - Visual Regression + A11y', () => {
  it('should match baseline and have no violations', async () => {
    const { container } = render(<Header />);

    // Visual snapshot
    expect(container).toMatchSnapshot();

    // A11y snapshot
    const results = await axe(container);
    expect(results.violations).toMatchSnapshot('a11y-violations');
  });
});
```

---

## axe-core Rule Tags

axe-core rules are tagged for filtering. Use tags in tests to control which rules apply:

| Tag | Scope | Usage |
|-----|-------|-------|
| `wcag2a` | WCAG 2.0/2.1 Level A | Basic accessibility |
| `wcag2aa` | WCAG 2.0/2.1 Level AA | **Standard baseline** |
| `wcag21a` | WCAG 2.1-specific Level A | 2.1 additions |
| `wcag21aa` | WCAG 2.1-specific Level AA | **Recommended for 2024** |
| `wcag22a` | WCAG 2.2 Level A | New success criteria |
| `wcag22aa` | WCAG 2.2 Level AA | Forward-looking (2024+) |
| `section508` | Section 508 compliance | U.S. federal |
| `best-practice` | Best practices beyond standards | Optional improvements |

**Recommended configuration:**

```typescript
// Use wcag21aa as standard baseline
const defaultRules = {
  rules: {
    // Include WCAG 2.1 AA
    'wcag21aa': { enabled: true },
    // Include best practices
    'best-practice': { enabled: false }, // Or true if stricter
  },
};
```

---

## Common Violations and Fixes

### 1. Missing or Invalid Label

**Violation**: Input fields without associated labels.

**Fix**:
```html
<!-- ❌ BAD -->
<input type="email" placeholder="Enter email" />

<!-- ✅ GOOD -->
<label htmlFor="email">Email Address</label>
<input id="email" type="email" />
```

### 2. Insufficient Color Contrast

**Violation**: Text-background contrast < 4.5:1 (AA) or < 3:1 (large text).

**Fix**:
```css
/* ❌ BAD: 2.8:1 contrast — fails AA */
.text { color: #94a3b8; background: white; }

/* ✅ GOOD: 7.0:1 contrast — passes AA */
.text { color: #475569; background: white; }
```

### 3. Missing Alternative Text

**Violation**: Images without alt text.

**Fix**:
```html
<!-- ❌ BAD -->
<img src="profile.jpg" />

<!-- ✅ GOOD -->
<img src="profile.jpg" alt="User profile photo of Jane Doe" />

<!-- Decorative images -->
<img src="decorative-line.svg" alt="" aria-hidden="true" />
```

### 4. No Focus Visible

**Violation**: Interactive elements without visible focus indicator.

**Fix**:
```css
/* ✅ GOOD: Visible focus indicator */
button:focus-visible {
  outline: 3px solid #2563eb;
  outline-offset: 2px;
}

/* Avoid removing focus */
button:focus {
  outline: 2px solid #2563eb;
  /* Never: outline: none; */
}
```

### 5. Invalid Heading Order

**Violation**: Heading hierarchy skips levels (h1 → h3, missing h2).

**Fix**:
```html
<!-- ❌ BAD: Skips h2 -->
<h1>Title</h1>
<h3>Subsection</h3>

<!-- ✅ GOOD: Proper hierarchy -->
<h1>Title</h1>
<h2>Subsection</h2>
<h3>Detail</h3>
```

---

## Constraints

### MUST DO

- Run axe-core tests in CI pipeline — fail build on new accessibility violations
- Test all user-interactive states (default, hover, disabled, error, loading, focus)
- Establish baseline for main branch violations — compare new PRs against baseline
- Document and tag all excluded elements with rationale (`data-testid` or selector)
- Include jest-axe in all component unit tests
- Use @axe-core/playwright or AxeBuilder in all E2E page tests
- Set standard to wcag21aa (minimum) or wcag22aa (forward-looking)
- Monitor and fix high-severity violations (color contrast, missing labels, invalid ARIA)

### MUST NOT DO

- Ignore violations flagged by axe ("we'll fix them later" → never happens)
- Exclude violations from scanning without documenting rationale
- Skip E2E accessibility testing ("unit tests are enough" → they're not)
- Test only happy paths — test error states, edge cases, disabled states
- Disable important rules like color-contrast, button-name, valid-aria
- Assume automated testing catches all issues (it catches ~30% — supplement with manual testing)
- Use automated testing as substitute for keyboard navigation and screen reader testing

---

## Integration Checklist

**Setup Phase:**
- [ ] Install axe-core, jest-axe, @axe-core/playwright, pa11y-ci
- [ ] Create jest.setup.js with `expect.extend(toHaveNoViolations)`
- [ ] Add jest-axe test to at least one component
- [ ] Verify test passes locally

**E2E Phase:**
- [ ] Add AxeBuilder/checkA11y to first E2E test
- [ ] Create .pa11yci.json with app URLs
- [ ] Run pa11y-ci locally against all pages
- [ ] Commit baseline

**CI/CD Phase:**
- [ ] Add GitHub Actions workflow for jest-axe and pa11y-ci
- [ ] Configure workflow to fail on new violations
- [ ] Set up artifact upload for a11y reports
- [ ] Add PR comment with a11y results

**Monitoring Phase:**
- [ ] Add a11y metrics to dashboard (violations count, trend)
- [ ] Schedule weekly review of new violations
- [ ] Include a11y fixes in sprint backlog
- [ ] Track remediation progress

---

## Troubleshooting

### False Positives

axe-core occasionally flags issues that are actually accessible. Common false positives:

- **color-contrast on overlaid text**: Text on image backgrounds may flag incorrectly. Use `exclude` to skip.
- **invalid ARIA on conditionally-rendered elements**: aria-expanded on element not yet in DOM. Verify actual accessibility manually.
- **button-name on custom buttons**: If you've properly named with aria-label, exclude if needed.

**Solution**: Use `exclude` in jest or pa11y config. Document rationale.

### Performance Issues

Large test suites with many axe scans slow down tests:

**Solution**:
- Run full axe scans only in E2E (jest-axe can be lighter)
- Use `{ rules: { 'best-practice': { enabled: false } } }` to reduce overhead
- Cache axe in jest when possible
- Run pa11y-ci in separate job from Jest

### flaky Tests

axe scans sometimes catch violations that appear/disappear:

**Solution**:
- Ensure proper wait times for async renders
- Mock third-party widgets that load asynchronously
- Verify DOM is fully settled before scanning
- Test in headless mode to match CI environment

---

## Next Steps

After establishing automated testing baseline:

1. Add keyboard navigation manual testing to QA process
2. Include screen reader testing (VoiceOver/NVDA) for critical features
3. Test with real assistive technology users
4. Integrate automated scans into pre-commit hooks
5. Set up dashboard tracking violations over time

