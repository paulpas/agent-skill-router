---
name: supabase-sdk
description: Integrates Supabase using supabase-py 2.x with patterns for database
  queries (PostgREST), auth management, storage operations, real-time subscriptions,
  and Edge Functions.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: supabase, supabase-py, postgrest, supabase auth, supabase storage, how
    do i use supabase from python, supabase realtime, edge functions
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
  related-skills: coding-postgresql-sdk, coding-firebase-sdk, coding-authentication-patterns
------

# Supabase Python SDK Integration

Integrates Supabase using `supabase-py` 2.x with patterns for PostgREST database queries, Row-Level Security (RLS), user authentication (email, OAuth, magic link), file storage, real-time subscriptions, and Edge Functions invocation.

## TL;DR Checklist

- [ ] Use `create_client()` with Supabase URL and anon/service role key to initialize
- [ ] Use `supabase.table()` for PostgREST queries — supports `select`, `insert`, `update`, `delete`
- [ ] Use `supabase.auth` for user management — sign up, sign in, session handling
- [ ] Use `supabase.storage` for file uploads and downloads from Supabase Storage
- [ ] Use `supabase.realtime` for subscribing to database changes and broadcast events
- [ ] Use `supabase.functions` for invoking Edge Functions
- [ ] Use RLS policies in Supabase dashboard — never use service_role key in client-side code

