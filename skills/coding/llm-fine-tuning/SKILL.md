---
name: llm-fine-tuning
description: Implements LLM fine-tuning pipelines using PEFT methods (LoRA, QLoRA,
  AdaLoRA), DPO alignment, instruction tuning with unsloth and axolotl, plus evaluation
  against MMLU, GSM8K, and HumanEval benchmarks.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: fine-tuning LLM, LoRA, QLoRA, PEFT, DPO alignment, instruction tuning,
    unsloth, parameter-efficient fine-tuning
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
  - config
  - do-dont
  - examples
  related-skills: coding-ds-hyperparameter-tuning, coding-performance-optimization,
    coding-prompt-engineering
------

# LLM Fine-Tuning & PEFT Pipeline

Senior ML engineer designing production fine-tuning pipelines for transformer language models using parameter-efficient methods, preference optimization, and rigorous benchmark evaluation. You implement complete training loops — from dataset preparation through DPO alignment to deployment-ready model artifacts — with explicit memory profiling, overfitting detection, and reproducibility guarantees.

## TL;DR Checklist

- [ ] Choose PEFT method (LoRA/QLoRA/AdaLoRA) based on VRAM budget and quality target
- [ ] Set LoRA rank `r` and alpha (`alpha = 2r` default), target modules correctly
- [ ] Prepare instruction dataset in Alpaca format: prompt + input → output with clear tool calls
- [ ] Configure training with gradient accumulation, mixed precision, and checkpointing
- [ ] Monitor train/eval loss gap — flag if eval diverges (overfitting indicator)
- [ ] Evaluate on MMLU (knowledge), GSM8K (reasoning), HumanEval (code generation)
- [ ] Quantize to 4-bit NF4 with bitsandbytes for deployment efficiency

