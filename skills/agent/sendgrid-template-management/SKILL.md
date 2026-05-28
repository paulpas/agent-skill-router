---
name: sendgrid-template-management
description: Implements features for creating, updating, and deleting email templates using the SendGrid API.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: agent
  triggers: sendgrid template management, create sendgrid template, update sendgrid template, delete sendgrid template, manage sendgrid templates
  role: implementation
  scope: implementation
  output-format: code
  related-skills: sendgrid-integration, email-automation
  archetypes:
  - tactical
  - operational
  anti_triggers:
  - low-quality
  - vague task
  response_profile:
    verbosity: medium
    directive_strength: high
    abstraction_level: operational

---

# SendGrid Template Management
This skill implements functionality for managing email templates using the SendGrid API, allowing users to create, modify, and delete templates efficiently.

## TL;DR Checklist
- [ ] Ensure all template IDs are valid before operations.
- [ ] Provide clear success messages on all template operations.
- [ ] Handle errors with descriptive messages for invalid operations.
- [ ] Validate input parameters to prevent runtime errors.
- [ ] Implement rate limiting and error handling for API calls.

## When to Use
Use this skill when:
- You need to automate the creation of email marketing templates.
- You want to update existing templates dynamically based on user feedback.
- You need to delete old or unused templates to keep your template list organized.

## Core Workflow
1. **Create Template**: Validate input data for new templates and call SendGrid API to create them.
   - **Checkpoint**: Ensure template ID is generated and returned successfully.

2. **Update Template**: Validate existing template ID and new content, then update the template via the API.
   - **Checkpoint**: Ensure update response confirms success.

3. **Delete Template**: Validate the existing template ID and make a delete request to SendGrid.
   - **Checkpoint**: Ensure successful deletion confirmation message.

## Implementation Patterns
### Pattern 1: Creating a Template
```python
import os
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail

def create_template(template_name: str, html_content: str) -> dict:
    """Create a new email template using SendGrid API."""
    sg = SendGridAPIClient(os.environ.get("SENDGRID_API_KEY"))
    template_data = {
        "name": template_name,
        "html_content": html_content
    }
    response = sg.client.templates.post(request_body=template_data)
    if response.status_code == 201:
        return response.to_dict()
    else:
        raise Exception(f"Failed to create template: {response.body}")
```

### Pattern 2: Updating a Template
```python
def update_template(template_id: str, new_content: str) -> bool:
    """Update an existing template with new content."""
    sg = SendGridAPIClient(os.environ.get("SENDGRID_API_KEY"))
    update_data = {
        "html_content": new_content
    }
    response = sg.client.templates.template_id(template_id).patch(request_body=update_data)
    return response.status_code == 200
```

### Pattern 3: Deleting a Template
```python
def delete_template(template_id: str) -> bool:
    """Delete an email template based on its ID."""
    sg = SendGridAPIClient(os.environ.get("SENDGRID_API_KEY"))
    response = sg.client.templates.template_id(template_id).delete()
    return response.status_code == 204
```

## Constraints
### MUST DO
- Validate template IDs before conducting create/update/delete operations (Early Exit).
- Return success messages or confirmations after each operation.
- Implement error handling to provide descriptive messages for failures (Fail Fast).

### MUST NOT DO
- Mutate input parameters directly; always create new data structures based on inputs.
- Allow empty or invalid template data to reach the SendGrid API.

## Related Skills
| Skill | Purpose |
|---|---|
| sendgrid-integration | General integration strategies with the SendGrid API for various functionalities. |
| email-automation | Automating email workflows within applications using SendGrid. |
