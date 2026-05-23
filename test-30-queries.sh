#!/bin/bash
# Comprehensive 100-query regression test for advanced routing system
# Tests: domain relevance, scoring consistency, format correctness

BASE="http://localhost:3000/route"

PASS=0
FAIL=0
WARN=0
TOTAL_TESTS=100

run_test() {
  local num="$1"
  local query="$2"
  local expected_domain="$3"
  local expected_pattern="$4"

  # Build JSON compactly using jq (avoids shell escaping issues and multiline problems)
  local json
  json=$(jq -c -n --arg task "$query" \
    '{task: $task, constraints: {includeScoreBreakdown: true, maxSkills: 5}}')

  # Use curl with explicit error capture — not -f so we can see HTTP status
  local http_code
  local response
  response=$(curl -s -w '\n%{http_code}' -X POST "$BASE" \
    -H 'Content-Type: application/json' \
    -d "$json" 2>/dev/null)

  # Extract HTTP code (last line) and body (everything before)
  http_code=$(echo "$response" | tail -1)
  response=$(echo "$response" | sed '$d')

  if [ "$http_code" != "200" ] || [ -z "$response" ]; then
    echo "[$num] FAIL: $expected_domain - HTTP $http_code (query: $query)"
    FAIL=$((FAIL+1))
    return
  fi

  # Parse with dedicated Python script to avoid inline quoting issues
  local result
  result=$(echo "$response" | python3 /home/paulpas/git/agent-skill-router/test-parser.py 2>/dev/null)

  if [ -z "$result" ] || [ "$result" = "PARSE_ERROR" ]; then
    echo "[$num] FAIL: $expected_domain - Python parse error (HTTP $http_code, body=${#response} bytes) | query: $query"
    FAIL=$((FAIL+1))
    return
  fi

  local status=$(echo "$result" | cut -d'|' -f1)
  local top_skill=$(echo "$result" | cut -d'|' -f2)
  local score=$(echo "$result" | cut -d'|' -f3)
  local skill_count=$(echo "$result" | cut -d'|' -f4)
  local rs_format=$(echo "$result" | cut -d'|' -f5)
  local exp_lines=$(echo "$result" | cut -d'|' -f6)

  if [ "$status" = "NO_SKILLS" ]; then
    echo "[$num] FAIL: $expected_domain - No skills returned (rs_keys=${skill_count}) | query: $query"
    FAIL=$((FAIL+1))
  elif [ "$rs_format" = "SCALAR" ]; then
    echo "[$num] WARN: $expected_domain - scalar routingScores format ($top_skill, score=$score, skills=$skill_count) | query: $query"
    WARN=$((WARN+1))
  elif [ "$exp_lines" -eq 0 ] 2>/dev/null; then
    echo "[$num] WARN: $expected_domain - no explanations ($top_skill, score=$score, skills=$skill_count) | query: $query"
    WARN=$((WARN+1))
  else
    # Domain relevance check by name matching
    local domain_match="OK"
    case "$expected_domain" in
      coding) ;;   # coding skills are diverse
      cncf)
        if echo "$top_skill" | grep -qiE 'kubernetes|k8s|docker|prometheus|istio|helm|kube|container|ingress'; then
          domain_match="GOOD"
        else
          domain_match="PARTIAL"
        fi
        ;;
      trading)
        if echo "$top_skill" | grep -qiE 'trading|risk|stop|loss|vwap|twap|order|position|bollinger|atr'; then
          domain_match="GOOD"
        else
          domain_match="PARTIAL"
        fi
        ;;
      agent)
        if echo "$top_skill" | grep -qiE 'agent|orchestration|routing|delegation|task|dispatch'; then
          domain_match="GOOD"
        else
          domain_match="PARTIAL"
        fi
        ;;
      go)
        if echo "$top_skill" | grep -qiE 'go|golang|goroutine|channel|concurrency'; then
          domain_match="GOOD"
        else
          domain_match="PARTIAL"
        fi
        ;;
      linux)
        if echo "$top_skill" | grep -qiE 'linux|systemd|docker|kernel|system administration|file permission|process|networking|firewall'; then
          domain_match="GOOD"
        else
          domain_match="PARTIAL"
        fi
        ;;
    esac

    if [ "$skill_count" -ge 3 ] 2>/dev/null; then
      echo "[$num] PASS: $expected_domain ($domain_match) — $top_skill score=$score skills=$skill_count explanations=$exp_lines | $query"
      PASS=$((PASS+1))
    elif [ "$skill_count" -ge 1 ]; then
      if [ "$domain_match" = "GOOD" ]; then
        echo "[$num] PASS: $expected_domain ($domain_match) — $top_skill score=$score skills=$skill_count explanations=$exp_lines | $query"
        PASS=$((PASS+1))
      else
        echo "[$num] WARN: $expected_domain ($domain_match) — $top_skill score=$score skills=$skill_count explanations=$exp_lines | $query"
        WARN=$((WARN+1))
      fi
    else
      echo "[$num] FAIL: $expected_domain - only $skill_count skill(s) returned ($top_skill score=$score) | query: $query"
      FAIL=$((FAIL+1))
    fi
  fi

  # Small delay to avoid overwhelming the endpoint
  sleep 0.15
}

echo "=============================================="
echo "100-Query Regression Test — Advanced Routing"
echo "$(date)"
echo "=============================================="
echo ""

# === CODING (6 queries) ===
run_test 1   "implement a rate limiter in Go using goroutines and channels" "go/coding" "tactical"
run_test 2   "write unit tests for authentication module" "coding" "tactical/educational"
run_test 3   "design an event-driven microservices architecture" "coding" "strategic"
run_test 4   "fix memory leak in Python async application" "coding" "diagnostic"
run_test 5   "generate boilerplate REST API with Express.js" "coding" "generation"
run_test 6   "refactor monolithic codebase into modular architecture" "coding" "strategic/diagnostic"

# === CNCF (6 queries) ===
run_test 7   "why is my Kubernetes pod stuck in CrashLoopBackOff" "cncf" "diagnostic"
run_test 8   "set up Prometheus monitoring with alertmanager for K8s cluster" "cncf" "tactical"
run_test 9   "configure nginx ingress controller with TLS termination on GKE" "cncf" "tactical"
run_test 10  "migrate from Docker Swarm to Kubernetes" "cncf" "strategic"
run_test 11  "debug slow database queries in PostgreSQL on managed cluster" "cncf" "diagnostic"
run_test 12  "design a service mesh with Istio for multi-cluster" "cncf" "strategic"

# === TRADING (6 queries) ===
run_test 13  "implement a trailing stop loss with ATR-based distance calculation" "trading" "tactical"
run_test 14  "calculate Bollinger Bands and use for entry/exit signals" "trading" "tactical"
run_test 15  "design a market-making algorithm for crypto exchanges" "trading" "strategic"
run_test 16  "why is my backtest overfitting to historical data" "trading" "diagnostic"
run_test 17  "implement VWAP execution algorithm with TWAP fallback" "trading" "tactical"
run_test 18  "calculate portfolio drawdown and risk metrics for crypto positions" "trading" "tactical/diagnostic"

# === AGENT (4 queries) ===
run_test 19  "how do I orchestrate parallel task execution across multiple AI agents" "agent" "orchestration"
run_test 20  "implement intelligent skill routing based on query understanding" "agent" "tactical/strategic"
run_test 21  "design a fallback chain for when primary agent fails" "agent" "strategic"
run_test 22  "debug why delegation is not working in multi-agent workflow" "agent" "diagnostic"

# === GO (4 queries) ===
run_test 23  "implement worker pool pattern with goroutines and channels in Go" "go" "tactical"
run_test 24  "how do I handle errors properly in Go using sentinel errors and wrapping" "go" "educational/tactical"
run_test 25  "write concurrent HTTP handler with rate limiting in Go" "go" "tactical"
run_test 26  "implement mutex-based synchronization for shared state in Go" "go" "tactical"

# === LINUX (4 queries) ===
run_test 27  "how do I set up a systemd service for a Node.js application" "linux" "tactical"
run_test 28  "debug high CPU usage on production Linux server" "linux" "diagnostic"
run_test 29  "configure iptables firewall rules for web server" "linux" "tactical"
run_test 30  "how do I find and fix disk space issues on a running Linux machine" "linux" "diagnostic"

# === STRESS TESTS - Short queries (5) ===
run_test 31  "k8s" "cncf" "tactical/short"
run_test 32  "rust" "coding" "tactical/short"
run_test 33  "stop loss" "trading" "tactical/short"
run_test 34  "docker" "cncf" "tactical/short"
run_test 35  "go concurrency" "go" "tactical/short"

# === STRESS TESTS - Long multi-concept queries (10) ===
run_test 36  "I need to design a scalable event-driven trading platform with real-time order matching, risk management using Bollinger Bands for entry signals, and Kubernetes deployment with Prometheus monitoring and alerting on high latency" "trading/cncf" "strategic/multi-domain"
run_test 37  "how do I implement a Go microservice that uses gRPC for inter-service communication, Redis for caching, PostgreSQL for persistence, Kubernetes for orchestration, and implements circuit breaker patterns using the Hystrix library with Prometheus metrics and Grafana dashboards" "coding/cncf/go" "strategic/multi-domain"
run_test 38  "I have a production Kubernetes cluster running nginx ingress where pods are randomly getting OOMKilled every 4 hours, I need to debug this, adjust resource limits, set up proper horizontal pod autoscaling, and implement PodDisruptionBudgets to maintain availability during rolling deployments" "cncf" "diagnostic/complex"
run_test 39  "I need to implement a complete algorithmic trading system in Python that includes: data ingestion from multiple crypto exchanges via CCXT, technical indicator calculation using TA-Lib, signal generation with RSI and MACD crossover logic, position sizing using Kelly criterion, stop loss with ATR-based trailing stops, backtesting with walk-forward optimization, and deployment to AWS EC2 instances" "trading/coding" "strategic/multi-domain"
run_test 40  "Our production Linux servers are experiencing intermittent high CPU usage spikes during peak hours, we need to identify the runaway processes using top and perf, analyze system logs for patterns, check network connections with ss, tune kernel parameters in sysctl.conf, set up Prometheus node exporter for continuous monitoring, configure alertmanager to notify on-call engineers via PagerDuty integration" "linux/cncf" "diagnostic/complex"
run_test 41  "I need to architect a multi-agent AI system where one agent handles code review, another handles testing, and a third handles documentation generation. The agents need to coordinate through a shared task queue, fall back gracefully when one agent fails, maintain conversation context across agent handoffs, and produce a unified report of all findings" "agent" "strategic/complex"
run_test 42  "Design a CI/CD pipeline for a Go microservice that: builds Docker images with multi-stage builds, runs unit tests and integration tests in parallel, scans for vulnerabilities with Trivy, pushes to ECR, deploys to EKS using Helm charts with canary releases, monitors via Prometheus/Grafana, rolls back automatically on error rate increase" "cncf/coding/go" "strategic/multi-domain"
run_test 43  "I need to debug why my Python web application serving millions of requests per day has: memory leak growing at 50MB/hour, slow database queries taking 2+ seconds, and high GC pause times. Analyze using py-spy profiler, review SQLAlchemy connection pool settings, check for circular references in ORM models" "coding" "diagnostic/complex"
run_test 44  "Set up a complete Kubernetes observability stack: Prometheus Operator with alertmanager for metrics-based alerting, Loki for log aggregation, Grafana dashboards for service mesh visibility, Jaeger for distributed tracing across microservices, configured with recording rules for latency percentiles and SLO burn rate alerts sent to Slack" "cncf" "strategic/complex"
run_test 45  "I need to implement a high-frequency trading data pipeline in Go that: ingests WebSocket market data from Binance and Coinbase Pro, normalizes order books into unified format, calculates VWAP and TWAP in real-time using ring buffers, publishes signals via Redis Streams, processes 1M messages/second with sub-microsecond latency" "coding/go/trading" "strategic/multi-domain"

# === DOMAIN DEEP DIVES - Coding (10) ===
run_test 46  "implement dependency injection in TypeScript using a custom IoC container" "coding" "tactical"
run_test 47  "write integration tests with Jest for an Express.js REST API with MongoDB" "coding" "tactical/educational"
run_test 48  "fix race condition in concurrent Python multiprocessing code" "coding" "diagnostic"
run_test 49  "implement a custom React hook for debounced search input" "coding" "tactical"
run_test 50  "design and implement a thread-safe LRU cache in Rust" "coding" "tactical"
run_test 51  "set up OAuth2 JWT authentication flow in Node.js with Express" "coding" "tactical"
run_test 52  "optimize slow SQL queries with proper indexing and EXPLAIN ANALYZE" "coding" "diagnostic"
run_test 53  "implement the strategy pattern for pluggable payment processing" "coding" "strategic/tactical"
run_test 54  "write GraphQL resolvers with DataLoader to prevent N+1 queries" "coding" "tactical"
run_test 55  "implement a circuit breaker pattern for service-to-service communication" "coding" "strategic"

# === DOMAIN DEEP DIVES - CNCF (10) ===
run_test 56  "how do I create a custom Kubernetes operator using the Operator SDK and Go" "cncf" "tactical/educational"
run_test 57  "debug DNS resolution failures between pods in different namespaces on EKS" "cncf" "diagnostic"
run_test 58  "set up Crossplane for infrastructure as code across AWS, GCP, and Azure" "cncf" "strategic"
run_test 59  "configure ArgoCD for GitOps workflow with multi-cluster sync" "cncf" "tactical"
run_test 60  "implement service mesh traffic splitting with Istio for A/B testing" "cncf" "tactical"
run_test 61  "how do I migrate from Helm 2 to Helm 3 safely in production clusters" "cncf" "strategic"
run_test 62  "set up etcd backup and disaster recovery procedures for Kubernetes" "cncf" "tactical"
run_test 63  "debug container image pull failures on EKS node groups with private registry" "cncf" "diagnostic"
run_test 64  "configure Kubernetes network policies to isolate frontend, backend, and database tiers" "cncf" "enforcement/tactical"
run_test 65  "implement autoscaling using KEDA for event-driven workloads on Azure Kubernetes Service" "cncf" "tactical/strategic"

# === DOMAIN DEEP DIVES - Trading (10) ===
run_test 66  "calculate Sharpe ratio and Sortino ratio for a crypto portfolio backtest" "trading" "tactical"
run_test 67  "implement mean-reversion strategy with cointegrated cryptocurrency pairs" "trading" "tactical/strategic"
run_test 68  "set up real-time options chain data feed using Polygon.io WebSocket API" "trading" "tactical"
run_test 69  "debug slippage between backtest execution and live trading results" "trading" "diagnostic"
run_test 70  "implement dynamic position sizing based on portfolio volatility targets" "trading" "tactical"
run_test 71  "design a multi-timeframe analysis system with daily trend filter and hourly entries" "trading" "strategic"
run_test 72  "calculate maximum drawdown period and recovery time from equity curve data" "trading" "tactical"
run_test 73  "implement adaptive stop loss that switches between ATR-based and support/resistance stops" "trading" "tactical"
run_test 74  "build a regime detection model using HMM for trending vs ranging markets" "trading" "strategic/educational"
run_test 75  "implement cross-exchange arbitrage with latency-optimized WebSocket connections" "trading" "tactical/strategic"

# === DOMAIN DEEP DIVES - Agent (10) ===
run_test 76  "implement a fallback chain where primary LLM fails, secondary model takes over" "agent" "strategic"
run_test 77  "how do I implement streaming tool responses in real-time to the user" "agent" "tactical/educational"
run_test 78  "design a context window management system for long multi-turn conversations" "agent" "strategic"
run_test 79  "debug why some agent tasks are getting stuck in infinite loops" "agent" "diagnostic"
run_test 80  "implement weighted skill selection based on past success rates" "agent" "tactical"
run_test 81  "design a multi-stage planning system with verification at each step" "agent" "strategic"
run_test 82  "how do I handle tool errors gracefully and retry with modified parameters" "agent" "tactical/educational"
run_test 83  "implement agent-to-agent handoff with shared context preservation" "agent" "strategic"
run_test 84  "build a knowledge retrieval system that fetches external docs on demand" "agent" "tactical"
run_test 85  "design a safety layer that validates tool inputs before execution" "agent" "enforcement/strategic"

# === DOMAIN DEEP DIVES - Go (10) ===
run_test 86  "implement graceful shutdown with context cancellation and pending request draining" "go" "tactical"
run_test 87  "use sync.Pool to reduce GC pressure in high-throughput server" "go" "tactical"
run_test 88  "implement custom JSON marshaling for struct with dynamic fields" "go" "tactical"
run_test 89  "write a generic sorting function that works with any comparable type" "go" "tactical/educational"
run_test 90  "implement a ring buffer using slices for zero-allocation event queue" "go" "tactical"
run_test 91  "use the x/sync/errgroup package for coordinated concurrent execution" "go" "tactical"
run_test 92  "implement a pub-sub message system with fan-out using channels" "go" "strategic/tactical"
run_test 93  "profile and fix a CPU bottleneck in a Go web server handling image processing" "go" "diagnostic"
run_test 94  "write an HTTP middleware chain that implements logging, auth, and rate limiting" "go" "tactical"
run_test 95  "implement a custom DNS resolver with health checking for load balancing" "go" "strategic/tactical"

# === DOMAIN DEEP DIVES - Linux (10) ===
run_test 96  "how do I use cgroups to limit CPU and memory for a containerized application" "linux" "tactical/educational"
run_test 97  "debug NFS mount timeouts causing application hangs on production servers" "linux" "diagnostic"
run_test 98  "set up automated log rotation with logrotate for multiple application logs" "linux" "tactical"
run_test 99  "configure LVM to extend root filesystem without downtime on running server" "linux" "tactical/operational"
run_test 100 "use eBPF to profile kernel-level network latency on production Linux hosts" "linux" "diagnostic/tactical"

echo ""
echo "=============================================="
echo "RESULTS SUMMARY"
echo "=============================================="
echo "PASS: $PASS"
echo "WARN: $WARN"
echo "FAIL: $FAIL"
echo "TOTAL: $((PASS + WARN + FAIL))"
echo ""

if [ "$FAIL" -gt 0 ]; then
  echo "FAILURES DETECTED — review above"
elif [ "$WARN" -gt 10 ]; then
  echo "HIGH WARN COUNT ($WARN) — scoring may be inconsistent"
else
  echo "All tests passed or minor warnings"
fi
