// Markdown Link Resolver
// Parses and resolves markdown links in skill content, inlining referenced documents
// Follows the 5 Laws of Elegant Defense for clean, safe implementation

import fs from 'fs';
import path from 'path';
import { Logger } from '../observability/Logger';

export interface LinkResolverConfig {
  enabled: boolean;
  allowExternalLinks: boolean;
  maxDepth: number;
  skillBasePath: string;
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

  constructor(config: LinkResolverConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
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
   * Fetch external content from URL with safety limits.
   * Returns formatted reference section or null on failure.
   */
  private async fetchExternalContent(url: string, _depth: number): Promise<string | null> {
    // Law 1: Guard clause - HTTPS only
    if (!url.startsWith('https://')) {
      this.logger.warn('Blocked non-HTTPS external link', { url });
      return null;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000); // 5s timeout

    try {
      const response = await fetch(url, { 
        signal: controller.signal,
        headers: { 'User-Agent': 'SkillRouter/1.0 (Link Resolver)' }
      });

      clearTimeout(timeout);

      // Law 1: Guard clause - check response status
      if (!response.ok) {
        this.logger.warn('External link fetch failed', { url, status: response.status });
        return null;
      }

      // Law 1: Guard clause - size limit (100KB)
      const contentLength = parseInt(response.headers.get('content-length') || '0');
      if (contentLength > 100_000) {
        this.logger.warn('External content too large, skipping', { url, size: contentLength });
        return null;
      }

      const text = await response.text();
      
      // Law 1: Guard clause - final size check after fetch
      if (text.length > 100_000) {
        this.logger.warn('External content too large after fetch, skipping', { url, size: text.length });
        return null;
      }

      // Transform external content to skill-appropriate format
      const transformed = this.transformExternalContent(text, url);
      
      return this.formatReference(`External: ${url}`, transformed, url);
    } catch (error) {
      clearTimeout(timeout);
      this.logger.warn('External link fetch error', { 
        url, 
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }

  /**
   * Transform external HTML/content to markdown-like format suitable for skills.
   * Strips HTML tags, preserves structure, adds source attribution.
   */
  private transformExternalContent(html: string, _sourceUrl: string): string {
    // Simple HTML-to-text transformation
    let text = html;
    
    // Remove script and style tags with content
    text = text.replace(/<script[\s\S]*?<\/script>/gi, '');
    text = text.replace(/<style[\s\S]*?<\/style>/gi, '');
    
    // Convert common HTML elements to markdown-like format
    text = text.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '\n# $1\n');
    text = text.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '\n## $1\n');
    text = text.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '\n### $1\n');
    text = text.replace(/<p[^>]*>(.*?)<\/p>/gi, '\n$1\n\n');
    text = text.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n');
    text = text.replace(/<br\s*\/?>/gi, '\n');
    text = text.replace(/<[^>]+>/g, ''); // Remove remaining tags
    
    // Clean up whitespace
    text = text.replace(/&nbsp;/g, ' ');
    text = text.replace(/&amp;/g, '&');
    text = text.replace(/&lt;/g, '<');
    text = text.replace(/&gt;/g, '>');
    text = text.replace(/&quot;/g, '"');
    text = text.replace(/\n{3,}/g, '\n\n'); // Max 2 consecutive newlines
    
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
      result = result.replace(original, replacement);
    }
    
    return result;
  }

  /**
   * Clear visited paths cache (for testing or config changes).
   */
  reset(): void {
    this.visitedPaths.clear();
  }
}
