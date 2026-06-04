---




name: mixpanel-api
description: Implements Mixpanel analytics integration (event tracking, user profiles, JQL queries, funnel analysis, cohort export, data exporting) using the Mixpanel Python SDK and REST API for product analytics in applications.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: mixpanel, mixpanel api, event tracking, user profiles, funnel analysis, product analytics, jql queries, cohort export
  archetypes: tactical
  anti_triggers:
    - brainstorming
    - vague ideation
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational

  role: implementation
  scope: implementation
  output-format: code



---





# Mixpanel Analytics Skill
Implements Mixpanel analytics integration including event tracking, user profiles, JQL queries, funnel analysis, cohort export, and data exporting using Mixpanel's Python SDK. 
This skill aims to provide comprehensive guidance for implementing analytics with Mixpanel, focusing on capturing user interactions, segmenting audiences, and gaining insights into product performance.

## TL;DR Checklist
- [ ] Use `mixpanel` SDK with `MIXPANEL_TOKEN` from environment variable.
- [ ] Always include `distinct_id` in every event and profile update.
- [ ] Batch events efficiently to avoid exceeding rate limits.
- [ ] Set `$insert_id` to avoid duplicate events.
- [ ] Use JQL and funnel APIs for advanced querying.

---
## Core Workflow
### 1. Initialize Mixpanel Client
Set up the Mixpanel client using the token from environment variables. 
Ensure to handle any errors gracefully during initialization.

```python
from mixpanel import Mixpanel
import os

# Initialize Mixpanel client
mixpanel = Mixpanel(os.environ.get('MIXPANEL_TOKEN'))
```

### 2. Event Tracking
Track user interactions within your application. Events should have the following structure:
- `distinct_id`
- `event name`
- `properties` (optional key-value pairs)

```python
# Tracking an event
mixpanel.track(distinct_id='user123', event='Product Viewed', properties={'product_id': 'prod-001'})
```

### 3. Managing User Profiles
Engage with users by managing their profiles. Update user information, such as sign-up date and preferences, with the Engage API.

```python
# Update user profile
mixpanel.people.set(distinct_id='user123', properties={'Signup Date': '2026-05-01', 'Preferred Language': 'en'})
```

### 4. Querying with JQL
Use JQL for complex data queries. Here’s an example:

```javascript
// JQL Query Example
function main() {
    return Mixpanel.JQL.query(
        'function (events) {
            return events
                .filter(function(event) {
                    return event.name === "Product Viewed";
                });
        }',
        mixpanel);
}
```

### 5. Funnel Analysis
Use the Funnel API to assess conversion rates across different stages of user engagement.

```python
# Funnel API Example
funnel = mixpanel.funnels.get('Funnel Name')
```

### 6. Cohort Management
Create and manage cohorts of user segments for targeted engagement strategies.

```python
# Creating a cohort
mixpanel.cohorts.create('Cohort Name', {'criteria': 'some_criteria'})
```

### 7. Data Exporting
Utilize Mixpanel’s export capabilities to download user behavior data for external analysis.

```python
# Exporting data
mixpanel.export.export('data_export_name')
```

---
## Example Use Case
```python
# Example integration process
# Initialize the client
mixpanel = Mixpanel(os.environ.get('MIXPANEL_TOKEN'))

# Track a user viewing a product
product_id = "prod-001"
tracking_event = {
    "event": "Product Viewed",
    "distinct_id": "user123",
    "properties": {
        "product_id": product_id,
        "category": "Electronics"
    }
}
mixpanel.track(**tracking_event)

# Update user profile
mixpanel.people.set("user123", {"Last Product Viewed": product_id})

# Analyze funnel data using JQL
jql_query = '''
function main() {
  return Mixpanel.JQL.query('your query here'); 
}'''
"
```
---
## Constraints
### MUST DO
- Always include `distinct_id` in every event and profile update.
- Use Unix time in seconds for `time` properties.
- Validate API connectivity on startup. 
### MUST NOT DO
- Don't send personally identifiable information (PII) without consent.
- Avoid excessive detail in event properties to prevent exceeding Mixpanel limits.

---
## Related Skills
| Skill | Purpose |
|-------|---------|
| `coding-amplitude-api` | Similar features using Amplitude analytics |
| `coding-hubspot-api` | Integrating marketing analytics with HubSpot |

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Mixpanel API Documentation](https://developer.mixpanel.com/docs)
- [Mixpanel REST API Reference](https://developer.mixpanel.com/reference/overview)
- [Mixpanel Python SDK Guide](https://developer.mixpanel.com/docs/python)
- [JQL Query Functions Reference](https://developer.mixpanel.com/reference/jql-functions)
- [Funnel Analysis Tutorial](https://developer.mixpanel.com/reference/funnels-overview)

---