"use strict";
// MCP Bridge - central abstraction for all MCP tools
Object.defineProperty(exports, "__esModule", { value: true });
exports.MCPBridge = void 0;
const ShellCommandTool_1 = require("./tools/ShellCommandTool");
const FileTool_1 = require("./tools/FileTool");
const HTTPTool_1 = require("./tools/HTTPTool");
const KubectlTool_1 = require("./tools/KubectlTool");
const LogFetchTool_1 = require("./tools/LogFetchTool");
const SkillGenerationTool_1 = require("./tools/SkillGenerationTool");
const Logger_1 = require("../observability/Logger");
/**
 * MCP Bridge - manages all MCP tools
 */
class MCPBridge {
    tools = new Map();
    config;
    logger;
    constructor(config = {}) {
        this.logger = new Logger_1.Logger('MCPBridge', {
            level: 'info',
            includePayloads: false,
        });
        this.config = {
            enabledTools: [],
            disableTools: [],
            defaultTimeoutMs: 30000,
            methodology: 'CODE GENERATION METHODOLOGY: Test-Driven Development (TDD)\n' +
                'Follow the RED-GREEN-REFACTOR cycle for ALL code:\n' +
                '- RED: Write a failing test before any implementation code.\n' +
                '- GREEN: Write minimal code to pass the test.\n' +
                '- REFACTOR: Clean up while keeping all tests green.\n' +
                '\n' +
                'REQUIREMENTS:\n' +
                '- Minimum 95% test coverage for all production code.\n' +
                '- Write isolated, deterministic unit tests with mocked external dependencies.\n' +
                '- Test edge cases (empty, boundary, error) before happy path.\n' +
                '- Run full test suite after every REFACTOR phase.\n' +
                '- Language-agnostic: applies to Python, TypeScript, Go, Rust, etc.\n' +
                '- Reference skill: test-driven-development (available via skill router)',
            ...(config || {}),
        };
        // Merge disableTools properly
        if (config.disableTools !== undefined) {
            this.config.disableTools = config.disableTools;
        }
        this.initializeTools();
    }
    /**
      * Initialize all configured tools
      */
    initializeTools() {
        const enabledTools = this.config.enabledTools !== undefined && this.config.enabledTools.length > 0
            ? this.config.enabledTools
            : this.getDefaultEnabledTools();
        const disabledTools = new Set(this.config.disableTools || []);
        const toolFactories = {
            shell: () => new ShellCommandTool_1.ShellCommandTool(this.config.defaultTimeoutMs),
            file: () => new FileTool_1.FileTool(this.config.defaultTimeoutMs),
            http: () => new HTTPTool_1.HTTPTool(this.config.defaultTimeoutMs),
            kubectl: () => new KubectlTool_1.KubectlTool(this.config.defaultTimeoutMs),
            log_fetch: () => new LogFetchTool_1.LogFetchTool(this.config.defaultTimeoutMs),
            generate_skill: () => new SkillGenerationTool_1.SkillGenerationTool(this.config.defaultTimeoutMs),
        };
        for (const [name, factory] of Object.entries(toolFactories)) {
            if (disabledTools.has(name)) {
                continue;
            }
            if (enabledTools.includes(name)) {
                try {
                    const tool = factory();
                    if (this.config.methodology) {
                        tool.setMethodology(this.config.methodology);
                    }
                    this.tools.set(tool.name, tool);
                }
                catch (error) {
                    this.logger.error(`Failed to initialize tool ${name}:`, {
                        error: error instanceof Error ? error.message : String(error),
                    });
                }
            }
        }
    }
    /**
     * Get default enabled tools based on environment configuration
     */
    getDefaultEnabledTools() {
        const autoSkillEnabled = process.env.AUTO_SKILL_ENABLED !== 'false';
        const baseTools = ['shell', 'file', 'http', 'kubectl', 'log_fetch'];
        if (autoSkillEnabled) {
            return [...baseTools, 'generate_skill'];
        }
        return baseTools;
    }
    /**
     * Get a tool by name
     */
    getTool(name) {
        return this.tools.get(name);
    }
    /**
     * Execute a tool by name
     */
    async executeTool(name, args) {
        const tool = this.tools.get(name);
        if (!tool) {
            return {
                success: false,
                error: `Tool not found: ${name}`,
                latencyMs: 0,
            };
        }
        return tool.execute(args);
    }
    /**
     * Get all available tools
     */
    getAllTools() {
        return Array.from(this.tools.values());
    }
    /**
     * Get tool specifications for LLM
     */
    getToolSpecs() {
        return this.getAllTools().map((tool) => tool.getSpecification());
    }
    /**
     * Check if a tool is available
     */
    hasTool(name) {
        return this.tools.has(name);
    }
    /**
     * Register a custom tool
     */
    registerTool(tool) {
        this.tools.set(tool.name, tool);
    }
    /**
     * Unregister a tool
     */
    unregisterTool(name) {
        this.tools.delete(name);
    }
    /**
     * Get bridge statistics
     */
    getStats() {
        return {
            totalTools: this.tools.size,
            enabledTools: Array.from(this.tools.keys()),
        };
    }
}
exports.MCPBridge = MCPBridge;
//# sourceMappingURL=MCPBridge.js.map