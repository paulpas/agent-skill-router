---
name: best-practices
description: '"Provides Markdown best practices for OpenCode skills - syntax rules,
  common pitfalls, and coding practices for documentation consistency"'
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  role: implementation
  scope: implementation
  output-format: code
  triggers: markdown best practices, markdown-best-practices, opencode, skills, syntax
  related-skills: null
---



# Markdown Best Practices Skill

A comprehensive guide to writing clean, consistent, and maintainable Markdown documentation for the APEX Trading Platform.

## Purpose

Why markdown best practices matter for documentation quality:

- **Consistency**: Uniform formatting across all documentation makes content easier to scan and understand
- **Maintainability**: Well-structured Markdown is easier to update, refactor, and migrate
- **Collaboration**: Clear standards reduce friction when multiple authors contribute
- **Tooling Compatibility**: Proper syntax ensures compatibility with converters, parsers, and generators
- **Longevity**: Standards-compliant Markdown remains usable as tools and platforms evolve

## Syntax Rules

### GitHub Flavored Markdown (GFM)

- Use `#` through `######` for headings (one space after `#`)
- Use `---` for horizontal rules (three or more dashes, underscores, or asterisks)
- Use `**bold**` and `*italic*` for emphasis (avoid `_` for italic as it conflicts with lists)

### Lists

- Use `- ` for unordered lists (hyphen + space)
- Use `1. ` for ordered lists (number + period + space)
- **Indentation**: Use 2 spaces per level for nested lists
- Sublists require blank line before them

```markdown
- First item
  - Nested item
  - Another nested
- Second item
```

### Code Blocks

- Use triple backticks with language identifier: ```language
- Include language for syntax highlighting and proper parsing
- For inline code, use single backticks: `code`

```javascript
// Correct
function example() {
  return true;
}
```

### Tables

- Use pipes `|` for column separators
- Include alignment colons in separator row
- Proper alignment syntax:

```markdown
| Left-Aligned | Center-Aligned | Right-Aligned |
|:-------------|:--------------:|--------------:|
| left         |     center     |        right  |
```

- Alignment syntax:
  - `:---` = left aligned
  - `:---:` = center aligned
  - `---:` = right aligned

## Common Pitfalls

### Bullet List Formatting Issues

- **Missing prefix**: Using `-` without space after
  ```markdown
  -item  # Wrong
  - item # Correct
  ```

- **Inconsistent indentation**: Mixing tabs/spaces or wrong spacing
  ```markdown
  - Level 1
     - Level 2  # 3 spaces - wrong
  - Level 1
    - Level 2  # 2 spaces - correct
  ```

### Table Alignment Problems

- **Missing alignment row**: Table header without separator
  ```markdown
  | Header |
  | Value  |  # Wrong - missing ---
  ```

- **Incorrect alignment syntax**: Using spaces instead of colons
  ```markdown
  | Header |
  |   X    |  # Wrong - just spaces
  |:------:|  # Correct - colons for center
  ```

### Code Fence Issues

- **Missing language identifier**: Language not specified
  ```markdown
  ```
  code here
  ```  # Wrong - no language specified
  ```

  ```javascript
  code here
  ```  # Correct - language specified
  ```

- **Inconsistent closing**: Mismatched backticks
  ```markdown
  ```javascript
  code
  ````
  ```

## Coding Practices

### Frontmatter Best Practices

Use YAML frontmatter at the top of documents:

```yaml
---
name: Skill Title
description: Brief description of the skill's purpose
category: Documentation
---
```

- Always include `name` and `description` fields
- Keep values short and descriptive
- Use consistent casing (title case for names)
- Include `category` if applicable

### File Structure

- One skill per file
- File name matches skill name (lowercase, hyphen-separated)
- Frontmatter at absolute top (before any content)
- Blank line between frontmatter and content

### Naming Conventions

- **Files**: lowercase-hyphen-separated.md
- **Headings**: Title Case (first letter capitalized)
- **Variables in code**: camelCase
- **Constants**: UPPER_SNAKE_CASE

## Fundamentals

### Markdown Structure

A well-structured document follows this pattern:

1. Frontmatter (optional but recommended)
2. Title (h1 - `# Title`)
3. Introduction/Overview
4. Sections with clear headings
5. Conclusion or summary

### Headings Hierarchy

Always maintain heading hierarchy:

```markdown
# Main Title
## Section
### Subsection
#### Sub-subsection
```

- Skip levels only when using subheadings in tables or lists
- Each page should have exactly one `#` heading
- Don't start content with h2 without h1

### Emphasis and Styling

- Use `**bold**` for emphasis and important terms
- Use `*italic*` for book titles, foreign words, or secondary emphasis
- Use `` `code` `` for references to code, file names, commands
- Use `> blockquote` for quotes and attributed content

## Scaling

### Documentation Standards for Large Projects

**File Organization**:
- Split large documents by topic (max 2000 lines per file)
- Use consistent naming: `topic-subtopic.md`
- Create index files for navigation: `index.md` or `README.md`

**Navigation**:
- Use relative links with `.md` extension
- Include section anchors for deep linking: `#heading-name`
- Create navigation breadcrumbs in headers

**Version Control**:
- One commit per documentation change
- Describe changes in commit messages
- Update related files together

**Consistency Checks**:
- Run linters like `markdownlint` or `pymarkdown`
- Define project-specific rules in `.markdownlint.yml`
- Include style guide reference in `CONTRIBUTING.md`

**Automated Workflows**:
- Pre-commit hooks for Markdown validation
- CI checks for broken links
- Automated table of contents generation
