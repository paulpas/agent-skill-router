---
name: wcag-21-aa-fundamentals
description: "Teaches WCAG 2.1 Level AA standards, success criteria categories, conformance levels, and regulatory context for developers implementing accessible web applications."
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  role: reference
  scope: implementation
  output-format: guidance
  content-types:
    - reference
    - guidance
    - checklist
  triggers: WCAG 2.1, Level AA, success criteria, accessibility standard, compliance, conformance, ADA compliance, WCAG baseline
  related-skills: semantic-html-aria-accessibility-tree, keyboard-navigation-focus-management, color-contrast-visual-accessibility-wcag
  archetypes:
    - educational
    - enforcement
  anti_triggers:
    - brainstorming
    - vague ideation
    - non-compliance
  response_profile:
    verbosity: medium
    directive_strength: high
    abstraction_level: strategic
---

# WCAG 2.1 Level AA Fundamentals

Foundational understanding of Web Content Accessibility Guidelines 2.1 Level AA standards, success criteria organization, conformance requirements, and regulatory landscape. This skill teaches the mental model of WCAG — what the standards are, how they're organized, when to use Level AA vs AAA, and the legal/compliance context. Load when designing accessibility strategies, training teams, or establishing organizational compliance baselines.

## TL;DR Checklist

- [ ] Understand WCAG 2.1 structure: 4 Principles (POUR), 13 Guidelines, 78 Success Criteria
- [ ] Identify your target conformance level: A (minimum), AA (widely required), AAA (aspirational)
- [ ] Know the 14 new AA-level success criteria added in WCAG 2.1 vs 2.0
- [ ] Grasp the "first rule of ARIA": use native HTML before ARIA roles/properties
- [ ] Understand how to apply success criteria to your specific implementation
- [ ] Know the difference between sufficient techniques, advisory techniques, and failures

---

## When to Use

Use this skill when:

- Establishing organizational accessibility standards and compliance baselines
- Training developers on WCAG requirements for new projects
- Evaluating whether a project meets AA or AAA conformance
- Understanding regulatory requirements (ADA, Section 508, EN 301 549)
- Making architectural decisions about accessibility testing and tooling
- Communicating accessibility requirements to stakeholders

---

## When NOT to Use

Avoid this skill for:

- Specific implementation guidance (use framework-specific skills: semantic-html-aria, react-components, keyboard-navigation)
- Automated testing setup (use automated-a11y-testing-axe-core instead)
- Debugging specific accessibility violations (use testing skills)
- Design decisions about color or typography (use color-contrast, UI design skills)

---

## WCAG 2.1 Structure and Organization

### The Four Principles (POUR)

WCAG 2.1 is built on four foundational principles that all success criteria align to:

**1. Perceivable** — Users must be able to perceive the information in the interface.
- Content must be presentable in forms they can perceive (text alternatives for images, captions for video, color alternatives, sufficient contrast)
- Examples: alt text for images, captions for audio/video, perceivable focus indicators

**2. Operable** — Users must be able to interact with and control the interface.
- All functionality must be accessible via keyboard, navigation must be clear, users must not be trapped
- Examples: keyboard navigation, focus management, skip links, no keyboard traps

**3. Understandable** — Users must be able to understand the interface, content, and operations.
- Text must be readable, pages must be predictable, users must be helped to avoid and correct mistakes
- Examples: readability, consistent navigation, form error messages

**4. Robust** — Content must be compatible with current and future assistive technologies.
- Valid HTML, proper use of semantics and ARIA, future-proofed markup
- Examples: semantic elements, proper ARIA usage, valid DOM structure

### The 13 Guidelines

Each principle contains multiple guidelines that provide more specific direction:

| Principle | Guideline | Focus |
|-----------|-----------|-------|
| **Perceivable** | 1.1 Text Alternatives | Alt text for images, icons, diagrams |
| | 1.2 Time-based Media | Captions, transcripts, audio descriptions |
| | 1.3 Adaptable | Semantic structure, reflow, no reliance on sensory characteristics |
| | 1.4 Distinguishable | Color contrast, text resizing, no color-alone conveyance |
| **Operable** | 2.1 Keyboard Accessible | Keyboard access, no keyboard traps, no required timing |
| | 2.2 Enough Time | No time limits, or user can extend/disable them |
| | 2.3 Seizures and Physical Reactions | No content that flashes more than 3x/second |
| | 2.4 Navigable | Clear purpose, visible focus, skip links, logical tab order |
| | 2.5 Input Modalities | Touch targets, pointer cancellation, accessible gestures |
| **Understandable** | 3.1 Readable | Language of page declared, unfamiliar words defined |
| | 3.2 Predictable | Consistent navigation, no unexpected context changes |
| | 3.3 Input Assistance | Labels, error messages, confirmation for important actions |
| **Robust** | 4.1 Compatible | Valid HTML, proper ARIA usage, accessible names |

### Success Criteria Levels

WCAG 2.1 defines three conformance levels (A, AA, AAA), each building on the previous:

**Level A** — Baseline accessibility. Covers basic requirements.
- **20 Success Criteria** (mostly from WCAG 2.0)
- Minimum legal requirement in many jurisdictions
- Examples: alt text present, keyboard access possible

**Level AA** — Enhanced accessibility. Covers most common accessibility needs.
- **50 Success Criteria** (includes Level A + additional AA-specific)
- **WIDELY REQUIRED** by law in most countries (ADA, Section 508, EN 301 549)
- Recommended target for most public websites and applications
- Examples: 4.5:1 contrast ratio, ARIA landmark roles, focus visible

**Level AAA** — Enhanced accessibility for specialized cases. Covers advanced requirements.
- **78 Success Criteria** (includes Level A + AA + AAA-specific)
- Often targeted by government sites, educational institutions
- Some criteria are expensive to implement (e.g., sign language video for all audio)
- Examples: 7:1 contrast ratio, audio descriptions for all video

### The 14 New AA-Level Success Criteria in WCAG 2.1 (vs 2.0)

WCAG 2.1 added 17 new criteria total. **14 of these are AA-level**, addressing modern web needs:

1. **SC 2.5.4 Motion Actuation** — Functionality triggered by device motion must have keyboard/UI alternative
2. **SC 2.5.5 Target Size (Enhanced)** — Touch targets must be at least 44x44px (Level AAA in 2.1, AA in 2.2)
3. **SC 4.1.3 Status Messages** — Status messages must be announced to screen readers via `aria-live` or roles like `role="status"`
4. **SC 1.4.10 Reflow** — Content must reflow to single column at 320px width (no horizontal scrolling required)
5. **SC 1.4.11 Non-Text Contrast** — UI components and graphics must have 3:1 contrast with adjacent colors
6. **SC 1.4.12 Text Spacing** — Text must remain readable when users override spacing (line-height 1.5x, letter-spacing 0.12em, etc.)
7. **SC 1.4.13 Content on Hover/Focus** — Tooltips and popovers must be dismissible, hoverable, persistent
8. **SC 2.4.3 Focus Order** — Focus order must be logical and meaningful
9. **SC 2.4.7 Focus Visible** — Keyboard focus must be visible (at least 3:1 contrast)
10. **SC 3.2.4 Consistent Identification** — Components with same function must be identified consistently
11. **SC 3.3.7 Redundant Entry** — Users should not be required to re-enter information they've already provided
12. **SC 3.3.8 Accessible Authentication** — Authentication mechanisms must not rely on cognitive tests (captchas need alternatives)
13. **SC 1.3.5 Identify Input Purpose** — Input purposes must be programmatically identifiable (e.g., `autocomplete="email"`)
14. **SC 2.2.6 Timeouts** — Users must be warned before session timeout and able to extend

---

## Conformance Requirements

### What "Conformance" Means

A website or application "conforms" to WCAG 2.1 Level AA if:

1. **All** pages meet the criteria (no selective conformance per page)
2. **Whole pages** must conform (not just portions)
3. Essential processes must be accessible (you can't hide critical features behind an inaccessible modal)
4. Conformance applies to **all content** without exceptions (except defined exclusions like third-party widgets)

### The "Non-Interference" Clause

Content that doesn't directly target accessibility criteria can still cause non-compliance. For example:

- An animated background that flashes > 3x/second violates SC 2.3 even if other content is accessible
- Removing focus outlines violates SC 2.4.7 even if the feature itself is otherwise accessible
- A form validation message that disappears too quickly violates SC 4.1.3 even if error detection works

**Implication**: Accessibility is not a feature to bolt on — it must be considered in all design and development decisions.

---

## The First Rule of ARIA

**Always use native HTML first. Only use ARIA when native HTML lacks the required semantics.**

### Why This Rule Exists

1. Native HTML elements have built-in keyboard support, screen reader announcements, focus management
2. ARIA only provides semantic labeling to assistive tech — it does NOT provide keyboard behavior
3. Maintenance burden increases with custom ARIA implementations
4. Bugs in ARIA are developer-created, not platform bugs

### Examples

```html
<!-- ❌ BAD: ARIA role on div when <button> exists -->
<div role="button" tabindex="0" @click="handleClick">
  Click me
</div>
<!-- Missing: keyboard support (Space/Enter), focus management, screen reader announcements -->

<!-- ✅ GOOD: Use native <button> -->
<button @click="handleClick">
  Click me
</button>
<!-- Includes: keyboard support, focus management, screen reader announces as button, clickable -->
```

```html
<!-- ❌ BAD: Custom ARIA tab implementation with divs -->
<div role="tablist">
  <div role="tab" aria-selected="true" tabindex="0">Tab 1</div>
  <div role="tab" aria-selected="false" tabindex="-1">Tab 2</div>
</div>

<!-- ✅ GOOD: Use accessible component library or implement keyboard nav correctly -->
<div role="tablist">
  <button role="tab" aria-selected="true" aria-controls="panel-1" tabindex="0">
    Tab 1
  </button>
  <button role="tab" aria-selected="false" aria-controls="panel-2" tabindex="-1">
    Tab 2
  </button>
</div>
<div id="panel-1" role="tabpanel" aria-labelledby="tab-1">...</div>
<div id="panel-2" role="tabpanel" aria-labelledby="tab-2" hidden>...</div>
```

---

## How to Apply Success Criteria to Your Project

### Step 1: Understand the Criterion

Every success criterion has:
- **Statement**: The requirement (e.g., "Color is not used as the only means of conveying information")
- **Sufficient Techniques**: Methods that satisfy the criterion (often multiple valid approaches)
- **Advisory Techniques**: Best practices that go beyond the requirement
- **Failures**: Common ways to violate the criterion

Example (SC 1.4.1 — Color and Sensory Characteristics):
```
Statement: "Color is not used as the only visual means of conveying information, 
indicating an action, prompting a response, or distinguishing a visual element."

Sufficient Technique: "Ensuring that information conveyed by color differences 
is also available in text" (G14)

Example Failure: Using red background only to indicate an error field 
without an error message or icon
```

### Step 2: Assess Your Implementation

For each criterion:
1. Identify which components/features the criterion applies to
2. Review existing implementation against the criterion
3. Identify gaps (what's missing, what violates the criterion)
4. Plan fixes using sufficient techniques

### Step 3: Verify with Testing

Use multiple verification approaches:
1. **Automated testing** (axe, WAVE, Lighthouse) — catches common violations
2. **Manual testing** — keyboard navigation, screen reader, color contrast
3. **User testing** — test with people who have disabilities

---

## Regulatory and Legal Context

### ADA (Americans with Disabilities Act)

- **Applies to**: All U.S. public accommodations, government websites, most commercial websites
- **Standard referenced**: WCAG 2.1 Level AA (de facto standard in 2024 legal cases)
- **Enforcement**: Department of Justice, private lawsuits
- **Timeline**: Web accessibility has been required since 2012

### Section 508 (U.S. Federal Accessibility Standard)

- **Applies to**: U.S. federal government agencies, federal contractors
- **Standard**: Updated to WCAG 2.1 Level AA in 2019
- **Requirement**: All electronic/information technology must conform

### EN 301 549 (European Accessibility Standard)

- **Applies to**: Public sector websites/applications in EU, increasingly private sector
- **Standard**: Based on WCAG 2.1 Level AA with additional criteria
- **Enforcement**: National governments, private litigation under Directive 2016/2102

### Other Jurisdictions

- **Canada (AODA)**: Requires WCAG 2.1 Level AA for public/large organizations
- **Australia (DDA)**: Requires reasonable steps to ensure website accessibility (typically WCAG 2.1 AA)
- **Japan (JIS X 8341-3)**: Japanese accessibility standard based on WCAG 2.1

---

## Common Misconceptions

### Misconception 1: "Accessibility is for blind people only"

**Reality**: Accessibility benefits users with:
- Blindness (screen reader users)
- Low vision (color contrast, magnification)
- Color blindness (non-color information)
- Deafness (captions, transcripts)
- Motor disabilities (keyboard access, large touch targets)
- Cognitive disabilities (clear language, consistent navigation)
- Temporary disabilities (broken arm, noisy environment)
- Aging users (larger text, higher contrast)

### Misconception 2: "Automated testing catches all accessibility issues"

**Reality**: Automated tools catch ~30% of accessibility issues.
- Automated tools cannot evaluate user experience, context, semantics
- Tools catch: missing alt text, low contrast, missing labels, improper ARIA
- Tools miss: is the alt text accurate? Is the focus order logical? Is the form clear?

### Misconception 3: "ARIA fixes accessibility problems"

**Reality**: ARIA only provides semantic information to assistive tech.
- ARIA does NOT provide: keyboard support, focus management, interactivity
- ARIA requires proper implementation including keyboard handlers
- Misused ARIA makes problems worse: `role="button"` on a div without keyboard handlers misleads screen readers

### Misconception 4: "We'll fix accessibility in a separate audit/sprint"

**Reality**: Accessibility is not a feature — it's a quality attribute.
- Bolting on accessibility after development is expensive and incomplete
- Accessible design is cheaper and better than accessible retrofitting
- Include accessibility in design, development, QA from the start

---

## Creating an Accessibility Specification

When establishing standards for your organization:

### 1. Choose Conformance Level

| Level | Recommendation | Timeline |
|-------|---|---|
| **A** | Never acceptable for public sites | — |
| **AA** | **Required baseline** for most organizations | Immediate |
| **AAA** | Target if you serve disabled communities | Phase 2+ |

### 2. List Required Success Criteria

Start with all Level AA criteria (50 total). Identify which apply to your product:
- **Always required**: All 50 AA criteria apply to all products
- **Selectively applied**: Some criteria may not apply (e.g., video captions if you have no video content)

### 3. Define Measurement Approach

- Automated testing tools (axe, WAVE, Lighthouse) as baseline
- Manual testing checklist for each feature
- Screen reader testing on supported assistive technologies
- Keyboard-only navigation testing

### 4. Establish Roles and Responsibilities

- **Designers**: Ensure designs meet color contrast, spacing, visual hierarchy
- **Developers**: Implement semantic HTML, ARIA, keyboard support, focus management
- **QA**: Test keyboard nav, screen reader, automated tools
- **Product**: Ensure accessibility is part of definition of done

---

## References and Tools

### Official Standards Documents
- [WCAG 2.1 Specification](https://www.w3.org/TR/WCAG21/) — Normative reference
- [WCAG 2.1 Techniques](https://www.w3.org/WAI/WCAG21/Techniques/) — Sufficient and advisory techniques
- [ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/) — Recommended ARIA patterns
- [HTML Living Standard](https://html.spec.whatwg.org/) — Semantic element definitions

### Understanding Documents
- [Understanding WCAG 2.1](https://www.w3.org/WAI/WCAG21/Understanding/) — Detailed explanation of each criterion
- [WebAIM WCAG Checklist](https://webaim.org/articles/wcag2checklist/) — Community checklist
- [Deque WCAG 2.1 Quick Reference](https://dequeuniversity.com/rules/) — Interactive reference with examples

### Testing Tools
- [axe DevTools](https://www.deque.com/axe/devtools/) — Automated accessibility testing
- [WAVE (WebAIM)](https://wave.webaim.org/) — Visual feedback for accessibility issues
- [Lighthouse (Chrome)](https://developers.google.com/web/tools/lighthouse) — Performance + accessibility audit
- [Screen Reader Tools**: NVDA (Windows), JAWS (Windows), VoiceOver (macOS/iOS), TalkBack (Android)

---

## Constraints

### MUST DO

- Establish WCAG 2.1 Level AA as organizational baseline for all web properties (except externally-hosted third-party content)
- Document conformance level for each project and track against standard
- Include accessibility in definition of done for all development work
- Provide accessibility training to designers, developers, QA at project kickoff
- Use native HTML elements before custom ARIA implementations
- Test for conformance using both automated tools AND manual testing
- Ensure focus indicators are visible (minimum 3:1 contrast with background)

### MUST NOT DO

- Selectively apply WCAG criteria ("only accessibility on critical features")
- Use ARIA as a substitute for proper semantic HTML
- Ignore third-party widget accessibility (evaluate vendor accessibility statements)
- Treat accessibility as optional or "nice to have" feature
- Assume automated testing is sufficient (supplement with manual testing)
- Remove focus outlines without providing visible alternative focus indicators
- Declare conformance without testing against entire criterion set

---

## Accessibility Maturity Model

Use this model to assess and plan your organization's accessibility journey:

**Level 1: Reactive** — Accessibility handled ad-hoc, responding to complaints or audits
- No dedicated accessibility expertise or ownership
- Fixes are tactical, not strategic
- High cost per fix (retrofitting after development)

**Level 2: Defined** — Accessibility standards documented, included in development process
- WCAG 2.1 AA adopted as baseline
- Accessibility checklist in definition of done
- Automated testing included in CI/CD pipeline

**Level 3: Repeatable** — Accessibility built into design and development workflow
- Accessibility requirements reviewed in design phase
- Developers use accessible component libraries
- Screen reader testing in QA phase
- Regular accessibility audits (quarterly or annual)

**Level 4: Measured** — Accessibility metrics tracked, continuous improvement
- Accessibility metrics in product dashboard (e.g., violations per page, tools coverage)
- User testing with disabled users informs design
- Accessibility part of performance reviews
- Ongoing training and knowledge sharing

**Level 5: Optimized** — Accessibility excellence; inclusive design default
- Accessible by default in architecture and component libraries
- Inclusive design thinking across organization
- Feedback loop with disabled users influencing roadmap
- Accessibility expertise embedded in all teams

**Checkpoint**: Where is your organization today? What's the next maturity level?

---

## Core Workflow: Establishing WCAG 2.1 AA Compliance

1. **Assess Current State** — Audit existing digital properties against WCAG 2.1 AA. Use automated tools + manual testing. Document gaps and prioritize by severity (Level 1: blocks content, Level 2: degrades experience, Level 3: minor annoyance).

2. **Establish Baseline Standards** — Document target conformance level (recommend: WCAG 2.1 AA for all public products). Create accessibility requirements document. Define testing strategy (automated + manual checklist).

3. **Create Component Library** — Develop or audit existing component library for WCAG 2.1 AA conformance. Ensure semantic HTML, proper ARIA, keyboard support, focus management in all components. Document accessible patterns for developers.

4. **Train Teams** — Conduct accessibility training for designers (color contrast, spacing, clear microcopy), developers (semantic HTML, ARIA, keyboard events, focus management), QA (keyboard testing, screen reader testing, automated tools).

5. **Implement in New Work** — Apply WCAG 2.1 AA requirements to all new features. Include accessibility in design review and QA. Use automated testing in CI/CD. Plan for manual testing at feature completion.

6. **Remediate High-Priority Issues** — Fix critical gaps identified in Step 1. Prioritize based on impact and effort. Track fixes through completion.

7. **Establish Measurement and Governance** — Set up metrics dashboard (WCAG violations, testing coverage, remediation completion rate). Assign accessibility owner/champion. Schedule regular audits (quarterly/annual). Track compliance in project tracking system.

**Checkpoint**: After step 3, can developers implement new features that meet WCAG 2.1 AA without additional effort?

---

## Conclusion

WCAG 2.1 Level AA is the accessibility standard expected by law and best practice in 2024. Success requires organizational commitment, team training, process integration, and sustained effort. Start with understanding the 4 principles and 13 guidelines, apply the "first rule of ARIA" (use native HTML first), and build accessible components into your development workflow from day one. Accessibility benefits everyone — it's not optional.

