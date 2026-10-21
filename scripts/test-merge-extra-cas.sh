#!/bin/sh
# ─────────────────────────────────────────────────────────────────────────────
# Test suite for agent-skill-routing-system/merge-extra-cas.sh
#
# Verifies the CA-merge mechanism used by the skill-router container on
# TLS-interception networks (Zscaler, Netskope, ...):
#   - candidate collection from scan dirs (missing dirs skipped silently)
#   - validation (files without BEGIN CERTIFICATE are skipped with a warning)
#   - Node bundle assembly (user-provided NODE_EXTRA_CA_CERTS preserved first)
#   - NSS import via certutil (delete-before-add idempotency, stable nicknames)
#   - failure-safe behavior (missing certutil, empty scan dirs, exit code 0)
#
# POSIX sh on purpose: this suite also runs INSIDE the container image
# (busybox ash) via the smoke-test workflow:  sh /app/tests/test-merge-extra-cas.sh
#
# Fixtures are deterministic: two self-signed certs (CN=TestRootA / CN=TestRootB)
# plus one invalid file. certutil is stubbed with a PATH shim that records its
# arguments to a log file.
# ─────────────────────────────────────────────────────────────────────────────

set -u

SCRIPTS_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" 2>/dev/null && pwd)
[ -n "$SCRIPTS_DIR" ] || SCRIPTS_DIR="."

# Locate the merge script:
#   1. explicit override (MERGE_SCRIPT env)
#   2. in-image layout:   /app/tests/../merge-extra-cas.sh  -> /app/merge-extra-cas.sh
#   3. repo layout:       scripts/../agent-skill-routing-system/merge-extra-cas.sh
if [ -n "${MERGE_SCRIPT:-}" ]; then
    MERGE_SCRIPT="$MERGE_SCRIPT"
elif [ -f "$SCRIPTS_DIR/../merge-extra-cas.sh" ]; then
    MERGE_SCRIPT="$SCRIPTS_DIR/../merge-extra-cas.sh"
else
    MERGE_SCRIPT="$SCRIPTS_DIR/../agent-skill-routing-system/merge-extra-cas.sh"
fi

TEST_DIR=$(mktemp -d "${TMPDIR:-/tmp}/ca-merge-test.XXXXXX" 2>/dev/null) || TEST_DIR=""
[ -n "$TEST_DIR" ] || { echo "FATAL: cannot create temp dir" >&2; exit 1; }
trap 'rm -rf "$TEST_DIR"' EXIT INT TERM

PASS=0
FAIL=0
COLOR_RED='\033[0;31m'
COLOR_GREEN='\033[0;32m'
COLOR_RESET='\033[0m'

pass() {
    printf "${COLOR_GREEN}PASS${COLOR_RESET}: %s\n" "$1"
    PASS=$((PASS + 1))
}

fail() {
    printf "${COLOR_RED}FAIL${COLOR_RESET}: %s\n" "$1"
    FAIL=$((FAIL + 1))
}

section() {
    printf "\n--- %s ---\n" "$1"
}

# Run the merge script SOURCED in a fresh subshell with a controlled
# environment. stdout is captured to $3. Positional args:
#   $1 scan dirs   $2 bundle out   $3 output file   $4 stub log
#   $5 PATH value  $6 user CA file (empty = unset)
run_merge() {
    sh -c '
        export EXTRA_CA_SCAN_DIRS="$1"
        export EXTRA_CA_BUNDLE_OUT="$2"
        export NSS_DB_DIR="$4"
        export CERTUTIL_STUB_LOG="$5"
        export PATH="$6"
        if [ -n "$7" ]; then
            export NODE_EXTRA_CA_CERTS="$7"
        else
            unset NODE_EXTRA_CA_CERTS
        fi
        . "$8"
    ' _ "$1" "$2" "$3" "$4" "$5" "$6" "$7" "$MERGE_SCRIPT" > "$3" 2>&1
}

# Same as run_merge, but also prints the resulting NODE_EXTRA_CA_CERTS value
# (or __UNSET__) to the captured file after sourcing completes.
run_merge_capture_env() {
    sh -c '
        export EXTRA_CA_SCAN_DIRS="$1"
        export EXTRA_CA_BUNDLE_OUT="$2"
        export NSS_DB_DIR="$4"
        export CERTUTIL_STUB_LOG="$5"
        export PATH="$6"
        if [ -n "$7" ]; then
            export NODE_EXTRA_CA_CERTS="$7"
        else
            unset NODE_EXTRA_CA_CERTS
        fi
        . "$8"
        printf "%s" "${NODE_EXTRA_CA_CERTS:-__UNSET__}"
    ' _ "$1" "$2" "$3" "$4" "$5" "$6" "$7" "$MERGE_SCRIPT" > "$3" 2>&1
}

# Print the subject line numbers of every cert in a bundle (file order).
bundle_subjects() {
    openssl crl2pkcs7 -nocrl -certfile "$1" 2>/dev/null | openssl pkcs7 -print_certs -noout 2>/dev/null
}

# Assert that every -A (add) in the certutil stub log was preceded by a -D
# (delete) for the same nickname. Exits non-zero on the first violation.
assert_delete_before_add() {
    awk '
        {
            is_add = 0; is_del = 0; nick = ""
            for (i = 1; i <= NF; i++) {
                if ($i == "-A") is_add = 1
                if ($i == "-D") is_del = 1
                if ($i == "-n") nick = $(i + 1)
            }
            if (is_del && nick != "") lastdel[nick] = NR
            if (is_add && nick != "") {
                if (!(nick in lastdel) || lastdel[nick] >= NR) {
                    print "missing delete-before-add for " nick " at line " NR
                    bad = 1
                }
            }
        }
        END { exit bad ? 1 : 0 }
    ' "$1"
}

# ── Fixtures ──────────────────────────────────────────────────────────────────

setup_fixtures() {
    # Two deterministic self-signed certs + one invalid file.
    openssl req -x509 -newkey rsa:2048 -nodes \
        -keyout "$TEST_DIR/testroota.key" -out "$TEST_DIR/scan/TestRootA.pem" \
        -days 3650 -subj "/CN=TestRootA" 2>/dev/null
    openssl req -x509 -newkey rsa:2048 -nodes \
        -keyout "$TEST_DIR/testrootb.key" -out "$TEST_DIR/scan/TestRootB.pem" \
        -days 3650 -subj "/CN=TestRootB" 2>/dev/null
    printf 'THIS IS NOT A CERTIFICATE\n' > "$TEST_DIR/scan/invalid.pem"

    # A separate user-provided CA (for the pre-set NODE_EXTRA_CA_CERTS case).
    openssl req -x509 -newkey rsa:2048 -nodes \
        -keyout "$TEST_DIR/testrootuser.key" -out "$TEST_DIR/user-ca.pem" \
        -days 3650 -subj "/CN=TestRootUser" 2>/dev/null

    # certutil stub: records every invocation (args joined by spaces).
    mkdir -p "$TEST_DIR/stubbin"
    cat > "$TEST_DIR/stubbin/certutil" <<'STUB'
#!/bin/sh
printf '%s\n' "$*" >> "$CERTUTIL_STUB_LOG"
exit 0
STUB
    chmod +x "$TEST_DIR/stubbin/certutil"

    # Restrictive PATH without certutil (for the certutil-missing case).
    # Symlinks to every external tool the merge script may invoke, so the
    # scenario stays hermetic even on hosts/containers that ship a real
    # certutil in /usr/bin.
    mkdir -p "$TEST_DIR/fakebin"
    for t in mkdir mktemp sort grep cat chmod awk cp dirname basename rm chown; do
        tool_path=$(command -v "$t" 2>/dev/null) || continue
        ln -s "$tool_path" "$TEST_DIR/fakebin/$t" 2>/dev/null || true
    done
}

# ── Scenarios ─────────────────────────────────────────────────────────────────

test_basic_merge() {
    section "Scenario 1: basic merge (two valid certs + one invalid file)"

    SCAN_DIR="$TEST_DIR/scan"
    BUNDLE="$TEST_DIR/out/bundle.pem"
    NSS_DB="$TEST_DIR/nssdb-basic"
    STUB_LOG="$TEST_DIR/basic-certutil.log"
    OUT="$TEST_DIR/basic.out"

    rm -rf "$TEST_DIR/out" "$NSS_DB"
    : > "$STUB_LOG"
    mkdir -p "$TEST_DIR/out"

    run_merge "$SCAN_DIR" "$BUNDLE" "$OUT" "$NSS_DB" "$STUB_LOG" \
        "$TEST_DIR/stubbin:$PATH" ""
    RC=$?

    # (i) exit code 0
    if [ "$RC" -eq 0 ]; then pass "exit code is 0"; else fail "exit code is 0 (got $RC)"; fi

    # (a) bundle exists, contains both valid certs, not the invalid file
    if [ -f "$BUNDLE" ]; then pass "bundle file created at $BUNDLE"; else fail "bundle file created"; fi
    CERT_COUNT=$(grep -c "BEGIN CERTIFICATE" "$BUNDLE" 2>/dev/null) || CERT_COUNT=0
    if [ "$CERT_COUNT" = "2" ]; then pass "bundle contains exactly 2 certificates"; else fail "bundle contains exactly 2 certificates (got $CERT_COUNT)"; fi

    cat "$SCAN_DIR/TestRootA.pem" "$SCAN_DIR/TestRootB.pem" > "$TEST_DIR/expected.bundle"
    if diff -q "$BUNDLE" "$TEST_DIR/expected.bundle" > /dev/null 2>&1; then
        pass "bundle content is exactly the two valid certs (order preserved, invalid excluded)"
    else
        fail "bundle content is exactly the two valid certs (order preserved, invalid excluded)"
    fi

    # Subject line format differs between openssl versions:
    #   3.0: "subject=CN = TestRootA"    3.3: "subject=CN=TestRootA"
    # Match both.
    SUBJECTS=$(bundle_subjects "$BUNDLE")
    if printf '%s\n' "$SUBJECTS" | grep -qE "CN[[:space:]]*=[[:space:]]*TestRootA" && \
       printf '%s\n' "$SUBJECTS" | grep -qE "CN[[:space:]]*=[[:space:]]*TestRootB"; then
        pass "bundle subjects include TestRootA and TestRootB"
    else
        fail "bundle subjects include TestRootA and TestRootB"
    fi
    if grep -q "THIS IS NOT A CERTIFICATE" "$BUNDLE" 2>/dev/null; then
        fail "invalid file content is NOT in the bundle"
    else
        pass "invalid file content is NOT in the bundle"
    fi

    # (b) invalid file produced a skip warning
    if grep -q "skipping invalid CA file" "$OUT" && grep "skipping invalid CA file" "$OUT" | grep -q "invalid.pem"; then
        pass "invalid file produced a skip warning"
    else
        fail "invalid file produced a skip warning"
    fi

    # (c) NODE_EXTRA_CA_CERTS is exported to the bundle path.
    # Uses a fresh stub log so the assertions above only see ONE run.
    ENV_OUT="$TEST_DIR/basic.env"
    ENV_STUB_LOG="$TEST_DIR/basic-env-certutil.log"
    : > "$ENV_STUB_LOG"
    run_merge_capture_env "$SCAN_DIR" "$BUNDLE" "$ENV_OUT" "$NSS_DB" "$ENV_STUB_LOG" \
        "$TEST_DIR/stubbin:$PATH" ""
    # The env value is printed as the final line of the captured output.
    ENV_VALUE=$(awk 'END { print }' "$ENV_OUT" 2>/dev/null)
    if [ "$ENV_VALUE" = "$BUNDLE" ]; then
        pass "NODE_EXTRA_CA_CERTS is exported to the bundle path"
    else
        fail "NODE_EXTRA_CA_CERTS is exported to the bundle path (got '${ENV_VALUE:-<empty>}')"
    fi

    # (d) certutil: one -A per valid cert, unique nicknames, -D before each -A
    ADD_COUNT=$(grep -c ' -A ' "$STUB_LOG" 2>/dev/null) || ADD_COUNT=0
    # Delete invocations are logged first-word as "-D ...".
    DEL_COUNT=$(grep -c '^-D ' "$STUB_LOG" 2>/dev/null) || DEL_COUNT=0
    if [ "$ADD_COUNT" = "2" ]; then pass "certutil received exactly one -A per valid cert"; else fail "certutil received exactly one -A per valid cert (got $ADD_COUNT)"; fi
    if [ "$DEL_COUNT" = "2" ]; then pass "certutil received exactly one -D per valid cert"; else fail "certutil received exactly one -D per valid cert (got $DEL_COUNT)"; fi

    NICKS=$(grep ' -A ' "$STUB_LOG" 2>/dev/null | awk '{ for (i = 1; i <= NF; i++) if ($i == "-n") print $(i + 1) }' | sort -u)
    NICK_COUNT=$(printf '%s\n' "$NICKS" | grep -c .) || NICK_COUNT=0
    if [ "$NICK_COUNT" = "2" ]; then pass "certutil -A nicknames are unique"; else fail "certutil -A nicknames are unique (got $NICK_COUNT)"; fi

    if assert_delete_before_add "$STUB_LOG"; then
        pass "every certutil -A is preceded by a -D for the same nickname (idempotent)"
    else
        fail "every certutil -A is preceded by a -D for the same nickname (idempotent)"
    fi
}

test_rerun_idempotent() {
    section "Scenario 2: running twice yields no duplicate nicknames"

    SCAN_DIR="$TEST_DIR/scan"
    BUNDLE="$TEST_DIR/out/bundle.pem"
    NSS_DB="$TEST_DIR/nssdb-rerun"
    STUB_LOG="$TEST_DIR/rerun-certutil.log"
    OUT="$TEST_DIR/rerun.out"

    rm -rf "$NSS_DB"
    : > "$STUB_LOG"

    run_merge "$SCAN_DIR" "$BUNDLE" "$OUT" "$NSS_DB" "$STUB_LOG" \
        "$TEST_DIR/stubbin:$PATH" ""
    RC1=$?
    run_merge "$SCAN_DIR" "$BUNDLE" "$OUT" "$NSS_DB" "$STUB_LOG" \
        "$TEST_DIR/stubbin:$PATH" ""
    RC2=$?

    if [ "$RC1" -eq 0 ] && [ "$RC2" -eq 0 ]; then pass "second run exits 0 (both runs rc=0)"; else fail "second run exits 0 (rc1=$RC1 rc2=$RC2)"; fi

    NICKS=$(grep ' -A ' "$STUB_LOG" 2>/dev/null | awk '{ for (i = 1; i <= NF; i++) if ($i == "-n") print $(i + 1) }' | sort -u)
    NICK_COUNT=$(printf '%s\n' "$NICKS" | grep -c .) || NICK_COUNT=0
    if [ "$NICK_COUNT" = "2" ]; then
        pass "re-run reuses the same nicknames (no duplicates across runs)"
    else
        fail "re-run reuses the same nicknames (no duplicates across runs) (got $NICK_COUNT distinct: $(printf '%s' "$NICKS" | tr '\n' ' '))"
    fi

    ADD_COUNT=$(grep -c ' -A ' "$STUB_LOG" 2>/dev/null) || ADD_COUNT=0
    if [ "$ADD_COUNT" = "4" ]; then pass "two runs produced 4 adds against the stable nickname set"; else fail "two runs produced 4 adds against the stable nickname set (got $ADD_COUNT)"; fi

    if assert_delete_before_add "$STUB_LOG"; then
        pass "delete-before-add holds across both runs"
    else
        fail "delete-before-add holds across both runs"
    fi
}

test_empty_scan_dirs() {
    section "Scenario 3: no certs found anywhere (no-op)"

    EMPTY_DIR="$TEST_DIR/empty-scan"
    BUNDLE="$TEST_DIR/out/empty-bundle.pem"
    NSS_DB="$TEST_DIR/nssdb-empty"
    STUB_LOG="$TEST_DIR/empty-certutil.log"
    OUT="$TEST_DIR/empty.out"

    rm -rf "$EMPTY_DIR" "$BUNDLE" "$NSS_DB"
    mkdir -p "$EMPTY_DIR"
    : > "$STUB_LOG"

    run_merge "$EMPTY_DIR:$TEST_DIR/does-not-exist" "$BUNDLE" "$OUT" "$NSS_DB" "$STUB_LOG" \
        "$TEST_DIR/stubbin:$PATH" ""
    RC=$?

    # (f) exits 0, no bundle, env var unset
    if [ "$RC" -eq 0 ]; then pass "exits 0 when no certs found"; else fail "exits 0 when no certs found (got $RC)"; fi
    if [ ! -f "$BUNDLE" ]; then pass "no bundle file created"; else fail "no bundle file created"; fi

    ENV_OUT="$TEST_DIR/empty.env"
    run_merge_capture_env "$EMPTY_DIR:$TEST_DIR/does-not-exist" "$BUNDLE" "$ENV_OUT" "$NSS_DB" "$STUB_LOG" \
        "$TEST_DIR/stubbin:$PATH" ""
    ENV_VALUE=$(awk 'END { print }' "$ENV_OUT" 2>/dev/null)
    if [ "$ENV_VALUE" = "__UNSET__" ]; then
        pass "NODE_EXTRA_CA_CERTS left unset"
    else
        fail "NODE_EXTRA_CA_CERTS left unset (got '${ENV_VALUE:-<empty>}')"
    fi

    if grep -q "no extra CAs found" "$OUT"; then
        pass "no-op summary logged"
    else
        fail "no-op summary logged"
    fi
}

test_user_ca_prepended() {
    section "Scenario 4: pre-set NODE_EXTRA_CA_CERTS is preserved first"

    SCAN_DIR="$TEST_DIR/scan"
    BUNDLE="$TEST_DIR/out/user-bundle.pem"
    NSS_DB="$TEST_DIR/nssdb-user"
    STUB_LOG="$TEST_DIR/user-certutil.log"
    OUT="$TEST_DIR/user.out"

    rm -rf "$BUNDLE" "$NSS_DB"
    : > "$STUB_LOG"

    run_merge "$SCAN_DIR" "$BUNDLE" "$OUT" "$NSS_DB" "$STUB_LOG" \
        "$TEST_DIR/stubbin:$PATH" "$TEST_DIR/user-ca.pem"
    RC=$?

    if [ "$RC" -eq 0 ]; then pass "exits 0 with a pre-set user CA"; else fail "exits 0 with a pre-set user CA (got $RC)"; fi
    if [ -f "$BUNDLE" ]; then pass "bundle created with user CA"; else fail "bundle created with user CA"; return 0; fi

    FIRST_SUBJECT=$(openssl x509 -in "$BUNDLE" -noout -subject 2>/dev/null)
    if printf '%s' "$FIRST_SUBJECT" | grep -q "TestRootUser"; then
        pass "bundle starts with the user cert (TestRootUser first)"
    else
        fail "bundle starts with the user cert (TestRootUser first) (got: $FIRST_SUBJECT)"
    fi

    SUBJECTS=$(bundle_subjects "$BUNDLE")
    LINE_USER=$(printf '%s\n' "$SUBJECTS" | grep -nE "CN[[:space:]]*=[[:space:]]*TestRootUser" | head -1 | cut -d: -f1)
    LINE_A=$(printf '%s\n' "$SUBJECTS" | grep -nE "CN[[:space:]]*=[[:space:]]*TestRootA" | head -1 | cut -d: -f1)
    LINE_B=$(printf '%s\n' "$SUBJECTS" | grep -nE "CN[[:space:]]*=[[:space:]]*TestRootB" | head -1 | cut -d: -f1)
    if [ -n "$LINE_USER" ] && [ -n "$LINE_A" ] && [ -n "$LINE_B" ] && [ "$LINE_USER" -lt "$LINE_A" ] && [ "$LINE_A" -lt "$LINE_B" ]; then
        pass "discovered certs follow the user cert (order: user, A, B)"
    else
        fail "discovered certs follow the user cert (order: user, A, B) (user=$LINE_USER A=$LINE_A B=$LINE_B)"
    fi

    CERT_COUNT=$(grep -c "BEGIN CERTIFICATE" "$BUNDLE" 2>/dev/null) || CERT_COUNT=0
    if [ "$CERT_COUNT" = "3" ]; then pass "bundle holds user cert + 2 discovered certs"; else fail "bundle holds user cert + 2 discovered certs (got $CERT_COUNT)"; fi
}

test_certutil_missing() {
    section "Scenario 5: certutil not available (Node-only merge)"

    SCAN_DIR="$TEST_DIR/scan"
    BUNDLE="$TEST_DIR/out/nocertutil-bundle.pem"
    NSS_DB="$TEST_DIR/nssdb-nocertutil"
    STUB_LOG="$TEST_DIR/nocertutil-certutil.log"
    OUT="$TEST_DIR/nocertutil.out"

    rm -rf "$BUNDLE" "$NSS_DB"
    : > "$STUB_LOG"

    run_merge "$SCAN_DIR" "$BUNDLE" "$OUT" "$NSS_DB" "$STUB_LOG" \
        "$TEST_DIR/fakebin" ""
    RC=$?

    # (h) still exits 0, bundle still created, warning logged
    if [ "$RC" -eq 0 ]; then pass "exits 0 without certutil"; else fail "exits 0 without certutil (got $RC)"; fi
    if [ -f "$BUNDLE" ]; then pass "bundle still created without certutil"; else fail "bundle still created without certutil"; fi
    if grep -q "certutil not available" "$OUT"; then
        pass "certutil-missing warning logged"
    else
        fail "certutil-missing warning logged"
    fi

    ENV_OUT="$TEST_DIR/nocertutil.env"
    run_merge_capture_env "$SCAN_DIR" "$BUNDLE" "$ENV_OUT" "$NSS_DB" "$STUB_LOG" \
        "$TEST_DIR/fakebin" ""
    ENV_VALUE=$(awk 'END { print }' "$ENV_OUT" 2>/dev/null)
    if [ "$ENV_VALUE" = "$BUNDLE" ]; then
        pass "NODE_EXTRA_CA_CERTS still exported without certutil"
    else
        fail "NODE_EXTRA_CA_CERTS still exported without certutil (got '${ENV_VALUE:-<empty>}')"
    fi
}

test_scan_dir_with_space() {
    section "Scenario 6: scan dir path containing a space"

    SPACE_SCAN="$TEST_DIR/scan dir with space"
    BUNDLE="$TEST_DIR/out/space-bundle.pem"
    NSS_DB="$TEST_DIR/nssdb-space"
    STUB_LOG="$TEST_DIR/space-certutil.log"
    OUT="$TEST_DIR/space.out"

    rm -rf "$SPACE_SCAN" "$BUNDLE" "$NSS_DB"
    mkdir -p "$SPACE_SCAN"
    cp "$TEST_DIR/scan/TestRootA.pem" "$SPACE_SCAN/Space Root.pem"
    : > "$STUB_LOG"

    run_merge "$SPACE_SCAN" "$BUNDLE" "$OUT" "$NSS_DB" "$STUB_LOG" \
        "$TEST_DIR/stubbin:$PATH" ""
    RC=$?

    if [ "$RC" -eq 0 ]; then pass "exits 0 with a spaced scan dir"; else fail "exits 0 with a spaced scan dir (got $RC)"; fi
    if [ -f "$BUNDLE" ] && grep -q "BEGIN CERTIFICATE" "$BUNDLE"; then
        pass "spaced-path cert merged into bundle"
    else
        fail "spaced-path cert merged into bundle"
    fi
}

# ── Main ──────────────────────────────────────────────────────────────────────

main() {
    printf "merge-extra-cas.sh test suite\n"
    printf "merge script: %s\n" "$MERGE_SCRIPT"

    if ! command -v openssl > /dev/null 2>&1; then
        echo "FATAL: openssl is required to generate test fixtures" >&2
        exit 1
    fi

    mkdir -p "$TEST_DIR/scan"
    setup_fixtures

    if [ ! -f "$MERGE_SCRIPT" ]; then
        fail "merge script exists at $MERGE_SCRIPT"
        echo ""
        echo "RESULT: merge script not found — all behavioral assertions will fail (RED state)."
        exit 1
    fi

    test_basic_merge
    test_rerun_idempotent
    test_empty_scan_dirs
    test_user_ca_prepended
    test_certutil_missing
    test_scan_dir_with_space

    echo ""
    printf "Test Summary\n"
    printf "  Passed: %s\n" "$PASS"
    printf "  Failed: %s\n" "$FAIL"

    if [ "$FAIL" -eq 0 ]; then
        printf "${COLOR_GREEN}All tests passed!${COLOR_RESET}\n"
        return 0
    fi
    printf "${COLOR_RED}Some tests failed!${COLOR_RESET}\n"
    return 1
}

main "$@"
exit $?
