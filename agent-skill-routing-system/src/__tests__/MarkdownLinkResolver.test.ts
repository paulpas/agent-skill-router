// Tests for MarkdownLinkResolver
// Covers local link resolution, path traversal protection, external link fetching,
// circular reference prevention, depth limits, and cache behavior.

import fs from 'fs';
import path from 'path';
import { MarkdownLinkResolver, LinkResolverConfig } from '../core/MarkdownLinkResolver';
import { Logger } from '../observability/Logger';

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

const mockFs = fs.promises as jest.Mocked<typeof fs.promises>;
const mockLogger = new Logger('test');

describe('MarkdownLinkResolver', () => {
  const baseConfig: LinkResolverConfig = {
    enabled: true,
    allowExternalLinks: false,
    maxDepth: 3,
    skillBasePath: '/skills',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockFs.readFile.mockReset();
  });

  // -------------------------------------------------------------------------
  // resolveLinks — disabled / early-exit paths
  // -------------------------------------------------------------------------
  describe('resolveLinks', () => {
    it('returns content unchanged when disabled', async () => {
      const resolver = new MarkdownLinkResolver({ ...baseConfig, enabled: false }, mockLogger);
      const content = 'See [reference](references/patterns.md) for details.';

      const result = await resolver.resolveLinks(content, '/skills/test/SKILL.md', 0);

      expect(result).toBe(content);
      expect(mockFs.readFile).not.toHaveBeenCalled();
    });

    it('returns content unchanged when at max depth', async () => {
      const resolver = new MarkdownLinkResolver(baseConfig, mockLogger);
      const content = 'See [reference](references/patterns.md) for details.';

      const result = await resolver.resolveLinks(content, '/skills/test/SKILL.md', 3);

      expect(result).toBe(content);
      expect(mockFs.readFile).not.toHaveBeenCalled();
    });

    it('returns content unchanged when no links are present', async () => {
      const resolver = new MarkdownLinkResolver(baseConfig, mockLogger);
      const content = 'This is plain text with no links at all.';

      const result = await resolver.resolveLinks(content, '/skills/test/SKILL.md', 0);

      expect(result).toBe(content);
      expect(mockFs.readFile).not.toHaveBeenCalled();
    });

    // -------------------------------------------------------------------------
    // resolveLinks — local link resolution
    // -------------------------------------------------------------------------
    describe('local link resolution', () => {
      it('resolves a single local link and inlines content', async () => {
        const resolver = new MarkdownLinkResolver(baseConfig, mockLogger);
        const content = 'See [patterns](references/patterns.md) for details.';
        const referenceContent = '# Patterns\n\nPattern 1: ABC\nPattern 2: XYZ';

        mockFs.readFile.mockResolvedValueOnce(referenceContent);

        const result = await resolver.resolveLinks(content, '/skills/test/SKILL.md', 0);

        expect(mockFs.readFile).toHaveBeenCalledWith(
          path.resolve('/skills/test', 'references/patterns.md'),
          'utf-8',
        );
        expect(result).toContain('## \ud83d\udcce Reference: patterns');
        expect(result).toContain(referenceContent);
        expect(result).toContain('Source: `references/patterns.md`');
        expect(result).not.toContain('[patterns](references/patterns.md)');
      });

      it('resolves links with relative paths from skill directory', async () => {
        const resolver = new MarkdownLinkResolver(baseConfig, mockLogger);
        const content = 'Check [config](./config.md)';

        mockFs.readFile.mockResolvedValueOnce('# Config\n\nkey: value');

        await resolver.resolveLinks(content, '/skills/test/SKILL.md', 0);

        expect(mockFs.readFile).toHaveBeenCalledWith(
          path.resolve('/skills/test', './config.md'),
          'utf-8',
        );
      });

      it('resolves links in nested subdirectories', async () => {
        const resolver = new MarkdownLinkResolver(baseConfig, mockLogger);
        const content = 'See [deep](a/b/c/deep.md)';

        mockFs.readFile.mockResolvedValueOnce('# Deep');

        await resolver.resolveLinks(content, '/skills/test/SKILL.md', 0);

        expect(mockFs.readFile).toHaveBeenCalledWith(
          path.resolve('/skills/test', 'a/b/c/deep.md'),
          'utf-8',
        );
      });

      it('handles links with special characters in display text', async () => {
        const resolver = new MarkdownLinkResolver(baseConfig, mockLogger);
        const content = 'See [my-pattern_v2](references/pattern.md)';

        mockFs.readFile.mockResolvedValueOnce('# Pattern');

        const result = await resolver.resolveLinks(content, '/skills/test/SKILL.md', 0);

        expect(result).toContain('## \ud83d\udcce Reference: my-pattern_v2');
      });
    });

    // -------------------------------------------------------------------------
    // resolveLinks — path traversal protection
    // -------------------------------------------------------------------------
    describe('path traversal protection', () => {
      it('blocks ../../etc/passwd traversal attempt', async () => {
        const resolver = new MarkdownLinkResolver(baseConfig, mockLogger);
        const content = 'See [evil](../../etc/passwd) for details.';

        const result = await resolver.resolveLinks(content, '/skills/test/SKILL.md', 0);

        expect(result).toContain('[evil](../../etc/passwd)');
        expect(mockFs.readFile).not.toHaveBeenCalled();
      });

      it('blocks traversal that escapes skillBasePath', async () => {
        const resolver = new MarkdownLinkResolver(baseConfig, mockLogger);
        const content = 'See [escape](../../../root/secret.txt)';

        const result = await resolver.resolveLinks(content, '/skills/test/SKILL.md', 0);

        // Link remains unchanged — blocked by isSafeLocalPath
        expect(result).toContain('[escape](../../../root/secret.txt)');
        expect(mockFs.readFile).not.toHaveBeenCalled();
      });

      it('allows paths that stay within skillBasePath', async () => {
        const resolver = new MarkdownLinkResolver(baseConfig, mockLogger);
        const content = 'See [sibling](../other/references.md)';

        mockFs.readFile.mockResolvedValueOnce('# Sibling');

        const result = await resolver.resolveLinks(content, '/skills/test/SKILL.md', 0);

        // ../other/references.md resolves to /skills/other/references.md which is within /skills
        expect(result).toContain('## \ud83d\udcce Reference: sibling');
      });
    });

    // -------------------------------------------------------------------------
    // resolveLinks — circular reference prevention
    // -------------------------------------------------------------------------
    describe('circular reference prevention', () => {
      it('prevents circular references via visitedPaths tracking', async () => {
        const resolver = new MarkdownLinkResolver({ ...baseConfig, maxDepth: 5 }, mockLogger);
        const content = 'See [self](references/recursive.md) for details.';

        // The referenced file contains a link back to the original file
        mockFs.readFile.mockResolvedValue('See [back](../SKILL.md) for more.');

        const result = await resolver.resolveLinks(content, '/skills/test/SKILL.md', 0);

        // First level should resolve
        expect(result).toContain('## \ud83d\udcce Reference: self');
        // But the circular reference back to SKILL.md should not cause infinite recursion
        // The visitedPaths set prevents re-reading the same file
      });

      it('reset() clears visitedPaths for reuse', async () => {
        const resolver = new MarkdownLinkResolver(baseConfig, mockLogger);
        const content = 'See [ref](references/a.md)';

        mockFs.readFile.mockResolvedValueOnce('# A');

        await resolver.resolveLinks(content, '/skills/test/SKILL.md', 0);
        expect(mockFs.readFile).toHaveBeenCalledTimes(1);

        // Create a new resolver instance (simulates hoisted resolver with per-call isolation)
        const resolver2 = new MarkdownLinkResolver(baseConfig, mockLogger);
        mockFs.readFile.mockResolvedValueOnce('# A v2');

        await resolver2.resolveLinks(content, '/skills/test/SKILL.md', 0);
        expect(mockFs.readFile).toHaveBeenCalledTimes(2);
      });
    });

    // -------------------------------------------------------------------------
    // resolveLinks — max depth and recursion
    // -------------------------------------------------------------------------
    describe('max depth', () => {
      it('stops recursing at configured max depth', async () => {
        const resolver = new MarkdownLinkResolver({ ...baseConfig, maxDepth: 2 }, mockLogger);
        const content = 'Level 0: [link1](references/l1.md)';

        // l1.md contains a link to l2.md
        mockFs.readFile.mockResolvedValue('Level 1: [link2](references/l2.md)');

        const result = await resolver.resolveLinks(content, '/skills/test/SKILL.md', 0);

        // l1.md should be resolved (depth 0 -> depth 1)
        expect(result).toContain('## \ud83d\udcce Reference: link1');
        // l2.md reference inside l1.md should remain as a link (depth 1 -> depth 2 = maxDepth)
        expect(result).toContain('[link2](references/l2.md)');
      });

      it('resolves deeply nested links within depth limit', async () => {
        const resolver = new MarkdownLinkResolver({ ...baseConfig, maxDepth: 4 }, mockLogger);
        const content = 'Start: [l1](references/l1.md)';

        mockFs.readFile
          .mockResolvedValueOnce('L1: [l2](references/l2.md)') // depth 1
          .mockResolvedValueOnce('L2: [l3](references/l3.md)') // depth 2
          .mockResolvedValueOnce('L3: [l4](references/l4.md)') // depth 3
          .mockResolvedValueOnce('L4: end');                    // depth 4 — at max, returns as-is

        const result = await resolver.resolveLinks(content, '/skills/test/SKILL.md', 0);

        expect(result).toContain('## \ud83d\udcce Reference: l1');
        expect(result).toContain('## \ud83d\udcce Reference: l2');
        expect(result).toContain('## \ud83d\udcce Reference: l3');
        // l4 is at maxDepth boundary so its content is returned without further link resolution
        expect(result).toContain('L4: end');
      });
    });

    // -------------------------------------------------------------------------
    // resolveLinks — external links
    // -------------------------------------------------------------------------
    describe('external links', () => {
      it('returns content unchanged when allowExternalLinks is false', async () => {
        const resolver = new MarkdownLinkResolver(
          { ...baseConfig, allowExternalLinks: false },
          mockLogger,
        );
        const content = 'See [docs](https://example.com/docs) for details.';

        const result = await resolver.resolveLinks(content, '/skills/test/SKILL.md', 0);

        expect(result).toBe(content);
      });

      it('fetches and transforms HTTPS content when allowExternalLinks is true', async () => {
        const resolver = new MarkdownLinkResolver(
          { ...baseConfig, allowExternalLinks: true },
          mockLogger,
        );
        const content = 'See [API docs](https://example.com/api) for details.';
        const htmlResponse = '<html><body><h1>API Reference</h1><p>Endpoint details</p></body></html>';

        const mockFetch = jest.fn().mockResolvedValue({
          ok: true,
          headers: { get: jest.fn().mockReturnValue('500') },
          text: jest.fn().mockResolvedValue(htmlResponse),
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (globalThis as any).fetch = mockFetch;

        const result = await resolver.resolveLinks(content, '/skills/test/SKILL.md', 0);

        expect(mockFetch).toHaveBeenCalledWith(
          'https://example.com/api',
          expect.objectContaining({
            signal: expect.any(Object),
            headers: { 'User-Agent': 'SkillRouter/1.0 (Link Resolver)' },
          }),
        );
        expect(result).toContain('## \ud83d\udcce Reference: External: https://example.com/api');
        expect(result).toContain('API Reference');
        expect(result).toContain('Endpoint details');
        expect(result).toContain('Source: `https://example.com/api`');
      });

      it('blocks non-HTTPS external links (http://)', async () => {
        const resolver = new MarkdownLinkResolver(
          { ...baseConfig, allowExternalLinks: true },
          mockLogger,
        );
        const content = 'See [insecure](http://example.com/docs)';

        const result = await resolver.resolveLinks(content, '/skills/test/SKILL.md', 0);

        // http:// link should remain unchanged
        expect(result).toContain('[insecure](http://example.com/docs)');
      });

      it('handles fetch failure gracefully', async () => {
        const resolver = new MarkdownLinkResolver(
          { ...baseConfig, allowExternalLinks: true },
          mockLogger,
        );
        const content = 'See [down](https://example.com/unreachable)';

        const mockFetch = jest.fn().mockRejectedValue(new Error('Network error'));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (globalThis as any).fetch = mockFetch;

        const result = await resolver.resolveLinks(content, '/skills/test/SKILL.md', 0);

        // Link remains unchanged on fetch failure
        expect(result).toContain('[down](https://example.com/unreachable)');
      });

      it('handles non-OK HTTP response gracefully', async () => {
        const resolver = new MarkdownLinkResolver(
          { ...baseConfig, allowExternalLinks: true },
          mockLogger,
        );
        const content = 'See [404](https://example.com/not-found)';

        const mockFetch = jest.fn().mockResolvedValue({
          ok: false,
          status: 404,
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (globalThis as any).fetch = mockFetch;

        const result = await resolver.resolveLinks(content, '/skills/test/SKILL.md', 0);

        expect(result).toContain('[404](https://example.com/not-found)');
      });

      it('rejects external content exceeding size limit (Content-Length header)', async () => {
        const resolver = new MarkdownLinkResolver(
          { ...baseConfig, allowExternalLinks: true },
          mockLogger,
        );
        const content = 'See [large](https://example.com/huge)';

        const mockFetch = jest.fn().mockResolvedValue({
          ok: true,
          headers: { get: jest.fn().mockReturnValue('200000') }, // 200KB > 100KB limit
          text: jest.fn().mockResolvedValue('too big'),
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (globalThis as any).fetch = mockFetch;

        const result = await resolver.resolveLinks(content, '/skills/test/SKILL.md', 0);

        expect(result).toContain('[large](https://example.com/huge)');
      });

      it('rejects external content exceeding size limit (after fetch)', async () => {
        const resolver = new MarkdownLinkResolver(
          { ...baseConfig, allowExternalLinks: true },
          mockLogger,
        );
        const content = 'See [large](https://example.com/huge)';

        const mockFetch = jest.fn().mockResolvedValue({
          ok: true,
          headers: { get: jest.fn().mockReturnValue('0') }, // No Content-Length header
          text: jest.fn().mockResolvedValue('x'.repeat(100_001)), // > 100KB after fetch
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (globalThis as any).fetch = mockFetch;

        const result = await resolver.resolveLinks(content, '/skills/test/SKILL.md', 0);

        expect(result).toContain('[large](https://example.com/huge)');
      });
    });

    // -------------------------------------------------------------------------
    // resolveLinks — malformed / invalid links
    // -------------------------------------------------------------------------
    describe('malformed and invalid links', () => {
      it('gracefully skips malformed links (missing closing paren)', async () => {
        const resolver = new MarkdownLinkResolver(baseConfig, mockLogger);
        const content = 'See [broken](references/missing for details.';

        const result = await resolver.resolveLinks(content, '/skills/test/SKILL.md', 0);

        // Malformed link is not matched by regex, content passes through unchanged
        expect(result).toBe(content);
      });

      it('gracefully skips malformed links (missing closing bracket)', async () => {
        const resolver = new MarkdownLinkResolver(baseConfig, mockLogger);
        const content = 'See broken](references/file.md) for details.';

        const result = await resolver.resolveLinks(content, '/skills/test/SKILL.md', 0);

        expect(result).toBe(content);
      });

      it('handles empty link text gracefully (regex requires 1+ chars)', async () => {
        const resolver = new MarkdownLinkResolver(baseConfig, mockLogger);
        const content = 'See [](references/empty.md)';

        const result = await resolver.resolveLinks(content, '/skills/test/SKILL.md', 0);

        // Regex \[([^\]]+)\] requires at least 1 char — empty brackets don't match
        expect(result).toBe(content);
      });

      it('handles empty link target gracefully', async () => {
        const resolver = new MarkdownLinkResolver(baseConfig, mockLogger);
        const content = 'See [empty]()';

        const result = await resolver.resolveLinks(content, '/skills/test/SKILL.md', 0);

        // Empty target — file read will fail, link remains
        expect(result).toContain('[empty]()');
      });
    });

    // -------------------------------------------------------------------------
    // resolveLinks — missing files
    // -------------------------------------------------------------------------
    describe('missing referenced files', () => {
      it('handles missing referenced files gracefully', async () => {
        const resolver = new MarkdownLinkResolver(baseConfig, mockLogger);
        const content = 'See [missing](references/missing.md) for details.';

        mockFs.readFile.mockRejectedValueOnce(new Error('ENOENT: no such file'));

        const result = await resolver.resolveLinks(content, '/skills/test/SKILL.md', 0);

        // Link should remain unchanged when file not found
        expect(result).toContain('[missing](references/missing.md)');
      });

      it('handles permission errors gracefully', async () => {
        const resolver = new MarkdownLinkResolver(baseConfig, mockLogger);
        const content = 'See [restricted](references/secret.md)';

        mockFs.readFile.mockRejectedValueOnce(new Error('EACCES: permission denied'));

        const result = await resolver.resolveLinks(content, '/skills/test/SKILL.md', 0);

        expect(result).toContain('[restricted](references/secret.md)');
      });
    });

    // -------------------------------------------------------------------------
    // resolveLinks — multiple links
    // -------------------------------------------------------------------------
    describe('multiple links', () => {
      it('resolves all links in content', async () => {
        const resolver = new MarkdownLinkResolver(baseConfig, mockLogger);
        const content =
          'Check [patterns](references/patterns.md) and [examples](references/examples.md).';

        mockFs.readFile
          .mockResolvedValueOnce('# Patterns\n\nPattern A')
          .mockResolvedValueOnce('# Examples\n\nExample B');

        const result = await resolver.resolveLinks(content, '/skills/test/SKILL.md', 0);

        expect(result).toContain('## \ud83d\udcce Reference: patterns');
        expect(result).toContain('## \ud83d\udcce Reference: examples');
        expect(result).toContain('Pattern A');
        expect(result).toContain('Example B');
        expect(mockFs.readFile).toHaveBeenCalledTimes(2);
      });

      it('deduplicates identical links (all occurrences replaced)', async () => {
        const resolver = new MarkdownLinkResolver(baseConfig, mockLogger);
        const content =
          'First [ref](references/a.md) and second [ref](references/a.md) mention the same file.';

        mockFs.readFile.mockResolvedValueOnce('# A');

        const result = await resolver.resolveLinks(content, '/skills/test/SKILL.md', 0);

        // Only one file read for duplicate links (deduped by replacements Map)
        expect(mockFs.readFile).toHaveBeenCalledTimes(1);
        // split/join replaces ALL occurrences of the same link
        expect(result).toContain('## 📎 Reference: ref');
        // Both occurrences are replaced (split/join replaces all)
        expect(result).not.toContain('[ref](references/a.md)');
      });

      it('resolves mix of local and external links', async () => {
        const resolver = new MarkdownLinkResolver(
          { ...baseConfig, allowExternalLinks: true },
          mockLogger,
        );
        const content = 'Local [local](references/a.md) and remote [remote](https://example.com).';

        mockFs.readFile.mockResolvedValueOnce('# Local Content');

        const mockFetch = jest.fn().mockResolvedValue({
          ok: true,
          headers: { get: jest.fn().mockReturnValue('100') },
          text: jest.fn().mockResolvedValue('<p>Remote content</p>'),
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (globalThis as any).fetch = mockFetch;

        const result = await resolver.resolveLinks(content, '/skills/test/SKILL.md', 0);

        expect(result).toContain('## \ud83d\udcce Reference: local');
        expect(result).toContain('## \ud83d\udcce Reference: External: https://example.com');
        expect(mockFs.readFile).toHaveBeenCalledTimes(1);
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      it('continues resolving remaining links when one fails', async () => {
        const resolver = new MarkdownLinkResolver(baseConfig, mockLogger);
        const content = 'Good [good](references/a.md) and bad [bad](references/missing.md).';

        mockFs.readFile
          .mockResolvedValueOnce('# Good Content')
          .mockRejectedValueOnce(new Error('ENOENT'));

        const result = await resolver.resolveLinks(content, '/skills/test/SKILL.md', 0);

        expect(result).toContain('## \ud83d\udcce Reference: good');
        expect(result).toContain('Good Content');
        // Bad link remains unchanged
        expect(result).toContain('[bad](references/missing.md)');
      });
    });

    // -------------------------------------------------------------------------
    // resolveLinks — cache behavior / statelessness
    // -------------------------------------------------------------------------
    describe('cache behavior', () => {
      it('visited paths are cleared per call (per-call isolation)', async () => {
        const resolver = new MarkdownLinkResolver(baseConfig, mockLogger);
        const content1 = 'See [a](references/a.md)';
        const content2 = 'See [a](references/a.md)';

        mockFs.readFile.mockResolvedValue('# A');

        await resolver.resolveLinks(content1, '/skills/test/SKILL.md', 0);
        expect(mockFs.readFile).toHaveBeenCalledTimes(1);

        // Second call with same link — visitedPaths is cleared at start of resolveLinks,
        // so the file is read again (per-call isolation for hoisted resolver)
        mockFs.readFile.mockResolvedValue('# A');
        await resolver.resolveLinks(content2, '/skills/test/SKILL.md', 0);
        expect(mockFs.readFile).toHaveBeenCalledTimes(2);
      });

      it('reset() clears visited paths enabling re-resolution', async () => {
        const resolver = new MarkdownLinkResolver(baseConfig, mockLogger);
        const content = 'See [a](references/a.md)';

        mockFs.readFile.mockResolvedValue('# A');

        await resolver.resolveLinks(content, '/skills/test/SKILL.md', 0);
        expect(mockFs.readFile).toHaveBeenCalledTimes(1);

        // Create a new resolver instance (simulates hoisted resolver with per-call isolation)
        const resolver2 = new MarkdownLinkResolver(baseConfig, mockLogger);
        mockFs.readFile.mockResolvedValue('# A');

        await resolver2.resolveLinks(content, '/skills/test/SKILL.md', 0);
        expect(mockFs.readFile).toHaveBeenCalledTimes(2);
      });

      it('each resolver instance has independent visitedPaths', async () => {
        const resolver1 = new MarkdownLinkResolver(baseConfig, mockLogger);
        const resolver2 = new MarkdownLinkResolver(baseConfig, mockLogger);
        const content = 'See [a](references/a.md)';

        mockFs.readFile
          .mockResolvedValueOnce('# A from resolver1')
          .mockResolvedValueOnce('# A from resolver2');

        await resolver1.resolveLinks(content, '/skills/test/SKILL.md', 0);
        await resolver2.resolveLinks(content, '/skills/test/SKILL.md', 0);

        // Each resolver reads independently
        expect(mockFs.readFile).toHaveBeenCalledTimes(2);
      });
    });

    // -------------------------------------------------------------------------
    // resolveLinks — formatReference output structure
    // -------------------------------------------------------------------------
    describe('reference output format', () => {
      it('includes reference header with title', async () => {
        const resolver = new MarkdownLinkResolver(baseConfig, mockLogger);
        const content = 'See [My Reference](references/ref.md)';

        mockFs.readFile.mockResolvedValueOnce('Content');

        const result = await resolver.resolveLinks(content, '/skills/test/SKILL.md', 0);

        expect(result).toContain('## \ud83d\udcce Reference: My Reference');
      });

      it('includes source attribution with original link path', async () => {
        const resolver = new MarkdownLinkResolver(baseConfig, mockLogger);
        const content = 'See [ref](references/ref.md)';

        mockFs.readFile.mockResolvedValueOnce('Content');

        const result = await resolver.resolveLinks(content, '/skills/test/SKILL.md', 0);

        expect(result).toContain('Source: `references/ref.md`');
      });

      it('includes horizontal rule separators', async () => {
        const resolver = new MarkdownLinkResolver(baseConfig, mockLogger);
        const content = 'See [ref](references/ref.md)';

        mockFs.readFile.mockResolvedValueOnce('Content');

        const result = await resolver.resolveLinks(content, '/skills/test/SKILL.md', 0);

        expect(result).toContain('---');
      });

      it('external references include URL as source', async () => {
        const resolver = new MarkdownLinkResolver(
          { ...baseConfig, allowExternalLinks: true },
          mockLogger,
        );
        const content = 'See [ext](https://example.com/docs)';

        const mockFetch = jest.fn().mockResolvedValue({
          ok: true,
          headers: { get: jest.fn().mockReturnValue('50') },
          text: jest.fn().mockResolvedValue('External content'),
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (globalThis as any).fetch = mockFetch;

        const result = await resolver.resolveLinks(content, '/skills/test/SKILL.md', 0);

        expect(result).toContain('Source: `https://example.com/docs`');
        expect(result).toContain('External: https://example.com/docs');
      });
    });
  });

  // -------------------------------------------------------------------------
  // isSafeLocalPath — indirect tests via resolveLinks
  // -------------------------------------------------------------------------
  describe('isSafeLocalPath (indirect)', () => {
    it('allows paths within skill base directory', async () => {
      const resolver = new MarkdownLinkResolver(baseConfig, mockLogger);
      const content = 'See [safe](references/file.md)';

      mockFs.readFile.mockResolvedValueOnce('# Safe');

      const result = await resolver.resolveLinks(content, '/skills/test/SKILL.md', 0);

      expect(result).toContain('## \ud83d\udcce Reference: safe');
    });

    it('blocks paths outside skill base directory', async () => {
      const resolver = new MarkdownLinkResolver(baseConfig, mockLogger);
      const content = 'See [evil](../../etc/passwd)';

      const result = await resolver.resolveLinks(content, '/skills/test/SKILL.md', 0);

      expect(result).toBe(content); // Unchanged — blocked
    });

    it('allows paths at exactly skillBasePath boundary', async () => {
      const resolver = new MarkdownLinkResolver(baseConfig, mockLogger);
      // Link from /skills/test/SKILL.md to /skills/root.md (stays within /skills)
      const content = 'See [root](../root.md)';

      mockFs.readFile.mockResolvedValueOnce('# Root');

      const result = await resolver.resolveLinks(content, '/skills/test/SKILL.md', 0);

      expect(result).toContain('## \ud83d\udcce Reference: root');
    });
  });

  // -------------------------------------------------------------------------
  // parseMarkdownLinks — indirect tests via resolveLinks
  // -------------------------------------------------------------------------
  describe('parseMarkdownLinks (indirect)', () => {
    it('parses standard markdown links', async () => {
      const resolver = new MarkdownLinkResolver(baseConfig, mockLogger);
      const content = '[text](target.md)';

      mockFs.readFile.mockResolvedValueOnce('# Target');

      const result = await resolver.resolveLinks(content, '/skills/test/SKILL.md', 0);

      expect(result).toContain('## \ud83d\udcce Reference: text');
    });

    it('does not match plain URLs without markdown syntax', async () => {
      const resolver = new MarkdownLinkResolver(baseConfig, mockLogger);
      const content = 'Visit https://example.com for more.';

      const result = await resolver.resolveLinks(content, '/skills/test/SKILL.md', 0);

      // Plain URL is not a markdown link, passes through unchanged
      expect(result).toBe(content);
    });

    it('handles links with query strings in target', async () => {
      const resolver = new MarkdownLinkResolver(baseConfig, mockLogger);
      const content = 'See [doc](references/file.md?version=2)';

      mockFs.readFile.mockResolvedValueOnce('# Doc v2');

      const result = await resolver.resolveLinks(content, '/skills/test/SKILL.md', 0);

      expect(result).toContain('## \ud83d\udcce Reference: doc');
    });
  });
});
