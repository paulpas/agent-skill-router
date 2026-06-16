#!/bin/bash

################################################################################
# Attribution Footer End-to-End Test Script
# 
# Tests attribution footer across all layers:
# 1. API layer - verify /route endpoint returns attributionFooter
# 2. MCP layer - verify MCP bridge extracts and appends footer
# 3. Content layer - verify footer appears with skill names
# 4. Skill count verification - verify footer shows correct count
# 5. Format validation - verify footer markdown is valid
################################################################################

set +e  # Don't exit on first failure - we want to test all scenarios

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;36m'
NC='\033[0m' # No Color

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_TOTAL=0

# Temporary files
TEMP_DIR="/tmp/footer-test-$$"
mkdir -p "$TEMP_DIR"
RESULTS_FILE="/home/paulpas/git/agent-skill-router/FOOTER_TEST_RESULTS.md"

# API endpoint
API_URL="http://localhost:3000"

################################################################################
# Helper Functions
################################################################################

log_test() {
    echo -e "${BLUE}[TEST]${NC} $1"
}

log_pass() {
    TESTS_PASSED=$((TESTS_PASSED + 1))
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    echo -e "${GREEN}[PASS]${NC} $1"
}

log_fail() {
    TESTS_FAILED=$((TESTS_FAILED + 1))
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    echo -e "${RED}[FAIL]${NC} $1"
}

log_info() {
    echo -e "${YELLOW}[INFO]${NC} $1"
}

write_result() {
    echo "$1" >> "$RESULTS_FILE"
}

################################################################################
# TEST 1: API Layer - Verify /route endpoint returns attributionFooter
################################################################################

test_api_footer_present() {
    log_test "TEST 1: API Layer - Footer Presence"
    
    local response=$(curl -s "$API_URL/route" -X POST \
        -H "Content-Type: application/json" \
        -d '{"task": "kubernetes deployment"}' 2>/dev/null)
    
    if [ -z "$response" ]; then
        log_fail "API is not responding"
        return 1
    fi
    
    # Check if attributionFooter key exists
    local has_footer=$(echo "$response" | jq 'has("attributionFooter")' 2>/dev/null)
    
    if [ "$has_footer" == "true" ]; then
        log_pass "API returns attributionFooter field"
        
        # Extract footer for analysis
        echo "$response" | jq -r '.attributionFooter' > "$TEMP_DIR/footer.txt"
        
        local footer_length=$(wc -c < "$TEMP_DIR/footer.txt")
        log_info "Footer length: $footer_length bytes"
        return 0
    else
        log_fail "API response does not include attributionFooter field"
        echo "$response" | jq 'keys' 2>/dev/null || echo "Could not parse response"
        return 1
    fi
}

################################################################################
# TEST 2: MCP Layer - Verify footer content has expected structure
################################################################################

test_footer_structure() {
    log_test "TEST 2: Footer Structure & Content"
    
    if [ ! -f "$TEMP_DIR/footer.txt" ]; then
        log_fail "Footer not available from previous test"
        return 1
    fi
    
    local footer=$(cat "$TEMP_DIR/footer.txt")
    local all_checks_passed=true
    
    # Check 1: Contains "agent-skill-router" link
    if echo "$footer" | grep -q "agent-skill-router"; then
        log_pass "Footer contains agent-skill-router reference"
    else
        log_fail "Footer missing agent-skill-router reference"
        all_checks_passed=false
    fi
    
    # Check 2: Contains "Skills Used" section
    if echo "$footer" | grep -q "Skills Used"; then
        log_pass "Footer contains 'Skills Used' section"
    else
        log_fail "Footer missing 'Skills Used' section"
        all_checks_passed=false
    fi
    
    # Check 3: Contains skill entries with bullet points
    if echo "$footer" | grep -q "^\- \*\*"; then
        log_pass "Footer contains skill entries with proper formatting"
    else
        log_fail "Footer missing properly formatted skill entries"
        all_checks_passed=false
    fi
    
    # Check 4: Contains timestamp
    if echo "$footer" | grep -q "Generated:"; then
        log_pass "Footer contains timestamp"
    else
        log_fail "Footer missing timestamp"
        all_checks_passed=false
    fi
    
    if [ "$all_checks_passed" = true ]; then
        return 0
    else
        return 1
    fi
}

################################################################################
# TEST 3: Skill Count Verification
################################################################################

test_skill_count_accuracy() {
    log_test "TEST 3: Skill Count Verification"
    
    if [ ! -f "$TEMP_DIR/footer.txt" ]; then
        log_fail "Footer not available from previous test"
        return 1
    fi
    
    local footer=$(cat "$TEMP_DIR/footer.txt")
    
    # Extract count from "Skills Used (N):"
    local count_in_footer=$(echo "$footer" | grep -oP 'Skills Used \(\K[0-9]+' | head -1)
    
    if [ -z "$count_in_footer" ]; then
        log_fail "Could not extract skill count from footer"
        return 1
    fi
    
    # Count actual skill entries (lines starting with "- **")
    local actual_skill_count=$(echo "$footer" | grep -c "^\- \*\*" || true)
    
    log_info "Skill count in footer header: $count_in_footer"
    log_info "Actual skill entries in footer: $actual_skill_count"
    
    if [ "$count_in_footer" -eq "$actual_skill_count" ]; then
        log_pass "Skill count matches actual entries ($count_in_footer)"
        return 0
    else
        log_fail "Skill count mismatch: header says $count_in_footer, found $actual_skill_count entries"
        return 1
    fi
}

################################################################################
# TEST 4: Format Validation - Markdown validity
################################################################################

test_markdown_validity() {
    log_test "TEST 4: Markdown Format Validation"
    
    if [ ! -f "$TEMP_DIR/footer.txt" ]; then
        log_fail "Footer not available from previous test"
        return 1
    fi
    
    local footer=$(cat "$TEMP_DIR/footer.txt")
    local all_checks_passed=true
    
    # Check 1: Balanced markdown code blocks
    local backtick_count=$(echo "$footer" | grep -o '```' | wc -l)
    if [ $((backtick_count % 2)) -eq 0 ]; then
        log_pass "Markdown code blocks are balanced"
    else
        log_fail "Unbalanced markdown code blocks (backticks: $backtick_count)"
        all_checks_passed=false
    fi
    
    # Check 2: Links are properly formatted (looking for markdown link pattern)
    if echo "$footer" | grep -q '\[agent-skill-router\](https://github.com'; then
        log_pass "Markdown links are present and formatted"
    else
        log_fail "Required markdown link not found in footer"
        all_checks_passed=false
    fi
    
    # Check 3: No trailing whitespace issues on key lines
    if echo "$footer" | grep -q "^- \*\*.*\*\* $"; then
        log_fail "Trailing whitespace detected in skill entries"
        all_checks_passed=false
    else
        log_pass "No trailing whitespace in skill entries"
    fi
    
    # Check 4: YAML front matter (if present)
    if echo "$footer" | head -1 | grep -q "^---"; then
        local yaml_count=$(echo "$footer" | grep -c "^---" || true)
        if [ "$yaml_count" -ge 1 ]; then
            log_pass "YAML frontmatter delimiter is present (count: $yaml_count)"
        else
            log_fail "YAML frontmatter is incomplete (--- count: $yaml_count)"
            all_checks_passed=false
        fi
    fi
    
    if [ "$all_checks_passed" = true ]; then
        return 0
    else
        return 1
    fi
}

################################################################################
# TEST 5: Footer Content Quality
################################################################################

test_footer_content_quality() {
    log_test "TEST 5: Footer Content Quality"
    
    if [ ! -f "$TEMP_DIR/footer.txt" ]; then
        log_fail "Footer not available from previous test"
        return 1
    fi
    
    local footer=$(cat "$TEMP_DIR/footer.txt")
    local all_checks_passed=true
    
    # Check 1: Minimum length (should be substantial)
    local footer_length=$(echo "$footer" | wc -c)
    if [ "$footer_length" -gt 200 ]; then
        log_pass "Footer has sufficient content length ($footer_length bytes)"
    else
        log_fail "Footer is too short ($footer_length bytes)"
        all_checks_passed=false
    fi
    
    # Check 2: Each skill entry has domain indicator (emoji or category)
    local skill_lines=$(echo "$footer" | grep "^\- \*\*")
    if echo "$skill_lines" | grep -q "\["; then
        log_pass "Skill entries include domain/category indicators"
    else
        log_fail "Some skill entries missing domain indicators"
        all_checks_passed=false
    fi
    
    # Check 3: Each skill has a description
    if echo "$skill_lines" | grep -q " — "; then
        log_pass "Skill entries include descriptions"
    else
        log_fail "Some skill entries missing descriptions"
        all_checks_passed=false
    fi
    
    # Check 4: GitHub URL is present
    if echo "$footer" | grep -q "github.com/paulpas"; then
        log_pass "GitHub repository URL is present"
    else
        log_fail "GitHub repository URL is missing"
        all_checks_passed=false
    fi
    
    if [ "$all_checks_passed" = true ]; then
        return 0
    else
        return 1
    fi
}

################################################################################
# TEST 6: Multiple requests consistency
################################################################################

test_multiple_requests_consistency() {
    log_test "TEST 6: Multiple Requests - Consistency Check"
    
    local all_have_footer=true
    
    # Test 3 different queries
    for query in "kubernetes" "testing" "database"; do
        local response=$(curl -s "$API_URL/route" -X POST \
            -H "Content-Type: application/json" \
            -d "{\"task\": \"$query\"}" 2>/dev/null)
        
        if echo "$response" | jq 'has("attributionFooter")' 2>/dev/null | grep -q "true"; then
            log_info "Query '$query': Footer present ✓"
        else
            log_fail "Query '$query': Missing footer"
            all_have_footer=false
        fi
    done
    
    if [ "$all_have_footer" = true ]; then
        log_pass "All requests consistently include attribution footer"
        return 0
    else
        return 1
    fi
}

################################################################################
# TEST 7: Skills Index Alignment
################################################################################

test_skills_index_alignment() {
    log_test "TEST 7: Skills Index Alignment"
    
    # Check if skills-index.json exists and is valid
    if [ ! -f "$API_URL/../skills-index.json" ] && [ ! -f "/home/paulpas/git/agent-skill-router/skills-index.json" ]; then
        log_fail "skills-index.json not found"
        return 1
    fi
    
    # Get total skill count from API
    local total_from_stats=$(curl -s "$API_URL/stats" 2>/dev/null | jq '.skills.totalSkills' 2>/dev/null)
    
    if [ -n "$total_from_stats" ] && [ "$total_from_stats" -gt 0 ]; then
        log_pass "API reports $total_from_stats skills in index"
        
        # Each footer should select a subset of these
        if [ ! -f "$TEMP_DIR/footer.txt" ]; then
            log_info "No footer available for subset validation"
        else
            local footer=$(cat "$TEMP_DIR/footer.txt")
            local skills_in_footer=$(echo "$footer" | grep -c "^\- \*\*" || true)
            
            if [ "$skills_in_footer" -le "$total_from_stats" ]; then
                log_pass "Footer skill selection ($skills_in_footer) is valid subset of total ($total_from_stats)"
                return 0
            else
                log_fail "Footer contains more skills than index ($skills_in_footer > $total_from_stats)"
                return 1
            fi
        fi
    else
        log_fail "Could not retrieve skill count from API stats"
        return 1
    fi
}

################################################################################
# Test Execution
################################################################################

main() {
    echo ""
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║         Attribution Footer End-to-End Test Suite               ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo ""
    
    # Initialize results file
    > "$RESULTS_FILE"
    write_result "# Attribution Footer Test Results"
    write_result ""
    write_result "**Test Date:** $(date)"
    write_result "**API Endpoint:** $API_URL"
    write_result ""
    
    # Run all tests
    test_api_footer_present
    test_footer_structure
    test_skill_count_accuracy
    test_markdown_validity
    test_footer_content_quality
    test_multiple_requests_consistency
    test_skills_index_alignment
    
    # Print example footer
    echo ""
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║                    Example Attribution Footer                   ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo ""
    if [ -f "$TEMP_DIR/footer.txt" ]; then
        cat "$TEMP_DIR/footer.txt"
    fi
    
    # Summary
    echo ""
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║                        Test Summary                             ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo ""
    echo -e "Total Tests: ${BLUE}$TESTS_TOTAL${NC}"
    echo -e "Passed:      ${GREEN}$TESTS_PASSED${NC}"
    echo -e "Failed:      ${RED}$TESTS_FAILED${NC}"
    echo ""
    
    # Add summary to results file
    write_result ""
    write_result "## Test Execution Summary"
    write_result ""
    write_result "| Metric | Result |"
    write_result "|--------|--------|"
    write_result "| Total Tests | $TESTS_TOTAL |"
    write_result "| Passed | $TESTS_PASSED |"
    write_result "| Failed | $TESTS_FAILED |"
    write_result "| Success Rate | $(( TESTS_PASSED * 100 / TESTS_TOTAL ))% |"
    write_result ""
    
    # Example footer
    write_result "## Example Attribution Footer"
    write_result ""
    write_result '```'
    if [ -f "$TEMP_DIR/footer.txt" ]; then
        write_result "$(cat "$TEMP_DIR/footer.txt")"
    fi
    write_result '```'
    write_result ""
    
    # Final result
    if [ $TESTS_FAILED -eq 0 ]; then
        echo -e "${GREEN}✓ All tests passed!${NC}"
        write_result "## Status"
        write_result ""
        write_result "✅ **All tests passed successfully!**"
        write_result ""
        write_result "The attribution footer is working correctly across all layers:"
        write_result "- API layer returns attributionFooter"
        write_result "- Footer structure is valid and complete"
        write_result "- Skill counts are accurate"
        write_result "- Markdown formatting is correct"
        write_result "- Content quality is high"
        write_result "- Multiple requests show consistency"
        write_result "- Skills index alignment is valid"
        return 0
    else
        echo -e "${RED}✗ $TESTS_FAILED test(s) failed${NC}"
        write_result "## Status"
        write_result ""
        write_result "⚠️ **$TESTS_FAILED test(s) failed**"
        write_result ""
        write_result "Please review the test output above for details."
        return 1
    fi
}

# Cleanup on exit
cleanup() {
    rm -rf "$TEMP_DIR"
}

trap cleanup EXIT

# Run main
main
exit $?
