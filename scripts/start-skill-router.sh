#!/bin/bash
# Start skill-router container with correct networking and env vars
# This script is used by the systemd user service for auto-start on login

set -euo pipefail

CONTAINER_NAME="skill-router"
IMAGE="skill-router:latest"
SKILLS_DIR="/home/paulpas/git/agent-skill-router/skills"

# Check if container exists and is running
if docker ps --format '{{.Names}}' | grep -qx "$CONTAINER_NAME"; then
  echo "[$(date)] Container $CONTAINER_NAME is already running."
  exit 0
fi

# Check if container exists but is stopped
if docker ps -a --format '{{.Names}}' | grep -qx "$CONTAINER_NAME"; then
  echo "[$(date)] Starting existing container $CONTAINER_NAME..."
  # Restart with preserved settings (docker start preserves --add-host from original run)
  # But we need to ensure OPENAI_API_KEY is set in the environment
  if [ -n "${OPENAI_API_KEY:-}" ]; then
    echo "[$(date)] OPENAI_API_KEY is set, container should have access."
  else
    echo "[$(date)] WARNING: OPENAI_API_KEY not set in environment."
    echo "[$(date)] The container will use the env var baked in via ENV LLAMACPP_BASE_URL."
  fi
  docker start "$CONTAINER_NAME"
  echo "[$(date)] Container started."
  exit 0
fi

# Container doesn't exist — create and start it fresh
echo "[$(date)] Creating and starting container $CONTAINER_NAME..."
docker run -d \
  --name "$CONTAINER_NAME" \
  --add-host host.docker.internal:host-gateway \
  --restart unless-stopped \
  -p 3000:3000 \
  -e "OPENAI_API_KEY=${OPENAI_API_KEY}" \
  -e "LLAMACPP_BASE_URL=http://host.docker.internal:8080" \
  -e "LLM_PROVIDER=llamacpp" \
  -e "EMBEDDING_PROVIDER=openai" \
  -e "EMBEDDING_MODEL=text-embedding-3-small" \
  -e "LLM_MODEL=gpt-4o-mini" \
  -e "AUTO_SKILL_MODEL=gpt-4o-mini" \
  -e "AUTO_SKILL_CONTRIBUTE=true" \
  -e "AUTO_SKILL_ENABLED=true" \
  -e "GITHUB_SKILLS_ENABLED=true" \
  -e STALL_RESILIENCE_ENABLED=true \
  -v "$SKILLS_DIR:/app/skills:ro" \
  "$IMAGE"

echo "[$(date)] Container created and started."
