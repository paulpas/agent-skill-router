---
name: zendesk-api
description: Implements modern features of the Zendesk API, enabling automation, ticket management, and integration with various tools.
license: MIT
compatibility: opencode
metadata:
  archetypes:
  - tactical
  - strategic
  anti_triggers:
  - brainstorming
  - vague ideation
  - single-agent monolith
  response_profile:
    verbosity: medium
    directive_strength: high
    abstraction_level: tactical

  version: 1.0.0
  domain: coding
  triggers: zendesk, zendesk api, ticket management, automate zendesk, integrate zendesk, how do i zendesk api
  role: implementation
  scope: implementation
  output-format: code
  related-skills: coding-api-integration, coding-nodejs-examples
---

# Zendesk API Automation
This skill implements automation and integration patterns for the Zendesk API, enabling efficient ticket management, customer support automation, and integration with third-party services. It follows the principles of clean code and best practices to encourage maintainability and scalability.

## TL;DR Checklist
- [ ] Validate all API requests with appropriate error handling.
- [ ] Use environment variables for API keys and sensitive data.
- [ ] Include rate limit checks to prevent throttling.
- [ ] Utilize pagination for retrieving large datasets.
- [ ] Ensure proper logging of API requests and responses.

## When to Use
- When automating customer support workflows using the Zendesk API.
- For integrating Zendesk with external systems like CRM or project management tools.
- For building reports and analytics dashboards based on ticket data.
- When creating custom apps that interact with Zendesk's functionalities.

## Core Workflow
1. **Initialize API Client**  — Set up the Zendesk API client with authentication details. **Checkpoint:** Confirm valid API key and endpoint URL.
```python
import os
from zendesk_api import Zendesk

def initialize_client():
    return Zendesk(subdomain=os.getenv('ZENDESK_SUBDOMAIN'),
                   email=os.getenv('ZENDESK_EMAIL'),
                   password=os.getenv('ZENDESK_API_TOKEN'))
```

2. **Retrieve Tickets** — Fetch tickets based on filtering criteria (e.g., status, priority). **Checkpoint:** Ensure pagination is handled correctly.
```python
def fetch_tickets(client: Zendesk, status="open", priority=None):
    tickets = []
    page = 1
    while True:
        response = client.tickets.list(page=page, status=status, priority=priority)
        tickets.extend(response['tickets'])
        if page >= response['meta']['total_pages']:
            break
        page += 1
    return tickets
```

3. **Create Ticket** — Submit a new ticket to Zendesk. **Checkpoint:** Validate ticket fields appropriately before submission.
```python
def create_ticket(client: Zendesk, subject: str, description: str, requester_id: int):
    ticket = {
        'ticket': {
            'subject': subject,
            'description': description,
            'requester_id': requester_id
        }
    }
    response = client.tickets.create(ticket)
    return response
```

4. **Update Ticket** — Modify ticket details as needed. **Checkpoint:** Check Zendesk response for success.
```python
def update_ticket(client: Zendesk, ticket_id: int, updates: dict):
    response = client.tickets.update(ticket_id, updates)
    if response['ticket']['status'] != 'updated':
        raise Exception(f'Failed to update ticket {ticket_id}')  # ensure proper error handling
    return response
```

5. **Handle Errors** — Implement robust error handling for API requests. **Checkpoint:** Log all errors for further investigation.
```python
def execute_api_call(api_method, *args, **kwargs):
    try:
        return api_method(*args, **kwargs)
    except Exception as e:
        logger.error(f'API call failed: {str(e)}')
        raise
```

6. **Log Activities** — Each API request should be logged for auditing and debugging. **Checkpoint:** Confirm logging format consistency.
```python
import logging

logger = logging.getLogger(__name__)

def log_request(request_data):
    logger.info(f'Making API Request: {request_data}')
```

## Implementation Patterns
### Pattern 1: Ticket Creation Example
```python
def automate_ticket_creation():
    client = initialize_client()
    ticket_subject = "Support Needed for Issue X"
    ticket_description = "Details about the issue X are..."
    requester_id = 1  # Assuming a valid requester ID
    ticket_response = create_ticket(client, ticket_subject, ticket_description, requester_id)
    print(f'Created ticket: {ticket_response}')
```
### Pattern 2: Ticket Retrieval with Filters
```python
def get_open_tickets():
    client = initialize_client()
    open_tickets = fetch_tickets(client, status="open")
    print(f'Open tickets: {open_tickets}')
```

## Constraints
### MUST DO
- Always validate API requests before sending them.
- Handle errors and exceptions gracefully with descriptive logging.
- Use environment variables for sensitive information such as API keys.
- Maintain consistency in the logging format and content.
- Ensure robust testing of all integration points.

### MUST NOT DO
- Never hard-code sensitive data like API keys in the source code.
- Avoid assuming that responses from Zendesk will always be successful.
- Do not skip API rate limit handling; always check the limits before making requests.
- Avoid blocking calls that could hinder the performance of applications.
