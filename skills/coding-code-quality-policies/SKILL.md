---
name: coding-code-quality-policies
description: Establishing policies for maintaining a clean codebase including code standards, linting, formatting, testing requirements, cyclomatic complexity limits, and automated enforcement
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  role: implementation
  scope: implementation
  output-format: code
  triggers: code quality, clean code, linting, code formatting, testing policies, cyclomatic complexity, code standards, automated enforcement
  related-skills: coding-git-advanced, coding-architectural-patterns
---

# Code Quality Policies

Implementation guide for establishing and enforcing code quality standards in repositories, including linting configuration, code formatting rules, testing requirements, complexity limits, and automated policy enforcement through CI/CD pipelines.

## TL;DR Checklist

- [ ] Define coding standards (naming, structure, style) for team's language/framework
- [ ] Configure linters to enforce standards automatically (ESLint, Black, Pylint)
- [ ] Set code formatter configuration (Prettier, Black, gofmt) as source of truth
- [ ] Define minimum test coverage threshold (typically 70-80%)
- [ ] Set cyclomatic complexity limits per function (typically ≤10)
- [ ] Enforce policies in pre-commit hooks and CI/CD pipeline
- [ ] Document standards in CONTRIBUTING.md and automate as much as possible

---

## When to Use This Skill

Use code quality policies when:

- Establishing standards for new team or project
- Code review takes excessive time on style issues
- Refactoring legacy code to improve maintainability
- Onboarding engineers and need consistent code expectations
- Reducing defect rates through code quality gates
- Enabling parallel development with consistent code style
- Ensuring security and performance standards are met

---

## When NOT to Use This Skill

Avoid overly strict policies when:

- Team is small and communicates well (less need for standards)
- Prototype or proof-of-concept phase (overhead > value)
- External contributors may be discouraged by complexity
- Performance-critical code where conventions limit optimization
- Existing codebase conflicts heavily with proposed standards (cost of migration > benefit)

---

## Linting Configuration

### JavaScript/TypeScript (ESLint)

```javascript
// .eslintrc.json
{
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended"
  ],
  "parser": "@typescript-eslint/parser",
  "plugins": ["@typescript-eslint", "prettier"],
  "rules": {
    "no-var": "error",
    "prefer-const": "error",
    "no-console": ["warn", { "allow": ["warn", "error"] }],
    "no-unused-vars": "off",
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/explicit-function-return-types": "error",
    "@typescript-eslint/explicit-member-accessibility": "error",
    "complexity": ["warn", 10],
    "max-depth": ["warn", 4],
    "max-lines": ["warn", 300],
    "max-nested-callbacks": ["warn", 3]
  },
  "env": {
    "node": true,
    "es2021": true,
    "jest": true
  },
  "overrides": [
    {
      "files": ["**/*.test.ts"],
      "rules": {
        "no-console": "off",
        "max-lines": ["warn", 500]
      }
    }
  ]
}
```

### Python (Pylint + Flake8)

```ini
# .pylintrc
[MESSAGES CONTROL]
disable=missing-docstring,too-few-public-methods

[DESIGN]
max-locals=10
max-branches=12
max-attributes=7
max-arguments=5

[BASIC]
good-names=i,j,k,ex,Run,_
const-rgx=[A-Z_][A-Z0-9_]*$
```

```ini
# .flake8
[flake8]
max-line-length = 100
max-complexity = 10
ignore = E203,W503
exclude = tests/*,migrations/*
```

### Go (golangci-lint)

```yaml
# .golangci.yml
linters:
  enable:
    - staticcheck
    - errcheck
    - gofmt
    - goimports
    - misspell
    - unused
    - ineffassign
  disable:
    - gosimple

linters-settings:
  misspell:
    locale: US
  goimports:
    local-prefixes: github.com/company/project
```

---

## Code Formatting

### Automatic Formatting (Prettier for JS/TS)

```json
// .prettierrc.json
{
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "semi": true,
  "singleQuote": true,
  "trailingComma": "es5",
  "bracketSpacing": true,
  "arrowParens": "always"
}
```

```json
// package.json
{
  "scripts": {
    "format": "prettier --write .",
    "format:check": "prettier --check ."
  }
}
```

### Python Formatting (Black)

```toml
# pyproject.toml
[tool.black]
line-length = 100
target-version = ['py39']
include = '\.pyi?$'
extend-exclude = '''
/(
  migrations
  | venv
)/
'''
```

```bash
# Format all Python files
black .

# Check without modifying
black --check .
```

### Go Formatting (gofmt)

```bash
# Go uses standard gofmt (built-in)
gofmt -w .

# Check formatting
gofmt -l . | grep -v vendor
```

---

## Testing Requirements

### Test Coverage Policy

```yaml
# codecov.yml
coverage:
  precision: 2
  round: down
  range: "70...100"

# Require minimum coverage
ignore:
  - "migrations"
  - "tests"

status:
  project:
    default:
      threshold: 70
      target: 80
  patch:
    default:
      threshold: 80
```

### Test Configuration

```javascript
// jest.config.js
module.exports = {
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/index.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    },
    './src/critical/': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },
  testMatch: ['**/__tests__/**/*.test.ts', '**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  }
};
```

### Test Types

| Type | Minimum | Critical | UI |
|------|---------|----------|-----|
| Unit | 70% | 85% | 50% |
| Integration | 60% | 80% | 40% |
| E2E | 50% | 60% | 70% |
| **Total** | **70%** | **85%** | **60%** |

---

## Complexity Metrics

### Cyclomatic Complexity

```python
# ❌ HIGH COMPLEXITY (12 — exceeds limit)
def process_order(order):
    if order.is_premium:          # 1
        if order.is_verified:     # 2
            if order.amount > 1000:  # 3
                if order.has_discount:  # 4
                    # ... complex logic
                else:
                    # ... different logic
            else:
                # ... more logic
        else:
            if order.retry_count < 3:  # 5
                # ... retry logic
            else:
                # ... failure logic
    else:
        if order.amount > 100:  # 6
            # ... logic
    return result

# ✅ LOW COMPLEXITY (3)
def process_order(order):
    if not order.is_valid():
        return None
    
    pricing_strategy = get_pricing_strategy(order)
    discounts = calculate_discounts(order)
    
    return pricing_strategy.apply_to(order, discounts)

def get_pricing_strategy(order):
    if order.is_premium:
        return PremiumPricingStrategy()
    return StandardPricingStrategy()

def calculate_discounts(order):
    if not order.is_verified:
        return []
    return order.get_available_discounts()
```

### Metrics Tools

```bash
# JavaScript - Complexity Reporter
npm install --save-dev complexity-report
npx cr --logicalor=false --forin=false src/

# Python - Radon
pip install radon
radon cc -a src/  # Cyclomatic complexity
radon mi -a src/  # Maintainability index

# Go - Gocyclo
go install github.com/fzipp/gocyclo/cmd/gocyclo@latest
gocyclo -over 10 ./...
```

---

## Pre-commit Hooks

### Setup (Husky for Node projects)

```bash
npm install --save-dev husky lint-staged

npx husky install

# Add hook
npx husky add .husky/pre-commit "npx lint-staged"
```

### Configuration (.lintstagedrc.json)

```json
{
  "*.ts": [
    "eslint --fix",
    "prettier --write"
  ],
  "*.py": [
    "black",
    "pylint"
  ],
  "*.go": [
    "gofmt -w",
    "golangci-lint run"
  ]
}
```

### Pre-commit for Python (pre-commit framework)

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.4.0
    hooks:
      - id: trailing-whitespace
      - id: end-of-file-fixer
      - id: check-yaml
      - id: check-added-large-files

  - repo: https://github.com/psf/black
    rev: 23.3.0
    hooks:
      - id: black

  - repo: https://github.com/PyCQA/pylint
    rev: pylint-2.17.4
    hooks:
      - id: pylint

  - repo: https://github.com/PyCQA/flake8
    rev: 6.0.0
    hooks:
      - id: flake8
        args: [--max-line-length=100]
```

---

## CI/CD Enforcement

### GitHub Actions Example

```yaml
# .github/workflows/quality.yml
name: Code Quality

on: [pull_request]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      
      - run: npm ci
      - run: npm run lint
      - run: npm run format:check

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      
      - run: npm ci
      - run: npm test -- --coverage
      
      - uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
          fail_ci_if_error: true
          verbose: true

  complexity:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      
      - run: npm install complexity-report
      - run: npx cr --logicalor=false src/
      
      - name: Check complexity
        run: npx cr --logicalor=false src/ | grep -q "Average" || exit 1
```

---

## Gradual Enforcement

### Phase 1: Baseline (Week 1-2)

```bash
# Establish current metrics
npm run lint > lint-baseline.txt
npm test -- --coverage > coverage-baseline.txt

# Document current state
echo "Lint issues: $(grep error lint-baseline.txt | wc -l)"
echo "Coverage: $(grep lines coverage-baseline.txt)"
```

### Phase 2: Warnings (Week 2-4)

```json
// .eslintrc.json - Set rules to "warn"
{
  "rules": {
    "complexity": ["warn", 15],
    "max-lines": ["warn", 400]
  }
}
```

### Phase 3: Gradual Tightening (Week 4-8)

```json
// Progressively lower thresholds
// Week 4: complexity 15 → 12
// Week 6: complexity 12 → 10
// Week 8: complexity 10 (target)
```

### Phase 4: Enforcement (Week 8+)

```json
// .eslintrc.json - Set rules to "error"
{
  "rules": {
    "complexity": ["error", 10],
    "max-lines": ["error", 300]
  }
}
```

---

## Constraints

### MUST DO

- Configure linters/formatters as source of truth (not opinion)
- Run linters/formatters as part of pre-commit and CI/CD
- Document standards in CONTRIBUTING.md with examples
- Gradually enforce policies (don't create massive breaking changes)
- Exclude generated code and vendor directories from quality checks
- Review and update policies annually

### MUST NOT DO

- Never enforce rules the team disagrees with (buy-in is critical)
- Never ignore policies in CI/CD (enforced rules only, no exceptions)
- Never increase thresholds retroactively without refactoring affected code
- Never disable linter warnings without clear documentation
- Never measure code quality by lines of code or cyclomatic complexity alone

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `coding-git-advanced` | Git hooks and commit history analysis for policy enforcement |
| `coding-architectural-patterns` | Design standards that quality policies help enforce |

