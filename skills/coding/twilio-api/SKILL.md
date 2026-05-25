---
name: twilio-api
description: Integrates Twilio API (SMS, Voice, WhatsApp, Verify, Conversations, Video)
  using the twilio-python SDK v9.x with proper client initialization, TwiML generation,
  and webhook validation.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: twilio, sms api, send sms, whatsapp api, twilio verify, phone verification,
    twilio voice, twilio webhooks
  archetypes:
  - tactical
  - generation
  anti_triggers:
  - brainstorming
  - vague ideation
  - code golf
  - over-engineering
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  role: implementation
  scope: implementation
  output-format: code
  content-types:
  - code
  - guidance
  - do-dont
  - examples
  related-skills: coding-sendgrid-api, coding-slack-api, coding-mailgun-api
------
# Twilio API Integration (SMS, Voice, WhatsApp, Verify)

Integrates the Twilio Communications API — SMS, Voice, WhatsApp, Verify (2FA), Conversations, and Video — using the `twilio` Python SDK v9.x. When loaded, this skill makes the model implement Twilio operations with proper client initialization, TwiML generation, webhook signature validation, error handling, and async patterns.

## TL;DR for Code Generation

- [ ] Initialize `Client()` from environment with `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN` — never hardcode credentials
- [ ] Use `twilio.rest.Client` for REST API calls and `twilio.twiml` for TwiML response generation
- [ ] Validate incoming webhooks with `RequestValidator` to prevent request forgery
- [ ] Wrap API calls in try/except catching `TwilioRestException` with status codes
- [ ] Use message `status_callback` for delivery confirmation instead of polling
- [ ] Implement exponential backoff for transient 429 rate-limit responses
- [ ] For WhatsApp, use `messaging_service_sid` with a pre-configured Messaging Service for content templates

---

## When to Use

Use this skill when:

- Sending SMS, WhatsApp messages, or programmatic Voice calls from Python applications
- Implementing phone number verification (2FA) via Twilio Verify API
- Building IVR (Interactive Voice Response) systems with TwiML
- Managing Conversations (group chat, multi-channel) via Twilio Conversations API
- Handling incoming SMS/Voice webhooks and validating Twilio signatures
- Integrating Programmable Video for real-time video conferencing
- Sending messages with messaging services for A2P 10DLC compliance

---

## When NOT to Use

Avoid this skill for:

- Email delivery (use `coding-sendgrid-api` or `coding-mailgun-api` instead)
- In-app chat or team messaging (use `coding-slack-api` or `coding-discord-api` instead)
- Simple push notifications (use Firebase Cloud Messaging or platform-specific push APIs)
- Bulk marketing SMS (use Twilio SendGrid Marketing Campaigns for email, or consult Twilio's A2P 10DLC guidelines for SMS)

---

## Core Workflow

1. **Initialize the Client** — Create a `Client(account_sid, auth_token)` using environment variables. Never hardcode credentials. **Checkpoint:** Call `client.api.accounts(sid).fetch()` to validate credentials on startup.

2. **Construct the Message or Call** — Choose the appropriate API: `client.messages.create()` for SMS/WhatsApp, `client.calls.create()` for voice, `client.verify.services()` for 2FA. Set all required parameters (to, from, body for SMS; to, from, url for calls). **Checkpoint:** Validate phone numbers with `PhoneNumbers` API before sending production traffic.

3. **Handle the Response and Errors** — Inspect the returned instance for `sid`, `status`, `error_code`, and `error_message`. Catch `TwilioRestException` and inspect the `status` and `code` properties. **Checkpoint:** Log `message.sid` for every sent message as an audit trail.

4. **Generate TwiML for Voice/IVR** — Use `twilio.twiml.VoiceResponse` or `twilio.twiml.MessagingResponse` to build XML responses for webhooks. Chain verbs like `<Say>`, `<Gather>`, `<Dial>`, `<Record>`. **Checkpoint:** Test TwiML output with the TwiML Bin simulator or `twilio CLI` before deploying.

5. **Validate Incoming Webhooks** — Use `RequestValidator` to check `X-Twilio-Signature` on every incoming webhook. Fail closed if validation fails. **Checkpoint:** Log a security alert on every validation failure — do not silently drop invalid requests.

---

## Implementation Patterns

### Pattern 1: Sending SMS with Status Callback

```python
import os
from twilio.rest import Client
from twilio.base.exceptions import TwilioRestException

# ❌ BAD — hardcoded credentials, no error handling, no status callback
client = Client("ACxxx", "tokxxx")
message = client.messages.create(
    to="+15551234567",
    from_="+15559876543",
    body="Your code is 123456"
)
print(f"Sent: {message.sid}")

# ✅ GOOD — env-based auth, error handling, status callback, structured logging
import logging

logger = logging.getLogger(__name__)

account_sid: str | None = os.environ.get("TWILIO_ACCOUNT_SID")
auth_token: str | None = os.environ.get("TWILIO_AUTH_TOKEN")

if not account_sid or not auth_token:
    raise RuntimeError("TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN must be set")

client = Client(account_sid, auth_token)


def send_sms(
    to: str,
    body: str,
    from_: str | None = None,
    status_callback_url: str | None = None,
) -> str:
    """Send an SMS and return the message SID."""
    kwargs: dict = {
        "to": to,
        "body": body,
    }
    if from_:
        kwargs["from_"] = from_
    if status_callback_url:
        kwargs["status_callback"] = status_callback_url

    try:
        message = client.messages.create(**kwargs)
        logger.info("SMS sent", extra={"sid": message.sid, "to": to, "status": message.status})
        return message.sid
    except TwilioRestException as exc:
        logger.error(
            "Twilio error sending SMS",
            extra={"status": exc.status, "code": exc.code, "msg": str(exc)},
        )
        raise
```

### Pattern 2: Twilio Verify (2FA) Integration

```python
import os
from twilio.rest import Client
from twilio.base.exceptions import TwilioRestException

# ❌ BAD — no service check, no channel fallback, swallows exceptions
client = Client(os.environ["TWILIO_ACCOUNT_SID"], os.environ["TWILIO_AUTH_TOKEN"])
verification = client.verify.services("VAxxx").verifications.create(
    to="+15551234567", channel="sms"
)
print(verification.status)

# ✅ GOOD — verifies service exists, supports channel fallback, typed responses
from typing import Literal

Channel = Literal["sms", "call", "email", "whatsapp"]


def send_verification_code(
    service_sid: str,
    to: str,
    channel: Channel = "sms",
) -> dict:
    """Send a verification code via the specified channel."""
    service = client.verify.services(service_sid)
    try:
        # Verify the service exists before attempting to send
        service.fetch()
    except TwilioRestException as exc:
        if exc.status == 404:
            raise ValueError(f"Verify service {service_sid} not found") from exc
        raise

    try:
        verification = service.verifications.create(to=to, channel=channel)
        return {"status": verification.status, "sid": verification.sid, "channel": channel}
    except TwilioRestException as exc:
        if exc.status == 429:
            raise RuntimeError("Rate limited — wait before requesting another code") from exc
        raise


def check_verification_code(
    service_sid: str,
    to: str,
    code: str,
) -> bool:
    """Check a verification code. Returns True if approved."""
    try:
        check = client.verify.services(service_sid).verification_checks.create(
            to=to, code=code
        )
        return check.status == "approved"
    except TwilioRestException:
        return False
```

### Pattern 3: TwiML Voice Response with Input Gathering

```python
from twilio.twiml.voice_response import VoiceResponse, Gather
from twilio.request_validator import RequestValidator
import os

# ❌ BAD — no input validation on webhook, no security check
response = VoiceResponse()
response.say("Press 1 for sales, 2 for support")
response.redirect("/menu")

# ✅ GOOD — secure webhook validation, input gathering with timeout and retry
def build_menu_twiml() -> str:
    """Build an IVR menu with DTMF gathering."""
    response = VoiceResponse()

    gather = Gather(
        num_digits=1,
        action="/handle-menu",
        method="POST",
        timeout=5,
        speech_timeout="auto",
    )
    gather.say("Welcome. Press 1 for sales, 2 for support, or 3 to repeat this menu.")
    response.append(gather)

    # If the user doesn't press anything, repeat
    response.say("We didn't receive any input. Goodbye.")
    response.hangup()
    return str(response)


def validate_webhook(request) -> bool:
    """Validate an incoming Twilio webhook using the request validator."""
    validator = RequestValidator(os.environ["TWILIO_AUTH_TOKEN"])

    url = request.url
    params = request.form.to_dict()
    signature = request.headers.get("X-Twilio-Signature", "")

    return validator.validate(url, params, signature)
```

---

## Constraints

### MUST DO
- Store `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN` in environment variables or a secret manager — never in source code
- Validate every incoming webhook with `RequestValidator` — Twilios webhook signature is your only CSRF defense
- Use `status_callback` URL on messages to receive delivery receipts asynchronously
- Set up a Messaging Service for A2P 10DLC compliance when sending to US phone numbers
- Log the `message.sid` or `call.sid` for every outbound communication for auditability
- Handle `TwilioRestException` with status-specific logic (401 = bad auth, 404 = invalid number, 429 = rate limit, 5xx = server error)

### MUST NOT DO
- Disable webhook signature validation in production — this enables SMS spoofing
- Rely on synchronous `message.status` after `create()` — always use `status_callback` for delivery confirmation
- Hardcode phone numbers or sender IDs — load them from configuration
- Use the same API key for development and production accounts — use separate subaccounts
- Ignore `error_code` on a message response — non-null `error_code` means delivery failure

---

## Output Template

When implementing Twilio API code, the output must follow this structure:

1. **Client Initialization** — `Client` instantiated from environment, validated with a `fetch()` call
2. **API Parameters** — All parameters typed and documented; phone numbers in E.164 format (`+1XXXXXXXXXX`)
3. **Error Handling** — Catches `TwilioRestException` with status/code inspection; logs every error with context
4. **TwiML Response** — Uses `twilio.twiml` builders (not raw XML strings); validates output structure
5. **Webhook Security** — `RequestValidator` check on every incoming webhook before any business logic

---

## Related Skills

| Skill | Purpose |
|---|---|
| `coding-sendgrid-api` | Email delivery via SendGrid — use for transactional email alongside Twilio SMS |
| `coding-mailgun-api` | Email delivery via Mailgun — alternative to SendGrid for email |
| `coding-slack-api` | Team messaging via Slack — use for internal notifications alongside Twilio |

---

## Live References

- [Twilio Python SDK Documentation (v9.x)](https://www.twilio.com/docs/libraries/reference/twilio-python/)
- [Twilio SMS API Reference](https://www.twilio.com/docs/sms/api)
- [Twilio Verify API Reference](https://www.twilio.com/docs/verify/api)
- [TwiML Voice Response Reference](https://www.twilio.com/docs/voice/twiml)
- [Twilio Webhook Security (Signature Validation)](https://www.twilio.com/docs/usage/webhooks/webhook-security)
- [Twilio Conversations API](https://www.twilio.com/docs/conversations/api)
- [Twilio WhatsApp API Guide](https://www.twilio.com/docs/whatsapp/api)
- [PyPI: twilio package](https://pypi.org/project/twilio/)
- [GitHub: twilio/twilio-python](https://github.com/twilio/twilio-python)
