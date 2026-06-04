---
name: aws-bedrock
description: Integrates AWS Bedrock (Claude, Llama, Titan, Nova, Converse API, Knowledge
  Bases, Agents) using Boto3 with cross-model patterns and IAM auth.
license: MIT
compatibility: opencode
metadata:
version: "1.0.0"
  domain: coding
  triggers: aws bedrock, boto3 bedrock, amazon nova, converse api, bedrock knowledge
    base, bedrock agent, how do i use bedrock, invoke model bedrock
  archetypes:
  - tactical
  - generation
  anti_triggers:
  - brainstorming
  - vague ideation
  - code golf
  - over-engineering
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  role: implementation
  scope: implementation
  output-format: code
  content-types:
  - code
  - guidance
  - examples
  - do-dont
  related-skills: coding-anthropic-api, coding-openai-api, coding-langchain
---
# AWS Bedrock API Integration

Integrates Amazon Bedrock using the AWS SDK for Python (Boto3). When loaded, this skill makes the model implement Bedrock API calls using the Converse API (recommended cross-model interface), InvokeModel (native payloads), Knowledge Bases, Agents, and Guardrails with proper IAM authentication and error handling.

## When to Use

Use this skill when:

- Building applications that call foundation models through Amazon Bedrock
- Using the Converse API for a unified interface across Claude, Llama, Titan, Nova, Mistral, Cohere, and DeepSeek
- Integrating Bedrock Knowledge Bases for RAG with fully managed data ingestion
- Building Bedrock Agents with multi-step orchestration
- Implementing Guardrails for content filtering and responsible AI
- Working with Amazon Nova models (Micro, Lite, Pro) for cost-effective inference

---

## When NOT to Use

- For calling Anthropic Claude directly (not via Bedrock), use `coding-anthropic-api`
- For OpenAI API calls, use `coding-openai-api`
- For general Boto3 patterns unrelated to Bedrock, refer to AWS SDK documentation

---

## Core Workflow

1. **Configure AWS Credentials** — Set up AWS credentials via environment variables (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_DEFAULT_REGION`), AWS CLI config, or IAM roles. Ensure the IAM user/role has `bedrock:InvokeModel` and `bedrock:ListFoundationModels` permissions. **Checkpoint:** Verify access by listing models with `boto3.client("bedrock").list_foundation_models()`.

2. **Select the API — Converse vs. InvokeModel** — The **Converse API** (`client.converse()`) is the recommended unified interface. It normalizes requests and responses across all supported models. Use **InvokeModel** (`client.invoke_model()`) only when you need model-specific features not exposed by Converse. **Checkpoint:** Check if your model supports Converse by looking for `"responseStreamingSupported"` in the model summary.

3. **Send a Message with Converse API** — Create a `bedrock-runtime` client and call `converse()` with `modelId`, `messages`, and `inferenceConfig`. The response format is uniform across all models: extract text from `response["output"]["message"]["content"][0]["text"]`. **Checkpoint:** Test with Amazon Nova Micro (fastest, cheapest) to validate the pipeline before using more expensive models.

4. **Implement Tool Use (Function Calling)** — Define tools as a list of `{"toolSpec": {"name": ..., "description": ..., "inputSchema": ...}}` dicts and pass them to `converse()`. Handle `toolUse` blocks in the response, execute tools, and return results. **Checkpoint:** Verify `stopReason` is `"tool_use"` when the model requests tools.

5. **Integrate Knowledge Bases** — Use `bedrock-agent-runtime` client with `retrieve()` or `retrieve_and_generate()` to query knowledge bases. Configure the KB ID, query text, and number of results. **Checkpoint:** Verify that `retrieve()` returns `retrievalResults` with `content` and `location` fields.

---

## Implementation Patterns

### Pattern 1: Converse API (Recommended Cross-Model Interface)

```python
from __future__ import annotations

import boto3
from botocore.exceptions import ClientError

# ❌ BAD — model-specific payload, no error handling, InvokeModel (non-portable)
client = boto3.client("bedrock-runtime")
body = json.dumps({
    "anthropic_version": "bedrock-2023-05-31",
    "max_tokens": 1024,
    "messages": [{"role": "user", "content": [{"type": "text", "text": "Hello"}]}],
})
response = client.invoke_model(modelId="anthropic.claude-3-sonnet-20240229-v1:0", body=body)
print(json.loads(response["body"].read())["content"][0]["text"])

# ✅ GOOD — Converse API, typed, cross-model, proper error handling
class BedrockClient:
    """AWS Bedrock client using the unified Converse API."""

    def __init__(self, region: str = "us-east-1") -> None:
        self.runtime = boto3.client("bedrock-runtime", region_name=region)
        self.control = boto3.client("bedrock", region_name=region)

    def list_available_models(self) -> list[dict]:
        """List foundation models accessible in this account/region."""
        response = self.control.list_foundation_models()
        return response.get("modelSummaries", [])

    def converse(
        self,
        prompt: str,
        model_id: str = "amazon.nova-micro-v1:0",
        max_tokens: int = 512,
        temperature: float = 0.5,
    ) -> str:
        """Send a prompt via the Converse API.

        Args:
            prompt: The user input text.
            model_id: Bedrock model ID (e.g., amazon.nova-micro-v1:0,
                     anthropic.claude-3-sonnet-20240229-v1:0,
                     meta.llama3-70b-instruct-v1:0).
            max_tokens: Maximum output tokens.
            temperature: Sampling temperature.

        Returns:
            The model's response text.

        Raises:
            RuntimeError: On API access or permission errors.
        """
        conversation = [{"role": "user", "content": [{"text": prompt}]}]

        try:
            response = self.runtime.converse(
                modelId=model_id,
                messages=conversation,
                inferenceConfig={
                    "maxTokens": max_tokens,
                    "temperature": temperature,
                },
            )
            output = response["output"]["message"]["content"]
            return "".join(block["text"] for block in output if "text" in block)
        except ClientError as e:
            error_code = e.response["Error"]["Code"]
            if error_code == "AccessDeniedException":
                raise PermissionError(
                    "Bedrock access denied. Check IAM permissions and model access."
                ) from e
            if error_code == "ThrottlingException":
                raise RuntimeError("Bedrock rate limit exceeded. Implement retry.") from e
            raise RuntimeError(f"Bedrock API error: {error_code}: {e}") from e
```

### Pattern 2: Knowledge Base Retrieval (RAG)

```python
from __future__ import annotations

import boto3
from botocore.exceptions import ClientError


class BedrockKnowledgeBase:
    """Query Bedrock Knowledge Bases for RAG."""

    def __init__(self, region: str = "us-east-1") -> None:
        self.agent_runtime = boto3.client("bedrock-agent-runtime", region_name=region)

    def retrieve(
        self,
        knowledge_base_id: str,
        query: str,
        top_k: int = 5,
    ) -> list[dict]:
        """Retrieve relevant documents from a Bedrock Knowledge Base.

        Args:
            knowledge_base_id: The KB UUID.
            query: Natural language query.
            top_k: Number of results to return.

        Returns:
            List of retrieval results with content and metadata.

        Raises:
            ValueError: If the KB ID is invalid or query fails.
        """
        try:
            response = self.agent_runtime.retrieve(
                knowledgeBaseId=knowledge_base_id,
                retrievalQuery={"text": query},
                retrievalConfiguration={
                    "vectorSearchConfiguration": {
                        "numberOfResults": top_k,
                    }
                },
            )
            return response.get("retrievalResults", [])
        except ClientError as e:
            raise ValueError(f"Knowledge base retrieval failed: {e}") from e

    def retrieve_and_generate(
        self,
        knowledge_base_id: str,
        query: str,
        model_id: str = "amazon.nova-micro-v1:0",
    ) -> str:
        """Retrieve context from KB and generate a response.

        Args:
            knowledge_base_id: The KB UUID.
            query: Natural language query.
            model_id: The Bedrock model to use for generation.

        Returns:
            Generated response grounded in KB context.
        """
        try:
            response = self.agent_runtime.retrieve_and_generate(
                knowledgeBaseId=knowledge_base_id,
                input={"text": query},
                generationConfiguration={
                    "generationModel": {"modelId": model_id},
                },
            )
            return response["output"]["text"]
        except ClientError as e:
            raise RuntimeError(f"Retrieve and generate failed: {e}") from e
```

### Pattern 3: Tool Use with Converse API

```python
from __future__ import annotations

import json
from typing import Any

import boto3


def converse_with_tools(
    prompt: str,
    model_id: str = "anthropic.claude-3-sonnet-20240229-v1:0",
) -> str:
    """Use the Converse API with tool/function calling.

    Args:
        prompt: User input.
        model_id: Bedrock model ID that supports tool use.

    Returns:
        Final response after tool execution.
    """
    client = boto3.client("bedrock-runtime")

    tools: list[dict[str, Any]] = [
        {
            "toolSpec": {
                "name": "get_weather",
                "description": "Get current weather for a location",
                "inputSchema": {
                    "json": {
                        "type": "object",
                        "properties": {
                            "location": {
                                "type": "string",
                                "description": "City and state",
                            }
                        },
                        "required": ["location"],
                    }
                },
            }
        }
    ]

    messages: list[dict[str, Any]] = [
        {"role": "user", "content": [{"text": prompt}]}
    ]

    response = client.converse(
        modelId=model_id,
        messages=messages,
        toolConfig={"tools": tools},
    )

    stop_reason = response.get("stopReason")

    if stop_reason == "tool_use":
        # Extract tool calls
        content = response["output"]["message"]["content"]
        for block in content:
            if "toolUse" in block:
                tool = block["toolUse"]
                if tool["name"] == "get_weather":
                    args = tool["input"]
                    weather = {"temperature": 72, "condition": "sunny"}
                    messages.append({
                        "role": "user",
                        "content": [{
                            "toolResult": {
                                "toolUseId": tool["toolUseId"],
                                "content": [{"json": weather}],
                            }
                        }],
                    })

        # Get final response
        final = client.converse(
            modelId=model_id,
            messages=messages,
            toolConfig={"tools": tools},
        )
        text_blocks = final["output"]["message"]["content"]
        return "".join(b["text"] for b in text_blocks if "text" in b)

    text_blocks = response["output"]["message"]["content"]
    return "".join(b["text"] for b in text_blocks if "text" in b)
```

---

## Constraints

### MUST DO
- Use the **Converse API** (`client.converse()`) over `invoke_model()` for cross-model portability
- Use `region_name` parameter when creating Bedrock clients (default may not have Bedrock enabled)
- Check `stopReason` in Converse responses to determine if the model requested tool use
- Handle `ClientError` with specific error code checks (`AccessDeniedException`, `ThrottlingException`, `ValidationException`)
- Verify model access in the AWS Console before coding — models must be explicitly enabled per region

### MUST NOT DO
- Hardcode AWS credentials in source files — use environment variables, AWS CLI config, or IAM roles
- Assume all models support the Converse API — check `responseStreamingSupported` in model summary
- Use InvokeModel with model-specific payloads when Converse is available
- Skip pagination when listing knowledge bases or models — use Boto3 paginators

---

## Live References

| Resource | URL |
|----------|-----|
| Boto3 Bedrock Runtime Docs | https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/bedrock-runtime.html |
| Bedrock Converse API Guide | https://docs.aws.amazon.com/bedrock/latest/userguide/converse-api.html |
| Bedrock Knowledge Bases | https://docs.aws.amazon.com/bedrock/latest/userguide/knowledge-base.html |
| Bedrock Agents | https://docs.aws.amazon.com/bedrock/latest/userguide/agents.html |
| Bedrock Python Examples | https://docs.aws.amazon.com/code-library/latest/ug/python_3_bedrock_code_examples.html |
| AWS SDK Code Examples (Bedrock Runtime) | https://docs.aws.amazon.com/code-library/latest/ug/python_3_bedrock-runtime_code_examples.html |

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `coding-anthropic-api` | Direct Anthropic Claude API (non-Bedrock) |
| `coding-openai-api` | OpenAI API for multi-provider coverage |
| `coding-langchain` | Cross-model orchestration with LangChain Bedrock integration |
