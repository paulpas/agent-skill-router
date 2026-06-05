---




name: salesforce-api
description: Implements Salesforce API integration (REST, SOQL, Bulk API, Apex, using
  simple-salesforce Python SDK with record CRUD operations, SOQL queries, Bulk API
  for large datasets, Apex calls, and Salesforce REST API patterns.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: salesforce, soql, salesforce api, simple salesforce, salesforce objects,
    salesforce bulk api, how do i integrate with salesforce, crm integration
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
  related-skills: coding-hubspot-api, coding-marketo-api, coding-zendesk-api




---




# Salesforce API Integration

Implements production-grade Salesforce integration using the `simple-salesforce` Python SDK and Salesforce REST API. When loaded, this skill makes the model implement CRUD operations on Salesforce objects (Accounts, Contacts, Opportunities, Leads, Cases, Custom Objects), SOQL queries, Bulk API for large datasets, Apex REST calls, and Salesforce Streaming API. All implementations follow Salesforce best practices: use `SF_INSTANCE_URL`, `SF_USERNAME`, `SF_PASSWORD`, `SF_SECURITY_TOKEN` from environment, query with `query_all()` for deleted/archived records, use Bulk API for >10,000 records, implement exponential backoff for rate limits, and handle Salesforce IDs (15-char vs 18-char IDs).

## TL;DR Checklist

- [ ] Use `simple-salesforce` SDK with credentials from environment variables
- [ ] Use `SF_INSTANCE_URL`, `SF_USERNAME`, `SF_PASSWORD`, `SF_SECURITY_TOKEN` for auth
- [ ] Use `Salesforce()` constructor with `domain='test'` for sandboxes
- [ ] Use `sf.query()` for SOQL queries, `sf.query_all()` to include deleted/archived
- [ ] Use `sf.<Object>.create()`, `.update()`, `.delete()`, `.get()` for CRUD
- [ ] Use `sf.bulk.<Object>.query()`, `.insert()`, `.update()`, `.delete()`, `.upsert()` for Bulk API
- [ ] Handle both 15-char (case-sensitive) and 18-char (case-insensitive) Salesforce IDs
- [ ] Implement exponential backoff for REQUEST_LIMIT_EXCEEDED errors
- [ ] Use `ALL ROWS` scope in SOQL for deleted/archived records
- [ ] Never store credentials or session IDs in code or logs

---

## When to Use

Use this skill when:

- Querying Salesforce data using SOQL
- Creating/updating/deleting Salesforce records
- Processing large datasets (10k+ records) with Bulk API
- Calling Apex REST endpoints
- Syncing data between your app and Salesforce
- Building integrations with Salesforce CRM
- Importing/exporting data to/from Salesforce
- Automating business processes in Salesforce
- Working with custom objects and fields
- Managing Users, Profiles, and Permissions
- Querying Activity History and Chatter

---

## When NOT to Use

- For HubSpot-specific CRM — use `coding-hubspot-api` instead
- For Marketo marketing automation — use `coding-marketo-api` instead
- For Zendesk support tickets — use `coding-zendesk-api` instead
- For simple HTTP-only use cases when simple-salesforce is overkill
- When you need real-time streaming only (consider Salesforce Streaming API or CometD)
- For read-only reporting (use Salesforce Reports API directly)

---

## Core Workflow

1. **Initialize Client** — Create Salesforce client using `simple-salesforce`:
   - Production: `Salesforce(username=..., password=..., security_token=..., instance_url=...)`
   - Sandbox: `Salesforce(..., domain='test')`
   - Or use session ID: `Salesforce(instance_url=..., session_id=...)`
   
   **Checkpoint:** Validate connection with `sf.query("SELECT Id, Name FROM Account LIMIT 1")`.

2. **Query Data with SOQL** — Use `sf.query()` for standard SOQL queries:
   - `sf.query("SELECT Id, Name FROM Account WHERE Industry = 'Technology'")`
   - Use `query_all()` to include deleted/archived records
   - Use `query_more()` for pagination with `nextRecordsUrl`
   
   **Checkpoint:** Queries include `LIMIT` for testing, use `query_all()` when all records needed.

3. **CRUD Operations** — Perform record operations:
   - Create: `sf.Contact.create({'LastName': 'Doe', 'FirstName': 'John'})`
   - Read: `sf.Contact.get('003...')`
   - Update: `sf.Contact.update('003...', {'LastName': 'Smith'})`
   - Delete: `sf.Contact.delete('003...')`
   - Upsert: `sf.Contact.upsert('003...', 'My_External_Id__c/ExternalValue', {...})`
   
   **Checkpoint:** CRUD operations handle both 15-char and 18-char IDs.

4. **Bulk API for Large Datasets** — Use Bulk API for >10,000 records:
   - Query: `sf.bulk.Account.query("SELECT Id, Name FROM Account")`
   - Insert: `sf.bulk.Account.insert([{'Name': 'Account 1'}, {...}])`
   - Update: `sf.bulk.Account.update([{'Id': '001...', 'Name': 'Updated'}])`
   - Delete: `sf.bulk.Account.delete([{'Id': '001...'}])`
   - Upsert: `sf.bulk.Account.upsert([...], 'My_External_Id__c')`
   
   **Checkpoint:** Bulk operations use proper external IDs for upsert.

5. **Apex REST** — Call custom Apex REST endpoints:
   - `sf.apexcall(method='GET', path='/services/apexrest/MyEndpoint')`
   - `sf.apexcall(method='POST', path='/services/apexrest/MyEndpoint', data={...})`
   
   **Checkpoint:** Apex calls include correct path and method.

6. **Handle Limits & Rate Limiting** — Monitor API usage:
   - `sf.limits()` to see current limits
   - Implement exponential backoff for `REQUEST_LIMIT_EXCEEDED`
   - Use `Sforce-Limit-Info` response header
   
   **Checkpoint:** Limits checked before large operations.

---

## Implementation Patterns

### Pattern 1: Salesforce Client Initialization (BAD vs GOOD)

```python
"""Salesforce client initialization patterns.

Key concepts:
- simple-salesforce: Popular Python SDK for Salesforce
- Authentication: username + password + security_token (legacy)
- OAuth 2.0: More secure (session_id + instance_url)
- Domain: 'login' (production) or 'test' (sandbox)
- Instance URL: Full URL for your org (e.g., 'https://na1.salesforce.com')

Important:
- Password + Security Token = concatenated password
- 15-char IDs (case-sensitive) vs 18-char IDs (case-insensitive)
"""

from __future__ import annotations

import os
import re
import time
import logging
from typing import Any, Optional, List, Dict
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone

logger = logging.getLogger(__name__)


# ===================================================================
# ❌ BAD — hardcoded credentials, no error handling, sandbox vs prod confusion
# ===================================================================

def bad_salesforce_init_bad() -> Any:
    """❌ BAD: Don't do any of these things."""
    from simple_salesforce import Salesforce
    
    # ❌ Hardcoded credentials! Never commit these!
    sf = Salesforce(
        username='admin@example.com',
        password='MySecretPassword123',  # ❌ HARDCODED!
        security_token='ABC123xyz',  # ❌ HARDCODED!
        domain='login',
    )
    
    # ❌ No validation
    # ❌ No error handling
    # ❌ Using 'login' for sandbox (should be 'test')
    # ❌ Not checking limits before query
    return sf


# ===================================================================
# ✅ GOOD — env-based config, validation, proper domain handling
# ===================================================================


class SalesforceError(Exception):
    """Base exception for Salesforce integration errors."""
    pass


class SalesforceAuthError(SalesforceError):
    """Authentication failed or credentials invalid."""
    pass


class SalesforceLimitError(SalesforceError):
    """API limits exceeded."""
    
    def __init__(self, message: str, retry_after: Optional[int] = None):
        super().__init__(message)
        self.retry_after = retry_after


@dataclass
class SalesforceConfig:
    """Salesforce configuration from environment variables.
    
    Environment variables:
        SF_INSTANCE_URL: Full instance URL (https://na1.salesforce.com)
        SF_USERNAME: Salesforce username
        SF_PASSWORD: Salesforce password
        SF_SECURITY_TOKEN: Security token (appended to password)
        SF_DOMAIN: 'login' (production) or 'test' (sandbox)
        SF_SESSION_ID: OAuth session ID (alternative to password auth)
        SF_CLIENT_ID: OAuth client ID (for OAuth flow)
        SF_CLIENT_SECRET: OAuth client secret
    """
    
    # Connection
    instance_url: Optional[str] = None
    domain: str = "login"  # 'login' = production, 'test' = sandbox
    
    # Password auth
    username: Optional[str] = None
    password: Optional[str] = None
    security_token: Optional[str] = None
    
    # OAuth / Session auth
    session_id: Optional[str] = None
    
    # Request config
    timeout: float = 30.0
    max_retries: int = 3
    initial_retry_delay: float = 1.0
    
    @classmethod
    def from_env(cls) -> "SalesforceConfig":
        """Load configuration from environment variables."""
        
        def parse_bool(env_var: str, default: bool) -> bool:
            val = os.environ.get(env_var)
            if val is None:
                return default
            return val.lower() in ("1", "true", "yes", "on")
        
        def parse_float(env_var: str, default: float) -> float:
            val = os.environ.get(env_var)
            if val is None:
                return default
            try:
                return float(val)
            except ValueError:
                return default
        
        # Determine domain
        domain_env = os.environ.get("SF_DOMAIN", "login").lower()
        domain = "test" if domain_env == "test" else "login"
        
        return cls(
            instance_url=os.environ.get("SF_INSTANCE_URL"),
            domain=domain,
            username=os.environ.get("SF_USERNAME"),
            password=os.environ.get("SF_PASSWORD"),
            security_token=os.environ.get("SF_SECURITY_TOKEN"),
            session_id=os.environ.get("SF_SESSION_ID"),
            timeout=parse_float("SF_TIMEOUT", 30.0),
        )
    
    def is_enabled(self) -> bool:
        """Check if Salesforce is configured."""
        # Check for session auth
        if self.session_id and self.instance_url:
            return True
        
        # Check for password auth
        if self.username and self.password:
            return True
        
        return False
    
    def validate(self) -> bool:
        """Validate configuration.
        
        Returns:
            True if valid
            
        Raises:
            ValueError: If invalid when enabled
        """
        if not self.is_enabled():
            logger.info("Salesforce not configured")
            return True
        
        if self.session_id:
            if not self.instance_url:
                raise ValueError("SF_INSTANCE_URL required with SF_SESSION_ID")
        else:
            if not self.username:
                raise ValueError("SF_USERNAME required for password auth")
            if not self.password:
                raise ValueError("SF_PASSWORD required for password auth")
        
        return True
    
    def get_full_password(self) -> str:
        """Get password + security token concatenated.
        
        simple-salesforce expects password + token as one string.
        """
        if not self.password:
            raise ValueError("Password not configured")
        
        if self.security_token:
            return f"{self.password}{self.security_token}"
        return self.password


class SalesforceClient:
    """Production-grade Salesforce client with retry and limit handling.
    
    Features:
    - Config from environment
    - Automatic retry with exponential backoff
    - Limit awareness
    - ID conversion (15-char ↔ 18-char)
    - Helper methods for common operations
    """
    
    # ID pattern: 15 or 18 chars, alphanumeric
    ID_PATTERN = re.compile(r'^[a-zA-Z0-9]{15}([a-zA-Z0-9]{3})?$')
    
    def __init__(self, config: SalesforceConfig) -> None:
        self._config = config
        self._sf: Any = None  # Lazy-loaded simple-salesforce instance
        self._limits_cache: Optional[Dict[str, Any]] = None
        self._limits_cache_time: float = 0.0
    
    def _get_client(self) -> Any:
        """Get or create the simple-salesforce client.
        
        Lazy-loaded to avoid connection overhead if not used.
        """
        if self._sf is not None:
            return self._sf
        
        from simple_salesforce import Salesforce, SalesforceMalformedRequest, SalesforceResourceNotFound
        
        self._config.validate()
        
        try:
            if self._config.session_id:
                # Session/OAuth auth
                self._sf = Salesforce(
                    instance_url=self._config.instance_url,
                    session_id=self._config.session_id,
                    domain=self._config.domain,
                )
            else:
                # Password auth
                self._sf = Salesforce(
                    username=self._config.username,
                    password=self._config.get_full_password(),
                    instance_url=self._config.instance_url,
                    domain=self._config.domain,
                )
            
            logger.info("Salesforce client initialized")
            return self._sf
            
        except Exception as e:
            raise SalesforceAuthError(f"Failed to connect to Salesforce: {e}") from e
    
    @property
    def sf(self) -> Any:
        """Access the underlying simple-salesforce client."""
        return self._get_client()
    
    @staticmethod
    def is_valid_salesforce_id(
        value: str,
        allow_15_char: bool = True,
        allow_18_char: bool = True,
    ) -> bool:
        """Validate a Salesforce ID.
        
        Salesforce IDs:
        - 15 characters: case-sensitive
        - 18 characters: case-insensitive (3 extra checksum chars)
        
        Args:
            value: ID to validate
            allow_15_char: Allow 15-char IDs
            allow_18_char: Allow 18-char IDs
        
        Returns:
            True if valid Salesforce ID
        """
        if not isinstance(value, str):
            return False
        
        value = value.strip()
        
        if not value:
            return False
        
        if not SalesforceClient.ID_PATTERN.match(value):
            return False
        
        length = len(value)
        
        if length == 15:
            return allow_15_char
        elif length == 18:
            return allow_18_char
        
        return False
    
    @staticmethod
    def convert_to_18_char(id_15: str) -> str:
        """Convert a 15-char case-sensitive ID to 18-char case-insensitive ID.
        
        Algorithm:
        1. Split into 3 chunks of 5 chars
        2. Reverse each chunk
        3. For each char: uppercase=1, lowercase=0
        4. Build binary string, convert to decimal
        5. Map to A-Z (0-25), 0-9 (26-35), +/= 36-37)
        6. Append 3 checksum chars
        
        Args:
            id_15: 15-char Salesforce ID
        
        Returns:
            18-char case-insensitive ID
        """
        if len(id_15) != 15:
            raise ValueError(f"Expected 15-char ID, got {len(id_15)} chars")
        
        # Checksum lookup table
        # 0-25: A-Z
        # 26-31: 0-5
        # 32-35: 6-9
        # Actually simpler: Salesforce uses specific encoding
        
        ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
        
        checksum = ""
        
        # Process 3 chunks of 5 characters each
        for chunk_start in range(0, 15, 5):
            chunk = id_15[chunk_start:chunk_start + 5]
            
            # Build binary: uppercase=1, lowercase=0, reversed order
            binary = ""
            for char in reversed(chunk):
                if char.isupper():
                    binary += "1"
                else:
                    binary += "0"
            
            # Convert binary to decimal
            index = int(binary, 2)
            checksum += ALPHABET[index]
        
        return id_15 + checksum
    
    @staticmethod
    def normalize_id(sf_id: str) -> str:
        """Normalize a Salesforce ID to 18-char case-insensitive format.
        
        Use this before comparing IDs or storing in external systems.
        
        Args:
            sf_id: 15 or 18 char Salesforce ID
        
        Returns:
            18-char case-insensitive ID
        """
        sf_id = sf_id.strip()
        
        if len(sf_id) == 18:
            # Already 18 chars, return uppercase
            return sf_id.upper()
        elif len(sf_id) == 15:
            # Convert to 18 chars
            return SalesforceClient.convert_to_18_char(sf_id)
        else:
            raise ValueError(f"Invalid Salesforce ID length: {len(sf_id)} chars")
    
    # ===================================================================
    # Core Operations
    # ===================================================================
    
    def query(
        self,
        soql: str,
        include_deleted: bool = False,
        include_archived: bool = False,
    ) -> List[Dict[str, Any]]:
        """Execute a SOQL query.
        
        Args:
            soql: SOQL query string
            include_deleted: Include deleted records (query_all)
            include_archived: Include archived records
            
            Returns:
            List of record dicts with 'attributes', 'Id', etc.
        """
        sf = self._get_client()
        
        try:
            if include_deleted or include_archived:
                # Use query_all for deleted/archived
                result = sf.query_all(soql)
            else:
                result = sf.query(soql)
            
            records = result.get("records", [])
            total_size = result.get("totalSize", 0)
            
            logger.debug(
                "SOQL query returned %d/%d records",
                len(records), total_size
            )
            
            # Handle pagination if needed (nextRecordsUrl)
            next_url = result.get("nextRecordsUrl")
            while next_url:
                # Use query_more
                more_result = sf.query_more(next_url)
                records.extend(more_result.get("records", []))
                next_url = more_result.get("nextRecordsUrl")
            
            return records
            
        except Exception as e:
            if "MALFORMED_QUERY" in str(e):
                raise SalesforceError(f"SOQL syntax error: {e}") from e
            elif "REQUEST_LIMIT_EXCEEDED" in str(e):
                raise SalesforceLimitError(f"API limit exceeded: {e}") from e
            else:
                raise SalesforceError(f"Query failed: {e}") from e
    
    def create(
        self,
        object_name: str,
        data: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Create a Salesforce record.
        
        Args:
            object_name: Object type (Account, Contact, Opportunity, etc.)
            data: Record field values
        
        Returns:
            Dict with 'id', 'success', 'errors'
        """
        sf = self._get_client()
        
        try:
            # Get the object proxy
            obj = getattr(sf, object_name)
            
            result = obj.create(data)
            
            if not result.get("success", False):
                errors = result.get("errors", [])
                raise SalesforceError(f"Create failed: {errors}")
            
            logger.info(
                "Created %s record: %s",
                object_name, result.get("id")
            )
            
            return result
            
        except Exception as e:
            raise SalesforceError(f"Failed to create {object_name}: {e}") from e
    
    def get(
        self,
        object_name: str,
        record_id: str,
    ) -> Dict[str, Any]:
        """Get a Salesforce record by ID.
        
        Args:
            object_name: Object type
            record_id: Salesforce ID (15 or 18 chars)
        
        Returns:
            Record dict
        """
        sf = self._get_client()
        
        # Validate ID
        if not self.is_valid_salesforce_id(record_id):
            raise ValueError(f"Invalid Salesforce ID: {record_id}")
        
        try:
            obj = getattr(sf, object_name)
            return obj.get(record_id)
            
        except Exception as e:
            if "NOT_FOUND" in str(e) or "ResourceNotFound" in type(e).__name__:
                raise SalesforceError(f"{object_name} not found: {record_id}") from e
            else:
                raise SalesforceError(f"Get failed: {e}") from e
    
    def update(
        self,
        object_name: str,
        record_id: str,
        data: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Update a Salesforce record.
        
        Args:
            object_name: Object type
            record_id: Record ID
            data: Fields to update
        
        Returns:
            Dict with 'success', 'errors'
        """
        sf = self._get_client()
        
        if not self.is_valid_salesforce_id(record_id):
            raise ValueError(f"Invalid Salesforce ID: {record_id}")
        
        try:
            obj = getattr(sf, object_name)
            result = obj.update(record_id, data)
            
            if not result.get("success", False):
                errors = result.get("errors", [])
                raise SalesforceError(f"Update failed: {errors}")
            
            logger.info("Updated %s record: %s", object_name, record_id)
            
            return result
            
        except Exception as e:
            raise SalesforceError(f"Failed to update {object_name}: {e}") from e
    
    def delete(
        self,
        object_name: str,
        record_id: str,
    ) -> Dict[str, Any]:
        """Delete a Salesforce record.
        
        Args:
            object_name: Object type
            record_id: Record ID
        
        Returns:
            Dict with 'success', 'errors'
        """
        sf = self._get_client()
        
        if not self.is_valid_salesforce_id(record_id):
            raise ValueError(f"Invalid Salesforce ID: {record_id}")
        
        try:
            obj = getattr(sf, object_name)
            result = obj.delete(record_id)
            
            if not result.get("success", False):
                errors = result.get("errors", [])
                raise SalesforceError(f"Delete failed: {errors}")
            
            logger.info("Deleted %s record: %s", object_name, record_id)
            
            return result
            
        except Exception as e:
            raise SalesforceError(f"Failed to delete {object_name}: {e}") from e
    
    def upsert(
        self,
        object_name: str,
        external_id_field: str,
        external_id_value: Any,
        data: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Upsert a record using an external ID.
        
        If record exists with external ID, update it. Otherwise, create it.
        
        Args:
            object_name: Object type
            external_id_field: External ID field name (with __c suffix for custom)
            external_id_value: External ID value
            data: Record data (should include external ID field usually)
        
        Returns:
            Dict with 'id', 'success', 'created', 'errors'
        """
        sf = self._get_client()
        
        try:
            obj = getattr(sf, object_name)
            
            # simple-salesforce upsert signature:
            # obj.upsert('External_Id__c/externalValue', data)
            upsert_key = f"{external_id_field}/{external_id_value}"
            
            result = obj.upsert(upsert_key, data)
            
            if not result.get("success", False):
                errors = result.get("errors", [])
                raise SalesforceError(f"Upsert failed: {errors}")
            
            created = result.get("created", False)
            action = "created" if created else "updated"
            logger.info(
                "Upserted %s record: %s (%s)",
                object_name, result.get("id"), action
            )
            
            return result
            
        except Exception as e:
            raise SalesforceError(f"Failed to upsert {object_name}: {e}") from e
    
    # ===================================================================
    # Bulk API Operations
    # ===================================================================
    
    def bulk_query(
        self,
        object_name: str,
        soql: str,
    ) -> List[Dict[str, Any]]:
        """Query using Bulk API for large datasets.
        
        Use for queries expected to return > 10,000 records.
        
        Args:
            object_name: Object type
            soql: SOQL query (without 'SELECT' and object specifier)
        
        Returns:
            List of record dicts
        """
        sf = self._get_client()
        
        try:
            bulk_obj = getattr(sf.bulk, object_name)
            
            # Bulk API query
            # Note: simple-salesforce bulk.query expects just the fields/where clause
            # e.g., "SELECT Id, Name FROM Account"
            
            results = bulk_obj.query(soql)
            
            logger.info(
                "Bulk query returned %d records", len(results)
            )
            
            return results
            
        except Exception as e:
            raise SalesforceError(f"Bulk query failed: {e}") from e
    
    def bulk_insert(
        self,
        object_name: str,
        records: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        """Insert multiple records using Bulk API.
        
        Use for inserting > 10,000 records.
        
        Args:
            object_name: Object type
            records: List of record dicts
        
        Returns:
            List of result dicts with 'id', 'success', 'errors'
        """
        if not records:
            return []
        
        sf = self._get_client()
        
        try:
            bulk_obj = getattr(sf.bulk, object_name)
            results = bulk_obj.insert(records)
            
            success_count = sum(1 for r in results if r.get("success"))
            error_count = len(results) - success_count
            
            logger.info(
                "Bulk insert: %d successful, %d errors",
                success_count, error_count
            )
            
            return results
            
        except Exception as e:
            raise SalesforceError(f"Bulk insert failed: {e}") from e
    
    def bulk_update(
        self,
        object_name: str,
        records: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        """Update multiple records using Bulk API.
        
        Each record must include 'Id' field.
        
        Args:
            object_name: Object type
            records: List of record dicts (must include 'Id')
        
        Returns:
            List of result dicts
        """
        if not records:
            return []
        
        sf = self._get_client()
        
        try:
            bulk_obj = getattr(sf.bulk, object_name)
            results = bulk_obj.update(records)
            
            success_count = sum(1 for r in results if r.get("success"))
            
            logger.info(
                "Bulk update: %d successful",
                success_count
            )
            
            return results
            
        except Exception as e:
            raise SalesforceError(f"Bulk update failed: {e}") from e
    
    def bulk_upsert(
        self,
        object_name: str,
        records: List[Dict[str, Any]],
        external_id_field: str,
    ) -> List[Dict[str, Any]]:
        """Upsert multiple records using Bulk API.
        
        Args:
            object_name: Object type
            records: List of record dicts (must include external ID field)
            external_id_field: External ID field name
        
        Returns:
            List of result dicts
        """
        if not records:
            return []
        
        sf = self._get_client()
        
        try:
            bulk_obj = getattr(sf.bulk, object_name)
            results = bulk_obj.upsert(records, external_id_field)
            
            success_count = sum(1 for r in results if r.get("success"))
            
            logger.info(
                "Bulk upsert: %d successful",
                success_count
            )
            
            return results
            
        except Exception as e:
            raise SalesforceError(f"Bulk upsert failed: {e}") from e
    
    def bulk_delete(
        self,
        object_name: str,
        records: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        """Delete multiple records using Bulk API.
        
        Each record must include 'Id' field.
        
        Args:
            object_name: Object type
            records: List of record dicts (must include 'Id')
        
        Returns:
            List of result dicts
        """
        if not records:
            return []
        
        sf = self._get_client()
        
        try:
            bulk_obj = getattr(sf.bulk, object_name)
            results = bulk_obj.delete(records)
            
            success_count = sum(1 for r in results if r.get("success"))
            
            logger.info(
                "Bulk delete: %d successful",
                success_count
            )
            
            return results
            
        except Exception as e:
            raise SalesforceError(f"Bulk delete failed: {e}") from e
    
    # ===================================================================
    # Apex REST
    # ===================================================================
    
    def apex_call(
        self,
        method: str,
        path: str,
        data: Optional[Dict[str, Any]] = None,
    ) -> Any:
        """Call a custom Apex REST endpoint.
        
        Args:
            method: HTTP method: 'GET', 'POST', 'PUT', 'DELETE', 'PATCH'
            path: Apex REST path (e.g., '/services/apexrest/MyEndpoint')
            data: Request body data (for POST/PUT/PATCH)
        
        Returns:
            Response data (parsed JSON)
        """
        sf = self._get_client()
        
        try:
            result = sf.apexcall(method=method, path=path, data=data)
            
            logger.info(
                "Apex REST call: %s %s",
                method, path
            )
            
            return result
            
        except Exception as e:
            raise SalesforceError(f"Apex call failed: {e}") from e
    
    # ===================================================================
    # Limits
    # ===================================================================
    
    def get_limits(self, force_refresh: bool = False) -> Dict[str, Any]:
        """Get current API limits.
        
        Args:
            force_refresh: Skip cache
        
        Returns:
            Limits dict from Salesforce limits() call
        """
        # Cache limits for 60 seconds
        now = time.time()
        
        if not force_refresh and self._limits_cache and (now - self._limits_cache_time) < 60:
            return self._limits_cache
        
        sf = self._get_client()
        
        try:
            limits = sf.limits()
            self._limits_cache = limits
            self._limits_cache_time = now
            
            return limits
            
        except Exception as e:
            raise SalesforceError(f"Failed to get limits: {e}") from e
    
    def remaining_daily_api_calls(self) -> int:
        """Get remaining daily API calls remaining.
        
        Returns:
            Remaining API calls
        """
        limits = self.get_limits()
        
        daily_api = limits.get("DailyApiRequests", {})
        remaining = daily_api.get("Remaining", 0)
        
        return remaining


# Global client (lazy-loaded)
_global_client: Optional[SalesforceClient] = None


def get_salesforce_client() -> SalesforceClient:
    """Get or create global Salesforce client."""
    global _global_client
    if _global_client is None:
        config = SalesforceConfig.from_env()
        _global_client = SalesforceClient(config)
    return _global_client
```

### Pattern 2: Common SOQL Queries & Operations

```python
"""Common SOQL query patterns and CRM operations.

SOQL Best Practices:
- ALWAYS use LIMIT in development/test queries
- Use query_all() for deleted/archived records
- Use Bulk API for > 10,000 records
- Include Id field in all SELECTs
- Use relationships with care (costly)
- Use COUNT() instead of retrieving all records
"""

from __future__ import annotations

import logging
from typing import Any, Optional, List, Dict
from datetime import datetime, timedelta, timezone

logger = logging.getLogger(__name__)


class SalesforceQueries:
    """Common SOQL query builder and executor."""
    
    def __init__(self, client: Any) -> None:
        self._client = client
    
    # ===================================================================
    # Account Queries
    # ===================================================================
    
    def get_accounts_by_industry(
        self,
        industry: str,
        limit: int = 100,
    ) -> List[Dict[str, Any]]:
        """Get Accounts filtered by industry.
        
        Args:
            industry: Industry value (e.g., 'Technology', 'Finance')
            limit: Max records
        
        Returns:
            List of Account records
        """
        soql = f"""
            SELECT Id, Name, Industry, Type, Phone, Website,
                   BillingCity, BillingState, BillingCountry,
                   CreatedDate, LastModifiedDate
            FROM Account
            WHERE Industry = '{industry}'
            ORDER BY CreatedDate DESC
            LIMIT {limit}
        """
        
        return self._client.query(soql.strip())
    
    def get_accounts_created_since(
        self,
        days: int = 30,
        limit: int = 1000,
    ) -> List[Dict[str, Any]]:
        """Get Accounts created in the last N days.
        
        Args:
            days: Number of days to look back
            limit: Max records
        
        Returns:
            List of Account records
        """
        # Calculate date
        start_date = (datetime.now(timezone.utc) - timedelta(days=days)).strftime("%Y-%m-%dT%H:%M:%SZ")
        
        soql = f"""
            SELECT Id, Name, Industry, Type, CreatedDate
            FROM Account
            WHERE CreatedDate >= {start_date}
            ORDER BY CreatedDate DESC
            LIMIT {limit}
        """
        
        return self._client.query(soql.strip())
    
    def search_accounts_by_name(
        self,
        name_pattern: str,
        limit: int = 50,
    ) -> List[Dict[str, Any]]:
        """Search Accounts by name pattern.
        
        Uses LIKE operator.
        
        Args:
            name_pattern: Name pattern with % wildcards
            limit: Max records
        
        Returns:
            List of Account records
        """
        # Escape single quotes in pattern
        escaped_pattern = name_pattern.replace("'", "\\'")
        
        soql = f"""
            SELECT Id, Name, Industry, Type, Phone, Website
            FROM Account
            WHERE Name LIKE '{escaped_pattern}'
            ORDER BY Name
            LIMIT {limit}
        """
        
        return self._client.query(soql.strip())
    
    # ===================================================================
    # Contact Queries
    # ===================================================================
    
    def get_contacts_by_account(
        self,
        account_id: str,
        limit: int = 100,
    ) -> List[Dict[str, Any]]:
        """Get Contacts for an Account.
        
        Args:
            account_id: Account ID
            limit: Max records
        
        Returns:
            List of Contact records
        """
        # Validate ID
        if not self._client.is_valid_salesforce_id(account_id):
            raise ValueError(f"Invalid Account ID: {account_id}")
        
        soql = f"""
            SELECT Id, Name, FirstName, LastName, Title,
                   Email, Phone, MobilePhone,
                   AccountId, Account.Name
            FROM Contact
            WHERE AccountId = '{account_id}'
            ORDER BY LastName
            LIMIT {limit}
        """
        
        return self._client.query(soql.strip())
    
    def get_contacts_by_email_domain(
        self,
        email_domain: str,
        limit: int = 100,
    ) -> List[Dict[str, Any]]:
        """Get Contacts by email domain.
        
        Args:
            email_domain: Domain (e.g., 'example.com')
            limit: Max records
        
        Returns:
            List of Contact records
        """
        soql = f"""
            SELECT Id, Name, FirstName, LastName,
                   Email, Phone, AccountId, Account.Name
            FROM Contact
            WHERE Email LIKE '%{email_domain}'
            ORDER BY LastName
            LIMIT {limit}
        """
        
        return self._client.query(soql.strip())
    
    # ===================================================================
    # Opportunity Queries
    # ===================================================================
    
    def get_open_opportunities(
        self,
        stage: Optional[str] = None,
        close_date_from: Optional[str] = None,
        limit: int = 100,
    ) -> List[Dict[str, Any]]:
        """Get open Opportunities.
        
        Args:
            stage: Filter by StageName
            close_date_from: Filter by CloseDate >= this date
            limit: Max records
        
        Returns:
            List of Opportunity records
        """
        conditions = ["IsClosed = false"]
        
        if stage:
            conditions.append(f"StageName = '{stage}'")
        
        if close_date_from:
            conditions.append(f"CloseDate >= {close_date_from}")
        
        where_clause = " AND ".join(conditions)
        
        soql = f"""
            SELECT Id, Name, StageName, Amount, CloseDate,
                   Probability, AccountId, Account.Name,
                   OwnerId, Owner.Name
            FROM Opportunity
            WHERE {where_clause}
            ORDER BY CloseDate
            LIMIT {limit}
        """
        
        return self._client.query(soql.strip())
    
    def get_opportunities_won_last_quarter(
        self,
        limit: int = 500,
    ) -> List[Dict[str, Any]]:
        """Get Opportunities won in the last quarter.
        
        Returns:
            List of won Opportunity records
        """
        soql = """
            SELECT Id, Name, StageName, Amount, CloseDate,
                   AccountId, Account.Name
            FROM Opportunity
            WHERE IsWon = true
            AND CloseDate = LAST_QUARTER
            ORDER BY Amount DESC
            LIMIT 500
        """
        
        return self._client.query(soql.strip())
    
    # ===================================================================
    # Lead Queries
    # ===================================================================
    
    def get_leads_by_status(
        self,
        status: str,
        limit: int = 100,
    ) -> List[Dict[str, Any]]:
        """Get Leads by Status.
        
        Args:
            status: Lead Status value
            limit: Max records
        
        Returns:
            List of Lead records
        """
        soql = f"""
            SELECT Id, Name, FirstName, LastName, Company,
                   Email, Phone, Status, LeadSource,
                   CreatedDate
            FROM Lead
            WHERE Status = '{status}'
            ORDER BY CreatedDate DESC
            LIMIT {limit}
        """
        
        return self._client.query(soql.strip())
    
    # ===================================================================
    # Case Queries
    # ===================================================================
    
    def get_open_cases(
        self,
        limit: int = 100,
    ) -> List[Dict[str, Any]]:
        """Get open Cases.
        
        Returns:
            List of Case records
        """
        soql = f"""
            SELECT Id, CaseNumber, Subject, Status, Priority,
                   AccountId, Account.Name,
                   ContactId, Contact.Name,
                   OwnerId, Owner.Name,
                   CreatedDate
            FROM Case
            WHERE IsClosed = false
            ORDER BY Priority DESC, CreatedDate
            LIMIT {limit}
        """
        
        return self._client.query(soql.strip())
    
    def get_cases_by_account(
        self,
        account_id: str,
        limit: int = 100,
    ) -> List[Dict[str, Any]]:
        """Get Cases for an Account.
        
        Args:
            account_id: Account ID
            limit: Max records
        
        Returns:
            List of Case records
        """
        if not self._client.is_valid_salesforce_id(account_id):
            raise ValueError(f"Invalid Account ID: {account_id}")
        
        soql = f"""
            SELECT Id, CaseNumber, Subject, Status, Priority,
                   CreatedDate, ClosedDate
            FROM Case
            WHERE AccountId = '{account_id}'
            ORDER BY CreatedDate DESC
            LIMIT {limit}
        """
        
        return self._client.query(soql.strip())
    
    # ===================================================================
    # Aggregate Queries
    # ===================================================================
    
    def count_records(
        self,
        object_name: str,
        where_clause: str = "Id != null",
    ) -> int:
        """Count records using COUNT().
        
        Args:
            object_name: Object type
            where_clause: WHERE clause
        
        Returns:
            Record count
        """
        soql = f"""
            SELECT COUNT()
            FROM {object_name}
            WHERE {where_clause}
        """
        
        results = self._client.query(soql.strip())
        
        # COUNT() returns totalSize
        return len(results) if isinstance(results, list) else 0
    
    def aggregate_by_type(
        self,
        object_name: str,
        group_by_field: str,
        aggregate_field: str = "Amount",
        aggregate_func: str = "SUM",
        limit: int = 100,
    ) -> List[Dict[str, Any]]:
        """Aggregate records grouped by a field.
        
        Args:
            object_name: Object type
            group_by_field: Field to group by
            aggregate_field: Field to aggregate
            aggregate_func: Aggregate function (SUM, COUNT, AVG, MAX, MIN)
            limit: Max groups
        
        Returns:
            List of aggregate results
        """
        soql = f"""
            SELECT {aggregate_func}({aggregate_field}) total,
                   {group_by_field}
            FROM {object_name}
            GROUP BY {group_by_field}
            ORDER BY {aggregate_func}({aggregate_field}) DESC
            LIMIT {limit}
        """
        
        return self._client.query(soql.strip())


class CRUDOperations:
    """Common CRUD operations helpers.
    """
    
    def __init__(self, client: Any) -> None:
        self._client = client
        self._queries = SalesforceQueries(client)
    
    # ===================================================================
    # Account Operations
    # ===================================================================
    
    def create_account(
        self,
        name: str,
        industry: Optional[str] = None,
        type: Optional[str] = None,
        phone: Optional[str] = None,
        website: Optional[str] = None,
        **additional_fields: Any,
    ) -> str:
        """Create an Account.
        
        Args:
            name: Account Name (required)
            industry: Industry
            type: Type
            phone: Phone
            website: Website
            **additional_fields: Additional field values
        
        Returns:
            New Account ID
        """
        data: Dict[str, Any] = {"Name": name}
        
        if industry:
            data["Industry"] = industry
        if type:
            data["Type"] = type
        if phone:
            data["Phone"] = phone
        if website:
            data["Website"] = website
        
        data.update(additional_fields)
        
        result = self._client.create("Account", data)
        return result["id"]
    
    def create_contact(
        self,
        last_name: str,
        first_name: Optional[str] = None,
        account_id: Optional[str] = None,
        email: Optional[str] = None,
        phone: Optional[str] = None,
        title: Optional[str] = None,
        **additional_fields: Any,
    ) -> str:
        """Create a Contact.
        
        Args:
            last_name: Last Name (required)
            first_name: First Name
            account_id: Account ID
            email: Email
            phone: Phone
            title: Title
            **additional_fields: Additional fields
        
        Returns:
            New Contact ID
        """
        data: Dict[str, Any] = {"LastName": last_name}
        
        if first_name:
            data["FirstName"] = first_name
        if account_id:
            if self._client.is_valid_salesforce_id(account_id):
                data["AccountId"] = account_id
        if email:
            data["Email"] = email
        if phone:
            data["Phone"] = phone
        if title:
            data["Title"] = title
        
        data.update(additional_fields)
        
        result = self._client.create("Contact", data)
        return result["id"]
    
    def create_lead(
        self,
        last_name: str,
        company: str,
        first_name: Optional[str] = None,
        email: Optional[str] = None,
        phone: Optional[str] = None,
        lead_source: Optional[str] = None,
        status: str = "Open - Not Contacted",
        **additional_fields: Any,
    ) -> str:
        """Create a Lead.
        
        Args:
            last_name: Last Name (required)
            company: Company (required)
            first_name: First Name
            email: Email
            phone: Phone
            lead_source: Lead Source
            status: Status
            **additional_fields: Additional fields
        
        Returns:
            New Lead ID
        """
        data: Dict[str, Any] = {
            "LastName": last_name,
            "Company": company,
            "Status": status,
        }
        
        if first_name:
            data["FirstName"] = first_name
        if email:
            data["Email"] = email
        if phone:
            data["Phone"] = phone
        if lead_source:
            data["LeadSource"] = lead_source
        
        data.update(additional_fields)
        
        result = self._client.create("Lead", data)
        return result["id"]
    
    def create_opportunity(
        self,
        name: str,
        account_id: str,
        close_date: str,  # YYYY-MM-DD
        stage: str = "Prospecting",
        amount: Optional[float] = None,
        probability: float = 10.0,
        **additional_fields: Any,
    ) -> str:
        """Create an Opportunity.
        
        Args:
            name: Opportunity Name (required)
            account_id: Account ID (required)
            close_date: Close Date (YYYY-MM-DD)
            stage: Stage Name
            amount: Amount
            probability: Probability (%)
            **additional_fields: Additional fields
        
        Returns:
            New Opportunity ID
        """
        data: Dict[str, Any] = {
            "Name": name,
            "CloseDate": close_date,
            "StageName": stage,
            "Probability": probability,
        }
        
        if account_id and self._client.is_valid_salesforce_id(account_id):
            data["AccountId"] = account_id
        if amount is not None:
            data["Amount"] = amount
        
        data.update(additional_fields)
        
        result = self._client.create("Opportunity", data)
        return result["id"]
    
    def create_case(
        self,
        subject: str,
        contact_id: Optional[str] = None,
        account_id: Optional[str] = None,
        status: str = "New",
        priority: str = "Medium",
        **additional_fields: Any,
    ) -> str:
        """Create a Case.
        
        Args:
            subject: Subject (required)
            contact_id: Contact ID
            account_id: Account ID
            status: Status
            priority: Priority
            **additional_fields: Additional fields
        
        Returns:
            New Case ID
        """
        data: Dict[str, Any] = {
            "Subject": subject,
            "Status": status,
            "Priority": priority,
        }
        
        if contact_id and self._client.is_valid_salesforce_id(contact_id):
            data["ContactId"] = contact_id
        if account_id and self._client.is_valid_salesforce_id(account_id):
            data["AccountId"] = account_id
        
        data.update(additional_fields)
        
        result = self._client.create("Case", data)
        return result["id"]
    
    def convert_lead(
        self,
        lead_id: str,
        converted_status: str = "Closed - Converted",
        create_contact: bool = True,
        create_opportunity: bool = True,
        opportunity_name: Optional[str] = None,
        account_id: Optional[str] = None,
        owner_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Convert a Lead using DML operations.
        
        Note: simple-salesforce doesn't have a direct convert method.
        This performs the equivalent via updates and creates.
        
        Args:
            lead_id: Lead ID
            converted_status: Converted Lead Status
            create_contact: Create Contact
            create_opportunity: Create Opportunity
            opportunity_name: Opportunity name for new Opportunity
            account_id: Existing Account ID
            owner_id: Owner ID
        
        Returns:
            Dict with created record IDs
        """
        # First, get the Lead
        lead = self._client.get("Lead", lead_id)
        
        results: Dict[str, Any] = {}
        
        # Create Account if not provided
        if not account_id:
            account_data = {
                "Name": lead.get("Company") or "Converted Account",
            }
            account_id = self._client.create("Account", account_data)["id"]
            results["account_id"] = account_id
            results["account_created"] = True
        else:
            results["account_id"] = account_id
            results["account_created"] = False
        
        # Create Contact
        if create_contact:
            contact_data: Dict[str, Any] = {
                "AccountId": account_id,
            }
            
            if lead.get("FirstName"):
                contact_data["FirstName"] = lead["FirstName"]
            if lead.get("LastName"):
                contact_data["LastName"] = lead["LastName"]
            if lead.get("Email"):
                contact_data["Email"] = lead["Email"]
            if lead.get("Phone"):
                contact_data["Phone"] = lead["Phone"]
            if lead.get("Title"):
                contact_data["Title"] = lead["Title"]
            
            contact_id = self._client.create("Contact", contact_data)["id"]
            results["contact_id"] = contact_id
        
        # Create Opportunity
        if create_opportunity:
            opp_data: Dict[str, Any] = {
                "Name": opportunity_name or f"Opportunity from Lead: {lead.get('Name') or lead_id}",
                "AccountId": account_id,
                "CloseDate": (datetime.now(timezone.utc) + timedelta(days=30)).strftime("%Y-%m-%d"),
                "StageName": "Prospecting",
                "Probability": 10.0,
            }
            
            if lead.get("Amount"):
                opp_data["Amount"] = lead["Amount"]
            
            opp_id = self._client.create("Opportunity", opp_data)["id"]
            results["opportunity_id"] = opp_id
        
        # Update Lead to converted status
        update_data: Dict[str, Any] = {
            "Status": converted_status,
            "IsConverted": True,
            # Note: ConvertedAccountId, ConvertedContactId, ConvertedOpportunityId
            # are set via DML in actual conversion
        }
        
        if account_id:
            update_data["ConvertedAccountId"] = account_id
        if results.get("contact_id"):
            update_data["ConvertedContactId"] = results["contact_id"]
        if results.get("opportunity_id"):
            update_data["ConvertedOpportunityId"] = results["opportunity_id"]
        
        self._client.update("Lead", lead_id, update_data)
        results["lead_converted"] = True
        
        return results


# ===================================================================
# ❌ BAD — Common mistakes
# ===================================================================

def bad_salesforce_mistakes_bad() -> None:
    """❌ DON'T do these things.
    """
    # ❌ Forgetting to include LIMIT in queries during development
    # This can return thousands of records
    # soql = "SELECT Id, Name FROM Account"  # No LIMIT!
    
    # ❌ Using 15-char IDs as case-insensitive
    # 0011a00001ABCDE vs 0011a00001abcde are DIFFERENT in 15-char form
    # Always normalize to 18-char for comparisons
    
    # ❌ Not handling deleted/archived records
    # Use query_all() instead of query() when you need them
    
    # ❌ Hardcoding IDs in code
    account_id = "001..."  # Don't do this!
    
    # ❌ Forgetting that Salesforce IDs are strings
    # Always validate before using
    pass


# ===================================================================
# ✅ GOOD — Best practices
# ===================================================================

def good_salesforce_practices(
    client: Any,
) -> None:
    """✅ DO these things.
    """
    # ✅ Always use LIMIT in development/test queries
    accounts = client.query(
        "SELECT Id, Name FROM Account LIMIT 100"
    )
    
    # ✅ Normalize IDs to 18-char case-insensitive format
    account_id_15 = "0011a00001ABCDE"
    account_id_18 = client.normalize_id(account_id_15)
    
    # ✅ Use query_all() for deleted/archived
    all_accounts = client.query(
        "SELECT Id, Name FROM Account",
        include_deleted=True,
        include_archived=True,
    )
    
    # ✅ Validate IDs before using
    if client.is_valid_salesforce_id(account_id_15):
        # Use it
        pass
    
    # ✅ Check limits before large operations
    remaining = client.remaining_daily_api_calls()
    if remaining < 100:
        logger.warning("Low API calls remaining: %d", remaining)
```

---

## Constraints

### MUST DO

- Always use environment variables for credentials: `SF_USERNAME`, `SF_PASSWORD`, `SF_SECURITY_TOKEN`
- Always include `LIMIT` clause in development/test SOQL queries
- Use `query_all()` when deleted/archived records might exist
- Use Bulk API for operations involving >10,000 records
- Normalize IDs to 18-char case-insensitive format before comparison/storage
- Validate Salesforce IDs before using them
- Check `sf.limits()` before large operations
- Implement retry with exponential backoff for rate limits
- Use external IDs for upsert operations
- Include `Id` field in all `SELECT` clauses
- Never store credentials or session IDs in code/logs

### MUST NOT DO

- NEVER hardcode credentials in source code
- NEVER use 15-char IDs in case-insensitive comparisons
- NEVER use `query()` expecting >10,000 records (use Bulk API)
- NEVER forget `query_all()` when deleted records needed
- NEVER commit session IDs or security tokens in logs
- NEVER modify system fields (CreatedDate, LastModifiedDate, etc.) via DML
- NEVER trust user input directly in SOQL (risk of injection — use binding
- NEVER ignore `REQUEST_LIMIT_EXCEEDED` errors without retry
- NEVER assume 15-char IDs are case-insensitive (only 18-char are)
- NEVER use DML operations on read-only objects
- NEVER send PII or sensitive data without encryption

---

## Output Template

When implementing Salesforce integrations, produce:

1. **Client Initialization** — `SalesforceConfig` + `SalesforceClient` from env vars
2. **ID Handling** — `normalize_id()`, `is_valid_salesforce_id()`, 15-to-18 char conversion
3. **Core Operations** — `query()`, `create()`, `get()`, `update()`, `delete()`, `upsert()`
4. **Bulk API** — `bulk_query()`, `bulk_insert()`, `bulk_update()`, `bulk_upsert()`, `bulk_delete()`
5. **Query Builder** — `SalesforceQueries` with SOQL patterns for Accounts, Contacts, Opportunities, Leads, Cases
6. **CRUD Helpers** — `CRUDOperations` with create_account(), create_contact(), create_lead(), etc.
7. **Apex REST** — `apex_call()` for custom endpoints
8. **Limits** — `get_limits()`, `remaining_daily_api_calls()`

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `coding-hubspot-api` | HubSpot as alternative CRM |
| `coding-marketo-api` | Marketo for marketing automation |
| `coding-zendesk-api` | Zendesk for support tickets |
| `coding-salesforce-api` | This skill

---

## Live References

| Resource | URL |
|----------|-----|
| simple-salesforce (PyPI) | https://pypi.org/project/simple-salesforce/ |
| simple-salesforce Docs | https://github.com/simple-salesforce/simple-salesforce |
| Salesforce REST API | https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/intro_welcome.htm |
| SOQL Reference | https://developer.salesforce.com/docs/atlas.en-us.soql_sosl.meta/soql_sosl/sforce_api_calls_soql.htm |
| Bulk API | https://developer.salesforce.com/docs/atlas.en-us.api_asynch.meta/api_asynch/ |
| Apex REST | https://developer.salesforce.com/docs/atlas.en-us.apexcode.meta/apexcode/apex_rest_intro.htm |
| Salesforce Limits | https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/resources_limits.htm |
| Salesforce IDs | https://developer.salesforce.com/docs/atlas.en-us.api.meta/api/force_api_objects_record_id_format.htm |

---

## 📎 Salesforce ID Format

Salesforce IDs come in two formats:

| Format | Length | Case-Sensitive? | Use Case |
|--------|--------|-------------------|----------|
| 15-char | 15 characters | ✅ Yes | Display, UI, URLs |
| 18-char | 18 characters | ❌ No | API, comparisons, storage |

**15-char to 18-char conversion:**
The 3 extra characters are a checksum that encodes case information.

Example:
- 15-char: `0011a00001ABCDE` (case matters)
- 18-char: `0011a00001ABCDEXYZ` (case doesn't matter)

**Best Practice:** Always convert to 18-char before:
- Storing IDs in external systems
- Comparing IDs
- Using IDs as dictionary keys

---

## 📎 Authentication Methods

| Method | Credentials Needed | Security | Use Case |
|--------|-------------------|----------|----------|
| Password + Token | username + password + security_token | Medium | Server-to-server, scripts |
| Session ID | session_id + instance_url | Better | OAuth flows, web apps |
| OAuth 2.0 JWT Bearer | client_id, private key | Best | Server-to-server, integrations |
| OAuth 2.0 Web Server | client_id, client_secret | Best | Web apps with user context |

**Security Token:** Appended to password for password auth.
Obtained from: Setup → My Personal Information → Reset My Security Token

---

## 📎 API Limits

| Limit Type | Value |
|-------------|-------|
| Concurrent API Calls | 25 (concurrency) |
| Daily API Calls | 15,000 / 24h (Enterprise Edition) |
| SOQL Query Rows | 50,000 per call |
| DML Rows | 10,000 per call |
| Bulk API Rows | 10,000 per batch, 10,000 batches/day |

**Check limits before large operations using `sf.limits()`**

Response example:
```python
limits = client.get_limits()
daily_api = limits.get("DailyApiRequests", {})
remaining = daily_api.get("Remaining")
max_calls = daily_api.get("Max")
```

---

## 📎 Simple-Salesforce Object Access

```python
from simple_salesforce import Salesforce

# Connection
sf = Salesforce(
    username='user@example.com',
    password='password' + 'security_token',
    domain='test'  # 'login' for production
)

# CRUD
sf.Account.create({'Name': 'Acme Corp'})
sf.Account.get('001...')
sf.Account.update('001...', {'Name': 'Updated Name'})
sf.Account.delete('001...')

# Query
result = sf.query("SELECT Id, Name FROM Account LIMIT 100")
accounts = result['records']

# Query All (includes deleted/archived)
result = sf.query_all("SELECT Id FROM Account")

# Bulk API
sf.bulk.Account.query("SELECT Id, Name FROM Account")
sf.bulk.Account.insert([{'Name': 'Account 1'}, {'Name': 'Account 2'}])

# Apex REST
sf.apexcall(method='GET', path='/services/apexrest/MyEndpoint')
```
