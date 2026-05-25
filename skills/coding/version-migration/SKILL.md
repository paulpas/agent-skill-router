---
name: version-migration
description: Manages framework and library version upgrades through systematic breakage
  analysis, automated refactoring scripts, and progressive migration with zero-downtime
  rollback strategies.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: version migration, major version upgrade, breaking changes, framework
    upgrade, deprecation migration, API breakage, automated refactoring, semver upgrade
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
  - examples
  - do-dont
  related-skills: framework-adaptation, dependency-conflict-resolution, architecture-review
------
# Version Migration & Upgrade Manager

Senior engineer conducting systematic version migrations of frameworks, libraries, and dependencies when breaking changes occur. When loaded, this skill makes the model analyze changelogs for breakage, inventories deprecated APIs, generates automated refactoring scripts, and orchestrates progressive migration with regression testing at every step.

## TL;DR Checklist

- [ ] Parse full CHANGELOG.md or release notes for BREAKING and DEPRECATED sections before touching any code
- [ ] Run type-checker (mypy, tsc) against the new dependency version to find signature mismatches pre-migration
- [ ] Generate deprecation inventory mapping every deprecated API call to its replacement and target removal version
- [ ] Apply automated codemods for mechanical changes (renames, import moves, renamed exports) before manual refactoring
- [ ] Run full test suite after each migration step — not just at the end — catch regressions early
- [ ] Verify behavioral parity in staging with canary deployment strategy before promoting to production

---

## When to Use

Use this skill when:

- Upgrading a major framework version with documented breaking changes (React 18→19, Express 4→5, FastAPI 0.100+ with route signature changes)
- Handling deprecation warnings across multiple modules that need coordinated removal before the deprecated APIs are eliminated
- Migrating between package managers (npm → pnpm, pip → poetry) while simultaneously upgrading critical dependencies
- Upgrading a security-critical dependency where the fix lives in a newer major version with API breakage
- Performing a language runtime upgrade (Python 3.10→3.12, Node 18→20) that changes standard library behavior

---

## When NOT to Use

Avoid this skill for:

- Minor or patch version upgrades where changelogs show zero BREAKING changes — use automated dependency update tools (`npm update`, `pip list --outdated`)
- During active incident response or code freeze — defer non-critical migrations until the situation resolves
- The new major version has unresolved critical bugs (check GitHub issues, release notes, and community forums before starting)
- When an entire module needs architectural rewrite anyway — plan a full refactor as its own initiative rather than incremental migration

---

## Core Workflow

1. **Changelog Breakage Audit** — Download the target package's CHANGELOG.md, release notes, or migration guide. Parse all sections tagged `BREAKING`, `DEPRECATED`, `REMOVED`, or `[BC]`. Categorize each change by severity (critical: runtime failure; high: API rename; medium: behavior shift; low: signature change).   **Checkpoint:** Produce a numbered list of every breaking change with the exact function/class/module it affects. If the changelog is sparse, also scan the diff between versions on GitHub.

2. **Deprecation Inventory** — Run linting rules and AST analysis across the codebase to locate every deprecated API call. Build a structured inventory mapping each usage site (file, line number) to its replacement API and the version where the deprecated API will be removed.   **Checkpoint:** The inventory must cover 100% of deprecated usages found — no orphaned warnings should remain unaccounted for.

3. **Type-Safe Diff Analysis** — Run the type checker against the new dependency version WITHOUT modifying any code first. This reveals signature mismatches, missing exports, and changed return types before any refactoring begins. Capture the full error output as a baseline.   **Checkpoint:** Record the initial type error count. After migration, the final count must be zero — no silent type regressions allowed.

4. **Automated Refactoring Pass** — Apply codemods or rule-based refactors for all mechanical changes: renamed exports, moved modules, replaced function calls with identical signatures, updated import paths. Use AST-based tools (jscodeshift, babel-macro, libcst) rather than regex text replacement.   **Checkpoint:** After running automated refactors, the type checker error count should be reduced by at least 50% — manual changes handle the remainder.

5. **Manual Migration of Semantic Changes** — Handle breaking changes that require understanding business logic: changed function signatures with new required parameters, altered return types, removed configuration options, or restructured APIs. Rewrite each affected call site with the new API semantics.   **Checkpoint:** Every manually migrated call site must have an inline comment explaining *why* the change was necessary and referencing the specific changelog entry.

6. **Regression Test & Canary Deploy** — Execute the full test suite (unit, integration, e2e) against the migrated code. If tests pass, deploy to a staging environment with feature flags or canary traffic routing. Verify behavioral parity by comparing metrics, logs, and response schemas between old and new versions.   **Checkpoint:** Zero new test failures compared to the pre-migration baseline on the `main` branch. Canary deployment must run for at least one full business cycle (e.g., 24 hours) before production promotion.

---

## Implementation Patterns

### Pattern 1: Changelog Breakage Triage Script

Parses standard CHANGELOG.md files to extract breaking changes, categorize them by severity, and produce a structured migration task list. Uses real regex patterns that match the Keep a Changelog format.

```python
"""Changelog breakage triage — parses CHANGELOG.md to extract actionable migration tasks."""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path


class ChangeSeverity(Enum):
    """Severity classification for changelog entries."""
    CRITICAL = "critical"     # Runtime failure — code will crash
    HIGH = "high"             # API rename or removal — needs explicit fix
    MEDIUM = "medium"         # Behavior change — may cause subtle bugs
    LOW = "low"               # Signature change — type-checker will catch


@dataclass
class BreakingChange:
    """Represents a single breaking change found in changelog text."""
    version: str
    section: str                      # e.g., "Removed", "Changed", "Security"
    change_type: str                  # "BREAKING", "DEPRECATED", "REMOVED"
    description: str
    original_api: str = ""            # Old API name if identifiable
    new_api: str | None = None        # Replacement API if documented
    severity: ChangeSeverity = ChangeSeverity.HIGH
    affected_modules: list[str] = field(default_factory=list)

    def __str__(self) -> str:
        return (
            f"[{self.severity.value.upper()}] {self.version}/{self.section}: "
            f"{self.description}"
        )


# Regex patterns matching Keep a Changelog format
_BREAKING_HEADER = re.compile(
    r"^## \[?\(?v?(\d+\.\d+\.\d+)\]?\)?\s*-?\s*(?:Release|version|Release\s+Date:.*)",
    re.MULTILINE,
)
_SECTION_HEADER = re.compile(
    r"^(###\s+(BREAKING CHANGES?|DEPRECATED|REMOVED|CHANGED|ADDED|FIXED))",
    re.MULTILINE,
)
_BULLET_ITEM = re.compile(r"^[-*]\s+(.*)$", re.MULTILINE)


def parse_changelog_breaking_changes(changelog_path: Path) -> list[BreakingChange]:
    """Parse a CHANGELOG.md file to extract all breaking and deprecated changes.

    Handles the standard Keep a Changelog format with version headers,
    category sections (BREAKING CHANGES, DEPRECATED, REMOVED), and bullet items.

    Args:
        changelog_path: Path to the CHANGELOG.md file.

    Returns:
        List of BreakingChange objects sorted by version descending, then severity.

    Raises:
        FileNotFoundError: If changelog_path does not exist.
        ValueError: If the file contains no parseable version headers.
    """
    if not changelog_path.is_file():
        raise FileNotFoundError(f"Changelog not found: {changelog_path}")

    content = changelog_path.read_text(encoding="utf-8")
    changes: list[BreakingChange] = []

    # Extract version sections using the header pattern
    version_sections: list[tuple[str, str]] = []
    current_version = None
    lines = changelog_path.read_text().splitlines()
    i = 0
    while i < len(lines):
        line = lines[i]
        if match := _BREAKING_HEADER.match(line.strip()):
            current_version = match.group(1)
            section_start = i + 1
        elif current_version and line.strip().startswith("##"):
            # End of previous version section at next top-level heading
            version_sections.append((current_version, "\n".join(lines[section_start:i])))
            current_version = None
        i += 1

    if current_version:
        version_sections.append((current_version, "\n".join(lines[version_sections[-1][1].find(current_version):] if version_sections else [])))

    # Categorize sections by severity mapping
    severity_map = {
        "BREAKING CHANGES": ChangeSeverity.CRITICAL,
        "BREAKING CHANGE": ChangeSeverity.CRITICAL,
        "REMOVED": ChangeSeverity.HIGH,
        "DEPRECATED": ChangeSeverity.MEDIUM,
        "CHANGED": ChangeSeverity.LOW,
    }

    change_type_map = {
        "BREAKING CHANGES": "BREAKING",
        "BREAKING CHANGE": "BREAKING",
        "REMOVED": "REMOVED",
        "DEPRECATED": "DEPRECATED",
        "CHANGED": "CHANGE",
    }

    for version, section_text in _extract_version_blocks(content):
        # Find category sections within this version block
        sections = _find_category_sections(section_text)

        for cat_header, items in sections:
            severity = severity_map.get(cat_header, ChangeSeverity.MEDIUM)
            change_type = change_type_map.get(cat_header, "CHANGE")

            for item in _parse_bullet_items(items):
                bc = BreakingChange(
                    version=version,
                    section=cat_header,
                    change_type=change_type,
                    description=item.strip(),
                    severity=severity,
                )
                # Extract API names if pattern matches (e.g., "function_name() renamed to new_name()")
                bc._extract_api_names(item)
                changes.append(bc)

    # Sort by severity (critical first), then version descending
    severity_order = {s: i for i, s in enumerate(ChangeSeverity)}
    changes.sort(key=lambda c: (severity_order[c.severity], c.version), reverse=True)

    return changes


def _extract_version_blocks(content: str) -> list[tuple[str, str]]:
    """Split changelog into version blocks with their headings."""
    blocks: list[tuple[str, str]] = []
    # Match ## [vX.Y.Z] or ## vX.Y.Z patterns
    version_pattern = re.compile(r"^## \[?\(?v?(\d+\.\d+\.\d+)\]?\)?", re.MULTILINE)

    matches = list(version_pattern.finditer(content))
    for idx, match in enumerate(matches):
        version = match.group(1)
        start = match.start()
        end = matches[idx + 1].start() if idx + 1 < len(matches) else len(content)
        blocks.append((version, content[start:end]))

    return blocks


def _find_category_sections(version_block: str) -> list[tuple[str, str]]:
    """Find ### category headers and their bullet items within a version block."""
    sections: list[tuple[str, str]] = []
    lines = version_block.splitlines()

    current_header = None
    current_items: list[str] = []

    for line in lines:
        header_match = re.match(r"^###\s+(.*)", line)
        if header_match and not line.startswith("####"):
            # Save previous section
            if current_header is not None:
                sections.append((current_header, "\n".join(current_items)))
            current_header = header_match.group(1).strip()
            current_items = []
        elif current_header and re.match(r"^\s*[-*]\s+", line):
            current_items.append(line)

    # Don't forget the last section
    if current_header is not None:
        sections.append((current_header, "\n".join(current_items)))

    return sections


def _parse_bullet_items(text: str) -> list[str]:
    """Extract individual bullet points from changelog text."""
    items = []
    for line in text.splitlines():
        stripped = line.strip()
        if match := re.match(r"^[-*]\s+(.*)", stripped):
            items.append(match.group(1))
    return items


def _generate_migration_task_list(changes: list[BreakingChange]) -> str:
    """Generate a human-readable migration task list from parsed breaking changes.

    Args:
        changes: List of BreakingChange objects from parse_changelog_breaking_changes().

    Returns:
        Formatted markdown task list suitable for commit messages or PR descriptions.
    """
    lines = ["## Migration Tasks\n"]

    # Group by version and severity
    by_severity: dict[ChangeSeverity, list[BreakingChange]] = {}
    for change in changes:
        by_severity.setdefault(change.severity, []).append(change)

    for severity in [ChangeSeverity.CRITICAL, ChangeSeverity.HIGH, ChangeSeverity.MEDIUM, ChangeSeverity.LOW]:
        items = by_severity.get(severity, [])
        if not items:
            continue

        lines.append(f"\n### {severity.value.upper()} — {len(items)} change(s)\n")
        for i, bc in enumerate(items, 1):
            api_hint = ""
            if bc.original_api and bc.new_api:
                api_hint = f" (`{bc.original_api}` → `{bc.new_api}`)"
            lines.append(f"- [ ] #{i} {bc.description}{api_hint}")

    return "\n".join(lines)


# Usage example — run against a real changelog:
# if __name__ == "__main__":
#     changelog = Path("CHANGELOG.md")
#     breaking_changes = parse_changelog_breaking_changes(changelog)
#     print(_generate_migration_task_list(breaking_changes))
```

### Pattern 2: AST-Based Codemod for Automated Refactoring

Uses Python's `libcst` library to safely transform deprecated API calls across an entire codebase. This is superior to regex because it understands import structure, function signatures, and scope.

```python
"""AST-based codemod — automatically refactors deprecated API calls using libcst."""

from __future__ import annotations

import libcst as cst
import libcst.matchers as m
from dataclasses import dataclass, field
from pathlib import Path


@dataclass
class RefactorRule:
    """Defines a single automated refactoring rule.

    Attributes:
        module_pattern: Regex matching the deprecated module path (e.g., 'express\\.(old|deprecated)').
        original_name: The deprecated function/class name to find.
        replacement_name: The new API name that replaces it.
        arg_transform: Optional callable to transform positional/keyword arguments.
        description: Human-readable explanation of what this rule does.
    """
    module_pattern: str
    original_name: str
    replacement_name: str
    arg_transform: callable | None = None
    import_replacement: str | None = None   # New import path if module moved
    description: str = ""

    @property
    def severity(self) -> str:
        return "breaking" if self.import_replacement else "deprecation"


class DeprecatedAPIRemover(cst.CSTTransformer):
    """CST transformer that replaces deprecated function/class calls with their modern equivalents.

    Example usage:
        rules = [
            RefactorRule(
                module_pattern=r"express\\.(deprecated|old)",
                original_name="render",
                replacement_name="res.render",
                description="Express 5 removes top-level render in favor of res.render"
            ),
        ]

        transformer = DeprecatedAPIRemover(rules)
        result = transformer.transform(old_source, "express.js")
    """

    def __init__(self, rules: list[RefactorRule]) -> None:
        self.rules = {r.original_name: r for r in rules}

    def leave_Call(
        self,
        original_node: cst.Call,
        updated_node: cst.Call,
    ) -> cst.CSTNode:
        """Transform deprecated function calls to their replacements."""
        func = original_node.func

        # Handle direct function calls: deprecatedFunction(args)
        if isinstance(func, cst.Name) and func.value in self.rules:
            rule = self.rules[func.value]
            return self._build_replacement_call(original_node, rule)

        # Handle attribute calls: module.deprecatedFunction(args)
        if m.matches(func, m.Attribute(attr=m.Name(value=m.Any()))):
            attr_name = func.attr.value
            if attr_name in self.rules:
                rule = self.rules[attr_name]
                return self._build_replacement_call(original_node, rule, func)

        return updated_node

    def leave_Import(
        self,
        original_node: cst.Import,
        updated_node: cst.Import,
    ) -> cst.CSTNode:
        """Update imports when modules have been moved to new paths."""
        for alias in original_node.names:
            module_str = str(alias.name)
            for rule in self.rules.values():
                if rule.import_replacement and m.matches(
                    alias.name, m.Module(module_str.split("."))
                ):
                    # Replace deprecated import with the new module path
                    new_names = [alias.with_deep_clone(value=cst.Name(rule.import_replacement))]
                    return updated_node.with_changes(names=new_names)

        return updated_node

    def _build_replacement_call(
        self,
        original_node: cst.Call,
        rule: RefactorRule,
        func_node: cst.BaseExpression | None = None,
    ) -> cst.CSTNode:
        """Construct the replacement Call node with transformed arguments."""
        new_func: cst.BaseExpression

        if func_node is not None and isinstance(func_node, cst.Attribute):
            # Preserve receiver but update attribute name
            new_func = func_node.with_changes(attr=cst.Name(rule.replacement_name.split(".")[-1]))
        else:
            parts = rule.replacement_name.split(".")
            new_func = cst.Name(parts[0])
            for part in parts[1:]:
                new_func = cst.Attribute(value=new_func, attr=cst.Name(part))

        # Apply argument transformations if defined
        args = original_node.args
        if rule.arg_transform:
            try:
                args = rule.arg_transform(original_node)
            except Exception:
                # Fall back to original args on transform failure
                pass

        return original_node.with_changes(func=new_func, args=args)


# Example: Express 4 → 5 migration rules
EXPRESSION_4_TO_5_RULES: list[RefactorRule] = [
    RefactorRule(
        module_pattern=r"express",
        original_name="render",
        replacement_name="app.render",
        import_replacement="express.application",
        description="Express 5 removes express.render(); use app.render(req, res, ...) instead"
    ),
    RefactorRule(
        module_pattern=r"express",
        original_name="response\.sendFile",
        original_name="sendfile",
        replacement_name="res.sendFile",
        arg_transform=lambda call: [
            arg.with_changes(keyword=arg.keyword or cst.Name("path"))
            for arg in call.args
        ],
        description="Express 5 requires explicit path keyword argument for res.sendFile"
    ),
]


def apply_codemods(
    source_dir: Path,
    rules: list[RefactorRule],
    file_extensions: list[str] = None,
) -> dict[str, int]:
    """Apply automated refactorings across all files in a directory tree.

    Args:
        source_dir: Root directory to scan for files to refactor.
        rules: List of RefactorRule objects defining the transformations.
        file_extensions: File extensions to process (default: .js, .ts, .jsx, .tsx).

    Returns:
        Dictionary mapping each file path to the number of changes applied.
    """
    if file_extensions is None:
        file_extensions = [".js", ".ts", ".jsx", ".tsx", ".py"]

    transformer = DeprecatedAPIRemover(rules)
    results: dict[str, int] = {}
    files_processed = 0

    for ext in file_extensions:
        for source_file in source_dir.rglob(f"*{ext}"):
            original_source = source_file.read_text(encoding="utf-8")
            try:
                tree = cst.parse_module(original_source)
                new_tree = tree.visit(transformer)
                new_source = new_tree.code

                if new_source != original_source:
                    changes = _count_changes(original_source, new_source)
                    source_file.write_text(new_source, encoding="utf-8")
                    results[str(source_file)] = changes
                    files_processed += 1

            except cst.ParserSyntaxError as e:
                print(f"⚠️  Syntax error in {source_file}: {e}")
                continue

    return results


def _count_changes(original: str, modified: str) -> int:
    """Estimate number of code changes by diffing lines."""
    orig_lines = set(original.splitlines())
    mod_lines = set(modified.splitlines())
    additions = mod_lines - orig_lines
    deletions = orig_lines - mod_lines
    return len(additions) + len(deletions)


# Usage:
# results = apply_codemods(Path("src"), EXPRESSION_4_TO_5_RULES)
# for filepath, changes in sorted(results.items()):
#     print(f"{filepath}: {changes} changes applied")
```

### Pattern 3: Deprecation Warning Capture & Tracking

Captures deprecation warnings during test execution and produces a structured report of every deprecated API usage found at runtime. Integrates Python's `warnings` module with pytest hooks for comprehensive tracking.

```python
"""Deprecation warning capture — instruments test suites to detect deprecated API usage."""

from __future__ import annotations

import re
import warnings
import sys
from dataclasses import dataclass, field
from pathlib import Path
from datetime import datetime


@dataclass
class DeprecationReport:
    """Structured report of deprecation warnings captured during test execution.

    Attributes:
        timestamp: When the report was generated.
        total_warnings: Total number of unique deprecation warnings found.
        categories: Grouped warnings by module or library name.
        critical_count: Warnings for APIs that have been removed (RuntimeError-level).
        remediation_deadline: Estimated date when deprecated APIs will be removed.
    """
    timestamp: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    total_warnings: int = 0
    categories: dict[str, list[DeprecationEntry]] = field(default_factory=dict)
    critical_count: int = 0
    remediation_deadline: str | None = None

    @property
    def summary(self) -> str:
        """Generate a human-readable summary of the deprecation report."""
        lines = [
            f"Deprecation Report ({self.timestamp})",
            f"Total warnings: {self.total_warnings} | Critical: {self.critical_count}",
        ]
        for category, entries in sorted(self.categories.items()):
            lines.append(f"\n  [{category}] {len(entries)} warning(s)")
            for entry in entries[:3]:  # Show first 3 per category
                lines.append(f"    - {entry.message}")
        if self.total_warnings > 3:
            lines.append(f"    ... and {self.total_warnings - 3} more")
        return "\n".join(lines)


@dataclass
class DeprecationEntry:
    """A single deprecation warning captured at runtime."""
    module: str
    message: str
    filename: str
    line_number: int
    category: type[Warning] = DeprecationWarning
    replacement_hint: str | None = None

    def __post_init__(self) -> None:
        """Attempt to extract a replacement API from the warning message."""
        if not self.replacement_hint and "use" in self.message.lower():
            # Common pattern: "Use X instead of Y" or "X is deprecated, use Y"
            patterns = [
                r"use\s+`([^`]+)`\s+instead",
                r"use\s+(\w+)\s+instead",
                r"replaced?\s+by\s+`?([^`.\s]+)`?,?",
                r"replaced?\s+by\s+`?(\w+)`?,?",
                r"(?:renamed|moved)\s+to\s+`?([^\s`]+)`?,?",
            ]
            for pattern in patterns:
                if match := re.search(pattern, self.message, re.IGNORECASE):
                    self.replacement_hint = match.group(1)
                    break


class DeprecationCaptureMixin:
    """Context manager that captures all deprecation warnings into a structured report.

    Usage as context manager:
        with DeprecationCaptureMixin() as reporter:
            import my_deprecated_library
            my_deprecated_library.old_function()  # Warning captured
        print(reporter.report.summary)

    Usage as pytest fixture:
        @pytest.fixture
        def deprecation_report():
            with DeprecationCaptureMixin() as reporter:
                yield reporter
    """

    def __init__(self, strict: bool = False) -> None:
        self.strict = strict
        self.entries: list[DeprecationEntry] = []
        self._report: DeprecationReport | None = None

    def __enter__(self) -> "DeprecationCaptureMixin":
        self._old_showwarning = warnings.showwarning
        warnings.simplefilter("always", DeprecationWarning)
        warnings.simplefilter("always", PendingDeprecationWarning)
        warnings.showwarning = self._custom_showwarning
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        warnings.showwarning = self._old_showwarning
        self._generate_report()
        if self.strict and self.entries:
            critical_msgs = [e.message for e in self.entries]
            raise RuntimeError(
                f"Deprecation strict mode: {len(self.entries)} warning(s) captured:\n"
                + "\n".join(f"  - {m}" for m in critical_msgs)
            )

    def _custom_showwarning(
        self,
        message: str,
        category: type[Warning],
        filename: str,
        lineno: int,
        file=None,
        line=None,
    ) -> None:
        """Capture warnings instead of displaying them."""
        # Extract module name from the warning traceback or filename
        module = Path(filename).stem

        entry = DeprecationEntry(
            module=module,
            message=str(message),
            filename=filename,
            line_number=lineno,
            category=category,
        )
        self.entries.append(entry)

    def _generate_report(self) -> None:
        """Build the final DeprecationReport from captured entries."""
        report = DeprecationReport()
        categories: dict[str, list[DeprecationEntry]] = {}

        for entry in self.entries:
            # Group by module or library name
            key = entry.module.split(".")[0] if "." in entry.module else entry.module
            categories.setdefault(key, []).append(entry)

            if issubclass(entry.category, RuntimeWarning):
                report.critical_count += 1

        report.categories = categories
        report.total_warnings = len(self.entries)
        self._report = report

    @property
    def report(self) -> DeprecationReport:
        """Return the generated report. Must be called after context exit."""
        if self._report is None:
            raise RuntimeError("Call __exit__ first, or use as a context manager.")
        return self._report


# Pytest plugin integration for automatic capture during test runs:
# def pytest_configure(config):
#     """Register the deprecation warning filter."""
#     config.addinivalue_line(
#         "filterwarnings",
#         "error::DeprecationWarning"
#     )
#     config.addinivalue_line(
#         "filterwarnings",
#         "error::PendingDeprecationWarning"
#     )


# Usage example:
# with DeprecationCaptureMixin(strict=True) as reporter:
#     # Run code that might trigger deprecation warnings
#     import some_old_library
#     some_old_library.old_api_call()
# print(reporter.report.summary)
```

---

## BAD vs. GOOD Examples

### ❌ BAD: Regex-based text replacement for refactoring

```typescript
// ❌ BAD: Using string replaceAll — breaks on false positives, ignores scope
function migrateExpressCode(source: string): string {
  // Fragile: replaces ALL occurrences including comments, strings, and non-API usages
  return source
    .replaceAll(/app\.use\(bodyParser/g, "app.use(express.json()")
    .replaceAll(/express\.deprecatedMethod/g, "newAPI()");
}

// Problems:
// - Replaces text in comments like "// use bodyParser for middleware"
// - Misses renamed exports in import statements
// - Cannot handle multi-line function signatures
// - No AST understanding of scope or binding
```

### ✅ GOOD: AST-based codemod with scope awareness

```typescript
// ✅ GOOD: Using @babel/core + AST to safely transform code
import { parse } from "@babel/parser";
import traverse from "@babel/traverse";
import generator from "@babel/generator";
import * as t from "@babel/types";

interface MigrationRule {
  readonly oldCall: string;
  readonly newCall: string;
  readonly argMapper?: (args: t.Expression[]) => t.Expression[];
}

const expressRules: readonly MigrationRule[] = [
  {
    oldCall: "bodyParser.json()",
    newCall: "express.json()",
    argMapper: (args) => args, // No argument changes needed
  },
  {
    oldCall: "app.param(name)",
    newCall: "app.param(name, middleware)",
    argMapper: ([name, fn]) => [name, fn],
  },
];

function applyCodemod(source: string): string {
  const ast = parse(source, { sourceType: "module", plugins: ["typescript"] });

  traverse(ast, {
    CallExpression(path) {
      for (const rule of expressRules) {
        if (!matchesCall(path.node, rule.oldCall)) continue;

        // Apply argument mapping
        let newArgs = path.node.arguments;
        if (rule.argMapper) {
          newArgs = rule.argMapper(path.node.arguments);
        }

        // Build the replacement call expression
        const [module, fn] = rule.newCall.split(".");
        path.replaceWith(t.callExpression(
          t.memberExpression(
            t.identifier(module),
            t.identifier(fn)
          ),
          newArgs.map(t.cloneNode)
        ));
      }
    },
  });

  return generator(ast).code;
}

function matchesCall(node: t.CallExpression, pattern: string): boolean {
  const [module, fn] = pattern.split(".");
  return (
    t.isMemberExpression(node.callee) &&
    t.isIdentifier(node.callee.object, { name: module }) &&
    t.isIdentifier(node.callee.property, { name: fn })
  );
}
```

---

## Constraints

### MUST DO

- Always parse the full changelog or release notes BEFORE starting migration — never skip breakage analysis; a single missed breaking change can crash production
- Use automated codemods for mechanical changes (renames, import moves, replaced function calls) before manual refactoring — this reduces error surface and accelerates migration by 3-5x
- Maintain a deprecation tracking table mapping every deprecated API in the codebase to its replacement, the version where it was deprecated, and the target removal version; update this table incrementally during migration
- Run the full test suite (unit + integration) after each migration step — not just at the end — to catch regressions early when they are cheap to fix
- Verify behavioral parity between old and new versions using canary deployment or shadow traffic routing before promoting changes to production
- Migrate one major version at a time — never jump from v4→v6 if v4→v5→v6 exists; each intermediate step may have necessary transitional APIs

### MUST NOT DO

- Pin dependencies in requirements.txt/package.json without checking what versions other packages require — use `--dry-run pip install` or `npm install --package-lock-only` to verify dependency tree compatibility first
- Skip running the type checker (mypy for Python, tsc for TypeScript) against the new version before starting code changes — the type system is the fastest way to find broken signatures
- Assume backward compatibility patches apply across major versions — semver MAJOR bumps are explicitly designed to break everything; never rely on undocumented compatibility shims
- Use regex-based text replacement for refactoring across multiple files — this will replace API names in comments, strings, and test assertions where they should not change
- Upgrade a security-critical dependency without first verifying the new version's release notes for known bugs — CVE fixes sometimes introduce new issues

---

## Output Template

When applying this skill to a version migration task, produce:

1. **Breakage Analysis Report** — Categorized list of all breaking changes extracted from changelog/release notes, sorted by severity (critical → low), with the specific function/class/module affected and a one-line migration hint
2. **Deprecation Inventory** — Table with columns: `File Path | Line Number | Deprecated API | Replacement API | Deprecation Version | Removal Version` covering every deprecated usage found in the codebase
3. **Automated Refactoring Rules** — List of codemod/rule-based changes to apply, organized by category (import moves → function renames → argument transformations), with estimated time and risk level per category
4. **Migration Execution Plan** — Ordered step-by-step plan with rollback criteria at each stage: what tests verify success, what metrics confirm behavioral parity, and how to revert if the canary deployment detects anomalies

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `framework-adaptation` | Design patterns for adapting application code when a framework's internal APIs change — use after version migration identifies specific adaptation needs |
| `dependency-conflict-resolution` | Resolve transitive dependency conflicts that arise when upgrading one package forces incompatible changes in its dependents — use alongside migration when the dependency tree breaks |
| `architecture-review` | Assess whether an incremental migration makes sense or if a full architectural refactor is warranted — run before committing to migration for large, complex codebases |

---

## Live References

> Authoritative documentation links for version migration and framework upgrade patterns.

- [Semantic Versioning 2.0.0 (semver.org)](https://semver.org/)
- [Python Migration Guide — Python 3.12 What's New](https://docs.python.org/3/whatsnew/3.12.html)
- [Node.js LTS Release Schedule & Migration Guides](https://nodejs.org/en/about/releases/)
- [React 18 Upgrade Guide (react.dev)](https://react.dev/blog/2022/03/29/react-v18)
- [Express.js v4 to v5 Migration Notes](https://expressjs.com/en/guide/migrating-5.html)
- [FastAPI Breaking Changes & Migration Guide (fastapi.tiangolo.com)](https://fastapi.tiangolo.com/release-notes/)
- [libcst — Code Refactoring Library (Facebook)](https://libcst.readthedocs.io/en/latest/)
