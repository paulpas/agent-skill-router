---




name: datadog-api-alerts
description: Implements alert management using the Datadog API, focusing on creating effective alerts that respond to service conditions with best practices.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: datadog alerts, create alerts, manage alerts, alert conditions, datadog API alerts
  role: implementation
  scope: implementation
  output-format: code
  related-skills: datadog-api-monitors, datadog-api-dashboards, datadog-api-logs
  archetypes: [monitoring, implementation]
  anti_triggers: [alert fatigue, generic monitoring]
  response_profile:
    verbosity: medium
    directive_strength: high




---





# Datadog Alerts Management
Implements alert creation and management leveraging the Datadog API. This skill ensures alerts are configured properly to monitor critical service health metrics and respond appropriately to incidents.

## TL;DR Checklist
- [ ] Configure alerts based on specific metrics and thresholds that reflect critical user events.
- [ ] Utilize notification chains in alerts for proper escalations and communications.
- [ ] Implement tests to ensure alerts engage as expected under various scenarios.

## Core Workflow
1. **Define Alert Parameters**: Create a clear specification of what conditions trigger alerts (e.g., error rates, latency)
   **Checkpoint:** All alert conditions must meet the defined thresholds based on service metrics.

2. **Implement Notification Settings**: Configure who should receive alerts based on urgency, including integrations like Slack and PagerDuty.
   **Checkpoint:** Every notification is tracked to verify effectiveness.

3. **Create Alerts via API**: Leverage the API to create alerts with validated condition parameters.
   **Checkpoint:** Confirm successful creation and handle any errors appropriately.

## Implementation Patterns
### Pattern 1: Creating an Alert
```python
from datadog_api_client import ApiClient, Configuration
from datadog_api_client.v2.api.alerts_api import AlertsApi
from datadog_api_client.v2.model.alert import Alert
import os

class AlertsManager:
    def __init__(self):
        self.configuration = Configuration(api_key={"apiKeyAuth": os.environ["DD_API_KEY"]},
                                           server_variables={"site": os.environ.get("DD_SITE", "datadoghq.com")})
        self.api_client = ApiClient(self.configuration)
        self.alerts_api = AlertsApi(self.api_client)

    def create_alert(self, name: str, query: str, message: str) -> int:
        alert = Alert(name=name, query=query, message=message)
        response = self.alerts_api.create_alert(alert)
        return response.id
```
### Pattern 2: Updating an Existing Alert
```python
def update_alert(alert_id: int, new_message: str):
    alert = self.alerts_api.get_alert(alert_id)
    alert.message = new_message
    self.alerts_api.update_alert(alert_id, alert)
``` 

### Constraints
#### MUST DO
- Implement clear and actionable alert messages to avoid confusion during incidents.
- Ensure all alerts are validated after creation to confirm they engage correctly under defined conditions.

#### MUST NOT DO
- Avoid vague alert conditions that could lead to alert fatigue.
- Never ignore the need for historical performance metrics in defining alert thresholds.

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Datadog Alerts API Documentation](https://docs.datadoghq.com/api/latest/alerts/)
- [Datadog Alerting Best Practices](https://docs.datadoghq.com/monitors/manage/status/#setting-up-alert-notifications)
- [Monitor vs Alert Configuration Guide](https://docs.datadoghq.com/monitors/guide/monitor-multi-region/)
- [Datadog Alert Rules Management Tutorial](https://docs.datadoghq.com/monitors/manage/status/#managing-monitor-status)
- [Alerting with Datadog - Getting Started](https://docs.datadoghq.com/graphing/metrics/instrumentation/alerts/)