// IntentDecomposer — Decompose queries into weighted intent fragments for multi-dimensional retrieval.

import type { SkillRegistry } from '../core/SkillRegistry';

/**
 * A single extracted intent fragment with its normalized weight.
 */
export interface IntentFragment {
  /** The extracted intent term (e.g. "security", "kubernetes") */
  intent: string;
  /** Normalized importance [0, 1]; all weights in a query sum to 1.0 */
  weight: number;
}

/**
 * Result of decomposing a query into weighted fragments.
 */
export interface DecomposedQuery {
  /** The original (normalized) query text */
  originalQuery: string;
  /** Ordered list of intent fragments, sorted by weight descending */
  fragments: IntentFragment[];
}

/** Known domain names for intent matching against skill categories. */
const DOMAINS = [
  'agent', 'cncf', 'coding', 'devops', 'electical-engineering', 'go',
  'linux', 'maker', 'networking', 'programming', 'trading', 'writing',
] as const;

/**
 * Intent category keyword mapping (non-domain intents).
 * Each intent name maps to a list of synonymous trigger phrases.
 */
const INTENT_MAP: Record<string, string[]> = {
  'security': ['security', 'vulnerability', 'owasp', 'audit', 'compliance', 'sast', 'dast'],
  'performance': ['performance', 'optimization', 'latency', 'speed', 'throughput', 'bottleneck'],
  'debugging': ['debug', 'bug', 'fix', 'error', 'trace', 'investigate', 'diagnose'],
  'design': ['design', 'architect', 'pattern', 'structure', 'architecture'],
  'testing': ['test', 'testing', 'unit test', 'integration test', 'mock', 'coverage'],
  'deployment': ['deploy', 'deployment', 'ci/cd', 'pipeline', 'dockerize', 'containerize'],
  'monitoring': ['monitoring', 'observability', 'metrics', 'logging', 'tracing', 'alerting'],
  'authentication': ['auth', 'authentication', 'authorization', 'oauth', 'jwt', 'sso'],
  'scaling': ['scaling', 'scale', 'horizontal scaling', 'load balancing', 'auto-scaling'],
};

/**
 * Normalized trigger→domain index built from loaded skills at initialization.
 * Maps lowercase, stripped trigger phrases to the list of domains (categories)
 * that skill(s) with that trigger belong to.
 */
type TriggerDomainIndex = Map<string, string[]>;

/**
 * Normalize a trigger phrase for lookup in the dynamic index.
 * Strips hyphens and underscores, collapses whitespace, lowercases.
 * This enables fuzzy matching: "stop-loss" ≡ "stop loss", "k8s" ≠ "kubernetes".
 */
function normalizeTrigger(phrase: string): string {
  return phrase
    .toLowerCase()
    .replace(/[-_]/g, ' ')        // replace hyphens/underscores with space
    .replace(/\s+/g, ' ')         // collapse whitespace
    .trim();
}

/**
 * Build a trigger→domain index from all loaded skills in the registry.
 * Iterates every skill, extracts its metadata.triggers and metadata.category (domain),
 * then indexes each trigger phrase under its domain.
 *
 * Handles duplicate keys gracefully: if the same trigger appears across multiple
 * skills in different domains, all domains are collected into a single array.
 */
export function buildTriggerDomainIndex(skillRegistry: SkillRegistry): TriggerDomainIndex {
  const index = new Map<string, string[]>();
  const allSkills = skillRegistry.getAllSkills();

  for (const skill of allSkills) {
    const domain = skill.metadata.category;
    if (!domain) continue;

    // Support both YAML array format and comma-separated string from frontmatter
    let triggers: string[] = [];
    const rawTriggers = skill.metadata.triggers ?? [];

    if (Array.isArray(rawTriggers)) {
      triggers = rawTriggers
        .filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
        .map((t) => t.trim());
    }

    for (const trigger of triggers) {
      const normalized = normalizeTrigger(trigger);
      if (!normalized) continue;

      // Collect all domains for this trigger
      let existingDomains = index.get(normalized);
      if (!existingDomains) {
        existingDomains = [];
        index.set(normalized, existingDomains);
      }

      // Add domain only if not already present (deduplication)
      if (!existingDomains.includes(domain)) {
        existingDomains.push(domain);
      }
    }
  }

  return index;
}

/**
 * Look up a normalized trigger phrase in the dynamic index.
 * Returns the list of domains for the given trigger, or undefined if not found.
 */
function lookupTrigger(
  normalizedPhrase: string,
  dynamicIndex: TriggerDomainIndex | null,
): string[] | undefined {
  // Check dynamic index (built from loaded skills)
  if (dynamicIndex) {
    const domains = dynamicIndex.get(normalizedPhrase);
    if (domains && domains.length > 0) {
      return domains;
    }
  }

  return undefined;
}

/**
 * IntentDecomposer — splits a natural language query into weighted intent fragments
 * so that the routing pipeline can retrieve from multiple dimensions.
 *
 * Trigger Index:
 * - Built once at router initialization via `initialize()` which calls `buildTriggerDomainIndex()`
 * - Uses loaded skills' metadata.triggers + metadata.category fields
 */
export class IntentDecomposer {
  /** Known domains for intent matching against skill categories. */
  static readonly DOMAINS = [...DOMAINS];

  /** Intent category keyword mapping used during decomposition. */
  static readonly INTENT_MAP = { ...INTENT_MAP };

  /** Dynamic trigger→domain index built from loaded skills' metadata.triggers. Null until initialized. */
  private static _triggerDomainIndex: TriggerDomainIndex | null = null;

  /**
   * Initialize the dynamic trigger→domain index from a SkillRegistry.
   * Must be called once after skills are loaded (e.g., during Router initialization).
   * This is idempotent — calling it again rebuilds the index from scratch.
   */
  static initialize(skillRegistry: SkillRegistry): void {
    IntentDecomposer._triggerDomainIndex = buildTriggerDomainIndex(skillRegistry);
  }

/**
    * Decompose a query into weighted intent fragments.
    *
    * Algorithm:
    * 1. Tokenize query (lowercase, split on whitespace/punctuation)
    * 2. Check each token and multi-word span against dynamic trigger→domain index
    * 3. Check intent category phrases against INTENT_MAP
    * 4. Collect matches with raw counts
    * 5. Normalize weights so they sum to 1.0
    * 6. Fallback: if no keywords matched, treat the whole query as a single intent
    */
  static decompose(query: string): DecomposedQuery {
    const trimmed = query.trim();
    if (!trimmed) {
      return { originalQuery: '', fragments: [] };
    }

    // --- Phase 1: Multi-word keyword matching (longest match first) ---
    const rawFragments = new Map<string, number>();
    const lowerQuery = trimmed.toLowerCase();

    // Use dynamic index keys only, sorted by length descending so longest matches take priority
    // If the index is empty, fall back gracefully to Phase 3 single-word token matching.
    const allKeys = IntentDecomposer._triggerDomainIndex
      ? new Set(IntentDecomposer._triggerDomainIndex.keys())
      : new Set<string>();

    const sortedKeywords = [...allKeys].sort((a, b) => b.length - a.length);

    for (const keyword of sortedKeywords) {
      if (!lowerQuery.includes(keyword.toLowerCase())) continue;

      // Count occurrences in the query
      let count = 0;
      let startIndex = 0;
      const lowerKeyword = keyword.toLowerCase();
      while ((startIndex = lowerQuery.indexOf(lowerKeyword, startIndex)) !== -1) {
        count++;
        startIndex += lowerKeyword.length;
      }

      // Look up domains from the dynamic trigger→domain index
      const domains = lookupTrigger(keyword, IntentDecomposer._triggerDomainIndex) ?? [];
      for (const domain of domains) {
        rawFragments.set(domain, (rawFragments.get(domain) ?? 0) + count);
      }
   }

    // --- Phase 2: Intent category matching ---
    // Build reverse lookup: trigger phrase → intent name
    const phraseToIntent = new Map<string, string>();
    for (const [intentName, phrases] of Object.entries(INTENT_MAP)) {
      for (const phrase of phrases) {
        const lowerPhrase = phrase.toLowerCase();
        // Prefer longer phrases (avoid "test" matching inside "testing")
        if (!phraseToIntent.has(lowerPhrase) || lowerPhrase.length > phraseToIntent.get(lowerPhrase)!.length) {
          phraseToIntent.set(lowerPhrase, intentName);
        }
      }
    }

    // Check each trigger phrase in the query
    const sortedPhrases = [...phraseToIntent.keys()].sort((a, b) => b.length - a.length);
    for (const phrase of sortedPhrases) {
      if (!lowerQuery.includes(phrase)) continue;

      let count = 0;
      let startIndex = 0;
      while ((startIndex = lowerQuery.indexOf(phrase, startIndex)) !== -1) {
        count++;
        startIndex += phrase.length;
      }

      if (count > 0) {
        const intentName = phraseToIntent.get(phrase)!;
        rawFragments.set(intentName, (rawFragments.get(intentName) ?? 0) + count);
      }
    }

    // --- Phase 3: Single-word fallback matching ---
    if (rawFragments.size === 0) {
      // Fallback: tokenize and match individual words against dynamic index
      const tokens = trimmed.toLowerCase().split(/[\s,;:.!?/\\]+/).filter(Boolean);
      for (const token of tokens) {
        const normalizedToken = normalizeTrigger(token);
        // Check dynamic index for single-word matches
        const domains = lookupTrigger(normalizedToken, IntentDecomposer._triggerDomainIndex);
        if (domains) {
          for (const domain of domains) {
            rawFragments.set(domain, (rawFragments.get(domain) ?? 0) + 1);
          }
        }
      }
    }

    // --- Phase 4: Fallback to single intent if nothing matched ---
    if (rawFragments.size === 0) {
      return {
        originalQuery: trimmed,
        fragments: [{ intent: trimmed.slice(0, 64), weight: 1.0 }],
      };
    }

    // --- Phase 5: Normalize weights to sum to 1.0 ---
    const totalWeight = [...rawFragments.values()].reduce((sum, w) => sum + w, 0);
    if (totalWeight === 0) {
      return {
        originalQuery: trimmed,
        fragments: [{ intent: trimmed.slice(0, 64), weight: 1.0 }],
      };
    }

    const fragments: IntentFragment[] = [];
    for (const [intent, rawWeight] of rawFragments) {
      fragments.push({
        intent,
        weight: round(rawWeight / totalWeight, 4),
      });
    }

    // Sort by weight descending, then alphabetically for stability
    fragments.sort((a, b) => b.weight - a.weight || a.intent.localeCompare(b.intent));

    return { originalQuery: trimmed, fragments };
  }

  /**
   * Get the current trigger→domain index (null if not yet initialized).
   */
  static getTriggerDomainIndex(): TriggerDomainIndex | null {
    return IntentDecomposer._triggerDomainIndex;
  }
}

/** Round to `digits` decimal places. */
function round(v: number, digits: number): number {
  const factor = Math.pow(10, digits);
  return Math.round(v * factor) / factor;
}
