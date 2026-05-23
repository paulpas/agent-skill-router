---
name: discord-api
description: Integrates Discord API (Gateway, REST, Slash Commands, Webhooks, Voice)
  using discord.py v2.7+ with proper intent configuration, cog structuring, slash
  command patterns, and rate-limit handling.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: discord, discord bot, discord.py, slash commands, discord api, discord
    webhook, discord gateway, how do i make a discord bot
  archetypes:
  - tactical
  - generation
  anti_triggers:
  - brainstorming
  - vague ideation
  - code golf
  - over-engineering
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  role: implementation
  scope: implementation
  output-format: code
  content-types:
  - code
  - guidance
  - do-dont
  - examples
  related-skills: coding-slack-api, coding-twilio-api
------

# Discord API Integration (Bot, Slash Commands, Gateway, Webhooks)

Integrates the Discord API — Gateway, REST, Slash Commands, Webhooks, and Voice — using `discord.py` v2.7+. When loaded, this skill makes the model implement Discord bots and integrations with proper intent configuration, cog-organized command structure, application command registration, modal interactions, and Gateway event handling.

## TL;DR for Code Generation

- [ ] Enable required Privileged Gateway Intents in the Discord Developer Portal before writing any bot code
- [ ] Define `Intents.default()` + specific extra intents (e.g., `message_content`) and pass them to `commands.Bot`
- [ ] Organize commands into `Cog` classes — one file per cog, loaded with `await bot.add_cog()`
- [ ] Use `@app_commands.command()` for slash commands and `@app_commands.describe()` for parameter hints
- [ ] Sync slash commands with `await bot.tree.sync()` after registration
- [ ] Handle `discord.Forbidden`, `discord.HTTPException`, and `discord.NotFound` errors in every command
- [ ] Use `discord.Embed` for rich message formatting — never send plain text embeds without structure

