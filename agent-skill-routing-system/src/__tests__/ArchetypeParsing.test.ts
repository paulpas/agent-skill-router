// Tests for archetype, anti-trigger, and response-profile parsing in SkillRegistry
import { SkillRegistry } from '../core/SkillRegistry';

/** Build a minimal SKILL.md markdown string with frontmatter */
function buildMarkdown(name: string, metadataYaml: string): string {
  return `---\nname: ${name}\ndescription: A test skill\nmetadata:\n${metadataYaml}\n---\n# ${name}\n\nThis is a test skill.\n`;
}

describe('ArchetypeParsing', () => {
  let registry: SkillRegistry;

  beforeEach(() => {
    registry = new SkillRegistry({ skillsDirectory: __dirname });
  });

  afterEach(() => {
    // Shutdown registry to cleanup timers and prevent async warnings
    registry.shutdown();
  });

  // --- Archetypes: YAML array ---
  describe('parsing archetypes from YAML array', () => {
    it('extracts archetype list from YAML array format', () => {
      const md = buildMarkdown('test-yaml-array-skill', [
        '  archetypes:',
        '    - tactical',
        '    - diagnostic',
      ].join('\n'));

      const meta = registry.parseSkillFromMarkdown(md, 'test.yaml');
      expect(meta.archetypes).toEqual(['tactical', 'diagnostic']);
    });
  });

  // --- Archetypes: comma-separated string ---
  describe('parsing archetypes from comma-separated string', () => {
    it('extracts archetype list from comma-separated string', () => {
      const md = buildMarkdown('test-csv-archetype-skill', '  archetypes: tactical, strategic');

      const meta = registry.parseSkillFromMarkdown(md, 'test.yaml');
      expect(meta.archetypes).toEqual(['tactical', 'strategic']);
    });
  });

  // --- AntiTriggers: YAML array ---
  describe('parsing anti_triggers from YAML array', () => {
    it('extracts anti-triggers from YAML array format', () => {
      const md = buildMarkdown('test-anti-yaml-skill', [
        '  anti_triggers:',
        '    - brainstorming',
        '    - vague ideation',
      ].join('\n'));

      const meta = registry.parseSkillFromMarkdown(md, 'test.yaml');
      expect(meta.antiTriggers).toEqual(['brainstorming', 'vague ideation']);
    });
  });

  // --- AntiTriggers: comma-separated string ---
  describe('parsing anti_triggers from comma-separated string', () => {
    it('extracts anti-triggers from comma-separated string', () => {
      const md = buildMarkdown('test-anti-csv-skill',
        '  anti_triggers: brainstorming, vague ideation, long-form content generation'
      );

      const meta = registry.parseSkillFromMarkdown(md, 'test.yaml');
      expect(meta.antiTriggers).toEqual(['brainstorming', 'vague ideation', 'long-form content generation']);
    });
  });

  // --- ResponseProfile: nested object ---
  describe('parsing response_profile nested object', () => {
    it('extracts verbosity, directive_strength, and abstraction_level', () => {
      const md = buildMarkdown('test-rp-skill', [
        '  response_profile:',
        '    verbosity: low',
        '    directive_strength: high',
        '    abstraction_level: operational',
      ].join('\n'));

      const meta = registry.parseSkillFromMarkdown(md, 'test.yaml');

      expect(meta.responseProfile).toBeDefined();
      expect(meta.responseProfile!.verbosity).toBe('low');
      expect(meta.responseProfile!.directiveStrength).toBe('high');
      expect(meta.responseProfile!.abstractionLevel).toBe('operational');
    });

    it('handles all valid verbosity values', () => {
      for (const level of ['low', 'medium', 'high'] as const) {
        const md = buildMarkdown(`test-rp-${level}-skill`, [
          '  response_profile:',
          `    verbosity: ${level}`,
          '    directive_strength: medium',
          '    abstraction_level: tactical',
        ].join('\n'));

        const meta = registry.parseSkillFromMarkdown(md, 'test.yaml');
        expect(meta.responseProfile!.verbosity).toBe(level);
      }
    });

    it('handles all valid abstraction levels', () => {
      for (const level of ['operational', 'tactical', 'strategic'] as const) {
        const md = buildMarkdown(`test-rp-abs-${level}-skill`, [
          '  response_profile:',
          '    verbosity: low',
          '    directive_strength: medium',
          `    abstraction_level: ${level}`,
        ].join('\n'));

        const meta = registry.parseSkillFromMarkdown(md, 'test.yaml');
        expect(meta.responseProfile!.abstractionLevel).toBe(level);
      }
    });
  });

  // --- Graceful handling when fields are missing ---
  describe('graceful handling when optional fields are missing', () => {
    it('returns undefined archetypes when not present', () => {
      const meta = registry.parseSkillFromMarkdown(buildMarkdown('test-no-archetype-skill', ''), 'test.yaml');
      expect(meta.archetypes).toBeUndefined();
    });

    it('returns undefined antiTriggers when not present', () => {
      const meta = registry.parseSkillFromMarkdown(buildMarkdown('test-no-anti-skill', ''), 'test.yaml');
      expect(meta.antiTriggers).toBeUndefined();
    });

    it('returns undefined responseProfile when not present', () => {
      const meta = registry.parseSkillFromMarkdown(buildMarkdown('test-no-rp-skill', ''), 'test.yaml');
      expect(meta.responseProfile).toBeUndefined();
    });

    it('does not throw when frontmatter is completely absent', () => {
      const md = `# No frontmatter skill\n\nThis file has no YAML delimiters.\n`;

      expect(() => registry.parseSkillFromMarkdown(md, 'test.yaml')).not.toThrow();
    });
  });

  // --- Mixed case handling ---
  describe('mixed case handling', () => {
    it('normalizes Verbosity: HIGH to low-case "high"', () => {
      const md = buildMarkdown('test-case-upper-skill', [
        '  response_profile:',
        '    verbosity: HIGH',
        '    directive_strength: LOW',
        '    abstraction_level: OPERATIONAL',
      ].join('\n'));

      const meta = registry.parseSkillFromMarkdown(md, 'test.yaml');
      expect(meta.responseProfile!.verbosity).toBe('high');
      expect(meta.responseProfile!.directiveStrength).toBe('low');
      expect(meta.responseProfile!.abstractionLevel).toBe('operational');
    });

    it('normalizes mixed-case archetype names', () => {
      const md = buildMarkdown('test-case-arch-skill', [
        '  archetypes:',
        '    - TACTICAL',
        '    - DiAgNoStIc',
      ].join('\n'));

      const meta = registry.parseSkillFromMarkdown(md, 'test.yaml');
      expect(meta.archetypes).toEqual(['tactical', 'diagnostic']);
    });

    it('normalizes comma-separated archetypes to lowercase', () => {
      const md = buildMarkdown('test-csv-case-skill', '  archetypes: Strategic, ORCHESTRATION');

      const meta = registry.parseSkillFromMarkdown(md, 'test.yaml');
      expect(meta.archetypes).toEqual(['strategic', 'orchestration']);
    });
  });

  // --- Edge cases ---
  describe('edge cases', () => {
    it('handles empty archetype array gracefully (returns undefined)', () => {
      const md = buildMarkdown('test-empty-arch-skill', '  archetypes: []');

      const meta = registry.parseSkillFromMarkdown(md, 'test.yaml');
      expect(meta.archetypes).toBeUndefined();
    });

    it('handles empty anti_triggers array gracefully (returns undefined)', () => {
      const md = buildMarkdown('test-empty-anti-skill', '  anti_triggers: []');

      const meta = registry.parseSkillFromMarkdown(md, 'test.yaml');
      expect(meta.antiTriggers).toBeUndefined();
    });

    it('handles response_profile with partial fields (missing directive_strength and abstraction_level)', () => {
      const md = buildMarkdown('test-partial-rp-skill', [
        '  response_profile:',
        '    verbosity: high',
      ].join('\n'));

      const meta = registry.parseSkillFromMarkdown(md, 'test.yaml');

      expect(meta.responseProfile).toBeDefined();
      expect(meta.responseProfile!.verbosity).toBe('high');
      // Should use sensible defaults for missing fields
      expect(meta.responseProfile!.directiveStrength).toBe('medium');
      expect(meta.responseProfile!.abstractionLevel).toBe('tactical');
    });

    it('ignores invalid verbosity values and returns undefined responseProfile', () => {
      const md = buildMarkdown('test-invalid-verbosity-skill', [
        '  response_profile:',
        '    verbosity: ultra',
        '    directive_strength: high',
        '    abstraction_level: strategic',
      ].join('\n'));

      const meta = registry.parseSkillFromMarkdown(md, 'test.yaml');

      // Invalid verbosity should result in undefined responseProfile
      expect(meta.responseProfile).toBeUndefined();
    });

    it('handles snake_case YAML keys with dashes (anti_triggers)', () => {
      const md = buildMarkdown('test-snake-skill', [
        '  anti_triggers:',
        '    - security audit',
        '    - compliance check',
      ].join('\n'));

      const meta = registry.parseSkillFromMarkdown(md, 'test.yaml');
      expect(meta.antiTriggers).toEqual(['security audit', 'compliance check']);
    });
  });
});
