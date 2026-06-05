---




name: firebase-sdk
description: Integrates Firebase using firebase-admin 7.x with patterns for Firestore
  CRUD, Realtime Database, Auth (token verification, user management), Cloud Messaging,
  and hosting.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: firebase, firebase admin, firestore, firebase auth, how do i use firebase
    from python, firebase realtime database, fcm, firebase cloud messaging
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
  related-skills: coding-supabase-sdk, coding-postgresql-sdk, coding-authentication-patterns




---




# Firebase Admin Python SDK Integration

Integrates Firebase using `firebase-admin` 7.x with patterns for Firestore document CRUD and queries, Realtime Database operations, Auth (custom tokens, ID token verification, user management), Firebase Cloud Messaging (FCM) push notifications, and Firebase Storage.

## TL;DR Checklist

- [ ] Use `firebase_admin.initialize_app()` with a service account credentials JSON to start
- [ ] Use `firestore.client()` for Firestore operations (preferred over Realtime DB for structured data)
- [ ] Use `db.reference()` for Realtime Database (preferred for real-time sync and simple data)
- [ ] Use `auth.verify_id_token()` to authenticate requests from client SDKs
- [ ] Use `auth.create_custom_token()` for generating custom auth tokens
- [ ] Use `messaging.send_each()` for batch FCM notifications (not send_all() which is deprecated)
- [ ] Use `bucket()` for Firebase Storage (Cloud Storage) file operations

---

## When to Use

Use this skill when:

- Building server-side logic for Firebase-powered mobile or web applications
- Verifying Firebase ID tokens in your backend API to authenticate users
- Managing Firebase users (create, update, delete, list) from a server environment
- Sending push notifications via Firebase Cloud Messaging (FCM)
- Performing Firestore queries (collections, documents, composite filters, aggregations)
- Managing Realtime Database data with server-side write access
- Working with Firebase Storage buckets for file management
- Implementing custom authentication flows with Firebase Auth

---

## When NOT to Use

- For client-side Firebase operations (use the Firebase client SDKs — JS, Android, iOS)
- When you need complex relational queries with joins (use PostgreSQL instead)
- For applications that don't need Google Cloud integration (use a simpler auth solution)
- For high-throughput analytics queries (use BigQuery)
- When you need full SQL flexibility (Firestore is a NoSQL document store)

---

## Core Workflow

### 1. Initialize Firebase Admin SDK

```python
import firebase_admin
from firebase_admin import credentials, firestore, auth, messaging, db, storage
from firebase_admin.firestore import firestore as firestore_module
from google.cloud.firestore import (
    DocumentSnapshot, CollectionReference, DocumentReference,
    Increment, ArrayUnion, ArrayRemove,
)
import os

# Option A: Service account JSON file
cred = credentials.Certificate("path/to/service-account-key.json")

# Option B: Service account from environment variable
import json
cred = credentials.Certificate(json.loads(os.environ["FIREBASE_SERVICE_ACCOUNT_JSON"]))

firebase_admin.initialize_app(cred, {
    "projectId": "my-firebase-project",
    "databaseURL": "https://my-firebase-project-default-rtdb.firebaseio.com",
    "storageBucket": "my-firebase-project.appspot.com",
})
```

**Checkpoint:** Verify initialization by calling `firebase_admin.get_app()` — it raises `ValueError` if not initialized. Use `firebase_admin.initialize_app()` only once per process; call `firebase_admin.delete_app()` in shutdown hooks.

### 2. Firestore CRUD Operations

```python
def create_user_profile(db: firestore_module.Client, user_id: str, profile: dict) -> DocumentReference:
    """Create or overwrite a user profile document."""
    doc_ref = db.collection("users").document(user_id)
    doc_ref.set({
        **profile,
        "created_at": firestore.SERVER_TIMESTAMP,
        "updated_at": firestore.SERVER_TIMESTAMP,
    })
    return doc_ref

def get_user_profile(db: firestore_module.Client, user_id: str) -> dict | None:
    """Retrieve a user profile document."""
    doc: DocumentSnapshot = db.collection("users").document(user_id).get()
    return doc.to_dict() if doc.exists else None

def update_user_profile(db: firestore_module.Client, user_id: str, updates: dict) -> None:
    """Update specific fields on a user profile."""
    db.collection("users").document(user_id).update({
        **updates,
        "updated_at": firestore.SERVER_TIMESTAMP,
    })

def query_active_users(db: firestore_module.Client, min_age: int = 18, limit: int = 100) -> list[dict]:
    """Query users with composite filters."""
    docs = (
        db.collection("users")
        .where("status", "==", "active")
        .where("age", ">=", min_age)
        .order_by("age", direction=firestore.Query.ASCENDING)
        .limit(limit)
        .stream()
    )
    return [{"id": doc.id, **doc.to_dict()} for doc in docs]
```

**Checkpoint:** Firestore requires composite indexes for queries with multiple `where` clauses. Use `SERVER_TIMESTAMP` for time fields — it uses Google Cloud's clock, not the client's. Use `update()` for partial updates and `set()` with `merge=True` for upserts.

### 3. Authentication — Verify ID Tokens

```python
def verify_firebase_token(id_token: str) -> dict:
    """Verify a Firebase ID token and return decoded claims."""
    try:
        decoded_token = auth.verify_id_token(
            id_token,
            check_revoked=True,  # Checks if the token has been revoked
        )
        return {
            "uid": decoded_token["uid"],
            "email": decoded_token.get("email"),
            "email_verified": decoded_token.get("email_verified", False),
            "phone_number": decoded_token.get("phone_number"),
            "auth_time": decoded_token.get("auth_time"),
        }
    except auth.ExpiredIdTokenError:
        raise PermissionError("Token has expired — client must refresh")
    except auth.RevokedIdTokenError:
        raise PermissionError("Token has been revoked — user may need to re-authenticate")
    except auth.InvalidIdTokenError:
        raise PermissionError("Invalid token format or signature")
```

**Checkpoint:** Always verify tokens on every API request that requires authentication. Set `check_revoked=True` to catch revoked sessions. Cache the public key certificates (`auth.Emulator` for testing) to avoid re-fetching on every call.

### 4. Firebase Cloud Messaging (FCM)

```python
def send_push_notification(
    registration_tokens: list[str],
    title: str,
    body: str,
    data: dict | None = None,
) -> dict:
    """Send push notifications to device tokens."""
    message = messaging.MulticastMessage(
        tokens=registration_tokens,
        notification=messaging.Notification(
            title=title,
            body=body,
        ),
        data={k: str(v) for k, v in (data or {}).items()},
        android=messaging.AndroidConfig(
            priority="high",
            ttl=3600,
        ),
        apns=messaging.APNSConfig(
            payload=messaging.APNSPayload(
                aps=messaging.Aps(
                    sound="default",
                    badge=1,
                    content_available=True,
                ),
            ),
        ),
    )

    response = messaging.send_each_for_multicast(message)
    return {
        "success_count": response.success_count,
        "failure_count": response.failure_count,
        "invalid_tokens": [
            tokens[idx]
            for idx, resp in enumerate(response.responses)
            if isinstance(resp.exception, messaging.UnregisteredError)
        ],
    }
```

**Checkpoint:** FCM registration tokens expire. Track `UnregisteredError` responses and remove invalid tokens from your database. Use `send_each_for_multicast()` for batch sends (up to 500 tokens per call).

---

## Implementation Patterns

### Pattern 1: Custom Token Generation

```python
def create_custom_auth_token(uid: str, claims: dict | None = None) -> str:
    """Create a custom Firebase token for your own auth system."""
    custom_token = auth.create_custom_token(
        uid,
        developer_claims=claims,
    )
    return custom_token.decode("utf-8") if isinstance(custom_token, bytes) else custom_token
```

### Pattern 2: User Management

```python
def list_all_users(max_results: int = 100) -> list[dict]:
    """List all Firebase Auth users with pagination."""
    users = []
    page = auth.list_users(max_results=max_results)
    while page:
        for user in page.users:
            users.append({
                "uid": user.uid,
                "email": user.email,
                "disabled": user.disabled,
                "created_at": user.user_metadata.creation_timestamp,
            })
        page = page.get_next_page()
    return users

def delete_inactive_users(inactive_uids: list[str]) -> dict:
    """Batch delete inactive users."""
    result = auth.delete_users(inactive_uids)
    return {
        "success_count": len(result.success_count),
        "failure_count": len(result.errors),
        "errors": [(err.index, err.reason) for err in result.errors],
    }
```

### Pattern 3: Firestore Aggregation Query

```python
def count_active_users_by_region(db: firestore_module.Client, region: str) -> int:
    """Count active users in a region using a composite query."""
    query = (
        db.collection("users")
        .where("status", "==", "active")
        .where("region", "==", region)
    )
    # Firestore count() aggregation (requires Firebase Rules index)
    from google.cloud.firestore import aggregation
    result = query.count().get()
    return result[0].value if result else 0
```

### BAD vs GOOD: Token Verification

```python
# ❌ BAD — No token verification, trusting client UID directly
def delete_user_bad(uid: str):
    auth.delete_user(uid)  # Anyone can call this!

# ✅ GOOD — Verify the token first, then check the UID matches
def delete_user_good(id_token: str, target_uid: str):
    claims = verify_firebase_token(id_token)
    if claims["uid"] != target_uid and "admin" not in claims.get("role", []):
        raise PermissionError("Cannot delete other users")
    auth.delete_user(target_uid)
```

### BAD vs GOOD: Firestore Writes

```python
# ❌ BAD — Overwriting entire document instead of updating fields
def update_email_bad(db, uid: str, new_email: str):
    doc = db.collection("users").document(uid).get()
    data = doc.to_dict()
    data["email"] = new_email
    db.collection("users").document(uid).set(data)  # Loses any new fields!

# ✅ GOOD — Partial update with update()
def update_email_good(db, uid: str, new_email: str):
    db.collection("users").document(uid).update({
        "email": new_email,
        "email_verified": False,
        "updated_at": firestore.SERVER_TIMESTAMP,
    })
```

---

## Constraints

### MUST DO
- Verify Firebase ID tokens on every authenticated backend request — never trust client-supplied UIDs
- Use `check_revoked=True` in `verify_id_token()` to detect session revocation
- Use `firestore.SERVER_TIMESTAMP` for all timestamp fields — prevents clock skew issues
- Use `update()` for partial Firestore document updates — not `set()` overwrite
- Handle `UnregisteredError` in FCM responses and remove invalid tokens
- Store FCM registration tokens in Firestore with a TTL/cleanup strategy
- Use composite indexes for Firestore queries with multiple `where` clauses

### MUST NOT DO
- Never use the Admin SDK on client devices — it has full access to all Firebase services
- Do not generate custom tokens without verifying the end-user's identity first
- Avoid `send_all()` for FCM — it's deprecated in favor of `send_each()` and `send_multicast()`
- Never expose service account credentials in version control, client code, or logs
- Do not write Firestore documents with client-supplied timestamps — use `SERVER_TIMESTAMP`
- Avoid deeply nested Firestore collections (>2 levels) — they affect query performance

---

## Output Template

When writing Firebase Admin SDK integration code, structure your output as:

1. **Initialization** — firebase_admin.initialize_app() with credentials and config
2. **Service Client** — firestore.client(), auth, messaging, db (Realtime), or bucket()
3. **Authentication** — Verify ID token or check custom claims before any user operation
4. **Operation** — Firestore CRUD, FCM send, or Auth user management
5. **Error Handling** — Catch firebase_admin.exceptions subclasses (UnauthenticatedError, NotFoundError, etc.)

---

## Related Skills

| Skill | Purpose |
|---|---|
| `coding-supabase-sdk` | Supabase BaaS patterns (alternative to Firebase) |
| `coding-postgresql-sdk` | Direct PostgreSQL patterns (alternative to Firestore) |
| `coding-authentication-patterns` | Auth flow patterns (JWTs, sessions, OAuth) |

---

## Live References

- [Firebase Admin Python SDK Docs](https://firebase.google.com/docs/reference/admin/python) — Official firebase-admin API reference
- [Firestore Python Client](https://googleapis.dev/python/firestore/latest/) — Firestore document operations
- [Firebase Auth Admin API](https://firebase.google.com/docs/auth/admin) — User management and token verification
- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging) — FCM notification sending
- [Firebase Admin SDK Setup](https://firebase.google.com/docs/admin/setup) — Initialization and configuration
- [Firebase Auth Emulator](https://firebase.google.com/docs/emulator-suite) — Local testing without production Firebase
- [Firebase Admin Python GitHub](https://github.com/firebase/firebase-admin-python) — Source code and release notes
