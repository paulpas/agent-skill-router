#!/bin/bash
set -e

SCRIPTS_DIR="agent-skill-routing-system/scripts"
REPORTS_DIR="."

echo "=============================================="
echo "Testing All 4 Scripts"
echo "=============================================="
echo ""

# Test 1: enforce_bidirectionality.py
echo "TEST 1: enforce_bidirectionality.py"
echo "-----------------------------------"
python3 "$SCRIPTS_DIR/enforce_bidirectionality.py" 2>&1
echo "Exit code: $?"
echo ""

# Test 2: enhance_cncf_relationships.py
echo "TEST 2: enhance_cncf_relationships.py"
echo "--------------------------------------"
python3 "$SCRIPTS_DIR/enhance_cncf_relationships.py" 2>&1
echo "Exit code: $?"
echo ""

# Test 3: connect_programming_skills.py
echo "TEST 3: connect_programming_skills.py"
echo "--------------------------------------"
python3 "$SCRIPTS_DIR/connect_programming_skills.py" 2>&1
echo "Exit code: $?"
echo ""

# Test 4: fix_skill_relationships.py (expected to fail)
echo "TEST 4: fix_skill_relationships.py (expected to fail)"
echo "-------------------------------------------------------"
python3 "$SCRIPTS_DIR/fix_skill_relationships.py" 2>&1 || true
echo "Exit code: $?"
echo ""

echo "=============================================="
echo "All tests completed"
echo "=============================================="
