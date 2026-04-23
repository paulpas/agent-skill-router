// GitHubSkillLoader - clones and syncs skills from a public GitHub repository

import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { Logger } from '../observability/Logger.js';

const execFileAsync = promisify(execFile);

export interface GitHubSkillLoaderConfig {
  /** Public GitHub repo URL, e.g. https://github.com/paulpas/skills */
  repoUrl: string;
  /** Local directory to clone/cache the repo into */
  cacheDir: string;
  /** Sync interval in milliseconds (default: 3600000 = 1 hour) */
  syncIntervalMs?: number;
  /** Optional GitHub token for private repos or higher rate limits */
  githubToken?: string;
}

export class GitHubSkillLoader {
  private repoUrl: string;
  private cacheDir: string;
  private syncIntervalMs: number;
  private githubToken: string;
  private syncTimer: ReturnType<typeof setInterval> | null = null;
  private logger: Logger;

  constructor(config: GitHubSkillLoaderConfig) {
    this.repoUrl = config.repoUrl;
    this.cacheDir = config.cacheDir;
    this.syncIntervalMs = config.syncIntervalMs ?? 3600000;
    this.githubToken = config.githubToken ?? '';
    this.logger = new Logger('GitHubSkillLoader');
  }

  /** Clone the repo if needed, pull if already cloned. Call on startup. */
  async initialize(): Promise<void> {
    if (await this.isCloned()) {
      this.logger.info('Skills cache exists, pulling latest', { dir: this.cacheDir });
      await this.pull();
    } else {
      this.logger.info('Cloning skills repository', { url: this.repoUrl, to: this.cacheDir });
      await this.clone();
    }
    this.logger.info('GitHub skills initialized', { dir: this.cacheDir });
  }

  /** Start background sync. Calls onUpdate() after each successful pull. */
  startSync(onUpdate: () => Promise<void>): void {
    if (this.syncTimer) return; // already running
    this.syncTimer = setInterval(async () => {
      try {
        this.logger.info('Syncing skills from GitHub');
        await this.pull();
        this.logger.info('Sync complete, reloading skills');
        await onUpdate();
      } catch (err) {
        this.logger.error('GitHub sync failed', {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }, this.syncIntervalMs);
    this.logger.info('Background GitHub sync started', { intervalMs: this.syncIntervalMs });
  }

  /** Stop background sync. */
  stopSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
      this.logger.info('GitHub sync stopped');
    }
  }

  /** Trigger an immediate pull + reload (used by /reload endpoint). */
  async syncNow(onUpdate: () => Promise<void>): Promise<void> {
    await this.pull();
    await onUpdate();
  }

  /** Return the local path where SKILL.md files live after cloning. */
  getSkillsDir(): string {
    return this.cacheDir;
  }

  private async isCloned(): Promise<boolean> {
    try {
      await fs.promises.access(path.join(this.cacheDir, '.git'));
      return true;
    } catch {
      return false;
    }
  }

  private async clone(): Promise<void> {
    await fs.promises.mkdir(path.dirname(this.cacheDir), { recursive: true });
    const url = this.authUrl(this.repoUrl);
    await execFileAsync('git', ['clone', '--depth=1', url, this.cacheDir]);
  }

  private async pull(): Promise<void> {
    await execFileAsync('git', ['-C', this.cacheDir, 'pull', '--ff-only', '--depth=1']);
  }

  /** Inject token into HTTPS URL for authenticated access if provided. */
  private authUrl(url: string): string {
    if (!this.githubToken) return url;
    return url.replace('https://', `https://${this.githubToken}@`);
  }
}
