// Tests for ExternalContentEmbedder
// Covers batch embedding, session cache, clear cache, and query embedding.

import { ExternalContentEmbedder } from '../core/ExternalContentEmbedder';
import { ContentChunk } from '../core/ExternalContentChunker';
import { EmbeddingService } from '../embedding/EmbeddingService';

// Mock EmbeddingService
jest.mock('../embedding/EmbeddingService', () => ({
  EmbeddingService: jest.fn().mockImplementation(() => ({
    batchEmbeddings: jest.fn().mockResolvedValue([
      { embedding: [0.1, 0.2, 0.3, 0.4], dimensions: 4, model: 'test-model' },
      { embedding: [0.5, 0.6, 0.7, 0.8], dimensions: 4, model: 'test-model' },
    ]),
    generateEmbedding: jest.fn().mockResolvedValue({
      embedding: [0.9, 0.8, 0.7, 0.6],
      dimensions: 4,
      model: 'test-model',
    }),
  })),
}));

const MockEmbeddingService = EmbeddingService as jest.MockedClass<typeof EmbeddingService>;

describe('ExternalContentEmbedder', () => {
  let embedder: ExternalContentEmbedder;
  let mockService: jest.Mocked<EmbeddingService>;

  const sampleChunks: ContentChunk[] = [
    {
      id: 'abc-0',
      content: 'First chunk about authentication',
      sourceUrl: 'https://example.com/docs',
      headingPath: ['# API', '## Auth'],
      chunkIndex: 0,
      wordCount: 4,
    },
    {
      id: 'abc-1',
      content: 'Second chunk about endpoints',
      sourceUrl: 'https://example.com/docs',
      headingPath: ['# API', '## Endpoints'],
      chunkIndex: 1,
      wordCount: 4,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockService = new MockEmbeddingService() as jest.Mocked<EmbeddingService>;
    embedder = new ExternalContentEmbedder(mockService);
  });

  describe('embedChunks', () => {
    it('returns empty array for empty chunk list', async () => {
      const result = await embedder.embedChunks([]);
      expect(result).toEqual([]);
      expect(mockService.batchEmbeddings).not.toHaveBeenCalled();
    });

    it('embeds all chunks using batch API', async () => {
      const result = await embedder.embedChunks(sampleChunks);

      expect(mockService.batchEmbeddings).toHaveBeenCalledWith([
        'First chunk about authentication',
        'Second chunk about endpoints',
      ]);
      expect(result.length).toBe(2);
    });

    it('maps embeddings to chunks correctly', async () => {
      const result = await embedder.embedChunks(sampleChunks);

      expect(result[0].chunk).toBe(sampleChunks[0]);
      expect(result[0].embedding).toEqual([0.1, 0.2, 0.3, 0.4]);
      expect(result[1].chunk).toBe(sampleChunks[1]);
      expect(result[1].embedding).toEqual([0.5, 0.6, 0.7, 0.8]);
    });

    it('caches results by URL for same-source chunks', async () => {
      await embedder.embedChunks(sampleChunks);
      await embedder.embedChunks(sampleChunks);

      // Second call should use cache
      expect(mockService.batchEmbeddings).toHaveBeenCalledTimes(1);
    });

    it('does not cache across different URLs', async () => {
      const chunksB: ContentChunk[] = [
        {
          id: 'def-0',
          content: 'Different content',
          sourceUrl: 'https://different.com/docs',
          headingPath: ['# Other'],
          chunkIndex: 0,
          wordCount: 2,
        },
      ];

      await embedder.embedChunks(sampleChunks);
      await embedder.embedChunks(chunksB);

      // Different URL should trigger new embedding
      expect(mockService.batchEmbeddings).toHaveBeenCalledTimes(2);
    });

    it('uses fallback embedding when service returns undefined', async () => {
      (mockService.batchEmbeddings as jest.Mock).mockResolvedValue([
        { embedding: [0.1, 0.2], dimensions: 2, model: 'test' },
        undefined as unknown as import('../core/types').EmbeddingResponse,
      ]);

      const result = await embedder.embedChunks(sampleChunks);

      // Second chunk should have a fallback embedding
      expect(result[1].embedding).toBeDefined();
      expect(result[1].embedding.length).toBeGreaterThan(0);
    });
  });

  describe('embedQuery', () => {
    it('generates embedding for query string', async () => {
      const result = await embedder.embedQuery('How do I authenticate?');

      expect(mockService.generateEmbedding).toHaveBeenCalledWith('How do I authenticate?');
      expect(result).toEqual([0.9, 0.8, 0.7, 0.6]);
    });

    it('throws error for empty query', async () => {
      await expect(embedder.embedQuery('')).rejects.toThrow('Query string must not be empty');
      await expect(embedder.embedQuery('   ')).rejects.toThrow('Query string must not be empty');
    });
  });

  describe('clearCache', () => {
    it('clears session cache', async () => {
      await embedder.embedChunks(sampleChunks);
      expect(mockService.batchEmbeddings).toHaveBeenCalledTimes(1);

      embedder.clearCache();

      // After clear, same chunks should trigger new embedding
      await embedder.embedChunks(sampleChunks);
      expect(mockService.batchEmbeddings).toHaveBeenCalledTimes(2);
    });

    it('is safe to call on empty cache', () => {
      expect(() => embedder.clearCache()).not.toThrow();
    });
  });
});
