---
name: github-actions-status
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: View and monitor GitHub Actions workflow runs, statuses, and logs using
  the gh CLI. Lists workflows, inspects run details, follows logs, checks commit statuses,
  and triggers new runs.
license: MIT
maturity: stable
metadata:
  author: https://github.com/paulpas
  domain: agent
  output-format: markdown
  related-skills: null
  role: information
  scope: implementation
  source: local
  triggers: github actions, ci/cd, workflow, gh run, gh workflow, pipeline, build
    status, ci status, action status, check runs
  archetypes:
  - educational
  anti_triggers:
  - brainstorming
  - vague ideation
  - single-agent monolith
  response_profile:
    verbosity: medium
    directive_strength: medium
    abstraction_level: tactical
version: "1.0.0"
---
# GitHub Actions Status

View, monitor, and manage GitHub Actions workflows and their run statuses using the `gh` CLI.

## When to Use This Skill

- Checking the status of CI/CD pipeline runs
- Debugging failed workflow runs by viewing logs
- Monitoring a run until completion
- Listing all workflows and their recent activity
- Triggering a workflow run manually
- Checking commit-level check run statuses via the API

## Prerequisites

- **`gh` CLI must be installed and authenticated** with a GitHub account that has access to the target repository.
- Verify authentication: run `gh auth status` — if not logged in, run `gh auth login`.
- The `--repo <owner>/<repo>` flag is used on all commands to target a specific repository.

## Core Workflow

### Step 1: Identify the Repository

Determine the target repository in `owner/repo` format. If working in a local git repo, you can extract it with:

```bash
git remote get-url origin | sed -E 's|.*:(.+)/(.+)\.git|\1/\2|'
```

### Step 2: List All Workflows

See every workflow file and its last run status:

```bash
gh workflow list --repo <owner>/<repo>
```

This shows each workflow name, ID, state (active/disabled), and the time of its last run.

### Step 3: List Recent Workflow Runs

View the most recent runs across all workflows:

```bash
gh run list --repo <owner>/<repo> --limit 20
```

Use `--status` to filter by state (`pending`, `in_progress`, `completed`, `cancelled`, `failed`, `skipped`, `success`, `neutral`, `timed_out`, `action_required`):

```bash
gh run list --repo <owner>/<repo> --status failed --limit 10
gh run list --repo <owner>/<repo> --status in_progress --limit 10
```

### Step 4: Inspect a Specific Run

View detailed information about a single run:

```bash
gh run view <run-id> --repo <owner>/<repo>
```

This shows the workflow name, status, conclusion, duration, trigger, branch, commit message, and a summary of each job.

### Step 5: View Run Logs

For debugging a failed run, fetch the full logs:

```bash
gh run view <run-id> --repo <owner>/<repo> --log --job <job-id>
```

If no `--job` is specified, all job logs are shown. To list jobs within a run:

```bash
gh run view <run-id> --repo <owner>/<repo> --jobs
```

### Step 6: Monitor a Run in Real-Time

Watch a run's progress until it completes (useful for long-running pipelines):

```bash
gh run watch <run-id> --repo <owner>/<repo>
```

This polls the run status and prints updates. It exits with a non-zero code if the run fails.

### Step 7: Check Commit-Level Check Runs

Query check runs for a specific commit via the GitHub API:

```bash
gh api repos/<owner>/<repo>/commits/<sha>/check-runs
```

This returns check suites and individual check runs, including their conclusions and detailed output.

### Step 8: Trigger a Workflow Run

Manually trigger a workflow:

```bash
gh workflow run <workflow-name> --repo <owner>/<repo> --ref <branch-or-tag>
```

The `--ref` flag specifies which branch/tag to run against (defaults to the default branch).

## Reference

### All Commands

| Action | Command |
|
---

## Constraints

### MUST DO
- Implement all core functionality with explicit error handling and validation at every boundary
- Document the purpose and expected inputs/outputs of each public interface in docstrings or comments
- Use consistent naming conventions that clearly communicate intent — variable names should describe what they represent, not how they are used

### MUST NOT DO
- Do not implement features without considering edge cases, error states, and failure modes
- Avoid accepting unvalidated input at any API or interface boundary
- Never use magic numbers or hardcoded strings that obscure the purpose of configuration values
