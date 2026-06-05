// Skill Creation Tracker - persists and queries auto-created skill metadata
// Writes to data/skill-creation-index.json in the project root.

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Single entry recorded when a skill is auto-created.
 */
export interface CreatedSkillEntry {
  /** UUID-like unique identifier */
  id: string;
  /** e.g. "devops/terraform-module-generation" */
  skillName: string;
  /** Domain category (e.g. "coding", "cncf") */
  domain: string;
  /** Topic directory name (kebab-case) */
  topic: string;
  /** One-sentence description of the generated skill */
  description: string;
  /** Trigger keywords for auto-loading */
  triggers: string;
  /** Full filesystem path to SKILL.md */
  filePath: string;
  /** ISO 8601 timestamp of creation */
  timestamp: string;
  /** Total tokens consumed during generation (all attempts) */
  totalTokensUsed: number;
  /** Number of times the generation tool was called (1 initial + regenerations) */
  generationAttempts: number;
  /** Number of validation attempts made */
  validationAttempts: number;
  /** Whether the created skill was git-committed */
  gitCommitted: boolean;
  /** Whether the created skill was git-pushed */
  gitPushed: boolean;
}

/**
 * Top-level index structure persisted to disk.
 */
export interface CreatedSkillsIndex {
  /** Schema version — increment when format changes */
  version: number;
  /** List of all auto-created skill entries */
  skills: CreatedSkillEntry[];
  /** Total count of created skills (alias for skills.length) */
  totalCreated: number;
  /** Sum of totalTokensUsed across all entries */
  totalTokensUsed: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const INDEX_FILENAME = 'skill-creation-index.json';
const SCHEMA_VERSION = 1;

/** Resolves the path to the index file relative to the project root. */
function resolveIndexPath(): string {
  return path.join(process.cwd(), 'data', INDEX_FILENAME);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Create a new tracker instance bound to the default index file location.
 */
export class SkillCreationTracker {
  /**
   * Read the existing index or create a fresh one.
   * Creates the data/ directory if it does not exist yet.
   */
  initIndex(): CreatedSkillsIndex {
    const indexPath = resolveIndexPath();
    const dataDir = path.dirname(indexPath);

    // Ensure data/ directory exists
    fs.mkdirSync(dataDir, { recursive: true });

    try {
      const raw = fs.readFileSync(indexPath, 'utf-8');
      const existing = JSON.parse(raw) as CreatedSkillsIndex;
      return existing;
    } catch (err) {
      // ENOENT or corrupt JSON — start fresh
      const empty: CreatedSkillsIndex = {
        version: SCHEMA_VERSION,
        skills: [],
        totalCreated: 0,
        totalTokensUsed: 0,
      };
      fs.writeFileSync(indexPath, JSON.stringify(empty, null, 2), 'utf-8');
      return empty;
    }
  }

  /**
   * Add a new skill entry to the index and persist.
   * Generates a UUID for the entry ID and updates aggregate totals.
   */
  addSkill(entry: Omit<CreatedSkillEntry, 'id'>): CreatedSkillEntry {
    const index = this.initIndex();

    const fullEntry: CreatedSkillEntry = {
      ...entry,
      id: crypto.randomUUID(),
    };

    index.skills.unshift(fullEntry); // latest first
    index.totalCreated = index.skills.length;
    index.totalTokensUsed = index.skills.reduce(
      (sum, s) => sum + (s.totalTokensUsed || 0),
      0,
    );

    this._persist(index);
    return fullEntry;
  }

  /**
   * Return all created skills, sorted by timestamp descending (latest first).
   */
  getCreatedSkills(): CreatedSkillEntry[] {
    const index = this.initIndex();
    return [...index.skills].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
  }

  /**
   * Find a skill entry by its domain/topic pair.
   */
  getCreatedSkillByTopic(domain: string, topic: string): CreatedSkillEntry | undefined {
    const index = this.initIndex();
    return index.skills.find(
      (s) => s.domain === domain && s.topic === topic,
    );
  }

  /**
   * Mark an entry as git-committed.
   */
  markCommitted(id: string): void {
    const index = this.initIndex();
    const entry = index.skills.find((s) => s.id === id);
    if (entry) {
      entry.gitCommitted = true;
      this._persist(index);
    }
  }

  /**
   * Mark an entry as git-pushed.
   */
  markPushed(id: string): void {
    const index = this.initIndex();
    const entry = index.skills.find((s) => s.id === id);
    if (entry) {
      entry.gitPushed = true;
      this._persist(index);
    }
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private _persist(index: CreatedSkillsIndex): void {
    const indexPath = resolveIndexPath();
    fs.writeFileSync(indexPath, JSON.stringify(index, null, 2), 'utf-8');
  }
}
