// BM25 (Best Matching 25) retrieval scoring system
// Standard BM25 formula for document relevance scoring against text queries

/**
 * A document indexed by BM25, keyed by its ID with searchable field texts.
 */
export interface BM25Document {
  id: string;               // skill name
  fieldTexts: Record<string, string>;  // e.g., { description, tags, triggers, rawContent }
}

/**
 * Internal inverted index entry — maps a term to the docs it appears in.
 */
interface IndexEntry {
  docId: string;
  termFreq: number;         // f(qi, D) — how many times term appears in document
}

/**
 * BM25 indexing and scoring engine.
 *
 * Formula:
 *   score(D,Q) = Σ over qi in Q of: IDF(qi) * (f(qi,D) * (K1 + 1)) / (f(qi,D) + K1 * (1 - B + B * |D|/avgdl))
 */
export class BM25Indexer {
  /** BM25 parameters — standard values */
  private static readonly K1 = 1.5;   // term frequency saturation
  private static readonly B = 0.75;   // length normalization factor

  /** All document lengths (token counts) */
  private docLengths: Map<string, number> = new Map();

  /** Total token count across all documents */
  private totalTokens = 0;

  /** Number of documents */
  private docCount = 0;

  /** Average document length */
  private avgDocLength = 0;

  /** Inverted index: term → list of (docId, termFreq) */
  private invertedIndex: Map<string, IndexEntry[]> = new Map();

  /** Set of all terms in the corpus for quick existence checks */
  private allTerms = new Set<string>();

  /**
   * Build an inverted index from a set of BM25Document objects.
   * Merges all fieldTexts values into a single document representation per ID.
   */
  static buildIndex(documents: BM25Document[]): BM25Indexer {
    const indexer = new BM25Indexer();
    indexer.indexDocuments(documents);
    return indexer;
  }

  /**
   * Score a query against all indexed documents, returning results sorted by score descending.
   * If topK is provided, only the top K results are returned.
   */
  score(query: string, topK?: number): Array<{ id: string; score: number }> {
    const tokens = this.tokenize(query);
    if (tokens.length === 0) return [];

    const scores = new Map<string, number>();

    for (const term of tokens) {
      const entries = this.invertedIndex.get(term);
      if (!entries || entries.length === 0) continue;

      const nQi = entries.length; // number of documents containing this term
      const idf = this.idf(nQi);

      for (const entry of entries) {
        const current = scores.get(entry.docId) ?? 0;
        scores.set(entry.docId, current + this.bm25TermScore(entry, idf));
      }
    }

    // Convert to sorted array
    const results = Array.from(scores.entries())
      .map(([id, score]) => ({ id, score }))
      .sort((a, b) => b.score - a.score);

    if (topK && topK > 0) {
      return results.slice(0, topK);
    }

    return results;
  }

  /**
   * Normalize scores to [0, 1] range using min-max normalization.
   * If all scores are identical, returns 1.0 for all (or 0 if the set is empty).
   */
  static normalizeScores(scores: Map<string, number>): Map<string, number> {
    if (scores.size === 0) return new Map();

    const values = Array.from(scores.values());
    const minScore = Math.min(...values);
    const maxScore = Math.max(...values);

    if (maxScore === minScore) {
      // All identical — normalize to 1.0
      const normalized = new Map<string, number>();
      for (const key of scores.keys()) {
        normalized.set(key, 1.0);
      }
      return normalized;
    }

    const normalized = new Map<string, number>();
    for (const [key, value] of scores) {
      normalized.set(key, (value - minScore) / (maxScore - minScore));
    }
    return normalized;
  }

  // --- Internal methods ---

  private indexDocuments(documents: BM25Document[]): void {
    for (const doc of documents) {
      const combinedText = Object.values(doc.fieldTexts).join(' ');
      const tokens = this.tokenize(combinedText);

      const tokenCount = tokens.length;
      this.docLengths.set(doc.id, tokenCount);
      this.totalTokens += tokenCount;
      this.docCount++;

      // Build term frequency for this document
      const termFreqs = new Map<string, number>();
      for (const token of tokens) {
        termFreqs.set(token, (termFreqs.get(token) ?? 0) + 1);
      }

      // Update inverted index
      for (const [term, freq] of termFreqs) {
        this.allTerms.add(term);
        const entry = this.invertedIndex.get(term) ?? [];
        entry.push({ docId: doc.id, termFreq: freq });
        this.invertedIndex.set(term, entry);
      }
    }

    this.avgDocLength = this.docCount > 0 ? this.totalTokens / this.docCount : 0;
  }

  /** Tokenize text: lowercase, split on non-alphanumeric, filter stop words */
  private tokenize(text: string): string[] {
    const STOP_WORDS = new Set([
      'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
      'should', 'may', 'might', 'shall', 'can', 'need', 'dare', 'ought',
      'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from',
      'as', 'into', 'through', 'during', 'before', 'after', 'above',
      'below', 'between', 'out', 'off', 'over', 'under', 'again',
      'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why',
      'how', 'all', 'both', 'each', 'few', 'more', 'most', 'other',
      'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so',
      'than', 'too', 'very', 'just', 'and', 'but', 'if', 'or', 'because',
      'until', 'while', 'this', 'that', 'these', 'those', 'i', 'me',
      'my', 'we', 'our', 'you', 'your', 'he', 'him', 'his', 'she', 'her',
      'it', 'its', 'they', 'them', 'their', 'what', 'which', 'who', 'whom',
    ]);

    const tokens = text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')   // replace non-alphanumeric with space
      .split(/\s+/)                     // split on whitespace
      .filter(t => t.length > 0)       // remove empty strings
      .filter(t => !STOP_WORDS.has(t)); // filter stop words

    return tokens;
  }

  /** Compute IDF for a term appearing in nQi documents. Uses smoothed formula. */
  private idf(nQi: number): number {
    // IDF(qi) = ln((N - n(qi) + 0.5) / (n(qi) + 0.5) + 1)
    const N = this.docCount;
    if (N === 0) return 0;
    return Math.log((N - nQi + 0.5) / (nQi + 0.5) + 1);
  }

  /** Compute BM25 score for a single term in a document */
  private bm25TermScore(entry: IndexEntry, idf: number): number {
    const f = entry.termFreq;
    const docLength = this.docLengths.get(entry.docId) ?? 0;
    const k1 = BM25Indexer.K1;
    const b = BM25Indexer.B;

    if (docLength === 0 || this.avgDocLength === 0) return 0;

    // Numerator: f(qi, D) * (K1 + 1)
    const numerator = f * (k1 + 1);

    // Denominator: f(qi, D) + K1 * (1 - B + B * |D| / avgdl)
    const lengthNorm = 1 - b + b * docLength / this.avgDocLength;
    const denominator = f + k1 * lengthNorm;

    if (denominator === 0) return 0;

    return idf * (numerator / denominator);
  }
}
