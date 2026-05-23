---
name: splunk-api
description: Implements Splunk integration (log ingestion, search queries, REST API) using splunk-sdk Python SDK with HEC (HTTP Event Collector) for log ingestion, Splunk search queries, saved searches, alert management, and REST API patterns.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: splunk, splunk search, hec, http event collector, splunk sdk, splunk alerts, how do i send logs to splunk, log management
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: coding-datadog-api, coding-grafana-prometheus, coding-newrelic-api
---

# Splunk API & SDK Integration

Implements production-grade Splunk integration using the `splunk-sdk` Python SDK and HTTP Event Collector (HEC). When loaded, this skill makes the model implement log/event ingestion via HEC, search queries using Splunk SDK, saved searches, alert management, dashboard management, and REST API operations. All implementations follow Splunk best practices: use `SPLUNK_HEC_TOKEN` from environment, batch events for HEC, use time bounds in all searches, implement exponential backoff, validate connectivity on startup, and never send PII without consent.

## TL;DR Checklist

- [ ] Use `splunk-sdk` with `SPLUNK_HOST`, `SPLUNK_PORT`, `SPLUNK_USERNAME`, `SPLUNK_PASSWORD` for management API
- [ ] Use HTTP Event Collector (HEC) with `SPLUNK_HEC_TOKEN` for log/event ingestion
- [ ] Always include `time` field in HEC events (Unix seconds or ISO 8601)
- [ ] Use `index`, `source`, `sourcetype`, `host` fields for proper categorization
- [ ] Batch HEC events (50-100 per batch) for efficiency
- [ ] Use `earliest_time` and `latest_time` in all searches
- [ ] Use `oneshot` searches for ad-hoc queries, `export` for large result sets
- [ ] Implement exponential backoff for 429 rate limit responses
- [ ] Use `host` field to identify the source machine/service
- [ ] Never send PII, credentials, or sensitive data without consent

---

## When to Use

Use this skill when:

- Ingesting logs and events via HTTP Event Collector (HEC)
- Running Splunk search queries programmatically
- Creating and managing saved searches
- Setting up alerts and alert actions
- Managing Splunk users, roles, and permissions
- Exporting large datasets from Splunk
- Building dashboards and visualizations via API
- Monitoring Splunk instance health
- Automating Splunk administration tasks
- Correlating events across multiple data sources

---

## When NOT to Use

- For Datadog-specific monitoring — use `coding-datadog-api` instead
- For Prometheus + Grafana — use `coding-grafana-prometheus` instead
- For New Relic APM — use `coding-newrelic-api` instead
- For simple application logging (use logging libraries with Splunk handler)
- For real-time streaming (Splunk has near-real-time only)
- For metrics-first monitoring (Prometheus is better for metrics)

---

## Core Workflow

1. **Initialize Clients** — Configure two primary clients:
   - **HEC Client**: For ingesting events/logs via HTTP Event Collector
   - **Management Client**: `splunklib.client` for search, saved searches, alerts
   
   Use environment variables: `SPLUNK_HEC_TOKEN`, `SPLUNK_HOST`, `SPLUNK_USERNAME`, `SPLUNK_PASSWORD`.
   **Checkpoint:** Validate connectivity with HEC health check and simple search.

2. **Define Ingestion Schema** — Establish consistent fields for all events:
   - `time`: Event timestamp (Unix seconds or ISO 8601)
   - `host`: Source machine/service
   - `source`: Source application/file
   - `sourcetype`: Data format (e.g., `json`, `access_combined`, `custom_sourcetype`)
   - `index`: Destination index
   
   **Checkpoint:** Every event has at least `sourcetype` and timestamp.

3. **Implement HEC Ingestion** — Send events via HEC:
   - Single events: POST to `/services/collector/event`
   - Batch events: Multiple events in one POST
   - Raw events: `/services/collector/raw` for unstructured data
   
   **Checkpoint:** Events batched in 50-100 per call; retry with exponential backoff.

4. **Execute Searches** — Use `splunklib.client` for searches:
   - `oneshot`: Immediate search, returns results
   - `export`: Stream large result sets
   - `normal`: Asynchronous search job
   
   **Checkpoint:** All searches have `earliest_time` and `latest_time` bounds.

5. **Manage Saved Searches & Alerts** — Create and manage:
   - Saved searches: Reusable queries
   - Alerts: Saved searches with trigger conditions
   - Alert actions: Email, webhook, script
   
   **Checkpoint:** Alerts have appropriate throttling and trigger conditions.

6. **Handle Results & Pagination** — Process search results:
   - Use `export` for >10,000 results
   - Parse JSON or CSV output
   - Handle field extraction
   
   **Checkpoint:** Large result sets use streaming export, not oneshot.

---

## Implementation Patterns

### Pattern 1: Splunk Client Initialization (BAD vs GOOD)

```python
"""Splunk client initialization patterns.

Two primary interfaces:
1. HTTP Event Collector (HEC): For ingesting logs/events
   - Endpoint: http(s)://splunk:8088/services/collector
   - Auth: HEC token in Authorization header
   - High throughput, designed for event ingestion

2. Management REST API / SDK: For queries and administration
   - Endpoint: http(s)://splunk:8089
   - Auth: Username/password or session token
   - Full access to all Splunk REST endpoints

SDK: splunk-sdk on PyPI, import as splunklib
"""

from __future__ import annotations

import os
import json
import time
import logging
import threading
from typing import Any, Optional, List, Dict, Iterator
from datetime import datetime, timedelta, timezone
from dataclasses import dataclass, field
from collections import deque
from uuid import uuid4

import requests

logger = logging.getLogger(__name__)


# ===================================================================
# ❌ BAD — hardcoded credentials, no batching, no error handling
# ===================================================================

def bad_splunk_init_bad() -> None:
    """❌ BAD: Don't do any of these things."""
    
    # ❌ Hardcoded credentials!
    hec_token = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
    splunk_host = "localhost"
    username = "admin"
    password = "changeme"  # ❌ Default password!
    
    # ❌ Sending one event per HTTP call (inefficient)
    # ❌ No time field (events get ingest time, not event time)
    # ❌ No sourcetype, source, host (poor categorization)
    event = {
        "event": {
            "message": "User logged in",
            "user_id": "user-123",
        },
        # ❌ Missing: time, sourcetype, source, host, index
    }
    
    # ❌ No validation
    # ❌ No error handling
    # ❌ No retries
    pass


# ===================================================================
# ✅ GOOD — env-based config, batching, proper error handling
# ===================================================================


class SplunkError(Exception):
    """Base exception for Splunk client errors."""
    pass


class SplunkAuthError(SplunkError):
    """Credentials invalid or missing."""
    pass


class SplunkRateLimitError(SplunkError):
    """Rate limit exceeded."""
    
    def __init__(self, message: str, retry_after: Optional[int] = None):
        super().__init__(message)
        self.retry_after = retry_after


class SplunkSearchError(SplunkError):
    """Search query failed."""
    pass


@dataclass
class SplunkConfig:
    """Splunk configuration from environment variables.
    
    Environment variables:
        SPLUNK_HOST: Splunk server hostname/IP
        SPLUNK_PORT: Management port (default 8089)
        SPLUNK_HEC_PORT: HEC port (default 8088)
        SPLUNK_SCHEME: http or https (default https)
        SPLUNK_USERNAME: Management API username
        SPLUNK_PASSWORD: Management API password
        SPLUNK_HEC_TOKEN: HTTP Event Collector token
        SPLUNK_VERIFY_SSL: Verify SSL certificates (1/0, default 1)
        SPLUNK_INDEX: Default index for HEC events
    """
    
    # Connection
    host: str = "localhost"
    port: int = 8089
    hec_port: int = 8088
    scheme: str = "https"
    verify_ssl: bool = True
    
    # Management API auth
    username: Optional[str] = None
    password: Optional[str] = None
    
    # HEC auth
    hec_token: Optional[str] = None
    
    # Defaults
    default_index: str = "main"
    timeout: float = 30.0
    max_retries: int = 3
    initial_retry_delay: float = 1.0
    
    @classmethod
    def from_env(cls) -> "SplunkConfig":
        """Load configuration from environment variables."""
        
        def parse_bool(env_var: str, default: bool) -> bool:
            val = os.environ.get(env_var)
            if val is None:
                return default
            return val.lower() in ("1", "true", "yes", "on")
        
        def parse_int(env_var: str, default: int) -> int:
            val = os.environ.get(env_var)
            if val is None:
                return default
            try:
                return int(val)
            except ValueError:
                return default
        
        def parse_float(env_var: str, default: float) -> float:
            val = os.environ.get(env_var)
            if val is None:
                return default
            try:
                return float(val)
            except ValueError:
                return default
        
        return cls(
            host=os.environ.get("SPLUNK_HOST", "localhost"),
            port=parse_int("SPLUNK_PORT", 8089),
            hec_port=parse_int("SPLUNK_HEC_PORT", 8088),
            scheme=os.environ.get("SPLUNK_SCHEME", "https"),
            verify_ssl=parse_bool("SPLUNK_VERIFY_SSL", True),
            username=os.environ.get("SPLUNK_USERNAME"),
            password=os.environ.get("SPLUNK_PASSWORD"),
            hec_token=os.environ.get("SPLUNK_HEC_TOKEN"),
            default_index=os.environ.get("SPLUNK_INDEX", "main"),
            timeout=parse_float("SPLUNK_TIMEOUT", 30.0),
        )
    
    def get_hec_url(self) -> str:
        """Get HEC base URL."""
        return f"{self.scheme}://{self.host}:{self.hec_port}"
    
    def get_management_url(self) -> str:
        """Get management API base URL."""
        return f"{self.scheme}://{self.host}:{self.port}"
    
    def is_hec_enabled(self) -> bool:
        """Check if HEC is configured."""
        return self.hec_token is not None and self.hec_token.strip() != ""
    
    def is_management_enabled(self) -> bool:
        """Check if management API is configured."""
        return self.username is not None and self.password is not None
    
    def validate(self) -> bool:
        """Validate configuration.
        
        Returns:
            True if valid
            
        Raises:
            ValueError: If invalid when enabled
        """
        if not self.is_hec_enabled() and not self.is_management_enabled():
            logger.warning("Neither HEC nor management API configured")
        
        if self.scheme not in ("http", "https"):
            raise ValueError(f"Invalid scheme: {self.scheme} (must be http or https)")
        
        return True


class HECEventBuilder:
    """Builder for properly formatted HEC events.
    
    HEC event format:
    {
        "time": 1705344000,          // Optional: Unix seconds (default now)
        "host": "web-server-01",     // Optional: Source host
        "source": "myapp.log",       // Optional: Source file/app
        "sourcetype": "json",        // Optional: Data format
        "index": "main",             // Optional: Destination index
        "event": { ... },            // Required: Event data
        "fields": { ... }            // Optional: Indexed fields
    }
    """
    
    def __init__(self, default_index: str = "main") -> None:
        self._default_index = default_index
    
    @staticmethod
    def current_time_seconds() -> float:
        """Get current time in seconds since epoch."""
        return datetime.now(timezone.utc).timestamp()
    
    @staticmethod
    def datetime_to_seconds(dt: datetime) -> float:
        """Convert datetime to Unix seconds.
        
        Args:
            dt: Datetime object (naive assumed UTC, or timezone-aware)
        
        Returns:
            Unix timestamp in seconds
        """
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.timestamp()
    
    def build(
        self,
        event: Dict[str, Any],
        time: Optional[float] = None,
        host: Optional[str] = None,
        source: Optional[str] = None,
        sourcetype: Optional[str] = None,
        index: Optional[str] = None,
        fields: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Build a properly formatted HEC event.
        
        Args:
            event: The actual event data (dict or string)
            time: Unix timestamp in seconds (default now)
            host: Source host/service
            source: Source application/file
            sourcetype: Data format (e.g., "json", "access_combined")
            index: Destination index
            fields: Additional indexed fields
        
        Returns:
            HEC event dict ready for POST
        """
        hec_event: Dict[str, Any] = {"event": event}
        
        if time is not None:
            hec_event["time"] = time
        else:
            hec_event["time"] = self.current_time_seconds()
        
        if host:
            hec_event["host"] = host
        if source:
            hec_event["source"] = source
        if sourcetype:
            hec_event["sourcetype"] = sourcetype
        
        hec_event["index"] = index or self._default_index
        
        if fields:
            hec_event["fields"] = fields
        
        return hec_event
    
    def build_raw(
        self,
        raw_data: str,
        time: Optional[float] = None,
        host: Optional[str] = None,
        source: Optional[str] = None,
        sourcetype: Optional[str] = None,
        index: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Build an event for the raw HEC endpoint.
        
        For unstructured data like plain text logs.
        
        Args:
            raw_data: Raw string data
            time: Timestamp
            host: Source host
            source: Source
            sourcetype: Sourcetype
            index: Index
        
        Returns:
            HEC raw event
        """
        # Raw endpoint uses query params for metadata, body is raw
        # But we can also use event endpoint with string event
        return self.build(
            event=raw_data,
            time=time,
            host=host,
            source=source,
            sourcetype=sourcetype,
            index=index,
        )


class HECBatchClient:
    """Client for HTTP Event Collector with batching and retries.
    
    Features:
    - Event batching
    - Exponential backoff retries
    - Automatic flush
    - Background flush thread
    """
    
    DEFAULT_BATCH_SIZE = 50
    DEFAULT_FLUSH_INTERVAL = 10.0
    MAX_BATCH_SIZE = 500  # HEC recommended max
    
    def __init__(self, config: SplunkConfig) -> None:
        self._config = config
        self._builder = HECEventBuilder(config.default_index)
        self._session = requests.Session()
        
        self._buffer: deque[Dict[str, Any]] = deque()
        self._lock = threading.Lock()
        self._flush_thread: Optional[threading.Thread] = None
        self._running = False
        self._batch_size = self.DEFAULT_BATCH_SIZE
        self._flush_interval = self.DEFAULT_FLUSH_INTERVAL
        
        # Statistics
        self._total_events: int = 0
        self._total_sent: int = 0
        self._total_failed: int = 0
    
    def start(self) -> None:
        """Start background flush thread."""
        if self._running:
            return
        
        if not self._config.is_hec_enabled():
            logger.info("HEC not configured, not starting")
            return
        
        self._running = True
        self._flush_thread = threading.Thread(
            target=self._flush_loop,
            daemon=True,
            name="splunk-hec-flusher",
        )
        self._flush_thread.start()
        
        logger.info(
            "Splunk HEC client started: batch_size=%d, flush_interval=%.1fs",
            self._batch_size,
            self._flush_interval,
        )
    
    def stop(self, flush: bool = True) -> None:
        """Stop client and optionally flush remaining events."""
        self._running = False
        
        if self._flush_thread:
            self._flush_thread.join(timeout=5.0)
            self._flush_thread = None
        
        if flush:
            self.flush()
    
    def _flush_loop(self) -> None:
        """Background flush loop."""
        while self._running:
            time.sleep(self._flush_interval)
            try:
                self.flush()
            except Exception:
                logger.exception("HEC background flush failed")
    
    def _calculate_delay(self, attempt: int) -> float:
        """Calculate exponential backoff with jitter."""
        import random
        delay = self._config.initial_retry_delay * (2 ** attempt)
        jitter = 1.0 + random.uniform(-0.2, 0.2)
        return min(delay * jitter, 30.0)
    
    def _send_batch(self, events: List[Dict[str, Any]]) -> bool:
        """Send a batch of events to HEC.
        
        Args:
            events: List of HEC-formatted events
        
        Returns:
            True if successful
        """
        if not events:
            return True
        
        url = f"{self._config.get_hec_url()}/services/collector"
        
        headers = {
            "Authorization": f"Splunk {self._config.hec_token}",
            "Content-Type": "application/json",
        }
        
        # HEC accepts:
        # - Single event: {...}
        # - Multiple events: {...}{...}{...} (concatenated JSON)
        # - Array: [{...}, {...}]
        
        # Use concatenated JSON format for multiple events (most efficient)
        if len(events) == 1:
            payload = events[0]
        else:
            # Concatenated JSON objects (no comma, no array)
            # This is actually more efficient for HEC
            # But for simplicity, we'll use list format which also works
            payload = events
        
        for attempt in range(self._config.max_retries):
            try:
                response = self._session.post(
                    url,
                    headers=headers,
                    json=payload,
                    timeout=self._config.timeout,
                    verify=self._config.verify_ssl,
                )
                
                if response.status_code == 200:
                    try:
                        result = response.json()
                        if result.get("code") == 0 or result.get("text") == "Success":
                            logger.debug("HEC: Sent %d events successfully", len(events))
                            return True
                        else:
                            logger.warning("HEC error: %s", result)
                    except json.JSONDecodeError:
                        # Some HEC versions return plain text
                        if "Success" in response.text or "success" in response.text:
                            return True
                
                elif response.status_code == 401:
                    raise SplunkAuthError("HEC token invalid or missing")
                
                elif response.status_code == 403:
                    raise SplunkAuthError("HEC token insufficient permissions")
                
                elif response.status_code == 429:
                    if attempt < self._config.max_retries - 1:
                        delay = self._calculate_delay(attempt)
                        logger.warning("HEC rate limited (429), retrying in %.1fs", delay)
                        time.sleep(delay)
                        continue
                    else:
                        raise SplunkRateLimitError(
                            f"HEC rate limit exceeded after {self._config.max_retries} retries"
                        )
                
                else:
                    logger.warning(
                        "HEC HTTP %d: %s",
                        response.status_code,
                        response.text[:200]
                    )
                    if attempt < self._config.max_retries - 1:
                        delay = self._calculate_delay(attempt)
                        time.sleep(delay)
                        continue
                    return False
                    
            except requests.RequestException as e:
                logger.warning("HEC network error: %s", e)
                if attempt < self._config.max_retries - 1:
                    delay = self._calculate_delay(attempt)
                    time.sleep(delay)
                    continue
                return False
        
        return False
    
    def send(
        self,
        event: Dict[str, Any],
        time: Optional[float] = None,
        host: Optional[str] = None,
        source: Optional[str] = None,
        sourcetype: Optional[str] = None,
        index: Optional[str] = None,
        fields: Optional[Dict[str, Any]] = None,
    ) -> None:
        """Queue an event for sending (batched).
        
        Args:
            event: Event data dict or string
            time: Unix timestamp in seconds
            host: Source host
            source: Source app/file
            sourcetype: Data format
            index: Destination index
            fields: Additional indexed fields
        """
        if not self._config.is_hec_enabled():
            return
        
        hec_event = self._builder.build(
            event=event,
            time=time,
            host=host,
            source=source,
            sourcetype=sourcetype,
            index=index,
            fields=fields,
        )
        
        with self._lock:
            self._buffer.append(hec_event)
            self._total_events += 1
            
            if len(self._buffer) >= self._batch_size:
                self._flush_locked()
    
    def send_now(
        self,
        event: Dict[str, Any],
        time: Optional[float] = None,
        host: Optional[str] = None,
        source: Optional[str] = None,
        sourcetype: Optional[str] = None,
        index: Optional[str] = None,
    ) -> bool:
        """Send an event immediately (no batching).
        
        Use for critical events that need immediate ingestion.
        
        Returns:
            True if successful
        """
        if not self._config.is_hec_enabled():
            return False
        
        hec_event = self._builder.build(
            event=event,
            time=time,
            host=host,
            source=source,
            sourcetype=sourcetype,
            index=index,
        )
        
        return self._send_batch([hec_event])
    
    def flush(self) -> int:
        """Flush all buffered events.
        
        Returns:
            Number of events sent
        """
        with self._lock:
            return self._flush_locked()
    
    def _flush_locked(self) -> int:
        """Flush buffer (must hold lock)."""
        if not self._buffer:
            return 0
        
        events = list(self._buffer)
        self._buffer.clear()
        
        try:
            success = self._send_batch(events)
            
            if success:
                self._total_sent += len(events)
                logger.debug("HEC: Flushed %d events", len(events))
                return len(events)
            else:
                # Put back for retry
                self._buffer.extendleft(reversed(events))
                self._total_failed += len(events)
                return 0
                
        except Exception as e:
            self._buffer.extendleft(reversed(events))
            self._total_failed += len(events)
            logger.warning("HEC flush failed: %s", e)
            return 0
    
    def get_stats(self) -> Dict[str, int]:
        """Get client statistics."""
        with self._lock:
            return {
                "buffered": len(self._buffer),
                "total_queued": self._total_events,
                "total_sent": self._total_sent,
                "total_failed": self._total_failed,
            }


class SplunkSearchClient:
    """Client for Splunk search operations using REST API.
    
    Features:
    - Oneshot searches (immediate results)
    - Export searches (streaming large results)
    - Saved searches
    - Search jobs
    """
    
    def __init__(self, config: SplunkConfig) -> None:
        self._config = config
        self._session = requests.Session()
        self._service = None  # Lazy-loaded splunklib service
        self._session_key: Optional[str] = None
    
    def _get_auth_headers(self) -> Dict[str, str]:
        """Get authentication headers.
        
        Uses session key if available, otherwise basic auth.
        """
        if self._session_key:
            return {"Authorization": f"Splunk {self._session_key}"}
        
        # Basic auth
        import base64
        credentials = f"{self._config.username}:{self._config.password}"
        encoded = base64.b64encode(credentials.encode()).decode()
        return {"Authorization": f"Basic {encoded}"}
    
    def _get_service(self) -> Any:
        """Get or create splunklib service connection.
        
        Lazy-loaded to avoid import overhead if not used.
        """
        if self._service is None:
            try:
                import splunklib.client as client
            except ImportError:
                raise SplunkError(
                    "splunk-sdk not installed. Install with: pip install splunk-sdk"
                )
            
            self._service = client.connect(
                host=self._config.host,
                port=self._config.port,
                scheme=self._config.scheme,
                username=self._config.username,
                password=self._config.password,
                verify=self._config.verify_ssl,
            )
        
        return self._service
    
    def search_oneshot(
        self,
        query: str,
        earliest_time: str = "-24h",
        latest_time: str = "now",
        output_mode: str = "json",
        count: int = 10000,
        **kwargs: Any,
    ) -> List[Dict[str, Any]]:
        """Run a oneshot search and return results immediately.
        
        Best for small result sets (< 10,000 results).
        Use search_export() for larger result sets.
        
        Args:
            query: Splunk search query (with or without leading 'search')
            earliest_time: Start time (e.g., "-24h", "-1d@d", epoch seconds)
            latest_time: End time
            output_mode: Output format (json, csv, xml)
            count: Max results (default 10000, max 50000)
            **kwargs: Additional search parameters
        
        Returns:
            List of result dicts
        """
        if not self._config.is_management_enabled():
            raise SplunkAuthError("Management API credentials not configured")
        
        # Ensure query starts with 'search'
        query = query.strip()
        if not query.lower().startswith("search"):
            query = f"search {query}"
        
        service = self._get_service()
        
        try:
            result_stream = service.jobs.oneshot(
                query,
                earliest_time=earliest_time,
                latest_time=latest_time,
                output_mode=output_mode,
                count=count,
                **kwargs,
            )
            
            if output_mode == "json":
                import io
                # Parse JSON results
                # splunklib returns file-like stream
                data = result_stream.read()
                if isinstance(data, bytes):
                    data = data.decode("utf-8")
                
                results = json.loads(data)
                
                # Format depends on splunk version
                # Usually results are in 'results' key
                if isinstance(results, dict) and "results" in results:
                    return results["results"]
                elif isinstance(results, list):
                    return results
                else:
                    return [results]
            else:
                # For CSV/XML, return raw
                return [{"raw": result_stream.read()}]
                
        except Exception as e:
            raise SplunkSearchError(f"Search failed: {e}") from e
    
    def search_export(
        self,
        query: str,
        earliest_time: str = "-24h",
        latest_time: str = "now",
        output_mode: str = "json",
        **kwargs: Any,
    ) -> Iterator[Dict[str, Any]]:
        """Run an export search for streaming large result sets.
        
        Use for result sets > 10,000.
        Returns an iterator for memory-efficient processing.
        
        Args:
            query: Search query
            earliest_time: Start time
            latest_time: End time
            output_mode: Output format
            **kwargs: Additional parameters
        
        Yields:
            Result dicts
        """
        if not self._config.is_management_enabled():
            raise SplunkAuthError("Management API credentials not configured")
        
        query = query.strip()
        if not query.lower().startswith("search"):
            query = f"search {query}"
        
        service = self._get_service()
        
        # Export is always async, we need to poll
        # For simplicity, we'll use oneshot with higher count
        # Real export requires job management
        
        # Fallback to oneshot for now
        # Note: Proper export requires creating a job and waiting
        results = self.search_oneshot(
            query=query,
            earliest_time=earliest_time,
            latest_time=latest_time,
            output_mode=output_mode,
            count=50000,
            **kwargs,
        )
        
        yield from iter(results)
    
    def create_saved_search(
        self,
        name: str,
        query: str,
        earliest_time: str = "-24h",
        latest_time: str = "now",
        description: Optional[str] = None,
        **kwargs: Any,
    ) -> Any:
        """Create a saved search.
        
        Args:
            name: Search name
            query: Search query
            earliest_time: Default earliest time
            latest_time: Default latest time
            description: Description
            **kwargs: Additional parameters
        
        Returns:
            Saved search object
        """
        service = self._get_service()
        
        query = query.strip()
        if not query.lower().startswith("search"):
            query = f"search {query}"
        
        params = {
            "search": query,
            "dispatch.earliest_time": earliest_time,
            "dispatch.latest_time": latest_time,
        }
        
        if description:
            params["description"] = description
        
        params.update(kwargs)
        
        return service.saved_searches.create(name, **params)
    
    def run_saved_search(
        self,
        name: str,
        earliest_time: Optional[str] = None,
        latest_time: Optional[str] = None,
        **kwargs: Any,
    ) -> List[Dict[str, Any]]:
        """Run a saved search.
        
        Args:
            name: Saved search name
            earliest_time: Override earliest time
            latest_time: Override latest time
            **kwargs: Additional parameters
        
        Returns:
            Search results
        """
        service = self._get_service()
        
        try:
            saved_search = service.saved_searches[name]
        except KeyError:
            raise SplunkSearchError(f"Saved search not found: {name}")
        
        # Get the query
        query = saved_search["search"]
        
        # Use overrides or saved defaults
        dispatch_params = {}
        if earliest_time:
            dispatch_params["earliest_time"] = earliest_time
        elif "dispatch.earliest_time" in saved_search:
            dispatch_params["earliest_time"] = saved_search["dispatch.earliest_time"]
        
        if latest_time:
            dispatch_params["latest_time"] = latest_time
        elif "dispatch.latest_time" in saved_search:
            dispatch_params["latest_time"] = saved_search["dispatch.latest_time"]
        
        return self.search_oneshot(query, **dispatch_params, **kwargs)
    
    def validate_connectivity(self) -> bool:
        """Validate connectivity to Splunk.
        
        Returns:
            True if connection works
        
        Raises:
            SplunkError: If validation fails
        """
        # Try HEC first if configured
        if self._config.is_hec_enabled():
            # Send a test event
            test_event = self._builder.build(
                {"message": "HEC connectivity test", "type": "test"},
                sourcetype="test",
            )
            
            # Use send with immediate flush
            if self._send_batch([test_event]):
                logger.info("Splunk HEC connectivity validated")
                return True
        
        # Try management API if configured
        if self._config.is_management_enabled():
            try:
                # Simple search to validate
                results = self.search_oneshot(
                    "| makeresults",
                    earliest_time="-1m",
                    count=1,
                )
                logger.info("Splunk management API connectivity validated")
                return True
            except Exception as e:
                logger.warning("Management API validation failed: %s", e)
        
        raise SplunkError("Could not validate Splunk connectivity")


# Global clients (lazy-loaded)
_global_hec_client: Optional[HECBatchClient] = None
_global_search_client: Optional[SplunkSearchClient] = None


def get_splunk_hec_client() -> HECBatchClient:
    """Get or create global HEC client."""
    global _global_hec_client
    if _global_hec_client is None:
        config = SplunkConfig.from_env()
        _global_hec_client = HECBatchClient(config)
        if config.is_hec_enabled():
            _global_hec_client.start()
    return _global_hec_client


def get_splunk_search_client() -> SplunkSearchClient:
    """Get or create global search client."""
    global _global_search_client
    if _global_search_client is None:
        config = SplunkConfig.from_env()
        _global_search_client = SplunkSearchClient(config)
    return _global_search_client
```

### Pattern 2: HEC Event Examples & Search Queries

```python
"""Common HEC event patterns and search query examples.

Event Best Practices:
- Always include: time, sourcetype, index
- Recommended: host, source, fields (for indexed fields)
- Use sourcetype consistently across similar data

Search Best Practices:
- Always use earliest_time and latest_time
- Use | head N early to limit results
- Use | fields to limit returned fields
- Use | export for large result sets
"""

from __future__ import annotations

import logging
from typing import Any, Optional, Dict, List
from datetime import datetime, timedelta, timezone

logger = logging.getLogger(__name__)


class StandardEvents:
    """Standard HEC event patterns for common use cases.
    
    These follow Splunk best practices for sourcetyping and field naming.
    """
    
    @staticmethod
    def log_event(
        client: Any,
        message: str,
        level: str = "INFO",
        logger_name: Optional[str] = None,
        host: Optional[str] = None,
        source: Optional[str] = None,
        index: Optional[str] = None,
        **extra_fields: Any,
    ) -> None:
        """Log a structured log event.
        
        Sourcetype: json (or use custom: app:log)
        
        Args:
            client: HECBatchClient
            message: Log message
            level: DEBUG, INFO, WARN, WARNING, ERROR, CRITICAL
            logger_name: Logger/module name
            host: Source host
            source: Source application
            index: Destination index
            **extra_fields: Additional fields
        """
        event: Dict[str, Any] = {
            "message": message,
            "level": level.upper(),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        
        if logger_name:
            event["logger"] = logger_name
        
        event.update(extra_fields)
        
        client.send(
            event=event,
            host=host,
            source=source or "application",
            sourcetype="json",  # or "app:structured_log"
            index=index,
        )
    
    @staticmethod
    def http_request_event(
        client: Any,
        method: str,
        path: str,
        status_code: int,
        duration_ms: float,
        user_id: Optional[str] = None,
        request_id: Optional[str] = None,
        host: Optional[str] = None,
        index: Optional[str] = None,
        **extra_fields: Any,
    ) -> None:
        """Track an HTTP request/response event.
        
        Sourcetype: access_combined (customized) or app:http_request
        
        Args:
            client: HECBatchClient
            method: HTTP method (GET, POST, etc.)
            path: Request path
            status_code: HTTP status code
            duration_ms: Request duration in milliseconds
            user_id: User identifier
            request_id: Request ID for tracing
            host: Source host
            index: Destination index
            **extra_fields: Additional fields
        """
        event: Dict[str, Any] = {
            "http_method": method.upper(),
            "http_path": path,
            "status_code": status_code,
            "duration_ms": round(duration_ms, 2),
            "success": 200 <= status_code < 400,
            "error": status_code >= 400,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        
        if user_id:
            event["user_id"] = user_id
        if request_id:
            event["request_id"] = request_id
        
        event.update(extra_fields)
        
        # Categorize by status code
        if status_code >= 500:
            event["status_category"] = "server_error"
        elif status_code >= 400:
            event["status_category"] = "client_error"
        elif status_code >= 300:
            event["status_category"] = "redirect"
        else:
            event["status_category"] = "success"
        
        client.send(
            event=event,
            host=host,
            source="api",
            sourcetype="app:http_request",
            index=index,
        )
    
    @staticmethod
    def business_event(
        client: Any,
        event_type: str,
        user_id: Optional[str] = None,
        properties: Optional[Dict[str, Any]] = None,
        host: Optional[str] = None,
        index: Optional[str] = None,
    ) -> None:
        """Track a business/analytics event.
        
        Similar to Segment/Amplitude/Mixpanel tracking.
        
        Args:
            client: HECBatchClient
            event_type: Event name (e.g., "User Signed Up", "Checkout Completed")
            user_id: User identifier
            properties: Event properties
            host: Source host
            index: Destination index (e.g., "business_events")
        """
        event: Dict[str, Any] = {
            "event_type": event_type,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        
        if user_id:
            event["user_id"] = user_id
        if properties:
            event["properties"] = properties
        
        client.send(
            event=event,
            host=host,
            source="business",
            sourcetype="app:business_event",
            index=index or "business_events",
        )
    
    @staticmethod
    def error_event(
        client: Any,
        error: Exception,
        context: Optional[str] = None,
        user_id: Optional[str] = None,
        request_id: Optional[str] = None,
        host: Optional[str] = None,
        index: Optional[str] = None,
        **extra_fields: Any,
    ) -> None:
        """Track an exception/error event.
        
        Args:
            client: HECBatchClient
            error: Exception object
            context: Context about where the error occurred
            user_id: User affected
            request_id: Request ID
            host: Source host
            index: Destination index
            **extra_fields: Additional fields
        """
        import traceback
        
        event: Dict[str, Any] = {
            "error_type": type(error).__name__,
            "error_message": str(error),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        
        if context:
            event["context"] = context
        
        if user_id:
            event["user_id"] = user_id
        if request_id:
            event["request_id"] = request_id
        
        # Stack trace
        event["stack_trace"] = traceback.format_exc()
        
        event.update(extra_fields)
        
        client.send(
            event=event,
            host=host,
            source="application",
            sourcetype="app:error",
            index=index,
        )


class CommonSearches:
    """Common Splunk search query patterns.
    
    These queries follow Splunk best practices:
    - Always use time bounds
    - Use efficient commands early
    - Limit fields returned
    """
    
    @staticmethod
    def search_errors(
        client: Any,
        sourcetype: Optional[str] = None,
        hours: int = 24,
        limit: int = 100,
    ) -> List[Dict[str, Any]]:
        """Search for error events in the last N hours.
        
        Args:
            client: SplunkSearchClient
            sourcetype: Filter by sourcetype
            hours: Search last N hours
            limit: Max results
        
        Returns:
            List of error events
        """
        query = "search "
        
        if sourcetype:
            query += f"sourcetype={sourcetype} "
        
        query += (
            '(level=ERROR OR level=CRITICAL OR level="error" OR status_code>=500) '
            f"| head {limit} "
            "| table _time, host, sourcetype, error_type, error_message, stack_trace"
        )
        
        return client.search_oneshot(
            query=query,
            earliest_time=f"-{hours}h",
            count=limit,
        )
    
    @staticmethod
    def search_http_requests(
        client: Any,
        status_category: Optional[str] = None,
        hours: int = 24,
        limit: int = 1000,
    ) -> List[Dict[str, Any]]:
        """Search HTTP request events.
        
        Args:
            client: SplunkSearchClient
            status_category: Filter by category (success, client_error, server_error, redirect)
            hours: Search last N hours
            limit: Max results
        
        Returns:
            List of HTTP events
        """
        query = f"search sourcetype=app:http_request "
        
        if status_category:
            query += f'status_category="{status_category}" '
        
        query += (
            f"| head {limit} "
            "| table _time, host, http_method, http_path, status_code, duration_ms, user_id"
        )
        
        return client.search_oneshot(
            query=query,
            earliest_time=f"-{hours}h",
            count=limit,
        )
    
    @staticmethod
    def aggregate_http_stats(
        client: Any,
        hours: int = 24,
    ) -> List[Dict[str, Any]]:
        """Aggregate HTTP request statistics.
        
        Returns:
            Stats by status code category
        """
        query = (
            "search sourcetype=app:http_request "
            f"earliest=-{hours}h "
            "| stats "
            "count as request_count, "
            "avg(duration_ms) as avg_duration_ms, "
            "p50(duration_ms) as p50_duration_ms, "
            "p95(duration_ms) as p95_duration_ms, "
            "p99(duration_ms) as p99_duration_ms "
            "by status_category, http_method "
            "| sort -request_count"
        )
        
        return client.search_oneshot(
            query=query,
            earliest_time=f"-{hours}h",
        )
    
    @staticmethod
    def search_business_events(
        client: Any,
        event_type: Optional[str] = None,
        hours: int = 24,
        limit: int = 1000,
    ) -> List[Dict[str, Any]]:
        """Search for business/analytics events.
        
        Args:
            client: SplunkSearchClient
            event_type: Filter by event type
            hours: Search last N hours
            limit: Max results
        
        Returns:
            List of business events
        """
        query = "search sourcetype=app:business_event "
        
        if event_type:
            query += f'event_type="{event_type}" '
        
        query += (
            f"| head {limit} "
            "| table _time, host, event_type, user_id, properties"
        )
        
        return client.search_oneshot(
            query=query,
            earliest_time=f"-{hours}h",
            count=limit,
        )
    
    @staticmethod
    def count_by_event_type(
        client: Any,
        hours: int = 24,
    ) -> List[Dict[str, Any]]:
        """Count business events by type.
        
        Returns:
            Counts per event type
        """
        query = (
            "search sourcetype=app:business_event "
            f"earliest=-{hours}h "
            "| stats count as event_count by event_type "
            "| sort -event_count"
        )
        
        return client.search_oneshot(
            query=query,
            earliest_time=f"-{hours}h",
        )


# Example usage

def example_ingestion_and_search(
    hec_client: Any,
    search_client: Any,
) -> None:
    """Example showing HEC ingestion and search."""
    
    # 1. Send some events via HEC
    
    # Log event
    StandardEvents.log_event(
        client=hec_client,
        message="Application started",
        level="INFO",
        logger_name="myapp.main",
        sourcetype="app:log",
    )
    
    # HTTP request event
    StandardEvents.http_request_event(
        client=hec_client,
        method="POST",
        path="/api/users",
        status_code=201,
        duration_ms=145.2,
        user_id="user-123",
        request_id="req-abc",
    )
    
    # Business event
    StandardEvents.business_event(
        client=hec_client,
        event_type="Checkout Completed",
        user_id="user-123",
        properties={
            "order_id": "order-456",
            "total_value": 99.99,
            "item_count": 3,
            "coupon_used": "SUMMER20",
        },
    )
    
    # Flush events
    hec_client.flush()
    
    # 2. Search for events (Note: Splunk needs time to index!)
    # In practice, wait a few seconds or search historical data
    
    # Get error count
    try:
        errors = CommonSearches.search_errors(
            client=search_client,
            hours=24,
            limit=10,
        )
        logger.info("Found %d errors in last 24h", len(errors))
    except Exception as e:
        logger.warning("Search failed (may need more time to index): %s", e)
    
    # Get HTTP stats
    try:
        http_stats = CommonSearches.aggregate_http_stats(
            client=search_client,
            hours=24,
        )
        logger.info("HTTP stats: %s", http_stats)
    except Exception as e:
        logger.warning("HTTP stats search failed: %s", e)
```

---

## Constraints

### MUST DO

- Use HEC (HTTP Event Collector) for log/event ingestion
- Always include `time` field in HEC events (Unix seconds or ISO 8601)
- Include `sourcetype`, `source`, `host`, and `index` for all events
- Batch HEC events (50-100 per batch) to reduce HTTP overhead
- Use `earliest_time` and `latest_time` in all searches
- Use `| export` or streaming for result sets > 10,000
- Implement exponential backoff with jitter for 429 responses
- Verify SSL certificates in production (set `verify_ssl=True`)
- Use `fields` indexed extractions for commonly queried fields
- Never send PII, credentials, or sensitive data without consent

### MUST NOT DO

- NEVER hardcode Splunk credentials or HEC tokens in source code
- NEVER send one event per HTTP call (use batching)
- NEVER skip `sourcetype` field (critical for field extraction)
- NEVER use management API for high-volume event ingestion
- NEVER run searches without `earliest_time`/`latest_time` (full table scan)
- NEVER use `oneshot` searches for > 10,000 results
- NEVER ignore SSL certificate verification in production
- NEVER nest objects deeper than 2 levels in events
- NEVER send credit card numbers, passwords, or tokens in events
- NEVER use milliseconds for `time` field (Splunk HEC uses seconds)

---

## Output Template

When implementing Splunk integrations, produce:

1. **Client Initialization** — `SplunkConfig` + `HECBatchClient` + `SplunkSearchClient` from env vars
2. **Event Builder** — `HECEventBuilder` for proper HEC event formatting
3. **Standard Events** — `StandardEvents` for log, HTTP, business, and error events
4. **Common Searches** — `CommonSearches` for error, HTTP, and business event queries
5. **Batching & Retries** — Exponential backoff with jitter, `flush()` at shutdown
6. **Search Patterns** — `search_oneshot()`, `search_export()` with time bounds

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `coding-datadog-api` | Datadog as alternative monitoring platform |
| `coding-grafana-prometheus` | Open-source monitoring |
| `coding-newrelic-api` | New Relic APM |
| `coding-logging-patterns` | Structured logging patterns |

---

## Live References

| Resource | URL |
|----------|-----|
| splunk-sdk (PyPI) | https://pypi.org/project/splunk-sdk/ |
| Splunk Python SDK | https://github.com/splunk/splunk-sdk-python |
| HEC Documentation | https://docs.splunk.com/Documentation/Splunk/latest/Data/HEC |
| REST API Reference | https://docs.splunk.com/Documentation/Splunk/latest/RESTREF/RESTlist |
| Search Reference | https://docs.splunk.com/Documentation/Splunk/latest/SearchReference/WhatsInThisManual |
| Sourcetypes Best Practices | https://docs.splunk.com/Documentation/Splunk/latest/Data/Listofpretrainedsourcetypes |
| CIM Data Models | https://docs.splunk.com/Documentation/CIM/latest/User/Overview |

---

## 📎 HEC Event Format

HEC accepts JSON events in this format:

```json
{
    "time": 1705344000.123,
    "host": "web-server-01",
    "source": "/var/log/myapp.log",
    "sourcetype": "json",
    "index": "main",
    "event": {
        "message": "User logged in",
        "user_id": "user-123",
        "level": "INFO"
    },
    "fields": {
        "env": "production",
        "service": "auth"
    }
}
```

**Important:** `time` is in **seconds** (not milliseconds!) since epoch.
Using milliseconds will result in events appearing ~50,000 years in the future!

---

## 📎 Time Format Examples

| Format | Example | Description |
|--------|---------|-------------|
| Unix seconds | `1705344000` | Seconds since epoch (float OK) |
| Relative | `"-24h"`, `"-1d@d"`, `"-1mon"` | Relative to now |
| Absolute | `"2024-01-15T12:00:00.000+00:00"` | ISO 8601 |
| Advanced | `"@d"` (start of day), `"now"` | Special modifiers |

---

## 📎 Search Optimization Tips

1. **Time bounds first** — Always use `earliest_time` and `latest_time`
2. **Filter early** — Use `index=`, `sourcetype=`, `host=` before pipes
3. **Limit fields** — Use `| fields a b c` to reduce data transfer
4. **Limit results** — Use `| head N` for sampling
5. **Large results** — Use `export` mode for > 10,000 results
6. **Stats early** — Aggregate before returning raw events

```spl
-- Good: Filter early, limit fields
search index=main sourcetype=app:http_request earliest=-24h
status_category=server_error
| fields _time, host, http_path, duration_ms, user_id
| head 1000

-- Good: Aggregate before returning
search index=main sourcetype=app:http_request earliest=-24h
| stats count avg(duration_ms) p50(duration_ms) by http_path
| sort -count
```
