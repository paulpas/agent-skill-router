"use strict";
// Compression Deduplicator
// Prevents duplicate LLM calls for concurrent requests targeting the same skill
// Maps in-flight compressions by skillname key
// Returns same Promise for concurrent requests (Promise-based dedup)
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompressionDeduplicator = void 0;
const Logger_1 = require("../observability/Logger");
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
class CompressionDeduplicator {
    inFlight = new Map();
    logger;
    constructor() {
        this.logger = new Logger_1.Logger('CompressionDeduplicator');
    }
    /**
     * Compress a skill, deduplicating concurrent requests
     *
     * Atomic Predictability: Same skillname = same Promise returned
     * Early Exit: Check map before expensive LLM call
     */
    async compress(skillName, originalContent, compressor) {
        // Guard: validate inputs
        if (!skillName || !originalContent || !compressor) {
            this.logger.error('Invalid input to compress', {
                skillName,
                contentLength: originalContent?.length || 0,
            });
            return null;
        }
        // Early exit: if already compressing this skill, wait for existing Promise
        const existingPromise = this.inFlight.get(skillName);
        if (existingPromise) {
            this.logger.debug('Returning existing in-flight compression', { skillName });
            return existingPromise;
        }
        // New compression request: call compressor and store Promise
        const promise = compressor
            .compressSkill(skillName, originalContent)
            .catch((error) => {
            // Fail fast: log error and return null (graceful degradation)
            this.logger.error('Compression failed in deduplicator', {
                skillName,
                error: String(error),
            });
            return null;
        })
            .finally(() => {
            // Atomic cleanup: remove from in-flight map
            this.inFlight.delete(skillName);
            this.logger.debug('Removed skill from in-flight map', { skillName });
        });
        // Store Promise in map (Intentional Naming: clear what we're storing)
        this.inFlight.set(skillName, promise);
        this.logger.debug('Started compression, stored in-flight promise', { skillName });
        return promise;
    }
    /**
     * Get current count of in-flight compressions
     * Atomic: returns snapshot of current state
     */
    getInFlightCount() {
        return this.inFlight.size;
    }
    /**
     * Get list of skills currently being compressed
     * Atomic: pure function
     */
    getInFlightSkills() {
        return Array.from(this.inFlight.keys());
    }
    /**
     * Clear all in-flight compressions (for testing/shutdown)
     * Fail Fast: immediately clears map
     */
    clear() {
        const count = this.inFlight.size;
        this.inFlight.clear();
        this.logger.info('Cleared in-flight compressions', { count });
    }
    /**
     * Wait for a specific skill's compression to complete
     * Returns the result or null if not in-flight or failed
     */
    async waitForSkill(skillName) {
        // Guard: skill must be in-flight
        const promise = this.inFlight.get(skillName);
        if (!promise) {
            this.logger.warn('Skill not in-flight', { skillName });
            return null;
        }
        return promise;
    }
}
exports.CompressionDeduplicator = CompressionDeduplicator;
//# sourceMappingURL=CompressionDeduplicator.js.map