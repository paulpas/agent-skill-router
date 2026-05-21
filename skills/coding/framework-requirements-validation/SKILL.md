---
name: framework-requirements-validation
description: Validates code against framework conventions (React Hooks rules, Next.js App Router patterns, Django checks) and enforces build tool configuration compliance through automated linting pipelines and CI integration.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: framework validation, eslint plugin react hooks, next.js linting rules, django check command, framework compliance, build tool config validation, biome linting, vite config check, tsconfig patterns, code conventions checker
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, examples, do-dont]
  related-skills: framework-utilization, framework-requirements, code-validation, build-test-validation
---

# Framework Requirements Validation

Validates that application code conforms to framework-specific conventions and that build tool configurations are correct. This skill combines runtime schema validation of configuration files with automated linting pipelines that enforce ecosystem rules — React Hooks exhaustive-deps, Next.js App Router patterns, Django deployment checks, and modern toolchain compliance via Biome and ESLint.

## TL;DR Checklist

- [ ] Configure framework-specific ESLint plugins (e.g., `eslint-plugin-react-hooks`, `@next/eslint-plugin-next`) with convention rules at `error` level
- [ ] Validate build tool configs programmatically using Zod schemas — never rely on visual inspection alone
- [ ] Set up a CI pipeline stage that runs `biome check --write`, `eslint .`, and `tsc --noEmit` sequentially before merge
- [ ] Audit the codebase by running framework-native check commands (`python manage.py check --deploy`, Next.js `next lint`)
- [ ] Generate a compliance report with violation counts per category (critical/warning/info) and track trends across PRs

---

## When to Use

Use this skill when:

- Reviewing code for framework convention violations before merge — catching stale closures, missing hooks rules, or incorrect App Router patterns early
- Setting up CI/CD pipelines that enforce framework-specific linting rules across all contributing developers
- Migrating between major framework versions (React 18→19, Next.js 13→14, Django 4→5) and need to validate compliance with new patterns like React Server Components or Django's async views
- Auditing an existing codebase for adherence to framework best practices — producing a structured report of violations by severity
- Configuring build tool settings (Vite, tsconfig, Next.js) and wanting automated schema validation rather than manual review

---

## When NOT to Use

Avoid this skill for:

- **Writing framework-specific tutorials or getting started guides** — use `framework-utilization` instead; this skill is for validation, not teaching
- **Scaffolding a new project from scratch** — use `framework-requirements` instead; scaffolding creates the initial configuration, this skill validates existing configuration
- **General input/output data validation for security** — use `input-validation` or `data-validation-patterns` instead; this skill covers framework conventions and build tool configs, not payload sanitization

---

## Core Workflow

1. **Inventory Framework Dependencies** — List all framework packages in package.json, pyproject.toml, or Cargo.toml along with their exact versions. Map each dependency to its ecosystem layer (frontend rendering, backend routing, full-stack meta-framework). Checkpoint: Every framework dependency has a matching convention-check tool available — if you use React 19 without `eslint-plugin-react-hooks`, flag the gap immediately.

2. **Configure Framework-Specific Linting Rules** — Install and enable lint plugins for each framework in use. For React applications, configure `eslint-plugin-react-hooks` with strict exhaustive-deps checking. For Next.js projects, add `@next/eslint-plugin-next` and enable all App Router rules. For Django projects, execute `python manage.py check --deploy` to run the framework's built-in security checklist. Checkpoint: Run the linter against the entire codebase — every configured rule must fire at least once on a real violation to prove it is wired correctly.

3. **Validate Build Tool Configuration Files** — Programmatically validate vite.config.ts, next.config.js, and tsconfig.json against expected patterns using schema validation libraries like Zod. Verify tsconfig splitting follows the recommended pattern (root `tsconfig.json` + `tsconfig.app.json` + `tsconfig.node.json`). Confirm Next.js middleware is correctly declared in `middleware.matchers`. Checkpoint: Each configuration file must pass its own type-checking (`tsc --noEmit`) and the framework's built-in validation command (`vite build --dry-run`, `next lint`).

4. **Build CI/CD Compliance Pipeline** — Create a pipeline stage that executes all framework convention checks sequentially before any merge occurs. Use Biome for fast lint-and-format operations, ESLint plugins for framework-specific rule enforcement. Configure the build to fail on any critical violation with error messages that include the exact file path, line number, and the rule name developers need to fix. Checkpoint: The CI pipeline runs `biome check --write`, then `eslint .`, then `tsc --noEmit` in sequence — all three must succeed for the build to pass.

5. **Audit and Report** — Generate a structured compliance report that summarizes enabled rules, violations categorized by severity (critical/warning/info), configuration gaps detected across all tools, and trend data comparing PR-to-PR regression counts. Link every critical violation to its corresponding documentation URL or issue tracker ticket. Checkpoint: Every critical violation has an associated Jira/GitHub issue or inline PR comment that references the exact rule name and framework documentation.

---

## Implementation Patterns / Reference Guide

### Pattern 1: React Hooks Exhaustive-Dependencies Rule Configuration

The `react-hooks/exhaustive-deps` ESLint rule is the single most impactful convention enforcer for React applications. It catches stale closures in `useEffect`, `useMemo`, and `useCallback` by ensuring every value referenced inside a hook callback is declared as a dependency.

**✅ GOOD — Strict configuration with additional hooks:**

```javascript
// .eslintrc.js — Framework convention linting for React Hooks
module.exports = {
  extends: [
    'eslint:recommended',
    'plugin:react-hooks/recommended',
  ],
  plugins: ['react-hooks'],
  rules: {
    // Strict exhaustive-deps rule — catches missing dependencies in useMemo/useEffect/useCallback
    'react-hooks/exhaustive-deps': [
      'error',
      {
        // Include third-party animation hooks that internally call useEffect
        additionalHooks: '(useAnimatedStyle|useDerivedValue|useRecoilCallback)',
      },
    ],
    // Warn on potential stale closures in event handlers
    'react-hooks/extra-strict-mode': 'warn',
  },
};
```

```tsx
// src/components/UserData.tsx — How the rule enforces correctness

import { useEffect, useMemo, useState } from 'react';

interface User {
  id: string;
  name: string;
  lastSeen: Date;
}

interface Props {
  userId: string;
  refreshRateMs: number;
}

export function UserData({ userId, refreshRateMs }: Props) {
  const [user, setUser] = useState<User | null>(null);

  // ✅ GOOD — All referenced values are in the dependency array.
  useEffect(() => {
    fetch(`/api/users/${userId}`)
      .then((res) => res.json())
      .then(setUser);
  }, [userId]); // ESLint rule enforces this is required

  const displayName = useMemo(() => {
    if (!user) return 'Loading...';
    return `${user.name} (last seen: ${user.lastSeen.toLocaleDateString()})`;
  }, [user]); // ESLint rule enforces user is required

  // ❌ BAD — Missing dependency would cause stale data. The linter rejects this.
  useEffect(() => {
    const interval = setInterval(() => {
      fetch(`/api/users/${userId}`)
        .then((res) => res.json())
        .then(setUser);
    }, refreshRateMs); // ❌ eslint-plugin-react-hooks: "The 'refreshRateMs' is not in the deps"

    return () => clearInterval(interval);
  }, [userId]); // Missing refreshRateMs — linter catches this

  return <div>{displayName}</div>;
}
```

### Pattern 2: Build Tool Configuration Validation with Zod

Runtime schema validation of build tool configurations catches misconfigurations early — during development and CI — rather than at runtime when the bundle fails silently or behaves differently across environments.

```typescript
// config/validation/vite-config.validator.ts — Runtime validation of vite.config.ts
import { z } from 'zod';

interface ValidationResult {
  valid: boolean;
  errors: ValidationErr[];
  warnings: ValidationWarning[];
}

interface ValidationErr {
  path: string;
  message: string;
  severity: 'critical';
}

interface ValidationWarning {
  path: string;
  message: string;
  severity: 'warning';
}

const ViteConfigSchema = z.object({
  base: z.string().optional().default('/'),
  build: z.object({
    outDir: z.string().regex(/^dist$/),
    sourcemap: z.boolean().optional(),
    minify: z.union([z.literal(true), z.literal(false), z.string()]).optional(),
    rollupOptions: z.object({
      input: z.string().or(z.array(z.string())).optional(),
      output: z.object({
        format: z.enum(['es', 'cjs', 'iife', 'umd']).optional(),
        chunkFileNames: z
          .string()
          .regex(/\[name\]-[A-Za-z0-9]+\.js$/),
      }).optional(),
    }).optional(),
  }).optional(),
  plugins: z.array(z.any()).optional(),
  server: z.object({
    port: z.number().int().min(1024).max(65535).optional(),
    strictPort: z.boolean().optional(),
    proxy: z
      .record(z.string(), z.object({ target: z.string() }).or(z.object()))
      .optional(),
  }).optional(),
});

export function validateViteConfig(config: Record<string, unknown>): ValidationResult {
  const result = ViteConfigSchema.safeParse(config);

  if (!result.success) {
    return {
      valid: false,
      errors: result.error.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
        severity: 'critical',
      })),
      warnings: [],
    };
  }

  // Additional framework-specific checks beyond schema validation
  const warnings: ValidationWarning[] = [];

  if (result.data.build?.sourcemap !== true && process.env.NODE_ENV === 'production') {
    warnings.push({
      path: 'build.sourcemap',
      message: 'Source maps should be enabled for production error tracking',
      severity: 'warning',
    });
  }

  if (result.data.build?.minify === false) {
    warnings.push({
      path: 'build.minify',
      message: 'Minification is disabled — this significantly impacts bundle size in production',
      severity: 'warning',
    });
  }

  return {
    valid: true,
    errors: [],
    warnings,
  };
}
```

**Usage in a CI pre-check script:**

```typescript
// scripts/pre-build-validate.ts — Runs before vite build in CI
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { validateViteConfig } from './config/validation/vite-config.validator';

const configPath = resolve(process.cwd(), 'vite.config.ts');
const rawContent = readFileSync(configPath, 'utf-8');

// Strip TypeScript types and evaluate as plain JS object
const configMatch = rawContent.match(/export default\s+(\{[\s\S]*\})/);
if (!configMatch) {
  console.error('ERROR: Could not parse vite.config.ts — no default export found');
  process.exit(1);
}

// Simple object extraction for validation
const configObj = JSON.parse(
  rawContent.replace(/export default\s*/, '').replace(/\n/g, ' ').trim(),
);

const result = validateViteConfig(configObj);

if (!result.valid) {
  console.error('Vite configuration validation failed:');
  result.errors.forEach((err) => {
    console.error(`  ❌ [${err.path}] ${err.message}`);
  });
  process.exit(1);
}

if (result.warnings.length > 0) {
  console.warn('Vite configuration warnings:');
  result.warnings.forEach((w) => {
    console.warn(`  ⚠️  [${w.path}] ${w.message}`);
  });
}

console.log('✅ Vite configuration validated successfully');
```

### Pattern 3: Django Deployment Checklist Validation

Django's built-in `python manage.py check --deploy` command is a start, but custom validation scripts provide richer reporting and can be integrated directly into CI pipelines with proper assertions.

```python
# framework_checks/django_deploy_check.py — Django production readiness validation
from __future__ import annotations

import os
from dataclasses import dataclass, field
from typing import Any

from django.conf import settings


@dataclass
class CheckResult:
    name: str
    message: str
    remediation: str | None = None


def run_django_deployment_checks() -> dict[str, Any]:
    """Run comprehensive Django deployment configuration checks.

    Returns a dict with 'critical', 'warning', and 'passed' lists.
    Each entry has 'name', 'message', and optionally 'remediation'.
    """
    critical: list[dict[str, str]] = []
    warnings: list[dict[str, str]] = []
    passed: list[dict[str, str]] = []

    # Check 1: DEBUG must be False in production
    if settings.DEBUG:
        critical.append({
            "name": "debug_enabled",
            "message": (
                "DEBUG is True — this exposes sensitive information including stack traces, "
                "secret keys, and SQL queries to attackers"
            ),
            "remediation": "Set DEBUG=False and configure ALLOWED_HOSTS explicitly",
        })
    else:
        passed.append({"name": "debug_disabled", "message": "DEBUG is False"})

    # Check 2: ALLOWED_HOSTS must be populated in production
    allowed_hosts = getattr(settings, 'ALLOWED_HOSTS', None)
    if not allowed_hosts or len(allowed_hosts) == 0:
        critical.append({
            "name": "allowed_hosts_missing",
            "message": (
                "ALLOWED_HOSTS is empty — Django will reject all HTTP requests with "
                "DisallowedHost errors"
            ),
            "remediation": "Set ALLOWED_HOSTS = ['yourdomain.com', '*.yourdomain.com']",
        })
    else:
        passed.append({
            "name": "allowed_hosts_configured",
            "message": f"ALLOWED_HOSTS has {len(allowed_hosts)} entries",
        })

    # Check 3: SECRET_KEY must not be a simple hardcoded value
    secret_key = getattr(settings, 'SECRET_KEY', '')
    if isinstance(secret_key, str) and len(secret_key) < 50:
        warnings.append({
            "name": "weak_secret_key",
            "message": (
                "SECRET_KEY is short (<50 chars) — this may indicate a hardcoded value that "
                "does not meet security requirements for production"
            ),
            "remediation": "Store SECRET_KEY in an environment variable or secrets manager",
        })
    else:
        passed.append({"name": "secret_key_adequate", "message": "SECRET_KEY meets minimum security standards"})

    # Check 4: Security middleware settings
    security_checks = {
        'SESSION_COOKIE_SECURE': 'Set SESSION_COOKIE_SECURE=True for HTTPS-only cookies',
        'CSRF_COOKIE_SECURE': (
            'Set CSRF_COOKIE_SECURE=True to prevent XSS-based CSRF attacks on cookie theft'
        ),
        'SECURE_SSL_REDIRECT': 'Set SECURE_SSL_REDIRECT=True for production deployments behind a proxy',
        'SECURE_HSTS_SECONDS': (
            'Set SECURE_HSTS_SECONDS=31536000 for HTTP Strict Transport Security enforcement'
        ),
    }

    for attr, msg in security_checks.items():
        if getattr(settings, attr, False):
            passed.append({"name": attr.lower(), "message": f"{attr} is enabled"})
        else:
            warnings.append({"name": attr.lower(), "message": msg})

    # Check 5: Static file serving — must not use WhiteNoise without configuration
    if 'django.contrib.staticfiles' in settings.INSTALLED_APPS and not getattr(
        settings, 'WHITENOISE_ROOT', None
    ):
        warnings.append({
            "name": "whitenoise_root_missing",
            "message": (
                "STATIC_ROOT is not configured — WhiteNoise may serve stale files in production"
            ),
            "remediation": "Set STATIC_ROOT to an absolute path and run 'python manage.py collectstatic'",
        })

    return {
        "critical": critical,
        "warnings": warnings,
        "passed": passed,
        "summary": {
            "total_checks": len(critical) + len(warnings) + len(passed),
            "critical_issues": len(critical),
            "warnings_count": len(warnings),
            "passed": len(passed),
        },
    }


# Integration with pytest for CI/CD pipelines
def test_django_production_configuration() -> None:
    """Run Django deployment checks and fail the build on any critical issues.

    This test should be included in CI pipeline runs against production-like settings.
    """
    results = run_django_deployment_checks()

    if results["critical"]:
        critical_messages = "; ".join(r["message"] for r in results["critical"])
        raise AssertionError(
            f"Critical production configuration issues found: {critical_messages}"
        )

    for warning in results["warnings"]:
        remediation = f" ({warning['remediation']})" if warning.get('remediation') else ""
        print(f"Warning: {warning['message']}{remediation}")

    assert not results["critical"], (
        f"Critical issues: {len(results['critical'])} | Warnings: {len(results['warnings'])} "
        "| Passed: {results['summary']['passed']}"
    )
```

### Pattern 4: Next.js App Router Convention Checks

Next.js enforces strict conventions for the App Router — server components by default, specific directory structure, and middleware placement. The `@next/eslint-plugin-next` catches violations automatically.

```javascript
// .eslintrc.js — Next.js App Router convention enforcement
module.exports = {
  extends: [
    'next/core-web-vitals',
    // @next/eslint-plugin-next includes:
    // - rules-of-hooks (React hooks in server components)
    // - component-has-await (server actions must be async or marked sync)
    // - no-async-client-component (client components cannot be top-level async)
    'plugin:@next/next/recommended',
  ],
  plugins: ['@next/next'],
  rules: {
    // Server components cannot contain async default exports — catches typos in RSC setup
    '@next/next/no-async-client-component': 'error',

    // Middleware must be in the correct location and match patterns
    // This is enforced by next lint + manual path check
    'no-restricted-imports': [
      'error',
      {
        paths: [
          {
            name: '@/middleware',
            message: (
              'Middleware should live at src/middleware.ts, not as an imported module. '
              'Next.js automatically discovers it.'
            ),
          },
        ],
      },
    ],
  },
};
```

**Good vs Bad — Next.js Middleware Configuration:**

```typescript
// ✅ GOOD — middleware.matchers correctly targets API and page routes
// src/middleware.ts
import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('auth_token');

  if (!token && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

// Must be explicitly declared — Next.js does not auto-discover custom matcher patterns
export const config = {
  // Match all page routes but exclude static assets and API health checks
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
```

```typescript
// ❌ BAD — Missing matcher means middleware runs on every single route including static files
// src/middleware.ts (wrong)
export function middleware(request: NextRequest) {
  // This runs on EVERY request — degrading performance dramatically
  const token = request.cookies.get('auth_token');
  return token ? NextResponse.next() : NextResponse.redirect('/login');
}

// ❌ NO config.matcher defined — Next.js runs this on every file, including .css, .jpg, etc.
```

---

## Constraints

### MUST DO

- Run framework convention checks at PR time, not just at merge — catch violations early when they are cheapest to fix and developers have fresh context
- Configure linter rules at `error` level for critical conventions (React Hooks exhaustive-deps, Next.js no-async-client-component) and `warn` only for style preferences that do not affect correctness
- Include the specific ESLint plugin name or tool identifier in CI pipeline error output so developers know exactly which rule to fix — e.g., `react-hooks/exhaustive-deps` not just "eslint error"
- Validate build tool configuration files programmatically using schema validation with Zod (TypeScript) or pydantic (Python), never relying on manual visual inspection of config files
- Use the framework's own linting tools and native check commands as the primary validation mechanism — `python manage.py check --deploy` for Django, `next lint` for Next.js, `eslint-plugin-react-hooks` for React

### MUST NOT DO

- Add framework-specific lint rules at `'off'` or `'warn'` level when they represent hard framework conventions. React Hooks exhaustive-deps must be `'error'`, not `'warn'`
- Skip build tool configuration validation because "it works locally" — environment differences (Node versions, OS paths, CI vs local) cause configuration drift that only automated checks catch
- Use raw string matching or regex-based grep to detect convention violations. Always use the framework's official linting tools and APIs — they understand the AST and handle edge cases correctly
- Add more than 3 framework-specific ESLint plugins to a single project without justification. Each plugin adds approximately 50ms to lint time, which compounds across large codebases and degrades CI throughput

---

## Output Template

When this skill is active, produce:

1. **Framework Inventory** — List of frameworks detected in the project (package.json / pyproject.toml), their exact versions, and whether each has a corresponding convention-check tool available
2. **Rules Configuration Summary** — Which lint rules are enabled at error/warn/off level per framework, with the rule name and its severity classification (critical / warning / info)
3. **Configuration Validation Report** — Results from build tool configuration checks (vite.config.ts, tsconfig.json, next.config.mjs) with a clear pass/fail for each validated field and any schema violations listed by path
4. **Violation Breakdown** — Count of all violations by severity category (critical / warning / info), the top 3 most frequently violated rules with their counts, and the files containing the highest violation density
5. **CI Pipeline Snippet** — Ready-to-use CI pipeline configuration (GitHub Actions YAML, GitLab CI YAML, or CircleCI config) tailored to the frameworks in use, including the exact commands (`biome check --write`, `eslint .`, `tsc --noEmit`) and failure thresholds

---

## Related Skills

| Skill | Purpose |
|---|---|
| `framework-utilization` | Learning and adopting frameworks effectively — comes before validation; use this skill to understand patterns, then validate with this skill after adoption |
| `framework-requirements` | Project scaffolding and setup — creates the initial configuration structure that this skill validates against conventions |
| `code-validation` | General code quality validation across any language or framework — broader scope without framework-specific rules |
| `build-test-validation` | Build and test pipeline setup and optimization — complementary to framework compliance checks for end-to-end CI pipelines |

---

## Live References

- [React Hooks Exhaustive-Deps Rule](https://react.dev/reference/rules/rules-of-hooks#enforcing-it-with-an-eslint-plugin)
- [ESLint React Hooks Plugin Documentation](https://www.npmjs.com/package/eslint-plugin-react-hooks)
- [Vite Configuration Reference](https://vitejs.dev/config/)
- [TypeScript tsconfig.json Options](https://www.typescriptlang.org/tsconfig/)
- [Django Deployment Checklist](https://docs.djangoproject.com/en/5.2/howto/deployment/checklist/)
