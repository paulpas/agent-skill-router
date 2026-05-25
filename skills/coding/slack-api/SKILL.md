---
name: slack-api
description: Integrates Slack API (Web API, Events API, Bolt Framework, Incoming Webhooks,
  Block Kit) using the slack-sdk Python v3.x with proper event handling, Block Kit
  construction, and OAuth patterns.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: slack, slack api, slack bot, slack webhook, block kit, slack events, bolt
    python, send message to slack
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
  related-skills: coding-discord-api, coding-twilio-api, coding-sendgrid-api
------
# Slack API Integration (Bolt, Web API, Block Kit, Events)

Integrates the Slack platform — Web API, Events API, Bolt Framework, Incoming Webhooks, and Block Kit — using the `slack-sdk` Python SDK v3.x and `bolt-python`. When loaded, this skill makes the model implement Slack integrations with proper event handling, Block Kit message construction, OAuth flow, webhook verification, and slash command processing.

## TL;DR for Code Generation

- [ ] Initialize `WebClient` from `SLACK_BOT_TOKEN` environment variable — never hardcode tokens
- [ ] Use Block Kit (`blocks` parameter) for rich messages — never send plain text fallback without blocks
- [ ] For event-driven apps, use `Bolt` (`from slack_bolt import App`) with Socket Mode for development
- [ ] Verify Slack request signatures on every incoming webhook and command using `request_verification`
- [ ] Handle `SlackApiError` with status-specific logic — inspect `response["error"]` for the error code
- [ ] Use `views_open` / `views_update` for modal interactions; `ack()` every interaction within 3 seconds
- [ ] Use `chat_postMessage` with `blocks` for messages, `files_upload_v2` for file sharing

---

## When to Use

Use this skill when:

- Building Slack bots that respond to messages, slash commands, or events
- Sending rich (Block Kit) notifications to Slack channels from external applications via Incoming Webhooks
- Implementing OAuth-based Slack app installations with the OAuth flow
- Creating interactive components (modals, message actions, shortcuts) for Slack users
- Monitoring Slack events (messages, reactions, channel joins) via the Events API
- Automating channel management, message archiving, or user provisioning via the Web API

---

## When NOT to Use

Avoid this skill for:

- SMS or email delivery (use `coding-twilio-api` or `coding-sendgrid-api` instead)
- Voice or video calling — Slack handles that natively; use the Web API to create huddles instead
- Replacing a dedicated customer support platform — Slack is an internal communication tool
- Discord-specific integrations (use `coding-discord-api` for Discord bots)

---

## Core Workflow

1. **Initialize the Client** — Create a `WebClient(token=os.environ["SLACK_BOT_TOKEN"])` for API calls, or use Bolt `App(token=..., signing_secret=...)` for event-driven apps. **Checkpoint:** Verify the token by calling `client.auth_test()` on startup — this validates the token and returns the bot user ID and team info.

2. **Construct the Message** — Use Block Kit builders for rich messages. Always include a fallback `text` parameter for notifications. Structure blocks as an array of block dicts. **Checkpoint:** Preview Block Kit JSON using [Slacks Block Kit Builder](https://app.slack.com/block-kit-builder) before deploying.

3. **Send or Respond** — Use `client.chat_postMessage()` for proactive messages, `say()` in Bolt for command responses, or `response.write()` for webhook replies. For slash commands, always call `ack()` first within 3 seconds. **Checkpoint:** Check the response `ts` (timestamp) — its presence confirms successful delivery.

4. **Handle Events (Bolt Framework)** — Register event listeners with `@app.event("event_type")`. Use `@app.command()` for slash commands, `@app.action()` for interactive components, `@app.view()` for modal submissions. **Checkpoint:** Always call `ack()` as the first operation in every handler to prevent timeout errors.

5. **Error Handling and Retry** — Catch `SlackApiError` and inspect `response["error"]`. Common errors: `not_authorized`, `invalid_blocks`, `ratelimited`, `channel_not_found`. Implement retry with exponential backoff for rate limits. **Checkpoint:** Log the error payload with correlation IDs for debugging.

---

## Implementation Patterns

### Pattern 1: Block Kit Notification with Webhook

```python
import os
import json
import requests
from slack_sdk import WebClient
from slack_sdk.errors import SlackApiError

# ❌ BAD — plain text only, no blocks, no error handling, hardcoded channel
client = WebClient(token="xoxb-xxx")
client.chat_postMessage(channel="#general", text="Deploy complete")

# ✅ GOOD — Block Kit message with fallback text, error handling, env-based config
import logging

logger = logging.getLogger(__name__)


def send_deploy_notification(service: str, version: str, environment: str, status: str) -> str | None:
    """Send a rich Block Kit deployment notification to Slack."""
    client = WebClient(token=os.environ["SLACK_BOT_TOKEN"])
    channel = os.environ.get("SLACK_DEPLOY_CHANNEL", "#deployments")

    color = "#36a64f" if status == "success" else "#ff0000"
    blocks = [
        {
            "type": "header",
            "text": {"type": "plain_text", "text": f"Deploy: {service} v{version} — {status}"},
        },
        {
            "type": "section",
            "fields": [
                {"type": "mrkdwn", "text": f"*Service:*\n{service}"},
                {"type": "mrkdwn", "text": f"*Version:*\n{version}"},
                {"type": "mrkdwn", "text": f"*Environment:*\n{environment}"},
                {"type": "mrkdwn", "text": f"*Status:*\n{status}"},
            ],
        },
        {
            "type": "context",
            "elements": [{"type": "mrkdwn", "text": f"Deploy completed at {__import__('datetime').datetime.now().isoformat()}"}],
        },
    ]

    try:
        response = client.chat_postMessage(
            channel=channel,
            text=f"Deploy: {service} v{version} — {status}",  # Fallback for notifications
            blocks=blocks,
            unfurl_links=False,
        )
        ts: str = response["ts"]
        logger.info("Notification sent", extra={"channel": channel, "ts": ts, "service": service})
        return ts
    except SlackApiError as exc:
        error_code = exc.response["error"]
        logger.error("Slack API error", extra={"error": error_code, "channel": channel})
        if error_code == "ratelimited":
            retry_after = exc.response.headers.get("Retry-After", "5")
            logger.warning("Rate limited", extra={"retry_after": retry_after})
        return None
```

### Pattern 2: Bolt Slash Command with Modal

```python
import os
from slack_bolt import App
from slack_bolt.adapter.socket_mode import SocketModeHandler
from slack_sdk.errors import SlackApiError

# ❌ BAD — plain text response, no ack() handling, no error checking
@app.command("/ticket")
def handle_ticket(command, respond):
    respond(f"Creating ticket: {command['text']}")

# ✅ GOOD — modal response with ack(), input validation, error handling
app = App(
    token=os.environ["SLACK_BOT_TOKEN"],
    signing_secret=os.environ["SLACK_SIGNING_SECRET"],
)


@app.command("/ticket")
def open_ticket_modal(command, ack, client, logger):
    """Open a modal to create a support ticket."""
    # Acknowledge the command immediately (must be within 3 seconds)
    ack()

    modal_view = {
        "type": "modal",
        "callback_id": "ticket_submit",
        "title": {"type": "plain_text", "text": "Create Ticket"},
        "submit": {"type": "plain_text", "text": "Submit"},
        "close": {"type": "plain_text", "text": "Cancel"},
        "blocks": [
            {
                "type": "input",
                "block_id": "title_block",
                "element": {
                    "type": "plain_text_input",
                    "action_id": "title_input",
                    "placeholder": {"type": "plain_text", "text": "Brief description"},
                },
                "label": {"type": "plain_text", "text": "Title"},
            },
            {
                "type": "input",
                "block_id": "priority_block",
                "element": {
                    "type": "static_select",
                    "action_id": "priority_select",
                    "placeholder": {"type": "plain_text", "text": "Select priority"},
                    "options": [
                        {"text": {"type": "plain_text", "text": "Low"}, "value": "low"},
                        {"text": {"type": "plain_text", "text": "Medium"}, "value": "medium"},
                        {"text": {"type": "plain_text", "text": "High"}, "value": "high"},
                        {"text": {"type": "plain_text", "text": "Critical"}, "value": "critical"},
                    ],
                },
                "label": {"type": "plain_text", "text": "Priority"},
            },
        ],
    }

    try:
        client.views_open(trigger_id=command["trigger_id"], view=modal_view)
    except SlackApiError as exc:
        logger.error(f"Failed to open modal: {exc.response['error']}")


@app.view("ticket_submit")
def handle_ticket_submission(ack, body, client, logger):
    """Handle modal submission."""
    ack()

    values = body["view"]["state"]["values"]
    title = values["title_block"]["title_input"]["value"]
    priority = values["priority_block"]["priority_select"]["selected_option"]["value"]

    # Store or process the ticket
    ticket_id = f"TICKET-{hash(title) % 10000:04d}"
    user_id = body["user"]["id"]

    try:
        client.chat_postMessage(
            channel=user_id,
            text=f"Ticket {ticket_id} created!",
            blocks=[
                {
                    "type": "section",
                    "text": {"type": "mrkdwn", "text": f"*Ticket {ticket_id} Created*\n*Title:* {title}\n*Priority:* {priority}"},
                }
            ],
        )
    except SlackApiError as exc:
        logger.error(f"Failed to confirm: {exc.response['error']}")


# Socket Mode for local development
if __name__ == "__main__":
    handler = SocketModeHandler(app, os.environ["SLACK_APP_TOKEN"])
    handler.start()
```

### Pattern 3: Incoming Webhook (Simplest Integration)

```python
import os
import json
import requests

# ❌ BAD — no Block Kit, no error handling, assumes webhook URL is valid
requests.post(
    "https://hooks.slack.com/services/T00/B00/xxx",
    json={"text": "Hello"},
)

# ✅ GOOD — Block Kit, structured payload, error handling, timeout
def send_webhook_notification(webhook_url: str, message: str, title: str | None = None) -> bool:
    """Send a simple Block Kit notification via Slack Incoming Webhook."""
    blocks = [
        {
            "type": "section",
            "text": {"type": "mrkdwn", "text": message},
        }
    ]
    if title:
        blocks.insert(0, {
            "type": "header",
            "text": {"type": "plain_text", "text": title},
        })

    payload = {
        "text": message,  # Fallback for notifications
        "blocks": blocks,
        "unfurl_links": False,
    }

    try:
        resp = requests.post(
            webhook_url,
            json=payload,
            timeout=10,
            headers={"Content-Type": "application/json"},
        )
        resp.raise_for_status()
        return True
    except requests.exceptions.RequestException as exc:
        logging.getLogger(__name__).error("Webhook failed", extra={"error": str(exc)})
        return False
```

---

## Constraints

### MUST DO
- Store `SLACK_BOT_TOKEN`, `SLACK_SIGNING_SECRET`, and `SLACK_APP_TOKEN` in environment variables — never hardcode
- Always include a `text` fallback parameter alongside `blocks` for notification banners and accessibility
- Call `ack()` as the first operation in every Bolt handler (commands, actions, shortcuts, views) — you have 3 seconds
- Verify request signatures on every incoming Slack request using Bolt built-in verification or manual HMAC
- Use Socket Mode (`SocketModeHandler`) for local development — no public HTTP endpoint required
- Check `response["error"]` in `SlackApiError` for specific error codes — `ratelimited`, `invalid_blocks`, `not_authorized`
- Preview Block Kit JSON in the [Block Kit Builder](https://app.slack.com/block-kit-builder) before deploying to production

### MUST NOT DO
- Never reuse or expose OAuth access tokens across different workspaces — each Slack installation gets its own token
- Never skip `ack()` in interaction handlers — unacknowledged interactions will produce a timeout error to the user
- Hardcode channel IDs or names — load them from configuration or use `conversations_list` to resolve names
- Send sensitive data (passwords, API keys, PII) in Slack messages — Slack is not an encrypted platform
- Poll the Events API — use the Event Subscriptions or Socket Mode for real-time event delivery

---

## Output Template

When implementing Slack API code, the output must follow this structure:

1. **Client Initialization** — `WebClient` from `SLACK_BOT_TOKEN` env var; Bolt `App` from bot token + signing secret
2. **Message Construction** — Block Kit JSON array with at least one block type; `text` fallback always included
3. **Interaction Handling** — `ack()` called immediately; async processing after acknowledgment
4. **Error Handling** — Catches `SlackApiError` and inspects `response["error"]`; logs error with correlation context
5. **Security** — Request signature verification on all incoming requests (Bolt handles this automatically)

---

## Related Skills

| Skill | Purpose |
|---|---|
| `coding-discord-api` | Discord bot development — alternative to Slack for community-oriented messaging |
| `coding-twilio-api` | SMS and Voice communication — use alongside Slack for multi-channel notifications |
| `coding-sendgrid-api` | Transactional email — use for email fallback when Slack notifications need escalation |

---

## Live References

- [Slack Python SDK (slack-sdk v3.x) Documentation](https://docs.slack.dev/tools/python-slack-sdk)
- [Bolt for Python Documentation](https://tools.slack.dev/bolt-python/)
- [Slack Web API Methods](https://docs.slack.dev/methods)
- [Block Kit Reference](https://api.slack.com/block-kit)
- [Block Kit Builder (Interactive Preview)](https://app.slack.com/block-kit-builder)
- [Slack Event Types](https://api.slack.com/events)
- [Slack Incoming Webhooks](https://api.slack.com/messaging/webhooks)
- [PyPI: slack-sdk package](https://pypi.org/project/slack-sdk/)
- [GitHub: slackapi/python-slack-sdk](https://github.com/SlackAPI/python-slack-sdk)
- [GitHub: slackapi/bolt-python](https://github.com/slackapi/bolt-python)
