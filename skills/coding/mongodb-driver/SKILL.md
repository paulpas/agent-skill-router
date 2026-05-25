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

---

## When to Use

Use this skill when:

- Building Python applications that store or query JSON-like documents in MongoDB
- Implementing aggregation pipelines for analytics, reporting, or data transformations
- Reacting to real-time data changes with MongoDB change streams
- Managing indexes and schema validation in MongoDB collections
- Building search functionality with MongoDB Atlas Search
- Connecting to MongoDB replica sets or sharded clusters from Python

---

## When NOT to Use

- For strongly relational data with complex joins (use PostgreSQL)
- When you need ACID transactions across multiple documents (MongoDB 4.0+ supports it, but RDBMS is safer)
- For in-memory caching (use Redis instead)
- For full-text search at scale (use Elasticsearch instead)

---

## Core Workflow

### 1. Connect to MongoDB

```python
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError
from pymongo.read_preferences import ReadPreference

# Single instance or replica set connection string
client: MongoClient = MongoClient(
    "mongodb://user:pass@localhost:27017,mongodb2:27017/?replicaSet=rs0",
    serverSelectionTimeoutMS=5000,
    connectTimeoutMS=3000,
    appname="myapp",
)

# Verify connectivity
try:
    client.admin.command("ping")
except ServerSelectionTimeoutError:
    raise RuntimeError("Cannot connect to MongoDB cluster")
```

**Checkpoint:** Always verify connectivity with `admin.command("ping")` at startup. Catch `ServerSelectionTimeoutError` to fail fast on misconfigured connections.

### 2. Select Database and Collection

```python
db = client["my_database"]           # Database reference (lazy — created on first write)
collection = db["my_collection"]      # Collection reference (lazy)
```

**Checkpoint:** Use dot-notation only for well-known names. Use bracket notation `["name-with-dashes"]` for names with special characters.

### 3. CRUD Operations

```python
from datetime import datetime, UTC
from bson.objectid import ObjectId
from typing import Any

# CREATE — Insert one or many documents
def create_user(collection, user_data: dict) -> str:
    """Insert a user document and return its _id."""
    doc = {
        **user_data,
        "created_at": datetime.now(UTC),
        "updated_at": datetime.now(UTC),
        "status": "active",
    }
    result = collection.insert_one(doc)
    return str(result.inserted_id)

def create_users_bulk(collection, users: list[dict]) -> list[str]:
    """Bulk insert users. Raises on first error by default."""
    result = collection.insert_many(users, ordered=False)
    return [str(id_) for id_ in result.inserted_ids]

# READ — Find documents with query filter
def find_active_users(collection, page: int = 1, page_size: int = 20) -> list[dict]:
    """Find active users with pagination."""
    cursor = collection.find(
        {"status": "active"},
        {"password": 0},  # Exclude sensitive fields
    ).sort("created_at", -1).skip((page - 1) * page_size).limit(page_size)
    return list(cursor)

# UPDATE — Atomic update with operators
def update_user_email(collection, user_id: str, new_email: str) -> bool:
    """Update a user's email. Returns True if modified."""
    result = collection.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"email": new_email, "updated_at": datetime.now(UTC)}},
    )
    return result.modified_count > 0

# DELETE — Remove documents
def deactivate_user(collection, user_id: str) -> bool:
    """Soft-delete a user. Returns True if found."""
    result = collection.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"status": "deleted", "deleted_at": datetime.now(UTC)}},
    )
    return result.modified_count > 0
```

**Checkpoint:** Use `$set` for partial updates — never replace entire documents. Use `ordered=False` in `insert_many` to continue on duplicate key errors.

### 4. Aggregation Pipeline

Use the aggregation pipeline for complex transformations — never filter in Python.

```python
def user_engagement_stats(collection, days: int = 30) -> list[dict]:
    """Compute per-user engagement stats over a time window."""
    pipeline = [
        {"$match": {"created_at": {"$gte": datetime.now(UTC) - __import__("datetime").timedelta(days=days)}}},
        {"$group": {
            "_id": "$user_id",
            "total_actions": {"$sum": 1},
            "unique_sessions": {"$addToSet": "$session_id"},
            "last_active": {"$max": "$created_at"},
        }},
        {"$addFields": {
            "session_count": {"$size": "$unique_sessions"},
        }},
        {"$sort": {"total_actions": -1}},
        {"$limit": 100},
        {"$project": {
            "user_id": "$_id",
            "total_actions": 1,
            "session_count": 1,
            "last_active": 1,
            "_id": 0,
        }},
    ]
    return list(collection.aggregate(pipeline))
```

**Checkpoint:** Use `$match` as the first stage to limit documents flowing through the pipeline. Use `$project` at the end to shape output. Avoid `$unwind` on large arrays without `$match` filtering first.

---

## Implementation Patterns

### Pattern 1: Change Streams for Real-Time Events

```python
def watch_collection(collection, resume_token: bytes | None = None):
    """Continuously listen for document changes."""
    pipeline = [
        {"$match": {"operationType": {"$in": ["insert", "update", "replace"]}}},
    ]
    with collection.watch(pipeline, resume_after=resume_token) as stream:
        for change in stream:
            process_change(change)
            resume_token = stream.resume_token  # Save for resuming
```

### Pattern 2: Bulk Write Operations

```python
from pymongo import UpdateOne, DeleteOne, InsertOne

def sync_products(collection, products: list[dict]) -> dict:
    """Bulk upsert and delete products in a single batch."""
    operations = []
    for product in products:
        if product.get("_delete"):
            operations.append(DeleteOne({"_id": product["_id"]}))
        else:
            operations.append(UpdateOne(
                {"sku": product["sku"]},
                {"$set": product},
                upsert=True,
            ))

    if not operations:
        return {"matched": 0, "modified": 0, "upserted": 0}

    result = collection.bulk_write(operations, ordered=False)
    return {
        "matched": result.matched_count,
        "modified": result.modified_count,
        "upserted": len(result.upserted_ids),
    }
```

### Pattern 3: Atlas Search with PyMongo

```python
def search_products(collection, query: str, limit: int = 20) -> list[dict]:
    """Full-text search using Atlas Search index."""
    pipeline = [
        {"$search": {
            "index": "products_search",
            "text": {
                "query": query,
                "path": {"wildcard": "*"},
                "fuzzy": {"maxEdits": 1},
            },
        }},
        {"$limit": limit},
        {"$project": {"score": {"$meta": "searchScore"}, "name": 1, "description": 1}},
    ]
    return list(collection.aggregate(pipeline))
```

### BAD vs GOOD: Query Patterns

```python
# ❌ BAD — Client-side filtering (pulls all documents into memory)
def find_expensive_products_bad(collection):
    all_products = list(collection.find())
    return [p for p in all_products if p.get("price", 0) > 100]

# ✅ GOOD — Server-side filter with index
def find_expensive_products_good(collection):
    return list(collection.find({"price": {"$gt": 100}}).sort("price", 1))
```

### BAD vs GOOD: Index Creation

```python
# ❌ BAD — No index hint, unoptimized query
def lookup_by_email_bad(collection, email: str):
    return collection.find_one({"email": email})

# ✅ GOOD — Ensure index exists, then query
def lookup_by_email_good(collection, email: str):
    collection.create_index("email", background=True, unique=True)
    return collection.find_one({"email": email})
```

---

## Constraints

### MUST DO
- Create indexes for all fields used in `find()`, `sort()`, and `$match` aggregation stages
- Use `insert_many()` with `ordered=False` for bulk inserts — continues on duplicate key errors
- Use `$set` for partial document updates instead of replacing the entire document
- Set `serverSelectionTimeoutMS` to a reasonable value (5-10s) to fail fast on connection issues
- Use `read_preference=SECONDARY_PREFERRED` for analytics/aggregation workloads
- Set `appname` in `MongoClient` for identifying your application in server logs

### MUST NOT DO
- Never iterate `collection.find()` without limits — can pull millions of documents into memory
- Do not use `find_one_and_delete()` without understanding its write concern implications
- Avoid updating the `_id` field — it is immutable after insertion
- Never store passwords or secrets in plain text — use encryption or hashing
- Do not use `eval()` or `$where` — they bypass query optimizer and prevent index use

---

## Output Template

When writing MongoDB integration code, structure your output as:

1. **Client Initialization** — MongoClient with connection string, timeouts, read preference
2. **Collection Access** — Database and collection references
3. **CRUD Operation** — With proper error handling (`PyMongoError` subclasses)
4. **Resource Cleanup** — `client.close()` in shutdown hooks or context managers
5. **Index Management** — `create_index()` calls for query performance

---

## Related Skills

| Skill | Purpose |
|---|---|
| `coding-postgresql-sdk` | Relational database SDK patterns for comparison |
| `coding-elasticsearch-sdk` | Search and aggregation SDK patterns |
| `coding-asyncio-patterns` | Async patterns compatible with motor (async MongoDB driver) |

---

## Live References

- [PyMongo Documentation](https://pymongo.readthedocs.io/en/stable/) — Official PyMongo 4.x documentation
- [MongoDB Python Driver Docs](https://www.mongodb.com/docs/drivers/python/) — MongoDB official driver portal
- [PyMongo Aggregation Guide](https://pymongo.readthedocs.io/en/stable/examples/aggregation.html) — Aggregation pipeline examples
- [Change Streams Documentation](https://www.mongodb.com/docs/manual/changeStreams/) — Real-time data change tracking
- [MongoDB Atlas Search](https://www.mongodb.com/docs/atlas/atlas-search/) — Full-text search on Atlas
- [PyMongo Bulk Write API](https://pymongo.readthedocs.io/en/stable/examples/bulk.html) — Bulk write operation patterns
- [Connection String URI Format](https://www.mongodb.com/docs/manual/reference/connection-string/) — Standard MongoDB connection string reference
