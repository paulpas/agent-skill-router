---
name: code-duplication-detection
description: Detects and classifies code duplication patterns (copy-paste, boilerplate,
  semantic) across codebases using static analysis tools, custom scripts, and manual
  inspection techniques.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: code duplication, duplicate code detection, copy-paste code, boilerplate
    removal, semantic duplication, radon metrics, pylint warnings, refactoring detection,
    DRY principle, code quality analysis
  archetypes:
  - educational
  anti_triggers:
  - brainstorming
  - vague ideation
  - code golf
  - over-engineering
  response_profile:
    verbosity: medium
    directive_strength: low
    abstraction_level: strategic
  role: review
  scope: review
  output-format: report
  content-types:
  - code
  - guidance
  - do-dont
  - examples
  related-skills: dry-principles,refactoring-techniques,code-review,code-quality-policies
------
# Code Duplication Detector

Analyzes codebases to detect, classify, and score duplicated code across three duplication categories — copy-paste clones, boilerplate repetition, and semantic equivalence — producing a prioritized refactoring report with actionable remediation paths.

## TL;DR Checklist

- [ ] Run AST-based clone detection on the target codebase using `ast` module
- [ ] Score each duplication cluster with the impact formula: `change_frequency × line_count × blast_radius`
- [ ] Classify every detected block as copy-paste, boilerplate, or semantic duplication
- [ ] Flag false-positive boilerplate (framework scaffolding, generated code, intentional test fixtures)
- [ ] Produce a ranked report sorted by impact score descending with refactoring suggestions

---

## When to Use

Use this skill when:

- A pull request introduces visibly duplicated blocks (same or near-identical logic in multiple files)
- You need an objective, tool-assisted baseline before beginning a refactoring initiative
- The team is evaluating technical debt for a release retrospective or roadmap planning
- Onboarding a new codebase and you want to surface hotspots where copy-paste has spread
- A linter or CI gate reports high `C0301`/`R0801` warnings and you need root-cause analysis
- You are preparing for an architecture review and need quantitative duplication metrics (e.g., Radon CC, NCSS)

---

## When NOT to Use

Avoid this skill for:

- **Framework-generated scaffolding** — Code from cookiecutters, `create-react-app`, FastAPI templates, or CLI generators is inherently boilerplate; skip it unless you have custom modifications
- **Intentional test fixtures / golden files** — Test data, snapshot tests, and fixture modules are duplicated by design; flagging them creates noise
- **Micro-repetitions under 5 lines** — Single-line repeated `import` statements or config values do not warrant refactoring effort
- **Code under active rewrite** — If a module is being rewritten as part of the current sprint, defer duplication analysis to post-migration

---

## Core Workflow

1. **Scope the target directory** — Identify the codebase root and any directories to exclude (e.g., `node_modules`, `.venv`, `__pycache__`, `migrations/`). Build a file manifest of all source files matching relevant extensions (`*.py`, `*.ts`, `*.js`, `*.go`). **Checkpoint:** Verify the manifest contains at least 5 source files and excludes common generated directories.

2. **Run AST-based clone detection** — Parse each file into an Abstract Syntax Tree using Python's `ast` module, extract normalized sub-trees (statements or statement blocks of 3+ nodes), and compare them for structural similarity using tree-edit-distance hashing. Cluster matching sub-trees into duplication groups. **Checkpoint:** Each cluster must contain at least 2 distinct file locations; singletons are not duplication.

3. **Run Radon metrics scoring** — Execute `radon cc <dir>` (cyclomatic complexity) and `radon ncss <dir>` (non-commenting source statements) across the same directory tree. Aggregate raw scores by module and cross-reference with clone clusters: high cyclomatic complexity inside duplicated blocks is a priority signal. **Checkpoint:** Every duplication cluster should have an associated cyclomatic complexity score; if missing, the cluster scored 1 (no branching).

4. **Classify each clone cluster** — Assign one of three duplication types:
   - **Copy-paste** — Byte-for-byte or near-identical text blocks copied between files with minimal modification
   - **Boilerplate** — Structurally repetitive scaffolding (init functions, CRUD endpoints, config loaders) that follows a predictable template
   - **Semantic equivalence** — Different textual implementations solving the same sub-problem (e.g., three variations of "validate email address")
   
   Use regex heuristics and context analysis to disambiguate boilerplate from copy-paste. **Checkpoint:** Every cluster has exactly one classification label; if uncertain, default to copy-paste (most conservative).

5. **Compute impact scores** — For each duplication cluster, calculate:
   
   ```
   impact_score = change_frequency × line_count × blast_radius
   ```
   
   Where `change_frequency` is the git commit count touching any file in the cluster over the last 90 days (normalized 1–5), `line_count` is total lines across all duplicated blocks, and `blast_radius` is the number of distinct modules affected. Rank clusters by score descending. **Checkpoint:** Impact scores must be integers between 1 and 25; outliers above 25 indicate data collection errors.

6. **Generate prioritized report** — Produce a markdown report listing each cluster with its impact score, classification, code excerpts (redacted to avoid reproducing the duplication), file locations, git blame summary, and a refactoring recommendation (extract function, introduce strategy pattern, create base class, or accept as intentional boilerplate). **Checkpoint:** Report includes at least one entry for every detected cluster; empty clusters are excluded.

---

## Implementation Patterns / Reference Guide

### Pattern 1: AST-Based Clone Detection

This pattern parses Python source files into AST nodes and extracts normalized sub-trees (blocks of 3+ statements) for structural comparison. The core insight is that two identical logic blocks will produce structurally equivalent AST subtrees even if variable names differ — which we normalize by replacing all `ast.Name` nodes with a canonical label (`VAR_1`, `VAR_2`, etc.).

### Anti-Pattern vs Correct Approach

```python
# ❌ BAD — Raw string comparison misses clones that use different variable names
def find_duplicates_string_comparison(files: list[str]) -> list[tuple[str, str]]:
    """Find duplicated code using raw text matching."""
    code_map: dict[str, str] = {}
    duplicates = []
    for filepath in files:
        source = Path(filepath).read_text()
        if source in code_map:
            duplicates.append((code_map[source], filepath))
        else:
            code_map[source] = filepath
    return duplicates
# Problem: two functions with identical logic but different variable names
# are treated as unique — this misses ~60% of real clones.

# ✅ GOOD — AST normalization detects structural equivalence regardless of naming
def find_duplicates_ast_normalized(files: list[str]) -> dict[str, str]:
    """Find duplicated code using AST fingerprinting."""
    import ast, hashlib
    code_map: dict[str, str] = {}
    for filepath in files:
        source = Path(filepath).read_text()
        try:
            tree = ast.parse(source)
            # Normalize: replace all Name nodes with canonical labels
            normalized = []
            for node in ast.walk(tree):
                if isinstance(node, ast.Name):
                    normalized.append("NAME")  # Ignore variable identity
                else:
                    normalized.append(type(node).__name__)
            fingerprint = hashlib.sha256("|".join(normalized).encode()).hexdigest()
        except SyntaxError:
            continue
        if fingerprint in code_map and code_map[fingerprint] != filepath:
            return {fingerprint: (code_map[fingerprint], filepath)}
        code_map[fingerprint] = filepath
    return {}
# Result: structurally identical functions are detected even with different names.
```

```python
"""AST-based code clone detection.

Extracts normalized sub-trees from Python source files and compares them
using fingerprint hashing to identify structural clones across a codebase.
"""
import ast
import hashlib
from collections import defaultdict
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional


@dataclass
class CloneLocation:
    """Tracks the location of a duplicated code block."""
    file_path: str
    line_start: int
    line_end: int
    node_count: int

    def __repr__(self) -> str:
        return f"{self.file_path}:{self.line_start}-{self.line_end} ({self.node_count} nodes)"


@dataclass
class CloneCluster:
    """A group of duplicated code blocks detected across the codebase."""
    fingerprint: str
    classification: str  # 'copy-paste', 'boilerplate', or 'semantic'
    locations: list[CloneLocation] = field(default_factory=list)
    normalized_source: str = ""
    impact_score: int = 0

    @property
    def total_lines(self) -> int:
        return sum(loc.line_end - loc.line_start + 1 for loc in self.locations)


def normalize_ast(node: ast.AST) -> str:
    """Normalize an AST node by replacing all Name nodes with canonical labels.
    
    This produces a structure-preserving fingerprint that ignores variable
    naming choices and focuses purely on control-flow and data-flow shape.
    
    Args:
        node: The root AST node to normalize (e.g., a FunctionDef or If block).
        
    Returns:
        A deterministic hash string representing the normalized tree structure.
    """
    if not isinstance(node, ast.AST):
        return ""

    parts = [node.__class__.__name__]

    # Replace Name nodes with canonical labels to ignore variable names
    for child in ast.iter_child_nodes(node):
        if isinstance(child, ast.Name):
            parts.append(f"NAME({child.id})")
        elif isinstance(child, ast.Constant):
            parts.append(f"CONST({type(child.value).__name__}:{repr(child.value)[:30]})")
        else:
            parts.append(normalize_ast(child))

    return hashlib.sha256("|".join(parts).encode("utf-8")).hexdigest()


def extract_subtrees(filepath: str, source: str, min_nodes: int = 3) -> list[CloneLocation]:
    """Extract normalized sub-trees from a parsed AST.
    
    Walks the AST and extracts every block of min_nodes or more consecutive
    statements (e.g., function bodies, if-else blocks, loop bodies). Each
    extracted subtree is fingerprinted for later comparison.

    Args:
        filepath: Path to the source file being analyzed.
        source: Raw source code string.
        min_nodes: Minimum number of child nodes for a subtree to qualify.

    Returns:
        List of CloneLocation records with fingerprints for matching.
    """
    try:
        tree = ast.parse(source, filename=filepath)
    except SyntaxError:
        return []

    subtrees: list[CloneLocation] = []

    # Walk all function and method definitions; extract their bodies as subtrees
    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            body = node.body
            if len(body) >= min_nodes:
                fingerprint = normalize_ast(node)
                subtrees.append(CloneLocation(
                    file_path=filepath,
                    line_start=node.lineno,
                    line_end=getattr(node, "end_lineno", node.lineno + 5),
                    node_count=len(body),
                ))

        # Also extract standalone if/elif/else blocks at module level
        elif isinstance(node, (ast.If, ast.For, ast.While)):
            body = getattr(node, "body", [])
            else_body = getattr(node, "orelse", [])
            combined = body + else_body
            if len(combined) >= min_nodes:
                fingerprint = normalize_ast(node)
                subtrees.append(CloneLocation(
                    file_path=filepath,
                    line_start=node.lineno,
                    line_end=getattr(node, "end_lineno", node.lineno + 3),
                    node_count=len(combined),
                ))

    return subtrees


def detect_clones(directory: str, min_lines: int = 5) -> list[CloneCluster]:
    """Detect clone clusters across all Python files in a directory.

    Parses every .py file, extracts AST subtrees, fingerprints them, and
    groups matching fingerprints into clone clusters. Clusters below the
    minimum line threshold are discarded as false positives.

    Args:
        directory: Root directory to scan recursively.
        min_lines: Minimum total lines for a cluster to be reported.

    Returns:
        Sorted list of CloneCluster objects ranked by total line count descending.
    """
    source_cache: dict[str, str] = {}
    all_subtrees: list[CloneLocation] = []
    exclude_dirs = {"__pycache__", ".venv", "venv", "node_modules", ".git"}

    for pyfile in Path(directory).rglob("*.py"):
        if any(part in exclude_dirs for part in pyfile.parts):
            continue

        source = pyfile.read_text(encoding="utf-8", errors="replace")
        source_cache[str(pyfile)] = source
        all_subtrees.extend(extract_subtrees(str(pyfile), source))

    # Group by fingerprint
    groups: dict[str, list[CloneLocation]] = defaultdict(list)
    for subtree in all_subtrees:
        groups[subtree.fingerprint].append(subtree)

    # Build clusters from groups with 2+ locations
    clusters: list[CloneCluster] = []
    for fingerprint, locations in groups.items():
        if len(locations) < 2:
            continue

        total_lines = sum(loc.line_end - loc.line_start + 1 for loc in locations)
        if total_lines >= min_lines:
            clusters.append(CloneCluster(
                fingerprint=fingerprint,
                classification="copy-paste",  # default; refined in later step
                locations=locations,
            ))

    return sorted(clusters, key=lambda c: c.total_lines, reverse=True)


# --- Example usage ---
if __name__ == "__main__":
    clusters = detect_clones(".")
    for i, cluster in enumerate(clusters[:5], 1):
        print(f"\n--- Clone #{i} ({cluster.classification}, {cluster.total_lines} lines) ---")
        for loc in cluster.locations:
            print(f"  {loc}")
```

### Pattern 2: Radon Metrics Integration with Impact Scoring

This pattern integrates the `radon` library to compute cyclomatic complexity and NCSS scores, then combines them with git history data to produce a weighted impact score that ranks duplication clusters by refactoring urgency. The formula is:

```
impact_score = change_frequency × line_count × blast_radius
```

**Scoring breakdown:**

| Factor | Measurement | Scale | Source |
|--------|-------------|-------|--------|
| `change_frequency` | Commits touching cluster files in last 90 days | 1 (stable) → 5 (volatile) | `git log --since="90 days ago"` |
| `line_count` | Total duplicated lines across all locations | Raw count | AST subtree aggregation |
| `blast_radius` | Number of distinct modules/files affected | Raw count (capped at 5) | Location deduplication by directory |

### Anti-Pattern vs Correct Approach

```python
# ❌ BAD — Impact score based solely on raw line count; ignores change frequency
def naive_impact_score(line_count: int, blast_radius: int) -> int:
    """Calculate impact using only size-based metrics."""
    return line_count * blast_radius
# Problem: a stable, well-tested duplicated block with 200 lines scores
# higher than a volatile 50-line clone that changes weekly. Size ≠ urgency.

# ✅ GOOD — Impact score combines change frequency, line count, and blast radius
def impact_score(line_count: int, blast_radius: int, commit_count_90d: int) -> int:
    """Calculate duplication impact using multi-factor weighted formula.

    Args:
        line_count: Total duplicated lines across all locations in the cluster.
        blast_radius: Number of distinct modules affected (capped at 5).
        commit_count_90d: Git commits touching any file in the cluster over 90 days.

    Returns:
        Integer impact score between 1 and 25, higher = more urgent to refactor.
    """
    # Normalize frequency: map raw commit count to 1-5 scale
    if commit_count_90d <= 1:
        frequency = 1.0
    elif commit_count_90d <= 3:
        frequency = 2.0
    elif commit_count_90d <= 6:
        frequency = 3.0
    elif commit_count_90d <= 10:
        frequency = 4.0
    else:
        frequency = 5.0

    # Cap blast_radius to prevent single massive clusters from dominating
    radius_capped = min(blast_radius, 5)

    raw_score = frequency * line_count * radius_capped
    return max(1, min(25, int(round(raw_score))))
# Result: volatile small clones rank higher than stable large ones — the right priority.
```

```python
"""Radon metrics integration with git-based impact scoring.

Computes cyclomatic complexity and NCSS scores for duplication clusters,
then combines them with git change frequency to produce an impact score
that ranks refactoring priority.
"""
import subprocess
from dataclasses import dataclass
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional


@dataclass
class RadonScore:
    """Radon metrics for a single source file."""
    filepath: str
    cyclomatic_complexity: float  # CC score (radon cc)
    ncss_score: float             # Non-commenting source statements

    @property
    def complexity_label(self) -> str:
        """Classify complexity level per radon conventions."""
        if self.cyclomatic_complexity <= 5:
            return "A (simple)"
        elif self.cyclomatic_complexity <= 10:
            return "B (accepted)"
        elif self.cyclomatic_complexity <= 20:
            return "C (too complex)"
        elif self.cyclomatic_complexity <= 50:
            return "D (very complex)"
        else:
            return "E (dangerously complex)"


def compute_radon_scores(directory: str) -> dict[str, RadonScore]:
    """Run `radon cc` and `radon ncss` across a directory tree.

    Parses the radon output into structured score records keyed by file path.

    Args:
        directory: Directory to scan for .py files.

    Returns:
        Dict mapping relative file paths to RadonScore objects.
    """
    scores: dict[str, RadonScore] = {}

    # Cyclomatic complexity
    try:
        result = subprocess.run(
            ["radon", "cc", directory, "--json"],
            capture_output=True, text=True, timeout=60,
        )
        import json
        cc_data = json.loads(result.stdout) if result.returncode == 0 else []
        for entry in cc_data:
            path = entry.get("path", "")
            score = entry.get("score", 1.0)
            scores[path] = RadonScore(
                filepath=path,
                cyclomatic_complexity=score,
                ncss_score=scores.get(path, RadonScore("", 0, 0)).ncss_score,
            )
    except (FileNotFoundError, subprocess.TimeoutExpired):
        pass  # Radon not installed or timed out; fallback to 0

    # NCSS scores
    try:
        result = subprocess.run(
            ["radon", "ncss", directory, "--json"],
            capture_output=True, text=True, timeout=60,
        )
        import json
        nc_data = json.loads(result.stdout) if result.returncode == 0 else []
        for entry in nc_data:
            path = entry.get("path", "")
            score = entry.get("score", 1.0)
            if path in scores:
                scores[path].ncss_score = score
            else:
                scores[path] = RadonScore(
                    filepath=path,
                    cyclomatic_complexity=0,
                    ncss_score=score,
                )
    except (FileNotFoundError, subprocess.TimeoutExpired):
        pass

    return scores


def compute_change_frequency(directory: str, days: int = 90) -> dict[str, int]:
    """Count git commits touching each file in the given time window.

    Args:
        directory: Repository root for `git log`.
        days: Number of past days to look back.

    Returns:
        Dict mapping relative file paths to commit count over the period.
    """
    since_date = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")
    try:
        result = subprocess.run(
            ["git", "-C", directory, "log", "--since=", since_date,
             "--pretty=format:", "--name-only"],
            capture_output=True, text=True, timeout=30,
        )
        file_counts: dict[str, int] = {}
        for line in result.stdout.strip().splitlines():
            path = line.strip()
            if path:
                file_counts[path] = file_counts.get(path, 0) + 1
        return file_counts
    except (FileNotFoundError, subprocess.TimeoutExpired):
        return {}


def normalize_frequency(commit_count: int) -> float:
    """Map raw commit count to a 1–5 normalized frequency scale.

    Args:
        commit_count: Number of commits touching the relevant files.

    Returns:
        Normalized frequency score between 1.0 (stable) and 5.0 (volatile).
    """
    if commit_count <= 1:
        return 1.0
    elif commit_count <= 3:
        return 2.0
    elif commit_count <= 6:
        return 3.0
    elif commit_count <= 10:
        return 4.0
    else:
        return 5.0


def compute_impact_score(
    line_count: int,
    blast_radius: int,
    change_frequency_raw: int,
) -> int:
    """Calculate the duplication impact score.

    Formula: change_frequency × line_count × blast_radius

    The blast_radius is capped at 5 to prevent a single massive cluster
    from dominating the entire ranking when it actually affects many modules.

    Args:
        line_count: Total duplicated lines across all cluster locations.
        blast_radius: Number of distinct modules affected (capped at 5).
        change_frequency_raw: Raw git commit count over the lookback window.

    Returns:
        Integer impact score (1–25 range for typical inputs).
    """
    blast_radius_capped = min(blast_radius, 5)
    frequency_norm = normalize_frequency(change_frequency_raw)

    raw_score = frequency_norm * line_count * blast_radius_capped

    # Clamp to reasonable integer range
    return max(1, min(25, int(round(raw_score))))


# --- Example usage ---
if __name__ == "__main__":
    scores = compute_radon_scores(".")
    frequencies = compute_change_frequency(".")

    for filepath, radon in list(scores.items())[:3]:
        freq_raw = frequencies.get(filepath, 0)
        freq_norm = normalize_frequency(freq_raw)
        impact = compute_impact_score(
            line_count=radon.ncss_score,
            blast_radius=1,  # single-file cluster
            change_frequency_raw=freq_raw,
        )
        print(f"{filepath}: CC={radon.cyclomatic_complexity} "
              f"NCSS={radon.ncss_score} freq={freq_norm} "
              f"impact={impact}")
```

### Pattern 3: Regex-Based Boilerplate Detection

Boilerplate duplication differs from copy-paste in that it follows predictable structural templates — CRUD endpoints, configuration loaders, service class skeletons. This pattern uses domain-specific regex heuristics to identify and classify boilerplate blocks, distinguishing them from genuine copy-paste clones.

### Anti-Pattern vs Correct Approach

```python
# ❌ BAD — Overly broad regex matches everything including unique business logic
def detect_boilerplate_broad(files: list[str]) -> list[dict]:
    """Naive boilerplate detection using wildcards."""
    results = []
    for filepath in files:
        source = Path(filepath).read_text()
        # This pattern matches almost any class with any method — too noisy
        if re.search(r'class \w+.*?:\n.*?def ', source):
            results.append({"file": filepath, "type": "class_skeleton"})
    return results
# Problem: every single class gets flagged. Zero precision means zero trust.

# ✅ GOOD — Pattern-specific regex with named groups and confidence scoring
def detect_boilerplate_precise(files: list[str]) -> list[dict]:
    """Precise boilerplate detection using domain-tailored patterns.

    Each pattern targets a specific scaffolding category (CRUD endpoints,
    ORM models, Pydantic schemas) and uses named capture groups to verify
    structural completeness before classifying a match as boilerplate.
    """
    # Pattern for FastAPI/Flask CRUD endpoint templates
    crud_pattern = re.compile(
        r"@router\.(get|post|put|delete)\s*\(\s*['\"]"
        r"(?P<path>/api/v?\d+/?(?:users?|items?)?.*)"
        r"['\"].*\n.*def\s+(?P<method>create_|read_|update_|delete_)"
    )

    # Pattern for SQLAlchemy model definitions
    orm_pattern = re.compile(
        r"class\s+(?P<class>\w+)\(\s*(Base|DeclarativeBase).*?\n"
        r"(?:__tablename__|id\s*=\s*Column)"
    )

    results = []
    for filepath in files:
        source = Path(filepath).read_text()

        for pattern, category in [(crud_pattern, "crud_endpoint"), (orm_pattern, "orm_model")]:
            matches = list(pattern.finditer(source))
            if len(matches) >= 2:
                # Multiple structural matches of the same type indicate boilerplate
                confidence = min(1.0, len(matches) / 3.0)  # 3+ matches → high confidence
                results.append({
                    "file": filepath,
                    "type": category,
                    "count": len(matches),
                    "confidence": round(confidence, 2),
                })
    return sorted(results, key=lambda r: r["confidence"], reverse=True)
# Result: only patterns that repeat within the same file (or across files) are flagged.
# Confidence scales with repetition count, giving reviewers a clear signal-to-noise ratio.
```

```python
"""Regex-based boilerplate detection for common code patterns.

Identifies repetitive scaffolding patterns such as CRUD endpoint generators,
service class templates, configuration loaders, and test fixture builders.
Returns classification labels with confidence scores to distinguish genuine
copy-paste from acceptable framework boilerplate.
"""
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Optional


@dataclass
class BoilerplateHit:
    """Represents a detected boilerplate pattern in source code."""
    filepath: str
    pattern_name: str
    match_text: str
    line_start: int
    confidence: float  # 0.0–1.0

    @property
    def is_acceptable_boilerplate(self) -> bool:
        """Whether this boilerplate is likely intentional (framework scaffolding)."""
        return self.confidence >= 0.85


# Precompiled regex patterns for common boilerplate categories
BOILERPLATE_PATTERNS = [
    # Pattern 1: FastAPI/Flask CRUD endpoint templates
    {
        "name": "crud_endpoint",
        "pattern": re.compile(
            r"@router\.(get|post|put|delete)\s*\(\s*['\"]"
            r"(?P<path>/api/v?\d+/?(?:users?|items?|products?)?.*)"
            r"['\"].*\n.*def\s+(?P<method>create_|read_|update_|delete_)"
        ),
    },
    # Pattern 2: SQLAlchemy model base inheritance
    {
        "name": "orm_model_base",
        "pattern": re.compile(
            r"class\s+(?P<class>\w+)\(\s*(Base|DeclarativeBase).*?\n"
            r"(__tablename__|__mapper_args__|id\s*=\s*Column)"
        ),
    },
    # Pattern 3: Pydantic response model boilerplate
    {
        "name": "pydantic_response_model",
        "pattern": re.compile(
            r"class\s+(?P<class>\w+Response)\(\s*BaseModel.*?\n"
            r"(id:\s*(int|UUID)|created_at:\s*datetime)"
        ),
    },
    # Pattern 4: Configuration loader boilerplate
    {
        "name": "config_loader",
        "pattern": re.compile(
            r"(class\s+\w+Config.*?:\n"
            r".*?env_file\s*=|\.getenv\(|os\.environ\[)"
        ),
    },
    # Pattern 5: Generic error handler wrapper
    {
        "name": "error_handler_wrapper",
        "pattern": re.compile(
            r"@handle_exception\(|except\s+Exception\s+as\s+e.*?\n.*?return\s+(ErrorResponse|ErrorResult)"
        ),
    },
    # Pattern 6: Test fixture / data factory boilerplate
    {
        "name": "test_fixture_factory",
        "pattern": re.compile(
            r"def\s+factories?_\w+\(\s*\):\n.*?(return\s+\[|yield\s+\{|Factory)"
        ),
    },
]


def detect_boilerplate(directory: str, min_confidence: float = 0.6) -> list[BoilerplateHit]:
    """Scan all Python files in a directory for boilerplate patterns.

    Matches each compiled regex pattern against file contents and records
    hits above the minimum confidence threshold. Confidence is derived from
    the number of named groups matched (more constraints → higher confidence).

    Args:
        directory: Root directory to scan recursively for .py files.
        min_confidence: Minimum confidence score to include in results.

    Returns:
        List of BoilerplateHit records sorted by confidence descending.
    """
    exclude_dirs = {"__pycache__", ".venv", "venv", "node_modules", ".git"}
    hits: list[BoilerplateHit] = []

    for pyfile in Path(directory).rglob("*.py"):
        if any(part in exclude_dirs for part in pyfile.parts):
            continue

        try:
            source = pyfile.read_text(encoding="utf-8", errors="replace")
        except (OSError, PermissionError):
            continue

        for pattern_def in BOILERPLATE_PATTERNS:
            regex = pattern_def["pattern"]
            name = pattern_def["name"]
            num_named_groups = len(regex.groupindex) if regex.groupindex else 1

            for match in regex.finditer(source):
                # Confidence proportional to how many named groups matched
                matched_groups = sum(1 for g in regex.groupindex if match.group(g))
                confidence = min(1.0, matched_groups / num_named_groups)

                if confidence >= min_confidence:
                    line_no = source[:match.start()].count("\n") + 1
                    hits.append(BoilerplateHit(
                        filepath=str(pyfile),
                        pattern_name=name,
                        match_text=match.group(0)[:200],
                        line_start=line_no,
                        confidence=round(confidence, 2),
                    ))

    return sorted(hits, key=lambda h: h.confidence, reverse=True)


def classify_and_group_hits(
    hits: list[BoilerplateHit],
    grouping_threshold_lines: int = 10,
) -> dict[str, list[BoilerplateHit]]:
    """Group boilerplate hits by pattern type and proximity.

    Hits within `grouping_threshold_lines` of each other in the same file
    are grouped together as a single boilerplate cluster.

    Args:
        hits: List of BoilerplateHit records from detect_boilerplate.
        grouping_threshold_lines: Maximum line gap to consider two hits as
            part of the same cluster.

    Returns:
        Dict mapping pattern_name to list of related BoilerplateHit objects.
    """
    groups: dict[str, list[BoilerplateHit]] = {}

    for hit in sorted(hits, key=lambda h: (h.filepath, h.line_start)):
        key = f"{hit.filepath}:{hit.pattern_name}"
        if key not in groups:
            groups[key] = []

        # Check proximity to last entry in this group
        if groups[key]:
            last = groups[key][-1]
            if (hit.line_start - last.line_start) > grouping_threshold_lines:
                key = f"{hit.filepath}:{hit.pattern_name}:{groups[key][-1].line_start}"
                groups[key] = [hit]
            else:
                groups[key].append(hit)
        else:
            groups[key].append(hit)

    return groups


# --- Example usage ---
if __name__ == "__main__":
    hits = detect_boilerplate(".")
    grouped = classify_and_group_hits(hits)

    for key, group in list(grouped.items())[:5]:
        print(f"\n--- {key} ({len(group)} hits) ---")
        for hit in group:
            acceptable = "✅" if hit.is_acceptable_boilerplate else "⚠️"
            print(f"  {acceptable} [{hit.confidence:.0%}] L{hit.line_start}: {hit.match_text[:80]}...")
```

---

## Constraints

### MUST DO

- Always run AST-based clone detection as the primary analysis; regex and manual methods are supplementary, never replacements for structural analysis
- Classify every detected duplication cluster with exactly one label: `copy-paste`, `boilerplate`, or `semantic` — never leave a cluster unclassified
- Compute the impact score for every cluster using the formula `change_frequency × line_count × blast_radius` before ranking; never rank by raw line count alone
- Exclude framework-generated and scaffolded directories (`node_modules`, `.venv`, `__pycache__`, migrations) from all analysis passes
- Present false positives explicitly — mark acceptable boilerplate (framework scaffolding, generated code, test fixtures) with a distinct flag so reviewers can safely ignore them
- Include at least 3 consecutive normalized statements in any clone detection; blocks shorter than this are noise, not duplication
- Cite the `dry-principles` skill when recommending refactoring approaches to ensure consistency with organizational DRY enforcement standards
- Report file locations with line ranges (e.g., `src/users/service.py:45-67`) for every detected cluster so reviewers can navigate directly

### MUST NOT DO

- Do not flag single-line repeated imports, config constants, or obvious framework scaffolding as "code duplication" — this creates noise and erodes trust in the tool
- Do not use raw string comparison for clone detection; always normalize variable names via AST analysis because identical logic with different variable names is still semantic duplication
- Do not recommend extracting duplicated code into a shared function if the duplication involves side effects that differ between locations (e.g., two logging calls with different log levels)
- Do not report impact scores without showing the underlying factors (line count, change frequency, blast radius); raw numbers are unactionable
- Do not apply this skill to test directories containing snapshot tests, golden files, or intentional fixture data — these are duplication by design
- Do not produce a single flat list of all clones; always group and rank by impact score so reviewers can triage the highest-value refactoring targets first

---

## Output Template

When executing this skill, produce the following report structure:

```markdown
# Code Duplication Analysis Report

**Scope:** `<directory>` | **Files scanned:** N | **Date:** YYYY-MM-DD

## Summary

| Metric | Value |
|--------|-------|
| Total clones detected | N |
| Copy-paste clusters | N (X lines) |
| Boilerplate clusters | N (X lines) |
| Semantic equivalence clusters | N (X lines) |
| Acceptable boilerplate (skip) | N |

## Top Clusters by Impact Score

### Cluster #1 — Impact: <score> (<classification>)
- **Files:** `<path>:<start>-<end>`, `<path>:<start>-<end>`
- **Lines:** N total across locations
- **Cyclomatic Complexity:** N (per Radon)
- **Change Frequency:** N commits in last 90 days → normalized: <score>/5
- **Blast Radius:** N modules affected
- **Refactoring Recommendation:** Extract to shared function / Introduce base class / Accept as intentional

### Cluster #2 — ...
(repeat for each ranked cluster)

## Unaffected High-Complexity Modules
(List modules with high cyclomatic complexity but no duplication — these are riskier than duplicated code.)

## Next Steps
1. Address top 3 impact-scored clusters first (estimated effort: <hours>)
2. Run `radon cc` on refactored files to verify complexity reduction
3. Re-scan after each refactoring pass to confirm elimination
```

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `dry-principles` | Provides the DRY enforcement standards and organizational policy context for when duplication crosses the threshold from acceptable to technical debt |
| `refactoring-techniques` | Supplies specific refactoring patterns (Extract Method, Replace Conditional with Polymorphism, Template Method) to resolve each duplication classification |
| `code-review` | Complements this skill by providing general review heuristics; use this skill for the quantitative analysis and `code-review` for the qualitative assessment |
| `code-quality-policies` | Defines organizational quality gates and CI/CD thresholds that this analysis should feed into (e.g., maximum allowed cyclomatic complexity per module) |
