# Stage 1: Builder
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json tsconfig.json ./
RUN npm ci
COPY src/ ./src/
RUN npm run build

# Stage 2: Runtime
FROM node:20-alpine AS runtime
RUN apk add --no-cache git
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY package*.json ./
RUN npm ci --omit=dev
COPY samples/ ./samples/
EXPOSE 3000
ENV SKILLS_DIRECTORY=/skills
ENV LLM_PROVIDER=openai
ENV LLM_MODEL=gpt-4o-mini
ENV EMBEDDING_PROVIDER=openai
ENV EMBEDDING_MODEL=text-embedding-3-small
# For llamacpp: set to http://host.docker.internal:8080 to reach host's llama.cpp
ENV LLAMACPP_BASE_URL=http://host.docker.internal:8080
ENV GITHUB_SKILLS_ENABLED=true
ENV GITHUB_SKILLS_REPO=https://github.com/paulpas/skills
ENV SKILL_CACHE_DIR=/cache/skills
ENV SKILL_SYNC_INTERVAL=3600
# GITHUB_TOKEN= (optional, set at runtime for private repos or higher rate limits)
VOLUME ["/skills", "/cache"]
ENV LOG_LEVEL=info
ENV NODE_ENV=production
HEALTHCHECK --interval=30s --timeout=10s --start-period=90s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/health | grep -q '"ready":true' || exit 1
CMD ["node", "dist/index.js"]
