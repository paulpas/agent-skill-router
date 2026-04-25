# Real LLM API Benchmarking Guide

This guide explains how to use the updated benchmarking system with **real LLM API calls** instead of simulations.

## Table of Contents

- [Quick Start](#quick-start)
- [Available Models](#available-models)
- [Setup & Configuration](#setup--configuration)
- [Running Benchmarks](#running-benchmarks)
- [Model Selection](#model-selection)
- [Cost Analysis](#cost-analysis)
- [Comparing Models](#comparing-models)
- [Real vs. Simulated](#real-vs-simulated)
- [Troubleshooting](#troubleshooting)

## Quick Start

### 1. List All Available Models

```bash
cd benchmarks

# Show all models (with pricing)
python3 harness/benchmark.py --list-models

# Show only models you can use right now
python3 harness/benchmark.py --list-configured

# Show cost comparison
python3 harness/benchmark.py --show-costs
```

### 2. Run Benchmarks with Local Model (Free)

```bash
# Use free local Ollama model (no API key needed!)
python3 harness/benchmark.py --tier simple --with-llm --model codellama

# Or use different Ollama model
python3 harness/benchmark.py --tier simple --with-llm --model llama3
```

### 3. Run Benchmarks with OpenAI (Requires API Key)

```bash
# Set your OpenAI API key
export OPENAI_API_KEY="sk-..."

# Run with GPT-4
python3 harness/benchmark.py --tier simple --with-llm --model gpt-4

# Or use cheaper GPT-3.5
python3 harness/benchmark.py --tier simple --with-llm --model gpt-3.5-turbo
```

### 4. Interactive Model Selection

```bash
# Let the system guide you
python3 harness/benchmark.py --tier simple --with-llm --interactive
```

## Available Models

### OpenAI Models

| Model | Cost | Context | Speed | Quality |
|-------|------|---------|-------|---------|
| gpt-4o | $5/$15 per 1M | 128K | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| gpt-4-turbo | $10/$30 per 1M | 128K | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| gpt-4 | $30/$60 per 1M | 8K | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| gpt-3.5-turbo | $0.5/$1.5 per 1M | 16K | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |

**Recommended:** Start with `gpt-4o` (best balance of speed, quality, and cost)

### Anthropic Models

| Model | Cost | Context | Speed | Quality |
|-------|------|---------|-------|---------|
| claude-3-5-sonnet | $3/$15 per 1M | 200K | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| claude-3-opus | $15/$75 per 1M | 200K | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| claude-3-haiku | $0.25/$1.25 per 1M | 200K | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |

**Recommended:** Start with `claude-3-5-sonnet`

### Groq Models (Very Fast)

| Model | Cost | Context | Speed | Quality |
|-------|------|---------|-------|---------|
| mixtral-8x7b | $0.27/$0.81 per 1M | 32K | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| llama3-70b-8192 | $0.59/$0.79 per 1M | 8K | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |

**Recommended:** Best for speed + cost

### Ollama Models (Local, Free)

| Model | Cost | Speed | Notes |
|-------|------|-------|-------|
| llama3 | FREE | ⭐⭐⭐⭐ | Balanced performance |
| codellama | FREE | ⭐⭐⭐ | Best for code generation |
| mistral | FREE | ⭐⭐⭐⭐ | Good all-rounder |
| gemma | FREE | ⭐⭐⭐ | Lightweight |

**Recommended:** Use `llama3` or `codellama` (no API key needed!)

## Setup & Configuration

### Option 1: No Setup (Use Local Ollama)

```bash
# No API key needed! Models are free and local.
python3 harness/benchmark.py --tier simple --with-llm --model llama3
```

### Option 2: OpenAI

```bash
# 1. Get API key from https://platform.openai.com/api-keys
# 2. Set environment variable
export OPENAI_API_KEY="sk-your-api-key-here"

# 3. Verify it works
python3 harness/benchmark.py --list-configured | grep gpt

# 4. Run benchmark
python3 harness/benchmark.py --tier simple --with-llm --model gpt-4
```

### Option 3: Anthropic

```bash
# 1. Get API key from https://console.anthropic.com/account/keys
# 2. Set environment variable
export ANTHROPIC_API_KEY="sk-ant-your-api-key-here"

# 3. Verify it works
python3 harness/benchmark.py --list-configured | grep claude

# 4. Run benchmark
python3 harness/benchmark.py --tier simple --with-llm --model claude-3-opus
```

### Option 4: Groq

```bash
# 1. Get API key from https://console.groq.com/keys
# 2. Set environment variable
export GROQ_API_KEY="your-groq-api-key-here"

# 3. Verify it works
python3 harness/benchmark.py --list-configured | grep mixtral

# 4. Run benchmark
python3 harness/benchmark.py --tier simple --with-llm --model mixtral-8x7b
```

### Persistent Configuration

Add to `~/.bash_profile` or `~/.bashrc`:

```bash
export OPENAI_API_KEY="sk-..."
export ANTHROPIC_API_KEY="sk-ant-..."
export GROQ_API_KEY="..."
```

Then reload:
```bash
source ~/.bash_profile
```

## Running Benchmarks

### Basic Commands

```bash
# Run simple tier with GPT-4
python3 harness/benchmark.py --tier simple --with-llm --model gpt-4

# Run all tiers
python3 harness/benchmark.py --tier all --with-llm --model gpt-4

# Run single exercise
python3 harness/benchmark.py --exercise "Code Review Basic" --with-llm --model gpt-4

# Verbose output (show details for each exercise)
python3 harness/benchmark.py --tier simple --with-llm --model gpt-4 --verbose

# More iterations for stability (default: 3)
python3 harness/benchmark.py --tier simple --with-llm --model gpt-4 --iterations 5

# Save results to custom file
python3 harness/benchmark.py --tier simple --with-llm --model gpt-4 \
  --output results/bench-gpt4-2024.json
```

### Advanced Commands

```bash
# Run with warmup runs (prepare system before measuring)
python3 harness/benchmark.py --tier simple --with-llm --model gpt-4 \
  --warmup 2 --iterations 5

# Compare multiple models in one run
python3 harness/benchmark.py --tier simple --with-llm \
  --models gpt-4,gpt-3.5-turbo,claude-3-opus,mixtral-8x7b

# Interactive model selection
python3 harness/benchmark.py --tier simple --with-llm --interactive

# Save with timestamp
python3 harness/benchmark.py --tier simple --with-llm --model gpt-4 \
  --output "results/bench-$(date +%Y-%m-%d-%H%M%S).json"
```

## Model Selection

### Choose Based on Your Priority

**Best Quality:**
```bash
python3 harness/benchmark.py --tier simple --with-llm --model gpt-4o
```

**Best Speed:**
```bash
python3 harness/benchmark.py --tier simple --with-llm --model mixtral-8x7b
```

**Best Cost:**
```bash
python3 harness/benchmark.py --tier simple --with-llm --model gpt-3.5-turbo
```

**Free (Local):**
```bash
python3 harness/benchmark.py --tier simple --with-llm --model llama3
```

**Best Balance:**
```bash
python3 harness/benchmark.py --tier simple --with-llm --model gpt-4o
# or
python3 harness/benchmark.py --tier simple --with-llm --model claude-3-5-sonnet
```

### Interactive Selection

```bash
python3 harness/benchmark.py --tier simple --with-llm --interactive

# Output:
# Available Models (with configured API keys):
#   1) gpt-4 ($30/$60 per 1K tokens)
#   2) gpt-3.5-turbo ($0.5/$1.5 per 1K tokens)
#   3) claude-3-opus ($15/$75 per 1K tokens)
#   4) mixtral-8x7b ($0.27/$0.81 per 1K tokens)
#   5) codellama (Local, $0)
#
# Select model (1-5): 1
#
# Running benchmarks with gpt-4...
```

## Cost Analysis

### Estimate Costs Before Running

```bash
# Show cost comparison table
python3 harness/benchmark.py --show-costs

# Output shows cost for:
# - Simple tier (9 exercises): ~$X per run
# - Medium tier (9 exercises): ~$Y per run
# - Heavy tier (6 exercises): ~$Z per run
```

### Calculate Total Cost

```bash
# Example: Simple tier with gpt-4

# Typical tokens per exercise: 2,500
# Exercises in simple tier: 9
# Total tokens: 22,500

# GPT-4 pricing: $30/1M input, $60/1M output
# Assuming 75% prompt, 25% response:
# - Prompt tokens: 16,875 × ($30/1M) = $0.506
# - Response tokens: 5,625 × ($60/1M) = $0.338
# Total: ~$0.84 per simple tier run
```

### Monthly Projections

```bash
# If you run benchmarks 5 times per week:
# - Simple tier only: $0.84 × 5 × 4.3 weeks = ~$18/month
# - All tiers: $2.50 × 5 × 4.3 weeks = ~$54/month
#
# Using cheaper models:
# - gpt-3.5-turbo: $0.05 × 5 × 4.3 weeks = ~$1/month
# - mixtral-8x7b: $0.06 × 5 × 4.3 weeks = ~$1/month
# - Free (Ollama): $0/month!
```

## Comparing Models

### Side-by-Side Comparison

```bash
# Run with all models you want to compare
python3 harness/benchmark.py --tier simple --with-llm \
  --models gpt-4,gpt-4o,claude-3-opus,mixtral-8x7b,codellama

# Results saved to:
# - benchmarks/results/latest-results.json (individual runs)
# - benchmarks/results/model-comparison.json (comparison)

# View comparison
python3 -m json.tool < results/model-comparison.json
```

### Compare Quality vs Cost

```bash
# Run one benchmark with each model
models=(gpt-4 gpt-3.5-turbo claude-3-opus mixtral-8x7b)

for model in "${models[@]}"; do
  echo "Testing $model..."
  python3 harness/benchmark.py --tier simple --with-llm --model "$model" \
    --output "results/bench-$model.json"
done

# Then analyze results
python3 -c "
import json
import os

results = {}
for f in os.listdir('results'):
    if f.startswith('bench-') and f.endswith('.json'):
        with open(f'results/{f}') as fp:
            model = f.replace('bench-', '').replace('.json', '')
            data = json.load(fp)
            summary = data.get('summary', {})
            results[model] = {
                'accuracy': summary.get('overall_accuracy', 0),
                'speed_ms': summary.get('avg_time_with_router_ms', 0),
                'cost_usd': summary.get('total_cost_usd', 0),
            }

# Print comparison table
print(f\"{'Model':<20} {'Accuracy':<12} {'Speed (ms)':<12} {'Cost':<12}\")
print('-' * 56)
for model, metrics in sorted(results.items()):
    print(f\"{model:<20} {metrics['accuracy']*100:>10.1f}% {metrics['speed_ms']:>11.1f} ${metrics['cost_usd']:>11.2f}\")
"
```

## Real vs. Simulated

### Key Differences

| Aspect | Simulated | Real API Calls |
|--------|-----------|----------------|
| **API Requests** | None (mocked) | Real to LLM APIs |
| **Cost** | $0 | Actual charges |
| **Code Quality** | Pre-determined | Actual LLM output |
| **Variance** | None | Natural (LLM varies) |
| **Speed** | <1ms | 1-30 seconds |
| **Realism** | Limited | High |
| **Setup** | None | API key needed |

### When to Use Each

**Use Real API Calls When:**
- Measuring actual costs and token usage
- Evaluating code quality
- Preparing for production deployment
- Comparing different models fairly
- Understanding true performance characteristics

**Use Simulated When:**
- Rapid development/iteration
- Testing benchmark harness itself
- No API keys available
- Evaluating router changes (not LLM changes)
- Quick smoke tests

## Troubleshooting

### Missing API Key

```
Error: OPENAI_API_KEY environment variable not set
```

**Solution:**
```bash
export OPENAI_API_KEY="sk-..."
python3 harness/benchmark.py --list-configured  # Verify it works
```

### API Rate Limiting

If you get rate limit errors, the system will automatically retry with exponential backoff. For high-volume runs, consider:

```bash
# Use cheaper model
--model gpt-3.5-turbo

# Reduce iterations
--iterations 1

# Run one tier at a time
--tier simple
```

### Timeout Errors

```
Error: API request timed out
```

**Solution:**
```bash
# Increase timeout
--timeout 120  # 2 minutes instead of 30 seconds
```

### Connection Errors

```
Error: Failed to connect to API
```

**Solution:**
- Check internet connection
- Verify API key is correct
- Check if API service is down
- Try a different model/provider

### Ollama Not Running

```
Error: Ollama error (is it running on http://localhost:11434?)
```

**Solution:**
```bash
# Install Ollama (macOS/Linux)
curl -fsSL https://ollama.ai/install.sh | sh

# Start Ollama service
ollama serve

# In another terminal, pull a model
ollama pull llama3

# Now run benchmarks
python3 harness/benchmark.py --tier simple --with-llm --model llama3
```

## Next Steps

1. **Choose a Model:**
   ```bash
   python3 harness/benchmark.py --list-configured
   ```

2. **Run a Quick Test:**
   ```bash
   python3 harness/benchmark.py --tier simple --with-llm --model <your-model>
   ```

3. **Review Results:**
   ```bash
   cat results/latest-results.json | python3 -m json.tool
   ```

4. **Compare Models:**
   ```bash
   python3 harness/benchmark.py --tier simple --with-llm \
     --models model1,model2,model3
   ```

5. **Save Baseline:**
   ```bash
   cp results/latest-results.json results/baseline-$(date +%Y-%m-%d).json
   ```

---

**Questions?** Run `--help` for full command documentation:
```bash
python3 harness/benchmark.py --help
```
