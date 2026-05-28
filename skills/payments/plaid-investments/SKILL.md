---
name: plaid-investments
description: Implements investment tracking features via the Plaid API (InvestmentsGet, HoldingsList, Transactions) to access and manage investment portfolio data for users in financial applications.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: payments
  triggers: plaid investments, investment tracking, plaid investments get, portfolio holdings, investment positions, securities data, brokerage account sync, asset allocation
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

# Plaid API Investment Tracking

Implements investment portfolio management workflows using the Plaid Investments API to retrieve holdings, positions, securities data, and investment-related transactions from linked brokerage accounts. Covers portfolio aggregation, asset allocation analysis, and performance tracking.

## TL;DR Checklist

- [ ] Always call `InvestmentsGet` with a valid access token from the auth flow
- [ ] Include relevant product scopes (`investments`) in your Link Token request
- [ ] Handle institutions that don't support investment data gracefully
- [ ] Cache holdings data and refresh on schedule — brokerage data updates are not real-time

---

## When to Use

Use this skill when:

- You need to aggregate investment portfolio data from multiple brokerage accounts
- Building wealth management or robo-advisor platforms that display portfolio performance
- Implementing asset allocation analysis for financial planning tools
- Tracking investment transactions (buys, sells, dividends) alongside banking transactions

## When NOT to Use

Avoid this skill for:

- Real-time trading execution — Plaid is read-only for investment data
- Cryptocurrency holdings — Plaid does not currently support crypto brokerage accounts
- Options chain data or derivatives analysis beyond basic position summaries

---

## Core Workflow

1. **Complete Auth Flow** — User links their brokerage account via Plaid Link with `investments` product.
2. **Call InvestmentsGet** — Retrieve holdings, positions, and securities information from Plaid.
3. **Map Securities** — Enrich data with additional metadata (sector, exchange) using external sources if needed.
4. **Analyze & Display** — Compute portfolio metrics (total value, allocation percentages, performance).

---

## Implementation Patterns

### Pattern 1: Investment Data Retrieval Service

```python
import plaid
from dataclasses import dataclass, field
from typing import Optional, List
from datetime import datetime


@dataclass
class InvestmentPosition:
    """A single investment holding/position from Plaid."""
    position_id: str
    institution_name: str
    quantity: float
    unit_price: Optional[float]  # May be null for some institutions
    market_value: Optional[float]
    security_id: str
    type: str                    # "equity", "etf", "mutual_fund", "fixed_income"
    name: str
    ticker_symbol: Optional[str]


@dataclass
class PortfolioSnapshot:
    """Aggregated portfolio snapshot."""
    positions: List[InvestmentPosition] = field(default_factory=list)
    total_market_value: float = 0.0
    total_cost_basis: Optional[float] = None
    gain_loss: Optional[float] = None
    gain_loss_percentage: Optional[float] = None


class PlaidInvestmentsService:
    """Service for retrieving and analyzing investment portfolio data from Plaid."""

    def __init__(self, client_id: str, secret: str, environment: str = "sandbox"):
        self.client = plaid.Client(
            client_id=client_id,
            secret=secret,
            environment=getattr(plaid.Environment, environment),
        )

    def get_investments(self, access_token: str) -> dict:
        """Fetch investment holdings and positions from Plaid."""
        response = self.client.InvestmentsGetV2(access_token=access_token)
        return response

    @staticmethod
    def _parse_position(data: dict) -> InvestmentPosition:
        """Parse a single position dictionary into a typed object."""
        security = data.get("security", {})
        return InvestmentPosition(
            position_id=data["position_id"],
            institution_name=data.get("institution_name", "Unknown"),
            quantity=float(data.get("quantity", 0)),
            unit_price=float(data["unit_price"]) if data.get("unit_price") else None,
            market_value=float(data["market_value"]) if data.get("market_value") else None,
            security_id=security.get("investment_type", "unknown"),
            type=security.get("type", "equity"),
            name=security.get("name", "Unknown"),
            ticker_symbol=security.get("ticker_symbol"),
        )

    def analyze_portfolio(self, access_token: str) -> PortfolioSnapshot:
        """Retrieve and aggregate investment data into a portfolio snapshot."""
        result = PortfolioSnapshot()

        try:
            response = self.get_investments(access_token)
        except plaid.errors.PlaidApiError as e:
            raise RuntimeError(f"Failed to retrieve investments: {e}") from e

        raw_positions = response.get("positions", [])
        for pos_data in raw_positions:
            result.positions.append(self._parse_position(pos_data))

        # Calculate totals
        values = [p.market_value for p in result.positions if p.market_value is not None]
        result.total_market_value = sum(values)

        cost_basis = [p.unit_price * p.quantity for p in result.positions if p.unit_price]
        if cost_basis:
            result.total_cost_basis = sum(cost_basis)
            result.gain_loss = result.total_market_value - result.total_cost_basis
            if result.total_cost_basis > 0:
                result.gain_loss_percentage = (result.gain_loss / result.total_cost_basis) * 100

        return result
```

### Pattern 2: Asset Allocation Analyzer

```python
from collections import defaultdict


class AssetAllocationAnalyzer:
    """Analyze portfolio allocation across asset types and sectors."""

    @staticmethod
    def compute_allocation(positions: List[InvestmentPosition], total_value: float) -> dict:
        """Compute asset allocation percentages by position type."""
        if total_value == 0:
            return {}

        allocation = defaultdict(float)
        for pos in positions:
            pct = (pos.market_value or 0) / total_value * 100
            allocation[pos.type] += pct

        return {
            asset: round(pct, 2)
            for asset, pct in sorted(allocation.items(), key=lambda x: -x[1])
        }

    @staticmethod
    def generate_allocation_summary(
        positions: List[InvestmentPosition], total_value: float
    ) -> str:
        """Generate a human-readable allocation summary."""
        allocation = AssetAllocationAnalyzer.compute_allocation(positions, total_value)
        lines = [f"Portfolio Total: ${total_value:,.2f}"]
        for asset_type, pct in allocation.items():
            bar = "#" * int(pct / 2)
            lines.append(f"  {asset_type:>15}: {pct:5.1f}% {bar}")
        return "\n".join(lines)
```

### Pattern 3: Investment Transaction History

```python
def get_investment_transactions(client, access_token: str, count: int = 20) -> List[dict]:
    """Retrieve recent investment-related transactions."""
    response = client.TransactionsGet(
        access_token=access_token,
        count=count,
        product_types=["transactions"],
    )
    # Filter for investment-type transactions (buys, sells, dividends)
    investment_txns = [
        txn for txn in response.get("transactions", [])
        if txn.get("payment_category", {}).get("subcategory") in [
            "Investment Transfer", "Dividend", "Capital Gain Distribution"
        ]
    ]
    return investment_txns
```

---

## Constraints

### MUST DO
- Always request the `investments` product when creating Link Tokens for brokerage accounts.
- Handle institutions that don't support investment data (e.g., some credit unions) gracefully.
- Cache portfolio snapshots and refresh on a schedule — real-time pricing is not guaranteed.
- Compute allocation percentages based on market value, not cost basis.
- Log all investment API calls with correlation IDs for auditability.

### MUST NOT DO
- Display unverified investment values as current prices — clarify that data may be delayed.
- Make trading decisions based solely on cached portfolio data without checking freshness timestamps.
- Store brokerage credentials or access tokens in plaintext in any service layer.
- Assume all linked accounts contain investment data — always validate response structure before parsing.

---

## Output Template

When implementing Plaid Investments, output must contain:

1. **Investments API Call** — `InvestmentsGetV2` invocation with proper error handling
2. **Portfolio Aggregation** — Total value calculation and gain/loss computation
3. **Allocation Analysis** — Asset type distribution with percentages
4. **Caching Strategy** — Refresh interval and freshness validation logic

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `plaid-authentication` | Initial brokerage account linking before investment data retrieval |
| `plaid-transactions` | Combine banking and investment transactions for full financial picture |