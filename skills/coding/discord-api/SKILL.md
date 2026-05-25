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

---

## When to Use

Use this skill when:

- Building Discord bots with slash commands, context menus, and modal interactions
- Automating server management (moderation, role assignment, channel cleanup, welcome messages)
- Integrating Discord webhooks for cross-platform notifications (CI/CD, alerts, logging)
- Implementing Gateway event listeners (message logging, member join/leave, voice state tracking)
- Creating voice channel interactions or music bot integrations
- Building custom application commands (global or guild-scoped) with `discord.py` 2.x

---

## When NOT to Use

Avoid this skill for:

- Team chat and workplace messaging (use `coding-slack-api` instead)
- SMS or email delivery (use `coding-twilio-api` or `coding-sendgrid-api` instead)
- Self-botting or automating user accounts — this violates Discords Terms of Service
- Using the deprecated `discord.py` v1.x API — v2.7+ uses `app_commands` for slash commands

---

## Core Workflow

1. **Configure Intents and Initialize Bot** — Create `Intents.default()` and add required intents (`message_content`, `members`, `presences`). Enable them in the Discord Developer Portal under Bot > Privileged Gateway Intents. Instantiate `commands.Bot(command_prefix="!", intents=intents)`. **Checkpoint:** Verify the bot comes online by monitoring the `on_ready()` event — log the bot user tag and guild count.

2. **Define Slash Commands** — Use `@app_commands.command()` within a `Cog` class or directly on `bot.tree`. Provide descriptions for every command and parameter. Use `@app_commands.describe()` for user-facing parameter hints. **Checkpoint:** Run `bot.tree.sync()` once at startup (or during `setup_hook`) to register commands with Discord. Verify commands appear in the Discord client.

3. **Handle Command Logic with Error Handling** — Implement each command handler with typed parameters. Wrap all API calls in try/except blocks catching `discord.Forbidden` (missing permissions), `discord.HTTPException` (API error), and `discord.NotFound` (resource missing). Send user-friendly error messages via `ephemeral=True` followups. **Checkpoint:** Test each command with both valid and invalid inputs to verify error handling paths.

4. **Use Embeds for Rich Responses** — Construct `discord.Embed` with `title`, `description`, `color`, `fields`, and optionally `set_thumbnail()` or `set_image()`. Set the `color` parameter to distinguish message types (success=green, error=red, info=blue). **Checkpoint:** Verify embeds render correctly on both desktop and mobile Discord clients.

5. **Deploy and Run** — For local development, run `bot.run(os.environ["DISCORD_TOKEN"])` directly. For production, use a process manager (systemd, supervisord, or Docker). Never hardcode your token. **Checkpoint:** Confirm the bot maintains the Gateway connection by monitoring `on_resumed()` events — excessive reconnects indicate network or rate-limit issues.

---

## Implementation Patterns

### Pattern 1: Slash Commands with Cog Structure

```python
import discord
from discord import app_commands
from discord.ext import commands

# ❌ BAD — no intents, no cog, global commands without sync, no error handling
bot = commands.Bot(command_prefix="!")
@bot.command()
async def ping(ctx):
    await ctx.send("Pong!")

# ✅ GOOD — proper intents, cog organization, app commands, error handling, embed responses
import logging
from typing import Optional

logger = logging.getLogger(__name__)

intents = discord.Intents.default()
intents.message_content = True  # Required to read message content (enable in developer portal)

bot = commands.Bot(command_prefix="!", intents=intents)


class ModerationCog(commands.Cog, name="Moderation"):
    """Slash commands for server moderation."""

    def __init__(self, bot: commands.Bot) -> None:
        self.bot = bot

    @app_commands.command(name="kick", description="Kick a member from the server")
    @app_commands.describe(member="The member to kick", reason="Reason for the kick")
    @app_commands.default_permissions(kick_members=True)
    async def kick_member(
        self,
        interaction: discord.Interaction,
        member: discord.Member,
        reason: Optional[str] = None,
    ) -> None:
        """Kick a member with audit log reason."""
        if not interaction.guild:
            await interaction.response.send_message("This command can only be used in a server.", ephemeral=True)
            return

        if member.top_role >= interaction.user.top_role and interaction.user != interaction.guild.owner:
            await interaction.response.send_message("You cannot kick someone with an equal or higher role.", ephemeral=True)
            return

        reason_text = reason or "No reason provided"
        try:
            await member.kick(reason=reason_text)
            embed = discord.Embed(
                title="Member Kicked",
                description=f"{member.mention} ({member.id}) has been kicked.",
                color=discord.Color.orange(),
            )
            embed.add_field(name="Reason", value=reason_text, inline=False)
            embed.add_field(name="Moderator", value=interaction.user.mention, inline=True)
            embed.set_footer(text=f"User ID: {member.id}")

            await interaction.response.send_message(embed=embed)
            logger.info("Member kicked", extra={"guild": interaction.guild.id, "member": member.id, "reason": reason_text})
        except discord.Forbidden:
            await interaction.response.send_message("I do not have permission to kick that member.", ephemeral=True)
        except discord.HTTPException as exc:
            await interaction.response.send_message(f"Failed to kick member: {exc.status}", ephemeral=True)


@bot.event
async def on_ready() -> None:
    logger.info(f"Logged in as {bot.user} (ID: {bot.user.id})")
    logger.info(f"Connected to {len(bot.guilds)} guilds")


async def setup_hook() -> None:
    """Register cogs and sync commands."""
    await bot.add_cog(ModerationCog(bot))
    await bot.tree.sync()
    logger.info("Slash commands synced")


bot.setup_hook = setup_hook
bot.run(os.environ["DISCORD_TOKEN"])
```

### Pattern 2: Discord Webhook Integration

```python
import os
import requests
from discord import Webhook, SyncWebhook, Embed, Colour

# ❌ BAD — raw HTTP, no embed, no error handling, synchronous blocking
requests.post(
    "https://discord.com/api/webhooks/xxx/yyy",
    json={"content": "Build failed!"},
)

# ✅ GOOD — typed webhook, embed with fields, async (or sync) usage, error handling
import logging

logger = logging.getLogger(__name__)


def send_build_webhook(
    webhook_url: str,
    service: str,
    version: str,
    status: str,
    log_url: str | None = None,
) -> bool:
    """Send a build notification via Discord webhook with an embed."""
    color = Colour.green() if status == "success" else Colour.red()
    embed = Embed(
        title=f"Build: {service} v{version}",
        description=f"Build **{status.upper()}** for `{service}`",
        color=color,
        timestamp=__import__("datetime").datetime.now(),
    )
    embed.add_field(name="Service", value=service, inline=True)
    embed.add_field(name="Version", value=version, inline=True)
    embed.add_field(name="Status", value=status, inline=True)
    if log_url:
        embed.add_field(name="Build Log", value=f"[View Log]({log_url})", inline=False)

    try:
        webhook = SyncWebhook.from_url(webhook_url)
        webhook.send(embed=embed, username="CI Bot", avatar_url=None)
        return True
    except Exception as exc:
        logger.error("Webhook send failed", extra={"error": str(exc)})
        return False


# Async version for use inside bot cogs
async def send_webhook_async(webhook_url: str, content: str) -> None:
    """Send an async webhook message."""
    from discord import AsyncWebhook
    async with AsyncWebhook.from_url(webhook_url, session=None) as webhook:
        await webhook.send(content)
```

### Pattern 3: Modal Interaction (User Input Form)

```python
import discord
from discord import app_commands
from discord.ext import commands

# ❌ BAD — uses old prefix-command era pattern, no modal, no validation
@bot.command()
async def feedback(ctx, *, text):
    await ctx.send(f"Thanks for your feedback: {text[:50]}...")

# ✅ GOOD — modal with validated inputs, styled embed response
class FeedbackModal(discord.ui.Modal, title="Submit Feedback"):
    """A modal dialog for collecting user feedback."""

    def __init__(self) -> None:
        super().__init__()
        self.add_item(discord.ui.TextInput(
            label="Subject",
            placeholder="Brief summary of your feedback",
            max_length=100,
            required=True,
        ))
        self.add_item(discord.ui.TextInput(
            label="Details",
            style=discord.TextStyle.paragraph,
            placeholder="Describe your feedback in detail...",
            max_length=1000,
            required=True,
        ))
        self.add_item(discord.ui.TextInput(
            label="Rating (1-5)",
            placeholder="5",
            max_length=1,
            required=False,
        ))

    async def on_submit(self, interaction: discord.Interaction) -> None:
        subject = self.children[0].value  # type: ignore
        details = self.children[1].value  # type: ignore

        embed = Embed(
            title="Feedback Received",
            description=f"**{subject}**",
            color=Colour.blue(),
        )
        embed.add_field(name="Details", value=details, inline=False)
        embed.set_footer(text=f"Submitted by {interaction.user}")

        await interaction.response.send_message(embed=embed, ephemeral=True)

    async def on_error(self, interaction: discord.Interaction, error: Exception) -> None:
        await interaction.response.send_message("An error occurred processing your feedback.", ephemeral=True)
        logger.error("Feedback modal error", extra={"error": str(error)})


@app_commands.command(name="feedback", description="Submit feedback via a modal form")
async def feedback_command(interaction: discord.Interaction) -> None:
    """Open the feedback modal."""
    await interaction.response.send_modal(FeedbackModal())
```

---

## Constraints

### MUST DO
- Enable all required Privileged Gateway Intents in the Discord Developer Portal (Bot > Privileged Gateway Intents) — `message_content`, `server_members`, `presences` — before they work in code
- Pass the correct `Intents` to `commands.Bot` — match them exactly to what you enabled in the portal or Discord will silently ignore events
- Store `DISCORD_TOKEN` as an environment variable — never hardcode it or commit it to version control
- Organize commands into `Cog` classes grouped by domain (moderation, utility, fun, admin) — one file per cog for maintainability
- Sync slash commands with `bot.tree.sync()` after adding or modifying commands — changes are not automatic
- Handle `discord.Forbidden` (permissions), `discord.HTTPException` (API), and `discord.NotFound` (missing resource) in every command
- Use `discord.Embed` for rich message formatting with `title`, `description`, `color`, and `fields`

### MUST NOT DO
- Use user account tokens for bot automation — self-botting violates Discords Terms of Service and can result in account termination
- Hardcode a Guild ID for commands during development without providing a way to register global commands for production
- Ignore the 3-second interaction response window — defer with `ephemeral=True` if processing takes longer
- Send plain Markdown strings when `Embed` objects would provide better structure and visual hierarchy
- Poll Discord REST endpoints for events — always use the Gateway WebSocket connection for real-time data

---

## Output Template

When implementing Discord API code, the output must follow this structure:

1. **Bot Initialization** — `commands.Bot` with explicit `Intents` matching the Developer Portal configuration
2. **Cog Organization** — `Cog` classes grouping related slash commands; register with `bot.add_cog()`
3. **Slash Command** — `@app_commands.command()` with `description`, `@app_commands.describe()`, and typed parameters
4. **Error Handling** — Catches `discord.Forbidden`, `discord.HTTPException`, `discord.NotFound`; sends ephemeral error messages
5. **Embed Response** — `discord.Embed` with `title`, `description`, `color`, and `fields`; never plain text only
6. **Command Sync** — `bot.tree.sync()` called in `setup_hook` or after command registration

---

## Related Skills

| Skill | Purpose |
|---|---|
| `coding-slack-api` | Workplace messaging and bot development — similar command/event model for Slack |
| `coding-twilio-api` | SMS and phone verification — complement to Discord for multi-channel notification routing |

---

## Live References

- [discord.py Documentation (v2.x)](https://discordpy.readthedocs.io/en/stable/)
- [Discord Developer Portal — Application Setup](https://discord.com/developers/applications)
- [Discord Slash Commands (Application Commands)](https://discord.com/developers/docs/interactions/application-commands)
- [Discord Gateway Intents](https://discord.com/developers/docs/topics/gateway#gateway-intents)
- [Discord Rate Limits](https://discord.com/developers/docs/topics/rate-limits)
- [Discord Webhooks](https://discord.com/developers/docs/resources/webhook)
- [discord.py API Reference](https://discordpy.readthedocs.io/en/stable/api.html)
- [PyPI: discord.py package](https://pypi.org/project/discord.py/)
- [GitHub: Rapptz/discord.py](https://github.com/Rapptz/discord.py)
- [Discord Embed Guidelines](https://discord.com/developers/docs/resources/message#embed-object)
