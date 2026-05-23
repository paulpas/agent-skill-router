---
compatibility: opencode
completeness: 95
content-types:
- code
- guidance
- do-dont
- examples
description: '"Provides Advanced Git operations including rebasing, cherry-picking,
  bisecting, reflog, worktrees, filtering branches, and multi-repository workflows
  for exper"'
license: MIT
maturity: stable
metadata:
  domain: coding
  output-format: code
  related-skills: code-quality-policies, git-branching-strategies, semver-automation
  role: reference
  scope: implementation
  triggers: git rebase, git cherry-pick, git bisect, git reflog, worktrees, filter-branch,
    multi-repo, advanced git
  archetypes:
  - educational
  - diagnostic
  anti_triggers:
  - brainstorming
  - vague ideation
  - code golf
  - over-engineering
  response_profile:
    verbosity: medium
    directive_strength: medium
    abstraction_level: tactical
  version: 1.0.0
name: advanced
------
# Advanced Git Operations

Reference guide for advanced Git techniques including rebasing, cherry-picking, bisecting, reflog recovery, worktrees, branch filtering, and multi-repository workflows for experienced developers managing complex version control scenarios.

## TL;DR Checklist

- [ ] Understand interactive rebase for history cleaning and commit organization
- [ ] Master cherry-pick for selective commit application and hotfix workflows
- [ ] Use bisect to efficiently locate bug-introducing commits in history
- [ ] Leverage reflog to recover lost commits and undo destructive operations
- [ ] Apply worktrees for parallel work on multiple branches simultaneously
- [ ] Use filter-branch or filter-repo to remove sensitive data or restructure history

