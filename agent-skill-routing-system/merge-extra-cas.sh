#!/bin/sh
# ─────────────────────────────────────────────────────────────────────────────
# merge-extra-cas.sh — merge extra CA certificates into container trust stores
#
# WHY THIS EXISTS
#   On TLS-interception networks (Zscaler, Netskope, Palo Alto, ...), corporate
#   products re-sign HTTPS traffic with a root CA that the container's trust
#   stores do not include. Node fails with UNABLE_TO_GET_ISSUER_CERT_LOCALLY,
#   Chromium (Puppeteer) with ERR_CERT_AUTHORITY_INVALID, and git/openssl the
#   same way. This script auto-discovers extra CA files at container startup
#   and wires them into ALL three trust stores — for ANY interception product,
#   on any host OS. Nothing vendor-specific is assumed, and nothing disables
#   TLS verification (NODE_TLS_REJECT_UNAUTHORIZED=0 / --ignore-certificate-
#   errors are deliberately NOT used).
#
# CONTRACT
#   - Sourced by docker-entrypoint-root.sh (`. /app/merge-extra-cas.sh`) so
#     that `export NODE_EXTRA_CA_CERTS` reaches the appuser CMD. It also runs
#     standalone (`sh /app/merge-extra-cas.sh`) for tests; standalone mode
#     always ends with `exit 0`.
#   - Never changes the caller's shell options (no `set -e`/`set -u` here;
#     IFS is saved and restored).
#   - Fully failure-safe: every command is guarded. Non-fatal problems log a
#     `[CA-MERGE]` warning and continue. Container startup is never blocked.
#
# ENVIRONMENT (all overridable, sane defaults)
#   EXTRA_CA_SCAN_DIRS   colon-separated scan dirs
#                        default: /etc/skill-router/extra-cas:/usr/local/share/ca-certificates
#   EXTRA_CA_BUNDLE_OUT  Node bundle output
#                        default: /app/tls/extra-ca-bundle.pem
#   NSS_DB_DIR           Chromium/NSS database dir
#                        default: /home/appuser/.pki/nssdb
#   MERGE_CA_APP_USER    owner for the NSS db
#                        default: appuser
# ─────────────────────────────────────────────────────────────────────────────

EXTRA_CA_SCAN_DIRS="${EXTRA_CA_SCAN_DIRS:-/etc/skill-router/extra-cas:/usr/local/share/ca-certificates}"
EXTRA_CA_BUNDLE_OUT="${EXTRA_CA_BUNDLE_OUT:-/app/tls/extra-ca-bundle.pem}"
NSS_DB_DIR="${NSS_DB_DIR:-/home/appuser/.pki/nssdb}"
MERGE_CA_APP_USER="${MERGE_CA_APP_USER:-appuser}"

ca_merge_info() {
    printf '[CA-MERGE] %s\n' "$*"
}

ca_merge_warn() {
    printf '[CA-MERGE] WARNING: %s\n' "$*"
}

# Remove the temp workspace (never fatal).
ca_merge_cleanup() {
    if [ -n "$CA_MERGE_WORK" ]; then
        rm -rf "$CA_MERGE_WORK" 2>/dev/null || :
    fi
    return 0
}

# NOTE: early exits below use a top-level `return 0 ... || exit 0`. When this
# script is sourced, `return` hands control back to the caller; standalone,
# `return` is an error and `exit 0` takes over. This MUST stay at the top
# level of the script (a `return` inside a function only exits the function).

# ── Workspace ────────────────────────────────────────────────────────────────
CA_MERGE_WORK=""
CA_MERGE_WORK=$(mktemp -d "${TMPDIR:-/tmp}/ca-merge.XXXXXX" 2>/dev/null) || CA_MERGE_WORK=""
if [ -z "$CA_MERGE_WORK" ]; then
    ca_merge_warn "cannot create temp workspace; skipping CA merge"
    return 0 2>/dev/null || exit 0
fi

CA_MERGE_CANDIDATES="$CA_MERGE_WORK/candidates"
CA_MERGE_VALID="$CA_MERGE_WORK/valid"
CA_MERGE_FIRSTDIR_VALID="$CA_MERGE_WORK/firstdir-valid"
: > "$CA_MERGE_CANDIDATES" 2>/dev/null || :
: > "$CA_MERGE_VALID" 2>/dev/null || :
: > "$CA_MERGE_FIRSTDIR_VALID" 2>/dev/null || :

# ── 1. Collect candidate files from each existing scan dir ──────────────────
# Dirs may not exist — skipped silently. Globs that match nothing stay
# literal and fail the -f test, so they are skipped too.
ca_merge_first_dir="${EXTRA_CA_SCAN_DIRS%%:*}"
ca_merge_old_ifs=$IFS
IFS=':'
for ca_merge_dir in $EXTRA_CA_SCAN_DIRS; do
    [ -n "$ca_merge_dir" ] || continue
    [ -d "$ca_merge_dir" ] || continue
    for ca_merge_file in "$ca_merge_dir"/*.pem "$ca_merge_dir"/*.crt "$ca_merge_dir"/*.cer; do
        [ -f "$ca_merge_file" ] || continue
        printf '%s\n' "$ca_merge_file" >> "$CA_MERGE_CANDIDATES" 2>/dev/null || :
    done
done
IFS=$ca_merge_old_ifs

# Deduplicate (a file can be reachable via two scan dirs).
CA_MERGE_SORTED="$CA_MERGE_WORK/candidates.sorted"
sort -u "$CA_MERGE_CANDIDATES" > "$CA_MERGE_SORTED" 2>/dev/null || \
    cat "$CA_MERGE_CANDIDATES" > "$CA_MERGE_SORTED" 2>/dev/null || :

# ── 2. Validate candidates: must contain the text BEGIN CERTIFICATE ─────────
ca_merge_valid_count=0
while IFS= read -r ca_merge_file; do
    [ -n "$ca_merge_file" ] || continue
    if grep -q "BEGIN CERTIFICATE" "$ca_merge_file" 2>/dev/null; then
        printf '%s\n' "$ca_merge_file" >> "$CA_MERGE_VALID" 2>/dev/null || :
        ca_merge_valid_count=$((ca_merge_valid_count + 1))
        # Track first-scan-dir certs separately: only those are re-installed
        # into the system store (the standard admin dir must not be
        # re-copied into itself).
        case "$ca_merge_file" in
            "$ca_merge_first_dir"/*)
                printf '%s\n' "$ca_merge_file" >> "$CA_MERGE_FIRSTDIR_VALID" 2>/dev/null || :
                ;;
        esac
    else
        ca_merge_warn "skipping invalid CA file $ca_merge_file"
    fi
done < "$CA_MERGE_SORTED" 2>/dev/null

# ── 3. Preserve an explicitly pre-set NODE_EXTRA_CA_CERTS file ──────────────
ca_merge_user_ca=""
if [ -n "${NODE_EXTRA_CA_CERTS:-}" ] && [ -f "${NODE_EXTRA_CA_CERTS:-}" ]; then
    ca_merge_user_ca="$NODE_EXTRA_CA_CERTS"
    if ! grep -q "BEGIN CERTIFICATE" "$ca_merge_user_ca" 2>/dev/null; then
        ca_merge_warn "skipping invalid CA file $ca_merge_user_ca"
        ca_merge_user_ca=""
    fi
fi

# ── 4. No valid certs at all: no-op ─────────────────────────────────────────
if [ "$ca_merge_valid_count" -eq 0 ] && [ -z "$ca_merge_user_ca" ]; then
    ca_merge_info "no extra CAs found, using built-in trust stores"
    ca_merge_cleanup
    return 0 2>/dev/null || exit 0
fi

# ── 5. Build the Node bundle (user cert first, then discovered certs) ───────
ca_merge_bundle_dir=$(dirname -- "$EXTRA_CA_BUNDLE_OUT" 2>/dev/null) || ca_merge_bundle_dir="/app/tls"
mkdir -p "$ca_merge_bundle_dir" 2>/dev/null || :
ca_merge_bundle_ok=true
: > "$EXTRA_CA_BUNDLE_OUT" 2>/dev/null || ca_merge_bundle_ok=false

if [ -n "$ca_merge_user_ca" ]; then
    cat "$ca_merge_user_ca" >> "$EXTRA_CA_BUNDLE_OUT" 2>/dev/null || ca_merge_bundle_ok=false
fi
while IFS= read -r ca_merge_file; do
    [ -n "$ca_merge_file" ] || continue
    cat "$ca_merge_file" >> "$EXTRA_CA_BUNDLE_OUT" 2>/dev/null || ca_merge_bundle_ok=false
done < "$CA_MERGE_VALID" 2>/dev/null
chmod 644 "$EXTRA_CA_BUNDLE_OUT" 2>/dev/null || :

# Export only when a bundle was actually written. Re-exports to the bundle
# path when the caller already had NODE_EXTRA_CA_CERTS set (its content was
# merged above, so nothing is lost).
if [ "$ca_merge_bundle_ok" = "true" ]; then
    export NODE_EXTRA_CA_CERTS="$EXTRA_CA_BUNDLE_OUT"
fi

# ── 6. Import into the Chromium/NSS database (certutil) ─────────────────────
ca_merge_nss_done=false
if [ "$ca_merge_valid_count" -gt 0 ]; then
    if command -v certutil > /dev/null 2>&1; then
        ca_merge_nss_parent=$(dirname -- "$NSS_DB_DIR" 2>/dev/null) || ca_merge_nss_parent="/home/appuser/.pki"
        # certutil -N populates the db dir but does NOT create it — it must
        # pre-exist (SEC_ERROR_BAD_DATABASE otherwise).
        mkdir -p "$NSS_DB_DIR" 2>/dev/null || :
        if [ ! -d "$NSS_DB_DIR" ]; then
            # NSS 3.109+ requires an explicit token name for -N; use the
            # canonical default token. Tolerate "database already exists"
            # races.
            certutil -d "sql:$NSS_DB_DIR" -N --empty-password -n "NSS Certificate DB" > /dev/null 2>&1 || :
        fi

        ca_merge_file_index=0
        while IFS= read -r ca_merge_file; do
            [ -n "$ca_merge_file" ] || continue
            ca_merge_file_index=$((ca_merge_file_index + 1))

            # Split the file into individual certs so that multi-cert bundles
            # (e.g. a full macOS keychain export) are fully imported, not just
            # the first cert in the file.
            ca_merge_split_dir="$CA_MERGE_WORK/split-$ca_merge_file_index"
            ca_merge_split_ok=false
            if mkdir -p "$ca_merge_split_dir" 2>/dev/null; then
                awk -v outdir="$ca_merge_split_dir" '
                    /-----BEGIN CERTIFICATE-----/ { n += 1; f = sprintf("%s/cert-%04d.pem", outdir, n) }
                    f != "" { print > f }
                    /-----END CERTIFICATE-----/ { if (f != "") close(f); f = "" }
                ' "$ca_merge_file" 2>/dev/null && ca_merge_split_ok=true
            fi

            ca_merge_base=$(basename -- "$ca_merge_file" 2>/dev/null) || ca_merge_base="ca"
            ca_merge_base="${ca_merge_base%.*}"
            ca_merge_cert_counter=0

            # Import one PEM file as a nickname <base>-<counter> into the NSS
            # db. Delete-first so re-runs never accumulate duplicate
            # nicknames (idempotency).
            ca_merge_do_import() {
                ca_merge_cert_counter=$((ca_merge_cert_counter + 1))
                ca_merge_nick="$ca_merge_base-$ca_merge_cert_counter"
                certutil -D -d "sql:$NSS_DB_DIR" -n "$ca_merge_nick" > /dev/null 2>&1 || :
                if ! certutil -d "sql:$NSS_DB_DIR" -A -t "C,," -n "$ca_merge_nick" -i "$1" > /dev/null 2>&1; then
                    ca_merge_warn "failed to import CA $1 into NSS db"
                fi
            }

            if [ "$ca_merge_split_ok" = "true" ]; then
                for ca_merge_split in "$ca_merge_split_dir"/cert-*.pem; do
                    [ -f "$ca_merge_split" ] || continue
                    ca_merge_do_import "$ca_merge_split"
                done
            else
                ca_merge_do_import "$ca_merge_file"
            fi
        done < "$CA_MERGE_VALID" 2>/dev/null

        # Give appuser ownership so Chromium (running as appuser) can read it.
        if ! chown -R "$MERGE_CA_APP_USER":"$MERGE_CA_APP_USER" "$ca_merge_nss_parent" > /dev/null 2>&1; then
            ca_merge_warn "could not chown $ca_merge_nss_parent to $MERGE_CA_APP_USER (Chromium may not read the NSS db)"
        fi
        ca_merge_nss_done=true
    else
        ca_merge_warn "certutil not available — Chromium will not trust extra CAs"
    fi
else
    ca_merge_nss_done=true
fi

# ── 7. openssl/git trust store (first scan dir only) ────────────────────────
ca_merge_system_done=false
if [ -s "$CA_MERGE_FIRSTDIR_VALID" ] && command -v update-ca-certificates > /dev/null 2>&1; then
    if [ -d /usr/local/share/ca-certificates ] && [ -w /usr/local/share/ca-certificates ]; then
        while IFS= read -r ca_merge_file; do
            [ -n "$ca_merge_file" ] || continue
            cp -f "$ca_merge_file" /usr/local/share/ca-certificates/ > /dev/null 2>&1 || \
                ca_merge_warn "could not copy $ca_merge_file to /usr/local/share/ca-certificates"
        done < "$CA_MERGE_FIRSTDIR_VALID" 2>/dev/null
        if update-ca-certificates --fresh > /dev/null 2>&1; then
            ca_merge_system_done=true
        else
            ca_merge_warn "update-ca-certificates failed; git/openssl will not trust extra CAs"
        fi
    fi
else
    ca_merge_system_done=true
fi

# ── 8. Summary ───────────────────────────────────────────────────────────────
if [ "$ca_merge_bundle_ok" = "true" ]; then
    ca_merge_cert_total=$(grep -c "BEGIN CERTIFICATE" "$EXTRA_CA_BUNDLE_OUT" 2>/dev/null) || ca_merge_cert_total=0
    ca_merge_info "imported $ca_merge_cert_total extra CA(s) into Node bundle $EXTRA_CA_BUNDLE_OUT, NSS $NSS_DB_DIR, system store"
else
    ca_merge_warn "could not write Node bundle at $EXTRA_CA_BUNDLE_OUT; Node will use built-in trust store"
fi

ca_merge_cleanup
return 0 2>/dev/null || exit 0
