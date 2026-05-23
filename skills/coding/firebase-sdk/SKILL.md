---
name: firebase-sdk
description: Integrates Firebase using firebase-admin 7.x with patterns for Firestore
  CRUD, Realtime Database, Auth (token verification, user management), Cloud Messaging,
  and hosting.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
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
------

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

