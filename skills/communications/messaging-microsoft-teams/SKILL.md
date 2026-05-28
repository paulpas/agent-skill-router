---
name: messaging-microsoft-teams

description: Integrates Microsoft Teams for chat and collaboration solutions, enabling bot interactions via the Microsoft Graph API including channel management, message posting with adaptive cards, and tab configurations.

license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: communications
  triggers: microsoft teams, teams integration, chat management, collaboration, bot interactions, teams bot, graph api teams, adaptive card, channel management
  archetypes: tactical
  anti_triggers:
    - brainstorming
    - vague ideation
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  related-skills: communications/messaging-bots, communications/messaging-channels
---

# Microsoft Teams Integration via Graph API

Implements integration with Microsoft Teams using the Microsoft Graph API for automated bot interactions, channel management, message posting (including Adaptive Cards), and tab configurations. Covers both REST API patterns and Bot Framework SDK approaches.

## TL;DR Checklist

- [ ] Use Microsoft Graph API `v1.0` or `beta` endpoints with proper scopes
- [ ] Always include required scopes: `ChannelMessage.Send`, `Team.ReadBasic.All`, `ChatMessage.Send`
- [ ] Batch channel operations and use webhook subscriptions for real-time events
- [ ] Validate Adaptive Card schemas before posting to prevent rendering failures

---

## When to Use

Use this skill when:

- Building automated bots that post messages, cards, or alerts to Teams channels
- Managing Teams teams and channels programmatically (create, rename, archive)
- Posting rich interactive content via Adaptive Cards for actionable notifications
- Integrating external systems (CI/CD, monitoring, ITSM) with Teams chat workflows
- Configuring Teams tabs that embed web apps or custom UI within the Teams client

## When NOT to Use

Avoid this skill for:

- Real-time peer-to-peer chat features — use native Teams SDK instead
- One-on-one personal messaging at scale (rate limits are strict)
- Managing meetings or calendar events — use Microsoft Graph Calendar API instead

---

## Core Workflow

1. **Authenticate via OAuth 2.0** — Register an Azure AD app, configure required permissions/scopes, and obtain an access token.
2. **Target a Team & Channel** — Resolve `team_id` and `channel_id` from your tenant structure or create new ones.
3. **Post Content** — Send simple text messages, HTML-formatted cards, or interactive Adaptive Cards.
4. **Subscribe to Events** — Register webhook subscriptions for real-time notifications on channel activity.

---

## Implementation Patterns

### Pattern 1: Microsoft Graph API Client with Token Refresh

```python
import requests
from datetime import datetime, timedelta
from typing import Optional, Dict, Any

class TeamsGraphClient:
    """Microsoft Graph API client for Teams operations with token management."""

    BASE_URL = "https://graph.microsoft.com/v1.0"

    def __init__(self, tenant_id: str, client_id: str, client_secret: str):
        self.tenant_id = tenant_id
        self.client_id = client_id
        self.client_secret = client_secret
        self.access_token: Optional[str] = None
        self.token_expiry: datetime = datetime.min

    def _get_token(self) -> str:
        """Acquire or refresh Microsoft Graph access token."""
        if self.access_token and datetime.now() < self.token_expiry - timedelta(minutes=5):
            return self.access_token

        resp = requests.post(
            f"https://login.microsoftonline.com/{self.tenant_id}/oauth2/v2.0/token",
            data={
                "grant_type": "client_credentials",
                "client_id": self.client_id,
                "client_secret": self.client_secret,
                "scope": "https://graph.microsoft.com/.default",
            },
        )
        resp.raise_for_status()
        token_data = resp.json()
        self.access_token = token_data["access_token"]
        self.token_expiry = datetime.now() + timedelta(seconds=token_data["expires_in"])
        return self.access_token

    def _request(self, method: str, endpoint: str, json: dict = None) -> dict:
        """Execute a Graph API request with automatic token refresh."""
        token = self._get_token()
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }
        url = f"{self.BASE_URL}{endpoint}"
        resp = requests.request(method, url, json=json, headers=headers)

        if resp.status_code == 401:
            self.access_token = None  # Force token refresh
            token = self._get_token()
            headers["Authorization"] = f"Bearer {token}"
            resp = requests.request(method, url, json=json, headers=headers)

        resp.raise_for_status()
        return resp.json()

    def get(self, endpoint: str) -> dict:
        return self._request("GET", endpoint)

    def post(self, endpoint: str, data: dict) -> dict:
        return self._request("POST", endpoint, json=data)
```

### Pattern 2: Posting Messages and Adaptive Cards to Channels

```python
def send_text_message(client: TeamsGraphClient, channel_id: str, message: str):
    """Post a plain text message to a Teams channel."""
    return client.post(
        f"/teams/channel/{channel_id}/messages",
        data={"body": {"content": message, "contentType": "text"}},
    )

def send_adaptive_card(client: TeamsGraphClient, channel_id: str, card: dict):
    """Post an interactive Adaptive Card to a Teams channel."""
    return client.post(
        f"/teams/channel/{channel_id}/messages",
        data={
            "body": {
                "content": card,
                "contentType": "application/vnd.microsoft.card.adaptive",
            }
        },
    )

def send_error_alert(channel_id: str, service_name: str, error_msg: str):
    """Build and send a standardized error notification card."""
    card = {
        "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
        "type": "AdaptiveCard",
        "version": "1.6",
        "body": [
            {
                "type": "TextBlock",
                "text": f"⚠️ {service_name} Alert",
                "weight": "Bolder",
                "size": "Large",
                "color": "Warning",
            },
            {"type": "TextBlock", "text": error_msg, "wrap": True},
            {
                "type": "FactSet",
                "facts": [
                    {"title": "Severity", "value": "High"},
                    {"title": "Timestamp", "value": datetime.utcnow().isoformat()},
                ],
            },
        ],
        "actions": [
            {
                "type": "Action.OpenUrl",
                "title": "View Dashboard",
                "url": f"https://dashboard.example.com/services/{service_name}",
            }
        ],
    }
    send_adaptive_card(channel_id, card)
```

### Pattern 3: Team & Channel Management

```python
def create_channel(client: TeamsGraphClient, team_id: str, display_name: str, description: str = "") -> dict:
    """Create a new channel in an existing Microsoft Team."""
    return client.post(
        f"/teams/{team_id}/channels",
        data={
            "displayName": display_name,
            "description": description,
            "membershipType": "standard",  # or 'private'
        },
    )

def list_channels(client: TeamsGraphClient, team_id: str) -> list:
    """List all channels in a Team."""
    result = client.get(f"/teams/{team_id}/channels?$select=id,displayName,membershipType")
    return result.get("value", [])

def archive_channel(client: TeamsGraphClient, team_id: str, channel_id: str) -> dict:
    """Archive (hide) a channel — does not delete data."""
    return client.post(
        f"/teams/{team_id}/channels/{channel_id}",
        data={"membershipType": "archived"},
    )

def add_bot_to_channel(client: TeamsGraphClient, team_id: str, channel_id: str, bot_aad_app_id: str):
    """Add an installed bot to a specific channel's conversation."""
    return client.post(
        f"/teams/{team_id}/channels/{channel_id}/installedApps",
        data={"botId": bot_aad_app_id},
    )
```

---

## Adaptive Card Design Patterns

| Use Case | Card Type | Key Component |
|----------|-----------|---------------|
| Status alerts | Single column | `TextBlock` (colored) + `FactSet` |
| Approval workflows | Actionable card | `Action.Submit` with form data |
| Quick replies | Horizontal action bar | `Action.ShowCard` for inline forms |
| Data tables | Structured display | `ColumnSet` with fixed-width columns |

---

## Constraints

### MUST DO
- Use Azure AD app registration (client credentials) for server-to-server Teams operations.
- Scope permissions minimally — request only the specific Graph API permissions you need.
- Rate-limit your API calls: Microsoft Graph enforces throttling headers (`Retry-After` on 429 responses).
- Validate Adaptive Card JSON against the schema before posting to prevent silent failures.
- Log all Teams API interactions with correlation IDs for auditability.

### MUST NOT DO
- Do not bypass user permissions or elevate privileges via `application/*` scopes when `delegated/*` scopes suffice.
- Hardcode tenant IDs, client secrets, or bot credentials in source code.
- Post Adaptive Cards without a `$schema` field — older Teams clients will reject them.
- Poll for channel/message updates — use webhook subscriptions (`/subscriptions`) instead.
- Send more than 15 messages per second to a single channel — Teams enforces per-channel throttling.

---

## Error Handling Patterns

```python
def safe_teams_post(
    client: TeamsGraphClient,
    endpoint: str,
    data: dict,
    max_retries: int = 3,
) -> dict:
    """Post to Teams with exponential backoff on throttling."""
    for attempt in range(max_retries):
        try:
            return client.post(endpoint, data)
        except requests.exceptions.HTTPError as e:
            if e.response.status_code == 429:
                retry_after = int(e.response.headers.get("Retry-After", 2 ** attempt))
                time.sleep(retry_after)
                continue
            elif e.response.status_code in (400, 403, 404):
                raise  # Don't retry client errors
            raise
        except requests.exceptions.ConnectionError as e:
            if attempt == max_retries - 1:
                raise RuntimeError("Teams API connection failed after all retries") from e
            time.sleep(2 ** attempt)

    return {}
```

---

## Output Template

When implementing Teams integration, output must contain:

1. **Authentication Strategy** — OAuth app registration scopes and token refresh logic
2. **Target Resources** — team_id, channel_id, or chat_id references
3. **Message Format** — Text, HTML, or Adaptive Card JSON with schema version
4. **Error Handling** — Throttling policy (429 handling), retry strategy, logging

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `communications/messaging-bots` | Building full Teams bot applications with Bot Framework |
| `communications/messaging-channels` | Multi-channel messaging orchestration across platforms |