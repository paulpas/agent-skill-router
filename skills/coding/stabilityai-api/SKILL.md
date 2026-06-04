---




name: stabilityai-api
description: Integrates Stability AI API (image generation, video generation, upscaling,
  inpainting, 3D) using the stability-sdk Python client for generative media applications.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: stability ai, stabilityai, stable diffusion, sd3, stable image, core, stability api, how do i generate images stability api
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
  related-skills: coding-replicate-api, coding-openai-api, coding-elevenlabs-api




---




# Stability AI API Integration

Integrates Stability AI API using the `stability-sdk` Python client for image generation (Stable Image Core/Ultra, SD3), video generation (Stable Video), upscaling, inpainting, outpainting, and 3D model generation. When loaded, this skill makes the model implement Stability AI API calls with proper authentication, payload construction, and image handling.

## When to Use

Use this skill when:

- Generating high-quality images from text prompts using Stable Image Core, Ultra, or SD3
- Upscaling images with Stability AI's creative or fast upscalers
- Inpainting/outpainting images to edit or expand existing content
- Generating videos from images or text prompts
- Generating 3D models (text-to-3D, image-to-3D)
- Building generative media pipelines that require fine-grained control over image parameters (aspect ratio, style, seed)
- Using ControlNet-style conditioning with Stability AI models

---

## When NOT to Use

- For Replicate-hosted Stable Diffusion, use `coding-replicate-api`
- For OpenAI DALL-E image generation, use `coding-openai-api`
- For audio/sound generation, use `coding-elevenlabs-api`
- For simple image manipulation (resize, crop, format conversion), use PIL/Pillow directly

---

## Core Workflow

1. **Initialize the Client** — Set the `STABILITY_API_KEY` environment variable. The Stability AI API uses HTTP headers for authentication. Use `stability_sdk.client` or raw `httpx`/`requests` to call the REST API at `https://api.stability.ai/v2beta`. **Checkpoint:** Verify by calling `GET https://api.stability.ai/v2beta/user/account` with your API key header.

2. **Generate an Image (Text-to-Image)** — Use `POST https://api.stability.ai/v2beta/stable-image/generate/core` with `prompt`, `output_format` (e.g., `"png"`), and optional `aspect_ratio` and `seed`. The response is binary image data with `finish_reason` in headers. **Checkpoint:** Verify `finish_reason` header is `"SUCCESS"` and the response body starts with a valid PNG/JPG signature.

3. **Upscale an Image** — Use `POST https://api.stability.ai/v2beta/stable-image/upscale/creative` with `image`, `prompt`, and `output_format`. The creative upscaler enhances detail and can increase resolution significantly. For simple 2x upscaling, use the fast upscaler. **Checkpoint:** Verify the output dimensions are larger than the input dimensions.

4. **Inpaint/Outpaint** — Use `POST https://api.stability.ai/v2beta/stable-image/edit/inpaint` or `/outpaint` with `image`, `mask` (for inpaint), or `left`/`right`/`up`/`down` amounts (for outpaint). Models recolor within the mask (inpaint) or expand beyond the canvas (outpaint). **Checkpoint:** For inpaint, verify the mask area is correctly replaced; for outpaint, verify the expanded area blends naturally.

5. **Generate Video** — Use `POST https://api.stability.ai/v2beta/stable-image/video/from-image` or `from-text` to generate short video clips. Video generation is async — poll the result URL provided in the response. **Checkpoint:** Poll the status URL until it returns `"status": "completed"`.

---

## Implementation Patterns

### Pattern 1: Image Generation with Stability AI

```python
from __future__ import annotations

import os
import httpx

# ❌ BAD — no error handling, hardcoded key, no format validation
import requests
resp = requests.post(
    "https://api.stability.ai/v2beta/stable-image/generate/core",
    headers={"authorization": "sk-mykey"},
    files={"prompt": (None, "a cat")},
)
with open("output.png", "wb") as f:
    f.write(resp.content)

# ✅ GOOD — typed, env-based auth, error handling, seed support
STABILITY_API_BASE = "https://api.stability.ai/v2beta"


class StabilityClient:
    """Client for Stability AI's generative media APIs."""

    def __init__(self) -> None:
        self.api_key = os.environ.get("STABILITY_API_KEY", "")
        if not self.api_key:
            raise ValueError(
                "STABILITY_API_KEY environment variable is not set."
            )
        self.client = httpx.Client(
            base_url=STABILITY_API_BASE,
            headers={
                "authorization": f"Bearer {self.api_key}",
                "accept": "image/*",
            },
            timeout=120.0,
        )

    def generate_image_core(
        self,
        prompt: str,
        aspect_ratio: str = "1:1",
        output_format: str = "png",
        seed: int | None = None,
        style_preset: str | None = None,
    ) -> bytes:
        """Generate an image using Stable Image Core.

        Args:
            prompt: Text description of the desired image.
            aspect_ratio: Aspect ratio (e.g., '1:1', '16:9', '4:5', '9:16').
            output_format: Image format ('png', 'jpeg', 'webp').
            seed: Optional seed for reproducibility.
            style_preset: Optional style preset name.

        Returns:
            Image data as bytes.

        Raises:
            RuntimeError: If image generation fails.
        """
        data: dict = {
            "prompt": prompt,
            "aspect_ratio": aspect_ratio,
            "output_format": output_format,
        }
        if seed is not None:
            data["seed"] = str(seed)
        if style_preset:
            data["style_preset"] = style_preset

        response = self.client.post(
            "/stable-image/generate/core",
            data=data,
        )

        if response.status_code != 200:
            error_detail = response.text[:500]
            raise RuntimeError(
                f"Image generation failed (HTTP {response.status_code}): "
                f"{error_detail}"
            )

        finish = response.headers.get("finish_reason", "UNKNOWN")
        if finish != "SUCCESS":
            raise RuntimeError(f"Image generation did not succeed: {finish}")

        return response.content
```

### Pattern 2: Creative Upscaling

```python
from __future__ import annotations

import httpx


def upscale_creative(
    image_bytes: bytes,
    prompt: str,
    api_key: str = "",
    negative_prompt: str = "",
) -> bytes:
    """Upscale an image using Stability AI's creative upscaler.

    The creative upscaler enhances and increases the resolution
    of the input image. Use for artistic upscaling (not for
    preserving exact pixel reproduction).

    Args:
        image_bytes: Original image data (PNG, JPEG, or WebP).
        prompt: Description to guide the upscaling.
        api_key: Stability AI API key (uses env var if empty).
        negative_prompt: Things to avoid in the output.

    Returns:
        Upscaled image data as bytes.

    Raises:
        RuntimeError: On API failure.
    """
    key = api_key or os.environ.get("STABILITY_API_KEY", "")
    if not key:
        raise ValueError("STABILITY_API_KEY is required.")

    data: dict = {
        "prompt": prompt,
        "output_format": "png",
    }
    if negative_prompt:
        data["negative_prompt"] = negative_prompt

    async with httpx.Client() as client:
        response = client.post(
            f"{STABILITY_API_BASE}/stable-image/upscale/creative",
            headers={
                "authorization": f"Bearer {key}",
                "accept": "image/*",
            },
            files={
                "image": ("input.png", image_bytes, "image/png"),
            },
            data=data,
            timeout=180,
        )

    if response.status_code != 200:
        raise RuntimeError(
            f"Upscaling failed (HTTP {response.status_code}): "
            f"{response.text[:300]}"
        )

    return response.content
```

### Pattern 3: Inpainting

```python
from __future__ import annotations

import httpx


def inpaint_image(
    image_bytes: bytes,
    mask_bytes: bytes,
    prompt: str,
    api_key: str = "",
) -> bytes:
    """Inpaint an image using a mask and prompt.

    The model fills the masked area with content matching the prompt.
    The mask should be a white-on-black image where white = area to inpaint.

    Args:
        image_bytes: Original image bytes.
        mask_bytes: Mask image bytes (white = area to fill).
        prompt: Description of desired content in the masked area.

    Returns:
        Inpainted image as bytes.
    """
    key = api_key or os.environ.get("STABILITY_API_KEY", "")
    if not key:
        raise ValueError("STABILITY_API_KEY is required.")

    with httpx.Client() as client:
        response = client.post(
            f"{STABILITY_API_BASE}/stable-image/edit/inpaint",
            headers={
                "authorization": f"Bearer {key}",
                "accept": "image/*",
            },
            files={
                "image": ("input.png", image_bytes, "image/png"),
                "mask": ("mask.png", mask_bytes, "image/png"),
            },
            data={
                "prompt": prompt,
                "output_format": "png",
            },
            timeout=120,
        )

    if response.status_code != 200:
        raise RuntimeError(
            f"Inpainting failed (HTTP {response.status_code}): "
            f"{response.text[:300]}"
        )

    return response.content
```

---

## Constraints

### MUST DO
- Read API key from `STABILITY_API_KEY` environment variable
- Use `"accept": "image/*"` header for image generation endpoints
- Check `finish_reason` header in image generation responses — must be `"SUCCESS"`
- Provide a meaningful `prompt` for upscaling (not just the original caption)
- Validate image format before sending to edit endpoints (PNG preferred)
- Use seed values for reproducible results in testing

### MUST NOT DO
- Hardcode API keys in source files
- Forget the `"accept": "image/*"` header — without it, you get JSON error responses
- Skip `finish_reason` validation — a 200 response can still indicate content filtering
- Use the creative upscaler for simple 2x scaling (use the fast upscaler instead)
- Assume all endpoints return images synchronously (video generation is async)
- Send excessively large images to edit endpoints (max ~10MB recommended)

---

## Live References

| Resource | URL |
|----------|-----|
| Stability AI API Documentation | https://platform.stability.ai/docs/ |
| Stability AI API Reference | https://platform.stability.ai/docs/api-reference |
| Stability AI Python SDK | https://pypi.org/project/stability-sdk/ |
| Stability AI Developer Portal | https://platform.stability.ai/ |
| Stability AI GitHub | https://github.com/Stability-AI/stability-sdk |
| Stable Image Core Guide | https://platform.stability.ai/docs/features/image-generation |

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `coding-replicate-api` | Alternative host for Stable Diffusion models |
| `coding-openai-api` | DALL-E image generation (alternative) |
| `coding-elevenlabs-api` | Audio generation (complementary generative media) |
