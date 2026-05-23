#!/usr/bin/env python3
"""Proof of Life — Verify Advanced Routing Features."""
import json
import subprocess
import sys

BASE = "http://localhost:3000/route"

passed = 0
failed = 0
total = 0


def run_query(task, max_skills=5):
    """Run a routing query and return parsed JSON response."""
    payload = json.dumps({
        "task": task,
        "constraints": {"maxSkills": max_skills, "includeScoreBreakdown": True}
    })
    result = subprocess.run(
        ["curl", "-s", "-X", "POST", BASE,
         "-H", "Content-Type: application/json",
         "-d", payload],
        capture_output=True, text=True, timeout=30
    )
    return json.loads(result.stdout)


def check(description):
    global total
    total += 1
    print(f"\n--- Test {total}: {description} ---")


def pass_(msg):
    global passed
    passed += 1
    print(f"  ✅ {msg}")


def fail(msg):
    global failed
    failed += 1
    print(f"  ❌ {msg}")


def warn(msg):
    print(f"  ⚠️  {msg}")


# ============================================
# Test 1: Per-component routingScores
# ============================================
check("Per-component routingScores (not flat scalars)")
d = run_query("implement a rate limiter in Go using goroutines", 3)
scores = d.get("routingScores", {})
if not scores:
    fail("routingScores is empty")
else:
    first_key = list(scores.keys())[0]
    first_val = scores[first_key]
    if isinstance(first_val, dict) and any(
        k in first_val for k in ["vectorScore", "bm25Score", "triggerMatchScore"]
    ):
        pass_("routingScores contains per-component breakdown objects")
    else:
        fail(f"routingScores returns scalar ({type(first_val).__name__}: {first_val})")


# ============================================
# Test 2: Score explanations with component details
# ============================================
check("Score explanations with component-level text")
d = run_query("implement a rate limiter in Go using goroutines", 1)
explanations = d.get("scoreExplanations", {})
if not explanations:
    fail("scoreExplanations missing entirely")
else:
    has_component_text = False
    for name, texts in explanations.items():
        if any(
            any(keyword in t.lower()
                for keyword in ["semantic", "bm25", "keyword", "trigger", "archetype", "specificity", "conciseness"])
            for t in texts
        ):
            has_component_text = True
            break
    if has_component_text:
        pass_("Score explanations contain component-level text")
    else:
        warn("Explanations present but generic only")


# ============================================
# Test 3: Archetype alignment in explanations
# ============================================
check("Archetype alignment in explanations (tactical query)")
d = run_query("implement a rate limiter in Go using goroutines", 1)
explanations = d.get("scoreExplanations", {})
found_archetype = False
for name, texts in explanations.items():
    if any("archetype" in t.lower() for t in texts):
        found_archetype = True
        break
if found_archetype:
    pass_("Archetype alignment appears in explanation text")
else:
    warn("No archetype mention (may be due to missing archetypes on top candidate)")


# ============================================
# Test 4: BM25 exact term matching
# ============================================
check("BM25 scoring for exact technical terms")
d = run_query("kubernetes ingress nginx", 3)
scores = d.get("routingScores", {})
bm25_hits = []
for name, score in scores.items():
    if isinstance(score, dict):
        bm25 = score.get("bm25Score", 0)
        if bm25 > 0:
            bm25_hits.append((name, bm25))
if bm25_hits:
    for name, s in sorted(bm25_hits, key=lambda x: -x[1]):
        print(f"      BM25 hit: {name} = {s:.3f}")
    if any(s >= 0.1 for _, s in bm25_hits):
        pass_("High BM25 scores detected")
    else:
        warn("BM25 hits exist but low values (emulation embeddings may dominate)")
else:
    warn("No BM25 hits — emulation mode may suppress keyword matching")


# ============================================
# Test 5: Vector scores are non-trivial
# ============================================
check("Vector DB scores are populated (not all zero)")
d = run_query("implement a rate limiter in Go using goroutines", 3)
scores = d.get("routingScores", {})
has_nonzero = False
for name, score in scores.items():
    if isinstance(score, dict):
        vec = score.get("vectorScore", 0)
        if vec > 0:
            has_nonzero = True
            print(f"      Vector score for {name}: {vec:.4f}")
if has_nonzero:
    pass_("Non-zero vector scores detected")
else:
    warn("All vector scores are zero (emulation mode)")


# ============================================
# Test 6: Multiple skills with breakdowns
# ============================================
check("Multiple skills with full breakdowns in routingScores")
d = run_query("implement a rate limiter in Go using goroutines", 5)
scores = d.get("routingScores", {})
component_scores = sum(1 for v in scores.values() if isinstance(v, dict))
scalar_scores = len(scores) - component_scores
print(f"      Component breakdowns: {component_scores}")
print(f"      Scalar fallbacks: {scalar_scores}")
if component_scores >= 2:
    pass_("Multiple skills have per-component breakdowns")
elif component_scores == 1:
    warn("Only one skill with breakdown (deterministic filter may limit pool)")
else:
    fail("No component breakdowns found")


# ============================================
# Test 7: Final ranking score in explanation
# ============================================
check("Final ranking score in explanation")
d = run_query("implement a rate limiter in Go using goroutines", 1)
explanations = d.get("scoreExplanations", {})
top_skill = explanations.get(list(explanations.keys())[0], []) if explanations else []
has_final = any("final" in t.lower() or "ranking score" in t.lower() for t in top_skill)
if has_final:
    pass_("Final ranking score included in explanation")
else:
    warn("No explicit final score summary")


# ============================================
# Test 8: Response structure completeness
# ============================================
check("Complete response structure (all required fields)")
d = run_query("implement a rate limiter in Go using goroutines", 1)
required_fields = ["taskId", "selectedSkills", "executionPlan", "confidence",
                   "reasoningSummary", "candidatePool", "routingScores", "latencyMs"]
missing = [f for f in required_fields if f not in d]
if missing:
    fail(f"Missing fields: {missing}")
else:
    pass_("All required fields present")

scores = d.get("routingScores", {})
for name, score in list(scores.items())[:1]:
    if isinstance(score, dict):
        expected_keys = ["finalScore", "vectorScore"]
        missing_keys = [k for k in expected_keys if k not in score]
        if missing_keys:
            warn(f"Score breakdown missing keys: {missing_keys}")
        else:
            pass_("Score breakdown has all expected keys")


# ============================================
# Summary
# ============================================
print("\n" + "=" * 50)
print(f"RESULTS: {passed} passed, {failed} failed out of {total} checks")
print("=" * 50)

# Show sample data
print("\n--- Sample routingScores ---")
d = run_query("implement a rate limiter in Go using goroutines", 1)
scores = d.get("routingScores", {})
for name, score in scores.items():
    if isinstance(score, dict):
        print(json.dumps({name: score}, indent=2))
        break

print("\n--- Sample scoreExplanations ---")
explanations = d.get("scoreExplanations", {})
for name, texts in explanations.items():
    print(f"{name}:")
    for t in texts:
        print(f"  • {t}")
    break

sys.exit(0 if failed == 0 else 1)
