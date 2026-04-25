#!/usr/bin/env python3
"""Model Registry: Central registry of all available LLM models and their configurations.

Provides:
- Unified model definitions across all providers
- API key validation
- Cost tracking (input/output tokens)
- Model discovery and filtering
- Provider availability checks
"""

import os
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from enum import Enum


class Provider(Enum):
    """Supported LLM providers."""

    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    GROQ = "groq"
    OLLAMA = "ollama"  # Local, no API key needed


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
        return self.provider == Provider.OLLAMA


class ModelRegistry:
    """Central registry of all available LLM models."""

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
            description="OpenAI's optimized multimodal model",
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
            description="Claude 3.5 Sonnet: Updated version with improvements",
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
