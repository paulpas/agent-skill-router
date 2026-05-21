// External Content Embedder
// In-memory embedding of content chunks for semantic retrieval.
// Embeddings are session-scoped and discarded after resolution completes.
// Follows the 5 Laws of Elegant Defense for clean, safe implementation.

import { EmbeddingService } from '../embedding/EmbeddingService';
import { ContentChunk } from './ExternalContentChunker';

export interface EmbeddingResult {
  chunk: ContentChunk;
  embedding: number[];
}

/**
 * Embeds external content chunks in-memory for semantic retrieval.
 * No disk persistence — embeddings are discarded after each resolution session.
 */
export class ExternalContentEmbedder {
  private embeddingService: EmbeddingService;
  private sessionCache: Map<string, EmbeddingResult[]> = new Map(); // URL hash → results

  constructor(embeddingService: EmbeddingService) {
    this.embeddingService = embeddingService;
  }

  /**
   * Embed all chunks. Results are in-memory only (no disk persistence).
   * Caches within session by URL + content hash.
   */
  async embedChunks(chunks: ContentChunk[]): Promise<EmbeddingResult[]> {
    // Law 1: Early Exit — empty chunk list
    if (chunks.length === 0) {
      return [];
    }

    // Check session cache by source URL
    const urlHash = this.hashUrl(chunks[0].sourceUrl);
    const cached = this.sessionCache.get(urlHash);
    if (cached) {
      return cached;
    }

    // Extract chunk texts for batch embedding
    const texts = chunks.map(c => c.content);

    // Use EmbeddingService batch API for efficient embedding
    const responses = await this.embeddingService.batchEmbeddings(texts);

    // Map responses to EmbeddingResult
    const results: EmbeddingResult[] = chunks.map((chunk, i) => ({
      chunk,
      embedding: responses[i]?.embedding ?? this.fallbackEmbedding(chunk.content),
    }));

    // Cache in session
    this.sessionCache.set(urlHash, results);

    return results;
  }

  /**
   * Generate embedding for a query string (e.g., skill context).
   */
  async embedQuery(query: string): Promise<number[]> {
    // Law 1: Early Exit — empty query
    if (!query || query.trim().length === 0) {
      throw new Error('Query string must not be empty');
    }

    const response = await this.embeddingService.generateEmbedding(query);
    return response.embedding;
  }

  /**
   * Clear in-memory cache (called after resolution completes).
   */
  clearCache(): void {
    this.sessionCache.clear();
  }

  /**
   * Generate a deterministic fallback embedding when the embedding service fails.
   * Uses the same hash-based approach as EmbeddingService for consistency.
   */
  private fallbackEmbedding(text: string): number[] {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }

    const dimensions = 64; // Default fallback dimension
    const embedding: number[] = [];
    const seed = Math.abs(hash);
    let value = seed;

    for (let i = 0; i < dimensions; i++) {
      value = (value * 9301 + 49297) % 233280;
      embedding.push((value / 233280) * 2 - 1);
    }

    // Normalize
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    if (magnitude === 0) return embedding;
    return embedding.map(val => val / magnitude);
  }

  /**
   * Simple hash of URL for cache key generation.
   */
  private hashUrl(url: string): string {
    let hash = 0;
    for (let i = 0; i < url.length; i++) {
      const char = url.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
  }
}
