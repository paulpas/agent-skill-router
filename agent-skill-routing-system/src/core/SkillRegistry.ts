// Skill Registry System
// Loads skills from /skills/* directories, extracts metadata, and maintains a registry

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import YAML from 'yaml';
import type { SkillMetadata, SkillDefinition } from './types.js';
import { EmbeddingService } from '../embedding/EmbeddingService.js';
import { Logger } from '../observability/Logger.js';

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
export class SkillRegistry {
  private skills: Map<string, SkillDefinition> = new Map();
  private skillsByCategory: Map<string, string[]> = new Map();
  private skillsByTag: Map<string, string[]> = new Map();
  private config: SkillRegistryConfig;
  private embeddingService: EmbeddingService;
  private logger: Logger;

  constructor(config: SkillRegistryConfig) {
    this.config = {
      cacheDirectory: './.skill-cache',
      generateEmbeddings: true,
      ...config,
    };
    this.embeddingService = new EmbeddingService();
    this.logger = new Logger('SkillRegistry');
  }

  /**
   * Load all skills from the skills directory
   */
  async loadSkills(): Promise<void> {
    this.logger.info('Loading skills from directory', {
      directory: this.config.skillsDirectory,
    });

    try {
      // Find all SKILL.md files exclusively
      const pattern = path.join(this.config.skillsDirectory, '**/SKILL.md');
      const files = await glob(pattern);

      this.logger.debug(`Found ${files.length} potential skill files`);

      for (const file of files) {
        try {
          const skill = await this.loadSkillFromFile(file);
          if (skill) {
            await this.addSkill(skill);
          }
        } catch (error) {
          this.logger.error(`Failed to load skill from ${file}`, {
            error: error instanceof Error ? error.message : String(error),
            file,
          });
        }
      }

      // Generate embeddings if configured and not already present
      if (this.config.generateEmbeddings) {
        await this.generateMissingEmbeddings();
      }

      this.logger.info(`Loaded ${this.skills.size} skills total`, {
        skillCount: this.skills.size,
        categories: this.skillsByCategory.size,
        tags: this.skillsByTag.size,
      });
    } catch (error) {
      this.logger.error('Failed to load skills', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Load a single skill from a SKILL.md file
   */
  private async loadSkillFromFile(filePath: string): Promise<SkillDefinition | null> {
    try {
      const content = await fs.promises.readFile(filePath, 'utf-8');
      const metadata = this.parseSkillFromMarkdown(content, filePath);

      if (!this.isValidSkillMetadata(metadata)) {
        this.logger.warn(`Invalid skill metadata in ${filePath}`);
        return null;
      }

      return { metadata, sourceFile: filePath, rawContent: content };
    } catch (error) {
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
  private parseSkillFromMarkdown(content: string, filePath: string): SkillMetadata {
    // Extract YAML frontmatter between --- delimiters
    const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!fmMatch) {
      this.logger.debug(`No YAML frontmatter found in ${filePath}, using filename defaults`);
      const baseName = path.basename(path.dirname(filePath));
      return {
        name: baseName,
        category: baseName.split('-')[0] || 'general',
        description: `Skill loaded from ${baseName}`,
        tags: [baseName.split('-')[0] || 'general'],
        input_schema: { type: 'object', properties: {}, required: [] },
        output_schema: { type: 'object', properties: {}, required: [] },
      };
    }

    let fm: Record<string, unknown>;
    try {
      fm = YAML.parse(fmMatch[1]) as Record<string, unknown>;
    } catch {
      this.logger.warn(`Failed to parse YAML frontmatter in ${filePath}`);
      const baseName = path.basename(path.dirname(filePath));
      return {
        name: baseName,
        category: baseName.split('-')[0] || 'general',
        description: `Skill loaded from ${baseName}`,
        tags: [baseName.split('-')[0] || 'general'],
        input_schema: { type: 'object', properties: {}, required: [] },
        output_schema: { type: 'object', properties: {}, required: [] },
      };
    }

    // Map SKILL.md frontmatter fields to SkillMetadata
    const nestedMeta = (fm.metadata as Record<string, unknown>) || {};

    // name: use frontmatter name, fall back to directory name
    const name = (fm.name as string) || path.basename(path.dirname(filePath));

    // category: metadata.domain → category, fall back to domain prefix from name
    const category =
      (nestedMeta.domain as string) ||
      name.split('-')[0] ||
      'general';

    // description
    const description = (fm.description as string) || `Skill: ${name}`;

    // tags: parse metadata.triggers (comma-separated string) + add domain prefix
    const triggersRaw = (nestedMeta.triggers as string) || '';
    const triggerTags = triggersRaw
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    // Also add role and scope as tags if present
    const roleTags = [
      nestedMeta.role as string,
      nestedMeta.scope as string,
    ].filter(Boolean) as string[];

    const tags = [...new Set([category, ...triggerTags, ...roleTags])];

    return {
      name,
      category,
      description,
      tags: tags.length > 0 ? tags : [category],
      version: (nestedMeta.version as string) || '1.0.0',
      input_schema: { type: 'object', properties: {}, required: [] },
      output_schema: { type: 'object', properties: {}, required: [] },
    };
  }

  /**
   * Validate skill metadata against expected schema
   */
  private isValidSkillMetadata(metadata: SkillMetadata): boolean {
    const requiredFields: (keyof SkillMetadata)[] = ['name', 'category', 'description', 'tags'];

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
   * Add a skill to the registry
   */
  private async addSkill(skill: SkillDefinition): Promise<void> {
    const name = skill.metadata.name;

    // Generate embedding if not present
    if (this.config.generateEmbeddings && !skill.metadata.embedding) {
      const embeddingData = await this.embeddingService.generateEmbedding(
        this.buildEmbeddingText(skill.metadata)
      );
      skill.metadata.embedding = embeddingData.embedding;
    }

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
   * Build text for embedding generation from skill metadata
   */
  private buildEmbeddingText(metadata: SkillMetadata): string {
    return [
      metadata.name,
      metadata.category,
      metadata.description,
      ...metadata.tags,
      ...(metadata.dependencies || []),
    ].join(' ');
  }

  /**
   * Generate embeddings for skills that don't have them
   */
  private async generateMissingEmbeddings(): Promise<void> {
    const skillsWithoutEmbeddings = Array.from(this.skills.values()).filter(
      (skill) => !skill.metadata.embedding
    );

    if (skillsWithoutEmbeddings.length === 0) {
      return;
    }

    this.logger.info(`Generating embeddings for ${skillsWithoutEmbeddings.length} skills`);

    const batch: { skill: SkillDefinition; text: string }[] = [];

    for (const skill of skillsWithoutEmbeddings) {
      batch.push({
        skill,
        text: this.buildEmbeddingText(skill.metadata),
      });
    }

    // Process in batches
    const batchSize = 100;
    for (let i = 0; i < batch.length; i += batchSize) {
      const batchSlice = batch.slice(i, i + batchSize);
      const texts = batchSlice.map((b) => b.text);

      try {
        const embeddings = await this.embeddingService.batchEmbeddings(
          texts,
          this.config.skillsDirectory
        );

        embeddings.forEach((embedding, index) => {
          const { skill } = batchSlice[index];
          if (skill.metadata.embedding) {
            skill.metadata.embedding = embedding.embedding;
          }
        });
      } catch (error) {
        this.logger.error('Failed to generate embeddings for batch', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  /**
   * Get a skill by name
   */
  getSkill(name: string): SkillDefinition | undefined {
    return this.skills.get(name);
  }

  /**
   * Get all skills
   */
  getAllSkills(): SkillDefinition[] {
    return Array.from(this.skills.values());
  }

  /**
   * Get skills by category
   */
  getSkillsByCategory(category: string): SkillDefinition[] {
    const names = this.skillsByCategory.get(category) || [];
    return names.map((name) => this.skills.get(name)).filter(Boolean) as SkillDefinition[];
  }

  /**
   * Get skills by tag
   */
  getSkillsByTag(tag: string): SkillDefinition[] {
    const names = this.skillsByTag.get(tag) || [];
    return names.map((name) => this.skills.get(name)).filter(Boolean) as SkillDefinition[];
  }

  /**
   * Search skills by category or tag
   */
  searchByCategoryOrTag(searchTerm: string): SkillDefinition[] {
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
  async reload(): Promise<void> {
    this.skills.clear();
    this.skillsByCategory.clear();
    this.skillsByTag.clear();
    await this.loadSkills();
  }

  /**
   * Get registry statistics
   */
  getStats(): {
    totalSkills: number;
    categories: number;
    tags: number;
    skillsWithoutEmbeddings: number;
  } {
    const skillsWithoutEmbeddings = Array.from(this.skills.values()).filter(
      (s) => !s.metadata.embedding
    ).length;

    return {
      totalSkills: this.skills.size,
      categories: this.skillsByCategory.size,
      tags: this.skillsByTag.size,
      skillsWithoutEmbeddings,
    };
  }
}
