"use strict";
// MCP Tool: Shell Command Execution
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShellCommandTool = void 0;
const types_js_1 = require("../types.js");
const child_process_1 = require("child_process");
const util_1 = require("util");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
/**
 * Shell Command Tool for executing shell commands
 */
class ShellCommandTool extends types_js_1.BaseMCPTool {
    constructor(timeoutMs = 30000) {
        super('run_shell_command', 'Execute shell commands in a bash environment. Supports commands like ls, cd, cat, grep, find, npm, git, etc.', timeoutMs);
    }
    /**
     * Execute a shell command
     */
    async execute(args) {
        const startTime = Date.now();
        try {
            this.validateArgs(args, ['command']);
            const command = String(args.command);
            const result = await this.executeCommand(command);
            return {
                success: true,
                output: result,
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
     * Execute a shell command with security validation
     */
    async executeCommand(command) {
        // Security check for dangerous commands
        const dangerousPatterns = [
            /rm\s+-rf\s+/,
            /mkfs\s+/,
            /dd\s+/,
            /chmod\s+777\s+/,
            /useradd\s+/,
            /userdel\s+/,
            /passwd\s+/,
        ];
        for (const pattern of dangerousPatterns) {
            if (pattern.test(command)) {
                throw new Error('Dangerous command detected and blocked');
            }
        }
        const { stdout, stderr } = await execAsync(command, {
            timeout: this.timeoutMs,
            maxBuffer: 1024 * 1024 * 10, // 10MB
        });
        if (stderr && !stderr.includes('warn') && !stderr.includes('Warning')) {
            throw new Error(stderr);
        }
        return stdout || stderr || 'Command executed successfully';
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
                    command: {
                        type: 'string',
                        description: 'The shell command to execute',
                    },
                },
                required: ['command'],
            },
        };
    }
}
exports.ShellCommandTool = ShellCommandTool;
//# sourceMappingURL=ShellCommandTool.js.map