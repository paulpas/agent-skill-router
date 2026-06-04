---
name: sendgrid-automation
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent sendgrid automation with multi-factor skill selection,
  fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: sendgrid-automation, sendgrid automation, how do i sendgrid-automation,
    orchestrate sendgrid-automation, automate sendgrid-automation, agent sendgrid-automation
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
  version: 1.0.0
------
# Sendgrid Automation

Orchestrates intelligent skill selection and execution for sendgrid automation workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

## TL;DR Checklist

- [ ] Parse all inputs at boundary before processing (Law 2)
- [ ] Handle edge cases with early returns at function top (Law 1)
- [ ] Fail immediately with descriptive errors on invalid states (Law 4)
- [ ] Return new data structures, never mutate inputs (Law 3)
- [ ] Implement minimum 2-level fallback chain for all skill executions
- [ ] Log all skill selections with context for full audit trail
- [ ] Validate skill metadata and dependencies before selection
- [ ] Update confidence scores after each execution for learning


┌───────────────────────────────────────────────────────────────────────────────┐
│                              Orchestration Flow                                               │
└───────────────────────────────────────────────────────────────────────────────┘

  User Request
      ↓
┌─────────────────┐
│  Parse Request  │
│  & Extract      │
│  Features       │
└────────┬────────┘
         ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    Evaluate Available Skills                                │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │ Skill A      │  │ Skill B      │  │ Skill C      │              │
│  │ - Match Score│  │ - Match Score│  │ - Match Score│              │
│  │ - Confidence │  │ - Confidence │  │ - Confidence │              │
│  │ - History    │  │ - History    │  │ - History    │              │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘              │
│         │                 │                 │                       │
│         └─────────────────┴─────────────────┘                       │
│                          ↓                                          │
│                   Select Best Skill                               │
└─────────────────────────────────────────────────────────────────────┘
         ↓
┌─────────────────┐
│  Execute Skill  │
└────────┬────────┘
         ↓
┌─────────────────┐
│  Handle Result  │
└────────┬────────┘
         ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    Error Handling & Fallback                                  │
│                                                                     │
│  Success? ────────► Return Result                                  │
│                                                                     │
│  Fail? ────────┐                                                    │
│                ↓                                                    │
│  ┌──────────────────────────────────────────────────────────┐      │
│  │               Fallback Chain                                    │      │
│  │                                                             │      │
│  │  1. Retry with adjusted parameters                          │      │
│  │  2. Try Alternative Skill (if available)                    │      │
│  │  3. Defer to Human Operator (if critical)                   │      │
│  │  4. Log & Return Error                                      │      │
│  └──────────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────────┘

## When to Use

Use this skill when:

- Orchestrating multi-step workflows that require skill delegation
- Implementing adaptive skill routing based on confidence scores
- Building fallback mechanisms for failed skill executions
- Creating intelligent task decomposition and parallel execution
- Designing skill dependency graphs with automatic resolution
- Implementing skill selection with historical performance weighting
- Building agent systems that need to self-organize around tasks

## When NOT to Use

Avoid this skill for:

- Direct task execution without orchestration needs - use individual skills instead
- High-frequency trading scenarios where latency must be minimized - the selection overhead may be prohibitive
- Simple linear workflows without branching or fallback requirements
- Cases where skill metadata is unavailable or unreliable


## Core Workflow

1. **Parse and Analyze Request** - Extract intent, entities, and constraints from user input.
   **Checkpoint:** All required parameters must be present and in valid format before proceeding.

2. **Score Available Skills** - Calculate match scores using multi-factor algorithm:
   - Text similarity between request and skill triggers
   - Historical success rate for similar tasks
   - Skill availability and health status
   - Required dependencies and their availability
   
   **Checkpoint:** Skip to fallback if no skill scores above threshold.

3. **Select Optimal Skill** - Choose skill with highest score that meets minimum confidence.
   **Checkpoint:** Verify skill has not been disabled or deprecated.

4. **Execute with Fallback** - Run skill execution wrapped in retry and fallback logic.
   **Checkpoint:** Log all execution attempts for audit trail.

5. **Return or Fallback** - Either return successful result or apply fallback chain:
   - Retry with adjusted parameters
   - Try alternative skill from `related-skills`
   - Defer to human operator for critical tasks
   
   **Checkpoint:** Record outcome with timing and confidence metadata.

## Implementation Patterns

### Pattern 1: Skill Selection Logic

```python
def prepare_sendgrid_campaign(
    template_id: str,
    recipients: List[Dict[str, str]],
    personalization_data: Dict[str, Any],
    tracking_enabled: bool = True
) -> Dict[str, Any]:
    """Prepare a SendGrid v3 mail payload with template substitution and validation.
    
    Implements Law 2 (Make Illegal States Unrepresentable) by validating
    template existence and recipient format before API submission.
    """
    sg = SendGridAPIClient(os.environ.get("SENDGRID_API_KEY"))
    
    # Validate template exists and is active
    template_response = sg.client.templates(template_id).get()
    if template_response.status_code != 200:
        raise ValueError(f"Invalid template ID: {template_id}")
        
    mail = Mail()
    mail.from_email = os.environ.get("SENDGRID_FROM_EMAIL")
    mail.template_id = template_id
    
    if tracking_enabled:
        mail.tracking_settings = TrackingSettings()
        mail.tracking_settings.click_tracking = ClickTracking(enable=True, enable_text=True)
        
    # Parse and validate recipients (Law 2)
    validated_recipients = []
    for r in recipients:
        if not re.match(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$", r.get("email", "")):
            continue
        validated_recipients.append(r)
            
    if not validated_recipients:
        raise ValueError("No valid recipients provided")
        
    # Build personalization blocks
    for recipient in validated_recipients:
        personalization = Personalization()
        personalization.add_to(Email(recipient["email"]))
        personalization.dynamic_template_data = {
            **personalization_data,
            "unsubscribe_url": os.environ.get("SENDGRID_UNSUB_URL", "")
        }
        mail.add_personalization(personalization)
        
    return mail.get()
```


### Pattern 2: Execution with Fallback

```python
def execute_sendgrid_delivery(
    mail_payload: Dict[str, Any],
    max_retries: int = 3,
    fallback_template_id: Optional[str] = None
) -> Dict[str, Any]:
    """Execute SendGrid API call with rate-limit aware retry and fallback logic.
    
    Implements Law 4 (Fail Fast, Fail Loud) for API errors and transient failures.
    Handles 429 Too Many Requests and 5xx server errors gracefully.
    """
    sg = SendGridAPIClient(os.environ.get("SENDGRID_API_KEY"))
    response = None
    
    for attempt in range(max_retries):
        try:
            response = sg.client.mail.send.post(request_body=mail_payload)
            
            if response.status_code in (200, 202):
                return {
                    "success": True,
                    "message_id": response.headers.get("X-Message-Id", "unknown"),
                    "status_code": response.status_code,
                    "attempts": attempt + 1
                }
            elif response.status_code == 429:
                retry_after = int(response.headers.get("Retry-After", 2 ** attempt))
                time.sleep(retry_after)
                continue
            elif response.status_code >= 500:
                time.sleep(2 ** attempt)
                continue
            else:
                raise SendGridException(f"API Error {response.status_code}: {response.body}")
                
        except SendGridException as e:
            if attempt == max_retries - 1:
                # Fallback to alternative template if primary fails
                if fallback_template_id:
                    mail_payload["template_id"] = fallback_template_id
                    continue
                raise e
                
    return {
        "success": False,
        "error": "Max retries exceeded for SendGrid delivery",
        "last_status": response.status_code if response else None
    }
```

### MUST DO
- Always validate skill metadata before selection (Early Exit)
- Implement fallback chain with at least 2 levels (Fallback Skill + Human)
- Log all skill selections with full context for auditability
- Return new data structures instead of mutating inputs (Atomic Predictability)
- Fail immediately with descriptive errors on invalid states
- Update confidence scores after each execution for adaptive routing
- Reference `code-philosophy` (5 Laws of Elegant Defense) in all logic


### MUST NOT DO
- Select skills based on a single factor (e.g., only confidence score)
- Disable fallback mechanisms "temporarily" - this creates fragile systems
- Skip validation of skill dependencies before execution
- Return partial results - either complete success or clear failure
- Use magic numbers for confidence thresholds - make them configurable
- Cache skill selections without considering context changes


## TL;DR Checklist

- [ ] Parse all inputs at boundary before processing (Law 2)
- [ ] Handle edge cases with early returns at function top (Law 1)
- [ ] Fail immediately with descriptive errors on invalid states (Law 4)
- [ ] Return new data structures, never mutate inputs (Law 3)
- [ ] Implement minimum 2-level fallback chain for all skill executions
- [ ] Log all skill selections with context for full audit trail
- [ ] Validate skill metadata and dependencies before selection
- [ ] Update confidence scores after each execution for learning


## TL;DR for Code Generation

- Use guard clauses - return early on invalid input before doing work
- Return simple types (dict, str, int, bool, list) - avoid complex nested objects
- Cyclomatic complexity < 10 per function - split anything larger
- Handle null/empty cases explicitly at function top (Early Exit)
- Never mutate input parameters - return new dicts/objects
- Fail fast with descriptive errors - don't try to "patch" bad data
- Reference code-philosophy laws in comments for complex logic
- Include timing and confidence metadata in all return values


## Output Template

When applying this skill, produce:

1. **Selected Skills** - List of skill names with confidence scores
2. **Selection Rationale** - Why each skill was chosen (match score, history, availability)
3. **Execution Plan** - Order of execution with dependencies
4. **Fallback Strategy** - Which fallback skills will be tried and in what order
5. **Risk Assessment** - Any potential failure points and their impact
6. **Timing Estimates** - Expected latency including fallback scenarios


## Related Skills

| Skill | Purpose |
|---|---|
| `sendgrid-mail-management` | Provides the email management operations that sendgrid automation workflows build upon |
| `workflow-patterns` | Offers general automation patterns that complement SendGrid-specific email workflows |

---

## Constraints

### MUST DO
- Implement idempotent automation triggers: running the same automation twice should not create duplicate resources or actions
- Validate all trigger conditions with explicit allowlists before executing automated actions
- Include rollback procedures in every automation workflow — every CREATE should have a corresponding DELETE capability
- Log all automation executions with input state, output state, duration, and any errors for monitoring and debugging

### MUST NOT DO
- Do not create circular automation loops where trigger A causes action B which triggers A again
- Avoid using automations that modify production data without explicit human approval gates
- Never embed API keys or credentials directly in automation workflows — use vaulted secrets with rotation
- Do not assume external service availability; implement retry logic with exponential backoff and dead-letter queues


## Live References

> Authoritative documentation links for this domain. The model follows markdown links at load time to resolve external references and inline content.

- [SendGrid API Documentation](https://docs.sendgrid.com/api-reference/) — Official SendGrid API reference covering mail send, templates, marketing campaigns, and webhooks
- [SendGrid Python SDK Documentation](https://docs.sendgrid.com/ui/sending-email/how-to-send-an-email-with-the-python-sdk) — Step-by-step guide for sending emails using the official SendGrid Python library
- [SendGrid Webhook Event Notifications](https://docs.sendgrid.com/ui/api/trackers/event-webhooks) — Official documentation on setting up and processing email delivery event webhooks
- [Transactional Email Best Practices (AWS SES Comparison)](https://aws.amazon.com/ses/sendgrid-alternative/) — Comparative analysis of transactional email platforms including SendGrid's positioning
- [Email Deliverability Guide (SendGrid Blog)](https://sendgrid.com/en-us/resource-hub/deliverability/) — SendGrid's official best practices for maintaining high email deliverability rates