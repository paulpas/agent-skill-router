"use strict";
// MCP Tool: Log File Fetching
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogFetchTool = void 0;
const types_js_1 = require("../types.js");
const fs_1 = require("fs");
/**
 * Log Fetch Tool for reading log files
 */
class LogFetchTool extends types_js_1.BaseMCPTool {
    constructor(timeoutMs = 30000) {
        super('fetch_log_file', 'Read and tail log files with filtering and search capabilities', timeoutMs);
    }
    /**
      * Execute log fetching
      */
    async execute(args) {
        const startTime = Date.now();
        try {
            this.validateArgs(args, ['filepath']);
            const filepath = String(args.filepath);
            const tailLines = Number(args.tailLines) || 100;
            const grepPattern = String(args.grepPattern || '');
            const logs = await this.fetchLogs(filepath, tailLines, grepPattern);
            return {
                success: true,
                output: logs,
                latencyMs: Date.now() - startTime,
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error),
                latencyMs: Date.now() - startTime,
            };
        }
    }
    /**
     * Fetch log file content
     */
    async fetchLogs(filepath, tailLines, grepPattern) {
        const content = await fs_1.promises.readFile(filepath, 'utf-8');
        const lines = content.split('\n');
        let filteredLines = lines;
        if (grepPattern) {
            const regex = new RegExp(grepPattern);
            filteredLines = lines.filter((line) => regex.test(line));
        }
        const totalLines = filteredLines.length;
        const displayLines = filteredLines.slice(-tailLines);
        return {
            lines: displayLines,
            totalLines,
        };
    }
    /**
     * Get tool specification
     */
    getSpecification() {
        return {
            name: this.name,
            description: this.description,
            parameters: {
                type: 'object',
                properties: {
                    filepath: {
                        type: 'string',
                        description: 'The path to the log file',
                    },
                    follow: {
                        type: 'boolean',
                        description: 'Whether to follow the log file (tail -f)',
                        default: false,
                    },
                    tailLines: {
                        type: 'number',
                        description: 'Number of lines to show from the end',
                        default: 100,
                    },
                    grepPattern: {
                        type: 'string',
                        description: 'Optional regex pattern to filter lines',
                    },
                },
                required: ['filepath'],
            },
        };
    }
}
exports.LogFetchTool = LogFetchTool;
//# sourceMappingURL=LogFetchTool.js.map