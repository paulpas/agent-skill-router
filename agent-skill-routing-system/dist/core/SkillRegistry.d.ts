import type { SkillDefinition } from './types.js';
/**
 * Configuration for the skill registry
 */
export interface SkillRegistryConfig {
    skillsDirectory: string;
    cacheDirectory?: string;
    generateEmbeddings?: boolean;
}
/**
 * Skill Registry - manages all available skills
 */
export declare class SkillRegistry {
    private skills;
    private skillsByCategory;
    private skillsByTag;
    private config;
    private embeddingService;
    private logger;
    constructor(config: SkillRegistryConfig);
    /**
     * Load all skills from the skills directory
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
     * Add a skill to the registry
     */
    private addSkill;
    /**
     * Build text for embedding generation from skill metadata
     */
    private buildEmbeddingText;
    /**
     * Generate embeddings for skills that don't have them
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
     * Get registry statistics
     */
    getStats(): {
        totalSkills: number;
        categories: number;
        tags: number;
        skillsWithoutEmbeddings: number;
    };
}
//# sourceMappingURL=SkillRegistry.d.ts.map