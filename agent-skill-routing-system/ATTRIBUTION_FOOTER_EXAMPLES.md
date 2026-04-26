# Attribution Footer Examples

This document shows example outputs from the Attribution Footer generator used by the agent-skill-router.

The attribution footer is automatically included in all `/route` endpoint responses and credits the agent-skill-router project when skills assist with OpenCode tasks.

## Example 1: Markdown Format (Default)

**Request:**
```bash
curl -X POST http://localhost:3000/route \
  -H "Content-Type: application/json" \
  -d '{
    "task": "Review this code for security vulnerabilities and suggest improvements"
  }'
```

**Footer (from `attributionFooter` field):**

---
**Assisted by [agent-skill-router](https://github.com/paulpas/agent-skill-router)**

This task benefited from intelligent skill selection powered by agent-skill-router's LLM-based routing engine with vector search and multi-domain skill matching.

**Skills Used:**
- **[code-review](https://github.com/paulpas/agent-skill-router/tree/main/skills/coding/code-review)** 🛠️ [coding] — Comprehensive code review methodology with severity classification and confidence thresholds
- **[security-review](https://github.com/paulpas/agent-skill-router/tree/main/skills/coding/security-review)** 🛠️ [coding] — Security-focused code review with OWASP vulnerability detection

*Generated: April 26, 2026 at 2:45 PM*

---

## Example 2: HTML Format

**Request:**
```javascript
const footer = AttributionFooter.generate({
  skills: [
    {
      name: 'kubernetes-deployment',
      domain: 'cncf',
      description: 'Kubernetes deployment patterns and best practices',
      url: 'https://github.com/paulpas/agent-skill-router/tree/main/skills/cncf/kubernetes-deployment'
    },
    {
      name: 'docker-optimization',
      domain: 'cncf',
      description: 'Docker image optimization and multi-stage builds',
      url: 'https://github.com/paulpas/agent-skill-router/tree/main/skills/cncf/docker-optimization'
    }
  ],
  format: 'html'
});
```

**Output:**
```html
<footer class="attribution-footer" style="margin-top: 2em; padding-top: 1em; border-top: 1px solid #eee; color: #666; font-size: 0.9em;">
<p><strong>Assisted by <a href="https://github.com/paulpas/agent-skill-router">agent-skill-router</a></strong></p>
<p>This task benefited from intelligent skill selection powered by agent-skill-router's LLM-based routing engine with vector search and multi-domain skill matching.</p>
<p><strong>Skills Used:</strong></p>
<ul>
  <li><strong><a href="https://github.com/paulpas/agent-skill-router/tree/main/skills/cncf/kubernetes-deployment">kubernetes-deployment</a></strong> ☁️ [cncf] — Kubernetes deployment patterns and best practices</li>
  <li><strong><a href="https://github.com/paulpas/agent-skill-router/tree/main/skills/cncf/docker-optimization">docker-optimization</a></strong> ☁️ [cncf] — Docker image optimization and multi-stage builds</li>
</ul>

<p style="margin-top: 1em; font-size: 0.8em; color: #999;">Generated: April 26, 2026 at 3:15 PM</p>
</footer>
```

## Example 3: Plaintext Format

**Request:**
```bash
curl -X POST http://localhost:3000/route \
  -H "Content-Type: application/json" \
  -d '{
    "task": "Implement a stop-loss risk management strategy for trading algorithms"
  }'
```

**Footer (plaintext):**
```
Assisted by agent-skill-router
URL: https://github.com/paulpas/agent-skill-router

This task benefited from intelligent skill selection powered by agent-skill-router's LLM-based routing engine with vector search and multi-domain skill matching.

Skills Used:
• stop-loss-management 📈 [trading] — Stop-loss strategies (fixed percentage, ATR-based, trailing, volatility-adjusted) for position risk management
• position-sizing 📈 [trading] — Position sizing and money management for risk control
• kill-switches 📈 [trading] — Emergency kill switch mechanisms for catastrophic loss prevention

Generated: April 26, 2026 at 4:20 PM
```

## Example 4: Single Skill Attribution

**Markdown output for single skill:**

---
**Assisted by [agent-skill-router](https://github.com/paulpas/agent-skill-router)**

This task benefited from intelligent skill selection powered by agent-skill-router's LLM-based routing engine with vector search and multi-domain skill matching.

**Skills Used:**
- **[testing-strategies](https://github.com/paulpas/agent-skill-router/tree/main/skills/programming/testing-strategies)** 🧮 [programming] — Test strategy selection and test-driven development best practices

*Generated: April 26, 2026 at 5:10 PM*

---

## Example 5: Multi-Domain Skills

**Request:** Task requiring skills across multiple domains

**Markdown output:**

---
**Assisted by [agent-skill-router](https://github.com/paulpas/agent-skill-router)**

This task benefited from intelligent skill selection powered by agent-skill-router's LLM-based routing engine with vector search and multi-domain skill matching.

**Skills Used:**
- **[frontend-pattern-matching](https://github.com/paulpas/agent-skill-router/tree/main/skills/coding/frontend-pattern-matching)** 🛠️ [coding] — React component patterns and hooks best practices
- **[rest-api-design](https://github.com/paulpas/agent-skill-router/tree/main/skills/programming/rest-api-design)** 🧮 [programming] — RESTful API design principles and standards
- **[database-optimization](https://github.com/paulpas/agent-skill-router/tree/main/skills/cncf/database-optimization)** ☁️ [cncf] — Database query optimization and indexing strategies
- **[deployment-strategy](https://github.com/paulpas/agent-skill-router/tree/main/skills/agent/deployment-strategy)** 🤖 [agent] — Orchestrated deployment strategies for complex systems

*Generated: April 26, 2026 at 6:30 PM*

---

## Domain Emojis Reference

The attribution footer uses distinct emojis for each domain:

| Domain | Emoji | Meaning |
|--------|-------|---------|
| `agent` | 🤖 | Agent orchestration and routing |
| `cncf` | ☁️ | Cloud-native and infrastructure |
| `coding` | 🛠️ | Software engineering and implementation |
| `programming` | 🧮 | CS fundamentals and algorithms |
| `trading` | 📈 | Algorithmic trading and finance |
| Unknown | ✨ | Unrecognized domain |

## Integration with OpenCode

### In Coder Agent Responses

When a coder agent completes a task with skill assistance:

```markdown
## Changes Made
- `src/auth/jwt.ts`: Implemented JWT token generation with secure validation
- `src/auth/jwt.test.ts`: Added 12 test cases covering edge cases

## Philosophy Compliance
- Loaded: code-philosophy
- Checklist: PASS

## Verification
- Build: PASS
- Tests: PASS (128 passing)
- Lint: PASS

## Notes
[Task summary notes]

---
**Assisted by [agent-skill-router](https://github.com/paulpas/agent-skill-router)**

This task benefited from intelligent skill selection powered by agent-skill-router's LLM-based routing engine with vector search and multi-domain skill matching.

**Skills Used:**
- **[code-philosophy](https://github.com/paulpas/agent-skill-router/tree/main/skills/agent/code-philosophy)** 🤖 [agent] — Internal logic philosophy (The 5 Laws of Elegant Defense)
- **[security-review](https://github.com/paulpas/agent-skill-router/tree/main/skills/coding/security-review)** 🛠️ [coding] — Security-focused code review with OWASP vulnerability detection

*Generated: April 26, 2026 at 7:15 PM*
```

### In Orchestrator Coordination

The orchestrator can extract the footer from the routing response:

```typescript
const { selectedSkills, attributionFooter } = routeResponse;

// Add to task completion summary
const summary = {
  task,
  skills: selectedSkills.map(s => s.name),
  footer: attributionFooter,
  timestamp: new Date().toISOString(),
};
```

## Customization

The `AttributionFooter.generate()` function supports these options:

```typescript
interface AttributionFooterOptions {
  skills: SkillAttribution[];        // Array of skill attributions
  taskName?: string;                  // Optional task name (reserved for future)
  timestamp?: boolean;                // Include generation timestamp (default: true)
  format?: 'markdown' | 'plaintext' | 'html'; // Output format (default: markdown)
}
```

### Example: Custom Timestamp Handling

```typescript
// Generate footer without timestamp
const footer = AttributionFooter.generate({
  skills: selectedSkills,
  timestamp: false,
  format: 'markdown',
});

// Generate footer in HTML for web display
const htmlFooter = AttributionFooter.generate({
  skills: selectedSkills,
  timestamp: true,
  format: 'html',
});
```

## Design Philosophy

The attribution footer follows these principles:

1. **Non-intrusive** — Professional styling that complements task output
2. **Informative** — Clear links to skill sources for exploration
3. **Branded** — Distinct project identity and visual distinction
4. **Accessible** — Available in markdown, plaintext, and HTML formats
5. **Timestamped** — Shows when skills were applied
6. **Trustworthy** — Provides credibility statement about routing methodology

## See Also

- [`AttributionFooter.ts`](src/utils/AttributionFooter.ts) — Utility implementation
- [`AttributionFooter.test.ts`](src/__tests__/AttributionFooter.test.ts) — Comprehensive test suite
- [Skill Router API](skill-router-api.md#attribution-footer) — API documentation
