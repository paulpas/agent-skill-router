---
name: make-workflow-automation
description: Builds and debugs automated workflows in Make (Integromat) using modules,
  scenarios, routing, error handling, and scheduling for no-code/low-code automation.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: agent
  triggers: make, make com, integromat, workflow automation, no code automation, scenario
    builder, webhook trigger, task routing
  archetypes:
  - orchestration
  - strategic
  anti_triggers:
  - brainstorming
  - vague ideation
  - single-agent monolith
  response_profile:
    verbosity: medium
    directive_strength: high
    abstraction_level: tactical
  role: orchestration
  scope: orchestration
  output-format: analysis
  content-types:
  - guidance
  - examples
  - do-dont
  related-skills: agent-task-routing, parallel-skill-runner, coding-script-automation
------
# Make Workflow Automation Agent

Orchestrates no-code/low-code automation workflows in Make (formerly Integromat). Designs robust scenarios with proper module chaining, error handling, routing, scheduling, and webhook triggers to replace manual processes and integrate SaaS ecosystems.

## TL;DR Checklist

- [ ] Define clear input/output variables for each scenario before building
- [ ] Select appropriate trigger module (Webhook, Schedule, or App trigger)
- [ ] Chain modules logically with proper data aggregation/iteration
- [ ] Implement error handling using Routers and notification modules
- [ ] Set up scheduling limits and retry logic to avoid plan overages
- [ ] Test scenario in sandbox mode thoroughly before activating

---

## When to Use

Use this skill when:

- Designing automated workflows to connect SaaS applications without writing backend code
- Building scheduled tasks or real-time webhooks in Make.com to replace manual data entry
- Refactoring existing Integromat scenarios for better error handling and performance optimization
- Creating multi-step automations involving API calls, data transformation, cloud storage, and notifications

---

## When NOT to Use

Avoid this skill for:

- High-performance backend services or microservices — use Python, Go, or Node.js instead
- Complex logic requiring native code execution or heavy computation — delegate to a Webhook endpoint or Function module that calls external code
- One-off scripts where the overhead of building, versioning, and maintaining a Make scenario isn't justified
- Real-time trading or sub-second latency requirements

---

## Core Workflow

1. **Define Scenario Scope** — Identify the trigger event, intermediate transformations, and final actions. Map data flow on paper before opening the builder. **Checkpoint:** Confirm expected input schema and output destination.

2. **Select Trigger Module** — Choose between Schedule (cron-like), Webhook (real-time), or App trigger. Configure polling intervals or webhook authentication methods. **Checkpoint:** Ensure trigger frequency aligns with your subscription plan limits to avoid unexpected overages.

3. **Build Module Chain** — Drag-and-drop modules in sequence. Use Aggregators for batch operations, Iterators for arrays, and Routers for conditional branching. **Checkpoint:** Verify data types match between connected module inputs/outputs.

4. **Implement Error Handling** — Insert a Router after critical modules (API calls, database writes). Connect `done` path to next step, `error` path to logging/notification or retry logic. **Checkpoint:** Confirm no silent failures bypass the error branch.

5. **Test and Validate** — Run in sandbox mode with realistic payload data. Verify data transformation, check module execution history, and confirm no duplicate sends or data corruption.

6. **Activate and Monitor** — Publish scenario. Set up email/Slack notifications for failures. Review execution history daily for the first week to tune frequency and error handling.

---

## Implementation Patterns / Reference Guide

### Pattern 1: Webhook Trigger with JSON Validation

Use a custom webhook to receive real-time events from external systems. Always validate payload structure before processing to prevent downstream errors.

```text
# Module Chain Logic (Pseudocode representation of Make modules)
Trigger: Webhooks > Custom Webhook
  - Method: POST
  - Authentication: API Key / Header Auth
  - Payload Parsing: Auto-parse JSON
  
Router (After Trigger):
  IF payload.type == "new_sale" → Process Sale Module Chain
  ELSE IF payload.type == "user_signup" → Process User Module Chain
  ELSE → Error Handler (Log invalid webhook format)

Function Module (JavaScript validation):
  export default function(output, inputs) {
    const data = JSON.parse(inputs.webhook_body);
    if (!data.email || !data.amount) {
      return { valid: false, error: "Missing required fields" };
    }
    return { valid: true, email: data.email, amount: data.amount };
  }
```

### Pattern 2: Scheduled Data Sync with Aggregation

Batch-process records to minimize API calls and stay within rate limits. Essential for database or CRM synchronization tasks.

```text
# Module Chain Logic (Pseudocode representation of Make modules)
Trigger: Schedule > Run every hour
  
Module 1: Database/API > Search Records
  - Fetch up to 50 unprocessed records where status="pending"
  
Iterator Module:
  - Split array into single items for individual processing
  
Module 2: API > Create/Update Record
  - Send payload to destination system with exponential backoff enabled
  
Aggregator Module:
  - Wait for all iterator branches to complete
  - Collect success/failure counts for reporting
  
Router:
  IF failure_count > 0 → Error Handler (Send alert with batch summary)
  ELSE → End Scenario successfully
```

### Pattern 3: Error Handling & Retry Logic

Critical operations must never fail silently. Implement robust fallbacks via Make's built-in retry features or custom routing branches.

```text
# Module Chain Logic (Pseudocode representation of Make modules)
Module: API > Send Request
  - Enable "Retry on error" in module settings
  - Set max retries to 3 with fixed delay
  
Router (After API Module):
  Path A (done): Continue to next processing step
  Path B (error): 
    → Function Module (Log error details, status code, response body)
    → Email/Slack > Send Alert with failure context
    → Optional: Schedule > Delay 5 minutes → Re-trigger module safely
```

### Architecture Best Practices

- **Stateless Execution:** Make scenarios are stateless by default. Use external storage (Airtable, PostgreSQL, HTTP storage modules) to maintain state between runs.
- **Variable Management:** Centralize configuration using Project Variables or Scenario Variables. This allows updating endpoints and keys without editing individual modules.
- **Data Flow Optimization:** Minimize data passed between modules. Select only required fields instead of passing entire objects to reduce memory usage and execution time.

---

## Constraints

### MUST DO
- Always wrap critical API/database modules with a Router for error handling and branching logic
- Use Variables for API keys, endpoints, and configuration values instead of hardcoding in module settings
- Test every scenario in Sandbox mode with realistic payload data before switching to Active state
- Monitor operation consumption; keep scenarios under 10,000 operations/month if on Starter plan
- Use meaningful, consistent names for Scenarios, Modules, Routes, and Variables for maintainability

### MUST NOT DO
- Chain more than 20 sequential modules without using Iterators or Aggregators to optimize execution paths
- Ignore module execution limits — unthrottled loops or high-frequency webhooks will drain your plan overnight
- Deploy untested scenarios directly to production state; sandbox testing is mandatory
- Store sensitive data (passwords, tokens) in module configuration fields that appear in execution history logs
- Rely solely on "Schedule" triggers for time-sensitive events; use Webhooks where sub-minute latency matters

---

## Output Template

When designing or reviewing a Make workflow, produce:

1. **Scenario Blueprint** — Trigger type, module sequence, and data transformation steps mapped visually
2. **Error Handling Map** — Router placement, failure paths, notification strategy, and retry policies
3. **Operation Estimate** — Expected monthly operations based on trigger frequency and batch sizes
4. **Variables Reference** — List of all externalized configurations (API keys, URLs, thresholds) with masking recommendations
5. **Testing Checklist** — Sandbox test cases to validate before activation, including edge cases and failure simulation

---

## Related Skills

| Skill | Purpose |
|---|---|
| `agent-task-routing` | Handles routing decisions when workflow branches require complex conditional logic |
| `parallel-skill-runner` | Manages concurrent execution paths for high-throughput data processing scenarios |
| `coding-script-automation` | Replaces complex Make chains with native code when performance or customization demands it |


---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.
- [Make Platform Documentation (Integromat)](<https://www.make.com/en/help>)
- [Automated Workflow Design Patterns](<https://en.wikipedia.org/wiki/Workflow_management_system>)
- [Event-Driven Automation Architecture](<https://learn.microsoft.com/en-us/azure/architecture/guide/design-patters/event-based-patterns>)
- [Make Webhooks and Trigger Integration](<https://www.make.com/en/help/webhooks-trigger-module>)
- [Process Mining for Workflow Optimization](<https://en.wikipedia.org/wiki/Process_mining>)
