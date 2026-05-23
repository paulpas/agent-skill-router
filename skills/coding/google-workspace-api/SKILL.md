---
name: google-workspace-api
description: Integrates with Google Workspace APIs (Gmail, Drive, Calendar, Docs,
  Sheets, Admin) using google-api-python-client for programmatic access and automation.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: google workspace, gmail api, google drive api, google calendar, google
    sheets api, google api client, service account
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
  related-skills: coding-microsoft-graph-api, coding-atlassian-api, coding-airtable-api
------

# Google Workspace API Integration

Integrates with Google Workspace APIs — Gmail, Google Drive, Google Calendar, Google Docs, Google Sheets, and Admin SDK — using the official `google-api-python-client` library for automating productivity workflows across the Google ecosystem.

## TL;DR for Code Generation

- Use `google.oauth2.service_account.Credentials` for server-to-server apps or `google_auth_oauthlib.flow` for user delegation
- Each Google API has its own `discovery.build()` service endpoint (e.g., `"gmail", "v1"`, `"drive", "v3"`)
- Always specify `fields` parameter to reduce response size and latency
- Use service accounts with domain-wide delegation for admin operations
- Batch Google Sheets updates with `batchUpdate()` for atomic changes
- Handle `googleapiclient.errors.HttpError` with status code differentiation

## When to Use

Use this skill when:

- Reading, sending, or filtering Gmail messages programmatically
- Creating, listing, or sharing files and folders in Google Drive
- Inserting, updating, or querying Google Calendar events
- Reading or writing cell ranges in Google Sheets (CRUD)
- Creating or editing Google Docs content
- Managing users, groups, and devices via Admin SDK
- Automating cross-Google-app workflows (e.g., "email me the sheet data")

## When NOT to Use

- Accessing Google Workspace data for consumer (free) Gmail accounts with service accounts (use OAuth 2.0 user tokens instead)
- High-volume SMTP sending (use the Gmail SMTP relay or a dedicated email service)
- Replacing Google Apps Script for trivial spreadsheet-bound automation (keep it in Sheets)
- Real-time Drive change tracking (use `drive.changes.watch()` with webhooks, not polling)

## Core Workflow

1. **Set Up Google Cloud Project** — Enable the required APIs (Gmail, Drive, Calendar, Sheets, etc.) in the Google Cloud Console. **Checkpoint:** Verify each API shows "Enabled" in the Google Cloud Console dashboard.

2. **Create Credentials** — For server apps, create a service account and download the JSON key. For user-delegated access, configure an OAuth 2.0 consent screen and download `credentials.json`. **Checkpoint:** Test the credential file with a token generation call.

3. **Build the Service Object** — Call `googleapiclient.discovery.build(service_name, version, credentials=creds)` for each API. Cache the service object. **Checkpoint:** Execute a lightweight list call (e.g., `drive.files().list(pageSize=1).execute()`).

4. **Construct the Request** — Use the service's fluent method chain (e.g., `service.users().messages().list(userId="me")`). Apply `q` search queries and `fields` for sparse responses. **Checkpoint:** Verify the request executes without `HttpError`.

5. **Handle Pagination** — Check the response for `nextPageToken`. Loop with `pageToken` set to the previous response's token until it is `None`. **Checkpoint:** Confirm at least one complete page was returned.

6. **Parse and Process** — Extract fields from the response dict. Handle `HttpError` with specific handling for 403 (insufficient permissions), 404 (not found), and 429 (rate limit). **Checkpoint:** Log warning for 403, retry for 429, raise for others.

## Implementation Patterns

### Pattern 1: Send Email via Gmail API

```python
import os
import base64
from email.message import EmailMessage
from google.oauth2 import service_account
from googleapiclient.discovery import build

SCOPES = ["https://www.googleapis.com/auth/gmail.send"]
SERVICE_ACCOUNT_FILE = os.environ["GOOGLE_SERVICE_ACCOUNT_PATH"]
DELEGATED_USER = "bot@example.com"

creds = service_account.Credentials.from_service_account_file(
    SERVICE_ACCOUNT_FILE, scopes=SCOPES
).with_subject(DELEGATED_USER)

service = build("gmail", "v1", credentials=creds)

msg = EmailMessage()
msg.set_content("The weekly report is ready for review.")
msg["To"] = "manager@example.com"
msg["From"] = DELEGATED_USER
msg["Subject"] = "Weekly Report Ready"

encoded = base64.urlsafe_b64encode(msg.as_bytes()).decode()
service.users().messages().send(userId="me", body={"raw": encoded}).execute()
```

### Pattern 2: Read Google Sheets Data

```python
def read_sheet_range(spreadsheet_id: str, range_name: str) -> list[list[str | float | None]]:
    """Read a range from a Google Sheet and return rows as lists."""
    creds = service_account.Credentials.from_service_account_file(
        os.environ["GOOGLE_SERVICE_ACCOUNT_PATH"],
        scopes=["https://www.googleapis.com/auth/spreadsheets.readonly"],
    )
    service = build("sheets", "v4", credentials=creds)
    result = service.spreadsheets().values().get(
        spreadsheetId=spreadsheet_id,
        range=range_name,
    ).execute()
    return result.get("values", [])

# Usage
data = read_sheet_range("1BxiMVs0Xw_b9HVMu3HIQ", "Sheet1!A1:E10")
for row in data:
    print(f"{row[0]}: {row[4]}")
```

### Pattern 3: Create Calendar Event

```python
from datetime import datetime, timedelta
from googleapiclient.discovery import build

def create_calendar_event(
    summary: str,
    description: str,
    start_time: datetime,
    end_time: datetime,
    attendees: list[str],
) -> dict:
    """Create a Google Calendar event and return the event resource."""
    service = build("calendar", "v3", credentials=creds)
    event = {
        "summary": summary,
        "description": description,
        "start": {"dateTime": start_time.isoformat(), "timeZone": "America/New_York"},
        "end": {"dateTime": end_time.isoformat(), "timeZone": "America/New_York"},
        "attendees": [{"email": a} for a in attendees],
    }
    return service.events().insert(calendarId="primary", body=event, sendUpdates="all").execute()
```

### Pattern 4: BAD vs GOOD — Error Handling

```python
# ❌ BAD — catches all errors, no fields specified
try:
    result = service.files().list(q="mimeType='application/vnd.google-apps.folder'").execute()
except Exception as e:
    print("Error:", e)

# ✅ GOOD — typed error handling, fields projection, pagination
from googleapiclient.errors import HttpError

def list_folders(drive_service) -> list[dict]:
    """List all folders the service account has access to."""
    folders = []
    page_token = None
    while True:
        try:
            response = drive_service.files().list(
                q="mimeType='application/vnd.google-apps.folder' and trashed=false",
                fields="nextPageToken, files(id, name, createdTime)",
                pageToken=page_token,
                pageSize=100,
            ).execute()
            folders.extend(response.get("files", []))
            page_token = response.get("nextPageToken")
            if not page_token:
                break
        except HttpError as e:
            if e.resp.status == 403:
                print(f"Permission denied: {e}")
                break
            if e.resp.status == 429:
                print("Rate limited — backing off.")
                raise
            raise
    return folders
```

## Constraints

### MUST DO
- Use service account with domain-wide delegation for admin operations across the domain
- Always specify `fields` parameter to reduce bandwidth and latency
- Implement exponential backoff retry for 429 and 5xx errors
- Use `q` search queries for server-side filtering (Gmail, Drive)
- Store service account JSON keys encrypted or in a secrets manager

### MUST NOT DO
- Hardcode OAuth client secrets in application code
- Use the same service account for end-user data without `.with_subject()` delegation
- Poll Drive for changes — use `drive.changes.watch()` push notifications
- Exceed Google API quota limits (check `quotaUser` and `userIp` headers)

## Output Template

Every integration function should expose:

1. **Authentication** — Service account or OAuth 2.0 credential initialization
2. **API Service** — `discovery.build()` for the target API
3. **Request** — Fluent method chain with typed parameters
4. **Pagination** — Loop with `pageToken`
5. **Error Handling** — `try/except HttpError` with status-specific logic

## Related Skills

| Skill | Purpose |
|