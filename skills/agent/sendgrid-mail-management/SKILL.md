---
name: sendgrid-mail-management
description: Implements features for sending emails, managing templates, handling marketing campaigns, and parsing inbound emails with the SendGrid API.
license: MIT
compatibility: opencode
metadata:
version: "1.0.0"
  domain: agent
  triggers: sendgrid, send email, email templates, marketing campaigns, inbound email parsing
  role: implementation
  scope: implementation
  output-format: code
  related-skills: coding-sendgrid-api, coding-email-management
  archetypes:
  - tactical
  - operational
  - generational
  anti_triggers:
  - brainstorming
  - vague ideation
  - general discussions
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
---

# SendGrid Mail Management
This skill integrates the SendGrid API to manage email functionalities, including sending transactional emails, handling email templates, managing marketing campaigns, and parsing inbound emails. Upon loading, this skill allows the model to create well-structured emails, utilize dynamic templates, and process email responses via webhooks.

## TL;DR Checklist
- [ ] Initialize `SendGridAPIClient` with `SENDGRID_API_KEY` from environment variables.
- [ ] Construct emails using the `Mail` helper, adjusting for dynamic templates.
- [ ] Configure tracking settings for analytics.
- [ ] Implement inbound email parsing to process responses.
- [ ] Catch API errors to handle failed requests properly.

---

## When to Use
- When needing to send transactional emails through SendGrid.
- To manage and update email templates dynamically.
- For handling bulk marketing email campaigns.
- To parse and respond to inbound emails programmatically.

---

## Core Workflow
1. **Initialize the Client:** Create a `SendGridAPIClient` using `SENDGRID_API_KEY`. Ensure proper authentication by checking available scopes before sending emails.
   - **Checkpoint:** Verify API scope for sending emails.
2. **Construct the Mail Object:** Use the `Mail` helper from `sendgrid.helpers.mail` to build the email. Specify `from_email`, `to_emails`, subject, and content as either HTML or plain text.
   - **Checkpoint:** Validate the mail object's structure before sending.
3. **Handle Marketing Campaigns:** Employ the marketing campaign API to create, send, and track the performance of email campaigns.
   - **Checkpoint:** Utilize categories and tags for group tracking.
4. **Process Inbound Emails:** Configure the inbound parse settings in SendGrid to redirect incoming emails to your application.
   - **Checkpoint:** Ensure webhook URL is correctly set in SendGrid for receiving events.
5. **Send the Email:** Call `sg.send()` with the constructed mail object, and handle responses appropriately.
   - **Checkpoint:** Parse and log the response for delivery verification.

---

## Implementation Patterns
### Pattern 1: Sending a Transactional Email
```python
import os
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail

def send_transactional_email(to_email, subject, html_content):
    sg = SendGridAPIClient(os.environ['SENDGRID_API_KEY'])
    message = Mail(
        from_email='noreply@example.com',
        to_emails=to_email,
        subject=subject,
        html_content=html_content,
    )
    try:
        response = sg.send(message)
        if response.status_code == 202:
            print(f"Email sent to {to_email} with status code {response.status_code}")
        else:
            print(f"Failed to send email. Status code: {response.status_code}")
    except Exception as e:
        print(f"An error occurred: {str(e)}")
```

### Pattern 2: Dynamic Templates
```python
def send_dynamic_template_email(to_email, template_id, dynamic_data):
    sg = SendGridAPIClient(os.environ['SENDGRID_API_KEY'])
    message = Mail(
        from_email='noreply@example.com',
        to_emails=to_email,
    )
    message.template_id = template_id
    message.dynamic_template_data = dynamic_data
    try:
        response = sg.send(message)
        print(f"Dynamic email sent, response code: {response.status_code}")
    except Exception as e:
        print(f"Failed to send dynamic email: {str(e)}")
```

### Pattern 3: Inbound Email Processing
```python
from flask import Flask, request
app = Flask(__name__)

@app.route('/inbound', methods=['POST'])
def inbound_webhook():
    email_data = request.json
    # Process email data here
    print(f"Received email from: {email_data['from']}")
    return "OK", 200
```

---

## Constraints
### MUST DO
- Store `SENDGRID_API_KEY` securely as an environment variable.
- Use the `Mail` helper instead of constructing HTTP request bodies manually.
- Validate all email addresses for deliverability before sending.
- Ensure proper logging of delivery status and errors for every email sent.

### MUST NOT DO
- Attempt to send emails without verifying the sender account.
- Send bulk emails without implementing proper event tracking and unsubscribe links.

---

## Related Skills
| Skill                      | Purpose                                |
|---------------------------|----------------------------------------|
| coding-sendgrid-api       | For general SendGrid API interactions  |
| coding-email-management    | For managing and sending emails through another platform |

## Live References

> Authorative documentation links for this domain. The model follows markdown links at load time to resolve external references and inline content.

- [SendGrid Mail Send API](https://docs.sendgrid.com/api-reference/mail-send/mail-send) — Official SendGrid API reference for the `/v3/mail/send` endpoint
- [SendGrid Dynamic Templates](https://docs.sendgrid.com/ui/sending-email/templates#dynamic-html-templates-vs-classic-templates) — Documentation on using dynamic templates with personalization variables
- [SendGrid Web API Python SDK](https://github.com/sendgrid/sendgrid-python) — Official SendGrid Python library source code and usage examples
- [Email API Standards Comparison (Postmark, Mailgun, AWS SES)](https://www.twilio.com/docs/email-sending-api/comparison) — Comparative reference for email sending platforms and their API approaches
- [RFC 5322: Internet Message Format](https://datatracker.ietf.org/doc/html/rfc5322) — IETF standard defining the format of email messages
