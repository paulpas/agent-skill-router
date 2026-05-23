// Keyword-based query-to-archetype inference system (no LLM required)

/**
 * Maps each archetype to its set of triggering keywords/patterns.
 */
const ARCHETYPE_KEYWORDS: Record<string, string[]> = {
  tactical: [
    'fix', 'resolve', 'debug', 'configure', 'set up', 'install',
    'patch', 'error', 'bug', 'implement a', 'add a',
  ],
  strategic: [
    'design', 'architect', 'plan', 'roadmap', 'scalable',
    'long-term', 'future-proof', 'evolve to', 'migrate from', 'restructure',
  ],
  diagnostic: [
    'why is', 'what caused', 'investigate', 'root cause', 'diagnose',
    'troubleshoot', 'slow', 'failing', 'broken', 'issue with',
  ],
  orchestration: [
    'pipeline', 'workflow', 'automate', 'coordinate', 'orchestrate',
    'integrate multiple', 'chain of', 'multi-step', 'delegation',
  ],
  educational: [
    'explain', 'teach me', 'how does', 'what is', 'learn about',
    'tutorial', 'understand', 'concept of', 'difference between',
  ],
  enforcement: [
    'compliance', 'policy', 'security audit', 'requirement',
    'must not', 'forbidden', 'gate', 'validation', 'check that',
  ],
  generation: [
    'generate', 'create from scratch', 'boilerplate', 'scaffold',
    'produce', 'auto-generate', 'code gen',
  ],
};

/**
 * Given a query string, infer which archetypes the user likely needs.
 * Returns an array of archetype strings (sorted by confidence descending).
 */
function infer(query: string): string[] {
  const results = inferWithConfidence(query);
  return results.map((r) => r.archetype);
}

/**
 * Get confidence score for each inferred archetype (0-1).
 * Only includes archetypes with at least one keyword match.
 */
function inferWithConfidence(query: string): Array<{ archetype: string; confidence: number }> {
  const lowerQuery = query.toLowerCase();
  const results: Array<{ archetype: string; confidence: number }> = [];

  for (const [archetype, keywords] of Object.entries(ARCHETYPE_KEYWORDS)) {
    let matches = 0;
    for (const keyword of keywords) {
      if (lowerQuery.includes(keyword.toLowerCase())) {
        matches++;
      }
    }

    if (matches > 0) {
      const baseConfidence = Math.min(1.0, matches / keywords.length);
      // Bonus for "how do i" patterns
      const howDoIBonus = lowerQuery.includes('how do i') ? 0.05 : 0;
      const confidence = Math.min(1.0, baseConfidence + howDoIBonus);
      results.push({ archetype, confidence });
    }
  }

  // Sort by confidence descending for consistent ordering
  results.sort((a, b) => b.confidence - a.confidence);
  return results;
}

export const QueryArchetypeInferencer = { infer, inferWithConfidence };
