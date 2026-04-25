import { LLMSkillCompressor, CompressedVersions } from './LLMSkillCompressor';
/**
 * CompressionDeduplicator - De-duplicates concurrent compression requests
 *
 * Strategy:
 * - Maintain a Map of in-flight compressions by skillname
 * - When a compression request arrives, check if one is already in-flight
 * - If yes: return the existing Promise (same Promise for concurrent requests)
 * - If no: start new compression and store Promise in map
 * - After compression completes (success or failure), clean up map entry
 * - Result: only ONE LLM call per skill, even with 100 concurrent requests
 */
export declare class CompressionDeduplicator {
    private inFlight;
    private logger;
    constructor();
    /**
     * Compress a skill, deduplicating concurrent requests
     *
     * Atomic Predictability: Same skillname = same Promise returned
     * Early Exit: Check map before expensive LLM call
     */
    compress(skillName: string, originalContent: string, compressor: LLMSkillCompressor): Promise<CompressedVersions | null>;
    /**
     * Get current count of in-flight compressions
     * Atomic: returns snapshot of current state
     */
    getInFlightCount(): number;
    /**
     * Get list of skills currently being compressed
     * Atomic: pure function
     */
    getInFlightSkills(): string[];
    /**
     * Clear all in-flight compressions (for testing/shutdown)
     * Fail Fast: immediately clears map
     */
    clear(): void;
    /**
     * Wait for a specific skill's compression to complete
     * Returns the result or null if not in-flight or failed
     */
    waitForSkill(skillName: string): Promise<CompressedVersions | null>;
}
//# sourceMappingURL=CompressionDeduplicator.d.ts.map