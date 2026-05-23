---
name: huggingface-api
description: Integrates Hugging Face APIs (Inference Client, Inference Endpoints, Transformers Pipeline, Datasets) for serverless and dedicated model inference with Python.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: hugging face, huggingface, transformers, inference api, inference endpoints, pipelines, how do i use hugging face models, hf inference client
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, examples, do-dont]
  related-skills: coding-openai-api, coding-replicate-api, coding-langchain
---

# Hugging Face API Integration

Integrates Hugging Face APIs for model inference using the `huggingface_hub` `InferenceClient`, dedicated Inference Endpoints, `transformers` pipelines, and `datasets` library. When loaded, this skill makes the model implement Hugging Face model inference with proper token management, task routing, batching, and error handling.

## When to Use

Use this skill when:

- Running inference on Hugging Face models via the serverless Inference API
- Deploying and managing dedicated Inference Endpoints for production workloads
- Using `transformers` pipelines for local or batch inference with Hugging Face models
- Loading and processing datasets with the `datasets` library for ML pipelines
- Building text classification, generation, embedding, or image analysis pipelines
- Using custom inference handlers for specialized model deployment
- Integrating Hugging Face models as LLM providers in agentic applications

---

## When NOT to Use

- For OpenAI API calls, use `coding-openai-api`
- For running models on Replicate, use `coding-replicate-api`
- For building fine-tuned models, refer to the `transformers` Trainer documentation

---

## Core Workflow

1. **Choose Inference Mode** — Select between three modes: (a) **Serverless Inference API** — `InferenceClient` with automatic provider routing, best for prototyping; (b) **Dedicated Inference Endpoints** — deployed on managed infrastructure, best for production with guaranteed performance; (c) **Local Transformers Pipeline** — runs models locally on your hardware, best for offline or batch processing. **Checkpoint:** For production, always use dedicated Inference Endpoints — the serverless API has rate limits and no SLA.

2. **Initialize the Client** — For serverless inference, use `InferenceClient(token=...)` or `InferenceClient(api_key=...)` for OpenAI compatibility. The token defaults to the `HF_TOKEN` environment variable. For dedicated endpoints, use `get_inference_endpoint()` to manage the endpoint lifecycle. **Checkpoint:** Verify connectivity by calling `client.get_model_status()` or a simple text classification query.

3. **Route Tasks to the Right Pipeline** — Use the `model` parameter to specify a Hugging Face model ID (e.g., `"meta-llama/Meta-Llama-3-8B-Instruct"`) or a URL to a deployed Inference Endpoint. The client auto-selects the task based on the model. For chat completion, the client appends `/v1/chat/completions` to the URL for OpenAI compatibility. **Checkpoint:** Verify the model supports your task by checking its task tag on the Hub.

4. **Handle Batching and Streaming** — For local pipelines, use `batch_size` for parallel inference on GPUs. For the `InferenceClient`, send requests individually (batching is not supported server-side). For streaming text generation, pass `stream=True` to the chat completion method. **Checkpoint:** For large datasets, use `datasets` IterableDataset with streaming to avoid memory issues.

5. **Manage Inference Endpoints** — Use the `huggingface_hub` API to create, update, pause, resume, and delete endpoints. Set `min_replica`, `max_replica`, and `scale_to_zero_timeout` for autoscaling. Access the endpoint client via `endpoint.client` for inference calls. **Checkpoint:** After creating an endpoint, verify `endpoint.status` is `"running"` before sending requests.

---

## Implementation Patterns

### Pattern 1: Serverless Inference with InferenceClient

```python
from __future__ import annotations

from huggingface_hub import InferenceClient

# ❌ BAD — no error handling, no token management, hardcoded model
import requests
resp = requests.post(
    "https://api-inference.huggingface.co/models/gpt2",
    headers={"Authorization": "Bearer hf_..."},
    json={"inputs": "Hello"},
)
print(resp.json())

# ✅ GOOD — InferenceClient, env-based token, typed error handling
client = InferenceClient()  # reads HF_TOKEN from environment


def classify_text(texts: list[str], model: str | None = None) -> list[dict]:
    """Classify texts using Hugging Face serverless inference.

    Args:
        texts: List of text strings to classify.
        model: Optional model ID. Defaults to a task-appropriate model.

    Returns:
        List of classification results with label and score.

    Raises:
        RuntimeError: On inference failures or authentication errors.
    """
    try:
        kwargs = {}
        if model:
            kwargs["model"] = model
        results = client.text_classification(texts, **kwargs)
        return results
    except Exception as e:
        error_str = str(e)
        if "401" in error_str or "authorization" in error_str.lower():
            raise ValueError("Invalid Hugging Face token. Set HF_TOKEN.") from e
        raise RuntimeError(f"Inference failed: {e}") from e


def chat_completion(
    messages: list[dict[str, str]],
    model: str = "meta-llama/Meta-Llama-3-8B-Instruct",
    max_tokens: int = 512,
) -> str:
    """Chat completion using a Hugging Face model via the InferenceClient.

    Uses the OpenAI-compatible /v1/chat/completions endpoint.

    Args:
        messages: List of {"role": ..., "content": ...} dicts.
        model: Hugging Face model ID or endpoint URL.
        max_tokens: Maximum generation tokens.

    Returns:
        Generated response text.
    """
    response = client.chat.completions.create(
        model=model,
        messages=messages,
        max_tokens=max_tokens,
    )
    return response.choices[0].message.content or ""
```

### Pattern 2: Dedicated Inference Endpoints

```python
from __future__ import annotations

from huggingface_hub import InferenceClient, get_inference_endpoint
from huggingface_hub import create_inference_endpoint, InferenceEndpointStatus


class ManagedEndpoint:
    """Manage and use a dedicated Inference Endpoint."""

    def __init__(self, endpoint_name: str, namespace: str | None = None) -> None:
        self.endpoint_name = endpoint_name
        self.namespace = namespace

    def ensure_running(self) -> InferenceClient:
        """Ensure the endpoint is running and return a client.

        Raises:
            RuntimeError: If the endpoint cannot be started.
        """
        endpoint = get_inference_endpoint(
            self.endpoint_name,
            namespace=self.namespace,
        )
        if endpoint.status != InferenceEndpointStatus.RUNNING:
            endpoint.resume()
            endpoint.wait()  # blocks until running

        return endpoint.client  # returns InferenceClient pointed at this endpoint

    def deploy(
        self,
        model_repo: str,
        instance_type: str = "intel-icl",
        instance_size: str = "x2",
        min_replica: int = 0,
        max_replica: int = 1,
    ) -> InferenceClient:
        """Create and deploy a new Inference Endpoint.

        Args:
            model_repo: Hugging Face model repo ID (e.g., "meta-llama/Meta-Llama-3-8B").
            instance_type: Cloud instance type.
            instance_size: Instance size.
            min_replica: Minimum replicas (0 enables scale-to-zero).
            max_replica: Maximum replicas for autoscaling.

        Returns:
            InferenceClient for the new endpoint.
        """
        endpoint = create_inference_endpoint(
            name=self.endpoint_name,
            repository=model_repo,
            framework="pytorch",
            accelerator="gpu",
            instance_type=instance_type,
            instance_size=instance_size,
            min_replica=min_replica,
            max_replica=max_replica,
            scale_to_zero_timeout=15,  # minutes of inactivity before scale to 0
        )
        endpoint.wait()  # blocks until deployment completes
        return endpoint.client
```

### Pattern 3: Local Transformers Pipeline

```python
from __future__ import annotations

from transformers import pipeline


class LocalPipeline:
    """Run inference locally using Hugging Face transformers pipelines."""

    def __init__(self, task: str, model: str, device: int = -1) -> None:
        """Initialize a local pipeline.

        Args:
            task: Pipeline task (e.g., "text-classification", "text-generation",
                  "feature-extraction", "automatic-speech-recognition").
            model: Hugging Face model ID.
            device: Device ID (-1 for CPU, 0 for first GPU).
        """
        self.pipe = pipeline(task=task, model=model, device=device)

    def predict(self, inputs: str | list[str], **kwargs) -> list[dict]:
        """Run inference on one or more inputs.

        Args:
            inputs: Single string or list of strings.
            **kwargs: Additional pipeline parameters.

        Returns:
            List of prediction results.
        """
        return self.pipe(inputs, **kwargs)

    def predict_batched(
        self, inputs: list[str], batch_size: int = 8, **kwargs
    ) -> list[dict]:
        """Run batched inference for higher throughput on GPU.

        Args:
            inputs: List of input strings.
            batch_size: Number of items per batch.
            **kwargs: Additional pipeline parameters.

        Returns:
            Concatenated list of prediction results.
        """
        results: list[dict] = []
        for i in range(0, len(inputs), batch_size):
            batch = inputs[i : i + batch_size]
            batch_results = self.pipe(batch, batch_size=len(batch), **kwargs)
            results.extend(batch_results)
        return results
```

---

## Constraints

### MUST DO
- Set the `HF_TOKEN` environment variable or pass `token` to `InferenceClient` for authenticated access
- Use dedicated Inference Endpoints for production workloads with guaranteed latency
- Use the OpenAI-compatible `client.chat.completions.create()` for LLM chat completion when the model supports it
- Use `batch_size` parameter for local pipeline inference on GPU for throughput optimization
- Check endpoint status after creation/update — only send requests when `status == "running"`
- Handle 401 errors as authentication failures requiring a valid HF token

### MUST NOT DO
- Hardcode Hugging Face tokens in source files — use `HF_TOKEN` environment variable
- Use the serverless Inference API for production workloads — it has rate limits and no latency guarantees
- Skip checking the endpoint status before making inference calls against dedicated endpoints
- Use `requests.post()` directly to the Inference API — use `InferenceClient` instead

---

## Live References

| Resource | URL |
|----------|-----|
| Hugging Face Hub Python Library | https://pypi.org/project/huggingface-hub/ |
| InferenceClient Reference | https://huggingface.co/docs/huggingface_hub/package_reference/inference_client |
| Inference Endpoints API | https://huggingface.co/docs/huggingface_hub/package_reference/inference_endpoints |
| Transformers Pipeline Tutorial | https://huggingface.co/docs/transformers/main/pipeline_tutorial |
| Datasets Library | https://huggingface.co/docs/datasets/main/use_with_pytorch |
| Inference Toolkit (custom handlers) | https://huggingface.co/docs/inference-endpoints/en/engines/toolkit |
| Hugging Face Inference Endpoints Docs | https://huggingface.co/docs/inference-endpoints/en/faq |

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `coding-openai-api` | OpenAI API for alternative inference provider |
| `coding-replicate-api` | Replicate for cloud-hosted open-source model inference |
| `coding-langchain` | Cross-provider orchestration including Hugging Face integrations |
