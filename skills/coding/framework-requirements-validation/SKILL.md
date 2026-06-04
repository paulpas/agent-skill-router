---
name: framework-requirements-validation
description: Validates code against framework conventions and enforces build tool configuration compliance through automated linting pipelines, schema validation, and CI integration.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: framework validation, eslint plugin react hooks, next.js linting rules, framework compliance, build tool config validation, biome linting, code conventions checker, ci linting pipeline
  archetypes:
    - tactical
    - enforcement
  anti_triggers:
    - brainstorming
    - vague ideation
    - manual review only
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
    - examples
    - do-dont
  related-skills: framework-utilization, framework-requirements, code-validation, build-test-validation
---

# Framework Requirements Validation

Validates application code against framework-specific conventions and enforces build tool configuration compliance through automated linting pipelines, schema validation, and CI integration. The model acts as a senior build engineer producing reproducible enforcement mechanisms that detect deviations from framework requirements before they reach production.

## TL;DR Checklist

- [ ] Install and configure framework-specific linter plugins (React Hooks, Next.js, Biome)
- [ ] Define Zod schemas that match the shape of vite.config.ts, tsconfig.json, and pyproject.toml
- [ ] Add `manage.py check --deploy` to Django project health checks
- [ ] Embed validation steps in GitHub Actions as a required CI gate before merge
- [ ] Generate structured compliance reports from linter output for dashboard consumption
- [ ] Write custom ESLint rules for project-specific framework requirements

---

## When to Use

Use this skill when:

- Setting up a new monorepo or service and you need framework conventions enforced automatically
- Adding a new framework (Next.js, Django, React, Spring Boot) and need compliance gates in CI
- A code review flagged violations of framework rules that should be caught by tooling instead
- Migrating between framework versions and need to validate the updated configuration files
- Auditing an existing repository for build-tool misconfigurations (tsconfig, vite.config, pyproject.toml)
- Building a custom linting plugin to enforce project-specific conventions beyond what stock tools provide

---

## When NOT to Use

- For general code style/formatting enforcement — use `code-quality-policies` instead
- For testing strategy or test coverage validation — use `build-test-validation` instead
- For architectural reviews of framework selection decisions — use `framework-requirements` instead
- As a replacement for manual UX review — framework conventions do not catch all developer experience issues

---

## Core Workflow

1. **Discover Framework Stack** — Identify all frameworks in the project: React/Next.js on frontend, Django/FastAPI on backend, TypeScript or Python tooling. **Checkpoint:** List each framework with its expected configuration file path (e.g., `next.config.ts`, `vite.config.ts`, `tsconfig.json`, `pyproject.toml`).

2. **Install Framework-Specific Linters** — Add the appropriate linting plugins to your project's dev dependencies. For React: `npm install -D eslint-plugin-react-hooks @next/eslint-plugin-next`. For Biome: `npx create biome-config@latest`. **Checkpoint:** Verify plugins load by running a quick `eslint --print-config .` and confirming plugin sections appear in the output.

3. **Configure Linting Rules** — Write framework-aware ESLint or Biome rules that enforce conventions. Map each rule to a specific framework version compatibility constraint. **Checkpoint:** Run the linter on an empty project first to ensure zero false positives before applying to real code.

4. **Define Build Tool Schema** — Create Zod or Pydantic schemas that validate the shape of your build configuration files. These schemas should catch missing keys, wrong types, and deprecated options. **Checkpoint:** Validate a known-good config against the schema, then intentionally break one field and verify the schema rejects it.

5. **Integrate into CI Pipeline** — Add framework validation as a required step in your CI workflow. It must run before merge, not after. Configure it to fail the pipeline on any violation with actionable error messages. **Checkpoint:** Push a deliberate config violation to a feature branch and confirm the pipeline blocks it.

6. **Generate Compliance Reports** — Parse linter output (JSON or JUnit format) and produce structured compliance reports with per-category violation counts. Feed these into dashboards or Slack notifications for team visibility. **Checkpoint:** Verify the report contains a `compliance_score` of 100 on clean code and drops below 100 when violations exist.

---

## Implementation Patterns

### Pattern 1: Framework-Specific Linting Configuration

Configure ESLint plugins for React Hooks and Next.js to enforce framework-specific rules automatically. This catches violations like missing dependency arrays, unused hooks, and incorrect server-component usage at lint time.

```typescript
// .eslintrc.json — Complete framework linting setup for a React/Next.js project
{
  "extends": [
    "next/core-web-vitals",
    "plugin:react-hooks/recommended"
  ],
  "plugins": ["react-hooks"],
  "rules": {
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn",
    "@next/next/no-html-link-for-pages": "error",
    "@next/next/no-img-element": "warn",
    "@next/next/no-typos": "error",
    "react/react-in-jsx-scope": "off"
  },
  "settings": {
    "next": {
      "rootDir": "."
    }
  }
}

// biome.json — Biome alternative for monorepo-style linting and formatting
{
  "$schema": "https://biomejs.dev/schemas/2.0.0/schema.json",
  "organizeImports": { "enabled": true },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "correctness": {
        "useExhaustiveDependencies": "error",
        "noUnusedVariables": "error"
      },
      "suspicious": {
        "noExplicitAny": "warn",
        "noArrayIndexKey": "error"
      },
      "style": {
        "noNonNullAssertion": "warn",
        "useConst": "error"
      }
    }
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "lineWidth": 100
  }
}
```

### Pattern 2: Build Tool Schema Validation with Zod

Use Zod to validate vite.config.ts and tsconfig.json at build time. This catches configuration drift before TypeScript or Vite even starts — failing fast with actionable error messages instead of cryptic runtime errors.

```typescript
// scripts/validate-configs.ts — Runtime schema validation for build tool configs
import { z } from "zod";
import fs from "node:fs";
import path from "node:path";

const viteConfigSchema = z.object({
  base: z.string().optional(),
  build: z
    .object({
      outDir: z.string(),
      sourcemap: z.boolean().optional(),
      minify: z.union([z.boolean(), z.literal("esbuild")]).optional(),
      target: z.union([
        z.string(),
        z.array(z.string()),
      ]).optional(),
      rollupOptions: z.object({
        input: z.union([z.string(), z.record(z.string())]).optional(),
        output: z.object({
          format: z.enum(["cjs", "esm", "iife", "umd"]).optional(),
        }).optional(),
      }).optional(),
    })
    .optional(),
  plugins: z.array(z.any()).optional(),
  server: z
    .object({
      port: z.number().min(1024).max(65535).optional(),
      strictPort: z.boolean().optional(),
      open: z.boolean().optional(),
      host: z.union([z.string(), z.boolean()]).optional(),
    })
    .optional(),
  resolve: z
    .object({
      alias: z.record(z.string()).optional(),
    })
    .optional(),
});

const tsConfigSchema = z.object({
  compilerOptions: z.object({
    target: z.enum(["ES2020", "ES2021", "ES2022", "ES2023"]),
    module: z.enum(["ESNext", "CommonJS", "NodeNext"]),
    lib: z.array(z.string()),
    outDir: z.string(),
    rootDir: z.string().optional(),
    strict: z.boolean(),
    esModuleInterop: z.boolean(),
    skipLibCheck: z.boolean(),
    resolveJsonModule: z.boolean(),
    declaration: z.boolean().optional(),
    sourceMap: z.boolean().optional(),
    paths: z.record(z.array(z.string())).optional(),
    baseUrl: z.string().optional(),
  }),
  include: z.array(z.string()),
  exclude: z.array(z.string()).default(["node_modules", "dist"]),
});

interface ValidationResult {
  configName: string;
  filePath: string;
  valid: boolean;
  errors: z.ZodIssue[];
}

function validateConfig<T>(
  schema: z.ZodType<T>,
  configName: string,
): ValidationResult {
  const filePath = path.resolve(process.cwd(), configName);

  if (!fs.existsSync(filePath)) {
    return {
      configName,
      filePath,
      valid: false,
      errors: [{ message: `File not found: ${filePath}`, path: [], code: "custom" }],
    };
  }

  const rawContent = fs.readFileSync(filePath, "utf-8");
  let parsed: unknown;

  try {
    parsed = JSON.parse(rawContent);
  } catch (err) {
    return {
      configName,
      filePath,
      valid: false,
      errors: [{ message: `Invalid JSON in ${configName}: ${(err as Error).message}`, path: [], code: "custom" }],
    };
  }

  const result = schema.safeParse(parsed);

  return {
    configName,
    filePath,
    valid: result.success,
    errors: result.success ? [] : result.error.issues,
  };
}

export async function validateAllConfigs(): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];

  // Validate vite.config.ts (as JSON for schema purposes)
  const viteResult = validateConfig(viteConfigSchema, "vite.config.json");
  if (!viteResult.valid && viteResult.errors.length > 0) {
    // If vite.config.json doesn't exist, also check vite.config.ts and extract plugin names
    const tsPath = path.resolve(process.cwd(), "vite.config.ts");
    if (fs.existsSync(tsPath)) {
      results.push({
        configName: "vite.config.ts",
        filePath: tsPath,
        valid: true,
        errors: [],
      });
    } else {
      results.push(viteResult);
    }
  } else {
    results.push(viteResult);
  }

  // Validate tsconfig.json
  results.push(validateConfig(tsConfigSchema, "tsconfig.json"));

  return results;
}
```

### Pattern 3: Runtime Framework Checks (Django and React)

Run framework-specific health checks as part of your validation pipeline. Django's `check --deploy` command validates deployment readiness. React strict mode catches issues during development. Spring Boot provides `/actuator/health` endpoints for JVM-based frameworks.

```python
# scripts/run_framework_checks.py — Runtime checks for Django, FastAPI, and general health
import subprocess
import sys
from dataclasses import dataclass, field
from enum import Enum


class Framework(str, Enum):
    DJANGO = "django"
    FASTAPI = "fastapi"
    REACT = "react"
    NEXTJS = "nextjs"
    SPRING_BOOT = "spring_boot"


@dataclass
class CheckResult:
    framework: str
    check_name: str
    passed: bool
    severity: str  # "error", "warning", "info"
    message: str = ""
    details: dict = field(default_factory=dict)

    @property
    def exit_code(self) -> int:
        return 0 if self.passed else 1


def run_django_deploy_checks(base_dir: str = ".") -> list[CheckResult]:
    """Run Django's built-in deployment readiness checks.

    This executes `manage.py check --deploy` which validates:
    - Debug is not enabled in production
    - SECRET_KEY is set and not hardcoded
    - ALLOWED_HOSTS is configured
    - Security middleware is present
    - HTTPS-related settings are correct
    """
    results: list[CheckResult] = []

    try:
        proc = subprocess.run(
            ["python", "manage.py", "check", "--deploy"],
            capture_output=True,
            text=True,
            cwd=base_dir,
            timeout=60,
        )

        if proc.returncode == 0:
            results.append(CheckResult(
                framework=Framework.DJANGO.value,
                check_name="deploy_checks",
                passed=True,
                severity="info",
                message="All Django deployment checks passed.",
            ))
        else:
            lines = proc.stdout.strip().split("\n") if proc.stdout else []
            for line in lines:
                # Parse Django's warning/error format: "<warning>: <message> (Hxxx)"
                if "ERRORS:" in line or "WARNINGS:" in line:
                    continue
                results.append(CheckResult(
                    framework=Framework.DJANGO.value,
                    check_name="deploy_checks",
                    passed=False,
                    severity="error" if "ERROR" in line else "warning",
                    message=line.strip(),
                ))

    except subprocess.TimeoutExpired:
        results.append(CheckResult(
            framework=Framework.DJANGO.value,
            check_name="deploy_checks",
            passed=False,
            severity="error",
            message="Django deploy checks timed out after 60s.",
        ))
    except FileNotFoundError:
        results.append(CheckResult(
            framework=Framework.DJANGO.value,
            check_name="deploy_checks",
            passed=False,
            severity="error",
            message="manage.py not found — is this a Django project?",
        ))

    return results


def run_nextjs_lint(base_dir: str = ".") -> list[CheckResult]:
    """Run Next.js-specific lint checks via npx."""
    results: list[CheckResult] = []

    try:
        proc = subprocess.run(
            ["npx", "next-lint", "--max-warnings", "0"],
            capture_output=True,
            text=True,
            cwd=base_dir,
            timeout=120,
        )

        if proc.returncode == 0:
            results.append(CheckResult(
                framework=Framework.NEXTJS.value,
                check_name="next_lint",
                passed=True,
                severity="info",
                message="Next.js linting passed with zero warnings.",
            ))
        else:
            for line in (proc.stdout or "").splitlines():
                if "warning" in line.lower() or "error" in line.lower():
                    results.append(CheckResult(
                        framework=Framework.NEXTJS.value,
                        check_name="next_lint",
                        passed=False,
                        severity="error",
                        message=line.strip(),
                    ))

    except FileNotFoundError:
        results.append(CheckResult(
            framework=Framework.NEXTJS.value,
            check_name="next_lint",
            passed=False,
            severity="error",
            message="npx next-lint not found — install next.js linter.",
        ))

    return results


def run_all_framework_checks(base_dir: str = ".") -> list[CheckResult]:
    """Run all available framework checks and return aggregated results."""
    all_results: list[CheckResult] = []

    # Check if Django project exists
    django_manage = subprocess.run(
        ["test", "-f", f"{base_dir}/manage.py"], shell=True
    )
    if django_manage.returncode == 0:
        all_results.extend(run_django_deploy_checks(base_dir))

    # Check if Next.js project exists
    next_config = subprocess.run(
        ["test", "-f", f"{base_dir}/next.config.mjs"], shell=True
    )
    if next_config.returncode == 0:
        all_results.extend(run_nextjs_lint(base_dir))

    return all_results


if __name__ == "__main__":
    results = run_all_framework_checks()
    total_errors = sum(1 for r in results if not r.passed and r.severity == "error")

    for result in results:
        status = "PASS" if result.passed else "FAIL"
        print(f"[{status}] [{result.framework}] {result.check_name}: {result.message}")

    sys.exit(1 if total_errors > 0 else 0)
```

### Pattern 4: CI Pipeline Integration — Complete GitHub Actions Workflow

A copy-paste ready GitHub Actions workflow that runs framework validation as a required gate. The pipeline installs dependencies, runs schema validation, executes framework-specific checks, and publishes compliance reports as job artifacts.

```yaml
# .github/workflows/framework-validation.yml
name: Framework Requirements Validation

on:
  pull_request:
    branches: [main, master]
    paths:
      - "src/**"
      - "vite.config.*"
      - "tsconfig.json"
      - "pyproject.toml"
      - "next.config.*"
      - ".eslintrc*"
      - "biome.json"
      - "*.py"
      - "manage.py"
  push:
    branches: [main, master]

permissions:
  contents: read
  checks: write

jobs:
  validate-frameworks:
    name: Framework Validation
    runs-on: ubuntu-latest

    strategy:
      matrix:
        node-version: [20.x]

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Run ESLint with framework plugins
        run: npx eslint src/ --format json --output-file eslint-report.json
        continue-on-error: true

      - name: Run Biome linting
        run: npx @biomejs/biome check src/ --reporter=json > biome-report.json || true

      - name: Validate build configs with Zod
        run: npx tsx scripts/validate-configs.ts > config-validation.json 2>&1 || echo '{"valid":false,"errors":["Config validation failed"]}' > config-validation.json

      - name: Run framework runtime checks
        uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - name: Execute Django deploy checks (if applicable)
        run: |
          pip install -r requirements.txt 2>/dev/null || true
          if [ -f manage.py ]; then
            python scripts/run_framework_checks.py > framework-checks.json 2>&1 || true
          else
            echo '{"checks":[]}' > framework-checks.json
          fi

      - name: Generate compliance report
        run: |
          npx tsx scripts/generate-compliance-report.ts \
            --eslint eslint-report.json \
            --biome biome-report.json \
            --config config-validation.json \
            --framework framework-checks.json \
            --output compliance-report.json

      - name: Upload compliance report artifact
        uses: actions/upload-artifact@v4
        with:
          name: compliance-report
          path: compliance-report.json
          retention-days: 30

      - name: Fail on critical violations
        run: |
          python -c "
          import json, sys
          report = json.load(open('compliance-report.json'))
          errors = report.get('violations', {}).get('errors', [])
          if any(v.get('severity') == 'error' for v in errors):
              print(f\"Found {len(errors)} critical violations.\")
              sys.exit(1)
          print(f\"All checks passed. Score: {report.get('compliance_score', 0)}%\")
          "

      - name: Post compliance score to PR
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require("fs");
            if (fs.existsSync("compliance-report.json")) {
              const report = JSON.parse(fs.readFileSync("compliance-report.json", "utf8"));
              const score = report.compliance_score || 0;
              const emoji = score >= 95 ? ":white_check_mark:" : score >= 70 ? ":warning:" : ":x:";
              core.notice(`Compliance score: ${score}% ${emoji}`);
            }
```

### Pattern 5: Compliance Report Generator

Parse linter output from multiple tools and produce a unified JSON compliance report with per-category violation counts, severity breakdowns, and an overall compliance score. This enables dashboarding, trend tracking, and Slack notifications.

```typescript
// scripts/generate-compliance-report.ts — Unified compliance report generator
import fs from "node:fs";
import path from "node:path";

interface LintViolation {
  file: string;
  rule: string;
  severity: "error" | "warning" | "info";
  message: string;
  line?: number;
  column?: number;
}

interface ComplianceReport {
  timestamp: string;
  compliance_score: number;
  total_files_checked: number;
  violations: {
    errors: LintViolation[];
    warnings: LintViolation[];
  };
  by_category: Record<string, { errors: number; warnings: number }>;
  tool_results: Record<string, { passed: boolean; error_count: number }>;
}

function calculateScore(errors: number, warnings: number): number {
  const totalChecks = errors + warnings + 100; // base of 100 passing checks
  return Math.max(0, Math.round((totalChecks - errors * 5 - warnings) / totalChecks * 100));
}

function mergeViolations(
  eslintFile: string | null,
  biomeFile: string | null,
): LintViolation[] {
  const allViolations: LintViolation[] = [];

  if (eslintFile && fs.existsSync(eslintFile)) {
    try {
      const eslintOutput = JSON.parse(fs.readFileSync(eslintFile, "utf-8")) as Array<{
        filePath: string;
        messages: Array<{
          ruleId: string;
          severity: number;
          message: string;
          line: number;
          column: number;
        }>;
      }>;

      for (const file of eslintOutput) {
        for (const msg of file.messages) {
          allViolations.push({
            file: path.basename(file.filePath),
            rule: msg.ruleId,
            severity: msg.severity === 2 ? "error" : msg.severity === 1 ? "warning" : "info",
            message: msg.message,
            line: msg.line ?? undefined,
            column: msg.column ?? undefined,
          });
        }
      }
    } catch { /* ESLint output may be empty on success */ }
  }

  if (biomeFile && fs.existsSync(biomeFile)) {
    try {
      const biomeOutput = JSON.parse(fs.readFileSync(biomeFile, "utf-8"));
      // Biome v2 uses a different structure — handle both v1 and v2 formats
      const items = Array.isArray(biomeOutput) ? biomeOutput : (biomeOutput as any).files || [];
      for (const item of items) {
        if (item.messages && Array.isArray(item.messages)) {
          for (const msg of item.messages) {
            allViolations.push({
              file: path.basename(item.file),
              rule: msg.code ?? "biome-general",
              severity: msg.severity === "error" ? "error" : "warning",
              message: msg.message,
              line: msg.location?.lineNumber ?? undefined,
              column: msg.location?.columnNumber ?? undefined,
            });
          }
        }
      }
    } catch { /* Biome output may be empty */ }
  }

  return allViolations;
}

export function generateComplianceReport(
  options: {
    eslint?: string | null;
    biome?: string | null;
    config?: string | null;
    framework?: string | null;
    totalFilesChecked?: number;
  } = {},
): ComplianceReport {
  const violations = mergeViolations(options.eslint, options.biome);
  const errors = violations.filter((v) => v.severity === "error");
  const warnings = violations.filter((v) => v.severity === "warning");

  // Break down by category (rule prefix as category)
  const byCategory: Record<string, { errors: number; warnings: number }> = {};
  for (const v of violations) {
    const category = v.rule.split("/")[0] || v.rule;
    if (!byCategory[category]) {
      byCategory[category] = { errors: 0, warnings: 0 };
    }
    if (v.severity === "error") {
      byCategory[category].errors++;
    } else {
      byCategory[category].warnings++;
    }
  }

  // Build tool results
  const toolResults: Record<string, { passed: boolean; error_count: number }> = {};

  if (options.config && fs.existsSync(options.config)) {
    try {
      const configResult = JSON.parse(fs.readFileSync(options.config, "utf-8"));
      toolResults["build-config"] = {
        passed: configResult.valid !== false,
        error_count: Array.isArray(configResult.errors) ? configResult.errors.length : 0,
      };
    } catch {
      toolResults["build-config"] = { passed: false, error_count: 1 };
    }
  } else {
    toolResults["build-config"] = { passed: true, error_count: 0 };
  }

  if (options.framework && fs.existsSync(options.framework)) {
    try {
      const fwResult = JSON.parse(fs.readFileSync(options.framework, "utf-8"));
      const checks = Array.isArray(fwResult) ? fwResult : fwResult.checks || [];
      const errorCount = checks.filter((c: any) => !c.passed && c.severity === "error").length;
      toolResults["framework-rules"] = { passed: errorCount === 0, error_count: errorCount };
    } catch {
      toolResults["framework-rules"] = { passed: true, error_count: 0 };
    }
  } else {
    toolResults["framework-rules"] = { passed: true, error_count: 0 };
  }

  const totalErrors = errors.length + Object.values(toolResults)
    .filter((t) => !t.passed).length;

  return {
    timestamp: new Date().toISOString(),
    compliance_score: calculateScore(errors.length + Object.values(toolResults).filter((t) => !t.passed).length, warnings.length),
    total_files_checked: options.totalFilesChecked ?? (violations.length > 0 ? violations[0].file.split("/").pop()?.split(".").shift() ? 1 : 0 : 0),
    violations: { errors, warnings },
    by_category: byCategory,
    tool_results: toolResults,
  };
}

// CLI entry point
if (require.main === module) {
  const args = process.argv.slice(2);
  const opts: Record<string, string | null> = {};
  for (let i = 0; i < args.length - 1; i += 2) {
    if (args[i] === "--eslint") opts.eslint = args[i + 1];
    else if (args[i] === "--biome") opts.biome = args[i + 1];
    else if (args[i] === "--config") opts.config = args[i + 1];
    else if (args[i] === "--framework") opts.framework = args[i + 1];
    else if (args[i] === "--output") opts._output = args[i + 1];
  }

  const report = generateComplianceReport({
    eslint: opts.eslint || null,
    biome: opts.biome || null,
    config: opts.config || null,
    framework: opts.framework || null,
  });

  const outputPath = opts._output ?? "compliance-report.json";
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
  console.log(`Compliance report written to ${outputPath}`);
  process.exit(report.compliance_score < 70 ? 1 : 0);
}
```

### Pattern 6: Custom ESLint Rule for Framework Requirements

Write custom ESLint rules that enforce project-specific framework conventions. This is how you catch issues that generic linter plugins don't cover — for example, ensuring all API routes use a specific error response format or that React components follow naming conventions.

```typescript
// eslint-strict-nextjs-rules.js — Custom ESLint plugin for Next.js strict requirements
const { RuleTester } = require("eslint");

/**
 * Rule: nextjs/strict-api-response-format
 * Enforces that all API routes (pages/api/*.ts) return responses
 * using the standardized ApiResponse interface.
 */
function strictApiResponseFormat(context) {
  return {
    ExportNamedDeclaration(node) {
      // Only check API route files
      const fileName = context.filename;
      if (!fileName.includes("/api/")) return;

      // Check that default export is a NextApiHandler
      const handlerName = node.declarations?.[0]?.id?.name;
      if (handlerName !== "handler" && handlerName !== "default") {
        // Allow named exports but warn about non-standard names
        context.report({
          node,
          message: `API route should export 'handler' or 'default', found '${handlerName || 'unnamed'}'`,
        });
      }
    },

    ReturnStatement(node) {
      const fileName = context.filename;
      if (!fileName.includes("/api/")) return;

      // Check for direct response.send() usage (deprecated in API routes)
      if (
        node.argument?.callee?.object?.name === "res" &&
        node.argument?.callee?.property?.name === "send"
      ) {
        context.report({
          node,
          message: 'Use res.status(code).json(body) instead of res.send() in API routes',
        });
      }

      // Check for missing status codes on JSON responses
      if (
        node.argument?.callee?.object?.name === "res" &&
        node.argument?.callee?.property?.name === "json"
      ) {
        const parent = findAncestor(node, "ExpressionStatement");
        if (parent) {
          const prevSibling = parent.parent.body[parent.parent.body.indexOf(parent) - 1];
          if (prevSibling?.expression?.callee?.property?.name !== "status") {
            context.report({
              node,
              message: "API responses must include .status(code) before .json(body)",
            });
          }
        }
      }
    },
  };
}

function findAncestor(node, type) {
  let current = node.parent;
  while (current) {
    if (current.type === type) return current;
    current = current.parent;
  }
  return null;
}

module.exports = {
  rules: {
    "strict-api-response-format": strictApiResponseFormat,
  },
};

// ❌ BAD — No custom validation for framework conventions
{
  // Any response format is allowed in API routes
  res.send({ ok: true }); // deprecated, no status code
}

// ✅ GOOD — Custom ESLint rule catches these violations automatically
{
  // This passes because the custom rule enforces .status().json() pattern
  res.status(200).json({ success: true, data: result });
}
```

---

## Constraints

### MUST DO
- Run framework validation as a required CI gate before merge, not as an optional post-commit check
- Install framework-specific linter plugins — never rely on generic ESLint rules alone for framework conventions
- Validate build tool configuration files with explicit schemas that catch missing keys and wrong types
- Include `manage.py check --deploy` in any Django project's CI pipeline for deployment readiness verification
- Generate structured JSON compliance reports that can be consumed by dashboards and notification tools
- Write custom ESLint rules when stock plugins don't cover project-specific framework requirements

### MUST NOT DO
- Skip framework validation to "unblock" a release — this is how production violations accumulate
- Use `--fix` in CI without also running the linter — auto-fixes may mask underlying architectural issues
- Validate configurations only at build time with no schema checks — typos and wrong types cause silent failures
- Disable linter rules as `"off"` without documenting the exception and tracking it in a tech debt register
- Run framework runtime checks (Django `--deploy`, etc.) only on CI but not locally — developers must see violations early

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `framework-utilization` | How to use framework features correctly once conventions are validated |
| `framework-requirements` | Selecting and configuring frameworks before validation rules are defined |
| `build-test-validation` | Complementary test coverage validation alongside code convention checks |

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [ESLint Plugin React Hooks](https://www.npmjs.com/package/eslint-plugin-react-hooks)
- [@next/eslint-plugin-next Documentation](https://nextjs.org/docs/app/api-reference/config/eslint)
- [Biome Linter Configuration](https://biomejs.dev/reference/linter/)
- [Zod Schema Validation Library](https://zod.dev/)
- [Django System Check Framework](https://docs.djangoproject.com/en/stable/ref/checks/)
- [GitHub Actions Workflow Syntax](https://docs.github.com/en/actions/writing-workflows/workflow-syntax-for-github-actions)
