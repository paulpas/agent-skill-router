# Skill: datadog-api-traces

---
name: datadog-api-traces
description: Implements application performance monitoring (APM) using the Datadog API for tracing, including best practices for initiating and managing traces and spans.
license: MIT
compatibility: opencode
metadata:
  archetypes: monitoring, application performance
  anti_triggers: manual instrumentation, performance degradation
  response_profile:
      verbosity: medium
      directive_strength: high

  version: 1.0.0
  domain: coding
  triggers: datadog traces, send traces, trace management, datadog APM, how do I send traces to datadog
  role: implementation
  scope: implementation
  output-format: code
  related-skills: datadog-api-logs, datadog-api-metrics, datadog-api-monitors
------
# Datadog APM Tracing
Implements APM tracing for applications using Datadog API. This skill covers how to create, manage, and submit traces for effective performance monitoring and alerting based on APM data.

## TL;DR Checklist
- [ ] Use Datadog APM tracing library to instrument applications.
- [ ] Create spans around significant operations to monitor performance.
- [ ] Include context (trace_id, span_id) in all logs to correlate traces and logs.
- [ ] Ensure rate limits are managed during trace submission.

## Core Workflow
1. **Initialize the Tracing Client**: Create and configure the tracing client using `ddtrace` library ensuring proper API key handling.
   **Checkpoint:** Validate connectivity to the Datadog APM endpoints on startup.

2. **Create Spans for Key Operations**: Wrap operations (e.g., HTTP calls, database queries) in spans to measure performance metrics clearly.
   **Checkpoint:** Ensure spans have meaningful names and include error capture.

3. **Submit Traces to Datadog**: Send traces, including all spans, to Datadog using the provided API endpoints.
   **Checkpoint:** Validate that traces arrive at the endpoint without errors; implement retries for transient failures.

## Implementation Patterns
### Pattern 1: Initializing the Tracing Client
```python
from ddtrace import tracer, patch
import os

# Patch auto-instrumentation to collect traces from HTTP requests
def setup_datadog_apm():
    patch(sqlalchemy=True, requests=True)
    trace_agent_url = os.environ.get("DD_TRACE_AGENT_URL", "http://localhost:8126")
    tracer.configure(service="my-service", hostname=trace_agent_url)
    # Optionally set other global settings here
def example_function():
    with tracer.trace("example.function") as span:
        # Perform work here
        pass
```
### Pattern 2: Submitting Error Information
```python
def submit_error_trace(span, error):
    span.set_tag("error", True)
    span.set_tag("error.message", str(error))
    span.set_tag("error.stack", error.__traceback__)
``` 

### Constraints
#### MUST DO
- Use `ddtrace` to collect and submit traces.
- Always set trace IDs in logs for correlation with APM data.

#### MUST NOT DO
- Do not create spans without measuring their execution context (e.g., response times, errors).
- Never assume traces will be processed at a constant rate; handle rate limits gracefully.

---