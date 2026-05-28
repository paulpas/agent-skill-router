---
name: salesforce-api-rest
description: Implements interactions with the Salesforce API using REST protocols to manage customer relationship data effectively.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: salesforce api, rest api, customer relationship management, crm, salesforce data access, how do I access salesforce data
  role: implementation
  scope: implementation
  output-format: code
  related-skills: salesforce-api-soap, salesforce-api-bulk
  archetypes:
  - tactical
  - operational
  anti_triggers:
  - generic skill dominance
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: tactical
---

# Salesforce API - REST Integration

Implements RESTful interactions with the Salesforce API to manage and automate customer relationship data effectively.

## When to Use
- To retrieve and manipulate Salesforce records programmatically.
- When implementing integrations with third-party applications.
- For automated reporting and data synchronization with CRM systems.
- When interacting with Salesforce data in bulk for performance optimization.

## Core Workflow
1. **Authenticate with Salesforce** — Use OAuth 2.0 to obtain access and refresh tokens for API access.
   **Checkpoint:** Ensure tokens are securely stored and refreshed.
2. **Make API Calls** — Structure HTTP requests to Salesforce endpoints for data retrieval or record updates.
   **Checkpoint:** Confirm correct HTTP methods (GET, POST, PATCH, DELETE) are used based on action.
3. **Handle Responses** — Parse JSON responses from Salesforce and handle errors appropriately.
   **Checkpoint:** Validate response structure against expectations and log error messages for failed requests.

## Implementation Patterns
### Pattern 1: Authenticating with Salesforce
```python
import requests

def authenticate(client_id, client_secret, username, password):
    url = "https://login.salesforce.com/services/oauth2/token"
    payload = {"grant_type": "password",
               "client_id": client_id,
               "client_secret": client_secret,
               "username": username,
               "password": password}
    response = requests.post(url, data=payload)
    response.raise_for_status()  # Raise error for bad requests
    return response.json()  # Return access token and instance URL
```

### Pattern 2: Retrieving Salesforce Records
```python

def get_records(object_name, access_token, instance_url):
    url = f"{instance_url}/services/data/vXX.0/sobjects/{object_name}/"
    headers = {"Authorization": f"Bearer {access_token}"}
    response = requests.get(url, headers=headers)
    response.raise_for_status()
    return response.json()
```

## Constraints
### MUST DO
- Always use OAuth 2.0 authentication for API access.
- Log all API requests and responses for auditing purposes.
### MUST NOT DO
- Store sensitive credentials directly in the codebase.
- Exceed Salesforce API limits, which could lead to temporary lockouts.
