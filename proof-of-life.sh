#!/bin/bash
# Proof of Life — Verify Advanced Routing Features
# This is a convenience wrapper around the Python implementation
set -euo pipefail
cd "$(dirname "$0")"
exec python3 scripts/proof-of-life.py "$@"
