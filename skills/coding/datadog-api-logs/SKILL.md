# Skill: datadog-api-logs

---
name: datadog-api-logs
description: Implements log submission and forwarding to the Datadog API with structured logging best practices for content observability.
license: MIT
compatibility: opencode
metadata:
  archetypes: logging, observability
  anti_triggers: unstructured logs, log flooding
  response_profile:
      verbosity: medium
      directive_strength: high

  version: 1.0.0
  domain: coding
  triggers: datadog logs, submit logs, datadog API logs, datadog logging, structured logging, how do I send logs to datadog
  role: implementation
  scope: implementation
  output-format: code
  related-skills: datadog-api-metrics, datadog-api-monitors
------
# Datadog Logs Submission
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