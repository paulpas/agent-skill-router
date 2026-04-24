---
name: coding-semver-automation
description: Automating semantic versioning in Git repositories for version bumping, changelog generation, and release automation using conventional commits and tools like semantic-release
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  role: implementation
  scope: implementation
  output-format: code
  triggers: semantic versioning, semver, version bumping, conventional commits, semantic-release, changelog automation, release automation, git tags
  related-skills: coding-git-advanced, coding-git-branching-strategies
---

# Semantic Versioning Automation

Implementation guide for automating semantic versioning in Git repositories using conventional commits and release automation tools like semantic-release, including version bumping, changelog generation, and release workflows.

## TL;DR Checklist

- [ ] Establish conventional commit format (feat:, fix:, BREAKING CHANGE:) for all commits
- [ ] Configure semantic-release or similar tool in CI/CD pipeline
- [ ] Set up automatic version bumping based on commit types
- [ ] Generate changelogs automatically from commit messages
- [ ] Create and push Git tags for each release
- [ ] Publish artifacts and update version files automatically

---

## When to Use This Skill

Use semver automation when:

- Managing public libraries or frameworks with semantic versioning contract
- Running continuous deployment with frequent releases
- Multiple teams need consistent versioning across services
- You want to reduce human error in version management
- Changelogs should reflect actual commit history
- Teams need clear communication about breaking changes
- Automating release notes and changelog generation

---

## When NOT to Use This Skill

Avoid full automation when:

- Monolithic product with infrequent (quarterly) releases
- Version numbers have business meaning beyond semver (e.g., "Q3 2026.1.0")
- Manual changelog curation is important (mixed with non-code changes)
- Organization prefers explicit version decisions (no automatic bumping)
- Repository has inconsistent or legacy commit practices

---

## Semantic Versioning Format

```
MAJOR.MINOR.PATCH[-PRERELEASE][+BUILD]

Examples:
1.0.0        - First stable release
1.2.3        - Patch fix (1.2.2 → 1.2.3)
2.0.0        - Breaking change (1.x.x → 2.0.0)
2.0.0-rc.1   - Release candidate
2.0.0-alpha  - Alpha release
2.0.0+build-123  - Build metadata

Increment rules:
MAJOR when:   Breaking changes / incompatible API changes
MINOR when:   New features (backward-compatible)
PATCH when:   Bug fixes (backward-compatible)
```

---

## Conventional Commits

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Commit Types

| Type | Meaning | Bumps |
|------|---------|-------|
| `feat` | New feature | MINOR |
| `fix` | Bug fix | PATCH |
| `docs` | Documentation only | None |
| `style` | Code formatting (no logic change) | None |
| `refactor` | Code refactoring | None |
| `perf` | Performance improvement | PATCH |
| `test` | Test additions or changes | None |
| `chore` | Build, deps, tooling | None |

### Breaking Changes

```bash
# Commit message that triggers MAJOR version bump
feat(api): change response format

BREAKING CHANGE: response structure changed from {id, name} to {identifier, full_name}

# Or footer notation
feat!: redesign API endpoint structure

# Or type! notation
feat!: remove deprecated authentication method
```

### Examples

```bash
# Feature commit (MINOR bump)
git commit -m "feat(auth): add two-factor authentication support

- Implement TOTP-based 2FA
- Update user settings UI
- Add 2FA recovery codes"

# Bug fix (PATCH bump)
git commit -m "fix(api): handle null responses in payment gateway"

# Breaking change (MAJOR bump)
git commit -m "feat(api)!: change authentication header format

BREAKING CHANGE: Authorization header changed from 'Bearer token' to 'Token token'"

# No version bump
git commit -m "docs(readme): improve installation instructions"
```

---

## Semantic-Release Setup

### Installation & Configuration

```bash
# Install semantic-release and plugins
npm install --save-dev semantic-release @semantic-release/changelog @semantic-release/git @semantic-release/npm

# Or with yarn
yarn add --dev semantic-release @semantic-release/changelog @semantic-release/git @semantic-release/npm
```

### Configuration File (.releaserc.json)

```json
{
  "branches": [
    "main",
    {
      "name": "develop",
      "prerelease": "rc"
    }
  ],
  "plugins": [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    [
      "@semantic-release/changelog",
      {
        "changelogFile": "CHANGELOG.md"
      }
    ],
    "@semantic-release/npm",
    [
      "@semantic-release/git",
      {
        "assets": [
          "package.json",
          "CHANGELOG.md",
          "src/version.ts"
        ],
        "message": "chore(release): v${nextRelease.version}\n\n${nextRelease.notes}"
      }
    ],
    "@semantic-release/github"
  ],
  "preset": "angular"
}
```

### CI/CD Integration (GitHub Actions)

```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    branches: [main]

jobs:
  release:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      issues: write
      pull-requests: write
      id-token: write

    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0

      - uses: actions/setup-node@v3
        with:
          node-version: 18

      - run: npm ci

      - run: npm run build

      - run: npm test

      - name: Release
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
        run: npx semantic-release
```

---

## Manual Version Management

### If Not Using Automation

```bash
# Manual version bump in package.json
# Old: "version": "1.2.3"
# New: "version": "1.2.4"

npm version patch   # Auto bumps PATCH version
npm version minor   # Auto bumps MINOR version
npm version major   # Auto bumps MAJOR version

# Creates Git tag and commit automatically
# Then push:
git push origin main --tags
```

### Generate Changelog Manually

```bash
# Using conventional-changelog CLI
npm install --save-dev conventional-changelog-cli

# Generate changelog from commits since last tag
npx conventional-changelog -p angular -r 2 -o CHANGELOG.md

# Or for the first time:
npx conventional-changelog -p angular -i CHANGELOG.md -s

# Commit and tag
git add CHANGELOG.md package.json
git commit -m "chore(release): v1.3.0"
git tag v1.3.0
git push origin main --tags
```

---

## Release Workflows

### Workflow 1: Automatic Release from main

```bash
# 1. Developer commits using conventional commits
git commit -m "feat(api): add user profile endpoint"

# 2. Push to main
git push origin main

# 3. CI/CD runs semantic-release automatically
#    - Analyzes commits since last tag
#    - Bumps version (1.2.0 → 1.3.0)
#    - Generates changelog
#    - Creates release notes
#    - Pushes Git tag
#    - Publishes to npm

# 4. GitHub release is created automatically
```

### Workflow 2: Pre-release from develop

```bash
# Development branch uses pre-release versioning
# .releaserc.json has:
# "branches": ["main", {"name": "develop", "prerelease": "rc"}]

git checkout develop
git commit -m "feat: new experimental feature"
git push origin develop

# semantic-release creates v1.3.0-rc.1 (release candidate)
# Version: 1.3.0-rc.1, 1.3.0-rc.2, etc.
# Pre-releases don't update 'latest' tag
```

### Workflow 3: Release from Feature Branch

```bash
# For scheduled releases or managed releases
git checkout -b release/1.3.0

# Fix any last-minute bugs
git commit -m "fix: critical security issue"

# Merge to main with special commit
git checkout main
git merge release/1.3.0 -m "chore(release): merge release/1.3.0"

# semantic-release detects merge and creates tag
git push origin main

# Delete release branch
git branch -d release/1.3.0
```

---

## Changelog Generation

### Generated Changelog Example

```markdown
# [1.3.0](https://github.com/org/repo/compare/v1.2.0...v1.3.0) (2026-04-24)

### Features

- **api**: add user profile endpoint ([abc1234](https://github.com/org/repo/commit/abc1234))
- **auth**: implement refresh token rotation ([def5678](https://github.com/org/repo/commit/def5678))

### Bug Fixes

- **payment**: handle null payment gateway responses ([789abcd](https://github.com/org/repo/commit/789abcd))

### BREAKING CHANGES

- **auth**: authentication header format changed from 'Bearer token' to 'Token token'

---

# [1.2.0](https://github.com/org/repo/compare/v1.1.0...v1.2.0) (2026-04-17)

### Features

- **database**: add connection pooling ([fed4321](https://github.com/org/repo/commit/fed4321))
```

### Custom Changelog Template

```javascript
// conventional-changelog-config.js
module.exports = {
  types: [
    { type: 'feat', section: 'Features', hidden: false },
    { type: 'fix', section: 'Bug Fixes', hidden: false },
    { type: 'perf', section: 'Performance', hidden: false },
    { type: 'docs', section: 'Documentation', hidden: true },
    { type: 'style', section: 'Code Style', hidden: true },
    { type: 'refactor', section: 'Refactoring', hidden: true },
    { type: 'test', section: 'Tests', hidden: true },
    { type: 'chore', section: 'Chores', hidden: true }
  ],
  commitUrlFormat: '{{host}}/{{owner}}/{{repository}}/commit/{{hash}}',
  compareUrlFormat: '{{host}}/{{owner}}/{{repository}}/compare/{{previousTag}}...{{currentTag}}'
};
```

---

## Version Sync Across Files

### Automatic File Updates

```yaml
# .releaserc.json with git plugin
"@semantic-release/git": {
  "assets": [
    "package.json",
    "package-lock.json",
    "pyproject.toml",
    "src/version.ts",
    "src/version.py"
  ],
  "message": "chore(release): v${nextRelease.version}"
}
```

### Version Files

```typescript
// src/version.ts
export const VERSION = "1.3.0";
export const BUILD_DATE = "2026-04-24T10:30:00Z";
```

```python
# src/version.py
VERSION = "1.3.0"
BUILD_DATE = "2026-04-24T10:30:00Z"
```

---

## Constraints

### MUST DO

- Use conventional commit format consistently across team (enforce in pre-commit hooks)
- Document breaking changes explicitly in commit footer (BREAKING CHANGE:)
- Test release process in dry-run mode before enabling in CI/CD
- Keep CHANGELOG.md updated before each release
- Tag every release with Git tags (v1.2.3 format)
- Verify version consistency across all files after release

### MUST NOT DO

- Never manually edit generated changelogs (regenerate from commits instead)
- Never skip tests before automatic release
- Never mix manual and automatic versioning in same repository
- Never commit version bumps without corresponding feature/fix commits
- Never tag pre-releases as latest (use pre-release identifiers)

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `coding-git-advanced` | Git operations like tagging and rebasing used in release workflows |
| `coding-git-branching-strategies` | Release branch strategies that work with semver automation |

