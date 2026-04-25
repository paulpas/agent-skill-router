import type { SkillDefinition } from './types.js';
/**
 * Cached skill content entry with LRU metadata
 */
export interface CacheEntry {
    content: string;
    compressionLevel: number;
    timestamp: number;
    accessCount: number;
    sizeBytes: number;
}
/**
 * Configuration for the skill registry
 */
export interface SkillRegistryConfig {
    /** Single directory or array of directories to load skills from.
     *  When multiple directories are given, skills loaded earlier win on name collision
     *  (i.e. list local mount first so local skills override remote ones). */
    skillsDirectory: string | string[];
    cacheDirectory?: string;
    generateEmbeddings?: boolean;
    compressionLevel?: number;
    maxCacheSizeBytes?: number;
    warmupSkillsCount?: number;
    adaptiveTTL?: boolean;
    compressionBatchSize?: number;
}
/**
 * Skill Registry - manages all available skills
 */
export declare class SkillRegistry {
    private skills;
    private skillsByCategory;
    private skillsByTag;
    private config;
    private logger;
    private compressor;
    /** In-memory cache for on-demand skill content */
    private contentCache;
    /** LRU cache with TTL for compressed content */
    private compressionCache;
    private maxCacheSizeBytes;
    private currentCacheSizeBytes;
    private llmCompressor;
    private diskCache;
    private memoryCache;
    private deduplicator;
    private accessCounter;
    private accessPriority;
    private topAccessedSkills;
    private readonly HOT_SKILLS_COUNT;
    private readonly HOT_SKILL_TTL_MS;
    private readonly COLD_SKILL_TTL_MS;
    constructor(config: SkillRegistryConfig);
    /**
     * Fetch the lightweight skills-index.json from a remote URL and populate the
     * registry with metadata only (no content). Content is fetched on-demand.
     * Falls back gracefully — callers should catch errors and fall back to loadSkills().
     */
    loadFromRemoteIndex(indexUrl: string): Promise<void>;
    /**
     * Fetch the full SKILL.md content for a skill on-demand.
     * Resolution order: memory cache → local disk → GitHub raw → persist to disk.
     * Supports compression and caching with TTL/LRU.
     */
    getSkillContent(name: string, compressionLevel?: number): Promise<string>;
    /**
     * Get skill content from compression cache if valid (not expired)
     * Implements adaptive TTL: hot skills 30min, cold skills 1 hour
     */
    private getFromCompressionCache;
    /**
     * Apply compression and cache the result
     */
    private applyCompressionAndCache;
    /**
     * Evict the least recently accessed entry from the compression cache.
     * Prefers evicting cold skills over hot skills to maintain hit rate.
     * Early Exit: guard on empty cache
     */
    private evictLRUEntry;
    /** Write skill content to the on-disk content cache (non-fatal on error). */
    private persistSkillContent;
    /**
     * Pre-populate the memory content cache from the on-disk content cache at startup.
     * This avoids a GitHub round-trip for skills accessed since last restart.
     */
    private loadPersistedContentCache;
    /**
     * Update access priority for a skill to track hotness.
     * Used by getFromCompressionCache to build top-N list.
     */
    private updateAccessPriority;
    /**
     * Warm up compression cache by pre-compressing top N frequently accessed skills.
     * Non-blocking: logs progress but doesn't throw on errors.
     * Useful for startup: ensures hot skills are ready in memory.
     */
    warmupCompressionCache(topN?: number): Promise<void>;
    /**
     * Load all skills from one or more skill directories.
     * Directories are processed in order; first directory wins on name collision
     * so local skills always override remote ones.
     */
    loadSkills(): Promise<void>;
    /**
     * Load a single skill from a SKILL.md file
     */
    private loadSkillFromFile;
    /**
     * Parse skill metadata from a SKILL.md file with YAML frontmatter
     * Maps OpenCode skill frontmatter fields to SkillMetadata schema
     */
    private parseSkillFromMarkdown;
    /**
     * Validate skill metadata against expected schema
     */
    private isValidSkillMetadata;
    /**
     * Add a skill to the registry (no embedding — caller must invoke generateMissingEmbeddings())
     */
    private addSkill;
    /**
     * Generate embeddings for skills that don't have them
     * Note: Embedding service is not currently available, so this is a no-op
     */
    private generateMissingEmbeddings;
    /**
     * Get a skill by name
     */
    getSkill(name: string): SkillDefinition | undefined;
    /**
     * Get all skills
     */
    getAllSkills(): SkillDefinition[];
    /**
     * Get skills by category
     */
    getSkillsByCategory(category: string): SkillDefinition[];
    /**
     * Get skills by tag
     */
    getSkillsByTag(tag: string): SkillDefinition[];
    /**
     * Search skills by category or tag
     */
    searchByCategoryOrTag(searchTerm: string): SkillDefinition[];
    /**
     * Reload all skills
     */
    reload(): Promise<void>;
    /**
     * Get the current number of skills in the registry.
     */
    getSkillCount(): number;
    /**
     * Get registry statistics
     */
    getStats(): {
        totalSkills: number;
        categories: number;
        tags: number;
        skillsWithoutEmbeddings: number;
    };
    /**
     * Lenient line-by-line frontmatter extractor for YAML that strict parsers reject.
     * Handles: unquoted colons in values, tabs, CRLF line endings, trailing spaces.
     */
    private parseFrontmatterLenient;
    /** Strip surrounding single or double quotes from a YAML scalar value */
    private unquoteFrontmatterValue;
    /**
     * Initialize the LLM-based compressor with an LLM client
     * Called once after LLM client is available
     */
    setLLMClient(llmClient: any): void;
    /**
     * Pre-compute compressed versions for a skill (fire-and-forget, async)
     * Called after loading a skill to populate caches
     * No errors thrown: graceful degradation if compression fails
     * Public so it can be called from tests and external code
     */
    preComputeCompressedVersions(skillName: string, domain: string, content: string): Promise<void>;
    /**
     * Get skill content with cache layering (memory → disk → original)
     * Implements versionHint for compression version selection
     */
    getSkillContentWithCompression(skillName: string, domain: string, versionHint?: 'brief' | 'moderate' | 'detailed'): Promise<string>;
    /**
     * Increment access counter for smart retry tracking
     * Tracks access within 30-minute windows
     */
    private incrementAccessCounter;
}
//# sourceMappingURL=SkillRegistry.d.ts.map