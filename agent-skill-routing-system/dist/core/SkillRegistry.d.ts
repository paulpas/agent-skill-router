import type { SkillMetadata, SkillDefinition } from './types';
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
    /**
     * Markdown link following configuration
     * Controls how the system follows markdown links when loading skills
     */
    markdownLinkFollowing?: {
        /** Enable following links in markdown files (default: false) */
        enabled: boolean;
        /** Allow following external links (default: false) */
        allowExternalLinks: boolean;
        /** Maximum depth to follow links (default: 2) */
        maxDepth: number;
        /** Max external content size in KB before compression/skip (default: 10) */
        maxExternalSizeKb?: number;
        /** Compression mode for oversized external content (default: 'brief') */
        compressionMode?: 'brief' | 'moderate' | 'skip';
        /** Enable JavaScript rendering for dynamic pages (default: false) */
        jsRenderingEnabled?: boolean;
        /** JS render timeout in milliseconds (default: 5000) */
        jsRenderTimeoutMs?: number;
        /** Fall back to static fetch if JS rendering fails (default: true) */
        jsRenderFallback?: boolean;
        /** How resolved content is embedded (default: 'inline') */
        resolutionMode?: 'inline' | 'semantic' | 'compressed';
        /** Number of top semantic chunks to return (default: 3) */
        semanticTopK?: number;
        /** Minimum cosine similarity for semantic chunk selection (default: 0.3) */
        semanticSimilarityThreshold?: number;
    };
}
/**
 * Extended SkillRegistry interface with compression methods
 * Used for type-safe access to compression-aware methods
 */
interface CompressedResult {
    content: string;
    compressPercent: number;
}
export interface SkillRegistryWithCompression extends SkillRegistry {
    /** Get skill content with cache layering (memory → disk → original) */
    getSkillContentWithCompression(skillName: string, domain: string, versionHint?: 'brief' | 'moderate' | 'detailed'): Promise<CompressedResult>;
}
/**
 * Skill Registry - manages all available skills
 * Implements SkillRegistryWithCompression interface for type-safe access to compression methods
 */
export declare class SkillRegistry implements SkillRegistryWithCompression {
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
    private embeddingService;
    private markdownLinkConfig;
    private linkResolver;
    /**
     * Get the base skills directory path for link resolution safety checks.
     */
    private getSkillsBasePath;
    /**
     * Get or create the markdown link resolver instance.
     * Lazily initialized to avoid overhead when link following is disabled.
     */
    private getLinkResolver;
    constructor(config: SkillRegistryConfig);
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
    private isStubSkill;
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
     * Within each directory, files are processed in parallel batches for improved performance.
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
    /**
     * Parse skill metadata from a SKILL.md file with YAML frontmatter.
     * Public for testability; callers should not rely on internal parsing details.
     */
    parseSkillFromMarkdown(content: string, filePath: string): SkillMetadata;
    /**
     * Validate skill metadata against expected schema
     */
    private isValidSkillMetadata;
    /**
     * Add a skill to the registry (no embedding — caller must invoke generateMissingEmbeddings())
     */
    private addSkill;
    /**
     * Generate embeddings for skills that don't have them.
     * Processes skills in batches to avoid rate limiting.
     * Uses caching to skip re-generating existing embeddings.
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
        stubSkills?: number;
        realSkills?: number;
        domains?: number;
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
    setLLMClient(llmClient: unknown): void;
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
    getSkillContentWithCompression(skillName: string, domain: string, versionHint?: 'brief' | 'moderate' | 'detailed'): Promise<CompressedResult>;
    /**
     * Increment access counter for smart retry tracking
     * Tracks access within 30-minute windows
     */
    private incrementAccessCounter;
    /**
     * Update markdown link following configuration at runtime with partial updates
     * Only updates fields that are provided in the partial config
     *
     * @param partialConfig - Partial configuration object with only the fields to update
     * @throws Error if configuration update fails or validation fails
     */
    updateMarkdownLinkConfig(partialConfig: {
        enabled?: boolean;
        allowExternalLinks?: boolean;
        maxDepth?: number;
        maxExternalSizeKb?: number;
        compressionMode?: 'brief' | 'moderate' | 'skip';
        jsRenderingEnabled?: boolean;
        jsRenderTimeoutMs?: number;
        jsRenderFallback?: boolean;
        resolutionMode?: 'inline' | 'semantic' | 'compressed';
        semanticTopK?: number;
        semanticSimilarityThreshold?: number;
    }): void;
    /**
     * Get the current markdown link following configuration
     *
     * @returns The current configuration object
     */
    getMarkdownLinkConfig(): {
        enabled: boolean;
        allowExternalLinks: boolean;
        maxDepth: number;
        maxExternalSizeKb: number;
        compressionMode: 'brief' | 'moderate' | 'skip';
        jsRenderingEnabled: boolean;
        jsRenderTimeoutMs: number;
        jsRenderFallback: boolean;
        resolutionMode: 'inline' | 'semantic' | 'compressed';
        semanticTopK: number;
        semanticSimilarityThreshold: number;
    };
}
export {};
//# sourceMappingURL=SkillRegistry.d.ts.map