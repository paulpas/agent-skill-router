---
name: react-native-monorepo-config
description: Configures React Native projects in monorepo environments using npm/yarn workspaces, Metro bundler, shared packages, and cross-platform module resolution.
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
  triggers: react native monorepo, metro config, yarn workspaces, shared packages, react native config, monorepo setup, cross-platform
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples, config]
  related-skills: react-native-state-management, react-native-rendering
  author: https://github.com/vercel-labs
  source: https://github.com/vercel-labs/agent-skills
---

# React Native Monorepo Configuration

A senior build engineer who configures React Native projects within monorepo workspaces — wiring Metro bundler to watch all packages, resolving modules across workspace boundaries, linking native modules, and sharing TypeScript/ESLint/Prettier configs across application and library packages.

## TL;DR Checklist

- [ ] Initialize with npm or yarn workspaces pointing to `apps/*` and `packages/*`
- [ ] Configure Metro's `watchFolders` to include all workspace package directories
- [ ] Set `nodeModulesPaths` / `moduleDirs` for cross-workspace module resolution
- [ ] Create `react-native.config.js` for native module linking across packages
- [ ] Add `.watchmanconfig` to the monorepo root for proper file watching
- [ ] Use BlockList in metro.config.js to exclude large generated directories (node_modules, build)
- [ ] Share TypeScript config via `extends` pattern across all packages
- [ ] Configure Jest with `projects` for per-package test configuration

---

## When to Use

Use this skill when:

- Setting up a new React Native app inside an existing monorepo with shared packages
- Migrating a standalone React Native app into a monorepo with npm/yarn workspaces
- Adding a shared UI component library that must work across iOS and Android
- Configuring Metro to resolve modules from sibling packages in a workspaces setup
- Debugging "module not found" errors in a React Native monorepo
- Standardizing TypeScript, ESLint, and Prettier across multiple React Native packages

---

## When NOT to Use

Avoid this skill for:

- Standalone React Native apps outside a monorepo — the default Metro config suffices
- Expo-managed workflows (bare workflow may still need this) — Expo's built-in monorepo support handles most cases
- Pure web monorepos without React Native — different bundling tools (webpack, Vite) are involved
- Prototyping where monorepo overhead is not yet justified

---

## Core Workflow

1. **Initialize Workspaces** — Create the monorepo root with workspace configuration:
   - Use `yarn workspaces` (more mature monorepo support) or `npm workspaces`
   - Structure packages as `apps/*` (applications) and `packages/*` (shared libraries)
   - Set `"private": true` at root with `"workspaces"` config
   **Checkpoint:** Run `yarn install` — verify packages link correctly in `node_modules`.

2. **Configure Metro** — The critical step for React Native monorepos:
   - Add all workspace package directories to `watchFolders`
   - Configure `nodeModulesPaths` to resolve modules across workspaces
   - Add BlockList patterns for `node_modules` outside workspace packages
   - Set `projectRoot` explicitly to avoid ambiguity
   **Checkpoint:** Run `npx react-native start` — Metro must bundle without "module not found" errors.

3. **Set Up Native Module Linking** — Bridge React Native packages across workspaces:
   - Create `react-native.config.js` in app packages to declare dependencies
   - Configure `dependency.platforms` for iOS (podspec path) and Android (gradle link)
   - Run `pod install` in the iOS directory to link native pods
   **Checkpoint:** Verify native modules (camera, maps, gestures) build on both platforms.

4. **Share Configuration** — Unify tooling across packages:
   - Create `packages/config/` with shared `tsconfig.json`, `.eslintrc.js`, `.prettierrc.js`
   - App and library packages extend these with `extends: '../../packages/config/tsconfig.json'`
   - Share Jest config with `jest.config.base.js` and per-package overrides
   **Checkpoint:** Run `tsc --noEmit` and `eslint .` from root — both must pass with shared configs.

5. **Configure File Watching** — Ensure monorepo file changes trigger Metro rebuilds:
   - Add `.watchmanconfig` with `{}` at the monorepo root
   - Ensure `watchman` is installed and version >= 2022.02.14.00
   - Add `watchFolders` to Metro config for all symlinked package directories
   **Checkpoint:** Make a change in a shared package and verify Metro triggers a rebuild.

---

## Implementation Patterns

### Pattern 1: Root Workspace Config

```json
// ❌ BAD: Missing private: true, no workspaces config, flat node_modules
{
  "name": "my-app",
  "version": "1.0.0"
}

// ✅ GOOD: Proper workspaces config with app and package directories
{
  "name": "my-monorepo",
  "version": "1.0.0",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "android": "yarn workspace @my/app android",
    "ios": "yarn workspace @my/app ios",
    "start": "yarn workspace @my/app start",
    "lint": "eslint . --ext .ts,.tsx",
    "typecheck": "tsc --noEmit --pretty",
    "test": "jest"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "eslint": "^8.57.0",
    "prettier": "^3.2.0",
    "jest": "^29.7.0"
  }
}
```

### Pattern 2: Metro Configuration for Monorepo

```javascript
// metro.config.js (at apps/my-app/)
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');

const workspaceRoot = path.resolve(__dirname, '../..');
const appRoot = __dirname;

/**
 * Metro configuration for React Native monorepo.
 *
 * watchFolders: tells Metro to monitor all workspace package directories.
 * nodeModulesPaths: resolves require('module') across workspace boundaries.
 * blockList: prevents Metro from crawling large extraneous directories.
 */
const config = {
  projectRoot: appRoot,
  watchFolders: [
    workspaceRoot,
    // Explicitly add shared package directories so Metro watches them
    path.resolve(workspaceRoot, 'packages/shared-ui'),
    path.resolve(workspaceRoot, 'packages/config'),
    path.resolve(workspaceRoot, 'packages/helpers'),
  ],
  resolver: {
    nodeModulesPaths: [
      // Resolve modules from the app's node_modules first, then hoisted root
      path.resolve(appRoot, 'node_modules'),
      path.resolve(workspaceRoot, 'node_modules'),
    ],
    // Prevent Metro from crawling every node_modules in every workspace
    blockList: [
      /.*\/node_modules\/.*\/node_modules\/.*/,
      /.*\/__pycache__\/.*/,
      /.*\/\.git\/.*/,
      /.*\/build\/.*/,
      /.*\/\.expo\/.*/,
    ],
    // Ensure sourceExts covers shared package file types
    sourceExts: ['js', 'jsx', 'ts', 'tsx', 'json', 'svg'],
  },
  transformer: {
    // Required for monorepo symlinks
    minifierConfig: {
      keep_classnames: true,
      keep_fnames: true,
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(appRoot), config);
```

### Pattern 3: Native Module Linking

```javascript
// ❌ BAD: No react-native.config.js — native modules in workspace packages won't link
// (metro cannot resolve native modules from symlinked packages without this config)

// ✅ GOOD: react-native.config.js at the app level declares workspace dependency linkage
// apps/my-app/react-native.config.js
module.exports = {
  project: {
    ios: {
      sourceDir: './ios',
    },
    android: {
      sourceDir: './android',
    },
  },
  dependencies: {
    // Map workspace packages to their native module locations
    '@my/shared-ui': {
      root: path.resolve(__dirname, '../../packages/shared-ui'),
      platforms: {
        ios: {
          podspecPath: path.resolve(
            __dirname,
            '../../packages/shared-ui/ios/SharedUI.podspec'
          ),
        },
        android: {
          sourceDir: path.resolve(
            __dirname,
            '../../packages/shared-ui/android'
          ),
        },
      },
    },
  },
};

// ✅ GOOD: Workspace package declares its native module in package.json
// packages/shared-ui/package.json
{
  "name": "@my/shared-ui",
  "version": "1.0.0",
  "main": "src/index.ts",
  "react-native": "src/index.ts",
  "peerDependencies": {
    "react": "^18.2.0",
    "react-native": "^0.73.0"
  },
  "publishConfig": {
    "access": "public"
  }
}
```

### Pattern 4: Shared TypeScript Config

```json
// ❌ BAD: Each package duplicates its own TypeScript config — drifts over time
// packages/shared-ui/tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "moduleResolution": "node",
    "jsx": "react-native",
    "target": "esnext"
  }
}
// apps/my-app/tsconfig.json — same thing copy-pasted
{
  "compilerOptions": {
    "strict": true,
    "moduleResolution": "node",
    "jsx": "react-native",
    "target": "esnext"
  }
}

// ✅ GOOD: Single shared config with per-package overrides
// packages/config/tsconfig.base.json
{
  "compilerOptions": {
    "target": "esnext",
    "module": "esnext",
    "moduleResolution": "node",
    "strict": true,
    "jsx": "react-native",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "baseUrl": ".",
    "paths": {
      "@my/*": ["packages/*/src"]
    }
  },
  "exclude": ["node_modules", "build", "dist"]
}

// packages/shared-ui/tsconfig.json — extends the base
{
  "extends": "../../packages/config/tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"]
}

// apps/my-app/tsconfig.json — extends the same base
{
  "extends": "../../packages/config/tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"]
}
```

### Pattern 5: Shared ESLint + Prettier Config

```javascript
// packages/config/.eslintrc.js
module.exports = {
  root: true,
  extends: [
    '@react-native',
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier',
  ],
  plugins: ['@typescript-eslint', 'react', 'react-hooks'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaFeatures: { jsx: true },
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  rules: {
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'react-native/no-inline-styles': 'error',
  },
  ignorePatterns: ['node_modules', 'build', 'dist', '.expo'],
};

// .eslintrc.js at the monorepo root — just points to shared config
module.exports = {
  root: true,
  extends: ['./packages/config/.eslintrc.js'],
};

// packages/config/.prettierrc.js
module.exports = {
  semi: true,
  trailingComma: 'all',
  singleQuote: true,
  printWidth: 100,
  tabWidth: 2,
  bracketSpacing: true,
  arrowParens: 'always',
};

// .prettierrc.js at root — delegates to shared config
module.exports = {
  ...require('./packages/config/.prettierrc.js'),
};
```

---

## Constraints

### MUST DO
- Configure Metro's `watchFolders` to include all workspace package directories
- Set `nodeModulesPaths` to resolve modules across workspace boundaries
- Create `react-native.config.js` in each app package for native module linking
- Add `.watchmanconfig` at the monorepo root for reliable file change detection
- Share TypeScript, ESLint, and Prettier configs via a central `packages/config` package
- Use the `extends` pattern in tsconfig.json to share compilation options
- Configure Jest with `projects` or a root config that covers all workspace packages

### MUST NOT DO
- Use hoisting settings that break native module resolution — prefer `nohoist` for react-native packages
- Forget to add all workspace package paths to Metro's `watchFolders`
- Ignore "module not found" errors in CI — they hide broken workspace resolution
- Duplicate TypeScript/ESLint/Prettier configs across packages — they will drift
- Use npm workspaces without verifying Metro compatibility (yarn workspaces has more mature RN support)
- Ignore the `blockList` in Metro config — crawling every nested node_modules causes OOM crashes

---

## Related Skills

| Skill | Purpose |
|---|---|
| `react-native-state-management` | State management library shared across monorepo packages |
| `react-native-rendering` | Rendering optimizations shared between app and component library packages |

---

## Live References

> Authoritative documentation links for React Native monorepo configuration.

- [React Native Monorepo Documentation](https://reactnative.dev/docs/monorepo) — Official monorepo guide
- [Metro Bundler Config](https://metrobundler.dev/docs/configuration/) — Full Metro configuration reference
- [Yarn Workspaces Docs](https://classic.yarnpkg.com/lang/en/docs/workspaces/) — Workspace management with Yarn
- [npm Workspaces Docs](https://docs.npmjs.com/cli/v10/using-npm/workspaces) — Workspace management with npm
- [react-native.config.js Reference](https://github.com/react-native-community/cli/blob/main/docs/configuration.md) — Native module linking configuration
- [Watchman Configuration](https://facebook.github.io/watchman/docs/config) — File watching for monorepos
- [TypeScript Project References](https://www.typescriptlang.org/docs/handbook/project-references.html) — Scaling TypeScript across packages
- [Shopify React Native Monorepo Guide](https://shopify.engineering/building-react-native-monorepo) — Industry best practices for RN monorepos
