# Agent-Skill-Router Benchmarking System

A comprehensive benchmarking suite for measuring the performance, accuracy, and overhead of the agent-skill-router MCP (Model Context Protocol). This system enables quantitative assessment of routing decisions across different complexity levels.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Three-Tier Exercise Framework](#three-tier-exercise-framework)
- [Running Benchmarks](#running-benchmarks)
- [Understanding Results](#understanding-results)
- [Interpreting Metrics](#interpreting-metrics)
- [Historical Tracking](#historical-tracking)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

---

## Overview

### Purpose

The agent-skill-router is designed to automatically match user tasks to the most relevant skills, improving:

1. **Developer Efficiency** — Skills loaded automatically without manual `/skill` commands
2. **Context Relevance** — Optimal skills selected for each conversation
3. **Resource Utilization** — Reduced context window waste from irrelevant skills

This benchmarking system measures whether the router delivers on these promises by tracking:

- **Routing Accuracy** — Does the router select the correct skills?
- **Performance Overhead** — What's the cost of automatic routing vs. baseline?
- **Skill Selection Speed** — How fast can the router rank and select?
- **Scale Behavior** — Does performance degrade with 100+ skills?

### Key Metrics

| Metric | Measures | Threshold |
|--------|----------|-----------|
| **Routing Accuracy** | % correct skills selected | ≥95% |
| **Response Overhead** | Additional latency from routing | <100ms typical, <500ms heavy |
| **Skill Count Accuracy** | Expected vs. actual skills selected | ±1 skill acceptable |
| **Router Latency** | Time to search + rank skills | <50ms for simple, <200ms for heavy |
| **Token Usage Delta** | Additional tokens from loading router + extra skills | <5% increase |
| **Cache Hit Rate** | % of repeated queries hitting cache | ≥70% for cached queries |

---

## Quick Start

### Prerequisites

```bash
cd /home/paulpas/git/agent-skill-router

# Verify benchmarks directory exists
ls -la benchmarks/
```

### Run All Benchmarks

```bash
# Run all exercises (simple + medium + heavy)
python3 benchmarks/harness/benchmark.py --tier all --verbose

# Run just simple tier (fastest, ~2 minutes)
python3 benchmarks/harness/benchmark.py --tier simple

# Run specific exercise
python3 benchmarks/harness/benchmark.py --exercise "Code Review Basic"

# Save results with timestamp
python3 benchmarks/harness/benchmark.py --tier all --output results/bench-2024-01-15.json
```

### View Results

```bash
# Latest results (automatically created after run)
cat benchmarks/results/latest-results.json | python3 -m json.tool

# Compare with previous run
python3 benchmarks/harness/comparison.py --current latest-results.json --previous previous-results.json

# Generate summary report
python3 benchmarks/harness/comparison.py --summarize
```

### Output Example

```
╔════════════════════════════════════════════════════════════════╗
║            AGENT-SKILL-ROUTER BENCHMARK RESULTS                ║
╠════════════════════════════════════════════════════════════════╣
║ Tier: SIMPLE (9 exercises, 1-3 skills per task)                ║
║ Total Runtime: 2m 34s                                          ║
╠════════════════════════════════════════════════════════════════╣
║ ROUTING ACCURACY:          95.2% (8.57/9 exercises)            ║
║ AVG LATENCY OVERHEAD:      28ms (4.8%)                         ║
║ SKILL COUNT ACCURACY:      100% (0.0% deviation)               ║
║ ROUTER LATENCY:            23ms avg, 45ms P99                  ║
╠════════════════════════════════════════════════════════════════╣
║ VERDICT: ✅ PASS - Router adds minimal overhead with high      ║
║          accuracy. Suitable for production use.                ║
╚════════════════════════════════════════════════════════════════╝
```

---

## Three-Tier Exercise Framework

The benchmark suite includes **24 exercises** across three tiers, each designed to test different aspects of router performance.

### Tier 1: SIMPLE (9 exercises, 1-3 skills each)

**Purpose:** Measure baseline router performance with minimal complexity. These exercises test the router's ability to select single skills or simple 2-3 skill combinations with clear signal.

**Characteristics:**
- Single topic or tight coupling (1-3 skills)
- Short, unambiguous task descriptions
- Expected routing paths: 1 per exercise
- No interdependencies between skills
- **Typical runtime:** <30 seconds total

**Exercises:**

1. **Code Review Basic** (1 skill)
   - Task: "Review this function for code quality issues"
   - Expected: `coding-code-review`
   - Complexity: Straightforward skill match

2. **Git Branching Strategy** (1 skill)
   - Task: "Help me design a git workflow for a team of 5"
   - Expected: `coding-git-branching-strategies`
   - Complexity: Domain-specific terminology match

3. **Security Check** (1 skill)
   - Task: "Check this code for security vulnerabilities"
   - Expected: `coding-security-review`
   - Complexity: Security-focused language

4. **Version Bump** (1 skill)
   - Task: "How do I bump the version for a release?"
   - Expected: `coding-semver-automation`
   - Complexity: Semantic versioning

5. **CVE Scanning** (1 skill)
   - Task: "Scan dependencies for known vulnerabilities"
   - Expected: `coding-cve-dependency-management`
   - Complexity: Dependency management focus

6. **Code Quality + Refactoring** (2 skills)
   - Task: "Review code quality and refactor with git best practices"
   - Expected: `coding-code-quality-policies`, `coding-git-advanced`
   - Complexity: Multi-skill coordination

7. **Architecture Decision** (1 skill)
   - Task: "Design the architecture for a new microservice"
   - Expected: `coding-architectural-patterns`
   - Complexity: High-level design talk

8. **Git Rebase Workflow** (1 skill)
   - Task: "Explain interactive rebase and when to use it"
   - Expected: `coding-git-advanced`
   - Complexity: Advanced git features

9. **Quality + Branching** (2 skills)
   - Task: "Establish code quality standards and git workflow"
   - Expected: `coding-code-quality-policies`, `coding-git-branching-strategies`
   - Complexity: Process-oriented

**Expected Results:**
- Routing Accuracy: 95%+
- Overhead: 10-40ms
- Skill Count Accuracy: 100%

---

### Tier 2: MEDIUM (9 exercises, 3-6 skills each)

**Purpose:** Test router performance under moderate complexity with overlapping skill domains and interdependencies. These exercises require the router to disambiguate between similar skills and identify multiple relevant domains.

**Characteristics:**
- Multiple interrelated skills (3-6 each)
- Moderate context complexity
- Some skill interdependencies (sequential, parallel)
- 2-3 possible routing paths for each exercise
- **Typical runtime:** 3-5 seconds total

**Exercises:**

1. **Full CI/CD Workflow** (3 skills)
   - Task: "Build a CI/CD pipeline with proper versioning, branching, and code quality checks"
   - Expected: `coding-git-branching-strategies` + `coding-semver-automation` + `coding-code-quality-policies`
   - Complexity: Pipeline design requires coordination

2. **Security Patch Process** (3 skills)
   - Task: "Establish a process to scan, review, and release security patches"
   - Expected: `coding-security-review` + `coding-cve-dependency-management` + `coding-semver-automation`
   - Complexity: Security + versioning interaction

3. **Architecture with Quality** (3 skills)
   - Task: "Design architecture that enforces code quality standards and uses advanced git workflows"
   - Expected: `coding-architectural-patterns` + `coding-code-quality-policies` + `coding-git-advanced`
   - Complexity: Architecture-first approach

4. **Complex Refactor** (4 skills)
   - Task: "Plan and execute a large refactor maintaining code quality and using git best practices"
   - Expected: `coding-code-quality-policies` + `coding-architectural-patterns` + `coding-git-advanced` + `coding-git-branching-strategies`
   - Complexity: Multi-phase refactor

5. **Release Pipeline** (4 skills)
   - Task: "Build a complete release process with versioning, quality gates, and team workflows"
   - Expected: `coding-semver-automation` + `coding-code-quality-policies` + `coding-git-advanced` + `coding-git-branching-strategies`
   - Complexity: End-to-end process

6. **Security-Focused Release** (4 skills)
   - Task: "Create a secure release pipeline with CVE scanning, code review, and semantic versioning"
   - Expected: `coding-security-review` + `coding-cve-dependency-management` + `coding-semver-automation` + `coding-code-quality-policies`
   - Complexity: Security-first, multi-step

7. **Multi-Repo Management** (5 skills)
   - Task: "Manage multiple repositories with consistent versioning, branching, quality standards, and architecture"
   - Expected: `coding-git-advanced` + `coding-semver-automation` + `coding-git-branching-strategies` + `coding-code-quality-policies` + `coding-architectural-patterns`
   - Complexity: Cross-repo consistency

8. **Monorepo Setup** (5 skills)
   - Task: "Design a monorepo structure with shared architecture, quality policies, versioning, and git workflows"
   - Expected: `coding-architectural-patterns` + `coding-code-quality-policies` + `coding-git-advanced` + `coding-semver-automation` + `coding-git-branching-strategies`
   - Complexity: Monorepo patterns + scaling

9. **Cross-Team Workflow** (6 skills)
   - Task: "Establish organization-wide standards for architecture, code quality, security, versioning, git, and branching"
   - Expected: All 6 coding skills
   - Complexity: Full coordination

**Expected Results:**
- Routing Accuracy: 90%+
- Overhead: 30-100ms
- Skill Count Accuracy: ±1 skill acceptable
- Possible false positives/negatives due to overlapping domains

---

### Tier 3: HEAVY (6 exercises, 6-10 skills each)

**Purpose:** Push the router to its limits with high complexity and many interrelated skills. These exercises simulate real-world scenarios where context is ambiguous and routing decisions require deep reasoning.

**Characteristics:**
- High skill count (6-10 each)
- Significant interdependencies
- Ambiguous task descriptions (real user language)
- 3+ valid routing paths for each exercise
- **Typical runtime:** 10-30 seconds total

**Exercises:**

1. **Enterprise Release** (6 skills)
   - Task: "Plan an enterprise release: semantic versioning, code quality gate, security audit, git workflow, architecture review, and team coordination"
   - Expected: `coding-semver-automation` + `coding-code-quality-policies` + `coding-security-review` + `coding-git-advanced` + `coding-architectural-patterns` + `coding-git-branching-strategies`
   - Complexity: Multiple decision points, stakeholder concerns

2. **Large Refactor Campaign** (6 skills)
   - Task: "Execute a large multi-team refactor touching architecture, code quality, security concerns, git strategy, and versioning"
   - Expected: `coding-architectural-patterns` + `coding-code-quality-policies` + `coding-git-advanced` + `coding-security-review` + `coding-git-branching-strategies` + `coding-semver-automation`
   - Complexity: Cross-functional, phased approach

3. **Multi-Service Deployment** (7 skills)
   - Task: "Deploy multiple services across environments with consistent versioning, quality, security scanning, architecture decisions, and git workflows"
   - Expected: `coding-semver-automation` + `coding-code-quality-policies` + `coding-git-advanced` + `coding-git-branching-strategies` + `coding-architectural-patterns` + `coding-cve-dependency-management` + `coding-security-review`
   - Complexity: Orchestration of multiple concerns

4. **Platform Infrastructure Modernization** (7 skills)
   - Task: "Modernize platform infrastructure: refactor architecture, establish quality standards, implement security practices, manage git workflows, handle versioning, scan dependencies, and coordinate across teams"
   - Expected: `coding-architectural-patterns` + `coding-code-quality-policies` + `coding-git-advanced` + `coding-semver-automation` + `coding-cve-dependency-management` + `coding-security-review` + `coding-git-branching-strategies`
   - Complexity: Holistic platform redesign

5. **Production Incident Response + Prevention** (7 skills)
   - Task: "Respond to production incident: root cause analysis via architecture review, implement preventive code quality measures, security hardening, comprehensive git audit trail, version management, CVE scanning, and establish workflow"
   - Expected: `coding-architectural-patterns` + `coding-code-quality-policies` + `coding-security-review` + `coding-git-advanced` + `coding-semver-automation` + `coding-cve-dependency-management` + `coding-git-branching-strategies`
   - Complexity: Reactive + proactive, full scope

6. **Full Governance Framework** (7 skills)
   - Task: "Build comprehensive governance: establish architectural patterns, enforce code quality, implement security reviews, design git workflows, manage semantic versions, scan dependencies, and coordinate team processes"
   - Expected: All 7 skills equally
   - Complexity: Balanced across all domains

**Expected Results:**
- Routing Accuracy: 80-90% (increased ambiguity)
- Overhead: 100-300ms
- Skill Count Accuracy: ±2 skills acceptable
- Some false positives/negatives expected due to overlapping concerns

---

## Running Benchmarks

### Command-Line Options

```bash
python3 benchmarks/harness/benchmark.py [OPTIONS]

Options:
  --tier {simple|medium|heavy|all}
    Which exercises to run. Default: all
    
  --exercise "Exercise Name"
    Run a specific exercise by name. Default: all
    
  --verbose, -v
    Print detailed metrics for each exercise. Default: False
    
  --output PATH
    Save results to custom file. Default: results/latest-results.json
    
  --baseline {enabled|disabled}
    Whether to measure baseline (no router). Default: enabled
    
  --warmup N
    Number of warmup runs before measurement. Default: 1
    
  --iterations N
    Number of iterations per exercise. Default: 3
    
  --timeout SECONDS
    Timeout per exercise. Default: 30
    
  --help, -h
    Show full help message
```

### Running Examples

```bash
# Quick smoke test (simple tier only, < 1 minute)
python3 benchmarks/harness/benchmark.py --tier simple

# Full comprehensive benchmark (all tiers, ~5-10 minutes)
python3 benchmarks/harness/benchmark.py --tier all --verbose

# Focus on medium tier with detailed output
python3 benchmarks/harness/benchmark.py --tier medium --verbose --iterations 5

# Single exercise, many iterations for stability
python3 benchmarks/harness/benchmark.py --exercise "Code Review Basic" --iterations 10

# Baseline only (measure without router)
python3 benchmarks/harness/benchmark.py --tier simple --baseline-only

# Parallel execution (if supported)
python3 benchmarks/harness/benchmark.py --tier all --parallel 4

# Save with timestamp
python3 benchmarks/harness/benchmark.py --tier all \
  --output "results/bench-$(date +%Y-%m-%d-%H%M%S).json"
```

### Integration with CI/CD

```bash
# .github/workflows/benchmark.yml
name: Benchmarks

on:
  schedule:
    - cron: '0 0 * * 0'  # Weekly
  workflow_dispatch:

jobs:
  benchmark:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      
      - name: Run benchmarks
        run: |
          cd benchmarks
          python3 harness/benchmark.py --tier all \
            --output "results/bench-${{ github.run_id }}.json"
      
      - name: Compare with baseline
        run: |
          python3 harness/comparison.py \
            --current "results/bench-${{ github.run_id }}.json" \
            --previous "results/latest-results.json"
      
      - name: Comment on PR
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v6
        with:
          script: |
            const results = require('./results/bench-${{ github.run_id }}.json');
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `📊 Benchmark Results\n\n${formatResults(results)}`
            });
```

---

## Understanding Results

### Results JSON Structure

```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "environment": {
    "python_version": "3.11.0",
    "platform": "linux",
    "machine": "x86_64"
  },
  "summary": {
    "total_exercises": 24,
    "total_runtime_seconds": 245.3,
    "overall_accuracy": 0.921,
    "overall_overhead_ms": 45.2
  },
  "tiers": {
    "simple": {
      "exercises": 9,
      "accuracy": 0.952,
      "avg_overhead_ms": 28.1,
      "avg_router_latency_ms": 23.4,
      "skill_accuracy": 1.0,
      "results": [
        {
          "name": "Code Review Basic",
          "expected_skills": 1,
          "actual_skills": 1,
          "correct": true,
          "with_router_ms": 125.3,
          "without_router_ms": 97.2,
          "overhead_ms": 28.1,
          "overhead_pct": 28.9,
          "router_latency_ms": 23.4,
          "skills_selected": ["coding-code-review"],
          "expected_skills_list": ["coding-code-review"],
          "precision": 1.0,
          "recall": 1.0
        }
      ]
    }
  }
}
```

### Key Fields Explained

| Field | Meaning | Good Value |
|-------|---------|-----------|
| `accuracy` | % of exercises with correct skill selection | ≥90% |
| `overhead_ms` | Additional latency from routing | <50ms for simple, <200ms heavy |
| `overhead_pct` | Overhead as percentage of baseline | <10% ideal, <20% acceptable |
| `router_latency_ms` | Pure router search + ranking time | <30ms simple, <150ms heavy |
| `precision` | Correct skills / all skills selected | ≥0.95 |
| `recall` | Correct skills selected / expected | ≥0.95 |
| `skill_accuracy` | Ratio of expected:actual skills | 1.0 ideal |

---

## Interpreting Metrics

### Routing Accuracy (Primary Metric)

**Definition:** Percentage of exercises where the router selected the expected skill set.

**Interpretation:**
- **95%+:** Excellent — router reliably selects correct skills
- **85-94%:** Good — acceptable for most use cases, some edge cases
- **75-84%:** Fair — noticeable misses, investigate worst cases
- **<75%:** Poor — router needs tuning or retraining

**Investigation Steps:**
1. Identify failing exercises (where `correct == false`)
2. Check `skills_selected` vs. `expected_skills_list`
3. Look for patterns (e.g., always missing a specific skill domain)
4. Review trigger keywords for failing skills
5. Check for ambiguous task descriptions

### Response Overhead (Performance Metric)

**Definition:** Additional latency from enabling router vs. baseline.

**Interpretation:**
```
Overhead = Router-Enabled Latency - Baseline Latency

% Overhead = (Overhead / Baseline Latency) × 100
```

**Acceptable Thresholds:**
- **Simple Tier:** <50ms overhead, <10% relative
- **Medium Tier:** <100ms overhead, <15% relative
- **Heavy Tier:** <300ms overhead, <20% relative

**Example:**
```
Baseline (no router): 500ms
With router: 528ms
Overhead: 28ms (5.6% relative)
✅ PASS — well within threshold
```

**Optimization Strategies if Overhead is High:**
1. Implement caching for repeated tasks
2. Reduce trigger complexity (fewer keywords)
3. Optimize ranking algorithm
4. Use lazy loading for heavy skills
5. Implement timeout cutoff (give up after 100ms)

### Skill Count Accuracy

**Definition:** Expected number of skills vs. actual number selected.

**Interpretation:**
- **Perfect (1.0):** Router selected exactly the right number
- **Slightly High (1.1-1.3):** Router over-selected (common, OK)
- **Slightly Low (0.7-0.9):** Router under-selected (investigate)
- **Severely Off (>1.5 or <0.6):** Routing malfunction

**Under-Selection Issues:**
- Missing skill domains entirely
- Trigger keywords not matching conversation language
- Skill interdependencies not recognized

**Over-Selection Issues:**
- Overly broad triggers (too many false positives)
- Missing negative triggers (skills that shouldn't load)
- Context confusion (router unsure, loads everything)

### Router Latency (Technical Metric)

**Definition:** Pure time spent in skill search + ranking, excluding downstream processing.

**Typical Benchmarks:**
```
Simple: 15-35ms
  ├─ Search: 5-10ms
  └─ Ranking: 10-25ms

Medium: 40-120ms
  ├─ Search: 15-40ms
  └─ Ranking: 25-80ms

Heavy: 100-300ms
  ├─ Search: 30-100ms
  └─ Ranking: 70-200ms
```

**Bottleneck Identification:**

If router latency is high:
1. Is it the search phase? → Optimize trigger matching (use inverted index)
2. Is it the ranking phase? → Optimize scoring algorithm (use lightweight embeddings)
3. Is it both? → Consider parallel search + ranking

---

## Historical Tracking

### Creating a Baseline

```bash
# First run — establish baseline
python3 benchmarks/harness/benchmark.py --tier all \
  --output results/baseline-v1.0.json

# Tag it
git add results/baseline-v1.0.json
git commit -m "benchmark: baseline for v1.0 release"
```

### Comparing Versions

```bash
# After making router improvements
python3 benchmarks/harness/benchmark.py --tier all \
  --output results/bench-v1.1.json

# Compare with baseline
python3 benchmarks/harness/comparison.py \
  --current results/bench-v1.1.json \
  --baseline results/baseline-v1.0.json
```

### Tracking Over Time

Create a simple CSV tracker:

```bash
# Extract key metrics and append to history
python3 -c "
import json
from datetime import datetime

with open('results/latest-results.json') as f:
    results = json.load(f)

metrics = {
    'date': datetime.fromisoformat(results['timestamp']).strftime('%Y-%m-%d'),
    'simple_accuracy': results['tiers']['simple']['accuracy'],
    'medium_accuracy': results['tiers']['medium']['accuracy'],
    'simple_overhead': results['tiers']['simple']['avg_overhead_ms'],
    'medium_overhead': results['tiers']['medium']['avg_overhead_ms'],
}

# Append to history CSV
with open('results/history.csv', 'a') as f:
    if f.tell() == 0:  # File is empty, write header
        f.write(','.join(metrics.keys()) + '\n')
    f.write(','.join(str(v) for v in metrics.values()) + '\n')
"

# View history
cat results/history.csv
```

### Regression Detection

```bash
# Alert if accuracy drops > 5%
python3 -c "
import json

with open('results/latest-results.json') as f:
    current = json.load(f)
    
with open('results/baseline-v1.0.json') as f:
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

## Best Practices

### For Benchmarking Your Router

1. **Establish a Baseline First**
   - Run full benchmark suite on current version
   - Save as `baseline-<version>.json`
   - Document environment (Python version, CPU, etc.)

2. **Run Multiple Iterations**
   - Default 3 iterations per exercise
   - For critical measurements, use 5-10 iterations
   - Account for system noise and variance

3. **Compare Fairly**
   - Run comparison on same hardware
   - Control for system load
   - Compare similar skill catalog states
   - Document any differences in methodology

4. **Investigate Failures**
   - Don't ignore accuracy drops < 5%
   - Identify which exercises fail
   - Look for patterns (specific skills, task types)
   - Fix root causes before declaring "regression acceptable"

5. **Watch for False Positives**
   - Some exercises have multiple valid solutions
   - `coding-semver-automation` and `coding-version-management` might both be correct
   - Adjust exercises if legitimate alternatives exist

### For Adding New Exercises

1. **Follow the Tier Structure**
   - Simple: 1-3 skills, clear match
   - Medium: 3-6 skills, some ambiguity
   - Heavy: 6-10 skills, lots of interplay

2. **Write Clear Descriptions**
   - Use natural language (how users actually talk)
   - Include domain-specific terms
   - Describe the desired outcome, not the solution

3. **Verify Expected Skills**
   - Are these skills actually available?
   - Do their descriptions match the task?
   - Are there alternative valid answers?

4. **Document Rationale**
   - Why should these specific skills be selected?
   - What interdependencies exist?
   - Are there edge cases to watch?

### For Interpreting Results in CI/CD

```python
def check_performance(current_results):
    """Determine if benchmark results are acceptable."""
    
    summary = current_results['summary']
    
    checks = {
        'overall_accuracy': summary['overall_accuracy'] >= 0.85,
        'simple_overhead': summary['tiers']['simple']['avg_overhead_ms'] < 100,
        'medium_overhead': summary['tiers']['medium']['avg_overhead_ms'] < 150,
        'heavy_overhead': summary['tiers']['heavy']['avg_overhead_ms'] < 300,
    }
    
    failed = [k for k, v in checks.items() if not v]
    
    if failed:
        print(f"❌ FAILED: {', '.join(failed)}")
        return False
    else:
        print("✅ PASSED: All performance thresholds met")
        return True
```

---

## Troubleshooting

### Common Issues

**Q: Benchmark hangs or times out**

A: Set a longer timeout and check for infinite loops:
```bash
python3 benchmarks/harness/benchmark.py --tier simple --timeout 60 --verbose
```

**Q: Results vary wildly between runs**

A: System load is affecting measurements. Try:
- Run on idle system
- Increase warmup runs (`--warmup 3`)
- Increase iterations (`--iterations 10`)
- Look at min/max, not just average

**Q: Router seems slower than baseline in some exercises**

A: This is expected when:
- Task is very short (router overhead is proportional to baseline)
- Router is doing heavy ranking
- Disk I/O is slow
- System is under load

Acceptable if overhead is within thresholds (see Interpreting Metrics).

**Q: Accuracy is lower than expected**

A: Check these in order:
1. Are exercise expected_skills actually correct?
2. Do router trigger keywords match task language?
3. Is router ranking algorithm prioritizing right skills?
4. Are there multiple valid solutions? (adjust exercise)

**Q: results/latest-results.json not created**

A: Check for errors:
```bash
python3 benchmarks/harness/benchmark.py --tier simple --verbose 2>&1 | tail -50
```

---

## File Organization

```
benchmarks/
├── README.md                          # This file
├── exercises/
│   ├── simple/
│   │   ├── exercise-1.json           # Code Review Basic
│   │   ├── exercise-2.json           # Git Branching Strategy
│   │   ├── exercise-3.json           # Security Check
│   │   ├── exercise-4.json           # Version Bump
│   │   ├── exercise-5.json           # CVE Scanning
│   │   ├── exercise-6.json           # Code Quality + Refactoring
│   │   ├── exercise-7.json           # Architecture Decision
│   │   ├── exercise-8.json           # Git Rebase Workflow
│   │   └── exercise-9.json           # Quality + Branching
│   ├── medium/
│   │   ├── exercise-1.json           # Full CI/CD Workflow
│   │   ├── exercise-2.json           # Security Patch Process
│   │   ├── exercise-3.json           # Architecture with Quality
│   │   ├── exercise-4.json           # Complex Refactor
│   │   ├── exercise-5.json           # Release Pipeline
│   │   ├── exercise-6.json           # Security-Focused Release
│   │   ├── exercise-7.json           # Multi-Repo Management
│   │   ├── exercise-8.json           # Monorepo Setup
│   │   └── exercise-9.json           # Cross-Team Workflow
│   └── heavy/
│       ├── exercise-1.json           # Enterprise Release
│       ├── exercise-2.json           # Large Refactor Campaign
│       ├── exercise-3.json           # Multi-Service Deployment
│       ├── exercise-4.json           # Platform Infrastructure Modernization
│       ├── exercise-5.json           # Production Incident Response
│       └── exercise-6.json           # Full Governance Framework
├── harness/
│   ├── benchmark.py                  # Main runner (400+ lines)
│   ├── metrics.py                    # Metrics collection (250+ lines)
│   └── comparison.py                 # Before/after comparison (200+ lines)
└── results/
    ├── latest-results.json           # Latest benchmark results
    ├── history.csv                   # Historical tracking (optional)
    └── README.md                     # Results documentation
```

---

## Next Steps

1. **Run Benchmarks:**
   ```bash
   python3 benchmarks/harness/benchmark.py --tier simple
   ```

2. **Review Results:**
   ```bash
   cat benchmarks/results/latest-results.json | python3 -m json.tool
   ```

3. **Save Baseline:**
   ```bash
   cp benchmarks/results/latest-results.json benchmarks/results/baseline-v1.0.json
   ```

4. **Setup CI/CD:**
   - Copy the GitHub Actions workflow above
   - Configure periodic runs (weekly)
   - Add alerts for regressions

---

**Last Updated:** 2024-01-15  
**Maintainer:** Agent-Skill-Router Team  
**License:** MIT
