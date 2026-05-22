---
name: javascript-frontend-ecosystem
description: Implements monorepo architecture, build toolchain selection, module federation, and package health assessment for modern JavaScript frontend ecosystems to enable scalable multi-package development workflows.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: monorepo setup, how do i set up a monorepo, module federation, micro-frontends, build toolchain migration, webpack to vite, turborepo vs nx
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, examples, do-dont]
  related-skills: coding-frontend-testing-patterns, javascript-package-workflows, agent-task-routing
---

# JavaScript Frontend Ecosystem Architect

Implements monorepo architecture decisions, build toolchain selection, module federation for micro-frontends, and package health assessment across modern JavaScript frontend projects. When loaded, this skill makes the model act as a senior frontend infrastructure engineer — comparing toolchains with real metrics, writing concrete configuration files (turbo.json, vite.config.ts, webpack federation configs), generating dependency audit scripts, and providing migration strategies between build systems.

## TL;DR Checklist

- [ ] Determine monorepo scope: single-language (pnpm workspaces) vs multi-language (Nx/Turborepo)
- [ ] Select build tool based on project type: dev-server speed (Vite/esbuild) vs full bundling (Webpack/Rolldown)
- [ ] Configure workspace root with `pnpm-workspace.yaml` or `turbo.json` before adding any package
- [ ] Write explicit `package.json` `"workspaces"` arrays — never rely on auto-discovery without constraints
- [ ] For micro-frontends: define shared dependency versions in root, use Module Federation for runtime composition
- [ ] Audit dependency health: last publish date < 6 months, contributor count > 3, zero critical CVEs
- [ ] Reference `code-philosophy` (5 Laws of Elegant Defense) when designing package boundaries and data flow

---

## When to Use

Use this skill when:

- Setting up a new monorepo or migrating from separate repositories to a shared workspace
- Choosing between build tools (Webpack, Vite, esbuild, Rolldown, SWC) for a new project
- Implementing micro-frontend architecture using Module Federation or runtime composition
- Evaluating dependency health across a large package tree before upgrading
- Migrating an existing Webpack-based frontend to Vite or Rolldown
- Designing the package boundary strategy for a multi-team frontend organization

---

## When NOT to Use

Avoid this skill for:

- Single-package projects with fewer than 3 npm dependencies — monorepo tooling adds unnecessary overhead (use standard `package.json` alone)
- Backend-only Node.js services without any browser-facing code — consider Turborepo without frontend plugins instead
- Server-side rendering frameworks that manage their own build toolchain internally (Next.js, Remix, SvelteKit) — configure their built-in bundler instead

---

## Core Workflow

1. **Assess Project Scope and Team Size** — Count the number of packages, identify shared dependencies, and determine if multiple languages are involved. If the project has ≤ 5 packages all written in TypeScript/JavaScript and team size is < 4, prefer pnpm workspaces for simplicity. If ≥ 6 packages or cross-language (TS + Python + Rust tooling), evaluate Turborepo or Nx.
   **Checkpoint:** Document the package count, language matrix, and shared dependency list before proceeding.

2. **Select Monorepo Toolchain** — Compare against the Landscape Table below. For pure JS/TS monorepos: `pnpm workspaces + turbo.json` provides the best balance of speed and simplicity. For complex CI/CD needs with caching across languages: Nx. For Rush-style strict version pinning across thousands of packages: Rush (typically at scale > 50 packages).
   **Checkpoint:** Write the chosen tool's config file at the monorepo root before adding any package.json.

3. **Design Package Boundary Strategy** — Define explicit exports via `"exports"` field in each package's `package.json`. Never use `"main"` alone for ESM-first projects. Apply Law 1 (Early Exit): each package should have a single clear responsibility. Packages that do two things will inevitably leak coupling.
   **Checkpoint:** Run `pnpm list --recursive` to verify no circular dependencies exist between workspace packages.

4. **Configure Build Toolchain** — Match the build tool to project requirements. For new projects with HMR needs: Vite with `@vitejs/plugin-react` or native plugins. For legacy Webpack migration: convert loaders → plugins using the Migration Pattern. For pure CSS/JS transformation without bundling: esbuild or Rolldown.
   **Checkpoint:** Verify `npx <tool> build --mode production` succeeds with zero errors before committing.

5. **Set Up Module Federation (if micro-frontend)** — Define `remotes` and `shared` dependencies in the federation config. Always version-shared dependencies explicitly (`"react": { singleton: true, requiredVersion: "^18.2.0" }`) to prevent duplicate instances. Host app exposes `exposes` for remote modules.
   **Checkpoint:** Start both host and remote dev servers; navigate to a route that renders a remote component — if the page loads with shared state (React Context) working, federation is correctly configured.

6. **Run Dependency Health Audit** — Execute the audit script (Pattern 4). Flag any package with: last published > 6 months ago, fewer than 3 contributors in the last year, or critical/high CVEs. Present a remediation plan: pin version, fork and maintain, or replace.
   **Checkpoint:** Generate `dependency-audit-report.json` with pass/fail per package. No unflagged stale packages may ship to production.

---

## Monorepo Toolchain Landscape (May 2026)

| Feature | pnpm Workspaces + Turborepo | Nx | Rush | Yarn Workspaces |
|---|---|---|---|---|
| **Best For** | JS/TS monorepos, ≤ 20 packages | Complex multi-language repos, CI/CD integration | Enterprise scale (>50 packages), strict version control | Simple JS monorepos with existing Yarn adoption |
| **Dependency Resolution** | Hoisted + content-addressed store (disk efficient) | Graph-based hoisting with isolation support | Strict peer dep enforcement, no implicit hoisting | Flat hoisting model |
| **Task Runner / Caching** | Turborepo: remote caching via Vercel/Railway, pipeline-based | Built-in task graph + distributed caching via Nx Cloud | Rush build pipeline, local file cache only | None — requires external tool (e.g., Lerna) |
| **Build Integration** | Framework-agnostic; works with Vite, Webpack, esbuild, SWC | Integrated generators for React, Angular, Next.js, Vue | Works with any bundler; minimal opinionation | Same as pnpm workspaces |
| **CI/CD Support** | Remote build cache (cloud or self-hosted via Turbo SDK) | Nx Cloud: distributed task execution, test splitting | GitHub Actions plugin; no hosted caching option | None built in |
| **Learning Curve** | Low — `pnpm-workspace.yaml` + simple turbo.json | Medium-high — generators, executors, project graph config | High — `rush.json`, version policy files, strict constraints | Low — familiar if you know Yarn |
| **Monorepo Repo Size Limit** | Practical limit ~20 packages for optimal UX | Scales to 100+ with Nx Cloud caching | Tested at 3000+ packages (Microsoft internal) | Practical limit ~15 packages |
| **License** | MIT (Turborepo) / ISC (pnpm) | MIT | Apache-2.0 | BSD-2-Clause |

---

## Build Toolchain Comparison (May 2026)

| Feature | Webpack 5 | Vite 6.x | esbuild / Rolldown | SWC (with tsup/bun build) |
|---|---|---|---|---|
| **Primary Use Case** | Legacy apps, complex plugin ecosystems, code splitting with dynamic imports | New projects, fast dev HMR, modern framework integration | Pure transformation (no bundling), library builds, zero-config setups | TypeScript-to-JS transform + bundling for libraries |
| **Dev Server Start Time** | 3–15 seconds (full bundle) | 50–300ms (ECMAScript modules on demand) | N/A (no dev server) | N/A (build-only) |
| **Production Build Speed** | 30–120 seconds (depending on size) | 5–15 seconds (Rollup under the hood) | 1–5 seconds (transformation only) | 2–10 seconds (parallelized SWC workers) |
| **ESM Support** | ✅ with `output.module: true` + imports field | ✅ Native — dev uses native ESM, prod bundles to ESM/CJS | ❌ Transformation only, no module resolution | ❌ Transformation only, use tsup for bundling |
| **Tree Shaking** | ✅ Side-effect-free detection (`sideEffects: false`) | ✅ Rollup-based, reliable | ❌ Not applicable (no bundling) | ✅ When bundled via esbuild/terser downstream |
| **Plugin Ecosystem** | 4000+ plugins on npm | Growing (Vite ecosystem), Rollup plugin compatibility layer | Rolldown: rapid growth in 2025–2026, Rust-based | Limited — mostly transform hooks |
| **CSS Handling** | css-loader + style-loader / mini-css-extract-plugin | Native CSS import, separate chunks with `@vitejs/plugin-basic-ssl` | Not applicable (use postcss CLI) | Use postcss as preprocessor |
| **Code Splitting** | ✅ Dynamic `import()` with chunk naming via `optimization.splitChunks` | ✅ Rollup dynamic imports + manual chunk groups | ❌ No splitting — single file per entry | ✅ Via esbuild's `splitting: true` in tsup |
| **TypeScript Support** | Requires `ts-loader` or `@swc/core` (slower) | ✅ Native, uses esbuild for transform | N/A (TS transformed by Rolldown/swc internally) | ✅ Native SWC compiler — fastest TS transform |
| **Migration Effort** | — | Medium: convert loaders to plugins, update import syntax | Low: drop-in replacement for `tsc --outDir` | Medium: restructure package.json `"build"` scripts |
| **Recommended For** | Maintaining existing Webpack projects | Greenfield projects, framework migrations | Library publishing, CSS/JS minification pipelines | TypeScript library packaging with zero-config builds |

---

## Implementation Patterns

### Pattern 1: Monorepo Workspace Configuration — pnpm Workspaces + Turborepo

Set up a production-grade monorepo root with explicit workspace definitions, pipeline caching, and shared ESLint config.

```yaml
# packages/monorepo-root/pnpm-workspace.yaml
# Defines which directories contain workspace packages.
# Explicit arrays prevent accidental inclusion of node_modules or dist folders.
packages:
  - 'apps/*'           # Application packages (web-frontend, admin-dashboard)
  - 'packages/*'       # Shared library packages (ui-components, data-fetcher, auth-utils)
  - '!packages/*/dist'  # Exclude build output directories
```

```jsonc
// packages/monorepo-root/turbo.json
{
  "$schema": "https://turbo.build/schema.json",
  // Pipeline defines which tasks run and their dependencies.
  // Each task can declare input files for caching granularity.
  "tasks": {
    "build": {
      // Input sources tracked for cache invalidation
      "inputs": ["src/**/*.ts", "src/**/*.tsx", "*.json"],
      // Output artifacts to cache remotely
      "outputs": ["dist/**", ".next/**", "build/**"],
      // Upstream dependencies: build depends on the package's own build task first
      "dependsOn": ["^build"],
      // Cache is enabled and uses a remote cache (Vercel/Railway/self-hosted)
      "cache": true
    },
    "dev": {
      // Dev never hits remote cache — always run locally with streaming output
      "cache": false,
      "persistent": true,
      "dependsOn": []
    },
    "lint": {
      "inputs": ["src/**/*.ts", "src/**/*.tsx", "*.json", ".eslintrc*"],
      "outputs": [],
      "cache": true,
      "dependsOn": []
    },
    "test": {
      // Integration tests depend on build; unit tests do not
      "inputs": ["src/**/*.ts", "src/**/*.tsx", "tests/**"],
      "outputs": [],
      "cache": true,
      "dependsOn": ["^build"]
    },
    "typecheck": {
      "inputs": ["src/**/*.ts", "src/**/*.tsx", "tsconfig*.json"],
      "outputs": [],
      "cache": false,
      "dependsOn": []
    }
  }
}
```

```jsonc
// packages/monorepo-root/package.json — Root workspace manifest
{
  "name": "js-frontend-monorepo",
  "private": true,
  "scripts": {
    // Run build across all packages in dependency order
    "build": "turbo run build",
    // Start dev servers for all apps concurrently
    "dev": "turbo run dev --parallel",
    // Lint everything
    "lint": "turbo run lint",
    // Test everything with typecheck first
    "test": "turbo run test",
    // Type-check without emitting files (fast)
    "typecheck": "turbo run typecheck"
  },
  "devDependencies": {
    "typescript": "^5.6.0",
    "eslint": "^9.18.0",
    "@typescript-eslint/eslint-plugin": "^8.19.0",
    "@typescript-eslint/parser": "^8.19.0"
  },
  "engines": {
    "node": ">=20.0.0",
    "pnpm": ">=9.0.0"
  }
}
```

**❌ BAD — Using pnpm workspaces with implicit auto-discovery (fragile):**
```yaml
# pnpm-workspace.yaml — BAD: no explicit packages list, no exclusions
# Any subdirectory could be picked up as a package, including CI configs
# and temporary build artifacts. This leads to spurious errors during
# `pnpm install`.
packages:
  - '*/'   # Too broad — catches node_modules, .git, temp dirs
```

**✅ GOOD — Explicit packages list with exclusion patterns:**
See the full example above. Always be explicit about what is and isn't a workspace package.

---

### Pattern 2: Module Federation Setup for Micro-Frontends (Webpack 5)

Configure runtime composition between a host application and remote micro-frontend using Webpack 5's Module Federation plugin.

```javascript
// apps/host-app/webpack.config.js — Host Application
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { ModuleFederationPlugin } = require('webpack').container;
const path = require('path');

module.exports = {
  entry: './src/index.tsx',
  output: {
    filename: '[name].[contenthash:8].js',
    path: path.resolve(__dirname, 'dist'),
    clean: true,
  },
  module: {
    rules: [
      {
        test: /\.[jt]sx?$/,
        use: 'swc-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.jsx', '.js'],
  },
  plugins: [
    new HtmlWebpackPlugin({ template: './public/index.html' }),
    new ModuleFederationPlugin({
      name: 'hostApp',
      filename: 'remoteEntry.js',
      // Remote exposes can be consumed by other hosts
      remotes: {
        // Load the dashboard micro-frontend from its dev server URL
        // In production, this would be a CDN path instead
        dashboard: 'dashboardApp@http://localhost:3001/remoteEntry.js',
      },
      // Shared dependencies — critical for preventing duplicate React instances
      shared: {
        react: {
          singleton: true,            // Only one React instance allowed
          requiredVersion: '^18.2.0',  // Pin compatible version range
          eager: false,                // Lazy-load until needed (performance)
        },
        'react-dom': {
          singleton: true,
          requiredVersion: '^18.2.0',
        },
        '@internal/ui-components': {
          singleton: false,            // Each app can have its own copy
          requiredVersion: '^2.0.0',
        },
        'react-router-dom': {
          singleton: true,
          requiredVersion: '^6.22.0',
          eager: true,                 // Must be loaded before any route matching
        },
      },
    }),
  ],
  devServer: {
    port: 3000,
    historyApiFallback: true,
  },
};
```

```javascript
// apps/dashboard-app/webpack.config.js — Remote Micro-Frontend
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { ModuleFederationPlugin } = require('webpack').container;
const path = require('path');

module.exports = {
  entry: './src/index.tsx',
  output: {
    filename: '[name].[contenthash:8].js',
    path: path.resolve(__dirname, 'dist'),
    clean: true,
    publicPath: 'http://localhost:3001/',  // Must match dev server URL
  },
  module: {
    rules: [
      { test: /\.[jt]sx?$/, use: 'swc-loader', exclude: /node_modules/ },
      { test: /\.css$/, use: ['style-loader', 'css-loader'] },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({ template: './public/index.html' }),
    new ModuleFederationPlugin({
      name: 'dashboardApp',
      filename: 'remoteEntry.js',
      // Expose these modules for host apps to consume
      exposes: {
        './DashboardPage': './src/pages/DashboardPage.tsx',
        './AnalyticsWidget': './src/widgets/AnalyticsWidget.tsx',
      },
      shared: {
        react: { singleton: true, requiredVersion: '^18.2.0' },
        'react-dom': { singleton: true, requiredVersion: '^18.2.0' },
        'react-router-dom': { singleton: true, requiredVersion: '^6.22.0' },
      },
    }),
  ],
  devServer: {
    port: 3001,
    headers: {
      // Module Federation requires CORS for cross-origin remoteEntry.js fetches
      'Access-Control-Allow-Origin': '*',
    },
  },
};
```

```tsx
// apps/host-app/src/App.tsx — Consuming a remote module dynamically
import React, { lazy, Suspense } from 'react';

// Dynamic import of the remote module — loads only when the route is visited
const DashboardPage = lazy(() => import('dashboardApp/DashboardPage'));

function App() {
  return (
    <Suspense fallback={
      <div className="skeleton-loader" style={{ padding: '2rem' }}>
        Loading dashboard...
      </div>
    }>
      <DashboardPage />
    </Suspense>
  );
}

export default App;
```

**❌ BAD — Missing shared dependency version pinning (causes duplicate React):**
```javascript
// BAD: Without requiredVersion, a remote using React 19 and host using React 18
// will cause "Invalid hook call" errors at runtime because two React instances exist.
shared: {
  react: { singleton: true },         // No version constraint!
  'react-dom': { singleton: true },   // Same problem
}
```

**✅ GOOD — Explicit shared dependency contracts:**
See the full example above. Always pin `requiredVersion` for all shared dependencies and use `singleton: true` only for framework core packages that must have a single instance.

---

### Pattern 3: Build Toolchain Migration — Webpack → Vite (with Real Conversion)

Convert an existing Webpack configuration to Vite, handling loader-to-plugin mappings, alias resolution, and environment variable differences.

```javascript
// OLD: apps/webapp/webpack.config.js (legacy configuration)
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = {
  entry: './src/index.tsx',
  output: {
    filename: '[name].[contenthash:8].js',
    path: path.resolve(__dirname, 'dist'),
  },
  module: {
    rules: [
      // TypeScript compilation via SWC (old Webpack config used babel-loader)
      { test: /\.[jt]sx?$/, use: ['swc-loader'], exclude: /node_modules/ },
      // CSS extraction to separate files
      { test: /\.css$/, use: [MiniCssExtractPlugin.loader, 'css-loader'] },
      // Image assets with inline threshold
      { test: /\.(png|svg|jpg|jpeg|gif)$/i, type: 'asset', parser: { dataUrlCondition: { maxSize: 8192 } } },
      // Font files
      { test: /\.(woff|woff2|eot|ttf|otf)$/i, type: 'asset/resource', generator: { filename: 'fonts/[name][ext]' } },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.jsx', '.js'],
    alias: {
      '@components': path.resolve(__dirname, 'src/components'),
      '@utils': path.resolve(__dirname, 'src/utils'),
      '@hooks': path.resolve(__dirname, 'src/hooks'),
    },
  },
  plugins: [
    new HtmlWebpackPlugin({ template: './public/index.html', minify: { removeComments: true } }),
    new MiniCssExtractPlugin({ filename: '[name].[contenthash:8].css' }),
    new CopyPlugin({ patterns: [{ from: 'public/', to: '.' }] }),
  ],
};
```

```typescript
// NEW: apps/webapp/vite.config.ts (converted Vite configuration)
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [
    // SWC-based React plugin — faster than the babel-based @vitejs/plugin-react
    react({
      tsDecorators: true,
    }),
  ],
  resolve: {
    alias: {
      // Vite aliases use string prefixes — no need for path.resolve()
      '@components/': new URL('./src/components/', import.meta.url).pathname,
      '@utils/': new URL('./src/utils/', import.meta.url).pathname,
      '@hooks/': new URL('./src/hooks/', import.meta.url).pathname,
    },
  },
  build: {
    // Output configuration matches the Webpack pattern
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        // Manual chunk splitting — same strategy as Webpack's splitChunks
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          charts: ['recharts', 'd3'],
        },
      },
    },
  },
  css: {
    // CSS handling is native in Vite — no loader configuration needed
    // PostCSS can be configured via postcss.config.js
    devSourcemap: true,
  },
  server: {
    port: 3000,
    hmr: {
      overlay: true,
    },
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
});
```

```typescript
// NEW: apps/webapp/postcss.config.mjs (new file — replaces css-loader config)
export default {
  plugins: {
    autoprefixer: {},
    'postcss-import': {},
  },
};
```

**❌ BAD — Using Webpack-style require() for environment variables in Vite:**
```javascript
// BAD: process.env does not work reliably in client-side Vite code.
// Vite exposes env via import.meta.env, not process.env.
const apiBaseUrl = process.env.REACT_APP_API_URL;
```

**✅ GOOD — Vite-native environment variable access with type-safe prefix:**
```typescript
// GOOD: Vite only exposes env variables prefixed with VITE_ into the client bundle.
// Using import.meta.env provides type safety and guarantees the value exists at compile time.
const apiBaseUrl = import.meta.env.VITE_API_URL;

// For build-time-only env vars (server config), access them in a .ts file that
// never gets bundled to the browser:
// const secretKey = process.env.SECRET_KEY; // OK — server-side code only
```

---

### Pattern 4: Package Health Assessment and Dependency Audit Script

Generate a comprehensive health report for all dependencies across a monorepo, checking registry status, publication recency, contributor activity, and known vulnerabilities.

```typescript
// scripts/dependency-audit.ts — Monorepo dependency health auditor
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// Configuration thresholds — tune these for your organization's risk tolerance
const THRESHOLDS = {
  maxAgeMonths: 6,           // Package not published in N months → flagged
  minContributors: 3,        // Fewer than M unique contributors in last year → flagged
  maxCriticalVulns: 0,       // Zero critical CVEs allowed
  maxHighVulns: 2,           // More than 2 high-severity CVEs → flagged
  minWeeklyDownloads: 100,   // Fewer than K downloads/week → flagged as low-usage dependency
} as const;

interface DependencyInfo {
  name: string;
  version: string;
  type: 'prod' | 'dev';
  lastPublished: string | null;
  ageMonths: number | null;
  contributors: number | null;
  criticalVulns: number;
  highVulns: number;
  weeklyDownloads: number | null;
  healthStatus: 'healthy' | 'warning' | 'critical';
  reasons: string[];
}

interface AuditReport {
  timestamp: string;
  totalDependencies: number;
  healthy: number;
  warnings: number;
  critical: number;
  dependencies: DependencyInfo[];
}

/**
 * Fetch package metadata from the npm registry.
 * Uses the public JSON API — no authentication required for read access.
 */
async function fetchPackageMetadata(
  name: string,
  version: string | null = null,
): Promise<{
  lastPublished: string;
  contributors: number;
  weeklyDownloads: number;
}> {
  try {
    const url = version
      ? `https://registry.npmjs.org/${name}/${version}`
      : `https://registry.npmjs.org/${name}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Registry returned ${response.status} for ${name}`);
    }

    const data = await response.json();
    const distTags = data['dist-tags'] as Record<string, string>;
    const actualVersion = version || distTags.latest || Object.keys(data.versions)[0];
    const versionData = data.versions[actualVersion];

    return {
      lastPublished: data.time?.[actualVersion] ?? null,
      contributors: versionData?.contributors
        ? Array.isArray(versionData.contributors)
          ? versionData.contributors.length
          : 1
        : null,
      weeklyDownloads: data.downloads?.lastWeek ?? null,
    };
  } catch (error) {
    // If registry fetch fails, return partial metadata — don't abort the whole audit
    console.warn(`[WARN] Could not fetch metadata for ${name}: ${(error as Error).message}`);
    return { lastPublished: null, contributors: null, weeklyDownloads: null };
  }
}

/**
 * Query npm audit for vulnerability counts.
 * Returns a summary object with critical and high CVE counts.
 */
function runNpmAudit(workingDir: string): { critical: number; high: number } {
  try {
    const output = execSync(
      `npm audit --json --prefix "${workingDir}"`,
      { encoding: 'utf-8', timeout: 30_000 },
    );
    const auditData = JSON.parse(output);
    
    const vulnerabilities = auditData.vulnerabilities as Record<string, { severity: string }>;
    let critical = 0;
    let high = 0;

    for (const [name, info] of Object.entries(vulnerabilities)) {
      if (info.severity === 'critical') critical++;
      if (info.severity === 'high') high++;
    }

    return { critical, high };
  } catch {
    // Audit might fail in CI with --ignore-scripts or locked environments
    // Return zeros — the developer should run `npm audit` locally for accurate results
    return { critical: 0, high: 0 };
  }
}

/**
 * Calculate the age of a package in months from its last published date.
 */
function calculateAgeMonths(lastPublished: string | null): number | null {
  if (!lastPublished) return null;
  const pubDate = new Date(lastPublished);
  const now = new Date();
  
  if (isNaN(pubDate.getTime())) return null;
  
  const diffMs = now.getTime() - pubDate.getTime();
  const diffMonths = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30.44));
  return diffMonths;
}

/**
 * Determine health status and collect all reasons for flags.
 */
function assessHealth(
  ageMonths: number | null,
  contributors: number | null,
  criticalVulns: number,
  highVulns: number,
  weeklyDownloads: number | null,
): { status: 'healthy' | 'warning' | 'critical'; reasons: string[] } {
  const reasons: string[] = [];

  if (ageMonths !== null && ageMonths > THRESHOLDS.maxAgeMonths) {
    reasons.push(`Not published in ${ageMonths} months (threshold: ${THRESHOLDS.maxAgeMonths})`);
  }
  if (contributors !== null && contributors < THRESHOLDS.minContributors) {
    reasons.push(`Only ${contributors} contributor(s) (minimum: ${THRESHOLDS.minContributors})`);
  }
  if (criticalVulns > THRESHOLDS.maxCriticalVulns) {
    reasons.push(`${criticalVulns} critical CVE(s) found`);
  }
  if (highVulns > THRESHOLDS.maxHighVulns) {
    reasons.push(`${highVulns} high-severity CVE(s) found`);
  }
  if (weeklyDownloads !== null && weeklyDownloads < THRESHOLDS.minWeeklyDownloads) {
    reasons.push(`Low adoption: ${weeklyDownloads} weekly downloads`);
  }

  const status: 'healthy' | 'warning' | 'critical' =
    criticalVulns > 0 || ageMonths === null ? 'critical' :
    reasons.length > 0 ? 'warning' : 'healthy';

  return { status, reasons };
}

/**
 * Main audit function — scans all workspaces and produces a consolidated report.
 */
async function runMonorepoAudit(): Promise<AuditReport> {
  const report: AuditReport = {
    timestamp: new Date().toISOString(),
    totalDependencies: 0,
    healthy: 0,
    warnings: 0,
    critical: 0,
    dependencies: [],
  };

  // Step 1: Discover all workspace package.json files using pnpm
  let workspacePackages: string[] = [];
  try {
    const output = execSync('pnpm ls --depth=-1 --json', {
      cwd: ROOT,
      encoding: 'utf-8',
      timeout: 60_000,
    });
    // Parse pnpm's flat list to get unique workspace package paths
    const pkgPaths = new Set<string>();
    for (const line of output.trim().split('\n')) {
      if (line.startsWith('[') && line.endsWith(']')) continue;
      // Extract the root directory of each workspace package
      const match = line.match(/^(@[^\/]+\/)?([^@\/]+)/);
      if (match) {
        pkgPaths.add(match[2]);
      }
    }
    
    // Also directly scan the workspace structure
    for (const subdir of ['apps', 'packages']) {
      const dirPath = resolve(ROOT, subdir);
      try {
        const dirs = execSync(`find "${dirPath}" -mindepth 1 -maxdepth 1 -type d`, {
          encoding: 'utf-8',
          timeout: 5_000,
        }).trim().split('\n').filter(Boolean);
        for (const dir of dirs) {
          pkgPaths.add(dir);
        }
      } catch { /* directory may not exist */ }
    }
    
    workspacePackages = Array.from(pkgPaths);
  } catch {
    console.error('[ERROR] Could not discover workspace packages. Ensure you are in a pnpm monorepo root.');
    process.exit(1);
  }

  // Step 2: Audit each workspace package individually
  for (const pkgPath of workspacePackages) {
    const pkgJsonPath = resolve(pkgPath, 'package.json');
    
    try {
      const pkgContent = readFileSync(pkgJsonPath, 'utf-8');
      const pkgJson = JSON.parse(pkgContent);
      const pkgName = pkgJson.name || '<unnamed-workspace-package>';

      // Collect all dependencies from this package
      const deps = [
        ...Object.entries(pkgJson.dependencies ?? {}).map(([name, ver]) => ({ name, version: typeof ver === 'string' ? ver : String(ver), type: 'prod' as const })),
        ...Object.entries(pkgJson.devDependencies ?? {}).map(([name, ver]) => ({ name, version: typeof ver === 'string' ? ver : String(ver), type: 'dev' as const })),
      ];

      // Run npm audit for vulnerability counts
      const { critical, high } = runNpmAudit(pkgPath);

      for (const dep of deps) {
        report.totalDependencies++;

        try {
          const metadata = await fetchPackageMetadata(dep.name, dep.version.replace('^', '').replace('~', ''));
          const ageMonths = calculateAgeMonths(metadata.lastPublished);
          const { status, reasons } = assessHealth(
            ageMonths,
            metadata.contributors,
            critical, // Note: per-package audit counts; for monorepo-wide, aggregate these
            high,
            metadata.weeklyDownloads,
          );

          report.dependencies.push({
            name: dep.name,
            version: dep.version,
            type: dep.type,
            lastPublished: metadata.lastPublished,
            ageMonths,
            contributors: metadata.contributors,
            criticalVulns: critical,
            highVulns: high,
            weeklyDownloads: metadata.weeklyDownloads,
            healthStatus: status,
            reasons,
          });

          if (status === 'healthy') report.healthy++;
          else if (status === 'warning') report.warnings++;
          else report.critical++;
        } catch {
          // If fetch fails for a specific dep, record it as critical with no metadata
          report.totalDependencies--; // Don't double-count
          report.dependencies.push({
            name: dep.name,
            version: dep.version,
            type: dep.type,
            lastPublished: null,
            ageMonths: null,
            contributors: null,
            criticalVulns: 0,
            highVulns: 0,
            weeklyDownloads: null,
            healthStatus: 'critical',
            reasons: ['Failed to fetch registry metadata — manual review required'],
          });
          report.critical++;
        }
      }
    } catch {
      console.warn(`[WARN] Skipping ${pkgPath}: could not read package.json`);
    }
  }

  // Step 3: Write the report
  const outputPath = resolve(ROOT, 'scripts', 'dependency-audit-report.json');
  writeFileSync(outputPath, JSON.stringify(report, null, 2), 'utf-8');
  
  console.log(`\n📊 Audit complete: ${report.totalDependencies} dependencies scanned`);
  console.log(`   ✅ Healthy:      ${report.healthy}`);
  console.log(`   ⚠️  Warnings:    ${report.warnings}`);
  console.log(`   ❌ Critical:     ${report.critical}`);
  console.log(`   📄 Report saved to: ${outputPath}\n`);

  return report;
}

// Execute the audit when run as the main module
runMonorepoAudit().catch((err) => {
  console.error('[FATAL] Audit failed:', err.message);
  process.exit(1);
});
```

**❌ BAD — Using `npm outdated` alone for health assessment (insufficient):**
```bash
# BAD: `npm outdated` only shows version mismatches, not publish recency,
# contributor activity, or vulnerability depth. A package can be "up to date"
# but still abandoned by its maintainers with unpatched critical CVEs.
npm outdated --all
```

**✅ GOOD — Comprehensive audit combining registry metadata + CVE scanning + adoption metrics:**
See the full TypeScript example above. The script checks five independent health dimensions and produces a structured JSON report that can be consumed by CI pipelines or dashboards.

---

## Constraints

### MUST DO
- Always define workspace package boundaries explicitly in `pnpm-workspace.yaml` — never use glob patterns like `'*/'` that could include build artifacts
- Use explicit `"exports"` field in every workspace package's `package.json` for ESM-first projects — do not rely solely on `"main"` and `"module"`
- Pin shared dependency versions in Module Federation configs with both `singleton: true` and `requiredVersion` — duplicate React/Vue/Angular instances cause hard-to-debug runtime crashes
- When migrating build toolchains, preserve the original Webpack config as a reference file (e.g., `webpack.config.js.migrate-ref`) for the first two weeks post-migration
- Run `pnpm list --recursive --depth=0` after workspace setup to verify no circular dependencies before committing configuration
- Audit all third-party dependencies against these five health dimensions: last published date, contributor count, critical CVEs, high CVEs, and weekly download count
- Reference `code-philosophy` (5 Laws of Elegant Defense): design package boundaries so data flows naturally from public APIs inward, use early exit for invalid dependency states, and fail fast with descriptive errors when audit thresholds are breached

### MUST NOT DO
- Never share `node_modules` across workspace packages without content-addressed storage (pnpm) — symlink hoisting causes broken resolution in nested workspaces
- Do not use `"main": "dist/index.js"` as the sole export path for ESM packages — always include `"exports"` with both ESM and CJS entry points
- Do not skip CORS headers on Module Federation remote dev servers — without `'Access-Control-Allow-Origin': '*'`, the host app cannot fetch `remoteEntry.js` across ports
- Never set `singleton: true` on every shared dependency in Module Federation — only core framework packages (react, react-dom, react-router) should be singletons; UI component libraries should allow duplicates per micro-frontend
- Do not rely on `npm outdated` alone for dependency health — it measures version age, not project vitality or security posture
- Never commit generated `dist/` or `.next/` directories to version control in any workspace package

---

## Output Template

When applying this skill, produce:

1. **Architecture Recommendation** — Selected monorepo toolchain with justification based on the Landscape Table metrics (package count, team size, language diversity)
2. **Configuration Files** — Complete `pnpm-workspace.yaml`, `turbo.json` or `nx.json`, and root `package.json` ready to commit
3. **Build Tool Recommendation** — Selected bundler with justification from the Build Toolchain Comparison Table, including migration steps if applicable
4. **Module Federation Config** — Host and remote Webpack configs with shared dependency contracts (if micro-frontend architecture is required)
5. **Dependency Audit Report** — JSON structure summary showing pass/fail counts per health dimension, with flagged packages listed explicitly
6. **Migration Checklist** — Step-by-step conversion plan for build toolchain migrations, including what config lines map to what

---

## Live References

- **pnpm Workspaces Documentation** — https://pnpm.io/workspaces (official workspace configuration guide)
- **Turborepo Documentation** — https://turbo.build/repo/docs (task pipelines, remote caching, and monorepo patterns)
- **Module Federation Specification** — https://module-federation.io/guide/self-hosted.html (runtime module composition for micro-frontends)
- **Vite Documentation** — https://vitejs.dev/guide/ (configuration reference, plugin API, build optimization)
- **Webpack 5 Module Federation Guide** — https://webpack.js.org/plugins/module-federation-plugin/ (official migration and federation setup)
- **npm Audit CLI Reference** — https://docs.npmjs.com/cli/audit (dependency vulnerability scanning commands and JSON output format)
- **Rolldown (Rust-based Webpack successor)** — https://rolldown.rs/ (next-generation bundler with ESM-native architecture)

---

## Related Skills

| Skill | Purpose |
|---|---|
| `coding-frontend-testing-patterns` | Write testing strategies (unit, integration, e2e) for monorepo frontend apps using Vitest and Playwright |
| `coding-package-publishing-workflows` | Configure semantic-release, changelog generation, and npm registry publishing across workspace packages |
| `agent-task-routing` | Route frontend infrastructure tasks to the appropriate specialized skills based on domain classification |
