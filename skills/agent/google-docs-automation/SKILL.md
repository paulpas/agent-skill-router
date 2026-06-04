---
name: google-docs-automation
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent google docs automation with multi-factor skill
  selection, fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: google-docs-automation, google docs automation, how do i google-docs-automation,
    orchestrate google-docs-automation, automate google-docs-automation, agent google-docs-automation
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
# Google Docs Automation

Orchestrates intelligent skill selection and execution for google docs automation workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def parse_google_docs_request(
    user_input: str,
    existing_docs: List[Dict],
    auth_credentials: Dict
) -> Dict:
    """Parse natural language request into Google Docs API operations.
    
    Extracts intent (create, update, extract, format), identifies target document,
    and maps user instructions to specific Docs API methods (batchUpdate, create, get).
    
    Args:
        user_input: Natural language instruction (e.g., "Add a table to Q3 report")
        existing_docs: List of available document metadata with IDs and permissions
        auth_credentials: OAuth2 service account or user credentials
        
    Returns:
        Structured operation payload ready for API execution
    """
    # Guard clause - validate input and auth (Law 1)
    if not user_input or not auth_credentials.get("access_token"):
        raise ValueError("Missing user input or authentication credentials")
        
    # Parse intent and target document (Law 2)
    intent = _classify_intent(user_input)  # create, update, extract, format
    target_doc = _resolve_document_id(user_input, existing_docs)
    
    if not target_doc:
        if intent == "update":
            raise ValueError("Target document not found for update operation")
        target_doc = {"id": None, "title": _extract_title(user_input)}
        
    # Map to Google Docs API operations (Law 3)
    operations = []
    if intent == "create":
        operations.append({
            "createDocument": {"title": target_doc["title"]}
        })
    elif intent == "update":
        operations.extend(_build_batch_update_ops(user_input, target_doc["id"]))
    elif intent == "extract":
        operations.append({
            "get": {"documentId": target_doc["id"], "fields": "body.content"}
        })
        
    return {
        "intent": intent,
        "target_doc_id": target_doc["id"],
        "operations": operations,
        "credentials": auth_credentials,
        "timestamp": time.time()
    }
```


### Pattern 2: Execution with Fallback

```python
def execute_docs_operation(
    operation_payload: Dict,
    max_retries: int = 3,
    fallback_strategy: str = "retry_then_create"
) -> Dict:
    """Execute Google Docs API operations with domain-specific resilience.
    
    Handles Docs API rate limits, permission errors, and batch update failures.
    Implements exponential backoff for quota limits and falls back to 
    alternative document operations when primary action fails.
    
    Args:
        operation_payload: Parsed request containing operations and credentials
        max_retries: Maximum retry attempts for transient API errors
        fallback_strategy: Fallback behavior when primary operation fails
        
    Returns:
        API response with document ID, operation status, and metadata
    """
    from googleapiclient.discovery import build
    from googleapiclient.errors import HttpError
    
    docs_service = build("docs", "v1", credentials=operation_payload["credentials"])
    operations = operation_payload["operations"]
    
    for attempt in range(max_retries):
        try:
            # Execute batch update or create operation
            if operation_payload["intent"] == "create":
                response = docs_service.documents().create(
                    body={"title": operation_payload["target_doc_id"]}
                ).execute()
            else:
                response = docs_service.documents().batchUpdate(
                    documentId=operation_payload["target_doc_id"],
                    body={"requests": operations}
                ).execute()
                
            return {
                "success": True,
                "document_id": response.get("documentId", operation_payload["target_doc_id"]),
                "operations_executed": len(operations),
                "latency_ms": time.time() * 1000,
                "attempt": attempt + 1
            }
            
        except HttpError as e:
            status_code = e.resp.status
            if status_code == 429:  # Quota exceeded
                wait_time = (2 ** attempt) + random.uniform(0, 1)
                time.sleep(wait_time)
                continue
            elif status_code == 403:
                raise PermissionError(f"Access denied to document: {e.reason}")
            elif status_code == 404 and fallback_strategy == "retry_then_create":
                # Fallback: Create new doc if update fails due to missing resource
                if attempt == max_retries - 1:
                    return _create_fallback_document(operation_payload)
            time.sleep(0.5)
            
    raise RuntimeError(f"Docs operation failed after {max_retries} attempts")
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
|

---

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

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.
- [Google Docs API v1 Documentation](<https://developers.google.com/docs/api/reference/rest>)
- [Google Workspace Add-ons](<https://developers.google.com/workspace/add-ons>)
- [Google Apps Script Documentation](<https://developers.google.com/apps-script>)
- [Google Documents Processing (Python)](<https://python-docx.readthedocs.io/>)
- [Google Drive API Integration](<https://developers.google.com/drive/api/guides/about-sdk>)
