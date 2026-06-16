#!/usr/bin/env node
'use strict';

// skill-router-mcp.js
// Portable stdio MCP bridge between OpenCode and the skill-router HTTP API.
// Works identically on Linux and macOS: no hardcoded host paths.
//
// Configuration (all optional, all overridable via env vars):
//   SKILL_ROUTER_URL       HTTP base URL of the router           (default: http://localhost:3000)
//   SKILL_ROUTER_SKILLS_DIR  Filesystem path to the skills/ tree (default: auto-detected)
//   SKILL_ROUTER_LOG_FILE  Path to the bridge's own log file     (default: ~/.config/opencode/skill-router-mcp.log)
//   SKILL_ROUTER_API_DOC_URL  raw.githubusercontent.com URL of   (default: paulpas/skills skill-router-api.md)
//                          skill-router-api.md to keep in sync
//   SKILL_ROUTER_SYNC_API_DOC  Set to "0" to disable hourly sync (default: enabled)

const http = require('http');
const https = require('https');
const path = require('path');
const fs = require('fs');
const os = require('os');
const readline = require('readline');

// ── Configuration resolution ────────────────────────────────────────────────

const HOME = os.homedir();
const CONFIG_DIR = path.join(HOME, '.config', 'opencode');

const ROUTER_BASE_URL = process.env.SKILL_ROUTER_URL || 'http://localhost:3000';
const LOG_FILE = process.env.SKILL_ROUTER_LOG_FILE || path.join(CONFIG_DIR, 'skill-router-mcp.log');
const API_DOC_URL = process.env.SKILL_ROUTER_API_DOC_URL
  || 'https://raw.githubusercontent.com/paulpas/skills/main/agent-skill-routing-system/skill-router-api.md';
const SYNC_API_DOC = process.env.SKILL_ROUTER_SYNC_API_DOC !== '0';

// Resolve SKILLS_BASE_DIR (only used as disk fallback when router can't serve /skill/:name).
// Precedence:
//   1. SKILL_ROUTER_SKILLS_DIR env var
//   2. Well-known candidate paths that exist on disk
//   3. null (disk fallback disabled; router-only mode)
function resolveSkillsDir() {
  const fromEnv = process.env.SKILL_ROUTER_SKILLS_DIR;
  if (fromEnv) return fromEnv;

  const candidates = [
    path.join(HOME, 'git', 'agent-skill-router', 'skills'),
    path.join(HOME, 'git', 'skills', 'skills'),
    path.join(HOME, 'git', 'skills'),
    path.join(HOME, '.config', 'opencode', 'skills'),
  ];
  for (const c of candidates) {
    try {
      if (fs.statSync(c).isDirectory()) return c;
    } catch { /* not present */ }
  }
  return null;
}

const SKILLS_BASE_DIR = resolveSkillsDir();

// ── Logger ──────────────────────────────────────────────────────────────────

// Ensure log directory exists before opening the stream.
try { fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true }); } catch { /* best-effort */ }

const logStream = fs.createWriteStream(LOG_FILE, { flags: 'a' });
logStream.on('error', (err) => {
  process.stderr.write(`[MCP-BRIDGE] Log stream error: ${err.message}\n`);
});

function log(level, msg, data) {
  const ts = new Date().toISOString();
  const dataStr = data ? '  ' + JSON.stringify(data) : '';
  const line = `[${ts}] [${level}] ${msg}${dataStr}\n`;
  process.stderr.write(line);
  logStream.write(line);
}

// ── Process lifecycle hooks ─────────────────────────────────────────────────

process.on('SIGTERM', () => {
  log('INFO', 'shutting down');
  process.exit(0);
});

process.on('uncaughtException', (err) => {
  log('ERROR', 'uncaught exception', { error: err.message, stack: err.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  log('ERROR', 'unhandled rejection', { error: reason?.message || String(reason) });
  // Don't exit — log and continue so the bridge stays alive
});

// ── HTTP helpers (router-targeted) ──────────────────────────────────────────

const ROUTER_URL = new URL(ROUTER_BASE_URL);

function routerRequest(options, body) {
  const method = options.method || 'GET';
  const reqPath = options.path || '/';
  const t0 = Date.now();

  log('DEBUG', `→ ${method} ${reqPath}`);

  const fullOptions = {
    hostname: ROUTER_URL.hostname,
    port: ROUTER_URL.port || (ROUTER_URL.protocol === 'https:' ? 443 : 80),
    ...options,
  };

  const mod = ROUTER_URL.protocol === 'https:' ? https : http;

  const REQUEST_TIMEOUT_MS = 15000;
  return new Promise((resolve, reject) => {
    const req = mod.request(fullOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        log('DEBUG', `← ${method} ${reqPath}`, { status: res.statusCode, durationMs: Date.now() - t0 });
        try {
          resolve({ statusCode: res.statusCode, body: JSON.parse(data) });
        } catch (_) {
          resolve({ statusCode: res.statusCode, body: data });
        }
      });
    });
    req.setTimeout(REQUEST_TIMEOUT_MS, () => {
      req.destroy(new Error(`Router request timed out after ${REQUEST_TIMEOUT_MS}ms`));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function httpGetText(url) {
  const GET_TIMEOUT_MS = 15000;
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const mod = u.protocol === 'https:' ? https : http;
    const options = {
      hostname: u.hostname,
      port: u.port || (u.protocol === 'https:' ? 443 : 80),
      path: u.pathname + u.search,
      method: 'GET',
    };
    const req = mod.request(options, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return httpGetText(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode < 200 || res.statusCode >= 300) {
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.setTimeout(GET_TIMEOUT_MS, () => {
      req.destroy(new Error(`GET request timed out after ${GET_TIMEOUT_MS}ms: ${url}`));
    });
    req.end();
  });
}

function routerGet(pathname) {
  return routerRequest({ path: pathname, method: 'GET' });
}

function routerPostJson(pathname, payload) {
  const body = JSON.stringify(payload);
  return routerRequest(
    {
      path: pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    },
    body
  );
}

function routerSkillUrl(name) {
  // Build a URL relative to ROUTER_BASE_URL (covers custom port / host setups).
  return new URL(`/skill/${encodeURIComponent(name)}`, ROUTER_BASE_URL).toString();
}

// ── Domain extraction ───────────────────────────────────────────────────────

/**
 * Extract domain from SKILL.md content by parsing YAML frontmatter.
 * Returns domain name like 'go', 'coding', 'trading', etc.
 */
function extractDomainFromContent(content) {
  if (!content) return null;
  
  // Extract YAML frontmatter (between --- delimiters)
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  
  const frontmatter = match[1];
  
  // Look for: metadata.domain: value (YAML format)
  const domainMatch = frontmatter.match(/metadata:\s*\n(?:[\s\S]*?\n)*\s+domain:\s*([^\n]+)/);
  if (domainMatch) {
    return domainMatch[1].trim().replace(/^['"]|['"]$/g, ''); // Remove quotes if present
  }
  
  return null;
}

/**
 * Format domain context for display (converts snake-case/kebab-case to title case).
 * Examples: 'go' -> '[Go]', 'trading' -> '[Trading]', 'cloud-native' -> '[Cloud Native]'
 */
function formatDomainLabel(domain) {
  if (!domain) return '';
  return '[' + domain
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ') + ']';
}

// ── skill-router-api.md sync ────────────────────────────────────────────────

async function syncApiDoc() {
  if (!SYNC_API_DOC) {
    log('DEBUG', 'skill-router-api.md sync disabled via env');
    return;
  }
  const localPath = path.join(path.dirname(__filename), 'skill-router-api.md');
  try {
    const remote = await httpGetText(API_DOC_URL);
    let current = '';
    try { current = fs.readFileSync(localPath, 'utf8'); } catch { /* first run */ }
    if (remote !== current) {
      fs.writeFileSync(localPath, remote, 'utf8');
      log('INFO', 'skill-router-api.md synced from remote', { url: API_DOC_URL });
    } else {
      log('DEBUG', 'skill-router-api.md up to date');
    }
  } catch (err) {
    log('WARN', 'skill-router-api.md sync failed', { error: err.message });
  }
}

// ── Tool handlers ───────────────────────────────────────────────────────────

function unreachableResponse() {
  log('WARN', 'router unreachable', { url: ROUTER_BASE_URL });
  return {
    content: [
      {
        type: 'text',
        text: `Skill router is not running at ${ROUTER_BASE_URL}. Start it with: docker start skill-router`,
      },
    ],
  };
}

async function handleRouteToSkill(args) {
  const task = args && args.task;
  if (!task) {
    return { content: [{ type: 'text', text: 'Error: "task" argument is required.' }] };
  }

  let response;
  try {
    response = await routerPostJson('/route', { task, context: {} });
  } catch (err) {
    if (err.code === 'ECONNREFUSED') return unreachableResponse();
    return { content: [{ type: 'text', text: `Skill router error: ${err.message}` }] };
  }

  const selectedSkills = response.body && response.body.selectedSkills;
  const attributionFooter = response.body && response.body.attributionFooter;

  // DEBUG: Log what we received from the router
  log('DEBUG', '[ROUTER RESPONSE] received from /route', {
    hasAttributionFooter: !!attributionFooter,
    attributionFooterLength: attributionFooter ? attributionFooter.length : 0,
    attributionFooterPreview: attributionFooter ? attributionFooter.substring(0, 100) : null,
    selectedSkillsCount: selectedSkills ? selectedSkills.length : 0,
  });

  if (!selectedSkills || selectedSkills.length === 0) {
    log('WARN', 'no skills matched', { task });
    return { content: [{ type: 'text', text: 'No matching skills found for this task.' }] };
  }

  const skillResults = await Promise.all(
    selectedSkills.map(async (skill) => {
      const name = skill.name || skill.id || String(skill);
      let content = null;
      let domain = null;
      try {
        content = await httpGetText(routerSkillUrl(name));
        domain = extractDomainFromContent(content);
        log('DEBUG', '[ON-DEMAND] served via router', { skill: name, domain });
      } catch (_) {
        if (SKILLS_BASE_DIR) {
          const filePath = path.join(SKILLS_BASE_DIR, name, 'SKILL.md');
          try {
            content = fs.readFileSync(filePath, 'utf8');
            domain = extractDomainFromContent(content);
            log('DEBUG', '[ON-DEMAND] served from disk fallback', { skill: name, path: filePath, domain });
          } catch (_2) {
            content = null;
          }
        }
      }
      return { name, content, domain, score: skill.score ?? null };
    })
  );

  const loaded = skillResults.filter((r) => r.content !== null);
  const names = loaded.map((r) => r.name);
  const domains = loaded.map((r) => r.domain || 'unknown').filter((d, i, arr) => arr.indexOf(d) === i);

  log('INFO', '[SKILL ACCESS] skills resolved', {
    loaded: names,
    domains: domains,
    total: selectedSkills.length,
    missing: skillResults.filter((r) => r.content === null).map((r) => r.name),
  });

  if (loaded.length === 0) {
    const desc = selectedSkills[0].description
      || `No SKILL.md found for: ${selectedSkills.map((s) => s.name).join(', ')}`;
    return { content: [{ type: 'text', text: desc }] };
  }

  let body = loaded
    .map((r) => {
      const domainLabel = r.domain ? ` ${formatDomainLabel(r.domain)}` : '';
      return `# ${r.name}${domainLabel}\n\n${r.content}`;
    })
    .join('\n\n---\n\n');

  // Append attribution footer if available
  if (attributionFooter) {
    body += '\n\n---\n\n' + attributionFooter;
    log('DEBUG', '[ATTRIBUTION] footer appended to response', {
      skillCount: loaded.length,
      footerLength: attributionFooter.length,
    });
  }

  // DEBUG: Capture actual response body before returning
  log('DEBUG', '[MCP RESPONSE BODY] start', {
    preview: body.substring(0, 300),
    totalLength: body.length,
  });
  log('DEBUG', '[MCP RESPONSE BODY] end', {
    preview: body.substring(Math.max(0, body.length - 300)),
  });

  const mcpResponse = { content: [{ type: 'text', text: body }] };
  log('DEBUG', '[MCP RESPONSE] complete JSON structure', {
    contentType: mcpResponse.content[0].type,
    textFieldLength: mcpResponse.content[0].text.length,
    hasAttributionFooter: body.includes('Assisted by') || body.includes('externally-sourced') || body.includes('Skills Used'),
  });

  return mcpResponse;
}

async function handleListSkills() {
  let response;
  try {
    response = await routerGet('/skills');
  } catch (err) {
    if (err.code === 'ECONNREFUSED') return unreachableResponse();
    return { content: [{ type: 'text', text: `Skill router error: ${err.message}` }] };
  }

  const skills = Array.isArray(response.body)
    ? response.body
    : (response.body && response.body.skills) || [];
  if (skills.length === 0) {
    return { content: [{ type: 'text', text: 'No skills available or unable to parse response.' }] };
  }

  const lines = skills.map(
    (s) => `- **${s.name || s.id}** (${s.category || 'uncategorized'}): ${s.description || ''}`
  );
  return { content: [{ type: 'text', text: lines.join('\n') }] };
}

// ── MCP tool registry ───────────────────────────────────────────────────────

const TOOLS = [
  {
    name: 'route_to_skill',
    description:
      'Route a task to the most relevant skill and return its full SKILL.md content. Call this at the start of every task before doing any work.',
    inputSchema: {
      type: 'object',
      properties: {
        task: { type: 'string', description: 'The task description' },
      },
      required: ['task'],
    },
  },
  {
    name: 'list_skills',
    description: 'List all available skills with their names, categories, and descriptions',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
];

// ── MCP method dispatcher ───────────────────────────────────────────────────

async function dispatchMethod(method, params, id) {
  if (method === 'initialize') {
    return {
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: 'skill-router-mcp', version: '1.1.0' },
      },
    };
  }

  if (method === 'tools/list') {
    return {
      jsonrpc: '2.0',
      id,
      result: { tools: TOOLS },
    };
  }

  if (method === 'tools/call') {
    const toolName = params && params.name;
    const toolArgs = (params && params.arguments) || {};

    log('INFO', '[TOOL CALL]', { tool: toolName, task: toolArgs.task });

    let toolResult;
    if (toolName === 'route_to_skill') {
      toolResult = await handleRouteToSkill(toolArgs);
    } else if (toolName === 'list_skills') {
      toolResult = await handleListSkills();
    } else {
      toolResult = { content: [{ type: 'text', text: `Unknown tool: ${toolName}` }] };
    }

    return { jsonrpc: '2.0', id, result: toolResult };
  }

  return {
    jsonrpc: '2.0',
    id,
    error: { code: -32601, message: 'Method not found' },
  };
}

// ── Main loop ───────────────────────────────────────────────────────────────

function sendResponse(obj) {
  process.stdout.write(JSON.stringify(obj) + '\n');
}

async function main() {
  log('INFO', 'skill-router-mcp v1.1.0 started', {
    router: ROUTER_BASE_URL,
    skillsDir: SKILLS_BASE_DIR,
    logFile: LOG_FILE,
    syncApiDoc: SYNC_API_DOC,
    platform: process.platform,
    nodeVersion: process.version,
  });

  if (SYNC_API_DOC) {
    syncApiDoc(); // non-blocking
    setInterval(() => syncApiDoc(), 3600 * 1000);
  }

  const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });

  rl.on('line', async (line) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    let request;
    try {
      request = JSON.parse(trimmed);
    } catch (_) {
      sendResponse({
        jsonrpc: '2.0',
        id: null,
        error: { code: -32700, message: 'Parse error' },
      });
      return;
    }

    const { id, method, params } = request;

    // Notifications (no id) — no response
    if (id === undefined || id === null) return;

    log('DEBUG', 'incoming request', { method, id });

    try {
      const response = await dispatchMethod(method, params, id);
      sendResponse(response);
    } catch (err) {
      log('ERROR', 'internal error', { method, id, error: err.message, stack: err.stack });
      sendResponse({
        jsonrpc: '2.0',
        id,
        error: { code: -32603, message: `Internal error: ${err.message}` },
      });
    }
  });

  rl.on('close', () => {
    process.exit(0);
  });
}

main().catch((err) => {
  log('ERROR', 'fatal', { error: err.message, stack: err.stack });
  process.exit(1);
});
