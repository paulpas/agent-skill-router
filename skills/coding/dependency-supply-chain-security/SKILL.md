---
name: dependency-supply-chain-security
description: Implements end-to-end software dependency supply chain security including
  SBOM generation (SPDX/CycloneDX), SLSA attestation levels, exact version pinning,
  Sigstore/cosign verification, CI scanning pipelines, transitive vulnerability management,
  and reproducible build patterns.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: SBOM, SLSA, sigstore, cosign, supply chain attack, dependency pinning,
    how do i secure my dependencies, package signing
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
  related-skills: dependency-management, review
------
# Dependency Supply Chain Security

Implements comprehensive supply chain security controls across the software dependency lifecycle — from generating SBOMs and signing artifacts to verifying signatures in CI, pinning versions, scanning transitive vulnerabilities, and building reproducible outputs. This skill covers every layer of defense against modern supply chain attacks like log4shell and the xz backdoor.

## TL;DR Checklist

- [ ] Generate SBOM (SPDX or CycloneDX) on every build
- [ ] Pin all dependencies to exact versions with lockfiles
- [ ] Verify package signatures (Sigstore/cosign) before install
- [ ] Scan for vulnerabilities including transitive dependencies in CI
- [ ] Configure fail-on-critical policy for dependency scanning gates
- [ ] Implement SLSA Level 2+ provenance attestation
- [ ] Use patch files or override mechanisms for vulnerable transitive deps
- [ ] Build artifacts reproducibly for deterministic outputs

---

## When to Use

Use this skill when:

- Setting up supply chain security for a new project or service
- Responding to a supply chain attack affecting your ecosystem (e.g., xz, log4shell)
- Meeting compliance requirements (SOC2, ISO 27001, NIST SSDF, Executive Order 14028)
- You need to generate and sign SBOMs for regulatory or customer mandates
- A CI/CD pipeline is missing dependency scanning, pinning, or provenance attestation
- An audit reveals unpinned dependencies or missing transitive vulnerability checks
- Your organization requires SLSA attestation Level 2 or higher

---

## When NOT to Use

Avoid applying the full suite when:

- Prototyping a throwaway PoC with no deployment target (pinning is still good, but SBOM/signing overhead is not justified)
- Working in an air-gapped environment where internet-based verification tools are unreachable — use internal package proxies instead
- Managing build tool dependencies only (e.g., webpack, pytest) where supply chain risk is negligible — though pinning still applies
- The project uses a fully managed SaaS platform that handles signing and SBOM generation internally (verify their claims first)

---

## Core Workflow

1. **Inventory Dependencies** — Generate a current dependency tree with exact versions using `npm ls`, `pip freeze`, or `go list -m all`. Identify direct vs transitive dependencies, registry sources, and update frequency. **Checkpoint:** Every dependency must have an exact version string — no ranges like `^` or `~` in the final lockfile.

2. **Pin to Exact Versions** — Convert all version constraints to exact pins in your package manifests. Generate lockfiles for every ecosystem. Never commit a project without a lockfile checked into version control. **Checkpoint:** Run a clean install from lockfile only (`npm ci`, `pip sync`/`poetry install`, `go mod download`) and verify the tree matches exactly.

3. **Generate SBOM** — Produce a Software Bill of Materials in SPDX or CycloneDX JSON format on every build. Upload to artifact storage or a vulnerability scanner backend so the SBOM is available for scanning against CVE databases. **Checkpoint:** SBOM must include every transitive dependency, not just direct ones.

4. **Scan Dependencies** — Run comprehensive vulnerability scanning including transitive dependencies in CI. Use at least one SCA tool (Snyk, Dependabot, Trivy, or osv-scanner) with a fail-on-critical policy. Configure severity thresholds appropriate for your risk profile. **Checkpoint:** No CRITICAL or HIGH vulnerabilities may pass the gate — MEDIUM and LOW should trigger alerts but not block CI.

5. **Verify Signatures** — Before installing packages from registries in production environments, verify package signatures using Sigstore/cosign when available. For ecosystems that support it (Go module proxies, npm provenance), validate the signature chain before build proceeds. **Checkpoint:** Signature verification must be enforced at build time — not just development time.

6. **Attest Provenance (SLSA)** — Generate SLSA compliance attestation for your build artifacts. Start with Level 2 (provenance generated in CI), target Level 3 (verifier is the build service itself, one-time build). Document which level each artifact meets and why. **Checkpoint:** Build provenance must be machine-readable (in-toto attestation) and verifiable independently.

7. **Enforce Reproducible Builds** — Configure builds to produce deterministic outputs. Pin tool versions, strip non-deterministic metadata, and verify by rebuilding the same source from scratch. **Checkpoint:** Rebuilt artifact hash must match the original within your defined reproducibility tolerance.

---

## Implementation Patterns / Reference Guide

### Pattern 1: SBOM Generation (SPDX and CycloneDX)

SBOMs provide a machine-readable inventory of all software components. SPDX is widely adopted in regulated industries; CycloneDX is preferred for OWASP tooling and SCA integrations.

#### SPDX 2.3 JSON Format — Real Example

```json
{
  "spdxVersion": "SPDX-2.3",
  "dataLicense": "CC0-1.0",
  "SPDXID": "SPDXRef-DOCUMENT",
  "name": "my-service",
  "documentNamespace": "https://spdx.org/spdxdocs/my-service-20250115",
  "creationInfo": {
    "created": "2025-01-15T10:30:00Z",
    "creators": ["Tool: syft v0.98.0"],
    "licenseListVersion": "3.20"
  },
  "packages": [
    {
      "SPDXID": "SPDXRef-Package-pip-flask-3.0.0",
      "name": "flask",
      "versionInfo": "3.0.0",
      "downloadLocation": "NOASSERTION",
      "licenseConcluded": "BSD-3-Clause",
      "copyrightText": "NOASSERTION",
      "externalRefs": [
        {
          "referenceType": "cpe23Type",
          "referenceLocator": "cpe:2.3:a:pallets_project:flask:3.0.0:*:*:*:*:*:*:*"
        },
        {
          "referenceType": "purl",
          "referenceLocator": "pkg:pypi/flask@3.0.0"
        }
      ]
    }
  ],
  "relationships": [
    {
      "spdxElementId": "SPDXRef-DOCUMENT",
      "relatedSpdxElement": "SPDXRef-Package-pip-flask-3.0.0",
      "relationshipType": "DESCRIBES"
    }
  ]
}
```

#### CycloneDX 1.5 JSON Format — Real Example

```json
{
  "bomFormat": "CycloneDX",
  "specVersion": "1.5",
  "version": 1,
  "metadata": {
    "timestamp": "2025-01-15T10:30:00Z",
    "tools": [
      {
        "vendor": "anchore",
        "name": "syft",
        "version": "0.98.0"
      }
    ],
    "component": {
      "name": "my-service",
      "version": "1.2.3",
      "type": "application",
      "purl": "pkg:docker/myorg/my-service@1.2.3"
    }
  },
  "components": [
    {
      "bom-ref": "pkg:pypi/flask@3.0.0",
      "name": "flask",
      "version": "3.0.0",
      "type": "library",
      "purl": "pkg:pypi/flask@3.0.0",
      "licenses": [
        {
          "license": {
            "id": "BSD-3-Clause",
            "url": "https://spdx.org/licenses/BSD-3-Clause.html"
          }
        }
      ],
      "externalReferences": [
        {
          "type": "vcs",
          "url": "https://github.com/pallets/flask"
        }
      ]
    },
    {
      "bom-ref": "pkg:npm/express@4.18.2",
      "name": "express",
      "version": "4.18.2",
      "type": "library",
      "purl": "pkg:npm/express@4.18.2",
      "licenses": [
        { "license": { "id": "MIT" } }
      ]
    }
  ]
}
```

#### CI Pipeline: Generate SBOM with syft (Python + Node.js)

```bash
#!/bin/bash
# .github/workflows/scripts/generate-sbom.sh
# Generates both SPDX and CycloneDX SBOMs for all project dependencies
set -euo pipefail

ARTIFACT_DIR="${1:-.sbom-output}"
TIMESTAMP="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
PROJECT_NAME="${GITHUB_REPOSITORY##*/}"

mkdir -p "$ARTIFACT_DIR"

echo "::group::Generate SPDX SBOM for Python dependencies"
syft python:./venv \
  --output spdx-json="$ARTIFACT_DIR/spdx-python.json" \
  --file-metadata.exclude "/proc/*" \
  --file-ownership exclude-sticky \
  2>&1 | tee "$ARTIFACT_DIR/syft-python.log"
echo "::endgroup::"

echo "::group::Generate CycloneDX SBOM for Node.js dependencies"
syft nodejs:./ \
  --output cyclonedx-json="$ARTIFACT_DIR/cyclonedx-nodejs.json" \
  --file-metadata.exclude "/proc/*" \
  2>&1 | tee "$ARTIFACT_DIR/syft-nodejs.log"
echo "::endgroup::"

# Also generate via native tools for ecosystems where syft coverage is thin
if [ -f "go.sum" ]; then
  echo "::group::Generate CycloneDX SBOM for Go modules"
  cyclonedx-npm --output-file "$ARTIFACT_DIR/cyclonedx-go.json" --output-type json || true
  echo "::endgroup::"
fi

# Generate a combined summary
echo "{\"timestamp\":\"$TIMESTAMP\",\"project\":\"$PROJECT_NAME\",\"sboms\":{\"spdx\":\"\`ls $ARTIFACT_DIR/spdx-*.json\`\",\"cyclonedx\":\"\`ls $ARTIFACT_DIR/cyclonedx-*.json\`\"}}" \
  > "$ARTIFACT_DIR/sbom-manifest.json"

echo "::notice::SBOMs generated in $ARTIFACT_DIR/"
ls -la "$ARTIFACT_DIR"/
```

#### Python Helper: Parse and Validate SBOM Content

```python
"""
SBOM Validation and Transformation Utilities

Provides functions for validating SPDX and CycloneDX SBOM files,
checking completeness (all dependencies present), and transforming
between formats for different tooling requirements.
"""

from __future__ import annotations

import json
import hashlib
from pathlib import Path
from typing import Any

SPDX_REQUIRED_FIELDS: set[str] = {
    "spdxVersion", "dataLicense", "SPDXID", "name",
    "creationInfo", "packages"
}

CYCLONEDX_REQUIRED_FIELDS: set[str] = {
    "bomFormat", "specVersion", "version", "metadata"
}


def validate_spdx_sbom(sbom_path: str) -> dict[str, Any]:
    """Validate an SPDX JSON SBOM file and return validation results.

    Args:
        sbom_path: Path to the SPDX JSON SBOM file.

    Returns:
        Dictionary with validation status, package count, and any errors found.
    """
    result: dict[str, Any] = {
        "valid": True,
        "format": "spdx",
        "package_count": 0,
        "errors": list[str]()
    }

    try:
        path = Path(sbom_path)
        if not path.exists():
            result["valid"] = False
            result["errors"].append(f"File not found: {sbom_path}")
            return result

        content = json.loads(path.read_text(encoding="utf-8"))

        # Check required top-level fields
        missing_fields = SPDX_REQUIRED_FIELDS - set(content.keys())
        if missing_fields:
            result["valid"] = False
            result["errors"].append(f"Missing required fields: {', '.join(sorted(missing_fields))}")

        # Verify creation metadata
        creation_info = content.get("creationInfo", {})
        if "created" not in creation_info:
            result["errors"].append("No 'created' timestamp in creationInfo")

        # Count and validate packages
        packages = content.get("packages", [])
        result["package_count"] = len(packages)

        for pkg in packages:
            if "name" not in pkg or "SPDXID" not in pkg:
                result["errors"].append(f"Package missing required fields: {pkg}")

    except json.JSONDecodeError as exc:
        result["valid"] = False
        result["errors"].append(f"Invalid JSON: {exc}")
    except Exception as exc:
        result["valid"] = False
        result["errors"].append(f"Unexpected error: {exc}")

    return result


def validate_cyclonedx_sbom(sbom_path: str) -> dict[str, Any]:
    """Validate a CycloneDX JSON SBOM file and return validation results.

    Args:
        sbom_path: Path to the CycloneDX JSON SBOM file.

    Returns:
        Dictionary with validation status, component count, and any errors found.
    """
    result: dict[str, Any] = {
        "valid": True,
        "format": "cyclonedx",
        "component_count": 0,
        "errors": list[str]()
    }

    try:
        path = Path(sbom_path)
        if not path.exists():
            result["valid"] = False
            result["errors"].append(f"File not found: {sbom_path}")
            return result

        content = json.loads(path.read_text(encoding="utf-8"))

        # Check required top-level fields
        missing_fields = CYCLONEDX_REQUIRED_FIELDS - set(content.keys())
        if missing_fields:
            result["valid"] = False
            result["errors"].append(f"Missing required fields: {', '.join(sorted(missing_fields))}")

        # Verify spec version compatibility
        spec_version = content.get("specVersion", "")
        supported_versions = {"1.4", "1.5"}
        if spec_version not in supported_versions:
            result["errors"].append(f"Unsupported CycloneDX spec version: {spec_version}")

        # Count components
        components = content.get("components", [])
        result["component_count"] = len(components)

    except (json.JSONDecodeError, KeyError) as exc:
        result["valid"] = False
        result["errors"].append(f"Validation error: {exc}")

    return result


def generate_sbom_hash(sbom_path: str) -> str:
    """Generate a SHA-256 hash of an SBOM file for integrity verification.

    Args:
        sbom_path: Path to the SBOM JSON file.

    Returns:
        Hex-encoded SHA-256 digest of the SBOM content.
    """
    path = Path(sbom_path)
    content_bytes = path.read_bytes()
    return hashlib.sha256(content_bytes).hexdigest()


def summarize_sbom(results: list[dict[str, Any]]) -> str:
    """Generate a human-readable summary of multiple SBOM validation results.

    Args:
        results: List of validation result dictionaries from validate_spdx_sbom
                 or validate_cyclonedx_sbom.

    Returns:
        Formatted summary string suitable for CI log output.
    """
    total_packages = sum(r.get("package_count", r.get("component_count", 0)) for r in results)
    errors = [err for r in results for err in r.get("errors", [])]

    lines: list[str] = []
    lines.append(f"SBOM Summary: {total_packages} total components across {len(results)} SBOMs")

    for r in results:
        fmt = r.get("format", "unknown")
        count = r.get("package_count", r.get("component_count", 0))
        status = "VALID" if r.get("valid") else "INVALID"
        lines.append(f"  [{fmt}] {count} components — {status}")

    if errors:
        lines.append(f"\nErrors ({len(errors)}):")
        for err in errors:
            lines.append(f"  - {err}")

    return "\n".join(lines)
```

---

### Pattern 2: Dependency Pinning Strategies

Pinning eliminates version ambiguity. Different ecosystems use different mechanisms — understand each and enforce it consistently.

#### BAD: Unpinned Versions (Vulnerable to Supply Chain Attacks)

```jsonc
// package.json — ❌ BAD: caret ranges allow any minor/patch update
{
  "dependencies": {
    "express": "^4.18.0",
    "lodash": "^4.17.0",
    "axios": ">=1.0.0",
    "some-package": "*"            // ❌ ANY version — most dangerous pattern
  }
}
```

#### GOOD: Exact Version Pinning with Lockfile (Secure)

```jsonc
// package.json — ✅ GOOD: exact pin for critical packages, lockfile enforces consistency
{
  "dependencies": {
    "express": "4.18.2",           // Exact pin
    "lodash": "4.17.21",           // Exact pin
    "axios": "1.6.0"               // Exact pin
  }
}

// package-lock.json — ✅ LOCKFILE enforces transitive deps match exactly
{
  "name": "my-service",
  "version": "1.0.0",
  "lockfileVersion": 3,
  "requires": true,
  "packages": {
    "node_modules/express": {
      "version": "4.18.2",         // Exact version — no range
      "resolved": "https://registry.npmjs.org/express/-/express-4.18.2.tgz",
      "integrity": "sha384-m+...base64-encoded-hash"  // Cryptographic integrity check
    },
    "node_modules/express/node_modules/debug": {
      "version": "4.3.4",          // Transitive dep also exact
      "resolved": "https://registry.npmjs.org/debug/-/debug-4.3.4.tgz",
      "integrity": "sha384-..."
    }
  }
}
```

#### Python: poetry.lock (Exact Pinning with Hash Verification)

```toml
# pyproject.toml — ✅ GOOD: explicit pin in dependencies
[tool.poetry]
name = "my-service"
version = "1.0.0"

[tool.poetry.dependencies]
python = "^3.11"
flask = "3.0.0"                # Exact version (not ^3.0.0)
requests = "2.31.0"            # Exact version
sqlalchemy = "2.0.23"          # Exact version

[tool.poetry.group.dev.dependencies]
pytest = "7.4.3"
```

```toml
# poetry.lock — ✅ GENERATED lockfile with cryptographic hashes
[[package]]
name = "flask"
version = "3.0.0"
description = "A simple framework for building complex web applications."
optional = false
python-versions = ">=3.8"

[package.dependencies]
Werkzeug = ">=3.0.0"
Jinja2 = ">=3.1.2"
itsdangerous = ">=2.1.2"

[package.source]
type = "pipfile"
url = "https://pypi.org/simple"
reference = "pypi"

[[package.metadata.hashes]]
platform = null
marker = null
hash = "sha256:abcd1234..."  # SHA-256 hash of the published wheel/sdist
```

#### Go: go.mod with Require Directives and go.sum

```go
// go.mod — ✅ GOOD: exact version pins + require directives
module github.com/myorg/my-service

go 1.21

require (
	github.com/gin-gonic/gin v1.9.1      // Exact pinned version
	github.com/lib/pq v1.10.9             // Exact pinned version
	go.uber.org/zap v1.26.0               // Exact pinned version
)

// ✅ Use replace directive for vulnerable transitive dependencies
replace github.com/golang/protobuf => github.com/golang/protobuf v1.5.3
```

```
// go.sum — ✅ GENERATED checksum database (never edit manually)
github.com/gin-gonic/gin v1.9.1 h1:jDzONb...
github.com/gin-gonic/gin v1.9.1/go.mod h1:uhGL...
github.com/lib/pq v1.10.9 h1:yQoCnH...
github.com/lib/pq v1.10.9/go.mod h1:4J...
```

#### Verifying Pinned Versions Match Published Packages

```bash
# npm: verify lockfile integrity against registry
npm ci --ignore-scripts  # Install from lockfile only, skip postinstall scripts
npm audit --production    # Verify no unexpected vulnerabilities appeared

# Python: pip-sync enforces exact environment state
pip install pip-tools
pip-compile requirements.in -o requirements.txt  # Generate pin file
pip-sync requirements.txt                         # Enforce exact versions

# Go: verify go.sum entries match published checksums
GOPROXY=https://proxy.golang.org go mod download
go sum check  # Verify no tampering

# Universal: compare package integrity hashes
sha256sum package.tar.gz && echo "Expected: sha256:<hash-from-lockfile>"
```

---

### Pattern 3: Signature Verification with Sigstore / cosign

Sigstore provides a zero-trust signing infrastructure. Packages and build artifacts can be signed using Fulcio (identity-based certificates) and Rekor (transparency log). Verify signatures at install/build time to prevent tampered packages from being executed.

#### cosign Verify Commands for Different Ecosystems

```bash
# --- Go Module Proxy Verification ---
# Go 1.21+ verifies module proxy signatures automatically
# When a module is signed, the Go toolchain checks against Rekor
go install github.com/some/package@v1.2.3
# If signature is invalid: "verifying build [hash]: cosign verify failed"

# --- Docker Image Signing and Verification (cosign) ---
# Sign a container image
cosign sign --key cosign.key myregistry.io/my-service:v1.2.3

# Verify at pull time in CI
COSIGN_EXPERIMENTAL=true \
  cosign verify \
    --certificate-identity=ci@myorg.github.com \
    --certificate-oidc-issuer=https://token.actions.githubusercontent.com \
    --key https://myorg.github.dev/cosign-public-key.pub \
    myregistry.io/my-service:v1.2.3 | jq .

# --- NPM Package Provenance Verification ---
# npm supports provenance attestation from GitHub Actions
npm install express@4.18.2
# npm verifies the provenance statement against Sigstore Rekor
# If missing or invalid: "provenance verification failed"

# Verify a specific package's signature
npx @sigstore/cli verify --repository https://registry.npmjs.org/express --version 4.18.2

# --- Python Package Signing Verification ---
# PyPI supports PEP 725 provenance statements (experimental)
pip install requests==2.31.0
# Verify with pip's built-in integrity check (always hashes-based)
pip download requests==2.31.0 --no-deps -d /tmp/pip-check
sha256sum /tmp/pip-check/requests-2.31.0-py3-none-any.whl

# cosign for containerized Python apps
cosign verify \
  --certificate-identity=ci@build.myorg.com \
  --key cosign.pub \
  myregistry.io/python-app:3.11-slim
```

#### Python Helper: Signature Verification in Build Scripts

```python
"""
Package Integrity and Signature Verification Module

Provides functions for verifying package integrity using cryptographic hashes,
checking Sigstore/cosign signatures where available, and validating build
provenance against published attestation records.
"""

from __future__ import annotations

import hashlib
import json
import subprocess
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Any


class VerificationStatus(Enum):
    """Possible outcomes of a package verification check."""
    VERIFIED = "verified"
    FAILED_HASH = "hash_mismatch"
    SIGNATURE_INVALID = "signature_invalid"
    NO_SIGNATURE = "no_signature_available"
    TOOL_NOT_FOUND = "tool_not_found"
    UNKNOWN_ERROR = "unknown_error"


@dataclass
class VerificationResult:
    """Result of verifying a package artifact's integrity and provenance."""
    artifact_name: str
    expected_version: str
    status: VerificationStatus
    hash_algorithm: str = "sha256"
    expected_hash: str = ""
    actual_hash: str = ""
    signature_verified: bool = False
    certificate_identity: str = ""
    transparency_log_entry: dict[str, Any] | None = None
    errors: list[str] = field(default_factory=list)

    @property
    def is_valid(self) -> bool:
        """Return True if the artifact passed all verification checks."""
        return self.status == VerificationStatus.VERIFIED and self.signature_verified


def compute_file_hash(file_path: str, algorithm: str = "sha256") -> str:
    """Compute a cryptographic hash of a file for integrity verification.

    Args:
        file_path: Path to the file to hash.
        algorithm: Hash algorithm — sha256 (default), sha384, or sha512.

    Returns:
        Lowercase hex-encoded digest string.

    Raises:
        FileNotFoundError: If file does not exist.
        ValueError: If unsupported algorithm specified.
    """
    supported = {"sha256", "sha384", "sha512"}
    if algorithm not in supported:
        raise ValueError(f"Unsupported hash algorithm '{algorithm}'. Use one of: {', '.join(sorted(supported))}")

    path = Path(file_path)
    if not path.is_file():
        raise FileNotFoundError(f"Cannot hash non-existent file: {file_path}")

    h = hashlib.new(algorithm)
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()


def verify_package_hash(file_path: str, expected_hash: str, algorithm: str = "sha256") -> VerificationResult:
    """Verify a downloaded package file against its published hash.

    Args:
        file_path: Path to the downloaded package (tarball, wheel, tgz, etc.).
        expected_hash: The published hash string to verify against.
        algorithm: Hash algorithm used for the comparison.

    Returns:
        VerificationResult indicating whether the hash matches.
    """
    actual = compute_file_hash(file_path, algorithm)
    name = Path(file_path).name

    if actual == expected_hash.lower():
        return VerificationResult(
            artifact_name=name,
            expected_version="unknown",
            status=VerificationStatus.VERIFIED,
            hash_algorithm=algorithm,
            expected_hash=expected_hash.lower(),
            actual_hash=actual,
            signature_verified=True
        )

    return VerificationResult(
        artifact_name=name,
        expected_version="unknown",
        status=VerificationStatus.FAILED_HASH,
        hash_algorithm=algorithm,
        expected_hash=expected_hash.lower(),
        actual_hash=actual,
        errors=[f"Hash mismatch: expected {expected_hash}, got {actual}"]
    )


def verify_cosign_signature(
    image_ref: str,
    certificate_identity: str,
    oidc_issuer: str,
    public_key_path: str | None = None,
) -> VerificationResult:
    """Verify a container image signature using cosign.

    Args:
        image_ref: Full image reference (registry/image:tag).
        certificate_identity: Expected certificate identity claim.
        oidc_issuer: OIDC issuer URL for certificate validation.
        public_key_path: Optional path to cosign public key for --key verification.

    Returns:
        VerificationResult with signature verification status.
    """
    cmd: list[str] = [
        "cosign", "verify",
        "--certificate-identity", certificate_identity,
        "--certificate-oidc-issuer", oidc_issuer,
        image_ref
    ]

    if public_key_path:
        cmd.extend(["--key", public_key_path])

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=30
        )

        if result.returncode == 0:
            # Parse verification output for details
            payload_lines = [l for l in result.stdout.strip().split("\n") if l]
            return VerificationResult(
                artifact_name=image_ref,
                expected_version="unknown",
                status=VerificationStatus.VERIFIED,
                signature_verified=True,
                certificate_identity=certificate_identity,
                transparency_log_entry={"verified": True, "output_lines": payload_lines[:5]}
            )

        return VerificationResult(
            artifact_name=image_ref,
            expected_version="unknown",
            status=VerificationStatus.SIGNATURE_INVALID,
            errors=[result.stderr.strip()]
        )

    except FileNotFoundError:
        return VerificationResult(
            artifact_name=image_ref,
            expected_version="unknown",
            status=VerificationStatus.TOOL_NOT_FOUND,
            errors=["cosign binary not found in PATH"]
        )
    except subprocess.TimeoutExpired:
        return VerificationResult(
            artifact_name=image_ref,
            expected_version="unknown",
            status=VerificationStatus.UNKNOWN_ERROR,
            errors=["Signature verification timed out after 30s"]
        )


def run_comprehensive_verification(package_dir: str) -> list[VerificationResult]:
    """Run all available integrity and signature checks on packages in a directory.

    Args:
        package_dir: Directory containing downloaded packages to verify.

    Returns:
        List of VerificationResult objects for each package checked.
    """
    results: list[VerificationResult] = []
    pkg_path = Path(package_dir)

    if not pkg_path.is_dir():
        results.append(VerificationResult(
            artifact_name=package_dir,
            expected_version="unknown",
            status=VerificationStatus.UNKNOWN_ERROR,
            errors=["Not a valid directory"]
        ))
        return results

    # Hash-check all tarballs and wheels
    for pattern in ["*.tar.gz", "*.tgz", "*.whl", "*.zip"]:
        for pkg_file in pkg_path.glob(pattern):
            print(f"Verifying hash: {pkg_file.name}")
            result = verify_package_hash(str(pkg_file), "")  # Hash would come from lockfile/SBOM
            results.append(result)

    return results
```

---

### Pattern 4: CI Scanning Pipeline Patterns

Dependency scanning must run on every commit and PR. A single missing scan is a gap an attacker can exploit. Show both BAD (insufficient) and GOOD (comprehensive) configurations.

#### BAD: Incomplete / Missing Scanning Configuration

```yaml
# .github/workflows/dependency-scan-bad.yml — ❌ BAD: Skips critical checks
name: Dependency Scan (Incomplete)

on: [push]  # ❌ BAD: Missing pull_request trigger — PRs are never scanned

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - run: npm install  # ❌ BAD: npm ci preferred for reproducibility

      # ❌ BAD: No fail-on-critical — scan runs but never blocks CI
      - run: npm audit --json > audit-results.json
        # Missing: any failure threshold, missing: no transitive dep scanning

      # ❌ BAD: No SCA tool with CVE database coverage
      # Missing: Dependabot, Snyk, or Trivy for comprehensive CVE matching

      # ❌ BAD: No SBOM generation — zero inventory of components
```

#### GOOD: Comprehensive Scanning Pipeline

```yaml
# .github/workflows/dependency-scan-good.yml — ✅ GOOD: Full supply chain scanning
name: Dependency Supply Chain Security

on:
  pull_request:
    branches: [main, master]
  push:
    branches: [main, master]
  schedule:
    - cron: '0 6 * * 1'  # Daily Monday at 6 AM UTC — continuous monitoring

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  sbom-generation:
    name: Generate SBOMs
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies (from lockfile)
        run: npm ci

      - uses: anchore/sbom-action@v0
        with:
          path: .
          format: cyclonedx-json
          output-file: sbom-cyclonedx.json
          artifact-name: sbom-cyclonedx

      - name: Generate SPDX SBOM for Python deps
        run: |
          pip install syft
          syft python:. --output spdx-json=spdx-python.json
          echo "## SPDX SBOM" >> $GITHUB_STEP_SUMMARY
          echo '```json' >> $GITHUB_STEP_SUMMARY
          head -50 spdx-python.json >> $GITHUB_STEP_SUMMARY
          echo '```' >> $GITHUB_STEP_SUMMARY

      - uses: actions/upload-artifact@v4
        with:
          name: sbom-artifacts
          path: |
            sbom-cyclonedx.json
            spdx-python.json
          retention-days: 90

  dependency-scanning:
    name: Scan Dependencies for Vulnerabilities
    runs-on: ubuntu-latest
    needs: [sbom-generation]
    strategy:
      matrix:
        ecosystem: [npm, pip, gomod]
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      # --- Snyk: Comprehensive CVE database + transitive deps ---
      - name: Run Snyk Security Scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          command: test --severity-threshold=high --fail-on=all --json=snyk-results.json

      # --- Trivy: Filesystem + container scanning with CVE DB ---
      - name: Run Trivy Vulnerability Scan
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          scan-ref: '.'
          format: 'sarif'
          output: 'trivy-results.sarif'
          severity: 'CRITICAL,HIGH'
          exit-code: '1'  # ❌ Will fail the job on CRITICAL/HIGH findings

      # --- osv-scanner: Google's open-source vulnerability scanner ---
      - name: Run OSV-Scanner
        uses: google/osv-scanner-action@v1
        with:
          scan-args: |
            --lockfile=npm-package-lock.json
            --recursive

      # Upload results for all scanners
      - uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: trivy-results.sarif

  signature-verification:
    name: Verify Package Signatures
    runs-on: ubuntu-latest
    needs: [dependency-scanning]
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies from lockfile
        run: npm ci --ignore-scripts  # Skip potentially malicious postinstall

      - name: Verify npm package provenance
        run: |
          npx @sigstore/cli verify \
            --repository https://registry.npmjs.org/ \
            --package "$(jq -r '.name' package.json)"
        continue-on-error: true  # Provenance may not be available for all packages

      - uses: sigstore/gh-action-sigstore-python@v2
        with:
          signing-workflow: dependency-verification

  slsa-provenance:
    name: Generate SLSA Provenance Attestation
    runs-on: ubuntu-latest
    needs: [signature-verification]
    permissions:
      actions: read
      id-token: write
      contents: write
    steps:
      - uses: actions/checkout@v4

      - uses: sigstore/gh-action-sigstore-python@v2
        with:
          inputs: build-output.tar.gz

      - name: Attest to SLSA Level 2
        run: |
          # Generate in-toto attestation for build provenance
          cosign attest \
            --predicate attestation-predicate.json \
            --type slsaprovenance \
            --key env://COSIGN_KEY \
            build-output.tar.gz

      - uses: actions/upload-artifact@v4
        with:
          name: slsa-provenance
          path: |
            attestation.json
            sbom-cyclonedx.json
```

---

### Pattern 5: Transitive Vulnerability Management

Transitive (indirect) dependencies account for the majority of vulnerabilities in modern projects. You cannot ignore them — you must actively manage them.

#### Finding and Fixing Transitive Dependencies

```bash
# --- Node.js: Find vulnerable transitive dependencies ---

# Show full dependency tree including transitive deps
npm ls lodash
# my-service@1.0.0
# └── express@4.18.2
#     └── qs@6.11.0  ← transitive, potentially vulnerable

# Audit ALL vulnerabilities including nested
npm audit --all

# Output:
# found 3 vulnerabilities (2 moderate, 1 high) in 542 packages
#   1 high: prototype pollution in qs < 6.12.0 (transitive via express)
#   fix available: npm audit fix --force

# Override a specific transitive dependency version
npm force-rebuild qs@6.12.0  # npm v9+
# Or use overrides in package.json (see Pattern below)

# --- Python: Find and audit transitive vulnerabilities ---

# Generate full requirement tree with transitive deps
pip-tree install pipdeptree
pipdeptree -p flask --reverse
# flask==3.0.0
#   ├── Werkzeug==3.0.1
#   │   └── [self]
#   ├── Jinja2==3.1.2
#   │   └── MarkupSafe==2.1.3  ← transitive sub-dependency
#   └── blinker==1.7.0

# Audit with pip-audit (scans transitive deps)
pip-audit --desc  # Include transitive dependencies in scan
# Name     Version ID            Severity
# ---------- ------- -------------- --------
# werkzeug 3.0.1   GHSA-cph5-m8j7-rh96 High
# Fixed by: werkzeug>=3.0.2

# --- Go: Find vulnerable indirect dependencies ---

govulncheck ./...
# Finding: GO-2024-3210 (HIGH) in golang.org/x/text v0.3.8
#   introduced by:
#     my-service → github.com/gin-gonic/gin@v1.9.1 → golang.org/x/text@v0.3.8
# Fixed by: golang.org/x/text@v0.14.0
```

#### Override Mechanisms for Vulnerable Transitive Dependencies

```jsonc
// package.json — ✅ OVERRIDE: Force a specific transitive dependency version
{
  "name": "my-service",
  "version": "1.0.0",
  "dependencies": {
    "express": "4.18.2"
  },
  // ✅ npm v12+ overrides — forces ALL instances of qs to v6.12.0
  "overrides": {
    "qs": "6.12.0",
    "cookie": "0.6.0"
  }
}
```

```toml
# pyproject.toml — ✅ POETRY: Override transitive dependency version
[tool.poetry]
name = "my-service"

[tool.poetry.dependencies]
python = "^3.11"
flask = "3.0.0"

[tool.poetry.group.dev.dependencies]
pip-audit = "2.7.3"

# ✅ Poetry 1.4+ overrides section
[tool.poetry.dependencies.werkzeug]
version = ">=3.0.2"
optional = false
```

```go
// go.mod — ✅ REPLACE: Redirect vulnerable transitive dependency
module github.com/myorg/my-service

go 1.21

require (
	github.com/gin-gonic/gin v1.9.1
)

// ✅ Force all modules to use a safe version of the vulnerable package
replace golang.org/x/text => golang.org/x/text v0.14.0

// ✅ Or remove/reverse-dependency pin
// If no direct user needs the old version:
exclude golang.org/x/text v0.3.8
```

#### Patch Files for Dependencies That Cannot Be Upgraded

```diff
# patches/express+4.18.2.patch — Apply when express@4.18.2 has an unfixable CVE
# Use `yarn patch express@4.18.2` or `npm-patch` to generate this file

--- a/lib/request.js	(revision abc123)
+++ b/lib/request.js	(working copy)
@@ -45,7 +45,9 @@
-  return req.header(name);
+  const raw = req.header(name);
+  // Mitigate CVE: sanitize header values to prevent injection
+  return raw ? String(raw).replace(/[<>"'&]/g, '') : '';

```

---

### Pattern 6: Reproducible Builds

Reproducible (deterministic) builds produce identical artifacts when building the same source code. This eliminates a class of supply chain attacks where an attacker modifies build infrastructure to insert backdoors that only appear in published binaries but not in source code analysis.

#### Key Principles

| Principle | Implementation |
|-----------|---------------|
| **Deterministic timestamps** | Use fixed SOURCE_DATE_EPOCH instead of build-time clock |
| **Sorted file order** | Archive members must be sorted alphabetically by path |
| **Fixed permissions** | Umask set to 0o22; no owner/group metadata in archives |
| **Pinned toolchains** | All build tools (compilers, bundlers) at exact versions |
| **No network access** | Build must not download anything at compile time |

#### Implementation Examples

```bash
#!/bin/bash
# Reproducible Node.js build with deterministic output

set -euo pipefail

# Fixed timestamp for reproducible builds (Jan 1, 2025 00:00:00 UTC)
export SOURCE_DATE_EPOCH=1735689600

# Deterministic npm install (no postinstall scripts that add randomness)
npm ci --ignore-scripts --prefer-offline  # Fail if lockfile is out of sync

# Build with fixed locale and timezone
export LC_ALL=C TZ=UTC
node build/index.js > dist/bundle.js

# Create reproducible tarball
tar --sort=name \
    --mtime="@${SOURCE_DATE_EPOCH}" \
    --owner=0 --group=0 --numeric-owner \
    -czf "release/my-service-v$(git describe --tags).tar.gz" \
    dist/ package.json package-lock.json

# Record artifact hash for verification
sha256sum "release/my-service-v$(git describe --tags).tar.gz" > release/SHA256SUMS
```

```dockerfile
# Dockerfile — Reproducible multi-stage build pattern
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --ignore-scripts  # Deterministic install from lockfile
COPY . .
ENV SOURCE_DATE_EPOCH=1735689600
ARG BUILD_VERSION="local-dev"
RUN npm run build -- --version="$BUILD_VERSION"

# Second stage: clean image with only built output
FROM alpine:3.19 AS runtime
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json
# No node_modules in final image if build is self-contained
RUN addgroup -S app && adduser -S app -G app
USER app
CMD ["node", "dist/index.js"]
```

#### Verifying Reproducibility

```bash
#!/bin/bash
# Verify that rebuilding from source produces the same artifact

ARTIFACT="release/my-service-v1.0.0.tar.gz"
ORIGINAL_HASH=$(sha256sum "$ARTIFACT" | awk '{print $1}')

# Clean and rebuild
git clean -fdx
make build  # Or: npm ci && npm run build

REBUILD_HASH=$(find dist/ -type f | sort | xargs sha256sum | sha256sum | awk '{print $1}')

if [ "$ORIGINAL_HASH" = "$REBUILD_HASH" ]; then
    echo "✅ Build is reproducible — hashes match: $ORIGINAL_HASH"
else
    echo "❌ Build is NOT reproducible"
    echo "   Original:  $ORIGINAL_HASH"
    echo "   Rebuild:   $REBUILD_HASH"
    exit 1
fi
```

---

## Lessons from Real-World Supply Chain Attacks

### Log4Shell (CVE-2021-44228) — December 2021

**What happened:** A critical RCE vulnerability in Apache Log4j (a widely-used Java logging library) allowed remote code execution via crafted log messages containing `${jndi:ldap://...}` expressions. Affected millions of systems globally.

**What safeguards would have prevented/mitigated it:**
- **SBOM generation:** If every organization had generated an SBOM, identifying Log4j in their dependency tree would have been instant rather than requiring a frantic search
- **Transitive vulnerability scanning:** Automated scanning with fail-on-critical policy would have caught this immediately — Log4j was a transitive dependency for many projects
- **Dependency pinning:** Exact version pinning with automated updates (Dependabot/Renovate) would have kept Log4j at patched versions from day one
- **Reproducible builds:** Made it easier to audit whether published JARs matched source code

### xz Backdoor (CVE-2024-3094) — March 2024

**What happened:** An attacker compromised the upstream maintainer of `xz` (the ubiquitous Linux compression library), injecting a backdoor into its build system via a stealthy test file. The malicious code was hidden in an otherwise clean-looking project and spread to OpenSSH builds that used xz for decompression.

**What safeguards would have prevented/mitigated it:**
- **Signature verification (Sigstore/cosign):** If the xz releases were signed and verified before inclusion, the tampered tarball would have been detected
- **Reproducible builds:** Building xz from source locally with pinned toolchain versions would have exposed the build-time backdoor
- **SBOM + supply chain mapping:** An SBOM showing xz as a dependency of OpenSSH would enable targeted scanning and early detection
- **SLSA Level 3 attestation:** If the xz build had SLSA L3 provenance (one-time build by build service), tampering would have been immediately apparent

---

## Constraints

### MUST DO
- Generate an SBOM (SPDX or CycloneDX) on every CI build and upload as an artifact
- Pin all direct dependencies to exact versions in package manifests — no `^`, `~`, or `>=` ranges for production
- Commit and enforce lockfiles in all ecosystems (`package-lock.json`, `poetry.lock`, `go.sum`)
- Run vulnerability scanning on transitive dependencies with a fail-on-critical policy in every PR and push
- Verify package signatures (Sigstore/cosign) before installing packages in production CI environments
- Configure CI to use `npm ci` / `pip sync` / `go mod download` — never arbitrary `npm install` without lockfile enforcement
- Implement SLSA provenance attestation starting at Level 2, with a roadmap to Level 3 for critical artifacts
- Build container images and distribution packages reproducibly using fixed timestamps and sorted archives
- Review ALL dependency changes (including lockfile updates) in PRs before merging
- Maintain an up-to-date SBOM as evidence of supply chain hygiene for compliance audits

### MUST NOT DO
- Never trust unpinned or loosely-pinned dependencies in production — ranges allow silent version changes
- Don't skip signature verification because "it's from the official registry" — registries can be compromised (see npm compromise scenarios)
- Don't ignore transitive dependency vulnerabilities — they are the most common attack surface (70%+ of CVEs land in indirect deps)
- Never allow `postinstall`, `preinstall`, or build hooks to execute arbitrary code without review (xz backdoor vector)
- Don't skip SBOM generation "because it's overhead" — compliance frameworks increasingly mandate it
- Never disable SLSA attestation gates in CI for convenience — this is the foundation of supply chain trust
- Don't use `npm audit fix --force` without reviewing what it changes — it can introduce breaking changes or unexpected updates
- Never build artifacts from unverified source code — always verify git tags and commit hashes before building

---

## Output Template

When implementing supply chain security, produce the following outputs:

1. **SBOM Artifacts**
   - SPDX JSON file uploaded as CI artifact
   - CycloneDX JSON file uploaded as CI artifact
   - Both must include all transitive dependencies with purl/cpe identifiers

2. **Vulnerability Scan Report**
   - SCA tool results (Snyk / Trivy / osv-scanner) in SARIF format
   - Summary table: package, CVE, severity, fixed version, action taken
   - Gate decision: PASS (no critical/high) or FAIL with remediation steps

3. **Provenance Attestation**
   - in-toto attestation document signed with cosign
   - SLSA level declaration with justification per artifact
   - Build parameters logged: source commit, tool versions, timestamp

4. **Pin Compliance Report**
   - List of all direct dependencies with their pinned exact versions
   - Lockfile hash for current build (for reproducibility comparison)
   - Any override/replace directives and the vulnerable dependency they fix

5. **Reproducibility Verification**
   - Hash of built artifact from source tree at time of build
   - Confirmation that rebuild produces matching hash
   - Toolchain versions used (Node, Python, Go, Docker base image)

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `dependency-management` | Automated CVE scanning and dependency vulnerability patching — complementary to supply chain security which focuses on prevention rather than response |
| `review` | Review dependency changes in PRs, including lockfile diffs, override introductions, and new transitive dependencies |

---

*This skill implements defense-in-depth for the dependency supply chain. Each layer (pinning, SBOM, scanning, signing, attestation, reproducible builds) catches different attack vectors — no single measure is sufficient alone.*
