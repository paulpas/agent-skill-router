---




name: messaging-channels

description: Integrates various messaging channels to enable seamless communication with users about multiple platforms.

license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: communications
  role: implementation
  output-format: code
  triggers: messaging channels, channel integration, multi-platform messaging, unified communication
  archetypes: channel integration, communication
  anti_triggers: single platform messaging, manual channel management
  response_profile:
      verbosity: low
      directive_strength: high
  scope: infrastructure
  related-skills: communications/messaging-bots, communications/messaging-microsoft-teams




---





# Messaging Channels Integration
Facilitates integration of multiple messaging channels to ensure unified communication across platforms.

## When to Use
Use this skill for:
- Seamless integration of messaging services like Slack, WhatsApp, and MS Teams.
- Managing communication workflows across various channels.

## Core Workflow

### Additional Patterns

#### Example 3: Combined Messaging Channels Handling
```python
def handle_multiple_channels(channel_urls: list, message: str):
    for url in channel_urls:
        send_message(url, message)
    return 'Messages sent to all channels!'
```

#### Example 4: Storing Channel State
```python
channel_states = {}

def store_channel_state(channel_id: str, state: str):
    channel_states[channel_id] = state
    return channel_states
```

### Constraints
- **MUST DO**: Ensure the state is maintained correctly across message send and receive processes, to allow for contextual understanding.
1. **Set Up Connections** — Establish connections to various messaging APIs.
2. **Handle Incoming Messages** — Parse incoming messages and route them accordingly.
3. **Send Out Messages** — Ensure messages are sent out correctly across all channels.

## Implementation Patterns
### Pattern 1: Connecting to a Messaging API
```python
import requests

def connect_to_channel(channel_url: str):
    response = requests.get(channel_url)
    response.raise_for_status()
    return response.json()
```

### Pattern 2: Sending Messages Across Channels
```python
def send_message(channel_url: str, message: str):
    data = {'text': message}
    response = requests.post(channel_url, json=data)
    response.raise_for_status()  # Raise error for failed requests
    return response.json()
```

## Constraints

### Additional Patterns

#### Example 1: Connecting Multiple Channels
```python
def connect_multiple_channels(channel_urls: list):
    connections = {}
    for url in channel_urls:
        connections[url] = connect_to_channel(url)
    return connections
```

#### Example 2: Unified Message Sending
```python
def send_bulk_messages(channels: list, message: str):
    for channel in channels:
        send_message(channel, message)
```

### MUST DO
- Verify user permissions for each channel before sending messages.
- Log every message sent for auditing and feedback purposes, ensuring proper user engagement tracking.
### MUST DO
- Always verify channel credentials before attempting to connect.
- Log interactions for audit and debugging purposes.

### MUST NOT DO
- Do not send messages without user consent.
- Avoid duplicating messages across channels unless specified.

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links to resolve external references and inline content.

- [Slack API Channels Reference](https://developers.slack.com/reference/api-channels)
- [Slack Events API Documentation](https://api.slack.com/events)
- [Slack Bot Messaging Guide](https://developers.slack.com/docs/bot-conventions)
- [WhatsApp Business Platform Docs](https://developers.facebook.com/docs/whatsapp)
- [Microsoft Teams REST API Reference](https://learn.microsoft.com/en-us/graph/api/overview)