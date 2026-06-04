---
name: google-drive-automation
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent google drive automation with multi-factor skill
  selection, fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: google-drive-automation, google drive automation, how do i google-drive-automation,
    orchestrate google-drive-automation, automate google-drive-automation, agent google-drive-automation
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
# Google Drive Automation

Orchestrates intelligent skill selection and execution for google drive automation workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def manage_drive_file(
    drive_service: googleapiclient.discovery.Resource,
    file_id: str,
    permissions: List[Dict],
    fields: str = "id,name,mimeType,webViewLink"
) -> Dict:
    """Manage Google Drive file metadata and permissions with strict validation.
    
    Implements Law 1 (Early Exit) and Law 2 (Make illegal states unrepresentable)
    by validating Drive API inputs before making network calls.
    """
    # Law 1: Early exit on invalid inputs
    if not file_id or not isinstance(file_id, str):
        raise ValueError("Invalid file_id: must be a non-empty string")
    if not permissions or not isinstance(permissions, list):
        raise ValueError("Permissions must be a non-empty list")
        
    # Law 2: Validate permission structure before API call
    validated_permissions = []
    for perm in permissions:
        if "type" not in perm or "role" not in perm:
            raise ValueError(f"Invalid permission structure: {perm}")
        if perm["type"] not in ("user", "group", "domain", "anyone"):
            raise ValueError(f"Unsupported permission type: {perm['type']}")
        validated_permissions.append(perm)
        
    # Law 3: Atomic Predictability - Fetch current state first
    try:
        file_metadata = drive_service.files().get(
            fileId=file_id, fields=fields
        ).execute()
    except HttpError as e:
        if e.resp.status == 404:
            raise FileNotFoundError(f"Drive file not found: {file_id}") from e
        raise DriveAPIError(f"Failed to fetch file metadata: {e}") from e
        
    # Apply permissions atomically
    results = []
    for perm in validated_permissions:
        try:
            drive_service.permissions().create(
                fileId=file_id,
                body=perm,
                sendNotificationEmails=False
            ).execute()
            results.append({"status": "granted", "permission": perm})
        except HttpError as e:
            results.append({"status": "failed", "permission": perm, "error": str(e)})
            
    return {
        "file_id": file_id,
        "current_metadata": file_metadata,
        "permission_updates": results,
        "timestamp": time.time()
    }
```


### Pattern 2: Execution with Fallback

```python
def execute_drive_operation(
    drive_service: googleapiclient.discovery.Resource,
    operation: Callable,
    fallback_service: googleapiclient.discovery.Resource = None,
    max_retries: int = 3
) -> Dict:
    """Execute Google Drive API operations with rate-limit handling and fallback routing.
    
    Implements Law 4 (Fail Fast, Fail Loud) and handles Drive-specific transient errors.
    """
    last_error = None
    for attempt in range(max_retries):
        try:
            # Execute primary Drive API call
            result = operation(drive_service)
            return {
                "success": True,
                "operation": operation.__name__,
                "result": result,
                "attempts": attempt + 1,
                "service": "primary"
            }
        except HttpError as e:
            last_error = e
            status = e.resp.status
            
            # Law 4: Fail fast on non-recoverable errors
            if status in (400, 403, 404, 410):
                raise DriveOperationError(
                    f"Non-recoverable Drive API error ({status}): {e.reason}"
                ) from e
                
            # Handle rate limits (429) and server errors (5xx)
            if status in (429, 500, 502, 503, 504):
                wait_time = min(2 ** attempt, 30)
                time.sleep(wait_time)
                continue
                
    # All retries exhausted - Apply fallback chain
    if fallback_service:
        try:
            fallback_result = operation(fallback_service)
            return {
                "success": True,
                "operation": operation.__name__,
                "result": fallback_result,
                "attempts": max_retries + 1,
                "service": "fallback"
            }
        except Exception as fb_err:
            raise DriveOperationError(
                f"Primary and fallback Drive services failed. Last error: {last_error}"
            ) from fb_err
            
    raise DriveOperationError(
        f"Drive operation failed after {max_retries} retries with no fallback available."
    )
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
- [Google Drive API v3 Documentation](<https://developers.google.com/drive/api/reference/rest>)
- [Google Drive SDK Python Quickstart](<https://developers.google.com/drive/api/quickstart/python>)
- [Google Drive Sharing and Permissions](<https://developers.google.com/drive/api/guides/manage-shares>)
- [Google Workspace Automation Guide](<https://workspace.google.com/resources/automation/>)
- [Google Apps Script for Drive Automation](<https://developers.google.com/apps-script/guides/sheets>)
