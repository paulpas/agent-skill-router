---
name: datadog-api-metrics
description: Implements metrics submission to Datadog API using `datadog-api-client` with best practices for batching and tagging.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers:
    - datadog metrics
    - submit metrics
    - datadog API metrics
    - datadog batching
    - datadog tagging
    - how do I send metrics to datadog
  role: implementation
  scope: implementation
  output-format: code
  related-skills: datadog-api-logs, datadog-api-monitors
  archetypes:
    - monitoring
    - metrics management
  anti_triggers:
    - metrics flooding
    - unstructured metrics
  response_profile:
    verbosity: medium
    directive_strength: high
---
Implements production-grade metrics submission to Datadog using `datadog-api-client`. Metrics are batched for efficiency and tagged for categorization. Adheres to Datadog best practices to ensure data integrity and efficient API usage.

## TL;DR Checklist
- [ ] Use `datadog-api-client` to interact with the Datadog API for metrics submission.
- [ ] Batch metrics in 50-100 point batches to minimize API calls.
- [ ] Always include mandatory tags: `env`, `service`, `version`, and `team` in every metric.
- [ ] Validate API accessibility on startup to ensure connection reliability.

## Core Workflow
1. **Initialize Configuration**: Create Datadog client with environment variables for authentication (`DD_API_KEY`, `DD_SITE`). Ensure the client initializes without error.
   **Checkpoint:** Validate the connection using a lightweight API call to list hosts.

2. **Define Metrics Names and Tags**: Establish a consistent naming convention for metrics, including a prefix representing the service or application. Define a standard tagging strategy that includes mandatory tags like `env`, `service`, and `team`.
   **Checkpoint:** Each metric must be submitted with the defined set of mandatory tags.

3. **Implement Batching Logic**: Collect metrics in memory and batch-submit them to the Datadog API. Leverage asynchronous threads for sending metrics to handle high traffic efficiently.
   **Checkpoint:** Ensure metrics are submitted in batches to avoid hitting rate limits and ensure successful API calls.

4. **Error Handling and Retrying**: Implement error catching to handle API exceptions. If rate limits are reached, back off and retry after the specified delay.
   **Checkpoint:** Record failed submissions and implement logic to retry sending them after a set duration.

## Implementation Patterns
### Pattern 1: Metrics Submission Implementation
```python
from datadog_api_client import ApiClient, Configuration
from datadog_api_client.v2.api.metrics_api import MetricsApi
from datadog_api_client.v2.model.metric_payload import MetricPayload
from datadog_api_client.v2.model.metric_series import MetricSeries
from datadog_api_client.v2.model.metric_point import MetricPoint
from datadog_api_client.exceptions import ApiException
import os
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class MetricSubmission:
    def __init__(self):
        self.configuration = Configuration(api_key={"apiKeyAuth": os.environ["DD_API_KEY"]},
                                           server_variables={"site": os.environ.get("DD_SITE", "datadoghq.com")})
        self.api_client = ApiClient(self.configuration)
        self.metrics_api = MetricsApi(self.api_client)

    def submit_metrics(self, metrics: list[MetricPoint], tags: list[str] = []):
        metric_series = [MetricSeries(metric="app.metrics", type="gauge", points=[MetricPoint(timestamp=int(datetime.now().timestamp()), value=metric)]) for metric in metrics]
        payload = MetricPayload(series=metric_series, tags=tags)
        try:
            self.metrics_api.submit_metrics(payload=payload)
            logger.info("Metrics submitted successfully")
        except ApiException as e:
            logger.error("Failed to submit metrics: %s", e)
```

### Pattern 2: Error Handling in Metrics Submission
```python
def handle_api_response(response):
    if response.status_code == 429:
        retry_after = int(response.headers.get("Retry-After", "1"))
        logger.warning(f"Rate limit exceeded; retrying after {retry_after} seconds...")
        time.sleep(retry_after)
    elif response.status_code == 400:
        logger.error("Bad Request: Invalid metrics data");
    elif response.status_code == 403:
        logger.critical("Forbidden: Check your API Key or permissions");
        raise PermissionError("Access Denied")
```

### Constraints

#### MUST DO
- Always use environment variables for sensitive data including API keys.
- Batch metrics in groups of 50-100 for efficient submission.
- Add mandatory tags (`env`, `service`, `team`, `version`) to every metric submitted.
- Validate that the API connection is functional before production deployment.

#### MUST NOT DO
- Never hardcode sensitive information like API keys into your source code.
- Do not submit metrics individually; group them to reduce overhead.
- Avoid omitting essential tags on submitted metrics, as it will hinder data categorization and filtering.

# Datadog Metrics Submission
Implements log submission and forwarding to Datadog API with a focus on structured logging for enhanced observability. Configures logging to include necessary Datadog fields for correlation with metrics.

## TL;DR Checklist
- [ ] Use structured logging with JSON format to enable context-rich log entries.
- [ ] Inject Datadog-specific fields (`dd.trace_id`, `dd.span_id`) during log submission.
- [ ] Validate the connection to the Datadog logs endpoint on startup.

## Core Workflow
1. **Initialize Log Configuration**: Set up a logger that outputs in JSON format. Integrate the necessary Datadog fields for tracing.
   **Checkpoint:** Test log output to ensure all required fields are present.

2. **Inject Datadog Fields**: Ensure every log entry includes `dd.trace_id` and `dd.span_id` using the `ddtrace` library.
   **Checkpoint:** Confirm the correlation of logs to their corresponding tracing information.

3. **Submit Logs to Datadog**: Forward the logs in batches to minimize API calls. Ensure that logs are sent with the correct tags reflecting service and environment.
   **Checkpoint:** Validate the submission and check for errors after each batch.

## Implementation Patterns
### Pattern 1: Log Submission Implementation
```python
import logging
import json
import os
from ddtrace import patch

# Patch logging to automatically add Datadog trace IDs
patch(logging=True)

class DatadogLogger:
    def __init__(self):
        logging.basicConfig(level=logging.INFO,
                            format='%(asctime)s	%(levelname)s	%(message)s')

    def log_info(self, message, tags=None):
        log_entry = {"message": message, "tags": tags if tags else []}
        print(json.dumps(log_entry))  # Send to your log forwarding mechanism.

    def log_error(self, message, error, tags=None):
        log_entry = {"message": message, "error": str(error), "tags": tags if tags else []}
        print(json.dumps(log_entry))  # Send to your log forwarding mechanism.
```
### Pattern 2: Error Handling in Log Submission
```python
def handle_logging_error(e):
    logger.error("Logging error occurred: %s", str(e))
    # Implement retry logic or fallback as necessary
``` 

### Constraints

#### MUST DO
- Ensure structured logs are submitted in a format that includes key metadata for observability.
- Validate configuration against the logs endpoint during initialization.

#### MUST NOT DO
- Never send plain text logs without context. Use structured JSON for better observability.
- Do not neglect to include trace IDs for correlation purposes.

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Datadog Logs API Documentation](https://docs.datadoghq.com/api/latest/logs/)
- [Structured Logging with Datadog](https://docs.datadoghq.com/logs/log_configuration/processing_rules/)
- [Log Collection and Forwarding Guide](https://docs.datadoghq.com/logs/log_collection/)
- [Log Analytics and Exploration](https://docs.datadoghq.com/logs/exploration/)
- [Datadog Log Retention and Storage](https://docs.datadoghq.com/logs/retention_and_storage/)