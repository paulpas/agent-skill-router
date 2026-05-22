// Skill Generation Tool - generates SKILL.md files using LLM with OpenAI SDK
// Implements the same logic as the Python generate_skill.py script

import { BaseMCPTool, IMCPTool } from '../types';
import * as path from 'path';
import * as fs from 'fs/promises';
import { DomainRegistry } from '../../core/DomainRegistry';

/**
 * Skill metadata structure for skill generation
 */
export interface SkillMetadata {
  name: string;
  description: string;
  license: string;
  compatibility: string;
  version: string;
  domain: string;
  role: string;
  scope: string;
  'output-format'?: string;
  'content-types'?: string;
  triggers: string;
  'related-skills'?: string;
  author?: string;
  source?: string;
}

/**
 * Skill content with frontmatter and body
 */
export interface SkillContent {
  frontmatter: SkillMetadata;
  body: string;
  fullContent: string;
}

/**
 * Tool result for skill generation
 */
interface ToolResult {
  success: boolean;
  output?: SkillContent | string;
  error?: string;
  latencyMs: number;
  metadata?: Record<string, unknown>;
}

/**
 * Tool specification for LLM
 */
interface ToolSpec {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  /** Code generation methodology instructions for AI agents using this tool */
  methodology?: string;
}

/**
 * Skill Generation Tool for creating new skills dynamically
 * Uses OpenAI SDK directly (like LLMRanker) instead of shell commands
 */
export class SkillGenerationTool extends BaseMCPTool implements IMCPTool {
  private apiKey: string;
  private model: string;
  private maxRetries: number;

  constructor(timeoutMs: number = 60000) {
    super(
      'generate_skill',
      'Generate a new skill for tasks that don\'t match existing skills. Automatically creates SKILL.md files with proper validation. Detects domain and topic from task description or uses provided values. Requires OPENAI_API_KEY environment variable.',
      timeoutMs
    );
    
    // Check required configuration
    this.apiKey = process.env.OPENAI_API_KEY || '';
    
    // Load configuration from environment
    this.model = process.env.AUTO_SKILL_MODEL || 'gpt-4o-mini';
    this.maxRetries = parseInt(process.env.AUTO_SKILL_MAX_RETRIES || '3', 10);
  }

  /**
   * Execute skill generation
   */
  async execute(args: Record<string, unknown>): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      // Parse and validate arguments BEFORE any processing (Early Exit pattern)
      const parsedArgs = this.parseAndValidateArgs(args);
      const { task, domain, topic, dryRun, contribute } = parsedArgs;

      // Generate skill content
      const skillContent = await this.generateSkill(task, domain, topic);

      if (!skillContent) {
        throw new Error('Failed to generate skill content');
      }

      // Validate skill content
      const validation = this.validateSkillContent(skillContent);
      if (!validation.isValid) {
        console.warn('Skill validation warnings', {
          issues: validation.issues,
        });
      }

      // Dry run mode - just return content
      if (dryRun) {
        return {
          success: true,
          output: skillContent,
          metadata: {
            size: skillContent.fullContent.length,
            isValid: validation.isValid,
            issues: validation.issues,
          },
          latencyMs: Date.now() - startTime,
        };
      }

// Save skill file
       const savedPath = await this.saveSkillFile(skillContent, domain, topic, contribute);
       // eslint-disable-next-line no-console
       console.log('Skill saved successfully', {
         path: savedPath,
         size: skillContent.fullContent.length,
         domain: domain || skillContent.frontmatter.domain,
         topic: topic || skillContent.frontmatter.name,
       });

      return {
        success: true,
        output: savedPath,
        metadata: {
          size: skillContent.fullContent.length,
          isValid: validation.isValid,
          issues: validation.issues,
          contribute: contribute,
        },
        latencyMs: Date.now() - startTime,
      };
    } catch (error) {
      console.error('Skill generation failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        latencyMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Parse and validate arguments with guard clauses (Early Exit pattern)
   */
  private parseAndValidateArgs(args: Record<string, unknown>): {
    task: string;
    domain?: string;
    topic?: string;
    dryRun: boolean;
    contribute: boolean;
  } {
    // Early Exit: Validate required arguments first
    if (!args.task) {
      throw new Error('Missing required argument: task');
    }

    const task = String(args.task).trim();
    if (task.length === 0) {
      throw new Error('Task argument cannot be empty');
    }

    // Parse optional arguments
    const domain = args.domain ? String(args.domain).trim() : undefined;
    const topic = args.topic ? String(args.topic).trim() : undefined;
    const dryRun = args.dryRun ? Boolean(args.dryRun) : false;
    const contribute = args.contribute ? Boolean(args.contribute) : true;

    // Validate domain format if provided
    if (domain && !/^[a-z0-9-]+$/.test(domain)) {
      throw new Error(`Invalid domain format: ${domain}. Must be lowercase alphanumeric with hyphens.`);
    }

    // Validate topic format if provided
    if (topic && !/^[a-z0-9-]+$/.test(topic)) {
      throw new Error(`Invalid topic format: ${topic}. Must be lowercase alphanumeric with hyphens.`);
    }

    return { task, domain, topic, dryRun, contribute };
  }

  /**
   * Generate skill content using LLM
   */
  private async generateSkill(
    task: string,
    domain?: string,
    topic?: string
  ): Promise<SkillContent | null> {
// eslint-disable-next-line no-console
       console.log('Generating skill', {
         task: task.slice(0, 100),
         domain,
         topic,
         model: this.model,
       });

    // Step 1: Extract domain and topic from task if not provided
    let extractedDomain = domain;
    let extractedTopic = topic;
    let extractionResult: { domain: string; topic: string; contentTypes?: string } | null = null;

    if (!extractedDomain || !extractedTopic) {
      extractionResult = await this.extractDomainAndTopic(task);
      if (!extractionResult) {
        throw new Error('Failed to extract domain and topic from task');
      }
      extractedDomain = extractedDomain || extractionResult.domain;
      extractedTopic = extractedTopic || extractionResult.topic;
    }

    // Validate domain: any directory name is valid (dynamic domain discovery)
    // We only verify the domain name is well-formed (not empty, safe characters)
    if (!extractedDomain || extractedDomain.trim() === '') {
      throw new Error('Domain cannot be empty');
    }

   // Step 2: Generate skill content
    const skillDescription = this.generateSkillDescription(task, extractedDomain!, extractedTopic!);
    const role = this.getDefaultRole(extractedDomain!);
    const outputFormat = this.getDefaultOutputFormat(extractedDomain!);

    // Get content-types from extraction (LLM determined) or domain defaults
    const contentTypes = extractionResult?.contentTypes || DomainRegistry.getInstance().getDomainDefaults(extractedDomain!).contentTypes.join(', ');

for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
          // eslint-disable-next-line no-console
          console.log(`LLM generation attempt ${attempt}/${this.maxRetries}`);

      const content = await this.generateSkillContent(
        extractedDomain!,
        extractedTopic!,
        skillDescription,
        role,
        outputFormat,
        contentTypes
      );

      if (content) {
        return content;
      }

      if (attempt < this.maxRetries) {
        // Exponential backoff: 100ms, 200ms, 400ms, etc.
        const backoffMs = 100 * Math.pow(2, attempt - 1);
        console.warn(`Retry ${attempt}/${this.maxRetries} after failed attempt, waiting ${backoffMs}ms`);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
      }
    }

    console.error(`Failed to generate skill after ${this.maxRetries} attempts`);
    return null;
  }

 /**
    * Extract domain and topic from task using LLM
    */
   private async extractDomainAndTopic(task: string): Promise<{
    domain: string;
    topic: string;
    contentTypes?: string;
  } | null> {
    const prompt = `Extract the domain, topic, and appropriate content-types from this task description.

Task: "${task}"

Return a JSON object with:
- domain: a short kebab-case domain name (e.g., "coding", "cncf", "writing", "devops")
- topic: kebab-case topic name (e.g., "code-review", "risk-stop-loss")
- content-types: an array of content types from: guidance, examples, do-dont, config, code, diagrams

Content-type guidance:
- If the task involves writing code, algorithms, or programming → include "code"
- If the task involves configuration files (YAML, JSON, .env) → include "config"
- If the task involves best practices, guidelines, or advice → include "guidance"
- If the task involves troubleshooting, comparisons, or anti-patterns → include "do-dont"
- If the task involves examples, samples, or demonstrations → include "examples"
- If the task involves architecture, workflows, or system design → include "diagrams"

Examples:
- Task: "Create a code review skill" → {"domain": "coding", "topic": "code-review", "content-types": ["code", "guidance", "do-dont"]}
- Task: "Build a stop loss mechanism" → {"domain": "trading", "topic": "risk-stop-loss", "content-types": ["code", "guidance", "do-dont", "config"]}
- Task: "Create a Kubernetes deployment skill" → {"domain": "cncf", "topic": "kubernetes", "content-types": ["guidance", "examples", "do-dont", "config"]}
- Task: "Create a technical writing style guide" → {"domain": "writing", "topic": "style-guide", "content-types": ["guidance", "examples", "do-dont"]}

Respond with ONLY the JSON object, no other text.`;

    try {
      const response = await this.callOpenAI({
        system: 'You are a skill categorization expert. Respond ONLY with valid JSON.',
        user: prompt,
        temperature: 0.3,
        responseFormat: 'json_object',
      });

      const result = JSON.parse(response);
      return {
        domain: result.domain || 'coding',
        topic: result.topic || 'new-skill',
        contentTypes: Array.isArray(result.contentTypes) ? result.contentTypes.join(', ') : undefined,
      };
    } catch (error) {
      console.error('LLM parsing failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      // Fallback: use first word as domain, extract topic from task
      const domain = 'coding';
      const topic = task.toLowerCase().replace(/[^a-z0-9-]/g, '-').substring(0, 50).replace(/-+/g, '-').replace(/^-|-$/g, '');
      console.warn('Using fallback extraction', { domain, topic });
      return { domain, topic, contentTypes: 'code, guidance' };
    }
  }

 /**
    * Generate skill content using LLM
    */
   private async generateSkillContent(
    domain: string,
    topic: string,
    description: string,
    role: string,
    outputFormat: string | null,
    contentTypes: string
  ): Promise<SkillContent | null> {
    const generationPrompt = this.buildGenerationPrompt(domain, topic, description, role, outputFormat, contentTypes);

    try {
      const response = await this.callOpenAI({
        system: 'You are an expert at creating high-quality AI skill definitions.',
        user: generationPrompt,
        temperature: 0.7,
      });

      const content = response.trim();

      // Extract YAML frontmatter and body
      const parsed = this.extractYamlAndBody(content);
      if (!parsed) {
        console.error('Failed to parse generated skill content');
        return null;
      }

      return {
        frontmatter: parsed.frontmatter,
        body: parsed.body,
        fullContent: content,
      };
    } catch (error) {
      console.error('LLM generation failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

/**
    * Build the generation prompt for skill content
    */
   private buildGenerationPrompt(
    domain: string,
    topic: string,
    description: string,
    role: string,
    outputFormat: string | null,
    contentTypes: string
  ): string {
    // Parse content-types from comma-separated string
    const types = contentTypes
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 0);

    // Build section guidance based on content-types
    const sections: string[] = [];
    sections.push('1. H1 Title: Human-readable name (not kebab-case)');
    sections.push('2. Role/purpose paragraph: 1-3 sentences from model\'s perspective');
    sections.push('3. ## TL;DR Checklist: 3-5 actionable items');

    if (types.includes('do-dont')) {
      sections.push('4. ## TL;DR for Code Generation: 3-7 specific constraints (REQUIRED for role=implementation)');
    }
    sections.push('5. ## When to Use: Bulleted list of concrete situations');
    sections.push('6. ## When NOT to Use: Anti-patterns and exclusions (for complex skills)');
    sections.push('7. ## Core Workflow: Numbered steps with checkpoints');

    if (types.includes('code')) {
      sections.push('8. ## Implementation Patterns: Typed code with BAD/GOOD examples');
    }
    if (types.includes('config')) {
      sections.push('8. ## Configuration Examples: YAML/JSON/ENV config snippets with explanations');
    }
    if (types.includes('examples')) {
      sections.push('8. ## Example Scenarios: Concrete input/output examples demonstrating the skill');
    }
    if (types.includes('do-dont')) {
      sections.push(`8. ## ${types.includes('code') || types.includes('config') ? 'Advanced' : 'Best Practices'}: Detailed ${types.includes('do-dont') ? 'What to Do / What NOT to Do' : 'guidance'} with concrete examples`);
    }
    if (types.includes('diagrams')) {
      sections.push(`8. ## Architecture/Flow Diagrams: ASCII diagrams illustrating key concepts`);
    }

    sections.push(`${types.includes('code') || types.includes('config') || types.includes('examples') ? '9' : '8'}. ## Constraints: MUST DO / MUST NOT DO sections`);
    sections.push(`${types.includes('examples') || types.includes('diagrams') ? '10' : '9'}. ## Output Template: What the model produces (for review/analysis roles)`);
    sections.push('11. ## Related Skills: Table if metadata.related-skills exists');

    return `You are creating a SKILL.md file for the agent-skill-router repository.

DOMAIN: ${domain}
TOPIC: ${topic}
DESCRIPTION: ${description}
ROLE: ${role}
CONTENT TYPES: [${contentTypes || 'code, guidance'}]

Create a complete, high-quality SKILL.md file following SKILL_FORMAT_SPEC.md requirements:

**YAML Frontmatter Requirements:**
- name: ${topic} (must match topic directory name exactly)
- description: Single line, 1-2 sentences. Active verb. Domain-specific terms.
- license: MIT
- compatibility: opencode
- metadata.version: "1.0.0"
- metadata.domain: ${domain}
- metadata.role: ${role}
- metadata.scope: ${this.getDefaultScope(domain)}
- metadata.output-format: ${outputFormat || 'code'} # DEPRECATED (use content-types below)
- metadata.content-types: [${contentTypes || 'code, guidance'}]
- metadata.triggers: 5-8 comma-separated keywords (technical + conversational)
- metadata.related-skills: comma-separated related skill names (optional)

**Content Section Requirements:**
${sections.join('\n')}

**Content-Type Specific Guidance:**
${this.getContentTypesGuidance(types)}

**Quality Gate Requirements:**
- File size: ≥3000 bytes
- If content-types includes "code": at least 2 code blocks (BAD/GOOD pairs)
- If content-types includes "config": at least 1 configuration block (YAML/JSON)
- If content-types includes "do-dont": both "What to Do" and "What NOT to Do" present
- If content-types includes "examples": at least 1 concrete input/output example
- If content-types does NOT include "code": code blocks are optional (guidance/examples sufficient)
- No sentinel string "Implementing this specific pattern or feature"
- 3-8 triggers in metadata
- All required sections present
- Real examples, not placeholders
- Domain-specific constraints in MUST DO/MUST NOT DO

**Important:**
- Match code style to content-types: only include code if "code" is in the content-types
- For "config" content-types: use real YAML/JSON configs with comments
- For "do-dont": be specific about what to do and what NOT to do
- For "guidance": focus on clear, actionable advice
- For "examples": provide concrete, realistic scenarios
- Use domain-specific language and terminology
- Make the skill actionable and specific

Generate the complete SKILL.md file content. Start with --- for YAML frontmatter.`;
  }

  /**
   * Generate content-type specific guidance for the LLM prompt
   */
  private getContentTypesGuidance(types: string[]): string {
    const guidance: string[] = [];
    if (types.includes('code')) {
      guidance.push('- **Code**: Provide typed code with BAD/GOOD pairs. Use typed signatures with docstrings.');
    }
    if (types.includes('config')) {
      guidance.push('- **Config**: Provide YAML/JSON/ENV config snippets with comments explaining each section.');
    }
    if (types.includes('do-dont')) {
      guidance.push('- **Do/Don\'t**: Be explicit. "What to Do" with reasons. "What NOT to Do" with anti-patterns.');
    }
    if (types.includes('examples')) {
      guidance.push('- **Examples**: Provide concrete input/output scenarios, not abstract descriptions.');
    }
    if (types.includes('guidance')) {
      guidance.push('- **Guidance**: Clear, actionable advice with specific reasons and impact.');
    }
    if (types.includes('diagrams')) {
      guidance.push('- **Diagrams**: ASCII art for architecture, flows, and system diagrams.');
    }
    return guidance.join('\n');
  }

  /**
    * Call OpenAI API directly (like LLMRanker)
    * Supports OpenAI-compatible APIs (OpenRouter, Groq, local LLMs)
    */
   private async callOpenAI(params: {
     system: string;
     user: string;
     temperature: number;
     responseFormat?: 'json_object' | 'text';
    }): Promise<string> {
     const { system, user, temperature, responseFormat } = params;

     // Fail Fast: Validate API key before making request
     if (!this.apiKey || this.apiKey.trim() === '') {
       throw new Error('Missing OpenAI API key. Set OPENAI_API_KEY environment variable.');
     }

     // Support OpenAI-compatible APIs via environment variable
     const apiBase = process.env.OPENAI_BASE_URL || process.env.OPENAI_API_BASE || 'https://api.openai.com/v1';

     const response = await fetch(`${apiBase}/chat/completions`, {
       method: 'POST',
       headers: {
         'Content-Type': 'application/json',
         'Authorization': `Bearer ${this.apiKey}`,
       },
       body: JSON.stringify({
         model: this.model,
         messages: [
           { role: 'system', content: system },
           { role: 'user', content: user },
         ],
         temperature,
         ...(responseFormat ? { response_format: { type: responseFormat } } : {}),
         max_tokens: 4000,
       }),
     });

     if (!response.ok) {
       const err = await response.text();
       throw new Error(`OpenAI-compatible API error ${response.status}: ${err}`);
     }

     const data = await response.json() as {
       choices: { message: { content: string } }[];
       usage?: { prompt_tokens?: number; completion_tokens?: number };
     };

 
         const content = data.choices[0].message.content;
         // eslint-disable-next-line no-console
         console.debug('OpenAI-compatible API response received', {
           model: this.model,
           inputTokens: data.usage?.prompt_tokens,
           outputTokens: data.usage?.completion_tokens,
         });

     return content;
   }

  /**
   * Get default role for domain
   */
  private getDefaultRole(domain: string): string {
    const defaults: Record<string, string> = {
      agent: 'orchestration',
      cncf: 'reference',
      coding: 'implementation',
      programming: 'reference',
      trading: 'implementation',
    };
    return defaults[domain] || 'implementation';
  }

  /**
   * Get default scope for domain
   */
  private getDefaultScope(domain: string): string {
    const defaults: Record<string, string> = {
      agent: 'orchestration',
      cncf: 'infrastructure',
      coding: 'implementation',
      programming: 'implementation',
      trading: 'implementation',
    };
    return defaults[domain] || 'implementation';
  }

 /**
   * Output format is now determined by content-types (deprecated).
   * Returns null — content-types replaces this entirely.
   */
  private getDefaultOutputFormat(_domain: string): string | null {
    // Deprecated: content-types replaces output-format
    return null;
  }

/**
    * Generate skill description from task
    */
  private generateSkillDescription(task: string, domain: string, topic: string): string {
    return `Creates a skill for ${topic} in the ${domain} domain to address tasks like: "${task.substring(0, 100)}${task.length > 100 ? '...' : ''}"`;
  }

/**
    * Validate skill content against quality gates
    */
   private validateSkillContent(skillContent: SkillContent): { isValid: boolean; issues: string[] } {
    const issues: string[] = [];
    const content = skillContent.fullContent;

    // Check sentinel string
    if (content.includes('Implementing this specific pattern or feature')) {
      issues.push('Contains sentinel string "Implementing this specific pattern or feature"');
    }

    // Check file size
    if (content.length < 3000) {
      issues.push(`File size (${content.length} bytes) is under 3000 bytes minimum`);
    }

    // Check YAML frontmatter
    if (!content.startsWith('---')) {
      issues.push('Missing YAML frontmatter delimiter (---)');
    }

    // Extract content-types from frontmatter (if present)
    const frontmatter = skillContent.frontmatter;
    const contentTypesRaw = frontmatter['content-types'] || '';
    const contentTypes = typeof contentTypesRaw === 'string'
      ? contentTypesRaw.split(',').map((t: string) => t.trim().toLowerCase()).filter(Boolean)
      : [];

    const hasCode = contentTypes.includes('code');
    const hasConfig = contentTypes.includes('config');
    const hasDoDont = contentTypes.includes('do-dont');
    const hasExamples = contentTypes.includes('examples');

    // Check for code blocks — only required if content-types includes "code"
    if (hasCode) {
      const codeBlocks = (content.match(/```/g) || []).length;
      if (codeBlocks < 4) { // At least 2 complete code blocks
        issues.push(`Implementation skill has fewer than 2 code blocks (found ${codeBlocks / 2})`);
      }
    }
    // Skills without "code" in content-types don't need code blocks

    // Check for config blocks — required if content-types includes "config"
    if (hasConfig) {
      const configBlocks = (content.match(/```/g) || []).length;
      const hasConfigCodeFence = /```(?:yaml|json|env|text)/i.test(content);
      if (!hasConfigCodeFence || configBlocks < 4) {
        issues.push(`Skill with "config" content-type requires at least 1 config block (YAML/JSON) and code fences`);
      }
    }

    // Check for do/don't sections — required if content-types includes "do-dont"
    if (hasDoDont) {
      const hasDoSection = /What to Do|MUST DO|Do this|Positive/.test(content);
      const hasDontSection = /What NOT to Do|MUST NOT DO|Don\'t|Anti-pattern|Negative/.test(content);
      if (!hasDoSection) {
        issues.push('Skill with "do-dont" content-type requires a "What to Do" or "MUST DO" section');
      }
      if (!hasDontSection) {
        issues.push('Skill with "do-dont" content-type requires a "What NOT to Do" or "MUST NOT DO" section');
      }
    }

    // Check for examples — required if content-types includes "examples"
    if (hasExamples) {
      const exampleCount = (content.match(/```/g) || []).length;
      if (exampleCount < 2) {
        issues.push('Skill with "examples" content-type requires at least 1 example block');
      }
    }

    // Check triggers count
    const triggers = frontmatter.triggers;
    if (triggers) {
      const triggerCount = triggers.split(',').filter(t => t.trim()).length;
      if (triggerCount < 3) {
        issues.push(`Only ${triggerCount} triggers (recommended: 3-8)`);
      } else if (triggerCount > 8) {
        issues.push(`${triggerCount} triggers (recommended: 3-8)`);
      }
    }

    // Check required sections (always required regardless of content-types)
    const requiredSections = ['## When to Use', '## Core Workflow'];
    for (const section of requiredSections) {
      if (!content.includes(section)) {
        issues.push(`Missing section: ${section}`);
      }
    }

    return {
      isValid: issues.length === 0,
      issues,
    };
  }

  /**
   * Extract YAML frontmatter and body from markdown content
   */
  private extractYamlAndBody(content: string): { frontmatter: SkillMetadata; body: string } | null {
    if (!content.startsWith('---')) {
      return null;
    }

    const parts = content.split('---', 3);
    if (parts.length < 3) {
      return null;
    }

    try {
      const yamlFrontmatter = this.parseYaml(parts[1].trim());
      const body = parts[2].trim();
      return {
        frontmatter: yamlFrontmatter,
        body,
      };
    } catch (error) {
      console.error('Failed to parse YAML frontmatter', {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Simple YAML parser for frontmatter (handles basic key-value pairs)
   */
  private parseYaml(yamlContent: string): SkillMetadata {
    const result: Partial<SkillMetadata> = {};

    for (const line of yamlContent.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const colonIndex = trimmed.indexOf(':');
      if (colonIndex === -1) continue;

      const key = trimmed.substring(0, colonIndex).trim();
      const value = trimmed.substring(colonIndex + 1).trim();

      // Remove quotes if present
      const cleanValue = value.replace(/^"|"$/g, '').replace(/^'|'$/g, '');

      // Convert kebab-case to camelCase for TypeScript
      const camelKey = key.replace(/-([a-z])/g, (g) => g[1].toUpperCase());

      // Handle array values (triggers)
      if (key === 'triggers' || key === 'related-skills') {
        result[camelKey as keyof SkillMetadata] = cleanValue;
      } else {
        result[camelKey as keyof SkillMetadata] = cleanValue;
      }
    }

    return result as SkillMetadata;
  }

 /**
   * Save skill file to appropriate location
   */
  private async saveSkillFile(
    skillContent: SkillContent,
    domain?: string,
    topic?: string,
    contribute: boolean = true
  ): Promise<string> {
    // Use environment variable for base directory
    const baseDir = process.env.SKILLS_DIRECTORY || '/app';

    // Get domain and topic from content or arguments
    const skillDomain = domain || skillContent.frontmatter.domain;
    const skillTopic = topic || skillContent.frontmatter.name;

    // Security: Validate domain and topic to prevent path traversal attacks
    if (!/^[a-z0-9-]+$/.test(skillDomain)) {
      throw new Error(`Invalid domain: ${skillDomain}`);
    }
    if (!/^[a-z0-9-]+$/.test(skillTopic)) {
      throw new Error(`Invalid topic: ${skillTopic}`);
    }

    // Fail Fast: Use path.resolve() and verify result is within base directory
    const skillDirRel = contribute
      ? `skills/${skillDomain}/${skillTopic}`
      : `skill-cache/${skillDomain}/${skillTopic}`;

    // Path traversal protection: resolve and verify
    const resolvedPath = path.resolve(baseDir, skillDirRel);
    const resolvedBase = path.resolve(baseDir);

    // Security: Verify resolved path is within base directory
    if (!resolvedPath.startsWith(resolvedBase + path.sep) && resolvedPath !== resolvedBase) {
      throw new Error(`Path traversal attempt detected: ${resolvedPath}`);
    }

    // Create directory using async fs/promises
    await fs.mkdir(resolvedPath, { recursive: true });

    // Write skill file using async fs/promises
    const skillFile = path.join(resolvedPath, 'SKILL.md');
    await fs.writeFile(skillFile, skillContent.fullContent, 'utf-8');

    return skillFile;
  }

  /**
   * Get tool specification
   */
getSpecification(): ToolSpec {
    const spec: ToolSpec = {
      name: this.name,
      description: this.description,
      parameters: {
        type: 'object',
        properties: {
          task: {
            type: 'string',
            description: 'The task description that needs a skill (required)',
          },
          domain: {
            type: 'string',
            description: 'The domain category (optional — auto-detected from task if not provided). Any directory name under skills/ is valid.',
          },
          topic: {
            type: 'string',
            description: 'The skill topic name (kebab-case)',
          },
          dryRun: {
            type: 'boolean',
            description: 'Generate skill content without saving (default: false)',
          },
          contribute: {
            type: 'boolean',
            description: 'Save to skills directory and run automation scripts (default: true)',
          },
        },
        required: ['task'],
      },
    };
    if (this.methodology) {
      spec.methodology = this.methodology;
    }
    return spec;
  }
}
