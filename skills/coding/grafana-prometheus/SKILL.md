---
name: grafana-prometheus
description: Implements Grafana and Prometheus integration (metrics collection, querying,
  alerting rules, Grafana dashboards as code, PromQL patterns, and Grafana HTTP API
  for dashboard management, using prometheus-api-client and grafana-api Python SDKs.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: prometheus, promql queries, grafana dashboards, alerting rules, prometheus
    metrics, grafana api, how do i query prometheus metrics, monitoring as code
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
  related-skills: coding-datadog-api, coding-newrelic-api, coding-sentry-api
------
# Grafana & Prometheus Integration

Implements production-grade Prometheus metrics querying, PromQL patterns, Grafana dashboard management via HTTP API, and alerting rules as code. When loaded, this skill makes the model implement PromQL queries for time-series analysis, Grafana dashboard JSON templating, alerting rules with YAML, Prometheus HTTP API calls, and Grafana datasource management. All implementations follow Prometheus and Grafana best practices: use label-based filtering, avoid high-cardinality labels, use range vectors for aggregations, implement dashboard version control, and validate PromQL syntax before deployment.

## TL;DR Checklist

- [ ] Use `prometheus-api-client` for Prometheus HTTP API or direct HTTP calls to `/api/v1/query`
- [ ] Use `grafana-api` Python SDK or direct HTTP calls to Grafana HTTP API
- [ ] Read connection details from `PROMETHEUS_URL`, `GRAFANA_URL`, `GRAFANA_API_KEY` env vars
- [ ] Avoid high-cardinality labels (unique IDs, high-cardinality strings)
- [ ] Use `rate()` for counters, `irate()` for short-lived spikes
- [ ] Use `sum by (label)` instead of `sum without (label)` for clarity
- [ ] Always set time bounds (`start`, `end`, `step`) in range queries
- [ ] Use `offset` for comparison queries (week-over-week)
- [ ] Validate PromQL syntax before deployment
- [ ] Store Grafana dashboard JSON in version control (as code)
- [ ] Include `__name__` and job/instance labels for metric identification

---

## When to Use

Use this skill when:

- Querying Prometheus metrics using PromQL for time-series analysis
- Creating Grafana dashboards programmatically via API
- Managing Prometheus alerting rules as code (YAML format)
- Building automation that queries metrics for SLI/SLO calculations
- Creating recording rules for pre-aggregated metrics
- Migrating or copying dashboards between Grafana instances
- Setting up datasources programmatically
- Implementing custom alert notification channels
- Querying long-term trends via Prometheus-compatible stores (Thanos, Mimir, Cortex)
- Building dashboard templates with template variables

---

## When NOT to Use

- For Datadog-specific monitoring — use `coding-datadog-api` instead
- For New Relic APM — use `coding-newrelic-api` instead
- When you need error tracking only — use `coding-sentry-api` instead
- For push-based metrics (Graphite, StatsD push model) — Prometheus is pull-based
- When you need SaaS-hosted Grafana Cloud only (can use but other skills for SaaS)

---

## Core Workflow

1. **Initialize Connections** — Configure Prometheus client using `PROMETHEUS_URL` and Grafana client using `GRAFANA_URL` + `GRAFANA_API_KEY` from environment variables. **Checkpoint:** Validate connectivity with a simple query like `up` or Grafana `GET /api/health`.

2. **Select Metric & Label Strategy** — Define low-cardinality labels first: `job`, `instance`, `env`, `service`, `version`. Avoid high-cardinality: `request_id`, `user_id` (use only when necessary). **Checkpoint:** Every label must have known bounded cardinality — document expected value count.

3. **Construct PromQL Queries** — Use `rate()` for counters over time, `sum by (group)` for aggregations, `topk()` for ranking, `histogram_quantile()` for percentiles. Use range vectors with appropriate time windows. **Checkpoint:** Range queries always have `step` parameter; instant queries return single points.

4. **Build Dashboard as JSON** — Create Grafana dashboard JSON with panels, targets (PromQL queries), axes, legend, template variables. Use `templating.list` for variables. Store in version control. **Checkpoint:** Dashboard JSON is valid JSON, targets reference datasource by name or uid.

5. **Define Alerting Rules** — Write alerting rules in YAML format with `expr` (PromQL), `for` duration, `labels` for routing, `annotations` for context. Use `alertmanager_config` in Alertmanager. **Checkpoint:** Every alert has at least `severity` label and `summary` annotation.

6. **Validate & Deploy** — Validate PromQL using `promtool check rules` or API syntax check. Deploy rules via config reload or API. **Checkpoint:** No high-cardinality aggregations; all queries return in test queries return values.

---

## Implementation Patterns

### Pattern 1: Prometheus Client Initialization (BAD vs GOOD)

```python
"""Prometheus and Grafana client initialization patterns.

Two primary approaches:
1. prometheus-api-client: Official Python SDK for HTTP API
2. Direct HTTP requests: Simple HTTP calls (works everywhere)
3. grafana-api: Python SDK for Grafana HTTP API

Endpoints:
- Prometheus: http://prometheus:9090/api/v1/
- Grafana: http://grafana:3000/api/
"""

from __future__ import annotations

import os
import json
import logging
import time
from typing import Any, Optional
from datetime import datetime, timedelta, timezone
from urllib.parse import urljoin

import requests

logger = logging.getLogger(__name__)


# ===================================================================
# ❌ BAD — hardcoded URLs, no validation, error handling missing
# ===================================================================

def bad_prometheus_init_bad() -> dict[str, Any]:
    """❌ BAD: Hardcoded URLs, no timeout, no validation."""
    
    # ❌ Hardcoded! Should come from config/env
    prometheus_url = "http://localhost:9090"
    grafana_url = "http://localhost:3000"
    
    # ❌ No API key handling
    # ❌ No timeout
    # ❌ No validation
    return {"prometheus_url": prometheus_url, "grafana_url": grafana_url}


# ===================================================================
# ✅ GOOD — env-based config, validation, typed errors
# ===================================================================


class PrometheusGrafanaError(Exception):
    """Base exception for Prometheus/Grafana client errors."""
    pass


class PrometheusQueryError(PrometheusGrafanaError):
    """Prometheus query returned error status."""
    pass


class GrafanaAPIError(PrometheusGrafanaError):
    """Grafana API call failed."""
    pass


class PrometheusConfig:
    """Prometheus configuration from environment variables.
    
    Environment variables:
        PROMETHEUS_URL: Base URL (http://prometheus:9090)
        PROMETHEUS_USERNAME: Optional basic auth username
        PROMETHEUS_PASSWORD: Optional basic auth password
    """
    
    def __init__(
        self,
        url: str,
        username: Optional[str] = None,
        password: Optional[str] = None,
        timeout: float = 30.0,
    ) -> None:
        if not url or not url.strip():
            raise ValueError("Prometheus URL cannot be empty")
        
        # Normalize URL (ensure no trailing slash)
        self.url = url.rstrip("/")
        self.username = username
        self.password = password
        self.timeout = timeout
    
    @classmethod
    def from_env(cls) -> "PrometheusConfig":
        """Load from environment variables."""
        url = os.environ.get("PROMETHEUS_URL", "http://localhost:9090")
        return cls(
            url=url,
            username=os.environ.get("PROMETHEUS_USERNAME"),
            password=os.environ.get("PROMETHEUS_PASSWORD"),
        )
    
    def get_api_url(self, endpoint: str) -> str:
        """Build full API URL for endpoint.
        
        Args:
            endpoint: e.g., "/api/v1/query" or "api/v1/query"
        """
        endpoint = endpoint.lstrip("/")
        if not endpoint.startswith("api/"):
            endpoint = "api/v1/" + endpoint.lstrip("/")
        return f"{self.url}/{endpoint}"


class GrafanaConfig:
    """Grafana configuration from environment variables.
    
    Environment variables:
        GRAFANA_URL: Base URL (http://grafana:3000)
        GRAFANA_API_KEY: API token or Service Account token
        GRAFANA_USER: Optional basic auth username
        GRAFANA_PASSWORD: Optional basic auth password
    """
    
    AUTH_API_KEY = "api_key"
    AUTH_BASIC = "basic"
    
    def __init__(
        self,
        url: str,
        api_key: Optional[str] = None,
        username: Optional[str] = None,
        password: Optional[str] = None,
        timeout: float = 30.0,
    ) -> None:
        if not url or not url.strip():
            raise ValueError("Grafana URL cannot be empty")
        
        self.url = url.rstrip("/")
        self.api_key = api_key.strip() if api_key else None
        self.username = username
        self.password = password
        self.timeout = timeout
        
        # Determine auth method
        if self.api_key:
            self.auth_method = self.AUTH_API_KEY
        elif self.username and self.password:
            self.auth_method = self.AUTH_BASIC
        else:
            self.auth_method = None  # No auth (local dev)
    
    @classmethod
    def from_env(cls) -> "GrafanaConfig":
        """Load from environment variables."""
        url = os.environ.get("GRAFANA_URL", "http://localhost:3000")
        return cls(
            url=url,
            api_key=os.environ.get("GRAFANA_API_KEY"),
            username=os.environ.get("GRAFANA_USER"),
            password=os.environ.get("GRAFANA_PASSWORD"),
        )
    
    def get_api_url(self, endpoint: str) -> str:
        """Build full API URL."""
        endpoint = endpoint.lstrip("/")
        if not endpoint.startswith("api/"):
            endpoint = "api/" + endpoint.lstrip("/")
        return f"{self.url}/{endpoint}"


class PrometheusClient:
    """Client for Prometheus HTTP API.
    
    Implements:
    - Instant queries (single point in time)
    - Range queries (time series over interval)
    - Label queries
    - Series queries
    - Rules queries
    """
    
    def __init__(self, config: PrometheusConfig) -> None:
        self._config = config
        self._session = requests.Session()
    
    def _request(
        self,
        method: str,
        endpoint: str,
        params: Optional[dict[str, Any]] = None,
        data: Optional[dict[str, Any]] = None,
    ) -> dict[str, Any]:
        """Make HTTP request to Prometheus API."""
        url = self._config.get_api_url(endpoint)
        
        auth: Optional[tuple[str, str]] = None
        if self._config.username and self._config.password:
            auth = (self._config.username, self._config.password)
        
        try:
            response = self._session.request(
                method=method,
                url=url,
                params=params,
                json=data,
                auth=auth,
                timeout=self._config.timeout,
            )
            
            # Parse response
            try:
                result = response.json()
            except json.JSONDecodeError:
                raise PrometheusQueryError(
                    f"Prometheus returned non-JSON: {response.status_code} {response.text[:200]}"
                )
            
            # Check Prometheus status field
            if result.get("status") == "error":
                error_type = result.get("errorType", "unknown")
                error_msg = result.get("error", "unknown error")
                raise PrometheusQueryError(f"Prometheus error [{error_type}]: {error_msg}")
            
            if response.status_code >= 400:
                raise PrometheusQueryError(
                    f"Prometheus HTTP {response.status_code}: {result}"
                )
            
            return result
            
        except requests.RequestException as e:
            raise PrometheusGrafanaError(f"Network error: {e}") from e
    
    def query_instant(
        self,
        query: str,
        time: Optional[float] = None,
    ) -> dict[str, Any]:
        """Execute an instant query (single point in time).
        
        Args:
            query: PromQL query string
            time: Optional Unix timestamp (defaults to now)
        
        Returns:
            Dict with 'resultType' and 'result' from Prometheus
        """
        params: dict[str, Any] = {"query": query}
        if time is not None:
            params["time"] = time
        
        response = self._request("GET", "query", params=params)
        return response.get("data", {})
    
    def query_range(
        self,
        query: str,
        start: float,
        end: float,
        step: str,  # e.g., "1m", "5m", "1h"
    ) -> dict[str, Any]:
        """Execute a range query (time series over interval).
        
        Args:
            query: PromQL query string
            start: Start Unix timestamp
            end: End Unix timestamp
            step: Resolution step (e.g., "1m", "5m")
        
        Returns:
            Dict with 'resultType' and 'result'
        """
        params: dict[str, Any] = {
            "query": query,
            "start": start,
            "end": end,
            "step": step,
        }
        
        response = self._request("GET", "query_range", params=params)
        return response.get("data", {})
    
    def query_range_relative(
        self,
        query: str,
        duration_seconds: float,
        step: str,
    ) -> dict[str, Any]:
        """Range query with relative time (now - duration to now).
        
        Args:
            query: PromQL query
            duration_seconds: How far back to query
            step: Resolution step
        
        Returns:
            Query results
        """
        now = datetime.now(timezone.utc).timestamp()
        start = now - duration_seconds
        
        return self.query_range(query, start, now, step)
    
    def get_label_values(self, label_name: str) -> list[str]:
        """Get all values for a label."""
        response = self._request("GET", f"label/{label_name}/values")
        return response.get("data", [])
    
    def get_series(
        self,
        matchers: list[str],
        start: Optional[float] = None,
        end: Optional[float] = None,
    ) -> list[dict[str, str]]:
        """Get time series matching selectors.
        
        Args:
            matchers: List of metric selectors, e.g., ['up', 'http_requests_total']
            start: Optional start time
            end: Optional end time
        
        Returns:
            List of label sets
        """
        params: dict[str, Any] = {"match[]": matchers}
        if start is not None:
            params["start"] = start
        if end is not None:
            params["end"] = end
        
        response = self._request("GET", "series", params=params)
        return response.get("data", [])
    
    def validate(self) -> bool:
        """Validate connectivity by querying 'up' metric.
        
        Returns:
            True if connection works.
        """
        try:
            result = self.query_instant("up")
            logger.info("Prometheus connectivity validated")
            return True
        except Exception as e:
            logger.warning("Prometheus validation failed: %s", e)
            raise


class GrafanaClient:
    """Client for Grafana HTTP API.
    
    Implements:
    - Dashboard CRUD
    - Datasource management
    - Folder management
    - Alerting (if using new unified alerting)
    """
    
    def __init__(self, config: GrafanaConfig) -> None:
        self._config = config
        self._session = requests.Session()
    
    def _get_headers(self) -> dict[str, str]:
        """Get authentication headers."""
        headers = {"Content-Type": "application/json"}
        
        if self._config.auth_method == GrafanaConfig.AUTH_API_KEY:
            headers["Authorization"] = f"Bearer {self._config.api_key}"
        # Basic auth handled via auth tuple in request
        
        return headers
    
    def _get_auth(self) -> Optional[tuple[str, str]]:
        """Get basic auth tuple if using basic auth."""
        if self._config.auth_method == GrafanaConfig.AUTH_BASIC:
            return (self._config.username, self._config.password)
        return None
    
    def _request(
        self,
        method: str,
        endpoint: str,
        params: Optional[dict[str, Any]] = None,
        data: Optional[dict[str, Any]] = None,
    ) -> dict[str, Any]:
        """Make HTTP request to Grafana API."""
        url = self._config.get_api_url(endpoint)
        headers = self._get_headers()
        auth = self._get_auth()
        
        try:
            response = self._session.request(
                method=method,
                url=url,
                params=params,
                json=data,
                headers=headers,
                auth=auth,
                timeout=self._config.timeout,
            )
            
            if response.status_code == 204:
                return {}
            
            try:
                result = response.json()
            except json.JSONDecodeError:
                raise GrafanaAPIError(
                    f"Grafana returned non-JSON: {response.status_code} {response.text[:200]}"
                )
            
            if response.status_code >= 400:
                raise GrafanaAPIError(
                    f"Grafana HTTP {response.status_code}: {result}"
                )
            
            return result
            
        except requests.RequestException as e:
            raise PrometheusGrafanaError(f"Network error: {e}") from e
    
    def health(self) -> dict[str, Any]:
        """Get Grafana health status."""
        return self._request("GET", "health")
    
    def get_dashboard(self, uid: str) -> dict[str, Any]:
        """Get dashboard by UID.
        
        Returns:
            Dict with 'dashboard' and 'meta' keys.
        """
        return self._request("GET", f"dashboards/uid/{uid}")
    
    def get_dashboard_by_slug(self, slug: str) -> dict[str, Any]:
        """Get dashboard by slug (older method)."""
        return self._request("GET", f"dashboards/db/{slug}")
    
    def create_or_update_dashboard(
        self,
        dashboard: dict[str, Any],
        folder_id: int = 0,
        folder_uid: Optional[str] = None,
        overwrite: bool = False,
        message: Optional[str] = None,
    ) -> dict[str, Any]:
        """Create or update a dashboard.
        
        Args:
            dashboard: Full dashboard JSON dict
            folder_id: Legacy folder ID (0 for General folder)
            folder_uid: Optional folder UID (preferred)
            overwrite: If True, overwrite existing with same title
            message: Optional commit message
        
        Returns:
            Response with id, uid, url, status
        """
        payload: dict[str, Any] = {
            "dashboard": dashboard,
            "overwrite": overwrite,
        }
        
        if folder_uid:
            payload["folderUid"] = folder_uid
        else:
            payload["folderId"] = folder_id
            
        if message:
            payload["message"] = message
        
        return self._request("POST", "dashboards/db", data=payload)
    
    def delete_dashboard(self, uid: str) -> dict[str, Any]:
        """Delete dashboard by UID."""
        return self._request("DELETE", f"dashboards/uid/{uid}")
    
    def search_dashboards(
        self,
        query: Optional[str] = None,
        tag: Optional[str] = None,
        type: str = "dash-db",
    ) -> list[dict[str, Any]]:
        """Search dashboards.
        
        Args:
            query: Search query
            tag: Filter by tag
            type: Type filter (dash-db, dash-folder)
        
        Returns:
            List of dashboard items
        """
        params: dict[str, Any] = {"type": type}
        if query:
            params["query"] = query
        if tag:
            params["tag"] = tag
        
        return self._request("GET", "search", params=params)
    
    def get_datasources(self) -> list[dict[str, Any]]:
        """List all datasources."""
        return self._request("GET", "datasources")
    
    def get_datasource_by_uid(self, uid: str) -> dict[str, Any]:
        """Get datasource by UID."""
        return self._request("GET", f"datasources/uid/{uid}")
    
    def create_datasource(
        self,
        name: str,
        type: str,
        url: str,
        access: str = "proxy",
        is_default: bool = False,
        json_data: Optional[dict[str, Any]] = None,
    ) -> dict[str, Any]:
        """Create a datasource.
        
        Args:
            name: Display name
            type: Datasource type (prometheus, graphite, etc.)
            url: Server URL
            access: Access mode (proxy or direct)
            is_default: Set as default datasource
            json_data: Additional type-specific config
        
        Returns:
            Created datasource
        """
        payload: dict[str, Any] = {
            "name": name,
            "type": type,
            "url": url,
            "access": access,
            "isDefault": is_default,
        }
        
        if json_data:
            payload["jsonData"] = json_data
        
        return self._request("POST", "datasources", data=payload)
    
    def validate(self) -> bool:
        """Validate connectivity via health endpoint.
        
        Returns:
            True if connection works.
        """
        try:
            health = self.health()
            logger.info("Grafana health: %s", health.get("version", "unknown"))
            return True
        except Exception as e:
            logger.warning("Grafana validation failed: %s", e)
            raise


# Global clients (lazy-loaded)
_global_prometheus: Optional[PrometheusClient] = None
_global_grafana: Optional[GrafanaClient] = None


def get_prometheus_client() -> PrometheusClient:
    """Get or create global PrometheusClient."""
    global _global_prometheus
    if _global_prometheus is None:
        config = PrometheusConfig.from_env()
        _global_prometheus = PrometheusClient(config)
    return _global_prometheus


def get_grafana_client() -> GrafanaClient:
    """Get or create global GrafanaClient."""
    global _global_grafana
    if _global_grafana is None:
        config = GrafanaConfig.from_env()
        _global_grafana = GrafanaClient(config)
    return _global_grafana
```

### Pattern 2: PromQL Query Patterns

```python
"""Common PromQL query patterns.

PromQL fundamentals:
- Instant vector: single sample per time series
- Range vector: sample range over time window
- rate(): counter growth rate per second (use for counters)
- irate(): instant rate from last two samples (use for spikes)
- sum by (): aggregate and keep specified labels
- sum without (): aggregate and remove specified labels
- histogram_quantile(): calculate percentile from histogram
- offset: compare with past data
- topk/bottomk: get k highest/lowest series
"""

from __future__ import annotations

import logging
from typing import Any, Optional
from datetime import datetime, timedelta, timezone

logger = logging.getLogger(__name__)


class PromQLQuery:
    """Builder for common PromQL query patterns.
    
    Provides type-safe construction of common query types:
    - Counter rates
    - Gauge aggregations
    - Histogram percentiles
    - Error rates
    - Uptime/SLO queries
    - Comparison queries (week-over-week)
    """
    
    def __init__(self, client: Any) -> None:
        self._client = client
    
    # ===================================================================
    # ❌ BAD — Common PromQL mistakes
    # ===================================================================
    
    @staticmethod
    def bad_counter_example() -> str:
        """❌ BAD: Don't do these things with counters."""
        # ❌ Using sum by (instance) http_requests_total
        #   - Counters only go up (except reset); you want rate()
        
        # ❌ rate(http_requests_total[1m]) > 100
        #   - Comparing raw rate without aggregation
        
        # ❌ sum(http_requests_total) - sum(http_requests_total offset 5m)
        #   - Don't calculate delta manually; use increase()
        
        return "rate(http_requests_total[1m])"  # Actually this part is OK
    
    # ===================================================================
    # ✅ GOOD — Proper PromQL patterns
    # ===================================================================
    
    @staticmethod
    def counter_rate(
        metric: str,
        window: str = "5m",
        labels: Optional[dict[str, str]] = None,
    ) -> str:
        """Rate of counter increase per second.
        
        Use this for: request counts, error counts, bytes transferred.
        
        Args:
            metric: Counter metric name
            window: Rate window (typically 1m-10m, at least 4x scrape interval)
            labels: Optional label filters
        
        Returns:
            PromQL: rate(metric{filters}[window])
        """
        selector = PromQLQuery._build_selector(metric, labels)
        return f"rate({selector}[{window}])"
    
    @staticmethod
    def counter_increase(
        metric: str,
        window: str = "5m",
        labels: Optional[dict[str, str]] = None,
    ) -> str:
        """Total increase of counter over window.
        
        Use this for: total requests in window.
        
        Args:
            metric: Counter metric name
            window: Time window
            labels: Optional filters
        
        Returns:
            PromQL: increase(metric{...}[window])
        """
        selector = PromQLQuery._build_selector(metric, labels)
        return f"increase({selector}[{window}])"
    
    @staticmethod
    def sum_by(
        query: str,
        by_labels: list[str],
    ) -> str:
        """Aggregate and keep specified labels.
        
        Args:
            query: Inner query (e.g., rate(http_requests_total[5m])
            by_labels: Labels to preserve in result
        
        Returns:
            PromQL: sum by (label1, label2) (query)
        """
        labels_str = ", ".join(by_labels)
        return f"sum by ({labels_str}) ({query})"
    
    @staticmethod
    def error_rate(
        total_metric: str,
        error_metric: str,
        window: str = "5m",
        labels: Optional[dict[str, str]] = None,
    ) -> str:
        """Calculate error rate percentage.
        
        Formula: rate(errors) / rate(total)
        
        Args:
            total_metric: Total request counter
            error_metric: Error counter (or same metric with status code label)
            window: Rate window
        
        Returns:
            PromQL for error rate 0-1 (or use < 1 for %)
        """
        # Simple version when using separate metrics:
        # sum by (instance) rate(errors[5m]) / sum by (instance) rate(total[5m])
        
        # Or when using status code label:
        # sum by (instance) rate(http_requests_total{status=~"5.."}[5m])
        # /
        # sum by (instance) rate(http_requests_total[5m])
        
        # This method assumes separate metrics for now, or caller can handle labels
        total_selector = PromQLQuery._build_selector(total_metric, labels)
        error_selector = PromQLQuery._build_selector(error_metric, labels)
        
        return (
            f"sum by (job, instance) rate({error_selector}[{window}])) "
            f"/ "
            f"sum by (job, instance) rate({total_selector}[{window}]))"
        )
    
    @staticmethod
    def error_rate_by_status(
        metric: str,
        window: str = "5m",
        status_label: str = "status",
        error_pattern: str = "5..",
        labels: Optional[dict[str, str]] = None,
    ) -> str:
        """Error rate using status code label.
        
        Args:
            metric: Request counter with status code label
            window: Rate window
            status_label: Label name for status code
            error_pattern: Regex for error codes (e.g., "5..", "4..|5..")
            labels: Additional filters
        
        Returns:
            PromQL: errors / total
        """
        # Build with label filters
        base_filters = dict(labels or {})
        error_filters = dict(base_filters)
        error_filters[status_label] = f"=~\"{error_pattern}\""  # Regex match
        
        # Use PromQL's label matching syntax
        # Actually we need to construct carefully
        # This returns a pattern the caller can use, but real implementation
        # would use separate queries or more complex label matching
        
        # Simplified for now - caller should construct based on their schema
        total = PromQLQuery.counter_rate(metric, window, base_filters)
        return (
            f"sum by (job, instance) ({PromQLQuery.counter_rate(metric, window, error_filters)}) "
            f"/ sum by (job, instance) ({total})"
        )
    
    @staticmethod
    def histogram_quantile(
        quantile: float,
        metric_bucket: str,
        window: str = "5m",
        labels: Optional[dict[str, str]] = None,
    ) -> str:
        """Calculate percentile from histogram.
        
        Use this for: latency percentiles (p50, p95, p99), duration distributions.
        
        Args:
            quantile: 0.0-1.0 (e.g., 0.95 for p95)
            metric_bucket: Histogram bucket metric (without _bucket suffix? or with?)
            window: Rate window
            labels: Optional filters
        
        Returns:
            PromQL: histogram_quantile(q, sum by (le) rate(metric_bucket[5m]))
        """
        # Histogram metrics typically have:
        # metric_bucket{le="0.1"}
        # metric_sum
        # metric_count
        
        selector = PromQLQuery._build_selector(metric_bucket, labels)
        
        return (
            f"histogram_quantile({quantile}, "
            f"sum by (le) (rate({selector}[{window}]))) )"
        )
    
    @staticmethod
    def uptime(
        metric: str = "up",
        window: str = "1h",
        labels: Optional[dict[str, str]] = None,
    ) -> str:
        """Calculate uptime percentage over window.
        
        Args:
            metric: Typically 'up' (1=up, 0=down)
            window: Time window
            labels: Optional filters
        
        Returns:
            PromQL for uptime 0-1 (0-100% if multiplied)
        """
        selector = PromQLQuery._build_selector(metric, labels)
        return f"avg_over_time({selector}[{window}])"
    
    @staticmethod
    def compare_week_over_week(
        query: str,
    ) -> str:
        """Compare current value with 1 week ago.
        
        Returns:
            PromQL: query / query offset 1w
        """
        return f"({query}) / ({query} offset 1w)"
    
    @staticmethod
    def top_k(
        k: int,
        query: str,
    ) -> str:
        """Get top K time series by value.
        
        Args:
            k: Number to return
            query: Inner query to rank
        
        Returns:
            PromQL: topk(k, query)
        """
        return f"topk({k}, {query})"
    
    @staticmethod
    def _build_selector(
        metric: str,
        labels: Optional[dict[str, str]] = None,
    ) -> str:
        """Build metric selector with label filters.
        
        Handles special label values:
        - = exact match
        - != not equal
        - =~ regex match
        - !~ regex not match
        
        Args:
            metric: Metric name
            labels: Dict of label -> value (value can include operator prefix)
        
        Returns:
            metric{label="value", label2=~"regex"}
        """
        if not labels:
            return metric
        
        label_parts = []
        for key, value in labels.items():
            # Check if value already has operator
            if isinstance(value, str):
                if value.startswith("=~") or value.startswith("!~"):
                    # Already has operator and maybe quotes?
                    # Caller should handle properly
                    label_parts.append(f'{key}{value}')
                elif value.startswith("=") or value.startswith("!="):
                    label_parts.append(f'{key}{value}')
                else:
                    # Simple value - exact match
                    label_parts.append(f'{key}="{value}"')
            else:
                label_parts.append(f'{key}="{value}"')
        
        labels_str = ", ".join(label_parts)
        return f"{metric}{{{labels_str}}}"


# Example usage functions

def query_request_rate(
    client: Any,
    job: str,
    window_minutes: int = 5,
) -> dict[str, Any]:
    """Query request rate aggregated by instance.
    
    Args:
        client: PrometheusClient
        job: Job label value
        window_minutes: Rate window in minutes
    
    Returns:
        Dict with instances and their rates
    """
    window = f"{window_minutes}m"
    query = PromQLQuery.sum_by(
        PromQLQuery.counter_rate(
            "http_requests_total",
            window=window,
            labels={"job": job},
        ),
        by_labels=["instance", "job"],
    )
    
    result = client.query_instant(query)
    
    return {
        "result_type": result.get("resultType"),
        "results": [
            {
                "labels": r.get("metric", {}),
                "value": float(r["value"][1]) if "value" in r else None,
            }
            for r in result.get("result", [])
        ]
    }


def query_error_rate_percent(
    client: Any,
    job: str,
    window_minutes: int = 5,
) -> dict[str, Any]:
    """Query error rate as percentage 0-100.
    
    Assumes metrics:
    - http_requests_total (all requests)
    - http_requests_errors_total (error requests)
    
    Or uses status code label approach.
    """
    window = f"{window_minutes}m"
    
    # Using status code pattern (5xx errors)
    # This is a common pattern where status=~"5.." matches 500, 502, etc.
    
    # Actually simpler: sum errors / sum total
    # We'll construct two queries and divide
    
    # Query 1: errors (status 5xx)
    error_query = PromQLQuery.sum_by(
        PromQLQuery.counter_rate(
            "http_requests_total",
            window=window,
            labels={"job": job, "status": '=~"5.."'}
        ),
        by_labels=["job"],
    )
    
    # Query 2: total
    total_query = PromQLQuery.sum_by(
        PromQLQuery.counter_rate(
            "http_requests_total",
            window=window,
            labels={"job": job},
        ),
        by_labels=["job"],
    )
    
    # Combined in one PromQL: errors / total
    combined = f"({error_query}) / ({total_query}) * 100"
    
    result = client.query_instant(combined)
    
    results = result.get("result", [])
    if results:
        value = float(results[0]["value"][1])
        return {
            "error_rate_pct": value,
            "window_minutes": window_minutes,
        }
    
    return {"error_rate_pct": 0.0, "window_minutes": window_minutes}


def query_latency_percentiles(
    client: Any,
    job: str,
    metric_bucket: str = "http_request_duration_seconds_bucket",
    window_minutes: int = 5,
) -> dict[str, float]:
    """Query p50, p95, p99 latency percentiles from histogram.
    
    Args:
        client: PrometheusClient
        job: Job label
        metric_bucket: Histogram bucket metric name
        window_minutes: Rate window
    
    Returns:
        Dict with p50, p95, p99 in seconds (or whatever unit the histogram uses)
    """
    window = f"{window_minutes}m"
    labels = {"job": job}
    
    result = {}
    
    for quantile, name in [(0.5, "p50"), (0.95, "p95"), (0.99, "p99")]:
        query = PromQLQuery.histogram_quantile(
            quantile, metric_bucket, window, labels)
        query_result = client.query_instant(query)
        values = query_result.get("result", [])
        if values:
            result[name] = float(values[0]["value"][1])
        else:
            result[name] = 0.0
    
    return result
```

### Pattern 3: Grafana Dashboard as Code

```python
"""Grafana dashboard as code patterns.

Grafana dashboards are JSON objects. Key concepts:

- Dashboard JSON structure:
  - id: Numeric ID (assigned by Grafana)
  - uid: Unique ID (string, user-provided or auto-generated)
  - title: Display name
  - tags: List of tags
  - timezone: Browser or UTC
  - panels: Array of panel objects
  - templating: Template variables
  - time: Default time range
  - refresh: Auto-refresh interval

- Panel types:
  - graph: Time series line chart
  - stat: Single stat display
  - table: Table view
  - gauge: Gauge display
  - heatmap: Heatmap for histograms
  - text: Text/markdown panel
"""

from __future__ import annotations

import json
import logging
from typing import Any, Optional
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)


@dataclass
class GrafanaDashboardBuilder:
    """Builder for Grafana dashboard JSON.
    
    Provides fluent API for constructing dashboard creation.
    """
    
    title: str
    uid: Optional[str] = None
    tags: list[str] = field(default_factory=list)
    timezone: str = "browser"
    refresh: str = "1m"
    
    _panels: list[dict[str, Any]] = field(default_factory=list)
    _variables: list[dict[str, Any]] = field(default_factory=list)
    _next_panel_id: int = 1
    
    def add_tag(self, tag: str) -> "GrafanaDashboardBuilder":
        """Add a tag."""
        self.tags.append(tag)
        return self
    
    def add_variable(
        self,
        name: str,
        label: str,
        datasource: str,
        query: str,
        include_all: bool = True,
        multi: bool = False,
        default_value: Optional[str] = None,
    ) -> "GrafanaDashboardBuilder":
        """Add a template variable.
        
        Args:
            name: Variable name (used in queries as $name)
            label: Display label
            datasource: Datasource name or uid
            query: Query for values (e.g., label_values(metric, label))
            include_all: Add "All" option
            multi: Allow multiple selection
            default_value: Optional default value
        """
        variable: dict[str, Any] = {
            "name": name,
            "type": "query",
            "label": label,
            "datasource": datasource,
            "query": query,
            "refresh": 2,  # Refresh on time range change
            "includeAll": include_all,
            "multi": multi,
            "options": [],
        }
        
        if include_all:
            variable["allValue"] = ".*"  # Regex for All
        
        if default_value:
            variable["current"] = {
                "text": default_value,
                "value": default_value,
            }
        
        self._variables.append(variable)
        return self
    
    def add_panel_graph(
        self,
        title: str,
        targets: list[dict[str, Any]],
        yaxis_label: Optional[str] = None,
        span: int = 12,  # 6 = half width, 12 = full width
        height: int = 8,
        legend_show: bool = True,
    ) -> "GrafanaDashboardBuilder":
        """Add a graph (time series) panel.
        
        Args:
            title: Panel title
            targets: List of target dicts with expr, refId, legendFormat
            yaxis_label: Optional Y axis label
            span: Width (6=half, 12=full)
            height: Row height
            legend_show: Show legend
        """
        panel_id = self._next_panel_id
        self._next_panel_id += 1
        
        panel: dict[str, Any] = {
            "id": panel_id,
            "type": "graph",
            "title": title,
            "span": span,
            "height": f"{height}h",
            "targets": targets,
            "legend": {
                "show": legend_show,
                "values": False,
                "min": False,
                "max": False,
                "current": True,
                "avg": False,
            },
            "yaxes": [
                {
                    "format": "short",
                    "label": yaxis_label or "",
                    "logBase": 1,
                    "show": True,
                },
                {
                    "format": "short",
                    "label": "",
                    "logBase": 1,
                    "show": False,
                },
            ],
            "xaxis": {
                "show": True,
            },
        }
        
        self._panels.append(panel)
        return self
    
    def add_panel_stat(
        self,
        title: str,
        targets: list[dict[str, Any]],
        span: int = 6,
        format: str = "short",
        decimals: int = 1,
        color_value: bool = True,
        thresholds: Optional[list[str]] = None,
        gauge: Optional[dict[str, Any]] = None,
    ) -> "GrafanaDashboardBuilder":
        """Add a stat (single value) panel.
        
        Args:
            title: Panel title
            targets: Query targets
            span: Width
            format: Unit format (short, percent, seconds, bytes, etc.
            decimals: Decimal places
            color_value: Colorize based on thresholds
            thresholds: Threshold values ["80", "90"] etc.
            gauge: Optional gauge settings { "show": true, "minValue": 0, "maxValue": 100}
        """
        panel_id = self._next_panel_id
        self._next_panel_id += 1
        
        panel: dict[str, Any] = {
            "id": panel_id,
            "type": "stat",
            "title": title,
            "span": span,
            "targets": targets,
            "fieldConfig": {
                "defaults": {
                    "unit": format,
                    "decimals": decimals,
                    "color": {
                        "mode": "value" if color_value else "fixed",
                    },
                },
                "overrides": [],
            },
            "options": {
                "reduceOptions": {
                    "calcs": ["lastNotNull"],
                    "fields": "",
                    "values": False,
                },
                "colorMode": "value",
                "graphMode": "none",
                "justifyMode": "auto",
            },
        }
        
        if thresholds:
            panel["fieldConfig"]["defaults"]["thresholds"] = {
                "mode": "absolute",
                "steps": [
                    {"color": "green", "value": None},
                ] + [
                    {"color": "red" if i >= len(thresholds) - 1 else "yellow", "value": float(t)}
                    for i, t in enumerate(thresholds)
                ]
            }
        
        if gauge:
            panel["options"]["graphMode"] = "area"
            if "minValue" in gauge:
                panel["fieldConfig"]["defaults"]["min"] = gauge["minValue"]
            if "maxValue" in gauge:
                panel["fieldConfig"]["defaults"]["max"] = gauge["maxValue"]
        
        self._panels.append(panel)
        return self
    
    def add_panel_text(
        self,
        title: str,
        content: str,
        mode: str = "markdown",
        span: int = 12,
    ) -> "GrafanaDashboardBuilder":
        """Add a text/markdown panel.
        
        Args:
            title: Panel title
            content: Text/Markdown content
            mode: "markdown" or "html"
            span: Width
        """
        panel_id = self._next_panel_id
        self._next_panel_id += 1
        
        panel: dict[str, Any] = {
            "id": panel_id,
            "type": "text",
            "title": title,
            "span": span,
            "options": {
                "mode": mode,
                "content": content,
            },
        }
        
        self._panels.append(panel)
        return self
    
    def build(self) -> dict[str, Any]:
        """Build the final dashboard JSON dict.
        
        Returns:
            Dashboard dict (ready for Grafana API)
        """
        dashboard: dict[str, Any] = {
            "title": self.title,
            "tags": list(self.tags),
            "timezone": self.timezone,
            "schemaVersion": 27,
            "version": 0,
            "refresh": self.refresh,
            "time": {
                "from": "now-6h",
                "to": "now",
            },
            "timepicker": {
                "refresh_intervals": ["5s", "10s", "30s", "1m", "5m", "15m", "30m", "1h", "2h", "1d"],
                "time_options": ["5m", "15m", "1h", "6h", "12h", "24h", "2d", "7d", "30d"],
            },
            "panels": list(self._panels),
            "templating": {
                "list": list(self._variables),
            },
            "annotations": {
                "list": [],
            },
        }
        
        if self.uid:
            dashboard["uid"] = self.uid
        
        return dashboard
    
    def build_json(self, indent: int = 2) -> str:
        """Build as JSON string."""
        return json.dumps(self.build(), indent=indent)


# Helper for creating targets

def create_prometheus_target(
    expr: str,
    legend_format: str,
    ref_id: str = "A",
    datasource: Optional[str] = None,
    interval_factor: int = 1,
) -> dict[str, Any]:
    """Create a Prometheus datasource target.
    
    Args:
        expr: PromQL query expression
        legend_format: Legend format (e.g., "{{instance}}" or "{{job}} - {{instance}}")
        ref_id: Reference ID (A, B, C for multiple targets)
        datasource: Optional datasource name/uid
        interval_factor: Interval factor
    
    Returns:
        Target dict for panel
    """
    target: dict[str, Any] = {
        "expr": expr,
        "legendFormat": legend_format,
        "refId": ref_id,
        "intervalFactor": interval_factor,
        "format": "time_series",
    }
    
    if datasource:
        target["datasource"] = datasource
    
    return target


# Example: Build a service overview dashboard

def build_service_overview_dashboard(
    service_name: str,
    prometheus_datasource: str = "Prometheus",
) -> dict[str, Any]:
    """Build a standard service overview dashboard.
    
    Includes:
    - Request rate (stat + graph)
    - Error rate % (stat with thresholds)
    - Latency percentiles (p50, p95, p99)
    - Instance health (up metric)
    
    Args:
        service_name: Service/job name for label matching
        prometheus_datasource: Datasource name/uid
    
    Returns:
        Dashboard JSON dict
    """
    builder = GrafanaDashboardBuilder(
        title=f"Service Overview: {service_name}",
        uid=f"service-overview-{service_name.lower()}",
        tags=["service", service_name.lower(), "overview"],
        refresh="1m",
    )
    
    # Template variable: instance
    builder.add_variable(
        name="instance",
        label="Instance",
        datasource=prometheus_datasource,
        query=f"label_values(up{{job=\"{service_name}\"}}, instance)",
        include_all=True,
        multi=True,
    )
    
    # Intro text panel
    builder.add_panel_text(
        title="",  # No title
        content=f"""# {service_name} Service Overview

This dashboard shows key metrics for the **{service_name}** service.

- **Request Rate**: Requests per second
- **Error Rate**: 5xx errors as % of total
- **Latency**: p50, p95, p99 duration percentiles
""",
        span=12,
    )
    
    # Row 1: Request rate stat + graph
    request_rate_expr = f'sum by (instance) rate(http_requests_total{{job="{service_name}", instance=~"$instance"}}[5m])'
    
    builder.add_panel_stat(
        title="Request Rate (rps)",
        targets=[
            create_prometheus_target(
                expr=f'sum({request_rate_expr})',
                legend_format="Total",
                ref_id="A",
                datasource=prometheus_datasource,
            ),
        ],
        span=3,
        format="reqps",
    )
    
    builder.add_panel_graph(
        title="Request Rate by Instance",
        targets=[
            create_prometheus_target(
                expr=request_rate_expr,
                legend_format="{{instance}}",
                ref_id="A",
                datasource=prometheus_datasource,
            ),
        ],
        span=9,
        yaxis_label="Requests/sec",
    )
    
    # Row 2: Error rate
    # Total requests: sum by (instance) rate(http_requests_total[5m])
    # Errors: sum by (instance) rate(http_requests_total{status=~"5.."}[5m])
    # Rate = errors / total
    
    error_rate_expr = (
        f'sum by (instance) rate(http_requests_total{{job="{service_name}", instance=~"$instance", status=~"5.."}}[5m]) '
        f'/ sum by (instance) rate(http_requests_total{{job="{service_name}", instance=~"$instance"}}[5m]) * 100'
    )
    
    builder.add_panel_stat(
        title="Error Rate (%)",
        targets=[
            create_prometheus_target(
                expr=f'sum({error_rate_expr})',
                legend_format="Total",
                ref_id="A",
                datasource=prometheus_datasource,
            ),
        ],
        span=3,
        format="percent",
        thresholds=["2", "5"],  # Yellow at 2%, Red at 5%
        color_value=True,
    )
    
    builder.add_panel_graph(
        title="Error Rate by Instance",
        targets=[
            create_prometheus_target(
                expr=error_rate_expr,
                legend_format="{{instance}}",
                ref_id="A",
                datasource=prometheus_datasource,
            ),
        ],
        span=9,
        yaxis_label="Error %",
    )
    
    # Row 3: Latency percentiles
    # Using histogram_quantile
    
    for quantile, name in [(0.5, "p50"), (0.95, "p95"), (0.99, "p99")]:
        latency_expr = (
            f'histogram_quantile({quantile}, '
            f'sum by (le, instance) (rate(http_request_duration_seconds_bucket{{job="{service_name}", instance=~"$instance"}}[5m])))'
        )
        
        builder.add_panel_stat(
            title=f"Latency {name.upper()} (s)",
            targets=[
                create_prometheus_target(
                    expr=f'avg({latency_expr})',  # avg across instances
                    legend_format=name.upper(),
                    ref_id=name.upper(),
                    datasource=prometheus_datasource,
                ),
            ],
            span=4,
            format="s",
            decimals=3,
        )
    
    # Row 4: Instance health (up metric)
    up_expr = f'up{{job="{service_name}", instance=~"$instance"}}'
    
    builder.add_panel_stat(
        title="Healthy Instances",
        targets=[
            create_prometheus_target(
                expr=f'sum({up_expr})',
                legend_format="Up",
                ref_id="A",
                datasource=prometheus_datasource,
            ),
        ],
        span=4,
        format="short",
    )
    
    builder.add_panel_graph(
        title="Instance Status (1=Up, 0=Down)",
        targets=[
            create_prometheus_target(
                expr=up_expr,
                legend_format="{{instance}}",
                ref_id="A",
                datasource=prometheus_datasource,
            ),
        ],
        span=8,
        yaxis_label="Status",
    )
    
    return builder.build()


# Alerting rules YAML generation

def generate_alerting_rules(
    alert_name: str,
    expr: str,
    duration: str = "5m",
    severity: str = "warning",
    summary: str = "",
    description: str = "",
    runbook_url: Optional[str] = None,
    labels: Optional[dict[str, str]] = None,
) -> dict[str, Any]:
    """Generate Prometheus alerting rule YAML structure.
    
    Args:
        alert_name: Name of alert
        expr: PromQL expression that triggers alert
        duration: How long expr must be true before firing
        severity: warning or critical
        summary: Short summary
        description: Detailed description
        runbook_url: Optional runbook URL
        labels: Additional labels
    
    Returns:
        Dict structure for prometheus rules YAML
    """
    rule: dict[str, Any] = {
        "alert": alert_name,
        "expr": expr,
        "for": duration,
        "labels": {
            "severity": severity,
        },
        "annotations": {
            "summary": summary,
            "description": description,
        },
    }
    
    if labels:
        rule["labels"].update(labels)
    
    if runbook_url:
        rule["annotations"]["runbook_url"] = runbook_url
    
    return rule


# Example: Standard alerts for a service

def standard_service_alerts(
    service_name: str,
    error_rate_threshold_pct: float = 5.0,
    high_latency_p95_threshold: float = 1.0,  # seconds
) -> list[dict[str, Any]]:
    """Generate standard alerting rules for a service.
    
    Returns:
        List of alert rule dicts
    """
    rules = []
    
    # 1. High error rate
    error_rate_expr = (
        f'sum by (job) rate(http_requests_total{{job="{service_name}", status=~"5.."}}[5m]) '
        f'/ sum by (job) rate(http_requests_total{{job="{service_name}"}}[5m]) * 100 '
        f'> {error_rate_threshold_pct}'
    )
    
    rules.append(generate_alerting_rules(
        alert_name=f"HighErrorRate-{service_name}",
        expr=error_rate_expr,
        duration="5m",
        severity="critical",
        summary=f"High error rate on {service_name}",
        description=(
            f"Error rate exceeded {error_rate_threshold_pct}% for 5 minutes. "
            f"Current: {{{{ $value }}}}%"
        ),
        runbook_url=f"https://runbooks.example.com/high-error-rate",
        labels={"service": service_name},
    ))
    
    # 2. Instance down
    rules.append(generate_alerting_rules(
        alert_name=f"InstanceDown-{service_name}",
        expr=f'up{{job="{service_name}"}} == 0',
        duration="2m",
        severity="critical",
        summary=f"Instance down for {service_name}",
        description="Instance {{{{ $labels.instance }}}} has been down for 2 minutes.",
        labels={"service": service_name, "instance": "{{ $labels.instance }}"},
    ))
    
    # 3. High latency p95
    latency_expr = (
        f'histogram_quantile(0.95, '
        f'sum by (le, job) rate(http_request_duration_seconds_bucket{{job="{service_name}"}}[5m]))) '
        f'> {high_latency_p95_threshold}'
    )
    
    rules.append(generate_alerting_rules(
        alert_name=f"HighLatencyP95-{service_name}",
        expr=latency_expr,
        duration="10m",
        severity="warning",
        summary=f"High latency p95 on {service_name}",
        description=(
            f"p95 latency exceeded {high_latency_p95_threshold}s for 10 minutes. "
            f"Current: {{{{ $value }}}}s"
        ),
        labels={"service": service_name},
    ))
    
    return rules
```

---

## Constraints

### MUST DO

- Always use `rate()` for counters, never raw counter values
- Use `sum by (labels)` aggregations, specify which labels to keep
- Always set time bounds in range queries (`start`, `end`, `step`)
- Avoid high-cardinality labels (user_id, request_id) in aggregations
- Use `histogram_quantile()` for percentiles, never calculate from raw
- Validate PromQL syntax before deployment
- Store Grafana dashboard JSON in version control
- Include `runbook_url` annotation on every alert rule
- Use `offset` for week-over-week and day-over-day comparisons
- Set appropriate `for` duration on alerts to avoid flapping

### MUST NOT DO

- NEVER divide by zero in PromQL (handle with `or on() group_left() vector(0)`)
- NEVER aggregate without `by ()` or `without ()`
- NEVER use `irate()` for long-term trends (only for spikes)
- NEVER create high-cardinality alert rules
- NEVER ignore `up == 0` instances
- NEVER use dynamic values in dashboard UIDs
- NEVER use `increase()` on gauges (they go down too)
- NEVER store credentials in dashboard JSON (use datasource config)
- NEVER create dashboards without `title` field
- NEVER use regex without `=~` operator syntax in PromQL

---

## Output Template

When implementing Grafana/Prometheus integrations, produce:

1. **Client Initialization** — `PrometheusConfig` and `GrafanaConfig` reading from env vars
2. **PromQL Query Library** — Common query patterns with rate(), sum by (), histogram_quantile()
3. **Dashboard Builder** — `GrafanaDashboardBuilder` for constructing dashboard JSON
4. **Alerting Rules YAML** — Standard alert templates with severity, summary, runbook_url
5. **Template Variables** — `$instance`, `$env` variables for dashboards
6. **Health Validation** — Connectivity checks for both Prometheus and Grafana

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `coding-datadog-api` | Datadog SaaS monitoring alternative
| `coding-newrelic-api` | New Relic SaaS monitoring alternative
| `coding-sentry-api` | Error tracking (complementary)
| `coding-logging-patterns` | Structured logging patterns for logs integration
| `coding-pagerduty-api` | On-call and alert escalation

---

## Live References

| Resource | URL |
|----------|-----|
| prometheus-api-client (PyPI) | https://pypi.org/project/prometheus-api-client/
| grafana-api (PyPI) | https://pypi.org/project/grafana-api/
| Prometheus HTTP API | https://prometheus.io/docs/prometheus/latest/querying/api/
| PromQL Docs | https://prometheus.io/docs/prometheus/latest/querying/basics/
| Grafana HTTP API | https://grafana.com/docs/grafana/latest/http_api/
| Alerting Rules | https://prometheus.io/docs/prometheus/latest/alerting/
| Recording Rules | https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/
| Dashboard JSON | https://grafana.com/docs/grafana/latest/dashboards/json-model/
| PromQL Best Practices | https://prometheus.io/docs/practices/rules/

---

## 📎 PromQL Best Practices

### Rate vs Increase vs Irate

| Function | Use Case | Example |
|----------|----------|----------|
| `rate()` | Long-term trends, average over window | `rate(counter[5m])` |
| `increase()` | Total change over window | `increase(counter[5m])` |
| `irate()` | Short-term spikes, last two samples | `irate(counter[1m])` |

**Never use `irate()` for long-term graphs — it misses slow trends!**

### Label Cardinality

Good labels (low cardinality):
- `job`: services, `instance`: hosts (tens to hundreds)
- `env`: environment (prod, staging, dev — usually < 10 values)
- `status`: HTTP status code (5 values: 2xx, 3xx, 4xx, 5xx)

Bad labels (high cardinality — avoid or be careful):
- `user_id`: millions of users
- `request_id`: unique per request
- `trace_id`: unique per trace
- `email`: every user has one

### Alert Rules Structure

Every alert should have:

```yaml
groups:
- name: example
  rules:
  - alert: HighErrorRate
    expr: ...
    for: 5m
    labels:
      severity: critical
      team: platform
    annotations:
      summary: "High error rate on {{ $labels.job }}"
      description: "Error rate is {{ $value }}%"
      runbook_url: "https://runbooks.example.com/high-error-rate"
```
