#!/bin/bash
# Proof of Life — Verify Advanced Routing Features
# Run against a running skill-router container at http://localhost:3000/route

BASE=http://localhost:3000/route

echo "=== 1. Hybrid scoring (routingScores per-component breakdown) ==="
curl -s -X POST $BASE \
  -H "Content-Type: application/json" \
  -d '{"task":"implement k8s ingress controller debug","constraints":{"maxSkills":1}}' | python3 -c "import sys,json; d=json.load(sys.stdin); print('Has per-component scores:', any('bm25Score' in v for v in d['routingScores'].values() if isinstance(v,dict)))"

echo ""
echo "=== 2. Score explanations (includeScoreBreakdown flag) ==="
curl -s -X POST $BASE \
  -H "Content-Type: application/json" \
  -d '{"task":"implement trailing stop loss strategy","constraints":{"maxSkills":1,"includeScoreBreakdown":true}}' | python3 -c "import sys,json; d=json.load(sys.stdin); print('Explanations present:', 'scoreExplanations' in d)"

echo ""
echo "=== 3. Archetype inference (educational query) ==="
curl -s -X POST $BASE \
  -H "Content-Type: application/json" \
  -d '{"task":"teach me kubernetes networking","constraints":{"maxSkills":1,"includeScoreBreakdown":true}}' | python3 -c "import sys,json; d=json.load(sys.stdin); print('Archetype in explanation:', any('Archetype' in e for e in d.get('scoreExplanations',{}).get('',[])))"

echo ""
echo "=== ALL CHECKS DONE ==="
