# Benchmark Results

This directory contains benchmark result files for the agent-skill-router.

## Files

- **latest-results.json** — Most recent benchmark run
- **baseline-v1.0.json** — Baseline results for version 1.0 (create after first run)
- **history.csv** — Historical metrics tracking over time (optional)

## Usage

### View Latest Results

```bash
cat latest-results.json | python3 -m json.tool
```

### Compare with Baseline

```bash
python3 ../harness/comparison.py \
  --current latest-results.json \
  --baseline baseline-v1.0.json
```

### Create a Baseline

After your first full benchmark run, save it as a baseline:

```bash
cp latest-results.json baseline-v1.0.json
git add baseline-v1.0.json
git commit -m "benchmark: establish baseline for v1.0"
```

## Results Structure

Each results file contains:

```json
{
  "timestamp": "ISO 8601 timestamp",
  "duration_seconds": "Total runtime",
  "environment": {
    "python_version": "Version info",
    "platform": "OS platform",
    "machine": "CPU architecture"
  },
  "summary": {
    "total_exercises": "Number of exercises run",
    "overall_accuracy": "% correct skill selections (0-1)",
    "avg_overhead_ms": "Average additional latency from router",
    "avg_router_latency_ms": "Pure router search + ranking time",
    "avg_precision": "Correct / all selected (0-1)",
    "avg_recall": "Correct selected / expected (0-1)",
    "duration_seconds": "Total runtime"
  },
  "tiers": {
    "simple": { /* metrics for simple tier */ },
    "medium": { /* metrics for medium tier */ },
    "heavy": { /* metrics for heavy tier */ }
  }
}
```

## Key Metrics

| Metric | Range | Good | Acceptable | Poor |
|--------|-------|------|------------|------|
| **Overall Accuracy** | 0-1 | ≥0.95 | 0.90-0.95 | <0.90 |
| **Overhead (ms)** | 0+ | <50 | <150 | >300 |
| **Router Latency (ms)** | 0+ | <30 | <100 | >200 |
| **Precision** | 0-1 | ≥0.95 | ≥0.90 | <0.90 |
| **Recall** | 0-1 | ≥0.95 | ≥0.90 | <0.90 |

## Historical Tracking

To track metrics over time, create a CSV file:

```bash
# Extract key metrics to CSV
python3 -c "
import json
from datetime import datetime

with open('latest-results.json') as f:
    results = json.load(f)

date = datetime.fromisoformat(results['timestamp']).strftime('%Y-%m-%d')
metrics = {
    'date': date,
    'accuracy': results['summary']['overall_accuracy'],
    'overhead_ms': results['summary']['avg_overhead_ms'],
    'router_latency_ms': results['summary']['avg_router_latency_ms'],
}

# Append to history.csv
with open('history.csv', 'a') as f:
    if f.tell() == 0:
        f.write(','.join(metrics.keys()) + '\n')
    f.write(','.join(str(v) for v in metrics.values()) + '\n')
"

cat history.csv
```

## Regression Detection

Alert if accuracy drops > 5%:

```bash
python3 -c "
import json

with open('latest-results.json') as f:
    current = json.load(f)
with open('baseline-v1.0.json') as f:
    baseline = json.load(f)

current_acc = current['summary']['overall_accuracy']
baseline_acc = baseline['summary']['overall_accuracy']
delta = (baseline_acc - current_acc) * 100

if delta > 5.0:
    print(f'⚠️  REGRESSION: Accuracy dropped {delta:.1f}%')
    exit(1)
else:
    print(f'✅ OK: Accuracy change {delta:+.1f}%')
"
```

---

**Note:** Benchmark results depend on system conditions. For fair comparison:
- Run on same hardware
- Control system load
- Use same iteration count
- Document any methodological differences
