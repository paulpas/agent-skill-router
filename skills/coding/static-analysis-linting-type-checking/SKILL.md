---




name: static-analysis-linting-type-checking
description: Implements best practices for integrating static analysis, linting, and type checking into software development workflows ensuring code quality and robustness.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  archetypes:
  - tactical
  - educational
  anti_triggers:
  - brainstorming
  - vague ideation
  response_profile:
    verbosity: medium
    directive_strength: high
    abstraction_level: operational
  domain: coding
  triggers: static analysis, code quality, linting, type checking, code review, how to ensure code quality, quality standards
  role: implementation
  scope: implementation
  output-format: code
  related-skills: coding-quality-assurance, coding-automated-testing




---





# Static Analysis, Linting, and Type Checking
Implements practices for integrating static analysis, linting, and type checking throughout the software development lifecycle. This skill guides developers on ensuring code quality and compliance with industry standards by utilizing various tools and techniques.

## TL;DR Checklist
- [ ] Integrate linting tools to enforce style guidelines
- [ ] Perform static analysis for early error detection
- [ ] Utilize type checking to enhance code robustness and documentation
- [ ] Document tools used and process followed for clarity
- [ ] Regularly review and update configurations based on project changes

---

## When to Use
- When starting a new project to establish code quality standards from day one.
- During code reviews for ensuring adherence to style guides and quality standards.
- When integrating new libraries or frameworks to validate compatibility and best practices.
- Before releasing code to ensure the absence of critical errors and maintainability.

---

## Core Workflow
1. **Setting Up Linting Tools** - Integrate popular linting tools (e.g., ESLint for JavaScript, Flake8 for Python) into the development environment. Ensure that rule sets reflect project-specific guidelines.  
   **Checkpoint:** Verify that the .eslintrc or .flake8 configuration files are properly set up according to team standards.

2. **Implementing Static Analysis** - Use tools like SonarQube or CodeQL for static analysis to identify potential vulnerabilities and code smells. Configure them to run automatically on new commits or pull requests.  
   **Checkpoint:** Ensure that the CI/CD pipeline includes a step for running static analysis and reports are reviewed during the merge process.

3. **Integrating Type Checking** - For languages that support it (like TypeScript and Python with mypy), enable type checking to catch type errors during development. Use typos or type mismatches as opportunities to improve type safety.  
   **Checkpoint:** Set up type checking to run as part of the build process to ensure all code adheres to defined types.

4. **Documenting Best Practices** - Maintain documentation on the rules and configurations for the tools in use. Include examples and clear instructions on how to set up and maintain these standards within the team.  
   **Checkpoint:** Verify that documentation is accessible to all team members and updated regularly based on tool updates.

---

## Implementation Patterns
### Example 1: ESLint Configuration for JavaScript Projects
```javascript
// .eslintrc.js
module.exports = {
    env: {
        browser: true,
        es2021: true,
    },
    extends: [
        'eslint:recommended',
        'plugin:react/recommended',
    ],
    parserOptions: {
        ecmaVersion: 12,
        sourceType: 'module',
    },
    rules: {
        'no-console': 'warn',
        'quotes': ['error', 'single'],
    },
};
```

### Example 2: Type Checking with TypeScript
```typescript
function add(a: number, b: number): number {
    return a + b;
}

const result: number = add(5, 10);
```

---

## Constraints
### MUST DO
- Ensure all team members have the same linting and static analysis configurations to maintain uniformity.
- Regularly consult static analysis reports and fix identified issues to uphold code quality standards.
- Update linting rules based on project evolution and team feedback.

### MUST NOT DO
- Do not ignore linting errors during development — they indicate potential issues that must be addressed.
- Avoid turning off static analysis checks; every check has a purpose in maintaining code quality.
- Never hard-code exceptions in lint rules that undermine the consistency of the codebase.

---

## Output Template
The model will generate outputs containing suggestions for integrating static analysis, linting, and type checking. Each output will include:
1. Step-by-step instructions matching core workflow stages.
2. Sample configurations for various tools relevant to the project.
3. Documentation excerpts that illustrate best practices for the team.

## Live References

> Authoritative documentation links for this domain. The model follows markdown links at load time to resolve external references and inline content.

- [ESLint Documentation](https://eslint.org/docs/latest/use/core-concepts/) — ESLint's official guide for static code analysis, rule configuration, and custom plugin development in JavaScript/TypeScript
- [Ruff: Ultra-Fast Python Linter (Astral)](https://docs.astral.sh/ruff/) — Ruff documentation for the high-performance Python linter that combines flake8, pylint, isort, and more
- [pyright / Pylance Type Checking](https://github.com/microsoft/pyright) — Microsoft's static type checker for Python with language server protocol support
- [MyPy Static Type Checker for Python](https://mypy.readthedocs.io/) — Official MyPy documentation on gradual typing, plugins, and configuration for Python codebases
- [SonarQube Analysis Pipeline](https://docs.sonarsource.com/sonarqube/latest/analyzing-source-code/scanning/sonarcloud-ci-integration/) — SonarQube's guide to integrating static analysis, linting, and code quality gates in CI/CD pipelines
