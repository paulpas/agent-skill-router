---
name: paypal-api-payments-commerce
description: Implements PayPal API functionalities focusing on Orders, Payments, Subscriptions, Payouts, and Disputes for comprehensive ecommerce management.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  role: implementation
  output-format: code
  triggers: paypal api, orders, payments, subscriptions, payouts, disputes
  related-skills: coding-payment-processing, coding-subscription-management
  archetypes: payment processing, ecommerce
  anti_triggers: manual processing, error-prone
  response_profile:
      verbosity: medium
      directive_strength: high
  version: "1.0.0"
  domain: coding
  role: implementation
  scope: implementation
  output-format: code
  triggers: paypal api, orders, payments, subscriptions, payouts, disputes, ecommerce
  related-skills: coding-payment-processing, coding-subscription-management
---

# PayPal API for Payments & Commerce
This skill implements the core functionalities of the PayPal API focused on managing ecommerce transactions, including Orders, Payments, Subscriptions, Payouts, and Disputes. It provides developers with clear guidelines and implementation patterns for integrating PayPal services into their applications.

## TL;DR Checklist
- [ ] Validate all API requests for required fields and scopes (Fail Fast)
- [ ] Use guard clauses to handle missing input at function entry (Early Exit)
- [ ] Ensure all payment methods are tested with automated unit tests (Atomic Predictability)
- [ ] Return structured data responses for easy handling (No Mutations)
- [ ] Implement error handling for all API interactions to catch failures immediately

## When to Use
- To manage orders for online store products directly through PayPal.
- To process one-time or recurring payments securely through PayPal.
- To handle subscription-based billing for services using PayPal.
- To facilitate payouts to multiple users (e.g., affiliates or contractors).
- To manage disputes for transactions via PayPal's built-in handling.

## Core Workflow
1. **Login & Authentication**: Ensure valid access tokens are generated and stored.
   *Checkpoint*: All API calls must authenticate successfully using OAuth tokens.

2. **Orders Management**: Create, update, and retrieve orders from PayPal.
   *Checkpoint*: Order IDs must be correct per PayPal's validation rules.

3. **Payment Processing**: Initiate payments and ensure captured payments are tracked.
   *Checkpoint*: Each transaction must receive a unique transaction ID.

4. **Subscriptions Handling**: Implement subscription plans and manage recurring billing.
   *Checkpoint*: Subscription status must align with PayPal's backend.

5. **Payouts Execution**: Process payouts and track status within the platform.
   *Checkpoint*: Payouts must be handled securely and logged for tracking purposes.

6. **Handling Disputes**: Respond to transaction disputes using PayPal's dispute management features.
   *Checkpoint*: Ensure dispute statuses are updated correctly after resolution.

## Implementation Patterns
### Pattern 1: Authenticating with PayPal
```python
import requests

def get_paypal_access_token(client_id: str, client_secret: str) -> str:
    """Gets an OAuth 2.0 token from PayPal to authorize API requests."""
    url = "https://api.paypal.com/v1/oauth2/token"
    headers = {"Accept": "application/json", "Accept-Language": "en_US"}
    data = {"grant_type": "client_credentials"}
    response = requests.post(url, headers=headers, data=data, auth=(client_id, client_secret))
    response.raise_for_status()  # Fail fast
    return response.json().get("access_token")
```
### Pattern 2: Creating an Order
```python
def create_paypal_order(access_token: str, order_data: dict) -> dict:
    """Creates a PayPal order with specified parameters."""
    url = "https://api.paypal.com/v2/checkout/orders"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {access_token}"
    }
    response = requests.post(url, json=order_data, headers=headers)
    response.raise_for_status()  # Fail fast
    return response.json()
```
### Pattern 3: Processing a Payment
```python
def process_payment(access_token: str, order_id: str) -> dict:
    """Finalize a payment for an order once a buyer approves it."""
    url = f"https://api.paypal.com/v2/checkout/orders/{order_id}/capture"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {access_token}"
    }
    response = requests.post(url, headers=headers)
    response.raise_for_status()  # Fail fast
    return response.json()
```

### MUST DO
- Always validate input data against PayPal API specifications (Early Exit).
- Include detailed logging for every API call made, especially on failures (Audit Trail).
- Ensure secure handling of sensitive customer information according to PCI standards.

### MUST NOT DO
- Fail to handle HTTP errors returned by PayPal gracefully (Fail Fast).
- Bypass input validation before API calls (Fail Fast).
- Use hardcoded values for sensitive elements like credentials (Security Risk).

## Output Template
When invoking this skill, you will produce:
1. **Access Token** - A token for authenticating further API calls.
2. **Order ID** - The unique identifier for orders created.
3. **Payment Capture Status** - Detailed response of payment processing, including status.
4. **Error Responses** - Specific error messages detailing any issues with requests.
5. **Timing Information** - Time taken for each API call, useful for performance monitoring.

## Related Skills
| Skill | Purpose |
|---|---|
| coding-payment-processing | General guidelines for processing payments across APIs |
| coding-subscription-management | Handling subscription-based billing operations |

---

---

## Constraints

### MUST DO
- Validate all inputs at function boundaries before processing — guard clauses should fail early with descriptive errors
- Implement proper error handling that distinguishes between recoverable and unrecoverable failures
- Add comprehensive logging with structured context (correlation IDs, operation names, timing) for debugging and monitoring
- Write unit tests covering normal operations, edge cases, and error conditions before integrating the component

### MUST NOT DO
- Do not silently swallow exceptions — always log or propagate errors with meaningful context
- Avoid unbounded resource allocation without limits (connection pools, memory buffers, thread counts)
- Never use hardcoded credentials, API keys, or secrets in source code
- Do not bypass input validation for perceived performance gains


## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [PayPal Payments Commerce API Documentation](https://developer.paypal.com/docs/api/payments/v2/)
- [PayPal Orders API Reference](https://developer.paypal.com/docs/api/orders-v2/#orders_create)
- [PayPal Subscriptions API Guide](https://developer.paypal.com/docs/subscriptions/)
- [PayPal Payouts API Implementation](https://developer.paypal.com/docs/api/payouts-to-paypal-balance/v2/)
- [PayPal Dispute Management API](https://developer.paypal.com/docs/disputes/)
