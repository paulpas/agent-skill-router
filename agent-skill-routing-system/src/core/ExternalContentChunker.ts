// External Content Chunker
// Splits external content into semantic chunks respecting heading boundaries.
// Follows the 5 Laws of Elegant Defense for clean, safe implementation.

export interface ContentChunk {
  id: string;           // Unique chunk ID (URL + index)
  content: string;       // The chunk text
  sourceUrl: string;     // Original URL
  headingPath: string[]; // Heading hierarchy (e.g., ["# API Reference", "## Authentication"])
  chunkIndex: number;    // Position in document
  wordCount: number;     // Word count for metadata
}

export interface ChunkerConfig {
  targetChunkSize: number;    // Target characters per chunk (default: 750)
  overlapSize: number;        // Overlap between chunks (default: 50)
  minChunkSize: number;       // Minimum chunk size before merging (default: 100)
}

const DEFAULT_CONFIG: ChunkerConfig = {
  targetChunkSize: 750,
  overlapSize: 50,
  minChunkSize: 100,
};

/**
 * Section parsed from markdown content with heading hierarchy.
 */
interface ParsedSection {
  headingPath: string[];
  paragraphs: string[];
}

/**
 * Splits external content into semantic chunks based on markdown heading structure.
 * Respects heading boundaries to preserve semantic context within each chunk.
 */
export class ExternalContentChunker {
  private config: ChunkerConfig;

  constructor(config?: Partial<ChunkerConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Split content into semantic chunks based on headings and paragraphs.
   * Respects heading boundaries to preserve semantic structure.
   */
  chunk(content: string, sourceUrl: string): ContentChunk[] {
    // Law 1: Early Exit — empty or whitespace-only content
    if (!content || content.trim().length === 0) {
      return [];
    }

    // Law 2: Parse at boundary — extract sections with heading hierarchy
    const sections = this.parseSections(content);
    if (sections.length === 0) {
      return [];
    }

    // Build chunks from sections, respecting heading boundaries
    const chunks = this.buildChunks(sections, sourceUrl);

    return chunks;
  }

  /**
   * Parse content into sections based on markdown headings.
   * Each section carries its heading path (ancestry of parent headings).
   */
  private parseSections(content: string): ParsedSection[] {
    const lines = content.split('\n');
    const sections: ParsedSection[] = [];
    const headingStack: { level: number; text: string }[] = [];
    let currentParagraphs: string[] = [];
    let currentParagraph = '';

    const flushParagraph = () => {
      const trimmed = currentParagraph.trim();
      if (trimmed.length > 0) {
        currentParagraphs.push(trimmed);
      }
      currentParagraph = '';
    };

    for (const line of lines) {
      // Detect markdown heading: # ## ### #### etc.
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
      if (headingMatch) {
        flushParagraph();

        const level = headingMatch[1].length;
        const text = headingMatch[2].trim();

        // Pop headings deeper than current level
        while (headingStack.length > 0 && headingStack[headingStack.length - 1].level >= level) {
          headingStack.pop();
        }

        // Push current heading
        headingStack.push({ level, text });

        // If we have accumulated paragraphs under previous heading, save as section
        if (currentParagraphs.length > 0) {
          const headingPath = headingStack.slice(0, -1).map(h => `${'#'.repeat(h.level)} ${h.text}`);
          sections.push({
            headingPath,
            paragraphs: [...currentParagraphs],
          });
          currentParagraphs = [];
        }

        // Start new paragraph with heading text as content seed
        currentParagraph = `${'#'.repeat(level)} ${text}\n\n`;
      } else if (line.trim() === '') {
        flushParagraph();
      } else {
        currentParagraph += line + '\n';
      }
    }

    // Flush remaining paragraph
    flushParagraph();

    // Save final section
    if (currentParagraphs.length > 0) {
      const headingPath = headingStack.map(h => `${'#'.repeat(h.level)} ${h.text}`);
      sections.push({
        headingPath,
        paragraphs: [...currentParagraphs],
      });
    }

    return sections;
  }

  /**
   * Build chunks from parsed sections, grouping paragraphs into target-sized chunks.
   */
  private buildChunks(sections: ParsedSection[], sourceUrl: string): ContentChunk[] {
    const chunks: ContentChunk[] = [];
    let chunkIndex = 0;

    for (const section of sections) {
      // Skip sections with no paragraphs
      if (section.paragraphs.length === 0) {
        continue;
      }

      // Group paragraphs into chunks targeting targetChunkSize
      const sectionChunks = this.groupParagraphsIntoChunks(
        section.paragraphs,
        section.headingPath,
        sourceUrl,
        chunkIndex
      );

      for (const sc of sectionChunks) {
        chunks.push(sc);
        chunkIndex++;
      }
    }

    // Post-process: merge undersized chunks with adjacent chunks
    return this.mergeSmallChunks(chunks);
  }

  /**
   * Group paragraphs into chunks of approximately targetChunkSize characters.
   */
  private groupParagraphsIntoChunks(
    paragraphs: string[],
    headingPath: string[],
    sourceUrl: string,
    startIndex: number
  ): ContentChunk[] {
    const chunks: ContentChunk[] = [];
    let currentChunkParagraphs: string[] = [];
    let currentSize = 0;

    for (const paragraph of paragraphs) {
      const paragraphSize = paragraph.length;

      // If adding this paragraph exceeds target and we already have content, finalize chunk
      if (currentSize + paragraphSize > this.config.targetChunkSize && currentChunkParagraphs.length > 0) {
        const chunkContent = currentChunkParagraphs.join('\n\n');
        chunks.push(this.createChunk(chunkContent, headingPath, sourceUrl, startIndex + chunks.length));

        // Start new chunk with overlap from previous chunk
        const overlap = this.getOverlap(currentChunkParagraphs);
        currentChunkParagraphs = overlap.length > 0 ? [overlap] : [];
        currentSize = overlap.length;
      }

      currentChunkParagraphs.push(paragraph);
      currentSize += paragraphSize;
    }

    // Flush remaining paragraphs
    if (currentChunkParagraphs.length > 0) {
      const chunkContent = currentChunkParagraphs.join('\n\n');
      chunks.push(this.createChunk(chunkContent, headingPath, sourceUrl, startIndex + chunks.length));
    }

    return chunks;
  }

  /**
   * Extract overlap text from the end of the previous chunk's paragraphs.
   * Takes the last paragraph(s) up to overlapSize characters.
   */
  private getOverlap(paragraphs: string[]): string {
    if (paragraphs.length === 0 || this.config.overlapSize <= 0) {
      return '';
    }

    // Start from the last paragraph and work backwards
    const overlapTexts: string[] = [];
    let overlapSize = 0;

    for (let i = paragraphs.length - 1; i >= 0; i--) {
      const p = paragraphs[i];
      if (overlapSize + p.length > this.config.overlapSize && overlapTexts.length > 0) {
        break;
      }
      overlapTexts.unshift(p);
      overlapSize += p.length;
    }

    return overlapTexts.join('\n\n');
  }

  /**
   * Create a ContentChunk from text content.
   */
  private createChunk(
    content: string,
    headingPath: string[],
    sourceUrl: string,
    index: number
  ): ContentChunk {
    const wordCount = content.split(/\s+/).filter(w => w.length > 0).length;
    const urlHash = this.hashUrl(sourceUrl);

    return {
      id: `${urlHash}-${index}`,
      content: content.trim(),
      sourceUrl,
      headingPath,
      chunkIndex: index,
      wordCount,
    };
  }

  /**
   * Merge chunks smaller than minChunkSize with adjacent chunks.
   */
  private mergeSmallChunks(chunks: ContentChunk[]): ContentChunk[] {
    if (chunks.length <= 1) {
      return chunks;
    }

    const result: ContentChunk[] = [];
    let pending: ContentChunk | null = null;

    for (const chunk of chunks) {
      if (chunk.content.length < this.config.minChunkSize) {
        // Merge with pending or next chunk
        if (pending) {
          pending = this.mergeChunks(pending, chunk);
        } else {
          pending = { ...chunk };
        }
      } else {
        if (pending) {
          // Merge pending into current chunk
          result.push(this.mergeChunks(pending, chunk));
          pending = null;
        } else {
          result.push(chunk);
        }
      }
    }

    // Flush remaining pending chunk
    if (pending) {
      if (result.length > 0) {
        // Merge into last chunk
        const last = result[result.length - 1];
        result[result.length - 1] = this.mergeChunks(last, pending);
      } else {
        result.push(pending);
      }
    }

    // Re-index chunks after merge
    return result.map((c, i) => ({ ...c, chunkIndex: i }));
  }

  /**
   * Merge two chunks into one.
   */
  private mergeChunks(a: ContentChunk, b: ContentChunk): ContentChunk {
    return {
      id: a.id,
      content: `${a.content}\n\n${b.content}`,
      sourceUrl: a.sourceUrl,
      headingPath: b.headingPath.length > 0 ? b.headingPath : a.headingPath,
      chunkIndex: a.chunkIndex,
      wordCount: a.wordCount + b.wordCount,
    };
  }

  /**
   * Simple hash of URL for chunk ID generation.
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
