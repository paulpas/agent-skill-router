---
name: react-bundle-size
description: Optimizes JavaScript bundle size in React applications through route-level code splitting, tree shaking configuration, granular imports, dynamic imports, and CI bundle size budgets.
license: MIT
compatibility: opencode
archetypes:
  - tactical
  - generation
anti_triggers:
  - brainstorming
  - vague ideation
  - long-form architecture
response_profile:
  verbosity: low
  directive_strength: high
  abstraction_level: operational
metadata:
  version: "1.0.0"
  domain: coding
  triggers: bundle size, code splitting, react bundle, tree shaking, dynamic import, react lazy, bundle analyzer
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples, config]
  related-skills: react-server-performance, react-async-waterfalls, react-rerender-optimization
  author: https://github.com/vercel
  source: https://github.com/vercel-labs/agent-skills
---

# React Bundle Size Optimization

Reduces JavaScript bundle size in React applications by applying code splitting at route boundaries, configuring tree shaking, using granular imports instead of barrel imports, dynamically loading heavy third-party libraries, and enforcing size budgets in CI/CD pipelines. Smaller bundles mean faster page loads, lower bandwidth costs, and better Core Web Vitals scores.

## TL;DR Checklist

- [ ] Set up `@next/bundle-analyzer` or `webpack-bundle-analyzer` before optimizing
- [ ] Apply route-level code splitting with `React.lazy()` and `Suspense`
- [ ] Use `next/dynamic` with `ssr: false` for client-only components in Next.js
- [ ] Configure `sideEffects: false` in `package.json` to enable tree shaking
- [ ] Import only what you need: `import { format } from 'date-fns'` not barrel imports
- [ ] Lazy-load heavy libraries (charts, maps, rich text editors) only when needed
- [ ] Set CI/CD bundle size budgets to prevent regressions on every PR
- [ ] Audit bundle after every major dependency addition

---

## When to Use

Use this skill when:

- Lighthouse or Web Vitals reports show large JavaScript bundle sizes
- Adding a new heavy dependency (charting, maps, WYSIWYG editor, moment.js replacement)
- Building a multi-page app where each page doesn't need all the JavaScript upfront
- Setting up a new Next.js, Create React App, or Vite project that will grow over time
- Reviewing a pull request that adds a large new dependency
- Migrating from monolithic imports to tree-shakeable ES module imports
- Investigating high "Total Blocking Time" (TBT) caused by large initial bundles

---

## When NOT to Use

Avoid this skill for:

- Tiny apps with under 50KB of JS — overhead of code splitting exceeds benefits
- Server-rendered only apps with no client-side JavaScript (static site generators)
- Apps already at optimal bundle size (< 100KB gzipped initial JS)
- Quick prototypes where bundle optimization isn't a concern

---

## Core Workflow

1. **Audit Current Bundle** — Run `@next/bundle-analyzer` or `webpack-bundle-analyzer` to measure current bundle composition. Identify the largest modules and unexpected duplicates. **Checkpoint:** Note top 5 largest modules and their sizes before making changes.

2. **Apply Route-Level Code Splitting** — Split at route boundaries using `React.lazy()` or framework-specific dynamic imports. Each route should load only its own JavaScript. **Checkpoint:** Verify the initial bundle no longer includes code from routes the user hasn't visited.

3. **Configure Tree Shaking** — Set `"sideEffects": false` in `package.json` and verify all imports use named exports. Remove barrel files (`index.js` that re-export everything). **Checkpoint:** Run bundle analyzer to confirm unused exports are dropped.

4. **Lazy-Load Heavy Libraries** — Move charting, mapping, and rich text libraries behind dynamic `import()`. Show loading states while heavy modules download. **Checkpoint:** Confirm heavy libraries no longer appear in the initial bundle chunk.

5. **Replace Heavy Dependencies** — Audit existing dependencies for lighter alternatives (dayjs → date-fns, lodash → native array methods). **Checkpoint:** Verify replacement works identically with integration tests.

6. **Set CI Bundle Budgets** — Configure bundle size budgets in CI to fail PRs that exceed thresholds. Use tools like `@next/plugin-bundle-budgets` or custom webpack performance hints.

---

## Implementation Patterns

### Pattern 1: Route-Level Code Splitting with React.lazy (BAD vs. GOOD)

```tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// ❌ BAD: All routes bundled into a single chunk
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import Analytics from './pages/Analytics';
import Reports from './pages/Reports';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/reports" element={<Reports />} />
      </Routes>
    </BrowserRouter>
  );
}

// ✅ GOOD: Routes split into separate chunks, loaded on demand
import { lazy, Suspense } from 'react';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Settings = lazy(() => import('./pages/Settings'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Reports = lazy(() => import('./pages/Reports'));

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageSkeleton />}>
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/reports" element={<Reports />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
```

### Pattern 2: Granular Imports Instead of Barrel Imports

Barrel imports (`index.js` files that re-export everything) prevent tree shaking and force bundlers to include unused code.

```tsx
// ❌ BAD: Barrel import pulls in ALL date-fns functions (~300KB+)
import { format, formatDistance, parse, isValid } from 'date-fns';

// ✅ GOOD: Granular imports only bundle what's used (~5KB per function)
import format from 'date-fns/format';
import formatDistance from 'date-fns/formatDistance';
import parse from 'date-fns/parse';
import isValid from 'date-fns/isValid';
```

```tsx
// ❌ BAD: Barrel index.js exports everything (tree shaking can't remove unused)
// components/index.js -> export { Button } from './Button'; export { Modal } from './Modal'; ...
import { Button } from '../components';
// The entire barrel is included even if you only use Button

// ✅ GOOD: Direct imports let the bundler tree-shake unused exports
import { Button } from '../components/Button';
```

### Pattern 3: next/dynamic for Client-Only Heavy Components

In Next.js, use `next/dynamic` to lazy-load components that depend on browser APIs and should not be server-rendered.

```tsx
import dynamic from 'next/dynamic';

// ❌ BAD: Charting library bundled in initial server AND client JS
import SalesChart from '../components/SalesChart';

// ✅ GOOD: Chart loaded only on the client, when the user scrolls to it
const SalesChart = dynamic(
  () => import('../components/SalesChart'),
  {
    ssr: false,          // Don't SSR — chart uses browser APIs
    loading: () => <ChartSkeleton />,
  }
);

function DashboardPage() {
  return (
    <div>
      <h1>Dashboard</h1>
      {/* SalesChart loads lazily, not in initial bundle */}
      <SalesChart />
    </div>
  );
}
```

### Pattern 4: Bundle Analyzer Configuration

```js
// next.config.js
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Warn if any chunk exceeds 250KB
  webpack: (config) => {
    config.performance = {
      hints: 'warning',
      maxEntrypointSize: 250_000,
      maxAssetSize: 250_000,
    };
    return config;
  },
};

module.exports = withBundleAnalyzer(nextConfig);

// Run: ANALYZE=true next build
// Opens browser with interactive treemap of bundle contents
```

### Pattern 5: CI Bundle Size Budgets

```yml
# .github/workflows/bundle-size.yml
name: Bundle Size Check
on: [pull_request]

jobs:
  bundle-size:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run build
      - name: Check bundle size
        uses: arvida/check-bundle-size-action@v1
        with:
          # Fail PR if bundle exceeds threshold
          max-size: 300KB
          # Compare against base branch
          base: main
```

---

## Constraints

### MUST DO
- Apply route-level code splitting for every page or route in the application
- Audit bundle composition after adding any new dependency (run analyzer)
- Configure `"sideEffects": false` in `package.json` for tree shaking
- Use granular imports (`import X from 'lib/X'`) instead of barrel imports
- Set CI bundle size budgets that fail PRs exceeding thresholds
- Lazy-load heavy third-party components (charts, maps, editors) behind `React.lazy()` or `dynamic()`

### MUST NOT DO
- Import entire libraries when only a subset of functions is needed (e.g. `import { range } from 'lodash'`)
- Bundle large dependencies that could be loaded dynamically on interaction
- Ignore bundle size in CI/CD — always enforce budgets
- Use barrel `index.js` files that re-export from multiple modules
- Keep moment.js as a dependency — replace with date-fns or dayjs
- Load heavy visualization libraries on pages that don't display them

---

## Related Skills

| Skill | Purpose |
|---|---|
| `react-server-performance` | Server Components reduce client JS sent to the browser |
| `react-async-waterfalls` | Parallel data fetching complements bundle size improvements |
| `react-rerender-optimization` | Memoization prevents performance loss from heavy initial loads |

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [React.lazy and Suspense](https://react.dev/reference/react/lazy)
- [Next.js Dynamic Imports](https://nextjs.org/docs/pages/building-your-application/optimizing/lazy-loading)
- [Webpack Code Splitting Guide](https://webpack.js.org/guides/code-splitting/)
- [@next/bundle-analyzer](https://www.npmjs.com/package/@next/bundle-analyzer)
- [Webpack Bundle Analyzer](https://www.npmjs.com/package/webpack-bundle-analyzer)
- [Tree Shaking Documentation](https://webpack.js.org/guides/tree-shaking/)
- [Replace moment.js with date-fns](https://date-fns.org/docs/Getting-Started)
