---
name: javascript-package-workflows
description: Automates JavaScript/TypeScript package publishing with semantic-release,
  conventional commits, CI/CD workflows, and private registry configuration for npm.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: semantic-release, conventional commits, npm publish workflow, how do i
    publish a npm package, changelog automation, private npm registry, .npmrc setup,
    changesets, monorepo publishing, release automation
  archetypes:
  - tactical
  - generation
  anti_triggers:
  - brainstorming
  - vague ideation
  - code golf
  - over-engineering
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  role: implementation
  scope: implementation
  output-format: code
  content-types:
  - code
  - guidance
  - config
  - examples
  - do-dont
  related-skills: coding-javascript-frontend-ecosystem, coding-semver-automation,
    coding-software-delivery-pipelines
------
# JavaScript Package Publishing Workflows

Automates version bumps, changelog generation, and package publishing for npm packages using semantic-release, conventional commits, and CI/CD pipelines. When loaded, this skill makes the model act as a senior JavaScript infrastructure engineer — writing complete `package.json` exports configurations, configuring semantic-release with GitHub Actions, setting up private registries, and designing publish workflows for single-package and monorepo projects.

## TL;DR Checklist

- [ ] Define `"exports"` field in `package.json` with explicit ESM and CJS entry points — never rely on `"main"` alone
- [ ] Configure semantic-release at the repository root (single package) or workspace level (monorepo) before any commit
- [ ] Use conventional commits (`feat:`, `fix:`, `chore:`) to drive changelog entries and semver bumping
- [ ] Store `NPM_TOKEN` in CI secrets — never hardcode tokens in `.npmrc` files committed to version control
- [ ] Add `"prepublishOnly"` script that runs the full test/typecheck/build pipeline before any publish
- [ ] For monorepos, choose changesets for independent versioning per package or semantic-release with `lerna bootstrap` for coordinated releases
- [ ] Reference `code-philosophy` (5 Laws of Elegant Defense): parse token configs at boundaries, fail fast on missing secrets, design data flow from registry config inward

---

## When to Use

Use this skill when:

- Creating or publishing a new npm/Node.js package and need a production-grade publish workflow
- Setting up automated versioning and changelog generation with semantic-release or changesets
- Configuring private npm registries (Artifactory, Verdaccio, GitHub Packages) for team or enterprise use
- Building CI/CD pipelines in GitHub Actions that run tests, build, and publish on every tag or merge
- Migrating from manual `npm publish` to an automated release pipeline
- Designing a monorepo publishing strategy with independent versioning per workspace package

---

## When NOT to Use

Avoid this skill for:

- Building frontend application bundles (use `coding-javascript-frontend-ecosystem` for Vite, Webpack, module federation)
- Setting up general CI/CD without npm/package focus (use `coding-software-delivery-pipelines`)
- Calculating semver bump rules outside of release automation context (use `coding-semver-automation` as a reference)
- Projects that publish via Git tags alone without npm publishing — skip the registry configuration entirely

---

## Core Workflow

### 1. Structure the Package — package.json Exports Field

Design the `package.json` with explicit `"exports"` field supporting both ESM and CommonJS consumers. Never rely on `"main"` and `"module"` alone for modern packages. Include `"types"` for TypeScript declaration files, `"sideEffects"` for tree-shaking optimization, and a `"prepublishOnly"` hook that runs validation before publish.

**Checkpoint:** Validate the exports map with `node --conditions production` or run `tsc --noEmit` to confirm all entry points resolve correctly. Ensure no circular imports exist between the ESM and CJS entry points.

### 2. Configure semantic-release — Single Package

Install `@semantic-release/core` packages and create `.releaserc.json` at the repository root. Define plugins for: commit analysis (`@semantic-release/commit-analyzer`), changelog generation (`@semantic-release/release-notes-generator`), GitHub releases (`@semantic-release/github`), npm publishing (`@semantic-release/npm`), and version bumping (`@semantic-release/git`). Configure branch protection to only trigger on `main` or `master`.

**Checkpoint:** Run `npx semantic-release --dry-run` to validate the configuration produces correct version bumps, changelog entries, and no publish errors. Verify that commit message conventions (Conventional Commits) are correctly recognized by parsing at least five sample commit messages against the analyzer config.

### 3. Configure Conventional Commits — Commit Message Format

Set up `commitlint` with the `@commitlint/config-conventional` preset to enforce commit message formatting in pre-commit hooks. The conventional commits spec defines these types: `feat:` (minor version bump), `fix:` (patch), `docs:`, `style:`, `refactor:`, `perf:`, `test:`, `chore:`, `build:`, `ci:`, `revert:`. Map each type to semver bumps via semantic-release's `@semantic-release/commit-analyzer`.

**Checkpoint:** Run `npx commitlint --help` and test with `echo "feat: add user auth" | npx commitlint` — it should pass green. Add the Husky pre-commit hook so malformed messages are rejected before they reach version control.

### 4. Configure .npmrc — Registry and Authentication

Create a `.npmrc` file at the repository root with registry URL, authentication token references, and package access rules for private scoped packages. Use environment variable substitution (e.g., `//registry.npmjs.org/:_authToken=${NPM_TOKEN}`) — never commit raw tokens. For private registries, add `@org:registry=https://artifactory.example.com/api/npm/` and the corresponding auth token path.

**Checkpoint:** Run `npm config list` to verify the active configuration reads from your `.npmrc`. Test a dry-run publish with `npm publish --dry-run` against both public and private registries. Confirm that scoped packages resolve to the correct registry URL.

### 5. Build GitHub Actions — CI/CD Publish Pipeline

Create `.github/workflows/release.yml` with a workflow that triggers on new tags (`v*`) or pushes to `main`. The workflow must: check out code, install dependencies with caching, run lint/typecheck/test steps, then invoke `semantic-release` which handles version bump, changelog generation, tagging, and publishing. For private registries, inject `NPM_TOKEN` from GitHub Secrets as an environment variable.

**Checkpoint:** Push a test commit to a feature branch, then manually trigger the workflow via GitHub UI (`Actions > Release > Run workflow`). Verify that semantic-release outputs the correct version bump and that no npm publish occurs on non-main branches or PRs.

### 6. Set Up Private Registry — Artifactory / Verdaccio / Enterprise

For internal package distribution, configure a private npm registry. For self-hosted: deploy Verdaccio with `docker run -p 4873:4873 verdaccio/verdaccio`. For enterprise: configure JFrog Artifactory's npm virtual repository with proper proxy and caching settings. In `.npmrc`, route scoped packages (`@company/*`) to the private registry while keeping unscoped packages on the public registry. Configure `.npmrc` authentication using `//artifactory.example.com/api/npm/:_authToken=$NPM_TOKEN`.

**Checkpoint:** Run `npm whoami --registry=https://your-private-registry.com` to verify authentication succeeds. Publish a test package with `npm publish --registry=https://your-private-registry.com/@company/test-pkg@1.0.0.tgz` and verify it appears in the registry UI.

### 7. Design Monorepo Publish Strategy — Changesets vs semantic-release + Lerna

For monorepos with multiple packages that need independent versioning, evaluate two primary approaches:

- **Changesets** (`@changesets/cli`): Best for teams that want per-package changelogs, independent version bumps, and a manual "version & publish" PR workflow. Each developer creates a changeset describing their changes; the team merges a `Version Packages` PR that automates all bumps and publishes.
- **semantic-release + Lerna/Nx**: Best for fully automated CI-driven releases with conventional commits driving versioning across workspace packages. Configure `lerna.json` or Nx project graph with `packages/*/package.json` glob patterns so semantic-release discovers all publishable packages.

**Checkpoint:** Run the changeset CLI command `npx changeset add` in a test branch and verify that it generates a `.changeset/` file describing the change type. For semantic-release, run `npx lerna changed --all` to confirm it correctly identifies which packages have new commits since the last release tag.

---

## Implementation Patterns

### Pattern 1: Production-Grade package.json with Exports Field

A complete `package.json` for a modern JavaScript/TypeScript library that supports ESM, CommonJS, and TypeScript consumers simultaneously. This pattern follows Node.js module resolution rules via the `"exports"` field introduced in Node.js 12.7.

```jsonc
// packages/my-lib/package.json — Complete exports configuration
{
  "name": "@company/my-lib",
  "version": "0.1.0",
  "description": "Production-grade library with full module system support",
  "license": "MIT",
  
  // Entry points for legacy tooling and bundlers that don't support exports field
  "main": "./dist/cjs/index.js",
  "module": "./dist/esm/index.js",
  "types": "./dist/types/index.d.ts",
  "exports": {
    // Explicit export map — Node.js respects this in order: import > require > default
    ".": {
      "import": {
        "types": "./dist/types/index.d.ts",
        "default": "./dist/esm/index.js"
      },
      "require": {
        "types": "./dist/types/index.d.ts",
        "default": "./dist/cjs/index.js"
      }
    },
    
    // Sub-path exports for internal modules (not re-exported from the main entry)
    "./utils": {
      "import": {
        "types": "./dist/types/utils.d.ts",
        "default": "./dist/esm/utils.js"
      },
      "require": {
        "types": "./dist/types/utils.d.ts",
        "default": "./dist/cjs/utils.js"
      }
    },
    
    // Conditional exports for package.json self-references (Node.js 13.9+)
    "./package.json": "./package.json"
  },
  
  // Mark files that produce side effects so bundlers can tree-shake safely
  "sideEffects": [
    "./dist/esm/polyfills.js",
    "./dist/cjs/polyfills.js"
  ],
  
  // File types the package contains — helps tooling and IDEs
  "files": [
    "dist/",
    "README.md",
    "LICENSE"
  ],
  
  // Prepublish hook: never allow a publish without full validation
  "scripts": {
    "build": "run-p build:esm build:cjs build:types",
    "build:esm": "tsc --project tsconfig.esm.json && esbuild src/index.ts --bundle --platform=node --format=esm --outfile=dist/esm/index.js",
    "build:cjs": "tsc --project tsconfig.cjs.json && esbuild src/index.ts --bundle --platform=node --format=cjs --outfile=dist/cjs/index.js",
    "build:types": "tsc --project tsconfig.types.json --declaration --emitDeclarationOnly --outDir dist/types",
    
    // Critical: run the full pipeline before any publish to npm
    "prepublishOnly": "npm run test && npm run build",
    
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  
  // Only production dependencies — devDependencies are stripped by npm during install
  "dependencies": {
    "tslib": "^2.8.0"
  },
  
  "devDependencies": {
    "@types/node": "^22.10.0",
    "esbuild": "^0.24.0",
    "npm-run-all2": "^7.0.0",
    "typescript": "^5.7.0",
    "vitest": "^3.0.0"
  },
  
  // Engine requirements for runtime compatibility
  "engines": {
    "node": ">=18.0.0"
  }
}
```

**❌ BAD — Relying only on `main` and `module` (broken ESM resolution in Node.js):**
```jsonc
// packages/old-lib/package.json — Legacy exports without explicit field
{
  "name": "@company/old-lib",
  "main": "./dist/index.js",
  "module": "./dist/esm/index.js",
  "types": "./dist/types/index.d.ts"
}

// Problem: Node.js ignores "module" field. Bundlers may resolve "main" for ESM imports,
// causing "ERR_REQUIRE_ESM" errors when consumers try to import your package with
// dynamic import() in a native ESM context. The exports field provides explicit
// resolution rules that both bundlers and Node.js respect.
```

**✅ GOOD — Explicit exports map with type-safe sub-path resolution:**
See the full example above. Every export entry includes both `"types"` and conditional `"import"` / `"require"` paths so consumers get correct behavior regardless of their module system or build tool.

---

### Pattern 2: semantic-release Configuration (.releaserc.json)

A production-grade `.releaserc.json` that handles version bumping, changelog generation, GitHub releases, and npm publishing. This configuration uses the standard plugins ecosystem and customizes release notes with Jira ticket references and PR link formatting.

```jsonc
// .releaserc.json — semantic-release configuration at repository root
{
  // Branches that trigger releases — only publish from main/master
  "branches": ["main", { "name": "master" }],
  
  // Repository metadata for GitHub release creation and PR linking
  "repositoryUrl": "https://github.com/company/my-lib",
  
  // Plugins run in order: analyze commits → bump version → generate changelog → publish to npm → create GitHub release → push version commit back
  
  // 1. Analyze conventional commit messages to determine semver bump type
  "@semantic-release/commit-analyzer": {
    "preset": "conventionalcommits",
    "releaseRules": [
      // Breaking changes always bump major
      { "breaking": true, "release": "major" },
      // Reverts are always patch fixes
      { "type": "revert", "release": "patch" },
      // docs and chore are ignored (no version bump)
      { "type": "docs", "release": 0 },
      { "type": "chore", "release": 0 }
    ],
    "parserOpts": {
      "noteKeywords": ["BREAKING CHANGE", "BREAKING CHANGES", "BREAKING"]
    }
  },
  
  // 2. Bump package.json versions and create version commit + tag
  "@semantic-release/release-notes-generator": {
    "preset": "conventionalcommits",
    "parserOpts": {
      "noteKeywords": ["BREAKING CHANGE", "BREAKING CHANGES", "BREAKING"]
    },
    "writerOpts": {
      // Sort commits by type: feat, fix, chore, etc.
      "groupBy": "type",
      "commitGroupsSort": "title",
      "types": [
        { "type": "feat", "section": "✨ Features" },
        { "type": "fix", "section": "🐛 Bug Fixes" },
        { "type": "perf", "section": "⚡ Performance Improvements" },
        { "type": "refactor", "section": "♻️ Code Refactoring" },
        { "type": "chore", "section": "🧹 Chores" },
        { "type": "docs", "section": "📝 Documentation" },
        { "type": "style", "section": "💄 Styles" },
        { "type": "test", "section": "✅ Tests" },
        { "type": "build", "section": "🔧 Build System" },
        { "type": "ci", "section": "🤖 CI/CD" }
      ]
    },
    // Link PR numbers in changelog for traceability
    "linkCompare": true,
    "linkReferences": true
  },
  
  // 3. Bump version in package.json and commit + tag changes
  "@semantic-release/git": {
    "assets": [
      "package.json",
      "CHANGELOG.md"
    ],
    "message": "chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}"
  },
  
  // 4. Publish to npm — reads auth from environment NPM_TOKEN
  "@semantic-release/npm": {
    "pkgRoot": ".",
    "tarballDir": ".npm-tarballs"
  },
  
  // 5. Create GitHub release with changelog as release notes
  "@semantic-release/github": {
    "successComment": "This ${issue.pull_request ? 'PR' : 'issue'} has been resolved in v${nextRelease.version}. 🎉",
    "labels": ["release"],
    "addedLabels": ["released"],
    // Exclude certain types from release notes
    "excludedLabels": ["internal"]
  },
  
  // 6. Notify Slack/Email on successful release
  "@semantic-release/chat": {
    "successMessage": "🚀 Released v${nextRelease.version} — see changelog: ${nextRelease.githubHtmlUrl}"
  }
}
```

**❌ BAD — Using a minimal config with no commit analysis rules (wrong version bumps):**
```jsonc
// .releaserc.json — BAD: default analyzer accepts any commit as minor bump
{
  "branches": ["main"],
  "plugins": [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    "@semantic-release/npm",
    "@semantic-release/github"
  ]
}

// Problem: Without explicit releaseRules, the default analyzer treats all commits
// as minor version bumps. A simple typo fix in docs (chore(docs): fix typo) will
// bump the version from 1.0.0 to 1.1.0 — polluting the changelog and breaking
// consumers who expect semver-compliant versioning. Always define explicit
// releaseRules that filter out non-functional commits.
```

**✅ GOOD — Explicit release rules that filter noise (docs, chore, style):**
See the full example above. The `releaseRules` array explicitly maps commit types to version bump behavior and filters out non-functional commits (docs, chore, style, test) so they do not trigger unnecessary version bumps.

---

### Pattern 3: GitHub Actions Release Workflow

A complete GitHub Actions workflow that triggers semantic-release on every push to `main`. It handles dependency caching, multi-step validation (lint → typecheck → test → build), and secret management for npm authentication.

```yaml
# .github/workflows/release.yml — Automated release pipeline
name: Release

on:
  # Trigger automatically when a commit is pushed to main
  push:
    branches: [main]
    
  # Also allow manual triggering from GitHub UI for ad-hoc releases
  workflow_dispatch:

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true  # Prevent multiple release runs on same branch

jobs:
  release:
    name: Release
    runs-on: ubuntu-latest
    
    # Only run on main or via manual dispatch
    if: github.event_name == 'push' && github.ref == 'refs/heads/main' || github.event_name == 'workflow_dispatch'
    
    steps:
      # Step 1: Check out the repository code
      - name: Checkout
        uses: actions/checkout@v4
        with:
          # Required by semantic-release for proper commit analysis
          fetch-depth: 0
          # Preserve git history so semantic-release can analyze all past commits
          token: ${{ secrets.GITHUB_TOKEN_WITH_PERMISSIONS }}
      
      # Step 2: Set up Node.js environment
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          # Use npm registry — will be overridden by .npmrc for scoped packages
          registry-url: 'https://registry.npmjs.org'
      
      # Step 3: Cache node_modules for faster builds
      - name: Cache dependencies
        uses: actions/cache@v4
        with:
          path: |
            ~/.npm
            node_modules
          key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
          restore-keys: |
            ${{ runner.os }}-node-
      
      # Step 4: Install all dependencies
      - name: Install
        run: npm ci
      
      # Step 5: Run lint check (must pass before release)
      - name: Lint
        run: npm run lint
      
      # Step 6: Run typecheck (catch type errors before publish)
      - name: TypeCheck
        run: npm run typecheck
      
      # Step 7: Run the full test suite
      - name: Test
        run: npm test
      
      # Step 8: Build distribution files
      - name: Build
        run: npm run build
      
      # Step 9: Run semantic-release
      # This step: analyzes commits, bumps version, generates changelog, publishes to npm, creates GitHub release
      - name: Release
        env:
          # Required by @semantic-release/npm for authentication
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
          # Required by @semantic-release/github for creating releases and tags
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: npx semantic-release
```

**❌ BAD — Missing `fetch-depth: 0` in checkout step (semantic-release cannot analyze history):**
```yaml
# .github/workflows/release.yml — BAD: shallow clone breaks commit analysis
- name: Checkout
  uses: actions/checkout@v4
  # fetch-depth defaults to 1 — only the latest commit is fetched
  
# Problem: semantic-release's @semantic-release/commit-analyzer needs access to
# the full git history to analyze all commits since the last release tag. With
# fetch-depth: 1, it only sees one commit and will either skip the release or
# generate an incorrect changelog missing all changes between tags.
```

**✅ GOOD — Full checkout with `fetch-depth: 0` and proper secret injection:**
See the full example above. The workflow checks out the complete git history (required for commit analysis), runs a full validation pipeline (lint → typecheck → test → build), and injects secrets via environment variables rather than hardcoding them in `.npmrc`.

---

### Pattern 4: .npmrc for Private Registry Configuration

Complete `.npmrc` configuration that routes scoped packages to a private registry while keeping unscoped packages on the public npm registry. Uses environment variable substitution for authentication tokens.

```ini
# .npmrc — Registry routing and authentication for mixed public/private package access
; Public registry default
registry=https://registry.npmjs.org/

; Auth token for public registry (injected from CI secrets, never committed raw)
//registry.npmjs.org/:_authToken=${NPM_TOKEN}

; Private registry for @company scoped packages
; Route ALL @company/* packages to Artifactory virtual npm repository
@company:registry=https://artifactory.example.com/api/npm/company-npm/

; Authentication for private registry
//artifactory.example.com/api/npm/company-npm/:_authToken=${ARTIFACTORY_TOKEN}
//artifactory.example.com/api/npm/company-npm/:always-auth=true

; Always authenticate even for non-registry requests (needed for some CI setups)
always-auth=true

; Strict SSL verification for production registries
strict-ssl=true

; Network timeout in milliseconds (increase for slow networks or large packages)
fetch-timeout=60000

; Enable registry audit reporting (security scanning built into npm install)
audit=true
```

For Verdaccio self-hosted development:
```ini
# .npmrc — Verdaccio development registry configuration
; Point all scoped packages to local Verdaccio instance
@company:registry=http://localhost:4873/

; Bypass SSL verification for local development (not recommended for production)
strict-ssl=false

; Development auth token (obtained after `npm login --registry=http://localhost:4873`)
//localhost:4873/:_authToken=${VERDACCIO_TOKEN}
//localhost:4873/:always-auth=true
```

**❌ BAD — Hardcoding tokens directly in .npmrc (security violation):**
```ini
# .npmrc — BAD: raw token committed to version control
registry=https://registry.npmjs.org/
//registry.npmjs.org/:_authToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.secret.token.here

; Problem: Anyone with repository access can extract this token and publish packages
; as you. It cannot be rotated without touching every clone of the repository.
; Always use environment variable substitution (${NPM_TOKEN}) and store the actual
; token value in CI secrets or a credential manager.
```

**✅ GOOD — Environment variable substitution with explicit registry routing:**
See the full example above. Tokens are injected via `${ENV_VAR}` syntax, scoped packages are explicitly routed to their target registry, and `always-auth=true` ensures authenticated requests even when npm's internal cache resolution doesn't trigger auth automatically.

---

### Pattern 5: Changesets for Monorepo Publishing

A complete changesets setup for a monorepo with independent versioning per workspace package. This pattern generates individual changelogs and handles cross-package dependency updates correctly.

```jsonc
// packages/monorepo/.changeset/config.json — Changesets configuration
{
  // Default release type when no specific changeset is provided
  "internalPackages": [],
  
  // Which packages get versioned (auto-detect from workspaces)
  "___experimentalUnsafeOptions_WILL_CHANGE_IN_PATCH": {
    // Required: update dependent package.json versions automatically
    "onlyUpdatePeerDependentsWhenOutOfRange": true,
    // Update internal dependency versions to match new semver ranges
    "updateInternalDependents": "always"
  },
  
  // List of packages managed by changesets
  "packages": [
    "packages/ui-components",
    "packages/data-fetcher",
    "packages/auth-utils",
    "apps/web-app"
  ],
  
  // Change types that trigger version bumps
  "changelog": ["@changesets/cli/changelog"]
}
```

```jsonc
// packages/monorepo/package.json — Root package with changeset scripts
{
  "name": "js-monorepo-root",
  "private": true,
  "scripts": {
    // Generate a changeset file describing the changes in this branch
    "version": "changeset version",
    
    // Create version packages PR — bumps all versions and generates changelogs
    "release": "changeset version && changeset tag",
    
    // Publish all changed packages to npm
    "publish-packages": "changeset publish"
  },
  "devDependencies": {
    "@changesets/cli": "^2.27.0"
  }
}
```

```yaml
# .github/workflows/version-packages.yml — Version Packages PR automation
name: Version Packages

on:
  push:
    branches: [main]

concurrency: ${{ github.workflow }}-${{ github.ref }}

jobs:
  version-packages:
    name: Version Packages
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          registry-url: 'https://registry.npmjs.org'
      
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      
      - name: Create Version Packages PR
        uses: changesets/action@v1
        with:
          title: "Version Packages"
          commit: "chore(version-packages): version packages"
          # Use npm for publishing (configured in each package's .npmrc)
          publish: pnpm run publish-packages
          # Create a changeset if there are uncommitted changesets
          version: pnpm run version
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

**❌ BAD — Using a single monolithic `package.json` for all workspace packages:**
```jsonc
// packages/monorepo/package.json — BAD: single package with all dependencies
{
  "name": "monorepo-root",
  "version": "1.0.0",
  
  // This approach treats the monorepo as one npm package
  // All workspace packages become internal modules, not independently publishable
  
  // Problem: Each workspace package needs its own package.json with independent
  // versioning. Changesets (or semantic-release + Lerna) manage these per-package.
  // A single root package.json cannot express independent semver versions for
  // ui-components@2.1.0 and data-fetcher@1.3.2 simultaneously.
}
```

**✅ GOOD — Each workspace package has its own `package.json` with `"publishConfig"`:**
```jsonc
// packages/monorepo/packages/ui-components/package.json — Independent publishable package
{
  "name": "@company/ui-components",
  "version": "2.1.0",
  
  // Ensure published package routes to the correct registry (overrides .npmrc default)
  "publishConfig": {
    "registry": "https://registry.npmjs.org/"
  },
  
  "exports": {
    ".": {
      "import": { "types": "./dist/index.d.ts", "default": "./dist/index.js" },
      "require": { "types": "./dist/index.d.ts", "default": "./dist/index.cjs" }
    }
  }
}

// Each workspace package follows this pattern with its own version, exports field,
// and publishConfig. Changesets tracks changes across all of them independently
// and generates a single Version Packages PR that updates every affected package.json.
```

---

## Constraints

### MUST DO

- Always define the `"exports"` field in `package.json` for modern packages — never rely solely on `"main"` and `"module"`. The exports map provides explicit resolution rules for ESM, CJS, and TypeScript consumers
- Use conventional commits (`feat:`, `fix:`, `docs:`, `chore:`) for all commit messages. This is the input format that semantic-release parses to determine semver bumps
- Store `NPM_TOKEN` in CI secrets (GitHub Secrets, GitLab Variables, etc.) — never commit raw authentication tokens in `.npmrc` files committed to version control
- Include a `"prepublishOnly"` script that runs `test`, `typecheck`, and `build` before any npm publish. This prevents publishing broken packages
- Configure `"sideEffects": false` or explicitly list side-effect files for tree-shaking optimization. Bundlers use this to eliminate unused code during production builds
- For monorepos, ensure each workspace package has its own `package.json` with `"publishConfig"` pointing to the correct registry. A single root `package.json` cannot manage independent versions
- Set `fetch-depth: 0` in GitHub Actions checkout steps for semantic-release — shallow clones break commit history analysis and produce incorrect version bumps
- Reference `code-philosophy` (5 Laws of Elegant Defense): parse token configurations at boundaries, fail fast with descriptive errors when secrets are missing, design data flow from registry configuration inward through the publish pipeline

### MUST NOT DO

- Never commit raw npm tokens or `.npmrc` files containing `_authToken=` with actual values — this is equivalent to committing database passwords. Use environment variable substitution only
- Do not use `"main": "./dist/index.js"` as the sole entry point for ESM packages. Node.js ignores the `module` field and will try to load CJS files as ESM, causing `ERR_REQUIRE_ESM` errors
- Never skip the `"prepublishOnly"` hook. Publishing untested code is the single largest source of broken npm releases
- Do not set `fetch-depth: 1` (or omit it) in GitHub Actions when using semantic-release. This is the #1 cause of "release failed" workflows that produce no changelog entries
- Never publish to both public and private registries from the same CI run without explicitly scoping each publish. A misconfigured `.npmrc` can publish internal packages to npmjs.org unintentionally
- Do not use changesets for projects with only one package. semantic-release is simpler and fully automated for single-package repositories. Changesets add workflow overhead (PR-based versioning) that provides no benefit for a single package
- Never hardcode version numbers in changelog generation — let semantic-release or changesets compute semver bumps from commit history. Manual version editing creates drift between the git tag, `package.json`, and changelog

---

## Output Template

When applying this skill, produce:

1. **Package Structure** — Complete `package.json` with `"exports"` field, TypeScript configuration paths, entry points for ESM/CJS, `"sideEffects"`, `"prepublishOnly"` hook, and dependency declarations
2. **semantic-release Configuration** — Full `.releaserc.json` with commit analyzer rules, changelog formatting, release note generation, GitHub release creation, and npm publish settings
3. **CI/CD Pipeline** — Complete `.github/workflows/release.yml` with checkout (fetch-depth: 0), dependency caching, validation steps (lint → typecheck → test → build), semantic-release invocation, and secret injection via environment variables
4. **.npmrc Configuration** — Registry routing rules for public and private registries, environment variable-based authentication, scoped package routing, and SSL/audit settings
5. **Monorepo Strategy Document** — Comparison of changesets vs semantic-release + Lerna, recommended approach based on team size and release frequency, with `.changeset/config.json` or `lerna.json` configuration files
6. **Validation Checklist** — Step-by-step verification: `npm run build` succeeds, `npm publish --dry-run` passes, semantic-release dry-run produces correct version bump, private registry login works

---

## Related Skills

| Skill | Purpose |
|---|---|
| `coding-javascript-frontend-ecosystem` | Monorepo architecture, pnpm workspaces, and build toolchain selection — complements publish workflows with project setup guidance |
| `coding-semver-automation` | Semver bump rules, version parsing, and release date management — provides the versioning logic that semantic-release consumes |
| `coding-software-delivery-pipelines` | General CI/CD pipeline design, artifact management, and deployment strategies — extends publish workflows into end-to-end delivery |

---

## Live References

> Authoritative documentation links for npm publishing, semantic-release, conventional commits, and monorepo tooling. The model follows these markdown links at load time to resolve external references and inline content.

- [npm package.json reference](https://docs.npmjs.com/cli/v10/configuring-npm/package-json) — Complete specification of all fields in `package.json` including `exports`, `files`, `prepublishOnly`, and `publishConfig`
- [semantic-release documentation](https://semantic-release.gitbook.io/semantic-release) — Full plugin configuration guide, environment variables, branching strategy, and troubleshooting
- [Conventional Commits specification](https://www.conventionalcommits.org/en/v1.0.0/) — Official spec for commit message formatting that drives changelog generation and semver bumping
- [Node.js module resolution](https://nodejs.org/api/packages.html#package-entry-points) — Official documentation on how Node.js resolves the `"exports"` field for ESM and CJS consumers
- [Changesets documentation](https://github.com/changesets/changesets/blob/main/docs/versioning-packages.md) — Complete guide to changeset creation, versioning workflow, and monorepo publishing
- [GitHub Actions workflows reference](https://docs.github.com/en/actions/writing-workflows/workflow-syntax-for-github-actions) — Workflow syntax for scheduling, secrets management, caching, and conditional job execution
- [Verdaccio documentation](https://verdaccio.org/docs/en/configuration/) — Self-hosted private npm registry configuration including authentication, storage, and uplink proxy setup
