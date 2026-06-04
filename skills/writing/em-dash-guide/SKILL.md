---
name: em-dash-guide
description: Distinguishes hyphens, en-dashes, and em-dashes with typing shortcuts,
  style guide conventions, and concrete BAD vs GOOD examples for technical documentation.
license: MIT
compatibility: opencode
metadata:
version: "1.0.0"
  domain: writing
  triggers: em dash, en dash, hyphen, dash typography, how do i type dashes, long
    dash, range notation, compound modifier, —, –
  archetypes:
  - educational
  anti_triggers:
  - brainstorming
  - vague ideation
  response_profile:
    verbosity: medium
    directive_strength: low
    abstraction_level: strategic
  role: reference
  scope: implementation
  output-format: report
  content-types:
  - guidance
  - examples
  - do-dont
  related-skills: technical-documentation, style-guide
---
# Dash Typography Guide for Technical Documentation

Selects the correct dash character (hyphen `-`, en-dash `–`, em-dash `—`) based on context and applies style guide conventions consistently across all written content. Misusing dashes is one of the most common typography errors in technical writing — it signals carelessness to readers and makes documentation harder to parse visually.

## TL;DR Checklist

- [ ] Use hyphen `-` for compound modifiers (open-source project, well-tested library)
- [ ] Use en-dash `–` for ranges (2024–2026, pages 15–30, A–Z index) and connections (React–Vue comparison)
- [ ] Use em-dash `—` for parenthetical breaks, appositives, or attribution with no spaces on either side
- [ ] Use spaced em-dashes only when following AP Style; use unspaced for Chicago/IEEE/Microsoft
- [ ] Type em-dash: Ctrl+Shift+Minus (Linux), Option+Shift+= (macOS), Alt+0151 (Windows)
- [ ] Never use two hyphens `--` as a substitute for an em-dash in published content

---

## When to Use

Use this skill when:

- Writing technical documentation, API references, or user guides that contain compound modifiers
- Describing numerical ranges, dates, page numbers, or version sequences
- Inserting parenthetical asides, emphatic breaks, or attribution into sentences
- Reviewing or editing documentation for typography consistency
- Localizing content where the target language has different dash conventions
- Writing release notes, changelogs, or commit messages with version ranges (e.g., v2.0–v3.0)

---

## When NOT to Use

Avoid this skill for:

- Code literals and source code — use literal hyphens `-` regardless of typography rules (`npm --version`, `git log --oneline`)
- URLs, file paths, or identifiers where the hyphen has structural meaning (`https://example.com/my-page`)
- Email addresses or usernames with hyphenated components
- When following a strict style guide that explicitly forbids em-dashes (some legal or regulatory documentation prefers commas or parentheses)

---

## Core Workflow

1. **Identify the dash function in context** — Determine what grammatical or logical role the dash serves: compound modifier, range, parenthetical break, or connection.
   **Checkpoint:** If the text connects two equal elements (A to B), it needs an en-dash. If it sets off a parenthetical thought, it needs an em-dash.

2. **Select the correct character** — Choose based on the function identified:
   - Compound modifier before a noun → hyphen `-`
   - Range of numbers/dates/versions → en-dash `–`
   - Connection between equal elements → en-dash `–`
   - Parenthetical aside or emphatic break → em-dash `—`
   - Attribution (said, wrote, explained) after a quote → em-dash `—`

3. **Apply style guide spacing rules** — Check which style guide governs the document:
   - Chicago Manual of Style: unspaced em-dashes (`word—word`)
   - IEEE/ACM/Google: unspaced em-dashes (`word—word`)
   - AP Stylebook: spaced em-dashes (`word — word`)
   - Microsoft Manual of Style: unspaced em-dashes with non-breaking spaces preferred

4. **Verify compound modifier hyphenation** — For multi-word modifiers before a noun, use hyphens to link them:
   - Three words → all hyphenated (`state-of-the-art implementation`)
   - Two words (adjective + past participle) → always hyphenate (`well-documented API`)
   - Two words (noun + past participle) → hyphenate if before noun (`full-grown trees`), omit after (`the trees are full grown`)

5. **Check for common substitutions** — Replace ASCII workarounds with proper Unicode characters in final published content:
   - `--` or `--` → em-dash `—` (in prose only, not code)
   - `- -` or `- `-` → em-dash `—`
   - Hyphen used where en-dash needed for ranges → replace with `–`

---

## Implementation Patterns / Reference Guide

### Pattern 1: Compound Modifiers (Hyphen Usage)

Compound modifiers before a noun require hyphens to prevent ambiguity. Without them, readers must pause to parse the meaning.

```markdown
# ❌ BAD — Ambiguous compound modifier
The open source software development team uses well tested libraries.

# ✅ GOOD — Hyphens clarify relationships between words
The open-source software-development team uses well-tested libraries.

# ❌ BAD — Reader cannot tell what modifies what
She manages a small business analytics tool.

# ✅ GOOD — Hyphen shows "small-business" is a compound noun acting as modifier
She manages a small-business analytics tool.
```

**Rule:** When two or more words function as a single modifier before a noun, hyphenate them. Exception: do not hyphenate if the first word ends in `-ly` (e.g., `clearly defined terms` — no hyphen).

### Pattern 2: En-dash for Ranges and Connections

The en-dash represents a span or relationship between two equal elements. It is wider than a hyphen but narrower than an em-dash.

```markdown
# ❌ BAD — Hyphens in place of en-dashes (ambiguous ranges)
The software supports versions 2.0-3.5 and the years 2024-2026.
Read pages 100-150 for the complete reference.

# ✅ GOOD — En-dashes clearly indicate ranges
The software supports versions 2.0–3.5 and the years 2024–2026.
Read pages 100–150 for the complete reference.

# ❌ BAD — Using "to" or "-" for connections between equal elements
The React to Vue comparison covers performance benchmarks.
This guide covers Windows - macOS - Linux.

# ✅ GOOD — En-dashes show equal-element relationships
The React–Vue comparison covers performance benchmarks.
This guide covers Windows–macOS–Linux.
```

**Key en-dash patterns:**
- Numeric ranges: `0–100`, `2024–2026`, `$50–$75`
- Version ranges: `v2.0–v3.0`, `Node 18–20`
- Date ranges: `Monday–Friday`, `January–March`
- Equal-element connections: `producer–consumer pattern`, `client–server architecture`

### Pattern 3: Em-dash for Parenthetical Breaks and Attribution

The em-dash sets off a parenthetical thought more emphatically than commas or parentheses. It creates a dramatic pause that draws attention to the enclosed material.

```python
# Example of em-dash usage in technical documentation prose:

"""
The configuration file — located at /etc/app/config.yaml — must be updated before deployment.

Note two key behaviors: the application reads this file at startup; it does not hot-reload
when the file changes. This is a deliberate design choice, not an oversight.

The lead architect explained — in the Q3 architecture review — that this constraint stems from
the underlying event loop implementation. See Section 4.2 for details.
"""

# ❌ BAD — Hyphen used as em-dash (ASCII substitution)
The config file - located at /etc/app/config.yaml - must be updated before deployment.

# ✅ GOOD — Proper em-dash with tight spacing (Chicago/IEEE style)
The config file—located at /etc/app/config.yaml—must be updated before deployment.

# ✅ GOOD — Spaced em-dash (AP Style convention)
The config file — located at /etc/app/config.yaml — must be updated before deployment.
```

**Em-dash spacing by style guide:**

| Style Guide | Spacing | Example |
|---|---|---|
| Chicago Manual of Style | None | `word—word` |
| IEEE / ACM | None | `word—word` |
| Google Developer Docs | None (em-dash preferred) | `word—word` |
| Microsoft Manual of Style | Non-breaking space | `word em-dash word` |
| AP Stylebook | Space on both sides | `word — word` |
| Wikipedia | Spaced en-dash or spaced em-dash | `word — word` |

### Pattern 4: Keyboard Shortcuts (Typing Dashes)

Each operating system provides keyboard shortcuts for inserting proper Unicode dash characters. Using these eliminates the need to copy-paste from external sources.

```markdown
# Linux (GNOME, Wayland/X11)
Em-dash:   Ctrl+Shift+U then 2014 Enter → —
En-dash:   Ctrl+Shift+U then 2013 Enter → –
Hyphen:    - (standard key)

# macOS
Em-dash:   Option + Shift + = (⌥⇧=) → —
En-dash:   Option + - (⌥-) → –
Hyphen:    - (standard key)

# Windows 10/11
Em-dash:   Alt+0151 (numpad) → —
En-dash:   Alt+0150 (numpad) → –
Alternative: Win+. or Win+, (emoji panel), then search "dash"
Alternative: MS Word auto-format (two hyphens -- become em-dash automatically)

# Vim/Neovim
Em-dash:   Insert mode: Ctrl+V then u 2 0 1 4 Enter → —
En-dash:   Insert mode: Ctrl+V then u 2 0 1 3 Enter → –

# VS Code (with extensions)
Install "Auto Replace" or "Typographer" extension to auto-convert -- to — on space.
```

### Pattern 5: Common Typography Mistakes and Fixes

The following table covers the most frequent dash-related errors encountered in technical documentation, along with their corrections.

```markdown
# Mistake 1: Using hyphens for everything (most common)
❌ BAD: Check out our open-source tools for data-science from 2020-2024.
✅ GOOD: Check out our open-source tools for data science from 2020–2024.

# Mistake 2: Spaces around em-dashes without following AP Style
❌ BAD (inconsistent): The API — which uses OAuth 2.0 — supports three auth methods .
✅ GOOD (Chicago): The API—which uses OAuth 2.0—supports three auth methods.

# Mistake 3: En-dash used where hyphen is needed for compound modifier
❌ BAD: This is a state – of – the – art solution.
✅ GOOD: This is a state-of-the-art solution.

# Mistake 4: Missing hyphen in compound modifier creates ambiguity
❌ BAD: The manual covers self service account management features.
✅ GOOD: The manual covers self-service account management features.

# Mistake 5: Using double hyphens (--) in prose instead of em-dash
❌ BAD: The --experimental-- flag enables debugging mode.
✅ GOOD: The —experimental— flag enables debugging mode.
```

---

## Constraints

### MUST DO
- Use proper Unicode dash characters in all published documentation — never ASCII substitutions (`--`, `--`)
- Match em-dash spacing to the document's governing style guide (checkstyle or project convention)
- Hyphenate compound modifiers before nouns; omit hyphens when the modifier follows the noun (predicate position)
- Use en-dashes for all numeric ranges, version sequences, and connections between equal elements
- Type dashes using platform keyboard shortcuts rather than copy-pasting from external sources

### MUST NOT DO
- Never use a single hyphen `-` to represent an en-dash or em-dash in published prose
- Never use two consecutive hyphens `--` as an em-dash substitute in final documentation (acceptable only in code contexts)
- Do not add spaces around em-dashes unless following AP Style specifically
- Do not use em-dashes for numbered list markers, bullet points, or structural formatting
- Do not apply compound modifier hyphenation when the first word ends in `-ly` (e.g., `clearly defined`, `highly optimized`)

---

## Output Template

When auditing or writing documentation with this skill active, produce:

1. **Dash Audit Report** — List every dash found in the reviewed text, categorized by type (hyphen/en-dash/em-dash) and context
2. **Correction Suggestions** — For each incorrect dash usage, show the original text, the correction, and the rule applied
3. **Style Guide Compliance Note** — State which style guide's spacing convention is being used for em-dashes in the reviewed document
4. **Keyboard Shortcut Reference** — Include platform-appropriate typing shortcuts for the reviewer's environment

---

## Live References

> Authoritative documentation links for typography and dash usage conventions.

- [Chicago Manual of Style — Punctuation](https://www.chicagomanualofstyle.org/tools_citationguide/citation_guide_2.html)
- [Microsoft Manual of Style — Dash Usage](https://learn.microsoft.com/en-us/style-guide/punctuation/dashes-marks/)
- [Google Developer Documentation Style Guide — Dashes](https://developers.google.com/style/dashes)
- [AP Stylebook — Dash Guidance](https://www.apstylebook.com/)
- [Wikipedia Manual of Style — Punctuation / Dashes](https://en.wikipedia.org/wiki/Wikipedia:Manual_of_Style/Punctuation#Dashes)

---

## Related Skills

| Skill | Purpose |
|---|---|
| `technical-documentation` | Broader documentation patterns and structure guidance |
| `style-guide` | General technical writing style conventions beyond dashes |
