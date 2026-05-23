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

