// Auto-Skill Creator - detects routing gaps and generates high-quality skills automatically
// When no existing skill matches a task well enough, this module generates a new SKILL.md
// using the SkillGenerationTool, validates it, and reloads the router index.

import * as path from 'path';
import * as fs from 'fs/promises';
import { spawn } from 'child_process';
import type { RouteResponse, SkillCreateRequest, SkillCreateResponse } from '../core/types';
import { Router } from './Router';
import { SkillCreationTracker } from './SkillCreationTracker';
import { SkillGenerationTool, SkillContent } from '../mcp/tools/SkillGenerationTool';
import { Logger } from '../observability/Logger';

/**
 * Configuration for auto-skill creation
 */
export interface AutoSkillCreatorConfig {
  /** Master switch — set "false" to disable entirely */
  enabled?: boolean;
  /** Confidence threshold below which a gap is detected. Default: 0.35 */
  confidenceThreshold?: number;
  /** Max validation fix attempts before giving up. Default: 5 */
  maxValidationRetries?: number;
}

/**
 * Result of a single validation round
 */
interface ValidationResult {
  valid: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_CONFIG: AutoSkillCreatorConfig = {
  enabled: process.env.AUTO_SKILL_CREATION_ENABLED !== 'false', // true by default
  confidenceThreshold: 0.35,
  maxValidationRetries: 5,
};

/**
 * Run the Python structural validator on a SKILL.md file.
 */
function runPythonValidator(skillPath: string): Promise<ValidationResult> {
  return new Promise((resolve) => {
    const script = path.resolve(__dirname, '../../../scripts/validate_skill_yaml.py');
    const proc = spawn('python3', [script, skillPath], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (chunk: Buffer) => (stdout += chunk.toString()));
    proc.stderr.on('data', (chunk: Buffer) => (stderr += chunk.toString()));

    proc.on('close', (code) => {
      resolve({ valid: code === 0, stdout, stderr, exitCode: code ?? 1 });
    });

    // Safety timeout — validator should finish in <2s
    setTimeout(() => {
      proc.kill();
      resolve({ valid: false, stdout, stderr, exitCode: 1 });
    }, 5000);
  });
}

/**
 * Run the full bash validator (structural + static checks).
 */
function runBashValidator(skillPath: string): Promise<ValidationResult> {
  return new Promise((resolve) => {
    const script = path.resolve(__dirname, '../../../scripts/validate_skill.sh');
    const proc = spawn('bash', [script, skillPath], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (chunk: Buffer) => (stdout += chunk.toString()));
    proc.stderr.on('data', (chunk: Buffer) => (stderr += chunk.toString()));

    proc.on('close', (code) => {
      resolve({ valid: code === 0, stdout, stderr, exitCode: code ?? 1 });
    });

    setTimeout(() => {
      proc.kill();
      resolve({ valid: false, stdout, stderr, exitCode: 1 });
    }, 30000); // LLM check can be slow
  });
}

/**
 * Attempt to fix common YAML/frontmatter issues in a SKILL.md file.
 * Returns true if the file was modified.
 */
async function tryFixCommonIssues(skillPath: string, _stderrOutput: string): Promise<boolean> {
  let content = '';
  try {
    content = await fs.readFile(skillPath, 'utf-8');
  } catch {
    return false; // Can't read file — skip fix
  }

  const originalContent = content;

  // Fix: Missing or malformed frontmatter delimiter (add --- wrapper)
  if (!content.startsWith('---')) {
    content = '---\n' + content + '\n---\n';
  }

  // Fix: Unquoted version string like `version: 1.0.0` → `version: "1.0.0"`
  const unquotedVersionRe = /^(\s+version:\s*)([0-9][0-9.]*)$/m;
  if (unquotedVersionRe.test(content)) {
    content = content.replace(unquotedVersionRe, '$1"$2"');
  }

  // Fix: name field not matching directory name — only fix if we can detect the dir
  // This is hard to do without knowing the expected name, so skip auto-fix for now.

  // Write back only if changed
  if (content !== originalContent) {
    await fs.writeFile(skillPath, content, 'utf-8');
    return true;
  }

  return false;
}

/**
 * AutoSkillCreator detects when no existing skill matches a task and generates one.
 */
export class AutoSkillCreator {
  private config: AutoSkillCreatorConfig;
  private logger: Logger;

  constructor(config: Partial<AutoSkillCreatorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.logger = new Logger('AutoSkillCreator', {
      level: 'info',
    });
  }

  /**
   * Check if auto-creation is enabled and a gap is detected.
   */
  isGapDetected(response: RouteResponse): boolean {
    // Master switch
    if (!this.config.enabled) return false;

    const threshold: number = this.config.confidenceThreshold ?? 0.35;

    // No skills matched at all → gap
    if (response.selectedSkills.length === 0) return true;

    // Confidence below threshold → gap
    if (response.confidence < threshold) return true;

    // Top skill score is very low (< 0.1) — almost certainly not a real match
    const topScore = response.selectedSkills[0]?.score ?? 0;
    if (topScore < 0.1) return true;

    return false;
  }

  /**
   * Create a new skill for a task that has no good existing match.
   */
  async createSkill(
    request: SkillCreateRequest,
    router: Router
  ): Promise<SkillCreateResponse> {
    const _enabled = this.config.enabled ?? true;
    void _enabled; // Used by isGapDetected via this.config

    const threshold: number = this.config.confidenceThreshold ?? 0.35;
    const maxRetries: number = this.config.maxValidationRetries ?? 5;

    // Guard: check if we even need to create a skill
    const gapResponse = await router.routeTask({ task: request.task });
    const isGap = this.isGapDetected(gapResponse);

    if (!isGap) {
      return {
        status: 'no_gap',
        domain: '',
        topic: '',
        description: '',
        triggers: '',
        validationPasses: 0,
        totalValidationAttempts: 0,
        confidenceThreshold: threshold,
        gapConfidence: gapResponse.confidence,
        totalTokensUsed: 0,
        generationAttempts: 0,
      };
    }

    const isDryRun = request.dryRun === true;
    let domain = (request.domain ?? '').trim();
    let topic = (request.topic ?? '').trim();

    // Phase 1: Generate skill content via SkillGenerationTool
    this.logger.info('Generating skill', { task: request.task.slice(0, 120), domain, topic });

    const genTool = new SkillGenerationTool(120_000); // 2-min timeout for generation

    let skillContent: SkillContent;
    let totalTokensUsed = 0;
    try {
      const toolResult = await genTool.execute({
        task: request.task,
        domain: domain || undefined,
        topic: topic || undefined,
        dryRun: true, // First generate in dry-run to inspect
        contribute: true,
      });

      if (!toolResult.success) {
        throw new Error(toolResult.error ?? 'Skill generation tool failed');
      }

      const output = toolResult.output as SkillContent;
      if (!output) {
        throw new Error('No skill content returned from generation tool');
      }

      skillContent = output;

      // Capture token usage from the initial generation call
      const metadata = toolResult.metadata as Record<string, unknown> | undefined;
      totalTokensUsed = Number(metadata?.totalTokens || 0) || 0;

      // Extract domain and topic from generated content if not provided
      if (!domain) {
        domain = (skillContent.frontmatter.domain || 'coding').trim();
      }
      if (!topic) {
        const fallbackTopic = skillContent.frontmatter.name ?? (request.topic ?? '');
        topic = fallbackTopic.trim();
      }

      // Fix: ensure name matches the topic directory convention
      const generatedName = skillContent.frontmatter.name || '';
      if (generatedName && generatedName !== topic) {
        // Replace the name field in frontmatter
        const contentLines = skillContent.fullContent.split('\n');
        for (let i = 0; i < contentLines.length; i++) {
          if (contentLines[i].trim().startsWith('name:')) {
            contentLines[i] = `name: ${topic}`;
            break;
          }
        }
        skillContent.fullContent = contentLines.join('\n');
      }

      this.logger.info('Skill generated successfully', {
        domain,
        topic,
        description: (skillContent.frontmatter.description || '').slice(0, 120),
      });

    } catch (error) {
      this.logger.error('Skill generation failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error(`Skill generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Phase 2: Dry run — return content without saving
    if (isDryRun) {
      this.logger.info('Dry-run mode — returning generated skill', { domain, topic });
      return {
        status: 'dry_run',
        skillName: `${domain}/${topic}`,
        domain,
        topic,
        description: skillContent.frontmatter.description || '',
        triggers: skillContent.frontmatter.triggers || '',
        validationPasses: 0,
        totalValidationAttempts: 0,
        confidenceThreshold: threshold,
        gapConfidence: gapResponse.confidence,
        totalTokensUsed,
        generationAttempts: 1, // initial call only
      };
    }

    // Phase 3: Save the skill file
    const baseDir = process.env.SKILLS_DIRECTORY || path.resolve(__dirname, '../../..');
    const skillDir = path.join(baseDir, 'skills', domain, topic);
    const skillPath = path.join(skillDir, 'SKILL.md');

    // Security: validate paths (same checks as SkillGenerationTool)
    if (!/^[a-z0-9-]+$/.test(domain)) {
      throw new Error(`Invalid domain: ${domain}`);
    }
    if (!/^[a-z0-9-]+$/.test(topic)) {
      throw new Error(`Invalid topic: ${topic}`);
    }

    // Resolve and verify path is within base directory (path traversal protection)
    const resolvedSkillPath = path.resolve(skillPath);
    const resolvedBaseDir = path.resolve(baseDir);
    if (!resolvedSkillPath.startsWith(resolvedBaseDir + path.sep) && resolvedSkillPath !== resolvedBaseDir) {
      throw new Error(`Path traversal attempt detected: ${resolvedSkillPath}`);
    }

    await fs.mkdir(skillDir, { recursive: true });
    await fs.writeFile(skillPath, skillContent.fullContent, 'utf-8');

    this.logger.info('Skill file saved', { path: resolvedSkillPath });

    // Phase 4: Validation loop — fix issues up to maxRetries times
    let attempts = 0;
    let totalValidationAttempts = 0;

    while (attempts < maxRetries) {
      totalValidationAttempts++;

      // Run Python structural validator first (fast path)
      const pyResult = await runPythonValidator(skillPath);
      if (pyResult.valid) {
        this.logger.info(`Structural validation passed on attempt ${attempts + 1}`);
        break;
      }

      // Try to auto-fix common issues
      const fixed = await tryFixCommonIssues(skillPath, pyResult.stderr);

      if (fixed) {
        attempts++;
        continue; // Re-validate the fixed file
      }

      // If Python validator still fails, run the full bash validator for deeper checks
      const bashResult = await runBashValidator(skillPath);

      if (bashResult.valid) {
        this.logger.info(`Full validation passed on attempt ${attempts + 1}`);
        break;
      }

      // Bash failed — try to fix and regenerate with feedback
      attempts++;
      if (attempts >= maxRetries) {
        this.logger.warn('Validation failed after all retry attempts', {
          stderr: bashResult.stderr.slice(0, 500),
        });
        break;
      }

      // If auto-fix didn't help and Python validator also fails,
      // try regenerating with error feedback from the tool
      this.logger.info(`Validation failed on attempt ${attempts}, attempting regeneration`, {
        pythonErrors: pyResult.stderr.slice(0, 200),
        bashErrors: bashResult.stderr.slice(0, 300),
      });

      try {
        const errorFeedback = `Previous generation had these issues:\n\nPython validator errors:\n${pyResult.stderr}\n\nBash validator errors:\n${bashResult.stderr}`;
        const retryToolResult = await genTool.execute({
          task: `${request.task}\n\nFix the following validation errors and regenerate:\n${errorFeedback}`,
          domain,
          topic,
          dryRun: true,
          contribute: false, // Don't auto-contribute on retries
        });

        if (retryToolResult.success && retryToolResult.output) {
          const retryContent = retryToolResult.output as SkillContent;
          await fs.writeFile(skillPath, retryContent.fullContent, 'utf-8');

          // Accumulate token usage from regeneration attempts
          const retryMetadata = retryToolResult.metadata as Record<string, unknown> | undefined;
          totalTokensUsed += Number(retryMetadata?.totalTokens || 0) || 0;
        }
      } catch (regenError) {
        this.logger.warn('Regeneration attempt failed', {
          error: regenError instanceof Error ? regenError.message : String(regenError),
        });
        // Don't throw — let the current file be saved even if imperfect
      }
    }

    // Phase 5: Reload the router index to pick up the new skill
    try {
      await router.reloadSkills();
      router.syncVectorDatabase();
      this.logger.info('Router reloaded with new skill', { domain, topic });
    } catch (reloadError) {
      this.logger.warn('Failed to reload router index', {
        error: reloadError instanceof Error ? reloadError.message : String(reloadError),
      });
      // Don't throw — the file is saved even if reload fails
    }

    const response: SkillCreateResponse = {
      status: 'created',
      skillName: `${domain}/${topic}`,
      skillPath: resolvedSkillPath,
      domain,
      topic,
      description: skillContent.frontmatter.description || '',
      triggers: skillContent.frontmatter.triggers || '',
      validationPasses: totalValidationAttempts,
      totalValidationAttempts,
      confidenceThreshold: threshold,
      gapConfidence: gapResponse.confidence,
      totalTokensUsed,
      generationAttempts: attempts + 1, // initial call + any regeneration attempts
    };

    // Persist to created-skills index
    try {
      const tracker = new SkillCreationTracker();
      tracker.addSkill({
        skillName: `${domain}/${topic}`,
        domain,
        topic,
        description: skillContent.frontmatter.description || '',
        triggers: skillContent.frontmatter.triggers || '',
        filePath: resolvedSkillPath,
        timestamp: new Date().toISOString(),
        totalTokensUsed,
        generationAttempts: attempts + 1,
        validationAttempts: totalValidationAttempts,
        gitCommitted: false,
        gitPushed: false,
      });
    } catch (trackError) {
      this.logger.warn('Failed to persist skill creation index', {
        error: trackError instanceof Error ? trackError.message : String(trackError),
      });
    }

    this.logger.info('Auto-skill creation complete', {
      status: response.status,
      skillName: response.skillName,
      validationPasses: response.validationPasses,
      totalTokensUsed: response.totalTokensUsed,
      generationAttempts: response.generationAttempts,
    });

    return response;
  }
}
