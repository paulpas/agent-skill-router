---
name: square-payments

description: Integrates Square Payments API for handling payment transactions, refunds, and reporting.

license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: commerce
  role: implementation
  output-format: code
  triggers: square payments, payment processing, transactions, refunds, reporting
  archetypes: payment processing, e-commerce transactions
  anti_triggers: manual payments, offline transactions
  response_profile:
      verbosity: medium
      directive_strength: high
  related-skills: commerce/paypal-api-payments-commerce, commerce/shopify-api
---

# Square Payments API Integration
Implements integration with Square Payments API, allowing for seamless transaction processing, refunds, and reporting.

## When to Use
Use this skill for:
- Integrating payment processing capabilities into e-commerce applications.
- Managing refunds through the Square Payments API.
- Generating reports on transactions and sales.

## Core Workflow
1. **Initiate a Payment**  — Create a payment request for user transactions.
2. **Process Payment**  — Handle the response from Square, ensuring transaction validation.
3. **Manage Refunds**  — Process refunds when necessary without impacting sales reporting.

## Implementation Patterns
### Pattern 1: Creating a Payment Request
```python
import requests

# Payment request details
def create_payment(amount: float, currency: str, card_token: str):
    headers = {'Authorization': 'Bearer YOUR_ACCESS_TOKEN', 'Content-Type': 'application/json'}
    payment_data = {
        'amount_money': {
            'amount': int(amount * 100),  # Amount in cents
            'currency': currency
        },
        'source_id': card_token,
        'idempotency_key': 'unique_key'
    }
    response = requests.post('https://connect.squareup.com/v2/payments', json=payment_data, headers=headers)
    response.raise_for_status()  # Raise an error for bad responses
    return response.json()
```

### Pattern 2: Handling Refunds
```python
# Refund transaction by Square ID

def refund_payment(payment_id: str):
    headers = {'Authorization': 'Bearer YOUR_ACCESS_TOKEN', 'Content-Type': 'application/json'}
    response = requests.post(f'https://connect.squareup.com/v2/refunds', json={'payment_id': payment_id}, headers=headers)
    response.raise_for_status()  # Raise an error for bad responses
    return response.json()
```

## Constraints

### Additional Examples

#### Example 1: Handling Multiple Currencies
```python
# Function to create a payment accepting multiple currencies
def create_payment_multicurrency(amount: float, currency: str, card_token: str):
    # Extend payment processing to accept different currencies
    headers = {'Authorization': 'Bearer YOUR_ACCESS_TOKEN', 'Content-Type': 'application/json'}
    payment_data = {
        'amount_money': {
            'amount': int(amount * 100),  # Amount in cents
            'currency': currency
        },
        'source_id': card_token,
        'idempotency_key': 'unique_key'
    }
    response = requests.post('https://connect.squareup.com/v2/payments', json=payment_data, headers=headers)
    response.raise_for_status()  # Raise an error for bad responses
    return response.json()
```

#### Example 2: Reporting Summary
```python
# Function to retrieve transaction reports
def get_transaction_summary(start_date: str, end_date: str):
    headers = {'Authorization': 'Bearer YOUR_ACCESS_TOKEN', 'Content-Type': 'application/json'}
    url = f'https://connect.squareup.com/v2/transactions?start_date={start_date}&end_date={end_date}'
    response = requests.get(url, headers=headers)
    response.raise_for_status()  # Raise an error for bad responses
    return response.json()
```

### MUST DO
- Ensure error handling for API requests to gracefully manage failed calls.
### MUST DO
- Always validate payment input before sending requests to the API.
- Use idempotency keys for payment requests to avoid double charges.

### MUST NOT DO
- Do not process payments without user consent.
- Avoid sending excessive requests to the Square API to prevent rate-limiting.