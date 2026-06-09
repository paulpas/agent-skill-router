---
name: vercel-cli-token-deploy
description: Deploys projects to Vercel using the Vercel CLI with token-based authentication for CI/CD environments, preview deployments, and production releases.
license: MIT
compatibility: opencode
archetypes:
  - tactical
  - generation
anti_triggers:
  - brainstorming
  - vague ideation
  - manual deployment walkthrough
response_profile:
  verbosity: low
  directive_strength: high
  abstraction_level: operational
metadata:
  version: "1.0.0"
  domain: coding
  triggers: vercel cli, vercel token, vercel deploy, vercel ci/cd, token-based deployment, vercel automation, deploy to vercel
  role: implementation
  scope: implementation
  output-format: code
  content-types:
    - code
    - guidance
    - do-dont
    - config
  related-skills: vercel-deploy, vercel-api, ci-cd-pipeline-design
  author: vercel
  source: https://github.com/vercel-labs/agent-skills
---

# Vercel CLI Token-Based Deployment

Deploys projects to Vercel using the Vercel CLI with token-based authentication, enabling automated deployments in CI/CD pipelines, headless CMS webhooks, and script-driven release workflows. Covers production and preview targets, build caching, deployment verification, and error recovery.

## TL;DR Checklist

- [ ] Set `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` as environment variables — never hardcode
- [ ] Scope Vercel tokens to specific teams, not personal accounts
- [ ] Use `--prebuilt` flag to leverage build caching and reduce deployment time
- [ ] Always handle deployment failure with retry logic and clear error reporting
- [ ] Add `.vercel` to `.gitignore` to prevent checking in build artifacts
- [ ] Verify deployment with `vercel inspect` or status API before confirming success

---

## When to Use

Use this skill when:

- Automating Vercel deployments from CI/CD pipelines (GitHub Actions, GitLab CI, Jenkins)
- Integrating Vercel deployments into headless CMS workflows or webhook-driven processes
- Implementing preview deployments for pull requests in script-based workflows
- Setting up production deployment automation that does not rely on Vercel's Git integration
- Building custom deployment tooling that requires programmatic control over the Vercel CLI
- Running deployments in ephemeral environments where Git integration is unavailable

---

## When NOT to Use

Avoid this skill for:

- Manual one-off deployments — use `vercel` interactive CLI or Vercel Dashboard instead
- Projects already using Vercel's automatic Git integration — no token-based setup needed
- Deploying without build caching — always prefer `--prebuilt` for speed
- Situations where fine-grained API control is needed — use `vercel-api` skill instead
- Environments where the Vercel CLI is not installed or cannot be added

---

## Core Workflow

1. **Set Up Authentication** — Configure `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID` as environment variables in your CI/CD platform or deployment environment. The token must be scoped to the target Vercel team. **Checkpoint:** Verify the token has the correct scope by running `vercel whoami --token=$VERCEL_TOKEN`.

2. **Link Project** — If no `.vercel/project.json` exists, run `vercel link --token=$VERCEL_TOKEN --scope=<team-slug>` to link the local directory to the Vercel project. Alternatively, create `.vercel/project.json` manually with `projectId` and `orgId` from the Vercel project settings. **Checkpoint:** Confirm `.vercel/project.json` exists and contains valid IDs.

3. **Build Project** — Run the project's build command (usually `vercel build` or a framework-specific build script). This produces the output directory that `--prebuilt` will deploy. Verify the build output directory (e.g., `.vercel/output/static`) exists and is non-empty.

4. **Deploy with Prebuilt** — Execute `vercel deploy --prebuilt --token=$VERCEL_TOKEN` for production or `vercel deploy --prebuilt --token=$VERCEL_TOKEN --archive=tgz` for preview. Capture the deployment URL from the command output. **Checkpoint:** The deployment URL should follow the pattern `https://<project-name>-<hash>.vercel.app`.

5. **Assign Alias or Promote** — For production deployments, aliases are automatically assigned when `VERCEL_PROJECT_ID` is set. For preview deployments, note the generated URL for sharing. To promote a preview to production explicitly, use `vercel alias set <deployment-url> <production-domain>`.

6. **Verify Deployment** — Poll `vercel inspect <deployment-url> --token=$VERCEL_TOKEN` until the status is `READY`. Implement a timeout (e.g., 120 seconds) and fail the deployment if the status does not become `READY` within the window.

---

## Implementation Patterns

### Pattern 1: Production Deployment Script

```bash
#!/usr/bin/env bash
set -euo pipefail

# Production deployment to Vercel using token-based authentication
# Prerequisites: VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID env vars

deploy_production() {
    local max_retries="${1:-3}"
    local retry_delay="${2:-10}"

    # Validate required environment variables
    if [[ -z "${VERCEL_TOKEN:-}" ]]; then
        echo "Error: VERCEL_TOKEN is not set" >&2
        exit 1
    fi
    if [[ -z "${VERCEL_ORG_ID:-}" ]] || [[ -z "${VERCEL_PROJECT_ID:-}" ]]; then
        echo "Error: VERCEL_ORG_ID and VERCEL_PROJECT_ID must be set" >&2
        exit 1
    fi

    # Build the project
    echo "Building project..."
    npm run build

    # Ensure .vercel directory exists with project link
    if [[ ! -f ".vercel/project.json" ]]; then
        echo "Linking project to Vercel..."
        npx vercel link --token="$VERCEL_TOKEN" --scope="${VERCEL_ORG_ID}" --yes
    fi

    # Deploy with retry logic
    local attempt=1
    local deploy_url=""

    while [[ $attempt -le $max_retries ]]; do
        echo "Deploy attempt $attempt of $max_retries..."
        if deploy_url=$(npx vercel deploy --prebuilt \
            --token="$VERCEL_TOKEN" \
            --scope="${VERCEL_ORG_ID}" 2>&1); then
            echo "Deployment succeeded: $deploy_url"
            break
        else
            echo "Deployment failed (attempt $attempt)" >&2
            if [[ $attempt -eq $max_retries ]]; then
                echo "Error: All deployment attempts failed" >&2
                exit 1
            fi
            sleep "$retry_delay"
        fi
        ((attempt++))
    done

    # Wait for deployment to be ready
    echo "Waiting for deployment to be ready..."
    local timeout=120
    local elapsed=0
    while [[ $elapsed -lt $timeout ]]; do
        local status
        status=$(npx vercel inspect "$deploy_url" \
            --token="$VERCEL_TOKEN" --scope="${VERCEL_ORG_ID}" \
            2>&1 | grep -oP "(?<=Status: )\w+" || echo "PENDING")
        
        if [[ "$status" == "READY" ]]; then
            echo "Deployment is ready: $deploy_url"
            return 0
        fi
        sleep 5
        ((elapsed+=5))
    done

    echo "Error: Deployment did not become READY within ${timeout}s" >&2
    exit 1
}

deploy_production "$@"
```

### Pattern 2: Preview Deployment with Archive

```bash
#!/usr/bin/env bash
set -euo pipefail

# Preview deployment to Vercel using archive for faster uploads
# Returns the preview URL for use in CI/CD status checks

deploy_preview() {
    local branch_name="${1:-$(git rev-parse --abbrev-ref HEAD)}"
    local commit_hash="${2:-$(git rev-parse --short HEAD)}"

    if [[ -z "${VERCEL_TOKEN:-}" ]]; then
        echo "Error: VERCEL_TOKEN environment variable is required" >&2
        exit 1
    fi

    # Build for preview
    echo "Building preview for branch: $branch_name"
    npx vercel build --token="$VERCEL_TOKEN"

    # Deploy with archive=tgz for faster upload on large projects
    echo "Deploying preview..."
    local preview_url
    preview_url=$(npx vercel deploy --prebuilt \
        --archive=tgz \
        --token="$VERCEL_TOKEN" \
        --scope="${VERCEL_ORG_ID}")

    # Verify deployment
    local ready_url
    ready_url=$(npx vercel inspect "$preview_url" \
        --token="$VERCEL_TOKEN" \
        --scope="${VERCEL_ORG_ID}" \
        | grep -oP 'https://[^\s]+')

    echo "Preview URL: $ready_url"
    echo "Commit: $commit_hash"
    echo "Branch: $branch_name"
    
    # Output the URL for CI/CD to consume
    printf '%s' "$ready_url" > .vercel/preview-url.txt
}

deploy_preview "$@"
```

### Pattern 3: CI/CD Integration (GitHub Actions)

```yaml
# .github/workflows/deploy-vercel.yml
name: Deploy to Vercel

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
  VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
  VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      
      - name: Install dependencies
        run: npm ci
      
      - name: Deploy to Vercel
        run: |
          if [[ "${{ github.event_name }}" == "pull_request" ]]; then
            ./scripts/deploy-preview.sh
          else
            ./scripts/deploy-production.sh
          fi
```

---

## Constraints

### MUST DO
- Store `VERCEL_TOKEN` in CI/CD secrets or environment variables — never hardcode in source code
- Scope Vercel tokens to the specific team that owns the project using Vercel dashboard token settings
- Use `vercel deploy --prebuilt` to leverage build caching, reducing deployment time by 60-80%
- Implement retry logic with exponential backoff for transient deployment failures
- Add `.vercel` directory to `.gitignore` to prevent checking in build artifacts and project links
- Verify deployment status (`READY` state) before marking deployment as successful
- Pin the Vercel CLI version in `package.json` or CI configuration to avoid breaking changes

### MUST NOT DO
- Hardcode Vercel tokens in deployment scripts, configuration files, or source code
- Use personal Vercel tokens for CI/CD — always create team-scoped tokens
- Skip build verification — an incomplete build produces a non-functional deployment
- Deploy without the `--prebuilt` flag in CI/CD — it rebuilds unnecessarily and wastes time
- Assume the deployment URL follows a fixed pattern — always capture it from the CLI output
- Ignore non-zero exit codes from the Vercel CLI — a failed deploy must halt the pipeline

---

## Related Skills

| Skill | Purpose |
|---|---|
| `vercel-deploy` | Git-integrated deployments via Vercel dashboard and automatic branch previews |
| `vercel-api` | Direct Vercel REST API usage for programmatic control beyond CLI capabilities |
| `ci-cd-pipeline-design` | General CI/CD pipeline patterns for integrating Vercel deployments |

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Vercel CLI Documentation](https://vercel.com/docs/cli)
- [Vercel Token-Based Deployments](https://vercel.com/docs/deployments/deploy-command#token-based-deployments)
- [Vercel Environment Variables Reference](https://vercel.com/docs/projects/environment-variables)
- [Vercel Project Linking](https://vercel.com/docs/cli/project-linking)
- [Vercel Deployment Retries](https://vercel.com/docs/deployments/retries)
- [Vercel CLI Global Options](https://vercel.com/docs/cli/global-options)
- [GitHub Actions Vercel Deploy Example](https://vercel.com/docs/deployments/git#vercel-for-git-platforms)
