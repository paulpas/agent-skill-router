import * as fs from 'fs';
import * as path from 'path';
import type { DomainConfig } from './types';
import { Logger } from '../observability/Logger';

/**
 * Domain Registry - dynamically discovers domains from filesystem
 * and provides metadata defaults from domains.json config.
 *
 * Discovery (directory scan) ≠ Metadata (defaults from config file).
 * If a directory exists but has no config entry, sensible defaults apply.
 */
export class DomainRegistry {
  private static instance: DomainRegistry | null = null;
  private domains: Record<string, DomainConfig> = {};
  private logger: Logger;
  private configPath: string;

  private constructor(configPath?: string) {
    this.configPath = configPath || path.join(__dirname, '../../config/domains.json');
    this.logger = new Logger('DomainRegistry');
  }

  public static getInstance(configPath?: string): DomainRegistry {
    if (!DomainRegistry.instance) {
      DomainRegistry.instance = new DomainRegistry(configPath);
    }
    return DomainRegistry.instance;
  }

  public static resetInstance(): void {
    DomainRegistry.instance = null;
  }

  /**
   * Load domain defaults from domains.json config file.
   */
  public loadDomainsConfig(): void {
    try {
      if (fs.existsSync(this.configPath)) {
        const raw = fs.readFileSync(this.configPath, 'utf-8');
        const config = JSON.parse(raw);
        if (config && config.domains && typeof config.domains === 'object') {
          this.domains = config.domains;
          this.logger.info('Loaded domain config', {
            domainCount: Object.keys(this.domains).length,
            domains: Object.keys(this.domains),
          });
        }
      } else {
        this.logger.warn(`Domains config not found: ${this.configPath}, using empty defaults`);
      }
    } catch (error) {
      this.logger.error('Failed to load domains config', {
        error: error instanceof Error ? error.message : String(error),
      });
      // Fail gracefully: empty config is OK, we'll use defaults
    }
  }

  /**
   * Discover domains by scanning the skills directory for subdirectories.
   * Returns Promise<string[]> to match CompressionCleanupJob.scanDomains() interface.
   */
  public async discoverDomains(skillsDirectory: string): Promise<string[]> {
    try {
      const entries = await fs.promises.readdir(skillsDirectory, { withFileTypes: true });
      const domainDirs = entries
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .sort();
      this.logger.debug('Discovered domains', { domains: domainDirs });
      return Promise.resolve(domainDirs);
    } catch (error) {
      this.logger.error('Failed to discover domains', {
        directory: skillsDirectory,
        error: error instanceof Error ? error.message : String(error),
      });
      // Fail gracefully: return empty list rather than crashing
      return Promise.resolve([]);
    }
  }

  /**
   * Get domain config entry, or null if not in domains.json.
   */
  public getDomainConfig(domain: string): DomainConfig | null {
    return this.domains[domain] || null;
  }

  /**
   * Get domain defaults: returns the config entry if present,
   * otherwise returns sensible defaults (role=reference, scope=implementation).
   */
  public getDomainDefaults(domain: string): DomainConfig {
    const config = this.domains[domain];
    if (config) {
      return config;
    }
    // Sensible defaults for domains not in config
    return {
      role: 'reference',
      scope: 'implementation',
      contentTypes: ['code', 'guidance'],
      description: `Skills in the ${domain} domain`,
    };
  }

  /**
   * Get all known domains: union of discovered directories + config entries.
   */
  public async getAllDomains(skillsDirectory: string): Promise<string[]> {
    const discovered = await this.discoverDomains(skillsDirectory);
    const configDomains = Object.keys(this.domains);
    const all = new Set([...discovered, ...configDomains]);
    return Array.from(all).sort();
  }

  /**
   * Get just the config-based domain names (without directory scan).
   */
  public getConfigDomainNames(): string[] {
    return Object.keys(this.domains).sort();
  }

  /**
   * Check if a domain has a config entry.
   */
  public hasDomainConfig(domain: string): boolean {
    return domain in this.domains;
  }

  /**
   * Get the number of configured domains.
   */
  public getDomainCount(): number {
    return Object.keys(this.domains).length;
  }
}
