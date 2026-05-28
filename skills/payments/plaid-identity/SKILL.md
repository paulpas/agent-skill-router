---
name: plaid-identity
description: Implements identity verification features via the Plaid API (IdentityGet, address validation, name matching) for KYC compliance and user profile enrichment in financial applications.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: payments
  triggers: plaid identity, identity verification, plaid identity get, user identity data, kyc verification, name matching, address verification, account holder verification
  archetypes: tactical
  anti_triggers:
    - brainstorming
    - vague ideation
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  role: implementation
  scope: implementation
  output-format: code
  related-skills: plaid-authentication, plaid-transactions
---

# Plaid API Identity Verification

Implements identity verification workflows using the Plaid Identity API to retrieve and validate user information (name, address, date of birth, SSN last 4) linked to their bank accounts. Covers KYC compliance patterns, name/address matching, and identity data enrichment.

## TL;DR Checklist

- [ ] Always use `IdentityGet` with a valid access token from the auth flow
- [ ] Normalize names (lowercase, strip punctuation) before comparison for fuzzy matching
- [ ] Validate address components against USPS standards for US-based accounts
- [ ] Store identity data encrypted at rest — it is PII and subject to GDPR/CCPA

---

## When to Use

Use this skill when:

- You need to verify that the bank account holder matches the user's claimed identity (KYC)
- Building onboarding flows for lending, payments, or wealth management platforms
- Enriching user profiles with verified address and name data from linked bank accounts
- Automating compliance checks that require proof of identity tied to financial accounts

## When NOT to Use

Avoid this skill for:

- Verifying government-issued IDs (passport, driver's license) — use Plaid IdentityDocs instead
- Real-time fraud scoring — combine with transaction monitoring APIs
- Non-US banking institutions — Plaid primarily covers US and UK banks

---

## Core Workflow

1. **Complete Auth Flow** — User links their bank account via Plaid Link; obtain an `access_token`.
2. **Call IdentityGet** — Retrieve the full identity object including name, address, and SSN last 4.
3. **Normalize & Match** — Normalize user-supplied data (name, address) against Plaid's returned values using fuzzy matching.
4. **Store Results** — Persist verified identity data with timestamped audit trail for compliance.

---

## Implementation Patterns

### Pattern 1: Identity Retrieval and Verification Service

```python
import re
import plaid
from dataclasses import dataclass, field
from typing import Optional, List
from difflib import SequenceMatcher


@dataclass
class IdentityVerificationResult:
    """Result of identity verification against Plaid data."""
    name_match: bool
    address_match: bool
    ssn_provided: bool
    confidence_score: float
    discrepancies: List[str] = field(default_factory=list)


@dataclass
class UserProvidedIdentity:
    first_name: str
    last_name: str
    street_address: str
    city: str
    state: str
    postal_code: str
    ssn_last_4: Optional[str] = None


class PlaidIdentityService:
    """Service for retrieving and verifying user identity from Plaid."""

    def __init__(self, client_id: str, secret: str, environment: str = "sandbox"):
        self.client = plaid.Client(
            client_id=client_id,
            secret=secret,
            environment=getattr(plaid.Environment, environment),
        )

    def get_identity(self, access_token: str) -> dict:
        """Fetch identity data from Plaid for a linked item."""
        response = self.client.IdentityGet(access_token=access_token)
        return response["identity"]

    @staticmethod
    def normalize_name(name: str) -> str:
        """Normalize a name string for comparison: lowercase, strip punctuation, collapse whitespace."""
        name = name.lower().strip()
        name = re.sub(r"[^a-z\s]", "", name)
        name = re.sub(r"\s+", " ", name)
        return name

    def compare_names(
        self,
        expected_name: UserProvidedIdentity,
        plaid_name: dict,
        threshold: float = 0.85,
    ) -> bool:
        """Compare user-provided name against Plaid identity data using fuzzy matching."""
        if not plaid_name.get("names") or len(plaid_name["names"]) < 2:
            return False

        plaid_first = self.normalize_name(plaid_name["names"][0])
        plaid_last = self.normalize_name(plaid_name[1] if len(plaid_name["names"]) > 1 else "")

        expected_first = self.normalize_name(expected_name.first_name)
        expected_last = self.normalize_name(expected_name.last_name)

        first_similarity = SequenceMatcher(None, plaid_first, expected_first).ratio()
        last_similarity = SequenceMatcher(None, plaid_last, expected_last).ratio()

        return (first_similarity + last_similarity) / 2 >= threshold

    @staticmethod
    def normalize_address(
        street: str,
        city: str,
        state: str,
        postal_code: str,
    ) -> tuple:
        """Normalize address components for comparison."""
        street = re.sub(r"[^\w\s]", "", street.strip()).lower()
        # Strip unit numbers for broader matching (Apt 4B → same building as Apt 5C)
        street = re.sub(r"\s*(apt|ste|#|unit)\s*\d+", "", street, flags=re.IGNORECASE).strip()
        city = city.strip().lower()
        state = state.upper().strip()[:2]
        postal_code = re.sub(r"[\s-]", "", postal_code.strip())[:5]
        return (street, city, state, postal_code)

    def compare_address(
        self,
        expected: UserProvidedIdentity,
        plaid_addresses: List[dict],
        threshold: float = 0.80,
    ) -> bool:
        """Compare user-provided address against Plaid identity addresses."""
        if not plaid_addresses:
            return False

        exp_normalized = self.normalize_address(
            expected.street_address, expected.city, expected.state, expected.postal_code
        )

        for addr in plaid_addresses:
            pla_addr = addr.get("data", {})
            if not pla_addr.get("street"):
                continue
            pla_normalized = self.normalize_address(
                pla_addr["street"], pla_addr.get("city", ""), pla_addr.get("state", ""), pla_addr.get("postal_code", "")
            )
            matches = sum(1 for a, b in zip(exp_normalized, pla_normalized) if a == b)
            similarity = matches / len(exp_normalized)
            if similarity >= threshold:
                return True

        return False

    def verify_identity(
        self,
        access_token: str,
        user_identity: UserProvidedIdentity,
    ) -> IdentityVerificationResult:
        """Run full identity verification pipeline."""
        identity_data = self.get_identity(access_token)

        name_match = self.compare_names(user_identity, identity_data)
        address_match = self.compare_address(user_identity, identity_data.get("addresses", []))
        ssn_provided = user_identity.ssn_last_4 is not None and "ssn" in identity_data

        discrepancies = []
        if not name_match:
            discrepancies.append("Name mismatch between provided and Plaid identity data")
        if not address_match:
            discrepancies.append("Address mismatch between provided and Plaid identity data")
        if user_identity.ssn_last_4 and not ssn_provided:
            discrepancies.append("SSN last 4 not available from bank records")

        confidence = sum([name_match, address_match, ssn_provided]) / 3
        return IdentityVerificationResult(
            name_match=name_match,
            address_match=address_match,
            ssn_provided=ssn_provided,
            confidence_score=round(confidence, 2),
            discrepancies=discrepancies,
        )
```

### Pattern 2: Address Data Structure Reference

Plaid Identity `addresses` array structure:

```python
# Plaid returns addresses in this format:
{
    "addresses": [
        {
            "address_types": ["primary"],
            "data": {
                "city": "San Francisco",
                "state": "CA",
                "postal_code": "94105",
                "street": "123 Market Street",
            },
            "principal": True,  # Primary residence vs. secondary
        }
    ]
}
```

### Pattern 3: Audit Logging for KYC Compliance

```python
import json
import logging
from datetime import datetime


class IdentityAuditLogger:
    """Logs identity verification events for regulatory audit trails."""

    def __init__(self, user_id: str):
        self.user_id = user_id
        self.logger = logging.getLogger(f"kyc.{user_id}")

    def log_verification(
        self,
        result: "IdentityVerificationResult",
        access_token_masked: str,
        requested_at: datetime,
    ):
        """Log a verification attempt with masked token for audit."""
        masked_token = f"plaid_{access_token_masked[:4]}****{access_token_masked[-4:]}"
        self.logger.info(
            json.dumps({
                "event": "identity_verification",
                "user_id": self.user_id,
                "timestamp": requested_at.isoformat(),
                "masked_access_token": masked_token,
                "name_match": result.name_match,
                "address_match": result.address_match,
                "confidence_score": result.confidence_score,
                "discrepancies": result.discrepancies,
                "outcome": "PASS" if result.confidence_score >= 0.67 else "FAIL",
            })
        )
```

---

## Constraints

### MUST DO
- Always use HTTPS (TLS 1.2+) for all API connections to Plaid.
- Normalize names and addresses before comparison — raw strings rarely match exactly.
- Log every verification attempt with timestamp, confidence score, and outcome for audit trails.
- Mask access tokens in logs — never log full tokens even partially.
- Store verified identity data encrypted at rest (AES-256 or equivalent).

### MUST NOT DO
- Share identity data with third parties without explicit user consent.
- Accept name matches below 0.85 similarity threshold without manual review.
- Store SSN last 4 unencrypted — this is regulated PII under federal and state laws.
- Rely solely on automated matching for high-value accounts — route edge cases to manual review.
- Use `sandbox` identity data in production — sandbox returns mock/mock-derived records only.

---

## Output Template

When implementing Plaid Identity, output must contain:

1. **Identity Retrieval Call** — `IdentityGet` invocation with error handling
2. **Matching Logic** — Fuzzy matching thresholds and normalization rules
3. **Audit Trail** — Logging structure for compliance documentation
4. **Storage Schema** — Database schema for verified identity records

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `plaid-authentication` | Initial bank account linking before identity verification |
| `plaid-transactions` | Post-verification transaction analysis and income checks |