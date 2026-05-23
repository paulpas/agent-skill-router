// Tests for DomainRegistry
import fs from 'fs';
import path from 'path';
import { DomainRegistry } from '../core/DomainRegistry';

describe('DomainRegistry', () => {
  let skillsDir: string;

  beforeEach(() => {
    // Create temp skills directory with multiple domain subdirectories
    skillsDir = path.join(__dirname, '.domain-test-' + Date.now());
    fs.mkdirSync(skillsDir, { recursive: true });

    // Create a few domain directories so discoverDomains has something to find
    ['test-domain-alpha', 'test-domain-beta', 'test-domain-gamma'].forEach((dir) => {
      fs.mkdirSync(path.join(skillsDir, dir), { recursive: true });
    });
  });

  afterEach(() => {
    // Clean up temp directory
    if (fs.existsSync(skillsDir)) {
      fs.rmSync(skillsDir, { recursive: true, force: true });
    }
    // Reset singleton to avoid leaking state between tests
    DomainRegistry.resetInstance();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance from multiple getInstance() calls', () => {
      const instance1 = DomainRegistry.getInstance();
      const instance2 = DomainRegistry.getInstance();
      const instance3 = DomainRegistry.getInstance();

      expect(instance1).toBe(instance2);
      expect(instance2).toBe(instance3);
    });

    it('should return a new instance after resetInstance()', () => {
      const instance1 = DomainRegistry.getInstance();
      DomainRegistry.resetInstance();
      const instance2 = DomainRegistry.getInstance();

      expect(instance1).not.toBe(instance2);
    });
  });

  describe('loadDomainsConfig', () => {
    it('should load domains from the default config file', () => {
      const registry = DomainRegistry.getInstance();
      registry.loadDomainsConfig();

      expect(registry.getDomainCount()).toBe(8);
      expect(registry.hasDomainConfig('agent')).toBe(true);
      expect(registry.hasDomainConfig('trading')).toBe(true);
      expect(registry.hasDomainConfig('go')).toBe(true);
      expect(registry.hasDomainConfig('linux')).toBe(true);
      expect(registry.hasDomainConfig('writing')).toBe(true);
    });

    it('should load a specific domain config with correct properties', () => {
      const registry = DomainRegistry.getInstance();
      registry.loadDomainsConfig();

      const agentConfig = registry.getDomainConfig('agent');
      expect(agentConfig).not.toBeNull();
      expect(agentConfig!.role).toBe('orchestration');
      expect(agentConfig!.scope).toBe('orchestration');
      expect(agentConfig!.contentTypes).toEqual(['guidance', 'examples', 'do-dont']);
      expect(agentConfig!.description).toBe('Agent orchestration and choreography skills');
    });

    it('should handle missing config path gracefully', () => {
      const registry = DomainRegistry.getInstance(path.join(__dirname, '.nonexistent-domains.json'));
      registry.loadDomainsConfig();

      // Should not throw; should have 0 domains loaded
      expect(registry.getDomainCount()).toBe(0);
    });
  });

  describe('discoverDomains', () => {
    it('should discover domain directories from filesystem', async () => {
      const registry = DomainRegistry.getInstance();
      const domains = await registry.discoverDomains(skillsDir);

      expect(Array.isArray(domains)).toBe(true);
      expect(domains).toContain('test-domain-alpha');
      expect(domains).toContain('test-domain-beta');
      expect(domains).toContain('test-domain-gamma');
      expect(domains.length).toBe(3);
    });

    it('should return sorted domain names', async () => {
      const registry = DomainRegistry.getInstance();
      const domains = await registry.discoverDomains(skillsDir);

      const sorted = [...domains].sort();
      expect(domains).toEqual(sorted);
    });

    it('should return empty array for non-existent directory', async () => {
      const registry = DomainRegistry.getInstance();
      const domains = await registry.discoverDomains('/nonexistent/path/that/does/not/exist');

      expect(domains).toEqual([]);
      expect(domains.length).toBe(0);
    });
  });

  describe('getDomainConfig', () => {
    beforeEach(() => {
      const registry = DomainRegistry.getInstance();
      registry.loadDomainsConfig();
    });

    it('should return null for unknown domains', () => {
      const registry = DomainRegistry.getInstance();
      const config = registry.getDomainConfig('unknown-nonexistent-domain');

      expect(config).toBeNull();
    });

    it('should return full config for known domains', () => {
      const registry = DomainRegistry.getInstance();
      const config = registry.getDomainConfig('coding');

      expect(config).not.toBeNull();
      expect(config!.role).toBe('implementation');
      expect(config!.scope).toBe('implementation');
      expect(config!.contentTypes).toContain('code');
      expect(config!.description).toContain('coding');
    });
  });

  describe('getDomainDefaults', () => {
    beforeEach(() => {
      const registry = DomainRegistry.getInstance();
      registry.loadDomainsConfig();
    });

    it('should return config entry for domains that have one', () => {
      const registry = DomainRegistry.getInstance();
      const defaults = registry.getDomainDefaults('agent');

      expect(defaults.role).toBe('orchestration');
      expect(defaults.scope).toBe('orchestration');
      expect(defaults.description).toBe('Agent orchestration and choreography skills');
    });

    it('should return sensible defaults for domains not in config', () => {
      const registry = DomainRegistry.getInstance();
      const defaults = registry.getDomainDefaults('undiscovered-domain');

      expect(defaults.role).toBe('reference');
      expect(defaults.scope).toBe('implementation');
      expect(defaults.contentTypes).toEqual(['code', 'guidance']);
      expect(defaults.description).toBe('Skills in the undiscovered-domain domain');
    });

    it('should return defaults with correct type structure', () => {
      const registry = DomainRegistry.getInstance();
      const defaults = registry.getDomainDefaults('any-domain');

      expect(defaults).toHaveProperty('role');
      expect(defaults).toHaveProperty('scope');
      expect(defaults).toHaveProperty('contentTypes');
      expect(Array.isArray(defaults.contentTypes)).toBe(true);
      expect(defaults).toHaveProperty('description');
    });
  });

  describe('getAllDomains', () => {
    beforeEach(() => {
      const registry = DomainRegistry.getInstance();
      registry.loadDomainsConfig();
    });

    it('should return union of discovered and config domains', async () => {
      const registry = DomainRegistry.getInstance();
      const allDomains = await registry.getAllDomains(skillsDir);

      // Should include config domains
      expect(allDomains).toContain('agent');
      expect(allDomains).toContain('coding');
      expect(allDomains).toContain('trading');

      // Should include discovered domains
      expect(allDomains).toContain('test-domain-alpha');
      expect(allDomains).toContain('test-domain-beta');
    });

    it('should return sorted domain names', async () => {
      const registry = DomainRegistry.getInstance();
      const allDomains = await registry.getAllDomains(skillsDir);

      const sorted = [...allDomains].sort();
      expect(allDomains).toEqual(sorted);
    });

    it('should not include duplicates when discovered and config overlap', async () => {
      const registry = DomainRegistry.getInstance();
      // "coding" is both a config domain and we can create a matching dir
      const overlappingDir = path.join(skillsDir, 'coding');
      fs.mkdirSync(overlappingDir, { recursive: true });

      const allDomains = await registry.getAllDomains(skillsDir);

      // Should still be a single entry
      const codingCount = allDomains.filter((d) => d === 'coding').length;
      expect(codingCount).toBe(1);

      // Clean up
      fs.rmSync(overlappingDir, { recursive: true, force: true });
    });

    it('should return all 8 config domains plus 3 discovered domains', async () => {
      const registry = DomainRegistry.getInstance();
      const allDomains = await registry.getAllDomains(skillsDir);

      expect(allDomains.length).toBe(11); // 8 config + 3 discovered
    });
  });

  describe('getConfigDomainNames', () => {
    beforeEach(() => {
      const registry = DomainRegistry.getInstance();
      registry.loadDomainsConfig();
    });

    it('should return config-based domain names without directory scan', () => {
      const registry = DomainRegistry.getInstance();
      const names = registry.getConfigDomainNames();

      expect(names).toEqual(['agent', 'cncf', 'coding', 'go', 'linux', 'programming', 'trading', 'writing']);
    });

    it('should return sorted domain names', () => {
      const registry = DomainRegistry.getInstance();
      const names = registry.getConfigDomainNames();

      const sorted = [...names].sort();
      expect(names).toEqual(sorted);
    });

    it('should not include discovered-only domains', () => {
      const registry = DomainRegistry.getInstance();
      const names = registry.getConfigDomainNames();

      expect(names).not.toContain('test-domain-alpha');
      expect(names).not.toContain('test-domain-beta');
    });
  });

  describe('hasDomainConfig', () => {
    beforeEach(() => {
      const registry = DomainRegistry.getInstance();
      registry.loadDomainsConfig();
    });

    it('should return true for domains with config entries', () => {
      const registry = DomainRegistry.getInstance();
      expect(registry.hasDomainConfig('agent')).toBe(true);
      expect(registry.hasDomainConfig('cncf')).toBe(true);
      expect(registry.hasDomainConfig('coding')).toBe(true);
      expect(registry.hasDomainConfig('programming')).toBe(true);
      expect(registry.hasDomainConfig('trading')).toBe(true);
      expect(registry.hasDomainConfig('go')).toBe(true);
      expect(registry.hasDomainConfig('linux')).toBe(true);
      expect(registry.hasDomainConfig('writing')).toBe(true);
    });

    it('should return false for domains without config entries', () => {
      const registry = DomainRegistry.getInstance();
      expect(registry.hasDomainConfig('unknown-domain')).toBe(false);
      expect(registry.hasDomainConfig('')).toBe(false);
      expect(registry.hasDomainConfig('test-domain-alpha')).toBe(false);
    });
  });

  describe('getDomainCount', () => {
    it('should return 0 before loading config', () => {
      const registry = DomainRegistry.getInstance();
      expect(registry.getDomainCount()).toBe(0);
    });

    it('should return correct count after loading config', () => {
      const registry = DomainRegistry.getInstance();
      registry.loadDomainsConfig();

      expect(registry.getDomainCount()).toBe(8);
    });
  });
});
