---
name: mailgun-api
description: Integrates Mailgun API (Messages, Routes, Email Validation, Suppression List, Analytics) using the official mailgun-python SDK v1.7+ with proper REST patterns, MIME handling, and deliverability optimization.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: mailgun, mailgun api, send email, email validation, email routing, transactional email, inbound email, mailgun python
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: coding-sendgrid-api, coding-twilio-api, coding-slack-api
---

# Mailgun Email API Integration

Integrates the Mailgun API (Messages, Routes, Email Validation, Suppression List, Events/Analytics) using the official `mailgun` Python SDK v1.7+ and direct requests for legacy endpoints. When loaded, this skill makes the model implement email operations with proper REST API patterns, MIME construction, attachment handling, webhook signature validation, batch sending, and deliverability optimization.

## TL;DR for Code Generation

- [ ] Initialize `Client` with `auth=("api", os.environ["MAILGUN_API_KEY"])` — never hardcode the key
- [ ] Use `client.messages.create()` for sending — always include at least `text`, `html`, or `template` parameter
- [ ] Set `o:tag` for analytics categorization and `o:tracking` for open/click tracking
- [ ] Validate email addresses with the Email Validation API before sending to new recipients
- [ ] Handle suppression (bounces, complaints, unsubscribes) before every batch send
- [ ] Catch `requests.exceptions.RequestException` for network errors; inspect JSON response for API errors
- [ ] Use Mailgun webhook signatures (HMAC SHA-256) to validate incoming event callbacks

---

## When to Use

Use this skill when:

- Sending transactional or bulk email from Python applications via the Mailgun REST API
- Implementing email routing (inbound forwarding to HTTP endpoints) with Mailgun Routes
- Validating email addresses in real time using the Mailgun Email Validation API v4
- Managing suppression lists (bounces, complaints, unsubscribes) to maintain sender reputation
- Tracking email events (delivered, opened, clicked, failed) via the Events API or webhooks
- Sending emails with attachments, inline images, or custom MIME headers

---

## When NOT to Use

Avoid this skill for:

- SMS or voice communications (use `coding-twilio-api` instead)
- Team chat or collaboration messaging (use `coding-slack-api` or `coding-discord-api`)
- Transactional email at very high volume (>1M/month) — consider dedicated ESP APIs
- Sending from unauthenticated domains — Mailgun requires domain verification and DKIM/SPF setup

---

## Core Workflow

1. **Initialize the Client** — Create a `Client(auth=("api", os.environ["MAILGUN_API_KEY"]))` using the official SDK. Validate the connection by calling `client.messages.create()` with a test message. **Checkpoint:** Verify your sending domain is configured in the Mailgun Control Panel and has valid DNS records (SPF, DKIM, MX, CNAME).

2. **Define the Domain** — Store the sending domain in an environment variable (`MAILGUN_DOMAIN`). Each Mailgun account can have multiple sending domains. **Checkpoint:** Confirm the domain is not in "pending" verification status — sending will fail from unverified domains.

3. **Construct the Message** — Pass `from`, `to`, `subject`, and one of `text`, `html`, or `template`. Attach files as `(filepath, filename)` tuples in the `files` parameter. Set analytics with `o:tag` and tracking with `o:tracking`. **Checkpoint:** Test with `o:testmode=yes` to validate the request without sending.

4. **Send and Handle Response** — Call `req = client.messages.create(data=data, domain=domain)`. Inspect `req.json()` for `id` and `message`. A successful response returns HTTP 200 with a message like "Queued. Thank you." **Checkpoint:** Log the message ID (extracted from the `id` field) for every sent message.

5. **Process Webhooks and Events** — Validate webhook signatures using HMAC SHA-256 with your Mailgun API key. Parse event payloads and dispatch based on `event` type (`delivered`, `opened`, `clicked`, `bounced`, `complained`). **Checkpoint:** Store bounced and complained recipients in the Suppression List immediately.

---

## Implementation Patterns

### Pattern 1: Sending Email with Attachments and Tracking

```python
import os
import json
import requests
from mailgun.client import Client

# ❌ BAD — raw requests call, no SDK, no error handling, no tracking
resp = requests.post(
    "https://api.mailgun.net/v3/mg.example.com/messages",
    auth=("api", "YOUR_API_KEY"),
    data={
        "from": "sender@example.com",
        "to": "recipient@example.com",
        "subject": "Hello",
        "text": "Testing",
    },
)
print(resp.json())

# ✅ GOOD — SDK client, typed params, tracking, error handling, testmode support
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

api_key: str | None = os.environ.get("MAILGUN_API_KEY")
domain: str | None = os.environ.get("MAILGUN_DOMAIN")

if not api_key or not domain:
    raise RuntimeError("MAILGUN_API_KEY and MAILGUN_DOMAIN must be set")

client = Client(auth=("api", api_key))


def send_email(
    to: str | list[str],
    subject: str,
    text: str | None = None,
    html: str | None = None,
    from_email: str | None = None,
    tags: list[str] | None = None,
    attachment_paths: list[str | Path] | None = None,
    testmode: bool = False,
) -> dict:
    """Send an email via Mailgun with optional attachments and tracking."""
    if not text and not html:
        raise ValueError("Either `text` or `html` content must be provided")

    data: dict = {
        "from": from_email or f"noreply@{domain}",
        "to": to if isinstance(to, str) else ", ".join(to),
        "subject": subject,
    }
    if text:
        data["text"] = text
    if html:
        data["html"] = html

    # Analytics and tracking
    if tags:
        data["o:tag"] = tags
    data["o:tracking"] = "yes"
    data["o:tracking-clicks"] = "yes"
    data["o:tracking-opens"] = "yes"

    # Test mode — validates without sending
    if testmode:
        data["o:testmode"] = "yes"

    # Attachments
    files: list = []
    if attachment_paths:
        for path in attachment_paths:
            filepath = Path(path)
            if not filepath.exists():
                logger.warning("Attachment not found", extra={"path": str(filepath)})
                continue
            files.append(("attachment", open(filepath, "rb")))

    try:
        req = client.messages.create(data=data, domain=domain)
        response = req.json()
        message_id = response.get("id", "")

        if req.status_code == 200:
            logger.info("Email queued", extra={"message_id": message_id, "to": to, "subject": subject})
        else:
            logger.error("Mailgun API error", extra={"response": response})

        return response
    except requests.exceptions.RequestException as exc:
        logger.error("Mailgun network error", extra={"error": str(exc)})
        raise RuntimeError(f"Mailgun request failed: {exc}") from exc
    finally:
        for f in files:
            f[1].close()
```

### Pattern 2: Email Address Validation

```python
import os
import requests

# ❌ BAD — no validation, sends to potentially invalid addresses
client.messages.create(
    data={"from": ..., "to": "user@probably-typo.cmo", "subject": "Hi", "text": "Body"},
    domain=domain,
)

# ✅ GOOD — pre-validates addresses before sending
from mailgun.client import Client


def validate_email_address(address: str) -> dict:
    """Validate a single email address using Mailgun Email Validation API v4."""
    api_key = os.environ["MAILGUN_API_KEY"]
    resp = requests.get(
        "https://api.mailgun.net/v4/address/validate",
        auth=("api", api_key),
        params={"address": address},
    )
    resp.raise_for_status()
    result = resp.json()

    return {
        "address": result.get("address", ""),
        "is_valid": result.get("result") == "deliverable",
        "reason": result.get("reason", ""),
        "risk": result.get("risk", "unknown"),
        "did_you_mean": result.get("did_you_mean", ""),
    }


def send_to_validated_recipients(
    recipients: list[str],
    subject: str,
    html: str,
    from_email: str | None = None,
) -> list[dict]:
    """Send email only to validated recipients. Returns per-recipient results."""
    results = []
    client = Client(auth=("api", os.environ["MAILGUN_API_KEY"]))

    for recipient in recipients:
        validation = validate_email_address(recipient)
        if validation["is_valid"]:
            try:
                req = client.messages.create(
                    data={
                        "from": from_email or f"noreply@{os.environ['MAILGUN_DOMAIN']}",
                        "to": recipient,
                        "subject": subject,
                        "html": html,
                    },
                    domain=os.environ["MAILGUN_DOMAIN"],
                )
                results.append({"recipient": recipient, "status": "sent", "response": req.json()})
            except Exception as exc:
                results.append({"recipient": recipient, "status": "error", "error": str(exc)})
        else:
            results.append({
                "recipient": recipient,
                "status": "skipped",
                "reason": validation["reason"],
                "suggestion": validation["did_you_mean"],
            })

    return results
```

### Pattern 3: Mailgun Route (Inbound Email to HTTP)

```python
import os
import json
import hashlib
import hmac
from mailgun.client import Client

# ❌ BAD — no webhook signature validation, trusts unauthenticated requests
@app.post("/inbound")
async def inbound_email(request):
    data = await request.form()
    print(f"From: {data['from']}, Subject: {data['subject']}")
    return {"status": "ok"}

# ✅ GOOD — HMAC signature verification, typed event dispatch
def verify_mailgun_webhook(token: str, timestamp: str, signature: str, api_key: str) -> bool:
    """Verify a Mailgun webhook signature using HMAC SHA-256."""
    hex_digest = hmac.new(
        key=api_key.encode("utf-8"),
        msg=f"{timestamp}{token}".encode("utf-8"),
        digestmod=hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(hex_digest, signature)


def create_inbound_route(
    expression: str,
    forward_url: str,
    description: str = "",
    priority: int = 0,
) -> dict:
    """Create a Mailgun Route that forwards inbound emails to an HTTP endpoint."""
    client = Client(auth=("api", os.environ["MAILGUN_API_KEY"]))
    data = {
        "priority": priority,
        "description": description,
        "expression": expression,  # e.g. "match_recipient('.*@example.com')"
        "action": [f"forward('{forward_url}')", "stop()"],
    }
    req = client.routes.create(data=data)
    return req.json()
```

---

## Constraints

### MUST DO
- Store `MAILGUN_API_KEY` and `MAILGUN_DOMAIN` in environment variables — never hardcode them
- Configure SPF, DKIM, MX, and CNAME DNS records for every sending domain before going live
- Use `o:testmode=yes` during development — Mailgun validates the request but does not deliver
- Set `o:tag` for analytics grouping — tags help track campaign and transactional performance separately
- Validate email addresses with the Email Validation API v4 before sending to unknown recipients
- Check suppression lists (bounces, complaints, unsubscribes) before every batch send — filter out suppressed addresses
- Verify Mailgun webhooks using HMAC SHA-256 signature validation on every incoming callback

### MUST NOT DO
- Send to recipients on the suppression list — this damages sender reputation and can get your domain blacklisted
- Use JWT or Basic Auth for the API — always use the `api` key with Basic auth (username = `api`, password = your key)
- Send from unverified domains — Mailgun requires domain verification with SPF and DKIM
- Ignore webhook event payloads for bounces and complaints — process them immediately to update suppression lists
- Use the same API key for dev and production — create separate Mailgun domains or accounts per environment

---

## Output Template

When implementing Mailgun API code, the output must follow this structure:

1. **Client Initialization** — `Client(auth=("api", os.environ["MAILGUN_API_KEY"]))` with domain from env
2. **Message Construction** — Dict with `from`, `to`, `subject`, and at least one of `text`/`html`/`template`; plus `o:tag`, `o:tracking` for analytics
3. **Attachments** — Files sent as `(name, file-object)` tuples; closed in a `finally` block
4. **Error Handling** — Catches `requests.exceptions.RequestException` and inspects response JSON for API errors
5. **Validation (pre-send)** — Email Validation API check for new recipients; suppression list filtering
6. **Webhook Security** — HMAC SHA-256 signature verified on every incoming event webhook

---

## Related Skills

| Skill | Purpose |
|---|---|
| `coding-sendgrid-api` | Alternative email delivery via SendGrid — compare deliverability and features |
| `coding-twilio-api` | SMS, Voice, WhatsApp via Twilio — multichannel complement to Mailgun |
| `coding-slack-api` | Team messaging and internal alerts — use alongside email for notification routing |

---

## Live References

- [Mailgun Python SDK Documentation](https://documentation.mailgun.com/docs/mailgun/sdk/python_sdk/)
- [Mailgun API Reference (OpenAPI)](https://documentation.mailgun.com/docs/mailgun/api-reference/)
- [Mailgun Messages API](https://documentation.mailgun.com/docs/mailgun/api-reference/send/mailgun/)
- [Mailgun Email Validation API v4](https://documentation.mailgun.com/docs/mailgun/api-reference/validations/)
- [Mailgun Routes API](https://documentation.mailgun.com/docs/mailgun/api-reference/routes/)
- [Mailgun Suppression Management](https://documentation.mailgun.com/docs/mailgun/user-manual/suppressions/)
- [Mailgun Webhook Security](https://documentation.mailgun.com/docs/mailgun/user-manual/webhooks/)
- [PyPI: mailgun package](https://pypi.org/project/mailgun/)
- [GitHub: mailgun/mailgun-python](https://github.com/mailgun/mailgun-python)
