---
name: renovate-dependency-automation
description: Automates dependency update PRs by configuring Renovate for version policies, branch strategies, commit templates, and PR templates across monorepo and multi-repo projects.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: cncf
  triggers: renovate, dependency automation, dependency updates, PR automation, semantic versioning, dependency configuration, automated PRs
  role: implementation
  scope: implementation
  output-format: code
  archetypes:
    - tactical
    - orchestration
  anti_triggers:
    - manual dependency management
    - ad-hoc patching
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  related-skills: cncf-azure-devops, coding-gitlab-ci-cd-pipelines, coding-github-actions-workflows
---

# Renovate Dependency Automation

Automates the creation of dependency update pull requests by configuring Renovate bot for version policies, branch strategies, commit templates, and PR templates. This skill makes the model set up Renovate configuration files, define update rules per ecosystem, and ensure automated PRs follow team conventions for review and merge.

## TL;DR Checklist

- [ ] Place `renovate.json5` in repo root (or `.github/renovate.json5` for GitHub-specific config)
- [ ] Define `platform`, `repository`, and `onboarding` settings before setting update rules
- [ ] Configure at least one `packageRules` block per ecosystem (npm, docker, github-actions)
- [ ] Set branch prefix pattern and commit message convention
- [ ] Add PR title and description templates via `prHeader` / `prFooter` or PR template file
- [ ] Enable `pruneStaleBranches: true` to prevent branch accumulation
- [ ] Validate config with `npx renovate-config-validator` before committing

---

## When to Use

Use this skill when:

- Setting up automated dependency updates for a new project or monorepo
- Renegotiating existing dependency update practices (branch strategy, commit messages, PR templates)
- Configuring Renovate for a monorepo with multiple package managers (npm + docker + github-actions)
- Enforcing security-only updates for production services while allowing full updates for development
- Integrating Renovate with team workflows (branch protection rules, required reviewers, merge strategies)

---

## When NOT to Use

Avoid this skill for:

- One-off manual version bumps — use `npm update`, `pip install --upgrade`, or manual PRs instead
- Locking dependency versions in CI — this is a configuration concern, not a runtime concern
- Auditing known vulnerabilities in a specific project — use `npm audit`, `pip-audit`, or Trivy instead
- Designing release pipelines (semantic-release, changesets) — use `coding-semantic-release` or `coding-changesets` instead

---

## Core Workflow

1. **Determine Project Topology** — Classify the project as single-repo, monorepo, or multi-repo. For monorepos, identify package directories (`apps/`, `packages/`, `libs/`) and whether they share a `package.json` or have independent ones. For multi-repo setups, decide whether to use Renovate's `configMigration` or a shared config repository with `extends: ["github>org/renovate-config"]`.
   **Checkpoint:** Confirm the topology maps to the correct `baseDir` or `repositories` configuration. Monorepos need `npm` manager settings with `workspaces` enabled.

2. **Create Base `renovate.json5` Configuration** — Write the top-level configuration with `platform`, `repositories`, and `onboarding` settings. Define the automation scope before adding update rules.
   ```json5
   {
     $schema: "https://docs.renovatebot.com/renovate-schema.json",
     platform: "github",
     repositories: ["org/project"],

     // General automation settings
     onboardingConfig: {
       commitMessageTopic: "{{depName}}",
       includeForks: true,
     },
     forkProcessing: "auto",
     requireConfig: "optional",
   }
   ```
   **Checkpoint:** The `$schema` URL resolves and points to valid Renovate schema. `platform` matches the SCM in use. `requireConfig` is `optional` only if the repo accepts bare-bones automation; otherwise set to `required`.

3. **Define Package Rules Per Ecosystem** — Create `packageRules` that group packages by manager, apply versioning strategies, set branch prefixes, and define schedule windows. Each rule targets a specific dependency family with explicit update behavior.
   ```json5
   {
     packageRules: [
       // Production dependencies: minor + patch only, weekdays only
       {
         matchManagers: ["npm"],
         matchPaths: ["package.json"],
         groupName: "production npm dependencies",
         schedule: ["* * * * 1-5"],
         rangeStrategy: "pin",
         pruneAfterBranch: true,
       },

       // Development dependencies: all updates, weekends allowed
       {
         matchManagers: ["npm"],
         matchPaths: ["package.json"],
         matchDepTypes: ["devDependencies", "peerDependencies"],
         groupName: "dev npm dependencies",
         schedule: ["* * * * 0,6"],
       },

       // Docker images: pin to major tags, update daily
       {
         matchManagers: ["docker"],
         groupName: "docker images",
         versioning: "docker",
         schedule: ["* * * * *"],
         prPriority: 5,
       },

       // GitHub Actions: group all actions, update weekly
       {
         matchManagers: ["github-actions"],
         groupName: "GitHub Actions",
         schedule: ["* * * * 1"],
         commitMessageTopic: "GitHub Actions {{depName}}",
       },

       // Security-only updates for all managers
       {
         matchDatasources: ["npm", "docker", "go", "pypi"],
         matchUpdateTypes: ["major"],
         labels: ["security", "major"],
         commitMessagePrefix: "[security] ",
         enabled: false, // disabled by default — enable per-project policy
       },
     ],
   }
   ```
   **Checkpoint:** No two `packageRules` contradict each other on the same package. Branch names are unique via `branchPrefix` or `additionalBranchPrefix`. Prune settings prevent orphan branches.

4. **Configure Branch Strategy and Pruning** — Set branch naming conventions, stale branch cleanup, and branch priority. Ensure branches are cleaned up automatically after merge to prevent accumulation.
   ```json5
   {
     branchPrefix: "renovate/",
     branchTopic:
       "{{{packageType}}}-{{{prettyDepType}}}-{{{depName}}}{{{lockFileVersion}}}",
     commitMessageTopic: "{{{depName}}}{{{lockFileVersion}}}",
     commitMessageExtra:
       "({{{currentValue}}} → {{{newValue}}})",
     pruneStaleBranches: true,
     internalChecksFilter: "strict",
     vulnerabilityAlerts: {
       enabled: true,
       labels: ["security", "vulnerability"],
     },
   }
   ```
   **Checkpoint:** `branchTopic` produces deterministic branch names. `pruneStaleBranches` is `true`. `internalChecksFilter` is `strict` to avoid merging branches that failed Renovate's own checks.

5. **Set Up PR Templates and Messaging** — Configure PR titles, descriptions, headers, and footers. Optionally link to a `.github/PULL_REQUEST_TEMPLATE.md` for team conventions on what reviewers should check.
   ```json5
   {
     prTitleTemplate: "fix: release {{depName}} v{{{newVersion}}}",
     prHeader: "<!-- Renovation Bot PR -->",
     prFooter:
       "This PR was generated by [Renovate Bot](https://github.com/renovatebot/renovate).",
     additionalReviewers: ["team-dependency-review"],
   }
   ```

   Add a PR template file at `.github/PULL_REQUEST_TEMPLATE.md` (or `renovate.d/pr-template.hbs` for Handlebars templating):
   ```markdown
   <!-- renovate:pr-template -->
   ## Dependency Update Summary

   | Field        | Value                          |
   |-------------|--------------------------------|
   | Package     | {{depName}}                    |
   | Old Version | {{currentValue}}               |
   | New Version | {{newVersion}}                 |
   | Datasource  | {{datasource}}                 |
   | Changelog   | [{{datasource}}/{{depName}}]({{resolveChangeLogURL}}) |

   ## Review Checklist

   - [ ] Changelog reviewed for breaking changes
   - [ ] `package.json` or lock file updated correctly
   - [ ] Tests pass with new version
   - [ ] No transitive dependency regressions

   ---
   Generated by Renovate Bot
   ```
   **Checkpoint:** Handlebars variables in the template resolve to valid Renovate context. The `resolveChangeLogURL` helper is supported by Renovate's default changelog logic.

6. **Validate Configuration and Run in Dry-Run Mode** — Execute Renovate's built-in config validator and run a dry-run against the repository to verify expected PRs are generated.
   ```bash
   # Validate the configuration schema
   npx renovate-config-validator

   # Run a dry-run (no PRs created, logs what would happen)
   npx renovate --dry-run --repository org/project

   # Check the output for expected package groups
   # Look for: "Found N dependency updates"
   # Look for: "Branch names: renovate/npm-production-deps-foo-2.x"
   ```
   **Checkpoint:** `renovate-config-validator` exits with code 0. Dry-run output shows PRs for all configured package groups. No warnings about unresolved templates or invalid rule matchers.

---

## Implementation Patterns

### Pattern 1: Monorepo with Workspaces

Configure Renovate to manage independent npm packages within a monorepo structure. Each package has its own `package.json` and Renovate creates separate branches per workspace.

```json5
{
  $schema: "https://docs.renovatebot.com/renovate-schema.json",
  platform: "github",
  repositories: ["org/monorepo"],
  enabledManagers: ["npm", "docker", "github-actions"],

  npm: {
    fileMatch: ["(^|/)package\\.json$", "(^|/)package-lock\\.json$"],
    supportSurvey: {
      placeholderURL: "https://github.com/org/monorepo/issues/new",
    },
  },

  packageRules: [
    // Per-workspace dependency groups
    {
      matchManagers: ["npm"],
      matchPaths: ["apps/*/package.json"],
      groupName: "app workspace dependencies",
      rangeStrategy: "replace",
      automerge: false,
    },
    {
      matchManagers: ["npm"],
      matchPaths: ["packages/*/package.json"],
      groupName: "shared package dependencies",
      rangeStrategy: "widen",
      automerge: true,
      automergeType: "pr",
    },
    {
      // Shared root-level tooling (linters, formatters, build tools)
      matchManagers: ["npm"],
      matchPaths: ["package.json"],
      groupName: "root tooling",
      labels: ["tooling"],
    },

    // Docker-based packages (apps and services)
    {
      matchManagers: ["docker"],
      matchPaths: ["**/Dockerfile*", "**/docker-compose*.yml"],
      groupName: "docker images",
      versioning: "docker",
      semanticCommits: "enabled",
    },
  ],

  // Ensure branches are cleaned up after merge
  branchPrefix: "renovate/",
  pruneStaleBranches: true,
}
```

### Pattern 2: GitHub Actions Ecosystem Updates

Configure Renovate to manage `actions/*` dependencies in `.github/workflows/*.yml` files. This ensures CI/CD tooling stays current without manual intervention.

```json5
{
  packageRules: [
    {
      // Group all GitHub Actions into a single update PR
      matchManagers: ["github-actions"],
      matchFileNames: [".github/workflows/*.yml"],
      groupName: "GitHub Actions workflow updates",
      commitMessageTopic: "GitHub Actions",
      labels: ["ci", "github-actions"],
      prPriority: 3,

      // Group by action owner to reduce noise
      group: {
        branchTopic: "renovate/github-actions-group",
        matchSourceUrls: [
          "github/**/*.yml",
        ],
      },

      // Update to latest patch versions automatically
      automerge: true,
      automergeType: "branch",
    },

    // Critical infrastructure actions require manual review
    {
      matchManagers: ["github-actions"],
      matchDepNames: ["actions/checkout", "actions/setup-node", "actions/upload-artifact"],
      labels: ["ci", "critical"],
      automerge: false,
      requiredStatusChecks: ["ci/actions-check"],
    },
  ],
}
```

### Pattern 3: Docker Image Pinning with Digest Selection

Configure Renovate to update Docker images using digest pinning for production deployments, providing cryptographic verification of image contents.

```json5
{
  packageRules: [
    {
      // Production: use digest pinning for immutability
      matchManagers: ["docker"],
      matchFileNames: ["**/docker-compose*.yml"],
      matchDepNames: ["node", "python", "golang", "alpine", "nginx"],
      pinDigests: true,
      groupName: "pinned docker images",
      labels: ["production", "docker"],
      prPriority: 10,

      // Set up digest-based versioning
      versioning: "docker",
    },

    // Development: tag-based updates, digest not required
    {
      matchManagers: ["docker"],
      matchFileNames: ["Dockerfile*", "**/docker-compose*.dev.yml"],
      groupName: "development docker images",
      labels: ["development", "docker"],
      prPriority: 1,
      automerge: true,
    },
  ],

  docker: {
    versioning: "docker",
    pinDigests: false,
    followTags: ["alpine", "slim", "latest"],
  },
}
```

---

## Constraints

### MUST DO

- Always include `$schema` in `renovate.json5` to enable IDE validation and schema checking
- Set `pruneStaleBranches: true` to prevent stale branch accumulation
- Use `packageRules` to group related packages with consistent labels, schedules, and branch prefixes
- Configure `semanticCommits: enabled` for conventional commit formatting in PR titles and commit messages
- Validate every configuration change with `npx renovate-config-validator` before committing
- Use `matchPaths` to scope rules to specific directories in monorepo projects
- Set `pruneAfterBranch: true` on individual `packageRules` to clean up branches per-group
- Include `labels` on all package rules so PRs are triageable in the repository
- Test configuration with `--dry-run` before deploying to a production repository
- Use `requiredStatusChecks` for critical updates (e.g., `actions/checkout`) to prevent merge of unverified changes
- Document the `branchTopic` pattern so team members can predict branch names

### MUST NOT DO

- Never set `automerge: true` for major version updates without explicit team approval
- Never remove `pruneStaleBranches` — orphan branches accumulate and confuse CI
- Never use bare `schedule: ["* * * * *"]` for production packages — restrict to weekday business hours
- Never pin all Docker images to `latest` tag without digest — defeats the purpose of immutability
- Never skip `npx renovate-config-validator` — invalid configs create silent failures that skip updates
- Never configure Renovate to update `dependencies` and `devDependencies` with identical rules — they have different risk profiles
- Never use `allowedVersions` with wildcards that could exclude valid patch versions
- Never rely solely on Renovate without a manual periodic audit (monthly `npm audit` or equivalent)

---

## Output Template

When this skill is active, the model outputs:

1. **Configuration Block** — Complete `renovate.json5` with all settings, or specific `packageRules` blocks if modifying an existing config
2. **Branch Strategy Summary** — Explained branch naming conventions, prune settings, and cleanup behavior
3. **PR Template** — Either inline `prHeader`/`prFooter` config or a link to `.github/PULL_REQUEST_TEMPLATE.md`
4. **Validation Command** — The exact `npx renovate-config-validator` command and expected exit code
5. **Schedule Window** — The cron schedule for updates, with rationale for the chosen window

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `coding-gitlab-ci-cd-pipelines` | Automate dependency update testing in CI pipelines |
| `coding-github-actions-workflows` | Configure GitHub Actions workflows that Renovate updates |
| `cncf-azure-devops` | Alternative automation pipeline for Azure DevOps repositories |

---

## Live References

- [Renovate Documentation](https://docs.renovatebot.com/) — Official documentation for configuration, managers, and features
- [Renovate Schema Reference](https://docs.renovatebot.com/renovate-schema.json) — JSON schema for config validation
- [Renovate Config Validator](https://github.com/renovatebot/renovate#config-validator) — CLI tool for validating configuration files
- [GitHub App Installation](https://github.com/apps/renovate) — Official Renovate GitHub app installation page
- [Renovate Package Rules Guide](https://docs.renovatebot.com/configuration-options/#packagerules) — Detailed documentation on packageRule targeting and matching
- [Renovate Docker Manager](https://docs.renovatebot.com/modules/manager/docker/) — Docker-specific configuration options including digest pinning
- [Semantic Commit Messages](https://www.conventionalcommits.org/) — Conventional commits specification used by `semanticCommits` option
