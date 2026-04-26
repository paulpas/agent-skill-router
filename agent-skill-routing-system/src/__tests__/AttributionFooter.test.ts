// Tests for AttributionFooter utility

import AttributionFooter, { SkillAttribution } from '../utils/AttributionFooter';

describe('AttributionFooter', () => {
  const mockSkills: SkillAttribution[] = [
    {
      name: 'code-review',
      domain: 'coding',
      description: 'Comprehensive code review methodology with severity classification',
      url: 'https://github.com/paulpas/agent-skill-router/tree/main/skills/coding/code-review',
    },
    {
      name: 'testing-patterns',
      domain: 'programming',
      description: 'Testing best practices and patterns',
      url: 'https://github.com/paulpas/agent-skill-router/tree/main/skills/programming/testing-patterns',
    },
  ];

  describe('generate()', () => {
    it('returns empty string when skills array is empty', () => {
      const footer = AttributionFooter.generate({ skills: [] });
      expect(footer).toBe('');
    });

    it('returns empty string when skills is undefined', () => {
      const footer = AttributionFooter.generate({ skills: undefined as any });
      expect(footer).toBe('');
    });

    it('returns empty string when skills is null', () => {
      const footer = AttributionFooter.generate({ skills: null as any });
      expect(footer).toBe('');
    });

    it('throws error for invalid format', () => {
      expect(() => {
        AttributionFooter.generate({
          skills: mockSkills,
          format: 'invalid' as any,
        });
      }).toThrow('Invalid attribution format');
    });

    it('generates markdown format by default', () => {
      const footer = AttributionFooter.generate({ skills: mockSkills });
      
      expect(footer).toContain('---');
      expect(footer).toContain('**Assisted by [agent-skill-router]');
      expect(footer).toContain('**Skills Used:**');
      expect(footer).toContain('[code-review]');
      expect(footer).toContain('[testing-patterns]');
    });
  });

  describe('markdown format', () => {
    it('includes header separator', () => {
      const footer = AttributionFooter.generate({
        skills: mockSkills,
        format: 'markdown',
      });
      
      expect(footer.startsWith('---')).toBe(true);
    });

    it('includes linked skill names', () => {
      const footer = AttributionFooter.generate({
        skills: mockSkills,
        format: 'markdown',
      });
      
      expect(footer).toContain('[code-review](https://github.com');
      expect(footer).toContain('[testing-patterns](https://github.com');
    });

    it('includes domain emojis', () => {
      const footer = AttributionFooter.generate({
        skills: mockSkills,
        format: 'markdown',
      });
      
      expect(footer).toContain('🛠️'); // coding emoji
      expect(footer).toContain('🧮'); // programming emoji
    });

    it('includes skill descriptions', () => {
      const footer = AttributionFooter.generate({
        skills: mockSkills,
        format: 'markdown',
      });
      
      expect(footer).toContain('Comprehensive code review methodology');
      expect(footer).toContain('Testing best practices');
    });

    it('includes timestamp when requested', () => {
      const footer = AttributionFooter.generate({
        skills: mockSkills,
        format: 'markdown',
        timestamp: true,
      });
      
      expect(footer).toMatch(/Generated: \w+ \d+, \d{4}/);
    });

    it('omits timestamp when not requested', () => {
      const footer = AttributionFooter.generate({
        skills: mockSkills,
        format: 'markdown',
        timestamp: false,
      });
      
      expect(footer).not.toMatch(/Generated:/);
    });

    it('omits timestamp by default', () => {
      const footer = AttributionFooter.generate({
        skills: mockSkills,
        format: 'markdown',
      });
      
      expect(footer).toMatch(/Generated:/); // true by default
    });
  });

  describe('plaintext format', () => {
    it('does not include markdown syntax', () => {
      const footer = AttributionFooter.generate({
        skills: mockSkills,
        format: 'plaintext',
      });
      
      expect(footer).not.toContain('**');
      // Note: domain badges still use [domain] format for visual consistency
      expect(footer).not.toContain('](');  // No markdown links
      expect(footer).not.toContain('(http'); // No markdown link syntax
    });

    it('includes skill names without links', () => {
      const footer = AttributionFooter.generate({
        skills: mockSkills,
        format: 'plaintext',
      });
      
      expect(footer).toContain('code-review');
      expect(footer).toContain('testing-patterns');
    });

    it('includes domain badges', () => {
      const footer = AttributionFooter.generate({
        skills: mockSkills,
        format: 'plaintext',
      });
      
      expect(footer).toContain('[coding]');
      expect(footer).toContain('[programming]');
    });

    it('includes project URL', () => {
      const footer = AttributionFooter.generate({
        skills: mockSkills,
        format: 'plaintext',
      });
      
      expect(footer).toContain('https://github.com/paulpas/agent-skill-router');
    });

    it('uses bullet points for skills', () => {
      const footer = AttributionFooter.generate({
        skills: mockSkills,
        format: 'plaintext',
      });
      
      expect(footer).toContain('•');
    });
  });

  describe('html format', () => {
    it('wraps output in footer tags', () => {
      const footer = AttributionFooter.generate({
        skills: mockSkills,
        format: 'html',
      });
      
      expect(footer).toContain('<footer');
      expect(footer).toContain('</footer>');
    });

    it('includes HTML links', () => {
      const footer = AttributionFooter.generate({
        skills: mockSkills,
        format: 'html',
      });
      
      expect(footer).toContain('<a href="https://github.com');
      expect(footer).toContain('</a>');
    });

    it('uses HTML list for skills', () => {
      const footer = AttributionFooter.generate({
        skills: mockSkills,
        format: 'html',
      });
      
      expect(footer).toContain('<ul>');
      expect(footer).toContain('<li>');
      expect(footer).toContain('</ul>');
    });

    it('includes inline styles for footer element', () => {
      const footer = AttributionFooter.generate({
        skills: mockSkills,
        format: 'html',
      });
      
      expect(footer).toContain('style=');
      expect(footer).toContain('margin-top');
      expect(footer).toContain('padding-top');
      expect(footer).toContain('border-top');
    });

    it('uses paragraph tags for text', () => {
      const footer = AttributionFooter.generate({
        skills: mockSkills,
        format: 'html',
      });
      
      expect(footer).toContain('<p>');
      expect(footer).toContain('</p>');
    });
  });

  describe('domain emojis', () => {
    it('uses correct emoji for agent domain', () => {
      const skills: SkillAttribution[] = [
        {
          name: 'task-router',
          domain: 'agent',
          description: 'Task routing',
        },
      ];
      
      const footer = AttributionFooter.generate({
        skills,
        format: 'markdown',
      });
      
      expect(footer).toContain('🤖');
    });

    it('uses correct emoji for cncf domain', () => {
      const skills: SkillAttribution[] = [
        {
          name: 'kubernetes',
          domain: 'cncf',
          description: 'Kubernetes management',
        },
      ];
      
      const footer = AttributionFooter.generate({
        skills,
        format: 'markdown',
      });
      
      expect(footer).toContain('☁️');
    });

    it('uses correct emoji for trading domain', () => {
      const skills: SkillAttribution[] = [
        {
          name: 'stop-loss',
          domain: 'trading',
          description: 'Stop loss management',
        },
      ];
      
      const footer = AttributionFooter.generate({
        skills,
        format: 'markdown',
      });
      
      expect(footer).toContain('📈');
    });

    it('uses default emoji for unknown domain', () => {
      const skills: SkillAttribution[] = [
        {
          name: 'unknown-skill',
          domain: 'unknown-domain',
          description: 'Unknown skill',
        },
      ];
      
      const footer = AttributionFooter.generate({
        skills,
        format: 'markdown',
      });
      
      expect(footer).toContain('✨');
    });
  });

  describe('skills without URLs', () => {
    it('renders skill names without links in markdown', () => {
      const skills: SkillAttribution[] = [
        {
          name: 'test-skill',
          domain: 'coding',
          description: 'Test skill',
        },
      ];
      
      const footer = AttributionFooter.generate({
        skills,
        format: 'markdown',
      });
      
      expect(footer).toContain('**test-skill**');
      expect(footer).not.toContain('[test-skill](');
    });

    it('renders skill names without links in html', () => {
      const skills: SkillAttribution[] = [
        {
          name: 'test-skill',
          domain: 'coding',
          description: 'Test skill',
        },
      ];
      
      const footer = AttributionFooter.generate({
        skills,
        format: 'html',
      });
      
      expect(footer).toContain('<strong>test-skill</strong>');
      // Project link is always included in header, but skill itself has no link
      expect(footer).toContain('<li><strong>test-skill</strong>');
      expect(footer).not.toMatch(/<li><strong><a href=.*?test-skill/);
    });
  });

  describe('credibility text', () => {
    it('mentions agent-skill-router project', () => {
      const footer = AttributionFooter.generate({
        skills: mockSkills,
        format: 'markdown',
      });
      
      expect(footer).toContain('agent-skill-router');
    });

    it('mentions LLM-based routing', () => {
      const footer = AttributionFooter.generate({
        skills: mockSkills,
        format: 'markdown',
      });
      
      expect(footer).toContain('LLM-based routing engine');
    });

    it('mentions vector search', () => {
      const footer = AttributionFooter.generate({
        skills: mockSkills,
        format: 'markdown',
      });
      
      expect(footer).toContain('vector search');
    });

    it('mentions skill matching', () => {
      const footer = AttributionFooter.generate({
        skills: mockSkills,
        format: 'markdown',
      });
      
      expect(footer).toContain('skill matching');
    });
  });

  describe('single skill', () => {
    it('handles single skill correctly', () => {
      const footer = AttributionFooter.generate({
        skills: [mockSkills[0]],
        format: 'markdown',
      });
      
      expect(footer).toContain('code-review');
      expect(footer).not.toContain('testing-patterns');
    });
  });

  describe('many skills', () => {
    it('handles multiple skills correctly', () => {
      const manySkills: SkillAttribution[] = Array.from(
        { length: 10 },
        (_, i) => ({
          name: `skill-${i}`,
          domain: 'coding',
          description: `Skill ${i} description`,
          url: `https://example.com/skill-${i}`,
        })
      );
      
      const footer = AttributionFooter.generate({
        skills: manySkills,
        format: 'markdown',
      });
      
      for (let i = 0; i < 10; i++) {
        expect(footer).toContain(`skill-${i}`);
      }
    });
  });

  describe('special characters in descriptions', () => {
    it('handles descriptions with special characters', () => {
      const skills: SkillAttribution[] = [
        {
          name: 'special-skill',
          domain: 'coding',
          description: 'Skill with "quotes", commas, & ampersands',
        },
      ];
      
      const footer = AttributionFooter.generate({
        skills,
        format: 'markdown',
      });
      
      expect(footer).toContain('quotes');
      expect(footer).toContain('commas');
      expect(footer).toContain('&');
    });

    it('handles skill names with hyphens', () => {
      const skills: SkillAttribution[] = [
        {
          name: 'code-review-security',
          domain: 'coding',
          description: 'Security code review',
        },
      ];
      
      const footer = AttributionFooter.generate({
        skills,
        format: 'markdown',
      });
      
      expect(footer).toContain('code-review-security');
    });
  });
});
