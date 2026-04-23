"use strict";
// MCP Bridge - central abstraction for all MCP tools
Object.defineProperty(exports, "__esModule", { value: true });
exports.MCPBridge = void 0;
const ShellCommandTool_js_1 = require("./tools/ShellCommandTool.js");
const FileTool_js_1 = require("./tools/FileTool.js");
const HTTPTool_js_1 = require("./tools/HTTPTool.js");
const KubectlTool_js_1 = require("./tools/KubectlTool.js");
const LogFetchTool_js_1 = require("./tools/LogFetchTool.js");
const Logger_js_1 = require("../observability/Logger.js");
/**
 * MCP Bridge - manages all MCP tools
 */
class MCPBridge {
    tools = new Map();
    config;
    logger;
    constructor(config = {}) {
        this.logger = new Logger_js_1.Logger('MCPBridge', {
            level: 'info',
            includePayloads: false,
        });
        this.config = {
            enabledTools: [],
            disableTools: [],
            defaultTimeoutMs: 30000,
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
            : ['shell', 'file', 'http', 'kubectl', 'log_fetch'];
        const disabledTools = new Set(this.config.disableTools || []);
        const toolFactories = {
            shell: () => new ShellCommandTool_js_1.ShellCommandTool(this.config.defaultTimeoutMs),
            file: () => new FileTool_js_1.FileTool(this.config.defaultTimeoutMs),
            http: () => new HTTPTool_js_1.HTTPTool(this.config.defaultTimeoutMs),
            kubectl: () => new KubectlTool_js_1.KubectlTool(this.config.defaultTimeoutMs),
            log_fetch: () => new LogFetchTool_js_1.LogFetchTool(this.config.defaultTimeoutMs),
        };
        for (const [name, factory] of Object.entries(toolFactories)) {
            if (disabledTools.has(name)) {
                continue;
            }
            if (enabledTools.includes(name)) {
                try {
                    const tool = factory();
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