"use strict";
// Skill Registry System
// Loads skills from /skills/* directories, extracts metadata, and maintains a registry
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SkillRegistry = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const glob_1 = require("glob");
const yaml_1 = __importDefault(require("yaml"));
const Logger_1 = require("../observability/Logger");
const SkillCompressor_1 = require("./SkillCompressor");
const CompressionMetrics_1 = require("../utils/CompressionMetrics");
const LLMSkillCompressor_1 = require("./LLMSkillCompressor");
const DiskCompressionCache_1 = require("./DiskCompressionCache");
const InMemoryCompressionCache_1 = require("./InMemoryCompressionCache");
const CompressionDeduplicator_1 = require("./CompressionDeduplicator");
const EmbeddingService_1 = require("../embedding/EmbeddingService");
const DomainRegistry_1 = require("./DomainRegistry");
const MarkdownLinkResolver_1 = require("./MarkdownLinkResolver");
/**
 * Skill Registry - manages all available skills
 * Implements SkillRegistryWithCompression interface for type-safe access to compression methods
 */
class SkillRegistry {
    skills = new Map();
    skillsByCategory = new Map();
    skillsByTag = new Map();
    config;
    logger;
    compressor;
    /** In-memory cache for on-demand skill content */
    contentCache = new Map();
    /** LRU cache with TTL for compressed content */
    compressionCache = new Map();
    maxCacheSizeBytes;
    currentCacheSizeBytes = 0;
    // Phase 3-5: LLM-based compression system
    llmCompressor = null;
    diskCache = null;
    memoryCache = null;
    deduplicator = null;
    accessCounter = new Map();
    // Scaling for 1,778 skills: priority queue and adaptive TTL
    accessPriority = new Map(); // access score for hotness ranking
    topAccessedSkills = new Set(); // top 100 frequently accessed skills
    HOT_SKILLS_COUNT = 100;
    HOT_SKILL_TTL_MS = 30 * 60 * 1000; // 30 minutes for hot skills
    COLD_SKILL_TTL_MS = 60 * 60 * 1000; // 1 hour for cold skills
    // Embedding service for generating vector embeddings
    embeddingService;
    // Runtime markdown link following configuration
    markdownLinkConfig;
    // Lazy-initialized markdown link resolver (hoisted to avoid per-call instantiation)
    linkResolver = null;
    /**
     * Get the base skills directory path for link resolution safety checks.
     */
    getSkillsBasePath() {
        const dirs = Array.isArray(this.config.skillsDirectory)
            ? this.config.skillsDirectory
            : [this.config.skillsDirectory];
        return path_1.default.resolve(dirs[0]);
    }
    /**
     * Get or create the markdown link resolver instance.
     * Lazily initialized to avoid overhead when link following is disabled.
     */
    getLinkResolver() {
        if (!this.linkResolver) {
            this.linkResolver = new MarkdownLinkResolver_1.MarkdownLinkResolver({
                ...this.markdownLinkConfig,
                skillBasePath: this.getSkillsBasePath(),
            }, this.logger, this.embeddingService);
        }
        return this.linkResolver;
    }
    constructor(config) {
        this.config = {
            cacheDirectory: './.skill-cache',
            generateEmbeddings: true,
            compressionLevel: 0,
            maxCacheSizeBytes: 1024 * 1024 * 1024, // 1GB for 1,778 skills
            warmupSkillsCount: 100,
            adaptiveTTL: true,
            compressionBatchSize: 10,
            ...config,
        };
        // Initialize markdown link following config with defaults
        const mlc = config.markdownLinkFollowing;
        const envBool = (key, fallback) => {
            const v = process.env[key];
            return v !== undefined ? v === 'true' || v === '1' : fallback;
        };
        const envNum = (key, fallback) => {
            const v = process.env[key];
            if (v === undefined)
                return fallback;
            const n = Number(v);
            return isNaN(n) ? fallback : n;
        };
        const envStr = (key, fallback) => process.env[key] ?? fallback;
        this.markdownLinkConfig = {
            enabled: mlc?.enabled ?? envBool('LINK_FOLLOWING_ENABLED', false),
            allowExternalLinks: mlc?.allowExternalLinks ?? envBool('ALLOW_EXTERNAL_LINKS', false),
            maxDepth: mlc?.maxDepth ?? envNum('MAX_LINK_DEPTH', 2),
            maxExternalSizeKb: mlc?.maxExternalSizeKb ?? envNum('MAX_EXTERNAL_SIZE_KB', 10),
            compressionMode: mlc?.compressionMode ?? envStr('EXTERNAL_COMPRESSION_MODE', 'brief'),
            jsRenderingEnabled: mlc?.jsRenderingEnabled ?? envBool('JS_RENDERING_ENABLED', false),
            jsRenderTimeoutMs: mlc?.jsRenderTimeoutMs ?? envNum('JS_RENDER_TIMEOUT_MS', 5000),
            jsRenderFallback: mlc?.jsRenderFallback ?? envBool('JS_RENDER_FALLBACK', true),
            resolutionMode: mlc?.resolutionMode ?? envStr('LINK_RESOLUTION_MODE', 'inline'),
            semanticTopK: mlc?.semanticTopK ?? envNum('SEMANTIC_TOP_K', 3),
            semanticSimilarityThreshold: mlc?.semanticSimilarityThreshold ?? envNum('SEMANTIC_SIMILARITY_THRESHOLD', 0.3),
        };
        this.maxCacheSizeBytes = this.config.maxCacheSizeBytes || (1024 * 1024 * 1024);
        this.compressor = new SkillCompressor_1.SkillCompressor();
        this.logger = new Logger_1.Logger('SkillRegistry');
        this.embeddingService = new EmbeddingService_1.EmbeddingService({
            cacheDirectory: this.config.cacheDirectory,
        });
        // Initialize DomainRegistry
        const domainRegistry = DomainRegistry_1.DomainRegistry.getInstance();
        domainRegistry.loadDomainsConfig();
        // Initialize metrics with max cache size
        const metrics = CompressionMetrics_1.CompressionMetrics.getInstance();
        metrics.setMaxCacheSize(this.maxCacheSizeBytes);
        // Initialize LLM-based compression caches (Phase 3-5)
        const skillsDir = Array.isArray(this.config.skillsDirectory)
            ? this.config.skillsDirectory[0]
            : this.config.skillsDirectory;
        this.diskCache = new DiskCompressionCache_1.DiskCompressionCache(skillsDir);
        this.memoryCache = new InMemoryCompressionCache_1.InMemoryCompressionCache(60); // 1 hour TTL
        this.deduplicator = new CompressionDeduplicator_1.CompressionDeduplicator();
        // llmCompressor: will be initialized when LLM client becomes available
        this.loadPersistedContentCache();
    }
    /**
     * Quality gate: detect if a skill is a stub/template with minimal actionable content.
     * Stubs contain boilerplate text with no real implementation or guidance.
     *
     * Detection criteria:
     * - Content is below minimum threshold (3KB of actual content)
     * - Contains stub sentinel string: "Implementing this specific pattern or feature"
     *
     * Guard: early return on empty content
     */
    isStubSkill(content) {
        // Guard: early exit on empty content
        if (!content || content.length === 0) {
            return true;
        }
        const MIN_CONTENT_BYTES = 3000;
        const STUB_SENTINEL = 'Implementing this specific pattern or feature';
        const isStub = content.length < MIN_CONTENT_BYTES && content.includes(STUB_SENTINEL);
        return isStub;
    }
    /**
     * Fetch the lightweight skills-index.json from a remote URL and populate the
     * registry with metadata only (no content). Content is fetched on-demand.
     * Falls back gracefully — callers should catch errors and fall back to loadSkills().
     */
    async loadFromRemoteIndex(indexUrl) {
        this.logger.info('[INDEX] Fetching skills index', { url: indexUrl });
        const t0 = Date.now();
        const response = await fetch(indexUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch skills index: ${response.status}`);
        }
        // Tolerate multiple index schemas:
        //   1. Bare array of entries (legacy)
        //   2. { entries: [...] } (older agent-skill-router format)
        //   3. { skills: [...] } (current paulpas/skills format)
        const json = await response.json();
        const entries = Array.isArray(json)
            ? json
            : typeof json === 'object' && json !== null && 'entries' in json
                ? Array.isArray(json.entries)
                    ? json.entries
                    : []
                : typeof json === 'object' && json !== null && 'skills' in json
                    ? Array.isArray(json.skills)
                        ? json.skills
                        : []
                    : [];
        if (entries.length === 0) {
            throw new Error('Skills index has no skills/entries array');
        }
        this.logger.info('[INDEX] Skills index loaded', { count: entries.length, durationMs: Date.now() - t0 });
        for (const entry of entries) {
            // Map both old and new field names defensively
            const tags = Array.isArray(entry.tags)
                ? entry.tags
                : typeof entry.triggers === 'string'
                    ? entry.triggers.split(/,\s*/).filter((t) => t.length > 0)
                    : Array.isArray(entry.triggers)
                        ? entry.triggers
                        : [];
            const sourceFile = entry.path ||
                entry.source ||
                (entry.domain && entry.name ? `skills/${String(entry.domain)}/${String(entry.name)}/SKILL.md` : '');
            const metadata = {
                name: String(entry.name),
                category: String(entry.domain),
                description: String(entry.description || ''),
                tags,
                input_schema: { type: 'object', properties: {}, required: [] },
                output_schema: { type: 'object', properties: {}, required: [] },
            };
            const skill = { metadata, sourceFile, rawContent: '' };
            if (!this.skills.has(String(entry.name))) {
                this.addSkill(skill);
            }
        }
        if (this.config.generateEmbeddings) {
            await this.generateMissingEmbeddings();
        }
        this.logger.info('[INDEX] Registry ready', { total: this.skills.size });
    }
    /**
     * Fetch the full SKILL.md content for a skill on-demand.
     * Resolution order: memory cache → local disk → GitHub raw → persist to disk.
     * Supports compression and caching with TTL/LRU.
     */
    async getSkillContent(name, compressionLevel) {
        // Use provided compression level or fall back to config default
        const level = compressionLevel !== undefined ? compressionLevel : (this.config.compressionLevel || 0);
        // 1. Check compression cache if compression is enabled
        if (level > 0) {
            const cached = this.getFromCompressionCache(name, level);
            if (cached) {
                this.logger.info('[COMPRESSION-CACHE] skill served from cache', { name, compressionLevel: level });
                return cached;
            }
        }
        // 2. Memory cache hit — fastest path
        const basicCached = this.contentCache.get(name);
        if (basicCached) {
            this.logger.info('[ON-DEMAND] skill served from memory cache', { name });
            return level > 0 ? this.applyCompressionAndCache(name, basicCached, level) : basicCached;
        }
        // 3. Try local disk (if volume is mounted or local dev)
        const localPaths = Array.isArray(this.config.skillsDirectory)
            ? this.config.skillsDirectory
            : [this.config.skillsDirectory];
        for (const dir of localPaths) {
            // Try domain/skillname structure first, then fallback to flat structure
            // Dynamically discover domains from filesystem (fixes: writing/ and coding/ excluded, swe included but doesn't exist)
            const domainRegistry = DomainRegistry_1.DomainRegistry.getInstance();
            const domains = await domainRegistry.discoverDomains(dir);
            for (const domain of domains) {
                const localFile = path_1.default.join(dir, domain, name, 'SKILL.md');
                try {
                    let content = await fs_1.default.promises.readFile(localFile, 'utf-8');
                    // Apply markdown link resolution if enabled
                    if (this.markdownLinkConfig.enabled) {
                        content = await this.getLinkResolver().resolveLinks(content, localFile, 0);
                    }
                    this.contentCache.set(name, content);
                    this.logger.info('[ON-DEMAND] skill served from local disk', { name, file: localFile });
                    return level > 0 ? this.applyCompressionAndCache(name, content, level) : content;
                }
                catch {
                    // Not in this directory — try the next domain
                }
            }
            // Fallback to flat structure for backwards compatibility
            const localFile = path_1.default.join(dir, name, 'SKILL.md');
            try {
                let content = await fs_1.default.promises.readFile(localFile, 'utf-8');
                // Apply markdown link resolution if enabled
                if (this.markdownLinkConfig.enabled) {
                    content = await this.getLinkResolver().resolveLinks(content, localFile, 0);
                }
                this.contentCache.set(name, content);
                this.logger.info('[ON-DEMAND] skill served from local disk (flat)', { name, file: localFile });
                return level > 0 ? this.applyCompressionAndCache(name, content, level) : content;
            }
            catch {
                // Not in this directory — try the next one
            }
        }
        // 4. Fetch from GitHub raw — honor GITHUB_RAW_BASE_URL env var
        const skill = this.skills.get(name);
        // If sourceFile not set, try to infer from domain metadata
        let skillPath = skill?.sourceFile;
        if (!skillPath) {
            const domain = skill?.metadata.category || 'programming';
            skillPath = `skills/${domain}/${name}/SKILL.md`;
        }
        // Defensive: strip container-absolute path prefix and leading slashes
        const cleanPath = skillPath
            .replace(/^\/?app\/skills\//, 'skills/')
            .replace(/^\/+/, '');
        const githubRawBase = (process.env.GITHUB_RAW_BASE_URL ||
            'https://raw.githubusercontent.com/paulpas/skills/main').replace(/\/+$/, '');
        const rawUrl = `${githubRawBase}/${cleanPath}`;
        this.logger.info('[ON-DEMAND] fetching skill from GitHub', { name, url: rawUrl });
        const t0 = Date.now();
        const response = await fetch(rawUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch skill ${name} from GitHub: ${response.status}`);
        }
        const content = await response.text();
        const durationMs = Date.now() - t0;
        this.logger.info('[ON-DEMAND] skill fetched from GitHub', { name, durationMs, bytes: content.length });
        // Apply markdown link resolution if enabled
        let processedContent = content;
        if (this.markdownLinkConfig.enabled) {
            // For GitHub-sourced skills, use the sourceFile path for relative resolution
            const resolvedSkillPath = skill?.sourceFile
                ? path_1.default.join(this.getSkillsBasePath(), skill.sourceFile)
                : path_1.default.join(this.getSkillsBasePath(), cleanPath);
            processedContent = await this.getLinkResolver().resolveLinks(content, resolvedSkillPath, 0);
        }
        // Cache in memory for the lifetime of this process
        this.contentCache.set(name, processedContent);
        // Persist to disk so next restart skips the GitHub fetch
        await this.persistSkillContent(name, processedContent);
        return level > 0 ? this.applyCompressionAndCache(name, processedContent, level) : processedContent;
    }
    /**
     * Get skill content from compression cache if valid (not expired)
     * Implements adaptive TTL: hot skills 30min, cold skills 1 hour
     */
    getFromCompressionCache(name, level) {
        const metrics = CompressionMetrics_1.CompressionMetrics.getInstance();
        const key = `${name}@L${level}`;
        const entry = this.compressionCache.get(key);
        // Guard: early return on cache miss
        if (!entry) {
            metrics.logCompressionEvent({
                timestamp: new Date().toISOString(),
                event: 'cache_miss',
                skillName: name,
                compressionLevel: level,
            });
            return null;
        }
        // Determine TTL based on skill hotness
        const isHotSkill = this.config.adaptiveTTL && this.topAccessedSkills.has(name);
        const ttl = isHotSkill ? this.HOT_SKILL_TTL_MS : this.COLD_SKILL_TTL_MS;
        // Check if entry is expired
        const now = Date.now();
        if (now - entry.timestamp > ttl) {
            this.logger.info('[COMPRESSION-CACHE] entry expired', {
                name,
                level,
                ageMs: now - entry.timestamp,
                isHotSkill,
                ttlMs: ttl,
            });
            this.compressionCache.delete(key);
            this.currentCacheSizeBytes -= entry.sizeBytes;
            metrics.logCompressionEvent({
                timestamp: new Date().toISOString(),
                event: 'cache_miss',
                skillName: name,
                compressionLevel: level,
                ttlExpired: true,
            });
            return null;
        }
        // Update access tracking and reset timestamp
        entry.timestamp = now;
        entry.accessCount++;
        this.updateAccessPriority(name);
        // Log cache hit
        metrics.logCompressionEvent({
            timestamp: new Date().toISOString(),
            event: 'cache_hit',
            skillName: name,
            compressionLevel: level,
            accessCount: entry.accessCount,
        });
        return entry.content;
    }
    /**
     * Apply compression and cache the result
     */
    applyCompressionAndCache(name, content, level) {
        const metrics = CompressionMetrics_1.CompressionMetrics.getInstance();
        try {
            // Check if compression is worthwhile
            if (!this.compressor.shouldCompress(content)) {
                this.logger.debug('[COMPRESSION] skipped (too small)', { name, level, bytes: content.length });
                return content;
            }
            // Compress content
            const compressed = this.compressor.compress(content, level);
            if (compressed.isCompressed) {
                // Cache the compressed content
                const key = `${name}@L${level}`;
                const sizeBytes = compressed.compressedLength;
                // Check cache size and evict if necessary
                if (this.currentCacheSizeBytes + sizeBytes > this.maxCacheSizeBytes) {
                    this.evictLRUEntry();
                }
                // Store in cache
                this.compressionCache.set(key, {
                    content: compressed.content,
                    compressionLevel: level,
                    timestamp: Date.now(),
                    accessCount: 1,
                    sizeBytes,
                });
                this.currentCacheSizeBytes += sizeBytes;
                // Log compression event with metrics
                metrics.logCompressionEvent({
                    timestamp: new Date().toISOString(),
                    event: 'compression',
                    skillName: name,
                    compressionLevel: level,
                    tokensBefore: compressed.originalLength,
                    tokensAfter: compressed.compressedLength,
                    compressPercent: compressed.compressPercent,
                    cacheSize: this.currentCacheSizeBytes,
                    error: null,
                });
                this.logger.info('[COMPRESSION] content cached', {
                    name,
                    level,
                    originalBytes: compressed.originalLength,
                    compressedBytes: compressed.compressedLength,
                    compressPercent: compressed.compressPercent,
                    tokensSaved: compressed.tokensSaved,
                    cacheSize: (this.currentCacheSizeBytes / 1024 / 1024).toFixed(1),
                });
                return compressed.content;
            }
            // Compression failed — return original
            metrics.logCompressionEvent({
                timestamp: new Date().toISOString(),
                event: 'compression',
                skillName: name,
                compressionLevel: level,
                error: 'Compression produced no reduction',
            });
            this.logger.warn('[COMPRESSION] failed, returning original', { name, level });
            return content;
        }
        catch (error) {
            // Fail gracefully: log error and return original content
            const errorMsg = error instanceof Error ? error.message : String(error);
            metrics.logCompressionEvent({
                timestamp: new Date().toISOString(),
                event: 'compression',
                skillName: name,
                compressionLevel: level,
                error: errorMsg,
            });
            this.logger.error('[COMPRESSION] error', {
                name,
                level,
                error: errorMsg,
            });
            return content;
        }
    }
    /**
     * Evict the least recently accessed entry from the compression cache.
     * Prefers evicting cold skills over hot skills to maintain hit rate.
     * Early Exit: guard on empty cache
     */
    evictLRUEntry() {
        const metrics = CompressionMetrics_1.CompressionMetrics.getInstance();
        if (this.compressionCache.size === 0) {
            return; // Guard: nothing to evict
        }
        let lruKey = null;
        let lruAccessCount = Infinity;
        let lruTimestamp = Infinity;
        // First pass: find coldest cold skill to evict (not in topAccessedSkills)
        for (const [key, entry] of this.compressionCache.entries()) {
            const skillName = key.split('@')[0];
            if (this.topAccessedSkills.has(skillName)) {
                continue; // Skip hot skills — protect them from eviction
            }
            // LRU: lowest access count, then oldest timestamp
            if (entry.accessCount < lruAccessCount || (entry.accessCount === lruAccessCount && entry.timestamp < lruTimestamp)) {
                lruKey = key;
                lruAccessCount = entry.accessCount;
                lruTimestamp = entry.timestamp;
            }
        }
        // Fallback: if all remaining entries are hot skills, evict the oldest hot skill
        if (!lruKey) {
            for (const [key, entry] of this.compressionCache.entries()) {
                if (entry.accessCount < lruAccessCount || (entry.accessCount === lruAccessCount && entry.timestamp < lruTimestamp)) {
                    lruKey = key;
                    lruAccessCount = entry.accessCount;
                    lruTimestamp = entry.timestamp;
                }
            }
        }
        if (!lruKey) {
            return; // Guard: should not happen
        }
        const entry = this.compressionCache.get(lruKey);
        if (entry) {
            const skillName = lruKey.split('@')[0];
            this.currentCacheSizeBytes -= entry.sizeBytes;
            this.compressionCache.delete(lruKey);
            metrics.logCompressionEvent({
                timestamp: new Date().toISOString(),
                event: 'cache_eviction',
                skillName,
                cacheSize: this.currentCacheSizeBytes,
            });
            this.logger.info('[COMPRESSION-CACHE] LRU eviction', {
                key: lruKey,
                skillName,
                isHotSkill: this.topAccessedSkills.has(skillName),
                freedBytes: entry.sizeBytes,
                cacheSize: (this.currentCacheSizeBytes / 1024 / 1024).toFixed(1),
            });
        }
    }
    /** Write skill content to the on-disk content cache (non-fatal on error). */
    async persistSkillContent(name, content) {
        try {
            const cacheDir = path_1.default.join(this.config.cacheDirectory ?? './.skill-cache', 'content');
            await fs_1.default.promises.mkdir(cacheDir, { recursive: true });
            await fs_1.default.promises.writeFile(path_1.default.join(cacheDir, `${name}.md`), content, 'utf-8');
        }
        catch {
            // Non-fatal: disk cache is best-effort
        }
    }
    /**
     * Pre-populate the memory content cache from the on-disk content cache at startup.
     * This avoids a GitHub round-trip for skills accessed since last restart.
     */
    loadPersistedContentCache() {
        try {
            const cacheDir = path_1.default.join(this.config.cacheDirectory ?? './.skill-cache', 'content');
            if (!fs_1.default.existsSync(cacheDir))
                return;
            const files = fs_1.default.readdirSync(cacheDir).filter((f) => f.endsWith('.md'));
            for (const file of files) {
                const skillName = file.replace(/\.md$/, '');
                const content = fs_1.default.readFileSync(path_1.default.join(cacheDir, file), 'utf-8');
                this.contentCache.set(skillName, content);
            }
            if (files.length > 0) {
                this.logger.info('[ON-DEMAND] Loaded persisted skill content from disk cache', { count: files.length });
            }
        }
        catch {
            // Cache directory doesn't exist yet — first boot
        }
    }
    /**
     * Update access priority for a skill to track hotness.
     * Used by getFromCompressionCache to build top-N list.
     */
    updateAccessPriority(skillName) {
        const current = this.accessPriority.get(skillName) || 0;
        const newScore = current + 1;
        this.accessPriority.set(skillName, newScore);
        // Update top accessed skills if this skill qualifies
        if (newScore > 0 && this.topAccessedSkills.size < this.HOT_SKILLS_COUNT) {
            this.topAccessedSkills.add(skillName);
        }
        else if (this.topAccessedSkills.size >= this.HOT_SKILLS_COUNT) {
            // Find the lowest-scoring skill in top-N
            let minSkill = null;
            let minScore = Infinity;
            for (const skill of this.topAccessedSkills) {
                const score = this.accessPriority.get(skill) || 0;
                if (score < minScore) {
                    minScore = score;
                    minSkill = skill;
                }
            }
            // If this skill scores higher, replace the minimum
            if (minSkill && newScore > minScore) {
                this.topAccessedSkills.delete(minSkill);
                this.topAccessedSkills.add(skillName);
            }
        }
    }
    /**
     * Warm up compression cache by pre-compressing top N frequently accessed skills.
     * Non-blocking: logs progress but doesn't throw on errors.
     * Useful for startup: ensures hot skills are ready in memory.
     */
    async warmupCompressionCache(topN = 100) {
        const warmupCount = Math.min(topN, this.config.warmupSkillsCount ?? 100);
        if (warmupCount === 0) {
            this.logger.info('[COMPRESSION-WARMUP] disabled (warmupSkillsCount=0)');
            return;
        }
        this.logger.info('[COMPRESSION-WARMUP] starting', { topN: warmupCount });
        const t0 = Date.now();
        let successCount = 0;
        let skippedCount = 0;
        // Collect skills to warm (try to get frequently accessed ones first)
        const skillsToWarm = [];
        // First priority: skills already in topAccessedSkills
        for (const skill of this.topAccessedSkills) {
            if (skillsToWarm.length >= warmupCount)
                break;
            skillsToWarm.push(skill);
        }
        // Second priority: random sample from all skills
        if (skillsToWarm.length < warmupCount) {
            const allSkills = Array.from(this.skills.keys());
            const shuffled = allSkills.sort(() => Math.random() - 0.5);
            for (const skill of shuffled) {
                if (skillsToWarm.length >= warmupCount)
                    break;
                if (!this.topAccessedSkills.has(skill)) {
                    skillsToWarm.push(skill);
                }
            }
        }
        // Save original link following state and disable during warmup
        const originalLinkFollowing = this.markdownLinkConfig.enabled;
        this.markdownLinkConfig.enabled = false;
        try {
            // Compress skills in batches (non-blocking with delays)
            const batchSize = this.config.compressionBatchSize ?? 10;
            for (let i = 0; i < skillsToWarm.length; i += batchSize) {
                const batch = skillsToWarm.slice(i, i + batchSize);
                // Process batch in parallel
                const batchPromises = batch.map((skillName) => this.getSkillContent(skillName, this.config.compressionLevel ?? 0)
                    .then(() => {
                    successCount++;
                })
                    .catch((err) => {
                    skippedCount++;
                    this.logger.debug('[COMPRESSION-WARMUP] failed for skill', {
                        skillName,
                        error: err instanceof Error ? err.message : String(err),
                    });
                }));
                await Promise.all(batchPromises);
                // Small delay between batches to avoid overwhelming the system
                if (i + batchSize < skillsToWarm.length) {
                    await new Promise((resolve) => setTimeout(resolve, 100));
                }
            }
        }
        finally {
            // Restore original link following state
            this.markdownLinkConfig.enabled = originalLinkFollowing;
        }
        const durationMs = Date.now() - t0;
        this.logger.info('[COMPRESSION-WARMUP] complete', {
            totalRequested: warmupCount,
            successCount,
            skippedCount,
            durationMs,
            avgTimePerSkillMs: (durationMs / successCount).toFixed(1),
        });
    }
    /**
     * Load all skills from one or more skill directories.
     * Directories are processed in order; first directory wins on name collision
     * so local skills always override remote ones.
     * Within each directory, files are processed in parallel batches for improved performance.
     */
    async loadSkills() {
        const dirs = Array.isArray(this.config.skillsDirectory)
            ? this.config.skillsDirectory
            : [this.config.skillsDirectory];
        this.logger.info('Loading skills from directories', { directories: dirs });
        // Process files in parallel batches of 20 for better performance
        const BATCH_SIZE = 20;
        for (const dir of dirs) {
            let successCount = 0;
            let errorCount = 0;
            try {
                const pattern = path_1.default.join(dir, '**/SKILL.md');
                const files = await (0, glob_1.glob)(pattern);
                this.logger.debug(`Found ${files.length} SKILL.md files in ${dir}`);
                // Process files in batches to maintain directory order while enabling parallelism within batch
                for (let i = 0; i < files.length; i += BATCH_SIZE) {
                    const batch = files.slice(i, i + BATCH_SIZE);
                    // Process batch in parallel
                    const batchPromises = batch.map(async (file) => {
                        try {
                            const skill = await this.loadSkillFromFile(file);
                            return { skill, file, error: null };
                        }
                        catch (error) {
                            return { skill: null, file, error };
                        }
                    });
                    const batchResults = await Promise.all(batchPromises);
                    // Process results sequentially to maintain local-first semantics
                    for (const result of batchResults) {
                        const { skill, file, error } = result;
                        if (error) {
                            errorCount++;
                            this.logger.error(`Failed to load skill from ${file}`, {
                                error: error instanceof Error ? error.message : String(error),
                            });
                        }
                        else if (skill) {
                            // Local-first: overwrite metadata-only entries with full-content local skills
                            if (this.skills.has(skill.metadata.name)) {
                                const existing = this.skills.get(skill.metadata.name);
                                // If the existing skill has no content but the local one does, update it
                                if (!existing.rawContent && skill.rawContent) {
                                    existing.rawContent = skill.rawContent;
                                    this.logger.debug(`Updated local content for: ${skill.metadata.name}`, {
                                        file,
                                    });
                                    successCount++;
                                    continue;
                                }
                                // If both have content, keep the first one (already loaded)
                                this.logger.debug(`Skipping duplicate skill from remote: ${skill.metadata.name}`);
                            }
                            else {
                                this.addSkill(skill);
                                this.logger.debug(`Loaded skill: ${skill.metadata.name}`, {
                                    file,
                                    category: skill.metadata.category,
                                    tags: skill.metadata.tags,
                                });
                                successCount++;
                            }
                        }
                        else {
                            errorCount++;
                        }
                    }
                }
            }
            catch (error) {
                this.logger.warn(`Failed to scan directory ${dir}`, {
                    error: error instanceof Error ? error.message : String(error),
                });
            }
            this.logger.info(`Loaded ${successCount} skills from ${dir}`, { dir, successCount, errorCount });
        }
        if (this.config.generateEmbeddings) {
            await this.generateMissingEmbeddings();
        }
        this.logger.info(`Loaded ${this.skills.size} skills total`, {
            skillCount: this.skills.size,
            categories: this.skillsByCategory.size,
            tags: this.skillsByTag.size,
        });
    }
    /**
     * Load a single skill from a SKILL.md file
     */
    async loadSkillFromFile(filePath) {
        try {
            const content = await fs_1.default.promises.readFile(filePath, 'utf-8');
            const metadata = this.parseSkillFromMarkdown(content, filePath);
            if (!this.isValidSkillMetadata(metadata)) {
                this.logger.warn(`Invalid skill metadata in ${filePath}`);
                return null;
            }
            // Quality gate: detect and mark stub skills
            const isStub = this.isStubSkill(content);
            if (isStub) {
                metadata.draft = true;
                this.logger.debug(`Marked skill as stub: ${metadata.name}`, {
                    file: filePath,
                    contentBytes: content.length,
                });
            }
            return { metadata, sourceFile: filePath, rawContent: content };
        }
        catch (error) {
            this.logger.error(`Failed to parse skill file ${filePath}`, {
                error: error instanceof Error ? error.message : String(error),
            });
            return null;
        }
    }
    /**
     * Parse skill metadata from a SKILL.md file with YAML frontmatter
     * Maps OpenCode skill frontmatter fields to SkillMetadata schema
     */
    /**
     * Parse skill metadata from a SKILL.md file with YAML frontmatter.
     * Public for testability; callers should not rely on internal parsing details.
     */
    parseSkillFromMarkdown(content, filePath) {
        // Extract YAML frontmatter between --- delimiters
        const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
        if (!fmMatch) {
            this.logger.debug(`No YAML frontmatter found in ${filePath}, using filename defaults`);
            const baseName = path_1.default.basename(path_1.default.dirname(filePath));
            return {
                name: baseName,
                category: baseName.split('-')[0] || 'general',
                description: `Skill loaded from ${baseName}`,
                tags: [baseName.split('-')[0] || 'general'],
                input_schema: { type: 'object', properties: {}, required: [] },
                output_schema: { type: 'object', properties: {}, required: [] },
            };
        }
        let fm;
        try {
            fm = yaml_1.default.parse(fmMatch[1]);
            if (!fm || typeof fm !== 'object')
                throw new Error('YAML parsed to non-object');
        }
        catch (yamlErr) {
            this.logger.debug(`YAML.parse failed for ${filePath}, trying lenient extractor`, {
                error: yamlErr instanceof Error ? yamlErr.message : String(yamlErr),
            });
            fm = this.parseFrontmatterLenient(fmMatch[1]);
            if (Object.keys(fm).length === 0) {
                this.logger.debug(`Lenient extractor found nothing in ${filePath}, using filename defaults`);
                const baseName = path_1.default.basename(path_1.default.dirname(filePath));
                return {
                    name: baseName,
                    category: baseName.split('-')[0] || 'general',
                    description: `Skill loaded from ${baseName}`,
                    tags: [baseName.split('-')[0] || 'general'],
                    input_schema: { type: 'object', properties: {}, required: [] },
                    output_schema: { type: 'object', properties: {}, required: [] },
                };
            }
        }
        // Map SKILL.md frontmatter fields to SkillMetadata
        const nestedMeta = fm.metadata || {};
        // name: use frontmatter name, fall back to directory name
        const name = fm.name || path_1.default.basename(path_1.default.dirname(filePath));
        // category: metadata.domain → category, fall back to domain prefix from name
        const category = nestedMeta.domain ||
            name.split('-')[0] ||
            'general';
        // description
        const description = fm.description || `Skill: ${name}`;
        // tags: parse metadata.triggers (comma-separated string) + add domain prefix
        const triggersRaw = nestedMeta.triggers || '';
        const triggerTags = triggersRaw
            .split(',')
            .map((t) => t.trim())
            .filter((t) => t.length > 0);
        // Also add role and scope as tags if present
        const roleTags = [
            nestedMeta.role,
            nestedMeta.scope,
        ].filter(Boolean);
        const tags = [...new Set([category, ...triggerTags, ...roleTags])];
        // Extract content-types from frontmatter (supports YAML array or comma-separated string)
        let contentTypes;
        const ctRaw = nestedMeta.contentTypes;
        if (Array.isArray(ctRaw)) {
            contentTypes = ctRaw.map((t) => String(t));
        }
        else if (typeof ctRaw === 'string') {
            contentTypes = ctRaw
                .split(',')
                .map((t) => t.trim())
                .filter((t) => t.length > 0);
        }
        // Cast to ContentType[] — caller should validate against allowed values
        const validContentTypes = contentTypes?.map((t) => t);
        // Backward compat: check for old output-format field and log deprecation
        const outputFormat = nestedMeta.outputFormat;
        if (outputFormat && !contentTypes) {
            this.logger.debug(`Skill ${name}: 'output-format' is deprecated, use 'content-types' instead`);
        }
        // --- Archetypes: from metadata.archetypes (YAML array or comma-separated string) ---
        let archetypes;
        const archRaw = nestedMeta.archetypes;
        if (Array.isArray(archRaw)) {
            archetypes = archRaw
                .map((a) => String(a).trim().toLowerCase())
                .filter(Boolean);
        }
        else if (typeof archRaw === 'string') {
            archetypes = archRaw
                .split(',')
                .map((a) => a.trim().toLowerCase())
                .filter((a) => a.length > 0);
        }
        // --- AntiTriggers: from metadata.anti_triggers (YAML array or comma-separated string) ---
        let antiTriggers;
        const antiRaw = nestedMeta.anti_triggers;
        if (Array.isArray(antiRaw)) {
            antiTriggers = antiRaw.map((t) => String(t).trim()).filter((t) => t.length > 0);
        }
        else if (typeof antiRaw === 'string') {
            antiTriggers = antiRaw
                .split(',')
                .map((t) => t.trim())
                .filter((t) => t.length > 0);
        }
        // --- ResponseProfile: from metadata.response_profile.* ---
        let responseProfile;
        const rpRaw = nestedMeta.response_profile;
        if (rpRaw && typeof rpRaw === 'object') {
            const verbosityRaw = String(rpRaw.verbosity || '').trim().toLowerCase();
            const directiveRaw = String(rpRaw.directive_strength || rpRaw.directiveness || '')
                .trim()
                .toLowerCase();
            const abstractRaw = String(rpRaw.abstraction_level || rpRaw.abstraction || '')
                .trim()
                .toLowerCase();
            const validVerbosity = ['low', 'medium', 'high'].includes(verbosityRaw)
                ? verbosityRaw
                : null;
            const validDirective = ['low', 'medium', 'high'].includes(directiveRaw)
                ? directiveRaw
                : null;
            const validAbstraction = ['operational', 'tactical', 'strategic'].includes(abstractRaw)
                ? abstractRaw
                : null;
            // Only build ResponseProfile if at least verbosity is known
            if (validVerbosity) {
                responseProfile = {
                    verbosity: validVerbosity,
                    directiveStrength: validDirective ?? 'medium',
                    abstractionLevel: validAbstraction ?? 'tactical',
                };
            }
        }
        return {
            name,
            category,
            description,
            tags: tags.length > 0 ? tags : [category],
            version: nestedMeta.version || '1.0.0',
            contentTypes: validContentTypes,
            archetypes: archetypes?.length ? archetypes : undefined,
            antiTriggers: antiTriggers?.length ? antiTriggers : undefined,
            responseProfile,
            input_schema: { type: 'object', properties: {}, required: [] },
            output_schema: { type: 'object', properties: {}, required: [] },
        };
    }
    /**
     * Validate skill metadata against expected schema
     */
    isValidSkillMetadata(metadata) {
        const requiredFields = ['name', 'category', 'description', 'tags'];
        for (const field of requiredFields) {
            const value = metadata[field];
            if (value === undefined || value === null) {
                return false;
            }
            if (Array.isArray(value) && value.length === 0) {
                return false;
            }
        }
        return true;
    }
    /**
     * Add a skill to the registry (no embedding — caller must invoke generateMissingEmbeddings())
     */
    addSkill(skill) {
        const name = skill.metadata.name;
        this.skills.set(name, skill);
        // Update category index
        const category = skill.metadata.category;
        if (!this.skillsByCategory.has(category)) {
            this.skillsByCategory.set(category, []);
        }
        this.skillsByCategory.get(category)?.push(name);
        // Update tag index
        for (const tag of skill.metadata.tags) {
            if (!this.skillsByTag.has(tag)) {
                this.skillsByTag.set(tag, []);
            }
            this.skillsByTag.get(tag)?.push(name);
        }
        this.logger.debug(`Added skill: ${name}`, {
            category: skill.metadata.category,
            tags: skill.metadata.tags.length,
        });
    }
    /**
     * Generate embeddings for skills that don't have them.
     * Processes skills in batches to avoid rate limiting.
     * Uses caching to skip re-generating existing embeddings.
     */
    async generateMissingEmbeddings() {
        const allSkills = Array.from(this.skills.values());
        const skillsNeedingEmbeddings = allSkills.filter((s) => !s.metadata?.embedding);
        if (skillsNeedingEmbeddings.length === 0) {
            this.logger.info('✅ All skills have embeddings', { total: allSkills.length });
            return;
        }
        this.logger.info(`📊 Generating embeddings for ${skillsNeedingEmbeddings.length} skills...`, { total: allSkills.length });
        // Build text entries with skill references (index maps to skill)
        const textEntries = skillsNeedingEmbeddings.map((skill) => ({
            skill,
            text: [
                skill.metadata.name,
                skill.metadata.description,
                skill.metadata.tags?.join(' ') || '',
            ]
                .filter(Boolean)
                .join(' '),
        }));
        // Process in large batches — each batch makes a SINGLE API call
        // with all texts sent as an array (e.g., { input: ["text1", "text2", ...] })
        // instead of N individual API calls
        const BATCH_SIZE = 200;
        let completed = 0;
        for (let i = 0; i < textEntries.length; i += BATCH_SIZE) {
            const batch = textEntries.slice(i, i + BATCH_SIZE);
            const texts = batch.map((e) => e.text);
            const batchStart = Date.now();
            const results = await this.embeddingService.batchEmbeddingsPreservingOrder(texts);
            for (let j = 0; j < batch.length; j++) {
                batch[j].skill.metadata.embedding = results[j].embedding;
            }
            completed += batch.length;
            const elapsed = Date.now() - batchStart;
            const percentage = Math.round((completed / skillsNeedingEmbeddings.length) * 100);
            this.logger.info(`  [${completed}/${skillsNeedingEmbeddings.length}] (${percentage}%) [${elapsed}ms]`);
        }
        this.logger.info('✅ Embedding generation complete', {
            generated: skillsNeedingEmbeddings.length,
        });
    }
    /**
     * Get a skill by name
     */
    getSkill(name) {
        return this.skills.get(name);
    }
    /**
     * Get all skills
     */
    getAllSkills() {
        return Array.from(this.skills.values());
    }
    /**
     * Get skills by category
     */
    getSkillsByCategory(category) {
        const names = this.skillsByCategory.get(category) || [];
        return names.map((name) => this.skills.get(name)).filter(Boolean);
    }
    /**
     * Get skills by tag
     */
    getSkillsByTag(tag) {
        const names = this.skillsByTag.get(tag) || [];
        return names.map((name) => this.skills.get(name)).filter(Boolean);
    }
    /**
     * Search skills by category or tag
     */
    searchByCategoryOrTag(searchTerm) {
        const categoryResults = this.getSkillsByCategory(searchTerm);
        if (categoryResults.length > 0) {
            return categoryResults;
        }
        const tagResults = this.getSkillsByTag(searchTerm);
        if (tagResults.length > 0) {
            return tagResults;
        }
        return [];
    }
    /**
     * Reload all skills
     */
    async reload() {
        this.skills.clear();
        this.skillsByCategory.clear();
        this.skillsByTag.clear();
        await this.loadSkills();
    }
    /**
     * Get the current number of skills in the registry.
     */
    getSkillCount() {
        return this.skills.size;
    }
    /**
     * Get registry statistics
     */
    getStats() {
        const skillsWithoutEmbeddings = Array.from(this.skills.values()).filter((s) => !s.metadata.embedding).length;
        const stubSkills = Array.from(this.skills.values()).filter((s) => s.metadata.draft === true).length;
        const realSkills = this.skills.size - stubSkills;
        // Get domain count from DomainRegistry
        const domainRegistry = DomainRegistry_1.DomainRegistry.getInstance();
        const domains = domainRegistry.getDomainCount();
        return {
            totalSkills: this.skills.size,
            categories: this.skillsByCategory.size,
            tags: this.skillsByTag.size,
            skillsWithoutEmbeddings,
            stubSkills,
            realSkills,
            domains,
        };
    }
    /**
     * Lenient line-by-line frontmatter extractor for YAML that strict parsers reject.
     * Handles: unquoted colons in values, tabs, CRLF line endings, trailing spaces.
     */
    parseFrontmatterLenient(raw) {
        const result = {};
        const metadataBlock = {};
        let inMetadata = false;
        const lines = raw.replace(/\r\n/g, '\n').split('\n');
        for (const line of lines) {
            const trimmed = line.trimEnd();
            if (!trimmed || trimmed.startsWith('#'))
                continue;
            // Detect start of metadata: block (indented sub-keys follow)
            if (/^metadata\s*:/.test(trimmed)) {
                inMetadata = true;
                continue;
            }
            // Indented line inside metadata block
            if (inMetadata && /^\s+\S/.test(line)) {
                const metaMatch = trimmed.match(/^([a-zA-Z0-9_-]+)\s*:\s*(.*)/);
                if (metaMatch) {
                    const rawValue = this.unquoteFrontmatterValue(metaMatch[2].trim());
                    // YAML array: [tactical, diagnostic] — parse as JSON-like array
                    if (rawValue.startsWith('[') && rawValue.endsWith(']')) {
                        try {
                            metadataBlock[metaMatch[1]] = yaml_1.default.parse(rawValue);
                        }
                        catch {
                            metadataBlock[metaMatch[1]] = rawValue;
                        }
                    }
                    else {
                        metadataBlock[metaMatch[1]] = rawValue;
                    }
                }
                continue;
            }
            // Any non-indented line ends the metadata block
            if (inMetadata && !/^\s/.test(line)) {
                inMetadata = false;
            }
            // Top-level key: value — take EVERYTHING after the first colon as the value.
            // This handles unquoted values containing colons (e.g. "description: Foo: Bar").
            const topMatch = trimmed.match(/^([a-zA-Z0-9_-]+)\s*:\s*(.*)/);
            if (topMatch) {
                result[topMatch[1]] = this.unquoteFrontmatterValue(topMatch[2].trim());
            }
        }
        if (Object.keys(metadataBlock).length > 0) {
            result['metadata'] = metadataBlock;
        }
        return result;
    }
    /** Strip surrounding single or double quotes from a YAML scalar value */
    unquoteFrontmatterValue(value) {
        if (!value)
            return value;
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
            return value.slice(1, -1);
        }
        return value;
    }
    /**
          * Initialize the LLM-based compressor with an LLM client
          * Called once after LLM client is available
          */
    setLLMClient(llmClient) {
        if (!llmClient) {
            this.logger.warn('Attempted to set null LLM client');
            return;
        }
        if (typeof llmClient !== 'object' || llmClient === null) {
            this.logger.error('Invalid LLM client: expected object', { type: typeof llmClient });
            return;
        }
        if (!('createCompletion' in llmClient)) {
            this.logger.error('Invalid LLM client: missing createCompletion method');
            return;
        }
        this.llmCompressor = new LLMSkillCompressor_1.LLMSkillCompressor(llmClient);
        this.logger.info('LLM compressor initialized');
    }
    /**
     * Pre-compute compressed versions for a skill (fire-and-forget, async)
     * Called after loading a skill to populate caches
     * No errors thrown: graceful degradation if compression fails
     * Public so it can be called from tests and external code
     */
    async preComputeCompressedVersions(skillName, domain, content) {
        // Guard: LLM compressor not initialized
        if (!this.llmCompressor || !this.deduplicator || !this.diskCache) {
            return;
        }
        try {
            // Deduplicate concurrent requests
            const compressed = await this.deduplicator.compress(skillName, content, this.llmCompressor);
            if (!compressed) {
                // Compression failed or returned null
                this.logger.debug('Compression returned null', { skillName, domain });
                this.incrementAccessCounter(skillName);
                return;
            }
            // Save to disk cache (lazy write)
            await this.diskCache.saveCompressedVersions(skillName, domain, compressed);
            this.logger.debug('Pre-computed compressed versions', {
                skillName,
                domain,
                briefPercent: compressed.brief.compressPercent,
                moderatePercent: compressed.moderate.compressPercent,
                detailedPercent: compressed.detailed.compressPercent,
            });
        }
        catch (error) {
            // Fail gracefully: log error and increment retry counter
            this.logger.error('Pre-compute compression failed', {
                skillName,
                domain,
                error: String(error),
            });
            this.incrementAccessCounter(skillName);
        }
    }
    /**
     * Get skill content with cache layering (memory → disk → original)
     * Implements versionHint for compression version selection
     */
    async getSkillContentWithCompression(skillName, domain, versionHint) {
        // Guard: validate inputs
        if (!skillName || !domain) {
            this.logger.warn('Invalid input to getSkillContentWithCompression', {
                skillName,
                domain,
            });
            return { content: '', compressPercent: 0 };
        }
        // Use moderate as default if not specified
        const version = versionHint || 'moderate';
        // 1. Check in-memory cache (1 hour TTL from last access)
        if (this.memoryCache) {
            const cached = this.memoryCache.get(skillName, version);
            if (cached) {
                this.logger.debug('Served from memory cache', {
                    skillName,
                    version,
                });
                return { content: cached.content, compressPercent: cached.compressPercent };
            }
        }
        // 2. Check disk cache (fresh only, 7-day max age)
        if (this.diskCache) {
            const cached = await this.diskCache.getCompressedVersion(skillName, domain, version);
            if (cached) {
                // Add to memory cache for faster next hit
                if (this.memoryCache) {
                    this.memoryCache.set(skillName, version, cached);
                }
                this.logger.debug('Served from disk cache', {
                    skillName,
                    version,
                });
                return { content: cached.content, compressPercent: cached.compressPercent };
            }
            // Check access count for deferred retry
            const accessInfo = this.accessCounter.get(skillName);
            if (accessInfo) {
                const windowMs = Date.now() - accessInfo.window.getTime();
                if (windowMs < 30 * 60 * 1000 && accessInfo.count > 2) {
                    // Mark for deferred retry
                    this.logger.info('Scheduling deferred retry', {
                        skillName,
                        accessCount: accessInfo.count,
                        windowMinutes: (windowMs / 1000 / 60).toFixed(1),
                    });
                    // Could schedule a re-compression here
                }
            }
        }
        // 3. Fallback: get original content and apply version-based compression
        this.logger.debug('Serving compressed content (no cache hit)', {
            skillName,
            version,
        });
        // Map version hint to compression level
        const levelMap = {
            brief: 1,
            moderate: 5,
            detailed: 8,
        };
        const compressionLevel = levelMap[version] ?? 5;
        try {
            // Get original content (no compression level applied)
            const originalContent = await this.getSkillContent(skillName, 0);
            // Apply version-based compression
            const compressed = this.compressor.compress(originalContent, compressionLevel);
            this.logger.info('Applied version-based compression', {
                skillName,
                version,
                compressionLevel,
                tokensSaved: compressed.tokensSaved,
                compressPercent: compressed.compressPercent,
            });
            return { content: compressed.content, compressPercent: compressed.compressPercent };
        }
        catch (error) {
            // Fail fast: if compression fails, return original content
            this.logger.warn('Compression failed, returning original content', {
                skillName,
                error: error instanceof Error ? error.message : String(error),
            });
            const originalContent = await this.getSkillContent(skillName, 0);
            return { content: originalContent, compressPercent: 0 };
        }
    }
    /**
     * Increment access counter for smart retry tracking
     * Tracks access within 30-minute windows
     */
    incrementAccessCounter(skillName) {
        const now = Date.now();
        const entry = this.accessCounter.get(skillName);
        if (!entry) {
            // New entry
            this.accessCounter.set(skillName, {
                count: 1,
                window: new Date(),
            });
            return;
        }
        // Check if still in same 30-minute window
        const windowMs = now - entry.window.getTime();
        if (windowMs < 30 * 60 * 1000) {
            // Same window: increment
            entry.count++;
        }
        else {
            // New window: reset
            entry.count = 1;
            entry.window = new Date();
        }
    }
    /**
     * Update markdown link following configuration at runtime with partial updates
     * Only updates fields that are provided in the partial config
     *
     * @param partialConfig - Partial configuration object with only the fields to update
     * @throws Error if configuration update fails or validation fails
     */
    updateMarkdownLinkConfig(partialConfig) {
        // Guard: early exit on empty config (fail fast, fail loud)
        if (!partialConfig || Object.keys(partialConfig).length === 0) {
            this.logger.warn('Markdown link config update ignored: empty config');
            return;
        }
        const { enabled, allowExternalLinks, maxDepth, maxExternalSizeKb, compressionMode, jsRenderingEnabled, jsRenderTimeoutMs, jsRenderFallback, resolutionMode, semanticTopK, semanticSimilarityThreshold, } = partialConfig;
        const { enabled: currentEnabled, allowExternalLinks: currentAllowExternalLinks, maxDepth: currentMaxDepth, maxExternalSizeKb: currentMaxExternalSizeKb, compressionMode: currentCompressionMode, jsRenderingEnabled: currentJsRenderingEnabled, jsRenderTimeoutMs: currentJsRenderTimeoutMs, jsRenderFallback: currentJsRenderFallback, resolutionMode: currentResolutionMode, semanticTopK: currentSemanticTopK, semanticSimilarityThreshold: currentSemanticSimilarityThreshold, } = this.markdownLinkConfig;
        // Guard: explicit type check before bounds validation (fail fast, fail loud)
        if (maxDepth !== undefined) {
            if (typeof maxDepth !== 'number') {
                throw new Error(`Invalid maxDepth: ${maxDepth}. Must be a number.`);
            }
            if (maxDepth < 1 || maxDepth > 10) {
                throw new Error(`Invalid maxDepth: ${maxDepth}. Must be between 1 and 10 (inclusive).`);
            }
        }
        if (maxExternalSizeKb !== undefined) {
            if (typeof maxExternalSizeKb !== 'number') {
                throw new Error(`Invalid maxExternalSizeKb: ${maxExternalSizeKb}. Must be a number.`);
            }
            if (maxExternalSizeKb < 1 || maxExternalSizeKb > 1000) {
                throw new Error(`Invalid maxExternalSizeKb: ${maxExternalSizeKb}. Must be between 1 and 1000 (inclusive).`);
            }
        }
        if (compressionMode !== undefined) {
            const validModes = ['brief', 'moderate', 'skip'];
            if (!validModes.includes(compressionMode)) {
                throw new Error(`Invalid compressionMode: ${compressionMode}. Must be one of: brief, moderate, skip.`);
            }
        }
        if (jsRenderTimeoutMs !== undefined) {
            if (typeof jsRenderTimeoutMs !== 'number') {
                throw new Error(`Invalid jsRenderTimeoutMs: ${jsRenderTimeoutMs}. Must be a number.`);
            }
            if (jsRenderTimeoutMs < 1000 || jsRenderTimeoutMs > 30000) {
                throw new Error(`Invalid jsRenderTimeoutMs: ${jsRenderTimeoutMs}. Must be between 1000 and 30000 (inclusive).`);
            }
        }
        if (jsRenderFallback !== undefined) {
            if (typeof jsRenderFallback !== 'boolean') {
                throw new Error(`Invalid jsRenderFallback: ${jsRenderFallback}. Must be a boolean.`);
            }
        }
        if (resolutionMode !== undefined) {
            const validModes = ['inline', 'semantic', 'compressed'];
            if (!validModes.includes(resolutionMode)) {
                throw new Error(`Invalid resolutionMode: ${resolutionMode}. Must be one of: inline, semantic, compressed.`);
            }
        }
        if (semanticTopK !== undefined) {
            if (typeof semanticTopK !== 'number') {
                throw new Error(`Invalid semanticTopK: ${semanticTopK}. Must be a number.`);
            }
            if (semanticTopK < 1 || semanticTopK > 20) {
                throw new Error(`Invalid semanticTopK: ${semanticTopK}. Must be between 1 and 20 (inclusive).`);
            }
        }
        if (semanticSimilarityThreshold !== undefined) {
            if (typeof semanticSimilarityThreshold !== 'number') {
                throw new Error(`Invalid semanticSimilarityThreshold: ${semanticSimilarityThreshold}. Must be a number.`);
            }
            if (semanticSimilarityThreshold < 0 || semanticSimilarityThreshold > 1) {
                throw new Error(`Invalid semanticSimilarityThreshold: ${semanticSimilarityThreshold}. Must be between 0 and 1 (inclusive).`);
            }
        }
        // Immutable update: create new config object instead of mutating
        const newConfig = {
            enabled: enabled !== undefined ? enabled : currentEnabled,
            allowExternalLinks: allowExternalLinks !== undefined ? allowExternalLinks : currentAllowExternalLinks,
            maxDepth: maxDepth !== undefined ? maxDepth : currentMaxDepth,
            maxExternalSizeKb: maxExternalSizeKb !== undefined ? maxExternalSizeKb : currentMaxExternalSizeKb,
            compressionMode: compressionMode !== undefined ? compressionMode : currentCompressionMode,
            jsRenderingEnabled: jsRenderingEnabled !== undefined ? jsRenderingEnabled : currentJsRenderingEnabled,
            jsRenderTimeoutMs: jsRenderTimeoutMs !== undefined ? jsRenderTimeoutMs : currentJsRenderTimeoutMs,
            jsRenderFallback: jsRenderFallback !== undefined ? jsRenderFallback : currentJsRenderFallback,
            resolutionMode: resolutionMode !== undefined ? resolutionMode : currentResolutionMode,
            semanticTopK: semanticTopK !== undefined ? semanticTopK : currentSemanticTopK,
            semanticSimilarityThreshold: semanticSimilarityThreshold !== undefined ? semanticSimilarityThreshold : currentSemanticSimilarityThreshold,
        };
        // Update the instance with the new config
        this.markdownLinkConfig = newConfig;
        // Invalidate content cache when link following state changes or resolution mode changes
        // Resolved content differs from raw content, so cached entries become stale
        if (enabled !== undefined || allowExternalLinks !== undefined || resolutionMode !== undefined) {
            const invalidatedCount = this.contentCache.size;
            this.contentCache.clear();
            this.logger.info('Content cache invalidated due to link config change', {
                invalidatedEntries: invalidatedCount,
                newConfig: this.markdownLinkConfig,
            });
        }
        // Reset the resolver instance so it picks up new config on next use
        this.linkResolver = null;
        this.logger.info('Markdown link following config updated', {
            config: this.markdownLinkConfig,
        });
    }
    /**
     * Get the current markdown link following configuration
     *
     * @returns The current configuration object
     */
    getMarkdownLinkConfig() {
        return this.markdownLinkConfig;
    }
}
exports.SkillRegistry = SkillRegistry;
//# sourceMappingURL=SkillRegistry.js.map