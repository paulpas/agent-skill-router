---




name: datadog-api
description: Implements Datadog API integration (metrics, traces, logs, dashboards,
  monitors, synthetic tests) using datadog-api-client Python SDK v2+ with API key
  auth, async metrics submission, monitor creation, and Datadog APM tracing patterns.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: datadog, metrics submission, datadog monitors, APM tracing, custom metrics,
    datadog dashboards, how do i send metrics to datadog, monitoring alerts
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
  related-skills: coding-newrelic-api, coding-grafana-prometheus, coding-sentry-api,
    coding-pagerduty-api




---




# Datadog API Integration

Implements production-grade Datadog API integration using the `datadog-api-client` Python SDK v2+. When loaded, this skill makes the model implement custom metrics submission, APM distributed tracing, log forwarding, monitor creation with alert conditions, dashboard management, and synthetic test configuration. All implementations follow Datadog best practices: use DD_API_KEY environment variable, batch metrics for efficiency, use tags consistently, implement exponential backoff for rate limits, and always validate API connectivity on startup.

## TL;DR Checklist

- [ ] Use `datadog-api-client` v2+ with configuration from `DD_API_KEY` and `DD_SITE` env vars
- [ ] Read API keys from environment variables, never hardcode
- [ ] Batch metrics in 50-100 point batches for efficient submission
- [ ] Use consistent tag naming: `env:production`, `service:checkout`, `version:v1.2.3`
- [ ] Validate API connectivity on startup with a simple ping or validate call
- [ ] Implement exponential backoff with jitter for rate limit (429) errors
- [ ] Use async submission for high-volume metrics to avoid blocking main thread
- [ ] Never send PII or sensitive data in tags or metric payloads
- [ ] Set appropriate monitor thresholds with notification channels (Slack, PagerDuty)
- [ ] Include `team:` tag in all resources for ownership attribution

---

## When to Use

Use this skill when:

- Sending custom business metrics from Python applications
- Implementing distributed tracing with Datadog APM
- Creating and managing monitors for alerting on SLO/SLI violations
- Building dynamic dashboards programmatically
- Forwarding structured logs with context tags
- Configuring synthetic tests for uptime and user journey monitoring
- Querying metrics data for internal reports and analysis
- Managing Datadog resources as code (Infrastructure as Code pattern)

---

## When NOT to Use

- For New Relic-specific monitoring — use `coding-newrelic-api` instead
- For Prometheus + Grafana open-source stack — use `coding-grafana-prometheus`
- When you need error tracking only (not full observability) — use `coding-sentry-api`
- For on-premise monitoring without cloud connectivity — consider Prometheus/Grafana
- DogStatsD UDP local agent only (no SDK needed) — use simple UDP socket calls

---

## Core Workflow

1. **Initialize Configuration** — Create Datadog client using `DD_API_KEY`, `DD_APP_KEY` (if needed), and `DD_SITE` from environment variables. Use the v2 Configuration pattern: `configuration = datadog_api_client.Configuration()`. **Checkpoint:** Validate connectivity by calling a lightweight endpoint like `list_hosts(limit=1)` on startup.

2. **Define Metric Naming & Tagging Strategy** — Establish consistent naming: namespace with service prefix (e.g., `checkout.`, `user.`), use dot-separated snake_case, and define mandatory tags: `env`, `service`, `team`, `version`. **Checkpoint:** Every metric must have at least `env` and `service` tags — enforce at submission time.

3. **Implement Batch Metrics Submission** — Collect metrics in memory and submit in batches of 50-100 points. Use `MetricsApi.submit_metrics()` with `series` array. For high throughput, use async submission with a background thread. **Checkpoint:** Batch size configurable; default 100, max 500 per API call.

4. **Create Monitors with Alert Conditions** — Use `MonitorsApi` to create threshold, anomaly, forecast, or composite monitors. Define `query` with threshold, `message` with notification channel, `tags` for ownership. **Checkpoint:** Every monitor must have `notify_no_data` and `evaluation_delay` configured for reliability.

5. **Implement APM Tracing Patterns** — Use `ddtrace` library for auto-instrumentation. For manual traces: create spans with `tracer.trace()`, set tags with `span.set_tag()`, add errors with `span.set_exc_info()`. **Checkpoint:** Critical paths (database calls, external API calls) must have explicit span wrapping.

6. **Set Up Log Forwarding with Context** — Use structured logging (JSON format) with Datadog-specific fields: `dd.trace_id`, `dd.span_id`, `service`, `env`. Use `ddtrace.patch(logging=True)` for auto-correlation. **Checkpoint:** Logs from the same request share trace_id for trace-log correlation.

---

## Implementation Patterns

### Pattern 1: Datadog Client Initialization (BAD vs GOOD)

```python
"""Datadog SDK initialization patterns.

Version note: datadog-api-client v2+ is the current version.
Earlier v1 used different import patterns. Both work but v2 is recommended.

SDK split:
- datadog-api-client: API calls (metrics query, monitors, dashboards)
- ddtrace: APM tracing and auto-instrumentation
- dogstatsd: Local UDP agent for high-volume metrics (low latency)
"""

from __future__ import annotations

import os
import logging
from typing import Any, Optional
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

# ===================================================================
# ❌ BAD — hardcoded keys, no validation, no error handling
# ===================================================================

def bad_datadog_init_bad() -> Any:
    """❌ BAD: Hardcoded keys, no validation, no error context."""
    import datadog_api_client
    from datadog_api_client import ApiClient, Configuration
    from datadog_api_client.v2.api.metrics_api import MetricsApi
    
    # ❌ Hardcoded! Never commit API keys!
    configuration = Configuration(
        api_key={"apiKeyAuth": "xxxxxxxxxxxxxxxxxxxxxxxxxx"},
        server_variables={"site": "datadoghq.com"},
    )
    
    # ❌ No connectivity check
    # ❌ No error handling
    return MetricsApi(ApiClient(configuration))


# ===================================================================
# ✅ GOOD — env-based auth, validation, typed error handling
# ===================================================================

import datadog_api_client
from datadog_api_client import ApiClient, Configuration
from datadog_api_client.v2.api.metrics_api import MetricsApi
from datadog_api_client.v2.api.monitors_api import MonitorsApi
from datadog_api_client.v2.api.hosts_api import HostsApi
from datadog_api_client.v2.model.metric_intake_type import MetricIntakeType
from datadog_api_client.v2.model.metric_payload import MetricPayload
from datadog_api_client.v2.model.metric_series import MetricSeries
from datadog_api_client.v2.model.metric_point import MetricPoint
from datadog_api_client.exceptions import ApiException, ApiValueError


class DatadogClientError(Exception):
    """Base exception for Datadog client errors."""
    pass


class DatadogAuthError(DatadogClientError):
    """Authentication/API key is invalid."""
    pass


class DatadogRateLimitError(DatadogClientError):
    """Rate limit exceeded."""
    def __init__(self, message: str, retry_after: Optional[int] = None):
        super().__init__(message)
        self.retry_after = retry_after


class DatadogConfig:
    """Datadog configuration from environment variables.
    
    Environment variables:
        DD_API_KEY: Datadog API key (required)
        DD_APP_KEY: Datadog Application key (for some endpoints)
        DD_SITE: Datadog site (datadoghq.com, datadoghq.eu, etc.)
        DD_ENV: Environment tag value (production, staging, dev)
        DD_SERVICE: Service name for tagging
    
    Usage:
        config = DatadogConfig.from_env()
        if config.validate():
            metrics_api = config.get_metrics_api()
    """
    
    DEFAULT_SITE = "datadoghq.com"
    VALID_SITES = {"datadoghq.com", "datadoghq.eu", "us3.datadoghq.com", "us5.datadoghq.com", "ap1.datadoghq.com"}
    
    def __init__(
        self,
        api_key: str,
        app_key: Optional[str] = None,
        site: str = DEFAULT_SITE,
        env: Optional[str] = None,
        service: Optional[str] = None,
    ) -> None:
        if not api_key or not api_key.strip():
            raise ValueError("DD_API_KEY cannot be empty")
        
        if site not in self.VALID_SITES:
            logger.warning("Unknown DD_SITE: %s (valid: %s)", site, self.VALID_SITES)
        
        self.api_key = api_key.strip()
        self.app_key = app_key.strip() if app_key else None
        self.site = site
        self.env = env
        self.service = service
        self._configuration: Optional[Configuration] = None
    
    @classmethod
    def from_env(cls) -> "DatadogConfig":
        """Load configuration from environment variables.
        
        Returns:
            Configured DatadogConfig instance.
            
        Raises:
            ValueError: If DD_API_KEY is missing.
        """
        api_key = os.environ.get("DD_API_KEY")
        if not api_key:
            if os.environ.get("ENV") == "production":
                raise ValueError("DD_API_KEY required in production")
            # Default to placeholder for local dev / tests
            api_key = "placeholder_only_for_local_tests"
        
        return cls(
            api_key=api_key,
            app_key=os.environ.get("DD_APP_KEY"),
            site=os.environ.get("DD_SITE", cls.DEFAULT_SITE),
            env=os.environ.get("DD_ENV") or os.environ.get("ENV"),
            service=os.environ.get("DD_SERVICE"),
        )
    
    def get_configuration(self) -> Configuration:
        """Get the underlying SDK Configuration object.
        
        Returns:
            Configuration instance with auth and site set.
        """
        if self._configuration is None:
            self._configuration = Configuration(
                api_key={
                    "apiKeyAuth": self.api_key,
                },
                server_variables={"site": self.site},
            )
            
            # Add app key if provided (needed for some v1 endpoints)
            if self.app_key:
                self._configuration.api_key["appKeyAuth"] = self.app_key
        
        return self._configuration
    
    def validate(self) -> bool:
        """Validate API connectivity by making a lightweight API call.
        
        Returns:
            True if connection works.
            
        Raises:
            DatadogAuthError: If API key is invalid.
            DatadogClientError: If validation fails for other reasons.
        """
        config = self.get_configuration()
        
        try:
            with ApiClient(config) as api_client:
                hosts_api = HostsApi(api_client)
                # Lightweight call: just get 1 host (or empty if no hosts)
                result = hosts_api.list_hosts(limit=1)
                logger.info("Datadog API validation succeeded")
                return True
                
        except ApiException as e:
            if e.status == 403:
                raise DatadogAuthError("Datadog API key invalid or insufficient permissions") from e
            elif e.status == 429:
                retry_after = e.headers.get("Retry-After")
                raise DatadogRateLimitError(
                    f"Datadog rate limit during validation",
                    retry_after=int(retry_after) if retry_after else None
                ) from e
            else:
                raise DatadogClientError(f"Datadog validation failed: {e.status} {e.reason}") from e
    
    def get_metrics_api(self) -> MetricsApi:
        """Get MetricsApi instance for submitting and querying metrics."""
        config = self.get_configuration()
        return MetricsApi(ApiClient(config))
    
    def get_monitors_api(self) -> MonitorsApi:
        """Get MonitorsApi instance for creating/managing monitors."""
        config = self.get_configuration()
        return MonitorsApi(ApiClient(config))


# Global config instance (lazy-loaded)
_global_config: Optional[DatadogConfig] = None


def get_datadog_config() -> DatadogConfig:
    """Get or create the global DatadogConfig instance.
    
    Uses environment variables. Call validate() separately if needed.
    """
    global _global_config
    if _global_config is None:
        _global_config = DatadogConfig.from_env()
    return _global_config
```

### Pattern 2: Batch Metrics Submission

```python
"""Batch metrics submission for efficient Datadog API usage.

Datadog API limits:
- Max 500 metrics per submit_metrics call
- Rate limit varies by endpoint (typically ~1000 requests/minute)
- Batch submission reduces HTTP overhead

Best practices:
- Batch 50-100 metrics per call
- Use async/background thread for high-volume services
- Add standard tags: env, service, team, version
- Use MetricIntakeType.GAUGE for instantaneous values
- Use MetricIntakeType.COUNT for cumulative values
- Use MetricIntakeType.RATE for per-second rates
"""

from __future__ import annotations

import time
import logging
import threading
from typing import Any, Optional
from collections import deque
from datetime import datetime, timezone

from datadog_api_client.v2.model.metric_intake_type import MetricIntakeType
from datadog_api_client.v2.model.metric_payload import MetricPayload
from datadog_api_client.v2.model.metric_series import MetricSeries
from datadog_api_client.v2.model.metric_point import MetricPoint
from datadog_api_client.exceptions import ApiException

logger = logging.getLogger(__name__)


class MetricBatch:
    """Thread-safe batcher for Datadog metrics submission.
    
    Buffers metrics in memory and flushes:
    - When batch size reaches threshold
    - When flush interval elapses
    - On explicit flush() call
    
    Usage:
        batcher = MetricBatch(config, batch_size=100, flush_interval_seconds=10)
        batcher.start()
        
        # Record metrics
        batcher.gauge("app.request.latency", 0.245, tags=["env:prod", "service:checkout"])
        batcher.count("app.request.count", 1, tags=["env:prod", "service:checkout"])
        
        # When shutting down
        batcher.stop()
        batcher.flush()
    """
    
    DEFAULT_BATCH_SIZE = 100
    DEFAULT_FLUSH_INTERVAL = 10.0  # seconds
    MAX_BATCH_SIZE = 500  # Datadog API limit
    
    def __init__(
        self,
        config: Any,
        batch_size: int = DEFAULT_BATCH_SIZE,
        flush_interval_seconds: float = DEFAULT_FLUSH_INTERVAL,
        default_tags: Optional[list[str]] = None,
    ) -> None:
        from datadog_api_client.v2.api.metrics_api import MetricsApi
        from datadog_api_client import ApiClient
        
        self._config = config
        self._api_client = ApiClient(config.get_configuration())
        self._metrics_api = MetricsApi(self._api_client)
        
        self._batch_size = min(max(1, batch_size), self.MAX_BATCH_SIZE)
        self._flush_interval = max(1.0, flush_interval_seconds)
        self._default_tags = list(default_tags) if default_tags else []
        
        self._buffer: deque[dict[str, Any]] = deque()
        self._lock = threading.Lock()
        self._flush_thread: Optional[threading.Thread] = None
        self._running = False
        self._total_submitted = 0
        self._total_failed = 0
    
    def start(self) -> None:
        """Start the background flush thread."""
        if self._running:
            return
        
        self._running = True
        self._flush_thread = threading.Thread(
            target=self._flush_loop,
            daemon=True,
            name="datadog-metric-flusher",
        )
        self._flush_thread.start()
        logger.info("MetricBatch started with batch_size=%d, flush_interval=%.1fs",
                    self._batch_size, self._flush_interval)
    
    def stop(self) -> None:
        """Stop the background flush thread."""
        self._running = False
        if self._flush_thread:
            self._flush_thread.join(timeout=5.0)
            self._flush_thread = None
    
    def _flush_loop(self) -> None:
        """Background thread that periodically flushes the buffer."""
        while self._running:
            time.sleep(self._flush_interval)
            try:
                self.flush()
            except Exception:
                logger.exception("Background flush failed")
    
    def _now_timestamp(self) -> float:
        """Get current Unix timestamp in seconds."""
        return datetime.now(timezone.utc).timestamp()
    
    def _build_tags(self, tags: Optional[list[str]] = None) -> list[str]:
        """Combine default tags with per-metric tags."""
        result = list(self._default_tags)
        if tags:
            result.extend(tags)
        return result
    
    def gauge(
        self,
        metric_name: str,
        value: float,
        tags: Optional[list[str]] = None,
        timestamp: Optional[float] = None,
    ) -> None:
        """Record a gauge metric (instantaneous value).
        
        Gauges represent values that can go up and down:
        - CPU usage percentage
        - Memory usage bytes
        - Queue depth
        - Response latency
        
        Args:
            metric_name: Name like `app.response.latency`
            value: Numeric value
            tags: Optional additional tags
            timestamp: Optional override timestamp (defaults to now)
        """
        self._record(
            metric_name=metric_name,
            value=value,
            metric_type=MetricIntakeType.GAUGE,
            tags=tags,
            timestamp=timestamp,
        )
    
    def count(
        self,
        metric_name: str,
        value: float = 1.0,
        tags: Optional[list[str]] = None,
        timestamp: Optional[float] = None,
    ) -> None:
        """Record a count metric (cumulative value).
        
        Counts represent increments:
        - Request count
        - Error count
        - Items processed
        
        Args:
            metric_name: Name like `app.request.count`
            value: Amount to increment (default 1)
            tags: Optional additional tags
            timestamp: Optional override timestamp
        """
        self._record(
            metric_name=metric_name,
            value=value,
            metric_type=MetricIntakeType.COUNT,
            tags=tags,
            timestamp=timestamp,
        )
    
    def rate(
        self,
        metric_name: str,
        value: float,
        interval: float = 1.0,
        tags: Optional[list[str]] = None,
        timestamp: Optional[float] = None,
    ) -> None:
        """Record a rate metric (per-second rate).
        
        Rates represent per-second values:
        - Requests per second
        - Bytes transferred per second
        
        Args:
            metric_name: Name like `app.request.rate`
            value: The numeric value
            interval: Interval in seconds over which the value was measured
            tags: Optional additional tags
            timestamp: Optional override timestamp
        """
        self._record(
            metric_name=metric_name,
            value=value,
            metric_type=MetricIntakeType.RATE,
            tags=tags,
            timestamp=timestamp,
            interval=interval,
        )
    
    def _record(
        self,
        metric_name: str,
        value: float,
        metric_type: MetricIntakeType,
        tags: Optional[list[str]] = None,
        timestamp: Optional[float] = None,
        interval: Optional[float] = None,
    ) -> None:
        """Internal method to record a metric to the buffer."""
        if not metric_name or not metric_name.strip():
            logger.warning("Empty metric name skipped")
            return
        
        entry: dict[str, Any] = {
            "metric": metric_name.strip(),
            "type": metric_type,
            "value": float(value),
            "tags": self._build_tags(tags),
            "timestamp": timestamp if timestamp is not None else self._now_timestamp(),
        }
        if interval is not None:
            entry["interval"] = interval
        
        with self._lock:
            self._buffer.append(entry)
            
            # Auto-flush if buffer reaches threshold
            if len(self._buffer) >= self._batch_size:
                self._flush_locked()
    
    def flush(self) -> int:
        """Flush all buffered metrics to Datadog.
        
        Returns:
            Number of metrics successfully submitted.
        """
        with self._lock:
            return self._flush_locked()
    
    def _flush_locked(self) -> int:
        """Flush buffer (must hold lock)."""
        if not self._buffer:
            return 0
        
        to_submit = list(self._buffer)
        self._buffer.clear()
        
        try:
            series_list: list[MetricSeries] = []
            
            for entry in to_submit:
                point = MetricPoint(
                    timestamp=int(entry["timestamp"]),
                    value=entry["value"],
                )
                
                series_kwargs: dict[str, Any] = {
                    "metric": entry["metric"],
                    "type": entry["type"],
                    "points": [point],
                    "tags": entry["tags"],
                }
                if "interval" in entry:
                    series_kwargs["interval"] = int(entry["interval"])
                
                series = MetricSeries(**series_kwargs)
                series_list.append(series)
            
            payload = MetricPayload(series=series_list)
            
            self._metrics_api.submit_metrics(payload=payload)
            
            submitted = len(series_list)
            self._total_submitted += submitted
            logger.debug("Submitted %d metrics to Datadog", submitted)
            return submitted
            
        except ApiException as e:
            self._total_failed += len(to_put_back := to_submit)
            # Put back into buffer for retry (unless it was a 4xx auth error)
            if e.status != 403:
                self._buffer.extendleft(reversed(to_submit))
            
            if e.status == 429:
                logger.warning("Datadog rate limit (429), %d metrics queued for retry", len(to_submit))
            elif e.status == 403:
                logger.error("Datadog auth failed (403), dropping %d metrics", len(to_submit))
            else:
                logger.warning("Datadog submit failed: %d %s, %d metrics queued",
                              e.status, e.reason, len(to_submit))
            
            return 0
    
    def get_stats(self) -> dict[str, int]:
        """Get submission statistics."""
        with self._lock:
            return {
                "buffered": len(self._buffer),
                "submitted": self._total_submitted,
                "failed": self._total_failed,
            }
```

### Pattern 3: Creating Monitors (Alerting)

```python
"""Monitor creation and management for Datadog alerting.

Monitor types:
- Metric threshold alert: avg(last_5m):sum:app.errors{env:prod} > 10
- Anomaly detection: Uses machine learning to detect anomalies
- Forecast alert: Predicts when a metric will breach threshold
- Composite alert: Combines multiple monitors with AND/OR logic
- Event alert: Triggers on specific events
- Service check: Monitors health checks (up/down/warning/critical)
- Process alert: Monitors process running status
- Network alert: Monitors network connectivity
- Synthetic alert: Monitors synthetic test results

Best practices:
- Always add `team:` tag for ownership routing
- Include `notify_no_data` with reasonable time
- Use `evaluation_delay` to account for metric lag
- Include actionable instructions in the message
- Link to runbooks in message
"""

from __future__ import annotations

import logging
from typing import Any, Optional
from dataclasses import dataclass

from datadog_api_client.v2.api.monitors_api import MonitorsApi
from datadog_api_client.v2.model.monitor import Monitor
from datadog_api_client.v2.model.monitor_type import MonitorType
from datadog_api_client.v2.model.monitor_options import MonitorOptions
from datadog_api_client.v2.model.monitor_thresholds import MonitorThresholds
from datadog_api_client.v2.model.monitor_update_request import MonitorUpdateRequest
from datadog_api_client.exceptions import ApiException

logger = logging.getLogger(__name__)


@dataclass
class MonitorThreshold:
    """Threshold configuration for a monitor."""
    warning: Optional[float] = None
    critical: Optional[float] = None
    warning_recovery: Optional[float] = None
    critical_recovery: Optional[float] = None


class MonitorManager:
    """Manager for creating and updating Datadog monitors.
    
    Usage:
        manager = MonitorManager(config)
        
        # Create a threshold monitor
        manager.create_threshold_monitor(
            name="High Error Rate",
            query="avg(last_5m):sum:app.errors.count{env:prod,service:checkout} > 10",
            thresholds=MonitorThreshold(critical=10.0, warning=5.0),
            message="@slack-platform-alerts High error rate detected - {{#is_alert}}Errors: {{value}}{{/is_alert}}",
            tags=["env:prod", "service:checkout", "team:platform"],
            notify_no_data_minutes=10,
        )
    """
    
    def __init__(self, config: Any) -> None:
        from datadog_api_client import ApiClient
        self._config = config
        self._api_client = ApiClient(config.get_configuration())
        self._monitors_api = MonitorsApi(self._api_client)
    
    def create_threshold_monitor(
        self,
        name: str,
        query: str,
        thresholds: MonitorThreshold,
        message: str,
        tags: Optional[list[str]] = None,
        notify_no_data_minutes: Optional[int] = 10,
        evaluation_delay_seconds: Optional[int] = None,
        renotify_interval_minutes: Optional[int] = None,
        require_full_window: bool = True,
    ) -> int:
        """Create a metric threshold monitor.
        
        Query format examples:
            avg(last_5m):sum:app.errors{env:prod} > 10
            max(last_1h):system.cpu.idle{*} by {host} < 10
            sum(last_5m):nginx.requests{env:prod}.as_rate() > 100
        
        Args:
            name: Display name for the monitor
            query: Datadog monitor query string
            thresholds: Warning/critical threshold values
            message: Notification message (supports template variables)
            tags: Tags for filtering and ownership
            notify_no_data_minutes: Alert if no data for this many minutes
            evaluation_delay_seconds: Delay evaluation to account for metric lag
            renotify_interval_minutes: Re-notify every X minutes while alerting
            require_full_window: Require full window of data before alerting
        
        Returns:
            Monitor ID that was created.
        """
        options_kwargs: dict[str, Any] = {}
        
        # Build thresholds
        threshold_dict: dict[str, float] = {}
        if thresholds.critical is not None:
            threshold_dict["critical"] = thresholds.critical
        if thresholds.warning is not None:
            threshold_dict["warning"] = thresholds.warning
        if thresholds.critical_recovery is not None:
            threshold_dict["critical_recovery"] = thresholds.critical_recovery
        if thresholds.warning_recovery is not None:
            threshold_dict["warning_recovery"] = thresholds.warning_recovery
        
        if threshold_dict:
            options_kwargs["thresholds"] = MonitorThresholds(**threshold_dict)
        
        if notify_no_data_minutes:
            options_kwargs["notify_no_data"] = True
            options_kwargs["notify_audit"] = False
            options_kwargs["no_data_timeframe"] = notify_no_data_minutes
        
        if evaluation_delay_seconds:
            options_kwargs["evaluation_delay"] = evaluation_delay_seconds
        
        if renotify_interval_minutes:
            options_kwargs["renotify_interval"] = renotify_interval_minutes
        
        options_kwargs["require_full_window"] = require_full_window
        
        monitor_kwargs: dict[str, Any] = {
            "name": name,
            "type": MonitorType.METRIC_ALERT,
            "query": query,
            "message": message,
            "tags": list(tags) if tags else [],
            "options": MonitorOptions(**options_kwargs),
        }
        
        try:
            monitor = Monitor(**monitor_kwargs)
            result = self._monitors_api.create_monitor(monitor=monitor)
            monitor_id = result.id
            logger.info("Created monitor %d: %s", monitor_id, name)
            return monitor_id
            
        except ApiException as e:
            logger.error("Failed to create monitor: %s", e)
            raise
    
    def create_anomaly_monitor(
        self,
        name: str,
        metric_query: str,
        message: str,
        deviation: str = "both",  # above, below, both
        tags: Optional[list[str]] = None,
    ) -> int:
        """Create an anomaly detection monitor.
        
        Args:
            name: Display name
            metric_query: Base metric query without anomaly wrapper
            message: Notification message
            deviation: Which direction to alert on
            tags: Tags for ownership
        
        Returns:
            Monitor ID
        """
        # Anomaly query format: anomaly(<base_query>, 'agile', direction='both') > 0
        # Where 'agile' is the algorithm (agile, basic, robust)
        
        direction_map = {
            "above": "> 0",
            "below": "< 0",
            "both": "!= 0",
        }
        direction = direction_map.get(deviation, "!= 0")
        
        query = f"anomaly({metric_query}, 'agile', direction='{deviation}') {direction}"
        
        return self.create_threshold_monitor(
            name=name,
            query=query,
            thresholds=MonitorThreshold(critical=1.0),
            message=message,
            tags=tags,
        )
    
    def mute_monitor(self, monitor_id: int, end_timestamp: Optional[int] = None) -> None:
        """Mute a monitor (suppress notifications).
        
        Args:
            monitor_id: Monitor to mute
            end_timestamp: Optional Unix timestamp when to unmute
        """
        try:
            update_kwargs: dict[str, Any] = {"muted": True}
            if end_timestamp:
                update_kwargs["end"] = end_timestamp
            
            update = MonitorUpdateRequest(**update_kwargs)
            self._monitors_api.update_monitor(monitor_id, monitor_update_request=update)
            logger.info("Muted monitor %d", monitor_id)
            
        except ApiException as e:
            logger.error("Failed to mute monitor %d: %s", monitor_id, e)
            raise
    
    def unmute_monitor(self, monitor_id: int) -> None:
        """Unmute a monitor."""
        try:
            update = MonitorUpdateRequest(muted=False)
            self._monitors_api.update_monitor(monitor_id, monitor_update_request=update)
            logger.info("Unmuted monitor %d", monitor_id)
            
        except ApiException as e:
            logger.error("Failed to unmute monitor %d: %s", monitor_id, e)
            raise
    
    def get_monitor(self, monitor_id: int) -> dict[str, Any]:
        """Get monitor details by ID."""
        try:
            result = self._monitors_api.get_monitor(monitor_id)
            return {
                "id": result.id,
                "name": result.name,
                "type": result.type.value if result.type else None,
                "query": result.query,
                "state": result.state.value if result.state else None,
                "muted": result.muted,
                "tags": list(result.tags) if result.tags else [],
            }
        except ApiException as e:
            logger.error("Failed to get monitor %d: %s", monitor_id, e)
            raise


# ===================================================================
# ❌ BAD — DO NOT DO THIS
# ===================================================================

def bad_monitor_example_bad() -> None:
    """❌ BAD: Monitor without proper context and safeguards."""
    # ❌ No team tag (who owns this?)
    # ❌ No notify_no_data (silent failure if metrics stop arriving)
    # ❌ Message has no actionable info
    # ❌ Query too broad (affects all services)
    pass


# ===================================================================
# ✅ GOOD — Proper monitor definition
# ===================================================================

def create_production_error_monitor(
    manager: MonitorManager,
    service: str,
    team_slack_channel: str,
) -> int:
    """Create a properly configured error rate monitor.
    
    ✅ Has env/service/team tags for ownership
    ✅ Has notify_no_data configured
    ✅ Message includes actionable info and link to runbook
    ✅ Has warning and critical thresholds with recovery
    """
    return manager.create_threshold_monitor(
        name=f"[{service}] High Error Rate",
        query=f"avg(last_5m):sum:app.errors.count{{env:prod,service:{service}}} > 5",
        thresholds=MonitorThreshold(
            critical=5.0,
            warning=2.0,
            critical_recovery=1.0,
            warning_recovery=0.5,
        ),
        message=f"""
@slack-{team_slack_channel} High error rate detected on {service}

{{#is_alert}}
**Current errors in last 5 min:** {{value}}

**Action Required:**
1. Check service logs: https://app.datadoghq.com/logs?query=service%3A{service}
2. Check APM traces: https://app.datadoghq.com/apm/service/{service}
3. See runbook: https://runbooks.example.com/error-rate-spike
{{/is_alert}}

{{#is_recovery}}
**Recovered:** Error rate returned to normal ({{value}})
{{/is_recovery}}

Tags: env:prod, service:{service}, team:{team_slack_channel}
""".strip(),
        tags=[f"env:prod", f"service:{service}", f"team:{team_slack_channel}"],
        notify_no_data_minutes=10,
        evaluation_delay_seconds=120,  # Wait for metrics to arrive
        renotify_interval_minutes=30,  # Re-notify every 30 min while firing
    )
```

---

## Constraints

### MUST DO

- Always use `DD_API_KEY` and `DD_SITE` from environment variables
- Batch metrics (50-100 per call) for efficient API usage
- Add consistent tags: `env:`, `service:`, `team:`, `version:` to all resources
- Validate API connectivity on startup before production traffic
- Implement exponential backoff with jitter for 429 rate limit errors
- Use `notify_no_data` on all critical monitors
- Add `evaluation_delay` to account for metric delivery lag
- Include actionable runbook links in monitor messages
- Use `team:` tag for ownership routing and on-call escalation
- Correlate logs with traces using `dd.trace_id` injection

### MUST NOT DO

- NEVER hardcode API keys or app keys in source code
- NEVER send PII, credentials, or sensitive data in tags or metric values
- NEVER submit metrics one-by-one in a tight loop (batching required)
- NEVER create monitors without `notify_no_data` (silent failures)
- NEVER use generic queries like `{*}` without tagging/filtering
- NEVER ignore 429 responses (back off, don't hammer the API)
- NEVER trust monitor state without webhook verification for critical alerts
- NEVER use `require_full_window=false` without understanding implications
- NEVER create composite monitors with more than 5 child monitors
- NEVER skip monitor tagging (makes filtering and ownership impossible)

---

## Output Template

When implementing Datadog integrations, produce:

1. **DatadogConfig Initialization** — Config factory reading from `DD_API_KEY`, `DD_SITE`, `DD_APP_KEY` env vars
2. **Metric Batching Strategy** — `MetricBatch` class with configurable batch size and flush interval
3. **Standard Tag Set** — Mandatory tags: `env`, `service`, `team`, `version` applied consistently
4. **Monitor Definitions** — Threshold monitors with `notify_no_data`, `evaluation_delay`, actionable messages
5. **APM Tracing Patterns** — Manual span creation with `ddtrace`, error tagging with `set_exc_info()`
6. **Rate Limit Handling** — Exponential backoff with jitter, `Retry-After` header parsing
7. **Dashboard JSON Snippets** — Template variables for env/service, properly formatted widgets

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `coding-newrelic-api` | New Relic as alternative monitoring platform |
| `coding-grafana-prometheus` | Open-source monitoring with Prometheus + Grafana |
| `coding-sentry-api` | Error tracking and performance monitoring (complementary to Datadog) |
| `coding-pagerduty-api` | On-call management and incident escalation |
| `coding-logging-patterns` | Structured logging patterns that work well with Datadog |
| `coding-slack-api` | Slack notifications for Datadog monitor alerts |

---

## Live References

| Resource | URL |
|----------|-----|
| datadog-api-client (PyPI) | https://pypi.org/project/datadog-api-client/ |
| ddtrace (PyPI) | https://pypi.org/project/ddtrace/ |
| Datadog API Reference | https://docs.datadoghq.com/api/latest/ |
| Metrics Submission | https://docs.datadoghq.com/api/latest/metrics/#submit-metrics |
| Monitors API | https://docs.datadoghq.com/api/latest/monitors/ |
| Datadog SDK GitHub | https://github.com/DataDog/datadog-api-client-python |
| APM Tracing Guide | https://docs.datadoghq.com/tracing/ |
| Synthetic Monitoring | https://docs.datadoghq.com/synthetics/ |
| Rate Limits | https://docs.datadoghq.com/api/latest/rate-limits/ |

---

## 📎 Best Practices Notes

### Tagging Strategy

Consistent tagging is the foundation of useful monitoring:

```
# Standard set (always include)
env:production      # or env:staging, env:dev
service:checkout    # your service/microservice name
team:platform       # team owning this resource
version:v1.2.3      # deployed version (for canary comparison)

# Additional useful tags
shard:primary
az:us-east-1a
instance-type:r5.large
```

### Metric Naming

- Namespace by service: `checkout.` not `app.`
- Use snake_case with dots: `request.latency.p50`
- Suffix by unit: `.seconds`, `.bytes`, `.count`, `.total`
- Avoid redundant names: `checkout.latency` not `checkout.checkout_latency`

Good:
- `checkout.request.latency.p95`
- `checkout.error.count`
- `checkout.queue.depth.gauge`

---

## 📎 Rate Limit Handling

When you hit 429:

1. Check `Retry-After` response header
2. Use exponential backoff: `delay = initial * (2 ** attempt)`
3. Add jitter: `delay *= random.uniform(0.8, 1.2)`
4. Put failed metrics back in the batch for retry
5. Log the rate limit event with retry delay
6. Alert on sustained rate limiting (indicates quota issue)
