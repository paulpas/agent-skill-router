---
name: sendgrid-api
description: Integrates Twilio SendGrid API (Mail Send, Dynamic Templates, Marketing Campaigns, Inbound Parse, Event Webhooks) using the sendgrid Python SDK v6.x with proper mail construction and deliverability patterns.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: sendgrid, send email, transactional email, sendgrid api, email templates, dynamic templates, email delivery, marketing campaigns
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: coding-twilio-api, coding-mailgun-api, coding-slack-api
---

# SendGrid Email API Integration

Integrates Twilio SendGrids Mail Send API, Dynamic Templates, Marketing Campaigns, and Inbound Parse using the `sendgrid` Python SDK v6.x. When loaded, this skill makes the model implement email delivery with proper Mail helper construction, dynamic template personalization, attachment handling, async sending, event webhook processing, and deliverability optimization.

## TL;DR for Code Generation

- [ ] Initialize `SendGridAPIClient` from `SENDGRID_API_KEY` environment variable — never hardcode the key
- [ ] Use `Mail` helper from `sendgrid.helpers.mail` to construct messages, not raw dicts
- [ ] Use Dynamic Templates via `template_id` + `personalization.dynamic_template_data` for production emails
- [ ] Validate email addresses with `Email` helper — set a `from` name and email that is verified in SendGrid
- [ ] Set `tracking_settings` explicitly — enable click tracking, open tracking, and Google Analytics per-message
- [ ] Catch `sgrest.exceptions.BadRequestsError` for API errors and inspect the response body
- [ ] Use `mail_settings` to enable sandbox mode for testing (bypasses sending, validates the request)

---

## When to Use

Use this skill when:

- Sending transactional emails (welcome, password reset, receipts, notifications) from Python applications
- Implementing Dynamic Template-based emails with Handlebars template variables and per-recipient personalization
- Building Marketing Campaigns with contact management, list segmentation, and campaign scheduling
- Processing Inbound Parse webhooks to receive emails with attachments programmatically
- Handling SendGrid Event Webhooks (delivered, bounced, opened, clicked, spam reported) for delivery monitoring
- Sending batched emails with substitution per recipient using the Mail Send API v3

---

## When NOT to Use

Avoid this skill for:

- SMS or WhatsApp messaging (use `coding-twilio-api` instead)
- Basic SMTP relay for low-volume internal alerts (use `smtplib` + standard SMTP instead)
- Team chat or collaboration notifications (use `coding-slack-api` instead)
- Hosting your own email infrastructure or open relay configuration

---

## Core Workflow

1. **Initialize the Client** — Create a `SendGridAPIClient(os.environ["SENDGRID_API_KEY"])`. Validate the key on startup by calling `client.client._get("/v3/scopes")`. **Checkpoint:** Verify the API key has `mail.send` scope for sending, or `asm.groups` + `templates` for template management.

2. **Construct the Mail Object** — Use `Mail()` with `from_email`, `to_emails`, `subject`, and either `html_content`/`plain_text_content` or `template_id`. For bulk sends, build a `personalization` object per recipient with `dynamic_template_data`. **Checkpoint:** Test the mail JSON representation with `mail.get()` before calling `send()` to verify structure.

3. **Apply Settings and Categories** — Configure `tracking_settings` (click/open tracking), `mail_settings` (sandbox, bypass list management), and `categories` for analytics grouping. Attach files using `Attachment` helper with Base64-encoded content and proper MIME types. **Checkpoint:** Enable sandbox mode (`mail_settings.sandbox_mode.enable = True`) during development.

4. **Send and Handle Response** — Call `client.send(mail.get())` and inspect the response. A 202 Accepted means the message is queued. Catch `BadRequestsError` and extract the `response.body` for validation error details. **Checkpoint:** Log the `x-message-id` header from successful responses for delivery tracing.

5. **Process Event Webhooks** — Accept POST requests at your webhook endpoint. Verify the signature using `EventWebhook` and `EcdsaPublicKey`. Parse the event array and dispatch based on `event_type`. **Checkpoint:** Store bounced and spam-report events in a suppression list to prevent re-sending.

---

## Implementation Patterns

### Pattern 1: Dynamic Template Email with Personalization

```python
import os
import json
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail, Email, To, Content, TrackingSettings, ClickTracking, OpenTracking, MailSettings, SandBoxMode
from python_http_client.exceptions import BadRequestsError

# ❌ BAD — raw dict construction, no personalization, no tracking, no error handling
client = SendGridAPIClient(os.environ["SENDGRID_API_KEY"])
response = client.client.mail.send.post(
    request_body={
        "personalizations": [{"to": [{"email": "user@example.com"}], "subject": "Hello"}],
        "from": {"email": "noreply@example.com"},
        "content": [{"type": "text/plain", "value": "Hello world"}],
    }
)
print(response.status_code)

# ✅ GOOD — typed Mail helper, dynamic template with personalization, error handling, tracking
import logging

logger = logging.getLogger(__name__)


def send_dynamic_email(
    to_email: str,
    to_name: str | None,
    template_id: str,
    template_data: dict,
    from_email: str = "noreply@example.com",
    from_name: str = "Example App",
) -> str | None:
    """Send a dynamic template email and return the message ID."""
    message = Mail(
        from_email=Email(from_email, from_name),
        to_emails=To(to_email, to_name or ""),
    )
    message.template_id = template_id
    message.dynamic_template_data = template_data

    # Explicit tracking settings
    message.tracking_settings = TrackingSettings(
        click_tracking=ClickTracking(enable=True, enable_text=True),
        open_tracking=OpenTracking(enable=True),
    )

    # Attach category for analytics grouping
    message.categories = ["transactional", "python-sdk"]

    try:
        sg = SendGridAPIClient(os.environ["SENDGRID_API_KEY"])
        response = sg.send(message)

        if response.status_code == 202:
            msg_id = response.headers.get("X-Message-Id")
            logger.info("Email sent", extra={"message_id": msg_id, "to": to_email, "template": template_id})
            return msg_id
        else:
            logger.warning("Unexpected status", extra={"status": response.status_code, "body": response.body})
            return None
    except BadRequestsError as exc:
        body = json.loads(exc.body) if exc.body else {}
        errors = body.get("errors", [])
        logger.error("SendGrid API error", extra={"errors": errors, "status": exc.status_code})
        raise RuntimeError(f"SendGrid rejected request: {errors}") from exc
```

### Pattern 2: Inbound Parse Webhook Processing

```python
import os
import json
import email
from sendgrid.helpers.inbound import parse
from sendgrid.helpers.inbound.attachment import Attachment

# ❌ BAD — assumes raw JSON body, no multipart handling, ignores attachments
@app.post("/inbound")
async def inbound_webhook(request):
    data = await request.json()
    print(f"From: {data['from']}, Subject: {data['subject']}")
    return {"status": "ok"}

# ✅ GOOD — proper multipart parsing, attachment handling, validation
from sendgrid.helpers.inbound import parse as inbound_parse
from sendgrid.helpers.inbound.config import Config


def process_inbound_email(raw_body: bytes) -> dict:
    """Parse a SendGrid Inbound Parse webhook payload."""
    config = Config(
        raw_body=raw_body,
        raw_headers=True,
    )
    parsed = inbound_parse(config)

    result = {
        "from": parsed.from_email or "",
        "to": parsed.to or "",
        "subject": parsed.subject or "",
        "text": parsed.text or "",
        "html": parsed.html or "",
        "spam_score": parsed.spam_score,
        "attachments": [],
    }

    for attachment in parsed.attachments or []:
        result["attachments"].append({
            "filename": attachment.filename or "unnamed",
            "content_type": attachment.content_type or "application/octet-stream",
            "size_bytes": len(attachment.content) if attachment.content else 0,
            "content": attachment.content,  # bytes, store to disk or S3
        })

    return result
```

### Pattern 3: Sandbox Mode for Testing

```python
# ✅ GOOD — sandbox mode enabled for testing; verifies JSON without sending
def send_test_email(to_email: str, template_id: str, template_data: dict) -> dict:
    """Send an email in sandbox mode. Validates the request without delivering."""
    message = Mail(
        from_email=Email("test@example.com", "Test Sender"),
        to_emails=To(to_email),
    )
    message.template_id = template_id
    message.dynamic_template_data = template_data

    # Enable sandbox mode — validates request structure, does NOT deliver
    message.mail_settings = MailSettings()
    message.mail_settings.sandbox_mode = SandBoxMode(enable=True)

    sg = SendGridAPIClient(os.environ["SENDGRID_API_KEY"])
    response = sg.send(message)

    return {
        "status_code": response.status_code,
        "body": response.body,
        "headers": dict(response.headers),
    }
```

---

## Constraints

### MUST DO
- Store `SENDGRID_API_KEY` as an environment variable — never hardcode it or commit it to version control
- Use `Mail` helper objects from `sendgrid.helpers.mail` instead of raw `request_body` dicts (the helper validates at construction time)
- Prefer Dynamic Templates (`template_id` + `dynamic_template_data`) over inline `html_content` for production — templates decouple design from code
- Set `tracking_settings` explicitly (click tracking, open tracking) on every message to maintain deliverability analytics
- Validate sender email addresses — each `from` address must be verified in the SendGrid Sender Authentication settings
- Enable sandbox mode during development to test without consuming email quota

### MUST NOT DO
- Set `sandbox_mode` in production — messages will not be delivered
- Assume 202 means immediate delivery — polling or callbacks are not available; rely on Event Webhooks for delivery state
- Override the `content` field when using `template_id` — dynamic templates provide their own content
- Send to recipients who have previously hard-bounced or marked spam — always check the suppression list first
- Use the deprecated `sendgrid-py` v2 API — always use the v3 Mail Send endpoint via `client.send()`

---

## Output Template

When implementing SendGrid API code, the output must follow this structure:

1. **Client Initialization** — `SendGridAPIClient` instantiated from `SENDGRID_API_KEY` environment variable
2. **Mail Construction** — `Mail()` with `from_email`, `to_emails`, and either `template_id` or `html_content`
3. **Personalization** — `dynamic_template_data` dict with all template variables for each recipient
4. **Settings** — Explicit `tracking_settings` and optional `mail_settings` (sandbox mode for testing)
5. **Sending** — `client.send(message)` wrapped in try/except catching `BadRequestsError`
6. **Response Handling** — 202 = queued; log `X-Message-Id`; parse error body for validation failures

---

## Related Skills

| Skill | Purpose |
|---|---|
| `coding-twilio-api` | SMS, Voice, WhatsApp via Twilio — complement to SendGrid for multichannel comms |
| `coding-mailgun-api` | Alternative email delivery via Mailgun — compare for cost/features |
| `coding-slack-api` | Team notifications via Slack — use for internal alerts alongside email |

---

## Live References

- [SendGrid Python SDK Reference (v6.x)](https://github.com/sendgrid/sendgrid-python)
- [SendGrid Mail Send API v3](https://docs.sendgrid.com/api-reference/mail-send/mail-send)
- [SendGrid Dynamic Templates](https://docs.sendgrid.com/ui/sending-email/how-to-send-an-email-with-dynamic-templates)
- [SendGrid Event Webhook](https://docs.sendgrid.com/for-developers/tracking-events/event-webhook)
- [SendGrid Inbound Parse](https://docs.sendgrid.com/for-developers/parsing-email/inbound-email)
- [SendGrid Sender Authentication](https://docs.sendgrid.com/ui/account-and-settings/how-to-set-up-domain-authentication)
- [SendGrid Suppression Management](https://docs.sendgrid.com/ui/sending-email/blocked-emails)
- [PyPI: sendgrid package](https://pypi.org/project/sendgrid/)
- [GitHub: sendgrid/sendgrid-python](https://github.com/sendgrid/sendgrid-python)
