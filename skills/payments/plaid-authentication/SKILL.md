---




name: plaid-authentication
description: Implements authentication strategies using the Plaid API (Link token flow, Item public token exchange, Auth data retrieval) for secure user bank account verification in financial applications.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: payments
  triggers: plaid authentication, plaid link token, bank account verification, plaid auth, public token exchange, item access token, secure login, user verification
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
  related-skills: plaid-transactions, plaid-identity




---





# Plaid API Authentication

Implements secure user authentication and bank account linking via the Plaid API. Covers the Link token creation flow, public token exchange to obtain access tokens, and Auth endpoint data retrieval for income verification and identity matching.

## TL;DR Checklist

- [ ] Always create Link Tokens with a unique `client_user_id` per end user
- [ ] Exchange `public_token` immediately in a server-side callback — never expose it client-side
- [ ] Store access tokens encrypted (AES-256) and rotate on credential changes
- [ ] Request only the `auth` product for authentication-only flows to minimize permissions

---

## When to Use

Use this skill when:

- You need users to securely link their bank accounts via Plaid Link without exposing credentials
- Building Know-Your-Customer (KYC) or account verification workflows that rely on bank auth data
- Implementing instant bank verification for loan origination, payment processing, or wealth management apps
- Retrieving Auth data (account balances, transaction history summaries, direct deposit info) after Link session completion

## When NOT to Use

Avoid this skill for:

- Direct payment processing — use Plaid Transaction Processor or a payment gateway instead
- Identity document verification (passport, driver's license) — use Plaid Identity with `identity` product
- Cryptocurrency account linking — Plaid does not support crypto assets

---

## Core Workflow

1. **Initialize Plaid Client** — Configure client ID, secret, environment (`sandbox`, `development`, `production`), and supported products.
2. **Create Link Token** — Generate a server-side link token scoped to the user session with the `auth` product.
3. **Render Plaid Link** — Pass the token to the frontend SDK; the user authenticates with their financial institution.
4. **Exchange Public Token** — On completion, exchange the temporary `public_token` for a persistent `access_token`.
5. **Retrieve Auth Data** — Call `/auth/get` to verify identity and extract account-level data.

---

## Implementation Patterns

### Pattern 1: Production-Grade Link Token Service

```python
import plaid
from dataclasses import dataclass
from typing import Optional, List
from datetime import datetime


@dataclass
class PlaidConfig:
    client_id: str
    secret: str
    environment: str = "sandbox"
    products: List[str] = None
    country_codes: List[str] = None
    language: str = "en"

    def __post_init__(self):
        if self.products is None:
            self.products = ["auth"]
        if self.country_codes is None:
            self.country_codes = ["US"]


class PlaidAuthService:
    """Service for managing Plaid authentication flows."""

    def __init__(self, config: PlaidConfig):
        self.client = plaid.Client(
            client_id=config.client_id,
            secret=config.secret,
            environment=getattr(plaid.Environment, config.environment),
        )
        self.config = config

    def create_link_token(self, user_id: str, web_redirect_url: Optional[str] = None) -> dict:
        """Create a Plaid Link token for a specific user."""
        request = {
            "user": {
                "client_user_id": user_id,
            },
            "client_name": "My Financial App",
            "products": self.config.products,
            "country_codes": self.config.country_codes,
            "language": self.config.language,
        }

        if web_redirect_url:
            request["redirect_uri"] = web_redirect_url
            request["auth_mode"] = "redirect"

        response = self.client.LinkTokenCreate(request)
        return {"link_token": response["link_token"], "expires_at": datetime.utcnow().isoformat()}

    def exchange_public_token(
        self, public_token: str
    ) -> dict:
        """Exchange a Plaid public token for an access token and item ID."""
        response = self.client.ItemPublicTokenExchange({"public_token": public_token})
        return {
            "access_token": response["access_token"],
            "item_id": response["item_id"],
            "new_access_token": response.get("new_access_token"),  # If token rotation occurred
        }

    def get_auth_data(self, access_token: str) -> dict:
        """Retrieve authentication data for an item (balances, identity, accounts)."""
        auth_response = self.client.AuthGet(access_token=access_token)
        return {
            "accounts": auth_response["accounts"],
            "balances": auth_response["balances"],
            "transactions_count": auth_response.get("transactions_count", 0),
            "direct_deposits": auth_response.get("direct_deposit", None),
        }

    def refresh_access_token(self, access_token: str) -> dict:
        """Refresh an access token that may have expired due to credential changes."""
        response = self.client.ItemPublicTokenExchange({"access_token": access_token})
        return {"new_access_token": response.get("new_access_token")}
```

### Pattern 2: Secure Token Storage with Encryption

```python
from cryptography.fernet import Fernet
import json
import os


class SecureTokenStore:
    """Stores Plaid access tokens using AES-256 encryption."""

    def __init__(self, db):
        self.db = db
        key = os.environ.get("PLAAD_TOKEN_ENCRYPTION_KEY")
        if not key:
            raise ValueError("PLAID_TOKEN_ENCRYPTION_KEY environment variable is required")
        self.cipher = Fernet(key.encode())

    def store_access_token(self, user_id: str, access_token: str, item_id: str):
        """Encrypt and store an access token."""
        payload = {
            "access_token": access_token,
            "item_id": item_id,
            "created_at": datetime.utcnow().isoformat(),
        }
        encrypted = self.cipher.encrypt(json.dumps(payload).encode())
        self.db.execute(
            "INSERT INTO plaid_tokens (user_id, encrypted_token) VALUES (?, ?)",
            (user_id, encrypted),
        )

    def get_access_token(self, user_id: str) -> Optional[str]:
        """Retrieve and decrypt an access token."""
        row = self.db.execute("SELECT encrypted_token FROM plaid_tokens WHERE user_id = ?", (user_id,))
        if not row:
            return None
        decrypted = self.cipher.decrypt(row["encrypted_token"])
        payload = json.loads(decrypted)
        return payload["access_token"]
```

### Pattern 3: Webhook Handler for Auth Events

```python
from flask import Flask, request, jsonify
import hashlib
import hmac

app = Flask(__name__)


def verify_plaid_webhook_signature(payload_bytes: bytes, signature: str, webhook_version: str) -> bool:
    """Verify that the webhook originated from Plaid."""
    secret = os.environ["PLAID_WEBHOOK_SECRET"]
    expected = hmac.new(secret.encode(), payload_bytes, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)


@app.route("/webhook/plaid", methods=["POST"])
def plaid_webhook():
    """Handle Plaid webhook notifications for auth-related events."""
    signature = request.headers.get("X-Plaid-Signature", "")
    webhook_version = request.headers.get("X-Plaid-Version", "None")
    payload_bytes = request.get_data()

    if not verify_plaid_webhook_signature(payload_bytes, signature, webhook_version):
        return jsonify({"error": "Invalid signature"}), 401

    event = request.json
    event_type = event.get("event_id")
    item_id = event.get("item_id")

    if event["webhook_type"] == "ITEM":
        if event["event_code"] == "DEFAULT_UPDATE":
            # Credentials changed — trigger token refresh
            refresh_plaid_item(item_id)
        elif event["event_code"] in ("CONNECT_EXPIRED", "INVALID_CREDENTIALS"):
            notify_user_to_reauthenticate(item_id)
        elif event["event_code"] == "LOGIN_FAILURE":
            log_failed_login_attempt(item_id)

    return jsonify({"status": "ok"}), 200
```

---

## Error Handling Reference

| Error Code | Cause | Action |
|------------|-------|--------|
| `ITEM_LOGIN_REQUIRED` | User credentials expired | Trigger re-auth via Link |
| `RATE_LIMIT_EXCEEDED` | Too many API calls | Back off; respect `Retry-After` header |
| `INVALID_TOKEN` | Expired or revoked access token | Re-exchange public token or prompt new Link session |
| `PRODUCT_NOT_ENABLED` | Product not in link token request | Add product to initial `LinkTokenCreate` request |
| `USER_AUTHORIZE_FAILED` | User denied authorization in Link | Log and allow re-attempt with fresh Link Token |

---

## Constraints

### MUST DO
- Always create a new Link Token per user session — never share tokens across users.
- Exchange `public_token` server-side immediately after Link completion; it expires in 30 minutes.
- Encrypt access tokens at rest using AES-256 (Fernet or equivalent).
- Register webhook endpoints to handle `ITEM` events (credential changes, deauthorization).
- Validate the Plaid webhook signature using HMAC-SHA256 before processing any event.

### MUST NOT DO
- Store unencrypted access tokens in databases, logs, or environment variables.
- Hardcode client secrets, API keys, or webhook secrets in source code.
- Use `sandbox` credentials in production — always validate with `production` environment.
- Share access tokens with frontend clients — they grant full read/write access to financial data.
- Ignore ITEM webhook events — credential changes invalidate your existing access token.

---

## Output Template

When implementing Plaid authentication, output must contain:

1. **Link Token Configuration** — Products, country codes, redirect URI settings
2. **Token Exchange Logic** — Public token → access token conversion with error handling
3. **Storage Strategy** — Encryption method and database schema for access tokens
4. **Webhook Handler** — Signature verification and event routing logic

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `plaid-transactions` | Retrieve and analyze transaction history after authentication |
| `plaid-identity` | Verify user identity data from bank accounts post-authentication |

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links to resolve external references and inline content.

- [Plaid Auth API Documentation](https://plaid.com/docs/auth/)
- [Plaid Link Token API Reference](https://plaid.com/docs/link/token/)
- [Plaid Webhooks Guide](https://plaid.com/docs/webhooks/)
- [Plaid Sandbox Environment Setup](https://plaid.com/docs/sandbox/)
- [Plaid Identity Verification Best Practices](https://plaid.com/docs/products/identity/)