---
name: plaid-income
description: Implements income verification features via the Plaid API (IncomeGet, IncomeList) for employment-based and deposited income analysis in lending, underwriting, and financial applications.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: payments
  triggers: plaid income, income verification, plaid income get, employment income, salary verification, deposited income, earning capacity analysis, underwriting income
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

# Plaid API Income Verification

Implements income verification workflows using the Plaid Income API to retrieve employment-based and deposited income data from linked bank accounts. Covers salary verification, income categorization, earning capacity estimation, and underwriting-grade analysis for lending decisions.

## TL;DR Checklist

- [ ] Always call `IncomeGet` after the user has linked an account with sufficient transaction history (>= 60 days recommended)
- [ ] Handle `INCOME_NOT_AVAILABLE` error gracefully — not all institutions provide income data
- [ ] Normalize amounts to annual figures using Plaid's `annualized_income` field for consistency
- [ ] Store income results encrypted — salary and employment data is sensitive PII

---

## When to Use

Use this skill when:

- You need verified income data for loan underwriting, mortgage pre-approval, or credit decisions
- Building rent affordability checks for rental applications
- Automating income verification to replace manual pay-stub submission in onboarding flows
- Estimating earning capacity from deposited income patterns for alternative credit scoring

## When NOT to Use

Avoid this skill for:

- Real-time payroll integration — use ADP, Gusto, or Rippling APIs directly
- Cryptocurrency or unbanked income sources — Plaid covers traditional bank accounts only
- Historical income analysis beyond the data available (Plaid provides recent deposits only)

---

## Core Workflow

1. **Complete Auth Flow** — User links their bank account via Plaid Link; obtain an `access_token`.
2. **Call IncomeGet** — Retrieve employment-based and deposited income summaries from Plaid.
3. **Validate Availability** — Handle cases where income data is not available for the institution or account type.
4. **Analyze & Store** — Process income data into structured format, apply normalization, and store with audit trail.

---

## Implementation Patterns

### Pattern 1: Income Retrieval and Analysis Service

```python
import plaid
from dataclasses import dataclass, field
from typing import Optional, List
from datetime import datetime


@dataclass
class IncomeEntry:
    """A single income record from Plaid."""
    income_type: str       # "employment" or "deposited"
    amount: float
    currency: str          # ISO 4217 (e.g., "USD")
    annualized_amount: Optional[float]
    frequency: Optional[str]
    employer_name: Optional[str]
    last_verified_date: Optional[datetime]


@dataclass
class IncomeVerificationResult:
    """Aggregated result of Plaid income verification."""
    employment_incomes: List[IncomeEntry] = field(default_factory=list)
    deposited_incomes: List[IncomeEntry] = field(default_factory=list)
    total_annualized_income: Optional[float] = None
    income_confidence: str  # "high", "medium", "low"
    errors: List[str] = field(default_factory=list)


class PlaidIncomeService:
    """Service for retrieving and analyzing user income data from Plaid."""

    def __init__(self, client_id: str, secret: str, environment: str = "sandbox"):
        self.client = plaid.Client(
            client_id=client_id,
            secret=secret,
            environment=getattr(plaid.Environment, environment),
        )

    def get_income(self, access_token: str) -> dict:
        """Fetch income data from Plaid for a linked item."""
        response = self.client.IncomeGet(access_token=access_token)
        return response

    @staticmethod
    def _parse_income_entry(data: dict) -> IncomeEntry:
        """Parse a single income entry dictionary into a typed object."""
        return IncomeEntry(
            income_type=data.get("income_type", "unknown"),
            amount=float(data.get("amount", 0)),
            currency=data.get("currency", "USD"),
            annualized_amount=float(data["annualized_income"]) if data.get("annualized_income") else None,
            frequency=data.get("frequency"),
            employer_name=data.get("employer", {}).get("name") if data.get("employer") else None,
            last_verified_date=datetime.fromisoformat(data["last_verified_at"]) if data.get("last_verified_at") else None,
        )

    def analyze_income(self, access_token: str) -> IncomeVerificationResult:
        """Retrieve and analyze income data for underwriting-grade analysis."""
        result = IncomeVerificationResult()

        try:
            response = self.get_income(access_token)
        except plaid.errors.PlaidApiError as e:
            if "INCOME_NOT_AVAILABLE" in str(e):
                result.errors.append("Income data is not available for this institution or account")
                result.income_confidence = "low"
                return result
            raise

        raw_data = response.get("incomes", [])
        for entry in raw_data:
            parsed = self._parse_income_entry(entry)
            if entry.get("income_type") == "employment":
                result.employment_incomes.append(parsed)
            elif entry.get("income_type") == "deposited":
                result.deposited_incomes.append(parsed)

        # Calculate total annualized income
        annual_amounts = [i.annualized_amount for i in raw_data if i.annualized_amount]
        if annual_amounts:
            result.total_annualized_income = sum(annual_amounts)

        # Determine confidence level
        if len(raw_data) >= 3:
            result.income_confidence = "high"
        elif len(raw_data) >= 1:
            result.income_confidence = "medium"
        else:
            result.income_confidence = "low"

        return result
```

### Pattern 2: Income Data Structure Reference

Plaid returns income data in this structure:

```python
{
    "incomes": [
        {
            "id": "income_123",
            "income_type": "employment",   # or "deposited"
            "amount": 6500.00,             # per-period amount
            "currency": "USD",
            "frequency": "monthly",        # monthly, biweekly, weekly, annually
            "annualized_income": 78000.00, # annualized figure
            "last_verified_at": "2025-01-15T10:30:00Z",
            "employer": {
                "name": "Acme Corp",
                "industry_code": "491112"  # NAICS code
            }
        }
    ]
}
```

### Pattern 3: Income Eligibility Checker

```python
@dataclass
class LendingCriteria:
    """Lending eligibility criteria for income-based decisions."""
    min_annual_income: float
    max_debt_to_income_ratio: float = 0.43
    required_employment_length_months: int = 6


class IncomeEligibilityChecker:
    """Evaluate lending eligibility against Plaid income data."""

    def __init__(self, criteria: LendingCriteria):
        self.criteria = criteria

    def check_eligibility(
        self,
        result: IncomeVerificationResult,
        monthly_debt_obligations: float = 0.0,
    ) -> dict:
        """Determine if user meets lending criteria based on income data."""
        annual_income = result.total_annualized_income or 0
        monthly_income = annual_income / 12.0
        dti_ratio = monthly_debt_obligations / monthly_income if monthly_income > 0 else float("inf")

        return {
            "meets_min_income": annual_income >= self.criteria.min_annual_income,
            "dti_ratio": round(dti_ratio, 4),
            "within_dti_limit": dti_ratio <= self.criteria.max_debt_to_income_ratio,
            "confidence_level": result.income_confidence,
            "approved": (
                annual_income >= self.criteria.min_annual_income
                and dti_ratio <= self.criteria.max_debt_to_income_ratio
                and result.income_confidence in ("high", "medium")
            ),
            "rejection_reasons": [
                reason
                for reason, passed in [
                    ("Insufficient income", annual_income >= self.criteria.min_annual_income),
                    ("Debt-to-income ratio too high", dti_ratio <= self.criteria.max_debt_to_income_ratio),
                    ("Low data confidence", result.income_confidence != "low"),
                ]
                if not passed
            ],
        }
```

---

## Constraints

### MUST DO
- Always check for `INCOME_NOT_AVAILABLE` errors before assuming data retrieval failure.
- Use the `annualized_income` field for consistent comparison across different pay frequencies.
- Store income data with timestamps indicating when it was last verified by Plaid.
- Apply encryption at rest for all stored income and employment data (AES-256 recommended).
- Log income verification attempts with confidence scores for compliance documentation.

### MUST NOT DO
- Use income data older than 90 days without re-fetching — bank deposits can change frequently.
- Store unencrypted income information in databases, caches, or log files.
- Make lending decisions based solely on `low` confidence results — require manual review.
- Share income data with third parties without explicit user consent and documented purpose.
- Assume all Plaid-linked institutions provide income data — always handle gracefully.

---

## Output Template

When implementing Plaid Income, output must contain:

1. **Income Retrieval Call** — `IncomeGet` invocation with error handling for unavailable data
2. **Analysis Logic** — Annualized income calculation and confidence scoring
3. **Eligibility Engine** — Criteria matching against lending or service requirements
4. **Storage Strategy** — Encryption method and retention policy for sensitive income data

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `plaid-authentication` | Initial bank account linking before income verification |
| `plaid-transactions` | Supplement income analysis with transaction-level detail |
