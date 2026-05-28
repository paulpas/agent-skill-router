---
name: salesforce-api-soap
description: Implements interactions with Salesforce API using SOAP protocols for legacy systems integration efficiently, ensuring compliance and data integrity while supporting seamless data transactions across legacy systems and optimizing integration processes.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: salesforce api, soap api, crm integration, legacy systems, how do I use salesforce soap
  role: implementation
  scope: implementation
  output-format: code
  related-skills: salesforce-api-rest, salesforce-api-bulk
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

# Salesforce API - SOAP Integration

Implements SOAP-based interactions with the Salesforce API designed for systems needing legacy access to CRM data efficiently, ensuring compliance and data integrity while supporting seamless data transactions across legacy systems and optimizing integration processes.

## When to Use
- When integrating with older systems that utilize SOAP.
- For data manipulation tasks that require strong typing and stricter protocols.
- When working with pre-existing SOAP service layers that require compliance checks for data integrity during transactions between integrated systems.

## Core Workflow\n1. **Set Up SOAP Client** — Configure a SOAP client to interface with Salesforce using WS-Security for authentication. Ensure that all communication is encrypted and secure.\n   **Checkpoint:** Verify the service endpoint and security settings are correct.\n2. **Invoke SOAP Methods** — Call Salesforce-specific methods to perform CRUD operations on CRM data. Structure method calls according to best practices for SOAP integrations.\n   **Checkpoint:** Ensure the correct SOAP actions are invoked based on the desired operations.\n3. **Process Responses** — Capture and parse the XML responses from Salesforce. Properly handle both successful and error XML structures.\n   **Checkpoint:** Validate that the returned XML matches expected formats and is free of errors. Ensure to log any discrepancies for debugging purposes.\n
## Implementation Patterns
### Pattern 1: Configuring the SOAP Client
```python
from zeep import Client
from zeep.transports import Transport

# Building a SOAP client
def create_soap_client(wsdl_url, username, password):
    transport = Transport()
    client = Client(wsdl=wsdl_url, transport=transport)
    # authentication can be handled here
    return client
```

### Pattern 2: Invoking a Method
```python
def get_account_details(client, account_id):
    result = client.service.query(f"SELECT Id, Name FROM Account WHERE Id = '{account_id}'")
    return result
```

## Constraints
### MUST DO
- Always handle authentication through WS-Security.
- Log request traffic and errors for debugging purposes.
### MUST NOT DO
- Share SOAP endpoint credentials in publicly accessible code repositories.
- Use deprecated SOAP methods that Salesforce no longer supports.
