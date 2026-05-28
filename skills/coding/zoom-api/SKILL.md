---
name: zoom-api
description: Integrates Zoom API v2 (Meetings, Webinars, Recordings, Phone, Users) using the zoom-python-client SDK v0.2+ with Server-to-Server OAuth, proper pagination, and rate-limit handling.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: zoom, zoom api, zoom meetings, create zoom meeting, zoom sdk, zoom webinars, zoom recording, zoom-python
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
  related-skills: coding-twilio-api, coding-slack-api, coding-sendgrid-api
------
# Zoom API Integration (Meetings, Webinars, Recordings, Users)
Integrates the Zoom API v2 — Meetings, Webinars, Recordings, Phone, and Users management — using the `zoom-python-client` SDK v0.2+ with Server-to-Server OAuth authentication. When loaded, this skill makes the model implement Zoom API operations with proper token management, pagination for list endpoints, rate-limit handling, and webhook event processing.
## TL;DR for Code Generation
- [ ] Initialize `ZoomApiClient` from environment variables using `ZoomApiClient.init_from_env()` — never hardcode credentials
- [ ] Use Server-to-Server OAuth (account_id, client_id, client_secret) — JWT tokens are deprecated by Zoom
- [ ] Handle pagination explicitly: use `next_page_token` in list endpoint responses to iterate all pages
- [ ] Wrap API calls in try/except for `requests.exceptions.HTTPError` with status code inspection
- [ ] Respect rate limits — Zoom returns `X-RateLimit-Limit` and `X-RateLimit-Remaining` headers
- [ ] Validate required parameters: `topic`, `start_time`, `duration` for meetings; `topic` for webinars
- [ ] Use ISO 8601 format (`2026-05-23T15:00:00Z`) for all datetime parameters
---
Zoom meetings and webinars programmatically
- Listing meeting recordings and managing cloud recording retention policies
- Managing Zoom users (create, suspend, update, list) in a Zoom account
- Integrating Zoom Phone for call log retrieval, extension management, and call routing
- Processing Zoom webhook events (meeting started/ended, participant joined/left, recording completed)
- Building apps with the Zoom Apps SDK for embedded experiences within Zoom meetings
---
Zoom RTMS SDK (Real-Time Media Streams) instead
- Managing Zoom Rooms hardware or calendar integration — those require separate Zoom Room management APIs
---
## Core Workflow
Authenticate with Server-to-Server OAuth: Initialize `ZoomApiClient` from environment variables (`ZOOM_ACCOUNT_ID`, `ZOOM_CLIENT_ID`, `ZOOM_CLIENT_SECRET`). The SDK handles token caching and refresh automatically. **Checkpoint:** Verify authentication by calling `zoom_client.users.get_user("me")` — this returns the authenticated accounts owner details.; Identify the Target Resource: Determine user ID or email address (for user-scoped endpoints), or use the API root for account-scoped operations. User IDs can be `me` (the authenticated user), an email address, or the numeric user ID. **Checkpoint:** Confirm the user exists with `get_user()` before creating meetings for them.; Execute the API Operation: Call the appropriate method: `create_meeting()`, `get_meeting()`, `list_recordings()`, etc. Pass required parameters as keyword arguments. For list endpoints, implement pagination using `next_page_token` from the response. **Checkpoint:** Validate the response contains expected fields — for meetings, check `join_url` and `id` are present.; Handle Errors and Rate Limits: Catch `requests.exceptions.HTTPError` and inspect the status code: 400 (bad request / validation), 401 (bad auth / token expired), 404 (resource not found), 429 (rate limited). For 429, implement exponential backoff using the `Retry-After` header. **Checkpoint:** Log the response payload for 400s to capture validation error details.; Process Webhooks: Zoom sends event notifications to your webhook endpoint as JSON POST bodies. Validate the webhook using the `Authorization` header (Bearer token comparison). Acknowledge by returning HTTP 200 immediately. **Checkpoint:** Return 200 within 3 seconds — Zoom retries for 24 hours if you do not acknowledge.
---
## Implementation Patterns
### Pattern 1: Creating a Scheduled Meeting
```python
import os
from datetime import datetime, timedelta
from zoom_python_client.zoom_api_client import ZoomApiClient
import requests

# ❌ BAD — JWT token (deprecated), hardcoded credentials, no error handling
import jwt
token = jwt.encode({"iss": "API_KEY", "exp": datetime.now() + timedelta(hours=1)}, "API_SECRET")
headers = {"Authorization": f"Bearer {token}"}
resp = requests.post(
    "https://api.zoom.us/v2/users/me/meetings",
    headers=headers,
    json={"topic": "My Meeting", "type": 2, "start_time": "2026-05-23T15:00:00Z", "duration": 60},
)
print(resp.json())

# ✅ GOOD — Server-to-Server OAuth, env-based config, typed parameters, error handling
import logging

logger = logging.getLogger(__name__)

# Initialize from environment variables
# Requires: ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET
zoom_client = ZoomApiClient.init_from_env()

def create_scheduled_meeting(
    topic: str,
    start_time: str,
    duration_minutes: int,
    settings: dict | None = None,
    password: str | None = None,
) -> dict:
    """Create a scheduled Zoom meeting and return meeting details."""
    meeting_data: dict = {
        "topic": topic,
        "type": 2,  # 1=instant, 2=scheduled, 3=recurring, 8=webinar
        "start_time": start_time,  # ISO 8601: "2026-05-23T15:00:00Z"
        "duration": duration_minutes,
        "timezone": "UTC",
        "settings": settings or {
            "host_video": True,
            "participant_video": True,
            "join_before_host": False,
            "mute_upon_entry": True,
            "approval_type": 0,  # 0=auto approve, 1=manual, 2=no registration
            "audio": "voip",
            "auto_recording": "none",
        },
    }
    if password:
        meeting_data["password"] = password

    try:
        result = zoom_client.meetings.create_meeting(meeting_data)
        meeting = result.json() if hasattr(result, "json") else result

        logger.info("Meeting created", extra={"id": meeting.get("id"), "topic": topic, "join_url": meeting.get("join_url")})
        return {
            "id": meeting.get("id"),
            "join_url": meeting.get("join_url"),
            "start_url": meeting.get("start_url"),
            "password": meeting.get("password"),
            "start_time": meeting.get("start_time"),
        }
    except requests.exceptions.HTTPError as exc:
        status = exc.response.status_code if exc.response else 0
        body = exc.response.json() if exc.response and exc.response.content else {}
        logger.error("Zoom meeting creation failed", extra={"status": status, "response": body})

        if status == 429:
            retry_after = exc.response.headers.get("Retry-After", "60")
            raise RuntimeError(f"Rate limited. Retry after {retry_after}s") from exc
        elif status == 401:
            raise RuntimeError("Zoom authentication failed — check credentials") from exc
        elif status == 404:
            raise RuntimeError("User not found") from exc
        raise
```
### Pattern 2: Listing Meeting Recordings with Pagination
```python
import os
import requests

# ❌ BAD — no pagination, only fetches first page (max 30 records)
result = zoom_client.meetings.list_meetings("me")
print(result.json())

# ✅ GOOD — full pagination, typed response, resource cleanup
def list_all_recordings(
    user_id: str = "me",
    page_size: int = 300,
    from_date: str | None = None,
    to_date: str | None = None,
) -> list[dict]:
    """List all cloud recordings for a user, handling pagination."""
    all_recordings: list[dict] = []
    next_page_token: str | None = None

    while True:
        params: dict = {
            "user_id": user_id,
            "page_size": min(page_size, 300),
        }
        if next_page_token:
            params["next_page_token"] = next_page_token
        if from_date:
            params["from"] = from_date
        if to_date:
            params["to"] = to_date

        try:
            response = zoom_client.meetings.list_recordings(params)
            data = response.json() if hasattr(response, "json") else response

            meetings = data.get("meetings", [])
            all_recordings.extend(meetings)

            next_page_token = data.get("next_page_token")
            logger.info("Fetched recordings page", extra={"count": len(meetings), "total_so_far": len(all_recordings)})

            if not next_page_token:
                break
        except requests.exceptions.HTTPError as exc:
            logger.error("Failed to list recordings", extra={"status": exc.response.status_code if exc.response else 0})
            raise

    return all_recordings
```
### Pattern 3: Managing Zoom Users
```python
import os
import requests

# ❌ BAD — no input validation, no user action filtering, no pagination
result = zoom_client.users.get_user("someone@example.com")
print(result.json())

# ✅ GOOD — user lookup with validation, action options, error handling
from typing import Literal

UserAction = Literal["activate", "deactivate", "suspend", "unsuspend"]

def get_or_create_user(email: str, first_name: str, last_name: str) -> dict:
    """Look up a Zoom user or create them if they do not exist."""
    try:
        result = zoom_client.users.get_user(email)
        user = result.json() if hasattr(result, "json") else result
        logger.info("User found", extra={"email": email, "id": user.get("id")})
        return {
            "id": user.get("id"),
            "email": user.get("email"),
            "first_name": user.get("first_name"),
            "last_name": user.get("last_name"),
            "status": user.get("status"),
            "created": user.get("created_at"),
        }
    except requests.exceptions.HTTPError as exc:
        if exc.response and exc.response.status_code == 404:
            # User does not exist — create them
            return create_user(email, first_name, last_name)
        raise

def create_user(email: str, first_name: str, last_name: str) -> dict:
    """Create a new Zoom user."""
    user_data = {
        "action": "create",  # "create", "autoCreate", "custCreate", "ssoCreate"
        "user_info": {
            "email": email,
            "first_name": first_name,
            "last_name": last_name,
            "type": 1,  # 1=basic (free), 2=pro, 3=corporate
        },
    }
    try:
        result = zoom_client.users.create_user(user_data)
        user = result.json() if hasattr(result, "json") else result
        logger.info("User created", extra={"email": email, "id": user.get("id")})
        return user
    except requests.exceptions.HTTPError as exc:
        body = exc.response.json() if exc.response and exc.response.content else {}
        logger.error("User creation failed", extra={"email": email, "response": body})
        raise

def update_user_status(email: str, action: UserAction) -> bool:
    """Update a Zoom users status (suspend/unsuspend)."""
    try:
        zoom_client.users.update_user(email, {"action": action})
        logger.info("User status updated", extra={"email": email, "action": action})
        return True
    except requests.exceptions.HTTPError as exc:
        logger.error("Status update failed", extra={"email": email, "action": action, "status": exc.response.status_code if exc.response else 0})
        return False
```
---
## Constraints
### MUST DO
- Use Server-to-Server OAuth (`account_id` + `client_id` + `client_secret`) for authentication — Zoom deprecated JWT tokens in September 2023
- Store credentials in environment variables: `ZOOM_ACCOUNT_ID`, `ZOOM_CLIENT_ID`, `ZOOM_CLIENT_SECRET` — never hardcode them
- Use ISO 8601 datetime format (`2026-05-23T15:00:00Z`) for all `start_time` parameters
- Handle pagination on every list endpoint — Zoom returns `next_page_token` for responses exceeding `page_size` (default 30, max 300)
- Implement exponential backoff for 429 rate-limit responses — Zoom allows 1 request/second for most endpoints, 10/s for batch operations
- Validate meeting/webinar parameters before sending: `topic` max 200 chars, `start_time` must be in the future, `duration` minimum 10 minutes
### MUST NOT DO
- Use Static JWT tokens or hardcoded API Key/Secret — they are deprecated and will generate 401 responses
- Assume list endpoints return all records in one call — always paginate with `next_page_token`
- Hardcode Zoom user IDs — resolve them by email or use `me` for the authenticated user
- Return raw Zoom API responses to end users — extract specific fields and structure the output
- Ignore webhook event validation — verify the `Authorization` header on incoming webhooks to prevent unauthorized event injection
---
## Output Template
When implementing Zoom API code, the output must follow this structure:
1. **Client Initialization** — `ZoomApiClient.init_from_env()` reading `ZOOM_ACCOUNT_ID`, `ZOOM_CLIENT_ID`, `ZOOM_CLIENT_SECRET`
2. **Resource Identification** — User resolved by email or `me`; meeting/webinar ID validated before operations
3. **Parameter Construction** — Dict with `topic`, `start_time` (ISO 8601), `duration` (minutes), `type`, and `settings`
4. **API Call** — Method call wrapped in try/except for `requests.exceptions.HTTPError`
5. **Pagination** — `while next_page_token:` loop for all list endpoints
6. **Error Handling** — Status-specific logic: 400 (validation), 401 (auth), 404 (not found), 429 (rate limit)
7. **Response Structuring** — Extracts `id`, `join_url`, `start_url`, `password` from responses
---
Zoom for meeting notification via SMS |
| `coding-slack-api` | Team messaging — send Zoom meeting links and recording notifications to Slack channels |
| `coding-sendgrid-api` | Transactional email — use for meeting confirmation and recording delivery emails |
---