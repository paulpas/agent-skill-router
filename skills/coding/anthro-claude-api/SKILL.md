---




name: anthro-claude-api
description: Implements Anthropic Claude API integrations with secure credentials, message handling, batching, tool orchestration, response validation, and tests.
license: MIT
compatibility: opencode
metadata:
  archetypes: [coding, AI, claude]
  anti_triggers: [generic routing]
  response_profile: {verbosity: low, directive_strength: medium, abstraction_level: tactical}

  version: "1.0.0"
  triggers: anthropic claude api, claude messages, claude tools, claude batching, anthropic sdk, secure claude integration, how do i call claude
  domain: coding
  role: implementation
  scope: implementation
  output-format: code



---





metadata:
  archetypes: [coding, AI, claude]
  anti_triggers: [generic routing]
  response_profile: {verbosity: low, directive_strength: medium, abstraction_level: tactical}

## AI-Assisted Engineering with Anthropic Claude API

This skill guides the integration and usage of the Anthropic Claude API within software development pipelines. It covers messaging, tool usage, multi-computer interactions, batching requests, as well as configurations and security considerations.

## TL;DR Checklist
- [ ] Set up API keys and basic configurations for Claude.
- [ ] Utilize messaging patterns for synchronous and asynchronous communication.
- [ ] Optimize tool usage across various environments, including local and cloud computing.
- [ ] Batch requests effectively to improve throughput and reduce latency. 
- [ ] Ensure compliance with security guidelines for API integrations.

---

metadata:
  archetypes: [coding, AI, claude]
  anti_triggers: [generic routing]
  response_profile: {verbosity: low, directive_strength: medium, abstraction_level: tactical}
## Core Workflow

### 1. Initialization and Setup
Start by setting up the Anthropic Claude API. This typically includes:
- Acquiring an API key from the Anthropic dashboard.
- Setting environment variables to securely store your API key.

Example
```bash
export ANTHRO_API_KEY="your_api_key_here"
```

### 2. Messaging Patterns
Leverage Claude's messaging capabilities to send and receive messages efficiently.

Example Code: Sending a message to Claude
```python
import requests
import os

API_URL = "https://api.anthropic.com/v1/claude"

def send_message(message: str):
    headers = {'Authorization': f'Bearer {os.environ["ANTHRO_API_KEY"]}', 'Content-Type': 'application/json'}
    json_data = {'prompt': message, 'max_tokens': 200}
    response = requests.post(API_URL, headers=headers, json=json_data)
    return response.json()
```

### 3. Tool Usage
Learn how to effectively use Claude tools in multi-computer setups. When deploying Claude on multiple systems, consider the following:
- Load balancing interactions between computers.
- Managing session states for ongoing tasks.

Example Setup: 
```python
from multiprocessing import Pool

messages = ["Hello Claude!", "What's the weather today?"]

with Pool(processes=2) as pool:
    results = pool.map(send_message, messages)

print(results)
```

### 4. Batching Requests
For improved performance, batch multiple requests into a single API call.

Example of a Batched Request:
```python
import json

batch_messages = ["What is AI?", "Explain LLMs."]

def batch_send(messages):
    headers = {'Authorization': f'Bearer {os.environ["ANTHRO_API_KEY"]}', 'Content-Type': 'application/json'}
    json_data = {'prompts': messages}
    response = requests.post(API_URL, headers=headers, json=json_data)
    return response.json()

responses = batch_send(batch_messages)
print(json.dumps(responses, indent=2))
```

### 5. Best Practices and Considerations
- **Security:** Never hardcode your API keys. Always use environment variables and secure vaults where possible.
- **Error Handling:** Implement error handling strategies to manage failed API requests gracefully.
- **Testing:** Always validate responses for expected outputs, especially for critical functions involving data-sensitive tasks.

```python
try:
    response = send_message("What is the capital of France?")
    print(response["text"])
except Exception as e:
    print(f"An error occurred: {e}")
```

## Constraints
### MUST DO
- Use environment variables for sensitive data like API keys.
- Validate every response from the API to ensure correctness.
- Implement logging for both successes and failures to troubleshoot issues efficiently.

### MUST NOT DO
- Hardcode sensitive information like API keys in the code.
- Ignore error responses from the API when processing data.
- Skip testing the integration before deploying it to production.

## Testing the Integration
Once implemented, ensure that the setup works correctly by running script tests that invoke the messaging functions and validate responses. 

Example Test Case:
```python
def test_claude_integration():
    response = send_message("What is AI?")
    assert "Artificial Intelligence" in response["text"], "Expected response not found"
```

## Related Skills
- `coding-api-integration` - General practices for integrating various APIs in development.
- `coding-security-best-practices` - Guidelines on implementing security measures in code.
- `coding-testing-strategies` - Effective test case writing for different scenarios.

---
