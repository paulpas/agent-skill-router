---
name: dropbox-api
description: Integrates with Dropbox API to manage files, folders, sharing, Paper
  documents, and Sign requests using the official dropbox Python SDK v12.
license: MIT
compatibility: opencode
metadata:
version: "1.0.0"
  domain: coding
  triggers: dropbox api, dropbox python, dropbox files, dropbox sharing, dropbox paper,
    dropbox sign, dropbox sdk
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
  related-skills: coding-box-api, coding-microsoft-graph-api, coding-google-workspace-api
---

# Dropbox API Integration

Integrates with the Dropbox API v2 to manage files and folders, sharing settings and links, Paper documents, Dropbox Sign signature requests, file requests, backups, and team administration using the official `dropbox` Python SDK.

## TL;DR for Code Generation

- Use `dropbox.Dropbox(oauth2_access_token)` with a short-lived access token + refresh flow; or `dropbox.Dropbox(app_key, app_secret, oauth2_refresh_token)` for long-running server apps
- The SDK uses a functional API pattern: `dbx.files_upload()`, `dbx.files_list_folder()`, `dbx.sharing_create_shared_link_with_settings()`
- All list operations use cursors for pagination: `dbx.files_list_folder_continue(cursor)`
- Use `files_upload_session_*` for files larger than 150 MB
- Paths are case-sensitive and must start with `/` (root) — Dropbox uses lowercase paths by convention
- Handle `dropbox.exceptions.ApiError` with `.error` and `.user_message_text` for structured errors

## When to Use

Use this skill when:

- Uploading, downloading, moving, copying, or restoring files and folders
- Creating and managing shared links with permissions and expiration
- Managing folder and file sharing with specific users and groups
- Reading and creating Dropbox Paper documents
- Sending signature requests via Dropbox Sign (formerly HelloSign)
- Creating file requests for receiving files from external users
- Monitoring file changes via webhooks and listing file revisions
- Backing up application data to Dropbox

## When NOT to Use

- Real-time collaborative editing (use Dropbox Paper or Office Online integration)
- High-resolution image/video streaming (use Dropbox's native media players or a CDN)
- Anonymous public access (shared links require authentication-free toggle, but API always authenticates)
- Replacing a full CMS for web content delivery (Dropbox is a file sync platform, not a web server)

## Core Workflow

1. **Create a Dropbox App** — Go to `https://www.dropbox.com/developers/apps` and create an app with "Full Dropbox" or "App Folder" access type. Choose "Scoped Access" for granular permissions. **Checkpoint:** Copy the App key and App secret from the app console.

2. **Generate an Access Token** — For testing, generate a short-lived token from the app console. For production, implement OAuth 2.0 PKCE flow or use a refresh token. **Checkpoint:** Verify the token with `dbx.users_get_current_account()`.

3. **Initialize the Client** — `dbx = dropbox.Dropbox(oauth2_refresh_token=refresh_token, app_key=key, app_secret=secret)` for server apps, or `dbx = dropbox.Dropbox(access_token)` for short-lived tokens. **Checkpoint:** Call `dbx.users_get_current_account()` and print the `name.display_name`.

4. **Choose an Operation** — File operations: `dbx.files_upload()`, `dbx.files_download()`, `dbx.files_list_folder()`, `dbx.files_move_v2()`. Sharing: `dbx.sharing_create_shared_link_with_settings()`. **Checkpoint:** Verify the operation returns the expected result type (e.g., `FileMetadata`).

5. **Paginate Folder Listings** — Use `dbx.files_list_folder(path, recursive=False)` to get the first page and a cursor. Call `dbx.files_list_folder_continue(cursor)` in a loop until `cursor` is `None`. **Checkpoint:** Verify `result.has_more` before continuing.

6. **Handle Errors** — Wrap in `try/except dropbox.exceptions.ApiError`. Access `e.error` for the structured error object and `e.user_message_text` for human-readable details. **Checkpoint:** Log `e.error.get_path().tag` for path-related errors to identify the root cause.

## Implementation Patterns

### Pattern 1: Upload a File

```python
import os
import dropbox
from dropbox import files, exceptions

dbx = dropbox.Dropbox(
    app_key=os.environ["DROPBOX_APP_KEY"],
    app_secret=os.environ["DROPBOX_APP_SECRET"],
    oauth2_refresh_token=os.environ["DROPBOX_REFRESH_TOKEN"],
)

def upload_file(local_path: str, dropbox_path: str) -> files.FileMetadata:
    """Upload a file to Dropbox with autorename on conflict."""
    try:
        with open(local_path, "rb") as f:
            content = f.read()
        metadata = dbx.files_upload(
            content,
            dropbox_path,
            mode=files.WriteMode("add"),
            autorename=True,
            mute=True,  # don't notify users
        )
        return metadata
    except exceptions.ApiError as e:
        if e.error.is_path():
            print(f"Path error: {e.error.get_path().tag}")
        raise

result = upload_file("/tmp/backup.sql", "/backups/daily/2026-05-23.sql")
print(f"Uploaded rev {result.rev} at {result.size} bytes")
```

### Pattern 2: List and Download Files

```python
def download_latest_backup(backup_folder: str, local_dir: str) -> str | None:
    """Download the most recent file from a Dropbox folder."""
    try:
        result = dbx.files_list_folder(backup_folder)
        entries = sorted(result.entries, key=lambda e: e.server_modified, reverse=True)
        if not entries:
            print("No files found.")
            return None

        latest = entries[0]
        metadata, response = dbx.files_download(latest.path_lower)
        local_path = os.path.join(local_dir, latest.name)
        with open(local_path, "wb") as f:
            f.write(response.content)
        print(f"Downloaded {latest.name} ({latest.size} bytes)")
        return local_path
    except exceptions.ApiError as e:
        print(f"Download error: {e.user_message_text}")
        return None

download_latest_backup("/backups/daily", "/tmp/restore")
```

### Pattern 3: Create a Shared Link

```python
from dropbox import sharing

def create_shared_link(path: str, expires: str | None = None) -> str:
    """Create a shared link for a Dropbox file or folder."""
    try:
        settings = sharing.LinkSettings(
            require_password=False,
            expires=expires,
            link_access_level=sharing.RequestedLinkAccessLevel("viewer"),
        )
        result = dbx.sharing_create_shared_link_with_settings(
            path=path,
            settings=settings,
        )
        return result.url
    except exceptions.ApiError as e:
        if e.error.is_shared_link_already_exists():
            # Link already exists — list existing links
            links = dbx.sharing_list_shared_links(path=path)
            if links.links:
                return links.links[0].url
        raise

url = create_shared_link("/reports/q1-2026.pdf", expires="2026-12-31T23:59:59Z")
print(f"Shared link: {url}")
```

### Pattern 4: Search Files

```python
def search_files(query: str, max_results: int = 20) -> list[dict]:
    """Search for files in Dropbox by name."""
    try:
        result = dbx.files_search_v2(
            query=query,
            options=files.SearchOptions(max_results=max_results, order_by="relevance"),
        )
        matches = []
        for match in result.matches:
            metadata = match.metadata.get_metadata()
            matches.append({
                "name": metadata.name,
                "path": metadata.path_lower,
                "type": "folder" if isinstance(metadata, files.FolderMetadata) else "file",
            })
        return matches
    except exceptions.ApiError as e:
        print(f"Search error: {e.user_message_text}")
        return []

results = search_files("quarterly report")
for r in results:
    print(f"[{r['type']}] {r['path']}")
```

### Pattern 5: BAD vs GOOD — Error Handling

```python
# ❌ BAD — catches generic Exception, loses structured error info
try:
    dbx.files_upload(data, "/target/file.txt")
except Exception as e:
    print(f"Upload failed: {e}")

# ✅ GOOD — typed ApiError with path-level diagnostics
def safe_upload(dbx_client, content: bytes, path: str) -> files.FileMetadata | None:
    """Upload with typed error recovery."""
    try:
        return dbx_client.files_upload(
            content, path,
            mode=files.WriteMode("add"),
        )
    except exceptions.ApiError as e:
        if e.error.is_path():
            path_err = e.error.get_path()
            print(f"Path error: {path_err.tag} ({path_err.get_value()})")
        elif e.error.is_rate_limit():
            retry_after = e.error.get_rate_limit().retry_after
            print(f"Rate limited — retry after {retry_after} seconds")
        else:
            print(f"Dropbox error: {e.user_message_text}")
        return None
```

## Constraints

### MUST DO
- Use refresh tokens for server-side apps — short-lived tokens expire after 4 hours
- Always handle `WriteMode` explicitly — use `"add"` with `autorename=True` to avoid overwrites
- Paginate folder listings with `files_list_folder_continue()` — never assume single page
- Use upload sessions for files larger than 150 MB
- Check `has_more` flag before continuing pagination loops
- Use `path_lower` consistently — Dropbox paths are case-insensitive but API returns lowercase

### MUST NOT DO
- Hardcode access tokens in source code — use env vars or a secrets manager
- Assume all entries in `files_list_folder` are files — check `.is_file()` or `.is_folder()`
- Poll for file changes — use webhooks with `files_list_folder_longpoll()` instead
- Upload without checking available quota (`dbx.users_get_space_usage()`)
- Use root `/` path for app-folder-scoped apps (they only have access to the app folder)

## Output Template

Every integration function should expose:

1. **Client Initialization** — `Dropbox(app_key, app_secret, oauth2_refresh_token)` from env
2. **Resource Path** — Dropbox path starting with `/` (or `/Apps/AppName` for App Folder apps)
3. **Operation** — Upload, download, share, search, or list with typed params
4. **Pagination** — `files_list_folder` → `files_list_folder_continue` loop
5. **Error Handling** — `try/except ApiError` with `.error` structure parsing

## Related Skills

| Skill | Purpose |
|