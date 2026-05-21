// Tests for MarkdownLinkResolver semantic resolution
// Covers cosine similarity, semantic chunk scoring, and resolution mode routing.

import fs from 'fs';
import { MarkdownLinkResolver, LinkResolverConfig } from '../core/MarkdownLinkResolver';
import { Logger } from '../observability/Logger';
import { EmbeddingService } from '../embedding/EmbeddingService';

// Mock dependencies
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
  },
}));

jest.mock('../observability/Logger', () => ({
  Logger: jest.fn().mockImplementation(() => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
}));

// Mock EmbeddingService
jest.mock('../embedding/EmbeddingService', () => ({
  EmbeddingService: jest.fn().mockImplementation(() => ({
    batchEmbeddings: jest.fn().mockImplementation((texts: string[]) =>
      Promise.resolve(
        texts.map((text, i) => {
          // Generate deterministic embeddings based on text content
          const base = text.includes('auth') ? 0.9 : text.includes('endpoint') ? 0.8 : 0.3;
          return {
            embedding: [base, 0.1 * (i + 1), 0.2, 0.3],
            dimensions: 4,
            model: 'test-model',
          };
        })
      )
    ),
    generateEmbedding: jest.fn().mockResolvedValue({
      embedding: [0.85, 0.15, 0.2, 0.3], // Query similar to "auth" chunks
      dimensions: 4,
      model: 'test-model',
    }),
  })),
}));

const mockFs = fs.promises as jest.Mocked<typeof fs.promises>;
const mockLogger = new Logger('test');
const MockEmbeddingService = EmbeddingService as jest.MockedClass<typeof EmbeddingService>;

describe('MarkdownLinkResolver - Semantic Resolution', () => {
  const baseConfig: LinkResolverConfig = {
    enabled: true,
    allowExternalLinks: true,
    maxDepth: 3,
    skillBasePath: '/skills',
    resolutionMode: 'inline',
    semanticTopK: 3,
    semanticSimilarityThreshold: 0.3,
  };

  let mockService: jest.Mocked<EmbeddingService>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFs.readFile.mockReset();
    mockService = new MockEmbeddingService() as jest.Mocked<EmbeddingService>;
  });

  // -------------------------------------------------------------------------
  // resolutionMode configuration
  // -------------------------------------------------------------------------
  describe('resolutionMode', () => {
    it('defaults to inline mode', () => {
      const config: LinkResolverConfig = {
        ...baseConfig,
        resolutionMode: undefined,
      };
      const resolver = new MarkdownLinkResolver(config, mockLogger);
      expect(resolver).toBeDefined();
    });

    it('accepts semantic mode', () => {
      const config: LinkResolverConfig = {
        ...baseConfig,
        resolutionMode: 'semantic',
      };
      const resolver = new MarkdownLinkResolver(config, mockLogger, mockService);
      expect(resolver).toBeDefined();
    });

    it('accepts compressed mode', () => {
      const config: LinkResolverConfig = {
        ...baseConfig,
        resolutionMode: 'compressed',
      };
      const resolver = new MarkdownLinkResolver(config, mockLogger);
      expect(resolver).toBeDefined();
    });
  });

  // -------------------------------------------------------------------------
  // Semantic resolution with embedder
  // -------------------------------------------------------------------------
  describe('semantic resolution', () => {
    it('falls back when no embedder is provided in semantic mode', async () => {
      const config: LinkResolverConfig = {
        ...baseConfig,
        resolutionMode: 'semantic',
        maxExternalSizeKb: 1, // Force over threshold
      };
      // No embedder passed
      const resolver = new MarkdownLinkResolver(config, mockLogger);

      const content = 'See [API](https://example.com/api)';
      const htmlResponse = '<html><body><h1>API</h1><p>Auth details</p><p>Endpoints here</p></body></html>';

      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        headers: { get: jest.fn().mockReturnValue('200') },
        text: jest.fn().mockResolvedValue(htmlResponse),
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).fetch = mockFetch;

      const result = await resolver.resolveLinks(content, '/skills/test/SKILL.md', 0);

      // Should fall back to compressed/truncated since no embedder
      expect(result).toContain('Reference: External: https://example.com/api');
    });

    it('uses semantic resolution when mode is semantic and embedder available', async () => {
      const config: LinkResolverConfig = {
        ...baseConfig,
        resolutionMode: 'semantic',
        maxExternalSizeKb: 1, // Force over threshold
        semanticTopK: 2,
        semanticSimilarityThreshold: 0.1,
      };
      const resolver = new MarkdownLinkResolver(config, mockLogger, mockService);

      const content = 'See [API](https://example.com/api)';
      // Large content to trigger semantic path
      const htmlResponse = `<html><body>
        <h1>API Reference</h1>
        <p>Authentication is required for all API calls.</p>
        <h2>Authentication</h2>
        <p>Use Bearer tokens in the Authorization header.</p>
        <h2>Endpoints</h2>
        <p>GET /users returns user list.</p>
        <p>POST /users creates a new user.</p>
        ${'<p>Extra padding content. '.repeat(200)}</p>
      </body></html>`;

      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        headers: { get: jest.fn().mockReturnValue('5000') },
        text: jest.fn().mockResolvedValue(htmlResponse),
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).fetch = mockFetch;

      const result = await resolver.resolveLinks(content, '/skills/test/SKILL.md', 0);

      // Should contain semantic reference
      expect(result).toContain('Reference: External: https://example.com/api');
      // Should have used batch embeddings
      expect(mockService.batchEmbeddings).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Inline mode (default) — unchanged behavior
  // -------------------------------------------------------------------------
  describe('inline mode (default)', () => {
    it('inlines small external content without semantic processing', async () => {
      const config: LinkResolverConfig = {
        ...baseConfig,
        resolutionMode: 'inline',
      };
      const resolver = new MarkdownLinkResolver(config, mockLogger, mockService);

      const content = 'See [API](https://example.com/api)';
      const htmlResponse = '<html><body><p>Small content</p></body></html>';

      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        headers: { get: jest.fn().mockReturnValue('100') },
        text: jest.fn().mockResolvedValue(htmlResponse),
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).fetch = mockFetch;

      const result = await resolver.resolveLinks(content, '/skills/test/SKILL.md', 0);

      expect(result).toContain('Reference: External: https://example.com/api');
      expect(result).toContain('Small content');
      // Should NOT call embedding in inline mode
      expect(mockService.batchEmbeddings).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Compressed mode — unchanged behavior
  // -------------------------------------------------------------------------
  describe('compressed mode', () => {
    it('compresses large content without semantic processing', async () => {
      const config: LinkResolverConfig = {
        ...baseConfig,
        resolutionMode: 'compressed',
        maxExternalSizeKb: 1,
      };
      const resolver = new MarkdownLinkResolver(config, mockLogger, mockService);

      const content = 'See [API](https://example.com/api)';
      const htmlResponse = `<html><body>${'<p>Large content. '.repeat(500)}</p></body></html>`;

      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        headers: { get: jest.fn().mockReturnValue('5000') },
        text: jest.fn().mockResolvedValue(htmlResponse),
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).fetch = mockFetch;

      const result = await resolver.resolveLinks(content, '/skills/test/SKILL.md', 0);

      expect(result).toContain('Reference: External: https://example.com/api');
      // Should NOT call embedding in compressed mode
      expect(mockService.batchEmbeddings).not.toHaveBeenCalled();
    });
  });
});
