---
name: mongodb-driver
description: Integrates MongoDB using PyMongo 4.x with patterns for CRUD operations,
  aggregation pipelines, change streams, Atlas Search, and replica set connections.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: mongodb, pymongo, mongo aggregation, change streams, mongodb atlas, how
    do i query mongodb from python, document database, bson
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
  related-skills: coding-postgresql-sdk, coding-elasticsearch-sdk, coding-asyncio-patterns
------

# MongoDB Python Driver (PyMongo) Integration

Integrates MongoDB using `PyMongo` 4.x — the official MongoDB Python driver — with patterns for CRUD operations, aggregation pipelines, change streams, Atlas Search queries, index management, replica set connections, and bulk writes.

## TL;DR Checklist

- [ ] Use `pymongo.MongoClient` with connection string for all connections
- [ ] Use `aggregate()` for complex queries — never chain multiple `find()` calls client-side
- [ ] Use `insert_many()`, `bulk_write()` for batch operations — never loop `insert_one()`
- [ ] Use `watch()` for change streams on replica sets / Atlas
- [ ] Use `create_index()` with background=True for production index builds
- [ ] Always set `read_preference=SECONDARY_PREFERRED` for analytics queries
- [ ] Use `bson.ObjectId` for `_id` fields — never use plain strings

