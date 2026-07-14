#!/bin/bash

# Static/unit-style tests for install-skill-router.sh.
# These checks intentionally avoid Docker build/run and real dialog sessions.

SCRIPT="${SCRIPT:-/home/paulpas/git/agent-skill-router/install-skill-router.sh}"
TEST_DIR="${TEST_DIR:-/tmp/install-skill-router-test}"
PASS=0
FAIL=0

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

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

setup() {
    rm -rf "$TEST_DIR"
    mkdir -p "$TEST_DIR"
}

cleanup() {
    rm -rf "$TEST_DIR"
}

assert_grep() {
    local pattern="$1"
    local message="$2"

    if grep -Eq "$pattern" "$SCRIPT"; then
        pass "$message"
    else
        fail "$message"
    fi
}

assert_not_grep() {
    local pattern="$1"
    local message="$2"

    if grep -Eq "$pattern" "$SCRIPT"; then
        fail "$message"
    else
        pass "$message"
    fi
}

test_config_parser_safety() {
    echo ""
    echo "────────────────────────────────────────────────────────────────────────────"
    echo "Test 1: Config File Parser Safety"
    echo "────────────────────────────────────────────────────────────────────────────"

    cat > "$TEST_DIR/special.conf" << 'EOF'
OPENAI_API_KEY=sk-test&special$chars"quotes
PORT=3000
OPENAI_BASE_URL=https://api.example.com/v1?token=abc123
EOF

    if [[ -f "$TEST_DIR/special.conf" ]]; then
        pass "Special-character config fixture created"
    else
        fail "Special-character config fixture created"
    fi

    assert_grep 'declare -g "\$key=\$value"' "Config parser assigns values with declare -g, not eval"
    assert_grep 'Do not mangle the value with backslash-escapes' "Config parser preserves literal special characters"
    assert_not_grep 'eval .*\$key' "Config parser does not eval config keys or values"
}

test_cli_arguments() {
    echo ""
    echo "────────────────────────────────────────────────────────────────────────────"
    echo "Test 2: CLI Argument Parsing"
    echo "────────────────────────────────────────────────────────────────────────────"

    info "Test 2a: --help flag shows usage"
    if "$SCRIPT" --help 2>&1 | grep -q "Usage:"; then
        pass "--help shows usage"
    else
        fail "--help shows usage"
    fi

    info "Test 2b: --config FILE flag is accepted before help exits"
    cat > "$TEST_DIR/config.conf" << 'EOF'
OPENAI_API_KEY=sk-test-value
PORT=3000
EOF
    if "$SCRIPT" --config "$TEST_DIR/config.conf" --help 2>&1 | grep -q "Usage:"; then
        pass "--config flag accepted"
    else
        fail "--config flag accepted"
    fi

    info "Test 2c: --no-interactive flag is accepted before help exits"
    if "$SCRIPT" --no-interactive --help 2>&1 | grep -q "Usage:"; then
        pass "--no-interactive flag accepted"
    else
        fail "--no-interactive flag accepted"
    fi
}

test_secret_masking() {
    echo ""
    echo "────────────────────────────────────────────────────────────────────────────"
    echo "Test 3: Secret Masking"
    echo "────────────────────────────────────────────────────────────────────────────"

    assert_grep 'mask_secret\(\)' "Shared mask_secret helper exists"
    assert_grep '\$\{secret:0:8\}\.\.\.\$\{secret: -4\}' "Secrets are masked with first 8 and last 4 characters"
    assert_grep 'Current value: \$current_masked' "Password dialog shows only masked current secret"
    assert_not_grep 'echo -e .*\[DEBUG\]' "No noisy DEBUG echo statements remain"
}

test_docker_env_vars() {
    echo ""
    echo "────────────────────────────────────────────────────────────────────────────"
    echo "Test 4: Docker Environment Variables"
    echo "────────────────────────────────────────────────────────────────────────────"

    assert_grep 'ENV_ARGS=\(\)' "Docker environment arguments use an array"
    assert_grep 'ENV_ARGS\+=\(-e "OPENAI_API_KEY=\$\{OPENAI_API_KEY:-\}"\)' "OPENAI_API_KEY is passed as one quoted array element"
    assert_grep 'docker run -d' "Docker run command exists"
    assert_grep '"\$\{ENV_ARGS\[@\]\}"' "Docker run expands ENV_ARGS safely"
}

test_ssh_key_resolution() {
    echo ""
    echo "────────────────────────────────────────────────────────────────────────────"
    echo "Test 5: SSH Key Path Resolution"
    echo "────────────────────────────────────────────────────────────────────────────"

    assert_grep '\[\[ -L "\$SSH_KEY_PATH" \]\]' "Script detects and rejects SSH key symlinks"
    assert_grep 'realpath -m "\$SSH_KEY_PATH"' "Script resolves SSH key paths"
    assert_grep '\[\[ -f "\$SSH_KEY_PATH" && -r "\$SSH_KEY_PATH" \]\]' "Script checks SSH key file exists and is readable"
    assert_grep 'SSH_VOLUMES=\(\)' "SSH volumes are built as an array"
    assert_grep 'SSH_VOLUMES\+=\(-v "\$resolved_path:/home/appuser/\.ssh/id_rsa:ro"\)' "SSH key volume is appended as quoted array elements"
    assert_grep 'SSH_VOLUMES\+=\(-v "\$resolved_path:/tmp/ssh-agent\.sock:ro"\)' "SSH agent volume is appended as quoted array elements"
    assert_grep 'SSH_VOLUMES\+=\(-v "\$resolved_path:/home/appuser/\.ssh/known_hosts:ro"\)' "SSH known_hosts volume is appended as quoted array elements"
    assert_grep 'VOLUMES\+=\("\$\{SSH_VOLUMES\[@\]\}"\)' "SSH volume array is appended with quoted expansion"
    assert_not_grep 'VOLUMES\+=\(\$SSH_VOLUMES\)' "No unsafe SSH volume word-splitting append remains"
    assert_not_grep 'SSH_VOLUMES="' "SSH volumes are not accumulated in a string"
}

test_health_check_temp_files() {
    echo ""
    echo "────────────────────────────────────────────────────────────────────────────"
    echo "Test 6: Health Check Temp Files"
    echo "────────────────────────────────────────────────────────────────────────────"

    assert_grep 'mktemp /tmp/skill-router-health\.XXXXXX\.json' "Health check uses mktemp for unique temp file"
    assert_grep 'rm -f "\$health_file"' "Health check temp file is removed"
}

test_dialog_interactive_flow() {
    echo ""
    echo "────────────────────────────────────────────────────────────────────────────"
    echo "Test 7: Dialog Interactive Flow"
    echo "────────────────────────────────────────────────────────────────────────────"

    assert_grep 'has_interactive_tty\(\)' "TTY detection helper exists"
    assert_grep 'can_use_dialog\(\)' "dialog capability helper exists"
    assert_grep 'command -v dialog' "dialog command detection exists"
    assert_grep 'dialog_menu\(\)' "dialog menu helper exists"
    assert_grep 'dialog_input\(\)' "dialog input helper exists"
    assert_grep 'dialog_password\(\)' "dialog password helper exists"
    assert_grep 'dialog_confirm\(\)' "dialog confirmation helper exists"
    assert_grep 'providers[[:space:]]+"Configure LLM and embedding providers"' "Main menu includes providers tag"
    assert_grep 'networking[[:space:]]+"Configure host port"' "Main menu includes networking tag"
    assert_grep 'start[[:space:]]+"Start installation after final confirmation"' "Main menu includes explicit start tag"
    assert_grep 'quit[[:space:]]+"Quit without installing"' "Main menu includes explicit quit tag"
    assert_grep 'dialog_confirm_start' "Start path requires final confirmation"
    assert_grep 'run_interactive_configuration' "Interactive mode routes through configuration loop"
    assert_grep 'Top-level Cancel/ESC is an immediate, non-success sentinel' "Main menu Cancel/ESC semantics are documented"

    local main_menu_cancel_block
    main_menu_cancel_block=$(awk '/if ! action=\$\(dialog_menu "Main Menu"/,/^[[:space:]]*fi$/' "$SCRIPT")
    if echo "$main_menu_cancel_block" | grep -q 'return 130'; then
        pass "Main menu Cancel/ESC returns non-success sentinel"
    else
        fail "Main menu Cancel/ESC returns non-success sentinel"
    fi

    if echo "$main_menu_cancel_block" | grep -q 'dialog_confirm_quit'; then
        fail "Main menu Cancel/ESC does not open quit confirmation"
    else
        pass "Main menu Cancel/ESC does not open quit confirmation"
    fi

    assert_not_grep 'tui_main_menu' "Broken raw tui_main_menu is not referenced"
    assert_not_grep 'stty -echo -icanon' "Raw stty TUI mode is not used"
}

test_dialog_capture_safety() {
    echo ""
    echo "────────────────────────────────────────────────────────────────────────────"
    echo "Test 8: Strict-Mode Dialog Capture Safety"
    echo "────────────────────────────────────────────────────────────────────────────"

    local unsafe_capture
    unsafe_capture=$(grep -nE '^[[:space:]]*[A-Za-z_][A-Za-z0-9_]*=\$\(dialog[[:space:]]' "$SCRIPT" || true)
    if [[ -z "$unsafe_capture" ]]; then
        pass "No direct dialog command substitution outside if-capture pattern"
    else
        fail "Unsafe dialog capture found: $unsafe_capture"
    fi

    assert_grep 'if choice=\$\(dialog' "Menu output is captured in if assignment"
    assert_grep 'if value=\$\(dialog' "Input output is captured in if assignment"
    assert_grep 'if secret=\$\(dialog' "Password output is captured in if assignment"
    assert_grep 'status=\$\?' "Dialog non-zero statuses are captured explicitly"
    assert_grep '1\|255\) return 130' "Cancel and ESC map to an intentional cancel path"
    assert_not_grep 'dialog --print-maxsize' "No raw TUI probing remnants remain"
    assert_not_grep '^[[:space:]]*[A-Za-z_][A-Za-z0-9_]*=\$\(dialog_' "Dialog helper captures use conditional assignments"
}

test_security_features() {
    echo ""
    echo "────────────────────────────────────────────────────────────────────────────"
    echo "Test 9: Additional Security Checks"
    echo "────────────────────────────────────────────────────────────────────────────"

    if sed -n '1,5p' "$SCRIPT" | grep -q 'set -euo pipefail'; then
        pass "Script uses set -euo pipefail"
    else
        fail "Script uses set -euo pipefail"
    fi

    assert_grep 'api_key=""' "API key is zeroed after model API use"
    assert_grep 'connect-timeout|max-time' "Curl commands have timeout"
    assert_not_grep 'eval ' "Script does not use eval"
}

main() {
    setup

    echo ""
    echo "╔══════════════════════════════════════════════════════════════════════════════╗"
    echo "║                    install-skill-router.sh Test Suite                        ║"
    echo "║                           Test Results Report                                ║"
    echo "╚══════════════════════════════════════════════════════════════════════════════╝"

    test_config_parser_safety
    test_cli_arguments
    test_secret_masking
    test_docker_env_vars
    test_ssh_key_resolution
    test_health_check_temp_files
    test_dialog_interactive_flow
    test_dialog_capture_safety
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
    fi

    echo ""
    echo -e "${RED}Some tests failed!${NC}"
    return 1
}

main "$@"
