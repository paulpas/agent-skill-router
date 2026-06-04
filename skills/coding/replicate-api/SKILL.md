---




name: replicate-api
description: Integrates Replicate API (models, predictions, trainings, webhooks) using
  the replicate Python SDK for running and fine-tuning open-source AI models in the
  cloud.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: replicate, replicate api, replicate predictions, replicate training, replicate
    webhook, how do i use replicate, run open source models
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
  related-skills: coding-huggingface-api, coding-openai-api, coding-stabilityai-api




---




# Replicate API Integration

Integrates Replicate API using the `replicate` Python SDK for running and fine-tuning open-source AI models in the cloud. When loaded, this skill makes the model implement Replicate API calls for running predictions (sync and async), training/fine-tuning models, handling webhooks, and managing model deployments.

## When to Use

Use this skill when:

- Running open-source AI models via Replicate (Llama, Mistral, Stable Diffusion, Whisper, etc.)
- Implementing async predictions with polling for long-running model inference
- Fine-tuning / training models on custom datasets through Replicates training API
- Using webhooks for asynchronous notification when predictions complete
- Deploying custom models as Replicate deployments for production use
- Building applications that need access to a wide variety of open-source models without managing GPU infrastructure

---

## When NOT to Use

- For Hugging Face Inference API or Endpoints, use `coding-huggingface-api`
- For Stability AI image generation, use `coding-stabilityai-api`
- For OpenAI GPT models, use `coding-openai-api`

---

## Core Workflow

1. **Initialize the Client** — Set the `REPLICATE_API_TOKEN` environment variable. The `replicate` client reads this automatically. For API token management, create tokens at https://replicate.com/account/api-tokens. **Checkpoint:** Verify by calling `replicate.models.list()` or running a simple prediction.

2. **Run a Sync Prediction** — Use `replicate.run()` for synchronous predictions. Pass the model identifier (e.g., `"meta/meta-llama-3-70b-instruct"`) and `input` dict. The function blocks until the prediction completes and returns the output. **Checkpoint:** Verify the output format matches expectations — different models return different structures (text, image URL, etc.).

3. **Run an Async Prediction with Webhooks** — Use `replicate.predictions.create()` for async predictions. Set a `webhook` URL to receive notifications when the prediction completes, fails, or is canceled. Poll with `prediction.reload()` to check status. **Checkpoint:** Verify `prediction.status` transitions through `"starting"` → `"processing"` → `"succeeded"` (or `"failed"`).

4. **Fine-Tune a Model** — Use `replicate.trainings.create()` with a `model` (base model identifier), `input` (training data config), and `destination` (your model name on Replicate). Training is async — poll status or use webhooks. **Checkpoint:** Verify the trained model appears under your Replicate account and can be run with `replicate.run()`.

5. **Handle Output Types** — Replicate models return various output types: text (string), image (URL string), audio (URL), or JSON. Use `prediction.output` for completed predictions. For image models, `output` is usually a URL string or list of URL strings. **Checkpoint:** Always check if the output is a list or a single value before processing.

---

## Implementation Patterns

### Pattern 1: Sync and Async Predictions

```python
from __future__ import annotations

import time
import replicate

# ❌ BAD — no error handling, no timeout, hardcoded model path
import replicate
output = replicate.run("meta/llama-2-70b-chat:latest", input={"prompt": "Hello"})
print(output)

# ✅ GOOD — error handling, async support, typed output
class ReplicateClient:
    """Client for running Replicate predictions."""

    @staticmethod
    def run_sync(
        model: str,
        input: dict,
        timeout: int = 300,
    ) -> object:
        """Run a synchronous prediction.

        Args:
            model: Model identifier (e.g., 'meta/meta-llama-3-70b-instruct').
            input: Model input parameters.
            timeout: Maximum wait time in seconds.

        Returns:
            Model output (text, URL, or list).

        Raises:
            TimeoutError: If prediction exceeds timeout.
            RuntimeError: If prediction fails.
        """
        prediction = replicate.predictions.create(
            model=model,
            input=input,
        )

        start = time.time()
        while prediction.status not in ("succeeded", "failed", "canceled"):
            if time.time() - start > timeout:
                raise TimeoutError(
                    f"Prediction {prediction.id} timed out after {timeout}s"
                )
            time.sleep(1)
            prediction.reload()

        if prediction.status == "failed":
            error = prediction.error or "Unknown error"
            raise RuntimeError(f"Prediction failed: {error}")

        return prediction.output

    @staticmethod
    def run_async(
        model: str,
        input: dict,
        webhook: str | None = None,
    ) -> replicate.Prediction:
        """Start an async prediction and return immediately.

        Use prediction.reload() and prediction.status to track progress.
        Optionally set a webhook URL for async notification.

        Args:
            model: Model identifier.
            input: Model input parameters.
            webhook: Optional URL to receive webhook events.

        Returns:
            Prediction object with initial status.
        """
        kwargs: dict = {"model": model, "input": input}
        if webhook:
            kwargs["webhook"] = webhook
            kwargs["webhook_events_filter"] = ["completed"]

        return replicate.predictions.create(**kwargs)
```

### Pattern 2: LLM Chat with Streaming

```python
from __future__ import annotations

import replicate


def chat_with_llama(
    prompt: str,
    system_prompt: str = "You are a helpful assistant.",
    model: str = "meta/meta-llama-3-70b-instruct",
) -> str:
    """Chat with Llama 3 via Replicate with streaming.

    Args:
        prompt: User input.
        system_prompt: System-level instruction.
        model: Replicate model identifier.

    Returns:
        Full response text.
    """
    output = replicate.run(
        model,
        input={
            "prompt": prompt,
            "system_prompt": system_prompt,
            "temperature": 0.7,
            "max_tokens": 1024,
        },
    )
    # LLM outputs are typically a list of text strings
    if isinstance(output, list):
        return "".join(str(item) for item in output)
    return str(output)


def stream_chat(
    prompt: str,
    model: str = "meta/meta-llama-3-70b-instruct",
) -> str:
    """Stream a chat response token by token.

    Args:
        prompt: User input.
        model: Replicate model identifier.

    Returns:
        Accumulated response.
    """
    accumulated = ""
    for event in replicate.stream(
        model,
        input={"prompt": prompt, "temperature": 0.7, "max_tokens": 1024},
    ):
        token = str(event)
        print(token, end="", flush=True)
        accumulated += token
    return accumulated
```

### Pattern 3: Fine-Tuning a Model

```python
from __future__ import annotations

import replicate


def fine_tune_model(
    base_model: str,
    training_data: str,
    destination: str,
    **kwargs,
) -> replicate.Training:
    """Fine-tune a model on Replicate.

    Args:
        base_model: Base model to fine-tune from.
        training_data: URL to training data file (JSONL format).
        destination: Your model name (e.g., 'your-username/your-model').

    Returns:
        Training object with status tracking.
    """
    training = replicate.trainings.create(
        model=base_model,
        input={
            "train_data": training_data,
            **kwargs,
        },
        destination=destination,
    )
    return training


# Example: Fine-tune Llama 3
training = fine_tune_model(
    base_model="meta/meta-llama-3-8b-instruct",
    training_data="https://example.com/training-data.jsonl",
    destination="my-org/my-fine-tuned-llama",
    epochs=3,
    learning_rate=0.0001,
)

print(f"Training {training.id}: {training.status}")
```

---

## Constraints

### MUST DO
- Set `REPLICATE_API_TOKEN` environment variable — never hardcode tokens
- Use `replicate.predictions.create()` for async predictions with webhooks
- Use `replicate.run()` for synchronous blocking predictions
- Check `prediction.status` and handle `"failed"` status with error details
- Set reasonable timeouts for sync predictions (default 300s for LLM, longer for training)
- Handle the various output types (string, list of strings, URL) appropriately based on the model

### MUST NOT DO
- Hardcode API tokens in source files
- Poll predictions synchronously without a timeout — implement a timeout guard
- Assume all model outputs have the same type — check the model's documentation on Replicate
- Skip error handling on `prediction.error` when status is `"failed"`
- Use `replicate.run()` without considering the model's required input parameters

---

## Live References

| Resource | URL |
|----------|-----|
| Replicate Python SDK (PyPI) | https://pypi.org/project/replicate/ |
| Replicate API Documentation | https://replicate.com/docs |
| Replicate Python Guide | https://replicate.com/docs/get-started/python |
| Replicate Models Explorer | https://replicate.com/explore |
| Replicate Trainings API | https://replicate.com/docs/guides/fine-tune-a-language-model |
| Replicate Webhooks | https://replicate.com/docs/webhooks |
| Replicate GitHub | https://github.com/replicate/replicate-python |

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `coding-huggingface-api` | Alternative open-source model inference via Hugging Face |
| `coding-openai-api` | Proprietary LLM API for comparison |
| `coding-stabilityai-api` | Stability AI image generation (also available via Replicate) |
