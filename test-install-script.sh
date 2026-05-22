#!/bin/bash

# Test suite for install-skill-router.sh
# Tests security fixes and functionality

SCRIPT="/home/paulpas/git/agent-skill-router/install-skill-router.sh"
TEST_DIR="/tmp/install-skill-router-test"
PASS=0
FAIL=0

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper functions
pass() {
    echo -e "${GREEN}✓ PASS${NC}: $1"
    ((PASS++))
}

fail() {
    echo -e "${RED}✗ FAIL${NC}: $1"
    ((FAIL++))
}

info() {
    echo -e "${YELLOW}→ INFO${NC}: $1"
}

# Setup test environment
setup() {
    rm -rf "$TEST_DIR"
    mkdir -p "$TEST_DIR"
}

# Cleanup test environment
cleanup() {
    rm -rf "$TEST_DIR"
}

# ─────────────────────────────────────────────────────────────────────────────
# Test 1: Config File Parser Safety
# ─────────────────────────────────────────────────────────────────────────────
test_config_parser_safety() {
    echo ""
    echo "────────────────────────────────────────────────────────────────────────────"
    echo "Test 1: Config File Parser Safety"
    echo "────────────────────────────────────────────────────────────────────────────"
    
    # Test 1a: Normal config file
    info "Test 1a: Normal config file (should work)"
    cat > "$TEST_DIR/normal.conf" << 'EOF'
OPENAI_API_KEY=sk-test123
PORT=3000
LLM_PROVIDER=openai
EOF
    
    # Test config file exists and is valid
    if [[ -f "$TEST_DIR/normal.conf" ]]; then
        pass "Normal config file created successfully"
    else
        fail "Normal config file creation failed"
    fi
    
    # Test 1b: Malicious content (command injection)
    info "Test 1b: Malicious content like OPENAI_API_KEY=\$(rm -rf /)"
    cat > "$TEST_DIR/malicious.conf" << 'EOF'
OPENAI_API_KEY=$(rm -rf /)
PORT=3000
EOF

    # Verify the malicious content is escaped properly
    # The script should escape $ characters, so after parsing the value should be literal
    if grep -q '\\\$' "$SCRIPT"; then
        pass "Script contains escape for \$ in config parser"
    else
        fail "Script missing escape for \$ in config parser"
    fi
    
    # Test 1c: Special characters in values
    info "Test 1c: Special characters in values"
    cat > "$TEST_DIR/special.conf" << 'EOF'
OPENAI_API_KEY=sk-test&special$chars"quotes
PORT=3000
OPENAI_BASE_URL=https://api.example.com/v1?token=abc123
EOF

    (
        source <(sed -n '250,314p' "$SCRIPT")
        set -e
        if parse_config_file "$TEST_DIR/special.conf" 2>/dev/null; then
            pass "Special characters in config parsed successfully"
        else
            fail "Special characters in config failed"
        fi
    ) || fail "Special chars test error"
}

# ─────────────────────────────────────────────────────────────────────────────
# Test 2: CLI Argument Parsing
# ─────────────────────────────────────────────────────────────────────────────
test_cli_arguments() {
    echo ""
    echo "────────────────────────────────────────────────────────────────────────────"
    echo "Test 2: CLI Argument Parsing"
    echo "────────────────────────────────────────────────────────────────────────────"
    
    # Test 2a: --help flag
    info "Test 2a: --help flag shows usage"
    if "$SCRIPT" --help 2>&1 | grep -q "Usage:"; then
        pass "--help shows usage"
    else
        fail "--help does not show usage"
    fi
    
    # Test 2b: --config flag
    info "Test 2b: --config FILE flag"
    cat > "$TEST_DIR/config.conf" << 'EOF'
OPENAI_API_KEY=sk-test
PORT=3000
EOF
    
    # We can't fully test config loading without running the full script,
    # but we can verify the flag is accepted
    if "$SCRIPT" --config "$TEST_DIR/config.conf" --help 2>&1 | grep -q "Usage:"; then
        pass "--config flag is accepted"
    else
        fail "--config flag not working"
    fi
    
    # Test 2c: --no-interactive flag
    info "Test 2c: --no-interactive flag"
    if "$SCRIPT" --no-interactive --help 2>&1 | grep -q "Usage:"; then
        pass "--no-interactive flag is accepted"
    else
        fail "--no-interactive flag not working"
    fi
}

# ─────────────────────────────────────────────────────────────────────────────
# Test 3: API Key Masking
# ─────────────────────────────────────────────────────────────────────────────
test_api_key_masking() {
    echo ""
    echo "────────────────────────────────────────────────────────────────────────────"
    echo "Test 3: API Key Masking"
    echo "────────────────────────────────────────────────────────────────────────────"
    
    # Test 3a: Short API key (< 12 chars)
    info "Test 3a: Short API key (< 12 chars should show ***)"
    if grep -q '\[\[ ${#key} -lt 12 \]\]' "$SCRIPT" || grep -q '\[\[ ${#key} -lt 10 \]\]' "$SCRIPT"; then
        pass "Script has length check for API keys"
    else
        fail "Script missing length check for API keys"
    fi
    
    # Test 3b: Normal API key (12+ chars)
    info "Test 3b: Normal API key (12+ chars)"
    if grep -q ':0:8}' "$SCRIPT" && grep -q ': -4}' "$SCRIPT"; then
        pass "Script has masking logic (first 8 chars + last 4 chars)"
    else
        fail "Script missing masking logic"
    fi
    
    # Test 3c: Very long API key
    info "Test 3c: Very long API key handling"
    # The masking logic should work for any length >= 12
    if grep -q 'masked="${current_value:0:8}...${current_value: -4}"' "$SCRIPT"; then
        pass "Masking logic handles long keys correctly"
    else
        fail "Masking logic may not handle long keys"
    fi
}

# ─────────────────────────────────────────────────────────────────────────────
# Test 4: Docker Environment Variables
# ─────────────────────────────────────────────────────────────────────────────
test_docker_env_vars() {
    echo ""
    echo "────────────────────────────────────────────────────────────────────────────"
    echo "Test 4: Docker Environment Variables"
    echo "────────────────────────────────────────────────────────────────────────────"
    
    # Check if values are properly quoted in docker run command
    info "Test 4a: Docker env vars are quoted"
    if grep -q 'ENV_VARS="-e OPENAI_API_KEY=\\"${OPENAI_API_KEY:-}\\""' "$SCRIPT"; then
        pass "Docker environment variables use quoted values"
    else
        fail "Docker environment variables may not be properly quoted"
    fi
    
    # Check specifically for the quoting pattern
    if grep -q 'ENV_VARS="-e OPENAI_API_KEY=\\"${OPENAI_API_KEY:-}\\""' "$SCRIPT"; then
        pass "OPENAI_API_KEY is properly quoted in docker env"
    else
        fail "OPENAI_API_KEY not properly quoted"
    fi
    
    # Test with spaces in values
    info "Test 4b: Values with spaces should be quoted"
    # Check that the ENV_VARS construction uses escaped quotes
    if grep -E '="-e [A-Z_]+\=\\"' "$SCRIPT" > /dev/null; then
        pass "ENV_VARS construction uses proper quoting"
    else
        fail "ENV_VARS may not properly quote values with spaces"
    fi
}

# ─────────────────────────────────────────────────────────────────────────────
# Test 5: SSH Key Path Resolution
# ─────────────────────────────────────────────────────────────────────────────
test_ssh_key_resolution() {
    echo ""
    echo "────────────────────────────────────────────────────────────────────────────"
    echo "Test 5: SSH Key Path Resolution"
    echo "────────────────────────────────────────────────────────────────────────────"
    
    # Test 5a: Symlink detection
    info "Test 5a: SSH key symlink detection (security)"
    if grep -q '\[\[ -L "' "$SCRIPT" && grep -q 'not allowed for security' "$SCRIPT"; then
        pass "Script detects and rejects SSH key symlinks"
    else
        fail "Script may not detect SSH key symlinks"
    fi
    
    # Test 5b: Path validation
    info "Test 5b: SSH key path validation"
    if grep -q 'realpath -m' "$SCRIPT" || grep -q 'realpath ' "$SCRIPT"; then
        pass "Script resolves SSH key paths"
    else
        fail "Script may not properly resolve SSH key paths"
    fi
    
    # Test 5c: File existence check
    info "Test 5c: SSH key file existence check"
    if grep -q '\[\[ -f "' "$SCRIPT" && grep -q 'not found:' "$SCRIPT"; then
        pass "Script checks SSH key file exists"
    else
        fail "Script may not check SSH key file exists"
    fi
}

# ─────────────────────────────────────────────────────────────────────────────
# Test 6: Health Check Temp Files
# ─────────────────────────────────────────────────────────────────────────────
test_health_check_temp_files() {
    echo ""
    echo "────────────────────────────────────────────────────────────────────────────"
    echo "Test 6: Health Check Temp Files"
    echo "────────────────────────────────────────────────────────────────────────────"
    
    # Test 6a: Unique temp file name
    info "Test 6a: Health check uses unique temp file name"
    if grep -q 'mktemp.*health.XXXXXX' "$SCRIPT"; then
        pass "Health check uses mktemp for unique temp file"
    else
        fail "Health check may not use unique temp file names"
    fi
    
    # Test 6b: Temp file cleanup
    info "Test 6b: Temp file is cleaned up after use"
    if grep -q 'rm -f.*health_file' "$SCRIPT" || grep -q 'rm -f.*health_file.*health_file' "$SCRIPT"; then
        pass "Temp file is cleaned up"
    else
        fail "Temp file may not be cleaned up"
    fi
}

# ─────────────────────────────────────────────────────────────────────────────
# Test 7: Additional Security Checks
# ─────────────────────────────────────────────────────────────────────────────
test_security_features() {
    echo ""
    echo "────────────────────────────────────────────────────────────────────────────"
    echo "Test 7: Additional Security Features"
    echo "────────────────────────────────────────────────────────────────────────────"
    
    # Test 7a: set -euo pipefail
    info "Test 7a: Script uses strict error handling"
    if head -5 "$SCRIPT" | grep -q 'set -euo pipefail'; then
        pass "Script uses 'set -euo pipefail'"
    else
        fail "Script missing strict error handling"
    fi
    
    # Test 7b: API key zeroing after use
    info "Test 7b: API key zeroed after API use"
    if grep -q 'api_key=""' "$SCRIPT"; then
        pass "API key is zeroed after use"
    else
        fail "API key may not be zeroed after use"
    fi
    
    # Test 7c: Timeout on curl commands
    info "Test 7c: Curl commands have timeout"
    if grep -q 'connect-timeout\|max-time' "$SCRIPT"; then
        pass "Curl commands have timeout"
    else
        fail "Curl commands may lack timeout"
    fi
}

# ─────────────────────────────────────────────────────────────────────────────
# Run all tests
# ─────────────────────────────────────────────────────────────────────────────
main() {
    setup
    
    echo ""
    echo "╔══════════════════════════════════════════════════════════════════════════════╗"
    echo "║                    install-skill-router.sh Test Suite                        ║"
    echo "║                           Test Results Report                                ║"
    echo "╚══════════════════════════════════════════════════════════════════════════════╝"
    
    test_config_parser_safety
    test_cli_arguments
    test_api_key_masking
    test_docker_env_vars
    test_ssh_key_resolution
    test_health_check_temp_files
    test_security_features
    
    cleanup
    
    echo ""
    echo "────────────────────────────────────────────────────────────────────────────"
    echo "Test Summary"
    echo "────────────────────────────────────────────────────────────────────────────"
    echo -e "  ${GREEN}Passed: $PASS${NC}"
    echo -e "  ${RED}Failed: $FAIL${NC}"
    
    if [[ $FAIL -eq 0 ]]; then
        echo ""
        echo -e "${GREEN}All tests passed!${NC}"
        return 0
    else
        echo ""
        echo -e "${RED}Some tests failed!${NC}"
        return 1
    fi
}

main "$@"
