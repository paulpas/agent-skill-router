---
name: vercel-writing-guidelines
description: Enforces clear, concise, and user-focused writing guidelines covering tone, grammar, structure, formatting, and inclusive language for technical documentation and product copy.
license: MIT
compatibility: opencode
archetypes:
  - educational
  - enforcement
anti_triggers:
  - brainstorming
  - vague ideation
  - fiction writing
response_profile:
  verbosity: medium
  directive_strength: medium
  abstraction_level: tactical
metadata:
  version: "1.0.0"
  domain: writing
  triggers: writing guidelines, technical writing, documentation style, content guidelines, writing style guide, developer documentation, api docs
  role: reference
  scope: implementation
  output-format: report
  content-types:
    - guidance
    - examples
    - do-dont
  related-skills: technical-documentation, humanizer
  author: vercel
  source: https://github.com/vercel-labs/agent-skills
---

# Vercel Writing Guidelines

Enforces clear, concise, and user-focused writing guidelines for technical documentation, product copy, error messages, and developer-facing content. Covers voice and tone, grammar and mechanics, structure and information architecture, inclusive language, formatting conventions, and accessibility in writing. Apply these rules whenever producing text for documentation, UI labels, changelogs, API references, or developer guides.

## TL;DR Checklist

- [ ] Lead with active voice — subject acts, not is acted upon
- [ ] Keep sentences under 25 words where possible — one idea per sentence
- [ ] Use "you" and "we" for a conversational, approachable tone
- [ ] Replace jargon and buzzwords with plain language
- [ ] Use gender-neutral pronouns (they/them) — never assume gender
- [ ] Write descriptive link text — never "click here" or "read more"
- [ ] Include alt text for every image — describe its content and function

---

## When to Use

Use this skill when:

- Writing or editing technical documentation (API references, guides, tutorials, READMEs)
- Drafting product copy for UI labels, tooltips, empty states, error messages, and onboarding flows
- Creating changelogs, release notes, or migration guides for developer-facing content
- Reviewing documentation for clarity, consistency, and inclusive language
- Setting up a documentation style guide for a team or project
- Writing blog posts or technical articles targeting a developer audience
- Preparing documentation for localization or translation into multiple languages

---

## When NOT to Use

Avoid this skill for:

- Creative writing, fiction, or narrative prose — the guidelines are optimized for technical clarity
- Marketing copy or sales-focused content — use a persuasive, benefit-driven tone instead
- Legal documents, terms of service, or privacy policies — those require precise legal language
- Internal team chat messages, emails, or informal communication — the rules are too strict
- Scientific papers or academic writing — those follow different citation and style conventions
- Content explicitly requesting a formal, impersonal tone — adapt to the audience requirements

---

## Core Workflow

1. **Identify Audience and Purpose** — Determine who will read the content (developer, end-user, decision-maker) and what they need to accomplish after reading. Write with a single primary audience in mind. A guide for beginners uses different language than a reference for advanced users. **Checkpoint:** State the target audience and their goal in one sentence before writing — if you cannot, pause and clarify.

2. **Choose Appropriate Document Type** — Select the document format that matches the user's need: **tutorial** (step-by-step, learning-oriented), **how-to guide** (task-oriented, solves a specific problem), **reference** (fact-oriented, describes APIs or configuration), **explanation** (understanding-oriented, provides context and reasoning), or **release notes** (change-oriented, lists what is new or different). Each type has a distinct structure and depth. **Checkpoint:** The chosen document type must match the audience's primary need — not the writer's preference.

3. **Write Using Active Voice and Conversational Tone** — Use active voice: "The server starts the process" not "The process is started by the server." Address the reader directly using "you" and refer to the team with "we." Use contractions (don't, you'll, it's) for a natural, approachable tone. Replace passive constructions with active ones. **Checkpoint:** Scan the first paragraph — it should pass the "read aloud" test, sounding like one professional explaining to another.

4. **Structure Content with Clear Hierarchy** — Use the inverted pyramid: put the most important information first. Organize with descriptive headings that tell the reader what to expect (not "Overview" but "Setting Up Authentication"). Keep paragraphs to 3-5 sentences maximum. Use bulleted lists for parallel items and numbered lists for sequential steps. **Checkpoint:** A reader should understand the key takeaway by reading only the headings and the first sentence of each section.

5. **Review for Clarity, Conciseness, and Inclusivity** — Remove redundant words ("in order to" → "to," "utilize" → "use," "at this point in time" → "now"). Replace jargon with plain language. Check for gender-neutral language (use "they/them" as singular). Verify all cultural references and idioms are universally understandable — or remove them. **Checkpoint:** Read every sentence and remove any word that does not add meaning.

6. **Format for Accessibility** — Ensure every image has descriptive alt text. Write link text that describes the destination ("View the authentication API reference" not "click here"). Use plain language that is understandable by non-native English speakers. Avoid directional language ("the panel on the left") that is meaningless in screen readers. Use headings hierarchically (h1, then h2, then h3) without skipping levels. **Checkpoint:** Run the content through a readability tool — aim for a Flesch-Kincaid Grade Level of 8-10 for developer docs.

---

## Implementation Patterns

### Pattern 1: Voice and Tone (BAD vs. GOOD)

```markdown
### ❌ Before — Passive, wordy, and impersonal

The configuration of the environment variables should be done by the user prior to the
initialization of the deployment process. It is recommended that a `.env` file is created
in the root directory of the project. The values that are contained within that file will
then be utilized by the application at runtime.

### ✅ After — Active, concise, and conversational

Configure environment variables before deploying. Create a `.env` file in your project's
root directory. The application reads these values at runtime.

### ❌ Before — Jargon-filled and marketing-y

Leverage our cutting-edge platform to seamlessly orchestrate your deployment pipeline,
synergizing with your existing toolchain to drive optimal velocity and maximize developer
productivity.

### ✅ After — Clear and straightforward

Use the Vercel platform to automate your deployments. It integrates with your existing
tools and helps your team ship faster.
```

### Pattern 2: Inclusive and Accessible Language

```markdown
### ❌ Before — Assumes gender, uses ableist language, has non-descriptive links

The developer should configure his API key before running the application. This is a
simple configuration that even a blind man could follow. Click here for more information.

### ✅ After — Gender-neutral, inclusive, descriptive links

Configure your API key before running the application. The setup wizard guides you through
each step. View the [API key configuration guide](/docs/api-keys) for detailed instructions.

### ❌ Before — Idioms and culturally-specific references

Kill two birds with one stone by setting up CI/CD and testing in one pipeline. This is
the magic bullet for your deployment woes.

### ✅ After — Clear, idiomatic language (or removed references)

Set up CI/CD and testing in a single pipeline to save time. This approach addresses
the most common deployment challenges.
```

### Pattern 3: Sentence Structure and Clarity

```markdown
### ❌ Before — Run-on sentence with multiple ideas

The authentication middleware validates the incoming JWT token by checking its signature
against the public key stored in the environment configuration, and if the token is valid,
it extracts the user information from the payload and attaches it to the request object
so that downstream handlers can access the authenticated user's identity without needing
to re-validate the token.

### ✅ After — Broken into clear, single-idea sentences

The authentication middleware validates incoming JWT tokens. It checks the token signature
against the public key in your environment configuration. When valid, it extracts user
information from the payload and attaches it to the request object. Downstream handlers
can then access the authenticated user's identity without re-validating the token.

### ❌ Before — Nominalizations (verbs turned into nouns) make the text dense

The implementation of the feature requires the establishment of a database connection
and the configuration of the necessary environment variables for the purpose of
facilitating the authentication process.

### ✅ After — Strong verbs replace nominalizations

To implement this feature, connect to a database and configure the environment variables
required for authentication.
```

---

## Constraints

### MUST DO
- Use active voice — the subject performs the action: "The server starts" not "The server is started"
- Write for a global audience — avoid idioms ("hit the nail on the head"), cultural references ("Cinderella story"), and region-specific examples
- Use gender-neutral language — "they/them" for singular, "their" for possessive, never assume gender
- Include descriptive alt text for every image that conveys content — not just "screenshot" or "image"
- Keep sentences under 25 words where possible — break complex ideas into multiple sentences
- Use descriptive link text that explains the destination — "Learn about authentication" not "click here"
- Use consistent terminology throughout a document — do not swap between "server," "backend," "API endpoint," and "service" for the same concept

### MUST NOT DO
- Use jargon, buzzwords, or marketing language ("leverage," "synergize," "seamlessly," "cutting-edge," "best-in-class")
- Use "please" in instructional content — it adds unnecessary politeness and reduces clarity
- Write "note that" or "it is important to note that" — if it is important, state it directly
- Use "simply" or "just" in instructions — they imply the task is easy and may discourage the reader if they struggle
- Rely on directional cues ("below," "above," "on the left") — these are meaningless in screen readers and in reflowed layouts
- Use "click here" or "read more" as link text — screen readers navigate by link text and these provide no context
- Use Latin abbreviations (e.g., "i.e.," "e.g.,") — write "that is" or "for example" instead for clarity

---

## Output Template

When reviewing or producing documentation with this skill loaded, the output should follow this structure:

1. **Document Summary** — Target audience, primary goal, document type (tutorial, reference, etc.)
2. **Tone Assessment** — Whether the content achieves a conversational, confident, helpful tone
3. **Clarity Review** — Specific sentences that need restructuring, jargon removal, or simplification
4. **Inclusivity Check** — Any gendered language, ableist terms, or culturally-specific references that need replacing
5. **Formatting Audit** — Heading hierarchy, link text quality, alt text completeness, list consistency
6. **Key Changes** — The 3-5 most impactful edits to apply (with before/after examples)

---

## Related Skills

| Skill | Purpose |
|---|---|
| `technical-documentation` | Writing READMEs, API references, getting-started guides, and architectural documentation |
| `humanizer` | Converting AI-generated or formal text into natural, conversational language |

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Google Developer Documentation Style Guide](https://developers.google.com/style)
- [Microsoft Writing Style Guide](https://learn.microsoft.com/en-us/style-guide/welcome/)
- [Write the Docs Documentation Guide](https://www.writethedocs.org/guide/)
- [Mailchimp Content Style Guide](https://styleguide.mailchimp.com/)
- [Apple Style Guide](https://help.apple.com/applestyleguide/)
- [WebAIM: Writing for Accessibility](https://webaim.org/techniques/writing/)
- [Plain Language.gov: Federal Plain Language Guidelines](https://www.plainlanguage.gov/guidelines/)
- [Vercel Documentation](https://vercel.com/docs)
