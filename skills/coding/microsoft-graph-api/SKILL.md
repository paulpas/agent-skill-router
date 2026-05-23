---
name: microsoft-graph-api
description: Integrates with Microsoft Graph API to manage mail, calendar, OneDrive
  files, Teams messages, SharePoint sites, and Excel workbooks using msgraph-sdk for
  Python.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: microsoft graph, msgraph, outlook api, teams api, sharepoint api, office
    365 api, entra id graph, msgraph-sdk
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
  related-skills: coding-google-workspace-api, coding-atlassian-api
------

# Microsoft Graph API Integration

Integrates with Microsoft Graph — the unified REST API for Microsoft 365 services — to programmatically manage emails, calendar events, OneDrive and SharePoint files, Teams messages, Excel workbooks, and Entra ID directory data using the official `msgraph-sdk` for Python.

## TL;DR for Code Generation

- Always authenticate via `Azure.Identity` using either `ClientSecretCredential` (daemon apps) or `DeviceCodeCredential` (user delegation)
- Use `msgraph-sdk` v1.57+ with the synchronous or async `GraphServiceClient`
- Prefer `.select()`, `.filter()`, and `.top()` to minimize payload size
- Handle `APIError` with a 3-attempt retry + exponential backoff
- Batch requests for bulk operations (max 20 per batch)
- Use `@odata.nextLink` pagination for large result sets

## When to Use

Use this skill when:

- Sending or reading emails via Microsoft 365 mailboxes
- Creating, updating, or querying calendar events and meeting invites
- Uploading, downloading, or managing files in OneDrive or SharePoint
- Sending and receiving Teams channel messages
- Reading or writing Excel workbook ranges
- Managing users, groups, and directory entries in Entra ID
- Automating approval workflows across Microsoft 365

## When NOT to Use

- Accessing on-premises Exchange or SharePoint (use the respective on-prem APIs)
- Graph API permissions that require admin consent without a proper review
- Sending high-volume bulk email (use Exchange Online SendMail or SMTP relay instead)
- Replacing a dedicated SIEM tool for security audit log analysis (use Microsoft Graph Security API separately)

## Core Workflow

1. **Register Application in Entra ID** — Create an app registration and configure API permissions (delegated or application). **Checkpoint:** Verify the app has the correct `Microsoft.Graph` permission scopes granted and consented.

2. **Choose Authentication Strategy** — For daemon/server apps, use `ClientSecretCredential` with application permissions. For user-delegated access, use `DeviceCodeCredential` or `InteractiveBrowserCredential`. **Checkpoint:** Validate the token acquires without interactive prompts in production.

3. **Initialize GraphServiceClient** — Instantiate the client with the credential and the default scope `["https://graph.microsoft.com/.default"]`. **Checkpoint:** Call `GET /v1.0/me` (or equivalent) to confirm connectivity.

4. **Construct the Request** — Use the fluent builder pattern: `client.users.by_user_id(id).messages.get()`. Apply `.select()`, `.filter()`, `.top()`, and `.orderby()` query parameters. **Checkpoint:** Verify the OData query compiles and returns expected fields.

5. **Handle Pagination** — Use `value` and `@odata.nextLink` from the response page. For `msgraph-sdk`, call `.next_page()` on the response object if more results exist. **Checkpoint:** Confirm at least one page was retrieved with the expected schema.

6. **Process the Response** — Iterate over the returned collection or single object. Wrap all calls in `try/except APIError` to catch authentication, throttling, and permission errors. **Checkpoint:** Parse the error body for `innerError.code` to differentiate transient vs. permanent failures.

## Implementation Patterns

### Pattern 1: Send an Email

```python
import os
from azure.identity import ClientSecretCredential
from msgraph import GraphServiceClient
from msgraph.generated.users.item.send_mail.send_mail_post_request_body import SendMailPostRequestBody
from msgraph.generated.models.message import Message
from msgraph.generated.models.recipient import Recipient
from msgraph.generated.models.email_address import EmailAddress

credential = ClientSecretCredential(
    tenant_id=os.environ["AZURE_TENANT_ID"],
    client_id=os.environ["AZURE_CLIENT_ID"],
    client_secret=os.environ["AZURE_CLIENT_SECRET"],
)
client = GraphServiceClient(credential)

message = Message(
    subject="Deployment Complete",
    to_recipients=[
        Recipient(email_address=EmailAddress(address="team@example.com"))
    ],
    body=Body(content="The v2.5.0 deployment finished successfully.", content_type=Text),
)
body = SendMailPostRequestBody(message=message)

client.users.by_user_id("admin@example.com").send_mail.post(body)
```

### Pattern 2: List Calendar Events (with Filter and Select)

```python
from datetime import datetime, timedelta

today = datetime.utcnow().isoformat() + "Z"
next_week = (datetime.utcnow() + timedelta(days=7)).isoformat() + "Z"

query_params = client.me.calendar.events.get_query_parameter.Filter(
    f"start/dateTime ge '{today}' and start/dateTime le '{next_week}'"
)
query_params.select = ["subject", "start", "end", "location"]
query_params.top = 25

events_page = client.me.calendar.events.get(query_parameters=query_params)

for event in events_page.value:
    print(f"{event.subject} — {event.start.date_time}")
```

### Pattern 3: Upload File to OneDrive (with Conflict Handling)

```python
from msgraph.generated.models.drive_item import DriveItem
from msgraph.generated.models.upload_session import UploadSession

# Large file upload via upload session
file_path = "report_q1.pdf"
file_size = os.path.getsize(file_path)

upload_session = client.drives.by_drive_id("drive-id").items.by_drive_item_id("parent-id").create_upload_session.post(
    body=DriveItem(name="report_q1.pdf")
)

with open(file_path, "rb") as f:
    for chunk_start in range(0, file_size, 3_276_800):
        chunk_end = min(chunk_start + 3_276_800, file_size)
        chunk = f.read(3_276_800)
        client.drives.by_drive_id("drive-id").items.by_drive_item_id("parent-id").upload_session(upload_session.upload_url).put(chunk)
```

### Pattern 4: BAD vs GOOD — Error Handling

```python
# ❌ BAD — no error handling, uses hardcoded IDs
client.users.by_user_id("admin@example.com").messages.by_message_id("msg123").delete()

# ✅ GOOD — resilient error handling with retry hint
from msgraph.core.models import APIError

def delete_message(user_id: str, message_id: str) -> bool:
    """Delete a message and return True on success."""
    try:
        client.users.by_user_id(user_id).messages.by_message_id(message_id).delete()
        return True
    except APIError as e:
        if e.response.status_code == 404:
            print(f"Message {message_id} not found — may already be deleted.")
            return False
        if e.response.status_code == 429:
            retry_after = int(e.response.headers.get("Retry-After", "5"))
            print(f"Throttled. Retry after {retry_after}s.")
            raise
        print(f"API error deleting message: {e}")
        raise
```

## Constraints

### MUST DO
- Use environment variables or Azure Key Vault for credentials — never commit tokens
- Always specify `select` to limit returned fields; Graph API returns full objects by default
- Handle `429 Too Many Requests` with `Retry-After` backoff
- Use `filter` server-side for date ranges instead of client-side filtering
- Prefer batch requests for bulk operations (max 20 sub-requests per batch)

### MUST NOT DO
- Use the `/beta` endpoint in production without testing for breaking changes
- Leak `@odata.nextLink` pagination — always iterate through all pages
- Graph API for real-time notifications (use webhooks/subscriptions instead of polling)
- Hardcode tenant IDs or client secrets in source code

## Output Template

Every integration function should expose:

1. **Initialization** — Credential loading and client construction
2. **Operation** — Specific Graph API call with typed parameters
3. **Response Handling** — Pagination loop or single-object return
4. **Error Boundary** — `try/except APIError` with actionable messaging

## Related Skills

| Skill | Purpose |
|