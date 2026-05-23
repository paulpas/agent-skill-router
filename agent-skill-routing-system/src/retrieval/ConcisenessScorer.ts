// ConcisenessScorer — scores how concise, directive, and procedurally-oriented a skill is.
// Analyzes raw SKILL.md content for actionable density, imperative verbs, checklists, etc.

export interface ConcisenessMetrics {
  actionableStepDensity: number;   // actionable steps per 1000 tokens
  commandDensity: number;          // imperative verbs per 1000 tokens
  checklistPresence: boolean;      // has markdown checklist items?
  directiveStrength: 'low' | 'medium' | 'high';
}

/**
 * Common imperative/action verbs used in procedural documentation.
 */
const IMPERATIVE_VERBS = new Set([
  'implement', 'configure', 'deploy', 'setup', 'create', 'install',
  'fix', 'resolve', 'enable', 'disable', 'add', 'remove', 'update',
  'modify', 'set', 'run', 'build', 'test', 'verify', 'check',
  'validate', 'audit', 'review', 'monitor', 'optimize', 'scale',
  'migrate', 'rotate', 'restart', 'apply', 'define', 'establish',
  'assign', 'grant', 'revoke', 'block', 'allow', 'filter',
  'parse', 'serialize', 'encrypt', 'decrypt', 'compress',
]);

/**
 * Analyze skill content and return conciseness metrics.
 */
export class ConcisenessScorer {
  /**
   * Analyze raw skill content and response profile to compute conciseness metrics.
   */
  static analyze(
    rawContent: string,
    responseProfile?: { verbosity?: string; directiveStrength?: string }
  ): ConcisenessMetrics {
    const text = rawContent || '';
    const tokens = this.tokenize(text);
    const totalTokens = tokens.length;

    if (totalTokens === 0) {
      return {
        actionableStepDensity: 0,
        commandDensity: 0,
        checklistPresence: false,
        directiveStrength: 'low',
      };
    }

    // Count numbered steps (^\\d+\\.\\s pattern)
    const numberedSteps = this.countNumberedSteps(text);

    // Count bullet points starting with action verbs
    const actionBullets = this.countActionBulletPoints(text);

    // Total actionable steps
    const totalActionableSteps = numberedSteps + actionBullets;

    // Actionable step density (per 1000 tokens)
    const actionableStepDensity = (totalActionableSteps / totalTokens) * 1000;

    // Count imperative verbs
    const imperativeCount = this.countImperativeVerbs(tokens);
    const commandDensity = (imperativeCount / totalTokens) * 1000;

    // Checklist presence
    const checklistPresence = this.detectChecklist(text);

    // Directive strength
    let directiveStrength: 'low' | 'medium' | 'high';
    if (responseProfile?.directiveStrength) {
      directiveStrength = responseProfile.directiveStrength as 'low' | 'medium' | 'high';
    } else {
      // Infer from imperative verb ratio
      const imperativeRatio = imperativeCount / totalTokens;
      if (imperativeRatio > 0.03) {
        directiveStrength = 'high';
      } else if (imperativeRatio > 0.01) {
        directiveStrength = 'medium';
      } else {
        directiveStrength = 'low';
      }
    }

    return {
      actionableStepDensity: Math.round(actionableStepDensity * 100) / 100,
      commandDensity: Math.round(commandDensity * 100) / 100,
      checklistPresence,
      directiveStrength,
    };
  }

  /**
   * Convert raw metrics to a normalized [0, 1] score.
   */
  static computeScore(metrics: ConcisenessMetrics): number {
    // Normalize each component to [0, 1]
    const actionableNorm = Math.min(1, metrics.actionableStepDensity / 200);
    const commandNorm = Math.min(1, metrics.commandDensity / 150);
    const checklistWeight = metrics.checklistPresence ? 0.2 : 0;

    // Directive strength weight
    let directiveWeight: number;
    switch (metrics.directiveStrength) {
      case 'high': directiveWeight = 1.0; break;
      case 'medium': directiveWeight = 0.5; break;
      default: directiveWeight = 0;
    }

    // Formula: (actionableDensity * 0.3) + (commandDensity * 0.3) + (checklistPresence ? 0.2 : 0) + (directiveStrengthWeight * 0.2)
    const score =
      actionableNorm * 0.3 +
      commandNorm * 0.3 +
      checklistWeight +
      directiveWeight * 0.2;

    return Math.max(0, Math.min(1, score));
  }

  // --- Internal methods ---

  /** Count numbered steps (lines matching `^\s*\d+\.\s+`) */
  private static countNumberedSteps(text: string): number {
    const pattern = /^\s*\d+\.\s+/m;
    const matches = text.match(pattern);
    return matches ? matches.length : 0;
  }

  /** Count bullet points starting with action verbs (lines matching `^\s*-\s+[A-Z]`) */
  private static countActionBulletPoints(text: string): number {
    // Match bulleted lines that start with an uppercase letter (indicating an action verb)
    const pattern = /^\s*[-*]\s+[A-Z][a-z]+/gm;
    const matches = text.match(pattern);
    return matches ? matches.length : 0;
  }

  /** Count imperative verbs in tokenized text */
  private static countImperativeVerbs(tokens: string[]): number {
    let count = 0;
    for (const token of tokens) {
      if (IMPERATIVE_VERBS.has(token.toLowerCase())) {
        count++;
      }
    }
    return count;
  }

  /** Detect markdown checklist items (- [x] or - [ ]) */
  private static detectChecklist(text: string): boolean {
    return /- \[([ x])\]/.test(text);
  }

  /** Tokenize: lowercase, split on non-alphanumeric */
  private static tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 0);
  }
}
