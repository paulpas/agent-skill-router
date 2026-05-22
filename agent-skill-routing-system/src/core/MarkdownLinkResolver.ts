// Markdown Link Resolver
// Parses and resolves markdown links in skill content, inlining referenced documents
// Follows the 5 Laws of Elegant Defense for clean, safe implementation

import fs from 'fs';
import path from 'path';
import { Logger } from '../observability/Logger';
import { ExternalContentChunker } from './ExternalContentChunker';
import { ExternalContentEmbedder, EmbeddingResult } from './ExternalContentEmbedder';
import { EmbeddingService } from '../embedding/EmbeddingService';

export interface LinkResolverConfig {
  enabled: boolean;
  allowExternalLinks: boolean;
  maxDepth: number;
  skillBasePath: string;
  maxExternalSizeKb?: number;        // default 10 - threshold before compression
  compressionMode?: 'brief' | 'moderate' | 'skip';  // default 'brief'
  jsRenderingEnabled?: boolean;      // default false
  jsRenderTimeoutMs?: number;        // default 5000
  jsRenderFallback?: boolean;        // default true
  resolutionMode?: 'inline' | 'semantic' | 'compressed';  // default 'inline'
  semanticTopK?: number;             // default 3
  semanticSimilarityThreshold?: number;  // default 0.3
}

interface ParsedLink {
  fullMatch: string;
  text: string;
  target: string;
  isExternal: boolean;
}

/**
 * Resolves markdown links in skill content by inlining referenced documents.
 * Supports local file references and optional external URL fetching.
 */
export class MarkdownLinkResolver {
  private config: LinkResolverConfig;
  private logger: Logger;
  private visitedPaths: Set<string> = new Set(); // Prevent circular references
  private chunker: ExternalContentChunker;
  private embedder: ExternalContentEmbedder | null;

  constructor(config: LinkResolverConfig, logger: Logger, embeddingService?: EmbeddingService) {
    this.config = config;
    this.logger = logger;
    this.chunker = new ExternalContentChunker();
    this.embedder = embeddingService ? new ExternalContentEmbedder(embeddingService) : null;
  }

  /**
   * Resolve all markdown links in content by inlining referenced documents.
   * Returns content with links replaced by reference sections.
   */
  async resolveLinks(content: string, skillFilePath: string, depth: number = 0): Promise<string> {
    // Law 1: Early Exit - disabled or max depth
    if (!this.config.enabled || depth >= this.config.maxDepth) {
      return content;
    }

    // Clear visited paths for per-call isolation (resolver is hoisted on SkillRegistry)
    this.visitedPaths.clear();

    // Law 2: Parse at boundary - extract all links upfront
    const links = this.parseMarkdownLinks(content);
    if (links.length === 0) {
      return content;
    }

    // Resolve each link and build replacement map
    const replacements = new Map<string, string>();
    
    for (const link of links) {
      if (replacements.has(link.fullMatch)) continue; // Skip duplicates
      
      const resolved = await this.resolveSingleLink(link, skillFilePath, depth);
      if (resolved !== null) {
        replacements.set(link.fullMatch, resolved);
      }
    }

    // Apply all replacements
    return this.applyReplacements(content, replacements);
  }

  /**
   * Parse all markdown links from content.
   * Handles both [text](path) and [text](url) formats.
   */
  private parseMarkdownLinks(content: string): ParsedLink[] {
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const links: ParsedLink[] = [];
    let match;

    while ((match = linkRegex.exec(content)) !== null) {
      const [fullMatch, text, target] = match;
      const isExternal = target.startsWith('http://') || target.startsWith('https://');
      
      links.push({ fullMatch, text, target, isExternal });
    }

    return links;
  }

  /**
   * Resolve a single markdown link to its content.
   * Returns formatted reference section or null if resolution fails.
   */
  private async resolveSingleLink(
    link: ParsedLink, 
    skillFilePath: string, 
    depth: number
  ): Promise<string | null> {
    if (link.isExternal) {
      return this.config.allowExternalLinks 
        ? this.fetchExternalContent(link.target, depth)
        : null;
    }

    return this.resolveLocalLink(link, skillFilePath, depth);
  }

  /**
   * Resolve a local file link with path safety checks.
   */
  private async resolveLocalLink(
    link: ParsedLink,
    skillFilePath: string,
    depth: number
  ): Promise<string | null> {
    // Law 4: Fail Fast - resolve and validate path immediately
    const skillDir = path.dirname(skillFilePath);
    let resolvedPath: string;

    try {
      // Handle relative paths from skill's directory
      resolvedPath = path.resolve(skillDir, link.target);
    } catch {
      this.logger.warn('Failed to resolve link path', { 
        target: link.target, 
        skillFile: skillFilePath 
      });
      return null;
    }

    // Law 1: Guard clause - path traversal protection
    if (!this.isSafeLocalPath(resolvedPath)) {
      this.logger.warn('Blocked unsafe link path (path traversal attempt)', { 
        target: link.target,
        resolvedPath 
      });
      return null;
    }

    // Law 1: Guard clause - circular reference detection
    if (this.visitedPaths.has(resolvedPath)) {
      this.logger.debug('Skipping circular reference', { path: resolvedPath });
      return null;
    }

    // Law 4: Fail Fast - read file or return null
    const content = await this.readLocalFile(resolvedPath);
    if (content === null) return null;

    // Mark as visited to prevent circular references
    this.visitedPaths.add(resolvedPath);

    // Recursively resolve links in the referenced content
    const resolvedContent = await this.resolveLinks(content, resolvedPath, depth + 1);

    // Law 3: Return new formatted content (pure function)
    return this.formatReference(link.text, resolvedContent, link.target);
  }

  /**
   * Check if a resolved path is safe (within skill base directory).
   * Prevents path traversal attacks like ../../etc/passwd
   */
  private isSafeLocalPath(resolvedPath: string): boolean {
    const normalizedBase = path.resolve(this.config.skillBasePath);
    const normalizedPath = path.resolve(resolvedPath);
    
    return normalizedPath.startsWith(normalizedBase + path.sep) || 
           normalizedPath === normalizedBase;
  }

  /**
   * Read a local file and return its content.
   * Returns null if file doesn't exist or can't be read.
   */
  private async readLocalFile(filePath: string): Promise<string | null> {
    try {
      return await fs.promises.readFile(filePath, 'utf-8');
    } catch (error) {
      this.logger.debug('Failed to read referenced file', { 
        path: filePath,
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }

  /**
   * Fetch external content from URL with safety limits and JS-aware fetching.
   * Returns formatted reference section or null on failure.
   */
  private async fetchExternalContent(url: string, _depth: number): Promise<string | null> {
    // Law 1: Guard clause - HTTPS only
    if (!url.startsWith('https://')) {
      this.logger.warn('Blocked non-HTTPS external link', { url });
      return null;
    }

    // Step 1: Fetch content (with optional JS rendering)
    let rawContent: string | null = null;

    if (this.config.jsRenderingEnabled) {
      // Attempt 1: JS rendering
      rawContent = await this.fetchWithJS(url);

      // Attempt 2: Static fallback if JS rendering failed and fallback enabled
      if (rawContent === null && this.config.jsRenderFallback) {
        this.logger.debug('JS rendering failed, trying static fetch', { url });
        rawContent = await this.fetchStatic(url);
      }
    } else {
      // No JS rendering configured - use static fetch
      rawContent = await this.fetchStatic(url);
    }

    // Attempt 3: Both failed
    if (rawContent === null) {
      this.logger.warn('All fetch attempts failed, skipping link', { url });
      return null;
    }

    // Step 2: Transform content to text
    const transformed = this.transformExternalContent(rawContent, url);

    // Step 3: Check resolution mode for semantic retrieval
    if (this.config.resolutionMode === 'semantic' && this.embedder) {
      const skillContext = this.extractSkillContext(transformed);
      if (skillContext) {
        const semantic = await this.resolveExternalSemantic(url, transformed, skillContext);
        if (semantic) return semantic;
        // Fallback to compressed if semantic fails
      }
    }

    // Step 4: Check size threshold
    const maxBytes = (this.config.maxExternalSizeKb ?? 10) * 1024;
    if (transformed.length <= maxBytes) {
      // Under threshold - inline as-is
      return this.formatReference(`External: ${url}`, transformed, url);
    }

    // Step 5: Over threshold - compress
    if (this.config.compressionMode === 'skip') {
      // Skip compression - truncate instead
      const truncated = transformed.substring(0, maxBytes) + '\n\n... [content truncated - exceeds size limit]';
      return this.formatReference(`External: ${url}`, truncated, url);
    }

    // Step 6: LLM compression
    const compressed = await this.compressExternalContent(transformed, url);
    if (compressed !== null) {
      return this.formatReference(`External: ${url}`, compressed, url);
    }

    // Step 7: LLM compression failed - fallback to truncation
    this.logger.warn('LLM compression failed, falling back to truncation', { url, size: transformed.length });
    const truncated = transformed.substring(0, maxBytes) + '\n\n... [content truncated - LLM compression failed]';
    return this.formatReference(`External: ${url}`, truncated, url);
  }

  /**
   * Fetch external content using static HTTP request (no JS rendering).
   * Returns raw HTML/text or null on failure.
   */
  private async fetchStatic(url: string): Promise<string | null> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { 'User-Agent': 'SkillRouter/1.0 (Link Resolver)' }
      });
      clearTimeout(timeout);

      if (!response.ok) {
        this.logger.warn('Static fetch failed', { url, status: response.status });
        return null;
      }

      // 8MB hard limit as safety net
      const text = await response.text();
      if (text.length > 8_000_000) {
        this.logger.warn('External content exceeds 8MB hard limit, skipping', { url, size: text.length });
        return null;
      }

      return text;
    } catch (error) {
      clearTimeout(timeout);
      this.logger.warn('Static fetch error', { url, error: error instanceof Error ? error.message : String(error) });
      return null;
    }
  }

  /**
   * Fetch external content with JavaScript rendering via Puppeteer.
   * Lazy-loads Puppeteer as an optional dependency.
   * Returns rendered HTML or null on failure.
   */
  private async fetchWithJS(url: string): Promise<string | null> {
    const timeoutMs = this.config.jsRenderTimeoutMs ?? 5000;

    try {
      // Lazy-load Puppeteer (optional dependency)
      // Uses require() to avoid TypeScript compile-time module resolution
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let puppeteer: any;
      try {
        puppeteer = require('puppeteer');
      } catch {
        this.logger.warn('Puppeteer not available, skipping JS rendering', { url });
        return null;
      }

      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 800 });

      // Navigate and wait for content
      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: timeoutMs
      });

      // Wait a bit for dynamic content
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Extract rendered HTML
      const html = await page.content();

      await browser.close();

      // 8MB hard limit
      if (html.length > 8_000_000) {
        this.logger.warn('JS-rendered content exceeds 8MB hard limit', { url, size: html.length });
        return null;
      }

      return html;
    } catch (error) {
      this.logger.warn('JS rendering failed', { url, error: error instanceof Error ? error.message : String(error) });
      return null;
    }
  }

  /**
   * Compress external content using regex-based extraction.
   * Extracts the most relevant portions (headings, paragraphs, code blocks).
   * Returns compressed text or null on failure.
   */
  private async compressExternalContent(content: string, url: string): Promise<string | null> {
    try {
      const mode = this.config.compressionMode ?? 'brief';

      if (mode === 'brief') {
        // Extract: title, first few paragraphs, code blocks, headings
        return this.extractKeyContent(content, 2000); // ~2000 char target
      } else if (mode === 'moderate') {
        return this.extractKeyContent(content, 5000); // ~5000 char target
      }

      // Unknown mode — fall back to brief instead of returning null
      this.logger.warn('Unknown compression mode, falling back to brief', { mode, url });
      return this.extractKeyContent(content, 2000);
    } catch (error) {
      this.logger.error('External content compression failed', {
        url,
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }

  /**
   * Extract meaningful content from HTML, targeting a character limit.
   * Removes scripts, styles, navigation, and extracts text with heading structure.
   */
  private extractKeyContent(html: string, targetChars: number): string {
    // Extract meaningful content from HTML
    let text = html;

    // Remove script/style
    text = text.split(/<script[\s\S]*?<\/script>/gi).join('');
    text = text.split(/<style[\s\S]*?<\/style>/gi).join('');
    text = text.split(/<nav[\s\S]*?<\/nav>/gi).join('');
    text = text.split(/<footer[\s\S]*?<\/footer>/gi).join('');
    text = text.split(/<header[\s\S]*?<\/header>/gi).join('');

    // Convert to text
    text = text.split(/<h1[^>]*>(.*?)<\/h1>/gi).join('\n# $1\n');
    text = text.split(/<h2[^>]*>(.*?)<\/h2>/gi).join('\n## $1\n');
    text = text.split(/<h3[^>]*>(.*?)<\/h3>/gi).join('\n### $1\n');
    text = text.split(/<p[^>]*>(.*?)<\/p>/gi).join('\n$1\n\n');
    text = text.split(/<li[^>]*>(.*?)<\/li>/gi).join('- $1\n');
    text = text.split(/<br\s*\/?>/gi).join('\n');
    text = text.split(/<[^>]+>/g).join('');

    // Decode entities
    text = text.split(/&nbsp;/g).join(' ');
    text = text.split(/&amp;/g).join('&');
    text = text.split(/&lt;/g).join('<');
    text = text.split(/&gt;/g).join('>');
    text = text.split(/&quot;/g).join('"');
    text = text.split(/&#39;/g).join("'");
    text = text.split(/\n{3,}/g).join('\n\n');

    // Truncate to target
    text = text.trim();
    if (text.length > targetChars) {
      text = text.substring(0, targetChars) + '\n\n... [content compressed - excerpt shown]';
    }

    return text;
  }

  /**
   * Transform external HTML/content to markdown-like format suitable for skills.
   * Strips HTML tags, preserves structure, adds source attribution.
   * 
   * NOTE: This is a best-effort regex-based transformation. It handles common cases
   * but may fail on complex HTML (nested tags, attributes with > in values, etc.).
   * For production use with untrusted external content, consider using a proper
   * HTML parser like cheerio or node-html-parser.
   */
  private transformExternalContent(html: string, _sourceUrl: string): string {
    // Simple HTML-to-text transformation
    let text = html;

    // Remove script and style tags with content
    text = text.split(/<script[\s\S]*?<\/script>/gi).join('');
    text = text.split(/<style[\s\S]*?<\/style>/gi).join('');

    // Convert common HTML elements to markdown-like format
    text = text.split(/<h1[^>]*>(.*?)<\/h1>/gi).join('\n# $1\n');
    text = text.split(/<h2[^>]*>(.*?)<\/h2>/gi).join('\n## $1\n');
    text = text.split(/<h3[^>]*>(.*?)<\/h3>/gi).join('\n### $1\n');
    text = text.split(/<p[^>]*>(.*?)<\/p>/gi).join('\n$1\n\n');
    text = text.split(/<li[^>]*>(.*?)<\/li>/gi).join('- $1\n');
    text = text.split(/<br\s*\/?>/gi).join('\n');
    text = text.split(/<[^>]+>/g).join(''); // Remove remaining tags

    // Clean up whitespace
    text = text.split(/&nbsp;/g).join(' ');
    text = text.split(/&amp;/g).join('&');
    text = text.split(/&lt;/g).join('<');
    text = text.split(/&gt;/g).join('>');
    text = text.split(/&quot;/g).join('"');
    text = text.split(/\n{3,}/g).join('\n\n'); // Max 2 consecutive newlines

    return text.trim();
  }

  /**
   * Format a resolved reference as a markdown section.
   */
  private formatReference(title: string, content: string, source: string): string {
    return `\n\n---\n## 📎 Reference: ${title}\n> Source: \`${source}\`\n\n${content}\n---\n`;
  }

  /**
   * Apply all link replacements to content.
   */
  private applyReplacements(content: string, replacements: Map<string, string>): string {
    let result = content;
    
    for (const [original, replacement] of replacements) {
      // Use split/join to avoid String.replace interpreting $ characters specially
      result = result.split(original).join(replacement);
    }
    
    return result;
  }

  /**
   * Extract skill context from transformed content for semantic queries.
   * Uses title + description + first 500 chars of content.
   */
  private extractSkillContext(content: string): string {
    const lines = content.split('\n').filter(l => l.trim().length > 0);
    
    // Extract first heading as title
    const titleMatch = lines.find(l => l.startsWith('#'));
    const title = titleMatch ? titleMatch.replace(/^#+\s*/, '') : '';
    
    // Extract first paragraph as description
    const firstParagraph = lines.find(l => !l.startsWith('#') && l.trim().length > 20) || '';
    
    // First 500 chars of content
    const contentPreview = content.substring(0, 500);
    
    return [title, firstParagraph, contentPreview].filter(Boolean).join(' ').trim();
  }

  /**
   * Resolve external content using semantic chunking and retrieval.
   * Returns the most relevant excerpts based on cosine similarity to skill context.
   */
  private async resolveExternalSemantic(
    url: string,
    transformedContent: string,
    skillContext: string
  ): Promise<string | null> {
    // Law 1: Early Exit — no embedder available
    if (!this.embedder) {
      this.logger.debug('Semantic resolution skipped: no embedder available', { url });
      return null;
    }

    // Step 1: Chunk the content
    const chunks = this.chunker.chunk(transformedContent, url);
    if (chunks.length === 0) {
      this.logger.debug('Semantic resolution skipped: no chunks produced', { url });
      return null;
    }

    try {
      // Step 2: Embed chunks (in-memory)
      const embeddedChunks = await this.embedder.embedChunks(chunks);

      // Step 3: Embed skill context
      const queryEmbedding = await this.embedder.embedQuery(skillContext);

      // Step 4: Find top-K most relevant chunks using cosine similarity
      const relevantChunks = this.findRelevantChunks(
        queryEmbedding,
        embeddedChunks,
        this.config.semanticTopK ?? 3,
        this.config.semanticSimilarityThreshold ?? 0.3
      );

      // Step 5: Clear in-memory embeddings
      this.embedder.clearCache();

      // Step 6: Format and return relevant excerpts
      if (relevantChunks.length === 0) {
        this.logger.debug('Semantic resolution found no relevant chunks, falling back', {
          url,
          chunkCount: chunks.length,
        });
        return null;
      }

      const excerpts = relevantChunks
        .map(c => `### ${c.chunk.headingPath.join(' > ')}\n\n${c.chunk.content}`)
        .join('\n\n---\n\n');

      return this.formatReference(
        `External: ${url} (relevant excerpts)`,
        excerpts,
        url
      );
    } catch (error) {
      // Law 4: Fail Fast — log error and return null for graceful fallback
      this.logger.error('Semantic resolution failed, falling back to compressed', {
        url,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Find top-K most relevant chunks by cosine similarity to query embedding.
   * Filters by threshold and returns sorted by similarity descending.
   */
  private findRelevantChunks(
    queryEmbedding: number[],
    embeddedChunks: EmbeddingResult[],
    topK: number,
    threshold: number
  ): EmbeddingResult[] {
    // Compute cosine similarity for each chunk
    const scored = embeddedChunks.map(ec => ({
      result: ec,
      similarity: this.cosineSimilarity(queryEmbedding, ec.embedding),
    }));

    // Filter by threshold and sort by similarity descending
    return scored
      .filter(s => s.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK)
      .map(s => s.result);
  }

  /**
   * Calculate cosine similarity between two vectors.
   * Returns 0 if vectors have different lengths or zero magnitude.
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    // Law 1: Early Exit — dimension mismatch
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    // Law 1: Early Exit — zero magnitude
    if (normA === 0 || normB === 0) return 0;

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

}
