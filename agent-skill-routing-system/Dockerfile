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
VOLUME ["/cache"]
ENV LOG_LEVEL=info
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
ENV NODE_ENV=production
HEALTHCHECK --interval=60s --timeout=10s --start-period=90s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/health | grep -q '"ready":true' || exit 1
CMD ["node", "dist/index.js"]
