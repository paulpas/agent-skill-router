---
name: monorepo-workspace-patterns
description: Implements monorepo workspace management patterns across npm, pnpm, yarn, Cargo, and uv including dependency deduplication, build orchestration, shared configuration, and cross-package references for multi-package repository architectures.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: monorepo, workspace patterns, pnpm workspaces, yarn workspaces, cargo workspace, Turborepo, Nx, how do i structure a monorepo
  archetypes:
    - tactical
    - strategic
  anti_triggers:
    - brainstorming
    - vague ideation
    - long-form architecture
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, config, do-dont, examples]
  related-skills: coding-package-ecosystem-navigator, coding-modern-python-packaging, coding-ci-cd-pipeline-design, coding-framework-lifecycle
---

# Monorepo Workspace Patterns

Implements workspace-based monorepo architecture across multiple package ecosystems — npm, pnpm, yarn, Cargo, and uv — including dependency deduplication, cross-package references, build orchestration, and shared configuration management.

## TL;DR Checklist

- [ ] Choose the right workspace tool for your language and build needs
- [ ] Configure root-level workspace declarations (pnpm-workspace.yaml, package.json workspaces, Cargo.toml [workspace], pyproject.toml workspace mode)
- [ ] Create packages with proper inter-package references (workspace:true, path:, file:)
- [ ] Set up dependency hoisting/deduplication to eliminate duplication
- [ ] Configure build orchestration (Turborepo or Nx) for caching and parallel execution
- [ ] Pin inter-package dependencies to workspace paths, not version ranges
- [ ] Document package boundaries and public APIs in each package's README
- [ ] Run type checking and linting from the root across all packages
- [ ] Never nest workspaces within workspaces
- [ ] Never manually symlink workspace packages — let the workspace tool manage it

---

## When to Use

Use this skill when:

- Managing 3+ related packages that share code, dependencies, or configuration (e.g., a frontend app, shared UI library, and API client)
- Multiple teams work on tightly coupled services where atomic commits across packages are required
- Shared internal libraries need consistent versioning and instant cross-package reference without publishing
- You want build caching, parallel execution, and task orchestration across all packages
- You need dependency deduplication to reduce disk usage and install times across many packages

## When NOT to Use

Avoid this skill for:

- **Single package projects** — A single `package.json` or `Cargo.toml` is simpler and faster
- **Loosely coupled independent services** — If teams deploy independently with no shared code, use separate repositories
- **Very large repos (1000+ packages)** — Consider a polyrepo strategy or splitting into focused monorepos
- **Quick prototypes** — The configuration overhead of a monorepo outweighs benefits for throwaway code

---

## Core Workflow

### Step 1: Select Workspace Tool

Choose the workspace tool based on your language, build speed requirements, and developer count. Each ecosystem has native workspace support plus third-party orchestration tools.

**Decision Matrix:**

| Requirement | pnpm Workspaces | yarn Workspaces | npm Workspaces | Cargo Workspaces | uv Workspace | Turborepo/Nx |
|---|---|---|---|---|---|---|
| **Primary language** | TypeScript/JS | TypeScript/JS | TypeScript/JS | Rust | Python | Polyglot (any) |
| **Install speed** | Fastest (symlinked + content-addressable) | Fast | Slowest (copies all deps) | Native, very fast | Fast (cached) | N/A (depends on underlying package manager) |
| **Strict peer deps** | ✅ Enforced by default | ⚠️ Optional | ❌ Not enforced | ❌ N/A (Cargo features system) | ❌ N/A | ❌ Delegates to PM |
| **Dependency hoisting** | ✅ Full control via `hoist-pattern` | ✅ Auto-hoisting | ✅ Basic | ✅ Via Cargo.lock | ✅ Automatic in workspace mode | ❌ Delegates to PM |
| **Build caching** | ❌ Requires Turborepo/Nx | ❌ Requires Turborepo/Nx | ❌ Requires Turborepo/Nx | ❌ Requires just/cargo-xtask | ❌ Requires uv task runner | ✅ Built-in |
| **Parallel execution** | ❌ Requires Turborepo/Nx | ❌ Requires Turborepo/Nx | ❌ Requires Turborepo/Nx | ✅ Via `cargo test --all` / `--all-features` | ✅ Via `uv run -p` | ✅ Built-in |
| **Best for teams > 10** | ✅ Excellent | ✅ Good | ⚠️ Manageable | ✅ Excellent (Rust ecosystem) | ✅ Good (growing) | ✅ Best-in-class |

**Decision rules:**
- Python projects → `uv workspace mode` (native, fast, single lockfile)
- TypeScript/JS with 3+ packages → `pnpm workspaces + Turborepo` (best performance and strictness)
- Rust projects → `Cargo workspaces` (native, battle-tested)
- Polyglot repo (Python + TS + Rust) → `Turborepo` as the orchestration layer with language-native workspace tools underneath

### Step 2: Configure Workspace Root

Set up the root-level configuration. Each ecosystem uses a different declaration file.

**pnpm workspaces** — Create `pnpm-workspace.yaml` at repository root:

```yaml
# pnpm-workspace.yaml
# Packages that are members of this workspace
packages:
  - 'apps/*'          # All apps under apps/ directory
  - 'packages/*'      # All shared packages under packages/
  - 'libs/**'         # Nested libraries (use ** for deeper nesting)
  # Explicitly exclude directories that should never be workspace members
  '!apps/e2e-tests'   # Exclude end-to-end test apps from workspace resolution

# Strict mode: pnpm will fail if a peer dependency is not satisfied
strictPeerDependencies: true

# Hoist all common dependencies to root node_modules
hoist-pattern:
  - '*react*'
  - '*typescript*'
  - '@types/*'

# Packages that must NEVER be hoisted (usually because they have native bindings)
nohoist:
  - '**/tsup'
  - '**/esbuild'
  - '**/@swc/**'

# Lockfile settings
lockfileFlags:
  auto-install-peers: true
```

**npm workspaces** — Configure in root `package.json`:

```json
{
  "name": "my-monorepo",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*",
    "!apps/e2e-tests"
  ],
  "scripts": {
    "build": "turbo run build",
    "test": "turbo run test --parallel",
    "lint": "turbo run lint",
    "type-check": "turbo run type-check"
  },
  "devDependencies": {
    "turbo": "^2.4.0"
  }
}
```

**Cargo workspaces** — Configure in root `Cargo.toml`:

```toml
# Root Cargo.toml — the workspace manifest
[workspace]
members = [
    "crates/*",
    "bin/*",
]
# Exclude packages that are standalone binaries not part of the library hierarchy
exclude = ["crates/integration-tests"]

# Resolver: use edition 2021 (required for Rust 2021+ features)
resolver = "2"

# Define default-package members activated by default when running cargo commands
default-members = [
    "crates/core",
    "crates/api",
]

# Shared dependency versions in one place — all crates use ^1.2 from here
[workspace.dependencies]
serde = { version = "1.0", features = ["derive"] }
tokio = { version = "1", features = ["full"] }
tracing = "0.1"
anyhow = "1.0"
tonic = "0.12"

# Override a single crate's version for testing or emergency patches
[workspace.dependencies.overrides]
tokio = "=1.42.0"  # Pin exact version for debugging

# Configure build optimization profiles shared across all workspace members
[profile.release]
lto = "fat"
codegen-units = 1
strip = true

[profile.dev]
split-debuginfo = "unpacked"
```

**uv workspace mode (Python)** — Configure in root `pyproject.toml`:

```toml
# Root pyproject.toml — uv workspace mode requires [tool.uv.workspace]
[project]
name = "my-python-monorepo"
version = "0.1.0"
description = "Monorepo for Python packages using uv workspace mode"
requires-python = ">=3.12"
readme = "README.md"
license = { text = "MIT" }

[tool.uv.workspace]
members = [
    "packages/core",
    "packages/sdk",
    "packages/cli",
    "apps/*",
]
exclude = [
    "tests/integration",
]

# Shared dev dependencies for all workspace members
[tool.uv]
dev-dependencies = [
    "pytest>=8.3",
    "pytest-asyncio>=0.24",
    "ruff>=0.8",
    "mypy>=1.14",
    "hypothesis>=6.122",
]

# Global overrides — useful when a dependency has issues across the workspace
[tool.uv.sources]
core = { workspace = true }
sdk = { workspace = true }
cli = { workspace = true }

# uv task runner configuration — replaces makefiles and scripts for build orchestration
[tool.uv.tasks]
test = "pytest"
lint = "ruff check packages/ apps/"
format = "ruff format packages/ apps/"
type-check = "mypy packages/ --strict"
build-docs = { cmd = "mkdocs build", cwd = "packages/docs" }
```

### Step 3: Create Package Members

Scaffold each package with proper inter-package dependency references. Each workspace member must declare itself as a workspace dependency when referencing sibling packages.

**pnpm workspace reference using `workspace:` protocol:**

```jsonc
// packages/shared-types/package.json — A shared TypeScript types package
{
  "name": "@myorg/shared-types",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "scripts": {
    "build": "tsc --project tsconfig.build.json",
    "type-check": "tsc --noEmit",
    "clean": "rm -rf dist"
  },
  "devDependencies": {
    "typescript": "^5.7.0"
  }
}
```

```jsonc
// apps/web/package.json — Depends on shared-types via workspace protocol
{
  "name": "@myorg/web",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    // ✅ CORRECT: workspace protocol resolves to local package, no version needed
    "@myorg/shared-types": "workspace:*",
    // ✅ CORRECT: for specific version range within workspace
    "@myorg/api-client": "workspace:^1.2.0",
    "next": "^15.1.0",
    "react": "^19.0.0"
  },
  "devDependencies": {
    "@myorg/eslint-config": "workspace:*",
    "typescript": "^5.7.0"
  }
}
```

**Cargo workspace reference using `[workspace.dependencies]`:**

```toml
# crates/core/Cargo.toml — Core library with no internal dependencies
[package]
name = "myorg-core"
version = "0.1.0"
edition = "2021"
description = "Core domain types and shared logic"

[dependencies]
serde = { workspace = true }
tokio = { workspace = true }
tracing = { workspace = true }
anyhow = { workspace = true }
```

```toml
# crates/api/Cargo.toml — API layer depending on core via path reference
[package]
name = "myorg-api"
version = "0.1.0"
edition = "2021"

[dependencies]
myorg-core = { path = "../core" }  # Direct path to sibling crate
serde = { workspace = true }
tokio = { workspace = true }
tonic = { workspace = true }
tracing = { workspace = true }
anyhow = { workspace = true }

# Conditional compilation — only include these dependencies for certain features
[dependencies.tower-http]
optional = true
version = "0.6"
features = ["trace", "cors"]

[features]
default = []
tracing-subscriber = ["dep:tracing-subscriber"]
# Platform-specific feature flags
linux-only = []
```

**uv workspace reference using `[tool.uv.sources]`:**

```toml
# packages/sdk/pyproject.toml — SDK package depending on core
[project]
name = "myorg-sdk"
version = "0.1.0"
description = "Python SDK for interacting with the platform"
requires-python = ">=3.12"
dependencies = [
    "httpx>=0.28",
    "pydantic>=2.10",
]

[tool.uv.sources]
# ✅ CORRECT: workspace reference — resolves to packages/core in the workspace
myorg-core = { workspace = true }
```

```toml
# packages/cli/pyproject.toml — CLI app depending on both core and sdk
[project]
name = "myorg-cli"
version = "0.1.0"
description = "Command-line interface for the platform"
requires-python = ">=3.12"

dependencies = [
    "click>=8.1",
    "rich>=13.9",
    "pydantic-settings>=2.7",
]

[tool.uv.sources]
myorg-core  = { workspace = true }
myorg-sdk   = { workspace = true }

# Optional dependencies for the CLI only
[project.optional-dependencies]
dev = [
    "pytest>=8.3",
    "pytest-mock>=3.14",
]
```

### Step 4: Deduplicate Dependencies

Configure dependency hoisting and deduplication to share common dependencies and avoid duplication across workspace members.

**pnpm hoisting configuration:**

```yaml
# pnpm-workspace.yaml — Extended hoisting rules
packages:
  - 'apps/*'
  - 'packages/*'

hoist-pattern:
  # Hoist React ecosystem to root — shared by almost every frontend package
  - '*react*'
  - '*@types/react*'
  # Hoist TypeScript tooling
  - 'typescript'
  - '@typescript-eslint/*'
  - 'eslint*'
  # Hoist test frameworks (shared across packages)
  - 'vitest'
  - '@vitest/*'
  - 'jest'
  # Hoist common linting/formatting tools
  - 'prettier'
  - 'tsup'
  - 'esbuild'

# Never hoist packages with native binaries — they must resolve locally per-package
nohoist:
  # Rust toolchain — always resolves locally to avoid platform conflicts
  - '**/node-sass'
  - '**/canvas'
  - '**/sharp'
  # Build tools with platform-specific binaries
  - '**/@swc/**'
  - 'esbuild'
  # Vite plugins that depend on specific Vite versions
  - '**/vite-plugin-*'

# Resolve peer dependencies automatically — prevents "missing peer" errors
auto-install-peers: true
# Remove hoisted packages from package-lock after install for cleanliness
deduplicate-hoisted: true
```

**pnpm peer dependency enforcement:**

```jsonc
// packages/ui-components/package.json — Declare explicit peer deps
{
  "name": "@myorg/ui-components",
  "version": "2.0.0",
  "peerDependencies": {
    "react": "^18.0.0 || ^19.0.0",
    "react-dom": "^18.0.0 || ^19.0.0"
  },
  // ✅ Critical: pnpm will enforce these are satisfied by the consuming package
  // Without this, pnpm will fail installation if react is not a direct dep of apps/web
  "peerDependenciesMeta": {
    "react-dom": { "optional": true }
  }
}
```

**Cargo workspace dependency sharing:**

```toml
# Root Cargo.toml — Shared dependencies defined once, used by all crates
[workspace]
members = ["crates/*"]
resolver = "2"

[workspace.dependencies]
# Define versions in one place — prevents version drift between crates
serde = { version = "1.0", features = ["derive", "rc"] }
tokio = { version = "1", features = ["full", "tracing"] }
anyhow = "1.0"
thiserror = "2.0"
async-trait = "0.1"

# Use workspace = true in each crate to reference shared deps
# Example from crates/api/Cargo.toml:
# [dependencies]
# tokio = { workspace = true }       # Gets version 1.x with features: full, tracing
# serde = { workspace = true }       # Gets version 1.0 with features: derive, rc
# myorg-core = { path = "../core" } # Direct path to sibling crate
```

### Step 5: Configure Build Orchestration

Set up Turborepo or Nx for task caching, parallel execution, and cross-package dependency management.

**Turborepo pipeline configuration:**

```jsonc
// turbo.json — Task pipeline definitions with dependency graph and caching
{
  "$schema": "https://turbo.build/schema.json",
  // Global environment variables that all tasks inherit
  "globalEnv": ["NODE_ENV", "CI", "DATABASE_URL"],
  // Tasks that must run from the workspace root (not per-package)
  "globalDependencies": [
    "**/.env.*local",
    "**/tsconfig*.json",
    "pnpm-lock.yaml",
    ".nvmrc"
  ],
  // Tasks that are outputs and should be excluded from caching if changed
  "globalPassThroughEnv": ["AWS_ACCESS_KEY_ID", "GITHUB_TOKEN"],
  // Task definitions — the core of Turborepo configuration
  "tasks": {
    // Build task: runs tsc, no upstream dependencies, output is dist/
    "build": {
      "dependsOn": ["^build"],         // Run each package's build before this one
      "inputs": ["src/**", "*.tsconfig*json"], // Files that affect the build
      "outputs": ["dist/**"],           // Cache if these files exist and haven't changed
      "outputLogs": "new-only"          // Only show new output, not cached builds
    },

    // Dev task: hot-reload mode, no caching (always run fresh)
    "dev": {
      "dependsOn": ["^build"],         // Depends on sibling packages being built
      "cache": false,                   // Never cache dev mode — always run
      "persistent": true               // Keep running (long-lived process)
    },

    // Test task: runs tests for a package, depends on its build
    "test": {
      "dependsOn": ["build"],          // Must build before testing
      "inputs": ["src/**", "tests/**"],
      "outputs": [],                    // No outputs — always re-run if source changes
      "env": ["CI"],                   // Pass CI env var for headless mode
      "outputLogs": "new-only"
    },

    // Type-check: run type checking without emitting, depends on build
    "type-check": {
      "dependsOn": [],                 // No upstream deps — can start immediately
      "inputs": ["src/**", "*.tsconfig*json"],
      "outputs": []
    },

    // Lint: fast task, cache the result, no upstream deps
    "lint": {
      "cache": true,
      "inputs": ["src/**", ".eslintrc*", "eslint.config.*"]
    },

    // Format: same as lint but runs prettier/ruff
    "format": {
      "cache": false,                 // Formatting is not cacheable by nature
      "persistent": true
    },

    // Clean: must run before rebuild, removes all dist folders
    "clean": {
      "cache": false
    },

    // Full pipeline: clean + build + test in sequence across workspace
    "//full-ci": {
      "dependsOn": ["^build", "test"]
    }
  }
}
```

**Turborepo root package.json scripts:**

```jsonc
// packages/web/package.json — Application-level turbo script
{
  "scripts": {
    // Turbo will run build across all packages that declare a build task
    "build:all": "turbo run build",
    // Run dev with hot reload, rebuilding dependent packages automatically
    "dev:all": "turbo run dev --parallel",
    // Run tests in parallel across all packages
    "test:all": "turbo run test --parallel",
    // Full CI pipeline: type-check → lint → build → test (sequential dependency chain)
    "ci": "turbo run type-check lint build test",
    // Preview a single package's build with output from dependent packages
    "preview-build": "turbo run build --filter=@myorg/web..."
  }
}
```

**Nx workspace configuration:**

```jsonc
// nx.json — Nx task orchestration (alternative to Turborepo)
{
  "$schema": "./node_modules/nx/schemas/nx-schema.json",
  "namedInputs": {
    // Reusable input sets for tasks — referenced in project.json targets
    "default": ["{projectRoot}/**/*"],
    "production": [
      "default",
      "!{projectRoot}/tests/**/*",
      "!{projectRoot}/.eslintrc.json",
      "!{projectRoot}/tsconfig.test.json"
    ],
    "sharedConfig": ["{workspaceRoot}/nx.json", "{workspaceRoot}/tsconfig.base.json"]
  },

  // Target defaults — apply these settings to matching targets across all projects
  "targetDefaults": {
    "build": {
      "dependsOn": ["^build"],        // Depends on upstream builds
      "inputs": ["production", "^production"],
      "cache": true,
      "outputs": ["{projectRoot}/dist"]
    },
    "test": {
      "dependsOn": ["build"],
      "inputs": ["default", "^production", "{workspaceRoot}/jest.preset.js"],
      "cache": true
    },
    "lint": {
      "inputs": ["default", "{workspaceRoot}/.eslintrc.json"],
      "cache": true
    }
  },

  // Parallelism settings for CI
  "parallel": 3,

  // Cache directory location
  "cacheDirectory": ".nx/cache"
}
```

**Nx project configuration (per-package):**

```jsonc
// packages/api/project.json — Individual project definition in Nx
{
  "name": "@myorg/api",
  "$schema": "../../node_modules/nx/schemas/project-schema.json",
  "sourceRoot": "packages/api/src",
  "tags": ["scope:api", "type:service"],

  "targets": {
    "build": {
      "executor": "@nx/esbuild:esbuild",
      "outputs": ["{options.outputPath}"],
      "options": {
        "outputPath": "dist/packages/api",
        "format": ["cjs"],
        "bundle": false,
        "generatePackageJson": true
      }
    },
    "test": {
      "executor": "@nx/jest:jest",
      "outputs": ["{workspaceRoot}/coverage/{projectRoot}"],
      "options": {
        "jestConfig": "packages/api/jest.config.js"
      }
    },
    "lint": {
      "executor": "@nx/eslint:lint"
    }
  }
}
```

---

## Implementation Patterns

### Pattern 1: pnpm Workspace with Strict Peer Dependency Enforcement

Use this pattern when you have shared UI or utility packages consumed by multiple apps. The `workspace:*` protocol combined with strict peer dependency enforcement ensures all apps use a single version of React and shared dependencies.

```yaml
# pnpm-workspace.yaml — Strict workspace with peer dependency management
packages:
  - 'apps/*'
  - 'packages/*'

# Enforce that peer dependencies are always satisfied — pnpm will fail if not
strictPeerDependencies: true

# Hoist React ecosystem for deduplication
hoist-pattern:
  - '*react*'
  - '@types/react*'
  - 'next'

# Never hoist packages with native bindings or platform-specific binaries
nohoist:
  - '**/@swc/**'
  - '**/esbuild**'
  - '**/node-sass**'
  - '**/sharp**'
```

```jsonc
// packages/design-system/package.json — Shared UI library with peer deps
{
  "name": "@myorg/design-system",
  "version": "3.2.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "sideEffects": false,

  // Peer dependencies: apps MUST install these themselves
  // pnpm will fail installation if an app doesn't have react as a direct dependency
  "peerDependencies": {
    "react": "^18.2.0 || ^19.0.0",
    "react-dom": "^18.2.0 || ^19.0.0"
  },

  // Internal development dependencies (not published)
  "devDependencies": {
    "@storybook/react": "^8.4.0",
    "typescript": "^5.7.0"
  },

  // Dependencies that ARE bundled into the published package
  "dependencies": {
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.6.0"
  }
}
```

```typescript
// packages/design-system/src/index.ts — Public API surface
/** @module @myorg/design-system */

export { Button, type ButtonProps } from './components/Button';
export { Input, type InputProps } from './components/Input';
export { Modal, type ModalProps } from './components/Modal';
export { ThemeProvider, useTheme, type ThemeContext } from './providers/ThemeProvider';
export { createTheme, type DesignTokens } from './theme/createTheme';

// Internal modules — NOT exported (not part of the public API)
// These are implementation details and may change without notice
```

```jsonc
// apps/web/package.json — Consuming the design system
{
  "name": "@myorg/web",
  "private": true,
  "dependencies": {
    // ✅ workspace:* resolves to local @myorg/design-system, no publish needed
    "@myorg/design-system": "workspace:*",
    "@myorg/shared-types": "workspace:*",

    // ✅ React MUST be a direct dependency (peer dep of design-system)
    "react": "^19.0.0",
    "react-dom": "^19.0.0",

    // Regular npm packages
    "next": "^15.1.0"
  },
  "devDependencies": {
    "@myorg/eslint-config": "workspace:*",
    "@myorg/tsconfig": "workspace:*"
  }
}
```

### Pattern 2: Cross-Package TypeScript References in a Monorepo

Use this pattern when you need IDE autocomplete and type checking to work across packages as if they were all in one project. The key is using `references` in tsconfig with path aliases.

```jsonc
// Root tsconfig.json — Workspace-level base configuration
{
  "compilerOptions": {
    // Shared settings for all workspace packages
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,

    // Path aliases resolved at workspace root level
    "baseUrl": ".",
    "paths": {
      "@myorg/*": ["packages/*/src/index.ts"],
      "@myorg/ui/*": ["packages/design-system/src/components/*"],
      "@myorg/types/*": ["packages/shared-types/src/*"]
    }
  },
  // Reference projects — enables project-referenced builds for incremental compilation
  "references": [
    { "path": "packages/shared-types" },
    { "path": "packages/design-system" },
    { "path": "packages/api-client" },
    { "path": "apps/web" }
  ],
  // Exclude test files and build output from all package-level references
  "exclude": ["node_modules", "**/dist", "**/*.test.ts"]
}
```

```jsonc
// packages/shared-types/tsconfig.json — Package-specific tsconfig extends root
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    // Override base settings for this package only
    "outDir": "./dist",
    "rootDir": "./src",
    // Emit declaration files for consumers of this package
    "declaration": true,
    "declarationMap": true
  },
  "include": ["src/**/*.ts", "src/**/*.tsx"],
  "exclude": ["src/**/*.test.ts"]
}
```

```jsonc
// apps/web/tsconfig.json — Application tsconfig references library packages
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "baseUrl": ".",
    "outDir": "./dist",
    "rootDir": ".",
    // Path overrides for the app's own files
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "references": [
    { "path": "../packages/shared-types" },
    { "path": "../packages/design-system" },
    { "path": "../packages/api-client" }
  ],
  "include": ["src/**/*", "next-env.d.ts"],
  "exclude": ["node_modules", "dist"]
}
```

```typescript
// apps/web/src/pages/index.tsx — Cross-package imports with full type safety
import { Button, Modal, ThemeProvider, useTheme } from '@myorg/design-system';
import { ApiResponse, type User } from '@myorg/shared-types';
import { createApiClient } from '@myorg/api-client';

// TypeScript resolves types across packages via project references
async function fetchUser(userId: string): Promise<ApiResponse<User>> {
  const client = createApiClient({
    baseUrl: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001',
  });

  return client.get(`/users/${userId}`);
}

// Type safety is maintained across package boundaries
export default function HomePage() {
  const theme = useTheme();

  return (
    <ThemeProvider value={theme}>
      <Button variant="primary" onClick={() => fetchUser('123')}>
        Load User
      </Button>
      {/* TypeScript knows ButtonProps has 'variant' because it comes from @myorg/design-system */}
    </ThemeProvider>
  );
}
```

### Pattern 3: Cargo Workspace with Conditional Compilation (Features, Platform-Specific Code)

Use this pattern when building a Rust monorepo where crates share common functionality but need feature-flagged behavior and platform-specific implementations.

```toml
# Root Cargo.toml — Workspace manifest with shared features and dependencies
[workspace]
members = [
    "crates/core",       # Core domain types (no internal deps)
    "crates/storage",    # Storage layer (depends on core, conditional on feature)
    "crates/api",        # HTTP/gRPC API (depends on storage)
    "crates/cli",        # CLI binary (depends on api + core)
]
resolver = "2"

# Shared dependencies defined once at workspace level
[workspace.dependencies]
serde = { version = "1.0", features = ["derive"] }
tokio = { version = "1", features = ["full"] }
anyhow = "1.0"
tracing = "0.1"

# Shared feature flags for the entire workspace
[workspace.package]
version = "0.3.0"
edition = "2021"
license = "MIT"
authors = ["Engineering <eng@example.com>"]
repository = "https://github.com/example/myorg-rust"

# Profiles shared across all crates
[profile.release]
lto = true
codegen-units = 1
strip = true
opt-level = 3

[profile.dev]
split-debuginfo = "unpacked"
debug = 2
```

```toml
# crates/storage/Cargo.toml — Feature-gated storage backends
[package]
name = "myorg-storage"
version.workspace = true
edition.workspace = true

[dependencies]
myorg-core = { path = "../core" }
serde = { workspace = true }
tokio = { workspace = true }
tracing = { workspace = true }
async-trait = "0.1"

# Conditional dependencies — only compiled when the feature is enabled
[dependencies.rocksdb]
optional = true
version = "0.22"

[dependencies.sqlx]
optional = true
version = "0.8"
features = ["postgres", "runtime-tokio-rustls", "migrate"]

# Features: consumers enable one storage backend at a time
[features]
default = ["memory-store"]
memory-store = []            # In-memory store (always available)
rocksdb = ["dep:rocksdb"]    # Enable RocksDB backend
sqlx-pg = ["dep:sqlx"]       # Enable PostgreSQL via SQLx

# Platform-specific code — only compiled on Linux
[target.'cfg(target_os = "linux")'.dependencies]
nix = { version = "0.29", optional = true, features = ["fs", "mman"] }

[features.linux-advanced]
linux-advanced = ["dep:nix"]
```

```rust
// crates/storage/src/lib.rs — Feature-gated storage backends with trait abstraction
use myorg_core::domain::{Entity, EntityId};

/// Trait that all storage backends must implement
#[async_trait::async_trait]
pub trait StorageBackend: Send + Sync {
    /// Save an entity to the storage backend
    async fn save(&mut self, entity: &Entity) -> Result<(), StorageError>;

    /// Retrieve an entity by its ID
    async fn get(&self, id: EntityId) -> Result<Option<Entity>, StorageError>;

    /// List all entities with optional pagination
    async fn list(
        &self,
        limit: u32,
        offset: u32,
    ) -> Result<Vec<Entity>, StorageError>;
}

// ─── In-Memory Backend (always compiled) ──────────────────────────────

#[derive(Default)]
pub struct MemoryStorage {
    data: std::collections::HashMap<EntityId, Entity>,
}

#[async_trait::async_trait]
impl StorageBackend for MemoryStorage {
    async fn save(&mut self, entity: &Entity) -> Result<(), StorageError> {
        tracing::debug!(entity_id = %entity.id, "saving entity to memory");
        self.data.insert(entity.id.clone(), entity.clone());
        Ok(())
    }

    async fn get(&self, id: EntityId) -> Result<Option<Entity>, StorageError> {
        Ok(self.data.get(&id).cloned())
    }

    async fn list(&self, limit: u32, offset: u32) -> Result<Vec<Entity>, StorageError> {
        let entities: Vec<Entity> = self.data.values()
            .skip(offset as usize)
            .take(limit as usize)
            .cloned()
            .collect();
        Ok(entities)
    }
}

// ─── RocksDB Backend (only compiled when `rocksdb` feature is enabled) ─

#[cfg(feature = "rocksdb")]
pub struct RocksDbStorage {
    db: rocksdb::DB,
}

#[cfg(feature = "rocksdb")]
#[async_trait::async_trait]
impl StorageBackend for RocksDbStorage {
    async fn save(&mut self, entity: &Entity) -> Result<(), StorageError> {
        let key = serde_json::to_string(&entity.id)?;
        let value = serde_json::to_string(entity)?;
        self.db.put(key.as_bytes(), value.as_bytes())?;
        Ok(())
    }

    async fn get(&self, id: EntityId) -> Result<Option<Entity>, StorageError> {
        let key = serde_json::to_string(&id)?;
        match self.db.get(key.as_bytes())? {
            Some(value) => {
                let entity: Entity = serde_json::from_slice(&value)?;
                Ok(Some(entity))
            }
            None => Ok(None),
        }
    }

    // ... list implementation for RocksDB ...
}

// ─── Factory function — returns the appropriate backend based on config ─

#[derive(Debug, Clone)]
pub struct StorageConfig {
    pub backend: StorageBackendType,
}

#[derive(Debug, Clone)]
pub enum StorageBackendType {
    Memory,
    #[cfg(feature = "rocksdb")]
    RocksDb { path: std::path::PathBuf },
    #[cfg(feature = "sqlx-pg")]
    SqlxPg { connection_string: String },
}

impl StorageConfig {
    pub fn build(self) -> Result<Box<dyn StorageBackend>, StorageError> {
        match self.backend {
            StorageBackendType::Memory => Ok(Box::new(MemoryStorage::default())),
            #[cfg(feature = "rocksdb")]
            StorageBackendType::RocksDb { path } => {
                let db = rocksdb::DB::open_default(&path)?;
                Ok(Box::new(RocksDbStorage { db }))
            }
            #[cfg(feature = "sqlx-pg")]
            StorageBackendType::SqlxPg { connection_string } => {
                // SQLx pool initialization (simplified)
                todo!("Initialize PostgreSQL storage backend")
            }
        }
    }
}

// ─── Platform-specific optimization: Linux memory mapping ──────────────

#[cfg(target_os = "linux")]
fn optimize_file_io_for_linux(file_size: u64) -> std::io::Result<()> {
    use nix::fcntl::{mmap, MMapProt, MMapFlags};
    use nix::sys::mman::MapAdvice;
    // Linux-specific memory-mapped I/O optimization for large storage files
    // ... implementation ...
    Ok(())
}
```

### Pattern 4: Python uv Workspace Mode for Shared Venv and Lockfile

Use this pattern for Python monorepos where multiple packages share a single virtual environment and lockfile. This is the modern approach replacing `poetry` and `pip-tools` for monorepo dependency management.

```toml
# Root pyproject.toml — uv workspace configuration with shared venv
[project]
name = "myorg-monorepo"
version = "0.1.0"
description = "Monorepo for Python packages using uv workspace mode"
requires-python = ">=3.12"
readme = "README.md"

[tool.uv.workspace]
members = [
    "packages/core",
    "packages/sdk",
    "packages/cli",
    "apps/api-server",
]
exclude = [
    "scripts/*",       # Build/CI scripts are not packages
    "tools/*",         # Development tools are standalone
]

# Workspace-level shared dev dependencies applied to ALL members
[tool.uv]
dev-dependencies = [
    "pytest>=8.3,<9",
    "pytest-asyncio>=0.24,<1",
    "pytest-cov>=6.0,<7",
    "hypothesis>=6.122,<7",
    "ruff>=0.8,<1",
    "mypy>=1.14,<2",
    "types-requests>=2.32,<3",
]

# Global source overrides for workspace packages — enables cross-package deps
[tool.uv.sources]
myorg-core  = { workspace = true }
myorg-sdk   = { workspace = true }
myorg-cli   = { workspace = true }
```

```toml
# packages/core/pyproject.toml — Core library (base package with no internal deps)
[project]
name = "myorg-core"
version = "0.2.0"
description = "Core domain types, models, and shared utilities"
requires-python = ">=3.12"
dependencies = [
    "pydantic>=2.10,<3",
    "structlog>=25.1,<26",
]

[project.optional-dependencies]
asyncio = ["aiosqlite>=0.20,<1"]
testing = ["hypothesis>=6.122,<7"]

# Build configuration using hatchling (recommended for uv workspaces)
[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[tool.hatch.metadata]
allow-direct-references = true  # Required for workspace resolution

# Package discovery — which directories contain source code
[tool.hatch.build.targets.wheel]
packages = ["src/myorg/core"]

# MyPy type checking configuration
[tool.mypy]
strict = true
warn_return_any = true
warn_unused_configs = true
disallow_untyped_defs = true
```

```toml
# packages/sdk/pyproject.toml — SDK package depending on core via workspace
[project]
name = "myorg-sdk"
version = "0.2.0"
description = "Python SDK for interacting with the myorg platform API"
requires-python = ">=3.12"

dependencies = [
    "httpx>=0.28,<1",
    "pydantic>=2.10,<3",
    "myorg-core",  # ← No version needed; uv resolves to workspace member
]

[project.optional-dependencies]
auth = ["cryptography>=44.0,<45"]
asyncio = ["anyio>=4.8,<5"]

[project.scripts]
sdk-docs = "myorg.sdk.cli:main"  # Entry point for a CLI command from the SDK

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

# Workspace source resolution — tells uv this depends on the workspace member
[tool.uv.sources]
myorg-core = { workspace = true }
```

```toml
# packages/cli/pyproject.toml — CLI application depending on both core and sdk
[project]
name = "myorg-cli"
version = "0.2.0"
description = "Command-line interface for myorg"
requires-python = ">=3.12"

dependencies = [
    "click>=8.1,<9",
    "rich>=13.9,<14",
    "pydantic-settings>=2.7,<3",
    "myorg-core",   # Workspace resolution to packages/core
    "myorg-sdk",    # Workspace resolution to packages/sdk
]

[project.scripts]
myorg = "myorg.cli:main"   # Main CLI entry point
myorg-admin = "myorg.cli.admin:main"  # Admin subcommand entry point

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[tool.uv.sources]
myorg-core  = { workspace = true }
myorg-sdk   = { workspace = true }
```

```toml
# apps/api-server/pyproject.toml — API server using all workspace packages
[project]
name = "myorg-api-server"
version = "0.1.0"
description = "Production API server for myorg"
requires-python = ">=3.12"

dependencies = [
    "fastapi>=0.115,<1",
    "uvicorn[standard]>=0.34,<1",
    "sqlalchemy>=2.0,<3",
    "myorg-core",     # Workspace resolution
    "myorg-sdk",      # Workspace resolution
]

[tool.uv.sources]
myorg-core  = { workspace = true }
myorg-sdk   = { workspace = true }

[tool.uv.tasks]
# Task runner replaces Makefile — runs from workspace root
serve = "uvicorn apps.api_server.main:app --reload"
test = "pytest apps/ packages/"
lint = "ruff check apps/ packages/"
type-check = "mypy packages/ apps/"

[tool.ruff]
line-length = 100
target-version = "py312"

[tool.ruff.lint]
select = ["E", "F", "I", "N", "W", "UP", "B", "SIM"]
```

### Pattern 5: Turborepo Pipeline with Task Dependencies and Caching

Use this pattern for monorepos requiring build caching, task orchestration, and selective execution. This configuration supports incremental builds, parallel test execution, and filtered runs.

```jsonc
// turbo.json — Production-ready pipeline configuration
{
  "$schema": "https://turbo.build/schema.json",

  // Environment variables inherited by all tasks
  "globalEnv": [
    "NODE_ENV",
    "CI",
    "NEXT_PUBLIC_API_URL",
    "DATABASE_URL"
  ],

  // Files whose changes invalidate ALL caches — treat as full-rebuild triggers
  "globalDependencies": [
    "**/.env.*local",
    "**/tsconfig*.json",
    "pnpm-lock.yaml",
    "turbo.json",
    ".nvmrc"
  ],

  // Environment variables that are passed through but don't affect caching
  "globalPassThroughEnv": [
    "AWS_ACCESS_KEY_ID",
    "GITHUB_TOKEN",
    "NPM_TOKEN",
    "VERCEL_TOKEN"
  ],

  // Task definitions — the core pipeline configuration
  "tasks": {
    // Build: incremental compilation with dependency graph
    "build": {
      "dependsOn": ["^build"],                    // Run all upstream builds first
      "inputs": [                                  // Files that affect build output
        "src/**",
        "*.tsconfig*json",
        "globals.css",
        "!src/**/*.test.ts",
        "!src/**/*.test.tsx"
      ],
      "outputs": [                                 // Cache if these exist and are unchanged
        "dist/**",
        ".next/**",
        ".output/**",
        "build/**"
      ],
      "outputLogs": "new-only",                   // Only show new build output
      "cache": true
    },

    // Type check: fast, no output artifacts, depends on upstream builds
    "type-check": {
      "dependsOn": [],                            // No upstream — starts immediately
      "inputs": [
        "src/**",
        "*.tsconfig*json"
      ],
      "outputs": [],                              // No outputs to cache
      "outputLogs": "new-only",
      "cache": true
    },

    // Test: isolated per-package, depends on build, no caching for speed
    "test": {
      "dependsOn": ["build"],                     // Must build before testing
      "inputs": [
        "src/**",
        "tests/**"
      ],
      "outputs": [],
      "outputLogs": "new-only",
      "cache": false                              // Disable cache for tests (always re-run)
    },

    // Test with coverage: generates artifacts that should be cached
    "test:coverage": {
      "dependsOn": ["build"],
      "inputs": ["src/**", "tests/**"],
      "outputs": ["coverage/**"],
      "outputLogs": "new-only",
      "cache": true
    },

    // Lint: deterministic, fast, fully cacheable
    "lint": {
      "dependsOn": [],
      "inputs": [
        "src/**",
        ".eslintrc*",
        "eslint.config.*"
      ],
      "outputs": [],
      "outputLogs": "new-only",
      "cache": true
    },

    // Dev: long-running, no caching, depends on upstream builds
    "dev": {
      "dependsOn": ["^build"],
      "cache": false,                             // Never cache dev mode
      "persistent": true                          // Keep process running
    },

    // Clean: removes build artifacts, not cacheable
    "clean": {
      "cache": false
    },

    // Preview single-package build with upstream outputs visible
    "preview": {
      "dependsOn": ["^build"],
      "outputLogs": "full"                        // Show all upstream output in preview mode
    }
  }
}
```

**Turborepo CLI usage patterns:**

```bash
# Build all packages with cached results where possible
pnpm turbo run build

# Build only @myorg/web and its dependencies (packages it imports from)
pnpm turbo run build --filter=@myorg/web...

# Build only packages that changed since main branch
pnpm turbo run build --filter=...[main]

# Run tests in parallel across all packages (no caching)
pnpm turbo run test --parallel

# Run dev mode for a specific package with hot reload
pnpm turbo run dev --filter=@myorg/web --filter=@myorg/api-client

# Full CI pipeline: type-check → lint → build → test (sequential via dependency chain)
pnpm turbo run type-check lint build test --concurrency=4

# Dry-run to see what would happen without executing tasks
pnpm turbo run build --dry=json > build-plan.json

# Visualize the dependency graph between tasks
pnpm turbo run build --graph
```

---

## Constraints

### MUST DO
- **Use workspace tools explicitly** — Always use `workspace:*` (pnpm), `workspace = true` (uv/Cargo), or native workspaces. Never create manual symlinks or use `postinstall` scripts for cross-package linking.
- **Pin inter-package dependencies to workspace paths, not version ranges** — Use `workspace:*`, `workspace:^1.0`, or `{ workspace = true }`. Version-ranged inter-package deps cause resolution conflicts and publish-time errors.
- **Configure dependency deduplication/hoisting** — Always set `hoist-pattern` in pnpm-workspace.yaml or share dependencies via `[workspace.dependencies]` in Cargo to reduce install times and disk usage by 40–70%.
- **Run type checking across all packages from the root** — Use `turbo run type-check` or `uv run -m mypy` at the workspace root to ensure type consistency across all package boundaries.
- **Document package boundaries and public APIs** — Each package must have a README describing its purpose, dependencies, public API surface, and breaking change policy.

### MUST NOT DO
- **Do not use `file:` or path dependencies between packages for published libraries** — If a package is also published to npm/pypi/crates.io, use versioned releases (`^1.2.0`) instead of `file:../shared` or `path = "../shared"`. Only use workspace references for internal-only development.
- **Do not manually symlink workspace packages** — Never run `ln -s` or `npm link` to connect packages. Let the workspace tool handle resolution; manual symlinks break caching, cause IDE inconsistencies, and are fragile across OSes.
- **Do not commit generated lockfiles that differ across developer machines** — Ensure `.pnpm-lock.yaml`, `Cargo.lock`, or `uv.lock` are committed and regenerated by CI to guarantee deterministic builds.
- **Do not nest workspaces within workspaces** — A workspace member cannot declare its own `[workspace]` section. This causes resolution ambiguity and breaks tooling. If you need sub-packages, use scoped packages (`@myorg/sub-*`) within a single flat workspace structure.
- **Do not share mutable state between workspace members** — Each package should have its own isolated state. Sharing mutable global state (e.g., shared `localStorage` keys, shared in-memory caches without proper synchronization) leads to race conditions and makes debugging impossible.

---

## Output Template

When applying this skill, the model's output must contain:

1. **Workspace tool recommendation** — Brief justification for the selected workspace system based on language, team size, and build requirements (from the Decision Matrix in Core Workflow Step 1).
2. **Root configuration file(s)** — The complete root-level workspace configuration (`pnpm-workspace.yaml`, `package.json` with workspaces field, `Cargo.toml` with `[workspace]`, or `pyproject.toml` with `[tool.uv.workspace]`).
3. **Package manifests** — Each package member's configuration file (`package.json`, `Cargo.toml`, `pyproject.toml`) with correct inter-package dependency references.
4. **Build orchestration config** — `turbo.json` or `nx.json` configuration if build caching and parallel execution are required.
5. **Dependency resolution strategy** — Explicit hoisting/deduplication configuration to prevent duplicate dependencies across packages.

---

## Related Skills

| Skill | Purpose |
|---|---|
| `coding-package-ecosystem-navigator` | Deep-dive into individual package ecosystems (npm, Cargo, uv) for language-specific patterns beyond workspace management |
| `coding-modern-python-packaging` | Python packaging specifics (hatchling, pyproject.toml, distribution building) used within Python monorepos |
| `coding-ci-cd-pipeline-design` | CI/CD pipeline design for monorepo workflows including incremental build detection and selective test execution |
| `coding-framework-lifecycle` | Framework-level patterns for application lifecycle management within workspace members |
| `coding-code-review` | Review patterns for cross-package changes — important when committing atomic changes across multiple workspace members |

---

## Live References

1. [pnpm Workspaces Documentation](https://pnpm.io/workspaces) — Official pnpm workspace configuration, hoisting patterns, and peer dependency enforcement
2. [yarn workspaces Documentation](https://classic.yarnpkg.com/en/docs/workspaces/) — Yarn's workspace feature for monorepo package management
3. [npm Workspaces Documentation](https://docs.npmjs.com/cli/using-npm/workspaces) — npm's native workspace support introduced in npm v7
4. [Cargo Workspaces Documentation](https://doc.rust-lang.org/book/ch14-03-cargo-workspaces.html) — Rust's official guide to workspace configuration and shared dependencies
5. [uv Workspaces Documentation](https://docs.astral.sh/uv/workspaces/) — Astral uv's workspace mode for Python monorepos with single lockfile and shared venv
6. [Turborepo Task Configuration](https://turbo.build/repo/docs/core-concepts/monorepo-run-file-based-tasks) — Turborepo pipeline configuration, caching strategies, and task dependency graphs
7. [Nx Workspace Architecture](https://nx.dev/architecture/nx) — Nx project structure, target defaults, and task orchestration patterns
