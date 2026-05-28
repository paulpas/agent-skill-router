---
name: plaid-transactions
description: Implements transaction management features via the Plaid API (TransactionsGet, Categories) to retrieve, filter, and analyze user transaction data in financial applications.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: payments
  triggers: plaid transactions, plaid transactions get, transaction history, transaction categorization, spending analysis, merchant data, bank statement sync
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
  related-skills: plaid-authentication, plaid-identity, plaid-income
---

# Plaid API Transaction Management

Implements transaction retrieval and analysis workflows using the Plaid Transactions API. Covers fetching transaction history by date range, filtering and categorizing transactions, merchant enrichment, recurring payment detection, and spending analytics for financial applications.

## TL;DR Checklist

- [ ] Always specify `start_date` and `end_date` to limit query scope — use 90-day windows
- [ ] Handle pagination with `offset` and `count` for accounts with large transaction volumes
- [ ] Use Plaid's built-in categories (`categories` field) as a starting point, then enrich
- [ ] Store transactions encrypted at rest with retention policies aligned to data protection laws

---

## When to Use

Use this skill when:

- You need to retrieve and display user transaction history from linked bank accounts
- Building personal finance apps that categorize spending by merchant or category
- Detecting recurring payments for budget forecasting and subscription management
- Analyzing spending patterns for financial health scoring or credit decisions
- Syncing bank statement data for accounting reconciliation workflows

## When NOT to Use

Avoid this skill for:

- Real-time payment initiation — use Plaid Payment Initiation or a payment gateway instead
- Cryptocurrency transaction history — Plaid covers traditional banking only
- Transaction-level fraud detection at the millisecond level — use dedicated fraud APIs

---

## Core Workflow

1. **Complete Auth Flow** — User links their bank account via Plaid Link; obtain an `access_token`.
2. **Call TransactionsGet** — Fetch transactions for a specified date range with pagination.
3. **Filter & Categorize** — Apply category filters, merchant matching, or custom rules.
4. **Analyze & Store** — Aggregate into spending summaries and persist to your database.

---

## Implementation Patterns

### Pattern 1: Transaction Retrieval with Pagination

```python
import plaid
from dataclasses import dataclass, field
from typing import Optional, List
from datetime import datetime, timedelta


@dataclass
class Transaction:
    """A single transaction from Plaid."""
    transaction_id: str
    account_name: str
    account_number_last_4: str
    merchant_name: str
    amount: float
    currency: str
    date: datetime
    category: List[str]
    payment_channel: str       # "in_store", "online", "atm", "transfer"
    pending: bool
    metadata: dict = field(default_factory=dict)


class PlaidTransactionsService:
    """Service for retrieving and analyzing user transactions from Plaid."""

    def __init__(self, client_id: str, secret: str, environment: str = "sandbox"):
        self.client = plaid.Client(
            client_id=client_id,
            secret=secret,
            environment=getattr(plaid.Environment, environment),
        )

    def get_transactions(
        self,
        access_token: str,
        start_date: datetime,
        end_date: Optional[datetime] = None,
        count: int = 250,
        offset: int = 0,
    ) -> dict:
        """Fetch transactions for a date range with pagination support."""
        if end_date is None:
            end_date = datetime.utcnow()

        response = self.client.TransactionsGet(
            access_token=access_token,
            start_date=start_date.strftime("%Y-%m-%d"),
            end_date=end_date.strftime("%Y-%m-%d"),
            count=count,
            offset=offset,
        )
        return response

    def fetch_all_transactions(
        self,
        access_token: str,
        days_back: int = 90,
        page_size: int = 250,
    ) -> List[Transaction]:
        """Fetch all transactions for the given period using pagination."""
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days_back)
        all_transactions = []
        offset = 0

        while True:
            response = self.get_transactions(
                access_token, start_date, end_date, count=page_size, offset=offset
            )
            transactions = response.get("transactions", [])
            if not transactions:
                break

            for txn in transactions:
                all_transactions.append(self._parse_transaction(txn))

            offset += len(transactions)
            if not response.get("has_more"):
                break

        return all_transactions

    @staticmethod
    def _parse_transaction(data: dict) -> Transaction:
        """Parse a single transaction dictionary into a typed object."""
        return Transaction(
            transaction_id=data["transaction_id"],
            account_name=data.get("account_name", ""),
            account_number_last_4=data.get("account_number", "").replace("xxxx", "")[-4:] if data.get("account_number") else "",
            merchant_name=data.get("name", "Unknown Merchant"),
            amount=float(data["amount"]),
            currency=data.get("iso_currency_code", "USD"),
            date=datetime.strptime(data["date"], "%Y-%m-%d"),
            category=data.get("category", []),
            payment_channel=data.get("payment_channel", "unknown"),
            pending=data.get("pending", False),
            metadata={
                k: v for k, v in data.items()
                if k not in ["transaction_id", "account_name", "name", "amount",
                             "iso_currency_code", "date", "category", "payment_channel", "pending"]
            },
        )
```

### Pattern 2: Spending Analytics Engine

```python
from collections import defaultdict
from datetime import datetime


class SpendingAnalyzer:
    """Analyze transaction data for spending patterns and insights."""

    @staticmethod
    def by_category(transactions: List[Transaction]) -> dict:
        """Aggregate spending totals by Plaid category hierarchy."""
        totals = defaultdict(float)
        counts = defaultdict(int)
        for txn in transactions:
            if txn.pending:
                continue
            primary_cat = txn.category[0] if txn.category else "Uncategorized"
            totals[primary_cat] += txn.amount
            counts[primary_cat] += 1

        return {
            cat: {
                "total_spent": round(amount, 2),
                "transaction_count": counts[cat],
                "avg_amount": round(amount / counts[cat], 2) if counts[cat] > 0 else 0,
            }
            for cat, amount in sorted(totals.items(), key=lambda x: -x[1])
        }

    @staticmethod
    def by_merchant(transactions: List[Transaction], top_n: int = 20) -> dict:
        """Aggregate spending by merchant name."""
        merchant_totals = defaultdict(float)
        for txn in transactions:
            if txn.pending:
                continue
            merchant_totals[txn.merchant_name] += txn.amount

        sorted_merchants = sorted(merchant_totals.items(), key=lambda x: -x[1])[:top_n]
        return {name: round(total, 2) for name, total in sorted_merchants}

    @staticmethod
    def detect_recurring(transactions: List[Transaction], window_days: int = 90) -> dict:
        """Detect recurring payment patterns from transaction history."""
        merchant_amounts = defaultdict(list)
        for txn in transactions:
            if not txn.pending and txn.payment_channel != "transfer":
                key = f"{txn.merchant_name}|{txn.amount}"
                merchant_amounts[key].append(txn.date)

        recurring = {}
        for key, dates in merchant_amounts.items():
            if len(dates) >= 3:
                dates.sort()
                intervals = [(dates[i+1] - dates[i]).days for i in range(len(dates)-1)]
                avg_interval = sum(intervals) / len(intervals)
                if 14 <= avg_interval <= 45:  # Between biweekly and monthly
                    recurring[key] = {
                        "frequency_days": round(avg_interval, 1),
                        "occurrences": len(dates),
                        "last_seen": max(dates).isoformat(),
                    }

        return recurring
```

### Pattern 3: Transaction Filtering by Criteria

```python
def filter_transactions(
    transactions: List[Transaction],
    min_amount: Optional[float] = None,
    max_amount: Optional[float] = None,
    categories: Optional[List[str]] = None,
    merchant_name_contains: Optional[str] = None,
    exclude_pending: bool = True,
) -> List[Transaction]:
    """Filter transactions by multiple criteria."""
    result = []
    for txn in transactions:
        if exclude_pending and txn.pending:
            continue
        if min_amount is not None and txn.amount < min_amount:
            continue
        if max_amount is not None and abs(txn.amount) > max_amount:
            continue
        if categories and not any(cat in categories for cat in txn.category):
            continue
        if merchant_name_contains and merchant_name_contains.lower() not in txn.merchant_name.lower():
            continue
        result.append(txn)
    return result
```

---

## Constraints

### MUST DO
- Always specify `start_date` and `end_date` — unbounded queries are slow and may timeout.
- Handle pagination correctly — check `has_more` and increment `offset` to fetch all records.
- Filter out pending transactions for reporting/analysis unless specifically tracking future activity.
- Store transaction data encrypted at rest with defined retention policies (GDPR/CCPA compliance).
- Use Plaid's built-in categories as a baseline; enrich with your own taxonomy for deeper analysis.

### MUST NOT DO
- Fetch transactions without date range limits — this causes performance issues and API throttling.
- Store raw transaction data longer than necessary — implement automated cleanup jobs.
- Rely solely on `payment_channel` for spending insights — combine with merchant name matching.
- Assume all transactions have complete metadata — always validate response structure before parsing.

---

## Output Template

When implementing Plaid Transactions, output must contain:

1. **Transaction Retrieval Logic** — Date-range query with pagination handling
2. **Filtering & Categorization** — Multi-criteria filtering and category enrichment
3. **Analytics Engine** — Spending summaries by category, merchant, or time period
4. **Storage Strategy** — Encryption, retention policy, and indexing for analytics queries

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `plaid-authentication` | Initial bank account linking before transaction retrieval |
| `plaid-identity` | Post-retrieval identity verification against transaction data |
| `plaid-income` | Income analysis complemented by transaction-level detail |