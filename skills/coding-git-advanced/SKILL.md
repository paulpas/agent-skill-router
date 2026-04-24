---
name: coding-git-advanced
description: Advanced Git operations including rebasing, cherry-picking, bisecting, reflog, worktrees, filtering branches, and multi-repository workflows for experienced developers
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  role: reference
  scope: implementation
  output-format: code
  triggers: git rebase, git cherry-pick, git bisect, git reflog, worktrees, filter-branch, multi-repo, advanced git
  related-skills: coding-git-branching-strategies, coding-semver-automation
---

# Advanced Git Operations

Reference guide for advanced Git techniques including rebasing, cherry-picking, bisecting, reflog recovery, worktrees, branch filtering, and multi-repository workflows for experienced developers managing complex version control scenarios.

## TL;DR Checklist

- [ ] Understand interactive rebase for history cleaning and commit organization
- [ ] Master cherry-pick for selective commit application and hotfix workflows
- [ ] Use bisect to efficiently locate bug-introducing commits in history
- [ ] Leverage reflog to recover lost commits and undo destructive operations
- [ ] Apply worktrees for parallel work on multiple branches simultaneously
- [ ] Use filter-branch or filter-repo to remove sensitive data or restructure history

---

## When to Use This Skill

Use advanced Git operations when:

- Cleaning up commit history before merging to main
- Selectively applying commits from one branch to another
- Investigating when a bug was introduced in the codebase
- Recovering deleted commits or branches unexpectedly
- Working on multiple branches simultaneously without switching context
- Restructuring history or removing sensitive data before public release
- Managing complex multi-repository workflows with submodules or monorepos
- Performing emergency hotfixes that require selective commits

---

## When NOT to Use This Skill

Avoid advanced operations when:

- Working on shared branches (use merges instead of rebasing)
- Your team lacks Git proficiency (risk of confusion and lost work)
- The repository is small and history doesn't matter (unnecessary complexity)
- You need to preserve a complete audit trail for compliance
- Collaborators have already pulled the branch you're rebasing
- Simple merge or revert would suffice for the task

---

## Interactive Rebase

### Workflow: Clean History Before Merge

```bash
# Start interactive rebase on last 5 commits
git rebase -i HEAD~5

# In editor, choose actions:
# pick = use commit
# reword = use commit, edit message
# squash = use commit, meld into previous
# fixup = use commit, discard message
# drop = remove commit
# exec = run shell command

# Example session:
# pick abc1234 Feature: auth
# squash def5678 Fix auth bug
# reword 789abcd Auth tests
# drop 101112 WIP debug

# After save, resolve any conflicts and continue
git rebase --continue

# Force-push only to your feature branch, NEVER to shared branches
git push origin feature/name --force-with-lease
```

### Common Patterns

```bash
# Squash all commits in feature branch into one
git rebase -i develop
# Mark all as 'pick' except first, which becomes 'squash'

# Reorder commits to group related changes
git rebase -i HEAD~10
# Drag and reorder lines in editor

# Remove a commit from history (non-destructive)
git rebase -i HEAD~5
# Mark unwanted commit as 'drop'

# Edit a commit message in history
git rebase -i HEAD~3
# Mark target commit as 'reword', edit message in next step
```

---

## Cherry-Pick

### Workflow: Selective Commit Application

```bash
# Apply specific commit to current branch
git cherry-pick <commit-hash>

# Cherry-pick multiple commits
git cherry-pick <commit1> <commit2> <commit3>

# Cherry-pick range of commits (inclusive)
git cherry-pick <start-commit>^..<end-commit>

# Cherry-pick with edit opportunity
git cherry-pick -e <commit-hash>

# Continue after resolving conflicts
git cherry-pick --continue

# Abort if conflicts are problematic
git cherry-pick --abort
```

### Hotfix Pattern: Selective Backport

```bash
# Bug fixed in develop, need in main immediately
git checkout main
git pull origin main

# Find the fix commit in develop
git log origin/develop --oneline | grep "Fix: critical bug"

# Apply that specific commit
git cherry-pick abc1234

# Test and verify the fix works on main
npm test

# Push the backported fix
git push origin main

# Later, rebase develop on main to avoid conflict
git checkout develop
git rebase main
```

---

## Git Bisect

### Workflow: Binary Search for Bug

```bash
# Start bisect session
git bisect start

# Mark current commit as bad (has bug)
git bisect bad

# Mark known-good commit (no bug)
git bisect good v1.0.0

# Git automatically checks out midpoint commit
# Test whether this commit has the bug
npm test

# Mark as bad if bug present, good if fixed
git bisect bad
# Git narrows search space further

# Continue until Git identifies the exact commit
# When done, review the culprit commit
git bisect log

# Exit bisect session
git bisect reset
```

### Automated Bisect with Test Script

```bash
# Git bisect can run a test script automatically
git bisect start
git bisect bad
git bisect good v1.0.0

# Run test on each commit automatically
git bisect run npm test

# Git reports first failing commit
# Review and fix the issue
git bisect reset
```

---

## Reflog: Recovery from Destructive Operations

### Find Lost Commits

```bash
# View reflog (history of HEAD movements)
git reflog

# Output example:
# abc1234 HEAD@{0}: reset: moving to abc1234
# def5678 HEAD@{1}: rebase: finished
# 789abcd HEAD@{2}: reset: moving to 789abcd
# ...

# Recover deleted branch
git reflog
# Find the commit that was the tip of deleted branch
git checkout -b recovered-branch abc1234

# Undo a hard reset
git reset --hard HEAD@{1}

# Find a commit that was accidentally dropped in rebase
git reflog
git show abc1234  # Preview the commit
git cherry-pick abc1234  # Apply it back
```

---

## Git Worktrees

### Workflow: Parallel Work Without Context Switching

```bash
# Create a worktree for a new feature
git worktree add ../feature-branch feature/auth

# Switch to the worktree directory
cd ../feature-branch

# Work normally in this directory
git checkout -b feature/auth
npm install && npm test
git add . && git commit -m "Auth improvements"

# Return to main worktree
cd ../main-repo

# List active worktrees
git worktree list

# Remove worktree when done
git worktree remove ../feature-branch

# Prune broken worktrees
git worktree prune
```

### Multiple Worktrees for Parallel Testing

```bash
# Main worktree
cd /path/to/main

# Create testing worktrees for different scenarios
git worktree add ../test-v1 main
git worktree add ../test-v2 feature/newapi

# In test-v1: test main version
cd ../test-v1 && npm test

# In test-v2: test feature version (different terminal)
cd ../test-v2 && npm test

# Compare results, then clean up
git worktree list
git worktree remove ../test-v1
git worktree remove ../test-v2
```

---

## Filter Branch / Filter Repo

### Remove Sensitive Data

```bash
# Using git filter-repo (modern replacement for filter-branch)
# Install: pip install git-filter-repo

# Remove a file from entire history
git filter-repo --path path/to/secret.env --invert-paths

# Remove files matching pattern
git filter-repo --path '*.log' --invert-paths

# Replace sensitive strings in all commits
git filter-repo --message-callback 'return message.replace(b"old_secret", b"[REDACTED]")'

# Push the cleaned history
git push origin --force-with-lease
```

### Combine Repositories (Subtree Merge)

```bash
# Add external repo as remote
git remote add external https://github.com/other/repo.git

# Fetch external repo
git fetch external main

# Create subtree from external repo
git merge -s subtree external/main

# Squash history if desired
git merge --squash -s subtree external/main

# Commit the merge
git commit -m "Merge external-repo as subtree"
```

---

## Multi-Repository Workflows

### Monorepo with Subtree

```bash
# Structure:
# monorepo/
#   services/
#     api/        (subtree from api-repo)
#     web/        (subtree from web-repo)

# Add services as subtrees
git subtree add --prefix services/api https://github.com/org/api-repo main

git subtree add --prefix services/web https://github.com/org/web-repo main

# Update subtrees when upstream changes
git subtree pull --prefix services/api origin main

# Push changes back to upstream
git subtree push --prefix services/api origin main
```

### Submodules for Shared Components

```bash
# Add submodule
git submodule add https://github.com/org/shared-lib libs/shared

# Clone repo with submodules
git clone --recurse-submodules https://github.com/org/main-repo

# Update all submodules
git submodule update --recursive --remote

# Work in submodule
cd libs/shared
git checkout main
git pull
cd ../..

# Commit submodule update to main repo
git add libs/shared
git commit -m "Update shared library to latest"
```

---

## Constraints

### MUST DO

- Use `--force-with-lease` instead of `--force` to avoid overwriting others' work
- Always test history rewriting on a backup branch before force-pushing
- Document why you're rewriting history (commit message or team wiki)
- Use reflog immediately after destructive operations to verify recovery
- Run `git log --oneline -n 20` after complex operations to verify result

### MUST NOT DO

- Never rebase or force-push to shared branches (main, develop, release/*)
- Never use filter-repo on a repository with active collaborators without coordination
- Never assume reflog is permanent (reflog is cleared after 90 days by default)
- Never cherry-pick without checking for conflicts and side effects
- Never bisect on uncommitted changes (commit or stash first)

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `coding-git-branching-strategies` | Foundation for understanding branch structures that advanced ops manipulate |
| `coding-semver-automation` | Automates versioning and tagging, often combined with rebase cleanup |

