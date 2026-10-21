#!/bin/sh
# Entrypoint script for skill-router container - runs as root
# Fixes permissions for volume-mounted directories, then switches to appuser

set -e

echo "Current user: $(whoami)"
echo "Current uid: $(id -u)"

# Fix permissions for volume-mounted directories
# These directories may be mounted from the host with root ownership
# We need to ensure appuser (uid=1001) can write to them for git operations

if [ -d "/cache/skills" ]; then
    echo "Fixing permissions for /cache/skills..."
    # Fix permissions for git operations
    # Git fetch creates FETCH_HEAD and other files with root ownership
    # We need to ensure appuser (uid=1001) can write to .git directory
    chmod -R 777 /cache/skills
    # Fix .git directory ownership specifically - this is critical for git operations
    # After git fetch, files like FETCH_HEAD are created with root ownership
    # We must change ownership of .git directory to appuser BEFORE switching to appuser
    if [ -d "/cache/skills/.git" ]; then
        echo "Changing ownership of /cache/skills/.git to appuser..."
        chown -R appuser:appuser /cache/skills/.git
    fi
fi

# Note: /app/skills may be mounted read-only from host
# If writable, fix permissions for git operations
if [ -d "/app/skills" ]; then
    echo "Checking /app/skills for git operations..."
    # Check if /app/skills is writable by trying to create a test file
    # Using root to write to a read-only mount will still succeed in Docker
    # So we need to check if the directory is on a read-only mount
    if touch "/app/skills/.chmod_test" 2>/dev/null; then
        rm -f "/app/skills/.chmod_test"
        # Fix permissions for .git directory if it exists and is writable
        if [ -d "/app/skills/.git" ]; then
            echo "Fixing permissions for /app/skills/.git..."
            chmod -R 777 /app/skills/.git
            chown -R appuser:appuser /app/skills/.git
        fi
        # Also fix overall directory permissions
        chmod 777 /app/skills
    else
        echo "/app/skills is read-only (expected for mounted volume), skipping permissions fix"
    fi
fi

# Ensure /tmp and /app are writable (for logs, etc.)
chmod 1777 /tmp
chmod 777 /app

# Merge host-supplied CA certificates (TLS-interception networks such as
# Zscaler, Netskope, or Palo Alto) into the Node, Chromium (NSS), and
# git/openssl trust stores. Sourced (not executed) so that the script's
# `export NODE_EXTRA_CA_CERTS` reaches the appuser shell below. The script is
# fully failure-safe (never changes shell options, never blocks startup);
# `set +e` around it is a second safety layer against `set -e` above.
set +e
. /app/merge-extra-cas.sh
set -e

# Now switch to appuser and execute the CMD
# The CMD is passed as arguments to this script
# We need to pass them to su as a single command string
# NOTE: `su` is used WITHOUT `-` (login mode), which preserves the caller's
# environment variables — HOME/SHELL/USER/LOGNAME/PATH are reset for the
# target user, but everything else (including NODE_EXTRA_CA_CERTS exported
# above) is inherited by the su'd command. Verified empirically on
# busybox su (Alpine): an exported var set before `su -s /bin/sh -c ...`
# is visible inside the su'd shell.
echo "Switching to appuser and running: $@"
exec su -s /bin/sh -c "$*" appuser
