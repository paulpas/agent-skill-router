#!/usr/bin/env python3
"""Model Registry: Central registry of all available LLM models and their configurations.

Provides:
- Unified model definitions across all providers
- API key validation
- Cost tracking (input/output tokens)
- Model discovery and filtering
- Provider availability checks
- Config-driven model selection from openconfig.json
"""

import os
import json
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from enum import Enum


class Provider(Enum):
    """Supported LLM providers."""

    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    GROQ = "groq"
    OLLAMA = "ollama"  # Local, no API key needed
    LLAMACPP = "llamacpp"  # Local llama.cpp server, no API key needed
    GOOGLE = "google"  # Google Gemini API


@dataclass
class ModelInfo:
    """Information about a single LLM model."""

    name: str
    provider: Provider
    api_key_env: Optional[str]  # Environment variable for API key
    cost_input_per_mtok: float  # Cost per million input tokens (USD)
    cost_output_per_mtok: float  # Cost per million output tokens (USD)
    context_window: int  # Maximum context window (tokens)
    max_output_tokens: int  # Maximum output tokens
    supports_streaming: bool = True
    temperature_range: Tuple[float, float] = (0.0, 2.0)
    description: str = ""

    def get_api_key(self) -> Optional[str]:
        """Get API key from environment or return None."""
        if self.api_key_env is None:
            return None
        return os.environ.get(self.api_key_env)

    def has_api_key(self) -> bool:
        """Check if API key is configured."""
        return self.get_api_key() is not None

    def is_local(self) -> bool:
        """Check if this is a local model (no API key needed)."""
        return self.provider in (Provider.OLLAMA, Provider.LLAMACPP)


class ModelRegistry:
    """Central registry of all available LLM models.

    Supports config-driven model selection via openconfig.json.
    Falls back to internal defaults if config not found.
    """

    # Default model name if config not available
    _DEFAULT_MODEL = "llama3"

    # Cached config (lazy-loaded)
    _config: Optional[Dict] = None

    # Complete model definitions with current pricing (2024-2025)
    MODELS: Dict[str, ModelInfo] = {
        # OpenAI Models
        "gpt-4": ModelInfo(
            name="gpt-4",
            provider=Provider.OPENAI,
            api_key_env="OPENAI_API_KEY",
            cost_input_per_mtok=30.0,
            cost_output_per_mtok=60.0,
            context_window=8192,
            max_output_tokens=8192,
            description="OpenAI's powerful reasoning model (turbo version)",
        ),
        "gpt-4-turbo": ModelInfo(
            name="gpt-4-turbo",
            provider=Provider.OPENAI,
            api_key_env="OPENAI_API_KEY",
            cost_input_per_mtok=10.0,
            cost_output_per_mtok=30.0,
            context_window=128000,
            max_output_tokens=4096,
            description="OpenAI GPT-4 Turbo with extended context",
        ),
        "gpt-4o": ModelInfo(
            name="gpt-4o",
            provider=Provider.OPENAI,
            api_key_env="OPENAI_API_KEY",
            cost_input_per_mtok=5.0,
            cost_output_per_mtok=15.0,
            context_window=128000,
            max_output_tokens=16384,
            description="OpenAI's optimized multimodal model (latest)",
        ),
        "gpt-4o-mini": ModelInfo(
            name="gpt-4o-mini",
            provider=Provider.OPENAI,
            api_key_env="OPENAI_API_KEY",
            cost_input_per_mtok=0.15,
            cost_output_per_mtok=0.60,
            context_window=128000,
            max_output_tokens=16384,
            description="OpenAI's lightweight optimized model (2024)",
        ),
        "o1": ModelInfo(
            name="o1",
            provider=Provider.OPENAI,
            api_key_env="OPENAI_API_KEY",
            cost_input_per_mtok=15.0,
            cost_output_per_mtok=60.0,
            context_window=128000,
            max_output_tokens=32768,
            description="OpenAI's reasoning model for complex problem-solving",
        ),
        "o1-mini": ModelInfo(
            name="o1-mini",
            provider=Provider.OPENAI,
            api_key_env="OPENAI_API_KEY",
            cost_input_per_mtok=3.0,
            cost_output_per_mtok=12.0,
            context_window=128000,
            max_output_tokens=32768,
            description="OpenAI's lightweight reasoning model (faster, cheaper)",
        ),
        "o3": ModelInfo(
            name="o3",
            provider=Provider.OPENAI,
            api_key_env="OPENAI_API_KEY",
            cost_input_per_mtok=20.0,
            cost_output_per_mtok=80.0,
            context_window=200000,
            max_output_tokens=32768,
            description="OpenAI's advanced reasoning model (2025, latest)",
        ),
        "gpt-3.5-turbo": ModelInfo(
            name="gpt-3.5-turbo",
            provider=Provider.OPENAI,
            api_key_env="OPENAI_API_KEY",
            cost_input_per_mtok=0.5,
            cost_output_per_mtok=1.5,
            context_window=16385,
            max_output_tokens=4096,
            description="Fast, cost-effective model for simple tasks",
        ),
        "gpt-4.1": ModelInfo(
            name="gpt-4.1",
            provider=Provider.OPENAI,
            api_key_env="OPENAI_API_KEY",
            cost_input_per_mtok=12.0,
            cost_output_per_mtok=48.0,
            context_window=128000,
            max_output_tokens=4096,
            description="GPT-4.1: Next generation reasoning model (2025)",
        ),
        "gpt-4.1-mini": ModelInfo(
            name="gpt-4.1-mini",
            provider=Provider.OPENAI,
            api_key_env="OPENAI_API_KEY",
            cost_input_per_mtok=2.0,
            cost_output_per_mtok=8.0,
            context_window=128000,
            max_output_tokens=4096,
            description="GPT-4.1 Mini: Lightweight reasoning model (2025)",
        ),
        "gpt-5": ModelInfo(
            name="gpt-5",
            provider=Provider.OPENAI,
            api_key_env="OPENAI_API_KEY",
            cost_input_per_mtok=25.0,
            cost_output_per_mtok=100.0,
            context_window=128000,
            max_output_tokens=8192,
            description="GPT-5: Advanced model (August 2025)",
        ),
        "gpt-5.1": ModelInfo(
            name="gpt-5.1",
            provider=Provider.OPENAI,
            api_key_env="OPENAI_API_KEY",
            cost_input_per_mtok=28.0,
            cost_output_per_mtok=112.0,
            context_window=128000,
            max_output_tokens=8192,
            description="GPT-5.1: Enhanced model (November 2025)",
        ),
        "gpt-5.2": ModelInfo(
            name="gpt-5.2",
            provider=Provider.OPENAI,
            api_key_env="OPENAI_API_KEY",
            cost_input_per_mtok=30.0,
            cost_output_per_mtok=120.0,
            context_window=128000,
            max_output_tokens=8192,
            description="GPT-5.2: Latest variant (December 2025)",
        ),
        "gpt-5.4": ModelInfo(
            name="gpt-5.4",
            provider=Provider.OPENAI,
            api_key_env="OPENAI_API_KEY",
            cost_input_per_mtok=32.0,
            cost_output_per_mtok=128.0,
            context_window=128000,
            max_output_tokens=16384,
            description="GPT-5.4: Advanced reasoning (March 2026)",
        ),
        "gpt-5.4-pro": ModelInfo(
            name="gpt-5.4-pro",
            provider=Provider.OPENAI,
            api_key_env="OPENAI_API_KEY",
            cost_input_per_mtok=35.0,
            cost_output_per_mtok=140.0,
            context_window=128000,
            max_output_tokens=16384,
            description="GPT-5.4 Pro: Professional reasoning tier (March 2026)",
        ),
        "gpt-5.5": ModelInfo(
            name="gpt-5.5",
            provider=Provider.OPENAI,
            api_key_env="OPENAI_API_KEY",
            cost_input_per_mtok=35.0,
            cost_output_per_mtok=140.0,
            context_window=200000,
            max_output_tokens=32768,
            description="GPT-5.5: Latest generation (April 2026)",
        ),
        "gpt-5.5-pro": ModelInfo(
            name="gpt-5.5-pro",
            provider=Provider.OPENAI,
            api_key_env="OPENAI_API_KEY",
            cost_input_per_mtok=40.0,
            cost_output_per_mtok=160.0,
            context_window=200000,
            max_output_tokens=32768,
            description="GPT-5.5 Pro: Professional tier (April 2026)",
        ),
        "o1-pro": ModelInfo(
            name="o1-pro",
            provider=Provider.OPENAI,
            api_key_env="OPENAI_API_KEY",
            cost_input_per_mtok=20.0,
            cost_output_per_mtok=80.0,
            context_window=128000,
            max_output_tokens=32768,
            description="OpenAI o1 Pro: Advanced reasoning (2025)",
        ),
        "o3-mini": ModelInfo(
            name="o3-mini",
            provider=Provider.OPENAI,
            api_key_env="OPENAI_API_KEY",
            cost_input_per_mtok=5.0,
            cost_output_per_mtok=20.0,
            context_window=128000,
            max_output_tokens=32768,
            description="OpenAI o3 Mini: Lightweight reasoning (2025)",
        ),
        "o3-pro": ModelInfo(
            name="o3-pro",
            provider=Provider.OPENAI,
            api_key_env="OPENAI_API_KEY",
            cost_input_per_mtok=25.0,
            cost_output_per_mtok=100.0,
            context_window=128000,
            max_output_tokens=32768,
            description="OpenAI o3 Pro: Advanced reasoning (2025)",
        ),
        "o4-mini": ModelInfo(
            name="o4-mini",
            provider=Provider.OPENAI,
            api_key_env="OPENAI_API_KEY",
            cost_input_per_mtok=8.0,
            cost_output_per_mtok=32.0,
            context_window=128000,
            max_output_tokens=32768,
            description="OpenAI o4 Mini: Next-gen lightweight reasoning (2025)",
        ),
        "gpt-audio": ModelInfo(
            name="gpt-audio",
            provider=Provider.OPENAI,
            api_key_env="OPENAI_API_KEY",
            cost_input_per_mtok=6.0,
            cost_output_per_mtok=24.0,
            context_window=128000,
            max_output_tokens=8192,
            description="GPT Audio: Voice and audio processing",
        ),
        "gpt-image-2": ModelInfo(
            name="gpt-image-2",
            provider=Provider.OPENAI,
            api_key_env="OPENAI_API_KEY",
            cost_input_per_mtok=10.0,
            cost_output_per_mtok=40.0,
            context_window=8192,
            max_output_tokens=4096,
            description="GPT Image 2: Latest image generation model (April 2026)",
        ),
        # Anthropic Models
        "claude-3-opus": ModelInfo(
            name="claude-3-opus",
            provider=Provider.ANTHROPIC,
            api_key_env="ANTHROPIC_API_KEY",
            cost_input_per_mtok=15.0,
            cost_output_per_mtok=75.0,
            context_window=200000,
            max_output_tokens=4096,
            description="Claude 3 Opus: Most capable model",
        ),
        "claude-3-sonnet": ModelInfo(
            name="claude-3-sonnet",
            provider=Provider.ANTHROPIC,
            api_key_env="ANTHROPIC_API_KEY",
            cost_input_per_mtok=3.0,
            cost_output_per_mtok=15.0,
            context_window=200000,
            max_output_tokens=8192,
            description="Claude 3 Sonnet: Balanced speed and capability",
        ),
        "claude-3-haiku": ModelInfo(
            name="claude-3-haiku",
            provider=Provider.ANTHROPIC,
            api_key_env="ANTHROPIC_API_KEY",
            cost_input_per_mtok=0.25,
            cost_output_per_mtok=1.25,
            context_window=200000,
            max_output_tokens=4096,
            description="Claude 3 Haiku: Fast and cost-effective",
        ),
        "claude-3-5-sonnet": ModelInfo(
            name="claude-3-5-sonnet",
            provider=Provider.ANTHROPIC,
            api_key_env="ANTHROPIC_API_KEY",
            cost_input_per_mtok=3.0,
            cost_output_per_mtok=15.0,
            context_window=200000,
            max_output_tokens=8192,
            description="Claude 3.5 Sonnet: Latest and most capable Sonnet variant",
        ),
        "claude-3-5-haiku": ModelInfo(
            name="claude-3-5-haiku",
            provider=Provider.ANTHROPIC,
            api_key_env="ANTHROPIC_API_KEY",
            cost_input_per_mtok=0.80,
            cost_output_per_mtok=4.0,
            context_window=200000,
            max_output_tokens=8192,
            description="Claude 3.5 Haiku: Latest lightweight variant (March 2024)",
        ),
        "claude-opus-4": ModelInfo(
            name="claude-opus-4",
            provider=Provider.ANTHROPIC,
            api_key_env="ANTHROPIC_API_KEY",
            cost_input_per_mtok=25.0,
            cost_output_per_mtok=125.0,
            context_window=200000,
            max_output_tokens=4096,
            description="Claude Opus 4: Advanced reasoning model variant",
        ),
        "claude-opus-4-1-20250805": ModelInfo(
            name="claude-opus-4-1-20250805",
            provider=Provider.ANTHROPIC,
            api_key_env="ANTHROPIC_API_KEY",
            cost_input_per_mtok=30.0,
            cost_output_per_mtok=150.0,
            context_window=200000,
            max_output_tokens=32000,
            description="Claude Opus 4.1: Enhanced reasoning (August 2025)",
        ),
        "claude-sonnet-4-20250514": ModelInfo(
            name="claude-sonnet-4-20250514",
            provider=Provider.ANTHROPIC,
            api_key_env="ANTHROPIC_API_KEY",
            cost_input_per_mtok=8.0,
            cost_output_per_mtok=40.0,
            context_window=1000000,
            max_output_tokens=64000,
            description="Claude Sonnet 4: Balanced capability (May 2025)",
        ),
        "claude-sonnet-4-5-20250929": ModelInfo(
            name="claude-sonnet-4-5-20250929",
            provider=Provider.ANTHROPIC,
            api_key_env="ANTHROPIC_API_KEY",
            cost_input_per_mtok=9.0,
            cost_output_per_mtok=45.0,
            context_window=1000000,
            max_output_tokens=64000,
            description="Claude Sonnet 4.5: Improved variant (September 2025)",
        ),
        "claude-sonnet-4-6": ModelInfo(
            name="claude-sonnet-4-6",
            provider=Provider.ANTHROPIC,
            api_key_env="ANTHROPIC_API_KEY",
            cost_input_per_mtok=10.0,
            cost_output_per_mtok=50.0,
            context_window=1000000,
            max_output_tokens=128000,
            description="Claude Sonnet 4.6: Latest variant (February 2026)",
        ),
        "claude-opus-4-5-20251101": ModelInfo(
            name="claude-opus-4-5-20251101",
            provider=Provider.ANTHROPIC,
            api_key_env="ANTHROPIC_API_KEY",
            cost_input_per_mtok=35.0,
            cost_output_per_mtok=175.0,
            context_window=200000,
            max_output_tokens=64000,
            description="Claude Opus 4.5: Advanced reasoning (November 2025)",
        ),
        "claude-opus-4-6": ModelInfo(
            name="claude-opus-4-6",
            provider=Provider.ANTHROPIC,
            api_key_env="ANTHROPIC_API_KEY",
            cost_input_per_mtok=40.0,
            cost_output_per_mtok=200.0,
            context_window=1000000,
            max_output_tokens=128000,
            description="Claude Opus 4.6: Latest variant (February 2026)",
        ),
        "claude-opus-4-7": ModelInfo(
            name="claude-opus-4-7",
            provider=Provider.ANTHROPIC,
            api_key_env="ANTHROPIC_API_KEY",
            cost_input_per_mtok=45.0,
            cost_output_per_mtok=225.0,
            context_window=1000000,
            max_output_tokens=128000,
            description="Claude Opus 4.7: Newest generation (April 2026)",
        ),
        "claude-haiku-4-5-20251001": ModelInfo(
            name="claude-haiku-4-5-20251001",
            provider=Provider.ANTHROPIC,
            api_key_env="ANTHROPIC_API_KEY",
            cost_input_per_mtok=1.0,
            cost_output_per_mtok=5.0,
            context_window=200000,
            max_output_tokens=64000,
            description="Claude Haiku 4.5: Fast lightweight (October 2025)",
        ),
        # Groq Models (very fast inference)
        "mixtral-8x7b": ModelInfo(
            name="mixtral-8x7b",
            provider=Provider.GROQ,
            api_key_env="GROQ_API_KEY",
            cost_input_per_mtok=0.27,
            cost_output_per_mtok=0.81,
            context_window=32000,
            max_output_tokens=8192,
            description="Groq's fast Mixtral-8x7B model",
        ),
        "llama-2-70b-chat": ModelInfo(
            name="llama-2-70b-chat",
            provider=Provider.GROQ,
            api_key_env="GROQ_API_KEY",
            cost_input_per_mtok=0.70,
            cost_output_per_mtok=0.90,
            context_window=4096,
            max_output_tokens=4096,
            description="Groq's fast Llama-2-70B chat model",
        ),
        "llama3-70b-8192": ModelInfo(
            name="llama3-70b-8192",
            provider=Provider.GROQ,
            api_key_env="GROQ_API_KEY",
            cost_input_per_mtok=0.59,
            cost_output_per_mtok=0.79,
            context_window=8192,
            max_output_tokens=8192,
            description="Groq's fast Llama-3-70B model",
        ),
        # Ollama Models (local, free)
        "llama2": ModelInfo(
            name="llama2",
            provider=Provider.OLLAMA,
            api_key_env=None,
            cost_input_per_mtok=0.0,
            cost_output_per_mtok=0.0,
            context_window=4096,
            max_output_tokens=4096,
            description="Local Llama 2 model (free)",
        ),
        "llama2-7b": ModelInfo(
            name="llama2-7b",
            provider=Provider.OLLAMA,
            api_key_env=None,
            cost_input_per_mtok=0.0,
            cost_output_per_mtok=0.0,
            context_window=4096,
            max_output_tokens=4096,
            description="Local Llama 2 7B model (free)",
        ),
        "llama3": ModelInfo(
            name="llama3",
            provider=Provider.OLLAMA,
            api_key_env=None,
            cost_input_per_mtok=0.0,
            cost_output_per_mtok=0.0,
            context_window=8192,
            max_output_tokens=8192,
            description="Local Llama 3 model (free)",
        ),
        "mistral": ModelInfo(
            name="mistral",
            provider=Provider.OLLAMA,
            api_key_env=None,
            cost_input_per_mtok=0.0,
            cost_output_per_mtok=0.0,
            context_window=8192,
            max_output_tokens=8192,
            description="Local Mistral model (free)",
        ),
        "neural-chat": ModelInfo(
            name="neural-chat",
            provider=Provider.OLLAMA,
            api_key_env=None,
            cost_input_per_mtok=0.0,
            cost_output_per_mtok=0.0,
            context_window=8192,
            max_output_tokens=4096,
            description="Local Neural Chat model (free)",
        ),
        "codellama": ModelInfo(
            name="codellama",
            provider=Provider.OLLAMA,
            api_key_env=None,
            cost_input_per_mtok=0.0,
            cost_output_per_mtok=0.0,
            context_window=4096,
            max_output_tokens=4096,
            description="Local Code Llama model (free)",
        ),
        "gemma": ModelInfo(
            name="gemma",
            provider=Provider.OLLAMA,
            api_key_env=None,
            cost_input_per_mtok=0.0,
            cost_output_per_mtok=0.0,
            context_window=8192,
            max_output_tokens=8192,
            description="Local Google Gemma model (free)",
        ),
        # llama.cpp Models (local server)
        "qwen3-coder-next-8_0": ModelInfo(
            name="qwen3-coder-next-8_0",
            provider=Provider.LLAMACPP,
            api_key_env=None,
            cost_input_per_mtok=0.0,
            cost_output_per_mtok=0.0,
            context_window=272000,
            max_output_tokens=272000,
            description="Qwen3 Coder Next (Q8_0 quantization) - Local llama.cpp server",
        ),
        "qwen3-coder-next": ModelInfo(
            name="qwen3-coder-next",
            provider=Provider.LLAMACPP,
            api_key_env=None,
            cost_input_per_mtok=0.0,
            cost_output_per_mtok=0.0,
            context_window=272000,
            max_output_tokens=32768,
            description="Qwen3 Coder Next (Q4_K_M quantization) - Local llama.cpp server",
        ),
        "qwen2-72b": ModelInfo(
            name="qwen2-72b",
            provider=Provider.LLAMACPP,
            api_key_env=None,
            cost_input_per_mtok=0.0,
            cost_output_per_mtok=0.0,
            context_window=272000,
            max_output_tokens=32768,
            description="Qwen2 72B (Q8_0 quantization) - Local llama.cpp server",
        ),
        "nemotron-120b": ModelInfo(
            name="nemotron-120b",
            provider=Provider.LLAMACPP,
            api_key_env=None,
            cost_input_per_mtok=0.0,
            cost_output_per_mtok=0.0,
            context_window=272000,
            max_output_tokens=32768,
            description="NVIDIA Nemotron 3 Super 120B (UD-Q4_K_M) - Local llama.cpp server",
        ),
        "qwen35-27b": ModelInfo(
            name="qwen35-27b",
            provider=Provider.LLAMACPP,
            api_key_env=None,
            cost_input_per_mtok=0.0,
            cost_output_per_mtok=0.0,
            context_window=68096,
            max_output_tokens=68096,
            description="Qwen3.5 27B (Q4_K_M quantization) - Local llama.cpp server",
        ),
        # Ollama Models - Additional
        "qwen3-coder:30b": ModelInfo(
            name="qwen3-coder:30b",
            provider=Provider.OLLAMA,
            api_key_env=None,
            cost_input_per_mtok=0.0,
            cost_output_per_mtok=0.0,
            context_window=32000,
            max_output_tokens=8192,
            description="Qwen3 Coder 30B - Local Ollama model (free)",
        ),
        "gpt-oss:20b": ModelInfo(
            name="gpt-oss:20b",
            provider=Provider.OLLAMA,
            api_key_env=None,
            cost_input_per_mtok=0.0,
            cost_output_per_mtok=0.0,
            context_window=32000,
            max_output_tokens=8192,
            description="GPT-OSS 20B - Local Ollama model (free)",
        ),
        # Google Gemini Models
        "gemini-3-flash-preview": ModelInfo(
            name="gemini-3-flash-preview",
            provider=Provider.GOOGLE,
            api_key_env="GEMINI_API_KEY",
            cost_input_per_mtok=0.075,
            cost_output_per_mtok=0.30,
            context_window=1000000,
            max_output_tokens=8192,
            description="Google Gemini 3 Flash Preview - Fast multimodal model",
        ),
        "gemini-2.5-flash": ModelInfo(
            name="gemini-2.5-flash",
            provider=Provider.GOOGLE,
            api_key_env="GEMINI_API_KEY",
            cost_input_per_mtok=0.075,
            cost_output_per_mtok=0.30,
            context_window=1000000,
            max_output_tokens=8192,
            description="Google Gemini 2.5 Flash - Updated fast model",
        ),
    }

    @classmethod
    def list_all_models(cls) -> Dict[str, ModelInfo]:
        """Get all available models."""
        return cls.MODELS.copy()

    @classmethod
    def list_by_provider(cls, provider: Provider) -> Dict[str, ModelInfo]:
        """Get models for a specific provider."""
        return {
            name: info for name, info in cls.MODELS.items() if info.provider == provider
        }

    @classmethod
    def list_configured_models(cls) -> Dict[str, ModelInfo]:
        """Get only models with API keys available."""
        configured = {}
        for name, info in cls.MODELS.items():
            if info.is_local() or info.has_api_key():
                configured[name] = info
        return configured

    @classmethod
    def get_model(cls, model_name: str) -> Optional[ModelInfo]:
        """Get a specific model by name."""
        return cls.MODELS.get(model_name)

    @classmethod
    def validate_model(cls, model_name: str) -> Tuple[bool, Optional[str]]:
        """Validate if a model exists and is properly configured.

        Returns:
            (is_valid, error_message)
        """
        if model_name not in cls.MODELS:
            available = ", ".join(sorted(cls.MODELS.keys()))
            return False, f"Unknown model: {model_name}. Available: {available}"

        model = cls.MODELS[model_name]

        if not model.is_local() and not model.has_api_key():
            return False, (
                f"API key not configured for {model.provider.value}. "
                f"Set {model.api_key_env} environment variable."
            )

        return True, None

    @classmethod
    def get_cost_estimate(
        cls,
        model_name: str,
        input_tokens: int,
        output_tokens: int,
    ) -> Optional[float]:
        """Estimate cost for a model call.

        Args:
            model_name: Name of the model
            input_tokens: Number of input tokens
            output_tokens: Number of output tokens

        Returns:
            Estimated cost in USD, or None if model not found
        """
        model = cls.get_model(model_name)
        if model is None:
            return None

        input_cost = (input_tokens / 1_000_000) * model.cost_input_per_mtok
        output_cost = (output_tokens / 1_000_000) * model.cost_output_per_mtok
        return input_cost + output_cost

    @classmethod
    def print_model_catalog(cls, configured_only: bool = False):
        """Print a formatted model catalog."""
        models = (
            cls.list_configured_models() if configured_only else cls.list_all_models()
        )

        print("\n" + "=" * 100)
        if configured_only:
            print("CONFIGURED MODELS (with API keys)")
        else:
            print("ALL AVAILABLE MODELS")
        print("=" * 100)

        # Group by provider
        by_provider = {}
        for name, model in models.items():
            provider = model.provider.value
            if provider not in by_provider:
                by_provider[provider] = []
            by_provider[provider].append((name, model))

        for provider_name in sorted(by_provider.keys()):
            print(f"\n{provider_name.upper()}")
            print("-" * 100)

            for model_name, model in sorted(by_provider[provider_name]):
                status = "✅" if (model.is_local() or model.has_api_key()) else "❌"
                cost_str = (
                    "FREE"
                    if model.is_local()
                    or (
                        model.cost_input_per_mtok == 0
                        and model.cost_output_per_mtok == 0
                    )
                    else f"${model.cost_input_per_mtok:.2f}/${model.cost_output_per_mtok:.2f}/1M"
                )

                print(f"  {status} {model_name:<25} {cost_str:<20} {model.description}")

        print("\n" + "=" * 100 + "\n")

    @classmethod
    def load_config(cls, config_path: str = "openconfig.json") -> Dict:
        """Load model configuration from openconfig.json.

        Args:
            config_path: Path to openconfig.json (default: openconfig.json in cwd)

        Returns:
            Config dictionary with 'default' and 'available' keys
            Falls back to internal defaults if file not found or invalid
        """
        if cls._config is not None:
            return cls._config

        config_file = Path(config_path)

        # Guard: check if file exists
        if not config_file.exists():
            cls._config = {
                "default": cls._DEFAULT_MODEL,
                "available": list(cls.MODELS.keys()),
            }
            return cls._config

        try:
            with open(config_file, "r") as f:
                raw_config = json.load(f)

            # Guard: validate required fields
            if "models" not in raw_config:
                raise ValueError("Config missing 'models' key")

            models = raw_config["models"]
            if "default" not in models or "available" not in models:
                raise ValueError(
                    "Config 'models' must have 'default' and 'available' keys"
                )

            # Parse and validate
            default_model = models["default"]
            available_models = models["available"]

            # Ensure default is in available list
            if default_model not in available_models:
                available_models.append(default_model)

            cls._config = {"default": default_model, "available": available_models}
            return cls._config

        except (json.JSONDecodeError, IOError, ValueError) as e:
            # Fail loud on parse errors
            raise ValueError(f"Failed to load config from {config_path}: {e}") from e

    @classmethod
    def get_default_model(cls) -> str:
        """Get default model from config.

        Returns:
            Name of default model (from config or internal fallback)
        """
        config = cls.load_config()
        return config["default"]

    @classmethod
    def get_available_models(cls) -> List[str]:
        """Get available models from config.

        Returns:
            List of available model names (from config or internal list)
        """
        config = cls.load_config()
        return config["available"]

    @classmethod
    def print_config_models(cls):
        """Print models from openconfig.json with default marked."""
        try:
            config = cls.load_config()
            default_model = config["default"]
            available_models = config["available"]
        except (ValueError, KeyError):
            # Fallback to internal defaults
            default_model = cls._DEFAULT_MODEL
            available_models = list(cls.MODELS.keys())

        print("\n" + "=" * 100)
        print("AVAILABLE MODELS (from openconfig.json)")
        print("=" * 100 + "\n")

        for model_name in sorted(available_models):
            model_info = cls.MODELS.get(model_name)
            if model_info is None:
                continue

            # Mark default with asterisk
            marker = "* " if model_name == default_model else "  "
            provider = model_info.provider.value.capitalize()

            # Show cost
            if model_info.is_local():
                cost_str = "(Local)"
            elif (
                model_info.cost_input_per_mtok == 0
                and model_info.cost_output_per_mtok == 0
            ):
                cost_str = "(Free)"
            else:
                cost_str = f"(${model_info.cost_input_per_mtok:.2f}/${model_info.cost_output_per_mtok:.2f}/1M)"

            # Show default marker
            default_marker = " [DEFAULT]" if model_name == default_model else ""

            print(f"{marker}{model_name:<25} {provider:<12} {cost_str}{default_marker}")

        print("\n" + "=" * 100)
        print("Set default with:   edit openconfig.json → models.default")
        print("Override with:      --model <name>")
        print("=" * 100 + "\n")

    @classmethod
    def print_cost_comparison(cls):
        """Print cost comparison across models."""
        print("\n" + "=" * 120)
        print("COST COMPARISON (USD per 1 million tokens)")
        print("=" * 120)

        # Sample sizes
        sample_input = 1_000_000  # 1M input tokens
        sample_output = 500_000  # 500K output tokens

        models = sorted(cls.MODELS.items())

        print(
            f"\n{'Model':<25} {'Provider':<12} "
            f"{'Input Cost':<15} {'Output Cost':<15} "
            f"{'Total (1M+500K)':<18} {'Status':<12}"
        )
        print("-" * 120)

        for model_name, model in models:
            status = (
                "✅ Ready" if (model.is_local() or model.has_api_key()) else "❌ No Key"
            )

            total_cost = cls.get_cost_estimate(
                model_name,
                sample_input,
                sample_output,
            )
            total_str = f"${total_cost:.2f}" if total_cost is not None else "ERROR"

            print(
                f"{model_name:<25} {model.provider.value:<12} "
                f"${model.cost_input_per_mtok:<14.2f} "
                f"${model.cost_output_per_mtok:<14.2f} "
                f"{total_str:<18} {status:<12}"
            )

        print("=" * 120 + "\n")


def main():
    """Demo: Show available models and validate configuration."""
    import argparse

    parser = argparse.ArgumentParser(description="LLM Model Registry")
    parser.add_argument(
        "--list-all",
        action="store_true",
        help="List all available models",
    )
    parser.add_argument(
        "--list-configured",
        action="store_true",
        help="List only configured models (with API keys)",
    )
    parser.add_argument(
        "--costs",
        action="store_true",
        help="Show cost comparison across models",
    )
    parser.add_argument(
        "--validate",
        type=str,
        help="Validate a specific model (e.g., gpt-4)",
    )

    args = parser.parse_args()

    # Guard: no arguments provided
    if not any([args.list_all, args.list_configured, args.costs, args.validate]):
        parser.print_help()
        return

    if args.list_all:
        ModelRegistry.print_model_catalog(configured_only=False)

    if args.list_configured:
        ModelRegistry.print_model_catalog(configured_only=True)

    if args.costs:
        ModelRegistry.print_cost_comparison()

    if args.validate:
        is_valid, error = ModelRegistry.validate_model(args.validate)
        if is_valid:
            model = ModelRegistry.get_model(args.validate)
            print(f"✅ {args.validate} is ready to use")
            print(f"   Provider: {model.provider.value}")
            print(f"   Context: {model.context_window} tokens")
            print(f"   Max output: {model.max_output_tokens} tokens")
            if model.is_local():
                print(f"   Cost: FREE (local)")
            else:
                cost = ModelRegistry.get_cost_estimate(args.validate, 1000, 500)
                print(f"   Estimated cost (1K in, 500 out): ${cost:.6f}")
        else:
            print(f"❌ {error}")


if __name__ == "__main__":
    main()
