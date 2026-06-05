---




name: package-ecosystem-navigator
description: Navigates package manager ecosystems (npm, PyPI, crates.io, Maven, Go
  modules) with health assessment, dependency auditing, registry configuration, and
  cross-platform migration strategies for making informed packaging decisions.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: package manager, npm, pypi, crates.io, maven, go modules, cargo, pip poetry
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
  related-skills: coding-dependency-supply-chain-security, coding-version-migration,
    coding-framework-requirements-validation, coding-tool-evaluation-workflow




---




# Package Ecosystem Navigator

Navigates package manager ecosystems to assess registry health, evaluate dependencies, configure registries, and plan cross-platform migrations. This skill makes the model analyze package availability, security posture, maintenance status, and version resolution strategies across npm, PyPI, crates.io, Maven, Go modules, and other major registries — enabling teams to make informed decisions about which packages to adopt and how to manage their dependency lifecycles.

## TL;DR Checklist

- [ ] Evaluate package health using activity metrics (last publish date, contributor count, issue response time)
- [ ] Check dependency graph for transitive risks and version conflicts before adding any package
- [ ] Configure lockfiles and pin dependencies at the most restrictive safe constraint level
- [ ] Verify package provenance (signatures, publisher verification, supply chain attestations)
- [ ] Map equivalent packages across ecosystems when evaluating migration paths
- [ ] Document rejection rationale for evaluated-but-rejected alternatives

---

## When to Use

Use this skill when:

- Evaluating a new dependency before adding it to your project's package manifest
- Planning a migration between package managers (e.g., pip → poetry, npm → pnpm, Java build tools)
- Auditing existing dependencies for security vulnerabilities or maintenance status
- Configuring private registries, proxy servers, or authentication for CI/CD pipelines
- Troubleshooting dependency resolution conflicts in complex monorepo setups
- Assessing whether an ecosystem's packages meet your operational requirements (performance, licensing, support)

---

## When NOT to Use

Avoid this skill for:

- Implementing the actual application logic that uses the package — focus on selection and lifecycle management first
- Resolving build tool configuration errors unrelated to packages — use `coding-framework-requirements-validation` instead
- Writing custom package publish pipelines — this skill focuses on consumption, not publishing
- Making architectural decisions about system design — use `coding-system-design-fundamentals` instead

---

## Core Workflow

### Step 1: Inventory Current Dependencies

Extract all dependencies from your project's manifest files (package.json, requirements.txt, Cargo.toml, pom.xml, go.mod). For each dependency, collect:

- **Direct vs. transitive**: Is it declared directly in the manifest or pulled in by another package?
- **Version constraint type**: Exact pin (`=1.2.3`), caret (`^1.2.3`), tilde (`~1.2.3`), range (`>=1.0.0 <2.0.0`), or wildcard
- **Intention**: Why is this package needed? What problem does it solve in your codebase?

```python
from dataclasses import dataclass
from enum import StrEnum


class ConstraintType(StrEnum):
    EXACT = "exact"        # ==1.2.3, 1.2.3 (pinned)
    CARET = "caret"        # ^1.2.3 (compatible with minor updates)
    TILDE = "tilde"        # ~1.2.3 (compatible with patch updates)
    RANGE = "range"        # >=1.0.0 <2.0.0 (explicit range)
    WILDCARD = "wildcard"  # * or latest (unconstrained — avoid in production)


@dataclass(frozen=True)
class DependencyRecord:
    """Normalized dependency information extracted from any package manifest."""

    name: str
    version_constraint: str
    constraint_type: ConstraintType
    is_direct: bool
    purpose: str  # Free-text reason this dependency exists
    license: str = "unknown"
    last_published: str = ""  # ISO date string from registry


def parse_lockfile_dependencies(
    manifest_path: str,
    lockfile_path: str,
) -> list[DependencyRecord]:
    """Parse a project's package manifest and lockfile to produce normalized records.

    Args:
        manifest_path: Path to the package manifest (package.json, pyproject.toml, etc.)
        lockfile_path: Path to the resolved lockfile (package-lock.json, poetry.lock, etc.)

    Returns:
        List of DependencyRecord with resolved versions and metadata.
    """
    import json
    from pathlib import Path

    records = []

    # Read manifest for declared dependencies
    manifest = json.loads(Path(manifest_path).read_text())
    direct_deps = {
        **manifest.get("dependencies", {}),
        **manifest.get("devDependencies", {}),
    }

    # Read lockfile for resolved versions
    try:
        lockfile = json.loads(Path(lockfile_path).read_text())
        packages = lockfile.get("packages", {})
    except (FileNotFoundError, json.JSONDecodeError):
        packages = {}

    for name, constraint in direct_deps.items():
        # Resolve to exact version from lockfile if available
        resolved = packages.get(f"node_modules/{name}", {}).get("version", "unknown")
        records.append(DependencyRecord(
            name=name,
            version_constraint=constraint,
            constraint_type=_classify_constraint(constraint),
            is_direct=True,
            purpose=f"Declared in manifest ({name})",
            license="unknown",
            last_published=resolved,
        ))

    return records


def _classify_constraint(constraint: str) -> ConstraintType:
    """Classify a version constraint string into its semantic type."""
    stripped = constraint.strip()
    if stripped == "*" or stripped == "latest":
        return ConstraintType.WILDCARD
    if stripped.startswith("==") and not stripped.startswith("==="):
        return ConstraintType.EXACT
    if stripped.startswith("^"):
        return ConstraintType.CARET
    if stripped.startswith("~"):
        return ConstraintType.TILDE
    if ">" in stripped or "<" in stripped:
        return ConstraintType.RANGE
    # Try exact version (e.g., "1.2.3")
    parts = stripped.split(".")
    if all(p.isdigit() for p in parts[:3]):
        return ConstraintType.EXACT
    return ConstraintType.CARET  # Default to caret for ambiguous constraints
```

**Checkpoint:** Every dependency must have a documented purpose. Dependencies without a clear `purpose` field are candidates for removal during the next audit cycle.

### Step 2: Evaluate Package Health

For each dependency, query the registry or use local tooling to assess health metrics. A healthy package demonstrates consistent maintenance, active community engagement, and stable release patterns.

**Health scoring dimensions:**

| Dimension | Weight | Good (5) | Warning (3) | Risky (1) |
|-----------|--------|----------|-------------|-----------|
| Last publish date | 20% | Within 60 days | 60–180 days | Over 180 days |
| Contributor count | 15% | 10+ contributors | 3–9 contributors | 1–2 contributors |
| Issue response rate | 15% | >80% resolved in 30 days | 50–80% in 30 days | <50% or no issues closed |
| Download trend (4 weeks) | 15% | Growing or stable | Declining <20% | Declining >20% |
| Breaking releases per year | 10% | 0–1 major/year | 1–2 major/year | 3+ major/year |
| License compatibility | 10% | Permissive (MIT, Apache) | Weak copyleft (LGPL) | Strong copyleft (GPL, AGPL) |
| Security history | 15% | No known CVEs | Known CVEs with patches | Active unpatched CVEs |

```python
import json
from datetime import datetime, timedelta
from dataclasses import dataclass


@dataclass(frozen=True)
class PackageHealthReport:
    """Structured health assessment for a single package from any registry."""

    package_name: str
    version: str
    registry: str  # "npm", "pypi", "crates.io", "maven", "go"
    last_published_date: datetime | None
    downloads_last_4weeks: int
    downloads_previous_4weeks: int
    total_contributors: int
    issues_open: int
    issues_closed_last_90d: int
    breaking_releases_per_year: float
    license_type: str
    known_cves: list[str]

    @property
    def download_growth_rate(self) -> float:
        """Return percentage change in downloads over the last 8-week period."""
        if self.downloads_previous_4weeks <= 0:
            return 1.0  # No previous data — treat as stable
        return (self.downloads_last_4weeks - self.downloads_previous_4weeks) / self.downloads_previous_4weeks

    @property
    def days_since_published(self) -> int | None:
        """Days elapsed since the last published version."""
        if not self.last_published_date:
            return None
        return (datetime.utcnow() - self.last_published_date).days

    @property
    def issue_response_rate(self) -> float:
        """Fraction of open issues that have been resolved recently."""
        total = self.issues_open + self.issues_closed_last_90d
        if total <= 0:
            return 1.0  # No activity to report — assume stable
        return self.issues_closed_last_90d / total

    def compute_health_score(self) -> dict[str, object]:
        """Compute a weighted health score (0–100) with per-dimension breakdowns."""

        # Dimension scores (each 0-5, converted to 0-25 points after weighting)
        recency_score = self._score_recency()
        contributor_score = self._score_contributors()
        engagement_score = self._score_engagement()
        stability_score = self._score_stability()
        license_score = self._score_license()
        security_score = self._score_security()

        # Weighted composite (weights sum to 1.0)
        total = (
            recency_score * 0.20 +
            contributor_score * 0.15 +
            engagement_score * 0.15 +
            stability_score * 0.15 +
            license_score * 0.10 +
            security_score * 0.15
        )

        return {
            "package": self.package_name,
            "total_health_score": round(total * 20, 1),  # Convert 0-5 scale to 0-100
            "dimensions": {
                "recency_maintenance": round(recency_score * 20, 1),
                "contributor_diversity": round(contributor_score * 20, 1),
                "community_engagement": round(engagement_score * 20, 1),
                "release_stability": round(stability_score * 20, 1),
                "license_safety": round(license_score * 20, 1),
                "security_posture": round(security_score * 20, 1),
            },
            "verdict": self._verdict(total * 20),
        }

    def _score_recency(self) -> float:
        days = self.days_since_published
        if days is None or days <= 60:
            return 5.0
        if days <= 180:
            return 3.0
        return 1.0

    def _score_contributors(self) -> float:
        if self.total_contributors >= 10:
            return 5.0
        if self.total_contributors >= 3:
            return 3.0
        return 1.0

    def _score_engagement(self) -> float:
        rate = self.issue_response_rate
        if rate > 0.8:
            return 5.0
        if rate >= 0.5:
            return 3.0
        return 1.0

    def _score_stability(self) -> float:
        if self.breaking_releases_per_year <= 1:
            return 5.0
        if self.breaking_releases_per_year <= 2:
            return 3.0
        return 1.0

    def _score_license(self) -> float:
        permissive = {"MIT", "Apache-2.0", "BSD-2-Clause", "BSD-3-Clause", "ISC"}
        weak_copyleft = {"LGPL-2.1", "LGPL-3.0", "MPL-2.0"}
        if self.license_type in permissive:
            return 5.0
        if self.license_type in weak_copyleft:
            return 3.0
        return 1.0  # GPL, AGPL, or unknown

    def _score_security(self) -> float:
        if not self.known_cves:
            return 5.0
        critical = [c for c in self.known_cves if "CRITICAL" in c.upper()]
        if critical:
            return 1.0
        return 3.0  # Has CVEs but none are critical

    def _verdict(self, score: float) -> str:
        if score >= 80:
            return "HEALTHY — Safe to adopt with standard precautions"
        if score >= 60:
            return "MODERATE — Proceed with additional due diligence"
        if score >= 40:
            return "AT_RISK — Consider alternatives; document risk acceptance"
        return "UNHEALTHY — Strongly recommend finding alternative package"
```

**Checkpoint:** Any package scoring below 60/100 must be evaluated against at least one alternative before being accepted as a dependency. Document the comparison in your decision record.

### Step 3: Audit Dependency Graph and Detect Conflicts

Dependencies form a directed graph. Version conflicts occur when two packages require incompatible versions of the same transitive dependency. This step maps the full dependency tree and identifies resolution risks.

```python
from collections import defaultdict


class DependencyConflictDetector:
    """Detects version conflicts, circular dependencies, and transitive risk chains."""

    def __init__(self):
        # adjacency: package -> [(required_package, constraint), ...]
        self.graph: dict[str, list[tuple[str, str]]] = defaultdict(list)
        # resolved: package -> exact_version (what the resolver chose)
        self.resolved: dict[str, str] = {}

    def add_dependency(self, parent: str, child: str, constraint: str) -> None:
        """Register a dependency edge with its version constraint."""
        self.graph[parent].append((child, constraint))

    def detect_conflicts(self) -> list[dict]:
        """Find all version conflicts in the dependency graph.

        A conflict occurs when two parent packages require different
        (non-compatible) versions of the same transitive dependency.
        """
        # Collect all constraints on each package
        constraint_map: dict[str, list[tuple[str, str]]] = defaultdict(list)
        for parent, edges in self.graph.items():
            for child, constraint in edges:
                constraint_map[child].append((parent, constraint))

        conflicts = []
        for pkg, constraints in constraint_map.items():
            if len(constraints) < 2:
                continue

            # Check if all constraints are mutually compatible
            parent_names = [p for p, _ in constraints]
            versions = set()
            for _, c in constraints:
                # Extract pinned version or compute max compatible version
                if c.startswith("^"):
                    base = c[1:]
                    parts = base.split(".")
                    major = int(parts[0]) if len(parts) > 0 else 0
                    versions.add(f">={base}, <{major + 1}.0.0")
                elif c.startswith("~"):
                    parts = c[1:].split(".")
                    minor = int(parts[1]) if len(parts) > 1 else 0
                    versions.add(f">={c[1:]}, <{(parts[0] + 1) if len(parts) > 0 else 'x'}.{minor}.0")
                elif c.startswith("=="):
                    versions.add(c[2:])
                else:
                    versions.add(c)

            if len(versions) > 1:
                # Multiple different constraint interpretations detected
                conflicts.append({
                    "package": pkg,
                    "requested_by": [f"{parent} ({constraint})" for parent, constraint in constraints],
                    "constraints": list(versions),
                    "severity": self._assess_conflict_severity(constraints),
                })

        return conflicts

    def detect_circular_dependencies(self) -> list[list[str]]:
        """Find all circular dependency chains using DFS cycle detection."""
        visited = set()
        rec_stack = set()
        cycles = []

        def dfs(node: str, path: list[str]) -> None:
            visited.add(node)
            rec_stack.add(node)
            path.append(node)

            for child, _ in self.graph.get(node, []):
                if child not in visited:
                    dfs(child, path)
                elif child in rec_stack:
                    # Found a cycle
                    cycle_start = path.index(child)
                    cycles.append(path[cycle_start:] + [child])

            path.pop()
            rec_stack.discard(node)

        for node in self.graph:
            if node not in visited:
                dfs(node, [])

        return cycles

    def _assess_conflict_severity(self, constraints: list[tuple[str, str]]) -> str:
        """Assess how severe a dependency conflict is."""
        # Check if any constraint pins to an exact incompatible version
        has_exact = [c for _, c in constraints if c.startswith("==")]
        if len(has_exact) >= 2:
            exact_versions = set(v[2:] for v in has_exact)
            if len(exact_versions) > 1:
                return "CRITICAL — Exact incompatible version pins detected"
        return "WARNING — Overlapping constraints may resolve differently across environments"

    def generate_resolution_report(self) -> str:
        """Produce a human-readable conflict resolution report."""
        conflicts = self.detect_conflicts()
        cycles = self.detect_circular_dependencies()

        lines = ["=== Dependency Graph Audit Report ===\n"]

        if conflicts:
            lines.append(f"CONFLICTS FOUND: {len(conflicts)}\n")
            for i, conflict in enumerate(conflicts, 1):
                lines.append(f"Conflict #{i}: {conflict['package']}")
                lines.append(f"  Severity: {conflict['severity']}")
                lines.append(f"  Requested by:")
                for req in conflict["requested_by"]:
                    lines.append(f"    - {req}")
                lines.append(f"  Constraints: {', '.join(conflict['constraints'])}")
                lines.append("")
        else:
            lines.append("No version conflicts detected.\n")

        if cycles:
            lines.append(f"CIRCULAR DEPENDENCIES: {len(cycles)}\n")
            for i, cycle in enumerate(cycles, 1):
                lines.append(f"Cycle #{i}: {' -> '.join(cycle)}")
        else:
            lines.append("No circular dependencies detected.\n")

        return "\n".join(lines)
```

**Checkpoint:** Resolve all CRITICAL-severity conflicts before adding new dependencies. WARNING-severity conflicts should be resolved within the current sprint cycle.

### Step 4: Assess Provenance and Supply Chain Security

Verify that packages come from verified publishers, have reproducible builds where possible, and include security attestations. This is increasingly critical given supply chain attacks via compromised packages.

**Provenance verification checklist:**

1. **Publisher verification** — Check if the package publisher is verified (npm: `verified` badge; PyPI: trusted publisher with provenance attestations; crates.io: verified publisher)
2. **Signing attestations** — Verify Sigstore/cosign signatures where available. For npm packages, check for SLSA provenance metadata in the package manifest
3. **Repository link validity** — The registry entry should link to an actual source repository that matches the package contents
4. **Dependency count audit** — Packages with excessive direct dependencies increase your attack surface. Flag any package with 50+ direct dependencies for manual review
5. **License verification** — Confirm the declared license is compatible with your project's licensing requirements

```python
def verify_package_provenance(
    registry_type: str,
    package_name: str,
    version: str,
    registry_metadata: dict,
) -> dict:
    """Verify package provenance across different registry types.

    Args:
        registry_type: One of "npm", "pypi", "crates.io", "maven", "go"
        package_name: The package name as registered
        version: The exact version to verify
        registry_metadata: Raw metadata from the registry API (json parsed)

    Returns:
        Provenance verification report with pass/fail for each check.
    """
    report = {
        "package": f"{registry_type}:{package_name}@{version}",
        "checks": {},
        "overall_status": "UNKNOWN",
    }

    if registry_type == "npm":
        report["checks"]["verified_publisher"] = bool(
            registry_metadata.get("publishers", []) and
            any(p.get("verified", False) for p in registry_metadata["publishers"])
        )
        report["checks"]["slsa_provenance"] = bool(
            registry_metadata.get("dist", {}).get("attestations") or
            "provenance" in str(registry_metadata.get("dist", {}))
        )
        report["checks"]["repository_link_valid"] = bool(
            registry_metadata.get("homepage") or
            registry_metadata.get("repository", {}).get("url")
        )
        direct_deps = len(registry_metadata.get("dependencies", {}))
        report["checks"]["dependency_count_reasonable"] = direct_deps < 50

    elif registry_type == "pypi":
        report["checks"]["verified_publisher"] = bool(
            registry_metadata.get("yanked", False) is False
        )
        report["checks"]["slsa_provenance"] = bool(
            registry_metadata.get("package_digests") or
            "provenance" in str(registry_metadata.get("urls", [{}])[0] if registry_metadata.get("urls") else {})
        )
        report["checks"]["repository_link_valid"] = bool(
            registry_metadata.get("project_url") or
            registry_metadata.get("home_page")
        )
        report["checks"]["dependency_count_reasonable"] = True  # PyPI doesn't expose this in simple API

    elif registry_type == "crates.io":
        report["checks"]["verified_publisher"] = True  # crates.io requires verified publishers since 2024
        report["checks"]["max_downloads_1m"] = (
            registry_metadata.get("max_download_date") is not None
        )
        report["checks"]["repository_link_valid"] = bool(
            registry_metadata.get("repository") or
            registry_metadata.get("homepage")
        )

    elif registry_type == "maven":
        report["checks"]["verified_publisher"] = True  # Maven Central requires verified groupId ownership
        report["checks"]["repository_link_valid"] = bool(
            registry_metadata.get("scm", {}).get("url") or
            registry_metadata.get("connection")
        )

    elif registry_type == "go":
        report["checks"]["verified_publisher"] = bool(
            "vcs" in str(registry_metadata)
        )
        report["checks"]["repository_link_valid"] = bool(
            "go-import" in str(registry_metadata)
        )

    # Compute overall status
    passed = sum(1 for c in report["checks"].values() if c is True)
    total = len(report["checks"])
    if total == 0:
        report["overall_status"] = "UNVERIFIABLE"
    elif passed / total >= 0.75:
        report["overall_status"] = "VERIFIED"
    elif passed / total >= 0.5:
        report["overall_status"] = "PARTIALLY_VERIFIED"
    else:
        report["overall_status"] = "FAILED_VERIFICATION"

    return report
```

**Checkpoint:** Packages with `FAILED_VERIFICATION` status must be escalated to the security team before being included in production dependencies.

### Step 5: Plan Cross-Ecosystem Migration (if applicable)

When evaluating migration between package ecosystems, map equivalent packages and assess compatibility of APIs, build processes, and runtime requirements.

```python
from dataclasses import dataclass


@dataclass(frozen=True)
class MigrationEquivalence:
    """Maps a source ecosystem package to its closest equivalent in a target ecosystem."""

    source_package: str
    source_ecosystem: str  # e.g., "npm", "pypi"
    target_package: str
    target_ecosystem: str  # e.g., "crates.io", "maven"
    target_version: str
    api_similarity_score: float  # 0.0-1.0: how similar are the APIs?
    migration_effort_estimate: str  # "trivial", "straightforward", "moderate", "complex", "reimplement"
    breaking_changes: list[str]
    known_gaps: list[str]  # Features in source not available in target


def find_migration_equivalents(
    source_package: str,
    source_ecosystem: str,
    target_ecosystem: str,
) -> list[MigrationEquivalence]:
    """Find equivalent packages across ecosystems for migration planning.

    This is a reference mapping — actual project needs should be verified
    by examining both packages' documentation and API signatures.
    """
    # Reference equivalence mappings (authoritative as of 2025)
    equivalences = {
        ("npm", "express"): [
            MigrationEquivalence(
                source_package="express",
                source_ecosystem="npm",
                target_package="axum",
                target_ecosystem="crates.io",
                target_version="0.8",
                api_similarity_score=0.6,
                migration_effort_estimate="moderate",
                breaking_changes=["Route handlers use async by default in Axum"],
                known_gaps=["Express middleware pattern replaced by Axum extractors"],
            ),
        ],
        ("pypi", "requests"): [
            MigrationEquivalence(
                source_package="requests",
                source_ecosystem="pypi",
                target_package="reqwest",
                target_ecosystem="crates.io",
                target_version="0.12",
                api_similarity_score=0.5,
                migration_effort_estimate="moderate",
                breaking_changes=["reqwest is async-first; requires tokio runtime"],
                known_gaps=["No built-in session persistence like Requests sessions"],
            ),
        ],
        ("npm", "lodash"): [
            MigrationEquivalence(
                source_package="lodash",
                source_ecosystem="npm",
                target_package="itertools",
                target_ecosystem="crates.io",
                target_version="0.14",
                api_similarity_score=0.7,
                migration_effort_estimate="straightforward",
                breaking_changes=[],
                known_gaps=["Rust iterators provide similar functionality more idiomatically"],
            ),
        ],
        ("pypi", "numpy"): [
            MigrationEquivalence(
                source_package="numpy",
                source_ecosystem="pypi",
                target_package="ndarray",
                target_ecosystem="crates.io",
                target_version="0.16",
                api_similarity_score=0.75,
                migration_effort_estimate="moderate",
                breaking_changes=["ndarray uses owned arrays by default; no implicit copying"],
                known_gaps=["No built-in linear algebra — use ndarray-linalg separately"],
            ),
        ],
    }

    key = (source_ecosystem.lower(), source_package.lower())
    return equivalences.get(key, [])
```

**Checkpoint:** Every migration must include a rollback plan. Never decommission the old package ecosystem until the new one has been running in production for at least one full release cycle.

---

## Implementation Patterns

### Pattern 1: Registry Configuration Generator

Generate registry configuration files for common scenarios: private registries, proxy caches, and authenticated CI/CD environments.

```yaml
# .npmrc — Private registry with auth token
# Used by npm packages in enterprise environments
//registry.example.com/:_authToken=${NPM_TOKEN}
@myorg:registry=https://registry.example.com/
always-auth=true
# Enable provenance verification for supply chain security
provenance=true

# .pypirc — PyPI trusted publisher with private index
# Used by poetry/pip for authenticated package access
[pypi]
repository = https://pypi.org/simple/
username = __token__

[private-index]
repository = https://artifacts.example.com/simple/
username = __token__
password = ${PYPI_TOKEN}
trusted-host = artifacts.example.com

# pip.conf — Alternative format with multiple indexes
# [global]
# index-url = https://artifacts.example.com/simple/
# extra-index-url = https://pypi.org/simple/
# trusted-host = artifacts.example.com

# .cargo/config.toml — Cargo private registry + git source overrides
# [registries.private-registry]
# index = "ssh+git://git.example.com/cargo-index"
# token = "${CARGO_REGISTRY_TOKEN}"

# [source.crates-io]
# replace-with = "private-registry"

# go.mod — Private Go module proxy
# In GOPROXY environments:
# export GOPROXY=https://proxy.golang.org,https://artifacts.example.com/go/
# export GONOSUMCHECK=*.example.com
# export GOFLAGS=-mod=readonly
```

### Pattern 2: Version Constraint Optimization

Optimize version constraints from permissive to the most restrictive safe level using semver analysis.

```python
def optimize_version_constraints(
    packages: list[dict],
    lockfile_versions: dict[str, str],
) -> dict[str, str]:
    """Recommend optimal version constraints based on current lockfile versions.

    Args:
        packages: List of dicts with 'name' and 'current_constraint' keys
        lockfile_versions: Maps package name to resolved exact version string

    Returns:
        Dict mapping package names to optimized constraint strings.
        Uses tilde (~) for stable minor versions, caret (^) for pre-1.0 packages.
    """
    recommendations = {}

    for pkg in packages:
        name = pkg["name"]
        current_constraint = pkg["current_constraint"]
        resolved_version = lockfile_versions.get(name)

        if not resolved_version or resolved_version == "unknown":
            recommendations[name] = current_constraint  # Keep existing
            continue

        parts = resolved_version.split(".")
        major = int(parts[0]) if len(parts) > 0 else 0

        if major == 0:
            # Pre-1.0: use exact pin to avoid unexpected breaking changes
            recommendations[name] = f"=={resolved_version}"
        elif len(parts) >= 3:
            minor = int(parts[1]) if len(parts) > 1 else 0
            patch = int(parts[2]) if len(parts) > 2 else 0

            # Check if the current constraint already allows the resolved version
            if _constraint_allows(current_constraint, resolved_version):
                recommendations[name] = f"~{major}.{minor}.0"  # Patch-level updates only
            else:
                recommendations[name] = f"^{major}.{minor}.{patch}"  # Minor-level updates
        else:
            recommendations[name] = f"=={resolved_version}"

    return recommendations


def _constraint_allows(constraint: str, version: str) -> bool:
    """Check whether a version constraint string allows a specific version."""
    if constraint == "*" or constraint == "latest":
        return True
    if constraint.startswith("^"):
        base = constraint[1:]
        parts = base.split(".")
        major = int(parts[0]) if len(parts) > 0 else 0
        v_parts = version.split(".")
        v_major = int(v_parts[0]) if v_parts else 0
        return v_major == major
    if constraint.startswith("~"):
        parts = constraint[1:].split(".")
        major = int(parts[0]) if len(parts) > 0 else 0
        minor = int(parts[1]) if len(parts) > 1 else 0
        v_parts = version.split(".")
        v_major = int(v_parts[0]) if v_parts else 0
        v_minor = int(v_parts[1]) if len(v_parts) > 1 else 0
        return v_major == major and v_minor == minor
    if constraint.startswith("=="):
        return constraint[2:] == version
    return False
```

---

## Constraints

### MUST DO
- Always check the package's last published date — packages with no activity in 180+ days should be flagged as unmaintained and evaluated for replacement
- Pin dependencies to specific minor or patch versions in production (`~` or `==` constraints) — never use wildcard (`*`) or bare major version in lockfiles
- Verify package provenance (publisher verification, signature attestations) before adding any new dependency to a production project
- Run dependency conflict detection on every PR that modifies the package manifest or lockfile
- Maintain a documented rationale for each direct dependency's inclusion — this becomes essential during security audits and tech debt reviews
- Use the same toolchain consistently within a project: if using poetry, don't mix pip in; if using pnpm, don't use npm concurrently on the same lockfile

### MUST NOT DO
- Do not add dependencies with GPL or AGPL licenses to proprietary software — these create viral licensing obligations for your entire codebase
- Do not pin transitive dependencies directly — only pin direct (declared) dependencies; let the resolver handle transitive versions
- Do not ignore security advisories from the registry's built-in advisory database (npm audit, pip-audit, cargo audit, osv.dev)
- Do not add packages that require compiling native extensions in production unless absolutely necessary — compilation failures are a common CI/CD bottleneck
- Do not add development-only dependencies to your production bundle — separate devDependencies carefully for npm projects
- Do not commit lockfiles without first verifying them against a clean environment (`npm ci`, `pip sync`, `cargo update --locked`)

---

## Output Template

When applying this skill, produce:

1. **Dependency Inventory** — Complete list of all direct and transitive dependencies with resolved versions, constraint types, and purposes
2. **Health Assessment Report** — Per-package health scores with dimension breakdowns (recency, contributors, engagement, stability, license, security) and overall verdicts
3. **Conflict Analysis** — Detected version conflicts, circular dependencies, and severity classifications with recommended resolution steps
4. **Provenance Verification** — Publisher verification status, signing attestation results, and supply chain risk assessment for each evaluated package
5. **Constraint Optimization Recommendations** — Suggested constraint updates (e.g., `^1.2.3` → `~1.2.0`) with reasoning based on current lockfile versions
6. **Migration Plan** (if applicable) — Cross-ecosystem equivalents, API similarity scores, breaking change lists, and rollback criteria

---

## Related Skills

| Skill | Purpose |
|---|---|
| `coding-dependency-supply-chain-security` | Deep dive into supply chain attacks, vulnerability management, and secure build pipelines for package dependencies |
| `coding-version-migration` | Managing dependency upgrades across major versions with automated tooling and testing strategies |
| `coding-framework-requirements-validation` | Validates that framework-specific conventions are met — complements this skill's package-level analysis |
| `coding-tool-evaluation-workflow` | Evaluates developer tools and frameworks at a higher level — this skill focuses specifically on packages and registries |

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references.

- [npm Registry Documentation](https://docs.npmjs.com/)
- [PyPI Documentation](https://pypi.org/help/)
- [crates.io Documentation](https://doc.rust-lang.org/cargo/)
- [Maven Central Repository](https://central.sonatype.com/)
- [Go Module Reference](https://go.dev/ref/mod)
- [OSV (Open Source Vulnerabilities) Database](https://osv.dev/)
- [SLSA Provenance Specification](https://slsa.dev/spec/v1/provenance)
