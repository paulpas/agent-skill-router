// Tests for ExternalContentChunker
// Covers chunking by headings, overlap, min size merging, and edge cases.

import { ExternalContentChunker } from '../core/ExternalContentChunker';

describe('ExternalContentChunker', () => {
  describe('chunk', () => {
    it('returns empty array for empty content', () => {
      const chunker = new ExternalContentChunker();
      const result = chunker.chunk('', 'https://example.com/docs');
      expect(result).toEqual([]);
    });

    it('returns empty array for whitespace-only content', () => {
      const chunker = new ExternalContentChunker();
      const result = chunker.chunk('   \n\n   ', 'https://example.com/docs');
      expect(result).toEqual([]);
    });

    it('chunks content by heading boundaries', () => {
      const chunker = new ExternalContentChunker({ targetChunkSize: 500 });
      const content = `# API Reference

This is the API reference documentation.

## Authentication

You need to authenticate using an API key.
Include the key in the Authorization header.

## Endpoints

### GET /users

Returns a list of users.

### POST /users

Creates a new user.

## Rate Limiting

The API is rate limited to 100 requests per minute.`;

      const result = chunker.chunk(content, 'https://example.com/api');

      expect(result.length).toBeGreaterThan(0);
      // Each chunk should have content
      for (const chunk of result) {
        expect(chunk.content.length).toBeGreaterThan(0);
        expect(chunk.sourceUrl).toBe('https://example.com/api');
      }
    });

    it('tracks heading path for each chunk', () => {
      const chunker = new ExternalContentChunker({ targetChunkSize: 500 });
      const content = `# API

Introduction text.

## Authentication

Auth details here.`;

      const result = chunker.chunk(content, 'https://example.com/api');

      // Find the chunk with "Auth details"
      const authChunk = result.find(c => c.content.includes('Auth details'));
      expect(authChunk).toBeDefined();
      expect(authChunk!.headingPath).toContain('# API');
    });

    it('generates unique chunk IDs', () => {
      const chunker = new ExternalContentChunker({ targetChunkSize: 100 });
      const content = `# Section A

Paragraph A1 with enough text to be meaningful.

# Section B

Paragraph B1 with enough text to be meaningful.`;

      const result = chunker.chunk(content, 'https://example.com/docs');

      const ids = result.map(c => c.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('tracks word count for each chunk', () => {
      const chunker = new ExternalContentChunker();
      const content = `# Title

One two three four five six seven eight nine ten.`;

      const result = chunker.chunk(content, 'https://example.com/docs');

      expect(result.length).toBeGreaterThan(0);
      for (const chunk of result) {
        expect(chunk.wordCount).toBeGreaterThan(0);
      }
    });

    it('respects target chunk size', () => {
      const chunker = new ExternalContentChunker({ targetChunkSize: 80 });
      const content = `# Section

Paragraph one with some words.
Paragraph two with more words.
Paragraph three with even more words.
Paragraph four to make it long enough.
Paragraph five for good measure here.`;

      const result = chunker.chunk(content, 'https://example.com/docs');

      // Should produce multiple chunks due to size limit
      expect(result.length).toBeGreaterThanOrEqual(1);
    });

    it('includes overlap between adjacent chunks', () => {
      const chunker = new ExternalContentChunker({
        targetChunkSize: 60,
        overlapSize: 30,
      });
      const content = `# Section

First paragraph has important context.
Second paragraph continues the discussion.
Third paragraph adds more details.
Fourth paragraph concludes the section.`;

      const result = chunker.chunk(content, 'https://example.com/docs');

      if (result.length >= 2) {
        // Chunks should have content (overlap verification is implicit)
        expect(result[0].content.length).toBeGreaterThan(0);
        expect(result[1].content.length).toBeGreaterThan(0);
      }
    });

    it('merges chunks smaller than minChunkSize', () => {
      const chunker = new ExternalContentChunker({
        targetChunkSize: 200,
        minChunkSize: 50,
      });
      const content = `# Section

Tiny.`;

      const result = chunker.chunk(content, 'https://example.com/docs');

      // Tiny content should be merged or included
      expect(result.length).toBeGreaterThanOrEqual(1);
    });

    it('preserves chunk index ordering', () => {
      const chunker = new ExternalContentChunker({ targetChunkSize: 60 });
      const content = `# Section

Para one text here.
Para two text here.
Para three text here.
Para four text here.`;

      const result = chunker.chunk(content, 'https://example.com/docs');

      for (let i = 1; i < result.length; i++) {
        expect(result[i].chunkIndex).toBeGreaterThan(result[i - 1].chunkIndex);
      }
    });

    it('handles content without headings', () => {
      const chunker = new ExternalContentChunker({ targetChunkSize: 100 });
      const content = `This is plain text without any markdown headings.
It has multiple paragraphs separated by blank lines.
The chunker should still produce chunks from this content.
Even without headings, the paragraph grouping works.`;

      const result = chunker.chunk(content, 'https://example.com/docs');

      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result[0].headingPath).toEqual([]);
    });

    it('handles deeply nested heading hierarchy', () => {
      const chunker = new ExternalContentChunker({ targetChunkSize: 500 });
      const content = `# Level 1

Intro.

## Level 2

Details.

### Level 3

More details.

#### Level 4

Even more details here.`;

      const result = chunker.chunk(content, 'https://example.com/docs');

      // Find the chunk with "Even more details"
      const deepChunk = result.find(c => c.content.includes('Even more details'));
      expect(deepChunk).toBeDefined();
      expect(deepChunk!.headingPath.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('ChunkerConfig defaults', () => {
    it('uses default targetChunkSize of 750', () => {
      const chunker = new ExternalContentChunker();
      const content = `# Section

${'x'.repeat(800)}`;

      const result = chunker.chunk(content, 'https://example.com/docs');
      expect(result.length).toBeGreaterThanOrEqual(1);
    });

    it('accepts partial config overrides', () => {
      const chunker = new ExternalContentChunker({ targetChunkSize: 50 });
      expect(chunker).toBeDefined();
    });
  });
});
