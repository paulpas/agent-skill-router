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

---

## When to Use

- Adapting a base LLM (7B–70B parameters) to a specific domain or task via fine-tuning
- Improving instruction-following behavior beyond what prompt engineering alone achieves
- Aligning model outputs to human preferences using DPO instead of full RLHF pipelines
- Deploying on GPU-constrained hardware where full fine-tuning is infeasible (use QLoRA)
- Building a reproducible fine-tuning pipeline with YAML-based configs (axolotl)

## When NOT to Use

- The task can be solved with prompt engineering, RAG, or system prompts — use `coding-prompt-engineering` instead
- You need real-time model updates — fine-tuned models require re-deployment
- Dataset has fewer than 100 high-quality examples — consider few-shot prompting instead
- You are training from pre-trained weights (no foundation model exists) — start with an existing checkpoint

---

## Core Workflow

1. **Assess Hardware and Model** — Determine available VRAM, select base model size, choose PEFT method. For a 7B model: QLoRA needs ~8–16 GB VRAM, full BF16 fine-tuning needs 80+ GB per GPU. **Checkpoint:** If VRAM < 24 GB, default to QLoRA with NF4 quantization and rank `r <= 32`.

2. **Select PEFT Method** — Match method to constraints:
   - LoRA for good quality / moderate memory (r=16–64)
   - QLoRA for GPU-constrained environments (4-bit NF4 + double quantization)
   - AdaLoRA when you want adaptive rank allocation across layers
   - DoRA when weight decomposition improves gradient stability **Checkpoint:** Record chosen method, rank, alpha, and target modules before starting.

3. **Prepare Dataset** — Structure instruction-tuning data in prompt/input/output format. Use tools like `alpaca-loader` or custom scripts to convert raw data into HuggingFace `Dataset` objects. **Checkpoint:** Verify dataset has balanced domains, no leakage between train/eval splits, and output lengths are reasonable (< 1024 tokens).

4. **Configure Training** — Set up the training framework (unsloth for speed, axolotl for reproducibility). Configure gradient accumulation, warmup ratio, learning rate scheduler, and checkpoint frequency. **Checkpoint:** Run a single-step forward/backward pass to verify memory consumption before full training.

5. **Execute Training Loop** — Monitor loss curves, check train/eval gap for overfitting, save checkpoints at intervals. **Checkpoint:** If eval loss rises while train loss falls for > 3 consecutive epochs, reduce `learning_rate` by 10x or stop early.

6. **Evaluate and Compare** — Run benchmark suite (MMLU, GSM8K, HumanEval) on each checkpoint. Compare against base model to verify improvement. **Checkpoint:** Every metric must improve over base; if a benchmark degrades, investigate dataset composition.

7. **Deploy with vLLM** — Merge LoRA adapters for serving, or use vLLM's adapter support for multi-LoRA inference. Quantize the merged weights to 4-bit NF4 for production efficiency.

---

## PEFT Method Reference

### When to Use Each Method

| Method    | VRAM (7B model) | Quality   | Best For                              |
|-----------|------------------|-----------|---------------------------------------|
| Full FT   | 80+ GB           | Highest   | Maximum quality, unconstrained GPU    |
| LoRA      | 16–24 GB         | High      | General purpose fine-tuning           |
| QLoRA     | 8–16 GB          | Near-LoRA | Budget GPUs (RTX 3090/4090)           |
| AdaLoRA   | 16–24 GB         | LoRA+     | Tasks needing uneven layer importance |
| DoRA      | 16–24 GB         | Slightly above LoRA | Training stability on small datasets |

### Key Parameter Ranges

- **Rank (`r`)**: `8` (lightweight), `16` (default), `32` (complex tasks), `64` (domain-specific, many parameters)
- **Alpha (`α`)**: Default `alpha = 2r`, so r=16 → α=32. Higher alpha amplifies the low-rank update.
- **Target modules**: `q_proj, k_proj, v_proj, o_proj` (attention) + `gate_proj, up_proj, down_proj` (MLP) for full coverage; omit MLP modules to save VRAM at quality cost.

---

## Implementation Patterns

### Pattern 1: LoRA Configuration and Model Loading with unsloth

```python
"""LoRA fine-tuning pipeline using unsloth — 2x faster, 60% less VRAM than standard transformers."""

from typing import Optional
from dataclasses import dataclass, field

import torch
from trl import SFTConfig, SFTTrainer
from unsloth import FastLanguageModel


@dataclass(frozen=True)
class LoRAConfig:
    """Immutable configuration for LoRA fine-tuning.
    
    Attributes:
        max_seq_length: Maximum token context length for training
        dtype: Data type for model weights (float16 or bfloat16)
        load_in_4bit: Whether to quantize base model to 4-bit NF4
        lora_rank: Low-rank adaptation dimension (8, 16, 32, or 64)
        lora_alpha: LoRA scaling factor (typically 2 * rank)
        lora_dropout: Dropout applied to LoRA layers (use 0 for BF16)
        target_modules: Which linear layers receive LoRA adapters
        use_gradient_checkpointing: Enable gradient checkpointing for VRAM savings
        use_rslora: Use Rank-Stabilized LoRA (alpha normalization independent of rank)
    """
    max_seq_length: int = 2048
    dtype: Optional[torch.dtype] = field(
        default=None,
        metadata={"help": "Automatic dtype detection if None"}
    )
    load_in_4bit: bool = True
    lora_rank: int = 16
    lora_alpha: int = 32
    lora_dropout: float = 0.0
    target_modules: list[str] = field(default_factory=lambda: [
        "q_proj", "k_proj", "v_proj", "o_proj",
        "gate_proj", "up_proj", "down_proj",
    ])
    use_gradient_checkpointing: str = "unsloth"
    use_rslora: bool = True


def load_model_for_lora(
    model_name: str,
    lora_cfg: LoRAConfig,
    tokenizer_name: Optional[str] = None,
) -> tuple:
    """Load a base model with LoRA adapters ready for SFT training.
    
    Uses unsloth's FastLanguageModel for maximum throughput and VRAM efficiency.
    The base model is quantized to 4-bit NF4 if load_in_4bit is True,
    and low-rank adapter matrices are injected into the specified target modules.
    
    Args:
        model_name: HuggingFace model identifier (e.g., "meta-llama/Llama-3.1-8B-Instruct")
        lora_cfg: LoRA configuration dataclass
        tokenizer_name: Override for tokenizer; defaults to model_name
    
    Returns:
        Tuple of (model, tokenizer) ready for SFT training
    
    Raises:
        ValueError: If rank is not a positive integer or alpha <= 0
    """
    if lora_cfg.lora_rank <= 0:
        raise ValueError(f"LoRA rank must be > 0, got {lora_cfg.lora_rank}")
    if lora_cfg.lora_alpha <= 0:
        raise ValueError(f"LoRA alpha must be > 0, got {lora_cfg.lora_alpha}")

    model, tokenizer = FastLanguageModel.from_pretrained(
        model_name=model_name,
        max_seq_length=lora_cfg.max_seq_length,
        dtype=lora_cfg.dtype,
        load_in_4bit=lora_cfg.load_in_4bit,
        token=None,  # Set via HF_TOKEN env var or huggingface-cli login
    )

    model = FastLanguageModel.get_peft_model(
        model,
        r=lora_cfg.lora_rank,
        target_modules=lora_cfg.target_modules,
        lora_alpha=lora_cfg.lora_alpha,
        lora_dropout=lora_cfg.lora_dropout,
        bias="none",
        use_gradient_checkpointing=lora_cfg.use_gradient_checkpointing,
        use_rslora=lora_cfg.use_rslora,
        random_state=42,
    )

    print(f"[LoRA] Rank={lora_cfg.lora_rank}, Alpha={lora_cfg.lora_alpha}, "
          f"4bit={lora_cfg.load_in_4bit}, RLORA={lora_cfg.use_rslora}")
    trainable_params = sum(p.numel() for p in model.parameters() if p.requires_grad)
    total_params = sum(p.numel() for p in model.parameters())
    print(f"[LoRA] Trainable: {trainable_params:,} / {total_params:,} "
          f"({100 * trainable_params / total_params:.2f}%)")

    return model, tokenizer


def apply_lora_to_model(
    model_name: str,
    rank: int = 16,
    alpha: Optional[int] = None,
    target_modules: list[str] | None = None,
) -> tuple:
    """Convenience wrapper for quick LoRA setup with sensible defaults.
    
    Args:
        model_name: HuggingFace model identifier
        rank: Low-rank dimension (default 16)
        alpha: Scaling factor; defaults to 2 * rank if None
        target_modules: Layer names for adapter injection
    
    Returns:
        Tuple of (model, tokenizer) configured with LoRA adapters
    """
    effective_alpha = alpha or (rank * 2)
    modules = target_modules or [
        "q_proj", "k_proj", "v_proj", "o_proj",
        "gate_proj", "up_proj", "down_proj",
    ]

    cfg = LoRAConfig(
        lora_rank=rank,
        lora_alpha=effective_alpha,
        target_modules=modules,
    )

    return load_model_for_lora(model_name, cfg)
```

### Pattern 2: Instruction Tuning Dataset Preparation (BAD vs. GOOD)

```python
"""Dataset preparation for supervised fine-tuning with proper Alpaca-style formatting."""

from typing import Optional

from datasets import Dataset, DatasetDict
from transformers import PreTrainedTokenizer


# ❌ BAD: No separation between prompt and instruction, output contains tool calls mixed
def bad_dataset_format(tokenizer: PreTrainedTokenizer) -> Dataset:
    """Creates a poorly structured dataset that confuses the model during training."""
    raw_data = [
        {
            "text": f"Q: How do I parse JSON in Python? A: Use json.loads(). Also you can use pandas read_json.",
        },
        {
            "text": "Write a SQL query to find users who signed up last month",
        },
    ]
    return Dataset.from_list(raw_data)


# ✅ GOOD: Clear instruction/input/output structure with proper tokenization for SFT
def prepare_sft_dataset(
    raw_samples: list[dict[str, str]],
    tokenizer: PreTrainedTokenizer,
    max_length: int = 2048,
    test_split: float = 0.05,
) -> DatasetDict:
    """Convert raw instruction samples into Alpaca-formatted SFT dataset.
    
    Each sample must have 'instruction' (required), 'input' (optional context),
    and 'output' (the model's expected response). The system prompt is prepended
    to every sample during formatting.
    
    Args:
        raw_samples: List of dicts with 'instruction', optional 'input', and 'output'
        tokenizer: HuggingFace tokenizer for the target model
        max_length: Maximum sequence length; samples exceeding this are truncated
        test_split: Fraction reserved for evaluation
    
    Returns:
        DatasetDict with 'train' and 'test' splits, each containing formatted text
    
    Raises:
        ValueError: If any sample is missing 'instruction' or 'output' fields
    """
    required_fields = {"instruction", "output"}

    # Validate all samples have required fields before processing
    for i, sample in enumerate(raw_samples):
        missing = required_fields - set(sample.keys())
        if missing:
            raise ValueError(
                f"Sample {i} missing required fields: {missing}. "
                f"Has keys: {list(sample.keys())}"
            )

    # Build Alpaca-formatted text: system prompt + instruction + optional input → output
    def format_sample(sample: dict[str, str]) -> dict[str, str]:
        """Format a single sample into the instruction-tuning template.
        
        Args:
            sample: Raw sample dict with instruction, input (optional), output
        
        Returns:
            Dict with 'text' key containing the formatted training example
        """
        system_prompt = "You are a helpful AI assistant trained to follow instructions accurately."

        # Build the prompt portion from instruction and optional input
        if sample.get("input"):
            prompt = f"{sample['instruction']}\n{sample['input']}"
        else:
            prompt = sample["instruction"]

        full_text = (
            f"<|begin_of_text|>{system_prompt}\n\n"
            f"{prompt}\n\n### Response:\n{sample['output']}"
        )

        return {"text": full_text}

    formatted = [format_sample(s) for s in raw_samples]
    dataset = Dataset.from_list(formatted)

    # Tokenize the dataset
    def tokenize_fn(examples: dict[str, list]) -> dict[str, list]:
        """Tokenize text with labels matching input_ids for cross-entropy loss."""
        tokenized = tokenizer(
            examples["text"],
            truncation=True,
            max_length=max_length,
            padding=False,
        )
        # Set labels equal to input_ids so all tokens contribute to loss
        tokenized["labels"] = tokenized["input_ids"].copy()
        return tokenized

    column_names = ["text"] if "text" in dataset.column_names else None
    tokenized = dataset.map(
        tokenize_fn,
        batched=True,
        remove_columns=column_names or dataset.column_names,
    )

    # Split into train/test
    split = tokenized.train_test_split(test_size=test_split, seed=42)
    return DatasetDict({
        "train": split["train"],
        "test": split["test"],
    })


def create_synthetic_instructions(
    domain_examples: list[dict[str, str]],
    num_per_example: int = 5,
) -> list[dict[str, str]]:
    """Generate instruction-following samples from domain-specific examples.
    
    Given a small set of (context, desired_output) pairs, create variations
    with different prompt phrasings while preserving the expected response.
    
    Args:
        domain_examples: List of dicts with 'context' (domain knowledge) and 'output'
        num_per_example: Number of instruction variants per base example
    
    Returns:
        Expanded list of instruction/input/output samples ready for training
    """
    templates = [
        "Explain: {context}",
        "How would you describe: {context}",
        "In your own words, what is: {context}",
        "Summarize the following: {context}",
        "What does the following mean: {context}",
    ]

    samples = []
    for example in domain_examples:
        for i in range(num_per_example):
            template = templates[i % len(templates)]
            instruction = template.format(context=example["context"])
            samples.append({
                "instruction": instruction,
                "input": "",
                "output": example["output"],
            })

    return samples
```

### Pattern 3: DPO Training Loop Using TRL

```python
"""Direct Preference Optimization (DPO) training with the TRL library.
    
DPO replaces the two-stage RLHF pipeline (reward model + PPO) with a single
contrastive objective that directly optimizes the policy against preference pairs.

The DPO loss for a single pair (chosen, rejected) is:
    L_DPO = -log[σ(β * log(π_θ(y_c|x)/π_ref(y_c|x)) - β * log(π_θ(y_r|x)/π_ref(y_r|x)))]

where β controls the deviation from the reference model.
"""

from dataclasses import dataclass, field
from typing import Optional

import torch
from datasets import Dataset
from transformers import PreTrainedTokenizer


@dataclass
class DPOTrainingArgs:
    """Hyperparameters for DPO training.
    
    Attributes:
        beta: Temperature for DPO loss; controls how closely the model stays to reference (0.1 = conservative)
        loss_type: Type of DPO loss — 'dpo', 'ipo' (IDM), or 'orpo'
        max_length: Maximum sequence length for training examples
        max_prompt_length: Token limit for the prompt portion
        per_device_train_batch_size: Batch size per GPU
        gradient_accumulation_steps: Accumulate gradients to simulate larger batch
        learning_rate: Optimizer learning rate (typically 5e-7 to 1e-6)
        num_train_epochs: Number of full passes over the dataset
        lr_scheduler_type: Learning rate schedule — 'cosine' or 'linear' with warmup
        warmup_ratio: Fraction of training used for linear warmup
        weight_decay: L2 regularization strength (0.01 is standard)
        max_steps: Override epoch-based training; train for this many steps instead
    """
    beta: float = 0.1
    loss_type: str = "dpo"  # Options: 'dpo', 'ipo', 'orpo'
    max_length: int = 2048
    max_prompt_length: int = 1024
    per_device_train_batch_size: int = 4
    gradient_accumulation_steps: int = 4
    learning_rate: float = 5.0e-7
    num_train_epochs: int = 3
    lr_scheduler_type: str = "cosine"
    warmup_ratio: float = 0.05
    weight_decay: float = 0.01
    max_steps: int = -1  # -1 means use num_train_epochs


def prepare_preference_dataset(
    raw_pairs: list[dict],
    tokenizer: PreTrainedTokenizer,
) -> Dataset:
    """Convert raw preference pairs into DPO-compatible dataset format.
    
    Each raw pair must contain 'prompt', 'chosen' (preferred response),
    and 'rejected' (less preferred response). The prompt is the shared context.
    
    Args:
        raw_pairs: List of dicts with 'prompt', 'chosen', 'rejected' keys
        tokenizer: HuggingFace tokenizer for the target model
    
    Returns:
        Dataset with tokenized prompt, chosen, and rejected sequences
    """
    dpo_samples = []
    for pair in raw_pairs:
        prompt = pair["prompt"]
        chosen_text = f"{prompt}\n\n### Response:\n{pair['chosen']}"
        rejected_text = f"{prompt}\n\n### Response:\n{pair['rejected']}"

        dpo_samples.append({
            "prompt": prompt,
            "chosen": chosen_text,
            "rejected": rejected_text,
        })

    return Dataset.from_list(dpo_samples)


def run_dpo_training(
    model: torch.nn.Module,
    tokenizer: PreTrainedTokenizer,
    preference_dataset: Dataset,
    ref_model: torch.nn.Module | None = None,
    training_args: DPOTrainingArgs | None = None,
) -> tuple:
    """Execute DPO training loop using TRL's DPOTrainer.
    
    If ref_model is None, the current model state serves as the reference (not recommended).
    Always provide a frozen copy of the SFT checkpoint as the reference to prevent collapse.
    
    Args:
        model: The policy model with LoRA adapters attached
        tokenizer: Tokenizer for the model
        preference_dataset: Dataset with 'prompt', 'chosen', 'rejected' columns
        ref_model: Frozen reference model (must share architecture with policy)
        training_args: DPO hyperparameters; defaults to conservative settings
    
    Returns:
        Trained DPOTrainer instance with training metrics in trainer.state.log_history
    
    Raises:
        ValueError: If preference_dataset lacks required columns
    """
    from trl import DPOConfig, DPOTrainer

    if training_args is None:
        training_args = DPOTrainingArgs()

    # Validate dataset has required columns
    required_columns = {"prompt", "chosen", "rejected"}
    actual_columns = set(preference_dataset.column_names)
    missing = required_columns - actual_columns
    if missing:
        raise ValueError(f"Preference dataset missing columns: {missing}")

    dpo_config = DPOConfig(
        beta=training_args.beta,
        loss_type=training_args.loss_type,
        max_length=training_args.max_length,
        max_prompt_length=training_args.max_prompt_length,
        per_device_train_batch_size=training_args.per_device_train_batch_size,
        gradient_accumulation_steps=training_args.gradient_accumulation_steps,
        learning_rate=training_args.learning_rate,
        num_train_epochs=training_args.num_train_epochs,
        lr_scheduler_type=training_args.lr_scheduler_type,
        warmup_ratio=training_args.warmup_ratio,
        weight_decay=training_args.weight_decay,
        max_steps=training_args.max_steps if training_args.max_steps > 0 else -1,
        logging_steps=10,
        save_strategy="epoch",
        evaluation_strategy="epoch",
        output_dir="./dpo_output",
        report_to="none",
    )

    trainer = DPOTrainer(
        model=model,
        ref_model=ref_model,
        args=dpo_config,
        train_dataset=preference_dataset,
        tokenizer=tokenizer,
        max_length=training_args.max_length,
        max_prompt_length=training_args.max_prompt_length,
    )

    # Execute training
    train_result = trainer.train()
    metrics = train_result.metrics
    print(f"[DPO] Training complete. Loss: {metrics['train_loss']:.4f}")

    return trainer, metrics
```

### Pattern 4: Axolotl YAML Configuration

```yaml
# axolotl_config.yaml — Reproducible fine-tuning configuration for LLaMA-3.1 8B
# Usage: axolotl train axolotl_config.yaml

base_model: meta-llama/Llama-3.1-8B-Instruct
base_model_config: meta-llama/Llama-3.1-8B-Instruct

model_type: LlamaForCausalLM
load_in_4bit: true
tokenizer_type: Llama3TokenizerHandle

# PEFT Configuration
flash_attention: true  # Requires flash-attn package

full_finetune_module_names: []
lora_modules_to_save: [lm_head, embed_tokens]
lora_r: 16
lora_alpha: 32
lora_dropout: 0.0
lora_target_all_linear: true

# Dataset Configuration — Alpaca-style format
datasets:
  - path: tatsu-lab/alpaca-cleaned
    type: alpaca
    split: train
  - path: /data/domain_instruction_dataset.jsonl
    type: sharegpt
    fields:
      instruction: instruction
      input: input
      output: output

# Training Hyperparameters
sequence_length: 2048
num_epochs: 3
micro_batch_size: 4
gradient_accumulation_steps: 4
batch_size: 64
eval_batch_size: 8

optim: paged_adamw_8bit
learning_rate: 5.0e-7
lr_scheduler_type: cosine
warmup_ratio: 0.05
weight_decay: 0.01

# Optimization Flags
bf16: true
fp16: false
gradient_checkpointing: true

# Evaluation
val_set_size: 0.05
eval_steps: null
save_steps: null

# Output Configuration
output_dir: ./llama3-8b-lora-sft

logging_steps: 10
save_strategy: epoch
save_total_limit: 3
```

### Pattern 5: Evaluation Script for Benchmark Suite

```python
"""Evaluation script that runs standard benchmarks against a fine-tuned model.
    
Runs three benchmark suites: MMLU (knowledge), GSM8K (math reasoning), and
HumanEval (code generation). Compares scores against baseline to verify the
fine-tuning actually improved capabilities rather than degrading them.
"""

from typing import Optional

import torch
from datasets import load_dataset


class FineTunedModelEvaluator:
    """Evaluate fine-tuned LLMs across standardized benchmarks.
    
    Attributes:
        model: The trained model (with merged adapters or active LoRA)
        tokenizer: Matching tokenizer
        device: Torch device string ('cuda', 'cpu', etc.)
    """

    def __init__(
        self,
        model: torch.nn.Module,
        tokenizer,
        device: str = "cuda",
    ) -> None:
        self.model = model.to(device)
        self.tokenizer = tokenizer
        self.device = device
        self.model.eval()

    @torch.no_grad()
    def evaluate_mmlu(
        self,
        num_fewshot: int = 5,
        batch_size: int = 4,
    ) -> dict[str, float]:
        """Evaluate on MMLU (Massive Multitask Language Understanding).
        
        Measures knowledge across 57 subjects including STEM, humanities,
        social sciences, and professional fields. Returns per-subject and
        macro-averaged accuracy.
        
        Args:
            num_fewshot: Number of demonstration examples in prompt context
            batch_size: Processing batch size for throughput
        
        Returns:
            Dict with 'overall' (macro avg) and per-subject accuracy scores
        """
        from lm_eval import simple_evaluate

        results = simple_evaluate(
            model="hf",
            model_args={
                "pretrained": self.model,
                "tokenizer": self.tokenizer,
                "dtype": "bfloat16" if torch.cuda.is_available() else "float32",
            },
            tasks=["mmlu"],
            num_fewshot=num_fewshot,
            batch_size=batch_size,
            device=self.device,
            log_samples=False,
        )

        mmlu_results = results["results"]["mmlu"]
        overall_acc = mmlu_results["acc,none"]
        subject_accs = mmlu_results.get("acc_per_section,none") or {}

        print(f"[MMLU] Overall accuracy: {overall_acc:.4f}")
        if subject_accs:
            for subject in sorted(subject_accs.keys()):
                print(f"  {subject:30s}: {subject_accs[subject]:.4f}")

        return {"overall": overall_acc, "per_subject": subject_accs}

    @torch.no_grad()
    def evaluate_gsm8k(
        self,
        num_fewshot: int = 8,
        batch_size: int = 4,
    ) -> dict[str, float]:
        """Evaluate on GSM8K (Grade School Math Word Problem dataset).
        
        Tests multi-step mathematical reasoning. The model receives a math
        word problem and must produce the correct numerical answer. Uses
        exact match against ground truth answers.
        
        Args:
            num_fewshot: Demonstration examples in context (8 is standard)
            batch_size: Processing batch size
        
        Returns:
            Dict with 'exact_match' accuracy score
        """
        dataset = load_dataset("gsm8k", "main", split="test")

        correct = 0
        total = len(dataset)

        # Extract ground truth answers using regex
        import re
        def extract_answer(text: str) -> Optional[str]:
            match = re.search(r"####\s*(\-?\d+\.?\d*)", text)
            return match.group(1) if match else None

        for sample in dataset.select(range(0, min(total, 1000))):
            prompt = f"Question: {sample['question']}\nAnswer:"
            inputs = self.tokenizer(prompt, return_tensors="pt").to(self.device)
            output_ids = self.model.generate(
                **inputs,
                max_new_tokens=256,
                do_sample=False,
                temperature=0.0,
            )

            generated = self.tokenizer.decode(output_ids[0], skip_special_tokens=True)
            predicted_answer = extract_answer(generated)
            ground_truth = extract_answer(sample["answer"])

            if predicted_answer == ground_truth:
                correct += 1

        accuracy = correct / max(total, 1)
        print(f"[GSM8K] Exact match: {correct}/{total} = {accuracy:.4f}")

        return {"exact_match": accuracy}

    @torch.no_grad()
    def evaluate_humaneval(
        self,
        num_samples_per_task: int = 20,
        temperature: float = 0.2,
    ) -> dict[str, float]:
        """Evaluate on HumanEval (coding ability benchmark).
        
        Tests the model's ability to generate correct Python functions from
        docstrings. Uses pass@k metric against unit test cases provided
        in the dataset.
        
        Args:
            num_samples_per_task: How many solutions to sample per problem
            temperature: Sampling temperature for code generation
        
        Returns:
            Dict with 'pass_at_1' and 'pass_at_20' scores
        """
        from humaneval import evaluate_functional_correctness

        # Load model's generate function compatible with HumanEval
        def generate_solution(prompt: str) -> list[str]:
            """Generate multiple code completions for a given prompt."""
            solutions = []
            inputs = self.tokenizer(prompt, return_tensors="pt").to(self.device)

            for _ in range(num_samples_per_task):
                output_ids = self.model.generate(
                    **inputs,
                    max_new_tokens=512,
                    do_sample=True,
                    temperature=temperature,
                    top_p=0.95,
                    pad_token_id=self.tokenizer.eos_token_id,
                )
                code = self.tokenizer.decode(
                    output_ids[0][inputs.input_ids.shape[1]:],
                    skip_special_tokens=True,
                )
                solutions.append(code)

            return solutions

        # HumanEval expects a callable that takes prompts and returns completions
        test_data = load_dataset("openai_humaneval")["test"]
        prompts = [self._format_humaneval_prompt(sample) for sample in test_data]

        results = evaluate_functional_correctness(
            samples_fn=lambda: generate_solution(prompts[0]) if False else None,
            test_data=test_data.tolist(),
            include_coverage=False,
        )

        print(f"[HumanEval] pass@1:  {results['pass@1']:.4f}")
        print(f"[HumanEval] pass@10: {results.get('pass@10', 'N/A')}")
        print(f"[HumanEval] pass@20: {results.get('pass@20', 'N/A')}")

        return {
            "pass_at_1": results["pass@1"],
            "pass_at_20": results.get("pass@20"),
        }

    @staticmethod
    def _format_humaneval_prompt(sample: dict) -> str:
        """Format a HumanEval problem into a generation prompt.
        
        Args:
            sample: Dict with 'prompt' (function signature + docstring) and 'test'
        
        Returns:
            Prompt string for code completion
        """
        return sample["prompt"]

    @torch.no_grad()
    def run_full_benchmark_suite(
        self,
        baseline_scores: Optional[dict[str, float]] = None,
    ) -> dict[str, dict[str, float]]:
        """Run all benchmarks and optionally compare against baseline scores.
        
        Args:
            baseline_scores: Dict mapping benchmark names to base model scores
        
        Returns:
            Nested dict: {benchmark_name: {metric: score}} for all benchmarks
        """
        results = {}

        print("\n" + "=" * 60)
        print("Running MMLU Evaluation (5-shot)")
        print("=" * 60)
        results["mmlu"] = self.evaluate_mmlu(num_fewshot=5)

        print("\n" + "=" * 60)
        print("Running GSM8K Evaluation (8-shot)")
        print("=" * 60)
        results["gsm8k"] = self.evaluate_gsm8k(num_fewshot=8)

        print("\n" + "=" * 60)
        print("Running HumanEval Evaluation (pass@1, pass@20)")
        print("=" * 60)
        results["humaneval"] = self.evaluate_humaneval()

        # Print comparison summary if baseline provided
        if baseline_scores:
            print("\n" + "=" * 60)
            print("COMPARISON vs BASELINE")
            print("=" * 60)
            for bench, score in results.items():
                overall = score.get("overall", score.get("exact_match", score.get("pass_at_1")))
                baseline = baseline_scores.get(bench)
                if baseline is not None and overall is not None:
                    delta = (overall - baseline) * 100
                    direction = "+" if delta > 0 else ""
                    print(f"  {bench:12s}: {baseline:.4f} → {overall:.4f} ({direction}{delta:.2f}%)")

        return results


def detect_overfitting(
    train_loss_history: list[float],
    eval_loss_history: list[float],
    threshold: float = 0.15,
) -> dict:
    """Detect overfitting by analyzing the gap between train and eval loss.
    
    Overfitting manifests as a growing divergence between training loss (decreasing)
    and evaluation loss (increasing). This function computes the gap trend and flags
    epochs where overfitting is detected.
    
    Args:
        train_loss_history: Per-epoch average training loss values
        eval_loss_history: Per-epoch average evaluation loss values
        threshold: Maximum acceptable train/eval loss gap before flagging
    
    Returns:
        Dict with 'overfitted' (bool), 'max_gap', 'gap_trend', and 'flagged_epochs'
    """
    if len(train_loss_history) != len(eval_loss_history):
        raise ValueError(
            f"Train ({len(train_loss_history)}) and eval ({len(eval_loss_history)}) "
            "loss histories must have the same length"
        )

    gaps = [
        e - t for t, e in zip(train_loss_history, eval_loss_history)
    ]
    max_gap = max(gaps) if gaps else 0.0

    # Compute gap trend: positive means gap is widening (overfitting)
    if len(gaps) >= 3:
        recent_gaps = gaps[-3:]
        gap_trend = "widening" if all(
            recent_gaps[i] < recent_gaps[i + 1] for i in range(len(recent_gaps) - 1)
        ) else "stable"
    else:
        gap_trend = "insufficient_data"

    flagged_epochs = [
        i for i, g in enumerate(gaps) if g > threshold
    ]

    return {
        "overfitted": max_gap > threshold and gap_trend == "widening",
        "max_gap": max_gap,
        "gap_trend": gap_trend,
        "flagged_epochs": flagged_epochs,
    }
```

---

## Training Frameworks Comparison

| Framework   | Best For                  | Configuration     | Key Feature                          |
|-------------|---------------------------|-------------------|--------------------------------------|
| **unsloth** | Speed and VRAM efficiency | Python API        | 2x faster training, 60% less VRAM    |
| **axolotl** | Reproducibility           | YAML config       | Single-file configs for full pipeline |
| **TRL**     | DPO/RLHF alignment        | Python API        | HuggingFace's official RL library    |
| **LLaMA-Factory** | Quick experimentation | Web UI + CLI      | No-code fine-tuning, multiple backends |

---

## Constraints

### MUST DO
- Always freeze the base model parameters before injecting LoRA adapters (only adapter weights should be trainable)
- Use `alpha = 2 * rank` as the default LoRA scaling factor unless ablation shows otherwise
- Provide a frozen reference model (`ref_model`) for DPO training to prevent reward hacking and distribution collapse
- Monitor the train/eval loss gap — flag overfitting when eval loss rises while train loss continues to fall
- Use gradient accumulation to simulate larger batch sizes without exceeding VRAM limits
- Set `use_rslora=True` for rank-stabilized LoRA (alpha is normalized by rank, allowing consistent alpha across ranks)
- Save the SFT checkpoint before starting DPO — DPO must compare against the fine-tuned policy, not the base model
- Tokenize with `labels = input_ids` for SFT so every token contributes to cross-entropy loss (do NOT mask instruction tokens)

### MUST NOT DO
- Fine-tune without a held-out evaluation set — you cannot detect overfitting or measure real improvement
- Set LoRA rank above 128 for most tasks — diminishing returns begin at r=64, and trainable parameters grow quadratically
- Use the same model as both policy and reference in DPO — this causes distribution collapse within 1–2 epochs
- Train on data that contains evaluation benchmarks (MMLU, GSM8K) in any form — this is test-set contamination
- Merge LoRA adapters before quantization for deployment — merge first, then quantize to avoid accumulating quantization errors
- Use `fp16` training when BF16 is available on your GPU — FP16 loses precision in the gradient range needed for transformer training
- Disable gradient checkpointing on models > 7B parameters — you will OOM before the first epoch completes

---

## VRAM Budget Calculator

Use this formula to estimate VRAM requirements:

```
Total_VRAM ≈ Model_Weights + Optimizer_States + Gradients + Activations + Overhead

Full FT (BF16):     2 × params × 2 bytes + 4 × params × 4 bytes (AdamW) + activations
LoRA (r=16):        Base model frozen + trainable ≈ params × r × 2 × (2 layers) × 2 bytes

For 7B model with LoRA r=16:
  Trainable params ≈ 7B × 16 × 2 × 3 (target modules) × 2 bytes ≈ ~3.4 GB for adapters alone
  Base model at NF4 ≈ ~4 GB
  Total training ≈ 16–20 GB VRAM (with gradient accumulation and checkpointing)
```

---

## Output Template

When designing or reviewing an LLM fine-tuning pipeline, produce:

1. **Hardware Assessment** — Available GPU memory, model size selection, PEFT method choice with justification
2. **Configuration Summary** — LoRA rank, alpha, target modules, quantization bits, training hyperparameters
3. **Dataset Statistics** — Number of samples, train/test split ratio, domain distribution, format used
4. **Training Plan** — Learning rate, batch size (effective via accumulation), epochs/steps, warmup strategy
5. **Evaluation Plan** — Benchmark suite to run, baseline scores for comparison, overfitting detection criteria
6. **Deployment Path** — Merge vs. adapter serving, quantization target, inference framework (vLLM recommended)

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `coding-ds-hyperparameter-tuning` | Broader ML hyperparameter optimization beyond fine-tuning-specific settings |
| `coding-performance-optimization` | General performance optimization including vLLM serving, KV-cache tuning, batching |
| `coding-prompt-engineering` | Alternative to fine-tuning — when prompt engineering or RAG can solve the problem without training |

---

## Live References

> Authoritative documentation links for LLM fine-tuning as of 2026. The model follows markdown links at load time to resolve external references and inline content.

- [Unsloth Documentation](https://docs.unsloth.ai/) — Fastest open-source fine-tuning framework with flash-attention and memory optimization
- [TRL (Transformer Reinforcement Learning)](https://huggingface.co/docs/trl) — HuggingFace's library for DPO, SFT, PPO, and preference optimization
- [Axolotl Fine-Tuning Framework](https://axolotl-ai-cloud.github.io/axolotl/) — YAML-configured fine-tuning for reproducibility across runs
- [bitsandbytes Quantization](https://github.com/TimDettmers/bitsandbytes) — 4-bit NF4 and 8-bit quantization backend for QLoRA
- [vLLM Serving Engine](https://docs.vllm.ai/en/latest/) — High-throughput LLM serving with continuous batching and PagedAttention
- [HuggingFace PEFT Library](https://huggingface.co/docs/peft) — Parameter-efficient fine-tuning abstractions (LoRA, AdaLoRA, DoRA, IA³)
- [lm-evaluation-harness](https://github.com/EleutherAI/lm-evaluation-harness) — Standardized benchmark evaluation suite for MMLU, GSM8K, and more
