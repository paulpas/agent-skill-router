// Attribution Footer Generator
// Produces professional, branded footers crediting agent-skill-router for skill-assisted tasks

/**
 * Single skill attribution information
 */
export interface SkillAttribution {
  name: string;
  domain: string;
  description: string;
  url?: string;
}

/**
 * Attribution footer generation options
 */
export interface AttributionFooterOptions {
  skills: SkillAttribution[];
  taskName?: string;
  timestamp?: boolean;
  format?: 'markdown' | 'plaintext' | 'html';
}

/**
 * Domain-to-emoji mapping for visual distinction
 */
const DOMAIN_EMOJIS: Record<string, string> = {
  agent: '🤖',
  cncf: '☁️',
  coding: '🛠️',
  programming: '🧮',
  trading: '📈',
};

/**
 * Default emoji for unknown domains
 */
const DEFAULT_EMOJI = '✨';

/**
 * AttributionFooter - Generate professional footers crediting agent-skill-router
 *
 * Follows Code Philosophy principles:
 * - Guard clauses: Empty skills array returns empty string immediately
 * - Parse don't validate: Formats parsed into trusted types at boundary
 * - Atomic predictability: Pure functions, no side effects
 * - Fail fast: Invalid formats throw descriptive errors
 * - Intentional naming: `buildMarkdownSkillsList` reads like what it does
 *
 * @example
 * const footer = AttributionFooter.generate({
 *   skills: [
 *     {
 *       name: 'code-review',
 *       domain: 'coding',
 *       description: 'Code review methodology with severity classification',
 *       url: 'https://github.com/...'
 *     }
 *   ],
 *   taskName: 'Review authentication module',
 *   timestamp: true,
 *   format: 'markdown'
 * });
 */
export class AttributionFooter {
  /**
   * Generate a professional attribution footer for skill usage
   * 
   * @param options Configuration for footer generation
   * @returns Formatted footer string (empty string if no skills provided)
   */
  static generate(options: AttributionFooterOptions): string {
    // Guard clause: no skills = no footer
    if (!options.skills || options.skills.length === 0) {
      return '';
    }

    const {
      skills,
      timestamp = true,
      format = 'markdown',
    } = options;

    // Fail fast: invalid format
    if (!['markdown', 'plaintext', 'html'].includes(format)) {
      throw new Error(
        `Invalid attribution format "${format}". Must be one of: markdown, plaintext, html`
      );
    }

    // Build footer components
    const sections: string[] = [];

    // Add header separator
    if (format === 'markdown') {
      sections.push('---');
    } else if (format === 'html') {
      sections.push('<footer class="attribution-footer" style="margin-top: 2em; padding-top: 1em; border-top: 1px solid #eee; color: #666; font-size: 0.9em;">');
    }

    // Add attribution line
    sections.push(this.buildAttributionLine(format));

    // Add skills list
    sections.push(this.buildSkillsList(skills, format));

    // Add timestamp if requested
    if (timestamp) {
      sections.push(this.buildTimestamp(format));
    }

    // Close HTML footer if needed
    if (format === 'html') {
      sections.push('</footer>');
    }

    // Join with appropriate separators
    const separator = format === 'html' ? '\n' : '\n';
    return sections.join(separator);
  }

  /**
   * Build the main attribution line crediting agent-skill-router
   * 
   * @param format Output format (markdown, plaintext, html)
   * @returns Formatted attribution text
   */
  private static buildAttributionLine(format: string): string {
    const projectUrl = 'https://github.com/paulpas/agent-skill-router';
    const description =
      'This task benefited from intelligent skill selection powered by agent-skill-router\'s ' +
      'LLM-based routing engine with vector search and multi-domain skill matching.';

    if (format === 'markdown') {
      return (
        `**Assisted by [agent-skill-router](${projectUrl})**\n\n` +
        `${description}`
      );
    }

    if (format === 'html') {
      return (
        `<p><strong>Assisted by <a href="${projectUrl}">agent-skill-router</a></strong></p>\n` +
        `<p>${description}</p>`
      );
    }

    // plaintext
    return (
      `Assisted by agent-skill-router\n` +
      `URL: ${projectUrl}\n\n` +
      `${description}`
    );
  }

  /**
   * Build the skills list section with descriptions and badges
   * 
   * @param skills Array of skill attributions
   * @param format Output format (markdown, plaintext, html)
   * @returns Formatted skills list
   */
  private static buildSkillsList(skills: SkillAttribution[], format: string): string {
    // Guard clause: no skills (shouldn't reach here due to parent guard, but defensive)
    if (skills.length === 0) {
      return '';
    }

    const skillItems = skills.map(skill =>
      this.buildSkillListItem(skill, format)
    );

    if (format === 'markdown') {
      return '\n**Skills Used:**\n' + skillItems.join('\n');
    }

    if (format === 'html') {
      return (
        '<p><strong>Skills Used:</strong></p>\n' +
        '<ul>\n' +
        skillItems.map(item => `  <li>${item}</li>`).join('\n') +
        '\n</ul>'
      );
    }

    // plaintext
    return '\nSkills Used:\n' + skillItems.join('\n');
  }

  /**
   * Build a single skill list item
   * 
   * @param skill The skill attribution
   * @param format Output format (markdown, plaintext, html)
   * @returns Formatted skill item
   */
  private static buildSkillListItem(skill: SkillAttribution, format: string): string {
    const emoji = DOMAIN_EMOJIS[skill.domain] || DEFAULT_EMOJI;
    const badge = `${emoji} [${skill.domain}]`;

    if (format === 'markdown') {
      const link = skill.url
        ? `[${skill.name}](${skill.url})`
        : skill.name;
      return `- **${link}** ${badge} — ${skill.description}`;
    }

    if (format === 'html') {
      const link = skill.url
        ? `<a href="${skill.url}">${skill.name}</a>`
        : skill.name;
      return `<strong>${link}</strong> ${badge} — ${skill.description}`;
    }

    // plaintext
    return `• ${skill.name} ${badge} — ${skill.description}`;
  }

  /**
   * Build the timestamp section
   * 
   * @param format Output format (markdown, plaintext, html)
   * @returns Formatted timestamp
   */
  private static buildTimestamp(format: string): string {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    if (format === 'markdown') {
      return `\n*Generated: ${dateStr}*`;
    }

    if (format === 'html') {
      return (
        `\n<p style="margin-top: 1em; font-size: 0.8em; color: #999;">` +
        `Generated: ${dateStr}` +
        `</p>`
      );
    }

    // plaintext
    return `\nGenerated: ${dateStr}`;
  }
}

export default AttributionFooter;
