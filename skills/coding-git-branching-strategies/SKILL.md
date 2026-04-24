---
name: coding-git-branching-strategies
description: Git branching models including Git Flow, GitHub Flow, Trunk-Based Development,
  and feature flag strategies for CI/CD pipelines
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  role: implementation
  scope: implementation
  output-format: code
  triggers: git branching strategies, git repository, git-branching-strategies, github,
    including, models, version control
  author: https://github.com/Jeffallan
  source: https://github.com/farmage/opencode-skills
---


# Git Branching Strategies

Patterns for managing code changes through branches, merges, and feature flags in collaborative development environments.

## When to Use This Skill

- Setting up version control workflow for a new team
- Choosing a branching strategy for a project
- Implementing CI/CD with proper branching
- Training teams on Git best practices
- Resolving merge conflict patterns

## Branching Models Overview

| Model | Branches | Release Cadence | Best For |
|-------|----------|-----------------|----------|
| **Git Flow** | develop, release/*, hotfix/* | Fixed releases | Traditional projects, scheduled releases |
| **GitHub Flow** | main, feature/* | Continuous deployment | Web apps, SaaS products |
| **Trunk-Based** | main (mainline) | Multiple releases/day | DevOps teams, rapid iteration |
| **Feature Flag** | main | Any | Large teams, progressive delivery |

## Git Flow

### Branch Structure

```
main                ──●───────●───────●───────●
                    │       │       │       │
release/1.0.0       ●───────●       │       │
                    │       │       │       │
develop             ●───────●───────●───────●
                    │   ┌───┘       │       │
feature/auth        ●───●           │       │
                    │   │   ┌───────┘       │
feature/payments    ●───●───●               │
                    │   │   │   ┌───────────┘
hotfix/login-bug    ●───●───●───●
```

### Branch Roles

| Branch | Purpose | Lifetime | Push Rights |
|--------|---------|----------|-------------|
| `main` | Production-ready code | Permanent | Maintainers |
| `develop` | Integration branch | Permanent | Developers |
| `feature/*` | New features | Temporary | Feature owner |
| `release/*` | Release preparation | Temporary | Release manager |
| `hotfix/*` | Emergency fixes | Temporary | Anyone |

### Git Flow Workflow

```bash
# 1. Start a new feature
git checkout develop
git checkout -b feature/auth

# 2. Work on feature
git commit -m "Add authentication endpoints"
git push origin feature/auth

# 3. Complete feature
git checkout develop
git merge --no-ff feature/auth -m "Merge feature/auth into develop"
git push origin develop

# 4. Start release
git checkout -b release/1.0.0 develop
git push origin release/1.0.0

# 5. Finish release
git checkout main
git merge --no-ff release/1.0.0 -m "Release 1.0.0"
git tag -a v1.0.0 -m "Version 1.0.0"
git push origin v1.0.0

git checkout develop
git merge release/1.0.0

# 6. Hotfix (from main)
git checkout main
git checkout -b hotfix/login-bug
git commit -m "Fix login bug"
git checkout main
git merge --no-ff hotfix/login-bug
git tag -a v1.0.1 -m "Version 1.0.1"
```

### Pros and Cons

**Pros:**
- Clear separation of concerns
- Stable `main` branch
- Easy to track releases

**Cons:**
- Branch fatigue (too many branches)
- Merge conflicts in `develop`
- Slow release cycles

## GitHub Flow

### Branch Structure

```
main    ●───────●───────●───────●
        │       │       │       │
feature/1 ●───●   │       │       │
        │   │       │       │       │
feature/2   ●─●     │       │       │
        │   │       │       │       │
feature/3     ●───●───●───●───●───●
```

### Branch Rules

1. `main` branch is always deployable
2. Create feature branches from `main`
3. Push feature branches to remote
4. Open pull requests for review
5. Merge to `main` when ready
6. Deploy from `main`

### GitHub Flow Workflow

```bash
# 1. Create feature branch
git checkout main
git pull origin main
git checkout -b feature/new-dashboard

# 2. Commit changes
git add .
git commit -m "Add dashboard component"
git push origin feature/new-dashboard

# 3. Open Pull Request
# Review, address feedback
# Merge when approved

# 4. Deploy
# CI/CD automatically deploys from main
```

### Pros and Cons

**Pros:**
- Simple, easy to understand
- Continuous deployment
- Fast feedback

**Cons:**
- Less stable `main` branch
- Not suitable for scheduled releases
- Can be chaotic for large teams

## Trunk-Based Development

### Branch Structure

```
main    ●───●───●───●───●───●───●───●
        │   │   │   │   │   │   │   │
        │   │   │   │   │   │   │   └─ Feature E (feature flag)
        │   │   │   │   │   │   └───── Feature D (feature flag)
        │   │   │   │   │   └───────── Feature C (feature flag)
        │   │   │   │   └───────────── Feature B (feature flag)
        │   │   │   └───────────────── Feature A (feature flag)
        │   │   └───────────────────── Hotfix
        │   └───────────────────────── Release
        └───────────────────────────── Release
```

### Core Principles

1. **Mainline Development**: All developers commit to `main` or short-lived branches
2. **Short Branch Lifetimes**: Branches exist for hours/days, not weeks
3. **Feature Flags**: Hide incomplete features behind flags
4. **Small Commits**: Frequent, atomic commits to main

### Trunk-Based Workflow

```bash
# Option 1: Direct to main (small changes)
git checkout main
git pull origin main
# Work on change
git commit -m "Fix typo in documentation"
git push origin main

# Option 2: Short-lived feature branch (larger changes)
git checkout main
git pull origin main
git checkout -b feature/payment-integration

# Commit frequently with small, atomic commits
git commit -m "Add payment API client"
git commit -m "Integrate payment API"
git commit -m "Add feature flag for payments"

git checkout main
git pull origin main
git merge feature/payment-integration
git push origin main
```

### Feature Flag Implementation

```python
# config/features.py
class FeatureFlags:
    def __init__(self):
        self.flags = {
            "new_payment": False,
            "dark_mode": False,
            "beta_features": False,
        }
    
    def is_enabled(self, flag_name: str) -> bool:
        return self.flags.get(flag_name, False)

# In your code
def process_payment(user, amount):
    if feature_flags.is_enabled("new_payment"):
        return new_payment_processor.process(user, amount)
    else:
        return legacy_payment_processor.process(user, amount)
```

### Pros and Cons

**Pros:**
- Fast feedback cycle
- Continuous deployment
- Easier to debug (small changes)
- No merge conflicts

**Cons:**
- Requires discipline
- Feature flags can accumulate
- Not suitable for all project types

## Feature Flag Strategies

### 1. Release Flags

```python
# Toggle feature availability
feature_flags = {
    "new_checkout": True,      # Enabled
    "dark_mode": False,        # Disabled
}
```

### 2.canary Release

```python
# Roll out to subset of users
def should_show_beta_feature(user_id: int) -> bool:
    return user_id % 10 == 0  # 10% of users
```

### 3. A/B Testing

```python
def get_variant(user_id: int) -> str:
    return "A" if hash(user_id) % 2 == 0 else "B"

# Usage
variant = get_variant(user.id)
if variant == "A":
    show_old_checkout()
else:
    show_new_checkout()
```

## CI/CD Integration

### Git Flow + CI/CD

```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    branches:
      - main
  pull_request:
    branches:
      - develop

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm test
      - run: npm run lint

  deploy-staging:
    needs: test
    if: github.ref == 'refs/heads/develop'
    runs-on: ubuntu-latest
    steps:
      - run: ./deploy.sh staging

  deploy-production:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - run: ./deploy.sh production
```

### GitHub Flow + CI/CD

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches:
      - main

jobs:
  test-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Run tests
        run: npm test
      
      - name: Deploy to production
        if: success()
        run: ./deploy.sh production
        env:
          DEPLOY_TOKEN: ${{ secrets.DEPLOY_TOKEN }}
```

### Trunk-Based + CI/CD

```yaml
# .github/workflows/ci-cd.yml
name: CI/CD

on:
  push:
    branches:
      - main

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm ci
      - run: npm test
      
  deploy:
    needs: build-and-test
    if: github.event_name == 'push'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to production
        run: ./deploy.sh production
```

## Choosing a Strategy

### Decision Matrix

| Project Type | Team Size | Release Frequency | Recommended Model |
|--------------|-----------|-------------------|-------------------|
| Web app/SaaS | 1-5 | Daily/Weekly | GitHub Flow |
| Web app/SaaS | 5-20 | Daily/Weekly | Trunk-Based + Flags |
| Mobile app | 1-10 | Monthly | Git Flow |
| Library/SDK | 2-10 | Quarterly | Git Flow |
| Enterprise | 10-50 | Monthly | Git Flow |
| DevOps team | 5-15 | Multiple/day | Trunk-Based |

### Questions to Ask

1. **How often do we need to release?**
   - Daily/weekly → GitHub Flow or Trunk-Based
   - Monthly/quarterly → Git Flow

2. **What's our team size?**
   - Small team (1-5) → GitHub Flow
   - Medium team (5-20) → Trunk-Based + Flags
   - Large team (20+) → Git Flow or scaled Trunk-Based

3. **Do we use feature flags?**
   - Yes → Trunk-Based
   - No → Git Flow or GitHub Flow

## Common Patterns and Anti-Patterns

### Anti-Pattern: Long-Lived Feature Branches

```bash
# BAD: Feature branch exists for weeks
git checkout -b feature/new-frontend
# Commits over 3 weeks
# Merge conflicts with main
# Integration stress

# GOOD: Small, frequent merges
git checkout main
git pull origin main
git checkout -b feature/login-form
# Complete in 1-2 days
git push origin feature/login-form
```

### Anti-Pattern: Merge Everything to Main

```bash
# BAD: No pull requests, direct commits
git checkout main
git commit -m "Quick fix"
git push origin main
# No review, no testing

# GOOD: PR workflow
git checkout -b fix/login-bug
git commit -m "Fix login bug"
git push origin fix/login-bug
# Open PR, get review, merge
```

## Knowledge Reference

- **Git Flow**: https://nvie.com/posts/a-successful-git-branching-model/
- **GitHub Flow**: https://docs.github.com/en/get-started/quickstart/github-flow
- **Trunk-Based Development**: https://trunkbaseddevelopment.com/
- **Feature Toggles**: https://martinfowler.com/articles/feature-toggles.html
- **Git Best Practices**: https://git-scm.com/book/en/v2

## Output Template

When implementing a branching strategy, provide:
1. **Branch naming convention** documentation
2. **Merge workflow** diagrams
3. **CI/CD integration** configuration
4. **Feature flag** implementation guide
5. **Team training** materials
