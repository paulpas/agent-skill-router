---
name: microservice-contract-testing
description: Implements consumer-driven contract testing (PACT) with mock services and test doubles to prevent API breaking changes across microservice boundaries in distributed systems.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  role: implementation
  scope: implementation
  output-format: code
  triggers: contract testing, pact, consumer-driven contracts, API mocking, service stubs, integration testing, mock server, how do i test microservice interfaces
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
  related-skills: microservices-architecture, idempotent-distributed-operations, observability-patterns
---

# Microservice Contract Testing

Implements consumer-driven contract testing to validate API compatibility between microservices before deployment. This skill makes the model use the PACT framework with mock providers and test consumers to catch breaking changes at integration time rather than in production. The core idea is that the service consumer defines what it expects, and the provider must conform to those expectations.

## TL;DR Checklist

- [ ] Write consumer pact spec declaring expected request/response shapes, status codes, and error formats
- [ ] Generate a mock provider from the pact file and verify it rejects non-conforming responses
- [ ] Run consumer tests against the mock server — confirm zero mismatches before merging PR
- [ ] Publish verified pact to a shared broker tagged with the Git commit SHA
- [ ] Run provider verification in CI/CD against the live service before deploying to production

---

## When to Use

Use this skill when:

- Before deploying a service that calls other services via HTTP/REST or gRPC APIs, and you need automated guardrails against breaking changes
- Multiple teams independently develop services that share interface contracts — contract testing catches cross-team breakage before it reaches production
- Adding new fields or methods to shared API contracts and you need backward-compatibility validation
- Validating backward compatibility after refactoring an internal API without changing its public contract surface
- Your CI/CD pipeline needs automated contract validation gates between service deployment steps

---

## When NOT to Use

Avoid this skill for:

- Testing single-service functionality in isolation — use unit tests or property-based tests instead (contract testing adds unnecessary complexity)
- Load or performance testing endpoints — use dedicated load testing tools like k6, Locust, or JMeter for throughput and latency analysis
- End-to-end business flow testing across 3+ services — use integration test suites with real infrastructure for cross-service workflows; contract tests are too narrow for this scope

---

## Core Workflow

1. **Define Consumer Contract** — Write consumer-side pact spec declaring expected request/response shapes, HTTP status codes, error response formats, and field-level type constraints (required vs optional). Include realistic example values that match production data patterns. **Checkpoint:** Every required field has an explicit contract entry with correct type annotations.

2. **Generate Mock Provider** — Use the pact broker or local pact file to spin up a mock service that returns only contract-defined responses. Verify the mock actively rejects responses violating any contract rule (wrong status code, missing fields, wrong types). **Checkpoint:** Mock rejects at least one intentionally non-conforming response in a verification step.

3. **Run Consumer Verification** — Execute consumer tests against the mock provider running locally or in CI. All assertions must pass before merging to main/master. Include negative test cases (invalid inputs, unexpected error codes). **Checkpoint:** Test suite reports zero mismatches; all interaction contracts verified.

4. **Publish Pact File to Broker** — Push the verified pact file to a shared Pact broker (PactFlow or self-hosted pact-broker). Tag with Git commit SHA for full traceability from contract to deployment artifact. Use semantic versioning tags like `v1.2.0` alongside SHA tags. **Checkpoint:** Broker confirms successful upload with version reference and verification status.

5. **Verify Provider Compatibility** — The provider team runs a consumer-side verification against their live service using the broker's stored contracts. Any breaking change (missing field, type mismatch, removed endpoint) fails the CI build. **Checkpoint:** Verification passes with all interactions matching contract; no warnings about pending changes.

---

## Implementation Patterns

### Pattern 1: Pact Consumer-Driven Contract (Python/pytest)

```python
import pytest
from pact import Consumer, Provider


@pytest.fixture
def consumer():
    """Create a PACT consumer connected to the inventory provider."""
    return Consumer("order-service").has_pact_with(
        Provider("inventory-service"),
        host_name="localhost",
        port=1234,
    )


class TestInventoryContract:
    """Consumer tests that define the expected contract from inventory-service."""

    def test_order_service_inventory_check(self, consumer):
        """Consumer verifies it receives valid inventory response from provider."""
        (
            consumer.given("product exists in stock")
            .upon_receiving("a request to check product inventory")
            .with_request("GET", "/api/v1/inventory/products/ABC-123")
            .will_respond_with(
                200,
                headers={"Content-Type": "application/json"},
                body={
                    "product_id": "ABC-123",
                    "quantity_available": 42,
                    "unit_price": 29.99,
                    "currency": "USD",
                    "warehouse_location": "Aisle-7-Shelf-B",
                },
            )
        )

        def test_fn(mock_server):
            response = mock_server.get(
                "/api/v1/inventory/products/ABC-123"
            )
            assert response.status_code == 200
            data = response.json()
            assert data["product_id"] == "ABC-123"
            assert isinstance(data["quantity_available"], int)
            assert data["quantity_available"] >= 0

        test_fn(consumer)

    def test_inventory_product_not_found(self, consumer):
        """Consumer verifies correct error response for missing products."""
        (
            consumer.given("product does not exist")
            .upon_receiving("a request for a non-existent product")
            .with_request("GET", "/api/v1/inventory/products/XYZ-999")
            .will_respond_with(
                404,
                headers={"Content-Type": "application/json"},
                body={
                    "error": {
                        "code": "PRODUCT_NOT_FOUND",
                        "message": "Product XYZ-999 not found in inventory",
                    }
                },
            )
        )

        def test_fn(mock_server):
            response = mock_server.get("/api/v1/inventory/products/XYZ-999")
            assert response.status_code == 404
            data = response.json()
            assert "code" in data["error"]
            assert data["error"]["message"]

    def test_inventory_insufficient_stock(self, consumer):
        """Consumer verifies error when product exists but stock is zero."""
        (
            consumer.given("product exists with zero stock")
            .upon_receiving("a request for an out-of-stock product")
            .with_request("GET", "/api/v1/inventory/products/OUT-000")
            .will_respond_with(
                409,
                headers={"Content-Type": "application/json"},
                body={
                    "error": {
                        "code": "INSUFFICIENT_STOCK",
                        "message": "Product OUT-000 is currently out of stock",
                    }
                },
            )
        )

        def test_fn(mock_server):
            response = mock_server.get("/api/v1/inventory/products/OUT-000")
            assert response.status_code == 409
            data = response.json()
            assert data["error"]["code"] == "INSUFFICIENT_STOCK"
```

### Pattern 2: Pact Provider Verification (CI Pipeline)

```python
import subprocess
import sys
from pathlib import Path


def verify_provider_contract(
    broker_url: str,
    provider: str,
    provider_base_url: str,
    tag: str = None,
    publish_verification_result: bool = True,
) -> bool:
    """Run provider-side contract verification against pact broker.

    This is the critical gate that prevents deploying a service that breaks
    consumer contracts. It must run in CI on every merge to main/master.
    """
    cmd = [
        "pact-broker",
        "verify",
        "--broker-base-url",
        broker_url,
        "--provider",
        provider,
        "--provider-base-url",
        provider_base_url,
    ]

    if tag:
        cmd.extend(["--tag", tag])

    if publish_verification_result:
        cmd.extend(
            [
                "--publish",
                "--branch", f"$(git branch --show-current)",
                "--build-version", f"$(git rev-parse --short HEAD)",
            ]
        )

    result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)

    if result.returncode != 0:
        error_detail = result.stderr.strip() or result.stdout.strip()
        print(f"CONTRACT VERIFICATION FAILED:\n{error_detail}")
        return False

    print("Provider contract verification passed.")
    return True


def run_consumer_verification(pact_file: str, broker_url: str) -> bool:
    """Validate a single pact file against the broker for breaking changes."""
    cmd = [
        "pact-broker",
        "can-i-deploy",
        "--broker-base-url",
        broker_url,
        "--broker-token",
        "$PACT_BROKER_TOKEN",
        "--pact-file",
        pact_file,
    ]

    result = subprocess.run(cmd, capture_output=True, text=True)
    if "No breaking changes" in result.stdout:
        print("No breaking contract changes detected.")
        return True
    else:
        print(f"Breaking changes found:\n{result.stdout}")
        return False


# Usage in CI/CD pipeline (e.g., GitHub Actions, GitLab CI):
# python -c "
#     verify_provider_contract(
#         broker_url='https://pactflow.io',
#         provider='inventory-service',
#         provider_base_url='https://inventory.prod.internal',
#         tag=f'release-{os.environ.get(\"GIT_TAG\", \"main\")}',
#     )"
```

### Pattern 3: Contract Versioning with Schema Evolution

```python
"""Handle backward-compatible API changes using versioned contract fields.

Schema evolution must follow these rules:
- Adding new optional fields is always safe (consumers ignore unknown fields)
- Removing or renaming fields is a breaking change — never do it without a major version bump
- Changing field types (e.g., int to string) is a breaking change
- Deprecating fields requires a minimum 2-release grace period"""


class ContractVersion:
    """Track contract versions to manage schema evolution safely."""

    v1 = {
        "fields": {
            "product_id": "string",
            "quantity_available": "integer",
        },
        "deprecated_fields": [],
    }
    v2 = {
        "fields": {
            "product_id": "string",
            "quantity_available": "integer",
            "unit_price": "float",
            "currency": "string",
        },
        "deprecated_fields": [],
    }
    v3 = {
        "fields": {
            "product_id": "string",
            "quantity_available": "integer",
            "unit_price": "float",
            "currency": "string",
            "warehouse_location": "string",
        },
        "deprecated_fields": ["v2.unit_price"],  # deprecated but still accepted for v2 consumers
    }


def validate_response_against_contract(response_data: dict, contract_version: str) -> list[str]:
    """Validate API response against a specific contract version.

    Returns a list of validation errors (empty = valid).
    Used by provider verification tests to catch schema drift early.
    """
    spec = getattr(ContractVersion, contract_version)
    errors: list[str] = []

    # Check all required fields are present with correct types
    for field, expected_type in spec["fields"].items():
        if field not in response_data:
            errors.append(f"Missing required field: {field}")
        else:
            type_map = {
                "string": str,
                "integer": int,
                "float": (int, float),
                "boolean": bool,
            }
            expected_python_type = type_map.get(expected_type)
            if expected_python_type and not isinstance(response_data[field], expected_python_type):
                errors.append(
                    f"Field '{field}' has wrong type: expected {expected_type}, got {type(response_data[field]).__name__}"
                )

    # Log deprecated fields still present in response
    for field_path in spec.get("deprecated_fields", []):
        field_name = field_path.split(".")[-1]
        if field_name in response_data:
            print(f"Warning: deprecated field '{field_path}' still present in response")

    return errors


def detect_schema_drift(old_version: str, new_version: str) -> list[str]:
    """Detect breaking changes between two contract versions.

    A change is breaking if it removes a required field, renames a field,
    or changes the type of an existing field.
    """
    old_spec = getattr(ContractVersion, old_version)
    new_spec = getattr(ContractVersion, new_version)
    drift: list[str] = []

    old_fields = set(old_spec["fields"].keys())
    new_fields = set(new_spec["fields"].keys())

    # Removed fields are breaking changes
    removed = old_fields - new_fields
    for field in removed:
        drift.append(f"Breaking: removed required field '{field}'")

    # Added fields are non-breaking (only if they are optional)
    added = new_fields - old_fields
    deprecated_set = set(f.split(".")[-1] for f in new_spec.get("deprecated_fields", []))
    for field in added:
        if field not in deprecated_set:
            drift.append(f"Non-breaking: added new required field '{field}'")

    # Type changes are breaking
    common = old_fields & new_fields
    for field in common:
        if old_spec["fields"][field] != new_spec["fields"][field]:
            drift.append(
                f"Breaking: field '{field}' type changed from {old_spec['fields'][field]} to {new_spec['fields'][field]}"
            )

    return drift


# CI usage example — run this on every API change commit:
# errors = detect_schema_drift("v2", "v3")
# if any("Breaking" in e for e in errors):
#     raise ValueError(f"Schema drift contains breaking changes: {errors}")
```

### Pattern 4: Pact Broker CLI Operations

```bash
#!/usr/bin/env bash
# set -euo pipefail

BROKER_URL="${PACT_BROKER_URL:-https://pactflow.io}"
BROKER_TOKEN="${PACT_BROKER_TOKEN}"
PROVIDER="inventory-service"
PROVIDER_URL="https://inventory.prod.internal"
PACT_FILE="./pacts/order-service-inventory-service.json"

# Step 1: Publish the consumer pact file to the broker
echo "Publishing consumer pact file..."
pact-broker publish \
  "$PACT_FILE" \
  --broker-base-url "$BROKER_URL" \
  --consumer-app-version "$(git rev-parse --short HEAD)" \
  --tag main \
  --broker-token "$BROKER_TOKEN"

# Step 2: Check if deploying would cause breaking changes
echo "Checking for breaking changes..."
can_deploy=$(pact-broker can-i-deploy \
  --broker-base-url "$BROKER_URL" \
  --pacticipant "$PROVIDER" \
  --broker-token "$BROKER_TOKEN")

if echo "$can_deploy" | grep -q "No breaking changes"; then
  echo "Deployment is safe — no contract violations detected."
else
  echo "BLOCKED: Deploying $PROVIDER would break consumer contracts:"
  echo "$can_deploy"
  exit 1
fi

# Step 3: Run full provider verification against live service
echo "Verifying provider against all consumer contracts..."
pact-broker verify \
  --broker-base-url "$BROKER_URL" \
  --provider "$PROVIDER" \
  --provider-base-url "$PROVIDER_URL" \
  --provider-app-version "$(git rev-parse --short HEAD)" \
  --tag main \
  --broker-token "$BROKER_TOKEN"

echo "Provider verification complete."
```

---

## Constraints

### MUST DO

- Always version contracts explicitly and never remove fields from published contracts — deprecate them with a minimum 2-release grace period instead
- Run contract verification on every PR merge to main/master, not just as a nightly batch job — breakage must be caught immediately
- Use a Pact broker (PactFlow or self-hosted pact-broker) as the single source of truth for all consumer/provider contracts across teams
- Tag pact files with Git commit SHA for full traceability from contract to deployment artifact and back

### MUST NOT DO

- Generate mock data that diverges from the real API responses — mocks must enforce exact contract shapes including field types and required fields
- Skip provider verification in CI because "tests passed locally" — broker-based verification against the live service is mandatory before any deployment
- Delete or overwrite published pact files — maintain version history for audit trails and rollback capability

---

## Output Template

When this skill is active, all generated test code must contain:

1. **Consumer Test Class** — At least one consumer test per API endpoint with explicit `given/upon_receiving/will_respond_with` chain
2. **Mock Server Assertions** — Inline assertions validating response structure (status code, field presence, field types)
3. **Provider Verification Function** — Reusable verification function callable from CI with broker URL and provider details as parameters
4. **Schema Evolution Guard** — Drift detection comparing old vs new contract versions to catch breaking changes before deployment

---

## Related Skills

| Skill | Purpose |
|---|---|
| `microservices-architecture` | Design service boundaries and communication patterns before defining contracts |
| `idempotent-distributed-operations` | Make contract-tested APIs idempotent to handle retries safely |
| `observability-patterns` | Add distributed tracing across service boundaries verified by contracts |
