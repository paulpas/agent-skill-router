# Stage 1: Builder
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json tsconfig.json ./
RUN npm ci
COPY src/ ./src/
RUN npm run build

# Stage 2: Runtime
FROM node:20-alpine AS runtime
ARG COMPRESSION_LEVEL=4
ARG ENABLE_LLM_COMPRESSION=true
ARG OPENAI_MODEL=gpt-4o-mini
RUN apk add --no-cache git
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY package*.json ./
RUN npm ci --omit=dev
COPY samples/ ./samples/
EXPOSE 3000
# SKILLS_DIRECTORY is optional when GITHUB_SKILLS_ENABLED=true (remote index is used instead).
# Mount -v /your/skills:/skills:ro only if you want a local override of skill content.
ENV SKILLS_DIRECTORY=/skills
ENV LLM_PROVIDER=openai
ENV LLM_MODEL=gpt-4o-mini
ENV EMBEDDING_PROVIDER=openai
ENV EMBEDDING_MODEL=text-embedding-3-small
# For llamacpp: set to http://host.docker.internal:8080 to reach host's llama.cpp
ENV LLAMACPP_BASE_URL=http://host.docker.internal:8080
ENV GITHUB_SKILLS_ENABLED=true
ENV GITHUB_SKILLS_REPO=https://github.com/paulpas/skills
# Base URL for GitHub raw content — used for skills-index.json and on-demand SKILL.md fetches
ENV GITHUB_RAW_BASE_URL=https://raw.githubusercontent.com/paulpas/skills/main
ENV SKILL_CACHE_DIR=/cache/skills
ENV SKILL_SYNC_INTERVAL=3600
# GITHUB_TOKEN= (optional, set at runtime for private repos or higher rate limits)
# /skills volume mount is optional — skill content is fetched on-demand from GitHub
VOLUME ["/cache", "/app/cache/compressed"]
ENV LOG_LEVEL=info
# ════════════════════════════════════════════════════════════════════════════════
# OPENAI-BASED LLM COMPRESSION CONFIGURATION
# ════════════════════════════════════════════════════════════════════════════════
# LLM-based skill compression uses OpenAI API to intelligently compress documentation.
# This is OPTIONAL — set OPENAI_API_KEY at runtime to enable semantic compression.
#
# STARTUP BEHAVIOR:
#   - Server starts normally even if OPENAI_API_KEY is unset
#   - If OPENAI_API_KEY is empty: Falls back to regex-based compression (legacy method)
#   - If OPENAI_API_KEY is set: Uses OpenAI LLM for semantic compression
#   - Compression can be disabled entirely by setting ENABLE_LLM_COMPRESSION=false
#
# COMPRESSION CHARACTERISTICS:
#   - Semantic compression: 45-77% token reduction while preserving critical meaning
#   - Memory cache: 1-hour TTL for frequently accessed skills
#   - Disk cache: 24-hour TTL for compressed versions (stores in /app/cache/compressed)
#   - Graceful degradation: Returns original content if LLM fails
#   - Request deduplication: Concurrent identical requests → 1 LLM call
#
# RUNTIME EXAMPLES:
#   # Enable with OpenAI API key
#   docker run -e OPENAI_API_KEY="sk-..." myapp
#
#   # Enable with custom model
#   docker run -e OPENAI_API_KEY="sk-..." -e OPENAI_MODEL="gpt-4" myapp
#
#   # Enable with Azure OpenAI
#   docker run -e OPENAI_API_KEY="..." \
#     -e OPENAI_BASE_URL="https://myorg.openai.azure.com" \
#     -e OPENAI_MODEL="gpt-4o-mini" myapp
#
#   # Disable LLM compression (use regex fallback)
#   docker run -e ENABLE_LLM_COMPRESSION="false" myapp
#
#   # With custom cache settings
#   docker run -e OPENAI_API_KEY="sk-..." \
#     -e COMPRESSION_CACHE_SIZE_MB="1024" \
#     -e COMPRESSION_CACHE_TTL_HOURS="48" myapp
#
# HEALTH CHECK:
#   - /health endpoint works even if OpenAI API is unavailable
#   - Compression gracefully falls back to regex method if LLM fails
#   - No service disruption if API key is incorrect
# ════════════════════════════════════════════════════════════════════════════════
ENV OPENAI_API_KEY=""                      # Your OpenAI API key (required for LLM compression)
ENV OPENAI_MODEL="gpt-4o-mini"             # Model to use (gpt-4o-mini, gpt-4, gpt-4-turbo, etc.)
ENV OPENAI_BASE_URL=""                     # Optional: For Azure OpenAI or custom endpoints
ENV OPENAI_ORG_ID=""                       # Optional: OpenAI Organization ID
ENV ENABLE_LLM_COMPRESSION="true"          # Set to "false" to disable LLM compression (falls back to regex)
# ════════════════════════════════════════════════════════════════════════════════
# LLM-BASED SKILL COMPRESSION
# ════════════════════════════════════════════════════════════════════════════════
# Semantic compression reduces token consumption by 45-77% while preserving meaning.
# Uses Claude (Anthropic API) to intelligently compress skill documentation.
#
# Key Features:
#   - Multi-layer caching (memory 1hr + disk 7 days + original)
#   - Request deduplication (100 concurrent = 1 LLM call)
#   - Lazy write buffer (reduces I/O by 95%)
#   - Fallback safety (returns original if LLM fails)
#
# BUILD EXAMPLES:
#   docker build . [default: compression enabled]
#   docker build --build-arg SKILL_COMPRESSION_ENABLED=false . [disable]
#   docker build --build-arg SKILL_COMPRESSION_STRATEGY=brief . [77% reduction]
#
# See LLM_COMPRESSION.md and DEPLOYMENT.md for complete documentation
# ════════════════════════════════════════════════════════════════════════════════
ARG SKILL_COMPRESSION_ENABLED=true
ARG SKILL_COMPRESSION_STRATEGY=moderate
ARG SKILL_COMPRESSION_LLM_MODEL=claude-3-haiku
ARG SKILL_COMPRESSION_MEMORY_TTL_MINUTES=60
ARG SKILL_COMPRESSION_DISK_TTL_DAYS=7
ARG SKILL_COMPRESSION_LAZY_WRITE_INTERVAL_MS=5000
#
ENV SKILL_COMPRESSION_ENABLED=$SKILL_COMPRESSION_ENABLED \
    SKILL_COMPRESSION_STRATEGY=$SKILL_COMPRESSION_STRATEGY \
    SKILL_COMPRESSION_LLM_MODEL=$SKILL_COMPRESSION_LLM_MODEL \
    SKILL_COMPRESSION_MEMORY_TTL_MINUTES=$SKILL_COMPRESSION_MEMORY_TTL_MINUTES \
    SKILL_COMPRESSION_DISK_TTL_DAYS=$SKILL_COMPRESSION_DISK_TTL_DAYS \
    SKILL_COMPRESSION_LAZY_WRITE_INTERVAL_MS=$SKILL_COMPRESSION_LAZY_WRITE_INTERVAL_MS
# ════════════════════════════════════════════════════════════════════════════════
# REGEX-BASED SKILL COMPRESSION (Legacy)
# ════════════════════════════════════════════════════════════════════════════════
# SKILL_COMPRESSION_LEVEL: Stackable compression transformations (0-10+)
# ════════════════════════════════════════════════════════════════════════════════
# Compression levels STACK - each level includes all transformations from previous levels:
#
# Level 0: (OFF)
#   - No compression, original SKILL.md content
#   - 0% savings
#
# Level 1: Remove blank lines (STACKS FROM: none)
#   - Transformation: Remove extra blank lines within sections
#   - ≈ 5% token savings
#
# Level 2: + Remove "When to Use" (STACKS FROM: Level 1)
#   - Includes: Level 1 transformations
#   - Transformation: Remove "When to Use" bullets section
#   - ≈ 12% token savings (cumulative: 1 + 2)
#
# Level 3: + Remove "When NOT to Use" (STACKS FROM: Level 1 + 2)
#   - Includes: Level 1 + Level 2 transformations
#   - Transformation: Remove "When NOT to Use" section
#   - ≈ 18% token savings (cumulative: 1 + 2 + 3)
#
# Level 4: + Collapse "Core Workflow" (STACKS FROM: Level 1 + 2 + 3)
#   - Includes: Level 1 + Level 2 + Level 3 transformations
#   - Transformation: Collapse "Core Workflow" to single paragraph
#   - ≈ 28% token savings (cumulative: 1 + 2 + 3 + 4)
#
# RECOMMENDED USAGE:
#   - Development: COMPRESSION_LEVEL=0 (original content)
#   - Production: COMPRESSION_LEVEL=2-4 (12-28% savings)
#
# BUILD EXAMPLES:
#   docker build . [default: level 4]
#   docker build --build-arg COMPRESSION_LEVEL=0 . [no compression]
#   docker build --build-arg COMPRESSION_LEVEL=1 . [5% savings]
#   docker build --build-arg COMPRESSION_LEVEL=2 . [12% savings]
#   docker build --build-arg COMPRESSION_LEVEL=3 . [18% savings]
#   docker build --build-arg COMPRESSION_LEVEL=4 . [28% savings, recommended]
#
# See COMPRESSION.md for detailed level descriptions (5-10+ also available)
# ════════════════════════════════════════════════════════════════════════════════
ENV SKILL_COMPRESSION_LEVEL=${COMPRESSION_LEVEL}
# ════════════════════════════════════════════════════════════════════════════════
# COMPRESSION CACHE CONFIGURATION
# ════════════════════════════════════════════════════════════════════════════════
# Settings for both LLM and regex-based compression caching
# ════════════════════════════════════════════════════════════════════════════════
ENV COMPRESSION_CACHE_SIZE_MB="512"        # Max disk cache size in MB (0=unlimited)
ENV COMPRESSION_CACHE_TTL_HOURS="24"       # Cache invalidation (no access) in hours
ENV COMPRESSION_RETRY_THRESHOLD="2"        # Retry compression if accessed >N times in 30min
# ════════════════════════════════════════════════════════════════════════════════
ENV NODE_ENV=production
HEALTHCHECK --interval=60s --timeout=10s --start-period=90s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/health | grep -q '"ready":true' || exit 1
CMD ["node", "dist/index.js"]
