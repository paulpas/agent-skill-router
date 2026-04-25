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
const Logger_js_1 = require("../observability/Logger.js");
const SkillCompressor_js_1 = require("./SkillCompressor.js");
const CompressionMetrics_js_1 = require("../utils/CompressionMetrics.js");
const LLMSkillCompressor_js_1 = require("./LLMSkillCompressor.js");
const DiskCompressionCache_js_1 = require("./DiskCompressionCache.js");
const InMemoryCompressionCache_js_1 = require("./InMemoryCompressionCache.js");
const CompressionDeduplicator_js_1 = require("./CompressionDeduplicator.js");
/**
 * Skill Registry - manages all available skills
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
    ONE_HOUR_MS = 60 * 60 * 1000;
    // Phase 3-5: LLM-based compression system
    llmCompressor = null;
    diskCache = null;
    memoryCache = null;
    deduplicator = null;
    accessCounter = new Map();
    constructor(config) {
        this.config = {
            cacheDirectory: './.skill-cache',
            generateEmbeddings: true,
            compressionLevel: 0,
            maxCacheSizeBytes: 100 * 1024 * 1024, // 100MB
            ...config,
        };
        this.maxCacheSizeBytes = this.config.maxCacheSizeBytes || 100 * 1024 * 1024;
        this.compressor = new SkillCompressor_js_1.SkillCompressor();
        this.logger = new Logger_js_1.Logger('SkillRegistry');
        // Initialize metrics with max cache size
        const metrics = CompressionMetrics_js_1.CompressionMetrics.getInstance();
        metrics.setMaxCacheSize(this.maxCacheSizeBytes);
        // Initialize LLM-based compression caches (Phase 3-5)
        const skillsDir = Array.isArray(this.config.skillsDirectory)
            ? this.config.skillsDirectory[0]
            : this.config.skillsDirectory;
        this.diskCache = new DiskCompressionCache_js_1.DiskCompressionCache(skillsDir);
        this.memoryCache = new InMemoryCompressionCache_js_1.InMemoryCompressionCache(60); // 1 hour TTL
        this.deduplicator = new CompressionDeduplicator_js_1.CompressionDeduplicator();
        // llmCompressor: will be initialized when LLM client becomes available
        this.loadPersistedContentCache();
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
        const entries = await response.json();
        this.logger.info('[INDEX] Skills index loaded', { count: entries.length, durationMs: Date.now() - t0 });
        for (const entry of entries) {
            const metadata = {
                name: entry.name,
                category: entry.domain,
                description: entry.description,
                tags: entry.tags,
                input_schema: { type: 'object', properties: {}, required: [] },
                output_schema: { type: 'object', properties: {}, required: [] },
            };
            const skill = { metadata, sourceFile: entry.path, rawContent: '' };
            if (!this.skills.has(entry.name)) {
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
            const DOMAINS = ['agent', 'cncf', 'coding', 'programming', 'trading'];
            for (const domain of DOMAINS) {
                const localFile = path_1.default.join(dir, domain, name, 'SKILL.md');
                try {
                    const content = await fs_1.default.promises.readFile(localFile, 'utf-8');
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
                const content = await fs_1.default.promises.readFile(localFile, 'utf-8');
                this.contentCache.set(name, content);
                this.logger.info('[ON-DEMAND] skill served from local disk (flat)', { name, file: localFile });
                return level > 0 ? this.applyCompressionAndCache(name, content, level) : content;
            }
            catch {
                // Not in this directory — try the next one
            }
        }
        // 4. Fetch from GitHub raw
        const skill = this.skills.get(name);
        // If sourceFile not set, try to infer from domain metadata
        let skillPath = skill?.sourceFile;
        if (!skillPath) {
            const domain = skill?.metadata.category || 'programming';
            skillPath = `skills/${domain}/${name}/SKILL.md`;
        }
        const rawUrl = `https://raw.githubusercontent.com/paulpas/agent-skill-router/main/${skillPath}`;
        this.logger.info('[ON-DEMAND] fetching skill from GitHub', { name, url: rawUrl });
        const t0 = Date.now();
        const response = await fetch(rawUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch skill ${name} from GitHub: ${response.status}`);
        }
        const content = await response.text();
        const durationMs = Date.now() - t0;
        this.logger.info('[ON-DEMAND] skill fetched from GitHub', { name, durationMs, bytes: content.length });
        // Cache in memory for the lifetime of this process
        this.contentCache.set(name, content);
        // Persist to disk so next restart skips the GitHub fetch
        await this.persistSkillContent(name, content);
        return level > 0 ? this.applyCompressionAndCache(name, content, level) : content;
    }
    /**
     * Get skill content from compression cache if valid (not expired)
     */
    getFromCompressionCache(name, level) {
        const metrics = CompressionMetrics_js_1.CompressionMetrics.getInstance();
        const key = `${name}@L${level}`;
        const entry = this.compressionCache.get(key);
        if (!entry) {
            // Log cache miss
            metrics.logCompressionEvent({
                timestamp: new Date().toISOString(),
                event: 'cache_miss',
                skillName: name,
                compressionLevel: level,
            });
            return null;
        }
        // Check if entry is expired (1 hour from last access)
        const now = Date.now();
        if (now - entry.timestamp > this.ONE_HOUR_MS) {
            this.logger.info('[COMPRESSION-CACHE] entry expired', { name, level, ageMs: now - entry.timestamp });
            this.compressionCache.delete(key);
            this.currentCacheSizeBytes -= entry.sizeBytes;
            // Log TTL expiration
            metrics.logCompressionEvent({
                timestamp: new Date().toISOString(),
                event: 'cache_miss',
                skillName: name,
                compressionLevel: level,
                ttlExpired: true,
            });
            return null;
        }
        // Update TTL (reset timestamp on each access)
        entry.timestamp = now;
        entry.accessCount++;
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
        const metrics = CompressionMetrics_js_1.CompressionMetrics.getInstance();
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
                    ratio: compressed.ratio,
                    cacheSize: this.currentCacheSizeBytes,
                    error: null,
                });
                this.logger.info('[COMPRESSION] content cached', {
                    name,
                    level,
                    originalBytes: compressed.originalLength,
                    compressedBytes: compressed.compressedLength,
                    ratio: compressed.ratio.toFixed(2),
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
     * Evict the least recently accessed entry from the compression cache
     */
    evictLRUEntry() {
        const metrics = CompressionMetrics_js_1.CompressionMetrics.getInstance();
        let lruKey = null;
        let lruAccessCount = Infinity;
        let lruTimestamp = Infinity;
        for (const [key, entry] of this.compressionCache.entries()) {
            // LRU: lowest access count, then oldest timestamp
            if (entry.accessCount < lruAccessCount || (entry.accessCount === lruAccessCount && entry.timestamp < lruTimestamp)) {
                lruKey = key;
                lruAccessCount = entry.accessCount;
                lruTimestamp = entry.timestamp;
            }
        }
        if (lruKey) {
            const entry = this.compressionCache.get(lruKey);
            if (entry) {
                this.currentCacheSizeBytes -= entry.sizeBytes;
                this.compressionCache.delete(lruKey);
                // Log eviction event
                metrics.logCompressionEvent({
                    timestamp: new Date().toISOString(),
                    event: 'cache_eviction',
                    skillName: lruKey.split('@')[0], // Extract skill name from key
                    cacheSize: this.currentCacheSizeBytes,
                });
                this.logger.info('[COMPRESSION-CACHE] LRU eviction', {
                    key: lruKey,
                    freedBytes: entry.sizeBytes,
                    cacheSize: (this.currentCacheSizeBytes / 1024 / 1024).toFixed(1),
                });
            }
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
     * Load all skills from one or more skill directories.
     * Directories are processed in order; first directory wins on name collision
     * so local skills always override remote ones.
     */
    async loadSkills() {
        const dirs = Array.isArray(this.config.skillsDirectory)
            ? this.config.skillsDirectory
            : [this.config.skillsDirectory];
        this.logger.info('Loading skills from directories', { directories: dirs });
        for (const dir of dirs) {
            let successCount = 0;
            let errorCount = 0;
            try {
                const pattern = path_1.default.join(dir, '**/SKILL.md');
                const files = await (0, glob_1.glob)(pattern);
                this.logger.debug(`Found ${files.length} SKILL.md files in ${dir}`);
                for (const file of files) {
                    try {
                        const skill = await this.loadSkillFromFile(file);
                        if (skill) {
                            // Local-first: first directory wins on name collision
                            if (!this.skills.has(skill.metadata.name)) {
                                this.addSkill(skill);
                                this.logger.debug(`Loaded skill: ${skill.metadata.name}`, {
                                    file,
                                    category: skill.metadata.category,
                                    tags: skill.metadata.tags,
                                });
                                successCount++;
                            }
                            else {
                                this.logger.debug(`Skipping duplicate skill from remote: ${skill.metadata.name}`);
                            }
                        }
                        else {
                            errorCount++;
                        }
                    }
                    catch (error) {
                        errorCount++;
                        this.logger.error(`Failed to load skill from ${file}`, {
                            error: error instanceof Error ? error.message : String(error),
                        });
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
        return {
            name,
            category,
            description,
            tags: tags.length > 0 ? tags : [category],
            version: nestedMeta.version || '1.0.0',
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
     * Generate embeddings for skills that don't have them
     * Note: Embedding service is not currently available, so this is a no-op
     */
    async generateMissingEmbeddings() {
        // Embedding service not available - skip
        return;
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
        return {
            totalSkills: this.skills.size,
            categories: this.skillsByCategory.size,
            tags: this.skillsByTag.size,
            skillsWithoutEmbeddings,
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
                    metadataBlock[metaMatch[1]] = this.unquoteFrontmatterValue(metaMatch[2].trim());
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
        this.llmCompressor = new LLMSkillCompressor_js_1.LLMSkillCompressor(llmClient);
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
                briefRatio: compressed.brief.compressionRatio.toFixed(2),
                moderateRatio: compressed.moderate.compressionRatio.toFixed(2),
                detailedRatio: compressed.detailed.compressionRatio.toFixed(2),
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
            return '';
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
                return cached.content;
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
                return cached.content;
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
        // 3. Fallback: return original content
        this.logger.debug('Serving original content (no compression)', {
            skillName,
            version,
        });
        return await this.getSkillContent(skillName);
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
}
exports.SkillRegistry = SkillRegistry;
//# sourceMappingURL=SkillRegistry.js.map