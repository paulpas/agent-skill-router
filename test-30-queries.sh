#!/bin/bash
# Comprehensive 30-query regression test for advanced routing system
# Tests: domain relevance, scoring consistency, format correctness

BASE="http://localhost:3000/route"

PASS=0
FAIL=0
WARN=0
TOTAL_TESTS=30

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
echo "30-Query Regression Test — Advanced Routing"
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
