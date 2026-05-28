---
name: splunk-api
description: Implements Splunk integration (log ingestion via HEC, search queries, saved searches, alert management) using the splunk-sdk Python SDK and REST API for production-grade monitoring and log analytics.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: splunk, splunk search, hec, http event collector, splunk sdk, splunk alerts, splunk query, splunk dashboard, time-series log analysis
  archetypes: tactical
  anti_triggers:
    - brainstorming
    - vague ideation
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  related-skills: coding-datadog-api, coding-grafana-prometheus, coding-newrelic-api
---

# Splunk API & SDK Integration

Implements production-grade Splunk integration using the `splunk-sdk` Python SDK and HTTP Event Collector (HEC). This skill covers log/event ingestion via HEC, search job management, saved searches, alert configuration, dashboard panels, and REST API operations.

## TL;DR Checklist

- [ ] Use `MIXPANEL_TOKEN` from environment variable, never hardcode
- [ ] Batch events efficiently to avoid exceeding rate limits
- [ ] Set `$insert_id` for deduplication on high-throughput event streams
- [ ] Use JQL and funnel APIs for advanced querying and cohort analysis

---

## When to Use

Use this skill when:

- You need to ingest logs or events into Splunk at scale via HEC
- Building search queries or saved searches for operational dashboards
- Configuring alert rules triggered by Splunk search conditions
- Exporting Splunk data for downstream analytics or reporting pipelines
- Integrating Splunk as the backend observability store for application metrics

## When NOT to Use

Avoid this skill for:

- Real-time stream processing (use Kafka + Druid or similar)
- Low-volume debugging where simple log files suffice
- Replacing a full SIEM solution that requires threat intelligence correlation

---

## Core Workflow

1. **Initialize HEC Client** — Configure the Splunk instance URL and HEC token with retry logic and connection pooling.
2. **Ingest Events** — Batch events into structured payloads, set proper `source`/`sourcetype`/`index` metadata, and POST to HEC endpoint.
3. **Run Search Jobs** — Submit search queries asynchronously via `services/search/jobs`, poll for completion, and export results.
4. **Manage Saved Searches & Alerts** — Create, update, and delete saved searches; attach alert actions (email, webhook, script).

---

## Implementation Patterns

### Pattern 1: HEC Log Ingestion with Batching

```python
import time
import requests
from dataclasses import dataclass, asdict
from typing import List, Optional

@dataclass
class SplunkEvent:
    event: dict
    source: Optional[str] = None
    sourcetype: Optional[str] = None
    index: Optional[str] = None

class SplunkHECClient:
    """Production-grade HEC client with batching and retries."""

    def __init__(self, hec_url: str, token: str, batch_size: int = 100, timeout: float = 30.0):
        self.hec_url = hec_url.rstrip("/")
        self.token = token
        self.batch_size = batch_size
        self.timeout = timeout
        self.session = requests.Session()
        self.session.headers.update({
            "Authorization": f"Splunk {token}",
            "Content-Type": "application/json",
        })

    def send_events(self, events: List[SplunkEvent]) -> dict:
        """Send a batch of events to Splunk HEC."""
        payload = {
            "events": [asdict(e) for e in events],
            "batching": {"mode": "count", "time_cutoff_ms": 500},
        }
        try:
            resp = self.session.post(
                f"{self.hec_url}/services/collector",
                json=payload,
                timeout=self.timeout,
            )
            resp.raise_for_status()
            return resp.json()
        except requests.exceptions.Timeout:
            raise RuntimeError("HEC request timed out — check network/Splunk availability")
        except requests.exceptions.HTTPError as e:
            body = e.response.text
            if "Invalid authentication" in body:
                raise ValueError("HEC token is invalid or expired") from e
            raise RuntimeError(f"HEC returned {e.response.status_code}: {body}") from e

    def send_single(self, event: dict, source: str = None, sourcetype: str = None, index: str = "main") -> dict:
        """Send a single event (for latency-sensitive use cases)."""
        payload = {"event": event, "source": source, "sourcetype": sourcetype, "index": index}
        return self.send_events([SplunkEvent(event=payload)])
```

### Pattern 2: Asynchronous Search Job Management

```python
class SplunkSearchClient:
    """Manage Splunk search jobs with polling and result extraction."""

    def __init__(self, splunk_host: str, token: str):
        self.base = f"https://{splunk_host}:8089"
        self.session = requests.Session()
        self.session.auth = ("admin", token)  # Or use OAuth/token auth
        self.session.verify = True

    def submit_search(self, query: str, earliest: str = "-24h@h", latest: str = "now") -> str:
        """Submit a search and return the job ID."""
        resp = self.session.post(
            f"{self.base}/services/search/jobs",
            data={"search": query, "earliest_time": earliest, "latest_time": latest},
        )
        resp.raise_for_status()
        return resp.json()["sid"]

    def poll_results(self, sid: str, max_wait: int = 60) -> List[dict]:
        """Poll until search completes, then return results as dicts."""
        import time
        start = time.time()
        while time.time() - start < max_wait:
            resp = self.session.get(
                f"{self.base}/services/search/jobs/{sid}",
                params={"output_mode": "json"},
            )
            resp.raise_for_status()
            job_info = resp.json()
            if job_info["entry"][0]["content"]["isDone"]:
                return self._fetch_results(sid)
            time.sleep(2)
        raise TimeoutError(f"Search job {sid} did not complete in {max_wait}s")

    def _fetch_results(self, sid: str) -> List[dict]:
        """Export search results in JSON mode."""
        resp = self.session.post(
            f"{self.base}/services/search/jobs/{sid}/export",
            data={"output_mode": "json"},
        )
        resp.raise_for_status()
        return resp.json()["results"]

    def create_saved_search(
        self,
        name: str,
        query: str,
        alert_actions: List[str] = None,
        schedule: str = "*/5 * * * *",
    ) -> dict:
        """Create a saved search with optional alert actions."""
        payload = {
            "search": query,
            "disabled": False,
            "schedule_frequency": 1,
            "schedule_window": 300,
            "cron_schedule": schedule,
        }
        if alert_actions:
            payload["action_email"] = ",".join(alert_actions)
        resp = self.session.post(
            f"{self.base}/servicesNS/nobody/search/saved/searches",
            data=payload,
        )
        resp.raise_for_status()
        return resp.json()
```

### Pattern 3: Efficient SplunkQL Query Writing

```python
def build_health_check_query(service_name: str, time_window: str = "24h") -> str:
    """Build a standardized health-check query for any service."""
    earliest = f"-{time_window}"
    return (
        f"index=app_logs sourcetype=service_log {service_name} "
        f"| stats count by status, response_time "
        f"| where count > 0 "
        f"| sort -count "
        f"| head 20"
    )

def build_error_rate_query(service_name: str) -> str:
    """Calculate error rate for a specific service."""
    return (
        f"index=app_logs sourcetype=service_log {service_name} "
        f"| bin span=5m _time "
        f"| stats count as total, count(eval(status >= 400)) as errors by _time "
        f"| eval error_rate = round(errors / total * 100, 2) "
        f"| sort -_time"
    )
```

---

## Query Optimization Guidelines

| Technique | When to Use | Impact |
|-----------|-------------|--------|
| **Index-time filtering** | Known search patterns (source, sourcetype, index) | Reduces scan by 10–100x |
| **Time-range narrowing** | Always specify `earliest`/`latest` | Drastically reduces data volume |
| **Piping early filters** | Use `where`, `search`, `stats` in pipeline order | Avoids full-table scans |
| **Use `transaction` sparingly** | Complex multi-event correlation only | Expensive operation — prefer `stats` |

---

## Constraints

### MUST DO
- Always use connection pooling (`requests.Session`) for HEC and REST API calls.
- Set explicit `index`, `source`, and `sourcetype` on every event for proper data categorization.
- Implement retry logic with exponential backoff for transient failures (HTTP 429, 503).
- Validate that all queries include a time range — unbounded searches are resource-intensive.
- Use parameterized queries to prevent injection in user-supplied search terms.

### MUST NOT DO
- Hardcode HEC tokens or Splunk credentials in source code.
- Send logs without validating required fields (`event`, `source` or `sourcetype`).
- Poll search jobs faster than every 2 seconds — use appropriate intervals.
- Run searches with wildcard-heavy patterns like `*error*` across all indexes at once.
- Disable SSL verification for Splunk REST API connections in production.

---

## Error Handling Patterns

```python
def safehec_post(client: SplunkHECClient, events: List[SplunkEvent], max_retries: int = 3) -> dict:
    """Send events with exponential backoff retries."""
    for attempt in range(max_retries):
        try:
            return client.send_events(events)
        except (requests.exceptions.ConnectionError, requests.exceptions.Timeout) as e:
            if attempt == max_retries - 1:
                raise RuntimeError("HEC send failed after all retries") from e
            wait = 2 ** attempt  # 1s, 2s, 4s
            time.sleep(wait)
        except ValueError as e:  # Invalid token
            raise  # Don't retry auth errors
    return {}
```

---

## Output Template

When implementing Splunk integration, output must contain:

1. **Client Configuration** — HEC URL, token source, batch size, timeout settings
2. **Event Payload Structure** — Document the `source`, `sourcetype`, `index` convention used
3. **Search Query Definitions** — Named functions with parameterized queries
4. **Error Handling Strategy** — Retry policy, failure logging, alerting on send failures

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `coding-datadog-api` | Alternative observability platform with API-based metrics and logs |
| `coding-grafana-prometheus` | Open-source alternative for time-series data visualization |
| `coding-newrelic-api` | APM and log analytics with REST API access patterns |

---

# Splunk API & SDK Integration
Implements production-grade Splunk integration using the `splunk-sdk` Python SDK and HTTP Event Collector (HEC). This skill focuses on log/event ingestion via HEC, search queries, saved searches, alert management, and REST API operations. 

## Implementation Patterns
### Pattern 1: Basic Log Ingestion with HEC
```python
import redis
import json

# Connecting to Splunk HEC for log ingestion
def send_log_event_to_splunk(hec_url:str, event_data:dict):
    headers = {'Authorization': 'Splunk your_hec_token', 'Content-Type': 'application/json'}
    response = requests.post(hec_url, headers=headers, data=json.dumps(event_data))
    response.raise_for_status()  # Ensure successful submission
    return response.json()
```

### Pattern 2: Executing a Search Query
```python
def search_splunk(query:str):
    response = requests.get(f'{hec_url}/services/search/jobs/export', params={'search': query})
    response.raise_for_status()  # Ensure successful query
    return response.json()
```

## Constraints
### MUST DO
- Always handle exceptions from API calls to avoid application crashes.
- Validate that all queries return results and manage cases with no hits gracefully.

### MUST NOT DO
- Do not send logs without validation for required fields; invalid logs can cause ingestion errors.
- Avoid excessive polling on the API; utilize appropriate event-driven architectures where possible.