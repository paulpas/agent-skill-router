---
name: stabilityai-api
description: Integrates Stability AI API (image generation, video generation, upscaling,
  inpainting, 3D) using the stability-sdk Python client for generative media applications.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: stability ai, stabilityai, stable diffusion, sd3, stable image, core,
    stability api, how do i generate images, text to image, image generation
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
------

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

