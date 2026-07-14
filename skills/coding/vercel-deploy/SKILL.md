---
name: vercel-deploy
description: Deploys frontend applications to Vercel with preview deployments, production releases, and environment-specific configuration management via Git integration.
license: MIT
compatibility: opencode
archetypes:
  - tactical
  - orchestration
anti_triggers:
  - brainstorming
  - vague ideation
  - server provisioning
response_profile:
  verbosity: low
  directive_strength: high
  abstraction_level: operational
metadata:
  version: "1.0.0"
  domain: coding
  triggers: vercel deploy, vercel deployment, deploy to vercel, vercel hosting, vercel preview, vercel production, frontend deployment
  role: implementation
  scope: implementation
  output-format: code
  content-types:
    - code
    - guidance
    - do-dont
    - config
  related-skills: vercel-cli-token-deploy, vercel-api, ci-cd-pipeline-design
  author: vercel
  source: https://github.com/vercel-labs/agent-skills
---

# Vercel Deployment (Git-Integrated)

Deploys frontend applications to Vercel using automatic Git integration, with preview deployments for every pull request, production releases on main branch commits, environment variable management, custom domains, and build configuration. Covers the full lifecycle from project setup to production monitoring.

## TL;DR Checklist

- [ ] Connect Git repository to Vercel before configuring any project settings
- [ ] Set environment variables for all environments (development, preview, production) before first deploy
- [ ] Configure a production domain and verify SSL certificate provisioning
- [ ] Test preview deployments before merging pull requests to main
- [ ] Enable Vercel Analytics after production deployment is verified
- [ ] Configure deployment protection rules for production branch

---

## When to Use

Use this skill when:

- Deploying a frontend application (Next.js, Nuxt, SvelteKit, Astro, Remix, or static site) to Vercel
- Setting up automatic preview deployments for every pull request in a team workflow
- Configuring production deployment triggers on main branch commits
- Managing environment variables across development, preview, and production environments
- Configuring custom domains, SSL certificates, and deployment protection
- Setting up Serverless Functions, Edge Functions, or middleware with Vercel
- Integrating Vercel Analytics and monitoring into a deployed application

---

## When NOT to Use

Avoid this skill for:

- Token-based CLI deployments in CI/CD — use `vercel-cli-token-deploy` instead
- Deploying backend-only applications — Vercel is optimized for frontend + serverless API patterns
- Manual one-off deployments — use `vercel` CLI directly or Vercel Dashboard
- Infrastructure-as-code provisioning — use `vercel-api` for API-level control
- Projects that need custom build runners or non-standard deployment environments

---

## Core Workflow

1. **Connect Git Repository** — Import the Git repository into Vercel via the Vercel Dashboard ("Add New Project"). Select the Git provider (GitHub, GitLab, Bitbucket) and authorize Vercel to access the repository. **Checkpoint:** Verify that Vercel can list branches and commits for the repository.

2. **Configure Project** — Set the framework preset (auto-detected for Next.js, Nuxt, etc.), build command (`npm run build` or override), output directory (`.next`, `dist`, `build`), and install command (`npm ci` or override). Configure Root Directory if the project is a monorepo subdirectory. **Checkpoint:** Run a test build locally with the same settings to confirm success.

3. **Set Environment Variables** — Add environment variables in the Vercel Dashboard under Project Settings > Environment Variables. Scope each variable to the appropriate environments (Development, Preview, Production). Use the `vercel env` CLI command for bulk import from `.env` files. **Checkpoint:** Verify that preview deployments do not have access to production secrets by checking environment scopes.

4. **Configure Custom Domain** — Add the production domain under Project Settings > Domains. Vercel automatically provisions SSL certificates via Let's Encrypt. Configure a `vercel.json` redirect if migrating from an old domain. Add `CNAME` or `ALIAS` DNS records as instructed by Vercel. **Checkpoint:** Verify the domain resolves and the SSL certificate is active (green padlock).

5. **Set Up Preview and Production Branches** — Configure the Production Branch under Project Settings > Git. By default, `main` is the production branch. All other branches and pull requests generate preview deployments with unique URLs. Configure automatic preview deployment commenting in GitHub PRs. **Checkpoint:** Push a test branch and verify a preview deployment URL is generated and posted.

6. **Deploy and Verify** — Push to the production branch to trigger the first production deployment. Monitor the deployment status in the Vercel Dashboard. Verify the live site at the production domain. Check Vercel Analytics (once enabled) to confirm traffic is being tracked. **Checkpoint:** Run Lighthouse or a similar tool against the production URL to verify performance and SEO.

---

## Implementation Patterns

### Pattern 1: Vercel Project Configuration (vercel.json)

```json
{
  "version": 2,
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm ci",
  "framework": "nextjs",
  "outputDirectory": ".next",
  "regions": ["iad1"],
  "headers": [
    {
      "source": "/(.*)\\.(png|svg|jpg|jpeg|webp|avif)$",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    },
    {
      "source": "/(.*)\\.(js|css)$",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    },
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        }
      ]
    }
  ],
  "redirects": [
    {
      "source": "/old-path",
      "destination": "/new-path",
      "permanent": true
    }
  ],
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "/api/$1"
    }
  ]
}
```

### Pattern 2: Environment Variable Management

```bash
#!/usr/bin/env bash
set -euo pipefail

# Bulk import environment variables to Vercel
# Usage: ./scripts/pull-env.sh <environment>
# Environments: development, preview, production

pull_env() {
    local env="${1:-development}"

    if [[ -z "${VERCEL_TOKEN:-}" ]]; then
        echo "Error: VERCEL_TOKEN is not set" >&2
        exit 1
    fi

    # Pull current environment variables from Vercel
    echo "Pulling $env environment variables from Vercel..."
    npx vercel env pull .env."$env" \
        --token="$VERCEL_TOKEN" \
        --environment="$env"

    echo "Environment variables written to .env.$env"
}

push_env() {
    local env_file="${1:-.env}"
    local environment="${2:-development}"

    if [[ ! -f "$env_file" ]]; then
        echo "Error: Environment file $env_file not found" >&2
        exit 1
    fi

    # Add each variable from the file to Vercel
    while IFS='=' read -r key value; do
        # Skip comments and empty lines
        [[ "$key" =~ ^#.*$ ]] && continue
        [[ -z "$key" ]] && continue

        echo "Setting $key for $environment..."
        echo "$value" | npx vercel env add "$key" "$environment" \
            --token="$VERCEL_TOKEN" --yes
    done < "$env_file"
}

case "${1:-pull}" in
    pull) pull_env "${2:-development}" ;;
    push) push_env "${2:-.env}" "${3:-development}" ;;
    *) echo "Usage: $0 [pull|push] [env]" >&2; exit 1 ;;
esac
```

### Pattern 3: Deploy Hook Automation

```bash
#!/usr/bin/env bash
set -euo pipefail

# Trigger a Vercel deployment via Deploy Hook
# Deploy Hooks provide URL-based deployment triggers for external CI

trigger_deploy_hook() {
    local hook_url="${1:-}"
    local source_label="${2:-external}"

    if [[ -z "$hook_url" ]]; then
        echo "Error: Deploy Hook URL is required" >&2
        echo "Usage: $0 <hook-url> [source-label]" >&2
        exit 1
    fi

    echo "Triggering Vercel deploy hook from source: $source_label"
    
    local response
    response=$(curl -s -X POST "$hook_url" \
        -H "Content-Type: application/json" \
        -d "{\"source\": \"$source_label\"}")

    local job_id
    job_id=$(echo "$response" | grep -oP '(?<="jobUid":")\w+')

    if [[ -n "$job_id" ]]; then
        echo "Deploy triggered successfully. Job ID: $job_id"
    else
        echo "Error: Failed to trigger deploy hook" >&2
        echo "Response: $response" >&2
        exit 1
    fi
}

trigger_deploy_hook "$@"
```

---

## Constraints

### MUST DO
- Set environment variables before the first deployment to prevent missing-configuration errors
- Test preview deployments by opening the preview URL and verifying functionality before merging
- Configure deployment protection (preview deployment password or IP-based access) for sensitive projects
- Use immutable caching headers (`max-age=31536000`) for static assets with content hashing in filenames
- Enable Vercel Analytics after production deployment to monitor real-user performance
- Configure proper `vercel.json` redirects for URL migrations to preserve SEO ranking

### MUST NOT DO
- Deploy secrets, API keys, or service credentials in source code — always use Vercel Environment Variables
- Assume the auto-detected framework preset is correct without verifying the build output
- Use the production domain for testing — always test on preview deployment URLs first
- Skip deployment protection on production branches — enable at minimum a password gate
- Deploy unoptimized images or uncompressed assets — always configure image optimization
- Neglect to set `Cache-Control` headers — missing cache headers hurt Core Web Vitals

---

## Related Skills

| Skill | Purpose |
|---|---|
| `vercel-cli-token-deploy` | Scripted deployments with token auth for CI/CD environments without Git integration |
| `vercel-api` | Direct Vercel REST API access for programmatic deployment management beyond CLI |
| `ci-cd-pipeline-design` | General CI/CD pipeline patterns that integrate with Vercel Git-based deployments |
| `web-interface-guidelines` | Web design best practices for the frontend applications being deployed |

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Vercel Deployments Overview](https://vercel.com/docs/deployments)
- [Vercel Git Integration](https://vercel.com/docs/deployments/git)
- [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables)
- [Vercel Custom Domains](https://vercel.com/docs/projects/domains)
- [Vercel Project Configuration (vercel.json)](https://vercel.com/docs/projects/project-configuration)
- [Vercel Deployment Protection](https://vercel.com/docs/deployments/deployment-protection)
- [Vercel Analytics](https://vercel.com/docs/analytics)
- [Vercel Caching Headers](https://vercel.com/docs/edge-network/caching)
